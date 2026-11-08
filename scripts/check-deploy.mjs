#!/usr/bin/env node
// Statische Prüfung der Deploy-Dateien (CMS-Stack + Landing), läuft OHNE Docker (dev02).
//
//   npm run check:deploy        → "OK" + Exit 0, sonst Liste der Verstöße + Exit 1
//
// Ist `docker` vorhanden (docker01), läuft zusätzlich `docker compose config -q` mit
// env.example als Env-Datei; ohne Docker wird das ausdrücklich als ÜBERSPRUNGEN gemeldet
// (kein stilles Grün — die echte Compose-Validierung passiert auf docker01).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CMS = "deploy/cms";
const LANDING = "deploy/landing";

// Festgelegte Werte (Plan 2, Tabelle „Festgelegte Werte“)
const IPS = { payload: "10.30.85.2", preview: "10.30.85.3", builder: "10.30.85.4" };
const DMZ_NET = "dmz_cms";
const DB_NET = "cms_db";
const DB_SUBNET = "172.31.85.0/28";
const DB_IP_RANGE = "172.31.85.8/29";
const PG_IP = "172.31.85.2";
const DATA = "/opt/docker-data/cms";
const SERVER_URL = "https://cms.kozlowski-it.de";
const PREVIEW_URL = "https://cms-vorschau.kozlowski-it.de";
const BUILDER_URL = `http://${IPS.builder}:4100`;
const MIN_NODE = "24.22.1";
const START_WRAPPER = "/app/deploy/cms/payload-start.sh";
// Werte, die nie im Klartext in der Compose-Datei stehen dürfen (nur ${VAR}-Verweise)
const SECRET_KEYS = ["PAYLOAD_SECRET", "EDGE_SHARED_SECRET", "BUILDER_TOKEN", "POSTGRES_PASSWORD"];

const failures = [];
const fail = (msg) => failures.push(msg);
const check = (cond, msg) => {
  if (!cond) fail(msg);
  return !!cond;
};

function read(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    fail(`${rel} fehlt`);
    return null;
  }
  return readFileSync(p, "utf8");
}

function readYaml(rel) {
  const src = read(rel);
  if (src === null) return null;
  try {
    return parse(src, { merge: true }); // Compose nutzt YAML-Merge-Keys (<<: *anker)
  } catch (err) {
    fail(`${rel}: kein gültiges YAML (${err.message.split("\n")[0]})`);
    return null;
  }
}

/** Compose-environment (Mapping oder Liste) → Objekt */
function envOf(svc) {
  const e = svc?.environment;
  if (!e) return {};
  if (Array.isArray(e)) {
    return Object.fromEntries(
      e.map((l) => {
        const i = String(l).indexOf("=");
        return i < 0 ? [l, undefined] : [l.slice(0, i), l.slice(i + 1)];
      }),
    );
  }
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v == null ? v : String(v)]));
}

/** Compose-volumes (Kurzform) → [{ src, dst, ro }] */
function volumesOf(svc) {
  return (svc?.volumes ?? []).map((v) => {
    if (typeof v === "object") return { src: v.source, dst: v.target, ro: !!v.read_only };
    const [src, dst, mode = ""] = String(v).split(":");
    return { src, dst, ro: mode.split(",").includes("ro") };
  });
}

/** Compose-networks (Liste oder Mapping) → Map name → config */
function networksOf(svc) {
  const n = svc?.networks;
  if (!n) return new Map();
  if (Array.isArray(n)) return new Map(n.map((k) => [k, {}]));
  return new Map(Object.entries(n).map(([k, v]) => [k, v ?? {}]));
}

const cmdOf = (svc) => (Array.isArray(svc?.command) ? svc.command.map(String) : svc?.command ? String(svc.command).split(/\s+/) : []);

const hasMount = (svc, src, dst, ro) => volumesOf(svc).some((m) => m.src === src && m.dst === dst && (ro === undefined || m.ro === ro));

/** nginx-Container wie landing gehärtet: read_only, cap_drop ALL + genau 4 cap_add, tmpfs für Laufzeitordner */
const NGINX_CAPS = ["CHOWN", "NET_BIND_SERVICE", "SETGID", "SETUID"];
const NGINX_TMPFS = ["/tmp", "/var/cache/nginx", "/var/run"];
function checkNginxHardening(label, svc) {
  check(/^nginx:alpine/.test(svc.image ?? ""), `${label}: Image nginx:alpine erwartet`);
  check(svc.read_only === true, `${label}: read_only: true fehlt`);
  check((svc.security_opt ?? []).includes("no-new-privileges:true"), `${label}: security_opt no-new-privileges:true fehlt`);
  check(svc.restart === "unless-stopped", `${label}: restart: unless-stopped fehlt`);
  check(JSON.stringify(svc.cap_drop ?? []) === JSON.stringify(["ALL"]), `${label}: cap_drop muss genau [ALL] sein`);
  const caps = [...(svc.cap_add ?? [])].map(String).sort();
  check(JSON.stringify(caps) === JSON.stringify(NGINX_CAPS), `${label}: cap_add muss genau ${NGINX_CAPS.join("/")} sein (ist: ${caps.join("/") || "—"})`);
  const tmpfs = [svc.tmpfs ?? []].flat().map((t) => String(t).split(":")[0]).sort();
  check(JSON.stringify(tmpfs) === JSON.stringify(NGINX_TMPFS), `${label}: tmpfs muss genau ${NGINX_TMPFS.join(" ")} sein (ist: ${tmpfs.join(" ") || "—"})`);
}

const isSecretRef = (v) => typeof v === "string" && /^\$\{[A-Z0-9_]+(:\?[^}]*)?\}$/.test(v);

const verGte = (a, b) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i];
  return true;
};

