# Pokémon Champion 2026 — Supabase DB Integration Plan **v2 (canonical)**

> **Project:** `poke-sim` — Pokémon-Champions-Sim-Planner
> **Repo:** [github.com/alfredocox/Pokemon-Champions-Sim-Planner](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner)
> **Linear team:** `POK` — *Poke-e-Sim* (Alfredo, joshualeondoutt, kevin medeiros)
> **Supabase project:** `ymlahqnshgiarpbgxehp` (region `us-west-2`, Postgres 17.6, status `ACTIVE_HEALTHY`, owner *TheYfactora12's Project*)
> **Author:** Alfredo Cox · **Reviewers:** TheYfactora12, Joshua, Kevin
> **Last updated:** 2026-04-27
> **Status:** 🟡 Adapter scaffolded · 🔴 Not yet wired into bundle · 🔴 Seed incomplete (3/22 teams)

---

## 0. What changed since v1

The three prior drafts (`DB_INTEGRATION_PLAN.md`, `poke-sim-db-integration-plan.md`, `poke-sim-db-integration-plan-1.md`) all assumed a **fresh greenfield** schema with `teams / matchups / pilot_notes / replay_logs`. **That schema does not exist.** The live Supabase project already has a richer, normalized schema and adapter code. v2 supersedes v1 and aligns the plan with **what is actually deployed**.

| Area | v1 plans assumed | Reality (live as of 2026-04-27) |
|---|---|---|
| Tables | `teams`, `matchups`, `pilot_notes`, `replay_logs` | `rulesets`, `teams`, `team_members`, `prior_snapshots`, `golden_battles`, `analyses`, `analysis_win_conditions`, `analysis_logs` |
| Team storage | `members` JSONB column | Normalized — `teams` row + N rows in `team_members` |
| Sim result storage | `matchups` + child `pilot_notes` + `replay_logs` | Single `analyses` row + child `analysis_win_conditions` + `analysis_logs` |
| Adapter file | "to be created" | `poke-sim/supabase_adapter.js` already exists with `loadTeamsFromDB`, `saveAnalysis`, `loadRecentAnalyses` |
| `index.html` wiring | Plan step | **Not wired yet** — adapter file isn't included in `index.html` and supabase-js CDN isn't loaded |
| Seed status | Empty | 3 of 22 teams seeded (`player`, `mega_altaria`, `champions_arena_1st`); 19 missing |
| RLS | "set later" | Already enabled on every table; anon = read everywhere + insert on `analyses*` only |
| Migrations | n/a | None registered in `supabase_migrations` — schema applied via SQL editor, not via `apply_migration` |

This v2 plan **does not redesign the schema**. It maps the existing code to the existing tables and lays out the wiring + remaining work, modularly.

---

## 1. Repository layout (verified)

```
Pokemon-Champions-Sim-Planner/
├── poke-sim/
│   ├── index.html                  ← App shell (559 lines) — does NOT yet load supabase_adapter.js
│   ├── data.js                     ← TEAMS literal with 22 teams, BASE_STATS, POKEMON_TYPES_DB
│   ├── engine.js                   ← Battle sim + runBoSeries (defined ~L2351, async)
│   ├── ui.js                       ← 6,645 lines — runBoSeries calls at L1942, L1979; Replay Log L1666–
│   ├── legality.js
│   ├── strategy-injectable.js
│   ├── storage_adapter.js          ← localStorage adapter (champions:* prefix) — already shipped
│   ├── supabase_adapter.js         ← Supabase adapter — already in repo, NOT wired into index.html
│   ├── pokemon-champion-2026.html  ← Single-file bundle (built artifact, ~711 KB)
│   ├── manifest.json, sw.js, icon-*.png
│   ├── db/
│   │   ├── schema_v1.sql           ← Live schema source of truth
│   │   ├── seed_teams_v1.sql       ← Seeds only 3 teams (player, mega_altaria, champions_arena_1st)
│   │   ├── rls_policies_v1.sql     ← Enables RLS, anon read everywhere, anon insert on analyses*
│   │   └── README_DB.md
│   ├── tests/                      ← 22 Node test files incl. storage_adapter_tests.js, ui_storage_integration_tests.js
│   └── tools/
│       ├── build-bundle.py         ← Use this — replaces the inline rebuild snippet from v1
│       └── check-bundle.sh
└── (root spec files: COACHING_*.md, PHASE*_SPEC.md, etc.)
```

Bundle is built with `tools/build-bundle.py` — **stop using** the inlined Python rebuild snippet from the v1 plans.

---

## 2. Live Supabase schema (read this before coding)

Pulled live from project `ymlahqnshgiarpbgxehp`. RLS is `ENABLED` on every table.

### `rulesets` (1 row)
| Column | Type | Notes |
|---|---|---|
| `ruleset_id` | text **PK** | e.g. `champions_reg_m_doubles_bo3` |
| `format_group` | text | `Champion`, `VGC`, etc. |
| `engine_formatid` | text | e.g. `gen9championsvgc2026regma` — must match what `engine.js` consumes |
| `description` | text | |
| `custom_rules` | jsonb | `{"levelCap":50,"bring":6,"choose":4,"gameMode":"doubles"}` |
| `is_active` | bool default `true` | |

### `teams` (3 rows)
| Column | Type | Notes |
|---|---|---|
| `team_id` | text **PK** | mirrors the in-memory `TEAMS` key (e.g. `player`, `mega_altaria`) |
| `name`, `label`, `description` | text | |
| `mode` | text | `player` \| `opponent` \| `champion_pack` |
| `ruleset_id` | text FK → `rulesets` | |
| `source` | text | `builtin` \| `pokepaste` \| `manual` \| `import` |
| `source_ref` | text | e.g. `Rental: SQMPYRW6BP` |

### `team_members` (9 rows) — normalized, **not** JSONB-of-array
| Column | Type | Notes |
|---|---|---|
| `team_member_id` | bigserial **PK** | |
| `team_id` | text FK → `teams` (ON DELETE CASCADE) | |
| `slot` | int | 1..6 |
| `species`, `item`, `ability`, `nature`, `tera_type`, `role_tag` | text | |
| `level` | int default 50 | |
| `evs` | jsonb | `{hp,atk,def,spa,spd,spe}` |
| `moves` | jsonb | `["Fake Out","Flare Blitz",...]` |

### `prior_snapshots` (0 rows) — Smogon/ladder usage priors for hidden-info inference

### `golden_battles` (0 rows) — deterministic mechanics regression suite (seed → expected winner / trace hash)

### `analyses` (0 rows) — **the single row written per Bo series**
Key columns: `analysis_id` UUID PK, `created_at`, `engine_version`, `ruleset_id` FK, `player_team_id` FK, `opp_team_id` FK, `prior_id` nullable FK, `policy_model`, `sample_size`, `bo`, `win_rate` numeric(5,4), `wins`, `losses`, `draws`, `avg_turns`, `avg_tr_turns`, `ci_low`, `ci_high`, `hidden_info_model`, `analysis_json` jsonb (the full result blob).

### `analysis_win_conditions` (composite PK `(analysis_id, label)`) — top win-condition tally per analysis

### `analysis_logs` (composite PK `(analysis_id, log_index)`) — per-game stored logs (capped at 50 by adapter)

### RLS summary
- All reference tables (`rulesets`, `teams`, `team_members`, `prior_snapshots`, `golden_battles`): **anon SELECT only**
- Analysis tables (`analyses`, `analysis_win_conditions`, `analysis_logs`): **anon SELECT + INSERT** (no UPDATE/DELETE)
- No `authenticated` policies active yet — scaffold present in `rls_policies_v1.sql` (commented).

---

## 3. Mapping — in-memory app ↔ DB tables

| Frontend symbol | File / line | DB destination |
|---|---|---|
| `TEAMS` literal (22 teams) | `data.js` L823+ | `teams` + `team_members` (normalized split) |
| `currentPlayerKey`, `currentBo`, `currentFormat` | `ui.js` L53, L199 | columns on `analyses` |
| `runBoSeries(...)` | `engine.js` L~2351, called from `ui.js` L1942 (`runAllMatchupsUI`), L1979 (single-sim) | one `analyses` row per call |
| `res.allLogs[]` per-game logs | passed to `addReplays` at `ui.js` L1553, L2031 | `analysis_logs` (first 50) |
| Win-condition tallies (computed in `generatePilotGuide` L2050 / pilot card L1601) | n/a | `analysis_win_conditions` |
| Replay Log tab (`addReplays` L1671) | `ui.js` L1666–L2030 | read back from `analyses` + `analysis_logs` |
| Pokepaste/Showdown import (`parseShowdownPaste` L66, L1311, L1358) | `ui.js` | INSERT/UPSERT into `teams` + `team_members` |
| Pilot guide blob | `ui.js` L2050 (`generatePilotGuide`) | embed inside `analysis_json`; surface via `analysis_win_conditions` |
| `champions:*` localStorage keys (`storage_adapter.js`) | already shipped | **dual-write** layer — keep local, add DB write/read alongside |

Pilot notes do **not** get a dedicated table in the live schema. They live inside `analyses.analysis_json` plus `analysis_win_conditions`. This is intentional — the adapter already handles it.

---

## 4. Existing adapter API (re-use, don't rewrite)

`poke-sim/supabase_adapter.js` exports `window.SupabaseAdapter`:

```js
SupabaseAdapter.enabled                   // boolean — true iff window.__SUPABASE_URL__ + __SUPABASE_KEY__ are set
await SupabaseAdapter.loadTeamsFromDB()   // returns TEAMS-shaped object {team_id: {name,label,description,source,members[]}} or null
await SupabaseAdapter.saveAnalysis(payload)   // returns analysis_id (uuid) or null
await SupabaseAdapter.loadRecentAnalyses(limit=20)  // returns [{analysis_id, created_at, ...}]
```

Auto-behavior on `DOMContentLoaded` (when enabled): pulls DB teams and merges into the global `TEAMS`, then calls `rebuildTeamSelects()` if defined.

`saveAnalysis` payload shape (must match):
```js
{
  engine_version, ruleset_id,                  // strings; defaults: 'v1', 'vgc2026_reg_m_a'
  player_team_id, opp_team_id, prior_id,       // FK strings (prior_id may be null)
  policy_model, sample_size, bo,
  win_rate, wins, losses, draws,
  avg_turns, avg_tr_turns, ci_low, ci_high,
  hidden_info_model,                           // optional
  analysis_json,                               // free-form blob — embed pilot notes here
  win_conditions: [{label, count}, ...],
  logs:           [{result, turns, tr_turns, win_condition, log}, ...]   // sliced to first 50 by adapter
}
```

⚠️ The default `ruleset_id` inside `supabase_adapter.js` is `vgc2026_reg_m_a`, but the only seeded ruleset is `champions_reg_m_doubles_bo3`. **This will FK-fail every save until fixed** — see Module 4 acceptance criteria.

---

## 5. Modular integration plan

> **Convention:** each module = one PR, one Linear ticket under team `POK`. Each must be independently mergeable, behind a graceful no-op when `SupabaseAdapter.enabled === false`. Order is binding for modules 1–4; modules 5+ can be parallelized.

The first three modules are **wiring only** — they don't change behavior, they only make the existing scaffold reachable. After M3, every Bo run starts persisting.

---

### MODULE 1 — Wire the adapter into `index.html` (the actual unblock) 🟥 critical

**Branch:** `feat/db-m1-adapter-wiring` · **Linear:** `POK-DB-1`

**Goal:** Make `SupabaseAdapter` exist in the runtime. No app behavior change unless creds are set.

**Edits — `poke-sim/index.html`:**
1. In `<head>`, after the manifest link and before any other `<script>`, add the supabase-js v2 UMD CDN:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   ```
2. Immediately after, an inline credential block. **Do not commit real values** — leave them as placeholders that we override at deploy time:
   ```html
   <script>
     // Anon key only — RLS protects writes. Override per-environment.
     window.__SUPABASE_URL__ = window.__SUPABASE_URL__ || 'https://ymlahqnshgiarpbgxehp.supabase.co';
     window.__SUPABASE_KEY__ = window.__SUPABASE_KEY__ || ''; // leave empty in repo; set via deploy step
   </script>
   ```
3. At the existing script block (around L544–L549), append `supabase_adapter.js` **after** `ui.js`:
   ```html
   <script src="storage_adapter.js"></script>
   <script src="data.js"></script>
   <script src="legality.js"></script>
   <script src="engine.js"></script>
   <script src="ui.js"></script>
   <script src="supabase_adapter.js"></script>   <!-- NEW -->
   ```

**Edits — `poke-sim/tools/build-bundle.py`:** ensure `supabase_adapter.js` is concatenated into the single-file bundle in the same position. Also strip the `<script src="https://cdn...supabase.min.js">` from the bundled `index.html` and **inline** the supabase-js UMD source at the top of the bundle's `<script>`. Bundle target stays under ~750 KB.

**Edits — `.gitignore`:** add a `poke-sim/.env.local` line; document in `db/README_DB.md` how to inject creds for local dev (set `window.__SUPABASE_KEY__` via a non-committed `local-credentials.js`).

**Acceptance criteria:**
- `SupabaseAdapter.enabled === true` in browser console when keys are set; `false` otherwise.
- With keys empty, app still loads and runs identically to today (the adapter logs `running in local-only mode.`).
- Bundle still builds via `tools/build-bundle.py` and opens offline.

---

### MODULE 2 — Backfill the team seed (3 → 22) 🟧 high

**Branch:** `feat/db-m2-full-team-seed` · **Linear:** `POK-DB-2`

**Goal:** Get every team that's in `data.js → TEAMS` into Supabase, including the 19 missing ones (`mega_dragonite`, `mega_houndoom`, `rin_sand`, `suica_sun`, `cofagrigus_tr`, `champions_arena_2nd`, `champions_arena_3rd`, `chuppa_balance`, `aurora_veil_froslass`, `kingambit_sneasler`, `custom_1776995210260`, `perish_trap_gengar`, `rain_offense`, `trick_room_golurk`, `sun_offense_charizard`, `z2r_feitosa_mega_floette`, `benny_v_mega_froslass`, `lukasjoel1_sand_gengar`, `hiroto_imai_snow`).

**Approach — generator script (preferred over hand-written SQL):**
1. Add `poke-sim/tools/generate_seed_from_data.py`:
   - Reads `data.js`, locates the `const TEAMS = { ... }` literal, parses it (e.g. via `pyjsparser` or by isolating the literal and `json5.loads`).
   - For every key, emits an idempotent `INSERT … ON CONFLICT (team_id) DO UPDATE` for `teams` and a `DELETE FROM team_members WHERE team_id = $1` followed by 1..6 inserts.
   - Maps `format`/`gametype`/`ruleset[]` → existing `champions_reg_m_doubles_bo3` if Champions; otherwise creates a new `vgc_reg_h_doubles_bo3` ruleset row first.
2. Output to `poke-sim/db/seed_teams_v2.sql`. Replace `seed_teams_v1.sql` (keep it in `db/legacy/` for diff context).
3. Apply via Supabase `apply_migration` so it lands in `supabase_migrations` properly:
   - Migration name: `2026_04_28_seed_teams_v2`.

**Field-loss check (decide explicitly per field):** the in-memory `TEAMS[k]` carries `style`, `format`, `formatid`, `gametype`, `ruleset[]`, `provenance`, `legality_status`, `legality_notes`, `assumption_register`, `champion_pack_id`, `_hasOverride` — none of these have a column. Decision for v2: **stuff them into a `teams.metadata jsonb` column** (additive, nullable, default `'{}'::jsonb`). Migration:
```sql
ALTER TABLE teams ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
```
Then `loadTeamsFromDB` in `supabase_adapter.js` is updated (Module 3) to spread `t.metadata` onto the result.

**Acceptance criteria:**
- `select count(*) from teams` returns 22.
- `select team_id, count(*) from team_members group by team_id` shows 6 members for every non-pack team.
- `loadTeamsFromDB()` returns all 22 keys with members populated.
- Supabase **advisor** (`get_advisors`) shows no new errors after migration.

---

### MODULE 3 — `loadTeamsFromDB` becomes the source of truth on init 🟧 high

**Branch:** `feat/db-m3-teams-as-source-of-truth` · **Linear:** `POK-DB-3`

**Goal:** When DB is reachable, DB teams **win** over `data.js` (currently the auto-merge in `supabase_adapter.js` calls `Object.assign(TEAMS, dbTeams)` after DOMContentLoaded — that's fine but fragile against UI init races). Promote it to a deterministic, awaited bootstrap.

**Edits — `poke-sim/ui.js`:**
- Refactor the `DOMContentLoaded` handler so it `await`s `SupabaseAdapter.loadTeamsFromDB()` (when enabled) **before** the first `rebuildTeamSelects()` and before the first roster render.
- On adapter failure or no-creds: silently fall back to in-memory `TEAMS` (today's behavior). Surface a small `[DB offline]` chip in the header for ops visibility (style only — no functional gating).
- Remove the duplicate auto-merge in `supabase_adapter.js` to avoid the double-init that exists today (the file's bottom `window.addEventListener('DOMContentLoaded', …)` block).

**Edits — `poke-sim/supabase_adapter.js`:**
- Have `loadTeamsFromDB` also pull `t.metadata` and merge into the returned objects so `format`, `legality_status`, etc. survive.
- Add a `loadRulesets()` helper for Module 4 (returns `[{ruleset_id, engine_formatid, custom_rules}, …]`).

**Acceptance criteria:**
- Reload page → roster + dropdowns identical to today (no visible UI change).
- Disable Wi-Fi after page loads → app keeps working from in-memory cache.
- Edit a team in Supabase Studio → reload → change is reflected.

---

### MODULE 4 — Persist `runBoSeries` results to `analyses` 🟥 critical

**Branch:** `feat/db-m4-save-analyses` · **Linear:** `POK-DB-4`

**Goal:** Every Bo series persists exactly one `analyses` row plus child rows, via the existing `SupabaseAdapter.saveAnalysis`.

**Edits — `poke-sim/ui.js`:**
- At the two `runBoSeries` call sites (single-sim L1979, run-all L1942), capture `res` and call `SupabaseAdapter.saveAnalysis(...)` after the existing `addReplays(...)` call.
- Build a small helper `_buildAnalysisPayload(playerKey, oppKey, bo, res)` that:
  - Maps `res` shape to the adapter's payload shape.
  - Resolves `ruleset_id` from `TEAMS[playerKey].metadata.ruleset_id` (loaded by Module 3) — fall back to `champions_reg_m_doubles_bo3`.
  - Computes `win_conditions[]` by reusing the histogram already produced in `generatePilotGuide` (L2050) — refactor that function to return the histogram instead of recomputing.
  - Caps `logs[]` to the 50 the adapter slices anyway.
- Defensive: wrap the `saveAnalysis` call in a `Promise.resolve(...).catch(err => console.warn(...))`. **Never block UI on the save.**

**Edits — `poke-sim/supabase_adapter.js`:**
- Fix the `vgc2026_reg_m_a` default → use `champions_reg_m_doubles_bo3`. (Or remove the default and require callers to pass it.)
- Validate `bo ∈ {1,3,5,10}` and `policy_model` not empty before insert, to keep error messages readable.

**Acceptance criteria:**
- Run a Bo3 → exactly 1 row in `analyses` with correct wins/losses/win_rate.
- Same run → N rows in `analysis_logs` (N ≤ 50) and ≥1 row in `analysis_win_conditions`.
- Re-run an identical matchup → second `analyses` row with new UUID (no upsert).
- `get_advisors` after run shows no new RLS or perf warnings.

---

### MODULE 5 — Imported teams persist (pokepaste / Showdown / Set Editor)

**Branch:** `feat/db-m5-team-import-persist` · **Linear:** `POK-DB-5`

**Goal:** When the user imports or edits a team, mirror it into Supabase using a normalized upsert (teams + team_members).

**Edits — `poke-sim/ui.js`:**
- New helper `async function _upsertTeamToDB(teamId, team, source)`:
  1. `upsert` into `teams` with `{team_id, name, label, mode: 'opponent', ruleset_id, source, description, metadata}` — `onConflict: 'team_id'`.
  2. `delete from team_members where team_id = $1`, then bulk-insert the new member rows. Wrap in a single `rpc` if you want atomicity (optional v2.1).
- Call sites (verified):
  - `parseShowdownPaste` consumers at L1311, L1358 — single-team import.
  - The multi-team handler at L1038.
  - The Set Editor save path (search for the modal save handler — likely `setEditorSave` or similar).
- Reload-after-import test: refresh → imported team is still in dropdown without the in-memory `champions:*` localStorage cache.

**Acceptance criteria:**
- Import a pokepaste → row in `teams`, 1–6 rows in `team_members`.
- Re-import same paste → no duplicates (upsert by `team_id`).
- Edit one Pokémon's EVs in Set Editor → only that `team_members` row updates.
- Existing `champions:teams:custom` localStorage keys keep working (dual-write).

---

### MODULE 6 — Replay Log tab reads history from DB

**Branch:** `feat/db-m6-history-tab` · **Linear:** `POK-DB-6`

**Goal:** Replay Log tab shows past `analyses`, not just the current session.

**Edits — `poke-sim/ui.js`:**
- Add `async function loadAnalysisHistory(playerKey)` that calls a new adapter method `loadAnalysesForPlayer(playerKey, limit=50)`. It does:
  ```js
  sb.from('analyses')
    .select('analysis_id, created_at, opp_team_id, bo, win_rate, wins, losses, sample_size, analysis_json')
    .eq('player_team_id', playerKey)
    .order('created_at', { ascending: false })
    .limit(50)
  ```
- Wire to the Replay Log tab render at L1666. Existing `addReplays` is per-run — keep it for the active session and prepend a **History** subsection that renders DB rows.
- Add the existing All / Wins / Losses / Clutch filters on top of the merged list.
- Lazy-load `analysis_logs` for a row only when the user expands it (avoid pulling 50× the data on tab open).

**Acceptance criteria:**
- Fresh tab open → history loads ≤ 800 ms on a normal connection.
- Click a history row → expanded view loads turn log via `analysis_logs` and renders identically to a live-run row.
- Filter chips work across both live + history rows.

---

### MODULE 7 — `golden_battles` test harness wired into `tests/`

**Branch:** `feat/db-m7-golden-battles-runner` · **Linear:** `POK-DB-7`

**Goal:** Use the empty `golden_battles` table to gate engine changes — same player team + opp team + seed must produce the recorded `expected_winner` / `expected_trace_hash`.

**Edits:**
- Seed `golden_battles` with ~5 hand-curated deterministic scenarios across the existing teams.
- Add `poke-sim/tests/golden_battles_runner.js`: pulls all `golden_battles` rows + their teams via the adapter, runs `engine.runOneBattle(seed)` for each, hashes the canonical trace, and `assertEqual` against `expected_trace_hash`.
- Hook into the existing `tests/README.md` test command list and `tools/check-bundle.sh`.

**Acceptance criteria:**
- `node tests/golden_battles_runner.js` exits 0 against current engine.
- Intentionally break a damage formula → runner fails with diff of first divergent turn.

---

### MODULE 8 — `prior_snapshots` for hidden-info inference (R&D, optional)

**Branch:** `feat/db-m8-priors` · **Linear:** `POK-DB-8` (priority: low)

**Goal:** Wire `prior_snapshots` into `engine.js` opponent-set inference. Out of scope for the v2 push — listed so we don't lose it. Defer until M1–M6 are merged.

---

### MODULE 9 — Production hardening

**Branch:** `chore/db-m9-hardening` · **Linear:** `POK-DB-9`

- Run `get_advisors` and act on every `error`/`warn` (security and performance).
- Add an `auth.uid()` scaffold to `rls_policies_v1.sql` so we're ready when login lands.
- Add a `created_by` nullable text column on `analyses` (no FK yet) and write `null` from anonymous clients; future auth fills it.
- Set up `apply_migration` for every DDL change going forward (the schema is currently un-migration-tracked — fix this debt by creating an initial baseline migration named `2026_04_27_baseline_v1` capturing the current schema verbatim).
- Confirm bundle is < 800 KB after Module 1 inlining.

---

## 6. Module dependency graph

```
M1 (wiring) ─── M2 (full seed) ─── M3 (DB-as-source-of-truth)
                                        │
                                        ├─── M4 (save analyses) ─── M6 (history tab)
                                        ├─── M5 (import persist)
                                        ├─── M7 (golden battles)
                                        └─── M9 (hardening, after M4–M6)
                                              ↓
                                            M8 (priors, deferred)
```

Hard ordering: **M1 → M2 → M3 → M4**. Everything else can fan out after M3.

---

## 7. Per-module test matrix

| Module | Smoke test | Pass condition |
|---|---|---|
| M1 | Open built bundle, run `SupabaseAdapter.enabled` in console | `true` with creds, `false` without — no errors either way |
| M2 | Supabase Studio → `select count(*) from teams` | 22 |
| M3 | Edit a team in Studio, reload app | Edit visible in dropdown |
| M4 | Run a Bo3 single-sim | 1 row in `analyses`, ≥1 in `analysis_win_conditions`, ≤50 in `analysis_logs` |
| M5 | Import pokepaste → reload app | Imported team survives reload, no duplicates |
| M6 | Reload, open Replay Log tab | Past runs render with correct wins/losses |
| M7 | `node tests/golden_battles_runner.js` | exit 0 |
| M9 | `get_advisors` after full deploy | No `error` level findings |

---

## 8. Hard rules (carried from v1, refined)

| Rule | Why | Source |
|---|---|---|
| `COVERAGE_CHECKS` stays `var` | TDZ break on init if changed to `const`/`let` | `ui.js` historical |
| Adapter file global is `window.SupabaseAdapter`, **not** `supabase` | Conflicts with the CDN's `window.supabase` | `supabase_adapter.js` |
| `__SUPABASE_KEY__` only ever holds the **anon** key in any frontend file | RLS is the access control; service_role would bypass it | RLS spec |
| Never bundle the credentials file | Credentials live outside the bundle, injected by host | M1 |
| `team_members` is normalized — never store an array of objects in `teams.members` JSONB | The current schema deliberately does not have that column | `schema_v1.sql` |
| `ruleset_id` defaults must match a **seeded** ruleset row | Otherwise FK fails on `analyses` insert | M4 |
| All DB calls fail-soft (`.catch(...)` → warn, never throw to UI) | App must work offline | M1 + M4 |
| Use `apply_migration` (Supabase MCP) for every DDL change going forward | Currently 0 migrations registered — that's tech debt | M9 |
| Re-build bundle with `tools/build-bundle.py` only — not the inline snippets | The inline snippet from v1 plans is brittle and out of date | `tools/build-bundle.py` |

---

## 9. Linear ticket structure (proposed for team `POK`)

Create as a **Project** named *"Supabase DB Integration v2"* with these issues, all assigned to Alfredo unless noted:

| Linear ID | Title | Priority |
|---|---|---|
| POK-DB-1 | Wire `supabase_adapter.js` + supabase-js CDN into `index.html` and bundle | Urgent |
| POK-DB-2 | Backfill team seed: 3 → 22 (generator script + `seed_teams_v2.sql`) | High |
| POK-DB-3 | `loadTeamsFromDB` becomes awaited source-of-truth on init; add `metadata` jsonb | High |
| POK-DB-4 | Persist `runBoSeries` results via `SupabaseAdapter.saveAnalysis` | Urgent |
| POK-DB-5 | Persist imported / Set-Editor-saved teams (upsert teams + team_members) | Medium |
| POK-DB-6 | Replay Log tab reads history from `analyses` + `analysis_logs` | Medium |
| POK-DB-7 | `golden_battles` test runner under `tests/` | Medium |
| POK-DB-8 | `prior_snapshots` hooked into engine hidden-info model | Low (deferred) |
| POK-DB-9 | RLS hardening, advisor sweep, baseline migration | Medium |

Use Linear's GitHub integration so each PR auto-links. Branch naming convention: `feat/db-m<N>-<slug>`.

---

## 10. Immediate next actions for Alfredo

1. **Create the Linear project + 9 tickets above** under team POK (can be done from this plan).
2. **Get the anon key** from TheYfactora12 and stash it in a local `poke-sim/local-credentials.js` (gitignored).
3. **Open `feat/db-m1-adapter-wiring`** and ship Module 1 first — it's pure wiring, ~30 lines of diff, unblocks everything.
4. Hand this file (`POKE_SIM_DB_INTEGRATION_PLAN_v2.md`) to Windsurf/SWE-1.5 with the instruction: *"Implement Module 1, then stop and post the diff."* Modules are sized to fit one chat each.
5. After M1 lands, run M2's seed generator locally, commit the SQL, and apply via `apply_migration`.

---

## 11. Open questions to resolve before M2 lands

- [ ] Does `champions_reg_m_doubles_bo3` cover all 22 teams' formats, or do we also need `vgc2024regh` / `vgc2025regg` ruleset rows? (`data.js` shows mixed `formatid` values — e.g. `player.formatid = 'gen9vgc2024regh'`.)
- [ ] Should `mode` ever be `player` for more than one team, or is there a uniqueness rule? Today only `team_id='player'` has `mode='player'`.
- [ ] Are we keeping the `champions:*` localStorage layer permanently as an offline cache, or deprecating it once DB is solid? (Recommendation: keep — it's the offline fallback and already test-covered in `tests/storage_adapter_tests.js`.)
- [ ] Auth roadmap: are we adding Supabase Auth in v3 (mentioned in v1 §8), or staying single-tenant anon? Affects whether M9 adds `created_by` now.

---

*Sources: Live Supabase schema introspected from project `ymlahqnshgiarpbgxehp` (2026-04-27); repo file listing and source pulled from [github.com/alfredocox/Pokemon-Champions-Sim-Planner@main](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner); Linear team `POK` (Poke-e-Sim); supersedes the three earlier plan drafts attached to this thread.*
