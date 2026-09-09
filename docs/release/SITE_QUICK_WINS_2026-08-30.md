# Site Quick Wins

Owner: Experience Engineer; release review independent. Local candidate only.

## Scope

- Homepage cross-section actions now focus the destination panel. Arrow-key tab navigation keeps focus on tabs; invalid destinations do not move focus.
- Edit a Team goes directly to Set Editor, not the Teams list.
- The static homepage preview says No replay selected / Analysis pending instead of inventing a turn-four conclusion and lead advice. This remains a static placeholder, not a selected replay summary.
- Roadmap disclosures have native open/closed markers. Only the first blocked workstream starts open; other milestones remain available and retain their status.

These are bounded usability/evidence-presentation repairs, not completion of the full beginner audit or a mechanics fix. No battle behavior, team data, DB rows or regulation approval changed.

## Verification

Focused regressions failed before implementation for focus loss, invented preview content and four expanded blockers; they pass after the changes.

- Full project gate: 147 fast files and 12 offline/mock DB files passed; live DB checks were not run. Log: `poke-sim/artifacts/quick-wins-project-gate.txt`.
- Desktop browser: Start Team Test, Upload Replay and Edit a Team activate and focus the intended panel. No interactive simulations or team edits were performed.
- 390px-wide iframe using the actual local bundle: Edit a Team activates/focuses Set Editor; mobile section picker opens Roadmap; disclosures open/close and titles/statuses wrap without observed collisions. This is a narrow-layout check, not physical-device or screen-reader certification. Existing sticky-header/scroll ergonomics remain part of the broader audit.
- Native disclosure markers inspected in desktop and narrow-layout screenshots. Independent read-only release review found no actionable findings in this scoped change; generator bytes, manifest/cache identity and focused regressions passed.
- After recording quick wins in the shared roadmap, both roadmap artifacts and the bundle were regenerated; roadmap, accessibility, legacy overview, release, replay export and Pages checks passed again. Final artifact: `v2.2.137-site-quick-wins`, 11,452,349 bytes, SHA-256 `20274be913884b0b8d36083b9e238823f667fec9d6ba67fbd7fcd6aa5ca26194`.

No hosted CI, GitHub issue closure, commit, push, deployment or live database verification is claimed.

## Next Big Rock

Investigate the strict Showdown team-intake gap before claiming parity: missing explicit levels are unsupported inputs, not illegal teams. Preserve the Incineroar U-turn disagreement as a source discrepancy until reviewed evidence resolves it. The pinned mechanics probes and live release/DB gates remain open.

Fresh diagnostic run: `poke-sim/artifacts/showdown-reference/2026-08-30T23-46-31-064Z/report.json`. Five bounded probes completed: two agreements in declared comparisons and three mismatches (same-turn Tailwind, Seismic Toss, Growl/Leer stages). Zero completed reference games. Both pinned formats still report 33 unsupported bundled-team inputs and one rejection. The command intentionally exits 1 on disagreements; these are not passing mechanics gates or a game-accuracy percentage.

The [subsequent intake diagnosis](../../poke-sim/reports/showdown_intake_diagnosis_2026-08-30.md) corrected the explanation of those 33 unsupported inputs and fixed top-level status collapsing in the development reference runner. Its 18/18 contract checks pass. The full project gate passed again after that separate diagnostic patch; the final reference run retained the same three mechanics mismatches. Explicit normalization and learnset source alignment remain next, not completed.
