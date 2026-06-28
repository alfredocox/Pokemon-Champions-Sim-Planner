// QA baseline snapshot guard - keeps Overview-linked moveset reference current.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'reports', 'champion_qa_baseline_snapshot.md');
const uiPath = path.join(ROOT, 'ui.js');

const ctx = {
  console,
  module: { exports: {} },
  exports: {},
  require,
  globalThis: {},
  ChampionsSim: {}
};
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
const teams = vm.runInContext('TEAMS', ctx);

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(value, msg) { if (!value) throw new Error(msg || 'expected truthy'); }

function approvedTeams() {
  return Object.entries(teams || {})
    .filter(([, team]) => team && team.format === 'champions' && team.legality_status === 'legal')
    .sort(([a], [b]) => a.localeCompare(b));
}

function tableCell(value) {
  return String(value == null || value === '' ? '-' : value).replace(/\|/g, '\\|');
}

console.log('\n=== QA baseline snapshot tests ===\n');

T('1. QA baseline snapshot exists and is linked from Overview docs', () => {
  truthy(fs.existsSync(reportPath), 'champion_qa_baseline_snapshot.md missing');
  const ui = fs.readFileSync(uiPath, 'utf8');
  truthy(ui.includes("href: 'reports/champion_qa_baseline_snapshot.md'"), 'Overview docs link missing');
});

T('2. snapshot includes approved Champion team movesets', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  truthy(report.includes('## Approved Runtime Team Movesets'), 'approved moveset section missing');
  for (const [teamKey, team] of approvedTeams()) {
    truthy(report.includes('| ' + tableCell(teamKey) + ' |'), 'team key missing from snapshot: ' + teamKey);
    for (const member of team.members || []) {
      truthy(report.includes('| ' + tableCell(member.name || member.species) + ' |'), 'team member missing from snapshot: ' + teamKey + ' ' + (member.name || member.species));
    }
  }
});

T('3. snapshot includes approved-team move baseline rows', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  truthy(report.includes('## Approved Catalog Move Baseline'), 'move baseline section missing');
  const moves = new Set();
  for (const [, team] of approvedTeams()) {
    for (const member of team.members || []) {
      for (const move of member.moves || []) moves.add(move);
    }
  }
  for (const move of moves) {
    truthy(report.includes('| ' + tableCell(move) + ' |'), 'approved move missing from baseline snapshot: ' + move);
  }
});

T('4. snapshot documents generated-source update rule', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  truthy(report.includes('node tools/generate-qa-baseline-snapshot.mjs'), 'regeneration command missing');
  truthy(report.includes('do not hand-edit team or move rows'), 'generated-source warning missing');
});

T('5. snapshot exposes Showdown recoil context for QA', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  truthy(report.includes('| Move | Support | Type | Category | Base Power | Accuracy | Priority | Target | Source | Recoil | Effect Tags | Showdown Context |'),
    'move baseline should include recoil, effect tags, and Showdown context columns');
  truthy(report.includes('## Recoil Move QA Context'), 'recoil QA context section missing');
  truthy(report.includes('| Flare Blitz |') && report.includes('33/100 damage dealt'),
    'Flare Blitz recoil context missing');
  truthy(report.includes('| Wave Crash |') && report.includes('33/100 damage dealt'),
    'Wave Crash recoil context missing');
  truthy(report.includes('| Head Smash |') && report.includes('1/2 damage dealt'),
    'Head Smash recoil context missing');
});

T('6. snapshot exposes broader effect-math context for QA', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  truthy(report.includes('## Effect Move QA Context'), 'effect QA context section missing');
  truthy(report.includes('| Giga Drain |') && report.includes('drain-heal'),
    'Giga Drain drain context missing');
  truthy(report.includes('| Clangorous Soul |') && report.includes('hp-cost'),
    'Clangorous Soul HP-cost context missing');
  truthy(report.includes('| Shed Tail |') && report.includes('HP cost is 1/2 max HP rounded up; passed Substitute is 1/4 max HP rounded down'),
    'Shed Tail exact HP-cost context missing');
  truthy(report.includes('| Leech Seed |') && report.includes('residual-drain'),
    'Leech Seed residual context missing');
  truthy(report.includes('effect_events'), 'effect_events guidance missing');
});

T('7. generated snapshot is current with source data', () => {
  const res = spawnSync(process.execPath, ['tools/generate-qa-baseline-snapshot.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  truthy(res.status === 0, (res.stderr || res.stdout || 'snapshot check failed').trim());
});

console.log(`\nQA baseline snapshot: ${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
