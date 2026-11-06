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
    {
      // Unterseiten-Leiste (pages.frame = subpage/subpageTabs): Zurück-Link + Tabs Demos/Projekte.
      // tabs[].key = translationKey der Zielseite; der passende Tab wird als aktiv markiert.
      // Bewusst optional (nullable Spalten): Pflichtfelder würden beim Schema-Push NOT-NULL-Spalten
      // in bestehende chrome-Zeilen schreiben (Rückfrage + Datenverlust-Warnung, auch Dev-DB).
      // Der Eleventy-Build bricht ab, wenn eine Unterseite subnav braucht und es fehlt (lib/content.js).
      name: 'subnav',
      type: 'group',
      fields: [
        t('home', false),
        t('tabsAria', false),
        {
          name: 'tabs',
          type: 'array',
          localized: true,
          fields: [t('key', false), t('label', false), t('url', false)],
        },
      ],
    },
  ],
}
