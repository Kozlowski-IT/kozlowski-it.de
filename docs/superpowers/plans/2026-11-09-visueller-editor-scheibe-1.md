# Visueller Editor, Scheibe 1: Seitenansicht — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Admin eine Ansicht „Seite“, die die ganze Seite in echter Darstellung zeigt; Abschnitte anklicken, bearbeiten, verschieben, hinzufügen, löschen, mit Rückgängig und Autosave als Entwurf.

**Architecture:** Der Builder rendert einzelne Abschnitte im Speicher aus denselben Nunjucks-Vorlagen wie der Build. Payload wandelt Entwurfs-Blöcke ins Inhaltsformat und ruft den Builder serverseitig. Die Admin-Ansicht zeigt das HTML in einem `srcdoc`-iframe ohne Skripte, die Editor-Logik ist reines TypeScript.

**Tech Stack:** Payload 3.93, Next 16, React 19, Eleventy 3.1.6 mit Nunjucks, `node --test` (Root, Builder), Vitest 4 (cms).

**Spec:** `docs/superpowers/specs/2026-11-09-visueller-editor-design.md`. Weitere Scheiben (2 Raster, 3 Unterseiten und Knopf-Ziele, 4 Vorlagen und Design) bekommen eigene Pläne, wenn Scheibe 1 steht.

## Global Constraints

- Arbeit im Worktree `~/projects/pk-landing-cms`, Branch `feat/cms`. Live-Deployment ist nicht Teil dieses Plans.
- Bestehende URLs und das Aussehen der Live-Seiten ändern sich nicht. Am Inhaltsformat ändert Scheibe 1 nichts (`schemaVersion` bleibt 1).
- Besucher der Seiten bekommen keine neuen Skripte oder Cookies. Zuordnungsmarken stehen nur im Editor-Rendering.
- Nichts geht ohne Entwurf → Vorschau → Veröffentlichen live; die Ansicht speichert ausschließlich Entwürfe.
- Eine Darstellung: kein Nachbau der Vorlagen in React.
- Fachlogik ist reines TypeScript ohne Imports aus `payload`, `next`, `react`, `@payloadcms/*` (`cms/src/editor/core/`).
- `BUILDER_TOKEN` verlässt nie den Server. Der Browser spricht nur mit Payload, Endpunkte verlangen `req.user`.
- Die bisherige Feldliste bleibt als Rückfall erreichbar.
- Oberflächentexte auf Deutsch in Alltagssprache, Statustexte exakt: „Wird gespeichert …“, „Gespeichert, noch nicht online“, „Speichern fehlgeschlagen, wird wiederholt“.

## Review Focus

1. Autosave scheitert (Netz weg, Sitzung abgelaufen): Status zeigt den Fehler, Änderungen bleiben im Browser und werden wiederholt; nichts geht still verloren.
2. Ein Abschnitt lässt sich nicht rendern (Pflichtfeld im Entwurf leer, unbekannter Typ): Nur dieser Abschnitt zeigt einen Hinweis, die übrige Seite bleibt bedienbar.
3. Inhalte mit `<script>` oder Event-Attributen in Textfeldern: laufen im Editor nicht (`sandbox` ohne `allow-scripts`).
4. Abschnitt in DE hinzugefügt oder verschoben: In EN gilt dieselbe Reihenfolge, neuer Abschnitt bekommt einen eindeutigen `sectionKey`, der Paritäts-Check bleibt grün.
5. Formular und Rechner im Editor: Klicks senden nichts ab und navigieren nicht; Links in der Mitte führen nicht aus dem Editor heraus.

---

### Task 1: Spike im echten Browser (Wegwerf, kein Commit in `src`)

Klärt zwei Annahmen, von denen Task 6 und 7 abhängen.

**Files:**
- Create: `docs/superpowers/plans/2026-11-09-spike-ergebnis.md`

- [ ] **Step 1: `srcdoc` prüfen.** Statische Testseite auf der CMS-Origin: `<iframe sandbox="allow-same-origin" srcdoc=…>` mit dem echten `/assets/css/style.css` und Sora-Font. Festhalten: Lädt die Schrift? Kann die Elternseite ins iframe-DOM greifen (Klick-Zuordnung, Höhe messen)? Blockt die CSP von `cms.kozlowski-it.de` etwas?
- [ ] **Step 2: Einstellungs-Panel prüfen.** Bevorzugt: Payload-Felder eines einzelnen Blocks über `@payloadcms/ui` (`Form`, `RenderFields`) mit Form-State aus `getFormState`, inklusive Lexical-Feld. Rückfall: `useDocumentDrawer` mit der vorhandenen Feldliste für Rich-Text, einfache Felder selbst.
- [ ] **Step 3: Ergebnis festhalten.** Ins Ergebnis-Dokument: gewählter Panel-Weg, Assets-Pfad für das iframe, CSP-Anpassungen. Weichen die Annahmen ab, Plan vor Task 6 anpassen und Pascal informieren.

