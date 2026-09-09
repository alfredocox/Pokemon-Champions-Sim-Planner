import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadLocalEngine, compareProbe } from '../tools/showdown-reference.mjs';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';

const local = loadLocalEngine();
const splash = () => ({ move: 'Splash' });
function fixture(move, ability, targetAbility, substitute, swapped) {
  const f = referenceProbes()[0];
  f.id = `pp-boundary-${move}-${ability}-${targetAbility}-${substitute}-${swapped}`;
  f.player.members[0] = { ...f.player.members[0], name: 'Dusclops', ability, moves: ['Splash', move] };
  f.player.members[1].moves = ['Splash'];
  f.opponent.members[0] = { ...f.opponent.members[0], name: targetAbility === 'Dark-type' ? 'Umbreon' : 'Pikachu', ability: targetAbility === 'Dark-type' ? 'Synchronize' : targetAbility, moves: ['Splash', 'Substitute'] };
  f.opponent.members[1].moves = ['Splash'];
  // Avoid duplicate bench Pikachu after changing the lead's identity.
  f.opponent.members[3] = { ...f.opponent.members[3], name: 'Raichu', ability: 'Static' };
  f.comparePP = true;
  f.compareExactHP = move === 'Spite';
  f.turns = [
    { player: [splash(), splash()], opponent: [{ move: substitute ? 'Substitute' : 'Splash' }, splash()] },
    { player: [{ move, targetSlot: 0, targetSide: 'foe' }, splash()], opponent: [splash(), splash()] }
  ];
  if (swapped) {
    [f.player, f.opponent] = [f.opponent, f.player];
    for (const turn of f.turns) [turn.player, turn.opponent] = [turn.opponent, turn.player];
  }
  return f;
}

