// storage_adapter_tests.js — TDD suite for Issue #79
// Storage adapter: unified champions:* key schema, migration, CRUD, clearAll.
//
// STATUS: ALL TESTS EXPECTED TO FAIL (RED) until storage_adapter.js is implemented.
// Run:  node poke-sim/tests/storage_adapter_tests.js
// Pass gate: 0 failures required before Option B PR can merge.
//
// Test inventory (40 cases):
//   Section 1 — Adapter CRUD           (T01–T08)
//   Section 2 — Key schema             (T09–T13)
//   Section 3 — list() scoping         (T14–T17)
//   Section 4 — clearAll() safety      (T18–T21)
//   Section 5 — Migration (old → new)  (T22–T30)
//   Section 6 — QuotaExceededError     (T31–T33)
//   Section 7 — Custom teams round-trip(T34–T37)
//   Section 8 — Bring prefs round-trip (T38–T40)

'use strict';

// ---------------------------------------------------------------------------
// Minimal localStorage mock (no DOM / no browser required)
// ---------------------------------------------------------------------------
const localStorage = {
  _data: {},
  getItem(k)    { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
  key(i)        { return Object.keys(this._data)[i] ?? null; },
  get length()  { return Object.keys(this._data).length; },
};
global.localStorage = localStorage;

// ---------------------------------------------------------------------------
// Load the module under test
// Expects storage_adapter.js to export via:
//   if (typeof module !== 'undefined') module.exports = { Storage };
// ---------------------------------------------------------------------------
let Storage;
try {
  const path = require('path');
  ({ Storage } = require(path.resolve(__dirname, '..', 'storage_adapter.js')));
} catch (e) {
  const NOT_IMPL = (name) => () => { throw new Error(`Storage.${name}() not implemented — ship storage_adapter.js first`); };
  Storage = {
    PREFIX:   undefined,
    get:      NOT_IMPL('get'),
    set:      NOT_IMPL('set'),
    del:      NOT_IMPL('del'),
    list:     NOT_IMPL('list'),
    clearAll: NOT_IMPL('clearAll'),
    migrate:  NOT_IMPL('migrate'),
  };
}

// ---------------------------------------------------------------------------
// Test harness (matches items_tests.js exactly)
// ---------------------------------------------------------------------------
let pass = 0, fail = 0;
function T(name, fn) {
  try   { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') {
  if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function truthy(v, msg) { if (!v) throw new Error(msg || `expected truthy, got ${v}`); }
function falsy(v, msg)  { if (v)  throw new Error(msg || `expected falsy, got ${v}`); }
function deepEq(a, b, msg='') {
  const as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as !== bs) throw new Error(`${msg} expected ${bs}, got ${as}`);
}
function resetStorage() { localStorage.clear(); }

// ===========================================================================
// Section 1 — Adapter CRUD (T01–T08)
// ===========================================================================
console.log('\nSection 1 — Adapter CRUD:');
resetStorage();

T('T01. Storage.PREFIX is "champions:"', () => {
  eq(Storage.PREFIX, 'champions:', 'PREFIX mismatch');
});

T('T02. set() then get() returns same value', () => {
  Storage.set('teams:custom', [{ name: 'TestTeam' }]);
  const result = Storage.get('teams:custom');
  truthy(Array.isArray(result), 'should be array');
  eq(result[0].name, 'TestTeam', 'name mismatch');
});

T('T03. get() returns null for missing key', () => {
  const result = Storage.get('nonexistent:key');
  eq(result, null, 'should be null');
});

T('T04. set() overwrites existing value', () => {
  Storage.set('teams:custom', [{ name: 'Old' }]);
  Storage.set('teams:custom', [{ name: 'New' }]);
  const result = Storage.get('teams:custom');
  eq(result[0].name, 'New', 'should be overwritten');
});

T('T05. del() removes a key', () => {
  Storage.set('bring:default', { Garchomp: ['Garchomp', 'Incineroar'] });
  Storage.del('bring:default');
  eq(Storage.get('bring:default'), null, 'should be gone');
});

T('T06. del() on missing key does not throw', () => {
  Storage.del('totally:missing');
  truthy(true, 'no throw');
});

T('T07. set() serializes objects (JSON round-trip)', () => {
  const payload = { schema_version: 1, entries: [{ id: 'abc', ts: 1234 }] };
  Storage.set('sim_log:v1', payload);
  const back = Storage.get('sim_log:v1');
  eq(back.schema_version, 1, 'schema_version');
  eq(back.entries[0].id, 'abc', 'entry id');
});

T('T08. set() stores under "champions:<key>" in raw localStorage', () => {
  resetStorage();
  Storage.set('teams:custom', []);
  const raw = localStorage.getItem('champions:teams:custom');
  truthy(raw !== null, 'raw key must exist');
});

// ===========================================================================
// Section 2 — Key schema (T09–T13)
// ===========================================================================
console.log('\nSection 2 — Key schema:');
resetStorage();

T('T09. Raw key format is PREFIX + logical key', () => {
  Storage.set('strategy:report', { version: 1 });
  truthy(localStorage.getItem('champions:strategy:report') !== null,
    'raw key "champions:strategy:report" must exist');
});

T('T10. Two different logical keys produce two different raw keys', () => {
  Storage.set('teams:custom', 'A');
  Storage.set('bring:default', 'B');
  const rawA = localStorage.getItem('champions:teams:custom');
  const rawB = localStorage.getItem('champions:bring:default');
  truthy(rawA !== null && rawB !== null, 'both raw keys must exist');
  truthy(rawA !== rawB, 'raw keys must differ');
});

T('T11. Logical keys with colons are valid', () => {
  Storage.set('strategy:report:v1', { ok: true });
  const back = Storage.get('strategy:report:v1');
  truthy(back !== null && back.ok === true, 'nested logical key round-trips');
});

T('T12. Setting a value does NOT pollute unrelated localStorage keys', () => {
  resetStorage();
  localStorage.setItem('unrelated_app_key', 'should-survive');
  Storage.set('teams:custom', []);
  eq(localStorage.getItem('unrelated_app_key'), 'should-survive', 'unrelated key intact');
});

T('T13. Storage does not read keys missing the champions: prefix', () => {
  resetStorage();
  localStorage.setItem('champions_sim_custom_teams_v1', 'old_format');
  const result = Storage.get('sim_custom_teams_v1');
  eq(result, null, 'old-format key must not be read by get()');
});

// ===========================================================================
// Section 3 — list() scoping (T14–T17)
// ===========================================================================
console.log('\nSection 3 — list() scoping:');
resetStorage();

T('T14. list() with no scope returns all champions: keys', () => {
  resetStorage();
  Storage.set('teams:custom', []);
  Storage.set('bring:default', {});
  Storage.set('sim_log:v1', {});
  const keys = Storage.list();
  eq(keys.length, 3, 'should find 3 keys');
});

T('T15. list("teams") returns only teams:* keys', () => {
  resetStorage();
  Storage.set('teams:custom', []);
  Storage.set('teams:tournament', []);
  Storage.set('bring:default', {});
  const keys = Storage.list('teams');
  eq(keys.length, 2, 'should find 2 team keys');
  truthy(keys.every(k => k.startsWith('teams:')), 'all must be teams:*');
});

T('T16. list() does not include unrelated localStorage keys', () => {
  resetStorage();
  localStorage.setItem('some_other_app', 'noise');
  Storage.set('teams:custom', []);
  const keys = Storage.list();
  eq(keys.length, 1, 'only champions: keys');
  falsy(keys.includes('some_other_app'), 'noise key must be excluded');
});

T('T17. list() returns empty array when nothing stored', () => {
  resetStorage();
  const keys = Storage.list();
  truthy(Array.isArray(keys), 'must be array');
  eq(keys.length, 0, 'must be empty');
});

// ===========================================================================
// Section 4 — clearAll() safety (T18–T21)
// ===========================================================================
console.log('\nSection 4 — clearAll() safety:');
resetStorage();

T('T18. clearAll() removes all champions: keys', () => {
  Storage.set('teams:custom', []);
  Storage.set('bring:default', {});
  Storage.set('sim_log:v1', {});
  Storage.clearAll();
  eq(Storage.list().length, 0, 'all champions: keys gone');
});

T('T19. clearAll() does NOT remove unrelated localStorage keys', () => {
  resetStorage();
  localStorage.setItem('third_party_key', 'keep-me');
  Storage.set('teams:custom', []);
  Storage.clearAll();
  eq(localStorage.getItem('third_party_key'), 'keep-me', 'third-party key survives');
});

T('T20. get() returns null after clearAll()', () => {
  Storage.set('teams:custom', [{ name: 'Test' }]);
  Storage.clearAll();
  eq(Storage.get('teams:custom'), null, 'cleared');
});

T('T21. clearAll() on empty storage does not throw', () => {
  resetStorage();
  Storage.clearAll();
  truthy(true, 'no throw');
});

// ===========================================================================
// Section 5 — Migration old keys → new keys (T22–T30)
// ===========================================================================
console.log('\nSection 5 — Migration (old keys → new keys):');

const OLD_KEYS = {
  custom_teams: 'champions_sim_custom_teams_v1',
  bring:        'poke-sim:bring:v1',
  strategy:     'champions_strategy_report_v1',
  preloaded:    'champions_sim_preloaded_overrides',
};

T('T22. migrate() copies champions_sim_custom_teams_v1 → champions:teams:custom', () => {
  resetStorage();
  const teams = [{ name: 'MigratedTeam', members: [] }];
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify(teams));
  Storage.migrate();
  const result = Storage.get('teams:custom');
  truthy(result !== null, 'new key must exist');
  eq(result[0].name, 'MigratedTeam', 'data preserved');
});

T('T23. migrate() copies poke-sim:bring:v1 → champions:bring:default', () => {
  resetStorage();
  const bring = { player: ['Garchomp', 'Incineroar', 'Whimsicott', 'Rotom-Wash'] };
  localStorage.setItem(OLD_KEYS.bring, JSON.stringify(bring));
  Storage.migrate();
  const result = Storage.get('bring:default');
  truthy(result !== null, 'new bring key must exist');
  deepEq(result, bring, 'bring data preserved');
});

T('T24. migrate() copies champions_strategy_report_v1 → champions:strategy:report', () => {
  resetStorage();
  const report = { schema_version: 1, reports: {} };
  localStorage.setItem(OLD_KEYS.strategy, JSON.stringify(report));
  Storage.migrate();
  const result = Storage.get('strategy:report');
  truthy(result !== null, 'new strategy key must exist');
  eq(result.schema_version, 1, 'schema_version preserved');
});

T('T25. migrate() copies champions_sim_preloaded_overrides → champions:overrides:preloaded', () => {
  resetStorage();
  const overrides = { mega_altaria: true };
  localStorage.setItem(OLD_KEYS.preloaded, JSON.stringify(overrides));
  Storage.migrate();
  const result = Storage.get('overrides:preloaded');
  truthy(result !== null, 'new overrides key must exist');
  deepEq(result, overrides, 'overrides preserved');
});

T('T26. migrate() deletes all 4 old keys after copying', () => {
  resetStorage();
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify([]));
  localStorage.setItem(OLD_KEYS.bring, JSON.stringify({}));
  localStorage.setItem(OLD_KEYS.strategy, JSON.stringify({}));
  localStorage.setItem(OLD_KEYS.preloaded, JSON.stringify({}));
  Storage.migrate();
  eq(localStorage.getItem(OLD_KEYS.custom_teams), null, 'old custom_teams gone');
  eq(localStorage.getItem(OLD_KEYS.bring), null, 'old bring gone');
  eq(localStorage.getItem(OLD_KEYS.strategy), null, 'old strategy gone');
  eq(localStorage.getItem(OLD_KEYS.preloaded), null, 'old preloaded gone');
});

