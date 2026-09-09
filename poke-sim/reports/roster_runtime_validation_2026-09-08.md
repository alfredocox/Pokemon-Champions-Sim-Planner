# Roster Runtime Consumer Validation

Candidate: v2.2.158-roster-stat-parity; engine 1.1.10.

## Findings And Fixes

- The UI type helper disagreed with mirrored types for 47 of 235 mapped keys.
  Generated species types now precede legacy tables; unknowns no longer become Normal.
- The Speed widget used a legacy species table, an incorrect duplicate nature
  table, and SV EV calculations for Champions SP. It now uses engine starting
  stats, explicitly accepts only Champions/SV, and displays unknowns without a
  numeric rank. The label and tooltip exclude item, ability, stage and field effects.
- The supported `Eternal Flower Floette` alias missed both species resolvers and
  fell back to generic stats/types. Both runtime-bridge and engine-only lookup
  now resolve the same Eternal Flower species; explicitly provided abilities remain intact.
- Species-only radar entries compared calculated Speed with species base Speed.
  Without opponent sets, no safety rating is justified. The renderer now reports
  an unverified matchup and no unsourced usage/win-rate figures. There is currently
  no radar-grid in the primary page; this also protects a future restored renderer.

## Evidence

Five original regression tests failed before the fixes. Six focused tests now
cover all 235 mapped keys, literal stat examples, natures and formats, alias
resolution with/without the bridge, unknown inputs and the radar evidence boundary.
The all-key comparison is runtime consistency evidence; a separate pinned
Champions test checks species stats/types/ability slots/numbers independently.
It is not 235 independent battle fixtures or a percentage-accuracy denominator.

Independent reviewer reran all six focused tests and found no remaining issues
in this narrow patch. The first full gate caught the case inventory count still
expecting 45 after adding case 46; its exact counts now include the new partial
case. The complete gate rerun passes 171 fast files and 12 offline/mock DB files,
with four manual/helper skips. Three live administrative checks remain explicitly
not verified. `git diff --check` passes. Artifact SHA-256:
`4540522cb8c62e2473da9041f4b6fd17735025c29830b1d53f8547e1377d09d4`.

Battle audit passed its declared families, three golden fixtures and 4,500
matrix battles with zero JS errors (not complete-game reference parity).
Browser artifacts `artifacts/browser-replay-uSBjHY` contain two intentional
games, three paired captures, 15 compared turn rows, zero mismatched pairs and
zero page errors. Every game was downloaded; retained history was re-downloaded
after the swap. Field screenshot inspected for Tailwind, HP, faint/replacement
and residual rendering. Non-read network requests were blocked.

UI artifacts `artifacts/roster-ui-ZNRtdH` contain desktop/mobile Speed list
screenshots and six displayed stats. No simulations were started in this smoke.
The mobile screenshot exposes separate pre-existing roster text compression
and conflicting Unknown ruleset/LEGAL badges; these are open follow-up findings,
not approved UX. An initial smoke failed on startup navigation, then reran with
fresh cache/network-idle synchronization.

## Remaining Gates

No official ruleset approval, live DB write, deployment or 99% claim. Item and
ability Speed modifiers remain battle-engine responsibilities, not this starting
stat list. Mega transitions through every imported alias are not proved. Missing
abilities are not invented. Learnsets, combinations, complete-game parity and
live database isolation remain separate blockers.

Rollback: revert the scoped candidate commit and regenerate the bundle; never
alter historical exports or approve legality to hide a mismatch.
