# Poke-e-Sim Champion 2026 - Test Suite

Node-based regression and unit tests for `engine.js` and `data.js`. All tests load source files into a VM context (no bundling required) and run in ~3s combined.

## Run all tests

```bash
cd poke-sim
node tests/items_tests.js      # T9j.6 — items (#29 #8 #18 #11 #43) — 14 cases
node tests/status_tests.js     # T9j.4 + T9j.5 — status residuals (#41 #17) — 27 cases
node tests/mega_tests.js       # T9j.7 — mega evolution + trigger sweep (#23) — 27 cases
node tests/coverage_tests.js   # T9j.3b — coverage + speed control (#36 #33) — 9 cases
node tests/t9j8_tests.js       # T9j.8 — ability hooks (#38 #37) — 47 cases
node tests/t9j9_tests.js       # T9j.9 — nature + EV + IV stat math (#4 #5) — 24 cases
node tests/t9j10_tests.js      # T9j.10 — bring N-of-6 picker state (#16) — 16 cases
node tests/t9j11_tests.js      # T9j.11 — custom teams bulk I/O + filter (#73) — 16 cases
node tests/t9j12_tests.js      # T9j.12 — simulator bring picker (#74) — 16 cases
node tests/t9j13_tests.js      # T9j.13 — format mismatch guard + SP rescale (#42) — 47 cases
node tests/t9j14_tests.js      # T9j.14 — Shadow Pressure PDF + coaching notes (#75) — 25 cases
node tests/t9j15_tests.js      # T9j.15 — Best Mega Trigger Turn card (#71) — 22 cases
node tests/phase4c_detectors.js # Phase 4c — detectors + confidence badges (5 fixtures) — 20 cases
node tests/phase4d_threat_response_tests.js # Phase 4d — threat response solver + line classifier — 7 cases
node tests/phase4e_policy_regression.js # Phase 4e — policy audit / T5 static-advice gate — 15 cases
node tests/mechanics_audit.js      # Mechanics audit — move-rule checks used by smoke test
node tests/move_support_audit_tests.js # Shipped move support coverage + registry completeness guard
node tests/move_verification_registry_tests.js # First verified move slice: Freeze-Dry, Giga Drain, Rock Tomb, screens
node tests/ability_coverage_audit_tests.js # Ability coverage inventory + classification guard
node tests/ability_damage_parity_tests.js # Ability damage/KO/contact parity slice
node tests/ability_priority_targeting_tests.js # Ability priority, targeting, status, and accuracy parity slice
node tests/t159_mobile_roster_layout_tests.js # Mobile roster layout safeguards
node tests/t160_distinct_battle_team_tests.js # Battle team selection must stay distinct
node tests/t161_team_member_uniqueness_tests.js # Catalog teams must not repeat members
node tests/t163_export_my_data_tests.js # Export My Data as JSON
node tests/t164_mobile_shell_layout_tests.js # Mobile shell layout safeguards
node tests/t165_mobile_content_fit_tests.js # Mobile content fit safeguards
node tests/t166_a11y_tabs_modal_tests.js # Tabs + modal focus and keyboard semantics
node tests/t167_mobile_teams_layout_tests.js # Mobile teams layout safeguards
node tests/t168_mobile_strategy_audit_tests.js # Mobile strategy/audit layout safeguards
node tests/t169_mobile_portrait_shell_tests.js # Mobile portrait shell safeguards
node tests/t170_landscape_mobile_layout_tests.js # Landscape mobile layout safeguards
node tests/t171_mobile_tab_picker_tests.js # Mobile tab picker safeguards
node tests/t172_mobile_sim_structure_tests.js # Mobile simulator structure safeguards
node tests/t173_mobile_dense_controls_tests.js # Mobile dense control safeguards
node tests/t174_mobile_results_stats_tests.js # Mobile results stats safeguards
node tests/t175_mobile_tab_grid_tests.js # Mobile tab grid safeguards
node tests/t176_mobile_teams_panel_tests.js # Mobile teams panel safeguards
node tests/phase5_turn_log_tests.js # Phase 5 — turnLog, positionScore, Replay Log v2 — 25 cases
node tests/recoil_faint_turn_log_tests.js # Recoil KO cleanup + imported Showdown move metadata — 3 cases
node tests/turn_log_export_validator_tests.js # Exported turn-log identity/item/order/target/damage/effect validator — 16 cases
node tests/showdown_priority_drift_tests.js # Showdown priority drift audit for shipped moves — 4 cases
node tests/showdown_approved_data_generator_tests.js # Approved Showdown DB rows + Champions override generator — 4 cases
node tests/phase6_coaching_voice.js # Phase 6 — coaching templates, linter, RNG gate — 9 cases
node tests/structured_logger_tests.js # Infra — structured logger and no raw runtime console calls — 5 cases
node tests/golden_battles_runner.js  # M7 — golden battles deterministic regression — 3 battles
node tests/audit.js            # 5070-battle configured audit matrix — 0 JS errors floor
node tools/generate-move-support-audit.mjs # rebuilds shipped move support report used by the daily heartbeat

# Nightly (not in fast loop — ~5-25s depending on N)
N=500 node tests/nightly_bring_harness.js    # end-to-end bring picker wiring check across 5 matchups
```

