# Engineering Agent Roster

This roster gives one owner to each risk area while keeping approval independent. Project-scoped Codex reviewers are defined under `.codex/agents/`; the other entries are working roles assigned to the main implementer, not autonomous production identities.

| Agent role | Owns | Must prove | Cannot self-approve |
|---|---|---|---|
| Mechanics Engineer | Damage, order, priority, speed, field effects, switching, fainting, identity continuity | Focused regression and appropriate Showdown-or-Champion comparison | New mechanics truth or unsupported Champion behavior |
| Source/Data Engineer | Showdown mirrors, Champion deltas, regulations, legality, generation, mapping | Upstream version/hash, deterministic diff, provenance, regenerated runtime | Their own Champion override candidate |
| Database & Security Engineer | Supabase schema, migrations, RLS, grants, durable records, privacy | Migration and contract tests, policy review, approved-environment readback | Production migration, secret use, or weakened access policy |
| Replay/Evidence Engineer | Replay parsing, EvidenceBundle, Brain composer/validator, feedback, benchmarks | Stable identities, evidence IDs, confidence, uncertainty, regression fixtures | Mechanics changes hidden in analysis language |
| Release Engineer | CI, test gate, bundle, cache, manifest, Pages, repo comparison | Reproducible gate, artifact identity, deployed readback when claimed | Bypassing a failed required gate |
| Experience Engineer | Core simulator, Review tab, accessibility, responsive workflows | UI regression plus desktop/mobile browser inspection | Declaring data/mechanics correctness from presentation alone |
| Product/QA Coordinator | Roadmap, milestone criteria, issue triage, handoffs, success metrics | Source-backed status and explicit closure evidence | Technical truth owned by another lane |

## Assignment Rules

1. Assign one primary role for every substantial task.
2. Add secondary roles only for real cross-lane dependencies.
3. Require an independent reviewer for mechanics truth, Champion overrides, access policy, live data, and releases.
4. Keep the human production operator as the only approver for production migrations, immutable promotions, credentials, and deployment exceptions.
5. Use the shared project skill at `.agents/skills/pokemon-champion-engineering/SKILL.md` so every role follows the same source hierarchy, gates, and handoff language.

## Recommended Review Pairings

| Change | Implementer | Independent reviewer |
|---|---|---|
| Priority, Trick Room, damage, switch/faint behavior | Mechanics Engineer | Source/Data Engineer using oracle evidence |
| Showdown sync or Champion override | Source/Data Engineer | Mechanics reviewer or data approver |
| Supabase migration, RLS, grants, public view | Database & Security Engineer | Security reviewer plus human production operator |
| Brain recommendation or replay turning point | Replay/Evidence Engineer | Mechanics Engineer |
| Bundle, workflow, Pages deployment | Release Engineer | Product/QA Coordinator |
| Review-tab workflow | Experience Engineer | Replay/Evidence Engineer |

Agents prepare evidence and candidates. They do not turn an unverified result into production truth.

## Installed Review Agents

- `season_reviewer`: read-only seasonal regulation, new-entity eligibility, source/version, imported-team and historical-result impact review; uses `$pokemon-season-update`.

- `mechanics_reviewer`: read-only mechanics, identity, legality-behavior, and parity review
- `trust_boundary_reviewer`: read-only Supabase, RLS, privacy, provenance, and source-promotion review
- `release_reviewer`: read-only CI, artifact, Pages, repo-alignment, and release-claim review
- `battle_auditor`: read-only adversarial mechanics coverage, parity, deterministic-fixture, and stress-evidence review

Codex should delegate to these agents after implementation when their boundary is crossed. Parallel review is reserved for changes that genuinely span multiple boundaries.
