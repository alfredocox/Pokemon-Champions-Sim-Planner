# Historical Roadmap Snapshot - 2026-08-30
> Superseded planning history. Do not execute old sprint gates, use bare issue numbers, or treat old completion percentages as current proof. Current direction: [ROADMAP.md](../../ROADMAP.md). Current evidence: [STATUS.md](../../STATUS.md). Relative links in the original text below are retained as written from the repository root.

# Pokémon Champion 2026 — Product Roadmap

> **Battle-tested. Always evolving.**
> Live App: [htmlpreview bundle](https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html) | [GitHub Pages](https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/)
> **Last updated:** 2026-08-30 | **Baseline:** public Supabase reads were proven on August 29; production migration/readback, Team Lab deployment, and digest-bound Showdown approval remain release gates
> **Current-state authority:** read [`STATUS.md`](STATUS.md) first. Sections dated before 2026-08-29 are planning history; their bare issue numbers, branch names, counts, and completion claims are not actionable without GitHub verification.

---

## Current Direction Override - 2026-06-06

Simulation truth is the active product gate. New coaching, premium, Battle IQ, Coach Recommends, and replay-derived claim work remains gated until the simulator evidence is accurate enough to safely support those claims.

Active order:

Current team and competitive-validation scope: **doubles only**. Singles product work is deferred. Existing singles mechanics fixtures remain regression tools, not doubles-readiness evidence.

1. Align both repos through PR + CI.
2. Prove battle mechanics and turn logs against strict tests.
3. Wire Showdown-mirrored data plus Champions overrides as the source-of-truth path.
4. Add release gates for unresolved high-severity drift.
5. Build only evidence-backed coaching layers that cannot override simulator truth.
6. Resume real LLM or global-learning expansion only after the no-API evidence pipeline is proven.

Current case-level mechanics proof:

- Regulation monitoring slice: [daily observation and exact-digest quarantine](docs/release/REGULATION_WATCH_2026-08-30.md) implemented locally. Next resolve unavailable official articles, validate hosted alerts, provision/read back private staging permissions, then implement reviewed atomic package approval/publication. Legacy refetch-on-approval is blocked; M-A/M-B remain unapproved. This is not deployed monitoring or complete rules extraction.

- Separate user-requested coverage slice: [curated homepage news](docs/release/HOMEPAGE_NEWS_REFRESH_2026-08-30.md) is implemented locally in `v2.2.135-curated-news`. Five sources, real publication dates, player channels, Worlds broadcast links, source-health safeguards and review-PR refresh every six hours. Next validate hosted workflow and deployment; full Worlds archive/data-only autonomous publishing remain open. This does not close any mechanics or regulation gate.

- Cleanup supports, rather than replaces, simulation truth work: [August 30 efficiency audit](docs/release/PROJECT_CLEANUP_AUDIT_2026-08-30.md). Local workflow duplication and missing Pages asset staging are fixed. Next reconcile DB bootstrap ownership, then fix paginated roster reads and complete-snapshot promotion/retention. No live data deletion or wholesale engine rewrite is authorized by this cleanup.

- Shared regulation milestone implemented locally in `v2.2.134-regulation-preflight`: [selection validation](poke-sim/reports/regulation_selection_validation_2026-08-30.md) and [database eligibility contract](poke-sim/docs/REGULATION_CONTEXT_AND_ELIGIBILITY.md). M-A/M-B remain not verified; only explicit custom practice runs. Historical M-A evidence is quarantined pending data approval. Engine 1.1.2 fixes registered Mega bring selection. Approving versioned eligibility packages and resolving mechanics parity are next; no live DB change or deployment is implied.

- New reference-engine milestone: [Showdown prototype and open differences](poke-sim/reports/showdown_reference_validation_2026-08-30.md). Pinned development-only engine integration is implemented; 16 checker contracts pass, but three of five bounded probes disagree (same-turn Tailwind, Seismic Toss, Growl/Leer stages). Resolve these and team normalization, then extend switching/identity and full-game evidence before policy benchmarks. Dependency advisory/install-policy review remains a gate. No runtime replacement, M-B promotion or deployment occurred.

- Required per-run QA: [download, ingest and compare visible replays](poke-sim/docs/VISUAL_REPLAY_AUDIT_WORKFLOW.md). The [20-game paired audit](poke-sim/reports/visual_replay_audit_2026-08-30.md) found missing/reordered resolved-action summaries and missing Tailwind duration chips (CPA-13/14). Correct these display evidence gaps before using replay order to support coaching claims; they are not engine-parity failures or completed fixes.

