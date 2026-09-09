# Champion Sim Architecture and Evidence Map

Status: current for source-truth architecture and `v2.2.31-overview-closeout` follow-up docs on 2026-06-29.

Use this file when QA, data reviewers, or repo maintainers need to understand how the simulator works, where source truth enters the system, what Supabase does, and what evidence proves a battle result.

## Plain-English Contract

The battle simulator is a deterministic rules engine, not an LLM brain. It does not guess damage, infer move behavior from text at runtime, or ask a model what should happen.

The intended architecture is:

```text
Source truth
  Pokemon Showdown data and simulator behavior
  Champion-specific official notes and reviewed overrides
  Cross-checkers such as Smogon calc and public documentation
        |
        v
Review and approval layer
  Supabase raw/approved data tables
  source hashes, sync runs, reviewed overrides
  approved Champion teams and legal move views
        |
        v
Generated runtime assets
  generated/pokemon_showdown_legal_data.js
  generated species weights and legality indexes
  runtime_data.js adapters and move-support metadata
        |
        v
Deterministic engine
  engine.js resolves turn order, targets, damage, recoil, drain,
  recovery, stat stages, speed modifiers, items, abilities, weather,
  terrain, switching, fainting, and battle outcome
        |
        v
QA evidence outputs
  downloaded turn-log JSON
  QA Artifact export
  qa_coverage_summary coverage counters
  Overview linked reports and local/CI test output
        |
        v
Optional persistence
  Supabase analyses/history stores bounded summaries and capped logs
  until a reviewed forensic-log retention upgrade is added
```

`v2.1.51-sim-test-scope` separates two player testing jobs in the Simulator UI: a selected-matchup drill for deep tactical coverage, and a preloaded-suite sweep for broader team validation. The high-volume 1,000 and 10,000 series options are stress tiers for collecting more lead-pair, move-line, target, switch, and timing evidence; they are not a claim of exhaustive game-tree proof.

`v2.1.52-tactical-branch-memory` extends forced branch rows with `tactical_summary`: Protect timing, pivot/switch timing, speed control, setup/redirection, first-KO timing, and early position delta. This lets the Strategy guide coach battle tactics from repeated branch evidence instead of only comparing move names.

`v2.1.53-tactical-sweep-qa` adds the tactical branch QA path, now labeled `Tactical Coaching QA` in the UI. It uses the Simulator Test Scope to build branch coverage for either the selected matchup or every approved preloaded opponent, saves unseen branches to `branch_coverage_runs`, and exports a `tactical_sweep` block with per-opponent coverage and combined `branch_move_analysis`.

`v2.1.54-download-ready-fallback` keeps QA exports inspectable when the browser blocks delayed automatic downloads. `_downloadBlob` still attempts the normal save, then leaves a visible `Download ready` link in the Simulator progress area that points at the generated artifact.

`v2.1.55-tactical-sweep-progress` adds progress callbacks to tactical branch export. The Simulator can now report opponent index, branch-memory load, unseen-branch testing, saved rows, and final analysis while a preloaded-suite sweep is running.

`v2.1.56-branch-progress-counters` changes the visible Tactical Sweep counter area from normal W/L fields to branch-specific counters: opponent index, saved branch rows, and percent complete.

`v2.1.57-cache-refresh-reload` reloads once after build-change cache cleanup so testers land on the fresh bundle instead of continuing to run the old page code that was just cleaned up.

`v2.1.58-tactical-depth-selector` adds Quick 24, Deep 100, and Full 250 branch-depth caps for `Tactical Coaching QA`. The selected cap is saved into `tactical_sweep.max_runs_per_opponent` and controls how quickly DB branch memory fills.

`v2.1.59-team-evidence-dashboard` folds shared evidence into the Strategy Priority Board per selected team: normal sim samples, tactical branch samples, best-case, worst-case, likely-case, confidence, set-change comparison, and next-test guidance render together. Same team IDs keep continuity, but changed sets are version-compared by team signature.

