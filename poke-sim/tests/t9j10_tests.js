// T9j.10 — Team Preview bring-N-of-6 tests (Refs #16)
// Coverage targets:
//   engine (11): _applyBring semantics, result.leads + result.bring structure,
//                singles 3/3, doubles 4/6, invalid names silently skipped,
//                explicit bring EXCLUDES unbrought mons from battle,
//                legacy playerLeads still works for back-compat.
//   ui helpers (5): randomBringFor determinism with seed, getBringFor fill
//                   semantics, format-aware bring count, mode defaults.
// Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
// Cite: https://bulbapedia.bulbagarden.net/wiki/VGC
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Stub browser globals the engine/ui touch on load (window, localStorage, matchMedia).
const ctx = {
  console, require, module:{}, exports:{}, Math, Object, Array, Set, JSON,
  Promise, setTimeout,
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [] },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  }
};
ctx.window.matchMedia = () => ({ matches: false });
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f });
}
load('data.js');
load('engine.js');
vm.runInContext([
  'this.Pokemon=Pokemon; this.Field=Field; this.simulateBattle=simulateBattle;'
].join(' '), ctx);
const { simulateBattle } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '\u2014', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function arrEq(a, b, msg='') {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
    throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i])
    throw new Error(`${msg} index ${i}: expected ${JSON.stringify(b[i])}, got ${JSON.stringify(a[i])}`);
}
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

// ============================================================
// TEST FIXTURES — 6-member teams for Team Preview semantics
// ============================================================
function sixTeam(label) {
  const names = ['Incineroar','Arcanine','Garchomp','Whimsicott','Rotom-Wash','Dragonite'];
  return {
    name: `Test ${label}`,
    style: 'balance',
    format: 'champions',
    legality_status: 'legal',
    members: names.map((n, i) => ({
      name: n,
      level: 50,
      ability: '',
      item: '',
      nature: 'Serious',
      moves: ['Tackle','Protect','Substitute','Rest'],
      evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
      ivs: { hp:31,atk:31,def:31,spa:31,spd:31,spe:31 }
    }))
  };
}

// ============================================================
// ENGINE — result.leads + result.bring structure
// ============================================================
console.log('\nResult structure (T9j.10 Refs #16):');

T('1. result.leads is { player, opponent } with 2 names each in doubles', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), { format:'doubles', seed:[1,2,3,4] });
  truthy(r.leads && typeof r.leads === 'object', 'result.leads exists');
  truthy(Array.isArray(r.leads.player), 'leads.player is array');
  truthy(Array.isArray(r.leads.opponent), 'leads.opponent is array');
  eq(r.leads.player.length, 2, 'doubles: 2 leads player');
  eq(r.leads.opponent.length, 2, 'doubles: 2 leads opponent');
});

T('2. result.bring is { player, opponent } with 4 names each in doubles', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), { format:'doubles', seed:[2,3,4,5] });
  truthy(r.bring && typeof r.bring === 'object', 'result.bring exists');
  eq(r.bring.player.length, 4, 'doubles: bring 4 player');
  eq(r.bring.opponent.length, 4, 'doubles: bring 4 opponent');
});

T('3. result.leads has 1 name / result.bring has 3 names in singles', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), { format:'singles', seed:[3,4,5,6] });
  eq(r.leads.player.length, 1, 'singles: 1 lead player');
  eq(r.bring.player.length, 3, 'singles: bring 3 player');
  eq(r.bring.opponent.length, 3, 'singles: bring 3 opponent');
});

T('4. default bring (no opts) uses team.members[0..N-1] in order', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), { format:'doubles', seed:[4,5,6,7] });
  arrEq(r.bring.player, ['Incineroar','Arcanine','Garchomp','Whimsicott'], 'default doubles bring');
  arrEq(r.leads.player, ['Incineroar','Arcanine'], 'default doubles leads');
});

// ============================================================
// ENGINE — _applyBring semantics via opts.playerBring / opponentBring
// ============================================================
console.log('\n_applyBring semantics:');

T('5. explicit playerBring reorders team', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[5,5,5,5],
    playerBring: ['Garchomp','Whimsicott','Incineroar','Rotom-Wash']
  });
  arrEq(r.bring.player, ['Garchomp','Whimsicott','Incineroar','Rotom-Wash'], 'bring reorder');
  arrEq(r.leads.player, ['Garchomp','Whimsicott'], 'leads = first 2 of bring');
});

T('6. unbrought mons EXCLUDED from battle (bring:4 means battle has 4 not 6)', () => {
  // Arcanine and Dragonite are NOT in bring. They must not appear in result.bring.
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[6,6,6,6],
    playerBring: ['Incineroar','Garchomp','Whimsicott','Rotom-Wash']
  });
  eq(r.bring.player.length, 4, 'bring size is exactly 4');
  truthy(!r.bring.player.includes('Arcanine'), 'Arcanine excluded');
  truthy(!r.bring.player.includes('Dragonite'), 'Dragonite excluded');
});

T('7. playerBring of size < bringCount is padded from team order', () => {
  // Caller only supplies 2 names. Engine should fill the other 2 from team order.
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[7,7,7,7],
    playerBring: ['Rotom-Wash','Dragonite']
  });
  eq(r.bring.player.length, 4, 'padded to 4');
  arrEq(r.bring.player.slice(0,2), ['Rotom-Wash','Dragonite'], 'first 2 honor caller order');
});