// ------------------------------------------------------------------ CMS-Stack
const compose = readYaml(`${CMS}/docker-compose.yml`);
const services = compose?.services ?? {};
if (compose) {
  const names = Object.keys(services).sort();
  check(
    JSON.stringify(names) === JSON.stringify(["builder", "payload", "postgres", "preview"]),
    `cms-Compose: Dienste müssen genau postgres/payload/builder/preview sein (ist: ${names.join(", ")})`,
  );

  // Netze
  const nets = compose.networks ?? {};
  check(nets[DMZ_NET]?.external === true, `cms-Compose: Netz ${DMZ_NET} muss external: true sein (existiert auf docker01)`);
  check(nets[DB_NET]?.internal === true, `cms-Compose: Netz ${DB_NET} muss internal: true sein`);
  check(nets[DB_NET]?.name === DB_NET, `cms-Compose: Netz ${DB_NET} braucht name: ${DB_NET} (sonst Präfix des Projekts)`);

  const ipam = (nets[DB_NET]?.ipam?.config ?? [])[0] ?? {};
  check(ipam.subnet === DB_SUBNET, `cms-Compose: Netz ${DB_NET} braucht ipam subnet ${DB_SUBNET} (ist: ${ipam.subnet ?? "—"})`);
  check(ipam.ip_range === DB_IP_RANGE, `cms-Compose: Netz ${DB_NET} braucht ipam ip_range ${DB_IP_RANGE}, damit dynamische IPs nicht mit statischen kollidieren (ist: ${ipam.ip_range ?? "—"})`);

  for (const [name, svc] of Object.entries(services)) {
    const sn = networksOf(svc);
    // resolv-clean ersetzt Dockers DNS; Dockers eigene /etc/hosts ist auf docker01 für uid 1000 unlesbar
    // → auf cms_db muss die eigene ./hosts als /etc/hosts gemountet sein (postgres → feste IP)
    if (sn.has(DB_NET) && hasMount(svc, "./resolv-clean.conf", "/etc/resolv.conf")) {
      check(
        hasMount(svc, "./hosts", "/etc/hosts", true),
        `${name}: resolv-clean.conf ersetzt Dockers DNS → ./hosts:/etc/hosts:ro fehlt (Dockers eigene hosts ist für uid 1000 unlesbar, extra_hosts hilft nicht)`,
      );
    }
    check(!svc.extra_hosts, `${name}: kein extra_hosts (Dockers generierte /etc/hosts ist auf docker01 unlesbar) — ./hosts mounten`);
    check(!svc.ports, `${name}: keine ports: (Zugriff nur über macvlan-IP bzw. internes Netz)`);
    check(!svc.network_mode, `${name}: kein network_mode`);
    check(!svc.privileged, `${name}: nicht privileged`);
    check((svc.security_opt ?? []).includes("no-new-privileges:true"), `${name}: security_opt no-new-privileges:true fehlt`);
    check((svc.cap_drop ?? []).includes("ALL"), `${name}: cap_drop: [ALL] fehlt`);
    check(svc.restart === "unless-stopped", `${name}: restart: unless-stopped fehlt`);
    for (const n of sn.keys()) check(n === DMZ_NET || n === DB_NET, `${name}: unbekanntes Netz ${n}`);
    if (sn.has(DMZ_NET)) {
      check(name in IPS, `${name}: hängt an ${DMZ_NET}, erlaubt sind nur payload/preview/builder`);
      if (name in IPS) {
        check(sn.get(DMZ_NET).ipv4_address === IPS[name], `${name}: ipv4_address in ${DMZ_NET} muss ${IPS[name]} sein`);
      }
      check(
        hasMount(svc, "./resolv-clean.conf", "/etc/resolv.conf", true),
        `${name}: DMZ-Dienst ohne ./resolv-clean.conf:/etc/resolv.conf:ro`,
      );
    }
    // Secrets nie im Klartext
    const env = envOf(svc);
    for (const k of SECRET_KEYS) {
      if (k in env) check(isSecretRef(env[k]), `${name}: ${k} muss als \${${k}:?…} aus .env kommen, nicht im Klartext`);
    }
    if (env.DATABASE_URL !== undefined) {
      check(
        /\$\{POSTGRES_PASSWORD(:\?[^}]*)?\}/.test(env.DATABASE_URL) && /@postgres:5432\//.test(env.DATABASE_URL),
        `${name}: DATABASE_URL muss Passwort per \${POSTGRES_PASSWORD} und Host postgres:5432 nutzen`,
      );
    }
  }
  for (const name of Object.keys(IPS)) {
    check(networksOf(services[name]).has(DMZ_NET), `${name}: muss an ${DMZ_NET} hängen`);
  }

  // postgres
  const pg = services.postgres;
  if (check(pg, "postgres-Dienst fehlt")) {
    const pn = [...networksOf(pg).keys()];
    check(JSON.stringify(pn) === JSON.stringify([DB_NET]), `postgres: darf nur an ${DB_NET} (internal) hängen (ist: ${pn.join(", ") || "Default-Netz"})`);
    check(/^postgres:18(\.\d+)?(@sha256:[0-9a-f]{64})?$/.test(pg.image ?? ""), `postgres: Image muss postgres:18[.x][@sha256:…] sein (ist: ${pg.image})`);
    check(hasMount(pg, `${DATA}/pgdata`, "/var/lib/postgresql", false), `postgres: Daten-Mount ${DATA}/pgdata:/var/lib/postgresql fehlt`);
    check(networksOf(pg).get(DB_NET)?.ipv4_address === PG_IP, `postgres: ipv4_address in ${DB_NET} muss ${PG_IP} sein`);
    check(pg.healthcheck?.test, "postgres: healthcheck fehlt (payload/builder warten darauf)");
  }

  // payload
  const pl = services.payload;
  if (check(pl, "payload-Dienst fehlt")) {
    const env = envOf(pl);
    check(env.NODE_ENV === "production", "payload: NODE_ENV=production fehlt (sonst push statt Migrationen)");
    check(env.PAYLOAD_PUBLIC_SERVER_URL === SERVER_URL, `payload: PAYLOAD_PUBLIC_SERVER_URL=${SERVER_URL} fehlt`);
    check(env.PREVIEW_URL === PREVIEW_URL, `payload: PREVIEW_URL=${PREVIEW_URL} fehlt`);
    check(env.BUILDER_URL === BUILDER_URL, `payload: BUILDER_URL=${BUILDER_URL} fehlt`);
    for (const k of ["DATABASE_URL", "PAYLOAD_SECRET", "EDGE_SHARED_SECRET", "BUILDER_TOKEN"]) check(env[k], `payload: ${k} fehlt`);
    const cmd = cmdOf(pl);
    check(
      cmd[0] === "sh" && cmd[1] === START_WRAPPER && cmd.slice(2, 5).join(" ") === "npm --prefix cms" && cmd[5] === "start",
      `payload: command muss [sh, ${START_WRAPPER}, npm, --prefix, cms, start, …] sein (Startsperre ohne Server-URL/Edge-Secret)`,
    );
    check(String(pl.user) === "1000:1000", "payload: user: \"1000:1000\" fehlt (kein root)");
    check(networksOf(pl).has(DB_NET), `payload: muss an ${DB_NET} hängen`);
    check(hasMount(pl, `${DATA}/media`, "/app/cms/media", false), `payload: Medien-Mount ${DATA}/media:/app/cms/media (rw) fehlt`);
  }

  // kein Dienst mountet Schlüsselmaterial (Least Privilege; Abbild-Remote ist lokal)
  for (const [n, sv] of Object.entries(services)) check(!volumesOf(sv).some((m) => m.src === `${DATA}/ssh`), `${n}: darf ${DATA}/ssh nicht mounten (kein SSH-Remote)`);

  // builder
  const bl = services.builder;
  if (check(bl, "builder-Dienst fehlt")) {
    const env = envOf(bl);
    check(String(bl.stop_grace_period) === "30s", "builder: stop_grace_period: 30s fehlt");
    check(env.BUILDER_HOST === "0.0.0.0", "builder: BUILDER_HOST=0.0.0.0 fehlt");
    check(env.BUILDER_PORT === "4100", "builder: BUILDER_PORT=4100 fehlt");
    check(env.BUILDER_WORKDIR === "/srv/work", "builder: BUILDER_WORKDIR=/srv/work fehlt");
    check(env.BUILDER_GIT_REPO === "/srv/repo", "builder: BUILDER_GIT_REPO=/srv/repo fehlt");
    check(env.BUILDER_SITE_ROOT === "/app", "builder: BUILDER_SITE_ROOT=/app fehlt");
    check(env.BUILDER_EXPORT_MODULE, "builder: BUILDER_EXPORT_MODULE fehlt");
    // Defense in depth, KEINE echte Isolation: der builder hat PAYLOAD_SECRET und eine schreibende DATABASE_URL —
    // ein kompromittierter builder ist ein kompromittiertes CMS, mit oder ohne Edge-Secret. Die Regel schadet nicht
    // und hält den Header-Weg zu; echte Trennung erst mit Export über eine Nur-Lese-DB-Rolle (s. README).
    check(!("EDGE_SHARED_SECRET" in env), "builder: soll EDGE_SHARED_SECRET nicht kennen (Defense in depth)");
    for (const k of ["DATABASE_URL", "PAYLOAD_SECRET", "BUILDER_TOKEN"]) check(env[k], `builder: ${k} fehlt`);
    check(String(bl.user) === "1000:1000", "builder: user: \"1000:1000\" fehlt (kein root)");
    check(cmdOf(bl).includes("../builder/src/server.mjs") || cmdOf(bl).includes("/app/builder/src/server.mjs"), "builder: command startet builder/src/server.mjs nicht");
    check(networksOf(bl).has(DB_NET), `builder: muss an ${DB_NET} hängen (Export liest die DB)`);
    check(hasMount(bl, `${DATA}/work`, "/srv/work", false), `builder: ${DATA}/work:/srv/work (rw) fehlt`);
    check(hasMount(bl, `${DATA}/repo`, "/srv/repo", false), `builder: ${DATA}/repo:/srv/repo (rw) fehlt`);
    check(hasMount(bl, `${DATA}/snapshot.git`, "/srv/snapshot.git", false), `builder: ${DATA}/snapshot.git:/srv/snapshot.git (rw, lokales Bare-Repo als Abbild-Remote) fehlt`);
    check(!("GIT_SSH_COMMAND" in env), "builder: GIT_SSH_COMMAND darf nicht gesetzt sein (kein SSH-Remote mehr)");
    // Mutation-Probe: ohne den Mount muss die Regel anschlagen; mit einem ssh-Mount muss die ssh-Regel anschlagen
    const noSnap = { volumes: volumesOf(bl).filter((m) => m.dst !== "/srv/snapshot.git").map((m) => `${m.src}:${m.dst}`) };
    check(!hasMount(noSnap, `${DATA}/snapshot.git`, "/srv/snapshot.git", false), "builder: Mutation-Probe — Regel erkennt fehlenden snapshot.git-Mount nicht");
    const withSsh = { volumes: [...(bl.volumes ?? []), `${DATA}/ssh:/home/node/.ssh:ro`] };
    check(volumesOf(withSsh).some((m) => m.src === `${DATA}/ssh`), "builder: Mutation-Probe — ssh-Mount-Regel erkennt Mount nicht");
    check(volumesOf(bl).some((m) => m.src === `${DATA}/media` && m.dst === "/app/cms/media"), `builder: Medien-Mount ${DATA}/media:/app/cms/media fehlt`);
    // gleiches Image wie payload (eine Image-Basis für beide)
    check(bl.image && bl.image === services.payload?.image, "builder: muss dasselbe Image wie payload nutzen");
  }

  // preview
  const pv = services.preview;
  if (check(pv, "preview-Dienst fehlt")) {
    checkNginxHardening("preview", pv);
    check(hasMount(pv, `${DATA}/work`, "/srv/work", true), `preview: ganzen workDir ${DATA}/work:/srv/work:ro mounten (preview → .previews/<id>)`);
    check(hasMount(pv, "./preview-nginx.conf", "/etc/nginx/conf.d/default.conf", true), "preview: ./preview-nginx.conf:/etc/nginx/conf.d/default.conf:ro fehlt");
    for (const m of volumesOf(pv)) check(m.ro, `preview: Mount ${m.src} muss :ro sein`);
    check([...networksOf(pv).keys()].join() === DMZ_NET, `preview: nur an ${DMZ_NET}`);
  }

  // Image-Tag aus .env, nicht fest
  for (const n of ["payload", "builder"]) {
    check(/^kozlowski\/pk-cms:\$\{CMS_IMAGE_TAG(:\?[^}]*)?\}$/.test(services[n]?.image ?? ""), `${n}: image muss kozlowski/pk-cms:\${CMS_IMAGE_TAG:?…} sein`);
  }
}

