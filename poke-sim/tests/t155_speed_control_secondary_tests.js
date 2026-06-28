// t155_speed_control_secondary_tests.js
// Regression coverage for spread secondary effects and ratio-based status drops.
// Icy Wind / Muddy Water should apply their secondary effects with the expected
// Champions-era probabilities and caps.

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
vm.runInContext([
  'this.simulateBattle = simulateBattle;',
  'this.Pokemon = Pokemon;',
  'this.Field = Field;',
  'this.applySecondary = _applyDamagingMoveSecondary;',
].join('\n'), ctx);

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

console.log('\n=== Speed control secondary tests ===\n');

T('1. Icy Wind drops Speed on all hit foes', () => {
  const playerTeam = {
    name: 'Speed Control',
    format: 'champions',
    legality_status: 'legal',
    members: [{
      name: 'Whimsicott',
      item: '',
      ability: 'Prankster',
      nature: 'Timid',
      level: 50,
      moves: ['Icy Wind'],
      evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 2, spe: 32 }
    }]
  };

  const oppTeam = {
    name: 'Targets',
    format: 'champions',
    legality_status: 'legal',
    members: [{
      name: 'Dragonite',
      item: '',
      ability: '',
      nature: 'Serious',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    }, {
      name: 'Metagross',
      item: '',
      ability: '',
      nature: 'Serious',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    }]
  };

  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(Array.isArray(battle.log), 'battle log missing');
  truthy(battle.log.some(line => String(line).includes('used Icy Wind!')), 'Icy Wind did not resolve');
  truthy(battle.log.filter(line => String(line).includes("Speed fell!")).length >= 2,
    'Icy Wind should drop Speed on both opponents');
});

T('2. Muddy Water can drop accuracy with the expected ratio', () => {
  const attacker = new ctx.Pokemon({
    name: 'Swampert',
    item: '',
    ability: '',
    nature: 'Serious',
    level: 50,
    moves: ['Muddy Water'],
    evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 2, spe: 0 }
  });
  const target = new ctx.Pokemon({
    name: 'Blissey',
    item: '',
    ability: '',
    nature: 'Serious',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  });
  const field = new ctx.Field({ format: 'doubles' });
  const log = [];
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field.playerSide.activeMons = [attacker];
  field.oppSide.activeMons = [target];

  truthy(ctx.applySecondary(attacker, 'Muddy Water', target, field, log, () => 0.29),
    'Muddy Water should apply accuracy drop below 30% threshold');
  truthy(target.statBoosts.acc === -1, 'Muddy Water accuracy drop missing');
  truthy(log.some(line => String(line).includes("Blissey's accuracy fell!")),
    'Muddy Water accuracy drop log missing');

  const blocked = ctx.applySecondary(attacker, 'Muddy Water', target, field, log, () => 0.30);
  truthy(blocked === false, 'Muddy Water should not apply at or above 30% threshold');
});

if (fail > 0) {
  process.exitCode = 1;
}
