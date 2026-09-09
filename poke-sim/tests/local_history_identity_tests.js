'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let stored = null;
const ctx = vm.createContext({ console, UILog: console, ENGINE_VERSION: '1.1.1',
  auditCoachingDelta: () => ({}),
  CHAMPIONS_RELEASE_MANIFEST: { build_id: 'fixture-build' },
  Storage: { get: () => stored && JSON.parse(JSON.stringify(stored)), set: (_, value) => { stored = JSON.parse(JSON.stringify(value)); } },
  TEAMS: { player: { members: [] }, opp: { members: [] } },
  _csRunTeamIdentities: { player: { input: '{"members":[]}', digest: 'a'.repeat(64) }, opp: { input: '{"members":[]}', digest: 'b'.repeat(64) } }
});
vm.runInContext(fs.readFileSync(path.join(root, 'rulesets.js'), 'utf8'), ctx);
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
vm.runInContext(ui.slice(ui.indexOf('var CS_SIMLOG_KEY'), ui.indexOf('// Render the adaptive-state banner')), ctx);
const provenance = { schema_version: 'champions-simulation-provenance-v1', engine_version: '1.1.1', build_id: 'fixture-build',
  ruleset_id: 'champions_reg_m_doubles_bo3', opponent_ruleset_id: 'champions_reg_m_doubles_bo3',
  ruleset_version: 'champions-reg-ma-2026-v1', regulation_id: 'champions_reg_m_a_2026',
  format: 'doubles', bo: 1, policy_model: 'deterministic-v1', player_team_id: 'player', opp_team_id: 'opp',
  player_team_digest: 'a'.repeat(64), opp_team_digest: 'b'.repeat(64), selection_policy: { player: 'manual', opponent: 'random' } };
let failed = 0;
function test(name, fn) { stored = null; ctx.CHAMPIONS_RULESETS.champions_reg_m_a_2026.regulationDataApproved = false; ctx.csInvalidateTeamHistory(); try { fn(); console.log('PASS ' + name); } catch(e) { failed++; console.error('FAIL ' + name + ': ' + e.message); } }
function append(p = provenance, format = 'doubles') {
  ctx.csSimLogAppendSeries({ playerKey: 'player', oppKey: 'opp', bo: 1, format, seriesResult: 'win',
    battleResults: [{ result: 'win', turns: 2, provenance: p, format, participants: { player: [{ member_id: 'one' }] } }] });
}
test('unknown legacy history is retained for inspection but never counted as trusted', () => {
  append(null);
  assert.equal(ctx.csSimLogGetAll({ includeQuarantined: true }).length, 1);
  assert.equal(ctx.csSimLogGetAll().length, 0);
  assert.equal(ctx.computeTeamHistory('player').total_battles, 0);
});
test('singles and mismatched games do not enter doubles history', () => {
  append(Object.assign({}, provenance, { format: 'singles' }), 'singles');
  append(provenance, 'singles');
  assert.equal(ctx.computeTeamHistory('player').total_battles, 0);
});
test('complete identity roundtrips locally and original participant IDs survive', () => {
  append();
  assert.equal(ctx.computeTeamHistory('player').total_battles, 0, 'unapproved historical data remains quarantined');
  const rows = ctx.csSimLogGetAll({ includeQuarantined: true });
  assert.equal(rows[0].games[0].participants.player[0].member_id, 'one');
  assert.deepEqual(JSON.parse(JSON.stringify(rows[0].provenance)), provenance);
});
test('mirrored history preserves original provenance without treating player-only telemetry as opponent evidence', () => {
  // Isolated hypothetical approved-package fixture, not the shipped registry.
  ctx.CHAMPIONS_RULESETS.champions_reg_m_a_2026.regulationDataApproved = true;
  append();
  const mirrored = ctx.csSimLogForTeamBothSides('opp')[0];
  assert.equal(mirrored.provenance.player_team_id, 'player');
  assert.equal(ctx.computeTeamHistory('opp').total_battles, 0);
});
test('stale build or edited team cannot reuse a trusted history cache', () => {
  ctx.CHAMPIONS_RULESETS.champions_reg_m_a_2026.regulationDataApproved = true;
  append(); assert.equal(ctx.computeTeamHistory('player').total_battles, 1);
  ctx.TEAMS.player.members.push({ name: 'Pikachu' });
  assert.equal(ctx.computeTeamHistory('player').total_battles, 0);
  ctx.TEAMS.player.members = [];
  append(Object.assign({}, provenance, { build_id: 'old-build' }));
  assert.equal(ctx.csSimLogGetAll().length, 1);
});
process.exitCode = failed ? 1 : 0;
