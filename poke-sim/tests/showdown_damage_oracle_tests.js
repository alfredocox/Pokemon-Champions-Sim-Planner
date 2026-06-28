const fs = require('fs');
const vm = require('vm');
const path = require('path');
const calc = require('@smogon/calc');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Number, String, Boolean, RegExp, Date
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('generated/pokemon_showdown_legal_data.js');
load('generated/pokemon_showdown_species_weights.js');
load('runtime_data.js');
load('engine.js');
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field;', ctx);

const { Pokemon, Field } = ctx;
const gen = calc.Generations.get(9);

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'not equal') + ' expected=' + JSON.stringify(expected) + ' got=' + JSON.stringify(actual));
}

function eqRange(actual, expected, msg) {
  eq(actual[0], expected[0], msg ? msg + ' min' : 'range min');
  eq(actual[1], expected[1], msg ? msg + ' max' : 'range max');
}

function simMon(name, overrides) {
  return new Pokemon(Object.assign({
    name,
    level: 50,
    item: '',
    ability: '',
    nature: 'Hardy',
    moves: ['Tackle'],
    evs: {}
  }, overrides || {}), '', 'sv');
}

function calcMon(name, overrides) {
  return new calc.Pokemon(gen, name, Object.assign({ level: 50 }, overrides || {}));
}

function simRange(attacker, target, move, field, opts) {
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field.playerSide.activeMons = [attacker];
  field.oppSide.activeMons = [target];
  field._ctx.forceNoCrit = true;
  if (opts && opts.spread) field._ctx.isSpread = true;
  return [
    attacker.calcDamage(move, target, field, null, function() { return 0; }),
    attacker.calcDamage(move, target, field, null, function() { return 1; })
  ];
}

function oracleRange(attacker, target, move, field) {
  return calc.calculate(gen, attacker, target, new calc.Move(gen, move), field).range();
}

console.log('\n=== Showdown damage oracle tests ===\n');

T('1. neutral special damage range matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Thunderbolt',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'neutral special');
});

T('2. sand special-defense interaction matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Gardevoir', { nature: 'Modest', moves: ['Moonblast'], evs: { spa: 252 } }),
    simMon('Tyranitar'),
    'Moonblast',
    new Field({ format: 'doubles', weather: 'sand' })
  );
  const oracle = oracleRange(
    calcMon('Gardevoir', { nature: 'Modest', moves: ['Moonblast'], evs: { spa: 252 } }),
    calcMon('Tyranitar'),
    'Moonblast',
    new calc.Field({ gameType: 'Doubles', weather: 'Sand' })
  );
  eqRange(sim, oracle, 'sand spd');
});

T('3. electric terrain damage range matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Thunderbolt',
    new Field({ format: 'doubles', terrain: 'electric' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles', terrain: 'Electric' })
  );
  eqRange(sim, oracle, 'electric terrain');
});

T('4. helping hand boost matches Showdown exactly', () => {
  const simAttacker = simMon('Chandelure', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 } });
  simAttacker.helpingHand = true;
  const sim = simRange(
    simAttacker,
    simMon('Incineroar'),
    'Flamethrower',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Chandelure', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 } }),
    calcMon('Incineroar'),
    'Flamethrower',
    new calc.Field({ gameType: 'Doubles', attackerSide: { isHelpingHand: true } })
  );
  eqRange(sim, oracle, 'helping hand');
});

T('5. physical stab damage range matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Garchomp', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 } }),
    simMon('Incineroar'),
    'Dragon Claw',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 } }),
    calcMon('Incineroar'),
    'Dragon Claw',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'physical stab');
});

T('6. burn penalty is applied at the same damage stage as Showdown', () => {
  const sim = simRange(
    simMon('Garchomp', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 }, status: 'burn' }),
    simMon('Incineroar'),
    'Dragon Claw',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 }, status: 'brn' }),
    calcMon('Incineroar'),
    'Dragon Claw',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'burn stage');
});

T('7. target Tera typing matches Showdown defensive typing', () => {
  const simDefender = simMon('Pelipper', { teraType: 'Water' });
  simDefender.teraActivated = true;
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    simDefender,
    'Thunderbolt',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 } }),
    calcMon('Pelipper', { teraType: 'Water' }),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'target tera');
});

T('8. same-type attacker Tera upgrades STAB the same way as Showdown', () => {
  const simAttacker = simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, teraType: 'Electric' });
  simAttacker.teraActivated = true;
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Thunderbolt',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, teraType: 'Electric' }),
    calcMon('Pelipper'),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'same-type tera stab');
});

T('9. off-type attacker Tera keeps original-type STAB like Showdown', () => {
  const simAttacker = simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, teraType: 'Water' });
  simAttacker.teraActivated = true;
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Thunderbolt',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, teraType: 'Water' }),
    calcMon('Pelipper'),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'off-type tera stab');
});

