# Champions Sim Test Suite

Node-based regression and unit tests for `engine.js` and `data.js`. All tests load source files into a VM context (no bundling required) and run in ~3s combined.

## Run all tests

```bash
cd poke-sim
node tests/items_tests.js      # T9j.6 — items (#29 #8 #18 #11 #43) — 14 cases
node tests/status_tests.js     # T9j.4 + T9j.5 — status residuals (#41 #17) — 27 cases
node tests/mega_tests.js       # T9j.7 — mega evolution + trigger sweep (#23) — 27 cases
node tests/coverage_tests.js   # T9j.3b — coverage + speed control (#36 #33) — 9 cases
node tests/audit.js            # 5070-battle audit across all 13 teams — 0 JS errors floor
```

## Green baseline (pre-T9j.8)

| Suite | Pass | Notes |
|---|---|---|
| items | 14/14 | Leftovers, Focus Sash, Choice Scarf, stat reset, WONTFIX regressions |
| status | 27/27 | Poison, toxic, freeze, paralysis 12.5%, sleep 3-turn cap |
| mega | 27/27 | Dynamic mega evolution, trigger sweep, base-form lead |
| coverage | 9/9 | Speed control category, meta radar |
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
