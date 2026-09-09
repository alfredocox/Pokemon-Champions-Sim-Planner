const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const builder = fs.readFileSync(path.join(ROOT, 'tools', 'build-bundle.py'), 'utf8');
const scriptSources = indexHtml
  .split(/\r?\n/)
  .map((line) => {
    const match = line.match(/<script src="([^"]+)"/);
    return match ? match[1] : null;
  })
  .filter(Boolean);

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== bundle load order tests ===\n');

T('1. source HTML loads legality/support/replay scripts in order', () => {
  const order = [
    'generated/pokemon_showdown_legal_data.js',
    'generated/champions_move_pools.js',
    'generated/pokemon_showdown_species_weights.js',
    'runtime_data.js',
    'rulesets.js',
    'regmb_source_conversion.js',
    'move_legality.js',
    'move_support.js',
    'replay_coach.js',
    'replay_learning.js',
    'legality.js',
    'ui.js'
  ];
  let last = -1;
  for (const token of order) {
    const idx = scriptSources.findIndex((src) => src === token);
    truthy(idx >= 0, 'missing ' + token);
    truthy(idx > last, token + ' out of order');
    last = idx;
  }
});

T('2. bundle builder inlines legality/support/replay sources', () => {
  [
    "read('generated/pokemon_showdown_legal_data.js')",
    "read('generated/pokemon_showdown_species_weights.js')",
    "read('runtime_data.js')",
    "read('rulesets.js')",
    "read('regmb_source_conversion.js')",
    "read('move_legality.js')",
    "read('move_support.js')",
    "read('replay_coach.js')",
    "read('replay_learning.js')"
  ].forEach((token) => truthy(builder.includes(token), 'missing builder read ' + token));
  [
    "sanitize_inline_js(pokemon_legal_data)",
    "sanitize_inline_js(pokemon_weight_data)",
    "sanitize_inline_js(runtime_data)",
    "sanitize_inline_js(rulesets)",
    "sanitize_inline_js(regmb_source_conversion)",
    "sanitize_inline_js(move_legality)",
    "sanitize_inline_js(move_support)",
    "sanitize_inline_js(replay_coach)",
    "sanitize_inline_js(replay_learning)"
  ].forEach((token) => truthy(builder.includes(token), 'missing bundle inline ' + token));
});

T('3. Champions pools stay a separately cached asset before bundled consumers', () => {
  const bundle = fs.readFileSync(path.join(ROOT, 'pokemon-champion-2026.html'), 'utf8');
  const tag = '<script src="generated/champions_move_pools.js"></script>';
  truthy(bundle.includes(tag), 'missing external pinned data asset');
  truthy(bundle.indexOf(tag) < bundle.indexOf('function resolveLearnsetPool('), 'pool asset must load before consumer');
  truthy(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("'./generated/champions_move_pools.js'"), 'pool asset must be cached');
});
console.log(`\nbundle load order: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
