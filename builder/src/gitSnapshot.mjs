// Git-Abbild der veröffentlichten Inhalte (Task 11).
//
// gitSnapshot(repoDir, contentDir, release) kopiert die JSON-Dateien des Publish-Exports
// (contentDir/*.json und contentDir/media/index.json, keine Binärdateien) in einen NICHT
// ignorierten Ordner `content-snapshot/` eines Repo-Klons (content/ ist im Arbeitsrepo
// gitignored), committet „content: Veröffentlichung <release>“ und pusht nach origin.
//
//   → { ok: true }                    Commit (falls Änderung) + Push ok
//   → { ok: true, warning }           Push fehlgeschlagen — Publish bleibt gültig
//   → { ok: false, reason }           kein Repo, Kopie/Commit fehlgeschlagen
// Wirft nie. Git läuft ohne Shell (execFile), ohne Terminal-Prompt und mit Timeout.
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import { isReleaseName } from "./releases.mjs";

export const SNAPSHOT_DIR = "content-snapshot";
export const GIT_TIMEOUT_MS = 30_000;

function git(cwd, args, { timeoutMs = GIT_TIMEOUT_MS, ident = {} } = {}) {
  return new Promise((resolve) => {
    execFile(
      "git",
      args,
      {
        cwd,
        timeout: timeoutMs,
        killSignal: "SIGKILL",
        // nie interaktiv nach Zugangsdaten fragen
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "true", ...ident },
      },
      (err, stdout, stderr) =>
        resolve({
          code: err ? (err.killed ? "timeout" : (err.code ?? 1)) : 0,
          stdout: String(stdout),
          stderr: String(stderr).trim(),
        }),
    );
  });
}

/** Autor/Committer: BUILDER_GIT_NAME/-EMAIL, sonst die Repo-Config, sonst ein Platzhalter. */
async function identity(repoDir) {
  const name = process.env.BUILDER_GIT_NAME || (await git(repoDir, ["config", "user.name"])).stdout.trim() || "kozlowski-it Builder";
  const email = process.env.BUILDER_GIT_EMAIL || (await git(repoDir, ["config", "user.email"])).stdout.trim() || "builder@localhost";
  return { GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email };
}

const firstLine = (r) => (r.code === "timeout" ? "Zeitüberschreitung" : r.stderr.split("\n").filter(Boolean).pop() || `Exit ${r.code}`);

/**
 * @param {string} repoDir     Klon des Site-Repos (mit origin)
 * @param {string} contentDir  Publish-Export (workDir/content-publish)
 * @param {string} release     Release-Name (YYYY-MM-DD_HHmmss[-n])
 * @returns {Promise<{ok: true, warning?: string} | {ok: false, reason: string}>}
 */
export async function gitSnapshot(repoDir, contentDir, release) {
  try {
    if (!isReleaseName(release)) return { ok: false, reason: `Git-Abbild: Release-Name ungültig: ${JSON.stringify(release)}` };
    const top = await git(repoDir, ["rev-parse", "--show-toplevel"]);
    // Wurzel prüfen: sonst würde ein Ordner IN einem fremden Repo dorthin committen
    if (top.code !== 0 || realpathSync(top.stdout.trim()) !== realpathSync(repoDir)) {
      return { ok: false, reason: `Git-Abbild: ${repoDir} ist nicht die Wurzel eines Git-Repos` };
    }

    // Ordner neu befüllen, damit gelöschte Dateien auch im Abbild verschwinden
    const target = join(repoDir, SNAPSHOT_DIR);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    for (const f of readdirSync(contentDir)) {
      if (f.endsWith(".json")) copyFileSync(join(contentDir, f), join(target, f));
    }
    const manifest = join(contentDir, "media", "index.json");
    if (existsSync(manifest)) {
      mkdirSync(join(target, "media"), { recursive: true });
      copyFileSync(manifest, join(target, "media", "index.json"));
    }

    const add = await git(repoDir, ["add", "-A", "--", SNAPSHOT_DIR]);
    if (add.code !== 0) return { ok: false, reason: `Git-Abbild: git add fehlgeschlagen: ${firstLine(add)}` };
    const diff = await git(repoDir, ["diff", "--cached", "--quiet", "--", SNAPSHOT_DIR]);
    if (diff.code !== 0) {
      const commit = await git(repoDir, ["commit", "-q", "-m", `content: Veröffentlichung ${release}`, "--", SNAPSHOT_DIR], {
        ident: await identity(repoDir),
      });
      if (commit.code !== 0) return { ok: false, reason: `Git-Abbild: Commit fehlgeschlagen: ${firstLine(commit)}` };
    }
    // Push auch ohne neuen Commit: holt einen früher gescheiterten Push nach
    const push = await git(repoDir, ["push", "-q", "origin", "HEAD"]);
    if (push.code !== 0) return { ok: true, warning: `Git-Abbild: Push fehlgeschlagen (${firstLine(push)}) — Commit liegt lokal` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Git-Abbild: ${err?.message ?? err}` };
  }
}
