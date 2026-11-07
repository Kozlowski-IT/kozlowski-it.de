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

// ---------------------------------------------------------------- Vorschau-Reload
//
// Nur die Vorschau: jede Seite bekommt <script src="/__reload.js" data-build="<id>" defer>.
// Das Skript fragt alle 1,5 s /__build.txt ab (cache: no-store) und lädt neu, sobald dort eine
// andere Build-ID steht. Externe Datei vom selben Ursprung → passt zu script-src/connect-src 'self'.
// Die Live-Ausgabe (Publish) bekommt das nie.
export const RELOAD_SCRIPT = "__reload.js";
export const BUILD_ID_FILE = "__build.txt";
export const RELOAD_JS = `(function () {
  var s = document.currentScript, mine = s && s.getAttribute("data-build");
  if (!mine || !window.fetch) return;
  setInterval(function () {
    fetch("/${BUILD_ID_FILE}", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (id) { id = id.trim(); if (id && id !== mine) location.reload(); })
      .catch(function () {});
  }, 1500);
})();
`;

const RELOAD_TAG = /<script\b[^>]*\bsrc="\/__reload\.js"[^>]*><\/script>/gi;

/** Reload-Tag (mit Build-ID) vor </head> setzen; vorhandene ersetzen. */
export function injectReload(html, buildId) {
  const tag = `<script src="/${RELOAD_SCRIPT}" data-build="${buildId}" defer></script>`;
  html = html.replace(RELOAD_TAG, "");
  const end = /<\/head>/i.exec(html);
  if (!end) return html + tag;
  return html.slice(0, end.index) + tag + html.slice(end.index);
}

/** Vorschau-Ordner: Tag in jede .html, __reload.js schreiben. __build.txt schreibt markBuild am Ende. */
export function injectReloadDir(dir, buildId, root = dir) {
  if (!/^[A-Za-z0-9_-]+$/.test(buildId)) throw new Error(`Build-ID ungültig: ${buildId}`);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) injectReloadDir(full, buildId, root);
    else if (entry.endsWith(".html")) writeFileSync(full, injectReload(readFileSync(full, "utf8"), buildId));
  }
  if (dir === root) writeFileSync(join(dir, RELOAD_SCRIPT), RELOAD_JS);
}

/** Build-ID veröffentlichen (zuletzt, wenn die Vorschau fertig ist) → offene Seiten laden neu. */
export function markBuild(dir, buildId) {
  writeFileSync(join(dir, BUILD_ID_FILE), `${buildId}\n`);
}