T('10. Freeze-Dry matches Showdown Water effectiveness exactly', () => {
  const sim = simRange(
    simMon('Ninetales-Alola', { nature: 'Modest', moves: ['Freeze-Dry'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Freeze-Dry',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Ninetales-Alola', { nature: 'Modest', moves: ['Freeze-Dry'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Freeze-Dry',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'freeze-dry water');
});

T('11. off-type Tera drops Adaptability back to Showdown\'s original-type STAB rules', () => {
  const simAttacker = simMon('Dragalge', { nature: 'Modest', moves: ['Dragon Pulse'], evs: { spa: 252 }, ability: 'Adaptability', teraType: 'Water' });
  simAttacker.teraActivated = true;
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Dragon Pulse',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Dragalge', { nature: 'Modest', moves: ['Dragon Pulse'], evs: { spa: 252 }, ability: 'Adaptability', teraType: 'Water' }),
    calcMon('Pelipper'),
    'Dragon Pulse',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'adaptability off-type tera');
});

T('12. Facade status power boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Ursaring', { nature: 'Adamant', moves: ['Facade'], evs: { atk: 252 }, ability: 'Quick Feet', status: 'burn' }),
    simMon('Pelipper'),
    'Facade',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Ursaring', { nature: 'Adamant', moves: ['Facade'], evs: { atk: 252 }, ability: 'Quick Feet', status: 'brn' }),
    calcMon('Pelipper'),
    'Facade',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'facade burn');
});

T('13. Guts physical boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Ursaring', { nature: 'Adamant', moves: ['Slash'], evs: { atk: 252 }, ability: 'Guts', status: 'burn' }),
    simMon('Pelipper'),
    'Slash',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Ursaring', { nature: 'Adamant', moves: ['Slash'], evs: { atk: 252 }, ability: 'Guts', status: 'brn' }),
    calcMon('Pelipper'),
    'Slash',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'guts boost');
});

T('14. Weather Ball in rain matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Pelipper', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 } }),
    simMon('Incineroar'),
    'Weather Ball',
    new Field({ format: 'doubles', weather: 'rain' })
  );
  const oracle = oracleRange(
    calcMon('Pelipper', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 } }),
    calcMon('Incineroar'),
    'Weather Ball',
    new calc.Field({ gameType: 'Doubles', weather: 'Rain' })
  );
  eqRange(sim, oracle, 'weather ball rain');
});

T('15. Weather Ball in sun matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Meganium', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 } }),
    simMon('Amoonguss'),
    'Weather Ball',
    new Field({ format: 'doubles', weather: 'sun' })
  );
  const oracle = oracleRange(
    calcMon('Meganium', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 } }),
    calcMon('Amoonguss'),
    'Weather Ball',
    new calc.Field({ gameType: 'Doubles', weather: 'Sun' })
  );
  eqRange(sim, oracle, 'weather ball sun');
});

T('16. Electro Shot in rain matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Archaludon', { nature: 'Modest', moves: ['Electro Shot'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Electro Shot',
    new Field({ format: 'doubles', weather: 'rain' })
  );
  const oracle = oracleRange(
    calcMon('Archaludon', { nature: 'Modest', moves: ['Electro Shot'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Electro Shot',
    new calc.Field({ gameType: 'Doubles', weather: 'Rain' })
  );
  eqRange(sim, oracle, 'electro shot rain');
});

T('17. Terrain Pulse in electric terrain matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Porygon2', { nature: 'Modest', moves: ['Terrain Pulse'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Terrain Pulse',
    new Field({ format: 'doubles', terrain: 'electric' })
  );
  const oracle = oracleRange(
    calcMon('Porygon2', { nature: 'Modest', moves: ['Terrain Pulse'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Terrain Pulse',
    new calc.Field({ gameType: 'Doubles', terrain: 'Electric' })
  );
  eqRange(sim, oracle, 'terrain pulse electric');
});

T('18. Rising Voltage against a grounded target matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Rising Voltage'], evs: { spa: 252 } }),
    simMon('Incineroar'),
    'Rising Voltage',
    new Field({ format: 'doubles', terrain: 'electric' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Rising Voltage'], evs: { spa: 252 } }),
    calcMon('Incineroar'),
    'Rising Voltage',
    new calc.Field({ gameType: 'Doubles', terrain: 'Electric' })
  );
  eqRange(sim, oracle, 'rising voltage grounded');
});

T('19. Solar Beam under rain matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Venusaur', { nature: 'Modest', moves: ['Solar Beam'], evs: { spa: 252 } }),
    simMon('Pelipper'),
    'Solar Beam',
    new Field({ format: 'doubles', weather: 'rain' })
  );
  const oracle = oracleRange(
    calcMon('Venusaur', { nature: 'Modest', moves: ['Solar Beam'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Solar Beam',
    new calc.Field({ gameType: 'Doubles', weather: 'Rain' })
  );
  eqRange(sim, oracle, 'solar beam rain');
});

T('20. Tough Claws contact boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Charizard-Mega-X', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 }, ability: 'Tough Claws' }),
    simMon('Pelipper'),
    'Dragon Claw',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Charizard-Mega-X', { nature: 'Adamant', moves: ['Dragon Claw'], evs: { atk: 252 }, ability: 'Tough Claws' }),
    calcMon('Pelipper'),
    'Dragon Claw',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tough claws');
});

