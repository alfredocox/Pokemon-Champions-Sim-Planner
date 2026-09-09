-- Trainer replay import governance foundation
-- Date: 2026-07-01
--
-- This slice records private replay/file imports with parser and mapping status.
-- It intentionally does not create global learning, official leaderboard
-- promotion, or bot-training writes. Imported evidence stays trainer-owned until
-- a later trusted worker reviews mapping, legality, source gaps, and consent.

CREATE TABLE IF NOT EXISTS trainer_replay_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES trainer_rooms(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('showdown_html', 'showdown_text', 'champions_turn_log', 'qa_artifact', 'manual_note', 'unknown')),
  source_filename text NULL,
  source_hash text NOT NULL,
  parser_version text NOT NULL,
  parse_status text NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsed', 'partial', 'failed', 'needs_review')),
  team_mapping_status text NOT NULL DEFAULT 'pending' CHECK (team_mapping_status IN ('pending', 'mapped', 'partial', 'failed', 'needs_review')),
  regulation_id text NULL,
  format text NULL CHECK (format IS NULL OR format IN ('singles', 'doubles')),
  engine_version text NULL,
  ruleset_version text NULL,
  source_gaps text[] NOT NULL DEFAULT '{}'::text[],
  confidence_flags text[] NOT NULL DEFAULT '{}'::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, source_hash, parser_version)
);

CREATE TABLE IF NOT EXISTS trainer_replay_import_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES trainer_replay_imports(id) ON DELETE CASCADE,
  ref_type text NOT NULL CHECK (ref_type IN ('team_lab_team', 'team_key_mapping', 'sim_run', 'replay_log', 'qa_artifact', 'source_file')),
  ref_id text NOT NULL,
  verification_status text NOT NULL DEFAULT 'needs_review' CHECK (verification_status IN ('verified', 'needs_review', 'rejected', 'stale')),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_replay_import_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES trainer_replay_imports(id) ON DELETE CASCADE,
  event_index integer NOT NULL CHECK (event_index >= 0),
  turn integer NULL CHECK (turn IS NULL OR turn >= 0),
  event_type text NOT NULL,
  actor_key text NULL,
  target_key text NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_line integer NULL CHECK (source_line IS NULL OR source_line >= 0),
  parser_confidence text NOT NULL DEFAULT 'needs_review' CHECK (parser_confidence IN ('high', 'medium', 'low', 'needs_review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(import_id, event_index)
);

CREATE INDEX IF NOT EXISTS idx_trainer_replay_imports_room ON trainer_replay_imports(room_id);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_imports_user ON trainer_replay_imports(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_imports_hash ON trainer_replay_imports(source_hash);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_imports_status ON trainer_replay_imports(parse_status, team_mapping_status);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_imports_scope ON trainer_replay_imports(regulation_id, format, engine_version, ruleset_version);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_import_refs_import ON trainer_replay_import_refs(import_id);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_import_refs_type ON trainer_replay_import_refs(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_trainer_replay_import_events_import ON trainer_replay_import_events(import_id, turn, event_index);

ALTER TABLE trainer_replay_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_replay_import_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_replay_import_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON trainer_replay_imports FROM anon;
REVOKE ALL ON trainer_replay_import_refs FROM anon;
REVOKE ALL ON trainer_replay_import_events FROM anon;

DROP POLICY IF EXISTS trainer_replay_imports_owner_select ON trainer_replay_imports;
CREATE POLICY trainer_replay_imports_owner_select ON trainer_replay_imports
  FOR SELECT TO authenticated
  USING (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_replay_imports.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_imports_owner_insert ON trainer_replay_imports;
CREATE POLICY trainer_replay_imports_owner_insert ON trainer_replay_imports
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_replay_imports.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_imports_owner_update ON trainer_replay_imports;
CREATE POLICY trainer_replay_imports_owner_update ON trainer_replay_imports
  FOR UPDATE TO authenticated
  USING (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_replay_imports.room_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_replay_imports.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_imports_owner_delete ON trainer_replay_imports;
CREATE POLICY trainer_replay_imports_owner_delete ON trainer_replay_imports
  FOR DELETE TO authenticated
  USING (
    uploaded_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_replay_imports.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_import_refs_owner_select ON trainer_replay_import_refs;
CREATE POLICY trainer_replay_import_refs_owner_select ON trainer_replay_import_refs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_replay_imports i
      WHERE i.id = trainer_replay_import_refs.import_id
        AND i.uploaded_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_import_refs_owner_insert ON trainer_replay_import_refs;
CREATE POLICY trainer_replay_import_refs_owner_insert ON trainer_replay_import_refs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_replay_imports i
      WHERE i.id = trainer_replay_import_refs.import_id
        AND i.uploaded_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_import_events_owner_select ON trainer_replay_import_events;
CREATE POLICY trainer_replay_import_events_owner_select ON trainer_replay_import_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_replay_imports i
      WHERE i.id = trainer_replay_import_events.import_id
        AND i.uploaded_by_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_replay_import_events_owner_insert ON trainer_replay_import_events;
CREATE POLICY trainer_replay_import_events_owner_insert ON trainer_replay_import_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_replay_imports i
      WHERE i.id = trainer_replay_import_events.import_id
        AND i.uploaded_by_user_id = auth.uid()
    )
  );

COMMENT ON TABLE trainer_replay_imports IS 'Private trainer-owned replay/file import governance. Rows are parser evidence, not official Team Lab or global learning truth.';
COMMENT ON TABLE trainer_replay_import_refs IS 'Private evidence references created during replay import review. Promotion requires a future trusted-worker audit.';
COMMENT ON TABLE trainer_replay_import_events IS 'Parsed private replay events with parser confidence and source-line pointers for future coaching review.';