T('T27. migrate() is idempotent — running twice does not duplicate data', () => {
  resetStorage();
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify([{ name: 'Solo' }]));
  Storage.migrate();
  Storage.migrate();
  const result = Storage.get('teams:custom');
  truthy(Array.isArray(result), 'must be array');
  eq(result.length, 1, 'must not be duplicated');
});

T('T28. migrate() skips missing old keys without throwing', () => {
  resetStorage();
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify([]));
  Storage.migrate();
  truthy(true, 'no throw on partial old keys');
});

T('T29. migrate() does not overwrite existing new-format data', () => {
  resetStorage();
  Storage.set('teams:custom', [{ name: 'AlreadyMigrated' }]);
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify([{ name: 'OldData' }]));
  Storage.migrate();
  const result = Storage.get('teams:custom');
  eq(result[0].name, 'AlreadyMigrated', 'new-format data must not be overwritten');
});

T('T30. After migration list() shows only new-format keys', () => {
  resetStorage();
  localStorage.setItem(OLD_KEYS.custom_teams, JSON.stringify([{ name: 'M' }]));
  localStorage.setItem(OLD_KEYS.bring, JSON.stringify({}));
  Storage.migrate();
  const keys = Storage.list();
  truthy(keys.every(k => !k.startsWith('champions_sim') && !k.startsWith('poke-sim')),
    'no old-format keys in list()');
});

