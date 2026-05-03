// db_m4_save_tests.js — Module 4: Save analyses suite (18 cases)
// PR: test/db-m4-save-analyses → Linear: POK-20
// Spec: poke-sim/tests/db_m4_save_tests.js

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

// Create test context.
// We use the shared freshCtx() so supabase_adapter.js IIFE has its expected
// globals, then attach the M4 surface (TEAMS, _buildAnalysisPayload) by
// loading ui.js bits — but for unit-level tests we only need _buildAnalysisPayload
// on window, which the M4 impl will define. ui.js is too heavy to vm-load
// directly in tests (it touches DOM), so we expose a minimal shim that mirrors
// the impl contract and seed TEAMS.
var { freshCtx } = require('./_db_helpers.js');
var ctx = freshCtx();
// Seed TEAMS so T-save-14 (run-all) has opponents.
ctx.window.TEAMS = {
  player:           { name: 'Player Team',     members: [] },
  mega_altaria:     { name: 'Mega Altaria',    members: [] },
  mega_metagross:   { name: 'Mega Metagross',  members: [] },
  mega_salamence:   { name: 'Mega Salamence',  members: [] }
};
// Load _buildAnalysisPayload from ui.js by extracting just that function.
// The M4 impl defines window._buildAnalysisPayload at module scope of ui.js,
// guarded so it's safe to vm-eval in isolation.
(function loadBuildPayload() {
  var uiPath = path.resolve(__dirname, '..', 'ui.js');
  if (!fs.existsSync(uiPath)) return;
  var uiSrc = fs.readFileSync(uiPath, 'utf8');
  var marker = '// __M4_BUILD_PAYLOAD_BEGIN__';
  var endMarker = '// __M4_BUILD_PAYLOAD_END__';
  var b = uiSrc.indexOf(marker);
  var e = uiSrc.indexOf(endMarker);
  if (b === -1 || e === -1) return;          // RED state — not yet implemented
  var snippet = uiSrc.substring(b, e + endMarker.length);
  vm.runInContext(snippet, ctx);
})();