T('21. Pixilate Normal-to-Fairy conversion matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Altaria-Mega', { nature: 'Adamant', moves: ['Tackle'], evs: { atk: 252 }, ability: 'Pixilate' }),
    simMon('Kommo-o'),
    'Tackle',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Altaria-Mega', { nature: 'Adamant', moves: ['Tackle'], evs: { atk: 252 }, ability: 'Pixilate' }),
    calcMon('Kommo-o'),
    'Tackle',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'pixilate');
});

T('22. Solar Power in sun matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Houndoom-Mega', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 }, ability: 'Solar Power' }),
    simMon('Incineroar'),
    'Flamethrower',
    new Field({ format: 'doubles', weather: 'sun' })
  );
  const oracle = oracleRange(
    calcMon('Houndoom-Mega', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 }, ability: 'Solar Power' }),
    calcMon('Incineroar'),
    'Flamethrower',
    new calc.Field({ gameType: 'Doubles', weather: 'Sun' })
  );
  eqRange(sim, oracle, 'solar power sun');
});

T('23. Supreme Overlord with three fainted allies matches Showdown exactly', () => {
  const field = new Field({ format: 'doubles' });
  field.playerSide.fainted = 3;
  const sim = simRange(
    simMon('Kingambit', { nature: 'Adamant', moves: ['Iron Head'], evs: { atk: 252 }, ability: 'Supreme Overlord' }),
    simMon('Pelipper'),
    'Iron Head',
    field
  );
  const oracle = oracleRange(
    calcMon('Kingambit', { nature: 'Adamant', moves: ['Iron Head'], evs: { atk: 252 }, ability: 'Supreme Overlord', alliesFainted: 3 }),
    calcMon('Pelipper'),
    'Iron Head',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'supreme overlord');
});

T('24. Defender Cloud Nine suppresses rain Weather Ball like Showdown', () => {
  const sim = simRange(
    simMon('Golduck', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 }, ability: 'Damp' }),
    simMon('Tyranitar', { ability: 'Cloud Nine' }),
    'Weather Ball',
    new Field({ format: 'doubles', weather: 'rain' })
  );
  const oracle = oracleRange(
    calcMon('Golduck', { nature: 'Modest', moves: ['Weather Ball'], evs: { spa: 252 }, ability: 'Damp' }),
    calcMon('Tyranitar', { ability: 'Cloud Nine' }),
    'Weather Ball',
    new calc.Field({ gameType: 'Doubles', weather: 'Rain' })
  );
  eqRange(sim, oracle, 'cloud nine weather suppression');
});

T('25. defender Unaware ignores attacker offensive stat boosts exactly like Showdown', () => {
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, statBoosts: { spa: 2 } }),
    simMon('Pelipper', { ability: 'Unaware' }),
    'Thunderbolt',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Thunderbolt'], evs: { spa: 252 }, boosts: { spa: 2 } }),
    calcMon('Pelipper', { ability: 'Unaware' }),
    'Thunderbolt',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'defender unaware');
});

T('26. attacker Unaware ignores defender defensive stat boosts exactly like Showdown', () => {
  const sim = simRange(
    simMon('Skeledirge', { nature: 'Modest', moves: ['Shadow Ball'], evs: { spa: 252 }, ability: 'Unaware' }),
    simMon('Umbreon', { statBoosts: { spd: 2 } }),
    'Shadow Ball',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Skeledirge', { nature: 'Modest', moves: ['Shadow Ball'], evs: { spa: 252 }, ability: 'Unaware' }),
    calcMon('Umbreon', { boosts: { spd: 2 } }),
    'Shadow Ball',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'attacker unaware');
});

T('27. Mega Launcher pulse boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Blastoise', { nature: 'Modest', moves: ['Dark Pulse'], evs: { spa: 252 }, ability: 'Mega Launcher' }),
    simMon('Incineroar'),
    'Dark Pulse',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Blastoise', { nature: 'Modest', moves: ['Dark Pulse'], evs: { spa: 252 }, ability: 'Mega Launcher' }),
    calcMon('Incineroar'),
    'Dark Pulse',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'mega launcher');
});

T('28. Strong Jaw bite boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Sharpedo', { nature: 'Adamant', moves: ['Crunch'], evs: { atk: 252 }, ability: 'Strong Jaw' }),
    simMon('Pelipper'),
    'Crunch',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Sharpedo', { nature: 'Adamant', moves: ['Crunch'], evs: { atk: 252 }, ability: 'Strong Jaw' }),
    calcMon('Pelipper'),
    'Crunch',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'strong jaw');
});

