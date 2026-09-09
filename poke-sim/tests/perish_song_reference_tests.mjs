import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadLocalEngine, compareProbe } from '../tools/showdown-reference.mjs';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';

const local = loadLocalEngine();
const splash = () => ({ move: 'Splash' });
function fixture(swapped, ability = 'Prankster', targetAbility = 'Flash Fire', item = '') {
  const f = referenceProbes()[0];
  f.id = `perish-${swapped}-${ability}-${targetAbility}-${item}`;
  for (const side of ['player', 'opponent']) for (const mon of f[side].members) mon.moves = ['Splash'];
  f.player.members[0].moves.push('Perish Song');
  f.player.members[0].ability = ability;
  f.opponent.members[0].ability = targetAbility;
  f.opponent.members[0].item = item;
  f.comparePP = true;
  f.compareExactHP = true;
  f.turns = Array.from({ length: 4 }, (_, turn) => ({
    player: [{ move: turn === 0 ? 'Perish Song' : 'Splash' }, splash()],
    opponent: [splash(), splash()]
  }));
  if (swapped) {
    [f.player, f.opponent] = [f.opponent, f.player];
    for (const turn of f.turns) [turn.player, turn.opponent] = [turn.opponent, turn.player];
  }
  return f;
}

for (const swapped of [false, true]) {
  for (const trickRoom of [false, true]) test(`Two-wave Perish Song resolves terminal faint order, Trick Room=${trickRoom}, swapped=${swapped}`, () => {
    const f = fixture(false);
    let speed = 1;
    for (const side of ['player', 'opponent']) for (const mon of f[side].members) {
      mon.moves = ['Splash', 'Perish Song', 'Trick Room'];
      mon.evs.spe = speed++;
    }
    f.completeGame = true;
    f.turns = Array.from({ length: 8 }, (_, turn) => ({
      player: [{ move: turn === 0 || turn === 4 ? 'Perish Song' : 'Splash' }, splash()],
      opponent: [splash(), splash()]
    }));
    if (trickRoom) f.turns[5].player[1] = { move: 'Trick Room' };
    if (swapped) {
      [f.player, f.opponent] = [f.opponent, f.player];
      for (const turn of f.turns) [turn.player, turn.opponent] = [turn.opponent, turn.player];
    }
    const result = compareProbe(f, local);
    assert.equal(result.reference.completed_games, 1);
    assert.equal(result.local.terminal, true);
    assert.equal(result.reference.winner, swapped !== trickRoom ? 'Reference opponent' : 'Reference player');
    assert.equal(result.local.result, swapped !== trickRoom ? 'loss' : 'win');
    const refOrder = result.reference.raw_protocol.filter(line => line.startsWith('|faint|')).map(line => {
      const [, side, slot] = line.match(/p([12])m(\d+)/);
      return f[side === '1' ? 'player' : 'opponent'].members[Number(slot) - 1].name;
    });
    const localOrder = result.local.log.filter(line => line.includes(' perished due to Perish Song!')).map(line => line.split(' perished')[0]);
    assert.deepEqual(localOrder, refOrder);
    // Different valid replacement policies can change actor/PP traces, not this result.
  });
  for (const guard of ['none', 'source', 'target']) test(`Perish Song concealed Phantom Force recipient, No Guard=${guard}, swapped=${swapped}`, () => {
    const f = fixture(false, guard === 'source' ? 'No Guard' : 'Pressure');
    if (guard === 'target') f.opponent.members[0].ability = 'No Guard';
    f.player.members[0].evs.spe = 1;
    f.opponent.members[0].evs.spe = 32;
    f.opponent.members[0].moves.push('Phantom Force');
    f.turns = [f.turns[0]];
    f.turns[0].opponent[0] = { move: 'Phantom Force', targetSide: 'foe', targetSlot: 0 };
    if (swapped) {
      [f.player, f.opponent] = [f.opponent, f.player];
      [f.turns[0].player, f.turns[0].opponent] = [f.turns[0].opponent, f.turns[0].player];
    }
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert.equal(result.reference.frames[0].post[swapped ? 'p1' : 'p2'][0].perish_song_turns, guard === 'none' ? 0 : 3);
    assert.equal(result.local.turnLog[0].post.roster[swapped ? 'player' : 'opponent'][0].perish_song_turns, guard === 'none' ? 0 : 3);
  });
  test(`Reusing Perish Song does not reset existing countdowns, swapped=${swapped}`, () => {
    const f = fixture(swapped);
    f.turns[1][swapped ? 'opponent' : 'player'][0] = { move: 'Perish Song' };
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    for (const side of ['player', 'opponent']) {
      assert.equal(result.local.turnLog[1].post.roster[side][0].perish_song_turns, 2);
      assert.equal(result.local.turnLog[3].post.roster[side][0].hp_current, 0);
    }
  });
  for (const [ability, targetAbility, item] of [
    ['Prankster', 'Flash Fire', ''],
    ['Prankster', 'Soundproof', ''],
    ['Mold Breaker', 'Soundproof', ''],
    ['Mold Breaker', 'Soundproof', 'Ability Shield'],
    ['Soundproof', 'Flash Fire', '']
  ]) test(`Perish Song countdown and per-recipient immunity: ${ability}/${targetAbility}/${item}, swapped=${swapped}`, () => {
    const f = fixture(swapped, ability, targetAbility, item);
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    for (let turn = 0; turn < 3; turn++) for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      for (const mon of result.local.turnLog[turn].post.roster[side]) {
        const ref = result.reference.frames[turn].post[refSide].find(row => row.key === refSide + 'm' + (mon.teamSlot + 1));
        assert.equal(mon.perish_song_turns, ref.perish_song_turns, `${turn + 1}:${side}:${mon.teamSlot}`);
      }
    }
    for (const side of ['player', 'opponent']) for (const mon of result.local.turnLog[2].post.roster[side]) {
      assert(mon.hp_current > 0, 'Perish Song must not KO on its third end-of-turn');
    }
    for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) for (const mon of result.local.turnLog[3].post.roster[side]) {
      const ref = result.reference.frames[3].post[refSide].find(row => row.key === refSide + 'm' + (mon.teamSlot + 1));
      assert.equal(mon.hp_current, ref.hp, 'fourth end-of-turn faints preserve immune recipients');
    }
    for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      const localSlots = result.local.turnLog[3].post.roster[side].filter(mon => mon.status === 'active').map(mon => mon.teamSlot).sort();
      const refSlots = result.reference.frames[3].post[refSide].filter(mon => mon.active && !mon.fainted).map(mon => Number(mon.key.slice(3)) - 1).sort();
      // Reference chooses the first bench member; local policy ranks candidates.
      // Compare lifecycle constraints, not different valid tactical decisions.
      assert.equal(localSlots.length, refSlots.length, 'replacement count must agree');
      assert.equal(new Set(localSlots).size, localSlots.length, 'replacement identities must stay unique');
      for (const slot of localSlots) {
        const mon = result.local.turnLog[3].post.roster[side].find(row => row.teamSlot === slot);
        assert(mon.hp_current > 0, 'only living registered members may enter');
        assert.equal(mon.perish_song_turns, 0, 'replacement or immune survivor has no countdown');
      }
    }
  });
}
