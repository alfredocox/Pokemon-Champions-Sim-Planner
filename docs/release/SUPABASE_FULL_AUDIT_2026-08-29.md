# Supabase Full Audit - 2026-08-29

## Decision Summary

The deployed app is connected to Supabase and public reads work. The database is not yet fully aligned with the repository roadmap.

```text
Connected: yes.
Showdown mirror readable: yes.
Showdown mirror internally clean: yes.
Champions overrides populated: no.
Team Lab and Trainer Room migrations live: no proof; public schema checks show Team Lab absent.
Safe to call fully aligned: no.
```

No production rows or schemas were changed during this audit.

## Live Evidence

The GitHub Pages bundle successfully authenticated to Supabase with its public anon configuration. Non-mutating REST checks returned:

| Surface | Live result |
|---|---:|
| `approved_showdown_entities` | 8,653 rows |
| abilities | 320 |
| aliases | 2,543 |
| formats | 1,429 |
| items | 583 |
| learnsets | 1,288 |
| moves | 954 |
| species | 1,517 |
| type chart | 19 |
| duplicate `(entity_kind, entity_key)` rows | 0 |
| invalid source hashes | 0 |
| rows without approval time | 0 |
| `approved_champions_data` | 0 rows |
| `champions_overrides` | 0 active rows |
| `teams` | 36 rows |
| `team_members` | 204 rows across 34 six-member teams |
| orphan members | 0 |
| duplicate team slots | 0 |
| `team_lab_teams` | absent from public schema cache |
| `team_lab_replays` | absent from public schema cache |
| `team_lab_team_key_mappings` | absent from public schema cache |

The extra live team rows are one anonymous custom team and two retired legacy shells with no members. This explains `36 teams` versus the canonical `34 six-member teams`, but the custom row must not remain part of the shared trusted catalog.

## Main Findings

### Fixed locally

- Scheduled Showdown checks no longer advance the promoted hash baseline when changes were detected but not written.
- The service-role key is scoped only to the two database-write steps.
- Pages fails closed when production Supabase configuration is missing.
- Pages runs the source-truth suite before deployment.
- Production migrations require `main`, use a `production` environment, use the explicit production DB URL, and run transactionally.
- Browser roles are changed to read-only for shared teams, analyses, logs, and branch-coverage evidence.
- Team-member grain gains one row per `(team_id, slot)` and slots 1-6.
- Active Champions overrides gain one row per entity field.
- Team Lab mixed public/private sim evidence now requires every referenced team to be visible or owned.
- Nullable Team Lab mapping formats can no longer bypass uniqueness.
- The adapter now writes `slot`, reads `log_index`, rejects child-write failures, and no longer sends nonexistent catalog columns.
- Approved-row export pagination is deterministically ordered and duplicate active overrides fail generation.

### Still open

1. Apply `poke-sim/db/migrations/2026_08_29_public_data_integrity_hardening.sql` through the reviewed production workflow.
2. Apply the missing Team Lab, Trainer Room, replay-governance, and source-truth package migrations in verified timestamp order.
3. Split Showdown staging from approval. A second protected workflow must promote an exact `sync_run_id` plus reviewed artifact digest.
4. Add a migration ledger with filename, checksum, Git SHA, applied time, and post-migration schema verification.
5. Generate and commit runtime data from a concrete approved Supabase sync run and upstream source hash.
6. Repair the persistently failing Daily Sim Heartbeat and News Feed Sync jobs before public release claims.
7. Gate Pages on the complete required CI policy and protect `main`/production environments in GitHub settings.
8. Validate imported abilities against the selected species/form, not only the global ability catalog.

## Source-Truth Contract

```text
Showdown mirror rows
  + reviewed Champions override rows
  -> deterministic approved runtime artifact
  -> simulator mechanics and legality
  -> evidence bundle
  -> Brain explanation
```

The database stores governed truth and evidence. Public browsers read shared truth but do not mutate it. User feedback stays local/private until a trusted worker validates and promotes it.

## Deployment Checklist

- [x] Public Supabase connection proven.
- [x] Approved Showdown row quality profiled.
- [x] Local source-truth and governance tests green.
- [x] Browser/shared-write hardening migration authored.
- [ ] Production hardening migration reviewed and applied.
- [ ] Team Lab/Trainer Room migration inventory applied and read back.
- [ ] Anonymous `POST`, `PATCH`, and `DELETE` denial tests pass live.
- [ ] Trusted writer tests pass in staging.
- [ ] Exact Showdown staged artifact is digest-bound to approval.
- [ ] Full CI and recurring health workflows are green.
- [ ] Pages deployment contains this branch's bundle and audit status.

## Audit Methods

- Supabase plugin guidance and current Supabase RLS documentation.
- Supabase Postgres best-practice checks for grants, RLS, constraints, indexes, and migration safety.
- Non-mutating live Data API profiling through the deployed public anon configuration.
- Parallel security, data-quality, and operations agents.
- Codex Security scan `dd5a6e50-01d6-404b-b99c-2383f2f9da0b`.
- Local regression suites, including `npm run test:source-truth`.

The formal security scan reports one medium finding: Showdown approval is not bound to a reviewed artifact. Administrative live policy catalogs remain a follow-up because no Supabase admin/MCP SQL tool was callable in this task.
