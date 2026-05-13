# Champions Sim — Database Setup

> **🔴 STATUS: P0 IN PROGRESS**
> GitHub Issue: [#158 — Finish Supabase DB Integration](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158)
> Owner: Alfredo
> Blocker: Supabase project not yet provisioned. Lina must accept collaborator invite first.

---

## Stack
Supabase (Postgres + RLS) + `supabase-js` v2

---

## Files in This Folder

| File | Purpose | Status |
|---|---|---|
| `schema_v1.sql` | Creates all 8 tables | ✅ Updated 2026-04-27 — added `metadata` column to `teams` |
| `seed_teams_v2.sql` | Seeds all 13 tournament teams | ✅ Use v2 (42 KB) — supersedes v1 |
| `rls_policies_v1.sql` | Row-level security policies | ✅ Ready to run |
| `README_DB.md` | This file | — |

> ⚠️ Use `seed_teams_v2.sql` — NOT `seed_teams_v1.sql`. v2 has complete data for all 13 teams.

App layer: `poke-sim/supabase_adapter.js` — fully implemented. Browser credentials are injected at runtime through ignored local files or CI secrets; real keys must not be committed.

---

## Run Order (Supabase SQL Editor)

| Step | File | Notes |
|---|---|---|
| 1 | `schema_v1.sql` | Creates all 8 tables — run first |
| 2 | `seed_teams_v2.sql` | Loads 13 teams — verify 13 rows in Table Editor after |
| 3 | `rls_policies_v1.sql` | Locks down security — run last |
| 4 | Wire local or CI credentials | See below |
| 5 | Wire `saveAnalysis()` in `ui.js` | See Adapter API section below |

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
| 4 | HIGH | No `saveAnalysis()` call site in `ui.js` — analyses never persist even when DB is live | ❌ OPEN — Alfredo must wire in ui.js |
| 5 | MEDIUM | CDN `<script>` load order vs `supabase_adapter.js` not verified in `index.html` | ❌ OPEN — Alfredo must confirm |

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
   - After merge, execute in the live Supabase SQL Editor in timestamp order

### Current Migrations

| File | Purpose |
|---|---|
| `2026_04_27_baseline_v1.sql` | Baseline: 8 tables, indexes, triggers |
| `2026_05_12_align_reg_ma_meta_sources.sql` | Adds `prior_snapshots.usage_data` if missing and seeds the current public Reg M-A source-alignment snapshot |

---

## Verification Checklist (Alfredo)

- [ ] Supabase project created and URL/key available
- [ ] `schema_v1.sql` executed — tables visible in Table Editor
- [ ] `seed_teams_v2.sql` executed — 13 rows in `teams` table
- [ ] `rls_policies_v1.sql` executed — RLS enabled on all tables
- [ ] Supabase CDN `<script>` loads synchronously before `supabase_adapter.js` in `index.html`
- [ ] Local browser smoke uses ignored `local-credentials.js`
- [ ] Live DB tests use ignored `.env.local` or GitHub Actions secrets
- [ ] `saveAnalysis()` call wired in `ui.js` after Bo series completes
- [ ] App reads seeded teams from Supabase on load
- [ ] Sim analysis write succeeds and row appears in Supabase Table Editor
- [ ] Records persist after page refresh
- [ ] App falls back gracefully when Supabase is unavailable (disable network, confirm no crash)
- [ ] No secrets committed to GitHub
- [ ] Comment posted on Issue [#158](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158) confirming completion
