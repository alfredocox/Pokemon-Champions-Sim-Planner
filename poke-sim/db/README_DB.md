# Champions Sim — Database Setup

> **STATUS: ACTIVE**
> Last reviewed for this branch: 2026-06-28.
> The live Supabase project is provisioned and the app has DB wiring. Current canonical team seed count is 34 teams, matching `poke-sim/data.js` and the Champions-only shipped catalog.
> Showdown sync/audit and approved-entity migrations have passed in the Kevin fork workflow, and one unapproved Showdown entity write succeeded. Public bundle generation from approved views remains a review/release gate.
> Alfredo's repo is a separate remote and must be aligned by review/PR, not by blindly overwriting divergent history.

---

## Legal-only live catalog rule

The live Supabase `teams` table is not allowed to be a loose archive of every team we have ever tested. Active rows are part of the runtime selector/training surface, so active live DB rows must exactly match the current approved, legal `poke-sim/data.js` catalog.

When adding or removing approved teams:

1. Update `poke-sim/data.js`.
2. Run `python3 poke-sim/tools/generate_seed_from_data.py`.
3. Commit the regenerated `db/seed_teams_v2.sql`, `db/migrations/2026_04_28_seed_teams_v2.sql`, and `db/migrations/2026_06_20_align_shared_27_team_catalog.sql`.
4. Apply `2026_06_20_align_shared_27_team_catalog.sql` with the `Supabase DB Migration` workflow before expecting PR CI or Pages deploy to pass.
5. Run or confirm `RUN_LIVE_DB=1 node tests/db_m2_seed_tests.js`.

Old, non-legal, or superseded teams must be marked retired, for example with `metadata.retired = true`, instead of remaining as active rows. The live DB seed test ignores retired rows and fails if active rows are missing legal catalog teams or include extra active teams. This is intentional: it prevents stale/non-legal teams from appearing in selectors, poisoning sim QA, or contaminating future coaching/training stats.

The generated live alignment migration now enforces this for built-in rows: any `source = 'builtin'` team not in the current legal repo catalog is marked retired with `retired_reason = "not_in_current_legal_repo_catalog"`. Do not remove that clause unless another reviewed active-row gate replaces it.

---

## Stack
Supabase (Postgres + RLS) + `supabase-js` v2

---

## Files in This Folder

| File | Purpose | Status |
|---|---|---|
| `schema_v1.sql` | Creates all 8 tables | Updated 2026-04-27 — includes `metadata` column on `teams` |
| `seed_teams_v2.sql` | Generated seed for all 34 repo teams | Fresh-DB/reference seed only; delete-first shape is unsafe on live DBs with analysis history |
| `rls_policies_v1.sql` | Row-level security policies | Ready to run |
| `migrations/2026_05_24_upsert_seed_teams_v2_repair.sql` | Superseded 25-team non-destructive repair seed | Historical reference only |
| `migrations/2026_06_20_align_shared_27_team_catalog.sql` | Non-destructive 34-team shared catalog alignment; filename is historical | Preferred live-DB migration after approved runtime team expansion |
| `migrations/2026_06_07_showdown_entities_approved_views.sql` | Approved Showdown mirror tables, diff rows, Champions overrides, and approved read views | Applied in review workflow evidence; required before generating app assets from Supabase-approved rows |
| `README_DB.md` | This file | — |

> Do not run the delete-first `seed_teams_v2.sql` or `2026_04_28_seed_teams_v2.sql` against a live DB that already has `analyses` rows. Use `2026_06_20_align_shared_27_team_catalog.sql` instead.

App layer: `poke-sim/supabase_adapter.js` — fully implemented. Browser credentials are injected at runtime through ignored local files or CI secrets; real keys must not be committed.
UI wiring: `poke-sim/ui.js` already loads DB teams on startup and persists analyses after battle runs when the adapter is enabled.

---

## Runbooks (Supabase SQL Editor)

### Fresh DB bootstrap

