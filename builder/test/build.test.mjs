// Builder-Kern (Task 9): bauen, prüfen, atomar umschalten, zurück.
// Echte Eleventy-Builds gegen die Root-Fixtures; Payload wird durch fakeExport ersetzt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runBuild } from "../src/build.mjs";
import { listReleases, prune, rollback } from "../src/releases.mjs";
import { SITE_ROOT, fakeExport, tempWorkDir } from "./helpers.mjs";

// Live-Zeiger liegt IN releases/ (nginx mountet releases/, root …/releases/current).
const currentTarget = (workDir) => readlinkSync(join(workDir, "releases", "current"));
const currentRelease = (workDir) => currentTarget(workDir);
const live = (workDir, ...p) => join(workDir, "releases", "current", ...p);

function walkHtml(dir) {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walkHtml(full) : e.endsWith(".html") ? [full] : [];
  });
}

// Uhr, die pro Aufruf eine Sekunde weiterläuft (12 Publishes ohne echtes Warten).
function tickingClock(start = Date.UTC(2026, 10, 7, 12, 0, 0)) {
  let t = start;
  return () => new Date((t += 1000));
}

const publish = (workDir, exportFn, extra = {}) =>
  runBuild({ mode: "publish", siteRoot: SITE_ROOT, workDir, exportFn, ...extra });

test("(a) erfolgreicher Publish: current zeigt auf den neuen Release", async (t) => {
  const workDir = tempWorkDir(t);
  const exportFn = fakeExport();
  const r = await publish(workDir, exportFn);
  assert.equal(r.ok, true, r.reason);
  assert.match(r.release, /^\d{4}-\d{2}-\d{2}_\d{6}$/);
  assert.equal(currentTarget(workDir), r.release, "relativer Symlink auf Geschwister-Ordner");
  assert.ok(!existsSync(join(workDir, "current")), "kein Zeiger mehr im workDir");
  assert.ok(existsSync(live(workDir, "index.html")));
  assert.ok(existsSync(live(workDir, "assets/media/fixture-portrait.png")), "Medium an publicPath");
  assert.deepEqual(exportFn.calls.map((c) => [c.outDir, c.drafts]), [[join(workDir, "content-publish"), false]]);
  // Live-HTML ohne Vorschau-noindex auf normalen Seiten
  assert.doesNotMatch(readFileSync(live(workDir, "it-betreuung/index.html"), "utf8"), /name="robots"/);
  assert.ok(!existsSync(join(workDir, "releases", "current.tmp")));
  assert.deepEqual(readdirSync(join(workDir, "releases")).sort(), ["current", r.release].sort(), "kein Staging-Rest");
});

