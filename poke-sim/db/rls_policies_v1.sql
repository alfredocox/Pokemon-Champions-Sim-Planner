-- Champions Sim RLS Policies v1
-- Run this AFTER schema_v1.sql and seed_teams_v1.sql
-- Project ref: ymlahqnshgiarpbgxehp

-- ============================================================
-- ENABLE RLS ON ALL TABLES
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
-- READ-ONLY TABLES (anon SELECT only)
-- rulesets, teams, team_members, prior_snapshots, golden_battles
-- ============================================================

CREATE POLICY "anon_read_rulesets"
  ON rulesets FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_teams"
  ON teams FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_prior_snapshots"
  ON prior_snapshots FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_golden_battles"
  ON golden_battles FOR SELECT TO anon USING (true);

-- ============================================================
-- APPEND-ONLY TABLES (anon SELECT + INSERT, no UPDATE/DELETE)
-- analyses, analysis_win_conditions, analysis_logs
-- ============================================================

CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_win_conditions"
  ON analysis_win_conditions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_win_conditions"
  ON analysis_win_conditions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

-- ============================================================
-- VERIFY after running:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
