// Live Supabase catalog guard.
// Prevents stale built-in DB teams from staying active after legal catalog updates.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const liveAlignPath = path.join(ROOT, 'db', 'migrations', '2026_06_20_align_shared_27_team_catalog.sql');
const generatorPath = path.join(ROOT, 'tools', 'generate_seed_from_data.py');
const readmePath = path.join(ROOT, 'db', 'README_DB.md');
const publicGuardrailsPath = path.join(ROOT, 'docs', 'SUPABASE_PUBLIC_RELEASE_GUARDRAILS.md');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass++;
    console.log('  PASS', name);
  } catch (err) {
    fail++;
    console.log('  FAIL', name, '-', err.message);
  }
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}
function includes(haystack, needle, msg) {
  truthy(String(haystack).includes(needle), msg || ('missing: ' + needle));
}

console.log('\n=== live Supabase catalog guard tests ===\n');

T('1. live alignment migration retires stale built-in rows outside the legal catalog', () => {
  const sql = fs.readFileSync(liveAlignPath, 'utf8');
  includes(sql, 'UPDATE teams', 'live alignment must update stale team rows');
  includes(sql, "team_id NOT IN", 'live alignment must compare against the canonical catalog ID list');
  includes(sql, "source = 'builtin'", 'retirement must be scoped to built-in catalog rows');
  includes(sql, '"retired":true', 'stale rows must be marked retired');
  includes(sql, 'not_in_current_legal_repo_catalog', 'retirement reason must identify legal catalog drift');
});

T('2. generator owns the stale-row retirement clause', () => {
  const generator = fs.readFileSync(generatorPath, 'utf8');
  includes(generator, 'Retire stale built-in rows', 'generator must document stale-row retirement');
  includes(generator, 'not_in_current_legal_repo_catalog', 'generator must emit the legal-catalog retirement reason');
});

T('3. DB runbook documents legal-only active rows and retirement workflow', () => {
  const readme = fs.readFileSync(readmePath, 'utf8');
  includes(readme, 'Legal-only live catalog rule');
  includes(readme, 'active live DB rows must exactly match');
  includes(readme, 'Old, non-legal, or superseded teams must be marked retired');
  includes(readme, 'not_in_current_legal_repo_catalog');
  includes(readme, 'RUN_LIVE_DB=1 node tests/db_m2_seed_tests.js');
});

T('4. public release guardrails document source-sync and user-data separation risks', () => {
  const doc = fs.readFileSync(publicGuardrailsPath, 'utf8');
  includes(doc, 'Source-sync monitoring');
  includes(doc, 'User/team data separation');
  includes(doc, 'Shared learning rows must store enough metadata to avoid cross-regulation contamination');
  includes(doc, 'Retired or illegal teams must not contribute to public recommendation baselines');
});

console.log(`\nlive Supabase catalog guard: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
