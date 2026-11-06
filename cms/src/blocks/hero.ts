import type { Block } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { buttons, ltext, noteFields, richHint } from '../fields/common'

/**
 * Seitenkopf mit <h1>.
 * variant: home (section.hero, Porträt, Trust-Liste) · intro (section.demos-intro der Unterseiten)
 *          · landing (section.lp-hero der Landingpage)
 */
export const hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  fields: [
    ...sectionFields(),
    variantField(['home', 'intro', 'landing']),
    ltext('eyebrow'),
    ltext('h1', { required: true }),
    // jeder Absatz → <p class="claim"> (home) bzw. <p class="lead"> (intro/landing)
    richHint('claim', 220),
    {
      name: 'trustPoints',
      type: 'array',
      fields: [ltext('text', { required: true })],
    },
    buttons('buttons', 2),
    { name: 'photo', type: 'upload', relationTo: 'media', localized: true },
    ltext('photoAlt', { admin: { description: 'Überschreibt media.alt (optional)' } }),
    ...noteFields(),
  ],
}
