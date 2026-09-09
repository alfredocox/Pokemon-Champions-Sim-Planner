const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/db-migrate.yml'), 'utf8');
const block = workflow.split('      - name: Validate migration input')[1].split('      - name: Apply migration')[0];
const script = block.split('        run: |')[1].split(/\r?\n/).map(line => line.replace(/^          /, '')).join('\n');
assert(!script.includes('${{'), 'No workflow expressions may enter shell script text');
const bash = process.env.BASH_EXE || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
const fixtures = [
  ['2026_05_12_align_reg_ma_meta_sources.sql', true],
  ['../outside.sql', false], ['/tmp/outside.sql', false], ['-bad.sql', false],
  ['missing.sql', false], ['x.sql\npath=other', false], ['x.sql"; echo INJECTED; #', false],
  ['$(echo INJECTED).sql', false], ['`echo INJECTED`.sql', false], ['x.sql;echo INJECTED', false],
  ['folder/file.sql', false], ['', false]
];
for (const [filename, valid] of fixtures) {
  const result = spawnSync(bash, ['-c', script], { cwd: root, encoding: 'utf8', env: { ...process.env, MIGRATION_FILENAME: filename, GITHUB_OUTPUT: '/dev/null' } });
  if (result.error) throw result.error;
  assert.equal(result.status === 0, valid, JSON.stringify(filename) + ': ' + result.stderr);
  assert(!result.stdout.includes('INJECTED'));
}
console.log('PASS migration input: valid existing SQL accepted; 11 invalid/injection cases rejected without execution');
