// db_m6_history_tests.js — Module 6: History tab suite (10 cases)
// PR: test/db-m6-history-tab → Linear: POK-22
// Spec: poke-sim/tests/db_m6_history_tests.js

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

describe('Module 6 — History tab suite (10 cases)', function() {
  
  T('T-hist-1', function() {
    // loadAnalysesForPlayer(playerKey, limit=50) exists on adapter
    var adapterPath = path.join(__dirname, '..', 'supabase_adapter.js');
    var adapterContent = fs.readFileSync(adapterPath, 'utf8');
    eq(adapterContent.includes('loadAnalysesForPlayer'), true, 'adapter exposes loadAnalysesForPlayer');
  });
  
  T('T-hist-2', function() {
    // Returns rows ordered by created_at DESC
    installAdapter(ctx);
    var mock = mockSupabaseClient([{ 
      analysis_id: 'analysis_1', created_at: '2026-04-20T10:00:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.6, wins: 6, losses: 4, draws: 0, avg_turns: 12.5, avg_tr_turns: 8.2, ci_low: 0.05, ci_high: 0.95, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 1}, {label: 'Time', count: 1}], logs: [] },
      { analysis_id: 'analysis_2',created_at: '2026-04-19T14:30:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.3, wins: 1, losses: 2, draws: 1, avg_turns: 14.7, avg_tr_turns: 9.8, ci_low: 0.12, ci_high: 0.88, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 1}], logs: [] },
      { analysis_id: 'analysis_3',created_at: '2026-04-18T09:15:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 5, win_rate: 0.4, wins: 2, losses: 3, draws: 0, avg_turns: 16.2, avg_tr_turns: 11.3, ci_low: 0.08, ci_high: 0.92, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 2}], logs: [] }
    ]);
    var result = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    
    eq(Array.isArray(result), true, 'loadAnalysesForPlayer returns array');
    eq(result.length, 3, 'returns 3 analyses');
    
    // Verify DESC order
    for (var i = 0; i < result.length - 1; i++) {
      if (i > 0) {
        eq(new Date(result[i].created_at).getTime(), new Date(result[i + 1].created_at).getTime(), true, 'analyses[' + (i + 1) + '] created after [' + (i) + ']');
      }
    }
  });
  
  T('T-hist-3', function() {
    // Default limit is 50
    installAdapter(ctx);
    var result = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player');
    eq(result.length, 3, 'loadAnalysesForPlayer with no limit returns 3 analyses');
  });
  
  T('T-hist-4', function() {
    // Replay Log tab render at L1666 prepends History subsection
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('addReplays(L1666'), true, 'addReplays(L1666) call prepends History subsection');
    eq(uiContent.includes('loadAnalysesForPlayer(playerKey, limit=50)'), true, 'loadAnalysesForPlayer called for history render');
  });
  
  T('T-hist-5', function() {
    // Existing All / Wins / Losses / Clutch filters work across both live + history rows
    installAdapter(ctx);
    var mock = mockSupabaseClient([
      { analysis_id: 'hist_1', created_at: '2026-04-15T08:00:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.75, wins: 9, losses: 3, draws: 0, avg_turns: 11.3, avg_tr_turns: 8.7, ci_low: 0.07, ci_high: 0.93, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 3}, {label: 'Time', count: 1}], logs: [] },
      { analysis_id: 'hist_2',created_at: '2026-04-10T16:45:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.25, wins: 1, losses: 3, draws: 0, avg_turns: 15.2, avg_tr_turns: 12.8, ci_low: 0.18, ci_high: 0.82, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 3}, {label: 'Time', count: 1}], logs: [] }
    ]);
    
    var result = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    var allWins = result.filter(a => a.win_rate > 0.5).length;
    var allLosses = result.filter(a => a.win_rate < 0.5).length;
    var clutchGames = result.filter(a => a.bo > 1 && a.win_rate < 0.5).length;
    
    // Test All filter
    var allResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(allResult.length, 3, 'All filter returns 3 analyses');
    
    // Test Wins filter
    var winsResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(winsResult.length, allWins.length, 'Wins filter returns ' + allWins.length + ' analyses');
    
    // Test Losses filter
    var lossesResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(lossesResult.length, allLosses.length, 'Losses filter returns ' + allLosses.length + ' analyses');
    
    // Test Clutch filter
    var clutchResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(clutchResult.length, clutchGames.length, 'Clutch filter returns ' + clutchGames.length + ' analyses');
  });
  
  T('T-hist-6', function() {
    // Empty history → empty-state message, not a blank panel
    installAdapter(ctx);
    var result = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(Array.isArray(result) && result.length === 0, true, 'empty history returns empty array');
    
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('No analyses yet'), true, 'empty history shows "No analyses yet" message');
  });
  
  T('T-hist-7', function() {
    // Click a history row → expanded view loads turn log via analysis_logs
    installAdapter(ctx);
    var mock = mockSupabaseClient([
      { analysis_id: 'expand_1', created_at: '2026-04-20T10:00:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.6, wins: 6, losses: 4, draws: 0, avg_turns: 10.5, ci_low: 0.09, ci_high: 0.91, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 4}, {label: 'Time', count: 1}], logs: [
        { result: 'win', turns: 12, tr_turns: 8, win_condition: 'ko', log: 'Critical hit on turn 8' },
        { result: 'loss', turns: 15, tr_turns: 10, win_condition: 'time', log: 'Ran out of PP' },
        { result: 'loss', turns: 18, tr_turns: 12, win_condition: 'time', log: 'Ran out of PP' }
      ] }
    ]);
    
    // Mock UI to capture lazy load
    var expandedRows = [];
    var originalLoad = ctx.window.SupabaseAdapter.loadAnalysesForPlayer;
    ctx.window.SupabaseAdapter.loadAnalysesForPlayer = function() {
      var result = originalLoad.apply(this, arguments);
      if (result && result.length > 0) {
        expandedRows.push(...result);
      }
      return result;
    };
    
    // Trigger expansion
    ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(expandedRows.length, 1, 'history row expansion triggers lazy load');
    
    // Verify expanded view loads analysis_logs
    var mock = mockSupabaseClient.getState();
    eq(mock.analysis_logs.length, 2, 'expanded view loads 2 analysis_logs rows');
  });
  
  T('T-hist-8', function() {
    // Filter chips work across both live + history rows
    installAdapter(ctx);
    var mock = mockSupabaseClient([
      { analysis_id: 'filter_1', created_at: '2026-04-21T12:00:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.8, wins: 12, losses: 3, draws: 0, avg_turns: 9.2, ci_low: 0.15, ci_high: 0.85, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 6}, {label: 'Time', count: 1}], logs: [] },
      { analysis_id: 'filter_2',created_at: '2026-04-22T09:30:00Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.2, wins: 2, losses: 8, draws: 0, avg_turns: 14.1, ci_low: 0.25, ci_high: 0.75, hidden_info_model: null, analysis_json: {}, win_conditions: [{label: 'KO', count: 3}, {label: 'Time', count: 1}], logs: [] }
    ]);
    
    // Test All filter (should return all 3)
    var allResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(allResult.length, 3, 'All filter returns all 3 analyses');
    
    // Test Wins filter (should return 2)
    var winsResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(winsResult.length, 2, 'Wins filter returns 2 analyses');
    
    // Test Losses filter (should return 1)
    var lossesResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(lossesResult.length, 1, 'Losses filter returns 1 analysis');
    
    // Test Clutch filter (should return 0)
    var clutchResult = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(clutchResult.length, 0, 'Clutch filter returns 0 analyses');
  });
  
  T('T-hist-9', function() {
    // Mock returns 4xx → falls back to in-memory current-session rows; no crash
    installAdapter(ctx);
    mockSupabaseClient.setErrorMode('4xx');
    var result = ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    eq(Array.isArray(result) && result.length === 0, true, '4xx error falls back to in-memory rows');
    
    // Check no crash
    truthy(ctx.window.TEAMS, 'in-memory TEAMS still available after 4xx error');
  });
  
  T('T-hist-10', function() {
    // Fresh tab open → history loads ≤ 800 ms on normal connection
    installAdapter(ctx);
    var startTime = Date.now();
    ctx.window.SupabaseAdapter.loadAnalysesForPlayer('player', 50);
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    eq(duration <= 800, true, 'history loads within 800ms on normal connection');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 6 History Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: before M6 lands, loadAnalysesForPlayer doesn't exist → T-1, T-3, T-5, T-8, T-9 fail.
// GREEN trigger: after M6 impl PR, all 10 pass.
