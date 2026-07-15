# Umsetzungsplan: kozlowski-it.de — Hybrid-Relaunch mit 11ty

> **Grundlage:** Design-Doc `2026-07-15-multipage-hybrid-design.md` (Panel 5/5 Hybrid).
> **Rev. 2026-07-15:** technische 11ty-Review eingearbeitet (2 Blocker + 7 wichtig + 3 kosmetik).
> **Ausführung:** Phase für Phase; nach jeder Phase Build grün + Parity-Check grün + Live-Verify.

**Ziel:** Bestehende Single-Page + Einzelseiten auf ein **11ty-Fundament** (Header/Nav/Footer einmal, DE/EN aus einer Quelle → Drift tot), Nav-Leiste + CSS-Hamburger, dann Tiefe-Seiten.

**Tech:** Eleventy (LTS), Nunjucks-Partials, statisches HTML-Output, bestehende `style.css`, kein Framework. Deploy unverändert (rsync `_site/` → docker01-nginx). Strikte CSP bleibt (CSS-only-Hamburger, externes JS wie bisher). **JSON-LD (`<script type=ld+json>`) bleibt byte-identisch** (SEO) — 11ty rendert den Block unverändert (kein CSP-Problem, ist nicht-ausführbar).

**Grundregel (CRO):** Startseite bleibt vollwertige Verkaufsseite. **Erst Fundament + Unterseiten, Startseite ~unverändert migrieren; Straffen später, getrennt.**

---

## Phase 0 — Absicherung
- [ ] **Source-Backup/Branch:** `git tag pre-11ty-relaunch`, Feature-Branch `feat/multipage-hybrid`.
- [ ] **Live-Baum-Backup (W7):** den aktuell deployten Baum auf docker01 timestamped sichern: `cp -a /opt/docker/apps/landing/pk-landing /opt/docker/apps/landing/pk-landing.bak-preview-<ts>` — damit Rollback ein reiner `rsync`-Back ist, unabhängig von der Node/11ty-Toolchain.
- [ ] **Verify:** Tag da; Branch aktiv; Live-Backup-Verzeichnis existiert.

## Phase 1 — 11ty-Fundament (Parität = Kern)

### Task 1.1 — Eleventy-Scaffold (+ dir.input!, + Node-Pin)
- [ ] `package.json` + `@11ty/eleventy` (LTS-Version pinnen) + `.eleventy.js`.
- [ ] **PFLICHT (Blocker B2):** in `.eleventy.js` `return { dir: { input: "src", includes: "_includes", data: "_data", output: "_site" } }` — sonst rendert 11ty `docs/*.md` (unsere Plan-/Design-Dokumente) als Live-Seiten. Zusätzlich `.eleventyignore` (README/docs).
- [ ] **Node-Pin (W1):** `.nvmrc` + `package.json` `engines.node` auf aktuelle LTS (§14.5).
- [ ] `.eleventy.js`: `addPassthroughCopy("assets")`, Output `_site/`.
- [ ] **Verify:** `npx @11ty/eleventy` baut fehlerfrei; **`_site/` enthält KEIN `/docs/`** (B2 gegengeprüft).

### Task 1.2 — Shared Chrome als Partials (Drift-Killer)
- [ ] `_includes/layouts/base.njk` (html-Gerüst, CSP-kompatibel — kein Inline-Style/JS), zieht `header.njk`/`nav.njk`/`footer.njk`.
- [ ] `nav.njk`: 5-Punkte-Nav + **CSS-only-Hamburger**. **(K1)** `<input type="checkbox" id="navtoggle">` steht im DOM **VOR** dem `<nav>` (Sibling-Selektor `#navtoggle:checked ~ nav`), visuelle Reihenfolge via Flex/Grid `order` in `style.css`. Kein JS.
- [ ] `footer.njk`: Recht-Links + Zweitrang-Nav.
- [ ] **Verify:** Testseite rendert mit Chrome; Hamburger toggelt per CSS (mobile Breite); grep `_site` → 0 Inline-`style=`/`<style>`/`on*=` (CSP-clean).

