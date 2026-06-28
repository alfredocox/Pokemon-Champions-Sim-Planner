---
description: Enforced development standards for all implementation work on this repo
---

# Development Standards — Pokémon Champion 2026

These rules apply to **every** implementation session. Follow them in order before writing any code.

## Pre-Implementation Gate

1. **Pull latest & check branch** — Run `git fetch origin && git status` and read `MASTER_PROMPT.md` before touching any code. Confirm you are on the correct branch and aware of current progress.

2. **Read the plan** — If a plan file exists in `.windsurf/plans/`, read it. If no plan exists, create one before implementing.

## Implementation Rules

3. **Embedded Systems Logic** — Organize all code into well-named functions and classes. Entry points (`main`, event handlers, top-level scripts) must be clean orchestrators that call into those functions — no inline business logic in `main`. Keep cyclomatic complexity low per function.

4. **Test-Driven Development (TDD) + Modular** — Write or update tests BEFORE implementation. Each module/feature gets its own test file. Follow the RED → GREEN → REFACTOR cycle. Never merge code that breaks existing tests.

5. **Precise, Concise Plans** — All plans must be:
   - Bullet-format, scannable in under 60 seconds
   - Each step is a single concrete action (not a paragraph)
   - Written so that any AI agent (including free-tier SWE models) can follow and implement precisely
   - Include file paths, function names, and acceptance criteria where applicable

## Post-Implementation Gate

6. **Update MASTER_PROMPT.md** — After completing work on a branch, update this file with: what was done, current status, blockers, and open questions. This is the team handoff doc.
7. **Verify before push** — Run the test suite, confirm no regressions, check that the bundle builds cleanly.
8. **No auto-commits/pushes** — Never run `git commit` or `git push` without explicit user approval. Present changes for review first.
9. **Rebuild bundle after app source changes** — If ANY of the following files are modified, the bundle MUST be rebuilt before pushing:
   `engine.js`, `data.js`, `ui.js`, `style.css`, `strategy-injectable.js`, `replay_coach.js`, `replay_learning.js`, `move_legality.js`, `move_support.js`, `legality.js`, `index.html`, `storage_adapter.js`, `supabase_adapter.js`, `logger.js`, `runtime_data.js`, `generated/pokemon_showdown_legal_data.js`

   This is the exact set CI checks in `bundle-freshness-check.yml`. When in doubt, rebuild.
   ```
   cd poke-sim && python3 tools/build-bundle.py
   ```
   Then stage and commit `poke-sim/pokemon-champion-2026.html`. CI will fail with "Bundle drift detected" otherwise.
10. **Update sw.js after app source changes** — Any PR that modifies app source files must also update `poke-sim/sw.js` to bump the cache version. Run the release script:
    ```
    chmod +x tools/release.sh && ./tools/release.sh <tag>
    ```
    Or manually bump `CACHE_NAME` in `sw.js`. CI will fail with "PWA users will receive stale cached files" otherwise.
