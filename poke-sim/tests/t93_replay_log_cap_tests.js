// Issue #93 - replay log cap and truncation indicator.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  return {
    addEventListener(){}, removeEventListener(){},
    appendChild(child){ this.children.push(child); return child; },
    removeChild(){},
    setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {}, dataset: {}, innerHTML: '', textContent: '', value: '',
    options: [], children: [], selectedOptions: [], parentNode: null,
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    click(){}, focus(){}, blur(){}
  };
}

const replayList = makeStubEl();
replayList.appendChild = function(child) {
  this.children.push(child);
  this.innerHTML += child && child.innerHTML ? child.innerHTML : '';
  return child;
};
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
    getElementById: (id) => id === 'replay-list' ? replayList : makeStubEl(),
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
}

load('data.js');
load('engine.js');
load('storage_adapter.js');
load('ui.js');
vm.runInContext([
  'this.csCapBattleReplay = csCapBattleReplay;',
  'this.csIsClutchReplay = csIsClutchReplay;',
  'this.renderReplays = renderReplays;',
  'this.setReplayState = ChampionsSim.simLog._setReplayState;'
].join('\n'), ctx);

const csCapBattleReplay = ctx.csCapBattleReplay;
const csIsClutchReplay = ctx.csIsClutchReplay;
const renderReplays = ctx.renderReplays;
const setReplayState = ctx.setReplayState;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function eq(a, b, msg='') { if (a !== b) throw new Error((msg || 'expected equality') + ': got ' + a + ', expected ' + b); }
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== replay log cap tests ===\n');

T('1. cap helper trims logs to the last 200 lines', () => {
  const battle = {
    result: 'win',
    turns: 12,
    trTurns: 0,
    winCondition: 'KO',
    oppKey: 'mega_altaria',
    log: Array.from({ length: 250 }, (_, i) => 'line ' + i)
  };
  const capped = csCapBattleReplay(battle);
  eq(capped.log.length, 200, 'capped log length');
  eq(capped.log[0], 'line 50', 'keeps newest lines');
  eq(capped.log[199], 'line 249', 'keeps final line');
  truthy(capped.logTruncated, 'should mark truncation');
  eq(capped.logLineCount, 250, 'original line count');
  eq(capped.logShownCount, 200, 'shown line count');
  eq(capped.result, 'win', 'result preserved');
});

T('2. replay renderer shows truncation indicator', () => {
  replayList.children = [];
  replayList.innerHTML = '';
  setReplayState([{
    result: 'win',
    turns: 12,
    trTurns: 0,
    winCondition: 'KO',
    oppKey: 'mega_altaria',
    log: Array.from({ length: 250 }, (_, i) => 'line ' + i)
  }], 'all');
  renderReplays();
  inc(replayList.innerHTML, 'Showing last 200 lines');
  inc(replayList.innerHTML, 'battle-log');
});

T('3. replay renderer includes coaching summary block for losses only', () => {
  replayList.children = [];
  replayList.innerHTML = '';
  setReplayState([{
    result: 'loss',
    turns: 8,
    trTurns: 0,
    winCondition: 'KO',
    oppKey: 'mega_altaria',
    log: ['Turn 1'],
    turnLog: []
  }], 'all');
  renderReplays();
  inc(replayList.innerHTML, 'Coaching Summary');
  inc(replayList.innerHTML, 'not enough evidence');
});

T('4. replay renderer does not show coaching summary for wins', () => {
  replayList.children = [];
  replayList.innerHTML = '';
  setReplayState([{
    result: 'win',
    turns: 8,
    trTurns: 0,
    winCondition: 'KO',
    oppKey: 'mega_altaria',
    log: ['Turn 1'],
    turnLog: []
  }], 'all');
  renderReplays();
  truthy(replayList.innerHTML.indexOf('Coaching Summary') < 0, 'unexpected coaching summary on win replay');
});

T('5. clutch replay requires comeback, close endgame, or late major swing', () => {
  truthy(!csIsClutchReplay({
    result: 'loss',
    turns: 8,
    trTurns: 0,
    turnLog: Array.from({ length: 8 }, (_, i) => ({ turn: i + 1, positionScore: 0.5, delta: { position_score: 0.01 } }))
  }), 'flat 8-turn replay should not be clutch by length alone');

  truthy(csIsClutchReplay({
    result: 'win',
    turns: 6,
    trTurns: 0,
    turning_point: { turn: 5, direction: 'player', cause: 'position_improved' },
    turnLog: [
      { turn: 1, positionScore: 0.5, delta: { position_score: -0.04 } },
      { turn: 2, positionScore: 0.41, delta: { position_score: -0.09 } },
      { turn: 3, positionScore: 0.39, delta: { position_score: -0.02 } },
      { turn: 4, positionScore: 0.44, delta: { position_score: 0.05 } },
      { turn: 5, positionScore: 0.67, delta: { position_score: 0.23 } },
      { turn: 6, positionScore: 0.72, delta: { position_score: 0.05 } }
    ]
  }), 'late comeback win should be clutch');
});

console.log(`\nreplay log cap: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
