// Erlaubte Link-Ziele für Inhalte aus dem CMS (gleiche Regel wie cms/src/fields/url.ts).
// Erlaubt: /pfad (nicht //host, kein Backslash), #anker, http(s)://…, mailto:, tel:.
// Alles andere (javascript:, data:, protokoll-relativ, Steuer-/Leerzeichen-Tricks) wird abgelehnt.

/** true, wenn v (getrimmt) ein erlaubtes Link-Ziel ist. */
export function isSafeHref(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  // keine inneren Leer-/Steuerzeichen (java\tscript:), kein Backslash (/\host = protokoll-relativ)
  if (/[\s\u0000-\u001f\u007f\\]/.test(s)) return false;
  if (s.startsWith("//")) return false;
  if (s.startsWith("/") || s.startsWith("#")) return true;
  return /^(https?:\/\/|mailto:|tel:)/i.test(s);
}

/** Nunjucks-Filter: gibt das getrimmte Ziel zurück oder bricht den Build ab. */
export function safeHref(v) {
  if (!isSafeHref(v)) throw new Error(`cms: unerlaubtes Link-Ziel ${JSON.stringify(v)} (erlaubt: /pfad, #anker, http(s)://, mailto:, tel:)`);
  return v.trim();
}
