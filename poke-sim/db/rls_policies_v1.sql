-- Champions Sim RLS Policies v1
-- Run AFTER schema_v1.sql in Supabase SQL Editor
-- Strategy: anon = read-only on reference tables; write allowed on analyses + logs

-- ============================================================
-- 1. ENABLE RLS on all 8 tables
-- ============================================================
ALTER TABLE rulesets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_battles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_win_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. READ-ONLY tables (anon can SELECT, never INSERT/UPDATE/DELETE)
--    rulesets, teams, team_members, prior_snapshots, golden_battles
-- ============================================================

CREATE POLICY "anon_read_rulesets"
  ON rulesets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_read_teams"
  ON teams FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_read_prior_snapshots"
  ON prior_snapshots FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_read_golden_battles"
  ON golden_battles FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- 3. ANALYSES -- anon can SELECT and INSERT (no UPDATE/DELETE)
--    Reason: sim results are append-only telemetry; no editing.
-- ============================================================

CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- 4. ANALYSIS_WIN_CONDITIONS -- mirrors analyses access
-- ============================================================

CREATE POLICY "anon_read_analysis_win_conditions"
  ON analysis_win_conditions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_analysis_win_conditions"
  ON analysis_win_conditions FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- 5. ANALYSIS_LOGS -- anon can SELECT and INSERT
--    Only a sampled subset of games gets stored here.
-- ============================================================

CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- NOTES
-- * No anon UPDATE or DELETE on any table.
-- * To lock down analyses reads later (user-scoped), replace
--   the anon_read_analyses USING clause with:
--     USING (auth.uid() = user_id)   -- add user_id col first
-- * service_role key bypasses all RLS -- never expose it client-side.
-- ============================================================
