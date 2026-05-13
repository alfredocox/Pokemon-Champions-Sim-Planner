# Issue Push Staging - 2026-05-12

Repository: `alfredocox/Pokemon-Champions-Sim-Planner`
Local base reviewed: `main` at `3f8c758` (`Merge pull request #180 from alfredocox/integration/m9`)

## Access Notes

- Local checkout is clean before this staging note.
- GitHub issue API/CLI access from this environment failed with `error connecting to api.github.com`; public repo landing page shows 57 open issues and 4 open pull requests.
- This review uses the local canonical issue sources: `ROADMAP.md`, `GITHUB_ISSUES_TO_FILE.md`, current remote branch refs, and current `main`.
- `node` and `npm` are not installed in this shell, so test execution is blocked locally.

## Current Issue Review

### P0

| Issue | Status | Push recommendation |
|---|---|---|
| #147 Ko-fi account missing | External account/setup task, not code-owned in this checkout. | Do not stage code. Needs owner action and GitHub comment evidence. |

### Sprint 1 Gate

| Issue | Local finding | Push recommendation |
|---|---|---|
| #78 Namespace `window.ChampionsSim` | Remote branch `origin/feat/78-namespace-champions-sim` exists, but its diff against current `main` would delete or roll back a large amount of current DB/M9 work. | Do not push/merge that branch as-is. Re-implement or cherry-pick only the namespace script/changes onto a fresh branch from current `main`. |
| #138 `data.js` placeholder guard | No current branch identified from local refs. | Stage as a fresh focused test-first branch from `main`. |
| #149 Unit tests for `classifyPokemon()` | No current branch identified from local refs. | Stage after or alongside #141 only if `classifyPokemon()` is already present; otherwise keep as RED test branch. |
| #150 Stat panel HTML markup | No current branch identified from local refs. | Stage as a UI-only branch after confirming #142 scope. |
| #151 `CONTRIBUTING.md` | `CONTRIBUTING.md` exists on current `main` with workflow, rebuild, tests, labels, and closure guidance. | Likely ready for GitHub evidence/closure rather than code push. If issue requires more detail, stage a small docs patch only. |

### Sprint 2 / Next Ready Candidates

| Issue | Local finding | Push recommendation |
|---|---|---|
| #141 `classifyPokemon()` 7-role classifier | Critical path for #149, #165, #166, #167. | Stage as a fresh feature branch with tests and source/bundle rebuild. |
| #140 T9j.18 status immunity tests | Existing remote `origin/test/t9j18-t9j19-suites` is stale against current `main` and would remove current DB/M9 files. | Do not push/merge as-is. Recreate focused test additions from current `main`. |
| #139 T9j.18 mirror-match hard assertion | Same risk as #140 if using the stale branch. | Recreate focused test branch from current `main`. |
| #80 TDZ lazy-init crash risk | No current branch identified from local refs. | Stage after #78 namespace direction is settled. |
| #89 Structured logger | M9 remains in progress and current `main` includes recent M9 integration. | Stage as a focused instrumentation branch from current `main`. |
| #94 XSS `innerHTML` audit | No current branch identified from local refs. | Stage as audit-first docs + targeted UI fixes; avoid broad rewrites. |

## Branches Not Safe To Push/Merge As-Is

- `origin/feat/78-namespace-champions-sim`: one commit (`166139c`) but large diff against current `main`, including deletions/rollbacks in workflows, DB, tests, bundle, and UI.
- `origin/test/t9j18-t9j19-suites`: large stale diff against current `main`, including removal of current DB integration docs, tests, migrations, and bundle content.

## Recommended Push Queue

1. `docs/issue-push-staging-2026-05-12`
   - Commit this staging report.
   - Purpose: preserve the issue review and document stale branch risk before more pushes.

2. `docs/151-contributing-evidence`
   - Only if GitHub issue #151 needs repository evidence.
   - Expected change: small update to `ROADMAP.md` or issue comment evidence; no app code.

3. `fix/138-data-placeholder-guard`
   - Fresh branch from current `main`.
   - Add guard tests first, then implementation, then rebuild `poke-sim/pokemon-champion-2026.html`.

4. `test/140-status-immunity-current-main`
   - Fresh branch from current `main`.
   - Recover only the relevant T9j.18 assertions; do not reuse stale branch wholesale.

5. `feat/141-classify-pokemon`
   - Fresh branch from current `main`.
   - Implement classifier and unlock #149/#165 follow-up test work.

6. `feat/78-namespace-current-main`
   - Fresh branch from current `main`.
   - Either re-run a reviewed namespace script or manually stage minimal namespace changes.
   - Keep DB/M9 files intact.

## Verification Needed Before Push

- Install or expose Node.js/npm in the shell.
- Run at minimum:
  - `cd poke-sim && node tests/items_tests.js`
  - `cd poke-sim && node tests/status_tests.js`
  - `cd poke-sim && node tests/mega_tests.js`
  - `cd poke-sim && node tests/t9j16_tests.js`
  - `cd poke-sim && node tests/audit.js`
- For source edits, rebuild with `python3 tools/build.py` or the documented bundle command, then run `.github/workflows` freshness checks where possible.
