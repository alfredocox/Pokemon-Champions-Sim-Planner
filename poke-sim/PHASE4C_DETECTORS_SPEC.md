# Phase 4c - Detectors + Confidence Badges (SPEC)

> **Status:** Ready for review. No code written yet.
> **Author:** Computer (drafted 2026-04-25 for `@alfredocox`)
> **Parent:** `PHASE4_DYNAMIC_ADVICE_SPEC.md` Feature 2 (Adaptive Coaching Update Rules)
> **North-star coverage** (from `COACHING_NORTH_STAR.md` Section 2): N§6, N§8 light, N§9
> **Acceptance criteria moved** (from `COACHING_NORTH_STAR.md` Section 3): #4 (repeated failure pattern detection), #5 (data-cited coaching), #6 (advice changes after 100 sims)

---

## 1. Why Phase 4c

Phase 4b built the adaptive state machine and `team_history`, but the analysis arrays inside it are stubs:

```js
// computeTeamHistory output today (ui.js ~5704):
{
  ...,
  lead_performance:        [],     // empty
  matchup_failures:        [],     // empty
  common_loss_conditions:  [],     // empty
  dead_moves:              [],     // empty
  protect_peaks:           [],     // empty (data exists but not surfaced)
}
```

Phase 4c implements the four detectors that fill those arrays, plus a confidence badge system so the UI can color-code recommendations by sample size.

**No engine.js changes.** All work is in `ui.js`, reading from `champions_sim_log_v1`.

---

## 2. Scope

