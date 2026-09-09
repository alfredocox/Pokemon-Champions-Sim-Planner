import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { referenceProbes } from '../tests/fixtures/showdown_reference_probes.mjs';
import { referenceIdentity, loadLocalEngine, validateReferenceTeam, compareProbe, sourceFile, INTAKE_POLICY } from './showdown-reference.mjs';

const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--normalize-intake')) throw new Error('Unknown reference runner argument');
const intakePolicy = args.includes('--normalize-intake') ? INTAKE_POLICY : 'strict-v1';
const local = loadLocalEngine();
const generatedAt = new Date().toISOString();
const out = new URL('artifacts/showdown-reference/' + generatedAt.replace(/[:.]/g, '-') + '/', root);
fs.mkdirSync(out, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const report = { schema_version: 'champions-showdown-reference-v1', generated_at: generatedAt,
  scope: 'Headless scripted doubles mechanics probes and bundled-team intake; no UI parity, coaching, production or current-regulation promotion',
  reference: referenceIdentity(), intake_policy: intakePolicy, local_engine: { version: local.context.engineVersion, hashes: local.hashes },
  adapter_sha256: sha(fs.readFileSync(sourceFile)), fixture_sha256: sha(fs.readFileSync(new URL('../tests/fixtures/showdown_reference_probes.mjs', import.meta.url))),
  catalog: [], probes: [], counters: { requested_probes: 0, completed_probes: 0, unsupported_probes: 0, rejected_probes: 0, reference_error_probes: 0, agreement_probes: 0, mismatch_probes: 0, reference_completed_games: 0 } };

for (const [id, team] of Object.entries(local.context.TEAMS)) {
  for (const format of ['gen9championsvgc2026regma', 'gen9championsvgc2026regmb']) {
    const validation = validateReferenceTeam(team, format, 'p1', { policy: intakePolicy });
    report.catalog.push({ team_id: id, format_id: format, status: validation.status, errors: validation.errors,
      input_sha256: sha(JSON.stringify(team)), normalization_required: validation.normalized_by_validator || false,
      reference_validation: validation.reference_validation, reasons: validation.reasons, intake: validation.intake,
      mapped: validation.mapped, validated: validation.validated });
  }
}
for (const fixture of referenceProbes()) {
  report.counters.requested_probes++;
  try {
    const result = compareProbe(fixture, local);
    const file = fixture.id + '.json';
    fs.writeFileSync(new URL(file, out), JSON.stringify(result, null, 2) + '\n');
    const { reference, local: localResult, ...summary } = result;
    report.probes.push({ ...summary, evidence_file: file, evidence_sha256: sha(fs.readFileSync(new URL(file, out))) });
    if (result.status === 'unsupported' || result.status === 'unsupported_input') report.counters.unsupported_probes++;
    else if (result.status === 'rejected') report.counters.rejected_probes++;
    else if (result.status === 'reference_error') report.counters.reference_error_probes++;
    else if (['mismatch', 'agreement_in_declared_scope'].includes(result.status)) {
      report.counters.completed_probes++;
      report.counters.reference_completed_games += reference.completed_games;
      if (result.status === 'mismatch') report.counters.mismatch_probes++;
      else report.counters.agreement_probes++;
    } else throw new Error('Unexpected comparison outcome: ' + result.status);
  } catch (error) {
    report.counters.unsupported_probes++;
    report.probes.push({ id: fixture.id, status: 'unsupported', error: error.message });
  }
}
report.catalog_counts = report.catalog.reduce((counts, row) => {
  const key = row.format_id + ':' + row.status; counts[key] = (counts[key] || 0) + 1; return counts;
}, {});
fs.writeFileSync(new URL('report.json', out), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ artifact_directory: out.pathname, counters: report.counters, catalog_counts: report.catalog_counts,
  probes: report.probes.map(p => ({ id: p.id, status: p.status, error: p.error, differences: p.differences })) }, null, 2));
process.exitCode = report.counters.mismatch_probes || report.counters.unsupported_probes || report.counters.rejected_probes || report.counters.reference_error_probes || report.catalog.some(row => row.status === 'reference_error') ? 1 : 0;
