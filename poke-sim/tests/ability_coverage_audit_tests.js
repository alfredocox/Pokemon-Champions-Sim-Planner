'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const classification = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests/fixtures/ability_gap_classification.json'), 'utf8')
);

const ctx = {
  console,
  module: {},
  exports: {},
  Math,
  Object,
  Array,
  Set,
  JSON,
  RegExp,
  String
};
vm.createContext(ctx);
vm.runInContext(dataSource + '\nthis.TEAMS=TEAMS; this.CHAMPIONS_MEGAS=CHAMPIONS_MEGAS;', ctx, { filename: 'data.js' });
vm.runInContext(engineSource + '\nthis.ABILITIES=ABILITIES;', ctx, { filename: 'engine.js' });

const CURATED_TEAMS = Object.fromEntries(
  Object.entries(ctx.TEAMS || {}).filter(function(entry) {
    return entry[0] !== 'player' && entry[0].indexOf('custom_') !== 0;
  })
);

function getCuratedTeamAbilities() {
  return Object.values(CURATED_TEAMS).flatMap(function(team) {
    return (team.members || []).map(function(member) {
      return member.ability;
    }).filter(Boolean);
  });
}

function getMegaAbilities() {
  return Object.values(ctx.CHAMPIONS_MEGAS || {}).map(function(mega) {
    return mega.ability;
  }).filter(Boolean);
}

function getModeledAbilities() {
  return new Set([
    'Aroma Veil',
    'Chlorophyll',
    'Comatose',
    'Dragonize',
    'Drizzle',
    'Drought',
    'Hospitality',
    'Inner Focus',
    'Intimidate',
    'Levitate',
    'Magic Bounce',
    'Magma Armor',
    'Mega Sol',
    'Multiscale',
    'Oblivious',
    'Overcoat',
    'Own Tempo',
    'Parental Bond',
    'Piercing Drill',
    'Prankster',
    'Armor Tail',
    'Good as Gold',
    'Sand Rush',
    'Sand Stream',
    'Slush Rush',
    'Snow Warning',
    'Spicy Spray',
    'Sweet Veil',
    'Swift Swim',
    'Unburden',
    'Unseen Fist',
    'Water Veil'
  ]);
}

function uniqSorted(list) {
  return Array.from(new Set(list)).sort();
}

const modeled = getModeledAbilities();
const abilityUnion = uniqSorted(getCuratedTeamAbilities().concat(getMegaAbilities()));
const unmodeled = abilityUnion.filter(function(ability) {
  return !modeled.has(ability);
});
const catalog = classification.classifications || {};

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
  if (a !== b) throw new Error((msg || 'eq failed') + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

console.log('\n=== ability coverage audit tests ===\n');

T('1. every unmodeled curated-team or mega ability has a classification entry', function() {
  const missing = unmodeled.filter(function(ability) {
    return !catalog[ability];
  });
  eq(missing.length, 0, missing.join(', '));
});

T('2. classification catalog does not contain stale abilities that are no longer unmodeled', function() {
  const stale = Object.keys(catalog).filter(function(ability) {
    return unmodeled.indexOf(ability) === -1;
  });
  eq(stale.length, 0, stale.join(', '));
});

T('3. every classification uses an allowed category and a non-empty rationale', function() {
  const allowed = new Set(classification._meta.categories);
  Object.keys(catalog).forEach(function(ability) {
    truthy(allowed.has(catalog[ability].category), ability + ' category must be allowed');
    truthy(typeof catalog[ability].why === 'string' && catalog[ability].why.length > 0, ability + ' rationale required');
  });
});

T('4. known high-impact shipped ability gaps stay marked battle-result-impacting', function() {
  [
    'Adaptability',
    'Clear Body',
    'Cloud Nine',
    'Competitive',
    'Defiant',
    'Pixilate',
    'Shadow Tag',
    'Solar Power',
    'Stance Change',
    'Sturdy',
    'Supreme Overlord',
    'Tough Claws',
    'Unaware'
  ].forEach(function(ability) {
    const entry = catalog[ability];
    truthy(entry, ability + ' should be cataloged');
    eq(entry.category, 'missing_battle_result_impacting', ability + ' should stay high priority');
  });
});

T('5. Pressure and Frisk stay explicitly marked as non-battle-math gaps', function() {
  eq(catalog.Pressure.category, 'passive_or_noop_for_current_sim', 'Pressure');
  eq(catalog.Frisk.category, 'passive_or_noop_for_current_sim', 'Frisk');
});

const categoryCounts = Object.keys(catalog).reduce(function(acc, ability) {
  const category = catalog[ability].category;
  acc[category] = (acc[category] || 0) + 1;
  return acc;
}, {});

console.log('Curated+mega ability inventory:', abilityUnion.length);
console.log('Modeled by engine:', abilityUnion.length - unmodeled.length);
console.log('Still unmodeled:', unmodeled.length);
console.log('Category counts:', JSON.stringify(categoryCounts));

console.log('\nability coverage audit:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
