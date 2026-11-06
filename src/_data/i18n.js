// UI-Texte je Sprache (`i18n.de` / `i18n.en`, über eleventyComputed als `strings`).
// Quelle: content/chrome.json (CMS-Export, Global „chrome": { de, en });
// fehlt die Datei, Fallback auf src/_data/legacy/i18n/{de,en}.json (bis Task 8).
import { loadChrome } from "../../lib/content.js";

export default () => loadChrome();
