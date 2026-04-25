# Champions Coaching Layer — Engineering Spec v1.0

**Status:** Draft for review · **Owner:** TheYfactora12 (product) + alfredocox (eng)
**Implements GitHub issue:** #50
**Implementing issues that depend on this spec:** #46 #47 #48 #49 #52 #53 #54 #55 #65
**Last updated:** 2026-04-24

---

## 1. Purpose

This document defines the contract for the Champions Sim Coaching Layer — the system that turns a team into a Strategy Report.

The Strategy Report is the heart of the product. It is not a damage simulator side panel. It is the answer to seven questions every player asks the second they finish a build:

1. How good is my team?
2. Why is it rated that way?
3. What beats me?
4. How do I pilot it?
5. What should I fix first?
6. What are my best leads?
7. What lines should I use into threats?

Every feature below exists to answer one of those questions with evidence the user can act on.

---

## 2. Behavior contract

### 2.1 When the report is built

The report rebuilds when any of the following happens:

- User selects a team in the player dropdown
- User imports a team (pokepaste, Showdown text, JSON)
- User edits a Pokemon in Set Editor and saves
- User runs a single sim or Run All Matchups
- (No manual Refresh button — auto-rebuild only, debounced. See Section 14, decision 1.)

### 2.2 Theory mode vs simulation mode

Reports always render. They start in **theory mode** before any sim data exists, then upgrade to **simulation mode** as data accumulates.

- **Theory mode:** advice is derived from team composition, types, abilities, items, moves. Every claim is labeled `inferred_strategy` or `verified_champions_source`.
- **Simulation mode:** advice is augmented by trend data (win rates, KO timings, dead moves). Claims labeled `simulation_data`.
- **Never mix labels in a single sentence.** If a section combines theory and sim notes, render them as separate bullets.

### 2.3 Persistence

- One report per team, keyed by **team signature hash** (see Section 6)
- Stored in `localStorage` under key `champions_strategy_report_v1`
- Theory notes and simulation notes stored in **separate slots** so we can diff and replay
- Schema version field (`schema_version: 1`) for forward compat
- Reports survive page reload, browser restart, and PWA offline use

---

## 3. Output schema

The single canonical output of the coaching engine is a JavaScript object with this exact shape. All field names are snake_case.

```ts
StrategyReport = {
  schema_version: 1,
  team_signature: string,            // hash of team contents (Section 6)
  team_key: string,                  // e.g. "player", "mega_altaria"
  format: "doubles" | "singles",
  generated_at: ISO_8601_string,
  sim_data_version: number,          // increments on each sim run; 0 = theory only

  team_report_card: TeamReportCard,
  team_identity: TeamIdentity,
  what_works: WhatWorks,
  what_is_weak: WhatIsWeak,
  top_threats: Threat[],
  lead_guide: LeadGuide,
  move_lines: MoveLine[],
  mistakes_to_avoid: Mistake[],
  risk_profile: Risk[],
  trend_analysis: TrendAnalysis,
  skill_coaching: SkillCoaching,
  stress_test: StressTest,
  coaching_summary: string           // 2-3 sentence headline takeaway
}
```

### 3.1 TeamReportCard

```ts
TeamReportCard = {
  tier: "S" | "A" | "B" | "C" | "D",
  battle_ready: boolean,                  // see Section 14, decision 2
  score: 0..100,                          // weighted sum of category scores
  confidence: "low" | "medium" | "high",
  risk_level: "low" | "moderate" | "high" | "extreme",
  short_explanation: string,              // 1-2 sentences, plain English
  category_scores: {
    legality_confidence:        0..10,
    win_condition_clarity:      0..10,
    role_balance:               0..10,
    lead_flexibility:           0..10,
    speed_control:              0..10,
    damage_coverage:            0..10,
    defensive_coverage:         0..10,
    pivot_switch_options:       0..10,
    format_fit:                 0..10,
    move_quality:               0..10,
    item_quality:               0..10,
    ability_synergy:            0..10,
    matchup_coverage:           0..10,
    simulation_trend_performance: 0..10  // null if confidence == "low"
  }
}
```

### 3.2 TeamIdentity

