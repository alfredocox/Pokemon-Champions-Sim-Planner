# MASTER PROMPT — Pokémon Champion 2026
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **first message** in a new Perplexity AI chat.
> The AI will have full project context instantly.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA.

**GitHub repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
**Default branch:** `main`
**Active dev branch:** `main` (fix/champions-sp-and-legality was merged; all work goes to main)
**Space name:** Pokesim (use this context for all Space-based chats)
**Owner / committer identity:** `user.email=5zyxn9yrnt@privaterelay.appleid.com user.name=TheYfactora12`
**All new feature tickets:** assigned to `@TheYfactora12`

---

## LIVE APP — HOW TO ACCESS

> ⚠️ **htmlpreview.github.io does NOT work** for the multi-file dev version (`poke-sim/index.html`). It works fine for the self-contained bundle.

### ✅ Working ways to open the app

**Option 1 — htmlpreview bundle link (easiest, no setup):**
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html
```

**Option 2 — GitHub Pages (same bundle, auto-deploys on push):**
```
https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/
```

**Option 3 — Clone and open locally:**
```bash
git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git
cd Pokemon-Champions-Sim-Planner/poke-sim
open pokemon-champion-2026.html   # macOS
start pokemon-champion-2026.html  # Windows
```

**Option 4 — Local dev server (full PWA, service worker active):**
```bash
cd poke-sim
npx serve .
# Open: http://localhost:3000
```

**Option 5 — Perplexity Space deploy (preview URL only visible to owner):**
Space instruction `deploy_website(project_path="poke-sim/poke-sim", site_name="Champions Sim", entry_point="index.html", should_validate=False)`

> **Why htmlpreview works for the bundle but not index.html:** The bundle (`pokemon-champion-2026.html`) is fully self-contained — all CSS/JS inlined. htmlpreview works fine for it. The multi-file `index.html` loads `data.js`, `engine.js`, `ui.js`, `style.css` as separate files which fail cross-origin.

> ⚠️ **The live bundle filename is `pokemon-champion-2026.html`.** There is no `-FINAL` variant in the repo. Do not use `pokemon-champion-2026-FINAL.html` — that file does not exist and will 404.

---

## WHAT THIS PROJECT IS

A browser-only VGC doubles team simulator for April 2026 meta (Regulation M-A, Scarlet/Violet Series 3 with Mega Evolutions via Alfredo's custom Champions 2026 format). No server. No build tools required. Works 100% offline from a single HTML file.

---

## REPOSITORY LAYOUT

```
Pokemon-Champions-Sim-Planner/
├── tools/
│   ├── release.sh     ← #95 Phase 2: auto-bumps sw.js CACHE_NAME on release
│   └── build.py       ← #88: canonical bundle builder (run from repo root)
│                         python3 tools/build.py            # normal build
│                         python3 tools/build.py --check    # CI freshness check
├── .github/
│   ├── workflows/
│   │   ├── cache-bump-check.yml       ← #95 Phase 3: CI fails PR if CACHE_NAME not bumped
│   │   └── bundle-freshness-check.yml ← #88: CI fails PR if bundle not rebuilt
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── poke-sim/
│   ├── poke-sim/                       ← nested dev workspace (source of truth)
│   │   ├── index.html                  ← App shell + tab structure + PWA meta
│   │   ├── style.css                   ← Full dark theme, mobile-first
│   │   ├── data.js                     ← BASE_STATS, POKEMON_TYPES_DB, DEX_NUM_MAP,
│   │   │                                  TEAMS (22 teams: 13 tournament + 9 imported), MOVE_TYPES,
│   │   │                                  MOVE_CATEGORY (104 entries, T9j.9),
│   │   │                                  MOVE_BP (110+ entries, T9j.9),
│   │   │                                  getSpriteUrl()
│   │   ├── engine.js                   ← Pokemon class, Field class, simulateBattle(),
│   │   │                                  runSimulation() (Monte Carlo), runAllMatchups(),
│   │   │                                  crit + flinch (T9j.8), 6 champion abilities (T9j.8),
│   │   │                                  Team Preview bring-N-of-6 (T9j.10)
│   │   ├── ui.js                       ← All UI logic: tabs, team selects, import/export,
│   │   │                                  pilot guide, PDF report, speed tiers, meta radar,
│   │   │                                  coverage checker, strategy tab,
│   │   │                                  bring-picker slot layout + drag/tap (T9j.10)
│   │   ├── strategy-injectable.js      ← TEAM_META knowledge base
│   │   ├── manifest.json               ← PWA manifest
│   │   ├── sw.js                       ← Service worker (cache-first) — CACHE_NAME: see SW CACHE HISTORY table
│   │   ├── icon-192.png                ← PWA icon
│   │   ├── icon-512.png                ← PWA icon
│   │   ├── pokemon-champion-2026.html  ← Self-contained single-file bundle (~685 KB)
│   │   ├── tests/
│   │   │    ├── items_tests.js         ← 14 cases
│   │   │    ├── status_tests.js        ← 27 cases
│   │   │    ├── mega_tests.js          ← 27 cases
│   │   │    ├── coverage_tests.js      ← 9 cases
│   │   │    ├── t9j8_tests.js          ← 47 cases (crit / flinch / abilities)
│   │   │    ├── t9j9_tests.js          ← 24 cases (MOVE_CATEGORY / MOVE_BP)
│   │   │    ├── t9j10_tests.js         ← ~16 cases (Team Preview bring-N-of-6)
│   │   │    └── audit.js               ← 5070-battle regression sweep
│   │   ├── COACHING_LAYER_SPEC.md      ← Phase 1-3 coaching spec (Sections 1-14)
│   │   ├── PHASE4_DYNAMIC_ADVICE_SPEC.md ← Phase 4 adaptive coaching spec v2
│   │   │                                  (state machine + threat response + policy audit)
│   │   └── MASTER_PROMPT.md            ← **This file** (canonical copy)
│   ├── DEVELOPMENT_RUNBOOK.md          ← Full dev history, architecture, QA log
│   ├── CHAMPIONS_MECHANICS_SPEC.md     ← Authoritative mechanics reference
│   ├── CHAMPIONS_VALIDATOR_FRAMEWORK.md ← Validator framework doc (T9j.8)
│   ├── STATUS_STACKING_RULES.md        ← Status conditions spec
│   ├── SPREAD_DAMAGE_SPEC.md           ← Doubles spread damage spec
│   ├── BATTLE_DAMAGE_DOCUMENT.md       ← Damage formula reference
│   ├── GITHUB_ISSUES_TO_FILE.md        ← Backlog log
│   ├── MASTER_PROMPT.md                ← stale root copy (tech debt — see note below)
│   └── README.md                       ← Quickstart guide
```

> ⚠️ **Two MASTER_PROMPT.md files exist.** The canonical one is `poke-sim/poke-sim/MASTER_PROMPT.md` (this file). The root-level `poke-sim/MASTER_PROMPT.md` is an older copy and should be either removed or git-symlinked to the canonical one in a future cleanup PR. All edits must go to the canonical (inner) copy.

---

## SERVICE WORKER CACHE HISTORY (#95)

Phases 1 and 2 of #95 are **COMPLETE**.

| Version | Tag | Ships with | Commit / PR | Status |
|---------|-----|-----------|-------------|--------|
| `champions-sim-v1` | — | Foundation | — | Retired |
| `champions-sim-v2` | — | T9j.1–T9j.6 | — | Retired |
| `champions-sim-v3` | — | T9j.7–T9j.15 | `8977090` | Retired |
| `champions-sim-v4-t9j16` | T9j.16 | Coaching engine | `944b405` | Retired |
| `champions-sim-v5-phase3` | phase3 | Strategy tab + persistence (#106 #108) | `2a01cce` | Retired |
| `champions-sim-v5-phase4a` | phase4a | Sim log foundation + koEvents | PR #113 | Retired |
| `champions-sim-v5-phase4b` | phase4b | Adaptive state machine + team_history + consistency | PR #115 | Retired |
| `champions-sim-v5-pilotfix1` | pilotfix1 | Pilot Guide populates after every single sim | PR #118 | Retired |
| `champions-sim-v5-recordbar1` | recordbar1 | Record bar total + per-archetype splits (sim counts 10/50/100/500) | PR #119 | Retired |
| `champions-sim-v5-mirror1` | mirror1 | Both-sides sim log mirroring (opponent-only teams populate) | PR #120 | Retired |
| `champions-sim-v5-emptystate1` | emptystate1 | Record bar legacy vs new empty-state guidance | PR #121 | **✅ Current (v2.1.8-emptystate.1)** |

**#95 Remaining phases:**
- ~~Phase 3: CI check enforces bump was not forgotten~~ ✅ COMPLETE (2026-04-25)

**CACHE_NAME bump rule:** Must be updated on every release that changes `engine.js`, `data.js`, `ui.js`, or `style.css`. Format: `champions-sim-v{major}-{release-tag}`.

**How to run the release script:**
```bash
# From repo root
chmod +x tools/release.sh         # first time only
./tools/release.sh t9j17           # bump to next tag
./tools/release.sh t9j17 --bump-major  # also increment major version
```

---

## ISSUE #88 — BUNDLE FRESHNESS CHECK

**Title:** infra: Automated bundle-freshness check (fail PR on bundle drift)
**Milestone:** M9 Observability & QA
**Priority:** P0
**Assigned:** @alfredocox

### Phase 1 — tools/build.py ✅ COMPLETE (2026-04-25)
- `tools/build.py` added — canonical bundle builder extracted from MASTER_PROMPT inline one-liner
- Normal mode: `python3 tools/build.py` — builds bundle in place (replaces old inline command)
- Check mode: `python3 tools/build.py --check` — diffs fresh build vs committed bundle, exits 1 if stale
- Prints exact fix command in failure output
- Run from repo root

### Phase 2 — CI enforcement ✅ COMPLETE (2026-04-25)
- `.github/workflows/bundle-freshness-check.yml` added
- Triggers on every PR targeting `main`
- Detects if `index.html`, `style.css`, `data.js`, `engine.js`, `ui.js`, or `strategy-injectable.js` changed
- If yes: runs `python3 tools/build.py --check` — fails PR if bundle not rebuilt
- Passes silently for docs/tests/infra-only PRs
- Does NOT block direct pushes to main (hotfix escape hatch preserved)
- Job name: `Verify bundle is fresh` — add this to branch protection required checks

### Phase 3 — Branch Protection (action required: repo owner)
- Required status check `Verify bundle is fresh` must be added to `main` branch protection rule
- Go to: https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/settings/branches
- Add rule for `main`, enable "Require status checks to pass", select:
  - `Verify bundle is fresh` (this issue)
  - `Verify sw.js CACHE_NAME bumped` (#95)
- Enable "Require branches to be up to date before merging"
- Enable "Do not allow bypassing the above settings"
- ⚠️ Trigger the workflow first by opening a draft PR so the check name appears in the dropdown

---

## REBUILD PROCEDURE (replaces the old inline one-liner)

The canonical build command is now:
```bash
# From repo root
python3 tools/build.py
```

This replaces the old inline Python one-liner from earlier versions of this prompt. The script reads all 6 source files from `poke-sim/poke-sim/`, inlines them, and writes the bundle to `poke-sim/poke-sim/pokemon-champion-2026.html`.

**CI check mode (run automatically on every PR):**
```bash
python3 tools/build.py --check
```
Exits 0 if bundle is fresh, exits 1 with fix instructions if stale.

---

## TABS

`Simulator` | `Teams` | `Set Editor` | `Strategy` | `Replay Log` | `Sources` | `Pilot Guide`

**Strategy tab** added in Phase 2 (PR #106). Phase 4b now paints an **adaptive banner** (State 1/2/3) + a **Record bar** showing total W-L plus per-archetype splits, reading from the Phase 4 per-series sim log. See `## COACHING LAYER ROLLOUT` and `## PHASE 4 - ADAPTIVE COACHING` below.

