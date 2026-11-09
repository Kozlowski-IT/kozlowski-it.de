# Design: Visueller Editor und Vorlagen für das CMS

Stand 2026-11-09. Baut auf `docs/2026-11-06-cms-design.md` auf. Gesamtliste der gewünschten
Funktionen und Google-Recherche: `docs/2026-11-09-onepage-zielbild.md`.
Klickbarer Wegwerf-Entwurf, an dem Pascal die Richtung bestätigt hat:
https://claude.ai/artifact/XKGPm9KtiZcESeVJxmdwei (privat; Bedienidee, kein Code zum Übernehmen).

## Warum

Pascal will an Onepage herankommen. Heute zeigt der Editor eine lange Feldliste ohne Bezug zur Seite,
und „wo gehört was hin“ ist kompliziert. Die Live-Vorschau daneben ist nicht bedienbar. Zielgruppe sind
später die Kunden des Kollegen (LN Agency), also Nicht-Techniker in Firmen allgemein, vom lokalen Betrieb bis zu Büro-Mitarbeitenden. Vorbilder:
stegemannmedia.de und koelmel-digital.de/meta-ads-karlsruhe, beide mit Onepage gebaut.

## Ziele

**Von Pascal:**
- Die ganze Seite sehen und darin Bausteine direkt verschieben und bearbeiten.
- Inhalte frei auf der Seite ziehen.
- Unterseiten direkt anlegen.
- Vorlagen, die man bauen und anpassen kann. „Ganz wichtig.“
- Pro Knopf wählen, wohin er führt: Unterseite, Abschnitt auf derselben Seite, Terminbuchung,
  externer Link, Anruf.
- Eine Seite aus einer Vorlage ist ab dem Start eine eigene Kopie. Spätere Änderungen an der Vorlage
  laufen nicht zum Kunden durch.
- Handy-Ansicht bleibt vorhanden, wird später optimiert.
- Reihenfolge: zuerst an Pascals eigener Seite kozlowski-it.de.

**Nicht-Ziele dieses Projekts** (je eigenes Folgeprojekt, siehe Zielbild): eigenes CMS pro Kunde und
Vorlagen aus der Partner-Zentrale aufspielen, Google-Anbindung, mehrstufige Formulare und Leads,
Blog, Suche, Code-Modus, KI, Handy-Feinschliff.

**Anti-Ziele:**
- Bestehende URLs oder das Aussehen der Live-Seiten ändern sich durch die Umstellung nicht.
- Kein zweiter Weg für die Darstellung, bei dem Editor und Live-Seite auseinanderlaufen.
- Die Seiten bleiben statisch, ohne neue Skripte oder Cookies für Besucher.
- Nichts darf eine Live-Seite ohne den bestehenden Weg Entwurf → Vorschau → Veröffentlichen verändern.

## Rahmenbedingungen aus dem Bestand

- Payload 3.93, Next 16, React 19; Eleventy-Builder; Worktree `~/projects/pk-landing-cms`, Branch `feat/cms`.
- `pages.layout` ist heute eine Blocks-Liste (`hero`, `text`, `cards`, `steps`, `faq`, `figure`, `ctaBar`,
  `contactForm`, `vmwareCalculator`), Darstellung in `src/_includes/blocks/*.njk`.
- Inhaltsformat v1 ist die Schnittstelle: unbekannte `blockType` brechen den Build ab, jede Änderung am
  Format erhöht `schemaVersion`. Rich-Text-Teilmenge und URL-Allow-List gelten weiter.
- DE und EN teilen Bausteinliste und Reihenfolge (Paritäts-Check über `sectionKey`).
- Später TideLane-Zusatzmodul: Fachlogik nicht direkt an Payload oder Eleventy koppeln (Memory
  `project_cms_website`, Modulkonventionen).
- Der Builder ist nur intern erreichbar, Payload spricht ihn mit Token an.

## Wie es sich anfühlt

