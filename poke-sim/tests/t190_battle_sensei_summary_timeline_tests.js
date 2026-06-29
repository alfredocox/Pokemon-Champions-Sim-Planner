// Issue #190 - Battle Sensei summary and turn timeline stay mobile-safe and raw log is collapsed.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== Battle Sensei summary/timeline UI tests ===\n');

T('1. Review remains a separate tab from Strategy', () => {
  inc(html, 'data-tab="replay-coach">Review');
  inc(html, '<h2 class="section-title">Review Overview</h2>');
  inc(html, '<section class="tab-panel" id="tab-replay-coach">');
  inc(html, '<section class="tab-panel" id="tab-strategy">');
  inc(html, '<script src="replay_learning.js"></script>');
  inc(html, 'id="replay-coach-url"');
  inc(html, 'id="replay-coach-fetch-btn"');
  inc(html, 'id="replay-coach-full-roster"');
  inc(html, 'Know the full 6?');
  inc(html, 'accept=".txt,.log,.html,.htm,text/plain,text/html"');
  inc(html, 'Upload Replay');
  inc(html, 'In series play');
  inc(html, 'v2.2.35-canonical-release-manifest');
  inc(ui, 'v2.2.35-canonical-release-manifest');
  if (/Bo10|data-bo="10"/.test(html)) throw new Error('Bo10 should not be exposed as a series format');
  if (/Bo10/.test(ui)) throw new Error('Bo10 should not be referenced in UI guidance');
  if (/Bo10/.test(engine)) throw new Error('Bo10 should not be referenced in engine guidance');
});

T('2. summary renders selected-four confidence and team preview read', () => {
  inc(ui, '<strong>Bring Confidence</strong>');
  inc(ui, '<h3 class="replay-coach-h3">Team Preview Read</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Lead Logic Read</h3>');
  inc(ui, '<strong>Lead identity</strong>');
  inc(ui, '<strong>Observed synergy</strong>');
  inc(ui, '<strong>Why this lead made sense</strong>');
  inc(ui, '<strong>What it still conceded</strong>');
  inc(ui, '<strong>Opponent Four</strong>');
  inc(ui, '<strong>Roster Evidence</strong>');
  inc(ui, '<strong>Bring Scope</strong>');
  inc(ui, '<strong>Limit</strong>');
  inc(ui, 'bringChoiceReviewable');
  inc(ui, 'selectedFourConfidence');
  inc(ui, 'manualTeamPreview: rosterEl ? rosterEl.value :');
});

T('3. timeline renders coaching read, better line, severity, and confidence', () => {
  inc(ui, 'review.turnTimeline');
  inc(ui, 'replay-coach-turn-read');
  inc(ui, 'replay-coach-better-line');
  inc(ui, "turn.severity || 'neutral'");
  inc(ui, "turn.confidence || 'medium'");
});

T('4. coaching tags explain decision impact, not just labels', () => {
  inc(ui, '<b>What happened:</b>');
  inc(ui, '<b>Why it mattered:</b>');
  inc(ui, '<b>Do instead:</b>');
  inc(ui, 'Confidence:');
  inc(ui, 'Evidence:');
});

T('5. learning report renders scorecard, critical turns, win path, and practice plan', () => {
  inc(ui, 'learningReport');
  inc(ui, '<h3 class="replay-coach-h3">What You Did Well</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Advanced Plays Recognized</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Tighten Up Next</h3>');
  inc(ui, '<b>Supported by log:</b>');
  inc(ui, '<b>Observed:</b>');
  inc(ui, '<b>Next rep:</b>');
  inc(ui, '<h3 class="replay-coach-h3">Battle IQ Score</h3>');
  inc(ui, '<strong>Battle IQ</strong>');
  inc(ui, "battleIq && battleIq.displayScore != null ? String(battleIq.displayScore) : 'Needs more data'");
  inc(ui, '<strong>What this means</strong>');
  inc(ui, '<h3 class="replay-coach-h3">Evidence Standard</h3>');
  inc(ui, '<strong>Opponent intent boundary</strong>');
  inc(ui, '<h3 class="replay-coach-h3">Critical Turn Engine</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Decision Quality Scorecard</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Win Path + Opponent Plan</h3>');
  inc(ui, '<strong>Opponent plan evidence</strong>');
  inc(ui, '<h3 class="replay-coach-h3">Sim Comparison</h3>');
  inc(ui, '<strong>BO3 swap options</strong>');
  inc(ui, '<strong>Series format</strong>');
  inc(ui, '<strong>Lineup matrix</strong>');
  inc(ui, '<strong>Series lineup context</strong>');
  inc(ui, '<h3 class="replay-coach-h3">Sim Feedback Packet</h3>');
  inc(ui, 'Single replay signals do not automatically rewrite sim models.');
  inc(ui, 'Scenario queue');
  inc(ui, '<strong>Diagnosis boundary</strong>');
  inc(ui, 'csBuildBattleSenseiSimPlan');
  inc(ui, 'latest in-app simulation strategy report');
  inc(ui, 'api.buildReplayCoachReview(parsed, opts)');
  inc(ui, '<h3 class="replay-coach-h3">Practice Plan</h3>');
  inc(ui, '<h3 class="replay-coach-h3">Battle IQ Memory Preview</h3>');
  inc(ui, 'Privacy boundary');
});

T('6. raw log preview is collapsed and hidden by default', () => {
  inc(ui, '<details class="replay-coach-raw"><summary>Raw log preview hidden by default');
  inc(ui, 'rawLogPreview');
  inc(css, '.replay-coach-raw-log{margin-top:10px;white-space:pre-wrap;max-height:260px}');
  inc(ui, "api.fetchReplayLog(rawUrl)");
  inc(ui, "Loaded replay URL into the log box. Run analysis when ready.");
});

T('7. timeline styles stay card-based and mobile-safe', () => {
  inc(css, '.replay-coach-turn.high');
  inc(css, '.replay-coach-turn.medium');
  inc(css, '.replay-coach-turn.low');
  inc(css, '@media(max-width:900px){.replay-coach-grid{grid-template-columns:1fr}');
  inc(css, '.replay-coach-summary-grid{grid-template-columns:1fr}');
});

console.log(`\nBattle Sensei summary/timeline UI: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
