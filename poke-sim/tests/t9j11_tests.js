// T9j.11 (Refs #73) Custom teams filter + bulk import/export tests
//
// Coverage targets:
//   Persistence (2):   localStorage round-trip; schema version guard.
//   Filter chips (4):  All/Preloaded/Custom/Tournament/Mega; counts; active
//                      state; empty-filter safety.
//   Export (3):        JSON schema matches T9f; Showdown multi-team format
//                      uses `=== [name] ===` markers; CRLF-safe.
//   Import (4):        JSON round-trip parity; Showdown multi-team parser
//                      with markers; parser with blank-line separator; parser
//                      with Windows CRLF endings.
//   Collision/import metadata: name/key collision; Showdown warning
//                      metadata; hard invalid imports; Champion SP gates.
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
load('storage_adapter.js');
load('generated/pokemon_showdown_legal_data.js');
ctx.ChampionsSim = ctx.ChampionsSim || {};
ctx.ChampionsSim.pokemonDataAudit = require(path.join(ROOT, 'generated', 'pokemon_showdown_legal_data.js'));
load('move_legality.js');
ctx.window.ChampionsSim = ctx.ChampionsSim;
load('legality.js');
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
  'this.parseShowdownPaste=parseShowdownPaste;',
  'this.buildImportedTeamValidation=buildImportedTeamValidation;',
  'this.exportTeamToPaste=exportTeamToPaste;',
  'this.getVisibleTeamKeys=getVisibleTeamKeys;',
  'this.mergeDbTeamsIntoCatalog=mergeDbTeamsIntoCatalog;',
  'this.CS_REMOVED_TEAM_CATALOG=CS_REMOVED_TEAM_CATALOG;',
  'this.csBuildMegaRuntimeWarning=csBuildMegaRuntimeWarning;',
  'this.csNormalizeMegaRuntimeMember=csNormalizeMegaRuntimeMember;'
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
  parseShowdownPaste,
  buildImportedTeamValidation,
  exportTeamToPaste,
  getVisibleTeamKeys,
  mergeDbTeamsIntoCatalog,
  CS_REMOVED_TEAM_CATALOG,
  csBuildMegaRuntimeWarning,
  csNormalizeMegaRuntimeMember
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
const LEGAL_TEST_MOVES_BY_SPECIES = {
  Arcanine: ['Protect', 'Crunch', 'Flamethrower', 'Will-O-Wisp'],
  Garchomp: ['Earthquake', 'Protect', 'Substitute', 'Rest'],
  Incineroar: ['Fake Out', 'Protect', 'Knock Off', 'Flare Blitz'],
  Pikachu: ['Thunderbolt', 'Protect', 'Substitute', 'Rest'],
  'Rotom-Wash': ['Hydro Pump', 'Thunderbolt', 'Protect', 'Rest']
};

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
      moves: LEGAL_TEST_MOVES_BY_SPECIES[n] || ['Protect','Substitute','Rest'],
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
  // Safe localStorage clear with multiple fallbacks
  if (ctx && ctx.localStorage && typeof ctx.localStorage.clear === 'function') {
    ctx.localStorage.clear();
  } else if (ctx && ctx.localStorage && ctx.localStorage._s !== undefined) {
    ctx.localStorage._s = {};
  } else if (typeof localStorage !== 'undefined' && localStorage.clear) {
    localStorage.clear();
  }
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

