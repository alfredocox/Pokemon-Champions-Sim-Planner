# Phase 4d - Threat Response Solver (SPEC)

> **Status:** Ready for review. No code written yet.
> **Author:** Computer (drafted 2026-04-25 for `@alfredocox`)
> **Parent:** `PHASE4_DYNAMIC_ADVICE_SPEC.md` Feature 3 (Branch-aware threat response)
> **Depends on:** Phase 4c shipped (detectors + confidence) so we have grounded loss conditions to weigh branches against
> **North-star coverage** (from `COACHING_NORTH_STAR.md` Section 2): N§3, N§4, N§7
> **Acceptance criteria moved** (from `COACHING_NORTH_STAR.md` Section 3): #1 (per-matchup line is best response, not best lead), #3 (each line classified as strong/stable/volatile/losing)

---

## 1. Why Phase 4d

Today the simulator picks a single greedy line per matchup and reports the lead pair. There is no notion of "what is our best response to *their* threat?" If the opponent has Trick Room + Choice-Scarf attackers, there are at least 4 distinct strategic lines the player could try, and we currently surface none of them.

Phase 4d adds a Monte Carlo solver that explores **4 fixed strategic branches** per matchup, simulates each at a fixed budget, and classifies the outcomes. The output drives a "Recommended line + 3 alternatives" UI block per matchup.

**Engine-light.** All work is in `ui.js`. The solver calls `simulateBattle()` repeatedly with branch-specific lead and bring constraints. Engine code is not modified.

---

## 2. Scope

### In scope
1. `solveThreatResponse(teamKey, oppKey, opts?)` - returns 4 classified branches
2. Branch definitions: `safe`, `aggressive`, `counter`, `defensive` (Section 3)
3. Line classification v1: 4 buckets (`strong | stable | volatile | losing`)
4. Per-matchup UI block in Pilot Guide showing recommended line + 3 alternatives
5. `Run All Matchups` budget guard so total runtime stays within 1-2 min on a typical laptop
6. Headless tests for the solver and the classifier

### Out of scope
- Per-turn explanations (Phase 5)
- Coaching voice / wording (Phase 6)
- Detector logic (Phase 4c)
- Engine-level lookahead changes (post-Phase 5 candidate)

---

## 3. Branch definitions

Each branch is a constraint set on the inputs to `simulateBattle()`. The solver rolls N sims per branch and aggregates.

| Branch | Lead-selection rule | Bring rule | Move-selection bias (post Phase 5; today: greedy AI) |
|---|---|---|---|
| `safe` | Highest aggregate `lead_performance` win-rate from Phase 4c (default) | TEAM_META default bring | none |
| `aggressive` | Lead pair with highest **average damage dealt T1-T2** in sim log | Drop slowest support, bring secondary attacker | none |
| `counter` | Lead pair scoring highest on the typing matrix vs the opponent's likely lead (TEAM_META) | Drop pivot, bring redundant counter | none |
| `defensive` | Lead pair with highest **damage taken / damage dealt ratio survival** in sim log | Bring extra speed control or screens setter | none |

If the data needed for a branch does not exist (e.g. no Phase 4c sample for `safe`), the branch is generated from TEAM_META defaults and flagged `data: 'meta-only'` so the UI can soften the recommendation.

---

## 4. Solver API

```js
solveThreatResponse(teamKey, oppKey, opts = {})
```

**Default opts:**
```js
{
  simsPerBranch:  200,        // user-locked: 200 sims/branch x 4 branches
  rngSeed:        null,       // pass for deterministic CI runs
  branches:       ['safe','aggressive','counter','defensive'],
  budgetMsTotal:  120000,     // 2 min hard ceiling for Run All
}
```

**Returns:**
```js
{
  teamKey, oppKey,
  population: 'ai_vs_ai_greedy',     // EPISTEMIC HONESTY: every solver output is annotated
                                      // with the population it was measured against. Required
                                      // for Phase 6 voice rule #5 (population qualifier within
                                      // 1 sentence of any %). v2 candidates: 'ai_vs_ai_smarter',
                                      // 'replay_calibrated', 'tournament_aligned'.
  branches: [
    {
      id: 'safe',
      lead: ['Arcanine','Incineroar'],
      bring: ['Arcanine','Incineroar','Garchomp','Whimsicott'],
      n: 200,
      w: 122, l: 78,                 // no draws
      win_rate: 0.61,
      avg_damage_dealt: 412,
      avg_damage_taken: 388,
      consistency_score: { rng_dependency: 0.42, variance: 0.18 },
      classification: 'stable',      // see 5
      data: 'phase4c' | 'meta-only',
      confidence: { tier: 'med', reason: 'n=200, winRate=61%' }  // from confidenceBadge(n, winRate)
    },
    ...
  ],
  best_candidate: 'safe',             // RENAMED from 'recommended' for epistemic honesty.
                                      // We surface candidates, not directives. Phase 6 voice
                                      // rule #6 enforces "consider" / "best candidate" wording.
  generatedAt: 1714080000000
}
```

