# Team Lab architecture alignment

Date: 2026-06-29
Source input: `/Users/kevinmedeiros/Downloads/Pokemon_Champion_Sim_Team_Lab_Architecture_Spec.docx`
Local extracted copy: `poke-sim/docs/team-lab/Pokemon_Champion_Sim_Team_Lab_Architecture_Spec_2026-06-29.txt`
Status: Planning/spec input only. Do not treat this document as Pokemon Champion runtime truth.

## Alignment with current implementation

The current `v2.2.45-team-lab-foundation` backend foundation matches the Task 1 boundary from the architecture spec:

- Team Lab tables were added under namespaced `team_lab_*` names to avoid colliding with existing runtime `teams` and `team_members` tables.
- Team Lab types were represented through JSDoc typedefs because this repo does not currently have a TypeScript app/tsconfig convention.
- Leaderboard calculation includes regulation, format, engine version, ruleset version, games played, raw win rate, adjusted win rate, confidence, legality status, rank, and stale flags.
- Illegal teams are excluded from leaderboard calculation.
- `needs_verification` teams are routed to experimental evidence instead of official ranking truth.
- Hidden-detail visibility redacts hidden moves, item, ability, EVs, IVs, and nature for non-owners in service logic.
- The validator returns `needs_verification` when required Champion source data is missing.
- Tests cover raw win rate, adjusted win rate, confidence, illegal exclusion, experimental `needs_verification`, stale marking, visibility filtering, and hidden-detail redaction.

## Additions from the `.docx` that should guide next tasks

The `.docx` reinforces that Team Lab is part of a larger versioned evidence pipeline, not an isolated leaderboard.

Important future architecture pieces that are not fully built yet:

- `rule_facts`: granular source-truth rows for mechanics, legality, regulation, moves, abilities, items, forms, and battle-flow claims.
- `ruleset_packages`: compiled regulation packages passed into validation and simulation instead of loose/hardcoded rows.
- `replays`: first-class replay/event-log evidence records linked to sim runs.
- `sim_jobs`: queued/running/completed batch sweep jobs for team-vs-team, team-vs-leaderboard, archetype sweeps, full recalculation, and QA regression.
- `analytics_aggregator`: isolated aggregation layer that reads `sim_runs` and writes ratings, confidence, stale flags, and matchup matrices without running battles itself.
- `team_dna`: derived profile layer for speed, damage, defense, dependency, variance, and skill profile.
- `compare_my_team`: simulator-derived comparison report against top teams, archetypes, counters, and benchmark pools.

## Important challenge / guardrail

Do not build the Team Lab UI ahead of the source-truth and sim-truth gates if doing so would make rankings look more authoritative than the evidence supports.

The safe order remains:

1. Preserve and ship the backend foundation.
2. Strengthen ruleset/source-truth and Champion-vs-Showdown parity records.
3. Add first-class replay/sim-job evidence tables only when the engine outputs are stable enough to aggregate.
4. Build read UI with clear stale/experimental/needs-verification warnings.
5. Add custom team submission/editing after visibility and validation service paths are enforced.
6. Add compare/coaching only as simulator-derived evidence with source gaps visible.

## Risk controls to carry forward

- Leaderboard farming weak teams: official scopes should count only approved benchmark pools or reviewed sim jobs.
- Tiny sample size exaggeration: minimum samples and confidence labels are required.
- Engine bug creates false top team: all affected entries must be staleable by engine/ruleset version.
- Unverified Champion data treated as truth: validator must keep returning `needs_verification` and source gaps.
- Private team leakage: centralize visibility filtering and test owner/non-owner views.
- Meta popularity confused with legality: keep rule facts, legality reports, meta data, and analytics outputs separate.

## Follow-up task map

### Next highest-confidence backend tasks

1. Add `rule_facts` and `ruleset_packages` schema as source-truth foundation.
2. Add a ruleset package compiler interface that can return `partial` / `needs_verification` without inventing Champion data.
3. Add `sim_jobs` and `replays` tables after confirming current replay IDs/event logs can be linked cleanly.
4. Add analytics aggregation service boundaries around existing `sim_runs` and future Team Lab rows.

