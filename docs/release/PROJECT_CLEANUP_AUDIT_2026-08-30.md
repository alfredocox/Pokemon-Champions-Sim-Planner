# Project Cleanup And Efficiency Audit

Date: 2026-08-30. Scope: current local branch, source inspection, independent reviews and offline tests. This is a first cleanup pass, not a whole-project correctness or live-database certification.

## Decision

Clean up measured duplication and ownership problems first. Do not replace battle code wholesale, delete historical migrations, or purge replay/source evidence merely because it is large or old.

The main owner performed release/workflow cleanup; independent runtime/release and trust/database reviewers examined the boundaries. No runtime JavaScript or engine mechanics changed. Local build remains `v2.2.134-regulation-preflight`, engine `1.1.2`.

## Closed Locally

- CI test job installs locked dependencies once instead of twice. Installation is outside the step holding test DB credentials.
- Removed CI's unused post-test credential injection into an HTML file that the job never uploaded or deployed. Pages remains the deployment configuration owner.
- Cleanup still runs after a failed live test, but only after dependencies installed and that run explicitly activated live testing. Mock-only runs no longer trigger shared DB cleanup.
- DB-relevant CI test jobs share a same-repository concurrency group; offline jobs have independent run groups. The existing prefix-based cleanup helper is not universally isolated: other repositories/manual runners must use separate test projects. Per-run fixture ownership remains open.
- Pages no longer executes 18 duplicate test-file invocations. All 14 source-truth suites and four additional suites remain in the shared fast gate. The distinct live seed check and bundle freshness check remain.
- Fixed Pages staging omission of `generated/tournament_catalog.js`, already requested by the page and service worker. A failing-before/passing-after inventory test now compares page dependencies and precache assets with explicit staging lists, and protects deduplicated test coverage.
- Removed stale CI comments claiming supported test suites were excluded.
- Corrected the DB setup guide's instruction to regenerate applied historical migrations. New catalog changes require reviewed additive migrations and live readback, not rewriting history.
- Added bounded, read-only [database diagnostics](../../poke-sim/db/diagnostics/cleanup_preflight.sql). This is not a migration and has not been executed on Supabase.

## Measured Inventory

Before adding this report, 490 tracked/nonignored files present on disk totaled 71,430,578 bytes. This excludes `.git`, ignored dependencies and local QA artifacts; it is not repository-history size or a download-size measurement.

| Surface | Bytes | Interpretation |
|---|---:|---|
| Generated HTML bundle | 11,419,764 | Intentional offline artifact; do not hand-edit/delete |
| Generated Showdown legal data | 8,525,121 | Largest runtime source input; needs runtime/audit projection review |
| `ui.js` | 1,201,030 | Broad ownership; split by feature after behavior characterization |
| Pokemon audit CSV | 33,760,699 | Referenced by tests; not proven disposable |
| Pokemon audit XLSX | 6,940,120 | Referenced by tests; replace test contract before archival |

The service worker lists approximately 22.76 MB of existing local assets, excluding its additional `./` response, because both the all-in-one bundle and separate modules are precached. This is potential duplicated cache/download work, not a measured live transfer or browser quota failure.

There are 25 source migration files. File count does not establish which migrations ran live.

## Prioritized Open Work

