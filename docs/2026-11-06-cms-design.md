# Design-Doc: kozlowski-it.de — Inhalte per CMS pflegen (Payload + Eleventy)

- **Datum:** 2026-11-06 · **Status:** Entwurf (zur Review) · **Eigentümer:** Pascal Josef Kozlowski
- **Grundlage:** Brainstorming-Session 2026-10-13 bis 2026-11-06 (Entscheidungen unten jeweils von Pascal bestätigt)

## 1. Ziel

Pascal kann **jederzeit, von überall** (Laptop, Handy) **alle Inhalte** von kozlowski-it.de ändern, **ohne eine Datei anzufassen**: Texte, Bilder, Kontaktdaten, Reihenfolge von Abschnitten, neue Seiten aus fertigen Bausteinen.

**Erfolgskriterien**
1. Eine Textänderung geht vom Handy aus in < 2 Minuten live (inkl. Vorschau).
2. DE und EN können strukturell nicht auseinanderlaufen.
3. Ein Fehler beim Veröffentlichen nimmt die Live-Seite nie offline.
4. Die öffentliche Seite behält ihr heutiges Profil: statisches HTML, strenge CSP, keine Cookies, keine Drittanbieter.
5. Jede veröffentlichte Version ist wiederherstellbar.

## 2. Entscheidungen (bestätigt)

| Frage | Entscheidung |
|---|---|
| Umfang | **Bausteine**: Inhalte ändern + Seiten/Abschnitte aus vordefinierten Bausteinen bauen. Design (Farben, Schriften, Icon-Set) bleibt Code. |
| Zugang | **Überall per Login** über Zitadel (`id.kozlowski-it.de`), Passkey |
| Veröffentlichen | **Entwurf → Vorschau → Knopf** „Veröffentlichen“; Versionen + Zurück |
| Sprachen | Eine gemeinsame Bausteinliste pro Seite, Texte je Sprache; **KI-Knopf „EN-Vorschlag“** |
| System | **Payload CMS 3** (self-hosted, Postgres) + bestehendes **Eleventy** als Renderer |
| Infra | Wird in derselben Session gebaut (strikt additiv), Änderungen werden in der Memory dokumentiert |

Verworfen: Sveltia CMS (Zitadel-Login nur über zusätzliches Forgejo, echte Vorschau braucht Extra-Pipeline, API-Key im Browser), Directus (Bausteine + Übersetzungen verschachtelt, Schema in DB, BSL).

**Hinweis:** Weder Payload noch Sveltia zeigen DE/EN laut Doku in zwei Spalten — Payload hat einen Sprachumschalter. Die gemeinsame Struktur ist trotzdem garantiert (§4.1).

## 3. Architektur

```
 Browser (überall) ── https://cms.kozlowski-it.de
        │
 edge02 (167.233.66.82) ── oauth2-proxy (Zitadel, Rolle cms-editor)
        │ WireGuard
 docker01 — Stack /opt/docker/apps/cms/   (getrennt von /opt/tidelane — nicht anfassen)
   ├─ payload   Admin + API (Next.js)    ← nur von edge02
   ├─ postgres  Inhalte, Entwürfe, Versionen ← nur von payload
   ├─ builder   Eleventy + Vorlagen      ← nur von payload (Token)
   ├─ preview   nginx, liest preview/ read-only ← nur von edge02 (Pfad /vorschau/)
   └─ landing   nginx (bestehend)        ← liest releases/current read-only
```

- **Code vs. Inhalt:** Vorlagen, CSS, Bausteintypen, Formular-/Rechner-Logik = Code (Git). Text, Bild, Reihenfolge, Seiten = CMS.
- Die öffentliche Domain `kozlowski-it.de` bekommt **keinen** Admin-Pfad.

## 4. Inhaltsmodell

### 4.1 Seiten (Collection `pages`)
- `slug` (DE) + `slugEn`, `translationKey`, `bilingual` (false = nur DE: Impressum, Datenschutz, AVV)
- `title`, `description`, `og.title`, `og.description` — **lokalisiert**
- `layout`: **Blocks-Feld, NICHT lokalisiert** → gleiche Bausteinliste für DE und EN; Textfelder *innerhalb* der Bausteine sind lokalisiert (Payload: Feld-Lokalisierung in nicht-lokalisierten Blocks).
- Drafts + Versions aktiviert. **Kein** `localizeStatus` (experimentell/Beta) — DE und EN werden gemeinsam veröffentlicht.

