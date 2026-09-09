# Competitive Variation Validation - 2026-08-29

## Purpose

This sweep checks whether the simulator remains deterministic and internally valid across materially different competitive lineup policies. It is broader runtime evidence, not a claim of complete Pokemon Champions or Pokemon Showdown parity.

## Scope

- 34 runnable teams
- Every ordered team matchup
- 5 deterministic seeds per matchup and mode
- 4 modes: default doubles, role-aware doubles leads, alternate bring-four ordering, and default singles
- 23,120 completed battles

Each battle was rejected if it threw an exception, returned an invalid result shape, exposed non-finite HP in turn snapshots, or produced a different trace when a sampled seed and configuration were replayed.

## Results

| Mode | Battles | Wins | Losses | Draws | Average turns |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default doubles | 5,780 | 2,861 | 2,896 | 23 | 8.84 |
| Role-aware doubles | 5,780 | 2,811 | 2,951 | 18 | 9.33 |
| Alternate bring four | 5,780 | 2,830 | 2,908 | 42 | 6.30 |
| Default singles | 5,780 | 2,814 | 2,915 | 51 | 20.74 |

Aggregate checks:

- JavaScript/runtime exceptions: 0
- Invalid state snapshots: 0
- Sampled deterministic replay failures: 0
- Overall average turns: 11.30
- Timer resolutions: 1,399, concentrated in the longer singles branch

The different average battle lengths show that lineup policy changes the simulated battle paths. The sweep is not merely replaying one static lead and bring configuration.

## Mirror Fairness Follow-up

A separate 6,800-battle mirror sweep ran every one of the 34 teams against an identical copy for 200 seeds. The original 20-battle `fire_ice_fullroom` warning cleared at 98 wins and 102 losses, confirming that result was small-sample noise.

The aggregate decisive player-side win rate was 47.93%. `kevin_meta_sun` was the only team beyond the 40-60 review band at 74 wins, 120 losses, and 6 draws (38.1% decisive player-side wins). A second 1,000-battle SHA-256-derived seed family reproduced the signal at 402 wins, 579 losses, and 19 draws (40.98%). Another independent 1,000-battle deterministic seed family produced 409 wins, 573 losses, and 18 draws (41.65%).

This is now an open competitive-parity blocker. Likely investigation areas are side-ordered entry hooks, sequential move-selection RNG consumption, residual loops, and simultaneous-resolution behavior. The evidence does not yet identify which mechanism is causal.

## Mechanics Slice Added Before This Sweep

- Exact three/four-action Speed ties are grouped and shuffled with seeded RNG instead of randomizing inside a JavaScript sort comparator.
- Ability immunity now resolves before per-target spread accuracy in the proved Earth Eater mixed-target fixture.
- The affected golden battle retained its winner and turn count; its approved trace hash changed because the engine no longer consumes an accuracy roll for the immune target.

## Remaining Competitive-Parity Blocks

- Type-immunity and single-target accuracy-consumption boundaries
- Simultaneous residual KOs and simultaneous replacement requests
- Complete end-of-turn residual event ordering
- PP, Pressure, and Struggle integration
- Complete mechanics coverage for arbitrary imported teams
- Regulation M-B official evidence and Champion-specific deltas
- Mirror-match player/opponent side symmetry for the Kevin Meta Sun interaction surface

Random volume cannot close these items. Each requires a named oracle, deterministic boundary fixture, and regression test.
