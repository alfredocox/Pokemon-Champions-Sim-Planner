#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = join(ROOT, 'battle_audit_manifest.json');
const ALLOWED_STATUSES = new Set(['regression_covered', 'partial', 'gap']);
const ALLOWED_CASE_STATUSES = new Set(['covered', 'partial', 'open']);
const FORBIDDEN_COMPLETE_CLAIMS = /\b(?:100% accurate|every edge case|fully showdown equivalent|all pokemon|all moves|universal(?:ly)? accurate)\b/i;

export function loadManifest(path = MANIFEST_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadEdgeCaseMatrix(manifest, root = ROOT) {
  if (!manifest?.edge_case_matrix) throw new Error('edge_case_matrix path is required');
  return JSON.parse(readFileSync(join(root, manifest.edge_case_matrix), 'utf8'));
}

export function validateEdgeCaseMatrix(matrix, manifest, root = ROOT) {
  const errors = [];
  if (matrix?.schema_version !== 1) errors.push('edge matrix schema_version must equal 1');
  if (!matrix?.matrix_version) errors.push('edge matrix matrix_version is required');
  if (!Array.isArray(matrix?.cases) || matrix.cases.length === 0) {
    errors.push('edge matrix cases must be a non-empty array');
    return errors;
  }
  const familyIds = new Set((manifest?.families || []).map((family) => family.id));
  const ids = new Set();
  for (const battleCase of matrix.cases) {
    const label = battleCase.id || '<missing-case-id>';
    if (!battleCase.id || ids.has(battleCase.id)) errors.push(`edge case id must be present and unique: ${label}`);
    ids.add(battleCase.id);
    if (!familyIds.has(battleCase.family)) errors.push(`${label}: unknown family ${battleCase.family}`);
    if (!battleCase.behavior) errors.push(`${label}: behavior is required`);
    if (!ALLOWED_CASE_STATUSES.has(battleCase.status)) errors.push(`${label}: invalid case status ${battleCase.status}`);
    if (!Array.isArray(battleCase.tests)) errors.push(`${label}: tests must be an array`);
    if (!Array.isArray(battleCase.boundary_vectors) || battleCase.boundary_vectors.length === 0) {
      errors.push(`${label}: boundary_vectors must be a non-empty array`);
    }
    if (!battleCase.oracle) errors.push(`${label}: oracle is required`);
    for (const test of battleCase.tests || []) {
      if (!/^tests\/.+\.(?:js|mjs)$/.test(test)) errors.push(`${label}: invalid test path ${test}`);
      else if (!existsSync(join(root, test))) errors.push(`${label}: missing test ${test}`);
    }
    if (battleCase.status === 'covered') {
      if (!battleCase.tests?.length) errors.push(`${label}: covered cases require deterministic tests`);
      if (battleCase.known_gap) errors.push(`${label}: covered cases cannot declare known_gap`);
    } else if (!battleCase.known_gap) {
      errors.push(`${label}: partial and open cases must declare known_gap`);
    }
  }
  return errors;
}

export function validateManifest(manifest, root = ROOT) {
  const errors = [];
  if (manifest.schema_version !== 1) errors.push('schema_version must equal 1');
  if (!manifest.audit_version) errors.push('audit_version is required');
  if (!manifest.scope) errors.push('scope is required');
  if (!manifest.edge_case_matrix || !existsSync(join(root, manifest.edge_case_matrix))) {
    errors.push(`missing edge_case_matrix ${manifest.edge_case_matrix}`);
  }
  if (manifest.claim_policy?.universal_accuracy_proven !== false) {
    errors.push('claim_policy.universal_accuracy_proven must remain false while partial or gap families exist');
  }
  if (!Array.isArray(manifest.families) || manifest.families.length === 0) {
    errors.push('families must be a non-empty array');
    return errors;
  }

  if (!Array.isArray(manifest.inventories) || manifest.inventories.length === 0) {
    errors.push('inventories must be a non-empty array');
  } else {
    const inventoryIds = new Set();
    for (const inventory of manifest.inventories) {
      const label = inventory.id || '<missing-inventory-id>';
      if (!inventory.id || inventoryIds.has(inventory.id)) errors.push(`inventory id must be present and unique: ${label}`);
      inventoryIds.add(inventory.id);
      if (!ALLOWED_STATUSES.has(inventory.status)) errors.push(`${label}: invalid inventory status ${inventory.status}`);
      if (!inventory.source || !existsSync(join(root, inventory.source))) errors.push(`${label}: missing inventory source ${inventory.source}`);
      if (!inventory.classification_test || !existsSync(join(root, inventory.classification_test))) {
        errors.push(`${label}: missing inventory classification test ${inventory.classification_test}`);
      }
      if (inventory.status !== 'regression_covered' && (!Array.isArray(inventory.known_gaps) || inventory.known_gaps.length === 0)) {
        errors.push(`${label}: partial and gap inventories must disclose known_gaps`);
      }
    }
  }

  const ids = new Set();
  for (const family of manifest.families) {
    const label = family.id || '<missing-id>';
    if (!family.id || ids.has(family.id)) errors.push(`family id must be present and unique: ${label}`);
    ids.add(family.id);
    if (!family.name) errors.push(`${label}: name is required`);
    if (!ALLOWED_STATUSES.has(family.status)) errors.push(`${label}: invalid status ${family.status}`);
    if (!Array.isArray(family.tests)) errors.push(`${label}: tests must be an array`);
    if (!Array.isArray(family.known_gaps)) errors.push(`${label}: known_gaps must be an array`);
    if ((family.status === 'partial' || family.status === 'gap') && (!family.known_gaps || family.known_gaps.length === 0)) {
      errors.push(`${label}: partial and gap families must disclose known_gaps`);
    }
    if ((family.status === 'regression_covered' || family.status === 'partial') && (!family.tests || family.tests.length === 0)) {
      errors.push(`${label}: covered and partial families require tests`);
    }
    for (const test of family.tests || []) {
      if (!/^tests\/.+\.(?:js|mjs)$/.test(test)) errors.push(`${label}: invalid test path ${test}`);
      else if (!existsSync(join(root, test))) errors.push(`${label}: missing test ${test}`);
    }
    if (FORBIDDEN_COMPLETE_CLAIMS.test(JSON.stringify(family))) {
      errors.push(`${label}: contains a forbidden completeness claim`);
    }
  }
  return errors;
}

export function buildSummary(manifest, edgeMatrix = null) {
  const counts = { regression_covered: 0, partial: 0, gap: 0 };
  for (const family of manifest.families) counts[family.status] += 1;
  const edgeCaseCounts = { covered: 0, partial: 0, open: 0 };
  for (const battleCase of edgeMatrix?.cases || []) edgeCaseCounts[battleCase.status] += 1;
  return {
    schema_version: 1,
    audit_version: manifest.audit_version,
    scope: manifest.scope,
    universal_accuracy_proven: false,
    family_counts: counts,
    total_families: manifest.families.length,
    inventory_counts: Object.fromEntries(['regression_covered', 'partial', 'gap'].map((status) => [status, manifest.inventories.filter((inventory) => inventory.status === status).length])),
    total_inventories: manifest.inventories.length,
    unproved_inventory_ids: manifest.inventories.filter((inventory) => inventory.status !== 'regression_covered').map((inventory) => inventory.id),
    unproved_family_ids: manifest.families.filter((family) => family.status !== 'regression_covered').map((family) => family.id),
    edge_case_counts: edgeCaseCounts,
    total_edge_cases: edgeMatrix?.cases?.length || 0,
    unproved_edge_case_ids: (edgeMatrix?.cases || []).filter((battleCase) => battleCase.status !== 'covered').map((battleCase) => battleCase.id),
  };
}

function provenance(manifestPath = MANIFEST_PATH) {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return {
    git_sha: process.env.GITHUB_SHA || (git.status === 0 ? git.stdout.trim() : 'unknown'),
    node_version: process.version,
    manifest_sha256: createHash('sha256').update(readFileSync(manifestPath)).digest('hex'),
  };
}

function runNode(relativePath) {
  console.log(`\nRUN ${relativePath}`);
  const result = spawnSync(process.execPath, [join(ROOT, relativePath)], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });
  return result.error ? { failed: true, message: result.error.message } : { failed: result.status !== 0, message: `exit ${result.status}` };
}

