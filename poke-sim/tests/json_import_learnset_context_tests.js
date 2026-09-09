const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

// Reuse the full UI bootstrap without running its unrelated legacy assertions.
function harness() {
  const file = path.join(__dirname, 't9j11_tests.js');
  const source = fs.readFileSync(file, 'utf8');
  const marker = '// Expose ctx-scoped';
  assert(source.includes(marker), 'Review the shared UI bootstrap boundary');
  const host = vm.createContext({
    require: createRequire(file), __dirname, console,
    setTimeout, setInterval, clearTimeout, clearInterval
  });
  vm.runInContext(source.slice(0, source.indexOf(marker)) + '\nthis.context = ctx;', host);
  const ctx = host.context;
  vm.runInContext(`
    this.TEAMS = TEAMS;
    this.persistedImports = [];
    _upsertTeamToDB = function(key, team) { persistedImports.push({key: key, format: team.format}); };
    saveCustomTeamsToStorage = function() {};
  `, ctx);
  return ctx;
}

function member(move = 'Protect') {
  return {
    name: 'Incineroar', ability: 'Intimidate', item: '', nature: 'Hardy', level: 50,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: [move]
  };
}

function json(teams) {
  return JSON.stringify({ version: 1, teams });
}

test('JSON shared-move imports retain explicit SV and Champions context', () => {
  const ctx = harness();
  for (const format of ['sv', 'champions']) {
    const input = { name: 'Shared ' + format, format, members: [member()] };
    const before = JSON.stringify(input);
    const result = ctx.importFromJsonText(json({ input }));
    assert.equal(result.added, 1, JSON.stringify(result));
    assert.equal(ctx.TEAMS[result.keys[0]].format, format);
    assert.equal(ctx.persistedImports.at(-1).format, format);
    assert.equal(JSON.stringify(input), before);
  }
});

test('JSON export/import roundtrip preserves format and member data', () => {
  const ctx = harness();
  const original = ctx.importFromJsonText(json({
    sv: { name: 'SV roundtrip', format: 'sv', members: [member('U-turn')] },
    champions: { name: 'Champions roundtrip', format: 'champions', members: [member()] }
  }));
  assert.equal(original.added, 2, JSON.stringify(original));
  const exported = ctx.exportAllCustomAsJson();
  const restored = ctx.importFromJsonText(exported);
  assert.equal(restored.added, 2, JSON.stringify(restored));
  original.keys.forEach((key, i) => {
    const before = ctx.TEAMS[key], after = ctx.TEAMS[restored.keys[i]];
    assert.equal(after.format, before.format);
    assert.equal(JSON.stringify(after.members), JSON.stringify(before.members));
  });
});

test('JSON uses the declared pool, not a shared Champions default', () => {
  const ctx = harness();
  const result = ctx.importFromJsonText(json({
    sv: { name: 'SV U-turn', format: 'sv', members: [member('U-turn')] },
    champions: { name: 'Champions U-turn', format: 'champions', members: [member('U-turn')] }
  }));
  assert.equal(result.added, 1, JSON.stringify(result));
  assert.equal(result.skipped, 1);
  assert.equal(ctx.TEAMS[result.keys[0]].format, 'sv');
  assert.match(result.skippedErrors[0].errors.join(' '), /Champions|learnset/i);
});

test('missing and unknown JSON formats are explicitly rejected without persistence', () => {
  const ctx = harness();
  for (const format of [undefined, null, '', 'vgc', 'unknown', 'SV', 'Champions', 9]) {
    const before = Object.keys(ctx.TEAMS).length;
    const result = ctx.importFromJsonText(json({ invalid: {
      name: 'Unknown context', format, members: [member()]
    } }));
    assert.equal(result.added, 0, JSON.stringify({ format, result }));
    assert.equal(result.skipped, 1);
    assert.match(result.skippedErrors[0].errors.join(' '), /format/i);
    assert.equal(Object.keys(ctx.TEAMS).length, before);
    assert.equal(ctx.persistedImports.length, 0);
  }
});

