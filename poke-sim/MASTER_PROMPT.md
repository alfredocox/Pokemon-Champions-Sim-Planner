# MASTER PROMPT — Pokémon Champion 2026

> **(c) 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.**
> **Proprietary — see `LICENSE`. Pokémon IP attribution: see `NOTICE.md`.**
> **Canonical product tagline: "Battle-tested. Always evolving."**
>
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **first message** in a new Perplexity AI chat.
> The AI will have full project context instantly.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA.

**GitHub repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
**Default branch:** `main`
**Active dev branch:** `fix/engine-gauntlet-11bugs` (all engine fixes go here; merge to main when tests pass)
**Space name:** Pokesim (use this context for all Space-based chats)
**Owner / committer identity:** `user.email=5zyxn9yrnt@privaterelay.appleid.com user.name=TheYfactora12`
**All new feature tickets:** assigned to `@TheYfactora12`

---

## ⚡ SESSION STARTUP CHECKLIST

Run this mentally at the start of **every** new session before writing a single line of code:

1. **Confirm the active branch.** Work target: `fix/engine-gauntlet-11bugs`. Do not code against `main` directly.
2. **Check Space file vs GitHub sync.** Space files (data.js, engine.js, ui.js) may lag behind the repo. If unsure, read the file from GitHub before editing.
3. **Confirm active milestone/issue.** Current work = T9j.17 engine fixes (see Resume Next below). Check open issues labelled `sprint-1` before starting anything new.
4. **Verify latest test evidence** before touching engine.js. The 5,070-battle audit + test suites must pass green before any PR merges.
5. **Only then code or modify prompts.**

---

## 🎯 PRODUCT PURPOSE

A browser-only VGC doubles team simulator for the April 2026 meta (Regulation M-A, Scarlet/Violet Series 3 with Mega Evolutions via the custom Champions 2026 format). No server. No build tools required. Works 100% offline from a single HTML file.

**What it is not:** not a Smogon damage calculator replacement; not a live-data meta scraper (yet); not a multiplayer tool.

---

## 👥 OWNERSHIP

| Role | GitHub handle | Responsibilities |
|---|---|---|
| Engineering / refactor / infra / perf / security | @alfredocox | Source code, build tooling, CI, architecture |
| Product / feature / testing / coaching validation / stress testing | @TheYfactora12 (Kevin Medeiros) | Feature scoping, rule design, user decisions, QA ownership |
| Testing + a11y | @Jdoutt38 | All testing issues, NVDA/VoiceOver, axe-core |
| Product signoff (launch) | @alfredocox + @TheYfactora12 | Both must approve before M6 ship gate |

---

## 🔴 KNOWN BLOCKERS / CURRENT LIMITATIONS

> These are active constraints, not future ideas. Do not ignore them.

| ID | Blocker | Impact | Fix status |
|----|---------|--------|------------|
| Space file lag | Space instructions mirror the GitHub repo but require manual re-upload. Edits to source files in Space may not reflect the latest commit. | Stale context risk on every session | Workaround: always read file from GitHub first |
| COVERAGE_CHECKS TDZ | Must be `var` in ui.js — see Critical Bug section. Cannot be `const`/`let` until #80 (lazy init) lands | App hard-breaks on load if changed | Issue #80 is the fix; Sprint 2 |
| No direct remove-team UI | Imported teams can only be cleared by overwriting the slot with another import; no one-click remove | Minor UX friction | Not yet ticketed |
| Tera activation broken | `teraActivated` always false; no active Tera trigger in engine | All sim results ignore Tera coverage | Deferred — issue #7; Champions format does not use Tera |
| Phase 4e regression test | "Same advice after 100 battles = failing" regression test does not exist yet | Phase 4 closeout blocked | Issue #54 scope; Phase 4e |
| CI not yet enforced | #87 (GitHub Actions) is in Sprint 1 queue but not yet merged | PRs can merge without automated test pass | Sprint 1 item #1 |
| Golurk-Mega sprite blank | Custom mega form not in PokeAPI dex; renders blank | Visual gap in trick_room_golurk team | Low priority; sprite gap fix PR pending |