`v2.1.83-champions-tera-gate` adds a ruleset boundary after QA found non-Champion legacy transformation data leaking into current Champion Reg M-A replay logs. The current Reg M-A lane now rejects or strips unapproved mechanic fields, tied moves, and unsupported mechanic abilities from active Champion teams. Isolated oracle/parity tests may still exist outside the Champion runtime lane, but the Champion sim must not teach or execute a mechanic until the active Champion ruleset source enables it.

`DATA_SOURCE_REGISTRY.md` is the team challenge page for sources. It records source tiers, golden links, pull/check areas, timestamp requirements, and the June 27 Reg M-A/Reg M-B source warning so future contributors improve source quality instead of hard-coding stale assumptions.

## Layer Responsibilities

| Layer | Owns | Does not own | Current evidence |
| --- | --- | --- | --- |
| Pokemon Showdown upstream | Standard Pokemon data, move metadata, learnsets, target names, base mechanics baseline | Champion-only changes unless Showdown explicitly supports them | Generated Showdown files, source hashes, oracle tests |
| Champion overrides | Confirmed Champion-specific rule differences | Unreviewed guesses or inferred behavior | Override notes, Champion legality docs, focused tests |
| Data Source Registry | Source priority, golden links, timestamp contract, challenge process | Runtime execution | Source-review PRs, Overview link, sync metadata |
| Supabase | Teams, team members, analyses/history, approved source rows, audit/sync tables, future approved runtime data | Live damage calculation, unreviewed mechanic decisions, secret service-role frontend access | DB tests, migrations, adapter contract, approved views |
| Generated assets | Offline GitHub Pages runtime inputs derived from approved data | Hidden hand-edited mechanic behavior | Bundle freshness checks, generated-data tests |
| `engine.js` | Deterministic battle mechanics and damage/effect execution | Long-term source data governance | Damage oracle tests, move registry tests, exported turn logs |
| `ui.js` | User workflows, selector gating, exports, Overview, QA Artifact | Final battle authority | Browser logs, QA Artifact metadata, Overview tests |
| Validators/tests | Contract checks for logs, source data, legality, bundle freshness, mechanics | Proof of every Pokemon edge case unless covered by a named test | `_run_all.sh --skip-db`, `_run_all_db.sh`, focused oracle suites |

## Branch Strategy Memory

`branch_coverage_runs` stores deterministic branch matrix rows keyed by player team, opponent team, player lead pair, opponent lead pair, and forced turn-1 move/target choices. This lets QA see which combinations have already been tested and which combinations still need coverage.

The Tactical Sweep QA button is the accumulation path for this table. In Selected matchup scope it keeps drilling the current opponent. In Preloaded team suite scope it rotates through approved opponents and only prioritizes unseen branch keys unless a prior row has outcome drift. The result is not a blanket 100% claim; it is measurable coverage that improves as more branch chunks are run.

`v2.1.49` adds a strategy analysis layer on top of those rows:

- `branch_move_analysis.avoid_moves` flags low-result moves by matchup and actor.
- `branch_move_analysis.move_replacement_candidates` suggests legal swaps only when a better move has already been observed on the same set in the same lead/matchup context.
- `branch_move_analysis.suggested_lines` ranks better turn-1 lines against specific teams and leads.
- Every row carries confidence. `early_signal` means "test this more"; `strong` requires repeated samples and is the only tier intended for meta/team decisions.

`v2.2.16-coach-sequence-why` adds `coach_brain_summary.tactical_interpretation`. This is the structured coaching contract for speed-control sequence quality: why positive Tailwind/Trick Room/speed-answer windows worked, why negative windows failed, the pre-click player question, the turn-sequence rule, a coach checklist, and the next counters to watch. Future UI and DB memory work should consume this object before writing new free-text coaching logic.

`v2.2.17-stress-lite-qa` adds a browser-safe stress proof path for testers who should not run full Run All locally. This path is now labeled `Device-Safe Stress QA` in the UI. It reuses tactical branch evidence with hard caps, includes targeted proof, exports `qa_run_type: "stress_lite_qa"`, and writes a `stress_lite` block that records the cap and boundary. This is valid stress evidence, but it is not exhaustive Run All proof.

The Stress Lite artifact must also stay readable at a glance. The export now mirrors normalized totals at the top level (`turns_total`, `action_rows_total`, `damage_events_total`, `effect_events_total`, `branch_matrix_runs`) and includes `stress_lite.summary`, a compact block for:

