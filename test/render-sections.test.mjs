// Renderer für einzelne Abschnitte (lib/renderSections.js, Editor Scheibe 1, Task 2).
// Kernaussage: Ein Abschnitt aus createRenderer ist derselbe Abschnitt wie im echten Eleventy-Build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { BLOCK_TYPES, permalinkFor } from "../lib/content.js";
import { registerFilters } from "../lib/filters.js";
import { createRenderer, REQUIRED_FIELDS, VARIANTS } from "../lib/renderSections.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TMP = process.env.TMPDIR || tmpdir();
const FIXTURES = join(ROOT, "test/fixtures/content");
const REAL = join(ROOT, "content");

const norm = (s) => s.replace(/\s+/g, " ").trim();
const json = (dir, file) => JSON.parse(readFileSync(join(dir, file), "utf8"));
const isLegal = (b) => b.blockType === "text" && b.variant === "legal";

function walkHtml(dir) {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walkHtml(full) : e.endsWith(".html") ? [full] : [];
  });
}

/** Baut contentDir mit Eleventy und vergleicht jeden Abschnitt jeder Seite. Liefert die Anzahl verglichener Abschnitte. */
function compareWithBuild(contentDir) {
  const out = mkdtempSync(join(TMP, "render-sections-"));
  try {
    const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${out}`, "--quiet"], {
      cwd: ROOT,
      env: { ...process.env, CONTENT_DIR: contentDir },
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `Eleventy-Build fehlgeschlagen:\n${r.stdout}\n${r.stderr}`);

    const site = json(contentDir, "site.json").site;
    const chrome = json(contentDir, "chrome.json");
    const renderer = createRenderer();
    let compared = 0;

    for (const page of json(contentDir, "pages.json").pages) {
      for (const lang of page.bilingual !== false ? ["de", "en"] : ["de"]) {
        const loc = page.locales?.[lang];
        if (!loc?.slug) continue;
        const where = `${page.translationKey}/${lang}`;
        const raw = readFileSync(join(out, permalinkFor(lang, loc.slug), "index.html"), "utf8");
        const $ = cheerio.load(raw);
        const blocks = loc.blocks ?? [];
        const { sections } = renderer.render({ frame: page.frame ?? "subpage", lang, site, strings: chrome[lang], blocks });
        assert.equal(sections.length, blocks.length, `${where}: Anzahl Ergebnisse`);

        const built = $("[data-section-key]").toArray();
        assert.equal(built.length, blocks.filter((b) => !isLegal(b)).length, `${where}: Anzahl Abschnitte im Build`);

        let k = 0;
        sections.forEach((s, i) => {
          const at = `${where} blocks[${i}] (${blocks[i].blockType}/${blocks[i].variant ?? "-"})`;
          assert.equal(s.index, i, `${at}: index`);
          assert.equal(s.error, undefined, `${at}: Renderfehler`);
          // Roh-Vergleich: Bytes der Ausgabe, nur Whitespace normalisiert.
          assert.ok(norm(raw).includes(norm(s.html)), `${at}: HTML steht so nicht im Build`);
          if (isLegal(blocks[i])) return;
          // Struktur-Vergleich: exakt dieses Element, in Dokumentreihenfolge (fängt abgeschnittene Ausgabe ab).
          const el = built[k++];
          assert.equal($(el).attr("data-section-key"), blocks[i].sectionKey, `${at}: Reihenfolge`);
          assert.equal(norm(cheerio.load(s.html, null, false).html()), norm($.html(el)), `${at}: Abschnitt weicht ab`);
          compared++;
        });
      }
    }

    // Gegenprobe gegen die Ausgabe: Kein Abschnitt des Builds blieb unverglichen.
    const allBuilt = walkHtml(out).reduce((n, f) => n + cheerio.load(readFileSync(f, "utf8"))("[data-section-key]").length, 0);
    assert.equal(compared, allBuilt, "verglichene Abschnitte = Abschnitte in der Ausgabe");
    return compared;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

test("render liefert fuer jeden Abschnitt das HTML des Builds (Fixtures)", () => {
  // 27 Blöcke in den Fixtures, davon 1 Rechtstext ohne Schlüssel.
  assert.equal(compareWithBuild(FIXTURES), 26);
});

// content/ ist CMS-Export und nicht eingecheckt, die Anzahl ändert sich mit jedem Export.
// Deshalb hier die Gegenprobe gegen die Ausgabe statt einer festen Zahl.
test("render liefert fuer jeden Abschnitt das HTML des Builds (echter Export)", { skip: !existsSync(join(REAL, "pages.json")) && "content/ fehlt" }, () => {
  assert.ok(compareWithBuild(REAL) > 0);
});

// --- Fehler bleiben beim Abschnitt -----------------------------------------------------------------

const site = { phone: "+491", booking: "https://cal.example/x" };
const base = { frame: "home", lang: "de", site, strings: {} };
const hero = (over = {}) => ({ blockType: "hero", variant: "intro", sectionKey: "k", h1: "Titel", ...over });
const render = (blocks, input = {}) => createRenderer().render({ ...base, ...input, blocks }).sections;

function onlyBroken(sections, index) {
  sections.forEach((s, i) => {
    assert.equal(s.index, i);
    if (i === index) {
      assert.equal(typeof s.error, "string", "error gesetzt");
      assert.ok(s.error.length > 0, "error nicht leer");
      assert.equal(s.html, undefined, "kein html neben error");
    } else {
      assert.equal(s.error, undefined, `Abschnitt ${i} ohne error: ${s.error}`);
      assert.match(s.html, /<section/, `Abschnitt ${i} hat html`);
    }
  });
}

test("unbekannter Typ gibt error nur an diesem Index", () => {
  onlyBroken(render([hero(), { blockType: "gibtsnicht" }, hero()]), 1);
});

test("blockType kann keine anderen Vorlagen laden", () => {
  for (const blockType of ["_macros", "../layouts/base", "../../../package", "constructor", "__proto__", "", 7, null]) {
    onlyBroken(render([hero(), { blockType }, hero()]), 1);
  }
});

test("Eintraege ohne Objekt-Form geben error nur an diesem Index", () => {
  for (const broken of [null, undefined, "hero", 1, []]) onlyBroken(render([hero(), broken, hero()]), 1);
});

test("Filter-Fehler bleiben beim Abschnitt: ungueltiges Link-Ziel und unbekannter Button-Stil", () => {
  const bad = hero({ buttons: [{ label: "x", href: "javascript:alert(1)", style: "primary" }] });
  onlyBroken(render([hero(), bad, hero()]), 1);
  const noHref = hero({ buttons: [{ label: "x", style: "primary" }] });
  onlyBroken(render([noHref, hero()]), 0);
  const badStyle = hero({ buttons: [{ label: "x", href: "/a", style: "gibtsnicht" }] });
  onlyBroken(render([hero(), badStyle]), 1);
});

// Baut einen Abschnitt, in dem genau die Pflichtfelder gefüllt sind (Listen mit einer Zeile).
// Jedes Feld bekommt einen eigenen Wert `w<n>w`, damit sich prüfen lässt, ob er in der Ausgabe ankommt.
function filledBlock(blockType, paths = REQUIRED_FIELDS[blockType]) {
  const block = { blockType };
  for (const [i, path] of paths.entries()) {
    const keys = path.split(".");
    const last = keys.pop();
    const value = `w${i}w`;
    let node = block;
    for (const key of keys) {
      if (key.endsWith("[]")) {
        const name = key.slice(0, -2);
        node[name] ??= [{}];
        node = node[name][0];
      } else {
        node = node[key] ??= {};
      }
    }
    node[last] = last === "image" ? { publicPath: `/assets/${value}.png`, alt: "" } : last === "href" ? `/${value}` : last === "answer" ? `<p>${value}</p>` : value;
  }
  return block;
}

/** Pflichtfeld `path` in `block` (Pfad wie im Katalog, Listen: erste Zeile) auf `value` setzen. */
function setPath(block, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const node = keys.reduce((n, key) => (key.endsWith("[]") ? n[key.slice(0, -2)][0] : n[key]), block);
  node[last] = value;
}

const ALL_REQUIRED = BLOCK_TYPES.flatMap((blockType) => REQUIRED_FIELDS[blockType].map((path) => [blockType, path]));

test("Pflichtfeld-Liste deckt alle Bausteintypen ab und ist nicht leer", () => {
  assert.deepEqual(Object.keys(REQUIRED_FIELDS).sort(), BLOCK_TYPES.slice().sort());
  assert.ok(ALL_REQUIRED.length >= BLOCK_TYPES.length);
});

test("Entwurf mit nur blockType: jeder Bausteintyp liefert error, nie einen Abbruch", () => {
  const sections = render(BLOCK_TYPES.map((blockType) => ({ blockType })));
  assert.equal(sections.length, BLOCK_TYPES.length);
  for (const s of sections) {
    assert.equal(s.html, undefined, `${BLOCK_TYPES[s.index]}: kein html`);
    assert.match(s.error, /sectionKey/, `${BLOCK_TYPES[s.index]}: Hinweis nennt das Feld`);
  }
});

// Die erste cards-Variante zeigt Chips und Buttons nicht, die Variante demos zeigt alle Pflichtfelder.
const variantShowing = (blockType, path) => (blockType === "cards" && /^cards\[\]\.(chips|buttons)/.test(path) ? "demos" : undefined);

test("alle Pflichtfelder gefuellt: jeder Bausteintyp liefert html ohne error, jeder Wert kommt an", () => {
  for (const blockType of BLOCK_TYPES) {
    REQUIRED_FIELDS[blockType].forEach((path, i) => {
      const [s] = render([{ ...filledBlock(blockType), variant: variantShowing(blockType, path) }]);
      assert.equal(s.error, undefined, `${blockType}: ${s.error}`);
      assert.match(s.html, /<section/, blockType);
      assert.ok(s.html.includes(`w${i}w`), `${blockType}.${path} fehlt in der Ausgabe`);
    });
  }
});

test("fehlt die Variante, gilt die erste der Liste", () => {
  for (const blockType of BLOCK_TYPES) {
    const block = filledBlock(blockType);
    const [first] = render([{ ...block, variant: VARIANTS[blockType][0] }]);
    assert.equal(first.error, undefined, `${blockType}: ${first.error}`);
    for (const variant of [undefined, null, ""]) {
      const [s] = render([{ ...block, variant }]);
      assert.equal(s.html, first.html, `${blockType} mit variant ${JSON.stringify(variant)}`);
    }
  }
  assert.match(render([hero({ variant: undefined })])[0].html, /<section class="hero"/);
});

test("unbekannte Variante gibt error nur an diesem Index, jede bekannte rendert", () => {
  for (const blockType of BLOCK_TYPES) {
    const block = filledBlock(blockType);
    for (const variant of ["gibtsnicht", "constructor", 7]) {
      const sections = render([hero(), { ...block, variant }, hero()]);
      onlyBroken(sections, 1);
      assert.match(sections[1].error, /Variante/, blockType);
    }
    // body für text/legal, link für cards/explore: Diese Varianten brauchen die sonst optionalen Felder.
    if (blockType === "cards") block.cards[0].link = { href: "/a" };
    for (const variant of VARIANTS[blockType]) {
      assert.equal(render([{ ...block, body: "<p>x</p>", variant }])[0].error, undefined, `${blockType}/${variant}`);
    }
  }
});

test("optionale Listen und Gruppen duerfen im Entwurf fehlen oder leer sein", () => {
  for (const blockType of BLOCK_TYPES) {
    const top = REQUIRED_FIELDS[blockType].filter((p) => !p.includes("."));
    const [s] = render([filledBlock(blockType, top)]);
    assert.equal(s.error, undefined, `${blockType}: ${s.error}`);
    assert.match(s.html, /<section[^>]* data-section-key="w0w"/, blockType);
  }
  assert.equal(render([hero({ buttons: [], trustPoints: [] })])[0].error, undefined);
});

for (const [blockType, path] of ALL_REQUIRED) {
  test(`leeres Pflichtfeld ${blockType}.${path} gibt error nur an diesem Index`, () => {
    for (const empty of [undefined, null, "", "   "]) {
      const block = filledBlock(blockType);
      setPath(block, path, empty);
      const sections = render([hero(), block, hero()]);
      onlyBroken(sections, 1);
      const shown = path.replaceAll("[]", "[0]");
      // Nur „Pflichtfeld leer“ zählt: Der Pfad steht sonst auch im Ortszusatz anderer Fehlermeldungen.
      assert.ok(sections[1].error.startsWith("Pflichtfeld leer: "), `${JSON.stringify(empty)}: ${sections[1].error}`);
      assert.ok(sections[1].error.includes(shown), `${JSON.stringify(empty)}: Hinweis nennt ${shown}: ${sections[1].error}`);
    }
  });
}

test("leere Rich-Text-Pflichtfelder zaehlen als leer, Text mit Spitzklammern nicht", () => {
  for (const answer of ["<p></p>", "<p> &nbsp; </p>", "<p><br /></p>"]) {
    const sections = render([filledBlock("faq"), { ...filledBlock("faq"), items: [{ question: "q", answer }] }]);
    onlyBroken(sections, 1);
    assert.match(sections[1].error, /items\[0\]\.answer/);
  }
  assert.equal(render([hero({ h1: "<b>" })])[0].error, undefined, "h1 ist reiner Text");
});

test("kaputte Zeilen und Bilder ohne Pfad gelten als leer", () => {
  onlyBroken(render([hero(), { ...filledBlock("faq"), items: [null] }]), 1);
  for (const image of [{}, { alt: "A" }, { publicPath: "" }, 42]) {
    onlyBroken(render([hero(), { ...filledBlock("figure"), image }]), 1);
  }
});

test("Hinweis nennt alle leeren Pflichtfelder und die richtige Zeile", () => {
  const block = { blockType: "faq", items: [{ question: "q", answer: "<p>a</p>" }, { question: "", answer: "<p>a</p>" }] };
  const [s] = render([block]);
  assert.match(s.error, /sectionKey/);
  assert.match(s.error, /items\[1\]\.question/);
  assert.doesNotMatch(s.error, /items\[0\]/);
});

test("leeres Link-Ziel erscheint im Pflichtfeld-Hinweis zusammen mit den anderen leeren Feldern", () => {
  const [s] = render([hero({ h1: "", buttons: [{ label: "x", href: "", style: "primary" }] })]);
  assert.equal(s.error, "Pflichtfeld leer: h1, buttons[0].href");
});

test("Platzhalter, der nur Leerraum einsetzt, zaehlt als leeres Pflichtfeld", () => {
  const [s] = render([hero({ h1: "{{site.blank}}" })], { site: { ...site, blank: " " } });
  assert.equal(s.error, "Pflichtfeld leer: h1");
});

test("Abschnitt, dessen Vorlage nichts ausgibt, gibt error statt leerem html", () => {
  const legal = { blockType: "text", variant: "legal", sectionKey: "legal" };
  onlyBroken(render([hero(), legal, hero()]), 1);
  const filled = { ...legal, body: "<p>x</p>" };
  const [s] = render([filled]);
  assert.equal(s.error, undefined);
  assert.match(s.html, /<p>x<\/p>/);
});

test("unbekannter Platzhalter gibt error nur an diesem Index, mit echtem Index im Text", () => {
  const sections = render([hero(), hero(), hero({ h1: "{{site.gibtsnicht}}" })]);
  onlyBroken(sections, 2);
  assert.match(sections[2].error, /blocks\[2\]/);
});

// Der Fall muss in der Vorlage scheitern: Nur dann packt Nunjucks Pfad und Zeile in die Meldung.
test("Fehlertext aus der Vorlage verraet keine Serverpfade", () => {
  const [s] = render([hero({ buttons: [{ label: "x", href: "/a", style: "gibtsnicht" }] })]);
  assert.ok(s.error, "error gesetzt");
  assert.doesNotMatch(s.error, /\/home\/|_includes|\.njk|\[Line \d|Template render error/);
  assert.doesNotMatch(s.error, /\n/);
  assert.match(s.error, /gibtsnicht/, "der eigentliche Grund bleibt erhalten");
});

test("kaputter Rahmen der Anfrage wirft statt falsch zu rendern", () => {
  const r = createRenderer();
  assert.throws(() => r.render({ ...base, frame: "gibtsnicht", blocks: [] }), /frame/);
  assert.throws(() => r.render({ ...base, frame: undefined, blocks: [] }), /frame/);
  assert.throws(() => r.render({ ...base, lang: "fr", blocks: [] }), /lang/);
  assert.throws(() => r.render({ ...base, blocks: "x" }), /blocks/);
});

// --- Inhalte ----------------------------------------------------------------------------------------

test("Skript im Textfeld wird maskiert, wie im Build", () => {
  const [s] = render([hero({ h1: '<script>alert(1)</script><img src=x onerror="a()">' })]);
  assert.ok(!s.html.includes("<script>"));
  assert.ok(!s.html.includes("<img"));
  assert.ok(s.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
});

test("Skript und Event-Attribute im Rich-Text geben error nur an diesem Index", () => {
  onlyBroken(render([hero({ claim: "<p>ok</p><script>alert(1)</script>" }), hero()]), 0);
  onlyBroken(render([hero(), hero({ claim: '<p onclick="a()">x</p>' })]), 1);
  onlyBroken(render([hero(), hero({ claim: '<a href="javascript:a()">x</a>' })]), 1);
});

test("Platzhalter werden je Kontext aufgeloest wie beim Laden der Seiten", () => {
  const [s] = render([
    hero({ h1: "Tel {{site.phone}}", claim: "<p>Tel {{site.phone}}</p>", buttons: [{ label: "x", href: "tel:{{site.phone}}", style: "primary" }] }),
  ]);
  assert.match(s.html, /<h1>Tel \+491<\/h1>/);
  assert.match(s.html, /<p class="lead">Tel \+491<\/p>/);
  assert.match(s.html, /href="tel:\+491"/);
});

test("frame kommt in der Vorlage an", () => {
  const block = { ...hero(), blockType: "faq", variant: "default", heading: "H", items: [] };
  assert.match(render([block], { frame: "home" })[0].html, /class="wrap"/);
  assert.doesNotMatch(render([block], { frame: "subpage" })[0].html, /class="wrap"/);
});

test("Bild-Pfade werden nicht gegen den Build-Bestand geprueft (Entwurfsbilder ueber /api/media/file)", () => {
  const block = { blockType: "figure", sectionKey: "f", image: { publicPath: "/api/media/file/neu.png", alt: "A" } };
  const [s] = render([block]);
  assert.equal(s.error, undefined);
  assert.match(s.html, /src="\/api\/media\/file\/neu\.png"/);
});

test("Eingabe bleibt unveraendert", () => {
  const blocks = [hero({ h1: "Tel {{site.phone}}" })];
  const before = structuredClone(blocks);
  createRenderer().render({ ...base, blocks });
  assert.deepEqual(blocks, before);
});

test("leere Bausteinliste ergibt leere Abschnitte", () => {
  assert.deepEqual(createRenderer().render({ ...base, blocks: [] }), { sections: [] });
});

// --- Filter und Vorlagen-Ordner ---------------------------------------------------------------------

test("registerFilters registriert alle Filter des Builds", () => {
  const seen = new Map();
  registerFilters((name, fn) => seen.set(name, fn));
  assert.deepEqual([...seen.keys()].sort(), ["bust", "buttonClass", "rich", "richA", "richNote", "richP", "richUl", "safeHref", "sitemapOrder"]);
  // Build-Fassung von bust haengt weiter den Inhalts-Hash an (Pfad relativ zum Arbeitsverzeichnis = Repo-Root).
  assert.match(seen.get("bust")("/assets/css/style.css"), /^\/assets\/css\/style\.css\?v=[0-9a-f]{8}$/);
  assert.equal(seen.get("bust")("/gibt/es/nicht.css"), "/gibt/es/nicht.css");
});

test("includesDir wird benutzt, bust laeuft im Renderer ohne Dateizugriff", () => {
  const dir = mkdtempSync(join(TMP, "render-includes-"));
  try {
    mkdirSync(join(dir, "blocks"));
    writeFileSync(join(dir, "blocks/hero.njk"), `<section>{{ "/assets/css/style.css" | bust }}|{{ block.h1 }}|{{ lang }}</section>`);
    const { sections } = createRenderer({ includesDir: dir }).render({ ...base, blocks: [hero({ h1: "<b>" })] });
    assert.equal(sections[0].html, "<section>/assets/css/style.css|&lt;b&gt;|de</section>");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
