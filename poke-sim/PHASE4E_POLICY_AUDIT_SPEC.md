# Phase 4e - Policy Audit + Same-Advice Regression (SPEC)

> **Status:** Ready for review. No code written yet.
> **Author:** Computer (drafted 2026-04-25 for `@alfredocox`)
> **Parent:** `PHASE4_DYNAMIC_ADVICE_SPEC.md` Feature 4 (policy audit) + hard invariant from `MASTER_PROMPT.md`
> **Depends on:** Phase 4c shipped (sim-log detectors must exist), Phase 4d shipped (branch classifications feed the audit)
> **North-star coverage** (from `COACHING_NORTH_STAR.md` Section 2): N§4, N§9, N§13
> **Acceptance criteria moved** (from `COACHING_NORTH_STAR.md` Section 3): #4 (repeated failure pattern detection), #6 (advice changes after 100 sims) - **this phase owns the regression test for #6**

---

## 1. Why Phase 4e

Direct user quote (verbatim, binding):

> If the system gives the same advice after 100 battles, it is failing.

Phase 4c surfaces detector outputs. Phase 4d surfaces line classifications. Neither phase, by itself, proves the **system as a whole** changes its advice as evidence accumulates. Phase 4e is the audit layer that:

1. Detects "fake-good plays" - sequences where the AI's greedy choice scored a KO but lost board state
2. Surfaces repeated player behavior patterns (overprotect, undervaluing positioning, ignoring win-condition mon, etc.)
3. **Owns the regression test** that fails CI if the system gives the same advice on two halves of a 100+ game sample with different dominant loss patterns

**Engine-light.** All work is in `ui.js` plus a new test file. The fake-good detector uses the existing sim log; no engine changes.

---

## 2. Scope

### In scope
1. `detectFakeGoodPlays(simLog, teamKey)` - rule-mined patterns where a KO was scored but Trick Room / Tailwind / win-condition KO was allowed in the same turn
2. `detectPlayerBehaviorPatterns(simLog, teamKey)` - 6 v1 patterns (Section 4)
3. `auditCoachingDelta(adviceA, adviceB, sampleA, sampleB)` - core comparison helper
4. Strategy tab "Policy Audit" collapsible section
5. `tests/phase4e_policy_regression.js` - the same-advice regression suite (THE blocker test)
6. CI guard: regression test must run on every PR

### Out of scope
- Voice / tone (Phase 6)
- Engine policy changes (the AI itself stays greedy in v1; we only audit it)
- Multi-team meta-audit across all teams (v2)

---

## 3. Fake-good play detector

A turn is "fake-good" when the AI registered a KO but the **strategic ledger** got worse on the same turn.

**Pattern definitions (v1):**

| ID | Detection | Plain English |
|---|---|---|
| `ko_but_tr_dropped` | KO event on our side AND opponent landed Trick Room same turn | Got a KO but let TR through |
| `ko_but_tw_expired` | KO event on our side AND our Tailwind expired same turn | Got a KO but lost Tailwind window |
| `ko_but_position_lost` | KO event AND `positionScore_post < positionScore_pre - 0.20` (Phase 5 metric, fall back to "we got KO'd in same turn" pre-Phase-5) | Got a KO but lost board |
| `damage_no_progress` | High damage dealt (>30% HP across opp) AND no KO AND opp progressed their gameplan (TR/TW/setup move) | Spent a turn slapping; they set up |
| `wincon_traded` | Our TEAM_META win-condition mon dealt damage but was KO'd same turn | Traded our wincon for chip |

**Output:**
```js
[
  { pattern: 'ko_but_tr_dropped',
    occurrences: 14, share_of_games: 0.30,
    severity: 'high',                   // see 4c severity rules
    confidence: 'high',
    sample_size: 47,
    example_games: [123, 145, 167] }    // sim-log indices
]
```

**Notes:**
- Pre-Phase-5, `ko_but_position_lost` is a degraded heuristic ("we got KO'd within the same turn"). Phase 5 upgrades it to use `positionScore` from `PHASE5_TURN_LOG_SPEC_DRAFT.md`.
- Severity follows the same rules as `PHASE4C_DETECTORS_SPEC.md` Section 3.5 (high if `share_of_games >= 0.30` AND `n >= 25`, etc.).

---

## 4. Player behavior patterns (v1)

Six rule-mined patterns over the existing sim log. Each is computed once per `Run All` and cached in `team_history`.

| ID | Detection | Plain English |
|---|---|---|
| `overprotect`              | `protectStreakMax >= 3` in >= 25% of games | Over-using Protect (3+ in a row) |
| `undervalue_positioning`   | Average post-T1 `position_path` regression > 0.15 (Phase 5) | Trades position for damage early |
| `ignore_wincon`            | Our wincon mon brought < 60% of games but team archetype = 'wincon-led' | Not bringing the mon the team is built around |
| `lead_inconsistency`       | More than 5 distinct lead pairs across 30+ games AND no lead has `n >= 8` | No clear lead identity |
| `tr_setup_avoidance`       | Team archetype = 'TrickRoom' AND TR set-rate < 60% | Trick Room team rarely sets TR |
| `passive_against_setup`    | >= 30% of games where opponent set up (DD/CM/SD) without us hitting them T1 | Lets setup go unchallenged |

