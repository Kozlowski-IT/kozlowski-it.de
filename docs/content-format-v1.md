# Inhaltsformat v1

Dieses Dokument beschreibt das Dateiformat, in dem die Inhalte der Website kozlowski-it.de an den
statischen Generator (Eleventy) übergeben werden. Es ist **unabhängig vom CMS**, das die Dateien
heute erzeugt: Wer ein anderes CMS anbindet, muss nur Dateien in genau diesem Format schreiben
(Exporter) oder lesen (Importer). Der Website-Build liest ausschließlich diese Dateien, nie ein CMS.

Version: **1** (`schemaVersion: 1`). Änderungen am Format erhöhen die Version.

## 1. Dateien

Alle Dateien liegen in einem Inhaltsordner (Standard `content/`, überschreibbar mit der
Umgebungsvariable `CONTENT_DIR`), sind UTF-8-kodiertes JSON und tragen auf oberster Ebene
`schemaVersion`.

| Datei | Form |
|---|---|
| `pages.json` | `{ "schemaVersion": 1, "pages": [ Seite, … ] }` |
| `site.json` | `{ "schemaVersion": 1, "site": { Stammdaten } }` |
| `chrome.json` | `{ "schemaVersion": 1, "de": { UI-Texte }, "en": { UI-Texte } }` |
| `media/index.json` | `{ "schemaVersion": 1, "files": [ { "file", "publicPath" }, … ] }` |
| `media/<file>` | die Bilddateien selbst, Name wie `file` im Verzeichnis |

### Versionsprüfung

Der Build prüft `schemaVersion` jeder gelesenen Datei und bricht bei jeder Abweichung laut ab:
`unbekannte Inhaltsformat-Version <n>`. Eine **fehlende** `schemaVersion` ist ebenfalls ein Fehler
(es wird nicht geraten; das Meldungsformat lautet dann `… Version (fehlt) …`). Es gibt keine
automatische Umwandlung zwischen Versionen.

### Sprachen

Es gibt genau zwei Sprachen: `de` (Standard) und `en`. Kein Rückfall: Eine fehlende Übersetzung
wird nicht durch die andere Sprache ersetzt. Eine Seite ohne Slug in einer Sprache wird in dieser
Sprache nicht gebaut (Warnung).

## 2. `pages.json`

`pages` ist eine Liste von Seiten. Pro Seite:

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `translationKey` | text | ja | eindeutig; verbindet DE- und EN-Fassung (Sprachumschalter, hreflang) |
| `bilingual` | bool | nein | Standard `true`; `false` = nur `de` wird gebaut |
| `noindex` | bool | nein | Standard `false`; `true` = die Seite trägt `robots: noindex` und fehlt in der Sitemap |
| `minimalHeader` | bool | nein | Standard `false`; reduzierte Kopfzeile |
| `structuredData` | enum | nein | `none` (Standard) oder `home` (JSON-LD der Startseite) |
| `frame` | enum | nein | Seitenrahmen, Standard `subpage`: `home`, `subpage`, `subpageTabs`, `landing`, `legal`, `legalWrap`. `subpage` und `subpageTabs` brauchen `chrome.<lang>.subnav` |
| `locales` | Objekt | ja | `{ "de": Fassung, "en": Fassung }`; bei `bilingual: false` nur `de` |

Eine **Fassung** (eine Seite in einer Sprache):

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `slug` | text | ja | Pfad ohne Slashes am Rand, nur `a-z`, `0-9`, `-`, Segmente mit `/` getrennt (Regex `^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*$`). `index` = Startseite. Permalink: `/<slug>/` (DE) bzw. `/en/<slug>/` (EN); Permalinks müssen eindeutig sein |
| `title` | text | ja | Seitentitel (`<title>`) |
| `description` | text | nein | Meta-Beschreibung |
| `og` | Objekt | nein | `{ "title"?, "description"? }` für Open Graph |
| `blocks` | Liste | ja | Bausteine in Reihenfolge (Abschnitt 3); darf leer sein |

