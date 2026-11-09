// Nunjucks-Filter der Seiten. Eine Liste für beide Wege: Eleventy-Build (.eleventy.js)
// und Rendern einzelner Abschnitte im Speicher (lib/renderSections.js).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buttonClass, rich, richA, richNote, richP, richUl } from "./richtext.js";
import { safeHref } from "./url.js";
import { sitemapOrder } from "./sitemap.js";

// Cache-Busting: haengt einen Content-Hash an eine Asset-URL an
// (/assets/js/x.js -> /assets/js/x.js?v=ab12cd34). Aendert sich die Datei,
// aendert sich der Hash -> Browser laedt die neue Version sofort.
// Bewusst NICHT fuer den Font-Preload (muss URL-gleich zur @font-face bleiben).
function bust(url) {
  try {
    const hash = createHash("sha1")
      .update(readFileSync(url.replace(/^\//, "")))
      .digest("hex")
      .slice(0, 8);
    return `${url}?v=${hash}`;
  } catch {
    return url;
  }
}

/** Registriert alle Filter über die übergebene addFilter-Funktion. */
export function registerFilters(addFilter) {
  addFilter("bust", bust);
  // CMS-Rich-Text (content/pages.json): Klassen nach Task-3-Konvention, Ausgabe mit | safe.
  addFilter("rich", rich);
  addFilter("richP", richP);
  addFilter("richUl", richUl);
  addFilter("richA", richA);
  addFilter("richNote", richNote);
  addFilter("buttonClass", buttonClass);
  // Link-Ziele aus Inhalten (CMS/Globals): nur /pfad, #anker, http(s)://, mailto:, tel: — sonst Build-Abbruch.
  addFilter("safeHref", safeHref);
  // Sitemap: feste Reihenfolge nach URL statt Datei-Zeitstempel (CMS-Seiten teilen eine Vorlage).
  addFilter("sitemapOrder", sitemapOrder);
}
