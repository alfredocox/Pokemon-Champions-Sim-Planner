# Battle Accuracy Validation - 2026-08-30

## Decision

Local mechanics and audit reliability improved. Public competitive readiness remains blocked. No 99% in-game accuracy claim is supported: these tests check named behavior, internal consistency and repeatability, not every legal 2026 Champion game state.

Competitive team scope remains doubles. Singles tests exercise shared mechanics separately and do not count as doubles readiness. Synthetic fixtures may use combinations or moves not legal in Champions; no source rows, tournament teams or Champion overrides were promoted.

## Superseding Verification - 2026-09-02

The current cross-format run completed 4,624 battles with zero state failures, zero validator errors, zero warnings and zero repeatability failures. All 4,624 runs are warning-free in the declared harness (100%). Stable structured event IDs resolve mirror-name no-valid-target actions, and explicit causal checks cover mid-turn Tailwind, Trick Room, paralysis and Speed-stage changes. This is the current scoped invariant result and supersedes the older table below; it does not convert this report into a universal game-accuracy claim.

`accuracy_harness_manifest.json` binds the gate to explicit regulation IDs, versions, review/promotion states and declared evidence lanes. The battle matrix remains shared-mechanics evidence, not regulation-specific parity proof. The runner fails on catalog drift, unreviewed runnable formats and any warning above the zero-warning budget. This makes new-regulation work visible and reviewable instead of silently testing a stale ruleset.

The final project gate ran 155 fast-test files with zero failures. The battle-audit workflow passed its declared scope while still reporting partial/gap families. A fresh local browser/export pair matched all observable fields across three turns. Public release remains blocked by unapplied production hardening, absent owner-scoped persistence and incomplete Champion-specific mechanics/source proof.

## Local Fixes

- Hospitality now heals eligible allies on either side, does not announce healing at full HP, respects Heal Block and fainted allies, and records switch-entry healing amounts with stable source/recipient IDs.
- Thousand Arrows hits Flying targets, handles first-hit neutrality, grounds affected airborne targets and clears that state on switch. Named tests cover Levitate, subsequent Ground damage, Protect, Substitute, Tera Flying, Roost and later Protean Flying. Already-grounded targets do not gain a spurious persistent grounding flag.
- Normal and multi-hit damaging paths share priority protection against Armor Tail, Dazzling, Queenly Majesty, Quick Guard and Psychic Terrain. Multi-hit accuracy is checked once after that protection, not before it.
- Roster snapshots include exact `hp_current` and `hp_max`, retaining the existing percentage field. Gale Wings auditing uses exact HP when available and move metadata from the local Showdown mirror. Legacy percentage-only logs remain less precise.
- The no-valid-target auditor no longer treats the user as an eligible ally for Pollen Puff. Enemy targets and surviving eligible allies still trigger the existing error checks.

Fifteen focused regression cases pass in `tests/accuracy_boundary_tests.mjs`. Independent read-only review reproduced three further grounding defects and the multi-hit protection defect, then confirmed the fixes. Instrumented review confirmed zero accuracy checks for blocked multi-hit moves and exactly one for allowed hits or misses. These results do not close the broader multi-hit or grounding families.

## Reproducible Sweep

Run `npm run test:accuracy` from `poke-sim`. The runner uses 34 local runtime teams, every ordered team pairing, two deterministic seeds per pairing, original/reversed member order, explicit bring-four doubles and explicit bring-three singles. Each battle is capped at 60 turns. Runtime availability is not current tournament legality approval.

| Scope | Battles | Wins / Losses / Draws | State errors | Audit errors | Audit warnings | Repeat checks / failures |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Doubles | 2,312 | 1,126 / 1,176 / 10 | 0 | 0 | 0 | 34 / 0 |
| Singles | 2,312 | 1,161 / 1,122 / 29 | 0 | 0 | 0 | 34 / 0 |

Checks include stable registered identities, participant counts, active-slot limits, HP bounds, applied-damage deltas, structured export validation and sampled full-result deterministic replay. Winning is not itself a correctness check.

The initial sweep reported 78 audit errors: 54 no-valid-target and 24 observed-order findings. Reproduction exposed Pollen Puff self-target eligibility and missing Gale Wings priority in the auditor, plus the distinct engine protection bug. Later mirror-name warnings were traced to the validator ignoring already-exported structured actor identity and falling back to ambiguous narrative text. The corrected runner uses structured identity first and reports zero errors and zero warnings; legacy logs without stable identity remain explicitly ambiguous.

Final engine SHA-256: `230fb02348014674b36942283dd38a706b56b62e9fc9d816677d776816a495a9`.
Local mirror SHA-256: `1f13d6fa5b6340e9db041668bde45d7fc70d137ab15ccbc6f42468471ca26bd0`.
All input, harness, regulation-contract and source hashes are recorded in the local report. Four representative clean logs are retained; all 4,624 full logs are not retained.