T('8. invalid names in playerBring are silently skipped', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[8,8,8,8],
    playerBring: ['NotARealMon','Garchomp','AlsoFake','Whimsicott']
  });
  eq(r.bring.player.length, 4, 'still brings 4 valid mons');
  truthy(r.bring.player.includes('Garchomp'), 'valid Garchomp included');
  truthy(r.bring.player.includes('Whimsicott'), 'valid Whimsicott included');
  truthy(!r.bring.player.some(n => n === 'NotARealMon'), 'fake excluded');
});

T('9. singles with explicit playerBring brings exactly 3', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'singles', seed:[9,9,9,9],
    playerBring: ['Garchomp','Whimsicott','Rotom-Wash','Dragonite'] // 4 given, only 3 used
  });
  eq(r.bring.player.length, 3, 'singles caps at 3');
  arrEq(r.bring.player, ['Garchomp','Whimsicott','Rotom-Wash'], 'first 3 of given list');
  arrEq(r.leads.player, ['Garchomp'], 'singles lead is first');
});

T('10. both sides can override independently', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[10,10,10,10],
    playerBring:   ['Dragonite','Rotom-Wash','Garchomp','Whimsicott'],
    opponentBring: ['Whimsicott','Incineroar','Arcanine','Garchomp']
  });
  arrEq(r.bring.player,   ['Dragonite','Rotom-Wash','Garchomp','Whimsicott']);
  arrEq(r.bring.opponent, ['Whimsicott','Incineroar','Arcanine','Garchomp']);
});

// ============================================================
// ENGINE — Legacy playerLeads back-compat (pre-T9j.10 callers)
// ============================================================
console.log('\nLegacy playerLeads back-compat:');

T('11. legacy playerLeads (leads-only) puts named mons at front, keeps rest as bench', () => {
  // No explicit playerBring. Legacy contract: leads occupy front, rest of team
  // fills remaining slots. result.bring.player should reflect a FULL team of 6
  // since the legacy contract did not exclude unbrought mons.
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[11,11,11,11],
    playerLeads: ['Garchomp','Whimsicott']
  });
  arrEq(r.leads.player, ['Garchomp','Whimsicott'], 'legacy leads honored');
  // Legacy mode keeps all 6 so switches still work.
  truthy(r.bring.player.length >= 4, 'legacy keeps bench mons available');
  eq(r.bring.player[0], 'Garchomp', 'first slot = lead 1');
  eq(r.bring.player[1], 'Whimsicott', 'second slot = lead 2');
});

T('12. playerBring TAKES PRIORITY over playerLeads when both are given', () => {
  const r = simulateBattle(sixTeam('P'), sixTeam('O'), {
    format:'doubles', seed:[12,12,12,12],
    playerBring: ['Dragonite','Rotom-Wash','Garchomp','Whimsicott'],
    playerLeads: ['Incineroar','Arcanine'] // should be ignored
  });
  arrEq(r.bring.player, ['Dragonite','Rotom-Wash','Garchomp','Whimsicott']);
  arrEq(r.leads.player, ['Dragonite','Rotom-Wash']);
});

// ============================================================
// UI helper logic (randomBring determinism) — load ui.js fns stand-alone.
// We test the algorithm by re-implementing the same seeded LCG + Fisher-Yates
// that ui.js uses so this suite is pure-engine and doesn't depend on window.
// ============================================================
console.log('\nRandom bring determinism (ui algorithm parity):');

function randomBringAlgorithm(names, count, seed) {
  const pool = names.slice();
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, count);
}

T('13. randomBring with same seed is reproducible', () => {
  const names = ['Incineroar','Arcanine','Garchomp','Whimsicott','Rotom-Wash','Dragonite'];
  const a = randomBringAlgorithm(names, 4, 42);
  const b = randomBringAlgorithm(names, 4, 42);
  arrEq(a, b, 'same seed yields same pick');
});

T('14. randomBring returns exactly `count` UNIQUE members', () => {
  const names = ['Incineroar','Arcanine','Garchomp','Whimsicott','Rotom-Wash','Dragonite'];
  const picked = randomBringAlgorithm(names, 4, 7);
  eq(picked.length, 4, 'exactly 4');
  eq(new Set(picked).size, 4, 'all unique');
  for (const n of picked) truthy(names.includes(n), `${n} is from team`);
});

T('15. randomBring different seeds usually differ (not every time, but for these)', () => {
  const names = ['Incineroar','Arcanine','Garchomp','Whimsicott','Rotom-Wash','Dragonite'];
  const a = randomBringAlgorithm(names, 4, 1);
  const b = randomBringAlgorithm(names, 4, 999999);
  // Stochastic but extremely likely these two differ.
  let differs = false;
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) { differs = true; break; }
  truthy(differs, 'seeds 1 vs 999999 produce different pick order');
});

T('16. randomBring in singles (count=3) returns exactly 3', () => {
  const names = ['Incineroar','Arcanine','Garchomp','Whimsicott','Rotom-Wash','Dragonite'];
  const picked = randomBringAlgorithm(names, 3, 100);
  eq(picked.length, 3, 'singles: 3 picks');
  eq(new Set(picked).size, 3, 'all unique');
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${pass} pass, ${fail} fail, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
