-- Administrative metadata only. No user rows, key material, or function bodies.
-- Run in an authorized SQL session; this does not certify HTTP/Auth isolation.
-- With psql, require: psql "$AUDIT_DB_URL" -X -v ON_ERROR_STOP=1 -f <this-file>
-- Reject partial/error output. A SQL-editor runner must likewise stop on errors.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '2s';

SELECT current_timestamp AS captured_at,
       current_setting('server_version') AS server_version,
       current_user AS audit_role,
       current_setting('transaction_read_only') AS read_only,
       current_setting('pgrst.db_schemas', true) AS session_exposed_schemas_hint;
-- A NULL hint does not prove which schemas the hosted API exposes. Check settings.

SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', current_user)
ORDER BY rolname;

-- Effective privileges include inherited/PUBLIC grants, unlike direct ACL text.
SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       pg_get_userbyid(c.relowner) AS owner_role, r.rolname AS browser_role,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS schema_usage,
       has_table_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       has_table_privilege(r.oid, c.oid, 'INSERT') AS can_insert,
       has_table_privilege(r.oid, c.oid, 'UPDATE') AS can_update,
       has_table_privilege(r.oid, c.oid, 'DELETE') AS can_delete,
       has_table_privilege(r.oid, c.oid, 'TRUNCATE') AS can_truncate,
       c.reloptions AS view_security_options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE r.rolname IN ('anon', 'authenticated')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND n.nspname NOT LIKE 'pg_temp%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY n.nspname, c.relname, r.rolname;

-- Table-level false does not exclude column-only privileges.
SELECT n.nspname AS schema_name, c.relname AS object_name, a.attname AS column_name,
       r.rolname AS browser_role,
       has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT') AS can_select,
       has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT') AS can_insert,
       has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE') AS can_update,
       has_column_privilege(r.oid, c.oid, a.attnum, 'REFERENCES') AS can_reference
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE r.rolname IN ('anon', 'authenticated')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY n.nspname, c.relname, a.attnum, r.rolname;

SELECT n.nspname AS schema_name, c.relname AS sequence_name, r.rolname AS browser_role,
       has_sequence_privilege(r.oid, c.oid, 'USAGE') AS can_use,
       has_sequence_privilege(r.oid, c.oid, 'SELECT') AS can_select,
       has_sequence_privilege(r.oid, c.oid, 'UPDATE') AS can_update
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN pg_roles r
WHERE c.relkind = 'S' AND r.rolname IN ('anon', 'authenticated')
  AND n.nspname NOT LIKE 'pg_%'
ORDER BY n.nspname, c.relname, r.rolname;

SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual AS using_expression, with_check AS check_expression
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename, policyname;

-- Inspect security-definer and browser-callable routines without exporting bodies.
SELECT n.nspname AS schema_name, p.proname AS routine_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner_role,
       r.rolname AS browser_role,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS schema_usage,
       has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute,
       (SELECT setting FROM unnest(p.proconfig) setting
        WHERE setting LIKE 'search_path=%' LIMIT 1) AS fixed_search_path
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_roles r
WHERE r.rolname IN ('anon', 'authenticated')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_%'
  AND (p.prosecdef OR has_function_privilege(r.oid, p.oid, 'EXECUTE'))
ORDER BY n.nspname, p.proname, p.oid, r.rolname;

SELECT pg_get_userbyid(d.defaclrole) AS owner_role,
       n.nspname AS schema_name, d.defaclobjtype AS object_type,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
       a.privilege_type, a.is_grantable
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) a
ORDER BY owner_role, schema_name, object_type, grantee, privilege_type;

-- Presence alone is not proof that a migration ran or matched its repository hash.
SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS supabase_ledger_present,
       to_regclass('public.team_lab_teams') IS NOT NULL AS private_teams_present,
       to_regclass('public.team_lab_replays') IS NOT NULL AS private_replays_present,
       to_regclass('public.trainer_profiles') IS NOT NULL AS trainer_profiles_name_hint;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       con.conname AS constraint_name, con.contype, con.convalidated,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('teams', 'team_members', 'champions_overrides',
                   'team_lab_teams', 'team_lab_team_members')
ORDER BY c.relname, con.conname;

ROLLBACK;
