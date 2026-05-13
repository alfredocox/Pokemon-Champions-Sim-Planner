// Service worker local credential cache guard.
'use strict';

const fs = require('fs');
const path = require('path');

const swPath = path.resolve(__dirname, '..', 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass++;
    console.log('  PASS', name);
  } catch (err) {
    fail++;
    console.log('  FAIL', name, '-', err.message);
  }
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== service worker local credential tests ===\n');

T('1. local-credentials.js has an explicit fetch branch', () => {
  truthy(sw.includes('/local-credentials.js'), 'missing local credentials branch');
});

T('2. local-credentials.js is fetched with no-store', () => {
  truthy(/local-credentials\.js[\s\S]*fetch\(event\.request,\s*\{\s*cache:\s*'no-store'\s*\}/.test(sw),
    'local credentials must bypass HTTP/SW cache');
});

T('3. missing local-credentials.js returns empty JavaScript instead of cached app fallback', () => {
  truthy(/local-credentials\.js[\s\S]*new Response\('',\s*\{[\s\S]*status:\s*200[\s\S]*application\/javascript/.test(sw),
    'missing local credentials should return empty JS response');
});

console.log(`\nsw local credentials: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
