import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { referenceIdentity } from '../tools/showdown-reference.mjs';
const require = createRequire(import.meta.url);
const { Dex } = require('pokemon-showdown');
const ledger = require('../regmb_source_conversion.js').CHAMPIONS_REGMB_SOURCE_CONVERSION;
const reference = referenceIdentity();
const dex = Dex.mod('champions');
assert.equal(reference.version, '0.11.11');
assert.equal(ledger.runtimePromotionAllowed, false);
assert.equal(ledger.megaImplementationRows.length, 16);
assert.equal(new Set(ledger.megaImplementationRows.map(row => row.megaForm)).size, 16);
for (const row of ledger.megaImplementationRows) {
  const species = dex.species.get(row.megaForm);
  assert(species.exists && species.isMega, row.megaForm);
  for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) assert.equal(row.baseStats[stat], species.baseStats[stat], `${row.megaForm} ${stat}`);
  assert.deepEqual(row.types, species.types, row.megaForm + ' types');
  assert.equal(row.ability, species.abilities['0'], row.megaForm + ' ability');
  assert.equal(row.requiredItem, species.requiredItem, row.megaForm + ' required item');
  const stone = dex.items.get(row.requiredItem);
  assert(stone.exists, row.requiredItem);
  assert.equal(typeof stone.megaStone, 'object', row.requiredItem + ' pinned owner map');
  assert.equal(stone.megaStone[species.baseSpecies], species.name, row.requiredItem + ' owner/target');
  const stoneRow = ledger.megaStoneRows.find(candidate => candidate.megaForm === row.megaForm);
  assert.equal(stoneRow?.itemName, row.requiredItem);
  assert.equal(row.runtimePromotable, false);
  console.log('PASS pinned Champions Mega field comparison: ' + row.megaForm);
}
console.log('16 Mega records agree with pinned baseline fields and stone ownership. Behavior and in-game legality are not certified.');