```ts
TeamIdentity = {
  playstyle: "Hyper Offense" | "Balance" | "Trick Room" | "Sun" | "Rain" | "Sand" |
             "Tailwind" | "Redirection" | "Stall" | "Setup Sweep" | "Mixed",
  primary_win_condition: string,
  secondary_win_condition: string | null,
  closer: string,                  // member name
  support_core: string[],          // 1-3 member names
  format_fit: "doubles" | "singles" | "both",
  source_label: SourceLabel
}
```

### 3.3 WhatWorks

```ts
WhatWorks = {
  best_synergy: { description: string, members: string[], source_label: SourceLabel },
  strongest_leads: { lead_pair: [string, string?], reason: string, source_label: SourceLabel }[],
  best_damage_plan: { description: string, source_label: SourceLabel },
  best_defensive_plan: { description: string, source_label: SourceLabel },
  strongest_win_path: { description: string, source_label: SourceLabel }
}
```

### 3.4 WhatIsWeak

```ts
WhatIsWeak = {
  missing_roles: string[],         // e.g. "no Fake Out user", "no speed control"
  bad_matchups: string[],          // team keys
  coverage_gaps: string[],         // type names
  speed_issues: string,
  fragile_leads: string[],         // member names
  overreliance: string | null,     // member this team falls apart without
  poor_choices: { member: string, kind: "move" | "item", note: string }[]
}
```

### 3.5 Threat

```ts
Threat = {
  pokemon: string,
  why_dangerous: string,
  threatens: string[],              // your team members it specifically counters
  problem_kit: { moves: string[], items: string[], abilities: string[] },
  play_around: string,              // 1-2 sentence pilot line
  team_fixes: string[],             // 1-3 build-side suggestions
  source_label: SourceLabel
}
```

### 3.6 LeadGuide

For doubles, top **3 lead pairs**. For singles, top **3 leads**.

```ts
LeadGuide = {
  format: "doubles" | "singles",
  recommendations: LeadRec[]        // length === 3
}

LeadRec = {
  rank: 1 | 2 | 3,
  lead: string[],                   // length 1 (singles) or 2 (doubles)
  purpose: string,                  // "Speed control + spread pressure"
  best_matchups: string[],
  bad_matchups: string[],
  turn_1_line: string,
  turn_2_line: string,
  risk_warning: string,
  win_rate: number | null,          // populated only in simulation mode
  sample_size: number | null,
  source_label: SourceLabel
}
```

### 3.7 MoveLine

```ts
MoveLine = {
  scenario: string,                 // "Into fast Tailwind teams", "Into Trick Room"
  lead_recommendation: string[],
  turn_1: string,
  turn_2: string,
  what_to_avoid: string,
  fallback_plan: string,
  source_label: SourceLabel
}
```

Minimum 6 move lines per report covering: Tailwind offense, Trick Room, Redirection, Fake Out pressure, Sun/Rain weather core, Setup sweeper.

### 3.8 Mistake

```ts
Mistake = {
  mistake: string,                  // "Do not lead Floette into Fake Out"
  why_it_loses: string,
  correction: string
}
```

3 minimum, 7 maximum per report (Section 14, decision 4). Severity-sorted, top N kept. Must be derived from this team's actual members, not generic copy.

### 3.9 Risk

```ts
Risk = {
  category: "RNG" | "lead_fragility" | "single_wincon" | "speed_control" |
            "matchup_volatility" | "predictability" | "positioning" |
            "resource_exhaustion" | "coverage_gap",
  severity: "low" | "moderate" | "high" | "extreme",
  why_it_matters: string,
  how_to_reduce: string
}
```

### 3.10 TrendAnalysis

```ts
TrendAnalysis = {
  has_data: boolean,
  sample_size: number,              // total sims for this team
  best_lead: { lead: string[], win_rate: number, sample: number } | null,
  worst_lead: { lead: string[], win_rate: number, sample: number } | null,
  most_common_loss_cause: string | null,
  avg_first_ko_turn: number | null,
  dead_moves: string[],             // never connected or always missed
  failed_matchups: string[],        // team keys with WR < 30%
  best_win_path: string | null,
  trend_direction: "improving" | "stable" | "declining" | null,
  message_if_no_data: "insufficient trend data — keep simulating"
}
```

### 3.11 SkillCoaching

