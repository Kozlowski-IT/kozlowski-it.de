// Platzhalter {{site.<schlüssel>}} (Task 13): Einheit (resolvePlaceholders/resolveLocale) und Build mit Fixture-Kopie.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { fieldContext, resolveLocale, resolvePlaceholders } from "../lib/placeholders.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(ROOT, "test/fixtures/content");
const TMP = process.env.TMPDIR || tmpdir();

const SITE = {
  telDisplay: "0162 8213267",
  telHref: "tel:+491628213267",
  email: "pk@kozlowski-it.de",
  booking: "https://cal.kozlowski-it.de/erstgespraech",
  evil: '<script>alert(1)</script> & "x"',
  bad: "javascript:alert(1)",
  protoRel: "//evil.example",
  empty: "",
};

// --- Einheit -----------------------------------------------------------------------------------

test("text: Wert wird als Rohtext eingesetzt (das Template maskiert beim Ausgeben)", () => {
  assert.equal(resolvePlaceholders("Tel. {{site.telDisplay}}", SITE, { context: "text" }), "Tel. 0162 8213267");
  assert.equal(resolvePlaceholders("{{ site.telDisplay }}", SITE), "0162 8213267", "Leerraum in den Klammern erlaubt, Kontext-Default text");
  assert.equal(resolvePlaceholders("x {{site.evil}}", SITE, { context: "text" }), 'x <script>alert(1)</script> & "x"');
});

test("html: Wert wird HTML-maskiert (Text und Attribut)", () => {
  assert.equal(
    resolvePlaceholders('<p><a href="{{site.telHref}}">{{site.telDisplay}}</a></p>', SITE, { context: "html" }),
    '<p><a href="tel:+491628213267">0162 8213267</a></p>',
  );
  assert.equal(
    resolvePlaceholders("<p>{{site.evil}}</p>", SITE, { context: "html" }),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</p>",
  );
  assert.equal(resolvePlaceholders('<a href="x">{{site.evil}}</a>', SITE, { context: "html" }).includes("<script>"), false);
});

test("href: aufgelöster Wert läuft durch safeHref", () => {
  assert.equal(resolvePlaceholders("{{site.booking}}", SITE, { context: "href" }), SITE.booking);
  assert.equal(resolvePlaceholders("mailto:{{site.email}}", SITE, { context: "href" }), "mailto:pk@kozlowski-it.de");
  assert.throws(() => resolvePlaceholders("{{site.bad}}", SITE, { context: "href", where: "home/de blocks[0].buttons[0].href" }), /unerlaubtes Link-Ziel "javascript:alert\(1\)".*home\/de blocks\[0\]\.buttons\[0\]\.href/);
  assert.throws(() => resolvePlaceholders("{{site.protoRel}}", SITE, { context: "href" }), /unerlaubtes Link-Ziel/);
  // Kombination, die erst nach dem Einsetzen unerlaubt wird
  assert.throws(() => resolvePlaceholders("/{{site.protoRel}}", SITE, { context: "href" }), /unerlaubtes Link-Ziel/);
});

test("unbekannter Schlüssel → Fehler mit Seite/Feld; keine Prototyp-Schlüssel", () => {
  assert.throws(
    () => resolvePlaceholders("x {{site.gibtsnicht}}", SITE, { where: "danke/de blocks[0].body" }),
    /unbekannter Platzhalter \{\{site\.gibtsnicht\}\} \(danke\/de blocks\[0\]\.body\)/,
  );
  for (const k of ["constructor", "toString", "hasOwnProperty"]) {
    assert.throws(() => resolvePlaceholders(`{{site.${k}}}`, SITE), /unbekannter Platzhalter/, k);
  }
  assert.throws(() => resolvePlaceholders("{{site.__proto__}}", SITE), /ungültiger Platzhalter/);
});

test("kaputte Syntax und leere Werte → Fehler; andere {{…}} bleiben Text; Werte werden nicht erneut ausgewertet", () => {
  for (const bad of ["{{site.tel Display}}", "{{site.}}", "{{ site.telDisplay }", "{{site-telDisplay}}", "{{site.1x}}"]) {
    assert.throws(() => resolvePlaceholders(bad, SITE), /ungültiger Platzhalter/, bad);
  }
  assert.throws(() => resolvePlaceholders("{{site.empty}}", SITE), /leer/);
  assert.equal(resolvePlaceholders("{{ andere }} {x}", SITE), "{{ andere }} {x}");
  assert.equal(resolvePlaceholders("{{site.a}}", { a: "{{site.b}}", b: "B" }), "{{site.b}}");
});

