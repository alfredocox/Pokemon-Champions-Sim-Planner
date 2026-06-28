const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

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
    dataset: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    click: () => {},
    focus: () => {},
    blur: () => {}
  };
}

const ctx = {
  console,
  require,
  module: {},
  exports: {},
  Math,
  Object,
  Array,
  Set,
  JSON,
  Promise,
  Date,
  String,
  Number,
  Boolean,
  Map,
  Error,
  RegExp,
  Symbol,
  parseFloat,
  parseInt,
  isFinite,
  process: { env: {} },
  window: {},
  Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  document: {
    getElementById: () => stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: stubEl(),
    documentElement: stubEl(),
    head: stubEl(),
    createElement: () => stubEl()
  }
};
ctx.window.matchMedia = () => ({ matches: false });
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.removeEventListener = () => {};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
load('ui.js');

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.simulateBattle = simulateBattle;',
  'this.csBuildQaCoverageSummary = csBuildQaCoverageSummary;',
  'this.csMergeQaCoverageSummaries = csMergeQaCoverageSummaries;'
].join(' '), ctx);

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '-', e.message);
    fail++;
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'not equal') + ' expected=' + expected + ' got=' + actual);
}

function team(name, members) {
  return { name, format: 'champions', legality_status: 'legal', members };
}

function battle(name, playerMembers, oppMembers, opts) {
  const result = ctx.simulateBattle(
    team(name + ' Player', playerMembers),
    team(name + ' Opponent', oppMembers),
    Object.assign({ format: 'singles', seed: [1, 2, 3, 4] }, opts || {})
  );
  truthy(Array.isArray(result.turnLog) && result.turnLog.length, name + ' turnLog missing');
  return result;
}

function effectRows(turnLog, predicate) {
  const rows = [];
  for (const turn of turnLog || []) {
    for (const row of turn.effect_events || []) {
      if (!predicate || predicate(row)) rows.push(row);
    }
  }
  return rows;
}

function damageRows(turnLog, predicate) {
  const rows = [];
  for (const turn of turnLog || []) {
    for (const row of turn.damage_events || []) {
      if (!predicate || predicate(row)) rows.push(row);
    }
  }
  return rows;
}

