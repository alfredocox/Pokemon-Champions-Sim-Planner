import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';
import { compareProbe, loadLocalEngine } from '../tools/showdown-reference.mjs';

const local = loadLocalEngine();

test('reflectable stage moves resolve Magic Bounce, accuracy, then Substitute', () => {
  const engineSource = fs.readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
  const resolverStart = engineSource.indexOf('function resolveStageTarget');
  const resolverEnd = engineSource.indexOf('\n        let applied = 0;', resolverStart);
  const resolver = engineSource.slice(resolverStart, resolverEnd);
  const magicBounce = resolver.indexOf("_moveHasFlag(move, 'reflectable')");
  const accuracy = resolver.indexOf('_moveHits(stageSource, stageTarget');
  const substitute = resolver.indexOf('stageTarget.substituteHp > 0');
  assert.ok(magicBounce >= 0 && accuracy > magicBounce && substitute > accuracy,
    'expected Magic Bounce before accuracy and accuracy before Substitute');
});

for (const probeId of ['seismic-toss-fixed-damage', 'earthquake-flying-ally']) {
  for (const reversed of [false, true]) {
    test(`${probeId} Growl/Leer stages agree with Showdown on ${reversed ? 'reversed' : 'normal'} sides`, () => {
      const fixture = referenceProbes().find(probe => probe.id === probeId);
      fixture.id = `${probeId}-stages-${reversed ? 'reversed' : 'normal'}`;
      if (reversed) {
        [fixture.player, fixture.opponent] = [fixture.opponent, fixture.player];
        [fixture.turns[0].player, fixture.turns[0].opponent] = [fixture.turns[0].opponent, fixture.turns[0].player];
        delete fixture.hpChange;
      }
      const result = compareProbe(fixture, local);
      assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
    });
  }
}

test('Growl lowers each unprotected adjacent foe and does not lower its ally', () => {
  const fixture = referenceProbes().find(probe => probe.id === 'earthquake-flying-ally');
  fixture.id = 'growl-protect-per-target';
  fixture.player.members[0].moves = ['Protect'];
  fixture.player.members[1].moves = ['Growl'];
  fixture.opponent.members[0].moves = ['Protect'];
  fixture.opponent.members[1].moves = ['Growl'];
  fixture.turns[0] = {
    player: [{move: 'Protect'}, {move: 'Growl'}],
    opponent: [{move: 'Protect'}, {move: 'Growl'}]
  };
  fixture.compareBoosts = true;
  delete fixture.hpChange;
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});

function isolatedGrowlFixture(id) {
  const fixture = referenceProbes().find(probe => probe.id === 'earthquake-flying-ally');
  fixture.id = id;
  fixture.player.members[0].moves = ['Growl'];
  fixture.player.members[1].moves = ['Protect'];
  fixture.opponent.members[0].moves = ['Tackle'];
  fixture.opponent.members[1].moves = ['Tackle'];
  fixture.turns[0] = {
    player: [{move: 'Growl'}, {move: 'Protect'}],
    opponent: [
      {move: 'Tackle', targetSlot: 1, targetSide: 'foe'},
      {move: 'Tackle', targetSlot: 1, targetSide: 'foe'}
    ]
  };
  fixture.compareBoosts = true;
  delete fixture.hpChange;
  return fixture;
}