### Task 2: Renderer für einzelne Abschnitte

**Files:**
- Create: `lib/renderSections.js`, `lib/filters.js`
- Modify: `.eleventy.js:22-44` (Filter aus `lib/filters.js` registrieren)
- Test: `test/render-sections.test.mjs`

**Interfaces:**
- Produces: `createRenderer({ includesDir?: string }): { render(input: RenderInput): RenderResult }`
- `RenderInput = { frame: string, lang: "de"|"en", site: object, strings: object, blocks: object[] }`, Blöcke im Inhaltsformat v1
- `RenderResult = { sections: Array<{ index: number, html?: string, error?: string }> }`
- Produces: `registerFilters(addFilter: (name, fn) => void): void` in `lib/filters.js`

- [ ] **Step 1: Failing test schreiben.** `render liefert fuer jeden Abschnitt das HTML des Builds`: Eleventy in Temp-Ordner bauen, für jede Seite aus `content/pages.json` rendern und je `<section … data-section-key="X">` gegen `_site` vergleichen, Whitespace normalisiert. Erwartung: alle Abschnitte mit `sectionKey` gleich (`legal`-Texte ohne Schlüssel ausgenommen, Anzahl im Test festschreiben). `unbekannter Typ gibt error nur an diesem Index`: `blocks: [gueltig, {blockType:"gibtsnicht"}, gueltig]` → `sections[1].error` gesetzt, 0 und 2 haben `html`.
- [ ] **Step 2: Test laufen lassen.** Run: `node --test test/render-sections.test.mjs`. Expected: FAIL, Modul fehlt.
- [ ] **Step 3: `lib/filters.js` und `lib/renderSections.js` schreiben.** Nunjucks-Umgebung mit `src/_includes`, gleiche Filter und Autoescape wie Eleventy, Platzhalter wie in `lib/content.js` (`loadPages`). Fehler pro Abschnitt fangen. Der `bust`-Filter darf hier ohne Dateizugriff laufen.
- [ ] **Step 4: Tests.** Run: `node --test "test/**/*.test.mjs"`. Expected: alle grün; `.eleventy.js` baut unverändert.
- [ ] **Step 5: Commit** `feat(editor): Abschnitte im Speicher aus den echten Vorlagen rendern`.

### Task 3: Builder-Route `POST /render`

**Files:**
- Modify: `builder/src/server.mjs` (`ROUTES`, Body-Limit pro Route, `handle`)
- Test: `builder/test/render-route.test.mjs`

**Interfaces:**
- Consumes: `createRenderer` aus Task 2
- Produces: `POST /render` mit `RenderInput` → `200 RenderResult`; Limit `RENDER_MAX_BODY_BYTES = 512 * 1024`

- [ ] **Step 1: Failing tests.** `render ohne token 401`; `render umgeht die warteschlange` (läuft, während ein Build-Job hängt); `render ueber 512 KiB 413`; `andere routen behalten 16 KiB`.
- [ ] **Step 2: Laufen lassen.** Run: `cd builder && npm test`. Expected: FAIL.
- [ ] **Step 3: Route einbauen.** Rendert synchron ohne `queue.enqueue`, Limit vor `readBody` nach Pfad wählen. `site` und `strings` kommen aus dem Request.
- [ ] **Step 4: Tests.** Run: `cd builder && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(builder): Route zum Rendern einzelner Abschnitte`.

### Task 4: Payload-Endpunkt und Umwandlung ins Inhaltsformat

**Files:**
- Modify: `cms/src/export/exportContent.ts` (Block-Umwandlung als Export)
- Create: `cms/src/endpoints/editorRender.ts`
- Modify: `cms/src/hooks/triggerBuild.ts` (`renderSections`), `cms/src/payload.config.ts`
- Test: `cms/tests/int/editorRender.int.spec.ts`

**Interfaces:**
- Produces: `blocksToContent(payload: Payload, blocks: unknown[], locale: "de"|"en"): Promise<object[]>`
- Produces: `POST /api/site/editor-render`, Body `{ pageId: number|string, locale: "de"|"en", blocks: unknown[] }` → `RenderResult`; 401 ohne Anmeldung, 415 ohne JSON

