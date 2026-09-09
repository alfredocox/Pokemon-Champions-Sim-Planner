import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const ctx = vm.createContext({ console });
for (const file of ['data.js', 'engine.js', 'generated/pokemon_showdown_legal_data.js']) {
  vm.runInContext(readFileSync(new URL(file, root), 'utf8'), ctx, { filename: file });
}
vm.runInContext('this.simulateBattle=simulateBattle; this.Pokemon=Pokemon; this.Field=Field;', ctx);
const member = (name, extra = {}) => ({ name, ability: '', item: '', nature: 'Hardy', level: 50,
  moves: ['Splash'], evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ...extra });
const team = members => ({ name: 'Isolated mechanics fixture', format: 'sv', members });
const artifacts = new URL('artifacts/accuracy-2026-08-30/boundaries/', root);
const capture = process.argv.includes('--capture');
if (capture) mkdirSync(artifacts, { recursive: true });
let passed = 0;
let failed = 0;
let current = '';
let runs = [];
function simulate(player, opponent, options = {}) {
  const opts = { format: 'doubles', maxTurns: 1, seed: [7, 11, 13, 17], ...options };
  const result = ctx.simulateBattle(team(player), team(opponent), opts);
  runs.push({ player, opponent, options: opts, result });
  return result;
}
function test(id, fn) {
  current = id;
  runs = [];
  try { fn(); passed++; console.log('PASS ' + id); }
  catch (error) { failed++; console.error('FAIL ' + id + ': ' + error.message); }
  if (capture) writeFileSync(new URL(current + '.json', artifacts), JSON.stringify({
    id, engine_sha256: createHash('sha256').update(readFileSync(new URL('engine.js', root))).digest('hex'),
    scope: 'Synthetic mechanics fixtures; not Champion team legality proof', runs
  }, null, 2) + '\n');
}
const row = (battle, side, name, when = 'pre', turn = 1) => battle.turnLog.find(t => t.turn === turn)[when].roster[side].find(m => m.species === name);

test('hospitality-both-sides', () => {
  const mons = [member('Sinistcha', { ability: 'Hospitality' }), member('Pikachu', { currentHp: 1 })];
  const b = simulate(mons, mons);
  assert.equal(row(b, 'player', 'Pikachu').hp, row(b, 'opponent', 'Pikachu').hp);
  assert.ok(row(b, 'player', 'Pikachu').hp > 20);
  assert.equal(b.log.filter(l => l.includes("Hospitality restored Pikachu")).length, 2);
});
test('hospitality-full-hp-and-no-ally', () => {
  const full = simulate([member('Sinistcha', { ability: 'Hospitality' }), member('Pikachu')], [member('Blissey')]);
  assert.ok(!full.log.some(l => l.includes('Hospitality restored')), 'full HP must not report healing');
  const solo = simulate([member('Sinistcha', { ability: 'Hospitality', currentHp: 1 })], [member('Blissey')], { format: 'singles' });
  assert.ok(!solo.log.some(l => l.includes('Hospitality restored')), 'no self healing in singles');
});
test('hospitality-heal-block-and-fainted-ally', () => {
  const blocked = [member('Sinistcha', { ability: 'Hospitality' }), member('Pikachu', { currentHp: 1, healBlockedTurns: 2 })];
  const b = simulate(blocked, blocked);
  assert.ok(!b.log.some(l => l.includes('Hospitality restored')));
  const fainted = [member('Pikachu', { currentHp: 1, status: 'poison', moves: ['Protect'] }),
    member('Abra', { currentHp: 1, status: 'poison', moves: ['Protect'] }), member('Sinistcha', { ability: 'Hospitality' })];
  const replacement = simulate(fainted, fainted);
  assert.ok(replacement.log.some(l => l.includes('Sinistcha was sent out')));
  assert.ok(!replacement.log.some(l => l.includes('Hospitality restored')), 'no healing the fainted ally');
});
test('hospitality-switch-entry-evidence', () => {
  const mons = [member('Abra', { moves: ['Teleport'] }), member('Pikachu', { currentHp: 1 }), member('Sinistcha', { ability: 'Hospitality' })];
  const b = simulate(mons, mons);
  const events = b.turnLog.find(t => t.turn === 1).effect_events.filter(e => e.effect_kind === 'ability-entry-heal');
  assert.equal(events.length, 2);
  for (const e of events) {
    assert.equal(e.heal_candidate, Math.floor(e.max_hp / 4));
    assert.equal(e.hp_after - e.hp_before, e.heal_applied);
    assert.ok(e.source_actor_key && e.actor_key);
  }
});

