# Downloaded Versus Visible Replay Audit

Date: 2026-08-30. Local build: `v2.2.133-evidence-identity`, engine 1.1.1. Runtime bundle is unchanged by this audit. No deployment, database write or trusted evidence promotion.

## Result

Downloaded and ingested every game from two interactive doubles Bo1 batches: ten games before swapping teams and ten after, totaling 140 unique turns. Reopened one original seven-turn replay after the swap as an additional continuity check: 21 paired comparisons / 147 inspected turn instances, not 21 unique games.

Each raw JSON download is paired with a DOM capture of the same open replay card. SHA-256 hashes and expected/actual differences are retained in `artifacts/visual-audit-2026-08-30/comparison-report.json`. Raw evidence and screenshots stay local and ignored by Git.

| Check | Result for 20 unique games |
| --- | --- |
| Captured/downloaded games | 20/20 |
| Build, opponent/result, turn sequence | No mismatch found |
| Per-side roster, HP text/bar, item/ability, moves, faint/bench state | No mismatch found |
| Every snapshot actor in the exported selected set | No mismatch found |
| Displayed damage amount/target text | No mismatch found |
| Tailwind duration chips | 56 board snapshots missing expected duration |
| Resolved move summaries | 72 turns omit at least one executed move prefix; 13 more reorder the same move prefixes |

All 20 game comparisons correctly return `mismatch`, not success. The extra old-replay check repeats five Tailwind and five action-summary discrepancies, yielding 61 and 90 respectively in the full report. These are display-versus-export discrepancies, not proof that the engine executed incorrect mechanics.

## Confirmed Findings

### CPA-13 / P2: Visible Resolved Actions Are Incomplete Or Reordered

`ui.js`, `csRenderReplayPlayByPlay`, prefers grouped `damage_events` followed by selected `effect_events` whenever either produces rows. It then discards the chronological `events` text, so Protect, Tailwind, recovery and other non-damaging actions may disappear. Failures can be appended after damaging moves regardless of execution order. The visible label still says resolved action order.

Example seed `[3206717483,3272096330,3986397223,275451695]`, turn 1: exported order is Whimsicott Tailwind, Typhlosion-Hisui Eruption, Garchomp Earthquake, Whimsicott Moonblast. Visible play-by-play starts with Eruption and omits Tailwind.

Another captured turn orders Protect first in the event log but last in the rendered summary. Do not teach priority or criticize choices using this display as complete chronology.

Next fix: render an ordered event stream with stable action/event identity, attach structured damage/effects without losing non-damaging actions, and state truncation explicitly. Preserve spread/multi-hit detail and distinguish planned actions from executed events. Re-run the paired corpus after the fix. Status: **OPEN**.

### CPA-14 / P2: Tailwind Turns Missing From Field Display

`ui.js`, `csReplayFieldTags`, reads `speed_control[side].tailwind`, while exported snapshots use `tailwind_turns`. The comparator found only missing Tailwind tags among its field mismatches, not contradictory weather or screens.

Example: the same seed's turn 1 snapshot has opponent Tailwind with three turns remaining; the visible field tag list is empty.

Next fix: use the canonical snapshot field, explicitly support any required legacy alias, and test player/opponent durations, expiry and replay imports. Status: **OPEN**. This finding alone does not mean the engine omitted the speed multiplier.

## Team Change Continuity

Before: `player` versus `mega_altaria`. After: `mega_altaria` versus `player`. Input digests swapped exactly with their teams. The old replay's visible boards and action summaries remained unchanged after selection changed (ignoring asynchronous sprite load flags). Its original download was reused for this historical comparison rather than inventing new identity.

Immediately after Swap Teams, the Simulator still displayed the preceding batch's results; a DOM snapshot is retained as `after-swap-before-run.dom.txt`. Explicit stale-result context remains part of CPA-09. This audit does not close Strategy cache/coaching findings or verify imports/set edits that were not exercised here.

## Workflow And Verification

- Root `AGENTS.md` now requires this comparison after every agent-operated interactive batch/team/lead change. Follow `docs/VISUAL_REPLAY_AUDIT_WORKFLOW.md`.
- `tools/capture-visible-replay.mjs` reads visible replay markup only; it does not read app globals or browser storage.
- `tools/compare-visible-replay.mjs` is a reusable read-only ingestion/comparison CLI. It requires an expected-game inventory and symmetric file pairs, preserves raw pairs and writes hashes, differences and declared limits. Mismatch exit code 1 is intentional for this corpus.
- `tests/visible_replay_comparison_tests.mjs`: 14/14 cases pass, including deliberate wrong-team, side/item, HP, move, field, selection and action-order mutations plus empty evidence, orphan download, seed/inventory mismatch and stale empty-metadata rejection. Renderer/exporter build identity is separate from historical execution identity.
- Independent read-only review confirmed both display omissions from JSON, captured DOM and renderer source; it also found four audit-tool weaknesses, which were corrected and regression-tested before final ingestion. Reingestion retained the same 61 field and 90 action discrepancies across 21 comparisons.
- Final independent review found no remaining hard blocker in the comparator's declared scope and reproduced the exact inventory/seed pairing and mismatch counts. This approves the audit method within its limits, not the currently mismatching UI.
- Fast project gate: 137 files pass. No app/engine code changed and no rebuild was needed. Database tests were not rerun for this tooling/documentation-only change; prior mock proof remains separate.

## Limits

Observable-field agreement is not real-game accuracy. Stable database IDs and exact stats are not printed on these replay cards. Same-name repeated-action multiplicity, every effect tooltip, all coaching text and full pixel/layout coverage remain unproved. The comparator does not call the application's renderer to manufacture expected output. One visible starting-state screenshot was inspected and a full-page screenshot retained; all turn boards were DOM-compared, not individually screenshot-certified. No production credentials or Supabase ingestion were used.

This is a durable workflow for the agent's runs, not an unattended service watching every user simulation. Automated engine stress without a page must disclose that no visual comparison occurred. Never silently present a sampled or retained subset as all games.
