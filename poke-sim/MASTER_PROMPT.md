# MASTER PROMPT — Pokémon Champion 2026
> **(c) 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.**
> **Proprietary — see `LICENSE`. Pokémon IP attribution: see `NOTICE.md`.**
> **Canonical product tagline: "Battle-tested. Always evolving."**
>
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **Space instructions** in Perplexity AI (Pokesim Space).
> The AI will have full project context in every new chat.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA — now with a live Supabase database backend for persistent analysis storage. **DB integration is mid-rollout** — see `## SUPABASE DATABASE LAYER` below for the active 9-module plan and TDD suite.

**GitHub repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
**Default branch:** `main`
**Active dev branch:** `main` (all work goes directly to main)
**Space name:** Pokesim
**Owner / committer identity:** `user.email=5zyxn9yrnt@privaterelay.appleid.com user.name=TheYfactora12`
**All new feature tickets:** assigned to `@TheYfactora12`

---

## PROJECT FILES — CANONICAL LOCATIONS

> ⚠️ Source files live at `poke-sim/` (one level). There is NO `poke-sim/poke-sim/` nesting.

```
Pokemon-Champions-Sim-Planner/
├── .github/workflows/
│   ├── bundle-freshness-check.yml
│   └── cache-bump-check.yml
├── tools/                          ← ROOT tools (release.sh = sw.js bump; build.py = legacy)
├── poke-sim/
│   ├── index.html                  ← main app shell, all tabs, PWA meta tags, SW reg
│   ├── style.css                   ← full mobile-first dark theme
│   ├── data.js                     ← BASE_STATS, POKEMON_TYPES_DB (500+ mons), TEAMS (13 teams)
│   ├── engine.js                   ← battle sim engine, Bo series runner, damage formula
│   ├── ui.js                       ← all UI logic, team selects, import/export, pilot guide, PDF
│   ├── storage_adapter.js          ← localStorage wrapper API (Issue #79, PR #134/#135/#137)
│   ├── supabase_adapter.js         ← Supabase sync layer — loadTeams, saveAnalysis, getMatchupHistory
│   ├── strategy-injectable.js      ← injectable coaching strategy layer
│   ├── legality.js                 ← VGC legality checker
│   ├── sw.js                       ← PWA service worker (CACHE_NAME: champions-sim-v6-wire-storage-adapter)
│   ├── manifest.json
│   ├── icon-192.png / icon-512.png
│   ├── pokemon-champion-2026.html  ← REBUILT BUNDLE (never edit directly — 710 KB)
│   ├── db/
│   │   ├── schema_v1.sql           ← 8-table Supabase schema (run first)
│   │   ├── seed_teams_v1.sql       ← 13 tournament teams seed data (run second)
│   │   ├── rls_policies_v1.sql     ← Row Level Security policies (run third)
│   │   └── README_DB.md
│   ├── tools/
│   │   ├── build-bundle.py         ← canonical bundle rebuild (always use this)
│   │   ├── check-bundle.sh         ← SHA compare for CI
│   │   └── README.md
│   └── tests/
│       ├── storage_adapter_tests.js         ← 40 cases
│       ├── ui_storage_integration_tests.js  ← 33 cases
│       ├── items_tests.js / status_tests.js / mega_tests.js
│       ├── coverage_tests.js / audit.js
│       └── t9j8–t9j10_tests.js
└── MASTER_PROMPT.md
```

---

## LIVE APP — HOW TO ACCESS