test("Feldkontext: html laut Katalog, href an *.href, sonst text", () => {
  assert.equal(fieldContext("text", "body"), "html");
  assert.equal(fieldContext("cards", "cards[].text"), "html");
  assert.equal(fieldContext("ctaBar", "text"), "html");
  assert.equal(fieldContext("text", "heading"), "text");
  assert.equal(fieldContext("cards", "cards[].link.href"), "href");
  assert.equal(fieldContext("hero", "buttons[].href"), "href");
  assert.equal(fieldContext(undefined, "title"), "text");
});

test("resolveLocale: alle Felder (title/og/Bausteine), slug unberührt, Rich-Text geprüft, Fehlerort mit Pfad", () => {
  const loc = {
    slug: "danke",
    title: "Danke · {{site.telDisplay}}",
    og: { description: "{{site.email}}" },
    blocks: [
      {
        blockType: "text",
        heading: "{{site.evil}}",
        body: '<p><a href="mailto:{{site.email}}">{{site.email}}</a></p>',
        buttons: [{ label: "Termin", href: "{{site.booking}}" }],
      },
    ],
  };
  const out = resolveLocale(loc, SITE, "danke/de");
  assert.equal(out.slug, "danke");
  assert.equal(out.title, "Danke · 0162 8213267");
  assert.equal(out.og.description, "pk@kozlowski-it.de");
  assert.equal(out.blocks[0].heading, SITE.evil, "text bleibt roh; Autoescape im Template");
  assert.equal(out.blocks[0].body, '<p><a href="mailto:pk@kozlowski-it.de">pk@kozlowski-it.de</a></p>');
  assert.equal(out.blocks[0].buttons[0].href, SITE.booking);
  assert.equal(loc.title, "Danke · {{site.telDisplay}}", "Eingabe unverändert");

  const bad = structuredClone(loc);
  bad.blocks[0].buttons[0].href = "{{site.gibtsnicht}}";
  assert.throws(() => resolveLocale(bad, SITE, "danke/de"), /\{\{site\.gibtsnicht\}\} \(danke\/de blocks\[0\]\.buttons\[0\]\.href\)/);
  const badHtml = structuredClone(loc);
  badHtml.blocks[0].body = '<p><a href="{{site.protoRel}}">x</a></p>';
  assert.throws(() => resolveLocale(badHtml, SITE, "danke/de"), /Rich-Text \(danke\/de blocks\[0\]\.body\).*unerlaubtes Link-Ziel "\/\/evil\.example"/);
});

// --- Build (Fixture-Kopie) -------------------------------------------------------------------

function build(mutate) {
  const dir = mkdtempSync(join(TMP, "cms-ph-"));
  cpSync(FIXTURES, dir, { recursive: true });
  mutate(dir);
  const out = mkdtempSync(join(TMP, "cms-ph-out-"));
  const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${out}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_DIR: dir },
    encoding: "utf8",
  });
  const load = (url) => cheerio.load(readFileSync(join(out, url, "index.html"), "utf8"));
  const raw = (url) => readFileSync(join(out, url, "index.html"), "utf8");
  const cleanup = () => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  };
  return { r, load, raw, cleanup };
}

const editJson = (dir, file, fn) => {
  const p = join(dir, file);
  const d = JSON.parse(readFileSync(p, "utf8"));
  fn(d);
  writeFileSync(p, JSON.stringify(d));
};

/** Impressum (nur DE, text/legal) mit Platzhaltern in title, Textfeld, Rich-Text (Text + href) und Button-href. */
const withPlaceholders = (site) => (dir) => {
  editJson(dir, "pages.json", (d) => {
    const loc = d.pages.find((p) => p.translationKey === "impressum").locales.de;
    loc.title = "Impressum · {{site.telDisplay}}";
    loc.blocks = [
      {
        blockType: "text",
        sectionKey: "legal",
        variant: "legal",
        eyebrow: "Tel. {{site.telDisplay}} · {{site.evil}}",
        heading: "Kontakt",
        headingLevel: "h1",
        body:
          '<p>Telefon <a href="{{site.telHref}}">{{site.telDisplay}}</a>, E-Mail <a href="mailto:{{site.email}}">{{site.email}}</a>.</p>' +
          '<p><a href="{{site.booking}}">Termin</a> · {{site.evil}}</p>',
        buttons: [{ label: "Termin buchen", href: "{{site.booking}}", style: "primary" }],
      },
    ];
  });
  if (site) editJson(dir, "site.json", (d) => Object.assign(d.site, site));
};

const EVIL = '<script>alert(1)</script> & "x"';

function collect(load) {
  const d = load("/impressum/");
  return {
    title: d("title").text(),
    eyebrow: d("main p.eyebrow").text(),
    links: d("main a").map((_, a) => [[d(a).attr("href"), d(a).text()]]).get(),
    body: d("main p").eq(2).text(),
    navTel: d("a.nav-tel").first().text().replace("📞", "").trim(),
    navCta: d("a.nav-cta").attr("href"),
  };
}

