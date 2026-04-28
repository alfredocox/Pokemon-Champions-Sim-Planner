// db_m2_seed_tests.js — Module 2: Seed suite (14 cases)
// PR: integration/poke-sim-db-m2 → Linear: POK-18
// Spec: poke-sim/POKE_SIM_DB_INTEGRATION_TDD_PLAN.md §6 Suite-2

'use strict';

const fs = require('fs');
const path = require('path');

// Test harness
var _passed = 0, _failed = 0, _total = 0;
function T(name, fn) { _total++; try { fn(); _passed++; console.log('  \u2714 ' + name); } catch (e) { _failed++; console.log('  \u2716 FAIL: ' + name + ' \u2014 ' + e.message); } }
function describe(name, fn) { console.log('\n\u25B6 ' + name); fn(); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function truthy(v, msg) { if (!v) throw new Error(msg + ' expected truthy'); }

// Shared paths (module-scoped so all tests can use them — fixes original scope-leak bug)
var ROOT = path.join(__dirname, '..');
var seedPath = path.join(ROOT, 'db', 'seed_teams_v2.sql');
var dataPath = path.join(ROOT, 'data.js');
var adapterPath = path.join(ROOT, 'supabase_adapter.js');
var generatorPath = path.join(ROOT, 'tools', 'generate_seed_from_data.py');
var migrationMetaPath = path.join(ROOT, 'db', 'migrations', '2026_04_28_add_teams_metadata_column.sql');
var migrationSeedPath = path.join(ROOT, 'db', 'migrations', '2026_04_28_seed_teams_v2.sql');

function readSeed() {
  return fs.readFileSync(seedPath, 'utf8');
}

// Extract every team_id used as the first column of an INSERT INTO teams (...) VALUES ('id', ...).
// We anchor on the row pattern emitted by the generator (two-space indent + '(' + id-quote)
// because SQL string literals can contain ';' which breaks naive [\s\S]*?; matchers.
function teamIdsInSeed(seedContent) {
  // Find the start of the teams INSERT block; the next blank line ends the values list reliably
  var startIdx = seedContent.indexOf('INSERT INTO teams ');
  if (startIdx === -1) return [];
  // The teams INSERT block is followed by '\n\n' before 'TEAM MEMBERS' header
  var endMarker = seedContent.indexOf('\n\n-- ====', startIdx);
  var block = endMarker === -1 ? seedContent.substring(startIdx) : seedContent.substring(startIdx, endMarker);
  var ids = [];
  var rowRe = /^  \('([a-z0-9_]+)'/gm;
  var r;
  while ((r = rowRe.exec(block)) !== null) ids.push(r[1]);
  return ids;
}

// Count member rows for a given team_id.
// Restrict the scan to the TEAM MEMBERS section (after the marker comment) so the
// DELETE-list at the top of the file doesn't get counted as member rows.
function memberRowsForTeam(seedContent, teamId) {
  var membersStart = seedContent.indexOf('-- TEAM MEMBERS');
  if (membersStart === -1) return 0;
  var membersBlock = seedContent.substring(membersStart);
  // Member rows have the shape:  ('teamid', 1, 'Species', ...)
  // Slot column (an integer) lets us distinguish from teams-table rows.
  var re = new RegExp("^  \\('" + teamId + "',\\s*\\d+,", 'gm');
  var n = 0; while (re.exec(membersBlock) !== null) n++;
  return n;
}

describe('Module 2 \u2014 Seed suite (14 cases)', function() {

  T('T-seed-1', function() {
    // db/seed_teams_v2.sql exists
    eq(fs.existsSync(seedPath), true, 'db/seed_teams_v2.sql exists');
  });

  T('T-seed-2', function() {
    // SQL contains exactly 22 distinct team_id values in teams INSERT block
    var seedContent = readSeed();
    var ids = teamIdsInSeed(seedContent);
    var distinct = Array.from(new Set(ids));
    eq(distinct.length, 22, '22 distinct team_id values in teams INSERT block');
  });

  T('T-seed-3', function() {
    // SQL never INSERTs into a teams.members JSONB column (members live in team_members)
    var seedContent = readSeed();
    // Detect "members" appearing as a teams-table column. team_members table is allowed.
    var hasTeamsMembersCol = /INSERT INTO teams[\s\S]*?\bmembers\b[\s\S]*?\)\s*VALUES/.test(seedContent);
    eq(hasTeamsMembersCol, false, 'SQL never INSERTs into a teams.members column');
  });

  T('T-seed-4', function() {
    // Every team_id from data.js TEAMS literal has a matching INSERT INTO teams row
    var dataContent = fs.readFileSync(dataPath, 'utf8');
    var start = dataContent.indexOf('const TEAMS = {') + 'const TEAMS = '.length;
    var depth = 0; var end = start;
    for (var i = start; i < dataContent.length; i++) {
      var c = dataContent[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    var teamsObj = JSON.parse(dataContent.substring(start, end));
    var dataTeamIds = Object.keys(teamsObj);
    var seedContent = readSeed();
    var seedIds = new Set(teamIdsInSeed(seedContent));
    dataTeamIds.forEach(function(id) {
      eq(seedIds.has(id), true, 'team_id ' + id + ' from data.js has matching INSERT in seed SQL');
    });
  });

  T('T-seed-5', function() {
    // Every team has 1..6 INSERT INTO team_members rows
    var seedContent = readSeed();
    var ids = Array.from(new Set(teamIdsInSeed(seedContent)));
    ids.forEach(function(teamId) {
      var n = memberRowsForTeam(seedContent, teamId);
      truthy(n >= 1 && n <= 6, 'team_id ' + teamId + ' has ' + n + ' member rows (expected 1..6)');
    });
  });

  T('T-seed-6', function() {
    // Migration adds metadata jsonb DEFAULT '{}'::jsonb
    eq(fs.existsSync(migrationMetaPath), true, 'metadata-column migration exists');
    var migrationContent = fs.readFileSync(migrationMetaPath, 'utf8');
    truthy(/ALTER TABLE\s+teams\s+ADD COLUMN[\s\S]*\bmetadata\b[\s\S]*JSONB[\s\S]*DEFAULT\s*'\{\}'::jsonb/i.test(migrationContent),
      'migration ALTERs teams to ADD metadata jsonb DEFAULT \'{}\'::jsonb');
  });

  T('T-seed-7', function() {
    // Migration file db/migrations/2026_04_28_seed_teams_v2.sql exists for apply_migration
    eq(fs.existsSync(migrationSeedPath), true, '2026_04_28_seed_teams_v2.sql exists');
  });

  T('T-seed-8', function() {
    // All member inserts are bracketed by a DELETE FROM team_members ... clean replace (idempotent re-run)
    var seedContent = readSeed();
    truthy(/DELETE FROM team_members\b/i.test(seedContent),
      'seed contains DELETE FROM team_members for clean replace');
    truthy(/DELETE FROM teams\b/i.test(seedContent),
      'seed contains DELETE FROM teams for clean replace');
  });

  T('T-seed-9', function() {
    // Generator script tools/generate_seed_from_data.py exists and produces stable byte-identical output on re-run
    eq(fs.existsSync(generatorPath), true, 'tools/generate_seed_from_data.py exists');
    var execSync = require('child_process').execSync;
    var py = process.platform === 'win32' ? 'python' : 'python3';
    var out1 = execSync(py + ' ' + JSON.stringify(generatorPath) + ' --stdout', { cwd: ROOT }).toString();
    var out2 = execSync(py + ' ' + JSON.stringify(generatorPath) + ' --stdout', { cwd: ROOT }).toString();
    eq(out1, out2, 'generator produces byte-identical output on re-run');
    // And the committed file matches the generator output
    var onDisk = fs.readFileSync(seedPath, 'utf8');
    eq(out1, onDisk, 'committed db/seed_teams_v2.sql matches generator output');
  });

  T('T-seed-10', function() {
    // Adapter no longer uses 'vgc2026_reg_m_a' as the runtime default for ruleset_id.
    // (It may still appear in a comment documenting the migration.)
    var adapterContent = fs.readFileSync(adapterPath, 'utf8');
    // No code path of the form: ruleset_id: payload.ruleset_id || 'vgc2026_reg_m_a'
    truthy(!/ruleset_id\s*:\s*payload\.ruleset_id\s*\|\|\s*'vgc2026_reg_m_a'/.test(adapterContent),
      'adapter no longer falls back to vgc2026_reg_m_a as ruleset_id default');
    // Adapter MUST reference the canonical ruleset id
    truthy(/champions_reg_m_doubles_bo3/.test(adapterContent),
      'adapter references the canonical ruleset id champions_reg_m_doubles_bo3');
  });

  T('T-seed-11', function() {
    // Every team's ruleset_id references champions_reg_m_doubles_bo3 (the only ruleset row created by the SQL)
    var seedContent = readSeed();
    truthy(/INSERT INTO rulesets[\s\S]*?'champions_reg_m_doubles_bo3'/.test(seedContent),
      'SQL inserts the champions_reg_m_doubles_bo3 ruleset row');
    // Every teams INSERT row carries the canonical ruleset_id.
    // Anchor on the indented row-start to avoid SQL-string-literal ';' false splits.
    var startIdx = seedContent.indexOf('INSERT INTO teams ');
    var endMarker = seedContent.indexOf('\n\n-- ====', startIdx);
    var block = endMarker === -1 ? seedContent.substring(startIdx) : seedContent.substring(startIdx, endMarker);
    var rowRe = /^  \('([a-z0-9_]+)'.*$/gm;
    var r;
    while ((r = rowRe.exec(block)) !== null) {
      truthy(r[0].indexOf("'champions_reg_m_doubles_bo3'") !== -1,
        'team row references champions_reg_m_doubles_bo3: ' + r[0].slice(0, 80));
    }
  });

  T('T-seed-12', function() {
    // Members evs JSONB has all six keys {hp,atk,def,spa,spd,spe}
    var seedContent = readSeed();
    var evsRe = /'(\{[^']*?\})'::jsonb/g;
    var m; var checked = 0;
    while ((m = evsRe.exec(seedContent)) !== null) {
      var blob = m[1];
      // Only check blobs that look like an EVs object (have at least 'hp' key)
      if (!/"hp"\s*:/.test(blob)) continue;
      ['hp','atk','def','spa','spd','spe'].forEach(function(k) {
        truthy(new RegExp('"' + k + '"\\s*:').test(blob), 'EVs blob missing key ' + k + ': ' + blob);
      });
      checked++;
    }
    truthy(checked > 0, 'at least one EVs blob inspected');
  });

  T('T-seed-13', function() {
    // Members moves JSONB is an array of 1..4 strings
    var seedContent = readSeed();
    var movesRe = /'(\[[^']*?\])'::jsonb/g;
    var m; var checked = 0;
    while ((m = movesRe.exec(seedContent)) !== null) {
      var blob = m[1];
      // Heuristic: skip non-moves arrays. Moves arrays contain quoted strings only.
      var arr;
      try { arr = JSON.parse(blob); } catch (e) { continue; }
      if (!Array.isArray(arr)) continue;
      if (arr.length === 0 || typeof arr[0] !== 'string') continue;
      truthy(arr.length >= 1 && arr.length <= 4, 'moves array has 1..4 strings: ' + JSON.stringify(arr));
      checked++;
    }
    truthy(checked > 0, 'at least one moves array inspected');
  });

  T('T-seed-14', function() {
    // Live DB smoke test, gated behind RUN_LIVE_DB=1
    if (!process.env.RUN_LIVE_DB) {
      console.log('    \u26A0 LIVE DB test skipped (RUN_LIVE_DB not set)');
      return;
    }
    var url = process.env.SUPABASE_URL;
    var key = process.env.SUPABASE_KEY;
    truthy(url && key, 'SUPABASE_URL and SUPABASE_KEY required for live test');
    // Use vendored UMD via tests harness — but for a smoke test we use plain HTTPS REST
    var https = require('https');
    function get(p) {
      return new Promise(function(resolve, reject) {
        var req = https.request(url + p, {
          method: 'GET',
          headers: { apikey: key, Authorization: 'Bearer ' + key, Prefer: 'count=exact' }
        }, function(res) {
          var body = '';
          res.on('data', function(d) { body += d; });
          res.on('end', function() {
            resolve({ status: res.statusCode, headers: res.headers, body: body });
          });
        });
        req.on('error', reject);
        req.end();
      });
    }
    return get('/rest/v1/teams?select=team_id').then(function(r) {
      truthy(r.status === 200, 'GET /teams returned 200, got ' + r.status);
      var arr = JSON.parse(r.body);
      truthy(arr.length === 22, 'live DB has 22 teams, got ' + arr.length);
    });
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 2 Seed Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('\u274C ' + _failed + ' tests failed');
    process.exit(1);
  }
  console.log('\u2705 All ' + _total + ' db_m2 seed tests GREEN');
});