- Latest player-facing audit: [competitive player review and fix checklist](poke-sim/reports/competitive_player_review_2026-08-30.md). Unknown-ruleset handling and default participant consistency are fixed locally. Execution/storage/export provenance is fixed locally; full comparison acceptance remains partial because independent Strategy caches still mix context. Next isolate those caches, then repair misleading coaching. See [identity validation](poke-sim/reports/identity_validation_2026-08-30.md). The deployed Roadmap tab still needs a separate source/update/build/deployment pass.

- 44 explicit edge cases are tracked in `poke-sim/battle_edge_case_matrix.json` (2026-08-30.4).
- 17 are covered, 17 are partial, and 10 are open. These counts describe named cases, not a percentage of game accuracy.
- Regenerator switch-out healing, strict accuracy boundaries, and independent spread-target accuracy are now deterministic regressions.
- Replacement Intimidate bias and executed Scrappy/Mind's Eye immunity bypass are fixed locally with failing-before/passing-after regressions. Broader ordering parity remains partial.
- Hospitality side parity, named Thousand Arrows boundaries and multi-hit priority protection are fixed locally with synthetic regression tests. The accuracy runner retains logs, seeds and source hashes; doubles and singles results remain separate.
- Next mechanics lane: ambiguous mirror-name log evidence, entry/residual ordering, and broader imported multi-hit/grounding behavior. PP/Pressure and Regulation M-B remain larger open milestones. Default bring-four is now regression-covered; see [current validation evidence](poke-sim/reports/identity_validation_2026-08-30.md).
- Worlds 2026 Masters: 13 top-cut RK9 sheets / 78 members are captured in a review-only Overview catalog. Missing stat points and unapproved ruleset mapping block exact-build simulation. See [the capture and validation report](poke-sim/reports/worlds_top_cut_validation_2026-08-30.md).

Current direction doc: [`docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md`](docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md).

Older coaching-first roadmap items remain useful product research, but they are not the active build priority until this gate passes.

---

## Queued Milestone: Beginner Homepage And Navigation Audit

Requested 2026-08-30. **Queued, not started.** Run after the simulation-readiness gate, not instead of mechanics, source or replay validation. The first-time visitor experience must remain compatible with efficient competitive-player workflows.

Entry gate:

- [ ] Define the accuracy benchmark's supported regulation, doubles scope, independent reference evidence, case denominator and exclusions before reporting the user's 99% target. Passing regression counts alone do not establish game accuracy.
- [ ] Resolve critical mechanics, legality, identity and replay-evidence defects even if an aggregate score reaches 99%. Publish remaining unknowns and required human/in-game verification.
- [ ] Pin the reviewed build, approved rules package and deployed artifact before auditing the release candidate.

Two review perspectives: a first-time visitor who knows no Pokemon terminology, and a UI engineer examining navigation, accessibility, consistency and error recovery. An agent's novice-perspective walkthrough is a hypothesis generator, not evidence from real beginner participants.

Audit checklist:

- [ ] Start with a fresh session on the homepage. Test whether the visitor can identify the site's purpose and a clear first action without outside instructions.
- [ ] Complete the journey: find a starter team, understand/select a format, run a permitted simulation, understand its result, inspect a replay, then change teams and try again. Explain unfamiliar terminology where needed without overwhelming experienced users.
- [ ] Check navigation between every linked view: current location, back/home behavior, deep links, reloads, saved selections and returning after an interruption. Identify duplicate routes, dead ends, misleading labels and unnecessary decisions.
- [ ] Stress desktop/mobile layouts, touch targets, keyboard-only navigation, focus order, screen-reader names, contrast, zoom and reduced motion. Inspect text wrapping and overlap at narrow widths.
- [ ] Exercise loading, empty results, invalid imports, unknown regulations, unavailable DB/network, stale data, rapid repeated clicks and switching views mid-operation. Errors must explain the problem without losing the user's work or silently changing rules.
- [ ] For every simulation/team-change scenario, retain exported logs and compare them with the visible battle/replay and selected participants. UI polish cannot hide incorrect simulation evidence.
- [ ] Record each finding with build/URL, device/viewport, task, reproduction steps, expected/actual behavior, severity, screenshots/logs and the smallest suitable fix. Separate observed defects from design hypotheses.
- [ ] Implement prioritized fixes, add applicable regression tests and repeat the same tasks locally and on the deployed candidate. Document any remaining friction and rollout limits.
- [ ] Validate with real Pokemon beginners and competitive players. Record task completion, time to first useful result, navigation errors, assistance required and result comprehension. Set success thresholds before the study; do not claim "top 1%" without comparative evidence.

