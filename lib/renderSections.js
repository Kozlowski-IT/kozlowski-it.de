// Rendert einzelne Abschnitte im Speicher aus denselben Nunjucks-Vorlagen wie der Eleventy-Build
// (Editor-Mitte, docs/superpowers/specs/2026-11-09-visueller-editor-design.md: „Eine Darstellung“).
// Ein Abschnitt, der sich nicht rendern lässt oder dem ein Pflichtfeld fehlt, liefert `error`, die übrigen bleiben unberührt.
import { join } from "node:path";
import nunjucks from "nunjucks";
import { BLOCK_TYPES, FRAMES, LANGS, REPO_ROOT } from "./content.js";
import { registerFilters } from "./filters.js";
import { HTML_FIELDS, resolveLocale } from "./placeholders.js";

const BUTTON_REQUIRED = (base) => [`${base}[].label`, `${base}[].href`];

/**
 * Pflichtfelder je Baustein, Pfad wie in der Doku (`cards[].title`).
 * Muss dem Katalog cms/src/blocks entsprechen — test/content-format.test.mjs prüft das.
 */
export const REQUIRED_FIELDS = {
  hero: ["sectionKey", "h1", "trustPoints[].text", ...BUTTON_REQUIRED("buttons")],
  text: ["sectionKey", ...BUTTON_REQUIRED("buttons")],
  cards: ["sectionKey", "cards[].title", "cards[].chips[].label", ...BUTTON_REQUIRED("cards[].buttons")],
  steps: ["sectionKey", "steps[].title"],
  faq: ["sectionKey", "items[].question", "items[].answer"],
  ctaBar: ["sectionKey", ...BUTTON_REQUIRED("buttons")],
  figure: ["sectionKey", "image"],
  contactForm: ["sectionKey", "hints[].text", "requestType.options[].label", "urgency.options[].label"],
  vmwareCalculator: [
    "sectionKey",
    ...["editions", "tiers", "months", "features"].flatMap((list) => [`${list}[].value`, `${list}[].label`]),
  ],
};

/**
 * Erlaubte Varianten je Baustein. Reihenfolge zählt: Fehlt der Wert, gilt die erste (docs/content-format-v1.md).
 * Muss dem Katalog cms/src/blocks entsprechen — test/content-format.test.mjs prüft das.
 */
export const VARIANTS = {
  hero: ["home", "intro", "landing"],
  text: ["default", "callout", "about", "why", "legal"],
  cards: ["fields", "why", "objections", "explore", "projects", "demos"],
  steps: ["fields"],
  faq: ["default"],
  ctaBar: ["default", "buttonsFirst"],
  figure: ["default", "beleg"],
  contactForm: ["default"],
  vmwareCalculator: ["default"],
};

/** Pflichtfeld gefüllt? Text: nicht nur Leerraum. Rich-Text: ohne Tags noch Inhalt. Bild: hat einen Pfad. */
function isFilled(value, isHtml) {
  if (typeof value !== "string") return typeof value?.publicPath === "string" && value.publicPath !== "";
  const text = isHtml ? value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ") : value;
  return text.trim() !== "";
}

/** Sammelt die leeren Stellen eines Pflichtfelds. Fehlt eine optionale Liste oder Gruppe, gibt es nichts zu prüfen. */
function collectEmpty(node, [key, ...rest], at, isHtml, out) {
  if (key.endsWith("[]")) {
    const name = key.slice(0, -2);
    const rows = node?.[name];
    if (Array.isArray(rows)) rows.forEach((row, i) => collectEmpty(row, rest, `${at}${name}[${i}].`, isHtml, out));
  } else if (rest.length) {
    collectEmpty(node?.[key], rest, `${at}${key}.`, isHtml, out);
  } else if (!isFilled(node?.[key], isHtml)) {
    out.push(`${at}${key}`);
  }
}

/** Wirft mit allen leeren Pflichtfeldern des Abschnitts. */
function assertRequiredFilled(block) {
  const out = [];
  for (const path of REQUIRED_FIELDS[block.blockType]) {
    collectEmpty(block, path.split("."), "", HTML_FIELDS[block.blockType].includes(path), out);
  }
  if (out.length) throw new Error(`Pflichtfeld leer: ${out.join(", ")}`);
}

/** Fehlender Wert: die erste Variante (Doku). Unbekannter Wert: Fehler, die Vorlagen gäben sonst nichts oder das Falsche aus. */
function withVariant(block) {
  const allowed = VARIANTS[block.blockType];
  if (block.variant === undefined || block.variant === null || block.variant === "") return { ...block, variant: allowed[0] };
  if (!allowed.includes(block.variant)) throw new Error(`unbekannte Variante ${JSON.stringify(block.variant)}`);
  return block;
}

/** Nunjucks packt Fehler in „(pfad) [Line …]\n  Error: grund“. Nach außen geht nur der Grund, ohne Serverpfade. */
function reason(err) {
  const last = String(err?.message ?? err).split("\n").pop().trim().replace(/^Error:\s*/, "");
  return last || "Abschnitt lässt sich nicht darstellen";
}

/**
 * @param {{ includesDir?: string }} [options]
 * @returns {{ render(input: { frame: string, lang: "de"|"en", site: object, strings: object, blocks: object[] }):
 *   { sections: Array<{ index: number, html?: string, error?: string }> } }}
 */
export function createRenderer({ includesDir = join(REPO_ROOT, "src/_includes") } = {}) {
  // Gleiche Einstellung wie Eleventy: Autoescape an (Nunjucks-Standard, hier ausdrücklich).
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(includesDir), { autoescape: true });
  registerFilters((name, fn) => env.addFilter(name, fn));
  env.addFilter("bust", (url) => url); // Kein Dateizugriff pro Abschnitt, Bausteine nutzen bust nicht.

  function renderBlock(block, index, { frame, lang, site, strings }) {
    if (!BLOCK_TYPES.includes(block?.blockType)) {
      throw new Error(`unbekannter blockType ${JSON.stringify(block?.blockType)}`);
    }
    // Der Build lässt leere Pflichtfelder durch, der Editor soll sie am Abschnitt zeigen (Review Focus 2).
    // Vor dem Auflösen prüfen: resolveLocale wirft sonst schon beim ersten leeren Link-Ziel.
    assertRequiredFilled(block);
    // Lückenhaftes Array: resolveLocale nennt so im Fehlertext den echten Index.
    const only = [];
    only[index] = withVariant(block);
    const resolved = resolveLocale({ blocks: only }, site, lang).blocks[index];
    assertRequiredFilled(resolved); // Ein Platzhalter kann Leerraum einsetzen.
    const html = env.render(`blocks/${resolved.blockType}.njk`, { frame, lang, site, strings, block: resolved });
    if (!html.trim()) throw new Error("Abschnitt hat noch keinen Inhalt");
    return html;
  }

  return {
    render(input) {
      const { frame, lang, blocks } = input ?? {};
      if (!FRAMES.includes(frame)) throw new Error(`render: unbekannter frame ${JSON.stringify(frame)}`);
      if (!LANGS.includes(lang)) throw new Error(`render: unbekannte lang ${JSON.stringify(lang)}`);
      if (!Array.isArray(blocks)) throw new Error("render: blocks ist kein Array");
      const sections = Array.from(blocks, (block, index) => {
        try {
          return { index, html: renderBlock(block, index, input) };
        } catch (err) {
          return { index, error: reason(err) };
        }
      });
      return { sections };
    },
  };
}
