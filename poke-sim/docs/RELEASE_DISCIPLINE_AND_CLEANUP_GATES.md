# Release Discipline and Cleanup Gates

This project should not keep adding surface area until the active slice is clean, proven, documented, and understandable.

Use `99% closed` for work that is practically complete but still has normal residual risk, such as needing more live artifacts, more devices, more samples, or future source checks. Use `100% closed` only when the claim is fully source-backed, tested, deployed, and no known residual blocker remains.

## Why this exists

Recent work improved QA artifacts, claim boundaries, Team Lab trust, Battle Sensei replay review, source-truth handling, and public Pages deploy reliability. The weak pattern was not the direction. The weak pattern was jumping between slices before every slice had a clean closeout.

Use this document before starting the next feature.

## Required closeout questions

Every slice must answer these before it is treated as done:

1. What exact problem did this solve?
2. Which QA slice proves it?
3. What does the evidence prove?
4. What does the evidence not prove?
5. Which module owns the behavior?
6. Which test prevents regression?
7. Is the Roadmap updated?
8. Is the relevant source-truth or architecture doc updated?
9. Does the live Pages build show the correct version?
10. Did CI pass?

If any answer is weak, the slice is not closed. If the slice is useful but not absolute, mark it `99% closed` and name the exact remaining risk.

## Cleanup gates before new work

### Gate 1: Version discipline

Use one release theme per version. Avoid multiple tiny build bumps unless the live site is blocked.

Closeout proof:

- visible build ID matches `release_manifest.js`
- service-worker cache identity matches release manifest
- generated bundle artifact hash is refreshed
- build history preserves the prior version
- Pages URL is tested with the exact `?v=<build>&fresh=1`

### Gate 2: QA naming clarity

Use directive QA names and do not treat QA buttons as interchangeable.

- `Current Evidence QA`: current retained/generated evidence
- `Release Matrix QA`: broad matchup release evidence
- `Device-Safe Stress QA`: capped phone/low-memory-safe stress evidence
- `Tactical Coaching QA`: branch/decision coaching evidence

Closeout proof:

- button title says what the QA slice validates
- exported artifact includes `qa_claim_review`
- page renders `QA Claim Review`
- forbidden claims are visible
- next QA move is visible

### Gate 3: Claim-boundary discipline

Every feature that produces evidence must say what it cannot claim.

Forbidden unless explicitly proven:

- complete Pokemon Champion legality
- exhaustive battle mechanics proof
- global best-team ranking
- real ladder truth
- coaching certainty from low-sample evidence

Closeout proof:

- artifact has `source_gaps`
- artifact has `forbidden_claims`
- UI or docs explain the boundary
- tests assert the boundary stays present

### Gate 4: Documentation before expansion

Feature work is not done if the team cannot understand it later.

Closeout proof:

- Roadmap has shipped/open/next status
- architecture or source-truth doc is updated
- QA connector docs explain how to test it
- old names are replaced or clearly mapped

### Gate 5: Generated-file and repo-sync safety

Before pushing, fetch remote and preserve remote changes. Do not overwrite generated news, bundle, or artifact changes from another workflow.

Closeout proof:

- `git fetch origin main` before final push when remote automation may have run
- rebase/merge preserves remote commits
- bundle regenerated after conflict resolution
- no force push unless explicitly approved

When the conflict is only in generated files such as `poke-sim/pokemon-champion-2026.html`, `poke-sim/generated/release_artifact.json`, or `poke-sim/generated/news_feed.js`, do not hand-edit the bundle. Inspect the remote commit, keep the source changes from both sides, rerun `python3 poke-sim/tools/build-bundle.py`, rerun focused release tests, then continue the rebase or merge. This is the safe path for News Feed Sync versus feature-release races.

Preferred GitHub process:

- scheduled source/news sync should use a branch or PR when it changes generated deploy artifacts near active feature work
- release pushes should treat direct workflow commits to `main` as expected and rebase before push
- CI should keep bundle freshness, release manifest, and Pages artifact checks as required gates
- any force push, generated artifact overwrite, or branch protection bypass needs explicit human approval and a short audit note

### Gate 6: UI/runtime modularization pressure

Do not keep growing `ui.js` forever. If a slice adds a new subsystem, ask whether it belongs in a module.

Near-term cleanup candidates:

- QA artifact export/readout helpers
- Battle Sensei replay review UI
- Team Lab home/leaderboard UI
- Roadmap rendering/data
- source registry/news rendering

Closeout proof:

- new code has a clear owner
- tests target the owner
- unrelated behavior is not modified

## Stop-start rule

Before starting a new feature, pick one:

1. Close the current slice with proof.
2. Mark the current slice open with blockers.
3. Move the current slice into Roadmap next/open with exact remaining work.
4. Mark it `99% closed` with named residual risk when that is more honest than claiming 100%.

Do not leave it implicit in chat.

## Current cleanup priority

The next cleanup pass should focus on:

1. Keep the generated-artifact conflict guard active for News Feed Sync and feature-release races.
2. Roadmap alignment for the QA slice naming and claim-review system.
3. QA connector docs matching the new button names.
4. Architecture docs explaining what each QA slice proves.
5. Tests that prevent the old vague QA labels from returning.
6. A short module-split plan for QA export/readout code before adding more QA UI.
