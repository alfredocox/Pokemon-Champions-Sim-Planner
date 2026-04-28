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

App layer: `poke-sim/supabase_adapter.js` — fully implemented. Needs credentials injected in `index.html` and `saveAnalysis()` call wired in `ui.js`.

---

## Run Order (Supabase SQL Editor)

| Step | File | Notes |
|---|---|---|
| 1 | `schema_v1.sql` | Creates all 8 tables — run first |
| 2 | `seed_teams_v2.sql` | Loads 13 teams — verify 13 rows in Table Editor after |
| 3 | `rls_policies_v1.sql` | Locks down security — run last |
| 4 | Wire credentials in `index.html` | See below |
| 5 | Wire `saveAnalysis()` in `ui.js` | See Adapter API section below |

---

## index.html Wiring (add before `</head>`)

```html
<!-- Supabase JS v2 — must load BEFORE supabase_adapter.js -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<!-- Credentials (anon key only — safe to expose in browser, do NOT commit to git) -->
<script>
  window.__SUPABASE_URL__ = 'https://YOUR_PROJECT.supabase.co';
  window.__SUPABASE_KEY__ = 'YOUR_ANON_KEY';
</script>
```

And before `</body>`:
```html
<script src="supabase_adapter.js"></script>
```

> ⚠️ Replace `YOUR_PROJECT` and `YOUR_ANON_KEY` with real values.
> ⛔ Never put the `service_role` key here — anon key only.
> ⛔ Do NOT commit your real anon key to a tracked file. Inject at deploy time if possible.

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

## Verification Checklist (Alfredo)

- [ ] Supabase project created and URL/key available
- [ ] `schema_v1.sql` executed — tables visible in Table Editor
- [ ] `seed_teams_v2.sql` executed — 13 rows in `teams` table
- [ ] `rls_policies_v1.sql` executed — RLS enabled on all tables
- [ ] Supabase CDN `<script>` loads synchronously before `supabase_adapter.js` in `index.html`
- [ ] `index.html` wired with `window.__SUPABASE_URL__` and `window.__SUPABASE_KEY__`
- [ ] `saveAnalysis()` call wired in `ui.js` after Bo series completes
- [ ] App reads seeded teams from Supabase on load
- [ ] Sim analysis write succeeds and row appears in Supabase Table Editor
- [ ] Records persist after page refresh
- [ ] App falls back gracefully when Supabase is unavailable (disable network, confirm no crash)
- [ ] No secrets committed to GitHub
- [ ] Comment posted on Issue [#158](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158) confirming completion
