-- Source-truth rule facts and compiled ruleset packages
-- Date: 2026-06-29
--
-- This layer complements existing rulesets, showdown_entities, and
-- champions_overrides. It stores evidence-bound Champion rule claims and the
-- compiled package validators/sims can consume without inventing missing data.

CREATE TABLE IF NOT EXISTS rule_facts (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  category text NOT NULL CHECK (category IN (
    'mechanic',
    'legality',
    'regulation',
    'battle_flow',
    'item',
    'ability',
    'move',
    'form',
    'pokemon_home',
    'meta'
  )),
  statement text NOT NULL CHECK (length(btrim(statement)) > 0),
  regulation_id text NULL,
  ruleset_version text NOT NULL CHECK (length(btrim(ruleset_version)) > 0),
  format text NULL CHECK (format IS NULL OR format IN ('singles', 'doubles')),
  verification_status text NOT NULL CHECK (verification_status IN (
    'official_verified',
    'in_game_verified',
    'replay_verified',
    'showdown_reference',
    'community_reference',
    'needs_verification',
    'conflicting'
  )),
  source_tier text NOT NULL CHECK (source_tier IN (
    'official',
    'in_game_verified',
    'replay_verified',
    'showdown_reference',
    'community_secondary',
    'unknown'
  )),
  source_url text NULL,
  source_note text NULL,
  source_hash text NULL,
  effective_start timestamptz NULL,
  effective_end timestamptz NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  tests_linked text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ruleset_packages (
  package_id text PRIMARY KEY CHECK (length(btrim(package_id)) > 0),
  regulation_id text NOT NULL CHECK (length(btrim(regulation_id)) > 0),
  ruleset_version text NOT NULL CHECK (length(btrim(ruleset_version)) > 0),
  format text NOT NULL CHECK (format IN ('singles', 'doubles')),
  legal_species text[] NOT NULL DEFAULT '{}'::text[],
  legal_forms text[] NOT NULL DEFAULT '{}'::text[],
  legal_moves text[] NOT NULL DEFAULT '{}'::text[],
  legal_items text[] NOT NULL DEFAULT '{}'::text[],
  legal_abilities text[] NOT NULL DEFAULT '{}'::text[],
  clauses jsonb NOT NULL DEFAULT '{}'::jsonb,
  mechanics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  compiled_from_rule_fact_ids text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL CHECK (status IN ('verified', 'partial', 'needs_verification', 'stale')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (regulation_id, ruleset_version, format)
);

CREATE INDEX IF NOT EXISTS idx_rule_facts_regulation_ruleset_format
  ON rule_facts(regulation_id, ruleset_version, format);

CREATE INDEX IF NOT EXISTS idx_rule_facts_category_status
  ON rule_facts(category, verification_status);

CREATE INDEX IF NOT EXISTS idx_rule_facts_source_hash
  ON rule_facts(source_tier, source_hash);

CREATE INDEX IF NOT EXISTS idx_ruleset_packages_lookup
  ON ruleset_packages(regulation_id, ruleset_version, format, status);

CREATE INDEX IF NOT EXISTS idx_ruleset_packages_status_updated
  ON ruleset_packages(status, updated_at DESC);

ALTER TABLE rule_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruleset_packages ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON rule_facts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON ruleset_packages FROM anon, authenticated;

DROP POLICY IF EXISTS source_truth_read_rule_facts ON rule_facts;
CREATE POLICY source_truth_read_rule_facts
  ON rule_facts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS source_truth_read_ruleset_packages ON ruleset_packages;
CREATE POLICY source_truth_read_ruleset_packages
  ON ruleset_packages FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON rule_facts TO anon, authenticated;
GRANT SELECT ON ruleset_packages TO anon, authenticated;

COMMENT ON TABLE rule_facts IS 'Granular evidence-bound rule, legality, mechanics, and source-status claims. Unknown Champion truth remains needs_verification or conflicting.';
COMMENT ON TABLE ruleset_packages IS 'Compiled source-truth packages for validators and simulator runs. Packages must preserve source_gaps instead of inventing missing Champion data.';
