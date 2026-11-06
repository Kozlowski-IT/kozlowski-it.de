import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Field, Payload } from 'payload'
import { isEmptyRichText, lexicalToHtml } from './lexicalToHtml'

export type ExportOptions = { outDir?: string; drafts: boolean }
export type ExportResult = { pages: number; missing: string[] }

/** Repo-Root unabhängig vom cwd (cms/src/export → ../../..). */
export const defaultOutDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../content')

const LOCALES = ['de', 'en'] as const
type Locale = (typeof LOCALES)[number]

type Ctx = {
  payload: Payload
  key: string
  locale: Locale
  /** nur bilinguale Seiten, Locale en: leere lokalisierte Pflichtfelder → missing */
  checkRequired: boolean
  missing: string[]
  media: Map<string, { file: string; publicPath: string }>
  mediaDir: string
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)

function isEmpty(field: Field, v: unknown): boolean {
  if (v == null || v === '') return true
  if (field.type === 'richText') return isEmptyRichText(v)
  if (Array.isArray(v)) return v.length === 0
  return false
}

const miss = (c: Ctx, p: string) => c.missing.push(`${c.key}/${c.locale}/${p}`)

/** Medien-Referenz (depth 1) → { publicPath, file, alt, width, height }; Datei wird vorgemerkt. */
function exportMedia(c: Ctx, v: any, p: string): Record<string, unknown> | undefined {
  if (!isObj(v) || !v.publicPath || !v.filename) {
    miss(c, p) // Dokument gelöscht/nicht auflösbar
    return undefined
  }
  const src = path.join(c.mediaDir, v.filename)
  if (!fs.existsSync(src)) {
    miss(c, p)
    return undefined
  }
  if (c.checkRequired && !v.alt) miss(c, `${p}.alt`)
  c.media.set(v.filename, { file: v.filename, publicPath: v.publicPath })
  const out: Record<string, unknown> = { publicPath: v.publicPath, file: v.filename, alt: v.alt ?? '' }
  if (v.width) out.width = v.width
  if (v.height) out.height = v.height
  return out
}

/** Konfigurationsgeführter Durchlauf: Rich-Text → HTML, Uploads → Medien-Referenz, Meta weg, Pflichtprüfung. */
function walk(fields: Field[], data: any, c: Ctx, base: string, parentLocalized = false): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!isObj(data)) data = {}
  for (const f of fields) {
    if (f.type === 'row' || f.type === 'collapsible') {
      Object.assign(out, walk(f.fields, data, c, base, parentLocalized))
      continue
    }
    if (!('name' in f) || !f.name || ['id', 'blockName', 'blockType'].includes(f.name)) continue
    const name = f.name
    const p = base ? `${base}.${name}` : name
    const v = data[name]
    const localized = parentLocalized || !!(f as any).localized
    if (c.checkRequired && (f as any).required && localized && isEmpty(f, v) && f.type !== 'upload') miss(c, p)

    switch (f.type) {
      case 'richText': {
        if (v != null && !isEmptyRichText(v)) {
          out[name] = lexicalToHtml(v, { onInternalLink: () => miss(c, `${p}(interner-link)`) })
        } else if (v != null) out[name] = ''
        break
      }
      case 'upload': {
        if (v == null || v === '') {
          if (c.checkRequired && (f as any).required && localized) miss(c, p)
        } else {
          const m = exportMedia(c, v, p)
          if (m) out[name] = m
        }
        break
      }
      case 'group':
        if (isObj(v)) out[name] = walk(f.fields, v, c, p, localized)
        break
      case 'array':
        if (Array.isArray(v))
          out[name] = v.map((row, i) => walk(f.fields, row, c, `${p}[${i}]`, localized))
        break
      case 'blocks':
        if (Array.isArray(v))
          out[name] = v.map((row, i) => {
            const bp = `${p}[${i}]`
            const block = f.blocks.find((b) => b.slug === row?.blockType)
            if (!block) {
              miss(c, `${bp}(unbekannter-block:${row?.blockType})`)
              return { blockType: row?.blockType }
            }
            const o = walk(block.fields, row, c, bp, localized)
            return { blockType: block.slug, ...o, ...(row.blockName ? { blockName: row.blockName } : {}) }
          })
        break
      default:
        if (v != null) out[name] = v
    }
  }
  return out
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
}

