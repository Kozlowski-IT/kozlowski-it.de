# Spike-Ergebnis: Visueller Editor, Scheibe 1 (Task 1)

Stand 2026-11-09. Gemessen im Headless-Browser auf dev02, an einer Wegwerf-Kopie von `cms/` außerhalb des Repos
mit einer eigenen, danach gelöschten Datenbank. Der Spike-Code ist gelöscht, im Repo kam nur diese Datei dazu.

**Ergebnis: Die Annahmen für Task 6 und 7 halten. Kein Umbau nötig.** `srcdoc` mit
`sandbox="allow-same-origin"` funktioniert, und der bevorzugte Panel-Weg über `Form` und `RenderFields` läuft
inklusive Lexical. Unten stehen die Präzisierungen, die Task 4, 6, 7 und 8 beachten müssen.

## Womit gemessen wurde

| | |
|---|---|
| Browser | Playwright 1.58.2: Chromium 145 und Firefox (Revision 1509), beide headless |
| WebKit/Safari | **nicht gemessen.** Der Start scheitert an fehlenden Systembibliotheken, ohne sudo nicht installierbar |
| Server | `next dev` (Chromium, Firefox) und zusätzlich `next build` + `next start` (nur Chromium) |
| Inhalt | echtes `_site/index.html`, echtes `assets/`, Kopie der Dev-Datenbank |

Die Zusatztests (Dokument-Ersatz bei Anker-Links, Tasten im Elternfenster, Marken ohne `<section>`, Ersetzen per
`Range`) liefen nur auf `next dev`. Word-Einfügen, Medien-Dialog und der Pixelvergleich mit abgeschalteten
Animationen liefen nur in Chromium auf `next start`.

## Step 1: `srcdoc` mit `sandbox="allow-same-origin"`

Alle Zeilen ohne Zusatz gelten für Chromium und Firefox.

| Frage | Ergebnis |
|---|---|
| Lädt das echte CSS? | Ja, `/assets/css/style.css` 200, 298 Regeln lesbar |
| Lädt die Schrift? | Ja. Sora und IBM Plex Sans `loaded`, `fonts.check` wahr, Textbreite weicht vom Fallback ab (519 gegen 554 px in Chromium) |
| Zugriff der Elternseite aufs iframe-DOM | Ja: `contentDocument`, `contentWindow.getComputedStyle`, TreeWalker, `elementFromPoint`, `<style>` einfügen |
| Höhe messen | `documentElement.scrollHeight` bleibt stabil (6 Durchläufe, keine `vh`-Rückkopplung), `ResizeObserver` der Elternseite feuert |
| Zuordnungsmarken `<!--b:N-->` | Alle 10 gefunden, Klick auf Bedien-Ebene → richtiger Abschnitt |
| Listener von außen (`iframeDoc.addEventListener`) | Laufen bei echten Klicks und Tasten, trotz fehlendem `allow-scripts`. `preventDefault` wirkt |
| `<script>`, `onerror`, `onclick`, `javascript:` im Inhalt | Laufen nicht, auch nicht nach dem Einfügen per `outerHTML` oder `createContextualFragment` |
| Formular absenden | Geblockt (kein `allow-forms`), keine Anfrage |
| Link `target=_top` / `_blank` | Geblockt, Elternseite bleibt, kein Popup |
| `contentEditable="plaintext-only"` | Geht, `input` und `beforeinput` kommen an |
| Teil-Ersetzung zwischen zwei Marken (`Range`) | Geht, Marken bleiben erhalten |

**Gleiche Darstellung:** Oberhalb von `#kontakt` sind iframe und echte Seite pixelgleich (Chromium, Animationen
aus). Die einzige Abweichung dort sind zwei `loading="lazy"`-Bilder, die in der echten Seite beim Screenshot noch
nicht geladen waren, also ein Messfehler. Verglichen wurde nur die Startseite.

**CSP:** Blockt heute nichts.
- `deploy/edge02/cms.kozlowski-it.de.conf` setzt für den Admin keine CSP. Lokal sendet auch Next keine, weder in
  dev noch mit `next start`.
- Die Live-Antwort auf `/admin/login` (403 von edge02) enthält nur HSTS und `X-Robots-Tag`. **Hinter dem Login
  wurde nicht gemessen.** Ob auf edge02 noch die Config aus dem Repo liegt, ist nicht geprüft.