// ===========================================================================
// Section 6 — QuotaExceededError handling (T31–T33)
// ===========================================================================
console.log('\nSection 6 — QuotaExceededError handling:');
resetStorage();

T('T31. set() returns false (not throws) on QuotaExceededError', () => {
  const orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); };
  let result;
  try { result = Storage.set('teams:big', new Array(1000).fill({ name: 'x' })); }
  finally { localStorage.setItem = orig; }
  falsy(result, 'should return falsy on quota error');
});

T('T32. get() returns null (not throws) if stored value is corrupt JSON', () => {
  localStorage.setItem('champions:bad:json', '{broken json{{{{');
  const result = Storage.get('bad:json');
  eq(result, null, 'corrupt JSON should return null');
});

T('T33. set() returns true on success', () => {
  const result = Storage.set('teams:custom', []);
  truthy(result === true || result === undefined, 'set() should return true or undefined on success');
});

// ===========================================================================
// Section 7 — Custom teams round-trip (T34–T37)
// ===========================================================================
console.log('\nSection 7 — Custom teams round-trip:');
resetStorage();

const FIXTURE_TEAM = {
  key: 'custom_test_1234',
  label: 'My Test Team',
  members: [
    { name: 'Garchomp',   level: 50, moves: ['Earthquake', 'Dragon Claw', 'Protect', 'Rock Slide'], ability: 'Rough Skin',  item: 'Rocky Helmet', nature: 'Jolly'   },
    { name: 'Incineroar', level: 50, moves: ['Fake Out', 'Flare Blitz', 'Knock Off', 'Parting Shot'], ability: 'Intimidate', item: 'Sitrus Berry', nature: 'Adamant' },
  ],
};

