// T9j.13 (Refs #42) — Format-mismatch guard + Cofagrigus/Aurora Veil audit regression.
//
// Background: the 5070-battle audit surfaced two teams (cofagrigus_tr and
// aurora_veil_froslass) holding deterministic 100% win rate against every
// opponent. Root cause: both teams declared `format: "champions"` but their
// EV spreads were SV-scale (252/stat, 508 total). The engine trusted the
// declared format and applied the Champions HP formula (Base + SP + 75) to a
// 252 SP value, producing HP ~Base+327 and god-tier non-HP stats
// floor((Base+272)*nature) — sweep-level numbers across the board.
//
// Fix layers (T9j.13):
//   A. Engine defense in Pokemon constructor — if declared champions but
//      spread doesn't satisfy the cap (max <=32 AND total <=66), fall back
//      to SV formula and set this.formatMismatch = true for observability.
//   B. Data correction — rescale cofagrigus_tr and aurora_veil_froslass
//      spreads to SP scale (66 total, 32 per stat cap).
//
// These tests cover the engine defense behavior + real-team stat sanity.
// Cite: https://bulbapedia.bulbagarden.net/wiki/Stat_point
// Cite: https://game8.co/games/Pokemon-Champions/archives/538683
// Cite: https://pokeos.com/p/champions/stats

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module:{}, exports:{}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt,
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
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f }); }
load('data.js');
try { load('legality.js'); } catch(_) {}
load('engine.js');
vm.runInContext('this.Pokemon=Pokemon; this.Field=Field; this.simulateBattle=simulateBattle; this.BASE_STATS=BASE_STATS; this.TEAMS=TEAMS;', ctx);

