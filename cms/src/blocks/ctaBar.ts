import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { buttons, ltext, rich } from '../fields/common'

/**
 * Abschluss-Aufruf (section.end-cta).
 * variant: default (h2, p, div.cta-row.center) · buttonsFirst (cta-row vor dem Text, Landingpage)
 */
export const ctaBar: Block = {
  slug: 'ctaBar',
  interfaceName: 'CtaBarBlock',
  fields: [
    ...sectionFields(),
    variantField(['default', 'buttonsFirst']),
    ltext('heading'),
    rich('text'),
    buttons('buttons', 2),
  ],
}
