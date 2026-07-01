-- Team Lab mapping and promotion trust layer
-- Date: 2026-06-30
--
-- Purpose:
-- 1. Map local/browser QA identifiers such as "player" or "kevin_meta_sun"
--    to durable team_lab_teams UUIDs without poisoning leaderboard identity.
-- 2. Store evidence-promotion rules separately from leaderboard rows so a
--    trusted worker can recalculate, audit, and stale rows when rules change.

CREATE TABLE IF NOT EXISTS team_lab_team_key_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL CHECK (source_system IN ('local_qa', 'branch_coverage', 'showdown_import', 'qa_artifact', 'manual_admin')),
  source_team_key text NOT NULL,
  team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL,
  team_signature text NULL,
  regulation_id text NOT NULL,
  format text NULL CHECK (format IS NULL OR format IN ('singles', 'doubles')),
  mapping_status text NOT NULL DEFAULT 'pending' CHECK (mapping_status IN ('pending', 'verified', 'rejected', 'stale')),
  verification_source text NULL,
  confidence_flags text[] NOT NULL DEFAULT '{}'::text[],
  verified_by uuid NULL,
  verified_at timestamptz NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_system, source_team_key, regulation_id, format)
);

CREATE INDEX IF NOT EXISTS idx_team_lab_key_mappings_source
  ON team_lab_team_key_mappings(source_system, source_team_key, regulation_id, format);

CREATE INDEX IF NOT EXISTS idx_team_lab_key_mappings_team
  ON team_lab_team_key_mappings(team_id, mapping_status);

CREATE INDEX IF NOT EXISTS idx_team_lab_key_mappings_status
  ON team_lab_team_key_mappings(mapping_status, regulation_id, format);

CREATE TABLE IF NOT EXISTS team_lab_promotion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id text NOT NULL,
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  leaderboard_scope text NOT NULL DEFAULT 'official_sim_top_25',
  min_sample_size integer NOT NULL DEFAULT 200 CHECK (min_sample_size >= 1),
  require_verified_legality boolean NOT NULL DEFAULT true,
  require_current_engine boolean NOT NULL DEFAULT true,
  require_current_ruleset boolean NOT NULL DEFAULT true,
  require_verified_team_mapping boolean NOT NULL DEFAULT true,
  require_approved_benchmark_pool boolean NOT NULL DEFAULT true,
  allowed_evidence_qualities text[] NOT NULL DEFAULT ARRAY['official_ready']::text[],
  active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(regulation_id, format, leaderboard_scope, active)
);

CREATE INDEX IF NOT EXISTS idx_team_lab_promotion_rules_active
  ON team_lab_promotion_rules(regulation_id, format, leaderboard_scope, active);

CREATE TABLE IF NOT EXISTS team_lab_promotion_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_entry_id uuid NULL REFERENCES team_lab_leaderboard_entries(id) ON DELETE SET NULL,
  team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL,
  mapping_id uuid NULL REFERENCES team_lab_team_key_mappings(id) ON DELETE SET NULL,
  promotion_rule_id uuid NULL REFERENCES team_lab_promotion_rules(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'blocked', 'experimental', 'stale')),
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  evidence_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_by uuid NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_lab_promotion_audits_team
  ON team_lab_promotion_audits(team_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_lab_promotion_audits_decision
  ON team_lab_promotion_audits(decision, decided_at DESC);

ALTER TABLE team_lab_leaderboard_entries
  ADD COLUMN IF NOT EXISTS team_key_mapping_id uuid NULL REFERENCES team_lab_team_key_mappings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promotion_status text NULL CHECK (promotion_status IS NULL OR promotion_status IN ('approved', 'blocked', 'experimental', 'stale')),
  ADD COLUMN IF NOT EXISTS promotion_reasons text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_team_lab_leaderboard_promotion
  ON team_lab_leaderboard_entries(regulation_id, format, leaderboard_scope, promotion_status, stale);

ALTER TABLE team_lab_team_key_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_lab_promotion_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_lab_key_mappings_no_public_read ON team_lab_team_key_mappings;
CREATE POLICY team_lab_key_mappings_no_public_read ON team_lab_team_key_mappings
  FOR SELECT TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS team_lab_promotion_rules_read_active ON team_lab_promotion_rules;
CREATE POLICY team_lab_promotion_rules_read_active ON team_lab_promotion_rules
  FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS team_lab_promotion_audits_no_public_read ON team_lab_promotion_audits;
CREATE POLICY team_lab_promotion_audits_no_public_read ON team_lab_promotion_audits
  FOR SELECT TO anon, authenticated
  USING (false);

COMMENT ON TABLE team_lab_team_key_mappings IS 'Trusted mapping from local QA/source team keys to durable Team Lab team UUIDs. Pending mappings must not promote official rankings.';
COMMENT ON TABLE team_lab_promotion_rules IS 'Versioned evidence-promotion gates for official Team Lab leaderboard scopes.';
COMMENT ON TABLE team_lab_promotion_audits IS 'Private audit trail for trusted promotion decisions.';
COMMENT ON COLUMN team_lab_leaderboard_entries.team_key_mapping_id IS 'Mapping proof used when a local/source team key was promoted into this leaderboard row.';
COMMENT ON COLUMN team_lab_leaderboard_entries.promotion_status IS 'Trusted promotion decision for this leaderboard row.';
COMMENT ON COLUMN team_lab_leaderboard_entries.promotion_reasons IS 'Machine-readable reasons explaining blocked, experimental, stale, or approved promotion state.';
