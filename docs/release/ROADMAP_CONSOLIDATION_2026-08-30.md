# Roadmap Consolidation Audit

Primary owner: Product/QA Coordinator. Secondary lanes: Experience and Release. Status: local candidate only; no issue closure, production deployment, DB migration or rules promotion.

## Findings And Changes

| Finding | Consolidation decision |
|---|---|
| A 548-line roadmap mixed dated changes, active plans and old sprint gates. | Preserve the pre-consolidation snapshot in `docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md`; replace the active plan with one stable-ID milestone source. |
| Engine Truth still carried an old 83% score based on task counts. | Remove it from the active roadmap. Mechanics readiness requires scoped independent evidence, not a task-completion percentage. |
| A donation-account setup task was still labeled an immediate P0 blocker. | Keep its historical record; move monetization ideas into optional post-readiness research. Do not close its GitHub issue automatically. |
| Multiple sections gave incompatible next steps, including Brain work before named mechanics gaps. | One next action: team translation and pinned-reference disagreements, then complete-game/visible-replay proof. Parallel source/DB/release work must respect its separate trust gates. |
| Brain foundation, learning architecture, Battle Sensei expansion and private/global learning appeared as separate active plans. | Consolidate under one deferred evidence-backed no-API Brain milestone. Preserve architecture specs; do not promise every historical feature. |
| Source watch, DB hardening, release alignment and news had overlapping completion language. | Separate local implementation, live verification and hosted activation. No milestone is marked complete simply because local tests pass. |
| The site's current board was a second hard-coded history with stale build, issue and validation snapshots. | Generate a current browser roadmap and Markdown roadmap from `poke-sim/source/project-roadmap.json`. Put legacy UI material behind a closed, explicitly historical disclosure. Preserve the review-only tournament catalog outside that archive. |
| The beginner/UI-engineer audit had been added to an already crowded roadmap. | Keep its full task checklist in `docs/strategy/BEGINNER_HOMEPAGE_AUDIT_PLAN.md`; give it one queued milestone after simulation readiness and a reviewed release candidate. |
| Repeated STATUS paragraphs re-listed older local builds/test counts beside newer evidence. | Keep one current snapshot and retain the old status text as history. Link dated reports instead of copying all their counters. |

## Canonical Records

- `AGENTS.md`: policy and approval boundaries.
- `STATUS.md`: latest verified local build and explicitly dated remote/DB proof.
- `poke-sim/source/project-roadmap.json`: milestone IDs, owners, states, dependencies, remaining work and evidence links.
- `ROADMAP.md` and `poke-sim/generated/project_roadmap.js`: generated views of that single milestone source.
- Dated audits: what was actually tested and what remains unproven. They are not alternative active roadmaps.
- GitHub: execution queue; current reconciliation is recorded separately in `GITHUB_QUEUE_RECONCILIATION_2026-08-30.md`.

## Maintenance

1. Add or revise a milestone in the shared JSON source. Preserve stable IDs; record dependencies, completion gate and evidence.
2. Run `npm run roadmap:build` from `poke-sim`.
3. Run `npm run roadmap:check` and the project gate. The new regression suite checks generated output, references, duplicate IDs and dependency cycles.
4. Update STATUS only when evidence changes. Local-only, blocked, queued and deferred are distinct states.
5. Rebuild the browser bundle and release/cache identity for site-visible changes; verify the actual deployed artifact before claiming the public roadmap is updated.

## Not Removed Or Closed

- Historical task IDs, audit reports, architecture decisions and implementation evidence were preserved. Old roadmap issue numbers are not reinterpreted as canonical-repo issue IDs.
- Existing Brain contracts are not erased; authoritative coaching remains gated.
- No production DB rows, schemas, private evidence or battle mechanics were changed.
- No GitHub issue or milestone was closed; duplicate candidates require owner review and scope comparison.
- The broader beginner homepage audit remains queued, not performed by this Roadmap-tab alignment work.

## Verification And Remaining Work

Local candidate: `v2.2.136-roadmap-alignment`, bundle SHA-256 `88e06065cc15220accee486793dd23ffa530a9fa261c4bf33ef8683dcff45002` (11,451,788 bytes).

- Full `npm test`: 147 fast files and 12 offline/mock DB files passed. Output: `poke-sim/artifacts/roadmap-project-gate.txt` (local test artifact).
- The first run exposed a stale UI build-ID fallback and stale release-test constants; both now match the manifest. No mechanics were changed to satisfy these checks.
- Final evidence-link notice: reran all 15 roadmap checks, release identity/reproducible bundle, replay export, Pages asset inventory and legacy overview suites successfully.
- Current Markdown/evidence file links, duplicate IDs, unresolved completion prerequisites and dependency cycles are covered by the roadmap tests. `git diff --check` passed; Git reported existing line-ending normalization warnings.
- Local desktop check at 1280 x 720: eight milestones, historical disclosure closed by default, beginner milestone expand/collapse and dependency-anchor navigation work; no horizontal overflow. Mobile and the full beginner audit were not performed.
- Independent read-only review found no new blocker and requested the explicit unpublished-evidence-link notice, now present in UI and documentation.

Hosted workflow activation, production migration/readback, complete source coverage, immutable approval/publication, mechanics parity, real beginner testing and repo alignment remain open. No issue closure, commit, push or deployment was performed in this slice.

Browser evidence links target GitHub main; local candidate documents may not be published yet. The source validator checks local files, not remote publication. Final build and current proof boundaries are also recorded in STATUS.

Archive links inside original snapshots retain their original repository-root context; they are historical records, not a maintained navigation index. The current roadmap's evidence links are checked against the repository.
