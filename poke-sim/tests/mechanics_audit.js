const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { runMechanicsAudit } = require('./mechanics_audit_cases');

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
load('generated/pokemon_showdown_legal_data.js');
load('engine.js');
vm.runInContext('this.simulateBattle = simulateBattle;', ctx);

try {
  runMechanicsAudit(ctx.simulateBattle);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
