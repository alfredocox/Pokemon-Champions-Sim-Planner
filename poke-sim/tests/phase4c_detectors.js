// Phase 4c (Refs PHASE4C_DETECTORS_SPEC.md) - Detectors + confidence badges.
//
// Headless tests for csConfidenceBadge / csDetectDeadMoves /
// csComputeLeadPerformance / csDetectLossConditions. Uses the same VM
// harness as t9j17_tests.js so these run with `node tests/phase4c_detectors.js`
// without bundling.
//
// Fixtures (per spec section 6):
//   A. Small sample (8 games)         - insufficient-data behavior
//   B. Typical sample (47 games)      - dominant TR-unanswered loss pattern
//   C. Large sample (200 games)       - regression for the hard invariant
//                                       'same advice after 100 battles = failing'
//   D. High-n null effect (100 games) - 51% win rate must surface as
//                                       'inconclusive', not 'high'.
//
// All fixtures construct flat game objects matching the sim-log shape that
// computeTeamHistory consumes (see _csGameFromBattle in ui.js): result,
// turns, leads, koEvents, trTurns, twTurns, movesUsed, protectStreakMax.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module:{}, exports:{}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window: {},
  document: (function(){
    function stubEl() {
      return {
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        style: {},
        innerHTML: '',
        textContent: '',
        value: '',
        options: [],
        children: [],
        querySelector: () => stubEl(),
        querySelectorAll: () => [],
        click: () => {},
        focus: () => {},
        blur: () => {}
      };
    }
    return {
      getElementById: () => stubEl(),
      querySelector: () => stubEl(),
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      body: stubEl(),
      documentElement: stubEl(),
      head: stubEl(),
      createElement: () => stubEl()
    };
  })(),
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  }
};
ctx.window.matchMedia = () => ({ matches: false });
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.removeEventListener = () => {};
vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f }); }
load('data.js');
try { load('legality.js'); } catch (_) {}
load('engine.js');
// strategy-injectable defines TEAM_META; load before ui.js so detectors
// that read TEAM_META[teamKey].guide find a populated table.
try { load('strategy-injectable.js'); } catch (_) {}
load('ui.js');

// Re-expose detector globals from the VM for direct calls.
vm.runInContext([
  'this.csConfidenceBadge = csConfidenceBadge;',
  'this.csDetectDeadMoves = csDetectDeadMoves;',
  'this.csComputeLeadPerformance = csComputeLeadPerformance;',
  'this.csDetectLossConditions = csDetectLossConditions;',
  'this.CS_PHASE4C = CS_PHASE4C;',
  'this.TEAMS = TEAMS;'
].join(' '), ctx);

