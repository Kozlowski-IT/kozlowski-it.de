// Kindprozess (node <args>) mit hartem Timeout; liefert Exit-Status und Ausgabe, wirft nie.
import { spawn } from "node:child_process";

export function runNode(args, { cwd, env, timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ status: null, stdout, stderr: stderr + String(err), timedOut });
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr, timedOut });
    });
  });
}
