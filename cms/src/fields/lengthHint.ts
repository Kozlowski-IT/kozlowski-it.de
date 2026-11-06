/**
 * Längenempfehlung als Feld-Option: Admin-Beschreibung + Live-Zähler (afterInput).
 * Bewusst KEINE Validierung/maxLength — Überschreitung ist nur eine Warnung.
 *
 * Verwendung: `{ name: 'text', type: 'textarea', ...lengthHint(160) }`
 * (das Feld darf dann kein eigenes `admin` mitbringen).
 */
export const lengthHint = (max: number) => ({
  custom: { lengthHint: max },
  admin: {
    description: `Empfehlung: höchstens ${max} Zeichen (nur Hinweis, kein Blocker).`,
    components: {
      afterInput: [
        {
          path: '@/components/LengthHint#LengthHint',
          clientProps: { max },
        },
      ],
    },
  },
})
