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
> **Created:** April 27, 2026 — last known-good state of `main` before Alfredo's structural changes.

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

> ⚠️ **Team note:** Do NOT delete `archive/snapshot-2026-04-27`. Tag @TheYfactora12 before merging anything that restructures `poke-sim/` source files.

---

## 📋 TEAM CHANGELOG

> Running log of major project decisions, snapshots, and handoff events. Most recent first.

| Date | Who | Action | Notes |
|---|---|---|---|
| 2026-04-30 | @TheYfactora12 | Added M4 Conflict Resolution Plan + QC Readiness Report to MASTER_PROMPT.md | NO-SHIP gate documented. Blocking issues recorded. PR sequence defined. |
| 2026-04-28 | @TheYfactora12 | Added April 28 changelog entry to `MASTER_PROMPT.md` | Keeping team log current — no code changes this session. |
| 2026-04-28 | @TheYfactora12 | Synced MASTER_PROMPT with current repo state | Corrected seed v2, open blockers, db file tree |
| 2026-04-27 | @alfredocox + @TheYfactora12 | Created backup branch `archive/snapshot-2026-04-27` off `main` @ `820cc0fc` | Safety net before Alfredo's next structural change. Do NOT delete. |
| 2026-04-27 | @TheYfactora12 | Updated `MASTER_PROMPT.md` with snapshot entry + Team Changelog section | Team awareness: backup exists and is documented. |
| 2026-04-25 | @TheYfactora12 | Sprint 1-3 issues filed (#87-#92), labels + milestones applied | CI, structured logger, file split, namespace, testing, perf backlog defined. |
| 2026-04-24 | @TheYfactora12 | `storage_adapter.js` merged (PR #137), 40 tests passing | localStorage wrapper wired. CACHE_NAME bumped to v6-wire-storage-adapter. |

---

## 🚨 M4 / POK-20 — QC READINESS REPORT & CONFLICT RESOLUTION PLAN

> **Status: NO-SHIP**
> This section records the documentation and conflict-triage gate before any M4 persistence implementation.
> It intentionally does not change runtime source, database SQL, tests, the service worker, or the built bundle.

---

### Repo and Path Truth

| Item | Value |
|---|---|
| Active GitHub repository | `TheYfactora12/Pokemon-Champions-Sim-Planner` |
| Clean PR 1 base checkout | `C:\Users\kevin\OneDrive\Documents\GitHub\New folder\Pokemon-Champions-Sim-Planner` on `main` |
| DB/Supabase work checkout | `C:\Users\kevin\OneDrive\Documents\GitHub\Pokemon-Champions-Sim-Planner` on `feat/db-rls-supabase-adapter` |
| Empty dir (do not use) | `C:\Users\kevin\OneDrive\Documents\New project` |
| Duplicate checkout note | Clean `GitHub\New folder` checkout is for docs/QC work. Non-duplicate checkout contains unresolved DB/Supabase work. |

---

### Active App Architecture

| Layer | File |
|---|---|
| App shell | `poke-sim/index.html` |
| Source inputs | `poke-sim/data.js`, `poke-sim/engine.js`, `poke-sim/storage_adapter.js`, `poke-sim/supabase_adapter.js`, `poke-sim/ui.js`, `poke-sim/legality.js`, `poke-sim/strategy-injectable.js` |
| Built bundle | `poke-sim/pokemon-champion-2026.html` |
| Battle engine | `poke-sim/engine.js` |
| UI simulation flow | `poke-sim/ui.js` |
| PWA cache | `poke-sim/sw.js` |
| DB adapter | `poke-sim/supabase_adapter.js` |
| DB schema / RLS | `poke-sim/db/schema_v1.sql`, `poke-sim/db/rls_policies_v1.sql` |
| Existing CI | Bundle freshness and cache bump checks only |

---

### 🔴 Blocking Findings

1. **Merge conflicts exist in:**
   - `poke-sim/supabase_adapter.js`
   - `poke-sim/db/README_DB.md`
   - `poke-sim/db/rls_policies_v1.sql`

2. **M4 save hook is not wired** into visible single-run or run-all completion paths in `poke-sim/ui.js`.

3. **Test/runtime contract mismatch:** `db_m4_save_tests.js` expects `_buildAnalysisPayload`, but `ui.js` does not currently expose that helper. `engine.js` contains `buildAnalysisPayload` but that is a different payload contract.

4. **`sw.js` still uses `champions-sim-v9-m3-init-wired`** — any future M4 changes to `ui.js`, `engine.js`, `data.js`, or `style.css` require a cache bump.

5. **Node test execution was blocked** during audit with `Access is denied` — a developer still needs to run tests locally.

---

### Required PR Sequence

| PR | Scope | Gate |
|---|---|---|
| **PR 1** | Docs / QC cleanup and conflict triage | Merge first — no runtime changes |
| **PR 2** | M4 persistence implementation after DB adapter/RLS conflicts are resolved | Requires PR 1 merged + conflicts clean |
| **PR 3** | Infrastructure hardening — DB test CI, PR template, build validation improvements | After PR 2 is stable |

> ⛔ **Do not implement M4, wire saveAnalysis, rebuild the bundle, push to main, or merge until PR 1 is merged and adapter/RLS conflicts are resolved.**

---

### M4 Canonical Payload Contract — Draft (for PR 2)

PR 2 must define **one canonical analysis payload builder** before wiring persistence.

**Required fields:**

```
ruleset_id
player_team_id
opp_team_id
bo
sample_size
wins
losses
draws
win_rate
confidence_interval   (if available)
policy_model
analysis_json
win_conditions
logs                  (capped at 50)
seed                  (if available)
```

**Rules:**
- Payload construction must be **shared by tests and runtime** — single source of truth.
- Do not maintain competing `_buildAnalysisPayload` and `buildAnalysisPayload` contracts without a clear adapter.
- Logs must be capped before persistence.
- Persistence must happen **after UI render** and must be **fire-and-forget**.
- Persistence failure must **never** block battle simulation or result display.

---

### PR 2 Entry Criteria

- [ ] All merge markers removed from DB adapter / RLS files
- [ ] `SupabaseAdapter.saveAnalysis` has one canonical payload contract
- [ ] `_buildAnalysisPayload` vs `buildAnalysisPayload` is reconciled before UI wiring
- [ ] M4 persistence is fire-and-forget and runs after result rendering
- [ ] Logs are capped before persistence
- [ ] `sw.js` cache name is bumped if runtime source changes
- [ ] Bundle rebuild happens only after source conflicts are resolved
- [ ] Required Node tests are run by a developer in an environment where `node` is executable

---

### Conflict Resolution Order

1. Resolve `poke-sim/supabase_adapter.js` first — browser adapter API must be stable before anything else.
2. Reconcile `poke-sim/db/rls_policies_v1.sql` against `poke-sim/db/schema_v1.sql`.
3. Update `poke-sim/db/README_DB.md` after adapter and RLS contract are known.
4. Only then proceed to M4 persistence wiring in `poke-sim/ui.js`.

---

### Required Decisions Before M4

1. Choose the canonical `SupabaseAdapter.saveAnalysis` payload shape.
2. Decide whether `_buildAnalysisPayload` belongs in `ui.js`, `supabase_adapter.js`, or as a thin wrapper around `engine.js buildAnalysisPayload`.
3. Confirm append-only RLS policies for `analyses`, `analysis_win_conditions`, and `analysis_logs`.
4. Confirm anonymous client behavior — verify no service-role key is committed.
5. Confirm local-only / offline behavior stays fail-soft.

---

### Release Gate Checklist

- [ ] Remove all merge markers
- [ ] Confirm `SupabaseAdapter.saveAnalysis(payload)` exists and its signature
- [ ] Confirm adapter is fail-soft
- [ ] Confirm DB schema uses `analyses`, `analysis_win_conditions`, `analysis_logs` (or document actual table contract)
- [ ] Confirm RLS policies are append-safe and do not expose secrets
- [ ] Confirm anon client only — never commit service role keys
- [ ] Confirm `.env.example` does not contain realistic-looking secrets

---

### Required Local Validation Before M4 PR

Run after conflicts are resolved:

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
```

Then run the bundle rebuild command documented in the repo.

**Browser smoke test:**
1. Open app locally
2. Run single simulation
3. Run all matchups
4. Confirm no console errors
5. Confirm persistence failure does not block UI
6. Confirm service worker cache bump if source changed

---

### Cross-Functional Gate Summary

| Persona | Status | Condition |
|---|---|---|
| Product | NO-SHIP | Until M4 creates durable saved value |
| TPM | Blocked | Split PRs required |
| Simulation | Blocked | Reconcile payload contract |
| Frontend / PWA | Blocked | Save after render, bump cache |
| Infra | Blocked | Resolve conflicts and run CI |
| QA | Blocked | Run tests locally (Node access required) |
| Data | Blocked | Adopt canonical schema |
| Domain | Blocked | Store BO/sample/CI to avoid overconfidence |
| UX | Blocked | Do not loudly surface save failure |
| Security | Blocked | No secrets, review RLS |
| Docs | Blocked | Fix source-of-truth |
| Growth | NO-SHIP | Do not launch broken persistence |

---

### M4 Conflict Resolution Plan — Merge Rules

> Status: planning only. **Do not resolve these conflicts inside PR 1.**

Files with active merge conflicts:

```
poke-sim/supabase_adapter.js
poke-sim/db/README_DB.md
poke-sim/db/rls_policies_v1.sql
```

**Resolution rules:**
- Resolve `supabase_adapter.js` first so the browser adapter API is stable before any UI wiring.
- Reconcile `rls_policies_v1.sql` against `schema_v1.sql` — ensure all tables referenced in RLS exist in schema.
- Update `README_DB.md` last, after the adapter and RLS contracts are confirmed.

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
│   ├── sw.js                       ← PWA service worker (CACHE_NAME: champions-sim-v9-m3-init-wired)
│   ├── manifest.json
│   ├── icon-192.png / icon-512.png
│   ├── pokemon-champion-2026.html  ← REBUILT BUNDLE (never edit directly — ~918 KB)
│   ├── db/
│   │   ├── schema_v1.sql           ← 8-table Supabase schema (updated 2026-04-27: added metadata col)
│   │   ├── seed_teams_v2.sql       ← ✅ USE THIS — 13 tournament teams, complete data (42 KB)
│   │   ├── seed_teams_v1.sql       ← ⚠️ DEPRECATED — superseded by v2, do not use
│   │   ├── rls_policies_v1.sql     ← Row Level Security policies (run third) — HAS MERGE CONFLICT
│   │   ├── migrations/             ← migration scripts folder
│   │   └── README_DB.md            ← full setup checklist + adapter API docs — HAS MERGE CONFLICT
│   ├── tools/
│   │   ├── build-bundle.py         ← canonical bundle rebuild (always use this)
│   │   ├── check-bundle.sh         ← SHA compare for CI
│   │   └── README.md
│   └── tests/
│       ├── storage_adapter_tests.js         ← 40 cases
│       ├── ui_storage_integration_tests.js  ← 33 cases
│       ├── items_tests.js / status_tests.js / mega_tests.js
│       ├── coverage_tests.js / audit.js
│       └── t9j8-t9j16_tests.js
└── MASTER_PROMPT.md
```

> ⚠️ `poke-sim/supabase_adapter.js` has an **active merge conflict** — resolve before M4 wiring.

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

> **P0 BLOCKER — Issue [#158](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158)**
> Owner: @alfredocox. Supabase project not yet provisioned. Lina must accept collaborator invite first.

### What exists in the repo

| File | Status |
|---|---|
| `poke-sim/db/schema_v1.sql` | ✅ In repo — 8 tables, `metadata` col added 2026-04-27 |
| `poke-sim/db/seed_teams_v2.sql` | ✅ USE THIS — 13 tournament teams, complete (42 KB) |
| `poke-sim/db/seed_teams_v1.sql` | ⚠️ DEPRECATED — do not use, v2 supersedes it |
| `poke-sim/db/rls_policies_v1.sql` | ⚠️ HAS MERGE CONFLICT — resolve before running |
| `poke-sim/supabase_adapter.js` | ⚠️ HAS MERGE CONFLICT — resolve before M4 wiring |

### What still needs to happen (BLOCKING — Alfredo owns these)

The SQL files exist but have **NOT been executed** in Supabase yet. Tables do not exist until:

1. Resolve merge conflict in `supabase_adapter.js`
2. Resolve merge conflict in `rls_policies_v1.sql`
3. `schema_v1.sql` in Supabase SQL Editor → creates 8 tables
4. `seed_teams_v2.sql` → loads 13 teams (verify 13 rows in Table Editor after)
5. `rls_policies_v1.sql` → locks down public access
6. Wire `window.__SUPABASE_URL__` and `window.__SUPABASE_KEY__` in `index.html`
7. Wire `saveAnalysis()` call in `ui.js` after `runBoSeries()` completes ← **OPEN BUG — blocked by conflict resolution**
8. Confirm CDN `<script>` load order in `index.html` (Supabase JS must load before `supabase_adapter.js`) ← **OPEN BUG**

> See `poke-sim/db/README_DB.md` for the full wiring guide, adapter API, and verification checklist.

### supabase_adapter.js — Architecture

- **Supabase JS CDN** loaded in `index.html` before other scripts: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
- **Key injection:** anon key delivered via `window.__SUPABASE_KEY__` — never hardcoded in source
- **Offline fallback:** every method wraps in try/catch; on failure falls back silently to localStorage / in-memory TEAMS object
- **Three methods:** `loadTeams()`, `saveAnalysis(playerKey, oppKey, result, bo)`, `getMatchupHistory(playerKey, oppKey)`
- **Project URL placeholder:** `https://YOUR_PROJECT_REF.supabase.co` — owner must supply real ref
- **Disable for tests:** `window.__DISABLE_SUPABASE__ = true;` (set before adapter loads)

### RLS Policy Summary (anon key)

| Table | Read | Write |
|---|---|---|
| teams, team_members, pokemon, moves, rulesets, matchups | ✅ open | ❌ blocked |
| analyses, analysis_logs | ✅ open | ✅ open (no auth required — accepted risk) |

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

1. **Resolve all merge conflicts** in `supabase_adapter.js`, `rls_policies_v1.sql`, `README_DB.md`
2. **Rebuild bundle:** `cd poke-sim && python3 tools/build-bundle.py`
3. **Bump CACHE_NAME in sw.js:** format `champions-sim-v{major}-{tag}` — current: `champions-sim-v9-m3-init-wired` → next: `champions-sim-v10-m4-save-analysis`
4. **Commit both artifacts:** `git add poke-sim/pokemon-champion-2026.html poke-sim/sw.js`
5. **Push and wait for CI green:** Bundle Freshness Check + Cache Bump Check both must pass

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
