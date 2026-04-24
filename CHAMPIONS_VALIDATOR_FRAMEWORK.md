# Champions Validator Framework (v2 — queued for next T9j task)

Binding SYSTEM ROLE. Applies to all future T9j mechanic work (starting with the next ticket after T9j.6).

---

## Core principle

Pokemon Champions is **NOT identical to mainline Pokemon**. Never assume Smogon/mainline behavior unless flagged.

Confirmed differences in scope for future work:
- Status conditions modified (sleep, paralysis reduced effectiveness) — shipped in T9j.4/T9j.5
- Fake Out only works on first turn — to verify
- Protect has reduced PP — to verify
- Move effects explicitly defined and deterministic

---

## Engine model

Battle is an **EVENT-DRIVEN STATE MACHINE**, not a damage calculator.

Each move resolves into a `MoveResult`:
```
MoveResult {
  damage
  primary_effect
  secondary_effects
  side_effects
  item_triggers
  state_changes
}
```

---

## Move validation (mandatory before execution)

Validate in order:
1. Move exists in Champions move pool
2. Pokemon can legally learn the move
3. Move conditions are satisfied (e.g., Belch requires berry consumed, Sleep Talk requires sleep state)

If invalid → mark `INVALID`, do not execute.

---

## Move classification (flags)

Every move must carry flags from:
- `DAMAGE`
- `STATUS`
- `FIELD_EFFECT`
- `CONTACT`
- `SPREAD`
- `CONDITIONAL`
- `SELF_EFFECT`
- `ITEM_INTERACTION`
- `PIVOT`

---

## Item interaction (verified logic)

Example — **Knock Off** (CONFIRMED):
- Removes target's held item
- Deals increased damage if item is present
- Makes contact
- Item removal occurs during move resolution

---

## Item state system

Each Pokemon tracks one of:
- `ACTIVE`
- `CONSUMED`
- `REMOVED`
- `STOLEN`
- `SUPPRESSED`

Items are **not static**.

---

## Side effect engine

Each move evaluates three tiers:

1. **Primary effect** — guaranteed (status, stat change, field)
2. **Secondary effect** — chance-based
3. **Side effect** — recoil, healing, stat drops, item triggers
4. **Item-triggered effect** — berries, healing, survival items

---

## Event processing order (STRICT — verified safe model)

1. Move selection
2. Priority resolution
3. Speed order
4. Accuracy check
5. Immunity check
6. Protection check
7. **Pre-damage state checks** — conditional move logic (Avalanche, etc.), terrain / field effects
8. **Pre-damage item triggers** — resist berries
9. **Damage calculation** — Base Power → Atk/Def → STAB → type effectiveness → item modifiers → weather/terrain → spread modifier (0.75 if multi-target) → random factor
10. **Apply damage**
11. **Survival checks** — Focus Sash-type effects (if confirmed)
12. Apply primary effects
13. Apply secondary effects
14. **Item interaction moves** — Knock Off (remove item immediately), Trick/Switch
15. **Contact triggers** — Rocky Helmet, Pickpocket, ability-based effects
16. **Post-damage item triggers** — healing items, Shell Bell
17. Status cure items
18. **Pivot resolution** (CRITICAL — occurs AFTER all above steps)
19. End-of-turn effects

---

## Pivot move system

If a move has the `PIVOT` flag:

Execution order:
1. Resolve full move (damage + effects + item changes)
2. THEN switch out user

Rules:
- Pivot NEVER skips damage
- Pivot NEVER occurs before item interactions
- Contact effects trigger BEFORE switching
- Pivot cancels future interactions for that Pokemon

---

## Doubles system

- Two Pokemon active per side
- Spread moves deal ×0.75 damage
- Each target resolves effects independently
- Item triggers fire per target
- Pivot occurs AFTER all targets resolve

---

## Conditional move system

Moves check state BEFORE execution. Examples:
- If user was hit first (Avalanche, Revenge)
- If target already damaged (Focus Punch)
- If item consumed (Belch, Acrobatics damage)
- If status present (Sleep Talk, Wake-Up Slap)

If condition not met → move fails or changes behavior.

---

## Validation output (mandatory per move)

For each move produce:
- Move Valid: YES / NO
- Move Flags
- Pivot: YES / NO
- Contact: YES / NO
- Spread: YES / NO
- Item Interaction Type
- Conditional Trigger Met: YES / NO

---

## Risk flags (CRITICAL)

Every mechanic must be labeled:
- **CONFIRMED** — primary source (Game8/IGN/games.gg/Serebii/Bulbapedia with Champions callout)
- **ASSUMED** — carried from mainline but not yet validated in Champions
- **UNKNOWN** — no source either way

Always flag:
- Move not confirmed in Champions
- Item not confirmed
- Mechanic differs from mainline
- Any assumed multiplier or behavior

---

## Strict rules

- Never assume item persists after Knock Off
- Never apply item effects if removed or suppressed
- Never skip conditional logic checks
- Never execute pivot before full move resolution
- Never assume full mainline move pool exists

---

## Goal

Produce a deterministic competitive Champions simulation that:
- Accurately handles item removal and item state
- Correctly processes side effects
- Properly executes pivot mechanics
- Respects doubles mechanics
- Flags all uncertainty

This is a STATE MACHINE, not a calculator.

---

## Application to remaining T9j roadmap

| Ticket | Validator surface |
|---|---|
| T9j.8 (#27 Crits, #19 Flinch, #30 Abilities) | Step 13 (secondary effects), Step 15 (ability triggers), `CONFIRMED` vs `ASSUMED` labels on every ability |
| T9j.9 (#7 Tera) | Step 9 damage calc (STAB/type override), `CONFIRMED` labels on Champions Tera rules vs mainline |
| T9j.10 (#34 40-case golden pack) | Full validation output per case; all moves classified with flags + item state transitions |
| Future pivot/Knock Off/Trick work | Steps 14 + 18 ordering; `MoveResult` schema |
