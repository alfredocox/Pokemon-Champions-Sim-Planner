# Learning Brain Architecture Roadmap

Last updated: 2026-07-04

## Purpose

The learning brain is the future evidence layer that turns simulator runs, QA artifacts, uploaded Showdown logs, and real player review data into better coaching, matchup reads, Team Lab rankings, and Trainer Room improvement reports.

It must not become an unsourced rule engine. Mechanics and legality stay controlled by source-truth data, Champion regulation packages, replay-confirmed tests, and versioned engine behavior. The learning brain can identify patterns, confidence, and next tests. It cannot invent Pokemon Champion legality or override battle mechanics.

## Product outcome

A player should eventually be able to ask:

- What did my team lose to?
- Which leads worked into this matchup?
- Which selected 3/4 or 1/3 performed best from my registered team?
- Which moves or turn sequences won games?
- Which plays looked good but failed after the opponent adapted?
- What should I test next?
- Is this recommendation based on verified mechanics, sim evidence, real replay evidence, or weak/meta inference?

The app should answer with versioned evidence, not vague AI claims.

## Non-negotiable trust rules

- Every learned row must include `regulation_id`, `format`, `engine_version`, `ruleset_version`, and `source_type`.
- Every aggregate must include sample size.
- Every recommendation must include confidence and stale status.
- Unknown Champion legality remains `needs_verification`.
- Showdown/mainline data is reference data, not Champion truth.
- Private Trainer Room data must not leak into public/global aggregates without explicit consent-safe aggregation.
- Stale mechanics, stale rulesets, or stale regulation data must mark affected learning rows stale.
- Leaderboards and coaching must distinguish simulation-derived evidence from real-player replay evidence.

## Evidence inputs

### Simulator runs

Source type: `sim_run`

Use for:
- matchup performance
- lineup performance
- lead performance
- win/loss conditions
- turn count
- faint causes
- damage/effect event validation
- Team Lab ranking evidence

Risk:
- If the engine is wrong, the learned pattern is wrong.

Guard:
- Always attach `engine_version`, `ruleset_version`, and stale invalidation.

### QA artifacts

Source type: `qa_artifact`

Use for:
- release validation
- regression detection
- branch/tactical coverage
- damage/effect/log completeness checks
- Josh/Codex handoff evidence

Risk:
- QA artifact rows are often retained samples, not full denominator proof.

Guard:
- Store `requested_series`, `executed_series`, retained replay count, and QA slice type.

### Showdown logs and uploaded battle logs

Source type: `showdown_log` or `uploaded_replay`

Use for:
- real player decision patterns
- common lines
- leads and adaptation patterns
- coaching examples
- opponent-behavior modeling

Risk:
- Showdown mechanics or formats may differ from Pokemon Champion.
- Uploaded files may be incomplete, renamed incorrectly, or mapped to the wrong team.

Guard:
- Store parser confidence, team mapping confidence, format/regulation assumptions, and source gaps.
- Do not promote Showdown data into Champion mechanics truth.

### Team edits and custom teams

Source type: `team_edit`

Use for:
- team version tracking
- before/after performance comparison
- personal Trainer Room improvement history

Risk:
- Changing a team can invalidate old matchup results.

Guard:
- Use immutable team versions and stale old evidence when the set changes materially.

## Core architecture layers

### 1. Raw intake

Stores exactly what came in with minimal processing.

Examples:
- raw QA artifact JSON
- raw Showdown log text or HTML
- raw sim result payload
- raw replay JSON
- raw custom team import

Required fields:
- `id`
- `owner_user_id` nullable
- `source_type`
- `source_filename`
- `source_url`
- `uploaded_at`
- `raw_payload`
- `raw_hash`
- `visibility`
- `privacy_scope`

### 2. Normalized evidence

Converts raw data into consistent tables the app can query.

Required normalized keys:
- `team_id`
- `team_version_id`
- `opponent_team_id`
- `regulation_id`
- `format`
- `bo`
- `engine_version`
- `ruleset_version`
- `source_type`
- `source_confidence`
- `verification_status`

### 3. Feature extraction

Turns battles into coaching features.

Feature families:
- lead pairs or singles leads
- selected 3/4 or 1/3 lineup
- move sequence
- target choices
- switch timing
- Protect timing
- Fake Out/flinch windows
- Tailwind, Trick Room, weather, and terrain windows
- speed-control conversion
- damage trades
- faint causes
- item/ability triggers
- recoil/residual damage
- endgame state
- win condition
- opponent adaptation between games
- player adaptation between games

