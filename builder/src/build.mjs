// Builder-Kern: Export → Eleventy-Build in frischen Ordner → Checks → atomar umschalten.
//
// Arbeitsordner (workDir):
//   content-preview/   Export mit Entwürfen (nur Vorschau)
//   content-publish/   Export nur veröffentlichter Stände
//   preview/           Vorschau-Site (jede Seite noindex); wird pro Lauf neu gebaut
//   releases/<name>/   veröffentlichte Stände (die 10 neuesten + der aktuelle bleiben)
//   current → releases/<name>   Live-Zeiger (Symlink)
//
// Ein fehlgeschlagener Publish (Export-Fehler, missing, Build-Fehler, Timeout, roter Check)
// LÖSCHT seinen Release-Ordner wieder: current bleibt unverändert, in releases/ liegen nur
// gute Stände (die Zählung „10 behalten“ betrifft nur sie). Die Diagnose steht in `reason`.
//
// Der Builder importiert kein Payload: exportFn(outDir, { drafts }) wird injiziert
// (produktiv: (dir, o) => exportContent(payload, { outDir: dir, drafts: o.drafts })).
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { injectNoindexDir, runChecks } from "./checks.mjs";
import { runNode } from "./proc.mjs";
import { createReleaseDir, prune, switchCurrent } from "./releases.mjs";

export const BUILD_TIMEOUT_MS = 120_000;
export const KEEP_RELEASES = 10;

// Eleventy-Fehlerausgabe ohne Stacktrace-Zeilen und Dubletten (die Meldung steht doppelt drin).
const tail = (s, n = 20) => [
  ...new Set(
    s
      .split("\n")
      .filter((l) => !/^(\[11ty\])?\s+at\s/.test(l) && !/Original error stack trace/.test(l))
      .map((l) => l.trimEnd())
      .filter((l) => l.replace(/^\[11ty\]/, "").trim()),
  ),
].slice(-n).join("\n");

/** Eleventy aus <siteRoot>/node_modules als Kindprozess; cwd = siteRoot (Passthrough/bust sind cwd-relativ). */
async function eleventy({ siteRoot, contentDir, output, timeoutMs }) {
  const cmd = join(siteRoot, "node_modules/@11ty/eleventy/cmd.cjs");
  const r = await runNode([cmd, `--output=${output}`, "--quiet"], {
    cwd: siteRoot,
    env: { CONTENT_DIR: contentDir },
    timeoutMs,
  });
  if (r.timedOut) return `Eleventy: Timeout nach ${timeoutMs} ms`;
  if (r.status !== 0) return `Eleventy-Build fehlgeschlagen (Exit ${r.status}):\n${tail(r.stderr || r.stdout)}`;
  return null;
}

async function runExport(exportFn, contentDir, drafts) {
  rmSync(contentDir, { recursive: true, force: true });
  mkdirSync(contentDir, { recursive: true });
  const result = await exportFn(contentDir, { drafts });
  if (!result || !Array.isArray(result.missing)) throw new Error("exportFn lieferte kein { pages, missing }");
  return result;
}

/**
 * @param {object} o
 * @param {'preview'|'publish'} o.mode
 * @param {string} o.siteRoot   Repo-Root (Eleventy-Projekt, node_modules, scripts/)
 * @param {string} o.workDir    Arbeitsordner (siehe oben)
 * @param {(outDir: string, opts: {drafts: boolean}) => Promise<{pages: number, missing: string[]}>} o.exportFn
 * @param {number} [o.timeoutMs]   je Kindprozess (Eleventy, Checks), Default 120 s
 * @param {() => Date} [o.now]     Uhr für den Release-Namen (Tests)
 * @returns {Promise<{ok: true, release?: string, warnings?: string[]} | {ok: false, reason: string}>}
 */
export async function runBuild({ mode, siteRoot, workDir, exportFn, timeoutMs = BUILD_TIMEOUT_MS, now = () => new Date() }) {
  if (mode !== "preview" && mode !== "publish") return { ok: false, reason: `unbekannter mode ${JSON.stringify(mode)}` };
  siteRoot = resolve(siteRoot);
  workDir = resolve(workDir);
  mkdirSync(workDir, { recursive: true });
  const contentDir = join(workDir, `content-${mode}`);

  let exported;
  try {
    exported = await runExport(exportFn, contentDir, mode === "preview");
  } catch (err) {
    return { ok: false, reason: `Export fehlgeschlagen: ${err?.message ?? err}` };
  }

  if (mode === "preview") {
    // Vorschau: Entwürfe dürfen unvollständig sein → missing/Checks sind Hinweise, kein Abbruch.
    const output = join(workDir, "preview");
    rmSync(output, { recursive: true, force: true });
    const fail = await eleventy({ siteRoot, contentDir, output, timeoutMs });
    if (fail) return { ok: false, reason: fail };
    injectNoindexDir(output);
    const warnings = await runChecks(output, exported, { siteRoot, timeoutMs });
    return { ok: true, warnings };
  }

  // Publish: missing vor dem Build abfangen (spart den Build, Grund ist eindeutig).
  if (exported.missing.length) {
    return { ok: false, reason: exported.missing.map((m) => `export: Pflichtangabe/Medium fehlt: ${m}`).join("\n") };
  }
  const { name, dir } = createReleaseDir(workDir, now());
  const discard = (reason) => {
    rmSync(dir, { recursive: true, force: true });
    return { ok: false, reason };
  };
  try {
    const fail = await eleventy({ siteRoot, contentDir, output: dir, timeoutMs });
    if (fail) return discard(fail);
    const msgs = await runChecks(dir, exported, { siteRoot, timeoutMs });
    if (msgs.length) return discard(msgs.join("\n"));
    await switchCurrent(workDir, name);
  } catch (err) {
    return discard(`Publish fehlgeschlagen: ${err?.message ?? err}`);
  }
  // Live ist umgeschaltet; ein Aufräumfehler macht den Publish nicht rückgängig.
  try {
    await prune(workDir, KEEP_RELEASES);
  } catch (err) {
    return { ok: true, release: name, warnings: [`prune fehlgeschlagen: ${err?.message ?? err}`] };
  }
  return { ok: true, release: name };
}
