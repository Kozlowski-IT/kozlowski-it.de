# CMS-Stack auf docker01

Stack `/opt/docker/apps/cms/` (diese Dateien), Daten `/opt/docker-data/cms/{pgdata,media,work,repo,snapshot.git,backup}`.
Netze: `dmz_cms` (macvlan, parent `ens20.85`, existiert schon), `cms_db` (bridge, `internal`, legt Compose an); `cms_db` hat festes Subnetz `172.31.85.0/28` (postgres `172.31.85.2`, dynamisch nur `.8/29`) — `payload`/`builder` lösen `postgres` über die eigene `hosts`-Datei (Bind-Mount auf `/etc/hosts`) auf, weil `resolv-clean.conf` Dockers DNS ersetzt.

| Dienst | Adresse | Aufgabe |
|---|---|---|
| postgres | nur `cms_db` | Postgres 18, keine Ports |
| payload | `10.30.85.2:3000` | Admin `cms.kozlowski-it.de` (hinter edge02 + oauth2-proxy) |
| preview | `10.30.85.3:80` | Vorschau `cms-vorschau.kozlowski-it.de`, liest `work/` read-only |
| builder | `10.30.85.4:4100` | Export → Eleventy → `work/releases/current`; nur payload spricht ihn an |

Statisch prüfen (auch ohne Docker-Daemon): `npm run check:deploy` im Repo-Root.

## Image bauen

Ein Image für payload **und** builder. Kontext = Repo-Root; `.dockerignore` hält jede `.env`,
`node_modules`, `cms/media`, `.git` u. a. draußen. Der Bau braucht keine DB und keine Env.

```sh
cd <repo-klon> && git checkout <stand>
docker buildx imagetools inspect node:24.22.1-bookworm-slim | grep -m1 Digest   # = Digest in deploy/cms/Dockerfile?
docker build -f deploy/cms/Dockerfile -t kozlowski/pk-cms:$(git rev-parse --short HEAD) .
```

Basis `node:24.22.1-bookworm-slim` ist auf den Index-Digest gepinnt (abgefragt 2026-11-07 auf Docker Hub);
zusätzlich bricht ein `RUN node -e …` den Bau ab, wenn Node < 24.22.1 ist. Neue Node-Version:
Tag + Digest im Dockerfile gemeinsam ändern. Postgres analog (`postgres:18.6@sha256:…` in der Compose-Datei).

## Erstinstallation

```sh
install -d -m 755 /opt/docker/apps/cms
cp deploy/cms/{docker-compose.yml,preview-nginx.conf,resolv-clean.conf,hosts,backup.sh,snapshot-log.sh} /opt/docker/apps/cms/
# hosts: eigene /etc/hosts, weil Dockers generierte Datei auf docker01 (Default-ACL auf data-root) für uid 1000 unlesbar ist
install -m 600 deploy/cms/env.example /opt/docker/apps/cms/.env   # dann Werte setzen: openssl rand -hex 32

install -d -m 700 /opt/docker-data/cms/pgdata /opt/docker-data/cms/backup        # pgdata chownt der postgres-Entrypoint
install -d -m 755 -o 1000 -g 1000 /opt/docker-data/cms/{media,work,repo}
# Git-Abbild: lokales Bare-Repo als origin (GitHub-Org verbietet Deploy-Keys; liegt im PBS-Backup-Set)
install -d -o 1000 -g 1000 /opt/docker-data/cms/snapshot.git && sudo -u '#1000' git init -q --bare -b content-snapshot /opt/docker-data/cms/snapshot.git
sudo -u '#1000' git -C /opt/docker-data/cms/repo init -q && sudo -u '#1000' git -C /opt/docker-data/cms/repo remote add origin /srv/snapshot.git
```

**Git auf dem Host nur gehärtet** (`snapshot.git/` und `repo/`): Der builder (uid 1000 = Host-Nutzer) kann dort
`config` und `hooks/` schreiben; ein normales `git log` als uid 1000 würde ein untergeschobenes `core.pager`,
`core.fsmonitor`, einen `diff.*.textconv`-Treiber oder Hook auf dem Host ausführen. Deshalb jedes Host-Git-Kommando für diese beiden Repos so:

```sh
git --no-pager -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat -C /opt/docker-data/cms/snapshot.git log --no-ext-diff --no-textconv --oneline content-snapshot
```

Kurzform: `deploy/cms/snapshot-log.sh [git-log-Argumente …]` (macht genau das, Standard `--oneline -20 content-snapshot`).

Payload und builder laufen als uid 1000 (`node`); `media/`, `work/`, `repo/`, `snapshot.git/` müssen ihm gehören.
Die `.env` (mode 600) enthält `CMS_IMAGE_TAG`, `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, `EDGE_SHARED_SECRET`,
`BUILDER_TOKEN` — nie ins Repo. Der gleiche `EDGE_SHARED_SECRET` steht in der edge02-nginx-Config.

```sh
cd /opt/docker/apps/cms
docker compose config -q                    # Interpolation/Schema
docker compose up -d postgres
docker compose up -d payload                # wendet die Migrationen an (NODE_ENV=production → prodMigrations, kein push)
docker compose run --rm builder npm run seed   # einmalig: Bestandsinhalte nach Payload (cwd ist cms/)
docker compose up -d builder preview
```

**Startsperre payload:** `deploy/cms/payload-start.sh` (im Image) verweigert den Start ohne
`PAYLOAD_PUBLIC_SERVER_URL=https://…`, ohne `EDGE_SHARED_SECRET`/`PAYLOAD_SECRET` (je ≥ 32 Zeichen),
ohne `DATABASE_URL` oder wenn `NODE_ENV` nicht `production` ist (sonst würde Payload das Schema pushen).

**builder-Start:** `node --import tsx ../builder/src/server.mjs` mit `working_dir: /app/cms` —
das Export-Modul `cms/src/export/builderExport.ts` ist TypeScript mit `@/`-Pfaden, die tsx aus
`cms/tsconfig.json` auflöst. `stop_grace_period: 30s`: ein laufender Publish darf zu Ende laufen.

## Vorschau / Landing

- preview-nginx lässt nur edge02 (`allow 10.99.98.2; deny all;`) zu und mountet den **ganzen** `work/` read-only (`preview` → `.previews/<id>` ist ein relativer
  Symlink), `root /srv/work/preview`, `X-Robots-Tag: noindex, nofollow`, `frame-ancestors https://cms.kozlowski-it.de`.
- Landing (`deploy/landing/`) mountet `work/releases` read-only, `root /srv/releases/current` —
  nie den Symlink `current` selbst mounten. Umschaltung erst nach grünem Gleichheitstest (eigener Task).

## Backup

`backup.sh` liegt im Stack-Ordner: `pg_dump -Fc` + `tar` von `media/` nach `/opt/docker-data/cms/backup/`
mit Datum, behält je 14, Exit ≠ 0 bei Fehler. Cron-Datei `/etc/cron.d/cms-backup`:

```
15 3 * * * root /opt/docker/apps/cms/backup.sh >>/var/log/cms-backup.log 2>&1
```

Wiederherstellen: `docker compose exec -T postgres pg_restore -U cms -d cms --clean --if-exists < backup/cms-db-<datum>.dump`,
Medien: `tar -C /opt/docker-data/cms -xzf backup/cms-media-<datum>.tar.gz`.