---

## ✅ VALIDATION GATES (ship criteria)

A PR touching `engine.js` or `data.js` must pass ALL of the following before merge:

| Gate | Tool | Pass criteria |
|------|------|---------------|
| Syntax check | `node --check poke-sim/engine.js` | Zero errors |
| Unit tests — items | `node tests/items_tests.js` | 14/14 pass |
| Unit tests — status | `node tests/status_tests.js` | 27/27 pass |
| Unit tests — mega | `node tests/mega_tests.js` | 27/27 pass |
| Unit tests — coverage | `node tests/coverage_tests.js` | 9/9 pass |
| Unit tests — crits/flinch/abilities | `node tests/t9j8_tests.js` | 47/47 pass |
| Unit tests — move data | `node tests/t9j9_tests.js` | 24/24 pass |
| Unit tests — team preview | `node tests/t9j10_tests.js` | ~16/16 pass |
| 5,070-battle audit | `node tests/audit.js` | 0 JS errors, 0 crashes |
| Bundle freshness | `bash poke-sim/tools/check-bundle.sh` | No drift vs source |
| CACHE_NAME bump | `tools/release.sh <tag>` | sw.js bumped |

> **Total test floor: 343+ assertions.** Any PR that drops the count is rejected.

A PR touching `ui.js` only (no engine/data changes) may skip audit.js but must still pass all unit tests and bundle check.

---

## ▶️ RESUME NEXT

**Current active work:** T9j.17 engine mechanics — branch `fix/engine-gauntlet-11bugs`

**What T9j.17 adds (all in engine.js):**
- Frostbite status condition (1/16 chip, SpA halved, no action skip, Ice-type immune)
- Fake Out hard-gate (cannot be selected past first turn out; flag resets on switch-in)
- Piercing Drill rewrite: 25% miss chance on every move (not Protect bypass — previous impl was wrong)
- Expanding Force × Psychic Terrain: spread to all foes + 1.5× BP when grounded on Psychic Terrain
- Terrain Seeds: Grassy/Electric +1 Def, Psychic/Misty +1 SpD on switch-in to matching terrain
- Iron Head flinch nerf: 30% → 20% in Champions

**First verification step before touching any file:**
```bash
cd poke-sim/poke-sim
node --check engine.js          # must be clean
node tests/t9j8_tests.js        # 47 must pass
node tests/status_tests.js      # 27 must pass
```

**Then check the open issues on this branch:**
https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues?q=is%3Aopen+label%3Asprint-1

---

## 🌐 LIVE APP — HOW TO ACCESS

> ⚠️ **htmlpreview.github.io does NOT work** for the multi-file dev version (`poke-sim/index.html`). It works fine for the self-contained bundle.

| Method | URL / Command |
|--------|---------------|
| htmlpreview bundle (easiest) | `https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html` |
| GitHub Pages (auto-deploys) | `https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/` |
| Clone + open locally | `git clone ... && open poke-sim/pokemon-champion-2026.html` |
| Local dev server (PWA active) | `cd poke-sim && npx serve .` → `http://localhost:3000` |
| Perplexity Space deploy | `deploy_website(project_path="poke-sim/poke-sim", site_name="Champions Sim", entry_point="index.html", should_validate=False)` |

> **Bundle filename is `pokemon-champion-2026.html`.** No `-FINAL` variant exists in the repo.

---

## SOURCE OF TRUTH RULES

| Asset | Canonical source | Do not edit directly |
|-------|-----------------|----------------------|
| Source files | `poke-sim/poke-sim/` in GitHub repo | — |
| Bundle | Rebuilt from source via `python3 tools/build-bundle.py` | `pokemon-champion-2026.html` |
| Space files | Mirror of GitHub; may lag. **Always read from GitHub first.** | — |
| Test evidence | `tests/` directory in GitHub | — |
| Issue tracker | GitHub Issues | — |
| This document | `poke-sim/MASTER_PROMPT.md` (single copy) | All edits go here |

