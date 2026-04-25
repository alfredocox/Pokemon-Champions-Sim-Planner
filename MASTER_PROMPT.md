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
│   └── release.sh                      ← #95 Phase 2: auto-bumps sw.js CACHE_NAME on release
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
│   │   ├── sw.js                       ← Service worker (cache-first) — CACHE_NAME: champions-sim-v4-t9j16
│   │   ├── icon-192.png                ← PWA icon
│   │   ├── icon-512.png                ← PWA icon
│   │   ├── pokemon-champion-2026.html  ← Self-contained single-file bundle (~425 KB)
│   │   └── tests/
│   │        ├── items_tests.js         ← 14 cases
│   │        ├── status_tests.js        ← 27 cases
│   │        ├── mega_tests.js          ← 27 cases
│   │        ├── coverage_tests.js      ← 9 cases
│   │        ├── t9j8_tests.js          ← 47 cases (crit / flinch / abilities)
│   │        ├── t9j9_tests.js          ← 24 cases (MOVE_CATEGORY / MOVE_BP)
│   │        ├── t9j10_tests.js         ← ~16 cases (Team Preview bring-N-of-6)
│   │        └── audit.js               ← 5070-battle regression sweep
│   ├── MASTER_PROMPT.md                ← This file
│   ├── DEVELOPMENT_RUNBOOK.md          ← Full dev history, architecture, QA log
│   ├── CHAMPIONS_MECHANICS_SPEC.md     ← Authoritative mechanics reference
│   ├── CHAMPIONS_VALIDATOR_FRAMEWORK.md ← Validator framework doc (T9j.8)
│   ├── STATUS_STACKING_RULES.md        ← Status conditions spec
│   ├── SPREAD_DAMAGE_SPEC.md           ← Doubles spread damage spec
│   ├── BATTLE_DAMAGE_DOCUMENT.md       ← Damage formula reference
│   ├── GITHUB_ISSUES_TO_FILE.md        ← Backlog log
│   └── README.md                       ← Quickstart guide
```

---

## SERVICE WORKER CACHE HISTORY (#95)

Phases 1 and 2 of #95 are **COMPLETE**.

| Version | Tag | Ships with | Commit | Status |
|---------|-----|-----------|--------|--------|
| `champions-sim-v1` | — | Foundation | — | Retired |
| `champions-sim-v2` | — | T9j.1–T9j.6 | — | Retired |
| `champions-sim-v3` | — | T9j.7–T9j.15 | `8977090` | Retired |
| `champions-sim-v4-t9j16` | T9j.16 | Coaching engine | `944b405` | Retired |
| `champions-sim-v5-phase3` | phase3 | Strategy tab + persistence (#106 #108) | `4053ea6` | **✅ Current** |

**#95 Remaining phases:**
- Phase 3: CI check enforces bump was not forgotten (open)

**CACHE_NAME bump rule:** Must be updated on every release that changes `engine.js`, `data.js`, `ui.js`, or `style.css`. Format: `champions-sim-v{major}-{release-tag}`.

**How to run the release script:**
```bash
# From repo root
chmod +x tools/release.sh         # first time only
./tools/release.sh t9j17           # bump to next tag
./tools/release.sh t9j17 --bump-major  # also increment major version
```

---

## TABS

`Simulator` | `Teams` | `Set Editor` | `Strategy` | `Replay Log` | `Sources` | `Pilot Guide`

**Strategy tab** added in Phase 2 (PR #106). See `## COACHING LAYER ROLLOUT` below.

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

**Rebuild procedure:**
```bash
cd poke-sim
python3 build.py   # or: python3 ../t5_apply.py
```
The rebuild script inlines all source files into the single-file bundle. After any source file edit, the bundle must be rebuilt and committed together with the source changes.

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

### Phase 3 — CI enforcement (open)
- GitHub Actions check that fails the build if `CACHE_NAME` was not bumped when engine/data/ui/style changed

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

---

## COACHING LAYER ROLLOUT

Multi-phase rollout for the Strategy tab + coaching engine. Tracked in `poke-sim/COACHING_LAYER_SPEC.md`.

| Phase | Scope | PRs / Issues | Status |
|-------|-------|--------------|--------|
| 1 | Spec doc | #105 / #50 | ✅ Merged |
| 2 | Strategy tab + theory engine (12 sections, 22 teams, V2 adapters) | #106 / #46 #49 | ✅ Merged (`f584a15`) |
| 3 | Per-team report persistence (localStorage Section 7 schema) | #108 / #51 | ✅ Merged (`98ffa69`) |
| 4 | Trend Analysis hook (post-Run-All overlay) | pending / #52 #53 #54 #55 | Open |
| 5 | Source labels + Stress Test polish | pending | Open |

**Storage keys in use:**
- `champions_strategy_v1::<sig>` — legacy T9j.16 history (untouched, soft-migrated)
- `champions_strategy_report_v1` — Phase 3 Section 7 schema (`{schema_version, reports: {<sig>: {team_key, theory_report, simulation_overlay, last_built_at, last_simmed_at}}}`)
- `champions_evidence_chips_visible` — Section 14 evidence toggle
- `poke-sim:bring:v1` — T9j.10 bring picker selections

IndexedDB is explicitly deferred per Spec Section 11. v1 uses synchronous localStorage with QuotaExceededError purge of oldest 25%.

---

## SPRITE GAPS — known

`getSpriteUrl()` looks up `DEX_NUM_MAP` by exact form name. Custom mega/regional forms with no PokeAPI dex entry render blank. Confirmed misses:
- `Golurk-Mega` (custom mega in `trick_room_golurk` team)

**Planned fix (separate PR):**
1. Strip known suffixes (`-Mega`, `-Mega-X/Y`, `-Alola`, `-Galar`, `-Hisui`, `-Paldea`) before dex lookup so custom megas fall back to base dex.
2. Add `CUSTOM_FORM_SPRITES` override map for explicit team-specific art.
3. Audit all 22 teams' members programmatically and log every blank sprite.

---

## SHIP GATE

40-case golden test floor per ticket (relaxed for small features), 5070-battle audit 0 JS errors, primary-source citations in comments.

---

## MILESTONES

- M1 Engine Truth (v1.0) — 19/23 closed, T9j.17 pending to fully close
- M2 Dynamic Strategy Coach (v1.1) — T9j.16 coaching engine shipped
- M3 Piloting Analytics (v1.2) — partial (replay log live, trends pending)
- M4 Tournament Ready PDF (v1.3) — T9j.14 + T9j.16 PDF sections shipped
- M5 Meta Intelligence (v1.4) — pending external data source
- M6 Polish & Launch (v2.0) — pending M1-M5 and M7-M10 close
- M7 Architecture & Modularity (v2.1) — #77-#80
- M8 Profile & Sync (v2.2) — #81-#86 (headline ask)
- M9 Observability & QA (v2.3) — #87-#91 | **#95 Phase 1 + Phase 2 done**
- M10 Performance & Quality (v2.4) — #92-#96
- M11 Advanced Features (v2.5) — #97-#99 plus deferred #7 Tera
