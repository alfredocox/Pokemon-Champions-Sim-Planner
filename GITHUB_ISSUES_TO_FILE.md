# Deferred Engine Issues — Draft for Filing

Branch: `fix/champions-sp-and-legality`
Audit source: `ENGINE_AUDIT_REPORT.md`

All 8 issues below are NEW (verified against open list 2026-04-23).

---

## Issue 1 — [P0] [engine] Mega Evolution never activates — Mega forms are permanent from turn 1

**Labels:** `bug`, `P0`, `engine`, `gimmick`

### Description
Teams currently declare Mega forms (`Altaria-Mega`, `Charizard-Mega-Y`, etc.) as primary species names. The engine looks these up in `BASE_STATS` and treats them as ordinary Pokemon with Mega stats/types/abilities active from turn 1. This bypasses:
- Mega Stone consumption check
- Once-per-battle enforcement
- Pre-Mega speed tier for turn 1

### Files & Lines
- `engine.js:146` — `BASE_STATS` lookup uses species name verbatim
- `data.js:20, 26, 33, 36, 54–57` — Mega entries declared as primary
- No `megaEvolve()` function anywhere in codebase

### Expected
- Mega requires a compatible Mega Stone in `item` (see `CHAMPIONS_MEGAS` in `data.js`)
- On Mega-activation turn: stat line, ability, and types swap to Mega form
- Only one Mega per team per battle (`side.megaUsed` flag)
- Pre-Mega speed tier applies on turn 1 (Mega happens at end of turn 1)

### Actual
Mega form is the starting form. Mega Stone not required. No activation trigger.

### Fix Hint
```js
// In Pokemon constructor:
this.megaStone = data.item && CHAMPIONS_STONE_TO_SPECIES[data.item];
this.megaUsed = false;

// In turn end hook:
if (!this.megaUsed && !this.side.megaUsed && this.megaStone) {
  const megaData = CHAMPIONS_MEGAS[this.megaStone];
  Object.assign(this._base, megaData.megaBaseStats);
  this.ability = megaData.ability;
  this.types = megaData.types;
  this._calcStats();
  this.megaUsed = true;
  this.side.megaUsed = true;
}
```

### Acceptance
- Altaria holding `Altarianite` with pre-Mega ability `Natural Cure` becomes Altaria-Mega with `Pixilate` after first turn; loses team's Mega slot
- Altaria without `Altarianite` remains base Altaria
- Speed tier for Altaria (spe:80) applies on turn 1, Mega speed tier (still 80) on turn 2+

### Blocker For
`T9c-engine` — Champions Mega system implementation
`T12` — Mega ability golden test pack

### Refs
`ENGINE_AUDIT_REPORT.md` P0-1, `CHAMPIONS_MEGA_AUDIT_REPORT.md`

---

## Issue 2 — [P0] [engine] Unknown moves silently default to 60 BP — `BP_MAP` fallback hides missing data

**Labels:** `bug`, `P0`, `engine`, `move-data`

### Description
`engine.js:297` uses `let bp = BP_MAP[move] || 60;`. Any move not in `BP_MAP` silently becomes a 60 BP move instead of raising an error. This causes:
- `Tera Blast` → 60 BP (actual: 80 BP)
- `Sucker Punch` → 60 BP (actual: 70 BP)
- `Crunch` → 60 BP (actual: 80 BP)
- `Last Respects` → 60 BP (actual: scales with fainted allies)
- Status moves like `Recover`, `Encore`, `Will-O-Wisp` evaluated as 60 BP attacks

### Files & Lines
- `engine.js:297`

### Expected
Unknown moves should either:
- Log a single `console.warn` per move name per session AND treat as 0 BP, OR
- Cause validator rejection at team-load time

### Fix Hint
```js
const _missingBpLogged = new Set();
let bp = BP_MAP[move];
if (bp === undefined) {
  if (!_missingBpLogged.has(move)) {
    console.warn(`[engine] Unknown move BP: ${move} — treating as 0`);
    _missingBpLogged.add(move);
  }
  bp = 0;
}
```

### Acceptance
- Running a Bo5 across the full TEAMS catalog fires **zero** unknown-move warnings
- Any future team import with a novel move name surfaces a clear warning

### Refs
`ENGINE_AUDIT_REPORT.md` P0-4

---

## Issue 3 — [P0] [engine] `target.side`, `attacker.side` never populated — Tailwind / Reflect / Light Screen can't find sides

**Labels:** `bug`, `P0`, `engine`, `side-state`

