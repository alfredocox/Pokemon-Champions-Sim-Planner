# AGENTS.md

## Project

This repository is a Pokemon Champion competitive battle simulator.

The project prioritizes:
1. Accurate battle simulation.
2. Versioned rules and regulations.
3. Evidence-bound legality.
4. Replay-verifiable results.
5. Safe coaching that distinguishes verified facts from assumptions.

## Non-negotiable rules

- Do not invent Pokemon Champion-specific rules, Pokemon legality, move legality, item legality, form legality, or regulation data.
- Unknown game truth must be represented as `needs_verification`.
- Showdown/mainline Pokemon behavior may be used as a baseline only if clearly marked as baseline/reference, not Champion truth.
- Every simulation-derived result must include:
  - `engine_version`
  - `ruleset_version`
  - `regulation_id`
  - `format`
  - sample size where applicable
- Any leaderboard result affected by an engine or ruleset update must be markable as stale.
- Do not mix meta popularity, legality, and mechanical truth.

## Team Lab principles

The Team Lab leaderboard ranks teams based on simulator evidence, not absolute real-world truth.

Leaderboard entries must expose:
- regulation
- format
- legality status
- sim rating
- raw win rate
- adjusted win rate
- games played
- confidence
- engine version
- ruleset version
- stale status

Custom teams may be:
- private
- hidden_details
- public

Hidden teams must not leak private moves, items, EVs, IVs, natures, or tech choices to non-owners.

## Testing expectations

When changing Team Lab, add or update tests for:
- legality validation
- leaderboard calculation
- confidence labels
- stale marking
- hidden visibility filtering
- illegal team exclusion
- needs_verification handling

Before completing a task, run the project's standard:
- typecheck
- lint
- unit tests
- any relevant database migration validation

## Coding style

Follow existing project conventions. Prefer small, well-scoped modules. Avoid large unrelated refactors.