- `srcdoc` erbt die CSP der Elternseite. Mit `style-src 'self'` laufen CSS und Schrift weiter, ein vom Editor
  eingefügtes `<style>` wird aber geblockt. Wird später eine CSP für den Admin eingeführt, muss die Editor-Hervorhebung
  als Datei kommen.

## Step 2: Einstellungs-Panel

**Gewählt: der bevorzugte Weg** (`Form` + `RenderFields` mit `getFormState`). Der Rückfall `useDocumentDrawer`
wird nicht gebraucht und wurde nicht gebaut. Das Ganze lief als Tab unter `admin.components.views.edit` auf
Blöcken vom Typ `hero`, `text` und `cards`, in Chromium und Firefox, dev und `next start` (Chromium).

Gemessen: Tab „Seite“ erscheint, `useDocumentInfo` liefert Daten, Textfelder ändern den Formularzustand,
Lexical samt Toolbar tippt und landet als `{root}`-Wert im Zustand, Array-Zeile hinzufügen klappt (auch mit
Rich-Text-Feldern im selben Block). Der Dialog „Choose from existing“ öffnet sich (Chromium, `next start`). Die
Feldliste bleibt im Tab „Edit“ erreichbar. Ohne Speichern ändert sich nichts am Dokument. Panel steht in 0,7 bis
1,4 s nach Seitenaufruf.

Rezept für `Panel.tsx`:

```tsx
const { getEntityConfig } = useConfig()
const { id, docPermissions } = useDocumentInfo()
const { getFormState } = useServerFunctions()
const coll = getEntityConfig({ collectionSlug: 'pages' })
const cb = coll.fields.find((f) => f.name === 'layout').blocks.find((b) => b.slug === block.blockType)
const schemaPath = `pages.layout.${block.blockType}`   // ohne .fields, ohne layout.N
const { state } = await getFormState({
  collectionSlug: 'pages', id, schemaPath, data: block, docPermissions,
  docPreferences: { fields: {} }, operation: 'update', renderAllFields: true,
})
// <Form fields={cb.fields} initialState={state} onChange={[fn]} el="div">
//   <RenderFields fields={cb.fields} forceRender parentIndexPath="" parentPath=""
//                 parentSchemaPath={schemaPath} permissions={true} />
// onChange: Werte mit reduceFieldsToValues(formState, true) aus 'payload/shared', dann getFormState mit formState
```

Die Feldpfade im Zustand sind relativ zum Block (`h1`, `trustPoints.0.text`). Der Tab-Eintrag sah so aus:
`{ Component, path: '/visual', tab: { label: 'Seite', href: '/visual', order: 50 } }`. Mit `order: 50` steht er vor
„Edit“. Danach Import-Map neu erzeugen.

## Step 3: Festlegungen für die Tasks

### Assets-Pfad für das iframe (Task 6)

Die CMS-Origin liefert `/assets/…` heute **nicht** aus. Empfehlung: Symlink im Repo
`cms/public/assets -> ../../assets`. Gemessen in `next dev` und `next start`: CSS, Schriften und Bilder 200.
Pfad-Traversal ergab 404 (nur `next start` geprüft). `AssetPaths` wird damit `/assets/css/style.css`. **Nicht gemessen:** der Symlink im Docker-Image
(kein Docker auf dev02). `COPY . .` im Dockerfile sollte ihn erhalten; beim Deployment prüfen.

Verworfen: CSS von `cms-vorschau.kozlowski-it.de` laden. Schriften von einer anderen Origin scheitern ohne CORS-Header
(gemessen, Chromium und Firefox).

### Hochgeladene Bilder (Task 4, 8)

`publicPath` neuer Bilder ist `/assets/media/<datei>`. Diese Dateien liegen aber in `cms/media`, erst der Export
kopiert sie. Auf der CMS-Origin wären sie 404. Im Editor-Rendering daher `/api/media/file/<filename>` verwenden,
per Option in `blocksToContent`, damit der Export unverändert bleibt. **Nicht gemessen:** Das echte Bild über
diese URL in der Mitte (im Spike lag kein `cms/media`).

### Zeichenfläche (Task 6)

- **Anker-Links sind die gefährlichste Stelle.** `<a href="#x">` löst im `srcdoc` gegen die URL der Elternseite auf
  und lädt die **Admin-Seite ins iframe** (Chromium und Firefox). Normale Links navigieren das iframe ebenfalls.
  Die Bedien-Ebene fängt das ab (gemessen). Sobald sie für Textbearbeitung weicht, zusätzlich `click` und `submit`
  mit `capture` und `preventDefault` auf dem iframe-Dokument.
