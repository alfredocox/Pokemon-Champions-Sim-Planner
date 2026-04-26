// ui_storage_integration_tests.js — Issue #79 follow-up
// Verifies the 7 ui.js call sites correctly route through Storage.*
// instead of raw localStorage. Three roundtrip suites:
//   1. Custom teams      (teams:custom)
//   2. Preloaded overrides (overrides:preloaded) — save + clear roundtrip
//   3. Bring state       (bring:default)         — save + load roundtrip
//
// Node.js vm sandbox — same harness as t9j10_tests.js.
// In-memory Storage fallback: no real localStorage required (CI-safe).
//
// Refs: Issue #79  |  storage_adapter.js  |  ui.js

const fs   = require('fs');
const vm   = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// ── Sandbox context ──────────────────────────────────────────────────────────
const ctx = {
  console, require, module:{}, exports:{}, Math, Object, Array, Set, JSON,
  Promise, setTimeout,
  window: {},
  document: {
    getElementById:   () => null,
    querySelectorAll: () => [],
    createElement:    () => ({ style:{}, classList:{add:()=>{},remove:()=>{}},
                               addEventListener:()=>{} }),
    addEventListener: () => {},
    body: { innerHTML:'', appendChild:()=>{} },
    head: { appendChild:()=>{} },
  },
  navigator: { serviceWorker: null },
  localStorage: {
    _s: {},
    getItem(k)   { return Object.prototype.hasOwnProperty.call(this._s,k)?this._s[k]:null; },
    setItem(k,v) { this._s[k] = String(v); },
    removeItem(k){ delete this._s[k]; },
    clear()      { this._s = {}; },
  },
};
ctx.window.matchMedia   = () => ({ matches: false, addEventListener: ()=>{} });
ctx.window.localStorage = ctx.localStorage;
vm.createContext(ctx);

function load(rel) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
}
load('storage_adapter.js');
load('data.js');
load('engine.js');
load('ui.js');

