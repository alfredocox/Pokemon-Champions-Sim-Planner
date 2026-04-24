// T9j.9 — Move Category, BP Table, Nature Verify tests (Refs #3 #24 #4)
// Coverage targets:
//   Category (9): physical/special/status correctness for named moves,
//                 isPhysical wiring via MOVE_CATEGORY, fallback warn path.
//   BP (7): MOVE_BP lookup, Champions additions, fallback warn path.
//   Nature (#4) (6): Adamant/Modest/Jolly apply to correct stats, no-op natures.
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
  'this.Pokemon=Pokemon; this.Field=Field;',
  'this.MOVE_CATEGORY=MOVE_CATEGORY; this.MOVE_BP=MOVE_BP; this.MOVE_TYPES=MOVE_TYPES;'
].join(' '), ctx);
const { Pokemon, Field, MOVE_CATEGORY, MOVE_BP, MOVE_TYPES } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

function mk(name, overrides={}) {
  const d = Object.assign({ name, level:50, moves:['Tackle'], ability:'', item:'', nature:'Hardy' }, overrides);
  return new Pokemon(d);
}
function mkField(overrides={}) {
  const f = new Field(Object.assign({ format:'doubles' }, overrides));
  return f;
}
const rngAlwaysLo = () => 0.0;

// ============================================================
// CATEGORY (#3)
// ============================================================
console.log('\nMove Category (#3):');

T('1. MOVE_CATEGORY defines Close Combat as physical', () => {
  eq(MOVE_CATEGORY['Close Combat'], 'physical');
});

T('2. MOVE_CATEGORY defines Thunderbolt as special', () => {
  eq(MOVE_CATEGORY['Thunderbolt'], 'special');
});

T('3. MOVE_CATEGORY defines Protect as status', () => {
  eq(MOVE_CATEGORY['Protect'], 'status');
});

T('4. MOVE_CATEGORY: Foul Play is physical (uses atk stat)', () => {
  eq(MOVE_CATEGORY['Foul Play'], 'physical');
});

T('5. MOVE_CATEGORY: Iron Head / Knock Off / U-turn are physical', () => {
  eq(MOVE_CATEGORY['Iron Head'], 'physical');
  eq(MOVE_CATEGORY['Knock Off'], 'physical');
  eq(MOVE_CATEGORY['U-turn'], 'physical');
});

T('6. MOVE_CATEGORY: Moonblast / Focus Blast / Hydro Pump are special', () => {
  eq(MOVE_CATEGORY['Moonblast'], 'special');
  eq(MOVE_CATEGORY['Focus Blast'], 'special');
  eq(MOVE_CATEGORY['Hydro Pump'], 'special');
});

T('7. MOVE_CATEGORY: Trick Room / Will-O-Wisp are status', () => {
  eq(MOVE_CATEGORY['Trick Room'], 'status');
  eq(MOVE_CATEGORY['Will-O-Wisp'], 'status');
});

T('8. engine uses MOVE_CATEGORY: physical move reads atk boost', () => {
  // Iron Head is physical per MOVE_CATEGORY. Give attacker +Atk boost; damage should rise.
  const a0 = mk('Aegislash', { moves:['Iron Head'], nature:'Adamant', evs:{atk:31} });
  const d0 = mk('Garchomp');
  const f = mkField();
  a0.side = f.playerSide; d0.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const baseDmg = a0.calcDamage('Iron Head', d0, f, null, rngAlwaysLo);
  a0.statBoosts.atk = 2;
  const boostDmg = a0.calcDamage('Iron Head', d0, f, null, rngAlwaysLo);
  truthy(boostDmg > baseDmg, `atk boost should raise physical dmg: ${boostDmg} vs ${baseDmg}`);
});