### Deferred UI/product tasks

1. Team Lab read UI.
2. Custom team create/edit/validate UI.
3. Matchup matrix and Compare My Team.
4. Evidence-bound coaching integration.

## Final rule from the architecture input

When in doubt, store the uncertainty. Unknown mechanics, legal data, or source conflicts should be visible as `source_gaps`, `needs_verification`, `confidence_flags`, or `stale` warnings.


## 2026-06-29 implementation update: source-truth package foundation

`v2.2.46-source-truth-packages` implements the first follow-up backend piece from this alignment note:

- `rule_facts` stores granular source claims with category, regulation, ruleset version, format, verification status, source tier, source pointer, linked tests, and JSON evidence data.
- `ruleset_packages` stores compiled regulation packages for validators/sims with legal lists, clauses, mechanics, source status, source gaps, compiled rule-fact IDs, and stale/partial/verified status.
- `source_truth.js` compiles packages conservatively: official/in-game/replay verified facts can contribute to package truth, while Showdown/community/reference-only facts remain source gaps until Champion-verified.
- Unit tests prove missing facts become `needs_verification`, reference-only facts do not promote legality, and complete verified facts can produce a rankable package.


## 2026-06-29 implementation update: sim evidence foundation

`v2.2.47-sim-evidence-foundation` implements the next backend evidence piece from this alignment note:

- `team_lab_sim_jobs` stores queued/running/completed/failed batch and sweep jobs with regulation, format, engine version, ruleset version, team pools, games per matchup, confidence flags, and source gaps.
- `team_lab_replays` stores first-class replay/event-log evidence linked to sim runs and jobs with deterministic seed, result, turn log, damage/effect rows, QA coverage, evidence summary, confidence flags, and source gaps.
- `team_lab_sim_runs` gains optional `job_id`, `replay_id`, and `replay_evidence_summary` pointers.
- `sim_evidence.js` validates and normalizes sim jobs and replay records without running battles or changing engine behavior.

This keeps Team Lab rankings tied to replay-verifiable evidence while preserving uncertainty and avoiding UI overclaiming.


## 2026-06-29 implementation update: QA artifact evidence intake

`v2.2.49-qa-artifact-evidence-intake` adds the first connector from browser QA exports into the Team Lab evidence model:

- `champions-turn-log-v2` artifacts can be normalized into first-class replay evidence records.
- `champions-qa-artifact-v1` artifacts can be normalized into one completed `qa_regression` sim job plus retained replay records.
- Local artifact team keys, such as `player` or bundled opponent keys, are not silently treated as Team Lab UUIDs. They remain artifact-scoped until a caller supplies an explicit team ID map.
- Missing regulation or ruleset metadata stays visible as source gaps instead of being promoted into verified ranking truth.
- Targeted/tactical sweep summary evidence is preserved at job level until individual branch runs are exported as replay records.

This is intentionally backend-only. It does not make leaderboard claims by itself; it gives future import/drop-folder workflows a safe normalization layer so QA artifacts can become auditable evidence.


## 2026-06-29 implementation update: Supabase evidence adapter boundary

`v2.2.50-sim-evidence-adapter` connects the Team Lab evidence model to the existing Supabase adapter boundary:

- `SupabaseAdapter.createSimJob` can insert normalized rows into `team_lab_sim_jobs` when called from a trusted writer context.
- `SupabaseAdapter.updateSimJobStatus` can move jobs through queued/running/completed/failed/cancelled states with status reports and timestamps.
- `SupabaseAdapter.saveReplayRecord` can persist normalized replay evidence into `team_lab_replays`.
- `SupabaseAdapter.listSimJobs` and `SupabaseAdapter.listReplays` expose versioned, scoped reads by regulation, format, engine version, ruleset version, job, run, team, and status.
- Browser anon writes remain intentionally blocked by Supabase RLS. The adapter surfaces `trusted_writer_required` instead of pretending evidence was persisted.

