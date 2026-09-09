import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRequestedReplay, assertReplayContinuity } from '../tools/browser-replay-contract.mjs';

const selection = { 'player-select': 'a', 'opponent-select': 'b', 'sim-regulation': 'practice' };
const original = {
  player_team_id: 'a', opponent_team_id: 'b', format: 'doubles',
  provenance: { player_team_id: 'a', opp_team_id: 'b', ruleset_id: 'practice', opponent_ruleset_id: 'practice', format: 'doubles', bo: 1 },
  participants: { player: [{ name: 'Pikachu' }] }, opponent_team: 'Original opponent',
  seed: [1, 2, 3, 4], turnLog: [], exported_at: 'before'
};

test('requested identity requires both envelope and execution provenance', () => {
  assertRequestedReplay(original, selection);
  for (const key of ['player_team_id', 'opp_team_id', 'ruleset_id', 'opponent_ruleset_id', 'format', 'bo']) {
    const changed = structuredClone(original);
    changed.provenance[key] = 'wrong';
    assert.throws(() => assertRequestedReplay(changed, selection), key);
  }
  assert.throws(() => assertRequestedReplay({ ...original, player_team_id: 'b' }, selection));
  assert.throws(() => assertRequestedReplay({ ...original, opponent_team_id: 'a' }, selection));
});

test('continuity permits export time but rejects changed participants and labels', () => {
  assertReplayContinuity(original, { ...original, exported_at: 'after' });
  assertReplayContinuity({ ...original, qa_coverage_summary: { generated_at: 'before', count: 1 } }, { ...original, qa_coverage_summary: { generated_at: 'after', count: 1 } });
  assert.throws(() => assertReplayContinuity({ ...original, qa_coverage_summary: { count: 1 } }, { ...original, qa_coverage_summary: { count: 2 } }));
  assert.throws(() => assertReplayContinuity(original, { ...original, participants: {} }));
  assert.throws(() => assertReplayContinuity(original, { ...original, opponent_team: 'Wrong opponent' }));
  assert.throws(() => assertReplayContinuity(original, { ...original, seed: [5, 6, 7, 8] }));
});
