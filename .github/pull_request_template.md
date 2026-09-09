<!-- Thanks for contributing. Please fill out this checklist. -->

## Summary

<!-- What does this PR change? One or two sentences. -->

## Linked Issues

<!-- Use `Refs #N` not `Fixes #N` (we close issues manually after verifying evidence). -->
Refs #

## Type of Change

- [ ] Bug fix (engine, data, or UI)
- [ ] Mechanic correction (cite primary source below)
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Documentation
- [ ] Test / tooling

## Primary Source Citations

<!-- Required for any mechanic or data change. Link Game8, Bulbapedia, RotomLabs, Victory Road, Serebii, or an official patch note. -->

-
-

## Files Touched

<!-- Tick the ones modified. -->
- [ ] `poke-sim/data.js`
- [ ] `poke-sim/engine.js`
- [ ] `poke-sim/ui.js`
- [ ] `poke-sim/style.css`
- [ ] `poke-sim/index.html`
- [ ] `poke-sim/legality.js`
- [ ] `poke-sim/strategy-injectable.js`
- [ ] `poke-sim/pokemon-champion-2026.html` (rebuilt bundle)
- [ ] Root-level spec / doc (`CHAMPIONS_MECHANICS_SPEC.md`, etc.)

## Test Evidence

<!-- Paste output or link to artifacts. -->

- [ ] Syntax check: `node -c data.js engine.js ui.js` passes
- [ ] Source-truth tests: `cd poke-sim && npm run test:source-truth`
- [ ] Fast tests: `cd poke-sim && npm run test:fast`
- [ ] Bundle rebuilt: `python3 poke-sim/tools/build-bundle.py`, size and SHA recorded
- [ ] Bundle freshness CI check passes (green checkmark on this PR)

```
<!-- paste key test output here -->
```

## Improvement Record

<!-- Required for a material fix/hardening change. Link docs/IMPROVEMENT_LOG.md#imp-NNNN.
     Do not include credentials, private user data or undisclosed exploit details. -->
- Record ID/link:
- Before / after:
- Root cause and reusable lesson:
- Regression evidence and related cases covered:
- Proof state (local / staging / merged / deployed), revision/build and environment:
- Still unverified / rollback or next action:

## Breaking / Behavior Changes

<!-- Describe any win-rate shifts, UI flow changes, or data shape changes. If none, say "None". -->

## Checklist

- [ ] Followed the draft-first rule for non-trivial changes (diff draft reviewed before source edits)
- [ ] No em-dashes in commit messages
- [ ] New globals referenced during init use `var` (TDZ-safe)
- [ ] Updated `CHAMPIONS_MECHANICS_SPEC.md` if mechanic behavior changed
- [ ] If browser source changed: ran `python3 poke-sim/tools/build-bundle.py` and committed `pokemon-champion-2026.html`
- [ ] If `engine.js`, `data.js`, `ui.js`, `style.css` changed: ran `./tools/release.sh <tag>` and committed `sw.js`
- [ ] Updated the improvement record and applicable `STATUS.md` / roadmap evidence; historical prompts are not the source of current status
- [ ] Unperformed checks remain unverified; no scope was closed solely because unrelated tests passed
