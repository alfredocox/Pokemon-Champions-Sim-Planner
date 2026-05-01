#!/usr/bin/env bash
# =================================================================
# apply-namespace-78.sh — Issue #78: window.ChampionsSim Namespace
# =================================================================
# Run from REPO ROOT:
#   bash poke-sim/tools/apply-namespace-78.sh
#
# What this does:
#   1. Verifies you are on branch feat/78-namespace-champions-sim
#   2. Inserts the ChampionsSim namespace init block into ui.js
#   3. Runs all 11 sed substitutions on ui.js
#   4. Patches t9j14_tests.js
#   5. Bumps sw.js CACHE_NAME to v7
#   6. Runs AC verification grep (must return zero hits)
#   7. Generates namespace-78.patch for review
#   8. Prints PASS or FAIL with next steps
#
# After PASS:
#   - Review namespace-78.patch
#   - Paste patch into Perplexity Pokesim chat
#   - AI will validate and push the PR commit
# =================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Issue #78 — ChampionsSim Namespace    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------
# 0. Guard: must be on the right branch
# -----------------------------------------------------------------
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "feat/78-namespace-champions-sim" ]; then
  echo -e "${RED}✗ WRONG BRANCH: you are on '$CURRENT_BRANCH'${NC}"
  echo -e "  Run: git checkout feat/78-namespace-champions-sim"
  exit 1
fi
echo -e "${GREEN}✓ Branch: $CURRENT_BRANCH${NC}"

# -----------------------------------------------------------------
# 1. Guard: target files must exist
# -----------------------------------------------------------------
for f in "poke-sim/ui.js" "poke-sim/sw.js" "poke-sim/tests/t9j14_tests.js"; do
  if [ ! -f "$f" ]; then
    echo -e "${RED}✗ File not found: $f${NC}"
    echo -e "  Are you running from the repo root?"
    exit 1
  fi
done
echo -e "${GREEN}✓ All target files found${NC}"

# -----------------------------------------------------------------
# 2. Guard: don't run twice (idempotency check)
# -----------------------------------------------------------------
if grep -q "window.ChampionsSim.state" poke-sim/ui.js; then
  echo -e "${YELLOW}⚠ Namespace already applied — ui.js already contains window.ChampionsSim.state${NC}"
  echo -e "  Skipping substitutions. Running AC check only."
  SKIP_SUBS=true
else
  SKIP_SUBS=false
fi

# -----------------------------------------------------------------
# 3. Insert namespace init block after theme-toggle IIFE
# -----------------------------------------------------------------
if [ "$SKIP_SUBS" = false ]; then
  echo ""
  echo -e "${BLUE}→ Step 1: Inserting namespace init block...${NC}"

  # Find the line number of the FIRST })(); in ui.js (theme toggle close)
  IIFE_LINE=$(grep -n "^})();" poke-sim/ui.js | head -1 | cut -d: -f1)

  if [ -z "$IIFE_LINE" ]; then
    echo -e "${RED}✗ Could not find theme-toggle IIFE closing line })();${NC}"
    echo -e "  Please manually insert the namespace init block after the first })(); in ui.js"
    echo -e "  Then re-run this script."
    exit 1
  fi

  echo -e "  Found IIFE at line $IIFE_LINE — inserting namespace block after it"

  # Build the block to insert
  NAMESPACE_BLOCK="\/\/ ============================================================\n\/\/ CHAMPIONS SIM NAMESPACE — Issue #78\n\/\/ All cross-module globals hang off window.ChampionsSim.\n\/\/ Zero bare window.* writes after this file loads.\n\/\/ ============================================================\nwindow.ChampionsSim          = window.ChampionsSim || {};\nwindow.ChampionsSim.state    = {};   \/\/ format, lastResults\nwindow.ChampionsSim.bring    = {};   \/\/ bring\/lead picker API\n"

  sed -i "${IIFE_LINE}a\\${NAMESPACE_BLOCK}" poke-sim/ui.js
  echo -e "${GREEN}  ✓ Namespace init block inserted${NC}"

  # -----------------------------------------------------------------
  # 4. Run all 11 substitutions
  # -----------------------------------------------------------------
  echo ""
  echo -e "${BLUE}→ Step 2: Running substitutions on ui.js...${NC}"

  sed -i 's/window\.currentFormat = currentFormat/window.ChampionsSim.state.format = currentFormat/g' poke-sim/ui.js
  echo -e "  ✓ window.currentFormat → window.ChampionsSim.state.format"

  sed -i 's/window\.lastSimResults\b/window.ChampionsSim.state.lastResults/g' poke-sim/ui.js
  echo -e "  ✓ window.lastSimResults → window.ChampionsSim.state.lastResults"

  sed -i 's/window\.BRING_SELECTION *= *BRING_SELECTION/window.ChampionsSim.bring.BRING_SELECTION = BRING_SELECTION/g' poke-sim/ui.js
  echo -e "  ✓ window.BRING_SELECTION"

  sed -i 's/window\.BRING_MODE *= *BRING_MODE/window.ChampionsSim.bring.BRING_MODE = BRING_MODE/g' poke-sim/ui.js
  echo -e "  ✓ window.BRING_MODE"

  sed -i 's/window\.getBringFor *= *getBringFor/window.ChampionsSim.bring.getBringFor = getBringFor/g' poke-sim/ui.js
  echo -e "  ✓ window.getBringFor"

  sed -i 's/window\.setBringFor *= *setBringFor/window.ChampionsSim.bring.setBringFor = setBringFor/g' poke-sim/ui.js
  echo -e "  ✓ window.setBringFor"

  sed -i 's/window\.getBringMode *= *getBringMode/window.ChampionsSim.bring.getBringMode = getBringMode/g' poke-sim/ui.js
  echo -e "  ✓ window.getBringMode"

  sed -i 's/window\.setBringMode *= *setBringMode/window.ChampionsSim.bring.setBringMode = setBringMode/g' poke-sim/ui.js
  echo -e "  ✓ window.setBringMode"

  sed -i 's/window\.randomBringFor *= *randomBringFor/window.ChampionsSim.bring.randomBringFor = randomBringFor/g' poke-sim/ui.js
  echo -e "  ✓ window.randomBringFor"

  sed -i 's/window\.getLeadsFor *= *getLeadsFor/window.ChampionsSim.bring.getLeadsFor = getLeadsFor/g' poke-sim/ui.js
  echo -e "  ✓ window.getLeadsFor"

  sed -i 's/window\.setLeadsFor *= *setLeadsFor/window.ChampionsSim.bring.setLeadsFor = setLeadsFor/g' poke-sim/ui.js
  echo -e "  ✓ window.setLeadsFor"

  # -----------------------------------------------------------------
  # 5. Patch t9j14_tests.js
  # -----------------------------------------------------------------
  echo ""
  echo -e "${BLUE}→ Step 3: Patching t9j14_tests.js...${NC}"
  sed -i 's/window\.lastSimResults\b/window.ChampionsSim.state.lastResults/g' poke-sim/tests/t9j14_tests.js
  echo -e "${GREEN}  ✓ t9j14_tests.js patched${NC}"

  # -----------------------------------------------------------------
  # 6. Bump sw.js CACHE_NAME
  # -----------------------------------------------------------------
  echo ""
  echo -e "${BLUE}→ Step 4: Bumping sw.js CACHE_NAME to v7...${NC}"
  sed -i 's/champions-sim-v6-wire-storage-adapter/champions-sim-v7-namespace-champions-sim/' poke-sim/sw.js
  NEW_CACHE=$(grep "CACHE_NAME" poke-sim/sw.js)
  echo -e "${GREEN}  ✓ $NEW_CACHE${NC}"
