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
node tests/t9j12_tests.js      # T9j.12 — simulator bring picker (#74) — 11 cases
node tests/t9j13_tests.js      # T9j.13 — format mismatch guard + SP rescale (#42) — 47 cases
node tests/t9j14_tests.js      # T9j.14 — Shadow Pressure PDF + coaching notes (#75) — 25 cases
node tests/t9j15_tests.js      # T9j.15 — Best Mega Trigger Turn card (#71) — 22 cases
node tests/audit.js            # 5070-battle audit across all 13 teams — 0 JS errors floor

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
| t9j10 | 16/16 | Bring state + random-mode rerolls |
| t9j11 | 16/16 | Custom team bulk import/export + filter chips |
| t9j12 | 11/11 | Simulator bring picker + shared Teams/Sim state |
| t9j13 | 47/47 | Format-mismatch guard + SP rescale (cofagrigus_tr, aurora_veil_froslass) |
| t9j14 | 25/25 | Shadow Pressure PDF master sheet + coaching notes + pluggable COACHING_RULES |
| t9j15 | 22/22 | Best Mega Trigger Turn card — Pilot Guide + PDF column, severity bands, sweep cache |
| **Total** | **285/285** | |
| audit | 0 JS errors | 5070 battles across 13 teams |

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

## CI (future)

No CI runner is wired up yet. Candidate: a simple `npm test` script that runs all five suites and exits non-zero on any failure. Ticket out when T9j.10 golden-pack lands.
