// Global computed data (11ty v3, ESM).
// - lang:       CMS-Seite: cmsPage.lang; sonst aus dem Ausgabepfad (/en/… => "en", else "de").
// - strings:    the chrome-string bundle for this page's language (W2 — one source).
// - altLangUrl: URL of the sibling page sharing translationKey in the OTHER language
//               (W3 — robust language pendant, no i18n plugin). Falls back to null.
//               CMS- und Legacy-Seiten werden gemeinsam durchsucht (Übergang Task 7/8).
const pathLang = (filePathStem) => (filePathStem.startsWith("/en/") ? "en" : "de");

const langOf = (data) => data.cmsPage?.lang ?? pathLang(data.page.filePathStem);
const keyOf = (data) => data.cmsPage?.translationKey ?? data.translationKey;

export default {
  lang: (data) => langOf(data),

  strings: (data) => data.i18n[langOf(data)],

  altLangUrl: (data) => {
    const key = keyOf(data);
    if (!key) return null;
    const lang = langOf(data);
    const all = data.collections.all || [];
    // translationKey is RAW front matter (task W3) / cmsPage (pagination alias) => reliably present here.
    const match = all.find(
      (item) =>
        (item.data.cmsPage?.translationKey ?? item.data.translationKey) === key &&
        (item.data.cmsPage?.lang ?? pathLang(item.page.filePathStem)) !== lang
    );
    return match ? match.url : null;
  },
};
