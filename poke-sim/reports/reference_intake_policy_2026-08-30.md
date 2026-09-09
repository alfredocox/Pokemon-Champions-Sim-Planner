# Explicit Reference Intake And Learnset Alignment

Local development evidence; not official Champions approval, production DB alignment or a deployed browser feature. Owner: Source/Data Engineer with independent mapping/source review.

## Implemented

- Strict intake remains the default. Missing levels have structured `missing_level` reasons, member paths and `reference_validation: not_run`.
- Explicit `champions-reference-intake-v1` accepts only pinned rated formats whose Flat Rules adjust level to 50. It fills absent levels on a clone and separates only `nature_source` / `ev_source` into retained provenance.
- Original and canonical input, their SHA-256 hashes, policy identity and each transformation are retained. Null/string/unsupported explicit levels, ambiguous SP sources, IVs, unknown fields and unreviewed form identities remain unsupported. No moves or stat-point values are changed.
- Source/setup failures and validator exceptions remain `reference_error` through probe comparison and report counters. Unsupported input and completed reference rejection remain distinct; none inflate completed games.
- Reference evidence now hashes Champions rules/learnsets and the executed validator as well as the prior simulator/package metadata.
- A read-only direct-learnset-row audit inventories both pinned formats against the generated approved-DB artifact. It reports discrepancies, not automatic corrections or legality decisions.

## Reproduce

Run from `poke-sim` with the already-pinned development dependency:

```sh
node --test tests/reference_intake_policy_tests.mjs tests/showdown_reference_tests.mjs
node tools/run-showdown-reference.mjs
node tools/run-showdown-reference.mjs --normalize-intake
node tools/audit-reference-learnsets.mjs
```

The last three commands deliberately exit 1 while disagreements/unresolved rows remain. Normalization affects catalog intake in the runner; synthetic mechanics probes remain strict. The audit writes ignored local JSON artifacts, never DB rows or generated legality data.

## Results

| Catalog policy / format | Reference accepted | Reference rejected | Unsupported |
|---|---:|---:|---:|
| Strict M-A | 0 | 1 | 33 |
| Strict M-B | 0 | 1 | 33 |
| Explicit policy M-A | 11 | 16 | 7 |
| Explicit policy M-B | 12 | 15 | 7 |

These are team-intake outcomes from 34 registered catalog teams, not battle samples or official legality. The policy handles metadata as well as omitted levels, so its counts differ from the earlier hypothetical level-only experiment.

Normalized report: `artifacts/showdown-reference/2026-08-31T00-21-54-996Z/report.json`. Five bounded mechanics probes complete, two agree in declared comparisons, three disagree, zero reference games complete. Tailwind ordering, Seismic Toss, Growl/Leer and broader full-game/visual parity remain open.

Learnset artifact: `artifacts/learnset-alignment/2026-08-31T00-17-10-127Z.json`. Each pinned format compares the same 1,517 local species rows: 995 equal direct rows, 232 review-required, 290 unresolved. This includes nonstandard/reference-only species, not a Champions-eligible inventory. Row equality does not prove legality or inherited/form-supplement equivalence; missing direct rows are unresolved, not automatically illegal.

The local artifact is labeled `approved-db`, generated June 26 with zero applied overrides. Incineroar U-turn and Knock Off remain local-only relative to the pinned Champions direct row; Parting Shot appears on the reference side. No stored learnset or team move was replaced.

## Verification And Limits

Seven intake/audit tests and 18 reference contract checks pass. Independent review found two error-classification leaks; both were fixed and retested through comparison and runner counters. The full project gate passed: 148 fast files and 12 offline/mock DB files (`artifacts/intake-policy-project-gate.txt`). Browser bundle stays v137 for the audit worktree because these tools are Node-only.

Next: review the 232 discrepant and 290 unresolved source rows, define explicit form/IV support where appropriate, and retain regulation/mod identity through the approved source pipeline. Then fix the three independently reproduced mechanics differences. Do not promote the snapshot, infer current regulations or expand coaching from these diagnostic counts.

## Publishing Boundary

The separate clean-main site candidate [PR #193](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/193) passed hosted checks on `6fe9cd1` and merged as `4f2cb179265d647706f4a1749c47d85e3e707043`. Public build v138 was verified by downloaded artifact hash and live navigation clicks. It contains only three homepage navigation/preview-copy fixes plus tests and release metadata. It does not contain this Node-only normalization work or the larger audit worktree. Publication evidence is recorded in `docs/release/SITE_NAVIGATION_PUBLISH_2026-08-30.md` and root STATUS.md; these local notes are not themselves claimed published.
