// Globale Firmendaten (`site.*` in allen Templates).
// Quelle: content/site.json (CMS-Export, Global „site"); fehlt die Datei,
// Fallback auf src/_data/legacy/site.json (bis Task 8).
import { loadSite } from "../../lib/content.js";

export default () => loadSite();
