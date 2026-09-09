# Product Strategy And Agent Audit

Date: 2026-08-29
Scope: product strategy, simulator truth, data/Supabase, Brain learning loop, release process, documentation, and agent behavior
Inputs reviewed: current repository, roadmaps and release audits, Brain architecture notes, Team Lab/source-truth plans, CI workflows, `AGENTS.md`, `MASTER_PROMPT.md`, and the supplied innovation/strategy masterclass notes

## Executive Decision

The project should continue, but its winning category is narrower than "Pokemon AI coach" or "perfect universal simulator."

The strongest first product is:

> A replay-verifiable Pokemon Champion battle laboratory that helps a player test a team, understand what happened, and improve through evidence that can be audited.

The interaction loop is the product:

```text
Pick team -> simulate -> inspect evidence -> review replay -> make one change
          -> retest -> label useful/wrong advice -> create regression -> release
```

This applies the masterclass strategy lesson: do not copy a category leader or combine every adjacent feature. Diagnose the real failure, select a narrow wedge, and make every action reinforce one outcome.

For this project, the real failure is not "players need more simulations." It is:

> Existing tools can produce answers without making the limits, provenance, and learning path understandable enough to trust.

## Strategy Kernel

### Diagnosis

The repository has significant simulator, Showdown, replay, DB, Team Lab, QA, and Brain work. Its main risk is no longer lack of ideas. The risk is that parallel ambitions create claims faster than the project can prove and release them.

Observed symptoms:

- `ui.js` is over 1.1 MB and `engine.js` is over 330 KB, increasing ownership and regression risk.
- the roadmap contains strong current gates beside older issue snapshots and historical "Supabase live" language that can be misread as current live proof.
- the current branch is locally ahead of Pages and still needs upstream alignment and deployed verification.
- local DB contracts are green, but this environment has not completed a live Supabase proof.
- the Brain plan is appropriately evidence-first, but UI/product expansion could still outrun simulator/source truth.
- the old master prompt mixes current instructions with historical state, old paths, old team counts, and branch assumptions.
- repo-to-repo parity and deployed-artifact parity are separate problems but have sometimes been discussed as one "1:1" state.

### Guiding Policy

Optimize for trustworthy decisions, not output volume.

1. Simulation truth remains the release gate.
2. Showdown provides the synchronized baseline; reviewed Champion overrides provide scoped deltas.
3. Supabase is the durable evidence/audit ledger, not the mechanics engine.
4. Stable identities and mappings connect Pokemon, teams, replays, and evidence without transferring state between entities.
5. The no-API Brain explains validated evidence and improves only through feedback packs, reviewed code, and regression releases.
6. One thin end-to-end workflow is completed and measured before adjacent platform features expand.

### Coherent Actions

Near-term actions must all reinforce:

```text
correct mechanics
  + current source data
  + durable evidence identity
  + deployed proof
  + understandable feedback
  = a trusted player decision
```

## Strategic Wedge

### Build First

- select or import a team under one named regulation/format
- run deterministic, versioned simulations
- preserve Pokemon/item/state identity across switching and fainting
- import and map replay evidence safely
- show why a turn, lead, or matchup mattered
- collect structured "helpful/wrong/missed/illegal/too vague" feedback
- export an improvement pack that becomes a regression test

### Defer Until The Wedge Is Proven

- universal/global AI coaching
- opaque rankings or "best team" claims
- live self-learning
- broad social/community systems
- monetization claims based on unproven coaching accuracy
- large Trainer Room/account expansion
- replacing Showdown or building a second mechanics authority

## North-Star Metric

Primary metric:

> Evidence-backed claim survival rate: the percentage of user-visible release claims that retain valid provenance and pass their applicable regression/parity gate under the current engine, ruleset, regulation, and deployed build.

Supporting measures:

| Measure | Why it matters | Required denominator |
| --- | --- | --- |
| Mechanics proof coverage | Shows what the simulator can safely claim | named mechanic families in supported scope |
| Stable identity coverage | Detects item/Pokemon/team mixing | switches, faints, leads, imports, and mappings tested |
| Replay explanation precision | Tests whether findings match events | labeled replay findings reviewed |
| Feedback-to-regression conversion | Measures controlled learning | actionable feedback records received |
| Deployment proof rate | Stops local-only success being called shipped | releases intended for Pages |
| Source freshness | Detects Showdown/Champion drift | tracked source snapshots |

