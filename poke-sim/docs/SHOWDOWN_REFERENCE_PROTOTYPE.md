# Showdown Reference Prototype

Decision date: 2026-08-30. Status: development-only experiment, not runtime promotion.

The user approved evaluating Showdown's actual battle engine alongside our custom simulator. Pin `pokemon-showdown` 0.11.11 as a development dependency and retain npm integrity in the lockfile. Do not start its web server, send test traffic to the public ladder, replace the browser engine, deploy, or write simulation results to production storage.

First milestone: a small deterministic doubles comparison harness with explicit format selection, team/stat translation, scripted actions, raw evidence, source/package hashes, and separate agreement/mismatch/unsupported outcomes. Validate teams with Showdown before running a rated-format reference. Synthetic custom-game fixtures must be labeled mechanics probes, not legal tournament teams.

Equal numeric seeds do not imply equal random choices across different engines. Compare deterministic mechanics boundaries and stat identities first; do not claim exact random damage or winner parity from a shared seed alone. Keep reference execution and our heuristic decision policy separate. Bounded turn probes are not completed games or competitive win-rate samples.

Champions-specific legality and mechanics still require official/approved evidence. Showdown provides a reference, not automatic approval of our current M-B source package. Preserve unknown inputs and fail closed rather than silently convert formats, stat-point units, species, moves, abilities or items.

The installed package contains broader server dependencies. This experiment imports only simulator APIs, disables install scripts for the initial evaluation and does not install optional native dependencies. A future browser or service integration needs its own dependency, privacy and resource-limit review.

Sources: [Showdown simulator API](https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md), [Champions mechanics module](https://github.com/smogon/pokemon-showdown/tree/master/data/mods/champions). Runtime proof must name the pinned installed package, not mutable master.

## Prototype Outcome

Implemented `tools/showdown-reference.mjs`, `tools/run-showdown-reference.mjs` and scripted fixtures. Run `npm run showdown:reference`; mismatches/unsupported probes return nonzero. The [validation report](../reports/showdown_reference_validation_2026-08-30.md) records two bounded agreements and three mismatches, strict catalog intake limitations, independent review and the dependency advisory. No completed-game or UI-parity proof exists in this slice.

Next decision is an explicit engine-adapter integration investigation, not an automatic runtime swap. The custom engine remains active. Raw team input is retained and supported stat aliases are canonicalized identically; unsupported state rejects. Current comparison excludes mirror names, arbitrary bring selection, switching and tied boundary speeds. Existing production and CI installation policies must be reviewed before adopting the new package beyond this isolated experiment.
