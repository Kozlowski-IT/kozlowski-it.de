import type { Block, Field } from 'payload'
import { sectionFields, variantField } from '../fields/sectionFields'
import { ltext, noteFields, rich } from '../fields/common'

/** Eingabefeld: sichtbares Label + data-label (geht in die Mail). */
const input = (name: string): Field => ({
  name,
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        ltext('label', { admin: { width: '50%' } }),
        ltext('dataLabel', { admin: { width: '50%' } }),
      ],
    },
  ],
})

const options = (name: string): Field => ({
  name,
  type: 'array',
  fields: [ltext('label', { required: true })],
})

/** Kontaktformular (section.contact). Texte im CMS, Logik in assets/js/contact.js. */
export const contactForm: Block = {
  slug: 'contactForm',
  interfaceName: 'ContactFormBlock',
  fields: [
    ...sectionFields(),
    variantField(['default']),
    ltext('eyebrow'),
    ltext('heading'),
    rich('lead'),
    { name: 'hints', type: 'array', fields: [ltext('text', { required: true })] },
    {
      name: 'messages',
      type: 'group',
      fields: [ltext('error'), ltext('fallback'), ltext('copyLabel'), ltext('copiedLabel')],
    },
    input('name'),
    input('email'),
    input('phone'),
    {
      name: 'message',
      type: 'group',
      fields: [ltext('label'), ltext('dataLabel'), ltext('placeholder')],
    },
    ltext('moreSummary'),
    input('company'),
    { name: 'requestType', type: 'group', fields: [ltext('label'), ltext('dataLabel'), options('options')] },
    { name: 'urgency', type: 'group', fields: [ltext('label'), ltext('dataLabel'), options('options')] },
    ltext('formHint'),
    ltext('submit'),
    {
      name: 'booking',
      type: 'group',
      fields: [ltext('or'), ltext('button'), ltext('icon'), ltext('hint')],
    },
    ...noteFields(),
  ],
}
