// T9j.18 Section A (Refs #138) - data.js shipped placeholder guard.
//
// The app can still accept messy user imports, but the curated TEAMS catalog
// must not ship placeholder members, placeholder moves, or malformed member
// records that would quietly fall into engine defaults.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, module: {}, exports: {}, Object, Array, RegExp, String };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
vm.runInContext([
  'this.TEAMS=TEAMS;',
  'this.validateChampionsDataPlaceholders=validateChampionsDataPlaceholders;',
  'this.CHAMPIONS_DATA_PLACEHOLDER_ISSUES=CHAMPIONS_DATA_PLACEHOLDER_ISSUES;'
].join(' '), ctx);

const {
  TEAMS,
  validateChampionsDataPlaceholders,
  CHAMPIONS_DATA_PLACEHOLDER_ISSUES
} = ctx;

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(a, b, msg='') {
  if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

console.log('\n=== T9j.18 data placeholder guard tests ===\n');

T('1. guard function is exported from data.js', () => {
  eq(typeof validateChampionsDataPlaceholders, 'function');
});

T('2. shipped TEAMS catalog has zero placeholder issues', () => {
  eq(CHAMPIONS_DATA_PLACEHOLDER_ISSUES.length, 0, CHAMPIONS_DATA_PLACEHOLDER_ISSUES.join('; '));
});

T('3. guard catches placeholder species names', () => {
  const issues = validateChampionsDataPlaceholders({
    bad: { members: [{ name: 'TODO_MON', item: 'Leftovers', ability: 'Static', moves: ['Tackle'] }] }
  });
  truthy(issues.some(i => i.includes('TODO_MON')), issues.join('; '));
});

T('4. guard catches placeholder item and ability values', () => {
  const issues = validateChampionsDataPlaceholders({
    bad: { members: [{ name: 'Pikachu', item: 'FILL_ME', ability: '__ABILITY__', moves: ['Tackle'] }] }
  });
  truthy(issues.some(i => i.includes('FILL_ME')), issues.join('; '));
  truthy(issues.some(i => i.includes('__ABILITY__')), issues.join('; '));
});

T('5. guard catches placeholder moves', () => {
  const issues = validateChampionsDataPlaceholders({
    bad: { members: [{ name: 'Pikachu', item: '', ability: 'Static', moves: ['PLACEHOLDER_MOVE'] }] }
  });
  truthy(issues.some(i => i.includes('PLACEHOLDER_MOVE')), issues.join('; '));
});

T('6. guard catches malformed shipped member shape', () => {
  const issues = validateChampionsDataPlaceholders({
    bad: { members: [{ item: 'Leftovers', ability: 'Static', moves: [] }] }
  });
  truthy(issues.some(i => i.includes('.name missing')), issues.join('; '));
  truthy(issues.some(i => i.includes('.moves missing or empty')), issues.join('; '));
});

T('7. guard catches an empty shipped catalog', () => {
  const issues = validateChampionsDataPlaceholders({});
  truthy(issues.some(i => i.includes('TEAMS catalog is empty')), issues.join('; '));
});

T('8. real catalog still exposes teams for downstream tests', () => {
  truthy(TEAMS.player && Array.isArray(TEAMS.player.members), 'player team missing');
});

console.log(`\nT9j.18 data guard: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
