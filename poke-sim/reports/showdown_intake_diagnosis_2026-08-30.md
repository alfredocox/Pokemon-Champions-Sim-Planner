# Showdown Intake Diagnosis

Scope: development-only pinned `pokemon-showdown@0.11.11` reference, not official Champions approval. Primary owner: Replay/Evidence Engineer; independent source/mapping reviewer. No team data, mechanics, source rows or database changes.

## Findings

The strict catalog has 34 teams. Per pinned M-A and M-B format, the first reported outcomes are:

| First outcome | Teams |
|---|---:|
| Missing explicit level | 21 |
| Unsupported member fields | 11 |
| Missing Champions stat-point format | 1 |
| Reference rejects Incineroar U-turn | 1 |

The prior report's explanation that all 33 unsupported inputs lacked levels was inaccurate. Checks are sequential, so these are first-error counts, not mutually exclusive root causes. Across the catalog, 32 teams / 192 members omit levels; some fail the field whitelist first. `custom_1776995210260` has levels but lacks explicit Champions stat-point format.

The default Incineroar maps without a species or move-name change. Its local approved-DB generated learnset contains general Gen 9 U-turn and Knock Off entries but lacks Parting Shot. The pinned Champions learnset omits U-turn and Knock Off and includes Parting Shot. The Champions dex disables pre-evolution learnset inheritance. Both pinned rated validators independently reject U-turn and Knock Off; checking only the first error hides the second discrepancy. This does not authorize replacing team moves or approving the pinned learnset as official Champions legality.

Relevant paths: `tools/showdown-reference.mjs` (`mapTeam`, `validateReferenceTeam`, `runReferenceProbe`), `move_legality.js`, `generated/pokemon_showdown_legal_data.js`, and installed `pokemon-showdown/dist/data/mods/champions/learnsets.js`. Executed Champions learnset SHA-256: `b7c4f4e57eb081f17bcf9d692ee564fa4e1285f4bf6357eee091c87696a82793`.

## First Fix

`runReferenceProbe` previously converted every nonaccepted side into top-level `rejected`, including adapter failures. It now preserves `unsupported_input` whenever a side is unsupported, retains both side-specific validations, and reports zero completed games. A completed reference rejection remains `rejected` when both sides were mapped. Mixed outcomes remain visible through `validations`; they are not reduced to an official legality verdict.

Focused suite: 18/18 pass. New regression failed before the patch. Tests exercise missing levels on both sides, unchanged caller input, no battle frames, each disputed move in both rated formats, and mixed rejection/unsupported outcomes. No mapping acceptance or battle execution was relaxed.

Independent review caught that the initial rejection test reused four-member synthetic teams, making both sides reject. The strengthened regression starts from a six-member reference-accepted test-only control, introduces one disputed move on one side, asserts the other side remains accepted, and repeats with sides reversed. The 18-check suite passed again after this fixture improvement. Full project gate passed after the implementation patch; no runtime source changed during the final fixture strengthening.

Final bounded probe run: `artifacts/showdown-reference/2026-08-30T23-48-29-537Z/report.json`. Five completed probes, two declared-scope agreements, three mechanics mismatches, zero completed games. The command exits 1 as intended. Same-turn Tailwind, Seismic Toss and Growl/Leer remain OPEN.

## Next Implementation Contract

1. Keep strict mapping as the default. Add structured reason codes/member paths and distinguish adapter failures from exceptions during reference validation; the current catch-all still needs that split.
2. Introduce explicit, versioned, opt-in level normalization for reference investigation only, grounded in pinned Flat Rules `Adjust Level = 50`. Fill absent levels on a clone, retain original/canonical inputs and hashes, and record each normalization with its source. Do not coerce null, strings or explicit unsupported levels.
3. Separate provenance metadata such as `nature_source` and `ev_source` from battle inputs, preserving it in evidence. Do not drop unknown fields broadly: IVs and unresolved form identities need their own support contract.
4. Extend catalog evidence with structured reasons, normalization evidence and executed learnset/validator hashes. Keep unsupported, reference-rejected, reference-execution-error and official legality separate.
5. Review general-Gen-9 versus Champions-mod source selection and approved regulation deltas before changing stored learnsets. Never switch to custom-game validation or edit team moves merely to obtain a pass.

Independent level-only exploratory normalization yielded M-A 6 accepted / 15 rejected / 13 unsupported and M-B 7 / 14 / 13. These are hypothetical diagnostics, not shipped mappings or proof of legal teams. Preserve them as candidate regression expectations only after the policy is reviewed.

No live DB, deployment or visual replay parity is claimed. This slice ran no interactive battles; headless diagnostics do not replace downloaded-versus-visible replay comparisons.
