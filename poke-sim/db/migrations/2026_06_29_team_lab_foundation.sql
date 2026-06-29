-- Team Lab backend foundation
-- Date: 2026-06-29
--
-- Existing production tables already use teams/team_members for the runtime team
-- catalog. Team Lab is intentionally namespaced so this migration does not
-- rewrite or collide with live catalog data.

CREATE TABLE IF NOT EXISTS team_lab_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NULL,
  name text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  regulation_id text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('private', 'hidden_details', 'public')),
  source_type text NOT NULL CHECK (source_type IN ('user_custom', 'official_event', 'community_meta', 'engine_generated', 'dev_seed')),
  archetype_tags text[] NOT NULL DEFAULT '{}'::text[],
  legality_status text NOT NULL CHECK (legality_status IN ('verified', 'needs_verification', 'illegal', 'stale')),
  legality_report jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_lab_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES team_lab_teams(id) ON DELETE CASCADE,
  slot integer NOT NULL CHECK (slot BETWEEN 1 AND 6),
  pokemon_id text NOT NULL,
  form_id text NULL,
  item_id text NULL,
  ability_id text NULL,
  moves text[] NOT NULL,
  nature text NULL,
  evs jsonb NULL,
  ivs jsonb NULL,
  level integer NULL CHECK (level IS NULL OR level BETWEEN 1 AND 100),
  is_hidden_publicly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, slot)
);

CREATE TABLE IF NOT EXISTS team_lab_sim_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id uuid NOT NULL REFERENCES team_lab_teams(id),
  team_b_id uuid NOT NULL REFERENCES team_lab_teams(id),
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  engine_version text NOT NULL,
  ruleset_version text NOT NULL,
  seed text NOT NULL,
  winner_team_id uuid NULL REFERENCES team_lab_teams(id),
  result_reason text NOT NULL CHECK (result_reason IN ('ko', 'timer', 'forfeit', 'draw', 'error')),
  turns integer NULL,
  confidence_flags text[] NOT NULL DEFAULT '{}'::text[],
  replay_log jsonb NULL,
  replay_log_url text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_lab_leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES team_lab_teams(id) ON DELETE CASCADE,
  leaderboard_scope text NOT NULL,
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  engine_version text NOT NULL,
  ruleset_version text NOT NULL,
  rating numeric NOT NULL,
  raw_win_rate numeric NOT NULL CHECK (raw_win_rate >= 0 AND raw_win_rate <= 1),
  adjusted_win_rate numeric NOT NULL CHECK (adjusted_win_rate >= 0 AND adjusted_win_rate <= 1),
  games_played integer NOT NULL CHECK (games_played >= 0),
  wins integer NOT NULL CHECK (wins >= 0),
  losses integer NOT NULL CHECK (losses >= 0),
  draws integer NOT NULL DEFAULT 0 CHECK (draws >= 0),
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high', 'experimental')),
  rank integer NULL,
  stale boolean NOT NULL DEFAULT false,
  stale_reason text NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_lab_matchups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES team_lab_teams(id) ON DELETE CASCADE,
  opponent_team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL,
  opponent_archetype text NULL,
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  engine_version text NOT NULL,
  ruleset_version text NOT NULL,
  games_played integer NOT NULL CHECK (games_played >= 0),
  wins integer NOT NULL CHECK (wins >= 0),
  losses integer NOT NULL CHECK (losses >= 0),
  draws integer NOT NULL DEFAULT 0 CHECK (draws >= 0),
  win_rate numeric NOT NULL CHECK (win_rate >= 0 AND win_rate <= 1),
  rating_delta numeric NULL,
  confidence text NOT NULL CHECK (confidence IN ('low', 'medium', 'high', 'experimental')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_lab_teams_regulation_format ON team_lab_teams(regulation_id, format);
CREATE INDEX IF NOT EXISTS idx_team_lab_teams_owner ON team_lab_teams(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_lab_teams_visibility ON team_lab_teams(visibility);
CREATE INDEX IF NOT EXISTS idx_team_lab_leaderboard_scope_rank ON team_lab_leaderboard_entries(regulation_id, format, leaderboard_scope, rank);
CREATE INDEX IF NOT EXISTS idx_team_lab_leaderboard_versions ON team_lab_leaderboard_entries(engine_version, ruleset_version);
CREATE INDEX IF NOT EXISTS idx_team_lab_sim_runs_team_a ON team_lab_sim_runs(team_a_id);
CREATE INDEX IF NOT EXISTS idx_team_lab_sim_runs_team_b ON team_lab_sim_runs(team_b_id);
CREATE INDEX IF NOT EXISTS idx_team_lab_sim_runs_regulation_format ON team_lab_sim_runs(regulation_id, format);
CREATE INDEX IF NOT EXISTS idx_team_lab_matchups_pair ON team_lab_matchups(team_id, opponent_team_id);

ALTER TABLE team_lab_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_sim_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_matchups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_lab_read_public_or_owner_teams ON team_lab_teams;
CREATE POLICY team_lab_read_public_or_owner_teams ON team_lab_teams
  FOR SELECT TO anon, authenticated
  USING (visibility IN ('public', 'hidden_details') OR owner_user_id = auth.uid());

DROP POLICY IF EXISTS team_lab_owner_insert_teams ON team_lab_teams;
CREATE POLICY team_lab_owner_insert_teams ON team_lab_teams
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS team_lab_owner_update_teams ON team_lab_teams;
CREATE POLICY team_lab_owner_update_teams ON team_lab_teams
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS team_lab_read_visible_members ON team_lab_team_members;
CREATE POLICY team_lab_read_visible_members ON team_lab_team_members
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_lab_teams t
      WHERE t.id = team_lab_team_members.team_id
        AND (
          t.visibility = 'public'
          OR t.owner_user_id = auth.uid()
          OR (t.visibility = 'hidden_details' AND team_lab_team_members.is_hidden_publicly = false)
        )
    )
  );

