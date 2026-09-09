#!/bin/bash
# check-bundle.sh -- Fail if the committed bundle is out of sync with source files.
# Called by CI (.github/workflows/ci.yml, issue #87).
# Run manually: bash poke-sim/tools/check-bundle.sh (from repo root)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE="$REPO_ROOT/poke-sim/pokemon-champion-2026.html"
ARTIFACT="$REPO_ROOT/poke-sim/generated/release_artifact.json"

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

if [ ! -f "$ARTIFACT" ]; then
  echo "::error::Release artifact manifest not found at poke-sim/generated/release_artifact.json"
  exit 1
fi

ARTIFACT_SHA=$(node -e "const fs=require('fs');const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,'utf8'));process.stdout.write(j.bundle_sha256 || '');" "$ARTIFACT")
if [ "$ARTIFACT_SHA" != "$ACTUAL" ]; then
  echo ""
  echo "Release artifact SHA drift detected."
  echo "    generated/release_artifact.json does not match pokemon-champion-2026.html."
  echo ""
  echo "    Fix: run the following from the repo root, then commit both files:"
  echo "      python3 poke-sim/tools/build-bundle.py"
  echo ""
  exit 1
fi

node "$REPO_ROOT/poke-sim/tools/verify-release-assets.cjs"
echo "Bundle is fresh -- pokemon-champion-2026.html matches source files."
