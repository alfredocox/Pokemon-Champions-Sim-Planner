// T9j.12 (Refs #74) Simulator-tab bring picker tests
//
// Coverage targets (~10 cases):
//   1. buildBringPickerHtml returns markup containing slots + pool + mode toggle
//   2. compact=true uses bring-pool-chip markup, compact=false uses bring-pool-row
//   3. Sim picker state shared with Teams state: setBringFor mutates what
//      buildBringPickerHtml reflects (single source of truth).
//   4. Mode toggle propagation: setBringMode('random') makes pool chips
//      draggable=false.
//   5. Doubles -> 4 slots; labels include LEAD 1, LEAD 2, BENCH 3, BENCH 4.
//   6. Singles -> 3 slots; labels include LEAD 1, BENCH 2, BENCH 3.
//   7. Empty/missing teamKey returns '' (no throw).
//   8. wireBringPickerElements attaches click listeners to mode toggle buttons.
//   9. renderSimBringPicker no-ops gracefully when container is absent
//      (document.getElementById returns null-equivalent / no TEAMS entry).
//  10. Bring pool chip position badge appears for in-bring members only.
//
// Citations:
//   https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   https://bulbapedia.bulbagarden.net/wiki/Lead_Pok%C3%A9mon
//   https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Match the t9j11 stub: every stub element supports the DOM surface ui.js
// touches at load time (innerHTML, classList, dataset, children, listeners).
function makeStubEl() {
  const el = {
    _children: [],
    _listeners: {},
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    dataset: {},
    classList: {
      _set: new Set(),
      add(c){ this._set.add(c); },
      remove(c){ this._set.delete(c); },
      toggle(c, on){ if (on === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else { on ? this._set.add(c) : this._set.delete(c); } },
      contains(c){ return this._set.has(c); }
    },
    className: '',
    files: null,
    options: [],
    selectedOptions: [],
    selectedIndex: 0,
    checked: false,
    disabled: false,
    hidden: false,
    appendChild(c){ this._children.push(c); return c; },
    removeChild(c){ const i = this._children.indexOf(c); if (i>=0) this._children.splice(i,1); return c; },
    addEventListener(ev, fn){ (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener(){},
    querySelector(){ return makeStubEl(); },
    querySelectorAll(){ return []; },
    getAttribute(){ return null; },
    setAttribute(){},
    click(){},
    focus(){}, blur(){},
    dispatchEvent(){}
  };
  return el;
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }),
  document: (function(){
    const d = {
      _els: {},
      getElementById(id) {
        if (!this._els[id]) this._els[id] = makeStubEl();
        return this._els[id];
      },
      querySelector(){ return makeStubEl(); },
      querySelectorAll(){ return []; },
      createElement(){ return makeStubEl(); },
      body: makeStubEl(),
      addEventListener(){}
    };
    d.documentElement = makeStubEl();
    return d;
  })(),
  localStorage: {
    _s: {},
    getItem(k){ return this._s[k] !== undefined ? this._s[k] : null; },
    setItem(k, v){ this._s[k] = String(v); },
    removeItem(k){ delete this._s[k]; },
    clear(){ this._s = {}; }
  },
  URL: { createObjectURL(){ return 'blob:stub'; }, revokeObjectURL(){} },
  Blob: function(parts){ this.parts = parts; },
  FileReader: function(){},
  alert: (m) => { ctx._lastAlert = m; },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  fetch: () => Promise.reject(new Error('no network in tests'))
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}

load('data.js');
load('engine.js');
load('ui.js');

// Expose top-level const/let bindings and function declarations we assert on.
vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.buildBringPickerHtml=buildBringPickerHtml;',
  'this.wireBringPickerElements=wireBringPickerElements;',
  'this.renderSimBringPicker=renderSimBringPicker;',
  'this.renderSimBringPickers=renderSimBringPickers;',
  'this.getBringFor=getBringFor;',
  'this.setBringFor=setBringFor;',
  'this.getBringMode=getBringMode;',
  'this.setBringMode=setBringMode;',
  'this.getBringCount=getBringCount;',
  'this.setCurrentFormat=function(f){ currentFormat = f; };'
].join(' '), ctx);

