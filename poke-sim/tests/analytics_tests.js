// Issue #90 - analytics backfill tests for buildAnalysisPayload,
// generatePilotGuide, and showInlinePilotCard.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'analytics_fixture.json'), 'utf8'));

function makeStubEl(id) {
  const el = {
    id: id || '',
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    selectedOptions: [],
    selectedIndex: 0,
    className: '',
    hidden: false,
    children: [],
    parentNode: null,
    classList: {
      _set: new Set(),
      add(c){ this._set.add(c); },
      remove(c){ this._set.delete(c); },
      contains(c){ return this._set.has(c); },
      toggle(c, on){ on ? this._set.add(c) : this._set.delete(c); }
    },
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name] || null; },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (child.id) document._els[child.id] = child;
      return child;
    },
    replaceChild(next, old) {
      const i = this.children.indexOf(old);
      if (i >= 0) {
        next.parentNode = this;
        this.children[i] = next;
      }
      return old;
    },
    remove() {
      if (!this.parentNode) return;
      const i = this.parentNode.children.indexOf(this);
      if (i >= 0) this.parentNode.children.splice(i, 1);
    },
    addEventListener(ev, fn) {
      this._listeners = this._listeners || {};
      (this._listeners[ev] = this._listeners[ev] || []).push(fn);
    },
    removeEventListener() {},
    focus() {},
    click() {},
    querySelector(sel) {
      if (sel === '.pilot-empty') return this.children.find(c => c.className === 'pilot-empty') || null;
      if (sel.indexOf('.pilot-card[data-opp-key=') === 0) {
        const m = sel.match(/data-opp-key="([^"]+)"/);
        const key = m ? m[1] : '';
        return this.children.find(c => c.className === 'pilot-card' && c.dataset && c.dataset.oppKey === key) || null;
      }
      return null;
    },
    querySelectorAll() { return []; }
  };
  return el;
}

const document = {
  _els: {},
  _missing: new Set(),
  _noAuto: new Set(['inline-pilot-card']),
  getElementById(id) {
    if (this._missing.has(id)) return null;
    if (this._noAuto.has(id) && !this._els[id]) return null;
    if (!this._els[id]) this._els[id] = makeStubEl(id);
    return this._els[id];
  },
  createElement(tag) { return makeStubEl(tag); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {},
  body: makeStubEl('body'),
  documentElement: makeStubEl('html')
};
document._els['pilot-content'] = makeStubEl('pilot-content');
document._els['results-section'] = makeStubEl('results-section');

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  String, Number, Boolean, Map, Error, RegExp, parseInt, parseFloat, isFinite,
  window: {
    matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
    addEventListener() {},
    removeEventListener() {},
    print() {}
  },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document,
  localStorage: { _s: {}, getItem(k){ return this._s[k] || null; }, setItem(k,v){ this._s[k] = String(v); }, removeItem(k){ delete this._s[k]; } },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  URL: { createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  Blob: function(parts){ this.parts = parts; },
  alert() {},
  fetch: () => Promise.reject(new Error('no network in tests'))
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
ctx.window.window = ctx.window;
ctx.window.document = document;
ctx.window.localStorage = ctx.localStorage;
ctx.window.navigator = ctx.navigator;
ctx.window.location = ctx.location;

vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  if (file === 'move_legality.js') ctx.window.ChampionsSim = ctx.ChampionsSim;
}

['data.js', 'generated/pokemon_showdown_legal_data.js', 'generated/champions_move_pools.js', 'move_legality.js', 'logger.js', 'engine.js', 'storage_adapter.js', 'supabase_adapter.js', 'ui.js'].forEach(load);
// Isolate rendering contracts from the separately tested historical-move rejection.
vm.runInContext("TEAMS.player.members[0].moves = ['Fake Out','Parting Shot','Protect','Flare Blitz'];", ctx);

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.buildAnalysisPayload = _buildAnalysisPayload;',
  'this.generatePilotGuide = generatePilotGuide;',
  'this.showInlinePilotCard = showInlinePilotCard;'
].join(' '), ctx);

