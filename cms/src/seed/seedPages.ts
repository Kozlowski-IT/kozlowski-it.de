import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import type { Payload } from 'payload'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'

// cms/src/seed -> Repo-Root (Quelle der Bestandsbilder: <repo><publicPath>)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const LOCALES = ['de', 'en'] as const
type Locale = (typeof LOCALES)[number]

/**
 * Seed-Datei einer Seite (cms/src/seed/pages/*.json), Payload-Create-Format mit zwei Markern:
 * - `{ "$html": "<p>…</p>" }` an Stelle eines Rich-Text-Werts → Lexical (convertHTMLToLexical)
 * - `{ "$media": "/assets/img/x.webp" }` an Stelle eines Upload-Werts → ID des Media-Dokuments
 *   mit diesem publicPath (angelegt aus `media[]`, Datei = <repo><publicPath>, R3)
 * Wurzel: nicht lokalisierte Seitenfelder; `locales.<de|en>`: lokalisierte Felder + `layout`.
 * `layout` ist nicht lokalisiert: beide Locales müssen dieselbe Bausteinstruktur haben.
 */
export type PageSeed = {
  translationKey: string
  media?: { publicPath: string; alt: Record<Locale, string> }[]
  locales: Partial<Record<Locale, Record<string, unknown> & { layout?: unknown[] }>>
  [field: string]: unknown
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)
const isMarker = (v: unknown) => isObj(v) && ('$html' in v || '$media' in v)

export type SeedOptions = {
  /** vorhandene Seiten/Medien/Globals mit dem Seed-Stand überschreiben (Default: überspringen) */
  force?: boolean
  log?: (msg: string) => void
}

/** Bestandsdatei über das gespeicherte Original legen, falls Payload sie umkodiert hat (WebP/GIF). */
async function keepOriginal(payload: Payload, id: number | string, filename: string, filePath: string) {
  // Payload kodiert potenziell animierte Formate (WebP/GIF) beim Upload immer per sharp neu
  // (payload/dist/uploads/generateFileData.js: isAnimatedImage). Bestandsbilder müssen aber
  // byte-gleich bleiben (R3; Eleventy bricht sonst mit "kollidiert mit abweichender Datei" ab):
  // gespeichertes Original durch die Bestandsdatei ersetzen und filesize nachziehen.
  const staticDir = payload.collections.media.config.upload.staticDir as string
  const stored = path.join(staticDir, filename)
  const original = fs.readFileSync(filePath)
  if (!fs.existsSync(stored) || !fs.readFileSync(stored).equals(original)) {
    fs.writeFileSync(stored, original)
    await payload.update({ collection: 'media', id, data: { filesize: original.length } as any })
  }
}

/**
 * Media-Dokument mit publicPath finden oder aus der Bestandsdatei anlegen (alt je Locale).
 * Vorhandenes Medium bleibt unverändert (Admin-Änderungen), außer `force`: dann alt aus dem Seed
 * und Bestandsdatei wiederhergestellt.
 */
async function ensureMedia(
  payload: Payload,
  m: { publicPath: string; alt: Record<Locale, string> },
  opts: SeedOptions,
) {
  const log = opts.log ?? (() => {})
  const filePath = path.join(repoRoot, m.publicPath)
  if (!fs.existsSync(filePath)) throw new Error(`seed: Bilddatei fehlt: ${filePath}`)
  const found = await payload.find({
    collection: 'media',
    where: { publicPath: { equals: m.publicPath } },
    limit: 1,
    depth: 0,
  })
  const existing = found.docs[0]
  if (existing && !opts.force) {
    log(`seed: Medium ${m.publicPath} übersprungen (existiert)`)
    return existing.id
  }
  let id = existing?.id
  let filename = existing?.filename as string | undefined
  if (id == null) {
    const doc = await payload.create({
      collection: 'media',
      locale: 'de',
      data: { alt: m.alt.de, publicPath: m.publicPath },
      filePath,
    })
    id = doc.id
    filename = doc.filename as string
  }
  await keepOriginal(payload, id, filename as string, filePath)
  for (const locale of LOCALES) {
    await payload.update({ collection: 'media', id, locale, data: { alt: m.alt[locale] } })
  }
  log(`seed: Medium ${m.publicPath} ${existing ? 'überschrieben (--force)' : 'angelegt'}`)
  return id
}

/**
 * Inline-Links mit rel="… nofollow" → Lexical-Link-Feld `nofollow` (convertHTMLToLexical übernimmt
 * nur href und target). Zuordnung über die Reihenfolge der <a> im HTML und der Link-Knoten im Baum.
 */
function applyNofollow(html: string, lexical: any, where: string) {
  const anchors = [...new JSDOM(`<body>${html}</body>`).window.document.querySelectorAll('a')]
  const rels = anchors.map((a) => (a.getAttribute('rel') ?? '').split(/\s+/).includes('nofollow'))
  if (!rels.some(Boolean)) return lexical
  const links: any[] = []
  const walk = (n: any) => {
    if (n?.type === 'link' || n?.type === 'autolink') links.push(n)
    for (const c of n?.children ?? []) walk(c)
  }
  walk(lexical.root)
  if (links.length !== anchors.length)
    throw new Error(`seed: ${where}: ${anchors.length} <a> im HTML, aber ${links.length} Link-Knoten`)
  links.forEach((l, i) => {
    if (rels[i]) l.fields = { ...l.fields, nofollow: true }
  })
  return lexical
}