This prepares the QA artifact drop-folder/import pipeline without weakening the security model or turning local browser evidence into official leaderboard truth.

### Missing pieces added to the active plan

The adapter boundary is not the full import pipeline. These items remain open and should be implemented before any Team Lab leaderboard is treated as public ranking evidence:

1. Trusted evidence import worker: accepts normalized artifacts, runs server-side validation, writes `team_lab_sim_jobs` and `team_lab_replays`, and records import audit metadata without exposing service credentials to the browser.
2. Artifact team-ID mapping resolver: maps local artifact keys to reviewed Team Lab team UUIDs and refuses promotion when mapping is ambiguous.
3. Leaderboard evidence promotion rules: separates official benchmark/recalculation jobs from dev/experimental evidence, with minimum sample sizes and source-gap gates.
4. Recalculation queue: rebuilds leaderboard and matchup rows after trusted imports, engine updates, or ruleset updates, then marks old rows stale.
5. Poisoning controls: prevents unknown, illegal, stale, private, or unreviewed evidence from improving public/global leaderboard rank.

### GitHub M15 issue alignment update

As of the `v2.2.50-sim-evidence-adapter` QA check, the Team Lab surface may look empty because the repo has backend/schema/evidence plumbing but not the public read UI or trusted evidence promotion path yet. That is not a simulation regression; it is an unfinished M15 product surface.

Current M15 GitHub issue map:

1. #179 Team Lab read UI: makes leaderboard/cards/detail/trust badges visible.
2. #180 Custom team submission/edit flow and legality validation.
3. #181 Leaderboard recalculation, stale guards, and official ranking gates.
4. #182 QA artifact import pipeline into sim_jobs and replays.
5. #183 Compare My Team matchup matrix.
6. #184 Hidden-details privacy and public evidence API contract.
7. #185 Account profile analytics.
8. #186 Global vs personal analytics trust boundary.
9. #187 Trusted Team Lab evidence import worker.
10. #188 Artifact team-ID mapping resolver.
11. #189 Team Lab leaderboard evidence promotion rules.

Do not close the Team Lab milestone while the UI is empty. The current backend work is valid only as foundation until the read UI, trusted writer, mapping resolver, and promotion rules are implemented and tested.

## 2026-06-30 implementation update: Team Lab DB preview and promotion trust layer

`v2.2.70-team-lab-db-preview` makes saved branch evidence visible on Home without promoting it to official ranking truth:

- Home loads recent `branch_coverage_runs` rows through `SupabaseAdapter.loadBranchCoverageSummary`.
- The Top 25 table can show an experimental DB branch-evidence preview when saved rows exist.
- Preview scoring uses adjusted win rate, branch sample weight, opponent coverage, confidence, and outcome-drift penalty.
- Rows are explicitly labeled `experimental DB preview` / `Saved branch rows - not official global rank`.
- This preview is useful player feedback, but it is not the official leaderboard path.

`v2.2.71-team-lab-mapping-promotion` adds the DB engineering layer needed before official promotion:

- `team_lab_team_key_mappings` maps local/source keys such as `player`, bundled team IDs, QA artifact keys, and branch-coverage keys to durable `team_lab_teams.id` values.
- Mappings have `pending`, `verified`, `rejected`, and `stale` states so ambiguous identity never silently becomes leaderboard truth.
- `team_lab_promotion_rules` stores versioned promotion gates by regulation, format, scope, sample size, legality requirement, current engine/ruleset requirement, verified mapping requirement, and approved benchmark-pool requirement.
- `team_lab_promotion_audits` records private trusted-worker decisions for approved, blocked, experimental, or stale promotion outcomes.
- `team_lab_leaderboard_entries` now has optional `team_key_mapping_id`, `promotion_status`, and `promotion_reasons` fields.
- `team_lab.js` exposes deterministic helpers for mapping resolution and promotion decisions before any trusted worker writes shared ranking state.

Security/trust stance:

- Public browser code may preview branch evidence, but it must not write official promotion decisions.
- Mapping and promotion audit tables are private under RLS; active promotion rules may be public-readable.
- Official Top 25 promotion requires verified legality, verified team mapping, current engine/ruleset versions, approved benchmark pool, sufficient samples, and no unresolved source gaps.
- `needs_verification` or unresolved source gaps route to experimental evidence, not official leaderboard scope.

## 2026-06-29 implementation update: Team Lab newsroom hub

`v2.2.52-team-lab-newsroom-hub` starts the read UI direction for #179 without inventing rankings:

- Overview now includes a visible Team Lab home section before the milestone board.
- The section is framed like a sim home/news hub: Champion source watch, QA signal, build lane, and future player-value cards.
- A clean `Top 25 Simulator Teams` table is visible, but ranking rows are locked until trusted import, team-ID mapping, and evidence promotion rules are complete.
- The UI states that future news cards can pull from the source registry and release notes, but today they show build/source readiness instead of pretending to be live Pokemon news.

This is intentionally a first read-UI shell. It should evolve into the Team Lab page after #187, #188, and #189 protect data quality.

## 2026-06-29 implementation update: Home/Roadmap split

`v2.2.53-home-roadmap-split` corrects the product IA:

- Home is the default landing page for Team Lab, leaderboard/news, and future player-facing updates.
- Roadmap is the renamed former Overview tab and should stay focused on milestones, open tasks, closed proof, and issue alignment.
- Simulator is again the battle workspace only.

This keeps player-facing discovery separate from contributor/project-management tracking.

## 2026-06-29 implementation update: Home news carousel

`v2.2.54-home-news-carousel` adds the first real Pokemon news surface to Home:

- Home now includes a source-linked slideshow for official Pokemon Champions news articles.
- Cards use official Champions imagery and link out to Pokemon.com article URLs.
- The feed is static/curated for now because a CORS-safe official live feed is not established in the app.
- The UI states that news is player-facing context, not mechanics truth until source rows are reviewed.

Future improvement: replace the curated list with a reviewed source-sync/news ingestion path that stores article title, URL, source tier, image URL, fetched_at, and verification status.

## 2026-06-29 implementation update: Home value proposition

`v2.2.64-team-lab-ranking-policy` turns Home into a clearer player landing page:

- Adds a hero that explains the simulator value: build better teams, test smarter lines, and learn why battles swing.
- Adds quick actions into Simulator, Replay Review, and Roadmap.
- Adds competitive tips for speed control, replay evidence, team importing/editing, and series testing.
- Adds a how-to-use path from team idea to tested battle plan.
- Adds trust gates explaining why rankings stay evidence-bound and unknown Champion data stays `needs_verification`.

This is user-facing promotion, but it remains evidence-bound and avoids claiming real ladder truth before Team Lab trusted imports and promotion rules are complete.

## 2026-06-29 implementation update: Home start cycle

`v2.2.64-team-lab-ranking-policy` consolidates the previous Start Here and How To Use sections into one 4-step player cycle:

- Choose or import a team.
- Run the matchup.
- Read the swing turn.
- Change one thing and rerun.

This keeps Home focused on player value instead of duplicated feature cards, and it supports the product direction that the simulator should answer specific competitive questions with replay-verifiable evidence.

## 2026-06-29 implementation update: Home battle lab framing

`v2.2.64-team-lab-ranking-policy` moves Home closer to a top-tier simulator landing page:

- Leads with a direct product promise: a Pokemon Champion battle lab for testing teams before play.
- Adds a sample sim output card so users see the kind of evidence the tool should produce: result, swing turn, coaching read, and trust state.
- Adds question-based entry points for common player needs: lead choice, selected-four choice, loss review, legality trust, bad matchups, and first change to test.
- Keeps official news useful but below the product value, so Home explains the simulator before acting like a news page.

This aligns Home with the evidence-bound product strategy: users should understand what decision the sim helps improve, what proof supports the answer, and what remains unverified.

