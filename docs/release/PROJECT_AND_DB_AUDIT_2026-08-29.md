# Project And DB Audit - 2026-08-29

Branch: `audit/project-open-items-2026-07-05`

## Plain-English Summary

The Pokemon app has the right local database direction, and the live preview is connected to Supabase. The live schema is not caught up to the branch's Team Lab, Trainer Room, and data-integrity migrations.

Think of it like this:

```text
Local repo = the workshop copy.
GitHub Pages = the public copy testers see.
Supabase = the shared notebook/database.
```

Today the workshop copy has DB mapping, trusted replay-import code, and public-write hardening. The public copy does not show all of those helpers yet. Public Supabase reads were verified through the deployed anon configuration; administrative policy/grant inspection still needs an admin SQL connection.

Latest live and security evidence is in [`SUPABASE_FULL_AUDIT_2026-08-29.md`](SUPABASE_FULL_AUDIT_2026-08-29.md).

## What Is Working Locally

- DB mock contract sweep passed: 12 DB-focused test files, 0 failures.
- Source-truth suite passed: Showdown runtime data, runtime bridge, damage pipeline, Showdown damage oracle, move registry, priority drift, approved data generator, DB writer, sync workflow, and Pokemon data audit.
- PowerShell fast-equivalent sweep passed: 122 passed, 14 intentionally skipped, 0 failed.
- The local app code contains the current Team Lab mapping path:
  - `TeamLab.resolveArtifactTeamMappings`
  - `SupabaseAdapter.prepareTrustedReplayImport`
  - `SupabaseAdapter.saveTrustedReplayImport`
  - `ReplayImportService.saveTrustedReplayImport`
- The local DB schema already has the right source-truth families:
  - Showdown mirror rows: `showdown_entities`
  - Showdown diffs: `showdown_entity_diffs`
  - Champion differences: `champions_overrides`
  - Approved runtime reads: `approved_showdown_entities`, `approved_champions_data`
  - Team Lab durable team keys: `team_lab_team_key_mappings`
  - Promotion gates and audit trail: `team_lab_promotion_rules`, `team_lab_promotion_audits`
  - Private trainer evidence: `trainer_replay_imports`, `trainer_replay_import_refs`, `trainer_replay_import_events`

## What Is Not Proven Yet

- Live Supabase public reads are verified, but admin catalog access is unavailable in this task.
- Team Lab tables returned schema-cache `404`, so their production migration is not proven.
- Champions override views are live but currently contain zero active rows.
- GitHub Pages responded successfully, but the deployed bundle did not contain the newest local mapping helpers:
  - `prepareTrustedReplayImport`: not present
  - `resolveArtifactTeamMappings`: not present
  - this audit doc link: not present
- The current branch is not 1:1 with `origin/main`:
  - `HEAD...origin/main`: 9 commits ahead, 3 commits behind
  - missing remote commits are homepage news-feed syncs
- The Y repo and Alfredo repo are not 1:1:
  - `origin/main...alfredo/main`: 62 / 27
  - current branch...`alfredo/main`: 68 / 27

## Live Project Snapshot

Checked on 2026-08-29 with GitHub API, `git fetch --all --prune`, and the live GitHub Pages URL.

| Repo | Open issues | Open PRs |
|---|---:|---:|
| `TheYfactora12/Pokemon-Champions-Sim-Planner` | 69 | 2 |
| `alfredocox/Pokemon-Champions-Sim-Planner` | 56 | 4 |

Live preview checked:

```text
https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/poke-sim/pokemon-champion-2026.html
```

Result:

```text
HTTP 200
bundle bytes: 11290510
trusted import helper present: false
artifact team mapping helper present: false
```

## Data Inventory

Local bundled Champion data:

| Data family | Count |
|---|---:|
| bundled teams | 34 |
| local base-stat rows | 85 |
| local Pokemon type rows | 728 |
| local move type rows | 129 |
| local move category rows | 148 |
| local move base-power rows | 160 |
| local move target rows | 166 |

Generated Showdown-approved runtime data:

| Data family | Count |
|---|---:|
| abilities | 320 |
| items | 583 |
| moves | 954 |
| species | 1517 |
| learnsets | 1288 |
| type chart rows | 19 |

## Best-Practice Source-Truth Rule

Use this rule before building more coaching:

```text
Showdown mirror = baseline mechanics and data.
Champions overrides = only reviewed Champion-specific differences.
Generated JS = offline GitHub Pages runtime artifact.
Supabase = durable source-truth/audit database.
Simulator = truth engine.
Brain/coach = explanation layer only.
```

The Brain may explain evidence. It must not change mechanics, legality, speed order, priority, items, status, weather, terrain, or battle results.

The simulator decides truth. The Brain explains truth.

## What To Do Next

1. Sync this branch with `origin/main`.
   Bring in the 3 remote homepage news-feed commits, preserve the local DB/mapping work, rebuild the bundle, and rerun focused tests.

2. Publish the local DB mapping work.
   Commit/push the branch or update the existing PR so GitHub Pages can eventually include `prepareTrustedReplayImport` and `resolveArtifactTeamMappings`.

3. Run the live Supabase smoke after credentials are available.
   Use local public/anon credentials for read checks and protected credentials only for trusted writer tests. Prove the tables/views exist, RLS blocks unsafe browser writes, mapping rows can be read by trusted code, and private replay imports save with the right owner scope.

4. Close or update the Team Lab mapping issue only after live proof.
   The local code looks correct, but issue closure should wait for deploy proof plus a saved private import sample.

5. Then work promotion rules.
   Implement the official evidence promotion path only after private import mapping is proven. Promotion must require legality, ruleset freshness, engine freshness, verified team mapping, sample-size thresholds, approved benchmark pool, privacy filtering, and an audit row.

6. Keep Josh/Jdoutt38 review focused on replay truth.
   Showdown logs are good for parser and battle-behavior calibration. They are not official Champion legality proof by themselves.

## Challenge To The Plan

- Do not build the real LLM coach before simulator and DB truth are boringly reliable.
- Do not say "DB is live and working" unless live Supabase tests ran with the right credentials.
- Do not say "preview is updated" until the GitHub Pages bundle contains the new helpers and build ID.
- Do not make Alfredo 1:1 by force. First stabilize Y branch, then review Alfredo PRs/commits through CI.
- Do not let private trainer replay imports become official ranking or global-learning evidence without a trusted promotion worker and audit trail.

## Next Coding Target

The next safest coding target is not a new feature. It is release alignment:

```text
rebase/merge origin/main
rebuild static bundle
rerun DB/source-truth/overview/release tests
commit and push
verify GitHub Pages contains the new DB mapping helpers
then run live Supabase smoke with credentials
```

After that, the next real feature target is Team Lab promotion rules and promotion audits.
