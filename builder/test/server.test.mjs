// Builder-HTTP-Dienst + Warteschlange (Task 10).
// Schnelle Tests mit Fake-buildFn (Reihenfolge, Koaleszieren, Auth, Härtung) und
// Integrationstests mit echtem runBuild (Releases nur aus Publish, Timeout, Export-Zaun).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join, resolve } from "node:path";
import { runBuild } from "../src/build.mjs";
import { createQueue } from "../src/queue.mjs";
import { createBuilderServer } from "../src/server.mjs";
import { SITE_ROOT, fakeExport, tempWorkDir } from "./helpers.mjs";

const TOKEN = "t".repeat(40);
const silent = { log() {}, error() {} };
// roter Test (z. B. Mutationsprobe) soll scheitern statt hängen
const T = { timeout: 30_000 };

/** Steuerbares Versprechen. */
function gate() {
  let open;
  const p = new Promise((r) => (open = r));
  return { p, open };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/** Server auf freiem Port starten; t.after schließt ihn. */
async function start(t, opts) {
  const svc = createBuilderServer({ token: TOKEN, siteRoot: SITE_ROOT, log: silent, ...opts });
  const { port } = await svc.listen(0);
  // close wartet auf die Warteschlange; ein roter Test kann Fake-Tore offen lassen → begrenzen
  t.after(async () => {
    await Promise.race([svc.close(), tick(2000)]);
    svc.server.closeAllConnections(); // hängende Publish-Anfragen eines roten Tests kappen
  });
  const base = `http://127.0.0.1:${port}`;
  const call = (method, path, { body, token = TOKEN, headers = {} } = {}) =>
    fetch(base + path, {
      method,
      headers: { ...(token != null ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => null) }));
  return { svc, call, base };
}

/**
 * Fake-buildFn: protokolliert Start/Ende und Parallelität; jeder Lauf wartet auf ein Tor,
 * das der Test öffnet (oder `auto` = sofort fertig). `state()` liefert den „Inhaltsstand“,
 * den der Lauf beim Start (= Export) sieht.
 */
function fakeBuild({ state = () => null, auto = false } = {}) {
  const runs = [];
  let active = 0;
  const fn = async (o) => {
    active++;
    fn.maxActive = Math.max(fn.maxActive, active);
    const run = { mode: o.mode, saw: state(), gate: gate() };
    runs.push(run);
    if (auto) run.gate.open();
    await run.gate.p;
    active--;
    return o.mode === "publish" ? { ok: true, release: `r${runs.length}` } : { ok: true, warnings: [] };
  };
  fn.runs = runs;
  fn.maxActive = 0;
  /** wartet, bis Lauf i gestartet ist */
  fn.started = async (i) => {
    while (runs.length <= i) await tick(5);
    return runs[i];
  };
  return fn;
}

// ---------------------------------------------------------------- Start / Auth

test("Start verweigert: BUILDER_TOKEN fehlt oder < 32 Zeichen", T, () => {
  for (const token of [undefined, "", "x".repeat(31)]) {
    assert.throws(() => createBuilderServer({ token, siteRoot: SITE_ROOT, workDir: "/nonexistent", exportFn() {} }), /BUILDER_TOKEN/);
  }
});

test("ohne / mit falschem Token → 401, kein Build", T, async (t) => {
  const buildFn = fakeBuild({ auto: true });
  const { call } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  for (const token of [null, "falsch", "t".repeat(39) + "u", "t".repeat(41)]) {
    for (const [m, p] of [["POST", "/preview"], ["POST", "/publish"], ["GET", "/releases"], ["POST", "/rollback"]]) {
      const r = await call(m, p, { token, body: m === "POST" ? {} : undefined });
      assert.equal(r.status, 401, `${m} ${p} token=${token}`);
    }
  }
  // falsches Schema
  assert.equal((await call("GET", "/releases", { token: null, headers: { authorization: `Basic ${TOKEN}` } })).status, 401);
  assert.equal((await call("GET", "/releases", { token: null, headers: { authorization: TOKEN } })).status, 401);
  assert.equal(buildFn.runs.length, 0);
  // Kontrolle: richtiges Token
  assert.equal((await call("GET", "/releases")).status, 200);
});

// ---------------------------------------------------------------- Härtung

test("nur dokumentierte Routen/Methoden: 404/405; Body-Limit 413; kaputtes JSON 400", T, async (t) => {
  const buildFn = fakeBuild({ auto: true });
  const { call } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  assert.equal((await call("GET", "/nix")).status, 404);
  assert.equal((await call("POST", "/releases/../x")).status, 404);
  assert.equal((await call("GET", "/publish")).status, 405);
  assert.equal((await call("PUT", "/preview", { body: {} })).status, 405);
  assert.equal((await call("POST", "/releases", { body: {} })).status, 405);
  assert.equal((await call("DELETE", "/rollback")).status, 405);
  assert.equal((await call("POST", "/rollback", { body: "{kaputt" })).status, 400);
  assert.equal((await call("POST", "/rollback", { body: "[]" })).status, 400);
  const big = JSON.stringify({ release: "x", pad: "y".repeat(20_000) });
  assert.equal((await call("POST", "/rollback", { body: big })).status, 413);
  assert.equal((await call("POST", "/publish", { body: big })).status, 413);
  assert.equal(buildFn.runs.length, 0, "abgelehnte Anfragen starten keinen Lauf");
});

test("Body-Limit greift auch ohne Content-Length (chunked)", T, async (t) => {
  const buildFn = fakeBuild({ auto: true });
  const { base } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  const status = await new Promise((ok, fail) => {
    const req = request(base + "/rollback", { method: "POST", headers: { authorization: `Bearer ${TOKEN}` } }, (res) => {
      res.resume();
      ok(res.statusCode);
    });
    req.on("error", fail);
    for (let i = 0; i < 20; i++) req.write("x".repeat(1024)); // 20 KB in Stücken, kein Content-Length
    req.end();
  });
  assert.equal(status, 413);
  assert.equal(buildFn.runs.length, 0);
});

test("rollback: ungültiger Name (Pfad-Ausbruch) → 400, fehlender Release → 404, vorhandener → 200", T, async (t) => {
  const workDir = tempWorkDir(t);
  for (const n of ["2026-11-01_120000", "2026-11-02_120000"]) mkdirSync(join(workDir, "releases", n), { recursive: true });
  const { call } = await start(t, { workDir, exportFn() {}, buildFn: fakeBuild({ auto: true }) });
  for (const release of ["../etc", "current", ".staging-2026-11-01_120000", "2026-11-01_120000/../../x", 42, undefined]) {
    const r = await call("POST", "/rollback", { body: { release } });
    assert.equal(r.status, 400, JSON.stringify(release));
    assert.equal(r.json.ok, false);
  }
  const missing = await call("POST", "/rollback", { body: { release: "2026-11-03_120000" } });
  assert.equal(missing.status, 404);
  assert.equal(missing.json.ok, false);
  assert.match(missing.json.reason, /fehlt/);
  const ok = await call("POST", "/rollback", { body: { release: "2026-11-01_120000" } });
  assert.deepEqual([ok.status, ok.json], [200, { ok: true, release: "2026-11-01_120000" }]);
  const list = await call("GET", "/releases");
  assert.deepEqual(list.json, { current: "2026-11-01_120000", releases: ["2026-11-02_120000", "2026-11-01_120000"] });
});

test("GET /releases ohne Releases → {current:null, releases:[]}", T, async (t) => {
  const { call } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn: fakeBuild({ auto: true }) });
  assert.deepEqual((await call("GET", "/releases")).json, { current: null, releases: [] });
});

