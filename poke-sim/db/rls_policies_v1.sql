-- ============================================================
-- Champions Sim — Row Level Security Policies v1
-- Run this in Supabase SQL Editor AFTER schema_v1.sql
-- Strategy: anon = read-only on reference data;
--           anon = insert-only on analyses/logs (no auth needed)
-- ============================================================

-- 1. Enable RLS on every table
ALTER TABLE rulesets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prior_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_battles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_win_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_logs         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. REFERENCE DATA — public read-only (anon + authenticated)
-- ============================================================

CREATE POLICY "rulesets_select_public"
  ON rulesets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "teams_select_public"
  ON teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "team_members_select_public"
  ON team_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "prior_snapshots_select_public"
  ON prior_snapshots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "golden_battles_select_public"
  ON golden_battles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 3. ANALYSES — public insert + read (no auth required)
--    Write once, read by anyone. No update/delete via API.
-- ============================================================

CREATE POLICY "analyses_select_public"
  ON analyses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "analyses_insert_public"
  ON analyses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "awc_select_public"
  ON analysis_win_conditions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "awc_insert_public"
  ON analysis_win_conditions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "logs_select_public"
  ON analysis_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "logs_insert_public"
  ON analysis_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. No UPDATE or DELETE policies = blocked for all roles
--    once RLS is enabled. Service role bypasses RLS by default.
-- ============================================================

-- Verification query:
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