DROP POLICY IF EXISTS team_lab_owner_insert_members ON team_lab_team_members;
CREATE POLICY team_lab_owner_insert_members ON team_lab_team_members
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM team_lab_teams t WHERE t.id = team_id AND t.owner_user_id = auth.uid()));

DROP POLICY IF EXISTS team_lab_owner_update_members ON team_lab_team_members;
CREATE POLICY team_lab_owner_update_members ON team_lab_team_members
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_lab_teams t WHERE t.id = team_id AND t.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM team_lab_teams t WHERE t.id = team_id AND t.owner_user_id = auth.uid()));

DROP POLICY IF EXISTS team_lab_read_leaderboard_visible_teams ON team_lab_leaderboard_entries;
CREATE POLICY team_lab_read_leaderboard_visible_teams ON team_lab_leaderboard_entries
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_lab_teams t
      WHERE t.id = team_lab_leaderboard_entries.team_id
        AND t.visibility IN ('public', 'hidden_details')
        AND t.legality_status <> 'illegal'
    )
  );

DROP POLICY IF EXISTS team_lab_read_matchups_visible_teams ON team_lab_matchups;
CREATE POLICY team_lab_read_matchups_visible_teams ON team_lab_matchups
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_lab_teams t
      WHERE t.id = team_lab_matchups.team_id
        AND t.visibility IN ('public', 'hidden_details')
        AND t.legality_status <> 'illegal'
    )
  );

DROP POLICY IF EXISTS team_lab_read_sim_runs_visible_teams ON team_lab_sim_runs;
CREATE POLICY team_lab_read_sim_runs_visible_teams ON team_lab_sim_runs
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_lab_teams t
      WHERE t.id IN (team_lab_sim_runs.team_a_id, team_lab_sim_runs.team_b_id)
        AND (t.visibility IN ('public', 'hidden_details') OR t.owner_user_id = auth.uid())
    )
  );

COMMENT ON TABLE team_lab_teams IS 'Versioned Team Lab team records. Runtime catalog teams remain in teams/team_members.';
COMMENT ON TABLE team_lab_leaderboard_entries IS 'Simulator-derived rankings; every row is scoped to regulation, format, engine_version, and ruleset_version and can be marked stale.';
COMMENT ON TABLE team_lab_sim_runs IS 'Versioned simulator evidence rows used to recalculate Team Lab rankings.';
