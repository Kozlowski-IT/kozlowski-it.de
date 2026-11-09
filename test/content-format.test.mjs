// Inhaltsformat v1 (docs/content-format-v1.md):
//  1. Abdeckung: Felder je Baustein im Katalog (cms/src/blocks) == Felder in der Doku (Typ, lokalisiert, Pflicht, Werte).
//  2. schemaVersion: unbekannte/fehlende Version bricht den Build laut ab (je Datei).
//
// Doku-Format, das dieser Test parst: je Baustein eine Überschrift `### Baustein: <slug>`, darunter
// eine Markdown-Tabelle `| Feld | Typ | lokalisiert | Pflicht | Hinweis |`. Feld in Backticks
// (`cards[].title`); Typ: text|html|enum|image|list|object|bool; lokalisiert/Pflicht: ja|nein;
// bei enum stehen die erlaubten Werte als `wert` in der Hinweis-Spalte nach „Werte:“.
// Der Katalog kommt aus `cms/src/export/describeBlocks.ts` (läuft mit tsx, ohne Datenbank).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { HTML_FIELDS } from "../lib/placeholders.js";
import { ALLOWED_TAGS } from "../lib/richtext.js";
import { REQUIRED_FIELDS, VARIANTS } from "../lib/renderSections.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(ROOT, "test/fixtures/content");
const TMP = process.env.TMPDIR || tmpdir();
const DOC = readFileSync(join(ROOT, "docs/content-format-v1.md"), "utf8");

const TYPE = { text: "text", textarea: "text", richText: "html", select: "enum", upload: "image", array: "list", group: "object", checkbox: "bool" };

