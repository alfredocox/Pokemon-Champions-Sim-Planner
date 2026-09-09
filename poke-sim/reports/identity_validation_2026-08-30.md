# Ruleset, Result And Participant Identity Validation

Date: 2026-08-30. Scope: CPA-01, CPA-02 and CPA-03; local implementation and offline/mock verification. Not deployed, not production database proof, not a universal accuracy certificate.

## Decision

CPA-01 and CPA-03 are fixed locally for the tested shared paths. CPA-02 execution, serialization, history-read and export identity are fixed locally; its broader comparison/coaching acceptance remains partial because independent Strategy caches still mix context. Keep current competitive coaching and public-release promotion gated.

In simple terms: an unknown rulebook now stays unknown; a saved score remembers the teams and rules that produced it; and only the selected four can enter a Champions doubles game. The coach still needs work before every explanation can be trusted.

## Changes

- Unknown/missing ruleset lookup fails closed, including JavaScript prototype names. Reviewed historical aliases remain explicit. Imported affirmative flags cannot promote an unknown or review-only ruleset.
- Execution captures engine/build, ruleset/regulation versions, format, series format, policy, team IDs, SHA-256 input fingerprints and selection policy. Changing the team or format during a batched run aborts it. Team changes after a run cannot relabel saved evidence.
- Parent/game identity conflicts, stale flags and source gaps quarantine evidence. Singles remains separately labeled and excluded from doubles learning.
- Existing Supabase JSON storage carries provenance and retained game participant metadata. Both history readers recompute eligibility, including scalar policy/version conflicts. Inspection exports preserve rejected evidence, recomputed quarantine and the originally stored policy separately. No migration or production write was performed.
- Local history excludes incomplete, incompatible, stale-build and edited-team records from trusted counts, but keeps them exportable. After reload, current team fingerprints must be established by a fresh run before matching historical entries count. Mirrored opponent telemetry is not treated as equivalent player telemetry.
- Champions default/legacy selection is capped at four in doubles and three in isolated singles tests. Generic SV full-roster behavior is retained and reported accurately. Role-aware leads stay within the selected roster. Actual participants determine exported bring lists.
- Participants retain original items, roster slots, battle-local stable keys and supplied registered member IDs. Missing registered IDs remain null; a battle key is not a Supabase primary key. Item activation or exchange may legitimately change battle state without changing registered ownership.
- New replay downloads include execution provenance, original team snapshots and participants. Legacy fallback snapshots are explicitly `export_time_unverified`, not execution evidence. DB storage remains bounded metadata/text, not a complete forensic archive of every structured turn.
- Fixed an unresolved mock-client thenable and made asynchronous save tests await completion with a watchdog; tests previously could exit before assertions ran.

## Verification

- Failing-before/passing-after regressions cover unknown rules, identity roundtrips, game quarantine, reader policy conflicts, original replay snapshots, actual bring membership and replacement identity.
- Focused suites: ruleset 8, analysis identity 6, participant identity 10, local history 5, offline/mock save 23, turn-log 34. Test counts describe checks, not accuracy percentages.
- Complete project gate: 136 fast test files and 12 offline/mock DB files pass. Browser/UI smoke passes separately. Logs: `artifacts/identity-project-gate-final3.log` and `artifacts/identity-ui-smoke-final.log`.
- Battle audit: 42 deterministic files, golden traces and 4,500 seeded battles pass their declared scope. Report: `artifacts/identity-battle-audit-final2.json`.
- Independent consistency sweep: 2,312 doubles and 2,312 singles, zero state failures, zero validator errors, zero failures across 68 repeated-seed checks. Fourteen `no-valid-target-actor-unresolved` warnings remain (12 doubles, 2 singles). Outputs: `artifacts/accuracy-2026-08-30/cross-format/`. This sweep uses explicit selection and is not independent real-game parity.
- Case matrix version `2026-08-30.3`: 41 named cases, 17 covered, 17 partial, 7 open. Mechanics families remain 7 regression-covered, 6 partial, 2 gaps. No full inventory is certified.
- Independent read-only mechanics and trust reviewers found no remaining blockers in the scoped fixes. The trust reviewer independently reproduced both reader/export quarantine fixes and ran eight focused test files. This sign-off excludes old Strategy caches, live DB and current-regulation parity.

