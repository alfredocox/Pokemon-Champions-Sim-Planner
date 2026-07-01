# Battle Sensei + Sim Intelligence Engine

> Product thesis: Sim Mode builds the team. Battle Sensei builds the player.
> Tagline: Battle Sensei: Learn why the turn went wrong.
> Status: Accepted roadmap spec. R1/R2 MVP started.
> Owner split: product / coaching rules by @TheYfactora12, architecture / persistence by @alfredocox, fixtures / a11y by @Jdoutt38.
> Direction note, 2026-06-06: replay coaching remains useful for QA and evidence capture, but new coaching expansion is paused until the simulator truth gate in ../../docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md passes.

Plain-English source-truth companion: `BATTLE_SENSEI_EXPLAINED_SIMPLY.md`.

## Product Definition

Battle Sensei turns pasted or uploaded Pokemon Showdown battle logs into matchup coaching, mistake diagnosis, player-pattern analysis, and replay-calibrated simulation feedback.

This is not a replay viewer. The viewer shows what happened. Battle Sensei explains what mattered, what decision should change, and how the replay should update future sim assumptions.

## Why This Adds Value

The existing app already answers what the team can do in simulation. It does not yet answer what the player actually did in real games. Showdown logs close that gap.

The feature advances the Coaching North Star and the Credibility Ladder:

- Stage 1: AI-vs-AI simulation says what is theoretically happening.
- Stage 3: Showdown replay ingestion can support "replay-calibrated" coaching with real-player evidence.

The feedback loop is:

Simulate -> Play -> Upload Replay -> Diagnose -> Update Coaching -> Improve Sim Assumptions -> Practice Better Lines -> Repeat.

## Replay-Derived Tactical QA Payload UX

The Review/Battle Sensei input card must expose the Tactical QA payload action near the replay upload/analyze controls, not only inside lower result cards.

Expected flow:

1. Player uploads a Showdown `.html`, `.txt`, `.log`, pasted log, or replay URL.
2. The payload button remains disabled until replay analysis creates a scenario queue.
3. After analysis, the top-level button exports the highest-priority replay-derived scenario as a versioned Tactical QA JSON payload.
4. Per-scenario buttons in the generated queue can still export a specific scenario.
5. The UI must explain whether the payload is ready for branch execution or blocked by missing team mapping, regulation mapping, or board-state evidence.

This payload is evidence intake only. It does not overwrite Champion legality, mechanics truth, leaderboard rankings, or official source-truth rows.

## Core Outputs

Every reviewed replay should produce:

- match summary
- team preview review
- registered-six / selected-lineup analysis where inferable
- lead grade
- turn timeline
- critical turn
- first mistake and fatal mistake
- speed-control review
- field-control review
- Protect / Fake Out / priority / setup usage review
- win-condition tracker
- RNG materiality score
- team-vs-pilot diagnosis
- better-line suggestions
- practice recommendation
- sim comparison
- sim feedback packet
- provisional Battle IQ score

Every recommendation must include:

- what happened
- why it mattered
- what to do instead
- confidence level

## Player Learning Contract

Battle Sensei must teach competitive decisions, not only summarize battle logs. Every analysis pass should try to answer five player questions:

- Which registered roster should I use for this matchup?
- Which game-specific lineup should I select for BO1, BO3, or BO5?
- Which lead should I choose and what does it beat or lose to?
- Which moves, targets, protects, and switches created the win or caused the loss?
- What should I change next game or next practice block?

The tool should separate team-building truth from piloting truth:

- `lineup_choice`: selected Pokemon from the registered roster were wrong or incomplete for the matchup.
- `lead_choice`: lineup was playable, but the opening pair/lead created a bad first board.
- `move_choice`: the player clicked a move that lost pressure, missed a KO, enabled setup, or failed to preserve the win condition.
- `target_choice`: the move was reasonable, but the target was wrong.
- `switch_timing`: a switch/pivot either preserved the win condition or gave up tempo.
- `speed_control`: Tailwind, Trick Room, priority, weather, or speed order decided the line.
- `resource_trade`: Protect, Fake Out, Sash, berry, HP, or key Pokemon was spent well or badly.
- `variance`: RNG materially changed the line; only use this when the log proves it.

## Data-to-Coaching Claim Matrix

No coaching claim should ship without the data needed to support it.

| Coaching claim | Required data | Minimum confidence |
|---|---|---|
| Best lineup from six | full registered roster, selected lineup, format, series format, lineup matrix coverage, scored/evaluated lineups | medium if matrix incomplete, high only when all legal lineup combos are evaluated |
| Best lead | selected lineup, opening active Pokemon, opponent lead, turn-one board, speed order, field state, first-turn result | medium from one replay, high from repeated matchup samples |
| Best move or target | legal options, actual actions, targets, damage/effect events, KOs, post-turn position score, alternative branch score | low until alternatives are simulated |
| Correct switch or pivot | pre/post roster state, HP, field state, threats, speed order, win-condition preservation, tempo delta | medium when post-turn position improves |
| Why the player lost | result, turning point, position-score path, key faint/field event, selected issue tag, confidence boundary | medium from one clean replay |
| What to use next game | series format, current game lineup, bench/swap options, sim lineup ranking, opponent revealed plan | medium if roster known, high only with matrix + repeated evidence |
| Clutch classification | turn count, position-score path, late turning point, max swing delta, final score, field reversal state | must include comeback, late swing, or close endgame with meaningful movement |