## 2026-06-29 implementation update: Home graffiti-print title

`v2.2.64-team-lab-ranking-policy` adds a graffiti-print hero title treatment to make Home feel more like a memorable competitive gaming landing page while keeping the underlying product message evidence-bound and readable.

## 2026-06-29 implementation update: Battle Labs graffiti title

`v2.2.64-team-lab-ranking-policy` changes the Home hero title to `Battle Labs` and strengthens the visual treatment from a simple skewed headline into a graffiti-print tag with heavy outline, layered spray colors, irregular backing, and underline paint stroke.

## 2026-06-29 implementation update: 90s Battle Labs title

`v2.2.64-team-lab-ranking-policy` pushes the Home hero toward a louder 90s arcade/skate/anime-magazine print style: neon offset shadows, halftone backing, heavy sticker outline, and a `isolation:isolate` tag. The visual goal is more memorable first impression without changing the evidence-bound simulator claims.

## 2026-06-29 implementation update: Battle Labs title cleanup

`v2.2.64-team-lab-ranking-policy` simplifies the Home hero from `Welcome to Battle Labs` to `Battle Labs` so the brand mark is shorter, punchier, and easier to read in the 90s graffiti-print treatment.

## 2026-06-29 implementation update: clean Battle Labs hero

`v2.2.64-team-lab-ranking-policy` tightens the Home hero after visual review: the title stays 90s-inspired, but the decorative plate is contained so it cannot cover the wording, the extra badge text is removed, and the hero message is reduced to one clear player promise plus two primary actions.

## 2026-06-29 implementation update: Team Lab ranking gates

`v2.2.64-team-lab-ranking-policy` turns the empty/locked Team Lab surface into an explicit product workflow:

- Shows the four gates required before Top 25 teams can rank: validated teams, replay-backed sim evidence, trusted import worker, and promotion rules.
- Keeps public rankings locked instead of inventing placeholder teams or fake win rates.
- Adds direct actions into Simulator and Replay Review so testers can generate the evidence the ranking system needs.
- Reinforces that leaderboard rows require regulation, format, engine version, ruleset version, sample size, legality, confidence, and stale-state checks.

## 2026-06-29 implementation update: Team Lab ranking policy

`v2.2.64-team-lab-ranking-policy` defines Team Lab ranking as a composite evidence score, not raw win/loss ratio.

Ranking rows can now carry:

- `ranking_score`: adjusted win rate plus opponent strength, matchup coverage, confidence, freshness, source-gap, and volatility effects.
- `evidence_quality`: `official_ready`, `community_safe`, `personal_only`, `experimental`, or `blocked`.
- `matchup_coverage`: unique opponent/archetype coverage and coverage bonus.
- `opponent_strength_delta`: strength-of-schedule adjustment.
- `volatility_penalty`: low-sample penalty.
- `source_gaps`: unresolved source gaps that block official promotion.

Default policy:

- Verified teams with normal user/community sim evidence become `community_candidate` rows.
- Verified teams only become `official_sim_top_25` when current versions, minimum sample, and approved benchmark pool requirements are met.
- `needs_verification` teams stay `experimental`.
- Illegal or stale evidence is blocked from current ranking.
- Private teams stay personal-only.

A disabled admin QA reset control is visible in Team Lab so the test workflow is planned, but public browser users still cannot mutate ranking evidence. The real reset action must run through a trusted admin/server workflow and record an audit reason.

## 2026-07-04 update: browser-capped evidence and leaderboard promotion

Team Lab must treat browser-capped runs as simulator evidence with explicit scope, not as absolute ladder truth.

Promotion requirements:
- regulation_id, format, engine_version, ruleset_version, bo, requested_series, executed_series, estimated_game_budget, and stale status are required.
- Illegal teams are excluded.
- needs_verification teams remain experimental.
- Capped runs can inform confidence, but the UI/API must expose that the run was capped or browser-budgeted.
- Adaptive Bo policy changes stale older leaderboard entries because selected 3/4 lineup behavior affects match results.
