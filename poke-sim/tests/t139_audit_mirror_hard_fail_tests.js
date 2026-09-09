// Issue #139 - audit.js must fail loudly on severe mirror-match skew.

const fs = require('fs');
const path = require('path');

const audit = fs.readFileSync(path.join(__dirname, 'audit.js'), 'utf8');

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg) {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== audit mirror hard-fail tests ===\n');

T('1. audit collects mirror hard-failure rows', () => {
  inc(audit, 'const mirrorFlags = []');
  inc(audit, 'mirrorFlags.push');
});

T('2. audit hard-fails outside 15-85% mirror win-rate bounds', () => {
  inc(audit, 'c.wins / total < 0.15');
  inc(audit, 'c.wins / total > 0.85');
  inc(audit, 'process.exit(1)');
});

T('3. audit still preserves softer >25% off-50% flag text', () => {
  inc(audit, '[FLAG: >25% off 50%]');
});

T('4. audit matrix records mirrorFlags for postmortem analysis', () => {
  inc(audit, 'mirrorFlags,');
});

T('5. audit fails when configured teams are missing or illegal', () => {
  inc(audit, 'configured audit teams are missing');
  inc(audit, 'configured audit teams are illegal');
});

T('6. audit fails on simulation errors or incomplete planned matrix', () => {
  inc(audit, 'totalErrors > 0');
  inc(audit, 'totalBattles !== expectedBattles');
});

console.log(`\naudit mirror hard-fail: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
