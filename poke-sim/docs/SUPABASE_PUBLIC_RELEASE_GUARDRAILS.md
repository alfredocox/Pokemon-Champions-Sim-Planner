# Supabase Public Release Guardrails

Last updated: 2026-07-01

This document defines the Supabase safety gates required before broader public testing.

## 1. Legal-only active team catalog

Active rows in Supabase `teams` are runtime/training input. They must exactly match the current approved legal catalog in `poke-sim/data.js`.

Rules:

- Legal repo catalog teams can be active.
- Old, non-legal, superseded, or experiment teams must be retired with `metadata.retired = true`.
- The generated live alignment migration retires stale built-in rows outside the current catalog with `retired_reason = "not_in_current_legal_repo_catalog"`.
- `RUN_LIVE_DB=1 node tests/db_m2_seed_tests.js` must pass before Pages deploys a catalog-changing release.
- `node tests/db_live_catalog_guard_tests.js` must pass so the retirement clause cannot silently disappear.

Why this matters:

- Prevents non-legal teams from appearing in selectors.
- Prevents old rows from poisoning QA artifacts, matchup stats, and future coaching recommendations.
- Keeps Kevin, Alfredo, and live Supabase aligned to one approved catalog contract.

## 2. Source-sync monitoring

Source-truth data can change independently of code. Treat Showdown sync and approved DB generation as release inputs, not background noise.

Required release checks:

- Confirm the latest `Showdown Sync` workflow state before a data/mechanics release.
- If generated approved data changes, commit the generated runtime artifacts with the release.
- Do not trust local runtime data if the generated snapshot date is behind a known source update.
- Keep source registry and source sync status pages clear about what was checked, when, and against which source.

Blocked behavior:

- Do not manually patch generated Showdown runtime files without a source-backed generator path.
- Do not train coaching recommendations from unapproved source rows.

## 3. User/team data separation

Public users will create custom teams and generate private analysis history. That data must not be mixed with approved built-in catalog truth.

Rules before public scale:

- Built-in teams, custom user teams, QA fixtures, and retired historical teams need distinct source/status metadata.
- Coaching/training aggregates must filter by legality status, ruleset id, format, and catalog/source status.
- User-specific saved-team analysis must stay scoped to that user/profile unless explicit shared-learning consent exists.
- Shared learning rows must store enough metadata to avoid cross-regulation contamination.
- Retired or illegal teams must not contribute to public recommendation baselines.

Minimum metadata for future learning rows:

- `ruleset_id`
- `format`
- `team_source`
- `legality_status`
- `catalog_status`
- `build_version`
- `source_snapshot_id`
- `user_scope` or equivalent privacy boundary

## 3b. Trainer Room and future learning boundary

Future personal coaching, uploaded battle review, and bot practice should be built around a trainer-owned workspace, not around shared global tables.

Product language:

- The user-facing account workspace is the Trainer Room.
- The Trainer Room should hold the player's custom teams, sim battle history, uploaded Showdown battles, stats, coaching context, future bot practice history, improvement metrics, loss diagnosis, team degradation signals, and "what worked" notes.
- Trainer Room history must be regulation-scoped. Saved teams, replay imports, sim results, coaching metrics, bot practice sessions, and improvement trends must carry `regulation_id`, `ruleset_version`, and `engine_version` so old-reg evidence remains useful history but does not pollute current-reg recommendations.
- If an uploaded Showdown log/replay filename matches a personal/custom team name, the import can be grouped with that private team for analysis.
- If the filename is unclear, the Review upload flow may expose an optional Reference team dropdown so the player can manually attach the replay to one of their private/custom Trainer Room teams.
- Filename and Reference team mapping are private player evidence. They do not prove legality, public ranking value, or global bot-learning truth without a later trusted promotion workflow.

Current foundation:

- `trainer_profiles`, `trainer_rooms`, and `trainer_room_teams` are the first private workspace tables.
- The first migration is owner-scoped through Supabase Auth RLS.
- Public read is disabled by default, including for future `public_showcase` rows, until a separate API/filtering slice protects hidden team details.
- Room teams can reference Team Lab teams, but Team Lab hidden details remain protected by Team Lab policies and API response filtering.
- `trainer_replay_imports`, `trainer_replay_import_refs`, and `trainer_replay_import_events` record private uploaded replay/file evidence with parser version, source hash, parse status, team mapping status, source gaps, confidence flags, and owner-scoped RLS.
- `replay_import_service.js` converts Showdown HTML/text, Champions turn-log JSON, and QA artifact JSON into those private governance payload shapes without writing global learning or official ranking rows.
- Filename-to-team matching is allowed only as private Trainer Room mapping evidence; it is not official legality, global learning, or public ranking proof.
- `SupabaseAdapter.saveReplayImport` persists those private payloads by inserting the parent import first, then refs/events with the returned import id.
- The Review page exposes an explicit Save Private Import action. If Supabase/Auth is unavailable or RLS rejects the write, the UI must report local-only status rather than implying account history was saved.

Required direction:

- Add a trainer/profile layer before public account features.
- Keep Trainer Room login and durable saved account history future-gated until simulator truth is strong enough to preserve useful long-term data.
- Store a private Trainer Room for saved teams, uploaded replays, sim jobs, coaching facts, practice drills, bot sessions, improvement metrics, loss diagnosis, team degradation, and matchup notes.
- Keep real replay imports private until parser status, team mapping, regulation, format, and source gaps are reviewed.
- Replace placeholder local room/user ids with authenticated Trainer Room ids before claiming durable account history.
- Let players explicitly choose whether anonymized signals can contribute to global learning.
- Store global learning as aggregate signals, not raw private teams, raw private replays, or hidden tech choices.
- Require `regulation_id`, `format`, `engine_version`, `ruleset_version`, source status, sample size, and stale status on every promoted learning row.
- Future bot-play sessions must store bot version, policy version, board states, actions, and evidence summaries so bad advice can be audited after engine/rules updates.

Blocked behavior:

- Do not train global recommendations directly from browser anon writes.
- Do not use private trainer data in public rankings without consent, verified mapping, legality status, and trusted-worker promotion.
- Do not let bot memory learn from rows with unresolved source gaps as if they were real-game truth.
- Do not treat private replay import rows as official Team Lab evidence until a trusted worker verifies parser status, team mapping, regulation, format, legality, and stale/version state.
- Do not connect the parser service directly to public leaderboard updates; persistence and promotion must remain separate reviewed paths.
- Do not hide parser/mapping/source-gap warnings from users when the UI starts saving private imports.

See `docs/DB_ARCHITECTURE_GROWTH_AUDIT_2026-07-01.md` for the target schema and `docs/DB_ARCHITECTURE_STRESS_TEST_PLAN_2026-07-01.md` for the challenged slice order.

## 4. Public release gate

Before inviting broad testers:

- Main CI passes.
- GitHub Pages deploy passes.
- Live DB catalog parity passes.
- Battle audit passes.
- Source sync status is reviewed.
- Security/privacy assumptions for saved teams and analysis history are documented.
