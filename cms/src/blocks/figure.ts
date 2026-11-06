import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { ltext, noteFields, rich } from '../fields/common'

/**
 * Bild mit Text.
 * variant: default · beleg (section.lp-beleg: h2, img, p, p.r-hint)
 */
export const figure: Block = {
  slug: 'figure',
  interfaceName: 'FigureBlock',
  fields: [
    ...sectionFields(),
    variantField(['default', 'beleg']),
    ltext('heading'),
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    ltext('alt', { admin: { description: 'Überschreibt media.alt (optional)' } }),
    rich('caption'),
    ...noteFields(),
  ],
}