function targetedBattles() {
  const auroraVeil = battle('Aurora Veil Proof', [{
    name: 'Ninetales-Alola',
    ability: 'Snow Warning',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Aurora Veil'],
    evs: { hp: 32, spe: 32, spa: 2, atk: 0, def: 0, spd: 0 }
  }], [{
    name: 'Gardevoir',
    ability: '',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Moonblast'],
    evs: { hp: 32, spa: 32, spe: 0, atk: 0, def: 0, spd: 2 }
  }], { seed: [100, 200, 300, 400], maxTurns: 1 });

  const hpCost = battle('HP Cost Proof', [{
    name: 'Cyclizar',
    ability: '',
    item: '',
    nature: 'Jolly',
    level: 50,
    moves: ['Substitute'],
    evs: { hp: 32, spe: 32, atk: 2, def: 0, spa: 0, spd: 0 }
  }], [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, spd: 32, def: 2, atk: 0, spa: 0, spe: 0 }
  }], { maxTurns: 1 });

  const wish = battle('Delayed Recovery Proof', [{
    name: 'Vaporeon',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Wish', 'Protect'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], [{
    name: 'Jolteon',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 2, atk: 32, spe: 32, def: 0, spa: 0, spd: 0 }
  }], { maxTurns: 2 });

  const leechSeed = battle('Residual Drain Proof', [{
    name: 'Amoonguss',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Leech Seed'],
    evs: { hp: 32, spa: 0, spe: 0, atk: 0, def: 0, spd: 0 }
  }], [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, spd: 32, def: 2, atk: 0, spa: 0, spe: 0 }
  }], { maxTurns: 1 });

  const spread = battle('Spread Damage Proof', [
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Adamant',
      level: 50,
      moves: ['Earthquake'],
      evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Rotom-Wash',
      ability: 'Levitate',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Protect'],
      evs: { hp: 32, def: 0, spd: 32, atk: 0, spa: 0, spe: 2 }
    }
  ], [
    {
      name: 'Incineroar',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Arcanine',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
    }
  ], { format: 'doubles', seed: [10, 20, 30, 40], maxTurns: 1 });

  const weather = battle('Weather Modifier Proof', [{
    name: 'Charizard',
    ability: 'Drought',
    item: '',
    nature: 'Modest',
    level: 50,
    moves: ['Flamethrower'],
    evs: { hp: 32, spa: 32, spe: 2, atk: 0, def: 0, spd: 0 }
  }], [{
    name: 'Meganium',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], { seed: [11, 22, 33, 44], maxTurns: 1 });

  const trickRoom = battle('Trick Room Proof', [
    {
      name: 'Cofagrigus',
      ability: '',
      item: '',
      nature: 'Relaxed',
      level: 50,
      moves: ['Trick Room'],
      evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Torkoal',
      ability: '',
      item: '',
      nature: 'Quiet',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
    }
  ], [
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
    },
    {
      name: 'Arcanine',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
    }
  ], { format: 'doubles', seed: [101, 102, 103, 104], maxTurns: 1 });

  const tailwind = battle('Tailwind Proof', [
    {
      name: 'Whimsicott',
      ability: 'Prankster',
      item: '',
      nature: 'Timid',
      level: 50,
      moves: ['Tailwind'],
      evs: { hp: 32, spe: 32, spd: 2, atk: 0, def: 0, spa: 0 }
    },
    {
      name: 'Garchomp',
      ability: '',
      item: '',
      nature: 'Jolly',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
    }
  ], [
    {
      name: 'Pelipper',
      ability: '',
      item: '',
      nature: 'Calm',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
    },
    {
      name: 'Snorlax',
      ability: '',
      item: '',
      nature: 'Careful',
      level: 50,
      moves: ['Tackle'],
      evs: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
    }
  ], { format: 'doubles', seed: [201, 202, 203, 204], maxTurns: 1 });

  const statStage = battle('Stat Stage Damage Proof', [{
    name: 'Garchomp',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
  }], [{
    name: 'Incineroar',
    ability: 'Intimidate',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], { seed: [211, 212, 213, 214], maxTurns: 1 });

  const priority = battle('Priority Proof', [{
    name: 'Weavile',
    ability: '',
    item: '',
    nature: 'Brave',
    level: 50,
    moves: ['Ice Shard'],
    evs: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
  }], [{
    name: 'Dragapult',
    ability: '',
    item: '',
    nature: 'Timid',
    level: 50,
    moves: ['Dragon Pulse'],
    evs: { hp: 32, spa: 32, spe: 2, atk: 0, def: 0, spd: 0 }
  }], { seed: [301, 302, 303, 304], maxTurns: 1 });

  const recoil = battle('Recoil Proof', [{
    name: 'Arcanine',
    ability: '',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Flare Blitz'],
    evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
  }], [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], { seed: [401, 402, 403, 404], maxTurns: 1 });

  const recovery = battle('Direct Recovery Proof', [{
    name: 'Snorlax',
    ability: '',
    item: '',
    nature: 'Careful',
    level: 50,
    hp: 60,
    moves: ['Recover'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
  }], { seed: [501, 502, 503, 504], maxTurns: 1 });

  const itemRecovery = battle('Item Recovery Proof', [{
    name: 'Garchomp',
    ability: '',
    item: 'Leftovers',
    nature: 'Jolly',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
  }], [{
    name: 'Pelipper',
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, spe: 2, def: 0, spa: 0, spd: 0 }
  }], { seed: [601, 602, 603, 604], maxTurns: 1 });

  const moveRuleTrace = battle('Move Rule Trace Proof', [{
    name: 'Mandibuzz',
    ability: '',
    item: '',
    nature: 'Impish',
    level: 50,
    moves: ['Foul Play'],
    evs: { hp: 32, def: 32, spd: 2, atk: 0, spa: 0, spe: 0 }
  }], [{
    name: 'Dragonite',
    ability: 'Huge Power',
    item: '',
    nature: 'Adamant',
    level: 50,
    moves: ['Tackle'],
    evs: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
  }], { seed: [701, 702, 703, 704], maxTurns: 1 });

  return {
    auroraVeil,
    hpCost,
    wish,
    leechSeed,
    spread,
    weather,
    trickRoom,
    tailwind,
    statStage,
    priority,
    recoil,
    recovery,
    itemRecovery,
    moveRuleTrace
  };
}

