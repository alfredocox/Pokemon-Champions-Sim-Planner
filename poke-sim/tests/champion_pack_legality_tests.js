'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const ctx = { console, module: {}, exports: {}, Object, Array, RegExp, String, Math, Set, JSON };
vm.createContext(ctx);
vm.runInContext(dataSource + '\n' + engineSource, ctx, { filename: 'champion-pack-legality' });
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

T('1. champions_arena_2nd Sinistcha item matches the source-backed correction', function() {
  eq(TEAMS.champions_arena_2nd.members[2].name, 'Sinistcha', 'member 3 should be Sinistcha');
  eq(TEAMS.champions_arena_2nd.members[2].item, 'Kouba Berry', 'Sinistcha item should match audited source');
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

console.log('\nchampion pack legality:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