T('5. teamMatchesFilter: tournament shows Champions tournament teams only', () => {
  truthy(teamMatchesFilter('champions_arena_1st', TEAMS.champions_arena_1st, 'tournament'),
    'adjusted champions_arena_1st should remain discoverable as a tournament-inspired sample');
  truthy(teamMatchesFilter('champions_arena_2nd', TEAMS.champions_arena_2nd, 'tournament'),
    'adjusted champions_arena_2nd should remain discoverable as a tournament-inspired sample');
  truthy(!teamMatchesFilter('player', TEAMS.player, 'tournament'), 'starter team should stay separate from tournament packs');
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

T('15b. imported teams block known illegal Showdown-backed moves', () => {
  resetTeams();
  const member = {
    name: 'Arcanine',
    item: '',
    ability: 'Intimidate',
    level: 50,
    nature: 'Hardy',
    moves: ['Surf'],
    evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }
  };
  const validation = buildImportedTeamValidation([member]);
  truthy(!validation.valid, 'known illegal move should hard-block import');
  truthy(validation.errors.some(w => /Surf/.test(w)), 'Surf error missing');
  truthy((validation.memberWarnings['0'] || []).some(w => w.severity === 'error' && /Surf/.test(w.text)), 'member-level Surf error missing');

  const res = importCustomTeamsBulk([{ name: 'Warned Import', members: [member] }]);
  eq(res.added, 0, 'known illegal move import should not be added');
  eq(res.skipped, 1, 'known illegal move import should be skipped');
  eq(res.keys.length, 0, 'known illegal move import should not return a key');
});

T('15c. imported teams with hard rule errors are rejected', () => {
  resetTeams();
  const res = importCustomTeamsBulk([{ name: 'Illegal Import', members: [
    { name: 'Arcanine', item: 'Sitrus Berry', ability: 'Intimidate', level: 50, nature: 'Hardy', moves: ['Protect'], evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 } },
    { name: 'Arcanine', item: 'Sitrus Berry', ability: 'Intimidate', level: 50, nature: 'Hardy', moves: ['Protect'], evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 } }
  ] }]);
  eq(res.added, 0, 'hard invalid import should not be added');
  eq(res.skipped, 1, 'hard invalid import should be skipped');
  eq(res.keys.length, 0, 'hard invalid import should not return a team key');
});

T('15c2. skipped bulk import returns actionable validation errors', () => {
  resetTeams();
  const members = parseShowdownPaste([
    'Garchomp @ Life Orb',
    'Ability: Rough Skin',
    'Level: 50',
    'EVs: 252 Atk / 252 Spe / 4 HP',
    'Jolly Nature',
    '- Earthquake'
  ].join('\n'));
  const res = importCustomTeamsBulk([{ name: 'Bad Upload', members }]);
  eq(res.added, 0, 'invalid upload should not import');
  eq(res.skipped, 1, 'invalid upload should be skipped');
  truthy(res.skippedErrors && res.skippedErrors.length === 1, 'skipped error details should be returned');
  truthy(res.skippedErrors[0].errors.some(e => /raw Showdown EVs|Life Orb|SP/.test(e)), 'skipped error should explain validation blocker');
});

T('15d. Champion SP import parses SPs and validates without EV/IV gate errors', () => {
  resetTeams();
  const text = [
    'Garchomp @ Soft Sand',
    'Ability: Rough Skin',
    'Level: 50',
    'SPs: 2 HP / 32 Atk / 32 Spe',
    'Jolly Nature',
    '- Earthquake',
    '- Protect'
  ].join('\n');
  const members = parseShowdownPaste(text);
  eq(members.length, 1);
  eq(members[0].evs.hp, 2);
  eq(members[0].evs.atk, 32);
  eq(members[0].evs.spe, 32);
  const validation = buildImportedTeamValidation(members, { format: 'champions' });
  truthy(!validation.errors.some(e => /EVs|IVs|SP spread/.test(e)), 'SP import should not trip format gate');
});

T('15e. raw Showdown EV/IV imports are rejected for Champion mode', () => {
  resetTeams();
  const members = parseShowdownPaste([
    'Garchomp @ Life Orb',
    'Ability: Rough Skin',
    'Level: 50',
    'EVs: 252 Atk / 252 Spe / 4 HP',
    'IVs: 0 SpA',
    'Jolly Nature',
    '- Earthquake'
  ].join('\n'));
  const validation = buildImportedTeamValidation(members, { format: 'champions' });
  truthy(!validation.valid, 'raw EV/IV import should be invalid');
  truthy(validation.errors.some(e => /raw Showdown EVs/.test(e)), 'EV gate error missing');
  truthy(validation.errors.some(e => /IVs are not configurable/.test(e)), 'IV gate error missing');
  truthy(validation.errors.some(e => /Life Orb/.test(e)), 'item-pool error missing');
});

