-- Champions Sim RLS policies v1
-- Run after schema_v1.sql and seed data.
-- Strategy: anon can read reference tables and append analysis rows.

-- Enable RLS on every table in schema_v1.sql.
ALTER TABLE rulesets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_battles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_win_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs           ENABLE ROW LEVEL SECURITY;

-- Reference tables: anon read-only.
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

-- Analysis tables: anon read and insert only. No anon update/delete policies.
CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_analysis_win_conditions"
  ON analysis_win_conditions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_win_conditions"
  ON analysis_win_conditions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT TO anon WITH CHECK (true);

-- Future authenticated-user policies can be added when auth exists.
-- Do not expose service-role keys in frontend code.
