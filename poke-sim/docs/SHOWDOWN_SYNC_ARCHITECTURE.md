# Showdown Sync Architecture

> Status: Draft architecture checklist.
> Owner repo: `TheYfactora12/Pokemon-Champions-Sim-Planner`.
> Goal: keep simulator data and validation current with Pokemon Showdown without turning the app into a static snapshot.

---

## Problem

The simulator currently has useful Showdown-derived assets and replay tooling, but the update path is not yet a full live pipeline. That creates two separate risks:

- Data drift: species, forms, moves, items, abilities, aliases, formats, and learnsets can change upstream while the app keeps using old generated files.
- Mechanics drift: the local engine can pass its own golden hashes while still disagreeing with the current Showdown simulator or with Champions-specific deltas.

One concrete mismatch already visible in both the TheYfactora and Alfredo trees:

- `BATTLE_DAMAGE_DOCUMENT.md` says Champions damage rolls should be discrete integer rolls `86..100`.
- `poke-sim/engine.js` still has a damage path labeled `Random roll 85-100%` using `0.85 + rng() * 0.15`.

That does not mean Showdown is wrong. It means the architecture needs two truth tracks:

- Showdown truth for official Pokemon data and standard Gen 9/VGC mechanics.
- Champions override truth for confirmed Champions-specific deltas.

---

## Target Architecture

```text
Pokemon Showdown upstream
  - data CDN
  - pokemon-showdown repo
  - simulator package / BattleStream
  - replay logs
        |
        v
Scheduled sync job
  - fetch source files
  - hash and diff
  - normalize IDs
  - classify changes
  - write artifacts
        |
        v
Supabase truth/audit layer
  - upstream source versions
  - normalized species/moves/items/abilities
  - sync run history
  - validation runs
  - drift findings
        |
        v
Generated app assets
  - pokemon_showdown_legal_data.js
  - move support audit
  - legality indexes
  - static PWA bundle
        |
        v
Validation layer
  - local engine golden tests
  - Showdown oracle simulations
  - Champions override tests
  - release gates
```

---

## Showdown Pull Targets

Primary source: `https://play.pokemonshowdown.com/data/`

| Source file | Purpose |
|---|---|
| `pokedex.js` | Species, forms, typing, base stats, forme metadata |
| `moves.js` | BP, accuracy, category, priority, flags, target rules |
| `abilities.js` | Ability names, descriptions, ratings, metadata |
| `items.js` | Item names, descriptions, berry data, fling data |
| `typechart.js` | Type effectiveness table |
| `aliases.js` | Name normalization and regional/form aliases |
| `learnsets.js` | Move legality per species/form |
| `formats-data.js` | Tier/format metadata where applicable |

Secondary source:

- `smogon/pokemon-showdown` repo for simulator code, protocol docs, and exact git commit references.
- `@pkmn/sim` for typed/package-based local simulator usage when browser or CI packaging matters.
- `@smogon/calc` for targeted damage-range checks where a full battle stream is heavier than needed.

---

## Supabase Additions

Keep the current `teams`, `team_members`, `analyses`, and golden battle tables. Add a sync/audit namespace through new migrations rather than changing `schema_v1.sql` directly.

### Best Practices

- Append-only by default: keep every sync run and validation run instead of overwriting history.
- Promote only reviewed data: scheduled jobs may detect changes and open PRs, but `main` should not silently change.
- Separate source data from approved app data: fetched Showdown data is raw evidence; generated assets are promoted release inputs.
- Use stable hashes: store SHA-256 hashes for raw source files and normalized outputs.
- Keep generated files deterministic: same inputs must produce byte-for-byte identical output.
- Use least privilege: frontend anon key can read approved data and insert public analyses only; sync/admin writes need server-side credentials.
- Preserve rollback ability: every promoted data update should reference source hashes, workflow run ID, and commit SHA.
- Classify mismatches before fixing: `upstream-drift`, `local-bug`, `champions-override`, or `unknown`.
- Never guess Champions behavior: unknown mechanics become findings, not silent fallbacks.

### Proposed Tables

