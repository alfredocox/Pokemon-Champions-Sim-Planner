const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Number, String, Boolean, RegExp, Date
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('generated/pokemon_showdown_legal_data.js');
load('runtime_data.js');
load('engine.js');
vm.runInContext([
  'this.runtimeData = ChampionsSim.runtimeData;',
  'this.overrides = ChampionsSim.overrides;',
  'this.Pokemon = Pokemon;',
  'this.Field = Field;'
].join('\n'), ctx);

const runtimeData = ctx.runtimeData;
const overrides = ctx.overrides;
const Pokemon = ctx.Pokemon;
const Field = ctx.Field;

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

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function mk(name, overrides) {
  return new Pokemon(Object.assign({
    name: name,
    item: '',
    ability: '',
    nature: 'Hardy',
    moves: ['Thunderbolt'],
    evs: {}
  }, overrides || {}), '', 'champions');
}

console.log('\n=== runtime data bridge tests ===\n');

T('1. runtime bridge exposes generated move/species lookups', () => {
  truthy(runtimeData, 'runtimeData missing');
  const move = runtimeData.getMoveRow('Thunderbolt');
  const species = runtimeData.getSpeciesRow('Arcanine-Hisui');
  const floetteMega = runtimeData.getSpeciesRow('Floette (Eternal Flower)-Mega');
  truthy(move && move.type === 'Electric', 'Thunderbolt move row missing');
  truthy(species && species.types && species.types[0] === 'Fire', 'Arcanine-Hisui species row missing');
  truthy(floetteMega && floetteMega.id === 'floettemega', 'Champion Floette Eternal Mega should bridge to generated Floette-Mega stats');
});

T('2. champions damage roll window is explicit in runtime overrides', () => {
  const win = runtimeData.getDamageRollWindow({ statFormat: 'champions' });
  eq(win.mode, 'discrete_percent', 'champions roll mode');
  eq(win.min, 86, 'champions min roll');
  eq(win.max, 100, 'champions max roll');
  eq(runtimeData.sampleDamageRoll({ statFormat: 'champions' }, function() { return 0; }), 0.86, 'low champions roll');
  eq(runtimeData.sampleDamageRoll({ statFormat: 'champions' }, function() { return 0.999999; }), 1.0, 'high champions roll');
});

T('3. engine damage uses runtime roll override instead of DB-side logic', () => {
  const attacker = mk('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 31 } });
  const target = mk('Pelipper');
  const field = new Field({ format: 'doubles' });
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;

  const original = JSON.parse(JSON.stringify(overrides.damage.rollWindows));
  try {
    overrides.damage.rollWindows.champions = { mode: 'discrete_percent', min: 86, max: 86 };
    const low = attacker.calcDamage('Thunderbolt', target, field, null, function() { return 0; });
    overrides.damage.rollWindows.champions = { mode: 'discrete_percent', min: 100, max: 100 };
    const high = attacker.calcDamage('Thunderbolt', target, field, null, function() { return 0; });
    truthy(high > low, 'engine should reflect runtime override roll window');
  } finally {
    overrides.damage.rollWindows = original;
  }
});

T('4. runtime bridge canonicalizes Showdown move target categories for the engine', () => {
  eq(runtimeData.getMoveTargetCategory('Hyper Voice'), 'all-adjacent-foes', 'Hyper Voice target category');
  eq(runtimeData.getMoveTargetCategory('Earthquake'), 'all-adjacent', 'Earthquake target category');
  eq(runtimeData.getMoveTargetCategory('Helping Hand'), 'all-allies', 'Helping Hand target category');
  eq(runtimeData.getMoveTargetCategory('Stealth Rock'), 'all-foes', 'Stealth Rock target category');
  eq(runtimeData.getMoveTargetCategory('Hurricane'), 'normal', 'any target category collapses to normal without a distance model');
});

T('5. every generated Showdown target value maps to a supported engine category', () => {
  const audit = ctx.ChampionsSim.pokemonDataAudit || {};
  const rawTargets = new Set(Object.values(audit.moves || {}).map((row) => row && row.target).filter(Boolean));
  truthy(rawTargets.size > 0, 'generated move target vocabulary should be present');
  for (const raw of rawTargets) {
    const canonical = runtimeData.normalizeMoveTargetCategory(raw);
    const explicitlyMapped = Object.prototype.hasOwnProperty.call(runtimeData.SHOWDOWN_TARGET_CATEGORY_MAP, raw);
    truthy(explicitlyMapped || runtimeData.isEngineMoveTargetCategory(raw),
      'raw Showdown target category lacks explicit bridge mapping: ' + raw);
    truthy(runtimeData.isEngineMoveTargetCategory(canonical),
      raw + ' normalized to unsupported engine target category: ' + canonical);
  }
});

T('6. engine-only fallback target map cannot drift from runtime bridge map', () => {
  truthy(ctx.SHOWDOWN_TARGET_CATEGORY_FALLBACK_MAP, 'engine fallback target map missing');
  eq(JSON.stringify(ctx.SHOWDOWN_TARGET_CATEGORY_FALLBACK_MAP),
    JSON.stringify(runtimeData.SHOWDOWN_TARGET_CATEGORY_MAP),
    'engine fallback map must match runtime bridge map');
});

console.log('\nruntime data bridge:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