## Build Items: Lineup, Move, Switch, Loss-Cause Flow

The next coaching expansion should follow this sequence:

1. `Lineup Matrix Report`
   Generate and score every legal lineup from the registered roster for BO1/BO3/BO5. Doubles uses 4-of-6, singles uses 3-of-6.

2. `Lead Matrix Report`
   For each legal lineup, rank legal leads by matchup result, first-turn position score, speed-control plan, and risk.

3. `Move Tree Turning-Point Report`
   On the critical turn, compare the actual move/target/protect/switch against a bounded set of alternatives.

4. `Switch and Preservation Report`
   Identify when a player should preserve a win condition, pivot, sacrifice support, or stay in to trade.

5. `Loss Cause Classifier`
   Label the primary loss cause as lineup, lead, move, target, switch timing, speed control, resource trade, variance, or matchup disadvantage.

6. `Practice Drill Generator`
   Convert the main loss cause into one drill and one next-game instruction.

## Current Tactical Interpreter Build: Speed Control + Deferred Payoff

The current priority is `#223`, because Battle Sensei cannot score decisions correctly until it understands speed-control contests.

This layer should classify:

- `speed_control_reversal`: Trick Room or another answer flips the opponent speed plan.
- `speed_control_neutralized`: both sides establish matching speed control, so the advantage becomes neutral.
- `speed_control_converted`: Tailwind, Trick Room, Icy Wind, or similar speed control creates immediate pressure.
- `deferred_payoff`: a setup turn pays off within the next three turns and should not be treated as passive.
- `planned_speed_transition`: Trick Room or a similar speed state ends and the visible natural speed order favors the player's next board.
- `complementary_turn_payoff`: a setup/protection/redirection turn enables material within the next three turns.
- `speed_control_without_pressure`: speed control was used but did not become damage, a KO, a forced Protect, or preservation.

Guardrail:

- Manual team selection locks the registered team identity for the sim scope.
- In BO3/BO5, only the selected game lineup may change from that same registered six.
- The tactical interpreter may compare lineups and moves, but it must not silently swap to a different registered team during one sim run.

Later aligned items:

- `#224` Decision Opportunity Ledger with denominators and positive execution recognition.
- Move/target alternative comparison for critical turns.
- Switch and preservation scoring.
- Lineup and lead matrix recommendations across BO1/BO3/BO5.
- Practice drill generation from repeated tactical patterns.

## Coach Brain Layer: From Counts To Strategy

The Coach Brain is the strategic layer above tactical labels and the Decision Opportunity Ledger.

Layer order:

1. `tactical_speed_summary`
   Labels evidence-backed speed-control events such as Tailwind converted, Trick Room failed to convert, speed-control reversal, and speed-control neutralization.

2. `decision_opportunity_ledger`
   Counts opportunities, positive outcomes, negative outcomes, neutral outcomes, and positive rate by tactical category.

3. `coach_brain_summary`
   Converts the ledger into a player-facing diagnosis, next-game plan, and practice drill.

4. Future `coach_memory`
   Tracks repeated patterns by player team, opponent team/archetype, format, series format, and tactical category.

The first Coach Brain scope is speed-control coaching:

- `player_tailwind`
- `opponent_tailwind_defense`
- `trick_room`
- `speed_control_contest`

The first `coach_brain_summary` output contract:

```json
{
  "schema_version": "champions-coach-brain-summary-v1",
  "scope": "downloaded-turn-log | retained-replay-card | qa-artifact",
  "memory_key": "player::opponent::format::speed-control-ledger",
  "confidence": "needs_more_data | low | medium | high",
  "sample": {
    "opportunities": 0,
    "positive": 0,
    "negative": 0,
    "neutral": 0,
    "positive_rate_pct": null
  },
  "primary_issue": {
    "category": "player_tailwind",
    "label": "Player Tailwind",
    "opportunities": 0,
    "positive": 0,
    "negative": 0,
    "neutral": 0,
    "positive_rate_pct": null,
    "read": "Tailwind is available, but too many windows are not becoming pressure."
  },
  "observed_pattern": "Tailwind is available, but too many windows are not becoming pressure.",
  "root_problem": "Speed is being created, but the next actions are not consistently turning it into material, pressure, or preservation.",
  "risk_if_unchanged": "If nothing changes, the player may keep spending turns on Tailwind while opponents trade damage, Protect, or reposition through it.",
  "best_strength": {
    "category": "speed_control_contest",
    "label": "Speed-Control Contest",
    "opportunities": 0,
    "positive": 0,
    "negative": 0,
    "neutral": 0,
    "positive_rate_pct": null,
    "read": "Speed-control answers are a current strength."
  },
  "recommended_solution": "Only commit Tailwind when the next two turns can create damage, a KO, a forced Protect, or preservation of a win condition.",
  "next_game_plan": "Only commit Tailwind when the next two turns can create damage, a KO, a forced Protect, or preservation of a win condition.",
  "expected_result_if_fixed": "If fixed, Tailwind conversion rate should rise and more games should show early pressure after speed is established.",
  "practice_drill": "Play 10 reps where every Tailwind must be followed by a planned two-turn pressure sequence.",
  "learning_direction": {
    "next_layer": "coach_memory",
    "purpose": "Compare this summary against future sessions and broader shared sim evidence before recommending move, lineup, or team changes.",
    "shared_data_boundary": "Use aggregated, non-personal sim evidence and matchup patterns; do not expose another player private team or identity."
  },
  "boundary": "Evidence-bound speed-control coaching. This does not claim best move or best team until alternative branches are compared."
}
```

