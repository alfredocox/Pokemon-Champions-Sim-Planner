# Supabase Setup — Champions Sim 2026

Project ref: `ymlahqnshgiarpbgxehp`  
Dashboard: https://supabase.com/dashboard/project/ymlahqnshgiarpbgxehp

---

## Step 1 — Run SQL (in order)

Go to: https://supabase.com/dashboard/project/ymlahqnshgiarpbgxehp/sql/new

| Order | File | What it does |
|---|---|---|
| 1 | `schema_v1.sql` | Creates all 8 tables |
| 2 | `seed_teams_v1.sql` | Seeds 13 tournament teams + rulesets |
| 3 | `rls_policies_v1.sql` | Enables RLS, locks permissions |

---

## Step 2 — Get Your Anon Key

Go to: https://supabase.com/dashboard/project/ymlahqnshgiarpbgxehp/settings/api

Copy the **anon / public** key.

---

## Step 3 — Add to index.html

In `index.html`, before the closing `</head>` tag:

```html
<script>window.SUPABASE_ANON_KEY = 'your-anon-key-here';</script>
<script src="supabase_adapter.js"></script>
```

---

## Step 4 — Wire saveAnalysis() into ui.js

Find where `runBoSeries()` returns its result in `ui.js` and add:

```javascript
if (window.SupabaseAdapter) {
  SupabaseAdapter.saveAnalysis(result, playerKey, oppKey, currentBo);
}
```

---

## Step 5 — MCP (Claude Code IDE only)

```bash
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=ymlahqnshgiarpbgxehp"
```

Then authenticate in a standalone terminal (not VS Code):
```bash
claude /mcp
```
Select `supabase` → Authenticate → approve in browser.

---

## RLS Permissions Summary

| Table | anon SELECT | anon INSERT |
|---|---|---|
| rulesets | yes | no |
| teams | yes | no |
| team_members | yes | no |
| prior_snapshots | yes | no |
| golden_battles | yes | no |
| analyses | yes | yes |
| analysis_win_conditions | yes | yes |
| analysis_logs | yes | yes |
