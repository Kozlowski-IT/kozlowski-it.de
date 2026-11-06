#!/usr/bin/env node
// Gleichheitstest (Migrations-Gate): normalisiertes HTML jeder Seite == Baseline.
//
//   node scripts/check-equal.mjs <baselineDir> <siteDir> [--only <url>...]
//
// Exit 0 = alle verglichenen Seiten gleich, 1 = Unterschied/fehlende/zusätzliche Seite,
// 2 = Bedienfehler (Verzeichnis fehlt/leer, unbekannte --only-URL) -> nie ein falsches Grün.
//
// Verglichen werden ALLE Dateien (rekursiv): *.html und sitemap.xml normalisiert (s. u.), alle
// übrigen (robots.txt, Manifest, CSS/JS, Fonts, Bilder, PDF ...) byte-genau. Fehlende und
// zusätzliche Dateien zählen als Unterschied. Jede *.html/sitemap.xml wird mit cheerio/parse5
// geparst (sitemap.xml ohne <html>-Wurzel als XML; im Baseline steckt sie wegen eines alten
// Bugs im HTML-Layout und wird dann wie jede HTML-Seite verglichen) und in eine flache
// Token-Folge (Start-Tag, Text, End-Tag) überführt; die erste abweichende Token-Position
// wird mit CSS-artigem Selektor, erwartet/ist ausgegeben.
//
// Normalisiert wird NUR:
//  1. Kommentare werden entfernt.
//  2. Attribute werden nach Namen sortiert (Reihenfolge im Quelltext egal).
//  3. In Attributwerten werden Whitespace-Folgen zu einem Leerzeichen und Ränder getrimmt;
//     Cache-Busting ?v=<hash> / &v=<hash> wird entfernt (nur in Attributwerten).
//  4. Textknoten: HTML-Whitespace-Folgen ([ \t\n\r\f]; NICHT U+00A0 & Co.) -> ein Leerzeichen.
//     Getrimmt wird nur am Rand eines Block-Elternelements (bzw. der Wurzel) und neben
//     Block-Geschwistern; Whitespace-Knoten zwischen Blöcken entfallen. In/zwischen
//     Inline-Inhalt bleibt ein einzelnes Leerzeichen: "a <b>", "<b> x</b>", "<b>x </b>"
//     sind alle verschieden von der Variante ohne Leerzeichen. In XML-Dateien gilt jedes
//     Element als Block. <template>-Inhalt wird mitverglichen; unbekannte Knotentypen
//     brechen mit Fehler ab (fail closed).
//  5. In <pre>, <textarea>, <script>, <style> bleibt der Text unverändert.
// Alles andere zählt als Unterschied: Textinhalt, Attributwerte, Elementreihenfolge,
// Groß-/Kleinschreibung von Text, fehlende und zusätzliche Seiten.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import * as cheerio from "cheerio";

const RAW = new Set(["pre", "textarea", "script", "style"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "param"]);
const BLOCK = new Set(["html", "head", "body", "address", "article", "aside", "blockquote", "details", "dialog", "dd", "div", "dl", "dt",
  "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "li", "main", "menu",
  "nav", "ol", "p", "pre", "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul", "title", "meta", "link",
  "script", "style", "base", "noscript", "template", "option", "select", "optgroup", "caption", "colgroup", "col", "br", "textarea", "iframe", "svg"]);

// Nur HTML-Whitespace (Space, Tab, LF, CR, FF); U+00A0/U+202F/U+2009 u. ä. bleiben erhalten.
const collapse = (s) => s.replace(/[ \t\n\r\f]+/g, " ");
const trimWs = (s) => s.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");
let XML = false; // in XML-Dateien gilt jedes Element als Block (Einrückung ist egal)
const isBlockName = (name) => XML || BLOCK.has(name);

export function stripCacheBust(v) {
  return v
    .replace(/\?v=[0-9A-Za-z]+&/g, "?")
    .replace(/\?v=[0-9A-Za-z]+(?=#|$)/g, "")
    .replace(/&v=[0-9A-Za-z]+/g, "");
}

const attrValue = (v) => stripCacheBust(trimWs(collapse(v)));
const q = (s) => JSON.stringify(s);

export function walk(parent, path, rawCtx, out) {
  const kids = (parent.children || []).filter((n) => n.type !== "comment");
  const counts = {};
  const isElem = (n) => n.type === "tag" || n.type === "script" || n.type === "style";
  const isInline = (n) => n.type === "text" || (isElem(n) && !isBlockName(n.name));
  // Am Rand trimmen nur, wenn der Elternknoten ein Block (oder die Wurzel) ist.
  const parentBlock = parent.type === "root" || isBlockName(parent.name);
  kids.forEach((n, i) => {
    if (n.type === "text") {
      if (rawCtx) { out.push({ s: q(n.data), path: `${path} > #text` }); return; }
      let t = collapse(n.data);
      const prev = kids[i - 1], next = kids[i + 1];
      if (prev ? !isInline(prev) : parentBlock) t = t.replace(/^ /, "");
      if (next ? !isInline(next) : parentBlock) t = t.replace(/ $/, "");
      if (t === "") return;
      out.push({ s: q(t), path: `${path} > #text` });
    } else if (n.type === "root") {
      // <template>-Inhalt (parse5-Fragment) transparent durchlaufen
      walk(n, path, rawCtx, out);
    } else if (n.type === "directive") {
      out.push({ s: `<${trimWs(collapse(n.data)).toLowerCase()}>`, path });
    } else if (n.type === "cdata") {
      out.push({ s: "<![CDATA[", path });
      walk(n, path, true, out);
      out.push({ s: "]]>", path });
    } else if (isElem(n)) {
      counts[n.name] = (counts[n.name] || 0) + 1;
      const sel = `${path} > ${n.name}${counts[n.name] > 1 || kids.some((k, j) => j > i && k.name === n.name) ? `:nth-of-type(${counts[n.name]})` : ""}`;
      const attrs = Object.entries(n.attribs || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => (v === "" ? k : `${k}=${q(attrValue(v))}`));
      out.push({ s: `<${n.name}${attrs.length ? " " + attrs.join(" ") : ""}>`, path: sel });
      if (!VOID.has(n.name)) {
        walk(n, sel, rawCtx || RAW.has(n.name), out);
        out.push({ s: `</${n.name}>`, path: sel });
      }
    } else {
      // fail closed: unbekannte Knotentypen nie stillschweigend überspringen
      throw new Error(`check-equal: unbekannter Knotentyp "${n.type}" bei ${path || "(document)"}`);
    }
  });
}

export function tokens(src) {
  const isHtml = /<html[\s>]|<!doctype\s+html/i.test(src);
  XML = !isHtml;
  const $ = cheerio.load(src, isHtml ? {} : { xml: { xmlMode: true } });
  const out = [];
  const root = $.root()[0];
  if (isHtml && /^\s*<!doctype/i.test(src)) out.push({ s: "<!doctype>", path: "(document)" });
  walk(root, "", false, out);
  return out;
}

export function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (!a[i] || !b[i] || a[i].s !== b[i].s) {
      return { index: i, selector: (b[i] || a[i]).path || "(document)", expected: a[i]?.s ?? "(Ende des Dokuments)", actual: b[i]?.s ?? "(Ende des Dokuments)" };
    }
  }
  return null;
}

