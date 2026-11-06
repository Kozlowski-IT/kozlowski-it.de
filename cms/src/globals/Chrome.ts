import type { Field, GlobalConfig } from 'payload'

const t = (name: string, required = true): Field => ({
  name,
  type: 'text',
  localized: true,
  required,
})

// Link-Liste: Array selbst lokalisiert, weil die URLs pro Sprache verschieden sind (/ vs. /en/).
const links = (name: string): Field => ({
  name,
  type: 'array',
  localized: true,
  fields: [t('label'), t('url')],
})

export const Chrome: GlobalConfig = {
  slug: 'chrome',
  label: 'Chrome (Navigation, Footer, UI-Texte)',
  access: { read: () => true },
  fields: [
    t('skip'),
    t('home'),
    t('menuOpen'),
    {
      name: 'nav',
      type: 'group',
      fields: [t('aria'), links('items'), t('cta')],
    },
    t('portal'),
    t('themeToggle'),
    {
      name: 'langSwitch',
      type: 'group',
      fields: [t('label'), t('code'), t('aria'), t('fallback')],
    },
    {
      name: 'footer',
      type: 'group',
      fields: [
        t('legalAria'),
        t('copyright'),
        t('location', false),
        t('github'),
        links('legal'),
        t('tagline'),
      ],
    },
  ],
}
