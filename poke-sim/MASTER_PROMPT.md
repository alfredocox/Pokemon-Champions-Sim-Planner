# MASTER PROMPT — Pokémon Champion 2026
> **(c) 2026 Kevin Medeiros (@TheYfactora12) and Alfredo Cox (@alfredocox). All Rights Reserved.**
> **Canonical product tagline: "Battle-tested. Always evolving."**
>
> **HOW TO USE:** Paste this entire file as Codex/AI context.
> The AI will have full project context for every session.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive
team simulator built as a static, offline-capable PWA with a live Supabase database backend
for persistent analysis storage.

**PRIMARY GitHub repo (YOUR repo — push here when confident):**
https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner

**Working repo:** `TheYfactora12/Pokemon-Champions-Sim-Planner`

**Production reference repo after cleaned work is intentionally pushed upstream:**
https://github.com/alfredocox/Pokemon-Champions-Sim-Planner

Do not push to `alfredocox/Pokemon-Champions-Sim-Planner` unless explicitly instructed.

**Default branch:** `main`
**Active dev branch:** `main` (all work goes directly to main unless a feature branch is needed)
**Space name:** Pokesim
**Owner / committer identity:** `user.email=5zyxn9yrnt@privaterelay.appleid.com user.name=TheYfactora12`
**All new feature tickets:** assigned to `@TheYfactora12`

---

## ⚡ CODEX AUTO-PUSH DIRECTIVE

When Codex (or any AI assistant) reaches a state of HIGH CONFIDENCE on a change — meaning:
- All tests pass locally (or are verified offline-safe)
- No merge markers remain in any source file
- The bundle has been rebuilt (if source files changed)
- sw.js CACHE_NAME has been bumped
- The change does not break simulation logic, result rendering, or offline behavior

→ **Push only to `TheYfactora12/Pokemon-Champions-Sim-Planner`.**
→ Use a PR for runtime source, DB, or release changes.
→ For docs-only or test-only changes, direct-to-main is allowed only when the active human instruction permits it; otherwise use the current PR branch.
→ NEVER push to `alfredocox/Pokemon-Champions-Sim-Planner` unless explicitly instructed.
→ If confidence is MEDIUM or LOW: stop, document blockers, and report back for human review.

---

## LOCAL CHECKOUT TRUTH

| Path | Branch | Purpose |
|------|--------|---------|
| `C:\Users\kevin\OneDrive\Documents\GitHub\New folder\Pokemon-Champions-Sim-Planner` | `main` | Clean base — use for docs/QC/PR 1 work |
| `C:\Users\kevin\OneDrive\Documents\GitHub\Pokemon-Champions-Sim-Planner` | `feat/db-rls-supabase-adapter` | DB/Supabase conflict work — unresolved markers live here |
| `C:\Users\kevin\OneDrive\Documents\New project` | — | ⚠️ EMPTY — do not use |

---

## PROJECT FILES — CANONICAL LOCATIONS

