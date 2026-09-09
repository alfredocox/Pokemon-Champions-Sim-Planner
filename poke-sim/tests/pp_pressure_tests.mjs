import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completedGameProbes } from './fixtures/showdown_reference_probes.mjs';
import { compareProbe, loadLocalEngine } from '../tools/showdown-reference.mjs';

const local = loadLocalEngine();
const sp = { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 2 };
const mon = (name, ability, moves) => ({ name, ability, item: '', nature: 'Hardy', level: 50, evs: { ...sp }, moves });
const team = members => ({ name: 'PP test', format: 'champions', legality_status: 'legal', members });

function run(player, opponent, turns, forcedActions) {
  return local.context.simulateBattle(team(player), team(opponent), {
    format: 'doubles', seed: [71, 72, 73, 74], maxTurns: turns, forcedActions
  });
}

function pp(snapshot, side, slot, move) {
  const row = snapshot.roster[side].find(member => member.teamSlot === slot);
  const value = row?.move_pp?.[move];
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

test('moves initialize to Showdown-style maximum PP and consume one on selection', () => {
  const battle = run(
    [mon('Pikachu', 'Static', ['Protect']), mon('Dragonite', 'Inner Focus', ['Protect'])],
    [mon('Abra', 'Synchronize', ['Protect']), mon('Diglett', 'Sand Veil', ['Protect'])],
    1,
    [
      {turn: 1, side: 'player', slot: 0, move: 'Protect'},
      {turn: 1, side: 'player', slot: 1, move: 'Protect'},
      {turn: 1, side: 'opponent', slot: 0, move: 'Protect'},
      {turn: 1, side: 'opponent', slot: 1, move: 'Protect'}
    ]
  );
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Protect'), { current: 7, max: 8 });
});

test('one opposing Pressure target consumes one additional PP', () => {
  const battle = run(
    [mon('Pikachu', 'Static', ['Tackle']), mon('Dragonite', 'Inner Focus', ['Protect'])],
    [mon('Dusclops', 'Pressure', ['Protect']), mon('Diglett', 'Sand Veil', ['Protect'])],
    1,
    [{turn: 1, side: 'player', slot: 0, move: 'Tackle', targetSlot: 0, targetSide: 'enemy'}]
  );
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Tackle'), { current: 18, max: 20 });
});

test('spread moves pay one additional PP for each opposing Pressure target', () => {
  const battle = run(
    [mon('Garchomp', 'Sand Veil', ['Rock Slide']), mon('Dragonite', 'Inner Focus', ['Protect'])],
    [mon('Dusclops', 'Pressure', ['Protect']), mon('Dusknoir', 'Pressure', ['Protect'])],
    1,
    [{turn: 1, side: 'player', slot: 0, move: 'Rock Slide'}]
  );
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Rock Slide'), { current: 9, max: 12 });
});

test('self-targeted moves consume only one PP despite opposing Pressure', () => {
  const battle = run(
    [mon('Pikachu', 'Static', ['Protect']), mon('Dragonite', 'Inner Focus', ['Protect'])],
    [mon('Dusclops', 'Pressure', ['Protect']), mon('Dusknoir', 'Pressure', ['Protect'])],
    1,
    [{turn: 1, side: 'player', slot: 0, move: 'Protect'}]
  );
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Protect'), { current: 7, max: 8 });
});

test('a fully paralysed Pokemon does not spend PP for the denied action', () => {
  let denied = null;
  for (let seed = 1; seed <= 200 && !denied; seed++) {
    const player = [
      { ...mon('Pikachu', 'Static', ['Tackle']), status: 'paralysis' },
      mon('Dragonite', 'Inner Focus', ['Protect'])
    ];
    const battle = local.context.simulateBattle(team(player), team([
      mon('Abra', 'Synchronize', ['Protect']), mon('Diglett', 'Sand Veil', ['Protect'])
    ]), {
      format: 'doubles', seed: [seed, 2, 3, 4], maxTurns: 1,
      forcedActions: [{turn: 1, side: 'player', slot: 0, move: 'Tackle'}]
    });
    if (battle.turnLog[0].events.some(event => /fully paralysed/.test(event.text || ''))) denied = battle;
  }
  assert.ok(denied, 'deterministic seed sweep did not produce a paralysis denial');
  assert.deepEqual(pp(denied.turnLog[0].post, 'player', 0, 'Tackle'), { current: 20, max: 20 });
});

test('a flinched Pokemon does not spend PP for the denied action', () => {
  let denied = null;
  for (let seed = 1; seed <= 200 && !denied; seed++) {
    const battle = local.context.simulateBattle(team([
      mon('Slowpoke', 'Oblivious', ['Tackle']), mon('Snorlax', 'Immunity', ['Protect'])
    ]), team([
      mon('Garchomp', 'Sand Veil', ['Iron Head']), mon('Diglett', 'Sand Veil', ['Protect'])
    ]), {
      format: 'doubles', seed: [seed, 5, 6, 7], maxTurns: 1,
      forcedActions: [
        {turn: 1, side: 'player', slot: 0, move: 'Tackle'},
        {turn: 1, side: 'opponent', slot: 0, move: 'Iron Head', targetSlot: 0, targetSide: 'enemy'}
      ]
    });
    if (battle.turnLog[0].effect_events.some(event => event.effect_kind === 'flinch-skip')) denied = battle;
  }
  assert.ok(denied, 'deterministic seed sweep did not produce a flinch denial');
  assert.deepEqual(pp(denied.turnLog[0].post, 'player', 0, 'Tackle'), { current: 20, max: 20 });
});

test('Throat Chop denial happens before PP consumption', () => {
  const battle = run(
    [mon('Sylveon', 'Cute Charm', ['Hyper Voice']), mon('Snorlax', 'Immunity', ['Protect'])],
    [mon('Sneasler', 'Poison Touch', ['Throat Chop']), mon('Diglett', 'Sand Veil', ['Protect'])],
    1,
    [
      {turn: 1, side: 'player', slot: 0, move: 'Hyper Voice'},
      {turn: 1, side: 'opponent', slot: 0, move: 'Throat Chop', targetSlot: 0, targetSide: 'enemy'}
    ]
  );
  assert.ok(battle.turnLog[0].events.some(event => /failed because of Throat Chop/.test(event.text || '')));
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Hyper Voice'), { current: 12, max: 12 });
});

test('mid-turn Taunt denial happens before PP consumption', () => {
  const battle = run(
    [mon('Hatterene', 'Healer', ['Trick Room']), mon('Snorlax', 'Immunity', ['Protect'])],
    [mon('Whimsicott', 'Prankster', ['Taunt']), mon('Diglett', 'Sand Veil', ['Protect'])],
    1,
    [
      {turn: 1, side: 'player', slot: 0, move: 'Trick Room'},
      {turn: 1, side: 'opponent', slot: 0, move: 'Taunt', targetSlot: 0, targetSide: 'enemy'}
    ]
  );
  assert.ok(battle.turnLog[0].events.some(event => /failed because of Taunt/.test(event.text || '')));
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Trick Room'), { current: 8, max: 8 });
});

test('mid-turn Imprison blocks the shared move on the correct side before PP consumption', () => {
  const battle = run(
    [mon('Slowpoke', 'Oblivious', ['Tackle']), mon('Snorlax', 'Immunity', ['Protect'])],
    [mon('Whimsicott', 'Prankster', ['Imprison', 'Tackle']), mon('Diglett', 'Sand Veil', ['Protect'])],
    1,
    [
      {turn: 1, side: 'player', slot: 0, move: 'Tackle'},
      {turn: 1, side: 'opponent', slot: 0, move: 'Imprison'}
    ]
  );
  assert.ok(battle.turnLog[0].events.some(event => /failed because of Imprison/.test(event.text || '')));
  assert.deepEqual(pp(battle.turnLog[0].post, 'player', 0, 'Tackle'), { current: 20, max: 20 });
});

test('a selected move with no PP falls back to Struggle', () => {
  const forcedActions = [];
  for (let turn = 1; turn <= 9; turn++) {
    forcedActions.push({turn, side: 'player', slot: 0, move: 'Protect'});
    forcedActions.push({turn, side: 'player', slot: 1, move: 'Protect'});
    forcedActions.push({turn, side: 'opponent', slot: 0, move: 'Protect'});
    forcedActions.push({turn, side: 'opponent', slot: 1, move: 'Protect'});
  }
  const battle = run(
    [mon('Pikachu', 'Static', ['Protect']), mon('Dragonite', 'Inner Focus', ['Protect'])],
    [mon('Abra', 'Synchronize', ['Protect']), mon('Diglett', 'Sand Veil', ['Protect'])],
    9,
    forcedActions
  );
  assert.equal(pp(battle.turnLog[7].post, 'player', 0, 'Protect').current, 0);
  assert.ok(battle.turnLog[8].events.some(event => event.text === 'Pikachu used Struggle!'));
});

test('dual Pressure spread PP agrees with the pinned Showdown reference', () => {
  const fixture = structuredClone(completedGameProbes()[0]);
  fixture.id = 'dual-pressure-spread-pp';
  fixture.completeGame = false;
  fixture.compareExactHP = false;
  fixture.compareBoosts = false;
  fixture.comparePP = true;
  fixture.player.members[0] = mon('Garchomp', 'Sand Veil', ['Rock Slide']);
  fixture.player.members[1] = mon('Dragonite', 'Inner Focus', ['Protect']);
  fixture.player.members[2] = mon('Snorlax', 'Immunity', ['Protect']);
  fixture.player.members[3] = mon('Charizard', 'Blaze', ['Protect']);
  fixture.opponent.members[0] = mon('Dusclops', 'Pressure', ['Protect']);
  fixture.opponent.members[1] = mon('Dusknoir', 'Pressure', ['Protect']);
  fixture.opponent.members[2] = mon('Abra', 'Synchronize', ['Protect']);
  fixture.opponent.members[3] = mon('Diglett', 'Sand Veil', ['Protect']);
  fixture.turns = [{
    player: [{move: 'Rock Slide'}, {move: 'Protect'}],
    opponent: [{move: 'Protect'}, {move: 'Protect'}]
  }];
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});
