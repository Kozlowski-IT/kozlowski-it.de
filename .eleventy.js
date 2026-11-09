import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { contentDir, loadMedia } from "./lib/content.js";
import { registerFilters } from "./lib/filters.js";

// kozlowski-it.de — Eleventy v3 config (ESM).
// dir.input = "src" is LOAD-BEARING: without it, 11ty would render docs/*.md
// (our plan/design notes) as live pages. Verify: _site/ must contain NO /docs/.
export default function (eleventyConfig) {
  // Static assets ship as-is (CSP-clean: external CSS/JS, fonts, images, PDFs).
  // Paths are project-root-relative; both live OUTSIDE the src/ input tree.
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("avv.pdf");

  // Filter (bust, Rich-Text, safeHref, sitemapOrder): lib/filters.js, auch vom Abschnitts-Renderer genutzt.
  registerFilters((name, fn) => eleventyConfig.addFilter(name, fn));

  // CMS-Medien: content/media/<file> landet in der Ausgabe unter seinem publicPath
  // (content/media/index.json). publicPath wird vor dem Build erneut geprüft
  // (lib/content.js: /assets/-Präfix, kein "..", Backslash/NUL, nicht js/css/fonts,
  // Bild-Endung passend zur Datei) -> sonst bricht der Build ab.
  // Kopiert wird NACH dem Build. Liegt am Ziel schon eine Datei (z. B. aus dem
  // assets/-Passthrough), muss sie byte-identisch sein (migrierte Bestandsbilder, R3);
  // sonst Build-Abbruch statt stillem Überschreiben. Ausnahme: Dateien, die dieser
  // Prozess selbst schon platziert hat (--serve, neuer Inhalt am gleichen Pfad).
  // --serve: Export-Ergebnis und Loader beobachten (liegen außerhalb von src/).
  eleventyConfig.addWatchTarget(contentDir());
  eleventyConfig.addWatchTarget("lib/");
  let media = [];
  const placed = new Set();
  eleventyConfig.on("eleventy.before", () => {
    media = loadMedia();
  });
  eleventyConfig.on("eleventy.after", ({ directories, dir }) => {
    const out = directories?.output ?? dir.output;
    for (const m of media) {
      const dest = join(out, m.publicPath);
      if (existsSync(dest) && !placed.has(dest) && !readFileSync(dest).equals(readFileSync(m.src))) {
        throw new Error(`cms: Medien-Ziel ${m.publicPath} existiert schon mit anderem Inhalt (Quelle ${m.file})`);
      }
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(m.src, dest);
      placed.add(dest);
    }
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
