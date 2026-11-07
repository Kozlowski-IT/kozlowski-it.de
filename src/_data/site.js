// Globale Firmendaten (`site.*` in allen Templates).
// Quelle: content/site.json (CMS-Export, Global „site"); fehlt die Datei, bricht der Build ab.
import { loadSite } from "../../lib/content.js";

export default () => loadSite();
