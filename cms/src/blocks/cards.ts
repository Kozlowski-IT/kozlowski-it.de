import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { buttons, link, ltext, noteFields, rich, richHint } from '../fields/common'

/**
 * Karten-Raster.
 * variant: fields (div.fields > article.field) · why (div.why je Karte, Startseite „Leistungen")
 *          · objections (section.lp-einwaende, Karten wie fields) · explore (div.explore > a.explore-card)
 *          · projects (section.projects.standalone > article.project) · demos (section.demo-list > article.demo)
 */
export const cards: Block = {
  slug: 'cards',
  interfaceName: 'CardsBlock',
  fields: [
    ...sectionFields(),
    variantField(['fields', 'why', 'objections', 'explore', 'projects', 'demos']),
    ltext('eyebrow'),
    ltext('heading'),
    rich('lead'),
    {
      name: 'cards',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'icon',
              type: 'select',
              defaultValue: 'none',
              // SVG-Set existiert noch nicht; Optionen kommen mit den Icons.
              options: [{ label: 'kein Icon', value: 'none' }],
              admin: { width: '33%' },
            },
            {
              name: 'accent',
              type: 'select',
              defaultValue: 'none',
              options: ['none', 'infra', 'dev', 'live'].map((v) => ({ label: v, value: v })),
              admin: { width: '33%', description: 'Farbklasse (article.field.dev, eyebrow.infra, tag.infra …)' },
            },
          ],
        },
        // lokalisiert: Diagramme gibt es je Sprache (netzplan-de/-en …)
        { name: 'image', type: 'upload', relationTo: 'media', localized: true },
        ltext('imageAlt', { admin: { description: 'Überschreibt media.alt (optional)' } }),
        ltext('eyebrow'),
        ltext('tag', { admin: { description: 'Etikett (span.tag / span.explore-tag)' } }),
        ltext('title', { required: true }),
        ltext('subtitle', { admin: { description: 'p.demo-sub' } }),
        ltext('badge', { admin: { description: 'span.oss-tag in der Unterzeile' } }),
        richHint('text', 160),
        {
          name: 'chips',
          type: 'array',
          fields: [ltext('label', { required: true })],
        },
        link('link'),
        buttons('buttons'),
      ],
    },
    ...noteFields(),
  ],
}
