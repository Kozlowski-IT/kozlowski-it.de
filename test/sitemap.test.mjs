// Sitemap-Reihenfolge: deterministisch nach URL (Schlüssel wie der frühere Quelldatei-Stamm),
// unabhängig von Datei-Zeitstempeln und davon, ob eine Seite aus dem CMS oder einer Vorlage kommt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapKey, sitemapOrder } from "../lib/sitemap.js";

test("Schlüssel: / → index, Verzeichnis-Index → <dir>/index, sonst Pfad ohne Slashes", () => {
  const urls = ["/", "/en/", "/en/about/", "/demos/"];
  assert.deepEqual(urls.map((u) => sitemapKey(u, urls)), ["index", "en/index", "en/about", "demos"]);
});

test("Reihenfolge = Baseline a0dacf4 (alphabetisch nach früherem Quelldatei-Pfad)", () => {
  const expected = [
    "/demos/", "/en/about/", "/en/demos/", "/en/", "/en/it-care/", "/en/projects/", "/en/software/",
    "/", "/it-betreuung/", "/it-infrastrukturanalyse/", "/projekte/", "/software/", "/ueber-mich/",
    "/vmware-ausstieg/",
  ];
  // Eingabe wie im CMS-Übergang: CMS-Seiten (/, /en/) hinten, Rest durcheinander
  const input = [...expected.filter((u) => u !== "/" && u !== "/en/")].reverse().concat(["/", "/en/"]);
  const pages = input.map((url) => ({ url }));
  assert.deepEqual(sitemapOrder(pages).map((p) => p.url), expected);
});

test("Seiten ohne url bleiben erhalten (Filter macht die Vorlage)", () => {
  const pages = [{ url: "/b/" }, { url: false }, { url: "/a/" }];
  assert.equal(sitemapOrder(pages).length, 3);
});
