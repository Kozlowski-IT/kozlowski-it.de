// Git-Abbild der veröffentlichten Inhalte (Task 11).
// Remote ist immer ein Temp-Bare-Repo bzw. ein nicht erreichbarer Pfad — nie das echte GitHub.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitSnapshot, SNAPSHOT_DIR } from "../src/gitSnapshot.mjs";
import { createBuilderServer } from "../src/server.mjs";
import { SITE_ROOT, tempWorkDir } from "./helpers.mjs";

const T = { timeout: 30_000 };
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** Bare-Remote + Klon mit einem Anfangscommit; liefert {bare, clone}. */
function repos(t) {
  const base = tempWorkDir(t);
  const bare = join(base, "remote.git");
  const clone = join(base, "clone");
  git(base, "init", "-q", "--bare", "-b", "main", bare);
  git(base, "clone", "-q", bare, clone);
  git(clone, "config", "user.name", "Test");
  git(clone, "config", "user.email", "test@example.invalid");
  writeFileSync(join(clone, "README"), "x\n");
  git(clone, "add", "README");
  git(clone, "commit", "-q", "-m", "init");
  git(clone, "push", "-q", "origin", "HEAD");
  return { base, bare, clone };
}

/** Export-Ordner wie content-publish/ (JSON + media/). */
function contentDir(t, marker = "A") {
  const dir = join(tempWorkDir(t), "content-publish");
  mkdirSync(join(dir, "media"), { recursive: true });
  writeFileSync(join(dir, "site.json"), JSON.stringify({ name: marker }) + "\n");
  writeFileSync(join(dir, "pages.json"), "[]\n");
  writeFileSync(join(dir, "chrome.json"), "{}\n");
  writeFileSync(join(dir, "media", "index.json"), "[]\n");
  writeFileSync(join(dir, "media", "bild.png"), "binär");
  return dir;
}

test("gitSnapshot: kopiert *.json nach content-snapshot/, Commit mit Release, Push ins Remote", T, async (t) => {
  const { bare, clone } = repos(t);
  const res = await gitSnapshot(clone, contentDir(t), "2026-11-07_120000");
  assert.deepEqual(res, { ok: true });
  for (const f of ["site.json", "pages.json", "chrome.json", "media/index.json"]) {
    assert.ok(existsSync(join(clone, SNAPSHOT_DIR, f)), f);
  }
  assert.ok(!existsSync(join(clone, SNAPSHOT_DIR, "media", "bild.png")), "keine Binärdateien");
  assert.equal(git(clone, "log", "-1", "--format=%s"), "content: Veröffentlichung 2026-11-07_120000");
  // im Remote angekommen
  assert.equal(git(bare, "log", "-1", "--format=%s", "content-snapshot"), "content: Veröffentlichung 2026-11-07_120000");
  assert.equal(git(bare, "show", `content-snapshot:${SNAPSHOT_DIR}/site.json`), '{"name":"A"}');
  // eigener Branch: main bleibt unberührt, der Snapshot-Branch enthält nur content-snapshot/
  assert.equal(git(bare, "log", "-1", "--format=%s", "main"), "init");
  assert.equal(git(bare, "ls-tree", "--name-only", "content-snapshot"), SNAPSHOT_DIR);
});

test("gitSnapshot: neuer Commit auf main im Remote dazwischen → Snapshot-Push klappt weiter", T, async (t) => {
  const { base, bare, clone } = repos(t);
  assert.deepEqual(await gitSnapshot(clone, contentDir(t, "A"), "2026-11-07_120000"), { ok: true });
  // jemand pusht Code auf main
  const dev = join(base, "dev");
  git(base, "clone", "-q", "-b", "main", bare, dev);
  writeFileSync(join(dev, "code.txt"), "neu\n");
  git(dev, "add", "code.txt");
  git(dev, "-c", "user.name=Dev", "-c", "user.email=dev@example.invalid", "commit", "-q", "-m", "code");
  git(dev, "push", "-q", "origin", "main");
  assert.deepEqual(await gitSnapshot(clone, contentDir(t, "B"), "2026-11-07_120100"), { ok: true });
  assert.equal(git(bare, "log", "-1", "--format=%s", "main"), "code");
  assert.equal(git(bare, "rev-list", "--count", "content-snapshot"), "2");
  assert.equal(git(bare, "show", `content-snapshot:${SNAPSHOT_DIR}/site.json`), '{"name":"B"}');
  // frischer Klon (z. B. neuer Container) setzt auf dem vorhandenen Remote-Branch auf
  const fresh = join(base, "fresh");
  git(base, "clone", "-q", bare, fresh);
  assert.deepEqual(await gitSnapshot(fresh, contentDir(t, "C"), "2026-11-07_120200"), { ok: true });
  assert.equal(git(bare, "rev-list", "--count", "content-snapshot"), "3");
});

