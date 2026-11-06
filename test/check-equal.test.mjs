// Gleichheitstest (Migrations-Gate): scripts/check-equal.mjs <baselineDir> <siteDir> [--only <url>...]
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FX = join(ROOT, "test/fixtures/equal");
const run = (base, site, ...extra) =>
  spawnSync(process.execPath, [join(ROOT, "scripts/check-equal.mjs"), base, site, ...extra], { encoding: "utf8" });
const fx = (n) => join(FX, n);
const out = (r) => r.stdout + r.stderr;

// Kopie von base mit einer einzelnen Änderung an <rel> (String-Ersetzung) -> Verzeichnis
function variant(rel, from, to) {
  const d = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "equal-"));
  cpSync(fx("base"), d, { recursive: true });
  const f = join(d, rel);
  const src = readFileSync(f, "utf8");
  assert.ok(src.includes(from), `Fixture enthält ${from}`);
  writeFileSync(f, src.replace(from, to));
  return d;
}

test("identisch: Exit 0", () => {
  const r = run(fx("base"), fx("base"));
  assert.equal(r.status, 0, out(r));
});

test("nur Whitespace/Attributreihenfolge/Kommentar/?v=-Hash anders: Exit 0", () => {
  const r = run(fx("base"), fx("ws"));
  assert.equal(r.status, 0, out(r));
});

test("ein geändertes Wort: Exit 1, nennt Seite, Selektor, erwartet/ist", () => {
  const r = run(fx("base"), fx("word"));
  assert.equal(r.status, 1);
  const o = out(r);
  assert.match(o, /\/sub\//);
  assert.match(o, /li:nth-of-type\(2\)/);
  assert.match(o, /expected.*Zwei/);
  assert.match(o, /actual.*Drei/);
});

test("fehlende Seite: Exit 1, nennt die Seite", () => {
  const r = run(fx("base"), fx("missing"));
  assert.equal(r.status, 1);
  assert.match(out(r), /fehlt.*\/sub\//);
});

test("zusätzliche Seite im neuen Build: Exit 1", () => {
  const r = run(fx("base"), fx("extra"));
  assert.equal(r.status, 1);
  assert.match(out(r), /zusätzlich.*\/neu\//);
});

test("Attributwert anders: Exit 1", () => {
  const d = variant("index.html", 'id="x"', 'id="y"');
  try {
    const r = run(fx("base"), d);
    assert.equal(r.status, 1);
    assert.match(out(r), /id="x"/);
    assert.match(out(r), /id="y"/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("?v=-Hash entfernt, aber anderer Query-Wert zählt als Unterschied", () => {
  const d = variant("sub/index.html", "/a.css?v=abc12345", "/a.css?w=abc12345");
  try {
    assert.equal(run(fx("base"), d).status, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("Elementreihenfolge anders: Exit 1", () => {
  const d = variant("sub/index.html", "<li>Eins</li><li>Zwei</li>", "<li>Zwei</li><li>Eins</li>");
  try {
    assert.equal(run(fx("base"), d).status, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("Whitespace in <pre> zählt", () => {
  const d = variant("index.html", "  keep\n   me", "  keep\n  me");
  try {
    assert.equal(run(fx("base"), d).status, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("fehlendes Leerzeichen zwischen Inline-Elementen zählt", () => {
  const d = variant("index.html", "Ein <b>Satz</b>", "Ein<b>Satz</b>");
  try {
    assert.equal(run(fx("base"), d).status, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("sitemap.xml wird verglichen (Textänderung -> Exit 1)", () => {
  const d = variant("sitemap.xml", "https://x.de/", "https://y.de/");
  try {
    const r = run(fx("base"), d);
    assert.equal(r.status, 1);
    assert.match(out(r), /sitemap\.xml/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("sitemap.xml im HTML-Layout (Baseline-Bug) wird wie jede Datei verglichen", () => {
  const d = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "equal-"));
  try {
    const page = (t) => `<!doctype html>\n<html lang="de"><head><title></title></head><body><main>${t}</main></body></html>\n`;
    mkdirSync(join(d, "a")); mkdirSync(join(d, "b"));
    writeFileSync(join(d, "a/sitemap.xml"), page("<urlset><url><loc>https://x.de/</loc></url></urlset>"));
    writeFileSync(join(d, "b/sitemap.xml"), page("<urlset><url><loc>https://x.de/</loc></url></urlset>"));
    assert.equal(run(join(d, "a"), join(d, "b")).status, 0);
    writeFileSync(join(d, "b/sitemap.xml"), page("<urlset><url><loc>https://x.de/z</loc></url></urlset>"));
    assert.equal(run(join(d, "a"), join(d, "b")).status, 1);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("--only beschränkt den Vergleich auf die genannten URLs", () => {
  assert.equal(run(fx("base"), fx("word"), "--only", "/").status, 0);
  assert.equal(run(fx("base"), fx("word"), "--only", "/", "/sub/").status, 1);
  assert.equal(run(fx("base"), fx("missing"), "--only", "/").status, 0);
  assert.equal(run(fx("base"), fx("missing"), "--only", "/sub/").status, 1);
});

test("Bedienfehler: fehlendes/leeres Verzeichnis oder unbekannte URL -> Exit 2 (kein falsches Grün)", () => {
  assert.equal(run(fx("base"), join(fx("base"), "gibt-es-nicht")).status, 2);
  const d = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "equal-"));
  try {
    assert.equal(run(d, d).status, 2);
    assert.equal(run(fx("base"), fx("base"), "--only", "/nope/").status, 2);
    assert.equal(run(fx("base")).status, 2);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
