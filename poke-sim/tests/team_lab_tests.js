'use strict';

const fs = require('fs');
const path = require('path');
const TeamLab = require('../team_lab.js');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_29_team_lab_foundation.sql'), 'utf8');

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
function approx(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${message || 'approx mismatch'}: expected ${expected}, got ${actual}`);
}

console.log('\n=== Team Lab foundation tests ===\n');

T('1. migration creates namespaced Team Lab tables instead of colliding with runtime teams', () => {
  ['team_lab_teams', 'team_lab_team_members', 'team_lab_sim_runs', 'team_lab_leaderboard_entries', 'team_lab_matchups'].forEach((table) => {
    truthy(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `${table} table missing`);
    truthy(migration.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`), `${table} RLS missing`);
  });
  truthy(!migration.includes('CREATE TABLE IF NOT EXISTS teams ('), 'migration must not replace runtime teams table');
});

T('2. migration includes requested indexes and hidden-detail RLS policy', () => {
  [
    'idx_team_lab_teams_regulation_format',
    'idx_team_lab_teams_owner',
    'idx_team_lab_teams_visibility',
    'idx_team_lab_leaderboard_scope_rank',
    'idx_team_lab_leaderboard_versions',
    'idx_team_lab_sim_runs_team_a',
    'idx_team_lab_sim_runs_team_b',
    'idx_team_lab_sim_runs_regulation_format',
    'idx_team_lab_matchups_pair'
  ].forEach((idx) => truthy(migration.includes(idx), `${idx} missing`));
  truthy(migration.includes("t.visibility = 'hidden_details' AND team_lab_team_members.is_hidden_publicly = false"), 'hidden-details member policy missing');
});

const baseTeam = {
  id: 'team-a',
  owner_user_id: 'user-1',
  name: 'Dev Proof Team',
  format: 'doubles',
  regulation_id: 'reg-m-b',
  visibility: 'hidden_details',
  source_type: 'dev_seed',
  archetype_tags: ['proof'],
  members: [
    { slot: 1, pokemon_id: 'charizard', form_id: 'charizard-mega-y', item_id: 'charizardite-y', ability_id: 'drought', moves: ['heat-wave', 'protect'], level: 50, evs: { spa: 252 }, ivs: { hp: 31 }, is_hidden_publicly: true }
  ]
};

T('3. validator returns needs_verification when Champion source data is missing', () => {
  const report = TeamLab.validateTeamForRegulation(baseTeam, null);
  eq(report.status, 'needs_verification', 'missing regulation should not verify');
  truthy(report.source_gaps.some((gap) => gap.code === 'REGULATION_SOURCE_MISSING'), 'missing regulation source gap absent');
});

T('4. validator returns verified only with explicit verified source allowlists', () => {
  const regulation = {
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    verification_status: 'verified',
    source_pointer: 'in_game_capture_001',
    legal_pokemon_ids: ['charizard'],
    legal_form_ids: ['charizard-mega-y'],
    legal_item_ids: ['charizardite-y'],
    legal_ability_ids: ['drought'],
    legal_move_ids: ['heat-wave', 'protect']
  };
  const report = TeamLab.validateTeamForRegulation(baseTeam, regulation);
  eq(report.status, 'verified', 'verified allowlists should pass');
  eq(report.errors.length, 0, 'verified report should have no errors');
  eq(report.source_gaps.length, 0, 'verified report should have no source gaps');
});

T('5. validator marks known illegal data illegal instead of provisional', () => {
  const regulation = {
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    verification_status: 'verified',
    source_pointer: 'in_game_capture_001',
    legal_pokemon_ids: ['charizard'],
    legal_form_ids: ['charizard-mega-y'],
    legal_item_ids: ['charizardite-y'],
    legal_ability_ids: ['drought'],
    legal_move_ids: ['protect']
  };
  const report = TeamLab.validateTeamForRegulation(baseTeam, regulation);
  eq(report.status, 'illegal', 'known illegal move should fail');
  truthy(report.errors.some((err) => err.code === 'MOVE_ILLEGAL'), 'illegal move error missing');
});

T('6. raw win rate and adjusted win rate are sample-size aware', () => {
  eq(TeamLab.rawWinRate(7, 2, 1), 0.75, 'raw win rate should count draws as half win');
  approx(TeamLab.adjustedWinRate(1, 0, 0, 0.5, 30), 0.516129, 0.000001, 'adjusted win rate should shrink low sample toward prior');
});

