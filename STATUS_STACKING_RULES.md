# Status Stacking Rules — Pokémon Champions 2026

**Purpose:** defines which statuses can coexist on the same Pokémon, application rules, type immunities, and residual-damage tick order. Engine (`T9j.4` + `T9j.5`) and golden tests rely on this as the source of truth.

**Companion files:**
- `CHAMPIONS_MECHANICS_SPEC.md` §1 (per-status mechanics)
- `BATTLE_DAMAGE_DOCUMENT.md` (partner-facing reference)

---

## 1. Two-class model

Statuses fall into two **separate classes** and the coexistence rules depend on the class:

### Class A — Major status (non-volatile)

**ONLY ONE can be active at a time on a given Pokémon.**

| Major status | Code key | Notes |
|---|---|---|
| Burn | `burn` | Halves physical damage (unless Guts/Facade) |
| Paralysis | `paralysis` | Speed halved, 12.5% full-para (Champions) |
| Sleep (move-induced) | `sleep` | 1 turn guaranteed, 33% wake T2, forced T3 |
| Sleep (Rest) | `sleep_rest` | 3 turns exact, no early wake |
| Freeze | `freeze` | 25% thaw per attempt, forced T3 |
| Frostbite | `frostbite` | Halves special damage (Champions inherits) |
| Poison | `poison` | 1/8 max HP per turn |
| Badly Poisoned (Toxic) | `toxic` | N/16 max HP, ramps per turn, resets on switch |

**Rules:**
- Applying a major status to a mon that already has one **fails silently** (or displays "X is already [status]").
- Rest is an exception: **Rest wipes existing major status** and replaces with sleep_rest + full heal.
- Lum Berry / Pecha Berry etc. cure based on type match.
- Burning a Fire type, paralyzing an Electric type (via move), freezing an Ice type, poisoning a Poison/Steel type — **type immunities**, see §3.

### Class B — Volatile status (can stack)

**Any number can be active simultaneously, alongside one Class A major status.**

| Volatile | Code key | Persists on switch? | Residual damage |
|---|---|---|---|
| Confusion | `confused` | Cleared | No (self-hit damage) |
| Leech Seed | `leech_seed` | **Cleared** on switch | 1/16 max HP drain |
| Curse (Ghost) | `curse` | **Persists** | 1/4 max HP |
| Bound/Trapped | `bound` | Cleared | 1/8 max HP + can't switch |
| Salt Cure | `salt_cure` | **Persists** | 1/16 max HP (1/8 on Water/Steel) |
| Infatuation (Attract) | `infatuated` | Cleared | No |
| Taunt | `taunt` | Cleared | No |
| Encore | `encore` | Cleared | No |
| Disable | `disable` | Cleared | No |
| Torment | `torment` | Cleared | No |
| Perish Song | `perish` | **Persists** | Countdown, KO on 0 |
| Yawn | `yawn` | Cleared | No (pending sleep) |
| Substitute | `sub` | Cleared | No (blocks incoming) |
| Aqua Ring | `aqua_ring` | **Persists** | **Heals** 1/16 per turn |
| Ingrain | `ingrain` | **Persists** | **Heals** 1/16 per turn, can't switch |

**Self-restriction rules within Class B:**
- Can't be confused while already confused (fails or resets timer — varies by source; spec uses fail-if-active).
- Can't stack two Leech Seeds on same mon.
- Can't Curse the same target twice.
- Can't re-Taunt an already-Taunted mon.
- Substitute replaces existing Substitute only if mon has HP.

---

## 2. Full legal stacking matrix (worst-case combos)

### Example: what you CAN have on one Pokémon simultaneously

| Combo | Legal? | End-of-turn HP loss (% max HP) |
|---|---|---|
| Burn alone | ✅ | 6.25% |
| Poison alone | ✅ | 12.5% |
| Toxic turn 3 | ✅ | 18.75% |
| Toxic T3 + Leech Seed + Curse | ✅ | 18.75 + 6.25 + 25 = **50.0%** |
| Toxic T5 + Leech Seed + Curse + Bound + Salt Cure (W/S) | ✅ | 31.25 + 6.25 + 25 + 12.5 + 12.5 = **87.5%** (near-certain KO) |
| Poison + Leech Seed + Curse + Bound + Salt Cure | ✅ | 12.5 + 6.25 + 25 + 12.5 + 6.25 = **62.5%** |
| Burn + Curse + Leech Seed | ✅ | 6.25 + 25 + 6.25 = **37.5%** |
| Freeze + Curse + Salt Cure | ✅ | 0 + 25 + 6.25 = **31.25%** |
| Sleep + Leech Seed + Confused | ✅ | 6.25% (+ self-hit risk when waking) |
| Paralysis + Torment + Taunt + Confused | ✅ | 0% (pure action-denial stack) |

