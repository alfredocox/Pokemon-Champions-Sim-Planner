---
name: pokemon-battle-audit
description: Audit Pokemon Champions battle behavior across mechanics fixtures, Showdown parity, golden traces, seeded matchup stress, and explicit coverage gaps. Use for battle-engine reviews, move or ability accuracy claims, Pokemon stat validation, gameplay edge cases, simulator stress tests, mechanics releases, and requests for complete or universal battle correctness.
---

# Pokemon Battle Audit

Use this skill to measure battle confidence without turning partial evidence into a universal claim.

## Required Inputs

1. Read `AGENTS.md`, `STATUS.md`, `poke-sim/battle_audit_manifest.json`, and the newest mechanics or release audit.
2. Inspect the branch, working tree, and all changed battle paths.
3. Identify affected manifest families and the exact behavior claim.
4. Treat Showdown as baseline mechanics evidence and approved Champion sources as Champion-delta evidence.

## Proof Layers

Run the layers in this order:

1. **Contract:** `npm --prefix poke-sim run test:battle-audit:contract` validates family ownership, evidence files, and gap disclosure.
2. **Focused regression:** add or update deterministic fixtures for the changed move, ability, item, stat, field, targeting, switch, faint, or lifecycle path.
3. **Oracle/parity:** compare baseline behavior with Showdown where an oracle exists. Champion-specific differences require approved Champion evidence.
4. **Golden trace:** preserve expected seeded logs for representative whole-battle behavior.
5. **Seeded stress:** run `npm --prefix poke-sim run test:battle-audit` to execute the focused family suites, golden traces, and curated-team matrix.

A stress matrix can expose crashes, asymmetry, hangs, and lifecycle drift. It cannot prove an untested rule correct.

The development-only pinned reference harness is `npm --prefix poke-sim run showdown:reference`. Read `poke-sim/docs/SHOWDOWN_REFERENCE_PROTOTYPE.md` and its validation report first. It deliberately exits nonzero on disagreement/unsupported probes; its contract tests passing does not mean parity passes. Keep original/canonical inputs, both raw logs, source hashes and counters. Bounded probes are not completed games. Reject incomplete evidence, ambiguous actor names, unsupported initial state and tied boundary speeds. Never assume equal seeds align different engines' random draws. Review the documented dependency/install-policy gate before adopting this package in CI, a browser or a service.

Maintain `poke-sim/battle_edge_case_matrix.json` alongside the family manifest. Every material timing, lifecycle, targeting, resource, RNG, or transformation behavior must have a stable case ID and one of these states:

- `covered`: deterministic tests name the exercised boundary vectors.
- `partial`: useful tests exist and the unproved boundary is stated.
- `open`: no sufficient executable parity evidence exists.

Never infer case coverage from a passing family suite or stress run. Promote a case only when its named boundaries have executable evidence and a source or approved Champion oracle.

## Coverage Rules

- `regression_covered` means named supported behavior has deterministic tests; it never means every interaction is covered.
- `partial` means useful evidence exists but the family has named uncovered inventory or interactions.
- `gap` means authoritative evidence or executable behavior proof is not sufficient for release claims.
- Every partial or gap family must state `known_gaps`.
- Every regression-covered or partial family must reference test files that exist.
- Add a family or extend one whenever a new mechanic enters the supported simulator surface.
- Convert each confirmed field failure or user log defect into a minimized deterministic fixture before closing it.

## Audit Review

Delegate an independent read-only review to `battle_auditor` after mechanics implementation and before completion. For a Champion override also use `mechanics_reviewer`; for release changes also use `release_reviewer`.

The reviewer must report:

- changed execution paths and affected families
- missing boundary cases and interaction pairs
- parity/source quality
- deterministic seed and fixture quality
- what passed, what is partial, and what remains unknown
- whether the proposed product claim is narrower than or equal to the evidence

## Forbidden Claims

Do not report `100% accurate`, `every edge case`, `fully Showdown equivalent`, `all Pokemon`, `all moves`, or `universal` unless the manifest contains no partial/gap families and the exact inventory, versions, interactions, and proof run are named. The present project does not meet that standard.

Production promotion, Champion overrides, and deployments retain the human approval boundaries in `AGENTS.md`.
