# Agent Execution Of Josh's Replay QA Assignment

Reviewer: Codex, acting on the user's request to execute Josh's checklist. This is not a review authored or approved by Josh.
Candidate: commit 6ca27a2, v2.2.146-strategy-identity, engine 1.1.6.
Local browser: port 8770. Assignment: TheYfactora12/Pokemon-Champions-Sim-Planner#190.
Verdict: FAIL; retain release hold.

## Actual Input And Procedure

The manifest's original Mac HTML files were unavailable in the inspected Windows Downloads/work locations. Queried the public Showdown replay search and recovered the same players/date reference from Josh's named assignment:
https://replay.pokemonshowdown.com/gen9championsvgc2026regmb-2638363717

1. Opened the local v146 Review tab.
2. Used Load Replay URL with that reference: browser displayed Failed to fetch. The public .log endpoint was reachable through a separate HTTP request. Root cause still needs browser network/CSP/CORS diagnosis.
3. Pasted the battle protocol from that public log, omitting chat, timestamps, blank protocol separators, timer messages and rating changes. This is an explicitly reduced protocol input, not a byte-identical HTML upload.
4. Analyzed Player 1, Quick Review; compared visible results against the original five-turn protocol.
5. Exported the top Tactical QA payload through the UI and read the downloaded JSON.
6. Replaced input with non-battle prose and analyzed again; verified prior result/actions were invalidated.

## Passed Checks

- Pasted protocol analyzed as five turns, correct players, Player 1 loss, correct leads and player selected four.
- Both registered six-member previews were present. Opponent only revealed three selected members; no fourth opponent was invented.
- Visible cards retained Stamina, White Herb, sleep action denial, KOs and damage thresholds.
- The page explicitly says Champions legality was not validated and alternatives are not exhaustive.
- Tactical QA download succeeded with top-level needs_more_data and an explicit reference-evidence boundary.
- Non-battle input removed the prior review and disabled private save/export.

## Failures To Fix

1. **P1: Scenario identity/provenance is misleading.** The exported payload sets engine_version and ruleset_version to v2.2.146-strategy-identity, although the engine is 1.1.6 and the replay's ruleset has not been mapped. team_mapping.status is mapped despite two partial_match records with only 3/6 species. Nested regulation_id contains a list of clauses and nested legality_status is legal. Top-level needs_more_data does not repair contradictory identity fields. Require verified exact mappings or explicit unresolved candidate matches; never fabricate engine/ruleset versions.
2. **P1: Forced replacement becomes a coaching mistake.** Turn 2's Basculegion replacement follows Archaludon's faint; turn 4's Kingambit replacement follows faints. The UI labels both Switch Tempo Loss, recommending that forced replacements earn tempo. Separate voluntary switches from replacements and the inter-turn phase.
3. **P1: Weather upkeep becomes fresh opponent progress.** Snow begins on turn 1. Upkeep rows on turns 2-4 trigger Field Control Failure as if the opponent just gained control. Preserve upkeep/start/end and source side; never treat continued weather as new setup.
4. **P2: Wrong move in miss explanation.** Hurricane's |-miss| actor/target row produces trying to use p2b: Sneasler. Join the miss to its preceding move event; the target field is not a move name.
5. **P2: Damage context crosses actions.** Pelipper at 53% after Dire Claw is labeled resisted using later Heat Wave resistance evidence. Associate effectiveness to the exact action and target, not any matching Pokemon within the turn.
6. **P2: Effect taxonomy mislabels Protect.** Protect activations appear under ability/item impact with Item timing explanations. Preserve move-effect versus item/ability types.
7. **P2: URL ingestion fails with an unhelpful message.** Failed to fetch gives no actionable upload fallback or diagnostic category despite a reachable source.

Source inspection supports findings 2-4 in replay_coach.js: switch_tempo_loss at approximately line 2056 uses userSwitches without forced-replacement classification; field parsing at 948 drops upkeep details; RNG parsing at 955 places protocol field 3 in value. These are root-cause leads, not implemented fixes.

## Export Evidence

Local downloaded file: C:/Users/The Rig/Downloads/champions-replay-scenario-tactical-qa-01-2026-09-08T01-34-48.json.
Keep raw replay/export local; this report records sanitized findings. No private save, DB write, ranking promotion or simulation execution occurred.

## Unfinished Checklist Items

- Actual saved HTML file upload and original-file hash comparison.
- Exact source_tier showdown_reference contract for the complete generic QA artifact; the inspected download was a Tactical scenario payload.
- Full turn-by-turn screenshot audit, both perspective selections and singles replay.
- Paired visible/export logs for new simulator battles: zero games generated in this pass.
- Mega, Tailwind, Trick Room and residual-damage cases: absent from this specific battle, so untested here.
- Live database and actual Champions client confirmation.

Next OODA cycle: minimize the exported identity failure and forced-replacement/weather false positives into regressions, fix their shared event/provenance paths, then rerun this exact replay before expanding the QA batch. Keep issue #190 open.
