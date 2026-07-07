#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPECTED_DIR_NAME="customer-radar"
FAIL=0

warn() { printf "CHECK FAIL: %s\n" "$1" >&2; FAIL=1; }

if [ ! -d "$ROOT/.git" ]; then
  warn "not a git repository: $ROOT"
fi

CURRENT_BASE="$(basename "$ROOT")"
if [ "$CURRENT_BASE" != "$EXPECTED_DIR_NAME" ]; then
  warn "workspace directory name is '$CURRENT_BASE', expected '$EXPECTED_DIR_NAME'"
fi

for f in package.json src/server/index.js src/client src/cli/bin/cr.js supabase/migrations; do
  if [ ! -e "$ROOT/$f" ]; then
    warn "missing required path: $f"
  fi
done

GIT_TOP="$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$GIT_TOP" ]; then
  GIT_TOP="$(cd "$GIT_TOP" && pwd)"
  if [ "$GIT_TOP" != "$ROOT" ]; then
    warn "git root '$GIT_TOP' does not match workspace root '$ROOT'"
  fi
fi

if [ "$FAIL" -eq 0 ]; then
  printf "CHECK OK: workspace looks correct (%s)\n" "$ROOT"
  exit 0
else
  printf "CHECK RESULT: workspace validation failed (%s)\n" "$ROOT" >&2
  exit 1
fi
