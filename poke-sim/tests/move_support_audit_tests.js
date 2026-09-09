const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'reports', 'move_support_audit.md');

const ctx = {
  console,
  module: { exports: {} },
  exports: {},
  require,
  ChampionsSim: {},
  globalThis: null
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('generated/pokemon_showdown_legal_data.js');
load('move_support.js');

const moveSupport = ctx.ChampionsSim.moveSupport;
const teams = vm.runInContext('TEAMS', ctx);
const moves = new Set();
for (const team of Object.values(teams || {})) {
  for (const mon of team.members || []) {
    for (const move of mon.moves || []) moves.add(move);
  }
}
const summary = [...moves].sort().map((move) => moveSupport.getLocalMoveSupport(move));

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

console.log('\n=== move support audit tests ===\n');

T('1. shipped move surface has no incomplete registry gaps', () => {
  const incomplete = summary.filter((row) => row.supportLevel === 'incomplete');
  eq(incomplete.length, 0, 'incomplete move count');
});

T('2. key verified edge-case moves stay tagged verified', () => {
  const fakeOut = summary.find((row) => row.moveName === 'Fake Out');
  const protect = summary.find((row) => row.moveName === 'Protect');
  truthy(fakeOut, 'Fake Out summary missing');
  truthy(protect, 'Protect summary missing');
  eq(fakeOut.supportLevel, 'verified', 'Fake Out support');
  eq(protect.supportLevel, 'verified', 'Protect support');
});

T('3. former baseline shipped moves are now verified', () => {
  const voltSwitch = summary.find((row) => row.moveName === 'Volt Switch');
  const auraSphere = summary.find((row) => row.moveName === 'Aura Sphere');
  truthy(voltSwitch, 'Volt Switch summary missing');
  truthy(auraSphere, 'Aura Sphere summary missing');
  eq(voltSwitch.supportLevel, 'verified', 'Volt Switch support');
  eq(auraSphere.supportLevel, 'verified', 'Aura Sphere support');
});

T('4. audit report exists and names the shipped move count', () => {
  truthy(fs.existsSync(reportPath), 'move support audit report missing');
  const report = fs.readFileSync(reportPath, 'utf8');
  const verifiedCount = summary.filter((row) => row.supportLevel === 'verified').length;
  const baselineCount = summary.filter((row) => row.supportLevel === 'baseline').length;
  truthy(report.includes('# Move Support Audit'), 'report header missing');
  truthy(report.includes('Shipped distinct moves audited:'), 'report summary missing');
  truthy(report.includes('Verified: ' + verifiedCount), 'verified move count should match the current shipped move surface');
  truthy(report.includes('Baseline: ' + baselineCount), 'baseline move count should match the current shipped move surface');
  truthy(report.includes('Verification | Tests | Sources'), 'verification columns missing');
  truthy(report.includes('Freeze-Dry | verified | yes'), 'promoted verified move row missing');
  truthy(report.includes('Low Kick | verified | yes'), 'Low Kick verified row missing');
});

T('5. imported Showdown moves can be baseline-supported without local table rows', () => {
  const braveBird = moveSupport.getLocalMoveSupport('Brave Bird');
  truthy(braveBird, 'Brave Bird summary missing');
  eq(braveBird.supportLevel, 'baseline', 'Brave Bird support');
  truthy(braveBird.showdown && braveBird.showdown.basePower === 120, 'Brave Bird Showdown BP missing');
  truthy(braveBird.showdown && Array.isArray(braveBird.showdown.recoil) && braveBird.showdown.recoil[0] === 33,
    'Brave Bird Showdown recoil missing');
  truthy(braveBird.showdown && String(braveBird.showdown.shortDesc || '').toLowerCase().includes('recoil'),
    'Brave Bird Showdown short description missing');
  truthy(braveBird.effective && braveBird.effective.source === 'showdown', 'Brave Bird should be sourced from Showdown');
});

console.log(`\nmove support audit: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
