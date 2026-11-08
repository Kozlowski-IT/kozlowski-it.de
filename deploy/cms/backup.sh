#!/usr/bin/env bash
# CMS-Backup auf docker01 (Cron: /etc/cron.d/cms-backup, täglich 03:15, s. README):
#   pg_dump -Fc der DB  → backup/cms-db-<datum>.dump
#   tar von media/      → backup/cms-media-<datum>.tar.gz
# Behält je die 14 neuesten. Jeder Fehler → Exit ≠ 0 (Ausnahme: tar Exit 1 = Datei geändert → Warnung), halbe Dateien werden entfernt
# (geschrieben wird erst in .part, dann umbenannt). backup/ liegt im PBS-Backup-Set.
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/docker/apps/cms}"
DATA_DIR="${DATA_DIR:-/opt/docker-data/cms}"
DEST="$DATA_DIR/backup"
KEEP=14

stamp="$(date +%Y-%m-%d_%H%M%S)"
db="$DEST/cms-db-$stamp.dump"
media="$DEST/cms-media-$stamp.tar.gz"

umask 077
mkdir -p "$DEST"
trap 'rm -f "$db.part" "$media.part"' EXIT

# -T: kein TTY (Cron); Dump läuft im postgres-Container, Ausgabe landet auf dem Host
docker compose --project-directory "$STACK_DIR" -f "$STACK_DIR/docker-compose.yml" \
  exec -T postgres pg_dump -U cms -d cms -Fc >"$db.part"
[ -s "$db.part" ] || { echo "cms-backup: pg_dump lieferte nichts" >&2; exit 1; }
mv "$db.part" "$db"

# Medien ändern sich evtl. während des Lesens (Upload im Admin): GNU tar meldet das mit Exit 1 —
# das Archiv ist trotzdem brauchbar → nur Warnung. Exit ≥ 2 (fataler Fehler) bricht ab.
media_warn=""
tar_rc=0
tar --warning=no-file-changed -C "$DATA_DIR" -czf "$media.part" media || tar_rc=$?
if (( tar_rc == 1 )); then
  media_warn=" (WARNUNG: tar Exit 1 — Datei während des Sicherns geändert)"
  echo "cms-backup: WARNUNG tar Exit 1 (Datei während des Sicherns geändert), Archiv behalten" >&2
elif (( tar_rc != 0 )); then
  echo "cms-backup: tar fehlgeschlagen (Exit $tar_rc)" >&2
  exit "$tar_rc"
fi
mv "$media.part" "$media"

# Aufräumen: Namen enthalten das Datum → lexikografisch = chronologisch
prune() {
  local pattern="$1"
  local -a files
  mapfile -t files < <(find "$DEST" -maxdepth 1 -type f -name "$pattern" | sort)
  local n=$(( ${#files[@]} - KEEP ))
  if (( n > 0 )); then
    rm -f -- "${files[@]:0:n}"
  fi
}
prune 'cms-db-*.dump'
prune 'cms-media-*.tar.gz'

echo "cms-backup: ok $(basename "$db") $(basename "$media")$media_warn"