**Output:**
```js
[
  { pattern: 'overprotect',
    occurrences: 18, share_of_games: 0.38,
    severity: 'med', confidence: 'high', sample_size: 47 }
]
```

Patterns surface inside the Policy Audit section with the same severity-vs-confidence presentation as Phase 4c.

---

## 5. The same-advice regression test (BLOCKER)

`tests/phase4e_policy_regression.js`

This test is the **closeout gate** for Phase 4. CI must run it on every PR touching `ui.js` or any spec file.

### Setup
Generate a deterministic 200-game sim log split into two distinct halves:

| Half | Games | Dominant pattern |
|---|---|---|
| A | 1-100  | TR unanswered in 60% of losses, dead move = Beat Up, lead = Arcanine\|Incineroar dominant |
| B | 101-200 | Protect overuse in 60% of losses, dead move = Will-O-Wisp, lead = Garchomp\|Whimsicott dominant |

### Assertions
```js
adviceA = computeFullAdvice(simLog.slice(0, 100))
adviceB = computeFullAdvice(simLog.slice(0, 200))   // includes both halves

// Different at the surface that matters most:
assert(adviceA.recommended_line !== adviceB.recommended_line)
  OR
assert(adviceA.dominant_loss_condition !== adviceB.dominant_loss_condition)
  OR
assert(setSymmetricDiff(adviceA.dead_moves, adviceB.dead_moves).size > 0)

// At least 2 of these 3 must hold:
let surfaces_changed = 0
if (adviceA.recommended_line !== adviceB.recommended_line) surfaces_changed++
if (adviceA.dominant_loss_condition !== adviceB.dominant_loss_condition) surfaces_changed++
if (setSymmetricDiff(adviceA.dead_moves, adviceB.dead_moves).size > 0) surfaces_changed++
assert(surfaces_changed >= 2, 'Advice did not adapt across 100 new battles')
```

### Failure messaging
Test failure must print:
- The 3 surface diffs side-by-side
- The dominant loss condition counts in each half
- The seed used (so the dev can reproduce locally)

### Why it gates Phase 4 closeout
This is the only test that proves the **system as a whole** is adaptive. Detectors can pass their unit tests (Phase 4c), the solver can pass its unit tests (Phase 4d), and yet the rolled-up advice could still be invariant. That would violate the user's hard invariant. This test catches that.

---

## 6. `auditCoachingDelta(adviceA, adviceB, sampleA, sampleB)` helper

Pure function exposed in `ui.js`. Used by:
- The regression test in Section 5
- The Policy Audit UI section (compares advice now vs advice 100 games ago)

**Returns:**
```js
{
  surfaces_changed: 2,                        // how many top-level fields differ
  diffs: {
    recommended_line: { from: 'safe', to: 'aggressive' },
    dominant_loss_condition: { from: 'tr_unanswered', to: 'protect_overuse_loss' },
    dead_moves_added: ['Whimsicott:Beat Up'],
    dead_moves_removed: ['Rotom-Wash:Will-O-Wisp']
  },
  verdict: 'adaptive' | 'static',             // static if surfaces_changed === 0 and sampleB - sampleA >= 50
  delta_sample_size: 100
}
```

**Verdict rule:** `static` if `surfaces_changed === 0` AND `delta_sample_size >= 50`. Anything else is `adaptive`. The Policy Audit UI surfaces a banner on `static` - color depends on team state (see Section 7).