const {
  TEAMS,
  buildBringPickerHtml,
  wireBringPickerElements,
  renderSimBringPicker,
  renderSimBringPickers,
  getBringFor, setBringFor,
  getBringMode, setBringMode,
  getBringCount,
  setCurrentFormat
} = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function inc(hay, needle, msg='') { if (String(hay).indexOf(needle) < 0) throw new Error((msg||'') + ` expected to contain ${JSON.stringify(needle)}; got ${String(hay).slice(0,200)}`); }
function notInc(hay, needle, msg='') { if (String(hay).indexOf(needle) >= 0) throw new Error((msg||'') + ` expected NOT to contain ${JSON.stringify(needle)}`); }

// ---- Shared fixture: use preloaded `mega_altaria` (6 members).
const FIXTURE_KEY = 'mega_altaria';
truthy(TEAMS[FIXTURE_KEY], 'fixture team present');

// Reset bring state before each assertion-heavy test via setBringFor /
// setBringMode (the localStorage-backed T9j.10 helpers).
function resetBring(key) {
  setBringMode(key, 'manual');
  // Default bring = first N members of team, so set explicitly to keep tests deterministic.
  const members = TEAMS[key].members.slice(0, 4).map(m => m.name);
  setBringFor(key, members);
}

// ============================================================
// BUILDER
// ============================================================
console.log('\nbuildBringPickerHtml:');

T('1. returns HTML containing mode toggle + slots + pool', () => {
  setCurrentFormat('doubles');
  resetBring(FIXTURE_KEY);
  const html = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  truthy(html && typeof html === 'string', 'returns string');
  inc(html, 'bring-mode-row', 'mode toggle row');
  inc(html, 'bring-slots', 'slots container');
  inc(html, 'bring-pool', 'pool container');
  inc(html, 'data-team="' + FIXTURE_KEY + '"', 'data-team attr present');
});

T('2. compact=true emits bring-pool-chip (not bring-pool-row)', () => {
  setCurrentFormat('doubles');
  resetBring(FIXTURE_KEY);
  const compact = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  const full    = buildBringPickerHtml(FIXTURE_KEY, { compact: false });
  inc(compact, 'bring-pool-chip', 'compact has chips');
  inc(compact, 'bring-pool-compact', 'compact adds compact class');
  notInc(compact, 'bring-pool-row', 'compact lacks pool-row markup');
  inc(full, 'bring-pool-row', 'full has pool rows');
  notInc(full, 'bring-pool-chip', 'full lacks chip markup');
});

T('3. shared state: setBringFor is reflected in next buildBringPickerHtml call', () => {
  setCurrentFormat('doubles');
  const all = TEAMS[FIXTURE_KEY].members.map(m => m.name);
  // Rotate selection: last 4 in reverse.
  const picked = all.slice(2, 6).reverse();
  setBringFor(FIXTURE_KEY, picked);
  const html = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  // Each picked member should be marked in-bring; others out.
  for (const name of picked) {
    inc(html, 'data-mon="' + name + '"', 'picked mon in html');
  }
  inc(html, 'bring-in', 'at least one in-bring class');
});

T('4. mode=random disables drag (draggable="false") on pool and slots', () => {
  setCurrentFormat('doubles');
  resetBring(FIXTURE_KEY);
  setBringMode(FIXTURE_KEY, 'random');
  const html = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  // In random mode, pool chips are not draggable.
  inc(html, 'draggable="false"', 'random locks drag');
  // Mode toggle: random button is active class.
  inc(html, 'data-mode="random"', 'random mode button rendered');
  // Reset to manual.
  setBringMode(FIXTURE_KEY, 'manual');
  const html2 = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  inc(html2, 'draggable="true"', 'manual mode allows drag');
});

T('5. doubles format: 4 slots (LEAD 1, LEAD 2, BENCH 3, BENCH 4)', () => {
  setCurrentFormat('doubles');
  resetBring(FIXTURE_KEY);
  const html = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  inc(html, 'LEAD 1', 'lead 1');
  inc(html, 'LEAD 2', 'lead 2');
  inc(html, 'BENCH 3', 'bench 3');
  inc(html, 'BENCH 4', 'bench 4');
  eq(getBringCount(), 4, 'count is 4 in doubles');
});

T('6. singles format: 3 slots (LEAD 1, BENCH 2, BENCH 3)', () => {
  setCurrentFormat('singles');
  setBringFor(FIXTURE_KEY, TEAMS[FIXTURE_KEY].members.slice(0, 3).map(m => m.name));
  const html = buildBringPickerHtml(FIXTURE_KEY, { compact: true });
  inc(html, 'LEAD 1', 'lead 1');
  inc(html, 'BENCH 2', 'bench 2');
  inc(html, 'BENCH 3', 'bench 3');
  notInc(html, 'BENCH 4', 'no bench 4 in singles');
  eq(getBringCount(), 3, 'count is 3 in singles');
  // Restore for other tests.
  setCurrentFormat('doubles');
});

