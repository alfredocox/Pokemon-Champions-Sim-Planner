// RED contract for paste edits. Real UI handlers; no browser, network, or durable writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const clone = value => JSON.parse(JSON.stringify(value));

function harness() {
  const file = path.join(__dirname, 't9j11_tests.js');
  const source = fs.readFileSync(file, 'utf8');
  const boundary = source.indexOf('// Expose ctx-scoped');
  assert.ok(boundary > 0, 'Shared bootstrap boundary changed');
  const host = vm.createContext({
    require: createRequire(file), __dirname, console,
    setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, clearInterval() {}
  });
  vm.runInContext(source.slice(0, boundary) + '\nthis.context = ctx;', host);
  const ctx = host.context;
  vm.runInContext(`
    this.TEAMS = TEAMS;
    this.effects = { db: [], persist: [], network: [] };
    _upsertTeamToDB = function(key, team) { effects.db.push({key:key, team:JSON.parse(JSON.stringify(team))}); };
    saveCustomTeamsToStorage = function() { effects.persist.push('custom'); };
    savePreloadedOverride = function() { effects.persist.push('override'); };
    _openModalOverlay = function() {};
    _closeModalOverlay = function() {};
    renderTeamsGrid = function() {};
    renderRoster = function() {};
    renderEditorRoster = function() {};
    renderCoverageWidget = function() {};
    fetch = function(url) { effects.network.push(String(url)); throw new Error('Network forbidden'); };
    window.fetch = fetch;
    this.Event = function(type) { this.type = type; };
  `, ctx);
  const originalQuery = ctx.document.querySelector.bind(ctx.document);
  ctx.document.querySelector = selector => {
    if (selector === '.import-tab.active') return { dataset: { itab: 'paste' } };
    return originalQuery(selector);
  };
  const textarea = ctx.document.getElementById('showdown-paste');
  textarea.dispatchEvent = event => {
    for (const listener of textarea._listeners[event.type] || []) listener.call(textarea, event);
  };
  return ctx;
}

function member(name = 'Incineroar', id = 'member-incin', move = 'Protect') {
  return {
    name, member_id: id, ability: name === 'Pikachu' ? 'Static' : 'Intimidate',
    item: '', nature: 'Hardy', level: 50,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: [move],
    role: 'retained role ' + id, metadata: { origin: 'identity-fixture', token: id }
  };
}

function install(ctx, format, members) {
  const key = 'custom_paste_identity';
  ctx.TEAMS[key] = {
    name: 'Paste identity fixture', source: 'custom', format,
    team_id: 'stable-team-id', metadata: { origin: 'retained-team' }, members: clone(members)
  };
  ctx.openEditTeamModal(key);
  assert.equal(ctx.document.getElementById('import-slot').value, key);
  return key;
}

async function load(ctx, members) {
  const textarea = ctx.document.getElementById('showdown-paste');
  if (members) {
    textarea.value = ctx.exportTeamToPaste({ format: 'sv', members });
    textarea.dispatchEvent(new ctx.Event('input'));
  }
  const button = ctx.document.getElementById('do-import-btn');
  assert.equal(button._listeners.click.length, 1, 'Expected actual single Load Team handler');
  await button._listeners.click[0].call(button);
  assert.equal(ctx.effects.network.length, 0);
}

