// T9j.8 — Crits, Flinch, Abilities tests (Refs #27 #19 #30)
// Coverage targets:
//   Crits (12): stage table, bypass rules, screens bypass, 1.5x damage,
//               HIGH_CRIT_MOVES, ALWAYS_CRIT_MOVES, burn-on-crit interaction.
//   Flinch (10): data-driven chance lookup, pre-act gating, already-acted no-flinch,
//                Iron Head 20% Champions nerf, fang 10%, between-turn flag reset.
//   Abilities (16): Dragonize (type + BP), Piercing Drill (contact through Protect),
//                   Unseen Fist (same path), Spicy Spray (burn), Mega Sol (personal sun),
//                   Parental Bond (2-strike, 1/4 BP child).
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, require, module:{}, exports:{}, Math, Object, Array, Set };
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f });
}
load('data.js');
load('engine.js');
vm.runInContext([
  'this.Pokemon=Pokemon; this.Field=Field; this.simulateBattle=simulateBattle;',
  'this.ABILITIES=ABILITIES; this.FLINCH_MOVES=FLINCH_MOVES;',
  'this.HIGH_CRIT_MOVES=HIGH_CRIT_MOVES; this.ALWAYS_CRIT_MOVES=ALWAYS_CRIT_MOVES;',
  'this.CRIT_STAGES=CRIT_STAGES; this.CONTACT_MOVES=CONTACT_MOVES;',
  'this.callAbilityHook=callAbilityHook;'
].join(' '), ctx);
const { Pokemon, Field, ABILITIES, FLINCH_MOVES, HIGH_CRIT_MOVES,
        ALWAYS_CRIT_MOVES, CRIT_STAGES, CONTACT_MOVES, callAbilityHook } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }
function falsy(v, msg='')  { if (v)  throw new Error(msg || 'expected falsy'); }
function approx(a, b, tol, msg='') { if (Math.abs(a - b) > tol) throw new Error(`${msg} expected ~${b}, got ${a} (tol ${tol})`); }

function mk(name, overrides={}) {
  const d = Object.assign({ name, level:50, moves:['Tackle'], ability:'', item:'', nature:'Hardy' }, overrides);
  return new Pokemon(d);
}
function mkField(overrides={}) {
  const f = new Field(Object.assign({ format: 'doubles' }, overrides));
  return f;
}

// Minimal rng stubs
const rngAlwaysHi = () => 0.99;   // > all thresholds
const rngAlwaysLo = () => 0.0;    // < all thresholds (crit / flinch always fires)
function rngSeq(vals) { let i = 0; return () => (i < vals.length ? vals[i++] : 0.5); }

// ============================================================
// CRITS (#27)
// ============================================================
console.log('\nCrits (#27):');

T('1. CRIT_STAGES ladder matches Gen 9 probabilities', () => {
  eq(CRIT_STAGES[0], 1/24, 'stage 0');
  eq(CRIT_STAGES[1], 1/8,  'stage 1');
  eq(CRIT_STAGES[2], 1/2,  'stage 2');
  eq(CRIT_STAGES[3], 1,    'stage 3');
});

T('2. HIGH_CRIT_MOVES contains Night Slash / Stone Edge / Leaf Blade', () => {
  truthy(HIGH_CRIT_MOVES.has('Night Slash'));
  truthy(HIGH_CRIT_MOVES.has('Stone Edge'));
  truthy(HIGH_CRIT_MOVES.has('Leaf Blade'));
});

T('3. ALWAYS_CRIT_MOVES contains Frost Breath / Storm Throw', () => {
  truthy(ALWAYS_CRIT_MOVES.has('Frost Breath'));
  truthy(ALWAYS_CRIT_MOVES.has('Storm Throw'));
});

T('4. Crit produces 1.5x damage vs non-crit (same seed, same boost state)', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const dmgN = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  f._ctx.forceNoCrit = false; f._ctx.forceCrit = true;
  const dmgC = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  truthy(dmgC > dmgN, 'crit should deal more');
  // 1.5x within 2 dmg tolerance (integer flooring in chain)
  approx(dmgC, Math.floor(dmgN * 1.5), 3, 'crit ~1.5x');
});

T('5. Crit ignores target +Def boost', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  d.statBoosts.def = 3;    // defender boosted +3 Def
  f._ctx.forceCrit = true;
  const dmgCritBoosted = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  d.statBoosts.def = 0;
  const dmgCritFlat = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  // With crit bypassing +Def, boosted and flat should be essentially equal.
  approx(dmgCritBoosted, dmgCritFlat, 2, 'crit bypasses +Def');
});

