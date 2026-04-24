# T9j.7 — Dynamic Mega Evolution + Trigger Sweep (closes GH #23)

**Author:** Champions Sim · 2026-04-24 (revised post 5-question scoping)
**Branch:** `fix/champions-sp-and-legality`
**Baseline:** `85d5a3c` (T9j.3b known-good)
**Closes:** [#23 Mega Evolution never activates — Mega forms permanent from turn 1](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/issues/23)
**Milestone:** M1 Engine Truth (v1.0)

---

## 0. Scoping decisions (this revision)

Five design decisions were locked before writing source:

| # | Decision | Answer |
|---|---|---|
| 1 | Trigger sweep coverage | **Full sweep every legal turn 1..N per Mega** |
| 2 | Runtime management | **Progressive refinement** — coarse 50 battles/cell, refine top 3 at 500 each |
| 3 | Sweep output surface | **Pilot Guide card + Trend Dashboard heatmap** (UI lives in M2/M3) |
| 4 | Scope split | **T9j.7 = engine + trigger API + JSON output only.** UI surfaced via new M2/M3 tickets |
| 5 | AI trigger policy (single-battle mode) | **First-eligible** — AI Megas on turn 1. Sweep overrides this. |

**What T9j.7 ships (M1):** Mega mechanic + `MegaTriggerPolicy` + `runMegaTriggerSweep()` entry + JSON output writer.

**What T9j.7 does NOT ship (filed as follow-ups under M2/M3):**
- Pilot Guide card rendering sweep results (new M2 ticket)
- Trend Dashboard Mega Timing heatmap (new M3 ticket)

---

## 1. Primary-source mechanic summary

| Behavior | Source |
|---|---|
| Requires Omni Ring + corresponding Mega Stone held | [Game8 Mega list](https://game8.co/games/Pokemon-Champions/archives/592472) |
| Trigger: player presses Mega Evolution button during move selection | [Game8 Mega list](https://game8.co/games/Pokemon-Champions/archives/592472) |
| One Mega Evolution per match per trainer | [Game8 Mega list](https://game8.co/games/Pokemon-Champions/archives/592472), [Bulbapedia Mega Evolution](https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution) |
| Mega form persists for rest of battle, even through switch | [Game8 Mega list](https://game8.co/games/Pokemon-Champions/archives/592472), [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution) |
| Mega Evolution occurs at **start of turn**, after switching but before any move | [Bulbapedia Priority](https://bulbapedia.bulbagarden.net/wiki/Priority) |
| Simultaneous Mega order is random | [Game8 Known Bugs](https://game8.co/games/Pokemon-Champions/archives/593898) |
| Strategic timing matters: "delay it by a turn to maximize the time" | [Game8 Sun Team guide](https://game8.co/games/Pokemon-Champions/archives/594157) |

---

## 2. Current (broken) state at `85d5a3c`

- `Pokemon` constructor reads `BASE_STATS[data.name]`; if team stores `name:"Dragonite-Mega"`, mon enters battle in Mega form turn 1.
- No trigger logic exists (`grep "megaEvolve\|hasMegaEvolved\|megaStone"` in `engine.js` / `ui.js` = 0 matches).
- **Data gaps:** BASE_STATS missing base-form entries for Altaria, Drampa, Houndoom (three Mega base species referenced by loaded teams).

---

## 3. Design

### 3.1 `CHAMPIONS_BASE_ABILITIES` map (new, `data.js`)

`{ 'Dragonite': 'Multiscale', 'Altaria': 'Natural Cure', ... }`. Covers every base species in `CHAMPIONS_MEGAS`. Used by constructor to restore base ability until Mega triggers. Priority fill: the 12 base species from loaded teams, then backfill.

### 3.2 BASE_STATS fills

- Altaria: `75/70/90/70/105/80` ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Altaria_(Pok%C3%A9mon)), [RotomLabs](https://rotomlabs.net/dex/champions/altaria))
- Drampa: `78/60/85/135/91/36` ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Drampa_(Pok%C3%A9mon)))
- Houndoom: `75/90/50/110/80/95` ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Houndoom_(Pok%C3%A9mon)))

### 3.3 `Pokemon` constructor changes (`engine.js`)

```js
var megaInfo = (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[data.name]) || null;
if (megaInfo && megaInfo.baseSpecies && data.item === megaInfo.megaStone) {
  this.megaForm = {
    megaName:    data.name,
    megaStats:   megaInfo.megaBaseStats,
    megaTypes:   megaInfo.types,
    megaAbility: megaInfo.ability,
    stone:       megaInfo.megaStone,
  };
  this.displayName = data.name;
  this.name        = megaInfo.baseSpecies;  // engine reads base stats
  this.ability     = CHAMPIONS_BASE_ABILITIES[megaInfo.baseSpecies] || this.ability;
  this.hasMegaEvolved = false;
} else {
  this.megaForm = null;
  this.hasMegaEvolved = false;
  this.displayName = data.name;
}
```

### 3.4 `megaEvolve(log)` method (new, Pokemon prototype)

```js
megaEvolve(log) {
  if (!this.megaForm || this.hasMegaEvolved) return false;
  var m = this.megaForm;
  var hpFrac = this.hp / this.maxHp;
  this._base = Object.assign({}, m.megaStats, { types: m.megaTypes.slice() });
  this.types = m.megaTypes.slice();
  this.name = m.megaName;
  this.displayName = m.megaName;
  this.ability = m.megaAbility;
  this._calcStats();
  this.hp = Math.max(1, Math.round(this.maxHp * hpFrac));
  this.multiscaleActive = (this.ability === 'Multiscale') && this.hp === this.maxHp;
  this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
  this.hasMegaEvolved = true;
  if (log) log.push(`${m.megaName} Mega Evolved!`);
  return true;
}
```

### 3.5 `MegaTriggerPolicy` module (new, `engine.js`)

Three modes, assigned per Pokemon at battle start:

```js
var MegaTriggerPolicy = {
  FIRST_ELIGIBLE: 'first_eligible',    // default — AI Megas turn 1
  AT_TURN:        'at_turn',            // sweep mode — triggers on turn N
  NEVER:          'never',              // sweep baseline — skip Mega
};

function shouldMegaThisTurn(mon, currentTurn) {
  if (!mon.megaForm || mon.hasMegaEvolved) return false;
  var p = mon.megaPolicy || MegaTriggerPolicy.FIRST_ELIGIBLE;
  if (p === MegaTriggerPolicy.NEVER) return false;
  if (p === MegaTriggerPolicy.FIRST_ELIGIBLE) return true;
  if (p === MegaTriggerPolicy.AT_TURN) return currentTurn >= (mon.megaTriggerTurn || 1);
  return false;
}
```

### 3.6 Mega Evolution phase in `simulateBattle` (turn-start hook)

```js
function tryMegaPhase(activeArr, sideKey) {
  var candidates = activeArr.filter(m => m.alive && shouldMegaThisTurn(m, turn));
  candidates.sort((a,b) => b.getEffSpeed(field) - a.getEffSpeed(field));
  for (var mon of candidates) {
    if (field[sideKey + 'MegaUsed']) break;  // one-per-team rule
    mon.megaEvolve(log);
    field[sideKey + 'MegaUsed'] = true;
  }
}
tryMegaPhase(playerActive, 'player');
tryMegaPhase(oppActive, 'opp');
```

### 3.7 `runMegaTriggerSweep()` entry point (new, `engine.js`)

```js
/**
 * Sweep every legal trigger turn across a matchup and write WR-by-turn JSON.
 * Pass 1 (coarse): 50 battles per (mega-slot x trigger-turn) cell.
 * Pass 2 (refine): top 3 trigger turns rerun at 500 battles each.
 * Returns { megaSlot, curves: [{turn, wr, n, ci95}], refinedTop3, bestTurn }.
 */
function runMegaTriggerSweep(teamA, teamB, bo, opts) {
  opts = opts || {};
  var MAX_TURN = opts.maxTurn || 10;
  var COARSE_N = opts.coarseN || 50;
  var REFINE_N = opts.refineN || 500;
  var results = [];
  var megaMembers = teamA.members.filter(m => m.megaForm);
  for (var slot of megaMembers) {
    var curve = [];
    // Sweep every legal turn + 'never' baseline
    for (var t = 1; t <= MAX_TURN; t++) {
      var wr = runCells(teamA, teamB, bo, slot, 'at_turn', t, COARSE_N);
      curve.push({ turn: t, wr: wr.wr, n: COARSE_N, ci95: wr.ci95 });
    }
    var neverWr = runCells(teamA, teamB, bo, slot, 'never', null, COARSE_N);
    curve.push({ turn: 'never', wr: neverWr.wr, n: COARSE_N, ci95: neverWr.ci95 });
    // Refine top 3
    var top3 = curve.slice().sort((a,b) => b.wr - a.wr).slice(0,3);
    var refined = top3.map(cell => {
      var policy = cell.turn === 'never' ? 'never' : 'at_turn';
      var refinedWr = runCells(teamA, teamB, bo, slot, policy, cell.turn, REFINE_N);
      return { turn: cell.turn, wr: refinedWr.wr, n: REFINE_N, ci95: refinedWr.ci95 };
    });
    var bestTurn = refined.sort((a,b) => b.wr - a.wr)[0].turn;
    results.push({ megaSlot: slot.displayName, curve, refinedTop3: refined, bestTurn });
  }
  return { matchup: `${teamA.name}_vs_${teamB.name}`, results };
}
```

Writes to `poke-sim/trigger_sweep/<teamA>_vs_<teamB>.json`. Deterministic RNG seed per cell for reproducibility.

### 3.8 Spec update (`CHAMPIONS_MECHANICS_SPEC.md §10.2`)

Full section with all 7 behaviors cited (as in old draft §3.7), plus new subsection **§10.2.1 Sim-specific trigger sweep** documenting the progressive refinement methodology and the `MegaTriggerPolicy` modes as spec choices.

### 3.9 One-per-team enforcement

`field.playerMegaUsed` / `field.oppMegaUsed` flags. Persists across switches. `hasMegaEvolved` on the mon ensures switched-in already-evolved Mega stays Mega.

---

## 4. Files touched

| File | Changes |
|---|---|
| `poke-sim/data.js` | `CHAMPIONS_BASE_ABILITIES` map; 3 BASE_STATS fills |
| `poke-sim/engine.js` | Constructor Mega resolution; `megaEvolve()` method; `MegaTriggerPolicy`; turn-start Mega phase; `runMegaTriggerSweep()`; one-per-team flags |
| `poke-sim/ui.js` | (none this commit — optional roster badge deferred to M2) |
| `CHAMPIONS_MECHANICS_SPEC.md` | §10.2 full rewrite + new §10.2.1 sweep methodology |
| `pokemon-champion-2026.html` | Bundle rebuild |
| `poke-sim/trigger_sweep/` | New directory for sweep JSON outputs (gitignored initially, committed when M2 consumes them) |

---

## 5. Test plan — `/tmp/mega_tests.js` (12 cases)

**Core Mega mechanic (cases 1-8, as original):**
1. Pre-trigger stats are base form (Dragonite-Mega holding Dragoninite enters at base atk)
2. Post-trigger stats are Mega form after `megaEvolve()`
3. Types swap (Altaria Dragon/Flying → Dragon/Fairy)
4. Ability swap (Natural Cure → Pixilate)
5. One-Mega-per-team cap
6. Persistence through switch
7. HP% preserved across swap
8. Non-Mega (no stone, or no CHAMPIONS_MEGAS entry) unaffected

**New — Trigger sweep (cases 9-12):**
9. **`at_turn:3` policy** triggers exactly on turn 3, not earlier
10. **`never` policy** leaves Mega in base form for entire battle, no `hasMegaEvolved=true`
11. **Sweep pass 1 produces `MAX_TURN + 1` cells** per Mega (every turn + "never" baseline)
12. **Sweep pass 2 refines top 3 only** — verify cell count and that refined `n=REFINE_N`

**Regression:**
- `/tmp/coverage_tests.js` (expect still 9/9)
- `/tmp/audit.js` (expect 0 JS errors; WR shifts because Megas now start in base form; 5070 battles)
- One sample `runMegaTriggerSweep(mega_dragonite, kingambit_sneasler, 1)` call — verify JSON output well-formed, 11 cells in curve, 3 in refined, bestTurn populated.

---

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Name-collision: constructor rewrites `"Dragonite-Mega"` → `"Dragonite"` | grep confirms only BASE_STATS/CHAMPIONS_MEGAS/MOVE_TYPES read `.name`. Test 8 covers. |
| Pilot card / report shows base name pre-trigger | Log/UI strings use `displayName` where Mega tracking matters |
| Breaks saved teams | Backward-compat: only reroute name when `item === megaStone`. No stone = old behavior. |
| Sweep runtime blows up on slow machines | Progressive refinement caps pass 1 at `11 * megaCount * 50` battles per matchup. Full 13x13 audit with sweep = ~90K battles. <3 min budget. |
| Sweep JSON files clutter repo | Add `poke-sim/trigger_sweep/` to `.gitignore` initially; commit only when M2 consumer ships |
| Legality recheck of stat cap uses Mega stats | Correct — SP cap applies to configured Mega form on sheet. No change needed. |

Rollback: `git reset --hard 85d5a3c` returns to T9j.3b.

---

## 7. Commit + GH plan

- **Commit:** `add dynamic mega evolution with trigger sweep and base form lead (Refs #23 T9j7)` (no em-dashes)
- **Push** to `fix/champions-sp-and-legality`
- **Evidence on #23:**
  - Paste sample log: `Dragonite sent out!` → `--- Turn 1 ---` → `Dragonite-Mega Mega Evolved!`
  - Paste 12/12 test output
  - Paste one sample sweep JSON snippet
  - `gh issue close 23`
- **File 2 follow-up tickets** (after close):
  - M2: "Pilot Guide card — best Mega trigger turn per matchup (consumes T9j.7 sweep JSON)"
  - M3: "Trend Dashboard — Mega Timing heatmap across all matchups (consumes T9j.7 sweep JSON)"

---

## 8. Out-of-scope (deferred, now filed as tickets under M2/M3)

- Pilot Guide card surfacing best trigger turn (→ M2 ticket)
- Trend Dashboard Mega Timing heatmap (→ M3 ticket)
- Score-based AI trigger heuristic (HP threshold, opposing lead) — future M1 refinement
- Mega trigger button in Simulator tab for user-piloted mode — future M2
- Backfill `CHAMPIONS_BASE_ABILITIES` for 48 Mega species not on loaded teams — fill as teams are added
- Tournament PDF packet surfacing best trigger turn per matchup (→ M4 already covers)