---

## REPOSITORY LAYOUT

```
Pokemon-Champions-Sim-Planner/
├── tools/
│   └── release.sh                      ← #95: auto-bumps sw.js CACHE_NAME on release
├── .github/
│   ├── workflows/
│   │   ├── cache-bump-check.yml        ← #95 Phase 3: CI fails PR if CACHE_NAME not bumped
│   │   └── bundle-freshness-check.yml  ← #88 Phase 2: CI fails PR if bundle not rebuilt
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── poke-sim/
│   ├── tools/
│   │   ├── build-bundle.py             ← #88 Phase 1: canonical rebuild script
│   │   ├── check-bundle.sh             ← #88 Phase 1: fails if bundle drifts from source
│   │   └── README.md
│   ├── poke-sim/                       ← nested dev workspace (source of truth)
│   │   ├── index.html                  ← App shell + tab structure + PWA meta
│   │   ├── style.css                   ← Full dark theme, mobile-first
│   │   ├── data.js                     ← BASE_STATS, POKEMON_TYPES_DB, DEX_NUM_MAP,
│   │   │                                  TEAMS (22 teams), MOVE_TYPES,
│   │   │                                  MOVE_CATEGORY (104 entries), MOVE_BP (110+ entries),
│   │   │                                  getSpriteUrl()
│   │   ├── engine.js                   ← Pokemon class, Field class, simulateBattle(),
│   │   │                                  runSimulation(), runAllMatchups(),
│   │   │                                  crit + flinch (T9j.8), 6 champion abilities (T9j.8),
│   │   │                                  Team Preview bring-N-of-6 (T9j.10),
│   │   │                                  T9j.17 mechanics (frostbite, fake-out gate,
│   │   │                                  Piercing Drill 25% miss, terrain seeds, Expanding Force)
│   │   ├── ui.js                       ← All UI logic: tabs, team selects, import/export,
│   │   │                                  pilot guide, PDF report, speed tiers, meta radar,
│   │   │                                  coverage checker, strategy tab,
│   │   │                                  bring-picker slot layout + drag/tap (T9j.10)
│   │   ├── strategy-injectable.js      ← TEAM_META knowledge base
│   │   ├── manifest.json               ← PWA manifest
│   │   ├── sw.js                       ← Service worker (cache-first)
│   │   ├── icon-192.png + icon-512.png ← PWA icons
│   │   ├── pokemon-champion-2026.html  ← Self-contained bundle (~685 KB) — REBUILT ARTIFACT
│   │   ├── tests/
│   │   │    ├── items_tests.js         ← 14 cases
│   │   │    ├── status_tests.js        ← 27 cases
│   │   │    ├── mega_tests.js          ← 27 cases
│   │   │    ├── coverage_tests.js      ← 9 cases
│   │   │    ├── t9j8_tests.js          ← 47 cases (crit / flinch / abilities)
│   │   │    ├── t9j9_tests.js          ← 24 cases (MOVE_CATEGORY / MOVE_BP)
│   │   │    ├── t9j10_tests.js         ← ~16 cases (Team Preview bring-N-of-6)
│   │   │    └── audit.js               ← 5070-battle regression sweep
│   │   ├── COACHING_LAYER_SPEC.md
│   │   ├── PHASE4_DYNAMIC_ADVICE_SPEC.md
│   │   ├── PHASE4C_DETECTORS_SPEC.md
│   │   ├── PHASE4D_THREAT_RESPONSE_SPEC.md
│   │   ├── PHASE4E_POLICY_AUDIT_SPEC.md
│   │   ├── PHASE5_TURN_LOG_SPEC_DRAFT.md
│   │   ├── PHASE6_COACHING_VOICE_SPEC.md
│   │   ├── PHASE_ROLLOUT_REVIEW.md
│   │   └── COACHING_NORTH_STAR.md
│   ├── DEVELOPMENT_RUNBOOK.md
│   ├── CHAMPIONS_MECHANICS_SPEC.md
│   ├── CHAMPIONS_VALIDATOR_FRAMEWORK.md
│   ├── STATUS_STACKING_RULES.md
│   ├── SPREAD_DAMAGE_SPEC.md
│   ├── BATTLE_DAMAGE_DOCUMENT.md
│   ├── GITHUB_ISSUES_TO_FILE.md
│   ├── MASTER_PROMPT.md                ← This file (single canonical copy)
│   └── README.md
```

