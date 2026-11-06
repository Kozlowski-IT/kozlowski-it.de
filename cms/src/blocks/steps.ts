import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { ltext, noteFields, rich } from '../fields/common'

/**
 * Ablauf in Schritten.
 * variant: fields (div.fields > article.field mit p.eyebrow.infra, h3, p.card-desc)
 */
export const steps: Block = {
  slug: 'steps',
  interfaceName: 'StepsBlock',
  fields: [
    ...sectionFields(),
    variantField(['fields']),
    ltext('heading'),
    {
      name: 'steps',
      type: 'array',
      fields: [
        ltext('label', { admin: { description: 'z. B. „1 · Kostenloses Erstgespräch"' } }),
        ltext('title', { required: true }),
        rich('text'),
        ltext('dauer'),
      ],
    },
    ...noteFields(),
  ],
}