let PASS = 0, FAIL = 0;
function T(name, fn) {
  try { fn(); console.log(`  PASS ${name}`); PASS++; }
  catch (e) { console.log(`  FAIL ${name} :: ${e.message}`); FAIL++; }
}
function eq(a, b, msg)     { if (a !== b) throw new Error((msg||'') + ` expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function truthy(v, m)      { if (!v) throw new Error(m || 'not truthy'); }
function falsy(v, m)       { if (v)  throw new Error(m || 'not falsy'); }
function approx(a, b, eps, m) { if (Math.abs(a-b) > eps) throw new Error((m||'') + ` expected ~${b} got ${a}`); }
function gte(a, b, m)      { if (!(a >= b)) throw new Error((m||'') + ` expected ${a} >= ${b}`); }

// =========================================================================
// Helpers: build flat games matching _csGameFromBattle output.
// =========================================================================

// Default lead pair (alphabetically sorted on extract).
const TEAM_KEY = 'player'; // uses the canonical 'player' team in TEAMS

// Discover the player team's actual member names from the in-VM TEAMS map.
const _team = ctx.TEAMS && ctx.TEAMS[TEAM_KEY];
const _members = (_team && _team.members) || [];
const _memNames = _members.map(m => m.name);
if (!_memNames.length) throw new Error('TEAMS["player"] missing or empty - test setup broken');

// Pick a stable lead pair (first two members) so tests are deterministic.
const LEAD_A = _memNames[0];
const LEAD_B = _memNames[1] || _memNames[0];
const LEAD_PAIR = [LEAD_A, LEAD_B].slice().sort();

// Build an alternate lead pair for variance.
const LEAD_C = _memNames[2] || _memNames[0];
const LEAD_D = _memNames[3] || _memNames[1] || _memNames[0];
const LEAD_PAIR_ALT = [LEAD_C, LEAD_D].slice().sort();

// Pick the first member's first move as the move that ALWAYS gets called
// in our seeded games. Pick its last move as the DEAD move (never called).
const _firstMember = _members[0];
const ACTIVE_MOVE = (_firstMember && _firstMember.moves && _firstMember.moves[0]) || 'Tackle';
const DEAD_MOVE   = (_firstMember && _firstMember.moves && _firstMember.moves[_firstMember.moves.length - 1]) || 'Tackle';

function makeGame(opts) {
  opts = opts || {};
  const result = opts.result || 'win';
  const lead = opts.lead || LEAD_PAIR;
  const turns = opts.turns || 7;
  const trTurns = opts.trTurns || 0;
  const twTurns = opts.twTurns || 0;
  const koEvents = Array.isArray(opts.koEvents) ? opts.koEvents : [];
  const movesUsed = opts.movesUsed || (function(){
    const mu = {};
    mu[LEAD_A] = {};
    mu[LEAD_A][ACTIVE_MOVE] = 4; // active move always called
    return mu;
  })();
  const protectStreakMax = opts.protectStreakMax || {};
  return {
    result, turns,
    leads: { player: lead.slice(), opponent: ['Foo','Bar'] },
    bring: { player: [], opponent: [] },
    playerSurvivors: result === 'win' ? 2 : 0,
    oppSurvivors:    result === 'win' ? 0 : 2,
    winCondition: null,
    trTurns, twTurns,
    koEvents,
    movesUsed,
    protectStreakMax
  };
}

// =========================================================================
// FIXTURE A - Small sample (8 games)
// =========================================================================
console.log('\nFixture A - small sample (8 games)');
{
  const games = [];
  for (let i = 0; i < 5; i++) games.push(makeGame({ result: 'win' }));
  for (let i = 0; i < 3; i++) games.push(makeGame({ result: 'loss' }));

  T('A1. csConfidenceBadge(8) returns low tier', () => {
    const c = ctx.csConfidenceBadge(8);
    eq(c.tier, 'low', 'tier');
  });
  T('A2. csConfidenceBadge(0) returns none', () => {
    eq(ctx.csConfidenceBadge(0).tier, 'none');
  });
  T('A3. csDetectDeadMoves returns [] below DEAD_MOVE_MIN_GAMES', () => {
    const out = ctx.csDetectDeadMoves(games, TEAM_KEY);
    eq(out.length, 0, 'expected no dead moves with only 8 games');
  });
  T('A4. csComputeLeadPerformance keeps only n >= LEAD_MIN_GAMES (5)', () => {
    const out = ctx.csComputeLeadPerformance(games);
    out.forEach(r => gte(r.n, ctx.CS_PHASE4C.LEAD_MIN_GAMES));
  });
  T('A5. csDetectLossConditions returns [] below LOSS_MIN_GAMES (15)', () => {
    const out = ctx.csDetectLossConditions(games, TEAM_KEY);
    eq(out.length, 0, 'expected no loss conditions below 15 games');
  });
}

// =========================================================================
// FIXTURE B - Typical sample (47 games)
// 30 wins + 17 losses, with TR-unanswered in 9 of 17 losses, 2 of 30 wins.
// =========================================================================
console.log('\nFixture B - typical sample (47 games)');
{
  const games = [];

  // 30 wins. 2 of them have TR-unanswered (low base rate).
  for (let i = 0; i < 30; i++) {
    const trUnanswered = i < 2;
    const mu = {}; mu[LEAD_A] = {}; mu[LEAD_A][ACTIVE_MOVE] = 4;
    games.push(makeGame({
      result: 'win',
      lead: LEAD_PAIR,
      trTurns: trUnanswered ? 5 : 0,
      movesUsed: mu  // never includes 'Trick Room'
    }));
  }
  // 17 losses. 9 have TR-unanswered (high in losses).
  for (let i = 0; i < 17; i++) {
    const trUnanswered = i < 9;
    const mu = {}; mu[LEAD_A] = {}; mu[LEAD_A][ACTIVE_MOVE] = 3;
    games.push(makeGame({
      result: 'loss',
      lead: i < 10 ? LEAD_PAIR : LEAD_PAIR_ALT,
      trTurns: trUnanswered ? 5 : 0,
      movesUsed: mu
    }));
  }

  T('B1. tr_unanswered detected with high lift', () => {
    const out = ctx.csDetectLossConditions(games, TEAM_KEY);
    const tr = out.find(r => r.condition === 'tr_unanswered');
    truthy(tr, 'expected tr_unanswered to be flagged');
    // loss_freq = 9/17 ≈ 0.529, win_freq = 2/30 ≈ 0.067, lift ≈ 0.46
    gte(tr.lift, 0.40);
    eq(tr.severity, 'high');
  });
  T('B2. confidence reported for tr_unanswered', () => {
    const out = ctx.csDetectLossConditions(games, TEAM_KEY);
    const tr = out.find(r => r.condition === 'tr_unanswered');
    truthy(tr.confidence, 'has confidence tier');
    truthy(typeof tr.confidence_reason === 'string' && tr.confidence_reason.length > 0, 'has reason string');
  });
  T('B3. dead move flagged for the move never called', () => {
    const out = ctx.csDetectDeadMoves(games, TEAM_KEY);
    const dead = out.find(d => d.pokemon === LEAD_A && d.move === DEAD_MOVE);
    truthy(dead, 'expected ' + LEAD_A + ' / ' + DEAD_MOVE + ' to be flagged dead');
    eq(dead.calls, 0);
    // total_games = 47, 0 calls -> avg = 0, severity 'low' per Q2 (count=0 >= 25 games)
    eq(dead.severity, 'low', 'count=0 case must be low severity per locked Q2');
  });
  T('B4. lead performance returns at least one entry', () => {
    const leads = ctx.csComputeLeadPerformance(games);
    gte(leads.length, 1);
    leads.forEach(r => gte(r.n, ctx.CS_PHASE4C.LEAD_MIN_GAMES));
  });
  T('B5. lead performance excludes draws (no draws synthesized = invariant holds)', () => {
    const leads = ctx.csComputeLeadPerformance(games);
    leads.forEach(r => eq(r.n, r.w + r.l, 'n must equal w+l (no draws bucket)'));
  });
}

// =========================================================================
// FIXTURE C - Large sample (200 games), shifting dominant pattern.
// First 100: TR-unanswered dominant. Second 100: protect overuse dominant.
// Regression for the hard invariant: 'same advice after 100 battles = failing'.
// =========================================================================
console.log('\nFixture C - large sample (200 games), shifting pattern');
{
  function buildHalf(opts) {
    // opts.pattern: 'tr' or 'protect'
    const games = [];
    // 60 wins
    for (let i = 0; i < 60; i++) {
      const mu = {}; mu[LEAD_A] = {}; mu[LEAD_A][ACTIVE_MOVE] = 4;
      games.push(makeGame({ result: 'win', lead: LEAD_PAIR, movesUsed: mu }));
    }
    // 40 losses
    for (let i = 0; i < 40; i++) {
      const mu = {}; mu[LEAD_A] = {}; mu[LEAD_A][ACTIVE_MOVE] = 3;
      const present = i < 24; // 60% of losses
      const opt = { result: 'loss', lead: LEAD_PAIR, movesUsed: mu };
      if (opts.pattern === 'tr')      opt.trTurns = present ? 5 : 0;
      if (opts.pattern === 'protect') opt.protectStreakMax = present ? { 'Test:Foo': 3 } : {};
      games.push(makeGame(opt));
    }
    return games;
  }
  const firstHalf  = buildHalf({ pattern: 'tr' });        // 100 games
  const secondHalf = buildHalf({ pattern: 'protect' });   // 100 games
  const all200 = firstHalf.concat(secondHalf);

  function dominant(out) {
    if (!out.length) return null;
    return out[0].condition; // sort places severity high first
  }

  T('C1. first 100: tr_unanswered is dominant', () => {
    const out = ctx.csDetectLossConditions(firstHalf, TEAM_KEY);
    const tr = out.find(r => r.condition === 'tr_unanswered' && r.severity === 'high');
    truthy(tr, 'tr_unanswered must be flagged high in first 100');
  });
  T('C2. full 200: ranking changes (advice updates after 100 battles)', () => {
    const outA = ctx.csDetectLossConditions(firstHalf, TEAM_KEY);
    const outB = ctx.csDetectLossConditions(all200, TEAM_KEY);
    // Both arrays must be non-empty; either dominant condition changes OR
    // a new condition flag appears in B that was absent in A.
    truthy(outA.length > 0, 'A must have flags');
    truthy(outB.length > 0, 'B must have flags');
    const idsA = outA.map(r => r.condition).sort();
    const idsB = outB.map(r => r.condition).sort();
    const dominantA = dominant(outA);
    const dominantB = dominant(outB);
    const rankChanged = (dominantA !== dominantB);
    const flagsChanged = JSON.stringify(idsA) !== JSON.stringify(idsB);
    truthy(rankChanged || flagsChanged,
      'expected dominant condition or flag set to change between A (' + JSON.stringify(idsA) +
      ') and B (' + JSON.stringify(idsB) + ')');
  });
  T('C3. protect_overuse_loss appears in B (was not dominant in A)', () => {
    const outB = ctx.csDetectLossConditions(all200, TEAM_KEY);
    const po = outB.find(r => r.condition === 'protect_overuse_loss');
    truthy(po, 'protect_overuse_loss must surface in full-200 view');
  });
}

// =========================================================================
// FIXTURE D - High-n null effect (epistemic honesty regression).
// 100 games on a single lead pair, 51 wins / 49 losses.
// =========================================================================
console.log('\nFixture D - high-n null effect (51% over 100 games)');
{
  T('D1. csConfidenceBadge(100, 0.51) returns inconclusive (NOT high)', () => {
    const c = ctx.csConfidenceBadge(100, 0.51);
    eq(c.tier, 'inconclusive', 'tier must be inconclusive at 51% over 100 games');
    truthy(/no detectable edge/i.test(c.reason), 'reason must mention "no detectable edge"');
    truthy(/\|z\|=/.test(c.reason), 'reason must include |z| value');
    truthy(typeof c.z === 'number', 'z must be returned');
    truthy(Math.abs(c.z) < ctx.CS_PHASE4C.EFFECT_SIZE_Z, '|z| must be < 1.96');
  });
  T('D2. csConfidenceBadge(100, 0.70) is high (real edge)', () => {
    const c = ctx.csConfidenceBadge(100, 0.70);
    eq(c.tier, 'high', '0.70 over 100 games is a clear edge -> high');
  });
  T('D3. csConfidenceBadge(100, 0.30) is high (real edge in opposite direction)', () => {
    const c = ctx.csConfidenceBadge(100, 0.30);
    eq(c.tier, 'high', '0.30 over 100 games is a clear losing edge -> high (negative z passes)');
  });
  T('D4. lead performance row at 51% over 100 games carries inconclusive', () => {
    const games = [];
    // 51 wins, 49 losses, all on the same lead pair.
    for (let i = 0; i < 51; i++) games.push(makeGame({ result: 'win',  lead: LEAD_PAIR }));
    for (let i = 0; i < 49; i++) games.push(makeGame({ result: 'loss', lead: LEAD_PAIR }));
    const out = ctx.csComputeLeadPerformance(games);
    const row = out.find(r => r.lead.join('|') === LEAD_PAIR.join('|'));
    truthy(row, 'expected lead row');
    eq(row.confidence, 'inconclusive', 'high-n null-effect lead must be inconclusive, not high');
  });
}

// =========================================================================
// FINAL
// =========================================================================
console.log('\n' + '='.repeat(60));
console.log(`Phase 4c Detectors: ${PASS} pass, ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
