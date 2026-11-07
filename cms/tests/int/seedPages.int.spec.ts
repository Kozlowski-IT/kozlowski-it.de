// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { seedGlobals } from '@/seed/seedGlobals'
import { seedPages } from '@/seed/seedPages'
import { exportContent } from '@/export/exportContent'
import { lexicalToHtml } from '@/export/lexicalToHtml'

let payload: Payload
const repoRoot = path.resolve(__dirname, '../../..')
const pagesDir = path.resolve(__dirname, '../../src/seed/pages')
const readSeed = (f: string) => JSON.parse(fs.readFileSync(path.join(pagesDir, f), 'utf8'))
const seedFiles = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.json')).sort()
const seeds = seedFiles.map(readSeed)
const seed = readSeed('home.json')
const allKeys: string[] = seeds.map((s) => s.translationKey)
const publicPaths: string[] = [...new Set(seeds.flatMap((s) => (s.media ?? []).map((m: any) => m.publicPath)))]
const tmp = () => fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'seedpages-'))

const cleanup = async () => {
  await payload.delete({ collection: 'pages', where: { translationKey: { in: [...allKeys, 't-shape'] } } })
  await payload.delete({ collection: 'media', where: { publicPath: { in: publicPaths } } })
}

const homeId = async () =>
  (await payload.find({ collection: 'pages', where: { translationKey: { equals: 'home' } }, depth: 0 })).docs[0].id
const load = (id: number | string, locale: 'de' | 'en') =>
  payload.findByID({ collection: 'pages', id, locale, depth: 0, draft: true }) as Promise<any>

/** sichtbarer Text eines HTML-Strings (Tags weg, Whitespace kollabiert) */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Gespeicherter Stand (depth 0) == Seed-Werte einer Locale: Skalare exakt, $media → ID des Mediums,
 * $html → gleicher sichtbarer Text. Liefert die Pfade der Abweichungen.
 */
async function diffToSeed(stored: any, want: any, where = ''): Promise<string[]> {
  if (Array.isArray(want)) {
    if (!Array.isArray(stored) || stored.length !== want.length) return [`${where}: Länge`]
    return (await Promise.all(want.map((w, i) => diffToSeed(stored[i], w, `${where}[${i}]`)))).flat()
  }
  if (want && typeof want === 'object') {
    if ('$html' in want) return plain(lexicalToHtml(stored)) === plain(want.$html) ? [] : [`${where}: Rich-Text`]
    if ('$media' in want) {
      const m = await payload.find({ collection: 'media', where: { publicPath: { equals: want.$media } }, depth: 0 })
      return m.docs[0]?.id === stored ? [] : [`${where}: Medium`]
    }
    return (await Promise.all(Object.entries(want).map(([k, w]) => diffToSeed(stored?.[k], w, `${where}.${k}`)))).flat()
  }
  return stored === want ? [] : [`${where}: ${JSON.stringify(stored)} ≠ ${JSON.stringify(want)}`]
}

