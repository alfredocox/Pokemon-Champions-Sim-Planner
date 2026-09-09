# Competitive Player Review And Fix Queue

Date: 2026-08-30. Scope: competitive doubles. Status: initial audit complete; local fix status updated below. No deployment, source promotion, GitHub issue closure, or production writes. Original reproductions remain historical evidence; see [follow-up validation](identity_validation_2026-08-30.md) for the current local build.

## Decision

Keep the public build labeled experimental/historical. Do not claim current competitive readiness or 99% game accuracy. The deployed build has the original trust/provenance findings below. Local fixes now reject unknown rules, preserve saved-result identity and constrain participants; independent Strategy caches and forced-replacement interpretation still need work. Finish evidence integrity before expanding coaching.

In simple terms: the battle referee, scorekeeper, and coach must agree about who played, which rules applied, and what actually happened. More games do not fix a scorekeeper that labels the wrong rules or a coach that blames a move the player did not choose.

## Current Rule Boundary

The official ranked M-B notice, updated August 5, extends the season through September 9, 2026 at 01:59 UTC. M-B is active on the audit date, whereas the application's runnable teams remain in historical M-A. This notice does not by itself establish a particular tournament's rules. [Official M-B notice](https://champions-news.pokemon-home.com/en/page/776.html).

The tournament handbook describes selecting four Pokemon for a game and leading with two, and distinguishes event formats and event-specific requirements. Exact event regulations and eligible species must be independently mapped before claiming event parity. [Official VGC tournament handbook](https://mcdn.pokemon.com/pokemon-prod/raw/upload/v1/live/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-vgc-tournament-handbook-en.pdf).

This review did not completely transcribe the image-based official eligibility list or verify every move, stat, species, item, or in-game interaction. Showdown is a differential baseline, not automatic proof of every Champions rule.

## Ordered Acceptance Checklist

P1 means trust/release blocker; P2 means incorrect analysis or meaningful workflow friction; P3 means usability polish. Owners are responsibility areas, not assigned people. Checked runtime items mean locally verified only, not deployed or closed on GitHub.

- [x] CPA-01 / P1 / rules: unknown/missing IDs fail closed; reviewed aliases retained. Locally verified.
- [ ] CPA-02 / P1 / evidence: execution/storage/export provenance and local-history isolation fixed locally. Broader comparison acceptance remains PARTIAL until independent Strategy caches share identity gates (CPA-09); no live DB proof yet.
- [x] CPA-03 / P1 / engine: actual participants and exported bring-four agree through omitted selection, reordered leads and replacements. Locally verified; generic SV full-roster behavior retained.
- [ ] CPA-04 / P2 / replay: never classify a mandatory replacement after fainting as a voluntary switching mistake.
- [ ] CPA-05 / P2 / coaching: measure move usage against eligible opportunities, not every game on a registered team.
- [ ] CPA-06 / P2 / legality: distinguish legal imports from implemented, trustworthy simulation support.
- [ ] CPA-07 / P2 / UI: wire Review type to distinct behavior or remove unsupported choices.
- [ ] CPA-08 / P2 / UI: distinguish setting/reversing Trick Room from denying it.
- [ ] CPA-09 / P2 / evidence UI: explain each analysis sample, version, scope, and freshness; do not blend unrelated evidence under one confidence label.
- [ ] CPA-10 / P2 / rules and release: reconcile M-B dates, stale source/news summaries, and the deployed Roadmap with the current approved plan.
- [ ] CPA-11 / P2 / editor: show calculated final stats alongside the editable spread for speed/damage planning.
- [ ] CPA-12 / P3 / UX: provide useful Replay Log and Pilot Guide empty-state actions.
- [ ] CPA-13 / P2 / replay evidence: visible resolved actions omit/reorder executed moves. Confirmed by paired JSON/DOM evidence; see [visual audit](visual_replay_audit_2026-08-30.md).
- [ ] CPA-14 / P2 / field display: canonical `tailwind_turns` is not read by the field chip renderer. Confirmed by paired JSON/DOM evidence; see [visual audit](visual_replay_audit_2026-08-30.md).

Documentation corrections made locally in this audit:

- [x] CPA-D1 / P1: replace obsolete three-script bundle recipes in README and DEVELOPMENT_RUNBOOK with `python tools/build-bundle.py`.
- [x] CPA-D2 / P2: correct the active source registry's M-B deadline and explicitly leave runtime date drift open.
- [x] CPA-D3 / P2: put historical warnings inside both MASTER_PROMPT copy blocks.
- [x] CPA-D4 / P2: supersede the initial Worlds report's mechanics action list without erasing its historical test results.
- [x] CPA-D5 / P2: distinguish designed Supabase responsibilities from verified public reads and unverified writes/migrations.
- [x] Link this queue from STATUS and ROADMAP. These edits are local, not team publication or a deployed Roadmap update.

## Findings And Reproductions

### CPA-01: Unknown Rules Become Trusted

Evidence: local execution and independent read-only review. `rulesets.js`, `getChampionsRuleset`, falls back to M-A after failing lookup. Running `getRulesetEvidencePolicy('champions_reg_m_b_2026_typo')` returns historical M-A with `runtime_promotable: true` and `poisoning_guard: 'trusted_stats_allowed'`.

Impact: malformed/new regulation identifiers can acquire trusted learning eligibility. The correctly named M-B profile is blocked, but a typo bypasses that intent.

Acceptance: preserve and reject unknown nonempty IDs; test missing IDs separately under an explicit migration policy; keep only reviewed legacy aliases. Test import, analysis, and persistence consumers, not just the lookup. No silent conversion of unknown evidence into historical truth.

### CPA-02: Saved Results Lose Their Battle Identity

Evidence: independent local payload reproduction plus source inspection in `ui.js`, `_buildAnalysisPayload` and `_stripTurnLogForPersistence`. The payload derives a doubles ruleset from current team metadata/defaults, does not preserve the run's format, and reads `window.ENGINE_VERSION` with a `1.0.0` fallback. The engine declares lexical `ENGINE_VERSION = '1.1.0'`. Reviewer reproduction produced the same doubles ruleset and `1.0.0` engine label for singles and doubles inputs.

Impact: saved evidence can be compared or learned from as if incompatible runs matched. This is a serialization finding, not proof that production received these test payloads.

Acceptance: create immutable provenance at execution; preserve it through export, storage, load, and comparison. Round-trip singles/doubles, Bo1/Bo3, team edits, version changes, and explicit/default selection. Incomplete legacy provenance must remain quarantined rather than backfilled with the current build.

### CPA-03: Default Battle Participants Can Exceed Reported Bring

Evidence: known open issue independently reproduced in `engine.js` participant defaults. Six-member Protect-only mirror teams with the first two members at 1 HP and poisoned, seed `[1,2,3,4]`, and no explicit bring can introduce members five and six after the leads faint, while reporting the first four.

Impact: a doubles benchmark can look like selected-four competition while using extra reserves. Prior explicit-selection sweeps avoid this path; they do not fix it.

Acceptance: format-specific selected-four invariants on both sides, including omitted opponent selection and legacy entry points; stable member/item IDs throughout lead reorder, switches, fainting, and export. Preserve other formats' intentional participant rules. Assert every active/replacement actor belongs to the exported selected set.

### CPA-04: Forced Replacement Is Blamed As A Switching Error

Evidence: deployed Review and local `replay_coach.js` analysis of existing synthetic `tests/fixtures/showdown_replay_sample.txt`. Turn 3 faints are followed by replacement `switch` events. Parser marks only `drag` events forced; the tempo-loss detector also counts switches without excluding mandatory replacements. Review labels the turn `Switch Tempo Loss` / `Switching Error`.

Impact: the coach criticizes a decision the player never made. The fixture is synthetic parser evidence, not a real tournament replay or a general mechanics oracle.

Acceptance: distinguish voluntary switch, pivot, forced drag, and post-faint replacement using slot/event context; penalize only relevant player choices. Cover one and simultaneous double faints, entry KOs, pivots, and genuine voluntary switch losses. Preserve faint/HP interpretation and stable actor identity.

### CPA-05: Unbrought Pokemon Receive Dead-Move Advice

Evidence: deployed Strategy listed 13 dead moves, including moves on Rotom-Wash and Dragapult outside the selected four. Local 30-game reproduction with a never-brought Rotom-Wash flags Hydro Pump and Protect. `ui.js`, `csDetectDeadMoves`, divides by all games and iterates all registered members; missing move usage becomes zero.

Impact: users can be told to replace useful moves because the Pokemon never entered the match. AI nonuse is also not proof a move is competitively bad.

Acceptance: distinguish registered, brought, active, actionable, and legal-use opportunities; unknown telemetry must not become zero usage. Scope evidence to matching member/build/format/policy. Cover unbrought members, turn-one KOs, disabled moves, Protect utility, stale data, and genuinely underused moves. Prefer a testable hypothesis over an unsupported replacement command.

### CPA-06: Legal Import Is Not Mechanics Readiness

Evidence: independent local review: Clefable with Gravity / Protect / Moonblast / Follow Me passes import legality without warnings, but executing Gravity produces no field effect. `ui.js` import checks do not establish move implementation coverage. This is an imported-surface capability test, not approval of the set for current M-B.

Acceptance: separate source legality, data completeness, and executable support. Unsupported interactions must be visible before a trusted run, and must not feed authoritative coaching. Every support claim needs an executable regression, not merely a complete data row.

### CPA-07: Review Type Is An Inert Control

Evidence: deployed Quick Review and Mistake Finder produced identical analysis content for the same fixture. `index.html` declares `replay-coach-mode`, but the run handler in `ui.js` does not read it.

Acceptance: define the expected output for every offered mode, consume the selected value, and test changed output/sections. Remove options until implemented if necessary. Changing a label alone is not implementation.

### CPA-08: Trick Room Coverage Label Is Misleading

Evidence: deployed player roster showed `Trick Room` checked without any member knowing it. `ui.js`, `TR_PRESSURE_MOVES` and `buildCoverageChecks`, count Fake Out, Taunt, and Imprison alongside Trick Room under the same label.

Acceptance: separate Trick Room setter/reversal from disruption, and explain evidence precisely. Fake Out alone must not imply a team can set or reverse Trick Room. Test teams with each category and interactions that make disruption ineffective.

### CPA-09: Mixed Evidence Is Hard To Interpret

Evidence: deployed Strategy showed `Sample 0 games` and low confidence above older recommendations backed by 1,146 decisive games. It also displayed 1,147 total battles elsewhere; that one-game difference can reflect a draw and is not by itself a counting bug. The DB badge read connected while its detail reported zero accepted teams and 36 blocked stale/illegal rows. This is successful rejection, not proof of fresh playable DB teams or saved-log persistence.

Acceptance: give each card its own cohort, sample definition, ruleset, version, and freshness, and make quarantine/fallback state obvious. Do not imply the top-level sample describes a different saved analysis. Verify a fresh browser, stale history, rejected DB rows, and incomplete provenance without production test writes.

### CPA-10: Rules, Roadmap, And Source Freshness Drift

Evidence: `rulesets.js` retains September 2 as M-B end date. Sources shows a June 28 sweep; Home news points to a July event as latest. Deployed Roadmap and local `ui.js` active-next sections mix older pending deployment versions and paired singles/doubles proof with the current doubles-only gate. Historical entries may remain, but must not read as current tasks.

Acceptance: carry source verification timestamps; correct the reviewed regulation metadata without prematurely promoting M-B; separate historical roadmaps from current next actions. Generate or validate the active UI queue against canonical status. Verify the resulting build and Pages digest separately. Do not claim all 16 currently legal-labeled teams are current-regulation teams.

### CPA-11 And CPA-12: Competitive Workflow Friction

Set Editor exposes stat-point allocation but requires leaving it for the Simulator's Stats dialog to inspect final Speed and other battle stats. Show the calculated stats beside the editable spread and test nature/level/SP updates and constraints. Empty Replay Log and Pilot Guide give little direction; add direct actions to the relevant existing workflow rather than more introductory copy.

These are usability findings, not damage-formula failures. Mobile, keyboard, and assistive-technology acceptance still need testing.

## What Was Actually Exercised

- Fresh deployed build: `v2.2.131-production-launch-gate` at the public GitHub Pages app. Local unreleased fixes were not assumed deployed.
- All 11 main tabs: Home, Simulator, QA Tester, Roadmap, Teams, Set Editor, Strategy, Review, Replay Log, Sources, Pilot Guide.
- Read-only team/filter exploration, import dialog, editable draft canceled without saving, final-stat dialog, empty Review validation, synthetic replay analysis, and Review mode comparison. Synthetic replay input was cleared afterward.
- At 1280x720, DOM checks found no horizontal overflow or loaded visible broken images across these tabs. An editor screenshot was inspected. This is not comprehensive visual or mobile certification.
- No live batch simulation, team save, private replay save, database migration, source promotion, or deployment was triggered. The existing user browser tab was left alone.
- Local tests: `phase4c_detectors.js` 20/20, `replay_turn0_tests.js` 10/10, `replay_species_parser_tests.js` 11/11. Passing existing tests does not cover the new failures above. The full suite was not rerun for documentation-only changes.
- Independent read-only mechanics/evidence and documentation reviewers contributed findings. The lead reviewer also reproduced unknown-ruleset fallback, forced-replacement coaching, and unbrought dead-move classification.

Local ignored evidence: `artifacts/player-review-2026-08-30/screens.json`, `review-fixture.txt`, `unbrought-dead-moves.json`, and `local-replay-analysis.json`. These are local audit artifacts, not published private logs or committed benchmark fixtures.

## Documentation Coverage And Limits

The documentation reviewer inventoried 420 tracked files, including 126 documentation/page files (119 Markdown, three HTML, three text, one LICENSE), plus 13 local untracked documentation files. All 126 were inventoried and claim-pattern-scanned; governing documents and targeted current-state, source, build, release, and architecture passages were manually read. This is not a claim that every historical sentence was semantically revalidated.

Old reports remain historical evidence. Local source, local generated bundle, public deployment, and live database verification remain separate states. Some current documents are untracked; the team will not receive these edits until a reviewed commit/PR is published. No fresh reconciliation of both GitHub repositories or live issue/milestone closure audit was performed in this pass.

## Next Implementation Slice

CPA-01 and CPA-03 are now locally verified; CPA-02 execution/storage/export identity is locally verified but comparison/cache acceptance remains partial. Next correct the newly reproduced CPA-13/14 visible replay evidence gaps, finish CPA-02/09 cache isolation, and address CPA-04/05 coaching interpretation. Follow the mandatory paired visual-audit workflow for each interactive run or team change.

For each fix: preserve a failing reproduction, implement the shared-path correction, run focused and affected contract tests, obtain independent review, record local proof, then review/merge/build/deploy and repeat the public workflow. Do not close a deployed defect based only on a local pass.
