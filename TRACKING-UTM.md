# Marketing-Tracking & UTM-Konvention — kozlowski-it.de

Cookielos, DSGVO-freundlich, kein Google-Tracker. Conversion-Messung läuft über
das eigene, selbst gehostete Matomo (stats.kozlowski-it.de) + UTM-Parameter.

## 1. Conversion-Signale (schon im Code, live)

Werden als Matomo-**Events** erfasst (Kategorie immer `Kontakt`):

| Aktion | Event-Aktion | Woher |
|---|---|---|
| Kontaktformular abgeschickt | `Formular gesendet` | `assets/js/contact.js` |
| Telefon-Klick (auch Header) | `Anruf-Klick` | `assets/js/analytics.js` (site-weit) |
| E-Mail-Klick | `E-Mail-Klick` | `assets/js/analytics.js` |
| Termin-Button (cal.) | `Termin-Klick` | `assets/js/analytics.js` |
| Fallback „Text kopiert" | `Text kopiert` | `assets/js/contact.js` |

Kein PII in den Events — nur die Aktions-Art.

## 2. Matomo-Ziele anlegen (einmalig, ~3 Min)

Matomo → **Administration (Zahnrad)** → **Ziele** → **+ Neues Ziel**

**Haupt-Ziel** (deckt alle Kontakt-Wege ab, passend zum Google-Ads-Ziel „Kontaktaufnahme"):
- Name: `Kontaktaufnahme`
- Ziel wird ausgelöst wenn: **Ereignis senden** (Send an Event)
- Bedingung: **Ereignis-Kategorie** — **ist** — `Kontakt`
- Mehrere Conversions pro Besuch erlauben: **Nein**
- Wert: leer lassen

**Optionale Detail-Ziele** (um zu sehen, welcher Kanal zieht) — jeweils Trigger „Ereignis senden":

| Name | Bedingung |
|---|---|
| Formular gesendet | Ereignis-Aktion — ist — `Formular gesendet` |
| Anruf | Ereignis-Aktion — ist — `Anruf-Klick` |
| E-Mail | Ereignis-Aktion — ist — `E-Mail-Klick` |
| Terminbuchung | Ereignis-Aktion — ist — `Termin-Klick` |

## 3. UTM-Konvention (Google Ads & Co.)

Immer **kleingeschrieben**, **Bindestriche** statt Leerzeichen.

| Parameter | Wert | Bedeutung |
|---|---|---|
| `utm_source` | `google` | Quelle (später `bing`, `facebook` …) |
| `utm_medium` | `cpc` | bezahlte Suche (sonst `display`, `local`, `email`) |
| `utm_campaign` | `it-betreuung` … | Kampagne (siehe unten) |
| `utm_term` | `{keyword}` | optional; Google Ads füllt `{keyword}` automatisch mit dem Suchbegriff |
| `utm_content` | `anzeige-a` | optional; Anzeigen-Variante zum Vergleich |

Kampagnen-Namen: `it-betreuung`, `softwareentwicklung`, `vmware-ausstieg`, `it-analyse`, `allgemein`

### Fertige Ziel-URLs

```
https://kozlowski-it.de/it-betreuung/?utm_source=google&utm_medium=cpc&utm_campaign=it-betreuung&utm_term={keyword}
https://kozlowski-it.de/software/?utm_source=google&utm_medium=cpc&utm_campaign=softwareentwicklung&utm_term={keyword}
https://kozlowski-it.de/vmware-ausstieg/?utm_source=google&utm_medium=cpc&utm_campaign=vmware-ausstieg&utm_term={keyword}
https://kozlowski-it.de/it-infrastrukturanalyse/?utm_source=google&utm_medium=cpc&utm_campaign=it-analyse&utm_term={keyword}
https://kozlowski-it.de/?utm_source=google&utm_medium=cpc&utm_campaign=allgemein&utm_term={keyword}
```

### Sauberer Weg in Google Ads: Finale-URL-Suffix

Statt die UTMs an jede finale URL zu hängen, zentral eintragen unter
**Kampagne → Einstellungen → Weitere Einstellungen → Tracking → Finale-URL-Suffix**:

```
utm_source=google&utm_medium=cpc&utm_campaign=it-betreuung&utm_term={keyword}
```

→ Die sichtbare finale URL bleibt die saubere Landingpage; Google hängt die Parameter automatisch an.

## 4. Erfolg ablesen

- **Matomo → Referrers → Kampagnen**: Besuche + Zielerreichungen je `utm_campaign`.
- **Matomo → Verhalten → Ereignisse**: die einzelnen Kontakt-Aktionen.
- **Google Ads (eigenes Reporting)**: Klicks, Kosten, CTR, Keywords.

Kein GA4, kein Cookie-Banner, kein Drittanbieter — konsistent mit der Datenschutzerklärung.
