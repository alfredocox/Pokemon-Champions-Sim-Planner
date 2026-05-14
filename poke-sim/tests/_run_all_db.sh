#!/bin/bash
# poke-sim/tests/_run_all_db.sh
# Runs every db_*_tests.js, exits non-zero on any failure.
# Run from the poke-sim/ directory:
#   bash tests/_run_all_db.sh         # mock/offline mode unless env is already set
#   bash tests/_run_all_db.sh --live  # loads .env.local and runs live DB checks

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

if [ "${1:-}" = "--live" ]; then
  if [ -f ".env.local" ]; then
    set -a
    . ".env.local"
    set +a
  fi

  if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
    echo "❌ live DB mode requires SUPABASE_URL and SUPABASE_ANON_KEY in poke-sim/.env.local or the environment"
    exit 1
  fi

  export SUPABASE_KEY="${SUPABASE_KEY:-$SUPABASE_ANON_KEY}"
  export RUN_LIVE_DB=1
  echo "🔗 live DB mode enabled for ${SUPABASE_URL}"
fi

failed=0
for f in tests/db_*_tests.js; do
  base="$(basename "$f")"
  if [ "$base" = "db_m9_hardening_tests.js" ]; then
    echo ""
    echo "⏭ SKIP (M9 not implemented): $f"
    continue
  fi

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
