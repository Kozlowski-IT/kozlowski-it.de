// Builder-HTTP-Dienst (node:http) um den Builder-Kern (Task 9).
//
//   POST /preview            → 202 { queued: true }    asynchron, koalesziert
//   POST /publish            → 200 { ok, release | reason, … }   wartet auf das Ergebnis
//   POST /rollback {release} → 200 { ok:true, release } | 404 (fehlt) | 400 (ungültiger Name)
//   GET  /releases           → 200 { current, releases[] }  nur lesend, jederzeit
//
// Jede Anfrage braucht `Authorization: Bearer $BUILDER_TOKEN` (sonst 401, vor allem anderen).
// Andere Pfade → 404, andere Methoden → 405, Body > maxBodyBytes → 413, kaputtes JSON → 400.
//
// Alle verändernden Operationen laufen über EINE Warteschlange (queue.mjs). Annahme: genau
// ein Builder-Prozess pro workDir.
//
// Zaun für späte Exporte: runBuild rennt exportFn gegen die Deadline; ein hängender Export
// läuft danach im Hintergrund weiter. Damit er nie in den content-<mode>/-Ordner eines
// späteren Laufs schreibt, exportiert jeder Lauf in einen eigenen frischen Ordner
// (workDir/.export-XXXX) und verschiebt ihn erst danach — synchron und nur, solange der
// Lauf noch nicht beendet ist — nach content-<mode>/. Ist der Lauf schon vorbei, wird
// das Ergebnis verworfen. Die Warteschlange muss so nicht auf den alten Export warten.
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BUILD_TIMEOUT_MS, runBuild } from "./build.mjs";
import { createQueue } from "./queue.mjs";
import { currentRelease, isReleaseName, listReleases, rollback } from "./releases.mjs";

export const MIN_TOKEN_LENGTH = 32;
export const MAX_BODY_BYTES = 16 * 1024;
const EXPORT_PREFIX = ".export-";