Die Bausteinliste (Reihenfolge und `blockType`) soll in beiden Sprachen übereinstimmen; nicht
lokalisierte Felder tragen in beiden Fassungen denselben Wert.

## 3. Bausteine

Jeder Baustein ist ein Objekt mit `blockType` (einer der unten genannten Namen) und den Feldern
seiner Tabelle. Optional: `blockName` (frei, nur zur Orientierung; der Build ignoriert ihn).
Unbekannte `blockType` brechen den Build ab.

**Spalten.** *Feld*: Name, Verschachtelung mit `.` (Objekt) und `[]` (Liste von Objekten).
*Typ*: `text` (einzeiliger Text, reiner Text, wird beim Ausgeben maskiert), `html` (Rich-Text,
Abschnitt 4), `enum` (feste Werteliste), `image` (Bildobjekt, Abschnitt 5), `list`, `object`,
`bool`. *lokalisiert*: **ja** = der Wert ist je Sprache verschieden und steht in der jeweiligen
Fassung; **nein** = sprachunabhängig (gleicher Wert in beiden Fassungen). *Pflicht*: **ja** = das
Feld soll gesetzt und nicht leer sein (bei Listen: jede Zeile braucht dieses Feld); alle anderen
Felder dürfen fehlen. Fehlt ein optionales Feld, wird es weggelassen (kein `null`, kein leerer
String nötig). *Hinweis*: Bedeutung, Werte, Längenempfehlungen (nur Empfehlung, nie Fehler).

Verschachtelte `object`-/`list`-Felder haben selbst eine Zeile; ihre Unterfelder folgen darunter.

### Button-Objekt

`buttons[]` (Liste von Links/Buttons) ist in mehreren Bausteinen gleich aufgebaut:
`label`, `href`, `style` (Werte: `primaryBig`, `primary`, `ghosted`, `devBig`, `btn`, `cardLink`,
`devlink`, `plain`), `icon`, `newTab`, `download`. Siehe die Tabellen.

### Baustein: hero

Seitenkopf mit `<h1>`. Varianten: `home` (Startseite, Porträt, Vertrauensliste), `intro` (Einleitung der Unterseiten), `landing` (Landingpage).

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `home`, `intro`, `landing` |
| `eyebrow` | text | ja | nein | Überzeile |
| `h1` | text | ja | ja | Seitenüberschrift `<h1>` |
| `claim` | html | ja | nein | Claim; Längenempfehlung höchstens 220 Zeichen (nur Hinweis); Absätze → `<p class="claim">` bzw. `lead` |
| `trustPoints` | list | nein | nein | Vertrauenspunkte (Liste, Variante `home`) |
| `trustPoints[].text` | text | ja | ja |  |
| `buttons` | list | nein | nein | Buttons/Links (siehe „Button-Objekt“), höchstens 2 |
| `buttons[].label` | text | ja | ja | Beschriftung |
| `buttons[].href` | text | ja | ja | Link-Ziel (URL-Allow-List) |
| `buttons[].style` | enum | nein | nein | Link-Stil, bestimmt die CSS-Klasse (Standard `primary`; `plain` = keine Klasse) · Werte: `primaryBig`, `primary`, `ghosted`, `devBig`, `btn`, `cardLink`, `devlink`, `plain` |
| `buttons[].icon` | text | nein | nein | Emoji, wird in `<span aria-hidden="true">` gesetzt; optional |
| `buttons[].newTab` | bool | nein | nein | öffnet in neuem Tab (`target="_blank"`, `rel="noopener"`) |
| `buttons[].download` | bool | nein | nein | setzt das Attribut `download` |
| `photo` | image | ja | nein | Porträt/Bild je Sprache |
| `photoAlt` | text | ja | nein | überschreibt `alt` des Bildobjekts; optional |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |

