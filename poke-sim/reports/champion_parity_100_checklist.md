# Champion Parity 100 Checklist

Generated: 2026-06-28

This file defines what we mean by "100% Champion accuracy" for the simulator. It is a release gate, not a claim that every possible future Pokemon edge case has been mathematically proven. The practical standard is: every shipped Champion team, move, item, ability, spread, target rule, and exported proof path must be legal, traceable to source truth, tested, and visibly labeled when any part is still under review.

## Current Snapshot

- Current deployed proof baseline: `v2.2.18-stress-lite-summary`.
- Current local candidate: `v2.2.19-hard-beta-guard`.
- Important status: `v2.2.19` is not deployed proof until CI, Pages, and a fresh browser QA Artifact pass.
- Previous shipped proof anchor retained for audit: `v2.1.37-damage-log-team-catalog`.
- Primary mechanics source truth: Pokemon Showdown data and behavior, with Champion-specific differences documented as explicit overrides.
- Showdown source snapshot in generated data: `3f5079d395ad018f13e8f785a675a13bd4cbf59e (2026-05-24)`
- Showdown damage oracle: `56/56` local cases passing after the core shipped-move parity slice.
- Move support audit: `120 verified`, `0 baseline`, `0 incomplete` across `120` shipped distinct moves.
- Ability inventory: `80/80` curated and mega abilities modeled.
- Latest live QA Artifact reviewed: `v2.2.17-stress-lite-qa` Stress Lite export was Codex-ready and kept the capped-proof boundary visible.
- Damage applied-vs-calculated logging bug: fixed. Turn logs keep applied HP loss and formula output as separate fields.
- Runtime team catalog: only approved Champion-legal rows should remain visible at runtime. Current runtime catalog has 10 approved Champion-legal testing rows and removes 17 legacy/inferred rows into the audit object.
- Testing catalog target: the first top-10 approved Champion archetype set is populated for runtime testing: anti-Trick Room/speed, weather support, rain, sun, sun + Trick Room, sand, pure Trick Room, balance/setup, snow/Aurora Veil, and arena-style sun. These are testing archetypes unless their source row is explicitly marked exact.
- Fresh live proof still needed after this release: GitHub Pages `?v=<new-sha>`, one single-run log, one phone/device-safe Stress Lite QA artifact, and one desktop Tactical Sweep from `v2.2.19`.
- If full Run All is unsafe on the tester machine, `v2.2.19` hard-beta guardrails should push the user onto Stress Lite QA. Treat that as capped stress evidence only when the artifact says `qa_run_type: "stress_lite_qa"`, includes `stress_lite.summary`, and keeps the non-exhaustive boundary visible.

## What Is Proven Now

- Source, legality, generated seed, and runtime catalog gates prevent known illegal Champion rows from entering normal selectors.
- Local stat-source move proof covers Foul Play, Body Press, Psyshock-style defense targeting, target-power ignoring abilities, and the known nonstandard damage-source cases represented in tests.
- The `v2.2.15` deployed QA Artifact proved the browser export contract was Codex-ready for that build, with no missing proof listed by the artifact.
- Pages deployment now has a live DB seed-parity guard when Supabase anon secrets are present.
- Generated QA baseline drift is guarded so the Overview-linked report cannot silently lag behind approved catalog changes.
- `v2.2.16` added evidence-bound coach memory and sequence explanation fields, including `coach_brain_summary.tactical_interpretation`.
- `v2.2.18` added readable Stress Lite summary totals and coaching signal.
- `v2.2.19` adds public-device safety guardrails, but that remains a local candidate until deployed browser proof exists.

## What Is Not Proven Yet

- Do not claim global 100% or 1000% simulation accuracy.
- `v2.2.19` still needs the full local suite after the latest candidate, then push, CI, Pages, and a fresh deployed QA Artifact before it can replace `v2.2.18` as live proof.
- The long-tail battle-system slices still need named proof coverage before broad claims: redirection, Protect-family timing, switching/replacement, status edge cases, item edge cases, terrain/weather interactions, ability immunities, and Champion-specific overrides as new sources appear.
- Live DB runtime-source promotion still needs either direct runtime use of approved source rows or an explicit static-fallback signoff with parity proof.
- Source-drift visibility still needs a user-facing update-needed state when Showdown or Champion source truth changes.
- Full forensic DB retention is not proven; browser exports are still the primary audit evidence unless a reviewed retention design is implemented.

## Do Not Claim Broad 100% Until

- Shipped moves have `0 incomplete`, `0 baseline`, and every shipped move has explicit regression or oracle coverage.
- All bundled Champion teams pass legal Champion SP, item, ability, move, species/form, Tera, and import/export checks.
- The release testing catalog contains only approved Champion-legal rows and intentionally covers the main competitive archetypes instead of a large mixed legacy catalog.
- Supabase rows cannot replace clean bundled teams with stale SV data, illegal spreads, unsupported items, or malformed payloads.
- Browser single-run, Run All, exported turn logs, and QA Artifact proof are clean on the deployed GitHub Pages build.
- Mobile/coarse-pointer and low-memory browsers are guarded away from risky public Run All flows and visibly routed toward Stress Lite.
- `build_id`, `source_url`, service-worker cache, bundle build, and source commit/version all agree.
- Known gaps are visible in the Overview and reports instead of hidden behind a readiness claim.
- Showdown source drift or Champion source conflicts show an update-needed state until reviewed and either promoted or documented as an override.