> Source files live in the flat `poke-sim/` app directory.
Pokemon-Champions-Sim-Planner/
├── .github/workflows/
│ ├── bundle-freshness-check.yml
│ └── cache-bump-check.yml
├── tools/
│ └── release.sh ← auto-bumps sw.js CACHE_NAME on release
├── DEVELOPMENT_RUNBOOK.md
├── README.md
├── MASTER_PROMPT.md ← pointer to canonical prompt
├── poke-sim/ ← SOURCE OF TRUTH (all app source files live here)
│ ├── MASTER_PROMPT.md ← THIS FILE
│ ├── index.html ← App shell, tabs, PWA meta, SW registration
│ ├── style.css ← Full dark theme, mobile-first
│ ├── data.js ← BASE_STATS, POKEMON_TYPES_DB, TEAMS (22),
│ │ MOVE_CATEGORY (104), MOVE_BP (110+), getSpriteUrl()
│ ├── engine.js ← Battle sim, runSimulation(), runAllMatchups(),
│ │ buildAnalysisPayload() (see payload contract below)
│ ├── ui.js ← All UI logic, team selects, import/export,
│ │ pilot guide, PDF, speed tiers, meta radar,
│ │ coverage checker, strategy tab, bring-picker
│ ├── storage_adapter.js ← localStorage wrapper API
│ ├── supabase_adapter.js ← Supabase sync — loadTeams, saveAnalysis,
│ │ getMatchupHistory (⚠️ MERGE CONFLICTS — see below)
│ ├── strategy-injectable.js ← TEAM_META coaching knowledge base
│ ├── legality.js ← VGC legality checker
│ ├── sw.js ← PWA service worker
│ │ CACHE_NAME: champions-sim-v9-m3-init-wired
│ │ ⚠️ NEEDS BUMP to v10 for M4
│ ├── manifest.json
│ ├── icon-192.png / icon-512.png
│ ├── pokemon-champion-2026.html ← BUILT BUNDLE (~918 KB — never edit directly)
│ ├── db/
│ │ ├── schema_v1.sql ← 8-table Supabase schema (run first)
│ │ ├── seed_teams_v2.sql ← 22 tournament teams seed (run second)
│ │ ├── rls_policies_v1.sql ← RLS policies (⚠️ MERGE CONFLICTS — see below)
│ │ └── README_DB.md ← (⚠️ MERGE CONFLICTS — see below)
│ ├── tools/
│ │ ├── build-bundle.py ← canonical bundle rebuild (always use this)
│ │ ├── check-bundle.sh ← SHA compare for CI
│ │ └── README.md
│ └── tests/
│ ├── items_tests.js ← 14 cases
│ ├── status_tests.js ← 27 cases
│ ├── mega_tests.js ← 27 cases
│ ├── coverage_tests.js ← 9 cases
│ ├── t9j8_tests.js ← 47 cases (crit/flinch/abilities)
│ ├── t9j9_tests.js ← 24 cases (MOVE_CATEGORY/MOVE_BP)
│ ├── t9j10_tests.js ← ~16 cases (Team Preview bring-N-of-6)
│ ├── t9j11_tests.js through t9j16_tests.js
│ ├── audit.js ← 5070-battle regression sweep
│ └── db_m4_save_tests.js ← M4 offline persistence tests

---

## LIVE APP — HOW TO ACCESS

**Option 1 — htmlpreview bundle:**
https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html

**Option 2 — GitHub Pages (auto-deploys on push to main):**
https://TheYfactora12.github.io/Pokemon-Champions-Sim-Planner/

**Option 3 — Local dev server:**
```bash
cd poke-sim && npx serve .
# Open: http://localhost:3000
```

---

## SUPABASE DATABASE LAYER

### File status
| File | Status |
|------|--------|
| `poke-sim/db/schema_v1.sql` | ✅ In repo — 8 tables |
| `poke-sim/db/seed_teams_v2.sql` | ✅ In repo — 22 teams |
| `poke-sim/db/rls_policies_v1.sql` | ⚠️ MERGE CONFLICTS — resolve first |
| `poke-sim/supabase_adapter.js` | ⚠️ MERGE CONFLICTS — resolve first |
| `poke-sim/db/README_DB.md` | ⚠️ MERGE CONFLICTS — resolve after above two |

### Tables in schema
teams, team_members, pokemon, moves, rulesets,
matchups, analyses, analysis_win_conditions, analysis_logs

### RLS Policy Summary (anon key)
| Table | Read | Write |
|-------|------|-------|
| teams, team_members, pokemon, moves, rulesets, matchups | ✅ open | ❌ blocked |
| analyses, analysis_win_conditions, analysis_logs | ✅ open | ✅ open (no auth) |

### supabase_adapter.js Architecture
- Supabase JS CDN loaded in `index.html` before other scripts
- Key injection: `window.__SUPABASE_KEY__` — NEVER hardcode
- Offline fallback: try/catch on every method, falls back to localStorage
- Methods: `loadTeams()`, `saveAnalysis(payload)`, `getMatchupHistory(playerKey, oppKey)`
- `SupabaseAdapter.enabled` — boolean guard
- `SupabaseAdapter.DEFAULT_RULESET_ID` — canonical ruleset string

