// Nunjucks-Filter für Rich-Text-HTML aus dem CMS-Export (Lexical → HTML, Task 4).
// Der Export liefert vertrauenswürdiges HTML; Templates geben es mit `| safe` aus.
// Die Filter setzen nur die Klassen, die das heutige Markup trägt (Task-3-Konventionen),
// und entfernen Lexical-Artefakte an Listen.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Lexical-Listen-Artefakte: <ul class="list-bullet"> → <ul>, <li class="" style="" value="1"> → <li>. */
export function clean(html) {
  if (html == null) return "";
  return String(html)
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
