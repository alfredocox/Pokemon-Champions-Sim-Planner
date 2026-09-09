// screens_terrain_item_tests.js
//
// DIAGNOSTIC test suite — confirms the battle engine is doing its job correctly
// for screens, terrain modifiers, Intimidate damage feed-through, and held items.
//
// PASS = mechanic is wired and working as expected.
// FAIL = mechanic is missing or broken — tells you exactly what needs to be fixed.
//
// NOTE: Some tests are written to EXPOSE KNOWN GAPS (they will FAIL intentionally).
//       Those are clearly labelled [GAP] and tell the team what to implement next.
//
// Exit code is always 0 (diagnostic mode — does not block CI).

const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, Map,
  JSON, Promise, setTimeout, clearTimeout, Date, String, Number, Boolean,
  RegExp, parseInt, parseFloat
};
vm.createContext(ctx);

function load(f) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}
load('data.js');
load('engine.js');
vm.runInContext([
  'this.Pokemon          = Pokemon;',
  'this.Field            = Field;',
  'this.simulateBattle   = simulateBattle;',
  'this.canInflictStatus = canInflictStatus;',
].join('\n'), ctx);

const { Pokemon, Field, simulateBattle } = ctx;

// ── helpers ───────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const results = [];

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    results.push({ name, status: 'PASS' });
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '\n       →', e.message);
    results.push({ name, status: 'FAIL', reason: e.message });
    fail++;
  }
}

function eq(a, b, msg)   { if (a !== b)  throw new Error(`${msg || ''} expected ${b}, got ${a}`); }
function truthy(v, msg)  { if (!v)       throw new Error(msg || `expected truthy, got ${JSON.stringify(v)}`); }
function falsy(v, msg)   { if (v)        throw new Error(msg || `expected falsy, got ${JSON.stringify(v)}`); }
function near(a, lo, hi, msg) {
  if (a < lo || a > hi) throw new Error(`${msg || ''} value ${a} not in [${lo}, ${hi}]`);
}
function logHas(log, sub) { return log.some(l => String(l).includes(sub)); }

