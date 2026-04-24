# T9j.3 — Screens + Turn Counters + Timer Draw — Engine Diff Draft

**Branch:** `fix/champions-sp-and-legality`
**Base:** `139f11c` (quick wins)
**Closes:** #37 (TR counter bug), #38 (Tailwind counter), #39 (timer-draw)
**Refs:** Champions field-effect pass (Screens was scoped in prior planning but no GH issue exists yet — noted below)

> **Rule check:** No em-dashes in commit message. Commit: `T9j.3 screens aurora veil timer draw and active turn counters`.

---

## Scope (bundled diff)

| Component | Source of truth | Files touched |
|---|---|---|
| Light Screen / Reflect setters + 5-turn counter | Gen 9 VGC standard | engine.js |
| Aurora Veil setter (gated on hail/snow at cast) + 5-turn counter | Smogon, Game8 | engine.js |
| Screens damage math: **exact 2732/4096 fraction in doubles, 2048/4096 in singles** | Smogon Research, Showdown source | engine.js |
| TR cumulative active-turn counter (#37) | n/a — bug fix | engine.js, ui.js |
| Tailwind cumulative active-turn counter (#38) | n/a — new metric | engine.js, ui.js |
| Timer-draw rule (#39): 7min team / 45s turn / 15s decision proxy / draw on tied Pokemon count | Official VGC 2026 rules | engine.js, ui.js |
| Series Summary UI: populate Avg TR / add Avg Tailwind row | n/a | ui.js |

**Out of scope:** Light Clay item (extends to 8 turns). Separate ticket proposed in T9j.6 item pass.

---

## Key fraction — why 2732/4096

Pokémon Showdown source `data/scripts.ts` applies screens via `Damage formula modifier` not a flat 0.5 multiply. In **doubles**, against any spread move (or single-target), the modifier is **2732/4096 ≈ 0.66699...** In **singles** it is **2048/4096 = 0.5**.

- 2732 / 4096 = 0.667236...
- 2048 / 4096 = 0.5 exactly

Using the exact integer fraction avoids floating-point drift and matches Smogon calc byte-for-byte.

```js
const SCREEN_MOD_SINGLES = 2048 / 4096;  // 0.5
const SCREEN_MOD_DOUBLES = 2732 / 4096;  // ~0.6670
```

---

## DIFF 1 — engine.js field state init (lines 501-512)

**Before:**
```js
this.trickRoom    = false;
this.trickRoomTurns = 0;
this.terrain      = 'none';
this.terrainTurns = 0;
this.playerSide   = { tailwind:false, tailwindTurns:0, reflect:false, lightScreen:false, auroraVeil:false,
  // T9j.2 (#31/#32) — Wide Guard turn flag + chain counter, redirect target
  wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null };
this.oppSide      = { tailwind:false, tailwindTurns:0, reflect:false, lightScreen:false, auroraVeil:false,
  wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null };
this._ctx = { isSpread:false };
```

**After:**
```js
this.trickRoom          = false;
this.trickRoomTurns     = 0;
this.trickRoomActive    = 0;  // NEW T9j.3 (#37): cumulative turns TR was active
this.terrain            = 'none';
this.terrainTurns       = 0;

// T9j.3 screens state per side: flag + remaining turns + cumulative active (for metrics).
// Turn length 5 (Light Clay extends to 8 — item pass).
this.playerSide = {
  tailwind:false, tailwindTurns:0, tailwindActive:0,        // T9j.3 (#38)
  reflect:false, reflectTurns:0, reflectActive:0,           // T9j.3 screens
  lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
  auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
  // T9j.2 (#31/#32) — Wide Guard turn flag + chain counter, redirect target
  wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null
};
this.oppSide = {
  tailwind:false, tailwindTurns:0, tailwindActive:0,
  reflect:false, reflectTurns:0, reflectActive:0,
  lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
  auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
  wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null
};
this._ctx = { isSpread:false };

// T9j.3 (#39) timer-draw: per-side clocks in milliseconds.
// Standard VGC 2026: 7 minutes team timer, 45s per turn.
// Batch sim has no real-time clock, so we model a fixed 15s decision time per turn
// as a deterministic proxy. This caps a battle at ~28 turns before timer expiry.
this.clockPlayer = 7 * 60 * 1000;  // 420000 ms
this.clockOpp    = 7 * 60 * 1000;
```

---

## DIFF 2 — engine.js `tick()` end-of-turn countdown (lines 515-548)

**Before:** (TR countdown + Tailwind countdown exist, Screens missing, no cumulative counters)

**After:**
```js
tick(logs) {
  // T9j.2 — clear per-turn Wide Guard + redirect flags at end of turn.
  this.playerSide.wideGuard = false;
  this.oppSide.wideGuard    = false;
  this.playerSide.redirectTo   = null;
  this.oppSide.redirectTo      = null;
  this.playerSide.redirectType = null;
  this.oppSide.redirectType    = null;

  // Weather countdown
  if (this.weather !== 'none' && this.weatherTurns > 0) {
    this.weatherTurns--;
    if (this.weatherTurns === 0) { logs.push(`The ${this.weather} subsided.`); this.weather = 'none'; }
  }

  // Trick Room countdown — T9j.3 (#37): increment cumulative BEFORE decrement
  if (this.trickRoom) {
    this.trickRoomActive++;
    this.trickRoomTurns--;
    if (this.trickRoomTurns <= 0) { this.trickRoom = false; logs.push('Trick Room returned to NORMAL!'); }
  }

  // Terrain countdown
  if (this.terrain !== 'none' && this.terrainTurns > 0) {
    this.terrainTurns--;
    if (this.terrainTurns === 0) { this.terrain = 'none'; logs.push('The terrain returned to normal.'); }
  }

  // Tailwind countdown — T9j.3 (#38): cumulative active counters both sides
  for (const [name, side] of [['Player', this.playerSide], ['Opponent', this.oppSide]]) {
    if (side.tailwind) {
      side.tailwindActive++;
      side.tailwindTurns--;
      if (side.tailwindTurns <= 0) { side.tailwind = false; logs.push(`${name}'s Tailwind ended.`); }
    }
  }

  // T9j.3 Screens countdown — Reflect / Light Screen / Aurora Veil
  // Standard duration: 5 turns. Light Clay item extends to 8 (item pass).
  for (const [name, side] of [['Player', this.playerSide], ['Opponent', this.oppSide]]) {
    if (side.reflect) {
      side.reflectActive++;
      side.reflectTurns--;
      if (side.reflectTurns <= 0) { side.reflect = false; logs.push(`${name}'s Reflect wore off.`); }
    }
    if (side.lightScreen) {
      side.lightScreenActive++;
      side.lightScreenTurns--;
      if (side.lightScreenTurns <= 0) { side.lightScreen = false; logs.push(`${name}'s Light Screen wore off.`); }
    }
    if (side.auroraVeil) {
      side.auroraVeilActive++;
      side.auroraVeilTurns--;
      if (side.auroraVeilTurns <= 0) { side.auroraVeil = false; logs.push(`${name}'s Aurora Veil wore off.`); }
    }
  }
}
```

---

## DIFF 3 — engine.js `calcDamage` screen modifier (lines 443-447)

**Before:**
```js
// Screen modifiers
let screenMod = 1;
if (isPhysical  && target.side?.reflect)    screenMod = 0.5;
if (!isPhysical && target.side?.lightScreen) screenMod = 0.5;
```

**After:**
```js
// T9j.3 Screens modifier — exact Gen 9 fractions.
// Singles: 2048/4096 = 0.5. Doubles: 2732/4096 ≈ 0.6670.
// Aurora Veil: applies to BOTH physical and special, overrides Reflect/LS stacking.
// Critical hits ignore screens (handled in crit path — T9j.8). Brick Break / Psychic Fangs
// bypass (future item/move pass).
const isDoubles = this._format === 'doubles' || (field && field._format === 'doubles');
const SCREEN_SINGLES = 2048 / 4096;
const SCREEN_DOUBLES = 2732 / 4096;
const screenBase = isDoubles ? SCREEN_DOUBLES : SCREEN_SINGLES;

