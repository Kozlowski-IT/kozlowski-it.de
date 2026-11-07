// Sitemap-Reihenfolge, deterministisch. Eleventy sortiert collections.all nach Datum
// (= Datei-Zeitstempel) und dann inputPath; alle CMS-Seiten teilen sich eine Vorlage
// (src/cms-pages.njk) und damit Datum + inputPath. Die Reihenfolge hinge sonst von
// Checkout-Zeitstempeln ab. Schlüssel = Stamm der früheren Quelldatei:
// "/" → "index", "/en/" → "en/index" (Verzeichnis mit Unterseiten), "/demos/" → "demos".

/** Sortierschlüssel einer URL; `all` = alle URLs (für die Verzeichnis-Erkennung). */
export function sitemapKey(url, all) {
  const p = String(url).replace(/^\/+|\/+$/g, "");
  if (p === "") return "index";
  const isDir = all.some((u) => typeof u === "string" && u !== url && u.startsWith(`/${p}/`));
  return isDir ? `${p}/index` : p;
}

/** Seiten (Eleventy-Collection-Einträge) nach sitemapKey ihrer url; stabil, ohne url ans Ende. */
export function sitemapOrder(pages) {
  const urls = pages.map((p) => p.url);
  const key = (p) => (typeof p.url === "string" ? sitemapKey(p.url, urls) : "￿");
  return [...pages].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}
