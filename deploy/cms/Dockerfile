# kozlowski/pk-cms:<kurz-sha> — EIN Image für payload UND builder (Payload, Builder, Eleventy).
#
# Bau (auf docker01, Kontext = Repo-Root, .dockerignore hält .env/node_modules/… draußen):
#   docker build -f deploy/cms/Dockerfile -t kozlowski/pk-cms:$(git rev-parse --short HEAD) .
#
# Der Bau braucht weder DB noch Env: next build läuft ohne DATABASE_URL/PAYLOAD_SECRET;
# die Startsperre (Server-URL, Edge-Secret, …) sitzt in deploy/cms/payload-start.sh.
#
# Basis: Tag 24.22.1-bookworm-slim, gepinnt auf den Multi-Arch-Index-Digest
# (Docker Hub, abgefragt 2026-11-07). Beim Bau auf docker01 gegenprüfen:
#   docker buildx imagetools inspect node:24.22.1-bookworm-slim | grep Digest
FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c

# Carry b: Node-Untergrenze — Bau bricht ab, falls das Basis-Image älter als 24.22.1 ist
RUN node -e 'const m="24.22.1".split(".").map(Number),v=process.versions.node.split(".").map(Number);const ok=v[0]!==m[0]?v[0]>m[0]:v[1]!==m[1]?v[1]>m[1]:v[2]>=m[2];console.log("node "+process.versions.node+(ok?" ok":" < 24.22.1"));process.exit(ok?0:1)'

# git + ssh: Builder-Git-Abbild (Push des Branches content-snapshot per Deploy-Key)
# apt als root statt _apt: BuildKit legt /etc/resolv.conf im Build mit Modus 640 + ACL an
# (Default-ACLs auf dem Docker-Datenverzeichnis von docker01); _apt kann sie nicht lesen,
# DNS schlägt fehl. Pakete bleiben signaturgeprüft.
RUN apt-get -o APT::Sandbox::User=root update \
 && apt-get -o APT::Sandbox::User=root install -y --no-install-recommends git openssh-client ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1 \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

WORKDIR /app

# Abhängigkeiten zuerst (Layer-Cache). Dev-Abhängigkeiten bleiben drin: der Builder startet
# den TS-Export über tsx, `npm run seed` braucht die Payload-CLI, Eleventy liegt im Root.
# builder/ hat keine Abhängigkeiten und kein Lockfile → kein npm ci dort.
# cms/.npmrc (legacy-peer-deps) muss VOR npm ci da sein, sonst scheitert die Auflösung.
COPY package.json package-lock.json ./
RUN npm ci
COPY cms/package.json cms/package-lock.json cms/.npmrc cms/
RUN npm --prefix cms ci

COPY . .
# Sicherung gegen eine kaputte .dockerignore: keine Env-Datei im Image
RUN if find . -path ./node_modules -prune -o -path ./cms/node_modules -prune -o -name '.env*' -print | grep -q .; then \
      echo "Env-Datei im Build-Kontext — .dockerignore prüfen" >&2; exit 1; fi

RUN npm --prefix cms run build

# Laufzeit: Code gehört root (nicht beschreibbar für den Dienst-Nutzer); nur cms/.next
# (next start schreibt Cache/Trace) und der Medien-Mountpunkt gehören node (uid 1000).
RUN mkdir -p cms/media \
 && chown -R node:node cms/.next cms/media \
 && chmod 0755 deploy/cms/payload-start.sh

ENV NODE_ENV=production
USER node
EXPOSE 3000 4100
CMD ["sh", "/app/deploy/cms/payload-start.sh", "npm", "--prefix", "cms", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