### 4. Aggregation

Builds summaries from normalized features.

Aggregate examples:
- team overall win rate
- adjusted rating
- matchup win rate
- lead win rate
- lineup win rate
- move-pair success rate
- speed-control conversion rate
- repeated-loss pattern
- best/worst archetype matchup
- confidence label
- stale reason

### 5. Coaching retrieval

The coaching layer should retrieve facts and evidence before producing advice.

A coaching answer should say:
- what happened
- why it mattered
- what evidence supports it
- what is uncertain
- what to test next

It should not say:
- “this is best” without version, sample size, and confidence
- “Champion legal” unless source-truth validation says verified
- “the engine knows” if the mechanic is still `needs_verification`

## Proposed database tables

These are roadmap-level table concepts. Exact migrations should be implemented in smaller tasks.

### `evidence_sources`

Tracks every input file or generated run.

Key fields:
- `id uuid primary key`
- `owner_user_id uuid nullable`
- `source_type text`
- `privacy_scope text`
- `source_filename text`
- `source_url text`
- `raw_hash text`
- `regulation_id text nullable`
- `format text nullable`
- `engine_version text nullable`
- `ruleset_version text nullable`
- `parser_version text nullable`
- `verification_status text`
- `created_at timestamptz`

### `team_versions`

Immutable version of a team at the moment evidence was produced.

Key fields:
- `id uuid primary key`
- `team_id uuid`
- `owner_user_id uuid nullable`
- `team_hash text`
- `regulation_id text`
- `format text`
- `legality_status text`
- `legality_report jsonb`
- `created_at timestamptz`

### `battle_series`

One row per Bo1/Bo3/Bo5 series.

Key fields:
- `id uuid primary key`
- `source_id uuid`
- `team_a_version_id uuid`
- `team_b_version_id uuid`
- `regulation_id text`
- `format text`
- `bo integer`
- `engine_version text`
- `ruleset_version text`
- `series_result text`
- `games_played integer`
- `requested_series integer nullable`
- `executed_series integer nullable`
- `run_budget_policy text nullable`
- `stale boolean`
- `stale_reason text nullable`

### `battle_games`

One row per game inside a series.

Key fields:
- `id uuid primary key`
- `series_id uuid`
- `game_number integer`
- `team_a_bring text[]`
- `team_b_bring text[]`
- `team_a_lead text[]`
- `team_b_lead text[]`
- `winner_team_version_id uuid nullable`
- `turns integer`
- `win_condition text nullable`
- `seed text nullable`
- `replay_ref text nullable`

### `battle_events`

Queryable event ledger.

Key fields:
- `id uuid primary key`
- `game_id uuid`
- `turn_number integer`
- `event_order integer`
- `event_type text`
- `actor_slot text nullable`
- `target_slot text nullable`
- `move_id text nullable`
- `damage integer nullable`
- `remaining_hp integer nullable`
- `status text nullable`
- `field_state jsonb nullable`
- `source_rule_id text nullable`
- `confidence text`

### `battle_features`

Extracted coaching features.

Key fields:
- `id uuid primary key`
- `game_id uuid`
- `feature_type text`
- `feature_key text`
- `side text`
- `value jsonb`
- `confidence text`
- `source_gap_codes text[]`

### `learning_aggregates`

Versioned aggregate outputs.

Key fields:
- `id uuid primary key`
- `scope text`
- `team_version_id uuid nullable`
- `team_id uuid nullable`
- `opponent_team_id uuid nullable`
- `opponent_archetype text nullable`
- `regulation_id text`
- `format text`
- `engine_version text`
- `ruleset_version text`
- `sample_size integer`
- `metric_key text`
- `metric_value numeric`
- `confidence text`
- `stale boolean`
- `stale_reason text nullable`
- `updated_at timestamptz`

### `coaching_insights`

Evidence-bound coaching rows.

Key fields:
- `id uuid primary key`
- `owner_user_id uuid nullable`
- `team_id uuid nullable`
- `scope text`
- `insight_type text`
- `headline text`
- `explanation text`
- `recommended_test text nullable`
- `evidence_refs jsonb`
- `confidence text`
- `stale boolean`
- `created_at timestamptz`

## Privacy model

### Private Trainer Room evidence

Private rows belong to a logged-in user and can power:
- personal team history
- personal matchup history
- private coaching
- private improvement metrics
- uploaded replay review

They must not power:
- public leaderboard rankings
- public examples
- global recommendations tied to identifiable teams

