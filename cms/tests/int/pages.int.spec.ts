// @vitest-environment node
// (jsdom bricht die Upload-Typerkennung von Payload: fileTypeFromBuffer)
import { getPayload, type Payload, ValidationError } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import config from '@/payload.config'
import { describe, it, beforeAll, beforeEach, afterAll, expect } from 'vitest'
import type { TextBlock } from '@/payload-types'

type RichText = NonNullable<TextBlock['body']>

// Minimaler Lexical-Rich-Text (ein Absatz)
const rt = (text: string): RichText => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 }],
      },
    ],
  },
})

const plain = (v: any): string =>
  (v?.root?.children ?? [])
    .flatMap((p: any) => p.children ?? [])
    .map((c: any) => c.text ?? '')
    .join('')

let payload: Payload
const errPathsP = (e: unknown) => (e as ValidationError).data.errors.map((x) => x.path)

// Felder ohne Namen (row/collapsible) sind nur Layout → auflösen
const flat = (fields: any[]): any[] =>
  fields.flatMap((f) => (!f.name && Array.isArray(f.fields) ? flat(f.fields) : [f]))

const basePage = (slug: string, translationKey: string) => ({
  slug,
  translationKey,
  title: `Titel ${slug}`,
  _status: 'published' as const,
})

describe('Collection pages', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await payload.delete({ collection: 'pages', where: { id: { exists: true } } })
  })

  it('(a) Layout in de anlegen, en nur Texte → gleiche Reihenfolge + sectionKeys', async () => {
    const created = await payload.create({
      collection: 'pages',
      locale: 'de',
      data: {
        ...basePage('t-a', 'test-a'),
        layout: [
          { blockType: 'hero', sectionKey: 'hero', h1: 'Ihre IT läuft.', claim: rt('Claim DE') },
          {
            blockType: 'text',
            sectionKey: 'sicherheitscheck',
            anchorId: 'sicherheitscheck',
            variant: 'callout',
            heading: 'Der Sicherheitscheck',
            body: rt('Text DE'),
          },
        ],
      },
    })

    const de = created.layout!
    await payload.update({
      collection: 'pages',
      id: created.id,
      locale: 'en',
      data: {
        title: 'Title EN',
        layout: [
          { id: de[0].id, blockType: 'hero', sectionKey: 'hero', h1: 'Your IT runs.', claim: rt('Claim EN') },
          {
            id: de[1].id,
            blockType: 'text',
            sectionKey: 'sicherheitscheck',
            anchorId: 'security-check',
            variant: 'callout',
            heading: 'The security check',
            body: rt('Text EN'),
          },
        ],
      },
    })

    const en = (await payload.find({ collection: 'pages', locale: 'en', where: { slug: { equals: 't-a' } } })).docs[0]
    const deAgain = (await payload.find({ collection: 'pages', locale: 'de', where: { slug: { equals: 't-a' } } }))
      .docs[0]

    const shape = (l: any[]) => l.map((b) => [b.blockType, b.sectionKey])
    expect(shape(en.layout!)).toEqual([
      ['hero', 'hero'],
      ['text', 'sicherheitscheck'],
    ])
    expect(shape(en.layout!)).toEqual(shape(deAgain.layout!))
    expect(en.layout!.map((b) => b.id)).toEqual(deAgain.layout!.map((b) => b.id))

    // en-Texte gesetzt, de-Texte unverändert
    const [enHero, enText] = en.layout as any[]
    const [deHero, deText] = deAgain.layout as any[]
    expect(enHero.h1).toBe('Your IT runs.')
    expect(enText.anchorId).toBe('security-check')
    expect(plain(enText.body)).toBe('Text EN')
    expect(deHero.h1).toBe('Ihre IT läuft.')
    expect(deText.anchorId).toBe('sicherheitscheck')
    expect(plain(deText.body)).toBe('Text DE')
    expect(deAgain.title).toBe('Titel t-a')
    expect(en.title).toBe('Title EN')
  })

  it('(b) zweite Seite mit gleichem slug → ValidationError', async () => {
    await payload.create({ collection: 'pages', data: basePage('t-b', 'test-b1') })
    await expect(
      payload.create({ collection: 'pages', data: basePage('t-b', 'test-b2') }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it.each([
    ['javascript:alert(1)'],
    ['JavaScript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['data:text/html,x'],
    ['//evil.example'],
  ])('Link-Ziel %j in Button bzw. Karten-Link wird abgelehnt', async (bad) => {
    const button = await payload
      .create({
        collection: 'pages', locale: 'de',
        data: { ...basePage('t-href-b', 'test-href-b'), layout: [{ blockType: 'ctaBar', sectionKey: 'cta', buttons: [{ label: 'x', href: bad }] }] },
      })
      .catch((e) => e)
    expect(button).toBeInstanceOf(ValidationError)
    expect(errPathsP(button).some((p: string) => p.endsWith('.href'))).toBe(true)
    const card = await payload
      .create({
        collection: 'pages', locale: 'de',
        data: { ...basePage('t-href-c', 'test-href-c'), layout: [{ blockType: 'cards', sectionKey: 'k', cards: [{ title: 't', link: { href: bad } }] }] },
      })
      .catch((e) => e)
    expect(card).toBeInstanceOf(ValidationError)
    expect(errPathsP(card).some((p: string) => p.endsWith('link.href'))).toBe(true)
  })

  it('erlaubte Link-Ziele speichern (/pfad, #anker, https, mailto, tel)', async () => {
    const hrefs = ['/#kontakt', '#rechner', 'https://cal.kozlowski-it.de/x', 'mailto:pk@kozlowski-it.de', 'tel:+491628213267']
    const doc = await payload.create({
      collection: 'pages', locale: 'de',
      data: { ...basePage('t-href-ok', 'test-href-ok'), layout: [{ blockType: 'text', sectionKey: 's', buttons: hrefs.map((href) => ({ label: 'x', href })) }] },
    })
    expect((doc.layout?.[0] as any).buttons.map((b: any) => b.href)).toEqual(hrefs)
  })

  it('(c) Karten-Text mit 200 Zeichen speichert (lengthHint ist nur Warnung)', async () => {
    const long = 'x'.repeat(200)
    const page = await payload.create({
      collection: 'pages',
      data: {
        ...basePage('t-c', 'test-c'),
        layout: [
          {
            blockType: 'cards',
            sectionKey: 'leistungen',
            variant: 'fields',
            cards: [{ title: 'Karte', text: rt(long) }],
          },
        ],
      },
    })
    const cards = (page.layout![0] as any).cards
    expect(plain(cards[0].text)).toHaveLength(200)

    // die Empfehlung ist im Schema hinterlegt (Admin-Zähler), aber ohne Sperre
    const cardsBlock = payload.config.collections
      .find((c) => c.slug === 'pages')!
      .fields.find((f: any) => f.name === 'layout') as any
    const cardText = cardsBlock.blocks
      .find((b: any) => b.slug === 'cards')
      .fields.find((f: any) => f.name === 'cards')
      .fields.find((f: any) => f.name === 'text')
    expect(cardText.custom?.lengthHint).toBe(160)
    expect(cardText.maxLength).toBeUndefined()
  })

  it('Seiten-Defaults: bilingual=true, structuredData=none', async () => {
    const p = await payload.create({ collection: 'pages', data: basePage('t-d', 'test-d') })
    expect(p.bilingual).toBe(true)
    expect(p.structuredData).toBe('none')
    expect(p.noindex).toBe(false)
  })

  it('jeder Block hat sectionKey (Pflicht) + anchorId (lokalisiert) + variant', () => {
    const layout = payload.config.collections
      .find((c) => c.slug === 'pages')!
      .fields.find((f: any) => f.name === 'layout') as any
    expect(layout.localized).toBeFalsy()
    expect(layout.blocks.map((b: any) => b.slug).sort()).toEqual(
      ['contactForm', 'ctaBar', 'cards', 'faq', 'figure', 'hero', 'steps', 'text', 'vmwareCalculator'].sort(),
    )
    for (const b of layout.blocks) {
      const by = (n: string) => flat(b.fields).find((f: any) => f.name === n)
      expect(by('sectionKey'), b.slug).toMatchObject({ type: 'text', required: true })
      expect(by('sectionKey').localized, b.slug).toBeFalsy()
      expect(by('anchorId'), b.slug).toMatchObject({ type: 'text', localized: true })
      expect(by('variant'), b.slug).toMatchObject({ type: 'select' })
    }
  })
})

// Kleines Bild für Upload-Tests (Format png/webp/jpeg, damit die Endung zu publicPath passt)
const png = async (tag: string, color = '#7c3aed', fmt: 'png' | 'webp' | 'jpeg' = 'png') => {
  const sharp = (await import('sharp')).default
  const data = await sharp({ create: { width: 1200, height: 600, channels: 3, background: color } })
    .toFormat(fmt)
    .toBuffer()
  const ext = fmt === 'jpeg' ? 'jpg' : fmt
  return { data, mimetype: `image/${fmt}`, name: `t-${tag}-${Date.now()}.${ext}`, size: data.length }
}
const fmtOf = (publicPath: unknown): 'png' | 'webp' | 'jpeg' => {
  const e = /\.([a-z]+)$/i.exec(String(publicPath ?? ''))?.[1]?.toLowerCase()
  return e === 'webp' ? 'webp' : e === 'jpg' || e === 'jpeg' ? 'jpeg' : 'png'
}

const errPaths = (e: unknown) => (e as ValidationError).data.errors.map((x) => x.path)

describe('Collection media', () => {
  const created: number[] = []
  const mk = async (data: Record<string, unknown>, tag: string, color?: string) => {
    const m = await payload.create({
      collection: 'media', locale: 'de', data: data as any, file: await png(tag, color, fmtOf(data.publicPath)),
    })
    created.push(m.id)
    return m
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'pages', where: { id: { exists: true } } })
    await payload.delete({ collection: 'media', where: { id: { exists: true } } })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'pages', where: { id: { exists: true } } })
    for (const id of created) await payload.delete({ collection: 'media', id }).catch(() => {})
    // Abgelehnte Uploads hinterlassen Größen-Dateien (Payload schreibt vor der Validierung)
    const dir = path.resolve(__dirname, '../../media')
    if (fs.existsSync(dir))
      for (const f of fs.readdirSync(dir)) if (f.startsWith('t-')) fs.rmSync(path.join(dir, f))
  })

  it('alt ist Pflicht + lokalisiert, publicPath-Default /assets/media/<filename>, WebP-Größen', async () => {
    const noAlt = await payload
      .create({ collection: 'media', data: {} as any, file: await png('noalt') })
      .catch((e) => e)
    expect(noAlt).toBeInstanceOf(ValidationError)
    expect(errPaths(noAlt)).toEqual(['alt'])

    const m = await mk({ alt: 'Testbild' }, 'media')
    expect(m.publicPath).toBe(`/assets/media/${m.filename}`)
    const sizes = Object.values(m.sizes ?? {}) as any[]
    expect(sizes.length).toBeGreaterThan(0)
    for (const s of sizes.filter((s) => s.filename)) expect(s.mimeType).toBe('image/webp')

    // migriertes Bestandsbild behält seinen Pfad (Endung muss zur Datei passen: hier .png)
    const kept = await payload.update({
      collection: 'media',
      id: m.id,
      data: { publicPath: '/assets/img/t-avatar.png' },
    })
    expect(kept.publicPath).toBe('/assets/img/t-avatar.png')

    const en = await payload.findByID({ collection: 'media', id: m.id, locale: 'en' })
    expect(en.alt ?? null).toBeNull()
  })

  it.each([
    ['Traversal', '/assets/../../etc/passwd'],
    ['außerhalb /assets/', '/etc/passwd'],
    ['relativ', 'assets/img/x.png'],
    ['Backslash', '/assets\\img\\x.png'],
    ['NUL', '/assets/img/x\0.png'],
    ['unter /assets/js/', '/assets/js/evil.png'],
    ['unter /assets/css/', '/assets/css/x.png'],
    ['unter /assets/fonts/', '/assets/fonts/x.png'],
    ['JS-Endung', '/assets/js/evil.js'],
    ['keine Bild-Endung (svg)', '/assets/media/x.svg'],
    ['keine Bild-Endung (html)', '/assets/media/x.html'],
  ])('publicPath %s wird abgelehnt', async (_label, publicPath) => {
    const e = await mk({ alt: 'x', publicPath }, 'bad').catch((err) => err)
    expect(e).toBeInstanceOf(ValidationError)
    expect(errPaths(e)).toContain('publicPath')
  })

  it('publicPath-Endung muss zur Datei passen (png hochgeladen, .webp verlangt)', async () => {
    const e = await payload
      .create({ collection: 'media', locale: 'de', data: { alt: 'x', publicPath: '/assets/img/t-mismatch.webp' } as any, file: await png('mismatch') })
      .catch((err) => err)
    expect(e).toBeInstanceOf(ValidationError)
    expect(errPaths(e)).toContain('publicPath')
    // nachträgliches Umbenennen auf andere Endung ebenso
    const m = await mk({ alt: 'ok', publicPath: '/assets/img/t-ok.png' }, 'okpng')
    const e2 = await payload.update({ collection: 'media', id: m.id, data: { publicPath: '/assets/img/t-ok.jpg' } }).catch((err) => err)
    expect(e2).toBeInstanceOf(ValidationError)
  })

  it('SVG-Upload wird abgelehnt (mimeTypes nur jpeg/png/webp/avif)', async () => {
    // harmloses SVG: Payloads eigener SVG-Scan ließe es durch, nur die mimeTypes-Liste lehnt es ab
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')
    const e = await payload
      .create({
        collection: 'media', locale: 'de', data: { alt: 'svg' } as any,
        file: { data: svg, mimetype: 'image/svg+xml', name: `t-evil-${Date.now()}.svg`, size: svg.length },
      })
      .catch((err) => err)
    expect(e).toBeInstanceOf(ValidationError)
    expect(JSON.stringify((e as ValidationError).data)).toMatch(/Invalid MIME type/)
    expect(await payload.count({ collection: 'media', where: { alt: { equals: 'svg' } } }).then((r) => r.totalDocs)).toBe(0)
  })

  it('publicPath ist eindeutig', async () => {
    await mk({ alt: 'a', publicPath: '/assets/img/dup.webp' }, 'dup1')
    const e = await mk({ alt: 'b', publicPath: '/assets/img/dup.webp' }, 'dup2').catch((err) => err)
    expect(e).toBeInstanceOf(ValidationError)
    expect(errPaths(e)).toContain('publicPath')
  })

  it('Bilder in Blöcken sind lokalisiert (cards/hero/figure): DE- und EN-Bild im selben Block', async () => {
    const de = await mk({ alt: 'Netzplan', publicPath: '/assets/img/netzplan-de.jpg' }, 'de', '#111111')
    const en = await mk({ alt: 'Netzplan', publicPath: '/assets/img/netzplan-en.jpg' }, 'en', '#eeeeee')

    const page = await payload.create({
      collection: 'pages',
      locale: 'de',
      data: {
        slug: 't-img',
        translationKey: 'test-img',
        title: 'Bilder',
        _status: 'published',
        layout: [
          { blockType: 'hero', sectionKey: 'hero', h1: 'H', photo: de.id },
          { blockType: 'cards', sectionKey: 'projekte', variant: 'explore', cards: [{ title: 'K', image: de.id }] },
          { blockType: 'figure', sectionKey: 'beleg', image: de.id },
        ],
      },
    })
    const ids = page.layout!.map((b) => b.id)
    const cardId = (page.layout![1] as any).cards[0].id
    await payload.update({
      collection: 'pages',
      id: page.id,
      locale: 'en',
      data: {
        title: 'Images',
        layout: [
          { id: ids[0], blockType: 'hero', sectionKey: 'hero', h1: 'H', photo: en.id },
          {
            id: ids[1],
            blockType: 'cards',
            sectionKey: 'projekte',
            variant: 'explore',
            cards: [{ id: cardId, title: 'C', image: en.id }],
          },
          { id: ids[2], blockType: 'figure', sectionKey: 'beleg', image: en.id },
        ],
      },
    })

    const imgs = async (locale: 'de' | 'en') => {
      const d = await payload.findByID({ collection: 'pages', id: page.id, locale, depth: 1 })
      const [h, c, f] = d.layout as any[]
      return [h.photo?.publicPath, c.cards[0].image?.publicPath, f.image?.publicPath]
    }
    expect(await imgs('de')).toEqual(Array(3).fill('/assets/img/netzplan-de.jpg'))
    expect(await imgs('en')).toEqual(Array(3).fill('/assets/img/netzplan-en.jpg'))
  })
})