## Golden Trace Review

The old defaults admitted extra reserves. Before accepting changed golden files, an independent mechanics reviewer restored only the old participant limit in memory: all three old hashes reproduced exactly. New default traces also matched explicit bring-four traces. Winners did not change; turns changed from 11/9/6 to 5/4/4 after excluded reserves stopped entering. Updated fixtures are intentional behavioral corrections, not unexplained snapshot acceptance.

## Browser Evidence

Used the in-app browser against localhost, including Simulator, team swapping, Bo1/Bo3, Replay Log, Strategy and JSON download. First pass: 10 Bo1 games and 22 Bo3 games, plus 3 bootstrap games. Export contains 21 series / 35 games, all with provenance and four participants per side. Final execution-snapshot build: another 10 Bo3 series / 22 games completed; a 17-turn replay download retained engine 1.1.1, M-A ruleset version, input digests, original six-member snapshots and the actual selected four with original items.

Retained downloads (user-local, not committed or uploaded):

- `champions-sim-my-data-2026-08-30T20-49-32.json`
- `champions-turn-log-768098789,4216384161,3769687344,3569455260.json`

After the final database-read/export corrections, the final artifact was reloaded and another 10 Bo1 games completed through the browser. The Strategy view in the earlier swapped-team pass showed 20 games in one summary versus 22 in another, and stale Incineroar/Arcanine lead advice after swapping to Mega Altaria, including `undefined games`. This extends CPA-09: unify independent strategy caches with execution fingerprints and define each sample denominator. Do not describe all coaching consumers as protected by this change.

Local preview explicitly reports `[Local roster]`. Public Pages remains the older v2.2.131 build. No live Supabase save/readback or production browser smoke was performed for these fixes.

## Release Identity

- Engine: `1.1.1`.
- Local build: `v2.2.133-evidence-identity`.
- Final bundle SHA-256: `d80e9319a9106ba41604de1cf0a711c866bb45271b6ddd4e50f5eb2ffb0c3075`.
- Final artifact rebuilt, full project gate rerun successfully, and final browser smoke completed. No battle-engine change followed the seeded sweep.
- All work is uncommitted in the existing audit branch. Existing unrelated changes were preserved. No repo parity, merge, issue closure or deployment claim.

## Remaining Work And Human Evidence

1. CPA-09: isolate Strategy/report caches by team digest, format, ruleset, engine/build and policy; reject wrong-perspective evidence. Then CPA-04/05: forced replacements must not become switching mistakes, and unbrought members must not receive dead-move criticism.
2. Finish current M-B eligibility, dates, inventory and executable differential fixtures. M-B is active on this date, but runtime remains historical M-A; the old local M-B end date still needs correction. The [official notice](https://champions-news.pokemon-home.com/en/page/776.html) extends through September 9 at 01:59 UTC.
3. Close PP/Pressure, entry/residual and simultaneous-KO ordering, imported move/ability/item completeness, grounding and multi-hit combinations; resolve the 14 ambiguous actor warnings.
4. Review branch divergence, protect CI, approve deployment, and verify the exact deployed artifact. Independently prove production Supabase schema/RLS and save/readback before declaring DB completion.
5. Human help: supply reproducible in-game M-B battles with exact legal teams, stat points, items, abilities, moves, choices and video/turn evidence, especially disputed edge cases. Private tournament stat spreads cannot be inferred from public sheets.

There is no defensible 99% figure yet. Establish an independently labeled, regulation-specific benchmark and report per-mechanic outcome agreement, coverage and uncertainty. Passing self-consistency tests or counting completed cases is not that benchmark.
