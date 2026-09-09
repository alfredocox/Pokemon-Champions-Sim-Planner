# Regulation Context And Eligibility

Status: local UI/preflight implemented on 2026-08-30. Database eligibility packages are planned, not migrated or connected by this change.

## Plain Language

The regulation selector chooses a rulebook. It does not change the Pokemon you registered. A Pokemon's existence in Showdown does not prove that the selected rulebook allows it, its moves, its ability, or its item.

There are two separate questions: "Is this team allowed?" and "Does our simulator reproduce every relevant battle mechanic?" Passing the first cannot prove the second.

## Current Behavior

- One selected regulation is shared by Simulator and Set Editor and saved as a local preference. Unknown saved IDs remain unknown, never aliases for M-A.
- Selection does not rewrite registered members, items, stats or original regulation identity. Missing original registration remains missing.
- M-A and M-B both remain not verified for competitive execution. The broad mirror is not an approved regulation-specific eligibility package.
- Explicit Custom practice permits bounded doubles Bo1/Bo3 runs after structural, stat, reference move/ability, item and bring-four checks. Practice is experimental, not competitive evidence. It uses level 50 when a level was absent; the execution envelope records that policy.
- Suggestions in practice are reference-only, not claims of Champions eligibility. Show unavailable choices exposes review candidates without making them legal. Historical/current regulation default suggestions remain empty until verified.
- Preflight checks both teams before work starts, and checks the four selected registered members before each game. A missing validator blocks execution.
- Threat-response, Mega-trigger and forced-branch competitive analyses are gated before their caches. Targeted synthetic mechanics QA is explicitly noncompetitive.
- Complete historical provenance is necessary but insufficient for trusted learning. Shared evidence policy quarantines M-A historical results while its regulation data is unapproved. Existing raw evidence remains inspectable.
- The legacy `runtimePromotable` catalog flag does not certify competitive eligibility. No shipped profile has `regulationDataApproved: true`. Merely flipping that flag is not an acceptable source-promotion implementation.

## Future Database Contract

The separate [regulation-watch slice](../../docs/release/REGULATION_WATCH_2026-08-30.md) prepares private immutable review candidates and daily discovery. Its migration is not applied, its candidates are not eligibility packages, and it does not implement the approval/publication contract below.

Implement through reviewed migrations and a separate promotion workflow; do not scatter regulation arrays across Pokemon rows.

1. Versioned regulation definitions: canonical ID, revision, game/mode, effective dates, team-size/bring rules, clause configuration and authoritative source references. Effective date and database observation time are different fields.
2. Immutable eligibility packages: regulation revision, source snapshot/sync-run IDs, digest, completeness checks, review status and explicit approval audit. A sync observes changes; it must not auto-approve them.
3. Eligibility facts: package ID, entity kind and canonical entity/form ID, allowed/banned/unknown state, reason and source. Species-move and species-ability relationships require joint keys; a globally allowed move is not legal on every species. Combination restrictions need explicit rules and tests.
4. Release history: first-observed and first-available evidence belongs separately from regulation eligibility. Do not infer a release date from scrape time or current legality.
5. Read-only published snapshots: build the offline browser package from the exact approved DB package; compare counts, identities and digests. Unavailable or mismatched sources must produce not-verified, never silent success.
6. Run identity: include regulation revision, approved package digest, engine/build, selected participants and immutable team digests. Current envelopes record selected/original regulations and team digests; an approved eligibility package digest is still missing because no such package is implemented.

Use existing provenance storage rather than replacing the team schema for this UI change. New tables, RLS, grants, constraints, indexes, server-side enforcement, migration/readback and offline/online parity are separate acceptance gates. No live Supabase verification is claimed here.

## Promotion Acceptance

- Official Champions rules and eligibility evidence reviewed for the exact regulation; exceptions recorded, not inferred from a general-generation Showdown learnset.
- Every relevant species/form, item, ability, learnset relationship and combination has positive/negative fixtures, including transitions between regulations.
- Public clients cannot approve packages or write trusted evidence by supplying their own policy flags. Test this on the backend, not only in browser code.
- Replays and saved results retain their execution context when teams, formats or selections change.
- Competitive mechanics disagreements and visual replay discrepancies remain separate release blockers.

See [validation and remaining gaps](../reports/regulation_selection_validation_2026-08-30.md) and [per-run visual comparison workflow](VISUAL_REPLAY_AUDIT_WORKFLOW.md).
