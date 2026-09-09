'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, RegExp,
  parseInt, parseFloat
};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
vm.runInContext(
  [
    'this.Pokemon = Pokemon;',
    'this.Field = Field;',
    'this.simulateBattle = simulateBattle;',
    'this._compareTurnActionOrder = _compareTurnActionOrder;',
    'this._speedSort = _speedSort;',
    'this._speedOrderDetailsSnapshot = _speedOrderDetailsSnapshot;',
    'this._statBoostSnapshot = _statBoostSnapshot;',
    'this._getPriority = getPriority;'
  ].join('\n'),
  ctx
);

const Pokemon = ctx.Pokemon;
const Field = ctx.Field;
const simulateBattle = ctx.simulateBattle;
const compareTurnActionOrder = ctx._compareTurnActionOrder;
const speedSort = ctx._speedSort;
const speedOrderDetailsSnapshot = ctx._speedOrderDetailsSnapshot;
const statBoostSnapshot = ctx._statBoostSnapshot;
const getPriority = ctx._getPriority;

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

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'expected equality') + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function mk(name, overrides) {
  return new Pokemon(Object.assign({
    name,
    item: '',
    ability: '',
    nature: 'Hardy',
    level: 50,
    moves: ['Growl'],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  }, overrides || {}));
}

function team(members) {
  return { name: 'Turn Order Test', format: 'champions', legality_status: 'legal', members };
}

function action(mon, priority) {
  return { attacker: mon, move: 'Tackle', priority: priority || 0 };
}

function indexAfter(log, needle, after) {
  for (let i = Math.max(0, after + 1); i < log.length; i += 1) {
    if (String(log[i]).includes(needle)) return i;
  }
  return -1;
}

console.log('\n=== turn order / priority tests ===\n');

T('1. move priority acts before speed', function() {
  const field = new Field();
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  truthy(compareTurnActionOrder(action(slow, 1), action(fast, 0), field, function() { return 0.75; }) < 0,
    'higher-priority move should act first even when user is slower');
});

T('2. normal turn order uses boosted Speed from getEffSpeed', function() {
  const field = new Field();
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  truthy(compareTurnActionOrder(action(fast, 0), action(slow, 0), field, function() { return 0.75; }) < 0,
    'faster Pokemon should act first outside Trick Room');
});

T('3. Trick Room makes the slower same-priority Pokemon act first', function() {
  const field = new Field();
  field.trickRoom = true;
  field.trickRoomTurns = 5;
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  truthy(compareTurnActionOrder(action(slow, 0), action(fast, 0), field, function() { return 0.75; }) < 0,
    'slower Pokemon should act first under Trick Room');
});

