# Deployment Security Checklist - 2026-06-28

Purpose: release gate for public beta on GitHub Pages and the current static Champion sim.

## Required before public beta

- `No secrets in bundle`
  - Confirm no Supabase service-role keys, payment secrets, webhook secrets, or private tokens are present in committed HTML/JS.
  - Only browser-safe anon/runtime config may exist in the deployed app shell.

- `Cache safety`
  - Bump `poke-sim/sw.js` `CACHE_NAME` on every app-shell release.
  - Rebuild `poke-sim/pokemon-champion-2026.html`.
  - Pass bundle freshness and cache bump CI gates.
  - Validate one fresh-load test on Safari/private or incognito to prove stale logic is not retained.

- `Public-device guardrails`
  - Mobile/coarse-pointer or low-memory devices must prefer `Stress Lite + QA`.
  - `Run All` and `Run All + QA Artifact` should stay disabled on risky public devices.
  - Full branch coverage should not be exposed on phones or low-memory browsers.

- `Abuse controls`
  - Free/public browser paths must cap large local workloads.
  - Replay parsing, future coaching endpoints, and future API-backed flows need explicit rate-limit strategy before broader public launch.
  - GitHub Pages is acceptable for static demo release only; payment/webhook decisions must not run from static hosting.

- `Mobile smoke checklist`
  - `iPhone + Safari`: load app, verify current build label, run `Run Simulation`, run `Stress Lite + QA`, verify artifact download.
  - `Android + Chrome`: same flow plus confirm guardrail note appears on public-risk devices.
  - `Private/incognito`: verify fresh bundle and no stale service worker state.

## Current hard-beta policy

- Treat `Stress Lite + QA` as the default public stress path.
- Treat full `Run All` as desktop-only until mobile/public smoke proof is stable.
- Do not close deployment-hardening issue `#103` until:
  - security checklist is committed,
  - cache behavior is proven by CI and live deploy,
  - mobile Safari smoke is part of release validation,
  - and the team has an abuse/rate-limit plan for future hosted endpoints.