T('7. empty / unknown teamKey returns empty string without throwing', () => {
  const html1 = buildBringPickerHtml('', { compact: true });
  eq(html1, '', 'empty key => empty');
  const html2 = buildBringPickerHtml('__nope__', { compact: false });
  eq(html2, '', 'unknown key => empty');
});

// ============================================================
// WIRING
// ============================================================
console.log('\nwireBringPickerElements:');

T('8. wireBringPickerElements attaches click listeners to mode buttons', () => {
  // Build a fake root with one mode button; the wirer must register click.
  const btn = makeStubEl();
  btn.dataset = { team: FIXTURE_KEY, mode: 'random' };
  const poolRow = makeStubEl();
  poolRow.dataset = { team: FIXTURE_KEY, mon: TEAMS[FIXTURE_KEY].members[0].name };
  const slot = makeStubEl();
  slot.dataset = { team: FIXTURE_KEY, slot: '0' };
  const root = makeStubEl();
  root.querySelectorAll = function(sel) {
    if (sel === '.bring-mode-btn') return [btn];
    if (sel === '.bring-pool-row, .bring-pool-chip') return [poolRow];
    if (sel === '.bring-slot') return [slot];
    return [];
  };
  let changed = 0;
  wireBringPickerElements(root, () => { changed++; });
  truthy(btn._listeners.click && btn._listeners.click.length > 0, 'mode btn click listener attached');
  truthy(poolRow._listeners.click && poolRow._listeners.click.length > 0, 'pool row click listener attached');
  truthy(slot._listeners.click && slot._listeners.click.length > 0, 'slot click listener attached');
  // Fire the mode button click -> should set mode=random and invoke onChange.
  setBringMode(FIXTURE_KEY, 'manual');
  btn._listeners.click[0]();
  eq(getBringMode(FIXTURE_KEY), 'random', 'mode toggled to random via wired click');
  eq(changed, 1, 'onChange fired once');
  // Restore manual for subsequent tests.
  setBringMode(FIXTURE_KEY, 'manual');
});

// ============================================================
// SIM RENDER
// ============================================================
console.log('\nrenderSimBringPicker / renderSimBringPickers:');

T('9. renderSimBringPicker writes markup into the container element', () => {
  setCurrentFormat('doubles');
  resetBring(FIXTURE_KEY);
  const cid = 'player-bring-picker';
  // Reset the stub container innerHTML.
  ctx.document._els[cid] = makeStubEl();
  renderSimBringPicker(cid, FIXTURE_KEY);
  const el = ctx.document._els[cid];
  inc(el.innerHTML, 'sim-bring-header', 'header rendered');
  inc(el.innerHTML, 'bring-mode-row', 'mode toggle rendered');
  inc(el.innerHTML, 'bring-pool-chip', 'compact chips rendered');
});

T('10. renderSimBringPicker clears markup for an unknown teamKey', () => {
  const cid = 'opp-bring-picker';
  ctx.document._els[cid] = makeStubEl();
  ctx.document._els[cid].innerHTML = '<span>STALE</span>';
  renderSimBringPicker(cid, '__missing_team__');
  eq(ctx.document._els[cid].innerHTML, '', 'innerHTML cleared for unknown key');
});

T('11. renderSimBringPickers renders BOTH player and opponent containers', () => {
  setCurrentFormat('doubles');
  resetBring('player');
  resetBring(FIXTURE_KEY);
  // Set up an opponent-select stub with a valid value.
  const oppSel = makeStubEl();
  oppSel.value = FIXTURE_KEY;
  ctx.document._els['opponent-select'] = oppSel;
  ctx.document._els['player-bring-picker'] = makeStubEl();
  ctx.document._els['opp-bring-picker']    = makeStubEl();
  renderSimBringPickers();
  inc(ctx.document._els['player-bring-picker'].innerHTML, 'sim-bring-header', 'player side rendered');
  inc(ctx.document._els['opp-bring-picker'].innerHTML,    'sim-bring-header', 'opp side rendered');
});

// ============================================================
// RESULTS
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`T9j.12 Results: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