fi

# -----------------------------------------------------------------
# 7. AC Verification — MUST return zero hits
# -----------------------------------------------------------------
echo ""
echo -e "${BLUE}→ AC Verification: scanning for remaining bare window.* writes...${NC}"

BAD_WRITES=$(grep -n "window\." poke-sim/ui.js \
  | grep " = " \
  | grep -v "window\.ChampionsSim" \
  | grep -v "^\/\/" \
  | grep -v "\*" || true)

CROSS_FILE=$(grep -rn \
  "window\.currentFormat\b\|window\.lastSimResults\b\|window\.getBringFor\b\|window\.setBringFor\b\|window\.getLeadsFor\b" \
  poke-sim/ \
  --include="*.js" \
  | grep -v "window\.ChampionsSim" || true)

if [ -n "$BAD_WRITES" ] || [ -n "$CROSS_FILE" ]; then
  echo -e "${RED}✗ AC FAILED — bare window.* writes still found:${NC}"
  echo ""
  [ -n "$BAD_WRITES" ] && echo -e "${RED}ui.js:${NC}" && echo "$BAD_WRITES"
  [ -n "$CROSS_FILE" ] && echo -e "${RED}cross-file:${NC}" && echo "$CROSS_FILE"
  echo ""
  echo -e "${YELLOW}Fix the above lines manually, then re-run this script.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ AC PASSED — zero bare window.* writes remain${NC}"

# -----------------------------------------------------------------
# 8. Generate patch
# -----------------------------------------------------------------
echo ""
echo -e "${BLUE}→ Generating namespace-78.patch...${NC}"
git diff poke-sim/ui.js poke-sim/sw.js poke-sim/tests/t9j14_tests.js > namespace-78.patch

LINES=$(wc -l < namespace-78.patch)
echo -e "${GREEN}✓ namespace-78.patch generated ($LINES lines)${NC}"

# -----------------------------------------------------------------
# 9. Final instructions
# -----------------------------------------------------------------
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ PASS — Issue #78 patch ready        ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "  1. Review the patch:    cat namespace-78.patch"
echo -e "  2. Rebuild the bundle:  cd poke-sim && python3 tools/build-bundle.py"
echo -e "  3. Paste namespace-78.patch into the Perplexity Pokesim chat"
echo -e "  4. AI validates and opens PR #78"
echo ""
echo -e "${BLUE}Patch preview (first 40 lines):${NC}"
head -40 namespace-78.patch
