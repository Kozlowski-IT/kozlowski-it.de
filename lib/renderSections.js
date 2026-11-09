// Rendert einzelne Abschnitte im Speicher aus denselben Nunjucks-Vorlagen wie der Eleventy-Build
// (Editor-Mitte, docs/superpowers/specs/2026-11-09-visueller-editor-design.md: „Eine Darstellung“).
// Ein Abschnitt, der sich nicht rendern lässt, liefert `error`, die übrigen bleiben unberührt.
import { join } from "node:path";
import nunjucks from "nunjucks";
import { BLOCK_TYPES, FRAMES, LANGS, REPO_ROOT } from "./content.js";
import { registerFilters } from "./filters.js";
import { resolveLocale } from "./placeholders.js";

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
    // Lückenhaftes Array: resolveLocale nennt so im Fehlertext den echten Index.
    const only = [];
    only[index] = block;
    const resolved = resolveLocale({ blocks: only }, site, lang).blocks[index];
    return env.render(`blocks/${resolved.blockType}.njk`, { frame, lang, site, strings, block: resolved });
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
