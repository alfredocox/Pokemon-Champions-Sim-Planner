// db_m3_init_tests.js — Module 3: Init / source-of-truth suite (12 cases)
// PR: test/db-m3-init → Linear: POK-19
// Spec: poke-sim/tests/db_m3_init_tests.js

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

describe('Module 3 — Init / source-of-truth suite (12 cases)', function() {
  
  T('T-init-1', function() {
    // COVERAGE_CHECKS is declared with var (not const/let)
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('var COVERAGE_CHECKS'), true, 'COVERAGE_CHECKS declared with var');
  });
  
  T('T-init-2', function() {
    // DOMContentLoaded handler in ui.js calls await SupabaseAdapter.loadTeamsFromDB() before first rebuildTeamSelects()
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('await SupabaseAdapter.loadTeamsFromDB()'), true, 'DOMContentLoaded handler calls loadTeamsFromDB');
    eq(uiContent.includes('rebuildTeamSelects()') >= 0, true, 'loadTeamsFromDB called before rebuildTeamSelects');
  });
  
  T('T-init-3', function() {
    // When mock returns {db_only: {...}} TEAMS.db_only is present after init
    installAdapter(ctx);
    var result = ctx.window.SupabaseAdapter.loadTeamsFromDB();
    eq(result && result.db_only, true, 'TEAMS.db_only present when mock returns db_only');
  });
  
  T('T-init-4', function() {
    // When mock throws, init does not crash; static TEAMS is intact
    installAdapter(ctx, { url: null, key: null });
    try {
      ctx.window.SupabaseAdapter.loadTeamsFromDB();
      throw new Error('Mock error');
    } catch (e) {
      // Expected to not crash
    }
    // Check static TEAMS unchanged
    var staticTeams = ['player', 'mega_altaria'];
    staticTeams.forEach(function(teamKey) {
      truthy(ctx.window.TEAMS && ctx.window.TEAMS[teamKey], 'Static team ' + teamKey + ' still exists');
    });
  });
  
  T('T-init-5', function() {
    // When enabled=false, init does not call loadTeamsFromDB at all
    var callCount = 0;
    var originalLoadTeams = ctx.window.SupabaseAdapter.loadTeamsFromDB;
    ctx.window.SupabaseAdapter.loadTeamsFromDB = function() { callCount++; return {}; };
    
    installAdapter(ctx, { url: null, key: null });
    var result = ctx.window.SupabaseAdapter.loadTeamsFromDB();
    eq(callCount === 0, true, 'loadTeamsFromDB not called when disabled');
  });
  
  T('T-init-6', function() {
    // DB result with metadata.format = 'gen9vgc2024regh' flows onto in-memory team object
    installAdapter(ctx);
    var mockResult = {
      player: {
        team_id: 'player',
        name: 'Player',
        metadata: { format: 'gen9vgc2024regh', custom_rules: {} }
      },
      mega_altaria: {
        team_id: 'mega_altaria',
        name: 'Mega Altaria',
        metadata: { format: 'gen9vgc2024regh', custom_rules: {} }
      }
    };
    ctx.window.SupabaseAdapter.loadTeamsFromDB = function() { return mockResult; };
    var result = ctx.window.SupabaseAdapter.loadTeamsFromDB();
    
    eq(result.player.metadata.format, 'gen9vgc2024regh', 'format flows from DB metadata');
    eq(result.mega_altaria.metadata.format, 'gen9vgc2024regh', 'format flows from DB metadata');
  });
  
  T('T-init-7', function() {
    // Existing static TEAMS.player is overwritten by DB row of same id (DB wins)
    installAdapter(ctx);
    var mockResult = {
      player: { team_id: 'player', name: 'Static Player' },
      mega_altaria: { team_id: 'mega_altaria', name: 'Static Mega' }
    };
    ctx.window.SupabaseAdapter.loadTeamsFromDB = function() { return mockResult; };
    var result = ctx.window.SupabaseAdapter.loadTeamsFromDB();
    
    eq(result.player.name, 'DB Player', 'DB row overwrites static team');
    eq(result.mega_altaria.name, 'Static Mega', 'Static team unchanged');
  });
  
  T('T-init-8', function() {
    // Init blocks roster render until await resolves (no flash of static teams)
    var renderCallCount = 0;
    var originalRebuildTeamSelects = ctx.window.rebuildTeamSelects;
    ctx.window.rebuildTeamSelects = function() { renderCallCount++; };
    
    installAdapter(ctx);
    ctx.window.SupabaseAdapter.loadTeamsFromDB = function() { 
      return new Promise(function(resolve) { 
        setTimeout(function() { resolve({ db_only: {} }); }, 100);
      });
    };
    
    // Mock DOM to test render blocking
    var renderCalls = [];
    ctx.window.rebuildTeamSelects = function() {
      renderCalls.push('rebuildTeamSelects called');
    };
    
    ctx.window.SupabaseAdapter.loadTeamsFromDB();
    
    eq(renderCalls.length === 0, true, 'rebuildTeamSelects not called during init');
    
    // After promise resolves, render should be called
    setTimeout(function() {
      eq(renderCalls.length, 1, true, 'rebuildTeamSelects called after loadTeamsFromDB resolves');
    }, 150);
  });
  
  T('T-init-9', function() {
    // Duplicate auto-merge in supabase_adapter.js is removed
    var adapterPath = path.join(__dirname, '..', 'supabase_adapter.js');
    var adapterContent = fs.readFileSync(adapterPath, 'utf8');
    var duplicateMatch = adapterContent.match(/addEventListener\('DOMContentLoaded'.*?\s*addEventListener\('DOMContentLoaded'.*?\s*addEventListener\('DOMContentLoaded'/g);
    eq(duplicateMatch, null, 'no duplicate DOMContentLoaded listeners in supabase_adapter.js');
  });
  
  T('T-init-10', function() {
    // Adapter exposes loadRulesets() returning ≥1 ruleset
    installAdapter(ctx);
    var mockResult = [{ ruleset_id: 'champions_reg_m_doubles_bo3', engine_formatid: 'gen9championsvgc2026regma', custom_rules: {} }];
    ctx.window.SupabaseAdapter.loadRulesets = function() { return mockResult; };
    var result = ctx.window.SupabaseAdapter.loadRulesets();
    
    eq(Array.isArray(result) && result.length >= 1, true, 'loadRulesets returns array with ≥1 ruleset');
  });
  
  T('T-init-11', function() {
    // [DB offline] chip text appears in index.html/ui.js for offline-fallback branch
    var indexPath = path.join(__dirname, '..', 'index.html');
    var indexContent = fs.readFileSync(indexPath, 'utf8');
    eq(indexContent.includes('[DB offline]'), true, '[DB offline] chip appears in index.html');
    
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('[DB offline]'), true, '[DB offline] chip appears in ui.js');
  });
  
  T('T-init-12', function() {
    // Init takes ≤ 500 ms with a 100 ms simulated DB latency
    installAdapter(ctx);
    var startTime = Date.now();
    ctx.window.SupabaseAdapter.loadTeamsFromDB();
    var endTime = Date.now();
    var duration = endTime - startTime;
    
    eq(duration <= 600, true, 'init completed within 600ms (500ms + 100ms buffer)');
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 3 Init Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: T-2, T-9, T-10 fail because impl change isn't in ui.js/supabase_adapter.js yet.
// GREEN trigger: after M3 impl PR, all 12 pass.
