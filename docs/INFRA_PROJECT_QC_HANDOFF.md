# Infra and Project QC Handoff - M4 / POK-20

Date: 2026-04-30

## Executive Status

Handoff readiness: ready for Alfredo review.

Production ship status: no-ship until the runtime wiring and validation gaps below are resolved.

This QC confirms the DB conflict cleanup PR is scoped correctly, but it also confirms the Supabase adapter is not yet active in the app shell or built bundle.

## Repo Truth

- Active working repo: `TheYfactora12/Pokemon-Champions-Sim-Planner`
- Current branch: `codex/db-conflict-cleanup`
- Remote: `origin https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner.git`
- Production reference repo: `alfredocox/Pokemon-Champions-Sim-Planner`
- Current PR purpose: DB/Supabase conflict cleanup and Alfredo handoff only.

## PR Scope QC

Changed files are limited to:

- `docs/ALFREDO_DB_HANDOFF.md`
- `poke-sim/db/README_DB.md`
- `poke-sim/db/rls_policies_v1.sql`
- `poke-sim/supabase_adapter.js`

Runtime files intentionally untouched:

- `poke-sim/ui.js`
- `poke-sim/engine.js`
- `poke-sim/sw.js`
- `poke-sim/pokemon-champion-2026.html`
- `poke-sim/db/schema_v1.sql`
- tests

## App Architecture QC

Current `poke-sim/index.html` loads:

- `storage_adapter.js`
- `data.js`
- `legality.js`
- `engine.js`
- `ui.js`
- `sw.js` through service worker registration

Current `poke-sim/index.html` does not load:

- `supabase_adapter.js`

Current `poke-sim/pokemon-champion-2026.html` does not contain:

- `SupabaseAdapter`
- `loadTeamsFromDB`
- `saveAnalysis`
- `window.__SUPABASE_URL__`
- `window.__SUPABASE_KEY__`

Current `poke-sim/tools/build-bundle.py` bundles only:

- `style.css`
- `data.js`
- `engine.js`
- `ui.js`

It does not bundle:

- `storage_adapter.js`
- `legality.js`
- `strategy-injectable.js`
- `supabase_adapter.js`

## Infra QC Findings

### 1. CI does not guard Supabase adapter bundle/cache drift

`.github/workflows/bundle-freshness-check.yml` watches:

- `poke-sim/engine.js`
- `poke-sim/data.js`
- `poke-sim/ui.js`
- `poke-sim/style.css`
- `poke-sim/strategy-injectable.js`
- `poke-sim/index.html`

It does not watch:

- `poke-sim/supabase_adapter.js`
- `poke-sim/storage_adapter.js`
- `poke-sim/legality.js`

`.github/workflows/cache-bump-check.yml` watches:

- `poke-sim/engine.js`
- `poke-sim/data.js`
- `poke-sim/ui.js`
- `poke-sim/style.css`
- `poke-sim/strategy-injectable.js`

It does not watch:

- `poke-sim/supabase_adapter.js`
- `poke-sim/storage_adapter.js`
- `poke-sim/legality.js`
- `poke-sim/index.html`

Required action before production DB release:

- Decide whether adapter-only changes require a service worker cache bump.
- Add `supabase_adapter.js` to CI watch lists if it ships as runtime source.
- Update bundle builder if the single-file app must include Supabase behavior.

### 2. Service worker cache documentation mismatch

Live `poke-sim/sw.js` currently uses:

```javascript
const CACHE_NAME = 'champions-sim-v7-phase4c1';
```

Some planning docs reference newer cache names such as `champions-sim-v9-m3-init-wired` or `champions-sim-v10-m4-save-analysis`.

Required action before M4:

- Treat `poke-sim/sw.js` as source of truth.
- Bump from the actual current value when runtime files change.
- Update docs after the bump lands.

### 3. Normal local validation is blocked on this machine

Blocked commands/tools:

- `node.exe`: `Access is denied`
- `rg.exe`: `Access is denied`
- Python: not installed through a usable interpreter
- Browser automation: blocked because the browser tool depends on Node execution here

Fallback checks completed:

- PowerShell conflict marker scan with real Git marker regex
- PowerShell credential scan
- `git diff --check`
- Bundle static string check

Required action before merge or production release:

- Run Node tests and browser smoke on a machine with working Node/browser tooling.

## Project QC Findings

### 1. DB adapter cleanup is reviewable but not wired

The cleaned `supabase_adapter.js` is ready for review as an isolated adapter contract.

It is not active in the current app because:

- `index.html` does not load it.
- the built bundle does not include it.
- `ui.js` does not call `saveAnalysis`.

Required action for PR 2 / M4:

- Load or bundle `supabase_adapter.js`.
- Inject `window.__SUPABASE_URL__` and `window.__SUPABASE_KEY__` before adapter initialization.
- Reconcile the canonical payload builder.
- Wire `saveAnalysis(payload)` after result render, fire-and-forget.

### 2. Supabase schema/RLS setup order is clear

Use this order in Supabase SQL editor:

1. `poke-sim/db/schema_v1.sql`
2. `poke-sim/db/seed_teams_v1.sql`
3. `poke-sim/db/rls_policies_v1.sql`

Project URL:

- `https://ymlahqnshgiarpbgxehp.supabase.co`

Anon key:

- Still placeholder-only in source.

### 3. Handoff PR should remain a review PR

Do not merge as a production DB release until:

- Alfredo reviews adapter API and RLS.
- App smoke test passes locally.
- Cache/bundle policy for `supabase_adapter.js` is decided.

## Persona Review