Der Editor zeigt links den Seitenbaum, in der Mitte die ganze Seite in echter Darstellung, rechts die
Einstellungen des gewählten Elements. Klick auf ein Element wählt es aus, Ziehen verschiebt es. Änderungen
landen im Entwurf wie heute und gehen erst über „Veröffentlichen“ live.

## Vorschlag für den Aufbau (Claudes Entscheidungen, von Pascal nicht einzeln bestätigt)

1. **Raster statt Pixel.** Frei ziehen heißt: frei auf einem Raster aus 12 Spalten. Pascal hat den Entwurf
   gutgeheißen; bei pixelgenauer Platzierung müsste jede Seite später fürs Handy von Hand neu angeordnet
   werden. Auf dem Handy stehen Elemente in Lesereihenfolge untereinander.
2. **Zwei Ebenen.** Die heutigen Bausteine bleiben ganze Abschnitte: anklicken, bearbeiten, nach oben oder
   unten schieben. Neu kommt ein Abschnitt `raster`, in dem einzelne Elemente (Überschrift, Text, Bild,
   Knopf, Karte) frei platziert werden. Bestehende Seiten laufen unverändert weiter.
3. **Eine Darstellung.** Die Mitte zeigt das HTML der echten Nunjucks-Vorlagen, darüber liegt eine
   Bedien-Ebene. Dafür bekommt der Builder einen internen Endpunkt, der Abschnitte rendert. Kein Nachbau
   der Vorlagen in React.
4. **Eigene Admin-Ansicht in Payload** für den Editor, die über die vorhandene API liest und schreibt.
   Die alte Feldliste bleibt als Rückfall erreichbar.
5. **Format.** `raster` und Knopf-Ziele führen zu `schemaVersion: 2`. Position und Größe gelten für alle
   Sprachen, Texte pro Sprache.
6. **Vorlage = gespeicherte Seite plus Design.** Eine Seite oder Website „als Vorlage speichern“ (eigene
   Collection); „Neue Seite aus Vorlage“ kopiert Inhalt und Design und ist danach unabhängig. Keine eigene
   Vorlagen-Sprache. Zum Design gehören Farben, Schriften, Hintergrund, Rundungen und die Gestaltung von
   Kopfzeile und Fußzeile (Pascal 2026-11-09 mit Blick auf die schwebende Kopfzeile von stegemannmedia.de:
   Logo, Menü, Knopf). Umgesetzt als Design-Einstellungen plus Varianten pro Kopfzeile und Baustein
   (CSS-Variablen). Rollen wie am 2026-11-07 festgelegt: Kunde bearbeitet Inhalte, Kollege das Design.
7. **Unterseiten.** Seiten bekommen eine Elternseite, die URL entsteht aus dem Pfad. Bestehende Seiten
   behalten ihre URL.

## Vorgemerkt: KI aus Bild (Pascal 2026-11-09, Folgeprojekt)

Bild schicken, die KI schaut sich das Design an und baut es ein. Für dieses Projekt heißt das nur: Raster,
Design-Einstellungen und Varianten bleiben reine, prüfbare Daten, damit eine KI später genau diese erzeugen
kann. Die KI schreibt nie direkt live, sondern einen Entwurf, der dieselbe Prüfung und Vorschau durchläuft.
Bei fremden Vorlagen übernimmt sie den Stil, keine 1:1-Kopie.

## Entscheidungen von Pascal (2026-11-09)

- **Übereinanderlegen:** Elemente dürfen übereinanderliegen (zum Beispiel eine Kennzahl-Box auf einem Foto),
  damit gute Designs möglich sind. Umsetzung als eigene Funktion „über Element legen“, das normale Raster bleibt
  überlappungsfrei und damit auf dem Handy sauber (Umsetzungsvorschlag Claude).
- **Kopfzeile:** beides anbieten: fertige Bauarten mit Einstellungen und frei aus Einzelteilen zusammenbauen.
- **Video und Karte:** laden erst nach Klick direkt auf der Seite, mit Hinweis in der Datenschutzerklärung.
  Das ist die einzige Ausnahme vom Anti-Ziel „keine neuen Skripte“: bis zum Klick keine Verbindung zu Drittanbietern.

