# Project Open Items Audit - 2026-07-05

Branch: `audit/project-open-items-2026-07-05`

## Plain-English Summary

The project is not blocked by a broad test failure right now. The local non-live test surface is green after two small audit fixes.

The biggest open work is not "random bugs everywhere." It is a few large lanes:

1. prove current Regulation M-B source data before trusted runtime promotion
2. finish Josh/QA replay and data-review passes
3. harden Team Lab evidence promotion and privacy boundaries
4. improve Battle Sensei coaching accuracy with cross-turn decision logic
5. finish deployment, cache, security, and public-release hardening
6. review and merge the no-API Brain foundation before wiring UI cards

The rule stays the same:

```text
Simulator truth first.
Evidence-backed coaching second.
LLM/API/DB learning later.
```

## Live GitHub Snapshot

Checked by GitHub API on 2026-07-05:

| Repo | Open issues | Open PRs |
|---|---:|---:|
| `TheYfactora12/Pokemon-Champions-Sim-Planner` | 68 | 1 |
| `alfredocox/Pokemon-Champions-Sim-Planner` | 56 | 4 |

Notable open PRs / branches:

- Y repo PR #145: workbook/data-audit related, separate from the no-API Brain branch.
- Alfredo PR #185: shield secondary effects for U-turn / Flip Turn / Dragon Darts.
- Alfredo PR #176: RLS policy hardening.
- Branch `analysis/no-api-brain-foundation`: pushed no-API Brain foundation and document alignment.
- Branch `audit/project-open-items-2026-07-05`: this audit/fix pass.

## Fixes Applied In This Audit

### 1. Showdown DB writer CLI worked incorrectly on Windows

File:

```text
poke-sim/tools/write_showdown_data_to_db.mjs
```

Problem:

The script used this main-module check:

```js
import.meta.url === `file://${process.argv[1]}`
```

That is not Windows-safe because Windows paths look like `C:\...`, while ESM file URLs look like `file:///C:/...`.

Impact:

On Windows, the CLI silently did nothing. Dry-run tests expected JSON but got empty output.

Fix:

Use `fileURLToPath(import.meta.url)` plus `path.resolve(process.argv[1])` through an `isMainModule()` helper.

Proof:

```text
node tests/showdown_db_writer_tests.js
Showdown DB writer: 3 pass, 0 fail
```

### 2. M9 hardening bundle-size guard was stale

File:

```text
poke-sim/tests/db_m9_hardening_tests.js
```

Problem:

The older M9 test still required the built static bundle to stay below 5.30 MiB. Current app architecture intentionally inlines Supabase UMD, Battle Sensei, and generated Showdown data. The newer M1 wiring guard already uses an 11.00 MiB budget.

Impact:

DB mock suite failed even though the current bundle is expected for the static GitHub Pages architecture.

Fix:

Align M9 with the current 11.00 MiB budget and make the failure message include the actual byte size.

Proof:

```text
node tests/db_m9_hardening_tests.js
Module 9 Hardening Test Results: 11/11 passed
```

## Verification Run

Local dependencies were installed with:

```text
npm.cmd install
```

Result:

```text
added 13 packages
found 0 vulnerabilities
```

Focused tests:

```text
node tests/showdown_db_writer_tests.js
3 pass, 0 fail

node tests/showdown_damage_oracle_tests.js
56 pass, 0 fail

node tests/db_m9_hardening_tests.js
11/11 passed
```

Broad tests:

```text
PowerShell non-DB JS sweep
122 non-DB test files passed
14 intentionally skipped

PowerShell DB mock sweep
10 DB mock test files passed
```

Live DB tests were not run because `RUN_LIVE_DB=1` and live credentials were not set in this shell.

Bash runners were not used because normal Bash is unavailable in this Windows shell. The equivalent Node test loops were run through PowerShell.

## Open Work Lanes

### Lane A - Regulation M-B Source Promotion

Primary issue:

- Alfredo #252: Reg M-B source conversion and runtime promotion tracker.

Current state:

- Reg M-B is visible as a source-review lane.
- It must stay blocked from trusted runtime legality until source captures, fixtures, stats, abilities, items, and battle behavior tests are complete.

Next useful work:

- Convert the official/in-game captures into explicit species/form/item rows.
- Add accepted and rejected Reg M-B legality fixtures.
- Add positive and negative battle fixtures for each newly promoted Mega/form behavior.
- Keep `needs_verification` rows out of official Team Lab ranking.

Do not:

- Promote Showdown replay evidence as official Champion legality.
- Let review-only rows improve trusted coaching/ranking.

### Lane B - Josh / QA Review

Primary issues:

- Y #190: Josh/QA Showdown reference battle review.
- Alfredo #231: Josh review of Pokemon data audit workbook.

Current state:

- Showdown reference battles are useful gameplay/parser calibration.
- They are not official Pokemon Champions legality proof.

Next useful work:

- Pick one Reg M-B Showdown replay from the manifest.
- Upload through Review.
- Confirm parser reads players, format, preview, selected four, turns, winner, moves, field effects, switches, damage, status, weather, Tailwind, Trick Room, Mega events, and faint causes.
- File concrete parser/coaching bugs for lost events.

Do not:

- Mark Reg M-B legality verified from Showdown logs.

### Lane C - Team Lab Evidence And Privacy

Primary Y issues:

- #180 custom team submission and validation
- #181 stale guards and official ranking gates
- #182 QA artifact import pipeline
- #184 hidden-details privacy
- #187 trusted import worker
- #188 artifact team-ID mapping resolver
- #189 leaderboard evidence promotion rules

Current state:

- Local Team Lab foundation tests are strong.
- #188 now has a local resolver in `poke-sim/team_lab.js` that maps QA/import artifact team keys to durable Team Lab team IDs, clears mapping gaps only when every key resolves, preserves source gaps when anything is missing, and refuses ambiguous verified mappings.
- The replay-import adapter now has trusted-worker prep helpers: `SupabaseAdapter.prepareTrustedReplayImport` and `SupabaseAdapter.saveTrustedReplayImport` read reviewed key-mapping rows, attach `team_key_mapping` / `team_lab_team` refs, and keep private import rows out of official leaderboard writes.
- Official promotion still needs a deployed trusted worker/server action, stale rules, privacy filtering, sample-size gates, and promotion audits.

Next useful work:

- Deploy/wire the trusted import worker action so Supabase mapping rows are read server-side with protected credentials before replay/sim evidence can be promoted.
- Then implement #189 promotion rules.
- Then connect promotion audits and stale recalculation.

Do not:

- Let local artifact keys such as `player` or bundled opponent IDs become public leaderboard IDs without review.

### Lane D - Battle Sensei Accuracy

Primary Alfredo issues:

- #223 deferred payoff, complementary turns, speed-control neutralization
- #224 decision opportunity ledger and positive execution recognition

Current state:

- Existing tests already cover Trick Room reversing Tailwind, same-turn Tailwind neutralization, deferred payoff within three turns, complementary setup payoff, planned speed transition, and provisional Battle IQ boundaries.
- The larger denominator-aware coaching ledger still remains open.

Next useful work:

- Build a denominator-aware Decision Opportunity Ledger only after the speed-control state model is stable.
- Positive execution notes should mirror negative coaching tags.

Do not:

- Penalize a correct setup turn just because payoff happens one or two turns later.

### Lane E - No-API Brain Foundation

Primary branch:

- `analysis/no-api-brain-foundation`

Current state:

- EvidenceBundle, deterministic tools, BrainAnalysis schema, composer, validator, feedback, improvement packs, storage helpers, fixtures, and tests are implemented locally.
- No UI cards are wired yet.

Next useful work:

- Open/review/merge the no-API Brain foundation PR.
- Wire real simulator/replay evidence into deterministic tools.
- Add Evidence Mode UI cards only after validator proof.

Do not:

- Add real LLM/API calls before the no-API loop proves itself.

### Lane F - Deployment / Security / Public Release

Primary Alfredo issue:

- #213 deployment hardening, cache safety, and abuse protection.

Current state:

- Local security and release guards exist.
- Live DB checks and mobile Safari/manual release smoke still require credentials/devices and human QA.

Next useful work:

- Keep CI, bundle freshness, cache bump, and heartbeat gates required.
- Run live Pages smoke after merge/deploy.
- Confirm no service-role/payment/webhook secrets are bundled.
- Confirm service worker/cache behavior on desktop, mobile Safari, and private/incognito.

## Safe Next Fix Candidates

These are good next coding targets because they have bounded acceptance criteria:

1. Team Lab promotion rules (#189) after mapping resolver integration.
2. Trusted worker deployment/audit wrapper for `prepareTrustedReplayImport`.
3. Review upload parser gaps found from one Josh Reg M-B Showdown replay (#190).
4. Evidence Mode UI cards after Brain foundation merge.
5. Deployment smoke checklist automation for Pages/site proof.

These are not good "quick fixes":

- Full Reg M-B runtime promotion.
- Real LLM endpoint.
- Public leaderboard ranking.
- Battle IQ denominator scoring.
- Premium/profile persistence.

Those need source proof, privacy review, and phased tests.