## 100% Truth Gate Definition Of Done

The release may be described as meeting the current Champion truth gate only when all of these are true:

- Local non-DB gates pass.
- Local DB gates pass.
- Bundle freshness passes.
- GitHub CI and Pages deploy pass on the exact commit.
- The deployed browser QA Artifact has `ready_for_codex: true` and `next_missing_proof: []`.
- Single-run, Run All, and Tactical Sweep exports include the mechanic being claimed fixed.
- Stress Lite may substitute only for device-safe stress evidence, not for an exhaustive Run All claim.
- `build_id`, cache label, source URL, Overview label, and source commit agree.
- Public-risk devices do not expose unrestricted Run All or full branch coverage.
- Every remaining gap is either closed with evidence or explicitly listed as an accepted non-100% gap.

## Confirmed Closed In This Slice

- Low Kick no longer reads Showdown `basePower: 0` as no damage.
- The engine reads target species weight from `generated/pokemon_showdown_species_weights.js`.
- The weight file is generated from Pokemon Showdown `data/pokedex.ts` at the same source snapshot as the generated legal data.
- Low Kick base-power tiering is covered against `@smogon/calc` for a heavy target and a mid-weight target.
- The type multiplier audit now treats Low Kick and Grass Knot as damaging variable-base-power moves instead of status/no-damage rows.
- The former 35 baseline shipped moves are now promoted to verified coverage in `move_support.js`.
- `showdown_damage_oracle_tests.js` covers the remaining direct and spread damage ranges against `@smogon/calc`, plus Foul Play target-Attack damage and Darkest Lariat defense-stage bypass.
- `move_verification_registry_tests.js` covers Dual Wingbeat two-hit behavior, Poltergeist no-item failure, Leaf Storm self-drop, Stomping Tantrum prior-fail boost, weather and true-accuracy rules, secondary stat/status effects, Throat Chop sound locking, Hurricane confusion, Light of Ruin recoil, and Ice Shard priority.

## Former Baseline Move Groups Closed

1. Spread and weather accuracy: Heat Wave, Blizzard, Dazzling Gleam, Sludge Wave, Hurricane, Thunder.
2. Variable base power and item/state moves: Foul Play, Poltergeist, Grass Knot if it enters shipped teams, and Stomping Tantrum.
3. Secondary status/stat effects: Scald, Scorching Sands, Poison Jab, Gunk Shot, Crunch, Energy Ball, Earth Power, Flash Cannon, Focus Blast, Flamethrower, Fire Punch, Ice Beam, Ice Punch, Ice Shard.
4. Damage-only and recoil/priority coverage: Aura Sphere, Dragon Pulse, Hydro Pump, Liquidation, Power Gem, Psychic, Throat Chop, Kowtow Cleave, Darkest Lariat, Leaf Storm, Light of Ruin, Dual Wingbeat.
5. Any future move promoted from baseline must name the source truth, test file, and exact behavior covered in `move_support.js`.

## Browser Proof Gate

For each release that changes engine logic, generated data, legality, runtime data, or UI proof:

- Rebuild `poke-sim/pokemon-champion-2026.html`.
- Bump `index.html`, `ui.js`, and `sw.js` build/cache labels.
- Open the GitHub Pages URL with `?v=<commit-sha>`.
- Export one single-run turn log.
- Export one Run All turn log.
- Export one QA Artifact.
- Validate logs with `tools/validate-turn-logs.mjs`.
- Check for team-load failures, stale source URLs, illegal Champion spreads, item drift, missing damage evidence, missing `effect_events` evidence for HP-changing effects, no-valid-target rows while a live target exists, and missing retained-evidence counts.
- Confirm normal selectors and Run All are using only approved Champion-legal teams, not removed legacy or inferred rows.

## Source Truth Architecture

- Mechanics live in `engine.js` and focused runtime modules.
- Generated Showdown data feeds the engine; it is not the engine.
- Supabase stores teams, analyses, approved source rows, overrides, and audit history.
- Supabase should not be used as the live damage calculator in the browser.
- The GitHub Pages bundle must remain deterministic and testable offline from generated assets.
- Champion-specific deviations must live as reviewed overrides with source notes and tests.

## Open Gaps To Keep Visible

- The live battle runtime still does not query approved `showdown_entities` rows directly.
- Alfredo Pages deployment remains blocked by repo Pages/admin configuration; source parity is separate from deployed Alfredo Pages proof.
- No fresh browser-exported Tera Blast damage event has been observed yet after the latest Tera Blast release.
- Fresh `v2.1.37` browser proof is still required after deploy before broad partner-facing accuracy claims.
- Full raw thousand-battle archival is not automatic; current browser retention is capped and QA Artifact exports retained evidence.
- The edit-team UI is guarded for legality but still needs a fluid full Champion builder.
- The top-10 approved Champion archetype catalog is populated for runtime testing, but source review should continue before any adjusted row is described as exact tournament provenance.
