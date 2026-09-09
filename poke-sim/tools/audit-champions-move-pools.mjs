import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { referenceIdentity, resolveFormat } from './showdown-reference.mjs';
const require = createRequire(import.meta.url);
const { Dex, TeamValidator } = require('pokemon-showdown');
const root = new URL('../', import.meta.url);
const sha = value => createHash('sha256').update(value).digest('hex');
export const FORMAT = 'gen9championsvgc2026regmb';
export const PROBES = [
  ['Incineroar', 'U-turn', false], ['Gholdengo', 'Thunder Wave', false],
  ['Archaludon', 'Body Press', false], ['Kingambit', 'Sucker Punch', true],
  ['Blastoise', 'Water Spout', true], ['Vivillon-Fancy', 'Rage Powder', true],
  ['Floette-Eternal', 'Baton Pass', true], ['Rotom-Wash', 'Thunderbolt', true]
];

export function auditRuntimeMovePools(keys, api, formatId = FORMAT) {
  assert(Array.isArray(keys) && keys.length && keys.every(key => typeof key === 'string' && key.trim()), 'Explicit species inventory required');
  assert.equal(new Set(keys).size, keys.length, 'Duplicate species key');
  assert(typeof api?.isMoveLegalForSpecies === 'function' && typeof api?.legalMoveDisplayNamesForSpecies === 'function', 'Runtime move API required');
  const dex = Dex.mod(resolveFormat(formatId).mod);
  const universe = dex.moves.all().map(move => move.id).sort();
  const rows = [...keys].sort().map(key => {
    const species = dex.species.get(key);
    if (!species.exists) return { species_key: key, status: 'unresolved', reason: 'unknown_reference_species' };
    const chain = dex.species.getFullLearnset(species.id);
    if (!chain.length) return { species_key: key, status: 'unresolved', reason: 'missing_full_reference_learnset' };
    const pool = dex.species.getMovePool(species.id);
    const listed = api.legalMoveDisplayNamesForSpecies(key, { learnsetContext: 'champions' });
    assert(Array.isArray(listed) && listed.every(name => typeof name === 'string'), 'Invalid runtime move list');
    const local = new Set(listed.map(name => dex.toID(name)));
    const union = new Set([...universe, ...pool, ...local]);
    const referenceRejected = [], localAccepted = [], listingDisagreements = [];
    for (const id of [...union].sort()) {
      const verdict = api.isMoveLegalForSpecies(key, dex.moves.get(id).name || id, { learnsetContext: 'champions' });
      assert(typeof verdict?.legal === 'boolean', 'Missing runtime verdict');
      if (pool.has(id) && !verdict.legal) referenceRejected.push(id);
      if (!pool.has(id) && verdict.legal) localAccepted.push(id);
      if (local.has(id) !== verdict.legal) listingDisagreements.push(id);
    }
    return {
      species_key: key, reference_species_id: species.id,
      status: referenceRejected.length || localAccepted.length || listingDisagreements.length ? 'disagreement' : 'pool_agreement',
      reference_nonstandard: species.isNonstandard || null,
      inheritance_chain: chain.map(row => row.species.id),
      reference_pool: [...pool].sort(), runtime_listed: [...local].sort(),
      reference_moves_rejected: referenceRejected, runtime_moves_outside_pool: localAccepted,
      list_verdict_disagreements: listingDisagreements
    };
  });
  return { format_id: formatId, comparison: 'inherited_move_pool_vs_runtime_acceptance_not_official_legality',
    move_universe: universe, move_universe_sha256: sha(JSON.stringify(universe)),
    counts: rows.reduce((out, row) => { out.total++; out[row.status] = (out[row.status] || 0) + 1; return out; }, { total: 0 }), rows };
}

export function probeReferenceMove(speciesName, move, formatId = FORMAT) {
  const dex = Dex.mod(resolveFormat(formatId).mod);
  const species = dex.species.get(speciesName);
  assert(species.exists && dex.moves.get(move).exists, 'Known probe species and move required');
  const input = { species: species.name, ability: species.abilities['0'], item: '', nature: 'Hardy', level: 50,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: [move] };
  const errors = new TeamValidator(formatId).validateSet(structuredClone(input));
  return { input, accepted: !errors, errors: errors || [] };
}

export function installedReferenceFingerprint() {
  const directory = path.join(path.dirname(require.resolve('pokemon-showdown/package.json')), 'dist');
  const rows = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(child);
      else {
        assert(entry.isFile(), 'Unexpected non-regular reference dependency');
        rows.push([child.replaceAll('\\', '/'), sha(fs.readFileSync(path.join(directory, child)))]);
      }
    }
  }
  visit('');
  return { scope: 'installed pokemon-showdown/dist tree; exact file bytes', files: rows, sha256: sha(JSON.stringify(rows)) };
}

export function buildReport() {
  const identity = referenceIdentity();
  const reviewPath = new URL('source/reg-m-b-identity-review.json', root);
  const review = JSON.parse(fs.readFileSync(reviewPath));
  const api = require('../move_legality.js');
  const audit = auditRuntimeMovePools(review.rows.map(row => row.runtime_species_key), api);
  return { schema_version: 'champions-runtime-move-pool-audit-v1', generated_at: new Date().toISOString(),
    reference: { ...identity, installed_distribution: installedReferenceFingerprint(),
      dex_species_sha256: sha(fs.readFileSync(require.resolve('pokemon-showdown/dist/sim/dex-species.js'))),
      general_learnsets_sha256: sha(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/learnsets.js'))) },
    source_hashes: Object.fromEntries(['tools/audit-champions-move-pools.mjs', 'tools/showdown-reference.mjs', 'tools/generate-champions-move-pools.mjs', 'move_legality.js', 'generated/champions_move_pools.js', 'generated/pokemon_showdown_legal_data.js', 'source/reg-m-b-identity-review.json'].map(file => [file, sha(fs.readFileSync(new URL(file, root)))])),
    limits: ['Pinned baseline, not official Champions approval', 'Pool differences are candidates, not full-set verdicts', 'Single-move probes do not prove combinations', 'No data, DB, team or regulation mutation'],
    audit, probes: PROBES.map(([species, move, expected]) => ({ species, move, expected_reference_acceptance: expected,
      runtime: api.isMoveLegalForSpecies(species, move, { learnsetContext: 'champions' }), reference: probeReferenceMove(species, move) })) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'This read-only audit accepts no promotion arguments');
  const report = buildReport();
  fs.mkdirSync(new URL('artifacts/', root), { recursive: true });
  const directory = fs.mkdtempSync(fileURLToPath(new URL('artifacts/move-pools-', root)));
  fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ directory, counts: report.audit.counts, probes: report.probes.map(row => ({ species: row.species, move: row.move, runtime: row.runtime.legal, reference: row.reference.accepted })) }));
  process.exitCode = report.audit.rows.some(row => row.status !== 'pool_agreement') ? 1 : 0;
}