test("gitSnapshot: entfernte Datei verschwindet, unveränderter Stand → kein leerer Commit", T, async (t) => {
  const { clone } = repos(t);
  const dir = contentDir(t);
  assert.equal((await gitSnapshot(clone, dir, "2026-11-07_120000")).ok, true);
  const before = git(clone, "rev-list", "--count", "HEAD");
  assert.equal((await gitSnapshot(clone, dir, "2026-11-07_120001")).ok, true);
  assert.equal(git(clone, "rev-list", "--count", "HEAD"), before, "kein Commit ohne Änderung");
  rmSync(join(dir, "chrome.json"));
  assert.equal((await gitSnapshot(clone, dir, "2026-11-07_120002")).ok, true);
  assert.ok(!existsSync(join(clone, SNAPSHOT_DIR, "chrome.json")));
  assert.equal(git(clone, "show", "--stat", "--format=%s", "HEAD").split("\n")[0], "content: Veröffentlichung 2026-11-07_120002");
});

test("gitSnapshot: nicht erreichbares Remote → ok:true + warning, Commit lokal vorhanden", T, async (t) => {
  const { base, clone } = repos(t);
  git(clone, "remote", "set-url", "origin", join(base, "gibt-es-nicht.git"));
  const res = await gitSnapshot(clone, contentDir(t, "B"), "2026-11-07_130000");
  assert.equal(res.ok, true);
  assert.match(res.warning, /Push fehlgeschlagen/);
  assert.equal(git(clone, "log", "-1", "--format=%s"), "content: Veröffentlichung 2026-11-07_130000");
});

