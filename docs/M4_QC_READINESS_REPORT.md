# M4 / POK-20 QC Readiness Report

Status: NO-SHIP.

This report records the documentation and conflict-triage gate before any M4 persistence implementation. It intentionally does not change runtime source, database SQL, tests, the service worker, or the built bundle.

## Repo And Path Truth

- Active working GitHub repository: `TheYfactora12/Pokemon-Champions-Sim-Planner`.
- Production reference after cleaned work is intentionally pushed upstream: `alfredocox/Pokemon-Champions-Sim-Planner` `main`.
- Clean PR 1 base checkout: `C:\Users\kevin\OneDrive\Documents\GitHub\New folder\Pokemon-Champions-Sim-Planner` on `main`.
- DB/Supabase work checkout: `C:\Users\kevin\OneDrive\Documents\GitHub\Pokemon-Champions-Sim-Planner` on `feat/db-rls-supabase-adapter`.
- Empty directory that should not be used: `C:\Users\kevin\OneDrive\Documents\New project`.
- Duplicate checkout note: the clean `GitHub\New folder` checkout is suitable for docs/QC work; the non-duplicate checkout contains the unresolved DB/Supabase work.

## Active App Architecture

- App shell: `poke-sim/index.html`
- Source inputs: `poke-sim/data.js`, `poke-sim/engine.js`, `poke-sim/storage_adapter.js`, `poke-sim/supabase_adapter.js`, `poke-sim/ui.js`, `poke-sim/legality.js`, `poke-sim/strategy-injectable.js`
- Built bundle: `poke-sim/pokemon-champion-2026.html`
- Battle engine: `poke-sim/engine.js`
- UI simulation flow: `poke-sim/ui.js`
- PWA cache: `poke-sim/sw.js`
- DB adapter: `poke-sim/supabase_adapter.js`
- DB schema/RLS: `poke-sim/db/schema_v1.sql`, `poke-sim/db/rls_policies_v1.sql`
- Existing CI: bundle freshness and cache bump checks only.

## Blocking Findings

1. Merge conflicts exist in:
   - `poke-sim/supabase_adapter.js`
   - `poke-sim/db/README_DB.md`
   - `poke-sim/db/rls_policies_v1.sql`
2. M4 save hook is not wired into visible single-run or run-all completion paths in `poke-sim/ui.js`.
3. `db_m4_save_tests.js` expects `_buildAnalysisPayload`, but `ui.js` does not currently expose that helper.
4. `engine.js` contains `buildAnalysisPayload`, but that appears to be a different payload contract.
5. `sw.js` still uses `champions-sim-v9-m3-init-wired`; any future M4 changes to `ui.js`, `engine.js`, `data.js`, or `style.css` require a cache bump.
6. Node test execution was blocked during audit with `Access is denied`; a developer still needs to run tests locally.

## Required PR Sequence

1. PR 1 - Docs/QC cleanup and conflict triage.
2. PR 2 - M4 persistence implementation after DB adapter/RLS conflicts are resolved.
3. PR 3 - Infrastructure hardening, including DB test CI and PR template/build validation improvements.

## M4 Canonical Payload Contract - Draft

PR 2 must define one canonical analysis payload builder before wiring persistence.

Required fields:
- `ruleset_id`
- `player_team_id`
- `opp_team_id`
- `bo`
- `sample_size`
- `wins`
- `losses`
- `draws`
- `win_rate`
- `confidence_interval`, if available
- `policy_model`
- `analysis_json`
- `win_conditions`
- capped `logs`
- seed references, if available

Rules:
- Payload construction must be shared by tests and runtime.
- Do not maintain competing `_buildAnalysisPayload` and `buildAnalysisPayload` contracts without a clear adapter.
- Logs must be capped.
- Persistence must happen after UI render and must be fire-and-forget.
- Persistence failure must never block battle simulation or result display.

## PR 2 Entry Criteria

- All merge markers are removed from DB adapter/RLS files.
- `SupabaseAdapter.saveAnalysis` has one canonical payload contract.
- `_buildAnalysisPayload` versus `buildAnalysisPayload` is reconciled before UI wiring.
- M4 persistence remains fire-and-forget and runs after result rendering.
- Logs are capped before persistence.
- `sw.js` cache name is bumped if runtime source changes.
- Bundle rebuild happens only after source conflicts are resolved.
- Required Node tests are run by a developer in an environment where `node` is executable.

## Required Local Validation Before M4 PR

Run locally after conflicts are resolved:

```bash
cd poke-sim
node tests/items_tests.js
node tests/status_tests.js
node tests/mega_tests.js
node tests/coverage_tests.js
node tests/t9j8_tests.js
node tests/t9j9_tests.js
node tests/t9j10_tests.js
node tests/t9j11_tests.js
node tests/t9j12_tests.js
node tests/t9j13_tests.js
node tests/t9j14_tests.js
node tests/t9j15_tests.js
node tests/t9j16_tests.js
node tests/audit.js
```

Then run the bundle rebuild command documented in the repo.

Browser smoke:
- Open app locally.
- Run single simulation.
- Run all matchups.
- Confirm no console errors.
- Confirm persistence failure does not block UI.
- Confirm service worker cache bump if source changed.

## Persona / Cross-Functional Gate Summary

- Product: No-Ship until M4 creates durable saved value.
- TPM: Split PRs.
- Simulation: Reconcile payload contract.
- Frontend/PWA: Save after render, bump cache.
- Infra: Resolve conflicts and run CI.
- QA: Run tests locally.
- Data: Adopt canonical schema.
- Domain: Store BO/sample/CI to avoid overconfidence.
- UX: Do not loudly surface save failure.
- Security: No secrets, review RLS.
- Docs: Fix source-of-truth.
- Growth: Do not launch broken persistence.

## Release Gate

Do not implement M4, wire `saveAnalysis`, rebuild the bundle, push to `main`, or merge until PR 1 is merged and the adapter/RLS conflicts are resolved.
