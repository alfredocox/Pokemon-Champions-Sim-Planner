import fs from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { referenceIdentity, resolveFormat } from './showdown-reference.mjs';

const require = createRequire(import.meta.url);
const { Dex } = require('pokemon-showdown');
const root = new URL('../', import.meta.url);
const localPath = new URL('generated/pokemon_showdown_legal_data.js', root);
const sha = value => createHash('sha256').update(value).digest('hex');

export function auditLearnsetRows(localData, formatId) {
  const format = resolveFormat(formatId);
  const dex = Dex.mod(format.mod);
  if (!localData?.species || typeof localData.species !== 'object') throw new Error('Missing local species inventory');
  const rows = Object.entries(localData.species).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, row]) => {
    const species = dex.species.get(key);
    const base = { local_species_key: key, reference_species_id: species.id, reference_nonstandard: species.isNonstandard || null };
    if (!species.exists || !row.moves || typeof row.moves !== 'object') return { ...base, status: 'unresolved', reason: 'missing_species_or_local_learnset' };
    const reference = dex.species.getLearnsetData(species.id);
    if (!reference.exists || !reference.learnset) return { ...base, status: 'unresolved', reason: 'missing_direct_reference_learnset' };
    const localMoves = Object.keys(row.moves).sort();
    const referenceMoves = Object.keys(reference.learnset).sort();
    const localOnly = localMoves.filter(id => !Object.hasOwn(reference.learnset, id));
    const referenceOnly = referenceMoves.filter(id => !Object.hasOwn(row.moves, id));
    const sourceDifferences = localMoves.filter(id => Object.hasOwn(reference.learnset, id)).filter(id =>
      JSON.stringify(String(row.moves[id]).split(',').sort()) !== JSON.stringify([...reference.learnset[id]].sort()));
    return { ...base, status: localOnly.length || referenceOnly.length || sourceDifferences.length ? 'review_required' : 'same_direct_row',
      local_move_count: localMoves.length, reference_move_count: referenceMoves.length,
      local_only: localOnly, reference_only: referenceOnly,
      source_differences: sourceDifferences.map(id => ({ move_id: id, local: row.moves[id], reference: reference.learnset[id] })),
      local_row_sha256: sha(JSON.stringify(row.moves)), reference_row_sha256: sha(JSON.stringify(reference.learnset)) };
  });
  return { format_id: formatId, mod: format.mod, comparison: 'direct_learnset_rows_not_legality',
    limits: ['No official legality approval', 'No pre-evolution/form inheritance or local supplement equivalence claim', 'No team, generated data or DB mutation'],
    counts: rows.reduce((counts, row) => { counts.total++; counts[row.status] = (counts[row.status] || 0) + 1; return counts; }, { total: 0 }), rows };
}

export function buildLearnsetReport() {
  const localData = require(fileURLToPath(localPath));
  return { schema_version: 'champions-learnset-alignment-audit-v1', generated_at: new Date().toISOString(),
    local_source: { source: localData.source, version: localData.sourceCommitOrVersion, generated_at: localData.generatedAt,
      file_sha256: sha(fs.readFileSync(localPath)), overrides: localData.meta?.appliedOverrideCount },
    reference: { ...referenceIdentity(), general_learnsets_sha256: sha(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/learnsets.js'))) },
    formats: ['gen9championsvgc2026regma', 'gen9championsvgc2026regmb'].map(format => auditLearnsetRows(localData, format)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('This read-only audit does not accept mutation or promotion arguments');
  const report = buildLearnsetReport();
  const output = new URL('artifacts/learnset-alignment/' + report.generated_at.replace(/[:.]/g, '-') + '.json', root);
  fs.mkdirSync(new URL('./', output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ artifact: fileURLToPath(output), formats: report.formats.map(({ format_id, counts }) => ({ format_id, counts })) }, null, 2));
  process.exitCode = report.formats.some(f => f.rows.some(r => r.status !== 'same_direct_row')) ? 1 : 0;
}
