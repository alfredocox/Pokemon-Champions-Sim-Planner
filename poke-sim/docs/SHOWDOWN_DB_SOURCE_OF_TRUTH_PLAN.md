# Showdown DB Source Of Truth Plan

> Goal: make Pokemon Showdown mirrored rows the canonical static data source, then layer Champions-specific overrides on top before generating app assets.

Operational guardrails for preventing drift and improving review/testing are tracked in `../../docs/release/SOURCE_OF_TRUTH_GUARDRAILS_2026-06-19.md`. Runtime naming equivalents are tracked in `SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md`.

## Why This Plan Exists

The app currently has useful static data in `data.js`, generated Showdown legal data in `generated/pokemon_showdown_legal_data.js`, and local engine tables for mechanics such as priority. That works, but it creates drift risk:

- Showdown can update move/species/item/ability data.
- Champions can intentionally differ from Showdown.
- Hand-maintained JS tables can silently fall out of sync.

The target model is:

```text
Pokemon Showdown upstream
  -> raw source snapshots
  -> normalized showdown entity rows
  -> reviewed/approved app data views
  -> Champions override rows
  -> generated JS bundle + local engine drift tests
```

The browser may still receive generated JS for offline GitHub Pages support. The database becomes the source of truth, not the hand-authored JS tables.

## Current Runtime Bridge

As of 2026-06-06, the battle engine treats generated Pokemon Showdown move rows as the primary metadata layer for imported/custom moves. Move type, category, base power, accuracy, priority, target, and contact flags read from `generated/pokemon_showdown_legal_data.js` first when a row exists; local JS tables remain as a fallback for Champions-only/custom gaps until Supabase approved views are live. As of 2026-06-23, generated move rows also preserve official Pokemon Showdown `data/text/moves.ts` `shortDesc`/`desc` text for QA review context.

As of 2026-06-22, generated Showdown move `target` values are not consumed raw by battle logic. `runtime_data.js` canonicalizes upstream names such as `allAdjacentFoes` into engine categories such as `all-adjacent-foes`; `engine.js` normalizes again at the execution boundary and keeps a tested fallback only for engine-only VM harnesses. This prevents a DB/generated vocabulary change from silently becoming a targeting behavior bug.

As of 2026-06-10, battle construction also prefers generated Showdown species stats/types before local fallback tables. Browser-exported turn logs were checked against the generated species table; all logged species resolved, and a stale Farigiraf fallback stat row was corrected to Showdown's `120/90/70/110/70/60`.

Damage-based recoil is now resolved from Showdown-compatible recoil metadata when present, with a checked local bridge table for the current generated file. This covers common imported recoil moves such as Brave Bird, Double-Edge, Wild Charge, Volt Tackle, Wood Hammer, Take Down, Submission, Head Charge, Head Smash, Flare Blitz, Wave Crash, and Light of Ruin.

This is not the final DB state. As of 2026-06-25, the repo has the `showdown_entities`, `showdown_entity_diffs`, `champions_overrides`, `approved_showdown_entities`, and `approved_champions_data` migrations; live approved views generated the committed runtime asset with 8,653 approved entities and 0 active overrides; and the repo has a deterministic approved-data generator with the Phase 4 compatibility alias `tools/generate_showdown_data.mjs`. The remaining source-truth gate is seeding/reviewing Champions overrides and keeping static offline fallback visible.

## Source Boundaries

### Mirror Showdown 1:1

These should be stored exactly as normalized Showdown-derived rows:

- moves: `priority`, `target`, `flags`, `type`, `category`, `basePower`, `accuracy`, `pp`, `status`, `volatileStatus`, `sideCondition`, `slotCondition`, `pseudoWeather`, `boosts`, `secondary`, `secondaries`, `self`, `drain`, `recoil`, `multihit`, `critRatio`, `selfSwitch`, `shortDesc`, `desc`
- species/forms: names, ids, base species, formes, required items, types, base stats, abilities, aliases, learnsets
- items: ids, names, fling data, berry flags, mega stone fields, descriptions
- abilities: ids, names, ratings, descriptions, nonstandard flags
- type chart and format metadata

### Keep Champions Overrides Separate

These should be explicit override rows with source notes and tests:

- Champions damage roll range
- Champions status nerfs
- Champions Mega forms and custom abilities
- Champions-specific ability/item behavior
- Champions-specific Protect, terrain, priority, or timing deltas
- local tournament/team metadata not present upstream

Never edit mirrored Showdown rows to "look like Champions." Apply overrides in a separate layer.

## Database Phases

### Phase 0 - Current State

Already present:

- `showdown_sync_runs`
- `showdown_source_files`
- `mechanics_validation_runs`
- `mechanics_validation_findings`
- migration candidate `db/migrations/2026_06_07_showdown_entities_approved_views.sql`
- `tools/fetch_showdown_data.mjs`
- `tools/generate-approved-data-from-db.mjs`
- `tests/showdown_priority_drift_tests.js`
- `tests/showdown_approved_data_generator_tests.js`

Current live status as of the 2026-06-10 handoff:

- the Showdown sync/audit and approved entity/view migrations have passed in the Kevin fork workflow
- an unapproved live write has succeeded with 1 sync run, 8 source files, and 8651 entity rows
- approved promotion remained skipped for that run because `approve=false`
- approved read views are still not the production generation source for the public bundle

### Phase 1 - Add Entity And Override Tables

Migration target:

- `showdown_entities`
- `showdown_entity_diffs`
- `champions_overrides`
- `approved_showdown_entities` view
- `approved_champions_data` view