test("Build: Platzhalter aufgelöst in title/Text/Rich-Text/href; <script>-Wert nur escaped", () => {
  const b = build(withPlaceholders({ evil: EVIL }));
  try {
    assert.equal(b.r.status, 0, `${b.r.stdout}\n${b.r.stderr}`);
    const c = collect(b.load);
    assert.equal(c.title, "Impressum · 0162 8213267");
    assert.equal(c.eyebrow, `Tel. 0162 8213267 · ${EVIL}`);
    assert.deepEqual(c.links, [
      ["tel:+491628213267", "0162 8213267"],
      ["mailto:pk@kozlowski-it.de", "pk@kozlowski-it.de"],
      ["https://cal.kozlowski-it.de/erstgespraech", "Termin"],
      ["https://cal.kozlowski-it.de/erstgespraech", "Termin buchen"],
    ]);
    assert.equal(c.body, `Termin · ${EVIL}`);
    const html = b.raw("/impressum/");
    assert.ok(!html.includes("<script>alert(1)"), "kein unescaptes <script>");
    assert.ok(!html.includes("{{"), "kein Platzhalter übrig");
  } finally {
    b.cleanup();
  }
});

test("Build: Änderung in site.json ändert alle Stellen (Seite und Kopfzeile)", () => {
  const changed = {
    telDisplay: "0711 999",
    telHref: "tel:+49711999",
    email: "neu@example.org",
    booking: "https://termine.example.org/neu",
    evil: "harmlos",
  };
  const b = build(withPlaceholders(changed));
  try {
    assert.equal(b.r.status, 0, `${b.r.stdout}\n${b.r.stderr}`);
    const c = collect(b.load);
    assert.equal(c.title, "Impressum · 0711 999");
    assert.equal(c.eyebrow, "Tel. 0711 999 · harmlos");
    assert.deepEqual(c.links, [
      ["tel:+49711999", "0711 999"],
      ["mailto:neu@example.org", "neu@example.org"],
      ["https://termine.example.org/neu", "Termin"],
      ["https://termine.example.org/neu", "Termin buchen"],
    ]);
    assert.equal(c.navTel, "0711 999");
    assert.equal(c.navCta, "https://termine.example.org/neu");
    const old = b.raw("/impressum/").match(/8213267|pk@kozlowski-it\.de|cal\.kozlowski-it\.de/g);
    assert.equal(old, null, `alter Wert noch in der Seite: ${old}`);
    // Fixture-Startseite nutzt Platzhalter im contactForm-Hinweis
    const home = b.load("/");
    assert.equal(home("section.contact p.plain-mail a").attr("href"), "tel:+49711999");
    assert.equal(home("section.contact p.plain-mail a strong").text(), "0711 999");
  } finally {
    b.cleanup();
  }
});

for (const [name, mutate, re] of [
  ["unbekannter Schlüssel im Textfeld", (l) => (l.blocks[0].eyebrow = "{{site.gibtsnicht}}"), /unbekannter Platzhalter \{\{site\.gibtsnicht\}\} \(impressum\/de blocks\[0\]\.eyebrow\)/],
  ["unbekannter Schlüssel im Rich-Text", (l) => (l.blocks[0].body = "<p>{{site.gibtsnicht}}</p>"), /unbekannter Platzhalter \{\{site\.gibtsnicht\}\} \(impressum\/de blocks\[0\]\.body\)/],
  ["unbekannter Schlüssel im Button-href", (l) => (l.blocks[0].buttons[0].href = "{{site.gibtsnicht}}"), /unbekannter Platzhalter.*blocks\[0\]\.buttons\[0\]\.href/],
  ["href-Wert nach Auflösen unerlaubt (Button)", (l) => (l.blocks[0].buttons[0].href = "{{site.evilHref}}"), /unerlaubtes Link-Ziel "javascript:alert\(1\)".*buttons\[0\]\.href/],
  ["href-Wert nach Auflösen unerlaubt (Rich-Text)", (l) => (l.blocks[0].body = '<p><a href="{{site.evilHref}}">x</a></p>'), /Rich-Text \(impressum\/de blocks\[0\]\.body\).*unerlaubtes Link-Ziel/],
]) {
  test(`Build bricht ab: ${name}`, () => {
    const b = build((dir) => {
      withPlaceholders({ evil: EVIL, evilHref: "javascript:alert(1)" })(dir);
      editJson(dir, "pages.json", (d) => mutate(d.pages.find((p) => p.translationKey === "impressum").locales.de));
    });
    try {
      assert.notEqual(b.r.status, 0, "Build hätte scheitern müssen");
      assert.match(b.r.stdout + b.r.stderr, re);
    } finally {
      b.cleanup();
    }
  });
}
