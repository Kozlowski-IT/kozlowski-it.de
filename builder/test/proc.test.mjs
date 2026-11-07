// runNode: Kind-Env aus Allowlist, keine Secrets des Builders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runNode } from "../src/proc.mjs";

test("runNode vererbt keine Secrets", async (t) => {
  const secrets = { DATABASE_URL: "postgres://geheim", PAYLOAD_SECRET: "x", BUILDER_TOKEN: "y" };
  const old = Object.fromEntries(Object.keys(secrets).map((k) => [k, process.env[k]]));
  Object.assign(process.env, secrets);
  t.after(() => {
    for (const [k, v] of Object.entries(old)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  });
  const r = await runNode(["-e", "console.log(JSON.stringify(Object.keys(process.env)))"], { env: { CONTENT_DIR: "/c" } });
  const keys = JSON.parse(r.stdout);
  assert.ok(keys.includes("CONTENT_DIR") && keys.includes("PATH"));
  for (const k of Object.keys(secrets)) assert.ok(!keys.includes(k), k);
});