### What you CANNOT have simultaneously

| Combo | Why |
|---|---|
| Burn + Paralysis | Two Class A majors |
| Poison + Burn | Two Class A majors |
| Sleep + Freeze | Two Class A majors |
| Toxic + Poison | Same class, one replaces intent; second application fails |
| Confused + Confused | Self-restricted within Class B |
| Two Leech Seeds | Self-restricted within Class B |
| Two Curses | Self-restricted within Class B |

### Special cases

| Case | Behavior |
|---|---|
| Rest on burned mon | Rest wipes burn, applies `sleep_rest` 3 turns, full HP restore |
| Yawn on a mon that already has a major status | Yawn **fails** |
| Yawn ticks into sleep while target has been paralyzed in between | Yawn sleep fails if target has major when it resolves |
| Frozen mon hit by Fire-type move | Freeze cleared immediately (before damage) |
| Flame Orb / Toxic Orb | Self-applies burn / toxic end of turn if no major status |
| Guts + burn | +50% Atk, burn does NOT halve physical; burn residual still ticks |
| Facade + any major | ×2 BP; burn does NOT halve Facade damage even without Guts |
| Magic Guard (if present in Champions) | Immune to ALL residual damage (burn, poison, Leech Seed, Curse, Salt Cure, Bound, recoil, Life Orb) — but not direct HP loss from moves |
| Natural Cure switch-out | Cures Class A major on switch; does NOT cure Class B volatiles (they'd clear anyway except persistent ones) |
| Synchronize | When target applies a burn/para/poison to the Synchronize user, it reflects back to them (if not immune) |

---

## 3. Type-based immunity table

**Apply these BEFORE attempting to set the status.** If target is immune, application fails with "It had no effect!"

| Status | Immune types | Immune abilities |
|---|---|---|
| Burn | Fire | Water Veil, Water Bubble, Thermal Exchange, Comatose |
| Paralysis | Electric (from Thunder Wave and electric-source moves) | Limber, Comatose |
| Paralysis from any source | Electric type in Gen 6+ (blanket immunity) | Limber, Comatose |
| Sleep | — (no type immunity) | Insomnia, Vital Spirit, Sweet Veil (ally), Comatose |
| Freeze | Ice | Magma Armor, Comatose |
| Frostbite | Ice | Magma Armor, Comatose |
| Poison & Toxic | Poison, Steel | Immunity, Pastel Veil (ally), Comatose |
| Confusion | — | Own Tempo, Oblivious-via-Taunt (not confusion though) |
| Leech Seed | Grass | — (no ability blocks it specifically) |
| Attract | Same-gender or genderless | Oblivious |
| Powder moves (Sleep Powder, Stun Spore) | Grass | Overcoat, Safety Goggles (item — absent in Champions per spec?) |

**Field-level immunities:**
- **Misty Terrain** blocks ALL non-volatile status applications on grounded mons
- **Electric Terrain** blocks sleep application on grounded mons
- **Safeguard** blocks all major status applications on its side (5 turns)
- **Substitute** blocks most statuses from direct-contact moves

---

## 4. Residual damage tick order (end-of-turn)

Engine must apply these in **this exact order**. If the mon faints at any step, remaining steps do not fire on that mon.

```
1. Weather damage (Sandstorm, if applicable)
2. Future Sight / Doom Desire resolution
3. Wish heal
4. Major status damage:
   a. Burn (1/16)
   b. Poison (1/8)
   c. Toxic (N/16, N = turns active)
5. Leech Seed (1/16 drained; seeder heals after)
6. Curse (1/4)
7. Bound (1/8)
8. Salt Cure (1/16 or 1/8 on W/S)
9. Healing residuals:
   a. Aqua Ring (1/16 heal)
   b. Ingrain (1/16 heal)
   c. Leftovers (1/16 heal)
   d. Black Sludge (1/16 heal if Poison type, else 1/8 damage — absent in Champions launch)
10. Perish Song countdown
11. Sleep / Freeze turn counter decrement
12. Toxic counter increment
13. Bound counter decrement
14. Screen / Tailwind / Trick Room / Terrain / Weather turn counters
```

**Why this order matters:**
- Leftovers heals AFTER damage, so a burning mon at 1/16 HP eats the burn tick (KO) before Leftovers would save it. Correct.
- Leech Seed drains BEFORE Curse, so if Leech Seed KOs, seeder still gets the heal but Curse doesn't fire.
- Toxic counter increments AFTER damage applies — so a freshly-toxiced mon takes 1/16 turn 1, 2/16 turn 2, etc.

---

## 5. Engine implementation requirements (T9j.4 + T9j.5)

### Data model
```js
mon.status         // Class A: null | 'burn' | 'paralysis' | 'sleep' | 'sleep_rest' | 'freeze' | 'frostbite' | 'poison' | 'toxic'
mon.statusTurns    // turn counter for the Class A status
mon.toxicCounter   // N for Toxic damage calculation (resets on switch)
mon.volatiles      // Set<string> for Class B: {'confused', 'leech_seed', 'curse', 'bound', 'salt_cure', ...}
mon.volatileTurns  // { confused: 2, bound: 4, ... }  // per-volatile counter
```

### Status application helper
```js
function applyMajor(mon, newStatus, field) {
  // Already has major → fail (except Rest which clears first)
  if (mon.status && newStatus !== 'sleep_rest') return false;
  // Type immunity check
  if (newStatus === 'burn' && mon.types.includes('Fire')) return false;
  if ((newStatus === 'poison' || newStatus === 'toxic') &&
      (mon.types.includes('Poison') || mon.types.includes('Steel'))) return false;
  if (newStatus === 'freeze' && mon.types.includes('Ice')) return false;
  if (newStatus === 'paralysis' && mon.types.includes('Electric')) return false;
  // Ability/terrain/safeguard checks...
  // Apply
  mon.status = newStatus;
  mon.statusTurns = 0;
  if (newStatus === 'toxic') mon.toxicCounter = 1;
  return true;
}

function applyVolatile(mon, vol, turns) {
  if (mon.volatiles.has(vol)) return false;    // self-restriction
  // Grass immune to Leech Seed, type immunities...
  mon.volatiles.add(vol);
  mon.volatileTurns[vol] = turns;
  return true;
}
```

### Residual tick (T9j.4 core)
Single function `endOfTurnResiduals(mon, field, log)` that runs the 14-step sequence above, with a `mon.alive` check between each step.

---

## 6. Golden test additions

Add these to the 40-case regression pack (T9j.10):

| Test ID | Scenario | Expected |
|---|---|---|
| STACK-001 | Poison + Leech Seed + Curse on same mon, end of turn | HP loss = 12.5 + 6.25 + 25 = 43.75% |
| STACK-002 | Toxic T4 + Leech Seed + Bound + Curse + Salt Cure (non-W/S) | HP loss = 25 + 6.25 + 12.5 + 25 + 6.25 = 75% |
| STACK-003 | Burn + Leech Seed, mon at 1/16 HP, Leftovers held | Mon dies from burn tick BEFORE Leftovers heals |
| STACK-004 | Fire-type target hit with Will-O-Wisp | Status application fails, no burn |
| STACK-005 | Poison type target hit with Toxic | Status application fails |
| STACK-006 | Apply Burn to mon with Paralysis | Fails silently, paralysis retained |
| STACK-007 | Rest on burned mon | Burn cleared, sleep_rest applied, HP full |
| STACK-008 | Yawn applied, next turn target already has paralysis | Yawn sleep fails |
| STACK-009 | Misty Terrain active, try Thunder Wave grounded target | Fails |
| STACK-010 | Sleep + Confused + Leech Seed on same mon | Legal; all three tick correctly |
| STACK-011 | Toxic counter persistence through switch | Resets to 1 when same mon switches back in |
| STACK-012 | Curse persistence through switch | Retained |
| STACK-013 | Salt Cure persistence through switch | Retained |
| STACK-014 | Guts + Burn user's physical move | +50% Atk, no burn halving |
| STACK-015 | Facade + Burn | ×2 BP, no burn halving |

---

## 7. Open questions (Champions-specific, unresolved)

Add to `CHAMPIONS_MECHANICS_SPEC.md` §17:

1. **Frostbite immunity type** — inherited as Ice? Confirm in Champions.
2. **Safety Goggles availability in Champions** — determines whether powder moves can be blocked by item.
3. **Magic Guard presence in Champions roster** — if absent, skip implementation.
4. **Comatose / Truant interactions with Champions status pool** — confirm.
5. **Yawn persistence through switch** — does Yawn counter reset if the target switches?
6. **Toxic counter on Magic Guard holder** — ticks but deals 0 (for Venom Drench etc.)?
