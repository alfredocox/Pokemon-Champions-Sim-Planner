# Team Review Clarity

Candidate v2.2.159-team-review-clarity; no mechanics/data-policy change.

## Findings And Fixes

The roster could display Unknown ruleset/HISTORICAL beside a green LEGAL badge.
The second badge trusted local validation and legacy `legality_status`, not
regulation approval. A dedicated renderer now distinguishes failed local checks,
SV compatibility, unverified legality, inferred sets and passed local checks.
Even a promoted ruleset with a valid set does not receive tournament approval
from this UI helper. Ruleset policy itself is unchanged.

On narrow mouse-device windows the Details button was full-width inside a
non-wrapping flex row, collapsing the Pokemon details to a single-letter column.
The mobile rule now wraps actual bring-pool rows as well as legacy roster rows.

## Verification

- Four focused badge tests pass. Independent reviewer confirmed this narrow
  patch with no findings; tests stub the policy provider, not full ruleset truth.
- `tools/audit-team-review-ui.mjs` checks the actual page at 1440/620/390/320px
  mouse layouts and a 390px touch layout. Each contains 16 team cards. Mouse
  layouts each check 96 roster rows; minimum text widths are 260/498/268/198px.
  Details opens successfully. Touch uses compact chips, so full-row assertions
  do not apply there. No page errors or games were generated.
- Artifacts: `artifacts/team-review-TdCOil`; the 390px mouse screenshot was
  inspected. The old screenshot is retained in `artifacts/roster-ui-ZNRtdH`.
- The first full gate caught an exact-string CSS test referencing only the old
  selector. Updated that test to require both selectors; full rerun passes 172
  fast files and 12 offline/mock DB files, four manual/helper skips. Three live
  administrative checks remain explicitly unverified. `git diff --check` passes.
  Bundle SHA-256: `eeef3c5f3f76037ddd625d8590caefc2e9d48388131a3ef2b92950a746e8f302`.
- Paired replay audit `artifacts/browser-replay-9u3ScP`: two intentional games,
  three actual download/visible pairs, 18 compared turn rows, no mismatch pairs
  or page errors. The field screenshot was inspected for Tailwind, spread
  damage, berry, recoil, status and faint/replacement rendering. This checks
  presentation/export consistency, not independent mechanics correctness.

Non-read browser requests are blocked. No production mutation, deployment,
regulation promotion or universal accuracy/UX claim.

## Remaining Gaps

Bring-four labels and out-of-bring rows have weak light-theme contrast. Compact
touch details/navigation need broader interaction checks. Other legality labels,
selectors, imports and coaching paths require independent review; this fix does
not prove all UI authority boundaries. Live database security remains unverified.

Rollback: revert this scoped UI candidate and regenerate the bundle. Do not
change ruleset approval to restore an old green label.