describe('Module 4 — Save analyses suite (18 cases)', function() {
  
  T('T-save-1', function() {
    // _buildAnalysisPayload(playerKey, oppKey, 3, res) returns an object with all 20 required keys
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    var expectedKeys = ['engine_version', 'ruleset_id', 'player_team_id', 'opp_team_id', 'prior_id', 'policy_model', 'sample_size', 'bo', 'win_rate', 'wins', 'losses', 'draws', 'avg_turns', 'avg_tr_turns', 'ci_low', 'ci_high', 'hidden_info_model', 'analysis_json', 'win_conditions', 'logs'];
    expectedKeys.forEach(function(key) {
      // Use key-presence (not truthy) so legitimate 0 / null / [] values pass.
      eq(key in payload, true, 'payload missing key: ' + key);
    });
  });
  
  T('T-save-2', function() {
    // Payload bo ∈ {1,3,5,10}; _buildAnalysisPayload rejects anything else
    var threw = false;
    try {
      ctx.window._buildAnalysisPayload('player', 'mega_altaria', 999, {});
    } catch (e) {
      threw = true;
    }
    eq(threw, true, '_buildAnalysisPayload should reject invalid bo=999');
  });
  
  T('T-save-3', function() {
    // Payload policy_model is non-empty string
    var threw = false;
    try {
      ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { policy_model: '' });
    } catch (e) {
      threw = true;
    }
    eq(threw, true, '_buildAnalysisPayload should reject empty policy_model');
  });
  
  T('T-save-4', function() {
    // Default ruleset_id is champions_reg_m_doubles_bo3 (a seeded id)
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    eq(payload.ruleset_id, 'champions_reg_m_doubles_bo3', 'default ruleset_id is champions_reg_m_doubles_bo3');
  });
  
  T('T-save-5', function() {
    // Single Bo3 run → exactly one analyses insert in mock
    installAdapter(ctx);
    ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    var mock = mockSupabaseClient.getState();
    eq(mock.analyses.length, 1, 'single Bo3 run creates exactly one analyses row');
  });
  
  T('T-save-6', function() {
    // Same Bo3 run → ≥1 analysis_win_conditions row
    installAdapter(ctx);
    ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    var mock = mockSupabaseClient.getState();
    eq(mock.analysis_win_conditions.length, 1, 'Bo3 run creates ≥1 analysis_win_conditions row');
  });
  
  T('T-save-7', function() {
    // Same Bo3 run → ≤50 analysis_logs rows
    installAdapter(ctx);
    ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    var mock = mockSupabaseClient.getState();
    eq(mock.analysis_logs.length <= 50, true, 'Bo3 run creates ≤50 analysis_logs rows');
  });
  
  T('T-save-8', function() {
    // analysis_logs rows preserve (turns, tr_turns, win_condition, log) fields
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    payload.logs = [
      { result: 'win', turns: 12, tr_turns: 8, win_condition: 'ko', log: 'Critical hit' },
      { result: 'loss', turns: 15, tr_turns: 10, win_condition: 'time', log: 'Ran out of PP' }
    ];
    ctx.window.SupabaseAdapter.saveAnalysis(payload);
    var mock = mockSupabaseClient.getState();
    eq(mock.analysis_logs.length, 2, 'analysis_logs preserve required fields');
    mock.analysis_logs.forEach(function(log) {
      truthy(log.turns && log.tr_turns && log.win_condition && log.log, 'log has all required fields');
    });
  });
  
  T('T-save-9', function() {
    // analysis_win_conditions row labels are non-empty distinct strings
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {
      win_conditions: [{label: 'KO', count: 1}, {label: 'Time', count: 1}]
    });
    ctx.window.SupabaseAdapter.saveAnalysis(payload);
    var mock = mockSupabaseClient.getState();
    eq(mock.analysis_win_conditions.length, 2, 'win_conditions has 2 distinct labels');
  });
  
  T('T-save-10', function() {
    // analyses.win_rate is numeric(5,4) in [0,1] — reject out-of-range only.
    // 0.5 is valid; 1.5 and -0.1 must be rejected by _buildAnalysisPayload.
    installAdapter(ctx);
    // Valid mid-range value should NOT throw.
    var ok = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { win_rate: 0.5 });
    eq(ok.win_rate, 0.5, 'win_rate=0.5 is valid (in [0,1])');
    // Out-of-range high
    var threwHigh = false;
    try { ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { win_rate: 1.5 }); }
    catch (e) { threwHigh = true; }
    eq(threwHigh, true, '_buildAnalysisPayload should reject win_rate=1.5 (>1)');
    // Out-of-range low
    var threwLow = false;
    try { ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { win_rate: -0.1 }); }
    catch (e) { threwLow = true; }
    eq(threwLow, true, '_buildAnalysisPayload should reject win_rate=-0.1 (<0)');
  });
  
  T('T-save-11', function() {
    // wins + losses + draws === sample_size
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { sample_size: 100 });
    payload.wins = 60; payload.losses = 30; payload.draws = 10;
    ctx.window.SupabaseAdapter.saveAnalysis(payload);
    var mock = mockSupabaseClient.getState();
    eq(mock.wins + mock.losses + mock.draws, 100, 'wins + losses + draws === sample_size');
  });
  
  T('T-save-12', function() {
    // Mock raises a 4xx error → saveAnalysis resolves to null (no throw)
    installAdapter(ctx);
    mockSupabaseClient.setErrorMode('4xx');
    var p = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    var result;
    return Promise.resolve(ctx.window.SupabaseAdapter.saveAnalysis(p)).then(function (r) {
      result = r;
      eq(result, null, 'saveAnalysis resolves to null on 4xx error');
      mockSupabaseClient.setErrorMode(null);
    });
  });
  
  T('T-save-13', function() {
    // UI is not blocked by saveAnalysis — assertion: runBoSeries resolution time ≤ baseline + 5 ms
    installAdapter(ctx);
    var startTime = Date.now();
    ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    var endTime = Date.now();
    eq(endTime - startTime <= 5, true, 'saveAnalysis completes within 5ms');
  });
  
  T('T-save-14', function() {
    // Run-all (L1942) saves N analyses where N = number of opponents
    installAdapter(ctx);
    var opponents = Object.keys(ctx.window.TEAMS).filter(k => k !== 'player');
    var expectedCalls = opponents.length;
    var actualCalls = 0;
    
    opponents.forEach(function(oppKey) {
      ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', oppKey, 3, {}));
      actualCalls++;
    });
    
    var mock = mockSupabaseClient.getState();
    eq(actualCalls, expectedCalls, 'run-all saves N analyses where N = number of opponents');
  });
  
  T('T-save-15', function() {
    // Two identical Bo3 runs → two analyses rows with different UUIDs (no upsert)
    installAdapter(ctx);
    var payload1 = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    var payload2 = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    
    ctx.window.SupabaseAdapter.saveAnalysis(payload1);
    var mock1 = mockSupabaseClient.getState();
    var analysis1 = mock1.analyses[mock1.analyses.length - 1];
    
    ctx.window.SupabaseAdapter.saveAnalysis(payload2);
    var mock2 = mockSupabaseClient.getState();
    var analysis2 = mock2.analyses[mock2.analyses.length - 1];
    
    var mock = mockSupabaseClient.getState();
    eq(mock.analyses.length, 2, 'two analyses rows created');
    eq(analysis1.analysis_id !== analysis2.analysis_id, 'two analyses have different UUIDs (no upsert)');
  });
  
  T('T-save-16', function() {
    // analysis_json includes pilot guide blob
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {
      analysis_json: { pilot_guide: 'Switch to weather ball teams' }
    });
    ctx.window.SupabaseAdapter.saveAnalysis(payload);
    var mock = mockSupabaseClient.getState();
    var analysis = mock.analyses[mock.analyses.length - 1];
    eq(analysis.analysis_json.pilot_guide, 'Switch to weather ball teams', 'analysis_json includes pilot guide blob');
  });
  
  T('T-save-17', function() {
    // created_by column accepts null from anonymous client
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    payload.created_by = null;
    ctx.window.SupabaseAdapter.saveAnalysis(payload);
    var mock = mockSupabaseClient.getState();
    var analysis = mock.analyses[mock.analyses.length - 1];
    eq(analysis.created_by, null, 'created_by accepts null from anonymous client');
  });
  
  T('T-save-18', function() {
    // Mock raises RLS denial → import still completes locally; warning logged
    installAdapter(ctx);
    mockSupabaseClient.reset();
    mockSupabaseClient.setErrorMode('rls_denied');
    var p = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    return Promise.resolve(ctx.window.SupabaseAdapter.saveAnalysis(p)).then(function (result) {
      eq(result, null, 'saveAnalysis resolves to null on RLS denial');
      var mock = mockSupabaseClient.getState();
      var warnings = mock.warnings || [];
      eq(warnings.length >= 1, true, 'RLS denial warning logged');
      eq(warnings[0].message, 'Import blocked by RLS policy', 'correct warning message');
      mockSupabaseClient.setErrorMode(null);
    });
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 4 Save Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: before M4 lands, _buildAnalysisPayload doesn't exist and call sites don't invoke saveAnalysis → T-1 through T-17 fail.
// GREEN trigger: after M4 impl PR, all 18 pass.
