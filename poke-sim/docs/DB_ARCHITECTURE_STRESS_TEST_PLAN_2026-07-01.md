# DB Architecture Stress-Test Plan

Date: 2026-07-01
Status: Architecture framing slice. Do not treat this as a DB migration or public-launch approval.

## Goal

Stress test the database split before adding more tables. The product direction is bigger than a simulator save table:

1. prove the simulator is accurate
2. preserve evidence for every important claim
3. give each trainer a private room to test and improve
4. let Battle Sensei coach from that trainer's own evidence
5. let global learning improve from anonymized, trusted, versioned signals
6. eventually support bot practice without teaching from bad or private data

The DB must make wrong data hard to promote, stale data easy to mark, and private player data impossible to leak by accident.

## Proposed split

### 1. Source truth

Owns:

- official/in-game source captures
- rule facts
- legality facts
- regulation windows
- ruleset packages
- Champion-vs-Showdown parity status

Existing foundation:

- `rule_facts`
- `ruleset_packages`
- source registry docs
- legality evidence package foundation

Stress test:

- Can unknown Champion data stay `needs_verification`? Yes.
- Can Showdown data be useful without becoming Champion truth? Yes, if source tier stays separate.
- Can old rulesets become stale? Partially; packages support status, but promotion/recalc needs more automation.

Decision:

- Keep this read-only to browser clients.
- Only trusted source-sync/review jobs should write source truth.

### 2. Runtime catalog

Owns:

- approved built-in teams used by the static simulator
- runtime selectable teams
- current legal fallback catalog

Existing foundation:

- `teams`
- `team_members`
- runtime generated data
- DB catalog guardrails

Stress test:

- Can non-legal teams poison selectors? Partially blocked by frontend and retirement guards.
- Can anon writes add bad teams? Current legacy policies are too broad for public scale.
- Can runtime teams be separated from user custom teams? Not clean enough yet.

Decision:

- Keep runtime catalog separate from user-created trainer teams.
- Remove or replace broad anon writes before public launch.

### 3. Evidence truth

Owns:

- sim jobs
- sim runs
- replay evidence
- QA artifacts
- branch sweeps
- damage/effect/turn logs
- evidence summaries

Existing foundation:

- `team_lab_sim_jobs`
- `team_lab_sim_runs`
- `team_lab_replays`
- `trainer_replay_imports`
- `trainer_replay_import_refs`
- `trainer_replay_import_events`
- `branch_coverage_runs`
- QA artifact export/import normalization

Stress test:

- Can every evidence row be tied to `regulation_id`, `format`, `engine_version`, and `ruleset_version`? Team Lab yes; legacy tables only partially.
- Can evidence be replay-verifiable? Partially; QA artifacts are stronger than current DB history.
- Can bad browser evidence become official? No in the current schema path; private replay imports record parser/mapping status and source gaps, but trusted promotion/global learning writes are not created yet.

Decision:

- Treat browser evidence as provisional until trusted import validates it.
- Keep QA artifact exports authoritative until DB forensic retention is intentionally designed.

### 4. Trainer room truth

Owns:

- trainer profile
- private rooms
- the Trainer Room/account workspace on the site
- saved private teams
- uploaded battle files
- private sim history
- personal Battle Sensei memory
- practice drills
- future bot sessions
- regulation-scoped improvement metrics, skill trends, loss diagnosis, team degradation, and "what worked" notes

Existing foundation:

- `trainer_profiles`
- `trainer_rooms`
- `trainer_room_teams`
- owner-scoped RLS migration added in `db/migrations/2026_07_01_trainer_room_foundation.sql`

Stress test:

- Can a player upload Showdown battles and test against their own team without leaking data? Partially; the private room container now exists, but replay import governance is not built yet.
- Can a trainer have team variants, matchup notes, and private coaching history? Partially; room team links and notes exist, but coaching memory is still deferred.
- Can we separate personal analytics from global aggregate analytics? Yes at the schema boundary; no global aggregate writes are created in this slice.

Decision:

- Keep trainer rooms private-first and owner-scoped.
- Treat the site Trainer Room as the user-facing account workspace: one place for personal custom teams, sim battles, uploaded Showdown battles, stats, coaching context, future bot practice, improvement metrics, loss diagnosis, team degradation, and "what worked" notes.
- Trainer Room data must be saved by regulation. Saved teams, replay imports, sim jobs, coaching facts, bot-practice turns, and improvement metrics must carry `regulation_id`, `ruleset_version`, and `engine_version`.
- Historical regulation data can inform long-term player history, but active recommendations must default to the selected/current regulation and flag stale or cross-reg evidence.
- A Showdown replay/log filename that matches a personal/custom team name may attach that import to the matching private team for Trainer Room analysis.
- A Review upload Reference team dropdown may manually attach a replay to a private/custom team when filename matching is unclear.
- Every uploaded replay can improve that player's private Trainer Room coaching context for the matching regulation, but global learning/published ranking updates require consent, trusted mapping, legality checks, parser confidence, dedupe, and stale-version review.
- Public showcase, replay imports, personal coaching facts, global learning, and bot sessions require separate reviewed migrations.