---

## ⛔ CURRENT BLOCKERS — RESOLVE IN ORDER

### BLOCKER 1 — Merge conflicts (MUST resolve before M4)

**Files with unresolved merge markers (`<<<<<<<`, `=======`, `>>>>>>>`):**
1. `poke-sim/supabase_adapter.js` ← resolve FIRST (browser API must be stable)
2. `poke-sim/db/rls_policies_v1.sql` ← resolve SECOND (reconcile against schema_v1.sql)
3. `poke-sim/db/README_DB.md` ← resolve LAST (update after adapter + RLS are known)

**Resolution rules:**
- Keep BOTH sides of any additive change (e.g., new table, new method)
- For competing implementations: keep the version that is fail-soft and offline-safe
- Never keep a version that hardcodes credentials or service-role keys
- After resolution: `grep -r "<<<<<<\|=======\|>>>>>>>" poke-sim/` must return zero results

### BLOCKER 2 — Payload contract conflict
- `engine.js` contains `buildAnalysisPayload()` (one contract)
- `db_m4_save_tests.js` expects `_buildAnalysisPayload` (different contract)
- **Resolution:** Choose ONE canonical name and location (recommend: `buildAnalysisPayload` in `engine.js`, thin wrapper in `supabase_adapter.js`). Tests and UI must use the same function.

### BLOCKER 3 — M4 not yet wired in ui.js
- `saveAnalysis()` exists in `supabase_adapter.js` but is NOT called after `runBoSeries()` / `runSimulation()` in `ui.js`
- Cannot wire until BLOCKER 1 + 2 are resolved

### BLOCKER 4 — Node test execution blocked
- `Access is denied` error during local test run — developer must fix Node permissions before running tests
- All tests in `poke-sim/tests/` must pass before M4 ships

### BLOCKER 5 — sw.js cache stale
- Current: `champions-sim-v9-m3-init-wired`
- Required for M4: `champions-sim-v10-m4-save-analysis`
- Do NOT bump until runtime source conflicts are resolved and M4 is wired

---

## REQUIRED PR SEQUENCE

### PR 1 — Docs/QC cleanup and conflict triage plan (NO runtime changes)
**Scope:**
- Document merge conflicts in `supabase_adapter.js`, `rls_policies_v1.sql`, `README_DB.md`
- Update this MASTER_PROMPT.md with correct source-of-truth values
- Add/update any stale documentation
- Do not modify runtime source, DB schema/RLS, tests, bundle output, or `sw.js`

**Gate:** PR 1 must be merged before conflict-resolution work proceeds.

### Conflict resolution — required before PR 2
**Scope:**
- Remove merge markers from `supabase_adapter.js`, `rls_policies_v1.sql`, `README_DB.md`
- Confirm adapter API surface and fail-soft behavior
- Run conflict-free verification: `grep -r "<<<<<<" poke-sim/` returns zero results

### PR 2 — M4 persistence implementation
**Entry criteria (ALL must be true):**
- [ ] PR 1 merged
- [ ] Conflict-resolution work complete
- [ ] All merge markers removed
- [ ] `supabase_adapter.saveAnalysis(payload)` has ONE canonical signature confirmed
- [ ] `buildAnalysisPayload` vs `_buildAnalysisPayload` reconciled
- [ ] RLS policies verified append-safe
- [ ] No service-role key anywhere in source
- [ ] `.env.example` has no realistic-looking secrets

**Scope:**
- Wire M4 fire-and-forget block in `ui.js` after `runSimulation()` resolves
- Update `db_m4_save_tests.js` for the reconciled payload contract
- Bump `sw.js` CACHE_NAME to `champions-sim-v10-m4-save-analysis`
- Rebuild bundle locally: `cd poke-sim && python3 tools/build-bundle.py`
- Commit bundle + sw.js together

