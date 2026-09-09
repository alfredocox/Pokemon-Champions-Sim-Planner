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
  truthy(manifest.build_id === 'v2.2.163-mc-evidence-intake', 'build id mismatch');
  truthy(manifest.service_worker_cache === 'champions-sim-v2-2-163-mc-evidence-intake', 'cache id mismatch');
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
  truthy(sw.includes("|| '" + manifest.service_worker_cache + "'"), 'sw fallback must match this release');
  truthy(sw.includes("'./release_manifest.js'"), 'sw should precache release manifest');
  for (const name of ['gengar', 'nidorino']) {
    truthy(sw.includes("'./assets/retro-intro/" + name + ".png'"), 'retro sprite missing from precache');
    const sprite = fs.readFileSync(path.join(ROOT, 'assets', 'retro-intro', name + '.png'));
    truthy(sprite.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'retro sprite must be a PNG');
  }
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

T('6. generator stdout reproduces file bytes, including on Windows', () => {
  const result = require('child_process').spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['tools/build-bundle.py', '--to-stdout'], { cwd: ROOT, maxBuffer: 30 * 1024 * 1024 });
  truthy(result.status === 0, 'generator failed: ' + String(result.stderr || result.error || ''));
  truthy(result.stdout.equals(fs.readFileSync(bundlePath)), 'stdout bytes differ from generated file');
});

T('7. external move pools and intro sprites are bound to release bytes', () => {
  require('../tools/verify-release-assets.cjs').verify(ROOT, artifact);
});

T('8. missing or mismatched external asset identities fail closed', () => {
  const { verify, REQUIRED } = require('../tools/verify-release-assets.cjs');
  const assert = require('node:assert/strict');
  for (const name of REQUIRED) {
    const missing = JSON.parse(JSON.stringify(artifact));
    missing.external_assets = missing.external_assets || {};
    delete missing.external_assets[name];
    assert.throws(() => verify(ROOT, missing), /Missing asset identity/);
    const changed = JSON.parse(JSON.stringify(artifact));
    changed.external_assets = changed.external_assets || {};
    changed.external_assets[name] = { sha256: '0'.repeat(64), bytes: 1 };
    assert.throws(() => verify(ROOT, changed), /asset drift|Missing asset identity/);
  }
});

T('9. changed and missing deployed bytes are rejected', () => {
  const { verify, REQUIRED } = require('../tools/verify-release-assets.cjs');
  const assert = require('node:assert/strict');
  const temp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'champions-assets-'));
  try {
    for (const name of REQUIRED) {
      fs.mkdirSync(path.dirname(path.join(temp, name)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, name), path.join(temp, name));
    }
    verify(temp, artifact);
    for (const name of REQUIRED) {
      const target = path.join(temp, name);
      const original = fs.readFileSync(target);
      const changed = Buffer.from(original);
      changed[0] ^= 1;
      fs.writeFileSync(target, changed);
      assert.throws(() => verify(temp, artifact), /Release asset drift/);
      fs.unlinkSync(target);
      assert.throws(() => verify(temp, artifact), /ENOENT/);
      fs.writeFileSync(target, original);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

T('10. staged assets are verified before Pages upload', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '../.github/workflows/pages.yml'), 'utf8');
  const check = workflow.indexOf('node poke-sim/tools/verify-release-assets.cjs pages-dist/poke-sim');
  truthy(check > 0 && check < workflow.indexOf('uses: actions/upload-pages-artifact'), 'missing pre-upload asset gate');
});

T('11. Windows Git checkout filters preserve hashed move-pool bytes', () => {
  const assert = require('node:assert/strict');
  const temp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'champions-checkout-'));
  const run = (args, input) => {
    const result = require('node:child_process').spawnSync('git', args, { cwd: temp, input, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.status, 0, String(result.stderr));
    return result.stdout;
  };
  try {
    run(['init', '--quiet']);
    fs.copyFileSync(path.join(ROOT, '../.gitattributes'), path.join(temp, '.gitattributes'));
    const bytes = fs.readFileSync(path.join(ROOT, 'generated/champions_move_pools.js'));
    const object = run(['hash-object', '-w', '--stdin'], bytes).toString().trim();
    for (const autocrlf of ['true', 'false', 'input']) {
      const filtered = run(['-c', 'core.autocrlf=' + autocrlf, 'cat-file', '--filters',
        '--path=poke-sim/generated/champions_move_pools.js', object]);
      assert.deepEqual(filtered, bytes, 'checkout changed hashed bytes: ' + autocrlf);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

console.log(`\nrelease manifest: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