| Step | File | Notes |
|---|---|---|
| 1 | `schema_v1.sql` | Creates all 8 tables |
| 2 | `migrations/2026_04_28_add_teams_metadata_column.sql` | Existing fresh clones may already have this through `schema_v1.sql`; safe no-op review target otherwise |
| 3 | `seed_teams_v2.sql` | Generated fresh-DB/reference seed for the full 34-team catalog |
| 4 | `rls_policies_v1.sql` | Locks down security |
| 5 | `migrations/2026_06_06_showdown_sync_audit_tables.sql` | Adds Showdown sync/audit evidence tables |
| 6 | `migrations/2026_06_07_showdown_entities_approved_views.sql` | Adds approved Showdown entity/override layer and read views |
| 7 | Wire local or CI credentials | See below |

### Existing/live DB alignment

| Step | File | Notes |
|---|---|---|
| 1 | `migrations/2026_04_28_add_teams_metadata_column.sql` | Run if the live DB predates the metadata column |
| 2 | `migrations/2026_06_20_align_shared_27_team_catalog.sql` | Preferred non-destructive 34-team catalog alignment; safe with analysis FK history |
| 3 | `rls_policies_v1.sql` | Run if policies are not yet applied |
| 4 | `migrations/2026_06_06_showdown_sync_audit_tables.sql` | Adds Showdown sync/audit evidence tables |
| 5 | `migrations/2026_06_07_showdown_entities_approved_views.sql` | Adds approved Showdown entity/override layer and read views |
| 6 | Wire local or CI credentials | See below |

## Current Seed Repair Status (2026-06-28)

- Current repo source of truth: `poke-sim/data.js` with 34 `TEAMS` entries.
- `seed_teams_v2.sql` and `migrations/2026_06_20_align_shared_27_team_catalog.sql` are both generated from that same `data.js` catalog source.
- Previous 25-team drift was repaired with `migrations/2026_05_24_upsert_seed_teams_v2_repair.sql`.
- Current shared 34-team drift should be repaired with `migrations/2026_06_20_align_shared_27_team_catalog.sql`.
- The shared 34-team alignment migration is intentionally non-destructive for `teams` and `rulesets`: it uses UPSERTs and only replaces `team_members` for canonical repo team IDs.
- The older generated seed files are still useful for fresh DB/bootstrap review, but their delete-first shape can fail or partially apply on a DB with existing `analyses` FK references.
- GitHub migration workflow evidence: run `26351524164` passed for `2026_05_24_upsert_seed_teams_v2_repair.sql`.
- PR #121 CI evidence: run `26351547525` passed the test suite with live DB relevance enabled.

---

## Local Credential Setup

Browser testing:

```bash
cd poke-sim
cp local-credentials.example.js local-credentials.js
```

Then edit `local-credentials.js` with:

```js
window.__SUPABASE_URL__ = 'https://your-project-ref.supabase.co';
window.__SUPABASE_KEY__ = 'your-anon-public-key';
```

Node/live DB tests:

```bash
cd poke-sim
cp .env.example .env.local
npm install
npm run test:db:live
```

`test:db:live` loads `.env.local`, exports `RUN_LIVE_DB=1`, and aliases `SUPABASE_ANON_KEY` to `SUPABASE_KEY` for older tests.

Without `.env.local`, `npm run test:db` runs the DB suites against mocks/offline behavior.

> Use the anon/public key only. Never put a service_role key in frontend files, `.env.local`, GitHub Pages bundles, or CI logs.
>
> Review routing rule: GitHub Pages only proves what is on `main`. If DB wiring is under branch review, hand reviewers either the exact branch preview URL or the local `poke-sim/pokemon-champion-2026.html` flow with the required credential files called out explicitly. See `docs/release/QA_ENVIRONMENT_HANDOFF_RULES_2026-06-19.md`.

---

## GitHub Pages / CI Secrets

The public site needs only read/insert browser credentials:

| Secret | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | Pages deploy, CI, live tests | Supabase project REST URL |
| `SUPABASE_ANON_KEY` | Pages deploy, CI, live tests | Public anon key protected by RLS |

Admin database changes need a separate secret that is never bundled into the site:

| Secret | Used by | Purpose |
|---|---|---|
| `SUPABASE_DB_URL_T` | Manual `Supabase DB Migration` workflow only | Preferred pooler Postgres connection string for DDL migrations |
| `SUPABASE_DB_URL_P` | Manual `Supabase DB Migration` workflow only | Preferred Postgres connection string for DDL migrations |
| `SUPABASE_DB_URL` | Manual `Supabase DB Migration` workflow only | Legacy fallback Postgres connection string |

