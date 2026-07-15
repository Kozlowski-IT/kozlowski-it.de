# Design-Doc: kozlowski-it.de — Hybrid-Multi-Page (Relaunch)

- **Datum:** 2026-07-15 · **Status:** Entwurf (zur Review) · **Eigentümer:** Pascal Josef Kozlowski
- **Grundlage:** 6-Experten-Content-Review + 5-Experten-Strategie-Panel (CRO, Local-SEO, Marke, IA/UX, Content). **Votum: 5/5 HYBRID.**

## 1. Entscheidung
**Hybrid**, nicht Voll-Multi-Page, nicht reine Single-Page. Starke Single-Page-**Startseite** als primäre Conversion-Fläche + eine Handvoll echter Seiten für Tiefe/SEO + Nav-Leiste.

**Positionierung (Pascal 2026-07-15):** **breit**, NICHT auf Praxen/Kanzleien verengt (die haben oft eigene ITler; Pascal denkt weitsichtig + international). KMU ohne eigene IT + Individual-Software + technischer Anspruch. **DE+EN** (international, Auslandsanfragen erwünscht).

## 2. Nicht-verhandelbare Prinzipien (aus dem Panel)
- **Startseite muss allein zum Termin führen** (CRO-Faustregel). Häufigster Fehler: sie zum dünnen Verteiler-Hub degradieren → Conversion stirbt am Relaunch-Tag. **Erst Unterseiten dazubauen, Startseite fast unangetastet, dann in 2. Schritt behutsam straffen.**
- **Ich-Form durchgängig, NIE „wir"** (Moment des „wir" = Ehrlichkeit tot).
- **Jeden Leistungs-Claim an ein echtes Artefakt binden** (nicht „proaktives Monitoring", sondern „so sieht mein Wazuh-Dashboard aus, läuft bei mir seit X Monaten").
- **„Nachweise"-Framing** statt „Referenzen": keine Kunden → dokumentierte, live prüfbare eigene Systeme als Beweis (Judo: Schwäche → Prüfbarkeits-Stärke).
- **Datierter „Stand heute"-Block** (ehrlich, wächst mit: Kundenzahl, IHK-Status).
- **Harte Obergrenze ~5 Content-Seiten.** Keine Fassaden-Seiten: **kein „Team"** (ein Foto = unfreiwillige Comedy), keine leere „Referenzen", **kein toter Blog**, kein „Partner/Karriere".
- **Faustregel für jede künftige Seite:** wird erst gebaut, wenn ihr Inhalt *auch ohne die Navigation* überzeugt.

## 3. Sitemap (final)
```
/                 Startseite — starke Kompaktseite, Nav-Leiste, PRIMÄRE Conversion
                    Sektionen: Hero · Leistungen (Teaser→Seiten) · Warum · Projekte-Teaser
                    · Ablauf · Über-mich-Teaser · FAQ · Kontakt (cal.rs-Buchung)
/it-betreuung/    Leistung GENAUER — je Punkt "wie konkret" + Beleg-Aufbau (SIEM/Segmentierung/Backup)
/software/        Leistung GENAUER — je Punkt + Demos (FlowGate/quellwerk/Zitadel) als Beleg
/ueber-mich/      Über mich (Singular) — Werdegang + Haltung/Arbeitsweise + "Sie reden mit mir";
                    Quereinstieg als Feature; IHK-Abschluss ehrlich "Ende 2026". Substanz, kein Bio-Stub.
/projekte/        "Nachweise" — dokumentierte eigene Aufbauten (Proxmox-Cluster, Netz-Segmentierung,
                    Wazuh-SIEM): Ausgangslage→Entscheidungen→Ergebnis→was live prüfbar ist
/demos/           Live-Demos (anfassbar, mit Zugangsdaten)
Recht (Footer):   /impressum · /datenschutz · /avv
— alles gespiegelt unter /en/… (voll paritätisch)
```
*Optional-Merge:* `/projekte/` + `/demos/` könnten zu EINER „Nachweise"-Seite zusammengefasst werden, um schlank zu bleiben (beide = Beweis). Entscheiden beim Bau.