T('4. Speed boosts, Tailwind, and Choice Scarf feed turn order', function() {
  const field = new Field();
  const boosted = mk('Garchomp', { item: 'Choice Scarf', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const baseline = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  boosted.side = field.playerSide;
  field.playerSide.tailwind = true;
  boosted.statBoosts.spe = 1;
  truthy(boosted.getEffSpeed(field) > baseline.getEffSpeed(field), 'boosted effective Speed should exceed baseline');
  truthy(compareTurnActionOrder(action(boosted, 0), action(baseline, 0), field, function() { return 0.75; }) < 0,
    'boosted Pokemon should act first outside Trick Room');
});

T('5. exact Speed ties are grouped before seeded shuffle', function() {
  const field = new Field();
  const a = mk('Garchomp', { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const b = mk('Garchomp', { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  eq(compareTurnActionOrder(action(a, 0), action(b, 0), field), 0,
    'the comparator should report an exact tie without consuming RNG');
  const low = [action(a, 0), action(b, 0)];
  speedSort(low, function(x, y) { return compareTurnActionOrder(x, y, field); }, function() { return 0.25; });
  eq(low[0].attacker, b, 'low shuffle roll should swap the two tied actions');
  const high = [action(a, 0), action(b, 0)];
  speedSort(high, function(x, y) { return compareTurnActionOrder(x, y, field); }, function() { return 0.75; });
  eq(high[0].attacker, a, 'high shuffle roll should retain the first tied action');
});

T('6. speed snapshots expose SP-aware effective Speed stacks and exact ties', function() {
  const field = new Field();
  const boosted = mk('Garchomp', { item: 'Choice Scarf', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const baseline = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  boosted.side = field.playerSide;
  baseline.side = field.oppSide;
  field.playerSide.tailwind = true;
  boosted.statBoosts.spe = 1;
  const details = speedOrderDetailsSnapshot([boosted], [baseline], field);
  const row = details.find(r => r.pokemon === 'Garchomp');
  truthy(row, 'boosted row missing from speed details');
  truthy(row.effective_speed > baseline.getEffSpeed(field), 'stacked Speed should outrun baseline Dragapult');
  eq(row.stat_format, 'champions', 'Champions stat format should be exported');
  eq(row.nature, 'Hardy', 'nature should be exported');
  eq(row.speed_points, 32, 'Champions Speed points should be exported');
  truthy(row.species_base_speed > 0, 'species base Speed should be exported');
  eq(row.calculated_speed, row.base_speed, 'calculated Speed alias should match legacy base_speed');
  eq(row.speed_stage, 1, 'speed stage should be exported');
  eq(row.item, 'Choice Scarf', 'Choice Scarf should be exported');
  eq(row.tailwind, true, 'Tailwind state should be exported');

  const tieA = mk('Garchomp', { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const tieB = mk('Garchomp', { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  tieA.side = field.playerSide;
  tieB.side = field.oppSide;
  field.playerSide.tailwind = false;
  const tieRows = speedOrderDetailsSnapshot([tieA], [tieB], field);
  truthy(tieRows.length === 2 && tieRows.every(r => r.exact_speed_tie), 'exact Speed ties should be marked');
});

T('7. Champions SP and nature differences break same-species Speed ties before RNG', function() {
  const field = new Field();
  const fast = mk('Garchomp', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const slow = mk('Garchomp', { nature: 'Hardy', evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  fast.side = field.playerSide;
  slow.side = field.oppSide;
  truthy(fast.getEffSpeed(field) > slow.getEffSpeed(field), 'SP/nature-adjusted Speed should break the tie');
  truthy(compareTurnActionOrder(action(fast, 0), action(slow, 0), field, function() { return 0.99; }) < 0,
    'faster same-species Pokemon should act first before RNG tie-break');
  const rows = speedOrderDetailsSnapshot([fast], [slow], field);
  truthy(rows.length === 2 && rows.every(r => !r.exact_speed_tie), 'non-equal calculated Speed rows should not be exact ties');
});

T('8. stat-stage snapshots expose later damage and turn-order state', function() {
  const field = new Field();
  const dancer = mk('Charizard', { evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } });
  dancer.side = field.playerSide;
  dancer.statBoosts.atk = 1;
  dancer.statBoosts.spe = 1;
  const keyed = statBoostSnapshot([dancer], [], [], [], false);
  const stable = statBoostSnapshot([dancer], [], [], [], true);
  const key = Object.keys(keyed)[0];
  const stableKey = Object.keys(stable)[0];
  truthy(key && stableKey, 'stat boost snapshot keys missing');
  eq(keyed[key].atk, 1, 'Attack boost should be exported');
  eq(keyed[key].spe, 1, 'Speed boost should be exported');
  eq(stable[stableKey].atk, 1, 'stable Attack boost should be exported');
});

T('9. live battle order respects Trick Room after it is set', function() {
  const playerTeam = team([{
    name: 'Cofagrigus',
    item: '',
    ability: 'Mummy',
    nature: 'Relaxed',
    level: 50,
    moves: ['Trick Room'],
    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }
  }, {
    name: 'Torkoal',
    item: '',
    ability: 'Drought',
    nature: 'Quiet',
    level: 50,
    moves: ['Growl'],
    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }
  }]);
  const oppTeam = team([{
    name: 'Garchomp',
    item: '',
    ability: 'Rough Skin',
    nature: 'Jolly',
    level: 50,
    moves: ['Growl'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }, {
    name: 'Arcanine',
    item: '',
    ability: 'Flash Fire',
    nature: 'Jolly',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const battle = simulateBattle(playerTeam, oppTeam, { format: 'doubles', seed: [101, 102, 103, 104], maxTurns: 2 });
  const trIdx = battle.log.findIndex(line => String(line).includes('Trick Room was set'));
  const slowIdx = indexAfter(battle.log, 'Torkoal used Growl!', trIdx);
  const fastIdx = indexAfter(battle.log, 'Garchomp used Growl!', trIdx);
  truthy(trIdx >= 0, 'Trick Room should be set on turn 1');
  truthy(slowIdx >= 0 && fastIdx >= 0, 'both same-priority attackers should move after Trick Room is set');
  truthy(slowIdx < fastIdx, 'Torkoal should move before Garchomp under Trick Room');
});

T('10. turn logs expose structured stacked damage evidence', function() {
  const playerTeam = team([{
    name: 'Charizard',
    item: 'Charcoal',
    ability: 'Blaze',
    nature: 'Adamant',
    level: 50,
    hp: 30,
    moves: ['Flare Blitz'],
    evs: { hp: 0, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
  }]);
  const oppTeam = team([{
    name: 'Meganium',
    item: '',
    ability: 'Overgrow',
    nature: 'Hardy',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }
  }]);
  const battle = simulateBattle(playerTeam, oppTeam, { format: 'singles', seed: [301, 302, 303, 304], maxTurns: 1 });
  const damageRows = (((battle.turnLog || [])[0] || {}).damage_events) || [];
  const row = damageRows.find(r => r.move === 'Flare Blitz' && r.attacker === 'Charizard' && r.target === 'Meganium');
  truthy(row, 'Flare Blitz damage event missing');
  eq(row.damage_kind, 'calculated', 'damage should be marked calculated');
  eq(row.move_type, 'Fire', 'resolved move type should be exported');
  eq(row.category, 'physical', 'damage category should be exported');
  eq(row.type_effectiveness, 2, 'Fire into Meganium should be super effective');
  eq(row.typed_item_boost, true, 'Charcoal typed item boost should be exported');
  eq(row.typed_item_boost_mod, 4915, 'Charcoal boost should use Showdown fixed-point mod');
  truthy(row.base_power_modified > row.base_power_initial, 'modified BP should include Charcoal');
  truthy(row.stab_mod > 4096, 'STAB modifier should be exported');
  eq(row.spread_mod, 4096, 'singles should not apply doubles spread modifier');
  eq(row.attack_stat_key, 'atk', 'physical attack stat key should be exported');
  eq(row.defense_stat_key, 'def', 'physical defense stat key should be exported');
  eq(row.attacker_stat_format, 'champions', 'attacker Champions stat format should be exported');
  truthy(row.damage > 0 && row.target_hp_after < row.target_hp_before, 'damage event should include HP delta');
  truthy(Array.isArray(row.effect_tags) && row.effect_tags.includes('recoil'), 'recoil effect tag should be exported');
  eq(row.recoil_rule.basis, 'applied_damage', 'recoil should declare applied-damage basis');
  eq(row.recoil_damage, Math.max(1, Math.round(row.applied_damage * row.recoil_rule.numerator / row.recoil_rule.denominator)),
    'recoil evidence should match applied damage ratio');
  const effectRows = (((battle.turnLog || [])[0] || {}).effect_events) || [];
  const recoilRow = effectRows.find(r => r.move === 'Flare Blitz' && r.effect_kind === 'recoil');
  truthy(recoilRow, 'recoil effect event missing');
  eq(recoilRow.source_damage, row.applied_damage, 'recoil effect event should reference applied target damage');
  eq(recoilRow.calculated_effect_damage, row.recoil_damage, 'recoil effect should preserve calculated recoil amount');
  eq(recoilRow.damage_applied_to_user, Math.max(0, recoilRow.hp_before - recoilRow.hp_after),
    'recoil effect should record actual HP lost by the user');
});

T('11. Gap-A: higher priority brackets always act first regardless of attacker speed', function() {
  const field = new Field();
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const rng = function() { return 0.75; };
  truthy(compareTurnActionOrder(action(slow, 3), action(fast, 0), field, rng) < 0,
    'Fake Out-tier (+3) from slow mon beats normal (0) from fast mon');
  truthy(compareTurnActionOrder(action(slow, 1), action(fast, 0), field, rng) < 0,
    'Quick Attack-tier (+1) from slow mon beats normal (0) from fast mon');
  truthy(compareTurnActionOrder(action(slow, 3), action(fast, 1), field, rng) < 0,
    'Fake Out-tier (+3) beats Quick Attack-tier (+1) from faster mon');
  truthy(compareTurnActionOrder(action(fast, 0), action(slow, -6), field, rng) < 0,
    'Normal (0) from any mon beats Roar-tier (-6)');
});

T('12. Gap-A: negative priority tiers lose to zero and positive regardless of speed', function() {
  const field = new Field();
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const rng = function() { return 0.25; };
  truthy(compareTurnActionOrder(action(slow, 0), action(fast, -6), field, rng) < 0,
    'normal (0) from slow mon beats Roar-tier (-6) from fast mon');
  truthy(compareTurnActionOrder(action(slow, 1), action(fast, -6), field, rng) < 0,
    'priority +1 from slow mon beats -6 from fast mon');
  truthy(compareTurnActionOrder(action(fast, 0), action(slow, -1), field, rng) < 0,
    'normal (0) beats -1 priority regardless of relative speed');
});

T('13. Gap-B: 4-action doubles sort resolves priority bracket then speed descending', function() {
  const field = new Field();
  const rng = function() { return 0.75; };
  const slugP1 = mk('Cofagrigus', { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });  // base spe 30, priority 1
  const fastP0 = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } }); // base spe 142
  const medP0  = mk('Arcanine',  { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });  // base spe 95
  const slowP0 = mk('Torkoal',   { evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });  // base spe 20
  truthy(fastP0.getEffSpeed(field) > medP0.getEffSpeed(field),  'Dragapult should be faster than Arcanine');
  truthy(medP0.getEffSpeed(field)  > slowP0.getEffSpeed(field), 'Arcanine should be faster than Torkoal');
  const acts = [
    action(fastP0, 0),
    action(slowP0, 0),
    action(slugP1, 1),
    action(medP0, 0)
  ];
  acts.sort(function(a, b) { return compareTurnActionOrder(a, b, field, rng); });
  eq(acts[0].attacker.name, 'Cofagrigus', 'priority +1 mon acts first regardless of speed');
  eq(acts[1].attacker.name, 'Dragapult',  'fastest priority-0 mon acts second');
  eq(acts[2].attacker.name, 'Arcanine',   'medium-speed priority-0 mon acts third');
  eq(acts[3].attacker.name, 'Torkoal',    'slowest priority-0 mon acts last');
});

T('14. Gap-C: Trick Room reverses speed within a bracket but does not override bracket order', function() {
  const field = new Field();
  field.trickRoom = true;
  field.trickRoomTurns = 5;
  const slow = mk('Cofagrigus', { evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 } });
  const fast = mk('Dragapult', { nature: 'Jolly', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } });
  const rng = function() { return 0.75; };
  truthy(compareTurnActionOrder(action(slow, 3), action(fast, 0), field, rng) < 0,
    'under TR, Fake Out-tier (+3) from slow mon still acts before normal (0) from fast mon');
  truthy(compareTurnActionOrder(action(slow, 1), action(fast, 0), field, rng) < 0,
    'under TR, +1 from slow mon still acts before normal (0) from fast mon');
  truthy(compareTurnActionOrder(action(slow, 0), action(fast, 0), field, rng) < 0,
    'under TR, same-bracket: slow mon acts before fast mon');
  truthy(compareTurnActionOrder(action(fast, 0), action(slow, 1), field, rng) > 0,
    'under TR, fast mon with normal priority still loses to slow mon with +1 priority');
});

T('15. Gap-D: getPriority returns correct bracket values for shipped priority moves', function() {
  eq(getPriority('Fake Out'), 3, 'Fake Out should be priority +3');
  eq(getPriority('Extreme Speed'), 2, 'Extreme Speed should be priority +2');
  eq(getPriority('Quick Attack'), 1, 'Quick Attack should be priority +1');
  eq(getPriority('Ice Shard'), 1, 'Ice Shard should be priority +1');
  eq(getPriority('Aqua Jet'), 1, 'Aqua Jet should be priority +1');
  eq(getPriority('Sucker Punch'), 1, 'Sucker Punch should be priority +1');
  eq(getPriority('Tackle'), 0, 'Tackle should be priority 0');
  eq(getPriority('Trick Room'), -7, 'Trick Room should be priority -7');
  eq(getPriority('Protect'), 4, 'Protect should be priority +4');
  eq(getPriority('Helping Hand'), 5, 'Helping Hand should be priority +5');
});

console.log('\nturn order / priority:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
