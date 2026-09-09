---
name: pokemon-champion-engineering
description: Route engineering work in Pokemon Champions Sim Planner through the correct mechanics, source-data, Supabase, evidence/Brain, release, experience, and project-audit proof gates. Use for implementation, review, debugging, audits, roadmap decisions, database work, simulator parity, GitHub Pages releases, and agent handoffs in this repository.
---

# Pokemon Champion Engineering

Use this skill to make repository work evidence-backed, scoped, and independently reviewable.

## Start Here

1. Read `AGENTS.md`, `STATUS.md`, the relevant `ROADMAP.md` section, and the newest applicable audit under `docs/release/`.
2. Inspect the branch, remotes, divergence, and working tree. Preserve unrelated changes.
3. Classify the task into one or more lanes in `references/lane-matrix.md`.
4. State the claim the change is meant to prove. Distinguish local, mock, live, deployed, and parity evidence.
5. Select only the specialist capabilities that match the lane. Do not invoke every available skill by default.

## Execution Loop

For each affected lane:

1. Identify the authoritative source and the truth boundary.
2. Reproduce the failure or add a focused regression when practical.
3. Make the smallest change that fixes the named behavior.
4. Run the lane-specific tests from `references/lane-matrix.md`.
5. Run `npm run test:fast` for shared code and `npm test` for a merge candidate.
6. Rebuild generated artifacts through their generator; never hand-edit them.
7. Delegate independent read-only review to `mechanics_reviewer`, `trust_boundary_reviewer`, or `release_reviewer` when the matching boundary is crossed. Use multiple reviewers only for genuinely cross-lane changes.
8. Update authoritative documentation with exactly what was proved and what remains unproved.

## Capability Routing

- Use `$pokemon-season-update` and `season_reviewer` for new regulations, newly eligible entities, seasonal source drift and historical-regulation compatibility.

- Use the Supabase and Postgres best-practice capabilities for schema, migrations, RLS, grants, queries, Edge Functions, or live DB verification.
- Use security scan/diff/fix capabilities for explicit security reviews and validated findings.
- Use data-quality and validation capabilities for mirror drift, mapping, replay evidence, benchmark, or source reconciliation work.
- Use the dedicated `$pokemon-battle-audit` skill and `battle_auditor` for battle execution changes or broad mechanics-accuracy claims.
- Use browser control for local and deployed UI verification, screenshots, accessibility, and artifact identity checks.
- Use OpenAI documentation only for actual Codex, ChatGPT, model, API, agent, or skill behavior.
- Use skill-creator when changing this skill's contract.

Tool availability varies. When a preferred capability is unavailable, follow the same proof contract with repository tests and record the limitation.

The main agent remains the implementer. Custom reviewers report findings and do not edit; routine isolated UI, documentation, and test changes do not require delegation.

## Non-Negotiable Boundaries

- Showdown is baseline source truth; reviewed Champion overrides represent named deltas.
- Supabase persists reviewed data and evidence. It does not decide battle mechanics.
- Stable Pokemon identity owns items, moves, stats, status, and history across leads, switching, bench state, and fainting.
- The Brain explains validated evidence and cannot replace mechanics, legality, or source truth.
- Imported teams receive the same identity, legality, and mapping checks as bundled teams.
- No agent may promote source rows, apply production migrations, weaken RLS, expose secrets, or deploy an unreviewed artifact without explicit authorization for that operation.
- Never call work universal, live, deployed, aligned, or 1:1 without naming the compared artifacts, scope, evidence, and time.

## Handoff

Use the handoff contract in `AGENTS.md`. Name the primary agent role from `docs/agents/ENGINEERING_AGENT_ROSTER.md`, any independent reviewer, exact tests, proven scope, remaining uncertainty, branch/deployment state, and the single next task.
