// Issue #160 - simulator must not allow the same team on both sides.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function stubEl() {
  return {
    addEventListener(){},
    removeEventListener(){},
    appendChild(){},
    removeChild(){},
    setAttribute(){},
    getAttribute(){ return null; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    children: [],
    selectedOptions: [],
    parentNode: null,
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    click(){},
    focus(){},
    blur(){}
  };
}

const playerSel = stubEl();
const oppSel = stubEl();
playerSel.value = 'player';
oppSel.value = 'player';

const els = {
  'player-select': playerSel,
  'opponent-select': oppSel
};

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  String, Number, Boolean, RegExp, parseInt, parseFloat,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document: {
    documentElement: stubEl(),
    body: stubEl(),
    activeElement: stubEl(),
    getElementById: (id) => els[id] || stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    createElement: () => stubEl(),
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
  alert(){},
  Event: function(type){ this.type = type; }
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
vm.runInContext('this.TEAMS = TEAMS;', ctx);

const enforceDistinctBattleTeams = ctx.enforceDistinctBattleTeams;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

console.log('\n=== distinct battle team tests ===\n');

T('1. duplicate player/opponent selection is normalized', () => {
  truthy(typeof enforceDistinctBattleTeams === 'function', 'helper should exist');
  const nextOpp = enforceDistinctBattleTeams();
  truthy(nextOpp, 'expected a fallback opponent');
  truthy(oppSel.value !== playerSel.value, 'opponent should differ from player');
  truthy(ctx.TEAMS[oppSel.value], 'fallback opponent should exist in TEAMS');
});

T('2. already distinct selections stay unchanged', () => {
  const before = oppSel.value;
  const again = enforceDistinctBattleTeams();
  truthy(oppSel.value === before, 'distinct selection should remain unchanged');
  truthy(again === null, 'helper should no-op when selections are already distinct');
});

console.log(`\ndistinct battle teams: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
