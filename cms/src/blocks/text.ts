import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { buttons, listClassField, ltext, noteFields, rich } from '../fields/common'

/**
 * Text-Section. Reihenfolge im Markup: eyebrow, heading, sub, lead, body, note, buttons.
 * variant: default (section ohne Klasse) · callout (div.callout) · about (section.about > div.text)
 *          · why (section.why) · legal (kein section-Wrapper, für Rechtstexte/Danke-Seite)
 */
export const text: Block = {
  slug: 'text',
  interfaceName: 'TextBlock',
  fields: [
    ...sectionFields(),
    variantField(['default', 'callout', 'about', 'why', 'legal']),
    ltext('eyebrow'),
    {
      type: 'row',
      fields: [
        ltext('heading', { admin: { width: '75%' } }),
        {
          name: 'headingLevel',
          type: 'select',
          defaultValue: 'h2',
          options: ['h1', 'h2'].map((v) => ({ label: v, value: v })),
          admin: { width: '25%' },
        },
      ],
    },
    ltext('sub', { admin: { description: 'Unterzeile (p.callout-sub)' } }),
    rich('lead', { admin: { description: 'Absatz/Absätze mit class="lead"' } }),
    rich('body'),
    listClassField(),
    ...noteFields(),
    buttons('buttons'),
  ],
}
