#!/bin/sh
# Verlauf des Git-Abbilds auf docker01 ansehen — gehärtet: der builder (uid 1000 = Host-Nutzer)
# kann config/hooks in snapshot.git schreiben; Pager, fsmonitor und Hooks sind hier abgeschaltet,
# damit ein Host-Aufruf keinen untergeschobenen Code ausführt.
#   snapshot-log.sh                      → git log --oneline -20 content-snapshot
#   snapshot-log.sh -p -1 content-snapshot
set -eu
REPO="${SNAPSHOT_REPO:-/opt/docker-data/cms/snapshot.git}"
[ "$#" -gt 0 ] || set -- --oneline -20 content-snapshot
# --no-ext-diff/--no-textconv: auch diff.<x>.textconv/diff.external aus der Repo-Config bleiben aus (bei -p)
exec git --no-pager -c core.fsmonitor=false -c core.hooksPath=/dev/null -c core.pager=cat -C "$REPO" log --no-ext-diff --no-textconv "$@"
