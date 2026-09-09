import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';
import { compareProbe, loadLocalEngine, referenceIdentity } from '../tools/showdown-reference.mjs';

const local = loadLocalEngine();
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field;', local.context);
const evidence = [];
const artifact = process.env.SEISMIC_TOSS_REPORT;
if (artifact) process.on('exit', () => fs.writeFileSync(artifact, JSON.stringify({
  reference: referenceIdentity(), local_hashes: local.hashes,
  scope: 'Synthetic headless doubles Seismic Toss; not regulation approval or completed games',
  probes: evidence
}, null, 2) + '\n'));

for (const boundary of ['ordinary', 'ghost', 'protect', 'unseen-fist', 'parental-bond']) {
  for (const reversed of [false, true]) {
    test(`Seismic Toss ${boundary}, attacker on ${reversed ? 'opponent' : 'player'}`, () => {
      const fixture = referenceProbes().find(p => p.id === 'seismic-toss-fixed-damage');
      fixture.id = `seismic-${boundary}-${reversed ? 'opponent' : 'player'}`;
      // Attack the protected partner to isolate fixed damage from the known Leer disagreement.
      fixture.opponent.members[0].moves = ['Thunderbolt', 'Protect'];
      fixture.turns[0].opponent[0] = {move: 'Thunderbolt', targetSlot: 1, targetSide: 'foe'};
      if (boundary === 'ghost') {
        [fixture.opponent.members[0], fixture.opponent.members[2]] = [fixture.opponent.members[2], fixture.opponent.members[0]];
        fixture.opponent.members[0].moves = ['Thunderbolt'];
      }
      if (boundary === 'protect') fixture.turns[0].opponent[0] = {move: 'Protect'};
      if (boundary === 'unseen-fist') {
        fixture.player.members[0].ability = 'Unseen Fist';
        fixture.turns[0].opponent[0] = {move: 'Protect'};
      }
      if (boundary === 'parental-bond') fixture.player.members[0].ability = 'Parental Bond';
      if (reversed) {
        [fixture.player, fixture.opponent] = [fixture.opponent, fixture.player];
        [fixture.turns[0].player, fixture.turns[0].opponent] = [fixture.turns[0].opponent, fixture.turns[0].player];
      }
      const result = compareProbe(fixture, local);
      evidence.push(result);
      assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
      const side = reversed ? 'player' : 'opponent';
      const turn = result.local.turnLog[0];
      const before = turn.pre.roster[side].find(m => m.teamSlot === 0);
      const after = turn.post.roster[side].find(m => m.teamSlot === 0);
      const expectedDamage = boundary === 'parental-bond' ? 100 : ['ordinary', 'unseen-fist'].includes(boundary) ? 50 : 0;
      assert.equal(before.hp_current - after.hp_current, expectedDamage);
      assert.ok(!result.local.log.some(line => line.includes('critical hit')));
      if (expectedDamage > 0) {
        const hits = turn.damage_events.filter(row => row.move === 'Seismic Toss');
        assert.equal(hits.length, boundary === 'parental-bond' ? 2 : 1);
        for (const hit of hits) {
          assert.equal(hit.calculated_damage, 50);
          assert.equal(hit.applied_damage, 50);
          assert.equal(hit.critical, false);
        }
      }
    });
  }
}

function pokemon(name, level = 50) {
  return new local.context.Pokemon({name, level, ability: '', item: '', nature: 'Hardy',
    moves: ['Seismic Toss'], evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}}, 'champions');
}

test('level-based preview ignores ordinary damage modifiers and consumes no damage/crit RNG', () => {
  for (const level of [1, 37, 50, 100]) {
    for (const types of [['Fire'], ['Normal'], ['Psychic'], ['Rock', 'Steel']]) {
      const attacker = pokemon('Machamp', level);
      const target = pokemon('Arcanine');
      const field = new local.context.Field({format: 'doubles'});
      attacker.statBoosts.atk = -6; target.statBoosts.def = 6;
      attacker.status = 'burn'; attacker.helpingHand = true; attacker.item = 'Black Belt';
      target.types = types; target.side = {reflect: 5, auroraVeil: 5};
      for (const forceCrit of [false, true]) {
        field._ctx.forceCrit = forceCrit;
        let rolls = 0;
        assert.equal(attacker.calcDamage('Seismic Toss', target, field, null, () => {rolls++; return 0;}), level);
        assert.equal(rolls, 0);
        assert.equal(!!field._ctx.lastWasCrit, false);
      }
    }
  }
});

