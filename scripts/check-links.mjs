#!/usr/bin/env node
// Link-Check — läuft GEGEN einen gebauten Site-Ordner (nicht gegen Templates).
//
//   node scripts/check-links.mjs <siteDir>      (Default: _site)
//
// Prüft in jeder .html-Datei alle internen Verweise (href/src/srcset/poster) darauf,
// dass die Zieldatei im Site-Ordner existiert:
//   /pfad/        → <site>/pfad/index.html
//   /pfad/datei   → <site>/pfad/datei  (oder <site>/pfad/datei/index.html)
//   relativ       → relativ zur Seite
// Query (?v=…) und Fragment (#…) werden abgeschnitten. Nicht geprüft werden:
// externe Ziele (scheme: / //host), reine Fragmente (#anker), <form action>, CSS-url().
// Exit 1 + Liste der toten Verweise, sonst 0.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const SITE_DIR = process.argv[2]
  ? resolve(process.argv[2])
  : fileURLToPath(new URL("../_site", import.meta.url));

// [Selektor, Attribut]
const REFS = [
  ["a[href]", "href"],
  ["area[href]", "href"],
  ["link[href]", "href"],
  ["img[src]", "src"],
  ["img[srcset]", "srcset"],
  ["source[src]", "src"],
  ["source[srcset]", "srcset"],
  ["script[src]", "src"],
  ["iframe[src]", "src"],
  ["video[src]", "src"],
  ["video[poster]", "poster"],
  ["audio[src]", "src"],
  ["track[src]", "src"],
  ["embed[src]", "src"],
  ["object[data]", "data"],
];

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkHtml(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

const isExternal = (u) => /^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith("//");

/** srcset "a.jpg 1x, b.jpg 2x" → ["a.jpg", "b.jpg"] */
const srcsetUrls = (v) =>
  v
    .split(",")
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);

/** Liefert null (ok) oder einen Fehlertext für einen Verweis `raw` auf Seite `file`. */
export function checkRef(siteDir, file, raw) {
  const url = raw.trim();
  if (!url || url.startsWith("#") || isExternal(url)) return null;
  let path = url.replace(/[?#].*$/, "");
  if (!path) return null; // nur "?x" → gleiche Seite
  try {
    path = decodeURIComponent(path);
  } catch {
    return `ungültig kodiert`;
  }
  const target = path.startsWith("/") ? join(siteDir, path) : join(dirname(file), path);
  const rel = relative(siteDir, target);
  if (rel.startsWith("..") || rel.split(sep).includes("..")) return "zeigt aus dem Site-Ordner";
  const candidates = path.endsWith("/") ? [join(target, "index.html")] : [target, join(target, "index.html")];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return null;
  }
  return "Ziel fehlt";
}

export function checkLinks(siteDir) {
  const errors = [];
  const files = walkHtml(siteDir);
  for (const file of files) {
    const $ = cheerio.load(readFileSync(file, "utf8"));
    const page = "/" + relative(siteDir, file).split(sep).join("/");
    for (const [sel, attr] of REFS) {
      $(sel).each((_, el) => {
        const v = $(el).attr(attr) ?? "";
        const urls = attr === "srcset" ? srcsetUrls(v) : [v];
        for (const u of urls) {
          const why = checkRef(siteDir, file, u);
          if (why) errors.push(`${page}: <${el.tagName} ${attr}="${u}"> ${why}`);
        }
      });
    }
  }
  return { files: files.length, errors: [...new Set(errors)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(SITE_DIR) || !statSync(SITE_DIR).isDirectory()) {
    console.error(`check-links: ${SITE_DIR} ist kein Ordner.`);
    process.exit(1);
  }
  const { files, errors } = checkLinks(SITE_DIR);
  if (files === 0) {
    console.error(`check-links: keine HTML-Datei in ${SITE_DIR}.`);
    process.exit(1);
  }
  if (errors.length) {
    console.error(`check-links FAILED (${errors.length}):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log(`check-links OK — ${files} Seiten, alle internen Verweise vorhanden.`);
}
