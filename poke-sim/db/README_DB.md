# Pokemon Champions Sim — Database Layer

## Run Order (Supabase SQL Editor)

| # | File | What it does |
|---|---|---|
| 1 | `schema_v1.sql` | Creates all 8 tables |
| 2 | `seed_teams_v1.sql` | Seeds 13 tournament teams |
| 3 | `rls_policies_v1.sql` | Enables RLS + anon-safe policies |

## One-Time Supabase Setup (~5 min)

1. **Supabase Dashboard → SQL Editor**
2. Paste & run `schema_v1.sql`
3. Paste & run `seed_teams_v1.sql`  
4. Paste & run `rls_policies_v1.sql`
5. **Settings → API** → copy your Project URL + `anon` public key

## Wire Into index.html

Add this block to `<head>` **before** all other `<script>` tags:

```html
<!-- Supabase credentials -->
<script>
  window.__SUPABASE_URL__ = 'https://YOUR_PROJECT_REF.supabase.co';
  window.__SUPABASE_KEY__ = 'YOUR_ANON_PUBLIC_KEY';
</script>
<script src="supabase_adapter.js"></script>
```

## Call from ui.js

```js
// After any sim completes
await SupabaseAdapter.saveAnalysis({
  playerKey:      currentPlayerKey,
  opponentKey:    currentOpponentKey,
  format:         currentFormat,
  boSize:         currentBo,
  wins:           result.wins,
  losses:         result.losses,
  winRate:        result.winRate,
  pilotNotes:     result.pilotNotes,
  matchupResults: result.matchupResults  // optional array
});

// Health check from browser console anytime:
SupabaseAdapter.ping();
```

## RLS Policy Table

| Table | anon SELECT | anon INSERT |
|---|:---:|:---:|
| rulesets | ✅ | ❌ |
| teams | ✅ | ❌ |
| team_members | ✅ | ❌ |
| moves | ✅ | ❌ |
| analyses | ✅ | ✅ |
| analysis_logs | ✅ | ✅ |
| matchup_results | ✅ | ✅ |
| pilot_notes | ✅ | ✅ |

## Offline Behavior

`supabase_adapter.js` **always writes to localStorage first**, then syncs
to Supabase async (fire-and-forget). If Supabase is unreachable or credentials
are missing, the app works 100% normally — Supabase is additive, not required.
