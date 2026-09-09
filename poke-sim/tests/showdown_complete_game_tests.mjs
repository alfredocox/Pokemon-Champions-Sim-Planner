import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedGameProbes } from './fixtures/showdown_reference_probes.mjs';
import { compareProbe, loadLocalEngine, runReferenceProbe } from '../tools/showdown-reference.mjs';

const local = loadLocalEngine();

for (const fixture of completedGameProbes()) {
  test(`${fixture.id} completes in the pinned reference with forced replacements`, () => {
    const reference = runReferenceProbe(fixture);
    assert.equal(reference.status, 'probe_complete');
    assert.equal(reference.completed_games, 1);
    assert.equal(reference.winner, 'Reference player');
    assert.ok(reference.frames.length > 1);
    assert.ok(reference.raw_protocol.some(line => line.startsWith('|switch|')));
  });

  test(`${fixture.id} agrees with the local engine for declared deterministic state`, () => {
    const result = compareProbe(fixture, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert.equal(result.reference.completed_games, 1);
    assert.equal(result.local.terminal, true);
  });
}

test('a max-turn tiebreak is explicitly non-terminal', () => {
  const fixture = structuredClone(completedGameProbes()[0]);
  const battle = local.context.simulateBattle(fixture.player, fixture.opponent, {
    format: 'doubles', seed: fixture.seed, maxTurns: 1, forcedActions: []
  });
  assert.equal(battle.terminal, false);
});

test('complete-game comparison rejects a non-terminal local result', () => {
  const nonterminalLocal = {
    ...local,
    context: {
      ...local.context,
      simulateBattle(...args) {
        return { ...local.context.simulateBattle(...args), terminal: false };
      }
    }
  };
  const result = compareProbe(completedGameProbes()[0], nonterminalLocal);
  assert.equal(result.status, 'mismatch');
  assert.ok(result.differences.some(row => row.kind === 'local_terminal'));
});
