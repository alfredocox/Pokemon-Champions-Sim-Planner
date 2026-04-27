# Champions Sim — Database Setup

## Stack
Supabase (Postgres + RLS) + `supabase-js` v2

---

## Run Order

| Step | File | Where |
|------|------|-------|
| 1 | `schema_v1.sql` | Supabase SQL Editor |
| 2 | `seed_teams_v1.sql` | Supabase SQL Editor |
| 3 | `rls_policies_v1.sql` | Supabase SQL Editor |
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

// Get last 20 analyses for a history view
const history = await SupabaseAdapter.loadRecentAnalyses(20);
```

---

## Security
- `anon` key is safe to expose — RLS blocks all writes to reference tables
- **Never** put the `service_role` key in any frontend file
- No update/delete for anonymous users on any table
- Auth scaffold is in `rls_policies_v1.sql` (commented out) — uncomment when adding login
