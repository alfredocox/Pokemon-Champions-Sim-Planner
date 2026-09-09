# Isolated Site Navigation Candidate

Base: main commit `88202b507f80c3c705699c5e43fc4aa9587e2081`. Candidate build: `v2.2.138-site-navigation-fixes`.

## Changes

- Homepage section buttons focus their destination panel. Arrow-key tab navigation retains its existing tab focus behavior.
- Edit a Team opens Set Editor directly.
- The static homepage preview no longer invents a turn-four result or lead recommendation; it shows No replay selected / Analysis pending.
- Regression tests and release/cache/bundle metadata reflect this isolated candidate.

## Boundaries

This branch deliberately does not include the large audit worktree's roadmap, news pipeline, simulation, regulation, database, workflow or Showdown-dependency changes. No schema migration or source promotion is part of this PR. A higher site build number does not establish newer mechanics or parity with the audit branch.

Local focused checks and independent review precede push. Hosted CI and deployment must be verified on the exact commit; do not merge or claim public deployment while required checks fail. Existing public Pages version remains separate until a successful reviewed deployment.

Normalization/source alignment continues independently as development-only reference work. No 99% game accuracy, live DB verification or full beginner UX certification is claimed.