**Pilot Guide tab** upserts one card per opponent after every single sim (PR #118 — no longer requires Run All Matchups to appear).

---

## 22 LOADED TEAMS

### Tournament + custom (13)
| Key | Team Description |
|-----|-----------------|
| `player` | TR Counter Squad — Incineroar / Arcanine / Garchomp / Whimsicott / Rotom-Wash / Garchomp-Scarf |
| `mega_altaria` | Mega Altaria — pokepaste dfdfa66d317cf9d7 |
| `mega_dragonite` | Mega Dragonite — pokepaste dd101585183c9ed6 |
| `mega_houndoom` | Mega Houndoom — pokepaste 4a87b07998f6c0c4 |
| `rin_sand` | Rin Sand — pokepaste e97ac67f1ce79c33 |
| `suica_sun` | Suica Sun — pokepaste cb48d8b06c73d33b |
| `cofagrigus_tr` | Cofagrigus Trick Room |
| `champions_arena_1st` | Hyungwoo Shin — Champions Arena Winner |
| `champions_arena_2nd` | Jorge Tabuyo — Champions Arena Finalist |
| `champions_arena_3rd` | Juan Benítez — Champions Arena Top 3 |
| `chuppa_balance` | Chuppa Cross IV — Pittsburgh Champion |
| `aurora_veil_froslass` | Aurora Veil Froslass team |
| `kingambit_sneasler` | Kingambit + Sneasler Core |

### Imported / archetype (9)
| Key | Team Description |
|-----|-----------------|
| `custom_1776995210260` | User-imported custom team |
| `perish_trap_gengar` | Perish Trap Gengar |
| `rain_offense` | Rain Offense |
| `trick_room_golurk` | TR Golurk-Mega (sprite gap: custom mega form, see Sprite Gaps section) |
| `sun_offense_charizard` | Sun Offense Charizard |
| `z2r_feitosa_mega_floette` | Feitosa Mega Floette |
| `benny_v_mega_froslass` | Benny V Mega Froslass |
| `lukasjoel1_sand_gengar` | Lukasjoel1 Sand Gengar |
| `hiroto_imai_snow` | Hiroto Imai Snow |

---

## FORMAT RULES (Team Preview bring-N-of-6 — T9j.10)

| Format  | Team size | Bring | Leads | Bench |
|---------|-----------|-------|-------|-------|
| Doubles | 6         | 4 of 6| 2     | 2     |
| Singles | 6         | 3 of 6| 1     | 2     |

- Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
- Cite: https://bulbapedia.bulbagarden.net/wiki/VGC
- Cite: https://bulbapedia.bulbagarden.net/wiki/Lead_Pok%C3%A9mon

---

## ARCHITECTURE OVERVIEW

### State Variables (ui.js)
```javascript
let currentPlayerKey = 'player';       // active player team key
let currentFormat    = 'doubles';      // 'doubles' | 'singles'
let currentBo        = 1;              // 1 | 3 | 5 | 10
let lastAllResults   = null;           // cached Run All results

// T9j.10 — Team Preview bring-N-of-6 state
var BRING_SELECTION = {};  // teamKey -> ordered array of mon names (length = bring count)
var BRING_MODE      = {};  // teamKey -> 'manual' | 'random' (default random for non-player)
// Persisted to localStorage under key 'poke-sim:bring:v1'
```

### Engine Entry Points (engine.js)
```javascript
// Single matchup — returns Promise<results>
runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress)

// All matchups — iterates all 12 opponents
runAllMatchups(numBattles, onProgress, onMatchupDone)

// simulateBattle() accepts opts:
//   opts.format          'doubles' | 'singles'
//   opts.playerBring     array of mon names (T9j.10, preferred)
//   opts.opponentBring   array of mon names (T9j.10, preferred)
//   opts.playerLeads     legacy — leads-only override (kept for back-compat)
//   opts.opponentLeads   legacy — leads-only override (kept for back-compat)
```

### Battle Result Contract (T9j.10)
```javascript
{
  result, turns, trTurns, pHpSum, oHpSum,
  leads:   { player, opponent },  // 2 names doubles / 1 singles
  bring:   { player, opponent },  // 4 names doubles / 3 singles
  legality:{ player, opp },
  log, winCondition, seed, ...
}
```
All UI code reads `battle.leads.player` and `battle.bring.player` directly — no log-string parsing.

### Damage Formula
```
baseDmg = floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2)
crit    = rng() < critChance(stage)                 ← T9j.8 (Serebii crit stages)
roll    = 0.85 + Math.random() * 0.15               ← NON-DETERMINISTIC
total   = floor(baseDmg * STAB * typeEff * spreadMult * multiscale * crit * roll)
```
Engine is confirmed non-deterministic. Bo10 results differ from Bo1 as expected.

### Move Data (T9j.9 — MOVE_CATEGORY + MOVE_BP)
- `data.js` ships two authoritative tables:
  - `MOVE_CATEGORY` (104 entries) — `'physical' | 'special' | 'status'`
  - `MOVE_BP` (110+ entries) — base power integer
- `isPhysical(move)` in `engine.js` is **data-driven** — consults `MOVE_CATEGORY` first, falls back to name heuristics with `console.warn` on miss
- Cite: https://www.serebii.net/attackdex-sv/

### Trick Room
- TR lasts exactly 5 turns (`field.trickRoomTurns` increments each `endOfTurn()`)
- Speed is inverted via `getEffSpeed()`: `if (field.trickRoom) spe = 10000 - spe`
- TR is toggled on/off correctly — re-using Trick Room while active cancels it

### Weather
- Weather lasts 8 turns (or permanent for Sand Stream)
- Entry abilities (Drought, Drizzle, Sand Stream) fire on switch-in via `processEntryAbilities()`
- **KNOWN ISSUE (P3 #8):** When both teams have weather setters, last switch-in wins but mid-game weather override priority is not fully modeled.

### Sprites
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png
```

---

## CRITICAL BUG — DO NOT CHANGE THIS

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```

This is referenced during initialization before its declaration line is reached.
`const`/`let` would throw a Temporal Dead Zone (TDZ) ReferenceError and break the app completely on load.
This is a known architectural limitation — do not "fix" it without restructuring initialization order. Every rebuild must verify `var` is preserved.

---

## ⚠️ REBUILD WARNING — READ BEFORE TOUCHING SOURCE FILES

The bundle (`pokemon-champion-2026.html`) is the rebuilt artifact — generated from the source files (`index.html`, `style.css`, `data.js`, `engine.js`, `ui.js`, `strategy-injectable.js`). It is **not** edited directly.

**Rebuild procedure (canonical — use this, not the old inline one-liner):**
```bash
# From repo root
python3 tools/build.py
```

**sw.js is NOT inlined into the bundle.** It is a standalone file served by the PWA runtime — only active when the app is loaded via a local dev server or GitHub Pages, never via htmlpreview. Changes to `sw.js` do not require a bundle rebuild.

---

## ISSUE #95 — SERVICE WORKER CACHE AUTOMATION

**Title:** infra: automate sw.js CACHE_NAME bump on release
**Milestone:** M9 Observability & QA
**Assigned:** @TheYfactora12

### Phase 1 — Manual bump ✅ COMPLETE (commit `944b405`, 2026-04-25)
- `CACHE_NAME` bumped from `champions-sim-v3` to `champions-sim-v4-t9j16`
- Added comment block documenting the bump scheme
- `SPRITE_CACHE` kept at `champions-sprites-v1` (no CDN changes)

### Phase 2 — tools/release.sh ✅ COMPLETE (2026-04-25)
- `tools/release.sh` added — auto-bumps `CACHE_NAME` in `poke-sim/sw.js`
- Accepts explicit tag arg (`./tools/release.sh t9j17`) or auto-detects from CHANGELOG.md
- Optional `--bump-major` flag for breaking engine changes
- Guards against no-op (same tag) and failed sed rewrite
- Cross-platform: handles BSD sed (macOS) and GNU sed (Linux)
- Stages `sw.js` via `git add`, does NOT auto-commit — engineer reviews diff first
- Prints exact `git commit` command with correct `Refs #95` message

### Phase 3 — CI enforcement ✅ COMPLETE (2026-04-25)
- `.github/workflows/cache-bump-check.yml` added
- Triggers on every PR targeting `main`
- Fails if engine.js/data.js/ui.js/style.css/strategy-injectable changed but sw.js did not
- Prints exact `./tools/release.sh <tag>` fix command in the failure message
- Passes silently when no app source files changed (docs, tests, infra-only PRs)
- Does NOT block direct pushes to main (hotfix escape hatch preserved)

---

## RELEASE PROCEDURE (every engineer must follow this)

This section defines the mandatory steps before merging any PR that touches app source files.
The CI checks (#95 Phase 3, #88 Phase 2) enforce steps 2 and 3 — but the full procedure is the human contract.

### When to follow this
Any PR that modifies one or more of:
- `poke-sim/engine.js`
- `poke-sim/data.js`
- `poke-sim/ui.js`
- `poke-sim/style.css`
- `poke-sim/strategy-injectable.js`
- `poke-sim/index.html`

### Steps
1. Finish your feature/fix on a branch
2. Run the bundle builder from repo root:
     ```bash
     python3 tools/build.py
     ```
3. Run the release script from repo root:
     ```bash
     chmod +x tools/release.sh    # first time only
     ./tools/release.sh <tag>     # e.g. ./tools/release.sh t9j17
     ```
4. Review the staged changes:
     ```bash
     git diff --cached poke-sim/poke-sim/pokemon-champion-2026.html
     git diff --cached poke-sim/sw.js
     ```
5. Commit both alongside your source changes:
     ```bash
     git commit -m "feat: <description> - Refs #N"
     ```
6. Update MASTER_PROMPT.md to reflect your change
7. Open PR — both CI checks will verify steps 2 and 3 were done

### What happens if you skip step 2
The `bundle-freshness-check` CI job will fail your PR with a clear message showing which files changed and the exact command to fix it.

### What happens if you skip step 3
The `cache-bump-check` CI job will fail your PR with a clear message showing which files changed and the exact command to fix it.

---

## COMMIT CONVENTIONS

- **ASCII hyphens only** in commit messages — no em-dashes
- Format: `type: description - Refs #N` (use `Refs`, not `Fixes` — close is explicit via PR merge)
- Types: `feat`, `fix`, `infra`, `docs`, `test`, `revert`
- Assignment policy:
  - TheYfactora12 — product / feature scoping, rule design, user-facing decisions
  - alfredocox — engineering refactors, infra, perf, security
  - Jdoutt38 — testing + a11y

### Build version chip
A visible build chip lives in the header (`<span class="build-version">` in `index.html`). Bump on every commit so testers can confirm which build they are on:
- During an active phase: `vMAJOR.MINOR.0-phaseN.M` where M increments per commit (e.g. `v2.0.0-phase2.1`, `v2.0.0-phase2.2`)
- On phase merge to main: drop the suffix and bump the next phase prefix (e.g. `v2.0.0` → `v2.1.0-phase3.1`)
- Tied to the CACHE_NAME bump — when the chip changes major/minor, `tools/release.sh <tag> --bump-major` should also fire.

**Current chip:** `v2.1.8-emptystate.1` (PR #121, CACHE_NAME `champions-sim-v5-emptystate1`).

---

## COACHING LAYER ROLLOUT

Multi-phase rollout for the Strategy tab + coaching engine. Tracked in `poke-sim/poke-sim/COACHING_LAYER_SPEC.md` (Phases 1–3) and `poke-sim/poke-sim/PHASE4_DYNAMIC_ADVICE_SPEC.md` (Phase 4 adaptive layer).

| Phase | Scope | PRs / Issues | Status |
|-------|-------|--------------|--------|
| 1 | Spec doc | #105 / #50 | ✅ Merged |
| 2 | Strategy tab + theory engine (12 sections, 22 teams, V2 adapters) | #106 / #46 #49 | ✅ Merged (`f584a15`) |
| 3 | Per-team report persistence (localStorage Section 7 schema) | #108 / #51 | ✅ Merged (`98ffa69`) |
| 4a | Sim log foundation — `champions_sim_log_v1` + per-game koEvents | #113 / #52 | ✅ Merged |
| 4b | Adaptive state machine + `team_history` builder + consistency score + movesUsed / actionLog plumbing | #115 / #52 #53 | ✅ Merged |
| 4b+ | Pilot Guide upsert after every single sim | #118 / #55 | ✅ Merged |
| 4b+ | Record bar: total W-L + per-archetype splits + 10/50/100/500 sim presets | #119 / #53 #55 | ✅ Merged |
| 4b+ | Both-sides sim log mirroring (opponent-only teams populate Strategy view) | #120 / #95 | ✅ Merged |
| 4b+ | Record bar legacy vs new empty-state guidance | #121 / #53 #55 | ✅ Merged |
| 4c | Detectors — dead moves, lead performance, common loss conditions, confidence badges | pending / #53 #54 | Open |
| 4d | Threat Response System with Monte Carlo solver (200 sims/branch) | pending / #54 | Open |
| 4e | Policy audit / player coaching + "same advice after 100 battles = failing" regression test | pending / #54 #55 | Open |
| 5 | Source labels + Stress Test polish | pending | Open |

**Storage keys in use:**
- `champions_strategy_v1::<sig>` — legacy T9j.16 history (untouched, soft-migrated)
- `champions_strategy_report_v1` — Phase 3 Section 7 schema
- `champions_sim_log_v1` — Phase 4a raw append-only per-series log
- `champions_evidence_chips_visible` — Section 14 evidence toggle
- `poke-sim:bring:v1` — T9j.10 bring picker selections

---

## MILESTONES
- M9 Observability & QA (v2.3) — #87-#91 | **#95 ALL 3 PHASES DONE** | **#88 Phases 1+2 DONE — Phase 3 (branch protection) pending owner action**
