# Zielbild: CMS auf Onepage-Niveau

Stand 2026-11-09. Ziel von Pascal: an den Funktionsumfang von onepage.io herankommen.
Kernwunsch: **die ganze Seite sehen und darin die Bausteine selbst verschieben.**

Gilt zusätzlich zu `2026-11-06-cms-design.md`. Der Abgleich unten ist am Code von `feat/cms`
(fd4d5ba) gemessen, per Suche in `cms/src`, `builder`, `src`, `lib`, `deploy`. Punkte mit
„ungeprüft“ sind noch nicht im laufenden Editor ausprobiert.

## Abgleich der 30 Punkte

Ergebnis: 7 vorhanden, 7 teilweise, 16 fehlen.

| Funktion | Stand | Was heute da ist / was fehlt |
|---|---|---|
| Versionen | vorhanden | Entwürfe mit Autosave, 10 Releases, Zurückschalten |
| Mediathek | vorhanden | Collection `media` |
| EU-Hosting | vorhanden | Server in Deutschland |
| SSL | vorhanden | Wildcard für `*.kozlowski-it.de`; Kundendomains kommen mit dem Hosting-Projekt |
| Tempo | vorhanden | statische Seiten; Wert noch nicht gemessen |
| Rechtstexte | vorhanden | Impressum, Datenschutz, AVV als pflegbare Seiten; kein Generator |
| Cookie-Banner | nicht nötig | Seite setzt keine Cookies; wird erst mit Ads-Tracking ein Thema |
| Globale Abschnitte | teilweise | Navigation und Footer global (`chrome`); wiederverwendbare Bausteine fehlen |
| Duplikate | teilweise | Payload bietet Duplizieren; ungeprüft |
| Mobilansicht | teilweise | Live-Vorschau vorhanden, keine eigenen Gerätegrößen eingestellt; ungeprüft |
| Analytics | teilweise | Matomo läuft, Zahlen nicht im CMS sichtbar |
| Tracking | teilweise | cookielos und UTM; Google Ads fehlt (Einwilligung klären) |
| Domains | teilweise | von Hand über edge02; Self-Service kommt mit dem Hosting-Projekt |
| Leads | teilweise | Formular schickt Mail; nichts gespeichert, kein CRM |
| Vorlagen | fehlt | |
| Brand-Kit | fehlt | |
| Code-Modus | fehlt | |
| Seitenordner | fehlt | |
| Website-Suche | gestrichen | Entscheidung 2026-11-09: bei kleinen Seiten kaum Nutzen |
| Weiterleitungen | fehlt | |
| Zeitplanung | fehlt | |
| Blog | fehlt | |
| Video | fehlt | |
| llms.txt | fehlt | |
| Mehrstufige Formulare | fehlt | |
| Auto-Antworten | fehlt | |
| Benachrichtigungen | fehlt | |
| Webhooks | fehlt | |
| Integrationen | fehlt | |
| Zahlungen | fehlt | |

Bausteine heute: `hero`, `text`, `cards`, `steps`, `faq`, `figure`, `ctaBar`, `contactForm`,
`vmwareCalculator`.

## Das größte Problem heute

Pascals Rückmeldung vom 2026-11-08: Das Konzept ist gut, aber „wo gehört was hin“ ist kompliziert,
weil der Editor eine lange Feldliste ohne Bezug zur Seite zeigt. Die Live-Vorschau steht daneben,
ist aber nicht anklickbar.

## Vorläufige Reihenfolge

Noch nicht entschieden, Vorschlag aus den bisherigen Gesprächen:

1. Visuell bearbeiten: ganze Seite sehen, Baustein anklicken, verschieben
2. Vorlagen und Brand-Kit
3. Kleine Punkte: Duplikate prüfen, Weiterleitungen, Zeitplanung, llms.txt, Seitenordner, Video
4. Mehrstufige Formulare → Leads ins CRM → Auto-Antworten und Benachrichtigungen
5. Blog, Website-Suche, Code-Modus, KI
6. Nur bei Bedarf: Webhooks/Integrationen, Zahlungen, Ads-Tracking

## Leitplanken aus früheren Entscheidungen

- Seiten bleiben statisch und datenschutzfreundlich, das ist ein Verkaufsargument.
- Nicht 1:1 klonen. Stärke gegenüber Onepage ist die Seite plus das System dahinter
  (Portal, ERP, CRM, Termine).
- Später Zusatzmodul zu TideLane: Fachlogik nicht direkt an Payload oder Eleventy koppeln,
  Inhaltsformat v1 bleibt die Schnittstelle. Details: `project_cms_website` in der Memory.

## Offene Frage

Am 2026-11-07 stand fest: „kein Drag-&-Drop-Baukasten“. Am 2026-11-09 sagt Pascal: Bausteine
„und alles mögliche“ auf der ganzen Seite selbst verschieben. Zu klären ist, wie frei das sein soll.

## Ergänzung 2026-11-09: Vorbilder, Google, Vorlagen

**Pascal:** Der klickbare Entwurf geht in die richtige Richtung. Frei auf der Seite ziehen, Unterseiten anlegen, Vorlagen bauen und anpassen sind wichtig. Jeder Kunde bekommt Webspace und nutzt dort unser CMS oder WordPress. Google-Anbindung ist wichtig, viele fragen danach. Handy-Ansicht bleibt drin, wird später optimiert.

**Vorbilder (Onepage-Seiten):** stegemannmedia.de, koelmel-digital.de/meta-ads-karlsruhe. Gemeinsames Muster: Kopf mit Button, Hero mit Bewertung und Kennzahlen, Logos, nummerierte Probleme, Leistungen, Ablauf in Schritten, Referenzen, FAQ, Kontaktformular, Abschluss-Button, Fußzeile. Stegemann zusätzlich: Video und Karte erst nach Klick, Kundenstimmen, Team.

**Dafür fehlende Bausteine:** Bewertungs-Abzeichen, Kennzahlen, Logo-Wand, Kundenstimmen, Referenz-Raster, Team, Video und Karte erst nach Klick.

**Google, recherchiert 2026-11-09 (Details vor dem Bau gegen Google-Dokumente prüfen):**
- Bewertungen über Business Profile API: Konto des Kunden, Zugang muss bei Google beantragt werden. Places API: maximal 5 Bewertungen, Namensnennung, Vorabspeichern von Inhalten eingeschränkt, passt daher schlecht zu statischen Seiten.
- Business Profile: Öffnungszeiten, Beiträge. Search Console: Daten für den Monatsbericht, kostenlos. Ads-Conversions: ab 15.06.2026 laut Google über die Data Manager API.

**Entwurfs-Entscheidung (Claude, von Pascal noch zu bestätigen):** Bauen auf „Frei im Raster“. Dann ist die Handy-Ansicht später einfach; bei pixelfreier Platzierung wäre sie Handarbeit pro Seite.

**Vorlagen und Betrieb (Pascal 2026-11-09):** Eine Seite aus einer Vorlage ist ab dem Start eine eigene Kopie; spätere Vorlagen-Änderungen laufen nicht zum Kunden durch. Jeder Kunde bekommt ein eigenes CMS (keine Mandanten in einer Instanz). Der Kollege kann Vorlagen aus der Partner-Zentrale (Steuerzentrale) auf das CMS eines Kunden spielen, wenn er will.

**Knöpfe:** Pro Knopf wählbar, wohin er führt: Unterseite, Abschnitt auf derselben Seite, Terminbuchung, externer Link, Anruf.
