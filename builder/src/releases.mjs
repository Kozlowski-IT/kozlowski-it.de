// Releases unter <workDir>/releases/<name>/ und der Live-Zeiger <workDir>/current (Symlink).
//
// Name: YYYY-MM-DD_HHmmss (UTC — monoton, keine Sommerzeit-Doppelstunde), bei Kollision
// im selben Sekundentakt mit Zähler: …_HHmmss-2, -3, … Der Ordner wird per mkdir
// (nicht rekursiv) reserviert, EEXIST → nächster Zähler; so kann kein Name doppelt vergeben werden.
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, statSync } from "node:fs";
import { rename, symlink, unlink } from "node:fs/promises";
import { basename, join } from "node:path";

const NAME = /^(\d{4}-\d{2}-\d{2}_\d{6})(?:-(\d+))?$/;

export const releasesDir = (workDir) => join(workDir, "releases");

const pad = (n) => String(n).padStart(2, "0");
export function stamp(date) {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/** Legt releases/<name>/ leer an und gibt { name, dir } zurück. */
export function createReleaseDir(workDir, date = new Date()) {
  const base = stamp(date);
  mkdirSync(releasesDir(workDir), { recursive: true });
  for (let i = 1; ; i++) {
    const name = i === 1 ? base : `${base}-${i}`;
    const dir = join(releasesDir(workDir), name);
    try {
      mkdirSync(dir);
      return { name, dir };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
  }
}

// Sortierschlüssel: Zeitstempel, dann Zähler numerisch (…-10 nach …-9).
function compareNames(a, b) {
  const [, sa, na = "1"] = NAME.exec(a);
  const [, sb, nb = "1"] = NAME.exec(b);
  return sa === sb ? Number(na) - Number(nb) : sa < sb ? -1 : 1;
}

/** Release-Namen, neueste zuerst. Fremde Einträge (falsches Namensmuster, keine Ordner) zählen nicht. */
export function listReleases(workDir) {
  const dir = releasesDir(workDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => NAME.test(n) && statSync(join(dir, n)).isDirectory())
    .sort(compareNames)
    .reverse();
}

/** Name des Releases, auf den current zeigt (oder null). */
export function currentRelease(workDir) {
  const link = join(workDir, "current");
  try {
    if (!lstatSync(link).isSymbolicLink()) return null;
  } catch {
    return null;
  }
  return basename(readlinkSync(link));
}

function assertName(release) {
  if (typeof release !== "string" || !NAME.test(release)) {
    throw new Error(`Release-Name ungültig: ${JSON.stringify(release)}`);
  }
}

/**
 * current atomar auf releases/<release> umstellen: Symlink current.tmp anlegen,
 * dann rename(current.tmp, current) — rename(2) ersetzt den alten Link in einem Schritt,
 * es gibt keinen Moment ohne current. Ziel ist relativ (Arbeitsordner bleibt verschiebbar).
 */
export async function switchCurrent(workDir, release) {
  assertName(release);
  if (!existsSync(join(releasesDir(workDir), release))) {
    throw new Error(`Release ${release} fehlt unter ${releasesDir(workDir)}`);
  }
  const tmp = join(workDir, "current.tmp");
  await unlink(tmp).catch((err) => {
    if (err.code !== "ENOENT") throw err;
  });
  await symlink(join("releases", release), tmp);
  await rename(tmp, join(workDir, "current"));
}

/** Zurück auf einen vorhandenen Release (kein Build). Fehler, wenn er fehlt; current bleibt dann. */
export async function rollback(workDir, release) {
  await switchCurrent(workDir, release);
}

/**
 * Nur die `keep` neuesten Releases behalten. Der Release, auf den current zeigt, wird
 * NIE gelöscht — steht er außerhalb der neuesten `keep` (nach einem Rollback), bleibt er
 * zusätzlich stehen. Gibt die gelöschten Namen zurück.
 */
export async function prune(workDir, keep = 10) {
  const live = currentRelease(workDir);
  const removed = [];
  for (const name of listReleases(workDir).slice(keep)) {
    if (name === live) continue;
    rmSync(join(releasesDir(workDir), name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}