### Baustein: text

Text-Section. Reihenfolge im Markup: eyebrow, heading, sub, lead, body, note, buttons. Varianten: `default`, `callout`, `about`, `why`, `legal` (kein `section`-Wrapper; für Rechtstexte).

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default`, `callout`, `about`, `why`, `legal` |
| `eyebrow` | text | ja | nein | Überzeile |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `headingLevel` | enum | nein | nein | Standard `h2` · Werte: `h1`, `h2` |
| `sub` | text | ja | nein | Unterzeile (`p.callout-sub`) |
| `lead` | html | ja | nein | Absätze mit `class="lead"` |
| `body` | html | ja | nein |  |
| `listClass` | enum | nein | nein | CSS-Klasse für jede `<ul>` im Rich-Text; `none` = keine · Werte: `none`, `why-points`, `examples`, `facts`, `excl` |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |
| `buttons` | list | nein | nein | Buttons/Links (siehe „Button-Objekt“) |
| `buttons[].label` | text | ja | ja | Beschriftung |
| `buttons[].href` | text | ja | ja | Link-Ziel (URL-Allow-List) |
| `buttons[].style` | enum | nein | nein | Link-Stil, bestimmt die CSS-Klasse (Standard `primary`; `plain` = keine Klasse) · Werte: `primaryBig`, `primary`, `ghosted`, `devBig`, `btn`, `cardLink`, `devlink`, `plain` |
| `buttons[].icon` | text | nein | nein | Emoji, wird in `<span aria-hidden="true">` gesetzt; optional |
| `buttons[].newTab` | bool | nein | nein | öffnet in neuem Tab (`target="_blank"`, `rel="noopener"`) |
| `buttons[].download` | bool | nein | nein | setzt das Attribut `download` |

### Baustein: cards

Karten-Raster. Varianten: `fields`, `why`, `objections`, `explore`, `projects`, `demos`.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `fields`, `why`, `objections`, `explore`, `projects`, `demos` |
| `eyebrow` | text | ja | nein | Überzeile |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `lead` | html | ja | nein | Einleitung; Absätze werden als `<p class="lead">` ausgegeben |
| `cards` | list | nein | nein | Karten |
| `cards[].icon` | enum | nein | nein | reserviert; derzeit nur `none` · Werte: `none` |
| `cards[].accent` | enum | nein | nein | Farbklasse (Standard `none`) · Werte: `none`, `infra`, `dev`, `live` |
| `cards[].image` | image | ja | nein | Bild je Sprache (z. B. Diagramme DE/EN) |
| `cards[].imageAlt` | text | ja | nein | überschreibt `alt` des Bildobjekts; optional |
| `cards[].eyebrow` | text | ja | nein |  |
| `cards[].tag` | text | ja | nein | Etikett (`span.tag` / `span.explore-tag`) |
| `cards[].title` | text | ja | ja |  |
| `cards[].subtitle` | text | ja | nein | Unterzeile (`p.demo-sub`) |
| `cards[].badge` | text | ja | nein | Zusatz-Etikett in der Unterzeile (`span.oss-tag`) |
| `cards[].text` | html | ja | nein | Kartentext; Längenempfehlung höchstens 160 Zeichen (nur Hinweis) |
| `cards[].chips` | list | nein | nein | Chip-Liste |
| `cards[].chips[].label` | text | ja | ja |  |
| `cards[].link` | object | nein | nein | Karte als Ganzes klickbar; `href` unterliegt der URL-Allow-List |
| `cards[].link.href` | text | ja | nein | Link-Ziel (URL-Allow-List) |
| `cards[].link.label` | text | ja | nein | sichtbarer Linktext; optional |
| `cards[].link.newTab` | bool | nein | nein | in neuem Tab öffnen |
| `cards[].buttons` | list | nein | nein | Buttons/Links der Karte (siehe „Button-Objekt“) |
| `cards[].buttons[].label` | text | ja | ja | Beschriftung |
| `cards[].buttons[].href` | text | ja | ja | Link-Ziel (URL-Allow-List) |
| `cards[].buttons[].style` | enum | nein | nein | Link-Stil, bestimmt die CSS-Klasse (Standard `primary`; `plain` = keine Klasse) · Werte: `primaryBig`, `primary`, `ghosted`, `devBig`, `btn`, `cardLink`, `devlink`, `plain` |
| `cards[].buttons[].icon` | text | nein | nein | Emoji, wird in `<span aria-hidden="true">` gesetzt; optional |
| `cards[].buttons[].newTab` | bool | nein | nein | öffnet in neuem Tab (`target="_blank"`, `rel="noopener"`) |
| `cards[].buttons[].download` | bool | nein | nein | setzt das Attribut `download` |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |

### Baustein: steps

Ablauf in Schritten.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `fields` |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `steps` | list | nein | nein | Schritte |
| `steps[].label` | text | ja | nein | z. B. „1 · Kostenloses Erstgespräch“ |
| `steps[].title` | text | ja | ja |  |
| `steps[].text` | html | ja | nein |  |
| `steps[].dauer` | text | ja | nein | Dauer-Angabe |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |

### Baustein: faq

Häufige Fragen als aufklappbare Liste.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default` |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `items` | list | nein | nein | Fragen und Antworten (`<details><summary>`) |
| `items[].question` | text | ja | ja |  |
| `items[].answer` | html | ja | ja | Antwort (Rich-Text) |

