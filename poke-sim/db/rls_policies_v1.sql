-- ============================================================
-- rls_policies_v1.sql
-- Row Level Security for Pokemon Champions Sim Planner
-- Run AFTER schema_v1.sql in Supabase SQL Editor
-- anon key = read-only on reference tables
--           write-allowed on analyses + logs + matchup_results + pilot_notes
-- ============================================================

-- 1. Enable RLS on every table
ALTER TABLE rulesets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves             ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchup_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_notes       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- READ-ONLY tables (anon SELECT only)
-- ============================================================

CREATE POLICY "anon_read_rulesets"
  ON rulesets FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_teams"
  ON teams FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_moves"
  ON moves FOR SELECT TO anon USING (true);

-- ============================================================
-- WRITE-ALLOWED tables (anon SELECT + INSERT, no UPDATE/DELETE)
-- Append-only model keeps the audit trail clean
-- ============================================================

CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_matchup_results"
  ON matchup_results FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_matchup_results"
  ON matchup_results FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_pilot_notes"
  ON pilot_notes FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_pilot_notes"
  ON pilot_notes FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- VERIFY after running:
-- SELECT tablename, policyname, cmd, roles
-- FROM   pg_policies
-- WHERE  schemaname = 'public'
-- ORDER  BY tablename, cmd;
-- ============================================================
