const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifest = require(path.join(ROOT, 'release_manifest.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const buildScript = fs.readFileSync(path.join(ROOT, 'tools', 'build-bundle.py'), 'utf8');

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

console.log('\n=== release manifest tests ===\n');

T('1. manifest exposes canonical build and cache identity', () => {
  truthy(manifest.schema_version === 'champions-release-manifest-v1', 'schema mismatch');
  truthy(manifest.build_id === 'v2.2.35-canonical-release-manifest', 'build id mismatch');
  truthy(manifest.service_worker_cache === 'champions-sim-v167-canonical-release-manifest', 'cache id mismatch');
});

T('2. visible header and ui fallback mirror manifest build id', () => {
  truthy(html.includes(manifest.build_id), 'index missing manifest build id');
  truthy(ui.includes(manifest.build_id), 'ui missing manifest build id fallback');
  truthy(ui.includes('CHAMPIONS_RELEASE_MANIFEST'), 'ui should read release manifest');
});

T('3. service worker derives cache from manifest and precaches manifest', () => {
  truthy(sw.includes("importScripts('./release_manifest.js')"), 'sw should import release manifest');
  truthy(sw.includes('RELEASE_MANIFEST.service_worker_cache'), 'sw should derive cache from manifest');
  truthy(sw.includes("'./release_manifest.js'"), 'sw should precache release manifest');
});

T('4. bundle builder inlines release manifest before app runtime', () => {
  truthy(buildScript.includes("release_manifest = read('release_manifest.js')"), 'builder should read manifest');
  truthy(buildScript.indexOf('sanitize_inline_js(release_manifest)') < buildScript.indexOf('sanitize_inline_js(data)'), 'manifest should inline before data/runtime');
});

console.log(`\nrelease manifest: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