**Option 1 — htmlpreview bundle (easiest, no setup):**
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html
```

**Option 2 — GitHub Pages (auto-deploys on push to main):**
```
https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/
```

**Option 3 — Local dev server:**
```bash
cd poke-sim && npx serve .
# Open: http://localhost:3000
```

---

## SUPABASE DATABASE LAYER — CURRENT STATUS

### Live status (2026-04-27)
Supabase project `ymlahqnshgiarpbgxehp` (us-west-2, Postgres 17.6, ACTIVE_HEALTHY) is up. Schema, seed, and RLS were applied via the SQL editor. The adapter is scaffolded but NOT yet wired into the runtime — that's what the active integration branch handles.

### What exists in the repo
| File | Status |
|---|---|
| `poke-sim/db/schema_v1.sql` | ✅ Applied — 8 tables live (`rulesets`, `teams`, `team_members`, `prior_snapshots`, `golden_battles`, `analyses`, `analysis_win_conditions`, `analysis_logs`) |
| `poke-sim/db/seed_teams_v1.sql` | ⚠️ Applied — only 3 of 22 teams seeded; M2 backfills the remaining 19 |
| `poke-sim/db/rls_policies_v1.sql` | ✅ Applied — anon SELECT everywhere, anon INSERT only on `analyses*` |
| `poke-sim/supabase_adapter.js` | ✅ In repo — `loadTeamsFromDB`, `saveAnalysis`, `loadRecentAnalyses`. Global is `window.SupabaseAdapter` (NOT `supabase`). |
| `poke-sim/POKE_SIM_DB_INTEGRATION_PLAN_v2.md` | ✅ Canonical 9-module plan, supersedes v1 drafts |
| `poke-sim/POKE_SIM_DB_INTEGRATION_TDD_PLAN.md` | ✅ TDD companion plan — ~111 cases across 8 suites, RED-then-GREEN per module |

### Active integration branch — `integration/poke-sim-db`
All 9 module impls land on this branch. Each module is its own PR; merge into `main` only after the module's tests are GREEN.

| Module | Linear | Status |
|---|---|---|
| **M1** Wire adapter + supabase-js CDN into `index.html` and bundle | [POK-17](https://linear.app/poke-e-sim/issue/POK-17) | 🟡 In review (PR #161) |
| M2 Backfill team seed 3 → 22 + add `teams.metadata jsonb` | [POK-18](https://linear.app/poke-e-sim/issue/POK-18) | Pending |
| M3 `loadTeamsFromDB` becomes awaited source of truth on init | [POK-19](https://linear.app/poke-e-sim/issue/POK-19) | Pending |
| M4 Persist `runBoSeries` results via `SupabaseAdapter.saveAnalysis` | [POK-20](https://linear.app/poke-e-sim/issue/POK-20) | Pending |
| M5 Persist imported / Set-Editor teams (upsert teams + team_members) | [POK-21](https://linear.app/poke-e-sim/issue/POK-21) | Pending |
| M6 Replay Log tab reads history from `analyses` + `analysis_logs` | [POK-22](https://linear.app/poke-e-sim/issue/POK-22) | Pending |
| M7 `golden_battles` test runner under `tests/` | [POK-23](https://linear.app/poke-e-sim/issue/POK-23) | Pending |
| M8 `prior_snapshots` hooked into engine hidden-info model | [POK-24](https://linear.app/poke-e-sim/issue/POK-24) | Deferred |
| M9 RLS hardening, advisor sweep, baseline migration | [POK-25](https://linear.app/poke-e-sim/issue/POK-25) | Pending |

Parent: [POK-16 — Main DB Integration](https://linear.app/poke-e-sim/issue/POK-16/main-db-integration). Hard ordering: M1 → M2 → M3 → M4. Everything else fans out.

### TDD test suite — already merged ahead of impls
Following the same RED-then-GREEN pattern that landed `storage_adapter_tests.js` (PR #134) before the wire-in (PR #137):

| File | Cases | Module |
|---|---:|---|
| `poke-sim/tests/_db_helpers.js` | shared mock supabase-js client | infra |
| `poke-sim/tests/_run_all_db.sh` | runner — `bash poke-sim/tests/_run_all_db.sh` | infra |
| `poke-sim/tests/db_m1_wiring_tests.js` | 16 | M1 |
| `poke-sim/tests/db_m2_seed_tests.js` | 15 | M2 |
| `poke-sim/tests/db_m3_init_tests.js` | 12 | M3 |
| `poke-sim/tests/db_m4_save_tests.js` | 18 | M4 |
| `poke-sim/tests/db_m5_import_tests.js` | 12 | M5 |
| `poke-sim/tests/db_m6_history_tests.js` | 10 | M6 |
| `poke-sim/tests/db_m7_golden_battles_tests.js` | 8 | M7 |
| `poke-sim/tests/db_m9_hardening_tests.js` | 10 | M9 |

All 8 `db_m*_tests.js` suites are RED on `main` until each module's impl PR lands. **Ship gate per module:** the impl PR must flip its corresponding suite GREEN with no regression in the existing 302-case engine suite.

### How to run the DB tests
```bash
# All DB suites at once (from repo root):
cd poke-sim && bash tests/_run_all_db.sh

# Single module (e.g. M1 wiring after building the bundle):
cd poke-sim && python3 tools/build-bundle.py && node tests/db_m1_wiring_tests.js

