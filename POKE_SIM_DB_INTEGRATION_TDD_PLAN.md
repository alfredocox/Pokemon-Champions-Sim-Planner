# Pokémon Champion 2026 — DB Integration **TDD Plan**

> **Companion to:** [`POKE_SIM_DB_INTEGRATION_PLAN_v2.md`](./POKE_SIM_DB_INTEGRATION_PLAN_v2.md)
> **Linear parent:** [POK-16 — Main DB Integration](https://linear.app/poke-e-sim/issue/POK-16/main-db-integration)
> **Repo:** [github.com/alfredocox/Pokemon-Champions-Sim-Planner](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner)
> **Branch convention:** `test/db-m<N>-<slug>` (test PR), then `feat/db-m<N>-<slug>` (impl PR) — **two PRs per module**.
> **Last updated:** 2026-04-27

---

## 0. Workflow — RED → GREEN → MERGE, one module at a time

For every module M1–M9, the workflow is **three commits / two PRs**, in this exact order:

```
1. test/db-m<N>      ← RED suite lands first, failing on purpose, on its own branch off main
2. feat/db-m<N>      ← Implementation makes the suite GREEN (and any older suite must stay GREEN)
3. squash-merge feat/db-m<N> + test branch into main when:
     a. test/db-m<N> exists in main with all tests RED (or skipped via env flag)
     b. CI on feat/db-m<N> reports ALL test files passing (old + new)
```

This mirrors the existing `storage_adapter_tests.js` pattern in the repo: it shipped first as a *“STATUS: ALL TESTS EXPECTED TO FAIL (RED) until storage_adapter.js is implemented”* spec, then the impl made it green. We are doing the same per module.

### Why two PRs per module
- The test PR is the **executable spec**. Reviewers can read it without staring at impl noise.
- Once the test PR is merged, every subsequent commit on `main` runs against it. If anyone (you, Windsurf/SWE-1.5, or me) breaks an acceptance criterion, CI will tell us before a release.
- Implementation PR diff is then **provably the minimum required** to flip RED → GREEN.

### Hard rules carried from v2 plan, enforced by these tests
| Rule | Test that enforces it |
|---|---|
| `COVERAGE_CHECKS` stays `var` | M3 T-init-1 |
| Adapter global is `window.SupabaseAdapter`, not `supabase` | M1 T-wiring-2 |
| Anon key only in any frontend file (no `service_role`) | M1 T-wiring-5 |
| All DB calls fail-soft on offline | M1, M3, M4, M5 each have an "offline → no throw" case |
| `team_members` is normalized — never JSONB array on `teams` | M2 T-seed-3 |
| `ruleset_id` defaults must match a seeded ruleset | M4 T-save-4 |
| Use `apply_migration` for every DDL — not the SQL editor | M2 T-seed-7, M9 T-hardening-3 |
| Bundle built via `tools/build-bundle.py` | M1 T-bundle-1 |

---

## 1. Test infrastructure (set up **before** M1 lands)

### Branch: `test/db-infra` · Linear: child of POK-16 (open on M1 review)

The repo already has a `vm.createContext`-based harness ([`tests/items_tests.js`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/tests/items_tests.js), [`tests/storage_adapter_tests.js`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/tests/storage_adapter_tests.js)). We extend it — we do not introduce a test framework.

**New files:**

```
poke-sim/tests/
├── _db_helpers.js          ← shared mock for window.SupabaseAdapter + a fake supabase-js client
├── _run_all_db.sh          ← runs every db_*_tests.js, exits non-zero on any failure
├── db_m1_wiring_tests.js   ← shipped on test/db-m1
├── db_m2_seed_tests.js     ← shipped on test/db-m2
├── db_m3_init_tests.js     ← …
├── db_m4_save_tests.js
├── db_m5_import_tests.js
├── db_m6_history_tests.js
├── db_m7_golden_battles_tests.js
├── db_m9_hardening_tests.js   ← M8 deferred, no test file yet
└── fixtures/
    ├── analyses_sample.json    ← canned saveAnalysis payload
    ├── pokepaste_sample.txt    ← deterministic import fixture
    └── golden_battles_seed.sql ← 3 reference battles (used by M7)
```

### `_db_helpers.js` — the shared fake (~120 LOC)

It owns four things the rest of the test files reuse:

1. **`mockSupabaseClient(state)`** — a hand-written stand-in for `supabase-js v2`'s fluent API: `from(table).select().eq().order().limit()`, `.insert()`, `.upsert()`, `.delete()`. State is an in-memory object keyed by table name. No network. No supabase-js dependency.
2. **`installAdapter(ctx, opts)`** — loads `supabase_adapter.js` into a vm context with `window.__SUPABASE_URL__` / `__SUPABASE_KEY__` from `opts`. Returns `ctx.window.SupabaseAdapter`.
3. **`offlineMode(ctx)`** — clears the URL/KEY globals and re-loads the adapter so we can assert the no-creds branch.
4. **`assertNoServiceRole(filepath)`** — text-scans a file (e.g. the built bundle) for the strings `service_role` and `eyJ…role":"service_role` and throws if either is found. Used by M1 + M9.

### Test runner

```bash
# poke-sim/tests/_run_all_db.sh
set -e
for f in db_*_tests.js; do
  echo "▶ $f"
  node tests/$f || exit 1
done
echo "✅ all DB tests passed"
```

Add to the root `tests/README.md` "Run all tests" block. CI hook (single-line `npm test`) is part of M9.

### Acceptance for the infra PR
- [ ] `bash poke-sim/tests/_run_all_db.sh` runs cleanly with **zero** test files (just an "all done" echo).
- [ ] `_db_helpers.js` mock client passes its own self-test (a tiny `T()` block at the bottom of the file — the only file that self-tests).
- [ ] Existing 302 tests still pass (no regression).

---

## 2. Per-module test suites

> **Convention for each suite:** match the repo style verbatim — `T(name, fn)` + `eq/truthy/falsy/deepEq`. Stand-alone Node files. No mocha/jest. ~3-second total run target.

Each section below follows the same template:
- **PR**: branch + parent Linear ID
- **Spec file**: full path
- **Test inventory**: numbered cases (T-prefix matches the module slug)
- **Each case**: input → assertion in 1 line
- **RED state**: how the file should fail before impl
- **GREEN state**: how the impl PR flips it

Total target: **~110 cases across 8 suites** (M8 deferred).

---

### MODULE 1 — Wiring suite (16 cases)

**PR:** `test/db-m1-wiring` → linked to [POK-17](https://linear.app/poke-e-sim/issue/POK-17/m1-wire-supabase-adapterjs-supabase-js-cdn-into-indexhtml-and-bundle)
**Spec:** `poke-sim/tests/db_m1_wiring_tests.js`

| # | Case | Assertion |
|---|---|---|
| T-wiring-1 | Built bundle exists | `fs.statSync('pokemon-champion-2026.html')` does not throw |
| T-wiring-2 | Bundle contains `window.SupabaseAdapter = {` literal | grep returns ≥ 1 |
| T-wiring-3 | Bundle contains supabase-js UMD inlined | grep for `createClient` and the UMD self-name guard |
| T-wiring-4 | Bundle does **not** contain `<script src="https://cdn.jsdelivr.net/.*supabase`</nobr> | the CDN tag must be inlined, not referenced |
| T-wiring-5 | `assertNoServiceRole(bundle)` passes | bundle never carries the service_role key |
| T-wiring-6 | Bundle size < 800 KB | `fs.statSync(...).size < 800*1024` |
| T-wiring-7 | `index.html` references `supabase_adapter.js` after `ui.js` | line-order check |
| T-wiring-8 | `index.html` references the supabase-js CDN before any other `<script>` | line-order check |
| T-wiring-9 | `.gitignore` contains `poke-sim/.env.local` | exact line match |
| T-wiring-10 | Loading adapter with no creds → `SupabaseAdapter.enabled === false` | `installAdapter(ctx, {url:null, key:null})` |
| T-wiring-11 | Loading with both creds → `enabled === true` | dummy values |
| T-wiring-12 | `loadTeamsFromDB()` with `enabled=false` returns `null` (does **not** throw) | offline fail-soft |
| T-wiring-13 | `saveAnalysis({})` with `enabled=false` returns `null` (does **not** throw) | offline fail-soft |
| T-wiring-14 | `loadRecentAnalyses()` with `enabled=false` returns `[]` | offline fail-soft |
| T-wiring-15 | `tools/build-bundle.py` includes `supabase_adapter.js` in concat list | parse the script, assert filename in source list |
| T-wiring-16 | Adapter does **not** clobber a pre-existing `window.supabase` set by the CDN | load CDN-style fake first, then adapter, assert both globals exist |

**RED state (test PR alone):** every case except T-wiring-12/13/14 fails because `pokemon-champion-2026.html` does not yet contain `window.SupabaseAdapter`. T-wiring-9 fails because `.env.local` ignore is not present. T-wiring-15 fails because `build-bundle.py` doesn't list the adapter file.

**GREEN trigger ([POK-17](https://linear.app/poke-e-sim/issue/POK-17/m1-wire-supabase-adapterjs-supabase-js-cdn-into-indexhtml-and-bundle)):** after impl, all 16 pass.

---

### MODULE 2 — Seed suite (15 cases)

**PR:** `test/db-m2-seed` → [POK-18](https://linear.app/poke-e-sim/issue/POK-18/m2-backfill-team-seed-3-22-add-teamsmetadata-jsonb)
**Spec:** `poke-sim/tests/db_m2_seed_tests.js`

The trick here: tests should run **without a live DB**. We get there by parsing the SQL file we ship and asserting structural invariants — same approach `t9j13_tests.js` uses for format checks.

| # | Case | Assertion |
|---|---|---|
| T-seed-1 | `db/seed_teams_v2.sql` exists | file present |
| T-seed-2 | SQL contains exactly 22 distinct `team_id` values in `teams` UPSERT block | regex count |
| T-seed-3 | SQL never INSERTs into `teams.members` (no JSONB array) | grep `members` against `teams` block returns 0 |
| T-seed-4 | Every `team_id` from `data.js TEAMS` literal has a matching `INSERT INTO teams … VALUES ('<team_id>', …)` in the SQL | parse `data.js` literal + diff |
| T-seed-5 | Every team has 1..6 `INSERT INTO team_members` rows | per-team count check |
| T-seed-6 | Migration file `db/migrations/2026_04_28_add_teams_metadata_column.sql` adds `metadata jsonb DEFAULT '{}'::jsonb` | grep ALTER TABLE |
| T-seed-7 | Migration file `db/migrations/2026_04_28_seed_teams_v2.sql` is named correctly for `apply_migration` | regex `^\d{4}_\d{2}_\d{2}_` |
| T-seed-8 | All `INSERT INTO teams` statements use `ON CONFLICT (team_id) DO UPDATE` (idempotent) | grep |
| T-seed-9 | All member inserts are bracketed by `DELETE FROM team_members WHERE team_id = '<id>'` first (clean replace) | per-team pair check |
| T-seed-10 | Generator script `tools/generate_seed_from_data.py` exists and produces a stable byte-identical output on re-run | run twice, diff |
| T-seed-11 | `vgc2026_reg_m_a` default in adapter is replaced with a seeded ruleset id | grep `supabase_adapter.js` |
| T-seed-12 | Every team's `ruleset_id` references either `champions_reg_m_doubles_bo3` **or** a ruleset row also created by the SQL | join check |
| T-seed-13 | Members `evs` JSONB is a `{hp,atk,def,spa,spd,spe}` shape (all six keys present) | regex parse |
| T-seed-14 | Members `moves` JSONB is an array of 1..4 strings | regex parse |
| T-seed-15 | Live DB smoke test, **gated behind `RUN_LIVE_DB=1` env** — `SELECT count(*) FROM teams` returns 22 | uses `pg` lib only when env var set; otherwise marked skipped |

**RED state:** files don't exist → T-1, T-6, T-7, T-10 throw; the rest fail to even reach assertions.

**GREEN trigger ([POK-18](https://linear.app/poke-e-sim/issue/POK-18/m2-backfill-team-seed-3-22-add-teamsmetadata-jsonb)):** after applying both migrations + committing the generator output, all 15 pass; the live DB case passes when run with creds (run before merging the impl PR).

---

### MODULE 3 — Init / source-of-truth suite (12 cases)

**PR:** `test/db-m3-init` → [POK-19](https://linear.app/poke-e-sim/issue/POK-19/m3-loadteamsfromdb-becomes-awaited-source-of-truth-on-init)
**Spec:** `poke-sim/tests/db_m3_init_tests.js`

This one **does** require loading `ui.js` into a vm context. We mock the DOM to the bare minimum (`document.getElementById`, `addEventListener`).

| # | Case | Assertion |
|---|---|---|
| T-init-1 | `COVERAGE_CHECKS` is declared with `var` (not `const`/`let`) | regex on raw `ui.js` text |
| T-init-2 | `DOMContentLoaded` handler in `ui.js` calls `await SupabaseAdapter.loadTeamsFromDB()` before first `rebuildTeamSelects()` | AST or regex order check |
| T-init-3 | When mock returns `{db_only: {...}}`, `TEAMS.db_only` is present after init | runtime in vm |
| T-init-4 | When mock throws, init does not crash; static `TEAMS` is intact | runtime in vm |
| T-init-5 | When `enabled=false`, init does not call `loadTeamsFromDB` at all | spy assertion |
| T-init-6 | DB result with `metadata.format = 'gen9vgc2024regh'` flows onto the in-memory team object | spread check |
| T-init-7 | Existing static `TEAMS.player` is overwritten by DB row of the same id (DB wins) | conflict resolution |
| T-init-8 | Init blocks roster render until the await resolves (no flash of static teams) | order: assert `loadTeamsFromDB` settles **before** the spy on `rebuildTeamSelects` |
| T-init-9 | Duplicate auto-merge in `supabase_adapter.js` (DOMContentLoaded block at file bottom) is removed | grep |
| T-init-10 | Adapter exposes `loadRulesets()` returning ≥1 ruleset | mock returns `[{ruleset_id: 'champions_reg_m_doubles_bo3', ...}]` |
| T-init-11 | `[DB offline]` chip text appears in `index.html`/`ui.js` for the offline-fallback branch | grep |
| T-init-12 | Init takes ≤ 500 ms with a 100 ms simulated DB latency | `performance.now()` window |

**RED state:** T-2, T-9, T-10 fail because the impl change isn't in `ui.js`/`supabase_adapter.js` yet. T-1 passes already (it's an invariant we're locking in to prevent regression).

**GREEN trigger ([POK-19](https://linear.app/poke-e-sim/issue/POK-19/m3-loadteamsfromdb-becomes-awaited-source-of-truth-on-init)):** after the M3 impl PR, all 12 pass.

---

### MODULE 4 — Save analyses suite (18 cases)

**PR:** `test/db-m4-save` → [POK-20](https://linear.app/poke-e-sim/issue/POK-20/m4-persist-runboseries-results-via-supabaseadaptersaveanalysis)
**Spec:** `poke-sim/tests/db_m4_save_tests.js`

Most-critical suite — this is where data loss risk is highest if anything regresses. Uses `mockSupabaseClient` to capture inserts.

| # | Case | Assertion |
|---|---|---|
| T-save-1 | `_buildAnalysisPayload(playerKey, oppKey, 3, res)` returns an object with all 14 required keys | shape check |
| T-save-2 | Payload `bo` ∈ `{1,3,5,10}`; reject anything else | parametric |
| T-save-3 | Payload `policy_model` is non-empty string | reject `''` |
| T-save-4 | Default `ruleset_id` is `champions_reg_m_doubles_bo3` (a seeded id) | grep adapter |
| T-save-5 | Single Bo3 run → exactly **one** `analyses` insert in mock | call count |
| T-save-6 | Same Bo3 run → ≥1 `analysis_win_conditions` row | call count |
| T-save-7 | Same Bo3 run → ≤50 `analysis_logs` rows | upper bound |
| T-save-8 | `analysis_logs` rows preserve `(turns, tr_turns, win_condition, log)` fields | shape |
| T-save-9 | `analysis_win_conditions` row labels are non-empty distinct strings | uniqueness |
| T-save-10 | `analyses.win_rate` is a `numeric(5,4)` in `[0,1]` | bounds |
| T-save-11 | `wins + losses + draws === sample_size` | invariant |
| T-save-12 | Mock raises a 4xx error → `saveAnalysis` resolves to `null` (no throw) | fail-soft |
| T-save-13 | UI is **not blocked** by `saveAnalysis` — assertion: `runBoSeries` resolution time ≤ baseline + 5 ms | timing |
| T-save-14 | Run-all (L1942) saves N analyses where N = number of opponents | call count |
| T-save-15 | Single-sim (L1979) saves exactly 1 analysis | call count |
| T-save-16 | Two identical Bo3 runs → two `analyses` rows with **different** UUIDs (no upsert) | id check |
| T-save-17 | `analysis_json` includes the pilot guide blob | nested key check |
| T-save-18 | `created_by` column accepts `null` from anonymous client | mock RLS path |

**RED state:** before M4 lands, `_buildAnalysisPayload` doesn't exist and the call sites don't invoke `saveAnalysis` → T-1 through T-17 fail.

**GREEN trigger ([POK-20](https://linear.app/poke-e-sim/issue/POK-20/m4-persist-runboseries-results-via-supabaseadaptersaveanalysis)):** all 18 pass; live smoke (M4 acceptance bullet #1) verified manually before squash-merge.

---

### MODULE 5 — Import persistence suite (12 cases)

**PR:** `test/db-m5-import` → [POK-21](https://linear.app/poke-e-sim/issue/POK-21/m5-persist-imported-set-editor-teams-upsert-teams-team-members)
**Spec:** `poke-sim/tests/db_m5_import_tests.js`

Uses fixture `tests/fixtures/pokepaste_sample.txt` for determinism.

| # | Case | Assertion |
|---|---|---|
| T-import-1 | `_upsertTeamToDB(teamId, team, source)` exists in `ui.js` | grep |
| T-import-2 | Importing fixture once → 1 `teams` row + 6 `team_members` rows | mock counts |
| T-import-3 | Importing the same fixture twice → still 1 `teams` row, 6 `team_members` rows (upsert + delete-replace) | idempotent |
| T-import-4 | Re-import with one EV change → only that 1 member row's `evs` differs | per-row diff |
| T-import-5 | Set Editor save handler also routes through `_upsertTeamToDB` | spy |
| T-import-6 | `champions:teams:custom` localStorage continues to mirror DB (dual-write) | both written |
| T-import-7 | Imported `teams.metadata` includes `source: 'pokepaste'` | shape |
| T-import-8 | Imported team has unique `team_id` slug derived from name + timestamp | format check |
| T-import-9 | Adapter exposes `saveTeam(team)` that returns `team_id` on success, `null` on failure | API check |
| T-import-10 | Mock raises RLS denial → import still completes locally; warning logged | fail-soft |
| T-import-11 | RLS migration adds anon INSERT policy on `teams` and `team_members` | grep migration file |
| T-import-12 | Importing while offline → team available locally, queued for sync (or graceful no-op per v2 plan) | offline branch |

**RED state:** `_upsertTeamToDB` and `saveTeam` don't exist → T-1, T-9 throw, the rest fail.

**GREEN trigger ([POK-21](https://linear.app/poke-e-sim/issue/POK-21/m5-persist-imported-set-editor-teams-upsert-teams-team-members)).**

---

### MODULE 6 — History tab suite (10 cases)

**PR:** `test/db-m6-history` → [POK-22](https://linear.app/poke-e-sim/issue/POK-22/m6-replay-log-tab-reads-history-from-analyses-analysis-logs)
**Spec:** `poke-sim/tests/db_m6_history_tests.js`

Mock returns 25 canned `analyses` rows from a JSON fixture so we can assert filtering and pagination behavior.

| # | Case | Assertion |
|---|---|---|
| T-hist-1 | `loadAnalysesForPlayer(playerKey, limit)` exists on adapter | API check |
| T-hist-2 | Returns rows ordered by `created_at DESC` | sort assertion |
| T-hist-3 | Default `limit` is 50 | param default |
| T-hist-4 | Replay Log tab render at L1666 prepends a **History** subsection | grep |
| T-hist-5 | History row click triggers lazy load of `analysis_logs` | spy fires once on expand, never on initial render |
| T-hist-6 | Filter `Wins` → only rows with `wins > losses` shown | filter logic |
| T-hist-7 | Filter `Losses` → only rows with `losses > wins` shown | filter logic |
| T-hist-8 | Filter `Clutch` → only rows with `bo > 1` and final-game decided | filter logic |
| T-hist-9 | Empty history → empty-state message, not a blank panel | UI text |
| T-hist-10 | Mock returns 4xx → falls back to in-memory current-session rows; no crash | fail-soft |

**GREEN trigger:** [POK-22](https://linear.app/poke-e-sim/issue/POK-22/m6-replay-log-tab-reads-history-from-analyses-analysis-logs).

---

### MODULE 7 — Golden battles suite (8 cases)

**PR:** `test/db-m7-golden-battles` → [POK-23](https://linear.app/poke-e-sim/issue/POK-23/m7-golden-battles-test-runner-under-tests)
**Spec:** `poke-sim/tests/db_m7_golden_battles_tests.js` + `tests/golden_battles_runner.js`

This module is unique: the *runner itself* is the test. The suite below validates the runner.

| # | Case | Assertion |
|---|---|---|
| T-golden-1 | `tests/golden_battles_runner.js` exists and exits 0 against current engine | `child_process.execSync` |
| T-golden-2 | Runner pulls `golden_battles` rows + linked teams via adapter (mock) | spy |
| T-golden-3 | At least 3 golden battles seeded (fixture + migration) | row count |
| T-golden-4 | Each battle replays with `engine.runOneBattle(seed)` and the trace SHA256 matches `expected_trace_hash` | hash compare |
| T-golden-5 | Intentional damage-formula tweak → runner exits non-zero with a turn-N diff message | mutate engine in vm, assert failure mode |
| T-golden-6 | Runner runs offline using a cached fixture if `RUN_LIVE_DB` is unset | env-flag branch |
| T-golden-7 | Runner total time ≤ 5 s for 3 battles | perf budget |
| T-golden-8 | `npm run test:golden` script is registered in `package.json` (or in `tests/README.md` if no package.json yet) | grep |

**GREEN trigger:** [POK-23](https://linear.app/poke-e-sim/issue/POK-23/m7-golden-battles-test-runner-under-tests).

---

### MODULE 8 — Priors (deferred)

**No test PR yet.** When [POK-24](https://linear.app/poke-e-sim/issue/POK-24/m8-prior-snapshots-hooked-into-engine-hidden-info-model-deferred) is unblocked, draft `db_m8_priors_tests.js` covering: snapshot version increments, posterior updates after N runs, determinism preserved when priors disabled. Until then this section is a placeholder so the runner doesn't fail-fast on a missing file (the runner only globs `db_m*_tests.js` — absence is fine).

---

### MODULE 9 — Hardening / advisor / migration baseline suite (10 cases)

**PR:** `test/db-m9-hardening` → [POK-25](https://linear.app/poke-e-sim/issue/POK-25/m9-rls-hardening-advisor-sweep-baseline-migration)
**Spec:** `poke-sim/tests/db_m9_hardening_tests.js`

| # | Case | Assertion |
|---|---|---|
| T-hard-1 | Baseline migration file `2026_04_27_baseline_v1.sql` exists in `db/migrations/` | file present |
| T-hard-2 | Baseline migration creates all 8 live tables verbatim | grep table list |
| T-hard-3 | Live DB smoke (gated by `RUN_LIVE_DB=1`): `supabase_migrations.schema_migrations` contains the baseline | live query |
| T-hard-4 | RLS audit script asserts the policy matrix in plan v2 §M9 | per-table policy enumeration |
| T-hard-5 | No `service_role` reachable from the bundle | reuses `assertNoServiceRole` from infra |
| T-hard-6 | `get_advisors(security)` (gated, live) returns zero `error`-level findings | live query |
| T-hard-7 | `get_advisors(performance)` (gated, live) returns zero `error`-level findings | live query |
| T-hard-8 | `db/README_DB.md` documents `apply_migration`-only workflow | grep |
| T-hard-9 | `package.json`/runner: `npm test` runs the full DB suite + the existing 14 engine suites | exit-code aggregation |
| T-hard-10 | Bundle size still < 800 KB after all M1–M6 wiring | size check |

**GREEN trigger:** [POK-25](https://linear.app/poke-e-sim/issue/POK-25/m9-rls-hardening-advisor-sweep-baseline-migration).

---

## 3. CI gating per branch

Until a CI service is wired up (M9 stretch), the gate is local:

```bash
# Pre-merge checklist for any feat/db-m<N> branch:
cd poke-sim
node tests/items_tests.js && \
node tests/status_tests.js && \
# … all existing engine suites …
bash tests/_run_all_db.sh        # adds db_m*_tests.js
python tools/build-bundle.py     # rebuild bundle (M1+)
node tests/db_m1_wiring_tests.js  # bundle-size + grep gate runs against the freshly built bundle
```

A `main`-branch protection rule should require the squash commit message to include `tests-pass:` and the author confirms locally. CI replacement scheduled in M9 T-hard-9.

---

## 4. Per-module ship checklist (paste into each PR description)

```markdown
## TDD checklist for [Mx]

- [ ] `test/db-m<N>` PR is merged into `main` (RED suite landed first)
- [ ] All existing engine tests still GREEN (`items`, `status`, `mega`, `coverage`, `t9j8..15`, `phase4c`, `audit`, `storage_adapter`, `ui_storage_integration`)
- [ ] All db_m<N>_tests cases now GREEN
- [ ] If module touches DDL: migration applied via `apply_migration` (not SQL editor)
- [ ] If module touches DDL: `get_advisors` shows no new `error`-level findings
- [ ] Bundle rebuilt via `tools/build-bundle.py`, size < 800 KB
- [ ] No new occurrence of the literal `service_role` anywhere in the bundle
- [ ] Linear issue [POK-XX] linked in PR description; closed by the merge
```

---

## 5. Test count summary

| Module | Suite | Cases | Status |
|---|---|---:|---|
| Infra | (helpers + runner) | 1 self-test | ships first |
| M1 | wiring | 16 | RED before [POK-17](https://linear.app/poke-e-sim/issue/POK-17/m1-wire-supabase-adapterjs-supabase-js-cdn-into-indexhtml-and-bundle) |
| M2 | seed | 15 | RED before [POK-18](https://linear.app/poke-e-sim/issue/POK-18/m2-backfill-team-seed-3-22-add-teamsmetadata-jsonb) |
| M3 | init | 12 | RED before [POK-19](https://linear.app/poke-e-sim/issue/POK-19/m3-loadteamsfromdb-becomes-awaited-source-of-truth-on-init) |
| M4 | save | 18 | RED before [POK-20](https://linear.app/poke-e-sim/issue/POK-20/m4-persist-runboseries-results-via-supabaseadaptersaveanalysis) |
| M5 | import | 12 | RED before [POK-21](https://linear.app/poke-e-sim/issue/POK-21/m5-persist-imported-set-editor-teams-upsert-teams-team-members) |
| M6 | history | 10 | RED before [POK-22](https://linear.app/poke-e-sim/issue/POK-22/m6-replay-log-tab-reads-history-from-analyses-analysis-logs) |
| M7 | golden battles | 8 | RED before [POK-23](https://linear.app/poke-e-sim/issue/POK-23/m7-golden-battles-test-runner-under-tests) |
| M8 | priors | — | deferred ([POK-24](https://linear.app/poke-e-sim/issue/POK-24/m8-prior-snapshots-hooked-into-engine-hidden-info-model-deferred)) |
| M9 | hardening | 10 | RED before [POK-25](https://linear.app/poke-e-sim/issue/POK-25/m9-rls-hardening-advisor-sweep-baseline-migration) |
| **Total** | | **~111** | |

Combined with the existing 302 engine cases, the green baseline post-M9 should be **~413 / 413** before any module ships to main.

---

## 6. Order of operations (for Windsurf / SWE-1.5)

1. Open `test/db-infra` → land the harness + helpers + empty runner. **Merge.**
2. Open `test/db-m1-wiring` → 16 RED cases. Merge.
3. Open `feat/db-m1-adapter-wiring` ([POK-17](https://linear.app/poke-e-sim/issue/POK-17/m1-wire-supabase-adapterjs-supabase-js-cdn-into-indexhtml-and-bundle)) → flips all 16 GREEN. Merge.
4. Repeat for M2 → M3 → M4 (hard order).
5. Fan out: M5, M6, M7 in any order or in parallel branches.
6. M9 last. M8 deferred.

Each *test* PR is small (~150–300 LOC of pure spec) and can ship in a single SWE-1.5 chat. Each *impl* PR is the diff that satisfies that spec — also single-chat-sized.

---

## 7. Files this plan creates

```
poke-sim/tests/_db_helpers.js                ← infra
poke-sim/tests/_run_all_db.sh                ← infra
poke-sim/tests/db_m1_wiring_tests.js
poke-sim/tests/db_m2_seed_tests.js
poke-sim/tests/db_m3_init_tests.js
poke-sim/tests/db_m4_save_tests.js
poke-sim/tests/db_m5_import_tests.js
poke-sim/tests/db_m6_history_tests.js
poke-sim/tests/db_m7_golden_battles_tests.js
poke-sim/tests/db_m9_hardening_tests.js
poke-sim/tests/golden_battles_runner.js      ← from M7 impl
poke-sim/tests/fixtures/analyses_sample.json
poke-sim/tests/fixtures/pokepaste_sample.txt
poke-sim/tests/fixtures/golden_battles_seed.sql
poke-sim/db/migrations/2026_04_27_baseline_v1.sql           ← M9
poke-sim/db/migrations/2026_04_28_add_teams_metadata_column.sql  ← M2
poke-sim/db/migrations/2026_04_28_seed_teams_v2.sql              ← M2
poke-sim/db/seed_teams_v2.sql                                    ← M2 (output of generator)
poke-sim/tools/generate_seed_from_data.py                        ← M2
```

---

*Sources: canonical plan [`POKE_SIM_DB_INTEGRATION_PLAN_v2.md`](./POKE_SIM_DB_INTEGRATION_PLAN_v2.md) (this workspace); existing test conventions verified against [`poke-sim/tests/items_tests.js`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/tests/items_tests.js), [`poke-sim/tests/storage_adapter_tests.js`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/tests/storage_adapter_tests.js), and [`poke-sim/tests/README.md`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/tests/README.md); adapter signatures from [`poke-sim/supabase_adapter.js`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/blob/main/poke-sim/supabase_adapter.js); Linear issues POK-16 through POK-25 in team [Poke-e-Sim](https://linear.app/poke-e-sim).*