Exit: no unresolved critical journey blockers, verified fixes and accessibility checks, documented beginner-study results and remaining limitations. This milestone does not authorize promotion of unverified regulations or premature coaching claims.

## 2026-08-29 Strategy And Agent Operating Audit

Current strategy audit: [`docs/strategy/PRODUCT_STRATEGY_AND_AGENT_AUDIT_2026-08-29.md`](docs/strategy/PRODUCT_STRATEGY_AND_AGENT_AUDIT_2026-08-29.md).

The product wedge is now explicit: build a replay-verifiable Pokemon Champion battle laboratory before expanding into a universal AI coach, broad social platform, or opaque ranking system.

Strategy kernel:

```text
Diagnosis: tools can produce answers faster than they prove them.
Guiding policy: earn trust before expanding scope.
Coherent action: source -> sim -> evidence -> explanation -> feedback -> regression -> release.
```

Primary metric: evidence-backed claim survival rate under the current engine, ruleset, regulation, and deployed build. Raw battle count, feature count, issue count, or advice count are evidence volume, not proof of product success.

Agent operating rules were consolidated in `AGENTS.md`. It now defines source priority, truth boundaries, task priority, change classes, Supabase and Brain guardrails, proof states, definition of done, documentation authority, and the required handoff contract.

Active execution order:

1. Ship and verify the current trusted replay/team-mapping work.
2. Prove live Supabase schema, RLS, private mapping, and trusted-writer boundaries.
3. Complete one no-API learning vertical slice from trusted replay to feedback/improvement pack.
4. Close the named mechanics families that can invalidate that slice.

Full source/data inventory added: [`poke-sim/docs/CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md`](poke-sim/docs/CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md). The first collector run hashed 9 reachable official endpoints out of 11; two optional Support pages block automation with HTTP 403, and seven in-game capture sets remain required before species/forms/stats/moves/Abilities/items/learnsets can be called fully inventoried for Champions.

---

## 2026-08-29 Active Audit: Project And DB Alignment

Current audit doc: [`docs/release/PROJECT_AND_DB_AUDIT_2026-08-29.md`](docs/release/PROJECT_AND_DB_AUDIT_2026-08-29.md).

The local repo has the correct DB direction for the plan: Showdown-mirrored rows are the baseline source of truth, Champion override rows carry reviewed differences, generated JS keeps GitHub Pages offline-safe, and Supabase stores durable source/evidence records. The current branch also adds trusted replay-import mapping helpers so imported QA/replay artifacts can resolve source team keys to durable Team Lab team IDs before any evidence is considered for promotion.

What is proven today:

- Local DB mock contract sweep is green.
- Local source-truth suite is green.
- Local fast-equivalent PowerShell sweep is green.
- The local branch contains the Team Lab mapping and trusted replay-import helper path.

What is not proven today:

- Live administrative grants and policy catalogs could not be queried because no Supabase admin/MCP SQL tool was callable.
- GitHub Pages is reachable but does not yet contain the newest DB mapping helpers from this branch.
- The branch is 9 commits ahead and 3 commits behind `origin/main`; sync/rebuild/push is the next release task.
- Y and Alfredo repos are not 1:1 yet and should be aligned through reviewed PRs/CI, not forced copying.

Plain-English rule:

```text
Showdown mirror proves baseline data.
Champions overrides prove intentional Champion differences.
Supabase stores reviewed source/evidence history.
The simulator decides truth.
The Brain explains truth.
```

Next safest task: merge/rebase the 3 `origin/main` news-feed commits into this branch, rebuild `poke-sim/pokemon-champion-2026.html`, rerun the DB/source-truth/Overview/release tests, push, then verify the GitHub Pages bundle contains the new trusted import and team-mapping helpers before running live Supabase smoke tests.

### Supabase audit update

Full audit: [`docs/release/SUPABASE_FULL_AUDIT_2026-08-29.md`](docs/release/SUPABASE_FULL_AUDIT_2026-08-29.md).

Public connection and read quality are now proven: 8,653 approved Showdown rows, zero duplicate entity keys, zero invalid hashes, 36 team rows, and 204 members covering 34 complete teams. Team Lab tables are not present in the public schema cache, active Champions overrides are empty, and the live shared-write policy still needs the new hardening migration applied.

Local fixes completed in this audit include promotion-aware Showdown baselines, step-scoped service credentials, fail-closed Pages config, transactional main-only production migrations, shared evidence read-only policy, Team Lab mixed-privacy fixes, adapter/live-column alignment, deterministic DB export ordering, and regression tests.