```ts
SkillCoaching = {
  beginner: {
    how_team_wins: string,
    safest_lead: string[],
    safest_first_turn: string,
    do_not_click: string[]
  },
  intermediate: {
    when_to_switch: string,
    when_to_protect: string,
    tempo_management: string,
    preserve_wincon: string
  },
  advanced: {
    bait_and_punish: string[],
    double_switch_logic: string,
    win_path_compression: string,
    risk_reward_adjustments: string,
    opponent_prediction: string
  }
}
```

### 3.12 StressTest

```ts
StressTest = {
  break_points: string[],           // "Speed control denied → slow exposed team"
  punish_windows: string[],         // "Closer removed early → late game collapses"
  worst_matchups: string[],         // team keys
  failure_scenarios: string[],
  consistency_rating: "low" | "moderate" | "high",
  champion_perspective: string      // 1 paragraph from a top-player POV
}
```

### 3.13 SourceLabel

```ts
SourceLabel = {
  kind: "verified_champions_source" | "simulation_data" |
        "inferred_strategy" | "unknown",
  citations: { name: string, url: string }[]   // 0..n primary sources
}
```

---

## 4. Scoring rubric

### 4.1 Tier mapping

| Tier | Score range | Meaning |
|------|-------------|---------|
| S    | 90-100      | Tournament-ready, consistent, clear win path |
| A    | 75-89       | Strong, fixable gaps |
| B    | 55-74       | Playable, inconsistent |
| C    | 35-54       | Flawed, needs structural fixes |
| D    | 0-34        | Unreliable, illegal, or no clear plan |

### 4.2 Category weights (sum = 100)

| Category                   | Weight |
|----------------------------|--------|
| legality_confidence        | 12     |
| win_condition_clarity      | 12     |
| role_balance               | 9      |
| lead_flexibility           | 7      |
| speed_control              | 7      |
| damage_coverage            | 7      |
| defensive_coverage         | 7      |
| pivot_switch_options       | 5      |
| format_fit                 | 5      |
| move_quality               | 6      |
| item_quality               | 5      |
| ability_synergy            | 6      |
| matchup_coverage           | 6      |
| simulation_trend_performance | 6    |

`score = round( sum( category_scores[k] * weight[k] ) / 10 )`

### 4.3 Hard caps

These caps are non-negotiable and override the weighted score:

1. **No clear win condition → max tier B (cap score at 74)**
2. **Legality uncertainty → max tier C (cap score at 54)**
3. **Missing move metadata → max tier C (cap score at 54)**
4. **High risk_level + no sim data → cannot be S (cap score at 89)**
5. **Insufficient sim data (sample < 30) → confidence cannot exceed `medium`**
6. **Sample size 0 → simulation_trend_performance is null and excluded from score**

### 4.4 Confidence ladder

| Total sims for this team | Max confidence |
|--------------------------|----------------|
| 0                        | low            |
| 1-29                     | low            |
| 30-99                    | medium         |
| 100+                     | high           |

---

## 5. Pseudocode for each generator

Each function is pure: takes the team object + optional sim history, returns a slice of the report.

### 5.1 buildTeamReportCard(team, simHistory)

```
score_each_category(team, simHistory) -> categoryScores
weighted_total = sum(score * weight) / 10
tier = mapScoreToTier(weighted_total)
apply_hard_caps(team, simHistory) -> may downgrade tier and score
risk_level = derive_risk_level(team, weighted_total)
confidence = derive_confidence(simHistory.sample)
short_explanation = explain_top_two_categories_and_top_risk(...)
return { tier, score, confidence, risk_level, short_explanation, categoryScores }
```

### 5.2 buildTeamIdentity(team)

```
playstyle = inferPlaystyle(team)              // existing function in ui.js
primary_win_condition = inferWinFunction(team) // existing
closer = pickHighestOffenseSlot(team)
support_core = pickRedirectFakeOutOrIntimidate(team)
secondary_win_condition = findSecondaryAxis(team) // setup sweeper, weather core, etc
format_fit = inferFormatFit(team)
return { playstyle, primary_win_condition, secondary_win_condition,
         closer, support_core, format_fit, source_label: inferred }
```

### 5.3 buildLeadGuide(team, simHistory, format)

