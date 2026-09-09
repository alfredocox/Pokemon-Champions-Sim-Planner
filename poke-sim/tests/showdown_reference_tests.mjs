import assert from 'node:assert/strict';
import { referenceIdentity, resolveFormat, mapTeam, validateReferenceTeam, runReferenceProbe, loadLocalEngine, compareProbe } from '../tools/showdown-reference.mjs';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
const probes = referenceProbes();
test('exact package pin and all declared doubles formats exist', () => {
  assert.equal(referenceIdentity().version, '0.11.11');
  assert.equal(resolveFormat('gen9championsvgc2026regmb').mod, 'champions');
  assert.equal(resolveFormat('gen9championsvgc2026regma').mod, 'championsregma');
  assert.throws(() => resolveFormat('gen9championsvgc2026regmb-typo'));
  assert.throws(() => resolveFormat('gen9championscustomgame'));
});
test('SP translation preserves values, order and caller input', () => {
  const before = JSON.stringify(probes[0].player);
  const rows = mapTeam(probes[0].player, 'p1', probes[0].formatId);
  assert.equal(rows[0].evs.hp, 32);
  assert.equal(rows[0].name, 'p1m1');
  assert.equal(rows[1].name, 'p1m2');
  assert.equal(JSON.stringify(probes[0].player), before);
});
test('unknown species/moves, ambiguous stats and old EV units fail closed', () => {
  for (const mutate of [t => t.format = 'sv', t => t.members[0].name = 'NotAPokemon',
    t => t.members[0].moves = ['NotAMove'], t => t.members[0].evs.hp = 252,
    t => t.members[0].sps = { ...t.members[0].evs }, t => delete t.members[0].level]) {
    const t = structuredClone(probes[0].player); mutate(t);
    assert.equal(validateReferenceTeam(t, probes[0].formatId).status, 'unsupported_input');
  }
});
test('synthetic scope cannot be mistaken for a rated-format probe', () => {
  assert.throws(() => runReferenceProbe({ ...probes[0], synthetic: false }), /synthetic/);
});

test('probe intake preserves unsupported input instead of inventing a legality rejection', () => {
  for (const side of ['player', 'opponent']) {
    const fixture = structuredClone(probes[0]);
    delete fixture[side].members[0].level;
    const before = JSON.stringify(fixture);
    const result = runReferenceProbe(fixture);
    assert.equal(result.status, 'unsupported_input');
    assert.equal(result.completed_games, 0);
    assert.equal(result.frames, undefined);
    assert.equal(result.validations[side === 'player' ? 0 : 1].status, 'unsupported_input');
    assert.equal(JSON.stringify(fixture), before);
  }
});

