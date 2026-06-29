const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const SIM = path.join(REPO, 'poke-sim');

const index = fs.readFileSync(path.join(SIM, 'index.html'), 'utf8');
const bundle = fs.readFileSync(path.join(SIM, 'pokemon-champion-2026.html'), 'utf8');
const ui = fs.readFileSync(path.join(SIM, 'ui.js'), 'utf8');
const pagesWorkflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'pages.yml'), 'utf8');

const runtimeFiles = [
  'index.html',
  'ui.js',
  'engine.js',
  'supabase_adapter.js',
  'replay_coach.js',
  'replay_learning.js',
  'pokemon-champion-2026.html',
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
function withoutVendoredSupabase(text) {
  return text.replace(/\/\* vendored: @supabase\/supabase-js UMD[\s\S]*?\/\/ Canonical release identity/, '// Canonical release identity');
}

console.log('\n=== public CSP/XSS guard tests ===\n');

T('1. app shell declares a baseline Content Security Policy', () => {
  truthy(index.includes('http-equiv="Content-Security-Policy"'), 'index missing CSP meta tag');
  truthy(bundle.includes('http-equiv="Content-Security-Policy"'), 'bundle missing CSP meta tag');
  const csp = index.match(/Content-Security-Policy" content="([^"]+)"/);
  truthy(csp, 'CSP content missing');
  const policy = csp[1];
  ['default-src', 'script-src', 'style-src', 'font-src', 'img-src', 'connect-src', 'object-src', 'base-uri', 'form-action'].forEach((directive) => {
    truthy(policy.includes(directive), 'CSP missing ' + directive);
  });
  truthy(policy.includes("object-src 'none'"), 'CSP must block plugins/objects');
  truthy(policy.includes("base-uri 'self'"), 'CSP must restrict base URI');
  truthy(policy.includes("form-action 'self'"), 'CSP must restrict form posts');
});

T('2. Pages deploy keeps CSP in the staged artifact', () => {
  truthy(pagesWorkflow.includes('Stage Pages artifact to match local repo layout'), 'Pages staging step missing');
  truthy(!/Content-Security-Policy[\s\S]*replace\(/.test(pagesWorkflow),
    'Pages workflow should not rewrite or strip CSP');
});

T('3. public runtime avoids dynamic code execution', () => {
  const dynamicCode = /\beval\s*\(|new\s+Function\s*\(/;
  const offenders = runtimeFiles
    .filter((file) => fs.existsSync(file))
    .filter((file) => dynamicCode.test(withoutVendoredSupabase(fs.readFileSync(file, 'utf8'))))
    .map((file) => path.relative(REPO, file));
  truthy(offenders.length === 0, 'dynamic code execution found in public runtime: ' + offenders.join(', '));
});

T('4. app-authored markup avoids inline event handler attributes', () => {
  const inlineHandler = /\son[a-z]+\s*=\s*["'`]/i;
  const offenders = runtimeFiles
    .filter((file) => fs.existsSync(file))
    .filter((file) => inlineHandler.test(withoutVendoredSupabase(fs.readFileSync(file, 'utf8'))))
    .map((file) => path.relative(REPO, file));
  truthy(offenders.length === 0, 'inline event handler attribute found in public runtime: ' + offenders.join(', '));
});

T('5. existing public XSS coverage remains in the test suite', () => {
  truthy(fs.existsSync(path.join(SIM, 'tests', 't94_team_grid_xss_tests.js')), 'team grid XSS test missing');
  truthy(fs.existsSync(path.join(SIM, 'tests', 't151_ui_public_xss_tests.js')), 'public UI XSS test missing');
});

T('6. removed inline handlers keep delegated UI behavior wired', () => {
  truthy(ui.includes('function csInitPublicSecurityDelegates()'), 'public security delegate initializer missing');
  truthy(ui.includes("target.getAttribute('data-fallback-src')"), 'sprite fallback delegate should use data-fallback-src');
  truthy(ui.includes("csHandleSpriteError(target)"), 'sprite fallback delegate should call fallback handler');
  truthy(ui.includes("target.closest('.speed-tier-toggle')"), 'speed tier click delegate missing');
  truthy(ui.includes("classList.toggle('open')"), 'speed tier delegate should still toggle open state');
  truthy(!/onerror="csHandleSpriteError/.test(ui), 'sprite fallback must not use inline onerror');
  truthy(!/onclick="this\.nextElementSibling/.test(ui), 'speed tier toggle must not use inline onclick');
});

console.log(`\npublic CSP/XSS guard: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