- capped run totals and result counts
- replay / damage / effect evidence volume
- slowest or heaviest capped matchup
- best observed line, avoid move, and next coaching focus

`v2.2.19-hard-beta-guard` adds public-device guardrails for release safety. Mobile/coarse-pointer and low-memory browsers are forced toward `Device-Safe Stress QA`; `Run All` and `Release Matrix QA` are disabled on those risky public devices; large series counts and full branch-coverage depth are capped so phone users do not become accidental load tests.

`v2.2.90-qa-slice-readout` renames the browser QA controls around the evidence slice they validate and renders the `qa_claim_review` immediately after export. The QA controls are now:

- `Current Evidence QA`: compact export of the current retained/generated evidence.
- `Release Matrix QA`: broad matchup-matrix release evidence for machines that can safely run it.
- `Device-Safe Stress QA`: capped under-50 MB stress evidence for phones or lower-memory browsers.
- `Tactical Coaching QA`: branch/deployment evidence for tactical coaching, speed-control, lead, move, target, and lineup decisions.

The post-export `QA Claim Review` card is intentionally conservative. It surfaces release blockers, source gaps, damage events, branch rows, forbidden claims, and the next QA move. This is the same principle a strong QA lead would apply: first define what the evidence can prove, then define what it is forbidden to claim. No QA artifact may be used as complete Champion legality, exhaustive mechanics proof, global best-team ranking, or real ladder truth unless the artifact and source-truth gates explicitly support that claim.

`v2.2.131-production-launch-gate` adds a stricter production layer after `qa_100_readiness`. The new `production_readiness_gate` is exported at the top level, mirrored inside `qa_dashboard`, and rendered in the inline QA Claim Review card. It separates "safe for internal QA" from "safe for public production": public launch remains blocked while official legality, replay parity, scenario breadth, singles/doubles coverage, source-gap boundaries, or other QA 100 gates are blocked/partial. This keeps a green scoped artifact from becoming an overclaim.

`v2.2.30-replay-detail-rows` closes the current replay-transparency slice. The replay display now prefers resolved action rows over duplicated move pre-call lines, carries structured move-failure evidence, and groups spread/doubles target damage so one move can show every affected target, miss, failure, and KO reason from the same exported evidence. TheYfactora12 PR #160 and Alfredo sync PR #256 both passed required checks before merge; Alfredo also passed the 5,070-battle Battle Audit.

`v2.2.43-move-effect-logic-matrix` adds a QA coverage matrix for the next simulator-accuracy gate. Every QA coverage summary now reports move/effect families as `proven`, `partial`, or `missing` for damage math, non-standard stat-source moves, HP-changing effects, status/action denial, move-failure prevention, priority prevention, field-duration speed control, contact/item damage, and faint transparency. This is deliberately conservative: a missing family is a next QA target, not an automatic engine bug, and coaching should not make strong claims from a partial/missing family without a caveat.

`v2.2.70-team-lab-db-preview` connects saved `branch_coverage_runs` evidence to the Home Team Lab table as an experimental preview. This makes DB-backed branch learning visible, but rows remain labeled as preview evidence and are not official global rankings.

`v2.2.71-team-lab-mapping-promotion` adds the DB trust layer required before preview evidence can become official Team Lab leaderboard evidence. Local/source keys must resolve through `team_lab_team_key_mappings`, promotion gates live in `team_lab_promotion_rules`, and trusted-worker decisions are recorded in `team_lab_promotion_audits`. Official promotion is blocked unless legality, team identity, sample size, engine/ruleset freshness, benchmark approval, and source-gap checks all pass.

Process challenge for coach-memory work:

- Do not let the app sound smarter than the evidence. Coach memory may summarize repeated patterns, but it must keep confidence, sample size, matchup scope, and ruleset scope visible.
- Do not store raw private replay logs as "shared learning" without an explicit reviewed retention/privacy design. Use compact aggregate coach facts first.
- Do not promote a branch timing signal into a universal recommendation. It is a test target until repeated samples across matching team, lead, opposing lead, and ruleset keep the same direction.
- Do not add new advice text without either a structured source field or a test that proves where the advice came from.
- When Strategy UI consumes saved coach brain memory, it must prefer the latest same-team/signature summary, fall back conservatively, and never override current legality/ruleset gates.

