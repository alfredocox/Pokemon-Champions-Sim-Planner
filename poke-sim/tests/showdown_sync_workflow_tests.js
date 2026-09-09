'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const workflowPath = path.join(ROOT, '..', '.github', 'workflows', 'showdown-sync.yml');

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass += 1;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail += 1;
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== Showdown sync workflow tests ===\n');

T('1. workflow runs daily and supports manual dispatch', () => {
  const yaml = fs.readFileSync(workflowPath, 'utf8');
  truthy(yaml.includes("cron: '30 13 * * *'"), 'daily schedule missing');
  truthy(yaml.includes('workflow_dispatch:'), 'manual dispatch missing');
});

T('2. workflow evaluates change summary before any Supabase write', () => {
  const yaml = fs.readFileSync(workflowPath, 'utf8');
  truthy(yaml.includes('Evaluate Showdown changes'), 'change evaluation step missing');
  truthy(yaml.includes('change_check.outputs.has_changes == \'true\''), 'write gate missing');
  truthy(yaml.includes('Skip DB writes when nothing changed'), 'skip step missing');
  truthy(yaml.includes('change_summary.json'), 'change summary artifact missing');
});

T('3. approval and approval-triggered refetch are unavailable', () => {
  const yaml = fs.readFileSync(workflowPath, 'utf8');
  truthy(!/^\s+approve:/m.test(yaml), 'approval dispatch input must not exist');
  truthy(!yaml.includes('github.event.inputs.approve'), 'approval dispatch conditions must not exist');
  truthy(!yaml.includes('--approve'), 'workflow cannot invoke approval');
  truthy(!yaml.includes('Write approved Showdown rows'), 'approved write step must not exist');
  truthy(yaml.includes('exact reviewed sync-run ID and SHA-256 digest'), 'missing promotion limitation');
});

T('4. fetch, dry run and manual unapproved staging remain available', () => {
  const yaml = fs.readFileSync(workflowPath, 'utf8');
  truthy(yaml.includes('Fetch upstream Showdown data'), 'fetch step missing');
  truthy(yaml.includes('npm run showdown:write-db -- --dry-run'), 'staging dry run missing');
  truthy(yaml.includes('Write unapproved Showdown rows to Supabase'), 'staging step missing');
  truthy(yaml.includes('github.event_name == \'workflow_dispatch\' && github.event.inputs.write_db == \'true\''), 'manual staging gate missing');
  truthy(!yaml.includes('github.event_name == \'schedule\' ||'), 'scheduled sync must not write rows');
  truthy(yaml.includes('npm run showdown:write-db -- --sync-run-id "showdown_${GITHUB_RUN_ID}"'), 'staging writer missing');
});

console.log('\nShowdown sync workflow:', pass + ' pass, ' + fail + ' fail\n');
if (fail > 0) process.exit(1);
