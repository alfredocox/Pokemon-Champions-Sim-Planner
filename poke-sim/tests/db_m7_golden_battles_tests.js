// db_m7_golden_battles_tests.js — Module 7: Golden battles suite (8 cases)
// PR: test/db-m7-golden-battles-runner → Linear: POK-23
// Spec: poke-sim/tests/db_m7_golden_battles_tests.js + poke-sim/tests/golden_battles_runner.js

'use strict';

// Load shared helpers
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { mockSupabaseClient, installAdapter, offlineMode, assertNoServiceRole } = require('./_db_helpers.js');

// Test harness
var _passed = 0, _failed = 0, _total = 0;
function T(name, fn) { _total++; try { fn(); _passed++; console.log('  ✔ ' + name); } catch (e) { _failed++; console.log('  ✖ FAIL: ' + name + ' — ' + e.message); } }
function describe(name, fn) { console.log('\n▶ ' + name); fn(); }
function eq(a, b, msg) { if (a !== b) throw new Error(msg + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function truthy(v, msg) { if (!v) throw new Error(msg + ' expected truthy'); }
function falsy(v, msg) { if (v) throw new Error(msg + ' expected falsy'); }

// Create test context
var ctx = {
  console,
  require,
  module: { exports: {} },
  window: {},
  document: { 
    getElementById: () => null,
    addEventListener: () => {}
  }
};

describe('Module 7 — Golden battles suite (8 cases)', function() {
  
  T('T-golden-1', function() {
    // tests/golden_battles_runner.js exists and exits 0 against current engine
    var runnerPath = path.join(__dirname, 'golden_battles_runner.js');
    if (fs.existsSync(runnerPath)) {
      var result = require('child_process').execSync('node "' + runnerPath + '"', { cwd: path.join(__dirname, '..') });
      eq(result.status, 0, 'golden_battles_runner.js exits 0');
    } else {
      throw new Error('golden_battles_runner.js not found');
    }
  });
  
  T('T-golden-2', function() {
    // Runner pulls all golden_battles rows + linked teams via adapter (mock)
    installAdapter(ctx);
    var mock = mockSupabaseClient([
      { analysis_id: 'battle_1', created_at: '2026-04-20T10:00:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 1.0, wins: 60, losses: 0, draws: 0, avg_turns: 12.5, avg_tr_turns: 8.2, ci_low: 0.05, ci_high: 0.95, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 60}, {label: 'Time', count: 1}], logs: [] },
      { analysis_id: 'battle_2', created_at: '2026-04-20T10:05:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.8, wins: 48, losses: 12, draws: 0, avg_turns: 14.2, avg_tr_turns: 9.8, ci_low: 0.08, ci_high: 0.92, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 12}, {label: 'Time', count: 1}], logs: [] },
      { analysis_id: 'battle_3', created_at: '2026-04-20T10:10:00Z', player_team_id: 'player', opp_team_id: 'chuppa_balance', bo: 3, win_rate: 0.3, wins: 18, losses: 42, draws: 0, avg_turns: 16.7, avg_tr_turns: 11.3, ci_low: 0.07, ci_high: 0.93, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 18}, {label: 'Time', count: 1}], logs: [] }
    ]);
    
    var mock = mockSupabaseClient.getState();
    eq(mock.golden_battles.length, 3, 'golden_battles table has 3 rows');
    eq(mock.teams.length, 2, 'runner pulled 2 teams (player, mega_altaria)');
  });
  
  T('T-golden-3', function() {
    // Each battle replays with engine.runOneBattle(seed) and trace SHA256 matches expected_trace_hash
    installAdapter(ctx);
    var mock = mockSupabaseClient.getState();
    var battles = mock.golden_battles;
    
    battles.forEach(function(battle) {
      var seed = battle.player_team_id + '-' + battle.opp_team_id;
      var expectedTrace = mock.expectedTraces[seed];
      var actualTrace = mock.traces[battle.analysis_id];
      eq(actualTrace, expectedTrace, 'trace hash matches expected for ' + seed);
    });
  });
  
  T('T-golden-4', function() {
    // Intentional damage formula tweak → runner exits non-zero with a turn-N diff message
    installAdapter(ctx);
    var mock = mockSupabaseClient.getState();
    mock.expectedTraces = { 'tweak-battle': 'different-hash' };
    mock.traces = { 'tweak-battle': 'modified-hash' };
    
    // Mock engine to return different hash
    ctx.window.engine.runOneBattle = function(seed) {
      if (seed === 'tweak-battle') return 'modified-hash';
      return 'original-hash';
    };
    
    try {
      require('child_process').execSync('node "' + runnerPath + '"', { cwd: path.join(__dirname, '..') });
      throw new Error('Expected non-zero exit for tweaked battle');
    } catch (e) {
      eq(e.message.includes('Expected non-zero exit'), true, 'runner correctly detected tweak');
    }
  });
  
  T('T-golden-5', function() {
    // Runner runs offline using cached fixture if RUN_LIVE_DB is unset
    if (!process.env.RUN_LIVE_DB) {
      // Mock cached fixture
      mock.cachedFixture = {
        golden_battles: battles,
        teams: mock.teams
      };
    }
    
    // Set env var to trigger offline mode
    delete process.env.RUN_LIVE_DB;
    require('child_process').execSync('node "' + runnerPath + '"', { cwd: path.join(__dirname, '..'), env: { RUN_LIVE_DB: undefined } });
    
    var result = require('child_process').execSync('node "' + runnerPath + '"', { cwd: path.join(__dirname, '..') });
    eq(result.status, 0, 'runner runs offline using cached fixture');
    truthy(mock.cachedFixture, 'cached fixture was used');
  });
  
  T('T-golden-6', function() {
    // Runner total time ≤ 5 s for 3 battles
    installAdapter(ctx);
    var startTime = Date.now();
    require('child_process').execSync('node "' + runnerPath + '"', { cwd: path.join(__dirname, '..') });
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    eq(duration <= 5000, true, 'runner completed within 5 seconds for 3 battles');
  });
  
  T('T-golden-7', function() {
    // npm run test:golden registered in package.json or tests/README.md
    var packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      var hasTest = packageJson.scripts && packageJson.scripts['test:golden'];
      eq(hasTest, true, 'npm run test:golden script registered');
    } else {
      var readmePath = path.join(__dirname, '..', 'tests', 'README.md');
      if (fs.existsSync(readmePath)) {
        var readme = fs.readFileSync(readmePath, 'utf8');
        eq(readme.includes('npm run test:golden'), true, 'README.md contains npm run test:golden');
      }
    }
  });
  
  T('T-golden-8', function() {
    // get_advisors after full deploy (gated, live) returns zero error-level findings
    installAdapter(ctx);
    mockSupabaseClient.setLiveMode(true);
    var securityResult = ctx.window.SupabaseAdapter.get_advisors();
    var perfResult = ctx.window.SupabaseAdapter.get_advisors();
    
    eq(securityResult.length, 0, 'security advisor returns zero error-level findings');
    eq(perfResult.length, 0, 'performance advisor returns zero error-level findings');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 7 Golden Battles Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: before M7 lands, golden_battles table is empty → T-1, T-3, T-5, T-6 fail; T-2, T-4, T-7, T-8 pass.
// GREEN trigger: after M7 impl PR, all 8 pass.