This does not change the simulator. It changes how the Strategy guide consumes saved evidence. The player-facing language should stay close to competitive doubles/VGC vocabulary: team preview, lead pair, opposing lead, game plan, Protect, switching, pivoting, speed control, Trick Room, pressure, positioning, win condition, consistency, cores/modes, and matchup prep.

The Strategy tab now presents branch and sim evidence in player decision order: coach call first, then click plan, move swap, avoid trap, lead mode, matchup health, confidence, and next test. Evidence tables support the call; they should not bury the call.

## Supabase Boundary

Supabase is part of source truth and audit, but it is not the live battle calculator in this release.

Designed DB-backed responsibilities (not a live verification checklist):

- Load approved/gated teams when live DB is available.
- Persist analyses and bounded history rows.
- Store tactical branch coverage rows used by Stress Lite and Tactical Sweep QA.
- Store Team Lab team-key mappings and promotion-rule/audit metadata for trusted leaderboard promotion.
- Store and expose approved source-data paths such as `approved_species_move_legality`.
- Support future promotion of `showdown_entities` plus `champions_overrides` into generated runtime assets.
- Reject or prevent stale/illegal team rows from replacing clean bundled data.

Current DB limitations:

- Verification boundary as of August 30, 2026: the August 29 read audit in `../../STATUS.md` records public source/team reads. August hardening and Team Lab/Trainer Room migrations still need application and readback. Analysis writes, Team Lab persistence, and trusted promotion are not proven by a connected badge or offline contract tests. The August 30 browser review performed no production writes. See [the current review](../reports/competitive_player_review_2026-08-30.md).

- `showdown_entities` rows are not yet the direct battle runtime source.
- Saved analysis history is summary/capped storage, not full forensic turn-log storage.
- Branch evidence can power experimental previews, but official Team Lab rank requires reviewed mapping and promotion gates.
- Live DB freshness is separate from local DB contract tests. Run live checks only with `RUN_LIVE_DB=1` and valid anon credentials.
- GitHub Pages deploy enables `RUN_LIVE_DB=1` when Supabase anon secrets are present. That means bundled teams, generated seed SQL, and live Supabase team IDs must match before publish. If a new approved team is added locally, the matching DB migration must be applied before the site can deploy.

Practical QA rule: for detailed math proof, use downloaded turn-log JSON or QA Artifact exports. Do not rely on saved Supabase history as the complete audit trail until the DB forensic-retention work is explicitly shipped.

## Damage Calculation Evidence

When QA says damage is wrong, the required proof object is a `damage_events` row from an exported turn log.

Important fields:

| Field | Meaning |
| --- | --- |
| `move` | Move that produced the damage row |
| `actor`, `actor_key`, `target`, `target_key` | Display and stable identity for source and target |
| `base_power`, `move_type`, `category` | Resolved move inputs after generated-data and dynamic engine rules |
| `attack_stat`, `defense_stat` | Final attacking and defending stats used by the damage path |
| `attack_stage`, `defense_stage` | Stat-stage evidence when stages affect damage |
| `type_effectiveness` | Type multiplier after target typing and any approved Champion ruleset typing context |
| `stab`, `spread_modifier`, `weather_modifier`, `screen_modifier`, `final_modifier` | Major damage modifiers exposed for audit |
| `calculated_damage` | Formula output before HP cap |
| `damage`, `applied_damage`, `hp_delta` | Actual HP lost by the target |
| `overkill_damage`, `damage_capped_by_hp` | Proof that a KO was capped to remaining HP |
| `effect_tags` | High-level tags such as `recoil`, `drain-heal`, or `hp-cap` |
| `recoil_rule`, `drain_rule` | Structured effect math tied to applied target HP loss |
| `move_context` | Showdown description context when generated data has it |

Current rule: downstream recoil and modeled drain healing must use `applied_damage`, not raw overkill damage. If recoil would deal more HP than the user has left, keep the Showdown formula amount as `calculated_effect_damage` and report actual HP lost as `damage_applied_to_user`.

