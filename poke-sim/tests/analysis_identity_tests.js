'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ctx = vm.createContext({ console, crypto: webcrypto, TextEncoder });
ctx.window = ctx;
ctx.ChampionsSim = { internal: {} };
const root = path.join(__dirname, '..');
vm.runInContext(fs.readFileSync(path.join(root, 'rulesets.js'), 'utf8'), ctx);
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
vm.runInContext(ui.slice(ui.indexOf('// __M4_BUILD_PAYLOAD_BEGIN__'), ui.indexOf('// __M4_BUILD_PAYLOAD_END__')), ctx);
const id = 'champions_reg_m_doubles_bo3';
function envelope(format = 'doubles') {
  return { schema_version: 'champions-simulation-provenance-v1', engine_version: '1.1.1', build_id: 'test-build',
    ruleset_id: id, opponent_ruleset_id: id, format, bo: 3, policy_model: 'deterministic-v1',
    ruleset_version: 'champions-reg-ma-2026-v1', regulation_id: 'champions_reg_m_a_2026',
    player_team_id: 'player', opp_team_id: 'opp', player_team_digest: 'a'.repeat(64), opp_team_digest: 'b'.repeat(64),
    selection_policy: { player: 'manual', opponent: 'random', adaptive: true } };
}
let failed = 0;
async function test(name, fn) { try { await fn(); console.log('PASS ' + name); } catch(e) { failed++; console.error('FAIL ' + name + ': ' + e.message); } }
(async () => {
  await test('missing provenance stays unknown, not current selected team/version', () => {
    ctx.TEAMS = { player: { metadata: { ruleset_id: id } } };
    const p = ctx._buildAnalysisPayload('player', 'opp', 3, {});
    assert.equal(p.engine_version, 'unknown');
    assert.equal(p.ruleset_id, 'unknown');
    assert.equal(p.learning_eligibility, 'blocked_missing_provenance');
  });
  await test('execution-time identity survives payload JSON roundtrip and later edits', () => {
    const original = envelope();
    const res = { provenance: original, wins: 1, allLogs: [{ result: 'win', format: 'doubles', provenance: original,
      bring: { player: ['A'], opponent: ['B'] }, participants: { player: [{ stable_key: 'p:0' }] } }] };
    ctx.TEAMS.player.metadata.ruleset_id = 'champions_reg_m_b_2026';
    ctx.ENGINE_VERSION = 'future-version';
    const p = JSON.parse(JSON.stringify(ctx._buildAnalysisPayload('player', 'opp', 3, res)));
    assert.equal(p.engine_version, '1.1.1');
    assert.equal(p.ruleset_id, id);
    assert.equal(p.format, 'doubles');
    assert.deepEqual(p.analysis_json.provenance, original);
    assert.equal(p.logs[0].format, 'doubles');
    assert.equal(p.logs[0].participants.player[0].stable_key, 'p:0');
    assert.equal(p.analysis_json.evidence_policy.learning_eligibility, 'blocked_unapproved_regulation_data');
  });
  await test('singles evidence is retained but not eligible for competitive doubles learning', () => {
    const p = ctx._buildAnalysisPayload('player', 'opp', 3, { provenance: envelope('singles') });
    assert.equal(p.format, 'singles');
    assert.notEqual(p.learning_eligibility, 'trusted_historical');
  });
  await test('unknown rules or conflicting identity fail closed', () => {
    for (const override of [{ ruleset_id: 'typo' }, { opponent_ruleset_id: 'typo' }, { player_team_id: 'other' }, { bo: 1 }, { build_id: '' },
      { ruleset_version: 'unreviewed' }, { regulation_id: 'different' }, { stale: true }, { source_gaps: ['unverified'] }]) {
      const p = ctx._buildAnalysisPayload('player', 'opp', 3, { provenance: Object.assign(envelope(), override) });
      assert.notEqual(p.poisoning_guard, 'trusted_stats_allowed');
    }
  });
  await test('parent format, policy and game contradictions also block coaching', () => {
    for (const res of [{ format: 'singles' }, { policy_model: 'different' }, { allLogs: [{ format: 'singles', provenance: envelope() }] },
      { allLogs: [{ format: 'doubles', provenance: Object.assign(envelope(), { stale: true }) }] },
      { allLogs: [{ format: 'doubles', provenance: Object.assign(envelope(), { source_gaps: ['unverified'] }) }] }]) {
      const p = ctx._buildAnalysisPayload('player', 'opp', 3, Object.assign({ provenance: envelope() }, res));
      assert.notEqual(p.poisoning_guard, 'trusted_stats_allowed');
      assert.equal(p.coaching_policy, 'review_only_no_matchup_learning');
    }
  });
  await test('capture fingerprints stat changes and does not retain private raw teams', async () => {
    const team = { metadata: { ruleset_id: id }, members: [{ name: 'Pikachu', evs: { spe: 10 }, moves: ['Protect'] }] };
    const a = await ctx._captureSimulationProvenance('player', 'opp', team, team, 'doubles', 3, { player: 'manual', opponent: 'random' });
    team.members[0].evs.spe = 20;
    const b = await ctx._captureSimulationProvenance('player', 'opp', team, team, 'doubles', 3, { player: 'manual', opponent: 'random' });
    assert.notEqual(a.player_team_digest, b.player_team_digest);
    assert.match(a.player_team_digest, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(a).includes('Pikachu'), false);
  });
  await test('selected regulation labels execution without rewriting team registration', async () => {
    const team = { ruleset_id: 'champions_reg_m_b_2026', members: [{ name: 'Pikachu' }] };
    const before = JSON.stringify(team);
    const a = await ctx._captureSimulationProvenance('player', 'opp', team, team, 'doubles', 3, {}, 'champions_reg_m_a_2026');
    assert.equal(a.ruleset_id, 'champions_reg_m_a_2026');
    assert.equal(a.opponent_ruleset_id, a.ruleset_id);
    assert.equal(a.original_player_ruleset_id, 'champions_reg_m_b_2026');
    assert.equal(a.ruleset_version, 'champions-reg-ma-2026-v1');
    assert.equal(JSON.stringify(team), before);
    team.ruleset_id = 'future-regulation';
    assert.equal(a.original_player_ruleset_id, 'champions_reg_m_b_2026');
  });
  process.exitCode = failed ? 1 : 0;
})();
