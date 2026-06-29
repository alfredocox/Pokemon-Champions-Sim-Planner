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