test('completed reference rejection remains distinct, including mixed unsupported intake', () => {
  const acceptedTeam = JSON.parse(JSON.stringify(loadLocalEngine().context.TEAMS.player));
  assert.equal(acceptedTeam.members.length, 6);
  assert.equal(acceptedTeam.members[0].name, 'Incineroar');
  // Test-only control: a fully accepted six-member team, not an edit to the catalog.
  acceptedTeam.members[0].moves = ['Fake Out', 'Flare Blitz'];
  for (const formatId of ['gen9championsvgc2026regma', 'gen9championsvgc2026regmb']) {
    assert.equal(validateReferenceTeam(acceptedTeam, formatId).status, 'accepted_by_reference');
    for (const move of ['U-turn', 'Knock Off']) {
      for (const rejectedSide of ['player', 'opponent']) {
        const fixture = { ...structuredClone(probes[0]), formatId, synthetic: false,
          player: structuredClone(acceptedTeam), opponent: structuredClone(acceptedTeam) };
        fixture[rejectedSide].members[0].moves = [move];
        const rejectedIndex = rejectedSide === 'player' ? 0 : 1;
        const otherIndex = 1 - rejectedIndex;
        const otherSide = rejectedSide === 'player' ? 'opponent' : 'player';
        const before = JSON.stringify(fixture);
        const rejected = runReferenceProbe(fixture);
        assert.equal(rejected.status, 'rejected');
        assert.equal(rejected.validations[rejectedIndex].status, 'rejected');
        assert.equal(rejected.validations[otherIndex].status, 'accepted_by_reference');
        assert.ok(rejected.validations[rejectedIndex].errors.some(error => error.includes(move)));
        assert.equal(rejected.completed_games, 0);
        assert.equal(rejected.frames, undefined);
        assert.equal(JSON.stringify(fixture), before);
        delete fixture[otherSide].members[0].level;
        const mixed = runReferenceProbe(fixture);
        assert.equal(mixed.status, 'unsupported_input');
        assert.equal(mixed.validations[rejectedIndex].status, 'rejected');
        assert.equal(mixed.validations[otherIndex].status, 'unsupported_input');
        assert.equal(mixed.completed_games, 0);
        assert.equal(mixed.frames, undefined);
      }
    }
  }
});
test('reference executes real Protect events and keeps a bounded probe out of game totals', () => {
  const result = runReferenceProbe(probes[0]);
  assert.equal(result.status, 'probe_complete');
  assert.equal(result.frames.length, 1);
  assert.equal(result.completed_games, 0);
  assert.ok(result.frames[0].protocol.some(line => line.includes('|-activate|') && line.includes('Protect')));
  assert.deepEqual(result.initial.p1.map(m => m.key), ['p1m1', 'p1m2', 'p1m3', 'p1m4']);
});
test('invalid scripted moves and ambiguous targets reject instead of falling back to a bot', () => {
  const f = structuredClone(probes[0]); f.turns[0].player[0].move = 'Tackle';
  assert.throws(() => runReferenceProbe(f), /not on the actor/);
  const g = structuredClone(probes[0]); delete g.turns[0].player[0].targetSlot;
  assert.throws(() => runReferenceProbe(g), /Explicit target/);
});
test('reference seed repeats state and protocol excluding wall-clock messages', () => {
  const a = runReferenceProbe(probes[1]); const b = runReferenceProbe(probes[1]);
  const normalized = result => result.frames.map(f => ({ ...f, protocol: f.protocol.filter(line => !line.startsWith('|t:|')) }));
  assert.deepEqual(normalized(a), normalized(b));
});
test('a deliberately invalid Incineroar U-turn set is rejected by the pinned validator', () => {
  const team = structuredClone(probes[0].player);
  Object.assign(team.members[0], { name: 'Incineroar', ability: 'Intimidate', moves: ['U-turn'] });
  const result = validateReferenceTeam(team, 'gen9championsvgc2026regma');
  assert.equal(result.status, 'rejected');
  assert.ok(result.errors.some(message => message.includes('U-turn')));
});

test('comparison rejects mirror-name ambiguity and incomplete bring-four mappings', () => {
  const f = structuredClone(probes[0]); f.opponent.members[0] = structuredClone(f.player.members[0]);
  assert.throws(() => compareProbe(f, loadLocalEngine()), /globally unique/);
  const g = structuredClone(probes[0]); g.player.members.pop();
  assert.throws(() => compareProbe(g, loadLocalEngine()), /four members/);
});

test('missing, duplicate and incomplete roster evidence cannot pass', () => {
  for (const corrupt of [s => s.roster.player = [], s => s.roster.player[1] = s.roster.player[0], s => delete s.roster.player[0].hp_current]) {
    const local = loadLocalEngine(); const simulate = local.context.simulateBattle;
    local.context.simulateBattle = (...args) => { const result = simulate(...args); corrupt(result.turnLog[0].pre); return result; };
    assert.throws(() => compareProbe(probes[0], local), /roster/);
  }
});

