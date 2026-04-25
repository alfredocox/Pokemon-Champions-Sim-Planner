# Phase 4 — Adaptive Dynamic Coaching Layer

**Status:** DRAFT v2 (supersedes v1; expanded per user adaptive-loop framework)
**Author:** Computer (on behalf of alfredocox)
**Base branch:** `main` @ `26962ec` (4a already merged)
**Last merged phase:** 4a — simlog foundation (PR #113)
**Related issues:** Refs #52 #53 #54 #55

---

## North Star

> **"If the system gives the same advice after 100 battles, it is failing."**

Coaching must visibly evolve as sim data accumulates. State must flow:

```
State 1 (No Data, 0 sims)
  → theory-based, low confidence, labelled "from archetype heuristics"

State 2 (Early Sims, 1-14 sims)
  → point-out obvious failures, still mark as provisional

State 3 (Mature Data, 15+ sims)
  → trend-based coaching: adjust leads, threats, risk profile
```

**Validation test** (hard requirement for shipping):
For any one team, capture the Strategy tab snapshot at 0, 5, and 30 sims. Advice text, confidence bands, threat list, and lead recommendations MUST differ between at least two of those checkpoints. Automated regression test will snapshot the three states and fail the build if ≥1 key section is identical across all three.

---

## Per-team state object: `team_history`

Computed on demand from `champions_sim_log_v1` (no new storage key). Cached per team with 500 ms TTL so the Strategy tab doesn't recompute for every re-render.

```js
team_history = {
  total_battles,           // sum of games across all series for this team
  total_series,            // count of series entries
  state: 1 | 2 | 3,        // No Data / Early / Mature

  win_rate,                // 0..1, per-game (not per-series)
  series_win_rate,         // 0..1 per-series
  consistency_score: {
    label: 'consistent' | 'inconsistent' | 'volatile',
    variance,              // variance of 0/1 outcomes across games
    spread_gap,            // max_matchup_wr - min_matchup_wr (requires >=3 opps simmed)
    rng_dependency         // heuristic: stdev of turn count / mean turn count
  },

  lead_performance: [{     // one row per unique player-lead pair used
    leadPair: ['Incineroar','Arcanine'],
    n: 12,
    wins: 7,
    win_rate: 0.58,
    avg_turns: 11.2,
    verdict: 'strong' | 'ok' | 'weak'   // vs team-average win rate +/- bands
  }],

  common_loss_conditions: [{
    pattern: 'early_ko_of_X',    // e.g. "Whimsicott KO'd by turn <=2"
    victim: 'Whimsicott',
    by_turn: 2,
    seen_in_losses: 5,
    total_losses: 7,
    pct: 0.71
  }, ...],

  dead_moves: [{           // requires movesUsed[] plumbing (see below)
    owner: 'Whimsicott',
    move: 'Moonblast',
    games_sampled: 20,
    times_used: 0
  }],

  matchup_failures: [{
    oppKey: 'rin_sand',
    n: 8,
    win_rate: 0.125,
    avg_turns_on_loss: 6.4,
    recurring_killer: { attacker: 'Excadrill', move: 'Rock Slide', kos: 5 }
  }],

  player_behavior_patterns: [{
    // Since the AI policy plays "you", this layer audits the policy's choices
    // on the USER's team. Framed as "your team needs this style of play".
    pattern: 'over_protect' | 'passive' | 'over_aggression' | 'bad_lead_choice',
    evidence: { ... },
    severity: 'info' | 'warning' | 'critical'
  }]
}
```

---

## Four-feature framework (maps to user's spec)

### Feature 1 — Adaptive State Machine

`team_history.state` drives a top banner on the Strategy tab:

| State | Games | Banner | Coaching text style |
|-------|-------|--------|-----|
| 1 | 0 | "Theory-based — sim battles to unlock tailored coaching" (amber) | Low confidence pills on all tips. Static archetype rules only. |
| 2 | 1-14 | "Early data — X sims logged (15 to full confidence)" (blue) | Provisional tips. "Based on 6 sims — keep simming to confirm." |
| 3 | 15+ | "Mature data — X sims logged" (green) | Full dynamic advice. Trend-adjusted leads, threats, risks. |

### Feature 2 — Adaptive Coaching Update Rules (5 rules from user spec)

| Rule | Signal | Output |
|------|--------|--------|
| Same loss repeats | Identical loss condition ≥3 times | Escalate severity: info → warning → critical |
| Move never used | `dead_moves[i].times_used === 0` after ≥10 games | "Dead move: Whimsicott never used Moonblast. Consider swap." |
| Lead underperforms | `lead_performance[i].win_rate` < team wr − 15pp at n≥5 | Downgrade from primary to backup lead in recommendation |
| Matchup repeatedly fails | `matchup_failures[i].win_rate` < 0.25 at n≥5 | Auto-add to threat list with counter-line |
| Behavior pattern | See Feature 4 | Coach the player (not the team) |

### Feature 3 — Threat Response System

For each entry in `matchup_failures` (or top 5 meta threats from `META_THREATS` if State 1), compute:

```js
{
  threat: 'Rin Sand',
  why_it_beats_you: "Your Whimsicott dies T<=2 to Rock Slide in 5/8 losses.",
  correct_lead: ['Incineroar', 'Arcanine'],       // solver output
  turn_1_action: 'Fake Out on Tyranitar + Flare Blitz on Excadrill',
  turn_2_followup: 'Switch Whimsicott in after Excadrill KO to set Tailwind',
  fallback_if_wrong: 'If opp leads Dragapult instead: Incineroar Knock Off, hold Arcanine Extreme Speed for Dragapult after Pult commits.',
  common_mistake: "Leading Whimsicott exposes it to Rock Slide flinch chain."
}
```

**Solver** (new engine function `solveThreatResponse(playerTeamKey, oppTeamKey, opts)`):
- Enumerate candidate T1 lead pairs (up to C(4,2) = 6 per side × opp reasonable leads = ~36 branches)
- Enumerate T1 actions for each lead pair (heuristic-prune to top 3)
- For each (lead pair × T1 action) run **200 Bo1s** with a policy-override that forces T1 action, lets AI play from T2 forward
- Rank by win rate, pick top 1
- For top 1, re-run 200 sims with top-2 alternative opp lead → `fallback_if_wrong`
- Total: ~36 × 3 × 200 = 21,600 sims worst case. With speed optimizations (skip obviously-dominated branches after 50 sims) target <8s per threat.
- UI shows a spinner and progress bar while solving.

**Common mistake** is derived from `common_loss_conditions` — the top loss pattern for this matchup.

### Feature 4 — Player (Policy) Audit

Since the AI plays both sides, we audit **the policy on your side** for classic mistakes. Framed as "your team struggles when played this way." Detectors (each opt-out by low confidence if <5 sims):

| Detector | Engine signal needed | Example output |
|----------|---------------------|----------------|
| Protect misuse | count Protects on turns with no incoming damage threat | "Your team auto-Protects 40% of turns where opp has no setup — you're giving up tempo" |
| Over-aggression | KO differential negative AND avg turns <10 | "You're rushing — losing trades early" |
| Passive play | avg turns >15 AND survivors end >=3 on wins | "You win slow — opponent has time to stabilize" |
| Bad lead choice | lead pair wr <35% AND exists alternative pair >55% | "Your Incineroar/Arcanine lead loses 65%; swap with Whimsicott/Rotom-Wash which wins 58%" |
| Over-Protect (stacked) | same mon Protects 2+ consecutive turns ≥3 times | "Rotom-Wash is spamming Protect — opponents have time to set up" |

**Out of scope for V1:** over-switching / under-switching (engine has no mid-battle switch logic; noted in Gap Analysis).

### Consistency Score

```js
consistency_score.label =
  variance < 0.15 && spread_gap < 0.25 && rng_dependency < 0.30 ? 'consistent' :
  variance < 0.25 && spread_gap < 0.40 ? 'inconsistent' :
  'volatile'
```

Rendered as a pill at top of Strategy tab next to state banner. Explainer tooltip breaks down the three components.

---

## Engine gaps (must be filled)

| Need | Status | PR |
|------|--------|-----|
| `koEvents[]` | ✅ Done in 4a | — |
| `movesUsed[]` — per-mon move-call histogram per game | ❌ Missing | 4b |
| `actionLog[]` — turn-by-turn (mon, move, target, side) | ❌ Missing | 4b |
| Protect stack counter per mon | ⚠️ Partial (mon has state but not exposed) | 4b |
| Switch support | ❌ Absent from engine | **Out of scope** — noted limitation |
| Policy override for solver (`force T1 action`) | ❌ Missing | 4d |

`actionLog[]` is ~60 bytes/turn × 10 turns × 4 mons = 2.4 KB/game worst case → 7.2 KB/series, 3.6 MB at 500-entry cap. **Too expensive** to store in full. Design: record per-game but truncate to counts (`movesUsed`, `protectStack`) on simlog write; keep the full `actionLog` in memory only for the current session.

---

## Rollout — revised (4 PRs, each mergeable)

| PR | Scope | Version chip | Effort |
|----|-------|--------------|--------|
| **4b** | Engine: `movesUsed[]`, `protectStack` counter, compact action counts attached to simlog entries. UI: `computeTeamHistory(teamKey)` + state-machine banner + consistency pill on Strategy tab. | v2.1.4-adaptive.1 | 2 days |
| **4c** | Detectors: `lead_performance`, `common_loss_conditions`, `dead_moves`, `matchup_failures`. Render "Learned from your sims" section applying the 4 update rules (escalate, dead move, downgrade lead, auto-add threat). Confidence badges on all existing `csMistakes` rules. | v2.1.5-detectors.1 | 3 days |
| **4d** | Threat Response System. New `solveThreatResponse()` in engine. Policy override plumbing. UI solver spinner. Populate threat cards with correct_lead / t1_action / t2_followup / fallback / common_mistake. | v2.1.6-threats.1 | 3 days |
| **4e** | Policy-audit detectors (Protect misuse, passive, aggressive, bad lead, over-Protect-stack). New "How you're playing this team" section. | v2.2.0-phase4.1 (minor bump — Phase 4 feature complete) | 2 days |

Total: ~10 days of work across 4 PRs. Spec doc gets committed immediately as standalone docs PR for clean reference.

---

## Validation / success criteria (hard requirements)

- [ ] At 0 / 5 / 30 sims on the same team, Strategy tab differs in ≥2 sections across the three snapshots
- [ ] State banner advances 1 → 2 → 3 on game-count thresholds
- [ ] Threat Response solver returns actionable leads + T1 actions with >55% measured win rate
- [ ] Dead moves only flag after ≥10 games AND zero uses
- [ ] Lead downgrade only fires at n≥5
- [ ] Repeated loss escalation: 3 identical loss conditions → severity bumps to "warning"; 6 → "critical"
- [ ] Consistency label matches intuition on 3 hand-crafted test teams (always-wins, coin-flip, RNG-dependent)
- [ ] 0 `pageerror` / `console.error` across 22 teams at all 3 states
- [ ] Solver completes in <8 s per threat; Strategy tab first-paint <200 ms (solver runs async)
- [ ] Regression test fails the build if advice identical at 0 vs 30 sims

---

## Open questions resolved

| # | Question | User decision |
|---|----------|---------------|
| Q1 | Bo3 series = 1 log entry or N? | 1 entry, N game sub-records ✅ (shipped 4a) |
| Q2 | Log swapped-side sims? | No, only when user's team is playerKey ✅ (shipped 4a) |
| Q3 | Suppress vs demote static rules? | Demote with "Low confidence" badge (shipped 4c) |
| Q4 | Grade letter vs numeric? | Letter + number-in-tooltip (see Feature 1 banner) |
| Q5 | Clear sim history button? | Yes, Strategy tab footer alongside existing clear controls |
| Q6 | Player behavior scope? | **Policy audit** — detect AI-policy mistakes on user's side, frame as "your team needs this style" |
| Q7 | Solver compute budget? | **Medium — 200 sims per branch** |
| Q8 | Sequence? | **Re-scope into bigger PRs** — 4b/c/d/e as above |

---

## Out of scope for Phase 4

- Mid-battle switch support in engine (would unblock over/under-switching detectors — separate phase)
- Live in-battle coaching (sim already plays automatically; live-play mode is separate)
- Cross-team aggregate stats
- Social/shareable stat cards
- LLM-generated prose advice (100% deterministic templates + data)
- Team-building recommendations ("swap Whimsicott for Tapu Fini") — analysis only, not synthesis

---

## Appendix — Validation regression test sketch

Added in 4e as a headless Playwright test, not shipped to users:

```js
// tests/phase4-adaptive.spec.js (conceptual)
test('advice evolves with data', async () => {
  await page.goto(bundle);
  csSimLogClearAll();
  const s1 = await snapshotStrategyTab('aurora_veil_froslass');  // 0 sims
  await runBoSeries(5, 'aurora_veil_froslass', 'rin_sand', 1);
  const s2 = await snapshotStrategyTab('aurora_veil_froslass');  // ~5 sims
  await runBoSeries(25, 'aurora_veil_froslass', 'rin_sand', 1);
  const s3 = await snapshotStrategyTab('aurora_veil_froslass');  // ~30 sims
  expect(s1.stateBanner).toMatch(/theory-based/i);
  expect(s3.stateBanner).toMatch(/mature/i);
  expect(s1.adviceHash).not.toBe(s3.adviceHash);
  expect(s2.adviceHash).not.toBe(s1.adviceHash);
  expect(s2.confidenceBadge).toMatch(/provisional|early/i);
});
```
