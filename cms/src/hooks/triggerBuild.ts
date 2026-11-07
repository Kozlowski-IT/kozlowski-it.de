/**
 * Payload ↔ Builder (Task 11): Vorschau, Veröffentlichen, Status, Zurück.
 *
 * Semantik der Hooks
 * - Seite als Entwurf gespeichert (auch Autosave)       → POST /preview (fire-and-forget)
 * - Seite veröffentlicht (`_status === 'published'`)    → POST /publish
 * - veröffentlichte Seite zurückgezogen oder gelöscht   → POST /publish (sie muss live verschwinden)
 * - Global site/chrome gespeichert                      → POST /publish
 * Nach jedem Publish wird zusätzlich eine Vorschau angestoßen (Globals stecken auch in der Vorschau).
 *
 * Nach dem Commit: Payload ruft afterChange/afterDelete INNERHALB der DB-Transaktion auf. Der
 * Builder exportiert aus einem eigenen Prozess (eigene Verbindung) und würde vor dem Commit den
 * alten Stand sehen. Deshalb wartet jeder Auftrag, bis die Transaktion committet ist (bzw. bricht
 * bei Rollback ab). Der Hook selbst wartet nie auf den Builder: Speichern wird weder verzögert
 * noch kann ein Builder-Fehler die Transaktion zurückrollen. Das Ergebnis des Publish steht im
 * Global `publishStatus`.
 *
 * Doppelte Auslösung: Pro Transaktion (bzw. Request) gibt es höchstens EINEN Auftrag; ein
 * zweiter Hook-Aufruf in derselben Transaktion stuft ihn nur von preview auf publish hoch.
 *
 * Konfiguration (nur serverseitig): BUILDER_URL, BUILDER_TOKEN; optional
 * BUILDER_PUBLISH_TIMEOUT_MS (Default 5 min — ein Publish kann hinter einer laufenden Vorschau
 * warten; 120 s gelten pro Job im Builder). Fehlt BUILDER_URL/TOKEN, sind die Hooks aus.
 * Das Token wird nie geloggt und nie an den Browser gegeben.
 */
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  Payload,
  PayloadRequest,
} from 'payload'

export const PUBLISH_TIMEOUT_MS = 5 * 60_000
const PREVIEW_TIMEOUT_MS = 15_000
const READ_TIMEOUT_MS = 15_000
const COMMIT_WAIT_MS = 5 * 60_000
const MAX_REASON = 4000

/** gleiche Regel wie builder/src/releases.mjs (isReleaseName) */
const RELEASE_NAME = /^(\d{4}-\d{2}-\d{2}_\d{6})(?:-(\d+))?$/
export const isReleaseName = (v: unknown): v is string => typeof v === 'string' && RELEASE_NAME.test(v)

type Kind = 'preview' | 'publish'
export type PublishStatusData = {
  state: 'running' | 'live' | 'failed'
  action?: 'publish' | 'rollback'
  at: string
  release?: string | null
  reason?: string | null
  warning?: string | null
}

// ------------------------------------------------------------------ Builder-Client

export class BuilderError extends Error {}

const configured = () => !!process.env.BUILDER_URL && !!process.env.BUILDER_TOKEN
const clip = (s: string) => (s.length > MAX_REASON ? `${s.slice(0, MAX_REASON)} …` : s)

/**
 * Ein Aufruf an den Builder. Wirft BuilderError mit deutscher Meldung bei Netzfehler,
 * Zeitüberschreitung oder fehlender Konfiguration; sonst { status, body } (body = JSON oder null).
 */
export async function callBuilder(
  path: string,
  { method = 'POST', body, timeoutMs }: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs: number },
): Promise<{ status: number; body: any }> {
  const base = process.env.BUILDER_URL
  const token = process.env.BUILDER_TOKEN
  if (!base || !token) throw new BuilderError('Builder nicht konfiguriert (BUILDER_URL/BUILDER_TOKEN fehlen)')
  let res: Response
  try {
    res = await fetch(base.replace(/\/+$/, '') + path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    })
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new BuilderError(`Builder antwortet nicht innerhalb von ${Math.round(timeoutMs / 1000)} s`)
    }
    const code = err?.cause?.code || err?.code || err?.message || 'unbekannt'
    throw new BuilderError(`Builder nicht erreichbar (${code})`)
  }
  let parsed: any = null
  try {
    parsed = await res.json()
  } catch {
    // kein JSON → body null
  }
  return { status: res.status, body: parsed }
}

/** HTTP-Fehler des Builders → deutsche Meldung */
export function httpFailure(status: number, body: any): string {
  if (status === 401) return 'Builder lehnt den Zugang ab (HTTP 401) — BUILDER_TOKEN prüfen'
  const reason = typeof body?.reason === 'string' ? `: ${body.reason}` : ''
  return clip(`Builder-Fehler HTTP ${status}${reason}`)
}

// ------------------------------------------------------------------ Status

export async function writeStatus(payload: Payload, data: Partial<PublishStatusData>) {
  try {
    await payload.updateGlobal({ slug: 'publishStatus', data: data as any, context: { skipBuild: true } })
  } catch (err: any) {
    payload.logger.error(`[builder] publishStatus nicht gespeichert: ${err?.message ?? err}`)
  }
}

