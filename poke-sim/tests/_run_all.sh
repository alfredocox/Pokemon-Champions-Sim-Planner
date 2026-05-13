#!/bin/bash
# Runs the local JS suite with the same broad exclusions as CI, plus DB mock
# tests unless --skip-db is passed.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

FAILED=0
COUNT=0
SKIPPED=0

for t in tests/*.js; do
  BASE="$(basename "$t")"

  case "$BASE" in
    audit.js|_db_helpers.js|db_m*_tests.js|nightly_bring_harness.js|golden_battles_runner.js)
      echo "SKIP $BASE"
      SKIPPED=$((SKIPPED + 1))
      continue
      ;;
  esac

  echo "RUN $BASE"
  if node "$t"; then
    COUNT=$((COUNT + 1))
  else
    FAILED=1
  fi
done

if [ "${1:-}" != "--skip-db" ]; then
  bash tests/_run_all_db.sh || FAILED=1
fi

echo ""
echo "Ran $COUNT non-DB test file(s). Skipped $SKIPPED file(s)."
if [ "$FAILED" -ne 0 ]; then
  echo "❌ one or more local test suites failed"
  exit 1
fi
echo "✅ local test suites passed"
