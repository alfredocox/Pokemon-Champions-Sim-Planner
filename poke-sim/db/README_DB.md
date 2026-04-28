# Champions Sim — Database Setup

> **🔴 STATUS: P0 IN PROGRESS**  
> GitHub Issue: [#158 — Finish Supabase DB Integration](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158)  
> Owner: Alfredo  
> Blocker: Lina must accept collaborator invite first.

---

## Stack
Supabase (Postgres + RLS) + `supabase-js` v2

---

## Files in This Folder

| File | Purpose | Status |
|---|---|---|
| `schema_v1.sql` | Creates all 8 tables | ✅ Ready to run |
| `seed_teams_v1.sql` | Seeds all 13 tournament teams | ✅ Ready to run |
| `rls_policies_v1.sql` | Row-level security policies | ✅ Ready to run |
| `README_DB.md` | This file | — |

App layer: `poke-sim/storage_adapter.js` — needs Supabase wiring finalized.

---

## Run Order (Supabase SQL Editor)

| Step | File | Notes |
|---|---|---|
| 1 | `schema_v1.sql` | Creates tables — run first |
| 2 | `seed_teams_v1.sql` | Loads 13 teams — verify rows in Table Editor after |
| 3 | `rls_policies_v1.sql` | Locks down security — run last |
| 4 | Wire credentials in `index.html` | See below |

---

## index.html Wiring (add before `</head>`)

```html
<!-- Supabase JS v2 -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<!-- Credentials (anon key only — safe to expose) -->
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
// Load teams from DB (auto-runs on DOMContentLoaded)
await SupabaseAdapter.loadTeamsFromDB();

// Save a sim result after a Bo series
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
```

---

## Security Rules

- `anon` key is safe to expose in client code — RLS blocks unauthorized writes
- **Never** put the `service_role` key in any frontend file or commit it to GitHub
- Anonymous users: read-only on reference/team tables, insert-only on analysis/log tables
- No update or delete for anonymous users on any table
- Auth scaffold is in `rls_policies_v1.sql` (commented out) — uncomment when adding login

---

## Verification Checklist (Alfredo)

- [ ] Supabase project created and URL/key available
- [ ] `schema_v1.sql` executed — tables visible in Table Editor
- [ ] `seed_teams_v1.sql` executed — 13 rows in `teams` table
- [ ] `rls_policies_v1.sql` executed — RLS enabled on all tables
- [ ] `index.html` wired with Supabase client
- [ ] App reads seeded teams from Supabase on load
- [ ] Sim analysis write succeeds and persists on refresh
- [ ] App falls back gracefully when Supabase is unavailable
- [ ] No secrets committed to GitHub
- [ ] Comment posted on Issue [#158](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/158) confirming completion