const ROUTES = {
  "/preview": "POST",
  "/publish": "POST",
  "/rollback": "POST",
  "/releases": "GET",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sha256 = (s) => createHash("sha256").update(String(s)).digest();

/** Body lesen, höchstens `max` Bytes (sonst HttpError 413). */
function readBody(req, max) {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > max) return Promise.reject(new HttpError(413, "Body zu groß"));
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    req.on("data", (c) => {
      if (failed) return;
      size += c.length;
      if (size > max) {
        failed = true;
        reject(new HttpError(413, "Body zu groß"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => !failed && resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", (err) => !failed && reject(err));
  });
}

function parseJson(text) {
  if (!text.trim()) return {};
  let v;
  try {
    v = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Body ist kein gültiges JSON");
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new HttpError(400, "Body muss ein JSON-Objekt sein");
  return v;
}

/**
 * @param {object} o
 * @param {string} o.token        BUILDER_TOKEN (≥ 32 Zeichen, sonst Start verweigert)
 * @param {string} o.siteRoot
 * @param {string} o.workDir
 * @param {(outDir: string, opts: {drafts: boolean}) => Promise<{pages: number, missing: string[]}>} o.exportFn
 * @param {number} [o.timeoutMs]  Budget pro Build-Lauf (Default 120 s; in Tests ms)
 * @param {typeof runBuild} [o.buildFn]  Test-Naht
 * @param {number} [o.maxBodyBytes]
 * @param {{log: Function, error: Function}} [o.log]
 */
export function createBuilderServer({
  token,
  siteRoot,
  workDir,
  exportFn,
  timeoutMs = BUILD_TIMEOUT_MS,
  buildFn = runBuild,
  maxBodyBytes = MAX_BODY_BYTES,
  log = console,
}) {
  if (typeof token !== "string" || token.length < MIN_TOKEN_LENGTH) {
    throw new Error(`BUILDER_TOKEN fehlt oder ist kürzer als ${MIN_TOKEN_LENGTH} Zeichen — Start verweigert`);
  }
  if (typeof exportFn !== "function") throw new Error("exportFn fehlt");
  siteRoot = resolve(siteRoot);
  workDir = resolve(workDir);
  const expected = sha256(token);

  // Reste verworfener Exporte eines früheren Prozesses
  try {
    for (const n of readdirSync(workDir)) {
      if (n.startsWith(EXPORT_PREFIX)) rmSync(join(workDir, n), { recursive: true, force: true });
    }
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  /** gleiche Länge durch Hash → timingSafeEqual vergleicht in konstanter Zeit */
  function authorized(req) {
    const m = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? "");
    return !!m && timingSafeEqual(sha256(m[1]), expected);
  }

  /** exportFn mit Zaun (siehe Kopfkommentar); `run.finished` setzt execute im finally. */
  function fencedExport(run) {
    return async (outDir, opts) => {
      const fresh = mkdtempSync(join(workDir, EXPORT_PREFIX));
      try {
        const result = await exportFn(fresh, opts);
        // ab hier synchron: kein anderer Lauf kann zwischen Prüfung und rename starten
        if (run.finished) throw new Error("Export kam nach dem Ende seines Laufs — verworfen");
        rmSync(outDir, { recursive: true, force: true });
        renameSync(fresh, outDir);
        return result;
      } finally {
        rmSync(fresh, { recursive: true, force: true });
      }
    };
  }

  async function execute(kind, data) {
    const t0 = Date.now();
    let result;
    if (kind === "rollback") {
      if (!listReleases(workDir).includes(data.release)) {
        result = { ok: false, reason: `Release ${data.release} fehlt`, notFound: true };
      } else {
        await rollback(workDir, data.release);
        result = { ok: true, release: data.release };
      }
    } else {
      const run = { finished: false };
      try {
        result = await buildFn({ mode: kind, siteRoot, workDir, exportFn: fencedExport(run), timeoutMs });
      } finally {
        run.finished = true;
      }
    }
    log.log(`[builder] ${kind} ${result.ok ? "ok" : "FEHLER"} in ${Date.now() - t0} ms${result.ok ? "" : `: ${String(result.reason).split("\n")[0]}`}`);
    return result;
  }

  const queue = createQueue(execute);

  function send(res, status, body) {
    if (res.headersSent || res.destroyed) return;
    const text = JSON.stringify(body);
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "content-length": Buffer.byteLength(text),
    });
    res.end(text);
  }

  async function handle(req, res) {
    if (!authorized(req)) {
      res.setHeader("www-authenticate", "Bearer");
      return send(res, 401, { ok: false, reason: "nicht autorisiert" });
    }
    const path = new URL(req.url, "http://x").pathname;
    const method = ROUTES[path];
    if (!method) return send(res, 404, { ok: false, reason: "unbekannter Pfad" });
    if (req.method !== method) {
      res.setHeader("allow", method);
      return send(res, 405, { ok: false, reason: `nur ${method}` });
    }

    if (path === "/releases") {
      return send(res, 200, { current: currentRelease(workDir), releases: listReleases(workDir) });
    }

    const body = parseJson(await readBody(req, maxBodyBytes));
    if (path === "/preview") {
      queue.enqueue("preview").catch(() => {});
      return send(res, 202, { queued: true });
    }
    if (path === "/publish") {
      return send(res, 200, await queue.enqueue("publish"));
    }
    // /rollback
    if (!isReleaseName(body.release)) {
      return send(res, 400, { ok: false, reason: `Release-Name ungültig: ${JSON.stringify(body.release ?? null)}` });
    }
    const { notFound, ...result } = await queue.enqueue("rollback", { release: body.release });
    return send(res, notFound ? 404 : 200, result);
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (err instanceof HttpError) {
        if (err.status === 413) {
          res.setHeader("connection", "close");
          res.on("finish", () => req.destroy());
        }
        return send(res, err.status, { ok: false, reason: err.message });
      }
      log.error(`[builder] interner Fehler: ${err?.stack ?? err}`);
      send(res, 500, { ok: false, reason: "interner Fehler" });
    });
  });

  return {
    server,
    queue,
    /** @returns {Promise<{host: string, port: number}>} */
    listen(port = 0, host = "127.0.0.1") {
      return new Promise((ok, fail) => {
        server.once("error", fail);
        server.listen(port, host, () => {
          server.off("error", fail);
          ok({ host, port: server.address().port });
        });
      });
    },
    /** keine neuen Verbindungen; wartet, bis die Warteschlange leer ist */
    async close() {
      const closed = new Promise((r) => server.close(() => r()));
      server.closeIdleConnections();
      await queue.idle(); // laufende/wartende Jobs zu Ende bringen (Publish-Antworten gehen noch raus)
      server.closeAllConnections();
      await closed;
    },
  };
}

// ---------------------------------------------------------------- CLI
//
//   BUILDER_TOKEN=… BUILDER_WORKDIR=/srv/builder BUILDER_EXPORT_MODULE=/pfad/export.mjs \
//   node builder/src/server.mjs
//
// BUILDER_EXPORT_MODULE: ES-Modul, dessen default-Export (oder `exportFn`) die Signatur
// exportFn(outDir, { drafts }) hat (Anbindung an Payload: Task 11).
// Optional: BUILDER_HOST (Default 127.0.0.1), BUILDER_PORT (Default 4100),
// BUILDER_SITE_ROOT (Default Repo-Root), BUILDER_TIMEOUT_MS (Default 120000).
export async function main(env = process.env) {
  const need = (k) => {
    if (!env[k]) throw new Error(`${k} fehlt — Start verweigert`);
    return env[k];
  };
  const mod = await import(pathToFileURL(resolve(need("BUILDER_EXPORT_MODULE"))).href);
  const svc = createBuilderServer({
    token: env.BUILDER_TOKEN,
    siteRoot: env.BUILDER_SITE_ROOT || new URL("../../", import.meta.url).pathname,
    workDir: need("BUILDER_WORKDIR"),
    exportFn: mod.default ?? mod.exportFn,
    timeoutMs: env.BUILDER_TIMEOUT_MS ? Number(env.BUILDER_TIMEOUT_MS) : BUILD_TIMEOUT_MS,
  });
  const { host, port } = await svc.listen(Number(env.BUILDER_PORT || 4100), env.BUILDER_HOST || "127.0.0.1");
  console.log(`[builder] lauscht auf http://${host}:${port}`);
  const stop = async () => {
    await svc.close();
    process.exit(0);
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  return svc;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`[builder] ${err.message}`);
    process.exit(1);
  });
}
