#!/bin/bash
# check-bundle.sh -- Fail if the committed bundle is out of sync with source files.
# Called by CI (.github/workflows/ci.yml, issue #87).
# Run manually: bash poke-sim/tools/check-bundle.sh (from repo root)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE="$REPO_ROOT/poke-sim/pokemon-champion-2026.html"

if [ ! -f "$BUNDLE" ]; then
  echo "::error::Bundle not found at poke-sim/pokemon-champion-2026.html"
  exit 1
fi

EXPECTED=$(python3 "$REPO_ROOT/poke-sim/tools/build-bundle.py" --to-stdout | sha256sum | cut -d' ' -f1)
ACTUAL=$(sha256sum "$BUNDLE" | cut -d' ' -f1)

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo ""
  echo "Bundle drift detected."
  echo "    poke-sim/pokemon-champion-2026.html does not match what the build script produces."
  echo ""
  echo "    Fix: run the following from the repo root, then commit pokemon-champion-2026.html:"
  echo "      cd poke-sim && python3 tools/build-bundle.py"
  echo ""
  echo "    See poke-sim/tools/README.md for full rebuild instructions."
  echo "    See MASTER_PROMPT.md > RELEASE PROCEDURE for context."
  exit 1
fi

echo "Bundle is fresh -- pokemon-champion-2026.html matches source files."