### 4.2 Globals
- `site`: Firmenname, Inhaber, Telefon, E-Mail, Adresse, Region, Buchungs-URL, Portal-URL, GitHub, Logo (heute `src/_data/site.json`)
- `chrome`: Navigation, Footer, Sprachumschalter-Texte — lokalisiert (heute `src/_data/i18n/*.json`)

### 4.3 Bausteinkatalog
| Baustein | Felder (lokalisiert = L) |
|---|---|
| `hero` | eyebrow L, h1 L, claim L, trustPoints[] L, buttons[1–2] (label L, ziel), foto |
| `text` | eyebrow L, h2 L, body (Rich-Text) L, Variante `legal` für lange Rechtstexte |
| `cards` | eyebrow L, h2 L, cards[]: icon (Auswahl aus SVG-Set), title L, text L, link |
| `steps` | h2 L, steps[]: title L, text L, dauer L |
| `faq` | h2 L, items[]: frage L, antwort L |
| `caseStudy` | titel L, ausgangslage L, umsetzung L, dauer L, ergebnis L, bild, link |
| `stats` | items[]: zahl, label L |
| `logos` | h2 L, items[]: bild, name, link — **unsichtbar wenn leer** |
| `testimonials` | items[]: zitat L, name, firma — **unsichtbar wenn leer** |
| `figure` | bild, alt L, caption L |
| `ctaBar` | text L, button (label L, ziel) |
| `contactForm` | Texte L; Logik im Code |
| `vmwareCalculator` | Texte L; Logik im Code |

Jeder Baustein rendert ein `data-section-key` (aus Feld `sectionKey`, DE/EN gemeinsam) → bestehender Paritäts-Check bleibt gültig.

### 4.4 Leitplanken gegen Textwüste
Jedes Textfeld hat eine **Längenempfehlung mit Zähler** (z. B. Karte ≤ 160 Zeichen, Hero-Claim ≤ 220). Überschreitung = Warnung, kein Blocker.

### 4.5 Medien (Collection `media`)
Upload in Payload, automatische WebP-Größen (sharp). Pflichtfeld `alt` (L). Builder kopiert genutzte Dateien in den Release.

## 5. Build, Veröffentlichen, Zurück

**Builder** (interner HTTP-Dienst, Bearer-Token, ein Build gleichzeitig, letzter Stand gewinnt, Timeout 2 Min):

| Befehl | Ablauf |
|---|---|
| `preview` | Auslöser: Autosave. Holt Inhalte **inkl. Entwürfe** → baut nach `preview/` → erreichbar unter `cms.kozlowski-it.de/vorschau/…` (gleicher Login, `noindex`). Payload Live-Preview-iframe lädt neu. |
| `publish` | Holt **nur veröffentlichte** Inhalte → baut nach `releases/<zeitstempel>/` → **Prüfungen** (Build fehlerfrei, `check-parity`, keine internen toten Links, keine leeren Pflichtfelder) → `current`-Symlink atomar umbiegen → JSON-Abbild nach `content/` im Repo committen + pushen → Status an Payload. |
| `rollback <release>` | Symlink auf älteren Release (letzte **10** werden behalten), kein Build. |

- Status in Payload (Global `publishStatus`): „Live seit …“ / „Fehlgeschlagen: Grund … — alte Seite bleibt online“ + Liste der Releases mit Knopf „wieder live schalten“.
- Inhaltliches Zurück: Payload-Versionshistorie → Wiederherstellen → erneut veröffentlichen.
- Code-Deploy (neue Vorlagen) → Builder-Image neu → automatischer `publish` mit aktuellen Inhalten.
- Eleventy bekommt die Inhalte über eine Datendatei (`src/_data/cms.js`), die zur Build-Zeit die Payload-API abfragt; Seiten werden per Pagination aus `pages` erzeugt.

## 6. Sicherheit