## Effect Evidence

Some mechanics change HP without being direct target damage. Those rows live in `effect_events`.

Examples:

- Recover, Roost, Life Dew, Heal Pulse, Pollen Puff ally healing
- Giga Drain and Matcha Gotcha drain healing
- Substitute, Clangorous Soul, Shed Tail HP costs
- Wish delayed healing
- Leech Seed drain and heal
- Leftovers healing
- Struggle recoil

Shed Tail has two different HP values: the user pays 1/2 max HP rounded up, while the transferred substitute has 1/4 max HP rounded down. Exported `effect_events` should show both `rule` and `substitute_rule`.

Important fields:

| Field | Meaning |
| --- | --- |
| `actor` / `actor_key` | Pokemon whose HP changed |
| `source` / `source_key` | Opposing or allied source when relevant |
| `move` | Move or item/effect name |
| `effect_kind` | Recovery, HP cost, drain heal, residual drain, item recovery, recoil, etc. |
| `hp_before`, `hp_after`, `hp_delta`, `max_hp` | Exact HP movement |
| `rule` | Ratio/basis/rounding when the effect uses structured math |
| `calculated_effect_damage` | Formula amount before the affected Pokemon's HP cap, when relevant |
| `damage_applied_to_user` | Actual user HP lost after the HP cap, when relevant |
| `move_context` | Showdown text context when available |

QA should compare `hp_delta` to `hp_after - hp_before`, then compare the `rule` basis to the source-truth wording.

## QA Coverage Summary

`v2.1.43` adds `qa_coverage_summary` to:

- downloaded turn-log JSON
- each retained QA replay card
- the top-level QA Artifact export

The summary is a coverage index, not a replacement for the raw turn log. It counts what the exported evidence actually triggered:

- total turns, action rows, `damage_events`, and `effect_events`
- super-effective, resisted, immune, crit, spread, HP-cap, screen, weather-modified, typed-item, Knock Off, stat-stage, base-power-modified, priority, Tailwind, Trick Room, recoil, drain, recovery, HP-cost, delayed-recovery, residual-drain, and item-recovery evidence
- damage/effect moves seen
- `move_effect_logic_matrix`, which groups mechanic proof into proven, partial, and missing move/effect families
- source truth versions from the generated Pokemon Showdown audit data
- `missing_targeted_proof`, which names mechanics not proven by that export

Important limitation: a clean log can only prove the mechanics that occurred. For example, a log with no Leech Seed row cannot prove Leech Seed, even if the validator passes.

## Team and Legality Evidence

Turn-log exports include team metadata so QA can audit legality without guessing from the four active Pokemon.

Look for:

- `player_team`
- `opponent_team`
- `team_preview`
- `build_id`
- `source_url`
- Champion SP spreads rather than imported EV-style spreads
- approved Champion format rows in normal selectors
- illegal imports/editor saves rejected before DB upsert

Known current catalog rule:

- Normal runtime selectors should stay on approved Champion-legal test teams.
- Legacy, inferred, non-Champion-shaped, or move-conflict rows should be removed from selectors until reviewed.
- Custom teams must pass Champion legality gates before they can be trusted for QA.

## Speed, Order, and Stat Evidence

Turn snapshots and actions expose the fields QA needs for priority/order disputes:

- `speed_order_details`
- `stat_boosts`
- `stat_boosts_stable`
- `actor_key`, `target_key`, `target_side`
- item, ability, status, Tailwind, Trick Room, weather, speed stage, calculated Speed, effective Speed
- exact speed-tie markers when applicable

If a same-species mirror board appears, QA must use stable keys and side fields, not display names alone.

## Required QA Proof Workflow

For every public-site validation pass:

1. Open the newest cache-busted GitHub Pages URL.
2. Confirm the visible build label and exported `build_id`.
3. Run one single-team simulation and download the turn-log JSON.
4. Run Run All and download representative turn-log JSON.
5. Export one QA Artifact.
6. Validate logs with `node tools/validate-turn-logs.mjs <files>`.
7. Confirm no `player team not loaded` or live-target `(no valid target)` failures.
8. Inspect `qa_coverage_summary`, `player_team`, `opponent_team`, `damage_events`, `effect_events`, `speed_order_details`, and `stat_boosts`.
9. Record whether the sample includes the mechanic being claimed fixed. A green log that never used recoil does not prove recoil.

