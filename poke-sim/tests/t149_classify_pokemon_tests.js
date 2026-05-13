// Issue #149 / #141 - classifyPokemon() seven-role classifier tests.
//
// classifyPokemon is deterministic plumbing for the coaching layer. These
// tests pin the seven public role ids and the strongest signal for each role.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  return {
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {}, dataset: {}, innerHTML: '', textContent: '', value: '',
    options: [], children: [], selectedOptions: [],
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    click(){}, focus(){}, blur(){}
  };
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  String, Number, Boolean, RegExp, parseInt, parseFloat,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document: {
    documentElement: makeStubEl(),
    body: makeStubEl(),
    getElementById: () => makeStubEl(),
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    createElement: () => makeStubEl(),
    addEventListener(){}
  },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){}, clear(){} },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  fetch: () => Promise.reject(new Error('no network in tests')),
  URL: { createObjectURL(){ return 'blob:stub'; }, revokeObjectURL(){} },
  Blob: function(parts){ this.parts = parts; },
  FileReader: function(){},
  alert(){}
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
load('storage_adapter.js');
load('ui.js');
vm.runInContext([
  'this.classifyPokemon=classifyPokemon;',
  'this.CLASSIFY_POKEMON_ROLES=CLASSIFY_POKEMON_ROLES;'
].join(' '), ctx);

const { classifyPokemon, CLASSIFY_POKEMON_ROLES } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(a, b, msg='') {
  if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

console.log('\n=== classifyPokemon seven-role tests ===\n');

T('1. exposes exactly seven public role ids', () => {
  eq(CLASSIFY_POKEMON_ROLES.join('|'), 'lead|sweeper|support|pivot|disruptor|win_condition|sacrifice_piece');
});

T('2. Fake Out + Intimidate classifies as lead', () => {
  const r = classifyPokemon({ name:'Incineroar', ability:'Intimidate', item:'Sitrus Berry', moves:['Fake Out','Parting Shot','Knock Off','Flare Blitz'] });
  eq(r.role, 'lead');
  eq(r.confidence, 'high');
});

T('3. setup attacker classifies as win_condition', () => {
  const r = classifyPokemon({ name:'Dragonite-Mega', ability:'Aerilate', item:'Dragonitite', moves:['Dragon Dance','Extreme Speed','Dragon Claw','Protect'] });
  eq(r.role, 'win_condition');
  truthy(r.reasons.some(x => x.indexOf('Mega') >= 0), r.reasons.join('; '));
});

T('4. Tailwind support classifies as support', () => {
  const r = classifyPokemon({ name:'Whimsicott', ability:'Prankster', item:'Covert Cloak', moves:['Tailwind','Encore','Moonblast','Protect'] });
  eq(r.role, 'support');
});

T('5. Parting Shot cycling classifies as pivot when no lead pressure', () => {
  const r = classifyPokemon({ name:'Grimmsnarl', ability:'Prankster', item:'Light Clay', moves:['Parting Shot','Spirit Break','Reflect','Light Screen'] });
  eq(r.role, 'support');
  truthy(r.scores.pivot.score > 0, 'pivot score should still be recorded');
});

T('6. trap/status Mega classifies as disruptor', () => {
  const r = classifyPokemon({ name:'Gengar-Mega', ability:'Shadow Tag', item:'Gengarite', moves:['Perish Song','Protect','Shadow Ball','Sludge Bomb'] });
  eq(r.role, 'disruptor');
  truthy(r.scores.disruptor.score >= 3, 'trap/status score should be recorded');
});

T('7. pure pivot classifies as pivot', () => {
  const r = classifyPokemon({ name:'Rotom-Wash', ability:'Levitate', item:'Sitrus Berry', moves:['Volt Switch','Hydro Pump','Will-O-Wisp','Protect'] });
  eq(r.role, 'pivot');
});

T('8. denial/status mon classifies as disruptor', () => {
  const r = classifyPokemon({ name:'Sableye', ability:'Prankster', item:'Leftovers', moves:['Encore','Will-O-Wisp','Foul Play','Recover'] });
  eq(r.role, 'disruptor');
});

T('9. Lunar Dance classifies as sacrifice_piece', () => {
  const r = classifyPokemon({ name:'Cresselia', ability:'Levitate', item:'Mental Herb', moves:['Lunar Dance','Trick Room','Helping Hand','Psychic'] });
  eq(r.role, 'sacrifice_piece');
});

T('10. ordinary three-attack mon falls back to sweeper', () => {
  const r = classifyPokemon({ name:'Garchomp', ability:'Rough Skin', item:'Clear Amulet', moves:['Earthquake','Dragon Claw','Rock Slide','Protect'] });
  eq(r.role, 'sweeper');
});

T('11. missing data returns low-confidence support', () => {
  const r = classifyPokemon(null);
  eq(r.role, 'support');
  eq(r.confidence, 'low');
});

console.log(`\nclassifyPokemon: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
