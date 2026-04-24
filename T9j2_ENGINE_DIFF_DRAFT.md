# T9j.2 — Spread Damage Refactor: Engine Diff (DRAFT — AWAITING APPROVAL)

**Refs:** #26 (spread hits only 1), #31 (Wide Guard), #32 (Follow Me/Rage Powder), #33 (MOVE_TARGETS)
**Spec source:** `poke-sim/SPREAD_DAMAGE_SPEC.md` §2-§5, `CHAMPIONS_MECHANICS_SPEC.md` §4 priority, §14 notable move changes, §17A oracle reconciliation
**Rule reminder:** User said "run the changes through me" — this file is for review. Nothing committed or applied.

---

## Files Changed
1. `poke-sim/data.js` — **ADD** `MOVE_TARGETS` registry (~200 entries) after `MOVE_TYPES`
2. `poke-sim/engine.js` — refactor spread logic; add Wide Guard / Follow Me / Rage Powder state + handlers; per-target damage loop
3. `poke-sim/ui.js` — pass `format` option into `simulateBattle(..., {format: currentFormat})`

---

## 1) `data.js` — ADD MOVE_TARGETS registry

Inserted immediately after `const MOVE_TYPES = {...};` (line 3847):

```js
// ============================================================
// MOVE_TARGETS — Champions 2026 move target categories (T9j.2, Issue #33)
// ============================================================
// Categories:
//   'normal'             single target, redirectable by Follow Me/Rage Powder
//   'adjacent-foe'       same as 'normal' in this engine (no distance model)
//   'all-adjacent'       SPREAD — hits both foes + ally (doubles), foe only (singles)
//   'all-adjacent-foes'  SPREAD — hits both foes (doubles), foe only (singles)
//   'all-foes'           SPREAD — hits all living foes regardless of adjacency
//   'all-allies'         non-damaging boost/heal to allies
//   'self'               user only
//   'random-foe'         one random living foe, NOT redirectable
//
// Sources: Serebii Champions attackdex + Game8 Champions move pages
// (https://www.serebii.net/attackdex-champions/, https://game8.co/games/Pokemon-Champions/)
const MOVE_TARGETS = {
  // ---- All-adjacent (includes ally in doubles) ----
  'Earthquake':        'all-adjacent',
  'Magnitude':         'all-adjacent',
  'Surf':              'all-adjacent',
  'Discharge':         'all-adjacent',
  'Lava Plume':        'all-adjacent',
  'Explosion':         'all-adjacent',
  'Self-Destruct':     'all-adjacent',
  'Sludge Wave':       'all-adjacent',
  'Parabolic Charge':  'all-adjacent',
  'Bulldoze':          'all-adjacent',

  // ---- All-adjacent-foes (both enemies, doubles; single enemy, singles) ----
  'Rock Slide':        'all-adjacent-foes',
  'Heat Wave':         'all-adjacent-foes',
  'Blizzard':          'all-adjacent-foes',
  'Muddy Water':       'all-adjacent-foes',
  'Dazzling Gleam':    'all-adjacent-foes',
  'Hyper Voice':       'all-adjacent-foes',
  'Eruption':          'all-adjacent-foes',
  'Water Spout':       'all-adjacent-foes',
  'Snarl':             'all-adjacent-foes',
  'Icy Wind':          'all-adjacent-foes',
  'Make It Rain':      'all-adjacent-foes',
  'Glacial Lance':     'all-adjacent-foes',
  'Burning Jealousy':  'all-adjacent-foes',
  'Sparkling Aria':    'all-adjacent-foes',
  'Clanging Scales':   'all-adjacent-foes',
  'Origin Pulse':      'all-adjacent-foes',
  'Precipice Blades':  'all-adjacent-foes',
  'Diamond Storm':     'all-adjacent-foes',
  'Matcha Gotcha':     'all-adjacent-foes',  // also heals allies; damage path all-foes
  'Electro Drift':     'normal',              // actually normal, listed for completeness
  'Breaking Swipe':    'all-adjacent-foes',
  'Heavy Slam':        'normal',              // Paradox-era Multi-Attack is 1v1, not spread

  // ---- All-foes (regardless of adjacency) ----
  'Perish Song':       'all-foes',
  'Haze':              'all-foes',            // status, non-damaging
  'Clear Smog':        'normal',              // actually single-target — per Serebii
  'Rock Tomb':         'normal',

  // ---- All-allies (non-damaging heal/boost) ----
  'Helping Hand':      'all-allies',          // chooses one ally
  'Life Dew':          'all-allies',
  'Heal Pulse':        'normal',              // chooses one mon (can be ally)
  'Coaching':          'normal',              // single ally target

  // ---- Self ----
  'Protect':           'self',
  'Wide Guard':        'self',
  'Quick Guard':       'self',
  'Detect':            'self',
  'King\'s Shield':    'self',
  'Spiky Shield':      'self',
  'Baneful Bunker':    'self',
  'Swords Dance':      'self',
  'Dragon Dance':      'self',
  'Nasty Plot':        'self',
  'Calm Mind':         'self',
  'Bulk Up':           'self',
  'Coil':              'self',
  'Roost':             'self',
  'Recover':           'self',
  'Shore Up':          'self',
  'Shed Tail':         'self',
  'Substitute':        'self',
  'Rest':              'self',
  'Follow Me':         'self',   // applies redirect flag to self's side
  'Rage Powder':       'self',   // applies redirect flag to self's side
  'Tailwind':          'self',   // sets side flag
  'Trick Room':        'self',   // sets field flag
  'Sunny Day':         'self',   // sets field flag
  'Rain Dance':        'self',
  'Sandstorm':         'self',
  'Snowscape':         'self',
  'Light Screen':      'self',
  'Reflect':           'self',
  'Aurora Veil':       'self',
  'Imprison':          'self',
  'Encore':            'normal',

  // ---- Random-foe (NOT redirectable) ----
  'Outrage':           'random-foe',
  'Uproar':            'random-foe',
  'Petal Dance':       'random-foe',
  'Thrash':            'random-foe',

  // ---- Default: everything else = 'normal' (single target, redirectable) ----
  // (Explicit entries kept for clarity on all-common VGC moves)
  'Thunderbolt':       'normal',
  'Flamethrower':      'normal',
  'Ice Beam':          'normal',
  'Thunder':           'normal',
  'Hurricane':         'normal',
  'Moonblast':         'normal',
  'Shadow Ball':       'normal',
  'Psychic':           'normal',
  'Psyshock':          'normal',
  'Psychic Noise':     'normal',
  'Draco Meteor':      'normal',
  'Dragon Pulse':      'normal',
  'Dragon Claw':       'normal',
  'Dragon Darts':      'normal',   // multi-hit split handled in executeMove
  'Close Combat':      'normal',
  'Focus Blast':       'normal',
  'Vacuum Wave':       'normal',
  'Mystical Fire':     'normal',
  'Fire Fang':         'normal',
  'Fire Punch':        'normal',
  'Flare Blitz':       'normal',
  'Overheat':          'normal',
  'Ice Punch':         'normal',
  'Hydro Pump':        'normal',
  'Scald':             'normal',
  'Liquidation':       'normal',
  'Wave Crash':        'normal',
  'Aqua Jet':          'normal',
  'Flip Turn':         'normal',
  'U-turn':            'normal',
  'Knock Off':         'normal',
  'Foul Play':         'normal',
  'Dark Pulse':        'normal',
  'Crunch':            'normal',
  'Kowtow Cleave':     'normal',
  'Sucker Punch':      'normal',
  'Throat Chop':       'normal',
  'Darkest Lariat':    'normal',
  'Low Kick':          'normal',
  'High Horsepower':   'normal',
  'Stomping Tantrum':  'normal',
  'Earth Power':       'normal',
  'Scorching Sands':   'normal',
  'Power Gem':         'normal',
  'Head Smash':        'normal',
  'Iron Head':         'normal',
  'Flash Cannon':      'normal',
  'Electro Shot':      'normal',
  'Weather Ball':      'normal',
  'Solar Beam':        'normal',
  'Energy Ball':       'normal',
  'Sludge Bomb':       'normal',
  'Dire Claw':         'normal',
  'Scale Shot':        'normal',
  'Blood Moon':        'normal',
  'Extreme Speed':     'normal',
  'Shadow Sneak':      'normal',
  'Phantom Force':     'normal',
  'Last Respects':     'normal',
  'Air Slash':         'normal',
  'Fake Out':          'normal',
  'Super Fang':        'normal',
  'Feint':             'normal',
  'Parting Shot':      'normal',
  'Will-O-Wisp':       'normal',
  'Thunder Wave':      'normal',
  'Taunt':             'normal',
  'Sleep Powder':      'normal',
  'Spore':             'normal',
  'Hypnosis':          'normal',
  'Lunar Dance':       'self',
  'Ally Switch':       'self',
  // Dynamic targets (handled at runtime, Issue #36):
  'Expanding Force':   'normal',   // → 'all-adjacent-foes' when grounded user + Psychic Terrain
};

// Helpers
function getMoveTarget(moveName) {
  const t = MOVE_TARGETS[moveName];
  if (!t) {
    // Match existing BP_MAP warning pattern (Issue #24 tracking)
    if (typeof console !== 'undefined') {
      console.warn(`[MOVE_TARGETS] unknown move "${moveName}", defaulting to 'normal'`);
    }
    return 'normal';
  }
  return t;
}

function isSpreadMove(moveName) {
  const t = getMoveTarget(moveName);
  return t === 'all-adjacent' || t === 'all-adjacent-foes' || t === 'all-foes';
}
```

