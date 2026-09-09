# PP, Pressure And Replay Validation - 2026-09-02

## Decision

The declared PP/Pressure boundaries are regression-covered locally. The complete-game and browser fixtures are useful release evidence, but they do not establish universal Pokemon or Champion accuracy.

## Mechanics Evidence

- Engine `1.1.5` stores move PP on the stable Pokemon record, so switching and replacement cannot transfer the resource to another roster slot.
- Ordinary use consumes one PP. One or two applicable opposing Pressure abilities add one PP each, including the pinned spread-move comparison. Full paralysis, flinch, mid-turn Taunt, Throat Chop and Imprison denial occur before PP consumption, matching the pinned Showdown `BeforeMove` ordering.
- Last-PP and all-moves-empty paths select Struggle through the existing damage, recoil and faint lifecycle.
- `generated/champions_move_overrides.js` records 103 effective PP differences from pinned `pokemon-showdown@0.11.11`; the generator is deterministic and the bundle includes the artifact.
- Focused PP tests pass 11/11 and complete-game tests pass 4/4. The complete-game fixture includes forced replacement and agrees with the reference on winner, turn count, final HP, stat stages and PP; an injected non-terminal local result is rejected.

## Replay Evidence

- Replay rendering preserves ordered action, status, damage, miss, switch and field events instead of reconstructing a damage-only story. Resolved actions retain stable actor identity and exact log position, including identical mirror species/moves and two-turn charge actions.
- Tailwind duration and mid-turn Speed-order validation use the recorded live field state.
- The final v142 browser proof contains one three-turn retained game from a live local Bo3 series. Its visible capture and exported log match on all three turns with zero observable-field mismatches, and the browser console has no warnings or errors. An earlier seven-turn Bo1 pair remains separate historical evidence.

## Broader Stress Gate

The cross-format invariant harness completed 4,624 battles: zero state failures, zero strict validator errors, zero audit warnings and zero deterministic replay failures. All 4,624 runs are warning-free in this declared harness (100%). Structured event identity now resolves mirror-name no-valid-target actions without guessing from duplicated narrative text. This denominator measures state, identity, export and determinism invariants; it is not a complete-game mechanics oracle or a claim of universal Pokemon accuracy.

The harness is regulation-drift-aware through `accuracy_harness_manifest.json`; the battle matrix remains a shared-mechanics sweep, not regulation-specific parity proof. Its zero-warning budget fails the command on any warning, and catalog version, review state, promotion state or format-lane drift fails closed. A new or changed regulation must be deliberately added with an evidence lane before CI can accept it; source-review regulations cannot silently become runnable competitive formats.

## Open Boundaries

- Disable, Encore, Spite, Grudge and other PP-changing interactions.
- Global residual ordering and residual Speed/tie ordering.
- Wider imported-team, item, ability, form and move cross-products.
- More complete-game differential fixtures and official Champion-specific confirmation.
- Hosted CI and a Pages candidate. The live database gate is verified blocked until protected staging hardening and owner-scoped persistence exist.
