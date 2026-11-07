// Gemeinsame Test-Helfer: Temp-Ordner unter /home/pascal/tmp (bzw. $TMPDIR) und ein
// Fake-Export, der statt Payload die Root-Fixtures (test/fixtures/content) schreibt.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FIXTURES = join(SITE_ROOT, "test/fixtures/content");
const TMP_BASE = process.env.TMPDIR || "/home/pascal/tmp";

export function tempWorkDir(t) {
  mkdirSync(TMP_BASE, { recursive: true });
  const dir = mkdtempSync(join(TMP_BASE, "builder-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Die Root-Fixtures sind eine Teil-Site (Header/Footer verlinken /projekte/, /ueber-mich/,
// /datenschutz/, /avv/). Für einen grünen Link-Check ergänzt der Fake schlichte Seiten dafür.
const stub = (key, de, en) => ({
  translationKey: key,
  bilingual: !!en,
  noindex: false,
  minimalHeader: false,
  structuredData: "none",
  frame: "legal",
  locales: Object.fromEntries(
    [["de", de], ["en", en]]
      .filter(([, slug]) => slug)
      .map(([lang, slug]) => [
        lang,
        {
          slug,
          title: `${slug} · Fixture`,
          blocks: [{ blockType: "text", sectionKey: "legal", variant: "legal", heading: slug, headingLevel: "h1", body: "<p>x</p>" }],
        },
      ]),
  ),
});
const STUBS = [
  stub("projects", "projekte", "projects"),
  stub("about", "ueber-mich", "about"),
  stub("datenschutz", "datenschutz"),
  stub("avv", "avv"),
];

/**
 * Fake für exportContent(payload, {outDir, drafts}) aus Task 4 in der Builder-Signatur
 * exportFn(outDir, {drafts}). `mutate(pages, outDir)` darf pages.json/Medien verändern.
 * Merkt sich Aufrufe in `fn.calls`.
 */
export function fakeExport({ missing = [], mutate } = {}) {
  const fn = async (outDir, opts) => {
    fn.calls.push({ outDir, ...opts });
    rmSync(outDir, { recursive: true, force: true });
    cpSync(FIXTURES, outDir, { recursive: true });
    const pages = [...JSON.parse(readFileSync(join(outDir, "pages.json"), "utf8")), ...STUBS];
    mutate?.(pages, outDir);
    writeFileSync(join(outDir, "pages.json"), JSON.stringify(pages, null, 2));
    return { pages: pages.length, missing };
  };
  fn.calls = [];
  return fn;
}