Coach Brain guardrails:

- It must explain what data produced the read.
- It must use confidence based on opportunity count.
- It must produce one primary issue, not a noisy list of every possible issue.
- It must produce one best measured strength so the player knows what to preserve.
- It must produce one next-game plan and one practice drill.
- It must not claim a best move, best target, best lineup, or best team until alternative branch comparisons exist.
- It must not infer hidden opponent intent as fact.

Memory requirements for later builds:

- Store summaries by `memory_key`.
- Compare current session against prior sessions.
- Track whether a tactical category is improving, stable, or getting worse.
- Prefer repeated evidence over one-game conclusions.
- Separate team weakness from pilot execution weakness.
- Learn from aggregated shared sim evidence without exposing private user identity or hidden custom teams.
- Use shared evidence to propose tests, not absolute prescriptions.

Shared learning recommendation rules:

- Recommend a move change only when legal move alternatives have branch evidence.
- Recommend a lineup change only when same-six lineup matrix evidence exists.
- Recommend a lead change only when lead matrix evidence exists.
- Recommend a strategy change when tactical windows repeatedly fail or convert.
- Show sample size and confidence beside every recommendation.
- Keep "try this next" separate from "this is proven best."

Example memory read:

> Across three sessions, Player Tailwind improved from 36% to 52% positive conversion, but Trick Room stayed under 35%. Keep the current Tailwind plan and practice Trick Room conversion before changing the six.

## Analysis Flow

When analyzing one replay or a group of replays, run this flow:

1. Parse source and evidence quality.
2. Determine format and expected lineup size.
3. Resolve registered roster, selected lineup, leads, and bench options.
4. Compare selected lineup against the lineup matrix for the chosen series format.
5. Compare lead against lead matrix.
6. Walk turn timeline for speed control, field control, Protect/Fake Out, switch timing, KOs, and position-score deltas.
7. Identify first mistake, fatal mistake, and biggest swing.
8. Classify loss cause or win driver.
9. Produce next-game recommendation and practice drill.
10. Attach confidence and missing-data notes.

## Evidence Standard

Battle Sensei must prioritize observable evidence over speculative interpretation.

Evidence hierarchy:

1. `Observed`: directly supported by parsed log events, revealed board state, moves, switches, faints, field effects, or team preview.
2. `Strong inference`: supported by observable sequencing plus known archetype behavior or revealed information.
3. `Weak inference`: plausible, but missing important context such as full team, item, EV, backline, or repeated samples.
4. `Needs more data`: not enough evidence to make a reliable claim.

If evidence is weak:

- lower confidence
- avoid hard claims
- recommend additional battles or fuller logs

Opponent intent rule:

- never invent opponent intent
- never state hidden plans as fact
- infer likely strategic intent only when supported by common archetype behavior, board state, move sequencing, and revealed information

The preferred language is:

- "The log shows..."
- "This strongly suggests..."
- "A likely read is..."
- "Needs more data before judging..."

Avoid:

- "The opponent wanted..." unless the log directly supports it
- "You should have known..." when hidden information was unavailable
- "This proves..." from one battle or incomplete replay data

## Battle IQ Boundary

Battle IQ is documented in [`BATTLE_IQ_SPEC.md`](./BATTLE_IQ_SPEC.md).

Battle IQ means:

> A standardized estimate of game-specific competitive battle intelligence based on observable battle decisions, matchup context, and player execution patterns.

Battle IQ may be described as in-game competitive intelligence because it maps battle decisions to battle-specific skills. It must never be described as general human intelligence or personal worth.

Current R1 behavior:

- single-battle scores are provisional
- one clean replay can be medium confidence at best
- incomplete logs must lower confidence
- the UI must explain why the score rose or fell
- the UI must recommend a drill
- premium/profile value comes from saved memory, trends, repeated mistake fingerprints, matched norm groups, and longitudinal coaching

The process challenge is intentional: if a Battle IQ feature cannot explain what decision should change, it should not ship.

