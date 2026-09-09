import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const baseline = require('../generated/pokemon_showdown_legal_data.js');
const review = JSON.parse(fs.readFileSync(new URL('../source/reg-m-b-identity-review.json', import.meta.url), 'utf8'));
function load(withBridge = true) {
  const ctx = vm.createContext({ console, require });
  for (const file of ['data.js', 'generated/pokemon_showdown_legal_data.js', ...(withBridge ? ['runtime_data.js'] : []), 'engine.js']) {
    vm.runInContext(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ctx);
  }
  const ui = fs.readFileSync(new URL('../ui.js', import.meta.url), 'utf8');
  for (const [start, end] of [['getPokemonTypes', 'renderRoster'], ['getEffectiveSpe', 'renderSpeedTiersForGrid'], ['computeThreatLevel', 'renderMetaRadar']]) {
    vm.runInContext(ui.slice(ui.indexOf(`function ${start}(`), ui.indexOf(`function ${end}(`)), ctx);
  }
  vm.runInContext('this.Pokemon = Pokemon; this._escapeHtml = s => String(s);', ctx);
  return ctx;
}
const context = load();
const member = (name, overrides = {}) => ({ name, nature: 'Hardy', ability: 'Flower Veil', item: '', evs: {}, moves: ['Protect'], ...overrides });
test('all official mapped keys use mirrored roster types and engine Speed stats', () => {
  for (const row of review.rows) {
    const name = row.runtime_species_key;
    const source = baseline.species[name];
    const set = member(name, { ability: source.abilities['0'] });
    const mon = new context.Pokemon(set, '', 'champions');
    assert.deepEqual(Array.from(context.getPokemonTypes(name)), source.types, name);
    assert.equal(context.getEffectiveSpe(set, 'champions'), mon.baseSpe, name);
  }
});
test('speed nature and SP format follow the engine instead of a duplicate table', () => {
  assert.equal(context.getEffectiveSpe(member('Vivillon-Fancy'), 'champions'), 109);
  assert.equal(context.getEffectiveSpe(member('Floette-Eternal'), 'champions'), 112);
  assert.equal(context.getEffectiveSpe(member('Arcanine', { nature: 'Modest', evs: { spe: 32 } }), 'champions'), 147);
  for (const nature of ['Modest', 'Adamant', 'Bold', 'Impish', 'Careful', 'Calm', 'Timid', 'Quiet']) {
    for (const format of ['champions', 'sv']) {
      const set = member('Arcanine', { nature, evs: { spe: format === 'champions' ? 32 : 252 } });
      assert.equal(context.getEffectiveSpe(set, format), new context.Pokemon(set, '', format).baseSpe, nature + '/' + format);
    }
  }
});
test('supported Eternal Flower aliases resolve exactly with or without runtime bridge', () => {
  for (const ctx of [context, load(false)]) {
    for (const name of ['Floette-Eternal', 'Floette (Eternal Flower)', 'Eternal Flower Floette']) {
      const mon = new ctx.Pokemon(member(name), '', 'champions');
      assert.equal(mon._base.spa, 125, name);
      assert.deepEqual(Array.from(mon.types), ['Fairy'], name);
      assert.equal(mon.ability, 'Flower Veil');
    }
  }
});
test('unknown roster facts remain unknown rather than Normal or zero', () => {
  assert.deepEqual(Array.from(context.getPokemonTypes('Unknown species')), []);
  assert.equal(context.getEffectiveSpe(member('Unknown species'), 'champions'), null);
  assert.equal(context.getEffectiveSpe(member('Arcanine', { evs: { spe: 252 } }), 'champions'), null);
  for (const format of ['garbage', '', 'Champions']) {
    assert.equal(context.getEffectiveSpe(member('Arcanine'), format), null);
    assert.equal(context.getEffectiveSpe(member('Arcanine', { format })), null);
  }
});

test('species-only radar cannot infer speed advantage or matchup safety', () => {
  context.getActivePlayerTeam = () => ({ format: 'champions', members: [member('Arcanine', { nature: 'Modest', moves: ['Crunch'] })] });
  assert.equal(context.getEffectiveSpe(context.getActivePlayerTeam().members[0], 'champions'), 115);
  assert.equal(context.getEffectiveSpe(member('Gengar'), 'champions'), 130);
  assert.equal(context.computeThreatLevel({ name: 'Gengar', types: ['Ghost', 'Poison'] }), 'radar-unknown');
});
test('Speed stat list discloses field/item exclusions and no unknown numeric rank', () => {
  const html = context.buildSpeedTierHTML([member('Floette-Eternal', { item: 'Choice Scarf' }), member('Unknown species')], 'champions');
  assert(/Speed Stats/.test(html));
  assert(/Unknown/.test(html));
  assert(!/\b0<\/span>/.test(html));
});