T('29. Blaze low-HP Fire boost matches Showdown exactly', () => {
  const simAttacker = simMon('Charizard', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 }, ability: 'Blaze' });
  const oracleBase = calcMon('Charizard', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 }, ability: 'Blaze' });
  const lowHp = Math.floor(simAttacker.maxHp / 3);
  simAttacker.hp = lowHp;
  const sim = simRange(
    simAttacker,
    simMon('Incineroar'),
    'Flamethrower',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Charizard', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 }, ability: 'Blaze', curHP: Math.floor(oracleBase.maxHP() / 3) }),
    calcMon('Incineroar'),
    'Flamethrower',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'blaze');
});

T('30. Charcoal stacks with Blaze, sun, STAB, and super-effective Fire damage like Showdown', () => {
  const simAttacker = simMon('Charizard', {
    nature: 'Adamant',
    moves: ['Flare Blitz'],
    evs: { atk: 252 },
    ability: 'Blaze',
    item: 'Charcoal'
  });
  const oracleBase = calcMon('Charizard', {
    nature: 'Adamant',
    moves: ['Flare Blitz'],
    evs: { atk: 252 },
    ability: 'Blaze',
    item: 'Charcoal'
  });
  const lowHp = Math.floor(simAttacker.maxHp / 3);
  simAttacker.hp = lowHp;
  const sim = simRange(
    simAttacker,
    simMon('Meganium'),
    'Flare Blitz',
    new Field({ format: 'doubles', weather: 'sun' })
  );
  const oracle = oracleRange(
    calcMon('Charizard', {
      nature: 'Adamant',
      moves: ['Flare Blitz'],
      evs: { atk: 252 },
      ability: 'Blaze',
      item: 'Charcoal',
      curHP: Math.floor(oracleBase.maxHP() / 3)
    }),
    calcMon('Meganium'),
    'Flare Blitz',
    new calc.Field({ gameType: 'Doubles', weather: 'Sun' })
  );
  eqRange(sim, oracle, 'charcoal blaze sun fire stack');
});

T('31. Overgrow low-HP Grass boost matches Showdown exactly', () => {
  const simAttacker = simMon('Venusaur', { nature: 'Modest', moves: ['Energy Ball'], evs: { spa: 252 }, ability: 'Overgrow' });
  const oracleBase = calcMon('Venusaur', { nature: 'Modest', moves: ['Energy Ball'], evs: { spa: 252 }, ability: 'Overgrow' });
  const lowHp = Math.floor(simAttacker.maxHp / 3);
  simAttacker.hp = lowHp;
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Energy Ball',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Venusaur', { nature: 'Modest', moves: ['Energy Ball'], evs: { spa: 252 }, ability: 'Overgrow', curHP: Math.floor(oracleBase.maxHP() / 3) }),
    calcMon('Pelipper'),
    'Energy Ball',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'overgrow');
});

T('32. Iron Fist punch boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Golurk', { nature: 'Adamant', moves: ['Ice Punch'], evs: { atk: 252 }, ability: 'Iron Fist' }),
    simMon('Garchomp'),
    'Ice Punch',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Golurk', { nature: 'Adamant', moves: ['Ice Punch'], evs: { atk: 252 }, ability: 'Iron Fist' }),
    calcMon('Garchomp'),
    'Ice Punch',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'iron fist');
});

T('33. Technician low-BP boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Scizor-Mega', { nature: 'Adamant', moves: ['Bullet Punch'], evs: { atk: 252 }, ability: 'Technician' }),
    simMon('Tyranitar'),
    'Bullet Punch',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Scizor-Mega', { nature: 'Adamant', moves: ['Bullet Punch'], evs: { atk: 252 }, ability: 'Technician' }),
    calcMon('Tyranitar'),
    'Bullet Punch',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'technician');
});

T('34. Huge Power Attack boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Azumarill', { nature: 'Adamant', moves: ['Liquidation'], evs: { atk: 252 }, ability: 'Huge Power' }),
    simMon('Incineroar'),
    'Liquidation',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Azumarill', { nature: 'Adamant', moves: ['Liquidation'], evs: { atk: 252 }, ability: 'Huge Power' }),
    calcMon('Incineroar'),
    'Liquidation',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'huge power');
});

T('35. Pure Power Attack boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Medicham-Mega', { nature: 'Adamant', moves: ['Drain Punch'], evs: { atk: 252 }, ability: 'Pure Power' }),
    simMon('Incineroar'),
    'Drain Punch',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Medicham-Mega', { nature: 'Adamant', moves: ['Drain Punch'], evs: { atk: 252 }, ability: 'Pure Power' }),
    calcMon('Incineroar'),
    'Drain Punch',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'pure power');
});

T('36. Sand Force sand boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Steelix-Mega', { nature: 'Adamant', moves: ['Iron Head'], evs: { atk: 252 }, ability: 'Sand Force' }),
    simMon('Pelipper'),
    'Iron Head',
    new Field({ format: 'doubles', weather: 'sand' })
  );
  const oracle = oracleRange(
    calcMon('Steelix-Mega', { nature: 'Adamant', moves: ['Iron Head'], evs: { atk: 252 }, ability: 'Sand Force' }),
    calcMon('Pelipper'),
    'Iron Head',
    new calc.Field({ gameType: 'Doubles', weather: 'Sand' })
  );
  eqRange(sim, oracle, 'sand force');
});