### Baustein: ctaBar

Abschluss-Aufruf. Varianten: `default`, `buttonsFirst` (Buttons vor dem Text).

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default`, `buttonsFirst` |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `text` | html | ja | nein |  |
| `buttons` | list | nein | nein | Buttons/Links (siehe „Button-Objekt“), höchstens 2 |
| `buttons[].label` | text | ja | ja | Beschriftung |
| `buttons[].href` | text | ja | ja | Link-Ziel (URL-Allow-List) |
| `buttons[].style` | enum | nein | nein | Link-Stil, bestimmt die CSS-Klasse (Standard `primary`; `plain` = keine Klasse) · Werte: `primaryBig`, `primary`, `ghosted`, `devBig`, `btn`, `cardLink`, `devlink`, `plain` |
| `buttons[].icon` | text | nein | nein | Emoji, wird in `<span aria-hidden="true">` gesetzt; optional |
| `buttons[].newTab` | bool | nein | nein | öffnet in neuem Tab (`target="_blank"`, `rel="noopener"`) |
| `buttons[].download` | bool | nein | nein | setzt das Attribut `download` |

### Baustein: figure

Bild mit Text. Varianten: `default`, `beleg`.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default`, `beleg` |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `image` | image | ja | ja | Bild (Pflicht) |
| `alt` | text | ja | nein | überschreibt `alt` des Bildobjekts; optional |
| `caption` | html | ja | nein | Bildunterschrift (Rich-Text) |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |

### Baustein: contactForm

