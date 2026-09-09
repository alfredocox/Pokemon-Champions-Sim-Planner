import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { INTAKE_POLICY, prepareReferenceTeam, validateReferenceTeam, referenceIdentity, runReferenceProbe, compareProbe } from '../tools/showdown-reference.mjs';
import { auditLearnsetRows } from '../tools/audit-reference-learnsets.mjs';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';

const require = createRequire(import.meta.url);
const { TeamValidator, Dex } = require('pokemon-showdown');
const formats = ['gen9championsvgc2026regma', 'gen9championsvgc2026regmb'];
const team = () => ({ format: 'champions', members: [
  ['Incineroar', 'Intimidate'], ['Blastoise', 'Torrent'], ['Arcanine', 'Intimidate'],
  ['Dragonite', 'Inner Focus'], ['Garchomp', 'Sand Veil'], ['Whimsicott', 'Prankster']
].map(([name, ability]) => ({ name, ability, item: '', nature: 'Hardy', level: 50,
  evs: { hp: 32, atk: 0, def: 0, spa: 2, spd: 0, spe: 32 }, moves: ['Protect'] })) });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('strict default has structured missing-level reasons and never runs reference validation', () => {
  const input = team(); delete input.members[0].level;
  const before = structuredClone(input);
  const result = validateReferenceTeam(input, formats[0]);
  assert.equal(result.status, 'unsupported_input');
  assert.equal(result.reference_validation, 'not_run');
  assert.equal(result.reasons[0].code, 'missing_level');
  assert.equal(result.reasons[0].path, 'members[0].level');
  assert.deepEqual(result.intake.original_input, before);
  assert.deepEqual(input, before);
});

test('explicit normalization records all edits and keeps original, canonical and provenance evidence', () => {
  for (const format of formats) {
    const input = team();
    input.members.forEach(m => delete m.level);
    input.members[0].nature_source = { source: 'test', confidence: 'unknown' };
    input.members[0].ev_source = 'test-only stat points';
    const before = structuredClone(input);
    const result = validateReferenceTeam(input, format, 'p2', { policy: INTAKE_POLICY });
    assert.equal(result.status, 'accepted_by_reference', JSON.stringify(result.errors));
    assert.equal(result.reference_validation, 'completed');
    assert.equal(result.intake.normalizations.length, 8);
    assert.equal(result.intake.provenance.length, 2);
    assert.equal(result.intake.original_sha256, hash(input));
    assert.equal(result.intake.canonical_sha256, hash(result.intake.canonical_input));
    assert.deepEqual(result.intake.original_input, before);
    assert.deepEqual(input, before);
    assert.ok(result.mapped.every(m => m.level === 50));
    assert.ok(result.intake.canonical_input.members.every(m => !Object.hasOwn(m, 'nature_source')));
    result.intake.canonical_input.members[0].moves.push('Tackle');
    assert.deepEqual(input, before);
  }
});

test('normalization never coerces explicit levels, infers stat units or discards battle fields', () => {
  for (const level of [null, '50', 0, 49, 51, undefined, NaN]) {
    const input = team(); input.members[0].level = level;
    const result = validateReferenceTeam(input, formats[0], 'p1', { policy: INTAKE_POLICY });
    assert.equal(result.status, 'unsupported_input');
    assert.equal(result.reference_validation, 'not_run');
  }
  for (const field of ['ivs', 'status', 'stablePokemonId', 'unknown_field']) {
    const input = team(); input.members[0][field] = {};
    const result = validateReferenceTeam(input, formats[0], 'p1', { policy: INTAKE_POLICY });
    assert.equal(result.reasons[0].code, 'unsupported_member_field');
    assert.equal(result.reasons[0].path, 'members[0].' + field);
  }
  const missingFormat = team(); delete missingFormat.format;
  assert.equal(validateReferenceTeam(missingFormat, formats[0], 'p1', { policy: INTAKE_POLICY }).reasons[0].code, 'missing_stat_format');
  assert.throws(() => prepareReferenceTeam(team(), formats[0], 'typo'), /Unknown explicit/);
  assert.throws(() => prepareReferenceTeam(team(), 'gen9championsdoublescustomgame', INTAKE_POLICY), /rated Flat Rules/);
});

