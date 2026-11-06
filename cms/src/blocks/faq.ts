import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { ltext, rich } from '../fields/common'

/** Häufige Fragen als <details><summary>. */
export const faq: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  fields: [
    ...sectionFields(),
    variantField(['default']),
    ltext('heading'),
    {
      name: 'items',
      type: 'array',
      fields: [ltext('question', { required: true }), rich('answer', { required: true })],
    },
  ],
}
