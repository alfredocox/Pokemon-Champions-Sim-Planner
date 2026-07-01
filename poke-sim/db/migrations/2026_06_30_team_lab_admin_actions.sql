-- Team Lab admin action audit
-- Shared ranking resets must be trusted-admin actions with an audit reason.
-- Public browser UI may only perform local QA resets until a server/admin
-- execution path writes this table.

CREATE TABLE IF NOT EXISTS team_lab_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NULL,
  action text NOT NULL CHECK (action IN ('team_lab_ranking_reset')),
  mode text NOT NULL CHECK (mode IN ('mark_stale', 'delete_dev_seed')),
  reason text NOT NULL CHECK (length(trim(reason)) >= 8),
  regulation_id text NULL,
  format text NULL CHECK (format IS NULL OR format IN ('singles', 'doubles')),
  leaderboard_scope text NULL,
  engine_version text NULL,
  ruleset_version text NULL,
  team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL,
  changed_count integer NOT NULL DEFAULT 0 CHECK (changed_count >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_lab_admin_actions_created
  ON team_lab_admin_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_admin_actions_scope
  ON team_lab_admin_actions(regulation_id, format, leaderboard_scope, engine_version, ruleset_version);

ALTER TABLE team_lab_admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_lab_admin_actions_no_public_read ON team_lab_admin_actions;
CREATE POLICY team_lab_admin_actions_no_public_read ON team_lab_admin_actions
  FOR SELECT TO anon, authenticated
  USING (false);

COMMENT ON TABLE team_lab_admin_actions IS 'Audit log for trusted Team Lab admin actions such as ranking resets. Browser-only QA resets must not write shared ranking state.';
COMMENT ON COLUMN team_lab_admin_actions.reason IS 'Human-readable audit reason required for every reset.';