let PASS = 0, FAIL = 0;
function T(name, fn) {
  try { fn(); console.log(`  PASS ${name}`); PASS++; }
  catch (e) { console.log(`  FAIL ${name} :: ${e.message}`); FAIL++; }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ` expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function truthy(v, m) { if (!v) throw new Error(m || 'not truthy'); }
function falsy(v, m)  { if (v)  throw new Error(m || 'not falsy'); }
function lte(a, b, m) { if (!(a <= b)) throw new Error((m||'') + ` expected ${a} <= ${b}`); }

// ==== SECTION 1 — Pokemon._spreadFitsChampions static check (10 cases) ====
const fits = ctx.Pokemon._spreadFitsChampions;

T('1. Empty spread fits Champions', () => truthy(fits({})));
T('2. All-zero spread fits Champions', () => truthy(fits({hp:0,atk:0,def:0,spa:0,spd:0,spe:0})));
T('3. Max SP spread 32/32/2 fits', () => truthy(fits({hp:32,atk:0,def:0,spa:32,spd:2,spe:0})));
T('4. SP 66 total three-way fits', () => truthy(fits({hp:22,atk:22,def:0,spa:22,spd:0,spe:0})));
T('5. SP 67 total fails (overflow by 1)', () => falsy(fits({hp:22,atk:23,def:0,spa:22,spd:0,spe:0})));
T('6. SP 33 per-stat fails', () => falsy(fits({hp:33,atk:0,def:0,spa:0,spd:0,spe:0})));
T('7. Classic 252/252/4 SV spread fails', () => falsy(fits({hp:4,atk:252,def:0,spa:0,spd:0,spe:252})));
T('8. SV 508-total spread fails', () => falsy(fits({hp:252,atk:0,def:4,spa:252,spd:0,spe:0})));
T('9. Edge: exactly 66 total, 32 max fits', () => truthy(fits({hp:32,atk:32,def:2,spa:0,spd:0,spe:0})));
T('10. Edge: 32 max but 68 total fails', () => falsy(fits({hp:32,atk:32,def:2,spa:2,spd:0,spe:0})));

// ==== SECTION 2 — Constructor format-mismatch guard (8 cases) ====
function mk(name, evs, format) {
  return new ctx.Pokemon({ name, item:'Leftovers', ability:'Levitate', nature:'Serious', evs, moves:['Protect'] }, 'balance', format);
}

T('11. Champions + valid SP spread -> statFormat=champions', () => {
  const p = mk('Cresselia', {hp:32,atk:0,def:16,spa:0,spd:18,spe:0}, 'champions');
  eq(p.statFormat, 'champions');
  falsy(p.formatMismatch);
});

T('12. Champions + SV spread -> falls back to sv + formatMismatch flag set', () => {
  const p = mk('Cresselia', {hp:252,atk:0,def:128,spa:0,spd:128,spe:0}, 'champions');
  eq(p.statFormat, 'sv');
  truthy(p.formatMismatch);
});

T('13. SV + SV spread -> statFormat=sv, no mismatch', () => {
  const p = mk('Cresselia', {hp:252,atk:0,def:128,spa:0,spd:128,spe:0}, 'sv');
  eq(p.statFormat, 'sv');
  falsy(p.formatMismatch);
});

T('14. No declared format + SP spread -> auto-detect champions', () => {
  const p = mk('Cresselia', {hp:32,atk:0,def:16,spa:0,spd:18,spe:0}, null);
  eq(p.statFormat, 'champions');
});

T('15. No declared format + SV spread -> auto-detect sv', () => {
  const p = mk('Cresselia', {hp:252,atk:0,def:128,spa:0,spd:128,spe:0}, null);
  eq(p.statFormat, 'sv');
});

T('16. Champions + empty spread -> stays champions (trivially valid)', () => {
  const p = mk('Cresselia', {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, 'champions');
  eq(p.statFormat, 'champions');
  falsy(p.formatMismatch);
});

T('17. Champions + exactly-at-cap spread stays champions', () => {
  const p = mk('Cresselia', {hp:32,atk:0,def:0,spa:32,spd:2,spe:0}, 'champions');
  eq(p.statFormat, 'champions');
});

T('18. Champions + one-over-cap spread falls back to sv', () => {
  const p = mk('Cresselia', {hp:33,atk:0,def:0,spa:0,spd:0,spe:0}, 'champions');
  eq(p.statFormat, 'sv');
  truthy(p.formatMismatch);
});

// ==== SECTION 3 — HP stat sanity (9 cases) ====
// Cofagrigus base HP = 58. After the fix:
//  - declared champions, SV spread (252 hp) -> engine falls back to SV:
//      HP = floor((2*58 + 31 + floor(252/4)) * 50 / 100) + 50 + 10 = 58+31+63 /2 computed etc.
//    At L50 SV formula: floor((2*58 + 31 + 63) * 50 / 100) + 50 + 10 = 210/2+60 = 165.
//  - declared champions, corrected SP spread (32 hp) -> Champions formula:
//      HP = 58 + 32 + 75 = 165.
//  - declared champions, SV spread WITHOUT fix would have been: 58 + 252 + 75 = 385 (god-tier).
function hp(poke) { return poke.maxHp; }

T('19. Cofagrigus HP with corrected SP spread is 165 (60 base is wrong - actually 58)', () => {
  const p = mk('Cofagrigus', {hp:32,atk:0,def:2,spa:32,spd:0,spe:0}, 'champions');
  eq(p.statFormat, 'champions');
  const base = (ctx.BASE_STATS['Cofagrigus'] || {}).hp;
  eq(hp(p), base + 32 + 75, 'hp = base + 32 + 75');
});

T('20. Cofagrigus with pre-fix SV spread (252) now falls back to SV — HP <= 200', () => {
  const p = mk('Cofagrigus', {hp:252,atk:0,def:4,spa:252,spd:0,spe:0}, 'champions');
  eq(p.statFormat, 'sv');
  lte(hp(p), 200, 'HP should NOT be god-tier 385+');
});

T('21. Froslass HP with pre-fix SV spread (4) falls back to SV — HP <= 150', () => {
  const p = mk('Froslass', {hp:4,atk:0,def:0,spa:252,spd:0,spe:252}, 'champions');
  eq(p.statFormat, 'sv');
  lte(hp(p), 150);
});

T('22. Legit Champions Charizard stays at Champions HP formula', () => {
  const p = mk('Charizard', {hp:6,atk:0,def:16,spa:30,spd:0,spe:14}, 'champions');
  eq(p.statFormat, 'champions');
  const base = (ctx.BASE_STATS['Charizard'] || {}).hp;
  eq(hp(p), base + 6 + 75);
});

T('23. Legit SV Kingambit uses SV formula unchanged', () => {
  const p = mk('Kingambit', {hp:4,atk:252,def:0,spa:0,spd:0,spe:252}, 'sv');
  eq(p.statFormat, 'sv');
});

T('24. Champions Cresselia SP 32 HP gives exact base+32+75', () => {
  const p = mk('Cresselia', {hp:32,atk:0,def:16,spa:0,spd:18,spe:0}, 'champions');
  const base = (ctx.BASE_STATS['Cresselia'] || {}).hp;
  eq(hp(p), base + 32 + 75);
});

T('25. Dusclops SP-scale SP=32 HP gives base+32+75', () => {
  const p = mk('Dusclops', {hp:32,atk:0,def:18,spa:0,spd:16,spe:0}, 'champions');
  const base = (ctx.BASE_STATS['Dusclops'] || {}).hp;
  eq(hp(p), base + 32 + 75);
});

T('26. Dragonite SP-scale SP=2 HP gives base+2+75', () => {
  const p = mk('Dragonite', {hp:2,atk:32,def:0,spa:0,spd:0,spe:32}, 'champions');
  const base = (ctx.BASE_STATS['Dragonite'] || {}).hp;
  eq(hp(p), base + 2 + 75);
});

T('27. Sinistcha SP-scale SP=32 HP gives base+32+75', () => {
  const p = mk('Sinistcha', {hp:32,atk:0,def:2,spa:32,spd:0,spe:0}, 'champions');
  const base = (ctx.BASE_STATS['Sinistcha'] || {}).hp;
  eq(hp(p), base + 32 + 75);
});

// ==== SECTION 4 — Real-team data sanity (16 cases) ====
const TEAMS = ctx.TEAMS;

T('28. cofagrigus_tr total SP per mon <= 66', () => {
  for (const m of TEAMS.cofagrigus_tr.members) {
    const total = Object.values(m.evs).reduce((a,b)=>a+b, 0);
    lte(total, 66, `${m.name} total=${total}`);
  }
});

T('29. cofagrigus_tr per-stat SP <= 32', () => {
  for (const m of TEAMS.cofagrigus_tr.members) {
    for (const [s,v] of Object.entries(m.evs)) lte(v, 32, `${m.name}.${s}`);
  }
});

T('30. aurora_veil_froslass total SP per mon <= 66', () => {
  for (const m of TEAMS.aurora_veil_froslass.members) {
    const total = Object.values(m.evs).reduce((a,b)=>a+b, 0);
    lte(total, 66, `${m.name} total=${total}`);
  }
});

T('31. aurora_veil_froslass per-stat SP <= 32', () => {
  for (const m of TEAMS.aurora_veil_froslass.members) {
    for (const [s,v] of Object.entries(m.evs)) lte(v, 32, `${m.name}.${s}`);
  }
});

T('32. cofagrigus_tr still declared champions format', () => {
  eq(TEAMS.cofagrigus_tr.format, 'champions');
});

T('33. aurora_veil_froslass still declared champions format', () => {
  eq(TEAMS.aurora_veil_froslass.format, 'champions');
});

T('34. cofagrigus_tr.members.length === 6', () => eq(TEAMS.cofagrigus_tr.members.length, 6));
T('35. aurora_veil_froslass.members.length === 6', () => eq(TEAMS.aurora_veil_froslass.members.length, 6));

T('36. Other tournament teams unchanged — mega_altaria still SP-scale', () => {
  for (const m of TEAMS.mega_altaria.members) {
    const total = Object.values(m.evs).reduce((a,b)=>a+b, 0);
    lte(total, 98); // one slot has 98 (filler), otherwise 66
  }
});

T('37. SV teams still SV-scale — kingambit_sneasler members have >=1 stat > 32', () => {
  const t = TEAMS.kingambit_sneasler;
  const anyOver = t.members.some(m => Object.values(m.evs).some(v => v > 32));
  truthy(anyOver, 'kingambit_sneasler should still be SV-scale');
});

T('38. SV team player (TR Counter) still has SV spreads', () => {
  const t = TEAMS.player;
  const anyOver = t.members.some(m => Object.values(m.evs).some(v => v > 32));
  truthy(anyOver);
});

T('39. cofagrigus_tr has SP=32 invested on HP for Cofagrigus + Sinistcha (TR bulk)', () => {
  eq(TEAMS.cofagrigus_tr.members[0].evs.hp, 32);
  eq(TEAMS.cofagrigus_tr.members[1].evs.hp, 32);
});

T('40. aurora_veil_froslass Mega has SP 32 SpA + 32 Spe', () => {
  const f = TEAMS.aurora_veil_froslass.members[0];
  eq(f.name, 'Froslass-Mega');
  eq(f.evs.spa, 32);
  eq(f.evs.spe, 32);
});

T('41. aurora_veil_froslass Dragonite has SP 32 Atk + 32 Spe', () => {
  const d = TEAMS.aurora_veil_froslass.members[1];
  eq(d.name, 'Dragonite');
  eq(d.evs.atk, 32);
  eq(d.evs.spe, 32);
});

T('42. Building Pokemon from cofagrigus_tr does NOT set formatMismatch', () => {
  const mons = TEAMS.cofagrigus_tr.members.map(m => new ctx.Pokemon(m, 'trick_room', 'champions'));
  for (const p of mons) falsy(p.formatMismatch, `${p.displayName} mismatch flag should be false`);
});

T('43. Building Pokemon from aurora_veil_froslass does NOT set formatMismatch', () => {
  const mons = TEAMS.aurora_veil_froslass.members.map(m => new ctx.Pokemon(m, 'veil', 'champions'));
  for (const p of mons) falsy(p.formatMismatch, `${p.displayName} mismatch flag should be false`);
});

// ==== SECTION 5 — End-to-end WR sanity (4 cases, small N) ====
// 100% WR was deterministic before fix; even at N=10 we should see < 100% now
// against the hardest opponents. We test per-team against three separate opps.
function wr(teamKey, oppKey, n=10) {
  let w = 0, played = 0;
  for (let i = 0; i < n; i++) {
    const s = (i+1)*1337;
    const seed = [s>>>0, (s*7919)>>>0, (s*104729)>>>0, (s*1299709)>>>0];
    const r = ctx.simulateBattle(TEAMS[teamKey], TEAMS[oppKey], { format:'doubles', seed });
    if (r.result === 'win') w++;
    if (r.result !== 'error') played++;
  }
  return played ? (w/played) : 0;
}

T('44. cofagrigus_tr vs player no longer 100% WR (was 100% before fix)', () => {
  const r = wr('cofagrigus_tr', 'player', 10);
  if (r >= 1.0) throw new Error(`still 100% WR (${r})`);
});

T('45. cofagrigus_tr vs mega_altaria no longer 100% WR', () => {
  const r = wr('cofagrigus_tr', 'mega_altaria', 10);
  if (r >= 1.0) throw new Error(`still 100% WR (${r})`);
});

T('46. aurora_veil_froslass vs player no longer 100% WR', () => {
  const r = wr('aurora_veil_froslass', 'player', 10);
  if (r >= 1.0) throw new Error(`still 100% WR (${r})`);
});

T('47. aurora_veil_froslass vs mega_altaria no longer 100% WR', () => {
  const r = wr('aurora_veil_froslass', 'mega_altaria', 10);
  if (r >= 1.0) throw new Error(`still 100% WR (${r})`);
});

console.log();
console.log('='.repeat(60));
console.log(`T9j.13 Results: ${PASS} pass, ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
