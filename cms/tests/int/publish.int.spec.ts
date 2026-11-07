// @vitest-environment node
// Task 11: Payload ↔ Builder. Der Builder ist hier ein Mock-HTTP-Server (127.0.0.1, freier Port).
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { commitTransaction, createLocalReq, getPayload, initTransaction, killTransaction, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, beforeEach, afterAll, expect, vi } from 'vitest'
import { seedGlobals } from '@/seed/seedGlobals'
import { buildsSettled, RESTART_REASON, RESTART_WARNING, STALE_REASON, writeStatus } from '@/hooks/triggerBuild'
import { previewUrl } from '@/lib/previewUrl'

type Call = { method: string; path: string; auth: string | undefined; body: any; seen?: any }
type Reply = { status: number; body: unknown; delayMs?: number }

const TOKEN = 'geheim-'.padEnd(48, 'x')
const RELEASE = '2026-11-07_120000'
let payload: Payload
let server: http.Server
let port: number
let calls: Call[] = []
let reply: (path: string) => Reply = (p) => defaults(p)
/** optional: was der Mock beim Eintreffen von /publish in der DB sieht (außerhalb der Transaktion) */
let onPublish: (() => Promise<unknown>) | undefined

const defaults = (path: string): Reply => {
  if (path === '/preview') return { status: 202, body: { queued: true } }
  if (path === '/publish') return { status: 200, body: { ok: true, release: RELEASE } }
  if (path === '/releases') return { status: 200, body: { current: RELEASE, releases: [RELEASE, '2026-11-06_090000'] } }
  if (path === '/rollback') return { status: 200, body: { ok: true, release: '2026-11-06_090000' } }
  return { status: 404, body: { ok: false } }
}

const paths = () => calls.map((c) => `${c.method} ${c.path}`)
const status = () => payload.findGlobal({ slug: 'publishStatus' }) as Promise<any>
const env = { ...process.env }

const hero = (h1: string) => [{ blockType: 'hero', sectionKey: 'hero', variant: 'home', h1 }]
const mkPage = (key: string, extra: Record<string, unknown> = {}, draft = false) =>
  payload.create({
    collection: 'pages',
    locale: 'de',
    draft,
    data: { slug: key, slugEn: key, translationKey: key, title: `T-${key}`, layout: hero('Hallo'), ...extra } as any,
  })

/** Endpoint-Handler direkt aufrufen (wie Payloads REST-Router, mit Minimal-Request). */
const endpoint = (path: string, method: string) => {
  const e = (payload.config.endpoints as any[]).find((x) => x.path === path && x.method === method)
  if (!e) throw new Error(`Endpoint ${method} ${path} fehlt`)
  return (opts: { user?: unknown; body?: unknown; contentType?: string }) =>
    e.handler({
      payload,
      user: opts.user ?? null,
      headers: new Headers(opts.contentType === undefined ? { 'content-type': 'application/json' } : { 'content-type': opts.contentType }),
      json: async () => (typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body),
    }) as Promise<Response>
}

