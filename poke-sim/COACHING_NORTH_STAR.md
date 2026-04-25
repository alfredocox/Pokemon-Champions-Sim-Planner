# Coaching North Star

> **Standing brief.** Every coaching-layer PR (Phase 4+) is checked against this document. If a PR moves the engine measurably closer to the criteria in Section "Acceptance Criteria" below, ship it. If not, push back. This file is updated when the bar moves, never to lower it.

**Owner:** Alfredo Cox (`@alfredocox`)
**Established:** 2026-04-25 (this conversation)
**Related specs:**
- `PHASE4_DYNAMIC_ADVICE_SPEC.md` (state machine + threat response + policy audit)
- `PHASE5_TURN_LOG_SPEC_DRAFT.md` (structured turn log + position score + win-prob delta)
- `MASTER_PROMPT.md` (rollout table)

---

## 1. The bar (verbatim, user direction)

> You are building an elite Pokemon Champions ranked competitive battle simulation and coaching engine.
>
> Your purpose is not just to simulate battles or calculate damage. Your purpose is to discover truth:
> - Why games are won
> - Why games are lost
> - What decisions actually matter
> - What habits make players lose
> - What changes will make them win consistently
>
> This system must function as a world-class competitive Pokemon coach, analyst, and simulator combined.

The full original spec is preserved in `Section 9 - Original Spec` at the end of this file. The sections below summarize each demand, classify the gap against current implementation, and tie each to a concrete rollout phase.

---

## 2. Honest classification of demand vs. reality (validated 2026-04-25)

Grounded against `engine.js` (`simulateBattle()` line 1087, `selectMove()` line 1230, return shape line 2196) and `ui.js` (`runBoSeries` line 1858, sim-log writer line 1907). Not a wishlist - this is an inventory.

| # | Spec demand | Today's reality | Gap kind | Lands in |
|---|---|---|---|---|
| 1 | Core objective: discover truth, not raw data | Aspiration, not testable until 2-7 ship | Direction | All phases |
| 2 | Play-by-play turn log: HP%, status, field, speed order, position score, win prob delta, "why position changed" | `log: string[]` unstructured. Has `koEvents`, `movesUsed`, `protectStreakMax` only | **Engine refactor** | Phase 5 |
| 3 | Simulate all viable lines: safe, aggressive, counter, pivot, protect, double-target, speed-denial, setup-denial | One greedy line per `simulateBattle`. No branching, no lookahead, no line enumeration | **Engine work** (bounded version) | Phase 4d (4 branches x 200 sims), Phase 5 (full tree) |
| 4 | Line classification: strong / stable / playable / volatile / fake-good / losing / catastrophic | No lines exist to classify | Blocked by 3 | Phase 4d (4 buckets), Phase 5 (7 buckets) |
| 5 | Bad / fake-good plays + failed trades + missed win conditions | Detectable only with structured turn log + line tree | Blocked by 2, 3 | Phase 4e (rule-mining over sim log), Phase 5 (fake-good detector) |
| 6 | Pattern detection across games (frequency, severity, correction) | `team_history.dead_moves` and `common_loss_conditions` are stubbed, not populated | **Plumbing** | Phase 4c |
| 7 | Win condition engine: predicted primary/secondary win + loss conditions per matchup | Only end-of-game `winCondition` string. No predictive layer | **New analysis layer** | Phase 4d (post-hoc), Phase 5 (predictive) |
| 8 | Matchup intel: best lead (3 max), worst lead, opp likely leads, T1-T3 plan, midgame, endgame | Theory-only today; lead recommendations are static heuristics | **New analysis layer** | Phase 4c (lead perf table), Phase 4d (T1-T3 plan from line tree) |
| 9 | Team structure: archetype, speed control, damage profile, role per mon, dead moves, missing coverage, structural weaknesses | TEAM_META covers archetype + roles. Dead-move detector pending | Mostly **plumbing** | Phase 4c |
| 10 | Post-match analysis: turning point turn, root cause, visible mistake, hidden mistake, best alt, exec vs build | None today. Inline pilot card is end-of-series verdict only | Blocked by 2 | Phase 4e (rough), Phase 5 (full turning-point) |
| 11 | Coaching philosophy: brutally honest, evidence-backed, no RNG excuse, decision-focused | Tone is neutral / generic. No style guide | **Editorial + guardrails** | Phase 6 |
| 12 | Output structure per match: PRE / IN / POST with specific fields | Pilot Guide + Strategy tab cover ~30% of layout | **Plumbing** | Phase 6 (templates) |
| 13 | Final objective: expose habits, teach decisions, improve consistency | Aspiration | Direction | All phases |

