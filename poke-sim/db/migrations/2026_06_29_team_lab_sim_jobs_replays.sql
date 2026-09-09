-- Team Lab sim jobs and first-class replay evidence
-- Date: 2026-06-29
--
-- This migration keeps replay evidence separate from leaderboard rows. Sim runs
-- can link to batch jobs and replay records without replacing existing
-- analysis_logs or browser QA artifact exports.

CREATE TABLE IF NOT EXISTS team_lab_sim_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NULL,
  job_type text NOT NULL CHECK (job_type IN (
    'team_vs_team',
    'team_vs_leaderboard',
    'archetype_sweep',
    'full_leaderboard_recalc',
    'qa_regression'
  )),
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  engine_version text NOT NULL,
  ruleset_version text NOT NULL,
  team_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  opponent_team_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  opponent_archetypes text[] NOT NULL DEFAULT '{}'::text[],
  games_per_matchup integer NOT NULL CHECK (games_per_matchup >= 1),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  status_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_flags text[] NOT NULL DEFAULT '{}'::text[],
  source_gaps text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  finished_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS team_lab_replays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_run_id uuid NULL REFERENCES team_lab_sim_runs(id) ON DELETE SET NULL,
  job_id uuid NULL REFERENCES team_lab_sim_jobs(id) ON DELETE SET NULL,
  team_a_id uuid NOT NULL REFERENCES team_lab_teams(id),
  team_b_id uuid NOT NULL REFERENCES team_lab_teams(id),
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  engine_version text NOT NULL,
  ruleset_version text NOT NULL,
  seed text NOT NULL,
  winner_team_id uuid NULL REFERENCES team_lab_teams(id),
  result_reason text NOT NULL CHECK (result_reason IN ('ko', 'timer', 'forfeit', 'draw', 'error')),
  turns integer NULL CHECK (turns IS NULL OR turns >= 0),
  event_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  turn_log jsonb NULL,
  damage_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  effect_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  qa_coverage_summary jsonb NULL,
  evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_flags text[] NOT NULL DEFAULT '{}'::text[],
  source_gaps text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE team_lab_sim_runs
  ADD COLUMN IF NOT EXISTS job_id uuid NULL REFERENCES team_lab_sim_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replay_id uuid NULL REFERENCES team_lab_replays(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replay_evidence_summary jsonb NULL;

CREATE INDEX IF NOT EXISTS idx_team_lab_sim_jobs_scope_status
  ON team_lab_sim_jobs(regulation_id, format, engine_version, ruleset_version, status);

CREATE INDEX IF NOT EXISTS idx_team_lab_sim_jobs_owner
  ON team_lab_sim_jobs(owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_replays_scope
  ON team_lab_replays(regulation_id, format, engine_version, ruleset_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_replays_teams
  ON team_lab_replays(team_a_id, team_b_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_replays_job
  ON team_lab_replays(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_replays_sim_run
  ON team_lab_replays(sim_run_id);

CREATE INDEX IF NOT EXISTS idx_team_lab_sim_runs_job
  ON team_lab_sim_runs(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_sim_runs_replay
  ON team_lab_sim_runs(replay_id);

ALTER TABLE team_lab_sim_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_replays ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON team_lab_sim_jobs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON team_lab_replays FROM anon, authenticated;

DROP POLICY IF EXISTS team_lab_read_public_or_owner_sim_jobs ON team_lab_sim_jobs;
CREATE POLICY team_lab_read_public_or_owner_sim_jobs ON team_lab_sim_jobs
  FOR SELECT TO anon, authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR NOT EXISTS (
      SELECT 1 FROM team_lab_teams t
      WHERE t.id = ANY(team_lab_sim_jobs.team_ids || team_lab_sim_jobs.opponent_team_ids)
        AND NOT (
          t.visibility IN ('public', 'hidden_details')
          AND t.legality_status <> 'illegal'
        )
    )
  );

DROP POLICY IF EXISTS team_lab_read_visible_replays ON team_lab_replays;
CREATE POLICY team_lab_read_visible_replays ON team_lab_replays
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_lab_teams ta
      JOIN team_lab_teams tb ON tb.id = team_lab_replays.team_b_id
      WHERE ta.id = team_lab_replays.team_a_id
        AND ta.visibility IN ('public', 'hidden_details')
        AND tb.visibility IN ('public', 'hidden_details')
        AND ta.legality_status <> 'illegal'
        AND tb.legality_status <> 'illegal'
    )
  );

GRANT SELECT ON team_lab_sim_jobs TO anon, authenticated;
GRANT SELECT ON team_lab_replays TO anon, authenticated;

COMMENT ON TABLE team_lab_sim_jobs IS 'Versioned Team Lab batch/sweep jobs. Public clients can read evidence metadata; writes should stay behind trusted service workflows.';
COMMENT ON TABLE team_lab_replays IS 'First-class replay/event-log evidence linked to Team Lab sim runs, jobs, versions, seeds, QA coverage, and source gaps.';
COMMENT ON COLUMN team_lab_sim_runs.replay_id IS 'Optional pointer to first-class team_lab_replays evidence for this sim run.';
COMMENT ON COLUMN team_lab_sim_runs.job_id IS 'Optional pointer to the batch/sweep job that produced this sim run.';
