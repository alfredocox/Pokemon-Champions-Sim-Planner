'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = vm.createContext({ console, require, Math, setTimeout });
for (const file of ['data.js', 'engine.js', 'generated/pokemon_showdown_legal_data.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx, { filename: file });
}
const names = ['Pikachu', 'Raichu', 'Blissey', 'Snorlax', 'Incineroar', 'Whimsicott'];
function team(format = 'champions') {
  return { name: 'Synthetic identity fixture', format, members: names.map((name, i) => ({
    name, member_id: 'registered-' + i, item: ['Sitrus Berry', 'Leftovers', 'Focus Sash', 'Charcoal', 'Soft Sand', 'Choice Scarf'][i],
    ability: '', nature: 'Hardy', level: 50, moves: ['Protect'], evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    currentHp: i < 2 ? 1 : undefined, status: i < 2 ? 'poison' : null
  })) };
}
let failed = 0;
function test(name, fn) { try { fn(); console.log('PASS ' + name); } catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); } }
function run(opts = {}, format = 'champions') {
  return ctx.simulateBattle(team(format), team(format), Object.assign({ format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 3 }, opts));
}
function participantsAgree(battle, expected) {
  for (const side of ['player', 'opponent']) {
    assert.equal(battle.bring[side].length, expected);
    assert.equal(battle.participants[side].length, expected);
    assert.deepEqual(Array.from(battle.bring[side]), Array.from(battle.participants[side], m => m.name));
    assert.ok(battle.turnLog.length > 0, 'must exercise actual turns');
    assert.ok(Object.keys(battle.turnLog[0].pre.hp_pct_stable).length >= expected, 'nonempty identity snapshot');
    for (const member of battle.participants[side]) {
      assert.equal(member.member_id, 'registered-' + member.team_slot);
      assert.equal(member.item, team().members[member.team_slot].item);
    }
    const selected = new Set(battle.participants[side].map(m => m.stable_key));
    for (const turn of battle.turnLog) for (const snapshot of [turn.pre, turn.post]) {
      for (const key of Object.keys(snapshot.hp_pct_stable || {})) {
        if (key.startsWith(side + ':')) assert.ok(selected.has(key), 'unselected actor ' + key);
      }
    }
  }
}
test('Champion omitted bring uses exactly four per side through double faint replacements', () => {
  const battle = run();
  participantsAgree(battle, 4);
  assert.ok(battle.log.filter(line => /fainted/.test(line)).length >= 4, 'both leads on both sides must faint');
  assert.ok(battle.turnLog[1].pre.active.player.includes('Blissey'), 'a selected reserve actually enters');
  assert.ok(!battle.turnLog.some(turn => turn.pre.active.player.includes('Incineroar')), 'fifth member never enters');
});
test('Champion legacy leads reorder registered identities and retain only four', () => {
  const result = run({ playerLeads: [names[5], names[4]], opponentLeads: [names[4], names[5]] });
  participantsAgree(result, 4);
  assert.equal(result.participants.player[0].team_slot, 5);
  assert.equal(result.participants.player[0].item, 'Choice Scarf');
  assert.equal(result.participants.opponent[0].team_slot, 4);
});
test('explicit player selection also caps omitted opponent selection', () => participantsAgree(run({ playerBring: [names[4], names[5], names[0], names[1]] }), 4));
test('duplicate/unknown short selections pad once using registered members', () => {
  const result = run({ playerBring: [names[4], names[4], 'unknown'] });
  participantsAgree(result, 4);
  assert.equal(new Set(result.bring.player).size, 4);
});
test('Champion singles defaults to three without changing doubles ownership', () => participantsAgree(run({ format: 'singles' }), 3));
test('generic six-member fixtures remain six and report actual participants', () => participantsAgree(run({}, 'sv'), 6));
test('seeded bring/identity evidence is reproducible', () => assert.equal(JSON.stringify(run()), JSON.stringify(run())));
test('missing, empty, and short teams keep error/diagnostic paths usable', () => {
  assert.doesNotThrow(() => ctx.simulateBattle({ format: 'champions', members: [] }, team(), { seed: [1, 2, 3, 4], maxTurns: 1 }));
  assert.doesNotThrow(() => ctx.simulateBattle(undefined, team(), { seed: [1, 2, 3, 4], maxTurns: 1 }));
  assert.doesNotThrow(() => ctx.simulateBattle(team(), undefined, { seed: [1, 2, 3, 4], maxTurns: 1 }));
  const short = team(); short.members = short.members.slice(0, 2);
  const battle = ctx.simulateBattle(short, short, { seed: [1, 2, 3, 4], maxTurns: 1 });
  assert.equal(battle.participants.player.length, 2);
});
test('role-aware opening ranks only the selected roster', () => {
  const battle = run({ roleAwareOpeners: true });
  participantsAgree(battle, 4);
  assert.ok(battle.leads.player.every(name => battle.bring.player.includes(name)));
});
test('registered IDs keep their items when the registered roster itself is reordered', () => {
  const reordered = team(); reordered.members.reverse();
  const result = ctx.simulateBattle(reordered, team(), { format: 'doubles', seed: [3, 4, 5, 6], maxTurns: 1 });
  assert.equal(result.participants.player[0].member_id, 'registered-5');
  assert.equal(result.participants.player[0].item, 'Choice Scarf');
});
test('registered Mega names select the original slot on either side, not a filler', () => {
  const roster = team();
  roster.members[5] = Object.assign({}, roster.members[5], { name: 'Altaria-Mega', item: 'Altarianite', ability: 'Cloud Nine' });
  const before = JSON.stringify(roster);
  const bring = ['Altaria-Mega', 'Blissey', 'Snorlax', 'Incineroar'];
  const result = ctx.simulateBattle(roster, roster, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 2, playerBring: bring, opponentBring: bring });
  for (const side of ['player', 'opponent']) {
    assert.deepEqual(Array.from(result.participants[side], m => m.team_slot), [5, 2, 3, 4]);
    assert.equal(result.participants[side][0].member_id, 'registered-5');
    assert.equal(result.participants[side][0].item, 'Altarianite');
  }
  assert.equal(JSON.stringify(roster), before);
});
test('registered base form wins over an earlier Mega runtime-name alias', () => {
  const roster = team();
  roster.members[0] = Object.assign({}, roster.members[0], { name: 'Altaria-Mega', item: 'Altarianite', ability: 'Cloud Nine' });
  roster.members[5] = Object.assign({}, roster.members[5], { name: 'Altaria', item: '', ability: 'Cloud Nine' });
  const bring = ['Altaria', 'Blissey', 'Snorlax', 'Incineroar'];
  const result = ctx.simulateBattle(roster, roster, { format: 'doubles', seed: [1, 2, 3, 4], maxTurns: 1, playerBring: bring, opponentBring: bring });
  for (const side of ['player', 'opponent']) assert.deepEqual(Array.from(result.participants[side], m => m.team_slot), [5, 2, 3, 4]);
  roster.members[5].name = 'Altaria-Mega';
  roster.members[5].item = 'Altarianite';
  assert.throws(() => ctx.simulateBattle(roster, roster, { format: 'doubles', playerBring: bring }), /Ambiguous registered Pokemon/);
});
process.exitCode = failed ? 1 : 0;
