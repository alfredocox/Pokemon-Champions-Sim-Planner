const fs = require('fs');
const vm = require('vm');
const path = require('path');

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
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field; this.applySecondary = _applyDamagingMoveSecondary; this.applyStageMap = _applyStageMap; this.simulateBattle = simulateBattle; this.moveDrainRule = _moveDrainRule;', ctx);

const { Pokemon, Field, applySecondary, applyStageMap, simulateBattle, moveDrainRule } = ctx;
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

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy value');
}

function mk(name, overrides) {
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

function setup(attacker, target) {
  const field = new Field({ format: 'doubles' });
  attacker.side = field.playerSide;
  target.side = field.oppSide;
  field.playerSide.activeMons = [attacker];
  field.oppSide.activeMons = [target];
  return field;
}

function team(name, members) {
  return { name, members };
}

function forceSecondary(move, targetName, assertFn) {
  const attacker = mk('Raichu', { moves: [move] });
  const target = mk(targetName || 'Snorlax');
  const field = setup(attacker, target);
  const log = [];
  const applied = applySecondary(attacker, move, target, field, log, () => 0);
  truthy(applied, move + ' secondary should apply');
  assertFn(attacker, target, log);
}

console.log('\n=== Move secondary effect audit tests ===\n');

T('1. electric damaging secondaries can paralyze', () => {
  forceSecondary('Thunderbolt', 'Snorlax', (_attacker, target) => {
    eq(target.status, 'paralysis', 'Thunderbolt paralysis');
  });
  forceSecondary('Thunder Punch', 'Snorlax', (_attacker, target) => {
    eq(target.status, 'paralysis', 'Thunder Punch paralysis');
  });
});

T('2. standard damaging secondaries apply status ailments', () => {
  forceSecondary('Fire Fang', 'Snorlax', (_attacker, target) => eq(target.status, 'burn', 'Fire Fang burn'));
  forceSecondary('Freeze-Dry', 'Snorlax', (_attacker, target) => eq(target.status, 'frozen', 'Freeze-Dry freeze'));
  forceSecondary('Sludge Bomb', 'Snorlax', (_attacker, target) => eq(target.status, 'poison', 'Sludge Bomb poison'));
});

T('3. standard stat-drop secondaries use the correct target stat', () => {
  forceSecondary('Shadow Ball', 'Snorlax', (_attacker, target) => eq(target.statBoosts.spd, -1, 'Shadow Ball SpD drop'));
  forceSecondary('Moonblast', 'Snorlax', (_attacker, target) => eq(target.statBoosts.spa, -1, 'Moonblast SpA drop'));
  forceSecondary('Play Rough', 'Snorlax', (_attacker, target) => eq(target.statBoosts.atk, -1, 'Play Rough Attack drop'));
  forceSecondary('Night Daze', 'Snorlax', (_attacker, target) => eq(target.statBoosts.acc, -1, 'Night Daze accuracy drop'));
  forceSecondary('Rock Tomb', 'Snorlax', (_attacker, target) => eq(target.statBoosts.spe, -1, 'Rock Tomb Speed drop'));
  forceSecondary('Snarl', 'Snorlax', (_attacker, target) => eq(target.statBoosts.spa, -1, 'Snarl SpA drop'));
  forceSecondary('Breaking Swipe', 'Snorlax', (_attacker, target) => eq(target.statBoosts.atk, -1, 'Breaking Swipe Attack drop'));
});

T('4. guaranteed self secondary boosts apply to the user', () => {
  const attacker = mk('Wyrdeer', { moves: ['Psyshield Bash'] });
  const target = mk('Snorlax');
  const field = setup(attacker, target);
  const applied = applySecondary(attacker, 'Psyshield Bash', target, field, [], () => 0);
  truthy(applied, 'Psyshield Bash secondary should apply');
  eq(attacker.statBoosts.def, 1, 'Psyshield Bash user Defense boost');
});

T('5. complex state secondaries apply their explicit conditions', () => {
  const attacker = mk('Mew', { moves: ['Burning Jealousy'] });
  const target = mk('Snorlax');
  const field = setup(attacker, target);
  applyStageMap(target, { atk: 1 }, []);
  truthy(target._statsRaisedThisTurn, 'target should be marked as having raised stats this turn');
  truthy(applySecondary(attacker, 'Burning Jealousy', target, field, [], () => 0), 'Burning Jealousy should apply after a stat rise');
  eq(target.status, 'burn', 'Burning Jealousy conditional burn');
});

T('6. Spirit Shackle traps pivot attempts while the trapper is alive', () => {
  const player = team('Spirit Shackle Trap', [
    { name: 'Decidueye', ability: '', item: '', nature: 'Adamant', level: 50, moves: ['Spirit Shackle'], evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 } },
    { name: 'Garchomp', ability: '', item: '', nature: 'Jolly', level: 50, moves: ['Tackle'], evs: { hp: 252, atk: 252, spe: 4, def: 0, spa: 0, spd: 0 } }
  ]);
  const opp = team('Trapped Pivot', [
    { name: 'Torkoal', ability: '', item: '', nature: 'Quiet', level: 50, moves: ['U-turn'], evs: { hp: 252, atk: 252, spd: 4, def: 0, spa: 0, spe: 0 } },
    { name: 'Blissey', ability: '', item: '', nature: 'Calm', level: 50, moves: ['Tackle'], evs: { hp: 252, spd: 252, def: 4, atk: 0, spa: 0, spe: 0 } }
  ]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 2 });
  truthy(battle.log.some((line) => String(line).includes('Torkoal can no longer escape because of Spirit Shackle!')),
    'Spirit Shackle trap log missing');
  truthy(battle.log.some((line) => String(line).includes('Torkoal is trapped by Spirit Shackle!')),
    'trapped pivot block log missing');
});

