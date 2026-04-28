-- Migration: 2026_04_28_add_teams_metadata_column
-- Module: M2 (Seed)
-- Linear: POK-18
--
-- Adds a free-form metadata JSONB column to teams so non-canonical attributes
-- (provenance, legality_status, assumption_register, format flags, etc.) can
-- be persisted without bloating the schema with one column per attribute.
--
-- Hard rules (from MASTER_PROMPT):
--   * team_members stays normalized (members do NOT live in teams.metadata)
--   * Default '{}'::jsonb so existing 3 rows remain valid after ALTER
--   * NOT NULL so app code never has to handle nulls
--
-- Idempotent: skips column creation if already present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'teams'
       AND column_name  = 'metadata'
  ) THEN
    ALTER TABLE teams ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END
$$;