Next database gate: review and apply `2026_08_29_public_data_integrity_hardening.sql`, apply/read back the missing Team Lab and Trainer Room migrations in order, then run live allow/deny policy tests. Showdown approval remains open until promotion is bound to an exact staged `sync_run_id` and artifact digest.

---

## Historical Plan: 2026-07-05 No-API Brain Composer

The next Brain path is intentionally not a live LLM. The first build is a local, deterministic, evidence-backed coach:

```text
Simulator facts
  -> EvidenceBundle
  -> Local Brain Composer
  -> Brain Validator
  -> UI Cards
  -> Feedback
  -> Improvement Pack
  -> Codex Regression Loop
```

Plain-English rule:

```text
The sim creates facts.
The Brain explains the facts.
```

The Brain may explain team identity, leads, threats, replay turning points, confidence, uncertainty, and recommended tests. It may not invent legality, damage, speed order, priority, RNG, abilities, items, status, weather, terrain, or battle results.

### Build Order

| Step | Status | Scope | Must not do |
|---|---|---|---|
| 0 | Done on `analysis/llm-brain-audit` | Docs, audit, beginner-friendly context, and roadmap alignment | Runtime changes |
| 1 | Implemented on `analysis/no-api-brain-foundation` | `poke-sim/analysis/schemas.js`, `evidence_bundle.js`, `confidence.js`, `provenance.js`, tests | UI, DB writes, LLM calls |
| 2 | Initial contracts implemented | Deterministic tools for legality, speed, damage pressure, threats, leads, replay summary, and critical turns | Final coaching prose |
| 3 | Implemented locally | `brain_schema.js`, `brain_rules.js`, `brain_templates.js`, `brain_composer.js`, `brain_validator.js` | API calls or model calls |
| 4 | Implemented locally | Local feedback, Brain output storage helpers, improvement-pack storage helpers, and `improvement_pack.js` export | Silent self-training |
| 5 | Initial tests added | Regression tests and fixture seeds for fake evidence IDs, missing evidence, bad confidence, illegal suggestions, replay overstatement, wrong lead, and missed turning point | Untested Brain fixes |
| 6 | Later | Evidence Mode UI cards with feedback buttons and improvement-pack download | Chat-first UI |
| 7 | Later | Optional DB persistence after the local loop is proven | Raw unvalidated AI blobs |
| 8 | Later | Optional real LLM endpoint behind server-side keys and flags | Browser API keys |

Every Brain improvement must become a regression test. No test, no learning.

### Open Issue Snapshot

Checked by GitHub API on 2026-07-05:

- `TheYfactora12/Pokemon-Champions-Sim-Planner`: 68 open issues.
- `alfredocox/Pokemon-Champions-Sim-Planner`: 56 open issues.
- `TheYfactora12/Pokemon-Champions-Sim-Planner`: one open PR, #145, unrelated to the no-API Brain audit branch.
- Candidate implementation branch for this roadmap work: `analysis/no-api-brain-foundation`.

Highest-priority open lanes remain:

- Regulation M-B legality/source package proof.
- Josh/JD data audit and Showdown reference replay review.
- Team Lab evidence import, mapping, promotion, and privacy gates.
- Mechanics truth and replay transparency.
- Deployment/cache/security hardening.
- Review/merge the no-API Brain foundation branch, then wire real simulator/replay evidence into the Brain tools.

Canonical docs:

- [`docs/architecture/llm-brain-context.md`](docs/architecture/llm-brain-context.md)
- [`docs/architecture/llm-brain-integration-audit.md`](docs/architecture/llm-brain-integration-audit.md)
- [`docs/release/PROJECT_AND_DB_AUDIT_2026-08-29.md`](docs/release/PROJECT_AND_DB_AUDIT_2026-08-29.md)
- [`docs/release/PROJECT_OPEN_ITEMS_AUDIT_2026-07-05.md`](docs/release/PROJECT_OPEN_ITEMS_AUDIT_2026-07-05.md)
- [`poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md`](poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md)

---

## Milestone Index

| # | Milestone | Status | Gate Issue |
|---|---|---|---|
| M1 | Engine Truth | 🟡 83% (19/23) | #140 test coverage |
| M7 | Architecture Foundation | 🟡 In Progress | #78 namespace next |
| M9 | Observability & QA | 🟡 In Progress | CI ✅ live · #89 logger next |
| M2 | Dynamic Strategy Coach | 🔴 Open | #141 classifier |
| M3 | Piloting Analytics | 🔴 Open | #142, #143 |
| M5 | Tournament Packet | 🔴 Open | #57 parent |
| M4 | Community & Sharing | 🔴 Open | M3 gate |
| M6 | Polish & Launch | 🔴 Open | M1–M5 gate |
| M8 | Profile & Sync | 🟡 Unblocked | Supabase ✅ live |
| M10 | Performance & Quality | 🟡 Partial | #92, #93, #94 |
| M11 | Advanced Features | ⏳ Deferred | M8 gate |

