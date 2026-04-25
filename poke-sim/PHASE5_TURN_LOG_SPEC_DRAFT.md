# Phase 5 - Structured Turn Log + Position Score (DRAFT)

> **Status: DRAFT.** Not approved for implementation. Draft created 2026-04-25 alongside `COACHING_NORTH_STAR.md`. Review and approval gate is **after Phase 4c lands** so we have evidence of which detectors actually need turn-level data versus those that can run on aggregates.

**Phase parent:** Coaching layer rollout (`COACHING_LAYER_SPEC.md`, `PHASE4_DYNAMIC_ADVICE_SPEC.md`)
**Coverage of `COACHING_NORTH_STAR.md`:** Sections 2 (full), 4 (full 7-bucket), 5 (fake-good), 7 (predictive), 10 (turning-point)
**Owner:** TBD (to be assigned at approval)

---

## 1. Why Phase 5 exists

Phase 4a-4e all read from `champions_sim_log_v1`, which stores **per-game aggregates** plus a few structured event arrays (`koEvents`, `movesUsed`, `protectStreakMax`). That is enough for:

- Win/loss splits by archetype (PR #119)
- Lead win-rate tables (Phase 4c)
- Dead-move detection (Phase 4c)
- Threat-response Monte Carlo on bounded branches (Phase 4d, 4 branches x 200 sims)

It is **not** enough for:

- "The match flipped on Turn 4 when X" - requires per-turn position score
- "You got the KO but lost the game by allowing Tailwind" - requires fake-good detection across paired turns
- "Predicted primary win condition: Trick Room up by Turn 3" - requires forward-looking position evaluator
- Section 12 IN-MATCH per-turn output (threat assessment, position score, decision category) - has no data source today

Phase 5 builds the foundation those features need. Without it, sections 2, 4 (full), 5 (fake-good), 7 (predictive), 10 (turning-point) of the north-star spec are not implementable - we would be inventing data.

---

## 2. Scope

**In scope:**
- Replace `simulateBattle()` `log: string[]` with `turnLog: Turn[]`, plus a `log: string[]` derived view for backward compatibility
- New `Turn` shape capturing pre-state, action, post-state, deltas (Section 3 below)
- `positionScore(state)` heuristic evaluator (Section 4)
- `winProbabilityDelta` per turn via opt-in micro-rollouts (Section 5)
- Test migration plan - no existing test should break (Section 7)
- Storage: `turnLog` is **NOT** persisted to localStorage. Only summary fields (turning-point turn, position-score path) are persisted to keep within the existing 500-entry / oldest-first cap

**Out of scope (deferred to Phase 5b/5c or Phase 6):**
- Full 7-bucket line classification (depends on line tree, Phase 5b)
- Coaching voice + output templates (Phase 6)
- Replacing the greedy `selectMove` AI with a search-based one (separate engine RFC)
- IndexedDB migration (deferred per `COACHING_LAYER_SPEC.md` Section 11)

---

## 3. Turn shape

```js
// One entry per game turn. Stored only in memory during simulateBattle, not in
// the persisted sim log. Aggregates derived from turnLog (turning point,
// position-score path) DO get persisted.
//
// Sides are 'player' and 'opponent' to match the existing log conventions.

const Turn = {
  turn: 1,                          // 1-indexed turn number

  // ----- BEFORE actions resolve -----
  pre: {
    active:    { player: ['Incineroar','Arcanine'], opponent: ['Altaria','Kingdra'] },
    bench:     { player: [...names], opponent: [...names] },
    hp_pct:    { 'Incineroar': 1.0, 'Arcanine': 0.83, ... },     // 0..1 per mon by name
    status:    { 'Arcanine': 'brn', ... },                        // missing key = no status
    field: {
      weather:        'sun' | 'rain' | 'sand' | 'snow' | null,
      weather_turns:  3,                                           // 0 if absent
      terrain:        'electric' | 'grassy' | 'misty' | 'psychic' | null,
      terrain_turns:  0,
      trick_room:     2,                                           // turns remaining, 0 if off
    },
    speed_control: {
      player:   { tailwind_turns: 0, screens: { reflect: 2, light: 0, aurora: 0 } },
      opponent: { tailwind_turns: 4, screens: { reflect: 0, light: 0, aurora: 0 } },
    },
    speed_order: ['Kingdra','Arcanine','Altaria','Incineroar'],   // computed final order
    revealed: {
      moves: { 'Altaria': ['Hyper Voice'], ... },                  // cumulative through this turn
      items: { 'Kingdra': 'Choice Specs', ... },                   // null when unrevealed
    },
    legal_options: {
      // For the PLAYER side only - what the engine considered legal this turn
      // (used for fake-good detection: "you had X available, you chose Y")
      'Incineroar': ['Fake Out -> Altaria', 'Knock Off -> Altaria', 'Flare Blitz -> Altaria', 'Protect'],
      'Arcanine':   ['Extreme Speed -> Altaria', 'Flare Blitz -> Kingdra', 'Snarl', 'Protect'],
    },
    position_score: 0.62,                                          // 0..1, see Section 4
    win_probability: 0.58,                                         // 0..1, see Section 5 (may be null if rollouts disabled)
  },

  // ----- ACTIONS chosen -----
  actions: {
    player:   [{ actor: 'Incineroar', kind: 'move', move: 'Fake Out', target: 'Altaria' },
               { actor: 'Arcanine',   kind: 'move', move: 'Flare Blitz', target: 'Altaria' }],
    opponent: [{ actor: 'Altaria',    kind: 'move', move: 'Hyper Voice', target: 'spread' },
               { actor: 'Kingdra',    kind: 'move', move: 'Draco Meteor', target: 'Arcanine' }],
    // Switches and Mega/Tera triggers also go here:
    //   { actor, kind: 'switch', incoming: 'Whimsicott' }
    //   { actor, kind: 'mega' } / { actor, kind: 'tera', tera_type: 'Fairy' }
  },

  // ----- DAMAGE + EVENTS resolved -----
  events: [
    { type: 'damage', source: 'Arcanine',   target: 'Altaria',  move: 'Flare Blitz',  dmg_pct: 0.91, crit: false, spread: false },
    { type: 'damage', source: 'Altaria',    target: 'Arcanine', move: 'Hyper Voice',  dmg_pct: 0.18, crit: false, spread: true  },
    { type: 'damage', source: 'Altaria',    target: 'Incineroar', move: 'Hyper Voice', dmg_pct: 0.16, crit: false, spread: true },
    { type: 'damage', source: 'Kingdra',    target: 'Arcanine', move: 'Draco Meteor', dmg_pct: 0.74, crit: false, spread: false },
    { type: 'flinch', source: 'Incineroar', target: 'Altaria',  move: 'Fake Out' },
    { type: 'ko',     source: 'Arcanine',   target: 'Altaria' },                         // mirrors Phase 4a koEvents
    { type: 'status', source: 'Altaria',    target: 'Arcanine', status: 'brn' },
    { type: 'switch', side: 'opponent',     out: 'Altaria',     in: 'Salamence' },
    { type: 'field',  effect: 'tailwind',   side: 'opponent',   action: 'expired' },
  ],

  // ----- AFTER actions resolve -----
  post: {
    // Same shape as `pre`, sampled after end-of-turn effects (poison, weather, screens decrement).
    active:        { player: [...], opponent: [...] },
    bench:         { player: [...], opponent: [...] },
    hp_pct:        { ... },
    status:        { ... },
    field:         { ... },
    speed_control: { ... },
    speed_order:   [...],
    revealed:      { ... },
    position_score: 0.41,
    win_probability: 0.34,                                         // null if rollouts disabled this turn
  },

  // ----- DERIVED (filled after the turn resolves) -----
  delta: {
    position_score: -0.21,
    win_probability: -0.24,
    primary_cause: 'tailwind_expired_unanswered',                  // see Section 4.4 cause taxonomy
    explanation: 'Got the KO on Altaria but allowed Kingdra Specs Draco Meteor to remove Arcanine. Position swung opponent because remaining offense favors them.'
  },
};
```

A `simulateBattle()` result then exposes:

```js
{
  // ... existing fields unchanged ...
  log: string[],                  // backward compat: derived from turnLog formatters
  turnLog: Turn[],                // NEW
  turning_point: {                // NEW - cached summary from turnLog scan
    turn: 4,                      // turn with largest |position_score delta|
    direction: 'opponent',        // who it favored
    cause: 'tailwind_expired_unanswered',
  },
  position_path: [0.55, 0.62, 0.58, 0.61, 0.41, 0.39, 0.20],  // length = turns + 1, includes pre-T1 baseline
}
```

---

## 4. Position score heuristic

`positionScore(state) -> 0..1` where 1 = certain win, 0 = certain loss, 0.5 = even.

Designed to be **fast** (called every turn pre + post = ~10 calls per game). Pure function of board state. No simulation inside.

### 4.1 Formula (v1 draft)

Weighted sum of normalized components, clamped to [0,1].

| Component | Weight | Computation |
|---|---|---|
| `hp_diff_norm` | 0.30 | `(player_total_hp_pct - opp_total_hp_pct) / 2 + 0.5`. Considers only mons still in bring set. |
| `survivors_diff_norm` | 0.20 | `(player_alive_count - opp_alive_count) / max_bring + 0.5` |
| `speed_control_edge` | 0.15 | +0.5 if our Tailwind/TR favors us this turn relative to baseline speed gap, -0.5 if opponent's, scaled by turns remaining |
| `screens_edge` | 0.05 | +0.05 per active screen on our side, -0.05 on theirs |
| `status_edge` | 0.10 | -0.1 per debilitating status on our side (slp, par, brn-on-physical, frz, tox), +0.1 on theirs |
| `field_threat_edge` | 0.10 | +0.1 if our field favors our archetype (sun for Fire team, TR for slow team), -0.1 if opp's. Reads team archetype from TEAM_META |
| `win_condition_alive` | 0.10 | +0.05 if our win-condition mon (TEAM_META.win_condition) is alive and >50% HP, -0.05 mirror for opp |

```
score = 0.5
      + 0.30 * (hp_diff_norm - 0.5)
      + 0.20 * (survivors_diff_norm - 0.5)
      + 0.15 * speed_control_edge
      + 0.05 * screens_edge
      + 0.10 * status_edge
      + 0.10 * field_threat_edge
      + 0.10 * win_condition_alive
score = clamp(score, 0, 1)
```

### 4.2 Why this formula

- It's directional and explainable. We can attribute a delta to its dominant component (Section 4.4 cause taxonomy).
- It is not trying to predict win probability. That is the **rollout** job (Section 5). This is a fast proxy that lets us scan every turn.
- It composes with PR #120's both-sides mirroring: `positionScore` is symmetric - call it from the opposite side and it returns `1 - x` within rounding.

### 4.3 Calibration plan

Before Phase 5 ships, run a 5,000-game calibration pass:
1. Compute `positionScore` at every turn of every game.
2. Bucket terminal outcomes by score bucket at turn 3 (10 buckets).
3. Plot empirical win-rate per bucket.
4. Score is **acceptable** if: monotonically increasing with score bucket, AND turn-3 score >= 0.7 has empirical WR >= 0.7, AND <= 0.3 has WR <= 0.3.
5. If not, tune weights via grid search and re-validate.

Calibration test goes in `tests/phase5_position_score_calibration.js` and is gated on a feature flag so it does not run on every CI build.

### 4.4 Cause taxonomy (`delta.primary_cause`)

Tag the dominant component of a turn's score swing:
- `ko_in_our_favor` / `ko_in_opp_favor`
- `tailwind_set` / `tailwind_expired_unanswered` / `trick_room_set` / `trick_room_expired`
- `screen_set` / `screen_broken`
- `status_landed_on_threat` / `status_landed_on_us`
- `win_condition_lost` / `win_condition_secured`
- `speed_tier_flipped`
- `field_threat_changed`
- `damage_only` (no qualitative shift, just chip)

Used by the post-match coaching layer (Phase 6) to write the "why" sentence.

---

## 5. Win-probability via micro-rollouts

`winProbabilityDelta(state) -> 0..1` is **opt-in** because it costs sims.

### 5.1 When it runs

- Disabled by default in Run All Matchups (cost-prohibitive).
- Enabled when:
  - `bo === 1` and user clicked "Deep Coach" toggle.
  - OR: post-hoc on a single replay click ("explain this game").
  - OR: nightly background job for top-3 most-simmed matchups.

### 5.2 Method

For each turn we want a true win probability:

```
runs = 50                                 # tunable, 50 is the budget per turn
seed_strategy = derive from base seed     # so calibration is reproducible
for i in 0..runs:
  clone state
  randomize remaining unrevealed information (opponent moves not yet seen,
    crit flags, accuracy rolls within engine PRNG)
  simulate forward to game end with current AI from this state
  count win / loss / draw
return wins / runs
```

`positionScore` (Section 4) is the heuristic we use **between** rollout-supported turns.

### 5.3 Storage cost

50 sims/turn x 7 turns avg x 1 game = 350 extra `simulateBattle` calls per game.
At ~1ms/sim that's ~350ms - acceptable for opt-in single-game replay coaching, prohibitive for Run All.

---

## 6. Backwards compatibility

### 6.1 `log: string[]`

Existing UI grep code (`generatePilotGuide`, `Replay Log`) reads strings from `log`. We keep those readers working by deriving `log` from `turnLog`:

```js
function deriveLogFromTurnLog(turnLog) {
  return turnLog.flatMap(t => [
    `[Turn ${t.turn}] Player: ${t.actions.player.map(a => a.move).join(', ')}`,
    `[Turn ${t.turn}] Opp:    ${t.actions.opponent.map(a => a.move).join(', ')}`,
    ...t.events.filter(e => e.type === 'ko').map(e => `${e.target} fainted`),
  ]);
}
```

Old format strings the codebase grep'd for must still appear (search for `\bfainted\b`, `\bUI/PDF\b`, etc). Audit before merge.

### 6.2 Sim log writer

`csSimLogAppendSeries` continues to read the **summary** fields from a battle result. We add `turning_point` and `position_path` to the per-game payload but keep the existing fields. Storage cap stays at 500 entries / oldest-first eviction.

`turnLog` itself is **never** persisted to localStorage. It is regenerated on demand by re-running the seeded sim if a deep replay is requested.

### 6.3 Tests

- `tests/audit.js` (5070-battle regression) must produce identical aggregate win rates +/- noise after refactor. Gate Phase 5 merge on this.
- `tests/t9j8/9/10/...` test cases that grep `log` strings must still pass.
- New `tests/phase5_*` files for turn-shape contract, position-score formula, calibration, micro-rollout determinism.

---

## 7. Rollout sub-phases

| Sub-phase | Scope | Headless test | Flag |
|---|---|---|---|
| **5a** | Add `turnLog` capture in `simulateBattle` (no behavior change). Derive `log` from it. | All existing tests pass. Turn-shape contract test passes. | `CS_PHASE5_TURNLOG = true` |
| **5b** | Add `positionScore()` + `position_path` + `turning_point` + cause taxonomy | Calibration pass at 5,000 games hits acceptance criteria in 4.3 | `CS_PHASE5_POSITION_SCORE = true` |
| **5c** | Opt-in `winProbabilityDelta` micro-rollouts + Deep Coach button | 50-sim determinism test (same seed -> same WR within +/- 0.02) | `CS_PHASE5_DEEP_COACH = true` |

Each sub-phase ships independently. Flag-gated so we can disable any sub-phase if calibration fails post-merge.

---

## 8. Open questions (locked before implementation)

1. **`turnLog` size:** average game is ~10 turns, each Turn ~4KB. ~40KB per game in memory. 500-game sim log eviction means peak ~20MB transient. **Decision needed:** acceptable, or stream-and-discard?
2. **Hidden information:** `pre.legal_options` is from the player's perspective. Do we record opponent's legal options too (for line tree analysis later)? **Default: no.** Add later if Phase 6 needs it.
3. **Switch action accounting:** when both sides switch on the same turn, ordering matters for `pre`/`post` but not for events. Keep events list ordered by resolution time.
4. **Mega/Tera turn:** the Mega trigger turn is already tracked in `engine.js`. Surface it as `actions[side].kind === 'mega'` so the coaching layer can ask "did you Mega the right turn?"

---

## 9. Cross-references

- North star: `COACHING_NORTH_STAR.md` (Sections 2, 4 full, 5 fake-good, 7 predictive, 10 full)
- Engine entry: `engine.js` `simulateBattle()` line ~1087, return shape line ~2196
- AI selector (will not change in Phase 5): `engine.js` `selectMove()` line ~1230
- Sim log: `MASTER_PROMPT.md` "PHASE 4 - ADAPTIVE COACHING" section
- Existing per-game arrays we keep: `koEvents`, `movesUsed`, `protectStreakMax`
