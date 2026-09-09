# Player Trust And Journey Audit

Recorded August 30 EDT / August 31 UTC, 2026. This is a bounded agent walkthrough and local regression audit, not a human user study, live DB security clearance, or accuracy certification.

## Decision

Keep the product in controlled preview. The core promise should be **choose a team, test a matchup, understand the evidence, improve the team**. More simulations alone do not establish correctness. Fix evidence integrity and known mechanics disagreements before expanding coaching or redesigning the homepage.

Public site inspected: `v2.2.138-site-navigation-fixes`, main `4f2cb179265d647706f4a1749c47d85e3e707043`. Local candidate: `v2.2.139-replay-evidence-guard`, engine `1.1.2`, dirty audit worktree based on `933071d`. No publishing, production writes, or repo alignment is claimed. The separate security-proof candidate remains separate.

## Evidence And Limits

| Check | Observed result | What it does not establish |
|---|---|---|
| Baseline full local gate | 149 fast files and 12 offline/mock DB files passed | Production permissions or game accuracy |
| Replay-guard full local gate | First iteration: 150 fast files and 12 offline/mock DB files passed; final verification recorded below | Live saves, all malformed protocol, or all coaching claims |
| Battle audit | 43 deterministic files, 3 golden traces and 4,500/4,500 seeded headless battles; zero execution errors | Reference agreement for those games |
| Mechanics inventory | 44 cases: 17 covered, 17 partial, 10 open; 15 families: 6 covered, 7 partial, 2 gaps | Complete coverage of every shipped move/item/species interaction |
| Fresh pinned Showdown probes | 5 completed: 2 agree, 3 disagree; zero completed reference games | A meaningful overall accuracy percentage |
| Public browser walkthrough | All 11 top-level sections inspected; three homepage routes/focus, empty and invalid replay paths checked | Every control, fresh storage, accessibility compliance or real-player success |
| Responsive homepage | Desktop 1280px and mobile viewport 390px; no page-wide horizontal overflow in these checks | Physical-device, screen-reader, all-panel or full responsive QA |

Local artifacts: `poke-sim/artifacts/player-trust-audit-2026-08-30/` contains DOM snapshots, screenshots, battle report and test output. The reference run is under `poke-sim/artifacts/showdown-reference/2026-08-31T03-14-59-806Z/`. Artifacts may include pre-existing browser history and should remain local, not be posted wholesale.

**Interactive simulation batches: 0. Paired browser/export game logs: 0.** Public run handlers can automatically save analyses. Without verified DB permissions, this audit used isolated headless stress rather than generating public saved evidence. Viewing Strategy displayed existing sample data; it was not counted as fresh simulations. No ruleset gate was bypassed. Future staging browser runs must pair each game/team change with exported and visible logs under the existing visual replay audit workflow.

## Findings And Work Queue

| Priority / ID | Finding | Next acceptance test |
|---|---|---|
| P1 TRUST-01 | Ordinary prose produced a B/82 decision grade, drills and Save Private Import despite no parsed turns on public v138. | Local guard rejects absent/malformed observations; input/upload/reference changes clear previous review and actions; unchanged HTML retains source fingerprint. Retest the reviewed deployment. |
| P1 SIM-01 | Same-turn Tailwind ordering, Seismic Toss damage, and Growl/Leer stage changes still disagree with pinned Showdown. | Separate side-swapped fixtures with exact order, HP and stage assertions; run reference comparison and complete-game follow-ups. |
| P1 EVIDENCE-01 | Strategy mixes 0-game/low-confidence grading with 1,146-game statistics and 1,147 battle labels; recorded wins/losses total 1,146. | One result identity and denominator across all cards: team version, bring four, opponent, ruleset, engine/data fingerprint and actual completed outcomes. Old evidence cannot silently follow team edits. |
| P1 COACH-01 | Strategy rendered `undefined` move statistics and labeled moves on unbrought Pokemon as dead; advice included unsupported blanket weather and Choice Scarf assumptions. | Grade only eligible opportunities; distinguish unbrought, unused and unavailable evidence. No recommendation without supported facts, uncertainty and a lawful replacement. |
| P1 DATA-01 | Public badge says DB connected while tooltip reports 0 accepted teams and 36 blocked rows. Teams simultaneously shows historical tags and LEGAL badges. | Separate connection health, usable roster counts, regulation approval and fallback state; an unverified package cannot imply current competitive legality. |
| P1 SECURITY-01 | Offline DB tests do not verify live grants, migrations, visitor denial or two-user isolation. | Authorized administrative readback and isolated staging allow/deny tests. See the existing restricted security record and public-launch gate. |
| P2 UX-01 | Eleven peer tabs mix player work with QA, Roadmap and Sources. Mobile shows both tabs and a section selector. Multiple labels compete: Poke-e-Sim, Battle Labs, Battle Sensei. | Prototype one primary player navigation, one consistent product identity and secondary reviewer tools; test keyboard/focus, mobile and back/reload. |
| P2 UX-02 | Large hero and header put Start Team Test below the captured desktop first viewport and near the bottom on mobile. Simulator selectors appear unnamed in the accessibility snapshot. | Make team/matchup/start visible first; add explicit accessible labels and verify actual names, tab order and small-screen fit. |
| P2 DRIFT-01 | Public Sources shows a June 28 review and v2.2.21 marker; news's first displayed item is July 5. Public Roadmap remains older than the consolidated local roadmap. Header still advertises singles as a product. | Publish reviewed generated roadmap/source state; derive freshness and availability from verified workflow records, not rewritten dates. Align doubles scope across header/docs. |
| P2 UX-03 | Replay Log repeats filter groups; Pilot Guide is a near-empty destination; Review exposes many implementation terms before the primary input. | Consolidate related results/history, progressively reveal advanced evidence, and offer meaningful empty-state recovery without unsupported advice. |

