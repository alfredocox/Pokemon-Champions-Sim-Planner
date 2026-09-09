import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
export const PIN = '0.11.11';
export const OUTPUT = path.join(root, 'generated/champions_move_pools.js');
const sha = value => createHash('sha256').update(value).digest('hex');
const readSource = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort(compare).map(key => [key, stable(value[key])]));
}

function hashTree(directory) {
  const entries = [];
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.endsWith('.js')) {
        entries.push([path.relative(directory, file).split(path.sep).join('/'), sha(readSource(file))]);
      }
    }
  }
  visit(directory);
  return sha(JSON.stringify(entries.sort((a, b) => compare(a[0], b[0]))));
}

export function loadInputs() {
  const installed = require('pokemon-showdown/package.json');
  if (installed.version !== PIN) throw new Error(`Expected pokemon-showdown ${PIN}, found ${installed.version}`);
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages?.['node_modules/pokemon-showdown'];
  if (locked?.version !== PIN || !locked.integrity) throw new Error('Missing or mismatched pinned Showdown lock identity');
  const packageRoot = path.dirname(require.resolve('pokemon-showdown/package.json'));
  const sourceHashes = {
    generator_sha256: sha(readSource(fileURLToPath(import.meta.url))),
    mirrored_species_input_sha256: sha(readSource(path.join(root, 'generated/pokemon_showdown_legal_data.js'))),
    reference_data_tree_sha256: hashTree(path.join(packageRoot, 'dist/data')),
    reference_sim_tree_sha256: hashTree(path.join(packageRoot, 'dist/sim'))
  };
  const { Dex } = require('pokemon-showdown');
  return {
    baseline: require('../generated/pokemon_showdown_legal_data.js'),
    dex: Dex.mod('champions'),
    reference: { package: installed.name, version: installed.version, integrity: locked.integrity },
    sourceHashes
  };
}

export function buildMovePools({ baseline, dex, reference, sourceHashes }) {
  if (reference?.version !== PIN) throw new Error(`Expected pokemon-showdown ${PIN}`);
  if (dex?.currentMod !== 'champions') throw new Error('Expected Champions dex');
  if (!baseline?.species || !Object.keys(baseline.species).length) throw new Error('Explicit mirrored species inventory required');
  const groups = new Map();
  for (const key of Object.keys(baseline.species).sort(compare)) {
    const row = baseline.species[key];
    if (!row || typeof row !== 'object') throw new Error(`Invalid species row: ${key}`);
    const id = dex.toID(row.id || key);
    if (!id) throw new Error(`Missing species identity: ${key}`);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(key);
  }
  const species = {};
  for (const id of [...groups.keys()].sort(compare)) {
    const entry = { status: 'unavailable', moves: [], inherited_from: [], source_keys: groups.get(id) };
    species[id] = entry;
    const exact = dex.species.get(id);
    if (!exact.exists || exact.id !== id) {
      entry.reason = exact.exists ? 'reference_identity_mismatch' : 'unknown_reference_species';
      continue;
    }
    entry.reference_species_id = exact.id;
    try {
      const chain = dex.species.getFullLearnset(id);
      if (!chain.length) {
        entry.reason = 'missing_full_reference_learnset';
        continue;
      }
      entry.inherited_from = [...new Set(chain.map(row => row.species.id))];
      entry.source_sha256 = sha(JSON.stringify(stable(chain.map(row => ({
        species_id: row.species.id, learnset: row.learnset
      })))));
      entry.moves = [...dex.species.getMovePool(id)].sort(compare);
      entry.status = 'known';
    } catch (error) {
      entry.reason = 'reference_learnset_error';
      entry.detail = String(error.message);
    }
  }
  return {
    schema_version: 'champions-inherited-move-pools-v1',
    mod: 'champions',
    scope: 'Pinned inherited move-pool reference; not regulation eligibility or move-combination approval',
    competitive_use: false,
    reference,
    source_hashes: sourceHashes,
    hash_policy: 'SHA-256 of UTF-8/LF inputs; tree hashes cover sorted relative .js paths and content hashes; output excluded',
    counts: {
      input_rows: Object.keys(baseline.species).length,
      species: groups.size,
      known: Object.values(species).filter(row => row.status === 'known').length,
      unavailable: Object.values(species).filter(row => row.status === 'unavailable').length
    },
    species
  };
}

export function renderMovePools(payload) {
  return '(function(root){\n  var payload = ' + JSON.stringify(stable(payload)) + ';\n' +
    '  root.ChampionsSim = root.ChampionsSim || {};\n' +
    '  root.ChampionsSim.championsMovePools = payload;\n' +
    '  if (typeof module !== "undefined" && module.exports) module.exports = payload;\n' +
    '})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));\n';
}

export function checkArtifact(body, file = OUTPUT) {
  if (!fs.existsSync(file) || readSource(file) !== body) throw new Error('Champions move-pool artifact is missing or stale; run node tools/generate-champions-move-pools.mjs');
}

export function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node tools/generate-champions-move-pools.mjs [--check]');
  const payload = buildMovePools(loadInputs());
  const body = renderMovePools(payload);
  if (args[0] === '--check') checkArtifact(body);
  else fs.writeFileSync(OUTPUT, body, 'utf8');
  console.log(`${args[0] === '--check' ? 'Verified' : 'Generated'} Champions move pools: ${payload.counts.known} known, ${payload.counts.unavailable} unavailable (${payload.counts.input_rows} input rows)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
