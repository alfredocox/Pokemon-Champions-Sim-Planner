// T9j.3b coverage unit tests.
// Runs ui.js in a minimal DOM-stub context, then exercises computeCoverage()
// across 7 cases matching the diff spec.
//
// Strategy: we do not need a real browser. We stub only what ui.js touches at
// top level so that:
//   - `globalThis.TEAMS` / `currentPlayerKey` are available
//   - document.getElementById() returns null no-op objects
//   - every addEventListener call is a no-op
// Then require data.js and ui.js via simple string-eval so `var`s land on
// the same VM context we control.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = require('path').resolve(__dirname, '..');

function noopEl() {
  const fn = function(){ return noopEl(); };
  return new Proxy(fn, {
    get(target, prop) {
      if (prop === 'innerHTML' || prop === 'textContent' || prop === 'value') return '';
      if (prop === 'style') return new Proxy({}, { get(){return '';}, set(){return true;} });
      if (prop === 'classList') return { add(){}, remove(){}, toggle(){}, contains(){return false;} };
      if (prop === 'children' || prop === 'options' || prop === 'childNodes') return [];
      if (prop === 'addEventListener' || prop === 'removeEventListener') return () => {};
      if (prop === 'appendChild' || prop === 'insertBefore' || prop === 'removeChild') return () => {};
      if (prop === 'insertAdjacentHTML' || prop === 'setAttribute' || prop === 'removeAttribute' || prop === 'append' || prop === 'prepend' || prop === 'replaceChildren' || prop === 'remove' || prop === 'click' || prop === 'focus' || prop === 'blur' || prop === 'select') return () => {};
      if (prop === 'querySelectorAll') return () => [];
      if (prop === 'querySelector' || prop === 'closest') return () => null;
      if (prop === 'parentNode' || prop === 'parentElement' || prop === 'nextSibling' || prop === 'previousSibling' || prop === 'firstChild' || prop === 'lastChild') return null;
      if (prop === 'dataset') return {};
      if (prop === 'checked' || prop === 'disabled' || prop === 'hidden') return false;
      if (prop === 'length') return 0;
      if (prop === 'tagName' || prop === 'nodeName') return 'DIV';
      if (prop === Symbol.iterator) return function*(){};
      if (prop === 'then') return undefined;
      return noopEl();
    },
    set() { return true; },
    apply() { return noopEl(); },
    has() { return true; }
  });
}

const documentStub = {
  getElementById: () => noopEl(),
  querySelectorAll: () => [],
  querySelector: () => noopEl(),
  createElement: () => noopEl(),
  documentElement: noopEl(),
  body: noopEl(),
  head: noopEl(),
  addEventListener: () => {},
  readyState: 'complete'
};

const ctx = {
  document: documentStub,
  window: {},
  globalThis: null,
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  navigator: { clipboard: null },
  localStorage: { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} },
  location: { href:'', search:'', hash:'' },
  history: { pushState:()=>{}, replaceState:()=>{} },
  URL: URL,
  Blob: class {},
  matchMedia: () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  alert: () => {}, confirm: () => true, prompt: () => '',
  fetch: () => Promise.reject(new Error('no fetch in test')),
  performance: { now: () => Date.now() },
  Math, JSON, Date, Array, Object, String, Number, Boolean, RegExp, Error,
  Promise, Symbol, Map, Set, WeakMap, WeakSet
};
ctx.globalThis = ctx;
ctx.window.document = documentStub;
vm.createContext(ctx);

function load(file) {
  const code = fs.readFileSync(path.join(SRC, file), 'utf8');
  try {
    vm.runInContext(code, ctx, { filename: file });
  } catch (e) {
    console.error(`[load ${file}] ${e.message}`);
    throw e;
  }
}

load('data.js');
load('engine.js');
load('ui.js');

// Expose TEAMS from VM lexical scope onto ctx (const decls aren't auto-global).
vm.runInContext('globalThis.__TEAMS__ = TEAMS; globalThis.TEAMS = TEAMS;', ctx);

const computeCoverage = ctx.computeCoverage;
if (typeof computeCoverage !== 'function') {
  console.error('FAIL: computeCoverage not exposed on globalThis');
  process.exit(1);
}