| Table | Purpose |
|---|---|
| `showdown_sync_runs` | One row per scheduled sync attempt, with status, started/finished timestamps, source commit/version, and summary counts |
| `showdown_source_files` | File-level URL, fetched hash, previous hash, byte size, and parse status for each upstream file |
| `showdown_entities` | Normalized entity rows for species, moves, items, abilities, aliases, and learnsets |
| `showdown_entity_diffs` | Added/changed/removed entity records produced by a sync run |
| `mechanics_validation_runs` | One row per local-vs-oracle validation run |
| `mechanics_validation_findings` | Mismatches, severity, source, expected, actual, owner decision, and resolution status |
| `champions_overrides` | Confirmed Champions-specific deltas that intentionally differ from Showdown baseline |

### RLS Shape

- Public/anon can read latest approved normalized data and non-sensitive run summaries.
- Public/anon cannot update sync metadata.
- Sync writes should use GitHub Actions or an Edge Function with a server-side key, never the frontend anon key.
- Findings can be public read, but write access should be restricted to trusted automation/admin paths.

---

## Scheduled Jobs

Use GitHub Actions as the first scheduler. Supabase Edge Functions can come later if server-side scheduled writes become easier there.

### GitHub Actions Pattern

- Keep `.github/workflows/daily-sim-heartbeat.yml` read-only and deterministic.
- Add a separate `.github/workflows/showdown-sync.yml` with `schedule` and `workflow_dispatch`.
- Give the sync workflow `contents: read` while it only fetches and uploads artifacts.
- Add `pull-requests: write` only if/when it opens generated-data PRs automatically.
- Do not grant DB credentials to PRs from forks.
- Do not print raw Supabase keys, auth headers, or fetched credentials in logs.
- Use `concurrency` so overlapping daily jobs cannot race each other.
- Use artifacts for raw upstream snapshots; commit only normalized/generated outputs after review.
- Use manual `db-migrate.yml` for DDL migrations, matching the existing repo pattern.

| Schedule | Job | Output |
|---|---|---|
| Daily | Fetch Showdown data CDN files and compare hashes | Sync run row, source file hashes, diff summary |
| Daily | Rebuild `generated/pokemon_showdown_legal_data.js` if source changed | PR or artifact, not silent direct push |
| Daily | Run move legality and move support audits | Validation run rows |
| Daily | Run local golden battles | Current hash status |
| Daily | Run Showdown oracle smoke suite | Local-vs-Showdown mismatch findings |
| Weekly | Full data coverage audit | Species/form/move/item/ability gap report |
| Weekly | Replay sample refresh | New replay fixtures and parsing regressions |
| Manual dispatch | Promote sync output | Human-reviewed PR into `main` |

Default behavior should be "detect and open/report", not "auto-merge". Showdown data can change in ways that are correct upstream but not safe for Champions without override review.

---

## Oracle Strategy

### Use Showdown For

- Canonical data shape and IDs.
- Standard type chart behavior.
- Team packing/parsing conventions.
- Standard move targeting and battle protocol.
- Baseline Gen 9/VGC battle behavior.
- Replay protocol parsing checks.

### Do Not Blindly Use Showdown For

- Champions-specific damage roll window if confirmed as `86..100`.
- Champions-specific status nerfs.
- Champions Mega roster, abilities, and timing if not already upstream.
- Champions-specific Protect behavior and ability changes.
- Any custom format not present in upstream Showdown.

### Validation Modes

| Mode | Purpose |
|---|---|
| `data-sync` | Confirms upstream data parses and normalizes cleanly |
| `standard-oracle` | Compares local expected behavior against Showdown standard rules |
| `champions-override` | Confirms intentional differences are documented and tested |
| `release-gate` | Blocks bundle promotion when high-severity unknown mismatches exist |

---

## Implementation Checklist

### Phase 1: Inventory

- [ ] Confirm which repo branch is the active TheYfactora release branch.
- [x] Add `docs/SHOWDOWN_SYNC_ARCHITECTURE.md` to the spec index.
- [ ] Add a machine-readable source manifest, for example `tools/showdown_sources.json`.
- [ ] Record current generated data hash for `generated/pokemon_showdown_legal_data.js`.
- [ ] Record current upstream Showdown source URLs and fetched hashes.

### Phase 2: Fetch And Diff

- [ ] Build `tools/fetch_showdown_data.mjs`.
- [ ] Fetch each configured CDN source.
- [ ] Save raw source snapshots as CI artifacts, not committed blobs.
- [ ] Parse each source into normalized JSON.
- [ ] Produce entity-level diffs.
- [ ] Fail the job if a source file cannot parse.

