# Historical Status Snapshot - Before Roadmap Consolidation
> Superseded snapshot retained for traceability. Current status: [STATUS.md](../../STATUS.md). Original relative links below were written from the repository root; old counts/builds are not current proof.

# Project Status

> Canonical current-state snapshot. Update this file with every release-gate change. Historical documents do not override it.

- Remote/DB snapshot checked: 2026-08-29; local battle/catalog update: 2026-08-30
- Canonical repository: `TheYfactora12/Pokemon-Champions-Sim-Planner`
- Working branch: `audit/project-open-items-2026-07-05`
- Base commit before uncommitted audit changes: `933071dcaeaafdd458a696eea8f8504109d6785f`
- Divergence from `origin/main`: 9 commits ahead, 3 commits behind
- GitHub `main` protection: **not configured**; GitHub reports no protection and no rulesets
- Last Pages deployment: commit `0173928712465700b286be8c589e854c0100d0fd`, 2026-07-04
- Live Pages artifact: `v2.2.131-production-launch-gate`, SHA-256 `55b4c92b093fd6fe52eff94c84c709c035026735c834d98795269815ed72c376`
- Local bundle: newer than the deployed artifact; local proof is not deployment proof
- Live Supabase public reads: 8,653 approved Showdown rows, 36 teams, 204 members, 34 complete teams
- Live Supabase gate: August hardening and Team Lab/Trainer Room migrations are not applied and read back
- Champion overrides: zero active rows
- GitHub queue: 69 open issues and 17 open milestones at audit time
- Battle audit: 15 mechanics families (6 regression-covered, 7 partial, 2 gap), 5 inventories (3 partial, 2 gap), and 44 edge cases (17 covered, 17 partial, 10 open). New pinned-reference failures cover same-turn Tailwind reordering, Seismic Toss and Growl/Leer stages. Default bring-four consistency is fixed locally; broader parity is not proven.
- Tournament review catalog: all 13 Worlds 2026 Masters top-cut entrants / 78 Pokemon captured from published RK9 sheets with source digests and stable identities. Available in local Overview only. Private stat points and approved ruleset mapping are missing; none are promoted to runtime teams or Supabase.
- Open mechanics: entry/residual ordering, PP/Pressure, broader multi-hit/grounding interactions, imported-surface completeness and Regulation M-B remain release gates. Default Champions bring-four now has replacement/identity regression coverage; accuracy benchmarks explicitly select their participants.
- August 30 browser check: the existing tab showed v2.1.18 while a fresh Pages fetch matched the v2.2.131 artifact digest above. The visible replay and a logs-insert console warning were retained locally. DB connected does not prove log persistence; no production writes or deployment occurred.
- Current validation evidence: [`Identity and participant validation`](poke-sim/reports/identity_validation_2026-08-30.md), superseding the earlier accuracy report's build/count snapshot. A passing local consistency sweep does not establish 99% in-game accuracy.
- Final local gates: 138 fast files and 12 offline/mock DB files pass; the earlier 4,500-battle legacy audit passed its declared scope. Engine 1.1.1 explicit-selection sweep: 2,312 doubles plus 2,312 singles, zero hard audit/state/replay errors, 14 unresolved actor warnings. These consistency checks do not supersede the new Showdown mechanics disagreements below. Local build `v2.2.133-evidence-identity`, bundle SHA-256 `d80e9319a9106ba41604de1cf0a711c866bb45271b6ddd4e50f5eb2ffb0c3075`.
- Tournament capture history: [`Worlds capture and validation`](poke-sim/reports/worlds_top_cut_validation_2026-08-30.md). Its initial mechanics action list is superseded by the accuracy report and current player review.
- Current player review and fix queue: [`Competitive player review`](poke-sim/reports/competitive_player_review_2026-08-30.md). CPA-01 unknown rules and CPA-03 participants are fixed locally. CPA-02 execution/storage/export identity is fixed locally, but full comparison acceptance remains partial because independent Strategy caches still mix context (CPA-09). Misleading coaching remains open. This is not a clean competitive-release verdict.

## Active Gates

Regulation watch candidate: [implementation, evidence and activation checklist](docs/release/REGULATION_WATCH_2026-08-30.md). Daily official-source discovery, source-health reporting, semantic-change review issues, exact-digest private candidate staging and legacy Showdown approval denial are implemented locally. Source challenges/JavaScript pages keep coverage incomplete. The new migration, hosted workflows, restricted staging identity and atomic approval/publication are not verified or activated. No approved rules or runtime data changed.

Regulation tooling verification: 35 watcher/evidence tests, 39 offline staging checks and 10 legacy approval checks pass; full gate passes 146 fast files plus 12 offline/mock DB files. Live source check attempted 31 sources: 7 captured and 24 unavailable (22 required); all 7 candidates passed offline digest/staging checks. Encrypted raw-source retention is implemented but its production key is not configured. These results do not close source completeness, hosted activation, live permissions or competitive accuracy gates.

Homepage news candidate: [curated coverage and rollout](docs/release/HOMEPAGE_NEWS_REFRESH_2026-08-30.md), local `v2.2.135-curated-news`. Five live source fetches produced 16 dated items, including one Worlds VGC broadcast and curated player videos. Publication sorting, source/thumbnail allowlists, policy-bound outage fallback, freshness labels, category/pause controls and a six-hour review-PR workflow are implemented locally. No automatic rules/DB promotion or production deployment. Hosted scheduler, PR permissions and live Pages verification remain open; complete Worlds archive and unattended data-only publishing are follow-ups. Engine remains 1.1.2.

