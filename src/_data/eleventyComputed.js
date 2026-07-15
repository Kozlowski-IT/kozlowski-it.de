// Global computed data (11ty v3, ESM).
// - lang:       derived from the output path (/en/… => "en", else "de").
// - strings:    the chrome-string bundle for this page's language (W2 — one source).
// - altLangUrl: URL of the sibling page sharing translationKey in the OTHER language
//               (W3 — robust language pendant, no i18n plugin). Falls back to null.
const isEnglish = (data) => data.page.filePathStem.startsWith("/en/");

export default {
  lang: (data) => (isEnglish(data) ? "en" : "de"),

  strings: (data) => data.i18n[isEnglish(data) ? "en" : "de"],

  altLangUrl: (data) => {
    const key = data.translationKey;
    if (!key) return null;
    const en = isEnglish(data);
    const all = data.collections.all || [];
    // translationKey is RAW front matter (task W3) => reliably present here.
    const match = all.find(
      (item) =>
        item.data.translationKey === key &&
        item.page.filePathStem.startsWith("/en/") !== en
    );
    return match ? match.url : null;
  },
};
