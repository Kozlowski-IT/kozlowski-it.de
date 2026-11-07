// Builder-Kern: Export → Eleventy-Build in frischen Ordner → Checks → atomar umschalten.
//
// Arbeitsordner (workDir):
//   content-preview/   Export mit Entwürfen (nur Vorschau)
//   content-publish/   Export nur veröffentlichter Stände
//   .previews/<id>/    Vorschau-Builds (jede Seite noindex + Auto-Reload über __build.txt); pro Lauf neu,
//                      nur aktueller + vorheriger Stand bleiben
//   preview → .previews/<id>   Vorschau-Zeiger (Symlink, RELATIVES Ziel, atomar umgebogen wie releases/current)
//   releases/.staging-<name>/   Build in Arbeit; erst nach grünen Checks → releases/<name>/
//   releases/<name>/   veröffentlichte Stände (die 10 neuesten + der aktuelle bleiben)
//   releases/current → <name>   Live-Zeiger (Symlink, relatives Ziel)
//
// nginx mountet den Elternordner releases/ read-only mit root …/releases/current —
// niemals den Symlink selbst mounten.
//
// Zeitbudget: timeoutMs (120 s) gilt für den GANZEN Lauf (Export + Eleventy + Checks).
// Kindprozesse bekommen die Restzeit, exportFn wird gegen die Restzeit gerannt, und direkt
// vor dem Umschalten wird die Deadline (und ein optionales AbortSignal) erneut geprüft:
// ein Lauf über der Deadline schaltet NIE um → { ok:false, reason:'timeout'|'aborted', phase }.
//
// Ein fehlgeschlagener Publish (Export-Fehler, missing, Build-Fehler, Timeout, roter Check)
// LÖSCHT seinen Staging-/Release-Ordner wieder: current bleibt unverändert, in releases/ liegen
// nur gute Stände (die Zählung „10 behalten“ betrifft nur sie). Die Diagnose steht in `reason`.
// Reste eines abgestürzten Laufs (.staging-*) räumt der nächste Publish bzw. prune weg.
// Annahme: genau EIN Builder pro workDir (Lock/Queue macht Task 10).
//
// Der Builder importiert kein Payload: exportFn(outDir, { drafts }) wird injiziert
// (produktiv: (dir, o) => exportContent(payload, { outDir: dir, drafts: o.drafts })).
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { injectNoindexDir, injectReloadDir, markBuild, runChecks } from "./checks.mjs";
import { randomBytes } from "node:crypto";
import { runNode } from "./proc.mjs";
import { atomicSymlink, cleanStaging, createStagingDir, promoteRelease, prune, switchCurrent } from "./releases.mjs";

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
async function eleventy({ siteRoot, contentDir, output, timeoutMs, signal }) {
  const cmd = join(siteRoot, "node_modules/@11ty/eleventy/cmd.cjs");
  const r = await runNode([cmd, `--output=${output}`, "--quiet"], {
    cwd: siteRoot,
    env: { CONTENT_DIR: contentDir },
    timeoutMs,
    signal,
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

const PREVIEWS = ".previews";

/** Ordner preview/ aus Plan 1 (kein Symlink) → .previews/legacy, damit preview/ Symlink werden kann. */
function adoptLegacyPreview(workDir) {
  const link = join(workDir, "preview");
  let st;
  try {
    st = lstatSync(link);
  } catch {
    return;
  }
  if (st.isSymbolicLink()) return;
  const legacy = join(workDir, PREVIEWS, "legacy");
  rmSync(legacy, { recursive: true, force: true });
  renameSync(link, legacy);
}

/** Alles in .previews/ außer den genannten Ständen löschen. */
function prunePreviews(workDir, keep) {
  const dir = join(workDir, PREVIEWS);
  for (const n of readdirSync(dir)) if (!keep.includes(n)) rmSync(join(dir, n), { recursive: true, force: true });
}

const STOP = Symbol("stop");

/** promise gegen Restzeit/Signal rennen; bei Ablauf STOP (die Promise läuft im Hintergrund weiter). */
function race(promise, ms, signal) {
  promise.catch(() => {}); // späte Ablehnung nach Timeout nicht als unhandled melden
  let timer;
  let onAbort;
  const stop = new Promise((res) => {
    timer = setTimeout(() => res(STOP), Math.max(0, ms));
    onAbort = () => res(STOP);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
  return Promise.race([promise, stop]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  });
}

/**
 * @param {object} o
 * @param {'preview'|'publish'} o.mode
 * @param {string} o.siteRoot   Repo-Root (Eleventy-Projekt, node_modules, scripts/)
 * @param {string} o.workDir    Arbeitsordner (siehe oben)
 * @param {(outDir: string, opts: {drafts: boolean}) => Promise<{pages: number, missing: string[]}>} o.exportFn
 * @param {number} [o.timeoutMs]   Budget für den ganzen Lauf, Default 120 s
 * @param {AbortSignal} [o.signal] Abbruch von außen (z. B. neuerer Stand, Task 10)
 * @param {() => Date} [o.now]     Uhr für den Release-Namen (Tests)
 * @param {() => number} [o.clock] Uhr (ms) für die Deadline (Tests), Default Date.now
 * @param {typeof runChecks} [o.checksFn] Checks (Tests), Default runChecks
 * @returns {Promise<{ok: true, release?: string, warnings?: string[]} |
 *                   {ok: false, reason: string, phase?: 'export'|'build'|'checks'|'switch'}>}
 */
export async function runBuild({
  mode,
  siteRoot,
  workDir,
  exportFn,
  timeoutMs = BUILD_TIMEOUT_MS,
  signal,
  now = () => new Date(),
  clock = Date.now,
  checksFn = runChecks,
}) {
  if (mode !== "preview" && mode !== "publish") return { ok: false, reason: `unbekannter mode ${JSON.stringify(mode)}` };
  siteRoot = resolve(siteRoot);
  workDir = resolve(workDir);
  const deadline = clock() + timeoutMs;
  const left = () => deadline - clock();
  const stopped = () => (signal?.aborted ? "aborted" : left() <= 0 ? "timeout" : null);
  mkdirSync(workDir, { recursive: true });
  const contentDir = join(workDir, `content-${mode}`);

  if (stopped()) return { ok: false, reason: stopped(), phase: "export" };
  let exported;
  try {
    exported = await race(runExport(exportFn, contentDir, mode === "preview"), left(), signal);
  } catch (err) {
    if (stopped()) return { ok: false, reason: stopped(), phase: "export" };
    return { ok: false, reason: `Export fehlgeschlagen: ${err?.message ?? err}` };
  }
  if (exported === STOP || stopped()) return { ok: false, reason: stopped() ?? "timeout", phase: "export" };

  if (mode === "preview") {
    // Vorschau: Entwürfe dürfen unvollständig sein → missing/Checks sind Hinweise, kein Abbruch.
    // Gebaut wird in .previews/<id>; erst nach den Checks wird preview → .previews/<id> umgebogen.
    // Ein fehlgeschlagener/abgebrochener Lauf löscht seinen Ordner, die alte Vorschau bleibt stehen.
    const buildId = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
    const output = join(workDir, PREVIEWS, buildId);
    const discard = (r) => {
      rmSync(output, { recursive: true, force: true });
      return r;
    };
    mkdirSync(join(workDir, PREVIEWS), { recursive: true });
    try {
      const fail = await eleventy({ siteRoot, contentDir, output, timeoutMs: left(), signal });
      if (stopped()) return discard({ ok: false, reason: stopped(), phase: "build" });
      if (fail) return discard({ ok: false, reason: fail });
      injectNoindexDir(output);
      // Auto-Reload der offenen Vorschau (nur hier, nie im Publish): Tag + Skript jetzt,
      // __build.txt erst nach den Checks → Seiten laden erst neu, wenn die Vorschau fertig ist.
      injectReloadDir(output, buildId);
      const warnings = await checksFn(output, exported, { siteRoot, timeoutMs: left(), signal });
      if (stopped()) return discard({ ok: false, reason: stopped(), phase: "checks" });
      markBuild(output, buildId);
      adoptLegacyPreview(workDir);
      const link = join(workDir, "preview");
      const previous = existsSync(link) && lstatSync(link).isSymbolicLink() ? readlinkSync(link).slice(PREVIEWS.length + 1) : null;
      await atomicSymlink(link, `${PREVIEWS}/${buildId}`);
      try {
        prunePreviews(workDir, [buildId, previous ?? (existsSync(join(workDir, PREVIEWS, "legacy")) ? "legacy" : "")]);
      } catch (err) {
        warnings.push(`Aufräumen der Vorschauen fehlgeschlagen: ${err?.message ?? err}`);
      }
      return { ok: true, warnings, buildId };
    } catch (err) {
      return discard({ ok: false, reason: `Vorschau fehlgeschlagen: ${err?.message ?? err}` });
    }
  }

  // Publish: missing vor dem Build abfangen (spart den Build, Grund ist eindeutig).
  if (exported.missing.length) {
    return { ok: false, reason: exported.missing.map((m) => `export: Pflichtangabe/Medium fehlt: ${m}`).join("\n") };
  }
  cleanStaging(workDir); // Reste eines abgestürzten Laufs
  const { name, dir: staging } = createStagingDir(workDir, now());
  let dir = staging;
  const discard = (reason, phase) => {
    rmSync(dir, { recursive: true, force: true });
    return phase ? { ok: false, reason, phase } : { ok: false, reason };
  };
  try {
    const fail = await eleventy({ siteRoot, contentDir, output: staging, timeoutMs: left(), signal });
    if (stopped()) return discard(stopped(), "build");
    if (fail) return discard(fail);
    const msgs = await checksFn(staging, exported, { siteRoot, timeoutMs: left(), signal });
    if (msgs.length && !stopped()) return discard(msgs.join("\n"));
    // Letzte Prüfung VOR dem Umschalten: über der Deadline (oder abgebrochen) wird nie live geschaltet,
    // auch wenn alles grün war — sonst meldet Task 10 „timeout“, und die Site geht trotzdem live.
    if (stopped()) return discard(stopped(), "switch");
    dir = await promoteRelease(workDir, name);
    if (stopped()) return discard(stopped(), "switch");
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