let screenMod = 1;
const tSide = target.side;
if (tSide) {
  if (tSide.auroraVeil) {
    screenMod = screenBase;  // AV covers both physical and special
  } else if (isPhysical && tSide.reflect) {
    screenMod = screenBase;
  } else if (!isPhysical && tSide.lightScreen) {
    screenMod = screenBase;
  }
}
```

**Note:** `this._format` on the Pokemon is set by `buildTeam` via `teamDef.format` (already exists). `field._format` is set once in `simulateBattle` from `opts.format` (need 1-line add there).

---

## DIFF 4 — engine.js `executeAction` / status move branch (~line 720-775)

**Before:** Trick Room and Tailwind are handled. Screens fall through to default (which does nothing).

**After** — add Screen setters after Tailwind block:
```js
// (existing Tailwind block unchanged)

// T9j.3 Light Screen / Reflect / Aurora Veil setters
if (move === 'Light Screen') {
  const side = (allies === playerActive) ? field.playerSide : field.oppSide;
  side.lightScreen = true;
  side.lightScreenTurns = 5;  // Light Clay item -> 8 (T9j.6)
  log.push(`${attacker.name} raised a Light Screen!`);
  return;
}
if (move === 'Reflect') {
  const side = (allies === playerActive) ? field.playerSide : field.oppSide;
  side.reflect = true;
  side.reflectTurns = 5;
  log.push(`${attacker.name} raised a Reflect!`);
  return;
}
if (move === 'Aurora Veil') {
  // Gated: Aurora Veil only succeeds if hail or snow is active at cast time.
  const wx = field.weather;
  if (wx !== 'hail' && wx !== 'snow') {
    log.push(`${attacker.name} used Aurora Veil! But it failed (no hail/snow).`);
    return;
  }
  const side = (allies === playerActive) ? field.playerSide : field.oppSide;
  side.auroraVeil = true;
  side.auroraVeilTurns = 5;
  log.push(`${attacker.name} activated Aurora Veil!`);
  return;
}
```

Also add Screens to STATUS_MOVES set and the move table:
```js
const STATUS_MOVES = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
  'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail',
  'Wide Guard','Follow Me','Quick Guard',
  // T9j.3 additions
  'Light Screen','Reflect','Aurora Veil']);
