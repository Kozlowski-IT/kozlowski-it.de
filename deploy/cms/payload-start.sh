#!/bin/sh
# Startsperre für den payload-Dienst (compose command: sh /app/deploy/cms/payload-start.sh npm --prefix cms start …).
# Verweigert den Start, wenn Pflicht-Env fehlt — bewusst NICHT in payload.config, damit der
# Image-Build (next build) ohne Env/DB läuft. Danach exec "$@" (Signale gehen direkt an npm/next).
set -eu

fail() {
  echo "[payload-start] $1 — Start verweigert" >&2
  exit 1
}

# Ohne https-Server-URL: falsche Admin-/Vorschau-Links und CSRF-Liste
case "${PAYLOAD_PUBLIC_SERVER_URL:-}" in
  https://?*) ;;
  *) fail "PAYLOAD_PUBLIC_SERVER_URL fehlt oder ist nicht https://…" ;;
esac

# Ohne Edge-Secret (≥ 32 Zeichen) wäre der Header-Login von edge02 fälschbar bzw. tot
edge="${EDGE_SHARED_SECRET:-}"
[ "${#edge}" -ge 32 ] || fail "EDGE_SHARED_SECRET fehlt oder ist kürzer als 32 Zeichen"
psec="${PAYLOAD_SECRET:-}"
[ "${#psec}" -ge 32 ] || fail "PAYLOAD_SECRET fehlt oder ist kürzer als 32 Zeichen"
unset edge psec
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL fehlt"

# Ohne production würde Payload das Schema per push ändern statt Migrationen zu fahren
[ "${NODE_ENV:-}" = "production" ] || fail "NODE_ENV ist nicht production"

[ "$#" -gt 0 ] || fail "kein Startbefehl übergeben"
exec "$@"
