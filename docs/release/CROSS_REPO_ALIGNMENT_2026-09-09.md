# Cross-Repo Candidate Alignment

## Compared Revisions

- Tested runtime: v2.2.162-release-roadmap-alignment, engine 1.1.10.
- Yfactor candidate: 3583faa8190121012a201da30c14372ad6b09c15.
- Alfredo review branch received that exact commit, not a cherry-picked copy.
- Yfactor main: 81bb0ef250dab05d46c7435f3a1a25899c9521b1.
- Alfredo main: 15f0f98194e9e766f660ec40945b6e070c0343ca.

The main histories have 68 Yfactor-only and 27 Alfredo-only commits. This is a
history comparison, not a count of missing features. `git merge-tree --write-tree
HEAD alfredo/main` completed without conflicts. Its tree,
4e4c66f60e042d020a5907c04e85b7b53c219b03, equals the tested candidate's tree.
Thus the inspected Alfredo history can be retained by a normal merge without
changing the tested files. No merge or force-push was performed.

## Review Path

- [Yfactor PR #195](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/195)
- [Alfredo draft PR #276](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/pull/276)

This documentation follow-up is to be copied to both candidate branches as the
same commit. Final remote heads and hosted check receipts belong on both PRs.
Yfactor runtime CI 34385410376, bundle 34385409861 and cache 34385409858 passed.
Alfredo CI must be checked independently; copied commits do not prove that its
repository workflow/configuration works. Skipped DB checks remain unverified.

## What Is Not Aligned

Neither main branch was updated, and live Pages still has the previously verified
v142 artifact. Both PRs remain held for the mechanics/security gates in the
[release review](RELEASE_REVIEW_2026-09-09.md). Existing Alfredo PRs #155, #156,
#176 and #185 were not closed or silently included; their acceptance contracts
need separate review. Issues and milestones are not automatically synchronized.

Next implementation slice: reproduce Toxic rounding against pinned Showdown and
add boundary regressions before changing the engine. Protected database staging
remains the higher release gate. Complete mechanics/security review before normal
merges, then verify deployed artifacts and paired browser/export logs. Candidate
file equality is not production parity, regulation approval or 99% accuracy.