---

## ⛔ P0 — Blockers (Resolve Immediately)

| # | Issue | Owner | Required Action |
|---|---|---|---|
| **#147** | Ko-fi account missing | @alfredocox | Create `ko-fi.com/alfredocox` before merging PR #146 |

> Historical issue snapshot only. The 2026-08-29 audit found `main` unprotected, 36 live team rows, 204 members, and 34 complete teams. Use `STATUS.md` and fully qualified issue URLs.

---

## Sprint 1 — Foundation

> **Gate:** All items here must ship before any Sprint 2 code merges.

| # | Issue | Owner | Milestone | Status |
|---|---|---|---|---|
| #87 | GitHub Actions CI (ROOT NODE) | @alfredocox | M9 | ✅ **CLOSED** |
| #78 | Namespace `window.ChampionsSim` | @alfredocox | M7 | 🔴 Open |
| #138 | `data.js` placeholder guard (T9j.18 §A) | @Jdoutt38 | M1 | 🔴 Open |
| #149 | Unit tests for `classifyPokemon()` | @Jdoutt38 | M1 | 🔴 Open |
| #150 | Stat panel HTML markup | @Josh | M3 | 🔴 Open |
| #151 | `CONTRIBUTING.md` | @Josh | M7 | 🔴 Open |

---

## Sprint 2 — Classifier + Role Engine

> **Gate:** Sprint 1 complete.

| # | Issue | Owner | Milestone | Priority |
|---|---|---|---|---|
| #141 | **`classifyPokemon()` 7-role classifier** | @TheYfactora12 | M2 | P1 — critical path |
| #142 | Stat panel (EVs/IVs/Nature display) | @TheYfactora12 | M3 | P1 |
| #143 | Bug: lead-selector highlight in Auto mode | @TheYfactora12 | M3 | P1 |
| #165 | Phase 4c: Archetype detectors | @TheYfactora12 | M2 | P1 |
| #166 | Phase 4d: Threat-response matrix | @TheYfactora12 | M2 | P2 |
| #167 | Phase 4e: Policy audit layer | @TheYfactora12 | M2 | P2 |
| #140 | T9j.18 status immunity tests | @Jdoutt38 | M1 | P2 |
| #139 | T9j.18 mirror-match hard assertion | @Jdoutt38 | M1 | P2 |
| #80 | TDZ lazy-init crash risk | @alfredocox | M7 | P2 |
| #89 | Structured logger | @alfredocox | M9 | P2 |
| #94 | XSS innerHTML audit | @alfredocox | M10 | P2 |

---

## Sprint 3 — Module Split

> **Gate:** #77 (split `ui.js`), #78, #80, #89 all closed.

| # | Issue | Owner | Milestone |
|---|---|---|---|
| #77 | Split `ui.js` into feature modules | @alfredocox | M7 |
| #84 | Schema versioning for localStorage | @alfredocox | M8 |
| #90 | Performance profiling harness | @alfredocox | M9 |
| #92 | Memoize `buildStrategyReport()` | @alfredocox | M10 |
| #93 | Cap battle-log array size | @alfredocox | M10 |
| #96 | Focus management NVDA/VO audit | @alfredocox | M10 |
| #168 | Phase 5: Turn log (VGC-authentic) | @TheYfactora12 | M2 |
| #53 | Lead pair win-rate table | @TheYfactora12 | M3 |
| #54 | Suboptimal decision flagger | @TheYfactora12 | M3 |
| #55 | Personal weakness dashboard | @TheYfactora12 | M3 |
| #56 | Head-to-head delta tracking | @TheYfactora12 | M3 |
| #72 | Pilot confidence score overlay | @TheYfactora12 | M3 |

---

## Sprint 4 — Profile & Sync

> **Historical gate:** Supabase public reads are live, but production hardening, Team Lab migrations, and policy readback still require setup. See `STATUS.md`.

| # | Issue | Owner | Milestone |
|---|---|---|---|
| #81 | Player profile schema | @alfredocox | M8 |
| #82 | Cloud sync (Supabase) | @alfredocox | M8 |
| #83 | Cross-device import/export | @alfredocox | M8 |
| #85 | Cross-device sync (live) | @alfredocox | M8 |
| #86 | Profile badge system | @alfredocox | M8 |
| #91 | localStorage migration runner | @alfredocox | M8 |
| #169 | Phase 6: Coaching voice + tone layers | @TheYfactora12 | M2 |

