# Champions Sim — Database Setup

## Run SQL files in this order

1. `schema_v1.sql` — creates all 8 tables
2. `seed_teams_v1.sql` — loads all 13 tournament teams
3. `rls_policies_v1.sql` — enables RLS, sets anon permissions

All three go into **Supabase Dashboard → SQL Editor → New Query → Run**.

---

## Wire credentials into index.html

Add these two lines **before** the `supabase_adapter.js` `<script>` tag:

```html
<script>
  window.__SUPABASE_URL__ = 'https://YOUR-PROJECT-ID.supabase.co';
  window.__SUPABASE_KEY__ = 'your-anon-public-key';
</script>
<script src="supabase_adapter.js"></script>
```

Get both values from: **Supabase → Settings → API**

---

## Verify it's working

Run any sim in the app. Open browser console. You should see:

```
[SupabaseAdapter] ✓ Saved <uuid> (player vs mega_altaria Bo3)
```

Then check **Supabase → Table Editor → analyses** — the row should be there.

---

## Permissions table

| Table | anon SELECT | anon INSERT |
|---|:---:|:---:|
| rulesets | ✅ | ❌ |
| teams | ✅ | ❌ |
| team_members | ✅ | ❌ |
| prior_snapshots | ✅ | ❌ |
| golden_battles | ✅ | ❌ |
| analyses | ✅ | ✅ |
| analysis_win_conditions | ✅ | ✅ |
| analysis_logs | ✅ | ✅ |

Reference data = read-only. Sim results = append-only (no UPDATE/DELETE from anon).
