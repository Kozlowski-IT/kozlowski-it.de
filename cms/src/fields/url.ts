import type { TextFieldSingleValidation } from 'payload'
import { text } from 'payload/shared'

/**
 * Erlaubte Link-Ziele (gleiche Regel wie lib/url.js im Eleventy-Build):
 * /pfad (nicht //host, kein Backslash), #anker, http(s)://…, mailto:, tel:.
 * Abgelehnt: javascript:, data:, vbscript:, protokoll-relativ, innere Leer-/Steuerzeichen.
 */
export function isSafeHref(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (!s) return false
  if (/[\s\u0000-\u001f\u007f\\]/.test(s)) return false
  if (s.startsWith('//')) return false
  if (s.startsWith('/') || s.startsWith('#')) return true
  return /^(https?:\/\/|mailto:|tel:)/i.test(s)
}

/** Platzhalter {{site.<schlüssel>}} (Inhaltsformat v1 Abschnitt 9; gleiche Syntax wie lib/placeholders.js). */
const PLACEHOLDER = /\{\{\s*site\.([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g

/**
 * Link-Ziel mit Platzhaltern vorab prüfen: Ein Platzhalter am Anfang steht für eine URL aus dem Global
 * `site` (dort selbst per Allow-List geprüft), einer weiter hinten für einen Textteil. Ob der Schlüssel
 * existiert und das aufgelöste Ziel erlaubt ist, entscheidet der Website-Build endgültig.
 */
export function isSafeHrefWithPlaceholders(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const s = v.trim()
  if (/\{\{\s*site\b/.test(s.replace(PLACEHOLDER, ''))) return false // kaputte Platzhalter-Syntax
  const probe = s.replace(PLACEHOLDER, (_m, _k, offset: number) => (offset === 0 ? 'https://platzhalter.invalid' : 'x'))
  return isSafeHref(probe)
}

export const HREF_MESSAGE = 'Nur /pfad, #anker, http(s)://…, mailto: oder tel: erlaubt'

/** validate für alle Text-Felder mit Link-Ziel: Payload-Standardprüfung (required …) + Allow-List. */
export const validateHref: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options)
  if (base !== true) return base
  if (value == null || value === '') return true
  return isSafeHref(value) ? true : HREF_MESSAGE
}

/**
 * validate für Link-Ziele in Seiteninhalten (Buttons, Karten-Links): wie validateHref, zusätzlich mit
 * Platzhaltern {{site.<schlüssel>}}. Nicht für die Globals site/chrome (dort keine Platzhalter).
 */
export const validateContentHref: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options)
  if (base !== true) return base
  if (value == null || value === '') return true
  return isSafeHrefWithPlaceholders(value) ? true : `${HREF_MESSAGE} (oder Platzhalter wie {{site.booking}})`
}