---

## Backlog — Tournament Packet (M5)

| # | Issue | Priority |
|---|---|---|
| #57 | Tournament packet PDF generator (parent) | P2 |
| #58 | Per-matchup page template | P2 |
| #59 | Cover page + appendices | P3 |
| #60 | Compact mobile layout | P3 |
| #61 | Packet Preview tab | P3 |

## Backlog — Battle Sensei Player-Learning Expansion

These items define the coaching flow needed to turn sim and replay evidence into player-useful decisions. They remain gated by simulation truth and evidence confidence.

| Item | What it teaches | Required data |
|---|---|---|
| Lineup Matrix Report | Best roster subset for BO1/BO3/BO5 | registered six, format, series format, all legal lineup combos, scored/evaluated lineups |
| Lead Matrix Report | Best opener and what it answers | selected lineup, opponent lead, turn-one board, speed order, field state |
| Move Tree Turning-Point Report | Better move/target/protect/switch on the critical turn | legal options, actual actions, targets, damage/effect events, post-turn position score, alternative branch scores |
| Speed-Control Payoff Interpreter | Whether Tailwind, Trick Room, Icy Wind, and priority created advantage, got neutralized, or reversed the opponent plan | turn-by-turn speed moves, TR/Tailwind state, natural speed order, KOs/damage within T+3, position-score delta |
| Switch and Preservation Report | When to pivot, sacrifice, or preserve the win condition | roster state, HP, field state, speed order, threats, win-condition role |
| Decision Opportunity Ledger | Denominator-based coaching: how many meaningful decisions existed and how many were executed correctly | decision nodes, category, outcome quadrant, positive/negative notes, score contribution |
| Loss Cause Classifier | Why the player lost | result, turning point, issue tags, position-score path, key KOs/field events |
| Practice Drill Generator | What to practice next | repeated mistake pattern, confidence, matchup context, recommended correction |

Required loss-cause labels:

- lineup choice
- lead choice
- move choice
- target choice
- switch timing
- speed control
- resource trade
- variance
- matchup disadvantage

Current alignment note:

- `#223` is the foundation layer: speed-control state interpretation plus deferred payoff checks. It prevents false negatives like penalizing Trick Room when it correctly reverses Tailwind.
- `#224` comes after `#223`: the Decision Opportunity Ledger should score opportunities only after the tactical interpreter can classify speed-control contests correctly.
- Later items remain: move-tree alternatives, target-choice comparison, switch/preservation logic, lineup/lead matrix ranking, and practice drill generation from repeated patterns.

---

## Backlog — Community & Sharing (M4)

| # | Issue | Priority |
|---|---|---|
| #62 | Share team link (hash-based) | P2 |
| #63 | Team export to Pokémon Showdown | P2 |
| #64 | Embed widget (iFrame) | P3 |
| #65 | Social preview card generator | P3 |

---

## Backlog — Polish & Launch (M6)

| # | Issue | Priority |
|---|---|---|
| #66 | VGC format calendar integration | P3 |
| #67 | Accessibility full audit | P3 |
| #68 | Performance budget v2.0 | P3 |
| #69 | Keyboard shortcuts | P3 |
| #70 | Dark mode override toggle | P3 |

### M6 Release Track — Public Site, Security, and Revenue Readiness

This is the concrete release path for turning the simulator into a trustworthy public site. Core battle truth ships through reviewed code and deterministic generated artifacts. Supabase may store the audited Showdown mirror, Champions overrides, users, saved teams, replays, subscriptions, notes, and operational metadata, but the public app should consume only approved views or generated release assets.

Current public-release plan: [`docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md`](docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md).

