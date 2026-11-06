// Seiten-Daten der CMS-Seiten (src/cms-pages.njk), abgeleitet aus dem Paginierungs-Alias
// cmsPage. Als JS-Computed statt Front-Matter-Strings: Werte bleiben unescaped Rohtext
// (Nunjucks escaped sie genau einmal im Layout) und Booleans bleiben Booleans.
const has = (page, type) => (page?.blocks ?? []).some((b) => b.blockType === type);

export default {
  eleventyComputed: {
    translationKey: (d) => d.cmsPage?.translationKey,
    bilingual: (d) => d.cmsPage?.bilingual,
    title: (d) => d.cmsPage?.title,
    description: (d) => d.cmsPage?.description,
    og: (d) => {
      const p = d.cmsPage;
      if (!p?.og) return undefined;
      return { title: p.og.title ?? p.title, description: p.og.description ?? p.description };
    },
    robots: (d) => (d.cmsPage?.noindex ? "noindex" : undefined),
    minimalHeader: (d) => !!d.cmsPage?.minimalHeader,
    structuredData: (d) => (d.cmsPage?.structuredData === "home" ? "partials/jsonld-home.njk" : undefined),
    contactScript: (d) => has(d.cmsPage, "contactForm"),
    calcScript: (d) => has(d.cmsPage, "vmwareCalculator"),
  },
};
