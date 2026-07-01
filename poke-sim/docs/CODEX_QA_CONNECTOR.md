# Codex QA Connector

This workflow lets downloaded QA evidence feed future Codex work without a backend bridge from GitHub Pages.

## Site export

QA Artifact exports include a top-level `proof_manifest`, a compact evidence index for:

- build and source URL
- QA run type and proof tier
- retained replay, damage, effect, trace, targeted sweep, and tactical sweep counts
- coverage flags for tactical, Stress Lite, targeted sweep, and DB status evidence
- known limits, including browser retention caps and Stress Lite not being exhaustive Run All proof
- the recommended next action

They also include `codex_context`, a compact summary of:

- build and source URL
- QA readiness
- damage/event/trace counts
- missing targeted proof
- Codex prompt guidance

QA exports also include a top-level `qa_claim_review` and the page renders the same review after export. Treat that as the first screen a QA lead reads:

- `verdict` says whether this artifact is release/battle proof for its captured scope or still blocked/partial.
- `evidence_scope` shows the run type, sample size, damage events, effect events, trace rows, and branch rows.
- `source_gaps` names missing evidence such as build/source URL gaps, missing damage rows, missing targeted proof, or missing branch rows.
- `forbidden_claims` names what the artifact must not be used to claim, including complete Champion legality, exhaustive mechanics proof, global best-team ranking, or official ladder truth.
- `reviewer_next_step` gives the next QA action before code or product claims should move forward.

## QA slice names

Use the button names literally; they are not interchangeable.

| Button | QA slice | Use when | What it can prove | What it cannot prove |
| --- | --- | --- | --- | --- |
| `Current Evidence QA` | Current retained evidence and generated proof | You already ran sims or need a compact artifact from the current browser state | Captured build/source, retained evidence totals, targeted proof status, claim boundary, next QA action | Exhaustive matchup coverage or full release matrix proof |
| `Release Matrix QA` | Broad release matchup sweep | Desktop can safely run the broader matchup matrix | Cross-matchup release evidence from the selected scope with retained replay/effect/damage proof | Safe phone performance or exhaustive game-tree proof |
| `Device-Safe Stress QA` | Capped browser-safe stress proof | Phone, low-memory device, or any machine where Run All may overload | Under-50 MB stress evidence, capped branch proof, Josh-readable logic/calculation totals | Exhaustive Run All proof |
| `Tactical Coaching QA` | Branch/decision coaching proof | You need to test tactical lines, speed-control windows, lead choices, move/target branches, and coaching recommendations | Branch rows, tactical sweep coverage, coaching focus, next missing decision proof | Official legality, real ladder truth, or global best-team ranking |

## Local drop workflow

Default Mac drop folder:

```text
/Users/kevinmedeiros/Champions-QA-Drops
```

1. Download a QA Artifact or turn-log JSON from the site.
2. Move it into the default drop folder.
3. Run:

```bash
cd poke-sim
npm run codex:qa
```

## Page one-click folder save

On browsers with File System Access support:

1. Click `Set QA Drop Folder`.
2. Pick `/Users/kevinmedeiros/Champions-QA-Drops`.
3. Run `Device-Safe Stress QA`, `Tactical Coaching QA`, `Release Matrix QA`, or `Current Evidence QA`.

Use `Device-Safe Stress QA` when full Run All may overload the tester machine. It exports a normal QA Artifact with `qa_run_type: "stress_lite_qa"` plus a `stress_lite` block and `proof_manifest.proof_tier: "stress_lite"` that record the opponent cap, branch-run cap, memory guard, and boundary that this is capped stress evidence, not exhaustive Run All proof.

`v2.2.18` and later also surface a compact `stress_lite.summary` block and top-level totals such as `turns_total`, `action_rows_total`, `damage_events_total`, and `effect_events_total`. That lets Codex and the team judge run size, evidence weight, and coaching signal without re-walking the full `qa_coverage_summary`.

The page writes the artifact JSON directly into the chosen folder for the current browser session. If the browser does not support folder write access, it falls back to normal download; move the file into the drop folder manually.

Only ingest the newest file:

```bash
npm run codex:qa -- --latest
```

Use another folder:

```bash
npm run codex:qa -- --drop-dir /path/to/qa-folder
```

Multiple files are allowed:

```bash
npm run codex:qa -- /path/to/champions-sim-qa-artifact-1.json /path/to/champions-turn-log-2.json
```

The command writes:

- `reports/codex-qa-context-latest.json`
- `reports/codex-qa-context-latest.md`

Codex should read the markdown first, then inspect `proof_manifest` and `codex_context` in the source artifact if a readiness item is yellow or red.

## Showdown HTML replay workflow

Downloaded Showdown replay HTML files are first-class player-match evidence for coaching, match review, and sim calibration.

Default Mac replay folder:

```text
/Users/kevinmedeiros/Downloads/battles
```

Run:

```bash
cd poke-sim
npm run showdown:replays
```

Use another folder:

```bash
npm run showdown:replays -- --replay-dir /path/to/battles
```

Only ingest the newest replay:

```bash
npm run showdown:replays -- --latest
```

The command writes:

- `reports/showdown-replay-context-latest.json`
- `reports/showdown-replay-context-latest.md`

Boundary:

- Showdown HTML replays are replay/meta/coaching evidence.
- They can teach what happened in real matches, reveal common lines, and generate sim calibration targets.
- They must not overwrite official Champion legality or mechanic truth.
- Unknown team IDs stay mapped as `showdown:p1:*` / `showdown:p2:*` until linked to Team Lab teams.
- Structured app-specific `damage_events` are not reconstructed by the importer yet; raw Showdown protocol events are preserved for the next parser layer.

## Boundary

Raw QA artifacts should stay in the Mac drop folder, not GitHub. Commit only compact summaries when the team needs handoff context:

- `reports/codex-qa-context-latest.md`
- `reports/codex-qa-context-latest.json`

This does not automatically upload private battle data. The user chooses which downloaded files to ingest.