## Entscheidungen nach der Prüfung (Claudes Entscheidungen, von Pascal gegenzulesen)

- **Fehlende EN-Texte:** Die Regel bleibt, zweisprachige Seiten brauchen beide Sprachen. Neue Seiten übernehmen
  `bilingual` aus der Vorlage, ohne Vorlage gilt nur Deutsch. Der Editor zeigt fehlende Texte vor dem Veröffentlichen.
- **URLs:** Der Pfad wird beim ersten Veröffentlichen festgeschrieben. Spätere Änderung nur mit ausdrücklicher
  Warnung, solange es keine Weiterleitungen gibt. Heutige flache Seiten dürfen eine Elternseite bekommen, ohne dass
  sich ihre URL ändert.
- **Menü:** Bleibt von Hand gepflegt, wird aber direkt im Editor bearbeitet, mit dem Seitenbaum als Auswahlhilfe.
  Neue Unterseiten fragen, ob sie ins Menü sollen.
- **Vorlagen:** Werden im selben Editor bearbeitet wie Seiten, Editor und Render-Endpunkt funktionieren also auch
  ohne URL. Scheibe 4 liefert den Mechanismus und eine Beispielvorlage nach Art der Vorbilder; weitere
  Branchen-Vorlagen sind danach Gestaltungsarbeit.

## Anschluss an TideLane

Das CMS wird später TideLane-Zusatzmodul (Pascal 2026-11-08): getrennt vom Kern, eine Instanz und Datenbank
pro Kunde, angebunden nur über Inhaltsformat und Events, ersetzt später `landing-management`. Konventionen:
`/srv/tdagent/ausgang/kozlowski/tidelane-modulkonventionen.md`, Entscheidungen in Memory `project_cms_website`.

Für dieses Projekt heißt das (Claudes Entscheidungen):
- **Fachlogik als reines TypeScript ohne Payload, Next oder Eleventy:** Raster-Regeln (Platzieren, Grenzen,
  Lesereihenfolge), Knopf-Ziele, Vorlage-zu-Seite-Kopie. Payload-Ansicht und Nunjucks sind nur Adapter.
- **Keine Payload-eigenen Formate im Inhaltsformat:** `schemaVersion: 2` bleibt CMS-unabhängig beschrieben.
- **Vorlagen haben eine portable Form** (Inhaltsformat, stabile IDs als UUID v7), damit die Partner-Zentrale
  sie später in fremde Instanzen spielen kann.
- **Neue Datensätze tragen die Felder, die TideLane erwartet,** soweit in diesem Projekt neu angelegt: UUID v7,
  Zeitstempel, `tenantId` je Instanz.

Nicht in diesem Projekt, aber vorgemerkt: Person über Zitadel-`sub` statt E-Mail, Events
`cms.page.published` und `cms.lead.captured`, Verschlüsselung personenbezogener Daten.

## Ideen aus der Agenten-Runde (von Pascal am 2026-11-09 übernommen)

Bewertungen der Runde sind ungetestet. Technische Belege stammen aus dem Code von `feat/cms`.

**Pflichtpunkte aus dem Bestand:**
- `chrome` und `site` gehen heute beim Speichern sofort live (`cms/src/hooks/triggerBuild.ts`). Menü, Kopfzeile und
  Design brauchen Entwürfe und einen entwurfsfähigen Export, sonst bricht das Anti-Ziel.
- `scripts/check-equal.mjs` vergleicht CSS byte-genau. Raster-CSS wird nur auf Seiten mit Raster eingebunden. Der
  Gleichheitstest läuft bisher nicht automatisch und soll in die Prüfungen.

