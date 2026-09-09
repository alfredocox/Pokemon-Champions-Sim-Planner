import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hardening = fileURLToPath(new URL('./db_m9_hardening_tests.js', import.meta.url));
function run(mode) {
  return spawnSync(process.execPath, [hardening], {
    env: { ...process.env, RUN_LIVE_DB: mode }, encoding: 'utf8', timeout: 30000,
  });
}

test('offline hardening reports administrative checks as not verified, not passed', () => {
  const result = run('0');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /8 passed, 0 failed, 3 not verified; 11 total/);
  for (const id of [3, 6, 7]) assert.match(result.stdout, new RegExp('SKIP T-hard-' + id));
});

test('requesting live verification fails closed instead of substituting local checks', () => {
  const result = run('1');
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /8 passed, 3 failed, 0 not verified; 11 total/);
  assert.equal((result.stdout.match(/Live verification not implemented:/g) || []).length, 3);
});

test('administrative readback is read-only and inspects effective permissions', () => {
  const sql = readFileSync(new URL('../db/diagnostics/security_readback.sql', import.meta.url), 'utf8');
  assert.match(sql, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(sql, /ROLLBACK;/);
  for (const marker of ['has_table_privilege', 'has_column_privilege', 'has_sequence_privilege', 'has_function_privilege', 'pg_policies', 'ON_ERROR_STOP=1',
    'pg_default_acl', 'rolbypassrls', 'schema_migrations', 'relrowsecurity']) {
    assert.ok(sql.includes(marker), marker);
  }
  assert.doesNotMatch(sql, /pg_get_functiondef|rolpassword|SELECT\s+\*\s+FROM\s+auth\.users/i);
});

test('ordinary permissive policy and grant mutations fail the local bootstrap contract', () => {
  const rlsPath = fileURLToPath(new URL('../db/rls_policies_v1.sql', import.meta.url));
  for (const suffix of [
    '\nCREATE POLICY extra ON analyses TO authenticated USING (true) WITH CHECK (true);',
    '\nCREATE POLICY extra ON analyses FOR INSERT TO anon WITH CHECK (true);',
    '\nGRANT INSERT ON analyses TO authenticated;',
  ]) {
    // Substitute only the local SQL read in a child process; never edit repo files.
    const script = `const fs=require('node:fs');const path=require('node:path');
      const original=fs.readFileSync;
      fs.readFileSync=function(file,...args){const data=original.call(this,file,...args);
        return typeof file==='string' && path.resolve(file)===${JSON.stringify(rlsPath)}
          ? data+${JSON.stringify(suffix)} : data;};require(${JSON.stringify(hardening)});`;
    const result = spawnSync(process.execPath, ['-e', script], {
      env: { ...process.env, RUN_LIVE_DB: '0' }, encoding: 'utf8', timeout: 30000,
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /FAIL: T-hard-4/);
  }
});
