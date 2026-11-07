// Releases unter <workDir>/releases/ und der Live-Zeiger releases/current (Symlink).
//
//   releases/<name>/            fertige, geprüfte Stände
//   releases/.staging-<name>/   Build in Arbeit (nie gelistet, nie rollback-fähig; Reste räumt
//                               cleanStaging/prune weg)
//   releases/current → <name>   Live-Zeiger, RELATIVES Ziel auf den Geschwister-Ordner
//   releases/current.tmp        nur kurz beim Umschalten
//
// nginx mountet den Elternordner releases/ read-only mit root …/releases/current —
// niemals den Symlink selbst mounten (ein Bind-Mount löst ihn einmal auf und friert den
// alten Release ein; außerdem zeigte ein relatives Ziel im Container ins Leere).
//
// Name: YYYY-MM-DD_HHmmss (UTC — monoton, keine Sommerzeit-Doppelstunde), bei Kollision
// im selben Sekundentakt mit Zähler: …_HHmmss-2, -3, …
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, statSync } from "node:fs";
import { rename, symlink, unlink } from "node:fs/promises";
import { join } from "node:path";

const NAME = /^(\d{4}-\d{2}-\d{2}_\d{6})(?:-(\d+))?$/;
const STAGING = ".staging-";

export const releasesDir = (workDir) => join(workDir, "releases");
const currentLink = (workDir) => join(releasesDir(workDir), "current");

const pad = (n) => String(n).padStart(2, "0");
export function stamp(date) {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

/**
 * Reserviert einen freien Namen und legt releases/.staging-<name>/ leer an → { name, dir }.
 * Frei = weder <name> noch .staging-<name> existiert (mkdir nicht rekursiv, EEXIST → nächster Zähler).
 * Erst promoteRelease() macht daraus einen Release.
 */
export function createStagingDir(workDir, date = new Date()) {
  const base = stamp(date);
  mkdirSync(releasesDir(workDir), { recursive: true });
  for (let i = 1; ; i++) {
    const name = i === 1 ? base : `${base}-${i}`;
    if (existsSync(join(releasesDir(workDir), name))) continue;
    const dir = join(releasesDir(workDir), STAGING + name);
    try {
      mkdirSync(dir);
      return { name, dir };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
  }
}

/** .staging-<name> → <name> (rename, atomar). Gibt den Release-Ordner zurück. */
export async function promoteRelease(workDir, name) {
  assertName(name);
  const final = join(releasesDir(workDir), name);
  if (existsSync(final)) throw new Error(`Release ${name} existiert schon`);
  await rename(join(releasesDir(workDir), STAGING + name), final);
  return final;
}

/** Verwaiste releases/.staging-* entfernen (Absturz-Reste). Nur bei EINEM Builder zulässig. */
export function cleanStaging(workDir) {
  const dir = releasesDir(workDir);
  if (!existsSync(dir)) return [];
  const removed = readdirSync(dir).filter((n) => n.startsWith(STAGING));
  for (const n of removed) rmSync(join(dir, n), { recursive: true, force: true });
  return removed;
}

// Sortierschlüssel: Zeitstempel, dann Zähler numerisch (…-10 nach …-9).
function compareNames(a, b) {
  const [, sa, na = "1"] = NAME.exec(a);
  const [, sb, nb = "1"] = NAME.exec(b);
  return sa === sb ? Number(na) - Number(nb) : sa < sb ? -1 : 1;
}

/**
 * Release-Namen, neueste zuerst. Nur echte Ordner mit Namensmuster: current, current.tmp
 * und .staging-* zählen nie.
 */
export function listReleases(workDir) {
  const dir = releasesDir(workDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => NAME.test(n) && lstatSync(join(dir, n)).isDirectory())
    .sort(compareNames)
    .reverse();
}

/** Name des Releases, auf den releases/current zeigt (oder null). */
export function currentRelease(workDir) {
  try {
    if (!lstatSync(currentLink(workDir)).isSymbolicLink()) return null;
  } catch {
    return null;
  }
  return readlinkSync(currentLink(workDir));
}

/** Gültiger Release-Name (YYYY-MM-DD_HHmmss[-n])? Schließt current, .staging-* und Pfade aus. */
export const isReleaseName = (release) => typeof release === "string" && NAME.test(release);

function assertName(release) {
  if (!isReleaseName(release)) {
    throw new Error(`Release-Name ungültig: ${JSON.stringify(release)}`);
  }
}

/**
 * releases/current atomar auf <release> umstellen: Symlink releases/current.tmp → <release>
 * anlegen, dann rename(current.tmp, current) — rename(2) ersetzt den alten Link in einem
 * Schritt, es gibt keinen Moment ohne current.
 */
export async function switchCurrent(workDir, release) {
  assertName(release);
  const target = join(releasesDir(workDir), release);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Release ${release} fehlt unter ${releasesDir(workDir)}`);
  }
  const tmp = join(releasesDir(workDir), "current.tmp");
  await unlink(tmp).catch((err) => {
    if (err.code !== "ENOENT") throw err;
  });
  await symlink(release, tmp);
  await rename(tmp, currentLink(workDir));
}

/** Zurück auf einen vorhandenen Release (kein Build). Fehler, wenn er fehlt; current bleibt dann. */
export async function rollback(workDir, release) {
  await switchCurrent(workDir, release);
}

/**
 * Nur die `keep` neuesten Releases behalten und verwaiste .staging-* entfernen. Der Release,
 * auf den current zeigt, wird NIE gelöscht — steht er außerhalb der neuesten `keep` (nach
 * einem Rollback), bleibt er zusätzlich stehen. Gibt die gelöschten Release-Namen zurück.
 */
export async function prune(workDir, keep = 10) {
  cleanStaging(workDir);
  const live = currentRelease(workDir);
  const removed = [];
  for (const name of listReleases(workDir).slice(keep)) {
    if (name === live) continue;
    rmSync(join(releasesDir(workDir), name), { recursive: true, force: true });
    removed.push(name);
  }
  return removed;
}
