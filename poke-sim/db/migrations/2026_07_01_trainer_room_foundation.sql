-- Trainer room backend foundation
-- Date: 2026-07-01
--
-- This slice creates the private trainer-owned workspace needed before saved
-- profiles, replay imports, personal coaching memory, global learning, or bot
-- practice. It intentionally does not create public learning, replay import, or
-- bot-session tables.

CREATE TABLE IF NOT EXISTS trainer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text NULL,
  data_consent jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_format text NULL CHECK (default_format IS NULL OR default_format IN ('singles', 'doubles')),
  default_regulation_id text NULL,
  privacy_mode text NOT NULL DEFAULT 'private' CHECK (privacy_mode IN ('private', 'share_anonymous', 'public_showcase')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainer_room_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES trainer_rooms(id) ON DELETE CASCADE,
  team_lab_team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('main', 'test_variant', 'benchmark', 'opponent', 'bot_team')),
  notes text NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trainer_profiles_user ON trainer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_rooms_trainer ON trainer_rooms(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_rooms_privacy ON trainer_rooms(privacy_mode);
CREATE INDEX IF NOT EXISTS idx_trainer_room_teams_room ON trainer_room_teams(room_id);
CREATE INDEX IF NOT EXISTS idx_trainer_room_teams_team_lab_team ON trainer_room_teams(team_lab_team_id);

ALTER TABLE trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_room_teams ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON trainer_profiles FROM anon;
REVOKE ALL ON trainer_rooms FROM anon;
REVOKE ALL ON trainer_room_teams FROM anon;

DROP POLICY IF EXISTS trainer_profiles_owner_select ON trainer_profiles;
CREATE POLICY trainer_profiles_owner_select ON trainer_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS trainer_profiles_owner_insert ON trainer_profiles;
CREATE POLICY trainer_profiles_owner_insert ON trainer_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS trainer_profiles_owner_update ON trainer_profiles;
CREATE POLICY trainer_profiles_owner_update ON trainer_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS trainer_rooms_owner_select ON trainer_rooms;
CREATE POLICY trainer_rooms_owner_select ON trainer_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_profiles p
      WHERE p.id = trainer_rooms.trainer_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_rooms_owner_insert ON trainer_rooms;
CREATE POLICY trainer_rooms_owner_insert ON trainer_rooms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_profiles p
      WHERE p.id = trainer_rooms.trainer_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_rooms_owner_update ON trainer_rooms;
CREATE POLICY trainer_rooms_owner_update ON trainer_rooms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_profiles p
      WHERE p.id = trainer_rooms.trainer_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trainer_profiles p
      WHERE p.id = trainer_rooms.trainer_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_rooms_owner_delete ON trainer_rooms;
CREATE POLICY trainer_rooms_owner_delete ON trainer_rooms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_profiles p
      WHERE p.id = trainer_rooms.trainer_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_room_teams_owner_select ON trainer_room_teams;
CREATE POLICY trainer_room_teams_owner_select ON trainer_room_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_room_teams.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_room_teams_owner_insert ON trainer_room_teams;
CREATE POLICY trainer_room_teams_owner_insert ON trainer_room_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_room_teams.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_room_teams_owner_update ON trainer_room_teams;
CREATE POLICY trainer_room_teams_owner_update ON trainer_room_teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_room_teams.room_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_room_teams.room_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS trainer_room_teams_owner_delete ON trainer_room_teams;
CREATE POLICY trainer_room_teams_owner_delete ON trainer_room_teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM trainer_rooms r
      JOIN trainer_profiles p ON p.id = r.trainer_id
      WHERE r.id = trainer_room_teams.room_id
        AND p.user_id = auth.uid()
    )
  );

COMMENT ON TABLE trainer_profiles IS 'Private trainer identity boundary for future accounts, saved teams, replay review, coaching memory, and consent controls.';
COMMENT ON TABLE trainer_rooms IS 'Owner-scoped private workspace. public_showcase is reserved by schema but not publicly readable in this foundation slice.';
COMMENT ON TABLE trainer_room_teams IS 'Private room-to-Team-Lab mapping. Hidden Team Lab details remain protected by Team Lab policies and API filtering.';
