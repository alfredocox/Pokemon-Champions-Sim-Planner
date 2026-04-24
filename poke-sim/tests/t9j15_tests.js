// T9j.15 (Refs #71) - Best Mega Trigger Turn card tests
//
// Coverage targets (22 cases):
//   Section A - Mega detection (3)
//   Section B - Cache key + TTL (3)
//   Section C - Best-refined + baseline pickers (4)
//   Section D - Severity bands (4)
//   Section E - Card renderer HTML shape (3)
//   Section F - PDF summary builder (2)
//   Section G - Full computeMegaTriggerSweep integration (3)
//
// Engine dependency: runMegaTriggerSweep() in engine.js (T9j.7, shipped #23).
//
// Follows the vm.createContext stub-DOM pattern from t9j12_tests.js /
// t9j14_tests.js so the full ui.js loads without browser-only globals.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  const el = {
    _children: [], _listeners: {}, innerHTML: '', textContent: '', value: '',
    style: {}, dataset: {},
    classList: {
      _set: new Set(),
      add(c){ this._set.add(c); }, remove(c){ this._set.delete(c); },
      toggle(c, on){ on === undefined ? (this._set.has(c) ? this._set.delete(c) : this._set.add(c)) : (on ? this._set.add(c) : this._set.delete(c)); },
      contains(c){ return this._set.has(c); }
    },
    className: '', files: null, options: [], selectedOptions: [], selectedIndex: 0,
    checked: false, disabled: false, hidden: false,
    appendChild(c){ this._children.push(c); return c; },
    removeChild(c){ const i = this._children.indexOf(c); if (i>=0) this._children.splice(i,1); return c; },
    addEventListener(ev, fn){ (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener(){}, querySelector(){ return makeStubEl(); }, querySelectorAll(){ return []; },
    getAttribute(){ return null; }, setAttribute(){}, click(){}, focus(){}, blur(){}, dispatchEvent(){}
  };
  return el;
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }), print: () => {} },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }),
  document: (function(){
    const d = {
      _els: {},
      getElementById(id) { if (!this._els[id]) this._els[id] = makeStubEl(); return this._els[id]; },
      querySelector(){ return makeStubEl(); }, querySelectorAll(){ return []; },
      createElement(){ return makeStubEl(); }, body: makeStubEl(), addEventListener(){}
    };
    d.documentElement = makeStubEl();
    return d;
  })(),
  localStorage: { _s: {}, getItem(k){ return this._s[k] !== undefined ? this._s[k] : null; }, setItem(k, v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; }, clear(){ this._s = {}; } },
  URL: { createObjectURL(){ return 'blob:stub'; }, revokeObjectURL(){} },
  Blob: function(parts){ this.parts = parts; },
  FileReader: function(){},
  alert: () => {},
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  fetch: () => Promise.reject(new Error('no network in tests'))
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
load('data.js');
load('engine.js');
load('ui.js');

// Expose the helpers we want to assert on.
vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.CHAMPIONS_MEGAS=CHAMPIONS_MEGAS;',
  'this.teamHasMega=teamHasMega;',
  'this.megaTriggerCacheKey=megaTriggerCacheKey;',
  'this.getCachedMegaSweep=getCachedMegaSweep;',
  'this.setCachedMegaSweep=setCachedMegaSweep;',
  'this.pickBestMegaRefined=pickBestMegaRefined;',
  'this.findTurn1Baseline=findTurn1Baseline;',
  'this.megaTriggerSeverity=megaTriggerSeverity;',
  'this.renderMegaTriggerCard=renderMegaTriggerCard;',
  'this.renderMegaTriggerCards=renderMegaTriggerCards;',
  'this.buildMegaTriggerPdfSummary=buildMegaTriggerPdfSummary;',
  'this.computeMegaTriggerSweep=computeMegaTriggerSweep;',
  'this.MEGA_TRIGGER_CACHE=MEGA_TRIGGER_CACHE;',
  'this.MEGA_TRIGGER_TTL_MS=MEGA_TRIGGER_TTL_MS;'
].join(' '), ctx);

const {
  TEAMS, CHAMPIONS_MEGAS, teamHasMega,
  megaTriggerCacheKey, getCachedMegaSweep, setCachedMegaSweep,
  pickBestMegaRefined, findTurn1Baseline, megaTriggerSeverity,
  renderMegaTriggerCard, renderMegaTriggerCards, buildMegaTriggerPdfSummary,
  computeMegaTriggerSweep, MEGA_TRIGGER_CACHE, MEGA_TRIGGER_TTL_MS
} = ctx;

