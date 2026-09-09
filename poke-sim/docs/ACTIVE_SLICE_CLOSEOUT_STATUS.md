# Active Slice Closeout Status

Last updated: 2026-07-04

This document is the working closeout map for the current Pokemon Champions simulator build. It exists to stop feature jumping and keep every major slice tied to proof, residual risk, open blocker status, and the next action.

Use `100% closed` only when the claim is source-backed, tested, deployed, and has no known residual blocker. Use `99% closed` when the implementation is practically complete but still needs more live artifacts, more devices, more samples, or future source checks.

## Status summary

| Slice | Status | Proof we have | Residual risk / blocker | Next action |
| --- | --- | --- | --- | --- |
| QA slice naming, claim review, true-QA contract, and 100% readiness gate | 99% closed | v2.2.90 and v2.2.91 tests assert directive QA names, `qa_claim_review`, forbidden claims, and source gaps. v2.2.99 adds `qa_slice_contract`; v2.2.100 adds `qa_100_readiness` so each artifact can say what still blocks a real-game 100% claim. | Needs one fresh live QA artifact from the deployed page proving the visible readout and downloaded JSON both carry `qa_slice_contract` and `qa_100_readiness` after cache refresh. | User exports one `Current Evidence QA`, `Device-Safe Stress QA`, or `Tactical Coaching QA` artifact from the latest URL. |
| Release discipline and cleanup gates | 99% closed | `RELEASE_DISCIPLINE_AND_CLEANUP_GATES.md`, Roadmap links, architecture doc updates, and overview tests are in place. CI and Pages passed for v2.2.91. | Team still needs to use the gates before closing GitHub issues or starting large new slices. | Apply this closeout map to the next issue/milestone sweep. |
| Replay claim audit / Tactical QA claim boundary | 99% closed | Replay and QA exports now carry claim boundaries, source gaps, forbidden claims, and tactical QA readouts. Focused tests passed across v2.2.87-v2.2.90. | Needs fresh replay-upload artifact proof from live UI with real uploaded logs after the latest bundle. | Capture one live replay artifact and inspect `claim_audit` plus hidden/forbidden claims. |
| Team Lab ranking preview | 99% closed for local preview, open for official rankings | Local Top 25 preview, reset control, ranking gates, hidden-details policy, Team Lab source docs, and preview UI are shipped. | Official/global ranking is blocked until trusted import worker, verified legality, team-ID mapping, promotion rules, stale recalculation, and enough sample size are proven. | Keep preview labeled experimental; do not promote to official leaderboard yet. |
| Home page / Battle Labs landing page | 99% closed | Home/Roadmap split, Battle Labs hero, source-backed news watch, Top 25 gated section, and start-cycle UX are shipped and tested. | Visual polish can continue, but it should not block sim-truth work unless usability hides critical actions. | Only do small polish fixes while higher-priority sim correctness work continues. |
| Showdown/HTML replay intake | 99% closed for import acceptance, open for coaching calibration | Replay upload accepts richer formats and maps uploaded teams/logs into review flow. | Real battle-body training still needs robust parser calibration, replay-to-team mapping proof, and non-poisoning import rules. | Use `/Users/kevinmedeiros/Downloads/battles` as calibration input, but keep outputs labeled evidence, not truth. |
| Replay transparency and turn-log explainability | Open blocker | Damage/effect events, applied/calculated damage, status/action-denial evidence, and replay dedupe have strong coverage. | Still needs broader move-failure, miss/accuracy, field-state, volatile-state, multi-target, contact, residual, and Pokemon card state tags in replay UI. | Continue replay transparency before expanding coaching certainty. |
| Production launch readiness gate | 99% closed for guardrail, open for actual launch | v2.2.131 adds `production_readiness_gate` to QA artifacts, `qa_dashboard`, and the inline QA Claim Review card. It separates internal QA usefulness from beta/public launch readiness and keeps public launch false while source-truth gates remain blocked or partial. | This is a guardrail, not a production approval. Actual launch remains blocked by legality truth, replay parity, scenario breadth, singles/doubles proof, source-gap boundaries, security/privacy closeout, and fresh live artifacts. | Use `production_readiness_gate.next_production_action` before launch decisions. Do not say production-ready unless `can_public_launch` is true and human source-review closeout is attached. |
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

The turn-log files supplied with the same proof pass remain useful targeted evidence, but they also correctly expose missing targeted proof families. As of v2.2.128, downloaded single replay logs must report a concrete top-level `turns` count and a `qa_scope_note`; missing targeted proof inside one replay is a coverage target, not a release-wide failure by itself. v2.2.129 further aligns `simulateBattle().turns`, downloaded logs, and retained replay-card evidence to completed `turnLog` rows instead of an internal loop counter. v2.2.130 keeps `qa_coverage_summary.missing_targeted_proof` empty for downloaded single replay logs and moves one-battle absent mechanics to `single_replay_missing_mechanics`. Trick Room active state is now a completed targeted export proof item from v2.2.127, not an open missing-proof item when using the current targeted sweep bundle. The current next targeted proof list includes non-standard stat-source move traces such as Foul Play/Body Press/Psyshock-style behavior, priority/prevention cases, status/action denial, drain/recovery/HP-cost/residual/item-recovery cases, and broader field-duration coverage.

The all-move QA approach is now defined in `docs/MOVE_MECHANICS_QA_CLOSEOUT_PLAN.md`. Current evidence is `123 verified / 11 baseline / 0 incomplete` across 134 shipped moves. Even verified registry rows prove named behavior only, while baseline rows explicitly lack sufficient local execution proof. Live QA closeout must happen by mechanic family and high-risk representative interactions.