test('Ghost, Tera Ghost, Scrappy and type changes use the immunity boundary', () => {
  const attacker = pokemon('Machamp');
  const target = pokemon('Gengar');
  const field = new local.context.Field({format: 'doubles'});
  assert.equal(attacker.calcDamage('Seismic Toss', target, field, null, () => 0), 0);
  attacker.ability = 'Scrappy';
  assert.equal(attacker.calcDamage('Seismic Toss', target, field, null, () => 0), 50);
  attacker.ability = '';
  target.teraActivated = true; target.tera = 'Normal';
  assert.equal(attacker.calcDamage('Seismic Toss', target, field, null, () => 0), 50);
  target.tera = 'Ghost';
  assert.equal(attacker.calcDamage('Seismic Toss', target, field, null, () => 0), 0);
});

for (const boundary of ['hp-cap', 'focus-sash', 'sturdy', 'substitute']) {
  for (const reversed of [false, true]) {
    test(`applied damage respects ${boundary}, attacker on ${reversed ? 'opponent' : 'player'}`, () => {
      const fixture = referenceProbes().find(p => p.id === 'seismic-toss-fixed-damage');
      const target = fixture.opponent.members[0];
      target.moves = ['Thunderbolt'];
      if (boundary === 'hp-cap') target.currentHp = 30;
      if (boundary === 'focus-sash' || boundary === 'sturdy') {
        fixture.player.members[0].level = 100;
        target.name = 'Diglett';
        target.evs.hp = 0;
        target.item = boundary === 'focus-sash' ? 'Focus Sash' : '';
        target.ability = boundary === 'sturdy' ? 'Sturdy' : 'Flash Fire';
      }
      if (boundary === 'substitute') target.substituteHp = 20;
      if (reversed) [fixture.player, fixture.opponent] = [fixture.opponent, fixture.player];
      const attackingSide = reversed ? 'opponent' : 'player';
      const defendingSide = reversed ? 'player' : 'opponent';
      const battle = local.context.simulateBattle(fixture.player, fixture.opponent, {
        format: 'doubles', seed: [123, 456, 789, 42], maxTurns: 1,
        forcedActions: [
          {turn: 1, side: attackingSide, slot: 0, move: 'Seismic Toss', targetSlot: 0, targetSide: 'enemy'},
          {turn: 1, side: defendingSide, slot: 0, move: 'Thunderbolt', targetSlot: 1, targetSide: 'enemy'},
          ...['player', 'opponent'].map(side => ({turn: 1, side, slot: 1, move: 'Protect'}))
        ]
      });
      const turn = battle.turnLog[0];
      const before = turn.pre.roster[defendingSide].find(m => m.teamSlot === 0);
      const after = turn.post.roster[defendingSide].find(m => m.teamSlot === 0);
      const hit = turn.damage_events.find(row => row.move === 'Seismic Toss');
      if (boundary === 'substitute') {
        assert.equal(after.hp_current, before.hp_current);
        assert.ok(battle.log.some(line => line.includes("Arcanine's Substitute was destroyed")));
        assert.equal(hit, undefined, 'substitute damage must not be logged as body HP loss');
      } else {
        const expectedDamage = boundary === 'hp-cap' ? 50 : 100;
        assert.equal(after.hp_current, boundary === 'hp-cap' ? 0 : 1);
        assert.equal(hit.calculated_damage, expectedDamage);
        assert.equal(hit.applied_damage, before.hp_current - after.hp_current);
        assert.equal(hit.overkill_damage, expectedDamage - hit.applied_damage);
        assert.equal(hit.damage_kind, 'fixed_or_direct');
        assert.equal(hit.critical, false);
      }
    });
  }
}
