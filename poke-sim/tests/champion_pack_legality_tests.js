'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const legalitySource = fs.readFileSync(path.join(ROOT, 'legality.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const ctx = { console, module: {}, exports: {}, Object, Array, RegExp, String, Math, Set, JSON };
vm.createContext(ctx);
vm.runInContext(dataSource + '\n' + legalitySource + '\n' + engineSource, ctx, { filename: 'champion-pack-legality' });
vm.runInContext('this.TEAMS=TEAMS; this.validateTeam=validateTeam;', ctx);

const TEAMS = ctx.TEAMS;
const validateTeam = ctx.validateTeam;
const CURATED_TEAM_KEYS = Object.keys(TEAMS).filter(function(key) {
  return key !== 'player' && key.indexOf('custom_') !== 0;
});

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

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'eq failed') + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

console.log('\n=== champion pack legality tests ===\n');

T('1. champions_arena_2nd Sinistcha item uses verified Champions pool correction', function() {
  eq(TEAMS.champions_arena_2nd.members[2].name, 'Sinistcha', 'member 3 should be Sinistcha');
  eq(TEAMS.champions_arena_2nd.members[2].item, 'Coba Berry', 'Sinistcha item should use verified item-pool spelling');
});

T('2. no curated shipped team has an Item Clause violation', function() {
  const offenders = [];
  CURATED_TEAM_KEYS.forEach(function(key) {
    const result = validateTeam(TEAMS[key], 'vgc');
    const itemErrors = result.errors.filter(function(err) {
      return err.indexOf('Item Clause violation') !== -1;
    });
    if (itemErrors.length > 0) offenders.push(key + ': ' + itemErrors.join(' | '));
  });
  eq(offenders.length, 0, offenders.join('; '));
});

T('3. champions_arena_2nd validates without Item Clause drift', function() {
  const result = validateTeam(TEAMS.champions_arena_2nd, 'vgc');
  truthy(!result.errors.some(function(err) {
    return err.indexOf('Item Clause violation') !== -1;
  }), 'team should not fail Item Clause');
});

T('4. curated shipped teams validate against the Champions item pool', function() {
  const offenders = [];
  CURATED_TEAM_KEYS.forEach(function(key) {
    const result = validateTeam(TEAMS[key], 'vgc');
    const itemErrors = result.errors.filter(function(err) {
      return err.indexOf('verified Champions Reg M-A item pool') !== -1;
    });
    if (itemErrors.length > 0) offenders.push(key + ': ' + itemErrors.join(' | '));
  });
  eq(offenders.length, 0, offenders.join('; '));
});

T('5. Champion legality rejects Tera fields and Tera Blast', function() {
  const result = validateTeam({
    name: 'Bad Champion Tera',
    format: 'champions',
    members: [{
      name: 'Dragapult',
      item: 'Choice Scarf',
      ability: 'Clear Body',
      teraType: 'Fairy',
      moves: ['Dragon Darts', 'Tera Blast'],
      evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
    }]
  }, 'vgc');
  truthy(result.errors.some(function(err) { return err.indexOf('Tera type') !== -1; }), 'Tera field should be rejected');
  truthy(result.errors.some(function(err) { return err.indexOf('Tera Blast') !== -1; }), 'Tera Blast should be rejected');
});

T('6. Charizardite Y shipped rows use active Mega Y Drought weather data', function() {
  const offenders = [];
  CURATED_TEAM_KEYS.forEach(function(key) {
    const team = TEAMS[key];
    (team.members || []).forEach(function(member, index) {
      if (member && member.item === 'Charizardite Y') {
        if (member.name !== 'Charizard-Mega-Y' || member.ability !== 'Drought') {
          offenders.push(key + ' slot ' + (index + 1) + ': ' + member.name + ' / ' + member.ability);
        }
      }
    });
  });
  eq(offenders.length, 0, offenders.join('; '));
});

console.log('\nchampion pack legality:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
