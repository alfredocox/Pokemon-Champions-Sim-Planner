#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Dex } = require('pokemon-showdown');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'generated', 'champions_move_overrides.js');
const packageJson = require('pokemon-showdown/package.json');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

if (packageJson.version !== '0.11.11') throw new Error(`Expected pokemon-showdown 0.11.11, found ${packageJson.version}`);

const champions = Dex.mod('champions');
const moves = {};
for (const baseline of Dex.moves.all().filter(move => move.exists).sort((a, b) => a.id.localeCompare(b.id))) {
  const effective = champions.moves.get(baseline.id);
  if (!effective.exists || effective.pp === baseline.pp) continue;
  moves[baseline.id] = {
    baseline_pp: baseline.pp,
    champions_pp: effective.pp
  };
}

const payload = {
  meta: {
    schema_version: 'champions-move-overrides-v1',
    source: 'pokemon-showdown pinned Champions mod',
    package_version: packageJson.version,
    move_count: Object.keys(moves).length,
    moves_sha256: sha256(require.resolve('pokemon-showdown/dist/data/moves.js')),
    champions_scripts_sha256: sha256(require.resolve('pokemon-showdown/dist/data/mods/champions/scripts.js'))
  },
  moves
};

const body = `(function(root){\n  root.ChampionsSim = root.ChampionsSim || {};\n  root.ChampionsSim.championsMoveOverrides = ${JSON.stringify(payload)};\n})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));\n`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body, 'utf8');
console.log(`Wrote ${Object.keys(moves).length} Champions move overrides -> ${out}`);
