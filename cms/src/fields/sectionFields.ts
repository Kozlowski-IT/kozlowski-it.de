import type { Field } from 'payload'

/**
 * Pflichtfelder jedes Bausteins.
 * - sectionKey: rendert als `data-section-key`, DE/EN gemeinsam (Paritäts-Check).
 * - anchorId:   rendert als `id` der Section, pro Sprache (z. B. DE `leistungen` / EN `services`).
 */
export const sectionFields = (): Field[] => [
  {
    type: 'row',
    fields: [
      {
        name: 'sectionKey',
        type: 'text',
        required: true,
        admin: { width: '50%', description: 'data-section-key, gilt für DE und EN' },
      },
      {
        name: 'anchorId',
        type: 'text',
        localized: true,
        admin: { width: '50%', description: 'Sprungmarke (id), pro Sprache; leer = keine id' },
      },
    ],
  },
]

/**
 * Markup-Variante eines Bausteins. Die Werte benennen ein bestehendes Markup-Muster
 * der statischen Seite (siehe Mapping-Tabelle im Task-3-Report); der Renderer
 * wählt anhand dieses Werts Wrapper und CSS-Klassen.
 */
export const variantField = (values: string[], defaultValue = values[0]): Field => ({
  name: 'variant',
  type: 'select',
  defaultValue,
  options: values.map((v) => ({ label: v, value: v })),
  admin: { description: 'Markup-Variante (bestimmt Wrapper/Klassen im Template)' },
})
