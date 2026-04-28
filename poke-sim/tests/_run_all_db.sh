#!/bin/bash
# poke-sim/tests/_run_all_db.sh
# Runs every db_*_tests.js, exits non-zero on any failure.
# Run from the poke-sim/ directory:  bash tests/_run_all_db.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

failed=0
for f in tests/db_*_tests.js; do
  echo ""
  echo "▶ $f"
  if ! node "$f"; then
    failed=$((failed + 1))
  fi
done

echo ""
if [ "$failed" -gt 0 ]; then
  echo "❌ $failed DB suite(s) failed"
  exit 1
fi
echo "✅ all DB suites passed"