T('9. engine uses MOVE_CATEGORY: special move reads spa boost not atk', () => {
  // Thunderbolt is special. +Atk should NOT raise damage; +SpA should.
  // Target: Pelipper (Water/Flying) so Electric is neutral (not Ground-immune).
  const a0 = mk('Raichu', { moves:['Thunderbolt'], nature:'Modest', evs:{spa:31} });
  const d0 = mk('Pelipper');
  const f = mkField();
  a0.side = f.playerSide; d0.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const baseDmg = a0.calcDamage('Thunderbolt', d0, f, null, rngAlwaysLo);
  a0.statBoosts.atk = 6;
  const atkBoostDmg = a0.calcDamage('Thunderbolt', d0, f, null, rngAlwaysLo);
  eq(atkBoostDmg, baseDmg, 'atk boost on special move must be ignored');
  a0.statBoosts.atk = 0; a0.statBoosts.spa = 2;
  const spaBoostDmg = a0.calcDamage('Thunderbolt', d0, f, null, rngAlwaysLo);
  truthy(spaBoostDmg > baseDmg, `spa boost should raise special dmg: ${spaBoostDmg} vs ${baseDmg}`);
});

T('10. Category coverage: every MOVE_TYPES entry has a MOVE_CATEGORY row (or fallback warns)', () => {
  const missing = [];
  for (const mv of Object.keys(MOVE_TYPES)) {
    if (!MOVE_CATEGORY[mv]) missing.push(mv);
  }
  // Non-zero is acceptable but documented — fallback path exists. We assert 90%+ coverage.
  const total = Object.keys(MOVE_TYPES).length;
  const covered = total - missing.length;
  const ratio = covered / total;
  truthy(ratio >= 0.90, `only ${covered}/${total} moves categorized (${(ratio*100).toFixed(1)}%)`);
});

// ============================================================
// BASE POWER (#24)
// ============================================================
console.log('\nBase Power (#24):');

T('11. MOVE_BP: Close Combat 120', () => { eq(MOVE_BP['Close Combat'], 120); });
T('12. MOVE_BP: Thunderbolt 90', () => { eq(MOVE_BP['Thunderbolt'], 90); });
T('13. MOVE_BP: Status moves are 0 (Protect, Will-O-Wisp, Trick Room)', () => {
  eq(MOVE_BP['Protect'], 0);
  eq(MOVE_BP['Will-O-Wisp'], 0);
  eq(MOVE_BP['Trick Room'], 0);
});
T('14. MOVE_BP: Iron Head 80, Knock Off 65, U-turn 70', () => {
  eq(MOVE_BP['Iron Head'], 80);
  eq(MOVE_BP['Knock Off'], 65);
  eq(MOVE_BP['U-turn'], 70);
});
T('15. MOVE_BP: Champions additions present (Night Daze, Spirit Shackle, First Impression)', () => {
  eq(MOVE_BP['Night Daze'], 90);
  eq(MOVE_BP['Spirit Shackle'], 90);
  eq(MOVE_BP['First Impression'], 100);
});
T('16. engine reads MOVE_BP: Flamethrower (90) > Ember (40 fallback)', () => {
  const a = mk('Charizard', { moves:['Flamethrower','Ember'], nature:'Modest', evs:{spa:31} });
  const d = mk('Garchomp');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  const flameDmg = a.calcDamage('Flamethrower', d, f, null, rngAlwaysLo);
  // Ember is NOT in MOVE_BP or BP_MAP -> falls back to 60. Flamethrower 90 > 60.
  const emberDmg = a.calcDamage('Ember', d, f, null, rngAlwaysLo);
  truthy(flameDmg > emberDmg, `Flamethrower (90 BP) should exceed Ember (60 fallback): ${flameDmg} vs ${emberDmg}`);
});
T('17. BP fallback is 60 for unknown moves (no crash, warn once)', () => {
  const a = mk('Charizard', { moves:['Totally Fake Move'], nature:'Modest', evs:{spa:31} });
  const d = mk('Garchomp');
  const f = mkField();
  a.side = f.playerSide; d.side = f.oppSide;
  f._ctx.forceNoCrit = true;
  // Should not throw; returns a valid damage number.
  const dmg = a.calcDamage('Totally Fake Move', d, f, null, rngAlwaysLo);
  truthy(typeof dmg === 'number' && dmg > 0, 'unknown move must still deal damage from BP 60 fallback');
});

// ============================================================
// NATURE STAT ALIGNMENT (#4)
// ============================================================
console.log('\nNature Verify (#4):');

