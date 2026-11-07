// Nunjucks-Filter für Rich-Text-HTML aus dem Inhaltsformat (docs/content-format-v1.md, Abschnitt 4).
// Templates geben Rich-Text mit `| safe` aus. Vorher prüft sanitizeRichText jeden String gegen die
// dokumentierte Teilmenge (Tags, Attribute, jedes <a href> über safeHref) und bricht sonst den Build ab
// — unabhängig davon, welcher Erzeuger die Datei geschrieben hat. Danach setzen die Filter nur die
// Klassen, die das heutige Markup trägt (Task-3-Konventionen), und entfernen Lexical-Artefakte an Listen.
import { safeHref } from "./url.js";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// --- Prüfung der Rich-Text-Teilmenge -------------------------------------------------------------
// Entscheidung: Verstoß = Build-Fehler (nicht still entfernen). Stilles Entfernen würde Inhalt
// verändern, ohne dass es jemand merkt; ein lauter Abbruch zeigt Seite/Feld und den Grund.

const LIST_CLASS = /^list-(?:bullet|number)$/;
/** erlaubte Tags → erlaubte Attribute (Name → Prüfung des Werts). */
const ALLOWED = {
  p: {}, br: {}, strong: {}, em: {}, code: {}, sub: {}, sup: {}, h2: {}, h3: {}, h4: {}, hr: {},
  // Editor-Artefakte, die clean() entfernt (Lexical: <ul class="list-bullet">, <li class="" style="" value="1">)
  ul: { class: LIST_CLASS },
  ol: { class: LIST_CLASS },
  li: { class: /^$/, style: /^$/, value: /^\d+$/ },
  a: { href: "href", rel: /^(?:noopener|noreferrer|nofollow)(?: (?:noopener|noreferrer|nofollow))*$/, target: /^_blank$/ },
};
const VOID = new Set(["br", "hr"]);
/** erlaubte Tags (Doku-Abgleich in test/content-format.test.mjs). */
export const ALLOWED_TAGS = Object.freeze(Object.keys(ALLOWED));
// Tag an Position (sticky): Name, Attribute mit "…" oder '…' (oder ohne Wert), optional "/>"
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/y;
const ATTR = /\s+([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
// In href nur diese Zeichenreferenzen; alles andere (z. B. &sol; &colon;) wird abgelehnt,
// weil der Browser sie anders auflösen könnte als diese Prüfung.
const KNOWN_REF = /&(?:amp|lt|gt|quot|apos|#\d+|#[xX][0-9a-fA-F]+);/g;
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeHref(raw, fail) {
  if (/&/.test(raw.replace(KNOWN_REF, ""))) fail(`Link-Ziel ${JSON.stringify(raw)} enthält eine nicht erlaubte Zeichenreferenz`);
  return raw.replace(KNOWN_REF, (m) => {
    const body = m.slice(1, -1);
    if (body[0] !== "#") return NAMED[body];
    const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    if (!Number.isFinite(cp) || cp > 0x10ffff) fail(`ungültige Zeichenreferenz ${m}`);
    return String.fromCodePoint(cp);
  });
}

/**
 * Prüft einen Rich-Text-String gegen die Teilmenge aus docs/content-format-v1.md (Abschnitt 4) und gibt
 * ihn unverändert zurück. Wirft bei unbekanntem Tag/Attribut, Kommentar/Doctype, nicht als Tag lesbarem
 * "<", Attributwert ohne Anführungszeichen, doppeltem Attribut, <a> ohne href, href außerhalb der
 * Allow-List (nach Auflösen der Zeichenreferenzen) und target="_blank" ohne rel="noopener".
 */
export function sanitizeRichText(html, where = "") {
  if (html == null) return "";
  const s = String(html);
  const fail = (why) => {
    throw new Error(`cms: Rich-Text${where ? ` (${where})` : ""}: ${why}`);
  };
  let i = 0;
  while ((i = s.indexOf("<", i)) !== -1) {
    TAG.lastIndex = i;
    const m = TAG.exec(s);
    if (!m) fail(`kein gültiges Tag an Position ${i}: ${JSON.stringify(s.slice(i, i + 40))} („<“ im Text als &lt; schreiben)`);
    const [whole, closing, rawName, attrText, selfClose] = m;
    const name = rawName.toLowerCase();
    const allowed = ALLOWED[name];
    if (!allowed) fail(`Tag <${name}> ist nicht erlaubt (erlaubt: ${Object.keys(ALLOWED).join(", ")})`);
    if (closing && (attrText.trim() || selfClose)) fail(`schließendes Tag </${name}> mit Attributen`);
    if (closing && VOID.has(name)) fail(`</${name}> ist kein gültiges schließendes Tag`);
    if (selfClose && !VOID.has(name)) fail(`<${name} /> darf nicht selbstschließend sein`);
    const attrs = new Map();
    for (const a of attrText.matchAll(ATTR)) {
      const an = a[1].toLowerCase();
      const val = a[2] ?? a[3];
      if (attrs.has(an)) fail(`Attribut ${an} doppelt an <${name}>`);
      const rule = allowed[an];
      if (!rule) fail(`Attribut ${an} an <${name}> ist nicht erlaubt`);
      if (val === undefined) fail(`Attribut ${an} an <${name}> ohne Wert`);
      if (rule === "href") {
        const href = decodeHref(val, fail);
        try {
          safeHref(href);
        } catch (err) {
          fail(err.message.replace(/^cms: /, ""));
        }
      } else if (!rule.test(val)) fail(`Wert ${JSON.stringify(val)} für ${an} an <${name}> ist nicht erlaubt`);
      attrs.set(an, val);
    }
    if (name === "a" && !closing) {
      if (!attrs.has("href")) fail("<a> ohne href");
      if (attrs.has("target") && !(attrs.get("rel") ?? "").split(" ").includes("noopener")) fail('target="_blank" nur zusammen mit rel="noopener"');
    }
    i += whole.length;
  }
  return s;
}

/** Lexical-Listen-Artefakte: <ul class="list-bullet"> → <ul>, <li class="" style="" value="1"> → <li>. Prüft vorher die Teilmenge. */
export function clean(html) {
  if (html == null) return "";
  return sanitizeRichText(html)
    .replace(/<(ul|ol)\s+class="list-(?:bullet|number)">/g, "<$1>")
    .replace(/<li\s+class=""\s+style=""\s+value="\d+"\s*>/g, "<li>");
}

/** Klasse an jedes öffnende <tag …> hängen (vorhandenes class-Attribut wird ergänzt). */
function addClass(html, tag, cls) {
  if (!cls || cls === "none") return html;
  const re = new RegExp(`<${tag}(\\s[^>]*)?>`, "g");
  return html.replace(re, (_, attrs = "") => {
    if (/\sclass="/.test(attrs)) return `<${tag}${attrs.replace(/\sclass="([^"]*)"/, (m, c) => ` class="${c ? `${c} ` : ""}${esc(cls)}"`)}>`;
    return `<${tag} class="${esc(cls)}"${attrs}>`;
  });
}

/** Rich-Text ohne Zusatzklassen. */
export const rich = (html) => clean(html);

/** jeder <p> bekommt class (claim, lead, card-desc …). */
export const richP = (html, cls) => addClass(clean(html), "p", cls);

/** jede <ul> bekommt listClass (why-points, facts …; "none" = keine). */
export const richUl = (html, cls) => addClass(clean(html), "ul", cls);

/** jeder Inline-Link bekommt class (cards/why: card-link). */
export const richA = (html, cls) => addClass(clean(html), "a", cls);

/** Hinweis: <p class="{noteClass}">, bei noteIcon `<span aria-hidden="true">{icon}</span> ` vorne im ersten Absatz. */
export function richNote(html, cls, icon) {
  let out = addClass(clean(html), "p", cls || "note");
  if (icon) out = out.replace(/<p(\s[^>]*)?>/, (m) => `${m}<span aria-hidden="true">${esc(icon)}</span> `);
  return out;
}

/** buttons.style → class-Attributwert ("" = kein class-Attribut). */
const BUTTON_CLASS = {
  primaryBig: "btn primary big",
  primary: "btn primary",
  ghosted: "btn ghosted",
  devBig: "btn dev big",
  btn: "btn",
  cardLink: "card-link",
  devlink: "devlink",
  plain: "",
};
export function buttonClass(style) {
  const s = style ?? "primary";
  if (!(s in BUTTON_CLASS)) throw new Error(`cms: unbekannter Button-Stil ${JSON.stringify(style)}`);
  return BUTTON_CLASS[s];
}
