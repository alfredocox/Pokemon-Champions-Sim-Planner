import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const ctx = vm.createContext({ console });
for (const file of ['data.js', 'generated/pokemon_showdown_legal_data.js', 'generated/champions_move_pools.js', 'generated/pokemon_showdown_species_weights.js', 'runtime_data.js', 'engine.js', 'rulesets.js', 'legality.js', 'move_legality.js']) {
  vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), ctx, { filename: file });
}
const team = vm.runInContext('JSON.parse(JSON.stringify(TEAMS.player))', ctx);
// Hold move availability constant in regulation/identity contract fixtures.
// The shipped player's historical Incineroar moves are tested separately below.
team.members.forEach(member => { member.moves = ['Protect']; });
const ma = 'champions_reg_m_a_2026', mb = 'champions_reg_m_b_2026', mc = 'champions_reg_m_c_2026', practice = 'champions_custom_practice';
const check = (t, id = ma, opts = { format: 'doubles', bo: 3 }) => ctx.checkTeamForSelectedRegulation(t, id, opts);
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
test('historical preflight does not claim complete mechanics verification', () => {
  const result = check(team);
  assert.equal(result.allowed, false, JSON.stringify(result));
  assert.equal(result.status, 'not_verified');
  assert.equal(result.regulation_id, ma);
  assert.equal(result.mechanics_status, 'not_verified');
});
test('unknown and review-only regulations reject without historical fallback', () => {
  for (const id of [mb, mc, '', 'unknown', 'constructor']) {
    const result = check(team, id); assert.equal(result.allowed, false); assert.equal(result.status, 'not_verified');
  }
});
test('dated coverage honors the M-B extension without promoting legality', () => {
  const during = ctx.getChampionsRegulationCoverage('2026-08-30T12:00:00Z');
  assert.equal(during.status, 'source_review');
  assert.equal(during.regulation_id, mb);
  const after = ctx.getChampionsRegulationCoverage('2026-09-03T12:00:00Z');
  assert.equal(after.status, 'source_review');
  assert.equal(after.covered, false);
  assert.equal(after.regulation_id, mb);
  assert.equal(ctx.getChampionsRegulationCoverage('2026-09-09T01:59:00Z').regulation_id, mb);
  assert.equal(ctx.getChampionsRegulationCoverage('2026-09-09T02:00:00Z').regulation_id, mc);
  assert.equal(ctx.getChampionsRegulationCoverage('not-a-date').status, 'invalid_date');
});
test('rechecking another regulation never rewrites original team identity or items', () => {
  const before = JSON.stringify(team); check(team, mb); check(team, ma);
  assert.equal(JSON.stringify(team), before);
});
test('moves and abilities must belong to the species', () => {
  for (const change of [m => m.moves = ['Spore'], m => m.ability = 'Overgrow']) {
    const t = structuredClone(team); change(t.members[0]);
    assert.equal(check(t).status, 'illegal');
  }
});
test('historical Incineroar moves cannot enter Champions practice through legacy tags', () => {
  const original = vm.runInContext('JSON.parse(JSON.stringify(TEAMS.player))', ctx);
  const before = JSON.stringify(original);
  const result = check(original, practice);
  assert.equal(result.allowed, false);
  assert(result.errors.some(error => error.includes('U-turn')));
  assert(result.errors.some(error => error.includes('Knock Off')));
  assert.equal(JSON.stringify(original), before);
});
test('Mega display names can retain valid pre-Mega registration abilities with their stone', () => {
  const t = vm.runInContext('JSON.parse(JSON.stringify(TEAMS.mega_altaria))', ctx);
  const before = JSON.stringify(t);
  assert.equal(check(t, practice).allowed, true, JSON.stringify(check(t, practice)));
  assert.equal(JSON.stringify(t), before);
  const mon = t.members.find(m => m.name === 'Altaria-Mega');
  mon.item = 'Leftovers';
  assert.equal(check(t, practice).allowed, false);
  mon.item = 'Altarianite'; mon.ability = 'Overgrow';
  assert.equal(check(t, practice).allowed, false);
  mon.item = ''; mon.ability = 'Pixilate';
  assert.equal(check(t, practice).allowed, false);
});
test('four participants must be distinct registered Pokemon', () => {
  const names = team.members.slice(0, 4).map(m => m.name);
  assert.equal(check(team, practice, { bring: names }).allowed, true);
  for (const bring of [names.slice(0, 3), [names[0], names[0], names[2], names[3]], ['Unknown', ...names.slice(1)]]) {
    assert.equal(check(team, practice, { bring }).allowed, false);
  }
});
test('invalid stats and absent regulation items cannot pass', () => {
  for (const change of [m => m.evs.hp = 252, m => m.item = 'NotAnItem']) {
    const t = structuredClone(team); change(t.members[0]); assert.equal(check(t).status, 'illegal');
  }
});
test('unsupported match formats are not promoted as competitive evidence', () => {
  assert.equal(check(team, ma, { format: 'singles', bo: 3 }).allowed, false);
  assert.equal(check(team, ma, { format: 'doubles', bo: 5 }).allowed, false);
});
test('empty inputs and missing source API fail closed', () => {
  assert.equal(check({ format: 'champions', members: [] }).allowed, false);
  const api = ctx.ChampionsSim.moveLegality;
  ctx.ChampionsSim.moveLegality = null;
  assert.equal(check(team).status, 'not_verified');
  ctx.ChampionsSim.moveLegality = api;
});
test('editor choices are species-specific and review data is not called available', () => {
  const moves = ctx.getRegulationChoices('move', 'Incineroar', practice, false);
  assert.ok(moves.length > 0);
  assert.ok(!moves.some(m => m.name === 'Spore'));
  const abilities = ctx.getRegulationChoices('ability', 'Incineroar', practice, false);
  assert.ok(abilities.some(a => a.name === 'Intimidate'));
  assert.ok(!abilities.some(a => a.name === 'Overgrow'));
  for (const kind of ['species', 'item', 'move', 'ability']) {
    assert.equal(ctx.getRegulationChoices(kind, 'Incineroar', ma, false).length, 0);
    assert.equal(ctx.getRegulationChoices(kind, 'Incineroar', mb, false).length, 0);
    const review = ctx.getRegulationChoices(kind, 'Incineroar', mb, true);
    assert.ok(review.length > 0, kind);
    assert.ok(review.every(r => r.status === 'not_verified'));
  }
});
test('practice is explicit and cannot produce trusted regulation evidence', () => {
  const result = check(team, practice);
  assert.equal(result.allowed, true);
  assert.equal(result.status, 'experimental');
  assert.equal(result.competitive_eligible, false);
  assert.equal(ctx.getRulesetEvidencePolicy(practice).runtime_promotable, false);
});
test('malformed nature, level, moves and missing stat evidence block practice too', () => {
  for (const change of [m => m.nature = 'NotANature', m => m.level = 100, m => m.moves = [''], m => m.moves = ['Protect','protect'], m => delete m.evs]) {
    const t = structuredClone(team); change(t.members[0]); assert.equal(check(t, practice).allowed, false);
  }
});
test('malformed imported containers fail closed without throwing', () => {
  for (const members of [null, {}, 'invalid', [null], [42], [{ name: 42, moves: [] }], [{ name: 'Incineroar', moves: [42] }]]) {
    const result = check({ format: 'champions', members }, practice);
    assert.equal(result.allowed, false);
    assert.equal(result.status, 'illegal');
  }
});
test('Species Clause identifies base, Mega and regional forms by National Dex number', () => {
  for (const pair of [['Altaria-Mega', 'Altaria'], ['Raichu', 'Raichu-Alola']]) {
    const t = structuredClone(team);
    t.members[0].name = pair[0]; t.members[1].name = pair[1];
    const result = check(t, practice);
    assert.equal(result.allowed, false);
    assert.ok(result.errors.some(e => /Species Clause/.test(e)));
  }
});
test('move choices name the Champions pool source rather than the historical mirror', () => {
  const choices = ctx.getRegulationChoices('move', 'Incineroar', practice, false);
  assert(choices.length > 0);
  assert(choices.every(row => row.source === 'champions-inherited-move-pools-v1' && row.source_version === '0.11.11'));
  const unknown = ctx.getRegulationChoices('move', 'No Such Species', mb, true);
  assert(unknown.length > 0);
  assert(unknown.every(row => row.source === 'unavailable' && row.source_version === null && row.status === 'not_verified'));
});
console.log(`Regulation selection: ${count}/${count} passed`);
