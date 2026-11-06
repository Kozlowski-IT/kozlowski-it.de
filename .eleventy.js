import { copyFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { contentDir, loadMedia } from "./lib/content.js";
import { buttonClass, rich, richA, richNote, richP, richUl } from "./lib/richtext.js";

// kozlowski-it.de — Eleventy v3 config (ESM).
// dir.input = "src" is LOAD-BEARING: without it, 11ty would render docs/*.md
// (our plan/design notes) as live pages. Verify: _site/ must contain NO /docs/.
export default function (eleventyConfig) {
  // Static assets ship as-is (CSP-clean: external CSS/JS, fonts, images, PDFs).
  // Paths are project-root-relative; both live OUTSIDE the src/ input tree.
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("avv.pdf");

  // Cache-Busting: haengt einen Content-Hash an eine Asset-URL an
  // (/assets/js/x.js -> /assets/js/x.js?v=ab12cd34). Aendert sich die Datei,
  // aendert sich der Hash -> Browser laedt die neue Version sofort.
  // Bewusst NICHT fuer den Font-Preload (muss URL-gleich zur @font-face bleiben).
  eleventyConfig.addFilter("bust", (url) => {
    try {
      const hash = createHash("sha1")
        .update(readFileSync(url.replace(/^\//, "")))
        .digest("hex")
        .slice(0, 8);
      return `${url}?v=${hash}`;
    } catch {
      return url;
    }
  });

  // CMS-Rich-Text (content/pages.json): Klassen nach Task-3-Konvention, Ausgabe mit | safe.
  eleventyConfig.addFilter("rich", rich);
  eleventyConfig.addFilter("richP", richP);
  eleventyConfig.addFilter("richUl", richUl);
  eleventyConfig.addFilter("richA", richA);
  eleventyConfig.addFilter("richNote", richNote);
  eleventyConfig.addFilter("buttonClass", buttonClass);

  // CMS-Medien: content/media/<file> landet in der Ausgabe unter seinem publicPath
  // (content/media/index.json). publicPath wird vor dem Build erneut geprüft
  // (/assets/-Präfix, kein "..", kein Backslash/NUL) -> sonst bricht der Build ab.
  // Kopiert wird NACH dem Build, damit die CMS-Datei eine gleichnamige Datei aus
  // assets/ (Passthrough) überschreibt: Inhalt aus dem CMS gewinnt.
  // --serve: Export-Ergebnis und Loader beobachten (liegen außerhalb von src/).
  eleventyConfig.addWatchTarget(contentDir());
  eleventyConfig.addWatchTarget("lib/");
  let media = [];
  eleventyConfig.on("eleventy.before", () => {
    media = loadMedia();
  });
  eleventyConfig.on("eleventy.after", ({ directories, dir }) => {
    const out = directories?.output ?? dir.output;
    for (const m of media) {
      const dest = join(out, m.publicPath);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(m.src, dest);
    }
  });

  // Nur für Tests (test/render.test.mjs): LEGACY_PAGES=off baut ausschließlich die
  // CMS-Seiten, damit Fixture-Seiten wie / nicht mit src/index.njk kollidieren.
  // Ohne die Variable bleibt alles wie bisher: doppelte Permalinks brechen den Build ab.
  if (process.env.LEGACY_PAGES === "off") {
    const keep = new Set(["cms-pages.njk", "404.njk", "robots.njk", "sitemap.njk"]);
    for (const sub of ["", "en"]) {
      for (const f of readdirSync(join("src", sub))) {
        if (f.endsWith(".njk") && !keep.has(f)) eleventyConfig.ignores.add(join("src", sub, f));
      }
    }
  }

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