// ---------------------------------------------------------------- Warteschlange

test("3× /preview schnell → 202, genau 2 Builds, der letzte sieht den letzten Stand", T, async (t) => {
  let version = 0;
  const buildFn = fakeBuild({ state: () => version });
  const { call, svc } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  const statuses = [];
  for (let i = 0; i < 3; i++) {
    version++;
    statuses.push((await call("POST", "/preview")).status);
  }
  assert.deepEqual(statuses, [202, 202, 202]);
  (await buildFn.started(0)).gate.open();
  (await buildFn.started(1)).gate.open();
  await svc.queue.idle();
  assert.equal(buildFn.runs.length, 2, "erster läuft, die zwei wartenden kollabieren zu einem");
  assert.equal(buildFn.runs.at(-1).saw, 3, "letzter Stand gewinnt");
  assert.equal(buildFn.maxActive, 1);
});

test("/preview läuft + /publish kommt → Publish danach, vor wartenden Previews; Publish nie verworfen", T, async (t) => {
  const buildFn = fakeBuild();
  const { call, svc } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  assert.equal((await call("POST", "/preview")).status, 202);
  const first = await buildFn.started(0);
  await call("POST", "/preview"); // wartet
  const pub1 = call("POST", "/publish");
  const pub2 = call("POST", "/publish");
  await tick(50);
  await call("POST", "/preview"); // ersetzt die wartende Preview
  assert.deepEqual(svc.queue.state(), { running: "preview", pending: ["publish", "publish", "preview"] });
  first.gate.open();
  (await buildFn.started(1)).gate.open();
  (await buildFn.started(2)).gate.open();
  (await buildFn.started(3)).gate.open();
  const [r1, r2] = await Promise.all([pub1, pub2]);
  await svc.queue.idle();
  assert.deepEqual(buildFn.runs.map((r) => r.mode), ["preview", "publish", "publish", "preview"]);
  assert.deepEqual([r1.status, r1.json], [200, { ok: true, release: "r2" }]);
  assert.deepEqual([r2.status, r2.json], [200, { ok: true, release: "r3" }]);
  assert.equal(buildFn.maxActive, 1);
});

