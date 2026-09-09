'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, RegExp,
  parseInt, parseFloat
};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
load('generated/pokemon_showdown_legal_data.js');
vm.runInContext(
  'this.Pokemon = Pokemon; this.Field = Field; this.simulateBattle = simulateBattle; this._moveHits = _moveHits; this._accuracyStageMult = _accuracyStageMult; this._speedSort = _speedSort; this._compareTurnActionOrder = _compareTurnActionOrder;',
  ctx
);

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass += 1;
  } catch (error) {
    console.log('  FAIL', name, '-', error.message);
    fail += 1;
  }
}

function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}

function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'not equal'} expected=${JSON.stringify(expected)} got=${JSON.stringify(actual)}`);
  }
}

function member(name, overrides = {}) {
  return Object.assign({
    name,
    ability: '',
    item: '',
    nature: 'Hardy',
    level: 50,
    moves: ['Splash'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides);
}

function team(name, members) {
  return { name, format: 'sv', legality_status: 'legal', members };
}

console.log('\n=== battle edge-case behavior tests ===\n');

T('1. accuracy uses a strict threshold boundary', () => {
  const attacker = { ability: '', statBoosts: { acc: 0 } };
  const target = { ability: '', statBoosts: { eva: 0 } };
  const field = new ctx.Field({ format: 'doubles' });
  eq(ctx._moveHits(attacker, target, 'Rock Slide', field, () => 0, 0.9), true,
    'zero should hit a 90 percent move');
  eq(ctx._moveHits(attacker, target, 'Rock Slide', field, () => 0.899999, 0.9), true,
    'a roll below the threshold should hit');
  eq(ctx._moveHits(attacker, target, 'Rock Slide', field, () => 0.9, 0.9), false,
    'a roll equal to the threshold should miss like Showdown randomChance');
  eq(ctx._moveHits(attacker, target, 'Rock Slide', field, () => 1, 0.9), false,
    'one should miss a 90 percent move');
});

T('2. accuracy stages use the Showdown ladder and clamp the combined stage', () => {
  eq(ctx._accuracyStageMult(1), 4 / 3, 'accuracy stage +1 multiplier');
  eq(ctx._accuracyStageMult(-1), 3 / 4, 'accuracy stage -1 multiplier');
  eq(ctx._accuracyStageMult(6), 3, 'accuracy stage +6 multiplier');
  const attacker = { ability: '', statBoosts: { acc: 6 } };
  const target = { ability: '', statBoosts: { eva: -6 } };
  const field = new ctx.Field({ format: 'doubles' });
  eq(ctx._moveHits(attacker, target, 'Never Local Move', field, () => 0.299999, 0.1), true,
    'combined stage +12 should clamp to +6 and hit below 30 percent');
  eq(ctx._moveHits(attacker, target, 'Never Local Move', field, () => 0.3, 0.1), false,
    'combined stage +12 should clamp to +6 rather than multiplying stages separately');
});

T('3. Regenerator heals one third max HP only after a successful switch', () => {
  const amoonguss = member('Amoonguss', {
    ability: 'Regenerator',
    currentHp: 30,
    moves: ['Teleport'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }
  });
  const battle = ctx.simulateBattle(
    team('Regenerator Switch', [amoonguss, member('Pikachu', { ability: 'Static', moves: ['Tackle'] })]),
    team('Passive Target', [member('Blissey')]),
    { format: 'singles', seed: [101, 103, 107, 109], maxTurns: 1 }
  );
  const turn = battle.turnLog.find(row => row.turn === 1);
  const event = (turn.effect_events || []).find(row =>
    row && row.effect_kind === 'ability-switch-out-heal' && row.move === 'Regenerator'
  );
  truthy(event, 'Regenerator switch-out heal event missing');
  eq(event.hp_before, 30, 'Regenerator should use the outgoing Pokemon current HP');
  eq(event.heal_candidate, Math.floor(event.max_hp / 3),
    'Regenerator should calculate one third max HP rounded down');
  eq(event.hp_after - event.hp_before, event.heal_applied, 'Regenerator applied heal mismatch');
  truthy(battle.log.some(line => String(line).includes("Amoonguss's Regenerator restored HP!")),
    'Regenerator visible log missing');
});

T('4. Regenerator does not activate when a switch has no replacement', () => {
  const battle = ctx.simulateBattle(
    team('No Bench', [member('Amoonguss', {
      ability: 'Regenerator', currentHp: 30, moves: ['Teleport'],
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }
    })]),
    team('Passive Target', [member('Blissey')]),
    { format: 'singles', seed: [113, 127, 131, 137], maxTurns: 1 }
  );
  truthy(!battle.log.some(line => String(line).includes('Regenerator restored HP')),
    'Regenerator must not heal after a failed switch');
});

T('5. spread accuracy can hit one target and miss the other', () => {
  const player = team('Spread Accuracy', [member('Charizard', {
    ability: 'Blaze',
    nature: 'Timid',
    moves: ['Heat Wave'],
    evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
  }), member('Blissey')]);
  const opponent = team('Two Targets', [
    member('Torkoal', { ability: 'White Smoke' }),
    member('Abomasnow', { ability: 'Soundproof' })
  ]);

  const battle = ctx.simulateBattle(player, opponent, {
    format: 'doubles', seed: [4, 5, 6, 7], maxTurns: 1
  });
  const missed = battle.log.filter(line => /Charizard's Heat Wave missed/.test(String(line)));
  const damaged = battle.log.filter(line => /Charizard used Heat Wave!/.test(String(line)) && /dmg/.test(String(line)));
  eq(missed.length, 1, 'Heat Wave should miss exactly one target for the fixed seed');
  eq(damaged.length, 1, 'Heat Wave should damage exactly one target for the fixed seed');
});

T('6. four-way exact Speed ties are shuffled once as a stable seeded group', () => {
  const field = new ctx.Field({ format: 'doubles' });
  function tiedAction(name) {
    return {
      attacker: { name, getEffSpeed: () => 100 },
      priority: 0
    };
  }
  function run() {
    const rolls = [0.9, 0.1, 0.6];
    let calls = 0;
    const actions = ['A', 'B', 'C', 'D'].map(tiedAction);
    ctx._speedSort(
      actions,
      (a, b) => ctx._compareTurnActionOrder(a, b, field),
      () => { const value = rolls[calls]; calls += 1; return value; }
    );
    return { order: actions.map(action => action.attacker.name).join(''), calls };
  }
  const first = run();
  const second = run();
  eq(first.calls, 3, 'a four-action tie should consume exactly three shuffle rolls');
  eq(first.order, second.order, 'the same tie seed must replay the same order');
  eq(new Set(first.order.split('')).size, 4, 'the shuffled order must contain every action exactly once');
});

T('7. ability immunity resolves before spread accuracy', () => {
  const player = team('Immunity Order', [
    member('Groudon', {
      nature: 'Jolly',
      moves: ['Precipice Blades'],
      evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
    }),
    member('Blissey')
  ]);
  const opponent = team('Mixed Targets', [
    member('Orthworm', { ability: 'Earth Eater' }),
    member('Torkoal', { ability: 'White Smoke' })
  ]);
  const battle = ctx.simulateBattle(player, opponent, {
    format: 'doubles',
    seed: [-1640531535, 1788099678, 1448462240, 2011961552],
    maxTurns: 1,
    forcedActions: [
      { turn: 1, side: 'player', slot: 0, move: 'Precipice Blades', targetSide: 'enemy', targetSlot: 0 }
    ]
  });
  truthy(battle.log.some(line => /Orthworm is immune to Precipice Blades because of Earth Eater/.test(String(line))),
    'Earth Eater immunity should be reported');
  truthy(!battle.log.some(line => /Precipice Blades missed Orthworm/.test(String(line))),
    'an immune target must not be reported as an accuracy miss');
  const turn = battle.turnLog.find(row => row.turn === 1);
  truthy((turn.effect_events || []).some(row => row.effect_kind === 'ability-immunity' && row.blocked_move === 'Precipice Blades'),
    'structured ability-immunity evidence should be retained');
});

T('8. simultaneous replacements both receive opposing Intimidate', () => {
  const mirror = team('Replacement Mirror', [
    member('Pikachu', { currentHp: 1, status: 'poison', moves: ['Protect'] }),
    member('Incineroar', { ability: 'Intimidate', moves: ['Tackle'] })
  ]);
  for (let seed = 1; seed <= 100; seed++) {
    const battle = ctx.simulateBattle(mirror, mirror, { format: 'singles', maxTurns: 1, seed: [seed, 2, 3, 4] });
    const turn = battle.turnLog.find(row => row.turn === 1);
    const boosts = Object.entries(turn.post.stat_boosts).filter(([key]) => /Incineroar/.test(key));
    eq(boosts.length, 2, 'both replacement identities must be present');
    boosts.forEach(([, value]) => eq(value.atk, -1, 'both replacements must receive Intimidate'));
  }
});

T('9. executed attacks preserve Scrappy and Minds Eye Ghost bypass', () => {
  for (const [name, ability, move] of [
    ['Kangaskhan', 'Scrappy', 'Tackle'],
    ['Flamigo', 'Scrappy', 'Close Combat'],
    ['Ursaluna-Bloodmoon', "Mind's Eye", 'Hyper Voice']
  ]) {
    const battle = ctx.simulateBattle(
      team('Bypass', [member(name, { ability, moves: [move] })]),
      team('Ghost', [member('Gengar')]),
      { format: 'singles', maxTurns: 1, seed: [1, 2, 3, 4],
        forcedActions: [{ turn: 1, side: 'player', slot: 0, move, targetSide: 'enemy', targetSlot: 0 }] }
    );
    truthy(battle.log.some(line => line.includes('used ' + move + '!') && line.includes('dmg')), ability + ' must deal damage during execution');
    truthy(!battle.log.some(line => line.includes(move + ' had no effect')), 'must not emit false immunity');
  }
});

T('10. ordinary Normal attacks still fail against Ghost targets', () => {
  const battle = ctx.simulateBattle(
    team('No Bypass', [member('Kangaskhan', { moves: ['Tackle'] })]),
    team('Ghost', [member('Gengar')]),
    { format: 'singles', maxTurns: 1, seed: [1, 2, 3, 4],
      forcedActions: [{ turn: 1, side: 'player', slot: 0, move: 'Tackle', targetSide: 'enemy', targetSlot: 0 }] }
  );
  truthy(battle.log.some(line => line.includes('Tackle had no effect on Gengar')), 'ordinary Ghost immunity must remain');
  truthy(!battle.log.some(line => line.includes('used Tackle!') && line.includes('dmg')), 'non-bypass attack must not damage Ghost');
});

T('11. simultaneous replacement weather uses Speed, not side or Trick Room', () => {
  for (const trickRoom of [false, true]) {
    for (const reverse of [false, true]) {
      const sun = team('Slow Sun', [
        member('Pikachu', { currentHp: 1, status: 'poison', moves: [trickRoom ? 'Trick Room' : 'Protect'] }),
        member('Torkoal', { ability: 'Drought' })
      ]);
      const rain = team('Fast Rain', [
        member('Pikachu', { currentHp: 1, status: 'poison', moves: ['Protect'] }),
        member('Pelipper', { ability: 'Drizzle' })
      ]);
      const battle = ctx.simulateBattle(reverse ? rain : sun, reverse ? sun : rain,
        { format: 'singles', maxTurns: 1, seed: [1, 2, 3, 4] });
      const weatherEvents = battle.log.filter(line => /Drought|Drizzle/.test(line));
      truthy(weatherEvents.length >= 2, 'both weather entry abilities must run');
      truthy(weatherEvents[weatherEvents.length - 1].includes('Drought'), 'slower Torkoal must set weather last');
      if (trickRoom) truthy(battle.log.some(line => /twisted|Trick Room/i.test(line)), 'Trick Room scenario must activate');
    }
  }
});

console.log(`\nbattle edge-case behavior: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
