// kozlowski-it.de — Eleventy v3 config (ESM).
// dir.input = "src" is LOAD-BEARING: without it, 11ty would render docs/*.md
// (our plan/design notes) as live pages. Verify: _site/ must contain NO /docs/.
export default function (eleventyConfig) {
  // Static assets ship as-is (CSP-clean: external CSS/JS, fonts, images, PDFs).
  // Paths are project-root-relative; both live OUTSIDE the src/ input tree.
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("avv.pdf");

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
