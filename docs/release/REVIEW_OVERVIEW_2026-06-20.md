# Review Overview - 2026-06-20

Audience: partners, Josh, reviewers, and anyone picking up simulator accuracy work without the chat history.

## 2026-06-22 Live Update

- Y fork `main` is deployed through commit `e5af069`.
- GitHub Pages and CI passed for that commit.
- The live page at `https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/poke-sim/pokemon-champion-2026.html` contains `v2.1.23-champion-item-sp-gate`.
- Fresh live logs passed strict stable-ID validation with no `player team not loaded` text and no stale SV/unsupported item hits.
- Downloaded turn logs now include schema, build, timestamp, and source URL metadata, so future debug logs can prove which deployed build produced them.
- This validates the current data/load/item guardrails; it does not close full damage, move, ability, or mechanics parity.

## Current Status

The simulator is in a better review state today, but it is still not ready for strong "fully accurate" claims.

What is true right now:

- the Champions review lane is the trusted default
- the local source-truth suite passes
- the local fast suite passes
- the offline DB suite passes
- the UI smoke path passes
- the visible shipped catalog is now Champions-only
- SV-format teams are no longer surfaced in the live team list
- the preferred live DB catalog migration is generator-backed from `poke-sim/data.js`
- the Y fork public page is currently deployed through `e5af069`
- fresh exported logs from that live page pass strict structural validation

What is not true yet:

- full simulator parity is not proven across all mechanics
- the issue #149 mechanics-truth beta gate is still open until long-tail field/status/multi-effect interactions are inventory-backed and regression-proven
- future live GitHub Pages builds should not be treated as updated until the matching deploy run is green and the exported log `build_id` confirms the tested build
- approved Supabase views are not yet the final public runtime source

## Live Review Target

- Branch target: `main`
- Live URL after push/deploy:
  `https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/poke-sim/pokemon-champion-2026.html`

Important:

- GitHub Pages is only proof for what is already merged to `main`
- a feature branch, local repo, or pending workspace change is not the same thing as the live page

## Source Truth Order

Keep this order fixed:

1. Pokemon Showdown upstream behavior and data
2. generated Showdown runtime rows in the repo
3. approved DB views and approved generator outputs
4. explicit Champions overrides where Champions differs from Showdown
5. local fallback rows only for known gaps

For Champions-only behavior, the approved override layer is the source truth, not ad hoc app edits.

## Approved Champions Override Sources

Use these for Champions-specific deltas:

- Serebii Pokemon Champions pages
- Victory Road Champions regulations pages
- approved repo docs and runtime bridge tests that name the override explicitly

Damage and standard mechanics should stay anchored to Showdown unless Champions has a confirmed difference and that difference is called out in the runtime override path.

## What Was Verified Today

Validated locally on 2026-06-20:

- `npm run test:source-truth`
- `npm run test:fast`
  - 87 non-DB test files passed
  - 14 DB-gated files skipped
- `node poke-sim/tests/ui_single_sim_smoke.js`

Key proof points in that passing state:

- Showdown damage oracle tests pass
- move verification registry tests pass
- priority drift checks pass
- runtime data bridge tests pass
- mechanics audit passes
- UI run-simulation smoke passes

## What Changed In This Pass

### Mechanics and test hardening

- fixed the `getStat()` null-field path so item/stat tests do not crash on missing weather context
- corrected brittle mechanics tests where move choice, speed order, or HP semantics were not actually testing the intended rule
- repaired the shared mechanics-audit helper so:
  - `atk/def/spa/spd/spe` shorthands map into EV/SP test input
  - `hp` remains current battle HP when the test is setting a damaged starting state

### Champions-first guardrails

- kept battle format (`singles` / `doubles`) separate from ruleset intent
- added a `currentRuleset` default of `champions`
- removed the remaining SV-only shipped team records from the live catalog and test matrix
- kept the user-facing `player` starter slot, but converted its metadata and SP spreads onto the Champions ruleset
- fixed DB catalog parity so team metadata now persists through both the fresh seed and the preferred live alignment migration
- marked superseded DB catalog migrations as historical and added tests that fail if `data.js`, `seed_teams_v2.sql`, and `2026_06_20_align_shared_27_team_catalog.sql` drift apart

### Review clarity

- updated stale service-worker cache expectation coverage
- rebuilt the shipped HTML bundle after the UI/runtime changes

## Remaining Gaps

These still block stronger trust claims:

1. Ability coverage is still incomplete.
   - the current audit still reports many unmodeled abilities
   - some are low impact, but many are still battle-result-impacting

2. Approved DB views are not yet the public runtime source.
   - the repo is closer to the target architecture
   - the live app still needs the approved DB/runtime handoff closed cleanly

3. Fresh deployed-log proof still needs to be repeated after each live push.
   - exported turn logs from the claimed live URL need strict validation
   - exported logs should carry `schema_version`, `build_id`, `exported_at`, and `source_url`

4. A separate SV product mode still does not exist.
 - the shipped built-in catalog is now Champions-only
 - add an explicit SV mode later only if there is a real requirement for dual-format support

5. The long-tail mechanics gate still needs explicit closure proof.
 - same-family priority suppression must stay aligned across Armor Tail, Dazzling, and Queenly Majesty
 - multi-effect moves, field-state legality shifts, Fake Out windows, and action-denial paths need deterministic inventory coverage
 - replay and QA exports must keep exposing those mechanics clearly enough to audit coaching claims

## Roadmap From Here

### 1. Keep Champions truth first

- continue mechanics proof against Showdown
- only add a Champions override when Showdown is not the final game truth
- lock each confirmed fix behind focused regression coverage

### 2. Finish the source-truth runtime path

- keep generated Showdown data as the primary runtime layer
- keep Champions overrides explicit and test-backed
- move remaining static facts behind the approved DB/runtime bridge

### 3. Push and re-validate the live page

- push `main`
- wait for GitHub Pages deploy success
- test the live URL
- export fresh logs from the live page
- run strict turn-log validation on those logs

### 4. Keep drift out

- do not review one branch and validate another
- do not treat Pages as current until the deploy run is green
- do not hand-edit mirrored Showdown facts when the fix belongs in the generator or approved DB layer

## Notes For Reviewers

- If a team is marked `SV compatibility only`, do not use it as Champions proof.
- If a behavior claim is about damage, targeting, turn order, terrain, weather, or status, check the Showdown oracle and verification tests first.
- If a behavior claim is Champions-specific, check that the override is explicit and cited.
- If a live result does not match local expectations, confirm the Pages deploy SHA before debugging the engine.

## Useful Companion Docs

- `docs/release/SIM_READINESS_STATUS_2026-06-19.md`
- `docs/release/SOURCE_OF_TRUTH_GUARDRAILS_2026-06-19.md`
- `docs/release/SIM_AND_DB_SNAPSHOT_2026-06-19.md`
- `docs/release/QA_ENVIRONMENT_HANDOFF_RULES_2026-06-19.md`
- `docs/release/SHOWDOWN_DB_RUNTIME_HANDOFF_2026-06-10.md`
- `poke-sim/reports/turn-log-audit-2026-06-20.md`
- `poke-sim/reports/move_support_audit.md`
