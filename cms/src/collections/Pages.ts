import type { CollectionConfig } from 'payload'
import { blocks } from '../blocks'
import { pagesAfterChange, pagesAfterDelete, pagesBeforeChange } from '../hooks/triggerBuild'
import { previewUrl } from '../lib/previewUrl'

/**
 * Seiten. `layout` ist bewusst NICHT lokalisiert: DE und EN teilen Bausteinliste und
 * Reihenfolge; die Textfelder in den Bausteinen sind lokalisiert. Kein localizeStatus.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'translationKey', '_status', 'updatedAt'],
    // „Vorschau“-Knopf (neuer Tab); die Live-Vorschau steht in payload.config (admin.livePreview)
    preview: (doc, { locale }) => previewUrl(doc as any, locale),
  },
  // Entwurf → Vorschau, Veröffentlichen/Zurückziehen/Löschen → Publish (s. hooks/triggerBuild.ts)
  hooks: {
    beforeChange: [pagesBeforeChange],
    afterChange: [pagesAfterChange],
    afterDelete: [pagesAfterDelete],
  },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
  },
  versions: {
    drafts: { autosave: { interval: 1500 } },
  },
  fields: [
    { name: 'title', type: 'text', localized: true, required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { width: '33%', description: 'DE-Pfad' },
        },
        { name: 'slugEn', type: 'text', admin: { width: '33%', description: 'EN-Pfad (leer bei bilingual = aus)' } },
        {
          name: 'translationKey',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { width: '33%' },
        },
      ],
    },
    { name: 'description', type: 'textarea', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'ogTitle', type: 'text', localized: true, admin: { width: '50%' } },
        { name: 'ogDescription', type: 'textarea', localized: true, admin: { width: '50%' } },
      ],
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks,
    },
    {
      name: 'bilingual',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'aus = nur DE (Impressum, Datenschutz, AVV …)' },
    },
    { name: 'noindex', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'minimalHeader', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'structuredData',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'keine', value: 'none' },
        { label: 'Startseite (JSON-LD)', value: 'home' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'frame',
      type: 'select',
      defaultValue: 'subpage',
      options: [
        { label: 'Startseite (main ohne Klasse, Sections mit div.wrap)', value: 'home' },
        { label: 'Unterseite (main.wrap + Subnav)', value: 'subpage' },
        { label: 'Unterseite mit Tabs Demos/Projekte', value: 'subpageTabs' },
        { label: 'Landingpage (main.wrap.lp)', value: 'landing' },
        { label: 'Rechtstext (main.legal)', value: 'legal' },
        { label: 'Rechtstext mit div.wrap', value: 'legalWrap' },
      ],
      admin: { position: 'sidebar', description: 'Seitenrahmen um die Bausteine' },
    },
  ],
}