/**
 * Schreibt site.json, chrome.json, pages.json und media/ nach `outDir` (Default: <repo>/content).
 * drafts:false = nur veröffentlichte Seiten mit veröffentlichtem Text; drafts:true = jeweils neuester Entwurf.
 */
export async function exportContent(payload: Payload, opts: ExportOptions): Promise<ExportResult> {
  const outDir = path.resolve(opts.outDir ?? defaultOutDir)
  const mediaSrc = (payload.collections.media.config.upload as any).staticDir as string
  const missing: string[] = []
  const media = new Map<string, { file: string; publicPath: string }>()
  const strip = (v: any): any =>
    Array.isArray(v)
      ? v.map(strip)
      : isObj(v)
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([k, x]) => !['id', 'createdAt', 'updatedAt', 'globalType'].includes(k) && x != null)
              .map(([k, x]) => [k, strip(x)]),
          )
        : v

  // Globals
  const site = strip(await payload.findGlobal({ slug: 'site', depth: 0 }))
  const chrome: Record<string, unknown> = {}
  for (const locale of LOCALES) chrome[locale] = strip(await payload.findGlobal({ slug: 'chrome', locale, depth: 0 }))

  // Seiten
  const pagesConfig = payload.collections.pages.config
  const layoutField = pagesConfig.fields.find((f) => 'name' in f && f.name === 'layout') as Field
  const where = opts.drafts ? undefined : { _status: { equals: 'published' as const } }
  const base = await payload.find({
    collection: 'pages', locale: 'de', draft: opts.drafts, where, limit: 0, pagination: false, depth: 0, sort: 'slug',
  })

  const pages: unknown[] = []
  for (const stub of base.docs) {
    const key = stub.translationKey
    const bilingual = stub.bilingual !== false
    const locales: Record<string, unknown> = {}
    for (const locale of bilingual ? LOCALES : (['de'] as const)) {
      const doc: any = await payload.findByID({
        collection: 'pages', id: stub.id, locale, draft: opts.drafts, depth: 1,
      })
      const c: Ctx = {
        payload, key, locale, checkRequired: bilingual && locale === 'en', missing, media, mediaDir: mediaSrc,
      }
      const slug = locale === 'de' ? doc.slug : doc.slugEn
      if (c.checkRequired && !slug) miss(c, 'slugEn')
      if (c.checkRequired && !doc.title) miss(c, 'title')
      const blocks = (walk([layoutField], doc, c, '').layout ?? []) as unknown[]
      const lp: Record<string, unknown> = { slug: slug ?? '', title: doc.title ?? '' }
      if (doc.description) lp.description = doc.description
      if (doc.ogTitle || doc.ogDescription) {
        lp.og = {
          ...(doc.ogTitle ? { title: doc.ogTitle } : {}),
          ...(doc.ogDescription ? { description: doc.ogDescription } : {}),
        }
      }
      lp.blocks = blocks
      locales[locale] = lp
    }
    pages.push({
      translationKey: key,
      bilingual,
      noindex: !!stub.noindex,
      minimalHeader: !!stub.minimalHeader,
      structuredData: stub.structuredData ?? 'none',
      frame: stub.frame ?? 'subpage',
      locales,
    })
  }

  // Ausgabe (media/ wird neu aufgebaut, damit keine Altlasten bleiben)
  fs.mkdirSync(outDir, { recursive: true })
  writeJson(path.join(outDir, 'site.json'), site)
  writeJson(path.join(outDir, 'chrome.json'), chrome)
  writeJson(path.join(outDir, 'pages.json'), pages)
  const mediaOut = path.join(outDir, 'media')
  fs.rmSync(mediaOut, { recursive: true, force: true })
  fs.mkdirSync(mediaOut, { recursive: true })
  const manifest = [...media.values()].sort((a, b) => a.file.localeCompare(b.file))
  for (const m of manifest) fs.copyFileSync(path.join(mediaSrc, m.file), path.join(mediaOut, m.file))
  writeJson(path.join(mediaOut, 'index.json'), manifest)

  return { pages: pages.length, missing: [...new Set(missing)] }
}
