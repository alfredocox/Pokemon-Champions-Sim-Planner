-- Permissions-only containment; no data cleanup or private-save schema changes.
-- Apply to authorized staging first. Preserve public reads and service-role writes.
BEGIN;
DO $$
DECLARE
  relation_name text;
  column_names text;
  browser_role text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'teams', 'team_members', 'analyses', 'analysis_win_conditions',
    'analysis_logs', 'branch_coverage_runs'
  ] LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing required shared table: %', relation_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM PUBLIC, anon, authenticated', relation_name);
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
      INTO column_names FROM pg_attribute
      WHERE attrelid = to_regclass(format('public.%I', relation_name))
        AND attnum > 0 AND NOT attisdropped;
    -- Table revocation does not revoke separate column-level grants.
    EXECUTE format('REVOKE INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.%I FROM PUBLIC, anon, authenticated',
      column_names, column_names, column_names, relation_name);
    EXECUTE format('DROP POLICY IF EXISTS browser_no_shared_insert ON public.%I', relation_name);
    EXECUTE format('CREATE POLICY browser_no_shared_insert ON public.%I AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false)', relation_name);
    EXECUTE format('DROP POLICY IF EXISTS browser_no_shared_update ON public.%I', relation_name);
    EXECUTE format('CREATE POLICY browser_no_shared_update ON public.%I AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false)', relation_name);
    EXECUTE format('DROP POLICY IF EXISTS browser_no_shared_delete ON public.%I', relation_name);
    EXECUTE format('CREATE POLICY browser_no_shared_delete ON public.%I AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false)', relation_name);
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(browser_role, format('public.%I', relation_name), 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(browser_role, format('public.%I', relation_name), 'INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Unexpected inherited write grants for % on %; review role memberships', browser_role, relation_name;
      END IF;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
