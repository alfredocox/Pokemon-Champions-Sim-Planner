import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { load } from 'cheerio';
import { discoverTests } from '../tools/run-project-gate.mjs';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const pages = read('../.github/workflows/pages.yml');
// These are deliberately literal shell arrays, not arbitrary shell/YAML evaluation.
function literalArray(name) {
  const body = pages.match(new RegExp(`\\b${name}=\\(([\\s\\S]*?)\\)`))?.[1];
  assert.ok(body, `missing ${name} staging list`);
  const paths = body.trim().split(/\s+/);
  assert.ok(paths.every(p => /^[a-zA-Z0-9_./-]+$/.test(p)), 'staging must remain an explicit literal allowlist');
  return paths;
}
const staged = new Set([...literalArray('runtime_files'), ...literalArray('generated_files').map(p => `generated/${p}`)]);
function assertStaged(p) {
  if (p === './') p = 'index.html';
  p = p.replace(/^\.\//, '');
  assert.ok(staged.has(p) || (p.startsWith('assets/') && pages.includes('cp -R poke-sim/assets pages-dist/poke-sim/assets')), `Pages omits runtime asset: ${p}`);
  if (p !== 'local-credentials.js') assert.ok(fs.existsSync(new URL(p, root)), `missing source asset: ${p}`);
}
const $ = load(read('index.html'));
$('script[src],link[rel="stylesheet"],link[rel="manifest"],link[rel="apple-touch-icon"]').each((_, e) => {
  const p = $(e).attr('src') || $(e).attr('href');
  if (p && !/^(?:https?:)?\/\//.test(p)) assertStaged(p);
});
const ctx = vm.createContext({ self: { addEventListener() {} }, importScripts() {} });
vm.runInContext(read('sw.js') + '\nthis.precacheAssets = APP_ASSETS;', ctx);
ctx.precacheAssets.forEach(assertStaged);

const fast = new Set(discoverTests().filter(t => t.lane === 'fast').map(t => t.filename));
const pkg = JSON.parse(read('package.json'));
const sourceSuites = [...pkg.scripts['test:source-truth'].matchAll(/node tests\/([\w.-]+)/g)].map(m => m[1]);
assert.ok(sourceSuites.length > 0, 'source-truth suite discovery must not be empty');
const formerExtraSuites = ['champion_pack_legality_tests.js', 'preloaded_team_legality_tests.js', 't9j11_tests.js', 'bundle_load_order_tests.js'];
for (const file of [...sourceSuites, ...formerExtraSuites]) assert.ok(fast.has(file), `deduplicated suite no longer covered by fast gate: ${file}`);
assert.ok(pages.includes('npm run test:fast'));
assert.ok(!pages.includes('npm run test:source-truth'), 'source-truth suites already run in fast gate');
for (const file of formerExtraSuites) assert.ok(!pages.includes(`node poke-sim/tests/${file}`), `duplicate suite: ${file}`);
assert.ok(pages.includes('node poke-sim/tests/db_m2_seed_tests.js'), 'retain distinct live DB seed gate');
assert.ok(pages.includes('bash poke-sim/tools/check-bundle.sh'), 'retain bundle freshness gate');
console.log(`Pages inventory passed: ${staged.size} explicit staged files; ${sourceSuites.length + formerExtraSuites.length} duplicate test invocations eliminated without losing discovery coverage.`);