---

## 2) `engine.js` — 5 surgical changes

### 2a) Remove broken hardcoded `isSpread` detection in `calcDamage` (lines 424-428)

**BEFORE:**
```js
    // Doubles spread nerf
    const isSpread = (move === 'Earthquake' || move === 'Rock Slide' ||
                      move === 'Heat Wave' || move === 'Hyper Voice' ||
                      move === 'Dazzling Gleam' || move === 'Eruption');
    const spreadMod = isSpread ? 0.75 : 1;
```

**AFTER:**
```js
    // T9j.2 (Issue #26) — spread 0.75× applied by executeMove when >1 valid
    // target AND format is doubles. Pulled from ctx.isSpread rather than
    // inferred here so we have access to field/target-count state.
    const spreadMod = (field && field._ctx && field._ctx.isSpread) ? 0.75 : 1;
```

Why `field._ctx`: `calcDamage` signature is already fixed (`move, target, field, partner, rng`). Stashing `isSpread` on field avoids breaking all ~8 callers. Cleared per-target in the wrapper.

---

### 2b) `Field` init — add `_ctx`, Wide Guard flags, redirection flags

At the top of `class Field` / field construction (search `field.playerSide = ` area), add side-level flags. They already exist as objects — just add new fields + init.

**Add to `Field` constructor (line ~525, exact position shown in patch):**
```js
    // T9j.2 — spread context (set per-hit by executeMove, read by calcDamage)
    this._ctx = { isSpread: false };
    // T9j.2 (#31 Wide Guard) — per-side turn flag
    this.playerSide.wideGuard = false;
    this.oppSide.wideGuard    = false;
    // T9j.2 (#31 Wide Guard consecutive-use) — tracks straight-WG chain
    this.playerSide.wideGuardChain = 0;
    this.oppSide.wideGuardChain    = 0;
    // T9j.2 (#32 Follow Me / Rage Powder) — redirection target pointer
    this.playerSide.redirectTo = null;
    this.oppSide.redirectTo    = null;
    this.playerSide.redirectType = null;  // 'followMe' | 'ragePowder' | null
    this.oppSide.redirectType    = null;
```