### Task 1.3 — i18n aus EINER Quelle (+ translationKey + computed strings)
- [ ] `_data/site.json` (global) + `_data/i18n/de.json` + `_data/i18n/en.json` (Chrome-Strings).
- [ ] **(W2)** `eleventyComputed.strings = data => data.i18n[data.lang]` → Partials nutzen nur `{{ strings.nav.x }}` (kein `i18n[lang]`-Wiederholen = kein neues Drift-Risiko).
- [ ] **(W3) Sprach-Pendant robust:** rohes Front-Matter `translationKey` (stabile ID pro logischer Seite) in DE- UND EN-Variante — **NICHT** das offizielle i18n-Plugin (setzt symmetrische Prefixe voraus; hier ist DE unpräfixiert). `eleventyComputed.altLangUrl` sucht über `collections.all` das Pendant mit gleichem `translationKey` + anderem `lang` → dessen `page.url`. `translationKey` MUSS rohes Front-Matter sein (nicht computed — Cascade-Reihenfolge). Directory-Mirroring (DE `/…/`, EN `/en/…/`) bleibt der Permalink-Mechanismus; `translationKey` fängt spätere Slug-Divergenz ab.
- [ ] **(B1 + W4) Parity-Check gegen `_site/`-Output** (`scripts/check-parity.mjs`, HTML-Parser cheerio/linkedom): je DE-Seite existiert EN-Pendant (via `translationKey`); **strukturelle** Sektions-Parität (gleiche Anzahl + Reihenfolge Sektionen, gemappt über gemeinsamen `sectionKey` — **NICHT** identische Anker-IDs; DE `#leistungen` vs EN `#services` ist korrekt lokalisiert). Exit 1 bei Abweichung.
- [ ] **Verify:** `npm run build && node scripts/check-parity.mjs` grün (nach 1.4); künstliche Lücke → rot. **(K3)** Hinweis: dieses Verify wird erst nach Task 1.4 grün — 1.3 nicht als „blockiert" missverstehen.

### Task 1.4 — Startseite + Bestandsseiten migrieren (INHALT unverändert)
- [ ] `index.html` → `src/index.njk` (Content 1:1, nur Chrome durch Partials ersetzt); `en/index.html` → `src/en/index.njk`. `translationKey` je Paar. Recht-/Demos-/Projekte-Seiten übernehmen.
- [ ] **JSON-LD byte-identisch** halten (SEO). **(K2)** bei Content über i18n-JSON auf HTML-Entities achten (sonst als reiner Template-Text belassen).
- [ ] **(W5) Verify statt „byte-nah":** (1) normalisierter DOM-Diff alt↔neu (Whitespace/Attribut-Reihenfolge ignorieren) auf sichtbarem Text + href/src + Meta + JSON-LD; JSON-LD soll byte-identisch sein. (2) **visueller Screenshot-Diff** alt/neu (`headless:parity`-Skill im Environment vorhanden). Build grün, Parity grün, CSP-clean.

