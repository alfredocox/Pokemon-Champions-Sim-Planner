// Issue #94 - renderTeamsGrid must escape imported team text.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  return {
    addEventListener(){}, removeEventListener(){}, appendChild(child){ this.children.push(child); return child; }, removeChild(){},
    setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {}, dataset: {}, innerHTML: '', textContent: '', value: '',
    options: [], children: [], selectedOptions: [], parentNode: null,
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    click(){}, focus(){}, blur(){}
  };
}

const teamsGrid = makeStubEl();
teamsGrid.appendChild = function(child) {
  this.children.push(child);
  this.innerHTML += child && child.innerHTML ? child.innerHTML : '';
  return child;
};
const banner = makeStubEl();
const filterRow = makeStubEl();
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  String, Number, Boolean, RegExp, parseInt, parseFloat,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document: {
    documentElement: makeStubEl(),
    body: makeStubEl(),
    activeElement: makeStubEl(),
    getElementById: (id) => {
      if (id === 'teams-grid') return teamsGrid;
      if (id === 'teams-persistence-banner') return banner;
      if (id === 'teams-filter-row') return filterRow;
      return makeStubEl();
    },
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    createElement: () => makeStubEl(),
    addEventListener(){},
    removeEventListener(){}
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
  if (file === 'move_legality.js') ctx.window.ChampionsSim = ctx.ChampionsSim;
}

load('data.js');
load('generated/pokemon_showdown_legal_data.js');
load('generated/champions_move_pools.js');
load('move_legality.js');
load('engine.js');
load('storage_adapter.js');
load('ui.js');
vm.runInContext([
  'this.renderTeamsGrid=renderTeamsGrid;',
  'this.TEAMS=TEAMS;'
].join('\n'), ctx);

const renderTeamsGrid = ctx.renderTeamsGrid;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}
function falsy(v, msg='') { if (v) throw new Error(msg || 'expected falsy'); }

console.log('\n=== team grid XSS tests ===\n');

ctx.TEAMS.__xss_fixture = {
  name: '<img src=x onerror=alert(1)>',
  style: 'balance',
  description: '"><script>alert(1)</script>',
  label: '<svg/onload=alert(2)>',
  source: 'custom',
  legality_status: 'legal',
  format: 'champions',
  members: [{
    name: 'Garchomp',
    item: 'Leftovers',
    ability: 'Rough Skin',
    nature: 'Jolly',
    level: 50,
    evs: { hp: 1, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
    moves: ['Earthquake', 'Protect']
  }]
};

ctx.TEAMS.__invalid_fixture = {
  name: 'Invalid Item Clause Fixture',
  style: 'balance',
  description: 'Duplicate item test',
  label: 'BAD',
  source: 'custom',
  legality_status: 'legal',
  format: 'champions',
  members: [
    {
      name: 'Garchomp',
      item: 'Sitrus Berry',
      ability: 'Rough Skin',
      nature: 'Jolly',
      level: 50,
      evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ['Earthquake', 'Protect']
    },
    {
      name: 'Rotom-Wash',
      item: 'Sitrus Berry',
      ability: 'Levitate',
      nature: 'Bold',
      level: 50,
      evs: { hp: 32, atk: 0, def: 10, spa: 23, spd: 0, spe: 1 },
      moves: ['Thunderbolt', 'Hydro Pump', 'Protect']
    }
  ]
};

ctx.TEAMS.__stataware_fixture = {
  name: 'Inferred Champions Fixture',
  style: 'balance',
  description: 'Inferred Champion spread should render without stale SV fallback copy',
  label: 'INF',
  source: 'preloaded',
  legality_status: 'legal_inferred',
  format: 'champions',
  members: [
    {
      name: 'Gengar-Mega',
      item: 'Gengarite',
      ability: 'Shadow Tag',
      nature: 'Timid',
      level: 50,
      evs: { hp: 1, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 },
      moves: ['Shadow Ball', 'Sludge Bomb', 'Perish Song', 'Protect']
    },
    {
      name: 'Kingambit',
      item: 'Black Glasses',
      ability: 'Defiant',
      nature: 'Adamant',
      level: 50,
      evs: { hp: 1, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ['Kowtow Cleave', 'Sucker Punch', 'Low Kick', 'Protect']
    }
  ]
};

T('1. renderTeamsGrid escapes hostile team name and description', () => {
  vm.runInContext('TEAMS_FILTER = "custom";', ctx);
  renderTeamsGrid();
  inc(teamsGrid.innerHTML, '&lt;img src=x onerror=alert(1)&gt;');
  inc(teamsGrid.innerHTML, '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  inc(teamsGrid.innerHTML, '&lt;svg/onload=alert(2)&gt;');
  falsy(teamsGrid.innerHTML.includes('<img src=x onerror=alert(1)>'), 'raw image tag leaked');
});

T('2. renderTeamsGrid hides invalid teams from the runnable catalog', () => {
  vm.runInContext('TEAMS_FILTER = "custom";', ctx);
  renderTeamsGrid();
  falsy(teamsGrid.innerHTML.includes('Invalid Item Clause Fixture'), 'invalid team name leaked');
  falsy(teamsGrid.innerHTML.includes('NOT LEGAL'), 'illegal badge should not render for hidden teams');
  falsy(teamsGrid.innerHTML.includes('Item Clause violation: duplicate items: Sitrus Berry'), 'hidden legality reason leaked');
});

T('3. renderTeamsGrid removes inferred preloaded teams instead of showing SV fallback copy', () => {
  vm.runInContext('TEAMS_FILTER = "all";', ctx);
  renderTeamsGrid();
  falsy(teamsGrid.innerHTML.includes('Inferred Champions Fixture'), 'inferred preloaded team should be removed from runnable grid');
  falsy(teamsGrid.innerHTML.includes('Legal (inferred)'), 'inferred legality label should not render for removed rows');
  falsy(teamsGrid.innerHTML.includes('Legal (inferred SV spreads)'), 'stale SV fallback label leaked');
});

console.log(`\nteam grid XSS: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