**Summary:**
- ~15% already done (1, 6 partial, 9 partial)
- ~25% is plumbing on existing data (rest of 6, 8 light, 9, 10 light, 12)
- ~60% requires `engine.js` changes (2, 3, 4, 5, 7 predictive, 10 full, 11 voice layer)

---

## 3. Acceptance criteria (the bar a PR must clear to claim "top 1% sim")

A PR or phase claims it advanced the system toward the north star **only if** it makes at least one of these demonstrably true via headless test or fixture:

1. The system records *what changed* in board state turn-over-turn, not just *what was logged*.
2. The system can articulate **why** a game was won or lost in terms of one specific turn or sequence.
3. The system can identify a play as fake-good (short-term win, long-term loss probability drop) with a numeric delta.
4. The system can detect a **repeated** failure pattern across N games and tie it to a behavior, not a Pokemon.
5. The system surfaces coaching that cites the data behind it (sample size + observed frequency + counterfactual).
6. After 100 sims with distinct loss patterns, the advice surface is measurably different from the advice after 10 sims. (Hard invariant from `MASTER_PROMPT.md`.)

A PR that only adds detectors or only renames things without moving any of the six bars above is plumbing - fine to merge, but does not count as advancing the north star.

---

## 4. Validated rollout (decisions locked 2026-04-25)

| Phase | Spec coverage | Effort | Status |
|-------|---------------|--------|--------|
| 4c | 6, 8 light, 9 (dead moves + lead perf + loss conditions + confidence) | Days, no engine changes | Next |
| 4d | 3 bounded (4 branches), 4 (4-bucket), 7 post-hoc, 8 T1-T3 plan | 200 sims/branch x 4 branches/matchup. ~1-2 min Run All. | Scoped |
| 4e | 5, 6, 10 rough, hard invariant 6 | Rule-mining over sim log + regression test | Scoped |
| **5** | **2, 4 full, 5 fake-good, 7 predictive, 10 full** | **Engine refactor: `log: string[]` -> `turnLog: Turn[]`. positionScore() heuristic. winProbabilityDelta micro-rollouts.** | **Drafted in PHASE5_TURN_LOG_SPEC_DRAFT.md** |
| **6** | **11, 12** | **Style guide + output templates + RNG-blame guardrail. Optional fine-tuned prompt for inline pilot card.** | **Spec doc TBD after Phase 5 lands** |

---

## 5. Decisions locked

These are not up for re-debate without a written ADR overriding them.

1. **Staged, not parallel.** Phase 4c -> 4d -> 4e -> 5 -> 6. No long-lived parallel branches that fight at merge time. (User direction 2026-04-25.)
2. **Phase 4d sim budget:** 200 sims/branch x 4 branches/matchup. Run All bumps to ~1-2 min on average hardware. The full ~5000 sim/matchup tree is opt-in "Deep Coach" only, deferred to Phase 5+.
3. **Coaching voice:** direct + grounded + evidence-backed. RNG blame is gated on `consistency_score.rng_dependency > 0.6`. We cite the data when criticizing. We do not soften when the signal is strong; we do not sharpen when sample size is below the State 3 threshold (15).
4. **No data fabrication across storage keys.** Phase 3 aggregate snapshots will never be synthesized into Phase 4 sim-log entries. Empty-state guidance only. (`MASTER_PROMPT.md` invariant.)
5. **No draws surfaced.** Pokemon has no draws (per user). Draws may be stored in raw log but never render as W-L-D triple.
6. **"Same advice after 100 battles = failing."** Phase 4e MUST ship a regression test that proves advice diverges between a 10-series and 100-series log with distinct loss patterns. Blocks Phase 4 closeout.

---

