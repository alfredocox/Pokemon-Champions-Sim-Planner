-- Champions Sim RLS Policies v1
-- Run AFTER schema_v1.sql and seed_teams_v1.sql
-- Policy: anon = read-only on reference tables; write allowed on analyses tables

-- ─────────────────────────────────────────────
-- 1. RULESETS — public read, no writes
-- ─────────────────────────────────────────────
ALTER TABLE rulesets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rulesets_select_anon"
  ON rulesets FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────
-- 2. TEAMS — public read, no writes
-- ─────────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_select_anon"
  ON teams FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────
-- 3. TEAM_MEMBERS — public read, no writes
-- ─────────────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_select_anon"
  ON team_members FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────
-- 4. PRIOR_SNAPSHOTS — public read, no writes
-- ─────────────────────────────────────────────
ALTER TABLE prior_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prior_snapshots_select_anon"
  ON prior_snapshots FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────
-- 5. GOLDEN_BATTLES — public read, no writes
-- ─────────────────────────────────────────────
ALTER TABLE golden_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "golden_battles_select_anon"
  ON golden_battles FOR SELECT
  TO anon
  USING (true);

-- ─────────────────────────────────────────────
-- 6. ANALYSES — public read + insert (no update/delete)
-- ─────────────────────────────────────────────
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analyses_select_anon"
  ON analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "analyses_insert_anon"
  ON analyses FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 7. ANALYSIS_WIN_CONDITIONS — public read + insert
-- ─────────────────────────────────────────────
ALTER TABLE analysis_win_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_win_conditions_select_anon"
  ON analysis_win_conditions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "analysis_win_conditions_insert_anon"
  ON analysis_win_conditions FOR INSERT
  TO anon
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 8. ANALYSIS_LOGS — public read + insert
-- ─────────────────────────────────────────────
ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analysis_logs_select_anon"
  ON analysis_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "analysis_logs_insert_anon"
  ON analysis_logs FOR INSERT
  TO anon
  WITH CHECK (true);