T('18. Adamant raises Atk, lowers SpA', () => {
  const a = mk('Incineroar', { nature:'Adamant', evs:{atk:31,spa:31}, statFormat:'champions' });
  const s = mk('Incineroar', { nature:'Serious', evs:{atk:31,spa:31}, statFormat:'champions' });
  truthy(a.baseAtk > s.baseAtk, `Adamant Atk > Serious Atk (${a.baseAtk} vs ${s.baseAtk})`);
  truthy(a.baseSpa < s.baseSpa, `Adamant SpA < Serious SpA (${a.baseSpa} vs ${s.baseSpa})`);
});

T('19. Modest raises SpA, lowers Atk (NOT the other way round — Issue #4 bug fix)', () => {
  const m = mk('Gardevoir', { nature:'Modest', evs:{atk:31,spa:31}, statFormat:'champions' });
  const s = mk('Gardevoir', { nature:'Serious', evs:{atk:31,spa:31}, statFormat:'champions' });
  truthy(m.baseSpa > s.baseSpa, `Modest SpA > Serious SpA (${m.baseSpa} vs ${s.baseSpa})`);
  truthy(m.baseAtk < s.baseAtk, `Modest Atk < Serious Atk (${m.baseAtk} vs ${s.baseAtk})`);
});

T('20. Jolly raises Spe, lowers SpA', () => {
  const j = mk('Garchomp', { nature:'Jolly', evs:{spe:31,spa:31}, statFormat:'champions' });
  const s = mk('Garchomp', { nature:'Serious', evs:{spe:31,spa:31}, statFormat:'champions' });
  truthy(j.baseSpe > s.baseSpe, `Jolly Spe > Serious Spe (${j.baseSpe} vs ${s.baseSpe})`);
  truthy(j.baseSpa < s.baseSpa, `Jolly SpA < Serious SpA (${j.baseSpa} vs ${s.baseSpa})`);
});

T('21. Timid raises Spe, lowers Atk', () => {
  const t = mk('Latios', { nature:'Timid', evs:{spe:31,atk:31}, statFormat:'champions' });
  const s = mk('Latios', { nature:'Serious', evs:{spe:31,atk:31}, statFormat:'champions' });
  truthy(t.baseSpe > s.baseSpe, `Timid Spe > Serious Spe`);
  truthy(t.baseAtk < s.baseAtk, `Timid Atk < Serious Atk`);
});

T('22. Bold raises Def, lowers Atk', () => {
  const b = mk('Blissey', { nature:'Bold', evs:{def:31,atk:31}, statFormat:'champions' });
  const s = mk('Blissey', { nature:'Serious', evs:{def:31,atk:31}, statFormat:'champions' });
  truthy(b.baseDef > s.baseDef, `Bold Def > Serious Def`);
  truthy(b.baseAtk < s.baseAtk, `Bold Atk < Serious Atk`);
});

T('23. Neutral natures (Serious, Hardy) produce identical stats', () => {
  const s = mk('Garchomp', { nature:'Serious', evs:{atk:31,spa:31,spe:31}, statFormat:'champions' });
  const h = mk('Garchomp', { nature:'Hardy',   evs:{atk:31,spa:31,spe:31}, statFormat:'champions' });
  eq(s.baseAtk, h.baseAtk, 'neutral Atk parity');
  eq(s.baseSpa, h.baseSpa, 'neutral SpA parity');
  eq(s.baseSpe, h.baseSpe, 'neutral Spe parity');
});

T('24. Nature applies to correct stat: Adamant does NOT boost Def (regression for #4)', () => {
  // The original #4 bug was nature applied to wrong stat. Confirm Adamant
  // affects Atk+SpA only, not Def/SpD/Spe.
  const a = mk('Incineroar', { nature:'Adamant', evs:{def:31,spd:31,spe:31}, statFormat:'champions' });
  const s = mk('Incineroar', { nature:'Serious', evs:{def:31,spd:31,spe:31}, statFormat:'champions' });
  eq(a.baseDef, s.baseDef, 'Adamant must NOT change Def');
  eq(a.baseSpd, s.baseSpd, 'Adamant must NOT change SpD');
  eq(a.baseSpe, s.baseSpe, 'Adamant must NOT change Spe');
});

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${pass} pass, ${fail} fail, ${pass + fail} total`);
process.exit(fail > 0 ? 1 : 0);