`SUPABASE_DB_URL_T` should come from Supabase Dashboard -> Project Settings -> Database -> Connection string -> Session Pooler or Transaction Pooler. Use a URI connection string with SSL enabled, for example:

```text
postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?sslmode=require
```

The migration workflow sets `PGSSLROOTCERT` to `.github/certs/prod-ca-2021.crt` so `psql` can verify Supabase TLS with the Supabase Root 2021 CA when the connection string requires certificate validation.

The `service_role` key bypasses RLS, but it is not a replacement for a Postgres connection string when running `ALTER TABLE` migrations. Do not place a `service_role` key in frontend files, GitHub Pages artifacts, or local browser credentials.

---

## Where to Find Your Keys

1. Go to your Supabase project dashboard
2. Left sidebar → **Settings** → **API**
3. Copy:
   - **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** key → long `eyJhbGci...` string

---

## Adapter API

```js
// Teams load from DB automatically on DOMContentLoaded (wired in ui.js M3 block)
// Manual call if needed:
const teams = await SupabaseAdapter.loadTeamsFromDB();

// Wire this in ui.js after runBoSeries() completes:
if (SupabaseAdapter.enabled) {
  SupabaseAdapter.saveAnalysis({
    player_team_id: currentPlayerKey,
    opp_team_id:    oppKey,
    bo:             currentBo,
    win_rate:       res.winRate,
    wins:           res.wins,
    losses:         res.losses,
    draws:          res.draws,
    avg_turns:      res.avgTurns,
    avg_tr_turns:   res.avgTrTurns,
    sample_size:    res.total,
    analysis_json:  res,
    win_conditions: res.winConditions || [],
    logs:           res.logs || []
  });
}

// Get last 20 analyses for history view
const history = await SupabaseAdapter.loadRecentAnalyses(20);

// Disable for tests / sandboxes:
window.__DISABLE_SUPABASE__ = true; // set before adapter loads
```

---

## Security Rules

- `anon` key is safe to expose in client code — RLS blocks unauthorized writes
- **Never** put the `service_role` key in any frontend file or commit it to GitHub
- Anonymous users: read-only on reference/team tables, insert-only on analysis/log tables
- No UPDATE or DELETE for anonymous users on any table
- Auth scaffold is in `rls_policies_v1.sql` (commented out) — uncomment when adding login
- Unrestricted anonymous INSERT on `analyses` is a deliberate accepted-risk decision for a public sim with no auth. Add an Edge Function rate limiter if spam becomes a concern.

---

## QC Audit Findings (2026-04-27)

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | `schema_v1.sql` missing `metadata` column on `teams` — referenced by `loadTeamsFromDB()` | ✅ Fixed in schema_v1.sql |
| 2 | MEDIUM | README referenced `seed_teams_v1.sql` — v2 exists and supersedes it | ✅ Fixed in this README |
| 3 | LOW | Anon INSERT on `analyses` uses `WITH CHECK (true)` — any browser can insert rows | ✅ Accepted risk, documented |
| 4 | HIGH | No `saveAnalysis()` call site in `ui.js` — analyses never persist even when DB is live | ✅ Wired in `ui.js` after battle runs |
| 5 | MEDIUM | CDN `<script>` load order vs `supabase_adapter.js` not verified in `index.html` | ✅ Verified — Supabase JS loads before `supabase_adapter.js` |

---

## Migration Workflow

All schema changes use the **apply_migration-only** workflow. Never modify `schema_v1.sql` directly for incremental changes.

### Rules
1. Every DDL change gets its own timestamped file in `db/migrations/` (format: `YYYY_MM_DD_<slug>.sql`)
2. Baseline: `2026_04_27_baseline_v1.sql` — creates all 8 tables from scratch
3. Incremental: each subsequent migration is additive (`ALTER TABLE`, `CREATE INDEX`, etc.)
4. Run order: baseline first, then migrations sorted by filename timestamp
5. apply_migration steps:
   - Write the `.sql` file in `db/migrations/`
   - Test locally or in Supabase SQL Editor
   - Commit the migration file to the branch
   - After merge, execute in timestamp order with either:
     - GitHub Actions -> **Supabase DB Migration** -> **Run workflow**
     - Supabase SQL Editor, if no `SUPABASE_DB_URL` secret is configured

