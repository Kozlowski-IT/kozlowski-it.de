import type { Field } from 'payload'
import { lengthHint } from './lengthHint'

/** Lokalisierter Text (einzeilig). */
export const ltext = (name: string, extra: Partial<Field> = {}): Field =>
  ({ name, type: 'text', localized: true, ...extra }) as Field

/** Lokalisierter Rich-Text (Lexical) — trägt Inline-Markup (strong, em, Links). */
export const rich = (name: string, extra: Partial<Field> = {}): Field =>
  ({ name, type: 'richText', localized: true, ...extra }) as Field

/** Lokalisierter Rich-Text mit Längenempfehlung (Zähler, nur Warnung). */
export const richHint = (name: string, max: number): Field =>
  ({ name, type: 'richText', localized: true, ...lengthHint(max) }) as Field

/** Button-/Link-Stile, die heute im Markup vorkommen. */
export const BUTTON_STYLES = [
  'primaryBig', // class="btn primary big"
  'primary', //    class="btn primary"
  'ghosted', //    class="btn ghosted"
  'devBig', //     class="btn dev big"
  'btn', //        class="btn"
  'cardLink', //   class="card-link"
  'devlink', //    class="devlink"
  'plain', //      kein class-Attribut
] as const

/** Liste von Buttons/Links (label + Ziel lokalisiert, da URLs je Sprache verschieden). */
export const buttons = (name = 'buttons', maxRows?: number): Field => ({
  name,
  type: 'array',
  ...(maxRows ? { maxRows } : {}),
  fields: [
    {
      type: 'row',
      fields: [
        ltext('label', { required: true, admin: { width: '50%' } } as Partial<Field>),
        ltext('href', { required: true, admin: { width: '50%' } } as Partial<Field>),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'style',
          type: 'select',
          defaultValue: 'primary',
          options: BUTTON_STYLES.map((v) => ({ label: v, value: v })),
          admin: { width: '34%' },
        },
        {
          name: 'icon',
          type: 'text',
          admin: { width: '22%', description: 'Emoji in <span aria-hidden>, optional' },
        },
        { name: 'newTab', type: 'checkbox', admin: { width: '22%' } },
        { name: 'download', type: 'checkbox', admin: { width: '22%' } },
      ],
    },
  ],
})

/** Einzel-Link (z. B. Karte als Ganzes klickbar). */
export const link = (name = 'link'): Field => ({
  name,
  type: 'group',
  fields: [
    {
      type: 'row',
      fields: [
        ltext('href', { admin: { width: '50%' } } as Partial<Field>),
        ltext('label', { admin: { width: '50%', description: 'Sichtbarer Linktext (optional)' } } as Partial<Field>),
      ],
    },
    { name: 'newTab', type: 'checkbox' },
  ],
})

/** Klasse des Hinweis-Absatzes — alle Varianten, die heute vorkommen. */
export const NOTE_CLASSES = [
  'note',
  'callout-note',
  'trust-bar',
  'plain-mail',
  'muted',
  'r-hint',
  'source-note',
] as const

/** Hinweis-Absatz unter dem Inhalt: Rich-Text + Klasse + optionales Emoji-Icon. */
export const noteFields = (): Field[] => [
  rich('note'),
  {
    type: 'row',
    fields: [
      {
        name: 'noteClass',
        type: 'select',
        defaultValue: 'note',
        options: NOTE_CLASSES.map((v) => ({ label: v, value: v })),
        admin: { width: '50%' },
      },
      {
        name: 'noteIcon',
        type: 'text',
        admin: { width: '50%', description: 'Emoji vor dem Hinweis (<span aria-hidden>), optional' },
      },
    ],
  },
]

/** Klasse, die der Renderer an jede <ul> im Rich-Text hängt. */
export const listClassField = (): Field => ({
  name: 'listClass',
  type: 'select',
  defaultValue: 'none',
  options: ['none', 'why-points', 'examples', 'facts', 'excl'].map((v) => ({ label: v, value: v })),
  admin: { description: 'CSS-Klasse für Listen im Rich-Text' },
})