// Start-Wrapper
const wrapper = read(`${CMS}/payload-start.sh`);
if (wrapper !== null) {
  check(/PAYLOAD_PUBLIC_SERVER_URL/.test(wrapper) && /EDGE_SHARED_SECRET/.test(wrapper), "payload-start.sh: prüft PAYLOAD_PUBLIC_SERVER_URL/EDGE_SHARED_SECRET nicht");
  check(/exec "\$@"/.test(wrapper), "payload-start.sh: muss am Ende exec \"$@\" ausführen");
}

// resolv-clean.conf
const resolv = read(`${CMS}/resolv-clean.conf`);
if (resolv !== null) {
  const lines = resolv.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  check(JSON.stringify(lines) === JSON.stringify(["nameserver 9.9.9.9"]), "resolv-clean.conf: genau `nameserver 9.9.9.9` (kein search/ndots)");
}

// hosts: postgres → feste IP aus der Compose-Datei (kein hart kodiertes Duplikat), plus localhost
const hostsSrc = read(`${CMS}/hosts`);
if (hostsSrc !== null) {
  const entries = hostsSrc.split("\n").map((l) => l.replace(/#.*/, "").trim().split(/\s+/).filter(Boolean)).filter((f) => f.length >= 2);
  const pgIp = networksOf(services.postgres).get(DB_NET)?.ipv4_address;
  if (check(pgIp, `hosts: postgres hat in ${DB_NET} keine ipv4_address in der Compose-Datei`)) {
    const pgLines = entries.filter((f) => f.slice(1).includes("postgres"));
    check(pgLines.length === 1 && pgLines[0][0] === pgIp, `hosts: postgres muss auf ${pgIp} (ipv4_address aus der Compose-Datei) zeigen (ist: ${pgLines.map((f) => f[0]).join(", ") || "—"})`);
  }
  check(entries.some((f) => f[0] === "127.0.0.1" && f.slice(1).includes("localhost")), "hosts: Zeile `127.0.0.1 localhost` fehlt");
}

// preview-nginx.conf
const pconf = read(`${CMS}/preview-nginx.conf`);
if (pconf !== null) {
  check(/add_header\s+X-Robots-Tag\s+"noindex, nofollow"\s+always\s*;/.test(pconf), 'preview-nginx.conf: add_header X-Robots-Tag "noindex, nofollow" always; fehlt');
  check(/add_header\s+Content-Security-Policy\s+"[^"]*frame-ancestors https:\/\/cms\.kozlowski-it\.de[^"]*"\s+always\s*;/.test(pconf), "preview-nginx.conf: CSP frame-ancestors https://cms.kozlowski-it.de fehlt");
  check(/^\s*root\s+\/srv\/work\/preview\s*;/m.test(pconf), "preview-nginx.conf: root /srv/work/preview; fehlt");
  check(!/X-Frame-Options/i.test(pconf), "preview-nginx.conf: kein X-Frame-Options (bricht die Live-Vorschau im Admin)");
  // add_header in einem location-Block würde die server-Header still verwerfen (nginx-Vererbung)
  check(!/location[^{]*\{[^}]*add_header/s.test(pconf), "preview-nginx.conf: kein add_header in location-Blöcken (verdrängt noindex/CSP)");
  // R8: eigenes Tor — nur edge02 (WG-IP) darf lesen, sonst sähe jeder Container in VLAN 85 Entwürfe.
  // Auf server-Ebene, genau diese zwei Regeln in dieser Reihenfolge; keine allow/deny in location-Blöcken.
  const noComments = pconf.replace(/#[^\n]*/g, "");
  const serverLevel = noComments.replace(/location[^{]*\{[^}]*\}/gs, "");
  const acl = [...serverLevel.matchAll(/^\s*(allow|deny)\s+([^;]+);/gm)].map((m) => `${m[1]} ${m[2].trim()}`);
  check(
    JSON.stringify(acl) === JSON.stringify(["allow 10.99.98.2", "deny all"]),
    `preview-nginx.conf: auf server-Ebene genau "allow 10.99.98.2; deny all;" (ist: ${acl.join("; ") || "—"})`,
  );
  check(!/location[^{]*\{[^}]*\b(allow|deny)\b/s.test(noComments), "preview-nginx.conf: keine allow/deny in location-Blöcken (würden das Tor überschreiben)");
}

// env.example: nur Platzhalter, deckt alle ${VAR} der Compose-Datei ab
const envEx = read(`${CMS}/env.example`);
if (envEx !== null) {
  const keys = new Set();
  for (const [i, raw] of envEx.split("\n").entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!check(m, `env.example Zeile ${i + 1}: kein KEY=VALUE`)) continue;
    keys.add(m[1]);
    check(/^(change-me[a-z0-9-]*|<[^<>]+>)$/.test(m[2]), `env.example: ${m[1]} hat einen echten Wert statt Platzhalter (change-me / <…>)`);
  }
  const composeSrc = read(`${CMS}/docker-compose.yml`) ?? "";
  for (const [, v] of composeSrc.matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)) check(keys.has(v), `env.example: ${v} fehlt (wird in docker-compose.yml benutzt)`);
}

// Dockerfile
const df = read(`${CMS}/Dockerfile`);
if (df !== null) {
  const from = /^FROM\s+node:(\d+\.\d+\.\d+)-bookworm-slim(@sha256:[0-9a-f]{64})?(\s|$)/m.exec(df);
  if (check(from, "Dockerfile: FROM node:<x.y.z>-bookworm-slim[@sha256:…] fehlt")) {
    check(verGte(from[1], MIN_NODE), `Dockerfile: Node ${from[1]} < ${MIN_NODE}`);
  }
  check(new RegExp(`RUN\\s+node\\s+-e[^\\n]*${MIN_NODE.replaceAll(".", "\\.")}`).test(df), `Dockerfile: Build-Prüfung node >= ${MIN_NODE} (RUN node -e …) fehlt`);
  check(/npm\s+ci\b/.test(df) && /npm\s+--prefix\s+cms\s+ci\b/.test(df), "Dockerfile: npm ci für Root und cms/ fehlt");
  check(/npm\s+--prefix\s+cms\s+run\s+build\b/.test(df), "Dockerfile: npm --prefix cms run build fehlt");
  const npmrcAt = df.search(/^COPY\b[^\n]*cms\/\.npmrc/m);
  const cmsCiAt = df.search(/npm\s+--prefix\s+cms\s+ci\b/);
  check(npmrcAt >= 0 && npmrcAt < cmsCiAt, "Dockerfile: cms/.npmrc (legacy-peer-deps) muss vor npm --prefix cms ci kopiert werden");
  const users = [...df.matchAll(/^USER\s+(\S+)/gm)].map((m) => m[1]);
  check(users.length && ["node", "1000", "1000:1000"].includes(users.at(-1)), "Dockerfile: letzter USER muss node (uid 1000) sein");
  check(!/^(COPY|ADD)\b[^\n]*\.env/m.test(df), "Dockerfile: COPY/ADD einer .env (Secrets nie ins Image)");
  check(!/^ARG\s+(PAYLOAD_SECRET|DATABASE_URL|EDGE_SHARED_SECRET|BUILDER_TOKEN)/m.test(df), "Dockerfile: Secrets als Build-ARG");
}

// .dockerignore
const di = read(".dockerignore");
if (di !== null) {
  const pats = new Set(di.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  for (const p of ["**/.env", "**/.env.*", "**/node_modules", ".git", "cms/.next", "cms/media", "_site", ".baseline", ".superpowers", "content"]) {
    check(pats.has(p), `.dockerignore: ${p} fehlt`);
  }
}

// .nvmrc
const nvmrc = read(".nvmrc");
if (nvmrc !== null) check(nvmrc.trim() === MIN_NODE, `.nvmrc muss ${MIN_NODE} sein (ist ${nvmrc.trim()})`);

// backup.sh
const bk = read(`${CMS}/backup.sh`);
if (bk !== null) {
  check(/^set -euo pipefail/m.test(bk), "backup.sh: set -euo pipefail fehlt (Exit ≠ 0 bei Fehler)");
  check(/pg_dump\b[^\n]*-Fc/.test(bk), "backup.sh: pg_dump -Fc fehlt");
  check(/tar\b[^\n]*media/.test(bk), "backup.sh: tar von media/ fehlt");
  check(/KEEP=14\b/.test(bk), "backup.sh: KEEP=14 fehlt");
}
const readme = read(`${CMS}/README.md`);
if (readme !== null) check(/\/etc\/cron\.d\/cms-backup/.test(readme) && /^15 3 \* \* \* root /m.test(readme), "README: Cron-Zeile (/etc/cron.d/cms-backup, 15 3 * * * root …) fehlt");

// Host-Git auf builder-beschreibbaren Repos (snapshot.git, repo): nur gehärtet — der builder (uid 1000 = Host-
// Nutzer) kann config/hooks schreiben; Pager/fsmonitor/Hooks/textconv würden sonst auf dem Host laufen.
// Ausgenommen: die Erstanlage (init/remote add auf frischen, leeren Repos).
const GIT_HARDEN = ["--no-pager", "-c core.fsmonitor=false", "-c core.hooksPath=/dev/null", "-c core.pager=cat"];
const unhardenedGitLines = (src) =>
  src
    .split("\n")
    .filter((l) => /\bgit\b[^\n]*\/opt\/docker-data\/cms\/(snapshot\.git|repo)\b/.test(l) && !/\binit -q\b/.test(l))
    .filter((l) => !GIT_HARDEN.every((f) => l.includes(f)) || (/\blog\b/.test(l) && !/--no-textconv/.test(l)));
if (readme !== null) {
  const bad = unhardenedGitLines(readme);
  check(bad.length === 0, `README: Host-Git auf snapshot.git/repo ohne ${GIT_HARDEN.join(" ")} (--no-textconv bei log): ${bad.map((l) => l.trim()).join(" | ")}`);
  check(/snapshot-log\.sh/.test(readme), "README: Hinweis auf deploy/cms/snapshot-log.sh fehlt");
  // Mutation-Probe: ein ungehärtetes git log muss anschlagen
  check(unhardenedGitLines("git -C /opt/docker-data/cms/snapshot.git log --oneline").length === 1, "README: Mutation-Probe — Regel erkennt ungehärtetes Host-git nicht");
}
const slog = read(`${CMS}/snapshot-log.sh`);
if (slog !== null) {
  const execLine = slog.split("\n").find((l) => /^exec git\b/.test(l)) ?? "";
  check(GIT_HARDEN.every((f) => execLine.includes(f)) && /--no-ext-diff/.test(execLine) && /--no-textconv/.test(execLine), `snapshot-log.sh: exec git braucht ${GIT_HARDEN.join(" ")} --no-ext-diff --no-textconv`);
}

// ------------------------------------------------------------------ Landing
const lc = readYaml(`${LANDING}/docker-compose.yml`);
if (lc) {
  const svcs = Object.entries(lc.services ?? {});
  check(svcs.length === 1, "landing-Compose: genau ein Dienst erwartet");
  for (const [name, svc] of svcs) {
    checkNginxHardening(`landing/${name}`, svc);
    check(svc.container_name === "landing", `landing/${name}: container_name: landing fehlt`);
    check(!svc.ports && !svc.privileged && !svc.network_mode, `landing/${name}: keine ports/privileged/network_mode`);
    check(networksOf(svc).get("macvlan78")?.ipv4_address === "10.30.78.2", `landing/${name}: macvlan78 / 10.30.78.2 fehlt`);
    check(hasMount(svc, `${DATA}/work/releases`, "/srv/releases", true), `landing/${name}: ${DATA}/work/releases:/srv/releases:ro fehlt`);
    for (const m of volumesOf(svc)) {
      check(m.ro, `landing/${name}: Mount ${m.src} muss :ro sein`);
      check(!/\/current\/?$/.test(m.src ?? ""), `landing/${name}: niemals den Symlink current selbst mounten (${m.src})`);
    }
    check(hasMount(svc, "./nginx-default.conf", "/etc/nginx/conf.d/default.conf", true), `landing/${name}: ./nginx-default.conf:/etc/nginx/conf.d/default.conf:ro fehlt`);
  }
}
const lconf = read(`${LANDING}/nginx-default.conf`);
if (lconf !== null) {
  check(/^\s*root\s+\/srv\/releases\/current\s*;/m.test(lconf), "landing nginx: root /srv/releases/current; fehlt");
  check(/^\s*index\s+index\.html\s*;/m.test(lconf), "landing nginx: index index.html; fehlt");
  check(/^\s*error_page\s+404\s+\/404\.html\s*;/m.test(lconf), "landing nginx: error_page 404 /404.html; fehlt");
  // Direktaufruf /404.html muss 404 liefern (wie live): internal-Location ohne eigenes root
  const INTERNAL_404 = /location\s*=\s*\/404\.html\s*\{\s*internal\s*;\s*\}/;
  const hasInternal404 = (conf) => INTERNAL_404.test(conf);
  check(hasInternal404(lconf), "landing nginx: location = /404.html { internal; } fehlt (direkter Aufruf würde 200 liefern)");
  // Mutation-Probe: ohne den Block muss die Regel anschlagen, sonst prüft sie nichts
  const withoutInternal404 = lconf.replace(/\s*location\s*=\s*\/404\.html\s*\{[^}]*\}/, "");
  check(withoutInternal404 !== lconf && !hasInternal404(withoutInternal404), "landing nginx: Mutation-Probe — Regel erkennt fehlenden internal-404-Block nicht");
}

// ------------------------------------------------------------------ edge02 (TLS + oauth2-proxy)
// Die Live-Config von edge02 liegt im Repo (deploy/edge02) und wird hier statisch geprüft.
// Jede Regel sitzt in edgeErrors(); unten laufen Mutation-Proben, die je eine Regel brechen müssen.
const EDGE = "deploy/edge02";
const EDGE_FILES = {
  cms: `${EDGE}/cms.kozlowski-it.de.conf`,
  preview: `${EDGE}/cms-vorschau.kozlowski-it.de.conf`,
  cfg: `${EDGE}/oauth2-proxy-cms.cfg.example`,
  unit: `${EDGE}/oauth2-proxy-cms.service`,
  readme: `${EDGE}/README.md`,
};
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Inhalt aller `location <match> { … }`-Blöcke (Klammern gezählt, Kommentare entfernt). */
function locationBlocks(conf, match) {
  const src = conf.replace(/#[^\n]*/g, "");
  const out = [];
  const re = new RegExp(`location\\s+${reEsc(match)}\\s*\\{`, "g");
  for (let m; (m = re.exec(src)); ) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < src.length && depth; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
    out.push(src.slice(re.lastIndex, i - 1));
  }
  return out;
}

/** 32+ Hex-Zeichen oder 32+ Base64(url)-Zeichen mit Ziffer, Groß- und Kleinbuchstabe = sieht nach Secret aus. */
const secretLike = (src) =>
  [...src.matchAll(/[A-Za-z0-9+/_-]{32,}={0,2}/g)]
    .map((m) => m[0])
    .filter((t) => /^[0-9a-f]{32,}$/i.test(t.replace(/=+$/, "")) || (/\d/.test(t) && /[A-Z]/.test(t) && /[a-z]/.test(t)));

function edgeVhostErrors(label, conf, { upstream, cms }) {
  const errs = [];
  const e = (cond, msg) => {
    if (!cond) errs.push(`edge02 ${label}: ${msg}`);
    return !!cond;
  };
  const noComments = conf.replace(/#[^\n]*/g, "");
  const mains = locationBlocks(conf, "/").filter((b) => /\bproxy_pass\b/.test(b));
  if (!e(mains.length === 1, `genau ein proxierender location /-Block erwartet (ist: ${mains.length})`)) return errs;
  const main = mains[0];
  e(/^\s*auth_request\s+\/oauth2\/auth\s*;/m.test(main), "location / ohne auth_request /oauth2/auth;");
  e(locationBlocks(conf, "= /oauth2/auth").some((b) => /^\s*internal\s*;/m.test(b)), "location = /oauth2/auth { internal; … } fehlt");
  for (const [hdr, up] of [["X-Auth-Request-Email", "email"], ["X-Auth-Request-Groups", "groups"]]) {
    const set = new RegExp(`^\\s*auth_request_set\\s+\\$(\\w+)\\s+\\$upstream_http_x_auth_request_${up}\\s*;`, "m").exec(main);
    if (e(set, `location / ohne auth_request_set $… $upstream_http_x_auth_request_${up};`)) {
      e(new RegExp(`^\\s*proxy_set_header\\s+${hdr}\\s+\\$${set[1]}\\s*;`, "m").test(main), `location / setzt ${hdr} nicht aus $${set[1]} (Client-Wert würde durchgereicht)`);
    }
  }
  e(new RegExp(`^\\s*proxy_pass\\s+http://${reEsc(upstream)}\\s*;`, "m").test(main), `location / muss nach http://${upstream} proxieren`);
  e(/^\s*add_header\s+X-Robots-Tag\s+"noindex, nofollow"\s+always\s*;/m.test(noComments), 'add_header X-Robots-Tag "noindex, nofollow" always; fehlt');
  if (cms) {
    e(/^\s*include\s+\/etc\/nginx\/snippets\/cms-edge-secret\.conf\s*;/m.test(main), "location / ohne include /etc/nginx/snippets/cms-edge-secret.conf;");
    // CSRF: schreibende Methode + fremde (nicht leere) Origin → 403
    e(/if\s*\(\$request_method\s*!~\s*\^\(GET\|HEAD\|OPTIONS\)\$\)\s*\{\s*set\s+\$cms_csrf\s+"w"\s*;\s*\}/.test(noComments), "CSRF: Methoden-Prüfung (!~ ^(GET|HEAD|OPTIONS)$ → w) fehlt");
    e(/if\s*\(\$http_origin\s*!~\s*\^\(https:\/\/cms\\\.kozlowski-it\\\.de\)\?\$\)\s*\{\s*set\s+\$cms_csrf\s+"\$\{cms_csrf\}x"\s*;\s*\}/.test(noComments), "CSRF: Origin-Prüfung (!~ ^(https://cms\\.kozlowski-it\\.de)?$ → x) fehlt");
    e(/if\s*\(\$cms_csrf\s*=\s*"wx"\)\s*\{\s*return\s+403\s*;\s*\}/.test(noComments), 'CSRF: if ($cms_csrf = "wx") { return 403; } fehlt');
    e(locationBlocks(conf, "~ ^/api/users/(login|forgot-password|reset-password|first-register|unlock)$").some((b) => /^\s*return\s+403\s*;/m.test(b)), "Passwort-Routen /api/users/(login|forgot-password|reset-password|first-register|unlock) nicht mit 403 gesperrt");
    e(locationBlocks(conf, "~ ^/admin/(login|forgot|reset)").some((b) => /^\s*return\s+403\s*;/m.test(b)), "Admin-Passwortseiten ^/admin/(login|forgot|reset) nicht mit 403 gesperrt");
    e(locationBlocks(conf, "= /admin/create-first-user").some((b) => /^\s*return\s+403\s*;/m.test(b)), "location = /admin/create-first-user { return 403; } fehlt");
    e(locationBlocks(conf, "= /admin/logout").some((b) => /^\s*return\s+302\s+\/oauth2\/sign_out\b/m.test(b)), "location = /admin/logout → return 302 /oauth2/sign_out… fehlt");
  }
  return errs;
}

function edgeErrors(src) {
  const errs = [];
  const e = (cond, msg) => {
    if (!cond) errs.push(`edge02 ${msg}`);
    return !!cond;
  };
  if (src.cms != null) errs.push(...edgeVhostErrors("cms", src.cms, { upstream: `${IPS.payload}:3000`, cms: true }));
  if (src.preview != null) errs.push(...edgeVhostErrors("vorschau", src.preview, { upstream: `${IPS.preview}:80`, cms: false }));
  if (src.cfg != null) {
    const cfg = src.cfg.replace(/#[^\n]*/g, "");
    const has = (re, msg) => e(re.test(cfg), `oauth2-proxy-cms.cfg.example: ${msg}`);
    has(/^\s*cookie_samesite\s*=\s*"lax"\s*$/m, 'cookie_samesite = "lax" fehlt');
    has(/^\s*cookie_secure\s*=\s*true\s*$/m, "cookie_secure = true fehlt");
    has(/^\s*allowed_groups\s*=\s*\[\s*"cms-editor"\s*\]\s*$/m, 'allowed_groups = ["cms-editor"] fehlt');
    has(/^\s*code_challenge_method\s*=\s*"S256"\s*$/m, 'code_challenge_method = "S256" fehlt');
    has(/^\s*trusted_proxy_ips\s*=/m, "trusted_proxy_ips fehlt");
    e(!/^\s*cookie_domain\s*=/m.test(cfg), "oauth2-proxy-cms.cfg.example: kein cookie_domain (Cookie nur für den eigenen Host)");
  }
  if (src.unit != null) {
    e(/^ExecStart=\/usr\/local\/bin\/oauth2-proxy --config=\/etc\/oauth2-proxy\/cms\.cfg\s*$/m.test(src.unit), "oauth2-proxy-cms.service: ExecStart … --config=/etc/oauth2-proxy/cms.cfg fehlt");
    e(/^User=oauth2proxy\s*$/m.test(src.unit) && /^NoNewPrivileges=true\s*$/m.test(src.unit), "oauth2-proxy-cms.service: User=oauth2proxy + NoNewPrivileges=true fehlen");
  }
  // keine Secrets in deploy/edge02: Platzhalter für *_secret/client_id, nichts Secret-Ähnliches
  for (const [k, text] of Object.entries(src)) {
    if (text == null) continue;
    for (const [, key, val] of text.matchAll(/^\s*(client_secret|cookie_secret|client_id)\s*=\s*(.*?)\s*$/gm)) {
      e(/^"<[^<>]+>"$/.test(val), `${k}: ${key} muss Platzhalter "<…>" sein, kein echter Wert`);
    }
    const hits = secretLike(text);
    e(hits.length === 0, `${k}: Secret-ähnliche Zeichenkette (${hits.map((h) => h.slice(0, 6) + "…").join(", ")})`);
  }
  return errs;
}

const edgeSrc = Object.fromEntries(Object.entries(EDGE_FILES).map(([k, f]) => [k, read(f)]));
for (const msg of edgeErrors(edgeSrc)) fail(msg);

// Mutation-Proben: jede bricht genau eine Regel; meldet edgeErrors() dann nichts, prüft die Regel nichts.
if (Object.values(edgeSrc).every((v) => v !== null)) {
  const M = (file, from, to) => ({ file, from, to });
  const probes = {
    "auth_request fehlt (cms)": M("cms", /^\s*auth_request \/oauth2\/auth;\n/m, ""),
    "auth_request fehlt (vorschau)": M("preview", /^\s*auth_request \/oauth2\/auth;\n/m, ""),
    "/oauth2/auth nicht internal": M("cms", /^\s*internal;\n/m, ""),
    "Email-Header vom Client": M("cms", /X-Auth-Request-Email\s+\$cms_email/, "X-Auth-Request-Email $http_x_auth_request_email"),
    "Groups-Header vom Client": M("preview", /X-Auth-Request-Groups\s+\$cms_groups/, "X-Auth-Request-Groups $http_x_auth_request_groups"),
    "auth_request_set groups fehlt": M("cms", /^\s*auth_request_set \$cms_groups[^\n]*\n/m, ""),
    "Edge-Secret-Include fehlt": M("cms", /^\s*include \/etc\/nginx\/snippets\/cms-edge-secret\.conf;\n/m, ""),
    "Vorschau falsches Ziel": M("preview", /proxy_pass http:\/\/10\.30\.85\.3:80/, "proxy_pass http://10.30.85.2:3000"),
    "CMS falsches Ziel": M("cms", /proxy_pass http:\/\/10\.30\.85\.2:3000/, "proxy_pass http://10.30.85.3:80"),
    "CSRF-Origin-Prüfung fehlt": M("cms", /^\s*if \(\$http_origin[^\n]*\n/m, ""),
    "CSRF-Methode fehlt": M("cms", /^\s*if \(\$request_method[^\n]*\n/m, ""),
    "CSRF-403 fehlt": M("cms", /return 403; \}\n(\s*# Abmelden)/, "return 200; }\n$1"),
    "Passwort-Routen offen": M("cms", /(location ~ \^\/api\/users\/[^{]*\{\s*)return 403;/, "$1return 200;"),
    "Admin-Login offen": M("cms", /(location ~ \^\/admin\/\(login[^{]*\{\s*)return 403;/, "$1return 200;"),
    "create-first-user offen": M("cms", /(location = \/admin\/create-first-user \{\s*)return 403;/, "$1return 200;"),
    "logout ohne sign_out": M("cms", /\/oauth2\/sign_out/, "/oauth2/sign_in"),
    "X-Robots-Tag fehlt (vorschau)": M("preview", /^\s*add_header X-Robots-Tag[^\n]*\n/m, ""),
    "X-Robots-Tag fehlt (cms)": M("cms", /^\s*add_header X-Robots-Tag[^\n]*\n/m, ""),
    "Secret inline (hex)": M("cms", /include \/etc\/nginx\/snippets\/cms-edge-secret\.conf;/, `proxy_set_header X-Edge-Secret "${"ab12".repeat(16)}";`),
    "Secret in README (base64)": M("readme", /$/, "\nqZ3vT9xK2mL8pR4sW7yB1nC6dF0gH5jA\n"),
    "client_secret echt": M("cfg", /client_secret = "<SECRET>"/, 'client_secret = "abc"'),
    "cookie_secret echt": M("cfg", /cookie_secret = "<SECRET>"/, 'cookie_secret = "short"'),
    "cookie_samesite none": M("cfg", /cookie_samesite = "lax"/, 'cookie_samesite = "none"'),
    "cookie_secure false": M("cfg", /cookie_secure = true/, "cookie_secure = false"),
    "allowed_groups weg": M("cfg", /^allowed_groups[^\n]*\n/m, ""),
    "PKCE weg": M("cfg", /^code_challenge_method[^\n]*\n/m, ""),
    "trusted_proxy_ips weg": M("cfg", /^trusted_proxy_ips[^\n]*\n/m, ""),
    "cookie_domain gesetzt": M("cfg", /$/, '\ncookie_domain = ".kozlowski-it.de"\n'),
    "Unit ohne Config": M("unit", /--config=\/etc\/oauth2-proxy\/cms\.cfg/, ""),
  };
  for (const [name, { file, from, to }] of Object.entries(probes)) {
    const mutated = edgeSrc[file].replace(from, to);
    if (!check(mutated !== edgeSrc[file], `edge02: Mutation-Probe „${name}“ greift nicht (Vorlage geändert?)`)) continue;
    check(edgeErrors({ ...edgeSrc, [file]: mutated }).length > 0, `edge02: Mutation-Probe „${name}“ — Regel erkennt den Fehler nicht`);
  }
}

// ------------------------------------------------------------------ docker compose config
let dockerNote = "";
let hasDocker = false;
try {
  execFileSync("docker", ["compose", "version"], { stdio: "ignore" });
  hasDocker = true;
} catch {
  dockerNote = " (docker compose config ÜBERSPRUNGEN: kein docker hier — auf docker01 nachholen)";
}
if (hasDocker && compose) {
  for (const [file, envFile] of [[`${CMS}/docker-compose.yml`, `${CMS}/env.example`], [`${LANDING}/docker-compose.yml`, null]]) {
    try {
      const args = ["compose", "-f", join(ROOT, file)];
      if (envFile) args.push("--env-file", join(ROOT, envFile));
      execFileSync("docker", [...args, "config", "-q"], { stdio: ["ignore", "ignore", "pipe"] });
    } catch (err) {
      fail(`docker compose config für ${file} scheitert: ${String(err.stderr ?? err.message).trim()}`);
    }
  }
}

if (failures.length) {
  console.error(`check-deploy: ${failures.length} Verstoß/Verstöße:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`OK${dockerNote}`);
