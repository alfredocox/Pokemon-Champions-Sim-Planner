const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifest = require(path.join(ROOT, 'release_manifest.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appShell = fs.readFileSync(path.join(ROOT, 'app_shell.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const buildScript = fs.readFileSync(path.join(ROOT, 'tools', 'build-bundle.py'), 'utf8');
const bundlePath = path.join(ROOT, manifest.bundle_name);
const artifactPath = path.join(ROOT, manifest.artifact_manifest);
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

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
  truthy(manifest.build_id === 'v2.2.52-team-lab-newsroom-hub', 'build id mismatch');
  truthy(manifest.service_worker_cache === 'champions-sim-v184-team-lab-newsroom-hub', 'cache id mismatch');
  truthy(manifest.artifact_manifest === 'generated/release_artifact.json', 'artifact manifest path mismatch');
});

T('2. visible header and app shell fallback mirror manifest build id', () => {
  truthy(html.includes(manifest.build_id), 'index missing manifest build id');
  truthy(appShell.includes(manifest.build_id), 'app shell missing manifest build id fallback');
  truthy(appShell.includes('CHAMPIONS_RELEASE_MANIFEST'), 'app shell should read release manifest');
});

T('3. service worker derives cache from manifest and precaches manifest', () => {
  truthy(sw.includes("importScripts('./release_manifest.js')"), 'sw should import release manifest');
  truthy(sw.includes('RELEASE_MANIFEST.service_worker_cache'), 'sw should derive cache from manifest');
  truthy(sw.includes("'./release_manifest.js'"), 'sw should precache release manifest');
  truthy(sw.includes("'./generated/release_artifact.json'"), 'sw should precache release artifact manifest');
});

T('4. bundle builder inlines release manifest before app runtime', () => {
  truthy(buildScript.includes("release_manifest = read('release_manifest.js')"), 'builder should read manifest');
  truthy(buildScript.includes("app_shell = read('app_shell.js')"), 'builder should read app shell');
  truthy(buildScript.indexOf('sanitize_inline_js(release_manifest)') < buildScript.indexOf('sanitize_inline_js(app_shell)'), 'manifest should inline before app shell');
  truthy(buildScript.indexOf('sanitize_inline_js(app_shell)') < buildScript.indexOf('sanitize_inline_js(data)'), 'app shell should inline before data/runtime');
});

T('5. release artifact records committed bundle sha and mirrors manifest identity', () => {
  const crypto = require('crypto');
  const bundle = fs.readFileSync(bundlePath);
  const actualSha = crypto.createHash('sha256').update(bundle).digest('hex');
  truthy(artifact.schema_version === 'champions-release-artifact-v1', 'artifact schema mismatch');
  truthy(artifact.build_id === manifest.build_id, 'artifact build id should mirror manifest build id');
  truthy(artifact.bundle_name === manifest.bundle_name, 'artifact bundle name should mirror manifest');
  truthy(artifact.pages_path === manifest.pages_path, 'artifact pages path should mirror manifest');
  truthy(artifact.bundle_sha256 === actualSha, 'artifact sha should match committed bundle');
  truthy(artifact.bundle_bytes === bundle.length, 'artifact byte count should match committed bundle');
});

console.log(`\nrelease manifest: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
