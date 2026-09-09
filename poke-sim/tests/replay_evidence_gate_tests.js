'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const coach = require(path.join(root, 'replay_coach.js'));
const sample = fs.readFileSync(path.join(root, 'tests/fixtures/showdown_replay_sample.txt'), 'utf8');

for (const raw of ['', 'Ordinary prose, not a replay.', '|player|p1|Alice\n|win|Alice',
  '|turn|1', '|turn|1\n|c|Alice|hello', '|turn|1\n|move', '|turn|1\n|-weather',
  '|turn|1\n|move|nobody|Protect', '|turn|1\n|-boost|p1a: A|atk',
  '|turn|0\n|move|p1a: A|Protect|p1a: A']) {
  assert.throws(() => coach.analyzeShowdownReplay(raw), /No battle events/);
}
console.log('PASS: no coaching for prose, metadata, chat, or empty turns');
assert.ok(coach.analyzeShowdownReplay(sample).review.summary);
const partial = '|turn|1\n|move|p1a: Incineroar|Protect|p1a: Incineroar';
assert.ok(coach.analyzeShowdownReplay(partial).review.summary);
console.log('PASS: full and partial observed battles remain reviewable');

const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const start = ui.indexOf('function csInitReplayCoachUi() {');
const end = ui.indexOf('\nfunction ', start + 1);
assert.ok(start >= 0 && end > start);
const nodes = {};
function node(id) {
  return nodes[id] ||= { value: '', innerHTML: '', textContent: '', disabled: false,
    classList: { toggle() {} }, listeners: {},
    addEventListener(event, fn) { this.listeners[event] = fn; } };
}
['replay-coach-log','replay-coach-side','replay-coach-run-btn','replay-coach-status',
 'replay-coach-results','replay-coach-save-import-btn','replay-coach-export-scenario-btn',
 'replay-coach-upload-btn','replay-coach-file','replay-coach-reference-team',
 'replay-coach-full-roster','replay-coach-clear-btn']
  .forEach(node);
const ctx = {
  document: { getElementById: id => nodes[id] || null },
  ChampionsSim: { replayCoach: coach }, CS_LAST_REPLAY_IMPORT_PAYLOAD: null,
  CS_LAST_REPLAY_IMPORT_SOURCE_FILE: '', CS_LAST_REPLAY_SCENARIO_QUEUE: [],
  CS_LAST_REPLAY_SCENARIO_CONTEXT: null,
  csPopulateReplayReferenceTeamSelect() {}, csSelectedReplayReferenceTeam() { return null; },
  csExportTopReplayScenarioPayload() {},
  csBuildBattleSenseiSimPlan() { return null; }, csReplayImportStatusText() { return ''; },
  csBuildReplayPrivateImportPreview(raw) { return { ok: true, import_row: { source_hash: require('node:crypto').createHash('sha256').update(raw).digest('hex') } }; },
  FileReader: class {
    readAsText(file) { this.result = file.raw; this.onload(); }
  },
  csReplayCoachRenderAnalysis(analysis) {
    node('replay-coach-results').innerHTML = 'review generated';
    ctx.CS_LAST_REPLAY_SCENARIO_CONTEXT = analysis;
    ctx.CS_LAST_REPLAY_SCENARIO_QUEUE = ['fixture'];
  },
  csUpdateReplayImportSaveButton() {
    node('replay-coach-save-import-btn').disabled = !ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD;
  },
  csUpdateReplayScenarioExportButton() {
    node('replay-coach-export-scenario-btn').disabled = !ctx.CS_LAST_REPLAY_SCENARIO_QUEUE.length;
  }
};
vm.createContext(ctx);
vm.runInContext(ui.slice(start, end), ctx);
ctx.csInitReplayCoachUi();
node('replay-coach-log').value = sample;
node('replay-coach-run-btn').listeners.click();
assert.equal(node('replay-coach-results').innerHTML, 'review generated');
assert.equal(node('replay-coach-save-import-btn').disabled, false);
node('replay-coach-log').value = 'not a replay';
node('replay-coach-log').listeners.input();
assert.equal(node('replay-coach-status').textContent, '');
assert.equal(ctx.CS_LAST_REPLAY_SCENARIO_CONTEXT, null);
assert.equal(node('replay-coach-save-import-btn').disabled, true);
assert.equal(node('replay-coach-export-scenario-btn').disabled, true);
assert.ok(!node('replay-coach-results').innerHTML.includes('review generated'));
node('replay-coach-run-btn').listeners.click();
assert.match(node('replay-coach-status').textContent, /No battle events/);
assert.equal(node('replay-coach-save-import-btn').disabled, true);
node('replay-coach-log').value = '';
node('replay-coach-run-btn').listeners.click();
assert.match(node('replay-coach-status').textContent, /Paste a Showdown log/);
console.log('PASS: edited, invalid and empty input cannot reuse old review actions');
node('replay-coach-reference-team').listeners.change();
assert.equal(ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD, null);
assert.equal(node('replay-coach-save-import-btn').disabled, true);
node('replay-coach-save-import-btn').listeners.click();
assert.match(node('replay-coach-status').textContent, /Analyze the current replay/);

node('replay-coach-log').value = sample;
node('replay-coach-run-btn').listeners.click();
node('replay-coach-file').files = [{name: 'bad.log', raw: 'ordinary prose'}];
node('replay-coach-file').listeners.change();
assert.equal(ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD, null);
assert.equal(ctx.CS_LAST_REPLAY_SCENARIO_CONTEXT, null);
assert.match(node('replay-coach-results').innerHTML, /Analysis pending/);
assert.equal(node('replay-coach-save-import-btn').disabled, true);
node('replay-coach-run-btn').listeners.click();
assert.match(node('replay-coach-status').textContent, /No battle events/);

const html = '<html><script type="text/plain" class="battle-log-data">' + sample + '</script></html>';
node('replay-coach-file').files = [{name: 'original.html', type: 'text/html', raw: html}];
node('replay-coach-file').listeners.change();
assert.notEqual(node('replay-coach-log').value, html);
node('replay-coach-run-btn').listeners.click();
const originalHash = ctx.csBuildReplayPrivateImportPreview(html).import_row.source_hash;
assert.equal(ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD.import_row.source_hash, originalHash);
node('replay-coach-reference-team').listeners.change();
assert.equal(node('replay-coach-save-import-btn').disabled, true);
node('replay-coach-run-btn').listeners.click();
assert.equal(ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD.import_row.source_hash, originalHash);
node('replay-coach-log').value = partial;
node('replay-coach-log').listeners.input();
node('replay-coach-run-btn').listeners.click();
assert.notEqual(ctx.CS_LAST_REPLAY_IMPORT_PAYLOAD.import_row.source_hash, originalHash);
assert.equal(ctx.CS_LAST_REPLAY_IMPORT_SOURCE_FILE, 'manual-replay-input.log');
console.log('PASS: upload/reference changes invalidate evidence and unchanged HTML preserves provenance');