# Live DB cases (gated — opt in only when reviewing M2/M9 impls):
RUN_LIVE_DB=1 SUPABASE_URL=... SUPABASE_KEY=... node tests/db_m2_seed_tests.js
```

Expected line on full success (mirrors the storage adapter precedent): `✅ all DB tests passed`.

### Hard rules (apply to every DB module)
- `COVERAGE_CHECKS` MUST stay `var` (TDZ break otherwise).
- Adapter global is `window.SupabaseAdapter`, NOT `supabase` (the CDN owns that name).
- Anon key only in any frontend file. Never expose `service_role`.
- All DB calls fail-soft (`.catch(...) → console.warn`). App must work offline.
- `team_members` is normalized — never store member arrays in `teams` JSONB.
- Re-build bundle with `tools/build-bundle.py` only — not the inline rebuild snippets from old plans.
- Use `apply_migration` (Supabase MCP) for every DDL change going forward.

---

## 13 LOADED TEAMS (keys in TEAMS object)

```
player              — TR Counter Squad (Incineroar/Arcanine/Garchomp/Whimsicott/Rotom-Wash/Garchomp-Scarf)
mega_altaria        — Mega Altaria (pokepaste dfdfa66d317cf9d7)
mega_dragonite      — Mega Dragonite (dd101585183c9ed6)
mega_houndoom       — Mega Houndoom (4a87b07998f6c0c4)
rin_sand            — Rin Sand (e97ac67f1ce79c33)
suica_sun           — Suica Sun (cb48d8b06c73d33b)
cofagrigus_tr       — Cofagrigus TR
champions_arena_1st — Hyungwoo Shin — Champions Arena Winner
champions_arena_2nd — Jorge Tabuyo — Champions Arena Finalist
champions_arena_3rd — Juan Benítez — Champions Arena Top 3
chuppa_balance      — Chuppa Cross IV — Pittsburgh Champion
aurora_veil_froslass — Aurora Veil Froslass team
kingambit_sneasler  — Kingambit + Sneasler Core
```

---

## KEY ARCHITECTURE

- **Format toggle:** `currentFormat` ('doubles'/'singles') in `ui.js`
- **Your team key:** `currentPlayerKey` (var, starts as `'player'`, user-selectable)
- **Both sides interchangeable:** player-select + opponent-select dropdowns; `rebuildTeamSelects()` keeps them in sync
- **Bo series:** `currentBo` (1/3/5/10), `runBoSeries(n, playerKey, oppKey, bo)`
- **Sprites:** `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png`
- **Import:** pokepaste URL or raw Showdown text → parses into `TEAMS[slot].members`
- **Export:** `openExportModal(teamKey)` → Showdown format text
- **After every sim:** `showInlinePilotCard(oppKey, res)` runs automatically
- **After Run All:** `generatePilotGuide()` populates Pilot Guide tab, PDF button appears
- **Download:** `buildReportText()` → .txt file with full roster + all matchup pilot notes

---

## TABS

Simulator | Teams | Set Editor | Replay Log | Sources | Pilot Guide

---

## REBUILD COMMAND (run after any source file changes)

```bash
cd poke-sim && python3 tools/build-bundle.py
```
```powershell
# Windows PowerShell
cd poke-sim; python tools\build-bundle.py
```
> ⚠️ Always use `poke-sim/tools/build-bundle.py` — NOT `tools/build.py` at repo root.

---

## RELEASE PROCEDURE (mandatory before merging any PR touching source files)

1. **Rebuild bundle:** `cd poke-sim && python3 tools/build-bundle.py`
2. **Bump CACHE_NAME in sw.js:** format `champions-sim-v{major}-{tag}` — current: `champions-sim-v6-wire-storage-adapter`
3. **Commit both artifacts:** `git add poke-sim/pokemon-champion-2026.html poke-sim/sw.js`
4. **Push and wait for CI green:** Bundle Freshness Check + Cache Bump Check both must pass

---

## CI WORKFLOWS

| Workflow | File | Enforces |
|---|---|---|
| Bundle Freshness Check | `bundle-freshness-check.yml` | `bash poke-sim/tools/check-bundle.sh` (SHA compare) |
| Cache Bump Check | `cache-bump-check.yml` | `poke-sim/sw.js` was modified |

Both watch: `poke-sim/(engine|data|ui|style|strategy-injectable|index).(js|css|html)`

**Bugs fixed in PRs #135/#136 (2026-04-26):** wrong path (`poke-sim/poke-sim/`), wrong build script (`tools/build.py`), wrong sw.js path.

---

## STORAGE ADAPTER — FULLY WIRED (Issue #79 ✅ COMPLETE — PRs #134/#135/#137)

`storage_adapter.js` wraps all `localStorage` access behind `Storage.get/set/remove/migrate()`.
- **PR #134:** Created adapter
- **PR #135:** 7 core ui.js call-site swaps
- **PR #137:** 13 additional call-site swaps, injected into index.html + bundle, added to SW cache, CACHE_NAME bumped

**Migration:** `Storage.migrate()` auto-migrates all 3 legacy keys on first load. Zero data loss.

**Tests:** `poke-sim/tests/ui_storage_integration_tests.js` — 33 assertions across 3 suites.
Run: `node poke-sim/tests/ui_storage_integration_tests.js`

---

## CRITICAL BUG — DO NOT CHANGE

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```
Referenced during init before declaration. `const`/`let` causes TDZ ReferenceError and breaks app on load. Every rebuild must verify `var` is preserved.

