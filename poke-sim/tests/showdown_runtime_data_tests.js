'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, RegExp,
  parseInt, parseFloat,
  ChampionsSim: {}
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

function toId(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

load('data.js');
load('engine.js');
load('generated/pokemon_showdown_legal_data.js');
vm.runInContext([
  'this.BASE_STATS = BASE_STATS;',
  'this.POKEMON_TYPES_DB = POKEMON_TYPES_DB;',
  'this.CHAMPIONS_MEGAS = CHAMPIONS_MEGAS;',
  'this.TEAMS = TEAMS;',
  'this.Pokemon = Pokemon;',
  'this.classifyPokemon = classifyPokemon;'
].join('\n'), ctx);

const SHOWDOWN = ctx.ChampionsSim.pokemonDataAudit || {};
const SHOWDOWN_SPECIES = SHOWDOWN.species || {};
const ORIGINAL_BASE_STATS = JSON.parse(JSON.stringify(ctx.BASE_STATS || {}));

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

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ' expected=' + JSON.stringify(b) + ' got=' + JSON.stringify(a));
}

function arrEq(a, b, msg) {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  if (left !== right) throw new Error((msg || 'array mismatch') + ' expected=' + right + ' got=' + left);
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function showdownSpecies(name) {
  if (SHOWDOWN_SPECIES[name]) return SHOWDOWN_SPECIES[name];
  const id = toId(name);
  const altId = id === 'floetteeternalflower' ? 'floetteeternal' : id;
  return Object.values(SHOWDOWN_SPECIES).find((row) => row && (
    row.id === id ||
    row.id === altId ||
    toId(row.speciesKey || row.displayName) === id ||
    toId(row.speciesKey || row.displayName) === altId
  ));
}

function expectedBattleSpecies(member) {
  const mega = ctx.CHAMPIONS_MEGAS && ctx.CHAMPIONS_MEGAS[member.name];
  if (mega && mega.baseSpecies && member.item === mega.megaStone) return mega.baseSpecies;
  return member.name;
}

function hasCompleteShowdownBase(row) {
  return !!(row && row.stats &&
    Number.isFinite(Number(row.stats.hp)) &&
    Number.isFinite(Number(row.stats.atk)) &&
    Number.isFinite(Number(row.stats.def)) &&
    Number.isFinite(Number(row.stats.spa)) &&
    Number.isFinite(Number(row.stats.spd)) &&
    Number.isFinite(Number(row.stats.spe)) &&
    Array.isArray(row.types) &&
    row.types.length);
}

console.log('\n=== Showdown runtime data tests ===\n');

T('1. generated Showdown species and move data are loaded for runtime', () => {
  truthy(Object.keys(SHOWDOWN_SPECIES).length > 1000, 'Showdown species table too small');
  truthy(Object.keys(SHOWDOWN.moves || {}).length > 800, 'Showdown move table too small');
  truthy(showdownSpecies('Arcanine-Hisui'), 'Arcanine-Hisui missing from generated species');
  truthy(showdownSpecies('Floette (Eternal Flower)'), 'Floette Eternal Flower alias missing from generated species');
  truthy(showdownSpecies('Floette-Mega'), 'Floette-Mega missing from generated species');
});

T('2. Pokemon construction prefers generated Showdown stats/types over local tables', () => {
  ctx.BASE_STATS['Arcanine-Hisui'] = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1, types: ['Normal'] };
  ctx.POKEMON_TYPES_DB['Arcanine-Hisui'] = ['Normal'];
  const mon = new ctx.Pokemon({
    name: 'Arcanine-Hisui',
    item: 'Clear Amulet',
    ability: 'Intimidate',
    moves: ['Flare Blitz'],
    evs: {}
  }, '', 'champions');
  eq(mon._base.hp, 95, 'base hp should come from Showdown');
  eq(mon._base.atk, 115, 'base atk should come from Showdown');
  arrEq(mon.types, ['Fire', 'Rock'], 'types should come from Showdown');
});

T('3. every preloaded team member resolves to generated Showdown species at battle construction', () => {
  const missing = [];
  const mismatches = [];
  for (const [teamKey, team] of Object.entries(ctx.TEAMS || {})) {
    if (!team || team.source === 'custom') continue;
    for (const member of team.members || []) {
      const expectedName = expectedBattleSpecies(member);
      const row = showdownSpecies(expectedName);
      if (!row) {
        missing.push(teamKey + ':' + expectedName);
        continue;
      }
      if (!row.stats || !Number.isFinite(Number(row.stats.hp))) continue;
      const mon = new ctx.Pokemon(member, teamKey, team.format || 'champions');
      for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
        if (Number(mon._base[stat]) !== Number(row.stats[stat])) {
          mismatches.push(teamKey + ':' + member.name + ':' + stat + ' expected=' + row.stats[stat] + ' got=' + mon._base[stat]);
        }
      }
      const expectedTypes = Array.isArray(row.types) ? row.types : [];
      if (JSON.stringify(mon.types) !== JSON.stringify(expectedTypes)) {
        mismatches.push(teamKey + ':' + member.name + ':types expected=' + expectedTypes.join('/') + ' got=' + mon.types.join('/'));
      }
    }
  }
  eq(missing.length, 0, 'preloaded members missing generated Showdown rows: ' + missing.join(', '));
  eq(mismatches.length, 0, 'preloaded member Showdown runtime mismatches: ' + mismatches.slice(0, 20).join('; '));
});

T('4. role classification uses generated Showdown stats when local stats drift', () => {
  ctx.BASE_STATS['Typhlosion-Hisui'] = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1, types: ['Normal'] };
  const roles = ctx.classifyPokemon({
    name: 'Typhlosion-Hisui',
    item: 'Choice Specs',
    ability: 'Blaze',
    moves: ['Eruption'],
    evs: {}
  });
  truthy(roles.roles && roles.roles.indexOf('Sweeper') >= 0, 'Showdown 119 SpA + damage item should classify as sweeper');
});

T('5. local fallback stays aligned for Farigiraf when Showdown data is unavailable', () => {
  const row = showdownSpecies('Farigiraf');
  truthy(row && row.stats, 'Farigiraf missing from generated Showdown data');
  const fallback = ctx.BASE_STATS.Farigiraf;
  for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    eq(Number(fallback[stat]), Number(row.stats[stat]), 'Farigiraf fallback ' + stat + ' should match Showdown');
  }
});

T('6. complete local fallback stats stay aligned with generated Showdown rows', () => {
  const mismatches = [];
  for (const [name, fallback] of Object.entries(ORIGINAL_BASE_STATS)) {
    if (ctx.CHAMPIONS_MEGAS && ctx.CHAMPIONS_MEGAS[name]) continue;
    const row = showdownSpecies(name);
    if (!hasCompleteShowdownBase(row)) continue;
    for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
      if (Number(fallback[stat]) !== Number(row.stats[stat])) {
        mismatches.push(name + ':' + stat + ' expected=' + row.stats[stat] + ' got=' + fallback[stat]);
      }
    }
    const expectedTypes = Array.isArray(row.types) ? row.types : [];
    if (JSON.stringify(fallback.types || []) !== JSON.stringify(expectedTypes)) {
      mismatches.push(name + ':types expected=' + expectedTypes.join('/') + ' got=' + (fallback.types || []).join('/'));
    }
  }
  eq(mismatches.length, 0, 'local fallback Showdown drift: ' + mismatches.slice(0, 20).join('; '));
});

console.log('\nShowdown runtime data:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