## Green baseline (current)

| Suite | Pass | Notes |
|---|---|---|
| items | 14/14 | Leftovers, Focus Sash, Choice Scarf, stat reset, WONTFIX regressions |
| status | 27/27 | Poison, toxic, freeze, paralysis 12.5%, sleep 3-turn cap |
| mega | 27/27 | Dynamic mega evolution, trigger sweep, base-form lead |
| coverage | 9/9 | Speed control category, meta radar |
| t9j8 | 47/47 | Ability hook coverage |
| t9j9 | 24/24 | Nature + EV + IV stat math |
| t9j10 | 17/17 | Bring state + random-mode rerolls + role-aware opener opt-in |
| t9j11 | 16/16 | Custom team bulk import/export + filter chips |
| t9j12 | 16/16 | Simulator bring picker + shared Teams/Sim state |
| t9j13 | 47/47 | Format-mismatch guard + SP rescale (cofagrigus_tr, aurora_veil_froslass) |
| t9j14 | 25/25 | Shadow Pressure PDF master sheet + coaching notes + pluggable COACHING_RULES |
| t9j15 | 22/22 | Best Mega Trigger Turn card — Pilot Guide + PDF column, severity bands, sweep cache |
| t9j16 | 5/5 | Mobile shell layout safeguards |
| t9j17 | 5/5 | Mobile content fit safeguards |
| t166 | 1/1 | Tabs + modal focus and keyboard semantics |
| t167 | 4/4 | Mobile teams layout safeguards |
| t168 | 4/4 | Mobile strategy/audit layout safeguards |
| t169 | 3/3 | Mobile portrait shell safeguards |
| t170 | 3/3 | Landscape mobile layout safeguards |
| t171 | 3/3 | Mobile tab picker safeguards |
| t172 | 3/3 | Mobile simulator structure safeguards |
| t173 | 3/3 | Mobile dense control safeguards |
| t174 | 3/3 | Mobile results stats safeguards |
| t175 | 2/2 | Mobile tab grid safeguards |
| t176 | 3/3 | Mobile teams panel safeguards |
| phase4c | 20/20 | Detectors (dead moves, lead perf, loss conditions) + confidence badges, 5 fixtures incl. high-n null effect |
| phase4d | 7/7 | Threat-response solver, cache, idle fallback, line labels, renderer |
| phase4e | 15/15 | Policy output audit, fake-good detector, behavior patterns, T5 adaptive-advice gate, weakness dashboard |
| mechanics_audit | 20/20 | Core move-rule checks: Protect, Taunt, support leads, Sucker Punch, Feint, shield riders, recovery, sleep, Substitute, Imprison, Ally Switch, Mega weather triggers, slot retargeting, Roost grounding |
| move_support_audit | 5/5 | Shipped move registry completeness + verified/baseline/imported Showdown support audit |
| move_verification_registry | 6/6 | First promoted verified move slice with source/test metadata |
| ability_coverage_audit | 5/5 | Curated-team + mega ability inventory guard, currently 80/80 modeled |
| ability_damage_parity | 18/18 | Bulletproof, Shell Armor, Berserk, Stamina, Mummy, Innards Out, Skill Link, Unnerve |
| ability_priority_targeting | 21/21 | Gale Wings, Flower Veil, Mind's Eye, accuracy/evasion, Stalwart, Shadow Tag, Protean, Trace |
| phase5 | 25/25 | Turn log struct, positionScore, swing-turn delta, Replay Log v2, decision-gap audit |
| recoil_faint_turn_log | 3/3 | Recoil KOs mark the attacker fainted before replacement snapshots; imported move metadata uses Showdown first |
| turn_log_export_validator | 7/7 | Exported log checks for stable identity, item drift, key maps, and priority/speed order |
| showdown_priority_drift | 4/4 | Shipped move priorities mirror generated Showdown metadata unless explicitly overridden |
| showdown_approved_data_generator | 7/7 | Approved DB entity/override migration contract + generated runtime compatibility alias |
| phase6 | 9/9 | PRE/IN/POST coaching voice, banned phrasing linter, RNG gate, footer/proximity |
| logger | 5/5 | Structured logger, default level, error fields, no raw runtime console calls |
| export | 4/4 | My Data JSON export for persisted history, reports, and DB analyses |
| **Total** | **see latest suite output** | Case count changes when focused guards are added; CI output is the source of truth. |
| audit | 0 JS errors | 5070-battle configured audit matrix |