### Description
Multiple code paths read `target.side?.reflect`, `target.flying`, `attacker.side.tailwind`, etc. None of these fields are ever set on Pokemon instances. Because optional chaining silently returns undefined, all side-scoped effects no-op:
- Reflect applied by one side does NOT halve physical damage on that side
- Light Screen does NOT halve special damage
- Tailwind cannot boost the holder's speed (also needs #T9 bug above)
- Levitate / Flying type ground immunity fails for Earthquake targeting logic

### Files & Lines
- `engine.js:305` (screens check)
- `engine.js:367–369, 374–375` (side reads)
- `engine.js:542` (Tailwind lookup in `selectMove`)

### Expected
Each Pokemon instance has `.side` pointing to `field.playerSide` or `field.oppSide`, and `.flying` derived from types + ability.

### Fix Hint
```js
// In simulateBattle after buildTeam:
for (const mon of playerTeam) {
  mon.side = field.playerSide;
  mon.flying = mon.types.includes('Flying') || mon.ability === 'Levitate';
}
for (const mon of oppTeam) {
  mon.side = field.oppSide;
  mon.flying = mon.types.includes('Flying') || mon.ability === 'Levitate';
}
```

### Acceptance
- Reflect applied by player halves physical damage dealt to the player's active mons
- Flying-type Corviknight is immune to Earthquake from its grounded ally
- Whimsicott Tailwind actually boosts ally speed (combined with Tailwind fix in Issue #7)

### Refs
`ENGINE_AUDIT_REPORT.md` P0-5

---

## Issue 4 — [P0] [engine] Spread moves hit only one target in doubles

**Labels:** `bug`, `P0`, `engine`, `doubles`

### Description
`executeAction` for spread moves (Earthquake, Heat Wave, Rock Slide, Dazzling Gleam, Hyper Voice, Surf, Muddy Water) applies `calcDamage` once to `action.target` with the 0.75× spread modifier. This is strictly worse than single-target damage and fundamentally breaks doubles balance.

### Files & Lines
- `engine.js:354–357` (executeAction spread branch)
- `engine.js:731–737` (spread flag lookup)

### Expected
Spread moves should hit all valid targets with per-target:
- Type effectiveness
- Ability trigger (e.g. Flash Fire on ally Heat Wave)
- Immunity check (Levitate, Flying for Earthquake)
- Individual damage roll

Rock Slide / Heat Wave / Hyper Voice / Dazzling Gleam: both enemies only.
Earthquake / Surf: both enemies + grounded ally.

### Fix Hint
```js
if (isSpread(move)) {
  const targets = getSpreadTargets(move, attacker, field);
  for (const target of targets) {
    applyDamage(attacker, target, move, { spreadMod: 0.75 });
  }
}
```

### Acceptance
- Earthquake in doubles damages both opposing Pokemon AND the user's grounded ally
- Earthquake hits zero Flying opponents
- Rock Slide can flinch up to 2 targets independently (pending flinch issue #19)

### Refs
`ENGINE_AUDIT_REPORT.md` P0-6

---

## Issue 5 — [P0] [engine] Critical hits are not implemented

**Labels:** `bug`, `P0`, `engine`, `damage`

### Description
No crit roll anywhere in `calcDamage`. Critical hits should occur at ~1/24 base rate (Gen 9), deal 1.5× damage, ignore positive defense boosts on target and negative attack boosts on attacker, and high-crit moves (Night Slash, Stone Edge, Slash, Cross Chop) have increased rates.

### Files & Lines
- `engine.js` — entire `calcDamage` body lacks crit logic

### Expected
After computing base damage:
```js
const critChance = HIGH_CRIT_MOVES.has(move) ? 1/8 : 1/24;
if (rng() < critChance) {
  // Recompute damage ignoring positive def boosts / negative atk boosts
  dmg = Math.floor(dmg * 1.5);
  log.push(`A critical hit!`);
}
```

### Acceptance
- Over 1000 Fake Out uses, ~42 are crits (1/24)
- Night Slash crit rate ~125 per 1000 (1/8)
- Crit damage ignores target's Reflect/Barrier boosts

### Refs
`ENGINE_AUDIT_REPORT.md` P0-7

---

## Issue 6 — [P1] [engine] Tailwind does not double effective speed

**Labels:** `bug`, `P1`, `engine`, `speed`

### Description
`getEffSpeed` only handles Trick Room inversion. Tailwind decrements a turn counter but has no effect on move order.

### Files & Lines
- `engine.js:256–260` (`getEffSpeed`)

### Expected
When `mon.side.tailwind > 0`, effective speed = `spe * 2`.

### Fix Hint
```js
function getEffSpeed(mon, field) {
  let spe = getStat(mon, 'spe');
  if (mon.side && mon.side.tailwind > 0) spe *= 2;
  if (field.trickRoom) return -spe;
  return spe;
}
```

### Dependencies
Requires #3 (side-state plumbing) to be fixed first.

### Acceptance
- Whimsicott (base spe 116) under Tailwind outspeeds 252+ Jolly Dragapult (spe 142) → effective 232 vs 142
- Tailwind effect expires after 4 turns (counter already exists)

### Refs
`ENGINE_AUDIT_REPORT.md` P1-1

---

## Issue 7 — [P1] [engine] Leftovers recovery and stat-stage reset on switch-in unimplemented

**Labels:** `bug`, `P1`, `engine`, `items`, `state`

### Description
Two related correctness bugs bundled (both state-machine / end-of-turn hygiene):

**(a) Leftovers:** End-of-turn loop has no healing branch. Holders never gain 1/16 maxHp per turn.

**(b) Stat stages leak across switches:** When a KO'd mon is replaced via `replaceOnField`, the replacement inherits the slot's `statBoosts` object instead of entering at +0/+0.

### Files & Lines
- `engine.js:841–862` (end-of-turn loop; needs Leftovers branch)
- `engine.js:868–884` (`replaceOnField`; needs statBoosts reset)

### Expected
**(a)** At end of turn, each alive mon holding `Leftovers` heals `ceil(maxHp/16)`.
**(b)** `replacement.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };`

### Acceptance
- Rotom-Wash holding Leftovers heals 1/16 per turn while alive
- Intimidate drop on a slot does not persist after the slot's occupant KOs and is replaced

### Refs
`ENGINE_AUDIT_REPORT.md` P1-2 + P1-9

---

## Issue 8 — [P1] [engine] 4 new Champions abilities + 3 updated abilities need engine hooks

**Labels:** `enhancement`, `P1`, `engine`, `abilities`, `champions`

### Description
Champions introduces new and updated abilities. None have engine implementations:

### New abilities (need onModifyDamage / onMoveHit hooks)
| Ability | Holder | Effect |
|---|---|---|
| Piercing Drill | Excadrill-Mega | Contact moves bypass Protect 25% of the time |
| Dragonize | Feraligatr-Mega | Normal → Dragon +20% BP |
| Mega Sol | Meganium-Mega | Personal sun (no field weather, but solar moves full power) |
| Spicy Spray | Scovillain-Mega | On taking damage: 30% burn attacker |

### Updated abilities (existing names, new behavior)
| Ability | Change |
|---|---|
| Unseen Fist | Now 25% Protect bypass (from 100%) |
| Parental Bond | Child hit reduced to 1/4 power (from 1/2) |
| Protean | Once per switch-in (not unlimited) |

### Files & Lines
- `engine.js` — no `ABILITIES` registry exists anywhere
- `data.js:3101–3110` — new abilities declared with holder + effect tag for dispatch
- `data.js:CHAMPIONS_MEGAS` — `abilityIsNew` and `abilityIsUpdated` flags ready for engine consumption

### Fix Hint
Create `ABILITIES` registry in `engine.js` with lifecycle hooks:
```js
const ABILITIES = {
  'Piercing Drill': {
    onModifyProtect(attacker, target, move) {
      if (move.contact && rng() < 0.25) return true; // bypass
    }
  },
  'Dragonize': {
    onModifyMove(move) {
      if (move.type === 'Normal') {
        move.type = 'Dragon';
        move.bp = Math.floor(move.bp * 1.2);
      }
    }
  },
  // ... etc
};
```
Wire into `calcDamage`, `executeAction`, and Protect resolution.

### Acceptance
- Mega Feraligatr's Return becomes Dragon-type with +20% BP
- Mega Excadrill Earthquake lands 25% of the time into a Protected target
- Mega Meganium's Solar Beam fires in one turn regardless of field weather
- Mega Scovillain burns 30% of attackers that successfully damage it
- Urshifu (Unseen Fist) Wicked Blow breaks Protect only 25% of the time (was 100%)

### Refs
`ENGINE_AUDIT_REPORT.md` P1-10, `CHAMPIONS_MECHANICS_VERIFICATION.md`, `CHAMPIONS_ABILITY_MATRIX.json`

---

## Filing plan

Once user approves this draft list, file with `gh issue create` in this order:
1, 2, 3, 4, 5, 6, 7, 8

Each gets labels per the table and a link back to the audit report. Do NOT attach PR Refs until PR is open.
