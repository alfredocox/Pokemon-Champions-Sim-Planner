# Supabase Public Launch Gate

Decision: **not approved for unrestricted public use**. Development can continue with synthetic/local data. No production rows, grants, policies, keys, or migrations were changed in this verification slice.

## Authorized Live Readback - 2026-09-02

Read-only administrative access was obtained for project `ymlahqnshgiarpbgxehp` (`TheYfactora12's Project`, `us-west-2`, Postgres `17.6.1.111`). No rows, grants, policies, keys or migrations were changed.

- All 16 public base tables have RLS enabled. No public `SECURITY DEFINER` functions exist.
- The live migration ledger contains only four April 2026 entries. It does not prove application of the later repository migrations.
- The security advisor reports one informational finding: `showdown_entity_diffs` has RLS but no policy. Anonymous reads return zero rows, which is fail-closed but not a complete reviewed contract.
- Production still has anonymous `INSERT` policies on `analyses`, `analysis_win_conditions` and `branch_coverage_runs`, plus an anonymous `UPDATE ... USING (true) WITH CHECK (true)` policy on every `branch_coverage_runs` row. The repository's unapplied `2026_08_29_public_data_integrity_hardening.sql` removes these policies and write grants.
- A real `SET LOCAL ROLE anon` readback saw 5,601 analyses, 11,972 win-condition rows, 16,980 branch-coverage rows, 17,306 Showdown entities, 36 teams and 204 team members. These are shared evidence/catalog rows, not owner-isolated saves.
- No public table contains a user, owner or creator identity column. Two-user private-save isolation is therefore not implemented in the deployed schema and cannot be certified by inventing two test users.
- The performance advisor reports 12 uncovered foreign keys and eight currently unused indexes. These are optimization findings, not proof of a security bypass.

The live result changes the launch gate from "administrative access unavailable" to **verified blocked**. The next safe action is review of the exact hardening migration, protected staging application, anonymous HTTP denial tests, then a separately designed owner-scoped private-save schema and two-user test.

## Evidence Boundaries

- Source review targets the published v138 candidate's `poke-sim/db` at `6fe9cd1e6ab9179da18579984d288b13653c9382`, merged as `4f2cb179265d647706f4a1749c47d85e3e707043`.
- The separate audit worktree contains earlier hardening proposals. Local SQL is not proof of applied production controls.
- No Supabase administrative MCP tools or database credential environment variables are available in this session. The `psql` and Supabase CLI executables are absent; Docker CLI is installed but its Linux daemon is not running.
- GitHub secret names and workflow references do not reveal secret values or establish DB privileges. Never extract privileged secrets into logs or public artifacts to enable an audit.
- Formal source scan: `459dc437-1bfb-4cf3-8fa3-367f20386396`, completed across all 29 scoped DB files with independent baseline/architecture review and parent source validation. Five medium source-level authorization findings: shared catalog writes, analysis-child injection, shared QA updates, mixed-visibility evidence reads, and hidden-detail replay disclosure. Live exploitability remains unverified.
- Generated report and canonical manifest/findings/coverage are kept locally under `C:/Users/The Rig/AppData/Local/Temp/codex-security-scans-cAUYIa/site-intake-release/6fe9cd1e6ab9179da18579984d288b13653c9382_20260831T003844Z_d2jksu03/`. No public vulnerability issue or disclosure was created.

## What Changed Locally

- Corrected three misleading M9 checks: migration-ledger presence, security advisor and performance advisor no longer count local file existence or mocked responses as live proof. Offline execution marks them not verified; explicitly requesting live mode fails closed while the actual checks remain unimplemented.
- Added `poke-sim/db/diagnostics/security_readback.sql`: read-only metadata inventory of effective table/column/sequence privileges, RLS flags and policies, callable/definer routines, view security options, default grants, selected constraints and ledger/table presence. It reads no application row payloads or secret/function bodies. Use `psql "$AUDIT_DB_URL" -X -v ON_ERROR_STOP=1 -f poke-sim/db/diagnostics/security_readback.sql`, or an authorized SQL editor that rejects partial/error results. It does not by itself prove migration contents, actual API exposure or backup configuration.
- Added `poke-sim/db/diagnostics/security_isolation_staging.sql`: rollback-only synthetic two-identity SQL subset for private team/member saves, cross-owner checks and mixed public/private evidence. It requires explicit disposable-environment confirmation. This is **prepared, not executed**; real Auth sessions and HTTP requests still need a separate test.
- Four reporting/readback contract tests pass, including permissive-policy/grant mutation checks. Independent tooling review confirmed the bounded fixes; SQL itself remains unexecuted. Full local gate before the final lexical-guard refinement: 149 fast-test files and 12 offline/mock DB files pass; the four focused tests were rerun after that refinement. Within M9, eight local checks pass and three administrative checks remain explicitly not verified. Passing test-file counts do not imply live DB security.

## Bounded Public Readback

At `2026-08-31T00:48:48Z`, the deployed public configuration classified as legacy JWT role `anon`; no configured privileged key was used. HEAD-only requests (zero row payloads, no mutations) returned HTTP 200 for `approved_showdown_entities` and `teams`, and HTTP 404 for `team_lab_teams` and `trainer_profiles`. A 404 may mean absent/unexposed/schema-cache state, not proven security isolation or migration absence.

