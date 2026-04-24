// T9j.14 (Refs #75) - Shadow Pressure PDF master sheet + coaching notes tests
//
// Coverage targets (22 cases):
//   Section A - Role inference (6 cases)
//     1. Fake Out user with Intimidate -> Lead / Pivot or Pivot
//     2. Tailwind user -> Speed Control
//     3. Screen user -> Support / Screens
//     4. Shadow Tag ability -> Control / Trapper
//     5. Priority user on cleaner frame -> Cleaner
//     6. Bare attacker default -> Attacker
//   Section B - Win function inference (3 cases)
//   Section C - Playstyle inference (3 cases)
//   Section D - Lead system aggregation (2 cases)
//   Section E - Loss trends analyzer (3 cases)
//   Section F - Dead moves finder (2 cases)
//   Section G - Coverage gaps + coaching rules (3 cases)
//
// Citations:
//   https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   https://bulbapedia.bulbagarden.net/wiki/Status_move (Fake Out, Tailwind)
//   User-supplied Shadow_Pressure_vFINAL_PLUS.pdf design source

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

// Expose the pure helpers we want to assert on.
vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.inferRole=inferRole;',
  'this.inferWinFunction=inferWinFunction;',
  'this.inferPlaystyle=inferPlaystyle;',
  'this.buildLeadSystem=buildLeadSystem;',
  'this.analyzeLossTrends=analyzeLossTrends;',
  'this.findDeadMoves=findDeadMoves;',
  'this.findCoverageGaps=findCoverageGaps;',
  'this.evaluateCoachingRules=evaluateCoachingRules;',
  'this.COACHING_RULES=COACHING_RULES;',
  'this._verdictFor=_verdictFor;',
  'this._escapeHtml=_escapeHtml;',
  'this.generatePDFReport=generatePDFReport;'
].join(' '), ctx);

const {
  TEAMS, inferRole, inferWinFunction, inferPlaystyle,
  buildLeadSystem, analyzeLossTrends, findDeadMoves, findCoverageGaps,
  evaluateCoachingRules, COACHING_RULES, _verdictFor, _escapeHtml, generatePDFReport
} = ctx;

let pass = 0, fail = 0;
function T(name, fn) { try { fn(); console.log('  PASS', name); pass++; } catch (e) { console.log('  FAIL', name, '-', e.message); fail++; } }
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function inc(hay, needle, msg='') { if (String(hay).indexOf(needle) < 0) throw new Error((msg||'') + ` expected to contain ${JSON.stringify(needle)}`); }

console.log('\n=== T9j.14 - Shadow Pressure PDF + coaching tests ===\n');