### In scope
1. `detectDeadMoves(simLog, teamKey)` - moves used <N times across a team's sample
2. `computeLeadPerformance(simLog, teamKey)` - per-lead-pair W-L + sample size
3. `detectLossConditions(simLog, teamKey)` - TR landed unanswered, TW expired with no answer, KO chain patterns
4. `confidenceBadge(sampleSize)` - returns `low | med | high` for any recommendation
5. UI surface in Strategy tab: **5** new collapsible sections under the Record bar (4 detector sections + Coverage & Roles read-only summary)
6. Headless tests for each detector (3 fixtures: small / typical / large sample)
7. Empty-state: every section shows "insufficient data" placeholder when n < 5 (same pattern as Record bar PR #121)

### Out of scope
- Any change to `simulateBattle` or the per-game data shape
- Coaching voice / output formatting (Phase 6)
- Threat response branches (Phase 4d)
- Per-turn data (Phase 5)

---

## 3. Detector specifications

### 3.1 `detectDeadMoves(entries, teamKey)`

**Input:** Array of sim-log entries returned by `csSimLogForTeamBothSides(teamKey)`.

**Logic:**
```
For each game in entries:
  For each (pokemon, move, count) in game.movesUsed:
    accumulate moveCallCount[pokemon][move] += count
    accumulate gameCount[pokemon] += 1
For each pokemon:
  For each move in member.moves (from TEAMS[teamKey]):
    avg_calls_per_game = moveCallCount[pokemon][move] / gameCount[pokemon]
    if avg_calls_per_game < DEAD_MOVE_THRESHOLD:
      flag as dead
```

**Constants:**
- `DEAD_MOVE_THRESHOLD = 0.15` (less than 1 call per ~7 games)
- `DEAD_MOVE_MIN_GAMES = 10` (do not flag below this; not enough signal)

**Output shape:**
```js
[
  { pokemon: 'Whimsicott', move: 'Beat Up',
    avg_calls_per_game: 0.04, total_games: 47,
    severity: 'high' | 'medium' | 'low',  // see 3.5
    reason: 'AI never selected this move - check synergy or replace' }
]
```

**Severity rule:**
- `high`: avg < 0.05 and >= 25 games (move is essentially never picked)
- `medium`: avg < 0.10 and >= 15 games
- `low`: avg < 0.15 and >= 10 games

### 3.2 `computeLeadPerformance(entries, teamKey)`

**Input:** Same as above.

**Logic:**
```
For each game in entries:
  key = sortedJoin(game.leads.player)   // 'Arcanine|Incineroar' (alphabetical for stability)
  if game.result === 'win': leadStats[key].w++
  else if game.result === 'loss': leadStats[key].l++
  // draws excluded per "no draws surfaced" invariant
For each (key, stats) in leadStats:
  stats.win_rate = stats.w / (stats.w + stats.l)
  stats.n        = stats.w + stats.l
Filter: keep only n >= LEAD_MIN_GAMES
Sort: by n desc, then win_rate desc
```

**Constants:**
- `LEAD_MIN_GAMES = 5` (cap noise)
- Display top 6 leads in the UI

**Output shape:**
```js
[
  { lead: ['Arcanine', 'Incineroar'], n: 38, w: 24, l: 14,
    win_rate: 0.632, confidence: 'med' }
]
```

### 3.3 `detectLossConditions(entries, teamKey)`

Surfaces the **patterns that show up disproportionately in losses** vs wins.

**Logic** for each candidate condition:
```
loss_freq = count(losses where condition_present) / count(losses)
win_freq  = count(wins  where condition_present) / count(wins)
lift      = loss_freq - win_freq
if lift > LOSS_LIFT_THRESHOLD AND loss_freq > LOSS_FREQ_THRESHOLD:
  flag this condition
```

**Candidate conditions (v1):**
| ID | Detection | Plain English |
|---|---|---|
| `tr_unanswered` | `game.trTurns >= 4` AND no Trick Room move in our `movesUsed` | Opponent's TR ran for 4+ turns and we never set our own |
| `tw_expired_loss` | `game.twTurnsOpp > 0` AND game ended within 2 turns of TW dropping | We collapsed the turn opponent's Tailwind expired |
| `early_double_ko` | `koEvents` shows 2+ of our mons KO'd before turn 4 | We lost 2 mons before turn 4 |
| `protect_overuse_loss` | `max(protectStreakMax) >= 3` on our side | One of our mons used Protect 3+ turns in a row |
| `winconditioner_lost_early` | TEAM_META win-condition mon KO'd before turn 5 | Our win-condition mon died early |
| `slow_no_tr` | Team archetype is 'TrickRoom' AND no TR in `movesUsed` | TR team never set Trick Room |

**Constants:**
- `LOSS_LIFT_THRESHOLD = 0.20` (loss freq must exceed win freq by 20 percentage points)
- `LOSS_FREQ_THRESHOLD = 0.30` (must occur in at least 30% of losses)
- `LOSS_MIN_GAMES = 15` (combined w+l)

**Output:**
```js
[
  { condition: 'tr_unanswered', description: '...',
    loss_freq: 0.52, win_freq: 0.18, lift: 0.34,
    severity: 'high', sample_size: 47, confidence: 'high' }
]
```

### 3.4 `confidenceBadge(n, winRate)`

Single source of truth used everywhere. **Returns `{ tier, reason }`** so the UI can show *why* a tier was chosen.

| Sample size | Tier (sample-only) | Color | UI label |
|---|---|---|---|
| `n < 5` | `none` | grey | "insufficient data" |
| `5 <= n < 15` | `low` | amber | "low confidence" |
| `15 <= n < 50` | `med` | blue | "moderate" |
| `n >= 50` | `high` | green | "high confidence" |

`15` matches `CS_STATE_MATURE_THRESHOLD`. Constants kept in sync.

### 3.4.1 Effect-size guard (epistemic honesty hard rule)

Sample size alone is NOT enough. A 200-game lead with a 51% win rate is statistically indistinguishable from a coin flip. We must guard against the trap of "high-n therefore confident".

**Rule:** Whenever `winRate` is supplied, run a two-sided z-test against the null hypothesis `p = 0.5`:

```
z = (winRate - 0.5) / sqrt(0.25 / n)
if (n >= 50 && Math.abs(z) < EFFECT_SIZE_Z_THRESHOLD):
  tier   = 'inconclusive'
  reason = 'large sample, no detectable edge (|z|=' + z.toFixed(2) + ')'
else:
  tier follows the table above
  reason = 'n=' + n + ', winRate=' + (winRate*100).toFixed(0) + '%'
```

**Constant:**
- `EFFECT_SIZE_Z_THRESHOLD = 1.96` (two-sided 95% CI; configurable in one place)

**Where this applies:**
- `computeLeadPerformance` rows: a high-n lead with no detectable edge over 50% must surface as `inconclusive`, not `high`.
- `detectLossConditions`: lift below threshold + n high should still render as `inconclusive`, not silently disappear.
- Any future detector that produces a rate.

**UI:** `inconclusive` renders as a 5th badge (slate grey, label "inconclusive") so users can see we have data but no signal. This is intentional and good - prevents fake-confident coaching.

**Cross-reference:** `MASTER_PROMPT.md` hard invariants (population qualifier, no fake-confident claims) + `COACHING_NORTH_STAR.md` Section 5 epistemic ground rules.

### 3.5 Severity (for detector output)

Independent of confidence. Severity describes how impactful a finding is; confidence describes how sure we are it's real.

| Detector | Severity rule |
|---|---|
| Dead move | High if avg < 0.05 + n >= 25; med if avg < 0.10 + n >= 15; else low |
| Lead | Severity not used; ranked by n |
| Loss condition | High if lift >= 0.30; med 0.20-0.30; low otherwise |

UI displays both: "**High severity** | High confidence (47 games)".

---

## 4. UI surface

Append five collapsible sections under the existing Record bar on the Strategy tab. Each section header shows total findings + dominant confidence badge. Each row also shows its own badge (inline + section summary placement).

```
[Record bar already shipped]
v Lead Performance (12 leads tracked, high confidence)
   Arcanine | Incineroar    24-14   63%   med
   Garchomp | Whimsicott    18-9    67%   med
   ...
v Likely Loss Patterns (4 detected, high confidence)
   Trick Room unanswered    52% of losses    high severity   high
   Win-condition lost T<5   38% of losses    med severity    med
   ...
v Dead Moves (2 flagged, high confidence)
   Whimsicott - Beat Up      0.04 avg/game over 47 games   high severity   high
   Rotom-Wash - Will-O-Wisp  0.09 avg/game over 47 games   med severity    med
   Whimsicott - Tailwind     0 calls (count=0) over 47 games   low severity   high
v Coverage and Roles (read-only summary from TEAM_META)
   <archetype, speed control, damage profile, role per mon, missing coverage>
```

Empty-state for any section when n < 5:
```
v Lead Performance (insufficient data - run 5+ sims)
```

CSS reuses existing `.cs-record-*` classes. Add `.cs-detector-section`, `.cs-detector-row`, `.cs-confidence-badge` (4 colors), `.cs-detector-empty`.

---

## 5. Implementation plan

| Step | File | Lines (est) |
|---|---|---|
| 1 | Add 4 detector functions to `ui.js` near `computeTeamHistory` | +180 |
| 2 | Extend `detectDeadMoves` to flag count=0 moves (severity `low` if n >= 25) | +25 |
| 3 | Wire detector outputs into `computeTeamHistory` return | +20 |
| 4 | Add 5 collapsible UI sections to `renderStrategyTab` (incl. Coverage & Roles + empty-state placeholders) | +120 |
| 5 | Add CSS for sections + badges + empty-state | +70 |
| 6 | Bump version chip + CACHE_NAME | 2 lines |
| 7 | Headless tests (`tests/phase4c_detectors.js`) | +260 |

Total: ~675 lines added, no engine changes.

---

## 6. Validation tests

Create `tests/phase4c_detectors.js` with three fixtures:

### Fixture A: Small sample (8 games)
- Assert: `confidenceBadge(8) === 'low'`
- Assert: dead move detector returns `[]` (below `DEAD_MOVE_MIN_GAMES`)
- Assert: lead perf returns leads with n >= 5 only
- Assert: loss conditions returns `[]` (below `LOSS_MIN_GAMES`)

### Fixture B: Typical sample (47 games)
- Seed: 30 wins + 17 losses, with TR-unanswered in 9 of 17 losses, 2 of 30 wins
- Assert: `tr_unanswered` flagged with `lift ~= 0.46`, severity `high`
- Assert: at least 1 dead move flagged (a move the seed never plays)
- Assert: lead perf returns 3-5 entries

### Fixture C: Large sample (200 games)
- Validates the **hard invariant** from `MASTER_PROMPT.md`: same advice after 100 battles = failing.
- Seed two halves with **different** dominant loss patterns:
  - First 100: TR unanswered dominant (60% of losses)
  - Second 100: protect overuse dominant (60% of losses)
- Run detectors on first 100 → snapshot output A
- Run detectors on full 200 → snapshot output B
- Assert: `outputA.loss_conditions` and `outputB.loss_conditions` differ by at least 1 condition flag, OR ranking changes

This is the regression test that gates Phase 4c closeout.

### Fixture D: High-n null effect (epistemic honesty regression)
- Seed: 100 games on a single lead pair, 51 wins / 49 losses (essentially a coin flip).
- Compute `confidenceBadge(100, 0.51)`.
- Assert: `tier === 'inconclusive'` (NOT `'high'`).
- Assert: `reason` mentions "no detectable edge" and includes `|z|` value.
- Assert: `Math.abs(z) < 1.96`.
- This guards against the failure mode where a large but flat sample masquerades as high-confidence advice. Any future change that lets a 51% / n=100 case through as `high` fails CI.

---

## 7. Acceptance criteria

A reviewer can mark this phase complete when **all** are true:

1. `node --check ui.js` passes
2. All 3 fixtures in `tests/phase4c_detectors.js` pass headless
3. Manual: load Strategy tab on a team with >= 50 sims; all 4 sections render with confidence badges
4. Manual: each detector output cites sample size and confidence in the UI
5. Bumps version chip + CACHE_NAME
6. PR description answers the 4 north-star questions (`MASTER_PROMPT.md` Phase 5 + 6 north-star coverage section)

---

## 8. Locked decisions (from `@alfredocox` review 2026-04-25)

| # | Decision | Implementation note |
|---|---|---|
| Q1 | **Include Coverage & Roles section** (5th section, read-only TEAM_META) | Add as section 5 under the 4 detector sections |
| Q2 | **Flag count=0 moves** with severity `low` if pokemon has >= 25 games | Extend `detectDeadMoves` to include zero-count case |
| Q3 | **Inline + section summary** confidence badges | Each row shows its badge AND each section header shows dominant badge |
| Q4 | **Show 'insufficient data' placeholder** when n < 5 | Same pattern as Record bar empty-state from PR #121 |

---

## 9. Cross-references

- `PHASE4_DYNAMIC_ADVICE_SPEC.md` - parent spec, Feature 2 + Feature 4
- `COACHING_NORTH_STAR.md` - acceptance criteria 4, 5, 6
- `MASTER_PROMPT.md` - storage keys, `CS_STATE_MATURE_THRESHOLD`, hard invariants
- `ui.js` - `computeTeamHistory` line ~5704, `renderStrategyTab` line ~5024, `csSimLogForTeamBothSides` line ~5634
- Sim-log shape: `MASTER_PROMPT.md` "Storage keys in use"
