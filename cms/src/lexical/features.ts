import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineCodeFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  SubscriptFeature,
  SuperscriptFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { FieldAffectingData, FieldHook } from 'payload'
import { isPlaceholderHref, normalizeLinkPlaceholders } from '../fields/url'

/**
 * Payloads `url`-Hook (beforeChange) kodiert jede Nicht-URL mit encodeURIComponent, bei jedem Speichern
 * eines Admin-Link-Knotens erneut (`{{site.telHref}}` → `%7B…` → `%257B…`, Produktion 2026-11-08). Für
 * Platzhalter-Ziele {{site.<schlüssel>}} (Inhaltsformat v1 §9) wird er übersprungen: der Wert wird (auch
 * aus schon kodierten Bestandsdaten) auf die Literalform zurückgeführt und so gespeichert. Alles andere
 * läuft unverändert durch Payloads Hook. Schlüssel und aufgelöstes Ziel prüft der Website-Build.
 */
export function keepPlaceholderUrls(fields: FieldAffectingData[]): FieldAffectingData[] {
  return fields.map((f) => {
    if (!('name' in f) || f.name !== 'url' || f.type !== 'text') return f
    const original: FieldHook[] = f.hooks?.beforeChange ?? []
    const hook: FieldHook = async (args) => {
      const v = typeof args.value === 'string' ? normalizeLinkPlaceholders(args.value) : args.value
      if (isPlaceholderHref(v)) return v
      let value = args.value
      for (const h of original) value = await h({ ...args, value })
      return value
    }
    return { ...f, hooks: { ...f.hooks, beforeChange: [hook] } }
  })
}

/**
 * Editor-Features = genau die Formate, deren Export-HTML die Rich-Text-Teilmenge der Website
 * besteht (lib/richtext.js, ALLOWED: p, br, strong, em, code, sub, sup, h2–h4, hr, ul, ol, li, a).
 * Bewusst explizit statt `defaultFeatures`: Unterstreichen, Durchstreichen, Zitat, Upload,
 * Relationship, Checkliste, Einzug, Ausrichtung und h1/h5/h6 würden beim Veröffentlichen den
 * Website-Build abbrechen. Ein Payload-Update mit neuen Default-Features ändert hier nichts.
 */
export const richTextFeatures = [
  ParagraphFeature(),
  BoldFeature(),
  ItalicFeature(),
  InlineCodeFeature(),
  SubscriptFeature(),
  SuperscriptFeature(),
  HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
  HorizontalRuleFeature(),
  UnorderedListFeature(),
  OrderedListFeature(),
  // rel="nofollow" für Quellen-Links (z. B. Preisquellen auf der Landingpage)
  LinkFeature({
    fields: ({ defaultFields }) => [...keepPlaceholderUrls(defaultFields), { name: 'nofollow', type: 'checkbox' }],
  }),
  FixedToolbarFeature(),
  InlineToolbarFeature(),
]
