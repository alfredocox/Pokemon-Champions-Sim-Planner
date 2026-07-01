# Legality 99 Target Plan

Last updated: 2026-07-01

This document defines what the project means by `true 99% legality` for Pokemon Champions. It is a closeout gate, not a marketing claim.

`100% legality` requires complete official or in-game verified proof for every legal and illegal Pokemon, form, Mega, move, Ability, held item, regulation rule, clause, mode, and timing boundary. We should not claim that until the full active regulation package is captured, versioned, tested, and replay/fixture validated.

`true 99% legality` means the app is safe enough to prevent known data poisoning and misleading public claims for the active shipped scope:

- every preloaded runtime team is either source-backed for the selected regulation or blocked from official ranking/learning modes
- the active regulation package has `regulation_id`, `ruleset_version`, effective dates, format scope, source tier, source pointer, and verification status
- unknown Champion legality returns `needs_verification`, never `verified`
- known illegal data is rejected with an explicit issue
- known legal and known illegal fixtures exist for the active regulation
- QA artifacts include `build_id`, `source_url`, `regulation_id`, `ruleset_version`, `engine_version`, sample size, legality status, and source gaps where applicable
- Team Lab/global rankings cannot use `needs_verification` teams in official scopes
- stale ruleset or engine evidence is visibly marked stale before rankings/coaching reuse it

## Evidence needed to approach true 99%

The next legality closeout pass needs source captures, not guesses:

- official Regulation M-B announcement or rule page URL
- in-game Regulation M-B rules screenshot or recording
- in-game eligible Pokemon list for the active regulation
- in-game legal form and Mega eligibility proof
- in-game legal held item and Mega Stone proof
- in-game move and Ability training/legal-selection proof where available
- one known legal team accepted by Pokemon Champions
- one known illegal team rejected by Pokemon Champions
- one stale or wrong-regulation team that the validator blocks or marks stale

If a source cannot prove a row, that row stays `needs_verification`.

## 99% legality gates

1. Source package gate: active regulation rows must be versioned and source-linked before promotion.
2. Runtime team gate: preloaded teams cannot enter official sim/ranking/learning lanes unless legality is verified or explicitly marked experimental.
3. Unknown data gate: missing Champion source rows must become `needs_verification`, not a silent pass.
4. Negative fixture gate: tests must include rejected illegal species/form/move/item/Mega cases.
5. QA artifact gate: exported proof must carry build/source/ruleset/regulation/sample metadata.
6. Data poisoning gate: Team Lab/global analytics cannot learn from unverified legality, untrusted imports, or unmapped teams.
7. Stale ruleset gate: engine/ruleset changes must mark old legality and leaderboard evidence stale.
8. Public UI claim gate: user-facing copy must say verified, needs verification, experimental, stale, or illegal instead of implying absolute truth.

## What this does not prove

- complete Pokemon Champions legality for every future regulation
- complete move or Ability legality for rows without Champion proof
- complete official ladder truth
- complete battle mechanic parity
- community or Showdown data as official Champion legality

Showdown, community resources, and meta reports can help find candidates and build test coverage. They cannot promote Champion legality without official, in-game, or replay-verified evidence.

## Immediate implementation target

The next implementation should build a `legality_evidence_package` flow:

- JSON/schema for source-captured regulation rows
- fixture files for known legal, known illegal, stale, and needs-verification teams
- validator tests that block illegal rows and keep unknowns as `needs_verification`
- Team Lab promotion checks that exclude illegal teams and route `needs_verification` teams to experimental scopes only
- Roadmap/QA artifact output that shows which source package and ruleset version were used

Implementation start: `legality_evidence_package.js` now defines the first package contract, package validation, derived regulation conversion, fixture evaluation, and promotion-readiness checks. Current tests use dev fixtures only; they do not claim real Regulation M-B legality. The next pass should replace or extend those fixtures with official/in-game captures from Pokemon Champions.

This is the path to a defensible 99% closeout. Anything less is a confidence label, not legality proof.