test("gitSnapshot: git bekommt keine Builder-Secrets (Env-Allowlist wie proc.mjs)", T, async (t) => {
  const { clone } = repos(t);
  // Sonde: ein „git“ vorn im PATH schreibt seine Umgebung mit und ruft dann das echte git
  const realGit = execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim();
  const bin = join(tempWorkDir(t), "bin");
  const log = join(bin, "env.log");
  mkdirSync(bin);
  writeFileSync(join(bin, "git"), `#!/bin/sh\nenv >> "${log}"\necho ---- >> "${log}"\nexec "${realGit}" "$@"\n`);
  chmodSync(join(bin, "git"), 0o755);
  const saved = { PATH: process.env.PATH, PAYLOAD_SECRET: process.env.PAYLOAD_SECRET, DATABASE_URL: process.env.DATABASE_URL, BUILDER_TOKEN: process.env.BUILDER_TOKEN };
  process.env.PATH = `${bin}:${saved.PATH}`;
  process.env.PAYLOAD_SECRET = "sonde-payload-secret";
  process.env.DATABASE_URL = "postgres://sonde:sonde-db@x/y";
  process.env.BUILDER_TOKEN = "sonde-builder-token";
  try {
    const res = await gitSnapshot(clone, contentDir(t), "2026-11-08_010000");
    assert.deepEqual(res, { ok: true });
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
  const seen = readFileSync(log, "utf8");
  assert.ok(seen.split("----").length > 3, "Sonde wurde für mehrere git-Aufrufe genutzt");
  for (const s of ["sonde-payload-secret", "sonde-db", "sonde-builder-token", "PAYLOAD_SECRET", "DATABASE_URL", "BUILDER_TOKEN"]) {
    assert.ok(!seen.includes(s), `${s} darf git nicht erreichen`);
  }
  assert.match(seen, /^GIT_TERMINAL_PROMPT=0$/m);
  assert.match(seen, /^GIT_AUTHOR_NAME=/m, "Ident-Variablen kommen weiter an");
});

test("gitSnapshot: kein Git-Repo bzw. ungültiger Release-Name → ok:false, wirft nicht", T, async (t) => {
  const noRepo = tempWorkDir(t);
  const r1 = await gitSnapshot(noRepo, contentDir(t), "2026-11-07_120000");
  assert.equal(r1.ok, false);
  assert.match(r1.reason, /Git/);
  const { clone } = repos(t);
  const r2 = await gitSnapshot(clone, contentDir(t), "../x");
  assert.equal(r2.ok, false);
  // Unterordner eines Repos ist kein Ziel (würde ins fremde Repo committen)
  mkdirSync(join(clone, "sub"));
  const r3 = await gitSnapshot(join(clone, "sub"), contentDir(t), "2026-11-07_120000");
  assert.equal(r3.ok, false);
  assert.equal(git(clone, "rev-list", "--count", "HEAD"), "1");
});

test("Builder: nach erfolgreichem Publish läuft afterPublish; dessen Warnung landet in warnings", T, async (t) => {
  const workDir = tempWorkDir(t);
  const seen = [];
  const svc = createBuilderServer({
    token: "t".repeat(40),
    siteRoot: SITE_ROOT,
    workDir,
    exportFn: async () => ({ pages: 0, missing: [] }),
    buildFn: async (o) => (o.mode === "publish" ? { ok: true, release: "2026-11-07_140000", warnings: ["prune: x"] } : { ok: true }),
    afterPublish: async (release, dir) => {
      seen.push([release, dir]);
      return { ok: true, warning: "Git-Push fehlgeschlagen: offline" };
    },
    log: { log() {}, error() {} },
  });
  const { port } = await svc.listen(0);
  t.after(() => svc.close());
  const res = await fetch(`http://127.0.0.1:${port}/publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${"t".repeat(40)}` },
  }).then((r) => r.json());
  assert.deepEqual(res, { ok: true, release: "2026-11-07_140000", warnings: ["prune: x", "Git-Push fehlgeschlagen: offline"] });
  assert.deepEqual(seen, [["2026-11-07_140000", join(workDir, "content-publish")]]);
  // Fehlschlag des Snapshots bleibt Warnung, Publish bleibt ok
  const svc2 = createBuilderServer({
    token: "t".repeat(40),
    siteRoot: SITE_ROOT,
    workDir,
    exportFn: async () => ({ pages: 0, missing: [] }),
    buildFn: async () => ({ ok: true, release: "2026-11-07_140001" }),
    afterPublish: async () => {
      throw new Error("kaputt");
    },
    log: { log() {}, error() {} },
  });
  const p2 = (await svc2.listen(0)).port;
  t.after(() => svc2.close());
  const res2 = await fetch(`http://127.0.0.1:${p2}/publish`, {
    method: "POST",
    headers: { authorization: `Bearer ${"t".repeat(40)}` },
  }).then((r) => r.json());
  assert.equal(res2.ok, true);
  assert.match(res2.warnings.join("\n"), /Git-Abbild.*kaputt/);
  // fehlgeschlagener Publish → kein afterPublish
  seen.length = 0;
  const svc3 = createBuilderServer({
    token: "t".repeat(40),
    siteRoot: SITE_ROOT,
    workDir,
    exportFn: async () => ({ pages: 0, missing: [] }),
    buildFn: async () => ({ ok: false, reason: "rot" }),
    afterPublish: async (r) => seen.push(r),
    log: { log() {}, error() {} },
  });
  const p3 = (await svc3.listen(0)).port;
  t.after(() => svc3.close());
  await fetch(`http://127.0.0.1:${p3}/publish`, { method: "POST", headers: { authorization: `Bearer ${"t".repeat(40)}` } });
  assert.deepEqual(seen, []);
});
