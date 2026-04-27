# Champions Sim — Supabase Setup Instructions

Complete these 5 steps **in order**.

---

## Step 1 — Run Schema

1. Supabase Dashboard → your project → **SQL Editor** → New query
2. Paste full contents of `schema_v1.sql`
3. Click **Run**
4. Confirm 8 tables appear in **Table Editor**

---

## Step 2 — Run Seed Data

1. New query
2. Paste `seed_teams_v1.sql`
3. Click **Run**

---

## Step 3 — Run RLS Policies

1. New query
2. Paste `rls_policies_v1.sql`
3. Click **Run**
4. Verify:
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```
Expect 10 rows (policies across 5 tables).

---

## Step 4 — Wire Keys into index.html

Get from: **Supabase Dashboard → Settings → API**

In `index.html`, just before `</head>`, add:
```html
<script>
  window.__SUPABASE_URL__      = 'https://YOUR_PROJECT_REF.supabase.co';
  window.__SUPABASE_ANON_KEY__ = 'YOUR_ANON_KEY_HERE';
</script>
```

Just before `</body>`, add:
```html
<script src="supabase_adapter.js"></script>
```

> ⚠️ Never commit real keys to a public repo.

---

## Step 5 — Hook saveAnalysis into ui.js

In `ui.js`, after your Bo series result is built, add:
```js
if (window.SupabaseAdapter) {
  SupabaseAdapter.saveAnalysis({
    analysis_id:    crypto.randomUUID(),
    engine_version: '1.0.0',
    ruleset_id:     'vgc2026_reg_m_a',
    player_team_id: currentPlayerKey,
    opp_team_id:    oppKey,
    bo:             currentBo,
    win_rate:       res.winRate,
    wins:           res.wins,
    losses:         res.losses,
    draws:          res.draws || 0,
    avg_turns:      res.avgTurns || 0,
    avg_tr_turns:   res.avgTrTurns || 0,
    sample_size:    currentBo,
    win_conditions: res.winConditions || [],
    logs:           res.logs || []
  });
}
```

---

## RLS Access Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| rulesets | ✅ public | ❌ | ❌ | ❌ |
| teams | ✅ public | ❌ | ❌ | ❌ |
| team_members | ✅ public | ❌ | ❌ | ❌ |
| prior_snapshots | ✅ public | ❌ | ❌ | ❌ |
| golden_battles | ✅ public | ❌ | ❌ | ❌ |
| analyses | ✅ public | ✅ anon | ❌ | ❌ |
| analysis_win_conditions | ✅ public | ✅ anon | ❌ | ❌ |
| analysis_logs | ✅ public | ✅ anon | ❌ | ❌ |