function listFiles(dir) {
  const res = [];
  const rec = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) rec(p);
      else res.push(relative(dir, p).split(sep).join("/"));
    }
  };
  rec(dir);
  return res.sort();
}

// "/a/b.html" -> Datei; "/a/" bzw. "/a" -> a/index.html; "/" -> index.html
const isPage = (f) => f.endsWith(".html") || f === "sitemap.xml" || f.endsWith("/sitemap.xml");

const urlToFile = (u) => {
  const p = u.replace(/^\/+/, "");
  if (p === "" || p.endsWith("/")) return p + "index.html";
  return /\.[a-z0-9]+$/i.test(p) ? p : p + "/index.html";
};
const fileToUrl = (f) => "/" + f.replace(/(^|\/)index\.html$/, "$1");

function main(argv) {
  const args = argv.slice(2);
  const pos = [], only = [];
  let inOnly = false;
  for (const a of args) {
    if (a === "--only") inOnly = true;
    else if (a.startsWith("--")) { console.error(`Unbekannte Option ${a}`); return 2; }
    else (inOnly ? only : pos).push(a);
  }
  if (pos.length !== 2 || (inOnly && only.length === 0)) {
    console.error("Usage: check-equal.mjs <baselineDir> <siteDir> [--only <url>...]");
    return 2;
  }
  const [baseDir, siteDir] = pos;
  for (const d of [baseDir, siteDir]) {
    let ok = false;
    try { ok = statSync(d).isDirectory(); } catch { /* fällt unten */ }
    if (!ok) { console.error(`Verzeichnis nicht gefunden: ${d}`); return 2; }
  }
  let baseFiles = listFiles(baseDir), siteFiles = listFiles(siteDir);
  if (baseFiles.length === 0) { console.error(`Keine Dateien in Baseline ${baseDir} (npm run baseline?)`); return 2; }
  if (only.length) {
    const want = only.map(urlToFile);
    const unknown = only.filter((u, i) => !baseFiles.includes(want[i]));
    if (unknown.length) { console.error(`Nicht in der Baseline: ${unknown.join(", ")}`); return 2; }
    baseFiles = baseFiles.filter((f) => want.includes(f));
    siteFiles = siteFiles.filter((f) => want.includes(f));
  }
  const baseSet = new Set(baseFiles), siteSet = new Set(siteFiles);
  let bad = 0;
  for (const f of baseFiles) {
    const url = fileToUrl(f);
    if (!siteSet.has(f)) { bad++; console.log(`FEHLT  Datei fehlt im neuen Build: ${url}  (${f})`); continue; }
    if (!isPage(f)) {
      const a = readFileSync(join(baseDir, f)), b = readFileSync(join(siteDir, f));
      if (!a.equals(b)) {
        bad++;
        let o = 0;
        while (o < a.length && o < b.length && a[o] === b[o]) o++;
        console.log(`DIFF   ${url}  (${f})\n  Datei (Bytes) verschieden: erwartet ${a.length} B, ist ${b.length} B, erster Unterschied bei Offset ${o}`);
      }
      continue;
    }
    const d = firstDiff(tokens(readFileSync(join(baseDir, f), "utf8")), tokens(readFileSync(join(siteDir, f), "utf8")));
    if (d) {
      bad++;
      console.log(`DIFF   ${url}  (${f})\n  selector: ${d.selector.replace(/^ > /, "")}\n  expected: ${d.expected}\n  actual:   ${d.actual}`);
    }
  }
  for (const f of siteFiles) if (!baseSet.has(f)) { bad++; console.log(`EXTRA  Datei zusätzlich im neuen Build, nicht in der Baseline: ${fileToUrl(f)}  (${f})`); }
  const total = baseFiles.length;
  if (bad) { console.log(`\n${bad} Abweichung(en) bei ${total} Baseline-Seite(n).`); return 1; }
  console.log(`OK: ${total} Datei(en) gleich (HTML/sitemap normalisiert, Rest byte-genau).`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let code;
  try { code = main(process.argv); } catch (e) { console.error(e.message); code = 2; }
  process.exit(code);
}
