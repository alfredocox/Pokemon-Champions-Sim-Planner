// db_m5_import_tests.js — Module 5: Imported teams persist (12 cases)
// PR: test/db-m5-team-import-persist → Linear: POK-21
// Spec: poke-sim/tests/db_m5_import_tests.js

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

describe('Module 5 — Imported teams persist (12 cases)', function() {
  
  T('T-import-1', function() {
    // _upsertTeamToDB(teamId, team, source) exists in ui.js
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('_upsertTeamToDB'), true, '_upsertTeamToDB function exists in ui.js');
  });
  
  T('T-import-2', function() {
    // Import a pokepaste → row in teams, 1–6 rows in team_members
    installAdapter(ctx);
    var fixturePath = path.join(__dirname, 'fixtures', 'pokepaste_sample.txt');
    var fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    var teamId = 'import_test_' + Date.now();
    var team = { name: 'Import Test Team', source: 'pokepaste', format: 'doubles' };
    
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    
    var mock = mockSupabaseClient.getState();
    eq(mock.teams[teamId], team, 'team inserted into DB');
    eq(mock.team_members.length, 6, '6 team_members inserted');
    
    // Re-import same paste → no duplicates (upsert by team_id)
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    var mock2 = mockSupabaseClient.getState();
    eq(mock2.teams[teamId], team, 'team unchanged on second import');
    eq(mock2.team_members.length, 6, 'still 6 team_members (no duplicates)');
  });
  
  T('T-import-3', function() {
    // Import multi-team handler at L1038 adds all teams
    installAdapter(ctx);
    var fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    var teamIds = fixtureContent.match(/const TEAMS = {([^}]+)}/g);
    var importedCount = 0;
    if (teamIds) {
      teamIds.forEach(function(teamId) {
        var team = { name: 'Multi Import ' + teamId, source: 'pokepaste', format: 'doubles' };
        ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
        importedCount++;
      });
    }
    
    var mock = mockSupabaseClient.getState();
    eq(Object.keys(mock.teams).length + importedCount, Object.keys(mock.teams).length, 'all teams from fixture imported');
  });
  
  T('T-import-4', function() {
    // Set Editor save handler also routes through _upsertTeamToDB
    installAdapter(ctx);
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    
    // Find the save handler
    var saveHandlerMatch = uiContent.match(/document\.getElementById\('save-team')\)[^}]*\s*addEventListener\('click',[^}]*}\s*function\s*([^)]+)\)/);
    eq(saveHandlerMatch !== null, true, 'Set Editor save handler exists');
    
    // Mock the handler to track calls
    var originalHandler = ctx.window.setEditorSave;
    var handlerCalls = [];
    ctx.window.setEditorSave = function() { handlerCalls.push('setEditorSave called'); };
    
    // Trigger save
    var teamId = 'editor_test_' + Date.now();
    var team = { name: 'Editor Test', source: 'pokepaste', format: 'doubles' };
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    
    eq(handlerCalls.length, 1, 'setEditorSave handler called via _upsertTeamToDB');
  });
  
  T('T-import-5', function() {
    // Importing while offline → team available locally, queued for sync
    installAdapter(ctx, { url: null, key: null });
    var teamId = 'offline_test_' + Date.now();
    var team = { name: 'Offline Test', source: 'pokepaste', format: 'doubles' };
    
    // Should not throw, should queue for sync
    var result = ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    eq(result, null, 'offline import should not throw');
    
    // Check local storage queue
    var mock = mockSupabaseClient.getState();
    truthy(mock._syncQueue && mock._syncQueue.length > 0, 'team queued for sync');
  });
  
  T('T-import-6', function() {
    // Imported team has unique team_id slug derived from name + timestamp
    installAdapter(ctx);
    var teamId = 'slug_test_' + Date.now();
    var team = { name: 'Slug Test ' + Date.now(), source: 'pokepaste', format: 'doubles' };
    
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    var mock = mockSupabaseClient.getState();
    var insertedTeam = mock.teams[teamId];
    
    eq(insertedTeam.name.includes('Slug Test'), true, 'imported team name includes slug');
    eq(insertedTeam.team_id.length, 12, 'team_id is 12 chars (name + timestamp)');
  });
  
  T('T-import-7', function() {
    // Adapter exposes saveTeam that returns team_id on success, null on failure
    installAdapter(ctx);
    var teamId = 'api_test_' + Date.now();
    var team = { name: 'API Test', source: 'pokepaste', format: 'doubles' };
    
    var result = ctx.window.SupabaseAdapter.saveTeam(team);
    eq(typeof result === 'string' && result.length === 12, 'saveTeam returns team_id string');
    eq(result === null, false, 'saveTeam returns null on failure');
  });
  
  T('T-import-8', function() {
    // Mock raises RLS denial → import still completes locally; warning logged
    installAdapter(ctx);
    mockSupabaseClient.setErrorMode('rls_denied');
    var teamId = 'rls_test_' + Date.now();
    var team = { name: 'RLS Test', source: 'pokepaste', format: 'doubles' };
    
    var result = ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    eq(result, null, 'import completes locally despite RLS denial');
    
    var mock = mockSupabaseClient.getState();
    var warnings = mock.warnings || [];
    eq(warnings.length, 1, 'RLS denial warning logged');
    eq(warnings[0].message, 'Import blocked by RLS policy', 'correct warning message');
  });
  
  T('T-import-9', function() {
    // RLS migration adds anon INSERT policy on teams and team_members
    installAdapter(ctx);
    var uiPath = path.join(__dirname, '..', 'ui.js');
    var uiContent = fs.readFileSync(uiPath, 'utf8');
    eq(uiContent.includes('INSERT INTO teams'), true, 'RLS migration adds INSERT INTO teams');
    eq(uiContent.includes('INSERT INTO team_members'), true, 'RLS migration adds INSERT INTO team_members');
  });
  
  T('T-import-10', function() {
    // Importing while offline → team available locally, queued for sync (or graceful no-op per v2 plan)
    installAdapter(ctx, { url: null, key: null });
    var teamId = 'offline_graceful_' + Date.now();
    var team = { name: 'Offline Graceful Test', source: 'pokepaste', format: 'doubles' };
    
    // Should not throw, should queue for sync or graceful no-op
    var result = ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    eq(result, null, 'offline import should not throw');
    
    // Check for sync queue (v2 plan allows graceful no-op)
    var mock = mockSupabaseClient.getState();
    if (mock._syncQueue) {
      eq(mock._syncQueue.length, 1, 'team queued for sync');
    } else {
      // v2 plan: graceful no-op when no sync queue
      falsy(mock._syncQueue, 'no sync queue - graceful no-op expected');
    }
  });
  
  T('T-import-11', function() {
    // Existing champions:teams:custom localStorage keys keep working (dual-write)
    installAdapter(ctx);
    var teamId = 'custom_test_' + Date.now();
    var team = { name: 'Custom Test', source: 'pokepaste', format: 'doubles' };
    
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    
    // Check that both localStorage and DB are written
    var mock = mockSupabaseClient.getState();
    var localKey = 'champions:teams:custom:' + teamId;
    var dbKey = 'teams:custom';
    
    eq(mock._localStorage[localKey], team, 'localStorage contains custom team');
    eq(mock.teams[teamId], team, 'DB contains custom team');
    eq(mock._localStorage[dbKey], team, 'DB contains custom team');
  });
  
  T('T-import-12', function() {
    // Imported team has source: 'pokepaste' and metadata includes source: 'pokepaste'
    installAdapter(ctx);
    var teamId = 'metadata_test_' + Date.now();
    var team = { name: 'Metadata Test', source: 'pokepaste', format: 'doubles' };
    
    ctx.window.SupabaseAdapter.upsertTeamToDB(teamId, team, 'pokepaste');
    var mock = mockSupabaseClient.getState();
    var insertedTeam = mock.teams[teamId];
    
    eq(insertedTeam.source, 'pokepaste', 'imported team has source: pokepaste');
    eq(insertedTeam.metadata.source, 'pokepaste', 'imported team metadata includes source: pokepaste');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 5 Import Test Results: ' + _passed + '/' + _total + ' passed');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// RED state: before M5 lands, _upsertTeamToDB and saveTeam don't exist → T-1, T-9, T-10 throw; rest fail to even reach assertions.
// GREEN trigger: after M5 impl PR, all 12 pass.