### Running the GitHub Migration Workflow

1. Add repository secret `SUPABASE_DB_URL_T` in GitHub.
2. Go to **Actions** -> **Supabase DB Migration**.
3. Click **Run workflow** on `main`.
4. Enter a migration filename from `poke-sim/db/migrations/`, for example:

```text
2026_05_12_align_reg_ma_meta_sources.sql
```

5. Confirm the workflow passes. For the Reg M-A snapshot migration, the workflow verifies that `prior_snapshots.usage_data.pokestats_bo3_top` can be read through the anon REST API after the DDL completes.

CLI equivalent:

```bash
gh workflow run db-migrate.yml \
  --repo TheYfactora12/Pokemon-Champions-Sim-Planner \
  --ref main \
  -f migration=2026_05_12_align_reg_ma_meta_sources.sql
```

After the workflow passes, rerun:

```bash
cd poke-sim
npm run test:db:live
```

The M10 live DB snapshot warning should be gone once the remote schema includes `prior_snapshots.usage_data`.

### Current Migrations

| File | Purpose |
|---|---|
| `2026_04_27_baseline_v1.sql` | Baseline: 8 tables, indexes, triggers |
| `2026_04_28_add_teams_metadata_column.sql` | Adds `teams.metadata` for generated seed metadata |
| `2026_04_28_seed_teams_v2.sql` | Generated delete-first seed for 34 teams; do not use on live DBs with analysis history |
| `2026_05_12_align_reg_ma_meta_sources.sql` | Adds `prior_snapshots.usage_data` if missing and seeds the current public Reg M-A source-alignment snapshot |
| `2026_05_15_refresh_reg_ma_meta_sources.sql` | Refreshes current Reg M-A meta source snapshot data |
| `2026_05_24_upsert_seed_teams_v2_repair.sql` | Superseded non-destructive 25-team seed repair for live DB alignment |
| `2026_06_20_align_shared_27_team_catalog.sql` | Non-destructive shared 34-team catalog alignment for existing live DBs; filename is historical |
| `2026_05_24_fix_champions_arena_2nd_item_clause.sql` | Historical/superseded item correction. Current generated seed and live alignment use `Coba Berry`; `Kouba Berry` is not in the verified Champions item pool until a stronger source proves otherwise. |
| `2026_06_22_retire_legacy_sv_teams.sql` | Marks retired v1 teams (`chuppa_balance`, `kingambit_sneasler`) inactive and removes their stale member/item rows while preserving team rows for historical FK references |
| `2026_06_06_showdown_sync_audit_tables.sql` | Adds Showdown sync runs, source files, mechanics validation runs, and findings |
| `2026_06_07_showdown_entities_approved_views.sql` | Adds approved Showdown entities, entity diffs, Champions overrides, and approved read views |

---

## Verification Checklist

- [x] Supabase project created and URL/key available
- [ ] `schema_v1.sql` executed — tables visible in Table Editor
- [ ] Current canonical seed alignment verified — 34 rows in `teams` table after `2026_06_20_align_shared_27_team_catalog.sql` runs
- [ ] Showdown sync/audit migration applied — `showdown_sync_runs` and `showdown_source_files` visible
- [ ] Showdown approved mirror migration applied — `approved_showdown_entities` and `approved_champions_data` visible
- [ ] `rls_policies_v1.sql` executed — RLS enabled on all tables
- [x] Supabase CDN `<script>` loads synchronously before `supabase_adapter.js` in `index.html`
- [ ] Local browser smoke uses ignored `local-credentials.js`
- [x] Live DB tests use ignored `.env.local` or GitHub Actions secrets
- [x] `saveAnalysis()` call wired in `ui.js` after Bo series completes
- [ ] Browser smoke confirms app reads seeded teams from Supabase on load
- [ ] Sim analysis write succeeds and row appears in Supabase Table Editor
- [ ] Records persist after page refresh
- [ ] App falls back gracefully when Supabase is unavailable (disable network, confirm no crash)
- [x] No secrets committed to GitHub
- [ ] Alfredo remote alignment reviewed separately before changing `alfredo/main`
