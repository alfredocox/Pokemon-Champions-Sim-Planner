// T9j.11 (Refs #73) Custom teams filter + bulk import/export tests
//
// Coverage targets (16 cases):
//   Persistence (2):   localStorage round-trip; schema version guard.
//   Filter chips (4):  All/Preloaded/Custom/Tournament/Mega; counts; active
//                      state; empty-filter safety.
//   Export (3):        JSON schema matches T9f; Showdown multi-team format
//                      uses `=== [name] ===` markers; CRLF-safe.
//   Import (4):        JSON round-trip parity; Showdown multi-team parser
//                      with markers; parser with blank-line separator; parser
//                      with Windows CRLF endings.
//   Collision (2):     name collision gets `(2)` suffix; key collision yields
//                      unique custom_ key.
//   Misc (1):          empty file yields 0-team result without error.
//
// Citations:
//   https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Showdown
//   https://www.smogon.com/forums/threads/3587177/
//   https://developer.mozilla.org/en-US/docs/Web/API/File_API
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Fake DOM: every getElementById returns a stub element with the APIs ui.js
// touches at load time (innerHTML, appendChild, addEventListener, style,
// classList, querySelectorAll, dataset, children). This lets us load ui.js
// end-to-end without a real browser.
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
      add(){}, remove(){}, toggle(){}, contains(){ return false; }
    },
    className: '',
    files: null,
    options: [],
    selectedIndex: 0,
    checked: false,
    disabled: false,
    appendChild(c) { this._children.push(c); return c; },
    removeChild(c) {
      const i = this._children.indexOf(c); if (i>=0) this._children.splice(i,1);
      return c;
    },
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return makeStubEl(); },
    querySelectorAll() { return []; },
    getAttribute() { return null; },
    setAttribute() {},
    click() {},
    focus() {}, blur() {},
    dispatchEvent() {}
  };
  return el;
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  window: { matchMedia: () => ({ matches: false }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }),
  document: (function(){
    const d = {
      _els: {},
      getElementById(id) {
        if (!this._els[id]) this._els[id] = makeStubEl();
        return this._els[id];
      },
      querySelector() { return makeStubEl(); },
      querySelectorAll() { return []; },
      createElement() { return makeStubEl(); },
      body: makeStubEl(),
      addEventListener() {}
    };
    d.documentElement = makeStubEl();
    return d;
  })(),
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] !== undefined ? this._s[k] : null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; }
  },
  URL: { createObjectURL() { return 'blob:stub'; }, revokeObjectURL() {} },
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

// Load engine/data first (so TEAMS, BASE_STATS exist) then ui.
load('data.js');
load('engine.js');
load('ui.js');
// Expose ctx-scoped const/let bindings on the context object (vm.createContext
// does NOT auto-attach top-level const/let to the context, only var). This
// mirrors the approach used in tests/t9j10_tests.js.
vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.parseMultiTeamShowdown=parseMultiTeamShowdown;',
  'this.importCustomTeamsBulk=importCustomTeamsBulk;',
  'this.importFromJsonText=importFromJsonText;',
  'this.exportAllCustomAsJson=exportAllCustomAsJson;',
  'this.exportAllCustomAsShowdown=exportAllCustomAsShowdown;',
  'this.teamMatchesFilter=teamMatchesFilter;',
  'this.countTeamsByFilter=countTeamsByFilter;',
  'this.saveCustomTeamsToStorage=saveCustomTeamsToStorage;',
  'this.loadCustomTeamsFromStorage=loadCustomTeamsFromStorage;',
  'this.parseShowdownPaste=parseShowdownPaste;'
].join(' '), ctx);

const {
  parseMultiTeamShowdown,
  importCustomTeamsBulk,
  importFromJsonText,
  exportAllCustomAsJson,
  exportAllCustomAsShowdown,
  teamMatchesFilter,
  countTeamsByFilter,
  saveCustomTeamsToStorage,
  loadCustomTeamsFromStorage,
  CUSTOM_TEAMS_STORAGE_KEY,
  CUSTOM_TEAMS_SCHEMA_VERSION,
  TEAMS,
  parseShowdownPaste
} = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function deepInc(hay, needle, msg='') { if (String(hay).indexOf(needle) < 0) throw new Error(msg + ` expected to contain ${JSON.stringify(needle)}`); }

// Helper: build a minimal custom team shape matching T9f contract.
function mkTeam(name, monNames) {
  return {
    name: name,
    label: 'CUSTOM',
    style: 'custom',
    description: '',
    source: 'custom',
    format: 'champions',
    legality_status: 'unverified',
    members: monNames.map(n => ({
      name: n, item: '', ability: '', level: 50, nature: 'Hardy',
      moves: ['Tackle','Protect','Substitute','Rest'],
      evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }
    }))
  };
}

// Snapshot of the preloaded TEAMS keys so we can restore between tests.
const PRELOADED_KEYS = Object.keys(TEAMS).filter(k => TEAMS[k].source !== 'custom');