### PR 3 — Infrastructure hardening
**Scope:**
- DB test CI (run `db_m4_save_tests.js` in GitHub Actions)
- PR template with validation checklist
- Bundle rebuild validation improvement
- Cache bump enforcement CI

---

## M4 CANONICAL PAYLOAD CONTRACT

**One canonical builder. One canonical name. Used by both tests and runtime.**

```javascript
// Location: engine.js (or supabase_adapter.js thin wrapper)
// Name: buildAnalysisPayload (canonical — not _buildAnalysisPayload)

function buildAnalysisPayload(result, opts) {
  return {
    engine_version:    'v1',
    ruleset_id:        window.SupabaseAdapter?.DEFAULT_RULESET_ID ?? 'default',
    player_team_id:    opts.playerKey,
    opp_team_id:       opts.oppKey,
    bo:                opts.bo || 1,
    sample_size:       result.total || opts.bo || 1,
    wins:              result.wins || 0,
    losses:            result.losses || 0,
    draws:             result.draws || 0,
    win_rate:          result.winRate || 0,
    confidence_interval: result.confidenceInterval ?? null,
    avg_turns:         result.avgTurns || 0,
    avg_tr_turns:      result.avgTrTurns || 0,
    policy_model:      'random',
    analysis_json:     result,
    win_conditions:    result.winConditions || [],
    logs:              (result.logs || []).slice(0, 50),   // CAP AT 50 — contract
    seed_refs:         result.seeds ?? []
  };
}
```

**Rules:**
- Payload construction is shared between tests and runtime — same function, same file
- Logs MUST be capped at 50 before persistence
- Persistence MUST happen AFTER UI render completes
- Persistence MUST be fire-and-forget — never awaited on UI path
- Persistence failure MUST never block battle simulation or result display

---

## M4 WIRING BLOCK (for ui.js — insert after runSimulation resolves, after showInlinePilotCard)

```javascript
// M4 / POK-20 — persist analysis result to Supabase (fire-and-forget)
// IMPORTANT: use actual local variable names from ui.js at the call site
if (window.SupabaseAdapter && window.SupabaseAdapter.enabled) {
  (async () => {
    try {
      const payload = buildAnalysisPayload(result, {
        playerKey: currentPlayerKey,
        oppKey:    oppKey,
        bo:        currentBo
      });
      const id = await window.SupabaseAdapter.saveAnalysis(payload);
      if (id) console.info('[M4] Analysis persisted:', id);
    } catch (e) {
      console.warn('[M4] saveAnalysis non-blocking:', e?.message ?? e);
    }
  })();
}
```

---

## PRODUCTION TEAM — ROLES & RESPONSIBILITIES

Every change must be reviewed through this lens. Codex should apply these gates automatically.

### 🏆 Product Owner — @TheYfactora12 (Kevin)
- Final decision authority on feature scope, acceptance criteria, and ship/no-ship
- Owns user-facing decisions: team data, format rules, UI flows, coach language
- Reviews every PR for product fit before merge
- Escalates to @alfredocox for engineering architecture decisions

### 🔧 Engineering Lead — @alfredocox (Alfredo)
- Owns engine architecture, refactors, performance, and security decisions
- Final say on `engine.js`, `data.js`, and bundle pipeline
- Reviews PRs touching simulation logic, damage formula, and data contracts
- Source of truth on upstream repo state

### 🧪 QA Lead — @Jdoutt38
- Owns test suite completeness and accessibility
- Runs local Node test suite before any PR merge
- Must confirm: `node tests/audit.js` (5070-battle sweep) passes clean
- Catches merge marker leakage and TDZ variable bugs

### 🗄️ Data Engineer / DB Role (Codex / AI)
- Owns `supabase_adapter.js`, `schema_v1.sql`, `rls_policies_v1.sql`, `seed_teams_v2.sql`
- Ensures RLS policies are append-safe, anon-only, no service-role key committed
- Validates DB schema matches adapter method signatures
- Confirms `analyses`, `analysis_win_conditions`, `analysis_logs` table contracts