Kontaktformular. Nur die Texte stehen im Inhalt; die Logik liegt im Frontend-Code der Website.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default` |
| `eyebrow` | text | ja | nein | Überzeile |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `lead` | html | ja | nein | Einleitung; Absätze werden als `<p class="lead">` ausgegeben |
| `hints` | list | nein | nein | Hinweiszeilen |
| `hints[].text` | text | ja | ja |  |
| `messages` | object | nein | nein | Meldungstexte des Formulars |
| `messages.error` | text | ja | nein |  |
| `messages.fallback` | text | ja | nein |  |
| `messages.copyLabel` | text | ja | nein |  |
| `messages.copiedLabel` | text | ja | nein |  |
| `name` | object | nein | nein |  |
| `name.label` | text | ja | nein | sichtbare Beschriftung |
| `name.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `email` | object | nein | nein |  |
| `email.label` | text | ja | nein | sichtbare Beschriftung |
| `email.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `phone` | object | nein | nein |  |
| `phone.label` | text | ja | nein | sichtbare Beschriftung |
| `phone.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `message` | object | nein | nein | Nachrichtenfeld |
| `message.label` | text | ja | nein | sichtbare Beschriftung |
| `message.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `message.placeholder` | text | ja | nein |  |
| `moreSummary` | text | ja | nein | Beschriftung des Ausklappbereichs „Mehr Angaben“ |
| `company` | object | nein | nein |  |
| `company.label` | text | ja | nein | sichtbare Beschriftung |
| `company.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `requestType` | object | nein | nein | Auswahl „Art der Anfrage“ |
| `requestType.label` | text | ja | nein | sichtbare Beschriftung |
| `requestType.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `requestType.options` | list | nein | nein | Auswahlmöglichkeiten |
| `requestType.options[].label` | text | ja | ja |  |
| `urgency` | object | nein | nein | Auswahl „Dringlichkeit“ |
| `urgency.label` | text | ja | nein | sichtbare Beschriftung |
| `urgency.dataLabel` | text | ja | nein | Wert für `data-label` (geht in die erzeugte Mail) |
| `urgency.options` | list | nein | nein | Auswahlmöglichkeiten |
| `urgency.options[].label` | text | ja | ja |  |
| `formHint` | text | ja | nein | Hinweis unter dem Formular |
| `submit` | text | ja | nein | Beschriftung des Absende-Buttons |
| `booking` | object | nein | nein | Alternative Terminbuchung (Ziel kommt aus `site.booking`) |
| `booking.or` | text | ja | nein |  |
| `booking.button` | text | ja | nein |  |
| `booking.icon` | text | ja | nein |  |
| `booking.hint` | text | ja | nein |  |
| `note` | html | ja | nein | Hinweis-Absatz unter dem Inhalt |
| `noteClass` | enum | nein | nein | CSS-Klasse des Hinweis-Absatzes (Standard `note`) · Werte: `note`, `callout-note`, `trust-bar`, `plain-mail`, `muted`, `r-hint`, `source-note` |
| `noteIcon` | text | nein | nein | Emoji vor dem Hinweis, wird in `<span aria-hidden="true">` gesetzt; optional |

### Baustein: vmwareCalculator

VMware-Ausstiegsrechner. Nur die Texte stehen im Inhalt; Standardwerte und Rechenlogik liegen im Frontend-Code.

| Feld | Typ | lokalisiert | Pflicht | Hinweis |
|---|---|---|---|---|
| `sectionKey` | text | nein | ja | `data-section-key` der Section; gleich in DE und EN (Paritätsprüfung) |
| `anchorId` | text | ja | nein | Sprungmarke (`id` der Section), je Sprache; leer = keine `id` |
| `variant` | enum | nein | nein | Markup-Variante; fehlt der Wert, gilt der erste der Liste. Exporter schreiben ihn immer · Werte: `default` |
| `heading` | text | ja | nein | Überschrift (h2, bei `text` per `headingLevel` h1/h2) |
| `labels` | object | nein | nein | Beschriftungen des Rechners |
| `labels.hosts` | text | ja | nein |  |
| `labels.vms` | text | ja | nein |  |
| `labels.sockets` | text | ja | nein |  |
| `labels.cores` | text | ja | nein |  |
| `labels.costLegend` | text | ja | nein |  |
| `labels.costKnown` | text | ja | nein |  |
| `labels.costEstimate` | text | ja | nein |  |
| `labels.vmwareCost` | text | ja | nein |  |
| `labels.vmwareCostPlaceholder` | text | ja | nein |  |
| `labels.edition` | text | ja | nein |  |
| `labels.estimateHint` | text | ja | nein |  |
| `labels.proxmoxTier` | text | ja | nein |  |
| `labels.contractEnd` | text | ja | nein |  |
| `labels.monthAria` | text | ja | nein |  |
| `labels.yearAria` | text | ja | nein |  |
| `labels.featuresLegend` | text | ja | nein |  |
| `labels.calculate` | text | ja | nein |  |
| `editions` | list | nein | nein | Auswahl VMware-Edition; `value` ist ein fester Rechenschlüssel, `label` der Text |
| `editions[].value` | text | nein | ja |  |
| `editions[].label` | text | ja | ja |  |
| `tiers` | list | nein | nein | Auswahl Proxmox-Support-Stufe; `value` fester Rechenschlüssel |
| `tiers[].value` | text | nein | ja |  |
| `tiers[].label` | text | ja | ja |  |
| `months` | list | nein | nein | Monatsliste; `value` fester Rechenschlüssel |
| `months[].value` | text | nein | ja |  |
| `months[].label` | text | ja | ja |  |
| `features` | list | nein | nein | Funktionsliste; `value` fester Rechenschlüssel |
| `features[].value` | text | nein | ja |  |
| `features[].label` | text | ja | ja |  |

## 4. Rich-Text (`html`)

Felder vom Typ `html` enthalten einen **HTML-Fragment-String** ohne umschließendes Element,
UTF-8, Sonderzeichen in Text als Entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`). Der Website-Build
**prüft** jeden Rich-Text-String gegen die folgende Teilmenge, bevor er ihn ausgibt (`lib/richtext.js`,
`sanitizeRichText`), und ergänzt danach nur CSS-Klassen:

| Element | Attribute | Hinweis |
|---|---|---|
| `p` | – | Absatz; der Renderer ergänzt Klassen (z. B. `claim`, `lead`) |
| `br` | – | Zeilenumbruch |
| `strong`, `em`, `code`, `sub`, `sup` | – | Inline-Auszeichnung |
| `h2`, `h3`, `h4` | – | Zwischenüberschriften (nur sinnvoll in `text.body`; die Seitenüberschrift `h1` steht im Baustein) |
| `ul`, `ol`, `li` | – | Listen (`ul` bekommt `listClass` des Bausteins); Zusatzattribute aus Editoren (`class="list-bullet"`, `li class/style/value`) entfernt der Renderer |
| `hr` | – | Trennlinie |
| `a` | `href` (Pflicht), `rel`, `target` | siehe Abschnitt 6; `target="_blank"` nur zusammen mit `rel="noopener"`; `rel="noopener nofollow"` für Quellenlinks |

Alles andere ist nicht erlaubt, z. B. `script`, `style`, `iframe`, `img`, `span`, `h1`, `blockquote`,
Kommentare, Event-Attribute (`on…`), `style`-Attribute. Bilder gehören in Felder vom Typ `image`.

**Prüfung im Build (Verstoß = Build-Fehler, es wird nichts still entfernt).** Die Meldung nennt Seite,
Sprache und Feld (z. B. `cms: Rich-Text (home/de blocks[3].note): Tag <script> ist nicht erlaubt`).
Geprüft wird:

- nur Tags aus der Tabelle; jedes `<` im Text muss als `&lt;` stehen;
- nur die genannten Attribute; Werte in `"…"` oder `'…'`; kein Attribut doppelt;
- toleriert werden genau die Editor-Artefakte `ul`/`ol` mit `class="list-bullet"` bzw. `class="list-number"`
  und `li` mit `class=""`, `style=""`, `value="<zahl>"` (der Renderer entfernt sie);
- `a` braucht `href`; `href` muss nach dem Auflösen der Zeichenreferenzen die URL-Regeln aus Abschnitt 6
  erfüllen. In `href` sind nur die Referenzen `&amp;` `&lt;` `&gt;` `&quot;` `&apos;` und numerische
  (`&#47;`, `&#x2F;`) erlaubt; andere (z. B. `&sol;`, `&colon;`) und ein rohes `&` sind ein Fehler;
