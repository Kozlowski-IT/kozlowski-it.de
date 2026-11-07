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
    fields: ({ defaultFields }) => [...defaultFields, { name: 'nofollow', type: 'checkbox' }],
  }),
  FixedToolbarFeature(),
  InlineToolbarFeature(),
]
