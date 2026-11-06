#!/usr/bin/env bash
# Baut Commit a0dacf4 (Stand live seit 2026-09-07) in einem temporären git worktree nach
# <repo>/.baseline/ — Referenz für den Gleichheitstest (scripts/check-equal.mjs).
# Idempotent: ersetzt .baseline/ jedes Mal komplett. Worktree wird immer entfernt (trap).
# node_modules wird per Symlink aus dem Repo-Root wiederverwendet (kein npm install).
set -euo pipefail

BASE_COMMIT="${BASELINE_COMMIT:-a0dacf4}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMPBASE="${TMPDIR:-/home/pascal/tmp}"
mkdir -p "$TMPBASE"
WT="$(mktemp -d "$TMPBASE/baseline-wt.XXXXXX")"
STAGE="$ROOT/.baseline.new"

cleanup() {
  rm -rf "$STAGE"
  git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
  rm -rf "$WT"
  git -C "$ROOT" worktree prune
}
trap cleanup EXIT

rm -rf "$STAGE"
rmdir "$WT"  # git worktree add legt das Verzeichnis selbst an
git -C "$ROOT" worktree add --detach "$WT" "$BASE_COMMIT" >/dev/null
ln -s "$ROOT/node_modules" "$WT/node_modules"

( cd "$WT" && node node_modules/@11ty/eleventy/cmd.cjs --output="$STAGE" --quiet )

[ -f "$STAGE/index.html" ] || { echo "baseline: $STAGE/index.html fehlt — Build fehlgeschlagen" >&2; exit 1; }
rm -rf "$ROOT/.baseline"
mv "$STAGE" "$ROOT/.baseline"
echo "baseline: $BASE_COMMIT -> $ROOT/.baseline ($(find "$ROOT/.baseline" -name '*.html' | wc -l) HTML-Seiten)"
