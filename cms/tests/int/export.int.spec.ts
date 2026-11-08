// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest'
import { seedGlobals } from '@/seed/seedGlobals'
import { exportContent } from '@/export/exportContent'

let payload: Payload
const mediaDir = path.resolve(__dirname, '../../media')
const dataDir = path.resolve(__dirname, '../../src/seed/globals')
const json = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'))

const text = (t: string, format = 0, extra: object = {}) => ({
  type: 'text', text: t, format, style: '', mode: 'normal', detail: 0, version: 1, ...extra,
})
const rt = (...children: any[]) => ({
  root: {
    type: 'root', format: '', indent: 0, version: 1, direction: 'ltr',
    children: [
      { type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, textStyle: '', children },
    ],
  },
})
const link = (label: string, fields: object) => ({
  type: 'link', version: 3, direction: 'ltr', format: '', indent: 0, children: [text(label)],
  fields: { linkType: 'custom', ...fields },
})

const png = async (tag: string) => {
  const sharp = (await import('sharp')).default
  const data = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#336699' } }).png().toBuffer()
  return { data, mimetype: 'image/png', name: `t-exp-${tag}-${Date.now()}.png`, size: data.length }
}

let out: string
const run = async (drafts: boolean) => {
  out = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'export-'))
  const res = await exportContent(payload, { outDir: out, drafts })
  return { res, pages: json(path.join(out, 'pages.json')).pages as any[] }
}

const mkPage = async (key: string, over: Record<string, unknown> = {}, h1 = 'Hallo', claim?: any) => {
  const de = await payload.create({
    collection: 'pages', locale: 'de', draft: false,
    data: {
      slug: key, translationKey: key, title: `T-${key}`, slugEn: key, _status: 'published',
      layout: [{ blockType: 'hero', sectionKey: 'hero', variant: 'home', h1, claim: claim ?? rt(text('c')) }],
      ...over,
    } as any,
  })
  return de
}