Raw simulation count is useful evidence volume, not a success metric by itself.

## Full Audit Scorecard

| Area | Current assessment | Evidence | Highest-value correction |
| --- | --- | --- | --- |
| Product strategy | Yellow | strong roadmap, but many adjacent ambitions | adopt the narrow battle-lab wedge and north-star metric |
| Mechanics truth | Yellow | broad tests and Showdown oracle exist; universal accuracy is not proven | close named mechanics families with parity fixtures |
| Pokemon/team identity | Yellow-green locally | mapping and trusted import helpers/tests exist locally | deploy and prove mappings against trusted DB path |
| Source/data governance | Green locally, yellow live | Showdown mirror/override architecture and sync workflow exist | verify live snapshot, hashes, approval, and runtime parity |
| Supabase architecture | Yellow | migrations, RLS, adapter, mocks, Pages injection exist | run live-gated schema/RLS/mapping smoke and record proof |
| Brain/learning design | Green direction, yellow delivery | deterministic composer/validator/feedback plan is sound | wire one evidence-backed UI vertical slice after truth gate |
| Release/Pages | Yellow-red for current branch | local bundle passes; Pages lacks newest helpers | align upstream, rebuild, push, verify deployed artifact |
| Repo parity | Red | Y and Alfredo histories diverge | define canonical commit/content comparison and PR-based sync |
| Documentation | Yellow-red | high-quality docs coexist with stale historical claims | enforce authority order and archive/supersede stale state |
| Agent instructions | Yellow before this audit | safety rules existed but lacked strategy/prioritization/DoD | use the rewritten `AGENTS.md` operating contract |
| Architecture maintainability | Red-yellow | very large `ui.js` and `engine.js` | extract only along tested ownership boundaries, not a rewrite |
| Security/privacy | Yellow | RLS/trusted-writer rules exist; private evidence risk remains | prove protected writer and public/private view boundaries |

## Agent Audit Findings

### P0 - Claims Need Explicit Proof States

Agents must distinguish:

- implemented locally
- locally tested
- live DB tested
- merged to canonical branch
- deployed to Pages
- verified on deployed artifact
- proven only for named fixtures/scope

These states were previously implicit. The new `AGENTS.md` makes them mandatory.

### P0 - The Old Master Prompt Is Not Safe As Current State

`MASTER_PROMPT.md` is valuable history but contains old paths, old branches, old counts, and old release assumptions. An agent copying it without checking current files can do correct work against the wrong project state.

Correction:

- `AGENTS.md` is the operating policy.
- `ROADMAP.md` is the current priority.
- newest dated audits record proof/blockers.
- tests and generated reports are executable evidence.
- the old master prompt is context unless refreshed against those sources.

### P1 - Agents Need A Shared Prioritization Rule

Without a shared order, a UI, coaching, or growth task can look as urgent as an identity or mechanics failure. The new order is security/data loss, mechanics/identity, source/DB drift, release proof, evidence loop, core UX, coaching, then expansion.

### P1 - "Learning" Must Mean Controlled Release Improvement

The safest learning loop remains:

```text
Evidence -> feedback -> improvement pack -> Codex review
         -> test/fixture -> validated release
```

The app must not silently rewrite rules, promote popularity into mechanics, or accept uploaded text as instructions.

### P1 - Repo And Deployment Alignment Need Separate Definitions

"1:1" can mean file content, commit ancestry, generated artifact, DB schema/data, or deployed site. Agents must name which comparison they performed and at what commit/time.

### P2 - Architecture Work Needs A Vertical-Slice Rule

The codebase has accumulated large central modules. A broad rewrite would add risk. Extraction should happen only when a current vertical slice needs a clean owner and parity tests can pin behavior before movement.

Recommended first slice after release/DB proof:

```text
trusted replay import
  -> durable team mapping
  -> normalized evidence bundle
  -> one validated replay finding
  -> feedback label
  -> improvement-pack export
```

## Assumption Register

