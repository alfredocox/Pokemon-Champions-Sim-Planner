'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const adapter = fs.readFileSync(path.join(ROOT, 'supabase_adapter.js'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS ' + name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}
function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}

console.log('\n=== sim evidence adapter tests ===\n');

T('1. Supabase adapter exposes Team Lab evidence service methods', () => {
  [
    'createSimJob',
    'updateSimJobStatus',
    'saveReplayRecord',
    'listSimJobs',
    'listReplays'
  ].forEach((name) => truthy(adapter.includes(name), `${name} missing`));
});

T('2. adapter targets namespaced Team Lab evidence tables only', () => {
  truthy(adapter.includes("TEAM_LAB_SIM_JOBS_TABLE = 'team_lab_sim_jobs'"), 'sim job table constant missing');
  truthy(adapter.includes("TEAM_LAB_REPLAYS_TABLE = 'team_lab_replays'"), 'replay table constant missing');
  truthy(!adapter.includes(".from('sim_jobs')"), 'must not use generic sim_jobs table');
  truthy(!adapter.includes(".from('replays')"), 'must not use generic replays table');
});

T('3. write paths use explicit insert/update calls and surface trusted-writer policy', () => {
  truthy(adapter.includes('.insert(job)'), 'sim job insert missing');
  truthy(adapter.includes('.update(patch)'), 'sim job status update missing');
  truthy(adapter.includes('.insert(replay)'), 'replay insert missing');
  truthy(adapter.includes('trusted_writer_required'), 'trusted writer failure reason missing');
  truthy(adapter.includes('browser anon clients must remain read-only under RLS'), 'RLS read-only warning missing');
});

T('4. read paths support versioned evidence filters', () => {
  [
    'regulation_id',
    'format',
    'engine_version',
    'ruleset_version',
    'job_id',
    'sim_run_id',
    'team_a_id',
    'team_b_id',
    'status',
    'job_type'
  ].forEach((field) => truthy(adapter.includes(`'${field}'`), `${field} filter missing`));
});

T('5. adapter does not embed service-role credentials', () => {
  truthy(!/SUPABASE_SERVICE/i.test(adapter), 'browser adapter must not use service secret env names');
  truthy(!/service[_-]?role\\s*[:=]/i.test(adapter), 'browser adapter must not define service-role values');
  truthy(!/createClient\([^)]*service[_-]?role/i.test(adapter), 'browser adapter must not create clients with service-role material');
});

console.log(`\nsim evidence adapter: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