- `rel` nur aus `noopener`, `noreferrer`, `nofollow`; `target` nur `_blank` und nur mit `rel="noopener"`.

Nicht geprüft wird die Verschachtelung (z. B. ein nicht geschlossenes `<strong>`).

## 5. Bildobjekt (`image`)

Felder vom Typ `image` enthalten ein Objekt (oder fehlen):

| Feld | Typ | Pflicht | Hinweis |
|---|---|---|---|
| `publicPath` | text | ja | Pfad in der Website, unter dem das Bild ausgeliefert wird |
| `file` | text | ja | Dateiname in `media/`; schlichter Name ohne `/`, `\`, NUL; **gleiche Endung** wie `publicPath` |
| `alt` | text | ja | Alternativtext (je Sprache), soll nicht leer sein; Bausteine mit eigenem `alt`/`photoAlt`/`imageAlt` überschreiben ihn |
| `width` | Zahl | nein | Pixelbreite |
| `height` | Zahl | nein | Pixelhöhe |

Regeln für `publicPath` (der Build prüft sie erneut und bricht sonst ab):

- beginnt mit `/assets/`;
- enthält weder `..` noch Backslash noch NUL;
- liegt nicht unter `/assets/js/`, `/assets/css/`, `/assets/fonts/`;
- Endung `jpg`, `jpeg`, `png`, `webp` oder `avif` (kein SVG), passend zur Datei in `file`;
- jeder `publicPath` gehört zu genau einer Datei.

`media/index.json` listet alle verwendeten Bilder als `{ "file", "publicPath" }`; jede Datei muss
in `media/` liegen. Der Build kopiert `media/<file>` nach `<publicPath>` in die Ausgabe. Existiert
dort schon eine Datei aus dem Repo, muss sie byte-identisch sein (sonst Fehler, kein stilles
Überschreiben). Jedes Bildobjekt in `pages.json` muss in `media/index.json` stehen oder als Datei
unter diesem Pfad im Repo existieren.

## 6. URL-Regeln (Allow-List)

Alle Link-Ziele in `text`-Feldern (`buttons[].href`, `cards[].link.href`, die URL-Felder in
`chrome.json` und `site.json`) werden mit derselben Allow-List geprüft; ein Verstoß bricht den
Build ab. Erlaubt (nach Entfernen von Leerraum an den Rändern):

- `/pfad` (beginnt mit einem einzelnen `/`),
- `#anker`,
- `http://…` und `https://…`,
- `mailto:…` und `tel:…` (Schema ohne Rücksicht auf Groß-/Kleinschreibung).

Abgelehnt: alles andere (`javascript:`, `data:`, `vbscript:`, …), protokoll-relative `//host`,
jedes Ziel mit Leer- oder Steuerzeichen im Inneren oder mit Backslash (`/\host`), leere Ziele.
Die Prüfung steht in `lib/url.js` (`isSafeHref`).

Für `href` in Rich-Text (`a`) gilt dieselbe Regel; der Build prüft auch sie (Abschnitt 4).
Link-Ziele mit Platzhaltern werden erst aufgelöst und dann geprüft (Abschnitt 9).

## 7. `site.json` (Stammdaten)

`site` ist ein Objekt mit diesen Textfeldern (alle Pflicht, sprachunabhängig):

`name`, `owner`, `domain` (URL), `tel`, `telDisplay`, `telHref` (URL, `tel:…`), `email`, `street`,
`postalCode`, `city`, `region`, `booking` (URL), `portal` (URL), `github` (URL), `logo` (URL/Pfad).
Felder mit „URL“ unterliegen der Allow-List (Abschnitt 6).

## 8. `chrome.json` (UI-Texte, Navigation, Fußzeile)

Pro Sprache (`de`, `en`; beide Pflicht) ein Objekt gleichen Aufbaus. Alle Texte sind einzeilig.

