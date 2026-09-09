import assert from 'node:assert/strict';
import { test } from 'node:test';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';
import { compareProbe, loadLocalEngine } from '../tools/showdown-reference.mjs';

const local = loadLocalEngine();

function tailwindProbe(reversed) {
  const fixture = referenceProbes().find(probe => probe.id === 'tailwind-midturn-speed');
  fixture.id = `tailwind-midturn-speed-${reversed ? 'opponent' : 'player'}`;
  if (reversed) {
    [fixture.player, fixture.opponent] = [fixture.opponent, fixture.player];
    [fixture.turns[0].player, fixture.turns[0].opponent] = [fixture.turns[0].opponent, fixture.turns[0].player];
  }
  return fixture;
}

for (const reversed of [false, true]) {
  test(`Tailwind reorders remaining equal-priority actions with setter on ${reversed ? 'opponent' : 'player'}`, () => {
    const result = compareProbe(tailwindProbe(reversed), local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));

    const lines = result.local.log;
    const tailwind = lines.findIndex(row => row.includes('Whimsicott used Tailwind'));
    const blastoise = lines.findIndex(row => row.includes('Blastoise used Water Pulse'));
    const arcanine = lines.findIndex(row => row.includes('Arcanine used Flamethrower'));
    assert.ok(tailwind >= 0 && blastoise > tailwind && arcanine > blastoise, JSON.stringify(lines));
  });
}

test('Tailwind does not move a normal-priority action ahead of an unexecuted higher-priority action', () => {
  const fixture = tailwindProbe(false);
  fixture.id = 'tailwind-priority-bracket-boundary';
  fixture.opponent.members[0].moves = ['Extreme Speed'];
  fixture.turns[0].opponent[0] = {move: 'Extreme Speed', targetSlot: 0, targetSide: 'foe'};
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  const lines = result.local.log;
  assert.ok(lines.findIndex(line => line.includes('Extreme Speed')) < lines.findIndex(line => line.includes('Water Pulse')));
});

test('Tailwind re-evaluates remaining speed in the inverted Trick Room order', () => {
  const fixture = tailwindProbe(false);
  fixture.id = 'tailwind-midturn-under-trick-room';
  fixture.turns.unshift({
    player: [{move: 'Trick Room'}, {move: 'Protect'}],
    opponent: [{move: 'Protect'}, {move: 'Protect'}]
  });
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  const lines = result.local.log;
  const tailwind = lines.findIndex(row => row.includes('Whimsicott used Tailwind'));
  const arcanine = lines.findIndex(row => row.includes('Arcanine used Flamethrower'));
  const blastoise = lines.findIndex(row => row.includes('Blastoise used Water Pulse'));
  assert.ok(tailwind >= 0 && arcanine > tailwind && blastoise > arcanine, JSON.stringify(lines));
});

test('pending priority is recalculated when Gale Wings loses full-HP eligibility', () => {
  const fixture = referenceProbes().find(probe => probe.id === 'earthquake-flying-ally');
  fixture.id = 'gale-wings-priority-recompute';
  fixture.player.members[0].moves = ['Tackle'];
  fixture.player.members[1].ability = 'Gale Wings';
  fixture.player.members[1].moves = ['Air Slash'];
  fixture.opponent.members[0].moves = ['Extreme Speed'];
  fixture.opponent.members[1].moves = ['Tackle'];
  fixture.turns[0] = {
    player: [
      {move: 'Tackle', targetSlot: 0, targetSide: 'foe'},
      {move: 'Air Slash', targetSlot: 1, targetSide: 'foe'}
    ],
    opponent: [
      {move: 'Extreme Speed', targetSlot: 1, targetSide: 'foe'},
      {move: 'Tackle', targetSlot: 0, targetSide: 'foe'}
    ]
  };
  delete fixture.hpChange;
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});
