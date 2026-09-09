'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_07_01_trainer_room_foundation.sql'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS ' + name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}
function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}
function inc(needle) {
  truthy(migration.includes(needle), 'missing: ' + needle);
}
function notInc(needle) {
  truthy(!migration.includes(needle), 'must not include: ' + needle);
}

console.log('\n=== trainer room foundation tests ===\n');

T('1. migration creates only the private trainer-room foundation tables', () => {
  ['trainer_profiles', 'trainer_rooms', 'trainer_room_teams'].forEach((table) => {
    inc('CREATE TABLE IF NOT EXISTS ' + table);
    inc('ALTER TABLE ' + table + ' ENABLE ROW LEVEL SECURITY');
  });
  notInc('CREATE TABLE IF NOT EXISTS global_learning');
  notInc('CREATE TABLE IF NOT EXISTS bot_sessions');
  notInc('CREATE TABLE IF NOT EXISTS trainer_replay_imports');
});

T('2. trainer profiles and rooms are owner-scoped through auth.uid()', () => {
  inc('user_id uuid NOT NULL UNIQUE');
  inc('user_id = auth.uid()');
  inc('trainer_profiles_owner_select');
  inc('trainer_profiles_owner_insert');
  inc('trainer_profiles_owner_update');
  inc('trainer_rooms_owner_select');
  inc('trainer_rooms_owner_insert');
  inc('trainer_rooms_owner_update');
  inc('trainer_rooms_owner_delete');
});

T('3. private rows do not expose anon write/read policies', () => {
  inc('REVOKE ALL ON trainer_profiles FROM anon');
  inc('REVOKE ALL ON trainer_rooms FROM anon');
  inc('REVOKE ALL ON trainer_room_teams FROM anon');
  notInc('FOR SELECT TO anon');
  notInc('FOR INSERT TO anon');
  notInc('FOR UPDATE TO anon');
  notInc('FOR DELETE TO anon');
  notInc("privacy_mode = 'public_showcase'");
});

T('4. room teams can point at Team Lab without exposing hidden Team Lab details', () => {
  inc('team_lab_team_id uuid NULL REFERENCES team_lab_teams(id) ON DELETE SET NULL');
  inc("role text NOT NULL CHECK (role IN ('main', 'test_variant', 'benchmark', 'opponent', 'bot_team'))");
  inc('trainer_room_teams_owner_select');
  inc('trainer_room_teams_owner_insert');
  inc('trainer_room_teams_owner_update');
  inc('trainer_room_teams_owner_delete');
  inc('Hidden Team Lab details remain protected by Team Lab policies and API filtering');
});

T('5. indexes support owner and room lookup without becoming a public ranking table', () => {
  [
    'idx_trainer_profiles_user',
    'idx_trainer_rooms_trainer',
    'idx_trainer_rooms_privacy',
    'idx_trainer_room_teams_room',
    'idx_trainer_room_teams_team_lab_team'
  ].forEach(inc);
});

console.log(`\ntrainer room foundation: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