The next QA export layer adds `replay_logic_audit`, a high-level retained-replay health check for turn logs, damage rows, move traces, effect rows, faint causes, and mechanic-family gaps. This audit should help reviewers quickly see whether retained replays are strong enough to support a logic claim, while still keeping targeted/tactical proof separate from full Champion legality or all-move truth.

The v2.2.99 true-QA slice contract adds `qa_slice_contract` to exported artifacts and the page readout. It classifies the export as Current Evidence QA, Device-Safe Stress QA, Tactical Coaching QA, Targeted Mechanic Proof QA, or Release Matrix QA, then names the purpose, best use, not-for boundary, pass criteria, blockers, evidence counts, and next action. This prevents QA from being treated as one vague "green button" and keeps release proof, battle-mechanic proof, replay transparency, coaching evidence, and leaderboard/legal claims separated.

The v2.2.100 QA 100 readiness gate adds `qa_100_readiness` so useful evidence is not confused with complete readiness. The gate stays blocked or partial until official Champion legality proof, mechanic-family breadth, replay transparency, scenario breadth, real replay parity, singles/doubles coverage, and source-gap boundaries are all satisfied. This is the object Codex and the team should use when deciding what remains before saying the simulator plays like the real game across all important possibilities.

The v2.2.131 production launch gate adds `production_readiness_gate` on top of `qa_100_readiness`. This is the public-launch guardrail. `qa_dashboard.can_ship` can show that a captured artifact has clean release/battle proof for its scope, but `production_readiness_gate.can_public_launch` must stay false until every public-launch gate passes. This prevents a useful QA artifact from being mistaken for production readiness.

The legality closeout target is now defined in `docs/LEGALITY_99_TARGET_PLAN.md`. The short version: `100% legality` needs complete official/client-captured proof for the active regulation, while `true 99% legality` means all shipped runtime teams, rankings, QA artifacts, and Team Lab promotion paths are guarded against unknown or stale Champion data. Unknown rows stay `needs_verification`; known illegal rows are rejected; Team Lab/global rankings cannot use `needs_verification` teams in official scopes. The first `legality_evidence_package.js` implementation now exists as the package/fixture gate, but it still uses dev fixtures until real in-game Regulation M-B captures are supplied.

## 100% closed right now

No active strategic slice should be marked `100% closed` today. Several are deployed and CI-green, but the correct engineering claim is `99% closed` until fresh live artifacts and issue/milestone closeout proof are attached.

This is intentional. It protects the project from overstating Pokemon Champion legality, real ladder truth, or coaching certainty.

## Current next priority

## QA assignment for Josh / QA team: Showdown reference battle review

Plain English: we cannot use downloaded Showdown battles to prove what Pokemon Champions officially allows. We can use them to see how real Champions-format battles flow, then compare those turns against our replay parser, Battle Sensei notes, move/effect logs, and tactical QA.

Input package:

- `source/reg-m-b-showdown-reference-battles.json`
- Source folder: `/Users/kevinmedeiros/Downloads/battles`
- Current manifest: 39 Showdown HTML replays, including 5 Reg M-B and 34 Reg M-A logs.
- Current live build for this handoff: `v2.2.116-regmb-review-items-abilities`
- Latest Codex-reviewed QA artifact: `/Users/kevinmedeiros/Downloads/champions-sim-qa-artifact-2026-07-02T18-13-16.json`
- Recommended first Reg M-B file: `Gen9ChampionsVGC2026RegMB-2026-06-24-pcrlbot02888784c1-silvijd.html`
- GitHub assignment: #190 `QA: Josh/QA Showdown reference battle review`
- Owner: Josh (`@Jdoutt38`)

Allowed QA use:

- Check whether the Review upload/parser reads Showdown HTML cleanly.
- Check whether team preview, selected 4, turns, switches, moves, damage, misses, weather, Tailwind, Trick Room, Megas, residual effects, and winner are understandable.
- Compare real battle flow against our replay output and Battle Sensei coaching language.
- Create parser/coaching bugs when the app loses an important event or gives vague advice.
- Use Reg M-B logs as reference gameplay evidence for tactical calibration.

Blocked QA use:

- Do not mark Reg M-B legality verified from these logs.
- Do not promote teams from these logs into official Team Lab rankings.
- Do not use Showdown logs as accepted/rejected in-game team validation.
- Do not use them to claim the official eligible Pokemon/form/item/move/Ability allowlist.
- Do not mix Reg M-A and Reg M-B rows in the same coaching claim unless the report explicitly says it is cross-regulation reference analysis.

Josh/QA checklist:

1. Pick one Reg M-B Showdown HTML replay from the manifest.
2. Upload it through the Review flow.
3. Confirm the parser identifies format, players, team preview rosters, selected 4 where visible, turn count, winner, and major field effects.
4. Confirm replay output shows no unexplained faint or unexplained HP drop.
5. Confirm Battle Sensei says what happened, why it mattered, and what evidence is missing.
6. File a bug if the parser loses a move, damage event, miss, weather/field duration, Mega event, status/action denial, or switch.
7. Keep the result labeled `showdown_reference`, not official Champion truth.

Pass condition:

- At least one Reg M-B Showdown replay produces a readable Review output and QA artifact with source tier `showdown_reference`, no official-legality promotion, and clear parser gaps if any exist.
- Josh can confirm the upload path extracts embedded `battle-log-data`, identifies Reg M-B doubles, players, team preview rosters, selected four where visible, winner, turns, moves, damage, misses, weather, abilities/items, faints, and Battle Sensei evidence language.

Fail condition:

- The upload cannot parse the HTML, hides important turn events, loses team mapping, invents official legality, or makes coaching claims without evidence.

1. Run one fresh live QA artifact on the latest deployed build and verify `qa_claim_review`, `qa_slice_contract`, and `qa_100_readiness` appear in the page and JSON.
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