The public HTML SHA-256 remains `078fff650a4ef2fe154d1b50e09534f031de3232e48a464e6c3c947136cffa1a`. No service-role JWT or `sb_secret_` key matching the scanner's patterns was found in that HTML. This is a bounded pattern/key-classification check, not proof that every asset, historical log or alternate secret encoding is clean. Only secret names were listed in GitHub, never values.

GitHub settings readback: `main.protected=false`, repository rulesets empty, and only `github-pages` environment listed with a branch policy but no required-reviewer protection. No `production` environment appears in this readback. Repository secret names include the public config, service-role key and DB URLs, but their values and the privileges they convey were not accessed. Protect the migration/promotion path before production changes.

## Launch Checklist

| Gate | State | Required evidence |
|---|---|---|
| Live RLS, roles and grants | Verified blocked on 2026-09-02 | Recheck after the exact hardening candidate is applied in protected staging |
| Applied migrations | Verified drift: only four April 2026 ledger rows | Ordered migration ledger, reviewed file digests and resulting schema; resolve dependency order before staging |
| Shared catalog/evidence write protection | Live anonymous writes confirmed | Reviewed hardening migration plus anonymous/authenticated POST, PATCH and DELETE denial tests in isolated staging; no blanket grants |
| Private user data | Not implemented in deployed public schema | Two real staging users: owner save/read/update/delete succeeds; other user and anon cannot access or mutate the fixture |
| Combined evidence privacy | Not approved | Mixed public/private, private/private, hidden-details and missing/empty participant cases denied or explicitly redacted |
| Privileged keys | Public configured key is anon; bounded HTML scan clean | Review remaining assets/logs and server job scope; service/database keys confined to protected server-side jobs |
| Backups and recovery | Unverified | Current backup/PITR policy, retention/RPO/RTO, successful isolated restore and storage-object recovery plan |
| Abuse and operational limits | Unverified | Server-enforced write quotas, payload limits, rate limits, monitoring/alerts and resource/spend ceilings |
| Production release protection | Blocked: unprotected main, empty rulesets, no required deployment reviewer shown | Reviewed exact migration/artifact, protected approval, rollback plan and post-change readback |

## Two-User Test Matrix

Use two separate staging Auth accounts and an anonymous client. Create synthetic fixtures only. Capture named project, build/commit, migration digests, policy readback, actor alias, operation, status, affected-row count and sanitized assertion results. Never export access/refresh tokens, email addresses or real replay contents.

1. Establish positive controls: both users can create and read their own private team, member, trainer room and replay import. Failed auth, absent tables or malformed requests are setup failures, not denied-access passes.
2. Attempt cross-user SELECT, INSERT of children, UPDATE, owner reassignment, moving children to another parent, and DELETE. Check returned rows and read back as the owner; an HTTP success with zero rows can be a correct RLS denial, but a row actually changed is a failure.
3. Repeat with anon. Shared Pokemon/source/approval/catalog/analysis/coverage tables must reject untrusted writes. Do not run destructive denial attempts on production rows.
4. Test mixed public/private battle runs and jobs, private/private pairs, hidden-details members copied into replay JSON, private opponent IDs, empty arrays, nonexistent participant IDs and NULL ownership. Visibility of one participant never authorizes all payloads.
5. Test separate views, RPCs, Storage and Realtime wherever enabled; a REST table check does not cover these interfaces.
6. Sign out and test session lifecycle according to the configured token/revocation contract. Restore/cleanup only the exact synthetic fixture IDs and confirm cleanup; never broad-delete shared tables.

The SQL fixture exercises a subset of steps 1-4 using database JWT claims. It does not create Auth accounts, test HTTP JWT verification, cover all private tables or certify deletion/session behavior. It must not be advertised as the completed two-user gate.

Earlier local privacy proposals also require adversarial validation: `NOT EXISTS` against a parent table filtered by RLS can incorrectly succeed when private parent rows are invisible. Do not blindly apply the earlier local migration edits as a proven privacy fix; require positive authorization for every referenced identity and tests for hidden/missing parents.

Current reference guidance: [Supabase RLS and testing](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API permissions and request limits](https://supabase.com/docs/guides/api/securing-your-api), [backup and recovery](https://supabase.com/docs/guides/platform/backups). SQL role tests supplement, not replace, Auth/HTTP and operational recovery tests.

## Tool Accounting

The security tool reported aggregate usage across five task contexts: 10,713,553 total tokens, including 10,180,736 cached-input tokens; 56,339 output tokens. This is tool-reported thread/rollout accounting, not an isolated incremental or billing estimate for the database scan. TAC advisory lookup was unavailable because its connector was not connected; the scan completed regardless.

## Next Action

Review the exact hardening migration, apply it only in a protected disposable/staging project, and run anonymous HTTP denial tests. Then design owner-scoped private persistence and complete the two-real-user isolation matrix. Production hardening requires a reviewed artifact fingerprint, rollback plan and post-change readback. Keep public data collection behind this security priority.
