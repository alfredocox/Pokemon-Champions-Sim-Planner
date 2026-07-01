-- Team Lab ranking quality fields
-- Adds evidence-bound ranking metadata without changing existing battle/runtime tables.

ALTER TABLE team_lab_leaderboard_entries
  ADD COLUMN IF NOT EXISTS ranking_score numeric NULL,
  ADD COLUMN IF NOT EXISTS evidence_quality text NULL CHECK (evidence_quality IS NULL OR evidence_quality IN ('official_ready', 'community_safe', 'personal_only', 'experimental', 'blocked')),
  ADD COLUMN IF NOT EXISTS matchup_coverage jsonb NULL,
  ADD COLUMN IF NOT EXISTS opponent_strength_delta numeric NULL,
  ADD COLUMN IF NOT EXISTS volatility_penalty numeric NULL,
  ADD COLUMN IF NOT EXISTS source_gaps text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_team_lab_leaderboard_quality
  ON team_lab_leaderboard_entries(regulation_id, format, leaderboard_scope, evidence_quality, stale);

COMMENT ON COLUMN team_lab_leaderboard_entries.ranking_score IS 'Composite simulator evidence score: adjusted win rate plus opponent strength, matchup coverage, confidence, freshness, and source-gap penalties.';
COMMENT ON COLUMN team_lab_leaderboard_entries.evidence_quality IS 'Ranking quality gate: official_ready, community_safe, personal_only, experimental, or blocked.';
COMMENT ON COLUMN team_lab_leaderboard_entries.matchup_coverage IS 'Coverage metadata such as unique opponents, unique archetypes, and coverage bonus used by ranking_score.';
COMMENT ON COLUMN team_lab_leaderboard_entries.opponent_strength_delta IS 'Strength-of-schedule adjustment used by ranking_score.';
COMMENT ON COLUMN team_lab_leaderboard_entries.volatility_penalty IS 'Small-sample volatility penalty used by ranking_score.';
COMMENT ON COLUMN team_lab_leaderboard_entries.source_gaps IS 'Unresolved source gaps that prevent official promotion or reduce ranking confidence.';
