'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_07_01_replay_import_governance.sql'), 'utf8');

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

console.log('\n=== replay import governance tests ===\n');

T('1. migration creates private replay import governance tables', () => {
  ['trainer_replay_imports', 'trainer_replay_import_refs', 'trainer_replay_import_events'].forEach((table) => {
    inc('CREATE TABLE IF NOT EXISTS ' + table);
    inc('ALTER TABLE ' + table + ' ENABLE ROW LEVEL SECURITY');
    inc('REVOKE ALL ON ' + table + ' FROM anon');
  });
});

T('2. imports carry parser, source, mapping, version, and source-gap metadata', () => {
  [
    'source_hash text NOT NULL',
    'parser_version text NOT NULL',
    "parse_status text NOT NULL DEFAULT 'pending'",
    "team_mapping_status text NOT NULL DEFAULT 'pending'",
    'regulation_id text NULL',
    'format text NULL CHECK',
    'engine_version text NULL',
    'ruleset_version text NULL',
    "source_gaps text[] NOT NULL DEFAULT '{}'::text[]",
    "confidence_flags text[] NOT NULL DEFAULT '{}'::text[]",
    'UNIQUE(room_id, source_hash, parser_version)'
  ].forEach(inc);
});

T('3. imports are owner-scoped to authenticated trainer rooms', () => {
  inc('uploaded_by_user_id uuid NOT NULL');
  inc('uploaded_by_user_id = auth.uid()');
  inc('JOIN trainer_profiles p ON p.id = r.trainer_id');
  inc('p.user_id = auth.uid()');
  inc('trainer_replay_imports_owner_select');
  inc('trainer_replay_imports_owner_insert');
  inc('trainer_replay_imports_owner_update');
  inc('trainer_replay_imports_owner_delete');
});

T('4. imported references and events remain private child evidence', () => {
  inc("ref_type text NOT NULL CHECK (ref_type IN ('team_lab_team', 'team_key_mapping', 'sim_run', 'replay_log', 'qa_artifact', 'source_file'))");
  inc("verification_status text NOT NULL DEFAULT 'needs_review'");
  inc('event_index integer NOT NULL CHECK (event_index >= 0)');
  inc('event_payload jsonb NOT NULL DEFAULT');
  inc("parser_confidence text NOT NULL DEFAULT 'needs_review'");
  inc('trainer_replay_import_refs_owner_select');
  inc('trainer_replay_import_refs_owner_insert');
  inc('trainer_replay_import_events_owner_select');
  inc('trainer_replay_import_events_owner_insert');
});

T('5. governance migration does not create public learning or ranking promotion writes', () => {
  notInc('CREATE TABLE IF NOT EXISTS global_learning');
  notInc('CREATE TABLE IF NOT EXISTS bot_sessions');
  notInc('CREATE TABLE IF NOT EXISTS leaderboard_promotion');
  notInc('FOR SELECT TO anon');
  notInc('FOR INSERT TO anon');
  inc('Rows are parser evidence, not official Team Lab or global learning truth');
});

console.log(`\nreplay import governance: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
