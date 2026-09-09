# OODA Company Findings: v149 Candidate

Date: 2026-09-08 UTC. Primary owner: parent engineering agent. Independent read-only reviews: battle/evidence boundaries and security bypass/compatibility. This is scoped remediation of the [independent company audit](INDEPENDENT_COMPANY_AUDIT_2026-09-08.md), not competitive certification.

## Disposition

| Finding | Candidate disposition | Remaining gate |
|---|---|---|
| AUD-1901 residual ordering | Leftovers now resolves before status damage. Expanded probes exposed Toxic rounding after multiplication; it now rounds the base tick first, matching the pinned reference. | Eight synthetic doubles probes, side-swapped, through ticks 1/2/3/5. Lethal boundaries, Heal Block expiry, other recovery order, global residual queue and official Champions proof remain partial. |
| AUD-1902 wrong-team evidence | Automatic UI plan synthesis is disabled. Supplied plans are `unverified_plan`, low confidence and reference-only. Public feedback builder cannot enable model updates even with forged `matched` status. | A verified two-team/version/format/ruleset resolver is not implemented. This is containment, not completion of automatic matching. |
| AUD-1903 unsupported causality | Tailwind and adjacent setup/Protect payoff inferences become timeline-only observations, with no conversion points. Observations do not enter scored coaching tags or critical-mistake cards. | Other coaching and aggregate IQ calibration remain unproven; this does not certify the entire coach. |
| AUD-1904 shared writes | Separate permissions-only migration and isolated PostgreSQL test runner prepared; stale bootstrap write policies removed. | Not applied to Supabase. Authorized staging, actual ACL/RLS readback, real two-user tests, trusted upsert/delete and live indirect paths remain blocked. Private-schema policy review remains separate. |
| AUD-1905 watchers | News PR discovery separates `gh api --slurp` from `jq`; incompatible flag regression added. Read-only GitHub discovery succeeds locally. | Hosted scheduled run and fresh feed still need verification. Inaccessible regulation sources remain open; fail-closed behavior preserved. |

## Observe, Orient, Decide, Act

The first four regression groups failed before the runtime/workflow edits. Expanding the residual test from one turn exposed a second shared bug: Toxic damage used `floor(maxHP * tick / 16)` rather than `floor(maxHP / 16) * tick`. The pinned Showdown source and post-turn HP support the correction. A six-turn attempt was rejected by the prototype's five-turn limit; it is not counted as a successful battle.

Independent review found a direct feedback-builder bypass and a sibling setup/Protect credit path. Both are contained and have regressions. Manual browser review then showed neutral observations being treated as fatal mistakes downstream; they now stay outside the scored issue list. Existing tests that demanded the unsupported claims were updated to assert the safer contract, not silently deleted.

Security containment is intentionally separate from data cleanup constraints. Isolated validation uses PGlite 0.5.8 installed outside the repository, not an application dependency or new production backend. The migration preserves existing reads and does not invent private-save ownership. It aborts on missing tables or inherited write grants rather than reporting a partial success.

## Verification

- `node --test tests/company_audit_regressions.mjs`: six groups pass; eight reference probes, both formats/sides for replay boundaries, forged status and neutral-observation checks.
- `node --test tests/t188_battle_sensei_parser_tests.js tests/t190_battle_sensei_summary_timeline_tests.js tests/t192_battle_sensei_learning_tests.js`: related parser, UI-structure and learning contracts pass.
- `node poke-sim/tools/test-shared-write-containment.mjs <isolated-pglite-install>`: migration applies twice; 60 anonymous/authenticated mutation attempts denied; public reads preserved; six service-role inserts succeed; re-granted DML remains blocked by restrictive RLS. Missing tables and inherited grants abort with rollback verified. These are synthetic PostgreSQL fixtures, not live Supabase or two real users.
- `npm run test:battle-audit`: passes declared scope, including three golden battles and a 15x15 matrix with 20 runs per cell (4,500 runs). The legacy matrix is invariant/regression evidence, not browser equivalence or official regulation approval.
- Full `npm test`: 160 fast files and 12 offline/mock DB files pass; four manual/helper skips and three administrative security checks remain explicitly unverified. Offline/mock DB checks do not become live security passes.
- Manual local browser: pasted poison-only replay in doubles/p1 and singles/p2. Visible output has neutral timeline wording, no false conversion praise, no fatal-mistake card from that observation, `needs_sim_data`, and all three model-update flags false. No new interactive simulator batch, private save or exported-battle parity claim is made.

The initial full run caught stale build fallbacks and the coverage-summary fixture. All version fallbacks were updated. The status family is explicitly downgraded to partial, with bounded residual evidence recorded in the case matrix. No percentage measures game accuracy.

## Release And Next Action

Candidate build: `v2.2.149-audit-trust-boundaries`; engine `1.1.7`. Bundle: 11,479,539 bytes; SHA-256 `deb1718992777000de716f8d54ca6748584f26fb9fbd371d913ed77d3a4bea9e`.

Public v142 is not updated by local rebuilds or a candidate push. No merge, production migration or Alfredo alignment is authorized by these test results. Keep the candidate under PR review.

Next: identify authorized staging and verify containment against its actual schema. Separately build verified replay/result identity, extend residual ordering, repair regulation-source access, and complete the broader coaching-confidence audit. Hosted checks and exact deployed-artifact verification remain required before release.
