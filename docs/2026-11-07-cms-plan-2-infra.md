# CMS Plan 2 — Infra + Live-Umschaltung — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das lokal fertige CMS (Plan 1) läuft auf docker01 hinter Zitadel-Login unter `cms.kozlowski-it.de`, und `kozlowski-it.de` wird aus `releases/current` des Builders ausgeliefert.

**Architecture:** Ein Image (`kozlowski/pk-cms:<git-sha>`) enthält Payload, Builder und Eleventy; drei Dienste (payload, builder, preview-nginx) plus Postgres laufen als Stack `/opt/docker/apps/cms/` in einem neuen DMZ-VLAN 85. edge02 terminiert TLS, prüft Login + Rolle `cms-editor` per oauth2-proxy (Zitadel-OIDC) und reicht Identität per Header an Payload weiter; Payload vertraut dem Header nur mit gemeinsamem Edge-Secret. Die bestehende `landing`-nginx mountet danach `releases/` read-only.

**Tech Stack:** Payload 3.93 / Next 16, Node ≥ 24.22.1, Postgres 18, Eleventy 3, nginx (alpine), oauth2-proxy 7.x (Binary + systemd auf edge02), Zitadel, pfSense pf03 (DMZ).

**Spec:** `docs/2026-11-06-cms-design.md` (§3, §5, §6, §7, §8.3–8.4, §9 Schritt 4). Plan 1: `docs/2026-11-06-cms-plan-1-lokal.md`. Carries a–h: `.superpowers/sdd/2026-11-06-cms-plan-1-lokal/progress.md` (Zeile „PLAN-2-PFLICHT-CARRIES").

## Global Constraints

- Öffentliche Seite bleibt statisch, **CSP/Security-Header unverändert** (stehen auf edge02 in `kozlowski-it.de.conf`, NICHT anfassen außer `proxy_pass`-Ziel bleibt `10.30.78.2`).
- `kozlowski-it.de` bekommt **keinen** Admin-Pfad; keine Cookies auf der Apex-Domain (oauth2-proxy **ohne** `cookie_domain`).
- **Ein Fehler beim Veröffentlichen nimmt die Live-Seite nie offline** (Spec §1.3); Umschaltung nur nach grünem Gleichheitstest (Spec §8.1).
- `/opt/tidelane` und alle TideLane-VMs: nicht anfassen. Neue Container nur im neuen VLAN 85.
- docker01-Konvention: Compose unter `/opt/docker/apps/cms/`, Daten unter `/opt/docker-data/cms/` (PBS-Backup-Set).
- DMZ-Container bekommen `resolv-clean.conf` (`nameserver 9.9.9.9`) bind-gemountet (docker01-`resolv.conf` hat `search tidelane.io`/`ndots:0`, LAN-Resolver aus DMZ geblockt).
- pf03-Regelmuster pro DMZ-Interface: DNS-zur-Firewall → spezifische Allows → **block RFC1918-Alias** → Internet-Egress. edge02-WG-IP = `10.99.98.2`.
- Secrets: zufällig (`openssl rand -hex 32`), `.env` mode 600, nie ins Repo.
- Node ≥ 24.22.1 (Carry b); Payload-Version gepinnt (3.93.0).
- Jede Infra-Änderung wird in der Memory (`project_cms_website.md`) notiert (Spec §9.4).

**Festgelegte Werte (gelten in allen Tasks):**

| Ding | Wert |
|---|---|
| VLAN | `85` — läuft über den bestehenden Trunk `dmz_vlan01` (vlan-aware, vids 2–4094), an dem pf03 (VM 103, net3) und docker01 (VM 2000, net2) ungetaggt hängen; **kein SDN-VNet nötig** (gemessen 2026-11-07) |
| Netz | `10.30.85.0/29`, GW `10.30.85.1` (pf03) |
| payload | `10.30.85.2:3000` |
| preview (nginx) | `10.30.85.3:80` |
| builder | `10.30.85.4:4100` (kein Zugriff von edge02) |
| Docker-Netze | `dmz_cms` (macvlan, parent `ens20.85`), `cms_db` (bridge, `internal: true`) |
| Hosts | `cms.kozlowski-it.de` (Admin), `cms-vorschau.kozlowski-it.de` (Vorschau) |
| Zitadel | Projekt `kozlowski-cms`, Rolle `cms-editor`, OIDC-App `cms-edge` |
| oauth2-proxy | edge02 `127.0.0.1:4180`, Config `/etc/oauth2-proxy/cms.cfg`, Unit `oauth2-proxy-cms.service` |
| Header edge→payload | `X-Edge-Secret`, `X-Auth-Request-Email`, `X-Auth-Request-Groups` |
| Image | `kozlowski/pk-cms:<kurz-sha>` (gebaut auf docker01) |
| Daten | `/opt/docker-data/cms/{pgdata,media,work,repo,ssh,backup}` |

**Abweichung von Spec §3/§5 (bewusst, Carry e):** Vorschau läuft auf eigenem Host `cms-vorschau.kozlowski-it.de` statt `cms.kozlowski-it.de/vorschau/`. Grund: Das Reload-Skript fragt `/__build.txt` absolut ab und alle Seitenlinks sind wurzel-relativ; eine Unterpfad-Vorschau bräuchte einen Eleventy-`pathPrefix`, der den Gleichheitstest bricht. Gleicher Login (gleicher oauth2-proxy), `noindex`.

**Abweichung von Spec §6 (bewusst):** Payload spricht nicht selbst OIDC mit Zitadel, sondern vertraut der Identität, die oauth2-proxy auf edge02 nach Zitadel-Login + Rollenprüfung per Header liefert (abgesichert durch Edge-Secret + Firewall: Payload nur von edge02 erreichbar). Grund: ein Login-Weg statt zwei (Spec verlangt den oauth2-proxy ohnehin), kein OIDC-Plugin im Payload-Kern. Ergebnis für Pascal gleich: Zitadel-Login mit Passkey, Notfall-Passwort nur intern.

## Review Focus

1. **Gefälschte Identitäts-Header aus dem DMZ-Netz** (z. B. vom builder-Container oder bei Fehlkonfiguration von edge02): Payload darf ohne korrektes `X-Edge-Secret` niemanden anmelden, auch wenn `X-Auth-Request-Email` stimmt → Test in Task 3.
2. **Nutzer mit Zitadel-Login, aber ohne Rolle `cms-editor`** bzw. mit Rolle, aber ohne Payload-User: kein Zugriff (403 an edge02 bzw. kein `req.user`) → Tests in Task 3 + Zugangstest Task 9.
3. **Neustart/Recreate des Stacks während eines Publish**: `current` zeigt danach entweder auf alten oder neuen vollständigen Release, nie auf einen halben; Landing liefert durchgehend aus → Prüfschritt in Task 8.
4. **Leere/neue Prod-DB beim ersten Start** (keine Tabellen, `push` aus): Payload muss über Migrationen hochkommen statt still ein leeres Schema zu „pushen" → Test in Task 2.
5. **Unterstreichen/Zitat/Bild im Rich-Text** (Formate außerhalb der Tag-Teilmenge): im Editor gar nicht anbietbar, statt dass Publish mit „Tag nicht erlaubt" scheitert → Test in Task 2.

---

### Task 1: Builder härten (Carries d, e-atomar, h)

**Files:**
- Modify: `builder/src/server.mjs` (CLI `main`), `builder/src/proc.mjs` (`runNode`), `builder/src/build.mjs` (Preview-Zweig)
- Test: `builder/test/server.test.mjs`, `builder/test/build.test.mjs`, neu `builder/test/proc.test.mjs`

**Interfaces:**
- Produces: `parseTimeout(raw: string | undefined): number` (exportiert aus `server.mjs`); `runNode(args, { cwd, env, timeoutMs, signal })` vererbt nur noch `PATH, HOME, LANG, TZ, NODE_ENV` + übergebenes `env`; `workDir/preview` ist ab jetzt ein **Symlink** auf `workDir/.previews/<id>` (relativer Link, atomar per `symlink`→`rename` umgebogen, wie `releases/current`).

- [ ] **Step 1: Failing tests schreiben**

```js
// server.test.mjs
test("parseTimeout: leer → 120000", () => assert.equal(parseTimeout(undefined), 120_000));
test("parseTimeout: gültig", () => assert.equal(parseTimeout("90000"), 90_000));
for (const bad of ["abc", "NaN", "0", "-5", "9999", "600001", "1.5e5x", ""])
  test(`parseTimeout: ${JSON.stringify(bad)} → Start verweigert`, () => assert.throws(() => parseTimeout(bad), /BUILDER_TIMEOUT_MS/));
// Grenzen: 10000 und 600000 sind gültig.

// proc.test.mjs
test("runNode vererbt keine Secrets", async () => {
  process.env.DATABASE_URL = "postgres://geheim"; process.env.PAYLOAD_SECRET = "x"; process.env.BUILDER_TOKEN = "y";
  const r = await runNode(["-e", "console.log(JSON.stringify(Object.keys(process.env)))"], { env: { CONTENT_DIR: "/c" } });
  const keys = JSON.parse(r.stdout);
  assert.ok(keys.includes("CONTENT_DIR") && keys.includes("PATH"));
  for (const k of ["DATABASE_URL", "PAYLOAD_SECRET", "BUILDER_TOKEN"]) assert.ok(!keys.includes(k));
});

// build.test.mjs
test("preview ist Symlink und wird atomar ersetzt", async () => {
  // zwei Preview-Läufe nacheinander: nach jedem ist lstat(preview).isSymbolicLink(),
  // readlink(preview) beginnt mit ".previews/", der Inhalt enthält den jeweils neuen __build.txt,
  // und in .previews/ liegen höchstens 2 Einträge (aktuell + vorheriger).
});
test("fehlgeschlagene Vorschau lässt alte Vorschau stehen", async () => {
  // Lauf 1 ok, Lauf 2 mit Eleventy-Fehler → readlink(preview) unverändert.
});
```

- [ ] **Step 2: Tests laufen lassen, FAIL erwarten**

Run: `cd builder && npm test`
Expected: FAIL (`parseTimeout` nicht exportiert; DATABASE_URL in Kind-Env; preview ist Ordner).

- [ ] **Step 3: Implementieren**

`parseTimeout`: nur Ganzzahl-Strings `^\d+$`, Bereich 10 000–600 000, sonst `Error("BUILDER_TIMEOUT_MS ungültig: …")`; `main` nutzt sie. `runNode`: Env aus Allowlist statt `...process.env`. Preview: in `.previews/<zeitstempel>-<rand>` bauen, bei Erfolg Symlink umbiegen (gleiche Hilfsfunktion wie Release-Umschaltung in `releases.mjs` wiederverwenden), danach alle `.previews/*` außer aktuell+vorherigem löschen. Ein vorhandener **Ordner** `preview/` aus Plan 1 wird beim ersten Lauf nach `.previews/legacy` verschoben.

- [ ] **Step 4: Tests grün**

Run: `cd builder && npm test` → alle PASS (bisher 50 + neue). `cd .. && npm test` → 135 PASS.

- [ ] **Step 5: Commit**

```bash
git add builder/
git commit -m "fix(builder): Timeout validieren, Kind-Env ohne Secrets, Vorschau atomar per Symlink"
```

---

### Task 2: Payload produktionsfähig (Carries a, b, c + serverURL/csrf)

**Files:**
- Modify: `cms/src/payload.config.ts`, `package.json`, `cms/package.json`, `builder/package.json` (engines)
- Create: `cms/src/migrations/` (generiert), `cms/src/lexical/features.ts`
- Test: `cms/tests/int/lexicalSubset.int.spec.ts`, `cms/tests/int/migrations.int.spec.ts`

**Interfaces:**
- Produces: `richTextFeatures` (exportiert aus `cms/src/lexical/features.ts`, genutzt von `payload.config.ts`); Env `PAYLOAD_PUBLIC_SERVER_URL` (Prod: `https://cms.kozlowski-it.de`).

- [ ] **Step 1: Failing tests**

```ts
// lexicalSubset.int.spec.ts
it('Editor bietet nur Features an, deren HTML in ALLOWED_TAGS liegt', () => {
  const keys = richTextFeatures.map((f) => f.key).sort()
  expect(keys).toEqual(['bold','heading','horizontalRule','inlineCode','italic','link','orderedList',
    'paragraph','subscript','superscript','unorderedList', /* + Toolbar-Features: */ 'toolbarFixed','toolbarInline'].sort())
})
it('Heading nur h2–h4', () => { /* HeadingFeature-Props enabledHeadingSizes == ['h2','h3','h4'] */ })
it('Export eines Dokuments mit jedem erlaubten Format besteht lib/richtext.js', async () => {
  // Lexical-JSON mit bold/italic/code/sub/sup/h2/h3/h4/hr/ul/ol/link → lexicalToHtml → sanitize aus lib/richtext.js wirft nicht
})

// migrations.int.spec.ts — gegen frisch angelegte leere Test-DB (CREATE DATABASE cms_migtest)
it('Start auf leerer DB mit NODE_ENV=production legt Schema per Migration an', async () => {
  // getPayload(config) → payload_migrations enthält Eintrag "…_initial"; pages/media/users-Tabellen existieren
})
```

- [ ] **Step 2: FAIL erwarten** — Run: `cd cms && npm test` → FAIL (Feature-Liste = Defaults inkl. underline/strikethrough/blockquote/upload/relationship/checklist/indent/align; keine Migrationen).

- [ ] **Step 3: Implementieren**
- `features.ts`: explizite Liste statt `defaultFeatures` (Payload-Exports `ParagraphFeature, BoldFeature, ItalicFeature, InlineCodeFeature, SubscriptFeature, SuperscriptFeature, HeadingFeature({ enabledHeadingSizes: ['h2','h3','h4'] }), HorizontalRuleFeature, UnorderedListFeature, OrderedListFeature, FixedToolbarFeature, InlineToolbarFeature`) + bestehender `LinkFeature` mit `nofollow`.
- Migration: `npm run payload migrate:create initial` (gegen leere DB), `db: postgresAdapter({ pool, push: process.env.NODE_ENV !== 'production', prodMigrations: migrations })`.
- `serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || undefined`, `csrf: [serverURL]` wenn gesetzt, `cors: []`.
- `engines.node`: `">=24.22.1 <25"` in allen drei `package.json`.

- [ ] **Step 4: grün** — `cd cms && npm test` → 100 + neue PASS; `npx tsc --noEmit` ok; `npm run equal` (Gleichheitstest) → 55 Dateien gleich.

- [ ] **Step 5: Commit** — `git commit -m "feat(cms): Prod-Migrationen, Rich-Text-Teilmenge, serverURL/csrf, Node-Untergrenze"`

---

### Task 3: Login über edge02-Header (Carry f)

**Files:**
- Create: `cms/src/auth/edgeHeader.ts`
- Modify: `cms/src/collections/Users.ts`
- Test: `cms/tests/int/edgeHeader.int.spec.ts`

**Interfaces:**
- Produces: `edgeHeaderStrategy: AuthStrategy` (`name: 'edge-header'`); Env `EDGE_SHARED_SECRET` (≥ 32 Zeichen, sonst Strategy inaktiv + Warnung im Log).

- [ ] **Step 1: Failing tests** (User `pk@kozlowski-it.de` angelegt, Secret `s`.repeat(40))

```ts
const H = (h: Record<string,string>) => new Headers(h)
it('richtiges Secret + Rolle + bekannter User → user', ...)            // email case-insensitiv
it('falsches Secret → null', ...)                                       // Review Focus 1
it('fehlendes Secret-Header → null', ...)
it('Secret ok, Gruppe fehlt (groups="foo,bar") → null', ...)            // Review Focus 2
it('Secret ok, Rolle ok, unbekannte E-Mail → null (kein Auto-Anlegen)', ...)
it('EDGE_SHARED_SECRET leer/zu kurz → Strategy liefert immer null', ...)
it('Gruppen-Header mit Leerzeichen "a, cms-editor" → erkannt', ...)
```

- [ ] **Step 2: FAIL** — `cd cms && npm test -- edgeHeader` → FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren** — Vergleich per `crypto.timingSafeEqual` auf gleich lange Buffer (Längenunterschied → null); Gruppen = Split an `,`, trim; User-Lookup `payload.find({ collection: 'users', where: { email: { equals: email.toLowerCase() } }, limit: 1, overrideAccess: true })`. `Users.auth = { strategies: [edgeHeaderStrategy] }` — lokale Passwort-Strategie bleibt aktiv (Break-Glass, nur intern erreichbar; edge02 sperrt die Passwort-Routen in Task 7).

- [ ] **Step 4: grün** — `cd cms && npm test` → PASS; bestehende Endpoint-Tests (`rollback`/`releases` ohne User → 401) weiter grün.

- [ ] **Step 5: Commit** — `git commit -m "feat(cms): Anmeldung über edge02-Header mit Edge-Secret und Rolle cms-editor"`

---

### Task 4: Image + Stack-Dateien im Repo

**Files:**
- Create: `deploy/cms/Dockerfile`, `deploy/cms/docker-compose.yml`, `deploy/cms/preview-nginx.conf`, `deploy/cms/resolv-clean.conf`, `deploy/cms/env.example`, `deploy/cms/backup.sh`, `deploy/cms/README.md`, `deploy/landing/docker-compose.yml`, `deploy/landing/nginx-default.conf`
- Test: `scripts/check-deploy.sh` (statische Prüfungen)

**Interfaces:**
- Consumes: Env-Namen aus Tasks 1–3 (`BUILDER_*`, `PAYLOAD_PUBLIC_SERVER_URL`, `EDGE_SHARED_SECRET`, `DATABASE_URL`, `PAYLOAD_SECRET`, `PREVIEW_URL=https://cms-vorschau.kozlowski-it.de`).
- Produces: Compose-Services `postgres`, `payload`, `builder`, `preview`; Volume-Pfade laut Tabelle; Landing mountet `/opt/docker-data/cms/work/releases:/srv/releases:ro`, nginx `root /srv/releases/current;`.

- [ ] **Step 1: Prüfskript schreiben** — `scripts/check-deploy.sh` schlägt fehl, wenn: `docker compose -f deploy/cms/docker-compose.yml config -q` scheitert; `postgres` an einem Nicht-`internal`-Netz hängt oder `ports:` hat; ein Service außer payload/preview/builder an `dmz_cms` hängt; `builder` keinen `stop_grace_period: 30s` hat; ein DMZ-Service ohne `resolv-clean.conf`-Mount ist; preview-nginx kein `X-Robots-Tag "noindex, nofollow"` und kein `frame-ancestors https://cms.kozlowski-it.de` setzt; Landing-Mount nicht `:ro` ist; `env.example` einen echten Wert statt Platzhalter enthält.
- [ ] **Step 2: Laufen lassen → FAIL** (Dateien fehlen).
- [ ] **Step 3: Dateien schreiben.**
  - Dockerfile: `node:24-bookworm-slim` auf Digest gepinnt (Version ≥ 24.22.1 beim Bau per `node --version` prüfen), `npm ci` für Root, `cms/`, `builder/`; `npm --prefix cms run build`; Nutzer `node` (uid 1000), kein root.
  - payload: `command: npm --prefix cms start`, `NODE_ENV=production`, Netze `dmz_cms` (`10.30.85.2`) + `cms_db`; Volume `media`.
  - builder: `command: node builder/src/server.mjs`, `BUILDER_HOST=0.0.0.0`, `BUILDER_WORKDIR=/srv/work`, `BUILDER_GIT_REPO=/srv/repo`, SSH-Deploy-Key read-only aus `/opt/docker-data/cms/ssh`, Netze `dmz_cms` (`10.30.85.4`) + `cms_db`, `stop_grace_period: 30s`, Volume `media` (gemeinsam mit payload, Carry g).
  - preview: `nginx:alpine` wie landing gehärtet (read_only, cap_drop ALL), `root /srv/work/preview`, `10.30.85.3`.
  - backup.sh: `pg_dump -Fc` + `tar` von `media/` nach `backup/` mit Datum, behält 14, Exit ≠ 0 bei Fehler; Cron-Zeile im README (`/etc/cron.d/cms-backup`, 03:15).
- [ ] **Step 4: Prüfskript grün** — `bash scripts/check-deploy.sh` → `OK`.
- [ ] **Step 5: Commit** — `git commit -m "feat(deploy): CMS-Image, Stack, Vorschau-nginx, Backup, Landing auf releases/current"`

---

### Task 5: Netz VLAN 85 (pf03 + docker01)

Infra-Task, keine Repo-Änderung außer `deploy/cms/README.md` (Abschnitt „Netz"). Vorlage: VLANs 80–82 (Memory `project_kozlowski_portal_cockpit_staffshell_2026-06-19.md`, Task 1).

- [ ] **Step 1: Vorab prüfen** — VLAN 85 auf pf03 unbenutzt (kein Interface `10.30.85.1`, kein VLAN-Tag 85 auf `vtnet3`); auf docker01 kein `ens20.85` und kein Netz `dmz_cms` (`docker network ls`). Sonst STOP und Pascal fragen. **Kein** SDN-Schritt: Trunk `dmz_vlan01` lässt 2–4094 durch.
- [ ] **Step 2: pf03** — VLAN 85 auf `vtnet3`, Interface `10.30.85.1/29` (pfSsh.php, `rc.filter_configure_sync`). Regeln in Reihenfolge: DNS→Firewall; `10.99.98.2 → 10.30.85.2:3000` und `→ 10.30.85.3:80` (auf `tun_wg1`/opt5); block RFC1918; Internet-Egress (für builder: GitHub-SSH 22 + HTTPS; payload: HTTPS).
- [ ] **Step 3: docker01** — `docker network create -d macvlan --subnet 10.30.85.0/29 --gateway 10.30.85.1 -o parent=ens20.85 dmz_cms`.
- [ ] **Step 4: Verifizieren** — Wegwerf-Container `--network dmz_cms --ip 10.30.85.6` mit resolv-clean: `curl -sI https://github.com` → 200/301; `curl -m3 http://10.0.36.2` → Timeout (RFC1918 geblockt); von edge02 `nc -zv 10.30.85.6 3000` nach kurzem `nc -l` im Container → nur für .2/.3 erlaubt (Gegenprobe .6 → Timeout). Container löschen.
- [ ] **Step 5: Memory** — Abschnitt „CMS-Infra" in `project_cms_website.md` (VLAN, IPs, Regeln).

---

### Task 6: Zitadel — Projekt, Rolle, App, Gruppen-Claim

Infra-Task. Zitadel-API: `http://10.30.76.2:8080` mit Header `Host: id.kozlowski-it.de`, Token `admin.pat` (sudo auf `srv01-ki-web01-pascal`, `/var/lib/zitadel/admin.pat`).

- [ ] **Step 1:** Projekt `kozlowski-cms` anlegen, Einstellung „Rollen bei Authentifizierung zusichern" an; Rolle `cms-editor`; User-Grant für `pk@kozlowski-it.de`.
- [ ] **Step 2:** OIDC-App `cms-edge`: Web, Code-Flow, Client-Secret (Basic), Redirect-URIs `https://cms.kozlowski-it.de/oauth2/callback` + `https://cms-vorschau.kozlowski-it.de/oauth2/callback`, Post-Logout `https://cms.kozlowski-it.de/`, „User-Info im ID-Token" an. Client-ID/Secret direkt auf edge02 in `/etc/oauth2-proxy/cms.cfg` (Task 7), nicht ins Repo/Log.
- [ ] **Step 3:** Action `cmsGroupsClaim` (Flow „Complement Token", Trigger Pre-Userinfo **und** Pre-Access-Token): setzt Claim `groups` = Array der Rollenschlüssel aus `ctx.v1.user.grants` für Projekt `kozlowski-cms` (leeres Array, wenn keine). Trigger-Bind per **POST** `/flows/2/trigger/<n>`.
- [ ] **Step 4: Verifizieren** — Token für pk per Device-/Browser-Flow holen ist Pascal-Schritt; maschinell prüfbar: Action-Liste enthält `cmsGroupsClaim`, App-Redirects exakt beide URIs, Grant existiert. Ende-zu-Ende-Beweis kommt in Task 7 Step 6.
- [ ] **Step 5: Memory** — IDs (Projekt, App, Action) notieren, keine Secrets.

---

### Task 7: edge02 — DNS, oauth2-proxy, vHosts

- [ ] **Step 1: DNS** — A-Records `cms` und `cms-vorschau` → `167.233.66.82` über Hetzner-Cloud-API (`/v1/zones/1401953/rrsets`, Token in acme.sh-account.conf auf cert01). Prüfen: `dig +short cms.kozlowski-it.de` → `167.233.66.82`.
- [ ] **Step 2: oauth2-proxy** — neueste 7.x-Release-Binary (Version + SHA256 aus GitHub-Release prüfen) nach `/usr/local/bin/oauth2-proxy`; Nutzer `oauth2proxy` (system, nologin); `cms.cfg` (600, root:oauth2proxy): `provider="oidc"`, `oidc_issuer_url="https://id.kozlowski-it.de"`, `http_address="127.0.0.1:4180"`, `reverse_proxy=true`, `set_xauthrequest=true`, `email_domains=["*"]`, `oidc_groups_claim="groups"`, `allowed_groups=["cms-editor"]`, `scope="openid email profile urn:zitadel:iam:org:project:id:<projekt-id>:aud"`, `cookie_secret` (32 Byte), `cookie_secure=true`, `cookie_samesite="lax"`, **kein** `cookie_domain`, kein `redirect_url` (aus Host), `whitelist_domains=["cms.kozlowski-it.de","cms-vorschau.kozlowski-it.de"]`, `skip_provider_button=true`. systemd-Unit mit `NoNewPrivileges`, `ProtectSystem=strict`, `Restart=on-failure`.
- [ ] **Step 3: vHosts** `cms.kozlowski-it.de.conf` + `cms-vorschau.kozlowski-it.de.conf` nach Muster `stats.kozlowski-it.de.conf` (Wildcard-Cert, kein http2): `location /oauth2/ { proxy_pass http://127.0.0.1:4180; … }`, `location = /oauth2/auth { internal; … }`, in `location /`: `auth_request /oauth2/auth; error_page 401 = /oauth2/start?rd=$scheme://$host$request_uri;`, `auth_request_set` für Email + Groups, `proxy_set_header X-Auth-Request-Email $email; X-Auth-Request-Groups $groups; X-Edge-Secret <EDGE_SHARED_SECRET>;` (Secret in `/etc/nginx/snippets/cms-edge-secret.conf`, 600). **Eingehende** `X-Auth-Request-*`/`X-Edge-Secret` vom Client werden immer überschrieben. Nur cms-Host: `location ~ ^/api/users/(login|forgot-password|reset-password|first-register|unlock)$ { return 403; }`, `location = /admin/create-first-user { return 403; }`, `client_max_body_size 20m`, WebSocket/Upgrade wie stats. Vorschau-Host: `proxy_pass http://10.30.85.3:80`.
- [ ] **Step 4:** `nginx -t && systemctl reload nginx`; `systemctl enable --now oauth2-proxy-cms`.
- [ ] **Step 5: Verifizieren (ohne Login)** — `curl -sI https://cms.kozlowski-it.de/admin` → 302 nach `id.kozlowski-it.de`; `curl -sI https://cms-vorschau.kozlowski-it.de/` → 302; `curl -s -o /dev/null -w '%{http_code}' -X POST https://cms.kozlowski-it.de/api/users/login` → 302 (Login vor allem) — Sperre zusätzlich nach Login in Task 9; `curl -sI https://kozlowski-it.de/` → unverändert 200, **kein** `Set-Cookie`.
- [ ] **Step 6: Pascal-Schritt** — Browser: `https://cms-vorschau.kozlowski-it.de/` → Zitadel-Login (YubiKey) → 502 (Backend fehlt noch) = Login + Rolle funktionieren. Mit Test-User ohne Rolle → 403 von oauth2-proxy.
- [ ] **Step 7: Memory** — vHosts, Unit, Pfade notieren.

---

### Task 8: Stack auf docker01 + Gleichheitstest gegen Live

- [ ] **Step 1:** Repo auf docker01 nach `/opt/docker/apps/cms/src` (git clone, Branch `feat/cms`), `docker build -f deploy/cms/Dockerfile -t kozlowski/pk-cms:$(git rev-parse --short HEAD) .`; `node --version` im Image ≥ 24.22.1.
- [ ] **Step 2:** Datenordner anlegen (Owner uid 1000, `backup`-Gruppe/setgid laut Konvention); `.env` aus `env.example` mit neuen Secrets (600); SSH-Deploy-Key erzeugen, **Pascal** trägt ihn als Deploy-Key mit Schreibrecht im GitHub-Repo `Kozlowski-IT/kozlowski-it.de` ein; `/srv/repo` = Klon dieses Repos, Branch `content-snapshot`.
- [ ] **Step 3:** `docker compose up -d postgres payload builder preview`; `docker compose logs payload` zeigt Migration `initial` angewendet, keine Fehler. Notfall-Admin: `docker compose exec payload npm --prefix cms run payload -- …` bzw. Seed legt `pk@kozlowski-it.de` an (Passwort zufällig, nur in Vault/`.env`-Notiz).
- [ ] **Step 4:** Seed: `docker compose exec builder npm --prefix cms run seed`; danach erster Publish über Builder-API von **innerhalb** des Stacks (`curl -H "Authorization: Bearer $BUILDER_TOKEN" -X POST http://10.30.85.4:4100/publish`) → `{ok:true, release:…}`.
- [ ] **Step 5: Gleichheits-Gate** — `node scripts/check-equal.mjs /opt/docker/apps/landing/pk-landing /opt/docker-data/cms/work/releases/current` → Exit 0, „55 Dateien gleich" (bzw. aktuelle Zahl). **Rot = STOP**, keine Umschaltung, Ursache klären.
- [ ] **Step 6: Review Focus 3** — Publish starten und währenddessen `docker compose restart builder`; danach `readlink releases/current` zeigt einen vollständigen Release (Check: `test -f releases/current/index.html` und `check-equal` gegen vorherigen Release exit 0), keine `.staging-*`-Reste nach Neustart.
- [ ] **Step 7: Code-Deploy-Ablauf (Spec §5)** — `deploy/cms/README.md` beschreibt und Task 8 führt einmal aus: neues Image bauen → `docker compose up -d payload builder` → `POST /publish` (wie Step 4) → Ergebnis `ok:true`. Ein roter Publish lässt die alte Seite live (Spec §7).
- [ ] **Step 8:** Backup-Cron aktivieren, `backup.sh` einmal von Hand → Dump + Medien-Tar vorhanden; **Restore-Test** in Wegwerf-Postgres-Container: `pg_restore` läuft ohne Fehler, `select count(*) from pages` = Anzahl Seiten.

---

### Task 9: Umschaltung Landing + E2E + Zugangstest

- [ ] **Step 1: Pascal-OK einholen** (Live-Umschaltung). Vorher: `cp -a /opt/docker/apps/landing /opt/docker/apps/landing.bak-pre-cms-$(date +%Y%m%d)`.
- [ ] **Step 2:** Landing-Compose + `nginx-default.conf` aus `deploy/landing/` übernehmen, `docker compose up -d landing`. Prüfen: `curl -s https://kozlowski-it.de/ | sha256sum` gleich `releases/current/index.html`; alle 20 Seiten-URLs 200; Security-Header unverändert (`curl -sI` vorher/nachher diffen).
- [ ] **Step 3: Rollback-Weg beweisen** — Landing-Backup-Compose zurück → live wieder alte Dateien → erneut umschalten. (Dokumentiert in `deploy/cms/README.md`.)
- [ ] **Step 4: E2E (Spec §8.3, Pascal im Browser)** — Text auf Startseite ändern → Vorschau zeigt ihn (< 30 s) → Veröffentlichen → `kozlowski-it.de` zeigt ihn → Release-Liste „wieder live schalten" auf vorherigen → alter Text live. Vom Handy wiederholen (Erfolgskriterium 1: < 2 Min).
- [ ] **Step 5: Zugangstest (Spec §8.4)** — ohne Login: cms/vorschau → 302; Login ohne Rolle → 403; mit Rolle, aber nicht in Payload-Users → Payload zeigt Login-Seite/kein Zugriff; von edge02 direkt `curl http://10.30.85.4:4100/releases` → Timeout (Firewall); von edge02 `curl -H 'X-Auth-Request-Email: pk@kozlowski-it.de' -H 'X-Auth-Request-Groups: cms-editor' http://10.30.85.2:3000/api/users/me` (ohne Secret) → `{"user":null}`; eingeloggt `POST /api/users/login` → 403.
- [ ] **Step 6: Abschluss** — alte rsync-Deploy-Mechanik in Memory als „ersetzt" markieren; Memory `project_cms_website.md` aktualisieren (live seit …, Pfade, Rollback); `feat/cms` → `master` mergen (Pascal-OK), pushen.

---

## Nicht in Plan 2 (Plan 3)

KI-Knopf „EN-Vorschlag", neue Bausteine `caseStudy`/`stats`/`logos`/`testimonials`, CMS für Kunden/Mandanten.