## Gates

- Focused boundaries: 15/15; independent edge regression suite: 11/11; export validator: 22/22.
- Final complete project gate: 132 fast test files and 12 offline/mock DB test files, zero failures. Full transcript retained in `project-gate-final.txt`.
- Final battle-audit gate: passed its declared scope, including the legacy 4,500-battle audit. That older audit allows implicit roster selection and is not bring-four competitive proof. Its small mirror samples still emit heuristic flags; an exit code of zero does not prove unbiased play.
- Golden runner: 3/3; `gb_003` intentionally changed from `fdb8e381...` to `75dc3f08...`. Independent in-memory reversal of only the Hospitality fix restored the prior exact hash. The sole narrative difference was removal of the false opening full-HP healing message; winner remained loss in six turns. Other golden hashes were unchanged.
- Bundle rebuilt: 11,380,803 bytes; SHA-256 `5d869958d6d5cc96720a5ce4f06237f2bc3c43143ff88c4ea312973a7216f471`. Bundle load-order 2/2 and release-manifest checks 5/5 pass. This is local artifact evidence, not deployment verification.
- Database tests in the project gate use mocks/offline fixtures; no live authenticated persistence or migration proof is claimed.

## Public Site And Historical Logs

The existing browser tab displayed `v2.1.18-may-meta-roster`, a 10-turn replay and a DB-connected indicator. A fresh direct Pages fetch returned HTTP 200, 11,293,019 bytes and SHA-256 `55b4c92b093fd6fe52eff94c84c709c035026735c834d98795269815ed72c376`, matching the previously documented deployed artifact. The open tab, network artifact and local build are distinct evidence states; the cache mechanism was not proven.

The visible replay snapshot was retained. The console reported `[persistence] logs insert error Object`; a connected indicator is not proof that battle logs save successfully. Download JSON was attempted but a saved download was not confirmed. No new battle was submitted through the live site, and no production DB writes or deployment occurred. Local browser-file preview remains unavailable in this session; no workaround was used.

Four prior user exports were checked separately. Three contain historical no-valid-target findings and one contains historical active-key findings. They are old evidence, not proof that those defects survive in the current engine. Private user logs remain in ignored local artifacts, not committed fixtures.

## Next Release Blockers

1. Fix default bring-four/export consistency: omitted selections and legacy lead-only callers can use six participants while reporting four. Apply a reviewed per-side Champion doubles limit, preserve generic formats and registered IDs, and update golden expectations only after inspecting the resulting semantic differences. Current accuracy sweeps explicitly select four to avoid this known defect.
2. Complete entry/residual ordering, broader multi-hit per-hit abilities/accuracy, Air Balloon/Gravity, semi-invulnerable grounding and resource-changing move cases. Do not equate import acceptance with implemented behavior.
3. Expand imported-team and complete-game differential coverage against pinned Showdown plus approved Champion captures, including regulation-specific deviations.
4. Add an evidence lane and explicit manifest review whenever a regulation ID, version, promotion state or runnable format changes. Keep source-review regulations blocked.
5. Reconcile the candidate branch, review CI, deploy the exact reviewed artifact through the approved process, and verify the served hash plus an actual refreshed browser session. Investigate live log persistence separately with explicit write approval and schema/RLS readback.

Case matrix: **41 named cases, 16 covered / 17 partial / 8 open**. Counts do not measure the fraction of all possible game interactions.

## Evidence Locations

Ignored local evidence lives under `poke-sim/artifacts/accuracy-2026-08-30/`: `boundaries/`, `boundaries-before/`, `cross-format/report.json`, retained replay JSON, two prior sweep directories, `live-replay-dom.txt`, `historical-log-validation.json`, gate transcripts and `showdown-source-provenance.json`. Re-run the committed tests to reproduce evidence on another machine; private artifacts are not a repository dependency.

Primary Showdown source review pinned to commit `ecac20e0d174d00467e7604cf09b0316eb74c4d7`:

- [Ability implementation](https://github.com/smogon/pokemon-showdown/blob/ecac20e0d174d00467e7604cf09b0316eb74c4d7/data/abilities.ts): Hospitality, Gale Wings and priority blockers.
- [Move implementation](https://github.com/smogon/pokemon-showdown/blob/ecac20e0d174d00467e7604cf09b0316eb74c4d7/data/moves.ts): Thousand Arrows, Smack Down and Roost.
- [Battle action execution](https://github.com/smogon/pokemon-showdown/blob/ecac20e0d174d00467e7604cf09b0316eb74c4d7/sim/battle-actions.ts): protection/immunity and accuracy ordering.

This upstream review pin is separate from the runtime mirror digest. It does not imply the database was synchronized or approved to that commit.