T('37. Thick Fat Fire reduction matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Charizard', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 } }),
    simMon('Venusaur-Mega', { ability: 'Thick Fat' }),
    'Flamethrower',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Charizard', { nature: 'Modest', moves: ['Flamethrower'], evs: { spa: 252 } }),
    calcMon('Venusaur-Mega', { ability: 'Thick Fat' }),
    'Flamethrower',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'thick fat');
});

T('38. Filter super-effective reduction matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Infernape', { nature: 'Adamant', moves: ['Close Combat'], evs: { atk: 252 } }),
    simMon('Aggron-Mega', { ability: 'Filter' }),
    'Close Combat',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Infernape', { nature: 'Adamant', moves: ['Close Combat'], evs: { atk: 252 } }),
    calcMon('Aggron-Mega', { ability: 'Filter' }),
    'Close Combat',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'filter');
});

T('39. Tinted Lens resisted-hit boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Yanmega', { nature: 'Modest', moves: ['Bug Buzz'], evs: { spa: 252 }, ability: 'Tinted Lens' }),
    simMon('Charizard'),
    'Bug Buzz',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Yanmega', { nature: 'Modest', moves: ['Bug Buzz'], evs: { spa: 252 }, ability: 'Tinted Lens' }),
    calcMon('Charizard'),
    'Bug Buzz',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tinted lens');
});

T('40. Earth Eater Ground immunity matches Showdown zero damage', () => {
  const sim = simRange(
    simMon('Garchomp', { nature: 'Adamant', moves: ['Earthquake'], evs: { atk: 252 } }),
    simMon('Orthworm', { ability: 'Earth Eater' }),
    'Earthquake',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Earthquake'], evs: { atk: 252 } }),
    calcMon('Orthworm', { ability: 'Earth Eater' }),
    'Earthquake',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'earth eater');
});

T('41. Levitate Ground immunity matches Showdown zero damage', () => {
  const sim = simRange(
    simMon('Garchomp', { nature: 'Adamant', moves: ['Earthquake'], evs: { atk: 252 } }),
    simMon('Cresselia', { ability: 'Levitate' }),
    'Earthquake',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Earthquake'], evs: { atk: 252 } }),
    calcMon('Cresselia', { ability: 'Levitate' }),
    'Earthquake',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'levitate');
});

T('42. Sheer Force damage boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Nidoking', { nature: 'Modest', moves: ['Sludge Bomb'], evs: { spa: 252 }, ability: 'Sheer Force' }),
    simMon('Pelipper'),
    'Sludge Bomb',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Nidoking', { nature: 'Modest', moves: ['Sludge Bomb'], evs: { spa: 252 }, ability: 'Sheer Force' }),
    calcMon('Pelipper'),
    'Sludge Bomb',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'sheer force');
});

T('43. Fairy Aura damage boost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Xerneas', { nature: 'Modest', moves: ['Moonblast'], evs: { spa: 252 }, ability: 'Fairy Aura' }),
    simMon('Incineroar'),
    'Moonblast',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Xerneas', { nature: 'Modest', moves: ['Moonblast'], evs: { spa: 252 }, ability: 'Fairy Aura' }),
    calcMon('Incineroar'),
    'Moonblast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'fairy aura');
});

T('44. Scrappy Normal damage into Ghost matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Lopunny-Mega', { nature: 'Adamant', moves: ['Tackle'], evs: { atk: 252 }, ability: 'Scrappy' }),
    simMon('Gengar'),
    'Tackle',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Lopunny-Mega', { nature: 'Adamant', moves: ['Tackle'], evs: { atk: 252 }, ability: 'Scrappy' }),
    calcMon('Gengar'),
    'Tackle',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'scrappy ghost bypass');
});

T('45. Infiltrator bypasses Light Screen damage reduction like Showdown', () => {
  const field = new Field({ format: 'doubles' });
  field.oppSide.lightScreen = true;
  const sim = simRange(
    simMon('Chandelure', { nature: 'Modest', moves: ['Shadow Ball'], evs: { spa: 252 }, ability: 'Infiltrator' }),
    simMon('Umbreon'),
    'Shadow Ball',
    field
  );
  const oracle = oracleRange(
    calcMon('Chandelure', { nature: 'Modest', moves: ['Shadow Ball'], evs: { spa: 252 }, ability: 'Infiltrator' }),
    calcMon('Umbreon'),
    'Shadow Ball',
    new calc.Field({ gameType: 'Doubles', defenderSide: { isLightScreen: true } })
  );
  eqRange(sim, oracle, 'infiltrator screens');
});