test('accepted stat-point aliases produce identical local and reference inputs', () => {
  const expected = compareProbe(probes[0], loadLocalEngine());
  for (const alias of ['sps', 'spread']) {
    const f = structuredClone(probes[0]);
    for (const t of [f.player, f.opponent]) for (const m of t.members) { m[alias] = m.evs; delete m.evs; }
    const result = compareProbe(f, loadLocalEngine());
    assert.deepEqual(result.canonical_input, expected.canonical_input);
    assert.deepEqual(result.differences, expected.differences);
  }
});

test('unsupported initial HP, status and other battle state reject explicitly', () => {
  for (const field of ['hp', 'currentHp', 'status', 'statBoosts', 'teraType', 'gender', 'weightkg']) {
    const t = structuredClone(probes[0].player); t.members[0][field] = field === 'status' ? 'poison' : 1;
    const result = validateReferenceTeam(t, probes[0].formatId);
    assert.equal(result.status, 'unsupported_input');
    assert.match(result.errors[0], /Unsupported member field/);
  }
});

test('exact action order does not claim parity for independent random speed ties', () => {
  const f = structuredClone(probes[0]); f.opponent.members[0].evs.spe = 17;
  assert.throws(() => compareProbe(f, loadLocalEngine()), /Tied-speed/);
});

test('the comparator catches injected HP and stat-stage corruption', () => {
  const local = loadLocalEngine();
  const simulate = local.context.simulateBattle;
  local.context.simulateBattle = (...args) => {
    const result = simulate(...args);
    const row = result.turnLog[0].post.roster.player[0];
    row.hp_current--;
    result.turnLog[0].post.stat_boosts_stable[row.stableKey] = { atk: 6, acc: 2, eva: -1 };
    return result;
  };
  const f = { ...probes[0], compareBoosts: true };
  const result = compareProbe(f, local);
  assert.equal(result.status, 'mismatch');
  assert.ok(result.differences.some(d => d.kind === 'post_hp'));
  assert.ok(result.differences.some(d => d.kind === 'stat_stages'));
  const stages = result.differences.find(d => d.kind === 'stat_stages');
  assert.deepEqual(stages.local, [6, 0, 0, 0, 0, 2, -1]);
});

test('spread probe actually checks damaged opponents and an unharmed flying ally', () => {
  const result = compareProbe(probes[4], loadLocalEngine());
  assert.ok(result.comparisons.includes('expected_hp_change_sign'));
  assert.ok(!result.differences.some(d => d.kind.includes('hp_change_sign')));
  const f = structuredClone(probes[4]); f.hpChange.player[1] = -1;
  const wrong = compareProbe(f, loadLocalEngine());
  assert.ok(wrong.differences.some(d => d.kind === 'local_hp_change_sign'));
  assert.ok(wrong.differences.some(d => d.kind === 'reference_hp_change_sign'));
});
test('Eerie Spell and Spite PP totals agree with the pinned reference', () => {
  const fixture = referenceProbes().find(probe => probe.id === 'eerie-spell-spite-pp-drain');
  assert.ok(fixture);
  const result = compareProbe(fixture, loadLocalEngine());
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  assert.ok(result.comparisons.includes('move_pp'));
  assert.ok(result.reference.frames[0].protocol.some(line => line.includes('|-activate|') && line.includes('Eerie Spell')));
  assert.ok(result.reference.frames[0].protocol.some(line => line.includes('|-activate|') && line.includes('Spite')));
});
test('comparison retains both logs and never converts disagreement into agreement', () => {
  const local = loadLocalEngine();
  const result = compareProbe(probes[0], local);
  assert.ok(result.reference.raw_protocol.length > 0);
  assert.ok(result.local.turnLog.length > 0);
  assert.equal(result.status, result.differences.length ? 'mismatch' : 'agreement_in_declared_scope');
  assert.ok(result.comparisons.includes('initial_stats'));
});
console.log(`Showdown reference: ${count}/${count} passed`);
