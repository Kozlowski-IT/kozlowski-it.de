// CMS-Seiten aus content/pages.json als flache Liste (eine pro Seite×Sprache),
// paginiert von src/cms-pages.njk. Ohne pages.json (oder leer): keine Seiten.
// Wirft (Build bricht ab) bei ungültigem slug/frame/blockType/publicPath oder doppeltem Permalink.
import { loadPages } from "../../lib/content.js";

export default () => ({ pages: loadPages() });
