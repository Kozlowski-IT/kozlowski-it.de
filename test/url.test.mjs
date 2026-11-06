// Allow-List für Link-Ziele aus Inhalten (lib/url.js; gleiche Regel wie cms/src/fields/url.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeHref, safeHref } from "../lib/url.js";

test("erlaubt: /pfad, #anker, http(s)://, mailto:, tel: (case-insensitive, getrimmt)", () => {
  for (const ok of ["/", "/en/it-care/", "/#kontakt", "#rechner", "/avv.pdf", "https://cal.kozlowski-it.de/x", "HTTP://example.org",
    "mailto:pk@kozlowski-it.de", "MAILTO:x@y", "tel:+491628213267", "  /trim/  "]) {
    assert.ok(isSafeHref(ok), ok);
  }
  assert.equal(safeHref("  /trim/  "), "/trim/");
});

test("abgelehnt: javascript:/data:/vbscript:, protokoll-relativ, Steuer-/Leerzeichen, leer", () => {
  for (const bad of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "java\tscript:alert(1)", "java\nscript:x", "jav\u0000ascript:x",
    "data:text/html,x", "vbscript:x", "//evil.example", "/\\evil.example", "\\\\evil", "https:evil", "ftp://x", "relativ/pfad",
    "/a b", "", "   ", undefined, null, 42]) {
    assert.ok(!isSafeHref(bad), JSON.stringify(bad));
  }
  assert.throws(() => safeHref("javascript:alert(1)"), /unerlaubtes Link-Ziel/);
});