function summaryFor(name, result) {
  return ctx.csBuildQaCoverageSummary(result.turnLog, {
    scope: 'targeted-proof-' + name,
    build_id: 'local-targeted-proof',
    source_url: 'local-test',
    format: 'singles',
    player_team_id: name + '_player',
    opponent_team_id: name + '_opponent'
  });
}

console.log('\n=== QA targeted proof tests ===\n');

T('targeted battles emit the evidence rows named by missing_targeted_proof', () => {
  const runs = targetedBattles();

  truthy(runs.auroraVeil.log.some((line) => String(line).includes('activated Aurora Veil')),
    'Aurora Veil setup log missing');
  truthy(damageRows(runs.auroraVeil.turnLog, row => Number(row.screen_mod) !== 4096).length,
    'screen/Aurora Veil damage row missing');

  truthy(effectRows(runs.hpCost.turnLog, row => String(row.effect_kind || '').includes('hp-cost')).length,
    'HP-cost effect row missing');
  truthy(effectRows(runs.wish.turnLog, row => row.effect_kind === 'delayed-recovery').length,
    'delayed recovery effect row missing');
  truthy(effectRows(runs.leechSeed.turnLog, row => String(row.effect_kind || '').includes('residual-drain')).length,
    'residual drain effect row missing');
  truthy(damageRows(runs.spread.turnLog, row => Number(row.spread_mod) !== 4096).length,
    'spread damage row missing');
  truthy(damageRows(runs.weather.turnLog, row => Number(row.weather_mod) !== 4096).length,
    'weather-modified damage row missing');
  truthy((runs.trickRoom.turnLog || []).some(row => row.post && row.post.field && Number(row.post.field.trick_room || 0) > 0),
    'Trick Room active snapshot missing');
  truthy((runs.tailwind.turnLog || []).some(row => row.post && row.post.speed_control && row.post.speed_control.player && Number(row.post.speed_control.player.tailwind_turns || 0) > 0),
    'Tailwind active snapshot missing');
  truthy(damageRows(runs.statStage.turnLog, row => Number(row.attack_stat_stage_used || row.attack_stat_stage || 0) !== 0).length,
    'stat-stage damage row missing');
  truthy((runs.priority.turnLog || []).some(row => {
    const actions = row.actions || {};
    return (actions.player || []).concat(actions.opponent || []).some(action => Number(action.priority || 0) !== 0 || action.move === 'Ice Shard');
  }), 'priority action row missing');
  truthy(effectRows(runs.recoil.turnLog, row => String(row.effect_kind || '').includes('recoil')).length,
    'recoil effect row missing');
  truthy(effectRows(runs.recovery.turnLog, row => row.effect_kind === 'recovery').length,
    'direct recovery effect row missing');
  truthy(effectRows(runs.itemRecovery.turnLog, row => String(row.effect_kind || '').includes('item-recovery')).length,
    'item recovery effect row missing');
  const moveRuleRows = damageRows(runs.moveRuleTrace.turnLog, row => row.move_rule_trace && row.move_rule_trace.schema_version === 'champions-move-rule-trace-v1');
  truthy(moveRuleRows.length, 'move rule trace damage row missing');
  truthy(moveRuleRows.some(row => row.move_rule_trace.ruleset_flags && row.move_rule_trace.ruleset_flags.foul_play_target_attack_source),
    'Foul Play target Attack trace flag missing');
  truthy(moveRuleRows.some(row => row.move_rule_trace.ruleset_flags && row.move_rule_trace.ruleset_flags.foul_play_target_power_ability_ignored),
    'Foul Play target Huge/Pure Power ignored trace flag missing');
});