**Two-threshold model (locked Q4 2026-04-25):**
- **Live UI banner fires at delta_sample_size >= 50** (catches problems early)
- **Regression test (T5) gate fires at delta_sample_size = 100** (matches the user's hard invariant)
- The two thresholds serve different purposes: live = early-warning surface, CI = contract enforcement

---

## 7. UI surface (Strategy tab)

Append a 5th collapsible section under Phase 4c's four sections:

```
v Policy Audit (47 games, high confidence)
   Adaptive (advice changed after last 25 games):
     Recommended line:  Safe -> Aggressive
     Dominant loss:     TR unanswered -> Protect overuse
   Fake-good plays:
     KO but TR dropped     14 occurrences (30% of games)   high severity
     Wincon traded         8 occurrences (17% of games)    med severity
   Player behavior:
     Overprotect           18 occurrences (38%)            med severity
     Lead inconsistency    flagged                         low severity
```

If the audit verdict is `static`, banner color depends on team state (locked Q3 2026-04-25):

**Red banner** (system likely broken) - fires when ANY of:
- Recent loss rate > 40% (advice should be updating)
- Detector outputs are empty arrays (no signal coming through)
- 100+ games with zero advice change (hits hard invariant threshold)

```
v Policy Audit  [! STATIC ADVICE WARNING]
  System gave the same advice across the last 50 games.
  This usually means: not enough new patterns detected, OR a detector is broken.
  Seed for repro: <hash>
```

**Yellow banner** (system has stabilized, may be legitimate) - fires when:
- Win rate >= 60%
- Detector outputs are non-empty
- 50-99 games with no advice change

```
v Policy Audit  [STABILIZED]
  System has stabilized on this advice (50+ games, 64% win rate).
  Advice will reactivate if win rate drops or new patterns emerge.
  Seed for repro: <hash>
```

CSS reuses Phase 4c badges + adds `.cs-audit-warning` (red banner) and `.cs-audit-stabilized` (yellow banner).

---

## 8. Implementation plan

| Step | File | Lines (est) |
|---|---|---|
| 1 | `detectFakeGoodPlays` in `ui.js` | +130 |
| 2 | `detectPlayerBehaviorPatterns` in `ui.js` | +180 |
| 3 | `auditCoachingDelta` helper | +60 |
| 4 | Wire outputs into `team_history` | +20 |
| 5 | Policy Audit UI section | +100 |
| 6 | CSS (red + yellow banner + section) | +40 |
| 7 | `tests/phase4e_policy_regression.js` | +260 |
| 8 | Bump version chip + CACHE_NAME | 2 lines |

Total: ~780 lines added, no engine changes.

---

## 9. Validation tests

### T1 - Fake-good detection
Seed: 30 games where 10 have a KO+TR-allowed pattern. Assert `ko_but_tr_dropped.occurrences === 10`.

### T2 - Behavior pattern - overprotect
Seed: 20 games with `protectStreakMax >= 3` in 8 of them. Assert `overprotect` flagged with `share_of_games = 0.40`.

### T3 - `auditCoachingDelta` static detection
Same advice both sides, `delta_sample_size = 50`. Assert `verdict === 'static'`.

### T4 - `auditCoachingDelta` adaptive detection
Different `recommended_line`. Assert `verdict === 'adaptive'`, `surfaces_changed === 1`.

### T5 - **THE same-advice regression test** (Section 5)
THE blocker. Must pass on every PR.

### T6 - Empty log safety
`detectFakeGoodPlays([])` returns `[]` without throwing. `auditCoachingDelta(empty, empty, 0, 0)` returns `verdict: 'adaptive'` (vacuously - no claim of staticness without data).

---

## 10. Acceptance criteria

A reviewer can mark this phase complete when **all** are true:

1. `node --check ui.js` passes
2. All 6 tests in `tests/phase4e_policy_regression.js` pass headless
3. **T5 (same-advice regression) is wired into CI** and blocks merge
4. Manual: load Strategy tab on a team with >= 50 sims; Policy Audit section renders with at least one fake-good or behavior pattern flagged
5. Manual: deliberately seed a static log (rerun `Run All` on identical state); STATIC ADVICE WARNING banner shows
6. Bumps version chip + CACHE_NAME
7. PR description must answer: "What test guarantees the system gives different advice after 100 new battles?" with a link to the test

---

## 11. Locked decisions (from `@alfredocox` review 2026-04-25)

| # | Decision | Implementation note |
|---|---|---|
| Q1 | **Banner only**, no auto-issue | Banner includes seed hash for manual repro. Avoids issue spam on recurring root causes |
| Q2 | **Fixed seed** for T5 regression test | Hard-coded in `tests/phase4e_policy_regression.js`. Rotated manually if overfitting suspected. Random seeds in CI = flaky tests = ignored tests |
| Q3 | **Soft yellow 'stabilized' banner** for legitimate stable teams | Yellow tone (not red) when win-rate high + detector outputs non-empty. Red banner reserved for likely-broken state. See Section 7 for both variants |
| Q4 | **Live UI at 50, regression test at 100** | Two-threshold model: live banner = early warning at 50; CI regression = invariant enforcement at 100. See Section 6 |
| Q5 | **Aggregated v1, per-mon v2** for fake-good play attribution | Ship working aggregated detection first; per-mon attribution adds ~80 lines + complexity |

---

## 12. Cross-references

- `PHASE4_DYNAMIC_ADVICE_SPEC.md` - parent spec, Feature 4
- `PHASE4C_DETECTORS_SPEC.md` - depends on detector outputs + confidenceBadge
- `PHASE4D_THREAT_RESPONSE_SPEC.md` - depends on `recommended_line` and `consistency_score`
- `PHASE5_TURN_LOG_SPEC_DRAFT.md` - upgrades `ko_but_position_lost` from heuristic to `positionScore`
- `COACHING_NORTH_STAR.md` - acceptance criteria 4, 6
- `MASTER_PROMPT.md` - hard invariant ("If the system gives the same advice after 100 battles, it is failing")
- `ui.js` - `computeTeamHistory`, `renderStrategyTab`