| Assumption | Current evidence | Test | Decision if false |
| --- | --- | --- | --- |
| Players value explanations more than raw battle volume | product direction and repeated review requests | observe whether users open evidence/replay details and submit feedback | simplify sim volume UI and strengthen explanation workflow |
| Showdown is a sufficient baseline for supported standard mechanics | generated mirrors and oracle tests | scheduled hash drift plus parity fixtures | mark affected families stale and add reviewed override/oracle work |
| Champion-specific differences can remain a small reviewed override layer | current architecture | track override count and conflict frequency | redesign package/version ownership before expanding scope |
| Static Pages plus protected Supabase writers can support the first wedge | existing Pages/adapter/workflows | deployed end-to-end trusted-import smoke | introduce a minimal protected service only for proven gaps |
| Structured feedback can improve the Brain without live training | no-API Brain plan | convert a feedback pack into a passing regression release | revise feedback taxonomy/composer before any LLM work |
| Team Lab rankings can be explained without overstating truth | gating design | user QA of confidence/stale/sample labels | keep rankings locked or private |

## Risk Register

| Risk | Severity | Early warning | Guardrail |
| --- | --- | --- | --- |
| convincing but incorrect coaching | critical | claim lacks evidence ID or overstates one replay | validator rejects unsupported claims |
| Pokemon/item identity mixing | critical | state changes owner after switch/faint/import | stable identity and mapping regressions |
| stale Showdown or Champion data | high | source hash/version changes | scheduled sync, staged approval, stale propagation |
| private replay/team leakage | critical | public view exposes details or mapping rows | RLS, protected writer, public/private contract tests |
| local success reported as shipped | high | Pages bundle lacks reviewed helper/build | deployed artifact SHA/marker verification |
| DB poisoning from untrusted imports | high | raw upload reaches promoted/global evidence | quarantine, parser confidence, trusted promotion audit |
| roadmap dilution | high | coaching/growth work starts while truth gate is red | priority gate in `AGENTS.md` |
| documentation contradiction | medium-high | two docs claim different current state | authority order, dated audits, stale cleanup |
| central-module regression | high | unrelated UI/engine behavior changes together | bounded extraction and focused parity tests |

## Recommended 30-Day Execution Order

### Gate 1 - Ship The Current Trusted Mapping Work

1. Incorporate the three missing `origin/main` news-feed commits without discarding the current working tree.
2. Rebuild and run release, Overview, source-truth, DB mock, replay-import, Team Lab, and fast test gates.
3. Push through reviewed PR/CI.
4. Verify the deployed Pages artifact contains the trusted import/mapping helpers and expected build identity.

Exit: local, canonical branch, and deployed artifact states are named and agree for this slice.

### Gate 2 - Prove Live Supabase Boundaries

1. Run live-gated schema/migration/RLS checks with runtime credentials supplied outside source control.
2. Prove private mapping reads/writes cannot leak through public clients.
3. Record snapshot/source hashes and live environment proof without storing credentials.
4. Confirm fail-soft local behavior still works.

Exit: DB status can be called live-verified for the named project/schema and test timestamp.

### Gate 3 - Complete One Learning Vertical Slice

1. Import one trusted replay artifact.
2. Resolve source keys to durable team IDs.
3. Produce a normalized EvidenceBundle.
4. Render one validated replay/turn finding with confidence and uncertainty.
5. Collect one structured feedback label.
6. Export an improvement pack and turn a seeded failure into a regression.

Exit: the full controlled-learning loop works without a real LLM.

### Gate 4 - Close Named Mechanics Families

Prioritize mechanics that can invalidate the vertical slice: turn order/priority, switching/faint identity, item ownership, targeting, terrain/weather, and status/ability interactions seen in real logs.

Exit: each claimed family has named fixtures, oracle/reference scope, and residual unknowns.

## Definition Of Strategic Done

The project is ready to expand beyond the wedge when:

- the core pick/sim/replay/fix loop is deployed and observed end to end
- evidence-backed claim survival is measured release to release
- live DB/private writer boundaries are proven
- source drift can stale dependent conclusions automatically
- feedback reliably produces benchmark/regression improvements
- users understand confidence and uncertainty without developer explanation
- no open P0 mechanics, identity, privacy, or deployment-proof blocker undermines the claim being expanded

Until then, the right move is disciplined depth, not broader feature count.
