import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

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
