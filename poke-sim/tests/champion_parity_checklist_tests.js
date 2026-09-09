const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'reports', 'champion_parity_100_checklist.md');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (err) { console.log('  FAIL', name, '-', err.message); fail++; }
}
function inc(haystack, needle, msg) {
  if (String(haystack).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== Champion parity checklist tests ===\n');

T('1. checklist defines practical 100 percent gate and current status', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  inc(report, '# Champion Parity 100 Checklist');
  inc(report, 'release gate, not a claim');
  inc(report, 'v2.2.18-stress-lite-summary');
  inc(report, 'v2.2.19-hard-beta-guard');
  inc(report, 'not deployed proof until CI, Pages, and a fresh browser QA Artifact pass');
  inc(report, 'v2.1.37-damage-log-team-catalog');
  inc(report, '56/56');
  inc(report, '123 verified');
  inc(report, '11 baseline');
  inc(report, 'battle_audit_manifest.json');
  inc(report, '0 baseline');
  inc(report, '0 incomplete');
});

T('2. checklist keeps source-truth architecture and open proof gaps visible', () => {
  const report = fs.readFileSync(reportPath, 'utf8');
  inc(report, 'Mechanics live in `engine.js`');
  inc(report, 'Supabase should not be used as the live damage calculator');
  inc(report, 'GitHub Pages `?v=<new-sha>`');
  inc(report, 'single-run log');
  inc(report, 'phone/device-safe Stress Lite QA artifact');
  inc(report, 'QA Artifact');
  inc(report, 'qa_run_type: "stress_lite_qa"');
  inc(report, 'Stress Lite may substitute only for device-safe stress evidence');
  inc(report, 'ready_for_codex: true');
  inc(report, 'next_missing_proof: []');
  inc(report, 'coach_brain_summary.tactical_interpretation');
  inc(report, 'Alfredo Pages deployment remains blocked');
});

console.log(`\nChampion parity checklist: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