### 🎨 Frontend / PWA Role (Codex / AI)
- Owns `ui.js`, `index.html`, `style.css`, `sw.js`
- Ensures save hook runs AFTER render, never before
- Bumps CACHE_NAME on every release touching runtime source
- Runs bundle rebuild after every source change
- Confirms `var COVERAGE_CHECKS` is preserved (TDZ guard — see critical bug below)

### 📊 Domain Expert / Simulation Role (Codex / AI)
- Owns `engine.js`, `legality.js`
- Guards damage formula, TR turns, weather turns, and bring-N-of-6 logic
- Ensures `buildAnalysisPayload` contract is correct and shared
- Confirms BO result object structure is stable before M4 wiring

### 🔒 Security Role (Codex / AI)
- Scans every commit for hardcoded keys, tokens, or realistic-looking secrets
- Verifies `.env.example` contains only placeholder values
- Confirms anon client only — service-role key never in frontend source
- Reviews RLS policies for append-safety before any DB schema push

### 📋 TPM / Release Role (Codex / AI)
- Enforces PR sequence: PR 1 → PR 2 → PR 3
- Blocks M4 wiring until conflict triage PR is merged
- Ensures every PR has a validation checklist
- Tracks milestone closure and changelog entries

### 📝 Docs Role (Codex / AI)
- Keeps MASTER_PROMPT.md as single source of truth
- Updates DEVELOPMENT_RUNBOOK.md after each milestone
- Fixes stale values when detected (CACHE_NAME, bundle size, file paths)
- Adds changelog entries after every shipped milestone

### 📈 Growth / UX Role (Codex / AI)
- Does NOT surface Supabase errors loudly to end user
- Ensures all failure states are silent / console-only
- Confirms offline behavior is indistinguishable from online for the player
- Validates "save failure does not block battle" before any M4 merge

---

## VALIDATION CHECKLIST (run before EVERY PR merge)

### Conflict check
```bash
grep -r "<<<<<<\|=======\|>>>>>>>" poke-sim/
# Must return zero results
```

### Node test suite (run locally — fix Node permissions if blocked)
```bash
cd poke-sim
node tests/items_tests.js
node tests/status_tests.js
node tests/mega_tests.js
node tests/coverage_tests.js
node tests/t9j8_tests.js
node tests/t9j9_tests.js
node tests/t9j10_tests.js
node tests/t9j11_tests.js
node tests/t9j12_tests.js
node tests/t9j13_tests.js
node tests/t9j14_tests.js
node tests/t9j15_tests.js
node tests/t9j16_tests.js
node tests/audit.js
# For M4+:
node tests/db_m4_save_tests.js
```

### Bundle rebuild (after any source file change)
```bash
cd poke-sim && python3 tools/build-bundle.py
git add poke-sim/pokemon-champion-2026.html
```

### Browser smoke test
- [ ] Open app locally (`npx serve .` in `poke-sim/`)
- [ ] Run single simulation → result renders
- [ ] Run all matchups → all 22 results render
- [ ] Console: zero JS errors
- [ ] Supabase unavailable → UI does NOT crash
- [ ] `saveAnalysis` failure → no visible error to user
- [ ] Service worker: confirm CACHE_NAME bumped if source changed

### Security scan
- [ ] `grep -r "service_role\|anon.*[A-Za-z0-9+/]\{20\}" poke-sim/` → zero hits
- [ ] `.env.example` contains only placeholder text (e.g., `YOUR_SUPABASE_KEY`)

---

