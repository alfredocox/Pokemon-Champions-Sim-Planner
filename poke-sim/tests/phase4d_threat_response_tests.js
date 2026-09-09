// Phase 4d (Refs PHASE4D_THREAT_RESPONSE_SPEC.md) - threat response solver.

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
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    click: () => {},
    focus: () => {},
    blur: () => {}
  };
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window: {},
  document: {
    getElementById: () => stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: stubEl(),
    documentElement: stubEl(),
    head: stubEl(),
    createElement: () => stubEl()
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
}

load('data.js');
try { load('legality.js'); } catch (_) {}
load('engine.js');
try { load('strategy-injectable.js'); } catch (_) {}
load('ui.js');
// Isolated algorithm fixtures explicitly supply a synthetic eligibility gate.
// Production blocking is exercised in regulation_gate_execution_tests.mjs.
ctx.canRunRegulationAnalysis = () => true;

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.solveThreatResponse = solveThreatResponse;',
  'this.classifyLine = classifyLine;',
  'this.classifyThreatBranch = classifyThreatBranch;',
  'this.queueThreatResponseSolve = queueThreatResponseSolve;',
  'this.invalidateThreatResponseCache = invalidateThreatResponseCache;',
  'this.renderThreatResponseCard = renderThreatResponseCard;'
].join(' '), ctx);

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'mismatch') + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

const KNOWN_TEAMS = [
  'player', 'mega_altaria', 'mega_dragonite', 'mega_houndoom',
  'rin_sand', 'suica_sun', 'cofagrigus_tr',
  'champions_arena_1st', 'champions_arena_2nd',
  'aurora_veil_froslass'
];

console.log('\n=== Phase 4d threat response tests ===\n');

T('1. solveThreatResponse returns a candidate for every known team pair', () => {
  for (const player of KNOWN_TEAMS) {
    for (const opp of KNOWN_TEAMS) {
      const out = ctx.solveThreatResponse(player, opp, {
        simsPerBranch: 1,
        rngSeed: 'matrix',
        noCache: true,
        budgetMsTotal: 5000
      });
      truthy(out, player + ' vs ' + opp + ' returned null');
      eq(out.branches.length, 4, player + ' vs ' + opp + ' branch count');
      truthy(out.best_candidate, player + ' vs ' + opp + ' missing best candidate');
    }
  }
});

T('2. seeded solver is deterministic for branch win rates', () => {
  const a = ctx.solveThreatResponse('player', 'mega_altaria', { simsPerBranch: 3, rngSeed: 'same', noCache: true });
  const b = ctx.solveThreatResponse('player', 'mega_altaria', { simsPerBranch: 3, rngSeed: 'same', noCache: true });
  eq(JSON.stringify(a.branches.map(x => [x.id, x.w, x.l, x.d, x.win_rate])),
     JSON.stringify(b.branches.map(x => [x.id, x.w, x.l, x.d, x.win_rate])));
});

T('3. requestIdleCallback fallback path does not throw', () => {
  const old = ctx.requestIdleCallback;
  ctx.requestIdleCallback = undefined;
  const id = ctx.queueThreatResponseSolve(() => {});
  truthy(id !== undefined, 'fallback id missing');
  ctx.requestIdleCallback = old;
});

T('4. classifyLine returns all five expected archetype labels', () => {
  eq(ctx.classifyLine([{ name: 'Whimsicott', moves: ['Tailwind'] }, { name: 'Garchomp', moves: ['Earthquake'] }]), 'SPEED_CONTROL');
  eq(ctx.classifyLine([{ name: 'Cresselia', moves: ['Trick Room'] }, { name: 'Ursaluna', moves: ['Protect'] }]), 'TRICK_ROOM');
  eq(ctx.classifyLine([{ name: 'Torkoal', ability: 'Drought', moves: ['Eruption'] }, { name: 'Venusaur', moves: ['Sleep Powder'] }]), 'WEATHER_SETTER');
  eq(ctx.classifyLine([{ name: 'Incineroar', moves: ['Fake Out', 'Parting Shot'] }, { name: 'Rotom-Wash', moves: ['Volt Switch'] }]), 'UTILITY_PIVOT');
  eq(ctx.classifyLine([{ name: 'Garchomp', moves: ['Earthquake'] }, { name: 'Dragonite', moves: ['Extreme Speed'] }]), 'ATTACKER_CORE');
});

T('5. classifyThreatBranch covers strong/stable/volatile/losing buckets', () => {
  eq(ctx.classifyThreatBranch({ win_rate: 0.70, n: 200, consistency_score: { variance: 0.10, rng_dependency: 0.10 } }), 'strong');
  eq(ctx.classifyThreatBranch({ win_rate: 0.58, n: 80, consistency_score: { variance: 0.20, rng_dependency: 0.10 } }), 'stable');
  eq(ctx.classifyThreatBranch({ win_rate: 0.52, n: 80, consistency_score: { variance: 0.45, rng_dependency: 0.10 } }), 'volatile');
  eq(ctx.classifyThreatBranch({ win_rate: 0.42, n: 80, consistency_score: { variance: 0.10, rng_dependency: 0.10 } }), 'losing');
});

T('6. cached result is returned on second call', () => {
  ctx.invalidateThreatResponseCache();
  const a = ctx.solveThreatResponse('player', 'mega_altaria', { simsPerBranch: 2, rngSeed: 'cache' });
  const b = ctx.solveThreatResponse('player', 'mega_altaria', { simsPerBranch: 2, rngSeed: 'cache' });
  truthy(a === b, 'expected same cached object');
});

T('7. renderer emits recommended and alternatives cards', () => {
  const out = ctx.solveThreatResponse('player', 'mega_altaria', { simsPerBranch: 2, rngSeed: 'render', noCache: true });
  const html = ctx.renderThreatResponseCard(out);
  truthy(html.includes('Threat Response'), 'missing heading');
  truthy(html.includes('cs-line-recommended'), 'missing recommended card');
  truthy(html.includes('Alternatives'), 'missing alternatives');
});

console.log(`\nPhase 4d threat response: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