function identity(row) {
  return { member_id: row.member_id, role: row.role, metadata: clone(row.metadata || null) };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

for (const format of ['champions', 'sv']) {
  test('actual unchanged ' + format + ' edit retains team and member identity/metadata', async () => {
    const ctx = harness();
    const key = install(ctx, format, [member('Incineroar', 'member-incin', format === 'sv' ? 'U-turn' : 'Protect')]);
    const before = clone(ctx.TEAMS[key]);
    const original = ctx.TEAMS[key];
    await load(ctx);
    assert.match(ctx.document.getElementById('import-status').textContent, /Loaded/);
    assert.equal(ctx.TEAMS[key], original);
    assert.deepEqual({ format: original.format, team_id: original.team_id, metadata: clone(original.metadata) },
      { format: before.format, team_id: before.team_id, metadata: before.metadata });
    assert.deepEqual(identity(original.members[0]), identity(before.members[0]));
    assert.deepEqual(clone(original.members[0].moves), before.members[0].moves);
    assert.ok(ctx.effects.persist.length > 0, 'Successful save must reach mocked persistence');
  });
}

test('actual reorder retains each unique exact-species identity, not slot identity', async () => {
  const ctx = harness();
  const original = [member(), member('Pikachu', 'member-pika')];
  const key = install(ctx, 'sv', original);
  await load(ctx, original.slice().reverse());
  assert.match(ctx.document.getElementById('import-status').textContent, /Loaded/);
  assert.deepEqual(clone(ctx.TEAMS[key].members.map(row => ({ name: row.name, ...identity(row) }))),
    original.slice().reverse().map(row => ({ name: row.name, ...identity(row) })));
});

test('actual replacement receives new identity and does not inherit old role/metadata', async () => {
  const ctx = harness();
  const old = member();
  const key = install(ctx, 'sv', [old]);
  await load(ctx, [member('Pikachu', 'paste-id-not-exported')]);
  assert.match(ctx.document.getElementById('import-status').textContent, /Loaded/);
  const replacement = ctx.TEAMS[key].members[0];
  assert.equal(replacement.name, 'Pikachu');
  assert.ok(typeof replacement.member_id === 'string' && replacement.member_id.length > 0, 'Replacement needs a new durable member_id');
  assert.notEqual(replacement.member_id, old.member_id);
  assert.notEqual(replacement.role, old.role);
  assert.notDeepEqual(clone(replacement.metadata || null), old.metadata);
});

test('actual ambiguous previous duplicate species blocks atomically without persistence or DB', async () => {
  const ctx = harness();
  const key = install(ctx, 'sv', [member(), member('Incineroar', 'second-incin')]);
  const before = JSON.stringify(ctx.TEAMS[key]);
  // Incoming single-species roster is valid: ordinary Species Clause cannot mask reconciliation.
  await load(ctx, [member()]);
  assert.deepEqual({ unchanged: JSON.stringify(ctx.TEAMS[key]) === before,
    db: ctx.effects.db.length, persist: ctx.effects.persist.length },
    { unchanged: true, db: 0, persist: 0 });
  assert.match(ctx.document.getElementById('import-status').textContent, /ambig|duplicate|identity/i);
});

test('SV edit live preview and actual Load Team agree on historical U-turn membership', async () => {
  const ctx = harness();
  install(ctx, 'sv', [member('Incineroar', 'member-incin', 'U-turn')]);
  const flow = ctx.document.getElementById('import-flow-card').innerHTML;
  const errors = ctx.document.getElementById('preview-roster').innerHTML;
  assert.match(flow, /Ready to load/, errors);
  assert.doesNotMatch(flow, /Blocked until fixed/);
  assert.doesNotMatch(errors, /Pinned Champions inherited move pool/);
  await load(ctx);
  assert.match(ctx.document.getElementById('import-status').textContent, /Loaded/);
});

test('csReconcilePasteMembers returns valid/members/errors and preserves unique matches without mutating inputs', () => {
  const ctx = harness();
  assert.equal(typeof ctx.csReconcilePasteMembers, 'function');
  const previous = [member(), member('Pikachu', 'member-pika')];
  const incoming = clone(previous).reverse().map(({ member_id, role, metadata, ...row }) => row);
  const before = JSON.stringify({ previous, incoming });
  const result = ctx.csReconcilePasteMembers(previous, incoming);
  assert.equal(result.valid, true);
  assert.ok(Array.isArray(result.members));
  assert.ok(Array.isArray(result.errors));
  assert.equal(result.errors.length, 0);
  assert.deepEqual(clone(result.members.map(identity)), previous.slice().reverse().map(identity));
  assert.equal(JSON.stringify({ previous, incoming }), before);
});

test('csReconcilePasteMembers refuses ambiguity in previous or incoming species atomically', () => {
  const ctx = harness();
  assert.equal(typeof ctx.csReconcilePasteMembers, 'function');
  for (const [previous, incoming] of [
    [[member(), member('Incineroar', 'second-incin')], [member()]],
    [[member()], [member(), member('Incineroar', 'second-incin')]]
  ]) {
    const before = JSON.stringify({ previous, incoming });
    const result = ctx.csReconcilePasteMembers(previous, incoming);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.members));
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
    assert.equal(JSON.stringify({ previous, incoming }), before);
  }
});

