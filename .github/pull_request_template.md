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
- [ ] `poke-sim/pokemon-champion-2026.html` (rebuilt bundle)
- [ ] Root-level spec / doc (`CHAMPIONS_MECHANICS_SPEC.md`, etc.)

## Test Evidence

<!-- Paste output or link to artifacts. -->

- [ ] Syntax check: `node -c data.js engine.js ui.js` passes
- [ ] Coverage tests: `/tmp/coverage_tests.js` = N/N
- [ ] Audit run: `/tmp/audit.js` = 0 JS errors, XXXX battles, Ys elapsed
- [ ] Bundle rebuilt and size recorded: `pokemon-champion-2026.html` = NNN KB

```
<!-- paste key test output here -->
```

## Breaking / Behavior Changes

<!-- Describe any win-rate shifts, UI flow changes, or data shape changes. If none, say "None". -->

## Checklist

- [ ] Followed the draft-first rule for non-trivial changes (diff draft reviewed before source edits)
- [ ] No em-dashes in commit messages
- [ ] New globals referenced during init use `var` (TDZ-safe)
- [ ] Updated `CHAMPIONS_MECHANICS_SPEC.md` if mechanic behavior changed
- [ ] Bundle rebuilt and committed alongside source changes
- [ ] If `engine.js`, `data.js`, `ui.js`, `style.css` changed: ran `./tools/release.sh <tag>` and committed `sw.js`
- [ ] Updated `MASTER_PROMPT.md` to reflect this change (new feature, ticket, or infra update)
