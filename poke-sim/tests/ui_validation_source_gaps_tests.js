const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

function harness(realSources = false) {
  const file = path.join(__dirname, 't9j11_tests.js');
  const source = fs.readFileSync(file, 'utf8');
  const marker = '// Expose ctx-scoped';
  assert(source.includes(marker));
  const host = vm.createContext({ require: createRequire(file), __dirname, console,
    setTimeout, setInterval, clearTimeout, clearInterval });
  vm.runInContext(source.slice(0, source.indexOf(marker)) + '\nthis.context = ctx;', host);
  const ctx = host.context;
  if (realSources) return ctx;
  vm.runInContext(`
    validateTeam = function() { return { valid: true, errors: [], warnings: [] }; };
    ChampionsSim.moveLegality = {
      validateMovesForSet: function(m) { return m.moves.map(function(move) { return {legal:true, moveName:move}; }); },
      validateAbilityForSet: function() { return {legal:true}; }
    };
  `, ctx);
  return ctx;
}
const member = { name: 'Incineroar', ability: 'Intimidate', item: '', nature: 'Hardy',
  level: 50, evs: {}, moves: ['Protect'] };
const team = { name: 'Source gap', format: 'champions', legality_status: 'legal', members: [member] };
function unverified(verdict) {
  assert.equal(verdict.valid, false);
  assert.equal(verdict.sourceVerified, false);
  assert.equal(verdict.errors.length, 0, 'Source gaps are not proven illegal sets');
  assert(verdict.warnings.length > 0);
}

test('missing team validator cannot trust legal metadata', () => {
  const ctx = harness();
  vm.runInContext('validateTeam = undefined;', ctx);
  unverified(ctx.getTeamLegalityVerdict('gap', team));
  unverified(ctx.buildImportedTeamValidation([member], { format: 'champions' }));
});

test('Mega registration accepts matching-stone base ability without weakening exact-form checks', () => {
  const ctx = harness(true);
  const catalog = vm.runInContext('TEAMS.mega_altaria', ctx);
  const altaria = catalog.members.find(m => m.name === 'Altaria-Mega');
  assert(altaria);
  assert.equal(altaria.ability, 'Cloud Nine');
  assert.equal(altaria.item, 'Altarianite');
  const before = JSON.stringify(catalog);
  const check = overrides => ctx.collectTeamMoveLegalityIssues({ ...catalog, members: [{ ...altaria, ...overrides }] });
  assert.equal(check({}).length, 0);
  assert.equal(check({ ability: 'Pixilate' }).length, 0);
  for (const overrides of [{ ability: 'Intimidate' }, { item: '' }, { item: 'Charizardite X' },
    { ability: 'Pixilate', item: '' }, { ability: 'Pixilate', item: 'Charizardite X' }]) {
    assert(check(overrides).some(row => row.severity === 'error'), JSON.stringify(overrides));
  }
  assert.equal(ctx.getTeamLegalityVerdict('mega_altaria', catalog).valid, true);
  assert.equal(JSON.stringify(catalog), before);
});

test('throwing or malformed team validator is unchecked', () => {
  for (const code of ['throw new Error("offline")', 'return {}', 'return null', 'return {valid:false,errors:[]}']) {
    const ctx = harness();
    vm.runInContext('validateTeam = function(){' + code + '};', ctx);
    unverified(ctx.getTeamLegalityVerdict('gap', team));
    unverified(ctx.buildImportedTeamValidation([member], { format: 'champions' }));
  }
});

test('missing, incomplete or unchecked move results cannot establish verification', () => {
  for (const code of ['undefined', 'function(){throw new Error("offline");}',
    'function(){return [];}', 'function(){return null;}',
    'function(){return [{legal:true,verification_status:"unchecked"}];}']) {
    const ctx = harness();
    vm.runInContext('ChampionsSim.moveLegality.validateMovesForSet = ' + code + ';', ctx);
    unverified(ctx.buildImportedTeamValidation([member], { format: 'champions' }));
    unverified(ctx.getTeamLegalityVerdict('gap', team));
  }
});

test('valid source version and per-member hard errors survive collection', () => {
  const ctx = harness();
  vm.runInContext(`ChampionsSim.moveLegality.validateAbilityForSet = function(){
    return {legal:true,sourceVersion:'test-pin'};
  };`, ctx);
  assert.equal(ctx.buildImportedTeamValidation([member], { format: 'champions' }).sourceVersion, 'test-pin');
  vm.runInContext(`ChampionsSim.moveLegality.validateMovesForSet = function(){
    return [{legal:false,moveName:'Protect',reason:'not_in_species_form_learnset',notes:'Test rejection'}];
  };`, ctx);
  const verdict = ctx.buildImportedTeamValidation([member], { format: 'champions' });
  assert.equal(verdict.valid, false);
  assert.equal(verdict.sourceVerified, true);
  assert.match(verdict.errors.join(' '), /Test rejection/);
  assert.equal(verdict.memberWarnings['0'][0].severity, 'error');
});

test('missing, unchecked, empty or throwing ability checks block verified admission', () => {
  for (const code of ['undefined', 'function(){return {legal:false,reason:"source_unavailable"};}',
    'function(){return {legal:true,verification_status:"unchecked"};}',
    'function(){return null;}', 'function(){throw new Error("offline");}']) {
    const ctx = harness();
    vm.runInContext('ChampionsSim.moveLegality.validateAbilityForSet = ' + code + ';', ctx);
    unverified(ctx.buildImportedTeamValidation([member], { format: 'champions' }));
    unverified(ctx.getTeamLegalityVerdict('gap', team));
  }
});

test('confirmed ability rejection stays an error; known valid checks pass', () => {
  const ctx = harness();
  assert.equal(ctx.buildImportedTeamValidation([member], { format: 'champions' }).valid, true);
  assert.equal(ctx.getTeamLegalityVerdict('gap', team).valid, true);
  vm.runInContext('ChampionsSim.moveLegality.validateAbilityForSet = function(){return {legal:false,reason:"not_in_species_form_abilities",notes:"Wrong ability"};};', ctx);
  for (const verdict of [ctx.buildImportedTeamValidation([member], { format: 'champions' }), ctx.getTeamLegalityVerdict('gap', team)]) {
    assert.equal(verdict.valid, false);
    assert.equal(verdict.sourceVerified, true);
    assert.match(verdict.errors.join(' '), /Wrong ability/);
  }
});