/** Publish ausführen und das Ergebnis in publishStatus schreiben. Wirft nie. */
export async function publishNow(payload: Payload): Promise<PublishStatusData> {
  await writeStatus(payload, { state: 'running', action: 'publish', at: new Date().toISOString() })
  const timeoutMs = Number(process.env.BUILDER_PUBLISH_TIMEOUT_MS) || PUBLISH_TIMEOUT_MS
  let result: PublishStatusData
  try {
    const { status, body } = await callBuilder('/publish', { timeoutMs })
    if (status === 200 && body?.ok === true && isReleaseName(body.release)) {
      const warnings = Array.isArray(body.warnings) ? body.warnings.filter((w: unknown) => typeof w === 'string') : []
      result = {
        state: 'live', action: 'publish', at: new Date().toISOString(), release: body.release, reason: null,
        warning: warnings.length ? clip(warnings.join('\n')) : null,
      }
    } else if (status === 200 && body?.ok === false) {
      const phase = typeof body.phase === 'string' ? ` (Phase: ${body.phase})` : ''
      result = { state: 'failed', action: 'publish', at: new Date().toISOString(), reason: clip(`${body.reason ?? 'unbekannter Fehler'}${phase}`), warning: null }
    } else if (status === 200) {
      result = { state: 'failed', action: 'publish', at: new Date().toISOString(), reason: 'Builder-Antwort unverständlich (HTTP 200 ohne ok/release)', warning: null }
    } else {
      result = { state: 'failed', action: 'publish', at: new Date().toISOString(), reason: httpFailure(status, body), warning: null }
    }
  } catch (err: any) {
    result = {
      state: 'failed', action: 'publish', at: new Date().toISOString(),
      reason: err instanceof BuilderError ? err.message : `Veröffentlichen fehlgeschlagen: ${err?.message ?? err}`,
      warning: null,
    }
  }
  if (result.state === 'live') payload.logger.info(`[builder] veröffentlicht: ${result.release}${result.warning ? ` (Warnung: ${result.warning.split('\n')[0]})` : ''}`)
  else payload.logger.error(`[builder] Veröffentlichen fehlgeschlagen: ${result.reason?.split('\n')[0]}`)
  // `release` beim Fehlschlag nicht anfassen: dort steht weiter der Stand, der live ist
  const { release, ...rest } = result
  await writeStatus(payload, result.state === 'live' ? result : rest)
  return result
}

/** Vorschau anstoßen; Fehler nur ins Log. */
export async function previewNow(payload: Payload): Promise<void> {
  try {
    const { status, body } = await callBuilder('/preview', { timeoutMs: PREVIEW_TIMEOUT_MS })
    if (status !== 202 && status !== 200) payload.logger.warn(`[builder] Vorschau: ${httpFailure(status, body)}`)
  } catch (err: any) {
    payload.logger.warn(`[builder] Vorschau: ${err?.message ?? err}`)
  }
}

/** GET /releases für die Release-Liste. */
export async function listReleases(): Promise<{ status: number; body: unknown }> {
  try {
    const { status, body } = await callBuilder('/releases', { method: 'GET', timeoutMs: READ_TIMEOUT_MS })
    if (status === 200 && body && Array.isArray(body.releases)) {
      return {
        status: 200,
        body: { current: isReleaseName(body.current) ? body.current : null, releases: body.releases.filter(isReleaseName) },
      }
    }
    return { status: 502, body: { ok: false, reason: httpFailure(status, body) } }
  } catch (err: any) {
    return { status: 502, body: { ok: false, reason: err?.message ?? String(err) } }
  }
}

/** POST /rollback; bei Erfolg publishStatus = live (action rollback). Name muss vorher geprüft sein. */
export async function rollbackTo(payload: Payload, release: string): Promise<{ status: number; body: unknown }> {
  let out: { status: number; body: unknown }
  try {
    const { status, body } = await callBuilder('/rollback', { body: { release }, timeoutMs: PUBLISH_TIMEOUT_MS })
    if (status === 200 && body?.ok === true) {
      await writeStatus(payload, {
        state: 'live', action: 'rollback', at: new Date().toISOString(), release, reason: null, warning: null,
      })
      payload.logger.info(`[builder] zurückgeschaltet auf ${release}`)
      return { status: 200, body: { ok: true, release } }
    }
    if (status === 404 || status === 400) out = { status, body: { ok: false, reason: clip(String(body?.reason ?? `HTTP ${status}`)) } }
    else if (status === 200) out = { status: 502, body: { ok: false, reason: clip(`Zurückschalten fehlgeschlagen: ${body?.reason ?? 'unbekannt'}`) } }
    else out = { status: 502, body: { ok: false, reason: httpFailure(status, body) } }
  } catch (err: any) {
    out = { status: 502, body: { ok: false, reason: err?.message ?? String(err) } }
  }
  payload.logger.error(`[builder] Zurückschalten auf ${release} fehlgeschlagen: ${(out.body as any).reason}`)
  return out
}

