import assert from 'node:assert/strict';
import { checkState, seedFor, qualityGateFailed, validateRegulationCoverage } from '../tools/run-accuracy-validation.mjs';
assert.deepEqual(seedFor('fixed'), seedFor('fixed'));
assert.notDeepEqual(seedFor('fixed'), seedFor('other'));
const mon = side => ({ stableKey: side + ':slot:0:Pikachu', teamSlot: 0, hp: 100, zone: 'active' });
const snapshot = { roster: { player: [mon('player')], opponent: [mon('opponent')] } };
const valid = { result: 'draw', turnLog: [{ pre: snapshot, post: snapshot, damage_events: [] }] };
checkState(valid, 'singles', 3);
for (const hp of [undefined, NaN, -1, 101]) {
  const bad = structuredClone(valid);
  bad.turnLog[0].pre.roster.player[0].hp = hp;
  assert.throws(() => checkState(bad, 'singles', 3));
}
const duplicate = structuredClone(valid);
duplicate.turnLog[0].pre.roster.player.push(mon('player'));
assert.throws(() => checkState(duplicate, 'doubles', 4));
const catalog = {
  current: { id: 'current', version: 'v1', status: 'implemented', runtimePromotable: true },
  review: { id: 'review', version: 'draft-v1', status: 'source_review', runtimePromotable: false }
};
const manifest = { schema_version: 'champions-accuracy-harness-v1', warning_budget: 0, regulations: [
  { id: 'current', version: 'v1', status: 'implemented', runtime_promotable: true, harness_lane: 'current-doubles', formats: ['doubles'] },
  { id: 'review', version: 'draft-v1', status: 'source_review', runtime_promotable: false, harness_lane: 'blocked', formats: [] }
] };
assert.deepEqual(validateRegulationCoverage(catalog, manifest), []);
assert.ok(validateRegulationCoverage({ ...catalog, next: { id: 'next', version: 'v1', status: 'implemented', runtimePromotable: true } }, manifest)
  .includes('missing-regulation:next'));
assert.ok(validateRegulationCoverage({ ...catalog, current: { ...catalog.current, version: 'v2' } }, manifest)
  .includes('version-drift:current'));
assert.ok(validateRegulationCoverage({ ...catalog, review: { ...catalog.review, runtimePromotable: true } }, manifest)
  .includes('promotion-drift:review'));
assert.ok(validateRegulationCoverage(catalog, { ...manifest, regulations: [...manifest.regulations, manifest.regulations[0]] })
  .includes('duplicate-regulation:current'));
assert.ok(validateRegulationCoverage(catalog, { ...manifest, regulations: manifest.regulations.map(row => row.id === 'current' ? { ...row, formats: ['triples'] } : row) })
  .includes('invalid-lane:current'));
assert.equal(qualityGateFailed({ doubles: { validator_warnings: 0 } }, 0), false);
assert.equal(qualityGateFailed({ doubles: { validator_warnings: 1 } }, 0), true);
assert.equal(qualityGateFailed({ doubles: { validator_errors: 1, validator_warnings: 0 } }, 0), true);
console.log('Accuracy harness: deterministic seeds and non-vacuous HP/identity checks passed.');
