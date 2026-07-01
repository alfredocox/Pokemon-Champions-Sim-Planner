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

T('7. turn-log artifact intake creates replay evidence with explicit source gaps', () => {
  const intake = SimEvidence.createSimEvidenceFromArtifact({
    schema_version: 'champions-turn-log-v2',
    build_id: 'v2.2.49-qa-artifact-evidence-intake',
    seed: 'seed-123',
    result: 'win',
    format: 'doubles',
    player_team_id: 'player',
    opponent_team_id: 'mega_altaria',
    qa_coverage_summary: { schema_version: 'champions-qa-coverage-v1', totals: { turns: 1 } },
    turnLog: [{ turn: 1, damage_events: [{ damage: 44 }], effect_events: [{ effect_kind: 'flinch' }] }],
    log: ['Turn 1: Player used Fake Out.']
  }, {
    regulation_id: 'reg-m-b',
    ruleset_version: 'ruleset-reg-m-b-verified-test'
  });
  eq(intake.ok, true, 'intake should succeed');
  eq(intake.artifact_type, 'turn_log', 'artifact type');
  eq(intake.replay_records.length, 1, 'one replay expected');
  const replay = intake.replay_records[0];
  eq(replay.engine_version, 'v2.2.49-qa-artifact-evidence-intake', 'engine version should come from build id');
  eq(replay.regulation_id, 'reg-m-b', 'regulation should come from caller');
  eq(replay.ruleset_version, 'ruleset-reg-m-b-verified-test', 'ruleset should come from caller');
  eq(replay.damage_events.length, 1, 'damage events should be lifted from turn log');
  eq(replay.effect_events.length, 1, 'effect events should be lifted from turn log');
  truthy(replay.source_gaps.includes('TEAM_ID_MAPPING_NEEDED'), 'team ID mapping gap should be explicit');
  truthy(String(replay.team_a_id).startsWith('artifact:player:'), 'unmapped player id should stay artifact-scoped');
});

T('8. QA artifact intake creates a completed QA job and retained replay records without inventing ruleset truth', () => {
  const intake = SimEvidence.createSimEvidenceFromArtifact({
    schema_version: 'champions-qa-artifact-v1',
    artifact_type: 'large-run-qa-retained-evidence',
    qa_run_type: 'tactical_sweep',
    build_id: 'v2.2.49-qa-artifact-evidence-intake',
    player_team_id: 'player',
    current_format: 'doubles',
    summary: { retained_replay_cards: 2 },
    qa_coverage_summary: { schema_version: 'champions-qa-coverage-v1', totals: { turns: 2, damage_events: 1 } },
    tactical_sweep: { schema_version: 'champions-tactical-sweep-v1', enabled: true },
    retained: {
      sim_log: [{ playerKey: 'player', oppKey: 'team-b' }],
      replay_cards: [
        { seed: 'qa-1', playerKey: 'player', oppKey: 'team-b', result: 'win', format: 'doubles', turnLog: [{ turn: 1 }], log: ['A'] },
        { seed: 'qa-2', playerKey: 'player', oppKey: 'team-c', result: 'loss', format: 'doubles', turnLog: [{ turn: 1 }], log: ['B'] }
      ]
    }
  }, {
    regulation_id: 'reg-m-b',
    teamIdMap: {
      player: 'team-player-uuid',
      'team-b': 'team-b-uuid',
      'team-c': 'team-c-uuid'
    }
  });
  eq(intake.ok, true, 'QA artifact intake should succeed');
  eq(intake.artifact_type, 'qa_artifact', 'artifact type');
  eq(intake.replay_records.length, 2, 'retained replay count');
  eq(intake.sim_job.job_type, 'qa_regression', 'job type');
  eq(intake.sim_job.status, 'completed', 'job status');
  eq(intake.sim_job.games_per_matchup, 2, 'job sample count');
  eq(intake.sim_job.engine_version, 'v2.2.49-qa-artifact-evidence-intake', 'engine version');
  eq(intake.sim_job.ruleset_version, 'unknown-ruleset-version', 'missing ruleset must not be invented');
  truthy(intake.sim_job.source_gaps.includes('RULESET_VERSION_INFERRED'), 'ruleset gap missing');
  truthy(intake.sim_job.source_gaps.includes('SWEEP_SUMMARY_NOT_REPLAY_ROWS'), 'sweep summary gap missing');
  truthy(intake.replay_records.every((row) => row.team_a_id === 'team-player-uuid'), 'mapped player team should be used');
  truthy(intake.replay_records.every((row) => !row.source_gaps.includes('TEAM_ID_MAPPING_NEEDED')), 'mapped teams should not report mapping gap');
});

T('9. Showdown HTML replay intake creates player-match evidence without becoming rule truth', () => {
  const html = [
    '<!DOCTYPE html>',
    '<title>[Gen 9 Champions] VGC 2026 Reg M-B replay: silvercaelum vs. OGhostium Z</title>',
    '|player|p1|silvercaelum|gambler|1054',
    '|player|p2|OGhostium Z|169|1043',
    '|poke|p1|Scizor, L50, F|',
    '|poke|p1|Sneasler, L50, M|',
    '|poke|p2|Oranguru, L50, M|',
    '|poke|p2|Torkoal, L50, M|',
    '|switch|p1a: Scizor|Scizor, L50, F|177/177',
    '|switch|p2a: Oranguru|Oranguru, L50, M|100/100',
    '|turn|1',
    '|move|p1b: Sneasler|Fake Out|p2b: Torkoal',
    '|faint|p2b: Torkoal',
    '|win|silvercaelum'
  ].join('\n');
  const intake = SimEvidence.createShowdownReplayEvidenceFromHtml(html, {
    source_file: 'Gen9ChampionsVGC2026RegMB-2026-06-22-silvercaelum-oghostiumz.html'
  });
  eq(intake.ok, true, 'HTML replay intake should succeed');
  eq(intake.artifact_type, 'showdown_html_replay', 'artifact type');
  const replay = intake.replay_record;
  eq(replay.regulation_id, 'champions_reg_m_b', 'regulation should be inferred from title/file');
  eq(replay.format, 'doubles', 'format should infer VGC doubles');
  eq(replay.winner_team_id, 'showdown:p1:silvercaelum', 'winner should map to p1 team id');
  eq(replay.turns, 1, 'turn count');
  eq(replay.evidence_summary.events, 12, 'protocol event count');
  truthy(replay.confidence_flags.includes('showdown_html_replay'), 'confidence flag missing');
  truthy(replay.source_gaps.includes('TEAM_ID_MAPPING_NEEDED'), 'team mapping gap missing');
  truthy(replay.source_gaps.includes('SHOWDOWN_REPLAY_NOT_OFFICIAL_RULE_TRUTH'), 'rule-truth boundary missing');
  truthy(replay.source_metadata.rosters.p1.includes('Scizor'), 'p1 roster parse missing');
  truthy(replay.source_metadata.rosters.p2.includes('Torkoal'), 'p2 roster parse missing');
});

console.log(`\nsim evidence foundation: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