test("Publish und Rollback FIFO untereinander, beide vor wartender Preview, nie parallel", T, async (t) => {
  const workDir = tempWorkDir(t);
  mkdirSync(join(workDir, "releases", "2026-11-01_120000"), { recursive: true });
  const order = [];
  const buildFn = fakeBuild();
  const wrapped = async (o) => {
    order.push(`${o.mode}:start`);
    const r = await buildFn(o);
    order.push(`${o.mode}:end`);
    return r;
  };
  const { call, svc } = await start(t, { workDir, exportFn() {}, buildFn: wrapped });
  await call("POST", "/preview");
  const first = await buildFn.started(0);
  const rb = call("POST", "/rollback", { body: { release: "2026-11-01_120000" } });
  await tick(30);
  const pub = call("POST", "/publish");
  await tick(30);
  await call("POST", "/preview");
  assert.deepEqual(svc.queue.state(), { running: "preview", pending: ["rollback", "publish", "preview"] });
  // Rollback darf nicht neben dem laufenden Build passieren
  await tick(30);
  assert.equal(existsSync(join(workDir, "releases", "current")), false, "rollback wartet auf den laufenden Lauf");
  first.gate.open();
  assert.deepEqual((await rb).json, { ok: true, release: "2026-11-01_120000" });
  (await buildFn.started(1)).gate.open();
  assert.equal((await pub).json.ok, true);
  (await buildFn.started(2)).gate.open();
  await svc.queue.idle();
  assert.deepEqual(order, ["preview:start", "preview:end", "publish:start", "publish:end", "preview:start", "preview:end"]);
});

test("createQueue: ersetzte Preview-Aufrufer bekommen das Ergebnis des späteren Laufs", T, async () => {
  const g = gate();
  const runs = [];
  const q = createQueue(async (kind, data) => {
    runs.push(data);
    if (runs.length === 1) await g.p;
    return { ok: true, saw: data };
  });
  const p1 = q.enqueue("preview", 1);
  const p2 = q.enqueue("preview", 2);
  const p3 = q.enqueue("preview", 3);
  g.open();
  assert.deepEqual(await Promise.all([p1, p2, p3]), [{ ok: true, saw: 1 }, { ok: true, saw: 3 }, { ok: true, saw: 3 }]);
  assert.deepEqual(runs, [1, 3]);
});

test("createQueue: Job wirft → {ok:false, reason}, nächster Job läuft", T, async () => {
  const seen = [];
  const q = createQueue(async (kind) => {
    seen.push(kind);
    if (kind === "publish") throw new Error("kaputt");
    return { ok: true };
  });
  const r = await q.enqueue("publish");
  assert.equal(r.ok, false);
  assert.match(r.reason, /kaputt/);
  assert.deepEqual(await q.enqueue("preview"), { ok: true });
  assert.deepEqual(seen, ["publish", "preview"]);
});

test("Publish-Fehler → HTTP 200 mit {ok:false, reason}", T, async (t) => {
  const buildFn = async () => ({ ok: false, reason: "check-links: /index.html: kaputt" });
  const { call } = await start(t, { workDir: tempWorkDir(t), exportFn() {}, buildFn });
  const r = await call("POST", "/publish");
  assert.deepEqual([r.status, r.json], [200, { ok: false, reason: "check-links: /index.html: kaputt" }]);
});

test("runBuild bekommt mode, siteRoot, workDir, timeoutMs (in ms konfigurierbar) und einen Export", T, async (t) => {
  const workDir = tempWorkDir(t);
  let seen;
  const buildFn = async (o) => ((seen = o), { ok: true, release: "x" });
  const { call } = await start(t, { workDir, exportFn() {}, buildFn, timeoutMs: 1234 });
  await call("POST", "/publish");
  assert.equal(seen.mode, "publish");
  assert.equal(seen.siteRoot, resolve(SITE_ROOT));
  assert.equal(seen.workDir, workDir);
  assert.equal(seen.timeoutMs, 1234);
  assert.equal(typeof seen.exportFn, "function");
});