## 6. What this is NOT

- Not a promise to ship every spec section. Some (full §3 line enumeration at full depth) require compute we are explicitly deferring.
- Not a tone permission slip. Brutal != hostile. Brutal here means specific, evidence-backed, and unwilling to blame variance unless variance is in fact the issue.
- Not a static document. When the bar moves, edit this file in the same PR that moves it. Never lower the bar without a written ADR.

---

## 7. Cross-references

- Engine entry: `engine.js` `simulateBattle()` line ~1087, return shape line ~2196
- AI selector: `engine.js` `selectMove()` line ~1230 (single-shot greedy, the source of "no line enumeration" today)
- Sim log writer: `ui.js` `runBoSeries()` line ~1858, sim-log append line ~1907
- Adaptive state machine: `ui.js` `computeTeamHistory()` line ~5704
- Sim log shape: `MASTER_PROMPT.md` section "PHASE 4 - ADAPTIVE COACHING"
- Storage keys: `MASTER_PROMPT.md` section "Storage keys in use"

---

## 8. How to use this doc in PRs

Every coaching-layer PR description must answer:

1. Which numbered demand from Section 2 does this advance?
2. Which acceptance criterion in Section 3 does it move? (One of the six.)
3. If none of the above - is this plumbing or refactor? Say so explicitly.
4. What is the headless test that proves it?

If a PR cannot answer 1, 2, and 4, it does not get the "north-star" label. It can still merge as plumbing.

---

## 9. Original spec (preserved verbatim)

The full text of the standard the user set on 2026-04-25:

> You are building an elite Pokemon Champions ranked competitive battle simulation and coaching engine.
>
> Your purpose is not just to simulate battles or calculate damage. Your purpose is to discover truth:
> - Why games are won
> - Why games are lost
> - What decisions actually matter
> - What habits make players lose
> - What changes will make them win consistently
>
> This system must function as a world-class competitive Pokemon coach, analyst, and simulator combined.
>
> SECTION 1 - CORE OBJECTIVE
> The engine must:
> 1. Simulate battles across all viable decision paths
> 2. Record detailed play-by-play data
> 3. Identify winning lines and losing lines
> 4. Detect fake-good plays (short-term success, long-term failure)
> 5. Detect bad plays that consistently lead to losses
> 6. Identify player mistake patterns across games
> 7. Evaluate team structure and matchup viability
> 8. Provide brutally honest coaching feedback
> 9. Improve player decision-making, not just knowledge
> The system must prioritize decision clarity, not raw data.
>
> SECTION 2 - PLAY-BY-PLAY DATA COLLECTION
> For every simulated battle, record each turn with full state tracking:
> - Turn number
> - Active Pokemon (both sides)
> - Remaining Pokemon (both sides)
> - HP percentages
> - Status conditions
> - Field effects (weather, terrain)
> - Speed control states (Tailwind, Trick Room, etc.)
> - Remaining turns of field effects
> - Protect usage history
> - Revealed moves
> - Revealed items
> - Speed order
> - Legal move options
> - Player action chosen
> - Opponent action chosen
> - Damage dealt (including spread modifiers)
> - KO events
> - Switch events
> - Status changes
> - Board state before action
> - Board state after action
> - Position score (before and after)
> - Win probability (before and after)
> - Explanation of why the position improved or worsened
> The system must identify:
> - The exact turn where the match became winning or losing
> - The cause of that shift
>
> SECTION 3 - SIMULATION REQUIREMENTS
> The engine must simulate:
> - All legal lead combinations
> - All likely opponent lead combinations
> - Safe lines (low risk)
> - Aggressive lines (high pressure)
> - Counter lines (anti-meta or anti-lead)
> - High-risk / high-reward lines
> - Defensive pivot lines
> - Protect-based lines
> - Double-target lines
> - Speed control denial lines
> - Setup denial lines
> - Endgame preservation lines
> Simulations must cover:
> - First-turn decisions
> - Multi-turn sequences (minimum 2-4 turns deep)
> - Endgame scenarios
> - Weather control interactions
> - Trick Room interactions
> - Speed control dynamics
> Each simulated path must be classified.
>
> SECTION 4 - LINE CLASSIFICATION
> Every simulated line must be labeled as one of:
> - Strong winning line
> - Stable winning line
> - Playable line
> - Volatile line
> - Fake-good line
> - Losing line
> - Catastrophic line
> Definitions:
> Fake-good line: A line that appears successful short-term but reduces long-term win probability. Examples: getting a KO while allowing Tailwind or Trick Room; dealing damage but losing position or win condition; protecting safely while allowing opponent setup; removing the wrong Pokemon target.
> Catastrophic line: A line that immediately leads to a losing position unless opponent misplays heavily.
>
> SECTION 5 - BAD PLAY AND MISTAKE DATASETS
> The system must explicitly collect and store:
> A. Bad plays - Actions that consistently lead to losses (with explanation + better alternative)
> B. Fake-good plays - Plays that feel correct but lead to losing game states
> C. Failed trades - Favorable short-term exchanges that lose long-term structure
> D. Missed win conditions - Failure to preserve or enable the correct win path
> E. Lead failures - Leads that consistently result in losing Turn 1 or early disadvantage
>
> SECTION 6 - PATTERN DETECTION
> Across simulations and matches, identify repeated player failure patterns:
> Examples: overcommitting Turn 1, ignoring speed control threats, allowing Trick Room without contest, chasing damage instead of position, misusing Protect (too early, too often, or wasted), targeting incorrect threats, failing to preserve win-condition Pokemon, switching too late or not at all, overvaluing super-effective damage, undervaluing positioning tools.
> Each pattern must include: frequency, impact severity, description, coaching correction rule.
>
> SECTION 7 - WIN CONDITION ENGINE
> For every matchup determine: primary win condition, secondary win condition, required setup conditions, required Pokemon preservation, required board state conditions. Also: primary loss condition, critical failure triggers (e.g., Trick Room, Tailwind, status landing). Engine must clearly state "What must happen for you to win" and "What must not happen for you to lose".
>
> SECTION 8 - MATCHUP INTELLIGENCE
> For each matchup: estimate win probability; identify best lead (max 3 - safe / aggressive / counter); worst lead; opponent's most likely lead patterns; early-game plan (Turns 1-3); midgame transition; endgame win path.
>
> SECTION 9 - TEAM STRUCTURE ANALYSIS
> For each team: archetype, speed control tools, damage profile, defensive core + resist coverage, pivot tools, role per Pokemon (lead / sweeper / support / pivot / disruptor / win condition / sacrifice piece). Flag dead moves, low-value items, redundant roles, missing coverage, structural weaknesses vs common archetypes.
>
> SECTION 10 - POST-MATCH ANALYSIS
> For every match: result, key turning point (specific turn), root cause of outcome, visible mistake, hidden strategic mistake, best alternative decision, whether issue was execution or team-building. Plus: most common losing line in that matchup, one team-building recommendation, one behavior change recommendation.
>
> SECTION 11 - COACHING PHILOSOPHY
> Brutally honest. Avoid generic advice. Avoid unnecessary praise. Avoid blaming RNG unless it is the dominant factor. Focus on decision-making errors and strategic misunderstandings. Explain what the player failed to understand. Tone: a top competitive player reviewing your game and telling you exactly why you lost and how to fix it.
>
> SECTION 12 - OUTPUT STRUCTURE PER MATCH
> PRE-MATCH: matchup win probability, best lead options (3 max), worst lead, primary win condition, primary loss condition, Turn 1 plan.
> IN-MATCH (per turn): threat assessment (what KOs what), speed order clarity, position score, decision categories (Safe / Pressure / Greedy).
> POST-MATCH: root cause of loss/win, 3-5 key mistakes, 1 structural team flaw, 1 behavioral improvement.
>
> SECTION 13 - FINAL OBJECTIVE
> The system must expose bad habits, reveal hidden mistakes, teach decision-making under pressure, improve consistency across matchups, turn players into high-level competitive thinkers. If the system only reports data, it has failed. If the system teaches players what they did wrong, why it was wrong, and how to fix it, it has succeeded. The system should ultimately feel like a world-class competitive Pokemon coach analyzing every possible outcome and telling the player the hard truth about what actually wins games.
