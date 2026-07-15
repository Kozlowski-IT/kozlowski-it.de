#!/usr/bin/env node
// Parity check — runs AGAINST the built _site/ output (not the templates).
//
// Guarantees, per DE/EN logical page (linked by the raw front-matter
// `translationKey`, surfaced as <html data-translation-key>):
//   1. every bilingual page has a pendant in the other language;
//   2. both language variants expose the SAME ordered set of section keys
//      (data-section-key) — structural parity, NOT identical anchor IDs
//      (DE #leistungen vs EN #services is correct localization).
//
// Pages marked data-bilingual="false" (German-only legal pages) are exempt
// from the pendant requirement. Exit 1 on any divergence.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const SITE_DIR = fileURLToPath(new URL("../_site", import.meta.url));

function walkHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkHtml(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

function relUrl(file) {
  return file.slice(SITE_DIR.length).replace(/\\/g, "/");
}

const files = walkHtml(SITE_DIR);
if (files.length === 0) {
  console.error("check-parity: no HTML found in _site/ — run the build first.");
  process.exit(1);
}

const pages = files.map((file) => {
  const $ = cheerio.load(readFileSync(file, "utf8"));
  const html = $("html");
  return {
    url: relUrl(file),
    lang: html.attr("lang") || "",
    translationKey: html.attr("data-translation-key") || "",
    bilingual: html.attr("data-bilingual") === "true",
    sectionKeys: $("[data-section-key]")
      .map((_, el) => $(el).attr("data-section-key"))
      .get(),
  };
});

const errors = [];

// Every bilingual page must declare a translationKey.
for (const p of pages) {
  if (p.bilingual && !p.translationKey) {
    errors.push(`${p.url}: bilingual page without translationKey`);
  }
}

// Group by translationKey.
const groups = new Map();
for (const p of pages) {
  if (!p.translationKey) continue;
  if (!groups.has(p.translationKey)) groups.set(p.translationKey, []);
  groups.get(p.translationKey).push(p);
}

for (const [key, group] of groups) {
  const needsPendant = group.some((p) => p.bilingual);
  if (!needsPendant) continue; // legal / German-only

  const byLang = new Map();
  for (const p of group) byLang.set(p.lang, p);

  // 1. pendant presence
  for (const lang of ["de", "en"]) {
    if (!byLang.has(lang)) {
      errors.push(
        `translationKey "${key}": missing ${lang.toUpperCase()} pendant ` +
          `(have: ${group.map((p) => `${p.lang} ${p.url}`).join(", ")})`,
      );
    }
  }

  // 2. section parity (only if both present)
  const de = byLang.get("de");
  const en = byLang.get("en");
  if (de && en) {
    const a = de.sectionKeys.join(" > ");
    const b = en.sectionKeys.join(" > ");
    if (a !== b) {
      errors.push(
        `translationKey "${key}": section structure differs\n` +
          `    DE ${de.url}: [${a}]\n` +
          `    EN ${en.url}: [${b}]`,
      );
    }
  }
}

// Report
const bilingualKeys = [...groups].filter(([, g]) => g.some((p) => p.bilingual)).length;
console.log(
  `check-parity: ${pages.length} pages, ${groups.size} translationKeys ` +
    `(${bilingualKeys} bilingual).`,
);
for (const [key, group] of groups) {
  const langs = group.map((p) => p.lang).sort().join("+");
  const secs = group[0].sectionKeys.length;
  console.log(`  - ${key}: ${langs}${group.some((p) => p.bilingual) ? "" : " (de-only)"} · ${secs} sections`);
}

if (errors.length) {
  console.error(`\ncheck-parity FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\ncheck-parity OK — DE/EN parity holds.");