function resetTeams() {
  for (const k of Object.keys(TEAMS)) {
    if (TEAMS[k] && TEAMS[k].source === 'custom') delete TEAMS[k];
  }
  ctx.localStorage.clear();
}

// ============================================================
// PERSISTENCE
// ============================================================
console.log('\nPersistence (T9j.11 Refs #73):');

T('1. saveCustomTeamsToStorage + loadCustomTeamsFromStorage round-trip', () => {
  resetTeams();
  TEAMS.custom_rt1 = mkTeam('Round Trip', ['Garchomp','Rotom-Wash','Incineroar','Whimsicott','Arcanine','Dragonite']);
  saveCustomTeamsToStorage();
  // Wipe in-memory and reload from storage.
  delete TEAMS.custom_rt1;
  const count = loadCustomTeamsFromStorage();
  eq(count, 1, 'loaded 1 team');
  truthy(TEAMS.custom_rt1, 'custom_rt1 restored');
  eq(TEAMS.custom_rt1.name, 'Round Trip');
  eq(TEAMS.custom_rt1.members.length, 6);
});

T('2. schema version mismatch is rejected (no silent mis-import)', () => {
  resetTeams();
  ctx.localStorage.setItem(CUSTOM_TEAMS_STORAGE_KEY, JSON.stringify({
    version: 999, saved_at: new Date().toISOString(),
    teams: { custom_fake: mkTeam('Fake', ['Pikachu']) }
  }));
  const count = loadCustomTeamsFromStorage();
  eq(count, 0, 'rejected unknown schema version');
  truthy(!TEAMS.custom_fake, 'custom_fake not loaded');
});

// ============================================================
// FILTER CHIPS
// ============================================================
console.log('\nFilter chips:');

T('3. teamMatchesFilter: all / preloaded / custom', () => {
  resetTeams();
  TEAMS.custom_f1 = mkTeam('F1', ['Pikachu']);
  truthy(teamMatchesFilter('custom_f1', TEAMS.custom_f1, 'all'));
  truthy(teamMatchesFilter('custom_f1', TEAMS.custom_f1, 'custom'));
  truthy(!teamMatchesFilter('custom_f1', TEAMS.custom_f1, 'preloaded'));
  truthy(teamMatchesFilter('mega_altaria', TEAMS.mega_altaria, 'preloaded'));
  truthy(!teamMatchesFilter('mega_altaria', TEAMS.mega_altaria, 'custom'));
});

T('4. teamMatchesFilter: mega subset is keys starting with mega_', () => {
  truthy(teamMatchesFilter('mega_altaria', TEAMS.mega_altaria, 'mega'));
  truthy(teamMatchesFilter('mega_dragonite', TEAMS.mega_dragonite, 'mega'));
  truthy(!teamMatchesFilter('player', TEAMS.player, 'mega'));
});

T('5. teamMatchesFilter: tournament hits known tournament keys', () => {
  truthy(teamMatchesFilter('champions_arena_1st', TEAMS.champions_arena_1st, 'tournament'));
  truthy(teamMatchesFilter('chuppa_balance', TEAMS.chuppa_balance, 'tournament'));
  truthy(!teamMatchesFilter('mega_altaria', TEAMS.mega_altaria, 'tournament'), 'mega is not a tournament team');
});

T('6. countTeamsByFilter: custom count tracks inserts/deletes', () => {
  resetTeams();
  eq(countTeamsByFilter('custom'), 0);
  TEAMS.custom_c1 = mkTeam('C1', ['Pikachu']);
  TEAMS.custom_c2 = mkTeam('C2', ['Pikachu']);
  eq(countTeamsByFilter('custom'), 2);
  delete TEAMS.custom_c2;
  eq(countTeamsByFilter('custom'), 1);
});

// ============================================================
// EXPORT
// ============================================================
console.log('\nExport:');

T('7. exportAllCustomAsJson produces the T9f schema', () => {
  resetTeams();
  TEAMS.custom_e1 = mkTeam('Export One', ['Garchomp','Rotom-Wash']);
  const json = exportAllCustomAsJson();
  const parsed = JSON.parse(json);
  eq(parsed.version, CUSTOM_TEAMS_SCHEMA_VERSION);
  truthy(parsed.saved_at, 'saved_at present');
  truthy(parsed.teams && parsed.teams.custom_e1, 'custom_e1 present');
  eq(parsed.teams.custom_e1.name, 'Export One');
});

T('8. exportAllCustomAsJson excludes preloaded teams', () => {
  resetTeams();
  TEAMS.custom_e2 = mkTeam('Only Me', ['Pikachu']);
  const parsed = JSON.parse(exportAllCustomAsJson());
  eq(Object.keys(parsed.teams).length, 1, 'only custom exported');
  truthy(!parsed.teams.mega_altaria, 'preloaded not exported');
});