| ID | Priority | Finding and evidence | Acceptance before closure |
|---|---|---|---|
| CLEAN-01 | P1 | Conflicting bootstrap ownership: `2026_04_27_baseline_v1.sql` defines UUID `rulesets.id`/team IDs while `schema_v1.sql` uses text `ruleset_id`/team IDs; member/analysis shapes also differ. | Capture actual deployed schema; choose one canonical fresh-install/upgrade contract; prove both in disposable DBs. Do not edit applied migrations. |
| CLEAN-02 | P2 | `supabase_adapter.js` roster reads use unpaginated `select('*')` for all teams and members. Reviewer capped-response mock returned 1,000/1,200 members, leaving 200 teams incomplete while reporting connected. This is a capacity defect, not a claim about today's small live roster. | Stable pagination, scoped member reads, durable member IDs, completeness checks, and >1,000-member regression. Measure latency/payload size before and after. |
| CLEAN-03 | P1 truth / P2 storage | Mirror writer stores each entity payload under a run-specific ID. Approved view selects latest rows per entity across historical runs, so an entity absent from a newer snapshot can survive from an older one. Retention is undefined. | Digest-bound complete active snapshot and removal semantics first; then measure duplicated bytes and referenced runs before defining archival retention. |
| CLEAN-04 | P2 | CI cleanup helper deletes broad `test%` records. Same-repo serialization and live-only gating mitigate one path, not cross-repo/manual interference or abandoned runs. | Run-owned fixture IDs and cleanup scope; cancellation/parallel-run tests. Never share the test project with production or unrelated repositories. |
| CLEAN-05 | P2 | Builder, HTML, service-worker and Pages lists repeat runtime ownership; the missing tournament asset demonstrated real drift. | One reviewed asset contract, cache policy and staging test. New inventory test protects current lists, but does not establish a hosted deployment/offline install. |
| CLEAN-06 | P2 | Large UI mixes editor, replay, roadmap, simulation coordination and coaching. Broad refactoring before parity would increase debugging uncertainty. | Extract one ownership boundary at a time, preserving public interfaces and replay/identity regressions. Measure initial load/interaction before and after. |
| CLEAN-07 | P2 | Offline cache contains bundled and modular entrypoints with duplicate content. | Choose supported offline entrypoint(s), then verify install, upgrades, cold/offline launch and rollback on desktop/mobile before reducing precache. |
| CLEAN-08 | P3 | Approximately 40.7 MB of audit spreadsheet/CSV artifacts are test dependencies. Historical docs also contain stale counts. | Replace size-only/report contracts with compact fixtures where appropriate, repair links, and archive with provenance. Do not delete evidence by age alone. |
| CLEAN-09 | P2 | Dependency/install-policy review and unused package audit remain incomplete; prior Showdown prototype advisory is still a release gate. | Review import/tool/CI usage and pinned dependency findings before removal/upgrades; test lockfile changes separately. |

## Database Measurement Boundary

No administrative Supabase SQL connector was callable in this task. No live queries, table changes, deletes, grants, indexes, migrations or retention jobs were run. August 29 public-read results remain historical evidence, not fresh performance measurements.

The diagnostic script captures version/time, reset context, estimated rows/dead tuples, table/index sizes, maintenance timestamps, index constraint flags, RLS flags/policy counts, and aggregate connection states. It excludes query text, connection addresses and row payloads. Each capped inventory includes its full matching count; more than 200 matches requires a scoped follow-up. Zero or partial visibility is not proof that the database is empty or healthy.

Run only through an existing authorized SQL connection, retain results privately, and treat any timeout/permission error as incomplete. Roll back an aborted transaction before continuing. A statistics reset date is not a guaranteed per-object observation window. Low index scans do not prove an index is disposable; dead-tuple estimates are not measured bloat. Query-plan review and slow-query measurements are still needed. This measurement-first approach follows [Supabase database inspection guidance](https://supabase.com/docs/guides/database/inspect) and [Postgres cumulative-statistics guidance](https://www.postgresql.org/docs/current/monitoring-stats.html).

Same-repository concurrency is a workflow guard, not a database lock or cross-repository guarantee. See [GitHub concurrency semantics](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Verification And Release Boundary

- New staging test failed on the missing tournament asset before the Pages fix, then passed: 37 explicit staged files, 18 deduplicated invocations still covered.
- Workflow governance failed on duplicate installs before the cleanup; revised tests also check live-only cleanup, serialization, and read-only diagnostics structure.
- Independent reviewers cleared the scoped workflow/staging changes and reviewed the SQL statically. Structural tests are not SQL execution or GitHub-hosted proof.
- Full local `npm test` passed: 141 fast files plus 12 offline/mock DB files, zero failures. Workflow governance: 16 checks passed. Retained output: `poke-sim/artifacts/cleanup-project-gate-closeout.txt`. Earlier runs caught two tests tied to individual Pages command strings and one missing runbook command; coverage assertions and the guide were corrected without removing test coverage.
- `git diff --check` passed. Runtime bundle SHA-256 remains `72f3880a3fbeaffcf7ea1d4f6d5bff7c07a651403636700d8cd614ed316e0095`; this cleanup does not change browser behavior or claim new browser-parity proof.
- No deployment, remote push, database mutation, runtime bundle change, or reconciliation of the existing 9-ahead/3-behind branch occurred.

**Next task:** reconcile database bootstrap ownership from a read-only live schema inventory and disposable fresh-install/upgrade tests. Then repair roster pagination and identity/completeness checks as a separate tested adapter change. Mechanics parity and regulation approval remain product gates throughout cleanup.