---

## 🚨 CRITICAL BUG — DO NOT CHANGE THIS

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```

Referenced during initialization before its declaration line is reached.  
`const`/`let` throws a Temporal Dead Zone (TDZ) ReferenceError and breaks the entire app on load.  
**Fix path:** Issue #80 (lazy init pattern). Do not touch without first completing #80.  
Every rebuild must verify `var` is preserved.

---

## ⚠️ REBUILD WARNING

The bundle is a **rebuilt artifact**, not an editable file.

```bash
# From poke-sim/ directory — run after ANY source file change
cd poke-sim && python3 tools/build-bundle.py
```

`sw.js` is NOT inlined. It is standalone — only active via local dev server or GitHub Pages.

---

## RELEASE PROCEDURE

Mandatory steps before merging any PR that touches `engine.js`, `data.js`, `ui.js`, `style.css`, `strategy-injectable.js`, or `index.html`:

1. Finish feature/fix on branch
2. `cd poke-sim && python3 tools/build-bundle.py`
3. `chmod +x tools/release.sh && ./tools/release.sh <tag>`
4. `git diff --cached poke-sim/poke-sim/pokemon-champion-2026.html`
5. `git diff --cached poke-sim/sw.js`
6. `git commit -m "feat: <description> - Refs #N"`
7. Update `MASTER_PROMPT.md` to reflect the change
8. Open PR — CI checks verify steps 2 and 3

---

## ARCHITECTURE OVERVIEW

### Key state variables (ui.js)
```javascript
let currentPlayerKey = 'player';       // active player team key
let currentFormat    = 'doubles';      // 'doubles' | 'singles'
let currentBo        = 1;              // 1 | 3 | 5 | 10
let lastAllResults   = null;           // cached Run All results
var BRING_SELECTION  = {};             // teamKey -> ordered array of mon names
var BRING_MODE       = {};             // teamKey -> 'manual' | 'random'
```

### Engine entry points (engine.js)
```javascript
runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress)   // single matchup
runAllMatchups(numBattles, onProgress, onMatchupDone)              // all 12 opponents
// simulateBattle opts: format, playerBring, opponentBring, playerLeads, opponentLeads, seed, strict
```

### Damage formula
```
baseDmg = floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2)
crit    = rng() < critChance(stage)          // T9j.8 seeded PRNG
roll    = 0.85 + rng() * 0.15               // seeded PRNG
total   = floor(baseDmg * STAB * typeEff * spreadMult * screenMod * critMod * roll)
```

### Move data (T9j.9)
- `MOVE_CATEGORY` (104 entries) — `'physical' | 'special' | 'status'`
- `MOVE_BP` (110+ entries) — base power integer
- Both in `data.js`; engine reads them first, falls back to heuristics with `console.warn`

### Format rules (T9j.10 — Team Preview bring-N-of-6)
| Format | Team size | Bring | Leads | Bench |
|--------|-----------|-------|-------|-------|
| Doubles | 6 | 4 of 6 | 2 | 2 |
| Singles | 6 | 3 of 6 | 1 | 2 |

### Sprites
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png`  
Known sprite gap: `Golurk-Mega` (custom mega, no PokeAPI entry — renders blank).

---

## 22 LOADED TEAMS

### Tournament + custom (13)
| Key | Team |
|-----|------|
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
| `aurora_veil_froslass` | Aurora Veil Froslass |
| `kingambit_sneasler` | Kingambit + Sneasler Core |

