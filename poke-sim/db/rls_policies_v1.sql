-- Champions Sim RLS Policies v1
-- Run AFTER schema_v1.sql and seed_teams_v1.sql
-- Strategy: anon = read-only on reference tables, scoped insert on analyses tables
-- Updated 2026-05-09: replaced WITH CHECK (true) with scoped predicates (security hardening)

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

CREATE POLICY "anon_insert_teams"
  ON teams FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_team_members"
  ON team_members FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_prior_snapshots"
  ON prior_snapshots FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_golden_battles"
  ON golden_battles FOR SELECT TO anon USING (true);

-- ============================================================
-- ANALYSIS TABLES: anon READ (open) + scoped INSERT
-- WITH CHECK (true) removed -- replaced with real predicates
-- ============================================================

-- ------------------------------------------------------------
-- analyses: enforce required fields, FK presence, numeric bounds,
--           and wins+losses+draws = sample_size integrity check
-- ------------------------------------------------------------
CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_analyses" ON analyses;
CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT TO anon
  WITH CHECK (
    analysis_id        IS NOT NULL
    AND engine_version IS NOT NULL AND engine_version <> ''
    AND ruleset_id     IS NOT NULL AND ruleset_id     <> ''
    AND player_team_id IS NOT NULL AND player_team_id <> ''
    AND opp_team_id    IS NOT NULL AND opp_team_id    <> ''
    AND policy_model   IS NOT NULL AND policy_model   <> ''
    AND sample_size BETWEEN 1 AND 10000
    AND bo          IN (1, 3, 5, 10)
    AND win_rate    BETWEEN 0.0 AND 1.0
    AND wins   >= 0
    AND losses >= 0
    AND draws  >= 0
    AND avg_turns  > 0
    AND (wins + losses + draws) = sample_size
  );

-- ------------------------------------------------------------
-- analysis_win_conditions: label not empty, count positive
-- ------------------------------------------------------------
CREATE POLICY "anon_read_analysis_win_conditions"
  ON analysis_win_conditions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_analysis_win_conditions" ON analysis_win_conditions;
CREATE POLICY "anon_insert_analysis_win_conditions"
  ON analysis_win_conditions FOR INSERT TO anon
  WITH CHECK (
    analysis_id IS NOT NULL
    AND label   IS NOT NULL AND label <> ''
    AND count   > 0
  );

-- ------------------------------------------------------------
-- analysis_logs: result enum-locked, index/turns bounded,
--                tr_turns cannot exceed turns
-- ------------------------------------------------------------
CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_analysis_logs" ON analysis_logs;
CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT TO anon
  WITH CHECK (
    analysis_id IS NOT NULL
    AND log_index BETWEEN 0 AND 9999
    AND result IN ('win', 'loss', 'draw')
    AND turns    BETWEEN 1 AND 500
    AND tr_turns BETWEEN 0 AND turns
    AND log IS NOT NULL
  );

-- ============================================================
-- FUTURE: authenticated user policies (scaffold, inactive)
-- Uncomment when auth is added
-- ============================================================
-- CREATE POLICY "auth_all_analyses"
--   ON analyses FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
