import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mapOfficialRoster } from './regulation-roster-mapping.mjs';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Unknown argument');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const codeHash = file => hash(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
const capturedBytes = fs.readFileSync(new URL('source/reg-m-b-official-roster.json', root));
const capture = JSON.parse(capturedBytes);
const formEvidence = JSON.parse(fs.readFileSync(new URL('source/reg-m-b-form-identity-evidence.json', root), 'utf8'));
if (formEvidence.schema_version !== 'champions-form-identity-evidence-v1' || formEvidence.source_sha256 !== capture.source_sha256 || formEvidence.regulation_id !== capture.regulation_id || formEvidence.competitive_use !== false || formEvidence.approval_status !== 'unapproved') throw new Error('Form identity evidence does not bind to this unapproved capture');
if (!Array.isArray(formEvidence.rows) || formEvidence.rows.length !== 2 || new Set(formEvidence.rows.map(row => row.official_id)).size !== 2 || formEvidence.rows.some(row => !['0666-018', '0670-005'].includes(row.official_id))) throw new Error('Incomplete explicit form evidence');
const baselinePath = new URL('generated/pokemon_showdown_legal_data.js', root);
const baseline = require('../generated/pokemon_showdown_legal_data.js');
const rows = mapOfficialRoster(capture, baseline.species);
for (const evidence of formEvidence.rows) {
  const row = rows.find(row => row.official_id === evidence.official_id);
  if (!row || row.official_label !== evidence.official_label || row.runtime_species_key !== evidence.runtime_species_key) throw new Error('Form evidence/mapping identity mismatch');
}
const review = {
  schema_version: 'champions-roster-identity-review-v1',
  regulation_id: capture.regulation_id,
  competitive_use: false,
  approval_status: 'unapproved',
  scope: 'Source-to-baseline identity candidates only; no legality, stats, learnset or mechanics approval',
  official_source_url: capture.source_url,
  official_source_sha256: capture.source_sha256,
  tracked_source_hash_scope: 'capture: JSON.stringify parsed object; code: UTF-8 with LF line endings',
  capture_sha256: hash(JSON.stringify(capture)),
  form_identity_evidence_sha256: hash(JSON.stringify(formEvidence)),
  baseline_sha256: codeHash(baselinePath),
  baseline_source_version: baseline.sourceCommitOrVersion,
  mapper_sha256: codeHash(new URL('regulation-roster-mapping.mjs', import.meta.url)),
  counters: { official_rows: rows.length, mapped_candidates: rows.filter(row => row.runtime_species_key).length, unresolved: rows.filter(row => row.status === 'needs_identity_review').length },
  rows
};
const output = JSON.stringify(review, null, 2) + '\n';
const target = new URL('source/reg-m-b-identity-review.json', root);
if (args.includes('--check')) {
  if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error('M-B identity review drift; regenerate and review changed input hashes');
} else fs.writeFileSync(target, output);
console.log(`${args.includes('--check') ? 'Verified' : 'Built'} M-B identity review: ${review.counters.mapped_candidates} candidates; ${review.counters.unresolved} unresolved; unapproved.`);
