# Champions Runtime Move Pool Alignment

Status: confirmed open baseline disagreements, not a runtime fix or regulation sign-off.
Runtime inspected: v2.2.159-team-review-clarity, engine 1.1.10.

Follow-up: [v160 shared-context fix and evidence](champions_move_context_validation_2026-09-08.md)
addresses these historical observations. The original census below is retained,
not presented as the current candidate's result.

## Observation

The generic Showdown mirror contains historical learn-method rows. The runtime
move helper treats any such entry as a match and uses a small list of explicit
form supplements. It does not select the pinned Champions inherited move pool.
Its options argument currently does not change the outcome. Correct species
stats and identities therefore did not imply correct move acceptance.

`node tools/audit-champions-move-pools.mjs` examines all 235 mapped official
identity candidates through the actual runtime helper against pinned Showdown
0.11.11 `Dex.mod('champions').species.getMovePool`. It retains full inheritance
chains and compares both acceptance directions and selector/checker agreement.
The older direct-row diagnostic remains separate and unchanged.

## Reproduced Evidence

Artifact `artifacts/move-pools-IHp916/report.json` records 234 pool disagreements
and one agreement (Ditto), 858 reference-pool moves rejected by the helper and
6,204 accepted outside the reference pool. There are zero list/checker conflicts.
These are discrepancy candidates, NOT 7,062 independently proven invalid teams
or an accuracy percentage. Global exclusions and set/regulation gates differ.

The following single-move full sets were independently reviewed and reproduced
with the pinned M-B TeamValidator. Unrelated fields are fixed: slot-0 ability,
no item, Hardy, level 50 and zero stat points. Inputs and exact errors are in the
artifact; the following directions agree with both reviewers:

| Species | Move | Runtime helper | Pinned set validator |
| --- | --- | --- | --- |
| Incineroar | U-turn | Accepts | Rejects |
| Gholdengo | Thunder Wave | Accepts | Rejects |
| Archaludon | Body Press | Accepts | Rejects |
| Kingambit | Sucker Punch | Rejects | Accepts |
| Blastoise | Water Spout | Rejects | Accepts |
| Vivillon-Fancy | Rage Powder | Rejects | Accepts |
| Floette-Eternal | Baton Pass | Rejects | Accepts |
| Rotom-Wash | Thunderbolt | Accepts | Accepts |

Fancy Vivillon inherits via Vivillon; Rotom-Wash includes Rotom; Eternal Floette's
pinned traversal includes Flabebe. No assumption that every form strips to its
base, or that every pre-evolution is included, is safe. Use the reference API.

## Tests And Limits

Five harness tests cover full-form traversal, both mismatch directions,
list/checker disagreement, missing inventory/API/verdict/species and eight pinned
set-probe outcomes and hidden acceptance outside both lists. The audit checks all
954 pinned move IDs, plus listed/reference IDs, not merely the list union.
The audit exits 1 while discrepancies remain; a passing
harness test does not mean runtime alignment. Full project gate passes 173 fast
files and 12 offline/mock DB files, four manual/helper skips; live administrative
checks remain explicitly unverified. Independent review confirms both harness
fixes, all source hashes, the installed distribution manifest and move universe.
The report fingerprints its own code, the reference adapter, runtime source,
mirror, mapping and all 1,007 installed reference distribution files, preserving
the exact-byte manifest. The independent reviewer found and helped close the
original limited-universe and incomplete-dependency-fingerprint gaps before
reliance on this diagnostic. No network, DB or regulation writes.

The independent reviewer also tested 3,466 deterministic, alphabetically grouped
sets of up to four mutually accepted moves without reproducing a combination-only
failure. That is reviewer-reported bounded exploration, not exhaustive combination
proof and not part of the persisted parent audit artifact.

## Decide And Act Next

1. Generate a reproducible, pinned Champions pool artifact with inherited source
   provenance; keep generic historical/SV data distinctly scoped.
2. Route the shared move validation/listing consumers through an explicit format
   context, including imported teams, editor, selected rules and replay advice.
3. Make missing/unknown source contexts unverified instead of borrowing another
   format's acceptance. Keep official regulation promotion gated separately.
4. Convert these seven disagreements into runtime parity regressions, run broader
   consumer and complete-set checks, and inspect paired browser/export results.
5. Document DB mirror integration, official confirmation and combination gaps.

No legal roster or move set is approved by this report. No current team is
silently rewritten, no source rows replaced, and no official-game accuracy claim.
