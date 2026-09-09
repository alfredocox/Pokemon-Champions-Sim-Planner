import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const baseline = require('../generated/pokemon_showdown_legal_data.js');
const source = fs.readFileSync(new URL('../move_legality.js', import.meta.url), 'utf8');
const artifactPath = new URL('../generated/champions_move_pools.js', import.meta.url);
const champions = { learnsetContext: 'champions' };
const historical = { learnsetContext: 'historical' };
function load(pools, data = baseline) {
  const ctx = vm.createContext({ ChampionsSim: { pokemonDataAudit: data, championsMovePools: pools } });
  vm.runInContext(source, ctx);
  return ctx.ChampionsSim.moveLegality;
}
function generated() {
  assert(fs.existsSync(artifactPath), 'Generated Champions move pools must be built before this suite');
  return require('../generated/champions_move_pools.js');
}

test('seven reproduced pool mismatches use the explicit Champions context', () => {
  const api = load(generated());
  for (const [species, move, legal] of [
    ['Incineroar', 'U-turn', false], ['Gholdengo', 'Thunder Wave', false],
    ['Archaludon', 'Body Press', false], ['Kingambit', 'Sucker Punch', true],
    ['Blastoise', 'Water Spout', true], ['Vivillon-Fancy', 'Rage Powder', true],
    ['Floette-Eternal', 'Baton Pass', true]
  ]) {
    const verdict = api.isMoveLegalForSpecies(species, move, champions);
    assert.equal(verdict.legal, legal, species + '/' + move);
    assert.equal(verdict.verification_status, 'known');
  }
});

test('historical semantics require explicit context and disclaim current approval', () => {
  const api = load(null);
  const verdict = api.isMoveLegalForSpecies('Incineroar', 'U-turn', historical);
  assert.equal(verdict.legal, true);
  assert.match(verdict.notes, /Historical.*not current SV or Champions approval/);
  assert.equal(api.isMoveLegalForSpecies('Incineroar', 'Splash', historical).legal, false);
  for (const opts of [undefined, {}, { learnsetContext: 'sv' }, { learnsetContext: '' }]) {
    const unknown = api.isMoveLegalForSpecies('Incineroar', 'U-turn', opts);
    assert.equal(unknown.legal, false);
    assert.equal(unknown.reason, 'learnset_context_unavailable');
    assert.equal(unknown.verification_status, 'unchecked');
    assert.equal(api.legalMoveDisplayNamesForSpecies('Incineroar', opts).length, 0);
  }
});

test('missing or incompatible Champions artifact never falls back', () => {
  const valid = generated();
  for (const artifact of [null, {}, { ...valid, schema_version: 'wrong' },
    { ...valid, mod: 'gen9' }, { ...valid, reference: { version: '0.11.10' } },
    { ...valid, species: {} },
    { ...valid, species: { incineroar: { reference_species_id: 'incineroar', status: 'unavailable', moves: [], inherited_from: [] } } },
    { ...valid, species: { incineroar: { reference_species_id: 'incineroar', status: 'known', moves: ['U-turn'], inherited_from: [] } } }
  ]) {
    const api = load(artifact);
    const verdict = api.isMoveLegalForSpecies('Incineroar', 'U-turn', champions);
    assert.equal(verdict.legal, false);
    assert.equal(verdict.reason, 'champions_pool_unavailable');
    assert.equal(verdict.verification_status, 'unchecked');
    assert.equal(api.resolveLearnsetPool('Incineroar', champions).status, 'unchecked');
    assert.equal(api.legalMoveDisplayNamesForSpecies('Incineroar', champions).length, 0);
  }
});

test('inherited pools and aliases retain exact identities without virtual Mega union', () => {
  const api = load(generated());
  for (const alias of ['Floette-Eternal', 'Floette (Eternal Flower)', 'Eternal Flower Floette']) {
    const pool = api.resolveLearnsetPool(alias, champions);
    assert.equal(pool.status, 'known');
    assert.equal(pool.referenceSpeciesId, 'floetteeternal');
    assert(pool.moves.includes('batonpass'));
  }
  assert(api.resolveLearnsetPool('Vivillon-Fancy', champions).inheritedFrom.includes('vivillon'));
  assert.equal(api.isMoveLegalForSpecies('Rotom-Wash', 'Thunderbolt', champions).legal, true);
  for (const name of ['Floette (Eternal Flower)-Mega', 'Floette-Eternal-Mega', 'NotAPokemon']) {
    assert.equal(api.isMoveLegalForSpecies(name, 'Protect', champions).reason, 'champions_pool_unavailable');
  }
});

