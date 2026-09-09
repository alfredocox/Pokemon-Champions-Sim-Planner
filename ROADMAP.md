# Pokemon Champions Product Roadmap

<!-- Generated from poke-sim/source/project-roadmap.json. Run npm run roadmap:build in poke-sim. -->

Reviewed: 2026-09-09. Current runtime/deployment evidence: [STATUS.md](STATUS.md).

**Prove the doubles simulator before expanding coaching.**

Doubles competitive readiness. Singles fixtures test shared mechanics only.

Local tests are not live database, deployment or universal game-accuracy proof. No verified 99% accuracy or top-1% usability claim.

## Next Action

First establish protected staging and validate shared-evidence write containment plus private-save ownership. While production actions await exact approval, reproduce and fix Toxic rounding, Spite hit resolution, suppressed-item effects and Wish/Leftovers ordering against pinned Showdown. Then extend copy/restore identity, SV IV roundtrip and complete-set legality coverage. Keep M-C source review separate from rule approval. Release only after review, hosted CI and paired live replay/export checks. See docs/release/RELEASE_REVIEW_2026-09-09.md. The live site remains v142; candidate tests do not imply deployment or 99% accuracy.

## Milestone Index

| Milestone | State | Former lanes |
|---|---|---|
| [Simulation And Replay Truth](#simulation-truth) | Blocked | M1, M9 |
| [Regulations And Source Truth](#regulation-source-truth) | Blocked | M1 |
| [Database And Evidence Integrity](#database-evidence) | Blocked | M8, M9 |
| [Reviewed Release And Repo Alignment](#release-alignment) | Blocked | M6, M7, M10 |
| [News And Tournament Reference Coverage](#homepage-news) | Local only | M6 |
| [Beginner Homepage And Navigation Audit](#beginner-experience) | Queued | M6, M10 |
| [Evidence-Backed No-API Brain](#evidence-brain) | Deferred | M2, M3 |
| [Optional Product Expansion](#future-product) | Deferred | M4, M5, M11 |

Former lanes are archived planning labels, not GitHub milestone numbers or IDs. See the [live queue inventory](docs/release/GITHUB_QUEUE_RECONCILIATION_2026-08-30.md) for actual repository-specific milestones.

No percentage here measures game accuracy. Local completion notes are narrower than milestone completion. Deferred ideas are not commitments to build everything.

## Milestones

<a id="simulation-truth"></a>

### Simulation And Replay Truth

**Blocked** | Owner: Mechanics Engineer and independent mechanics reviewer

Depends on: Independent workstream; readiness still requires the other release gates.

Completed locally / recorded:
- Unknown-ruleset preflight and default bring-four/participant identity fixes have regression coverage.
- Scoped switching, immunity, grounding, multi-hit and Seismic Toss fixes are tested. One complete-game Showdown comparison includes forced replacements, winner, HP, stages and PP; one seven-turn browser run has matching visible/export logs.
- Same-turn Tailwind and Growl/Leer now agree with pinned Showdown in scoped synthetic doubles probes, including side swaps, Trick Room, per-target protection and selected ability/item/Substitute gates. PP, single/double Pressure, depletion and Struggle have deterministic boundary coverage.
- September 8 PP/Substitute audit corrects earlier wrong Spite, Taunt and Noble Roar test expectations. Side-swapped synthetic reference probes cover named bypass, reflection, protection, ability, secondary-effect and knockout boundaries, with Substitute HP preservation checks. The dated audit owns exact test counts and outstanding gates: poke-sim/reports/pp_substitute_validation_2026-09-08.md.
- Replay review rejects absent or structurally empty evidence and preserves stable actor/target identity through mirror-name actions. The declared cross-format harness completes 4,624/4,624 runs without state, validator, warning or repeatability failures. This is scoped invariant proof, not universal accuracy.
- Perish Song candidate tests correct countdown, recipient immunity, concealment and terminal faint-order/winner handling, including Trick Room. Replacement-choice parity and broader residual interactions remain open. Evidence and final gate status: poke-sim/reports/perish_song_validation_2026-09-08.md.
- Page startup no longer manufactures hidden simulation games. Paired browser audits bind selected matchup identity and preserve re-downloaded history across swaps; replay contrast and mobile reserve overflow are corrected. Scoped proof and exclusions: poke-sim/reports/intentional_replay_validation_2026-09-08.md.
- Decision audit no longer promotes move inventories or heuristic score gaps into authoritative alternatives or execution diagnoses. Historical action availability is incomplete; re-enabling requires a versioned evidence contract. See poke-sim/reports/decision_evidence_validation_2026-09-08.md.
- Generic pre/in/post coaching templates no longer invent best plans, default scores, causes or confidence from volume. Unknown or ambiguous turn evidence stays unknown; score output is explicitly heuristic. See poke-sim/reports/coach_template_validation_2026-09-08.md.

Remaining:
- [ ] Extend complete-game and visible-replay parity beyond the bounded fixtures; resolve Strategy-cache context mixing and misleading coaching.
- [ ] Test broader mid-turn Speed and stage interactions, Mirror Armor/Contrary, other fixed-damage moves, entry/residual ordering, Grudge/Disable/berry restoration and imported-team edge cases.
- [ ] Define the accuracy denominator and human verification gaps; obtain official Champions evidence before promoting Showdown baseline behavior as Champion truth.

**Exit:** No unresolved critical mechanics, identity or evidence errors in the declared benchmark; every accuracy claim has reference evidence and explicit exclusions.

Evidence: [showdown_reference_validation_2026-08-30.md](poke-sim/reports/showdown_reference_validation_2026-08-30.md), [visual_replay_audit_2026-08-30.md](poke-sim/reports/visual_replay_audit_2026-08-30.md), [identity_validation_2026-08-30.md](poke-sim/reports/identity_validation_2026-08-30.md), [PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md](docs/release/PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md), [seismic_toss_validation_2026-08-30.md](poke-sim/reports/seismic_toss_validation_2026-08-30.md), [tailwind_growl_leer_validation_2026-09-01.md](poke-sim/reports/tailwind_growl_leer_validation_2026-09-01.md), [pp_drain_validation_2026-09-03.md](poke-sim/reports/pp_drain_validation_2026-09-03.md), [OODA_REPLAY_ATTRIBUTION_2026-09-08.md](docs/release/OODA_REPLAY_ATTRIBUTION_2026-09-08.md), [OODA_OUTCOME_CLAIMS_2026-09-08.md](docs/release/OODA_OUTCOME_CLAIMS_2026-09-08.md)

<a id="regulation-source-truth"></a>

### Regulations And Source Truth

**Blocked** | Owner: Source/Data Engineer and human data approver

Depends on: Independent workstream; readiness still requires the other release gates.

Completed locally / recorded:
- Official-source inventory, daily regulation watcher, exact-digest candidate validation, recurrence-aware alerts and protected staging workflow are prepared.
- Unsafe approval-time refetch is blocked. Generated offline data remains the browser baseline; official Champions evidence must establish legality.
- The accuracy harness manifest binds regulation IDs, versions, review/promotion states and format lanes. Catalog drift, unreviewed runnable formats and warnings above the zero-warning budget fail closed.
- The official Regulation M-C notice, exact UTC dates, six named Mega additions and Rillaboom example are captured in a versioned source-review package. The active window fails closed; the later M-B audit corrects the supposed pre-start gap using the official September 9 extension, Showdown's still-M-B format state is recorded, and missing exact Mega sprites use a base-form fallback without implying legality.
- M-B official identity reconciliation covers all 235 rows using source-linked explicit aliases for Fancy Vivillon and Eternal Flower Floette. The review artifact binds visual evidence and preserves baseline metadata; all mapped baseline stats/types/ability slots/numbers agree with pinned Champions. This does not approve learnsets, runtime consumers or legality.

Remaining:
- [ ] September 9 update: all 262 official M-C roster IDs are captured; 260 map to identity candidates. Resolve Maushold and Squawkabilly form IDs and verify format scope. See docs/release/REG_MC_INTAKE_2026-09-09.md.
- [ ] A pinned M-C reference now exists with 42 individual-set probes. Verify item/move/Ability inventory with official or in-game evidence, and preserve historical M-B routing during any reference upgrade. M-A, M-B and M-C remain unverified.
- [ ] Add complete-team accepted/rejected fixtures and controlled Z Mega mechanics fixtures, including Aura Guard contact boundaries, switching, suppression, multi-hit and spread interactions.
- [ ] Activate hosted monitoring and encrypted evidence retention; validate permissions and immutable candidate readback.
- [ ] Compile complete regulation-specific eligibility packages and implement separate digest-bound human approval and atomic publication, preserving old versions.

**Exit:** The selected regulation has complete reviewed eligibility evidence and an immutable published package; source outages and unknown facts cannot silently pass.

Evidence: [REGULATION_WATCH_2026-08-30.md](docs/release/REGULATION_WATCH_2026-08-30.md), [REGULATION_CONTEXT_AND_ELIGIBILITY.md](poke-sim/docs/REGULATION_CONTEXT_AND_ELIGIBILITY.md), [CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md](poke-sim/docs/CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md), [reg_m_c_readiness_2026-09-07.md](poke-sim/reports/reg_m_c_readiness_2026-09-07.md)

<a id="database-evidence"></a>

### Database And Evidence Integrity

**Blocked** | Owner: Database Engineer and human production operator

Depends on: Independent workstream; readiness still requires the other release gates.

Completed locally / recorded:
- Authorized read-only live metadata was audited on September 2: all 16 public tables have RLS, no public security-definer functions exist, and the Showdown mirror is anonymously readable. The existing local public-data hardening migration matches the anonymous write policies still present in production.
- September 3 readback confirmed 36 legacy team rows and 204 members with no build/schema/ruleset-version identity. The UI now separates a reachable DB from an accepted catalog and keeps bundled data authoritative when all rows are blocked.

Remaining:
- [ ] Review and apply the exact hardening migration through protected staging and production, then prove anonymous POST/PATCH/DELETE denial. Production currently permits anonymous analysis/coverage inserts and unrestricted branch-coverage updates.
- [ ] Create an owner-scoped private-save schema before claiming two-user isolation; the current public schema has no user/owner column. Reconcile the four-entry live migration ledger with repository migrations and record checksums.
- [ ] Design a reviewed versioned roster migration/reseed for the 36 legacy rows; do not relax runtime acceptance to hide drift.
- [ ] Review the advisor's missing foreign-key indexes against measured query plans. Fix paginated roster reads and complete-snapshot promotion/retention semantics before accepting durable competitive evidence.

**Exit:** Live allow/deny, completeness, digest, identity and persistence checks pass for the named project/schema; browser clients cannot promote private or unapproved evidence.

Evidence: [SUPABASE_FULL_AUDIT_2026-08-29.md](docs/release/SUPABASE_FULL_AUDIT_2026-08-29.md), [PROJECT_CLEANUP_AUDIT_2026-08-30.md](docs/release/PROJECT_CLEANUP_AUDIT_2026-08-30.md)

<a id="release-alignment"></a>

### Reviewed Release And Repo Alignment

**Blocked** | Owner: Release Engineer and repository owners

Depends on: [Simulation And Replay Truth](#simulation-truth), [Regulations And Source Truth](#regulation-source-truth), [Database And Evidence Integrity](#database-evidence)

Completed locally / recorded:
- Candidate changes through 08451b7 are pushed to PR #195 and hosted CI passed, including bundle freshness and battle audit. Generated metadata and pre-upload checks bind the required move pool and intro sprites to exact bytes; LF checkout regression coverage passes. This is not deployment: live readback remains v142. Runtime v161 identity fixes retain their separate scoped evidence.

Remaining:
- [ ] Reconcile incoming commits and both repository queues through reviewed PRs; do not force-copy or close issues from test counts alone.
- [ ] Review dependency/install-policy risks, protect main and production environments, and validate hosted CI.
- [ ] Deploy the exact reviewed artifact, verify browser/cache identity and rollback, and compare both repository heads/trees before claiming alignment.

**Exit:** A reviewed, reproducible candidate has hosted CI, environment protection, deployed-artifact proof and an explicit repo-alignment record; public-launch claims remain scoped.

Evidence: [STATUS.md](STATUS.md), [PROJECT_CLEANUP_AUDIT_2026-08-30.md](docs/release/PROJECT_CLEANUP_AUDIT_2026-08-30.md), [GITHUB_QUEUE_RECONCILIATION_2026-08-30.md](docs/release/GITHUB_QUEUE_RECONCILIATION_2026-08-30.md)

<a id="homepage-news"></a>

### News And Tournament Reference Coverage

**Local only** | Owner: Source/Data Engineer and Release Engineer

Depends on: Independent workstream; readiness still requires the other release gates.

Completed locally / recorded:
- Curated official/news/player-video feed, source-health fallback, publication sorting, controls and six-hour review-PR workflow are implemented.
- Worlds Masters top-cut catalog retains 13 review-only teams and 78 member identities; private stat points and approved regulation mappings remain unknown.

Remaining:
- [ ] Validate hosted news refresh and deployed behavior. Complete Worlds replay coverage is not established.
- [ ] Keep community commentary and review-only tournament teams separate from official legality and authoritative mechanics data.

**Exit:** Hosted refresh/failure recovery and the deployed feed are verified; every team/replay claim retains scope and provenance.

Evidence: [HOMEPAGE_NEWS_REFRESH_2026-08-30.md](docs/release/HOMEPAGE_NEWS_REFRESH_2026-08-30.md), [worlds_top_cut_validation_2026-08-30.md](poke-sim/reports/worlds_top_cut_validation_2026-08-30.md)

<a id="beginner-experience"></a>

### Beginner Homepage And Navigation Audit

**Queued** | Owner: UI Engineer, product owner and real beginner participants

Depends on: [Simulation And Replay Truth](#simulation-truth), [Regulations And Source Truth](#regulation-source-truth), [Reviewed Release And Repo Alignment](#release-alignment)

Completed locally / recorded:
- A preliminary agent walkthrough inspected all 11 public sections, three homepage destinations and desktop/mobile homepage layout. Contradictory trust labels, stale source/roadmap copy and navigation friction are documented; the full beginner study remains queued.
- Bounded site quick wins are locally tested: homepage destination focus and editor routing, neutral replay placeholder, clearer and more compact roadmap disclosures. Desktop and 390px checks are not a full user study.
- A fresh browser now defaults to the explicitly unverified Practice lane instead of blocked historical M-A. One local doubles Bo3 rendered replay evidence and exported matching build, ruleset, team-digest, participant and item identity fields.

Remaining:
- [ ] Test fresh-visit comprehension, starter-team-to-result journeys, navigation/back/reload behavior and error recovery.
- [ ] Stress mobile, keyboard, accessibility, network/DB failures and rapid interactions. Pair every simulation/team change with visible/exported logs.
- [ ] Fix observed friction, add regressions and retest the deployed candidate with real beginners and competitive players.

**Exit:** No critical journey blockers; predeclared task-completion/comprehension goals are evaluated with real users. Agent walkthroughs alone do not establish top-1% navigation.

Evidence: [BEGINNER_HOMEPAGE_AUDIT_PLAN.md](docs/strategy/BEGINNER_HOMEPAGE_AUDIT_PLAN.md), [SITE_QUICK_WINS_2026-08-30.md](docs/release/SITE_QUICK_WINS_2026-08-30.md), [PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md](docs/release/PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md)

<a id="evidence-brain"></a>

### Evidence-Backed No-API Brain

**Deferred** | Owner: Evidence/Brain Engineer and independent evidence reviewer

Depends on: [Simulation And Replay Truth](#simulation-truth), [Regulations And Source Truth](#regulation-source-truth), [Database And Evidence Integrity](#database-evidence), [Beginner Homepage And Navigation Audit](#beginner-experience)

Completed locally / recorded:
- Foundation schemas, deterministic rules/composer/validator, feedback helpers and improvement-pack contracts exist. This is not proof of a fully wired or accurate coaching product.

Remaining:
- [ ] After simulation readiness, complete one real-evidence-to-validated-analysis-to-feedback-to-improvement-pack journey.
- [ ] Consolidate lead/lineup reports, turning-point analysis, drills and private Trainer Room learning under this single evidence gate.
- [ ] Keep feedback-to-fix-to-test-to-release controlled; no live self-training or feedback overriding mechanics.

**Exit:** Every material coaching claim cites validated evidence, uncertainty and versions; feedback fixes have regression coverage and no illegal suggestions.

Evidence: [llm-brain-context.md](docs/architecture/llm-brain-context.md), [llm-brain-integration-audit.md](docs/architecture/llm-brain-integration-audit.md), [LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md](poke-sim/docs/LEARNING_BRAIN_ARCHITECTURE_ROADMAP_2026-07-04.md)

<a id="future-product"></a>

### Optional Product Expansion

**Deferred** | Owner: Product owner after measured adoption and trust

Depends on: [Evidence-Backed No-API Brain](#evidence-brain), [Reviewed Release And Repo Alignment](#release-alignment)

Completed locally / recorded:
- Historical ideas are preserved as research, not delivery commitments.

Remaining:
- [ ] Re-evaluate tournament PDFs, community sharing, accounts/cross-device sync, subscriptions/donations, human coaching offers and advanced comparisons against demonstrated user needs.
- [ ] Optional real LLM integration and global learning require separate privacy, cost, trust and release decisions. Singles product expansion remains deferred.

**Exit:** Product owner explicitly promotes a justified item into a scoped milestone with acceptance evidence; no promise to build every historical idea.

Evidence: [ROADMAP_PRE_CONSOLIDATION_2026-08-30.md](docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md)

## Documentation Authority

1. [AGENTS.md](AGENTS.md): operating policy.
2. [STATUS.md](STATUS.md): current tested build, deployment and live-proof state.
3. This roadmap: milestone order, scope and exit gates. Edit the shared JSON source, not this generated file.
4. Dated release audits: reproducible evidence and historical findings, not overriding plans.
5. GitHub issues: team execution queue; verify fully qualified references before closing or merging issues.

## Consolidation Record

Superseded sprint plans, percentage scores, old issue snapshots and monetization-first blockers were archived in [the historical roadmap](docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md), not erased. Current consolidation decisions: [audit](docs/release/ROADMAP_CONSOLIDATION_2026-08-30.md).

The browser Roadmap tab and this document are generated from the same milestone source. Neither a local build nor a checked box proves deployment. Preserve older audit evidence; add new milestones with stable IDs, dependencies, acceptance criteria and evidence links.
