# Changelog

All notable changes to **Pokemon Champion 2026** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses date-based versioning tied to T-ticket releases.

Primary sources for every mechanic are cited inline in code comments and in referenced design docs (Bulbapedia, Serebii, Smogon). All dates in America / New York timezone.

---

## [Unreleased]

### Planned
- **T9j.17** (engine closeout, closes M1) - Piercing Drill 25% miss chance, Parental Bond 0.25x second hit, Fake Out hard-gate (turn-1 only + Inner Focus immune), status weakening residuals, #36 Expanding Force x Psychic Terrain dynamic target + BP boost, #44 Terrain Seed items (Grassy/Electric/Psychic/Misty Seed)
- **M7-M11 infrastructure milestones** (23 issues, #77 - #99) across Architecture, Profile & Sync, Observability, Perf, Advanced Features

---

## [T9j.16] - 2026-04-24 (PR #100)

### Added
- **Elite Champions Coaching Engine** - 17 coaching rules total: 6 base + 3 human + 8 elite, firing through new `T9J16` module in `ui.js` (~810 lines, var-scoped, exposed via `window.T9J16`)
- `buildStrategyReport(teamKey, results, fmt)` - returns structured Strategy Report per v3 spec Step 8
- `teamSignature(team)` djb2 hash - adaptive persistence works on **any imported team**, not just the bundled 13
- Adaptive autosave on Run All Matchups via `t9j16AutoSave`; rolling 5-run history per team signature
- Inline Pilot Card panels: Elite Decisions, Lead and Recovery Plan, Coaching Summary
- PDF report sections render Strategy Report data alongside existing Pilot Guide
- `tests/t9j16_tests.js` - 58 new tests; total regression now 343/343
- localStorage key: `champions_strategy_v1::<teamSignature>`

### Validation
- 343 / 343 tests pass (258 prior + 27 status + 58 new)
- Audit 5070 battles / 0 JS errors
- Engine and data files untouched (T9j.17 mechanics tracked separately)
- Primary-source verified: Bulbapedia Fake Out priority and legality, Parental Bond 0.25 multiplier, Unseen Fist contact-only

### Infrastructure
- Filed 23 GitHub issues (#77 - #99) across 5 new milestones: M7 Architecture, M8 Profile & Sync, M9 Observability & QA, M10 Performance & Quality, M11 Advanced Features
- Deferred #7 Tera activation from M1 to M11 (not required for current Pokemon Champions 2026 season)

---

## [T9j.15] - 2026-04-24 (commit `1c196bc`)

### Added
- Best Mega Trigger Turn card in Pilot Guide (closes #71)
- PDF Matchup Guide appends "Mega Trigger" column for Mega-holding teams
- ui.js helpers: `teamHasMega`, `megaTriggerCacheKey`, `pickBestMegaRefined`, `findTurn1Baseline`, `megaTriggerSeverity`, `renderMegaTriggerCard`, `buildMegaTriggerPdfSummary`, `computeMegaTriggerSweep`
- Severity bands: green (>= +3% delta vs T1), amber (+1-3%), gray (<1%)
- In-memory cache keyed `(playerKey, oppKey, bo, format)` with 30-min TTL
- Expandable detail block with Wilson 95% CI bars

### Validation
- `t9j15_tests.js` 22/22 (total 285/285)
- Consumes `runMegaTriggerSweep()` from T9j.7; no engine changes

---

## [T9j.14] - 2026-04-24 (commit `716d598`)

### Added
- Shadow Pressure PDF master sheet (closes #75) - team-branded tournament packet with sections: Title Banner, Team Overview, Core Game Plan, Role Breakdown, Lead System, Matchup Guide, Turn Flow, Rules to Win, Bo3 Adaptation, Final Verdict, Coaching Notes
- Coaching Notes: Why You Lost trends, Suggested Move Changes, Coverage Gaps, Strategy Flags
- `COACHING_RULES` pluggable registry (10 starter rules) via `strategy-injectable.js`
- Severity tiers: Critical / Suggested / Optional (red/amber/gray)
- Pure helpers: `inferRole`, `inferWinFunction`, `inferPlaystyle`, `buildLeadSystem`, `analyzeLossTrends`, `findDeadMoves`, `findCoverageGaps`, `evaluateCoachingRules`, `_verdictFor`, `_escapeHtml`

### Validation
- `t9j14_tests.js` 25/25 (total 263/263)

---

## [T9j.13] - 2026-04-24 (commit `d96b340`)

### Fixed
- Champions format-mismatch guard + cofagrigus/aurora_veil SP rescale (closes #42)
- Root cause: both teams declared `format: "champions"` with SV-scale EVs (252/252/4 totaling 508); engine applied Champions HP formula `Base + SP + 75` to SP=252 producing HP ~Base+327, driving deterministic 100% WR
- Fix A (engine defense): `_spreadFitsChampions(evs)` guard (max <=32 AND total <=66); on mismatch falls back to SV formula and sets `formatMismatch = true` for observability
- Fix B (data correction): rescaled both teams to valid SP spreads preserving intent

### Validation
- `t9j13_tests.js` 47/47
- Post-fix audit: cofagrigus_tr 27% WR, aurora_veil_froslass 43% WR, 0 JS errors across 5070 battles
- Cites: Bulbapedia Stat Point, Game8 Champions Stat Points, Pokeos Champions Stats, Bulbapedia Effort Values

---

## [T9j.12] - 2026-04-24 (commits `ea5ef0f` + `7184740` + `c9096a6`)

### Added
- Simulator-tab bring pickers for player and opponent (closes #74)
- Shared state with Teams tab bring picker (same `poke-sim:bring:v1` localStorage key)
- `tests/nightly_bring_harness.js` - N=500 regression across 5 matchups with Wilson CI + PASS/WEAK/CEIL/FAIL verdicts
- `tests/t9j12_lead_validation.js` - empirical proof script

### Validation
- `t9j12_tests.js` 11/11
- Empirical proof (N=200 TR Counter vs Mega Altaria doubles): different 4-of-6 subset moves WR 64.5pp (CIs disjoint); lead swap 4pp within noise
- Cites: Bulbapedia Team Preview, Bulbapedia Lead Pokemon, MDN HTML Drag and Drop API, Wilson CI

---

## [T9j.11] - 2026-04-24 (commit `21d78b3`)

### Added
- Custom teams bulk import/export via file (closes #73)
- Filter chips on Teams tab
- localStorage persistence verification

### Validation
- `t9j11_tests.js` 16/16

---

## [T9j.10] - 2026-04-24 (commit `04eef39`)

### Added
- Team Preview bring-N-of-6 picker (closes #16)
- `engine.js` `_applyBring` helper + `opts.playerBring` / `opponentBring` plumbing + `battleResult.leads` + `.bring`
- `ui.js` `BRING_SELECTION` / `BRING_MODE` state, localStorage persistence under `poke-sim:bring:v1`
- Slot-layout UI (LEAD 1-2, BENCH 3-4) with drag+tap controls
- `Manual | Random 4/6` mode toggle
- `runBoSeries` resolves per-series bring lock - manual uses fixed pick, random re-rolls each series

### Validation
- `t9j10_tests.js` 16/16
- Cites: Bulbapedia Team Preview, Bulbapedia Lead Pokemon

---

## [T9j.9] - 2026-04-24 (commit `cece441`)

### Changed
- Data-driven move classification (closes #3, #24, #4)
- `data.js` gained `MOVE_CATEGORY` (104 entries) and `MOVE_BP` (110+ entries)
- `engine.js` `isPhysical` now data-driven with warn-on-miss fallback

### Validation
- `t9j9_tests.js` 24/24
- Cites: Serebii attackdex-sv

---

## [T9j.8] - 2026-04-24 (commit `f95fcd4`)

### Added
- Critical hits (Serebii stages) (closes #27)
- Flinch rolls (closes #19)
- Six champion abilities with engine hooks (closes #30): Protean-style, Stakeout, Unseen Fist, Parental Bond flag, Tough Claws, Pixilate / Aerilate variants
- `CHAMPIONS_VALIDATOR_FRAMEWORK.md` - validator framework doc
- `T9j8_VALIDATION_REPORT.md` - validation evidence

### Validation
- `t9j8_tests.js` 47/47
- Cites: Serebii Attackdex, Bulbapedia Critical Hit, Bulbapedia Flinch

---

## [T9j.7] - 2026-04-24 (commit `63963ad`)

### Added
- Dynamic Mega Evolution (closes #23)
- Mega trigger sweep + base form lead
- Fixes bug where Mega forms were permanent from turn 1

### Cites
- Bulbapedia Mega Evolution, CHAMPIONS_MEGAS registry

---

## [T9j.6] - earlier April 2026 (commit `9415bee`)

### Added
- Leftovers recovery (closes #29)
- Focus Sash HP-equals-maxHp fix (closes #8)
- Choice Scarf / Band / Specs stat boost + move lock (closes #18)
- Stat-stage reset on switch-in
- Snapshot pattern for switch-in ability triggers

---

## [T9j.4 + T9j.5] - earlier April 2026 (commit `e8f9b71`)

### Added
- Status residuals phase 2 (closes #41, #17): Poison/Toxic/Freeze/Frostbite damage, Hail/Snow residuals
- Gen 9 paralysis mechanics - removed wrong Gen 4 25% full-skip, applied correct Champions 12.5% rate
- 3-turn sleep cap per Champions rules

---

## [T9j.1 - T9j.3b] - mid April 2026

### Added
- Side state wiring + Tailwind speed boost (T9j.1, `ac50267`)
- Spread moves per-target + Wide Guard + Follow Me redirect (T9j.2, `f30a5db`)
- Aurora Veil timer and draw + active turn counters (T9j.3, `265aaed`)
- Coverage refresh on team change + speed control category + Mega base stat corrections (T9j.3b, `85d5a3c`, closes #36 #33)

---

## [Foundation] - April 2026 Week 1-2

### Added
- Initial 13-team tournament roster
- Engine: Pokemon class, Field class, simulateBattle, runSimulation (Monte Carlo), runAllMatchups
- UI: 6-tab shell (Simulator / Teams / Set Editor / Replay Log / Sources / Pilot Guide)
- Pokepaste + Showdown import/export
- Pilot Guide tab with per-matchup verdict
- PWA packaging: manifest, service worker, icons
- Single-file bundle (`pokemon-champion-2026.html`) via Python rebuild script
- Community standards (`b5a64b6`): LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, issue + PR templates

---

## Conventions

**Commit messages:** ASCII hyphens only, no em-dashes. `Refs #N T9jXX` format (not Fixes) so close is explicit via PR merge.

**Assignment policy:**
- TheYfactora12 - product / feature scoping, rule design, user-facing decisions
- alfredocox - engineering refactors, infra, perf, security
- Jdoutt38 - testing + a11y

**Ship gate:** 40-case golden test floor per ticket (relaxed for small features), 5070-battle audit 0 JS errors, primary-source citations in comments.

**Milestones:**
- M1 Engine Truth (v1.0) - 19/23 closed, T9j.17 pending to fully close
- M2 Dynamic Strategy Coach (v1.1) - T9j.16 coaching engine shipped
- M3 Piloting Analytics (v1.2) - partial (replay log live, trends pending)
- M4 Tournament Ready PDF (v1.3) - T9j.14 + T9j.16 PDF sections shipped
- M5 Meta Intelligence (v1.4) - pending external data source
- M6 Polish & Launch (v2.0) - pending M1-M5 and M7-M10 close
- M7 Architecture & Modularity (v2.1) - #77-#80
- M8 Profile & Sync (v2.2) - #81-#86 (headline ask)
- M9 Observability & QA (v2.3) - #87-#91
- M10 Performance & Quality (v2.4) - #92-#96
- M11 Advanced Features (v2.5) - #97-#99 plus deferred #7 Tera