/** Marker auflösen ($html → Lexical, $media → ID). */
function resolve(v: unknown, ctx: { media: Map<string, number | string>; editorConfig: any; where: string }): unknown {
  if (Array.isArray(v)) return v.map((x, i) => resolve(x, { ...ctx, where: `${ctx.where}[${i}]` }))
  if (!isObj(v)) return v
  if ('$html' in v)
    return applyNofollow(v.$html, convertHTMLToLexical({ editorConfig: ctx.editorConfig, html: v.$html, JSDOM }), ctx.where)
  if ('$media' in v) {
    const id = ctx.media.get(v.$media)
    if (id == null) throw new Error(`seed: ${ctx.where}: $media ${v.$media} nicht in media[] deklariert`)
    return id
  }
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, { ...ctx, where: `${ctx.where}.${k}` })]))
}

/** Gleiche Bausteinstruktur (blockType/sectionKey/variant, Zeilenanzahl) in beiden Locales. */
function assertSameShape(a: unknown, b: unknown, where: string) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      throw new Error(`seed: ${where}: Struktur de/en verschieden (Array-Länge)`)
    a.forEach((x, i) => assertSameShape(x, b[i], `${where}[${i}]`))
    return
  }
  if (!isObj(a) || !isObj(b) || isMarker(a) || isMarker(b)) return
  for (const k of ['blockType', 'sectionKey', 'variant'])
    if (a[k] !== b[k]) throw new Error(`seed: ${where}.${k}: de ${a[k]} ≠ en ${b[k]}`)
  for (const k of Object.keys(a)) if (Array.isArray(a[k])) assertSameShape(a[k], b[k], `${where}.${k}`)
}

/**
 * IDs der gespeicherten Zeilen (Blöcke, Array-Zeilen) positionsgleich übernehmen, damit ein
 * Update dieselben Zeilen trifft und die Werte der anderen Locale nicht verwirft (layout nicht lokalisiert).
 */
function withIds(v: unknown, saved: unknown): unknown {
  if (Array.isArray(v)) return v.map((x, i) => withIds(x, Array.isArray(saved) ? saved[i] : undefined))
  if (!isObj(v) || isMarker(v)) return v
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) out[k] = withIds(x, isObj(saved) ? saved[k] : undefined)
  if (isObj(saved) && saved.id != null) out.id = saved.id
  return out
}

/**
 * Legt alle `<dir>/*.json` als veröffentlichte Seiten an (beide Locales).
 * Vorhandene Seite (gleicher `translationKey`, auch nur als Entwurf) bleibt unverändert —
 * Admin-Änderungen gehen nicht verloren. Nur mit `force` wird sie mit dem Seed-Stand
 * überschrieben (DE und EN, Zeilen-IDs bleiben erhalten).
 */
export async function seedPages(
  payload: Payload,
  dir: string,
  opts: SeedOptions = {},
): Promise<{ written: string[]; skipped: string[] }> {
  const log = opts.log ?? (() => {})
  const editorConfig =
    (payload.config.editor as any)?.editorConfig ?? (await editorConfigFactory.default({ config: payload.config }))
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
  const written: string[] = []
  const skipped: string[] = []
  // Medien, die in diesem Lauf schon bearbeitet wurden (mehrere Seiten teilen Bestandsbilder)
  const mediaDone = new Map<string, number | string>()
  for (const file of files) {
    const seed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as PageSeed
    const { media: mediaList = [], locales, ...root } = seed
    if (!seed.translationKey) throw new Error(`seed: ${file}: translationKey fehlt`)
    if (!locales?.de) throw new Error(`seed: ${file}: locales.de fehlt`)
    if (locales.en) assertSameShape(locales.de.layout ?? [], locales.en.layout ?? [], `${file}:layout`)

    const existing = await payload.find({
      collection: 'pages',
      where: { translationKey: { equals: seed.translationKey } },
      limit: 1,
      depth: 0,
      draft: true,
    })
    let id = existing.docs[0]?.id
    if (id != null && !opts.force) {
      log(`seed: Seite ${seed.translationKey} übersprungen (existiert)`)
      skipped.push(seed.translationKey)
      continue
    }

    const media = new Map<string, number | string>()
    for (const m of mediaList) {
      if (!mediaDone.has(m.publicPath)) mediaDone.set(m.publicPath, await ensureMedia(payload, m, opts))
      media.set(m.publicPath, mediaDone.get(m.publicPath)!)
    }

    for (const locale of LOCALES) {
      const loc = locales[locale]
      if (!loc) continue
      let data = { ...loc } as Record<string, unknown>
      if (id != null) {
        // Zeilen-IDs aus dem gespeicherten DE-Stand übernehmen: layout ist nicht lokalisiert, ohne
        // IDs ersetzt Payload die Zeilen und verwirft die Werte der anderen Locale (DE- wie EN-Update).
        const saved = await payload.findByID({ collection: 'pages', id, locale: 'de', depth: 0, draft: true })
        data = withIds(data, { layout: saved.layout }) as Record<string, unknown>
      }
      data = resolve(data, { media, editorConfig, where: `${file}:${locale}` }) as Record<string, unknown>
      const full = { ...root, ...data, _status: 'published' as const }
      if (id == null) {
        const doc = await payload.create({ collection: 'pages', locale, data: full as any, context: { skipBuild: true } })
        id = doc.id
      } else {
        await payload.update({ collection: 'pages', id, locale, data: full as any, context: { skipBuild: true } })
      }
    }
    log(`seed: Seite ${seed.translationKey} ${existing.docs[0] ? 'überschrieben (--force)' : 'angelegt'}`)
    written.push(seed.translationKey)
  }
  return { written, skipped }
}