---

## WSL / WINDOWS NOTES

- `sed -i` on `/mnt/c/` paths fails. Use `python3 -c` for string replacement instead.
- Always run build scripts from `poke-sim/` directory.

---

## FEATURES COMPLETE ✅

- Bo1/Bo3/Bo5/Bo10 simulation
- Singles/Doubles toggle
- Pokepaste + Showdown import/export
- Add imported team as new slot OR replace existing
- Both sides fully interchangeable via dropdowns + Swap button
- Pilot Guide tab — per-matchup verdict, leads, win conditions, risks, tips
- Inline Pilot Notes card auto-shown after every single sim
- Download Results & Pilot Notes (.txt report)
- PDF Report (print API)
- Series Summary view in Replay Log
- Meta Threat Radar (Sources tab)
- Speed Tier widget — collapsible per team card
- Team Coverage checker — live in VS column
- PWA ready — manifest + service worker + icons
- Single-file bundle (710 KB) — works offline in any browser
- Storage adapter fully wired — all localStorage access abstracted
- Supabase adapter created — loadTeams, saveAnalysis, getMatchupHistory with offline fallback

---

## MILESTONES

- M1 Engine Truth (v1.0) — 19/23 closed, T9j.17 pending
- M2 Dynamic Strategy Coach (v1.1) — T9j.16 coaching engine shipped
- M3 Piloting Analytics (v1.2) — partial (replay log live, trends pending)
- M4 Tournament Ready PDF (v1.3) — shipped
- M5 Meta Intelligence (v1.4) — pending external data source
- M6 Polish & Launch (v2.0) — pending M1–M5 and M7–M10 close
- M7 Architecture & Modularity (v2.1) — #77–#80
- M8 Profile & Sync (v2.2) — #81–#86 ← **Supabase layer is the foundation for this**
- M9 Observability & QA (v2.3) — #87–#91 | #95 ALL 3 PHASES DONE | #88 ALL PHASES DONE
- M10 Performance & Quality (v2.4) — #92–#96
- M11 Advanced Features (v2.5) — #97–#99 plus deferred #7 Tera

---

## NEXT ACTIONS (as of 2026-04-27)

1. **Land M1 (PR #161)** — wires `supabase_adapter.js` + supabase-js CDN into `index.html` and the bundle. Gate: all 16 cases in `db_m1_wiring_tests.js` GREEN, plus the existing 302-case engine suite still GREEN.
2. **Open M2** ([POK-18](https://linear.app/poke-e-sim/issue/POK-18)) — backfill team seed 3 → 22 + add `teams.metadata jsonb`. Gate: `db_m2_seed_tests.js` GREEN; `select count(*) from teams` returns 22 in Supabase.
3. **Open M3** ([POK-19](https://linear.app/poke-e-sim/issue/POK-19)) — `loadTeamsFromDB` becomes the awaited source of truth on init. Gate: `db_m3_init_tests.js` GREEN; offline fallback verified.
4. **Open M4** ([POK-20](https://linear.app/poke-e-sim/issue/POK-20)) — persist `runBoSeries` results via `SupabaseAdapter.saveAnalysis`. Gate: `db_m4_save_tests.js` GREEN; one row in `analyses` per Bo run.
5. After M4 lands: fan out M5/M6/M7 in parallel; finish with M9 hardening. M8 stays deferred.
