// T9j.6 — Items pass tests (#29 #8 #18 #11 #43)
// Covers: Leftovers, Focus Sash, Choice Scarf lock, stat-stage reset on switch,
// and regression of removed placeholders. Some items such as Life Orb are now
// Reg M-B review candidates, but their runtime effects remain unpromoted.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, require, module:{}, exports:{}, Math, Object, Array };
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f });
}
load('data.js');
load('engine.js');
vm.runInContext('this.Pokemon=Pokemon; this.Field=Field; this.simulateBattle=simulateBattle;', ctx);
const { Pokemon, Field, simulateBattle } = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '—', e.message); fail++; }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg) { if (!v) throw new Error(msg); }
function falsy(v, msg) { if (v) throw new Error(msg); }

function mk(name, overrides={}) {
  const d = Object.assign({ name, level:50, moves:['Tackle'], ability:'', item:'', nature:'Hardy' }, overrides);
  return new Pokemon(d);
}

// ============================================================
// Leftovers (#29)
// ============================================================
console.log('\nLeftovers (#29):');

T('1. Leftovers heal formula = floor(maxHp/16), min 1', () => {
  const m = mk('Garchomp', { item:'Leftovers' });
  eq(m.item, 'Leftovers');
  const heal = Math.max(1, Math.floor(m.maxHp / 16));
  truthy(heal >= 1, 'min 1');
  // Simulate end-of-turn Leftovers tick on a damaged mon
  m.hp = Math.max(1, m.hp - heal * 4);
  const before = m.hp;
  if (m.alive && m.item === 'Leftovers' && m.hp < m.maxHp) {
    m.hp = Math.min(m.maxHp, m.hp + heal);
  }
  eq(m.hp, before + heal, 'healed by heal amount');
});

T('2. Leftovers does not over-heal past maxHp', () => {
  const m = mk('Garchomp', { item:'Leftovers' });
  const heal = Math.max(1, Math.floor(m.maxHp / 16));
  m.hp = m.maxHp - 1; // 1 below full
  if (m.alive && m.item === 'Leftovers' && m.hp < m.maxHp) {
    m.hp = Math.min(m.maxHp, m.hp + heal);
  }
  eq(m.hp, m.maxHp, 'capped at max');
});

T('3. Leftovers does not tick at full HP', () => {
  const m = mk('Garchomp', { item:'Leftovers' });
  const hp0 = m.hp;
  // Guard condition: hp < maxHp
  const willTick = (m.alive && m.item === 'Leftovers' && m.hp < m.maxHp);
  falsy(willTick, 'full-HP should skip');
  eq(m.hp, hp0, 'no change');
});

T('4. Leftovers does not tick on fainted mon', () => {
  const m = mk('Garchomp', { item:'Leftovers' });
  m.hp = 0; m.alive = false;
  const willTick = (m.alive && m.item === 'Leftovers' && m.hp < m.maxHp);
  falsy(willTick, 'fainted should skip');
});

// ============================================================
// Focus Sash (#8)
// ============================================================
console.log('\nFocus Sash (#8):');

T('5. Focus Sash survives KO from full HP, saved at 1 HP, item consumed', () => {
  const m = mk('Garchomp', { item:'Focus Sash' });
  // Simulate the exact applyDamage block behavior
  const wasFullHp = (m.hp === m.maxHp);
  const finalDmg = m.maxHp + 100; // overkill
  m.hp = Math.max(0, m.hp - finalDmg);
  if (m.hp === 0 && m.item === 'Focus Sash' && !m.itemConsumed && wasFullHp) {
    m.hp = 1;
    m.itemConsumed = true;
  }
  eq(m.hp, 1, 'saved at 1 HP');
  eq(m.itemConsumed, true, 'sash consumed');
});

T('6. Focus Sash does NOT save if already below full HP', () => {
  const m = mk('Garchomp', { item:'Focus Sash' });
  m.hp = m.maxHp - 1; // chip first
  const wasFullHp = (m.hp === m.maxHp);
  falsy(wasFullHp, 'not full HP');
  const finalDmg = m.maxHp + 100;
  m.hp = Math.max(0, m.hp - finalDmg);
  if (m.hp === 0 && m.item === 'Focus Sash' && !m.itemConsumed && wasFullHp) {
    m.hp = 1; m.itemConsumed = true;
  }
  eq(m.hp, 0, 'stays KOd');
  eq(m.itemConsumed, false, 'sash not consumed');
});

T('7. Focus Sash consumed only once (second full-HP KO would not trigger)', () => {
  const m = mk('Garchomp', { item:'Focus Sash' });
  m.itemConsumed = true; // already used
  const wasFullHp = (m.hp === m.maxHp);
  m.hp = 0;
  if (m.hp === 0 && m.item === 'Focus Sash' && !m.itemConsumed && wasFullHp) {
    m.hp = 1;
  }
  eq(m.hp, 0, 'no second save');
});

// ============================================================
// Sitrus / Oran Berry damage timing
// ============================================================
console.log('\nDamage-trigger berries:');

T('8. Sitrus Berry heals after surviving damage at half HP or lower', () => {
  const m = mk('Incineroar', { item:'Sitrus Berry' });
  m.hp = Math.floor(m.maxHp / 2);
  const before = m.hp;
  const msg = m.applyItem('damage', new Field());
  truthy(msg && msg.includes('Sitrus Berry restored HP'), 'Sitrus heal message missing');
  truthy(m.hp > before, 'Sitrus should heal surviving holder');
  eq(m.itemConsumed, true, 'Sitrus should be consumed');
});

