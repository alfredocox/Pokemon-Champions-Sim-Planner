# DB Architecture Growth Audit

Date: 2026-07-01
Status: Planning/audit slice. This document does not change battle mechanics or promote any data to official Pokemon Champion truth.

## Executive summary

The database should become the trust backbone for the simulator, not just a place to save teams and QA exports. The future product needs three separated lanes:

1. Source truth: rules, regulations, legality packages, source captures, and verification status.
2. Evidence truth: simulator runs, replay logs, QA artifacts, branch sweeps, real-match imports, and versioned proof.
3. Player truth: trainer workspaces, private teams, personal match history, coaching memory, and future bot practice.

The current schema has strong foundations for source truth and Team Lab evidence, but it is not ready for public-scale personal coaching, global learning, or bot-play memory. The risky parts are legacy anon-write tables, broad branch-coverage writes, missing trainer-room boundaries, missing consent/aggregation controls, and no full trusted import worker yet.

## Current DB foundation we have

### Runtime catalog tables

Existing tables:

- `rulesets`
- `teams`
- `team_members`
- `prior_snapshots`
- `golden_battles`
- `analyses`
- `analysis_win_conditions`
- `analysis_logs`
- `branch_coverage_runs`

Current role:

- Store bundled/runtime teams and analysis summaries.
- Support current browser sim history and branch coverage.
- Keep early Supabase integration working.

Risks:

- Legacy `anon_insert_teams`, `anon_insert_team_members`, `anon_insert_analyses`, `anon_insert_analysis_logs`, and `anon_update_branch_coverage_runs` policies are too broad for a public product.
- `analysis_logs` is not full forensic turn-log storage.
- `branch_coverage_runs` can be useful for QA memory, but public anon upsert/update is not safe as future global learning truth.

### Source-truth package layer

Existing tables:

- `rule_facts`
- `ruleset_packages`

Current role:

- Store source-bound mechanics, legality, regulation, item, ability, move, form, Pokemon HOME, and meta claims.
- Compile ruleset packages without inventing unknown Champion data.

Good pattern:

- Read-only to browser roles.
- Unknowns become `needs_verification` or `conflicting`.
- Versioned by `regulation_id`, `ruleset_version`, and `format`.

Gap:

- Needs real Regulation M-B official/client-captured source package before legality or rankings can be 99% trusted.

### Team Lab foundation

Existing tables:

- `team_lab_teams`
- `team_lab_team_members`
- `team_lab_sim_runs`
- `team_lab_leaderboard_entries`
- `team_lab_matchups`
- `team_lab_sim_jobs`
- `team_lab_replays`
- `team_lab_team_key_mappings`
- `team_lab_promotion_rules`
- `team_lab_promotion_audits`
- `team_lab_admin_actions`

Current role:

- Versioned team records.
- Hidden-detail privacy.
- Versioned simulator evidence.
- Leaderboard entries with stale/version/confidence gates.
- Mapping/promotion guardrails before local artifact team keys become official Team Lab teams.

Good pattern:

- Namespaced `team_lab_*` avoids colliding with runtime catalog.
- Official promotion requires verified legality, current engine/ruleset, benchmark approval, sample size, and verified mapping.
- Browser can preview evidence but should not make trusted promotion decisions.

Gap:

- Trusted evidence import worker is not built yet.
- Global rankings should remain experimental until worker, mapping resolver, and promotion audits are active.

## Target future architecture

### 1. Trainer workspace layer

Purpose: each player gets a private room to test, learn, and improve without leaking strategy.

Recommended tables:

```sql
trainer_profiles (
  id uuid primary key,
  user_id uuid not null,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz,
  data_consent jsonb not null default '{}'
)

trainer_rooms (
  id uuid primary key,
  trainer_id uuid not null references trainer_profiles(id),
  name text not null,
  default_format text check (default_format in ('singles','doubles')),
  default_regulation_id text,
  privacy_mode text check (privacy_mode in ('private','share_anonymous','public_showcase')),
  created_at timestamptz,
  updated_at timestamptz
)

trainer_room_teams (
  id uuid primary key,
  room_id uuid not null references trainer_rooms(id),
  team_lab_team_id uuid references team_lab_teams(id),
  role text check (role in ('main','test_variant','benchmark','opponent','bot_team')),
  notes text,
  active boolean default true,
  created_at timestamptz
)
```

Rules:

- Trainer data is owner-only by default.
- A trainer can save multiple teams, variants, and benchmark opponents.
- Public/global systems only see anonymized aggregates when consent and validation gates pass.

### 2. Player match/replay intake layer

Purpose: uploaded Showdown/Champion battle files become private evidence first, not global truth.

Recommended tables:

```sql
trainer_replay_imports (
  id uuid primary key,
  trainer_id uuid not null references trainer_profiles(id),
  room_id uuid references trainer_rooms(id),
  source_type text check (source_type in ('showdown_html','showdown_text','champions_export','manual_json')),
  source_hash text not null,
  parser_version text not null,
  regulation_id text,
  format text check (format in ('singles','doubles')),
  parse_status text check (parse_status in ('parsed','partial','failed','needs_mapping')),
  team_mapping_status text check (team_mapping_status in ('unmapped','pending','verified','rejected')),
  source_gaps text[] default '{}',
  created_at timestamptz
)

trainer_replay_turns (
  id uuid primary key,
  import_id uuid not null references trainer_replay_imports(id) on delete cascade,
  turn_number integer not null,
  visible_state jsonb not null,
  parsed_events jsonb not null default '[]',
  parser_warnings text[] default '{}'
)
```

Rules:

- A replay import is not used for global coaching until parser status and team mapping are verified.
- Replays preserve parser version so old parser mistakes can be reprocessed.
- Real battle imports are evidence for calibration and coaching, not official mechanics truth by themselves.

### 3. Personal coaching memory layer

Purpose: Battle Sensei learns the player, not just the team.

Recommended tables:

```sql
trainer_coaching_facts (
  id uuid primary key,
  trainer_id uuid not null references trainer_profiles(id),
  room_id uuid references trainer_rooms(id),
  team_id uuid references team_lab_teams(id),
  regulation_id text not null,
  format text not null check (format in ('singles','doubles')),
  engine_version text not null,
  ruleset_version text not null,
  fact_type text not null,
  statement text not null,
  evidence_refs jsonb not null default '[]',
  confidence text check (confidence in ('low','medium','high','experimental')),
  sample_size integer not null default 0,
  stale boolean not null default false,
  created_at timestamptz,
  updated_at timestamptz
)

trainer_practice_drills (
  id uuid primary key,
  trainer_id uuid not null references trainer_profiles(id),
  room_id uuid references trainer_rooms(id),
  drill_type text not null,
  scenario jsonb not null,
  reason text not null,
  source_fact_ids uuid[] default '{}',
  status text check (status in ('queued','active','completed','archived')),
  created_at timestamptz
)
```

Rules:

- Coaching facts must cite replay/sim/QA evidence.
- Facts become stale when engine/ruleset/regulation changes.
- Personal weaknesses and tech choices must not leak to public Team Lab.

### 4. Global aggregate learning layer

Purpose: improve recommendations from many users without poisoning data or exposing private teams.

Recommended tables:

```sql
global_learning_signals (
  id uuid primary key,
  signal_type text not null,
  regulation_id text not null,
  format text not null check (format in ('singles','doubles')),
  engine_version text not null,
  ruleset_version text not null,
  source_kind text check (source_kind in ('trusted_sim','verified_replay','qa_artifact','tournament_meta','synthetic_stress')),
  anonymized_key text not null,
  aggregate_bucket jsonb not null,
  sample_size integer not null,
  confidence text not null,
  source_gaps text[] default '{}',
  stale boolean default false,
  created_at timestamptz
)

global_learning_import_audits (
  id uuid primary key,
  source_kind text not null,
  source_id text not null,
  decision text check (decision in ('accepted','rejected','experimental','stale')),
  reasons text[] not null default '{}',
  reviewer text,
  created_at timestamptz
)
```

Rules:

- Global learning stores aggregates, not private full teams or raw private replays.
- Inputs require validation, consent, legality status, version metadata, and minimum sample size.
- Any engine or ruleset update can mark affected aggregate rows stale.

### 5. Bot practice layer

Purpose: future manual play where a player battles a bot that uses simulator evidence and improves safely.

Recommended tables:

```sql
bot_profiles (
  id uuid primary key,
  name text not null,
  bot_version text not null,
  policy_version text not null,
  allowed_data_scope text check (allowed_data_scope in ('source_only','trainer_private','global_aggregate','hybrid')),
  created_at timestamptz
)

trainer_bot_sessions (
  id uuid primary key,
  trainer_id uuid not null references trainer_profiles(id),
  room_id uuid references trainer_rooms(id),
  bot_profile_id uuid references bot_profiles(id),
  regulation_id text not null,
  format text not null,
  engine_version text not null,
  ruleset_version text not null,
  session_status text check (session_status in ('active','completed','abandoned')),
  created_at timestamptz,
  completed_at timestamptz
)

trainer_bot_turns (
  id uuid primary key,
  session_id uuid not null references trainer_bot_sessions(id) on delete cascade,
  turn_number integer not null,
  board_state jsonb not null,
  player_action jsonb,
  bot_action jsonb,
  bot_reasoning_summary jsonb,
  outcome_events jsonb not null default '[]'
)
```