test('thousand-arrows-first-hit-neutral', () => {
  const attacker = new ctx.Pokemon(member('Garchomp'));
  const field = new ctx.Field({ format: 'singles' });
  field._ctx.captureDamageCalc = true;
  const target = new ctx.Pokemon(member('Charizard'));
  const damage = attacker.calcDamage('Thousand Arrows', target, field, null, () => 0.5);
  assert.ok(damage > 0, 'Flying must not block Thousand Arrows');
  assert.equal(field._ctx.lastDamageCalc.type_effectiveness, 1, 'first hit against airborne Fire/Flying must be neutral, not super effective');
});
test('thousand-arrows-spread-grounding-followup', () => {
  const b = simulate([member('Garchomp', { moves: ['Thousand Arrows', 'Earthquake'] }), member('Blissey')],
    [member('Charizard'), member('Rotom-Wash', { ability: 'Levitate' })], { maxTurns: 2,
      forcedActions: [1, 2].map(turn => ({ turn, side: 'player', slot: 0, move: turn === 1 ? 'Thousand Arrows' : 'Earthquake', targetSide: 'enemy', targetSlot: 0 })) });
  const t1 = b.turnLog.find(t => t.turn === 1);
  const t2 = b.turnLog.find(t => t.turn === 2);
  for (const name of ['Charizard', 'Rotom-Wash']) {
    assert.ok(t1.damage_events.some(e => e.move === 'Thousand Arrows' && e.target === name && e.applied_damage > 0));
    assert.ok(t1.effect_events.some(e => e.effect_kind === 'move-grounding' && e.actor === name));
    assert.ok(t2.damage_events.some(e => e.move === 'Earthquake' && e.target === name && e.applied_damage > 0));
  }
  assert.ok(!t1.damage_events.some(e => e.move === 'Thousand Arrows' && e.target === 'Blissey'), 'Arrows must not hit ally');
});
test('thousand-arrows-protect-no-grounding', () => {
  const b = simulate([member('Garchomp', { moves: ['Thousand Arrows'] })], [member('Charizard', { moves: ['Protect'] })], { format: 'singles' });
  assert.ok(!b.turnLog.find(t => t.turn === 1).effect_events.some(e => e.effect_kind === 'move-grounding'));
  assert.ok(b.log.some(l => l.includes('protected')));
});

test('thousand-arrows-substitute-no-grounding', () => {
  const b = simulate([member('Garchomp', { moves: ['Thousand Arrows'] })],
    [member('Charizard', { nature: 'Timid', moves: ['Substitute'], evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 } })],
    { format: 'singles' });
  assert.ok(b.log.some(l => l.includes('Substitute') && /absorbed|destroyed/.test(l)), 'substitute must actually take the hit');
  assert.ok(!b.turnLog.find(t => t.turn === 1).effect_events.some(e => e.effect_kind === 'move-grounding'));
});
test('thousand-arrows-grounding-ends-on-switch', () => {
  const b = simulate([member('Garchomp', { status: 'burn', moves: ['Thousand Arrows', 'Protect', 'Earthquake'] })],
    [member('Rotom-Wash', { ability: 'Levitate', nature: 'Bold', moves: ['Teleport'], evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 } }), member('Blissey', { moves: ['Teleport'] })],
    { format: 'singles', maxTurns: 3, forcedActions: ['Thousand Arrows', 'Protect', 'Earthquake'].map((move, i) =>
      ({ turn: i + 1, side: 'player', slot: 0, move, targetSide: 'enemy', targetSlot: 0 })) });
  assert.ok(b.turnLog.find(t => t.turn === 1).effect_events.some(e => e.effect_kind === 'move-grounding'));
  assert.ok(b.log.filter(l => l.includes('Rotom-Wash was sent out')).length > 0);
  assert.ok(b.turnLog.find(t => t.turn === 3).effect_events.some(e => e.effect_kind === 'ability-immunity' && e.ability === 'Levitate'));
});