## Parser Data Contract

The parser should extract a normalized object, not UI text.

```json
{
  "source": "showdown-log",
  "format": "gen9vgc2026reg...",
  "players": { "p1": "Player", "p2": "Opponent" },
  "selectedSide": "p1",
  "winner": "p1",
  "turns": [],
  "preview": {
    "p1": [],
    "p2": [],
    "confidence": "low"
  },
  "leads": {
    "p1": [],
    "p2": []
  },
  "revealed": {
    "p1": [],
    "p2": []
  },
  "events": [],
  "unknowns": []
}
```

The first implementation should parse:

- format and player names
- winner / forfeit where visible
- turn boundaries
- switches
- moves
- targets when visible
- faints
- damage / HP percent lines where visible
- status
- weather / terrain / Trick Room / Tailwind where visible
- misses, crits, failed moves, immunities, and no-effect lines
- leads from first active Pokemon
- selected four from revealed Pokemon when full bring is not visible

Do not overclaim from missing data. Missing preview, unknown item, hidden EVs, or incomplete logs must lower confidence.

## Coaching Objects

### Replay Summary

```json
{
  "result": "win|loss|forfeit|unknown",
  "turnCount": 0,
  "yourLead": [],
  "opponentLead": [],
  "yourFour": [],
  "opponentFour": [],
  "leadGrade": "A|B|C|D|F|unknown",
  "criticalTurn": 0,
  "mainIssue": "string",
  "practicePoint": "string",
  "confidence": "high|medium|low"
}
```

### Mistake Tags

Supported MVP tags:

- bad_lead
- questionable_bring
- speed_control_without_pressure
- win_condition_exposed
- targeting_error
- switch_tempo_loss
- protect_misuse
- field_control_failure
- endgame_misplay
- rng_material

### Critical Turn

```json
{
  "turn": 0,
  "type": "first_mistake|fatal_mistake|biggest_swing",
  "whatHappened": "string",
  "whyItMattered": "string",
  "betterLine": "string",
  "confidence": "high|medium|low"
}
```

### Sim Feedback Packet

```json
{
  "simFeedback": {
    "shouldUpdateLeadModel": true,
    "shouldUpdateBringFourModel": true,
    "shouldUpdateArchetypeModel": false,
    "shouldCreateScenario": true,
    "scenarioType": "turn_two_tailwind_no_pressure",
    "pilotDifficultySignal": "high",
    "teamConstructionSignal": "low",
    "rngContamination": "minor",
    "confidence": "medium"
  }
}
```

### Replay-Derived Sim Scenario Queue

Schema: `champions-replay-scenario-queue-v1`

Purpose: turn a real uploaded replay into concrete simulator branch tests without claiming the replay is official rule truth.

Each queue row should include:

- `title`: player-readable scenario name.
- `priority`: `high`, `medium`, or `low`.
- `turn`: replay turn if known.
- `setup`: board or branch to recreate in the simulator.
- `testGoal`: what the branch sweep should compare.
- `why`: coaching reason this branch matters.
- `evidence`: replay protocol row, coaching tag, or damage/effect row that triggered it.
- `confidence`: confidence in the scenario trigger, not confidence that one line is best.
- `sourceGaps`: explicit warnings that replay evidence does not overwrite Champion legality, mechanics truth, or leaderboard rankings.

Current triggers:

- high/medium coaching tags
- action-denial rows such as flinch, miss, fail, and immunity
- Mega/form-change timing
- ability/item activation timing
- super-effective, resisted, and major HP-threshold damage rows

DB mapping: store this under `replay_sim_feedback.payload.scenarioQueue` until the dedicated scenario runner table exists.

Guardrail: scenario rows are test targets. They may create tactical QA work, but they must not promote a move, legality rule, team ranking, or coaching claim without simulator evidence tied to `engine_version`, `ruleset_version`, `regulation_id`, `format`, and sample size.

### Replay Scenario to Tactical QA Payload

Schema: `champions-replay-scenario-tactical-qa-payload-v1`

Purpose: let a player export a replay-derived scenario into a Tactical QA-ready payload without pretending the replay can already run a trusted branch matrix.

Required fields:

- `status`: `needs_more_data` until replay Pokemon are mapped to saved in-app teams, regulation is confirmed, and the scenario board is reconstructed.
- `engine_version`
- `ruleset_version`
- `regulation_id`
- `format`
- `sample_size`
- `scenario`
- `board_context`
- `missing_for_trusted_run`
- `next_actions`

Current UI behavior: each replay scenario card can prepare a Tactical QA payload JSON. The payload is intentionally blocked from trusted branch execution when it is missing team-id mapping, regulation confirmation, or board reconstruction.

Replay team mapping:

- Compare replay `yourPreview` first when full six exists.
- Fall back to visible `yourFour` / `opponentFour` when full preview is unavailable.
- Match against saved/imported in-app teams by normalized species identity.
- Mega forms may match their base species for team identity.
- Confidence labels:
  - `exact_full_six`
  - `visible_four_match`
  - `partial_match`
  - `no_match`
