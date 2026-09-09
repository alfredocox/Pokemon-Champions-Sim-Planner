import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Dex } = require('pokemon-showdown');
const baseline = require('../generated/pokemon_showdown_legal_data.js');
const review = JSON.parse(fs.readFileSync(new URL('../source/reg-m-b-identity-review.json', import.meta.url), 'utf8'));
assert.equal(require('pokemon-showdown/package.json').version, '0.11.11');
assert.equal(review.competitive_use, false);
assert.equal(review.approval_status, 'unapproved');
assert.equal(review.rows.length, 235);
for (const row of review.rows) {
  const key = row.runtime_species_key;
  assert(key, `${row.official_id}: unresolved identity`);
  const local = baseline.species[key];
  const reference = Dex.mod('champions').species.get(key);
  assert(reference.exists, `${key}: missing reference`);
  assert.equal(local.num, reference.num, `${key}: National Dex number`);
  assert.deepEqual(local.stats, reference.baseStats, `${key}: base stats`);
  assert.deepEqual(local.types, reference.types, `${key}: types`);
  assert.deepEqual(local.abilities, reference.abilities, `${key}: ability slots`);
}
console.log('PASS 235 mapped roster rows match pinned Champions baseline stats/types/abilities/number; no learnset, regulation or in-game approval');
