// @vitest-environment node
// (jsdom bricht die Upload-Typerkennung von Payload: fileTypeFromBuffer)
import { getPayload, type Payload, ValidationError } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, beforeEach, expect } from 'vitest'
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

describe('Collection media', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('alt ist Pflicht + lokalisiert, publicPath-Default /assets/media/<filename>, WebP-Größen', async () => {
    const sharp = (await import('sharp')).default
    const data = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: '#7c3aed' },
    })
      .png()
      .toBuffer()
    const name = `t-media-${Date.now()}.png`
    const file = { data, mimetype: 'image/png', name, size: data.length }

    const noAlt = await payload.create({ collection: 'media', data: {} as any, file }).catch((e) => e)
    expect(noAlt).toBeInstanceOf(ValidationError)
    expect((noAlt as ValidationError).data.errors.map((e) => e.path)).toEqual(['alt'])

    const m = await payload.create({ collection: 'media', locale: 'de', data: { alt: 'Testbild' }, file })
    try {
      expect(m.publicPath).toBe(`/assets/media/${m.filename}`)
      const sizes = Object.values(m.sizes ?? {}) as any[]
      expect(sizes.length).toBeGreaterThan(0)
      for (const s of sizes.filter((s) => s.filename)) expect(s.mimeType).toBe('image/webp')

      // migriertes Bestandsbild behält seinen Pfad
      const kept = await payload.update({
        collection: 'media',
        id: m.id,
        data: { publicPath: '/assets/img/avatar2.webp' },
      })
      expect(kept.publicPath).toBe('/assets/img/avatar2.webp')

      const en = await payload.findByID({ collection: 'media', id: m.id, locale: 'en' })
      expect(en.alt ?? null).toBeNull()
    } finally {
      await payload.delete({ collection: 'media', id: m.id })
    }
  })
})
