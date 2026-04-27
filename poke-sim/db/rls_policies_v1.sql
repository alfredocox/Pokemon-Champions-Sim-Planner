-- Champions Sim RLS Policies v1
-- Run AFTER schema_v1.sql in Supabase SQL Editor
-- Strategy: anon = read-only on reference tables; read+write on analyses tables

-- ── Enable RLS on all 8 tables ────────────────────────────────────────────────
ALTER TABLE rulesets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_battles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_win_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs           ENABLE ROW LEVEL SECURITY;

-- ── RULESETS — public read only ───────────────────────────────────────────────
CREATE POLICY "anon_read_rulesets"
  ON rulesets FOR SELECT TO anon USING (true);

-- ── TEAMS — public read only ──────────────────────────────────────────────────
CREATE POLICY "anon_read_teams"
  ON teams FOR SELECT TO anon USING (true);

-- ── TEAM_MEMBERS — public read only ──────────────────────────────────────────
CREATE POLICY "anon_read_team_members"
  ON team_members FOR SELECT TO anon USING (true);

-- ── PRIOR_SNAPSHOTS — public read only ───────────────────────────────────────
CREATE POLICY "anon_read_prior_snapshots"
  ON prior_snapshots FOR SELECT TO anon USING (true);

-- ── GOLDEN_BATTLES — public read only ────────────────────────────────────────
CREATE POLICY "anon_read_golden_battles"
  ON golden_battles FOR SELECT TO anon USING (true);

-- ── ANALYSES — read + write (no login required) ───────────────────────────────
CREATE POLICY "anon_read_analyses"
  ON analyses FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analyses"
  ON analyses FOR INSERT TO anon WITH CHECK (true);

-- ── ANALYSIS_WIN_CONDITIONS — read + write ────────────────────────────────────
CREATE POLICY "anon_read_analysis_win_conditions"
  ON analysis_win_conditions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_win_conditions"
  ON analysis_win_conditions FOR INSERT TO anon WITH CHECK (true);

-- ── ANALYSIS_LOGS — read + write ─────────────────────────────────────────────
CREATE POLICY "anon_read_analysis_logs"
  ON analysis_logs FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_analysis_logs"
  ON analysis_logs FOR INSERT TO anon WITH CHECK (true);