---

## 5. Line classification v1

Every branch is classified into one of four buckets. The rules are deterministic so the classifier itself is testable.

| Bucket | Rule | Plain English |
|---|---|---|
| `strong`   | `win_rate >= 0.65` AND `n >= 200` AND `\|z\| >= 1.96` (effect-size guard from 4c §3.4.1) AND `consistency_score.variance <= 0.20` | High win rate AND repeatable AND statistically distinguishable from a coin flip |
| `stable`   | `win_rate >= 0.55` AND `consistency_score.variance <= 0.30` | Above-even AND still repeatable |
| `volatile` | `win_rate >= 0.50` BUT `variance > 0.30` OR `rng_dependency > 0.6` | Wins more often than not but coin-flippy |
| `losing`   | `win_rate < 0.50` | Below 50% over the sample |

**Epistemic honesty:** the `strong` bucket has the strictest gate. A 65% win rate at n=50 is NOT `strong` (insufficient sample). A 51% win rate at n=200 is NOT `strong` (no detectable effect). Both fall through to `volatile` or `stable` depending on variance. This prevents the failure mode where a noisy or under-powered branch gets sold as the obvious winner.

**Best-candidate selection rule** (note: `best_candidate`, not `recommended` - we surface candidates, not directives):
1. Best classification wins (`strong` > `stable` > `volatile` > `losing`)
2. If two or more branches tie at `strong`, **all are co-surfaced as candidates** (user-locked decision 2026-04-25 Q2). UI shows them side-by-side in priority order (lower variance first).
3. For `stable`/`volatile`/`losing` ties: pick one. Higher `win_rate` wins, then lower `variance`, then alphabetical branch id.
4. Co-candidacy applies only to the `strong` bucket. Two `stable` branches do not co-surface - this prevents hedge-y output.

**Sample-size guard:** Branch with `n < 30` is annotated `low_sample` and never marked `recommended` even if its raw win rate is highest. The next-best non-low-sample branch is recommended instead, and the UI shows "data not yet ready" on the low-sample branch.

---

## 6. `consistency_score`

Lightweight structure exposed by the solver and reused by Phase 6 RNG-blame gating.

```js
consistency_score: {
  rng_dependency: 0..1,    // share of wins where >= 1 crit / miss / freeze flipped a turn
  variance:       0..1,    // sd of damage dealt per turn / mean (capped to 1)
}
```

**rng_dependency** is computed from the sim log: count games where `rngFlips >= 1` swung the turn outcome / total wins.
**variance** is the coefficient of variation on per-turn damage.

Phase 6 voice rule: only blame RNG if `consistency_score.rng_dependency > 0.6`. This number must come from this struct, not from a vibe check.

---

## 7. Budget and runtime

User-locked: **200 sims/branch x 4 branches = 800 sims/matchup**.

For a 12-matchup `Run All`: 9,600 sims. On the current single-threaded `simulateBattle()` (~6-12 ms/game in dev), expected wall time is roughly 60-120 s. We add a hard `budgetMsTotal` ceiling (default 120 s for Run All, 30 s for a single matchup) and clip remaining branches with `n_clipped < 200`, marking them `low_sample`.

**Progress indicator:** existing Run All spinner shows "matchup X of Y, branch B of 4". No new spinner work.

**Determinism for CI:** if `rngSeed` is supplied, all branches share a derivable seed (`hash(seed, branch_id, sim_idx)`). Used by tests in Section 9.

---

## 8. UI surface (Pilot Guide tab, per matchup card)

```
[Existing matchup header bar]
RECOMMENDED LINE: Safe (61% over 200, stable)
  Lead   : Arcanine | Incineroar
  Bring  : Arcanine, Incineroar, Garchomp, Whimsicott
  Why    : Highest win rate among lines that classify as 'stable' or better.

CO-RECOMMENDED (only when 2+ branches classify 'strong' - locked Q2):
  Safe       (68% over 200, strong, variance 0.14)
  Aggressive (66% over 200, strong, variance 0.21)
  Why    : Both classify 'strong'. Pick by playstyle preference.

ALTERNATIVES
  Aggressive  58% over 200    volatile (high RNG)    [tap to expand]
  Counter     49% over 200    losing                 [tap to expand]
  Defensive   54% over 200    stable                 [tap to expand]
```