test('priority-multihit-side-ability-blockers', () => {
  for (const ability of ['Armor Tail', 'Dazzling', 'Queenly Majesty']) {
    for (const move of ['Dual Wingbeat', 'Brave Bird']) {
      const b = simulate([member('Farigiraf', { ability }), member('Garchomp')],
        [member('Talonflame', { ability: 'Gale Wings', moves: [move] })],
        { forcedActions: [{ turn: 1, side: 'opponent', slot: 0, move, targetSide: 'enemy', targetSlot: 1 }] });
      assert.ok(b.log.some(l => l.includes(ability + ' blocked ' + move)));
      assert.ok(!b.turnLog[0].damage_events.some(e => e.move === move));
    }
  }
  const ordinary = simulate([member('Farigiraf', { ability: 'Armor Tail' }), member('Garchomp')],
    [member('Talonflame', { ability: 'Gale Wings', currentHp: 100, moves: ['Dual Wingbeat'] })], { seed: [1, 2, 3, 4] });
  assert.ok(ordinary.turnLog[0].damage_events.some(e => e.move === 'Dual Wingbeat'));
});
test('priority-multihit-terrain-and-quick-guard', () => {
  for (const blocker of [member('Indeedee-F', { ability: 'Psychic Surge' }), member('Farigiraf', { moves: ['Quick Guard'] })]) {
    const b = simulate([blocker, member('Garchomp')], [member('Talonflame', { ability: 'Gale Wings', moves: ['Dual Wingbeat'] })],
      { forcedActions: [{ turn: 1, side: 'opponent', slot: 0, move: 'Dual Wingbeat', targetSide: 'enemy', targetSlot: 1 }] });
    assert.ok(!b.turnLog[0].damage_events.some(e => e.move === 'Dual Wingbeat'));
    assert.ok(b.log.some(l => /Psychic Terrain blocked|Quick Guard blocked/.test(l)));
  }
});
test('priority-multihit-block-before-accuracy', () => {
  const b = simulate([member('Farigiraf', { ability: 'Armor Tail' }), member('Garchomp')],
    [member('Talonflame', { ability: 'Gale Wings', moves: ['Dual Wingbeat'] })], {
      seed: [2392748681, 3129703436, 3775593876, 2272258342],
      forcedActions: [{ turn: 1, side: 'opponent', slot: 0, move: 'Dual Wingbeat', targetSide: 'enemy', targetSlot: 1 }]
    });
  assert.ok(b.log.some(l => l.includes('Armor Tail blocked Dual Wingbeat')));
  assert.ok(!b.log.some(l => l.includes('Dual Wingbeat! It missed!')));
});
test('thousand-arrows-tera-flying', () => {
  const b = simulate([member('Garchomp', { item: 'Iron Ball', moves: ['Thousand Arrows'] })],
    [member('Pikachu', { tera: 'Flying', moves: ['Quick Attack'] })], { format: 'singles', allowTera: true });
  assert.ok(b.log.some(l => l.includes('Terastallized into Flying')));
  assert.ok(b.turnLog[0].damage_events.some(e => e.move === 'Thousand Arrows' && e.applied_damage > 0));
});
test('thousand-arrows-roost-defensive-type', () => {
  const b = simulate([member('Blissey', { moves: ['Thousand Arrows'] })],
    [member('Charizard', { currentHp: 100, moves: ['Roost'] })], { format: 'singles' });
  assert.ok(b.log.some(l => l.includes('restored HP with Roost')));
  assert.ok(b.turnLog[0].damage_events.some(e => e.move === 'Thousand Arrows' && e.applied_damage > 0));
  assert.ok(!b.turnLog[0].effect_events.some(e => e.effect_kind === 'move-grounding'));
});
test('thousand-arrows-no-grounding-before-protean-flying', () => {
  const b = simulate([member('Blissey', { moves: ['Thousand Arrows', 'Earthquake'], evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 252 } })],
    [member('Kecleon', { ability: 'Protean', moves: ['Aerial Ace'] })], { format: 'singles', maxTurns: 2,
      forcedActions: [{ turn: 1, side: 'player', slot: 0, move: 'Thousand Arrows' }, { turn: 2, side: 'player', slot: 0, move: 'Earthquake' }] });
  assert.ok(b.turnLog[0].damage_events.some(e => e.move === 'Thousand Arrows'));
  assert.ok(!b.turnLog[0].effect_events.some(e => e.effect_kind === 'move-grounding'));
  assert.ok(!b.turnLog[1].damage_events.some(e => e.move === 'Earthquake'));
  assert.ok(b.log.some(l => l.includes('Earthquake had no effect')));
});

console.log(`Accuracy boundaries: ${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