test('mixed JSON keeps valid explicit contexts without admitting missing context', () => {
  const ctx = harness();
  const result = ctx.importFromJsonText(json({
    missing: { name: 'No format', members: [member()] },
    sv: { name: 'Explicit SV', format: 'sv', members: [member()] }
  }));
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 1);
  assert.equal(ctx.TEAMS[result.keys[0]].format, 'sv');
  assert.equal(ctx.persistedImports.length, 1);
});

test('Showdown text bulk intake retains its Champions default', () => {
  const ctx = harness();
  const parsed = ctx.parseMultiTeamShowdown('=== [Text import] ===\nIncineroar\nAbility: Intimidate\nLevel: 50\nHardy Nature\n- Protect\n');
  const result = ctx.importCustomTeamsBulk(parsed);
  assert.equal(result.added, 1, JSON.stringify(result));
  assert.equal(ctx.TEAMS[result.keys[0]].format, 'champions');
  const rejected = ctx.importCustomTeamsBulk([{ name: 'Bad explicit context', format: 'unknown', members: [member()] }]);
  assert.equal(rejected.added, 0);
  assert.match(rejected.skippedErrors[0].errors.join(' '), /format/i);
});

test('malformed JSON members skip before validation, before or after valid teams', () => {
  const ctx = harness();
  vm.runInContext(`
    this.validatedImports = [];
    this.originalImportValidator = buildImportedTeamValidation;
    buildImportedTeamValidation = function(members, opts) {
      validatedImports.push(opts.name);
      return originalImportValidator(members, opts);
    };
  `, ctx);
  const malformed = [
    null, 'Incineroar', 7, [], {},
    { ...member(), moves: 'Protect' },
    { ...member(), moves: null },
    { ...member(), moves: {} },
    { ...member(), moves: [null] },
    { ...member(), moves: [42] },
    { ...member(), moves: [{}] },
    { ...member(), name: null },
    { ...member(), name: ['Incineroar'] },
    { ...member(), ability: {} },
    { ...member(), item: [] },
    { ...member(), nature: 42 },
    { ...member(), evs: 'not a spread' },
    { ...member(), evs: [] },
    { ...member(), ivs: [] }
  ];
  for (const format of ['champions', 'sv']) {
    for (const invalid of malformed) {
      for (const invalidFirst of [false, true]) {
        const valid = { name: 'Valid shape', format, members: [member()] };
        const bad = { name: 'Malformed shape', format, members: [invalid] };
        const teams = invalidFirst ? { bad, valid } : { valid, bad };
        const before = Object.keys(ctx.TEAMS).length;
        const writesBefore = ctx.persistedImports.length;
        const checksBefore = ctx.validatedImports.length;
        let result;
        assert.doesNotThrow(() => { result = ctx.importFromJsonText(json(teams)); }, JSON.stringify({ invalid, invalidFirst, format }));
        assert.equal(result.added, 1, JSON.stringify(result));
        assert.equal(result.skipped, 1);
        assert.equal(result.skippedErrors.length, 1);
        assert.match(result.skippedErrors[0].errors.join(' '), /member|Pokemon|moves|spread/i);
        assert.equal(Object.keys(ctx.TEAMS).length, before + 1);
        assert.equal(ctx.persistedImports.length, writesBefore + 1);
        assert.equal(ctx.validatedImports.length, checksBefore + 1, 'Malformed members must not reach the validator');
        assert.equal(ctx.TEAMS[result.keys[0]].format, format);
      }
    }
  }
});

test('bulk member containers skip explicitly and continue with valid teams', () => {
  const ctx = harness();
  for (const members of [undefined, null, 'Incineroar', {}, [], [null]]) {
    const result = ctx.importCustomTeamsBulk([
      { name: 'Malformed first', format: 'champions', members },
      { name: 'Valid middle', format: 'champions', members: [member()] },
      { name: 'Malformed last', format: 'champions', members }
    ]);
    assert.equal(result.added, 1);
    assert.equal(result.skipped, 2);
    assert.equal(result.skippedErrors.length, 2);
    assert(result.skippedErrors.every(row => row.errors.length > 0));
  }
});