const { TEAMS, buildAnalysisPayload, generatePilotGuide, showInlinePilotCard } = ctx;

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '-', e.message);
    fail++;
  }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function inc(hay, needle, msg='') { if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'expected text') + ` ${JSON.stringify(needle)}`); }
function throws(fn, msg='') {
  let threw = false;
  try { fn(); } catch (_) { threw = true; }
  if (!threw) throw new Error(msg || 'expected throw');
}

console.log('\n=== analytics tests ===\n');

T('1. fixture opponent exists in shipped catalog', () => truthy(TEAMS[fixture.opponent]));
T('2. buildAnalysisPayload returns canonical team ids', () => {
  const p = buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult);
  eq(p.player_team_id, 'player');
  eq(p.opp_team_id, fixture.opponent);
});
T('3. buildAnalysisPayload computes sample size from W/L/D', () => {
  eq(buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).sample_size, 12);
});
T('4. buildAnalysisPayload preserves explicit winRate branch', () => {
  eq(buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).win_rate, 0.667);
});
T('5. buildAnalysisPayload carries policy and prior fields', () => {
  const p = buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult);
  eq(p.policy_model, 'deterministic-v2');
  eq(p.prior_id, 'fixture-prior');
});
T('6. buildAnalysisPayload converts winConditions object to rows', () => {
  const rows = buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).win_conditions;
  eq(rows.length, 2);
  eq(rows[0].label, 'Tailwind Win');
});
T('7. buildAnalysisPayload strips logs into persistence rows', () => {
  const logs = buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).logs;
  eq(logs.length, 3);
  eq(logs[0].seed, 'a1');
});
T('8. buildAnalysisPayload includes turning point in analysis_json', () => {
  eq(buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).analysis_json.turning_point.turn, 3);
});
T('9. buildAnalysisPayload includes position path in analysis_json', () => {
  eq(buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult).analysis_json.position_path.length, 3);
});
T('10. buildAnalysisPayload computes Wilson CI for sampled data', () => {
  const p = buildAnalysisPayload('player', fixture.opponent, 3, fixture.strongResult);
  truthy(p.ci_low > 0 && p.ci_high < 1 && p.ci_low < p.ci_high);
});
T('11. buildAnalysisPayload accepts win_conditions array branch', () => {
  const p = buildAnalysisPayload('player', fixture.opponent, 1, { wins: 1, losses: 0, draws: 0, win_conditions: [{ label: 'Manual', count: 1 }] });
  eq(p.win_conditions[0].label, 'Manual');
});
T('12. buildAnalysisPayload accepts logs array branch', () => {
  const p = buildAnalysisPayload('player', fixture.opponent, 1, { wins: 1, losses: 0, draws: 0, logs: [{ result: 'win', log: ['x'] }] });
  eq(p.logs.length, 1);
});
T('13. buildAnalysisPayload defaults policy_model only when absent', () => {
  eq(buildAnalysisPayload('player', fixture.opponent, 1, {}).policy_model, 'deterministic-v1');
});
T('14. buildAnalysisPayload rejects invalid bo', () => {
  throws(() => buildAnalysisPayload('player', fixture.opponent, 2, fixture.strongResult));
});
T('15. buildAnalysisPayload rejects empty policy_model', () => {
  throws(() => buildAnalysisPayload('player', fixture.opponent, 3, { policy_model: '' }));
});
T('16. buildAnalysisPayload rejects out-of-range win rate', () => {
  throws(() => buildAnalysisPayload('player', fixture.opponent, 3, { winRate: 1.2 }));
});

