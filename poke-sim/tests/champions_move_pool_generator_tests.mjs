import assert from 'node:assert/strict';
import vm from 'node:vm';
import { test } from 'node:test';
import { buildMovePools, checkArtifact, loadInputs, main, renderMovePools } from '../tools/generate-champions-move-pools.mjs';

const inputs = loadInputs();
const payload = buildMovePools(inputs);
const body = renderMovePools(payload);

test('contract covers every mirrored identity without a regulation whitelist', () => {
  assert.equal(payload.schema_version, 'champions-inherited-move-pools-v1');
  assert.equal(payload.mod, 'champions');
  assert.equal(payload.reference.version, '0.11.11');
  assert.equal(payload.competitive_use, false);
  assert.equal(payload.counts.input_rows, Object.keys(inputs.baseline.species).length);
  assert(payload.counts.input_rows > 235);
  for (const [key, row] of Object.entries(inputs.baseline.species)) {
    assert(payload.species[inputs.dex.toID(row.id || key)].source_keys.includes(key), key);
  }
});

test('every known row matches the exact pinned inherited pool and chain', () => {
  for (const [id, row] of Object.entries(payload.species)) {
    assert(['known', 'unavailable'].includes(row.status));
    if (row.status === 'unavailable') {
      assert(row.reason, id);
      assert.deepEqual(row.moves, [], id);
      continue;
    }
    assert.equal(inputs.dex.species.get(id).id, id);
    assert.deepEqual(row.moves, [...inputs.dex.species.getMovePool(id)].sort(), id);
    assert.deepEqual(row.inherited_from, [...new Set(inputs.dex.species.getFullLearnset(id).map(r => r.species.id))], id);
    assert.match(row.source_sha256, /^[a-f0-9]{64}$/);
  }
});

test('regression moves and form inheritance retain pinned source behavior', () => {
  for (const [id, move, accepted] of [
    ['incineroar', 'uturn', false], ['gholdengo', 'thunderwave', false],
    ['archaludon', 'bodypress', false], ['kingambit', 'suckerpunch', true],
    ['blastoise', 'waterspout', true], ['vivillonfancy', 'ragepowder', true],
    ['floetteeternal', 'batonpass', true], ['rotomwash', 'thunderbolt', true],
    ['rotomwash', 'hydropump', true]
  ]) assert.equal(payload.species[id].moves.includes(move), accepted, `${id}/${move}`);
  assert(payload.species.vivillonfancy.inherited_from.includes('vivillon'));
  assert(payload.species.rotomwash.inherited_from.includes('rotom'));
});

test('source IDs preserve canonical identity despite display aliases and input order', () => {
  const baseline = { species: {
    'Floette (Eternal Flower)': { id: 'floetteeternal' },
    'Fancy label': { id: 'vivillonfancy' },
    'Floette-Eternal': { id: 'floetteeternal' }
  } };
  const result = buildMovePools({ ...inputs, baseline });
  assert.deepEqual(Object.keys(result.species), ['floetteeternal', 'vivillonfancy']);
  assert.deepEqual(result.species.floetteeternal.source_keys, ['Floette (Eternal Flower)', 'Floette-Eternal']);
  const reversed = { species: Object.fromEntries(Object.entries(baseline.species).reverse()) };
  assert.equal(renderMovePools(result), renderMovePools(buildMovePools({ ...inputs, baseline: reversed })));
});

test('unknown and virtual Mega identities never borrow a base pool', () => {
  const result = buildMovePools({ ...inputs, baseline: { species: {
    'Unknown': { id: 'notarealspecies' },
    'Floette (Eternal Flower)-Mega': { id: 'floetteeternalflowermega' }
  } } });
  for (const row of Object.values(result.species)) {
    assert.equal(row.status, 'unavailable');
    assert.deepEqual(row.moves, []);
    assert(row.reason);
  }
});

test('empty or failed reference learnsets stay unavailable; exact alias mismatch rejects', () => {
  for (const mode of ['empty', 'throw', 'alias']) {
    const dex = { currentMod: 'champions', toID: inputs.dex.toID, species: {
      get: () => ({ exists: true, id: mode === 'alias' ? 'other' : 'test' }),
      getFullLearnset: () => { if (mode === 'throw') throw new Error('No source'); return []; },
      getMovePool: () => { throw new Error('Must not reach pool lookup'); }
    } };
    const row = buildMovePools({ ...inputs, dex, baseline: { species: { Test: { id: 'test' } } } }).species.test;
    assert.equal(row.status, 'unavailable');
    assert.deepEqual(row.moves, []);
    assert.equal(row.reason, mode === 'alias' ? 'reference_identity_mismatch' : mode === 'empty' ? 'missing_full_reference_learnset' : 'reference_learnset_error');
  }
});

test('pin, mod, inventory and CLI errors fail closed', () => {
  assert.throws(() => buildMovePools({ ...inputs, reference: { version: '0.11.12' } }), /Expected pokemon-showdown/);
  assert.throws(() => buildMovePools({ ...inputs, dex: { currentMod: 'gen9' } }), /Champions dex/);
  assert.throws(() => buildMovePools({ ...inputs, baseline: { species: {} } }), /inventory/);
  assert.throws(() => main(['--promote']), /Usage/);
});

test('browser and CommonJS exports share the exact generated payload', () => {
  const browser = vm.createContext({});
  const commonjs = vm.createContext({ module: { exports: {} } });
  vm.runInContext(body, browser);
  vm.runInContext(body, commonjs);
  assert.equal(JSON.stringify(browser.ChampionsSim.championsMovePools), JSON.stringify(commonjs.module.exports));
  assert.equal(commonjs.module.exports, commonjs.ChampionsSim.championsMovePools);
});

test('generation and check are deterministic with input-only fingerprints', () => {
  assert.equal(renderMovePools(buildMovePools(loadInputs())), body);
  for (const hash of Object.values(payload.source_hashes)) assert.match(hash, /^[a-f0-9]{64}$/);
  assert(!body.includes('generated_at'));
  checkArtifact(body);
  assert.throws(() => checkArtifact(body + '\n'), /missing or stale/);
  main(['--check']);
});