- **Zuordnung nicht über `closest('section')`:** Varianten wie `text/callout` und `text/legal` haben kein `<section>`.
  Über die Marken in Dokumentreihenfolge mit `compareDocumentPosition` funktioniert es auch ohne `<section>` (gemessen).
- **Strg+Z und Strg+Y auch auf dem iframe-Dokument abfangen.** Liegt der Fokus im iframe, bekommt das
  Elternfenster keine Tasten (gemessen).
- **Skript-Abhängiges fehlt.** `contact.js` blendet `.booking` ein, im iframe fehlt der Block (149 px Höhe in
  `#kontakt`). `buildSrcdoc` entfernt `hidden`, wenn `data-booking-url` gesetzt ist. Das Thema bleibt ohne
  `theme.js` hell; `data-theme` lässt sich von außen setzen.

### Bearbeiten (Task 7)

- **Marken reichen nur bis zum Abschnitt, nicht bis zum Feld.** Der Plan sagt „Zuordnung über dieselben Marken“.
  Für das Feld braucht `InlineText.ts` einen zweiten Schritt, ohne Vorlagen zu ändern: das Element im Abschnitt
  suchen, dessen Text exakt dem Feldwert entspricht. Auf `_site` passt das für 93 von 94 Textfeldern der obersten
  Ebene eindeutig (das fehlende ist ein `alt`-Attribut). **Felder in Arrays wurden nicht ausgewertet.** Ohne
  eindeutigen Treffer bleibt das Feld im Panel.
- **Enter abfangen:** Bei `plaintext-only` fügt Enter Zeilenumbrüche ein.
- **Strg+Z beim Tippen:** Die Browser-Rücknahme nahm den ganzen getippten Lauf in einem Schritt zurück.
- **Einfügen im Text auf der Seite:** `plaintext-only` nimmt nur reinen Text (Chromium gemessen).
- **Einfügen ins Rich-Text-Feld:** Lexical verwirft Farbe und Schriftgröße selbst, verschluckt aber Leerzeichen an
  `<font>`/`<span>`-Grenzen. `cleanPastedHtml` lässt sich vorschalten: `paste` am Panel mit `capture` abfangen,
  bereinigen, als `ClipboardEvent` mit neuem `DataTransfer` erneut auslösen. Ergebnis mit Leerzeichen richtig, Fett
  bleibt (Chromium, `next start`).
- **Panel und Zustand:** `Form` hält eigenen Zustand. Nach Rückgängig oder Text auf der Seite muss das Panel neu
  aufgebaut werden (`key` wechseln, neues `getFormState`). Das folgt aus dem Code, gemessen ist es nicht.
- **Sprache aus `useLocale()`, nicht aus der URL.** Die Admin-Sprache bleibt gespeichert: Nach einem Besuch mit
  `?locale=en` stand der Admin auf Englisch, während der Spike deutsche Daten lud.
- **Oberflächentexte:** `RenderFields` zeigt die heutigen Beschriftungen: technische Felder wie „Section Key“,
  „Variant“, „Anchor Id“ und englische Standardtexte wie „Add Trust Point“, weil `payload.config.ts` keine
  `i18n`-Sprachen setzt. Für die Vorgabe „Deutsch in Alltagssprache“ braucht Task 7 deutsche `label`, `i18n`
  mit Deutsch und ein Ausblenden technischer Felder. Das Ausblenden ist nicht gemessen.

## Nicht geprüft

- WebKit/Safari: gar nicht. Betrifft vor allem die Listener von außen und `plaintext-only`.
- Der Weg hinter edge02 und oauth2-proxy, also die echte CSP und Anmeldung.
- Symlink im Docker-Image.
- Echte Word-Zwischenablage: Getestet wurde Word-artiges HTML (`MsoNormal`, `mso-*`, `<font>`), und das nur in Chromium.
- Pixelvergleich anderer Seiten als der Startseite, zum Beispiel mit dem VMware-Rechner.
- Link-Dialog in Lexical, „Create New“ im Medien-Feld, Validierungsfehler im Panel.
- Wechsel zwischen Abschnitten mit noch nicht übernommenen Eingaben.