// ---------------------------------------------------------------- mit echtem runBuild

test("echt: /preview läuft + /publish kommt → releases/ enthält nur das Publish-Ergebnis", T, async (t) => {
  const workDir = tempWorkDir(t);
  const exportFn = fakeExport();
  const { call, svc } = await start(t, { workDir, exportFn });
  assert.equal((await call("POST", "/preview")).status, 202);
  await tick(30);
  assert.equal(svc.queue.state().running, "preview");
  const pub = await call("POST", "/publish");
  assert.equal(pub.status, 200);
  assert.equal(pub.json.ok, true, pub.json.reason);
  await svc.queue.idle();
  assert.deepEqual(exportFn.calls.map((c) => c.drafts), [true, false], "Preview zuerst, dann Publish");
  assert.deepEqual(readdirSync(join(workDir, "releases")).sort(), ["current", pub.json.release].sort());
  assert.deepEqual((await call("GET", "/releases")).json, { current: pub.json.release, releases: [pub.json.release] });
  assert.match(readFileSync(join(workDir, "preview", "index.html"), "utf8"), /content="noindex"/);
});

test("echt: hängender Export → nach Timeout {ok:false, reason:'timeout'}, nächster Job läuft", T, async (t) => {
  const workDir = tempWorkDir(t);
  const real = fakeExport();
  let calls = 0;
  const exportFn = (dir, o) => (++calls === 1 ? new Promise(() => {}) : real(dir, o)); // erster hängt für immer
  const { call } = await start(t, {
    workDir,
    exportFn,
    timeoutMs: 4000,
    buildFn: (o) => runBuild({ ...o, checksFn: async () => [] }),
  });
  const t0 = Date.now();
  const first = await call("POST", "/publish");
  const took = Date.now() - t0;
  assert.equal(first.status, 200);
  assert.equal(first.json.ok, false);
  assert.equal(first.json.reason, "timeout");
  assert.ok(took >= 3900 && took < 6000, `Timeout griff nach ${took} ms`);
  const second = await call("POST", "/publish");
  assert.equal(second.json.ok, true, second.json.reason);
  assert.equal((await call("GET", "/releases")).json.current, second.json.release);
});

test("echt: Zaun — ein zu spät fertiger Export schreibt nie in den content-Ordner des nächsten Laufs", T, async (t) => {
  const workDir = tempWorkDir(t);
  const real = fakeExport();
  const late = gate();
  let lateSettled;
  let calls = 0;
  const exportFn = (dir, o) => {
    const n = ++calls;
    const p = (async () => {
      if (n === 1) await late.p; // erster Export hängt, bis der Test ihn freigibt
      const r = await real(dir, o);
      writeFileSync(join(dir, "marker.txt"), n === 1 ? "SPAET" : "NEU");
      return r;
    })();
    if (n === 1) lateSettled = p.then(() => "ok", () => "err");
    return p;
  };
  let seenDuringChecks;
  const checksFn = async () => {
    if (calls === 2) {
      // Lauf 2 hat exportiert; jetzt den alten Export fertig werden lassen …
      late.open();
      await lateSettled;
      await tick(50);
      // … er darf content-publish/ von Lauf 2 nicht überschrieben haben.
      seenDuringChecks = readFileSync(join(workDir, "content-publish", "marker.txt"), "utf8");
    }
    return [];
  };
  const { call } = await start(t, { workDir, exportFn, timeoutMs: 2500, buildFn: (o) => runBuild({ ...o, checksFn }) });
  const first = await call("POST", "/publish");
  assert.equal(first.json.reason, "timeout");
  // zweiter Lauf: großzügiges Budget über eigenen Server wäre umständlich → gleiche 2,5 s reichen (~0,8 s Build)
  const second = await call("POST", "/publish");
  assert.equal(second.json.ok, true, second.json.reason);
  assert.equal(seenDuringChecks, "NEU", "später Export ist in den Ordner des nächsten Laufs geschrieben worden");
  assert.equal(readFileSync(join(workDir, "content-publish", "marker.txt"), "utf8"), "NEU");
  assert.deepEqual(
    readdirSync(workDir).filter((n) => n.startsWith(".export-")),
    [],
    "der verworfene Export räumt seinen eigenen Ordner weg",
  );
});