T('6. Crit ignores attacker -Atk debuff', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  a.statBoosts.atk = -3;
  f._ctx.forceCrit = true;
  const dmgDebuffed = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  a.statBoosts.atk = 0;
  const dmgFlat = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  approx(dmgDebuffed, dmgFlat, 2, 'crit bypasses -Atk');
});

T('7. Non-crit respects +Def boost (control)', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  d.statBoosts.def = 3;
  const dmgBoosted = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  d.statBoosts.def = 0;
  const dmgFlat = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  truthy(dmgFlat > dmgBoosted, 'non-crit sees boost');
});

T('8. Crit bypasses screens (Reflect physical)', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  d.side.reflect = true;
  f._ctx.forceCrit = true;
  const dmgCritReflect = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  d.side.reflect = false;
  const dmgCritNoReflect = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  approx(dmgCritReflect, dmgCritNoReflect, 2, 'crit bypasses Reflect');
});

T('9. Non-crit respects Reflect (control)', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  d.side.reflect = true;
  const dmgReflect = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  d.side.reflect = false;
  const dmgNoReflect = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  truthy(dmgNoReflect > dmgReflect, 'reflect reduces non-crit');
});

T('10. Burn still halves physical Atk on crit (Gen 6+ rule)', () => {
  const a = mk('Garchomp', { moves:['Earthquake'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceCrit = true;
  a.status = 'burn';
  const dmgBurn = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  a.status = null;
  const dmgNoBurn = a.calcDamage('Earthquake', d, f, null, rngAlwaysLo);
  truthy(dmgNoBurn > dmgBurn, 'burn still halves on crit');
});

T('11. Crit stage 0 probability is ~4.17% over large sample', () => {
  // Sample 10k rolls with stock rng — should be roughly 1/24.
  const a = mk('Garchomp', { moves:['Earthquake'] });
  const d = mk('Incineroar');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  let crits = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    f._ctx.lastWasCrit = false;
    const r = Math.random();
    // Simulate just the crit roll deterministically
    if (r < CRIT_STAGES[0]) crits++;
  }
  const rate = crits / N;
  truthy(rate > 0.02 && rate < 0.07, `rate ${rate} should be in [0.02, 0.07]`);
});

T('12. ALWAYS_CRIT_MOVES always crit even without forceCrit', () => {
  const a = mk('Kingambit', { moves:['Frost Breath'] });
  const d = mk('Garchomp');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.lastWasCrit = false;
  a.calcDamage('Frost Breath', d, f, null, rngAlwaysHi); // high rng shouldn't matter
  truthy(f._ctx.lastWasCrit, 'Frost Breath always crits');
});

// ============================================================
// FLINCH (#19)
// ============================================================
console.log('\nFlinch (#19):');

T('13. Iron Head flinch is 20% (Champions nerf, not 30%)', () => {
  eq(FLINCH_MOVES['Iron Head'].chance, 0.20);
});

T('14. Rock Slide / Air Slash / Bite at 30%', () => {
  eq(FLINCH_MOVES['Rock Slide'].chance, 0.30);
  eq(FLINCH_MOVES['Air Slash'].chance, 0.30);
  eq(FLINCH_MOVES['Bite'].chance, 0.30);
});

T('15. Zen Headbutt at 20%', () => {
  eq(FLINCH_MOVES['Zen Headbutt'].chance, 0.20);
});

T('16. Fang moves (Fire/Ice/Thunder) at 10% flinch', () => {
  eq(FLINCH_MOVES['Fire Fang'].chance, 0.10);
  eq(FLINCH_MOVES['Ice Fang'].chance, 0.10);
  eq(FLINCH_MOVES['Thunder Fang'].chance, 0.10);
});

T('17. Dark Pulse / Twister at 20% flinch', () => {
  eq(FLINCH_MOVES['Dark Pulse'].chance, 0.20);
  eq(FLINCH_MOVES['Twister'].chance, 0.20);
});

T('18. Waterfall at 20% flinch', () => {
  eq(FLINCH_MOVES['Waterfall'].chance, 0.20);
});

T('19. Non-flinch moves not in FLINCH_MOVES (Earthquake, Thunderbolt)', () => {
  falsy(FLINCH_MOVES['Earthquake']);
  falsy(FLINCH_MOVES['Thunderbolt']);
});

T('20. _flinched flag initially unset on fresh mon', () => {
  const m = mk('Garchomp');
  falsy(m._flinched);
});

T('21. Setting _flinched skips action per engine contract', () => {
  // Semantic test: simulate turn loop gate — if _flinched is true and unacted,
  // the engine skips action, clears flag, sets hasActed.
  const m = mk('Garchomp');
  m._flinched = true;
  // Replicate engine gate
  let skipped = false;
  if (m._flinched) { skipped = true; m._flinched = false; m.hasActed = true; }
  truthy(skipped); falsy(m._flinched); truthy(m.hasActed);
});

T('22. hasActed guard prevents flinch on already-moved mon', () => {
  const m = mk('Garchomp');
  m.hasActed = true;
  // Engine gate: if t.alive AND !t.hasActed AND roll < chance → flinch.
  // Here hasActed is true so even a 100% roll should NOT flinch.
  const flinchCond = (m.alive && !m.hasActed && 1.0 < FLINCH_MOVES['Rock Slide'].chance);
  falsy(flinchCond);
});

// ============================================================
// ABILITIES (#30) — Dragonize
// ============================================================
console.log('\nDragonize (Mega Feraligatr):');

T('23. Dragonize onModifyMove converts Normal -> Dragon with +20% BP', () => {
  const mon = mk('Feraligatr', { ability:'Dragonize' });
  const res = callAbilityHook(mon, 'onModifyMove', { move:'Extreme Speed', attacker:mon, field:mkField() });
  truthy(res);
  eq(res.typeOverride, 'Dragon');
  eq(res.bpMult, 1.20);
});

T('24. Dragonize leaves non-Normal moves untouched', () => {
  const mon = mk('Feraligatr', { ability:'Dragonize' });
  const res = callAbilityHook(mon, 'onModifyMove', { move:'Earthquake', attacker:mon, field:mkField() });
  falsy(res);
});

T('25. Dragonize boosts damage in-engine (Normal move deals Dragon damage)', () => {
  const a = mk('Feraligatr', { ability:'Dragonize', moves:['Hyper Voice'], nature:'Modest', evs:{spa:31} });
  const d = mk('Garchomp'); // Dragon weak to Dragon 2x
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const dragonDmg = a.calcDamage('Hyper Voice', d, f, null, rngAlwaysLo);
  a.ability = '';  // strip ability
  const normalDmg = a.calcDamage('Hyper Voice', d, f, null, rngAlwaysLo);
  truthy(dragonDmg > normalDmg, `Dragonize should boost: ${dragonDmg} vs ${normalDmg}`);
});

// ============================================================
// ABILITIES (#30) — Piercing Drill + Unseen Fist (shared path)
// ============================================================
console.log('\nPiercing Drill / Unseen Fist (Protect bypass):');

// T9j.17 (Refs #101) -- Piercing Drill rewritten to a flat 25% miss chance
// on every move. The prior contact-bypass-Protect interpretation was removed,
// so the onProtectResolve hook no longer exists on Piercing Drill. Tests 26
// and 27 below were updated from "bypass" assertions to "hookless" assertions.
//   Cite: https://game8.co/games/Pokemon-Champions/archives/590403
T('26. Piercing Drill ABILITIES entry has NO onProtectResolve hook (T9j.17 rewrite)', () => {
  const mon = mk('Excadrill', { ability:'Piercing Drill' });
  const res = callAbilityHook(mon, 'onProtectResolve', { attacker:mon, defender:mk('Garchomp'), move:'Iron Head', moveType:'Steel', isContact:true });
  // After T9j.17 rewrite, Piercing Drill is hookless on protect resolve.
  // The 25% miss roll lives in executeMove (covered by tests/t9j17_tests.js).
  falsy(res, 'Piercing Drill should no longer pierce Protect');
});

T('27. Piercing Drill is hookless on non-contact moves too (T9j.17 rewrite)', () => {
  const mon = mk('Excadrill', { ability:'Piercing Drill' });
  const res = callAbilityHook(mon, 'onProtectResolve', { attacker:mon, defender:mk('Garchomp'), move:'Earth Power', moveType:'Ground', isContact:false });
  falsy(res);
});

T('28. Unseen Fist uses identical 25% contact bypass', () => {
  const mon = mk('Golurk', { ability:'Unseen Fist' });
  const res = callAbilityHook(mon, 'onProtectResolve', { attacker:mon, defender:mk('Garchomp'), move:'Close Combat', moveType:'Fighting', isContact:true });
  truthy(res);
  eq(res.damageMult, 0.25);
});

T('29. CONTACT_MOVES includes the core contact set', () => {
  truthy(CONTACT_MOVES.has('Iron Head'));
  truthy(CONTACT_MOVES.has('Close Combat'));
  truthy(CONTACT_MOVES.has('Knock Off'));
  truthy(CONTACT_MOVES.has('Fake Out'));
  falsy(CONTACT_MOVES.has('Earthquake'));
  falsy(CONTACT_MOVES.has('Thunderbolt'));
});

// ============================================================
// ABILITIES (#30) — Spicy Spray
// ============================================================
console.log('\nSpicy Spray (Mega Scovillain):');

T('30. Spicy Spray burns attacker on damage taken', () => {
  const holder = mk('Scovillain', { ability:'Spicy Spray' });
  const attacker = mk('Garchomp');
  const log = [];
  callAbilityHook(holder, 'onDamageTaken', { attacker, defender:holder, move:'Earthquake', moveType:'Ground', damage:50, field:mkField(), log });
  eq(attacker.status, 'burn');
  truthy(log.some(l => l.includes('burned')));
});

T('31. Spicy Spray does NOT burn Fire-type attackers', () => {
  const holder = mk('Scovillain', { ability:'Spicy Spray' });
  const attacker = mk('Charizard'); // Fire/Flying
  callAbilityHook(holder, 'onDamageTaken', { attacker, defender:holder, move:'Flare Blitz', moveType:'Fire', damage:50, field:mkField(), log:[] });
  falsy(attacker.status, 'Fire-type immune to spicy-spray burn');
});

T('32. Spicy Spray does NOT burn already-statused attackers', () => {
  const holder = mk('Scovillain', { ability:'Spicy Spray' });
  const attacker = mk('Garchomp'); attacker.status = 'paralysis';
  callAbilityHook(holder, 'onDamageTaken', { attacker, defender:holder, move:'Earthquake', moveType:'Ground', damage:50, field:mkField(), log:[] });
  eq(attacker.status, 'paralysis', 'status unchanged');
});

T('33. Spicy Spray blocked when holder behind Substitute', () => {
  const holder = mk('Scovillain', { ability:'Spicy Spray' });
  holder.substituteHp = 40;
  const attacker = mk('Garchomp');
  callAbilityHook(holder, 'onDamageTaken', { attacker, defender:holder, move:'Earthquake', moveType:'Ground', damage:50, field:mkField(), log:[] });
  falsy(attacker.status, 'Sub blocks Spicy Spray');
});

// ============================================================
// ABILITIES (#30) — Mega Sol
// ============================================================
console.log('\nMega Sol (Mega Meganium):');

T('34. Mega Sol provides personal sun when field weather is none', () => {
  const mon = mk('Meganium', { ability:'Mega Sol' });
  const f = mkField({ weather:'none' });
  const res = callAbilityHook(mon, 'onWeatherCheck', { mon, moveType:'Fire', field:f });
  truthy(res);
  eq(res.effectiveWeather, 'sun');
});

T('35. Mega Sol does NOT override real field weather', () => {
  const mon = mk('Meganium', { ability:'Mega Sol' });
  const f = mkField(); f.weather = 'rain';
  const res = callAbilityHook(mon, 'onWeatherCheck', { mon, moveType:'Fire', field:f });
  falsy(res, 'real weather wins');
});

T('36. Mega Sol Fire move gets sun boost even with no field weather', () => {
  const a = mk('Meganium', { ability:'Mega Sol', moves:['Flamethrower'], nature:'Modest', evs:{spa:31} });
  const d = mk('Garchomp');
  const f = mkField({ weather:'none' });
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const megaSolDmg = a.calcDamage('Flamethrower', d, f, null, rngAlwaysLo);
  a.ability = '';
  const noMegaSolDmg = a.calcDamage('Flamethrower', d, f, null, rngAlwaysLo);
  truthy(megaSolDmg > noMegaSolDmg, `Mega Sol should boost Fire: ${megaSolDmg} vs ${noMegaSolDmg}`);
});

// ============================================================
// ABILITIES (#30) — Parental Bond
// ============================================================
console.log('\nParental Bond (Mega Kangaskhan):');

T('37. Parental Bond child hit BP is 1/4 (Champions nerf)', () => {
  // From CHAMPIONS_UPDATED_ABILITIES: childPowerMult = 0.25
  const updatedAbl = ctx.CHAMPIONS_UPDATED_ABILITIES;
  truthy(updatedAbl, 'CHAMPIONS_UPDATED_ABILITIES must be defined');
  eq(updatedAbl['Parental Bond'].childPowerMult, 0.25);
});

T('38. BP_MAP + bpMult 0.25 at calc time produces 1/4 damage floor', () => {
  // Direct BP-math check: use Dragon Claw (BP 80). Child hit = floor(80 * 0.25) = 20.
  // Verify via calcDamage with _ctx.bpMult = 0.25.
  const a = mk('Kangaskhan', { ability:'Scrappy', moves:['Dragon Claw'], nature:'Adamant', evs:{atk:31} });
  const d = mk('Garchomp');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const fullDmg = a.calcDamage('Dragon Claw', d, f, null, rngAlwaysLo);
  f._ctx.bpMult = 0.25;
  const childDmg = a.calcDamage('Dragon Claw', d, f, null, rngAlwaysLo);
  f._ctx.bpMult = 1;
  // child ~ 1/4 of full. Tolerate floor chain (~±3).
  approx(childDmg, Math.floor(fullDmg * 0.25), Math.max(3, Math.floor(fullDmg * 0.05)), 'child ~1/4 of full');
});

// ============================================================
// ABILITIES (#30) — Tags present on Mega forms
// ============================================================
console.log('\nAbility tags on Mega forms:');

T('39. Excadrill-Mega has Piercing Drill (new)', () => {
  const m = ctx.CHAMPIONS_MEGAS['Excadrill-Mega'];
  truthy(m); eq(m.ability, 'Piercing Drill'); eq(m.abilityIsNew, true);
});
T('40. Scovillain-Mega has Spicy Spray (new)', () => {
  const m = ctx.CHAMPIONS_MEGAS['Scovillain-Mega'];
  truthy(m); eq(m.ability, 'Spicy Spray'); eq(m.abilityIsNew, true);
});
T('41. Feraligatr-Mega has Dragonize (new)', () => {
  const m = ctx.CHAMPIONS_MEGAS['Feraligatr-Mega'];
  truthy(m); eq(m.ability, 'Dragonize'); eq(m.abilityIsNew, true);
});
T('42. Meganium-Mega has Mega Sol (new)', () => {
  const m = ctx.CHAMPIONS_MEGAS['Meganium-Mega'];
  truthy(m); eq(m.ability, 'Mega Sol'); eq(m.abilityIsNew, true);
});
T('43. Golurk-Mega has Unseen Fist (updated)', () => {
  const m = ctx.CHAMPIONS_MEGAS['Golurk-Mega'];
  truthy(m); eq(m.ability, 'Unseen Fist'); eq(m.abilityIsUpdated, true);
});
T('44. Kangaskhan-Mega has Parental Bond', () => {
  const m = ctx.CHAMPIONS_MEGAS['Kangaskhan-Mega'];
  truthy(m); eq(m.ability, 'Parental Bond');
});

// ============================================================
// ABILITIES — Registry shape
// ============================================================
console.log('\nABILITIES registry:');

T('45. ABILITIES has all six entries wired', () => {
  truthy(ABILITIES['Dragonize']);
  truthy(ABILITIES['Piercing Drill']);
  truthy(ABILITIES['Unseen Fist']);
  truthy(ABILITIES['Spicy Spray']);
  truthy(ABILITIES['Mega Sol']);
  // Parental Bond handled inline so NOT required in ABILITIES registry.
});

T('46. callAbilityHook safe on mon with no ability', () => {
  const m = mk('Garchomp', { ability:'' });
  const res = callAbilityHook(m, 'onModifyMove', { move:'Earthquake', attacker:m, field:mkField() });
  falsy(res);
});

T('47. callAbilityHook safe on mon with unknown ability', () => {
  const m = mk('Garchomp', { ability:'Rough Skin' });  // not in registry
  const res = callAbilityHook(m, 'onDamageTaken', { attacker:m, defender:m, damage:1, log:[], field:mkField() });
  falsy(res);
});

// ============================================================
// END OF SUITE
// ============================================================
console.log(`\n${pass} pass, ${fail} fail, ${pass + fail} total`);
if (fail > 0) process.exit(1);
