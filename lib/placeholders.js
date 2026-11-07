// Platzhalter `{{site.<schlüssel>}}` in Inhalten (docs/content-format-v1.md, Abschnitt 9).
// Kontaktdaten (Telefon, E-Mail, Adresse, Buchungs-URL …) werden einmal im Global `site` gepflegt
// und an jeder Stelle eingesetzt. Aufgelöst wird beim Laden von pages.json (lib/content.js), also
// bevor die Templates rendern. Der Wert wird je Kontext behandelt:
//   text — Ergebnis bleibt Rohtext; das Template maskiert es beim Ausgeben (Autoescape) genau einmal.
//   html — Wert wird HTML-maskiert eingesetzt (auch in Attributen wie href="…"); danach prüft
//          sanitizeRichText das Ergebnis (Tag-Teilmenge, jedes <a href> über safeHref).
//   href — Wert wird eingesetzt, das Ergebnis muss safeHref bestehen.
// Unbekannter Schlüssel, Nicht-String-Wert oder kaputte Syntax → Build-Fehler mit Seite/Feld.
import { safeHref } from "./url.js";
import { sanitizeRichText } from "./richtext.js";

/** Gültiger Platzhalter: {{site.key}} (Leerraum innerhalb der Klammern erlaubt). */
const PLACEHOLDER = /\{\{\s*site\.([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;
/** Sieht aus wie ein Platzhalter (z. B. {{site.foo bar}}, {{ site.}}) — nach Entfernen der gültigen = Syntaxfehler. */
const LOOKS_LIKE = /\{\{\s*site\b/;

export const CONTEXTS = ["text", "html", "href"];

/**
 * Rich-Text-Felder (Typ `html`) je Baustein, Pfad wie in der Doku (`cards[].text`).
 * Muss dem Katalog cms/src/blocks entsprechen — test/content-format.test.mjs prüft das.
 */
export const HTML_FIELDS = {
  hero: ["claim", "note"],
  text: ["lead", "body", "note"],
  cards: ["lead", "cards[].text", "note"],
  steps: ["steps[].text", "note"],
  faq: ["items[].answer"],
  ctaBar: ["text"],
  figure: ["caption", "note"],
  contactForm: ["lead", "note"],
  vmwareCalculator: [],
};

const escHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const at = (where) => (where ? ` (${where})` : "");

/**
 * Platzhalter in `text` auflösen.
 * @param {string} text
 * @param {Record<string,string>} site  Stammdaten (content/site.json → site)
 * @param {{ context?: "text"|"html"|"href", where?: string }} opts
 * @returns {string}
 */
export function resolvePlaceholders(text, site, { context = "text", where = "" } = {}) {
  if (!CONTEXTS.includes(context)) throw new Error(`content: unbekannter Platzhalter-Kontext ${JSON.stringify(context)}`);
  if (typeof text !== "string") return text;
  if (LOOKS_LIKE.test(text.replace(PLACEHOLDER, ""))) {
    throw new Error(`content: ungültiger Platzhalter in ${JSON.stringify(text)}${at(where)} (Form: {{site.<schlüssel>}})`);
  }
  // Ein Durchlauf: eingesetzte Werte werden nicht erneut ausgewertet.
  const out = text.replace(PLACEHOLDER, (_, key) => {
    if (!site || typeof site !== "object" || !Object.hasOwn(site, key)) {
      const known = site && typeof site === "object" ? Object.keys(site).join(", ") : "";
      throw new Error(`content: unbekannter Platzhalter {{site.${key}}}${at(where)} (bekannt: ${known})`);
    }
    const v = site[key];
    if (typeof v !== "string" || !v) throw new Error(`content: Platzhalter {{site.${key}}} ist leer oder kein Text${at(where)}`);
    return context === "html" ? escHtml(v) : v;
  });
  if (context === "href") {
    try {
      return safeHref(out);
    } catch (err) {
      throw new Error(`${err.message}${at(where)}`);
    }
  }
  return out;
}

/** Kontext eines Feldes: html laut HTML_FIELDS, `…href` = href, sonst text. */
export function fieldContext(blockType, path) {
  if (blockType && (HTML_FIELDS[blockType] ?? []).includes(path)) return "html";
  if (path === "href" || path.endsWith(".href")) return "href";
  return "text";
}

/**
 * Eine Fassung (pages.json → locales.<lang>) vorbereiten: alle Textwerte außer `slug` auflösen,
 * Rich-Text-Felder danach mit sanitizeRichText prüfen. Liefert eine neue Fassung (Eingabe bleibt unverändert).
 * `where` = "<translationKey>/<lang>".
 */
export function resolveLocale(loc, site, where) {
  const walk = (node, blockType, path, loc) => {
    if (typeof node === "string") {
      const ctx = fieldContext(blockType, path);
      const v = resolvePlaceholders(node, site, { context: ctx, where: loc });
      return ctx === "html" ? sanitizeRichText(v, loc) : v;
    }
    if (Array.isArray(node)) return node.map((n, i) => walk(n, blockType, `${path}[]`, `${loc}[${i}]`));
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v, blockType, path ? `${path}.${k}` : k, `${loc}.${k}`);
      return out;
    }
    return node;
  };
  const out = {};
  for (const [k, v] of Object.entries(loc ?? {})) {
    if (k === "slug") out[k] = v;
    else if (k === "blocks" && Array.isArray(v)) {
      out.blocks = v.map((b, i) => walk(b, b?.blockType, "", `${where} blocks[${i}]`));
    } else out[k] = walk(v, undefined, k, `${where} ${k}`);
  }
  return out;
}
