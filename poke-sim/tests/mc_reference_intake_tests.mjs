import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffRows, capture } from '../tools/audit-mc-reference.mjs';
import { parseOfficialRoster } from '../tools/capture-reg-mb-official.mjs';
import fs from 'node:fs';

test('season diffs retain exact form identities and old values without mutating inputs', () => {
  const before = [{ id: 'absol', value: 1 }, { id: 'absolmega', value: 2 }];
  const after = [{ id: 'absol', value: 3 }, { id: 'absolmegaz', value: 4 }];
  const copy = JSON.stringify(before);
  const diff = diffRows(before, after);
  assert.deepEqual(diff.added, [after[1]]);
  assert.deepEqual(diff.removed, [before[1]]);
  assert.deepEqual(diff.changed, [{ id: 'absol', before: before[0], after: after[0] }]);
  assert.equal(JSON.stringify(before), copy);
});
test('duplicate and missing canonical identities cannot silently overwrite evidence', () => {
  assert.throws(() => diffRows([{ id: 'a' }, { id: 'a' }], []), /duplicate/);
  assert.throws(() => diffRows([], [{}]), /Missing/);
});
test('mutable upstream labels cannot be used as an exact reference pin', () => {
  assert.throws(() => capture('.', 'master'), /Exact upstream commit/);
});

test('official embedded JSON is parsed without executing page scripts', () => {
  const html = rows => Buffer.from('<script>const pokemons = ' + JSON.stringify(rows) + ';const noPrefix = "";throw new Error("must not execute");</script>');
  assert.deepEqual(parseOfficialRoster(html([['0925-001', 1, 'Maushold']])), [{ official_id: '0925-001', eligible: true, label: 'Maushold' }]);
  assert.throws(() => parseOfficialRoster(html([])), /Empty/);
  assert.throws(() => parseOfficialRoster(html([['0925-001', 1, 'Maushold'], ['0925-001', 1, 'Maushold']])), /duplicate/);
  assert.throws(() => parseOfficialRoster(Buffer.from('<script>window.fake = true;</script>')), /Ambiguous/);
});

test('captured M-C reference remains quarantined and every declared set probe has the expected outcome', () => {
  const report = JSON.parse(fs.readFileSync(new URL('../source/reg-m-c-reference-intake.json', import.meta.url)));
  assert.equal(report.competitive_use, false);
  assert.equal(report.official_roster_verified, false);
  assert.equal(report.formats.length, 6);
  assert.equal(report.official_identity_candidates.length, 262);
  assert.equal(report.official_identity_candidates.filter(r => r.runtime_species_key).length, 260);
  assert.deepEqual(report.official_identity_candidates.filter(r => !r.runtime_species_key).map(r => r.official_id).sort(), ['0925-001', '0931-002']);
  for (const id of ['0053-001', '0849-000', '0849-001', '0876-000', '0876-001']) {
    const row = report.official_identity_candidates.find(r => r.official_id === id);
    assert.equal(row.mapping_basis, 'explicit_id_and_label_alias');
    assert.equal(row.competitive_use, false);
  }
  assert.equal(report.probes.length, 6);
  for (const p of report.probes) {
    assert.equal(p.sets.length, 7);
    for (const s of p.sets) {
      assert.equal(s.accepted, p.format.includes('regmc'));
      assert.equal(s.input.level, 50);
      assert.equal(s.input.nature, 'Serious');
      assert.equal(Object.values(s.input.evs).reduce((a, b) => a + b, 0), 66);
    }
  }
});
