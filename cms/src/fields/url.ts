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

export const HREF_MESSAGE = 'Nur /pfad, #anker, http(s)://…, mailto: oder tel: erlaubt'

/** validate für alle Text-Felder mit Link-Ziel: Payload-Standardprüfung (required …) + Allow-List. */
export const validateHref: TextFieldSingleValidation = (value, options) => {
  const base = text(value, options)
  if (base !== true) return base
  if (value == null || value === '') return true
  return isSafeHref(value) ? true : HREF_MESSAGE
}
