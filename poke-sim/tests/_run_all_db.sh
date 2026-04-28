#!/bin/bash
# poke-sim/tests/_run_all_db.sh
# Runs every db_*_tests.js, exits non-zero on any failure

set -e
for f in db_*_tests.js; do
  echo "▶ $f"
  node tests/$f || exit 1
done
echo "✅ all DB tests passed"
