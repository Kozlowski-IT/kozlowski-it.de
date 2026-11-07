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

let payload: Payload
const repoRoot = path.resolve(__dirname, '../../..')
const pagesDir = path.resolve(__dirname, '../../src/seed/pages')
const seed = JSON.parse(fs.readFileSync(path.join(pagesDir, 'home.json'), 'utf8'))
const publicPaths: string[] = seed.media.map((m: any) => m.publicPath)
const tmp = () => fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'seedpages-'))

const cleanup = async () => {
  await payload.delete({ collection: 'pages', where: { translationKey: { in: ['home', 't-shape'] } } })
  await payload.delete({ collection: 'media', where: { publicPath: { in: publicPaths } } })
}

describe('seedPages (Startseite)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await seedGlobals(payload)
    await cleanup()
  })
  afterAll(async () => {
    await cleanup()
  })

  it('legt home veröffentlicht in de+en an; EN-Update behält DE-Werte der gemeinsamen Zeilen', async () => {
    expect(await seedPages(payload, pagesDir)).toEqual(['home'])
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

  it('ist idempotent (gleiche Seite, keine doppelten Medien)', async () => {
    const before = await payload.find({ collection: 'pages', where: { translationKey: { equals: 'home' } }, depth: 0 })
    await seedPages(payload, pagesDir)
    const after = await payload.find({ collection: 'pages', where: { translationKey: { equals: 'home' } }, depth: 0 })
    expect(after.totalDocs).toBe(1)
    expect(after.docs[0].id).toBe(before.docs[0].id)
    for (const p of publicPaths) {
      const m = await payload.find({ collection: 'media', where: { publicPath: { equals: p } }, depth: 0 })
      expect(m.totalDocs, p).toBe(1)
    }
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

  it('Export: keine fehlenden Pflichtfelder, Rich-Text als HTML', async () => {
    const out = tmp()
    const res = await exportContent(payload, { outDir: out, drafts: false })
    expect(res.missing.filter((m: string) => m.startsWith('home/'))).toEqual([])
    const page = JSON.parse(fs.readFileSync(path.join(out, 'pages.json'), 'utf8')).find(
      (p: any) => p.translationKey === 'home',
    )
    const faq = page.locales.de.blocks.find((b: any) => b.blockType === 'faq')
    expect(faq.items[2].answer).toContain('<em>bevor</em>')
    expect(page.locales.de.blocks[0].claim).toBe(seed.locales.de.layout[0].claim.$html)
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