T('46. Mold Breaker bypasses Levitate immunity like Showdown', () => {
  const sim = simRange(
    simMon('Haxorus', { nature: 'Adamant', moves: ['High Horsepower'], evs: { atk: 252 }, ability: 'Mold Breaker' }),
    simMon('Cresselia', { ability: 'Levitate' }),
    'High Horsepower',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Haxorus', { nature: 'Adamant', moves: ['High Horsepower'], evs: { atk: 252 }, ability: 'Mold Breaker' }),
    calcMon('Cresselia', { ability: 'Levitate' }),
    'High Horsepower',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'mold breaker levitate');
});

T('47. Tera Blast before Tera remains Normal and special like Showdown', () => {
  const sim = simRange(
    simMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, teraType: 'Electric' }),
    simMon('Pelipper'),
    'Tera Blast',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 } }),
    calcMon('Pelipper'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tera blast inactive');
});

T('48. Tera Blast uses active Tera type and special category like Showdown', () => {
  const simAttacker = simMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, teraType: 'Electric' });
  simAttacker.teraActivated = true;
  const field = new Field({ format: 'doubles' });
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Tera Blast',
    field
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, teraType: 'Electric' }),
    calcMon('Pelipper'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tera blast electric special');
});

T('49. Tera Blast uses active Tera type and physical category like Showdown', () => {
  const simAttacker = simMon('Garchomp', { nature: 'Adamant', moves: ['Tera Blast'], evs: { atk: 252 }, teraType: 'Ground' });
  simAttacker.teraActivated = true;
  const sim = simRange(
    simAttacker,
    simMon('Incineroar'),
    'Tera Blast',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Tera Blast'], evs: { atk: 252 }, teraType: 'Ground' }),
    calcMon('Incineroar'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tera blast ground physical');
});

T('50. Tera Blast category can flip from stat boosts like Showdown', () => {
  const simAttacker = simMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, teraType: 'Electric' });
  simAttacker.teraActivated = true;
  simAttacker.statBoosts.atk = 4;
  const sim = simRange(
    simAttacker,
    simMon('Pelipper'),
    'Tera Blast',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Raichu', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, boosts: { atk: 4 }, teraType: 'Electric' }),
    calcMon('Pelipper'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'tera blast boost-flipped physical');
});

T('51. DB-style tera_type feeds Tera Blast type and damage evidence', () => {
  const simAttacker = simMon('Garchomp', { nature: 'Adamant', moves: ['Tera Blast'], evs: { atk: 252 }, tera_type: 'Ground' });
  simAttacker.teraActivated = true;
  const target = simMon('Incineroar');
  const field = new Field({ format: 'doubles' });
  simAttacker.side = field.playerSide;
  target.side = field.oppSide;
  field.playerSide.activeMons = [simAttacker];
  field.oppSide.activeMons = [target];
  field._ctx.forceNoCrit = true;
  field._ctx.captureDamageCalc = true;
  const simDamage = simAttacker.calcDamage('Tera Blast', target, field, null, function() { return 0; });
  const oracle = oracleRange(
    calcMon('Garchomp', { nature: 'Adamant', moves: ['Tera Blast'], evs: { atk: 252 }, teraType: 'Ground' }),
    calcMon('Incineroar'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eq(simDamage, oracle[0], 'db tera_type damage min');
  eq(field._ctx.lastDamageCalc.move_type, 'Ground', 'db tera_type move type evidence');
  eq(field._ctx.lastDamageCalc.category, 'physical', 'db tera_type category evidence');
});

T('52. Active Tera Blast ignores Pixilate Normal-conversion boost like Showdown', () => {
  const simAttacker = simMon('Altaria-Mega', {
    nature: 'Modest',
    moves: ['Tera Blast'],
    evs: { spa: 252 },
    ability: 'Pixilate',
    teraType: 'Fire'
  });
  simAttacker.teraActivated = true;
  const sim = simRange(
    simAttacker,
    simMon('Amoonguss'),
    'Tera Blast',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Altaria-Mega', { nature: 'Modest', moves: ['Tera Blast'], evs: { spa: 252 }, ability: 'Pixilate', teraType: 'Fire' }),
    calcMon('Amoonguss'),
    'Tera Blast',
    new calc.Field({ gameType: 'Doubles' })
  );
  eqRange(sim, oracle, 'active tera blast bypasses pixilate');
});

T('53. Low Kick heavy-target base power matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Infernape', { nature: 'Adamant', moves: ['Low Kick'], evs: { atk: 252 } }),
    simMon('Tyranitar'),
    'Low Kick',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Infernape', { nature: 'Adamant', moves: ['Low Kick'], evs: { atk: 252 } }),
    calcMon('Tyranitar'),
    'Low Kick',
    new calc.Field({ gameType: 'Doubles' })
  );
  eq(simMon('Tyranitar').weightkg, 202, 'Tyranitar Showdown weight');
  eqRange(sim, oracle, 'low kick heavy target');
});

