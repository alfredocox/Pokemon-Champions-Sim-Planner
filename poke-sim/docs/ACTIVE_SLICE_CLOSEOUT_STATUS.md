# Active Slice Closeout Status

Last updated: 2026-07-01

This document is the working closeout map for the current Pokemon Champions simulator build. It exists to stop feature jumping and keep every major slice tied to proof, residual risk, open blocker status, and the next action.

Use `100% closed` only when the claim is source-backed, tested, deployed, and has no known residual blocker. Use `99% closed` when the implementation is practically complete but still needs more live artifacts, more devices, more samples, or future source checks.

## Status summary

| Slice | Status | Proof we have | Residual risk / blocker | Next action |
| --- | --- | --- | --- | --- |
| QA slice naming and claim review | 99% closed | v2.2.90 and v2.2.91 tests assert directive QA names, `qa_claim_review`, forbidden claims, and source gaps. CI and Pages passed. | Needs one fresh live QA artifact from the deployed page proving the visible readout and downloaded JSON both carry the claim review after cache refresh. | User exports one `Current Evidence QA` or `Tactical Coaching QA` artifact from the latest URL. |
| Release discipline and cleanup gates | 99% closed | `RELEASE_DISCIPLINE_AND_CLEANUP_GATES.md`, Roadmap links, architecture doc updates, and overview tests are in place. CI and Pages passed for v2.2.91. | Team still needs to use the gates before closing GitHub issues or starting large new slices. | Apply this closeout map to the next issue/milestone sweep. |
| Replay claim audit / Tactical QA claim boundary | 99% closed | Replay and QA exports now carry claim boundaries, source gaps, forbidden claims, and tactical QA readouts. Focused tests passed across v2.2.87-v2.2.90. | Needs fresh replay-upload artifact proof from live UI with real uploaded logs after the latest bundle. | Capture one live replay artifact and inspect `claim_audit` plus hidden/forbidden claims. |
| Team Lab ranking preview | 99% closed for local preview, open for official rankings | Local Top 25 preview, reset control, ranking gates, hidden-details policy, Team Lab source docs, and preview UI are shipped. | Official/global ranking is blocked until trusted import worker, verified legality, team-ID mapping, promotion rules, stale recalculation, and enough sample size are proven. | Keep preview labeled experimental; do not promote to official leaderboard yet. |
| Home page / Battle Labs landing page | 99% closed | Home/Roadmap split, Battle Labs hero, source-backed news watch, Top 25 gated section, and start-cycle UX are shipped and tested. | Visual polish can continue, but it should not block sim-truth work unless usability hides critical actions. | Only do small polish fixes while higher-priority sim correctness work continues. |
| Showdown/HTML replay intake | 99% closed for import acceptance, open for coaching calibration | Replay upload accepts richer formats and maps uploaded teams/logs into review flow. | Real battle-body training still needs robust parser calibration, replay-to-team mapping proof, and non-poisoning import rules. | Use `/Users/kevinmedeiros/Downloads/battles` as calibration input, but keep outputs labeled evidence, not truth. |
| Replay transparency and turn-log explainability | Open blocker | Damage/effect events, applied/calculated damage, status/action-denial evidence, and replay dedupe have strong coverage. | Still needs broader move-failure, miss/accuracy, field-state, volatile-state, multi-target, contact, residual, and Pokemon card state tags in replay UI. | Continue replay transparency before expanding coaching certainty. |
| Full Pokemon Champions legality / Regulation M-B runtime promotion | Open blocker, true 99% target defined | Source registry, Reg M-B review cards, promotion gates, source-review ledgers, and `LEGALITY_99_TARGET_PLAN.md` exist. | Complete official/client-captured legal species/forms/moves/items/abilities/Megas are not fully verified as shipping runtime truth. | Build the Regulation M-B legality evidence package with source captures, known legal/illegal fixtures, stale-ruleset checks, and Team Lab promotion guards. |
| Battle Sensei true coaching brain | Open blocker | Claim-boundary infrastructure, tactical QA payload, and replay review scaffolding are in place. | Real coaching still needs decision opportunity ledger, deferred payoff, speed-control neutralization, counterfactual lines, denominator-aware scoring, and repeated matchup learning. | Build coaching only on source-bound mechanics plus replay-verified evidence. |
| Supabase/global learning evidence pipeline | Open blocker | Existing app tables and offline DB contract tests are green; local preview can read/write bounded summaries. | Global learning must prevent data poisoning, preserve ruleset/version/sample metadata, respect privacy, and separate personal analytics from global aggregates. | Design trusted import worker and forensic storage before treating uploaded data as global training data. |
| GitHub generated-artifact release hygiene | 99% closed | `RELEASE_DISCIPLINE_AND_CLEANUP_GATES.md` now documents the News Feed Sync versus feature-release conflict path: inspect remote, preserve source, regenerate bundle/artifact, rerun release tests, then continue rebase/merge. | Scheduled generated-artifact commits can still race active feature work until sync workflows move to branch/PR mode. | Keep this guard active on every push and consider moving scheduled source/news sync to PRs after the current legality work. |
| UI/runtime modularization | Open blocker | Cleanup gate documents the need and identifies candidates. | `ui.js` remains too large and keeps accumulating unrelated concerns. | Split QA export/readout, Battle Sensei replay review, Team Lab home, Roadmap data, and source/news rendering into owned modules. |