- [ ] **Step 1: Failing tests.** `ohne anmeldung 401`; `rich text wird html wie beim export` (gleicher Block über `exportContent` und `blocksToContent`, `deepEqual`); `unvollstaendiger block bricht nicht ab` (leeres Pflichtfeld ergibt im `RenderResult` nur dort `error`).
- [ ] **Step 2: Laufen lassen.** Run: `cd cms && npm test -- editorRender`. Expected: FAIL.
- [ ] **Step 3: Umsetzen.** `walk` wiederverwenden, nicht duplizieren. `frame`, `site`, `strings` serverseitig aus Seite und Globals (Stand Entwurf). Muster für Auth und JSON-Prüfung: `cms/src/endpoints/rollback.ts`. Builder-Fehler als `502` mit deutschem Grund.
- [ ] **Step 4: Tests.** Run: `cd cms && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): Entwurfs-Bloecke per Payload-Endpunkt rendern`.

### Task 5: Editor-Kern als reines TypeScript

**Files:**
- Create: `cms/src/editor/core/state.ts`, `cms/src/editor/core/saveStatus.ts`
- Test: `cms/tests/int/editorCore.int.spec.ts`

**Interfaces:**
- `EditorBlock = { id: string; blockType: string; sectionKey: string; [k: string]: unknown }`
- `EditorState = { blocks: EditorBlock[]; past: EditorBlock[][]; future: EditorBlock[][]; selectedId: string | null }`
- `createState(blocks): EditorState`, `moveBlock(s, id, toIndex)`, `addBlock(s, block, atIndex)`, `removeBlock(s, id)`, `updateBlock(s, id, patch)`, `select(s, id|null)`, `undo(s)`, `redo(s)`; alle rein, geben neuen Zustand
- `uniqueSectionKey(blockType: string, taken: string[]): string`
- `SaveStatus = "saved"|"saving"|"error"`, `statusText(status): string` mit den Texten aus den Global Constraints