T('54. Low Kick mid-weight base power matches Showdown exactly', () => {
  const sim = simRange(
    simMon('Lopunny-Mega', { nature: 'Adamant', moves: ['Low Kick'], evs: { atk: 252 }, ability: 'Scrappy' }),
    simMon('Froslass'),
    'Low Kick',
    new Field({ format: 'doubles' })
  );
  const oracle = oracleRange(
    calcMon('Lopunny-Mega', { nature: 'Adamant', moves: ['Low Kick'], evs: { atk: 252 }, ability: 'Scrappy' }),
    calcMon('Froslass'),
    'Low Kick',
    new calc.Field({ gameType: 'Doubles' })
  );
  eq(simMon('Froslass').weightkg, 26.6, 'Froslass Showdown weight');
  eqRange(sim, oracle, 'low kick mid-weight target');
});

T('55. former baseline direct and spread damage ranges match Showdown', () => {
  const cases = [
    ['Aura Sphere', 'Lucario', { nature: 'Modest', evs: { spa: 252 } }, 'Tyranitar', {}, {}],
    ['Blizzard', 'Vanilluxe', { nature: 'Modest', evs: { spa: 252 } }, 'Garchomp', {}, { spread: true }],
    ['Crunch', 'Tyranitar', { nature: 'Adamant', evs: { atk: 252 } }, 'Cresselia', {}, {}],
    ['Dazzling Gleam', 'Gardevoir', { nature: 'Modest', evs: { spa: 252 } }, 'Garchomp', {}, { spread: true }],
    ['Dragon Pulse', 'Dragalge', { nature: 'Modest', evs: { spa: 252 } }, 'Pelipper', {}, {}],
    ['Earth Power', 'Landorus', { nature: 'Modest', evs: { spa: 252 } }, 'Incineroar', {}, {}],
    ['Energy Ball', 'Venusaur', { nature: 'Modest', evs: { spa: 252 } }, 'Pelipper', {}, {}],
    ['Fire Punch', 'Dragonite', { nature: 'Adamant', evs: { atk: 252 } }, 'Kingambit', {}, {}],
    ['Flamethrower', 'Charizard', { nature: 'Modest', evs: { spa: 252 } }, 'Amoonguss', {}, {}],
    ['Flash Cannon', 'Archaludon', { nature: 'Modest', evs: { spa: 252 } }, 'Flutter Mane', {}, {}],
    ['Focus Blast', 'Gengar', { nature: 'Modest', evs: { spa: 252 } }, 'Tyranitar', {}, {}],
    ['Gunk Shot', 'Sneasler', { nature: 'Adamant', evs: { atk: 252 } }, 'Flutter Mane', {}, {}],
    ['Heat Wave', 'Charizard', { nature: 'Modest', evs: { spa: 252 } }, 'Amoonguss', {}, { spread: true }],
    ['Hurricane', 'Pelipper', { nature: 'Modest', evs: { spa: 252 } }, 'Amoonguss', {}, {}],
    ['Hydro Pump', 'Rotom-Wash', { nature: 'Modest', evs: { spa: 252 } }, 'Incineroar', {}, {}],
    ['Ice Beam', 'Porygon2', { nature: 'Modest', evs: { spa: 252 } }, 'Garchomp', {}, {}],
    ['Ice Punch', 'Dragonite', { nature: 'Adamant', evs: { atk: 252 } }, 'Garchomp', {}, {}],
    ['Ice Shard', 'Weavile', { nature: 'Adamant', evs: { atk: 252 } }, 'Garchomp', {}, {}],
    ['Kowtow Cleave', 'Kingambit', { nature: 'Adamant', evs: { atk: 252 } }, 'Gholdengo', {}, {}],
    ['Leaf Storm', 'Serperior', { nature: 'Modest', evs: { spa: 252 } }, 'Gastrodon', {}, {}],
    ['Light of Ruin', 'Floette-Eternal', { nature: 'Modest', evs: { spa: 252 } }, 'Garchomp', {}, {}],
    ['Liquidation', 'Basculegion', { nature: 'Adamant', evs: { atk: 252 } }, 'Incineroar', {}, {}],
    ['Poison Jab', 'Sneasler', { nature: 'Adamant', evs: { atk: 252 } }, 'Flutter Mane', {}, {}],
    ['Poltergeist', 'Aegislash-Blade', { nature: 'Adamant', evs: { atk: 252 } }, 'Cresselia', { item: 'Sitrus Berry' }, {}],
    ['Power Gem', 'Glimmora', { nature: 'Modest', evs: { spa: 252 } }, 'Charizard', {}, {}],
    ['Psychic', 'Hatterene', { nature: 'Modest', evs: { spa: 252 } }, 'Sneasler', {}, {}],
    ['Scald', 'Milotic', { nature: 'Modest', evs: { spa: 252 } }, 'Incineroar', {}, {}],
    ['Scorching Sands', 'Houndoom', { nature: 'Modest', evs: { spa: 252 } }, 'Kingambit', {}, {}],
    ['Sludge Wave', 'Gengar', { nature: 'Modest', evs: { spa: 252 } }, 'Flutter Mane', {}, { spread: true }],
    ['Stomping Tantrum', 'Incineroar', { nature: 'Adamant', evs: { atk: 252 } }, 'Kingambit', {}, {}],
    ['Throat Chop', 'Incineroar', { nature: 'Adamant', evs: { atk: 252 } }, 'Gholdengo', {}, {}],
    ['Thunder', 'Raichu', { nature: 'Modest', evs: { spa: 252 } }, 'Pelipper', {}, {}]
  ];
  for (const row of cases) {
    const [move, attackerName, attackerOpts, targetName, targetOpts, opts] = row;
    const sim = simRange(
      simMon(attackerName, Object.assign({ moves: [move] }, attackerOpts)),
      simMon(targetName, targetOpts),
      move,
      new Field({ format: 'doubles' }),
      opts
    );
    const oracle = oracleRange(
      calcMon(attackerName, attackerOpts),
      calcMon(targetName, targetOpts),
      move,
      new calc.Field({ gameType: 'Doubles' })
    );
    eqRange(sim, oracle, move);
  }
});

