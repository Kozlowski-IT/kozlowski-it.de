// Rich-Text-Prüfung im Renderer (lib/richtext.js, Task 13): Tag-Teilmenge aus docs/content-format-v1.md
// Abschnitt 4 und jedes <a href> über safeHref. Verstoß = Build-Fehler (nicht still entfernen).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { clean, richP, sanitizeRichText } from "../lib/richtext.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TMP = process.env.TMPDIR || tmpdir();

test("erlaubte Teilmenge geht unverändert durch (inkl. Lexical-Listenartefakte, Entities, Links mit rel/target)", () => {
  const ok = [
    "<p>a &amp; b &lt;c&gt; <strong>f</strong> <em>e</em> <code>x</code> H<sub>2</sub>O m<sup>2</sup></p>",
    "<h2>A</h2><h3>B</h3><h4>C</h4><hr /><hr><p>x<br />y<br>z</p>",
    '<ul class="list-bullet"><li class="" style="" value="1">a</li></ul><ol class="list-number"><li>b</li></ol>',
    '<p><a href="https://x.de/?a=1&amp;b=2" rel="noopener nofollow" target="_blank">x</a> <a href="/foo/">i</a> <a href="#k">k</a></p>',
    '<p><a href="tel:+491628213267">t</a> <a href="mailto:pk@kozlowski-it.de">m</a> <a href=\'/single\'>s</a></p>',
    "<P>Großbuchstaben-Tag</P>",
    "Text ohne Tags > mit Größerzeichen",
    "",
  ];
  for (const h of ok) assert.equal(sanitizeRichText(h), h, h);
  assert.equal(sanitizeRichText(null), "");
  assert.equal(clean('<ul class="list-bullet"><li class="" style="" value="1">a</li></ul>'), "<ul><li>a</li></ul>");
});

const BAD = [
  // unbekannte Tags / Konstrukte
  ["<script>alert(1)</script>", /Tag <script> ist nicht erlaubt/],
  ["<p>x</p><img src=x onerror=alert(1)>", /kein gültiges Tag|Tag <img>/],
  ['<img src="x">', /Tag <img> ist nicht erlaubt/],
  ["<iframe></iframe>", /Tag <iframe>/],
  ["<style>p{}</style>", /Tag <style>/],
  ["<h1>x</h1>", /Tag <h1>/],
  ['<span style="text-decoration: underline">u</span>', /Tag <span>/],
  ["<blockquote>q</blockquote>", /Tag <blockquote>/],
  ["<!-- c --><p>x</p>", /kein gültiges Tag/],
  ["<p>a < b</p>", /kein gültiges Tag/],
  ["<svg><script>x</script></svg>", /Tag <svg>/],
  // Attribute
  ['<p onclick="x()">x</p>', /Attribut onclick an <p>/],
  ['<p style="color:red">x</p>', /Attribut style an <p>/],
  ['<a href="/x" onmouseover="x()">x</a>', /Attribut onmouseover/],
  ['<ul class="evil">', /Wert "evil" für class an <ul>/],
  ['<li class="x" style="" value="1">', /für class an <li>/],
  ["<a href=/x>x</a>", /kein gültiges Tag/], // Wert ohne Anführungszeichen
  ['<a href="/x" href="javascript:alert(1)">x</a>', /doppelt/],
  ["<a>x</a>", /<a> ohne href/],
  ['<a href="/x" target="_blank">x</a>', /noopener/],
  ['<a href="/x" target="_self" rel="noopener">x</a>', /für target/],
  ['<a href="/x" rel="opener">x</a>', /für rel/],
  ["<p/>", /selbstschließend/],
  ["</br>", /kein gültiges schließendes Tag/],
  ['</p class="x">', /schließendes Tag/],
  // Link-Ziele (gleiche Allow-List wie safeHref)
  ['<a href="javascript:alert(1)">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href=" JavaScript:alert(1)">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href="//evil.example">x</a>', /unerlaubtes Link-Ziel "\/\/evil\.example"/],
  ['<a href="/\\evil.example">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href="data:text/html,x">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href="">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href="relativ">x</a>', /unerlaubtes Link-Ziel/],
  // über Zeichenreferenzen versteckt
  ['<a href="&#106;avascript:alert(1)">x</a>', /unerlaubtes Link-Ziel "javascript:alert\(1\)"/],
  ['<a href="/&#47;evil.example">x</a>', /unerlaubtes Link-Ziel "\/\/evil\.example"/],
  ['<a href="/&#x2F;evil.example">x</a>', /unerlaubtes Link-Ziel "\/\/evil\.example"/],
  ['<a href="/&sol;evil.example">x</a>', /nicht erlaubte Zeichenreferenz/],
  ['<a href="javascript&colon;alert(1)">x</a>', /nicht erlaubte Zeichenreferenz/],
  ['<a href="java&#9;script:alert(1)">x</a>', /unerlaubtes Link-Ziel/],
  ['<a href="/x?a=1&b=2">x</a>', /nicht erlaubte Zeichenreferenz/], // rohes & (Erzeuger maskiert als &amp;)
];
for (const [h, re] of BAD) {
  test(`abgelehnt: ${h}`, () => {
    assert.throws(() => sanitizeRichText(h, "seite/de blocks[0].body"), (err) => {
      assert.match(err.message, /^cms: Rich-Text \(seite\/de blocks\[0\]\.body\): /);
      assert.match(err.message, re);
      return true;
    });
  });
}

test("Filter prüfen vor dem Klassen-Setzen (auch ohne Ortsangabe)", () => {
  assert.throws(() => richP('<p><a href="//evil.example">x</a></p>', "lead"), /^Error: cms: Rich-Text: unerlaubtes Link-Ziel/);
  assert.equal(richP("<p>x</p>", "lead"), '<p class="lead">x</p>');
});

function buildWith(mutateHtml) {
  const dir = mkdtempSync(join(TMP, "cms-rt-"));
  cpSync(join(ROOT, "test/fixtures/content"), dir, { recursive: true });
  const p = join(dir, "pages.json");
  const d = JSON.parse(readFileSync(p, "utf8"));
  mutateHtml(d);
  writeFileSync(p, JSON.stringify(d));
  const out = mkdtempSync(join(TMP, "cms-rt-out-"));
  const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${out}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_DIR: dir },
    encoding: "utf8",
  });
  rmSync(dir, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  return r;
}

for (const [name, html, re] of [
  ["protokoll-relativer Link", '<p><a href="//evil.example">x</a></p>', /Rich-Text \(home\/de blocks\[3\]\.note\).*unerlaubtes Link-Ziel "\/\/evil\.example"/],
  ["Backslash-Link", '<p><a href="/\\evil.example">x</a></p>', /Rich-Text \(home\/de blocks\[3\]\.note\).*unerlaubtes Link-Ziel/],
  ["script-Tag", "<p>x</p><script>alert(1)</script>", /Rich-Text \(home\/de blocks\[3\]\.note\).*Tag <script>/],
]) {
  test(`Build bricht ab: ${name} im Rich-Text (mit Seite/Feld)`, () => {
    const r = buildWith((d) => {
      const blocks = d.pages.find((p) => p.translationKey === "home").locales.de.blocks;
      assert.equal(blocks[3].blockType, "contactForm");
      blocks[3].note = html;
    });
    assert.notEqual(r.status, 0, "Build hätte scheitern müssen");
    assert.match(r.stdout + r.stderr, re);
  });
}
