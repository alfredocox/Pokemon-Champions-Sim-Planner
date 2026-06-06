-- Showdown sync audit tables.
-- Append-only evidence layer for scheduled upstream data checks and mechanics findings.

CREATE TABLE IF NOT EXISTS showdown_sync_runs (
  sync_run_id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'passed', 'failed', 'blocked')),
  upstream_ref TEXT,
  workflow_run_id TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS showdown_source_files (
  sync_run_id TEXT NOT NULL REFERENCES showdown_sync_runs(sync_run_id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  normalized_hash TEXT,
  byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  parse_status TEXT NOT NULL CHECK (parse_status IN ('passed', 'failed', 'skipped')),
  parse_error TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sync_run_id, source_name)
);

CREATE TABLE IF NOT EXISTS mechanics_validation_runs (
  validation_run_id TEXT PRIMARY KEY,
  sync_run_id TEXT REFERENCES showdown_sync_runs(sync_run_id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'passed', 'failed', 'blocked')),
  mode TEXT NOT NULL CHECK (mode IN ('data-sync', 'standard-oracle', 'champions-override', 'release-gate')),
  workflow_run_id TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mechanics_validation_findings (
  finding_id TEXT PRIMARY KEY,
  validation_run_id TEXT REFERENCES mechanics_validation_runs(validation_run_id) ON DELETE SET NULL,
  sync_run_id TEXT REFERENCES showdown_sync_runs(sync_run_id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'blocker')),
  classification TEXT NOT NULL CHECK (classification IN ('upstream-drift', 'local-bug', 'champions-override', 'unknown')),
  subject TEXT NOT NULL,
  expected JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'fixed', 'wontfix')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_showdown_sync_runs_status_started
  ON showdown_sync_runs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_showdown_source_files_hash
  ON showdown_source_files(source_name, source_hash);

CREATE INDEX IF NOT EXISTS idx_mechanics_validation_runs_mode_status
  ON mechanics_validation_runs(mode, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mechanics_validation_findings_severity_status
  ON mechanics_validation_findings(severity, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mechanics_validation_findings_classification
  ON mechanics_validation_findings(classification, status);

ALTER TABLE showdown_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE showdown_source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mechanics_validation_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_showdown_sync_runs" ON showdown_sync_runs;
CREATE POLICY "anon_read_showdown_sync_runs"
  ON showdown_sync_runs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_read_showdown_source_files" ON showdown_source_files;
CREATE POLICY "anon_read_showdown_source_files"
  ON showdown_source_files FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_read_mechanics_validation_runs" ON mechanics_validation_runs;
CREATE POLICY "anon_read_mechanics_validation_runs"
  ON mechanics_validation_runs FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_read_mechanics_validation_findings" ON mechanics_validation_findings;
CREATE POLICY "anon_read_mechanics_validation_findings"
  ON mechanics_validation_findings FOR SELECT TO anon USING (true);