describe('exportContent', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await seedGlobals(payload, { force: true })
  })
  beforeEach(async () => {
    await payload.delete({ collection: 'pages', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })
  afterAll(async () => {
    await payload.delete({ collection: 'pages', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
    for (const f of fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : [])
      if (f.startsWith('t-exp-')) fs.rmSync(path.join(mediaDir, f))
  })

  it('site.json und chrome.json haben exakt die Form der heutigen Daten', async () => {
    await run(false)
    expect(json(path.join(out, 'site.json'))).toEqual({ schemaVersion: 1, site: json(path.join(dataDir, 'site.json')) })
    expect(json(path.join(out, 'chrome.json'))).toEqual({
      schemaVersion: 1,
      de: json(path.join(dataDir, 'chrome.de.json')),
      en: json(path.join(dataDir, 'chrome.en.json')),
    })
  })

  it('jede Datei trägt schemaVersion: 1 (Inhaltsformat v1)', async () => {
    await run(false)
    for (const f of ['site.json', 'chrome.json', 'pages.json', 'media/index.json'])
      expect(json(path.join(out, f)).schemaVersion, f).toBe(1)
  })

  it('drafts:false exportiert den publizierten Text, drafts:true den Entwurf', async () => {
    const p = await mkPage('k1')
    await payload.update({ collection: 'pages', id: p.id, locale: 'de', draft: true, data: { title: 'Entwurf-Titel' } })
    const pub = await run(false)
    expect(pub.pages[0].locales.de.title).toBe('T-k1')
    const dr = await run(true)
    expect(dr.pages[0].locales.de.title).toBe('Entwurf-Titel')
  })

  it('nie veröffentlichte Seiten fehlen bei drafts:false, sind bei drafts:true da', async () => {
    await mkPage('k2', { _status: 'draft' })
    expect((await run(false)).res.pages).toBe(0)
    expect((await run(true)).res.pages).toBe(1)
  })

  it('leerer EN-Titel / EN-Pflichtfeld bei bilingualer Seite landet in missing', async () => {
    const p = await mkPage('k3')
    const { res } = await run(false)
    expect(res.missing).toContain('k3/en/title')
    expect(res.missing).toContain('k3/en/layout[0].h1')
    expect(res.missing).not.toContain('k3/de/title')
    // EN nachtragen -> verschwindet
    await payload.update({
      collection: 'pages', id: p.id, locale: 'en', draft: false,
      data: { title: 'T-en', layout: [{ id: (p.layout as any)[0].id, blockType: 'hero', sectionKey: 'hero', h1: 'Hello' }] } as any,
    })
    const again = await run(false)
    expect(again.res.missing.filter((m) => m.startsWith('k3/'))).toEqual([])
    expect(again.pages[0].locales.en.title).toBe('T-en')
  })

  it('nicht-bilinguale Seite: nur de, kein missing für en', async () => {
    await mkPage('k4', { bilingual: false })
    const { res, pages } = await run(false)
    expect(res.missing.filter((m) => m.startsWith('k4/'))).toEqual([])
    expect(Object.keys(pages[0].locales)).toEqual(['de'])
    expect(pages[0].bilingual).toBe(false)
  })

  it('Rich-Text kommt als HTML-String an (a &amp; b), Links mit rel/target', async () => {
    await mkPage('k5', {}, 'H', rt(
      text('a & b '),
      text('fett', 1),
      text(' '),
      link('extern', { url: 'https://x.de/?a=1&b=2', newTab: true, nofollow: true }),
      text(' '),
      link('intern', { url: '/foo/' }),
    ))
    const { pages } = await run(false)
    const claim = pages[0].locales.de.blocks[0].claim
    expect(claim).toBe(
      '<p>a &amp; b <strong>fett</strong> ' +
        '<a href="https://x.de/?a=1&amp;b=2" rel="noopener nofollow" target="_blank">extern</a> ' +
        '<a href="/foo/">intern</a></p>',
    )
  })

  it('Link-Ziel mit Platzhalter bleibt {{site.…}} (auch wenn Payload es als %7B%7B…%7D%7D gespeichert hat)', async () => {
    // Payloads Link-Hook (richtext-lexical, beforeChange) kodiert Nicht-URLs mit encodeURIComponent, wenn
    // ein bestehender Link-Knoten gespeichert wird (Admin-Bearbeitung, seed --force). In der Dev-DB steht
    // nach dem Seed z. B. "url": "%7B%7Bsite.telHref%7D%7D". Beide Formen müssen gleich exportiert werden.
    await mkPage('k6', {}, 'H', rt(
      text('Tel. '),
      link('{{site.telDisplay}}', { url: '%7B%7Bsite.telHref%7D%7D' }),
      text(' '),
      link('m', { url: 'mailto:{{site.email}}' }),
      text(' '),
      link('b', { url: '{{site.booking}}' }),
      text(' '),
      link('kein Platzhalter', { url: 'https://x.de/%7B%7Bfoo%7D%7D' }),
    ))
    const { pages } = await run(false)
    expect(pages[0].locales.de.blocks[0].claim).toBe(
      '<p>Tel. <a href="{{site.telHref}}">{{site.telDisplay}}</a> <a href="mailto:{{site.email}}">m</a> <a href="{{site.booking}}">b</a> ' +
        '<a href="https://x.de/%7B%7Bfoo%7D%7D">kein Platzhalter</a></p>',
    )
  })

  it('Platzhalter-Link überlebt mehrfaches Speichern im Admin (keine Doppel-Kodierung %257B…)', async () => {
    // Produktionsfehler 2026-11-08: Impressum im Admin bearbeitet + Autosave → im Entwurf stand
    // "%257B%257Bsite.telHref%257D%257D" (Payloads Link-Hook kodiert bei JEDEM Speichern erneut), der
    // Website-Build brach ab. Nachgestellt wie der Admin: Dokument lesen, unverändert zurückschicken.
    // Im Admin angelegte Link-Knoten tragen eine id (nur dann laufen Payloads Feld-Hooks des Links)
    const body = rt(
      text('Telefon '),
      { ...link('{{site.telDisplay}}', { url: '{{site.telHref}}' }), id: '6aee8ff5aeda5d77dc098b95' },
      text(' '),
      { ...link('unbekannt', { url: '{{site.gibtsNicht}}' }), id: '6aee8ff5aeda5d77dc098b96' },
      // Bestandsdaten (schon zweifach kodiert) werden beim nächsten Speichern repariert
      { ...link('b', { url: '%257B%257Bsite.booking%257D%257D' }), id: '6aee8ff5aeda5d77dc098b97' },
      { ...link('extern', { url: 'https://x.de/a?b=1' }), id: '6aee8ff5aeda5d77dc098b98' },
    )
    const de = await mkPage('k7', {
      layout: [{ blockType: 'text', sectionKey: 'imp', variant: 'legal', body }],
    })
    const urls = (doc: any) => {
      const found: string[] = []
      const walk = (n: any) => (n?.fields?.url !== undefined && found.push(n.fields.url), (n?.children ?? []).forEach(walk))
      walk(doc.layout[0].body.root)
      return found
    }
    for (let i = 0; i < 3; i++) {
      const cur = await payload.findByID({ collection: 'pages', id: de.id, locale: 'de', draft: true, depth: 0 })
      const saved = await payload.update({
        collection: 'pages', id: de.id, locale: 'de', draft: true, autosave: i > 0,
        data: { layout: cur.layout } as any,
      })
      expect(urls(saved), `Speichern ${i + 1}`).toEqual(['{{site.telHref}}', '{{site.gibtsNicht}}', '{{site.booking}}', 'https://x.de/a?b=1'])
    }
    const { pages } = await run(true)
    const html = pages[0].locales.de.blocks[0].body
    expect(html).toContain('<a href="{{site.telHref}}">{{site.telDisplay}}</a>')
    // Website-Build: Platzhalter auflösen + Teilmenge prüfen (lib/placeholders.js → lib/richtext.js)
    const { resolveLocale } = await import('../../../lib/placeholders.js')
    const site = json(path.join(out, 'site.json')).site
    const known = { ...pages[0].locales.de, blocks: [{ ...pages[0].locales.de.blocks[0], body: html.replace('<a href="{{site.gibtsNicht}}">unbekannt</a>', '') }] }
    expect(resolveLocale(known, site, 'k7/de').blocks[0].body).toBe(
      `<p>Telefon <a href="${site.telHref}">${site.telDisplay}</a> <a href="${site.booking}">b</a><a href="https://x.de/a?b=1">extern</a></p>`,
    )
    // unbekannter Schlüssel bricht den Build weiterhin ab
    expect(() => resolveLocale(pages[0].locales.de, site, 'k7/de')).toThrow(/unbekannter Platzhalter \{\{site\.gibtsNicht\}\}/)
  })

  it('Blockform: ohne id/blockName, mit blockType/sectionKey/variant; Seitenfelder', async () => {
    await mkPage('k6', { frame: 'home', noindex: true, minimalHeader: true, structuredData: 'home', ogTitle: 'OG', description: 'D' })
    const { pages } = await run(false)
    const page = pages[0]
    expect(page).toMatchObject({
      translationKey: 'k6', bilingual: true, noindex: true, minimalHeader: true, structuredData: 'home', frame: 'home',
    })
    expect(page.locales.de).toMatchObject({ slug: 'k6', title: 'T-k6', description: 'D', og: { title: 'OG' } })
    const b = page.locales.de.blocks[0]
    expect(b).toMatchObject({ blockType: 'hero', sectionKey: 'hero', variant: 'home', h1: 'Hallo' })
    expect(b).not.toHaveProperty('id')
    expect(b).not.toHaveProperty('blockName')
    expect(JSON.stringify(page)).not.toMatch(/"id"/)
  })

  it('Medien: nur referenzierte Dateien, an publicPath-Schlüssel, Manifest, Waisen bleiben draußen', async () => {
    const used = await payload.create({
      collection: 'media', locale: 'de', data: { alt: 'Porträt', publicPath: '/assets/img/t-exp-used.png' } as any, file: await png('used'),
    })
    await payload.create({ collection: 'media', locale: 'de', data: { alt: 'ungenutzt' } as any, file: await png('unused') })
    fs.writeFileSync(path.join(mediaDir, 't-exp-orphan.png'), 'x') // Datei ohne Media-Dokument
    await mkPage('k7', {
      layout: [{ blockType: 'hero', sectionKey: 'hero', variant: 'home', h1: 'H', photo: used.id }],
    })
    const { res, pages } = await run(false)
    expect(res.missing.filter((m) => m.startsWith('k7/de'))).toEqual([])
    const photo = pages[0].locales.de.blocks[0].photo
    expect(photo).toMatchObject({ publicPath: '/assets/img/t-exp-used.png', file: used.filename, alt: 'Porträt' })
    expect(fs.readdirSync(path.join(out, 'media')).sort()).toEqual([used.filename, 'index.json'].sort())
    expect(fs.readFileSync(path.join(out, 'media', used.filename!)).equals(fs.readFileSync(path.join(mediaDir, used.filename!)))).toBe(true)
    expect(json(path.join(out, 'media/index.json'))).toEqual({
      schemaVersion: 1,
      files: [{ file: used.filename, publicPath: '/assets/img/t-exp-used.png' }],
    })
  })

  it('referenzierte, aber auf der Platte fehlende Mediendatei → missing', async () => {
    const m = await payload.create({ collection: 'media', locale: 'de', data: { alt: 'weg' } as any, file: await png('gone') })
    await mkPage('k8', { layout: [{ blockType: 'hero', sectionKey: 'hero', variant: 'home', h1: 'H', photo: m.id }] })
    fs.rmSync(path.join(mediaDir, m.filename!))
    const { res } = await run(false)
    expect(res.missing).toContain('k8/de/layout[0].photo')
  })
})