### Task 1.5 — Zusatz-Artefakte (sitemap/404/cache-bust) + Deploy
- [ ] **(W6) `sitemap.xml`** als 11ty-Template (alle DE+EN-Seiten). **`robots.txt`** mit Sitemap-Verweis.
- [ ] **(W6) `404.html`** (statisch, nginx `error_page 404`) — nötig bei Slug-Änderungen (`/projekte/`→„Nachweise").
- [ ] **(W6) Cache-Busting:** `addGlobalData("buildTime", () => Date.now())` als Query-Param an `style.css`/`theme.js`/`contact.js` — sonst gecachtes altes CSS bei Wiederbesuchern nach Deploy.
- [ ] **Cutover:** `npm run build` → `rsync _site/ → docker01:/opt/docker/apps/landing/pk-landing/`. **(W6) Link-Check:** `linkinator`/`linkchecker` gegen `_site` (kein 404). README: „nie HTML direkt editieren, immer `src/` + build".
- [ ] **Verify:** Live = erwartete Header (CSP/gzip unverändert) + Inhalt gleich; Buchungsknopf → cal.rs; sitemap/robots/404 erreichbar; **Rollback getestet** (rsync vom Live-Backup aus Phase 0 stellt in <1 Min wieder her).

### Task 1.6 — CI-Integration (W6)
- [ ] Build + Parity-Check + Link-Check als CI-Gate auf Push/PR (Pascal hat die Infra) — fail-loud, nicht nur lokale Skripte.
- [ ] **Verify:** CI läuft grün; absichtlich rote Parity → CI rot.

## Phase 2 — Tiefe-Seiten (der eigentliche Mehrwert)

### Task 2.1 — Nav scharf + Startseiten-Teaser verlinken
- [ ] Nav: `Leistungen`(#) · `Projekte`(/projekte/) · `Über mich`(/ueber-mich/) · `Ablauf`(#) · `[Termin buchen]`(cal.rs). Leistungs-Teaser → `/it-betreuung/` + `/software/`.
- [ ] **Verify:** alle Nav-Ziele existieren (Link-Check), DE+EN, Parity grün.

### Task 2.2 — `/it-betreuung/` + EN
- [ ] Je Leistungspunkt „wie ich das konkret mache" + **echter Beleg-Aufbau** (Wazuh-SIEM, Segmentierung, Backup-Konzept). Eigener Title/Meta/H1 (broad). Preis-/Kündbarkeits-Transparenz. CTA→cal.rs. **Ich-Form.** `translationKey`.
- [ ] **Verify:** ≥400 Wörter echter Content, jeder Claim an ein Artefakt; DE+EN; Parity grün.

### Task 2.3 — `/software/` + EN
- [ ] Analog, **Demos** (FlowGate/quellwerk/Zitadel/lernseite) als Belege. Eigener Title/Meta/H1.
- [ ] **Verify:** wie 2.2.

### Task 2.4 — `/ueber-mich/` + EN
- [ ] Substanz: Werdegang + **Haltung/Arbeitsweise** + „Sie reden mit mir, ich hafte" + Quereinstieg als Feature + IHK „Ende 2026" ehrlich. Kein Bio-Stub. Startseiten-Teaser verlinkt hierher.
- [ ] **Verify:** ≥300 Wörter mit Haltung; DE+EN; Parity grün.

### Task 2.5 — `/projekte/` → „Nachweise" (+ optional Merge `/demos/`)
- [ ] Umlabeln „Nachweise — eigene Systeme, live". Pro Aufbau: Ausgangslage→Entscheidungen→Ergebnis→live prüfbar. **Entscheidung beim Bau:** `/demos/` integrieren oder getrennt. **Slug-Änderung → 404/Redirect-Check** (alte `/projekte`-Links).
- [ ] **Verify:** Beweis-Charakter; DE+EN; Parity grün; keine toten alten Links.

### Task 2.6 — „Stand heute"-Block
- [ ] Datierter Status (Startseite/Über-mich): Kundenzahl, IHK-Status, dokumentierte Systeme. Wächst mit.
- [ ] **Verify:** sichtbar, korrekt datiert.

## Phase 3 — Später (nicht jetzt)
Branchen-Seiten nur mit echtem Projekt · FAQ ggf. eigene Seite · Startseite behutsam straffen (getrennter Schritt, nach Conversion-Beobachtung).

## Separat / parallel
- [ ] **Google-Business-Profil** anlegen/pflegen (Local-SEO-#1-Hebel) — unabhängig vom Redesign.

## Definition of Done (Gesamt)
`npm run build` grün · Parity-Check (gegen `_site/`, via translationKey + sectionKey) grün · Link-Check grün · strikte CSP eingehalten · alle Seiten DE+EN · Nav + CSS-Hamburger mobil ok · cal.rs-Buchung überall · sitemap/robots/404 da · Cache-Busting aktiv · CI-Gate grün · Rollback getestet · Startseite konvertiert standalone.