In `Field.tick(log)` (end-of-turn upkeep), at the top, **clear turn flags**:
```js
  tick(log) {
    // T9j.2 — clear per-turn spread defense/redirect flags at end of turn.
    // Wide Guard chain counter only resets when a side uses something OTHER
    // than Wide Guard — that reset is handled in executeMove below.
    this.playerSide.wideGuard    = false;
    this.oppSide.wideGuard       = false;
    this.playerSide.redirectTo   = null;
    this.oppSide.redirectTo      = null;
    this.playerSide.redirectType = null;
    this.oppSide.redirectType    = null;
    // ... existing tick logic below unchanged
```

---

### 2c) Priority table — verify / add Follow Me, Rage Powder, Wide Guard, Quick Guard

Locate `getPriority(move)` (grep confirms it's used at line 881). Add entries:

```js
function getPriority(move) {
  const P = {
    'Fake Out': 3,
    'Extreme Speed': 2,
    'Aqua Jet': 1,
    'Shadow Sneak': 1,
    'Sucker Punch': 1,
    'Vacuum Wave': 1,
    'Quick Attack': 1,
    // T9j.2 (Champions priority, §4 of CHAMPIONS_MECHANICS_SPEC)
    'Wide Guard':  3,   // spec'd +3, verified Serebii
    'Quick Guard': 3,
    'Protect':     4,
    'Detect':      4,
    'Follow Me':   2,   // Champions rule, verified Game8
    'Rage Powder': 2,   // Champions rule (was +3 SV), verified Serebii — ORACLE-DIVERGENCE-3
    'Helping Hand': 5,
    'Ally Switch': 0,
  };
  return P[move] || 0;
}
```

*(If getPriority already exists with some of these values, this merges them — patch will surgical-add missing keys only.)*

---

### 2d) `executeAction` — replace single-target damage path with `executeMove` wrapper

**CURRENT** (lines 811-817):
```js
    // Regular damage
    if (!target || !target.alive) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      return;
    }
    const dmg = attacker.calcDamage(move, target, field, null, rng);
    applyDamage(attacker, move, target, dmg, field, log);
```

**REPLACE WITH:**
```js
    // T9j.2 (Issue #26) — per-target damage via executeMove wrapper.
    // Handles spread, Wide Guard, Follow Me/Rage Powder redirection,
    // per-target type eff, and format-aware 0.75× mod.
    executeMove(attacker, move, target, {
      allies, enemies, field, log, rng,
      format: (opts && opts.format) || 'doubles',
    });
    return;
```

**ADD new function** before `applyDamage` (line ~820):
```js
  // ============================================================
  // T9j.2 — executeMove: per-target damage resolution
  // Refs #26 #31 #32 #33
  // ============================================================
  function executeMove(attacker, move, intendedTarget, ctx) {
    const { allies, enemies, field, log, rng, format } = ctx;
    const targetCat = (typeof getMoveTarget === 'function') ? getMoveTarget(move) : 'normal';
    const isDoubles = (format !== 'singles');

    // Resolve valid targets by category.
    let targets = [];
    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);

    switch (targetCat) {
      case 'all-adjacent':
        // Doubles: both foes + ally; Singles: single foe
        targets = isDoubles ? [...liveEnemies, ...liveAllies] : liveEnemies.slice(0, 1);
        // Filter out Ground immunities for Earthquake-type handled by type chart (0× in calcDamage)
        break;
      case 'all-adjacent-foes':
        targets = isDoubles ? liveEnemies : liveEnemies.slice(0, 1);
        break;
      case 'all-foes':
        targets = liveEnemies;
        break;
      case 'random-foe':
        if (liveEnemies.length > 0) {
          const idx = Math.floor(rng() * liveEnemies.length);
          targets = [liveEnemies[idx]];
        }
        break;
      case 'all-allies':
        // Handled by special-case status paths (Life Dew / Helping Hand); fall through
        targets = intendedTarget ? [intendedTarget] : liveAllies;
        break;
      case 'self':
        targets = [attacker];
        break;
      case 'normal':
      case 'adjacent-foe':
      default: {
        let t = intendedTarget;
        // T9j.2 (#32) — redirection: single-target moves aimed at a side with redirectTo
        //   get rerouted to that side's redirector, subject to Rage Powder immunities.
        if (t && t.side) {
          const rTo   = t.side.redirectTo;
          const rType = t.side.redirectType;
          if (rTo && rTo.alive && rTo !== attacker) {
            let bypass = false;
            if (rType === 'ragePowder') {
              // Grass types, Overcoat, Safety Goggles bypass Rage Powder
              if (attacker.types.includes('Grass')) bypass = true;
              if (attacker.ability === 'Overcoat') bypass = true;
              if (attacker.item === 'Safety Goggles') bypass = true;
            }
            if (!bypass) {
              log.push(`${attacker.name}'s attack was drawn to ${rTo.name}!`);
              t = rTo;
            }
          }
        }
        targets = t && t.alive ? [t] : [];
        break;
      }
    }

    if (targets.length === 0) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      return;
    }

    // Protect check per target (for single-target non-spread)
    // For spread moves, Protect still blocks individually.
    const isSpread =
      targetCat === 'all-adjacent' ||
      targetCat === 'all-adjacent-foes' ||
      targetCat === 'all-foes';

    // T9j.2 (#31) — Wide Guard blocks spread moves aimed at that side, except
    // Clear Smog / Haze / Perish Song (all-foes status) — since Haze / Perish Song
    // are already category 'all-foes' and non-damaging, we only block DAMAGE spreads.
    // Keep 'all-foes' damaging spreads (Make It Rain) blockable.
    if (isSpread) {
      targets = targets.filter(t => {
        if (t === attacker) return true;           // self-hits never blocked
        const tSide = t.side;
        if (tSide && tSide.wideGuard) {
          log.push(`Wide Guard blocked ${move} on ${t.name}!`);
          return false;
        }
        return true;
      });
    }

    // If >1 valid target at execution AND format is doubles AND move is spread,
    // apply 0.75× via field._ctx read by calcDamage.
    const applySpreadMod = isSpread && isDoubles && targets.length > 1;

    // Miss check — single roll for whole move (VGC behavior: spread moves roll once)
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                      'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                      'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0,
                      'Rock Slide':0.90, 'Heat Wave':0.90 };
    const acc = ACC_MAP[move] || 1.0;
    if (rng() > acc) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      return;
    }

    log.push(`${attacker.name} used ${move}!`);

    // Apply to each target in speed order? VGC resolves spread damage in
    // one blast — we iterate in speed order so faints register correctly.
    const ordered = [...targets].sort((a, b) =>
      (b.getEffSpeed ? b.getEffSpeed(field) : 0) - (a.getEffSpeed ? a.getEffSpeed(field) : 0)
    );

    for (const t of ordered) {
      if (!t.alive) continue;
      // Protect check per-target
      if (t.protected) {
        log.push(`${t.name} protected itself!`);
        continue;
      }
      // Set spread context for calcDamage
      field._ctx.isSpread = applySpreadMod;
      const dmg = attacker.calcDamage(move, t, field, null, rng);
      field._ctx.isSpread = false;
      if (dmg > 0) {
        applyDamage(attacker, move, t, dmg, field, log);
      } else {
        log.push(`${move} had no effect on ${t.name}!`);
      }
      if (!attacker.alive) break;  // attacker fainted via recoil/LO
    }
  }