```
candidate_leads = generateLeadCandidates(team)   // all valid pairs (doubles) or singles
for each pair:
  score = lead_score(pair, team, format)
  // factors:
  //  - speed_control_value
  //  - threat_coverage_value
  //  - synergy_value (Fake Out + setter, Intimidate + bulky, etc)
  //  - pivot_value (U-turn / Volt Switch availability)
  //  - if simHistory has WR for this pair, blend in 0.4 * normalized WR
top3 = sortByScore(candidate_leads).slice(0,3)
for each lead in top3:
  attach purpose, best_matchups, bad_matchups, turn_1, turn_2, risk_warning
return { format, recommendations: top3 }
```

### 5.4 buildMoveLines(team)

Always emit one entry per scenario in this list (skip if team cannot meaningfully respond):

```
scenarios = [
  "fast_tailwind_offense",
  "trick_room_setters",
  "redirection_follow_me",
  "fake_out_pressure",
  "weather_core_sun_or_rain",
  "setup_sweeper",
  "intimidate_stack",
  "screens"
]
```

For each scenario, select the best lead from the team and write turn 1 / turn 2 / avoid / fallback using a template populated with the team's actual move and ability names.

### 5.5 buildMistakes(team, format)

Detection rules (3 to 5 fire per team):

```
- if team has Fake Out user but closer is fragile -> mistake: "Do not lead closer into Fake Out pressure"
- if team has Choice Scarf user with overlapping coverage -> "Locking Scarfer into wrong type"
- if team has spread move user but ally weak to spread -> "Do not click spread when ally below 50%"
- if team has Trick Room setter but most members fast -> "TR mode flips your speed advantage"
- if team has only 1 win condition mon -> "Burning Protect on closer ends games"
- if team lacks pivot moves -> "Switching aggressively without safe pivot leaks tempo"
- if team has redirector but most damage is single-target -> "Redirector wasted without spread"
```

### 5.6 buildRiskProfile(team, simHistory)

For each Risk.category, evaluate severity using composition + sim signals:

```
RNG: count moves with accuracy < 90 or status with miss chance
lead_fragility: count members with HP*Def or HP*SpD product below threshold among lead candidates
single_wincon: count distinct win paths (closer + secondary) -> if 1, severity high
speed_control: presence of Tailwind / Trick Room / priority / Choice Scarf
matchup_volatility: variance of win rates across 13-team grid (sim data)
predictability: how forced is each lead choice
positioning: count of pivot moves
resource_exhaustion: PP-low key moves, item burn rate
coverage_gap: types with no super-effective answer in team
```

### 5.7 buildStressTest(team, threats, simHistory)

```
break_points = []
if not has_speed_control(team): break_points.push("Speed control denied -> slow exposed team")
if has_single_closer(team): break_points.push("Closer removed early -> late game collapses")
if predictable_lead(team): break_points.push("Lead read trivial -> punish window opens turn 1")
worst_matchups = top3WorstByWinRate(simHistory) or top3HardestThreats(team, threats)
failure_scenarios = [
  "Mega blocked from evolving on critical turn",
  "Tailwind countered by Trick Room before T2",
  "Intimidate stacked into your physical attackers"
].filter(applies_to_team)
consistency_rating = mapVarianceToRating(simHistory) | "moderate" if no data
champion_perspective = synthesize from break_points + worst_matchups
```

### 5.8 buildTrendAnalysis(simHistory)

```
if simHistory.sample == 0: return { has_data: false, message_if_no_data: "..." }
best_lead = argmaxLead(simHistory)
worst_lead = argminLead(simHistory)
most_common_loss_cause = mode(simHistory.lossCauses)
avg_first_ko_turn = mean(simHistory.firstKoTurns)
dead_moves = movesWithUseCountBelow(simHistory, threshold=2)
failed_matchups = matchupsWithWrBelow(simHistory, 0.30)
best_win_path = mode(simHistory.winPaths)
trend_direction = compareRecent20vsPrevious20(simHistory)
```

### 5.9 buildSkillCoaching(team, identity, format)

Three nested objects rendered side-by-side. Source the language from the team's actual members:

```
beginner.how_team_wins = "{{closer}} closes after {{support}} sets {{condition}}."
beginner.safest_lead = identity.support_core
beginner.safest_first_turn = "Use {{support_move}} to {{purpose}}, do not use single-target damage yet"
intermediate.when_to_switch = ... 
advanced.bait_and_punish = derive from priority + bulky pivot + closer
```

---

## 6. Team signature hash

Used as the persistence key.