Tap-to-expand reveals: lead, bring, classification reason, sample size, confidence badge.

CSS reuses Phase 4c badge classes. Add `.cs-line-card`, `.cs-line-recommended`, `.cs-line-alt`.

---

## 9. Implementation plan

| Step | File | Lines (est) |
|---|---|---|
| 1 | `solveThreatResponse` core in `ui.js` near `runAllMatchups` | +160 |
| 2 | Branch lead/bring resolvers (4 functions, one per branch) | +120 |
| 3 | Line classifier + `consistency_score` computation | +60 |
| 4 | Run All wiring + budget guard | +40 |
| 5 | Pilot Guide UI block per matchup | +120 |
| 6 | CSS | +50 |
| 7 | Headless tests (`tests/phase4d_threat_response.js`) | +280 |
| 8 | Bump version chip + CACHE_NAME | 2 lines |

Total: ~830 lines added, **no engine.js changes**.

---

## 10. Validation tests

`tests/phase4d_threat_response.js`:

### T1 - Branch isolation
With `rngSeed=1`, run `solveThreatResponse('player','mega_altaria')`. Assert: 4 branches returned, each `n=200`, each branch's `lead` differs from at least one other branch's `lead` (otherwise the branches are not exploring distinct strategies).

### T2 - Classifier determinism
Stub a fake `branchResult` with `win_rate=0.66, variance=0.15` and assert `classifyLine(...) === 'strong'`. Repeat for 8 boundary cases at the rule edges.

### T3 - Recommendation tie-break
Construct 2 branches with identical win rate, different variance. Assert lower-variance branch is `recommended`.

### T4 - Low-sample guard
Force one branch to `n=20` (other 3 at `n=200`). Assert that branch never wins `recommended` even when its win rate is the highest.

### T5 - Budget guard
Set `budgetMsTotal=500`. Assert solver returns within 700 ms wall clock and any unfinished branches are marked `low_sample`.

### T6 - Determinism
Same seed, two runs - identical `branches[*].win_rate`. Required for CI stability.

---

## 11. Acceptance criteria

A reviewer can mark this phase complete when **all** are true:

1. `node --check` passes on `ui.js`
2. All 6 tests in `tests/phase4d_threat_response.js` pass headless
3. Manual: open Pilot Guide on a team with Phase 4c data; every matchup shows 1 recommended + 3 alternatives, each with classification + confidence
4. Manual: `Run All Matchups` finishes in <= 120 s on a typical laptop with 12 matchups
5. Bumps version chip + CACHE_NAME
6. PR description shows a sample classifier output and explicitly answers: "Does the recommended line ever change between two consecutive Run-All passes? If yes, why? If no, what guards prevent flapping?"

---

## 12. Locked decisions (from `@alfredocox` review 2026-04-25)

| # | Decision | Implementation note |
|---|---|---|
| Q1 | **Bring-swap only** for `aggressive` branch | No item changes; item-decision layer is post-Phase-5 scope |
| Q2 | **Co-recommend** when 2+ branches tie at `strong` | UI block shows both side-by-side, ordered by lower variance first. Applies only to `strong` bucket |
| Q3 | **Phase 4c data first**, TEAM_META fallback | `counter` branch reads opponent's actual leads from sim log; falls back to TEAM_META if no Phase 4c sample exists. Branch flagged `data: 'meta-only'` on fallback |
| Q4 | **Hide consistency_score numbers**, show classification + hover tooltip | Numbers still drive classification + Phase 6 voice gating internally |
| Q5 | **Background re-queue** clipped matchups via `requestIdleCallback` | Only if tab stays open; no aggressive retries; `low_sample` marker disappears when complete |

---

## 13. Cross-references

- `PHASE4_DYNAMIC_ADVICE_SPEC.md` - parent spec, Feature 3
- `PHASE4C_DETECTORS_SPEC.md` - data dependency for `safe` and `defensive` branches
- `COACHING_NORTH_STAR.md` - acceptance criteria 1, 3
- `MASTER_PROMPT.md` - `CS_STATE_MATURE_THRESHOLD`, sim-log shape, `Run All` flow
- `ui.js` - `runAllMatchups` line ~3940, `simulateBattle` callsite line ~3812
- `engine.js` - `simulateBattle` line ~1087, return shape line ~2196 (read-only dependency)
