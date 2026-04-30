# M4 Conflict Resolution Plan

Status: planning only. Do not resolve these conflicts inside PR 1.

Before M4 implementation, resolve merge conflicts in:

- `poke-sim/supabase_adapter.js`
- `poke-sim/db/README_DB.md`
- `poke-sim/db/rls_policies_v1.sql`

## Resolution Rules

- Remove all merge markers.
- Confirm adapter API surface.
- Confirm whether `saveAnalysis(payload)` exists.
- Confirm whether adapter is fail-soft.
- Confirm whether DB schema uses:
  - `analyses`
  - `analysis_win_conditions`
  - `analysis_logs`
  or another table contract.
- Confirm RLS policies are append-safe and do not expose secrets.
- Confirm anon client only; never commit service role keys.
- Confirm `.env.example` does not contain realistic-looking secrets.

## Resolution Order

1. Resolve `poke-sim/supabase_adapter.js` first so the browser adapter API is stable.
2. Reconcile `poke-sim/db/rls_policies_v1.sql` against `poke-sim/db/schema_v1.sql`.
3. Update `poke-sim/db/README_DB.md` after the adapter and RLS contract are known.
4. Only then proceed to M4 persistence wiring in `poke-sim/ui.js`.

## Required Decisions Before M4

- Choose the canonical `SupabaseAdapter.saveAnalysis` payload shape.
- Decide whether `_buildAnalysisPayload` belongs in `ui.js`, `supabase_adapter.js`, or as a thin wrapper around `engine.js` `buildAnalysisPayload`.
- Confirm append-only RLS policies for `analyses`, `analysis_win_conditions`, and `analysis_logs`.
- Confirm anonymous client behavior and verify no service-role key is committed.
- Confirm local-only/offline behavior stays fail-soft.

## Validation Required After Conflict Cleanup

- Run the DB wiring and M4 tests locally with Node.
- Run a browser smoke test for single-run and run-all flows.
- Verify no merge markers remain.
- Rebuild the bundle only after source conflicts are resolved.
- Bump `sw.js` cache name if runtime source changed.