T('7. Sparkling Aria cures burn after a successful damaging hit', () => {
  const player = team('Sparkling Aria Cure', [{
    name: 'Primarina', ability: '', item: '', nature: 'Modest', level: 50, moves: ['Sparkling Aria'], evs: { hp: 252, spa: 252, spe: 4, atk: 0, def: 0, spd: 0 }
  }]);
  const opp = team('Burned Target', [{
    name: 'Snorlax', ability: '', item: '', nature: 'Careful', level: 50, status: 'burn', moves: ['Tackle'], evs: { hp: 252, atk: 252, spd: 4, def: 0, spa: 0, spe: 0 }
  }]);
  const battle = simulateBattle(player, opp, { format: 'singles', seed: [0, 0, 0, 0], maxTurns: 1 });
  truthy(battle.log.some((line) => String(line).includes("Snorlax's burn was healed by Primarina's Sparkling Aria!")),
    'Sparkling Aria burn-cure log missing');
});

T('8. local supported secondary table has no uncovered simple Showdown effects', () => {
  const gaps = vm.runInContext(`
    (function() {
      var data = ChampionsSim.pokemonDataAudit;
      var localMoves = Array.from(new Set([].concat(Object.keys(MOVE_CATEGORY || {}), Object.keys(MOVE_BP || {}), Object.keys(MOVE_TARGETS || {})))).sort();
      function toId(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
      function normStatus(s) { return s === 'brn' ? 'burn' : s === 'frz' ? 'frozen' : s === 'par' ? 'paralysis' : s === 'psn' ? 'poison' : s || ''; }
      function normBoosts(boosts) {
        if (!boosts) return null;
        var out = {};
        Object.keys(boosts).sort().forEach(function(stat) {
          out[stat === 'accuracy' ? 'acc' : stat] = boosts[stat];
        });
        return out;
      }
      var ignoredVolatiles = { flinch: true };
      var complexCovered = {
        psychicnoise: true,
        sparklingaria: true,
        spiritshackle: true,
        burningjealousy: true,
        direclaw: true,
        matchagotcha: true
      };
      var gaps = [];
      function same(a, b) { return JSON.stringify(a || null) === JSON.stringify(b || null); }
      function addEffect(row, sec, effects) {
        if (!sec) return;
        effects.push({
          status: normStatus(sec.status || ''),
          volatileStatus: sec.volatileStatus || '',
          boosts: normBoosts(sec.boosts || null),
          selfBoosts: normBoosts(sec.self && sec.self.boosts || null)
        });
      }
      for (var i = 0; i < localMoves.length; i++) {
        var name = localMoves[i];
        var id = toId(name);
        var row = data.moves[id];
        if (!row || complexCovered[id]) continue;
        var local = SECONDARY_EFFECTS[name] || null;
        var effects = [];
        addEffect(row, row.secondary, effects);
        if (Array.isArray(row.secondaries)) row.secondaries.forEach(function(sec) { addEffect(row, sec, effects); });
        for (var j = 0; j < effects.length; j++) {
          var eff = effects[j];
          if (eff.volatileStatus && ignoredVolatiles[eff.volatileStatus]) continue;
          if (!eff.status && !eff.volatileStatus && !eff.boosts && !eff.selfBoosts) continue;
          var covered = false;
          if (eff.status && local && local.status === eff.status) covered = true;
          if (eff.volatileStatus && local && local.volatile === eff.volatileStatus) covered = true;
          if (eff.boosts && local && same(local.targetStages, eff.boosts)) covered = true;
          if (eff.selfBoosts && local && same(local.selfStages, eff.selfBoosts)) covered = true;
          if (!covered) gaps.push({ name: name, effect: eff, local: local });
        }
      }
      return gaps;
    })()
  `, ctx);
  eq(gaps.length, 0, 'uncovered simple secondary gaps: ' + JSON.stringify(gaps));
});

T('9. local supported drain moves use generated Showdown drain rules', () => {
  const gaps = vm.runInContext(`
    (function() {
      var data = ChampionsSim.pokemonDataAudit;
      var localMoves = Array.from(new Set([].concat(Object.keys(MOVE_CATEGORY || {}), Object.keys(MOVE_BP || {}), Object.keys(MOVE_TARGETS || {})))).sort();
      function toId(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
      var gaps = [];
      for (var i = 0; i < localMoves.length; i++) {
        var name = localMoves[i];
        var row = data.moves[toId(name)];
        if (!row || !row.drain) continue;
        var rule = _moveDrainRule(name);
        if (!rule || Number(rule.numerator) !== Number(row.drain[0]) || Number(rule.denominator) !== Number(row.drain[1])) {
          gaps.push({ name: name, showdown: row.drain, local: rule });
        }
      }
      return gaps;
    })()
  `, ctx);
  eq(gaps.length, 0, 'drain rule gaps: ' + JSON.stringify(gaps));
  eq(moveDrainRule('Parabolic Charge').numerator, 1, 'Parabolic Charge drain numerator');
  eq(moveDrainRule('Parabolic Charge').denominator, 2, 'Parabolic Charge drain denominator');
});

console.log('\nmove secondary effect audit:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