```
signature = sha256_short(
  format + "|" +
  members.map(m => m.species + ":" + m.item + ":" +
                   m.ability + ":" + m.moves.sort().join(",") +
                   ":" + (m.tera || "")).join("|")
)
```

Truncated to first 16 hex chars. Two semantically identical teams with reordered members must produce the same signature, so we sort moves but **not** members (member order matters for lead order; we may revisit and add a sorted-members variant later).

---

## 7. Persistence schema

`localStorage.champions_strategy_report_v1` shape:

```json
{
  "schema_version": 1,
  "reports": {
    "<team_signature>": {
      "team_key": "player",
      "theory_report": StrategyReport_without_simulation_fields,
      "simulation_overlay": {
        "sample_size": 142,
        "trend_analysis": TrendAnalysis,
        "lead_win_rates": { "Incineroar+Garchomp": 0.62, ... },
        "matchup_win_rates": { "mega_altaria": 0.71, ... },
        "loss_causes": ["lead_KO", "speed_lost", ...],
        "first_ko_turns": [3, 4, 2, 5, ...]
      },
      "last_built_at": "2026-04-24T20:36:00Z",
      "last_simmed_at": "2026-04-24T20:48:00Z"
    }
  }
}
```

The merged `StrategyReport` rendered to UI is theory_report + simulation_overlay applied. We never overwrite theory notes with simulation notes — they merge in the renderer.

---

## 8. Rendering rules

- Tier badge uses one color class per tier: S=cyan, A=green, B=yellow, C=orange, D=red
- Source label chips render after every claim by default. Style: small uppercase pill, color-coded by kind. An "Evidence" toggle in the Strategy tab header hides/shows them; state persisted in `localStorage.champions_evidence_chips_visible`. (Section 14, decision 3.)
- "Insufficient trend data" is its own visual state, not a hidden section
- Section order in the UI matches Section 3 order in this doc
- All claims must be plain English. No jargon without an inline gloss.

---

## 9. Coaching tone

The renderer must reject any string that fails one of these checks before display:

1. Length: 4 to 200 characters
2. No empty fillers: "good", "nice", "improve synergy", "use better moves", "be careful"
3. Each claim answers `what + why + how`. Mistakes can skip `how` only when `correction` is in the same object.

If a generator emits a banned string, fall back to "Coach has no opinion here yet — keep simulating" with a `simulation_data` source label (sample 0).

---

## 10. Citations

Primary sources used in this spec and required for `verified_champions_source` claims:

