#!/bin/sh
# Verlauf des Git-Abbilds ansehen — läuft IM builder-Container, nie auf dem Host:
# snapshot.git/repo sind vom Container beschreibbar (config, hooks, attributes); Git auf dem Host
# würde daraus Programme starten. Im Container bleibt das in der Vertrauenszone des Schreibers.
#   ./snapshot-log.sh                       → git log --oneline -20 content-snapshot
#   ./snapshot-log.sh -p -1 content-snapshot
set -eu
STACK_DIR="${STACK_DIR:-/opt/docker/apps/cms}"
[ "$#" -gt 0 ] || set -- --oneline -20 content-snapshot
exec docker compose --project-directory "$STACK_DIR" -f "$STACK_DIR/docker-compose.yml" \
  exec -T builder git -C /srv/snapshot.git log "$@"