Rules:

- Bot reasoning must cite source/evidence, not invent Champion rules.
- Bot policy version is stored so old bot advice can be audited.
- Bot may learn from the trainer privately, but global learning needs explicit consent and aggregation.

## Current architecture risks

| Risk | Why it matters | Required fix |
| --- | --- | --- |
| Broad anon DB writes | Public users could poison teams, analyses, or branch memory. | Move writes behind authenticated owner policies or trusted service workers. |
| Branch coverage as shared truth | Browser branch rows can help QA but should not become global ranking evidence directly. | Add trusted import/audit layer before global promotion. |
| No trainer room boundary | Personal teams, uploaded battles, coaching facts, and future bot play need private workspace ownership. | Add `trainer_profiles`, `trainer_rooms`, and owner-scoped RLS. |
| Real replay imports not fully governed | Showdown/Champion logs can be parser-partial or mapped to wrong teams. | Add replay import audit, parser version, source hash, mapping status, and source gaps. |
| Personal vs global analytics not separated | Coaching for a user and public aggregate recommendations have different privacy/trust rules. | Split trainer coaching facts from global learning signals. |
| No consent model | Future learning from player data requires explicit boundaries. | Store consent/version in trainer profile and import audits. |
| Bot play could learn bad data | A bot trained on unverified sim/replay rows will reinforce bugs. | Bot sessions must cite engine/ruleset/source versions and use stale guards. |

## Recommended slice order

1. **DB audit closeout doc and Roadmap alignment**: this document plus public guardrails update.
2. **Trainer workspace schema**: `trainer_profiles`, `trainer_rooms`, room teams, owner RLS, tests.
3. **Replay import governance**: source hash, parser version, mapping status, private replay turns.
4. **Trusted evidence import worker spec**: no service role in browser; server-side validation only.
5. **Personal coaching memory**: trainer coaching facts and practice drills with evidence refs.
6. **Global learning aggregate layer**: anonymized, consent-bound, versioned, staleable signals.
7. **Bot practice schema**: bot sessions/turns after sim mechanics and coaching evidence are reliable.

## Engineering rule

Do not use public DB rows to teach the global coach unless all are true:

- `regulation_id`, `format`, `engine_version`, and `ruleset_version` are present.
- legality is `verified` or clearly experimental.
- source gaps are empty or explicitly scoped.
- sample size meets the promotion rule.
- trainer consent allows aggregation.
- team/replay mapping is verified.
- engine/ruleset version is current.
- trusted worker accepted the import.

If any condition fails, keep the data private, experimental, or `needs_verification`.

## 2026-07-04 DB structure note: Bo series, game rows, and run budgets

Future persistence should not store a large Bo run as one vague blob. Use separate layers:

- series-level rows: team_a_id, team_b_id, regulation_id, format, bo, engine_version, ruleset_version, series_result, games_played, requested_series, executed_series, run_budget_policy.
- game-level child rows: series_id, game_number, player_bring, opponent_bring, result, turns, win_condition, seed, replay_ref.
- evidence aggregates: player_win_lead_counts, player_win_bring_counts, win_conditions_by_player_game_win, matchup confidence, stale flags.
- source guard fields: source_gaps, legality_status, verification_status, sample_size, stale_reason.

Browser runs should remain capped. Large 10,000+ series jobs belong in a queued QA/DB worker path so they do not freeze the public app or poison leaderboard confidence with partial client-side runs.

## 2026-07-04 learning brain data requirements

The learning layer needs an evidence pipeline, not unfiltered memory.

Required layers:
- ingestion: sim runs, QA artifacts, Showdown logs, uploaded replays, team edits, and future Trainer Room sessions.
- normalization: map every row to canonical team_id, pokemon_id, move_id, item_id, ability_id, regulation_id, format, engine_version, ruleset_version, and source_type.
- privacy boundary: separate personal Trainer Room evidence from global aggregate evidence. Private player/team data must not leak into public leaderboards or coaching examples.
- feature extraction: leads, selected 3/4 or 1/3, move sequences, switch timing, Protect timing, speed-control windows, damage trades, faint causes, win conditions, matchup archetypes, and unresolved source gaps.
- confidence model: sample size, source tier, legality status, stale status, matchup coverage, version freshness, and replay completeness.
- promotion rules: only verified, current-version, adequately sampled evidence can influence official leaderboard/ranking. needs_verification evidence can inform experimental coaching only.
- stale invalidation: any engine, ruleset, regulation, legality, parser, or major scoring-policy change must mark affected learned rows stale.

The brain should learn patterns like what worked, what failed, what changed the battle, and what to test next. It should not rewrite mechanics or legality truth.