## 4. Navigation
**Hauptmenü (max. 5–6, flach, kein Dropdown):**
`[Logo]  Leistungen · Projekte · Über mich · Ablauf · [Termin buchen]   [DE|EN] [☰]`
- „Leistungen" → Startseiten-Sektion `#leistungen` (Teaser verlinken auf `/it-betreuung/` + `/software/`).
- „Projekte" → `/projekte/` (Nachweise). „Über mich" → `/ueber-mich/`. „Ablauf" → `#ablauf`.
- **Recht IMMER Footer, nie Hauptmenü.**
- **Termin buchen** = abgesetzter CTA rechts → cal.rs (`cal.kozlowski-it.de/erstgespraech`). Ein Conversion-Ziel überall.
- **Mobile:** **CSS-only-Hamburger** (`<input type=checkbox>`-Toggle) — kein Inline-JS → CSP-safe, unkaputtbar.
- **Sticky** dünne Top-Bar (die smart-it-Optik, die Pascal mag).
- **Sprachumschalter → dieselbe Seite** in der anderen Sprache (`/projekte/` ↔ `/en/projekte/`), nie stumpf auf `/en/`.

## 5. Bau-Weg: 11ty (Eleventy)
**Problem:** handgepflegtes HTML × N Seiten × 2 Sprachen = Header/Nav/Footer N×2-fach dupliziert → **Drift** (genau die DE/EN-Lücken, die schon auf 1 Seite auftraten).
**Lösung:** **Eleventy** — Header/Nav/Footer als **Partial (einmal)**, DE/EN aus **einer Datenquelle** (i18n), Werkzeug **erzeugt** alle Seiten. Ausgabe = **normales statisches HTML** (schnell, CSP-freundlich); Deploy unverändert (rsync → docker01-nginx). Boring-Tech, kein Lock-in (§14-konform). Nonces/Hashes im Build für CSP setzbar; Hamburger CSS-only → kein JS-CSP-Thema.
**Parity mechanisch garantiert:** eine Quelle → DE/EN können nicht auseinanderlaufen. Zusätzlich CI-Check (fail-loud) auf gleiche Seiten/Anker in beiden Sprachbäumen.

## 6. SEO
- Pro Seite eigener **Title/Meta/H1** je Suchintention (das kann Single-Page nicht). Broad-Keywords (nicht branchen-verengt): „IT-Betreuung Landkreis Biberach", „Individualsoftware/Softwareentwicklung", „Server-Virtualisierung Proxmox".
- **LocalBusiness-JSON-LD** sitewide, `areaServed` = Region + Orte (keine Orts-Doorway-Seiten — Thin-Content/Abstraf-Risiko).
- **🔑 Separater #1-Local-Hebel (unabhängig vom Redesign):** **Google-Business-Profil** anlegen/pflegen (Kategorien, Fotos, Service-Area, Bewertungen) — fürs Maps-Pack wichtiger als jede Unterseite.

## 7. Aufwand / Phasen
- Content zu ~70 % vorhanden → **Umverteilung, nicht Neuschöpfung** (Content-Experte: ~3–4 DE-Arbeitstage + EN-Parität via 11ty automatisch strukturell).
- **Phase 1:** 11ty-Fundament + bestehende Seiten migrieren (Startseite ~unverändert) + Nav + Hamburger → live.
- **Phase 2:** `/it-betreuung/`, `/software/`, `/ueber-mich/` mit Tiefe + Artefakt-Belegen; `/projekte/` → „Nachweise" umlabeln.
- **Phase 3 (später, nicht jetzt):** Branchen-Seiten NUR wenn echtes Projekt pro Branche erzählbar; FAQ ggf. eigene Seite.

## 8. Bewusst NICHT jetzt
Branchen-Landingpages (Persona-Prosa ohne echten Kunden), Team-/Blog-/Partner-Seiten, Orts-Doorway-Seiten.
