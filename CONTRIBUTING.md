# Contributing

Accuracy, provenance, and reproducibility come before feature volume. Read `AGENTS.md` and `STATUS.md` before choosing work.

## Source Rules

- Official Pokemon Champion publications and in-game evidence define Champion-specific truth.
- Pokemon Showdown is the primary mirrored baseline for standard data and a mechanics reference.
- Champion differences require reviewed override rows with provenance and regression evidence.
- Community sources may identify candidates or meta context; they do not independently prove mechanics or legality.
- Unknown facts stay `needs_verification`.

## Workflow

1. Select a current GitHub issue using `owner/repository#number`, or open one for the bounded problem.
2. Branch from reviewed `main`. Do not push directly to `main`.
3. Add a regression or evidence fixture for mechanics, mapping, persistence, source, and replay defects when practical.
4. Make the smallest change that solves the named problem.
5. Run the applicable gate from `poke-sim/`:

```bash
npm ci
npm run test:source-truth
npm run test:fast
python3 tools/build-bundle.py
node tests/release_manifest_tests.js
node tests/t191_overview_tab_tests.js
```

6. Rebuild `poke-sim/pokemon-champion-2026.html` after browser-source changes. Never hand-edit it.
7. Add or update a stable entry in [the improvement log](docs/IMPROVEMENT_LOG.md): before/after behavior, root cause, regression proof, reusable lesson and remaining scope. Update `STATUS.md` and the roadmap only where current status or direction changed. Preserve older evidence; link detailed reports rather than duplicating them.
8. Open a pull request with the improvement ID, exact tests, evidence, uncertainty, source links, branch/SHA, and deployment status. Keep unresolved security details in restricted evidence; public summaries must be sanitized.

Mechanics truth, Champion overrides, production migrations, security boundaries, and releases require the roles and review in `AGENTS.md`. Local tests prove local behavior only.

`MASTER_PROMPT.md`, old reports, drafts, and runbooks are context, not current instructions. Current policy and status win when documents conflict.