### Phase 3: Supabase Sync Audit

- [ ] Add migration for `showdown_sync_runs`.
- [ ] Add migration for `showdown_source_files`.
- [ ] Add migration for `showdown_entities`.
- [ ] Add migration for `showdown_entity_diffs`.
- [ ] Add migration for `mechanics_validation_runs`.
- [ ] Add migration for `mechanics_validation_findings`.
- [ ] Add migration for `champions_overrides`.
- [ ] Add tests proving anon users cannot mutate sync tables.
- [ ] Add indexes on `run_id`, `entity_kind`, `entity_id`, `source_hash`, and `severity`.
- [ ] Add unique constraints that make repeated sync writes idempotent.

### Phase 4: Generated Assets

- [ ] Convert normalized Showdown data into `generated/pokemon_showdown_legal_data.js`.
- [ ] Keep the generated asset deterministic.
- [ ] Include upstream source version/hash in the generated file.
- [ ] Add a freshness check to CI.
- [ ] Open a PR when generated output changes.

### Phase 5: Showdown Oracle Harness

- [ ] Add `@pkmn/sim` or `pokemon-showdown` as a dev/runtime dependency for CI oracle tests.
- [ ] Create a minimal BattleStream smoke test with packed teams.
- [ ] Compare local engine output to Showdown for baseline cases.
- [ ] Store mismatch findings in Supabase when live credentials are enabled.
- [ ] Tag every mismatch as `upstream-drift`, `local-bug`, `champions-override`, or `unknown`.

### Phase 6: Champions Overrides

- [ ] Add `champions_overrides` seed rows for confirmed deltas.
- [ ] Add a specific finding for the `85-100` vs `86-100` damage roll path.
- [ ] Decide whether the local engine should implement discrete `86..100` rolls immediately or keep the path behind a format flag.
- [ ] Add tests that fail if a Champions override is used without a source/status.

### Phase 7: Release Gate

- [ ] CI blocks release if generated Showdown data is stale.
- [ ] CI blocks release if high-severity validation findings are unresolved.
- [ ] CI warns, but does not block, for low-confidence upstream description changes.
- [ ] Release notes include source versions and unresolved known issues.

---

## Open Decisions

- Should scheduled sync create PRs automatically, or only upload artifacts until the pipeline is stable?
- Should Supabase store full normalized entity snapshots or only hashes plus diffs?
- Should the static PWA read approved normalized data from Supabase at runtime, or keep using committed generated data with Supabase only as audit/history?
- Should Champions mode be implemented as a Showdown custom mod eventually, or should Showdown remain an external oracle only?
- Should the `86..100` roll change be patched now behind a `format: champions` flag before the oracle harness lands?

---

## Recommended First PRs

1. Add source manifest and fetch/diff script.
2. Add Supabase sync audit migrations.
3. Add a CI workflow that runs daily and manual dispatch, uploads artifacts, and does not mutate `main`.
4. Add a small oracle test harness with one or two deterministic Showdown battles.
5. Add a Champions override test for the damage roll window mismatch.

---

## Proposed First Migration Shape

Create this through a timestamped migration under `poke-sim/db/migrations/`, not by editing the baseline schema:

```sql
create table if not exists showdown_sync_runs (
  sync_run_id text primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'passed', 'failed', 'blocked')),
  upstream_ref text,
  workflow_run_id text,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists showdown_source_files (
  sync_run_id text not null references showdown_sync_runs(sync_run_id) on delete cascade,
  source_name text not null,
  source_url text not null,
  source_hash text not null,
  normalized_hash text,
  byte_size integer not null default 0,
  parse_status text not null check (parse_status in ('passed', 'failed', 'skipped')),
  parse_error text,
  fetched_at timestamptz not null default now(),
  primary key (sync_run_id, source_name)
);

create table if not exists mechanics_validation_findings (
  finding_id text primary key,
  sync_run_id text references showdown_sync_runs(sync_run_id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'blocker')),
  classification text not null check (classification in ('upstream-drift', 'local-bug', 'champions-override', 'unknown')),
  subject text not null,
  expected jsonb not null default '{}'::jsonb,
  actual jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'accepted', 'fixed', 'wontfix')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

Follow-up migrations can add the heavier `showdown_entities`, `showdown_entity_diffs`, and `champions_overrides` tables once the first sync job is producing stable normalized JSON.