T('T34. Full team object survives set -> get round-trip', () => {
  Storage.set('teams:custom', [FIXTURE_TEAM]);
  const back = Storage.get('teams:custom');
  eq(back[0].key, FIXTURE_TEAM.key, 'key preserved');
  eq(back[0].label, FIXTURE_TEAM.label, 'label preserved');
  eq(back[0].members.length, 2, 'member count preserved');
});

T('T35. Member moves array survives round-trip', () => {
  Storage.set('teams:custom', [FIXTURE_TEAM]);
  const back = Storage.get('teams:custom');
  deepEq(back[0].members[0].moves, FIXTURE_TEAM.members[0].moves, 'moves array intact');
});

T('T36. Multiple teams stored and retrieved correctly', () => {
  const team2 = Object.assign({}, FIXTURE_TEAM, { key: 'custom_5678', label: 'Team 2' });
  Storage.set('teams:custom', [FIXTURE_TEAM, team2]);
  const back = Storage.get('teams:custom');
  eq(back.length, 2, 'two teams');
  eq(back[1].label, 'Team 2', 'second team label');
});

T('T37. Overwriting teams replaces all (no append behavior)', () => {
  Storage.set('teams:custom', [FIXTURE_TEAM]);
  Storage.set('teams:custom', [{ key: 'solo', label: 'Solo', members: [] }]);
  const back = Storage.get('teams:custom');
  eq(back.length, 1, 'only 1 team after overwrite');
  eq(back[0].key, 'solo', 'correct team after overwrite');
});

// ===========================================================================
// Section 8 — Bring prefs round-trip (T38–T40)
// ===========================================================================
console.log('\nSection 8 — Bring prefs round-trip:');
resetStorage();

const FIXTURE_BRING = {
  player:         ['Garchomp', 'Incineroar', 'Whimsicott', 'Rotom-Wash'],
  mega_altaria:   ['Altaria', 'Garchomp', 'Togekiss', 'Incineroar'],
  chuppa_balance: ['Urshifu', 'Calyrex', 'Regieleki', 'Incineroar'],
};

T('T38. Bring prefs object survives set -> get round-trip', () => {
  Storage.set('bring:default', FIXTURE_BRING);
  const back = Storage.get('bring:default');
  truthy(back !== null, 'must not be null');
  deepEq(back.player, FIXTURE_BRING.player, 'player bring intact');
});

T('T39. All team keys in bring prefs survive round-trip', () => {
  Storage.set('bring:default', FIXTURE_BRING);
  const back = Storage.get('bring:default');
  const keys = Object.keys(back);
  eq(keys.length, 3, '3 teams in prefs');
  truthy(keys.includes('mega_altaria'), 'mega_altaria key present');
});

T('T40. Bring prefs for one team can update without affecting others', () => {
  Storage.set('bring:default', FIXTURE_BRING);
  const prefs = Storage.get('bring:default');
  prefs.player = ['Incineroar', 'Whimsicott', 'Garchomp', 'Arcanine'];
  Storage.set('bring:default', prefs);
  const back = Storage.get('bring:default');
  eq(back.player[0], 'Incineroar', 'player updated');
  deepEq(back.mega_altaria, FIXTURE_BRING.mega_altaria, 'other team unchanged');
});

// ===========================================================================
// Summary
// ===========================================================================
console.log(`\n${pass} pass, ${fail} fail, ${pass + fail} total`);
console.log(fail > 0
  ? `\n\u26a0\ufe0f  ${fail} test(s) RED — implement storage_adapter.js to turn them GREEN.`
  : '\n\u2705  All 40 storage adapter tests GREEN — safe to proceed with Option B PR.');
if (fail > 0) process.exit(1);
