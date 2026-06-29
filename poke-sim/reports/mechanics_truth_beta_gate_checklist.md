# Mechanics Truth Beta Gate Checklist

Purpose: define the broader mechanics truth gate that must stay explicit before wider public trust claims.

Status: open beta gate. This checklist is the inventory behind issue `#149`.

Champion-only source map: [`../docs/CHAMPION_MECHANICS_TRUTH_GATE_2026-06-29.md`](../docs/CHAMPION_MECHANICS_TRUTH_GATE_2026-06-29.md).

Scope guard: this is a Pokemon Champions mechanics gate. Non-Champion legacy mechanics may be named only as blocked/import-drift examples. They are not product scope and must not train trusted coaching data.

Current slice: `v2.2.33-status-lock-proof` extends the action-denial proof layer by grouping sleep, freeze, paralysis, flinch, confusion, Taunt, Imprison, Throat Chop, accuracy miss, no-valid-target, and consecutive Protect-family failure evidence into separate QA counters.

## Why this exists

The simulator already has strong coverage in several areas.

What still needs discipline is the long-tail inventory:

- which mechanics families are already proven
- which families are only partly proven
- which families still need explicit deterministic coverage
- which families also need replay and QA evidence, not just unit proof

This file turns "we should keep checking mechanics" into a concrete closure list.

## Closure rule

A family is only truly closed when all three are true:

1. deterministic engine tests exist
2. replay / turn-log / QA evidence can expose the mechanic clearly
3. the source-truth basis is documented using the Data Source Registry hierarchy

If one of those is missing, the family stays open.

## Current family map

### 1. Priority and turn-order stack

Status: mostly closed

Covered:

- priority brackets
- Trick Room ordering
- Tailwind ordering
- paralysis speed reduction
- Fake Out first-turn window
- Quick Guard
- Armor Tail
- Dazzling
- Queenly Majesty
- Psychic Terrain priority block

Keep watching:

- replay wording for blocked and failed priority actions
- more cross-family proof whenever a new blocker/suppressor enters the legal lane
- source-review status for any Reg M-B additions before they affect runtime or coaching

### 2. Field-state move failures

Status: partly closed

Covered:

- Taunt blocking status moves
- Imprison blocking shared moves
- Poltergeist failing into no item
- Psychic Terrain blocking grounded priority targets
- Quick Guard blocking positive-priority attacks except Feint
- structured `move-failure` `effect_events` for the first high-value failure gates: Throat Chop, Taunt, Protect-family consecutive failure, Substitute block, Prankster Dark immunity, Good as Gold, Imprison, accuracy miss, no valid target, and Poltergeist no item

Still open:

- explicit inventory of all move-failure reasons we surface in replay/QA
- proof that every remaining failure reason is visible enough for coaching and QA

### 3. Protect-family interactions

Status: partly closed

Covered:

- Protect consecutive fail logic
- Feint breaking Protect / Quick Guard
- King's Shield contact drop
- Spiky Shield contact damage
- Baneful Bunker contact poison
- Obstruct contact defense drop

Still open:

- broader replay transparency for shield-rider cause and HP/stat change evidence
- final audit of contact tagging on all relevant moves

### 4. Multi-effect damaging moves

Status: partly closed

Covered:

- damage plus status examples
- damage plus stat-drop examples
- self-boost after hit examples
- conditional secondary examples
- drain rules
- recoil rules

Still open:

- explicit family inventory for "damage + status + recoil/recovery/stat swing" stacks
- proof that turn-log exports expose all pieces in a player-readable way

### 5. Action denial and skipped turns

Status: partly closed

Covered:

- flinch application
- flinch skip
- paralysis full skip
- sleep / Rest / Sleep Talk flows
- freeze thaw and cap

Still open:

- consistent replay language for why the action was lost
- status/volatile tags on replay cards so QA can scan board state faster

### 6. Speed-control conversion

Status: open, but foundational labels exist

Covered:

- engine truth for Tailwind / Trick Room / speed order exports
- early tactical labels for reversal, neutralization, conversion, and deferred payoff

Still open:

- denominator-based Decision Opportunity Ledger
- coaching-grade conversion scoring
- branch-backed better-line comparisons

### 7. Switching, replacement, and board reset timing

Status: partly closed

Covered:

- stale-target retarget guard
- no-valid-target boundary fixes
- Fake Out reset on switch-in
- some pivot and trap interactions

Still open:

- broader replacement timing inventory
- more replay proof around why a target changed, failed, or disappeared

### 8. Replay and QA transparency

Status: open

Covered:

- damage_events
- effect_events
- qa_coverage_summary
- source/build metadata
- replay UI impact summaries can consume structured HP-loss and action-denial rows; v2.2.28 starts exporting structured move-failure rows so QA can challenge failed actions without parsing free text

Still open:

- complete player-facing explanation of field state, status, and volatile effects
- full reason visibility for HP loss, KO cause, and skipped actions
- easier board-state scanning in replay UI

### 9. Champion source hierarchy and ruleset poisoning guard

Status: open

Covered:

- Data Source Registry defines source tiers.
- Reg M-B source-review lane is documented separately from the implemented runtime lane.
- QA exports carry build/source metadata.

Still open:

- every mechanics-family closure should cite the source tier used
- replay/QA/coaching rows should keep ruleset ID and ruleset status visible
- review-only rows must stay out of trusted aggregate learning until promoted

## What should be worked next

Recommended order:

1. Replay and QA transparency for action denial, field state, and HP-loss reasons
2. Multi-effect move family inventory and export evidence audit
3. Field-state move-failure inventory
4. Switching/replacement timing inventory
5. Decision Opportunity Ledger on top of those proven mechanics
6. Ruleset/status guardrails for aggregate coaching so historical, review-only, and future implemented Champion lanes do not poison each other

## Approved runtime teams used for proof

Use `approved_runtime_team_test_matrix.md` to pick matchups that intentionally exercise the open mechanics families.

Current proof teams:

- `indeedee_hatterene_tr`: Psychic Terrain, priority blocking, redirection, Trick Room, Expanding Force
- `rillaboom_archaludon_balance`: Grassy Terrain, rain pressure, Tailwind, Electro Shot, Body Press
- `arboliva_seed_sower_balance`: reactive terrain, sustain, Terrain Pulse, healing evidence
- `pelipper_basculegion_rain`: rain offense, Swift Swim pressure, terrain-weather pivoting
- `kevin_meta_sun`: coached baseline sun team for matchup tuning and future saved-team version analysis

## What should not happen

Do not:

- close issue `#149` because a few targeted tests passed
- call the sim "fully accurate" without the family inventory
- teach coaching logic from mechanics that are not replay-visible
- aggregate learning data from mechanics that cannot yet be audited clearly

## Definition of done for issue #149

Issue `#149` can close when:

- every family above is labeled closed, partly closed, or intentionally deferred
- all open families have deterministic proof where claimed
- replay and QA evidence clearly expose the supported families
- Overview and release docs point to the same closure state
- source hierarchy and ruleset status are documented for every family that feeds coaching