test('reference exceptions are execution errors, not unsupported input or legality rejection', () => {
  const original = TeamValidator.prototype.validateTeam;
  try {
    TeamValidator.prototype.validateTeam = () => { throw new Error('injected validator failure'); };
    const result = validateReferenceTeam(team(), formats[0]);
    assert.equal(result.status, 'reference_error');
    assert.equal(result.reference_validation, 'failed');
    assert.equal(result.reasons[0].code, 'reference_execution_error');
    const probe = runReferenceProbe({ formatId: formats[0], player: team(), opponent: team(), turns: [{}] });
    assert.equal(probe.status, 'reference_error');
    assert.equal(probe.completed_games, 0);
    assert.equal(compareProbe(referenceProbes()[0], {}).status, 'reference_error');
  } finally { TeamValidator.prototype.validateTeam = original; }
});

test('reference setup failures never blame the team and propagate through comparisons', () => {
  const original = fs.readFileSync;
  try {
    fs.readFileSync = function(file, ...args) {
      if (String(file).includes('package-lock.json')) throw new Error('injected lockfile failure');
      return original.call(this, file, ...args);
    };
    const result = validateReferenceTeam(team(), formats[0]);
    assert.equal(result.status, 'reference_error');
    assert.equal(result.reference_validation, 'not_run');
    assert.equal(result.reasons[0].code, 'reference_setup_error');
    assert.equal(compareProbe(referenceProbes()[0], {}).status, 'reference_error');
  } finally { fs.readFileSync = original; }
});

test('normalization cannot repair disputed moves or silently normalize form identities', () => {
  for (const format of formats) for (const move of ['U-turn', 'Knock Off']) {
    const input = team(); delete input.members[0].level; input.members[0].moves = [move];
    const result = validateReferenceTeam(input, format, 'p1', { policy: INTAKE_POLICY });
    assert.equal(result.status, 'rejected');
    assert.ok(result.errors.some(message => message.includes(move)));
    assert.deepEqual(result.mapped[0].moves, [move]);
  }
  const input = team(); input.members[0].name = 'Floette (Eternal Flower)-Mega';
  assert.equal(validateReferenceTeam(input, formats[0], 'p1', { policy: INTAKE_POLICY }).reasons[0].code, 'unknown_species');
});

test('learnset audit preserves direct-row disagreements without making legality claims', () => {
  const input = { species: { Incineroar: { moves: { uturn: '9M,8M,7M,7S0', knockoff: '9M,7T', protect: '9M' } },
    NotAPokemon: { moves: {} } } };
  const before = structuredClone(input);
  const report = auditLearnsetRows(input, formats[1]);
  const row = report.rows.find(r => r.local_species_key === 'Incineroar');
  assert.ok(row.local_only.includes('uturn'));
  assert.ok(row.local_only.includes('knockoff'));
  assert.ok(row.reference_only.includes('partingshot'));
  assert.equal(report.counts.total, 2);
  assert.equal(report.counts.unresolved, 1);
  assert.equal(report.comparison, 'direct_learnset_rows_not_legality');
  assert.deepEqual(input, before);
  const exact = Dex.mod('champions').species.getLearnsetData('incineroar').learnset;
  const exactLocal = { species: { Incineroar: { moves: Object.fromEntries(Object.entries(exact).map(([k,v]) => [k,v.join(',')])) } } };
  assert.equal(auditLearnsetRows(exactLocal, formats[1]).rows[0].status, 'same_direct_row');
  for (const field of ['champions_learnsets_sha256', 'champions_rulesets_sha256', 'validator_sha256']) assert.match(referenceIdentity()[field], /^[a-f0-9]{64}$/);
});
