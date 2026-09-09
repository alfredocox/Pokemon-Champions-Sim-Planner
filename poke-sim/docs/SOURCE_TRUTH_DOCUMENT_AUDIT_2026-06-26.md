# Source Truth Document Audit - 2026-06-26

Purpose: audit the repo documents against trusted source categories so the project keeps moving toward a credible Pokemon Champions battle simulator, coaching tool, and tactical learning system.

This document is a control layer. It does not replace the detailed specs. It tells readers which docs are current source truth, which docs are historical, which claims need external confirmation, and which direction should guide the next build work.

## Trusted Source Hierarchy

Use this order when documents disagree:

1. Official Pokemon / Play! Pokemon rules and tournament resources for tournament structure, clauses, event policy, team-list policy, and official format rules.
2. Champion-specific Serebii pages, Victory Road Champion regulation pages, and equivalent reviewed Champion pages for Pokemon Champions regulations, availability, item pool, forms, and ruleset deltas.
3. Pokemon Showdown source and validator behavior for executable battle mechanics, move data, species data, item data, ability data, learnsets, and current community simulator parity.
4. `@smogon/calc` for targeted damage formula and damage-range checks.
5. Repo QA artifacts, replay logs, source-truth tests, and generated runtime parity reports for what this app actually proves.
6. Bulbapedia, Serebii general dex pages, Smogon strategy/forum material, and similar references as secondary explainers and cross-checks.
7. Game8, IGN, GamesRadar, games.gg, and similar coverage as Champions-specific secondary/tertiary evidence only when stronger official, Serebii Champion-specific, Victory Road, or executable sources are unavailable.

Rule: a document may cite lower-tier sources, but product behavior should not become hard truth unless the claim is also backed by a stronger source, a repo test, a clear Champions override, or an explicit provisional label.

June 28, 2026 update: Serebii should be preferred over Bulbapedia for Champion-specific data. A local DNS check for `www.serebii.net` failed on June 28, 2026, so this audit update is a source-priority policy change only; it does not approve any new runtime legality rows by itself.

June 29, 2026 update: the user supplied a Champion 2026 research dossier at `/Users/kevinmedeiros/Downloads/deep-research-report-2.md`. Treat it as source-review planning input until each citation placeholder is converted into an exact URL, official page capture, or official in-client capture. The direction is useful and aligned with the repo guardrails: official/client-captured Champion sources bind legality and regulation claims; secondary mirrors can speed indexing but stay provisional; tournament results and Victory Road team pages guide meta/coaching but must not change engine mechanics or legality.

## External Source Anchors Reviewed

These are the source anchors this audit uses:

- Official Play! Pokemon rules and resources: https://www.pokemon.com/us/play-pokemon/about/tournaments-rules-and-resources
- Pokemon Showdown source repository: https://github.com/smogon/pokemon-showdown
- Pokemon Showdown Champions mod scripts: https://github.com/smogon/pokemon-showdown/blob/master/data/mods/champions/scripts.ts
- Pokemon Showdown validator source: https://github.com/smogon/pokemon-showdown/blob/master/sim/team-validator.ts
- Smogon damage calculator: https://github.com/smogon/damage-calc
- Victory Road competitive resources: https://victoryroadvgc.com/resources/
- VGC Guide coaching reference: https://www.vgcguide.com/

Access note: official Pokemon pages are the authority even when the page content is harder to scrape automatically. When the repo cannot quote or inspect the official rule text directly, docs must link the official page and mark any detailed rule claim as pending direct official verification unless another primary source or executable validator proves it.

## Current Direction Verdict

The project direction is correct:

- Use Showdown-mirrored data and simulator parity as the standard mechanics baseline.
- Keep Champions-specific deviations explicit, labeled, and tested.
- Treat coaching as evidence-bound analysis, not guessed advice.
- Lock a manually selected registered team for the simulation scope.
- In BO3/BO5, allow game lineup changes from the same registered six instead of silently swapping to a different team.
- Use QA artifacts and replay logs to prove whether the app saw Tailwind, Trick Room, speed order, damage, healing, switches, KOs, and position-score changes.
- Prioritize `#223` speed-control payoff and neutralization before broad coaching expansion, because tactical coaching depends on knowing whether setup actually changed later turns.

The main risk is documentation drift, not product direction. The repo contains strong current specs, but it also contains older drafts that can be misread as current truth.