- **Edge:** vHost `cms.kozlowski-it.de` auf edge02, Wildcard-Cert `*.kozlowski-it.de` (bestehend), oauth2-proxy mit Zitadel-OIDC, Zugang nur mit Projektrolle `cms-editor`.
- **Payload:** OIDC-Login über Zitadel; Passwort-Login nur für Notfall-Admin, **nur intern** erreichbar (Break-Glass wie ERP).
- **Netz:** eigene Docker-Netze, Erreichbarkeit laut Tabelle §3; Postgres ohne Port nach außen; landing mountet Releases read-only.
- **KI-Knopf:** serverseitiger Payload-Endpoint → Claude API (`claude-sonnet-5-5`). Schlüssel nur serverseitig (Vault/`.env` 600). Sendet nur den DE-Text des Feldes (öffentlicher Werbetext, keine Personendaten). Tageslimit; Ergebnis landet als Entwurf im EN-Feld.
- **Öffentliche Seite:** unverändert statisch, CSP/Security-Header wie heute.
- **Secrets:** `.env` mode 600 bzw. Vault; Builder-Token und Payload-Secret zufällig.
- **Betrieb:** nächtlicher `pg_dump` + Medien-Backup; Payload-Version gepinnt, monatliches bewusstes Update.

## 7. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Build/Prüfung rot | alte Seite bleibt live, Grund in Payload |
| Payload/Postgres down | öffentliche Seite unberührt, nur Bearbeiten pausiert |
| Zitadel down | Seite unberührt, Notfall-Admin intern |
| Builder hängt | Timeout 2 Min → „fehlgeschlagen“ |
| KI-Limit erreicht | Knopf meldet es, manuelle Eingabe weiter möglich |
| Git-Push des Abbilds scheitert | Veröffentlichung gilt trotzdem; Warnung in Payload, nächster Publish holt nach |

## 8. Tests

1. **Gleichheitstest (Migrations-Gate):** CMS-Build vs. heutiger Build, normalisiertes HTML pro Seite identisch. Ohne Grün keine Umschaltung.
2. Unit-Tests: Bausteine → HTML, Prüfungen im Builder, Symlink-Umschaltung/Rollback.
3. E2E: Text ändern → Vorschau zeigt ihn → Veröffentlichen → live → Rollback → alter Text.
4. Zugangstest von außen: ohne Login / ohne Rolle `cms-editor` → kein Zugriff auf Payload, Vorschau oder Builder.

## 9. Reihenfolge (jede Scheibe lauffähig)

0. **Vorab:** nicht committete Änderungen an `src/index.njk` + `src/en/index.njk` und 6 ungepushte Commits mit Pascal klären — nichts überschreiben.
1. Payload lokal + Startseite als Bausteine + Eleventy-Datenquelle + Gleichheitstest grün.
2. Restliche Seiten + Globals migrieren (Gleichheitstest für alle Seiten).
3. Builder: preview / publish / rollback lokal.
4. Infra: Zitadel-Projektrolle + OIDC-Apps, edge02-vHost + oauth2-proxy, Stack auf docker01 → Umschaltung der Landing auf `releases/current`. Memory-Notiz zu allen Infra-Änderungen.
5. KI-Knopf + neue Bausteine (`caseStudy`, `stats`, `logos`, `testimonials`, `figure`).

## 9a. Portabilität (Ergänzung 2026-11-06)

Inhalte dürfen nicht in Payload gefangen sein — ein späterer Umzug in ein anderes CMS (u. a. das künftige CMS der eigenen SaaS-Plattform, Name/Details werden dort entschieden) soll ein Import sein, kein Neubau.
- Die Naht ist `content/*.json`: Eleventy liest nur diese Dateien; ein anderes CMS muss nur dieses Format erzeugen bzw. ein Importer es lesen.
- **Inhaltsformat v1** wird Payload-unabhängig dokumentiert (`docs/content-format-v1.md`), jede Datei trägt `schemaVersion: 1`; unbekannte Versionen brechen den Build laut ab.
- Rich-Text wird als HTML-Teilmenge exportiert (nicht Payload-internes Lexical-JSON); Bild-URLs (`publicPath`) bleiben stabil; Login über Zitadel zieht mit.
- Gilt auch für künftige Kundenseiten, die mit demselben Bausteinformat gebaut werden.

## 10. Nicht Teil dieses Projekts (Folgerunde)

Feedback-Runde (Kollege, lnagency.de-Vergleich): Text auf ~800 Wörter Startseite kürzen (Pascal im CMS), Emojis (📄 📅 🔒 🔍) durch eigenes SVG-Icon-Set ersetzen, Farben abstimmen, mehrstufiges Kontaktformular, Fallstudie/Kennzahlen befüllen. **Keine erfundenen Bewertungen** (UWG Anhang Nr. 23b/c) — `testimonials` bleibt leer bis zu echten Kunden.