/** Doku → { slug: Map(path → {type, localized, required, values}) } */
export function parseDoc(md) {
  const out = {};
  let cur = null;
  for (const line of md.split("\n")) {
    const h = /^### Baustein: (\S+)\s*$/.exec(line);
    if (h) {
      assert.ok(!out[h[1]], `Baustein ${h[1]} doppelt in der Doku`);
      cur = out[h[1]] = new Map();
      continue;
    }
    if (/^#{1,3} /.test(line)) {
      cur = null;
      continue;
    }
    if (!cur || !line.startsWith("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    const f = /^`([^`]+)`$/.exec(cells[0] ?? "");
    if (!f) continue; // Kopf-/Trennzeile
    assert.equal(cells.length, 5, `Tabellenzeile mit ${cells.length} Spalten: ${line}`);
    assert.ok(!cur.has(f[1]), `Feld ${f[1]} doppelt`);
    const w = /Werte: (.*)$/.exec(cells[4]);
    cur.set(f[1], {
      type: cells[1],
      localized: cells[2],
      required: cells[3],
      hint: cells[4],
      values: w ? [...w[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort() : [],
    });
  }
  return out;
}

function catalog() {
  const tsx = join(ROOT, "cms/node_modules/.bin/tsx");
  assert.ok(existsSync(tsx), "cms/node_modules fehlt (cd cms && npm ci) — Katalog nicht lesbar");
  const r = spawnSync(tsx, ["src/export/describeBlocks.ts"], { cwd: join(ROOT, "cms"), encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "--no-deprecation" } });
  assert.equal(r.status, 0, `describeBlocks.ts fehlgeschlagen:\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("Parser: Doku-Tabellenformat wird erkannt (Selbsttest)", () => {
  const d = parseDoc("### Baustein: x\n\n| Feld | Typ | lokalisiert | Pflicht | Hinweis |\n|---|---|---|---|---|\n| `a[].b` | enum | ja | nein | Werte: `y`, `x` |\n\n## Ende\n| `z` | text | ja | ja | |");
  assert.deepEqual([...d.x.keys()], ["a[].b"]);
  assert.deepEqual(d.x.get("a[].b"), { type: "enum", localized: "ja", required: "nein", hint: "Werte: `y`, `x`", values: ["x", "y"] });
});

test("Katalog ist nicht leer und enthält die erwarteten Bausteine", () => {
  const cat = catalog();
  assert.deepEqual(Object.keys(cat).sort(), ["cards", "contactForm", "ctaBar", "faq", "figure", "hero", "steps", "text", "vmwareCalculator"]);
});

test("jedes Feld jedes Bausteins steht in der Doku (und umgekehrt), mit Typ, lokalisiert, Pflicht, Werten", () => {
  const cat = catalog();
  const doc = parseDoc(DOC);
  assert.deepEqual(Object.keys(doc).sort(), Object.keys(cat).sort(), "Bausteinliste Doku vs. Katalog");
  const errors = [];
  for (const [slug, fields] of Object.entries(cat)) {
    const d = doc[slug];
    const names = fields.map((f) => f.path);
    for (const n of names) if (!d.has(n)) errors.push(`${slug}: Feld ${n} fehlt in der Doku`);
    for (const n of d.keys()) if (!names.includes(n)) errors.push(`${slug}: Feld ${n} steht in der Doku, aber nicht im Katalog`);
    for (const f of fields) {
      const row = d.get(f.path);
      if (!row) continue;
      if (row.type !== TYPE[f.type]) errors.push(`${slug}.${f.path}: Typ ${row.type} ≠ ${TYPE[f.type]}`);
      if (row.localized !== (f.localized ? "ja" : "nein")) errors.push(`${slug}.${f.path}: lokalisiert ${row.localized} ≠ ${f.localized ? "ja" : "nein"}`);
      if (row.required !== (f.required ? "ja" : "nein")) errors.push(`${slug}.${f.path}: Pflicht ${row.required} ≠ ${f.required ? "ja" : "nein"}`);
      const want = (f.options ?? []).slice().sort();
      if (JSON.stringify(row.values) !== JSON.stringify(want)) errors.push(`${slug}.${f.path}: Werte ${row.values} ≠ ${want}`);
      if (f.lengthHint && !row.hint.includes(`höchstens ${f.lengthHint} Zeichen`)) errors.push(`${slug}.${f.path}: Längenempfehlung ${f.lengthHint} fehlt im Hinweis`);
    }
  }
  assert.deepEqual(errors, []);
});

test("Renderer kennt jedes Rich-Text-Feld des Katalogs (Platzhalter-Kontext html + Prüfung der Teilmenge)", () => {
  const cat = catalog();
  const want = Object.fromEntries(Object.entries(cat).map(([slug, fs]) => [slug, fs.filter((f) => f.type === "richText").map((f) => f.path).sort()]));
  const have = Object.fromEntries(Object.entries(HTML_FIELDS).map(([slug, ps]) => [slug, ps.slice().sort()]));
  assert.deepEqual(have, want, "lib/placeholders.js HTML_FIELDS ≠ richText-Felder im Katalog");
});

test("Renderer kennt jedes Pflichtfeld des Katalogs (Hinweis am Abschnitt im Entwurf)", () => {
  const cat = catalog();
  const want = Object.fromEntries(Object.entries(cat).map(([slug, fs]) => [slug, fs.filter((f) => f.required).map((f) => f.path).sort()]));
  const have = Object.fromEntries(Object.entries(REQUIRED_FIELDS).map(([slug, ps]) => [slug, ps.slice().sort()]));
  assert.deepEqual(have, want, "lib/renderSections.js REQUIRED_FIELDS ≠ required-Felder im Katalog");
});

test("Renderer kennt die Varianten des Katalogs in derselben Reihenfolge (die erste gilt, wenn der Wert fehlt)", () => {
  const cat = catalog();
  const want = Object.fromEntries(Object.entries(cat).map(([slug, fs]) => [slug, fs.find((f) => f.path === "variant").options]));
  assert.deepEqual(VARIANTS, want, "lib/renderSections.js VARIANTS ≠ variant-Optionen im Katalog");
});

test("Doku-Tabelle der Rich-Text-Teilmenge == Tags, die der Renderer erlaubt", () => {
  const sec = DOC.slice(DOC.indexOf("## 4. Rich-Text"), DOC.indexOf("## 5."));
  const tags = new Set();
  for (const line of sec.split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    for (const m of cells[0].matchAll(/`([a-z0-9]+)`/g)) tags.add(m[1]);
  }
  assert.deepEqual([...tags].sort(), [...ALLOWED_TAGS].sort());
});

test("Doku beschreibt Platzhalter (Syntax, Kontexte, Fehler)", () => {
  for (const s of ["{{site.<schlüssel>}}", "{{site.telDisplay}}", "unbekannter Platzhalter", "safeHref"]) {
    assert.ok(DOC.includes(s), `Doku erwähnt ${s} nicht`);
  }
  assert.ok(!/Platzhalter[^\n]*\*\*nicht\*\* Teil von v1/.test(DOC), "Doku sagt noch, Platzhalter seien nicht Teil von v1");
});

test("Doku nennt jede Datei, das URL-Regelwerk und die Versionsprüfung", () => {
  for (const s of ["pages.json", "site.json", "chrome.json", "media/index.json", "schemaVersion", "unbekannte Inhaltsformat-Version", "publicPath", "javascript:", "/assets/"]) {
    assert.ok(DOC.includes(s), `Doku erwähnt ${s} nicht`);
  }
});

// --- schemaVersion --------------------------------------------------------------------

function build(mutate) {
  const d = mkdtempSync(join(TMP, "fmt-"));
  const out = mkdtempSync(join(TMP, "fmt-out-"));
  cpSync(FIXTURES, d, { recursive: true });
  mutate(d);
  const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${out}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_DIR: d },
    encoding: "utf8",
  });
  rmSync(d, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  return r;
}
const edit = (rel, fn) => (d) => {
  const p = join(d, rel);
  const o = JSON.parse(readFileSync(p, "utf8"));
  fn(o);
  writeFileSync(p, JSON.stringify(o));
};

test("Basislinie: Fixtures (schemaVersion 1) bauen", () => {
  const r = build(() => {});
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
});

for (const file of ["pages.json", "site.json", "chrome.json", "media/index.json"]) {
  test(`${file} mit schemaVersion 2 bricht den Build ab: unbekannte Inhaltsformat-Version 2`, () => {
    const r = build(edit(file, (o) => (o.schemaVersion = 2)));
    assert.notEqual(r.status, 0, "Build hätte scheitern müssen");
    assert.match(r.stdout + r.stderr, /unbekannte Inhaltsformat-Version 2/);
  });
  test(`${file} ohne schemaVersion bricht den Build ab`, () => {
    const r = build(edit(file, (o) => delete o.schemaVersion));
    assert.notEqual(r.status, 0, "Build hätte scheitern müssen");
    assert.match(r.stdout + r.stderr, /unbekannte Inhaltsformat-Version \(fehlt\)/);
  });
}

test("schemaVersion als String \"1\" ist unbekannt", () => {
  const r = build(edit("pages.json", (o) => (o.schemaVersion = "1")));
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /unbekannte Inhaltsformat-Version "1"/);
});

test("altes Format (nacktes Array in pages.json) bricht ab statt still leer zu bauen", () => {
  const r = build((d) => writeFileSync(join(d, "pages.json"), JSON.stringify([])));
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /unbekannte Inhaltsformat-Version/);
});