let pass = 0, fail = 0;
function T(name, fn) { try { fn(); console.log('  PASS', name); pass++; } catch (e) { console.log('  FAIL', name, '-', e.message); fail++; } }
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function falsy(v, msg='') { if (v) throw new Error(msg || 'expected falsy, got ' + JSON.stringify(v)); }
function inc(hay, needle, msg='') { if (String(hay).indexOf(needle) < 0) throw new Error((msg||'') + ` expected to contain ${JSON.stringify(needle)}`); }
function notInc(hay, needle, msg='') { if (String(hay).indexOf(needle) >= 0) throw new Error((msg||'') + ` expected NOT to contain ${JSON.stringify(needle)}`); }
function close(a, b, tol, msg='') { if (Math.abs(a - b) > tol) throw new Error(`${msg} |${a}-${b}| > ${tol}`); }

console.log('\n=== T9j.15 - Best Mega Trigger Turn card tests ===\n');

// ---- Section A: Mega detection ----
T('1. teamHasMega - returns true for mega_dragonite (Dragonite-Mega holds Dragoninite)', () => {
  truthy(teamHasMega(TEAMS.mega_dragonite), 'mega_dragonite should register as Mega holder');
});
T('2. teamHasMega - returns false for non-Mega team (player)', () => {
  falsy(teamHasMega(TEAMS.player), 'TR Counter Squad is non-Mega and must not flag');
});
T('3. teamHasMega - returns false for undefined / empty team', () => {
  falsy(teamHasMega(null));
  falsy(teamHasMega({ members: [] }));
  falsy(teamHasMega({ members: [{ name: 'Fake', item: 'Life Orb' }] }));
});

// ---- Section B: Cache key + TTL ----
T('4. megaTriggerCacheKey - stable for same (player, opp, bo, format)', () => {
  eq(megaTriggerCacheKey('mega_dragonite', 'player', 3, 'doubles'),
     megaTriggerCacheKey('mega_dragonite', 'player', 3, 'doubles'));
});
T('5. cache set+get roundtrip returns stored sweep', () => {
  const fakeSweep = { matchup: 'a_vs_b', results: [] };
  setCachedMegaSweep('k1', 'k2', 1, 'doubles', fakeSweep);
  const got = getCachedMegaSweep('k1', 'k2', 1, 'doubles');
  eq(got, fakeSweep);
});
T('6. cache entry expires after TTL - returns null for stale entry', () => {
  const key = ctx.megaTriggerCacheKey('stale', 'opp', 1, 'doubles');
  // Manually implant a stale timestamp
  ctx.MEGA_TRIGGER_CACHE[key] = { t: Date.now() - (ctx.MEGA_TRIGGER_TTL_MS + 1000), sweep: { results: [] } };
  const got = getCachedMegaSweep('stale', 'opp', 1, 'doubles');
  eq(got, null, 'stale cache entry must expire');
});

// ---- Section C: Best-refined + baseline pickers ----
T('7. pickBestMegaRefined - returns highest-WR refined entry', () => {
  const slot = {
    refinedTop3: [
      { turn: 3, wr: 0.52, n: 200, ci95: 0.03 },
      { turn: 2, wr: 0.57, n: 200, ci95: 0.03 },
      { turn: 1, wr: 0.48, n: 200, ci95: 0.03 }
    ]
  };
  const best = pickBestMegaRefined(slot);
  eq(best.turn, 2);
  close(best.wr, 0.57, 1e-9);
});
T('8. pickBestMegaRefined - returns null for empty refined', () => {
  eq(pickBestMegaRefined({ refinedTop3: [] }), null);
  eq(pickBestMegaRefined(null), null);
  eq(pickBestMegaRefined({}), null);
});
T('9. findTurn1Baseline - extracts turn=1 entry from curve', () => {
  const slot = {
    curve: [
      { turn: 1, wr: 0.48, n: 50, ci95: 0.05 },
      { turn: 2, wr: 0.57, n: 50, ci95: 0.05 },
      { turn: 'never', wr: 0.40, n: 50, ci95: 0.06 }
    ]
  };
  const b = findTurn1Baseline(slot);
  eq(b.turn, 1);
  close(b.wr, 0.48, 1e-9);
});
T('10. findTurn1Baseline - returns null for empty curve with no fallback', () => {
  eq(findTurn1Baseline({ curve: [] }), null);
  eq(findTurn1Baseline(null), null);
});