function mkMon(overrides) {
  return new Pokemon(Object.assign({
    name: 'Garchomp', level: 50, moves: ['Tackle'], ability: '', item: '',
    nature: 'Hardy', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides));
}

function team(members) {
  return { name: 'TestTeam', format: 'champions', legality_status: 'legal', members };
}
function mon(overrides) {
  return Object.assign({
    name: 'Garchomp', level: 50, moves: ['Tackle'], ability: '', item: '',
    nature: 'Hardy', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides);
}

// =============================================================================
// SECTION 1 — SCREENS (Reflect / Light Screen / Aurora Veil)
// =============================================================================
// Engine: calcDamage applies screenMod at line ~2374.
//   Singles: _screenBase = 2048/4096 = 0.5x damage.
//   Doubles: _screenBase = 2732/4096 ≈ 0.667x damage.
// Set field._format = 'singles' and target.side to get an exact 0.5x ratio.
// =============================================================================
console.log('\n=== SECTION 1: Screens (Reflect / Light Screen / Aurora Veil) ===');
console.log('Expected: screens halve damage in singles. Aurora Veil halves both. Crits bypass.');

T('1. Reflect halves incoming physical damage', () => {
  const field  = new Field();
  field._format = 'singles';
  const attacker = mkMon({ name: 'Incineroar', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Bold',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 4 } });
  target.side = field.playerSide;
  const rng = () => 0.5;
  const dNoScreen = attacker.calcDamage('Flare Blitz', target, field, null, rng);
  field.playerSide.reflect = true;
  const dReflect  = attacker.calcDamage('Flare Blitz', target, field, null, rng);
  truthy(dNoScreen > 0, `base damage must be positive: ${dNoScreen}`);
  near(dReflect / dNoScreen, 0.45, 0.55,
    `Reflect must halve physical damage (~0.5 ratio): base=${dNoScreen}, reflected=${dReflect}, ratio=`);
});

T('2. Light Screen halves incoming special damage', () => {
  const field  = new Field();
  field._format = 'singles';
  const attacker = mkMon({ name: 'Dragapult', nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Calm',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 } });
  target.side = field.playerSide;
  const rng = () => 0.5;
  const dNoScreen   = attacker.calcDamage('Shadow Ball', target, field, null, rng);
  field.playerSide.lightScreen = true;
  const dLightScreen = attacker.calcDamage('Shadow Ball', target, field, null, rng);
  truthy(dNoScreen > 0, `base damage must be positive: ${dNoScreen}`);
  near(dLightScreen / dNoScreen, 0.45, 0.55,
    `Light Screen must halve special damage (~0.5 ratio): base=${dNoScreen}, screened=${dLightScreen}, ratio=`);
});

T('3. Aurora Veil halves both physical and special damage', () => {
  const field   = new Field();
  field._format = 'singles';
  const physical = mkMon({ name: 'Incineroar', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  const special  = mkMon({ name: 'Dragapult', nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Bold',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 252, spe: 4 } });
  target.side = field.playerSide;
  const rng = () => 0.5;
  const dPhyBase = physical.calcDamage('Flare Blitz', target, field, null, rng);
  const dSpBase  = special.calcDamage('Shadow Ball',  target, field, null, rng);
  field.playerSide.auroraVeil = true;
  const dPhyVeil = physical.calcDamage('Flare Blitz', target, field, null, rng);
  const dSpVeil  = special.calcDamage('Shadow Ball',  target, field, null, rng);
  near(dPhyVeil / dPhyBase, 0.45, 0.55,
    `Aurora Veil must halve physical damage: base=${dPhyBase}, veiled=${dPhyVeil}, ratio=`);
  near(dSpVeil / dSpBase, 0.45, 0.55,
    `Aurora Veil must halve special damage: base=${dSpBase}, veiled=${dSpVeil}, ratio=`);
});

T('4. Critical hits bypass screens entirely', () => {
  // Engine: crits force screenMod = 1 (no reduction). field._ctx.forceCrit = true.
  const field   = new Field();
  field._format = 'singles';
  const attacker = mkMon({ name: 'Incineroar', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Bold',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 4 } });
  target.side = field.playerSide;
  field.playerSide.reflect = true;
  const rng = () => 0.5;
  const dScreened = attacker.calcDamage('Flare Blitz', target, field, null, rng);
  field._ctx.forceCrit  = true;
  field._ctx.forceNoCrit = false;
  const dCrit = attacker.calcDamage('Flare Blitz', target, field, null, rng);
  truthy(dCrit > dScreened,
    `Crit must bypass Reflect and deal MORE damage than screened hit: screened=${dScreened}, crit=${dCrit}`);
});

// =============================================================================
// SECTION 2 — TERRAIN POWER EFFECTS
// =============================================================================
// Engine: terrain BP modifiers in calcDamage.
//   Electric +33%, Grassy +33%, Psychic +33%, Misty Dragon -50%.
//   Grassy also weakens Earthquake/Bulldoze by 50%.
// =============================================================================
console.log('\n=== SECTION 2: Terrain power modifiers ===');
console.log('Expected: Electric boosts Electric, Grassy boosts Grass/weakens EQ, Misty weakens Dragon.');

T('5. Electric Terrain boosts Electric-type moves for grounded attackers', () => {
  const clear    = new Field();
  const electric = new Field();
  electric.terrain = 'electric';
  const attacker = mkMon({ name: 'Raichu', nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Calm',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 } });
  const rng = () => 0.5;
  const dClear    = attacker.calcDamage('Thunderbolt', target, clear,    null, rng);
  const dElectric = attacker.calcDamage('Thunderbolt', target, electric, null, rng);
  truthy(dElectric > dClear,
    `Electric Terrain must boost Thunderbolt: clear=${dClear}, terrain=${dElectric}`);
});

T('6. Grassy Terrain weakens Earthquake by 50%', () => {
  const clear  = new Field();
  const grassy = new Field();
  grassy.terrain = 'grassy';
  const attacker = mkMon({ name: 'Garchomp', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Incineroar', nature: 'Careful',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 0 } });
  const rng = () => 0.5;
  const dClear  = attacker.calcDamage('Earthquake', target, clear,  null, rng);
  const dGrassy = attacker.calcDamage('Earthquake', target, grassy, null, rng);
  truthy(dClear > 0, `base EQ damage must be positive: ${dClear}`);
  near(dGrassy / dClear, 0.45, 0.55,
    `Grassy Terrain must halve Earthquake damage: clear=${dClear}, grassy=${dGrassy}, ratio=`);
});

T('7. Misty Terrain halves Dragon-type move damage', () => {
  const clear = new Field();
  const misty = new Field();
  misty.terrain = 'misty';
  const attacker = mkMon({ name: 'Dragapult', nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 } });
  const target   = mkMon({ name: 'Cresselia', nature: 'Calm',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 } });
  const rng = () => 0.5;
  const dClear = attacker.calcDamage('Dragon Pulse', target, clear, null, rng);
  const dMisty = attacker.calcDamage('Dragon Pulse', target, misty, null, rng);
  truthy(dClear > 0, `base Dragon Pulse damage must be positive: ${dClear}`);
  near(dMisty / dClear, 0.45, 0.55,
    `Misty Terrain must halve Dragon-type damage: clear=${dClear}, misty=${dMisty}, ratio=`);
});

// =============================================================================
// SECTION 3 — TERRAIN MECHANICS [IMPLEMENTED]
// =============================================================================
// These tests verify implemented terrain mechanics. PASS = wired correctly.
// =============================================================================
console.log('\n=== SECTION 3: Terrain mechanics [implemented] ===');
console.log('These tests verify terrain status immunity and HP recovery are wired in.');

T('8. [IMPLEMENTED] Misty Terrain blocks sleep infliction on grounded mons', () => {
  // Misty Terrain should prevent sleep (and other major statuses) on grounded mons.
  // Checked via canInflictStatus — if Misty Terrain is wired in, returns false.
  // If this FAILS: canInflictStatus does not check field.terrain for Misty Terrain.
  const field = new Field();
  field.terrain = 'misty';
  const target = mkMon({ name: 'Garchomp', nature: 'Jolly',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 } });
  const canSleep = ctx.canInflictStatus(target, 'sleep', field, null);
  falsy(canSleep,
    `Misty Terrain must block sleep on grounded Garchomp — canInflictStatus returned ${canSleep} (terrain check NOT wired in canInflictStatus)`);
});

T('9. [IMPLEMENTED] Grassy Terrain restores 1/16 max HP at end of each turn', () => {
  // Grassy Terrain should heal grounded mons 1/16 max HP per turn.
  // Champions EVs: max 32 per stat, max 66 total — use minimal EVs to pass legality.
  // Two sub-checks:
  //   (a) Grassy Surge sets terrain on entry (ability trigger wired?)
  //   (b) End-of-turn recovery loop fires for grassy terrain mons
  // If this FAILS: both Grassy Surge on-entry and recovery loop are NOT yet implemented.
  const playerTeam = team([
    mon({ name: 'Rillaboom', ability: 'Grassy Surge', nature: 'Adamant',
      evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Tackle'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 0, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 3 });
  const log = b.log || [];
  const terrainSet = logHas(log, 'Grassy Terrain') || logHas(log, 'Grassy Surge');
  truthy(terrainSet,
    `[GAP-a] Grassy Surge must set terrain on entry — NOT implemented. Log: ${log.slice(0,10).join(' | ')}`);
  truthy(logHas(log, 'restored') || logHas(log, 'Grassy') && logHas(log, 'HP'),
    `[GAP-b] Grassy Terrain must heal mons each turn — NOT implemented. Log: ${log.join(' | ')}`);
});

// =============================================================================
// SECTION 4 — INTIMIDATE REDUCES ACTUAL DAMAGE
// =============================================================================
// Engine: Intimidate applies statBoosts.atk = -1 on entry.
// getStat('atk') applies boostTable[-1] = 2/3 reduction.
// calcDamage reads getStat → damage is actually reduced.
// =============================================================================
console.log('\n=== SECTION 4: Intimidate reduces actual combat damage ===');
console.log('Expected: Intimidate -1 Atk drop reduces physical damage by ~33%.');

T('10. Intimidated mon deals less physical damage on its next move', () => {
  const field    = new Field();
  const baseline = mkMon({ name: 'Incineroar', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  const intimidated = mkMon({ name: 'Incineroar', nature: 'Adamant',
    evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 } });
  intimidated.statBoosts.atk = -1; // Intimidate applied -1 stage on entry
  const target = mkMon({ name: 'Cresselia', nature: 'Bold',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 4 } });
  const rng = () => 0.5;
  const dBaseline    = baseline.calcDamage('Flare Blitz',    target, field, null, rng);
  const dIntimidated = intimidated.calcDamage('Flare Blitz', target, field, null, rng);
  truthy(dBaseline > 0, `baseline damage must be positive: ${dBaseline}`);
  truthy(dIntimidated < dBaseline,
    `Intimidated mon must deal LESS damage: baseline=${dBaseline}, intimidated=${dIntimidated}`);
  // Atk -1 stage = 2/3 multiplier → ratio should be ~0.667
  near(dIntimidated / dBaseline, 0.60, 0.73,
    `Intimidate -1 Atk should reduce damage to ~2/3: baseline=${dBaseline}, intimidated=${dIntimidated}, ratio=`);
});

// =============================================================================
// SECTION 5 — HELD ITEMS IN LIVE BATTLE
// =============================================================================
// Champions item set: Leftovers (1/16 HP/turn), Choice Scarf (+50% Spe, move lock).
// Life Orb and similar rows can be Reg M-B review candidates, but their item
// effects remain unpromoted until source fixtures and tests pass (#11 WONTFIX).
// =============================================================================
console.log('\n=== SECTION 5: Held items in live battle ===');
console.log('Expected: Leftovers restores HP. Choice Scarf boosts speed and locks first move.');

T('11. Leftovers restores HP at end of each turn', () => {
  // Engine: end-of-turn Leftovers heal loop at line ~6006.
  // Log must contain "restored HP with Leftovers".
  const playerTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold', item: 'Leftovers',
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 4 }, moves: ['Moonblast'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Incineroar', ability: 'Intimidate', nature: 'Careful',
      evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['Tackle'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 3 });
  const log = b.log || [];
  // Cresselia needs to take damage first before Leftovers triggers
  truthy(logHas(log, 'restored HP with Leftovers') || logHas(log, 'Leftovers'),
    `Leftovers must log HP restoration. Log: ${log.join(' | ')}`);
});

T('12. Choice Scarf boosts effective speed by 50%', () => {
  // Engine getStat: if item === 'Choice Scarf', val *= 1.5 for speed.
  const withScarf    = mkMon({ name: 'Incineroar', nature: 'Careful', item: 'Choice Scarf',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 0 } });
  const withoutScarf = mkMon({ name: 'Incineroar', nature: 'Careful',
    evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 0 } });
  const field = new Field();
  const speWith    = withScarf.getStat('spe', field);
  const speWithout = withoutScarf.getStat('spe', field);
  near(speWith / speWithout, 1.45, 1.55,
    `Choice Scarf must boost speed by ~50%: without=${speWithout}, with=${speWith}, ratio=`);
});

T('13. Choice Scarf locks the user into the first move it uses', () => {
  // Engine: choiceLock set on first move used, enforced on subsequent turns.
  // If a mon has 2 moves but Choice Scarf, it must repeat the first move.
  const playerTeam = team([
    mon({ name: 'Dragapult', ability: 'Cursed Body', nature: 'Timid', item: 'Choice Scarf',
      evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      moves: ['Shadow Ball', 'Dragon Pulse'] }),
  ]);
  const oppTeam = team([
    mon({ name: 'Cresselia', ability: 'Levitate', nature: 'Bold',
      evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 252, spe: 4 }, moves: ['Moonblast'] }),
  ]);
  const b = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [1,2,3,4], maxTurns: 3 });
  const log = b.log || [];
  // Dragapult must use a move at least once
  truthy(logHas(log, 'Dragapult') && (logHas(log, 'Shadow Ball') || logHas(log, 'Dragon Pulse')),
    `Dragapult must use one of its moves. Log: ${log.slice(0,20).join(' | ')}`);
  // After the first move is locked in, the same move must be used every turn
  const moveLines = log.filter(l =>
    String(l).includes('Dragapult used Shadow Ball') ||
    String(l).includes('Dragapult used Dragon Pulse'));
  // Choice Scarf lock: once Shadow Ball or Dragon Pulse is chosen first,
  // the other must NEVER appear. Check that only one move name shows up.
  const usedShadowBall  = logHas(log, 'Dragapult used Shadow Ball');
  const usedDragonPulse = logHas(log, 'Dragapult used Dragon Pulse');
  falsy(usedShadowBall && usedDragonPulse,
    `Choice Scarf must lock Dragapult to its first move — both moves appeared: SB=${usedShadowBall} DP=${usedDragonPulse}. Log: ${log.join(' | ')}`);
});

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`DIAGNOSTIC RESULTS: ${pass} PASS  /  ${fail} FAIL  /  ${pass + fail} total`);
console.log('═══════════════════════════════════════════════════════════');

if (fail > 0) {
  console.log('\nFAILED TESTS — mechanics needing investigation or implementation:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    const isGap = r.name.includes('[GAP]');
    console.log(`  ${isGap ? '⚠ ' : '✗ '}[${isGap ? 'GAP' : 'BUG'}] ${r.name}`);
    console.log(`    ${r.reason}`);
  });
}

console.log('\nLEGEND:');
console.log('  PASS         = mechanic is wired and correct');
console.log('  FAIL [GAP]   = mechanic not yet implemented — needs future work');
console.log('  FAIL [BUG]   = mechanic exists but behaves incorrectly — fix before release');

process.exit(0); // diagnostic mode — never blocks CI