## Conventions

- **Harness:** each test file is standalone Node. Uses `vm.createContext` to load `data.js` + `engine.js` without polluting global scope.
- **Pattern:** `T(name, fn)` runs one test, catches throws, increments pass/fail counters.
- **Assertions:** `eq(a, b)`, `near(a, lo, hi)`, `truthy(v)`, `falsy(v)` — kept minimal to avoid test-framework dependencies.
- **Seeding:** tests that depend on RNG use a fixed seed or large-sample Bernoulli CIs (see `status_tests.js` for examples).

## Adding a new test suite

1. Create `poke-sim/tests/<feature>_tests.js`
2. Use the harness pattern from `items_tests.js`:
   ```js
   const ROOT = require('path').resolve(__dirname, '..');
   ```
3. Ensure relative paths only — do not hardcode `/home/user/...` or `/tmp/...`
4. Add the run line to this README's "Run all tests" block

## CI

This repo uses GitHub Actions for:

- PR/push CI
- bundle freshness and cache-bump checks
- the daily deterministic simulator heartbeat

Keep this README aligned with the actual workflow files when adding or removing recurring checks.

## Daily Heartbeat

GitHub Actions `Daily Sim Heartbeat` runs a deterministic smoke set every day and on manual dispatch:

- `node tools/generate-move-support-audit.mjs`
- `node tests/move_legality_tests.js`
- `node tests/move_support_audit_tests.js`
- `node tests/move_verification_registry_tests.js`
- `node tests/replay_species_parser_tests.js`
- `node tests/replay_turn0_tests.js`
- `node tests/preloaded_team_legality_tests.js`
- `node tests/phase5_turn_log_tests.js`
- `node tests/pokemon_data_audit_tests.js`
- `bash tools/check-bundle.sh`

It is intentionally read-only and does not hit live Supabase by default.

When engine/log behavior changes intentionally:

- identify the first behavior-level trace difference and record the reason in the relevant report or issue note
- regenerate golden battle hashes with `node tests/golden_battles_runner.js --generate`
- rerun `node tests/db_m7_golden_battles_tests.js`
- rebuild `pokemon-champion-2026.html` with `python3 tools/build-bundle.py` if app source changed
- bump `poke-sim/sw.js` `CACHE_NAME` and keep `APP_ASSETS` aligned when adding or changing shipped browser assets

This avoids the two most common trust-layer regressions: stale golden fixtures and stale PWA caches.