## Local Gates

Current high-signal commands:

```bash
node tests/showdown_damage_oracle_tests.js
node tests/move_verification_registry_tests.js
node tests/turn_log_export_validator_tests.js
node tests/qa_baseline_snapshot_tests.js
bash tests/_run_all.sh --skip-db
bash tests/_run_all_db.sh
bash tools/check-bundle.sh
```

Live DB checks require:

```bash
RUN_LIVE_DB=1 bash tests/_run_all_db.sh --live
```

Only use the live mode when valid anon credentials are present and it is acceptable to test against remote Supabase.

Approved team/data upgrade checklist:

- Update the source-backed runtime data or team catalog.
- Regenerate seed SQL and any generated runtime artifacts that derive from it.
- Regenerate Overview-linked QA reports such as `reports/champion_qa_baseline_snapshot.md` when approved teams, moves, items, rulesets, or proof targets change.
- Apply or trigger the matching live Supabase migration when the deployed site reads the table.
- Run local legality/seed/bundle validators.
- Run the live DB parity path before Pages publish when Supabase anon credentials are present.
- Bump the visible build label/cache when the browser-facing app or Overview changes.
- Capture a fresh QA Artifact so Codex and team review can confirm the deployed build, source URL, ruleset, coverage gaps, and next missing proof.

Coach-memory upgrade checklist:

- Add or reuse a structured field first, such as `coach_brain_summary.tactical_interpretation` or `codex_context.coach_focus`.
- Keep raw logs out of compact memory unless a reviewed forensic-retention design explicitly requires them.
- Persist only bounded summaries keyed by team, team signature, format, ruleset, and build.
- Render the memory in Strategy only with confidence/sample/evidence boundaries visible.
- Prove the export contract, Strategy render path, bundle freshness, and local suites before release.

Recent learned failure modes:

- `Deploy-order drift`: the app bundle can be correct while live Supabase is missing the newly approved team. Guard: Pages now runs live seed parity before publish when Supabase anon secrets exist.
- `Generated-report drift`: the app and seed SQL can be correct while the Overview-linked QA baseline snapshot is stale. Guard: `qa_baseline_snapshot_tests.js` fails until the generated report includes the current approved catalog and move baseline.

## How To Classify A New QA Finding

| Finding type | Meaning | First place to inspect |
| --- | --- | --- |
| Source-data drift | Upstream data changed or generated assets are stale | Showdown sync docs, generated data, source hashes |
| DB-source drift | Supabase row differs from bundled approved data | DB views, team gates, `approved_species_move_legality` |
| Deploy-order drift | Local/generated assets are correct, but live DB migration or remote parity was missed before publish | Pages workflow, `RUN_LIVE_DB=1` seed test, DB migration workflow |
| Generated-report drift | Runtime and DB are current, but Overview-linked reports or QA snapshots still describe the prior catalog | `reports/`, report generator, `qa_baseline_snapshot_tests.js` |
| Engine bug | Deterministic mechanics disagree with source truth | `engine.js`, oracle tests, move registry tests |
| Export bug | Sim result may be right, but logs are missing/wrong evidence | `ui.js`, turn-log serializer, validator |
| Validator false positive | Export is right, validator assumes wrong identity/timing | `tools/validate-turn-logs.mjs` |
| Champion override needed | Standard Showdown behavior differs from confirmed Champions rule | Champions override docs/tests |

## Current Non-100% Gaps

Do not claim broad 100% accuracy until these are closed or explicitly accepted:

- Fresh deployed-browser `v2.2.31` single-run, safe Run All or Stress Lite, Tactical Sweep, and QA Artifact proof for the current closeout candidate.
- The deployed QA Artifact must report the expected `build_id`, `source_url`, detailed replay row fields, and no unreviewed missing targeted proof before `v2.2.31` becomes the current live proof baseline.
- Live DB runtime-source promotion or explicit static fallback signoff.
- Full DB forensic-log retention design if Supabase must be the long-term audit store.
- Remaining grouped battle-system mechanics beyond shipped move coverage: redirection, Protect family, switching/replacement, status, item edge cases, terrain/weather edge cases, and Champion-specific overrides.
- Source-drift visibility that marks the Overview as update-needed when upstream data changes.
- Long stress automation with preserved failing seeds.
- Coach-memory and Strategy-page recommendations must keep confidence, sample size, source age, and evidence boundaries visible so coaching output cannot outrank mechanics proof.

