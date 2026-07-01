'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  return {
    _children: [],
    _listeners: {},
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    className: '',
    files: null,
    options: [],
    selectedIndex: 0,
    checked: false,
    disabled: false,
    appendChild(c) { this._children.push(c); return c; },
    removeChild(c) { const i = this._children.indexOf(c); if (i >= 0) this._children.splice(i, 1); return c; },
    addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return makeStubEl(); },
    querySelectorAll() { return []; },
    getAttribute() { return null; },
    setAttribute() {},
    click() {},
    focus() {},
    blur() {},
    dispatchEvent() {}
  };
}

const ctx = {
  console,
  require,
  module: {},
  exports: {},
  Math,
  Object,
  Array,
  Set,
  JSON,
  Promise,
  setTimeout,
  setInterval,
  clearInterval,
  clearTimeout,
  Date,
  window: { matchMedia: () => ({ matches: false }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} }),
  document: (function() {
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
  Blob: function(parts) { this.parts = parts; },
  FileReader: function(){},
  alert: (m) => { ctx._lastAlert = m; },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  fetch: () => Promise.reject(new Error('no network in tests'))
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

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

vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.CHAMPIONS_MEGAS=CHAMPIONS_MEGAS;',
  'this.csBuildMegaRuntimeWarning=csBuildMegaRuntimeWarning;',
  'this.csNormalizeMegaRuntimeMember=csNormalizeMegaRuntimeMember;',
  'this.buildImportedTeamValidation=buildImportedTeamValidation;',
  'this.parseShowdownPaste=parseShowdownPaste;'
].join(' '), ctx);

const {
  TEAMS,
  CHAMPIONS_MEGAS,
  csBuildMegaRuntimeWarning,
  csNormalizeMegaRuntimeMember,
  buildImportedTeamValidation,
  parseShowdownPaste
} = ctx;

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'eq failed') + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

console.log('\n=== Mega runtime form guard tests ===\n');

T('1. every known Champion Mega Stone can warn from base form without becoming a hard error', () => {
  const offenders = [];
  Object.keys(CHAMPIONS_MEGAS).forEach((megaName) => {
    const row = CHAMPIONS_MEGAS[megaName];
    const member = {
      name: row.baseSpecies,
      item: row.megaStone,
      ability: 'Base Ability',
      level: 50,
      nature: 'Hardy',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['Protect']
    };
    const warning = csBuildMegaRuntimeWarning(member);
    if (!warning || warning.severity !== 'warning' || !warning.text.includes(megaName) || !warning.text.includes(row.ability)) {
      offenders.push(megaName);
    }
  });
  eq(offenders.length, 0, offenders.join(', '));
});

T('2. every known Champion Mega Stone normalizes to its active Mega form and ability', () => {
  const offenders = [];
  Object.keys(CHAMPIONS_MEGAS).forEach((megaName) => {
    const row = CHAMPIONS_MEGAS[megaName];
    const normalized = csNormalizeMegaRuntimeMember({
      name: row.baseSpecies,
      item: row.megaStone,
      ability: 'Base Ability',
      moves: ['Protect']
    });
    if (normalized.name !== megaName || normalized.item !== row.megaStone || normalized.ability !== row.ability) {
      offenders.push(megaName + ': ' + normalized.name + ' / ' + normalized.ability);
    }
    if (csBuildMegaRuntimeWarning(normalized)) {
      offenders.push(megaName + ': normalized row still warns');
    }
  });
  eq(offenders.length, 0, offenders.join('; '));
});

T('3. custom Charizardite Y import remains valid but carries a runtime-form warning', () => {
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
  truthy(validation.valid, 'custom base-form Mega import should not be blocked');
  truthy(validation.warnings.some((w) => w.includes('active Charizard-Mega-Y with Drought')), 'runtime warning missing');
});

T('4. shipped Charizardite Y sun rows stay strict and active-form normalized', () => {
  const offenders = [];
  Object.keys(TEAMS).forEach((key) => {
    const team = TEAMS[key];
    if (!team || team.source === 'custom' || team.legality_status !== 'legal') return;
    (team.members || []).forEach((member, idx) => {
      if (member && member.item === 'Charizardite Y' && (member.name !== 'Charizard-Mega-Y' || member.ability !== 'Drought')) {
        offenders.push(key + ' slot ' + (idx + 1));
      }
    });
  });
  eq(offenders.length, 0, offenders.join('; '));
});

T('5. non-Mega items do not produce Mega runtime warnings or normalization side effects', () => {
  const member = { name: 'Garchomp', item: 'Soft Sand', ability: 'Rough Skin', moves: ['Earthquake'] };
  truthy(!csBuildMegaRuntimeWarning(member), 'non-Mega item should not warn');
  const normalized = csNormalizeMegaRuntimeMember(member);
  eq(normalized.name, 'Garchomp', 'name unchanged');
  eq(normalized.item, 'Soft Sand', 'item unchanged');
  eq(normalized.ability, 'Rough Skin', 'ability unchanged');
});

console.log(`\nMega runtime form guard: ${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