test('listing and set validation share the Champions resolver across the roster', () => {
  const api = load(generated());
  const review = JSON.parse(fs.readFileSync(new URL('../source/reg-m-b-identity-review.json', import.meta.url)));
  for (const row of review.rows) {
    const name = row.runtime_species_key;
    const pool = api.resolveLearnsetPool(name, champions);
    assert.equal(pool.status, 'known', name);
    const names = Array.from(api.legalMoveDisplayNamesForSpecies(name, champions));
    assert.deepEqual(names.map(api.canonicalMoveId).sort(), Array.from(pool.moves).sort(), name);
    assert(api.validateMovesForSet({ name, moves: names }, champions).every(v => v.legal), name);
    const allowed = new Set(pool.moves);
    for (const id of Object.keys(baseline.moves)) {
      assert.equal(api.isMoveLegalForSpecies(name, id, champions).legal, allowed.has(id), name + '/' + id);
    }
    pool.moves.push('notarealmove');
    assert(!api.resolveLearnsetPool(name, champions).moves.includes('notarealmove'));
  }
});

test('CommonJS entry loads the generated artifact and requires explicit context', () => {
  const api = require('../move_legality.js');
  assert.equal(api.resolveLearnsetPool('Kingambit', champions).status, 'known');
  assert.equal(api.isMoveLegalForSpecies('Kingambit', 'Sucker Punch', champions).legal, true);
  assert.equal(api.isMoveLegalForSpecies('Kingambit', 'Sucker Punch').reason, 'learnset_context_unavailable');
});

test('ability API remains independent of learnset context and pool availability', () => {
  const api = load(null);
  assert.equal(api.isAbilityLegalForSpecies('Incineroar', 'Intimidate').legal, true);
  assert.equal(api.isAbilityLegalForSpecies('Incineroar', 'Levitate').legal, false);
  assert.equal(api.validateAbilityForSet({ name: 'Incineroar' }), null);
});

test('every mirrored runtime source key selects its exact available pinned pool', () => {
  const artifact = generated();
  const api = load(artifact);
  for (const [key, row] of Object.entries(baseline.species)) {
    const expected = artifact.species[row.id];
    const pool = api.resolveLearnsetPool(key, champions);
    assert.equal(pool.status, expected?.status === 'known' ? 'known' : 'unchecked', key);
    if (pool.status === 'known') {
      assert.equal(pool.referenceSpeciesId, row.id, key);
      assert.deepEqual(Array.from(pool.moves).sort(), [...expected.moves].sort(), key);
    }
  }
});

test('explicit male labels resolve to the pinned male identity, never the female pool', () => {
  const { Dex } = require('pokemon-showdown');
  const dex = Dex.mod('champions');
  const api = load(generated());
  for (const [alias, key] of [['Indeedee-M', 'Indeedee'], ['Meowstic-M', 'Meowstic'], ['Basculegion-M', 'Basculegion']]) {
    assert.equal(dex.species.get(alias).id, dex.species.get(key).id);
    assert.notEqual(dex.species.get(alias).id, dex.species.get(key + '-F').id);
    const pool = api.resolveLearnsetPool(alias, champions);
    assert.equal(pool.status, 'known', alias);
    assert.equal(pool.referenceSpeciesId, dex.species.get(alias).id, alias);
    assert.deepEqual(Array.from(pool.moves).sort(), [...dex.species.getMovePool(dex.species.get(alias).id)].sort());
  }
});

test('conflicting source IDs and gender evidence fail closed', () => {
  for (const id of ['gengar', 'Pikachu', '', null]) {
    const data = { ...baseline, species: { ...baseline.species, Pikachu: { ...baseline.species.Pikachu, id } } };
    assert.equal(load(generated(), data).resolveLearnsetPool('Pikachu', champions).status, 'unchecked');
  }
  const data = { ...baseline, species: { ...baseline.species, Indeedee: { ...baseline.species.Indeedee, gender: 'F' } } };
  assert.equal(load(generated(), data).resolveLearnsetPool('Indeedee-M', champions).status, 'unchecked');
});

test('pool row identity must match the requested source identity', () => {
  const artifact = generated();
  assert(artifact.species.gengar.moves.includes('shadowball'));
  const missing = { ...artifact.species.pikachu };
  delete missing.reference_species_id;
  for (const row of [artifact.species.gengar, missing,
    { ...artifact.species.pikachu, reference_species_id: 'gengar' },
    { ...artifact.species.pikachu, reference_species_id: 'Pikachu' },
    { ...artifact.species.pikachu, reference_species_id: null }
  ]) {
    const api = load({ ...artifact, species: { ...artifact.species, pikachu: row } });
    assert.equal(api.resolveLearnsetPool('Pikachu', champions).status, 'unchecked');
    const verdict = api.isMoveLegalForSpecies('Pikachu', 'Shadow Ball', champions);
    assert.equal(verdict.legal, false);
    assert.equal(verdict.verification_status, 'unchecked');
    assert.equal(verdict.reason, 'champions_pool_unavailable');
    assert.equal(api.legalMoveDisplayNamesForSpecies('Pikachu', champions).length, 0);
    assert(api.validateMovesForSet({ name: 'Pikachu', moves: ['Thunderbolt', 'Shadow Ball'] }, champions)
      .every(result => !result.legal && result.verification_status === 'unchecked'));
  }
});
