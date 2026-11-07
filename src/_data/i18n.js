// UI-Texte je Sprache (`i18n.de` / `i18n.en`, über eleventyComputed als `strings`).
// Quelle: content/chrome.json (CMS-Export, Global „chrome": { de, en }); fehlt die Datei,
// bricht der Build ab.
import { loadChrome } from "../../lib/content.js";

export default () => loadChrome();