// ------------------------------------------------------------------ nach dem Commit

const pending = new Set<Promise<unknown>>()

/** Wartet, bis alle angestoßenen Builder-Aufträge fertig sind (Tests, geordnetes Herunterfahren). */
export async function buildsSettled(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending])
}

function track(p: Promise<unknown>) {
  pending.add(p)
  void p.finally(() => pending.delete(p))
}

type Session = { resolve: () => Promise<unknown>; reject: () => Promise<unknown> }
const commitWatch = new WeakMap<object, Promise<boolean>>()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * true, sobald die Transaktion des Requests committet ist (ohne Transaktion: sofort);
 * false bei Rollback. Hängt sich an die Session des Postgres-Adapters (@payloadcms/drizzle,
 * exakt gepinnt): commitTransaction ruft `session.resolve()` und wartet auf das COMMIT.
 */
async function committed(req: PayloadRequest): Promise<boolean> {
  let id: unknown = req.transactionID
  if (id instanceof Promise) id = await id
  if (!id) return true
  const sessions = (req.payload.db as any).sessions as Record<string, Session> | undefined
  const session = sessions?.[id as string]
  if (!session) return true // schon beendet
  let watch = commitWatch.get(session)
  if (!watch) {
    if (typeof session.resolve === 'function' && typeof session.reject === 'function') {
      watch = new Promise<boolean>((settle) => {
        const { resolve, reject } = session
        session.resolve = async () => {
          try {
            const r = await resolve()
            settle(true)
            return r
          } catch (err) {
            settle(false)
            throw err
          }
        }
        session.reject = async () => {
          try {
            return await reject()
          } finally {
            settle(false)
          }
        }
      })
    } else {
      // Fallback (Adapter-Interna anders): warten, bis die Session weg ist, plus Puffer
      watch = (async () => {
        const end = Date.now() + COMMIT_WAIT_MS
        while (sessions?.[id as string] && Date.now() < end) await sleep(25)
        await sleep(200)
        return !sessions?.[id as string]
      })()
    }
    commitWatch.set(session, watch)
  }
  // Notbremse: nie ewig warten (Timer wird aufgeräumt, hält den Prozess nicht offen)
  let timer: NodeJS.Timeout | undefined
  const limit = new Promise<boolean>((r) => {
    timer = setTimeout(() => r(false), COMMIT_WAIT_MS)
    timer.unref?.()
  })
  try {
    return await Promise.race([watch, limit])
  } finally {
    clearTimeout(timer)
  }
}

const planned = new WeakMap<object, { kind: Kind }>()

/** Auftrag für diesen Request/diese Transaktion einplanen (höchstens einer; publish gewinnt). */
export function schedule(req: PayloadRequest, kind: Kind): void {
  if (!configured()) {
    req.payload.logger.debug?.('[builder] BUILDER_URL/BUILDER_TOKEN fehlen — kein Build')
    return
  }
  const plan = planned.get(req)
  if (plan) {
    if (kind === 'publish') plan.kind = 'publish'
    return
  }
  const p = { kind }
  planned.set(req, p)
  const payload = req.payload
  track(
    (async () => {
      if (!(await committed(req))) {
        payload.logger.warn('[builder] Transaktion nicht übernommen — kein Build')
        return
      }
      if (p.kind === 'publish') {
        await publishNow(payload)
        await previewNow(payload)
      } else {
        await previewNow(payload)
      }
    })().catch((err) => payload.logger.error(`[builder] Auftrag fehlgeschlagen: ${err?.message ?? err}`)),
  )
}

// ------------------------------------------------------------------ Hooks

/** Hauptzeile (= veröffentlichter Stand) innerhalb der laufenden Transaktion lesen. */
async function mainStatus(req: PayloadRequest, id: number | string): Promise<string | undefined> {
  const row: any = await req.payload.db.findOne({ collection: 'pages', where: { id: { equals: id } }, req })
  return row?._status
}

export const pagesBeforeChange = async ({ operation, originalDoc, req, context }: any) => {
  if (context?.skipBuild || operation !== 'update' || !originalDoc?.id || !configured()) return
  // War die Seite live? (für „zurückziehen“; Entwurfs-Speichern ändert die Hauptzeile nicht)
  context[`build:wasLive:${originalDoc.id}`] = (await mainStatus(req, originalDoc.id)) === 'published'
}

export const pagesAfterChange: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipBuild || !configured()) return doc
  if (doc._status === 'published') {
    schedule(req, 'publish')
  } else if (context?.[`build:wasLive:${doc.id}`] && (await mainStatus(req, doc.id)) !== 'published') {
    schedule(req, 'publish') // zurückgezogen
  } else {
    schedule(req, 'preview')
  }
  return doc
}

export const pagesAfterDelete: CollectionAfterDeleteHook = ({ doc, req, context }) => {
  if (context?.skipBuild) return doc
  schedule(req, doc?._status === 'published' ? 'publish' : 'preview')
  return doc
}

export const globalAfterChange: GlobalAfterChangeHook = ({ doc, req, context }) => {
  if (!context?.skipBuild) schedule(req, 'publish')
  return doc
}