**Scheibe 1:** Rückgängig und Wiederholen (Strg+Z), Text direkt auf der Seite tippen, sauberes Einfügen aus Word und
Outlook, „+“ mit Bildkatalog, Foto direkt am Bild tauschen, Statuszeile in Alltagssprache. Mitte als `srcdoc`-iframe,
Rendering nur des geänderten Abschnitts im Speicher, Zuordnungsmarken nur in der Editor-Ansicht; vor Beginn kurz im
echten Browser prüfen (Fonts, sandbox).

**Scheibe 2:** Raster-Daten in einem JSON-Feld mit eigenem reinen Validator (Medien-Auflösung und Löschschutz neu
bauen). Position als feste Klassen statt Inline-Stile (`style-src 'self'`), Höhe wächst mit dem Inhalt, Überlagerungen
fest an ein Trägerelement gebunden. Reader versteht Version N und N−1 und wird vor dem Exporter ausgerollt.

**Scheibe 3:** Knopf-Ziele als Verweis statt URL (`page` mit `translationKey`, optional `sectionKey`, `booking`, `call`,
`url`); ein toter Verweis bricht den Build.

**Scheibe 4:** Vorlage als portables Paket im Export-Format (`pages.json`, `media/`, Manifest). Kopfzeile aus Bereichen
links, Mitte, rechts mit geschlossener Teile-Liste; fertige Bauarten sind gespeicherte Belegungen, die heutige Kopfzeile
wird eine davon. Prüfliste vor dem Veröffentlichen (Platzhalter, tote Knöpfe, Bilder ohne Beschreibung, Telefonnummer,
Ort im Titel). Schutz bei gleichzeitigem Bearbeiten. Layout-Sperre pro Person, serverseitig durchgesetzt. QR-Code für
Google-Bewertungen, für alle Kunden gleich, ohne Anreize. Pitch-Vorschau mit befristetem `noindex`-Link.

**Später:** Anfragen-Nachweis mit Auftragswert pro Kanal, Seiten „Leistung + Ort“ aus Vorlage (Pflichtfelder für echte
lokale Inhalte), Reaktionszeit messen, Freigabe durch Chefin oder Chef. Website-Suche gestrichen.

**Code-Modus (später, nur Agentur, nie Kunden):** zuerst nur CSS, Prüfung blockt externe Quellen, Weg über Entwurf,
Vorschau, Veröffentlichen und Versionen. HTML oder Skripte erst später und nur mit Freigabe. Nachvollziehbarkeit ist
Pflicht: Login mit Zitadel, jede Änderung als Version mit Person, Pflicht-Kommentar und Unterschied, Zurückspringen möglich.
Pascals Idee, vorher GitHub verbinden zu müssen, wird später entschieden: Empfehlung Claude ist interne Historie als
Pflicht und GitHub nur als optionaler Spiegel.

## Reihenfolge (jede Scheibe lauffähig)

1. Seitenansicht: ganze Seite in echter Darstellung, Abschnitt anklicken und bearbeiten, Abschnitte verschieben, hinzufügen, löschen.
2. Raster-Abschnitt mit frei platzierbaren Elementen, ausgeliefert auf der Live-Seite.
3. Seitenbaum, Unterseiten, Knopf-Ziele.
4. Vorlagen, Design-Einstellungen mit Kopfzeilen- und Fußzeilen-Varianten und die Bausteine aus den Vorbildern: Bewertungs-Abzeichen (zunächst von Hand gepflegt),
   Kennzahlen, Logo-Wand, Kundenstimmen, Referenz-Raster, Team, Video und Karte erst nach Klick.

## Dem Bauenden überlassen

Bibliothek fürs Ziehen, Zuschnitt der internen Module, genaue Feldnamen, Rendertempo des Endpunkts.

## Woran man Erfolg misst

- Pascal baut ohne Hilfe eine neue Unterseite aus einer Vorlage, verschiebt Inhalte und veröffentlicht sie.
- Alle bestehenden Seiten sind nach der Umstellung gleich: vorhandener Gleichheitstest Release gegen Release bleibt grün.
- Editor-Mitte und veröffentlichte Seite zeigen für denselben Entwurf dasselbe.