### 5. Global learning truth

Owns:

- anonymized aggregate patterns
- accepted global learning signals
- aggregate matchup trends
- confidence/sample-size/stale flags
- import audit decisions

Existing foundation:

- Team Lab promotion concepts exist.
- No full global learning aggregate layer yet.

Stress test:

- Can one user's bad import poison global recommendations? Without a trusted import worker, yes.
- Can hidden tech leak through aggregate tables? If aggregates are poorly designed, yes.
- Can global recommendations survive engine/ruleset updates? Only if every row is versioned and staleable.

Decision:

- Do not build global learning writes until trainer consent, trusted import, mapping verification, and stale marking are implemented.
- Store aggregate buckets, not raw private data.

### 6. Bot practice truth

Owns:

- bot profile
- bot policy version
- manual battle sessions
- board states
- player actions
- bot actions
- bot reasoning summaries
- outcome evidence

Existing foundation:

- Not built yet.

Stress test:

- Can the bot cite why it made a play? Not until evidence/ref paths exist.
- Can bad engine logic train bad bot behavior? Yes.
- Can a bot learn from one player without exposing them to others? Only with trainer-room privacy and consent controls.

Decision:

- Bot practice is future-gated behind sim truth, trainer rooms, and personal coaching memory.
- Bot memory must store `bot_version`, `policy_version`, `engine_version`, `ruleset_version`, and evidence refs.

## Roadmap stress test

### Current priority: simulator truth

DB requirement:

- Store evidence, not claims.
- QA artifacts must say what they prove and what blocks 100%.
- No global ranking/coaching promotion from incomplete mechanics.

Pass/fail:

- Current QA 100-readiness gate is aligned.
- Remaining blocker is producing the missing evidence, not more DB surface.

### Near priority: trainer-room foundation

DB requirement:

- `trainer_profiles`
- `trainer_rooms`
- `trainer_room_teams`
- owner-scoped RLS
- no global learning writes

Pass/fail:

- Backend-only foundation is implemented in `2026_07_01_trainer_room_foundation.sql`.
- It remains a privacy boundary only; it does not make coaching, replay parsing, global learning, or bot-play claims.

### Completed priority: replay import governance

DB requirement:

- private replay imports
- parser version
- source hash
- parse status
- mapping status
- source gaps
- replay turns/events

Pass/fail:

- Implemented as private governance tables in `2026_07_01_replay_import_governance.sql`.
- Safe for private parser review and future personal coaching inputs.
- Not safe for global learning until parser/mapping is verified by a future trusted worker and consent gate.

### Completed priority: private replay parser service

DB/service requirement:

- detect Showdown HTML/text, Champions turn-log JSON, and QA artifact JSON
- normalize parser output into `trainer_replay_imports`, `trainer_replay_import_refs`, and `trainer_replay_import_events` shaped payloads
- preserve source hash, parser version, source gaps, parser confidence, source-line/event pointers, regulation, format, engine version, and ruleset version
- fail closed on unknown files
- keep all rows private and unpromoted

Pass/fail:

- Implemented as `replay_import_service.js`.
- It reuses `replay_coach.js` for Showdown parsing and `sim_evidence.js` for QA/turn-log artifact intake.
- It returns payloads ready for a DB adapter but does not write to Supabase or promote rows by itself.
- Global learning, Team Lab official ranking promotion, and bot memory remain blocked until trusted-worker review exists.

### Completed priority: private replay import persistence

DB/service requirement:

- insert parent import row first
- insert child refs/events with returned import id
- preserve owner-scoped trainer-room RLS
- keep failures partial and reviewable instead of dropping evidence
- do not promote rows to official rankings or global learning

Pass/fail:

- Implemented as `SupabaseAdapter.saveReplayImport`.
- The browser path inserts the parent import first, then child refs/events with the returned import id.
- Rows remain owner-scoped by trainer-room RLS and are not promoted to official rankings or global learning.

### Implemented slice: replay import UI integration

DB/service requirement:

- wire upload/review controls to `replay_import_service.js`
- expose an explicit Save Private Import action that calls `SupabaseAdapter.saveReplayImport`
- show parser status, mapping status, source gaps, and saved/private state to the user
- map similarly named Showdown logs to the matching private custom team when the filename matches the Trainer Room team name
- allow the player to choose an optional Reference team from their uploaded/custom teams when filename matching is not enough
- keep local-only fallback when Supabase/Auth is unavailable

Pass/fail:

- Private save path is wired for the Review flow, but it should not claim durable account history until real Auth/Trainer Room selection replaces placeholder local room/user ids and saved import history is visible in the Trainer Room.

### Later priority: personal coaching memory

DB requirement:

- trainer coaching facts
- practice drills
- stale flags
- evidence refs
- confidence/sample size

Pass/fail:

- Should wait until replay imports and sim evidence are stable enough to cite.

### Later priority: global aggregate learning

DB requirement:

- aggregate-only learning signals
- consent boundary
- import audits
- sample-size/confidence gates
- version/stale gates

