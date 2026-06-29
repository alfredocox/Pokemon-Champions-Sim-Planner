# Codex QA Connector

This workflow lets downloaded QA evidence feed future Codex work without a backend bridge from GitHub Pages.

## Site export

QA Artifact exports include `codex_context`, a compact summary of:

- build and source URL
- QA readiness
- damage/event/trace counts
- missing targeted proof
- Codex prompt guidance

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
3. Run `Stress Lite + QA`, `Tactical Sweep + QA`, `Run All + QA Artifact`, or `QA Artifact`.

Use `Stress Lite + QA` when full Run All may overload the tester machine. It exports a normal QA Artifact with `qa_run_type: "stress_lite_qa"` plus a `stress_lite` block that records the opponent cap, branch-run cap, memory guard, and boundary that this is capped stress evidence, not exhaustive Run All proof.

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

Codex should read the markdown first, then inspect the source artifact if a readiness item is yellow or red.

## Boundary

Raw QA artifacts should stay in the Mac drop folder, not GitHub. Commit only compact summaries when the team needs handoff context:

- `reports/codex-qa-context-latest.md`
- `reports/codex-qa-context-latest.json`

This does not automatically upload private battle data. The user chooses which downloaded files to ingest.
