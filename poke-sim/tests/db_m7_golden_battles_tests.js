// db_m7_golden_battles_tests.js — Module 7: Golden battles regression (8 cases)
// PR: test/db-m7-golden-battles-runner → Linear: POK-23
// Spec: poke-sim/tests/db_m7_golden_battles_tests.js
//
// RED state: before M7 lands, runner/fixture don't exist or have no hashes → all fail.
// GREEN trigger: after M7 impl PR (POK-23), all 8 pass.

'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test harness
var _passed = 0, _failed = 0, _total = 0;
function T(name, fn) { _total++; try { fn(); _passed++; console.log('  ✔ ' + name); } catch (e) { _failed++; console.log('  ✖ FAIL: ' + name + ' — ' + e.message); } }
function describe(name, fn) { console.log('\n▶ ' + name); fn(); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function truthy(v, msg) { if (!v) throw new Error(msg + ' expected truthy'); }

// Paths
var RUNNER_PATH = path.join(__dirname, 'golden_battles_runner.js');
var FIXTURE_PATH = path.join(__dirname, 'fixtures', 'golden_battles.json');
var README_PATH = path.join(__dirname, 'README.md');
var ROOT = path.resolve(__dirname, '..');

// Load runner module
var runner = require(RUNNER_PATH);

describe('Module 7 — Golden battles regression (8 cases)', function() {

  T('T-golden-1', function() {
    // golden_battles_runner.js exists and is requireable
    truthy(fs.existsSync(RUNNER_PATH), 'golden_battles_runner.js must exist');
    truthy(typeof runner.run === 'function', 'runner exports run()');
    truthy(typeof runner.traceHash === 'function', 'runner exports traceHash()');
    truthy(typeof runner.createEngineContext === 'function', 'runner exports createEngineContext()');
  });

  T('T-golden-2', function() {
    // Fixture file exists and has ≥3 battles with required fields
    truthy(fs.existsSync(FIXTURE_PATH), 'golden_battles.json fixture must exist');
    var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    truthy(Array.isArray(fixture.battles), 'fixture.battles is array');
    truthy(fixture.battles.length >= 3, 'at least 3 golden battles seeded');
  });

  T('T-golden-3', function() {
    // Each battle replays deterministically: hash matches fixture
    var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    var ctx = runner.createEngineContext();
    var TEAMS = ctx.TEAMS;
    var simulateBattle = ctx.simulateBattle;

    for (var i = 0; i < fixture.battles.length; i++) {
      var b = fixture.battles[i];
      truthy(b.expected_trace_hash, b.golden_id + ' must have expected_trace_hash');
      var result = simulateBattle(TEAMS[b.player_team_id], TEAMS[b.opp_team_id], {
        format: b.format || 'doubles',
        seed: b.seed
      });
      var hash = runner.traceHash(result.log);
      eq(hash, b.expected_trace_hash, b.golden_id + ' trace hash mismatch');
      eq(result.result, b.expected_winner, b.golden_id + ' winner mismatch');
    }
  });

  T('T-golden-4', function() {
    // Intentional engine tweak → hash mismatch detected
    var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    var b = fixture.battles[0];
    // Tamper with expected hash to simulate engine drift
    var tamperedHash = 'aaaa' + b.expected_trace_hash.substring(4);
    truthy(tamperedHash !== b.expected_trace_hash, 'tampered hash differs');
    // Re-run and confirm actual hash does NOT match tampered
    var ctx = runner.createEngineContext();
    var result = ctx.simulateBattle(ctx.TEAMS[b.player_team_id], ctx.TEAMS[b.opp_team_id], {
      format: b.format || 'doubles',
      seed: b.seed
    });
    var actualHash = runner.traceHash(result.log);
    truthy(actualHash !== tamperedHash, 'engine correctly produces different hash from tampered expectation');
    // And confirm actual DOES match the real fixture hash (engine is stable)
    eq(actualHash, b.expected_trace_hash, 'actual hash still matches true fixture');
  });

  T('T-golden-5', function() {
    // Runner works offline — uses local fixture, no DB/adapter needed
    // Verify runner module does NOT require supabase_adapter.js
    var runnerSrc = fs.readFileSync(RUNNER_PATH, 'utf8');
    eq(runnerSrc.indexOf('supabase_adapter') === -1, true,
      'runner must not depend on supabase_adapter (offline-only)');
  });

  T('T-golden-6', function() {
    // Runner total time ≤ 5s for 3 battles
    var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    var ctx = runner.createEngineContext();
    var start = Date.now();
    for (var i = 0; i < fixture.battles.length; i++) {
      var b = fixture.battles[i];
      ctx.simulateBattle(ctx.TEAMS[b.player_team_id], ctx.TEAMS[b.opp_team_id], {
        format: b.format || 'doubles',
        seed: b.seed
      });
    }
    var elapsed = Date.now() - start;
    truthy(elapsed <= 5000, 'runner must complete 3 battles within 5s (took ' + elapsed + 'ms)');
  });

  T('T-golden-7', function() {
    // Runner is registered in tests/README.md
    truthy(fs.existsSync(README_PATH), 'tests/README.md must exist');
    var readme = fs.readFileSync(README_PATH, 'utf8');
    truthy(readme.indexOf('golden_battles_runner') !== -1,
      'README.md must reference golden_battles_runner');
  });

  T('T-golden-8', function() {
    // Fixture schema validation: all required fields present per battle
    var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    var required = ['golden_id', 'player_team_id', 'opp_team_id', 'seed', 'description', 'expected_trace_hash', 'expected_winner'];
    for (var i = 0; i < fixture.battles.length; i++) {
      var b = fixture.battles[i];
      for (var j = 0; j < required.length; j++) {
        truthy(b[required[j]] !== undefined && b[required[j]] !== null,
          b.golden_id + ' missing field: ' + required[j]);
      }
      truthy(Array.isArray(b.seed) && b.seed.length === 4,
        b.golden_id + ' seed must be 4-element array');
    }
  });
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('Module 7 Golden Battles Results: ' + _passed + '/' + _total + ' passed');
if (_failed > 0) {
  console.log('❌ ' + _failed + ' tests FAILED');
  process.exit(1);
} else {
  console.log('✅ All tests passed');
}
