# Site Navigation Publication Evidence

Verified August 30, 2026 EDT (August 31 UTC). Scope: isolated homepage release, not the full audit branch.

## Reviewed Release

- PR: https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/193
- Reviewed candidate: `6fe9cd1e6ab9179da18579984d288b13653c9382`.
- Squash merge: `4f2cb179265d647706f4a1749c47d85e3e707043`.
- Candidate CI `33344503557`, bundle freshness `33344503525`, cache bump `33344503630`: passed before exact-head guarded merge. Independent scoped review found no remaining actionable issue.
- Pages deployment `33344630879`: passed.
- Post-merge CI `33344630871`: passed (syntax, change detection, test suite). Its production job and battle audit were skipped for this UI-only change; Pages publication was verified through the separate deployment above.

## Public Artifact

URL: https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/poke-sim/pokemon-champion-2026.html

- Build: `v2.2.138-site-navigation-fixes`.
- Repository bundle: 11,293,646 bytes; SHA-256 `a8d39b024ddc2e9656e5d38e498cc735230fcc960de925535e0b0f5b5059742e`.
- Deployed bundle: 11,293,894 bytes; SHA-256 `078fff650a4ef2fe154d1b50e09534f031de3232e48a464e6c3c947136cffa1a`.
- Downloaded public HTML matches the deployed manifest's exact byte count and hash. The manifest retains the expected repository hash and declares public Supabase runtime-config injection as the deployment mutation. No credentials were logged.

## Live Browser Checks

- Header displays v138.
- Edit a Team activates and focuses `tab-editor`.
- Upload Replay activates and focuses `tab-replay-coach`.
- Start Team Test activates and focuses `tab-simulator`.
- Home returns correctly. DOM contains No replay selected / Analysis pending instead of invented replay advice.
- Desktop screenshot inspected. No battle was run and no team was changed in this release smoke test, so no new battle-parity evidence is claimed.

## Remaining Work

- Public header reports DB connected but zero accepted teams and 36 stale/illegal rows blocked. This is a visible application diagnostic, not independent proof that all rows are illegal or that DB permissions/schema are correct.
- Public news currently includes July/June entries. The local curated-news pipeline was deliberately excluded from this release; freshness is not certified.
- Decorative homepage preview remains cramped at the tested desktop size: Analysis pending is in the DOM but not readable in the screenshot. Full responsive/beginner UX review remains open.
- Node-only intake normalization and read-only learnset audit remain local, with 148 fast and 12 offline/mock DB test files passed. No production DB rows, migrations, regulations or battle mechanics were changed in this release.
- Three bounded reference mechanics disagreements and full-game/visual-log parity remain open. This is not 99% accuracy certification or cross-repo parity.

This report is local audit-worktree documentation; the release scope is already documented in the merged candidate Markdown. Final publication evidence is also shared on PR #193 for the team.