| Step | What | Why | Owner | Exit Criteria | When |
|---|---|---|---|---|---|
| M6.1 | Stable public site on GitHub Pages or equivalent static host | Give users one canonical URL for the known-good build | Kevin | `main` deploy is live, HTTPS works, bundle loads, mobile smoke passes | Before public sharing |
| M6.2 | Security baseline for site and data flows | Prevent avoidable release mistakes before real users arrive | Kevin + engineering | Secrets not exposed in client bundle, Supabase keys scoped correctly, RLS reviewed, no unsafe admin paths in browser code | Before accounts or payments |
| M6.3 | Release gates and rollback path | Avoid shipping broken simulator logic or stale bundles | Engineering | CI green, bundle freshness green, heartbeat green, rollback steps documented, previous stable build recoverable | Before every release |
| M6.4 | Trust UX for sim confidence | Do not fake confidence on partially modeled mechanics | Engineering + product | UI can distinguish verified / baseline / incomplete move support and legality warnings remain visible | Before paid coaching claims |
| M6.5 | Free public core experience | Grow usage before monetization | Kevin + product | Public users can sim, import teams, review replays, and get basic Battle Sensei output without account friction | First public launch |
| M6.6 | Donations layer | Allow early supporters to fund hosting and iteration without gating core utility | Kevin | Donation link/page live with clear disclaimer that donations do not affect simulator truth | After stable public launch |
| M6.7 | Account + saved history layer | Support retention and premium workflow without moving battle truth into DB | Engineering | Users can save teams, replays, notes, and history in Supabase with RLS | After launch stability |
| M6.8 | Premium subscription layer | Monetize repeat value, not basic correctness | Kevin + product | Premium features are scoped to history, deeper analysis, and workflow convenience rather than core sim access | After free adoption signal |
| M6.9 | Human coaching offer | Turn software usage into higher-value expert service | Kevin / Josh / Alfredo as assigned | Coaching flow is separate from simulator truth and clearly labeled as human review | After replay trust layer is proven |

### M6 Security Checklist

- Keep canonical mechanics behavior in reviewed code, with generated data artifacts produced from approved Showdown mirror rows plus Champions overrides.
- Keep Supabase for audited Showdown mirror data, Champions overrides, users, saved teams, replays, subscriptions, notes, and operational metadata.
- Do not make browser runtime reads from raw battle-truth tables; expose approved views or ship generated release assets.
- Require green CI, bundle freshness, cache bump, and daily heartbeat before release promotion.
- Verify GitHub Pages or host config uses HTTPS and only serves the merged `main` bundle.
- Audit client-visible keys and environment wiring so browser code only gets intentionally public values.
- Review Supabase RLS and roles before enabling accounts, saved history, or subscriptions.
- Keep a rollback path: last known-good bundle SHA, previous release note, and restore steps.

### M6 Roles

- Kevin: product owner, release approval, public messaging, monetization sequencing.
- Engineering repo owner: battle-truth changes, CI gates, bundle/build integrity, release rollback readiness.
- Josh: workbook/data review, trust-layer QA, pre-release spot checks.
- Alfredo mirror repo owner: mirror validation and parity once the source repo release is stable.

---

## Backlog — Advanced Features (M11, Post-M8)

| # | Issue | Priority |
|---|---|---|
| #97 | Replay shortlink | P3 |
| #98 | Multi-team compare | P3 |
| #99 | Live team fingerprinting | P3 |

---

## Milestone Definitions

| Milestone | Definition |
|---|---|
| **M1 Engine Truth** | All battle-sim math is auditable, tested, reproducible. 343+ test cases pass. |
| **M2 Dynamic Strategy Coach** | `classifyPokemon()` + Phase 4c/d/e detectors + Phase 5 turn log + Phase 6 coaching voice — one coherent coaching layer. |
| **M3 Piloting Analytics** | Stat panel, lead pair table, weakness dashboard, decision flagger, confidence overlay all live. |
| **M4 Community & Sharing** | Users can share teams and replays externally. |
| **M5 Tournament Packet** | Full tournament-ready PDF: per-matchup pages, cover, mobile layout. |
| **M6 Polish & Launch** | Public site, security baseline, trust UX, launch gates, donations/accounts/subscription sequencing — public launch quality. |
| **M7 Architecture Foundation** | Namespace, `ui.js` module split, TDZ safety, CI/CD all operational. |
| **M8 Profile & Sync** | Per-user profiles, Supabase cloud sync, cross-device support. Supabase layer already live. |
| **M9 Observability & QA** | Structured logger, CI workflows, performance profiling harness. |
| **M10 Performance & Quality** | Memoization, log caps, XSS audit, NVDA/VO focus management — measurable gains. |
| **M11 Advanced Features** | Replay shortlinks, multi-team compare, live fingerprinting. Post-M8 only. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES2020+), HTML5, CSS3 — static PWA, no framework |
| Offline | Service Worker — current cache `champions-sim-v49-approved-showdown-db` |
| Persistence | localStorage (offline) + Supabase PostgreSQL (cloud, M8) |
| Database | Supabase — app DB live; current repo target is 29 canonical teams plus staged Showdown sync/entity/approved-view migrations |
| Bundle | `pokemon-champion-2026.html` single-file artifact |
| CI/CD | GitHub Actions — CI ✅ + Bundle Freshness ✅ + Cache Bump ✅ (3 workflows active) |
| Hosting | GitHub Pages (`theyfactora12.github.io/Pokemon-Champions-Sim-Planner`) |
| Tests | Vanilla JS runner — current fast suite plus focused Showdown DB/runtime tests; live DB suites are opt-in |