| Feld | Hinweis |
|---|---|
| `skip`, `menuOpen`, `portal`, `themeToggle` | Texte; Pflicht |
| `home` | URL; Pflicht |
| `nav.aria`, `nav.cta` | Texte; Pflicht |
| `nav.items[]` | Liste `{ label, url }`; Pflicht |
| `langSwitch.label`, `.code`, `.aria` | Texte; Pflicht |
| `langSwitch.fallback` | URL; Pflicht |
| `footer.legalAria`, `.copyright`, `.github`, `.tagline` | Texte; Pflicht |
| `footer.location` | Text; optional |
| `footer.legal[]` | Liste `{ label, url }`; Pflicht |
| `subnav.home`, `subnav.tabsAria` | Texte; Pflicht, sobald eine Seite mit `frame` `subpage`/`subpageTabs` in dieser Sprache gebaut wird |
| `subnav.tabs[]` | Liste `{ key, label, url }`; `key` = `translationKey` der Zielseite (markiert den aktiven Tab) |

`url`-Felder unterliegen der Allow-List (Abschnitt 6). Fehlt `subnav`, bricht der Build bei einer
Seite mit Rahmen `subpage`/`subpageTabs` ab.

## 9. Platzhalter (Stammdaten aus `site.json`)

Kontaktdaten (Telefon, E-Mail, Adresse, Buchungs-URL …) werden einmal in `site.json` gepflegt und in
Inhalten als Platzhalter eingesetzt. Ändert sich ein Wert in `site.json`, ändern sich alle Stellen.

**Syntax:** `{{site.<schlüssel>}}`, z. B. `{{site.telDisplay}}`. `<schlüssel>` ist ein Feldname aus
Abschnitt 7 (beginnt mit einem Buchstaben, dann Buchstaben, Ziffern, `_`). Leerraum innerhalb der
Klammern ist erlaubt (`{{ site.email }}`). Andere `{{…}}` ohne `site` bleiben normaler Text.

**Wo:** in allen Text- und Rich-Text-Werten einer Fassung (`title`, `description`, `og.*`, alle Felder
der Bausteine einschließlich Link-Zielen), nicht in `slug`. Nicht in `site.json` und `chrome.json`.

**Einsetzen je Kontext** (der Kontext ergibt sich aus dem Feldtyp in Abschnitt 3):

| Kontext | Felder | Verhalten |
|---|---|---|
| Text | Typ `text` (außer Link-Zielen), Seitenfelder | Wert wird als Text eingesetzt und beim Ausgeben wie jeder Text maskiert (`<` erscheint als `&lt;`) |
| Rich-Text | Typ `html` | Wert wird HTML-maskiert eingesetzt, auch innerhalb von Attributen (`<a href="{{site.telHref}}">{{site.telDisplay}}</a>`); danach gilt die Prüfung aus Abschnitt 4 |
| Link-Ziel | Felder `…href` | Wert wird eingesetzt, das Ergebnis muss die URL-Regeln (Abschnitt 6, `safeHref`) erfüllen, z. B. `{{site.booking}}`, `mailto:{{site.email}}` |

Eingesetzte Werte werden nicht erneut nach Platzhaltern durchsucht.

**Fehler (Build-Abbruch mit Seite/Sprache/Feld):** unbekannter Schlüssel
(`unbekannter Platzhalter {{site.gibtsnicht}} (danke/de blocks[0].body)`), leerer Wert, Syntax, die
wie ein Platzhalter beginnt, aber keiner ist (`{{site.tel Display}}`, `{{site.}}`), sowie ein Link-Ziel,
das nach dem Einsetzen gegen die URL-Regeln verstößt.

## 10. Nicht Teil von Version 1

Platzhalter aus anderen Quellen als `site.json` (z. B. Preise, die an einer Stelle gepflegt und in
mehrere Texte eingesetzt werden) sind **nicht** Teil von v1; solche Texte stehen ausgeschrieben im Inhalt.
