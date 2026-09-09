# Regulation And Database Diagnosis - 2026-09-03

## Decision

Competitive regulation use remains blocked. Regulation M-B ended at 2026-09-02 01:59 UTC according to the retained official notice, and no reviewed successor package is present in the repository. The app must say that plainly instead of guessing the next regulation. Practice remains available and explicitly unverified.

The live Supabase project responded successfully, but its shared roster is not aligned with the current evidence contract. The browser must distinguish a reachable database from an accepted database catalog and keep the bundled roster authoritative when every live row is rejected.

## Read-Only Live Evidence

- Project: `ymlahqnshgiarpbgxehp`.
- Rows: 1 ruleset, 36 teams, 204 team members, 5,601 analyses and 16,980 branch-coverage rows.
- Team shape: 34 `builtin` six-member rows and two `retired_legacy` rows with zero members.
- Identity drift: all 36 teams use legacy `champions_reg_m_doubles_bo3`; zero carry `build_id`, `schema_version`, or `ruleset_version` metadata.
- Migration ledger: the live project records four migrations while the repository contains later schema and policy work. No migration was applied during this review.
- Security advisor: one informational `rls_enabled_no_policy` notice for `showdown_entity_diffs`. This is fail-closed API access, not proof that the broader permission model is launch-ready.
- Performance advisor: twelve foreign keys lack covering indexes, including `team_members.team_id`; several young indexes are reported unused. Review query patterns before adding or removing indexes.

Supabase remediation references: [RLS enabled without policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Change

- Add a deterministic dated-coverage check with the exact M-B UTC end. After that instant, the runtime reports `successor_required` and does not invent an ID.
- Display `Current regulation not verified` beside simulation regulation status when no reviewed package covers today.
- Require nonempty schema/build identity and an exact ruleset-version match before a DB team can replace bundled data; classify every rejected team with structured reason counts.
- Show `[DB review needed]` when Supabase responds but accepts zero teams. The tooltip states that the bundled roster remains authoritative.

## Boundaries

This change does not identify the post-M-B regulation, promote M-B, repair or reseed live rows, apply migrations, prove two-user isolation, or establish 99% game accuracy. A human must capture and approve the current official or in-game regulation evidence. Production database changes require a separate reviewed migration and staging denial/readback evidence.

## Verification

- Focused regulation selection: 15/15 passed, including before/after M-B boundary and invalid-date behavior.
- Catalog merge: 35/35 passed, including accepted exact version identity and rejected stale identity.
- DB status: 4/4 passed, including the all-blocked review state.
- Full project gate: 155 fast files and 12 offline/mock DB files, zero failing files.
- Accuracy harness: 2,312 doubles plus 2,312 shared-mechanics singles battles; zero state failures, validator errors, validator warnings or repeatability failures.
- Bundle: `v2.2.143-regulation-db-truth`, 11,479,875 bytes, SHA-256 `dec3c18e6331d8a1620b8401fc7622ed630ad0f99c871233073a73b9886ec85d`.
