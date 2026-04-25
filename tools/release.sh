#!/usr/bin/env bash
# tools/release.sh — Champions Sim 2026
# Automates CACHE_NAME bump in poke-sim/sw.js on every release.
#
# Usage:
#   ./tools/release.sh t9j17           # explicit tag
#   ./tools/release.sh                  # auto-detects tag from CHANGELOG.md
#   ./tools/release.sh t9j17 --bump-major  # increment major version (breaking engine change)
#
# What it does:
#   1. Resolves the release tag (arg or CHANGELOG auto-detect)
#   2. Reads current CACHE_NAME major version from sw.js
#   3. Computes new CACHE_NAME = champions-sim-v{major}-{tag}
#   4. Rewrites sw.js in place (single sed)
#   5. git add sw.js — stages the change, does NOT auto-commit
#   6. Prints reminder with exact git commit command to run
#
# Phase 3 (CI enforcement) will fail PRs where sw.js was not bumped.
# Refs #95

set -euo pipefail

SW_FILE="poke-sim/sw.js"
CHANGELOG="CHANGELOG.md"

# ── 1. Resolve tag ───────────────────────────────────────────────────────────
if [[ $# -ge 1 && "$1" != "--bump-major" ]]; then
  TAG="$1"
else
  # Auto-detect: grab the first [T9j.XX] entry from CHANGELOG.md
  if [[ ! -f "$CHANGELOG" ]]; then
    echo "ERROR: $CHANGELOG not found and no tag argument provided." >&2
    echo "Usage: $0 <tag>   e.g. $0 t9j17" >&2
    exit 1
  fi
  TAG=$(grep -m1 '## \[T9j\.' "$CHANGELOG" \
        | sed 's/.*\[T9j\.\([^]]*\)\].*/t9j\1/' \
        | tr '[:upper:]' '[:lower:]')
  if [[ -z "$TAG" ]]; then
    echo "ERROR: Could not auto-detect tag from $CHANGELOG" >&2
    echo "Usage: $0 <tag>   e.g. $0 t9j17" >&2
    exit 1
  fi
fi

echo "Release tag : $TAG"

# ── 2. Read current major version from sw.js ─────────────────────────────────
if [[ ! -f "$SW_FILE" ]]; then
  echo "ERROR: $SW_FILE not found. Run this script from the repo root." >&2
  exit 1
fi

CURRENT=$(grep "^const CACHE_NAME" "$SW_FILE" \
          | sed "s/.*'champions-sim-v\([0-9]*\)-.*/\1/")

if [[ -z "$CURRENT" ]]; then
  echo "ERROR: Could not parse CACHE_NAME major version from $SW_FILE" >&2
  exit 1
fi

echo "Current major: v$CURRENT"

# ── 3. Compute new CACHE_NAME ─────────────────────────────────────────────────
MAJOR="$CURRENT"
if [[ "${2:-}" == "--bump-major" || "${1:-}" == "--bump-major" ]]; then
  MAJOR=$(( CURRENT + 1 ))
  echo "Major bump requested: v$CURRENT -> v$MAJOR"
fi

NEW_CACHE="champions-sim-v${MAJOR}-${TAG}"
OLD_CACHE=$(grep "^const CACHE_NAME" "$SW_FILE" | sed "s/.*'\(.*\)'.*/\1/")

echo "Old CACHE_NAME: $OLD_CACHE"
echo "New CACHE_NAME: $NEW_CACHE"

# Guard: no-op if already on this tag
if [[ "$OLD_CACHE" == "$NEW_CACHE" ]]; then
  echo "WARNING: CACHE_NAME is already '$NEW_CACHE' — nothing to do." >&2
  exit 0
fi

# ── 4. Rewrite sw.js ─────────────────────────────────────────────────────────
# macOS (BSD sed) needs -i '' ; Linux (GNU sed) needs -i only
if sed --version 2>/dev/null | grep -q GNU; then
  sed -i "s/const CACHE_NAME = '${OLD_CACHE}'/const CACHE_NAME = '${NEW_CACHE}'/" "$SW_FILE"
else
  sed -i '' "s/const CACHE_NAME = '${OLD_CACHE}'/const CACHE_NAME = '${NEW_CACHE}'/" "$SW_FILE"
fi

# Verify rewrite landed
VERIFY=$(grep "^const CACHE_NAME" "$SW_FILE" | sed "s/.*'\(.*\)'.*/\1/")
if [[ "$VERIFY" != "$NEW_CACHE" ]]; then
  echo "ERROR: Rewrite failed — sw.js still shows '$VERIFY'" >&2
  exit 1
fi

echo "sw.js updated successfully."

# ── 5. Stage the change ───────────────────────────────────────────────────────
git add "$SW_FILE"
echo "$SW_FILE staged."

# ── 6. Remind engineer to commit ─────────────────────────────────────────────
echo ""
echo "--------------------------------------------------------------"
echo " CACHE_NAME bumped: $OLD_CACHE -> $NEW_CACHE"
echo ""
echo " Review the change:"
echo "   git diff --cached $SW_FILE"
echo ""
echo " Then commit with:"
echo "   git commit -m \"infra: bump CACHE_NAME to ${NEW_CACHE} - Refs #95\""
echo "--------------------------------------------------------------"