T('15e2. over-cap Champion SP imports are rejected even when labeled SPs', () => {
  resetTeams();
  const members = parseShowdownPaste([
    'Garchomp @ Soft Sand',
    'Ability: Rough Skin',
    'Level: 50',
    'SPs: 252 Atk / 32 Spe / 1 HP',
    'Jolly Nature',
    '- Earthquake',
    '- Protect'
  ].join('\n'));
  const validation = buildImportedTeamValidation(members, { format: 'champions' });
  truthy(!validation.valid, 'over-cap SP import should be invalid');
  truthy(validation.errors.some(e => /atk SP exceeds 32/.test(e)), 'per-stat SP cap error missing');
  truthy(validation.errors.some(e => /SPs exceed 66/.test(e)), 'total SP cap error missing');
});

T('15f. Champion text export uses SPs, not EVs', () => {
  const text = exportTeamToPaste({
    members: [{
      name: 'Garchomp',
      item: 'Soft Sand',
      ability: 'Rough Skin',
      level: 50,
      nature: 'Jolly',
      evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ['Earthquake', 'Protect']
    }]
  });
  deepInc(text, 'SPs: 2 HP / 32 Atk / 32 Spe', 'SP export line present');
  truthy(text.indexOf('EVs:') === -1, 'Champion export should not emit EVs');
});

T('15f2. user-facing Showdown export uses EVs and re-imports when within Champion caps', () => {
  resetTeams();
  TEAMS.custom_showdown_export = {
    name: 'Showdown Export Test',
    source: 'custom',
    format: 'champions',
    members: [{
      name: 'Garchomp',
      item: 'Soft Sand',
      ability: 'Rough Skin',
      level: 50,
      nature: 'Jolly',
      evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
      moves: ['Earthquake', 'Protect']
    }]
  };
  const text = exportAllCustomAsShowdown();
  deepInc(text, 'EVs: 2 HP / 32 Atk / 32 Spe', 'Showdown export should emit EVs');
  truthy(text.indexOf('SPs:') === -1, 'Showdown export should not emit SPs');
  const parsed = parseMultiTeamShowdown(text);
  eq(parsed.length, 1, 'Showdown export should parse back as one team');
  const validation = buildImportedTeamValidation(parsed[0].members, { format: 'champions' });
  truthy(validation.valid, 'Champion-capped Showdown EV export should re-import');
});

T('15f3. single uploaded Showdown txt with six Pokemon parses as one team with moves', () => {
  const text = [
    'Charizard @ Charizardite Y',
    'Ability: Solar Power',
    'Level: 50',
    'EVs: 1 HP / 32 SpA / 1 SpD / 32 Spe',
    'Timid Nature',
    '- Heat Wave',
    '- Solar Beam',
    '- Weather Ball',
    '- Protect',
    '',
    'Venusaur @ Black Sludge',
    'Ability: Chlorophyll',
    'Level: 50',
    'EVs: 2 HP / 32 SpA / 32 Spe',
    'Modest Nature',
    '- Sleep Powder',
    '- Sludge Bomb',
    '- Giga Drain',
    '- Protect',
    '',
    'Garchomp @ Soft Sand',
    'Ability: Rough Skin',
    'Level: 50',
    'EVs: 2 HP / 32 Atk / 32 Spe',
    'Jolly Nature',
    '- Earthquake',
    '- Dragon Claw',
    '- Rock Slide',
    '- Protect',
    '',
    'Sneasler @ Focus Sash',
    'Ability: Unburden',
    'Level: 50',
    'EVs: 2 HP / 32 Atk / 32 Spe',
    'Jolly Nature',
    '- Fake Out',
    '- Close Combat',
    '- Dire Claw',
    '- Protect',
    '',
    'Incineroar @ Sitrus Berry',
    'Ability: Intimidate',
    'Level: 50',
    'EVs: 32 HP / 1 Atk / 1 Def / 32 SpD',
    'Careful Nature',
    '- Fake Out',
    '- Parting Shot',
    '- Knock Off',
    '- Flare Blitz',
    '',
    'Whimsicott @ Covert Cloak',
    'Ability: Prankster',
    'Level: 50',
    'EVs: 2 HP / 32 SpA / 32 Spe',
    'Timid Nature',
    '- Tailwind',
    '- Moonblast',
    '- Encore',
    '- Protect'
  ].join('\n');
  const teams = parseMultiTeamShowdown(text);
  eq(teams.length, 1, 'one normal Showdown team file should import as one team');
  eq(teams[0].members.length, 6, 'all six Pokemon should stay together');
  truthy(teams[0].members.every(m => (m.moves || []).length > 0), 'every Pokemon should keep move lines');
  eq(teams[0].members[0].moves[0], 'Heat Wave', 'first move parsed');
  eq(teams[0].members[5].moves[0], 'Tailwind', 'last Pokemon move parsed');
});

