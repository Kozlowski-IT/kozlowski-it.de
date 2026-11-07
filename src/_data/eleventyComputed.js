// Global computed data (11ty v3, ESM).
// - lang:       CMS-Seite: cmsPage.lang; sonst (404, robots, sitemap) aus dem Ausgabepfad (/en/… => "en", else "de").
// - strings:    the chrome-string bundle for this page's language (W2 — one source).
// - altLangUrl: URL of the sibling CMS page sharing translationKey in the OTHER language
//               (W3 — robust language pendant, no i18n plugin). Falls back to null.
const pathLang = (filePathStem) => (filePathStem.startsWith("/en/") ? "en" : "de");

const langOf = (data) => data.cmsPage?.lang ?? pathLang(data.page.filePathStem);

export default {
  lang: (data) => langOf(data),

  strings: (data) => data.i18n[langOf(data)],

  altLangUrl: (data) => {
    const key = data.cmsPage?.translationKey;
    if (!key) return null;
    const lang = langOf(data);
    const all = data.collections.all || [];
    // cmsPage ist der Paginierungs-Alias (src/cms-pages.njk) => in collections.all verlässlich vorhanden.
    const match = all.find(
      (item) => item.data.cmsPage?.translationKey === key && item.data.cmsPage?.lang !== lang
    );
    return match ? match.url : null;
  },
};
