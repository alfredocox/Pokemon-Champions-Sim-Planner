# Repo Sync Playbook

This repo is the validated source of truth for simulator work.

Use this playbook when the same fix needs to land in a comparison or mirror repo such as Alfredo's fork.

## Goal

Keep mirror repos aligned with one validated sync PR instead of stacking many narrow mirror PRs that drift, conflict, and re-fail the same checks.

## Rules

- Validate in this repo first.
- Treat this repo's merged or review-ready branch as the source of truth.
- Use one rolling sync branch in the mirror repo.
- Regenerate derived artifacts after copying source changes.
- Refresh deterministic fixtures if engine or replay-log output intentionally changed.
- Close superseded mirror PRs only after the consolidated sync PR merges.
- Close issues only after the fix is actually on the mirror repo's `main`.

## Recommended Order

1. Finish the real fix here first.
2. Confirm local validation here.
3. Open or reuse one mirror sync branch.
4. Copy the validated source changes into the mirror repo.
5. Regenerate derived artifacts in the mirror repo.
6. Rerun the mirror repo validation stack.
7. Open one superseding sync PR in the mirror repo.
8. Merge that sync PR after checks pass.
9. Close older mirror PRs with explicit superseded notes.
10. Close mirror issues that the merged sync actually resolved.

## What To Regenerate

Regenerate only what the copied fix actually invalidates.

- Bundle: `cd poke-sim && python3 tools/build-bundle.py`
- Bundle check: `bash poke-sim/tools/check-bundle.sh`
- Seed artifacts: `python3 poke-sim/tools/generate_seed_from_data.py`
- Deterministic engine fixtures: `node poke-sim/tests/golden_battles_runner.js --generate`

## Minimum Validation

Run the narrowest set that proves the sync is real, then the fast suite.

- changed focused tests
- `git diff --check`
- bundle freshness check if source files affect shipped bundle
- `npm --prefix poke-sim run test:fast`

If the sync touches DB/data-sensitive files, also run the relevant DB suites.

## When Stress Testing Is Required

Not every mirror sync needs a full stress test.

Use this rule:

- Docs-only sync: no stress test
- Test-only sync: rerun the touched tests plus `npm --prefix poke-sim run test:fast`
- UI-only sync with no engine/data change: rerun focused UI tests plus bundle check
- Engine, battle-log, replay, legality, stats, seeded-team, or generated-data sync: run a real stress pass

For simulator-affecting syncs, use this order:

1. Validate the fix in this repo first.
2. Run focused changed tests here.
3. Run `npm --prefix poke-sim run test:fast` here.
4. Run `node poke-sim/tests/audit.js` here if engine or data changed.
5. Mirror the validated change.
6. Regenerate artifacts in the mirror repo.
7. Rerun focused tests in the mirror repo.
8. Run `npm --prefix poke-sim run test:fast` in the mirror repo.
9. Let mirror CI confirm the sync.

If the change affects shipped bundle output, always rebuild and run the bundle freshness check on both sides.

## Mirror Repo PR Pattern

The best mirror PR is a consolidated sync PR, not a pile of one-off ports.

Include:

- what source branch or validated state it syncs from
- exact tests run
- whether bundle artifacts were regenerated
- whether DB artifacts were regenerated
- which older mirror PRs it supersedes

## Common Failure Modes

- stale generated bundle
- stale seed SQL after `data.js` changed
- stale golden hashes after intentional engine/log behavior changes
- live DB drift causing CI failures even when source code is correct
- closing mirror issues before the consolidated sync is merged to `main`

## Live DB Note

Read-only CI secrets are not enough for migration workflows.

If the mirror repo needs to apply DB migrations itself, it must also have the appropriate DB write secret configured, such as:

- `SUPABASE_DB_URL_T`
- `SUPABASE_DB_URL_P`
- or fallback `SUPABASE_DB_URL`

Without that, the code may be aligned while the mirror repo still cannot self-apply the live DB migration.

## Fastest Repeatable Pattern

- fix and validate here
- sync once there
- regenerate artifacts
- rerun checks
- merge one PR
- close superseded work