## 2026-07-04 update: adaptive Bo evidence and browser run budget

- v2.2.125 added adaptive Bo-series evidence: registered six stays locked, while the selected 3/4 can adapt between games in Bo3/Bo5.
- v2.2.126 adds a browser run budget so normal Simulator clicks stay responsive. Selected-matchup stress supports up to 5,000 series, while oversized BO5 work is treated as QA/DB/job-runner evidence rather than a synchronous page task.
- Run evidence must keep series count separate from actual game count. A 5,000-series BO5 run can still mean up to 25,000 games.
- Stored/readout evidence should include regulation_id, ruleset_version, engine_version, format, bo, requested_series, executed_series, estimated_game_budget, adaptive_bring_enabled, and retained_replay_sample_count.
- UI claims must distinguish complete aggregate counts from retained replay examples.

## 2026-07-04 learning brain boundary

The future learning brain must stay evidence-bound:

- Sim data teaches simulator-derived matchup patterns.
- Showdown/replay uploads teach real-player decision patterns and common lines.
- Source-truth files define legality and mechanics; learned data cannot override them.
- Coaching output must cite whether a recommendation came from verified mechanics, replay evidence, simulator aggregate data, or meta inference.
- Personal Trainer Room learning and global aggregate learning must remain separate until account privacy, consent, RLS, export/delete, and aggregation rules are implemented.

## 2026-07-04 detailed learning-brain roadmap

See `poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md` for the full architecture plan covering evidence intake, normalized battle rows, feature extraction, aggregate confidence, privacy boundaries, anti-poisoning controls, Trainer Room learning, and future coaching retrieval.

## 2026-07-04 update: exported Trick Room proof

v2.2.127 adds a named targeted QA fixture for Trick Room active-state coverage in browser-exported QA artifacts. This closes the mismatch where standalone targeted proof tests could cover Trick Room, but the exported Tactical Coaching QA artifact still reported `Trick Room active state` as missing.

Required follow-up artifact check: exported `.127` Tactical Coaching QA should show `mechanics_seen.trick_room_active > 0` and should not list `Trick Room active state` under `missing_targeted_proof`.

## 2026-07-04 update: turn-log export scope and turn count

v2.2.128 fixes the downloaded single replay turn-log payload contract after QA logs showed valid `turnLog` rows but top-level `turns: null`. Downloaded `champions-turn-log-v2` files now include `turns`, `qa_scope`, `qa_scope_note`, and `qa_coverage_summary.coverage_scope_note`.

Important interpretation rule: a single replay can prove only the mechanics that occurred in that replay. `single_replay_missing_mechanics` and `qa_coverage_summary.missing_targeted_proof` in a single turn-log export are QA targets for missing coverage, not a release-wide failure by themselves. Use Release Matrix QA or Targeted Mechanic QA artifacts when claiming broad mechanic proof.

## 2026-07-04 update: completed turn-count source

v2.2.129 fixes the sim-page turn-count source after fresh `.128` logs showed `turns` one higher than `turnLog.length`. `simulateBattle().turns`, downloaded turn-log JSON, and retained replay-card evidence now use completed `turnLog` rows. The older/internal loop counter is preserved as `simTurnsReported` in engine results and `sim_turns_reported` in exports for debugging, but QA-facing `turns` must match the structured evidence rows.

## 2026-07-04 update: single replay proof boundary

v2.2.130 separates single-replay coverage from release-wide targeted proof. Downloaded `champions-turn-log-v2` files now keep `qa_coverage_summary.missing_targeted_proof` empty for `single-turn-log` scope, because one replay is not expected to hit every mechanic. Mechanics absent from that one battle remain available under `single_replay_missing_mechanics` with `missing_targeted_proof_note` explaining the boundary.
