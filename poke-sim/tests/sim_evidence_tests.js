'use strict';

const fs = require('fs');
const path = require('path');
const SimEvidence = require('../sim_evidence.js');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_29_team_lab_sim_jobs_replays.sql'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS ' + name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}
function eq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message || 'mismatch'}: expected ${expected}, got ${actual}`);
}
function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}

console.log('\n=== sim evidence foundation tests ===\n');

T('1. migration adds sim job and replay tables without replacing analysis_logs', () => {
  truthy(migration.includes('CREATE TABLE IF NOT EXISTS team_lab_sim_jobs'), 'sim jobs table missing');
  truthy(migration.includes('CREATE TABLE IF NOT EXISTS team_lab_replays'), 'replays table missing');
  truthy(migration.includes('ALTER TABLE team_lab_sim_runs'), 'sim_runs link migration missing');
  truthy(!migration.includes('CREATE TABLE IF NOT EXISTS analysis_logs'), 'must not replace existing analysis_logs table');
});

T('2. migration keeps replay/job version indexes and write lockouts', () => {
  [
    'idx_team_lab_sim_jobs_scope_status',
    'idx_team_lab_replays_scope',
    'idx_team_lab_replays_teams',
    'idx_team_lab_replays_job',
    'idx_team_lab_sim_runs_replay'
  ].forEach((idx) => truthy(migration.includes(idx), `${idx} missing`));
  truthy(migration.includes('REVOKE INSERT, UPDATE, DELETE ON team_lab_sim_jobs FROM anon, authenticated'), 'sim job write revoke missing');
  truthy(migration.includes('REVOKE INSERT, UPDATE, DELETE ON team_lab_replays FROM anon, authenticated'), 'replay write revoke missing');
});

T('3. sim jobs require versioned scope and sample size', () => {
  const bad = SimEvidence.validateSimJob({ job_type: 'team_vs_team', team_ids: ['a'], games_per_matchup: 0 });
  eq(bad.valid, false, 'bad job should fail');
  truthy(bad.errors.some((err) => err.code === 'ENGINE_VERSION_MISSING'), 'engine version error missing');
  truthy(bad.errors.some((err) => err.code === 'GAMES_PER_MATCHUP_INVALID'), 'games error missing');
  const good = SimEvidence.validateSimJob({ job_type: 'qa_regression', regulation_id: 'reg-m-b', ruleset_version: 'rules-1', engine_version: 'eng-1', format: 'doubles', team_ids: ['a'], games_per_matchup: 25, status: 'queued' });
  eq(good.valid, true, 'valid job should pass');
});

T('4. replay records require deterministic version/seed metadata', () => {
  const bad = SimEvidence.validateReplayRecord({ team_a_id: 'a', team_b_id: 'b', result_reason: 'ko', event_log: [] });
  eq(bad.valid, false, 'bad replay should fail');
  truthy(bad.errors.some((err) => err.code === 'SEED_MISSING'), 'seed error missing');
  const good = SimEvidence.validateReplayRecord({ team_a_id: 'a', team_b_id: 'b', regulation_id: 'reg-m-b', ruleset_version: 'rules-1', engine_version: 'eng-1', format: 'doubles', seed: 'seed-1', result_reason: 'ko', event_log: [{ turn: 1, event_type: 'move_used' }], turns: 1 });
  eq(good.valid, true, 'valid replay should pass');
});

T('5. replay evidence summary counts turn log damage and effect rows', () => {
  const summary = SimEvidence.replayEvidenceSummary({
    event_log: [{ turn: 1 }, { turn: 1 }],
    turn_log: [{ turn: 1, damage_events: [{ move: 'Protect' }], effect_events: [{ effect_kind: 'status' }] }],
    qa_coverage_summary: { totals: { turns: 1 } },
    confidence_flags: ['low_sample', 'low_sample'],
    source_gaps: ['move-source']
  });
  eq(summary.events, 2, 'event count');
  eq(summary.turns, 1, 'turn count');
  eq(summary.damage_events, 1, 'damage count');
  eq(summary.effect_events, 1, 'effect count');
  eq(summary.has_qa_coverage, true, 'qa coverage flag');
  eq(summary.confidence_flags.length, 1, 'confidence flags should dedupe');
});

T('6. attachReplayToSimRun links replay evidence without mutating original run', () => {
  const run = { id: 'run-1', confidence_flags: ['old'] };
  const replay = { id: 'replay-1', job_id: 'job-1', team_a_id: 'a', team_b_id: 'b', regulation_id: 'reg-m-b', ruleset_version: 'rules-1', engine_version: 'eng-1', format: 'doubles', seed: 'seed-1', result_reason: 'draw', event_log: [], turn_log: [{ turn: 1 }], confidence_flags: ['new'] };
  const linked = SimEvidence.attachReplayToSimRun(run, replay);
  eq(linked.ok, true, 'attach should succeed');
  eq(linked.sim_run.replay_id, 'replay-1', 'replay id missing');
  eq(linked.sim_run.job_id, 'job-1', 'job id missing');
  eq(run.replay_id, undefined, 'original run should not mutate');
  truthy(linked.sim_run.confidence_flags.includes('old'), 'old flag missing');
  truthy(linked.sim_run.confidence_flags.includes('new'), 'new flag missing');
});

console.log(`\nsim evidence foundation: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