```

---

### 2e) Status move handlers — wire Wide Guard, Follow Me, Rage Powder state

Locate `if (STATUS_MOVES.has(move))` block (line ~692) and **ADD to the existing set** + handlers:

```js
    const STATUS_MOVES  = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail',
      // T9j.2 additions
      'Wide Guard','Follow Me','Quick Guard']);
```

**ADD inside the existing status move handler block** (after Tailwind, before existing body):
```js
      if (move === 'Wide Guard') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        // Consecutive-use diminishing returns (1/3 chain rule).
        const chainChance = (side.wideGuardChain === 0) ? 1.0 : Math.pow(1/3, side.wideGuardChain);
        if (rng() < chainChance) {
          side.wideGuard = true;
          side.wideGuardChain++;
          log.push(`${attacker.name} protected its team with Wide Guard!`);
        } else {
          side.wideGuardChain = 0;  // failed chain resets
          log.push(`${attacker.name}'s Wide Guard failed!`);
        }
        // Any side member using a non-WG move must reset the chain —
        // handled at top of executeAction below (see 2f).
        return;
      }
      if (move === 'Follow Me') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'followMe';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
      if (move === 'Rage Powder') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'ragePowder';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
```

Remove the existing `Rage Powder` entry from the STATUS_MOVES set that currently no-ops (it's already in the set and falls through).

---

### 2f) Wide Guard chain reset on non-WG use

At top of `executeAction`, after the protect-check, before status-move branch:

```js
  function executeAction(attacker, move, target, allies, enemies, field, log, rng) {
    if (!attacker.alive) return;
    if (!move) return;

    // T9j.2 — if the side uses ANY non-Wide-Guard move this turn, reset chain.
    // (Chain only grows on back-to-back successful Wide Guards by any member.)
    if (move !== 'Wide Guard') {
      const side = (allies === playerActive) ? field.playerSide : field.oppSide;
      if (side && side.wideGuardChain > 0) side.wideGuardChain = 0;
    }
    // ... rest of existing body
```

---

## 3) `ui.js` — pass format option

**Line 1154:**
```js
// BEFORE
const battle = simulateBattle(TEAMS[playerTeamKey], TEAMS[oppTeamKey]);

// AFTER
const battle = simulateBattle(TEAMS[playerTeamKey], TEAMS[oppTeamKey], { format: currentFormat });
```

Verify same change in `runBoSeries` and any `simulateBattle` call inside ui.js — search and thread `{format: currentFormat}` uniformly.

---

## What this does NOT touch
- Damage formula overall (stays 85-100 roll in engine for now — Issue #17 `MECH-ROLL-WINDOW` rolls into T9j.4 per your prior decision)
- Burn/poison/toxic residuals (T9j.4)
- Crits (#27 → T9j.8)
- Mega / Tera activation (#23, #7 → T9j.7/9)

---

## Test Plan — post-apply smoke (before commit)

1. **Rebuild bundle** via the space's rebuild command → verify size grows by ~4-6 KB.
2. **Open bundle in browser.** Load `player` vs `mega_altaria` in Doubles. Sim Bo3. Replay log must show:
   - Earthquake hitting both foes (2 damage lines, not 1)
   - Rock Slide hitting both foes
   - `[MOVE_TARGETS] unknown move "..."` warnings if any team uses a move not in registry (should be clean for loaded teams)
3. **Wide Guard check:** pick a team with Wide Guard user (if any) or manually add in Set Editor — confirm "Wide Guard blocked X on Y!" log lines when spread hits that side.
4. **Singles toggle:** switch to Singles, sim. Earthquake should hit only 1 target; no 0.75× damage reduction (damage ~33% higher than in doubles).
5. **Rage Powder immunity:** confirm Grass-type attackers ignore Rage Powder when present.

If any smoke fails, hold commit and iterate.

---

## Commit plan (after approval + smoke pass)

```
git add poke-sim/data.js poke-sim/engine.js poke-sim/ui.js \
        poke-sim/pokemon-champion-2026.html \
        poke-sim/CHAMPIONS_MECHANICS_SPEC.md
git commit -m "T9j.2 spread moves per-target + Wide Guard + Follow Me redirect

Refs #26 spread moves now hit all valid targets with format-aware 0.75x
Refs #31 Wide Guard side flag blocks spread with 1/3 consecutive-use rule
Refs #32 Follow Me and Rage Powder redirect single-target moves with
         Grass / Overcoat / Safety Goggles bypass for Rage Powder
Refs #33 MOVE_TARGETS registry with 8 target categories

Sources: Serebii Champions attackdex, Game8 Champions move pages
Spec: poke-sim/SPREAD_DAMAGE_SPEC.md, CHAMPIONS_MECHANICS_SPEC.md 17A"
git push
```

Then verify-and-close #26, #31, #32, #33 with work-shown comments citing:
- the new executeMove function + MOVE_TARGETS registry
- Serebii / Game8 URLs from SPREAD_DAMAGE_SPEC.md
- specific commit SHA
- remaining work deferred (dynamic Expanding Force → #36, golden tests → #34)

---

## Total Lines Changed (estimate)
- `data.js` +200 lines (MOVE_TARGETS registry + helpers)
- `engine.js` +160 lines, -8 lines (executeMove, Wide Guard/FM/RP handlers, field flags, priority updates)
- `ui.js` +1 line per call site (~3 sites)
- Rebuild → `pokemon-champion-2026.html` grows ~5 KB

**~370 line net change, all in one commit, fully source-cited.**
