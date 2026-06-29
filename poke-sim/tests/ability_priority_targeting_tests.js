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
vm.runInContext([
  'this.simulateBattle = simulateBattle;',
  'this.Pokemon = Pokemon;',
  'this.Field = Field;',
  'this.getPriority = getPriority;',
  'this._moveHits = _moveHits;',
  'this.canInflictStatus = canInflictStatus;',
  'this._applyTargetStageMap = _applyTargetStageMap;',
  'this._compareTurnActionOrder = _compareTurnActionOrder;'
].join('\n'), ctx);

const compareTurnActionOrder = ctx._compareTurnActionOrder;

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

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'not equal') + ' expected=' + JSON.stringify(expected) + ' got=' + JSON.stringify(actual));
}

function member(name, overrides) {
  return Object.assign({
    name,
    level: 50,
    item: '',
    ability: '',
    nature: 'Serious',
    moves: ['Tackle'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides || {});
}

function team(members) {
  return { name: 'Test', format: 'champions', legality_status: 'legal', members };
}

function effectRows(battle, predicate) {
  const rows = [];
  for (const turn of battle.turnLog || []) {
    for (const row of turn.effect_events || []) {
      if (!predicate || predicate(row)) rows.push(row);
    }
  }
  return rows;
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
  truthy(effectRows(battle, row => row.effect_kind === 'move-failure' && row.failure_reason_id === 'armor_tail_priority_block' && row.blocked_priority && row.blocker === 'Armor Tail').length > 0,
    'Armor Tail priority block should export structured failure evidence');
});

T('3b. Dazzling blocks opposing priority moves for the side', function() {
  const playerTeam = team([{
    name: 'Bruxish',
    item: '',
    ability: 'Dazzling',
    nature: 'Adamant',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 4 }
  }, {
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
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
  truthy(battle.log.some(line => String(line).includes('Dazzling blocked Fake Out')),
    'Dazzling should block Fake Out');
  truthy(effectRows(battle, row => row.effect_kind === 'move-failure' && row.failure_reason_id === 'dazzling_priority_block' && row.blocked_priority && row.blocker === 'Dazzling').length > 0,
    'Dazzling priority block should export structured failure evidence');
});

T('3c. Queenly Majesty blocks opposing priority moves for the side', function() {
  const playerTeam = team([{
    name: 'Tsareena',
    item: '',
    ability: 'Queenly Majesty',
    nature: 'Adamant',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 4 }
  }, {
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
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
  truthy(battle.log.some(line => String(line).includes('Queenly Majesty blocked Fake Out')),
    'Queenly Majesty should block Fake Out');
  truthy(effectRows(battle, row => row.effect_kind === 'move-failure' && row.failure_reason_id === 'queenly_majesty_priority_block' && row.blocked_priority && row.blocker === 'Queenly Majesty').length > 0,
    'Queenly Majesty priority block should export structured failure evidence');
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

T('6. Intimidate activation is visible in the battle log', function() {
  const playerTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const oppTeam = team([{
    name: 'Garchomp',
    item: '',
    ability: 'Rough Skin',
    nature: 'Jolly',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [21, 22, 23, 24], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Incineroar's Intimidate activated!")),
    'Intimidate activation log missing');
  truthy(battle.log.some(line => String(line).includes("Incineroar's Intimidate lowered Garchomp's Attack!")),
    'Intimidate stat-drop log missing');
});

T('7. Clear Body blocks Intimidate drops', function() {
  const playerTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const oppTeam = team([{
    name: 'Dragapult',
    item: '',
    ability: 'Clear Body',
    nature: 'Jolly',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [25, 26, 27, 28], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Dragapult's Clear Body prevented its stats from being lowered!")),
    'Clear Body prevention log missing');
  falsy(battle.log.some(line => String(line).includes("Incineroar's Intimidate lowered Dragapult's Attack!")),
    'Clear Body target should not receive the Intimidate drop');
});

T('8. Defiant punishes Intimidate with a net Attack boost', function() {
  const playerTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const oppTeam = team([{
    name: 'Kingambit',
    item: '',
    ability: 'Defiant',
    nature: 'Adamant',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 4 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [29, 30, 31, 32], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Kingambit's Attack fell!")),
    'Intimidate should still attempt the initial Attack drop');
  truthy(battle.log.some(line => String(line).includes("Kingambit's Attack sharply rose!")),
    'Defiant boost log missing');
});

T('9. Competitive punishes Intimidate with a Special Attack boost', function() {
  const playerTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const oppTeam = team([{
    name: 'Milotic',
    item: '',
    ability: 'Competitive',
    nature: 'Modest',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 0, spe: 4 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [33, 34, 35, 36], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes("Milotic's Attack fell!")),
    'Intimidate should still apply the initial Attack drop');
  truthy(battle.log.some(line => String(line).includes("Milotic's Special Attack sharply rose!")),
    'Competitive boost log missing');
});

T('10. Cloud Nine suppresses Swift Swim speed boosts', function() {
  const field = new ctx.Field({ weather: 'rain', format: 'doubles' });
  const swimmer = new ctx.Pokemon({
    name: 'Ludicolo',
    item: '',
    ability: 'Swift Swim',
    nature: 'Modest',
    level: 50,
    moves: ['Hydro Pump'],
    evs: { hp: 4, spa: 32, spe: 32, atk: 0, def: 0, spd: 0 }
  }, '', 'champions');
  const suppressor = new ctx.Pokemon({
    name: 'Golduck',
    item: '',
    ability: 'Cloud Nine',
    nature: 'Timid',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 4, spa: 32, spe: 32, atk: 0, def: 0, spd: 0 }
  }, '', 'champions');
  swimmer.side = field.playerSide;
  suppressor.side = field.oppSide;
  field.playerSide.activeMons = [swimmer];
  field.oppSide.activeMons = [suppressor];
  truthy(swimmer.getEffSpeed(field) === swimmer.getStat('spe', field),
    'Cloud Nine should cancel Swift Swim in rain');
});

T('11. Solar Power recoil is logged at end of turn under sun', function() {
  const playerTeam = team([{
    name: 'Houndoom-Mega',
    item: 'Houndoominite',
    ability: 'Solar Power',
    nature: 'Modest',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
  }]);
  const oppTeam = team([{
    name: 'Torkoal',
    item: '',
    ability: 'Drought',
    nature: 'Bold',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [37, 38, 39, 40], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes('Houndoom-Mega is hurt by its Solar Power!')),
    'Solar Power recoil log missing');
});

T('12. Scrappy ignores Intimidate Attack drops when active on entry', function() {
  const playerTeam = team([{
    name: 'Kangaskhan',
    item: '',
    ability: 'Scrappy',
    nature: 'Jolly',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const oppTeam = team([{
    name: 'Incineroar',
    item: '',
    ability: 'Intimidate',
    nature: 'Careful',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 4 }
  }]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [53, 54, 55, 56], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes('Kangaskhan ignored Intimidate!')),
    'Scrappy should ignore Intimidate');
  falsy(battle.log.some(line => String(line).includes("Kangaskhan's Attack fell!")),
    'Scrappy target should not receive the Intimidate Attack drop');
});

T('13. Gale Wings gives Flying moves priority only at full HP', function() {
  const talonflame = new ctx.Pokemon(member('Talonflame', {
    ability: 'Gale Wings',
    moves: ['Tailwind']
  }), '', 'champions');
  eq(ctx.getPriority('Tailwind', talonflame), 1, 'full HP Gale Wings Tailwind priority');
  talonflame.hp -= 1;
  eq(ctx.getPriority('Tailwind', talonflame), 0, 'chipped Gale Wings Tailwind priority');
});

T('14. Flower Veil blocks opponent stat drops and status on allied Grass Pokemon', function() {
  const field = new ctx.Field({ format: 'doubles' });
  const source = new ctx.Pokemon(member('Incineroar', { ability: 'Intimidate' }), '', 'champions');
  const grass = new ctx.Pokemon(member('Lilligant', { ability: 'Own Tempo' }), '', 'champions');
  const veil = new ctx.Pokemon(member('Florges', { ability: 'Flower Veil' }), '', 'champions');
  source.side = field.oppSide;
  grass.side = field.playerSide;
  veil.side = field.playerSide;
  field.oppSide.activeMons = [source];
  field.playerSide.activeMons = [grass, veil];
  const log = [];
  falsy(ctx._applyTargetStageMap(source, grass, { atk: -1 }, log),
    'Flower Veil should block the stat drop');
  eq(grass.statBoosts.atk, 0, 'Flower Veil target Attack stage');
  truthy(log.some(line => String(line).includes('Flower Veil prevented')),
    'Flower Veil stat-drop log missing');
  falsy(ctx.canInflictStatus(grass, 'burn', field, source),
    'Flower Veil should block opponent-inflicted burn on Grass ally');
});

T('15. Mind Eye blocks accuracy drops and ignores target evasion', function() {
  const field = new ctx.Field({ format: 'singles' });
  const source = new ctx.Pokemon(member('Incineroar'), '', 'champions');
  const target = new ctx.Pokemon(member('Ursaluna-Bloodmoon', {
    ability: "Mind's Eye",
    statBoosts: { eva: 6 }
  }), '', 'champions');
  source.side = field.oppSide;
  target.side = field.playerSide;
  field.oppSide.activeMons = [source];
  field.playerSide.activeMons = [target];
  const log = [];
  falsy(ctx._applyTargetStageMap(source, target, { acc: -1 }, log),
    "Mind's Eye should block accuracy drops");
  eq(target.statBoosts.acc, 0, "Mind's Eye target accuracy stage");
  truthy(ctx._moveHits(target, source, 'Tackle', field, function() { return 0.99; }, 1.0),
    "Mind's Eye should ignore evasion boosts when attacking");
});

T('16. Compound Eyes, No Guard, and weather evasion affect accuracy checks', function() {
  const field = new ctx.Field({ format: 'singles', weather: 'sand' });
  const compound = new ctx.Pokemon(member('Butterfree', { ability: 'Compound Eyes' }), '', 'champions');
  const normal = new ctx.Pokemon(member('Butterfree', { ability: 'Tinted Lens' }), '', 'champions');
  const neutral = new ctx.Pokemon(member('Pelipper', { ability: 'Keen Eye' }), '', 'champions');
  const sandVeil = new ctx.Pokemon(member('Garchomp', { ability: 'Sand Veil' }), '', 'champions');
  compound.side = field.playerSide;
  normal.side = field.playerSide;
  neutral.side = field.oppSide;
  sandVeil.side = field.oppSide;
  field.playerSide.activeMons = [compound];
  field.oppSide.activeMons = [neutral, sandVeil];
  truthy(ctx._moveHits(compound, neutral, 'Sleep Powder', field, function() { return 0.90; }, 0.75),
    'Compound Eyes should raise Sleep Powder accuracy enough to hit this roll');
  falsy(ctx._moveHits(normal, sandVeil, 'Tackle', field, function() { return 0.85; }, 1.0),
    'Sand Veil should lower a normally perfect move enough to miss this roll');
  normal.ability = 'No Guard';
  truthy(ctx._moveHits(normal, sandVeil, 'Focus Blast', field, function() { return 0.99; }, 0.70),
    'No Guard should bypass accuracy');
});

T('17. Insomnia and Limber block sleep and paralysis status gates', function() {
  const field = new ctx.Field({ format: 'singles' });
  const ariados = new ctx.Pokemon(member('Ariados', { ability: 'Insomnia' }), '', 'champions');
  const lopunny = new ctx.Pokemon(member('Lopunny', { ability: 'Limber' }), '', 'champions');
  falsy(ctx.canInflictStatus(ariados, 'sleep', field, null), 'Insomnia should block sleep');
  falsy(ctx.canInflictStatus(lopunny, 'paralysis', field, null), 'Limber should block paralysis');
});

T('18. Stalwart ignores Follow Me redirection', function() {
  const playerTeam = team([member('Raichu', {
    ability: 'Stalwart',
    nature: 'Modest',
    moves: ['Thunderbolt'],
    evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
  })]);
  const oppTeam = team([member('Clefairy', {
    ability: 'Friend Guard',
    moves: ['Follow Me'],
    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 32, spe: 0 }
  }), member('Pelipper', {
    ability: 'Keen Eye',
    moves: ['Splash'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  })]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [77, 78, 79, 80], maxTurns: 1 });
  falsy(battle.log.some(line => String(line).includes('attack was drawn to Clefairy')),
    'Stalwart should bypass Follow Me redirection');
  truthy(battle.log.some(line => String(line).includes('Raichu used Thunderbolt') && String(line).includes('Pelipper')),
    'Stalwart attack should stay on the intended Pelipper target');
});

T('19. Shadow Tag blocks voluntary pivoting while a replacement exists', function() {
  const playerTeam = team([member('Abra', {
    ability: 'Synchronize',
    moves: ['Teleport'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }), member('Pikachu', {
    ability: 'Static',
    moves: ['Tackle']
  })]);
  const oppTeam = team([member('Gengar-Mega', {
    ability: 'Shadow Tag',
    moves: ['Splash'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  })]);
  const battle = ctx.simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [81, 82, 83, 84], maxTurns: 1 });
  truthy(battle.log.some(line => String(line).includes('Abra is trapped by Shadow Tag!')),
    'Shadow Tag trap log missing');
  falsy(battle.log.some(line => String(line).includes('Pikachu was sent out!')),
    'Shadow Tag should prevent the replacement switch');
});

T('20. Protean changes the user type once before attacking', function() {
  const battle = ctx.simulateBattle(
    team([member('Greninja', {
      ability: 'Protean',
      nature: 'Modest',
      moves: ['Ice Beam'],
      evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
    })]),
    team([member('Garchomp', {
      ability: 'Rough Skin',
      moves: ['Splash'],
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    })]),
    { format: 'singles', seed: [85, 86, 87, 88], maxTurns: 1 }
  );
  truthy(battle.log.some(line => String(line).includes("Greninja's Protean changed it into the Ice type!")),
    'Protean type-change log missing');
});

T('21. Trace copies the first eligible opposing active ability', function() {
  const battle = ctx.simulateBattle(
    team([member('Alakazam', {
      ability: 'Trace',
      moves: ['Protect'],
      evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
    })]),
    team([member('Rotom-Wash', {
      ability: 'Levitate',
      moves: ['Splash'],
      evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }
    })]),
    { format: 'singles', seed: [89, 90, 91, 92], maxTurns: 1 }
  );
  truthy(battle.log.some(line => String(line).includes("Alakazam traced Rotom-Wash's Levitate!")),
    'Trace copy log missing');
});

T('22. Prankster boosts Tailwind to +1 and Trick Room from -7 to -6', function() {
  eq(ctx.getPriority('Tailwind', { ability: 'Prankster' }), 1, 'Prankster Tailwind priority = +1');
  eq(ctx.getPriority('Tailwind', { ability: '' }), 0, 'non-Prankster Tailwind priority = 0');
  eq(ctx.getPriority('Trick Room', { ability: 'Prankster' }), -6, 'Prankster Trick Room = -7 + 1 = -6');
  eq(ctx.getPriority('Trick Room', { ability: '' }), -7, 'non-Prankster Trick Room stays -7');
});

T('23. Prankster Tailwind fires before a faster opponent using a normal-priority move', function() {
  const battle = ctx.simulateBattle(
    team([member('Sableye', {
      ability: 'Prankster',
      moves: ['Tailwind'],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    })]),
    team([member('Dragapult', {
      ability: 'Clear Body',
      moves: ['Tackle'],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
    })]),
    { format: 'singles', seed: [101, 102, 103, 104], maxTurns: 1 }
  );
  const tailwindIdx = battle.log.findIndex(function(l) { return String(l).includes('Sableye used Tailwind!'); });
  const tackleIdx = battle.log.findIndex(function(l) { return String(l).includes('Dragapult used Tackle!'); });
  truthy(tailwindIdx >= 0, 'Tailwind should appear in battle log');
  truthy(tackleIdx >= 0, 'Tackle should appear in battle log');
  truthy(tailwindIdx < tackleIdx, 'Prankster Tailwind (+1 priority) should fire before Dragapult Tackle (0 priority) even though Sableye is slower');
});

T('24. Under Trick Room, Prankster Tailwind (+1) still acts before normal priority moves (0)', function() {
  const field = new ctx.Field({ format: 'doubles' });
  field.trickRoom = true;
  field.trickRoomTurns = 5;
  const rng = function() { return 0.75; };
  const prankMon = new ctx.Pokemon(member('Sableye', { ability: 'Prankster' }), '', 'champions');
  const fastMon = new ctx.Pokemon(member('Dragapult', { ability: 'Clear Body', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } }), '', 'champions');
  const twPriority = ctx.getPriority('Tailwind', prankMon);
  const tckPriority = ctx.getPriority('Tackle', fastMon);
  eq(twPriority, 1, 'Prankster Tailwind should resolve to priority +1');
  eq(tckPriority, 0, 'Tackle should resolve to priority 0');
  const twAction = { attacker: prankMon, move: 'Tailwind', priority: twPriority };
  const tckAction = { attacker: fastMon, move: 'Tackle', priority: tckPriority };
  truthy(compareTurnActionOrder(twAction, tckAction, field, rng) < 0,
    'under Trick Room, Prankster Tailwind (+1) must still act before normal Tackle (0): TR only reverses speed within a bracket');
});

T('25. Fake Out (+3) acts before Prankster-boosted Tailwind (+1), including under Trick Room', function() {
  const field = new ctx.Field({ format: 'doubles' });
  const rng = function() { return 0.75; };
  const fakerMon = new ctx.Pokemon(member('Incineroar', { ability: 'Intimidate' }), '', 'champions');
  const prankMon = new ctx.Pokemon(member('Sableye', { ability: 'Prankster' }), '', 'champions');
  const fakePriority = ctx.getPriority('Fake Out', fakerMon);
  const twPriority = ctx.getPriority('Tailwind', prankMon);
  eq(fakePriority, 3, 'Fake Out priority');
  eq(twPriority, 1, 'Prankster Tailwind priority');
  const fakeAction = { attacker: fakerMon, move: 'Fake Out', priority: fakePriority };
  const twAction = { attacker: prankMon, move: 'Tailwind', priority: twPriority };
  truthy(compareTurnActionOrder(fakeAction, twAction, field, rng) < 0,
    'Fake Out (+3) should act before Prankster Tailwind (+1)');
  field.trickRoom = true;
  field.trickRoomTurns = 5;
  truthy(compareTurnActionOrder(fakeAction, twAction, field, rng) < 0,
    'under Trick Room, Fake Out (+3) still acts before Prankster Tailwind (+1)');
});

console.log('\nability priority / targeting:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