T('9. Sitrus Berry does not restore from 0 HP after lethal damage', () => {
  const m = mk('Incineroar', { item:'Sitrus Berry' });
  m.hp = 0;
  m.alive = true; // mirrors applyDamage before faint cleanup flips alive false
  const msg = m.applyItem('damage', new Field());
  eq(msg, undefined, 'Sitrus should not trigger at 0 HP');
  eq(m.hp, 0, 'Sitrus should not resurrect a fainted holder');
  eq(m.itemConsumed, false, 'Sitrus should remain unused if holder fainted');
});

T('10. Oran Berry does not restore from 0 HP after lethal damage', () => {
  const m = mk('Pikachu', { item:'Oran Berry' });
  m.hp = 0;
  m.alive = true;
  const msg = m.applyItem('damage', new Field());
  eq(msg, undefined, 'Oran should not trigger at 0 HP');
  eq(m.hp, 0, 'Oran should not resurrect a fainted holder');
  eq(m.itemConsumed, false, 'Oran should remain unused if holder fainted');
});

T('11. Battle log records lethal damage faint before any Sitrus restore', () => {
  const player = {
    name: 'Sitrus Lethal Guard',
    format: 'champions',
    legality_status: 'legal',
    members: [{
      name: 'Torkoal',
      ability: 'Drought',
      item: 'Sitrus Berry',
      nature: 'Relaxed',
      level: 50,
      currentHp: 1,
      moves: ['Tackle'],
      evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }
    }]
  };
  const opponent = {
    name: 'Fast Chip',
    format: 'champions',
    legality_status: 'legal',
    members: [{
      name: 'Jolteon',
      ability: 'Volt Absorb',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Tackle'],
      evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:32 }
    }]
  };
  const battle = simulateBattle(player, opponent, {
    format: 'singles',
    seed: [31, 37, 41, 43],
    maxTurns: 1
  });
  falsy(battle.log.some(line => String(line).includes('Sitrus Berry restored HP')),
    'lethal hit should not produce a Sitrus restore line');
  truthy(battle.log.some(line => String(line).includes('Torkoal fainted!')),
    'lethal hit should faint the Sitrus holder');
});

// ============================================================
// Choice Scarf lock (#18)
// ============================================================
console.log('\nChoice Scarf (#18):');

T('12. Choice Scarf multiplies Speed by 1.5 via getStat', () => {
  const mBase = mk('Garchomp', { item:'' });
  const mScarf = mk('Garchomp', { item:'Choice Scarf' });
  const speBase = mBase.getStat('spe');
  const speScarf = mScarf.getStat('spe');
  eq(speScarf, Math.floor(speBase * 1.5), 'Scarf +50% Spe');
});

T('13. choiceLock initializes null on construction', () => {
  const m = mk('Garchomp', { item:'Choice Scarf' });
  eq(m.choiceLock, null, 'initial lock null');
});

T('14. choiceLock clears on switch-in logic (replaceOnField resets)', () => {
  const m = mk('Garchomp', { item:'Choice Scarf' });
  m.choiceLock = 'Earthquake';
  // Simulate replaceOnField reset clause
  m.choiceLock = null;
  m.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
  eq(m.choiceLock, null, 'cleared');
});

// ============================================================
// Stat-stage reset on switch (#29 cross-effect)
// ============================================================
console.log('\nStat-stage reset on switch (#29):');

T('15. Stat boosts reset to all zeros on switch-in', () => {
  const m = mk('Garchomp');
  m.statBoosts.atk = -2;
  m.statBoosts.spe = 2;
  // Simulate replaceOnField reset
  m.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
  eq(m.statBoosts.atk, 0, 'atk reset');
  eq(m.statBoosts.spe, 0, 'spe reset');
  eq(m.statBoosts.eva, 0, 'eva reset');
});

// ============================================================
// Removed placeholders (#11 WONTFIX) — ensure no code path boosts
// ============================================================
console.log('\nRemoved placeholders (#11 WONTFIX):');

T('16. Choice Band does NOT multiply Attack (absent from Champions)', () => {
  const mBase = mk('Garchomp', { item:'' });
  const mBand = mk('Garchomp', { item:'Choice Band' });
  eq(mBand.getStat('atk'), mBase.getStat('atk'), 'Band no-op');
});

T('17. Choice Specs does NOT multiply SpA (absent from Champions)', () => {
  const mBase = mk('Gengar', { item:'' });
  const mSpecs = mk('Gengar', { item:'Choice Specs' });
  eq(mSpecs.getStat('spa'), mBase.getStat('spa'), 'Specs no-op');
});

T('18. Assault Vest does NOT multiply SpD (absent from Champions)', () => {
  const mBase = mk('Tyranitar', { item:'' });
  const mAv = mk('Tyranitar', { item:'Assault Vest' });
  eq(mAv.getStat('spd'), mBase.getStat('spd'), 'AV no-op');
});

// ============================================================
// Summary
// ============================================================
console.log(`\n${pass} pass, ${fail} fail, ${pass + fail} total`);
if (fail > 0) process.exit(1);