T('9. exportAllCustomAsShowdown uses `=== [name] ===` markers and round-trips', () => {
  resetTeams();
  TEAMS.custom_sd1 = mkTeam('Alpha', ['Garchomp','Rotom-Wash']);
  TEAMS.custom_sd2 = mkTeam('Beta',  ['Incineroar','Arcanine']);
  const text = exportAllCustomAsShowdown();
  deepInc(text, '=== [Alpha] ===', 'Alpha marker present');
  deepInc(text, '=== [Beta] ===',  'Beta marker present');
  const parsed = parseMultiTeamShowdown(text);
  eq(parsed.length, 2, 'parsed back to 2 teams');
  eq(parsed[0].name, 'Alpha');
  eq(parsed[1].name, 'Beta');
});

// ============================================================
// IMPORT
// ============================================================
console.log('\nImport:');

T('10. importFromJsonText round-trips a prior JSON export (parity)', () => {
  resetTeams();
  TEAMS.custom_rt = mkTeam('RT', ['Garchomp','Rotom-Wash','Incineroar']);
  const json = exportAllCustomAsJson();
  resetTeams();
  const res = importFromJsonText(json);
  eq(res.added, 1);
  // Key name is regenerated but the team content survives; find it.
  const key = Object.keys(TEAMS).find(k => TEAMS[k].source === 'custom');
  truthy(key, 'custom team present');
  eq(TEAMS[key].name, 'RT');
  eq(TEAMS[key].members.length, 3);
});

T('11. parseMultiTeamShowdown: markers form', () => {
  const text = [
    '=== [Team One] ===',
    'Garchomp @ Life Orb',
    'Ability: Rough Skin',
    'Level: 50',
    '- Earthquake',
    '',
    '=== [Team Two] ===',
    'Incineroar @ Sitrus Berry',
    'Ability: Intimidate',
    'Level: 50',
    '- Fake Out'
  ].join('\n');
  const teams = parseMultiTeamShowdown(text);
  eq(teams.length, 2);
  eq(teams[0].name, 'Team One');
  eq(teams[0].members[0].name, 'Garchomp');
  eq(teams[1].name, 'Team Two');
  eq(teams[1].members[0].name, 'Incineroar');
});

T('12. parseMultiTeamShowdown: double-blank-line separator fallback', () => {
  const text = [
    'Garchomp @ Life Orb',
    'Ability: Rough Skin',
    'Level: 50',
    '- Earthquake',
    '',
    '',
    '',
    'Incineroar @ Sitrus Berry',
    'Ability: Intimidate',
    'Level: 50',
    '- Fake Out'
  ].join('\n');
  const teams = parseMultiTeamShowdown(text);
  eq(teams.length, 2, 'two teams split on triple blank line run');
  eq(teams[0].members[0].name, 'Garchomp');
  eq(teams[1].members[0].name, 'Incineroar');
});

T('13. parseMultiTeamShowdown: Windows CRLF line endings are normalized', () => {
  const text = [
    '=== [W1] ===',
    'Garchomp @ Life Orb',
    'Ability: Rough Skin',
    'Level: 50',
    '- Earthquake',
    '',
    '=== [W2] ===',
    'Incineroar @ Sitrus Berry',
    'Ability: Intimidate',
    'Level: 50',
    '- Fake Out'
  ].join('\r\n'); // Windows endings
  const teams = parseMultiTeamShowdown(text);
  eq(teams.length, 2, 'CRLF normalized ok');
  eq(teams[0].members[0].name, 'Garchomp');
});

// ============================================================
// COLLISION HANDLING
// ============================================================
console.log('\nCollision handling:');

T('14. duplicate team name gets `(2)` suffix on bulk import', () => {
  resetTeams();
  TEAMS.custom_dup_a = mkTeam('Collider', ['Pikachu']);
  const res = importCustomTeamsBulk([
    { name: 'Collider', members: mkTeam('Collider', ['Garchomp']).members }
  ]);
  eq(res.added, 1);
  // The newly added team should have name "Collider (2)"
  const newKey = res.keys[0];
  eq(TEAMS[newKey].name, 'Collider (2)');
});

T('15. two bulk imports in the same ms yield distinct keys (no clobber)', () => {
  resetTeams();
  const res = importCustomTeamsBulk([
    { name: 'A', members: mkTeam('A', ['Pikachu']).members },
    { name: 'B', members: mkTeam('B', ['Garchomp']).members },
    { name: 'C', members: mkTeam('C', ['Incineroar']).members }
  ]);
  eq(res.added, 3);
  const keys = res.keys;
  eq(new Set(keys).size, 3, 'all keys distinct');
  for (const k of keys) truthy(TEAMS[k], 'team exists at key');
});

// ============================================================
// MISC
// ============================================================
console.log('\nMisc:');

T('16. parseMultiTeamShowdown: empty input yields []', () => {
  eq(parseMultiTeamShowdown('').length, 0);
  eq(parseMultiTeamShowdown('   \n\n\n  ').length, 0);
});

// ============================================================
// RESULTS
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`T9j.11 Results: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