for (const swapped of [false, true]) {
  test(`Soundproof foe does not cancel Perish Song for the field, swapped=${swapped}`, () => {
    const f = fixture('Perish Song', 'Pressure', 'Soundproof', false, swapped);
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert(result.local.log.some(line => line.includes('sang a Perish Song!')));
    assert(result.reference.raw_protocol.some(line => line.includes('|-fieldactivate|move: Perish Song')));
    // This guards the new global cancellation regression, not countdown parity.
  });
  test(`Soundproof foe does not block Clangorous Soul, swapped=${swapped}`, () => {
    const f = fixture('Clangorous Soul', 'Pressure', 'Soundproof', false, swapped);
    f.compareBoosts = true;
    f.compareExactHP = true;
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    const ref = result.reference.frames[1].post[swapped ? 'p2' : 'p1'][0];
    for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) assert.equal(ref.boosts[stat], 1);
    const cost = result.local.turnLog[1].effect_events.find(event => event.effect_kind === 'hp-cost-stat-boost');
    assert.equal(cost.rule.numerator, 33);
    assert.equal(cost.rule.denominator, 100);
    assert.equal(cost.hp_cost, Math.floor(ref.maxhp * cost.rule.numerator / cost.rule.denominator));
  });
  for (const protectedTarget of [false, true]) test(`Noble Roar stage/Protect boundary, protected=${protectedTarget}, swapped=${swapped}`, () => {
    const f = fixture('Noble Roar', 'Pressure', 'Static', false, swapped);
    const target = swapped ? 'player' : 'opponent';
    f[target].members[0].moves.push('Protect');
    if (protectedTarget) f.turns[1][target][0] = { move: 'Protect' };
    f.compareBoosts = true;
    f.compareExactHP = true;
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    const ref = result.reference.frames[1].post[swapped ? 'p1' : 'p2'][0];
    assert.equal(ref.boosts.atk, protectedTarget ? 0 : -1);
    assert.equal(ref.boosts.spa, protectedTarget ? 0 : -1);
  });
  for (const move of ['Taunt', 'Encore']) test(`Protect blocks ${move} behind Substitute, swapped=${swapped}`, () => {
    const f = fixture(move, 'Pressure', 'Static', true, swapped);
    const actor = swapped ? 'opponent' : 'player';
    const target = swapped ? 'player' : 'opponent';
    f[target].members[0].moves.push('Protect');
    f.turns[1][target][0] = { move: 'Protect' };
    f.turns.push({ [actor]: [splash(), splash()], [target]: [splash(), splash()] });
    f.compareExactHP = true;
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert(!result.local.log.some(line => line.includes('fell for the Taunt!') || line.includes('got an Encore!')));
    assert(!result.reference.raw_protocol.some(line => line.includes('|-start|') && (line.includes('|move: Taunt') || line.includes('|Encore'))));
    const pp = result.local.turnLog[2].post.roster[target][0].move_pp.Splash;
    assert.equal(pp.current, pp.max - 1, 'target must execute Splash after the protected turn');
  });
  for (const [ability, item] of [['Pressure', ''], ['Mold Breaker', 'Ability Shield']]) test(`Soundproof blocks Parting Shot through Substitute: ${ability}/${item}, swapped=${swapped}`, () => {
    const f = fixture('Parting Shot', ability, 'Soundproof', true, swapped);
    const actor = swapped ? 'opponent' : 'player';
    const target = swapped ? 'player' : 'opponent';
    f[target].members[0].item = item;
    f.compareBoosts = true;
    f.compareExactHP = true;
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert.equal(result.local.turnLog[1].post.roster[actor][0].status, 'active');
    assert(result.reference.frames[1].post[swapped ? 'p2' : 'p1'].find(mon => mon.key === (swapped ? 'p2' : 'p1') + 'm1').active);
    assert(result.local.log.some(line => line.includes('Soundproof blocked Parting Shot!')));
  });
  test(`Taunt bypasses Substitute by mirrored flag, swapped=${swapped}`, () => {
    const f = fixture('Taunt', 'Pressure', 'Static', true, swapped);
    f.compareExactHP = true;
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    assert(result.local.log.some(line => line.includes('fell for the Taunt!')));
    assert(result.reference.raw_protocol.some(line => line.includes('|-start|') && line.includes('|move: Taunt')));
    const side = swapped ? 'player' : 'opponent';
    assert(result.local.turnLog[0].post.roster[side][0].substitute_hp > 0);
    assert.equal(result.local.turnLog[1].post.roster[side][0].substitute_hp,
      result.local.turnLog[0].post.roster[side][0].substitute_hp);
  });
  for (const substitute of [false, true]) {
    test(`Good as Gold blocks reflected Spite, sub=${substitute}, swapped=${swapped}`, () => {
      const f = fixture('Spite', 'Good as Gold', 'Magic Bounce', substitute, swapped);
      const result = compareProbe(f, local);
      assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
      const actor = swapped ? 'opponent' : 'player';
      const pp = result.local.turnLog[1].post.roster[actor][0].move_pp.Spite;
      assert.equal(pp.current, pp.max - 1, 'reflection must not drain the Good as Gold user');
      assert.equal(result.local.turnLog[1].effect_events.filter(event => event.effect_kind === 'pp-drain').length, 0);
    });
    for (const [ability, targetAbility, item, drains] of [
      ['Pressure', 'Shield Dust', '', false],
      ['Mold Breaker', 'Shield Dust', '', true],
      ['Mold Breaker', 'Shield Dust', 'Ability Shield', false],
      ['Pressure', 'Static', 'Covert Cloak', false],
      ['Mold Breaker', 'Static', 'Covert Cloak', false]
    ]) test(`Eerie Spell secondary gate: ${ability}/${targetAbility}/${item}, sub=${substitute}, swapped=${swapped}`, () => {
      const f = fixture('Eerie Spell', ability, targetAbility, substitute, swapped);
      const side = swapped ? 'player' : 'opponent';
      const refSide = swapped ? 'p1' : 'p2';
      f[side].members[0].item = item;
      const result = compareProbe(f, local);
      assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
      const before = result.local.turnLog[0].post.roster[side][0];
      const after = result.local.turnLog[1].post.roster[side][0];
      assert(after.hp_current > 0 && after.hp_current < before.hp_current, 'secondary protection must not block damage or rely on a KO');
      assert(result.reference.frames[1].post[refSide][0].hp > 0);
      assert(result.reference.frames[1].post[refSide][0].hp < result.reference.frames[0].post[refSide][0].hp);
      assert.equal(after.move_pp.Splash.current, before.move_pp.Splash.current - 1 - (drains ? 3 : 0));
      if (substitute) {
        assert(before.substitute_hp > 0);
        assert.equal(after.substitute_hp, before.substitute_hp);
        const refBefore = result.reference.frames[0].post[refSide][0];
        const refAfter = result.reference.frames[1].post[refSide][0];
        assert(refBefore.substitute_hp > 0);
        assert.equal(refAfter.substitute_hp, refBefore.substitute_hp);
      }
    });
  }
  for (const targetAbility of ['Good as Gold', 'Magic Bounce']) test(`Ability Shield preserves ${targetAbility} against Mold Breaker Spite, swapped=${swapped}`, () => {
    const f = fixture('Spite', 'Mold Breaker', targetAbility, true, swapped);
    f[swapped ? 'player' : 'opponent'].members[0].item = 'Ability Shield';
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  });
  test(`Sheer Force suppresses Eerie Spell PP drain, swapped=${swapped}`, () => {
    const f = fixture('Eerie Spell', 'Sheer Force', 'Static', true, swapped);
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  });
  test(`Eerie Spell does not drain PP after a knockout, swapped=${swapped}`, () => {
    const f = fixture('Eerie Spell', 'Pressure', 'Static', true, swapped);
    const actor = swapped ? 'opponent' : 'player';
    const target = swapped ? 'player' : 'opponent';
    f[actor].members[0].name = 'Alakazam';
    f[actor].members[0].item = '';
    f[actor].members[0].evs = { hp: 32, atk: 0, def: 0, spa: 32, spd: 0, spe: 2 };
    f[target].members[0].name = 'Pichu';
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify({ status: result.status, differences: result.differences, reasons: result.reasons }));
    assert.equal(result.local.turnLog[1].post.roster[target][0].hp_current, 0);
    assert.equal(result.reference.frames[1].post[swapped ? 'p1' : 'p2'].find(mon => mon.key === (swapped ? 'p1' : 'p2') + 'm1').hp, 0);
    const spellPP = result.local.turnLog[1].post.roster[actor][0].move_pp['Eerie Spell'];
    assert.equal(spellPP.current, spellPP.max - 1, 'the attacker must execute Eerie Spell, not remain locked into Splash');
    assert.equal(result.local.turnLog[1].effect_events.filter(event => event.effect_kind === 'pp-drain').length, 0);
  });
  for (const [move, ability] of [['Water Pulse', 'Static'], ['Eerie Spell', 'Soundproof']]) test(`Substitute and Soundproof negative control: ${move}/${ability}, swapped=${swapped}`, () => {
    const f = fixture(move, 'Pressure', ability, true, swapped);
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    const side = swapped ? 'player' : 'opponent';
    const refSide = swapped ? 'p1' : 'p2';
    assert.equal(result.local.turnLog[1].post.roster[side][0].hp_current, result.local.turnLog[0].post.roster[side][0].hp_current);
    assert.equal(result.reference.frames[1].post[refSide][0].hp, result.reference.frames[0].post[refSide][0].hp);
    for (const [before, after] of [
      [result.local.turnLog[0].post.roster[side][0], result.local.turnLog[1].post.roster[side][0]],
      [result.reference.frames[0].post[refSide][0], result.reference.frames[1].post[refSide][0]]
    ]) {
      assert(before.substitute_hp > 0);
      if (move === 'Water Pulse') {
        assert(after.substitute_hp >= 0 && after.substitute_hp < before.substitute_hp, 'non-sound damage must reduce or break Substitute');
      } else {
        assert.equal(after.substitute_hp, before.substitute_hp, 'Soundproof must also prevent damage to Substitute');
      }
    }
  });
  for (const [ability, targetAbility, sub] of [['Pressure', 'Static', true], ['Pressure', 'Good as Gold', false], ['Pressure', 'Magic Bounce', false], ['Prankster', 'Dark-type', false], ['Pressure', 'Good as Gold', true], ['Pressure', 'Magic Bounce', true], ['Mold Breaker', 'Good as Gold', false], ['Mold Breaker', 'Magic Bounce', false], ['Infiltrator', 'Static', true]]) {
    test(`Spite reference target gates: ${ability}, ${targetAbility}, sub=${sub}, swapped=${swapped}`, () => {
      const f = fixture('Spite', ability, targetAbility, sub, swapped);
      const result = compareProbe(f, local);
      assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify({ id: f.id, status: result.status, differences: result.differences, reasons: result.reasons }));
    });
  }
  test(`Protect prevents Spite reflection, swapped=${swapped}`, () => {
    const f = fixture('Spite', 'Pressure', 'Magic Bounce', false, swapped);
    const side = swapped ? 'player' : 'opponent';
    f[side].members[0].moves.push('Protect');
    f.turns[1][side][0] = { move: 'Protect' };
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  });
  for (const move of ['Eerie Spell', 'Hyper Voice', 'Boomburst']) test(`${move} bypasses Substitute, swapped=${swapped}`, () => {
    const f = fixture(move, 'Pressure', 'Static', true, swapped);
    const result = compareProbe(f, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify({ status: result.status, differences: result.differences }));
    const side = swapped ? 'player' : 'opponent';
    const refSide = swapped ? 'p1' : 'p2';
    const localBefore = result.local.turnLog[0].post.roster[side][0].hp_current;
    const localAfter = result.local.turnLog[1].post.roster[side][0].hp_current;
    const refBefore = result.reference.frames[0].post[refSide][0].hp;
    const refAfter = result.reference.frames[1].post[refSide][0].hp;
    assert(localAfter < localBefore, 'sound damage must hit real HP behind Substitute');
    assert(refAfter < refBefore, 'reference confirms real HP loss');
    assert(localAfter > 0 && refAfter > 0, 'Substitute preservation fixture must survive');
    const localSubBefore = result.local.turnLog[0].post.roster[side][0].substitute_hp;
    const refSubBefore = result.reference.frames[0].post[refSide][0].substitute_hp;
    assert(localSubBefore > 0 && refSubBefore > 0);
    assert.equal(result.local.turnLog[1].post.roster[side][0].substitute_hp, localSubBefore);
    assert.equal(result.reference.frames[1].post[refSide][0].substitute_hp, refSubBefore);
  });
}
