# Showdown Reference Validation

Date: 2026-08-30. Decision: keep developing the isolated reference adapter; do not promote it to the browser or claim competitive accuracy yet.

## Plain-English Result

We gave our simulator and Showdown the same Pokemon stats and move instructions. The checker found real disagreements even though the project's existing tests pass. More battles with the same incorrect rules would only produce more incorrect evidence.

This is a working diagnostic prototype, not a replacement engine. The three mechanics findings below are OPEN, not fixed. No source rows, production database, deployment, public ladder or browser engine changed in this slice.

## Reproduce

From `poke-sim`:

```sh
npm ci --ignore-scripts --omit=optional
node tests/showdown_reference_tests.mjs
npm run showdown:reference
```

The reference command intentionally exits 1 while mechanics disagreements or unsupported probes exist. Contract tests passing means the checker works, not that the simulator matches Showdown. The command does not yet gate the existing CI workflow automatically.

The initial experiment installed exact dev dependency `pokemon-showdown@0.11.11` with install scripts disabled and optional packages omitted. The lockfile retains package integrity. Existing CI install commands need a separate dependency/install-policy review before merging this dependency; do not assume they use the isolated command above.

## Evidence

Canonical run: `artifacts/showdown-reference/2026-08-30T21-42-55-349Z/report.json`. Raw files are local ignored artifacts; the committed runner and fixtures reproduce them. Each subsequent run gets its own timestamped directory.

- Local engine: `1.1.1`; no engine or browser-source edits in this slice.
- Reference format: `gen9championsdoublescustomgame`, mod `champions`, synthetic mechanics only.
- Seed: `[123,456,789,42]`. Independent RNG streams mean this does not align damage rolls or critical hits across engines.
- Final adapter SHA-256: `4fa4f2baf4cc869e6b41cc1b809ad0958b24e3c7df25e7d0b4d4da3d2907b849`.
- Report contains engine-source hashes, fixture hash, package integrity and selected reference-module hashes. These are provenance, not a complete installed-tree security attestation.
- Per-probe JSON retains original fixture, canonical input, reference protocol, local turn logs and comparisons.

| Counter | Final Run |
| --- | ---: |
| Requested bounded probes | 5 |
| Completed bounded probes | 5 |
| Compared turn pairs | 6 |
| Agreement in declared comparisons | 2 |
| Probes with disagreements | 3 |
| Unsupported probes | 0 |
| Completed reference games | 0 |

These are neither win-rate samples nor a game-accuracy percentage. Development reruns and contract/reviewer checks are not additional independent benchmark games.

## Findings

| Finding | Evidence | State |
| --- | --- | --- |
| ORDER-TAILWIND-SAME-TURN | After Tailwind, Blastoise's Speed increases from 130 to 260 and should overtake Arcanine at 147. Showdown reorders; local retains Arcanine first. | Open |
| DAMAGE-SEISMIC-TOSS-LEVEL | Level-50 Machamp targets unprotected Arcanine. Reference HP 197 to 147; local HP stays 197. | Open |
| MOVE-GROWL-LEER-STAGES | Reference lowers Attack/Defense of the unprotected targets; local reports no effect and keeps stages zero. | Open |
| Default-team legality disagreement | Pinned M-A and M-B validators reject the default Incineroar's U-turn. This is a source disagreement to investigate, not authorization to replace a move. | Open |

The independent battle reviewer reproduced Tailwind and Seismic Toss differences across three seeds and both side assignments, with matching initial stats. Local order is sorted once in `engine.js`; fixed damage reaches the zero-base-power path. This establishes the named differences against the pinned reference, not official Champions parity for every interaction.

Protect and the named Trick Room/priority probe agree in their declared comparisons. The Earthquake probe agrees on which Pokemon lose HP, including an unharmed Flying ally; it fails on the separate Growl/Leer stage effects. It does not prove spread damage magnitude, the 0.75 multiplier or independent accuracy rolls.

## Team Intake

