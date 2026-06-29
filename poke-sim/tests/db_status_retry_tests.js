const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const adapter = fs.readFileSync(path.join(ROOT, 'supabase_adapter.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); pass++; console.log('  PASS ' + name); }
  catch (err) { fail++; console.error('  FAIL ' + name + ': ' + err.message); }
}
function truthy(value, msg) { if (!value) throw new Error(msg); }

console.log('\n=== DB status retry tests ===\n');

T('1. app shell keeps visible DB chip but UI owns clearer states', () => {
  truthy(html.includes('id="db-offline-chip"'), 'DB chip element missing');
  truthy(ui.includes("connected: { text: '[DB connected]'"), 'connected chip state missing');
  truthy(ui.includes("retrying: { text: '[DB retrying]'"), 'retrying chip state missing');
  truthy(ui.includes("fallback: { text: '[Bundled roster]'"), 'bundled fallback chip state missing');
  truthy(ui.includes("disabled: { text: '[Local roster]'"), 'local roster chip state missing');
  truthy(ui.includes("chip.setAttribute('data-db-state'"), 'DB state data attribute missing');
});

T('2. UI retries live DB before bundled fallback', () => {
  truthy(ui.includes('async function csLoadTeamsFromDbWithRetry'), 'DB retry helper missing');
  truthy(ui.includes('attempts: 2'), 'DOMContentLoaded should request two DB attempts');
  truthy(ui.includes('await _adapter.loadTeamsFromDB()'), 'retry helper should call adapter loadTeamsFromDB');
  truthy(ui.includes("setDbChip('retrying'"), 'retrying chip update missing');
  truthy(ui.includes("setDbChip('fallback'"), 'fallback chip update missing');
});

T('3. Supabase adapter records last team-load status for diagnostics', () => {
  truthy(adapter.includes('lastTeamLoadStatus'), 'last team-load status storage missing');
  truthy(adapter.includes('function setLastTeamLoadStatus'), 'status setter missing');
  truthy(adapter.includes('function getLastTeamLoadStatus'), 'status getter missing');
  truthy(adapter.includes('getLastTeamLoadStatus,'), 'status getter should be exported');
  truthy(adapter.includes("state: teamCount ? 'connected' : 'empty'"), 'connected/empty status should be recorded');
  truthy(adapter.includes("state: 'error'"), 'error status should be recorded');
});

console.log(`\nDB status retry: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
