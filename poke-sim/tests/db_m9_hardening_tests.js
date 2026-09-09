// db_m9_hardening_tests.js — Module 9: Hardening / advisor / migration baseline suite (10 cases)
// PR: test/db-m9-hardening → Linear: POK-25
// Spec: poke-sim/tests/db_m9_hardening_tests.js

'use strict';

// Load shared helpers
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { mockSupabaseClient, installAdapter, offlineMode, assertNoServiceRole } = require('./_db_helpers.js');
const BUNDLE_SIZE_LIMIT_BYTES = 11264 * 1024;

// Test harness
var _passed = 0, _failed = 0, _total = 0, _skipped = 0;
const NOT_RUN = Symbol('not-run');
function T(name, fn) { _total++; try { if (fn() === NOT_RUN) { _skipped++; console.log('  SKIP ' + name); return; } _passed++; console.log('  ✔ ' + name); } catch (e) { _failed++; console.log('  ✖ FAIL: ' + name + ' — ' + e.message); } }
function unavailableLiveCheck(name) {
  if (process.env.RUN_LIVE_DB === '1') {
    throw new Error('Live verification not implemented: ' + name + '. Local files and mocks are not live security evidence.');
  }
  console.log('  NOT VERIFIED: ' + name + ' (requires authorized administrative readback)');
  return NOT_RUN;
}
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

describe('Module 9 — Hardening / advisor / migration baseline suite (10 cases)', function() {
  
  T('T-hard-1', function() {
    // Baseline migration file 2026_04_27_baseline_v1.sql exists in db/migrations/
    var migrationPath = path.join(__dirname, '..', 'db', 'migrations', '2026_04_27_baseline_v1.sql');
    eq(fs.existsSync(migrationPath), true, '2026_04_27_baseline_v1.sql exists');
  });
  
  T('T-hard-2', function() {
    // Baseline migration creates all 8 live tables verbatim
    var migrationPath = path.join(__dirname, '..', 'db', 'migrations', '2026_04_27_baseline_v1.sql');
    if (fs.existsSync(migrationPath)) {
      var migrationContent = fs.readFileSync(migrationPath, 'utf8');
      var expectedTables = ['rulesets', 'teams', 'team_members', 'prior_snapshots', 'golden_battles', 'analyses', 'analysis_win_conditions', 'analysis_logs'];
      expectedTables.forEach(function(table) {
        var hasTable = migrationContent.includes('CREATE TABLE ' + table + ' (') ||
                       migrationContent.includes('CREATE TABLE IF NOT EXISTS ' + table + ' (');
        eq(hasTable, true, 'migration creates ' + table + ' table');
      });
    }
  });
  
  T('T-hard-3', function() {
    return unavailableLiveCheck('applied migration ledger');
  });
  
  T('T-hard-4', function() {
    // RLS audit script asserts policy matrix in plan v2 §M9
    var rlsPath = path.join(__dirname, '..', 'db', 'rls_policies_v1.sql');
    if (fs.existsSync(rlsPath)) {
      var rlsContent = fs.readFileSync(rlsPath, 'utf8');
      var executablePolicies = rlsContent.replace(/--[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Browser roles may read shared evidence, but trusted workflows own writes.
      var requiredPolicies = [
        'CREATE POLICY "anon_read_rulesets"',
        'CREATE POLICY "anon_read_teams"',
        'CREATE POLICY "anon_read_analyses"',
        'FROM anon, authenticated'
      ];
      
      requiredPolicies.forEach(function(policy) {
        eq(rlsContent.includes(policy), true, 'RLS policy found: ' + policy);
      });
      eq(rlsContent.includes('anon_insert_analyses'), false, 'anonymous analysis writes are removed');
      eq(rlsContent.includes('anon_update_branch_coverage_runs'), false, 'anonymous QA evidence updates are removed');
      // Conservative lexical guard for this simple bootstrap, not a live SQL evaluator.
      falsy(/CREATE\s+POLICY[^;]*\bFOR\s+(?:INSERT|UPDATE|DELETE|ALL)\b/i.test(executablePolicies), 'shared bootstrap contains a write policy');
      executablePolicies.split(';').forEach(function(statement) {
        if (/\bCREATE\s+POLICY\b/i.test(statement)) {
          truthy(/\bFOR\s+SELECT\b/i.test(statement), 'shared bootstrap policies must explicitly use FOR SELECT');
        }
        if (/\bGRANT\b/i.test(statement)) {
          truthy(/^\s*GRANT\s+SELECT\s+ON\s/i.test(statement), 'shared bootstrap contains a non-read grant');
        }
      });
    } else {
      throw new Error('rls_policies_v1.sql not found');
    }
  });
  
  T('T-hard-5', function() {
    // No service_role reachable from bundle
    var bundlePath = path.join(__dirname, '..', 'pokemon-champion-2026.html');
    assertNoServiceRole(bundlePath);
  });
  
  T('T-hard-6', function() {
    return unavailableLiveCheck('Supabase security advisor');
  });
  
  T('T-hard-7', function() {
    return unavailableLiveCheck('Supabase performance advisor');
  });
  
  T('T-hard-8', function() {
    // db/README_DB.md documents apply_migration-only workflow
    var readmePath = path.join(__dirname, '..', 'db', 'README_DB.md');
    if (fs.existsSync(readmePath)) {
      var readme = fs.readFileSync(readmePath, 'utf8');
      eq(readme.includes('apply_migration'), true, 'README_DB.md documents apply_migration workflow');
    }
  });
  
  T('T-hard-9', function() {
    // package.json/runner: npm test runs full DB suite + existing 14 engine suites
    var packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      var packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      var hasTest = packageJson.scripts && packageJson.scripts.test;
      truthy(hasTest, 'package.json has test script');
    }
  });
  
  T('T-hard-10', function() {
    // Bundle size stays within the current static Pages budget.
    var bundlePath = path.join(__dirname, '..', 'pokemon-champion-2026.html');
    var stats = fs.statSync(bundlePath);
    // Current bundle intentionally inlines Supabase-js, Battle Sensei, and generated Showdown data.
    eq(stats.size < BUNDLE_SIZE_LIMIT_BYTES, true, 'bundle size < 11.00 MiB after all modules (got ' + stats.size + ')');
  });

  T('T-hard-11', function() {
    var schemaPath = path.join(__dirname, '..', 'db', 'schema_v1.sql');
    var migrationPath = path.join(__dirname, '..', 'db', 'migrations', '2026_06_24_branch_coverage_runs.sql');
    var adapterPath = path.join(__dirname, '..', 'supabase_adapter.js');
    var schema = fs.readFileSync(schemaPath, 'utf8');
    var migration = fs.readFileSync(migrationPath, 'utf8');
    var adapter = fs.readFileSync(adapterPath, 'utf8');
    truthy(/branch_coverage_runs[\s\S]*tactical_summary\s+JSONB/.test(schema), 'schema_v1 branch coverage tactical_summary missing');
    truthy(/ADD COLUMN IF NOT EXISTS tactical_summary/.test(migration), 'branch coverage migration tactical_summary missing');
    truthy(/tactical_summary/.test(adapter), 'adapter does not load/save tactical_summary');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Module 9 Hardening Test Results: ' + _passed + ' passed, ' + _failed + ' failed, ' + _skipped + ' not verified; ' + _total + ' total');
  if (_failed > 0) {
    console.log('❌ ' + _failed + ' tests failed');
    process.exit(1);
  }
});

// Offline success covers local contracts only; the three administrative gates remain unverified.