T('7. confidence assignment uses sample size and verification state', () => {
  eq(TeamLab.confidenceForSample(10, 'verified'), 'low', 'low sample should be low');
  eq(TeamLab.confidenceForSample(80, 'verified'), 'medium', 'medium sample should be medium');
  eq(TeamLab.confidenceForSample(250, 'verified'), 'high', 'large sample should be high');
  eq(TeamLab.confidenceForSample(250, 'needs_verification'), 'experimental', 'unverified legality should be experimental');
});

T('8. leaderboard excludes illegal teams and treats needs_verification as experimental', () => {
  const teams = [
    { id: 'a', name: 'Verified A', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'verified', archetype_tags: ['sun'] },
    { id: 'b', name: 'Illegal B', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'illegal', archetype_tags: ['bad'] },
    { id: 'c', name: 'Needs Source C', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'needs_verification', archetype_tags: ['lab'] }
  ];
  const runs = [];
  for (let i = 0; i < 40; i += 1) runs.push({ team_a_id: 'a', team_b_id: 'c', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', winner_team_id: i < 24 ? 'a' : 'c', result_reason: 'ko' });
  for (let i = 0; i < 40; i += 1) runs.push({ team_a_id: 'a', team_b_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', winner_team_id: 'b', result_reason: 'ko' });
  const entries = TeamLab.buildLeaderboardEntries(teams, runs, { regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', min_sample_size: 30 });
  truthy(entries.some((entry) => entry.team_id === 'a'), 'verified team missing');
  truthy(!entries.some((entry) => entry.team_id === 'b'), 'illegal team should be excluded');
  const c = entries.find((entry) => entry.team_id === 'c');
  truthy(c, 'needs_verification team should appear as experimental evidence');
  eq(c.confidence, 'experimental', 'needs_verification confidence should be experimental');
  eq(c.leaderboard_scope, 'experimental', 'needs_verification scope should be experimental');
});

T('9. stale marking and filters keep current rankings distinct from old evidence', () => {
  const rows = [
    { team_id: 'a', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', stale: false, confidence: 'high', legality_status: 'verified', visibility: 'public' },
    { team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-0', ruleset_version: 'rules-1', stale: false, confidence: 'medium', legality_status: 'verified', visibility: 'public' }
  ];
  const marked = TeamLab.markLeaderboardEntriesStale(rows, 'engine_updated', 'eng-0');
  eq(marked[1].stale, true, 'old engine row should be stale');
  eq(marked[1].stale_reason, 'engine_updated', 'stale reason missing');
  eq(TeamLab.filterLeaderboard(marked, { stale: false }).length, 1, 'current filter should remove stale rows');
  eq(TeamLab.isEntryCurrent(marked[0], { engine_version: 'eng-1', ruleset_version: 'rules-1' }), true, 'current row should be current');
  eq(TeamLab.isEntryCurrent(marked[1], { engine_version: 'eng-1', ruleset_version: 'rules-1' }), false, 'stale row should not be current');
});

T('10. hidden-detail teams do not leak hidden moves/items/EVs to non-owners', () => {
  const publicView = TeamLab.applyTeamVisibility(baseTeam, 'user-2');
  truthy(publicView, 'hidden-detail team summary should be visible');
  truthy(publicView.members[0].hidden_details_redacted, 'hidden member should be redacted');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'moves'), false, 'hidden moves leaked');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'item_id'), false, 'hidden item leaked');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'evs'), false, 'hidden EVs leaked');
  const ownerView = TeamLab.applyTeamVisibility(baseTeam, 'user-1');
  truthy(ownerView.members[0].moves.includes('heat-wave'), 'owner should see moves');
});

T('11. private teams are owner-only in service visibility logic', () => {
  const privateTeam = Object.assign({}, baseTeam, { visibility: 'private' });
  eq(TeamLab.applyTeamVisibility(privateTeam, 'user-2'), null, 'private team leaked to non-owner');
  truthy(TeamLab.applyTeamVisibility(privateTeam, 'user-1'), 'private team hidden from owner');
});

T('12. compare output is explicitly simulator-derived and carries stale/source warnings', () => {
  const result = TeamLab.compareTeamToLeaderboard('a', [
    { team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', stale: true, stale_reason: 'rules_updated', source_gaps: ['MOVE_SOURCE_GAP'] }
  ], [
    { team_id: 'a', opponent_team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', win_rate: 0.42, games_played: 20, confidence: 'low' }
  ], { regulation_id: 'reg-m-b', format: 'doubles', top_n: 5 });
  truthy(result.label.includes('Simulator-derived evidence'), 'compare label should prevent ladder-truth overclaim');
  truthy(result.stale_warnings.includes('rules_updated'), 'stale warning missing');
  truthy(result.unresolved_source_gaps.includes('MOVE_SOURCE_GAP'), 'source gap missing');
});

console.log(`\nTeam Lab foundation: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