Pass/fail:

- Must wait for trusted import worker and promotion rules.

### Future priority: bot practice

DB requirement:

- bot profiles
- bot sessions
- bot turns
- policy version
- board/action/outcome evidence

Pass/fail:

- Must wait for trainer rooms and personal coaching memory.

## Top architecture challenges

### Challenge 1: Too many writes from the browser

Problem:

- Current legacy anon insert/update policies are useful for prototype speed but unsafe for public learning.

Answer:

- Browser writes can save private trainer-owned data under RLS.
- Browser must not write source truth, official promotion decisions, global learning, or trusted leaderboard state.

### Challenge 2: Personal evidence versus global evidence

Problem:

- A player wants tailored coaching from their own battles, but global coaching must not leak or overfit private data.

Answer:

- Personal data lives under trainer rooms.
- Global data stores anonymized aggregates only after consent and trusted import.

### Challenge 3: Simulator bugs can poison learning

Problem:

- If the engine is wrong, saved results and coaching facts can become wrong.

Answer:

- Every evidence/coaching/learning row carries `engine_version`, `ruleset_version`, `regulation_id`, and `format`.
- Engine/ruleset updates mark affected rows stale.

### Challenge 4: Real replay parsing can be partial

Problem:

- Showdown HTML/text can parse imperfectly, especially team identity, hidden info, and field state.

Answer:

- Replay imports keep `parse_status`, `team_mapping_status`, `parser_version`, and `source_gaps`.
- Partial imports can coach privately with caveats but cannot feed trusted global rows.

### Challenge 5: Team Lab rankings can look too official

Problem:

- A leaderboard can mislead users if sample size, legality, or stale version status is weak.

Answer:

- Official Team Lab promotion requires verified legality, current versions, verified mapping, approved benchmark pool, minimum samples, and no unresolved source gaps.
- Everything else is experimental/local preview.

## First implementation frame

The first migration slice creates only the trainer-room foundation:

- `trainer_profiles`
- `trainer_rooms`
- `trainer_room_teams`
- owner RLS
- public read disabled by default
- tests proving owner-only access logic in migration text

Do not include yet:

- global learning
- bot sessions
- personal coaching facts
- replay turn storage
- payment/account entitlements
- leaderboard promotion changes

Reason:

- This gives the product a safe private container without overbuilding future systems before sim truth is ready.

Implementation update:

- `db/migrations/2026_07_01_trainer_room_foundation.sql`
- `tests/trainer_room_tests.js`
- Public read is disabled by default, including for `public_showcase`, until an explicit API/filtering slice exists.

## Second implementation frame

The second migration slice creates only replay import governance:

- `trainer_replay_imports`
- `trainer_replay_import_refs`
- `trainer_replay_import_events`
- parser/source/mapping status fields
- source gaps and confidence flags
- owner-scoped RLS
- public read disabled by default

Do not include yet:

- global learning writes
- official Team Lab promotion
- bot sessions
- personal coaching memory
- raw public replay browsing

Reason:

- This lets uploaded Showdown HTML/text, QA artifacts, and turn logs become auditable private evidence without letting partial parser results poison public rankings or coaching claims.

## Acceptance criteria for next DB slice

1. Trainer room tables are namespaced and do not collide with runtime catalog.
2. Owner fields use `auth.uid()` RLS.
3. Private trainer room rows are not public-readable.
4. Room teams can point to Team Lab teams without exposing hidden details.
5. No source truth or global learning writes are exposed to browser clients.
6. Tests confirm the migration includes owner-only RLS and no anon write policy for trainer private data.
7. Roadmap and guardrail docs state trainer rooms are private first.

## Final decision

The split is sound if we keep the order disciplined:

1. Keep proving sim truth.
2. Add private trainer rooms.
3. Add replay import governance.
4. Add personal coaching memory.
5. Add trusted global aggregate learning.
6. Add bot practice.

Do not reverse this order. Global learning and bot play are powerful only after source truth, evidence truth, and trainer privacy are enforced.

## 2026-07-04 stress target: browser-safe UI and DB-grade large runs

- Normal Simulator selected matchup: allow fast/deep/stress reads up to 5,000 series, with a visible percent progress label.
- Normal Simulator Run All: clamp by estimated total game budget because opponent_count x series x Bo can freeze the browser.
- QA/Stress path: use exported artifacts or future queued jobs for 10,000+ series evidence.
- Required validation: percent progress updates, no duplicate opponent selector, selected/opponent team controls are symmetrical, retained replay caps remain active, and build_id in QA output matches release_manifest.
- Future DB worker: persist requested_series and executed_series separately so interrupted or clamped runs cannot be misread as complete evidence.

## 2026-07-04 linked learning-brain plan

Detailed evidence/learning roadmap: `poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md`.

Stress testing should feed the future learning ledger through normalized rows, not one-off localStorage blobs. The immediate DB priority is raw evidence intake, team version hashes, battle_series rows, battle_games rows, event/features rows, and stale-safe aggregate rows.