test("(b) export.missing → ok:false mit Pfad im Grund, current unverändert, kein Release übrig", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  assert.equal(good.ok, true, good.reason);
  const r = await publish(workDir, fakeExport({ missing: ["home/en/title"] }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /home\/en\/title/);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("(c) toter interner Link (geänderter Slug) → rot, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  assert.equal(good.ok, true, good.reason);
  // Seite vmware-ausstieg bekommt neuen Slug; ein anderer Text verlinkt weiter /vmware-ausstieg/.
  const exportFn = fakeExport({
    mutate: (pages) => {
      pages.find((p) => p.translationKey === "vmware-ausstieg").locales.de.slug = "vmware-exit";
    },
  });
  const r = await publish(workDir, exportFn);
  assert.equal(r.ok, false);
  assert.match(r.reason, /check-links/);
  assert.match(r.reason, /\/vmware-ausstieg\//);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("(d) fehlendes Medium → rot, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  assert.equal(good.ok, true, good.reason);
  // Export liefert die Datei nicht mit (Medien-Manifest leer), Seite referenziert das Bild weiter.
  const exportFn = fakeExport({
    mutate: (_pages, outDir) => {
      rmSync(join(outDir, "media"), { recursive: true });
    },
  });
  const r = await publish(workDir, exportFn);
  assert.equal(r.ok, false);
  assert.match(r.reason, /fixture-portrait\.png/);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("(e) 12 Publishes → 10 Releases übrig, current darunter (neuester)", async (t) => {
  const workDir = tempWorkDir(t);
  const now = tickingClock();
  const exportFn = fakeExport();
  const made = [];
  for (let i = 0; i < 12; i++) {
    const r = await publish(workDir, exportFn, { now });
    assert.equal(r.ok, true, r.reason);
    made.push(r.release);
  }
  const left = listReleases(workDir);
  assert.equal(left.length, 10);
  assert.deepEqual(left, made.slice(2).reverse(), "neueste zuerst, die zwei ältesten gelöscht");
  assert.equal(currentRelease(workDir), made[11]);
  assert.ok(left.includes(currentRelease(workDir)));
});

test("(e2) prune löscht nie den Release, auf den current zeigt (nach Rollback)", async (t) => {
  const workDir = tempWorkDir(t);
  const now = tickingClock();
  const exportFn = fakeExport();
  const made = [];
  for (let i = 0; i < 11; i++) made.push((await publish(workDir, exportFn, { now })).release);
  assert.ok(!listReleases(workDir).includes(made[0]), "11 → 10");
  // current auf den ältesten verbleibenden Release, dann hart auf 3 kürzen.
  await rollback(workDir, made[1]);
  await prune(workDir, 3);
  const left = listReleases(workDir);
  assert.ok(left.includes(made[1]), "current-Release bleibt");
  assert.deepEqual(left, [made[10], made[9], made[8], made[1]]);
  assert.equal(currentRelease(workDir), made[1]);
});

test("(f) rollback auf älteren Release → current zeigt dorthin; fehlender Release → Fehler", async (t) => {
  const workDir = tempWorkDir(t);
  const now = tickingClock();
  const exportFn = fakeExport();
  const first = await publish(workDir, exportFn, { now });
  const second = await publish(workDir, exportFn, { now });
  assert.equal(currentRelease(workDir), second.release);
  await rollback(workDir, first.release);
  assert.equal(currentRelease(workDir), first.release);
  assert.ok(existsSync(live(workDir, "index.html")));
  await assert.rejects(() => rollback(workDir, "2000-01-01_000000"), /fehlt/);
  await assert.rejects(() => rollback(workDir, "../preview"), /ungültig/);
  assert.equal(currentRelease(workDir), first.release, "Fehlschlag ändert current nicht");
});

test("(g) Preview schreibt nur nach preview/, jede Seite hat noindex, Drafts-Export", async (t) => {
  const workDir = tempWorkDir(t);
  const exportFn = fakeExport();
  const r = await runBuild({ mode: "preview", siteRoot: SITE_ROOT, workDir, exportFn });
  assert.equal(r.ok, true, r.reason);
  assert.equal(r.release, undefined);
  assert.deepEqual(exportFn.calls.map((c) => [c.outDir, c.drafts]), [[join(workDir, "content-preview"), true]]);
  assert.deepEqual(readdirSync(workDir).sort(), ["content-preview", "preview"]);
  const pages = walkHtml(join(workDir, "preview"));
  assert.ok(pages.length >= 8, `zu wenig Seiten: ${pages.length}`);
  for (const f of pages) {
    const html = readFileSync(f, "utf8");
    const metas = html.match(/<meta[^>]*name="robots"[^>]*>/g) ?? [];
    assert.equal(metas.length, 1, `${f}: genau ein robots-meta`);
    assert.match(metas[0], /content="noindex"/, f);
  }
  // Seite mit eigenem robots-meta (impressum: noindex aus Inhalt) und ohne (Startseite) — beide genau eins.
  assert.match(readFileSync(join(workDir, "preview/index.html"), "utf8"), /<meta name="robots" content="noindex">/);
});

test("Release-Namen im selben Sekundentakt bleiben eindeutig", async (t) => {
  const workDir = tempWorkDir(t);
  const fixed = () => new Date(Date.UTC(2026, 10, 7, 12, 0, 0));
  const exportFn = fakeExport();
  const a = await publish(workDir, exportFn, { now: fixed });
  const b = await publish(workDir, exportFn, { now: fixed });
  const c = await publish(workDir, exportFn, { now: fixed });
  assert.deepEqual([a.release, b.release, c.release], ["2026-11-07_120000", "2026-11-07_120000-2", "2026-11-07_120000-3"]);
  assert.deepEqual(listReleases(workDir), [c.release, b.release, a.release]);
  assert.equal(currentRelease(workDir), c.release);
});

test("Timeout bricht den Build ab, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const r = await publish(workDir, fakeExport(), { timeoutMs: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "timeout");
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("Export wirft → ok:false, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const r = await publish(workDir, async () => {
    throw new Error("DB weg");
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /DB weg/);
  assert.equal(currentRelease(workDir), good.release);
});

// --- Fix-Runde 1: Gesamt-Deadline, Staging, Zeiger in releases/ ---

test("Deadline: langsamer Export → timeout, current unverändert, nichts in releases/ dazu", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const fast = fakeExport();
  let background;
  const slow = (outDir, o) =>
    (background = new Promise((r) => setTimeout(r, 2000)).then(() => fast(outDir, o)));
  const t0 = Date.now();
  const r = await publish(workDir, slow, { timeoutMs: 300 });
  const elapsed = Date.now() - t0;
  await background; // Export läuft im Hintergrund zu Ende; erst danach Temp-Ordner aufräumen
  assert.ok(elapsed < 1500, `wartet nicht auf den Export (${elapsed} ms)`);
  assert.deepEqual([r.ok, r.reason, r.phase], [false, "timeout", "export"]);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("Deadline: Lauf überschreitet sie nach grünen Checks → kein Umschalten, Release verworfen", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  let fake = 1_000_000;
  const clock = () => fake;
  let checked = false;
  const checksFn = async () => {
    checked = true;
    fake += 200_000; // Checks waren „grün“, aber die Uhr steht jetzt hinter der Deadline
    return [];
  };
  const r = await publish(workDir, fakeExport(), { clock, checksFn });
  assert.ok(checked);
  assert.deepEqual([r.ok, r.reason, r.phase], [false, "timeout", "switch"]);
  assert.equal(currentRelease(workDir), good.release, "current NICHT umgeschaltet");
  assert.deepEqual(listReleases(workDir), [good.release]);
  assert.deepEqual(readdirSync(join(workDir, "releases")).sort(), ["current", good.release].sort());
});

test("Deadline: Kontrolle — gleiche Uhr ohne Überschreitung schaltet um", async (t) => {
  const workDir = tempWorkDir(t);
  let fake = 1_000_000;
  const r = await publish(workDir, fakeExport(), { clock: () => fake, checksFn: async () => ((fake += 1000), []) });
  assert.equal(r.ok, true, r.reason);
  assert.equal(currentRelease(workDir), r.release);
});

test("Deadline: Eleventy über der Restzeit wird abgebrochen → timeout/build, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const t0 = Date.now();
  const r = await publish(workDir, fakeExport(), { timeoutMs: 150 }); // Eleventy braucht ~0,7 s
  const elapsed = Date.now() - t0;
  assert.deepEqual([r.ok, r.reason, r.phase], [false, "timeout", "build"]);
  // Restzeit an den Kindprozess: er wird bei der Deadline getötet, nicht erst nach 120 s / Build-Ende.
  assert.ok(elapsed < 500, `Eleventy nicht bei der Deadline beendet (${elapsed} ms)`);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(readdirSync(join(workDir, "releases")).sort(), ["current", good.release].sort());
});

test("AbortSignal bricht ab → aborted, current unverändert", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const ac = new AbortController();
  const r = await publish(workDir, fakeExport(), { signal: ac.signal, checksFn: async () => (ac.abort(), []) });
  assert.deepEqual([r.ok, r.reason], [false, "aborted"]);
  assert.equal(currentRelease(workDir), good.release);
  assert.deepEqual(listReleases(workDir), [good.release]);
});

test("Staging: Build läuft in releases/.staging-<name>, erst nach grünen Checks umbenannt", async (t) => {
  const workDir = tempWorkDir(t);
  let seen;
  const checksFn = async (siteDir) => {
    seen = siteDir;
    assert.ok(existsSync(join(siteDir, "index.html")));
    assert.deepEqual(listReleases(workDir), [], "Staging ist kein Release");
    return [];
  };
  const r = await publish(workDir, fakeExport(), { checksFn });
  assert.equal(r.ok, true, r.reason);
  assert.equal(seen, join(workDir, "releases", `.staging-${r.release}`));
  assert.ok(!existsSync(seen));
  assert.ok(existsSync(join(workDir, "releases", r.release, "index.html")));
});

test("Staging: verwaiste .staging-* nicht gelistet, nicht rollback-fähig, von prune entfernt", async (t) => {
  const workDir = tempWorkDir(t);
  const good = await publish(workDir, fakeExport());
  const orphan = join(workDir, "releases", ".staging-2026-01-01_000000");
  mkdirSync(orphan);
  writeFileSync(join(orphan, "index.html"), "halb");
  assert.deepEqual(listReleases(workDir), [good.release]);
  await assert.rejects(() => rollback(workDir, ".staging-2026-01-01_000000"), /ungültig/);
  await assert.rejects(() => rollback(workDir, "current"), /ungültig/);
  assert.equal(currentRelease(workDir), good.release);
  await prune(workDir, 10);
  assert.ok(!existsSync(orphan), "prune räumt Staging-Reste");
  assert.equal(currentRelease(workDir), good.release);
});

test("Staging: Rest eines abgestürzten Laufs wird beim nächsten Publish entfernt", async (t) => {
  const workDir = tempWorkDir(t);
  mkdirSync(join(workDir, "releases", ".staging-2026-01-01_000000"), { recursive: true });
  const r = await publish(workDir, fakeExport());
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(readdirSync(join(workDir, "releases")).sort(), ["current", r.release].sort());
});
