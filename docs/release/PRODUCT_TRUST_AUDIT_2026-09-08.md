# Team Builder, Simulation And Strategy Audit

Baseline: candidate eb4affe, v2.2.145-reg-mc-source-review, engine 1.1.6.
Scope: first repository-wide risk triage plus executable Strategy diagnostics.
This is not an exhaustive line-by-line audit or renewed public-launch approval.

## Product Contract

The user's current requested product is a Pokemon Champions team builder and stress-testing simulator for both singles and doubles. Each format needs independent legality, bring size, battle behavior, replay fidelity and useful advice acceptance. Existing AGENTS/roadmap doubles-only readiness language conflicts with that requested destination. Shared engine tests alone do not establish either format's complete readiness.

## Release Findings

1. **P1: Strategy report identity and stale stats.** `ui.js:17651` hashes only names, items, abilities and moves. Nature, stat points, level and registered team ID are absent. The cache at line 17681 reuses the old report after a nature edit; an identical second team receives `team_key: player`. Reproduced using `node tools/audit-strategy-contract.cjs`. Fix with the shared complete versioned team identity and regression tests for every input mutation, identical teams under different IDs, regulation changes and opponent edits.
2. **P1: Coaching invents observed mistakes.** `ui.js:17814` fires Fake Out failure advice without action evidence merely because the user is absent from lead names. The diagnostic reproduces this on zero observed actions. `ui.js:17830` says redirection cancels spread attacks; this contradicts ordinary spread targeting and the simulator's own targeting distinction. Require event-backed findings and correct the rule, including switch-in Fake Out and spread/redirect fixtures in doubles.
3. **P1: Report confidence and sample units are misleading.** `ui.js:18522` sums wins/losses/draws into `totalGames`, although the UI's series runner also reports those counters for series. Confidence grows to elite from count alone without checking source approval or deterministic policy bias. Bind unit, actual game count, regulation, policy, provenance and uncertainty before rendering confidence. Reproduce with matched Bo1/Bo3/Bo5 payloads before implementation.
4. **P1: Regulation extension was missed despite documented evidence.** `docs/DATA_SOURCE_REGISTRY.md:23` records M-B's September 9 extension; runtime and the new M-C test still encode a September 2-9 gap. The diagnostic returns scheduled M-C for September 8. Reconcile the official notice and exact start/end minute semantics before updating runtime and tests. A source-review status must remain source review.
5. **P2: PP changes have unresolved reference disagreements.** PR #195 reviews identify Spite incorrectly blocked by Substitute, missing targeted-status ability gates, and Eerie Spell PP drain suppressed behind Substitute. Installed pinned Showdown flags confirm Spite and Eerie Spell have `bypasssub`; Eerie Spell also has `sound`. Existing passing tests include the contrary Spite expectation. Add executable side-swapped reference probes for Substitute, Good as Gold, Magic Bounce and Prankster/Dark, then fix shared dispatch. Source inspection/flags are supporting evidence, not complete executed interaction parity.
6. **P2: Additional PR review findings require resolution.** Retired/incomplete DB acceptance, accepted-DB provenance tooltip, overlapping regulation windows and light-theme warning contrast are open review findings. Inspected acceptance code confirms diagnostic reasons do not all participate in its predicate; live exploitability was not tested. Reproduce each in isolated fixtures.
7. **P2: Mega sweep cache lacks team revision.** `ui.js:13527` keys only team IDs, Bo and format, so changing sets under stable IDs is not represented in the cache key. Verify invalidation at every editor/import route and bind complete execution identity.

## Coverage And Process Findings

- The declared battle manifest explicitly lists gaps for all import-enabled items and broader importable behavior. A team being importable is not evidence that every move/ability interaction is simulated.
- Existing Strategy suite still passes 66/66 while the new diagnostic reproduces stale and misattributed reports. Some tests assert current heuristics rather than independently correct advice.
- The prior v145 browser Bo3 had three games but no recorded paired downloaded-versus-visible comparisons. Its smoke result is only a successful rendered user path; it does not meet the repository's full interactive replay audit contract.
- Manual Showdown text/HTML/URL browser replay checks remain open. Replay evidence guard tests pass, but do not prove real URL fetch/CORS, actual exported HTML rendering or all coaching claims.
- README retains old 400 KB, 29-team and 84-file claims and revenue/roadmap wording. Current bundle exceeds 11 MB. Replace hard-coded moving inventories with generated/current references after reconciling scope.
- GitHub open-issue inventory returned 79 canonical issues. It mixes source-watch review issues, core correctness, manual QA, premium/social and older milestone plans. Do not close by title or passing suite alone. Source-watch #196-205 needs review; #190 remains manual reference QA. Existing optional LLM #191 should not outrank correctness.
- Candidate is three commits ahead of main and zero behind at readback. Alfredo repository last-pushed metadata is July 1; commit/content equivalence was not established. Do not claim repository parity.
- Live database permissions, migrations, two-user isolation, dependency vulnerability impact, full mobile/a11y and hosted gameplay were not reverified in this pass. Configured reviewer agents exist, but this session has no callable independent subagent runner; this report is a single-agent review.

## Ordered Work Queue

1. Resolve M-B extension and overlap using the documented official source; correct date tests.
2. Reproduce and resolve the PP/Substitute/ability review findings against pinned Showdown.
3. Bind Strategy/Mega cache identity to the full team, opponent, ruleset and run context.
4. Remove unsupported Fake Out/redirection claims and enforce action evidence.
5. Fix game-versus-series units and confidence gating across Strategy, Pilot Guide and PDF.
6. Resolve DB acceptance/provenance and light-theme review findings with regressions.
7. Complete independent singles and doubles scripted whole-game comparisons, including switches, residuals, PP and termination.
8. Run actual Showdown text/HTML/URL import and pair every retained browser simulation with its downloaded log.
9. Reconcile current M-C roster, items, moves, forms and mechanics with official client evidence; track exact sprite coverage separately.
10. Consolidate roadmap and GitHub milestones around build -> validate -> simulate -> inspect -> improve for both formats, then run staging security and hosted user acceptance.

## Evidence

- `node tools/audit-strategy-contract.cjs`: reproduces nature cache reuse, wrong cloned team key, evidence-free Fake Out claim and runtime September 8 gap; prints pinned move flags.
- `node tests/t9j16_tests.js`: 66 passed despite the diagnostic findings.
- `node tests/participant_identity_tests.js`: 12 passed, including singles bring-three and doubles bring-four boundaries.
- `node tests/replay_evidence_gate_tests.js`: four groups passed.
- Fresh `npm run test:accuracy`: 2,312 doubles and 2,312 singles battles, zero state failures, validator errors/warnings or repeatability failures; 34 repeated seeds per format. Raw report and bounded retained logs are in ignored `poke-sim/artifacts/accuracy-2026-08-30/cross-format/` (legacy output directory name). These are engine invariants, with no paired browser inspection.
- Prior 157-file CI and stress evidence remains historical bounded evidence. New stress readback should be reported independently, and cannot close the findings above.

No runtime fixes, rule promotion, production DB writes, issue closures or deployment were performed by this audit slice.
