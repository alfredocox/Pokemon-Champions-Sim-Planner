# Champions Sim Database Setup

Status: conflict markers removed. This document describes the current DB contract only; M4 UI persistence wiring is still blocked until the canonical payload builder is reconciled.

## Files

| File | Purpose |
|---|---|
| `schema_v1.sql` | Creates the current database tables |
| `seed_teams_v1.sql` | Seeds reference team data currently present on `main` |
| `rls_policies_v1.sql` | Enables RLS and anon-safe read/append policies |

## Current Tables

- `rulesets`
- `teams`
- `team_members`
- `prior_snapshots`
- `golden_battles`
- `analyses`
- `analysis_win_conditions`
- `analysis_logs`

## Run Order

1. Run `schema_v1.sql`.
2. Run `seed_teams_v1.sql`.
3. Run `rls_policies_v1.sql`.

## Adapter API

`poke-sim/supabase_adapter.js` exposes:

- `SupabaseAdapter.enabled`
- `SupabaseAdapter.DEFAULT_RULESET_ID`
- `SupabaseAdapter.loadTeamsFromDB()`
- `SupabaseAdapter.loadRulesets()`
- `SupabaseAdapter.saveAnalysis(payload)`
- `SupabaseAdapter.loadRecentAnalyses(limit)`
- `SupabaseAdapter.getMatchupHistory(playerKey, oppKey, limit)`

All public methods must fail soft. Missing credentials, offline network, missing Supabase client, RLS denial, or API errors must not break the browser app.

## Credential Rules

- Use only the anon/public key in browser code.
- Never commit service-role keys.
- Project URL: `https://ymlahqnshgiarpbgxehp.supabase.co`.
- Inject credentials at runtime through `window.__SUPABASE_URL__` and `window.__SUPABASE_KEY__`.
- Keep `window.__SUPABASE_KEY__` as a placeholder unless intentionally wiring the public anon key.
- Tests and sandboxes may set `window.__DISABLE_SUPABASE__ = true` before the adapter loads.

## RLS Summary

| Table group | anon SELECT | anon INSERT | anon UPDATE/DELETE |
|---|---:|---:|---:|
| Reference tables: `rulesets`, `teams`, `team_members`, `prior_snapshots`, `golden_battles` | Yes | No | No |
| Analysis tables: `analyses`, `analysis_win_conditions`, `analysis_logs` | Yes | Yes | No |

## M4 Notes

PR 2 must define one canonical analysis payload builder before wiring persistence in `ui.js`.

Required decisions before M4:

- Reconcile `buildAnalysisPayload` and `_buildAnalysisPayload`.
- Confirm `saveAnalysis(payload)` payload shape.
- Keep logs capped before persistence.
- Keep persistence fire-and-forget after UI render.
- Keep persistence failures console-only and non-blocking.
