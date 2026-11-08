// Kindprozess (node <args>) mit hartem Timeout und optionalem AbortSignal;
// liefert Exit-Status und Ausgabe, wirft nie.
import { spawn } from "node:child_process";

// Nur diese Variablen erbt der Kindprozess (Eleventy braucht keine Secrets des Builders:
// kein DATABASE_URL, PAYLOAD_SECRET, BUILDER_TOKEN …); alles Weitere nur über `env`.
// Auch gitSnapshot.mjs nutzt childEnv für git.
const ENV_ALLOWLIST = ["PATH", "HOME", "LANG", "TZ", "NODE_ENV"];
export const childEnv = (extra) => ({
  ...Object.fromEntries(ENV_ALLOWLIST.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]])),
  ...extra,
});

export function runNode(args, { cwd, env, timeoutMs = 120_000, signal } = {}) {
  return new Promise((resolve) => {
    if (timeoutMs <= 0 || signal?.aborted) {
      return resolve({ status: null, stdout: "", stderr: "", timedOut: !signal?.aborted, aborted: !!signal?.aborted });
    }
    const child = spawn(process.execPath, args, { cwd, env: childEnv(env), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let aborted = false;
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    const onAbort = () => {
      aborted = true;
      child.kill("SIGKILL");
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = (r) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve({ ...r, stdout, timedOut, aborted });
    };
    child.on("error", (err) => done({ status: null, stderr: stderr + String(err) }));
    child.on("close", (status) => done({ status, stderr }));
  });
}
