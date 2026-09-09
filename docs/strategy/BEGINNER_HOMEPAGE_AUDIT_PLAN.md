# Beginner Homepage And Navigation Audit
Requested 2026-08-30. **Queued, not started.** Run after the simulation-readiness gate, not instead of mechanics, source or replay validation. The first-time visitor experience must remain compatible with efficient competitive-player workflows.

Entry gate:

- [ ] Define the accuracy benchmark's supported regulation, doubles scope, independent reference evidence, case denominator and exclusions before reporting the user's 99% target. Passing regression counts alone do not establish game accuracy.
- [ ] Resolve critical mechanics, legality, identity and replay-evidence defects even if an aggregate score reaches 99%. Publish remaining unknowns and required human/in-game verification.
- [ ] Pin the reviewed build, approved rules package and deployed artifact before auditing the release candidate.

Two review perspectives: a first-time visitor who knows no Pokemon terminology, and a UI engineer examining navigation, accessibility, consistency and error recovery. An agent's novice-perspective walkthrough is a hypothesis generator, not evidence from real beginner participants.

Audit checklist:

- [ ] Start with a fresh session on the homepage. Test whether the visitor can identify the site's purpose and a clear first action without outside instructions.
- [ ] Complete the journey: find a starter team, understand/select a format, run a permitted simulation, understand its result, inspect a replay, then change teams and try again. Explain unfamiliar terminology where needed without overwhelming experienced users.
- [ ] Check navigation between every linked view: current location, back/home behavior, deep links, reloads, saved selections and returning after an interruption. Identify duplicate routes, dead ends, misleading labels and unnecessary decisions.
- [ ] Stress desktop/mobile layouts, touch targets, keyboard-only navigation, focus order, screen-reader names, contrast, zoom and reduced motion. Inspect text wrapping and overlap at narrow widths.
- [ ] Exercise loading, empty results, invalid imports, unknown regulations, unavailable DB/network, stale data, rapid repeated clicks and switching views mid-operation. Errors must explain the problem without losing the user's work or silently changing rules.
- [ ] For every simulation/team-change scenario, retain exported logs and compare them with the visible battle/replay and selected participants. UI polish cannot hide incorrect simulation evidence.
- [ ] Record each finding with build/URL, device/viewport, task, reproduction steps, expected/actual behavior, severity, screenshots/logs and the smallest suitable fix. Separate observed defects from design hypotheses.
- [ ] Implement prioritized fixes, add applicable regression tests and repeat the same tasks locally and on the deployed candidate. Document any remaining friction and rollout limits.
- [ ] Validate with real Pokemon beginners and competitive players. Record task completion, time to first useful result, navigation errors, assistance required and result comprehension. Set success thresholds before the study; do not claim "top 1%" without comparative evidence.

Exit: no unresolved critical journey blockers, verified fixes and accessibility checks, documented beginner-study results and remaining limitations. This milestone does not authorize promotion of unverified regulations or premature coaching claims.
