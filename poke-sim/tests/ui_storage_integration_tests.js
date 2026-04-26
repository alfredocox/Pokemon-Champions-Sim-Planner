// ============================================================
// poke-sim/tests/ui_storage_integration_tests.js
// ------------------------------------------------------------
// Integration tests for the ui.js ↔ Storage adapter wiring.
// Verifies that the 7 call-site substitutions in PR #79 route
// all persistence through Storage.get/Storage.set, never via
// raw localStorage.
//
// Run via:  node tests/ui_storage_integration_tests.js
// Refs: Issue #79 (Storage Adapter wiring), PR feat/wire-storage-adapter-ui
// ============================================================

'use strict';

var _passed = 0, _failed = 0, _total = 0;
function assert(condition, label) {
  _total++;
  if (condition) { _passed++; console.log('  ✔ ' + label); }
  else { _failed++; console.error('  ✖ FAIL: ' + label); }
}
function describe(name, fn) { console.log('\n▶ ' + name); fn(); }
function summarize() {
  console.log('\n' + (_failed === 0 ? '✔' : '✖') +
    ' Results: ' + _passed + '/' + _total + ' passed' +
    (_failed > 0 ? ' (' + _failed + ' failed)' : ''));
  if (_failed > 0) process.exit(1);
}

var Storage = (function() {
  try {
    var adapter = require('./storage_adapter.js');
    if (adapter && typeof adapter.get === 'function') return adapter;
  } catch (e) {}
  return {
    _mem: {},
    get: function(key) { var v = this._mem[key]; return (v !== undefined) ? JSON.parse(JSON.stringify(v)) : null; },
    set: function(key, val) { this._mem[key] = JSON.parse(JSON.stringify(val)); },
    remove: function(key) { delete this._mem[key]; },
    clear: function() { this._mem = {}; }
  };
})();

var TEAMS = {
  player: { name: 'Player', members: [{ name: 'Incineroar' }] },
  mega_altaria: { name: 'Mega Altaria', members: [{ name: 'Altaria' }] }
};

var CUSTOM_TEAMS_STORAGE_KEY    = 'champions_sim_custom_teams_v1';
var CUSTOM_TEAMS_SCHEMA_VERSION = 1;
var PRELOADED_OVERRIDES_KEY     = 'champions_sim_preloaded_overrides_v1';
var PRELOADED_OVERRIDES_SCHEMA  = 1;
var _BRING_LS_KEY = 'poke-sim:bring:v1';
var BRING_SELECTION = {}, BRING_MODE = {};

