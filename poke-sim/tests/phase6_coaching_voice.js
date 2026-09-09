// Phase 6 (Refs PHASE6_COACHING_VOICE_SPEC.md) - coaching templates and linter.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function stubEl() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    innerHTML: '',
    textContent: '',
    value: 'mega_altaria',
    options: [],
    children: [],
    dataset: {},
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    click: () => {},
    focus: () => {},
    blur: () => {}
  };
}

const created = [];
const resultsSection = stubEl();
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window: {},
  document: {
    getElementById: (id) => id === 'results-section' ? resultsSection : (id === 'inline-pilot-card' ? null : stubEl()),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: stubEl(),
    documentElement: stubEl(),
    head: stubEl(),
    createElement: () => {
      const el = stubEl();
      created.push(el);
      return el;
    }
  },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  }
};
ctx.window.matchMedia = () => ({ matches: false });
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.removeEventListener = () => {};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  if (file === 'move_legality.js') ctx.window.ChampionsSim = ctx.ChampionsSim;
}

load('data.js');
load('generated/pokemon_showdown_legal_data.js');
load('generated/champions_move_pools.js');
load('move_legality.js');
load('logger.js');
try { load('legality.js'); } catch (_) {}
load('engine.js');
load('strategy-injectable.js');
load('ui.js');

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.coachPre = coachPre;',
  'this.coachIn = coachIn;',
  'this.coachPost = coachPost;',
  'this.lintCoachOutput = lintCoachOutput;',
  'this.populationQualifier = populationQualifier;',
  'this.isRNGBlame = isRNGBlame;',
  'this.showInlinePilotCard = showInlinePilotCard;'
].join(' '), ctx);

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'not equal') + ' expected=' + b + ' got=' + a); }

function sampleResult() {
  return {
    wins: 7,
    losses: 3,
    draws: 0,
    winRate: 0.7,
    winConditions: { 'Tailwind Win': 5, 'KO Sweep': 2 },
    allLogs: [
      { result: 'win', leads: { player: ['Incineroar', 'Arcanine'] }, turnLog: [] },
      { result: 'loss', leads: { player: ['Whimsicott', 'Garchomp'] }, turnLog: [] }
    ],
    turnLog: [
      { turn: 1, post: { position_score: 0.55, speed_order: ['A', 'B'] }, delta: { position_score: 0.05 }, events: [] },
      { turn: 2, swingTurn: true, post: { position_score: 0.32, speed_order: ['B', 'A'] }, delta: { position_score: -0.23 }, events: [] }
    ],
    turning_point: { turn: 2 }
  };
}

console.log('\n=== Phase 6 coaching voice tests ===\n');

T('T6-1 coachPre returns non-empty string for all team pairs', () => {
  const keys = Object.keys(ctx.TEAMS).slice(0, 13);
  keys.forEach(p => keys.forEach(o => {
    const out = ctx.coachPre(p, o, { result: sampleResult() });
    truthy(out && out.length > 50, p + ' vs ' + o + ' produced empty PRE');
  }));
});

T('T6-2 coachPost win debrief avoids blame language', () => {
  const out = ctx.coachPost(sampleResult());
  truthy(!/should have|you misplayed|you need to/i.test(out), 'blame language leaked');
});

T('T6-3 nearby random events do not establish an outcome cause', () => {
  const rngLog = [
    { turn: 4, events: [{ text: 'A critical hit!' }], post: { position_score: 0.51 }, delta: { position_score: 0 } },
    { turn: 5, swingTurn: true, events: [{ text: 'Mon used Hydro Pump! It missed!' }], post: { position_score: 0.22 }, delta: { position_score: -0.29 } }
  ];
  truthy(ctx.isRNGBlame(rngLog, 5), 'RNG gate did not trigger');
  const out = ctx.coachPost({ wins: 0, losses: 1, draws: 0, winRate: 0, turnLog: rngLog, turning_point: { turn: 5 } });
  eq((out.match(/\bRNG\b/g) || []).length, 0, 'unsupported RNG cause');
  truthy(/Not established/.test(out), 'causal uncertainty missing');
  truthy(!/you misplayed|should have/i.test(out), 'loss blame leaked');
});

T('T6-4 lintCoachOutput flags the five required banned phrases', () => {
  const out = ctx.lintCoachOutput('always lead with A. never switch. just win. you need to attack. should have clicked Tailwind.');
  ['always lead with', 'never switch', 'just win', 'you need to', 'should have'].forEach(p => {
    truthy(out.banned.includes(p), 'missing banned phrase ' + p);
  });
});

T('T6-5 lintCoachOutput returns clean for verified output', () => {
  const out = ctx.lintCoachOutput(ctx.coachPre('player', 'mega_altaria', { result: sampleResult() }));
  truthy(out.clean, 'coachPre failed linter: ' + out.banned.join(', '));
});

T('T6-6 Inline Pilot Card renders coachPost output after Bo3 run', () => {
  created.length = 0;
  ctx.showInlinePilotCard('mega_altaria', sampleResult());
  const card = created.find(el => /ROOT CAUSE/.test(el.innerHTML));
  truthy(card, 'inline card did not include POST template');
});

T('T7 tournament-claim regex blocks overclaim phrases', () => {
  const rendered = [
    ctx.coachPre('player', 'mega_altaria', { result: sampleResult() }),
    ctx.coachPost(sampleResult()),
    ctx.coachIn(sampleResult().turnLog, 2)
  ].join('\n');
  truthy(!/tournament-grade|ladder-tested|meta-proven|competitive viable|tournament-tested|pro-approved|world's #1/i.test(rendered), 'tournament claim leaked');
});

T('T8 permanent epistemic footer present on PRE and POST', () => {
  [ctx.coachPre('player', 'mega_altaria', { result: sampleResult() }), ctx.coachPost(sampleResult())].forEach(out => {
    truthy(/AI-vs-AI simulations/.test(out), 'AI footer missing');
    truthy(/not verified real-game performance/.test(out), 'evidence limit missing');
    truthy(!/Battle-tested/.test(out), 'unverified tagline returned');
  });
});

T('T9 percentages carry simulated-play qualifier nearby', () => {
  const out = ctx.coachPre('player', 'mega_altaria', { result: sampleResult() }) + '\n' + ctx.coachPost(sampleResult());
  out.split(/\n+/).filter(line => /\d+%/.test(line)).forEach(line => {
    truthy(/simulated play/.test(line), 'bare percentage line: ' + line);
  });
});

console.log(`\nPhase 6 coaching voice: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