- **Pokemon Champions Regulations (Victory Road)** — [https://victoryroad.pro/champions-regulations/](https://victoryroad.pro/champions-regulations/) — format rules, Reg M-A, Mega Evolution allowance, doubles 4v4 from a 6-team selection
- **Doubles Tier List for Ranked Battles (Game8)** — [https://game8.co/games/Pokemon-Champions/archives/593883](https://game8.co/games/Pokemon-Champions/archives/593883) — top mons, role notes, Intimidate/Defiant interactions
- **Best Doubles Hyper Offense Teams (Game8)** — [https://game8.co/games/Pokemon-Champions/archives/594747](https://game8.co/games/Pokemon-Champions/archives/594747) — Tailwind offense, Fake Out pressure, redirection counters
- **Best Trick Room Teams (Game8)** — [https://game8.co/games/Pokemon-Champions/archives/594400](https://game8.co/games/Pokemon-Champions/archives/594400) — TR setter doubling, Mega Blastoise + Farigiraf, aggressive lead pattern
- **Smogon Teambuilding Guide** — [https://www.smogon.com/forums/threads/teambuilding-guide.3552468/](https://www.smogon.com/forums/threads/teambuilding-guide.3552468/) — wincon-first construction, threat coverage methodology, three team-objective categories
- **Smogon Frameworks in Teambuilding** — [https://www.smogon.com/smog/issue28/teambuilding](https://www.smogon.com/smog/issue28/teambuilding) — pivot definition, lead-to-breaker flow, weather-team requirements
- **Pokemon Showdown Champions formats** — [Reddit r/stunfisk thread](https://www.reddit.com/r/stunfisk/comments/1si746i/pokemon_showdown_has_been_updated_with_pokemon/) — confirms GC 6 Reg M-A format codes, Bo3 with OTS

Static-meta caveat: any tier-list claim must be labeled `verified_champions_source` only if dated within 60 days of report generation. Otherwise demote to `inferred_strategy`.

---

## 11. Out of scope (this spec)

- Live meta usage data ingestion (M5, issue #62)
- Archetype clustering ML (M5, issue #63)
- IndexedDB migration from localStorage (M3, issue #51 — separate effort, current spec uses localStorage)
- Replay shortlinks (M11, issue #97)

---

## 12. Acceptance gates for closing dependent issues

| Issue | Closes when |
|-------|-------------|
| #50   | This spec is merged to main |
| #46   | LeadGuide returns 3 ranked pairs with all required fields, validated on all 13 teams |
| #47   | WhatWorks.strongest_win_path + StrategyReport.coaching_summary populated for all 13 teams (already partially shipped — re-validate) |
| #48   | Risk[] with severity surfaced for all 13 teams (already partially shipped — re-validate) |
| #49   | Mistakes[] returns 3-5 team-specific entries with mistake + why + correction |
| #52   | TrendAnalysis section renders in Strategy tab with non-data placeholder when sample=0 |
| #53   | LeadGuide.win_rate populated when sample > 0 |
| #54   | Mistakes generator includes simulation-derived suboptimal flags |
| #55   | Cross-team rollup view in Strategy tab — top dead-move offenders, lowest WR leads |
| #65   | Top Threats section sourced from `META_THREATS` and weighted by sim WR |

---

## 13. Analytics architecture (locked decisions)

The four architecture choices below were settled on 2026-04-24 by product (TheYfactora12) before any implementation. They are binding for v1 and any deviation requires a fresh approval.

### 13.1 Storage layer — Hybrid localStorage + IndexedDB

Two storage tiers, each with a clear job:

| Store | Purpose | Read pattern | Size budget |
|-------|---------|--------------|-------------|
| `localStorage.champions_strategy_report_v1` | Latest snapshot of each team's StrategyReport. Renders the Strategy tab instantly on team select. | Sync, ~1 ms | < 1 MB total |
| `IndexedDB` database `champions_sim_history_v1` | Raw event log + per-team running aggregates. Source of truth for every analytic. | Async, with in-memory aggregate cache for hot paths | unbounded (capped at 500 raw events per team, aggregates have no cap) |

**Lifecycle:**

1. Page load -> read snapshots from localStorage synchronously, paint Strategy tab from cache
2. Page load (background) -> open IndexedDB, hydrate aggregates into in-memory cache, mark cache `ready`
3. New sim event -> append to IndexedDB event store + update IndexedDB aggregate row (single transaction) + bump in-memory cache
4. Debounced rebuild fires -> compute new StrategyReport from in-memory cache, write snapshot to localStorage, repaint

**Why hybrid:** localStorage gives us the no-flash team-switch experience users expect, IndexedDB gives us the headroom and structured queries the analytics need. This also closes #51 cleanly without forcing us to make every read async.

**IndexedDB schema (v1):**

```
Database: champions_sim_history_v1  version 1
  ObjectStore: events
    keyPath: id (auto-increment)
    indexes: by_team (team_signature), by_team_opp (team_signature + opp_signature),
             by_lead (team_signature + lead_pair), by_timestamp
    schema: SimEvent (see 13.2)
  ObjectStore: aggregates
    keyPath: team_signature
    schema: AggregateRow (see 13.2)
  ObjectStore: meta
    keyPath: key
    rows: { key: 'schema_version', value: 1 },
          { key: 'last_purge_at', value: ISO_string }
```

**Quota guard:** if IndexedDB write throws QuotaExceededError, oldest events are purged in batches of 100 until success. Aggregates are never purged (they are tiny and irreplaceable).

### 13.2 Data model — Event-sourced + running aggregates

Every sim emits one structured event. Aggregates update O(1) per event. Last 500 raw events per team are retained for replay and to allow recomputing aggregates if we ever bump the schema.

```ts
SimEvent = {
  id: number,                       // IndexedDB auto-key
  team_signature: string,
  team_key: string,
  opp_signature: string,
  opp_key: string,
  format: "doubles" | "singles",
  bo: 1 | 3 | 5 | 10,
  lead_pair: [string, string?],     // species names, sorted alphabetically for consistent grouping
  outcome: "win" | "loss" | "draw",
  first_ko_turn: number | null,     // null if neither side KO'd
  total_turns: number,
  loss_cause: LossCause | null,     // see 13.4 enum, null on win/draw
  win_path: WinPath | null,         // see 13.4 enum, null on loss/draw
  used_moves: { [member: string]: { [move: string]: number } },  // counts
  unused_moves: string[],           // moves never clicked this sim
  rng_events: { miss: number, crit: number, status_proc: number },
  timestamp: ISO_8601_string,
  engine_version: string
}

AggregateRow = {
  team_signature: string,
  team_key: string,
  sample_size: number,
  wins: number,
  losses: number,
  draws: number,

  // per-lead rollup
  lead_stats: {
    [lead_key: string]: {           // lead_key = sorted species joined by '+'
      sample: number,
      wins: number,
      losses: number,
      avg_first_ko_turn: number,
      sum_first_ko_turn: number     // numerator for streaming average
    }
  },

  // per-opponent rollup
  matchup_stats: {
    [opp_key: string]: {
      sample: number,
      wins: number,
      losses: number,
      common_loss_cause: { [cause: string]: number }
    }
  },

  // per-move rollup
  move_use_counts: { [member_move: string]: number },   // 'Incineroar:Fake Out': 142
  move_dead_counts: { [member_move: string]: number },  // never clicked when available

  // global counters
  loss_cause_counts: { [cause: LossCause]: number },
  win_path_counts: { [path: WinPath]: number },
  first_ko_turns: number[],         // bounded ring buffer, max length 200, for percentiles

  // trend window (last 20 vs previous 20 -> direction)
  recent_window: { wins: number, losses: number },     // last 20 sims
  prior_window: { wins: number, losses: number },      // sims 21-40 back

  last_event_id: number,
  last_updated: ISO_8601_string
}
```

**Why event sourcing matters here:** the moment we ship aggregates-only, every future analytic we did not predict starts from zero data. Event sourcing means a future Trend tab metric can be backfilled from history. The 500-event cap per team is plenty for that purpose without bloating the database.

### 13.3 Compute — Incremental + debounced rebuild

Three operations, each with its own latency budget:

| Operation | Latency target | Implementation |
|-----------|----------------|----------------|
| Per-sim aggregate update | < 5 ms | Pure JS object mutation in memory, write-behind to IndexedDB in a microtask |
| Strategy tab paint from snapshot | < 50 ms | Read localStorage snapshot, render. No async on hot path. |
| Full StrategyReport rebuild | < 250 ms | Trigger conditions: team edit, team import, format toggle, **debounced 500 ms after last sim event** |

**Run All Matchups behavior:** previously a 13-team grid would naively trigger 169 report rebuilds. With debouncing, exactly **1** rebuild fires 500 ms after the last sim resolves. Per-sim aggregate updates still happen for each of the 169 events.

**Pseudocode:**

```
let rebuildTimer = null

function onSimComplete(event):
  appendToIndexedDBEvents(event)            // async, fire-and-forget
  updateAggregateInMemory(event)            // sync, O(1)
  writeAggregateToIndexedDB(event.team_signature)  // write-behind
  scheduleReportRebuild(event.team_signature)

function scheduleReportRebuild(teamSig):
  if (rebuildTimer) clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(() => {
    const report = buildStrategyReport(teamSig)
    writeSnapshotToLocalStorage(teamSig, report)
    if (currentTab === 'strategy' && currentTeam === teamSig)
      renderStrategyTab(report)
  }, 500)
```

### 13.4 Loss-cause + win-path taxonomy — Structured enums

This is the engineering investment that makes coaching real. Without enums, `most_common_loss_cause` and the Mistake generator are vibes.

Engine.js emits one tag per resolved sim. Tags are derived from the existing battle log; this is a small touch (~50 LOC) added to the result builder.

**LossCause enum (one is required when outcome === "loss"):**

| Tag | Trigger condition |
|-----|-------------------|
| `lead_KO` | Both your leads fainted before turn 4 |
| `speed_lost` | Opponent set Tailwind / Trick Room and you had no answer queued within 2 turns |
| `mega_denied` | Your designated Mega fainted before evolving |
| `wincon_removed_early` | Highest-offense slot fainted before turn 5 |
| `TR_flipped_speed` | Trick Room set against you while >50% of your team is fast (Spe >= 90) |
| `fake_out_disrupt` | Fake Out used on a setup/setter member during the first 2 turns and you lost tempo |
| `redirection_blocked` | Your spread or single-target damage was redirected (Follow Me / Rage Powder) >= 2 times |
| `coverage_gap_punished` | Opponent's STAB or coverage type had no super-effective answer in your team |
| `RNG_miss` | A miss on a < 100% accuracy move directly preceded the losing KO |
| `RNG_crit` | An opponent crit directly preceded the losing KO |
| `PP_exhausted` | A key move ran out of PP before resolution |
| `unknown` | Engine could not classify (logged for inspection, never user-facing) |

**WinPath enum (one is required when outcome === "win"):**

| Tag | Trigger condition |
|-----|-------------------|
| `closer_sweep` | Final 2 KOs from the same offensive slot |
| `spread_pressure` | >= 2 KOs from spread moves |
| `setup_sweep` | KO came after a stat-boosting move chain (>= +1) |
| `tempo_control` | Tailwind / Trick Room active when winning KO landed |
| `pivot_grind` | Used U-turn / Volt Switch >= 2 times before winning KO |
| `redirect_protect` | Redirector + Protect chain preserved closer to endgame |
| `attrition` | Won via residuals (status / weather / hazards) for >= 2 KOs |
| `unknown` | Engine could not classify |

At least one tag per sim is mandatory. `unknown` is acceptable but counts against engine quality and is logged for our review.

**Engine integration point:** new function `classifyOutcome(battleLog, simResult, teamSpec, oppSpec) -> { loss_cause | win_path }` in engine.js. Pure function, fully unit-testable. Wired into the existing result builder before the result is returned to ui.js.

### 13.5 Performance budgets and SLOs

If any of these are violated in dev or prod, we open a perf bug and pause feature work until resolved:

| Metric | Budget |
|--------|--------|
| Strategy tab first paint after team select | < 50 ms |
| Full report rebuild | < 250 ms (p95) |
| Per-sim aggregate update | < 5 ms (p95) |
| Run All Matchups (13x13 grid) wall time | unchanged from today (debounce ensures we add no overhead) |
| IndexedDB write latency | < 20 ms (p95) |
| Bundle size delta from this work | < 80 KB raw, < 25 KB gzipped |

### 13.6 Migration + rollback

- New IndexedDB database created at `version 1`. Old localStorage keys (none today for sim history) ignored.
- If `champions_sim_history_v1` already exists at a higher version, abort with banner: "This browser has a newer Champions Sim format. Update your bundle."
- Rollback: feature flag `window.CHAMPIONS_COACHING_V1_ENABLED` defaults true. Set to false to disable Strategy tab and analytics writes (legacy Pilot Guide tab still works).
- All writes are append-only or upsert. No destructive migrations in v1.

### 13.7 Telemetry hooks (opt-in, future)

Reserved interface for issue #91 (local opt-in coaching rule telemetry). Aggregate row carries a `rule_fires` counter slot for free, populated only when `localStorage.champions_telemetry_optin === 'true'`. Default off.

---

## 14. Product decisions (locked 2026-04-24)

1. **Auto-rebuild on team edit:** the Strategy report regenerates automatically whenever the team changes (member edit, import, format toggle). No "Refresh" button. Debounce protects against rapid edits. Rationale: coach must always reflect the current build; surprise overwrites are acceptable because the report is derived state, not user-authored content.
2. **Battle Ready badge:** in addition to the S/A/B/C/D tier, a separate `Battle Ready` badge renders when **all four** conditions are true: tier === S **and** sample_size >= 100 **and** legality_confidence === 10 **and** no Risk has severity `extreme`. Surfaces in the TeamReportCard next to the tier pill.
3. **Source labels:** chips render **on by default** next to every claim. An "Evidence: on/off" toggle in the Strategy tab header lets the user hide them. Toggle state persisted in localStorage under `champions_evidence_chips_visible`.
4. **Mistakes cap:** 3 minimum, **7 maximum** (raised from 5). Generator returns the most severe N where N <= 7. Severity ordering: lead-trap > wincon-removal > speed-loss > coverage-gap > tempo > resource. This keeps very flawed teams honest without flooding clean teams.

These decisions are binding for v1.