for (const [boundary, first, second] of [
  ['Clear Body and Defiant', {ability: 'Clear Body'}, {ability: 'Defiant'}],
  ['Clear Amulet and ordinary target', {item: 'Clear Amulet'}, {}],
  ['Good as Gold and Magic Bounce', {ability: 'Good as Gold'}, {ability: 'Magic Bounce'}]
]) {
  test(`Growl resolves ${boundary} per target`, () => {
    const fixture = isolatedGrowlFixture(`growl-${boundary.toLowerCase().replaceAll(' ', '-')}`);
    Object.assign(fixture.opponent.members[0], first);
    Object.assign(fixture.opponent.members[1], second);
    const result = compareProbe(fixture, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  });
}

test('Growl bypasses Substitute as a sound move while Leer does not', () => {
  const fixture = isolatedGrowlFixture('growl-leer-substitute-boundary');
  fixture.player.members[0].moves = ['Growl', 'Protect'];
  fixture.player.members[1].moves = ['Leer', 'Protect'];
  fixture.opponent.members[0].moves = ['Substitute', 'Tackle'];
  fixture.opponent.members[1].moves = ['Substitute', 'Tackle'];
  fixture.turns = [
    {player: [{move: 'Protect'}, {move: 'Protect'}], opponent: [{move: 'Substitute'}, {move: 'Substitute'}]},
    {player: [{move: 'Growl'}, {move: 'Leer'}], opponent: [
      {move: 'Tackle', targetSlot: 1, targetSide: 'foe'},
      {move: 'Tackle', targetSlot: 1, targetSide: 'foe'}
    ]}
  ];
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});

function unprotectedGrowlFixture(id) {
  const fixture = isolatedGrowlFixture(id);
  fixture.player.members[1].moves = ['Tackle'];
  fixture.turns[0].player[1] = {move: 'Tackle', targetSlot: 0, targetSide: 'foe'};
  return fixture;
}

for (const [id, configure] of [
  ['growl-soundproof', fixture => { fixture.opponent.members[0].ability = 'Soundproof'; }],
  ['growl-hyper-cutter-contrary', fixture => {
    fixture.opponent.members[0].ability = 'Hyper Cutter';
    fixture.opponent.members[1].ability = 'Contrary';
  }],
  ['growl-white-smoke-mirror-armor', fixture => {
    fixture.opponent.members[0].ability = 'White Smoke';
    fixture.opponent.members[1].ability = 'Mirror Armor';
  }],
  ['growl-magic-bounce-spread', fixture => { fixture.opponent.members[1].ability = 'Magic Bounce'; }],
  ['growl-magic-bounce-clear-amulet', fixture => {
    fixture.player.members[0].item = 'Clear Amulet';
    fixture.opponent.members[1].ability = 'Magic Bounce';
  }],
  ['growl-mold-breaker', fixture => {
    fixture.player.members[0].ability = 'Mold Breaker';
    fixture.opponent.members[0].ability = 'Good as Gold';
    fixture.opponent.members[1].ability = 'Magic Bounce';
  }]
]) {
  test(`${id} agrees with per-target Showdown behavior`, () => {
    const fixture = unprotectedGrowlFixture(id);
    configure(fixture);
    const result = compareProbe(fixture, local);
    assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
  });
}

test('Clear Amulet blocks an allied Bulldoze stage drop but not its damage', () => {
  const fixture = referenceProbes().find(probe => probe.id === 'earthquake-flying-ally');
  fixture.id = 'clear-amulet-allied-bulldoze';
  fixture.player.members[0].moves = ['Bulldoze'];
  Object.assign(fixture.player.members[1], {
    name: 'Blastoise', ability: 'Torrent', item: 'Clear Amulet', moves: ['Tackle']
  });
  fixture.opponent.members[0].moves = ['Protect'];
  fixture.opponent.members[1].moves = ['Protect'];
  fixture.turns[0] = {
    player: [{move: 'Bulldoze'}, {move: 'Tackle', targetSlot: 0, targetSide: 'foe'}],
    opponent: [{move: 'Protect'}, {move: 'Protect'}]
  };
  fixture.compareBoosts = true;
  delete fixture.hpChange;
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});

test('Protect stops Magic Bounce from reflecting Growl for that target', () => {
  const fixture = unprotectedGrowlFixture('growl-protected-magic-bounce');
  fixture.opponent.members[0].ability = 'Magic Bounce';
  fixture.opponent.members[0].moves = ['Protect'];
  fixture.turns[0].opponent[0] = {move: 'Protect'};
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});

test('Each Magic Bounce target independently reflects a spread Growl', () => {
  const fixture = unprotectedGrowlFixture('growl-dual-magic-bounce');
  fixture.opponent.members[0].ability = 'Magic Bounce';
  fixture.opponent.members[1].ability = 'Magic Bounce';
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});

test('Clear Body blocks an allied Bulldoze stage drop but not its damage', () => {
  const fixture = referenceProbes().find(probe => probe.id === 'earthquake-flying-ally');
  fixture.id = 'clear-body-allied-bulldoze';
  fixture.player.members[0].moves = ['Bulldoze'];
  Object.assign(fixture.player.members[1], {
    name: 'Blastoise', ability: 'Clear Body', item: '', moves: ['Tackle']
  });
  fixture.opponent.members[0].moves = ['Protect'];
  fixture.opponent.members[1].moves = ['Protect'];
  fixture.turns[0] = {
    player: [{move: 'Bulldoze'}, {move: 'Tackle', targetSlot: 0, targetSide: 'foe'}],
    opponent: [{move: 'Protect'}, {move: 'Protect'}]
  };
  fixture.compareBoosts = true;
  delete fixture.hpChange;
  const result = compareProbe(fixture, local);
  assert.equal(result.status, 'agreement_in_declared_scope', JSON.stringify(result.differences));
});