### Imported / archetype (9)
| Key | Team |
|-----|------|
| `custom_1776995210260` | User-imported custom |
| `perish_trap_gengar` | Perish Trap Gengar |
| `rain_offense` | Rain Offense |
| `trick_room_golurk` | TR Golurk-Mega (sprite gap) |
| `sun_offense_charizard` | Sun Offense Charizard |
| `z2r_feitosa_mega_floette` | Feitosa Mega Floette |
| `benny_v_mega_froslass` | Benny V Mega Froslass |
| `lukasjoel1_sand_gengar` | Lukasjoel1 Sand Gengar |
| `hiroto_imai_snow` | Hiroto Imai Snow |

---

## TABS

`Simulator` | `Teams` | `Set Editor` | `Strategy` | `Replay Log` | `Sources` | `Pilot Guide`

- **Strategy tab** — Phase 2 (PR #106). Adaptive banner (State 1/2/3) + Record bar (total W-L + per-archetype splits).
- **Pilot Guide** — upserts one card per opponent after every single sim (PR #118); does not require Run All.

---

## SERVICE WORKER CACHE HISTORY

**Current:** `champions-sim-v5-emptystate1` (v2.1.8-emptystate.1, PR #121)

| Version | Ships with | Status |
|---------|-----------|--------|
| `champions-sim-v1` | Foundation | Retired |
| `champions-sim-v2` | T9j.1–T9j.6 | Retired |
| `champions-sim-v3` | T9j.7–T9j.15 | Retired |
| `champions-sim-v4-t9j16` | Coaching engine | Retired |
| `champions-sim-v5-phase3` | Strategy tab + persistence | Retired |
| `champions-sim-v5-phase4a` | Sim log + koEvents | Retired |
| `champions-sim-v5-phase4b` | Adaptive state machine | Retired |
| `champions-sim-v5-pilotfix1` | Pilot Guide after every sim | Retired |
| `champions-sim-v5-recordbar1` | Record bar + sim presets | Retired |
| `champions-sim-v5-mirror1` | Both-sides sim log mirroring | Retired |
| `champions-sim-v5-emptystate1` | Record bar empty-state guidance | **✅ Current** |

**Bump rule:** update on every release touching `engine.js`, `data.js`, `ui.js`, or `style.css`.  
**How:** `./tools/release.sh <tag>` from repo root.

---

## ISSUE #88 + #95 STATUS

Both fully complete. CI enforces:
- `Verify bundle is fresh` — fails PR if bundle drifts from source
- `Verify sw.js CACHE_NAME bumped` — fails PR if cache not bumped

**Remaining action (repo owner only):** Enable branch protection required checks at  
https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/settings/branches

---

## COMMIT CONVENTIONS

- **ASCII hyphens only** in commit messages — no em-dashes
- Format: `type: description - Refs #N` (`Refs` not `Fixes`)
- Types: `feat`, `fix`, `infra`, `docs`, `test`, `revert`
- Build chip in `index.html` `<span class="build-version">`: bump on every commit

**Current chip:** `v2.1.8-emptystate.1`

---

## COACHING LAYER ROLLOUT

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Spec doc | ✅ Merged |
| 2 | Strategy tab + theory engine | ✅ Merged |
| 3 | Per-team report persistence | ✅ Merged |
| 4a | Sim log foundation + koEvents | ✅ Merged |
| 4b | Adaptive state machine + consistency score | ✅ Merged |
| 4b+ | Pilot Guide after every single sim | ✅ Merged |
| 4b+ | Record bar + sim presets (10/50/100/500) | ✅ Merged |
| 4b+ | Both-sides sim log mirroring | ✅ Merged |
| 4b+ | Record bar empty-state guidance | ✅ Merged |
| **4c** | **Detectors: dead moves, lead perf, loss conditions, confidence badges** | **Spec locked — ready for implementation** |
| **4d** | **Threat Response: MC solver 200 sims × 4 branches, line classification** | **Spec locked — ready for implementation** |
| **4e** | **Policy audit + "same advice after 100 battles = failing" regression test (PHASE CLOSEOUT BLOCKER)** | **Spec locked — ready for implementation** |
| 5a-c | Structured turnLog, positionScore, winProbabilityDelta | Draft |
| 6 | Coaching voice + PRE/IN/POST templates, RNG blame, banned-phrasings linter | Spec locked |
| 7 | Source labels + stress test polish | Open |

**Coaching hard invariants (never violate):**
1. No draws surfaced in UI
2. "Same advice after 100 battles = failing" — Phase 4e regression test blocks closeout
3. No data fabrication across storage keys (Phase 3 aggregates ≠ Phase 4 per-series log)
4. Population qualifier within one sentence of every `%` shown to users
5. Banned phrasings: `tournament-grade`, `tournament-tested` (without stage qualifier), `pro-approved`, `meta-proven`, `world's #1`
6. Surface candidates, not directives — use "consider" / "best candidate" / "first option to try"

---

## PHASE 4 ADAPTIVE STATE MACHINE

| State | Condition | Banner |
|-------|-----------|--------|
| 1 | `total_battles === 0` | "Theory-based coaching" |
| 2 | `1 <= total_battles < 15` | "Early data — N more to reach mature confidence" |
| 3 | `total_battles >= 15` | "Mature data" |

`CS_STATE_MATURE_THRESHOLD = 15` — always read via constant; never hard-code.

**Storage keys:**
- `champions_sim_log_v1` — Phase 4 raw per-series log (append-only, 500 cap, 100/pair)
- `champions_strategy_report_v1` — Phase 3 aggregate snapshots (not decomposable into per-series W-L)
- `poke-sim:bring:v1` — T9j.10 bring picker selections
- `champions_evidence_chips_visible` — Section 14 evidence toggle

> Phase 3 and Phase 4 keys are **independent.** Old Phase 3 aggregates do NOT retroactively populate the Phase 4 Record bar.

---

## MILESTONES

| Milestone | Version | Status |
|-----------|---------|--------|
| M1 Engine Truth | v1.0 | 19/23 closed; T9j.17 closes remainder |
| M2 Dynamic Strategy Coach | v1.1 | ✅ Shipped |
| M3 Piloting Analytics | v1.2 | Partial (replay log live; trends pending) |
| M4 Tournament Ready PDF | v1.3 | ✅ Shipped |
| M5 Meta Intelligence | v1.4 | Pending external data source |
| M6 Polish & Launch | v2.0 | Pending M1-M5 + M7-M10 |
| M7 Architecture & Modularity | v2.1 | #77-#80 |
| M8 Profile & Sync | v2.2 | #81-#86 |
| M9 Observability & QA | v2.3 | **#88 ✅ #95 ✅** — #87 CI still open |
| M10 Performance & Quality | v2.4 | #92-#96 |
| M11 Advanced Features | v2.5 | #97-#99 + deferred #7 Tera |

---

## SPRINT QUEUE (priority order)

| Sprint | Items | Status |
|--------|-------|--------|
| Sprint 1 | #87 CI/GitHub Actions, #78 namespace, #79 storage adapter | 🏃 In queue |
| Sprint 2 | #80 COVERAGE_CHECKS lazy init, #89 structured logger, #94 XSS hardening | Blocked on Sprint 1 CI green |
| Sprint 3 | #77 ui.js file split, #90 analytics tests backfill | Blocked on Sprint 2 |
| Sprint 4 | #84 schema versioning, #81 profile system, #82 export/import | Blocked on Sprint 1 storage adapter |

---

## COACHING TICKET AUDIT

| Ticket | Title | Status |
|--------|-------|--------|
| #53 | Lead pair win-rate table | Data in `lead_performance`; UI pending Phase 4c |
| #54 | Suboptimal decision flagger | Phase 4e scope |
| #55 | Personal weakness dashboard | `record_by_archetype` covers headline; close after Phase 4c confidence badges |
| #65 | Meta-Weighted Threat Radar | Not started — Phase 4d adjacent |
| #72 | Trend Dashboard Mega Timing Heatmap | Not started |