let passes = 0, fails = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passes++;
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    fails++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg||''} expected ${b} got ${a}`); }

function makeTeam(members) {
  const payload = { members: members.map(m => Object.assign({ name:'X', moves:[], ability:'' }, m)) };
  ctx.__payload__ = payload;
  vm.runInContext('TEAMS.__test__ = globalThis.__payload__;', ctx);
  return '__test__';
}
function mutateTeam(key, fn) {
  ctx.__fn__ = fn;
  vm.runInContext('globalThis.__fn__(TEAMS.' + key + ');', ctx);
}

console.log('\n=== T9j.3b coverage tests ===\n');

// ---- Case 1: empty team returns null or all-false ----
test('Case 1: empty/unknown team returns null', () => {
  const r = computeCoverage('__nonexistent__');
  assert(r === null, 'expected null for unknown team');
});

// ---- Case 2: ability-only (Chlorophyll) triggers speed_control.abilities ----
test('Case 2: ability-only (Chlorophyll) -> abilities=true, any=true', () => {
  const k = makeTeam([{ ability:'Chlorophyll', moves:['Tackle'] }]);
  const r = computeCoverage(k);
  eq(r.speed_control.abilities, true, 'abilities');
  eq(r.speed_control.any, true, 'any');
  eq(r.speed_control.speed_lowering, false, 'speed_lowering');
  eq(r.speed_control.field_effects, false, 'field_effects');
});

// ---- Case 3: mixed (Icy Wind + Tailwind + Feint) -> three sub-flags ----
test('Case 3: mixed moves -> speed_lowering + field_effects + priority_speed', () => {
  const k = makeTeam([
    { moves:['Icy Wind'] },
    { moves:['Tailwind'] },
    { moves:['Feint'] }
  ]);
  const r = computeCoverage(k);
  eq(r.speed_control.speed_lowering, true, 'speed_lowering');
  eq(r.speed_control.field_effects,  true, 'field_effects');
  eq(r.speed_control.priority_speed, true, 'priority_speed');
  eq(r.speed_control.any, true, 'any');
});

// ---- Case 4: multi-weather (Drought + Rain Dance) both trigger weather_setter ----
test('Case 4: multi-weather ability+move both count', () => {
  const k = makeTeam([
    { ability:'Drought', moves:[] },
    { moves:['Rain Dance'] }
  ]);
  const r = computeCoverage(k);
  eq(r.weather_setter, true, 'weather_setter');
});

// ---- Case 5: TR + anti-TR pressure (Taunt) both flag trick_room ----
test('Case 5: own-team TR + Taunt -> trick_room=true, field_effects=true', () => {
  const k = makeTeam([
    { moves:['Trick Room'] },
    { moves:['Taunt'] }
  ]);
  const r = computeCoverage(k);
  eq(r.trick_room, true, 'trick_room');
  eq(r.speed_control.field_effects, true, 'field_effects (TR is own-team speed control)');
});

// ---- Case 6: Sticky Web must count as speed_lowering (user direction) ----
test('Case 6: Sticky Web counts as speed_lowering', () => {
  const k = makeTeam([{ moves:['Sticky Web'] }]);
  const r = computeCoverage(k);
  eq(r.speed_control.speed_lowering, true, 'sticky web');
  eq(r.speed_control.any, true, 'any');
});

// ---- Case 7: team-switch staleness — results must differ per team key, not cached ----
test('Case 7: no cache - different teams give different results', () => {
  const a = makeTeam([{ moves:['Fake Out'] }]);
  const rA = computeCoverage(a);
  mutateTeam('__test__', (t) => { t.members = [{ name:'Y', moves:['Agility'], ability:'' }]; });
  const rB = computeCoverage('__test__');
  eq(rA.fake_out, true, 'A fake_out');
  eq(rB.fake_out, false, 'B fake_out');
  eq(rB.speed_control.speed_boosting, true, 'B speed_boosting');
});

// ---- Extra: Intimidate must NOT count as speed_control (per spec) ----
test('Extra: Intimidate does NOT count as speed_control', () => {
  const k = makeTeam([{ ability:'Intimidate', moves:['Flare Blitz'] }]);
  const r = computeCoverage(k);
  eq(r.speed_control.abilities, false, 'abilities');
  eq(r.speed_control.any, false, 'any');
});

// ---- Extra: form-change staleness proxy: re-reading returns fresh values ----
test('Extra: mutation after compute -> recompute reflects it', () => {
  const k = makeTeam([{ moves:[] }]);
  const r1 = computeCoverage(k);
  eq(r1.speed_control.any, false, 'initial any');
  mutateTeam('__test__', (t) => { t.members[0].moves = ['Tailwind']; });
  const r2 = computeCoverage(k);
  eq(r2.speed_control.field_effects, true, 'after mutation field_effects');
  eq(r2.speed_control.any, true, 'after mutation any');
});

console.log(`\n=== Results: ${passes} passed, ${fails} failed ===`);
process.exit(fails === 0 ? 0 : 1);
