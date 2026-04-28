// db_m1_wiring_tests.js — Module 1: Wiring suite (16 cases)
// PR: test/db-m1-wiring → Linear: POK-17
// Spec: poke-sim/tests/db_m1_wiring_tests.js

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

describe('Module 1 — Wiring suite (16 cases)', function() {
  
  T('T-wiring-1', function() {
    // Built bundle exists
    var bundlePath = path.join(__dirname, '..', 'pokemon-champion-2026.html');
    eq(fs.existsSync(bundlePath), true, 'fs.statSync(\'pokemon-champion-2026.html\') does not throw');
  });
  
  T('T-wiring-2', function() {
    // Bundle contains window.SupabaseAdapter = { literal
    var bundleContent = fs.readFileSync(bundlePath, 'utf8');
    eq(bundleContent.includes('window.SupabaseAdapter = {'), true, 'bundle contains SupabaseAdapter literal');
  });
  
  T('T-wiring-3', function() {
    // Bundle contains supabase-js UMD inlined
    eq(bundleContent.includes('createClient'), true, 'bundle contains supabase-js createClient');
    eq(bundleContent.includes('_UMD'), true, 'bundle contains supabase-js UMD guard');
  });
  
  T('T-wiring-4', function() {
    // Bundle does not contain <script src="https://cdn.jsdelivr.net/.*supabase
    falsy(bundleContent.match(/<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/[^>]*supabase/), 'bundle contains external supabase CDN tag');
  });
  
  T('T-wiring-5', function() {
    // assertNoServiceRole(bundle) passes
    assertNoServiceRole(bundlePath);
  });
  
  T('T-wiring-6', function() {
    // Bundle size < 800 KB
    var stats = fs.statSync(bundlePath);
    eq(stats.size < 800 * 1024, true, 'bundle size < 800 KB');
  });
  
  T('T-wiring-7', function() {
    // index.html references supabase_adapter.js after ui.js
    var indexPath = path.join(__dirname, '..', 'index.html');
    var indexContent = fs.readFileSync(indexPath, 'utf8');
    var adapterIdx = indexContent.indexOf('<script src="supabase_adapter.js"></script>');
    var uiIdx = indexContent.indexOf('<script src="ui.js"></script>');
    eq(adapterIdx > uiIdx, true, 'supabase_adapter.js appears after ui.js in index.html');
  });
  
  T('T-wiring-8', function() {
    // index.html references supabase-js CDN before any other <script>
    var cdnMatch = indexContent.match(/<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/[^>]*supabase[^>]*>/);
    var firstScriptIdx = indexContent.indexOf('<script src=');
    eq(cdnMatch && cdnMatch.index < firstScriptIdx, true, 'supabase-js CDN appears before other scripts');
  });
  
  T('T-wiring-9', function() {
    // .gitignore contains poke-sim/.env.local
    var gitignorePath = path.join(__dirname, '..', '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      var gitignore = fs.readFileSync(gitignorePath, 'utf8');
      eq(gitignore.includes('poke-sim/.env.local'), true, '.gitignore contains poke-sim/.env.local');
    } else {
      throw new Error('.gitignore file not found');
    }
  });
  
  T('T-wiring-10', function() {
    // Loading adapter with no creds → SupabaseAdapter.enabled === false
    installAdapter(ctx, { url: null, key: null });
    eq(ctx.window.SupabaseAdapter.enabled === false, true, 'SupabaseAdapter.enabled === false when no creds');
  });
  
  T('T-wiring-11', function() {
    // Loading with both creds → SupabaseAdapter.enabled === true
    installAdapter(ctx, { url: 'https://test.supabase.co', key: 'test-key' });
    eq(ctx.window.SupabaseAdapter.enabled === true, true, 'SupabaseAdapter.enabled === true with creds');
  });
  
  T('T-wiring-12', function() {
    // loadTeamsFromDB() with enabled=false returns null (does not throw)
    installAdapter(ctx, { url: null, key: null });
    var result = ctx.window.SupabaseAdapter.loadTeamsFromDB();
    eq(result, null, 'loadTeamsFromDB() returns null when disabled');
  });
  
  T('T-wiring-13', function() {
    // saveAnalysis({}) with enabled=false returns null (does not throw)
    installAdapter(ctx, { url: null, key: null });
    var result = ctx.window.SupabaseAdapter.saveAnalysis({});
    eq(result, null, 'saveAnalysis() returns null when disabled');
  });
  
  T('T-wiring-14', function() {
    // loadRecentAnalyses() with enabled=false returns []
    installAdapter(ctx, { url: null, key: null });
    var result = ctx.window.SupabaseAdapter.loadRecentAnalyses();
    eq(Array.isArray(result) && result.length === 0, true, 'loadRecentAnalyses() returns [] when disabled');
  });
  
  T('T-wiring-15', function() {
    // tools/build-bundle.py includes supabase_adapter.js in concat list
    var buildScriptPath = path.join(__dirname, '..', 'tools', 'build-bundle.py');
    if (fs.existsSync(buildScriptPath)) {
      var buildScript = fs.readFileSync(buildScriptPath, 'utf8');
      eq(buildScript.includes('supabase_adapter.js'), true, 'build-bundle.py includes supabase_adapter.js');
    } else {
      throw new Error('build-bundle.py not found');
    }
  });
  
  T('T-wiring-16', function() {
    // Adapter does not clobber a pre-existing window.supabase set by CDN
    // Test that CDN fake loads first, then adapter loads
    var testScript = `
      window.supabase = { createClient: function() { return { auth: { getSession: function() { return { user: null } } } } };
    `;
    eval(testScript);
    installAdapter({ window: { supabase: window.supabase } });
    eq(typeof ctx.window.supabase !== 'undefined', true, 'original window.supabase still exists after adapter load');
    eq(typeof ctx.window.SupabaseAdapter !== 'undefined', true, 'SupabaseAdapter defined after loading adapter');
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 1 Wiring Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: All tests should fail because bundle doesn't have adapter wired yet
// GREEN trigger: After M1 implementation lands, all 16 should pass