---

## Spec Documents

All spec files live in [`poke-sim/docs/`](./poke-sim/docs/).

| File | Phase | Status |
|---|---|---|
| `PHASE4_DYNAMIC_ADVICE_SPEC.md` | 4 | ✅ Final |
| `PHASE4C_DETECTORS_SPEC.md` | 4c | ✅ Final |
| `PHASE4D_THREAT_RESPONSE_SPEC.md` | 4d | ✅ Final |
| `PHASE4E_POLICY_AUDIT_SPEC.md` | 4e | ✅ Final |
| `PHASE5_TURN_LOG_SPEC_DRAFT.md` | 5 | 📝 Draft |
| `PHASE6_COACHING_VOICE_SPEC.md` | 6 | ✅ Final |
| `PHASE_ROLLOUT_REVIEW.md` | All | 📋 Review |
| `COACHING_NORTH_STAR.md` | All | ⭐ Reference |

---

*© 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.*
*Pokémon IP attribution: see `NOTICE.md`. Canonical tagline: "Battle-tested. Always evolving."*

## 2026-07-04 Roadmap update: simulator run budget and evidence reliability

Completed in v2.2.126:
- Browser run guard added for normal Simulator runs.
- Selected-matchup stress supports a visible 5,000-series option.
- Run All remains protected by estimated total game budget because it multiplies series by loaded opponent count and Bo length.
- Opponent selector moved into the opponent team card for symmetry with Your Team.
- Progress labels now show clear percentages and current/total series.

Open follow-ups:
- Build queued QA/DB worker path for 10,000+ series stress jobs.
- Persist series rows and game rows separately for Team Lab and Trainer Room analytics.
- Promote only complete, versioned, legality-checked evidence into leaderboard confidence.

## 2026-07-04 Future milestone: learning brain foundation

Build after simulator truth and DB evidence framing are stable:
- Normalize sim, QA, and Showdown uploads into versioned evidence rows.
- Build feature extraction for leads, lineup changes, move sequences, switches, Protects, speed control, damage trades, faint causes, and win conditions.
- Separate private Trainer Room learning from global aggregate learning.
- Add confidence/stale rules before recommendations can affect Team Lab rankings or coaching.
- Keep legality and mechanics source-bound; learned patterns can suggest tests and strategies, not invent rules.

## 2026-07-04 Learning brain architecture reference

Detailed plan added: `poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md`.

Roadmap priority:
- Build raw evidence intake and normalized battle-series storage first.
- Then feature extraction and confidence scoring.
- Then Trainer Room private learning.
- Then evidence-bound coaching retrieval.
- Public/global learning comes last after privacy, stale, and anti-poisoning controls exist.

## 2026-07-04 Roadmap update: targeted Trick Room proof

Completed in v2.2.127:
- Added a browser-exported targeted QA scenario for Trick Room active state.
- QA Artifact targeted sweep now requires `trick_room_active` proof before it can clear named targeted proof gaps.
- The fix addresses the `.126` tactical artifact gap where `trick_room_active`, `trick_room_established`, and reversed-speed evidence remained at zero.

Next validation:
- Export a fresh Tactical Coaching QA artifact from `.127` and confirm `ready_for_codex` no longer fails on `Trick Room active state`.

## 2026-07-06 Roadmap update: Team Lab artifact mapping resolver

Completed on branch `audit/project-open-items-2026-07-05`:
- Added `TeamLab.resolveArtifactTeamMappings` so QA/import artifact keys such as `player`, `opponent`, and `artifact:player:*` resolve through reviewed Team Lab key-mapping rows before promotion.
- Added source-gap behavior: verified mappings clear old team-mapping-needed gaps, missing mappings preserve existing gaps and add `TEAM_KEY_MAPPING_MISSING`, and ambiguous verified mappings add `TEAM_KEY_MAPPING_AMBIGUOUS`.
- Added mapped, unmapped, and ambiguous resolver tests in `poke-sim/tests/team_lab_tests.js`.
- Added `SupabaseAdapter.prepareTrustedReplayImport` and `saveTrustedReplayImport` so a trusted import worker can read `team_lab_team_key_mappings`, attach mapping proof refs, and persist private replay-import rows without writing official leaderboard data.

Open follow-ups:
- Deploy/wire the trusted Supabase worker/server action with protected credentials and audit logging; the static browser page must not read private mapping rows as public truth.
- Build #189 promotion-rule execution on top of resolver output and private promotion audits.
