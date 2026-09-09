# Worlds Top-Cut Capture And Battle Validation

Date: 2026-08-30. Local work only; not deployed or promoted to Supabase.

Scope clarification: doubles teams only for tournament intake and competitive benchmarks. The catalog explicitly declares doubles, and validation rejects missing or conflicting formats. Singles fixtures are retained solely to isolate shared mechanics; they do not prove doubles-specific interactions. The existing singles UI/engine was not removed by this team-catalog scope clarification.

## What Was Added

All 13 Masters elimination-bracket entrants at the 2026 Pokemon VGC World Championship (August 28-30) are captured as review candidates. Round 12 contains five matches and three byes, not a conventional 16-player cut. This snapshot does not declare final placements or a winner.

Sources: [official event](https://worlds.pokemon.com/en-gb/), [Round 12 bracket](https://standings.limitlessvgc.com/0036/pairings?round=12), [RK9 registered team lists](https://rk9.gg/roster/WCS02wAQpCIaqFmXxER4). Limitless is a secondary standings source; RK9 provides the submitted open sheets.

Entrants: Navjit Joshi, Hiroshi Onishi, Carson St Denis, Joao Felipe Leite, Giovanni Piscitelli, Shohei Kimura, Stefano Greppi, Cary D'Ortona, Emilio Forbes, Yuya Wakasugi, Antonio Sanchez, Takuma Yamazaki, Zachary Weed. Source spellings are retained in the JSON/UI.

- `source/worlds-2026-masters-top-cut.json`: 13 teams, 78 registered Pokemon, source URLs, UTC retrieval timestamps, SHA-256 source digests, persistent team/member IDs, published species/forms, items, abilities, moves, and stat alignments.
- `generated/tournament_catalog.js`: generated review-only browser data. Overview lists all teams with expandable sheets and direct RK9 links.
- `competitive_benchmark_manifest.json`: separates tournament candidates, permanent golden regressions, and mechanics edge cases. New teams never replace historical fixtures.
- Capture rejects missing/ambiguous player matches, changed bracket cardinality, and malformed sheets before writing the catalog. The browser generator rejects invented stats, identity collisions, unreviewed placements and promotion.

## What Is Not Proven

The sheets do not publish stat-point allocations. Those fields and exact battle stats remain null. The event's complete ruleset needs official review and mapping to an approved runtime ruleset. Open-sheet authenticity does not establish complete simulator support.

These are NOT new runnable entries in `TEAMS`, approved database rows, exact replicas of private player builds, or evidence that the simulator is tournament-accurate. No database schema, secrets, source approvals, or production deployment were changed.

Before promotion: obtain verified spreads, review ruleset and all species/form/item/ability/move mappings, pass shared import/identity/legality gates, explicitly select four participants, then run seeded side-swapped tests and targeted mechanics assertions. Hypothetical spreads, if added later, must be separately labeled synthetic builds and never attributed to the original player.

## Battle Fixes

1. **Simultaneous replacement Intimidate:** previously the player replacement's entry ability ran against the opponent's fainted slot. The opponent replacement then intimidated the player. Both fields now populate first, followed by entry effects ordered by cached effective Speed and seeded tie shuffling. The 100-seed mutual-Intimidate regression fails before and passes after the fix. Broader entry-order parity remains partial.
2. **Scrappy/Mind's Eye execution:** the new raw type-immunity precheck bypassed existing Ghost-immunity exceptions in damage calculation. It now preserves those exceptions and uses activated defensive Tera typing. Executed Tackle, Close Combat and Hyper Voice fixtures fail before and pass after the fix.

Independent read-only investigation reproduced the old Kevin Meta Sun mirror at 413 wins / 570 losses / 17 draws over 1,000 SHA-256-derived seeds. Reversing replacement calls reversed the advantage; delaying hooks until both fields were populated produced 497 / 494 / 9 in that experimental version. This identifies a causal bug, not universal competitive parity. Seed family: `independent-kevin-audit-v1|i`, i=0..999, first four SHA-256 little-endian uint32 words.

The independent post-fix review ran the same 1,000-seed family: 483 wins / 512 losses / 5 draws with its original loader, and 498 / 494 / 8 with generated Showdown data. Twenty sampled full-result reruns per loader matched. These mirrors intentionally retain the default participant behavior to compare the original failure; they are not claims of legal bring-four competition. All future tournament benchmarks must select four explicitly.

Golden `gb_001` changed to `85593c5b0bd592bca7b1dba55b45a31461bee5a3a6f9637e7531a013e2f823c5`. Independent in-memory reversals identified the immunity correction, not replacement scheduling, as the cause: at turn 9, log index 108, Mind's Eye Blood Moon now hits Dragapult for 187 calculated / 54 applied damage and KOs it, bringing in Rotom-Wash. The player still wins, now in 11 turns rather than 10. The other two golden traces are unchanged. Expected hash was refreshed only after this semantic review.

## Next Work

Historical action list from the initial capture run. Superseded later on August 30 by [accuracy validation](accuracy_validation_2026-08-30.md) and [competitive player review](competitive_player_review_2026-08-30.md). Opponent Hospitality and named Thousand Arrows boundaries below have since been fixed locally, not deployed. The 40-case count below describes this earlier run; the current matrix has 41 cases (16 covered, 17 partial, 8 open).

- Fix default bring-four/export inconsistency: without explicit selection, the engine can use six while the log reports four.
- Fix opponent-side Hospitality, currently player-only.
- Cover imported Thousand Arrows against Flying targets and grounding; existing chart handling misses this exception.
- Validate weather clashes, reactive abilities, multi-slot replacements and residual event order against a pinned Showdown baseline, with approved Champion differences.
- Complete PP/Pressure, official Regulation M-B evidence, broader mirror/side-swapped tests and production release gates.

The matrix now has 40 cases: 15 covered, 15 partial, 10 open. More discovered cases make the checklist longer; they do not mean older proof disappeared.

## Reproduce

From `poke-sim/`:

```sh
npm ci
npm run tournament:capture
node tests/tournament_catalog_tests.mjs
node tests/battle_edge_case_behavior_tests.js
npm run test:fast
npm run test:battle-audit -- --report battle-audit-report.json
python tools/build-bundle.py
```

`tournament:capture` makes public read requests and updates review artifacts only. It is intentionally manual: review the diff before committing. Offline builds use `npm run tournament:build` from the committed source snapshot; they do not fetch or auto-promote fresh teams.

The in-app browser rejected the local file URL; no visual preview validation or deployed-site readback is claimed. Rendered catalog structure and escaped source text are covered by offline tests.

## Completion Evidence

- Fast gate: 130 files, zero failures. Focused tests were rerun after final catalog, matrix, and documentation edits.
- Battle audit: all declared test files passed; 4,500 seeded battles completed; three golden traces passed. Universal-accuracy flag remains false. Local machine-readable output: `battle-audit-report.json`.
- Battle edge-case suite: 11 checks passed, including 100 simultaneous-replacement seeds, Scrappy/Mind's Eye execution, ordinary Ghost immunity, and side-swapped weather ordering with/without Trick Room.
- DB golden contract: 8/8 passed. This is not a live database readback.
- Tournament catalog: 13 teams / 78 stable member IDs; malformed-source, invented-stat, duplicate-ID, accidental-promotion, generated-drift, and UI-escaping checks passed. Source-page service-worker cache includes the generated catalog.
- Overview: 11/11 checks passed. Release manifest: 5/5 passed. `git diff --check` found no whitespace errors.
- Local bundle SHA-256 after doubles-only catalog clarification: `399b0ab9c83d76457c63444f27eb6a4ab7cf97602f698ce7d10cba96aa0102b1`. Catalog tests passed again, including rejection of singles and missing formats; no battle mechanics changed in this clarification.
- No GitHub issues were closed, no merge/deployment was performed, and no Supabase rows were written. Review/merge, production migration, approved source promotion and deployed UI validation remain separate gates.
