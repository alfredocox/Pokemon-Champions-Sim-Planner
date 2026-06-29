const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SIM = path.join(REPO, 'poke-sim');
const gitignore = fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8');
const pagesWorkflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'pages.yml'), 'utf8');

const runtimeFiles = [
  'index.html',
  'pokemon-champion-2026.html',
  'release_manifest.js',
  'sw.js',
  'supabase_adapter.js',
  'generated/release_artifact.json',
  'generated/source_sync_status.js',
].map((file) => path.join(SIM, file));

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass++;
    console.log('  PASS ' + name);
  } catch (err) {
    fail++;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}
function truthy(value, msg) {
  if (!value) throw new Error(msg);
}
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

console.log('\n=== public launch security guard tests ===\n');

T('1. local credentials and env files stay ignored', () => {
  truthy(gitignore.includes('poke-sim/local-credentials.js'), 'local credentials file must be ignored');
  truthy(gitignore.includes('.env'), 'env files must be ignored');
  truthy(gitignore.includes('.env.local'), 'local env files must be ignored');
});

T('2. Pages deploy uses anon/public Supabase config only', () => {
  truthy(pagesWorkflow.includes('SUPABASE_ANON_KEY'), 'Pages deploy should use anon key secret for browser runtime');
  truthy(!/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_WRITE_KEY|SUPABASE_DB_URL/.test(pagesWorkflow),
    'Pages deploy must never expose service-role/write/database secrets');
  truthy(pagesWorkflow.includes('Generate deployed Pages artifact SHA manifest'),
    'Pages deploy should produce post-injection artifact proof');
});

T('3. committed browser runtime does not contain privileged secret names', () => {
  const privileged = /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_WRITE_KEY|SUPABASE_DB_URL|SERVICE_ROLE/i;
  const offenders = runtimeFiles
    .filter((file) => fs.existsSync(file))
    .filter((file) => privileged.test(read(file)))
    .map((file) => path.relative(REPO, file));
  truthy(offenders.length === 0, 'privileged secret names leaked into browser runtime: ' + offenders.join(', '));
});

T('4. committed app shell keeps Supabase credentials empty before deploy injection', () => {
  const index = read(path.join(SIM, 'index.html'));
  const bundle = read(path.join(SIM, 'pokemon-champion-2026.html'));
  const emptyUrl = /window\.__SUPABASE_URL__\s*=\s*window\.__SUPABASE_URL__\s*\|\|\s*'';/;
  const emptyKey = /window\.__SUPABASE_KEY__\s*=\s*window\.__SUPABASE_KEY__\s*\|\|\s*'';/;
  truthy(emptyUrl.test(index),
    'source index should keep Supabase URL placeholder empty');
  truthy(emptyKey.test(index),
    'source index should keep Supabase key placeholder empty');
  truthy(emptyUrl.test(bundle),
    'committed bundle should keep Supabase URL placeholder empty');
  truthy(emptyKey.test(bundle),
    'committed bundle should keep Supabase key placeholder empty');
});

T('5. public runtime has no private key material', () => {
  const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/;
  const offenders = runtimeFiles
    .filter((file) => fs.existsSync(file))
    .filter((file) => privateKey.test(read(file)))
    .map((file) => path.relative(REPO, file));
  truthy(offenders.length === 0, 'private key material leaked into browser runtime: ' + offenders.join(', '));
});

console.log(`\npublic launch security guard: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
