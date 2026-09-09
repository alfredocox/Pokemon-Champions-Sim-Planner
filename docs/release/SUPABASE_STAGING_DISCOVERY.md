# Supabase Staging Discovery

Read-only configuration check following the v149 homepage preview work.

## Confirmed

- Connected Supabase account lists one project: `TheYfactora12's Project`,
  reference `ymlahqnshgiarpbgxehp`, ACTIVE_HEALTHY.
- Branch inventory lists only default `main` with the same project reference.
- GitHub repository environment inventory lists only `github-pages`; its secret
  inventory is empty. Repository variable inventory is empty.
- Repository secret names include `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_DB_URL_P`, and
  `SUPABASE_DB_URL_T`. No secret values were retrieved or printed.
- The current GitHub CI workflow expects `SUPABASE_TEST_URL` and
  `SUPABASE_TEST_ANON_KEY`; neither appears in the repository secret inventory.

## Boundary And Next Step

### Follow-Up: Alfredo Repository Checked

The initial GitHub inventory above covered TheYfactora12 only. A subsequent
read-only check also covered `alfredocox/Pokemon-Champions-Sim-Planner`:

- Only `github-pages` appears in its environment inventory; that environment has
  no secrets or variables. Repository variables are also empty.
- Repository secrets list only `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Its default-branch CI uses those shared secrets for live tests, rather than
  the dedicated `SUPABASE_TEST_*` contract in TheYfactora12's current CI.
- Its migration workflow selects `_T`, then falls back to `_P`, then the generic
  database URL. None of these database secrets appears in its repository inventory.
  This fallback is not an isolation guarantee and needs review before use.

Neither repository inventory establishes an isolated staging target. Secret
values were not read, and neither repository's workflows were dispatched. The
connected Supabase account inventory does not establish what exists in another
account owned by Alfredo. The repositories' database workflows are not aligned.

No isolated staging database is confirmed in the connected account. The `_T`
secret name is not evidence of an isolated target. GitHub secret metadata cannot
establish its destination. An organization-secret inventory request returned 422;
no organization-level configuration is claimed verified.

Do not run mutation, two-user fixture, or migration tests against the known main
project. Either identify an existing isolated project accessible to the owner or
approve provisioning a staging branch/project, including cost. Configure the
exact CI test-secret names after verifying that target differs from production.
Read-only production grants/migration verification can proceed separately.

No workflow dispatched, secrets changed, database mutated, or staging created.
