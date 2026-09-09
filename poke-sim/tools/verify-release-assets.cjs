'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED = ['generated/champions_move_pools.js',
  'assets/retro-intro/gengar.png', 'assets/retro-intro/nidorino.png'];

function verify(root, artifact) {
  for (const name of REQUIRED) {
    const expected = artifact.external_assets && artifact.external_assets[name];
    if (!expected || !/^[a-f0-9]{64}$/.test(expected.sha256)) {
      throw new Error('Missing asset identity: ' + name);
    }
    const bytes = fs.readFileSync(path.join(root, name));
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (expected.bytes !== bytes.length || expected.sha256 !== digest) {
      throw new Error('Release asset drift: ' + name);
    }
  }
}

module.exports = { verify, REQUIRED };
if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  verify(root, JSON.parse(fs.readFileSync(path.join(root, 'generated/release_artifact.json'), 'utf8')));
  console.log('Required external release asset hashes verified.');
}