## Non-Negotiable Documentation Rules

Every important document should be labeled as one of:

- `Current source truth`
- `Active execution plan`
- `Draft / planned`
- `Historical context`
- `Generated report`
- `Provisional Champions claim`

Every rule/mechanics claim should use one of:

- `Official rule`
- `Showdown executable baseline`
- `Smogon/calc oracle`
- `Champions override`
- `Repo QA proven`
- `Secondary reference`
- `Unknown / needs verification`

Every coaching claim should say what data supports it:

- replay evidence
- sim branch matrix
- turn log event
- position-score delta
- repeated matchup samples
- missing data / low confidence

## Source-Truth Docs That Should Drive Work Now

| Document | Audit status | Why it should guide work |
|---|---|---|
| `poke-sim/docs/SHOWDOWN_ORACLE_SIM_TRUTH_PLAN.md` | Current source truth | Correctly separates Showdown execution, damage oracle, static data, human references, and Champions overrides. |
| `poke-sim/docs/SHOWDOWN_DB_SOURCE_OF_TRUTH_PLAN.md` | Active execution plan | Defines data mirroring direction. Keep aligned with generated runtime and tests. |
| `poke-sim/docs/SHOWDOWN_SYNC_ARCHITECTURE.md` | Active architecture | Useful for DB/runtime boundary work. |
| `poke-sim/docs/SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md` | Current guardrail | Prevents runtime naming drift. |
| `poke-sim/docs/CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md` | Current source truth | Connects source truth, runtime evidence, QA, and exports. |
| `poke-sim/docs/SHOWDOWN_REPLAY_COACH_SPEC.md` | Active coaching spec | Correctly requires observed evidence, confidence boundaries, and decision categories. |
| `poke-sim/docs/BATTLE_SENSEI_EXPLAINED_SIMPLY.md` | Current plain-English source truth | Explains the app mission clearly enough for non-engineering readers. |
| `poke-sim/docs/CHAMPIONS_LEGALITY.md` | Current but source-sensitive | Useful, but Champions format claims must stay cross-checked against Showdown validator and official/current format sources. |
| `docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md` | Current direction gate | Correctly blocks overbuilding coaching before sim truth is proven. |
| `docs/release/SOURCE_OF_TRUTH_GUARDRAILS_2026-06-19.md` | Current guardrail | Should be treated as release/process source truth. |
| `README.md` | Current product entry, needs wording cleanup | Direction is right, but phrases like "April 2026 meta play" can become stale unless labeled. |

## Docs That Are Useful But Must Not Be Treated As Current Truth Alone

| Document family | Audit status | Required handling |
|---|---|---|
| `T9j*_DIFF_DRAFT.md` | Historical / draft | Keep as implementation history. Do not use as current rules truth without a current spec/test link. |
| `.windsurf/plans/*.md` | Historical planning | Useful for context only. Do not let old plan details overrule current release docs. |
| `ENGINE_AUDIT_REPORT.md` | Historical audit | Already warns it is origin context. Keep that warning. |
| `CHAMPIONS_MECHANICS_SPEC.md` | Historical mechanics baseline with valuable notes | Keep, but claims sourced to Game8/IGN/games.gg need re-verification or provisional labels. |
| `CHAMPIONS_SPEC_DELTAS.md` | Historical delta notes | Must point to current tests or override docs before guiding runtime. |
| `SPREAD_DAMAGE_SPEC.md` | Source-sensitive mechanics note | Good target for Showdown/calc verification because spread damage is core to doubles. |
| `STATUS_STACKING_RULES.md` | Mechanics note | Needs Showdown baseline and Champions override labels. |
| `CHAMPIONS_MECHANICS_VERIFICATION.md` | Verification note | Keep aligned with current tests and current generated runtime. |
| `CHAMPIONS_MEGA_AUDIT_REPORT.md` | Source-sensitive report | Mega availability and Mega stats need current source/test provenance. |
| `DEVELOPMENT_RUNBOOK.md` | Process doc, partially stale | Update language that implies fully client-only if optional Supabase/runtime DB behavior is now present. |
| `ROADMAP_DRAFT.md` | Draft | Keep below `ROADMAP.md` and current release docs. |

## Generated Reports And QA Docs

These documents are useful as evidence snapshots, not universal truth:

- `poke-sim/reports/*.md`
- `docs/release/*SNAPSHOT*.md`
- `docs/release/*VALIDATION*.md`
- `docs/release/*INVESTIGATION*.md`
- `docs/release/*CLOSEOUT*.md`

Rule: a generated report proves what that run saw at that date/build. It does not prove future builds unless the same guardrail still runs and passes.

## Source-Risk Findings

### 1. "Pokemon Champions" claims need strict labels

Some docs use Champions-specific secondary sources such as Serebii, Game8, IGN, games.gg, and GamesRadar. That is acceptable for research, but runtime behavior should be labeled provisional unless backed by:

- official Pokemon rule/source text,
- direct official Champion in-client captures for eligible lists, rulesets, move legality, item legality, forms, and active regulation details,
- a verified Champion-specific Serebii or Victory Road source row for the exact Champions legality/availability claim,
- Pokemon Showdown Champions mod/validator behavior,
- a repo override file with tests,
- or a current QA artifact proving app behavior.

### 2. Team lock and lineup swapping direction is correct

For coaching and sim usefulness, the app should keep a manually selected registered six locked for the sim run. In BO3/BO5, the selected game lineup can change from that six. This direction is strategically correct because it matches the actual coaching question: "Which subset and lead should I use from this team into this opponent?"

Current build implication:

- The sim should compare 4-of-6 doubles lineups and 3-of-6 singles lineups where the format requires that selection.
- It should not silently change the registered team to chase a better result.

### 3. Speed control is the correct tactical foundation

Tailwind, Trick Room, Icy Wind, priority, weather speed abilities, paralysis, and speed-order changes are central to competitive doubles. The current `#223` direction is correct because many decisions cannot be judged until the app knows whether speed control:

- converted into damage, KOs, pressure, or preservation,
- was neutralized,
- was reversed,
- expired without value,
- or created deferred payoff.

### 4. Coaching must avoid "best move" claims until alternatives are tested

The docs are aligned with this principle, but the app must enforce it in outputs.

Allowed:

- "The replay shows Tailwind was active and your position improved over the next two turns."
- "This line converted speed control into pressure in this sample."

Not allowed without branch comparison:

- "This was definitely the best move."
- "This team is optimal."
- "You only lost because of luck."

### 5. BO10 should stay removed

BO1, BO3, and BO5 are useful coaching formats. BO10 is not a player-facing competitive set format and adds noise to decision training.

### 6. Old docs can confuse contributors

The biggest contributor risk is someone reading a stale April/May draft and implementing from it instead of the current source-truth stack.

Required fix:

- add status headers to old drafts,
- keep `SPECS_INDEX.md` current,
- link the source-truth audit from Overview,
- and mark draft/historical docs clearly.

## Document Manifest Classification

External dependency docs in `node_modules/` are excluded from repo truth classification.

