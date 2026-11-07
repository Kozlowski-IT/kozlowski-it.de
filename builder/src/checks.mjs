// Prüfungen eines gebauten Site-Ordners + noindex für die Vorschau.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runNode } from "./proc.mjs";

const DEFAULT_SITE_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Stderr eines Check-Skripts ("  ✗ meldung" + Folgezeilen) → eine Meldung pro ✗.
 * Ohne ✗-Zeile (Absturz, Timeout) wird die ganze Ausgabe eine Meldung.
 */
function parseFailures(name, { status, stderr, stdout, timedOut, aborted }) {
  if (timedOut) return [`${name}: Timeout`];
  if (aborted) return [`${name}: abgebrochen`];
  if (status === 0) return [];
  const out = [];
  for (const line of stderr.split("\n")) {
    const m = /^\s*✗\s?(.*)$/.exec(line);
    if (m) out.push(m[1]);
    else if (out.length && line.trim()) out[out.length - 1] += `\n${line}`;
  }
  if (!out.length) out.push((stderr || stdout).trim() || `Exit ${status}`);
  return out.map((m) => `${name}: ${m}`);
}

/**
 * Leeres Array = grün. Meldungen aus export.missing, check-parity und check-links
 * (beide gegen `siteDir`; Skripte aus <siteRoot>/scripts/).
 */
export async function runChecks(siteDir, exportResult, { siteRoot = DEFAULT_SITE_ROOT, timeoutMs = 120_000, signal } = {}) {
  const msgs = (exportResult?.missing ?? []).map((m) => `export: Pflichtangabe/Medium fehlt: ${m}`);
  const [parity, links] = await Promise.all(
    ["check-parity", "check-links"].map((s) =>
      runNode([join(siteRoot, "scripts", `${s}.mjs`), siteDir], { cwd: siteRoot, timeoutMs, signal }),
    ),
  );
  msgs.push(...parseFailures("check-parity", parity), ...parseFailures("check-links", links));
  return msgs;
}

const NOINDEX = '<meta name="robots" content="noindex">';
// <meta …> mit name="robots" (beliebige Attribut-Reihenfolge, Quotes, Groß-/Kleinschreibung).
const ROBOTS_META = /<meta\b(?=[^>]*\bname\s*=\s*(["']?)robots\1(?=[\s/>]))[^>]*>/gi;

/** Vorschau: robots-meta auf noindex setzen bzw. direkt nach <head> einfügen. */
export function injectNoindex(html) {
  if (ROBOTS_META.test(html)) {
    ROBOTS_META.lastIndex = 0;
    return html.replace(ROBOTS_META, NOINDEX);
  }
  const head = /<head\b[^>]*>/i.exec(html);
  if (!head) return NOINDEX + html;
  const at = head.index + head[0].length;
  return html.slice(0, at) + NOINDEX + html.slice(at);
}

/** injectNoindex auf jede .html-Datei unter dir anwenden; gibt die Anzahl zurück. */
export function injectNoindexDir(dir) {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) n += injectNoindexDir(full);
    else if (entry.endsWith(".html")) {
      writeFileSync(full, injectNoindex(readFileSync(full, "utf8")));
      n++;
    }
  }
  return n;
}