```

And add to MOVE_TARGETS as `allyOrSelf` (self-side). Already in data.js registry — **verify**:
```bash
grep -E "'Light Screen'|'Reflect'|'Aurora Veil'" data.js
```

---

## DIFF 5 — engine.js `simulateBattle` timer-draw + legality wiring (~line 650 + 1180)

**Add once near field init (~line 594):**
```js
field._format = opts.format || 'doubles';
const DECISION_TIME_MS = 15 * 1000;  // 15s proxy per turn for batch sim
```

**Add before turn advance (end of each turn loop ~line 1180):**
```js
// T9j.3 (#39) — timer expiry check
field.clockPlayer -= DECISION_TIME_MS;
field.clockOpp    -= DECISION_TIME_MS;
if (field.clockPlayer <= 0 || field.clockOpp <= 0) {
  const pAlive = field.playerTeam.filter(p => p.alive).length;
  const oAlive = field.oppTeam.filter(p => p.alive).length;
  log.push(`[TIMER] Clock expired. Player alive: ${pAlive}, Opp alive: ${oAlive}`);
  if (pAlive > oAlive)      { result = 'win';  winCondition = 'Timer Win'; }
  else if (oAlive > pAlive) { result = 'loss'; winCondition = 'Timer Loss'; }
  else                      { result = 'draw'; winCondition = 'Timer Draw'; }
  break;
}
```

**Update return object (line 1198):**
```js
return {
  result,
  turns: turn,
  trTurns: field.trickRoomActive,                       // T9j.3 (#37) — was field.trickRoomTurns
  twTurnsPlayer: field.playerSide.tailwindActive,       // T9j.3 (#38)
  twTurnsOpp:    field.oppSide.tailwindActive,
  twTurns: field.playerSide.tailwindActive + field.oppSide.tailwindActive,
  screens: {                                            // T9j.3 — diagnostics
    playerReflect: field.playerSide.reflectActive,
    playerLightScreen: field.playerSide.lightScreenActive,
    playerAuroraVeil: field.playerSide.auroraVeilActive,
    oppReflect: field.oppSide.reflectActive,
    oppLightScreen: field.oppSide.lightScreenActive,
    oppAuroraVeil: field.oppSide.auroraVeilActive,
  },
  log, winCondition, seed,
  legality: { player: playerLegality, opp: oppLegality }  // existing from QW
};
```

---

## DIFF 6 — engine.js `runBoSeries` aggregates (~line 1230-1280)

**Add:**
```js
const results = {
  wins:0, losses:0, draws:0, errors:0,
  totalTurns:0, totalTrTurns:0,
  totalTwTurns:0,          // NEW T9j.3 (#38)
  timerDraws:0,            // NEW T9j.3 (#39)
  ...
};

