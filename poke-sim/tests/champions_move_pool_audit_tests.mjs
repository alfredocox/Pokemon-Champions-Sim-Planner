import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { auditRuntimeMovePools, probeReferenceMove, PROBES } from '../tools/audit-champions-move-pools.mjs';
const require = createRequire(import.meta.url);
const { Dex } = require('pokemon-showdown');
const dex = Dex.mod('champions');
const exact = {
  legalMoveDisplayNamesForSpecies: key => [...dex.species.getMovePool(key)].map(id => dex.moves.get(id).name),
  isMoveLegalForSpecies: (key, move) => ({ legal: dex.species.getMovePool(key).has(dex.toID(move)) })
};
test('full form chains resolve without mistaking missing direct rows for missing support', () => {
  const report = auditRuntimeMovePools(['Vivillon-Fancy', 'Rotom-Wash', 'Floette-Eternal'], exact);
  assert.equal(report.counts.pool_agreement, 3);
  assert.deepEqual(report.rows.find(row => row.species_key === 'Vivillon-Fancy').inheritance_chain, ['vivillon']);
  assert(report.rows.find(row => row.species_key === 'Rotom-Wash').inheritance_chain.includes('rotom'));
  assert(report.rows.find(row => row.species_key === 'Floette-Eternal').inheritance_chain.includes('flabebe'));
});
test('audit detects both acceptance directions and selector/verdict disagreement', () => {
  const broken = { legalMoveDisplayNamesForSpecies: () => ['U-turn'], isMoveLegalForSpecies: (_key, move) => ({ legal: ['uturn', 'protect'].includes(dex.toID(move)) }) };
  const row = auditRuntimeMovePools(['Incineroar'], broken).rows[0];
  assert(row.runtime_moves_outside_pool.includes('uturn'));
  assert(row.reference_moves_rejected.includes('partingshot'));
  assert(row.list_verdict_disagreements.includes('protect'));
});
test('missing inventory, API, verdict and species cannot silently agree', () => {
  assert.throws(() => auditRuntimeMovePools([], exact));
  assert.throws(() => auditRuntimeMovePools(['Incineroar', 'Incineroar'], exact));
  assert.throws(() => auditRuntimeMovePools(['Incineroar'], {}));
  assert.throws(() => auditRuntimeMovePools(['Incineroar'], { ...exact, isMoveLegalForSpecies: () => ({}) }));
  assert.equal(auditRuntimeMovePools(['NotAPokemon'], exact).rows[0].status, 'unresolved');
});
test('acceptance outside both advertised lists is still detected', () => {
  const hidden = { ...exact, isMoveLegalForSpecies: (key, move) => ({ legal: dex.toID(move) === 'splash' || exact.isMoveLegalForSpecies(key, move).legal }) };
  const row = auditRuntimeMovePools(['Incineroar'], hidden).rows[0];
  assert(row.runtime_moves_outside_pool.includes('splash'));
  assert(row.list_verdict_disagreements.includes('splash'));
  assert.equal(row.status, 'disagreement');
});
test('named single-move sets retain pinned Champions validator outcomes', () => {
  for (const [species, move, expected] of PROBES) {
    const result = probeReferenceMove(species, move);
    assert.equal(result.accepted, expected, species + '/' + move);
    if (!expected) assert.match(result.errors.join(' '), /can't learn/);
  }
});
