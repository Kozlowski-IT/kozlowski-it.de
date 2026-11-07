// Startsperre deploy/cms/payload-start.sh (compose command des payload-Dienstes):
// ohne https-Server-URL, Edge-Secret/PAYLOAD_SECRET ≥ 32, DATABASE_URL, NODE_ENV=production → kein Start.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../deploy/cms/payload-start.sh", import.meta.url));
const GOOD = {
  PATH: process.env.PATH,
  PAYLOAD_PUBLIC_SERVER_URL: "https://cms.kozlowski-it.de",
  EDGE_SHARED_SECRET: "e".repeat(32),
  PAYLOAD_SECRET: "p".repeat(32),
  DATABASE_URL: "postgres://cms:x@postgres:5432/cms",
  NODE_ENV: "production",
};
// Startbefehl ersetzt durch `echo gestartet` → zeigt, dass exec "$@" erreicht wurde
const run = (env) => spawnSync("sh", [SCRIPT, "echo", "gestartet"], { env, encoding: "utf8" });

test("alles gesetzt → exec des Startbefehls", () => {
  const r = run(GOOD);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "gestartet");
});

const refused = [
  ["ohne PAYLOAD_PUBLIC_SERVER_URL", { PAYLOAD_PUBLIC_SERVER_URL: undefined }, /PAYLOAD_PUBLIC_SERVER_URL/],
  ["PAYLOAD_PUBLIC_SERVER_URL nur http", { PAYLOAD_PUBLIC_SERVER_URL: "http://cms.kozlowski-it.de" }, /PAYLOAD_PUBLIC_SERVER_URL/],
  ["PAYLOAD_PUBLIC_SERVER_URL nur https://", { PAYLOAD_PUBLIC_SERVER_URL: "https://" }, /PAYLOAD_PUBLIC_SERVER_URL/],
  ["ohne EDGE_SHARED_SECRET", { EDGE_SHARED_SECRET: undefined }, /EDGE_SHARED_SECRET/],
  ["EDGE_SHARED_SECRET leer", { EDGE_SHARED_SECRET: "" }, /EDGE_SHARED_SECRET/],
  ["EDGE_SHARED_SECRET 31 Zeichen", { EDGE_SHARED_SECRET: "e".repeat(31) }, /EDGE_SHARED_SECRET/],
  ["EDGE_SHARED_SECRET = Platzhalter change-me", { EDGE_SHARED_SECRET: "change-me" }, /EDGE_SHARED_SECRET/],
  ["PAYLOAD_SECRET zu kurz", { PAYLOAD_SECRET: "change-me" }, /PAYLOAD_SECRET/],
  ["ohne DATABASE_URL", { DATABASE_URL: undefined }, /DATABASE_URL/],
  ["NODE_ENV development", { NODE_ENV: "development" }, /NODE_ENV/],
  ["ohne NODE_ENV", { NODE_ENV: undefined }, /NODE_ENV/],
];

for (const [name, patch, msg] of refused) {
  test(`verweigert: ${name}`, () => {
    const env = { ...GOOD, ...patch };
    for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
    const r = run(env);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "", "Startbefehl darf nicht laufen");
    assert.match(r.stderr, msg);
    assert.match(r.stderr, /Start verweigert/);
  });
}

test("verweigert ohne Startbefehl", () => {
  const r = spawnSync("sh", [SCRIPT], { env: GOOD, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kein Startbefehl/);
});
