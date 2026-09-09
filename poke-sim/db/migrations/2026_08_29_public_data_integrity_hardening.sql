-- Public Data API integrity hardening
-- Date: 2026-08-29
-- Shared catalog and evidence rows are written by trusted workflows only.

BEGIN;

DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
DROP POLICY IF EXISTS "anon_insert_team_members" ON team_members;
DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
DROP POLICY IF EXISTS "anon_insert_analysis_win_conditions" ON analysis_win_conditions;
DROP POLICY IF EXISTS "anon_insert_analysis_logs" ON analysis_logs;
DROP POLICY IF EXISTS "anon_insert_branch_coverage_runs" ON branch_coverage_runs;
DROP POLICY IF EXISTS "anon_update_branch_coverage_runs" ON branch_coverage_runs;

REVOKE ALL PRIVILEGES ON
  teams,
  team_members,
  analyses,
  analysis_win_conditions,
  analysis_logs,
  branch_coverage_runs
FROM anon, authenticated;

GRANT SELECT ON
  teams,
  team_members,
  analyses,
  analysis_win_conditions,
  analysis_logs,
  branch_coverage_runs
TO anon, authenticated;

REVOKE ALL PRIVILEGES ON showdown_entity_diffs FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_team_slot_unique'
      AND conrelid = 'team_members'::regclass
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_team_slot_unique UNIQUE (team_id, slot);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_slot_range'
      AND conrelid = 'team_members'::regclass
  ) THEN
    ALTER TABLE team_members
      ADD CONSTRAINT team_members_slot_range CHECK (slot BETWEEN 1 AND 6);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_members_team_id
  ON team_members(team_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_champions_overrides_active_field
  ON champions_overrides(entity_kind, entity_key, field_path)
  WHERE status = 'active';

COMMIT;
