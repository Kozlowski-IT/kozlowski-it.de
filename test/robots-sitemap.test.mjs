// robots.txt und sitemap.xml müssen ohne HTML-Layout ausgeliefert werden
// (Regression: src/src.11tydata.json setzt layout für alle Vorlagen).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as cheerio from "cheerio";

let out;
before(() => {
  out = mkdtempSync(join(tmpdir(), "rs-site-"));
  execFileSync("node", ["node_modules/@11ty/eleventy/cmd.cjs", `--output=${out}`, "--quiet"], { stdio: "inherit" });
});

test("robots.txt: Klartext, keine HTML-Hülle, Sitemap-Zeile", () => {
  const t = readFileSync(join(out, "robots.txt"), "utf8");
  assert.ok(!/^\s*<!doctype/i.test(t), "beginnt mit doctype");
  assert.ok(!/<html/i.test(t), "enthält <html");
  assert.match(t, /^User-agent: \*$/m);
  assert.match(t, /^Allow: \/$/m);
  assert.match(t, /^Sitemap: https:\/\/kozlowski-it\.de\/sitemap\.xml$/m);
});

test("sitemap.xml: wohlgeformtes XML, urlset mit sitemaps.org-Namespace, 14 URLs", () => {
  const t = readFileSync(join(out, "sitemap.xml"), "utf8");
  assert.ok(t.startsWith("<?xml"), "beginnt nicht mit <?xml");
  assert.ok(!/<html/i.test(t), "enthält <html");
  const $ = cheerio.load(t, { xml: true });
  const root = $.root().children().get(0);
  assert.equal(root.name, "urlset");
  assert.equal(root.attribs.xmlns, "http://www.sitemaps.org/schemas/sitemap/0.9");
  assert.equal($.root().children().length, 1);
  const locs = $("url > loc").map((_, e) => $(e).text()).get();
  const expected = ["/demos/", "/en/about/", "/en/demos/", "/en/", "/en/it-care/", "/en/projects/", "/en/software/",
    "/", "/it-betreuung/", "/it-infrastrukturanalyse/", "/projekte/", "/software/", "/ueber-mich/", "/vmware-ausstieg/"]
    .map((u) => `https://kozlowski-it.de${u}`);
  assert.deepEqual(locs, expected);
});