// alle Seiten seeden dauert länger als der Vitest-Default (5 s)
describe('seedPages (alle migrierten Seiten)', { timeout: 120_000 }, () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await seedGlobals(payload, { force: true })
    await cleanup()
  }, 120_000)
  afterAll(async () => {
    await cleanup()
  }, 120_000)

  it('legt alle Seiten veröffentlicht an; home in de+en, EN-Update behält DE-Werte der gemeinsamen Zeilen', async () => {
    const res = await seedPages(payload, pagesDir)
    expect(res).toEqual({ written: allKeys, skipped: [] })
    const found = await payload.find({ collection: 'pages', where: { translationKey: { equals: 'home' } }, depth: 0 })
    expect(found.totalDocs).toBe(1)
    const id = found.docs[0].id
    const de: any = await payload.findByID({ collection: 'pages', id, locale: 'de', depth: 1 })
    const en: any = await payload.findByID({ collection: 'pages', id, locale: 'en', depth: 1 })
    expect(de._status).toBe('published')
    expect([de.slug, de.slugEn, de.frame, de.structuredData]).toEqual(['index', 'index', 'home', 'home'])
    expect(de.title).toBe(seed.locales.de.title)
    expect(en.title).toBe(seed.locales.en.title)
    expect(de.layout.map((b: any) => b.sectionKey)).toEqual(seed.locales.de.layout.map((b: any) => b.sectionKey))
    // gemeinsame Zeilen (layout nicht lokalisiert), lokalisierte Werte je Sprache
    expect(de.layout.map((b: any) => b.id)).toEqual(en.layout.map((b: any) => b.id))
    expect([de.layout[1].anchorId, en.layout[1].anchorId]).toEqual(['sicherheitscheck', 'security-check'])
    expect([de.layout[0].h1, en.layout[0].h1]).toEqual([seed.locales.de.layout[0].h1, seed.locales.en.layout[0].h1])
    // Bilder je Locale (cards[1]: netzplan-de / netzplan-en)
    expect(de.layout[6].cards[1].image.publicPath).toBe('/assets/img/netzplan-de.jpg')
    expect(en.layout[6].cards[1].image.publicPath).toBe('/assets/img/netzplan-en.jpg')
    expect(en.layout[0].photo.alt).toBe('Portrait of Pascal Kozlowski')
    // $html → Lexical
    expect(de.layout[0].claim.root.type).toBe('root')
  })

  it('jede Seite entspricht in DE und EN dem Seed (alle Felder)', async () => {
    for (const s of seeds) {
      const doc = (await payload.find({ collection: 'pages', where: { translationKey: { equals: s.translationKey } }, depth: 0 })).docs[0]
      for (const locale of ['de', 'en'] as const) {
        if (!s.locales[locale]) continue
        expect(await diffToSeed(await load(doc.id, locale), s.locales[locale]), `${s.translationKey}/${locale}`).toEqual([])
      }
    }
  })

  it('zweiter Lauf (Default) überspringt alles; Admin-Änderungen in DE und EN bleiben erhalten', async () => {
    const id = await homeId()
    // Admin ändert DE und EN (wie im Editor: gespeicherte Zeilen mit IDs)
    const de = await load(id, 'de')
    de.layout[0].h1 = 'Admin-DE'
    await payload.update({ collection: 'pages', id, locale: 'de', data: { title: 'Admin-Titel-DE', layout: de.layout } })
    const en = await load(id, 'en')
    en.layout[0].h1 = 'Admin-EN'
    await payload.update({ collection: 'pages', id, locale: 'en', data: { title: 'Admin-Titel-EN', layout: en.layout } })
    const avatar = (await payload.find({ collection: 'media', where: { publicPath: { equals: '/assets/img/avatar2.webp' } }, depth: 0 })).docs[0]
    await payload.update({ collection: 'media', id: avatar.id, locale: 'en', data: { alt: 'Admin-Alt-EN' } })

    const logs: string[] = []
    const res = await seedPages(payload, pagesDir, { log: (m) => logs.push(m) })
    expect(res).toEqual({ written: [], skipped: allKeys })
    expect(logs).toContain('seed: Seite home übersprungen (existiert)')

    const [deAfter, enAfter] = [await load(id, 'de'), await load(id, 'en')]
    expect([deAfter.title, enAfter.title]).toEqual(['Admin-Titel-DE', 'Admin-Titel-EN'])
    expect([deAfter.layout[0].h1, enAfter.layout[0].h1]).toEqual(['Admin-DE', 'Admin-EN'])
    expect([deAfter.layout[1].anchorId, enAfter.layout[1].anchorId]).toEqual(['sicherheitscheck', 'security-check'])
    const alt = (await payload.findByID({ collection: 'media', id: avatar.id, locale: 'en', depth: 0 })).alt
    expect(alt).toBe('Admin-Alt-EN')
    // keine Duplikate
    expect((await payload.find({ collection: 'pages', where: { translationKey: { equals: 'home' } }, depth: 0 })).totalDocs).toBe(1)
    for (const p of publicPaths) {
      const m = await payload.find({ collection: 'media', where: { publicPath: { equals: p } }, depth: 0 })
      expect(m.totalDocs, p).toBe(1)
    }
  })

  it('--force überschreibt mit dem Seed-Stand: DE- und EN-Werte == Seed, gleiche Seite und Zeilen-IDs', async () => {
    const id = await homeId()
    const idsBefore = (await load(id, 'de')).layout.map((b: any) => b.id)
    const res = await seedPages(payload, pagesDir, { force: true })
    expect(res).toEqual({ written: allKeys, skipped: [] })
    expect(await homeId()).toBe(id)
    const [de, en] = [await load(id, 'de'), await load(id, 'en')]
    expect(de.layout.map((b: any) => b.id)).toEqual(idsBefore)
    expect(en.layout.map((b: any) => b.id)).toEqual(idsBefore)
    expect(await diffToSeed(de, seed.locales.de)).toEqual([])
    expect(await diffToSeed(en, seed.locales.en)).toEqual([])
    expect([de.title, en.title]).toEqual([seed.locales.de.title, seed.locales.en.title])
    const avatar = (await payload.find({ collection: 'media', where: { publicPath: { equals: '/assets/img/avatar2.webp' } }, depth: 0 })).docs[0]
    const alts = await Promise.all(
      (['de', 'en'] as const).map(async (locale) => (await payload.findByID({ collection: 'media', id: avatar.id, locale, depth: 0 })).alt),
    )
    expect(alts).toEqual([seed.media[0].alt.de, seed.media[0].alt.en])
  })

  it('Bestandsbilder bleiben byte-gleich (auch WebP, das Payload sonst neu kodiert)', async () => {
    const staticDir = payload.collections.media.config.upload.staticDir as string
    for (const p of publicPaths) {
      const m: any = (await payload.find({ collection: 'media', where: { publicPath: { equals: p } }, depth: 0 })).docs[0]
      const stored = fs.readFileSync(path.join(staticDir, m.filename))
      expect(stored.equals(fs.readFileSync(path.join(repoRoot, p))), p).toBe(true)
      expect(m.filesize, p).toBe(stored.length)
    }
  })

  it('Export: keine fehlenden Pflichtfelder, Rich-Text als HTML (nofollow, Zeilenumbruch)', async () => {
    const out = tmp()
    const res = await exportContent(payload, { outDir: out, drafts: false })
    expect(res.missing.filter((m: string) => allKeys.some((k) => m.startsWith(`${k}/`)))).toEqual([])
    const pages = JSON.parse(fs.readFileSync(path.join(out, 'pages.json'), 'utf8')).pages
    const page = (key: string) => pages.find((p: any) => p.translationKey === key)
    const faq = page('home').locales.de.blocks.find((b: any) => b.blockType === 'faq')
    expect(faq.items[2].answer).toContain('<em>bevor</em>')
    expect(page('home').locales.de.blocks[0].claim).toBe(seed.locales.de.layout[0].claim.$html)
    // rel="… nofollow" aus dem Seed-HTML bleibt erhalten (Lexical-Feld nofollow)
    expect(page('vmware-ausstieg').locales.de.blocks[0].note).toContain(
      'href="https://www.proxmox.com/en/products/proxmox-virtual-environment/pricing" rel="noopener nofollow" target="_blank"',
    )
    // <br> aus dem Seed-HTML bleibt ein Zeilenumbruch
    expect(page('impressum').locales.de.blocks[0].body).toContain('Pascal Kozlowski<br />{{site.street}}<br />')
    // Kontaktdaten als Platzhalter (Task 13): danke hängt wieder am Global site
    expect(page('danke').locales.de.blocks[0].body).toBe(
      '<p>Falls es eilt, erreichen Sie mich direkt: Telefon <a href="{{site.telHref}}">{{site.telDisplay}}</a> oder E-Mail <a href="mailto:{{site.email}}">{{site.email}}</a>.</p>' +
        '<p>Lieber gleich einen Termin? <a href="{{site.booking}}">Freien Slot für das kostenlose Erstgespräch wählen</a>.</p>',
    )
    // nur DE: kein EN-Eintrag
    expect(page('impressum').locales.en).toBeUndefined()
    fs.rmSync(out, { recursive: true, force: true })
  })

  it('verschiedene Bausteinstruktur in de/en wird abgelehnt', async () => {
    const dir = tmp()
    const block = (variant: string) => ({ blockType: 'text', sectionKey: 's', variant, heading: 'x' })
    fs.writeFileSync(
      path.join(dir, 't.json'),
      JSON.stringify({
        translationKey: 't-shape', slug: 't-shape', slugEn: 't-shape',
        locales: { de: { title: 'a', layout: [block('default')] }, en: { title: 'b', layout: [block('callout')] } },
      }),
    )
    await expect(seedPages(payload, dir)).rejects.toThrow(/variant: de default ≠ en callout/)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