### 1. Senior Product Manager
- Looking for: durable M4 value without misleading users.
- Risks: users may assume persistence is live when adapter is not loaded.
- Required fixes: keep M4 marked blocked until wiring and smoke test pass.
- Nice-to-have: add user-visible saved-analysis history after M4.
- Ship recommendation: ship to handoff, no-ship to production.

### 2. Technical Project Manager / Delivery Lead
- Looking for: scoped PRs and clear ownership.
- Risks: merging adapter cleanup as if M4 is complete.
- Required fixes: keep PR #2 scoped to review; open separate M4 implementation PR.
- Nice-to-have: PR template with cache/bundle/test checklist.
- Ship recommendation: ship to Alfredo review.

### 3. Simulation Engine Architect
- Looking for: one canonical result payload.
- Risks: competing `buildAnalysisPayload` contracts.
- Required fixes: reconcile payload builder before `ui.js` wiring.
- Nice-to-have: seed references for reproducible analyses.
- Ship recommendation: no-ship for M4 until payload contract is fixed.

### 4. Frontend / PWA Architect
- Looking for: loaded adapter, non-blocking UI, correct cache behavior.
- Risks: adapter file changed but is not loaded or bundled; CI does not enforce cache bump for adapter changes.
- Required fixes: decide bundle/cache policy before production DB release.
- Nice-to-have: explicit offline/Supabase status diagnostics.
- Ship recommendation: no-ship to production.

### 5. Infrastructure / Release Engineer
- Looking for: CI catches source/bundle/cache drift.
- Risks: CI watch lists exclude `supabase_adapter.js`.
- Required fixes: add adapter to relevant CI checks in infra hardening PR.
- Nice-to-have: GitHub Pages smoke validation.
- Ship recommendation: ship to handoff with tracked infra blockers.

### 6. QA / Test Lead
- Looking for: executable tests and browser smoke.
- Risks: local Node/browser validation is blocked here.
- Required fixes: run full tests and manual smoke on a working local machine.
- Nice-to-have: DB adapter offline unit tests in CI.
- Ship recommendation: no-ship to production until tests run.

### 7. Data / Analytics Architect
- Looking for: stable analyses, win condition, and log table contract.
- Risks: schema/RLS/adapter mismatch if not reviewed together.
- Required fixes: Alfredo review of `saveAnalysis(payload)` inserts against schema.
- Nice-to-have: duplicate handling and payload versioning.
- Ship recommendation: ship to review, no-ship to production.

### 8. Competitive Pokemon Domain Expert
- Looking for: meaningful BO/sample-size context in persisted data.
- Risks: saved results can overstate certainty without BO/sample/CI.
- Required fixes: preserve BO, sample size, win rate, logs cap, and seed refs where available.
- Nice-to-have: matchup confidence language in UI.
- Ship recommendation: no-ship for M4 until payload supports context.

### 9. UX / Mobile Product Designer
- Looking for: simulation flow stays fast and understandable.
- Risks: persistence errors could distract players if surfaced loudly.
- Required fixes: persistence must stay console-only and fire-and-forget.
- Nice-to-have: subtle saved-state indicator after M4.
- Ship recommendation: no-ship for M4 until UI smoke passes.

### 10. Security / Privacy Engineer
- Looking for: no secrets and safe anon-only RLS.
- Risks: accidentally committing anon/service keys during wiring.
- Required fixes: keep service-role key out of frontend; review RLS before Supabase launch.
- Nice-to-have: `.env.example` with placeholders only.
- Ship recommendation: ship to review, no-ship until RLS reviewed.

### 11. Documentation / Developer Experience Lead
- Looking for: source-of-truth clarity.
- Risks: cache version docs drift from `sw.js`.
- Required fixes: document actual current cache and update docs after M4 bump.
- Nice-to-have: one-page M4 runbook.
- Ship recommendation: ship to handoff.

### 12. Growth / Monetization Strategist
- Looking for: reliable saved-analysis foundation.
- Risks: launching broken persistence damages trust.
- Required fixes: do not market persistence until full flow is live.
- Nice-to-have: saved matchup history and exportable reports later.
- Ship recommendation: no-ship to production.

## Cross-Functional Release Gate

| Persona | Ship / No-Ship | Blocking Issue | Required Action |
|---|---|---|---|
| Product Manager | Ship to handoff | Persistence not live | Keep M4 blocked |
| TPM | Ship to handoff | Needs separate M4 PR | Preserve PR split |
| Simulation Architect | No-Ship | Payload builder conflict | Reconcile canonical builder |
| Frontend/PWA Architect | No-Ship | Adapter not loaded/bundled | Decide load/bundle/cache path |
| Infra/Release Engineer | Ship with blockers | CI excludes adapter | Add CI coverage later |
| QA Lead | No-Ship | Tests/browser smoke not run | Validate locally |
| Data Architect | Ship to review | RLS/adapter needs review | Alfredo DB review |
| Domain Expert | No-Ship | Analytics context not wired | Store BO/sample/CI fields |
| UX Designer | No-Ship | Save failure behavior untested | Smoke UI after wiring |
| Security Engineer | Ship to review | RLS not independently reviewed | Review anon policies |
| Docs Lead | Ship to handoff | Cache docs drift | Correct during M4 release |
| Growth Strategist | No-Ship | Persistence not reliable yet | Do not launch M4 |

## Final Recommendation

Proceed with Alfredo handoff of this conflict-cleanup PR.

Do not treat this as production-ready M4. The next engineering step is not more cleanup in this PR; it is Alfredo review plus local app smoke, then a separate M4 PR that loads/bundles the adapter, reconciles payload construction, wires `saveAnalysis`, bumps cache, rebuilds the bundle, and adds DB tests.