T('15f4. custom Charizardite Y imports stay editable but warn about active Mega Y Drought', () => {
  const members = parseShowdownPaste([
    'Charizard @ Charizardite Y',
    'Ability: Solar Power',
    'Level: 50',
    'EVs: 1 HP / 32 SpA / 1 SpD / 32 Spe',
    'Timid Nature',
    '- Heat Wave',
    '- Solar Beam',
    '- Weather Ball',
    '- Protect'
  ].join('\n'));
  const validation = buildImportedTeamValidation(members, { format: 'champions' });
  truthy(validation.valid, 'base Charizard custom import should remain editable/valid');
  truthy(validation.warnings.some(w => /active Charizard-Mega-Y with Drought/.test(w)), 'Mega Y runtime warning missing');
  truthy((validation.memberWarnings['0'] || []).some(w => /Charizardite Y/.test(w.text)), 'member warning missing');
});

T('15f5. Mega runtime normalize converts Charizardite Y set to active Mega Y Drought', () => {
  const normalized = csNormalizeMegaRuntimeMember({
    name: 'Charizard',
    item: 'Charizardite Y',
    ability: 'Solar Power',
    moves: ['Heat Wave', 'Solar Beam']
  });
  eq(normalized.name, 'Charizard-Mega-Y', 'normalizes species/form');
  eq(normalized.item, 'Charizardite Y', 'keeps stone');
  eq(normalized.ability, 'Drought', 'normalizes ability');
  truthy(!csBuildMegaRuntimeWarning(normalized), 'normalized set should not warn');
});

T('15g. illegal existing custom teams are hidden from visible sim selectors', () => {
  resetTeams();
  TEAMS.custom_bad_item = mkTeam('Bad Item', ['Garchomp']);
  TEAMS.custom_bad_item.members[0].item = 'Life Orb';
  TEAMS.custom_bad_item.legality_status = 'illegal';
  truthy(getVisibleTeamKeys({ includeCustom: true }).indexOf('custom_bad_item') === -1, 'illegal custom team should be hidden');
});

