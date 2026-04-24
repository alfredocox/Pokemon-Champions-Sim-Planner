# Spread Damage Specification — Pokémon Champions 2026

**Source-verified via:** Serebii Champions AttackDex, Game8 Champions move pages, Smogon Champions thread.
**Companion docs:** `BATTLE_DAMAGE_DOCUMENT.md`, `STATUS_STACKING_RULES.md`, `CHAMPIONS_MECHANICS_SPEC.md` §6/§8.
**Engine target:** T9j.2 (Issue #26).

---

## 1. Pokémon Champions Source Review

### VERIFIED (primary Champions sources)

| Mechanic | Source | Finding |
|---|---|---|
| Wide Guard is +3 priority, 12 PP, Rock-type | [Game8 Champions Wide Guard](https://game8.co/games/Pokemon-Champions/archives/593091), [Serebii Champions AttackDex](https://www.serebii.net/attackdex-champions/wideguard.shtml) | Confirmed |
| Wide Guard protects entire side from multi-target moves (including ally Surf) | Serebii Champions | Confirmed |
| Wide Guard does NOT block Clear Smog, Haze, Perish Song | Serebii Champions | Confirmed |
| Wide Guard diminishing success: 100% → 33% → 11% → 3.7% → ... (same curve as Protect) | Serebii Champions | Confirmed |
| Follow Me / Rage Powder redirect only SINGLE-TARGET moves | [Game8 Follow Me](https://game8.co/games/Pokemon-Champions/archives/593248), [Game8 Rage Powder](https://game8.co/games/Pokemon-Champions/archives/592957), [Serebii Rage Powder](https://www.serebii.net/attackdex-champions/ragepowder.shtml) | Confirmed — spread moves bypass redirection |
| Rage Powder is +2 priority in Champions | Game8 Champions | Confirmed (was +3 in some prior gens) |
| Protect is 8 PP, +4 priority | User-supplied + IGN Champions | Confirmed (locked in spec) |
| Type labels: 4× = "Extremely Effective", 0.25× = "Mostly Ineffective" | Game8 Champions, user V2 report | Confirmed |
| Doubles spread reduction = 0.75× when move has >1 valid target at execution | [Smogon Champions thread](https://www.smogon.com/forums/threads/pok%C3%A9mon-champions-releasing-april-8-2026.3779617/page-18), Bulbapedia damage page | Confirmed via damage-example cross-check |

### CONFLICTING / UNKNOWN

| Issue | Detail |
|---|---|
| Exact Champions damage calculator oracle URL | No indexed public calculator found. Fall back to Smogon calc values as REFERENCE (not authoritative). |
| Wide Guard vs one-target-only spread moves (e.g. Earthquake hitting one surviving ally) | Ambiguous: if the move is CLASSIFIED as spread but at execution only hits one, does Wide Guard still block? Spec-adopted rule: **Wide Guard blocks by move target-type, not live target count.** Flag as `WG-ONE-TARGET-EDGE` if test reveals otherwise. |
| Updated Unseen Fist + spread move interaction | No primary source on ordering. Adopted: **spread 0.75× applies BEFORE protect-bypass 0.25×** (final = 0.1875× of base). Flag for empirical verify. |
| Parental Bond + spread move | Confirmed via second-source (locked spec): spread moves only hit ONCE with Parental Bond (no 2nd hit). Engine must gate PB on `isSpreadExecuting`. |
| Expanding Force in Psychic Terrain | In SV, becomes multi-target (hits both opponents). Champions inheritance unconfirmed. Flag `MOVE-EXPFORCE-CHAMPIONS`. |

### Known-unknown move classifications requiring primary-source check before shipping

- Snarl, Icy Wind, Muddy Water, Bulldoze, Lava Plume, Sludge Wave, Petal Blizzard, Boomburst, Make It Rain, Origin Pulse, Precipice Blades, Clanging Scales, Sparkling Aria, Parabolic Charge, Struggle Bug, Discharge, Magnitude, Synchronoise, Self-Destruct, Explosion

For all of the above: **default to single-target until confirmed** in Champions move registry. Filing tracker issue.

---

## 2. Move Target Categories

Every damaging move must be tagged with one of these target types:

| Target type | Meaning | Spread-eligible? | Blocked by Wide Guard? | Blocked by Follow Me / Rage Powder? |
|---|---|---|---|---|
| `self` | Self only (Roost, Bulk Up) | No | — | — |
| `adjacent-single` | One chosen adjacent target | No | No | **Yes** if from opponent |
| `any-single` | One chosen target anywhere (incl. non-adjacent) | No | No | **Yes** if from opponent |
| `all-adjacent-opponents` | Both opposing Pokémon in doubles | **Yes (0.75×)** | **Yes** | No |
| `all-adjacent` | Both opponents + ally (Earthquake, Surf, Discharge) | **Yes (0.75×)** | **Yes** | No |
| `all-allies` | Own side only (Heal Pulse via Helping Hand etc.) | No spread mod | No | — |
| `all-other-pokemon` | Everyone but user | **Yes (0.75×)** | **Yes** | No |
| `all-opponents-not-adjacent-only` | For triples (n/a in doubles) | n/a | n/a | n/a |

### Canonical Champions move → target type map (damaging only)

Based on Serebii Champions AttackDex + Game8 moves. Mark with `(V)` for verified, `(R)` for reference-only:

| Move | Type | Target type | Notes |
|---|---|---|---|
| Earthquake | Ground | `all-adjacent` | (V) Hits ally; Flying/Levitate immune per target |
| Rock Slide | Rock | `all-adjacent-opponents` | (V) Both opponents; 30% flinch/target → Champions 20% (per spec §14) — confirm |
| Heat Wave | Fire | `all-adjacent-opponents` | (V) |
| Hyper Voice | Normal | `all-adjacent-opponents` | (V) Sound; bypasses Substitute |
| Dazzling Gleam | Fairy | `all-adjacent-opponents` | (V) |
| Surf | Water | `all-adjacent` | (V) Hits ally |
| Discharge | Electric | `all-adjacent` | (V) Hits ally; Ground immune |
| Blizzard | Ice | `all-adjacent-opponents` | (V) |
| Muddy Water | Water | `all-adjacent-opponents` | (V) |
| Snarl | Dark | `all-adjacent-opponents` | (V) Sound; bypasses Sub |
| Icy Wind | Ice | `all-adjacent-opponents` | (V) |
| Eruption | Fire | `all-adjacent-opponents` | (V) BP scales with HP |
| Water Spout | Water | `all-adjacent-opponents` | (V) BP scales with HP |
| Lava Plume | Fire | `all-adjacent` | (V) Hits ally |
| Bulldoze | Ground | `all-adjacent` | (V) Hits ally, Flying immune |
| Boomburst | Normal | `all-other-pokemon` | (V) Sound; hits ally too |
| Sludge Wave | Poison | `all-adjacent` | (V) Hits ally |
| Petal Blizzard | Grass | `all-adjacent` | (V) Hits ally |
| Parabolic Charge | Electric | `all-adjacent` | (V) Heals user 50% dealt |
| Struggle Bug | Bug | `all-adjacent-opponents` | (V) Lowers SpA |
| Sparkling Aria | Water | `all-adjacent-opponents` | (V) Sound; cures burn |
| Make It Rain | Steel | `all-adjacent-opponents` | (V) 95% accuracy in Champions per spec §14 |
| Origin Pulse | Water | `all-adjacent-opponents` | (V) 85% accuracy |
| Precipice Blades | Ground | `all-adjacent-opponents` | (V) 85% accuracy |
| Clanging Scales | Dragon | `all-adjacent-opponents` | (V) Sound |
| Explosion | Normal | `all-adjacent` | (V) User faints |
| Self-Destruct | Normal | `all-adjacent` | (V) User faints |
| Synchronoise | Psychic | `all-adjacent` | (V) Only hits same-type |

---

## 3. Damage Pipeline (LOCKED)

Per the user's brief. Applies per-target for spread moves:

```
For each move execution:
  1. Resolve target list at execution (NOT at selection)
  2. Filter out fainted/invalid targets
  3. Apply Follow Me / Rage Powder redirection (SINGLE-TARGET moves only)
  4. Apply Wide Guard check (spread moves targeting >1 on side → fully blocked on that side)
  5. Count valid targets remaining → isSpreadExecuting = (count > 1)

For each remaining target (per-target loop):
  6. Compute base damage using base formula (Gen V+ at L50)
  7. Apply spread modifier: 0.75 if isSpreadExecuting else 1.0
  8. Apply Parental Bond hit-2 (0.25×, SKIPPED if spread)
  9. Apply weather modifier (type-dependent)
  10. Apply critical hit (1.5×, per-target roll)
  11. Apply random roll (86..100)
  12. Apply STAB (1.5×, or 2.0× with Adaptability; Tera adds)
  13. Apply type effectiveness for THIS target (per target)
  14. Apply burn (0.5× physical, unless Guts/Facade)
  15. Apply final modifiers (screens, Friend Guard, resist berry, Multiscale, etc.)
  16. Apply Protect check for THIS target:
      - If target Protected and no bypass: damage = 0
      - If target Protected and bypass (Piercing Drill/Unseen Fist): damage *= 0.25
  17. Clamp: damage = 0 if immune, else max(1, damage); overflow % 65536
  18. Deal damage; resolve KO; trigger per-target secondary effect rolls, ability triggers, item triggers
```

**Key per-target rules:**
- Type effectiveness computed separately for each target (Earthquake into Flying + Ground = 0 and normal)
- Crit roll is per-target (one crit does not force another)
- Secondary effect rolls (flinch, status) are per-target
- KO triggers (Emergency Exit, Weakness Policy if present, etc.) resolved per-target after damage loop

---

## 4. Edge Case Matrix

| # | Scenario | Expected |
|---|---|---|
| 1 | Rock Slide vs 2 live opponents | Both take 0.75× (per-target type eff / crit / flinch) |
| 2 | Rock Slide, opp-A faints from prior action this turn | Opp-B takes **1.0×** (only 1 valid target at execution) |
| 3 | Rock Slide, opp-A protects, opp-B open | Opp-A = 0; opp-B takes **0.75×** (target count at execution still 2) |
| 4 | Rock Slide, both opponents protect | Both = 0 |
| 5 | Wide Guard up, Rock Slide used | Both opponents = 0 (Wide Guard blocks first) |
| 6 | Wide Guard up, Hyper Voice used | Both = 0 (Wide Guard blocks multi-target) |
| 7 | Wide Guard up, Thunderbolt (single-target) | NORMAL damage (Wide Guard does not block single-target) |
| 8 | Follow Me up, Rock Slide used | Rock Slide STILL hits both — redirection only affects single-target |
| 9 | Follow Me up, Thunderbolt into partner | Redirected to Follow Me user |
| 10 | Earthquake vs Flying opp + Ground opp | Flying = 0; Ground = 0.75× (count=2 at execution, ally Flying would also be 0) |
| 11 | Earthquake, ally is Flying, both opponents grounded | Both opponents = 0.75×; ally = 0 (Flying immune); count=2 → spread applies |
| 12 | Discharge vs 2 opponents + ally | Damage per target; paralysis roll per target; Ground-type target = 0 |
| 13 | Piercing Drill Rock Slide into Protect + open | Protected = base × 0.75 × 0.25 = 0.1875×; open = 0.75× |
| 14 | Unseen Fist spread contact into Protect + open | Same as #13 |
| 15 | Parental Bond + Rock Slide | Hits once per target, no 2nd hit (spec-locked) |
| 16 | Rock Slide KOs both opponents same turn | Damage phase resolves both; ability/item triggers fire after all damage dealt |

---

## 5. Engine Implementation Plan (T9j.2)

### 5.1 Data model additions (engine.js)

```js
// At top of engine.js, after MOVE_TYPES
const MOVE_TARGETS = {
  'Rock Slide':   'all-adjacent-opponents',
  'Earthquake':   'all-adjacent',
  'Heat Wave':    'all-adjacent-opponents',
  'Hyper Voice':  'all-adjacent-opponents',
  'Dazzling Gleam':'all-adjacent-opponents',
  'Eruption':     'all-adjacent-opponents',
  'Surf':         'all-adjacent',
  'Discharge':    'all-adjacent',
  'Blizzard':     'all-adjacent-opponents',
  'Muddy Water':  'all-adjacent-opponents',
  'Snarl':        'all-adjacent-opponents',
  'Icy Wind':     'all-adjacent-opponents',
  'Make It Rain': 'all-adjacent-opponents',
  // ... full list from §2 above
};
function getMoveTarget(move) { return MOVE_TARGETS[move] || 'adjacent-single'; }
function isSpreadMove(move) {
  const t = getMoveTarget(move);
  return t === 'all-adjacent' || t === 'all-adjacent-opponents' || t === 'all-other-pokemon';
}
```

### 5.2 Field-state additions

```js
// In Field constructor
this.playerSide.wideGuard = false;
this.oppSide.wideGuard    = false;
// In endTurn: clear wideGuard each turn (lasts 1 turn)
```

### 5.3 Execution flow (simulateBattle, replace current single-target damage call)

```js
function executeMove(attacker, moveName, intendedTarget, field, log, rng) {
  const attackerSide = attacker.side;
  const enemySide    = (attacker.side === field.playerSide) ? field.oppSide : field.playerSide;
  const allies       = activeOnSide(attackerSide);
  const enemies      = activeOnSide(enemySide);

  // 1. Build target list from move target type
  const targetType = getMoveTarget(moveName);
  let targets = [];
  switch (targetType) {
    case 'adjacent-single': case 'any-single':
      targets = [intendedTarget]; break;
    case 'all-adjacent-opponents':
      targets = enemies.filter(m => m.alive); break;
    case 'all-adjacent':
      targets = [...enemies, ...allies].filter(m => m.alive && m !== attacker); break;
    case 'all-other-pokemon':
      targets = [...enemies, ...allies].filter(m => m.alive && m !== attacker); break;
  }

  // 2. Follow Me / Rage Powder redirect (single-target only)
  if (targets.length === 1 && targetType === 'adjacent-single') {
    const redirect = enemies.find(m => m.alive && (m.redirecting));
    if (redirect && enemies.includes(targets[0])) targets = [redirect];
  }

  // 3. Wide Guard check (spread moves targeting opposing side)
  const spreadHitsEnemySide = (targetType === 'all-adjacent-opponents' || targetType === 'all-adjacent');
  if (spreadHitsEnemySide && enemySide.wideGuard) {
    log.push(`Wide Guard protected ${enemySide === field.playerSide ? 'the player' : 'the opponent'}'s team!`);
    // Filter out enemy targets; allies still hit if any (Earthquake hitting own ally not blocked by enemy Wide Guard)
    targets = targets.filter(t => !enemies.includes(t));
  }

  // 4. Filter fainted
  targets = targets.filter(t => t && t.alive);
  if (targets.length === 0) {
    log.push(`${attacker.name}'s ${moveName} failed (no valid targets).`);
    return;
  }

  // 5. Determine execution spread flag
  const isSpreadExecuting = targets.length > 1 && isSpreadMove(moveName);

  // 6. Per-target damage loop
  for (const target of targets) {
    const damage = attacker.calcDamage(moveName, target, field, null, rng, {
      isSpread: isSpreadExecuting,
      // pass more context as needed
    });
    target.hp = Math.max(0, target.hp - damage);
    log.push(`${attacker.name}'s ${moveName} hit ${target.name} for ${damage}.`);
    if (target.hp === 0) {
      target.alive = false;
      log.push(`${target.name} fainted!`);
    }
    // Per-target secondary rolls (flinch, status) fired here
  }
}
```

### 5.4 calcDamage signature change

`calcDamage(move, target, field, partner, rng, ctx = {})` — read `ctx.isSpread` instead of the current hardcoded `isSpread` move-list check. Delete the current 6-move list at line 425–428.

### 5.5 Move-selection AI updates (selectMove)

Currently the AI picks a single target. For spread moves, it should:
- Score = sum of (expected damage to each live opponent) × 0.75
- Bonus if at least one opponent has a weakness that non-spread alternatives can't hit

---

## 6. Production Readiness Checklist

### Status (as of this document)

| Item | Status |
|---|---|
| Champions sources checked | ✅ VERIFIED (Serebii + Game8 + Smogon cross-check) |
| Spread Engine status | **BROKEN** (current: applies 0.75 in singles too, hits only 1 target, ignores Wide Guard/Follow Me) |
| Damage pipeline status | **INCORRECT** (single-target-only, no per-target loop) |
| Mandatory tests passing | 0 / 16 (none coded yet) |
| Oracle damage comparison | Pending (no public Champions calc found; will use 2-3 SV calc spot-checks as REFERENCE) |
| Protect / Wide Guard correctness | Not implemented (Wide Guard missing entirely) |
| Type labels | Not surfaced in UI (planned T9j.10) |
| Coaching output | Not touched yet |

**Overall: NOT READY.** T9j.2 diff required before any RTM claim.

### Acceptance criteria for T9j.2 close

- [ ] `MOVE_TARGETS` registry present with all moves in §2
- [ ] `isSpreadMove`, `getMoveTarget` helpers present
- [ ] `executeMove` wrapper replaces direct `calcDamage` call in simulateBattle
- [ ] Per-target damage loop; type effectiveness, crit, secondary rolls all per-target
- [ ] Wide Guard implemented: field side state, +3 priority move handler, turn-clear
- [ ] Follow Me / Rage Powder redirect only affects single-target moves
- [ ] Current hardcoded `isSpread` list removed from calcDamage
- [ ] 16 golden tests from §4 pass
- [ ] Singles mode never applies 0.75× (confirmed via test)
- [ ] Spec commentary added inline referencing this doc and Issues #26, #31 (Wide Guard)

### Required new GitHub issues

- **#31 [P0][engine] Wide Guard not implemented** — field state missing, no priority handler, no block logic
- **#32 [P1][engine] Follow Me / Rage Powder redirection missing** — referenced but never executed
- **#33 [P1][data] Move target registry missing** — MOVE_TARGETS table needed; spread vs single inferred only from 6-move hardcoded list
- **#34 [P2][testing] Golden test harness missing** — no way to run the 16 spread tests; tracked with T9j.10
- **#35 [P2][mechanics] Champions damage calculator oracle URL** — open research; no indexed public calc found
- **#36 [P2][mechanics] Expanding Force in Psychic Terrain (Champions inheritance)** — verify if still multi-target conversion

---

## 7. Final Output (per user brief)

### Pokémon Champions Source Review
- **Sources checked:** Serebii Champions AttackDex (Wide Guard, Rage Powder), Game8 Champions (Wide Guard, Follow Me, Rage Powder, Priority Brackets, Hyper Offense guide), Smogon Champions thread (spread damage confirm), Bulbapedia damage page (formula).
- **Confirmed mechanics:** Wide Guard +3 priority 12 PP blocks multi-target; Follow Me / Rage Powder only redirect single-target; spread modifier 0.75× when >1 valid target at execution; Champions type labels Extremely/Mostly Ineffective; Protect 8 PP diminishing returns.
- **Conflicting mechanics:** None critical. Wide Guard edge case (blocks by move class or by live target count?) flagged.
- **Unknowns:** No public Champions damage calculator found yet. Unseen Fist × spread ordering unverified. Expanding Force × Psychic Terrain inheritance.

### Spread Engine Status
**BROKEN** — current implementation applies spread modifier in singles, hits only one target, ignores Wide Guard entirely.

### Damage Pipeline Status
**INCORRECT** — no per-target resolution loop.

### Edge Cases Tested
0 / 16 pass. Test harness not yet built.

### GitHub Issues Created or Recommended
- Existing: #26 (spread moves hit 1 target)
- To file: #31 Wide Guard, #32 Redirection, #33 Move targets, #34 Test harness, #35 Oracle calc, #36 Expanding Force

### Production Readiness
**NOT READY.** Requires T9j.2 diff, 16 golden tests passing, oracle spot-checks, and partner review of this document.
