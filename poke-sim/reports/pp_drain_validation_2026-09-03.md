# Eerie Spell And Spite PP-Drain Validation

Date: 2026-09-03  
Scope: synthetic headless doubles mechanics, not regulation approval or universal game accuracy

## September 8 Correction

This historical result did not prove Substitute correctness. Its local Spite test
incorrectly expected Substitute to block the move; new pinned-reference probes
reproduced that error and further defense/secondary-effect disagreements. See
[current boundary work](pp_substitute_validation_2026-09-08.md). The original
one-turn PP comparison below remains narrower evidence, not clearance of those
interactions.

## Result

The local engine now uses one PP-drain helper for Eerie Spell and Spite. It clamps drain at zero, keeps PP on the registered Pokemon, emits exact before/after structured evidence, and records the affected move and requested/applied drain.

One deterministic doubles probe agrees with pinned `pokemon-showdown@0.11.11` for every move's post-turn current and maximum PP. In that probe, faster Alakazam and Jolteon act before slower Slowbro and Dusclops; Eerie Spell removes three additional PP from Psychic and Spite removes four additional PP from Thunderbolt.

## Regression Evidence

- `tests/showdown_reference_tests.mjs`: 19/19 reference contracts, including exact PP comparison for the new probe.
- `tests/pp_drain_move_tests.mjs`: four boundaries for zero clamp/evidence, no target move history, Protect and Substitute.
- `tests/fixtures/showdown_reference_probes.mjs`: retained canonical teams, actions and seed for independent reruns.

The full project, battle-audit and declared accuracy gates must pass on the final rebuilt artifact before this candidate is publishable.

## Limits

This does not establish that either move is legal in the current Pokemon Champions regulation. It does not cover Grudge, Disable, Leppa Berry restoration, called moves, switching after PP drain, complete-game usage, or visible/exported browser parity. Champion-specific behavior still requires approved official or in-game evidence.