- [ ] **Step 1: Failing tests.** `move ordnet um und ist rueckgaengig machbar`; `remove dann undo stellt block an alter stelle wieder her`; `neue aktion loescht future`; `undo auf leerem past aendert nichts`; `select ist kein undo-schritt`; `uniqueSectionKey vermeidet belegte schluessel`; `tippen fasst updates desselben felds zu einem schritt zusammen` (`updateBlock` mit `coalesceKey`); `kern importiert kein framework` (Quelltext-Prüfung auf verbotene Imports).
- [ ] **Step 2: Laufen lassen.** Run: `cd cms && npm test -- editorCore`. Expected: FAIL.
- [ ] **Step 3: Umsetzen** in den genannten Dateien, Historie auf 100 Schritte begrenzen.
- [ ] **Step 4: Tests.** Run: `cd cms && npm test -- editorCore`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): reiner Editor-Kern mit Rueckgaengig`.

### Task 6: Ansicht „Seite“: Zeichenfläche, Auswahl, Verschieben, Autosave

**Files:**
- Create: `cms/src/editor/view/VisualEdit.tsx`, `Canvas.tsx`, `useAutosave.ts`, `markup.ts`
- Modify: `cms/src/collections/Pages.ts` (`admin.components.views.edit`: Tab „Seite“, Pfad `/visual`), Import-Map neu erzeugen
- Test: `cms/tests/int/editorMarkup.int.spec.ts`

**Interfaces:**
- Consumes: Task 4, Task 5, Spike-Ergebnis
- Produces: `buildSrcdoc(sections: RenderResult["sections"], assets: AssetPaths): string` in `markup.ts`
- Produces: `<VisualEdit />` als Payload-Tab

- [ ] **Step 1: Failing tests** für `buildSrcdoc`: `marken nur zwischen abschnitten` (`<!--b:N-->`); `fehlerhafter abschnitt zeigt hinweis statt abbruch`; `enthaelt keine skripte der seite`.
- [ ] **Step 2: Laufen lassen.** Run: `cd cms && npm test -- editorMarkup`. Expected: FAIL.
- [ ] **Step 3: `markup.ts`** umsetzen, Tests grün.
- [ ] **Step 4: Ansicht bauen.** Entwurf per REST mit `draft=true`, iframe `sandbox="allow-same-origin"`, Klick wählt Abschnitt über die Marken, Links und Formulare in der Mitte per Bedien-Ebene abgefangen. Abschnitte ziehen und Hoch/Runter-Knöpfe rufen `moveBlock`. Strg+Z und Strg+Y nur außerhalb von Eingabefeldern. `useAutosave`: nach 1,5 s Ruhe `PATCH /api/pages/:id?draft=true&autosave=true`, bei Fehler Wiederholung mit Backoff, Status nach `saveStatus`, Warnung beim Verlassen mit ungespeicherten Änderungen. Nur geänderte Abschnitte neu rendern, Höhe des iframes nachführen.
- [ ] **Step 5: Im echten Browser prüfen** (lokal `cd cms && npm run dev`, Builder lokal): Startseite sieht aus wie die Vorschau, Abschnitt verschieben, Strg+Z, Neuladen zeigt den gespeicherten Stand, Netz abklemmen zeigt „Speichern fehlgeschlagen, wird wiederholt“. Formular-Knopf sendet nichts ab.
- [ ] **Step 6: Commit** `feat(editor): Ansicht Seite mit Zeichenflaeche und Autosave`.

### Task 7: Bearbeiten: Einstellungen, Text auf der Seite, Einfügen aus Word

**Files:**
- Create: `cms/src/editor/view/Panel.tsx`, `InlineText.ts`, `cms/src/editor/core/pasteClean.ts`
- Test: `cms/tests/int/pasteClean.int.spec.ts`

**Interfaces:**
- Produces: `cleanPastedHtml(html: string): string`, erlaubt nur die Teilmenge aus `cms/src/lexical/features.ts`

- [ ] **Step 1: Failing tests.** `word-formatierung faellt weg` (`mso-`-Stile, `<font>`, Farben raus, `<strong>`, Listen, Überschriften h2–h4, Links bleiben); `skripte und event-attribute fallen weg`; `links ausserhalb der allow-list verlieren das href`.
- [ ] **Step 2: Laufen lassen.** Run: `cd cms && npm test -- pasteClean`. Expected: FAIL.
- [ ] **Step 3: `pasteClean.ts` umsetzen,** Tests grün.
- [ ] **Step 4: Panel** nach dem Weg aus Task 1; rechts nur bei Auswahl sichtbar. Reine Textfelder per `contentEditable="plaintext-only"` direkt auf der Seite, Zuordnung über dieselben Marken, im Export nie sichtbar. Rich-Text bleibt im Panel, Einfügen läuft über `cleanPastedHtml`.
- [ ] **Step 5: Im Browser prüfen.** Überschrift direkt ändern, Text aus Word einfügen, Strg+Z beim Tippen nimmt einen sinnvollen Schritt zurück, Vorschau zeigt dieselbe Änderung.
- [ ] **Step 6: Commit** `feat(editor): Bearbeiten auf der Seite und sauberes Einfuegen`.

### Task 8: Abschnitte hinzufügen, Bildkatalog, Foto tauschen, Statuszeile

**Files:**
- Create: `cms/src/editor/view/AddCatalog.tsx`, `StatusBar.tsx`, `cms/src/editor/core/blockDefaults.ts`
- Test: `cms/tests/int/blockDefaults.int.spec.ts`

**Interfaces:**
- Produces: `defaultBlock(blockType: string, taken: string[], newId: () => string): EditorBlock`, Name und Vorschaubild in `BLOCK_CATALOG` (Alltagsnamen, keine technischen Namen wie `ctaBar`)

- [ ] **Step 1: Failing tests.** `jeder katalogeintrag rendert ohne fehler` (über `createRenderer`); `neuer abschnitt hat beispielinhalt in de und en`; `sectionKey ist eindeutig`; `vmwareCalculator ist nicht im katalog` (Sonderbaustein der eigenen Seite).
- [ ] **Step 2: Laufen lassen.** Run: `cd cms && npm test -- blockDefaults`. Expected: FAIL.
- [ ] **Step 3: `blockDefaults.ts` umsetzen,** Tests grün.
- [ ] **Step 4: Oberfläche.** „+“ zwischen Abschnitten öffnet den Katalog. Klick oder Hineinziehen tauscht ein Bild über die Medien-API, Datei landet in `media`. Statuszeile dauerhaft sichtbar: Speicherstatus, nach Veröffentlichen „Jetzt online“ mit Link (Quelle Global `publishStatus`). Knopf „Veröffentlichen“ nutzt den bestehenden Weg.
- [ ] **Step 5: Im Browser prüfen.** Abschnitt einfügen, löschen, zurückholen, Bild tauschen, veröffentlichen auf lokalem Builder.
- [ ] **Step 6: Commit** `feat(editor): Katalog, Foto tauschen, Statuszeile`.

### Task 9: Abnahme Scheibe 1

- [ ] **Step 1: Alle Tests.** Run: `npm test && (cd builder && npm test) && (cd cms && npm test)`. Expected: alle grün, Abweichungen benennen.
- [ ] **Step 2: Gleichheit.** Mit gleichem Inhalt `_site` aus dem Stand vor dem Branch als `<baselineDir>` bauen, dann `node scripts/check-equal.mjs <baselineDir> _site`. Expected: Exit 0.
- [ ] **Step 3: Test durch Pascal.** Auf einer Testseite Text ändern, Abschnitt verschieben, Bild tauschen, Vorschau ansehen. Danach eine Büro-Kraft ohne Hilfe: Text aus Word einfügen und Bild tauschen. Rückmeldung als Eingabe für Scheibe 2 festhalten.
- [ ] **Step 4: Deployment** erst nach Pascals OK, eigener Schritt nach `docs/2026-11-07-cms-plan-2-infra.md` (Builder-Image und Payload-Image neu, CSP für die Ansicht prüfen).