// in per-battle loop:
results.totalTwTurns += battle.twTurns || 0;
if (battle.winCondition === 'Timer Draw') results.timerDraws++;

// after loop:
results.avgTrTurns = validBattles > 0 ? results.totalTrTurns / validBattles : 0;
results.avgTwTurns = validBattles > 0 ? results.totalTwTurns / validBattles : 0;  // NEW
```

---

## DIFF 7 — ui.js Series Summary readout (~line 956 + rawResult mapping ~1384)

**Add in rawResult→display mapping:**
```js
avg_tr_turns:         rawResult.avgTrTurns  || 0,
avg_tw_turns:         rawResult.avgTwTurns  || 0,    // NEW
timer_draws:          rawResult.timerDraws  || 0,    // NEW
```

**Series Summary HTML (index.html) — add row after Avg TR Turns:**
```html
<div class="stat-row"><span>Avg TR Turns</span><span id="stat-tr-turns">0.0</span></div>
<div class="stat-row"><span>Avg Tailwind Turns</span><span id="stat-tw-turns">0.0</span></div>
```

**ui.js populate (near existing stat-tr-turns line):**
```js
document.getElementById('stat-tr-turns').textContent = res.avgTrTurns.toFixed(1);
document.getElementById('stat-tw-turns').textContent = res.avgTwTurns.toFixed(1);
```

**Draws row already exists** — verify it reads `res.draws` (the field name in the return object, currently `draws`). If it reads something else, normalize.

---

## Smoke tests (required before commit)

```js
// Test 1: Reflect halves physical in singles, reduces by 2732/4096 in doubles
const s = simulateBattle(twteam, twteam, {seed:[1,2,3,4], format:'singles'});
const d = simulateBattle(twteam, twteam, {seed:[1,2,3,4], format:'doubles'});
// expect singles screenMod=0.5, doubles=2732/4096

// Test 2: TR counter non-zero when TR is set
// Run player (TR squad) vs any team, expect trTurns >= 3

// Test 3: Tailwind counter non-zero when TW is set
// Run champions_arena_1st (Tornadus Tailwind lead) vs anyone, expect twTurns >= 3

// Test 4: Aurora Veil fails without snow
// Cast Aurora Veil first turn with clear weather → log 'it failed'
// Cast Snowscape then Aurora Veil → log 'activated'

// Test 5: Timer draw triggers by turn ~28 (15s * 28 = 420s = 7min)
// Run a stall mirror (Protect spam), expect winCondition === 'Timer Draw' or 'Timer Win'
```

---

## Commit plan

1. Apply diffs to `poke-sim/engine.js`
2. Apply diffs to `poke-sim/ui.js`
3. Add Series Summary row to `poke-sim/index.html`
4. Verify `data.js` MOVE_TARGETS has Light Screen / Reflect / Aurora Veil (add if missing)
5. `node --check` all three files
6. Rebuild bundle
7. Run 5 smoke tests above
8. Commit:
   ```
   T9j.3 screens aurora veil timer draw and active turn counters
   Refs #37 #38 #39
   ```
9. Push, then close #37 / #38 / #39 with work-shown comments

---

## Questions for you before I apply

1. **Timer decision proxy at 15s/turn** — acceptable, or do you want it configurable (e.g. `opts.decisionTimeMs`)?
2. **Series draw resolution** — in Bo3 if a game is a Timer Draw, should the series score it as 0.5-0.5 (half credit each), or re-run the game? Proposal: score 0.5 each, only the `draws` counter tracks it.
3. **Reflect/LS on crit** — spec says "crits ignore screens". Crits are T9j.8. OK to defer that pass, or should I stub the hook now so crits work when T9j.8 lands?
