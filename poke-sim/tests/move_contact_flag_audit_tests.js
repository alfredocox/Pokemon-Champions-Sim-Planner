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
load('runtime_data.js');
load('engine.js');

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

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy value');
}

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'not equal') + ' expected=' + JSON.stringify(expected) + ' got=' + JSON.stringify(actual));
}

function auditContactFlags() {
  return vm.runInContext(`
    (function() {
      var data = ChampionsSim.pokemonDataAudit;
      var localSet = new Set([].concat(Object.keys(MOVE_CATEGORY || {}), Object.keys(MOVE_BP || {}), Object.keys(MOVE_TARGETS || {})));
      var localMoves = Array.from(localSet).sort();
      function toId(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
      var mismatches = [];
      for (var i = 0; i < localMoves.length; i++) {
        var name = localMoves[i];
        var row = data.moves[toId(name)];
        if (!row) continue;
        var flags = String(row.flags || '').split('|').filter(Boolean);
        var showdownContact = flags.indexOf('contact') !== -1;
        var localInfo = getMoveContactInfo(name);
        if (showdownContact !== localInfo.is_contact) {
          mismatches.push({ name: name, showdownContact: showdownContact, local: localInfo });
        }
      }
      return mismatches;
    })()
  `, ctx);
}

console.log('\n=== Move contact flag audit tests ===\n');

T('1. supported local moves do not override Showdown contact flags incorrectly', () => {
  const mismatches = auditContactFlags();
  eq(mismatches.length, 0, 'contact flag mismatches: ' + JSON.stringify(mismatches));
});

T('2. known non-contact physical moves stay non-contact', () => {
  const checks = vm.runInContext(`
    ['Beak Blast', 'Bone Club', 'Scale Shot'].map(function(move) {
      return getMoveContactInfo(move);
    })
  `, ctx);
  checks.forEach((row) => {
    eq(row.is_contact, false, row.move + ' should not be contact');
    truthy(row.has_showdown_row, row.move + ' should have a Showdown row');
  });
});

T('3. known contact physical moves still trigger contact logic', () => {
  const checks = vm.runInContext(`
    ['Foul Play', 'Body Press', 'Flare Blitz', 'Low Kick'].map(function(move) {
      return getMoveContactInfo(move);
    })
  `, ctx);
  checks.forEach((row) => eq(row.is_contact, true, row.move + ' should be contact'));
});

console.log('\nmove contact flag audit:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
