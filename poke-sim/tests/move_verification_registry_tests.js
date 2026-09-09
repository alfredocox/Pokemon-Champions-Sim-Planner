const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console,
  require,
  module: { exports: {} },
  exports: {},
  Math,
  Object,
  Array,
  Set,
  JSON
};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
load('generated/pokemon_showdown_legal_data.js');
load('move_support.js');
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field; this.simulateBattle = simulateBattle;', ctx);

const { Pokemon, Field, simulateBattle } = ctx;
const moveSupport = ctx.ChampionsSim.moveSupport;
const applySecondary = ctx._applyDamagingMoveSecondary;
const moveHits = ctx._moveHits;

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}
function includes(line, needle) {
  return String(line).includes(needle);
}
function logDamage(line) {
  const match = String(line || '').match(/\[(\d+) dmg/);
  return match ? Number(match[1]) : null;
}
function assertRecoilRatio(battle, actor, move, numerator, denominator) {
  const damageLine = battle.log.find((line) => includes(line, `${actor} used ${move}!`) && includes(line, 'dmg'));
  const recoilLine = battle.log.find((line) => includes(line, `${actor} was hurt by recoil!`));
  truthy(damageLine, `${move} damage line missing`);
  truthy(recoilLine, `${move} recoil line missing`);
  const damage = logDamage(damageLine);
  const recoil = logDamage(recoilLine);
  truthy(Number.isFinite(damage), `${move} damage amount missing`);
  truthy(Number.isFinite(recoil), `${move} recoil amount missing`);
  eq(recoil, Math.max(1, Math.round(damage * numerator / denominator)),
    `${move} recoil should use applied damage ratio ${numerator}/${denominator}`);
}

function mk(name, overrides) {
  const d = Object.assign({ name, level: 50, moves: ['Tackle'], ability: '', item: '', nature: 'Hardy' }, overrides || {});
  return new Pokemon(d);
}

function mkField(overrides) {
  return new Field(Object.assign({ format: 'doubles' }, overrides || {}));
}

function team(name, members) {
  return { name, format: 'champions', legality_status: 'legal', members };
}

const rngAlwaysLo = () => 0.0;

console.log('\n=== move verification registry tests ===\n');

T('1. Freeze-Dry keeps Water targets super effective', () => {
  const attacker = mk('Ninetales-Alola', { moves: ['Freeze-Dry'], nature: 'Modest', evs: { spa: 31 } });
  const target = mk('Pelipper');
  const field = mkField();
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  target.types = ['Fire'];
  const neutralishDamage = attacker.calcDamage('Freeze-Dry', target, field, null, rngAlwaysLo);
  target.types = ['Water'];
  const waterDamage = attacker.calcDamage('Freeze-Dry', target, field, null, rngAlwaysLo);
  truthy(waterDamage > neutralishDamage, 'Water typing should increase Freeze-Dry damage');
});

T('2. Giga Drain heals after dealing damage', () => {
  const player = team('Drain Test', [{
    name: 'Amoonguss',
    ability: 'Regenerator',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Giga Drain'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Chip Test', [{
    name: 'Jolteon',
    ability: 'Volt Absorb',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 0, atk: 4, def: 0, spa: 0, spd: 0, spe: 252 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 3, 5, 7], maxTurns: 1 });
  truthy(battle.log.some((line) => String(line).includes('used Tackle!') && String(line).includes('Amoonguss')),
    'opponent should chip the Giga Drain user first');
  truthy(battle.log.some((line) => String(line).includes('restored HP with Giga Drain')),
    'Giga Drain heal log missing');
  const row = ((((battle.turnLog || [])[0] || {}).damage_events || []).find((event) => event.move === 'Giga Drain')) || {};
  truthy(row.drain_rule && row.drain_rule.basis === 'applied_damage', 'Giga Drain drain_rule missing');
  eq(row.drain_heal_candidate, Math.max(1, Math.round(row.applied_damage / 2)),
    'Giga Drain should use Showdown half-up drain rounding from applied damage');
  const effect = ((((battle.turnLog || [])[0] || {}).effect_events || []).find((event) => event.move === 'Giga Drain' && event.effect_kind === 'drain-heal')) || {};
  truthy(effect.actor === 'Amoonguss', 'Giga Drain effect event missing');
  eq(effect.heal_candidate, row.drain_heal_candidate, 'Giga Drain effect event should mirror damage row heal candidate');
});

T('3. Rock Tomb lowers target Speed after damage', () => {
  const player = team('Speed Drop Test', [{
    name: 'Garchomp',
    ability: 'Rough Skin',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Rock Tomb'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Dummy', [{
    name: 'Torkoal',
    ability: 'Shell Armor',
    item: '',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spa: 0, spd: 0, spe: 0, atk: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const renderedLog = battle.log.map((line) => String(line)).join('\n');
  truthy(renderedLog.includes("Torkoal's Speed fell!"), 'Rock Tomb speed-drop log missing');
});

T('4. Light Screen reduces special damage', () => {
  const attacker = mk('Gardevoir', { moves: ['Moonblast'], nature: 'Modest', evs: { spa: 31 } });
  const target = mk('Incineroar');
  const field = mkField();
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const openDamage = attacker.calcDamage('Moonblast', target, field, null, rngAlwaysLo);
  target.side.lightScreen = true;
  const screenedDamage = attacker.calcDamage('Moonblast', target, field, null, rngAlwaysLo);
  truthy(openDamage > screenedDamage, 'Light Screen should reduce special damage');
});

T('5. Reflect reduces physical damage', () => {
  const attacker = mk('Garchomp', { moves: ['Earthquake'], nature: 'Adamant', evs: { atk: 31 } });
  const target = mk('Incineroar');
  const field = mkField();
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const openDamage = attacker.calcDamage('Earthquake', target, field, null, rngAlwaysLo);
  target.side.reflect = true;
  const screenedDamage = attacker.calcDamage('Earthquake', target, field, null, rngAlwaysLo);
  truthy(openDamage > screenedDamage, 'Reflect should reduce physical damage');
});

T('6. verified registry exposes sources and tests for the promoted move slice', () => {
  ['Freeze-Dry', 'Giga Drain', 'Rock Tomb', 'Light Screen', 'Reflect', 'Knock Off'].forEach((move) => {
    const row = moveSupport.getLocalMoveSupport(move);
    truthy(row, move + ' support row missing');
    eq(row.supportLevel, 'verified', move + ' support level');
    truthy(row.verification, move + ' verification metadata missing');
    truthy(Array.isArray(row.verification.sources) && row.verification.sources.length > 0, move + ' source refs missing');
    truthy(Array.isArray(row.verification.tests) && row.verification.tests.length > 0, move + ' test refs missing');
  });
});

T('7. Weather Ball uses weather-driven typing in damage resolution', () => {
  const attacker = mk('Pelipper', { moves: ['Weather Ball'], nature: 'Modest', evs: { spa: 252 } });
  const target = mk('Tyranitar');
  const clear = mkField({ weather: 'none' });
  const rain = mkField({ weather: 'rain' });
  attacker.side = clear.playerSide;
  target.side = clear.oppSide;
  clear._ctx.forceNoCrit = true;
  const clearDamage = attacker.calcDamage('Weather Ball', target, clear, null, rngAlwaysLo);
  attacker.side = rain.playerSide;
  target.side = rain.oppSide;
  rain._ctx.forceNoCrit = true;
  const rainDamage = attacker.calcDamage('Weather Ball', target, rain, null, rngAlwaysLo);
  truthy(rainDamage > clearDamage, 'rain Weather Ball should switch to Water and beat neutral Normal damage into Tyranitar');
});

T('8. direct Electro Shot calc previews the SpA boost without mutating persistent boosts', () => {
  const attacker = mk('Archaludon', { moves: ['Electro Shot'], nature: 'Modest', evs: { spa: 252 } });
  const target = mk('Pelipper');
  const previewField = mkField({ weather: 'rain' });
  const blockedField = mkField({ weather: 'rain' });
  attacker.side = previewField.playerSide;
  target.side = previewField.oppSide;
  previewField._ctx.forceNoCrit = true;
  const previewDamage = attacker.calcDamage('Electro Shot', target, previewField, null, rngAlwaysLo);
  eq(attacker.statBoosts.spa || 0, 0, 'direct calc should not leave a lingering SpA stage');
  attacker.side = blockedField.playerSide;
  target.side = blockedField.oppSide;
  blockedField._ctx.forceNoCrit = true;
  blockedField._ctx.preDamageSpaBoostMon = attacker;
  blockedField._ctx.preDamageSpaBoostMove = 'Electro Shot';
  const blockedDamage = attacker.calcDamage('Electro Shot', target, blockedField, null, rngAlwaysLo);
  truthy(previewDamage > blockedDamage, 'Electro Shot preview should raise SpA before damage when execution has not already applied it');
});

T('9. Last Respects scales from the attacker side fainted count', () => {
  const attacker = mk('Basculegion', { moves: ['Last Respects'], nature: 'Adamant', evs: { atk: 252 }, ability: 'Adaptability' });
  const target = mk('Pelipper');
  const field = mkField();
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  field.playerSide.fainted = 0;
  field.oppSide.fainted = 5;
  const noBoostDamage = attacker.calcDamage('Last Respects', target, field, null, rngAlwaysLo);
  field.playerSide.fainted = 2;
  field.oppSide.fainted = 0;
  const boostedDamage = attacker.calcDamage('Last Respects', target, field, null, rngAlwaysLo);
  truthy(boostedDamage > noBoostDamage, 'Last Respects should read fainted allies from the attacker side only');
});

T('10. battle execution applies Electro Shot\'s SpA rise before damage resolution', () => {
  const player = team('Electro Shot Test', [{
    name: 'Archaludon',
    ability: 'Stamina',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Electro Shot'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Dummy', [{
    name: 'Pelipper',
    ability: 'Drizzle',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [5, 7, 11, 13], maxTurns: 1 });
  truthy(battle.log.some((line) => String(line).includes("Archaludon's Special Attack rose!")),
    'Electro Shot SpA-rise log missing from battle execution');
});

T('11. Terrain Pulse changes type and doubles base power for a grounded user in terrain', () => {
  const attacker = mk('Porygon2', { moves: ['Terrain Pulse'], nature: 'Modest', evs: { spa: 252 } });
  const target = mk('Pelipper');
  const clear = mkField({ terrain: 'none' });
  const electric = mkField({ terrain: 'electric' });
  attacker.side = clear.playerSide;
  target.side = clear.oppSide;
  clear._ctx.forceNoCrit = true;
  const clearDamage = attacker.calcDamage('Terrain Pulse', target, clear, null, rngAlwaysLo);
  attacker.side = electric.playerSide;
  target.side = electric.oppSide;
  electric._ctx.forceNoCrit = true;
  const boostedDamage = attacker.calcDamage('Terrain Pulse', target, electric, null, rngAlwaysLo);
  truthy(boostedDamage > clearDamage * 4, 'Terrain Pulse should gain terrain typing and doubled base power for grounded users');
});

T('12. Rising Voltage doubles only against grounded targets in Electric Terrain', () => {
  const attacker = mk('Raichu', { moves: ['Rising Voltage'], nature: 'Modest', evs: { spa: 252 } });
  const field = mkField({ terrain: 'electric' });
  const groundedTarget = mk('Pelipper');
  const flyingTarget = mk('Pelipper');
  groundedTarget.flying = false;
  flyingTarget.flying = true;
  attacker.side = field.playerSide;
  groundedTarget.side = field.oppSide;
  flyingTarget.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const groundedDamage = attacker.calcDamage('Rising Voltage', groundedTarget, field, null, rngAlwaysLo);
  const flyingDamage = attacker.calcDamage('Rising Voltage', flyingTarget, field, null, rngAlwaysLo);
  truthy(groundedDamage > flyingDamage, 'Rising Voltage should only double against grounded targets');
});

T('13. Solar Beam is halved by rain', () => {
  const attacker = mk('Venusaur', { moves: ['Solar Beam'], nature: 'Modest', evs: { spa: 252 } });
  const target = mk('Pelipper');
  const clear = mkField({ weather: 'none' });
  const rain = mkField({ weather: 'rain' });
  attacker.side = clear.playerSide;
  target.side = clear.oppSide;
  clear._ctx.forceNoCrit = true;
  const clearDamage = attacker.calcDamage('Solar Beam', target, clear, null, rngAlwaysLo);
  attacker.side = rain.playerSide;
  target.side = rain.oppSide;
  rain._ctx.forceNoCrit = true;
  const rainDamage = attacker.calcDamage('Solar Beam', target, rain, null, rngAlwaysLo);
  truthy(clearDamage > rainDamage, 'rain should cut Solar Beam damage');
});

T('14. Dragon Darts hits each opposing Pokemon once when both can be hit', () => {
  const player = team('Dragon Darts Split', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Dragon Darts'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Two Targets', [
    {
      name: 'Pelipper',
      ability: 'Drizzle',
      item: '',
      nature: 'Bold',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Incineroar',
      ability: 'Intimidate',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const damageLines = battle.log.filter((line) => includes(line, 'Dragapult used Dragon Darts! →')).slice(0, 2);
  eq(damageLines.length, 2, 'Dragon Darts should produce two damage lines');
  truthy(includes(damageLines[0], 'Incineroar') || includes(damageLines[1], 'Incineroar'), 'one dart should hit Incineroar');
  truthy(includes(damageLines[0], 'Pelipper') || includes(damageLines[1], 'Pelipper'), 'one dart should hit Pelipper');
});

T('15. Dragon Darts sends both hits into the Follow Me target', () => {
  const player = team('Dragon Darts Redirect', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Dragon Darts'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Follow Me Side', [
    {
      name: 'Indeedee-F',
      ability: 'Psychic Surge',
      item: '',
      nature: 'Bold',
      level: 50,
      moves: ['Follow Me'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const damageLines = battle.log.filter((line) => includes(line, 'Dragapult used Dragon Darts! →')).slice(0, 2);
  eq(damageLines.length, 2, 'Dragon Darts should still land two hits through Follow Me');
  truthy(damageLines.every((line) => includes(line, 'Indeedee-F')), 'both darts should be redirected into Indeedee-F');
});

T('16. Dragon Darts retargets both hits away from a protected intended target', () => {
  const player = team('Dragon Darts Protect Reroute', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Dragon Darts'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Protected Target', [
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Incineroar',
      ability: 'Intimidate',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const damageLines = battle.log.filter((line) => includes(line, 'Dragapult used Dragon Darts! →')).slice(0, 2);
  eq(damageLines.length, 2, 'Dragon Darts should still fire twice when one foe protects');
  truthy(damageLines.every((line) => includes(line, 'Incineroar')), 'both darts should reroute into the unprotected foe');
});

T('17. Meteor Beam charges on turn one before dealing damage', () => {
  const player = team('Meteor Beam Charge', [{
    name: 'Glimmora',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Meteor Beam'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [3, 4, 5, 6], maxTurns: 2 });
  const chargeIndex = battle.log.findIndex((line) => includes(line, 'Glimmora began charging Meteor Beam!'));
  const turnTwoIndex = battle.log.findIndex((line) => includes(line, '--- Turn 2 ---'));
  const damageIndex = battle.log.findIndex((line) => includes(line, 'Glimmora used Meteor Beam! →'));
  truthy(chargeIndex >= 0, 'Meteor Beam charge log missing');
  truthy(turnTwoIndex >= 0, 'turn 2 marker missing for Meteor Beam');
  truthy(damageIndex > turnTwoIndex, 'Meteor Beam should not deal damage on turn 1');
});

T('18. Solar Beam charges on turn one outside sun', () => {
  const player = team('Solar Beam Charge', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [3, 4, 5, 6], maxTurns: 2 });
  const chargeIndex = battle.log.findIndex((line) => includes(line, 'Venusaur began charging Solar Beam!'));
  const turnTwoIndex = battle.log.findIndex((line) => includes(line, '--- Turn 2 ---'));
  const damageIndex = battle.log.findIndex((line) => includes(line, 'Venusaur used Solar Beam! →'));
  truthy(chargeIndex >= 0, 'Solar Beam charge log missing');
  truthy(turnTwoIndex >= 0, 'turn 2 marker missing for Solar Beam');
  truthy(damageIndex > turnTwoIndex, 'Solar Beam should not deal damage on turn 1 outside sun');
});

T('19. Electro Shot still fires immediately in rain', () => {
  const player = team('Electro Shot Rain', [{
    name: 'Archaludon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Electro Shot'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Rain Dummy', [{
    name: 'Pelipper',
    ability: 'Drizzle',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [3, 4, 5, 6], maxTurns: 1 });
  const turnTwoIndex = battle.log.findIndex((line) => includes(line, '--- Turn 2 ---'));
  const damageIndex = battle.log.findIndex((line) => includes(line, 'Archaludon used Electro Shot! →'));
  truthy(damageIndex >= 0, 'Electro Shot damage log missing');
  truthy(turnTwoIndex < 0 || damageIndex < turnTwoIndex, 'Electro Shot should still hit on turn 1 in rain');
});

T('20. simulateBattle respects opts.maxTurns', () => {
  const player = team('Turn Cap A', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Turn Cap B', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [3, 4, 5, 6], maxTurns: 1 });
  truthy(!battle.log.some((line) => includes(line, '--- Turn 2 ---')), 'maxTurns: 1 should stop before turn 2 starts');
});

T('21. Phantom Force charges and makes the user untargetable on turn one', () => {
  const player = team('Phantom Force Charge', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Phantom Force'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Phantom Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Hurricane'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  const chargeIndex = battle.log.findIndex((line) => includes(line, 'Dragapult began charging Phantom Force!'));
  const evadeIndex = battle.log.findIndex((line) => includes(line, 'Dragapult avoided the attack while concealed!'));
  const damageIndex = battle.log.findIndex((line) => includes(line, 'Dragapult used Phantom Force! →'));
  truthy(chargeIndex >= 0, 'Phantom Force charge log missing');
  truthy(evadeIndex > chargeIndex, 'incoming attack should fail while Dragapult is concealed');
  truthy(damageIndex > evadeIndex, 'Phantom Force damage should land on the following turn');
});

T('22. Phantom Force bypasses Protect with Power Herb on the hit turn', () => {
  const player = team('Phantom Force Protect', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: 'Power Herb',
    nature: 'Jolly',
    level: 50,
    moves: ['Phantom Force'],
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Protect Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Dragapult consumed its Power Herb!')),
    'Power Herb consumption log missing');
  truthy(battle.log.some((line) => includes(line, "Dragapult's Phantom Force pierced through protection!")),
    'Phantom Force should explicitly pierce protection');
  truthy(battle.log.some((line) => includes(line, 'Dragapult used Phantom Force! → Pelipper')),
    'Phantom Force should still deal damage through Protect');
});

T('23. Phantom Force sleep interruption clears concealment instead of trapping the user off-field', () => {
  const player = team('Phantom Force Sleep Interrupt', [{
    name: 'Dragapult',
    ability: 'Clear Body',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Phantom Force'],
    status: 'sleep',
    statusTurns: 2,
    sleepTurns: 0,
    chargingMove: 'Phantom Force',
    concealedByMove: 'Phantom Force',
    evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Wake Check', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Water Gun'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Dragapult is fast asleep!')),
    'Phantom Force sleep interruption log missing');
  truthy(battle.log.some((line) => includes(line, 'Pelipper used Water Gun! → Dragapult')),
    'Dragapult should be targetable again immediately after the interrupted Phantom Force release turn');
});

T('24. Solar Beam full paralysis on the release turn cancels the queued attack', () => {
  const player = team('Solar Beam Paralysis Interrupt', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    status: 'paralysis',
    chargingMove: 'Solar Beam',
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Para Check', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Water Gun'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, {
    format: 'singles',
    seed: [8, 1025555898, 3429651764, 483484],
    maxTurns: 2
  });
  const renderedLog = battle.log.map((line) => String(line)).join('\n');
  truthy(renderedLog.includes("Venusaur is fully paralysed and can't move!"),
    'Solar Beam paralysis interruption log missing');
  truthy(renderedLog.includes('--- Turn 2 ---\nPelipper used Water Gun!'),
    'turn 2 should still begin after the interrupted Solar Beam release');
  truthy(renderedLog.includes('Venusaur began charging Solar Beam!'),
    'Solar Beam should restart charging after release-turn full paralysis');
  truthy(!renderedLog.includes('Venusaur used Solar Beam! →'),
    'Solar Beam should not still fire after release-turn full paralysis');
});

T('25. Electro Shot sleep interruption pauses the queued hit instead of canceling it', () => {
  const player = team('Electro Shot Sleep Pause', [{
    name: 'Archaludon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Electro Shot'],
    status: 'sleep',
    statusTurns: 2,
    sleepTurns: 0,
    chargingMove: 'Electro Shot',
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Sleep Pause Check', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  const turnTwoIndex = battle.log.findIndex((line) => includes(line, '--- Turn 2 ---'));
  const damageIndex = battle.log.findIndex((line) => includes(line, 'Archaludon used Electro Shot! →'));
  truthy(battle.log.some((line) => includes(line, 'Archaludon is fast asleep!')),
    'Electro Shot sleep-pause log missing');
  truthy(damageIndex > turnTwoIndex, 'Electro Shot should still fire on the later wake-up turn');
  truthy(!battle.log.some((line) => includes(line, 'Archaludon began charging Electro Shot!')),
    'Electro Shot should remain queued rather than restarting its charge after sleep');
});

T('26. stored charge keeps the original target slot when the locked foe is gone', () => {
  const player = team('Stored Charge Slot Targeting', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    chargingMove: 'Solar Beam',
    chargingTarget: { alive: false },
    chargingTargetSide: 'enemy',
    chargingTargetSlot: 1,
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Stored Charge Targets', [
    {
      name: 'Pelipper',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Incineroar',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Incineroar protected itself!')),
    'stored charge should resolve into the original enemy slot, not drift to the first live foe');
  truthy(!battle.log.some((line) => includes(line, 'Pelipper protected itself!')),
    'stored charge should not drift to slot 0 when the locked foe occupied slot 1');
});

T('27. stored charge rechecks Follow Me before Protect on the release turn', () => {
  const player = team('Stored Charge Follow Me Redirect', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    chargingMove: 'Solar Beam',
    chargingTarget: { name: 'Incineroar', alive: true },
    chargingTargetSide: 'enemy',
    chargingTargetSlot: 1,
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Stored Charge Redirect Side', [
    {
      name: 'Indeedee-F',
      ability: '',
      item: '',
      nature: 'Bold',
      level: 50,
      moves: ['Follow Me'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Incineroar',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Venusaur's attack was drawn to Indeedee-F!")),
    'stored charge should still respect Follow Me on the release turn');
  truthy(battle.log.some((line) => includes(line, 'Venusaur used Solar Beam! → Indeedee-F')),
    'stored charge should hit the redirector instead of the protected original slot');
  truthy(!battle.log.some((line) => includes(line, 'Venusaur used Solar Beam! But Incineroar was protected!')),
    'stored charge should not stop at the original protected slot before redirection');
});

T('28. stored charge respects Rage Powder immunity on the release turn', () => {
  const player = team('Stored Charge Rage Powder Immunity', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    chargingMove: 'Solar Beam',
    chargingTarget: { name: 'Incineroar', alive: true },
    chargingTargetSide: 'enemy',
    chargingTargetSlot: 1,
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Stored Charge Rage Powder Side', [
    {
      name: 'Amoonguss',
      ability: '',
      item: '',
      nature: 'Bold',
      level: 50,
      moves: ['Rage Powder'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Incineroar',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(!battle.log.some((line) => includes(line, "Venusaur's attack was drawn to Amoonguss!")),
    'Grass attackers should ignore Rage Powder even on a stored-charge release turn');
  truthy(battle.log.some((line) => includes(line, 'Incineroar protected itself!')),
    'stored charge should continue into the original protected target when Rage Powder immunity applies');
});

T('29. stored charge follows Ally Switch as a slot change on the release turn', () => {
  const player = team('Stored Charge Ally Switch Slot', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Solar Beam'],
    chargingMove: 'Solar Beam',
    chargingTarget: { name: 'Porygon2', alive: true },
    chargingTargetSide: 'enemy',
    chargingTargetSlot: 1,
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Stored Charge Ally Switch Side', [
    {
      name: 'Pelipper',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Porygon2',
      ability: '',
      item: '',
      nature: 'Sassy',
      level: 50,
      moves: ['Ally Switch'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Porygon2 switched places with its ally using Ally Switch!')),
    'Ally Switch setup log missing');
  truthy(battle.log.some((line) => includes(line, 'Pelipper protected itself!')),
    'stored charge should resolve against the new occupant of the original target slot after Ally Switch');
  truthy(!battle.log.some((line) => includes(line, 'Porygon2 protected itself!')),
    'stored charge should follow slot resolution, not stale target identity, after Ally Switch');
});

T('30. U-turn switches immediately and later actions hit the replacement', () => {
  const player = team('U-turn Pivot', [
    {
      name: 'Dragapult',
      ability: 'Clear Body',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['U-turn'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Pivot Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Dragapult pivoted out!')), 'U-turn pivot-out log missing');
  truthy(battle.log.some((line) => includes(line, 'Garchomp was sent out!')), 'U-turn replacement log missing');
  truthy(battle.log.some((line) => includes(line, 'Pelipper used Tackle! → Garchomp')),
    'later actions should target the U-turn replacement in the same turn');
});

T('31. U-turn does not switch if the attack is fully blocked', () => {
  const player = team('U-turn Protect Fail', [
    {
      name: 'Dragapult',
      ability: 'Clear Body',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['U-turn'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Protect Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Protect'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Pelipper protected itself!')), 'U-turn protect block log missing');
  truthy(!battle.log.some((line) => includes(line, 'Dragapult pivoted out!')),
    'U-turn should not switch if Protect blocks the damage');
});

T('32. Volt Switch now pivots after dealing damage', () => {
  const player = team('Volt Switch Pivot', [
    {
      name: 'Magnezone',
      ability: '',
      item: '',
      nature: 'Modest',
      level: 50,
      moves: ['Volt Switch'],
      evs: { spa: 252, spe: 252, hp: 4, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Volt Dummy', [{
    name: 'Incineroar',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Magnezone pivoted out!')), 'Volt Switch pivot-out log missing');
  truthy(battle.log.some((line) => includes(line, 'Garchomp was sent out!')), 'Volt Switch replacement log missing');
  truthy(battle.log.some((line) => includes(line, 'Incineroar used Tackle! → Garchomp')),
    'Volt Switch replacement should take later attacks in the same turn');
});

T('33. Flip Turn now pivots after dealing damage', () => {
  const player = team('Flip Turn Pivot', [
    {
      name: 'Basculegion',
      ability: '',
      item: '',
      nature: 'Adamant',
      level: 50,
      moves: ['Flip Turn'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: 'Rough Skin',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Flip Dummy', [{
    name: 'Incineroar',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Basculegion pivoted out!')), 'Flip Turn pivot-out log missing');
  truthy(battle.log.some((line) => includes(line, 'Garchomp was sent out!')), 'Flip Turn replacement log missing');
});

T('34. Parting Shot switches the user out after lowering offenses', () => {
  const player = team('Parting Shot Pivot', [
    {
      name: 'Incineroar',
      ability: 'Intimidate',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Parting Shot'],
      evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Rillaboom',
      ability: '',
      item: '',
      nature: 'Adamant',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Parting Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Incineroar's Parting Shot lowered Pelipper's offenses!")),
    'Parting Shot debuff log missing');
  truthy(battle.log.some((line) => includes(line, 'Rillaboom was sent out!')),
    'Parting Shot should bring in a replacement after the debuff');
});

T('35. Shed Tail switches out and leaves the Substitute with the replacement', () => {
  const player = team('Shed Tail Pivot', [
    {
      name: 'Cyclizar',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Shed Tail'],
      evs: { hp: 252, spe: 252, atk: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Shed Tail Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Garchomp was sent out!')),
    'Shed Tail should switch to the replacement immediately');
  truthy(battle.log.some((line) => includes(line, 'Cyclizar shed its tail and created a Substitute!')),
    'Shed Tail success log missing');
  truthy(battle.log.some((line) => includes(line, 'Pelipper used Tackle! (Substitute absorbed')),
    'incoming replacement should inherit the Substitute from Shed Tail');
  const effectRow = (battle.turnLog && battle.turnLog[0] && battle.turnLog[0].effect_events || [])
    .find(row => row.move === 'Shed Tail' && row.effect_kind === 'hp-cost-pivot-substitute');
  truthy(effectRow, 'Shed Tail effect_events row missing');
  eq(effectRow.rule && effectRow.rule.numerator, 1, 'Shed Tail HP-cost numerator should be 1');
  eq(effectRow.rule && effectRow.rule.denominator, 2, 'Shed Tail HP-cost denominator should be 2');
  eq(effectRow.rule && effectRow.rule.rounding, 'up', 'Shed Tail HP-cost rounding should be up');
  eq(effectRow.substitute_rule && effectRow.substitute_rule.denominator, 4,
    'Shed Tail substitute HP denominator should be 4');
  eq(effectRow.substitute_rule && effectRow.substitute_rule.rounding, 'down',
    'Shed Tail substitute HP rounding should be down');
  eq(effectRow.hp_cost, Math.ceil(effectRow.max_hp / 2),
    'Shed Tail should cost half max HP rounded up');
  eq(effectRow.substitute_hp, Math.floor(effectRow.max_hp / 4),
    'Shed Tail should pass a quarter-max-HP Substitute rounded down');
  eq(effectRow.hp_before - effectRow.hp_after, effectRow.hp_cost,
    'Shed Tail effect row should match actual HP lost');
});

T('36. Shed Tail fails when no replacement is available', () => {
  const player = team('Shed Tail No Bench', [{
    name: 'Cyclizar',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Shed Tail'],
    evs: { hp: 252, spe: 252, atk: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Shed Tail Fail Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Cyclizar used Shed Tail! But it failed!')),
    'Shed Tail should fail if the user has no legal switch target');
  truthy(!battle.log.some((line) => includes(line, 'was sent out!')),
    'Shed Tail should not fabricate a switch when the bench is empty');
});

T('37. Teleport switches the user out into a replacement in trainer battles', () => {
  const player = team('Teleport Pivot', [
    {
      name: 'Espeon',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Teleport'],
      evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { atk: 252, spe: 252, hp: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Teleport Dummy', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, spa: 0, spe: 252, atk: 252, def: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const renderedLog = battle.log.map((line) => String(line)).join('\n');
  truthy(renderedLog.includes('Jolteon used Tackle! → Espeon'),
    'Teleport should resolve after the opposing attack on the turn it is used');
  truthy(renderedLog.includes('Garchomp was sent out!'),
    'Teleport should bring in a legal replacement');
});

T('38. Baton Pass hands the substitute and speed boosts to the replacement', () => {
  const player = team('Baton Pass Transfer', [
    {
      name: 'Espeon',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Baton Pass'],
      substituteHp: 25,
      statBoosts: { spe: 6 },
      evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Snorlax',
      ability: '',
      item: '',
      nature: 'Brave',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, atk: 252, spd: 4, def: 0, spa: 0, spe: 0 }
    }
  ]);
  const opp = team('Baton Pass Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  const renderedLog = battle.log.map((line) => String(line)).join('\n');
  truthy(renderedLog.includes('Snorlax was sent out!'),
    'Baton Pass should switch to the replacement immediately');
  truthy(renderedLog.includes('Pelipper used Tackle! (Substitute absorbed'),
    'Baton Pass should transfer the active Substitute to the replacement');
  truthy(renderedLog.includes('--- Turn 2 ---\nSnorlax used Tackle!'),
    'Baton Pass should carry the speed boosts so the replacement acts first on the following turn');
});

T('39. Wish heals the active user at the end of the next turn', () => {
  const player = team('Wish Self Heal', [{
    name: 'Vaporeon',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Wish', 'Protect'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Wish Dummy', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, spa: 0, spe: 252, atk: 252, def: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  truthy(battle.log.some((line) => includes(line, 'Vaporeon made a wish!')),
    'Wish setup log missing');
  truthy(battle.log.some((line) => includes(line, "Player's Wish came true for Vaporeon!")),
    'Wish should resolve on the original active slot');
  truthy(battle.log.some((line) => includes(line, 'Vaporeon restored HP with Wish!')),
    'Wish heal log missing for the user');
});

T('40. Wish heals the switched-in replacement occupying the original slot', () => {
  const player = team('Wish Slot Heal', [
    {
      name: 'Espeon',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      hp: 1,
      moves: ['Wish'],
      evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Wish Slot Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  truthy(battle.log.some((line) => includes(line, 'Espeon made a wish!')),
    'Wish setup log missing before the original user faints');
  truthy(battle.log.some((line) => includes(line, 'Garchomp was sent out!')),
    'the fainted Wish user should be replaced in the same slot');
  truthy(battle.log.some((line) => includes(line, "Player's Wish came true for Garchomp!")),
    'Wish should heal the Pokemon now occupying the original slot');
  truthy(!battle.log.some((line) => includes(line, "Player's Wish came true for Espeon!")),
    'Wish should not stay locked to the original user identity after a replacement takes the slot');
});

T('41. Swords Dance sharply raises the user Attack', () => {
  const player = team('Swords Dance Boost', [{
    name: 'Scizor',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Swords Dance'],
    evs: { hp: 252, atk: 252, spd: 4, def: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Boost Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Scizor's Attack sharply rose!")),
    'Swords Dance should raise Attack by two stages');
});

T('42. Dragon Dance raises both Attack and Speed', () => {
  const player = team('Dragon Dance Boost', [{
    name: 'Dragonite',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Dragon Dance'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Dragon Dance Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Dragonite's Attack rose!")),
    'Dragon Dance Attack-rise log missing');
  truthy(battle.log.some((line) => includes(line, "Dragonite's Speed rose!")),
    'Dragon Dance Speed-rise log missing');
});

T('43. Fake Tears harshly lowers the target Special Defense', () => {
  const player = team('Fake Tears Drop', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Fake Tears'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Fake Tears Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Pelipper's Special Defense harshly fell!")),
    'Fake Tears should lower Special Defense by two stages');
});

T('44. Coaching boosts the ally Attack and Defense in doubles', () => {
  const player = team('Coaching Boost', [
    {
      name: 'Riolu',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Coaching'],
      evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Coaching Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Garchomp's Attack rose!")),
    'Coaching should raise the ally Attack');
  truthy(battle.log.some((line) => includes(line, "Garchomp's Defense rose!")),
    'Coaching should raise the ally Defense');
  truthy(!battle.log.some((line) => includes(line, "Riolu's Attack rose!")),
    'Coaching should not raise the user stats');
});

T('45. Coaching fails when there is no ally to receive it', () => {
  const player = team('Coaching Fail', [{
    name: 'Riolu',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Coaching'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Coaching Fail Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Riolu used Coaching! But it failed!')),
    'Coaching should fail without an ally present');
});

T('46. Clangorous Soul trades HP for boosts to all five combat stats', () => {
  const player = team('Clangorous Soul Boost', [{
    name: 'Kommo-o',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Clangorous Soul'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Soul Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  [
    "Kommo-o's Attack rose!",
    "Kommo-o's Defense rose!",
    "Kommo-o's Special Attack rose!",
    "Kommo-o's Special Defense rose!",
    "Kommo-o's Speed rose!"
  ].forEach((needle) => truthy(battle.log.some((line) => includes(line, needle)), needle + ' log missing'));
  truthy(battle.log.some((line) => includes(line, 'Kommo-o paid') && includes(line, 'Clangorous Soul')),
    'Clangorous Soul HP-cost log missing');
});

T('47. Clangorous Soul fails when the user does not have enough HP to pay the cost', () => {
  const player = team('Clangorous Soul Fail', [{
    name: 'Kommo-o',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    hp: 50,
    moves: ['Clangorous Soul'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Soul Fail Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Kommo-o used Clangorous Soul! But it failed!')),
    'Clangorous Soul should fail when the HP cost cannot be paid');
});

T('48. Hypnosis can inflict sleep on a valid target', () => {
  const player = team('Hypnosis Test', [{
    name: 'Hypno',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Hypnosis'],
    evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Hypnosis Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => String(line).includes('Pelipper fell asleep from Hypno\'s Hypnosis!')),
    'Hypnosis sleep log missing');
});

T('49. Spore inflicts sleep on a valid target', () => {
  const player = team('Spore Test', [{
    name: 'Amoonguss',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Spore'],
    evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Spore Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => String(line).includes('Pelipper fell asleep from Amoonguss\'s Spore!')),
    'Spore sleep log missing');
});

T('50. Leech Seed drains HP at end of turn', () => {
  const player = team('Leech Seed Test', [{
    name: 'Amoonguss',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Leech Seed'],
    evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Leech Seed Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'was seeded!')),
    'Leech Seed setup log missing');
  truthy(battle.log.some((line) => includes(line, 'was sapped by Leech Seed!')),
    'Leech Seed drain log missing');
});

T('51. Perish Song sets the countdown on active battlers', () => {
  const player = team('Perish Song Test', [{
    name: 'Politoed',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Perish Song'],
    evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Perish Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'sang a Perish Song!')),
    'Perish Song setup log missing');
});

T('52. Perish Song KOs battlers when the counter expires', () => {
  const player = team('Perish Song Expire', [{
    name: 'Politoed',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    perishSongTurns: 1,
    moves: ['Tackle'],
    evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Perish Expire Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    perishSongTurns: 1,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'perished due to Perish Song!')),
    'Perish Song should KO battlers when the counter reaches zero');
});

T('53. Trick swaps items and the gained Choice Scarf changes later turn order', () => {
  const player = team('Trick Order Test', [{
    name: 'Mew',
    ability: '',
    item: '',
    nature: 'Hardy',
    level: 50,
    moves: ['Trick'],
    evs: { hp: 4, spa: 0, spe: 252, atk: 252, def: 0, spd: 0 }
  }]);
  const opp = team('Trick Order Dummy', [{
    name: 'Gyarados',
    ability: '',
    item: 'Choice Scarf',
    nature: 'Jolly',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, spa: 0, spe: 252, atk: 252, def: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 2 });
  const renderedLog = battle.log.map((line) => String(line)).join('\n');
  truthy(renderedLog.includes('Mew swapped items with Gyarados using Trick!'),
    'Trick item-swap log missing');
  const turn2 = renderedLog.indexOf('--- Turn 2 ---');
  truthy(turn2 >= 0, 'Turn 2 marker missing for Trick test');
  const mewTurn2 = renderedLog.indexOf('Mew used Trick!', turn2);
  const gyroTurn2 = renderedLog.indexOf('Gyarados used Tackle!', turn2);
  truthy(mewTurn2 >= 0 && gyroTurn2 >= 0 && mewTurn2 < gyroTurn2,
    'Choice Scarf should move to Mew and make it act first on turn 2');
});

T('54. Heal Pulse restores half HP to a damaged ally', () => {
  const player = team('Heal Pulse Test', [
    {
      name: 'Indeedee-F',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Heal Pulse'],
      evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      hp: 50,
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Heal Pulse Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'restored HP for Garchomp with Heal Pulse!')),
    'Heal Pulse heal log missing');
});

T('55. Heal Pulse fails on a full-HP target', () => {
  const player = team('Heal Pulse Fail', [
    {
      name: 'Indeedee-F',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Heal Pulse'],
      evs: { hp: 252, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Heal Pulse Fail Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Indeedee-F used Heal Pulse! But it failed!')),
    'Heal Pulse should fail at full HP');
});

T('56. Heal Bell cures active and bench ally status conditions', () => {
  const player = team('Heal Bell Test', [
    {
      name: 'Whimsicott',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Heal Bell'],
      evs: { hp: 252, spe: 252, def: 4, atk: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      status: 'paralysis',
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Volcarona',
      ability: '',
      item: '',
      nature: 'Modest',
      level: 50,
      status: 'burn',
      moves: ['Protect'],
      evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
    }
  ]);
  const opp = team('Heal Bell Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [7, 6, 5, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Whimsicott's team was cured of status conditions with Heal Bell!")),
    'Heal Bell cure log missing');
  const postStatus = battle.turnLog[0].post.status;
  truthy(!postStatus['player:active:1:Garchomp'], 'Heal Bell should cure active ally status');
  truthy(!postStatus['player:bench:0:Volcarona'], 'Heal Bell should cure bench ally status');
});

T('57. Aromatherapy cures active and bench ally status conditions', () => {
  const player = team('Aromatherapy Test', [
    {
      name: 'Roserade',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Aromatherapy'],
      evs: { hp: 252, spe: 252, spa: 4, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      status: 'burn',
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Volcarona',
      ability: '',
      item: '',
      nature: 'Modest',
      level: 50,
      status: 'poison',
      moves: ['Protect'],
      evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
    }
  ]);
  const opp = team('Aromatherapy Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 6, 1, 8], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Roserade's team was cured of status conditions with Aromatherapy!")),
    'Aromatherapy cure log missing');
  const postStatus = battle.turnLog[0].post.status;
  truthy(!postStatus['player:active:1:Garchomp'], 'Aromatherapy should cure active ally status');
  truthy(!postStatus['player:bench:0:Volcarona'], 'Aromatherapy should cure bench ally status');
});

T('58. Jungle Healing restores ally HP and cures status', () => {
  const player = team('Jungle Healing Test', [
    {
      name: 'Tapu Fini',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Jungle Healing'],
      evs: { hp: 252, def: 4, spd: 252, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      hp: 80,
      status: 'burn',
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Volcarona',
      ability: '',
      item: '',
      nature: 'Modest',
      level: 50,
      status: 'sleep',
      moves: ['Protect'],
      evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
    }
  ]);
  const opp = team('Jungle Healing Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [2, 4, 6, 8], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'healed its allies with Jungle Healing!')),
    'Jungle Healing log missing');
  const preHp = battle.turnLog[0].pre.hp_pct['player:active:1:Garchomp'];
  const postHp = battle.turnLog[0].post.hp_pct['player:active:1:Garchomp'];
  truthy(postHp > preHp, 'Jungle Healing should restore ally HP');
  const postStatus = battle.turnLog[0].post.status;
  truthy(!postStatus['player:active:1:Garchomp'], 'Jungle Healing should cure active ally status');
  truthy(!postStatus['player:bench:0:Volcarona'], 'Jungle Healing should cure bench ally status');
});

T('59. Snarl lowers target Special Attack after damage', () => {
  const player = team('Snarl Test', [{
    name: 'Murkrow',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Snarl'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Snarl Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [9, 9, 9, 9], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Torkoal's Special Attack fell!")),
    'Snarl special-attack drop log missing');
  truthy(battle.log.some((line) => includes(line, 'Murkrow used Snarl! → Torkoal')),
    'Snarl damage log missing');
});

T('60. Lunge lowers target Attack after damage', () => {
  const player = team('Lunge Test', [{
    name: 'Scizor',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Lunge'],
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Lunge Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [8, 8, 8, 8], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Torkoal's Attack fell!")),
    'Lunge attack-drop log missing');
  truthy(battle.log.some((line) => includes(line, 'Scizor used Lunge! → Torkoal')),
    'Lunge damage log missing');
});

T('61. Noble Roar lowers the target Attack and Special Attack', () => {
  const player = team('Noble Roar Test', [{
    name: 'Whimsicott',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Noble Roar'],
    evs: { hp: 252, spe: 252, def: 4, atk: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Noble Roar Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Splash'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [3, 1, 4, 1], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Torkoal's Attack fell!")),
    'Noble Roar attack-drop log missing');
  truthy(battle.log.some((line) => includes(line, "Torkoal's Special Attack fell!")),
    'Noble Roar special-attack-drop log missing');
});

T('62. Super Fang halves the target current HP', () => {
  const player = team('Super Fang Test', [{
    name: 'Crobat',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Super Fang'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Super Fang Dummy', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [2, 7, 1, 8], maxTurns: 1 });
  const preHp = battle.turnLog[0].pre.hp_pct['opponent:active:0:Torkoal'];
  const postHp = battle.turnLog[0].post.hp_pct['opponent:active:0:Torkoal'];
  truthy(postHp < preHp, 'Super Fang should reduce target HP');
  truthy(Math.abs(postHp - (preHp / 2)) < 0.02, 'Super Fang should halve current HP');
});

T('63. Pollen Puff heals a damaged ally', () => {
  const player = team('Pollen Puff Test', [
    {
      name: 'Butterfree',
      ability: '',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Pollen Puff'],
      evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      hp: 60,
      moves: ['Protect'],
      evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
    }
  ]);
  const opp = team('Pollen Puff Dummy', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [4, 4, 4, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'restored HP for Garchomp with Pollen Puff!')),
    'Pollen Puff heal log missing');
  const preHp = battle.turnLog[0].pre.hp_pct['player:active:1:Garchomp'];
  const postHp = battle.turnLog[0].post.hp_pct['player:active:1:Garchomp'];
  truthy(postHp > preHp, 'Pollen Puff should restore ally HP');
});

T('64. Psychic Noise blocks recovery for two turns', () => {
  const player = team('Psychic Noise Test', [{
    name: 'Gardevoir',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Psychic Noise'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Psychic Noise Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    hp: 120,
    moves: ['Recover'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [5, 5, 5, 5], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'can no longer recover HP because of Psychic Noise!')),
    'Psychic Noise block log missing');
  truthy(battle.log.some((line) => includes(line, 'Snorlax used Recover! But it failed!')),
    'Psychic Noise should block Recover');
});

T('65. Matcha Gotcha damages, heals the user, and can burn', () => {
  const player = team('Matcha Gotcha Test', [{
    name: 'Mew',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    hp: 120,
    moves: ['Matcha Gotcha'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Matcha Gotcha Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax was burned by Mew's Matcha Gotcha!")),
    'Matcha Gotcha burn log missing');
  truthy(battle.log.some((line) => includes(line, 'restored HP with Matcha Gotcha!')),
    'Matcha Gotcha drain heal missing');
});

T('66. Dire Claw can inflict a major status effect', () => {
  const player = team('Dire Claw Test', [{
    name: 'Mew',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Dire Claw'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Dire Claw Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax was poisoned by Mew's Dire Claw!")),
    'Dire Claw status log missing');
});

T('67. Air Slash can flinch the target', () => {
  const player = team('Air Slash Test', [{
    name: 'Togekiss',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Air Slash'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Air Slash Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax flinched and couldn't move!")),
    'Air Slash flinch log missing');
});

T('68. Dark Pulse can flinch the target', () => {
  const player = team('Dark Pulse Test', [{
    name: 'Hydreigon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Dark Pulse'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Dark Pulse Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax flinched and couldn't move!")),
    'Dark Pulse flinch log missing');
});

T('69. Iron Head can flinch the target', () => {
  const player = team('Iron Head Test', [{
    name: 'Excadrill',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Iron Head'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Iron Head Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax flinched and couldn't move!")),
    'Iron Head flinch log missing');
});

T('70. Rock Slide can flinch the target', () => {
  const player = team('Rock Slide Test', [{
    name: 'Tyranitar',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Rock Slide'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Rock Slide Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax flinched and couldn't move!")),
    'Rock Slide flinch log missing');
});

T('71. Will-O-Wisp burns the target', () => {
  const player = team('Will-O-Wisp Test', [{
    name: 'Rotom-Heat',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Will-O-Wisp'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Will-O-Wisp Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 16, 0, 39], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Snorlax was burned by Rotom-Heat's Will-O-Wisp!")),
    'Will-O-Wisp burn log missing');
});

T('72. Thunder Wave inflicts paralysis', () => {
  const player = team('Thunder Wave Test', [{
    name: 'Raichu',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Thunder Wave'],
    evs: { hp: 252, spe: 252, spa: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Thunder Wave Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 91], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Snorlax is paralysed! It may be unable to move!')),
    'Thunder Wave paralysis log missing');
});

T('73. Sleep Powder inflicts sleep', () => {
  const player = team('Sleep Powder Test', [{
    name: 'Venusaur',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Sleep Powder'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Sleep Powder Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 91], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Snorlax fell asleep from Venusaur\'s Sleep Powder!')),
    'Sleep Powder sleep log missing');
});

T('74. Helping Hand boosts an ally attack in doubles', () => {
  const attacker = mk('Snorlax', { moves: ['Tackle'], nature: 'Brave', evs: { atk: 252 } });
  const target = mk('Blissey', { nature: 'Bold', evs: { hp: 252, def: 252 } });
  const field = mkField({ format: 'doubles' });
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;

  const baseDamage = attacker.calcDamage('Tackle', target, field, null, rngAlwaysLo);
  attacker.helpingHand = true;
  const boostedDamage = attacker.calcDamage('Tackle', target, field, null, rngAlwaysLo);

  truthy(boostedDamage > baseDamage, 'Helping Hand should increase allied attack damage');
});

T('75. Shore Up heals the user', () => {
  const player = team('Shore Up Test', [{
    name: 'Gastrodon',
    ability: '',
    item: '',
    nature: 'Bold',
    level: 50,
    hp: 80,
    moves: ['Shore Up'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Shore Up Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'regained health with Shore Up!')),
    'Shore Up heal log missing');
});

T('76. Rain Dance sets rain before later damage checks use weather', () => {
  const player = team('Rain Dance Test', [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Rain Dance'],
    evs: { hp: 252, def: 4, spd: 252, atk: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Rain Dance Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'It started to rain!')),
    'Rain Dance weather log missing');
});

T('77. Sunny Day sets sun before later damage checks use weather', () => {
  const player = team('Sunny Day Test', [{
    name: 'Torkoal',
    ability: '',
    item: '',
    nature: 'Relaxed',
    level: 50,
    moves: ['Sunny Day'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const opp = team('Sunny Day Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'The sunlight turned harsh!')),
    'Sunny Day weather log missing');
});

T('78. Flare Blitz applies recoil after a successful hit', () => {
  const player = team('Flare Blitz Recoil', [{
    name: 'Arcanine',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Flare Blitz'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Flare Blitz Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  assertRecoilRatio(battle, 'Arcanine', 'Flare Blitz', 33, 100);
});

T('79. Wave Crash applies recoil after a successful hit', () => {
  const player = team('Wave Crash Recoil', [{
    name: 'Basculegion',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Wave Crash'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Wave Crash Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  assertRecoilRatio(battle, 'Basculegion', 'Wave Crash', 33, 100);
});

T('80. Head Smash applies heavy recoil after a successful hit', () => {
  const player = team('Head Smash Recoil', [{
    name: 'Tyranitar',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Head Smash'],
    evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Head Smash Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  assertRecoilRatio(battle, 'Tyranitar', 'Head Smash', 1, 2);
});

T('81. Aqua Jet lets a slower attacker move before a faster standard-priority target', () => {
  const player = team('Aqua Jet Priority', [{
    name: 'Azumarill',
    ability: '',
    item: '',
    nature: 'Brave',
    level: 50,
    moves: ['Aqua Jet'],
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Aqua Jet Dummy', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const firstDamage = battle.log.find((line) => includes(line, 'used '));
  truthy(includes(firstDamage, 'Azumarill used Aqua Jet!'), 'Aqua Jet should act before faster Tackle');
});

T('82. Extreme Speed outranks Aqua Jet at the priority layer', () => {
  const player = team('Extreme Speed Priority', [{
    name: 'Dragonite',
    ability: '',
    item: '',
    nature: 'Brave',
    level: 50,
    moves: ['Extreme Speed'],
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Aqua Jet Priority Dummy', [{
    name: 'Azumarill',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Aqua Jet'],
    evs: { hp: 252, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const firstDamage = battle.log.find((line) => includes(line, 'used '));
  truthy(includes(firstDamage, 'Dragonite used Extreme Speed!'), 'Extreme Speed should act before Aqua Jet');
});

T('83. Vacuum Wave carries priority through the special attacking path', () => {
  const player = team('Vacuum Wave Priority', [{
    name: 'Lucario',
    ability: '',
    item: '',
    nature: 'Quiet',
    level: 50,
    moves: ['Vacuum Wave'],
    evs: { hp: 252, spa: 252, def: 4, atk: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Vacuum Wave Dummy', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const firstDamage = battle.log.find((line) => includes(line, 'used '));
  truthy(includes(firstDamage, 'Lucario used Vacuum Wave!'), 'Vacuum Wave should act before faster Tackle');
});

T('84. Shadow Sneak carries priority through the physical attacking path', () => {
  const player = team('Shadow Sneak Priority', [{
    name: 'Mimikyu',
    ability: '',
    item: '',
    nature: 'Brave',
    level: 50,
    moves: ['Shadow Sneak'],
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Shadow Sneak Dummy', [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const firstDamage = battle.log.find((line) => includes(line, 'used '));
  truthy(includes(firstDamage, 'Mimikyu used Shadow Sneak!'), 'Shadow Sneak should act before faster Tackle');
});

T('85. Draco Meteor harshly lowers the user Special Attack after damage', () => {
  const player = team('Draco Meteor Self Drop', [{
    name: 'Hydreigon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Draco Meteor'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Draco Meteor Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Hydreigon's Special Attack harshly fell!")),
    'Draco Meteor self-drop log missing');
});

T('86. Overheat harshly lowers the user Special Attack after damage', () => {
  const player = team('Overheat Self Drop', [{
    name: 'Torkoal',
    ability: 'No Guard',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Overheat'],
    evs: { hp: 252, spa: 252, def: 4, atk: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Overheat Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Torkoal's Special Attack harshly fell!")),
    'Overheat self-drop log missing');
});

T('87. Close Combat lowers the user defensive stats after damage', () => {
  const player = team('Close Combat Self Drop', [{
    name: 'Lucario',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Close Combat'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]);
  const opp = team('Close Combat Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Lucario's Defense fell!")),
    'Close Combat Defense drop log missing');
  truthy(battle.log.some((line) => includes(line, "Lucario's Special Defense fell!")),
    'Close Combat Special Defense drop log missing');
});

T('88. Headlong Rush lowers the user defensive stats after damage', () => {
  const player = team('Headlong Rush Self Drop', [{
    name: 'Ursaluna',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Headlong Rush'],
    evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Headlong Rush Dummy', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Ursaluna's Defense fell!")),
    'Headlong Rush Defense drop log missing');
  truthy(battle.log.some((line) => includes(line, "Ursaluna's Special Defense fell!")),
    'Headlong Rush Special Defense drop log missing');
});

T('89. Clanging Scales lowers the user Defense after spread damage', () => {
  const player = team('Clanging Scales Self Drop', [{
    name: 'Kommo-o',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Clanging Scales'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Clanging Scales Dummy', [
    {
      name: 'Snorlax',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Pelipper',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 252, def: 4, spd: 252, atk: 0, spa: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Kommo-o's Defense fell!")),
    'Clanging Scales Defense drop log missing');
});

T('90. Showdown camelCase spread target data still hits both adjacent foes', () => {
  const player = team('Spread Target Player', [
    {
      name: 'Sneasler',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 1, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 1, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
    }
  ]);
  const opp = team('Spread Target Opponent', [
    {
      name: 'Farigiraf',
      ability: '',
      item: '',
      nature: 'Modest',
      level: 50,
      moves: ['Hyper Voice'],
      evs: { hp: 32, spa: 32, def: 1, atk: 0, spd: 0, spe: 0 }
    },
    {
      name: 'Torkoal',
      ability: '',
      item: '',
      nature: 'Quiet',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 32, spa: 32, def: 1, atk: 0, spd: 0, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const voiceHits = battle.log.filter((line) => includes(line, 'Farigiraf used Hyper Voice! →'));
  eq(voiceHits.length, 2, 'Hyper Voice should resolve as all-adjacent-foes from generated Showdown data');
  truthy(voiceHits.some((line) => includes(line, '→ Sneasler')), 'Hyper Voice should hit first adjacent foe');
  truthy(voiceHits.some((line) => includes(line, '→ Garchomp')), 'Hyper Voice should hit second adjacent foe');
  truthy(!battle.log.some((line) => includes(line, 'Farigiraf used Hyper Voice! (no valid target)')),
    'Hyper Voice should not fall through as a stale single-target move');
});

T('91. single-target damage retargets when the intended opposing target fainted first', () => {
  const player = team('Retarget Player', [
    {
      name: 'Sneasler',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Close Combat'],
      evs: { hp: 1, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
    },
    {
      name: 'Basculegion',
      ability: 'Adaptability',
      item: 'Mystic Water',
      nature: 'Adamant',
      level: 50,
      moves: ['Wave Crash'],
      evs: { hp: 1, atk: 32, def: 0, spa: 0, spd: 0, spe: 0 }
    }
  ]);
  const opp = team('Retarget Opponent', [
    {
      name: 'Smeargle',
      ability: '',
      item: '',
      nature: 'Hardy',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: 'Milotic',
      ability: '',
      item: '',
      nature: 'Bold',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 1, spe: 0 }
    }
  ]);
  const battle = simulateBattle(player, opp, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Smeargle fainted!')), 'setup should remove the originally chosen target first');
  truthy(battle.log.some((line) => includes(line, 'Basculegion used Wave Crash! → Milotic')),
    'Wave Crash should retarget the remaining live opposing slot');
  truthy(!battle.log.some((line) => includes(line, 'Basculegion used Wave Crash! (no valid target)')),
    'single-target damage should not fail while another opposing slot is live');
});

T('92. Knock Off gains base power against removable held items only', () => {
  const attacker = mk('Incineroar', { moves: ['Knock Off'], nature: 'Adamant', evs: { atk: 32 } });
  const noItemTarget = mk('Pelipper', { item: '', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const itemTarget = mk('Pelipper', { item: 'Leftovers', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const field = mkField();
  attacker.side = field.playerSide;
  noItemTarget.side = field.oppSide;
  itemTarget.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const noItemDamage = attacker.calcDamage('Knock Off', noItemTarget, field, null, rngAlwaysLo);
  const itemDamage = attacker.calcDamage('Knock Off', itemTarget, field, null, rngAlwaysLo);
  truthy(itemDamage > noItemDamage, 'removable held item should activate Knock Off base-power boost');
});

T('93. Knock Off removes a removable held item after a successful damaging hit', () => {
  const player = team('Knock Off Player', [{
    name: 'Incineroar',
    ability: 'Intimidate',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Knock Off'],
    evs: { hp: 32, atk: 32, def: 1, spa: 0, spd: 0, spe: 0 }
  }]);
  const opp = team('Knock Off Target', [{
    name: 'Pelipper',
    ability: 'Drizzle',
    item: 'Leftovers',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 1, atk: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const postRow = ((battle.turnLog[0] || {}).post || {}).roster.opponent.find((row) => row.species === 'Pelipper');
  truthy(postRow, 'Pelipper post-roster row missing');
  eq(postRow.item, '', 'Knock Off should remove Leftovers');
  truthy(postRow.itemConsumed, 'removed item should mark itemConsumed for later item-state logic');
  truthy(battle.log.some((line) => includes(line, 'Pelipper lost its Leftovers because of Knock Off!')),
    'Knock Off removal log missing');
});

T('94. Knock Off does not boost or remove a corresponding Mega Stone before Mega activation', () => {
  const attacker = mk('Incineroar', { moves: ['Knock Off'], nature: 'Adamant', evs: { atk: 32 } });
  const noItemTarget = mk('Charizard', { item: '', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const baseStoneTarget = mk('Charizard', { item: 'Charizardite Y', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const megaMetadataTarget = mk('Charizard-Mega-Y', { item: 'Charizardite Y', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const field = mkField();
  attacker.side = field.playerSide;
  noItemTarget.side = field.oppSide;
  baseStoneTarget.side = field.oppSide;
  megaMetadataTarget.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const noItemDamage = attacker.calcDamage('Knock Off', noItemTarget, field, null, rngAlwaysLo);
  const baseStoneDamage = attacker.calcDamage('Knock Off', baseStoneTarget, field, null, rngAlwaysLo);
  const megaMetadataDamage = attacker.calcDamage('Knock Off', megaMetadataTarget, field, null, rngAlwaysLo);
  eq(baseStoneDamage, noItemDamage, 'base species holding corresponding Mega Stone should not activate Knock Off boost');
  eq(megaMetadataDamage, noItemDamage, 'mega metadata holding corresponding Mega Stone should not activate Knock Off boost');

  const battle = simulateBattle(team('Knock Mega Player', [{
    name: 'Incineroar',
    ability: 'Intimidate',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Knock Off'],
    evs: { hp: 32, atk: 32, def: 1, spa: 0, spd: 0, spe: 0 }
  }]), team('Mega Stone Target', [{
    name: 'Charizard-Mega-Y',
    ability: 'Blaze',
    item: 'Charizardite Y',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 1, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [2, 2, 3, 4], maxTurns: 1 });
  const postRow = ((battle.turnLog[0] || {}).post || {}).roster.opponent.find((row) => row.item === 'Charizardite Y');
  truthy(postRow, 'Charizardite Y should remain held after Knock Off');
  truthy(!postRow.itemConsumed, 'corresponding Mega Stone should not be marked consumed');
  truthy(!battle.log.some((line) => includes(line, 'lost its Charizardite Y because of Knock Off')),
    'corresponding Mega Stone should not be removed');
  const damageRow = (((battle.turnLog[0] || {}).damage_events || []).find((row) => row.move === 'Knock Off')) || {};
  eq(damageRow.knock_off_boost, false, 'damage event should prove no Knock Off boost on corresponding Mega Stone');
});

T('95. Sticky Hold blocks Knock Off item removal while still allowing the damage boost', () => {
  const attacker = mk('Sableye', { moves: ['Knock Off'], nature: 'Adamant', evs: { atk: 1 } });
  const noItemTarget = mk('Muk', { item: '', ability: 'Sticky Hold', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const stickyTarget = mk('Muk', { item: 'Leftovers', ability: 'Sticky Hold', nature: 'Bold', evs: { hp: 32, def: 32 } });
  const field = mkField();
  attacker.side = field.playerSide;
  noItemTarget.side = field.oppSide;
  stickyTarget.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  const noItemDamage = attacker.calcDamage('Knock Off', noItemTarget, field, null, rngAlwaysLo);
  const stickyDamage = attacker.calcDamage('Knock Off', stickyTarget, field, null, rngAlwaysLo);
  truthy(stickyDamage > noItemDamage, 'Sticky Hold should not suppress Knock Off damage boost');

  const battle = simulateBattle(team('Sticky Knock Player', [{
    name: 'Sableye',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Knock Off'],
    evs: { hp: 32, atk: 1, def: 1, spa: 0, spd: 0, spe: 0 }
  }]), team('Sticky Knock Target', [{
    name: 'Muk',
    ability: 'Sticky Hold',
    item: 'Leftovers',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 1, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const postRow = ((battle.turnLog[0] || {}).post || {}).roster.opponent.find((row) => row.species === 'Muk');
  truthy(postRow, 'Muk post-roster row missing');
  eq(postRow.item, 'Leftovers', 'Sticky Hold should keep the item while the holder survives');
  truthy(!battle.log.some((line) => includes(line, 'Muk lost its Leftovers because of Knock Off!')),
    'Sticky Hold should block Knock Off removal log while alive');
});

T('96. Knock Off against a legal no-item target does not boost or remove anything', () => {
  const battle = simulateBattle(team('No Item Knock Player', [{
    name: 'Incineroar',
    ability: 'Intimidate',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Knock Off'],
    evs: { hp: 32, atk: 32, def: 1, spa: 0, spd: 0, spe: 0 }
  }]), team('No Item Knock Target', [{
    name: 'Pelipper',
    ability: 'Drizzle',
    item: '',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 1, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const postRow = ((battle.turnLog[0] || {}).post || {}).roster.opponent.find((row) => row.species === 'Pelipper');
  truthy(postRow, 'Pelipper post-roster row missing');
  eq(postRow.item, '', 'legal no-item target should remain itemless');
  truthy(!postRow.itemConsumed, 'legal no-item target should not be marked itemConsumed');
  truthy(!battle.log.some((line) => includes(line, 'lost its') && includes(line, 'because of Knock Off')),
    'Knock Off should not log item removal for a no-item target');
  const damageRow = (((battle.turnLog[0] || {}).damage_events || []).find((row) => row.move === 'Knock Off')) || {};
  eq(damageRow.knock_off_boost, false, 'damage event should prove no Knock Off boost on a no-item target');
});

T('97. Dual Wingbeat executes exactly two damaging hits', () => {
  const battle = simulateBattle(team('Dual Wingbeat Player', [{
    name: 'Talonflame',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Dual Wingbeat'],
    evs: { hp: 4, atk: 252, spe: 252, def: 0, spa: 0, spd: 0 }
  }]), team('Dual Wingbeat Target', [{
    name: 'Amoonguss',
    ability: '',
    item: '',
    nature: 'Bold',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const hits = battle.log.filter((line) => includes(line, 'Talonflame used Dual Wingbeat! → Amoonguss'));
  eq(hits.length, 2, 'Dual Wingbeat should produce two damage lines');
  truthy(battle.log.some((line) => includes(line, 'Dual Wingbeat hit 2 times!')), 'Dual Wingbeat hit-count log missing');
});

T('98. Poltergeist fails against no-item targets and damages item holders', () => {
  const attacker = mk('Aegislash-Blade', { moves: ['Poltergeist'], nature: 'Adamant', evs: { atk: 252 } });
  const noItemTarget = mk('Cresselia', { item: '' });
  const itemTarget = mk('Cresselia', { item: 'Sitrus Berry' });
  const field = mkField();
  attacker.side = field.playerSide;
  noItemTarget.side = field.oppSide;
  itemTarget.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  eq(attacker.calcDamage('Poltergeist', noItemTarget, field, null, rngAlwaysLo), 0, 'Poltergeist should fail without a target item');
  truthy(attacker.calcDamage('Poltergeist', itemTarget, field, null, rngAlwaysLo) > 0, 'Poltergeist should damage an item holder');
});

T('99. Leaf Storm drops the user Special Attack after successful damage', () => {
  const battle = simulateBattle(team('Leaf Storm User', [{
    name: 'Serperior',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Leaf Storm'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]), team('Leaf Storm Target', [{
    name: 'Gastrodon',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, "Serperior's Special Attack harshly fell!")),
    'Leaf Storm SpA self-drop log missing');
});

T('100. Stomping Tantrum doubles base power after the previous move failed', () => {
  const attacker = mk('Incineroar', { moves: ['Stomping Tantrum'], nature: 'Adamant', evs: { atk: 252 } });
  const target = mk('Kingambit');
  const field = mkField();
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field._ctx.forceNoCrit = true;
  attacker.lastMoveFailed = false;
  const normalDamage = attacker.calcDamage('Stomping Tantrum', target, field, null, rngAlwaysLo);
  attacker.lastMoveFailed = true;
  const boostedDamage = attacker.calcDamage('Stomping Tantrum', target, field, null, rngAlwaysLo);
  truthy(boostedDamage > normalDamage, 'Stomping Tantrum should be stronger after a failed move');
});

T('101. weather and true-accuracy move rules are deterministic', () => {
  const attacker = mk('Raichu', { moves: ['Thunder'], nature: 'Modest', evs: { spa: 252 } });
  const target = mk('Pelipper');
  const rain = mkField({ weather: 'rain' });
  const sun = mkField({ weather: 'sun' });
  const snow = mkField({ weather: 'snow' });
  attacker.side = rain.playerSide;
  target.side = rain.oppSide;
  truthy(moveHits(attacker, target, 'Thunder', rain, () => 0.99, 0.70), 'Thunder should not miss in rain');
  truthy(!moveHits(attacker, target, 'Thunder', sun, () => 0.75, 0.70), 'Thunder should use 50% accuracy in sun');
  truthy(moveHits(attacker, target, 'Blizzard', snow, () => 0.99, 0.70), 'Blizzard should not miss in snow');
  attacker.statBoosts.acc = -6;
  target.statBoosts.eva = 6;
  truthy(moveHits(attacker, target, 'Aura Sphere', mkField(), () => 0.99, 1.0), 'Aura Sphere should ignore accuracy and evasion checks');
  truthy(moveHits(attacker, target, 'Kowtow Cleave', mkField(), () => 0.99, 1.0), 'Kowtow Cleave should ignore accuracy and evasion checks');
});

T('102. baseline secondary effects apply through the shared dispatcher', () => {
  const rows = [
    ['Crunch', 'def', -1, null],
    ['Earth Power', 'spd', -1, null],
    ['Energy Ball', 'spd', -1, null],
    ['Flash Cannon', 'spd', -1, null],
    ['Focus Blast', 'spd', -1, null],
    ['Liquidation', 'def', -1, null],
    ['Psychic', 'spd', -1, null],
    ['Blizzard', null, 0, 'frozen'],
    ['Fire Punch', null, 0, 'burn'],
    ['Flamethrower', null, 0, 'burn'],
    ['Gunk Shot', null, 0, 'poison'],
    ['Heat Wave', null, 0, 'burn'],
    ['Ice Beam', null, 0, 'frozen'],
    ['Ice Punch', null, 0, 'frozen'],
    ['Poison Jab', null, 0, 'poison'],
    ['Scald', null, 0, 'burn'],
    ['Scorching Sands', null, 0, 'burn'],
    ['Sludge Wave', null, 0, 'poison'],
    ['Thunder', null, 0, 'paralysis']
  ];
  for (const [move, stat, delta, status] of rows) {
    const attacker = mk('Mew', { moves: [move] });
    const target = mk('Snorlax');
    attacker.side = mkField().playerSide;
    target.side = mkField().oppSide;
    const log = [];
    applySecondary(attacker, move, target, mkField(), log, () => 0);
    if (stat) eq(target.statBoosts[stat], delta, move + ' stat drop');
    if (status) eq(target.status, status, move + ' status');
  }
});

T('103. Hurricane confusion and Throat Chop sound lock alter future state', () => {
  const attacker = mk('Pelipper', { moves: ['Hurricane'] });
  const target = mk('Sylveon', { moves: ['Hyper Voice'] });
  applySecondary(attacker, 'Hurricane', target, mkField(), [], () => 0);
  truthy(target.confusionTurns >= 2, 'Hurricane should set confusion turns');
  applySecondary(attacker, 'Throat Chop', target, mkField(), [], () => 0);
  truthy(target.throatChopTurns >= 2, 'Throat Chop should set sound lock turns');

  const battle = simulateBattle(team('Sound Lock Player', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]), team('Sound Lock Opponent', [{
    name: 'Sylveon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Hyper Voice'],
    throatChopTurns: 1,
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  truthy(battle.log.some((line) => includes(line, 'Sylveon used Hyper Voice! But it failed because of Throat Chop!')),
    'sound move should fail while Throat Chop lock is active');
});

T('104. Light of Ruin recoil and Ice Shard priority are modeled', () => {
  const recoilBattle = simulateBattle(team('Light of Ruin Player', [{
    name: 'Floette-Eternal',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Light of Ruin'],
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]), team('Light of Ruin Target', [{
    name: 'Garchomp',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spe: 4, atk: 0, spa: 0, spd: 0 }
  }]), { format: 'singles', seed: [2, 2, 3, 4], maxTurns: 1 });
  truthy(recoilBattle.log.some((line) => includes(line, 'was hurt by recoil')), 'Light of Ruin recoil log missing');

  const priorityBattle = simulateBattle(team('Ice Shard Player', [{
    name: 'Weavile',
    ability: '',
    item: '',
    nature: 'Brave',
    level: 50,
    moves: ['Ice Shard'],
    evs: { hp: 252, atk: 252, spe: 0, def: 0, spa: 0, spd: 0 }
  }]), team('Fast Target', [{
    name: 'Dragapult',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Dragon Pulse'],
    evs: { hp: 252, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const shardIndex = priorityBattle.log.findIndex((line) => includes(line, 'Weavile used Ice Shard!'));
  const pulseIndex = priorityBattle.log.findIndex((line) => includes(line, 'Dragapult used Dragon Pulse!'));
  truthy(shardIndex >= 0 && pulseIndex >= 0 && shardIndex < pulseIndex, 'Ice Shard should act before faster standard-priority moves');
});

T('105. move failures are exported as structured effect_events', () => {
  const throatBattle = simulateBattle(team('Failure Player', [{
    name: 'Sylveon',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Hyper Voice'],
    throatChopTurns: 1,
    evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]), team('Failure Opponent', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const throatEvent = ((throatBattle.turnLog[0] || {}).effect_events || [])
    .find((row) => row.effect_kind === 'move-failure' && row.failed_move === 'Hyper Voice');
  truthy(throatEvent, 'Throat Chop move-failure event missing');
  eq(throatEvent.failure_reason, 'throat-chop', 'Throat Chop failure reason');
  truthy(throatEvent.move_failed === true && throatEvent.skipped_move === false, 'move failure should not be classified as action denial');

  const poltergeistBattle = simulateBattle(team('Poltergeist Player', [{
    name: 'Gengar',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Poltergeist'],
    evs: { hp: 4, spa: 252, spe: 252, atk: 0, def: 0, spd: 0 }
  }]), team('No Item Target', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 252, def: 252, spd: 4, atk: 0, spa: 0, spe: 0 }
  }]), { format: 'singles', seed: [1, 2, 3, 4], maxTurns: 1 });
  const poltergeistEvent = ((poltergeistBattle.turnLog[0] || {}).effect_events || [])
    .find((row) => row.effect_kind === 'move-failure' && row.failed_move === 'Poltergeist');
  truthy(poltergeistEvent, 'Poltergeist move-failure event missing');
  eq(poltergeistEvent.failure_reason, 'poltergeist-no-item', 'Poltergeist failure reason');
  truthy(/no usable held item/.test(poltergeistEvent.note || ''), 'Poltergeist failure note should explain no item');
});

console.log(`\nmove verification registry: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