- Payload should include `player_team_id`, `opponent_team_id`, matched species, missing species, and mapping confidence when available.

Future promotion path:

- map replay Pokemon to imported/saved teams
- confirm `regulation_id`
- reconstruct turn-specific active board, HP, field, item/ability state, and known moves
- run capped branch matrix
- save branch output as simulator-derived evidence with version fields and sample size

## Sim Comparison Fields

When replay data exists, matchup coaching can add:

- theoreticalWinRate
- actualReplayWinRate
- practicalWinRate
- pilotDifficulty
- leadSensitivity
- sequencingDifficulty
- endgameDifficulty
- rngExposure
- commonReplayMistakes
- commonCriticalTurns
- bestSimLead
- bestReplayLead
- mostMisplayedLead
- easiestWinningLine
- highestCeilingLine
- safestLine
- recommendedPracticeLine

Definitions:

- theoreticalWinRate: sim-only win rate.
- actualReplayWinRate: uploaded-user-log win rate.
- practicalWinRate: sim win rate adjusted by execution difficulty and replay outcomes.
- pilotDifficulty: how hard the matchup is to play correctly.
- leadSensitivity: how dependent the matchup is on the correct lead.
- sequencingDifficulty: how much correct turn order and positioning matter.
- rngExposure: how much low-probability events affected results.

## UI Scope

Battle Sensei page:

- paste log
- upload Showdown replay `.html` as the preferred player-match feed
- upload `.txt` / `.log` raw logs as fallback inputs
- load replay URL
- select side
- select review mode
- hide raw log by default
- show result summary card
- show team preview card
- show critical turn card
- show coaching tags
- show turn timeline
- show sim comparison card
- show practice plan card
- save/export review

Mobile rule: no spreadsheet replay wall. Use stacked cards, expandable turns, short coaching reads, and one-thumb controls.

## Product Surface And Access Model

Battle Sensei should be a first-class tab/page, not a hidden subpanel inside the current Replay Log and not inside the Strategy area. The mental model is different:

- Sim Coach answers: what should my team do?
- Strategy answers: how does this team plan against the sim/meta?
- Battle Sensei answers: what did I actually do?
- Player Dashboard answers: what pattern keeps repeating?

Replay data should still feed the same Coaching Intelligence Engine. The UI surface is separate, but the normalized data model can be shared later for calibration.

Recommended access model:

- Anonymous visitor: can paste one log, run a temporary review, and see a cached report in the current browser session.
- Local-only user: can keep temporary reports in browser storage, export them manually, and clear them.
- Account/profile user: can save teams, sim history, replay summaries, player patterns, and cross-device progress.
- Advanced/full coach report: can be a future paid or gated capability, but the parser and basic replay review should exist before any monetization decision.

Do not require login for the first useful replay review. Require login/profile persistence only when the user wants durable saved teams, personal sim history, replay summaries, multi-log history, cross-device sync, or a merged long-term coaching profile. Any shared learning layer must separate private profile rows from anonymized/consented aggregate patterns so one player cannot poison another player's coaching data.

Future premium/report direction:

- Keep Sim Coach and Battle Sensei separate while the data models mature.
- Once both sides are finalized, combine simulation plans plus real replay behavior into a full coaching report.
- Working names: `Colosseum Report`, `Professor Doutt's Premium Coaching Report`, or a cleaner final brand later.
- This report should be a synthesis layer, not a replacement for either tab.

The product rule is:

- basic replay value should be immediate
- saved coaching history should require a profile
- full merged sim-plus-replay intelligence can be a later premium/business layer

## Persistence Scope

Persist normalized summaries before raw logs.

Recommended entities:

- replay_reviews
- replay_turns
- replay_events
- replay_mistake_tags
- replay_sim_feedback
- player_pattern_snapshots

Raw logs are optional and should be user-controlled because they may contain usernames or private notes.

Showdown HTML replay files are also user-controlled raw evidence. They may be used for local feedback, sim calibration targets, and future profile history when the user explicitly saves them. They must not automatically rewrite official Champion legality, mechanics truth, or global leaderboard rankings.

Current protocol bridge:

- `-ability` rows become structured ability evidence.
- `-item`, `-enditem`, and `-activate` rows become structured item/activation evidence.
- `cant` rows become structured action-denial evidence.
- `detailschange`, `formechange`, and `-mega` rows become structured form-change evidence.
- `-singleturn` rows become structured single-turn protection/effect evidence.
- `-supereffective` and `-resisted` rows become structured matchup/effectiveness evidence.

These rows are the next feed for explaining why a real match turn worked or failed: blocked moves, flinch turns, Mega timing, item activation, ability activation, spread pressure, and matchup damage context.

Visible cards shipped from this bridge:

- `Action Denial Review` explains `cant`, miss, fail, and immunity rows.
- It separates player-side denied actions from opponent-side denied actions.
- It tells the player what happened, why the skipped/blocked action mattered, and what to check next.
- It remains replay-evidence only; it does not infer hidden opponent intent or rewrite simulator rules.
- `Ability / Item Impact Review` explains ability, item, consumption, and activation rows.
- `Mega Timing Review` explains Mega/form-change timing and why the new form can change the board.
- `Damage Context Review` explains super-effective, resisted, and major HP-threshold damage context.

Data retention policy:

- Temp review: normalized result lives in memory and may be cached locally for the session.
- Saved review: normalized summary, mistake tags, confidence, and sim feedback packet are saved.
- Raw log: saved only after explicit opt-in.
- Account/profile sync: saved only after the user signs in or imports/exports a profile bundle.

## Supabase / DB Design

Battle Sensei should use the DB for durable, queryable coaching history, not for temporary anonymous review.

Recommended split:

- anonymous temp review: memory plus optional browser storage
- saved local review: `Storage` / IndexedDB-style local persistence
- signed-in profile: Supabase persistence
- raw log: opt-in only, never required for coaching summaries

Suggested Supabase tables:

```sql
replay_reviews (
  id uuid primary key,
  profile_id uuid null,
  player_team_id text null,
  opp_team_id text null,
  source text not null,
  format text null,
  selected_side text not null,
  winner text null,
  result text null,
  turn_count int not null default 0,
  lead_grade text null,
  bring_grade text null,
  critical_turn int null,
  confidence text not null,
  raw_log_saved boolean not null default false,
  raw_log text null,
  summary_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

replay_turns (
  id uuid primary key,
  review_id uuid references replay_reviews(id) on delete cascade,
  turn_number int not null,
  board_state jsonb not null default '{}',
  events jsonb not null default '[]',
  coaching_json jsonb not null default '{}'
);

replay_mistake_tags (
  id uuid primary key,
  review_id uuid references replay_reviews(id) on delete cascade,
  turn_number int null,
  tag text not null,
  severity text not null,
  confidence text not null,
  evidence text null,
  recommendation text null
);

replay_sim_feedback (
  id uuid primary key,
  review_id uuid references replay_reviews(id) on delete cascade,
  should_update_lead_model boolean not null default false,
  should_update_bring_four_model boolean not null default false,
  should_update_archetype_model boolean not null default false,
  should_create_scenario boolean not null default false,
  scenario_type text null,
  pilot_difficulty_signal text null,
  team_construction_signal text null,
  rng_contamination text null,
  confidence text not null,
  payload jsonb not null default '{}'
);

player_pattern_snapshots (
  id uuid primary key,
  profile_id uuid null,
  team_signature text null,
  sample_size int not null default 0,
  pattern_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

RLS direction:

- anonymous inserts can be disabled until the account/profile model exists
- public read should be off by default
- profile-scoped read/write should require ownership once auth exists
- local-only mode must continue to work without Supabase credentials

Adapter direction:

- add fail-soft methods such as `saveReplayReview`, `loadReplayReviewsForProfile`, and `loadReplayTurns`
- never block replay analysis when DB is unavailable
- persist normalized data first; raw log is a separate opt-in field

## Phased Build

### Phase R1 - Battle Sensei UI Shell

- Add Battle Sensei tab.
- Paste/upload log.
- Select side and review type.
- Render placeholder cards.
- No persistence yet.

### Phase R2 - Parser MVP

- Parse players, winner, turns, leads, moves, switches, faints, basic field effects.
- Return normalized object with unknowns and confidence.
- Add fixture logs under `tests/fixtures/showdown/`.

### Phase R3 - Summary + Timeline

- Render result, turns, leads, winner, and selected four where inferable.
- Render readable turn timeline.
- Keep raw log collapsed by default.

### Phase R4 - Core Coaching Rules

- Detect at least five issue types.
- Add confidence labels.
- Add better-line suggestions.
- Do not claim hidden data as fact.

### Phase R5 - Critical Turn Engine

- Detect first mistake, fatal mistake, and biggest swing.
- Explain difference between early mistake and losing turn.

### Phase R6 - Sim Comparison

- Compare actual lead/four/path to sim recommendation.
- Diagnose team issue vs pilot issue vs RNG issue.

Implementation direction:

- Sim Comparison may read the latest in-app simulation/strategy report as a temporary bridge.
- Battle Sensei remains the evidence and confidence authority.
- Strategy output must not override Battle Sensei confidence labels.
- If the replay opponent cannot be matched to a simulated opponent with enough evidence, render `needs_sim_data`.
- When sim data is missing, tell the trainer to run that matchup in Sim Mode or upload more logs so the platform can compare simulation theory against real replay choices.
- Existing Strategy wording should be audited and aligned with Battle Sensei standards before it becomes a premium combined report source.
- Longer term, Strategy, Sim Coach, Battle Sensei, Battle IQ, and the future premium report should share the same evidence vocabulary: `Observed`, `Strong inference`, `Weak inference`, and `Needs more data`.

### Phase R7 - Sim Feedback Packet

- Emit replay-derived calibration signals.
- Flag new scenarios for future sim testing.

### Phase R8 - Persistence + Multi-Log Patterns

- Save review summary and normalized turn data.
- Build player mistake profile, lead trends, bring-four trends, speed-control conversion, and practice plan.

## Acceptance Criteria

MVP is complete when:

- user can paste a Showdown log
- user can select their side
- parser extracts battle summary
- app shows result, turns, leads, and winner
- app shows a readable timeline
- app detects at least five coaching issues
- app identifies a likely critical turn
- app gives specific better-line suggestions
- app marks confidence
- app does not crash on incomplete logs
- raw log is hidden by default
- existing sim mode still passes smoke and full non-DB suite

V2 is complete when:

- replay can be matched to sim data
- best sim lead is compared to actual lead
- recommended four is compared to actual four
- expected win path is compared to actual path
- team-vs-pilot-vs-RNG diagnosis is rendered
- Sim Feedback Packet is generated
- replay review summary can be saved
- multiple logs produce player-pattern analysis

## Risks And Guardrails

- Showdown log formats vary. Parser must be fixture-driven and tolerant.
- Hidden information is real. Confidence labels must prevent overclaiming.
- Raw logs may include usernames. Raw-log persistence must be explicit.
- Replay-derived calibration should not automatically rewrite sim models until enough sample exists.
- The first version should be deterministic and rule-based before any LLM-style explanation layer is considered.

## First GitHub Issue Breakdown

1. `#187` Parent tracker.
2. `#188` Battle Sensei UI shell.
3. `#189` Showdown log parser MVP with fixtures.
4. `#190` Replay summary and turn timeline.
5. `#191` Core replay coaching rules.
6. `#192` Critical turn detector.
7. `#193` Sim comparison card.
8. `#194` Sim Feedback Packet.
9. `#195` Replay persistence schema and privacy controls.
10. `#196` Multi-log player pattern dashboard.
11. `#197` Supabase replay schema migration.

