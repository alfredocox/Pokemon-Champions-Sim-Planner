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
  const inlineModeled = new Set([
    'Adaptability',
    'Aroma Veil',
    'Chlorophyll',
    'Clear Body',
    'Comatose',
    'Competitive',
    'Defiant',
    'Dragonize',
    'Drizzle',
    'Drought',
    'Electric Surge',
    'Grassy Surge',
    'Guts',
    'Hospitality',
    'Inner Focus',
    'Intimidate',
    'Levitate',
    'Magic Bounce',
    'Magma Armor',
    'Mega Sol',
    'Misty Surge',
    'Multiscale',
    'Oblivious',
    'Overcoat',
    'Own Tempo',
    'Parental Bond',
    'Piercing Drill',
    'Prankster',
    'Psychic Surge',
    'Armor Tail',
    'Seed Sower',
    'Good as Gold',
    'Sand Rush',
    'Sand Stream',
    'Slush Rush',
    'Snow Warning',
    'Spicy Spray',
    'Sweet Veil',
    'Swift Swim',
    'Tough Claws',
    'Unburden',
    'Unseen Fist',
    'Water Veil'
  ]);
  Object.keys(ctx.ABILITIES || {}).forEach(function(ability) {
    inlineModeled.add(ability);
  });
  return inlineModeled;
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

T('4. formerly high-impact shipped ability gaps stay modeled', function() {
  [
    'Berserk',
    'Compound Eyes',
    'Flower Veil',
    'Gale Wings',
    'Innards Out',
    "Mind's Eye",
    'No Guard',
    'Poison Touch',
    'Protean',
    'Shadow Tag',
    'Skill Link',
    'Stalwart',
    'Stamina'
  ].forEach(function(ability) {
    truthy(modeled.has(ability), ability + ' should remain modeled by the engine');
  });
});

T('5. Pressure stays modeled through PP and Frisk remains an explicit information-only ability', function() {
  truthy(modeled.has('Pressure'), 'Pressure should remain modeled by PP consumption');
  truthy(modeled.has('Frisk'), 'Frisk should remain an explicit modeled no-op while items are visible');
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