T('17. generatePilotGuide renders a card for strong results', () => {
  document._els['pilot-content'] = makeStubEl('pilot-content');
  generatePilotGuide(fixture.opponent, fixture.strongResult);
  eq(document._els['pilot-content'].children.length, 1);
});
T('18. generatePilotGuide labels favorable branch', () => {
  inc(document._els['pilot-content'].children[0].innerHTML, 'Favorable');
});
T('19. generatePilotGuide uses structured leads from winning logs', () => {
  inc(document._els['pilot-content'].children[0].innerHTML, 'Incineroar + Whimsicott');
});
T('20. generatePilotGuide renders win condition percentages', () => {
  inc(document._els['pilot-content'].children[0].innerHTML, 'Tailwind Win');
});
T('21. generatePilotGuide renders risk branch from loss logs', () => {
  inc(document._els['pilot-content'].children[0].innerHTML, 'Watch out for');
});
T('22. generatePilotGuide removes the empty placeholder', () => {
  const el = makeStubEl('pilot-content');
  const empty = makeStubEl('empty');
  empty.className = 'pilot-empty';
  el.appendChild(empty);
  document._els['pilot-content'] = el;
  generatePilotGuide(fixture.opponent, fixture.strongResult);
  eq(el.children.some(c => c.className === 'pilot-empty'), false);
});
T('23. generatePilotGuide renders weak matchup disruption tip', () => {
  document._els['pilot-content'] = makeStubEl('pilot-content');
  generatePilotGuide(fixture.opponent, fixture.weakResult);
  inc(document._els['pilot-content'].children[0].innerHTML, 'Fake Out + speed control');
});
T('24. generatePilotGuide safely no-ops without pilot-content', () => {
  document._missing.add('pilot-content');
  eq(generatePilotGuide(fixture.opponent, fixture.strongResult), undefined);
  document._missing.delete('pilot-content');
});
T('25. generatePilotGuide replaces an existing opponent card', () => {
  const el = makeStubEl('pilot-content');
  document._els['pilot-content'] = el;
  generatePilotGuide(fixture.opponent, fixture.strongResult);
  generatePilotGuide(fixture.opponent, fixture.weakResult);
  eq(el.children.length, 1);
  inc(el.children[0].innerHTML, 'Avoid');
});

T('26. showInlinePilotCard creates container in results section', () => {
  delete document._els['inline-pilot-card'];
  document._els['results-section'] = makeStubEl('results-section');
  showInlinePilotCard(fixture.opponent, fixture.strongResult);
  eq(document._els['results-section'].children.length, 1);
});
T('27. showInlinePilotCard renders favorable verdict branch', () => {
  const card = document._els['results-section'].children[0];
  inc(card.innerHTML, 'Favorable');
});
T('28. showInlinePilotCard renders lead and win condition tips', () => {
  const card = document._els['results-section'].children[0];
  inc(card.innerHTML, 'Best winning lead: Incineroar + Whimsicott');
  inc(card.innerHTML, 'Win condition: Tailwind Win');
});
T('29. showInlinePilotCard renders low-win disruption tip', () => {
  delete document._els['inline-pilot-card'];
  document._els['results-section'] = makeStubEl('results-section');
  showInlinePilotCard(fixture.opponent, fixture.weakResult);
  inc(document._els['results-section'].children[0].innerHTML, 'Use speed control');
});
T('30. showInlinePilotCard no-ops when results section is missing', () => {
  delete document._els['inline-pilot-card'];
  document._missing.add('results-section');
  eq(showInlinePilotCard(fixture.opponent, fixture.strongResult), undefined);
  document._missing.delete('results-section');
});
T('31. showInlinePilotCard falls back to raw opponent key for unknown team', () => {
  delete document._els['inline-pilot-card'];
  document._els['results-section'] = makeStubEl('results-section');
  showInlinePilotCard('unknown_team', fixture.weakResult);
  inc(document._els['results-section'].children[0].innerHTML, 'unknown_team');
});
T('32. showInlinePilotCard escapes opponent team names', () => {
  TEAMS.__analytics_xss__ = {
    name: '<img src=x onerror=alert(1)>',
    source: 'custom',
    format: 'champions',
    legality_status: 'legal',
    members: [{
      name: 'Pikachu',
      item: '',
      ability: 'Static',
      nature: 'Timid',
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: ['Thunderbolt']
    }]
  };
  delete document._els['inline-pilot-card'];
  document._els['results-section'] = makeStubEl('results-section');
  showInlinePilotCard('__analytics_xss__', fixture.weakResult);
  inc(document._els['results-section'].children[0].innerHTML, '&lt;img');
});

console.log(`\nanalytics tests: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