## Duration Effect Summary

Schema: `champions-duration-effect-summary-v1`

Purpose: convert multi-turn battle effects into coaching evidence. The coach should understand not only whether a move was used, but whether the move was timed into a useful window.

Current labels:

- `field_effect_expired`: a tracked duration effect reached zero or disappeared after being active.
- `field_effect_reissued_after_expiry`: a tracked effect became active again after the log already showed that same effect expire.
- `tailwind_reused_while_active`: Tailwind was selected while that side already had Tailwind turns remaining.
- `tailwind_into_active_trick_room`: Tailwind was selected while Trick Room was active before or after the turn.
- `tailwind_delayed_until_trick_room_end`: Tailwind was selected after the log showed Trick Room expire.

Guardrails:

- A duration label is evidence for coaching review, not automatic proof that a move was wrong.
- Recommendations must include sample size and confidence when aggregated across sims.
- Tailwind into Trick Room can be correct if the player is intentionally bridging into the post-Trick Room turn; the coach must explain that as a branch, not a blanket mistake.
- Reissuing an effect after expiry can be correct if the next turns produce damage, KOs, forced Protects, or preserve a win condition.

Roadmap:

- Expand duration tracking beyond Tailwind and Trick Room into weather, terrain, screens, speed drops, priority pressure, Protect/guard windows, and matchup-specific setup timing.
- Compare the active duration window against outcome evidence: damage, KOs, protected allies, forced switches, preserved win condition, or lost tempo.
- Feed repeated timing patterns into the shared coach memory only as aggregate, non-personal evidence.

## Coach Event Rows

Schema: `champions-coach-event-row-v1`

Purpose: convert tactical labels and duration labels into DB-ready coaching facts.

Each row includes:

- `event_label`: the detected tactical event.
- `decision_type`: the coaching category, such as `speed_control_tailwind`, `speed_control_trick_room`, `speed_control_contest`, or `duration_timing`.
- `outcome`: `positive`, `negative`, or `neutral` based on current evidence.
- `confidence`: current confidence for this one row.
- `situation`: plain-English explanation of what happened.
- `why_it_matters`: coaching reason this event can affect the battle.
- `next_test`: the next branch the player or Tactical QA should compare.
- `evidence`: the original tactical/duration event payload.
- `privacy_boundary`: shared learning must aggregate rows without exposing another player's private identity.

Export surfaces:

- downloaded turn logs
- retained replay cards
- `qa_coverage_summary`
- merged Run All QA / Tactical QA artifacts

Guardrails:

- Rows are evidence units, not final recommendations.
- Shared DB learning should aggregate by matchup, decision type, event label, outcome, sample size, and confidence.
- Recommendations must still show the branch evidence and sample size.

## Faint Cause Summary

Schema: `champions-faint-cause-summary-v1`

Purpose: prove every HP drop and faint has structured evidence.

Fields:

- `total_faints`: count of Pokemon that crossed to 0 HP in the turn-log snapshots.
- `explained_faints`: faints with matching `damage_events` or HP-losing `effect_events`.
- `unexplained_faints`: faints without matching structured evidence.
- `hp_drops`: non-faint HP drops between pre and post snapshots.
- `unexplained_hp_drops`: HP drops without matching structured evidence.
- `faint_causes`: human-readable cause rows, including move/effect, damage amount, HP before, and HP after.
- `unexplained`: QA rows that must be fixed before trusting coaching for that replay.

Acceptance rule: QA artifacts should trend toward `unexplained_faints: 0` and `unexplained_hp_drops: 0`. Any nonzero row is a replay-truth bug or an unsupported effect path that needs structured logging. A faint explanation must match lethal structured evidence where HP reaches 0. Earlier nonlethal chip on the same Pokemon can explain an HP drop, but it must not be used as the faint cause.

## Action-Denial Evidence

Purpose: prove why a Pokemon did or did not act on a turn.

Required structured rows:

- `flinch-applied`: a move or effect applied flinch to the target.
- `flinch-skip`: the target was still alive when its action resolved and actually lost its move.
- `sleep-skip`: the selected action was skipped because the Pokemon remained asleep.
- `frozen-skip`: the selected action was skipped because the Pokemon stayed frozen.
- `paralysis-skip`: the selected action was skipped because full paralysis triggered.
- `confusion-self-hit`: the selected action was skipped and the Pokemon damaged itself.

Acceptance rule: action denial must not exist only as replay text. Every skipped selected action should have an `effect_events` row with `action_denial: true`, `skipped_move: true`, `skipped_action_move`, `volatile_status`, and any HP delta caused by the denial. State application and action loss must stay separate: a Pokemon can be flinched and then faint before acting, so `flinch-applied` alone must not be reported as a skipped move.

## Replay Board-State Visibility

Purpose: let QA and players challenge the board condition after any play without reading raw JSON.

Replay turns should expose:

- field state: Tailwind, Trick Room, weather, terrain, screens, Protect-family states, Guard-family states, and remaining turns where known.
- Pokemon state: HP, major status, volatile/action-denial status, stat stages, speed-control modifiers, and recent effect tags for that turn.
- evidence access: compact chips on Pokemon cards plus hover/click detail, backed by the same downloaded JSON rows.

Acceptance rule: a replay card should make the visible board state explainable from the turn snapshot and structured event rows. If a player asks "why did this Pokemon move slower, skip, survive, faint, or lose HP?", the answer should be visible in the replay UI and reproducible from the exported artifact.

## Contact Move Audit

Schema: `champions-contact-move-audit-v1`

Purpose: prove contact-triggered effects are based on move metadata, not guesswork. Rough Skin, Spiky Shield, Iron Barbs-style hooks, and similar future mechanics must be explainable from the move selected, the contact classification, and the resulting effect event.

Fields:

- `totals.action_moves`: count of selected action moves inspected.
- `totals.damaging_moves`: count of damage-event moves inspected.
- `totals.contact_true`: move rows proven to be contact.
- `totals.contact_false`: move rows proven to be non-contact.
- `totals.unknown_contact`: move rows where contact status could not be proven.
- `totals.missing_move_metadata`: move rows missing trusted move metadata.
- `totals.local_contact_override`: rows relying on local fallback contact data.
- `totals.showdown_contact_flag`: rows backed by Pokemon Showdown contact flags.
- `totals.contact_damage_events`: Rough Skin, Spiky Shield, or similar contact-triggered effect rows.
- `moves`: per-move contact classification, metadata source, use count, and damaging use count.
- `unknown_physical_moves`: QA list for physical moves whose contact status could not be proven.
- `contact_damage_events`: sampled contact-triggered damage rows with turn, actor, source, move, and effect kind.

Acceptance rule: contact damage must have an effect row with HP before/after and the triggering move. `missing_move_metadata` should be 0 for moves that matter to contact coaching. Any unknown physical contact status should become a data task before using that replay as trusted coaching evidence.

## QA Artifact Coverage Breakdown

Schema addition: `coverage_breakdown`

Purpose: prevent full-artifact QA totals from being confused with retained replay-card totals.

The top-level `qa_coverage_summary` remains the full artifact summary for backward compatibility. New consumers should prefer the explicit breakdown:

- `coverage_breakdown.retained_replay_card_summary`: only the retained replay cards exported under `retained.replay_cards`.
- `coverage_breakdown.full_artifact_summary`: all included evidence, including retained replay cards plus targeted QA and tactical/branch sweep evidence.
- `coverage_breakdown.targeted_sweep_summary`: only targeted QA sweep evidence.
- `coverage_breakdown.forced_branch_matrix_summary`: the first forced branch matrix summary, kept for compatibility with existing single-opponent tooling.
- `coverage_breakdown.tactical_sweep_summary`: all tactical sweep branch matrix summaries merged together.

Acceptance rule: replay-card validation must use `retained_replay_card_summary`. Broader coverage claims can use `full_artifact_summary`, but reports must say that targeted and tactical sweep evidence may add totals beyond the retained replay-card count.
