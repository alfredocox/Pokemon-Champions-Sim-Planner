# Move Mechanics QA Closeout Plan

Last updated: 2026-07-01

This document defines what `test all moves` means for this simulator without overstating proof.

The simulator has two different move-trust layers:

1. **Move registry support**: every shipped move has source metadata and a local support status.
2. **Live mechanic-family proof**: exported QA artifacts prove that the browser actually executed representative mechanics such as Foul Play stat-source damage, drain healing, priority blocking, action denial, field duration, contact damage, and recovery.

A move is not fully trusted for coaching just because its registry row says `verified`. Coaching can only rely on the mechanic families that have live artifact evidence or must label the claim as missing targeted proof.

## Current status

| Layer | Current status | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Shipped move registry | 123 verified / 11 baseline / 0 incomplete across 134 moves | The current shipped move surface has local source metadata and no incomplete registry rows. | Baseline rows do not have sufficient local behavior proof and block broad parity claims. |
| Move rule trace | Present in fresh QA artifacts | Damage rows can expose stat source, modifiers, and fixed ruleset flags when the move occurs. | It does not prove every special stat-source move occurred in the sample. |
| Move/effect logic matrix | Present in turn logs and QA artifacts | Mechanics are grouped as proven, partial, or missing based on observed evidence. | Missing/partial families are QA targets, not automatic engine bugs. |
| Targeted QA sweep | Existing targeted configs cover many long-tail mechanics | Forced scenarios can prove specific mechanics without waiting for random sim coverage. | It still needs continuous expansion as new moves/regulations enter the app. |

## Required closeout families

These are the families that must be closed before move-related coaching should sound confident:

| Family | Representative mechanics | Current next proof target |
| --- | --- | --- |
| Damage math | STAB, type chart, crit, random roll, spread, weather, screen, item, stat stages | Keep regression tests and live damage rows green. |
| Non-standard stat source | Foul Play, Body Press, Psyshock-style defense targeting, ability modifier boundaries | Run targeted Foul Play, Body Press, Psyshock, and Foul Play/Pure Power guard proof. |
| HP effects | recoil, drain, direct recovery, HP cost, delayed recovery, residual drain, item recovery | Run targeted Giga Drain, Recover, Clangorous Soul/Shed Tail, Wish, Leech Seed, Leftovers/Sitrus proof. |
| Status/action denial | flinch, sleep, freeze, paralysis, confusion, Taunt, Imprison, Throat Chop | Run forced denial scenarios and confirm effect rows explain skipped actions. |
| Move failure/prevention | accuracy miss, no target, Protect decay, lock/prevention effects | Run forced miss/no-target/Protect decay scenarios and confirm structured failure rows. |
| Priority/prevention | priority ordering, Quick Guard, Psychic Terrain, Armor Tail/Dazzling/Queenly Majesty, Fake Out timing | Run Quick Guard/Fake Out, Psychic Terrain, and priority-ability blocker proof. |
| Field duration/speed control | Trick Room, Tailwind, weather, terrain, screen duration, expiration, reissue timing | Run Trick Room active/expired/reversal and Tailwind timing proof. |
| Contact/item/residual damage | Rough Skin, contact flags, recoil/contact damage, item residual, field residual | Keep contact audit at zero unknown physical moves and add item/residual proof. |
| Faint transparency | HP drops and faints point back to damage/effect rows | Keep unexplained faint and unexplained HP-drop counts at zero. |

## Broad all-move QA strategy

Do not brute-force all legal game trees in the browser. Use this sequence instead:

1. **Inventory**: list every shipped move and group it by mechanic family.
2. **Registry gate**: fail if any shipped move is `incomplete`; mark `baseline` as not coaching-safe.
3. **Representative proof**: force at least one scenario per mechanic family into targeted QA.
4. **High-risk move proof**: force known tricky moves directly, starting with Foul Play, Body Press, Psyshock, Trick Room, Protect-family moves, Fake Out, Quick Guard, Wish, Leech Seed, drain, recoil, and field-duration moves.
5. **Live artifact proof**: require QA artifacts to include the relevant counters before closing a family.
6. **Coaching boundary**: if a family is missing or partial, coaching must say the recommendation is not fully proven for that mechanic.
7. **Regression tests**: add local tests for any bug found by live artifacts before closing the issue.

## Immediate next slice

The next implementation slice should be `v2.2.94-move-qa-closeout-plan`:

- add this plan to Roadmap/source docs
- record that all-move QA means family-based proof, not exhaustive game-tree proof
- prioritize non-standard stat-source proof first because Foul Play damage trust was already questioned
- keep full Champion legality and global rankings out of scope

## Closeout rule

A move family can be marked `99% closed` only when:

- local regression tests pass
- at least one fresh live artifact proves the family counters
- the artifact has build ID, source URL, ruleset/version context, source gaps, and forbidden claims
- remaining risk is named

A move family can be marked `100% closed` only when every shipped move in the family has source-backed local tests and live artifact evidence, with no known Champion-specific source conflict.