// ── Harness ──────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function T(name, fn) {
  try   { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a,b,msg='') {
  if (a!==b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function truthy(v,msg='') { if (!v) throw new Error(msg||'expected truthy'); }
function falsy(v,msg='')  { if (v)  throw new Error(msg||'expected falsy'); }
function isObj(v,msg='')  {
  if (typeof v!=='object'||!v) throw new Error(msg||'expected object, got '+typeof v);
}
const { Storage } = ctx;

function clearAll() {
  ctx.localStorage.clear();
  Storage.set('teams:custom',        null);
  Storage.set('overrides:preloaded', null);
  Storage.set('bring:default',       null);
}

// ── Suite 1: Custom Teams ────────────────────────────────────────────────────
console.log('\n── Suite 1: Custom Teams (teams:custom) ──────────────────────');

T('saveCustomTeamsToStorage() writes to Storage.get("teams:custom")', () => {
  clearAll();
  ctx.TEAMS['__tc__'] = {
    name:'Test Custom', source:'custom', format:'doubles',
    members:[{ name:'Pikachu', item:'Light Ball',
               moves:['Thunderbolt','Quick Attack','Volt Tackle','Iron Tail'],
               ability:'Static', nature:'Timid', evs:{SpA:252,Spe:252,HP:4} }]
  };
  vm.runInContext('saveCustomTeamsToStorage();', ctx);
  const stored = Storage.get('teams:custom');
  isObj(stored,  'Storage.get("teams:custom") must return object');
  truthy(stored.teams,           'stored.teams must exist');
  truthy(stored.teams['__tc__'], 'custom team key must be present');
  eq(stored.teams['__tc__'].name, 'Test Custom', 'name must round-trip');
  delete ctx.TEAMS['__tc__'];
});

T('loadCustomTeamsFromStorage() restores team from Storage', () => {
  clearAll();
  Storage.set('teams:custom', {
    version: 1, saved_at: new Date().toISOString(),
    teams: {
      '__tr__': {
        name:'Restored Team', source:'custom', format:'doubles',
        members:[{ name:'Snorlax', item:'Leftovers',
                   moves:['Body Slam','Rest','Curse','Earthquake'],
                   ability:'Thick Fat', nature:'Adamant', evs:{HP:252,Atk:252,Def:4} }]
      }
    }
  });
  delete ctx.TEAMS['__tr__'];
  vm.runInContext('loadCustomTeamsFromStorage();', ctx);
  truthy(ctx.TEAMS['__tr__'], 'team must be restored into TEAMS');
  eq(ctx.TEAMS['__tr__'].name, 'Restored Team', 'name must match');
  delete ctx.TEAMS['__tr__'];
});

T('saveCustomTeamsToStorage() never writes preloaded teams', () => {
  clearAll();
  vm.runInContext('saveCustomTeamsToStorage();', ctx);
  const stored = Storage.get('teams:custom');
  if (!stored || !stored.teams) return;
  for (const k of Object.keys(stored.teams)) {
    const src = stored.teams[k] && stored.teams[k].source;
    if (src !== 'custom')
      throw new Error(`Non-custom team '${k}' (source=${src}) written to storage`);
  }
});

// ── Suite 2: Preloaded Overrides ─────────────────────────────────────────────
console.log('\n── Suite 2: Preloaded Overrides (overrides:preloaded) ────────');

T('savePreloadedOverride() writes override into Storage', () => {
  clearAll();
  vm.runInContext("savePreloadedOverride('player');", ctx);
  const stored = Storage.get('overrides:preloaded');
  isObj(stored,                   'Storage.get("overrides:preloaded") must return object');
  truthy(stored.overrides,        'stored.overrides must exist');
  truthy(stored.overrides.player, 'overrides.player must be set');
  truthy(stored.overrides.player.members, 'override.members must be present');
});

T('clearPreloadedOverride() removes override from Storage', () => {
  clearAll();
  vm.runInContext("savePreloadedOverride('player');", ctx);
  truthy(Storage.get('overrides:preloaded')?.overrides?.player,
         'override must exist before clear');
  vm.runInContext("clearPreloadedOverride('player');", ctx);
  falsy(Storage.get('overrides:preloaded')?.overrides?.player,
        'override must be gone after clear');
});

T('loadPreloadedOverridesFromStorage() applies stored override to TEAMS', () => {
  clearAll();
  const orig    = ctx.TEAMS.player.members.slice();
  const origSrc = ctx.TEAMS.player.source;
  const fakeMon = { name:'FakeMon', item:'Berry', moves:['Splash'],
                    ability:'None', nature:'Hardy', evs:{} };
  Storage.set('overrides:preloaded', {
    version:1,
    overrides:{ player:{ members:[fakeMon], saved_at:new Date().toISOString() } },
    saved_at:new Date().toISOString()
  });
  ctx.TEAMS.player.source = 'preloaded';
  delete ctx.TEAMS.player._hasOverride;
  vm.runInContext('loadPreloadedOverridesFromStorage();', ctx);
  eq(ctx.TEAMS.player.members[0].name, 'FakeMon', 'override member must be applied');
  truthy(ctx.TEAMS.player._hasOverride, '_hasOverride flag must be set');
  ctx.TEAMS.player.members = orig;
  ctx.TEAMS.player.source  = origSrc;
  delete ctx.TEAMS.player._hasOverride;
});

// ── Suite 3: Bring State ──────────────────────────────────────────────────────
console.log('\n── Suite 3: Bring State (bring:default) ──────────────────────');

T('_saveBringState() writes BRING_SELECTION + BRING_MODE to Storage', () => {
  clearAll();
  vm.runInContext(`
    BRING_SELECTION = { player: ['Incineroar','Arcanine'] };
    BRING_MODE      = { player: 'manual' };
    _saveBringState();
  `, ctx);
  const stored = Storage.get('bring:default');
  isObj(stored,            'Storage.get("bring:default") must return object');
  isObj(stored.selection,  'stored.selection must be an object');
  truthy(stored.selection.player, 'player selection must be stored');
  eq(stored.mode.player, 'manual', 'player mode must be stored');
});

T('_loadBringState() restores BRING_SELECTION and BRING_MODE', () => {
  clearAll();
  Storage.set('bring:default', {
    selection: { player: ['Garchomp','Whimsicott'] },
    mode:      { player: 'random' }
  });
  vm.runInContext(`BRING_SELECTION={}; BRING_MODE={}; _loadBringState();`, ctx);
  const sel  = vm.runInContext('BRING_SELECTION', ctx);
  const mode = vm.runInContext('BRING_MODE', ctx);
  truthy(sel.player,             'BRING_SELECTION.player must be restored');
  eq(sel.player[0], 'Garchomp',  'first mon must match');
  eq(mode.player,   'random',    'mode must be restored');
});

T('_loadBringState() is a no-op when Storage is empty', () => {
  clearAll();
  vm.runInContext(`BRING_SELECTION={}; BRING_MODE={}; _loadBringState();`, ctx);
  eq(Object.keys(vm.runInContext('BRING_SELECTION', ctx)).length, 0,
     'BRING_SELECTION must stay empty');
});

T('bring state full roundtrip — save → clear → load restores identical state', () => {
  clearAll();
  vm.runInContext(`
    BRING_SELECTION = { chuppa_balance:['Kingambit','Sneasler','Incineroar','Arcanine'] };
    BRING_MODE      = { chuppa_balance:'manual', player:'random' };
    _saveBringState();
    BRING_SELECTION = {};
    BRING_MODE      = {};
    _loadBringState();
  `, ctx);
  const sel  = vm.runInContext('BRING_SELECTION', ctx);
  const mode = vm.runInContext('BRING_MODE', ctx);
  eq(sel.chuppa_balance.length, 4,        '4 mons must round-trip');
  eq(sel.chuppa_balance[1],    'Sneasler', 'Sneasler must be at index 1');
  eq(mode.chuppa_balance,      'manual',   'chuppa mode must round-trip');
  eq(mode.player,              'random',   'player mode must round-trip');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(57)}`);
console.log(`ui_storage_integration_tests: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
