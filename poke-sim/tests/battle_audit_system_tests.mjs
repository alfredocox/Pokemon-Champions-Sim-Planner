import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSummary,
  loadEdgeCaseMatrix,
  loadManifest,
  validateEdgeCaseMatrix,
  validateManifest,
} from '../tools/run-battle-audit.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const manifest = loadManifest();
assert.deepEqual(validateManifest(manifest), []);
const edgeMatrix = loadEdgeCaseMatrix(manifest);
assert.deepEqual(validateEdgeCaseMatrix(edgeMatrix, manifest), []);

const requiredFamilies = [
  'identity-lifecycle', 'turn-order', 'stats-forms', 'damage-formula', 'moves-effects',
  'abilities', 'items', 'status', 'field-effects', 'targeting-spread', 'transformations',
  'legality-imports', 'battle-determinism', 'champion-regulation-deltas', 'combinatorial-interactions',
];
assert.deepEqual(manifest.families.map((family) => family.id), requiredFamilies);
assert.equal(manifest.claim_policy.universal_accuracy_proven, false);
assert.deepEqual(manifest.inventories.map((inventory) => inventory.id), [
  'shipped-moves', 'curated-abilities', 'supported-species-forms', 'held-items', 'import-enabled-surface',
]);
assert.ok(manifest.inventories.every((inventory) => inventory.classification_test));
assert.ok(manifest.inventories.filter((inventory) => inventory.status !== 'regression_covered').every((inventory) => inventory.known_gaps.length > 0));
assert.ok(manifest.families.some((family) => family.status === 'partial'));
assert.ok(manifest.families.some((family) => family.status === 'gap'));
assert.ok(manifest.families.filter((family) => family.status !== 'regression_covered').every((family) => family.known_gaps.length > 0));

const summary = buildSummary(manifest, edgeMatrix);
assert.equal(summary.total_families, 15);
assert.equal(summary.family_counts.regression_covered, 5);
assert.equal(summary.family_counts.partial, 8);
assert.equal(summary.family_counts.gap, 2);
assert.equal(summary.universal_accuracy_proven, false);
assert.equal(summary.total_inventories, 5);
assert.equal(summary.inventory_counts.partial, 3);
assert.equal(summary.inventory_counts.gap, 2);
assert.equal(summary.total_edge_cases, 46);
assert.deepEqual(summary.edge_case_counts, { covered: 18, partial: 23, open: 5 });
assert.ok(summary.unproved_edge_case_ids.includes('STATS-ROSTER-CONSUMER-PARITY'));
assert.ok(summary.unproved_edge_case_ids.includes('RESOURCE-PP-DRAIN-SUBSTITUTE'));
assert.equal(manifest.families.find(row => row.id === 'status').status, 'partial');
assert.equal(edgeMatrix.cases.find(row => row.id === 'RESIDUAL-GLOBAL-ORDER').status, 'partial');
assert.equal(edgeMatrix.cases.find(row => row.id === 'DAMAGE-SEISMIC-TOSS-LEVEL').status, 'partial');
assert.ok(summary.unproved_edge_case_ids.includes('ORDER-TAILWIND-SAME-TURN'));
assert.ok(summary.unproved_edge_case_ids.includes('DAMAGE-SEISMIC-TOSS-LEVEL'));
assert.ok(summary.unproved_edge_case_ids.includes('MOVE-GROWL-LEER-STAGES'));
assert.ok(summary.unproved_edge_case_ids.includes('ORDER-MIRROR-SIDE-SYMMETRY'));
assert.ok(summary.unproved_edge_case_ids.includes('RESIDUAL-GLOBAL-ORDER'));
assert.ok(edgeMatrix.cases.some((battleCase) => battleCase.id === 'TARGET-SPREAD-INDEPENDENT-ACCURACY' && battleCase.status === 'covered'));
assert.ok(edgeMatrix.cases.some((battleCase) => battleCase.id === 'RESOURCE-PP-PRESSURE' && battleCase.status === 'covered'));

const invalid = structuredClone(manifest);
invalid.families[0].tests = ['tests/does-not-exist.js'];
assert.ok(validateManifest(invalid).some((error) => error.includes('missing test')));

const hiddenGap = structuredClone(manifest);
hiddenGap.families.find((family) => family.status === 'partial').known_gaps = [];
assert.ok(validateManifest(hiddenGap).some((error) => error.includes('must disclose known_gaps')));

const falselyCovered = structuredClone(edgeMatrix);
falselyCovered.cases.find((battleCase) => battleCase.status === 'open').status = 'covered';
assert.ok(validateEdgeCaseMatrix(falselyCovered, manifest).some((error) => error.includes('covered cases require deterministic tests')));

const workflow = readFileSync(join(repoRoot, '.github', 'workflows', 'battle-audit.yml'), 'utf8');
const ci = readFileSync(join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
assert.match(workflow, /workflow_call:/);
assert.match(workflow, /npm run test:battle-audit -- --report/);
assert.match(workflow, /battle-audit-\$\{\{ github\.sha \}\}/);
assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
assert.match(ci, /uses: \.\/\.github\/workflows\/battle-audit\.yml/);
assert.match(ci, /poke-sim\/generated\/\*\*/);

console.log('battle audit system: passed');