### Global aggregate evidence

Global rows can power:
- public Team Lab rankings
- archetype trends
- common matchup patterns
- generic coaching recommendations

Requirements:
- no private moves/items/EVs leak
- no user-identifying data
- source and sample size visible
- stale and confidence labels visible

## Learning promotion rules

Evidence can move through these states:

1. `raw`
2. `parsed`
3. `normalized`
4. `feature_extracted`
5. `aggregate_candidate`
6. `experimental_learning`
7. `trusted_sim_evidence`
8. `stale`
9. `rejected`

Promotion to trusted sim evidence requires:
- legal or verified team status
- current regulation
- current engine version
- current ruleset version
- enough sample size
- no critical source gaps
- no parser failure
- no hidden-detail leak

Showdown/replay evidence should usually promote to `experimental_learning` or `real_replay_pattern`, not mechanics truth.

## Milestone plan

### Milestone A: Evidence intake foundation

Build:
- evidence source table
- raw artifact import
- raw Showdown/log import registry
- parser status and source gaps
- artifact hash dedupe

Exit criteria:
- repeated uploads do not duplicate evidence
- every upload has source_type, parser status, owner/private scope, and raw hash

### Milestone B: Team and series normalization

Build:
- team version hash
- series/game rows
- lineup/lead extraction
- sim requested/executed series tracking
- stale flags

Exit criteria:
- Bo3/Bo5 data can answer series count and actual game count separately
- team edits do not corrupt old evidence

### Milestone C: Replay and event feature ledger

Build:
- battle event rows
- damage/faint/status/field event extraction
- move sequence features
- speed-control and Protect timing features

Exit criteria:
- replay logs can explain why a Pokemon fainted
- coaching can cite event rows instead of vague summaries

### Milestone D: Aggregates and confidence

Build:
- aggregate table
- confidence labels
- sample-size rules
- stale invalidation by engine/ruleset/regulation/parser version

Exit criteria:
- Team Lab can rank only eligible current evidence
- capped browser runs cannot be mistaken for full stress proof

### Milestone E: Trainer Room private learning

Build:
- login-gated private evidence
- saved teams
- uploaded replay mapping to a selected team
- personal trends
- export/delete controls

Exit criteria:
- a user can see private coaching without leaking hidden team details

### Milestone F: Coaching brain retrieval

Build:
- evidence retrieval for coaching
- insight generation from aggregates and event rows
- recommendation cards with confidence/source/stale labels
- next-test planner

Exit criteria:
- the coach can say what changed the battle, why, and what to test next

### Milestone G: Global learning and public Team Lab promotion

Build:
- consent-safe aggregate promotion
- public leaderboard promotion rules
- anti-poisoning checks
- abuse and spam protection

Exit criteria:
- public rankings are auditable, versioned, stale-safe, and not based on private leaked data

## Anti-poisoning controls

- Ignore or quarantine illegal teams.
- Mark unknown legality as experimental.
- Deduplicate artifacts by hash.
- Rate-limit uploads once login exists.
- Do not let one user flood public rankings.
- Separate dev_seed data from production evidence.
- Require current engine/ruleset for official rankings.
- Keep stale rows queryable but not current.
- Track parser version so parser fixes can stale old interpretations.

## What should be built next

Immediate next slice:

1. Add source/evidence DB tables for raw intake and normalized battle series.
2. Update artifact import so QA files and Showdown logs can be registered with source_type and raw_hash.
3. Persist requested_series versus executed_series.
4. Add team_version hashing so edited teams do not overwrite old evidence.
5. Add a learning-readiness panel in docs/admin only, not public coaching claims.

Do not build AI recommendations first. Build the evidence ledger first.


## Self-learning principle

The learning brain should improve by watching:
- simulator runs
- QA artifacts
- uploaded Showdown logs
- uploaded replay logs
- future Trainer Room practice games
- user team edits and before/after performance

It should learn:
- which lines tend to win
- which lines tend to lose
- which Pokemon, leads, move sequences, swaps, and endgames create pressure
- which decisions preserve or throw away a win condition
- which matchups need more testing
- which recommendations became stale after a rules, engine, regulation, or team-version change

It must not learn new rules by popularity. If many uploads show an illegal move, the system should flag a legality/source gap, not silently make the move legal. If simulator runs show a pattern under a stale engine, the system should stale those conclusions when the engine changes.

Plain-English rule: the brain can learn how people win inside the rules, but it cannot change the rules.