T('merged targeted QA coverage clears the artifact proof gaps', () => {
  const runs = targetedBattles();
  const summaries = Object.keys(runs).map((name) => summaryFor(name, runs[name]));
  const merged = ctx.csMergeQaCoverageSummaries(summaries, {
    scope: 'targeted-proof-merged',
    build_id: 'local-targeted-proof',
    source_url: 'local-test',
    format: 'singles',
    player_team_id: 'targeted_proof'
  });
  const mechanics = merged.mechanics_seen || {};
  truthy(mechanics.screen_reduction > 0, 'screen_reduction coverage missing');
  truthy(mechanics.hp_cost > 0, 'hp_cost coverage missing');
  truthy(mechanics.delayed_recovery > 0, 'delayed_recovery coverage missing');
  truthy(mechanics.residual_drain > 0, 'residual_drain coverage missing');
  truthy(mechanics.spread_damage > 0, 'spread_damage coverage missing');
  truthy(mechanics.weather_damage_modifier > 0, 'weather_damage_modifier coverage missing');
  truthy(mechanics.trick_room_active > 0, 'trick_room_active coverage missing');
  truthy(mechanics.tailwind_active > 0, 'tailwind_active coverage missing');
  truthy(mechanics.stat_stage_damage > 0, 'stat_stage_damage coverage missing');
  truthy(mechanics.priority_actions > 0, 'priority_actions coverage missing');
  truthy(mechanics.recoil > 0, 'recoil coverage missing');
  truthy(mechanics.recovery > 0, 'recovery coverage missing');
  truthy(mechanics.item_recovery > 0, 'item_recovery coverage missing');
  truthy(mechanics.move_rule_trace_rows > 0, 'move_rule_trace_rows coverage missing');
  truthy(mechanics.nonstandard_stat_source_trace > 0, 'nonstandard_stat_source_trace coverage missing');
  truthy(mechanics.foul_play_trace > 0, 'foul_play_trace coverage missing');
  truthy(mechanics.ignored_target_power_ability_trace > 0, 'ignored_target_power_ability_trace coverage missing');

  const missing = merged.missing_targeted_proof || [];
  eq(missing.includes('screen or Aurora Veil damage reduction'), false, 'screen proof should not be missing');
  eq(missing.includes('HP-cost moves'), false, 'HP-cost proof should not be missing');
  eq(missing.includes('delayed recovery'), false, 'delayed recovery proof should not be missing');
  eq(missing.includes('residual drain'), false, 'residual drain proof should not be missing');
  eq(missing.length, 0, 'merged targeted proof should clear every named proof gap');

  if (process.env.WRITE_QA_TARGETED_PROOF === '1') {
    const outPath = path.join(ROOT, 'reports', 'qa-targeted-proof-latest.json');
    const payload = {
      schema_version: 'champions-qa-targeted-proof-v1',
      generated_at: new Date().toISOString(),
      summary: merged,
      runs: Object.keys(runs).map((name) => ({
        name,
        result: runs[name].result,
        turns: runs[name].turns,
        winCondition: runs[name].winCondition,
        qa_coverage_summary: summaryFor(name, runs[name]),
        turnLog: runs[name].turnLog,
        log: runs[name].log
      }))
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log('  wrote ' + outPath);
  }
});

console.log(`\nQA targeted proof: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