export function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes('--check');
  const skipStress = argv.includes('--skip-stress');
  const reportIndex = argv.indexOf('--report');
  const reportPath = reportIndex >= 0 ? argv[reportIndex + 1] : null;
  const knownArgs = new Set(['--check', '--skip-stress', '--report']);
  const unknown = argv.filter((arg, index) => !knownArgs.has(arg) && index !== reportIndex + 1);
  if (unknown.length) throw new Error(`unknown option(s): ${unknown.join(', ')}`);
  if (reportIndex >= 0 && !reportPath) throw new Error('--report requires a path');

  const manifest = loadManifest();
  const errors = validateManifest(manifest);
  let edgeMatrix = null;
  if (errors.length === 0) {
    edgeMatrix = loadEdgeCaseMatrix(manifest);
    errors.push(...validateEdgeCaseMatrix(edgeMatrix, manifest));
  }
  if (errors.length) {
    for (const error of errors) console.error(`MANIFEST ERROR: ${error}`);
    return 2;
  }

  const summary = buildSummary(manifest, edgeMatrix);
  console.log(`Battle audit manifest ${summary.audit_version}: ${summary.total_families} families`);
  console.log(`Coverage: ${summary.family_counts.regression_covered} regression-covered, ${summary.family_counts.partial} partial, ${summary.family_counts.gap} gap`);
  console.log(`Inventories: ${summary.inventory_counts.regression_covered} regression-covered, ${summary.inventory_counts.partial} partial, ${summary.inventory_counts.gap} gap`);
  console.log(`Edge cases: ${summary.edge_case_counts.covered} covered, ${summary.edge_case_counts.partial} partial, ${summary.edge_case_counts.open} open`);
  console.log(`Universal accuracy proven: ${summary.universal_accuracy_proven}`);
  if (checkOnly) return 0;

  const tests = [...new Set([
    ...manifest.families.flatMap((family) => family.tests),
    ...manifest.inventories.map((inventory) => inventory.classification_test),
    ...edgeMatrix.cases.flatMap((battleCase) => battleCase.tests),
  ])].sort();
  const failures = [];
  const testResults = new Map();
  for (const test of tests) {
    const result = runNode(test);
    testResults.set(test, result.failed ? 'failed' : 'passed');
    if (result.failed) failures.push(`${test}: ${result.message}`);
  }

  const golden = runNode('tests/golden_battles_runner.js');
  if (golden.failed) failures.push(`tests/golden_battles_runner.js: ${golden.message}`);

  if (!skipStress) {
    const stress = runNode('tests/audit.js');
    if (stress.failed) failures.push(`tests/audit.js: ${stress.message}`);
  }

  const report = {
    ...summary,
    provenance: provenance(),
    generated_at: new Date().toISOString(),
    deterministic_test_files: tests.length,
    golden_trace: golden.failed ? 'failed' : 'passed',
    seeded_stress: skipStress ? 'skipped' : failures.some((failure) => failure.startsWith('tests/audit.js')) ? 'failed' : 'passed',
    family_results: manifest.families.map((family) => ({
      id: family.id,
      declared_status: family.status,
      tests: family.tests.map((test) => ({ path: test, result: testResults.get(test) || 'not_run' })),
    })),
    inventory_results: manifest.inventories.map((inventory) => ({
      id: inventory.id,
      declared_status: inventory.status,
      classification_test: inventory.classification_test,
      result: testResults.get(inventory.classification_test) || 'not_run',
    })),
    edge_case_results: edgeMatrix.cases.map((battleCase) => ({
      id: battleCase.id,
      declared_status: battleCase.status,
      boundaries: battleCase.boundary_vectors,
      tests: battleCase.tests.map((test) => ({ path: test, result: testResults.get(test) || 'not_run' })),
      known_gap: battleCase.known_gap || null,
    })),
    failures,
  };
  if (reportPath) writeFileSync(resolve(ROOT, reportPath), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.error(`\nBattle audit failed in ${failures.length} file(s).`);
    return 1;
  }
  console.log('\nBattle audit passed for its declared scope. Partial and gap families remain unproved.');
  return 0;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`Battle audit configuration error: ${error.message}`);
    process.exitCode = 2;
  }
}