## CRITICAL BUG — DO NOT CHANGE THIS

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```

This is referenced during initialization before its declaration line is reached.
`const`/`let` would throw a Temporal Dead Zone (TDZ) ReferenceError and break the app.
Every rebuild must verify `var` is preserved. Do not "fix" this without restructuring initialization order.

---

## SERVICE WORKER CACHE HISTORY

| Version | Tag | Ships with | Status |
|---------|-----|-----------|--------|
| `champions-sim-v1` | — | Foundation | Retired |
| `champions-sim-v2` | — | T9j.1–T9j.6 | Retired |
| `champions-sim-v3` | — | T9j.7–T9j.15 | Retired |
| `champions-sim-v4-t9j16` | T9j.16 | Coaching engine | Retired |
| `champions-sim-v5-phase3` | phase3 | Strategy tab | Retired |
| `champions-sim-v9-m3-init-wired` | M3 | DB init + offline chip | ✅ Current |
| `champions-sim-v10-m4-save-analysis` | M4 | saveAnalysis wiring | 🔜 Next |

**CACHE_NAME bump rule:** Must update on every release touching `engine.js`, `data.js`, `ui.js`, or `style.css`.

---

## ARCHITECTURE OVERVIEW

### State Variables (ui.js)
```javascript
let currentPlayerKey = 'player';    // active player team key
let currentFormat    = 'doubles';   // 'doubles' | 'singles'
let currentBo        = 1;           // 1 | 3 | 5 | 10
let lastAllResults   = null;        // cached Run All results
var BRING_SELECTION  = {};          // teamKey → ordered array of mon names
var BRING_MODE       = {};          // teamKey → 'manual' | 'random'
```

### Engine Entry Points (engine.js)
```javascript
runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress)   // → Promise<results>
runAllMatchups(numBattles, onProgress, onMatchupDone)               // iterates all opponents
buildAnalysisPayload(result, opts)                                   // canonical M4 payload builder
```

### Battle Result Contract
```javascript
{
  result, turns, trTurns, pHpSum, oHpSum,
  leads:        { player, opponent },
  bring:        { player, opponent },
  legality:     { player, opp },
  winConditions: [],
  logs:          [],
  seeds:         [],
  log, winCondition, seed
}
```

### Damage Formula
baseDmg = floor((floor((250/5+2) BP * Atk / Def) / 50) + 2)
crit = rng() < critChance(stage)
roll = 0.85 + Math.random() * 0.15 ← NON-DETERMINISTIC
total = floor(baseDmg * STAB * typeEff * spreadMult * multiscale * crit * roll)

### Sprites
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png

### Known Sprite Gaps
- `Golurk-Mega` (custom mega — no PokeAPI dex entry)
- Fix: strip `-Mega`/`-Alola`/etc. suffix before dex lookup, add `CUSTOM_FORM_SPRITES` override map

---

## 22 LOADED TEAMS

### Tournament (13)
| Key | Description |
|-----|-------------|
| `player` | TR Counter Squad — Incineroar / Arcanine / Garchomp / Whimsicott / Rotom-Wash / Garchomp-Scarf |
| `mega_altaria` | Mega Altaria |
| `mega_dragonite` | Mega Dragonite |
| `mega_houndoom` | Mega Houndoom |
| `rin_sand` | Rin Sand |
| `suica_sun` | Suica Sun |
| `cofagrigus_tr` | Cofagrigus Trick Room |
| `champions_arena_1st` | Hyungwoo Shin — Champions Arena Winner |
| `champions_arena_2nd` | Jorge Tabuyo — Champions Arena Finalist |
| `champions_arena_3rd` | Juan Benítez — Champions Arena Top 3 |
| `chuppa_balance` | Chuppa Cross IV — Pittsburgh Champion |
| `aurora_veil_froslass` | Aurora Veil Froslass |
| `kingambit_sneasler` | Kingambit + Sneasler Core |

### Imported / Archetype (9)
| Key | Description |
|-----|-------------|
| `custom_1776995210260` | User-imported custom team |
| `perish_trap_gengar` | Perish Trap Gengar |
| `rain_offense` | Rain Offense |
| `trick_room_golurk` | TR Golurk-Mega |
| `sun_offense_charizard` | Sun Offense Charizard |
| `z2r_feitosa_mega_floette` | Feitosa Mega Floette |
| `benny_v_mega_froslass` | Benny V Mega Froslass |
| `lukasjoel1_sand_gengar` | Lukasjoel1 Sand Gengar |
| `hiroto_imai_snow` | Hiroto Imai Snow |

---

## MILESTONES

| Milestone | Name | Status |
|-----------|------|--------|
| M1 | Engine Truth (v1.0) | ~19/23 closed |
| M2 | Dynamic Strategy Coach (v1.1) | ✅ T9j.16 shipped |
| M3 | DB Init Wired (v1.2) | ✅ loadTeamsFromDB + offline chip |
| M4 | Save Analysis (v1.3) | 🔴 BLOCKED — conflicts unresolved |
| M5 | Meta Intelligence (v1.4) | Pending external data |
| M6 | Polish & Launch (v2.0) | Pending M1-M5 |
| M7 | Architecture & Modularity (v2.1) | #77-#80 |
| M8 | Profile & Sync (v2.2) | #81-#86 |
| M9 | Observability & QA (v2.3) | #87-#91, #95 phases 1+2 done |
| M10 | Performance & Quality (v2.4) | #92-#96 |
| M11 | Advanced Features (v2.5) | #97-#99, Tera deferred |

---

## CHANGELOG

### 2026-04-30 — M4 (POK-20) planning — NO-SHIP gate active
- M4 wiring blocked by merge conflicts in supabase_adapter.js, rls_policies_v1.sql, README_DB.md
- PR 1 (conflict triage) must merge before any M4 runtime changes
- Canonical payload contract defined: `buildAnalysisPayload` in `engine.js`
- CACHE_NAME target for M4: `champions-sim-v10-m4-save-analysis`
- Bundle rebuild required locally after M4 lands (GitHub API cannot run python3 tools/build-bundle.py)

### 2026-04-28 — M3 (POK-19) shipped
- `loadTeamsFromDB()` awaited during DOMContentLoaded in `ui.js`
- DB offline chip wired via `#db-offline-chip`
- 22 teams confirmed from live DB
- CACHE_NAME: `champions-sim-v9-m3-init-wired`, bundle ~918 KB

