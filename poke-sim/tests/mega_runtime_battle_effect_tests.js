'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON };
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
vm.runInContext([
  'this.simulateBattle = simulateBattle;',
  'this.Pokemon = Pokemon;',
  'this.Field = Field;',
  'this.TEAMS = TEAMS;'
].join('\n'), ctx);

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

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

function mon(name, item, ability, moves, evs) {
  return {
    name,
    item: item || '',
    ability: ability || '',
    level: 50,
    nature: 'Hardy',
    evs: evs || { hp: 32, atk: 0, def: 0, spa: 32, spd: 0, spe: 2 },
    moves: moves || ['Protect']
  };
}

function team(name, member) {
  return {
    name,
    format: 'champions',
    legality_status: 'legal',
    members: [member]
  };
}

function opponent() {
  return team('Weather Proof Opponent', mon('Blastoise', '', 'Torrent', ['Protect'], {
    hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0
  }));
}

function opponentWith(member) {
  return team('Ability Proof Opponent', member);
}

function runOne(member) {
  return ctx.simulateBattle(team('Mega Weather Proof', member), opponent(), {
    format: 'singles',
    seed: [17, 31, 47, 63],
    maxTurns: 1
  });
}

function runOneAgainst(member, oppMember) {
  return ctx.simulateBattle(team('Mega Ability Proof', member), opponentWith(oppMember), {
    format: 'singles',
    seed: [17, 31, 47, 63],
    maxTurns: 1
  });
}

function firstPostField(battle) {
  return (((battle.turnLog || [])[0] || {}).post || {}).field || {};
}

function logIncludes(battle, text) {
  return (battle.log || []).some((line) => String(line).includes(text));
}

console.log('\n=== Mega runtime battle-effect tests ===\n');

T('1. Charizard-Mega-Y triggers Drought sun during battle Mega phase', () => {
  const battle = runOne(mon('Charizard-Mega-Y', 'Charizardite Y', 'Blaze', ['Protect']));
  const field = firstPostField(battle);
  eq(field.weather, 'sun', 'post-turn weather');
  truthy(field.weather_turns >= 4 && field.weather_turns <= 5, 'sun turns should be active after turn 1');
  truthy(logIncludes(battle, 'Charizard-Mega-Y Mega Evolved!'), 'Mega log missing');
  truthy(logIncludes(battle, "Charizard-Mega-Y's Drought summoned harsh sunlight!"), 'Drought log missing');
});

T('2. Tyranitar-Mega triggers Sand Stream sand during battle Mega phase', () => {
  const battle = runOne(mon('Tyranitar-Mega', 'Tyranitarite', 'Unnerve', ['Protect']));
  const field = firstPostField(battle);
  eq(field.weather, 'sand', 'post-turn weather');
  truthy(logIncludes(battle, 'Tyranitar-Mega Mega Evolved!'), 'Mega log missing');
  truthy(logIncludes(battle, "Tyranitar-Mega's Sand Stream summoned a sandstorm!"), 'Sand Stream log missing');
});

T('3. Froslass-Mega triggers Snow Warning snow during battle Mega phase', () => {
  const battle = runOne(mon('Froslass-Mega', 'Froslassite', 'Cursed Body', ['Protect']));
  const field = firstPostField(battle);
  eq(field.weather, 'snow', 'post-turn weather');
  truthy(logIncludes(battle, 'Froslass-Mega Mega Evolved!'), 'Mega log missing');
  truthy(logIncludes(battle, "Froslass-Mega's Snow Warning summoned snow!"), 'Snow Warning log missing');
});

T('4. Abomasnow-Mega triggers Snow Warning snow during battle Mega phase', () => {
  const battle = runOne(mon('Abomasnow-Mega', 'Abomasite', 'Snow Warning', ['Protect']));
  const field = firstPostField(battle);
  eq(field.weather, 'snow', 'post-turn weather');
  truthy(logIncludes(battle, 'Abomasnow-Mega Mega Evolved!'), 'Mega log missing');
  truthy(logIncludes(battle, "Abomasnow-Mega's Snow Warning summoned snow!"), 'Snow Warning log missing');
});

T('5. base Charizard with Charizardite Y does not claim immediate Drought in current runtime model', () => {
  const battle = runOne(mon('Charizard', 'Charizardite Y', 'Solar Power', ['Protect']));
  const field = firstPostField(battle);
  eq(field.weather || null, null, 'base-form custom set should not silently claim sun');
  truthy(!logIncludes(battle, 'Drought summoned harsh sunlight'), 'base-form custom set should not log Drought');
});

T('6. Manectric-Mega re-fires Intimidate after Mega ability swap', () => {
  const battle = runOneAgainst(
    mon('Manectric-Mega', 'Manectite', 'Lightning Rod', ['Protect']),
    mon('Garchomp', '', 'Rough Skin', ['Protect'], { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 2 })
  );
  truthy(logIncludes(battle, 'Manectric-Mega Mega Evolved!'), 'Mega log missing');
  truthy(logIncludes(battle, "Manectric-Mega's Intimidate activated!"), 'Intimidate activation missing');
  truthy(logIncludes(battle, "Manectric-Mega's Intimidate lowered Garchomp's Attack!"), 'Intimidate attack-drop log missing');
});

console.log(`\nMega runtime battle effects: ${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
