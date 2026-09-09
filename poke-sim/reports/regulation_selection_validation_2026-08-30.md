# Regulation Selection Validation - 2026-08-30

Scope: local implementation, not a deployment or competitive certification. Build `v2.2.134-regulation-preflight`; engine `1.1.2`.

## Implemented

- Shared, locally persisted regulation selection in Simulator and Set Editor; species-specific reference suggestions and optional unavailable choices.
- Nonmutating preflight of both teams, supported match mode, stats, moves, abilities, items and registered bring-four. Malformed imports and missing validator dependencies fail closed.
- M-A/M-B competitive execution blocked pending approved regulation-specific data. Custom practice is explicit and cannot produce trusted learning evidence.
- Selected regulation captured separately from each team's original registration. Missing registration is not replaced with an invented historical ID.
- Shared historical evidence policy and legacy validation wrapper no longer label an unapproved M-A package trusted. Stored raw evidence is retained, not deleted.
- Auxiliary threat/branch/Mega competitive analysis gates run before their caches. Synthetic targeted mechanics QA stays labeled noncompetitive.
- Engine bring selection resolves registered Mega display names through original roster slots. This fixes a selected slot-six Mega being replaced with an unselected filler. Matching Mega Stones are required by preflight.
- Blocked-run errors appear beside Simulator controls, not only in the hidden QA panel. One-series inspection option added. Local Roadmap entries describe both implemented work and remaining gates.

## Verification

- Regulation-selection regressions: 14 passing cases, including duplicate base/Mega/regional National Dex identities.
- Execution-gate regressions: 8 passing checks, no engine invocation for blocked paths.
- Participant identity: 12 passing seeded cases, including the slot-six Mega on both sides with original IDs/items and unchanged input, and registered base-name precedence over an earlier Mega runtime alias. Ambiguous aliases throw.
- Historical identity: 5 passing cases; complete unapproved M-A history remains quarantined. Hypothetical approved-package fixtures test cache isolation only, not shipped approval.
- Full-project gate and final browser checks are recorded at closeout below. Earlier failing gate outputs remain in ignored `artifacts/regulation-project-gate*.txt`; failures identified obsolete trust expectations and a legacy wrapper that still returned trusted policy. The wrapper was corrected, not bypassed.

Independent reviews found and drove fixes for broad-mirror false legality, missing-validator bypass, auxiliary execution gates, malformed sets, historical trust, invented original regulation, and Mega registered-name selection. These reviews are focused on this slice, not a whole-project clean bill of health.

## Browser Scope

Local preview only, bundled roster, no live DB configuration. Shared selection and unchanged editor fields were checked; M-B Run Selected was blocked with a visible explanation. No interactive battles, team swaps, imports or saved set edits were performed in this slice, so there are no new browser replay/download pairs. Headless simulation tests are not visual replay parity proof. Mobile layout and positive practice-run visual parity remain unverified here.

Desktop screenshots and DOM/check JSON are retained in ignored `artifacts/regulation-*.png`, `regulation-*-dom.txt` and `regulation-editor-checks.json`. Browser checks confirmed 103 reference move suggestions and two abilities for Incineroar in practice, 1,517 review species with unavailable choices enabled, and unchanged editor inputs across selections. A zero-sized checkbox caused by the CSS reset was fixed and retested; selected-regulation labels were shortened to fit the control. The completed milestone is visible after expanding its Done / Closed group. Selection persisted through page reload, and the final Roadmap summary explicitly reports M-A/M-B not verified.

## Local Closeout

- Full `npm test`: 140 fast files and 12 offline/mock DB files passed, retained in `artifacts/regulation-project-gate-release.txt`.
- After the final Roadmap wording update, Roadmap tests (11), release-manifest/artifact tests (5), and bundle load-order tests (2) passed again.
- Final bundle SHA-256: `72f3880a3fbeaffcf7ea1d4f6d5bff7c07a651403636700d8cd614ed316e0095`.
- Both independent reviewers cleared the focused remaining trust and registered-name collision findings; broader parity remains open.
- `git diff --check` passed; Git reported line-ending normalization warnings, not whitespace errors.
- Local preview: `http://127.0.0.1:8765/pokemon-champion-2026.html`. No public deployment, remote-repository alignment, live database gate or 99% accuracy claim is included.

## Still Open

1. Approved regulation-scoped species/forms/learnsets/abilities/items and joint restrictions, with official sources and package digests. No regulation is competitively certified by this change.
2. Database eligibility schema/promotion workflow, backend enforcement and live readback; see [the contract](../docs/REGULATION_CONTEXT_AND_ELIGIBILITY.md). No migration, secret access, DB writes, sync approval, push or deployment occurred.
3. Pinned Showdown disagreements: same-turn Tailwind reordering, Seismic Toss damage and Growl/Leer stages. Re-run and extend the differential suite after mechanics fixes; this slice does not close them.
4. CPA-13/14 visible replay action-order and Tailwind-duration gaps, plus older independent Strategy-context/coaching issues. The new gates do not certify every historical UI card or cache.
5. PR reconciliation, dependency-advisory/install-policy review, protected CI and deployed-artifact verification.

There is no measured basis for a 99% real-game accuracy claim. Passing tests cover their declared fixtures, not every competitive interaction.