describe('Payload ↔ Builder', () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = ''
      req.on('data', (c) => (raw += c))
      req.on('end', async () => {
        const call: Call = {
          method: req.method!,
          path: req.url!,
          auth: req.headers.authorization,
          body: raw ? JSON.parse(raw) : undefined,
        }
        calls.push(call)
        if (req.url === '/publish' && onPublish) call.seen = await onPublish()
        const r = reply(req.url!)
        if (r.delayMs) await new Promise((ok) => setTimeout(ok, r.delayMs))
        if (res.destroyed) return
        res.writeHead(r.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(r.body))
      })
    })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    port = (server.address() as AddressInfo).port
    process.env.BUILDER_URL = `http://127.0.0.1:${port}`
    process.env.BUILDER_TOKEN = TOKEN
    payload = await getPayload({ config: await config })
    await seedGlobals(payload, { force: true })
    await buildsSettled()
  })

  beforeEach(async () => {
    process.env.BUILDER_URL = `http://127.0.0.1:${port}`
    process.env.BUILDER_TOKEN = TOKEN
    delete process.env.BUILDER_PUBLISH_TIMEOUT_MS
    await payload.delete({ collection: 'pages', where: { id: { exists: true } }, context: { skipBuild: true } })
    await buildsSettled()
    calls = []
    reply = defaults
    onPublish = undefined
  })

  afterAll(async () => {
    await payload.delete({ collection: 'pages', where: { id: { exists: true } }, context: { skipBuild: true } })
    await buildsSettled()
    process.env = env
    await new Promise((ok) => server.close(ok))
  })

  it('Entwurf speichern (auch Autosave) ruft nur /preview — mit Bearer-Token', async () => {
    const doc = await mkPage('t-draft', {}, true)
    await buildsSettled()
    expect(paths()).toEqual(['POST /preview'])
    expect(calls[0].auth).toBe(`Bearer ${TOKEN}`)
    await payload.update({
      collection: 'pages', id: doc.id, locale: 'de', draft: true, autosave: true, data: { layout: hero('Neu') } as any,
    })
    await buildsSettled()
    expect(paths()).toEqual(['POST /preview', 'POST /preview'])
  })

  it('Entwurf einer bereits veröffentlichten Seite → nur /preview (live bleibt)', async () => {
    const doc = await mkPage('t-live', { _status: 'published' })
    await buildsSettled()
    calls = []
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', draft: true, data: { layout: hero('Entwurf') } as any })
    await buildsSettled()
    expect(paths()).toEqual(['POST /preview'])
  })

  it('Veröffentlichen → genau EIN /publish (nach dem Commit), publishStatus live + Release', async () => {
    const doc = await mkPage('t-pub', {}, true)
    await buildsSettled()
    calls = []
    // Der Builder exportiert aus einem eigenen Prozess: er muss den veröffentlichten Stand sehen.
    onPublish = () =>
      payload.find({ collection: 'pages', where: { slug: { equals: 't-pub' } }, draft: false, depth: 0 })
        .then((r) => (r.docs[0] as any)?._status)
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', data: { _status: 'published', layout: hero('Live') } as any })
    await buildsSettled()
    expect(paths().filter((p) => p === 'POST /publish')).toHaveLength(1)
    expect(calls.find((c) => c.path === '/publish')!.seen).toBe('published')
    const s = await status()
    expect(s).toMatchObject({ state: 'live', action: 'publish', release: RELEASE })
    expect(s.reason ?? null).toBeNull()
    expect(new Date(s.at).getTime()).toBeGreaterThan(Date.now() - 60_000)
  })

  it('Transaktion: kein Builder-Aufruf vor dem Commit; mehrere Änderungen in EINER Transaktion → EIN /publish', async () => {
    const doc = await mkPage('t-tx', {}, true)
    await buildsSettled()
    calls = []
    onPublish = () =>
      payload.find({ collection: 'pages', where: { slug: { equals: 't-tx' } }, draft: false, depth: 0 })
        .then((r) => (r.docs[0] as any)?._status)
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', req, data: { _status: 'published' } as any })
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', req, data: { _status: 'published', title: 'T-tx2' } as any })
    await payload.updateGlobal({ slug: 'chrome', locale: 'de', req, data: { skip: 'Zum Inhalt springen' } as any })
    await new Promise((r) => setTimeout(r, 500))
    expect(calls).toEqual([]) // Transaktion offen → Builder wartet
    await commitTransaction(req)
    await buildsSettled()
    expect(paths()).toEqual(['POST /publish', 'POST /preview'])
    expect(calls[0].seen).toBe('published')
  })

  it('Transaktion zurückgerollt → kein Builder-Aufruf', async () => {
    const doc = await mkPage('t-rb', {}, true)
    await buildsSettled()
    calls = []
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', req, data: { _status: 'published' } as any })
    await killTransaction(req)
    await buildsSettled()
    expect(calls).toEqual([])
  })

  it('Neue Seite direkt veröffentlicht → genau EIN /publish', async () => {
    await mkPage('t-new', { _status: 'published' })
    await buildsSettled()
    expect(paths().filter((p) => p === 'POST /publish')).toHaveLength(1)
  })

  it('Builder {ok:false, reason} → failed mit Grund; die Seite bleibt veröffentlicht', async () => {
    await mkPage('t-ok-first', { _status: 'published' })
    await buildsSettled()
    expect((await status()).release).toBe(RELEASE)
    reply = (p) => (p === '/publish' ? { status: 200, body: { ok: false, reason: 'check-links: /x/ Ziel fehlt', phase: 'checks' } } : defaults(p))
    const doc = await mkPage('t-fail', { _status: 'published' })
    await buildsSettled()
    const s = await status()
    expect(s.state).toBe('failed')
    expect(s.reason).toContain('check-links: /x/ Ziel fehlt')
    expect(s.reason).toContain('Phase: checks')
    expect(s.release).toBe(RELEASE) // live ist weiter der vorige Stand
    const again = await payload.findByID({ collection: 'pages', id: doc.id, draft: false })
    expect(again._status).toBe('published')
  })

  it('Builder-Warnungen (z. B. Git-Push) → live + warning', async () => {
    reply = (p) => (p === '/publish' ? { status: 200, body: { ok: true, release: RELEASE, warnings: ['Git-Abbild: Push fehlgeschlagen'] } } : defaults(p))
    await mkPage('t-warn', { _status: 'published' })
    await buildsSettled()
    expect(await status()).toMatchObject({ state: 'live', warning: 'Git-Abbild: Push fehlgeschlagen' })
  })

  it.each([
    ['401 (falsches Token)', () => { reply = (p) => (p === '/publish' ? { status: 401, body: { ok: false } } : defaults(p)) }, /401.*BUILDER_TOKEN/],
    ['500', () => { reply = (p) => (p === '/publish' ? { status: 500, body: { ok: false, reason: 'interner Fehler' } } : defaults(p)) }, /HTTP 500.*interner Fehler/],
    ['200 ohne ok-Feld', () => { reply = (p) => (p === '/publish' ? { status: 200, body: { release: RELEASE } } : defaults(p)) }, /unverständlich/],
    ['nicht erreichbar', () => { process.env.BUILDER_URL = 'http://127.0.0.1:9' }, /nicht erreichbar/],
    ['Zeitüberschreitung', () => {
      process.env.BUILDER_PUBLISH_TIMEOUT_MS = '300'
      reply = (p) => (p === '/publish' ? { status: 200, body: { ok: true, release: RELEASE }, delayMs: 1500 } : defaults(p))
    }, /antwortet nicht/],
  ])('Builder-Fehler %s → failed mit deutschem Grund, Speichern klappt trotzdem', async (_n, setup, re) => {
    setup()
    const doc = await mkPage(`t-err-${calls.length}-${Date.now()}`, { _status: 'published' })
    expect(doc._status).toBe('published')
    await buildsSettled()
    const s = await status()
    expect(s.state).toBe('failed')
    expect(s.reason).toMatch(re)
  })

  it('Global speichern (site/chrome) → /publish', async () => {
    const site = await payload.findGlobal({ slug: 'site' })
    await payload.updateGlobal({ slug: 'site', data: { ...site, city: site.city } as any })
    await buildsSettled()
    expect(paths()).toContain('POST /publish')
    calls = []
    await payload.updateGlobal({ slug: 'chrome', locale: 'de', data: { skip: 'Zum Inhalt springen' } as any })
    await buildsSettled()
    expect(paths()).toContain('POST /publish')
  })

  it('Zurückziehen (unpublish) und Löschen einer veröffentlichten Seite → /publish; Löschen eines Entwurfs → kein /publish', async () => {
    const doc = await mkPage('t-unpub', { _status: 'published' })
    await buildsSettled()
    calls = []
    await payload.update({ collection: 'pages', id: doc.id, locale: 'de', data: { _status: 'draft' } as any })
    await buildsSettled()
    expect(paths()).toContain('POST /publish')

    const live = await mkPage('t-del', { _status: 'published' })
    await buildsSettled()
    calls = []
    await payload.delete({ collection: 'pages', id: live.id })
    await buildsSettled()
    expect(paths()).toContain('POST /publish')

    const draft = await mkPage('t-del-draft', {}, true)
    await buildsSettled()
    calls = []
    await payload.delete({ collection: 'pages', id: draft.id })
    await buildsSettled()
    expect(paths()).not.toContain('POST /publish')
  })

  it('context.skipBuild bzw. kein BUILDER_URL → kein Aufruf', async () => {
    await payload.create({
      collection: 'pages', locale: 'de', context: { skipBuild: true },
      data: { slug: 't-skip', translationKey: 't-skip', title: 'x', layout: hero('x'), _status: 'published' } as any,
    })
    process.env.BUILDER_URL = ''
    await mkPage('t-nourl', { _status: 'published' })
    await buildsSettled()
    expect(calls).toEqual([])
  })

  it('Seed schreibt ohne Builder-Aufruf (context.skipBuild)', async () => {
    await seedGlobals(payload, { force: true })
    await buildsSettled()
    expect(calls).toEqual([])
  })

  it('Token erscheint in keinem Log', async () => {
    const seen: string[] = []
    const spies = (['info', 'warn', 'error', 'debug'] as const).map((l) =>
      vi.spyOn(payload.logger, l).mockImplementation(((...a: unknown[]) => { seen.push(JSON.stringify(a)) }) as any),
    )
    const cons = (['log', 'warn', 'error'] as const).map((l) =>
      vi.spyOn(console, l).mockImplementation((...a: unknown[]) => { seen.push(a.map(String).join(' ')) }),
    )
    reply = (p) => (p === '/publish' ? { status: 401, body: { ok: false } } : defaults(p))
    await mkPage('t-log', { _status: 'published' })
    process.env.BUILDER_URL = 'http://127.0.0.1:9'
    await mkPage('t-log2', {}, true)
    await buildsSettled()
    for (const s of [...spies, ...cons]) s.mockRestore()
    expect(seen.length).toBeGreaterThan(0) // es wurde überhaupt geloggt
    expect(seen.join('\n')).not.toContain(TOKEN)
  })

  describe('Endpoints /site/releases + /site/rollback', () => {
    const user = { id: 1, collection: 'users', email: 'a@b.c' }

    it('ohne Login → 401, Builder wird nicht gefragt', async () => {
      expect((await endpoint('/site/releases', 'get')({})).status).toBe(401)
      expect((await endpoint('/site/rollback', 'post')({ body: { release: RELEASE } })).status).toBe(401)
      expect(calls).toEqual([])
    })

    it('releases: eingeloggt → Liste vom Builder (Token bleibt serverseitig)', async () => {
      const res = await endpoint('/site/releases', 'get')({ user })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ current: RELEASE, releases: [RELEASE, '2026-11-06_090000'] })
      expect(JSON.stringify(body)).not.toContain(TOKEN)
      expect(calls[0]).toMatchObject({ method: 'GET', path: '/releases', auth: `Bearer ${TOKEN}` })
    })

    it.each([['../x'], ['current'], ['.staging-2026-11-07_120000'], [42], [undefined]])(
      'rollback: ungültiger Name %s → 400 ohne Builder-Aufruf',
      async (release) => {
        const res = await endpoint('/site/rollback', 'post')({ user, body: { release } })
        expect(res.status).toBe(400)
        expect(calls).toEqual([])
      },
    )

    it('rollback: kein JSON-Content-Type → 415', async () => {
      const res = await endpoint('/site/rollback', 'post')({ user, body: { release: RELEASE }, contentType: 'text/plain' })
      expect(res.status).toBe(415)
      expect(calls).toEqual([])
    })

    it('rollback: gültig → Builder /rollback, publishStatus live (action rollback)', async () => {
      const res = await endpoint('/site/rollback', 'post')({ user, body: { release: '2026-11-06_090000' } })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, release: '2026-11-06_090000' })
      expect(calls).toEqual([
        { method: 'POST', path: '/rollback', auth: `Bearer ${TOKEN}`, body: { release: '2026-11-06_090000' } },
      ])
      expect(await status()).toMatchObject({ state: 'live', action: 'rollback', release: '2026-11-06_090000' })
    })

    it('rollback: Builder 404 / ok:false / nicht erreichbar → Fehler an die UI, publishStatus unverändert', async () => {
      const before = await status()
      reply = (p) => (p === '/rollback' ? { status: 404, body: { ok: false, reason: 'Release 2026-01-01_000000 fehlt' } } : defaults(p))
      let res = await endpoint('/site/rollback', 'post')({ user, body: { release: '2026-01-01_000000' } })
      expect(res.status).toBe(404)
      expect((await res.json()).reason).toContain('fehlt')
      reply = (p) => (p === '/rollback' ? { status: 200, body: { ok: false, reason: 'EACCES' } } : defaults(p))
      res = await endpoint('/site/rollback', 'post')({ user, body: { release: '2026-01-01_000000' } })
      expect(res.status).toBe(502)
      expect((await res.json()).reason).toContain('EACCES')
      process.env.BUILDER_URL = 'http://127.0.0.1:9'
      res = await endpoint('/site/rollback', 'post')({ user, body: { release: '2026-01-01_000000' } })
      expect(res.status).toBe(502)
      expect((await res.json()).reason).toMatch(/nicht erreichbar/)
      const after = await status()
      expect(after.state).toBe(before.state)
      expect(after.release).toBe(before.release)
    })
  })

  describe('Neustart / hängendes running', () => {
    const OLD = '2026-11-06_090000'
    const running = (release: string, at = new Date().toISOString()) =>
      writeStatus(payload, { state: 'running', action: 'publish', at, release, reason: null, warning: null })
    const onInit = () => (payload.config.onInit as any)(payload)

    it('running + Builder hat neuen current → live mit diesem Release + Warnung (über config.onInit)', async () => {
      await running(OLD)
      calls = []
      await onInit()
      await buildsSettled()
      expect(paths()).toEqual(['GET /releases'])
      expect(await status()).toMatchObject({ state: 'live', release: RELEASE, warning: RESTART_WARNING })
    })

    it('running + current unverändert → failed „durch Neustart unterbrochen“, release bleibt', async () => {
      await running(RELEASE)
      await onInit()
      await buildsSettled()
      expect(await status()).toMatchObject({ state: 'failed', release: RELEASE, reason: RESTART_REASON })
    })

    it('running + Builder nicht erreichbar → failed, Grund nennt Neustart', async () => {
      await running(RELEASE)
      process.env.BUILDER_URL = 'http://127.0.0.1:9'
      await onInit()
      await buildsSettled()
      const s = await status()
      expect(s.state).toBe('failed')
      expect(s.reason).toContain(RESTART_REASON)
    })

    it('nicht running → kein Builder-Aufruf, nichts geändert', async () => {
      await writeStatus(payload, { state: 'live', action: 'publish', at: new Date().toISOString(), release: RELEASE })
      calls = []
      await onInit()
      await buildsSettled()
      expect(calls).toEqual([])
      expect((await status()).state).toBe('live')
    })

    it('ohne BUILDER_URL/TOKEN → Warnung im Log beim Start', async () => {
      const warns: string[] = []
      const spy = vi.spyOn(payload.logger, 'warn').mockImplementation(((m: unknown) => { warns.push(String(m)) }) as any)
      process.env.BUILDER_TOKEN = ''
      await onInit()
      spy.mockRestore()
      expect(warns.join('\n')).toMatch(/BUILDER_URL\/BUILDER_TOKEN fehlen/)
    })

    it('Anzeige: running älter als die Publish-Wartezeit → failed (gespeichert bleibt running)', async () => {
      await running(RELEASE, new Date(Date.now() - 10 * 60_000).toISOString())
      expect(await status()).toMatchObject({ state: 'failed', reason: STALE_REASON })
      expect(await payload.findGlobal({ slug: 'publishStatus', context: { raw: true } })).toMatchObject({ state: 'running' })
      await running(RELEASE)
      expect((await status()).state).toBe('running')
    })
  })

  it('Rollback beachtet BUILDER_PUBLISH_TIMEOUT_MS', async () => {
    process.env.BUILDER_PUBLISH_TIMEOUT_MS = '300'
    reply = (p) => (p === '/rollback' ? { status: 200, body: { ok: true, release: '2026-11-06_090000' }, delayMs: 1500 } : defaults(p))
    const e = (payload.config.endpoints as any[]).find((x) => x.path === '/site/rollback')
    const res: Response = await e.handler({
      payload, user: { id: 1 }, headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ release: '2026-11-06_090000' }),
    })
    expect(res.status).toBe(502)
    expect((await res.json()).reason).toMatch(/antwortet nicht/)
  })

  it('publishStatus: per REST/Local-API ohne overrideAccess nicht änderbar', async () => {
    await expect(
      payload.updateGlobal({ slug: 'publishStatus', overrideAccess: false, user: { id: 1, collection: 'users' } as any, data: { state: 'live' } as any }),
    ).rejects.toThrow()
  })

  it('Live-Vorschau-URL: PREVIEW_URL + Permalink je Locale', () => {
    process.env.PREVIEW_URL = 'http://127.0.0.1:4200/'
    expect(previewUrl({ slug: 'index', slugEn: 'index' }, 'de')).toBe('http://127.0.0.1:4200/')
    expect(previewUrl({ slug: 'index', slugEn: 'index' }, 'en')).toBe('http://127.0.0.1:4200/en/')
    expect(previewUrl({ slug: 'leistungen', slugEn: 'services' }, 'de')).toBe('http://127.0.0.1:4200/leistungen/')
    expect(previewUrl({ slug: 'leistungen', slugEn: 'services' }, 'en')).toBe('http://127.0.0.1:4200/en/services/')
    expect(previewUrl({ slug: 'impressum', bilingual: false }, 'en')).toBe('http://127.0.0.1:4200/impressum/')
    expect(previewUrl({ slug: 'neu' }, 'en')).toBe('http://127.0.0.1:4200/neu/') // noch kein EN-Slug
    expect(previewUrl({}, 'de')).toBe('http://127.0.0.1:4200/')
    delete process.env.PREVIEW_URL
    expect(previewUrl({ slug: 'x' }, 'de')).toBeNull()
    // in der Config verdrahtet
    process.env.PREVIEW_URL = 'http://p'
    const url = (payload.config.admin.livePreview as any).url
    expect(url({ data: { slug: 'leistungen', slugEn: 'services' }, locale: { code: 'en' } })).toBe('http://p/en/services/')
    expect((payload.config.admin.livePreview as any).collections).toContain('pages')
  })
})