News closeout verification: 144 fast files and 12 offline/mock DB files pass; 38 pipeline checks, eight delayed-cache scenarios, 14 executable review-policy scenarios and 24 workflow/diagnostic guards. Both independent reviewers closed the named source/cache/release findings locally. All 16 image checks passed, and desktop plus a 390-pixel responsive iframe were inspected. Bundle SHA-256 `322e1e37ae01a9cc3b32e188c6f380f1b399fc79f7d0e65379b6b5cb2873510f` is byte-reproducible through direct generation and stdout on Windows. Final output: `poke-sim/artifacts/news-project-gate-closeout.txt`. No live DB or deployment proof is added.

Latest cleanup pass: [code/workflow/database efficiency audit](docs/release/PROJECT_CLEANUP_AUDIT_2026-08-30.md). Removed duplicate CI install/unused bundle mutation and 18 repeated Pages test invocations; fixed missing tournament asset staging and added inventory guards. Live-only/same-repository serialized test cleanup is a mitigation, not complete run-owned DB isolation. Read-only DB diagnostics are prepared but not executed. Conflicting bootstrap schemas, roster pagination and mirror snapshot/retention semantics remain open; no runtime or live DB change in this cleanup.

Cleanup verification: 141 fast files and 12 offline/mock DB files pass, with 16 workflow/diagnostic checks and the Pages asset/coverage inventory guard. Independent reviews accepted the narrow changes. Hosted workflow execution and live SQL verification are still pending.

Latest local slice: [shared regulation preflight](poke-sim/reports/regulation_selection_validation_2026-08-30.md), build `v2.2.134-regulation-preflight`, engine `1.1.2`, bundle SHA-256 `72f3880a3fbeaffcf7ea1d4f6d5bff7c07a651403636700d8cd614ed316e0095`. Simulator/Set Editor selection is shared; unverified M-A/M-B runs and trusted historical learning are blocked. Explicit custom practice remains available. Registered Mega bring identity and runtime-alias collisions are fixed locally. Full gate: 140 fast files plus 12 offline/mock DB files pass; final Roadmap, release artifact and load-order checks also pass. Desktop selector/draft/blocking checks passed; mobile and positive interactive replay parity remain follow-up work. The [eligibility package contract](poke-sim/docs/REGULATION_CONTEXT_AND_ELIGIBILITY.md) is planned database work, not applied schema. This supersedes the build/engine snapshot above, not its historical test evidence.

Latest mechanics evidence: [pinned Showdown reference validation](poke-sim/reports/showdown_reference_validation_2026-08-30.md). The isolated dev-only prototype has 16 passing contract tests; its five bounded probes produce two scoped agreements and three mismatches, zero completed games. Full gate: 138 fast files and 12 offline/mock DB files pass. All three mechanics findings remain open. The default team's Incineroar U-turn is rejected by pinned Showdown; 33 other teams per format remain unsupported due to missing explicit levels. A moderate development-dependency advisory and CI installation-policy review block adopting/merging this package unchecked. No browser build, deployment, live DB proof or source promotion changed.

Latest visual evidence: [downloaded versus visible replay audit](poke-sim/reports/visual_replay_audit_2026-08-30.md). All 20 games from two local batches were paired, plus one old-replay check after swapping teams. Identity/HP/items matched observable fields, but 56 unique-game board snapshots omitted Tailwind durations and 85 turns had missing/reordered action summaries. CPA-13/14 remain open; the audit tool correctly fails those comparisons. Tooling gate: 137 fast files pass. Runtime/build and prior DB proof above are unchanged.

Current competitive scope: **doubles teams only**. Tournament catalog validation rejects missing or conflicting formats. Existing singles tests remain isolated shared-mechanics regressions and do not establish doubles readiness.

1. Review this branch, reconcile the three incoming `origin/main` commits, rerun the complete gate, and merge through a pull request.
2. Protect `main` and require CI/release checks before Pages deployment.
3. Create a protected GitHub `production` environment, apply migrations in order, and record schema/RLS/grant/index readback.
4. Split Showdown observation from promotion; promotion must name an immutable sync run and SHA-256 digest.
5. Finish Reg M-B official evidence and executable Showdown differential parity before expanding authoritative coaching.
6. Finish CPA-02/09 comparison and Strategy-cache isolation after the local identity fixes; then correct forced-switch and move-opportunity coaching. Verify local fixes in the deployed artifact before closing release gates.

## Next Task

Complete regulation-specific source packages and extend local regulation UI validation, then continue the approved Showdown engine-reference investigation: resolve team translation and the three named mechanics failures before increasing authoritative simulation/coaching claims. Extend completed-game and visible replay comparison. Prepare a reviewed merge candidate only after dependency/install-policy and existing release gates are addressed. Do not apply production migrations or approve source rows from an unreviewed local branch.

Use `AGENTS.md` for policy, this file for current state, GitHub for issue status, and the newest `docs/release/` audit for evidence. Bare issue numbers in historical documents are not actionable; use `owner/repository#number`.

Queued after simulation readiness: the [beginner homepage/navigation audit](ROADMAP.md#queued-milestone-beginner-homepage-and-navigation-audit). Evaluate first-visit comprehension, starter-team-to-result journeys, mobile/accessibility, navigation and failure recovery; fix and retest with visible/exported battle evidence. Real beginner validation is required alongside the agent walkthrough. Neither 99% simulation accuracy nor top-1% navigation is currently established. This is a documented future milestone, not an active scheduled job or a completed UI audit.
