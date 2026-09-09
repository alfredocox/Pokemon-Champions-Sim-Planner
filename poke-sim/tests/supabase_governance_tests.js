'use strict';

const fs = require('fs');
const path = require('path');

const SIM = path.resolve(__dirname, '..');
const REPO = path.resolve(SIM, '..');
const read = (file) => fs.readFileSync(file, 'utf8');
const migration = read(path.join(SIM, 'db', 'migrations', '2026_08_29_public_data_integrity_hardening.sql'));
const adapter = read(path.join(SIM, 'supabase_adapter.js'));
const showdownWorkflow = read(path.join(REPO, '.github', 'workflows', 'showdown-sync.yml'));
const migrationWorkflow = read(path.join(REPO, '.github', 'workflows', 'db-migrate.yml'));
const pagesWorkflow = read(path.join(REPO, '.github', 'workflows', 'pages.yml'));

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS', name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL', name, '-', err.message);
  }
}
function has(text, token, message) {
  if (!text.includes(token)) throw new Error(message || ('missing ' + token));
}
function notHas(text, token, message) {
  if (text.includes(token)) throw new Error(message || ('unexpected ' + token));
}

console.log('\n=== Supabase governance tests ===\n');

T('1. public catalog and evidence writes are revoked', () => {
  ['teams', 'team_members', 'analyses', 'analysis_win_conditions', 'analysis_logs', 'branch_coverage_runs']
    .forEach((table) => has(migration, table, 'hardening migration missing ' + table));
  has(migration, 'REVOKE ALL PRIVILEGES', 'least-privilege revoke missing');
  has(migration, 'FROM anon, authenticated', 'browser roles must both be constrained');
});

T('2. runtime team-member grain and override uniqueness are database-enforced', () => {
  has(migration, 'UNIQUE (team_id, slot)', 'team slot uniqueness missing');
  has(migration, 'CHECK (slot BETWEEN 1 AND 6)', 'team slot range missing');
  has(migration, 'uq_champions_overrides_active_field', 'active override uniqueness missing');
});

T('3. adapter matches live schema column names and fails child write errors', () => {
  has(adapter, "slot:       i + 1", 'adapter must write one-based slot');
  notHas(adapter, 'slot_index: i', 'adapter still writes nonexistent slot_index');
  has(adapter, "select('log_index, result", 'analysis log reader must use log_index');
  has(adapter, 'if (deleteResult && deleteResult.error) throw deleteResult.error;', 'member delete errors must fail the save');
  has(adapter, 'if (mErr) throw mErr;', 'member insert errors must fail the save');
});

T('4. scheduled checks do not advance an unpromoted Showdown baseline', () => {
  const gate = "steps.change_check.outputs.has_changes != 'true' || (github.event_name == 'workflow_dispatch' && github.event.inputs.write_db == 'true')";
  has(showdownWorkflow, gate, 'promotion-aware hash baseline gate missing');
  notHas(showdownWorkflow, 'if: always()', 'hash cache must not advance unconditionally');
});

T('5. privileged workflows are scoped and production deploy fails closed', () => {
  has(migrationWorkflow, 'environment: production', 'production environment missing');
  has(migrationWorkflow, 'refs/heads/main', 'main-only migration guard missing');
  has(migrationWorkflow, '--single-transaction', 'transactional psql mode missing');
  has(pagesWorkflow, 'are required for production Pages deploys', 'Pages credential fail-closed guard missing');
  // pages_asset_inventory_tests proves every source-truth suite belongs to this gate.
  has(pagesWorkflow, 'npm run test:fast', 'Pages shared source-truth release gate missing');
});

console.log('\nSupabase governance:', pass + ' pass, ' + fail + ' fail\n');
if (fail) process.exit(1);
