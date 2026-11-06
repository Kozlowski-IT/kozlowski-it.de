# CMS Plan 1 (lokal lauffähig) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Inhalte von kozlowski-it.de liegen in einem lokal laufenden Payload-CMS; Eleventy rendert daraus eine Seite, die nachweislich gleich der heutigen Live-Seite ist; ein lokaler Builder kann Vorschau bauen, veröffentlichen und zurückrollen.

**Architecture:** Payload 3 (`cms/`, Postgres) hält Inhalte. Ein Export schreibt sie als JSON nach `content/`; Eleventy liest nur diese Dateien (kein Netz im Build). Der Builder (`builder/`) orchestriert Export → Eleventy → Prüfungen → atomarer Symlink-Wechsel. Infra (Zitadel, edge02, docker01) ist **Plan 2**, KI-Knopf + neue Bausteine sind **Plan 3**.

**Tech Stack:** Node 24, Eleventy 3.1.6, Nunjucks, Payload 3 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`), Postgres 18, vitest (cms), `node:test` (builder, scripts), cheerio 1.2.0.

**Spec:** `docs/2026-11-06-cms-design.md`

## Global Constraints

- Node `>=24 <25` (bestehendes `engines`); Eleventy bleibt `3.1.6`.
- Payload-Pakete **exakt gepinnt** (kein `^`/`~`), Version beim Install per `npm view payload version` bestimmen und in allen `@payloadcms/*` identisch setzen.
- Locales: `de` (Default), `en`; `fallback: false`.
- `pages.layout` (Blocks-Feld) **nicht** lokalisiert; Textfelder in Blöcken lokalisiert. **Kein** `localizeStatus`.
- Öffentliche Ausgabe unverändert: statisches HTML, gleiche CSP/Assets, keine Cookies, keine neuen Drittanbieter-Requests.
- Eleventy-Build liest Inhalte **nur** aus `content/*.json` (kein HTTP im Build).
- Builder: Timeout **120 s**, behält **10** Releases, ein Build gleichzeitig, letzter Stand gewinnt.
- Vorschau-HTML enthält `<meta name="robots" content="noindex">`.
- Längenempfehlungen (nur Warnung): Karten-Text ≤ 160, Hero-Claim ≤ 220 Zeichen.
- Migrations-Gate: normalisiertes HTML jeder Seite == Baseline aus Commit `a0dacf4`.

## Review Focus

1. **HTML/Sonderzeichen in Textfeldern** (`<script>`, `&`, Anführungszeichen) → müssen escaped auf der öffentlichen Seite landen, nie als Markup (XSS). → Test in Task 5.
2. **Bilinguale Seite mit leerem EN-Pflichtfeld** → Veröffentlichen schlägt mit Klartext-Grund fehl, Live bleibt unberührt. → Test in Task 9.
3. **Vorschau läuft, während veröffentlicht wird** → Publish wird nie von einem Preview „weggefasst“, Preview schreibt nie nach `releases/`. → Test in Task 10.
4. **Doppelter oder geänderter Slug** → doppelter Slug wird in Payload abgelehnt; interne Links auf alten Slug lassen Publish rot werden. → Tests in Task 3 und Task 9.
5. **Bild gelöscht, das eine Seite noch nutzt** → Publish schlägt mit Hinweis auf fehlende Datei fehl. → Test in Task 9.

---

### Task 1: Payload-Grundgerüst + lokale Datenbank

**Files:**
- Create: `cms/` (via `npx create-payload-app@<gepinnt> cms -t blank --db postgres`), `cms/docker-compose.dev.yml` (postgres:18, Port 5433, Volume), `cms/.env.example`
- Modify: `cms/src/payload.config.ts`, `.gitignore` (`cms/.env`, `cms/.next`, `content/`, `.baseline/`, `releases/`, `preview/`)
- Test: `cms/tests/int/config.int.spec.ts`

**Interfaces:**
- Produces: `getPayload({ config })` mit Locales `de`/`en`; Collection `users` (Payload-Auth, nur lokal); npm-Skripte `dev`, `test:int`, `seed`, `export` in `cms/package.json`.

- [ ] **Step 1:** Test schreiben: `config.localization.locales` ergibt `['de','en']`, `defaultLocale === 'de'`, `fallback === false`; `payload.create({collection:'users'})` + `find` funktioniert gegen die Dev-DB.
- [ ] **Step 2:** `docker compose -f cms/docker-compose.dev.yml up -d && cd cms && npm run test:int` → FAIL (Locales fehlen).
- [ ] **Step 3:** Localization in `payload.config.ts` setzen; Pakete exakt pinnen.
- [ ] **Step 4:** `npm run test:int` → PASS; `npm run dev` → Admin unter `http://localhost:3000/admin` erreichbar.
- [ ] **Step 5:** Commit `feat(cms): Payload-Grundgerüst mit DE/EN-Locales`.

### Task 2: Globals `site` + `chrome` mit Seed aus den heutigen JSON-Dateien

**Files:**
- Create: `cms/src/globals/Site.ts`, `cms/src/globals/Chrome.ts`, `cms/src/seed/seedGlobals.ts`
- Test: `cms/tests/int/globals.int.spec.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: Global `site` (Felder 1:1 wie `src/_data/site.json`, nicht lokalisiert); Global `chrome` (Struktur 1:1 wie `src/_data/i18n/de.json`, alle Strings lokalisiert, Arrays nicht lokalisiert); `seedGlobals(payload): Promise<void>` liest `src/_data/site.json` + `i18n/{de,en}.json`.

- [ ] **Step 1:** Test: nach `seedGlobals` liefert `findGlobal('site')` exakt den Inhalt von `site.json`; `findGlobal('chrome',{locale:'en'})` exakt den von `i18n/en.json` (deep-equal, ohne Payload-Metafelder).
- [ ] **Step 2:** Test laufen → FAIL.
- [ ] **Step 3:** Globals + Seed implementieren; Seed in `npm run seed` einhängen.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat(cms): Globals site/chrome + Seed`.

### Task 3: Collection `media` + `pages` mit Migrations-Bausteinen

**Files:**
- Create: `cms/src/collections/Media.ts`, `cms/src/collections/Pages.ts`, `cms/src/blocks/{hero,text,cards,steps,faq,ctaBar,figure,contactForm,vmwareCalculator}.ts`, `cms/src/blocks/index.ts`, `cms/src/fields/sectionFields.ts`, `cms/src/fields/lengthHint.ts`
- Test: `cms/tests/int/pages.int.spec.ts`

**Interfaces:**
- Produces:
  - `media`: Upload, WebP-`imageSizes`, Pflichtfeld `alt` (lokalisiert).
  - `pages`: `slug` (unique, DE), `slugEn`, `translationKey` (unique), `bilingual` (bool, default true), `title`/`description`/`ogTitle`/`ogDescription` (lokalisiert), `noindex` (bool), `minimalHeader` (bool), `structuredData` (select: `none` | `home`), `layout` (blocks, **nicht** lokalisiert), Drafts + Versions an (`autosave: { interval: 1500 }`).
  - `sectionFields()`: `sectionKey` (text, nicht lokalisiert, Pflicht) + `anchorId` (text, lokalisiert, z. B. DE `leistungen` / EN `services`) — in jedem Block.
  - `lengthHint(max: number)`: Feld-Option, die ab `max` Zeichen eine Admin-Warnung zeigt (UI-Beschreibung + `admin.components` Zähler), **keine** Validierungssperre.
  - Block-Slugs = Dateinamen oben; jeder Block hat optional `variant` (select), um bestehende Sonder-Markups (z. B. `callout` beim Sicherheitscheck) abzubilden. Felder je Block wie Spec §4.3.
  - `text.body` = Lexical-Rich-Text (lokalisiert).

- [ ] **Step 1:** Tests: (a) Seite mit `layout` aus 2 Blöcken in `de` anlegen, in `en` nur Texte setzen → `find({locale:'en'})` hat dieselbe Block-Reihenfolge und `sectionKey`s; (b) zweite Seite mit gleichem `slug` → wirft ValidationError; (c) Karten-Text mit 200 Zeichen speichert erfolgreich (nur Warnung).
- [ ] **Step 2:** Tests → FAIL.
- [ ] **Step 3:** Collections, Blöcke, Felder implementieren.
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5:** Commit `feat(cms): pages/media + Baustein-Katalog (Migration)`.

### Task 4: Export nach `content/`

**Files:**
- Create: `cms/src/export/exportContent.ts`, `cms/src/export/lexicalToHtml.ts`
- Test: `cms/tests/int/export.int.spec.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces: `exportContent(payload, { outDir: string, drafts: boolean }): Promise<ExportResult>` schreibt
  - `content/site.json` (wie `src/_data/site.json`),
  - `content/chrome.json` (`{ de: {...}, en: {...} }` wie heute `i18n`),
  - `content/pages.json`: `Array<{ translationKey, bilingual, noindex, minimalHeader, structuredData, locales: { de: LocalizedPage, en?: LocalizedPage } }>`, `LocalizedPage = { slug, title, description, og?: {title, description}, blocks: Array<{ blockType, sectionKey, anchorId, variant?, ...Felder dieser Locale; Rich-Text bereits als HTML }> }`,
  - `content/media/*` (genutzte Dateien kopiert).
  - `ExportResult = { pages: number, missing: string[] }` — `missing` listet Pflichtfelder bilingualer Seiten ohne EN-Wert und referenzierte, aber fehlende Medien (`"<translationKey>/<locale>/<feld>"`).
  - `npm run export -- --drafts` (CLI-Wrapper).

- [ ] **Step 1:** Tests: veröffentlichte vs. Entwurfsfassung — `drafts:false` exportiert den publizierten Text, `drafts:true` den Entwurf; leeres EN-`title` bei bilingualer Seite erscheint in `missing`; Rich-Text `<p>a &amp; b</p>` kommt als HTML-String an.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren (Lexical→HTML über `convertLexicalToHTML` aus `@payloadcms/richtext-lexical`). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(cms): Export nach content/*.json`.

### Task 5: Eleventy rendert Seiten aus `content/`

**Files:**
- Create: `src/_data/cms.js`, `src/cms-pages.njk` (Pagination), `src/_includes/blocks/{hero,text,cards,steps,faq,ctaBar,figure,contactForm,vmwareCalculator}.njk`, `test/fixtures/content/*.json`, `test/render.test.mjs`
- Modify: `src/_data/site.json` → ersetzt durch `src/_data/site.js` (liest `content/site.json`, Fallback alte JSON bis Task 7), `src/_data/i18n/` → `src/_data/i18n.js` (liest `content/chrome.json`), `src/_data/eleventyComputed.js` (`lang`/`altLangUrl` aus `cmsPage`, wenn vorhanden), `package.json` (`"test": "node --test test/"`, `CONTENT_DIR` env, Default `content/`)

**Interfaces:**
- Consumes: Format aus Task 4.
- Produces: `src/_data/cms.js` exportiert `pages` als flache Liste `Array<{ lang, translationKey, bilingual, permalink, ...LocalizedPage }>` (eine pro Seite×Locale; `permalink` = `/` + slug + `/` bzw. `/en/` + slugEn + `/`, Startseite `/` und `/en/`). `cms-pages.njk` paginiert mit `size: 1, alias: cmsPage`, setzt `translationKey`, `bilingual`, `title`, `description`, `og`, `robots` (`noindex` → `"noindex"`), `structuredData` (`home` → `partials/jsonld-home.njk`), `contactScript`/`calcScript` automatisch, wenn Block `contactForm`/`vmwareCalculator` enthalten. Jede Block-Partial rendert `<section … data-section-key="{{ block.sectionKey }}" id="{{ block.anchorId }}">`.
- `eleventyComputed.lang`: `data.cmsPage?.lang ?? (bisherige Pfadlogik)`; `altLangUrl` sucht über `item.data.cmsPage?.translationKey ?? item.data.translationKey` und `item.data.cmsPage?.lang`.

- [ ] **Step 1:** Tests (`CONTENT_DIR=test/fixtures/content npx eleventy --output=.test-site`): `/` und `/en/` existieren mit `lang="de"`/`"en"`; `hreflang`-Links zeigen gegenseitig aufeinander; Fixture-Text `<script>alert(1)</script> & "x"` erscheint im HTML nur escaped; Seite mit `contactForm`-Block bindet `contact.js` ein, ohne nicht.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementieren (Nunjucks-Autoescape an lassen; nur Rich-Text-HTML aus dem Export mit `| safe`). **Step 4:** → PASS; `npm run check` (alte Seiten) weiterhin grün.
- [ ] **Step 5:** Commit `feat(site): Eleventy rendert CMS-Seiten aus content/`.

### Task 6: Baseline + Gleichheitstest

**Files:**
- Create: `scripts/baseline.sh`, `scripts/check-equal.mjs`, `test/check-equal.test.mjs`
- Modify: `package.json` (`"baseline"`, `"equal"`)

**Interfaces:**
- Produces: `scripts/baseline.sh` baut Commit `a0dacf4` in einem temporären `git worktree` nach `.baseline/` (idempotent). `node scripts/check-equal.mjs <baselineDir> <siteDir> [--only <url>...]` → Exit 0/1, gibt pro abweichender Seite den ersten Unterschied (Selektor + erwartet/ist) aus. Normalisierung: Whitespace kollabiert, Attribute sortiert, Kommentare entfernt, `?v=<hash>`-Cache-Busting entfernt; verglichen werden alle `.html` + `sitemap.xml`.

- [ ] **Step 1:** Tests mit Mini-Fixtures: identisch bis auf Whitespace/Attributreihenfolge → 0; ein geändertes Wort → 1 mit Ausgabe, die die Seite + Selektor nennt; fehlende Seite → 1.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS; `npm run baseline && npm run build && npm run equal` mit heutigem Stand → 0.
- [ ] **Step 5:** Commit `test(site): Baseline + Gleichheitstest (Migrations-Gate)`.

### Task 7: Startseite migrieren (DE + EN)

**Files:**
- Create: `cms/src/seed/pages/home.json` (Seed im Payload-Create-Format, beide Locales), `cms/src/seed/seedPages.ts`
- Delete: `src/index.njk`, `src/en/index.njk`
- Modify: `cms/src/seed/` (in `npm run seed`)

**Interfaces:**
- Consumes: Tasks 3–6. Produces: `seedPages(payload, dir)` legt alle `cms/src/seed/pages/*.json` als veröffentlichte Seiten an (idempotent über `translationKey`).

- [ ] **Step 1:** Gate formulieren: `npm run equal -- --only / --only /en/` muss 0 liefern (aktuell FAIL, weil CMS-Seite fehlt bzw. doppelt).
- [ ] **Step 2:** Seed-JSON aus `src/index.njk` + `src/en/index.njk` extrahieren (jede Sektion → Block, `sectionKey` aus `data-section-key`, `anchorId` aus `id`); fehlt ein Markup im Katalog, `variant` am passendsten Block ergänzen (nicht neuen Freitext-HTML-Block).
- [ ] **Step 3:** `npm run seed && npm run export && npm run build && npm run equal -- --only / --only /en/` → 0; `npm run parity` → OK.
- [ ] **Step 4:** Commit `feat(cms): Startseite migriert (gleich zur Baseline)`.

### Task 8: Restliche Seiten migrieren

**Files:**
- Create: `cms/src/seed/pages/{it-betreuung,it-infrastrukturanalyse,software,ueber-mich,projekte,demos,vmware-ausstieg,danke,impressum,datenschutz,avv}.json`
- Delete: entsprechende `src/*.njk` + `src/en/*.njk`; `src/_data/site.json`, `src/_data/i18n/*.json` (Fallback aus Task 5 entfernen)
- Bleiben Code: `src/404.njk`, `src/robots.njk`, `src/sitemap.njk`

- [ ] **Step 1:** Wie Task 7 pro Seite; Rechtsseiten (`bilingual:false`) als `text`-Block mit `variant: legal`, HTML→Lexical über `convertHTMLToLexical`.
- [ ] **Step 2:** `npm run seed && npm run export && npm run build && npm run equal` (alle Seiten + `sitemap.xml`) → 0; `npm run parity` → OK.
- [ ] **Step 3:** Commit `feat(cms): alle Inhaltsseiten migriert (gleich zur Baseline)`.

### Task 9: Builder-Kern — bauen, prüfen, umschalten, zurück

**Files:**
- Create: `builder/package.json`, `builder/src/build.mjs`, `builder/src/checks.mjs`, `builder/src/releases.mjs`, `builder/test/*.test.mjs`
- Create: `scripts/check-links.mjs` (interne Links/Assets in einem Site-Ordner)

**Interfaces:**
- Produces:
  - `runBuild({ mode: 'preview'|'publish', siteRoot, workDir, exportFn }): Promise<{ ok: true, release?: string } | { ok: false, reason: string }>` — `exportFn(outDir, {drafts})` ist der Payload-Export (Task 4, injiziert für Tests). `preview` → `workDir/preview/` (+ `noindex`-Meta in jede Seite); `publish` → `workDir/releases/<YYYY-MM-DD_HHmmss>/`, dann Checks, dann `switchCurrent`.
  - `runChecks(siteDir, exportResult): Promise<string[]>` — leeres Array = grün; enthält Meldungen aus `export.missing`, `check-parity`, `check-links`.
  - `switchCurrent(workDir, release)`: Symlink `current.tmp` → `rename` auf `current` (atomar); `listReleases(workDir): string[]` (neueste zuerst); `prune(workDir, keep = 10)`; `rollback(workDir, release)` = `switchCurrent` ohne Build, Fehler wenn Release fehlt.

- [ ] **Step 1:** Tests: (a) erfolgreicher Publish → `current` zeigt auf neuen Release; (b) Export mit `missing: ['home/en/title']` → `{ok:false}` mit „home/en/title“ im Grund, `current` unverändert; (c) toter interner Link (geänderter Slug) → rot; (d) fehlendes Medium → rot; (e) 12 Publishes → 10 Releases übrig, `current` darunter; (f) `rollback` auf älteren Release → `current` zeigt dorthin; (g) Preview schreibt nur nach `preview/` und jede Seite hat `noindex`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(builder): bauen, prüfen, atomar umschalten, zurück`.

### Task 10: Builder-HTTP-Dienst + Warteschlange

**Files:**
- Create: `builder/src/server.mjs`, `builder/src/queue.mjs`, `builder/test/server.test.mjs`

**Interfaces:**
- Consumes: Task 9.
- Produces: HTTP (`node:http`), Header `Authorization: Bearer $BUILDER_TOKEN` Pflicht (sonst 401):
  - `POST /preview` → 202 (asynchron, koalesziert), `POST /publish` → 200 `{ok, release|reason}` (wartet, max. 120 s, dann `{ok:false, reason:'timeout'}`), `POST /rollback {release}` → 200/404, `GET /releases` → `{current, releases[]}`.
  - `createQueue()`: ein Job gleichzeitig; mehrere wartende `preview` → nur der letzte läuft; `publish` wird **nie** verworfen und hat Vorrang vor wartenden Previews.

- [ ] **Step 1:** Tests: ohne/mit falschem Token → 401; 3× `/preview` schnell hintereinander → genau 1–2 Builds, letzter Stand gewinnt; `/preview` läuft + `/publish` kommt → Publish läuft danach und `releases/` enthält nur Publish-Ergebnisse; hängender Build → nach Timeout `reason:'timeout'`, nächster Job läuft.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren (Timeout im Test per Option auf ms verkürzbar). **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(builder): HTTP-Dienst mit Warteschlange + Timeout`.

### Task 11: Payload ↔ Builder: Vorschau, Veröffentlichen, Status, Zurück, Git-Abbild

**Files:**
- Create: `cms/src/hooks/triggerBuild.ts`, `cms/src/globals/PublishStatus.ts`, `cms/src/components/ReleaseList.tsx`, `cms/src/endpoints/rollback.ts`, `builder/src/gitSnapshot.mjs`, `cms/tests/int/publish.int.spec.ts`, `builder/test/gitSnapshot.test.mjs`
- Modify: `cms/src/collections/Pages.ts`, `cms/src/globals/{Site,Chrome}.ts` (Hooks), `cms/src/payload.config.ts` (`admin.livePreview.url` → `${PREVIEW_URL}/<permalink>`)

**Interfaces:**
- Consumes: Builder-API (Task 10) über `BUILDER_URL` + `BUILDER_TOKEN`.
- Produces:
  - `afterChange`: Entwurf gespeichert → `POST /preview` (fire-and-forget); `_status === 'published'` (Seite) oder Global gespeichert → `POST /publish`, Ergebnis in Global `publishStatus` (`{ state: 'live'|'failed', at, release?, reason? , warning? }`).
  - `ReleaseList`: zeigt `GET /releases`, Knopf „wieder live schalten“ → `POST /api/site/rollback` (Payload-Endpoint, nur eingeloggt) → Builder `/rollback`.
  - `gitSnapshot(repoDir, contentDir, release): Promise<{ok, warning?}>` — kopiert `content/*.json` ins Repo, commit `content: Veröffentlichung <release>`, push; Push-Fehler → `{ok:true, warning}` (Publish bleibt gültig).

- [ ] **Step 1:** Tests: Seite veröffentlichen ruft Builder `/publish` (Mock-Server) und setzt `publishStatus.state='live'`; Builder antwortet `{ok:false,reason}` → `state='failed'` mit Grund; Entwurf ruft nur `/preview`; `gitSnapshot` mit nicht erreichbarem Remote → `ok:true` + `warning`.
- [ ] **Step 2:** → FAIL. **Step 3:** implementieren. **Step 4:** → PASS.
- [ ] **Step 5:** E2E lokal (manuell, Ergebnis im Commit-Text): Payload + Builder lokal starten, Hero-Text ändern → Vorschau zeigt ihn in ≤ 5 s → Veröffentlichen → `current/index.html` enthält ihn → „wieder live schalten“ auf vorigen Release → alter Text.
- [ ] **Step 6:** Commit `feat(cms): Vorschau/Veröffentlichen/Zurück mit Builder + Git-Abbild`.

---

**Danach:** Plan 2 (Infra + Umschaltung live) und Plan 3 (KI-Knopf `claude-sonnet-5-5` + Bausteine `caseStudy`, `stats`, `logos`, `testimonials`) werden auf Basis des dann vorhandenen Codes geschrieben.