// ---- Section D: Severity bands ----
T('11. megaTriggerSeverity - delta +5% returns green', () => {
  const s = megaTriggerSeverity(0.05);
  eq(s.band, 'green');
});
T('12. megaTriggerSeverity - delta +2% returns amber', () => {
  const s = megaTriggerSeverity(0.02);
  eq(s.band, 'amber');
});
T('13. megaTriggerSeverity - delta +0.5% returns gray', () => {
  const s = megaTriggerSeverity(0.005);
  eq(s.band, 'gray');
});
T('14. megaTriggerSeverity - negative delta returns gray', () => {
  const s = megaTriggerSeverity(-0.03);
  eq(s.band, 'gray');
});

// ---- Section E: Card renderer HTML shape ----
T('15. renderMegaTriggerCard - includes slot name, WR, and delta label', () => {
  const slot = {
    megaSlot: 'Dragonite-Mega',
    curve: [
      { turn: 1, wr: 0.48, n: 50, ci95: 0.05 },
      { turn: 2, wr: 0.57, n: 50, ci95: 0.05 },
      { turn: 'never', wr: 0.40, n: 50, ci95: 0.06 }
    ],
    refinedTop3: [
      { turn: 2, wr: 0.57, n: 200, ci95: 0.03 },
      { turn: 3, wr: 0.52, n: 200, ci95: 0.03 },
      { turn: 1, wr: 0.48, n: 200, ci95: 0.03 }
    ]
  };
  const html = renderMegaTriggerCard(slot);
  inc(html, 'Dragonite-Mega');
  inc(html, 'Trigger Mega on Turn 2');
  inc(html, '57%');
  inc(html, '+9.0%');
  inc(html, 'mega-trigger-green');
});
T('16. renderMegaTriggerCard - best=never collapses to hold-mega label', () => {
  const slot = {
    megaSlot: 'Altaria-Mega',
    curve: [
      { turn: 1, wr: 0.40, n: 50, ci95: 0.07 },
      { turn: 'never', wr: 0.60, n: 50, ci95: 0.07 }
    ],
    refinedTop3: [
      { turn: 'never', wr: 0.60, n: 200, ci95: 0.03 },
      { turn: 1, wr: 0.40, n: 200, ci95: 0.03 }
    ]
  };
  const html = renderMegaTriggerCard(slot);
  inc(html, 'Hold Mega (never trigger)');
  inc(html, 'mega-trigger-green');
});
T('17. renderMegaTriggerCards - empty sweep returns empty string (no empty card)', () => {
  eq(renderMegaTriggerCards(null), '');
  eq(renderMegaTriggerCards({ results: [] }), '');
});

// ---- Section F: PDF summary builder ----
T('18. buildMegaTriggerPdfSummary - formats slot trigger with +delta vs T1', () => {
  const sweep = {
    results: [{
      megaSlot: 'Dragonite-Mega',
      curve: [
        { turn: 1, wr: 0.48, n: 50, ci95: 0.05 },
        { turn: 2, wr: 0.57, n: 50, ci95: 0.05 }
      ],
      refinedTop3: [
        { turn: 2, wr: 0.57, n: 200, ci95: 0.03 },
        { turn: 1, wr: 0.48, n: 200, ci95: 0.03 }
      ]
    }]
  };
  const s = buildMegaTriggerPdfSummary(sweep);
  inc(s, 'Dragonite-Mega T2 (57%, +9.0% vs T1)');
});
T('19. buildMegaTriggerPdfSummary - empty sweep returns empty string', () => {
  eq(buildMegaTriggerPdfSummary(null), '');
  eq(buildMegaTriggerPdfSummary({ results: [] }), '');
});

// ---- Section G: Full computeMegaTriggerSweep integration ----
T('20. computeMegaTriggerSweep - returns null for non-Mega player key', () => {
  // player team has no Mega; must short-circuit to null before running sweep
  const r = computeMegaTriggerSweep('player', 'mega_dragonite', 1, 'doubles');
  eq(r, null);
});
T('21. computeMegaTriggerSweep - unknown team keys return null', () => {
  const r = computeMegaTriggerSweep('nonexistent_team', 'also_missing', 1, 'doubles');
  eq(r, null);
});
T('22. computeMegaTriggerSweep - Mega team returns a sweep with results array (cache hit on second call)', () => {
  // First call may run the real engine sweep; second call must hit cache (same identity).
  const s1 = computeMegaTriggerSweep('mega_dragonite', 'player', 1, 'doubles');
  truthy(s1, 'sweep should return truthy result for Mega team');
  truthy(Array.isArray(s1.results), 'sweep.results should be an array');
  const s2 = computeMegaTriggerSweep('mega_dragonite', 'player', 1, 'doubles');
  eq(s2, s1, 'second call should return cached (same reference)');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
