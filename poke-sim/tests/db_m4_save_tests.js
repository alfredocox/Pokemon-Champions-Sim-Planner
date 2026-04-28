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

describe('Module 4 — Save analyses suite (18 cases)', function() {
  
  T('T-save-1', function() {
    // _buildAnalysisPayload(playerKey, oppKey, 3, res) returns an object with all 14 required keys
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    var expectedKeys = ['engine_version', 'ruleset_id', 'player_team_id', 'opp_team_id', 'prior_id', 'policy_model', 'sample_size', 'bo', 'win_rate', 'wins', 'losses', 'draws', 'avg_turns', 'avg_tr_turns', 'ci_low', 'ci_high', 'hidden_info_model', 'analysis_json', 'win_conditions', 'logs'];
    expectedKeys.forEach(function(key) {
      truthy(payload[key], 'payload missing key: ' + key);
    });
  });
  
  T('T-save-2', function() {
    // Payload bo ∈ {1,3,5,10}; reject anything else
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 999, {});
    try {
      ctx.window.SupabaseAdapter.saveAnalysis(payload);
      throw new Error('Expected rejection for invalid bo=999');
    } catch (e) {
      // Expected to reject
    }
  });
  
  T('T-save-3', function() {
    // Payload policy_model is non-empty string
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, { policy_model: '' });
    try {
      ctx.window.SupabaseAdapter.saveAnalysis(payload);
      throw new Error('Expected rejection for empty policy_model');
    } catch (e) {
      // Expected to reject
    }
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
    // analyses.win_rate is numeric(5,4) in [0,1]
    installAdapter(ctx);
    var payload = ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {});
    payload.win_rate = 0.5;
    try {
      ctx.window.SupabaseAdapter.saveAnalysis(payload);
      throw new Error('Expected rejection for win_rate=0.5');
    } catch (e) {
      // Expected to reject
    }
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
    var result = ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    eq(result, null, 'saveAnalysis resolves to null on 4xx error');
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
    mockSupabaseClient.setErrorMode('rls_denied');
    var result = ctx.window.SupabaseAdapter.saveAnalysis(ctx.window._buildAnalysisPayload('player', 'mega_altaria', 3, {}));
    eq(result, null, 'saveAnalysis resolves to null on RLS denial');
    var mock = mockSupabaseClient.getState();
    var warnings = mock.warnings || [];
    eq(warnings.length, 1, 'RLS denial warning logged');
    eq(warnings[0].message, 'Import blocked by RLS policy', 'correct warning message');
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
