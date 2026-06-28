// engine_terrain_tests.js — TDD blocking tests for terrain mechanics
// RED phase: T1-T5 expected to FAIL before engine fixes are applied.
// GREEN phase: all T1-T5 pass after engine fixes.
// Exit code: 1 if any test fails (blocks CI).

const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, Map,
  JSON, Promise, setTimeout, clearTimeout, Date, String, Number, Boolean,
  RegExp, parseInt, parseFloat
};
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
load('data.js');
load('engine.js');
vm.runInContext([
  'this.Pokemon            = Pokemon;',
  'this.Field              = Field;',
  'this.simulateBattle     = simulateBattle;',
  'this.canInflictStatus   = canInflictStatus;',
  'this.applyTerrainAbility = (typeof applyTerrainAbility !== "undefined") ? applyTerrainAbility : null;',
].join('\n'), ctx);

const { Pokemon, Field, simulateBattle } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '—', e.message);
    fail++;
  }
}
function eq(a, b, msg)  { if (a !== b) throw new Error(`${msg || ''} expected ${b}, got ${a}`); }
function truthy(v, msg) { if (!v) throw new Error(msg || `expected truthy, got ${JSON.stringify(v)}`); }
function falsy(v, msg)  { if (v)  throw new Error(msg || `expected falsy, got ${JSON.stringify(v)}`); }
function logHas(log, sub) { return log.some(l => String(l).includes(sub)); }

function team(members) {
  return { name: 'TestTeam', format: 'champions', legality_status: 'legal', members };
}
function mon(overrides) {
  return Object.assign({
    name: 'Garchomp', level: 50, moves: ['Tackle'], ability: '', item: '',
    nature: 'Hardy', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides);
}

// ============================================================
// T1 — Grassy Surge sets terrain on entry (battle log check)
// ============================================================
console.log('\nGrassy Surge on-entry:');
T('1. Grassy Surge sets field.terrain via battle log on entry', () => {
  const playerTeam = team([
    mon({ name: 'Rillaboom', ability: 'Grassy Surge', nature: 'Adamant',
      evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Tackle'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 1 });
  const log = b.log || [];
  truthy(logHas(log, 'Grassy Terrain') || logHas(log, 'Grassy Surge'),
    `Grassy Surge must log terrain activation on entry. Log: ${log.slice(0,10).join(' | ')}`);
});

// ============================================================
// T2 — applyTerrainAbility unit test
// ============================================================
console.log('\napplyTerrainAbility unit tests:');
T('2. applyTerrainAbility sets field.terrain=grassy and terrainTurns=5 for Grassy Surge', () => {
  truthy(ctx.applyTerrainAbility !== null,
    'applyTerrainAbility must be defined (not yet implemented)');
  const mon2 = new Pokemon({ name: 'Rillaboom', level: 50, moves: ['Tackle'],
    ability: 'Grassy Surge', item: '', nature: 'Hardy' });
  const field2 = new Field();
  const log2 = [];
  const result = ctx.applyTerrainAbility(mon2, field2, log2);
  truthy(result, 'applyTerrainAbility must return true for Grassy Surge');
  eq(field2.terrain, 'grassy', 'field.terrain must be grassy after Grassy Surge');
  eq(field2.terrainTurns, 5, 'field.terrainTurns must be 5');
});

// ============================================================
// T3 — Grassy Terrain heals grounded mons 1/16 maxHp per turn
// ============================================================
console.log('\nGrassy Terrain end-of-turn recovery:');
T('3. Grassy Terrain restores 1/16 max HP at end of turn for grounded mons', () => {
  const playerTeam = team([
    mon({ name: 'Rillaboom', ability: 'Grassy Surge', nature: 'Adamant',
      evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Tackle'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 3 });
  const log = b.log || [];
  truthy(logHas(log, 'restored HP with Grassy Terrain'),
    `Grassy Terrain must log HP restoration each turn. Log: ${log.join(' | ')}`);
});

// ============================================================
// T4 — Electric Surge sets terrain on entry
// ============================================================
console.log('\nElectric Surge on-entry:');
T('4. Electric Surge sets field.terrain=electric via battle log on entry', () => {
  const playerTeam = team([
    mon({ name: 'Raichu', ability: 'Electric Surge', nature: 'Timid',
      evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 0 }, moves: ['Thunderbolt'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 1 });
  const log = b.log || [];
  truthy(logHas(log, 'Electric Terrain') || logHas(log, 'Electric Surge'),
    `Electric Surge must log terrain activation on entry. Log: ${log.slice(0,10).join(' | ')}`);
});

// ============================================================
// T5 — Misty Surge sets terrain on entry
// ============================================================
console.log('\nMisty Surge on-entry:');
T('5. Misty Surge sets field.terrain=misty via battle log on entry', () => {
  const playerTeam = team([
    mon({ name: 'Gardevoir', ability: 'Misty Surge', nature: 'Modest',
      evs: { hp: 0, atk: 0, def: 0, spa: 32, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 1 });
  const log = b.log || [];
  truthy(logHas(log, 'Misty Terrain') || logHas(log, 'Misty Surge'),
    `Misty Surge must log terrain activation on entry. Log: ${log.slice(0,10).join(' | ')}`);
});

// ============================================================
// T6 — Electric Terrain blocks sleep on grounded mons
// ============================================================
console.log('\nElectric Terrain status block:');
T('6. Electric Terrain blocks sleep on grounded mons, allows other statuses', () => {
  const field6 = new Field();
  field6.terrain = 'electric';
  const grounded = new Pokemon({ name: 'Garchomp', level: 50, moves: ['Tackle'],
    ability: '', item: '', nature: 'Hardy' });
  falsy(ctx.canInflictStatus(grounded, 'sleep', field6, null),
    'Electric Terrain must block sleep on grounded mon');
  truthy(ctx.canInflictStatus(grounded, 'burn', field6, null),
    'Electric Terrain must NOT block burn on grounded mon (only sleep is blocked)');
  truthy(ctx.canInflictStatus(grounded, 'poison', field6, null),
    'Electric Terrain must NOT block poison on grounded mon');
});

// ============================================================
// T7 — Psychic Terrain blocks priority moves on grounded mons
// ============================================================
console.log('\nPsychic Terrain priority block:');
T('7. Psychic Terrain blocks priority moves from hitting grounded mons', () => {
  const playerTeam = team([
    mon({ name: 'Raichu', ability: 'Static', nature: 'Timid',
      evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Quick Attack'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Gardevoir', ability: 'Psychic Surge', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 3 });
  const log = b.log || [];
  truthy(logHas(log, 'Psychic Terrain') && logHas(log, 'blocked'),
    `Psychic Terrain must log a priority move block. Log: ${log.join(' | ')}`);
});

console.log(`\nRESULT: ${pass}/${pass+fail} PASS`);
process.exit(fail === 0 ? 0 : 1);