## Fresh live proof attached on 2026-07-01

The following user-exported live artifacts are now accepted as proof for the `v2.2.92-active-closeout-map` JSON export contract:

- `/Users/kevinmedeiros/Downloads/champions-sim-qa-artifact-2026-07-01T14-02-36.json`
- `/Users/kevinmedeiros/Downloads/champions-sim-qa-artifact-2026-07-01T14-03-05.json`

Both artifacts came from:

`https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/poke-sim/pokemon-champion-2026.html?v=v2.2.92-active-closeout-map&fresh=1`

What this proves:

- the deployed build ID and source URL are captured correctly
- `qa_claim_review` exports in downloaded artifacts
- `qa_dashboard.claim_boundary` exports source boundaries, source gaps, and forbidden claims
- release blockers are empty for these captured QA scopes
- battle-engine evidence rows exist for the captured scopes
- branch/tactical coaching rows exist where the QA slice generated them

What this still does not prove:

- complete Pokemon Champion legality
- complete battle-mechanic coverage
- official/global best-team rankings
- real ladder truth
- visual page rendering of every QA readout state on every device

The turn-log files supplied with the same proof pass remain useful targeted evidence, but they also correctly expose missing targeted proof families. The current next targeted proof list includes Trick Room active state, non-standard stat-source move traces such as Foul Play/Body Press/Psyshock-style behavior, priority/prevention cases, status/action denial, drain/recovery/HP-cost/residual/item-recovery cases, and broader field-duration coverage.

The all-move QA approach is now defined in `docs/MOVE_MECHANICS_QA_CLOSEOUT_PLAN.md`. The important boundary is that `120 verified / 0 baseline / 0 incomplete` proves registry/test coverage for the shipped move surface, not exhaustive live browser proof for every possible move interaction. Live QA closeout must happen by mechanic family and by high-risk representative moves.

The next QA export layer adds `replay_logic_audit`, a high-level retained-replay health check for turn logs, damage rows, move traces, effect rows, faint causes, and mechanic-family gaps. This audit should help reviewers quickly see whether retained replays are strong enough to support a logic claim, while still keeping targeted/tactical proof separate from full Champion legality or all-move truth.

The legality closeout target is now defined in `docs/LEGALITY_99_TARGET_PLAN.md`. The short version: `100% legality` needs complete official/client-captured proof for the active regulation, while `true 99% legality` means all shipped runtime teams, rankings, QA artifacts, and Team Lab promotion paths are guarded against unknown or stale Champion data. Unknown rows stay `needs_verification`; known illegal rows are rejected; Team Lab/global rankings cannot use `needs_verification` teams in official scopes. The first `legality_evidence_package.js` implementation now exists as the package/fixture gate, but it still uses dev fixtures until real in-game Regulation M-B captures are supplied.

## 100% closed right now

No active strategic slice should be marked `100% closed` today. Several are deployed and CI-green, but the correct engineering claim is `99% closed` until fresh live artifacts and issue/milestone closeout proof are attached.

This is intentional. It protects the project from overstating Pokemon Champion legality, real ladder truth, or coaching certainty.

## Current next priority

1. Run one fresh live QA artifact on the latest deployed build and verify `qa_claim_review` appears in the page and JSON.
2. Run one fresh replay upload artifact from real battle files and verify `claim_audit`, hidden source gaps, field/move failures, and team mapping are understandable.
3. Update GitHub milestones/issues using this status map: close only what is proven, mark `99%` items with residual risk, and keep blockers open.
4. Start the next sim-truth slice: replay transparency and QA usefulness, specifically miss/accuracy, field state, volatile state, multi-target damage, and residual/contact damage visibility.
5. Run the move-mechanics QA closeout plan, starting with non-standard stat-source proof for Foul Play, Body Press, Psyshock, and Foul Play/Pure Power guard.
6. Build the Regulation M-B legality evidence package: official/in-game source captures, known legal team accepted by Pokemon Champions, known illegal team rejected by Pokemon Champions, stale-ruleset fixture, and validator/Team Lab promotion gates.
7. Plan the first `ui.js` module split before adding more QA or Team Lab UI.

## Closeout rule for the next work item

Before starting or closing the next feature, answer:

- What exact claim did we prove?
- Which artifact or test proves it?
- Which version proves it?
- What does it not prove?
- Which GitHub issue or Roadmap item changed?

If the answer is not clean, the item remains open or `99% closed` with a named residual risk.
