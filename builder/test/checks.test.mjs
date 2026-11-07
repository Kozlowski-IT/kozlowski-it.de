// runChecks / check-links / noindex-Injektion ohne Eleventy (handgebaute Site-Ordner).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { injectNoindex, runChecks } from "../src/checks.mjs";
import { SITE_ROOT, tempWorkDir } from "./helpers.mjs";

function site(t, files) {
  const dir = join(tempWorkDir(t), "site");
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  return dir;
}

// Minimal-Seite, die check-parity besteht (DE/EN-Paar mit gleichen Sektionen).
const page = (lang, body = "") =>
  `<!doctype html><html lang="${lang}" data-translation-key="k" data-bilingual="true"><head><title>x</title></head>` +
  `<body><section data-section-key="a"></section>${body}</body></html>`;

const links = (dir) =>
  spawnSync(process.execPath, [join(SITE_ROOT, "scripts/check-links.mjs"), dir], { encoding: "utf8" });

test("check-links: interne Ziele vorhanden → exit 0; externe/Fragmente/Query ignoriert", (t) => {
  const dir = site(t, {
    "index.html": page(
      "de",
      `<a href="/en/">en</a><a href="#x">f</a><a href="https://example.org/nope">ext</a>` +
        `<a href="mailto:a@b.c">m</a><a href="tel:+49">t</a><a href="//cdn.example/x.js">p</a>` +
        `<link rel="stylesheet" href="/assets/s.css?v=1"><img src="assets/i.png" srcset="/assets/i.png 1x, /assets/i.png 2x">` +
        `<a href="/en/#kontakt">a</a><a href="/doc.pdf">d</a><a href="/en">ohne Slash</a>`,
    ),
    "en/index.html": page("en"),
    "assets/s.css": "",
    "assets/i.png": "",
    "doc.pdf": "",
  });
  const r = links(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /check-links OK/);
});

test("check-links: toter Link, fehlendes Bild, srcset-Kandidat, Ausbruch → exit 1 + Liste", (t) => {
  const dir = site(t, {
    "index.html": page(
      "de",
      `<a href="/alter-slug/">x</a><img src="/assets/media/weg.png"><img srcset="/assets/ok.png 1x, /assets/fehlt.png 2x">` +
        `<a href="/../../etc/passwd">y</a>`,
    ),
    "assets/ok.png": "",
  });
  const r = links(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\/index\.html: <a href="\/alter-slug\/"> Ziel fehlt/);
  assert.match(r.stderr, /<img src="\/assets\/media\/weg\.png"> Ziel fehlt/);
  assert.match(r.stderr, /<img srcset="\/assets\/fehlt\.png"> Ziel fehlt/);
  assert.doesNotMatch(r.stderr, /ok\.png/);
  assert.match(r.stderr, /etc\/passwd"> zeigt aus dem Site-Ordner/);
});

test("runChecks: grün = []", async (t) => {
  const dir = site(t, { "index.html": page("de", `<a href="/en/">en</a>`), "en/index.html": page("en") });
  assert.deepEqual(await runChecks(dir, { pages: 1, missing: [] }), []);
});

test("runChecks: sammelt missing, check-parity und check-links", async (t) => {
  const dir = site(t, {
    "index.html": page("de", `<a href="/weg/">x</a>`),
    // EN-Pendant fehlt → Parity rot
  });
  const msgs = await runChecks(dir, { pages: 1, missing: ["home/en/title", "k8/de/layout[0].photo"] });
  assert.ok(msgs.some((m) => m.includes("home/en/title")), msgs.join("\n"));
  assert.ok(msgs.some((m) => m.includes("k8/de/layout[0].photo")));
  assert.ok(msgs.some((m) => m.startsWith("check-parity:") && m.includes("missing EN pendant")), msgs.join("\n"));
  assert.ok(msgs.some((m) => m.startsWith("check-links:") && m.includes("/weg/")), msgs.join("\n"));
});

test("check-parity nimmt das Argument als Site-Ordner", () => {
  const r = spawnSync(process.execPath, [join(SITE_ROOT, "scripts/check-parity.mjs"), "/nonexistent-dir-xyz"], {
    encoding: "utf8",
  });
  assert.notEqual(r.status, 0, "Argument wird genutzt");
});

test("injectNoindex: ersetzt vorhandenes robots-meta, fügt sonst nach <head> ein", () => {
  assert.equal(
    injectNoindex(`<html><head lang="x"><title>t</title></head></html>`),
    `<html><head lang="x"><meta name="robots" content="noindex"><title>t</title></head></html>`,
  );
  assert.equal(
    injectNoindex(`<head>\n  <meta name="robots" content="index, follow" />\n</head>`),
    `<head>\n  <meta name="robots" content="noindex">\n</head>`,
  );
  assert.equal(
    injectNoindex(`<head><META content='all' NAME='Robots'></head>`),
    `<head><meta name="robots" content="noindex"></head>`,
  );
  // ohne <head>: vorn einfügen statt verlieren
  assert.equal(injectNoindex(`<p>x</p>`), `<meta name="robots" content="noindex"><p>x</p>`);
  // googlebot-meta o. ä. bleibt; "robots" in anderem Attribut zählt nicht
  assert.equal(
    injectNoindex(`<head><meta name="description" content="robots"></head>`),
    `<head><meta name="robots" content="noindex"><meta name="description" content="robots"></head>`,
  );
});
