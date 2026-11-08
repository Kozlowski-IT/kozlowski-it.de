// deploy/cms/backup.sh mit Attrappen: docker (pg_dump-Ausgabe) und optional tar vorn im PATH.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../deploy/cms/backup.sh", import.meta.url));
const REAL_TAR = execFileSync("sh", ["-c", "command -v tar"], { encoding: "utf8" }).trim();

function setup(t, { tarExit } = {}) {
  const base = mkdtempSync(join(tmpdir(), "cms-backup-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bin = join(base, "bin");
  const data = join(base, "data");
  mkdirSync(bin);
  mkdirSync(join(data, "media"), { recursive: true });
  writeFileSync(join(data, "media", "bild.png"), "x");
  writeFileSync(join(bin, "docker"), "#!/bin/sh\nprintf 'PGDMP-attrappe'\n");
  chmodSync(join(bin, "docker"), 0o755);
  if (tarExit !== undefined) {
    // echtes tar schreibt das Archiv, dann der vorgegebene Exit-Code (1 = Datei geändert, 2 = fatal)
    writeFileSync(join(bin, "tar"), `#!/bin/sh\n"${REAL_TAR}" "$@" || exit $?\nexit ${tarExit}\n`);
    chmodSync(join(bin, "tar"), 0o755);
  }
  const run = () =>
    spawnSync("bash", [SCRIPT], {
      encoding: "utf8",
      env: { PATH: `${bin}:${process.env.PATH}`, STACK_DIR: join(base, "stack"), DATA_DIR: data },
    });
  return { run, dest: join(data, "backup") };
}

const files = (dest) => (existsSync(dest) ? readdirSync(dest).sort() : []);

test("backup.sh: Normalfall → Exit 0, Dump + Medien-Archiv", (t) => {
  const { run, dest } = setup(t);
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^cms-backup: ok cms-db-\S+\.dump cms-media-\S+\.tar\.gz$/m);
  const f = files(dest);
  assert.equal(f.filter((n) => n.endsWith(".dump")).length, 1);
  assert.equal(f.filter((n) => n.endsWith(".tar.gz")).length, 1);
  assert.ok(!f.some((n) => n.endsWith(".part")));
});

test("backup.sh: tar Exit 1 (Datei geändert) → Warnung, Exit 0, Archiv behalten", (t) => {
  const { run, dest } = setup(t, { tarExit: 1 });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /WARNUNG tar Exit 1/);
  assert.match(r.stdout, /cms-backup: ok .*WARNUNG/);
  assert.equal(files(dest).filter((n) => n.endsWith(".tar.gz")).length, 1);
});

test("backup.sh: tar Exit 2 (fatal) → Exit 2, kein Medien-Archiv, keine .part-Reste; Dump bleibt", (t) => {
  const { run, dest } = setup(t, { tarExit: 2 });
  const r = run();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tar fehlgeschlagen \(Exit 2\)/);
  const f = files(dest);
  assert.equal(f.filter((n) => n.endsWith(".tar.gz")).length, 0);
  assert.ok(!f.some((n) => n.endsWith(".part")));
  assert.equal(f.filter((n) => n.endsWith(".dump")).length, 1);
});
