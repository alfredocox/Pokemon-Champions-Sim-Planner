# Champions Sim — Database Setup Guide

Run these SQL files in order inside the **Supabase SQL Editor**.

## Step-by-step

### Step 1 — Create tables
Paste and run `schema_v1.sql`.

### Step 2 — Seed reference data
Paste and run `seed_teams_v1.sql`.

### Step 3 — Enable Row Level Security
Paste and run `rls_policies_v1.sql`.

## Policy summary

| Table | anon SELECT | anon INSERT |
|---|---|---|
| rulesets | ✅ | ❌ |
| teams | ✅ | ❌ |
| team_members | ✅ | ❌ |
| prior_snapshots | ✅ | ❌ |
| golden_battles | ✅ | ❌ |
| analyses | ✅ | ✅ |
| analysis_win_conditions | ✅ | ✅ |
| analysis_logs | ✅ | ✅ |

## Wiring the app

After running the SQL, add your Supabase credentials to `index.html`
before the `supabase_adapter.js` script tag:

```html
<!-- Supabase JS CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Inject credentials (replace with your real values) -->
<script>
  window.__SUPABASE_URL__      = 'https://YOUR_PROJECT_ID.supabase.co';
  window.__SUPABASE_ANON_KEY__ = 'YOUR_ANON_KEY';
</script>

<!-- Adapter -->
<script src="supabase_adapter.js"></script>
```

That's it. On page load the adapter will pull remote teams into `window.TEAMS`
and expose `window.SupabaseAdapter.saveAnalysis(payload)` for use in `engine.js`.
