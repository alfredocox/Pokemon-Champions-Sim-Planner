-- Champions Sim RLS Policies v1
-- Run AFTER schema_v1.sql and seed_teams_v1.sql
-- Legacy bootstrap: shared data is read-only to browser roles.
-- Follow with poke-sim/db/migrations/2026_09_08_shared_evidence_write_containment.sql.

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
-- REFERENCE TABLES: anon READ-ONLY
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
-- ANALYSIS TABLES: anon READ-ONLY
-- ============================================================

CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_analysis_win_conditions"
  ON analysis_win_conditions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

-- ============================================================
-- Private saves require separate owner-scoped tables and reviewed policies.
-- ============================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  teams, team_members, analyses, analysis_win_conditions, analysis_logs
FROM PUBLIC, anon, authenticated;
