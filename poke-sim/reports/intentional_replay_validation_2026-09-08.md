# Intentional Replay Evidence Audit

## Observed And Corrected

The fresh page automatically ran a default Bo3 series before the user's requested
Bo1 game. The result summary described one game but the replay list contained
four. Removed the startup bootstrap, leaving explicit simulation controls and
existing historical replay retention intact. This prevents unsolicited evidence
from being mixed with a user's intentional run.

Screenshot inspection then found dark replay backgrounds with dark light-theme
text, and mobile reserve names/status badges overflowing two narrow columns.
Replay surfaces now follow theme colors, reserves retain readable opacity,
headings wrap, and small screens stack reserve sections.

## Evidence

- Initial failure: `artifacts/browser-replay-dNrIY8`, four unexpected games.
  These four were not downloaded/paired; they are an explicit uninspected remainder.
- After intent fix: `artifacts/browser-replay-XoroxI`, two games, three pairs,
  21 paired turn rows, zero mismatches or page errors.
- After contrast fix: `artifacts/browser-replay-bjEIBY`, two games, three pairs,
  21 paired rows. Screenshot review caught the remaining mobile overflow.
- After mobile fix: `artifacts/browser-replay-bSuBso`, two games, three pairs,
  24 paired rows, zero mismatches/page errors/checked text overflows.
  Mobile light and desktop dark screenshots inspected. Earlier intermediate
  bundles still reported v153; they are not the immutable v153 commit artifact.
- Two source-contract intent regressions fail before/pass after the bootstrap
  removal. The browser test supplies behavioral evidence beyond that source check.

The local browser runner blocks non-read network requests. No live database
writes, production deployment or regulation approval are part of this batch.
Each successful run downloads both games and re-downloads the old game after a
team swap, preserving its original seed, execution provenance and turn log.

## Limits And Follow-Up

Independent review caught incomplete continuity checks and missing requested-team
binding in the first harness. The runner now compares the actual re-download and
checks all historical export fields, excluding only `exported_at` and
`qa_coverage_summary.generated_at`. It also checks selected/envelope/provenance
team IDs, regulation, format, Bo mode and actual swapped selections. Two pure
contract regressions reject changed identities, participants and opponent labels.
The first strict run (`browser-replay-etHAV5`) stopped on a newly generated QA
timestamp after one downloaded game and its downloaded continuity revisit; this
was a harness timestamp assumption, not changed battle evidence.

Final v154 browser capture `artifacts/browser-replay-PKVzKu`: two games, three
pairs, 12 paired rows, zero mismatches/page errors/checked text overflows. Light
and dark layouts checked at 1440 and 390 pixels. This is local candidate evidence.

After the roadmap rebuild, exact artifact SHA-256
`643a855b01c2ff49e35759a21e90671fef61964dd9666a28e5b236607432f661`
(11,481,377 bytes) was rerun: `artifacts/browser-replay-MOKYuU`, two games,
three pairs, 20 paired rows, zero mismatches/page errors/checked text overflows.
Starting-state desktop and mobile faint/reserve screenshots were inspected.
The independent reviewer confirmed both harness findings closed and both pure
contract tests passing. The coaching findings are separate and remain open.
Final project gate passed 167 fast and 12 offline/mock DB files, with four
manual/helper skips. These mock checks do not verify live database permissions.

Paired rows include continuity revisits, not additional unique battle turns.
Passing DOM comparisons does not prove mechanics, coaching, all accessibility
criteria, singles, imported teams or all device layouts. Calculated contrast is
diagnostic where ancestor gradients exist. Independently verify causal coaching
claims, broader imports/lead edits, and final candidate CI before closure.
M-B approval, unresolved official form mapping and live DB security remain open.
No 99% game-accuracy claim is supported by this audit.
