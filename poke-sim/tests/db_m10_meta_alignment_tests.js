// db_m10_meta_alignment_tests.js — Public source alignment snapshot
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
let total = 0;

function T(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log('  ✔ ' + name);
  } catch (err) {
    failed++;
    console.log('  ✖ FAIL: ' + name + ' — ' + err.message);
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy value');
}

function eq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'values differ') + ' expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

const MIGRATION = path.join(__dirname, '..', 'db', 'migrations', '2026_05_12_align_reg_ma_meta_sources.sql');
const sql = fs.readFileSync(MIGRATION, 'utf8');

function extractUsageJson() {
  const match = sql.match(/,\s*'(\{[\s\S]*?\})'::jsonb\s*\n\);/);
  if (!match) throw new Error('usage_data JSONB payload not found');
  return JSON.parse(match[1].replace(/''/g, "'"));
}

console.log('\n▶ Module 10 — Reg M-A public source alignment');

T('T-meta-1 migration adds prior_snapshots.usage_data', function () {
  truthy(/ALTER TABLE\s+prior_snapshots[\s\S]*ADD COLUMN IF NOT EXISTS usage_data JSONB/i.test(sql),
    'migration must add usage_data JSONB idempotently');
});

T('T-meta-2 snapshot id and format are stable', function () {
  truthy(sql.includes('reg_ma_meta_2026_05_12_public_sources'), 'missing snapshot id');
  truthy(sql.includes('gen9championsvgc2026regma'), 'missing Champions Reg M-A format id');
});

T('T-meta-3 source audit records Smogon stats absence separately from usage data', function () {
  const data = extractUsageJson();
  eq(data.source_audit.smogon_stats.champions_reg_ma_file_seen, false,
    'Smogon stats index should be recorded as checked but not used as usage data');
  truthy(data.source_audit.smogon_forum.formatid_seen === 'gen9championsvgc2026regma',
    'Smogon forum challenge-code format id should be captured');
});

T('T-meta-4 Pokestats all-ratings ordering is captured', function () {
  const data = extractUsageJson();
  eq(data.pokestats_all_top[0].pokemon, 'Incineroar', 'all-ratings #1');
  eq(data.pokestats_all_top[1].pokemon, 'Sneasler', 'all-ratings #2');
  eq(data.pokestats_all_top[4].pokemon, 'Kingambit', 'all-ratings #5');
});

T('T-meta-5 Pokestats Bo3 ordering is captured for tournament priors', function () {
  const data = extractUsageJson();
  eq(data.pokestats_bo3_top[0].pokemon, 'Sneasler', 'Bo3 #1');
  eq(data.pokestats_bo3_top[1].pokemon, 'Incineroar', 'Bo3 #2');
  truthy(data.alignment_notes.some(note => note.indexOf('Bo3') !== -1), 'Bo3 alignment note missing');
});

T('T-meta-6 ShowdownTier is labeled as performance cross-check', function () {
  const data = extractUsageJson();
  eq(data.showdowntier_live_top[0].pokemon, 'Basculegion', 'ShowdownTier top performance row');
  truthy(data.alignment_notes.some(note => note.indexOf('performance cross-check') !== -1),
    'performance cross-check note missing');
});

T('T-meta-7 live DB can read aligned prior snapshot when RUN_LIVE_DB=1', function () {
  if (process.env.RUN_LIVE_DB !== '1') {
    console.log('    ⚠ LIVE DB test skipped (RUN_LIVE_DB not set)');
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  truthy(url && key, 'SUPABASE_URL and anon key are required');
  const { execFileSync } = require('child_process');
  let body;
  try {
    body = execFileSync('curl', [
      '-fsS',
      url + '/rest/v1/prior_snapshots?prior_id=eq.reg_ma_meta_2026_05_12_public_sources&select=prior_id,usage_data',
      '-H', 'apikey: ' + key,
      '-H', 'Authorization: Bearer ' + key
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const stderr = String(err.stderr || '');
    if (stderr.indexOf('400') !== -1) {
      console.log('    ⚠ LIVE DB snapshot check skipped (remote schema has not applied usage_data migration yet)');
      return;
    }
    throw err;
  }
  const rows = JSON.parse(body);
  if (rows.length === 0) {
    console.log('    ⚠ LIVE DB snapshot check skipped (aligned prior snapshot not seeded yet)');
    return;
  }
  eq(rows.length, 1, 'aligned prior snapshot row count');
  truthy(rows[0].usage_data && rows[0].usage_data.pokestats_bo3_top,
    'usage_data.pokestats_bo3_top missing from live snapshot');
});

console.log('\n' + '='.repeat(50));
console.log('Module 10 Meta Alignment Results: ' + passed + '/' + total + ' passed');
if (failed > 0) {
  console.log('❌ ' + failed + ' tests failed');
  process.exit(1);
}
