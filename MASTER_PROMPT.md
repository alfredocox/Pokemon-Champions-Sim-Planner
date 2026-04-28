# MASTER PROMPT — Pokémon Champion 2026
> **(c) 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.**
> **Proprietary — see `LICENSE`. Pokémon IP attribution: see `NOTICE.md`.**
> **Canonical product tagline: "Battle-tested. Always evolving."**
>
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **Space instructions** in Perplexity AI (Pokesim Space).
> The AI will have full project context in every new chat.

---

## 🗂️ SNAPSHOT — 2026-04-27

> **Branch:** [`archive/snapshot-2026-04-27`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/tree/archive/snapshot-2026-04-27)
> **Commit:** `820cc0fc`
> **Created:** April 27, 2026 — 10:33 PM EDT
> **Why:** Frozen backup of `main` before Alfredo makes structural changes. If anything breaks, revert to this branch — it is the last known-good state.

### How to restore from this snapshot
```bash
# Option 1 — check out the snapshot locally (read-only reference)
git fetch origin
git checkout archive/snapshot-2026-04-27

# Option 2 — hard-reset main back to this point (nuclear, coordinate with team first)
git checkout main
git reset --hard origin/archive/snapshot-2026-04-27
git push --force
```

> ⚠️ **Team note:** Do NOT delete `archive/snapshot-2026-04-27`. It is the safety net for the current dev cycle. Tag @TheYfactora12 before merging anything that restructures `poke-sim/` source files.

---

## 📋 TEAM CHANGELOG

> Running log of major project decisions, snapshots, and handoff events. Most recent first.

| Date | Who | Action | Notes |
|---|---|---|---|
| 2026-04-27 | @alfredocox + @TheYfactora12 | Created backup branch `archive/snapshot-2026-04-27` off `main` @ `820cc0fc` | Safety net before Alfredo's next structural change. Do NOT delete. |
| 2026-04-27 | @TheYfactora12 | Updated `MASTER_PROMPT.md` with snapshot entry + Team Changelog section | Team awareness: backup exists and is documented. |
| 2026-04-25 | @TheYfactora12 | Sprint 1–3 issues filed (#87–#92), labels + milestones applied | CI, structured logger, file split, namespace, testing, perf backlog defined. |
| 2026-04-24 | @TheYfactora12 | `storage_adapter.js` merged (PR #137), 40 tests passing | localStorage wrapper wired. CACHE_NAME bumped to v6-wire-storage-adapter. |

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA — now with a live Supabase database backend for persistent analysis storage.

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

### What exists in the repo
| File | Status |
|---|---|
| `poke-sim/db/schema_v1.sql` | ✅ In repo — 8 tables defined |
| `poke-sim/db/seed_teams_v1.sql` | ✅ In repo — 13 tournament teams |
| `poke-sim/db/rls_policies_v1.sql` | ✅ In repo — RLS policies ready |
| `poke-sim/supabase_adapter.js` | ✅ In repo — Supabase JS client, loadTeams / saveAnalysis / getMatchupHistory |

### What still needs to happen (BLOCKING)
The SQL files exist but have **NOT been executed** in Supabase yet. Tables do not exist until the owner runs:
1. `schema_v1.sql` in Supabase SQL Editor → creates tables
2. `seed_teams_v1.sql` → loads 13 teams
3. `rls_policies_v1.sql` → locks down public access

### supabase_adapter.js — Architecture
- **Supabase JS CDN** loaded in `index.html` before other scripts: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- **Key injection:** anon key delivered via `window.__SUPABASE_KEY__` — never hardcoded in source
- **Offline fallback:** every method wraps in try/catch; on failure falls back silently to localStorage / in-memory TEAMS object
- **Three methods:** `loadTeams()`, `saveAnalysis(playerKey, oppKey, result, bo)`, `getMatchupHistory(playerKey, oppKey)`
- **Project URL placeholder:** `https://YOUR_PROJECT_REF.supabase.co` — owner must supply real ref

### RLS Policy Summary (anon key)
| Table | Read | Write |
|---|---|---|
| teams, team_members, pokemon, moves, rulesets, matchups | ✅ open | ❌ blocked |
| analyses, analysis_logs | ✅ open | ✅ open (no auth required) |

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
| Cache Bump Check | `cache-bump-check.yml` | `CACHE_NAME` was bumped when engine/data/ui/style changed |

---

## COMMIT CONVENTIONS

- **ASCII hyphens only** in commit messages — no em-dashes
- Format: `type: description - Refs #N`
- Types: `feat`, `fix`, `infra`, `docs`, `test`, `revert`
- Assignment policy:
  - `@TheYfactora12` — product / feature scoping, rule design, user-facing decisions
  - `@alfredocox` — engineering refactors, infra, perf, security
  - `@Jdoutt38` — testing + a11y

---

## SHIP GATE

40-case golden test floor per ticket, 5070-battle audit 0 JS errors, primary-source citations in comments.