test('identity conflicts and allocation collisions fail without changing inputs', () => {
  const ctx = harness();
  const old = [member(), member('Pikachu', 'member-pika')];
  for (const [previous, incoming, options] of [
    [[member(), member('Pikachu', 'member-incin')], [member()]],
    [old, [{ ...member(), species: 'Pikachu' }]],
    [[member()], [member('Pikachu')], { createId: () => 'member-incin' }]
  ]) {
    const before = JSON.stringify({ previous, incoming });
    assert.equal(ctx.csReconcilePasteMembers(previous, incoming, options).valid, false);
    assert.equal(JSON.stringify({ previous, incoming }), before);
  }
});

test('normalization retains member annotations and remains idempotent', () => {
  const ctx = harness();
  const row = member(); row.registered_slot = 4; row.source_note = 'historical annotation';
  const key = install(ctx, 'champions', [row]);
  ctx.normalizeTeamRecordForSim(key, ctx.TEAMS[key]);
  const first = JSON.stringify(ctx.TEAMS[key].members);
  ctx.normalizeTeamRecordForSim(key, ctx.TEAMS[key]);
  assert.equal(JSON.stringify(ctx.TEAMS[key].members), first);
  assert.equal(ctx.TEAMS[key].members[0].registered_slot, 4);
  assert.deepEqual(clone(ctx.TEAMS[key].members[0].metadata), row.metadata);
});

test('SV unchanged paste retains normalized Tera identity', async () => {
  const ctx = harness();
  const row = member('Incineroar', 'member-incin', 'U-turn'); row.teraType = 'Water';
  const key = install(ctx, 'sv', [row]);
  assert.match(ctx.document.getElementById('showdown-paste').value, /Tera Type: Water/);
  await load(ctx);
  assert.equal(ctx.TEAMS[key].members[0].teraType, 'Water');
  assert.equal(ctx.TEAMS[key].members[0].member_id, 'member-incin');
});

test('actual set editor preserves same-member identity but replaces species identity', () => {
  const ctx = harness();
  const key = install(ctx, 'champions', [member()]);
  vm.runInContext(`
    getEditablePlayerTeam = function(){ return TEAMS.custom_paste_identity; };
    csPersistEditedTeam = function(){ effects.persist.push('editor'); };
    csRefreshEditorTeamViews = function(){};
    editingIdx = 0;
  `, ctx);
  function fill(name, ability) {
    for (const [id, value] of Object.entries({ 'ed-name': name, 'ed-ability': ability, 'ed-item': '', 'ed-nature': 'Hardy', 'ed-level': '50', 'ed-role': '', 'ed-mv-0': 'Protect', 'ed-mv-1': '', 'ed-mv-2': '', 'ed-mv-3': '' })) ctx.document.getElementById(id).value = value;
    for (const stat of ['hp','atk','def','spa','spd','spe']) ctx.document.getElementById('ev-' + stat).value = '0';
  }
  fill('Incineroar', 'Intimidate'); ctx.saveEdits();
  assert.equal(ctx.TEAMS[key].members[0].member_id, 'member-incin');
  assert.equal(ctx.TEAMS[key].members[0].role, '');
  fill('Pikachu', 'Static'); ctx.saveEdits();
  const result = ctx.TEAMS[key].members[0];
  assert.notEqual(result.member_id, 'member-incin');
  assert.equal(result.species, 'Pikachu');
  assert.equal(result.metadata, undefined);
  assert.equal(ctx.effects.persist.length, 2);
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); console.log('PASS ' + name); }
    catch (error) { failed++; console.error('FAIL ' + name + '\n' + error.message); }
  }
  console.log(`${tests.length - failed} passed; ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})();