Repo status:

- `db/migrations/2026_06_07_showdown_entities_approved_views.sql` creates the target objects.
- Anon reads are limited by RLS to `approved = true` entities and `status = 'active'` overrides.
- No anon INSERT/UPDATE/DELETE policy is granted for mirror, diff, or override rows.

Recommended table shape:

```sql
showdown_entities (
  entity_id TEXT PRIMARY KEY,
  sync_run_id TEXT REFERENCES showdown_sync_runs(sync_run_id),
  entity_kind TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  data JSONB NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sync_run_id, entity_kind, entity_key)
)
```

```sql
champions_overrides (
  override_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  field_path TEXT NOT NULL,
  override_value JSONB NOT NULL,
  reason TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
)
```

RLS:

- anon can read approved entities and active overrides
- anon cannot mutate sync, entity, diff, or override rows
- GitHub Actions/DB migration path handles writes with server-side credentials

### Phase 2 - Promote Fetch Output Into DB

Use `tools/write_showdown_data_to_db.mjs` after `tools/fetch_showdown_data.mjs` to:

- write a `showdown_sync_runs` row
- write `showdown_source_files`
- upsert normalized `showdown_entities`
- produce `showdown_entity_diffs`
- leave new rows unapproved until reviewed

Default job behavior:

- detect and report
- do not auto-approve
- do not auto-merge generated assets without review

Local dry run:

```bash
npm run showdown:sync
npm run showdown:write-db -- --dry-run
```

Trusted DB write, for local admin or GitHub Actions only:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npm run showdown:write-db -- --sync-run-id showdown_YYYYMMDD
```

Promotion mode is disabled as of 2026-08-30. The legacy `--approve` option now
fails before artifact reads or network access, including dry runs. A replacement
must approve an exact reviewed immutable sync-run ID and SHA-256 digest and
publish a complete snapshot atomically. Do not refetch during approval or use
manual row flags as a substitute. See the [current review gate](../../docs/release/REGULATION_WATCH_2026-08-30.md).

The public browser must never receive `SUPABASE_SERVICE_ROLE_KEY`; it can only
read approved rows through anon-safe views/policies.

### Phase 3 - Generate App Data From DB Views

Generator:

```bash
node tools/generate-approved-data-from-db.mjs
```

It reads approved DB views through Supabase REST when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set. For CI and review, it can also read fixture/artifact JSON:

```bash
node tools/generate-approved-data-from-db.mjs \
  --entities artifacts/showdown-sync/approved_entities.json \
  --overrides artifacts/showdown-sync/approved_overrides.json \
  --out generated/pokemon_showdown_legal_data.js
```

It emits deterministic artifacts:

- `generated/pokemon_showdown_legal_data.js`
- runtime `ChampionsSim.pokemonDataAudit` rows using Showdown as primary metadata
- generated species/type/stat maps that can replace hand-maintained static sections over time

Generated files must be deterministic and diff-friendly.

### Phase 4 - Migrate JS Static Tables Gradually

Suggested order:

1. Move priority validation first. Already started with `showdown_priority_drift_tests.js`.
2. Move `MOVE_TYPES`, `MOVE_CATEGORY`, `MOVE_BP`, and `MOVE_TARGETS` to generated data.
3. Move species stats/types to generated approved data with Champions overrides.
4. Move item/ability metadata to generated approved data.
5. Keep `TEAMS` as curated app/team data, then migrate shared team catalog separately.

Engine code should ask a local adapter for data instead of reading many global constants directly.

Example adapter target:

```js
ChampionsData.moves.get(moveName).priority
ChampionsData.moves.get(moveName).target
ChampionsData.species.get(speciesName).stats
ChampionsData.overrides.get('move', 'Expanding Force')
```

### Phase 5 - Drift And Oracle Release Gates

Add release gates:

- `showdown_priority_drift_tests.js`: local priorities vs Showdown metadata
- move target drift test: local `MOVE_TARGETS` vs Showdown target
- move category/BP/type drift test
- species stats/types drift test
- item/ability coverage drift test
- Showdown oracle smoke cases for behavior that cannot be represented as rows

Classify every mismatch:

- `local-bug`
- `upstream-drift`
- `champions-override`
- `unknown`

Unknown or blocker findings should stop release promotion.

## First Implementation Slice

1. Done in repo: add the missing DB tables/views for `showdown_entities`, `showdown_entity_diffs`, and `champions_overrides`.
2. Done in repo: add tests proving anon read-only approved/active behavior and no anon write policy.
3. Done in repo: add a deterministic generator from approved rows to `ChampionsSim.pokemonDataAudit`.
4. Done in live project per Alfredo #241: approved Showdown entity rows exist in Supabase.
5. Done in repo: `write_showdown_data_to_db.mjs` produces DB-ready entity/diff rows from sync artifacts.
6. Done in repo: dry-run/report paths list sync and entity counts before writes.
7. Done in repo: GitHub Actions can dry-run, write, and approve-promote rows.
8. Done locally: live approved-view generation produced the committed runtime asset with 8,653 approved entities and 0 active overrides.
9. Next: seed/review Champions-specific override rows or explicitly sign off that no active overrides are required.

## Acceptance Criteria

- A fresh Showdown sync can be run without changing app behavior.
- A sync produces hashes, entity counts, and diffs.
- Champions overrides are visible and reviewable.
- Generated app assets are deterministic.
- Priority, target, type, category, and BP drift are tested.
- The GitHub Pages app still works offline from generated assets.
