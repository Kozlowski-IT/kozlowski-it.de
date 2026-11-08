// @vitest-environment node
// Der Editor darf nur Formate anbieten, deren Export-HTML die Teilmenge aus lib/richtext.js
// (ALLOWED_TAGS) besteht — sonst bricht der Website-Build beim Veröffentlichen ab.
import { describe, it, expect } from 'vitest'
import config from '@/payload.config'
import { lexicalToHtml } from '@/export/lexicalToHtml'
import { sanitizeRichText, ALLOWED_TAGS } from '../../../lib/richtext.js'

// Feature-Keys aus @payloadcms/richtext-lexical 3.93.0 (features/**/feature.server.js bzw. server/index.js)
const EXPECTED = [
  'bold', 'heading', 'horizontalRule', 'inlineCode', 'italic', 'link', 'orderedList',
  'paragraph', 'subscript', 'superscript', 'unorderedList',
  'toolbarFixed', 'toolbarInline',
]

const text = (t: string, format = 0) => ({
  type: 'text', text: t, format, style: '', mode: 'normal', detail: 0, version: 1,
})
const block = (type: string, children: any[], extra: object = {}) => ({
  type, format: '', indent: 0, version: 1, direction: 'ltr', children, ...extra,
})
const li = (t: string, value: number) => block('listitem', [text(t)], { value })

// dynamisch, damit der Konfigurations-Test auch ohne das Modul läuft (TDD: rot zeigt den Ist-Stand)
const features = async () => (await import('@/lexical/features')).richTextFeatures

describe('Rich-Text-Teilmenge im Editor', () => {
  it('Editor bietet nur Features an, deren HTML in ALLOWED_TAGS liegt', async () => {
    const keys = (await features()).map((f) => f.key).sort()
    expect(keys).toEqual([...EXPECTED].sort())
  })

  it('der Editor der Payload-Konfiguration löst genau diese Features auf', async () => {
    const editor = (await config).editor as any
    const keys = [...editor.editorConfig.resolvedFeatureMap.keys()].sort()
    expect(keys).toEqual([...EXPECTED].sort())
  })

  it('Heading nur h2–h4', async () => {
    const richTextFeatures = await features()
    const heading = richTextFeatures.find((f) => f.key === 'heading') as any
    expect(heading?.serverFeatureProps?.enabledHeadingSizes).toEqual(['h2', 'h3', 'h4'])
  })

  it('Link-Feature trägt das nofollow-Feld', async () => {
    // nach dem Laden der Konfiguration ersetzt Payload props.fields durch die sanitisierten Felder
    await config
    const link = (await features()).find((f) => f.key === 'link') as any
    const fields = link?.serverFeatureProps?.fields
    expect(Array.isArray(fields)).toBe(true)
    const names: string[] = []
    const walk = (fs: any[]) => fs.forEach((f) => (f.name && names.push(f.name), f.fields && walk(f.fields)))
    walk(fields)
    expect(names).toContain('nofollow')
  })

  it('Export eines Dokuments mit jedem erlaubten Format besteht lib/richtext.js', () => {
    // Text-Format-Bits (Lexical): bold 1, italic 2, code 16, subscript 32, superscript 64
    const doc = {
      root: block('root', [
        block('heading', [text('Zwei')], { tag: 'h2' }),
        block('heading', [text('Drei')], { tag: 'h3' }),
        block('heading', [text('Vier')], { tag: 'h4' }),
        block('paragraph', [
          text('fett', 1), text('kursiv', 2), text('code', 16), text('tief', 32), text('hoch', 64),
          text('alles', 1 | 2), { type: 'linebreak', version: 1 },
          block('link', [text('Quelle')], {
            version: 3, fields: { linkType: 'custom', url: 'https://example.com/', newTab: true, nofollow: true },
          }),
        ], { textFormat: 0, textStyle: '' }),
        { type: 'horizontalrule', version: 1 },
        block('list', [li('a', 1), li('b', 2)], { listType: 'bullet', start: 1, tag: 'ul' }),
        block('list', [li('eins', 1), li('zwei', 2)], { listType: 'number', start: 1, tag: 'ol' }),
      ]),
    }
    const html = lexicalToHtml(doc)
    expect(() => sanitizeRichText(html, 'lexicalSubset')).not.toThrow()
    // jedes erlaubte Tag kommt tatsächlich vor (der Export deckt die Teilmenge ab)
    const tags = new Set([...html.matchAll(/<([a-z0-9]+)[\s>/]/g)].map((m) => m[1]))
    expect([...tags].sort()).toEqual([...ALLOWED_TAGS].sort())
  })

  it('Export repariert mehrfach kodierte Platzhalter-Links aus der DB (%7B, %257B, %25257B …), echte URLs bleiben', () => {
    // Bestandsdaten: Payloads Link-Hook hat je Speichern einmal kodiert (Produktion 2026-11-08: %257B…)
    const a = (url: string) =>
      block('link', [text('x')], { version: 3, id: 'n1', fields: { linkType: 'custom', url } })
    const doc = { root: block('root', [block('paragraph', [
      a('%7B%7Bsite.telHref%7D%7D'),
      a('%257B%257Bsite.telHref%257D%257D'),
      a('%25257B%25257Bsite.booking%25257D%25257D'),
      a('https://x.de/%7B%7Bfoo%7D%7D'),
      a('https://x.de/a%2520b'),
    ], { textFormat: 0, textStyle: '' })]) }
    expect(lexicalToHtml(doc)).toBe(
      '<p><a href="{{site.telHref}}">x</a><a href="{{site.telHref}}">x</a><a href="{{site.booking}}">x</a>' +
        '<a href="https://x.de/%7B%7Bfoo%7D%7D">x</a><a href="https://x.de/a%2520b">x</a></p>',
    )
  })
})