The Earthquake/Flying-ally reference fixture's mismatch concerns missing stage changes; this run does not isolate an Earthquake immunity defect. Likewise, 24 timer expiries in 4,500 headless games are a separate outcome to inspect, not automatic crashes or confirmed cartridge-equivalent endings.

## Bounded Fix Applied Locally

`replay_coach.js` now requires a positive observed turn with at least one recognized event carrying required fields before generating review output. It is an evidence-presence boundary, not a complete Showdown protocol validator or proof that a partial log warrants numeric grading.

`ui.js` invalidates prior review/save/export state on text, roster, side, reference-team and programmatic upload/URL replacements. Saving through the Review button requires a successful current analysis. Original uploaded HTML is retained for import provenance while normalized text is analyzed. Editing the text starts a new manual source. No DB schema, engine mechanics or promotion policy changed.

`replay_evidence_gate_tests.js` exercises prose, metadata-only, empty/chat turns, malformed move/weather/boost records, full/partial logs, stale-state invalidation, reference changes, invalid uploads and unchanged HTML provenance. Existing parser and UI contracts were updated for the intentional boundary. Independent review found three weaknesses in the first patch; the second patch added structural event checks, replacement invalidation and original-source retention.

Remaining replay work: full protocol validation, sufficiency/confidence gating for partial evidence, async loading/race recovery, actual authenticated save/readback and deployed paired replay verification. The raw-import service outside this UI has its own contract; this fix does not ban retaining failed raw imports for diagnostics everywhere.

## Implementation Order

1. **Security release gate:** verify named live project read-only metadata and create/identify isolated staging. Public activation remains blocked; do not expose keys or bypass denied tools. GitHub publication was approval-blocked in this session.
2. **Smallest mechanics correction:** Seismic Toss with ordinary target, Ghost immunity and Protect, both sides. Then same-turn Tailwind and Growl/Leer. Keep fixes separate and use the pinned reference, not the coach, as the mechanics comparison.
3. **Evidence and coaching integrity:** unify saved-result identity and denominators, suppress unsupported scores, add participation/opportunity counts and trustworthy data/regulation badges.
4. **Complete-game benchmark:** mirror sides, equal speeds, bring-six/select-four, switches/replacements, PP/Pressure and residual ordering. Pin data/ruleset/engine/seed/action policy and classify unsupported/reference-error cases separately.
5. **Player experience:** Team -> Test -> Review -> Improve. Make the actual task primary, place Sources/Roadmap/QA in secondary navigation, consolidate duplicate reports, then test the exact released artifact.

These are sequenced outcomes, not a promise to build every historical idea. The source of future status remains `poke-sim/source/project-roadmap.json`, generating both ROADMAP.md and browser data.

## Human Help And Success Measures

- A project operator must authorize live security readback and identify staging; secrets should not be pasted into chat.
- Competitive reviewers need to validate Champions-specific regulations and disputed mechanics with official or in-game evidence. Showdown agreement is not official Champions legality.
- Recruit a small pilot of five beginners and five competitive players. Proposed product targets, not established results: at least 9/10 can choose a team, start a permitted test and explain the result's confidence without assistance; no critical task blockers; test the proposed three-minute first-test target against observed times.
- Check physical mobile devices, keyboard-only navigation, a screen reader, poor-network recovery, long runs/cancellation and back/reload. Agent checks alone cannot establish A+ or top-1% usability.
- A future accuracy claim needs a declared supported inventory, held-out representative cases, explicit exclusions and independently matched state transitions. Passing 4,500 local games is not 99% accuracy.

## Final Verification

- The corrected replay guard passed the full local gate: 150 fast and 12 offline/mock DB files, zero failures. M9 retained 3 unverified administrative checks. See `final-project-gate.txt`.
- After the final stale-status and service-worker fallback refinements, eight focused files passed: replay evidence, parser, summary/timeline, import service, import governance, release manifest, project roadmap and agent configuration. See `final-focused-checks.txt`. This is a focused follow-up, not another full-suite run after those two refinements.
- Final bundle: 11,454,828 bytes; SHA-256 `b0fc13b028dd6f7b01c6097463e4cc906f99a57c2b72f6f293f1e367d1481925`. Release tests reproduce bundle bytes and check the service-worker fallback against the current manifest.
- Local browser at `http://127.0.0.1:8766/pokemon-champion-2026.html`: valid four-turn fixture rendered; prose and malformed move input produced no review; editing removed stale results, status, save and export eligibility. No save was clicked. Synthetic text was cleared afterward.
- Browser Roadmap showed the generated security-first release gate, scoped replay fix and still-open mechanics/UX milestones. Public v138 remained unchanged. Changed-file whitespace checks passed, with Git line-ending warnings only.
- Upload/reference/provenance transitions were checked in the Node UI harness, not with an actual browser file-picker or authenticated database save. Local browser tests do not establish public deployment or universal coaching correctness.