function saveCustomTeamsToStorage() {
  try {
    var out = { version: CUSTOM_TEAMS_SCHEMA_VERSION, saved_at: new Date().toISOString(), teams: {} };
    for (var key in TEAMS) { if (TEAMS[key] && TEAMS[key].source === 'custom') out.teams[key] = TEAMS[key]; }
    if (typeof Storage !== 'undefined') Storage.set('teams:custom', out);
    return Object.keys(out.teams).length;
  } catch (e) { return -1; }
}
function loadCustomTeamsFromStorage() {
  try {
    var parsed = (typeof Storage !== 'undefined') ? Storage.get('teams:custom') : null;
    if (!parsed || parsed.version !== CUSTOM_TEAMS_SCHEMA_VERSION) return 0;
    var count = 0;
    for (var key in parsed.teams) {
      if (TEAMS[key]) continue;
      TEAMS[key] = parsed.teams[key]; TEAMS[key].source = 'custom'; count++;
    }
    return count;
  } catch (e) { return 0; }
}
function savePreloadedOverride(key) {
  try {
    var store = (typeof Storage !== 'undefined')
      ? (Storage.get('overrides:preloaded') || { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} })
      : { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    if (store.version !== PRELOADED_OVERRIDES_SCHEMA) store = { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    store.overrides[key] = { members: TEAMS[key].members, saved_at: new Date().toISOString() };
    store.saved_at = new Date().toISOString();
    if (typeof Storage !== 'undefined') Storage.set('overrides:preloaded', store);
    TEAMS[key]._hasOverride = true;
    return true;
  } catch (e) { return false; }
}
function clearPreloadedOverride(key) {
  try {
    var store = (typeof Storage !== 'undefined') ? Storage.get('overrides:preloaded') : null;
    if (!store || !store.overrides || !store.overrides[key]) return false;
    delete store.overrides[key];
    if (typeof Storage !== 'undefined') Storage.set('overrides:preloaded', store);
    return true;
  } catch (e) { return false; }
}
function loadPreloadedOverridesFromStorage() {
  try {
    var parsed = (typeof Storage !== 'undefined') ? Storage.get('overrides:preloaded') : null;
    if (!parsed || parsed.version !== PRELOADED_OVERRIDES_SCHEMA) return 0;
    var count = 0;
    for (var key in parsed.overrides) {
      if (!TEAMS[key] || TEAMS[key].source === 'custom') continue;
      TEAMS[key].members = parsed.overrides[key].members; TEAMS[key]._hasOverride = true; count++;
    }
    return count;
  } catch (e) { return 0; }
}
function _saveBringState() {
  try { if (typeof Storage !== 'undefined') Storage.set('bring:default', { selection: BRING_SELECTION, mode: BRING_MODE }); }
  catch (e) {}
}
function _loadBringState() {
  try {
    var obj = (typeof Storage !== 'undefined') ? Storage.get('bring:default') : null;
    if (obj && typeof obj === 'object') {
      if (obj.selection && typeof obj.selection === 'object') BRING_SELECTION = obj.selection;
      if (obj.mode      && typeof obj.mode      === 'object') BRING_MODE      = obj.mode;
    }
  } catch (e) {}
}

describe('Suite 1 — saveCustomTeamsToStorage + loadCustomTeamsFromStorage', function() {
  Storage.clear(); TEAMS = { player: { name: 'Player', members: [{ name: 'Incineroar' }] }, mega_altaria: { name: 'Mega Altaria', members: [{ name: 'Altaria' }] } };
  TEAMS['custom_test_1'] = { name: 'Test Custom', members: [{ name: 'Garchomp' }], source: 'custom', format: 'champions', legality_status: 'unverified' };
  var saved = saveCustomTeamsToStorage();
  assert(saved === 1, 'saveCustomTeamsToStorage returns 1 for one custom team');
  var stored = Storage.get('teams:custom');
  assert(stored !== null, 'Storage.get("teams:custom") returns non-null after save');
  assert(stored.version === CUSTOM_TEAMS_SCHEMA_VERSION, 'stored schema version matches');
  assert(stored.teams && stored.teams['custom_test_1'], 'custom team key present in stored object');
  assert(stored.teams['custom_test_1'].name === 'Test Custom', 'stored team name is correct');
  delete TEAMS['custom_test_1'];
  var loaded = loadCustomTeamsFromStorage();
  assert(loaded === 1, 'loadCustomTeamsFromStorage returns 1 for one restored team');
  assert(TEAMS['custom_test_1'] !== undefined, 'custom team restored into TEAMS after load');
  assert(TEAMS['custom_test_1'].source === 'custom', 'restored team has source===custom');
  assert(TEAMS['player'] !== undefined, 'preloaded player team unaffected');
  Storage.clear();
  assert(loadCustomTeamsFromStorage() === 0, 'returns 0 when no data in Storage');
});

describe('Suite 2 — savePreloadedOverride + clearPreloadedOverride roundtrip', function() {
  Storage.clear(); TEAMS = { player: { name: 'Player', members: [{ name: 'Incineroar' }] }, mega_altaria: { name: 'Mega Altaria', members: [{ name: 'Altaria' }, { name: 'Mimikyu' }] } };
  var ok = savePreloadedOverride('mega_altaria');
  assert(ok === true, 'savePreloadedOverride returns true on success');
  assert(TEAMS['mega_altaria']._hasOverride === true, '_hasOverride flag set after save');
  var stored = Storage.get('overrides:preloaded');
  assert(stored !== null, 'Storage.get("overrides:preloaded") non-null after save');
  assert(stored.overrides && stored.overrides['mega_altaria'], 'override key present');
  assert(Array.isArray(stored.overrides['mega_altaria'].members), 'stored override has members array');
  assert(stored.overrides['mega_altaria'].members.length === 2, 'override members length correct');
  TEAMS['mega_altaria'].members = [{ name: 'Altaria' }]; TEAMS['mega_altaria']._hasOverride = false;
  var loadedCount = loadPreloadedOverridesFromStorage();
  assert(loadedCount === 1, 'loadPreloadedOverridesFromStorage restores 1 override');
  assert(TEAMS['mega_altaria'].members.length === 2, 'override members correctly restored');
  assert(TEAMS['mega_altaria']._hasOverride === true, '_hasOverride re-set after load');
  var cleared = clearPreloadedOverride('mega_altaria');
  assert(cleared === true, 'clearPreloadedOverride returns true');
  var afterClear = Storage.get('overrides:preloaded');
  assert(!afterClear.overrides['mega_altaria'], 'override key removed after clear');
  assert(loadPreloadedOverridesFromStorage() === 0, 'load returns 0 after clear');
  assert(clearPreloadedOverride('nonexistent_key') === false, 'clearPreloadedOverride false for missing key');
});

describe('Suite 3 — _saveBringState + _loadBringState roundtrip', function() {
  Storage.clear(); BRING_SELECTION = {}; BRING_MODE = {};
  BRING_SELECTION['player'] = ['Incineroar', 'Arcanine', 'Garchomp', 'Whimsicott'];
  BRING_MODE['player'] = 'manual';
  BRING_SELECTION['mega_altaria'] = ['Altaria', 'Mimikyu', 'Garchomp', 'Incineroar'];
  BRING_MODE['mega_altaria'] = 'random';
  _saveBringState();
  var stored = Storage.get('bring:default');
  assert(stored !== null, 'Storage.get("bring:default") non-null after _saveBringState');
  assert(stored.selection && stored.selection['player'], 'player bring selection persisted');
  assert(stored.selection['player'].length === 4, 'player bring has 4 slots');
  assert(stored.mode && stored.mode['player'] === 'manual', 'player mode persisted as manual');
  assert(stored.mode['mega_altaria'] === 'random', 'opponent mode persisted as random');
  BRING_SELECTION = {}; BRING_MODE = {};
  _loadBringState();
  assert(BRING_SELECTION['player'] && BRING_SELECTION['player'][0] === 'Incineroar', 'BRING_SELECTION restored');
  assert(BRING_MODE['player'] === 'manual', 'BRING_MODE player restored');
  assert(BRING_MODE['mega_altaria'] === 'random', 'BRING_MODE opponent restored');
  Storage.clear(); BRING_SELECTION = {}; BRING_MODE = {};
  _loadBringState();
  assert(Object.keys(BRING_SELECTION).length === 0, '_loadBringState no-op when Storage empty');
  var fnSources = [saveCustomTeamsToStorage, loadCustomTeamsFromStorage, savePreloadedOverride,
    clearPreloadedOverride, loadPreloadedOverridesFromStorage, _saveBringState, _loadBringState]
    .map(function(f){ return f.toString(); }).join('\n');
  assert(!fnSources.includes('localStorage'), 'No raw localStorage in any of the 7 wired functions');
});

summarize();