The runner checks 34 bundled teams against each pinned M-A and M-B validator: 68 intake attempts. For EACH format, 1 is rejected and 33 are unsupported. Correction from subsequent intake review: the first reported adapter failures are 21 missing explicit levels, 11 unsupported member-field failures and 1 missing Champions stat-point format; they were previously incorrectly described as all missing-level failures. The checks stop at the first error. No bundled team receives an accepted result in this strict raw-input run. Missing level is an adapter limitation, not an illegality verdict. Missing levels are not silently filled. See the [subsequent intake diagnosis](showdown_intake_diagnosis_2026-08-30.md); original raw artifacts and counters are unchanged.

The adapter validates known species, items, abilities, nature, moves and exactly one SP source. Accepted `evs`/`sps`/`spread` inputs are canonicalized identically for both engines; legacy 252-EV spreads reject. Original input is retained. Unsupported initial HP, status, form/weight overrides, gender and other unimplemented fields reject.

Reference nicknames encode side and registered slot. This is not a demonstrated Supabase member-ID bridge. Comparison currently requires four members per side and globally unique species names because local resolved events still include name-based text. Arbitrary six-member selection, mirror matches and replacements need additional mapping work.

## Checker Verification

- Focused contracts: 16/16 pass, including injected bad HP/stages, empty/duplicate/missing roster evidence, alias equivalence, unknown state and speed ties.
- Full project gate: 138 fast files and 12 offline/mock DB files pass. Live DB checks remain skipped; no live DB claim.
- Audit manifest contract passes. Inventory now explicitly tracks 44 cases: 17 covered, 17 partial, 10 open. Turn-order family is downgraded to partial: 6 regression-covered, 7 partial, 2 gap families.
- Independent battle review accepted the fixes, including 20 malformed-snapshot rejection checks. Independent mapping/trust review accepted 23 retained-evidence/mapping checks. Neither acceptance establishes production readiness.
- Boundary speed ties are conservatively unsupported, including ties across different priorities. Transient mid-action ties remain unproved. Exact cross-engine random order is not a valid oracle.
- These are headless probes. No site simulations were operated in this slice, so there are no new downloaded-versus-visible replay pairs. Earlier CPA-13/14 visible replay defects remain open.

## Dependency Gate

`npm audit --omit=optional` reports one advisory chain across three moderate affected package nodes: `pokemon-showdown -> sockjs -> uuid`. [Advisory GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) concerns uuid buffer bounds checks. No automatic downgrade, override or force fix was applied. No Showdown web server was started.

`npm audit --omit=dev --omit=optional` reports zero vulnerabilities in that filtered scan. This does not prove the development dependency safe or demonstrate exploit reachability. Resolve/review the dependency and install policy before service/browser adoption or merge; the package's suggested downgrade is not an acceptable unreviewed fix.

## Next Milestones

1. Investigate the U-turn source disagreement and define reviewed level/form/identity normalization, with rejected and unsupported inputs still distinct.
2. Close the three reference failures through explicit mechanics tasks or a reviewed engine-adapter integration. Each needs retained failing-before/passing-after reference evidence and broader boundary cases; do not silently patch team data.
3. Extend the adapter to selected-four IDs, mirror matches, switching, forced replacements and completed games. Translate raw events into our existing evidence contract without dropping actor, target, item, PP or field state.
4. Resolve dependency/install-policy blockers and benchmark local-worker versus service execution, privacy, cancellation and resource limits before selecting deployment architecture.
5. Add varied player policies only after referee behavior is trusted. Track requested, started, completed, failed, duplicate-seed and truncated games separately; label win rates by policy and matchup.
6. Compare rendered replays with exported evidence for every interactive batch/team change. Obtain official M-B and controlled in-game edge-case evidence before making Champions-specific accuracy claims.

Sources: [Showdown simulator API](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md), [Champions module](https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions). Mutable source links explain the interface; the pinned package and retained hashes identify this experiment.
