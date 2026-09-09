# Download, Ingest And Compare Every Interactive Run

Required for agent-operated simulations, team swaps, imports, set edits and lead changes. This is an execution-time QA workflow, not an unattended monitor of the user's browser. It does not upload private logs or promote feedback to trusted coaching/database rows.

## Per Change And Run

Local repeatable browser check: `node tools/audit-browser-replay.mjs` uses
Playwright supplied by the test environment (not an application dependency).
It runs two Bo1 games, downloads both, revisits the first after swapping teams,
and checks paired evidence plus light/dark desktop/mobile replay layouts.
It refuses remote target URLs and blocks non-read network requests. Artifacts
remain in the ignored `artifacts/browser-replay-*` directory. Screenshot review
is still required; calculated contrast is diagnostic, not accessibility certification.

1. Record URL, visible build, selected teams, format, Bo mode, bring/lead choices and the change made. After changing teams, inspect whether old results remain and whether their labels still identify the original matchup.
2. Reopen a retained old replay after the change and compare it with its original download. Historical evidence must not inherit the newly selected team's identity, items or moves.
3. Use a small interactive batch so every retained game can be checked. Download each replay through its own **Download JSON** button. Open exactly one card at a time, capture that visible card, and pair the two immediately; never pair by species names or newest-file guess alone.
4. Capture via `tools/capture-visible-replay.mjs`, passing `captureVisibleReplay` to the supported browser's DOM-only evaluate method. The helper reads visible markup only, not app globals, storage or internal simulation objects. Keep the full DOM capture and raw download as matching `<case>.visual.json` and `<case>.log.json` files in an ignored `artifacts/` directory.
5. Retain `capture-inventory.json` with schema `champions-visual-inventory-v1`, `expected_game_count` from the visible completed-run count, and `cases`: one `{id, kind, seed}` for each pair. `id` is its filename stem, `kind` is `simulation` or `continuity`, and `seed` is bound immediately at the download action. Record batch team selections separately in the inventory. Continuity revisits do not increase the game count. Missing/unexpected/unpaired files, duplicate case IDs or seed mismatches fail ingestion. Then compare:

```powershell
node tools/compare-visible-replay.mjs artifacts/visual-audit-YYYY-MM-DD
```

6. Inspect screenshots at starting state, a replacement/faint and a field-effect turn. DOM parity is not a pixel/layout check. Keep screenshots locally where needed.
7. Report number of simulated games, retained/downloaded games, paired comparisons, turns checked, mismatches and uninspected remainder. A failed comparison remains a finding, not a successful simulation claim. Stop widening test volume when a systematic display mismatch already needs diagnosis.
8. Convert confirmed patterns into minimized regressions. Re-run the same paired comparison after a fix. Never delete contradictory evidence or let feedback automatically rewrite mechanics.

## Comparator Contract

- Checks the exact renderer/exporter build separately from execution build, replay opponent/result, turn and board sequence, selected participant membership, per-side name/status/HP/item/ability/move agreement, damage display and field durations. Historical execution under a newer exporter is valid when labeled accurately; a build ID substring is not a match.
- Compares resolved move prefixes/order from exported engine events with visible play-by-play independently of the UI formatter. Missing non-damaging moves count as discrepancies, not acceptable silence under a complete-order label.
- Keeps originals unchanged and writes `comparison-report.json` with source SHA-256 hashes, locations, expected/actual values and explicit limits. Exit 0 means matching observable fields; 1 means mismatches; 2 means ingestion failure. None means real-game accuracy or production approval.
- CSS capitalization is normalized only for labels/status/field tags. Mirror species are compared per side; same-name ambiguity within a side is rejected. Hidden stable IDs, exact stats, every effect tooltip, repeated same-name action multiplicity and coaching correctness remain separate proof gaps.
- Default replay retention is bounded. Large engine matrices retain machine logs but do not have a human-visible page per battle. Declare that scope rather than claiming every stress-test battle was visually compared.

## Persistent Team Direction

Keep the original result and roster identity attached after a team swap. Unbrought members cannot enter the same game, but a new game in a series may deliberately choose another legal four. Consumed/transferred items can change battle state; they must not mutate the registered input or silently jump to another member.

Tests: `node tests/visible_replay_comparison_tests.mjs`. This workflow is enforced as an agent operating instruction in root `AGENTS.md`; it is not a background app feature or a GitHub/production deployment.
