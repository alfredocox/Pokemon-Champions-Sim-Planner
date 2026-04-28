# poke-sim/tools — M3 Runbook
> **Pokémon Champion 2026** · Build & Release SOP  
> Maintained by: `@TheYfactora12` · Last updated: 2026-04-27  
> **"Battle-tested. Always evolving."**

---

## ⚡ Quick Reference — Most Common Commands

```bash
# Full release (rebuild bundle + bump cache + push)
cd poke-sim
python3 tools/build-bundle.py
git add pokemon-champion-2026.html sw.js
git commit -m "release: rebuild bundle vX-tag [YYYY-MM-DD]"
git push

# Verify bundle is fresh (CI does this automatically)
bash poke-sim/tools/check-bundle.sh

# Emergency rollback to last known good snapshot
git checkout archive/snapshot-2026-04-27
```

---

## Table of Contents

1. [Repo Layout](#1-repo-layout)
2. [Scripts Reference](#2-scripts-reference)
3. [Standard Release — M3 Steps](#3-standard-release--m3-steps)
4. [Hotfix Procedure](#4-hotfix-procedure)
5. [Rollback Procedure](#5-rollback-procedure)
6. [Supabase DB Operations](#6-supabase-db-operations)
7. [CI Workflows](#7-ci-workflows)
8. [CACHE_NAME Versioning](#8-cachename-versioning)
9. [Troubleshooting](#9-troubleshooting)
10. [Team Contacts](#10-team-contacts)

---

## 1. Repo Layout

```
Pokemon-Champions-Sim-Planner/
├── .github/workflows/
│   ├── bundle-freshness-check.yml   ← CI: SHA compare on every PR
│   └── cache-bump-check.yml         ← CI: sw.js CACHE_NAME bump enforcement
├── tools/
│   └── release.sh                   ← root-level sw.js bumper (legacy)
├── poke-sim/
│   ├── index.html                   ← app shell (SINGLE SOURCE OF TRUTH)
│   ├── style.css
│   ├── data.js                      ← BASE_STATS, POKEMON_TYPES_DB, TEAMS (13 teams)
│   ├── engine.js                    ← battle engine, damage formula
│   ├── ui.js                        ← all UI logic
│   ├── storage_adapter.js           ← localStorage wrapper
│   ├── supabase_adapter.js          ← Supabase sync layer (live DB as of 2026-04-27)
│   ├── sw.js                        ← PWA service worker — CACHE_NAME here
│   ├── pokemon-champion-2026.html   ← REBUILT BUNDLE (never edit directly)
│   ├── db/
│   │   ├── schema_v1.sql
│   │   ├── seed_teams_v1.sql
│   │   └── rls_policies_v1.sql
│   └── tools/
│       ├── build-bundle.py          ← canonical bundle builder (always use this)
│       ├── check-bundle.sh          ← SHA compare for CI
│       └── README.md                ← THIS FILE
└── MASTER_PROMPT.md
```

> ⚠️ Source files live at `poke-sim/` — **NO** `poke-sim/poke-sim/` nesting.  
> ⚠️ Never edit `pokemon-champion-2026.html` directly — it is a build artifact.

---

## 2. Scripts Reference

### `build-bundle.py`
Assembles the single-file offline PWA bundle `pokemon-champion-2026.html` from all source files.

**Inlines in order:**
1. `style.css` → `<style>` block in `<head>`
2. vendored `supabase-js UMD` (~196 KB, fetched from jsDelivr and cached at `tools/vendor/`)
3. `data.js` → `engine.js` → `ui.js` → `storage_adapter.js` → `supabase_adapter.js`

**Run from `poke-sim/` directory:**
```bash
cd poke-sim && python3 tools/build-bundle.py
# Windows PowerShell:
cd poke-sim; python tools\build-bundle.py
```

**Options:**
- `--to-stdout` — prints bundle to stdout (used by `check-bundle.sh`)

**Vendor cache:** `tools/vendor/supabase-js.umd.js` is auto-created on first build. Commit it to avoid CI hitting the network.

---

### `check-bundle.sh`
Verifies the committed bundle matches a fresh rebuild (SHA compare).  
Returns exit `0` if clean, `1` if drift detected.

```bash
# Run from repo root
bash poke-sim/tools/check-bundle.sh
```

Called automatically by CI on every PR via `bundle-freshness-check.yml`.

---

## 3. Standard Release — M3 Steps

> Follow **all 6 steps** every time source files change. Do not skip steps.

### Step 1 — Pull latest `main`
```bash
git checkout main && git pull origin main
```

### Step 2 — Make your changes
Edit only files under `poke-sim/` source files:
`index.html`, `style.css`, `data.js`, `engine.js`, `ui.js`, `storage_adapter.js`, `supabase_adapter.js`

### Step 3 — Rebuild the bundle
```bash
cd poke-sim && python3 tools/build-bundle.py
```
Expected output:
```
Fetching supabase-js UMD ... (first time only)
Bundle: ~730,000 bytes -> poke-sim/pokemon-champion-2026.html
```

### Step 4 — Bump `sw.js` CACHE_NAME
Open `poke-sim/sw.js` and update **line 1 of CACHE_NAME**:

```js
// Format: champions-sim-v{major}-{short-tag}
const CACHE_NAME = 'champions-sim-v8-supabase-live';  // ← increment vN each release
```

Rules:
- Increment `vN` on every release touching engine, data, UI, or style
- `short-tag` = 2-4 word kebab-case description of the change
- Add a changelog comment line above with the date

### Step 5 — Commit both artifacts
```bash
git add poke-sim/pokemon-champion-2026.html poke-sim/sw.js
git commit -m "release: rebuild bundle vX-tag [YYYY-MM-DD] — <what changed>"
git push origin main
```

### Step 6 — Verify CI green
Both workflows must pass before the release is considered done:
- ✅ `Bundle Freshness Check` — SHA compare passes
- ✅ `Cache Bump Check` — CACHE_NAME was actually changed

---

## 4. Hotfix Procedure

Use when a **critical bug** is found in production that needs immediate fix without a full feature cycle.

```bash
# 1. Branch off main
git checkout main && git pull
git checkout -b hotfix/YYYY-MM-DD-short-description

# 2. Fix the bug in the relevant source file(s)

# 3. Rebuild bundle
cd poke-sim && python3 tools/build-bundle.py

# 4. Bump sw.js CACHE_NAME (same rules as Step 4 above)

# 5. Commit
git add poke-sim/pokemon-champion-2026.html poke-sim/sw.js
git commit -m "hotfix: [description] [YYYY-MM-DD]"

# 6. Push and merge to main immediately
git push origin hotfix/YYYY-MM-DD-short-description
# Open PR → merge to main → delete hotfix branch
```

---

## 5. Rollback Procedure

### Option A — Soft rollback (checkout snapshot, inspect, cherry-pick fix)
```bash
git fetch origin
git checkout archive/snapshot-2026-04-27
# Inspect, test, find the good version
```

### Option B — Hard rollback (reset main to snapshot — ⚠️ destructive)
```bash
git checkout main
git reset --hard archive/snapshot-2026-04-27
git push --force origin main
```

> ⚠️ Option B rewrites `main` history. Coordinate with the full team before executing.  
> Current safe snapshot: `archive/snapshot-2026-04-27` (commit `820cc0fc`)

---

## 6. Supabase DB Operations

### Current project
| Key | Value |
|---|---|
| Project URL | `https://ymlahqnshgiarpbgxehp.supabase.co` |
| Status | ✅ Live — schema + 13 teams seeded |
| Auth | anon key (read-only for teams/pokemon; open write for analyses) |

### Initial setup (already done — for reference)
```sql
-- Run in order in Supabase SQL Editor:
-- 1. poke-sim/db/schema_v1.sql
-- 2. poke-sim/db/seed_teams_v1.sql
-- 3. poke-sim/db/rls_policies_v1.sql
```

### RLS access summary
| Table | Anonymous Read | Anonymous Write |
|---|---|---|
| teams, team_members, pokemon, moves | ✅ open | ❌ blocked |
| analyses, analysis_logs | ✅ open | ✅ open |

### Adapter methods (`supabase_adapter.js`)
- `loadTeams()` — fetches all teams from DB; falls back to `TEAMS` object if offline
- `saveAnalysis(playerKey, oppKey, result, bo)` — persists matchup result
- `getMatchupHistory(playerKey, oppKey)` — retrieves past matchup records

---

## 7. CI Workflows

| Workflow | Trigger | What it checks |
|---|---|---|
| `bundle-freshness-check.yml` | Every PR to `main` | `check-bundle.sh` SHA compare |
| `cache-bump-check.yml` | Every PR to `main` | `sw.js` CACHE_NAME changed |

**If CI fails:**

_Bundle drift detected_
```bash
cd poke-sim && python3 tools/build-bundle.py
git add poke-sim/pokemon-champion-2026.html
git commit -m "chore: rebuild bundle after source changes"
git push
```

_Cache not bumped_
```bash
# Edit poke-sim/sw.js — increment vN in CACHE_NAME
git add poke-sim/sw.js
git commit -m "chore: bump sw.js CACHE_NAME"
git push
```

---

## 8. CACHE_NAME Versioning

| Version | Tag | Date | Change |
|---|---|---|---|
| v1 | `initial` | 2025 | Initial launch |
| v5 | `wire-storage-adapter` | 2026-03 | storage_adapter.js wired |
| v6 | `wire-storage-adapter` | 2026-04 | Stable |
| v7 | `phase4c2` | 2026-04 | Phase 4c2 features |
| **v8** | **`supabase-live`** | **2026-04-27** | **Supabase DB fully wired** |

Next release: use `v9-{tag}`.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Old version loads after deploy | Browser cached old SW | Hard refresh (`Shift+F5`) or clear site data |
| `Bundle drift detected` in CI | Source changed, bundle not rebuilt | Run `build-bundle.py`, commit |
| `createClient is not a function` | CDN blocked, UMD not vendored | Run build (auto-vendors UMD) |
| Supabase returns 403 | RLS blocking anon write | Check table in `rls_policies_v1.sql` |
| Supabase returns 404 | Wrong project URL | Verify `supabase_adapter.js` URL |
| Sprites not loading offline | Sprite cache cold | Open app online once to warm cache |
| Build outputs < 700 KB | UMD vendor corrupted | Delete `tools/vendor/` and rebuild |

---

## 10. Team Contacts

| Role | Handle | Responsibility |
|---|---|---|
| Project Owner | `@alfredocox` | Repo owner, final merge authority |
| Lead Dev / PM | `@TheYfactora12` | All new feature tickets, releases |

> All new feature issues → assigned to `@TheYfactora12`  
> ⚠️ Do NOT delete `archive/snapshot-*` branches — team safety net  
> Tag `@TheYfactora12` before any PR that restructures `poke-sim/`
