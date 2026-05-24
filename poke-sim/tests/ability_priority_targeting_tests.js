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
vm.runInContext('this.simulateBattle = simulateBattle;', ctx);

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

function falsy(v, msg) {
  if (v) throw new Error(msg || 'expected falsy');
}

function team(members) {
  return { name: 'Test', format: 'champions', legality_status: 'legal', members };
}

console.log('\n=== ability priority / targeting tests ===\n');

T('1. Prankster gives Taunt priority over a faster foe', function() {
  const playerTeam = team([{
    name: 'Sableye',
    item: '',
    ability: 'Prankster',
    nature: 'Calm',
    level: 50,
    moves: ['Taunt'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }
  }]);
  const oppTeam = team([{
    name: 'Whimsicott',
    item: '',
    ability: 'Infiltrator',
    nature: 'Timid',
    level: 50,
    moves: ['Haze'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const tauntIdx = battle.log.findIndex(line => String(line).includes('Whimsicott fell for the Taunt!'));
  const failIdx = battle.log.findIndex(line => String(line).includes('used Haze! But it failed because of Taunt!'));
  truthy(tauntIdx >= 0, 'Taunt should land');
  truthy(failIdx > tauntIdx, 'faster foe should still be taunted before acting');
});

T('2. Dark-type foes are immune to Prankster-boosted status moves', function() {
  const playerTeam = team([{
    name: 'Whimsicott',
    item: '',
    ability: 'Prankster',
    nature: 'Timid',
    level: 50,
    moves: ['Taunt'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const oppTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [5, 6, 7, 8], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes('Incineroar is immune to Prankster-boosted Taunt!')),
    'Dark-type immunity log missing');
  falsy(battle.log.some(line => String(line).includes('fell for the Taunt!')),
    'Dark-type target should not be taunted');
});

T('3. Armor Tail blocks opposing priority moves for the side', function() {
  const playerTeam = team([{
    name: 'Farigiraf',
    item: '',
    ability: 'Armor Tail',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }, {
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const oppTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Adamant',
    level: 50,
    moves: ['Fake Out'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 4 }
  }, {
    name: 'Smeargle',
    item: '',
    ability: 'Own Tempo',
    nature: 'Serious',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [9, 10, 11, 12], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes('Armor Tail blocked Fake Out')),
    'Armor Tail should block Fake Out');
});

T('4. Good as Gold blocks targeted status moves', function() {
  const playerTeam = team([{
    name: 'Gholdengo',
    item: '',
    ability: 'Good as Gold',
    nature: 'Modest',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 4, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
  }]);
  const oppTeam = team([{
    name: 'Whimsicott',
    item: '',
    ability: 'Prankster',
    nature: 'Timid',
    level: 50,
    moves: ['Taunt'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [13, 14, 15, 16], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Gholdengo's Good as Gold blocked Taunt!")),
    'Good as Gold should block Taunt');
  falsy(battle.log.some(line => String(line).includes('Gholdengo fell for the Taunt!')),
    'Good as Gold target should not be taunted');
});

T('5. Magic Bounce reflects targeted status moves back to the user', function() {
  const playerTeam = team([{
    name: 'Hatterene',
    item: '',
    ability: 'Magic Bounce',
    nature: 'Quiet',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 4, spe: 0 }
  }]);
  const oppTeam = team([{
    name: 'Whimsicott',
    item: '',
    ability: 'Prankster',
    nature: 'Timid',
    level: 50,
    moves: ['Taunt'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [17, 18, 19, 20], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Hatterene's Magic Bounce reflected Taunt!")),
    'Magic Bounce reflection log missing');
  truthy(battle.log.some(line => String(line).includes('Whimsicott fell for the Taunt!')),
    'attacker should be taunted by reflection');
  falsy(battle.log.some(line => String(line).includes('Hatterene fell for the Taunt!')),
    'Magic Bounce holder should not be taunted');
});

console.log('\nability priority / targeting:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