// ---- Section A: Role inference ----
T('1. inferRole - Incineroar with Fake Out returns Lead / Pivot', () => {
  eq(inferRole({ name:'Incineroar', ability:'Intimidate', moves:['Fake Out','Flare Blitz','Parting Shot','Knock Off'] }), 'Lead / Pivot');
});
T('2. inferRole - Whimsicott with Tailwind returns Speed Control', () => {
  eq(inferRole({ name:'Whimsicott', ability:'Prankster', moves:['Tailwind','Encore','Moonblast','Protect'] }), 'Speed Control');
});
T('3. inferRole - Grimmsnarl with Reflect returns Support / Screens', () => {
  eq(inferRole({ name:'Grimmsnarl', ability:'Prankster', moves:['Reflect','Light Screen','Spirit Break','Taunt'] }), 'Support / Screens');
});
T('4. inferRole - Gengar with Shadow Tag returns Control / Trapper', () => {
  eq(inferRole({ name:'Gengar-Mega', ability:'Shadow Tag', moves:['Shadow Ball','Sludge Bomb','Protect','Taunt'] }), 'Control / Trapper');
});
T('5. inferRole - Kingambit with Sucker Punch returns Cleaner', () => {
  eq(inferRole({ name:'Kingambit', ability:'Supreme Overlord', moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'] }), 'Cleaner');
});
T('6. inferRole - bare attacker returns Attacker', () => {
  eq(inferRole({ name:'Dragapult', ability:'Clear Body', moves:['Dragon Darts','Phantom Force','U-turn','Protect'] }), 'Attacker');
});

// ---- Section B: Win function inference ----
T('7. inferWinFunction - Fake Out -> tempo', () => {
  eq(inferWinFunction({ name:'Rillaboom', ability:'Grassy Surge', moves:['Fake Out','Grassy Glide','Wood Hammer','U-turn'] }), 'Fake Out + tempo');
});
T('8. inferWinFunction - Trick Room', () => {
  eq(inferWinFunction({ name:'Cresselia', ability:'Levitate', moves:['Trick Room','Moonblast','Helping Hand','Protect'] }), 'Trick Room setter');
});
T('9. inferWinFunction - weather ability without weather moves', () => {
  eq(inferWinFunction({ name:'Torkoal', ability:'Drought', moves:['Heat Wave','Protect','Eruption','Earth Power'] }), 'Spread damage / chip board');
});

// ---- Section C: Playstyle inference ----
T('10. inferPlaystyle - Weather team surfaces weather label', () => {
  const members = [{ name:'Torkoal', ability:'Drought', moves:['Heat Wave'] }, { name:'Venusaur', ability:'Chlorophyll', moves:['Solar Beam'] }];
  inc(inferPlaystyle(members), 'Offense');
});
T('11. inferPlaystyle - Shadow Tag -> Aggressive Control', () => {
  const members = [{ name:'Gengar-Mega', ability:'Shadow Tag', moves:['Shadow Ball'] }, { name:'Incineroar', ability:'Intimidate', moves:['Fake Out'] }];
  eq(inferPlaystyle(members), 'Aggressive Control');
});
T('12. inferPlaystyle - empty team returns Balanced', () => {
  eq(inferPlaystyle([]), 'Balanced');
});

// ---- Section D: Lead system aggregation ----
T('13. buildLeadSystem - Fake Out lead counts as Safe', () => {
  const members = [
    { name:'Incineroar', ability:'Intimidate', moves:['Fake Out'] },
    { name:'Gengar-Mega', ability:'Shadow Tag', moves:['Shadow Ball'] }
  ];
  const results = { opp1: { allLogs: [
    { result: 'win',  leads: { player: ['Incineroar','Gengar-Mega'] } },
    { result: 'win',  leads: { player: ['Incineroar','Gengar-Mega'] } },
    { result: 'loss', leads: { player: ['Incineroar','Gengar-Mega'] } }
  ] } };
  const leads = buildLeadSystem(results, members);
  eq(leads.safe, 'Gengar-Mega + Incineroar');         // both sorted alphabetically
  eq(leads.pressure, 'Gengar-Mega + Incineroar');     // trap ability also fires
});
T('14. buildLeadSystem - empty results returns nulls', () => {
  const leads = buildLeadSystem({}, []);
  eq(leads.safe, null); eq(leads.speed, null); eq(leads.pressure, null); eq(leads.punish, null);
});

// ---- Section E: Loss trend analyzer ----
T('15. analyzeLossTrends - counts losses, TR pct, first-KO turn', () => {
  const members = [{ name:'Gengar-Mega' }, { name:'Kingambit' }];
  const results = { opp1: { allLogs: [
    { result: 'loss', trTurns: 3, twTurnsOpp: 0, oppKey:'opp1', log:[
      '[TURN 1]', 'Opp used Shadow Ball', 'Gengar-Mega fainted!',
      '[TURN 2]', 'Opp used Iron Head', 'Kingambit fainted!'
    ] },
    { result: 'loss', trTurns: 0, twTurnsOpp: 2, oppKey:'opp1', log:[
      '[TURN 1]', '[TURN 2]', 'Opp used Earthquake', 'Gengar-Mega fainted!'
    ] },
    { result: 'win', trTurns: 0, twTurnsOpp: 0, oppKey:'opp1', log:[] }
  ] } };
  const t = analyzeLossTrends(results, members);
  eq(t.totalLosses, 2);
  eq(t.trPctInLosses, 50);
  eq(t.twPctInLosses, 50);
  truthy(t.avgFirstKoTurn > 0, 'avgFirstKoTurn must be > 0');
});
T('16. analyzeLossTrends - mostLostMons lists most-fainted player mon first', () => {
  const members = [{ name:'Gengar-Mega' }, { name:'Kingambit' }];
  const results = { opp1: { allLogs: [
    { result: 'loss', log:['Gengar-Mega fainted!','Gengar-Mega fainted!','Kingambit fainted!'] },
    { result: 'loss', log:['Gengar-Mega fainted!'] }
  ] } };
  const t = analyzeLossTrends(results, members);
  eq(t.mostLostMons[0], 'Gengar-Mega');
});
T('17. analyzeLossTrends - no losses -> safe defaults', () => {
  const t = analyzeLossTrends({}, []);
  eq(t.totalLosses, 0); eq(t.trPctInLosses, 0); eq(t.avgFirstKoTurn, 0);
});

// ---- Section F: Dead-move finder ----
T('18. findDeadMoves - move never used in a win is flagged', () => {
  const members = [{ name:'Gengar-Mega', moves:['Shadow Ball','Hypnosis','Taunt','Protect'] }];
  const results = { opp1: { allLogs: [
    { result: 'win', log:['Gengar-Mega used Shadow Ball!','Gengar-Mega used Protect'] },
    { result: 'loss', log:['Gengar-Mega used Hypnosis!'] }  // loss logs do not count
  ] } };
  const dead = findDeadMoves(results, members);
  const moves = dead.map(d => d.move).sort();
  eq(moves.length, 2);
  eq(moves[0], 'Hypnosis');
  eq(moves[1], 'Taunt');
});
T('19. findDeadMoves - all moves used -> empty list', () => {
  const members = [{ name:'A', moves:['M1','M2'] }];
  const results = { o: { allLogs: [{ result:'win', log:['A used M1','A used M2'] }] } };
  eq(findDeadMoves(results, members).length, 0);
});

// ---- Section G: Coverage gaps + coaching rules ----
T('20. findCoverageGaps - team with no Fake Out surfaces gap', () => {
  const members = [{ name:'Dragapult', ability:'Clear Body', moves:['Dragon Darts','Phantom Force','U-turn','Protect'] }];
  const gaps = findCoverageGaps(members);
  inc(gaps.join(','), 'Fake Out');
});
T('21. evaluateCoachingRules - critical flags surface before suggested', () => {
  const ctx2 = {
    playstyle: 'Balanced', members: [], results: {},
    trends: { totalLosses: 10, trPctInLosses: 50, twPctInLosses: 50, avgFirstKoTurn: 2.0, mostLostMons:['X'], topOppFinishers:['Y'] },
    gaps: ['Speed Control', 'Fake Out'],
    deadMoves: [{ pokemon:'X', move:'Bad Move' }],
    overallWR: 0.30
  };
  const notes = evaluateCoachingRules(ctx2);
  truthy(notes.length >= 5, 'expected multiple rules to fire');
  eq(notes[0].severity, 'critical');
});
T('22. evaluateCoachingRules - clean team only fires optional / dead-move rules', () => {
  const ctx2 = {
    playstyle: 'Balanced', members: [], results: {},
    trends: { totalLosses: 0, trPctInLosses: 0, twPctInLosses: 0, avgFirstKoTurn: 0, mostLostMons:[], topOppFinishers:[] },
    gaps: [],
    deadMoves: [],
    overallWR: 0.75
  };
  const notes = evaluateCoachingRules(ctx2);
  eq(notes.filter(n => n.severity === 'critical').length, 0);
});

// ---- Bonus: verdict helper + escape ----
T('23. _verdictFor - boundaries (65/45/30)', () => {
  eq(_verdictFor(70).label, 'Favorable');
  eq(_verdictFor(50).label, 'Even');
  eq(_verdictFor(35).label, 'Risky');
  eq(_verdictFor(10).label, 'Avoid');
});
T('24. _escapeHtml - escapes angle brackets and quotes', () => {
  eq(_escapeHtml('<script>"&bad"</script>'), '&lt;script&gt;&quot;&amp;bad&quot;&lt;/script&gt;');
});

// ---- Integration: generatePDFReport renders without throwing on a real team ----
T('25. generatePDFReport renders HTML into pdf-report-container without throwing', () => {
  // Prime lastSimResults minimally so sections render.
  ctx.window.lastSimResults = { mega_altaria: { winRate: 0.6, wins: 6, losses: 3, draws: 1, winConditions: { 'Opponent Fainted': 5 }, allLogs: [{ result:'win', leads:{ player:['Incineroar','Gengar-Mega']}, log:[] }] } };
  vm.runInContext('window.lastSimResults = ' + JSON.stringify(ctx.window.lastSimResults) + ';', ctx);
  vm.runInContext('generatePDFReport();', ctx);
  const container = ctx.document.getElementById('pdf-report-container');
  inc(container.innerHTML, 'TEAM OVERVIEW');
  inc(container.innerHTML, 'COACHING NOTES');
  inc(container.innerHTML, 'MATCHUP GUIDE');
});

console.log(`\nT9j.14 Results: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