| Path | Classification |
|---|---|
| `.github/pull_request_template.md` | Process |
| `.windsurf/plans/conflict-resolution-guide-2026-05-30.md` | Historical planning |
| `.windsurf/plans/hybrid-db-architecture-plan.md` | Historical planning |
| `.windsurf/plans/m8-and-live-fix-f4edac.md` | Historical planning |
| `.windsurf/plans/showdown-replay-coach-roadmap.md` | Historical planning |
| `.windsurf/plans/sync-update-analysis-2026-06-06.md` | Historical planning |
| `.windsurf/plans/sync-yfactor-2026-05-30.md` | Historical planning |
| `.windsurf/workflows/dev-standards.md` | Process |
| `BATTLE_DAMAGE_DOCUMENT.md` | Mechanics note, verify against Showdown/calc |
| `CHAMPIONS_MECHANICS_SPEC.md` | Historical mechanics baseline |
| `CHAMPIONS_MECHANICS_VERIFICATION.md` | Verification snapshot |
| `CHAMPIONS_MEGA_AUDIT_REPORT.md` | Source-sensitive report |
| `CHAMPIONS_SPEC_DELTAS.md` | Historical delta notes |
| `CHAMPIONS_VALIDATOR_FRAMEWORK.md` | Current validator philosophy, source-sensitive |
| `CHANGELOG.md` | Release history |
| `COACHING_LAYER_SPEC.md` | Design history, paused behind sim truth |
| `CODE_OF_CONDUCT.md` | Process |
| `CONTRIBUTING.md` | Process |
| `DEVELOPMENT_RUNBOOK.md` | Process, needs stale wording cleanup |
| `ENGINE_AUDIT_REPORT.md` | Historical audit |
| `GITHUB_ISSUES_TO_FILE.md` | Planning |
| `MASTER_PROMPT.md` | Agent handoff |
| `NOTICE.md` | Legal/process |
| `POKE_SIM_DB_INTEGRATION_PLAN_v2.md` | Architecture plan |
| `POKE_SIM_DB_INTEGRATION_TDD_PLAN.md` | Test plan |
| `README.md` | Product entry, current with minor stale-risk wording |
| `ROADMAP.md` | Active roadmap |
| `ROADMAP_DRAFT.md` | Draft |
| `SECURITY.md` | Process |
| `SPREAD_DAMAGE_SPEC.md` | Mechanics note, verify against Showdown/calc |
| `STATUS_STACKING_RULES.md` | Mechanics note, verify against Showdown |
| `T9j2_ENGINE_DIFF_DRAFT.md` | Historical draft |
| `T9j3_ENGINE_DIFF_DRAFT.md` | Historical draft |
| `T9j3b_DIFF_DRAFT.md` | Historical draft |
| `T9j4_DIFF_DRAFT.md` | Historical draft |
| `T9j6_DIFF_DRAFT.md` | Historical draft |
| `T9j7_DIFF_DRAFT.md` | Historical draft |
| `T9j8_DIFF_DRAFT.md` | Historical draft |
| `T9j8_VALIDATION_REPORT.md` | Validation snapshot |
| `docs/CORE_ISSUES.md` | Issue planning |
| `docs/HANDOFF_2026-04-25.md` | Historical handoff |
| `docs/KEVIN_AGENT_PROMPT.md` | Agent handoff |
| `docs/release/*.md` | Release/process snapshots; each date-bound |
| `docs/repo-sync-playbook.md` | Process |
| `poke-sim/COACHING_NORTH_STAR.md` | Product north star |
| `poke-sim/CONTRIBUTING.md` | Process |
| `poke-sim/MASTER_PROMPT.md` | Agent handoff |
| `poke-sim/PHASE*.md` | Phase specs; final where marked, draft where marked |
| `poke-sim/db/README_DB.md` | DB process |
| `poke-sim/docs/*.md` | Canonical spec/doc destination |
| `poke-sim/reports/*.md` | Generated or manual report snapshots |
| `poke-sim/tests/README.md` | Test process |
| `poke-sim/tools/README.md` | Tool process |

## Next Build Priorities From This Audit

1. Finish `#223` structured sim turn-log tactical labels so QA artifacts can directly say Trick Room/Tailwind established, converted, failed to convert, reversed, or neutralized.
2. Add status headers to stale/high-risk docs so old draft claims cannot be mistaken for current source truth.
3. Verify spread damage, status timing, Protect, Fake Out, Trick Room, Tailwind, priority, weather, terrain, Mega data, and item legality against Showdown source/calc plus Champions override tests.
4. Keep Battle Sensei coaching evidence-bound: decision opportunity ledger, lineup matrix, lead matrix, move/target alternatives, switch preservation, loss-cause classifier.
5. Keep Overview and `SPECS_INDEX.md` aligned with the current source-truth docs.

## Close Criteria For "Number 1 Simulation" Direction

The app should not claim top-tier sim credibility until it can prove:

- source data comes from approved Showdown/runtime generation or explicit Champions overrides,
- damage and key mechanics pass oracle tests,
- BO1/BO3/BO5 lineup rules are correct,
- manual team lock cannot silently swap teams,
- replay and sim logs expose the tactical evidence used by coaching,
- coaching claims are confidence-labeled and never exceed their evidence,
- QA artifacts can reproduce the proof after every release.

## 2026-07-04 validation note: simulator policy versus Champion truth

The adaptive Bo lineup layer and browser run budget are simulator product policies, not new Pokemon Champion legality facts.

- Champion legality remains source-bound and unknown rows must stay needs_verification.
- Bo3/Bo5 lineup adaptation reflects competitive set play from a locked registered six; it should be tested against replay evidence where possible.
- Large run counts are evidence volume, not source truth. A 5,000-series or 10,000-series run still needs engine_version, ruleset_version, regulation_id, sample size, and stale handling.
