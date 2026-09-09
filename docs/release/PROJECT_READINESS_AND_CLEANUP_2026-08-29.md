# Project Readiness And Cleanup Audit - 2026-08-29

## Decision

The project has a strong evidence-first foundation, but it is not release-ready as a universal competitive Pokemon Champion simulator. Its proven scope is a Champion-focused doubles laboratory over curated teams and selected mechanics. Release and truth-promotion gates should close before authoritative coaching expands.

## Closed Locally

- Audited the public Supabase connection and shared catalog quality.
- Aligned browser adapter columns, slots, and failure handling with the schema contract.
- Added read-only shared evidence policy candidates and a production hardening migration.
- Made News Sync preserve its last-known-good feed during total source outage.
- Required an isolated Supabase test project for CI writes and awaited cleanup.
- Changed Pages to publish an explicit runtime allowlist, excluding SQL, tests, reports, and internal docs.
- Added source-truth and fast gates to Pages.
- Consolidated contributor, current-state, security, and agent approval guidance.
- Removed proven-dead root build/archive copies.
- Added Showdown-backed species/form Ability validation to the shared import/editor gate, including Champion-specific generated Mega Abilities.
- Added one shared project engineering skill, a specialist role roster, and read-only mechanics, trust-boundary, and release reviewer agents.
- Replaced Bash-only local test entrypoints with one cross-platform Node gate shared by developers and CI; `.mjs`, DB contracts, Phase 4c, and M9 are no longer silently omitted.
- Fixed CI's offline Supabase-variable crash and removed its duplicate test-discovery implementation.
- Added a dedicated battle-audit skill, read-only adversarial auditor, coverage manifest, reusable CI workflow, golden-winner checks, and strict 4,500-battle seeded matrix failure rules.
- Corrected stale public roadmap claims to the current evidence: 123 of 134 shipped moves verified, 11 baseline, and 84 of 84 curated/Mega abilities modeled.
- Added a machine-validated 37-case battle edge matrix. Regenerator, strict accuracy boundaries, independent spread-target accuracy, and grouped multi-action Speed ties now have deterministic regressions. Ability immunity is also proved ahead of spread accuracy for a mixed-target fixture. The 129-file fast gate and final 4,500-battle audit passed. Current status is 15 covered, 12 partial, and 10 open; a repeatable Kevin Meta Sun mirror side-bias signal remains an explicit competitive-parity blocker.

These are local branch results until reviewed, merged, and deployed.

## Active Blockers

1. `main` has no branch protection or rulesets. Pages has previously deployed a commit whose CI failed.
2. This branch is 9 commits ahead and 3 behind `origin/main`, with a large uncommitted audit set.
3. GitHub has no protected `production` environment; naming it in YAML does not configure reviewers.
4. Showdown approval is not bound to a previously reviewed immutable run ID and digest.
5. DB hardening and missing Team Lab/Trainer Room migrations need ordered application and grants/RLS/index readback.
6. Reg M-B remains source-review only. Seven required in-game capture sets are pending.
7. Showdown data breadth exceeds engine behavior proof: 134 shipped moves are audited, 123 verified and 11 baseline.
8. The no-API Brain and Team Lab are tested foundations, not deployed end-to-end products.
9. The public Pages artifact dates to 2026-07-04 and is older than this branch.
10. PR bundle-freshness filtering does not yet derive from the builder's complete input list.
11. Pages and main CI still start independently on a push, so deployment is not yet sequenced behind successful CI for the exact commit.
12. Cache-bump enforcement and `release.sh` do not yet share `release_manifest.js` as the only effective cache-identity source.
13. August 30 update: battle coverage still has six partial families and two explicit gaps. The case matrix now has 15 partial and 10 open cases out of 40. Replacement Intimidate and Scrappy/Mind's Eye execution defects are fixed locally, but bring-four/export consistency, Hospitality, Thousand Arrows, broader residual/entry ordering, PP/Pressure and Regulation M-B remain gates. See `poke-sim/reports/worlds_top_cut_validation_2026-08-30.md`.

## Artifact Policy

- Retain deployed bundles, generated Showdown runtime data, current source inventory, and QA evidence required by tests.
- Keep immutable migrations even when a reusable seed duplicates their content.
- Move historical prompts/reports only with link repair; many remain referenced.
- Keep `pokemon_data_audit.csv` and `.xlsx` for now. They use about 40.7 MB but are test dependencies; replace their contract with compact fixtures before removal.
- Ignored dependencies, local artifacts, and scratch reports are reproducible local output, not release evidence.

## Product Focus

```text
official Champion evidence + Showdown baseline
-> versioned simulator truth
-> replay and deterministic scenario proof
-> evidence bundle
-> validated explanation
-> feedback
-> regression fixture
-> reviewed release
```

## Now, Next, Later

**Now:** complete Reg M-B source truth, Showdown differential traces, branch reconciliation, protected release gates, recurring workflow health, and staged/production DB proof.

**Next:** ship one validated Brain vertical slice, build a versioned Champion replay corpus, deploy trusted Team Lab mapping/promotion, split the oversized UI by ownership, and add browser/accessibility/performance gates.

**Later:** rankings, accounts, premium features, tournament packets, optional LLM analysis, broad meta ingestion, and community features.

## Next Three Tasks

1. Reconcile this branch with `origin/main`, run the complete gate, and merge through reviewed CI.
2. Protect `main`, require release checks, create the protected `production` environment, and prove that a failed gate cannot deploy.
3. Apply and read back DB migrations in test/staging first, then production with human approval; split Showdown observation and digest-bound promotion.