### 2026-04-25 — #95 Phases 1+2 shipped
- CACHE_NAME bumped to `champions-sim-v4-t9j16`
- `tools/release.sh` added for auto-bump
- Cross-platform (BSD + GNU sed)

---

## TABS

`Simulator` | `Teams` | `Set Editor` | `Strategy` | `Replay Log` | `Sources` | `Pilot Guide`

---

## COMMIT CONVENTIONS

- ASCII hyphens only — no em-dashes
- Format: `type: description - Refs #N`
- Types: `feat`, `fix`, `infra`, `docs`, `test`, `revert`
- Assignment:
  - @TheYfactora12 — product, features, user-facing decisions
  - @alfredocox — engineering, infra, perf, security
  - @Jdoutt38 — testing + a11y

---

## SHIP GATE

🔴 **NO-SHIP** until:
1. PR 1 merged (all merge markers removed)
2. `supabase_adapter.saveAnalysis` has confirmed single payload signature
3. `buildAnalysisPayload` vs `_buildAnalysisPayload` reconciled to one name
4. All Node tests pass locally
5. Browser smoke: single run + run-all pass with zero console errors
6. No service-role key anywhere in source
7. RLS policies verified append-safe

🟢 **SHIP** when all 7 gates are green → Codex pushes to `TheYfactora12/Pokemon-Champions-Sim-Planner`.
What to do right now:

Commit this file to TheYfactora12/Pokemon-Champions-Sim-Planner as poke-sim/MASTER_PROMPT.md (replace existing)

Tell Codex: "Read MASTER_PROMPT.md. Start at PR 1. Resolve the three merge-conflicted files in order. Do not touch ui.js, engine.js, or sw.js until PR 1 is merged."

Once PR 1 is green, tell Codex: "PR 1 is merged. Proceed to PR 2. Reconcile buildAnalysisPayload, wire M4, add tests, bump cache, rebuild bundle, push to TheYfactora12/Pokemon-Champions-Sim-Planner."

Daily Edge: The no-ship gate is your circuit breaker — it keeps Codex from writing valid-looking code on top of a broken foundation. Resolve conflicts first, wire second. Every production incident I've seen in this pattern traces back to someone wiring persistence before the adapter API surface was stable.

Prepared by Deep Research