T('15g2. visible preloaded sim teams are approved Champion legal rows only', () => {
  resetTeams();
  const visible = getVisibleTeamKeys({ includeCustom: false });
  const expected = [
    'player',
    'mega_altaria',
    'mega_dragonite',
    'mega_houndoom',
    'rin_sand',
    'suica_sun',
    'cofagrigus_tr',
    'champions_arena_1st',
    'champions_arena_2nd',
    'aurora_veil_froslass',
    'targeted_proof_legal',
    'indeedee_hatterene_tr',
    'rillaboom_archaludon_balance',
    'arboliva_seed_sower_balance',
    'pelipper_basculegion_rain',
    'kevin_meta_sun'
  ];
  eq(visible.length, expected.length, 'approved Champion testing catalog should be visible');
  expected.forEach(key => truthy(visible.includes(key), key + ' should remain visible'));
  truthy(!TEAMS.champions_arena_3rd, 'still-conflicting tournament row should be removed from runtime catalog');
  truthy(!TEAMS.perish_trap_gengar, 'inferred perish-trap row should be removed from runtime catalog');
  truthy(CS_REMOVED_TEAM_CATALOG.champions_arena_3rd, 'removed catalog should record champions_arena_3rd');
  truthy(CS_REMOVED_TEAM_CATALOG.perish_trap_gengar, 'removed catalog should record perish_trap_gengar');
  const offenders = visible.filter(key => {
    const team = TEAMS[key];
    return !team || team.format !== 'champions' || team.legality_status !== 'legal';
  });
  eq(offenders.length, 0, 'visible fallback rows must be approved Champion legal');
});

T('15h. stale DB teams cannot replace approved legal bundled teams', () => {
  resetTeams();
  const before = TEAMS.mega_altaria.members.map(m => m.item).join('|');
  const res = mergeDbTeamsIntoCatalog({
    mega_altaria: {
      team_id: 'mega_altaria',
      name: 'Stale DB Override',
      format: 'champions',
      legality_status: 'legal_inferred',
      members: [{
        name: 'Milotic',
        item: 'Life Orb',
        ability: 'Competitive',
        level: 50,
        nature: 'Bold',
        evs: { hp:32, atk:0, def:10, spa:23, spd:0, spe:1 },
        moves: ['Scald', 'Protect']
      }]
    }
  });
  eq(res.skipped, 1, 'stale illegal DB team should be blocked');
  eq(TEAMS.mega_altaria.members.map(m => m.item).join('|'), before, 'approved bundled team should remain intact');
});

T('15i. stale DB teams with illegal Champion SPs cannot replace approved bundled teams', () => {
  resetTeams();
  const before = JSON.stringify(TEAMS.mega_altaria.members[0].evs);
  const res = mergeDbTeamsIntoCatalog({
    mega_altaria: {
      team_id: 'mega_altaria',
      name: 'Stale DB Bad Spread',
      format: 'champions',
      legality_status: 'legal_inferred',
      members: [{
        name: 'Garchomp',
        item: 'Soft Sand',
        ability: 'Rough Skin',
        level: 50,
        nature: 'Jolly',
        evs: { hp:4, atk:252, def:0, spa:0, spd:0, spe:252 },
        moves: ['Earthquake', 'Protect']
      }]
    }
  });
  eq(res.skipped, 1, 'stale DB team with SV-shaped Champion spread should be blocked');
  eq(JSON.stringify(TEAMS.mega_altaria.members[0].evs), before, 'approved bundled team spread should remain intact');
  truthy(res.blocked[0].errors.some(e => /SP exceeds 32|SPs exceed 66/.test(e)), 'blocked summary should name SP cap failure');
});

T('15j. malformed DB spread payloads cannot replace approved bundled teams', () => {
  resetTeams();
  const before = TEAMS.mega_altaria.name;
  const res = mergeDbTeamsIntoCatalog({
    mega_altaria: {
      team_id: 'mega_altaria',
      name: 'Stale DB String Spread',
      format: 'champions',
      legality_status: 'legal_inferred',
      members: [{
        name: 'Garchomp',
        item: 'Soft Sand',
        ability: 'Rough Skin',
        level: 50,
        nature: 'Jolly',
        evs: '252 Atk / 252 Spe / 4 HP',
        moves: ['Earthquake', 'Protect']
      }]
    }
  });
  eq(res.skipped, 1, 'stale DB team with malformed spread should be blocked');
  eq(TEAMS.mega_altaria.name, before, 'approved bundled team should remain intact');
  truthy(res.blocked[0].errors.some(e => /SP spread must be a stat object/.test(e)), 'blocked summary should name malformed spread');
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