T('56. baseline special-case damage rules match Showdown', () => {
  eqRange(
    simRange(
      simMon('Incineroar', { nature: 'Adamant', moves: ['Darkest Lariat'], evs: { atk: 252 } }),
      Object.assign(simMon('Snorlax'), { statBoosts: { atk: 0, def: 2, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 } }),
      'Darkest Lariat',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Incineroar', { nature: 'Adamant', evs: { atk: 252 } }),
      calcMon('Snorlax', { boosts: { def: 2 } }),
      'Darkest Lariat',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Darkest Lariat ignores target Defense boosts'
  );
  eqRange(
    simRange(
      simMon('Mandibuzz', { nature: 'Bold', moves: ['Foul Play'], evs: { atk: 0 } }),
      Object.assign(simMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 } }), { statBoosts: { atk: 2, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 } }),
      'Foul Play',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Mandibuzz', { nature: 'Bold', evs: { atk: 0 } }),
      calcMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 }, boosts: { atk: 2 } }),
      'Foul Play',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Foul Play uses target Attack boosts'
  );
  eqRange(
    simRange(
      simMon('Mandibuzz', { nature: 'Bold', moves: ['Foul Play'], evs: { atk: 0 }, status: 'burn' }),
      simMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 } }),
      'Foul Play',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Mandibuzz', { nature: 'Bold', evs: { atk: 0 }, status: 'brn' }),
      calcMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 } }),
      'Foul Play',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Foul Play burned-user damage stays aligned with Showdown'
  );
  eqRange(
    simRange(
      simMon('Mandibuzz', { nature: 'Bold', moves: ['Foul Play'], evs: { atk: 0 } }),
      simMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 }, ability: 'Huge Power' }),
      'Foul Play',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Mandibuzz', { nature: 'Bold', evs: { atk: 0 } }),
      calcMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 }, ability: 'Huge Power' }),
      'Foul Play',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Foul Play uses target Attack without borrowing target Huge Power'
  );
  eqRange(
    simRange(
      simMon('Medicham-Mega', { nature: 'Adamant', moves: ['Foul Play'], evs: { atk: 252 }, ability: 'Pure Power' }),
      simMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 } }),
      'Foul Play',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Medicham-Mega', { nature: 'Adamant', evs: { atk: 252 }, ability: 'Pure Power' }),
      calcMon('Dragonite', { nature: 'Adamant', evs: { atk: 252 } }),
      'Foul Play',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Foul Play keeps user-side Pure Power modifier behavior'
  );
  eqRange(
    simRange(
      simMon('Corviknight', { nature: 'Impish', moves: ['Body Press'], evs: { def: 252 } }),
      simMon('Snorlax', { nature: 'Careful' }),
      'Body Press',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Corviknight', { nature: 'Impish', evs: { def: 252 } }),
      calcMon('Snorlax', { nature: 'Careful' }),
      'Body Press',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Body Press uses user Defense as its offensive stat'
  );
  eqRange(
    simRange(
      simMon('Corviknight', { nature: 'Impish', moves: ['Body Press'], evs: { def: 252 }, ability: 'Huge Power' }),
      simMon('Snorlax', { nature: 'Careful' }),
      'Body Press',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Corviknight', { nature: 'Impish', evs: { def: 252 }, ability: 'Huge Power' }),
      calcMon('Snorlax', { nature: 'Careful' }),
      'Body Press',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Body Press keeps user-side Huge Power modifier behavior'
  );
  eqRange(
    simRange(
      simMon('Latios', { nature: 'Modest', moves: ['Psyshock'], evs: { spa: 252 } }),
      simMon('Blissey', { nature: 'Calm', evs: { spd: 252 } }),
      'Psyshock',
      new Field({ format: 'doubles' })
    ),
    oracleRange(
      calcMon('Latios', { nature: 'Modest', evs: { spa: 252 } }),
      calcMon('Blissey', { nature: 'Calm', evs: { spd: 252 } }),
      'Psyshock',
      new calc.Field({ gameType: 'Doubles' })
    ),
    'Psyshock targets Defense instead of Special Defense'
  );
});

console.log('\nshowdown damage oracle:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
