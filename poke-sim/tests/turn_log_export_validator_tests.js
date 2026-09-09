'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'not equal') + ' expected=' + b + ' got=' + a);
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function baseRow(side, zone, index, name, item, ability, stableSlot) {
  return {
    key: side + ':' + zone + ':' + index + ':' + name,
    stableKey: side + ':slot:' + stableSlot + ':' + name,
    teamSlot: stableSlot,
    zone,
    zoneIndex: index,
    side,
    status: zone,
    displayName: name,
    species: name,
    hp: 100,
    hpLabel: '100%',
    level: 50,
    item,
    itemConsumed: false,
    ability,
    moves: name === 'Whimsicott' ? ['Tailwind', 'Moonblast'] : ['Fake Out', 'Scald'],
    baseStatsLabel: '1/1/1/1/1/1',
    calculatedStats: '100/1/1/1/1/1'
  };
}

function stableFixture() {
  const incin = baseRow('player', 'active', 0, 'Incineroar', 'Sitrus Berry', 'Intimidate', 0);
  const whimBench = baseRow('player', 'bench', 0, 'Whimsicott', 'Focus Sash', 'Prankster', 1);
  const milotic = baseRow('opponent', 'active', 0, 'Milotic', 'Life Orb', 'Competitive', 0);
  const incinFainted = Object.assign({}, incin, {
    key: 'player:fainted:0:Incineroar',
    zone: 'fainted',
    status: 'fainted',
    hp: 0,
    hpLabel: '0%'
  });
  const whimActive = Object.assign({}, whimBench, {
    key: 'player:active:0:Whimsicott',
    zone: 'active',
    status: 'active',
    zoneIndex: 0
  });

  return {
    result: 'win',
    seed: [1, 2, 3, 4],
    turnLog: [{
      turn: 1,
      pre: {
        active: { player: ['Incineroar'], opponent: ['Milotic'] },
        bench: { player: ['Whimsicott'], opponent: [] },
        active_keys: { player: [incin.key], opponent: [milotic.key] },
        bench_keys: { player: [whimBench.key], opponent: [] },
        active_stable_keys: { player: [incin.stableKey], opponent: [milotic.stableKey] },
        bench_stable_keys: { player: [whimBench.stableKey], opponent: [] },
        hp_pct: { [incin.key]: 1, [whimBench.key]: 1, [milotic.key]: 1 },
        hp_pct_stable: { [incin.stableKey]: 1, [whimBench.stableKey]: 1, [milotic.stableKey]: 1 },
        roster: { player: [incin, whimBench], opponent: [milotic] },
        status: {},
        field: { trick_room: 0 },
        speed_control: { player: {}, opponent: {} },
        speed_order: ['Milotic', 'Incineroar'],
        speed_order_keys: [milotic.key, incin.key],
        speed_order_stable_keys: [milotic.stableKey, incin.stableKey]
      },
      actions: {
        player: [{ actor: 'Incineroar', kind: 'move', move: 'Fake Out', target: 'Milotic' }],
        opponent: [{ actor: 'Milotic', kind: 'move', move: 'Scald', target: 'Incineroar' }]
      },
      events: [
        { type: 'log', text: 'Incineroar used Fake Out!' },
        { type: 'log', text: 'Milotic flinched and could not move!' }
      ],
      post: {
        active: { player: ['Whimsicott'], opponent: ['Milotic'] },
        bench: { player: [], opponent: [] },
        active_keys: { player: [whimActive.key], opponent: [milotic.key] },
        bench_keys: { player: [], opponent: [] },
        active_stable_keys: { player: [whimActive.stableKey], opponent: [milotic.stableKey] },
        bench_stable_keys: { player: [], opponent: [] },
        hp_pct: { [whimActive.key]: 1, [milotic.key]: 1 },
        hp_pct_stable: { [incinFainted.stableKey]: 0, [whimActive.stableKey]: 1, [milotic.stableKey]: 1 },
        roster: { player: [incinFainted, whimActive], opponent: [milotic] },
        status: {},
        field: { trick_room: 0 },
        speed_control: { player: {}, opponent: {} },
        speed_order: ['Whimsicott', 'Milotic'],
        speed_order_keys: [whimActive.key, milotic.key],
        speed_order_stable_keys: [whimActive.stableKey, milotic.stableKey]
      }
    }]
  };
}

function stripStableFields(payload) {
  const legacy = clone(payload);
  for (const turn of legacy.turnLog) {
    for (const snapName of ['pre', 'post']) {
      const snap = turn[snapName];
      delete snap.active_stable_keys;
      delete snap.bench_stable_keys;
      delete snap.hp_pct_stable;
      delete snap.speed_order_stable_keys;
      for (const side of ['player', 'opponent']) {
        for (const row of snap.roster[side]) {
          delete row.stableKey;
          delete row.teamSlot;
          delete row.itemConsumed;
        }
      }
    }
  }
  return legacy;
}

(async function main() {
  const modUrl = pathToFileURL(path.join(ROOT, 'tools', 'validate-turn-logs.mjs')).href;
  const { validateTurnLogPayload } = await import(modUrl);

  console.log('\n=== turn log export validator tests ===\n');

  T('1. stable identity export passes strict validation across replacement', () => {
    const res = validateTurnLogPayload(stableFixture(), { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(res.summary.stableFieldsPresent, 'stable fields should be present');
  });

  T('2. legacy volatile-key exports warn without hard-failing', () => {
    const res = validateTurnLogPayload(stripStableFields(stableFixture()));
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(res.findings.some(f => f.code === 'legacy-volatile-movement'), 'missing volatile movement warning');
    truthy(res.findings.some(f => f.code === 'stable-key-missing'), 'missing stable-key warning');
  });

  T('3. strict mode rejects legacy exports missing stable identity fields', () => {
    const res = validateTurnLogPayload(stripStableFields(stableFixture()), { requireStable: true });
    truthy(res.findings.some(f => f.code === 'stable-fields-missing'), 'missing strict stable field error');
    truthy(res.summary.errors > 0, 'strict mode should hard-fail');
  });

  T('4. item drift on a stable Pokemon is a hard error', () => {
    const payload = stableFixture();
    payload.turnLog[0].post.roster.player[1].item = 'Rocky Helmet';
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'item-drift' && f.severity === 'error'), 'missing item drift error');
  });

  T('5. observed action order respects priority before speed', () => {
    const payload = stableFixture();
    payload.turnLog[0].events = [
      { type: 'log', text: 'Milotic used Scald!' },
      { type: 'log', text: 'Incineroar used Fake Out!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'observed-action-order-mismatch'), 'missing action order mismatch');
  });

  T('6. observed action order allows exact same-Speed ties', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    turn.actions.player[0].move = 'Knock Off';
    turn.events = [
      { type: 'log', text: 'Incineroar used Knock Off!' },
      { type: 'log', text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
  });

  T('6b. Gale Wings uses Showdown move type and exact full HP', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const actor = turn.pre.roster.player[0];
    actor.ability = 'Gale Wings';
    actor.calculatedStats = '300/1/1/1/1/60';
    actor.hp_current = actor.hp_max = 300;
    turn.pre.roster.opponent[0].calculatedStats = '100/1/1/1/1/90';
    turn.actions.player[0].move = 'Dual Wingbeat';
    turn.events = [{ text: 'Incineroar used Dual Wingbeat!' }, { text: 'Milotic used Scald!' }];
    truthy(!validateTurnLogPayload(payload).findings.some(f => f.code === 'observed-action-order-mismatch'), 'full HP priority should precede faster neutral move');
    actor.hp_current = 299;
    truthy(validateTurnLogPayload(payload).findings.some(f => f.code === 'observed-action-order-mismatch'), 'rounded 100% must not grant priority when exact HP is missing one point');
  });

  T('6c. Pollen Puff cannot target its user after its ally faints', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const actor = turn.pre.roster.player[0];
    const ally = turn.pre.roster.player[1];
    turn.pre.active_stable_keys.player = [actor.stableKey, ally.stableKey];
    turn.post.active_stable_keys.player = [actor.stableKey];
    turn.actions.player = [{ actor: actor.species, actor_key: actor.stableKey, move: 'Pollen Puff', target: ally.species,
      target_side: 'player', target_key: ally.stableKey }];
    turn.actions.opponent = [];
    turn.events = [{ text: actor.species + ' used Pollen Puff! (no valid target)' }];
    truthy(!validateTurnLogPayload(payload).findings.some(f => f.code === 'no-valid-target-with-live-target'), 'self is not an eligible ally');
    turn.post.active_stable_keys.player.push(ally.stableKey);
    truthy(validateTurnLogPayload(payload).findings.some(f => f.code === 'no-valid-target-with-live-target'), 'a surviving eligible ally must still be flagged');
    turn.actions.player[0].target_side = 'opponent';
    turn.actions.player[0].target_key = turn.pre.roster.opponent[0].stableKey;
    truthy(validateTurnLogPayload(payload).findings.some(f => f.code === 'no-valid-target-with-live-target'), 'enemy-targeted Pollen Puff must still be checked');
  });

  T('7. observed action order rejects non-tied same-priority reversals', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    turn.pre.roster.player[0].calculatedStats = '100/1/1/1/1/60';
    turn.pre.roster.opponent[0].calculatedStats = '100/1/1/1/1/90';
    turn.actions.player[0].move = 'Knock Off';
    turn.events = [
      { type: 'log', text: 'Incineroar used Knock Off!' },
      { type: 'log', text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'observed-action-order-mismatch' && f.reason === 'speed'), 'missing speed order mismatch');
  });

  T('7b. observed action order accepts a mid-turn Tailwind reorder supported by the post snapshot', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const incin = turn.pre.roster.player[0];
    const milotic = turn.pre.roster.opponent[0];
    const setter = Object.assign({}, milotic, {
      displayName: 'Whimsicott', species: 'Whimsicott', ability: 'Prankster',
      stableKey: 'player:slot:2:Whimsicott', key: 'player:active:1:Whimsicott'
    });
    turn.pre.roster.player.push(setter);
    turn.post.roster.player.push(Object.assign({}, setter));
    turn.actions.player[0].move = 'Knock Off';
    turn.actions.player.push({ actor: 'Whimsicott', actor_key: setter.stableKey, move: 'Tailwind' });
    turn.pre.speed_order_details = [
      { stableKey: setter.stableKey, pokemon: 'Whimsicott', effective_speed: 184, tailwind: false },
      { stableKey: milotic.stableKey, pokemon: 'Milotic', effective_speed: 168, tailwind: false },
      { stableKey: incin.stableKey, pokemon: 'Incineroar', effective_speed: 88, tailwind: false }
    ];
    turn.post.speed_order_details = [
      { stableKey: setter.stableKey, pokemon: 'Whimsicott', effective_speed: 368, tailwind: true },
      { stableKey: incin.stableKey, pokemon: 'Incineroar', effective_speed: 176, tailwind: true },
      { stableKey: milotic.stableKey, pokemon: 'Milotic', effective_speed: 168, tailwind: false }
    ];
    turn.events = [
      { type: 'field', text: 'Whimsicott used Tailwind!' },
      { type: 'log', text: 'Incineroar used Knock Off!' },
      { type: 'log', text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(!res.findings.some(f => f.code === 'observed-action-order-mismatch'), JSON.stringify(res.findings));
  });

  T('7bb. a post-turn Speed snapshot cannot retroactively justify an impossible Agility order', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const incin = turn.pre.roster.player[0];
    const milotic = turn.pre.roster.opponent[0];
    turn.actions.player[0].move = 'Agility';
    turn.pre.speed_order_details = [
      { stableKey: milotic.stableKey, key: milotic.key, pokemon: 'Milotic', effective_speed: 168 },
      { stableKey: incin.stableKey, key: incin.key, pokemon: 'Incineroar', effective_speed: 88 }
    ];
    turn.post.speed_order_details = [
      { stableKey: incin.stableKey, key: incin.key, pokemon: 'Incineroar', effective_speed: 176 },
      { stableKey: milotic.stableKey, key: milotic.key, pokemon: 'Milotic', effective_speed: 168 }
    ];
    turn.events = [
      { type: 'log', text: 'Incineroar used Agility!' },
      { type: 'log', text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'observed-action-order-mismatch' && f.reason === 'speed'), 'post snapshot incorrectly justified Agility before the faster action');
  });

  T('7c. observed action order reconstructs Tailwind under Trick Room before end-turn expiry', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const incin = turn.pre.roster.player[0];
    const milotic = turn.pre.roster.opponent[0];
    const setter = Object.assign({}, milotic, {
      displayName: 'Whimsicott',
      species: 'Whimsicott',
      ability: 'Prankster',
      stableKey: 'opponent:slot:2:Whimsicott',
      key: 'opponent:active:1:Whimsicott'
    });
    turn.pre.roster.opponent.push(setter);
    turn.post.roster.opponent.push(Object.assign({}, setter));
    turn.actions.player[0].move = 'Knock Off';
    turn.actions.opponent = [
      { actor: 'Milotic', actor_key: milotic.stableKey, move: 'Scald' },
      { actor: 'Whimsicott', actor_key: setter.stableKey, move: 'Tailwind' }
    ];
    turn.pre.field = { trick_room: 1 };
    turn.pre.speed_order_details = [
      { side: 'player', stableKey: incin.stableKey, key: incin.key, pokemon: 'Incineroar', effective_speed: 102, tailwind: false },
      { side: 'opponent', stableKey: milotic.stableKey, key: milotic.key, pokemon: 'Milotic', effective_speed: 92, tailwind: false },
      { side: 'opponent', stableKey: setter.stableKey, key: setter.key, pokemon: 'Whimsicott', effective_speed: 168, tailwind: false }
    ];
    turn.post.field = { trick_room: 0 };
    turn.post.speed_order_details = [
      { side: 'opponent', stableKey: setter.stableKey, key: setter.key, pokemon: 'Whimsicott', effective_speed: 336, tailwind: true },
      { side: 'opponent', stableKey: milotic.stableKey, key: milotic.key, pokemon: 'Milotic', effective_speed: 184, tailwind: true },
      { side: 'player', stableKey: incin.stableKey, key: incin.key, pokemon: 'Incineroar', effective_speed: 102, tailwind: false }
    ];
    turn.events = [
      { text: 'Whimsicott used Tailwind!' },
      { text: 'Incineroar used Knock Off!' },
      { text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(!res.findings.some(f => f.code === 'observed-action-order-mismatch'), JSON.stringify(res.findings));
  });

  T('7d. observed action order reconstructs a mid-turn paralysis Speed drop', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const incin = turn.pre.roster.player[0];
    const milotic = turn.pre.roster.opponent[0];
    const sneasler = Object.assign({}, milotic, {
      displayName: 'Sneasler',
      species: 'Sneasler',
      stableKey: 'opponent:slot:2:Sneasler',
      key: 'opponent:active:1:Sneasler'
    });
    turn.pre.roster.opponent.push(sneasler);
    turn.post.roster.opponent.push(Object.assign({}, sneasler));
    turn.actions.player[0].move = 'Knock Off';
    turn.actions.opponent = [
      { actor: 'Milotic', actor_key: milotic.stableKey, move: 'Scald' },
      { actor: 'Sneasler', actor_key: sneasler.stableKey, move: 'Dire Claw' }
    ];
    turn.pre.speed_order_details = [
      { side: 'opponent', stableKey: sneasler.stableKey, key: sneasler.key, pokemon: 'Sneasler', effective_speed: 170, status: '' },
      { side: 'player', stableKey: incin.stableKey, key: incin.key, pokemon: 'Incineroar', effective_speed: 120, status: '' },
      { side: 'opponent', stableKey: milotic.stableKey, key: milotic.key, pokemon: 'Milotic', effective_speed: 100, status: '' }
    ];
    turn.events = [
      { text: 'Sneasler used Dire Claw!' },
      { text: 'Incineroar was paralysed by Sneasler\'s Dire Claw!' },
      { text: 'Milotic used Scald!' },
      { text: 'Incineroar used Knock Off!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(!res.findings.some(f => f.code === 'observed-action-order-mismatch'), JSON.stringify(res.findings));
  });

  T('8. speed_order_details provide SP-aware order evidence over legacy name order', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const incin = turn.pre.roster.player[0];
    const milotic = turn.pre.roster.opponent[0];
    turn.pre.speed_order = ['Milotic', 'Incineroar'];
    turn.pre.speed_order_details = [{
      pokemon: 'Incineroar',
      key: incin.key,
      stableKey: incin.stableKey,
      stat_format: 'champions',
      nature: 'Jolly',
      speed_points: 32,
      species_base_speed: 60,
      base_speed: 112,
      calculated_speed: 112,
      speed_stage: 0,
      effective_speed: 112,
      item: 'Sitrus Berry',
      ability: 'Intimidate',
      status: '',
      tailwind: false,
      exact_speed_tie: false
    }, {
      pokemon: 'Milotic',
      key: milotic.key,
      stableKey: milotic.stableKey,
      stat_format: 'champions',
      nature: 'Hardy',
      speed_points: 0,
      species_base_speed: 81,
      base_speed: 101,
      calculated_speed: 101,
      speed_stage: 0,
      effective_speed: 101,
      item: 'Life Orb',
      ability: 'Competitive',
      status: '',
      tailwind: false,
      exact_speed_tie: false
    }];
    turn.actions.player[0].move = 'Knock Off';
    turn.events = [
      { type: 'log', text: 'Incineroar used Knock Off!' },
      { type: 'log', text: 'Milotic used Scald!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
  });

  T('9. malformed speed_order_details fail validation', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    turn.pre.speed_order_details = [{
      pokemon: 'Incineroar',
      key: 'player:active:99:Missingno',
      effective_speed: 'fast'
    }];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'speed-detail-key-not-live'), 'missing stale speed detail key error');
    truthy(res.findings.some(f => f.code === 'speed-detail-missing-effective-speed'), 'missing effective speed error');
  });

  T('10. terminal no-valid-target skips pass when the target side is empty after earlier KO', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const milotic = turn.post.roster.opponent[0];
    turn.actions.player = [
      { actor: 'Incineroar', kind: 'move', move: 'Knock Off', target: 'Milotic' }
    ];
    turn.actions.opponent = [];
    turn.events = [
      { type: 'log', text: 'Incineroar used Knock Off! (no valid target)' }
    ];
    turn.post.active.opponent = [];
    turn.post.active_keys.opponent = [];
    turn.post.active_stable_keys.opponent = [];
    turn.post.roster.opponent = [Object.assign({}, milotic, {
      key: 'opponent:fainted:0:Milotic',
      zone: 'fainted',
      status: 'fainted',
      hp: 0,
      hpLabel: '0%'
    })];
    delete turn.post.hp_pct[milotic.key];
    turn.post.hp_pct_stable[milotic.stableKey] = 0;
    turn.post.speed_order = ['Whimsicott'];
    turn.post.speed_order_keys = [turn.post.roster.player[1].key];
    turn.post.speed_order_stable_keys = [turn.post.roster.player[1].stableKey];

    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(!res.findings.some(f => f.code === 'no-valid-target-with-live-target'), 'terminal skip should not be flagged');
  });

  T('11. no-valid-target skips fail when a target side still has a live active Pokemon', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    turn.actions.player = [
      { actor: 'Incineroar', kind: 'move', move: 'Knock Off', target: 'Milotic' }
    ];
    turn.actions.opponent = [];
    turn.events = [
      { type: 'log', text: 'Incineroar used Knock Off! (no valid target)' }
    ];

    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'no-valid-target-with-live-target'), 'missing live-target no-valid-target error');
  });

  T('11b. no-valid-target skips ignore post-turn replacements sent after the skip', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const milotic = turn.pre.roster.opponent[0];
    const oppIncin = baseRow('opponent', 'active', 1, 'Incineroar', 'Sitrus Berry', 'Intimidate', 1);
    const garchompBench = baseRow('opponent', 'bench', 0, 'Garchomp', 'Soft Sand', 'Rough Skin', 2);
    const kingambitBench = baseRow('opponent', 'bench', 1, 'Kingambit', 'Black Glasses', 'Defiant', 3);
    const faintedMilotic = Object.assign({}, milotic, {
      key: 'opponent:fainted:0:Milotic',
      zone: 'fainted',
      status: 'fainted',
      hp: 0,
      hpLabel: '0%'
    });
    const faintedIncin = Object.assign({}, oppIncin, {
      key: 'opponent:fainted:1:Incineroar',
      zone: 'fainted',
      status: 'fainted',
      hp: 0,
      hpLabel: '0%'
    });
    const garchompActive = Object.assign({}, garchompBench, {
      key: 'opponent:active:0:Garchomp',
      zone: 'active',
      status: 'active',
      zoneIndex: 0
    });
    const kingambitActive = Object.assign({}, kingambitBench, {
      key: 'opponent:active:1:Kingambit',
      zone: 'active',
      status: 'active',
      zoneIndex: 1
    });

    turn.actions.player = [
      { actor: 'Incineroar', kind: 'move', move: 'Knock Off', target: 'Milotic' }
    ];
    turn.actions.opponent = [];
    turn.events = [
      { type: 'damage', text: 'Garchomp used Earthquake! -> Milotic [100 dmg, 0/100 HP]' },
      { type: 'ko', text: 'Milotic fainted!' },
      { type: 'damage', text: 'Garchomp used Earthquake! -> Incineroar [100 dmg, 0/100 HP]' },
      { type: 'ko', text: 'Incineroar fainted!' },
      { type: 'log', text: 'Incineroar used Knock Off! (no valid target)' },
      { type: 'log', text: 'Garchomp was sent out!' },
      { type: 'log', text: 'Kingambit was sent out!' }
    ];
    turn.pre.active.opponent = ['Milotic', 'Incineroar'];
    turn.pre.bench.opponent = ['Garchomp', 'Kingambit'];
    turn.pre.active_keys.opponent = [milotic.key, oppIncin.key];
    turn.pre.bench_keys.opponent = [garchompBench.key, kingambitBench.key];
    turn.pre.active_stable_keys.opponent = [milotic.stableKey, oppIncin.stableKey];
    turn.pre.bench_stable_keys.opponent = [garchompBench.stableKey, kingambitBench.stableKey];
    turn.pre.roster.opponent = [milotic, oppIncin, garchompBench, kingambitBench];
    turn.pre.hp_pct[oppIncin.key] = 1;
    turn.pre.hp_pct[garchompBench.key] = 1;
    turn.pre.hp_pct[kingambitBench.key] = 1;
    turn.pre.hp_pct_stable[oppIncin.stableKey] = 1;
    turn.pre.hp_pct_stable[garchompBench.stableKey] = 1;
    turn.pre.hp_pct_stable[kingambitBench.stableKey] = 1;
    turn.post.active.opponent = ['Garchomp', 'Kingambit'];
    turn.post.bench.opponent = [];
    turn.post.active_keys.opponent = [garchompActive.key, kingambitActive.key];
    turn.post.bench_keys.opponent = [];
    turn.post.active_stable_keys.opponent = [garchompActive.stableKey, kingambitActive.stableKey];
    turn.post.bench_stable_keys.opponent = [];
    turn.post.roster.opponent = [faintedMilotic, faintedIncin, garchompActive, kingambitActive];
    turn.post.hp_pct = {
      [turn.post.active_keys.player[0]]: 1,
      [garchompActive.key]: 1,
      [kingambitActive.key]: 1
    };
    turn.post.hp_pct_stable = {
      [turn.post.active_stable_keys.player[0]]: 1,
      [milotic.stableKey]: 0,
      [oppIncin.stableKey]: 0,
      [garchompActive.stableKey]: 1,
      [kingambitActive.stableKey]: 1
    };
    turn.post.speed_order = ['Garchomp', 'Kingambit'];
    turn.post.speed_order_keys = [garchompActive.key, kingambitActive.key];
    turn.post.speed_order_stable_keys = [garchompActive.stableKey, kingambitActive.stableKey];

    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(!res.findings.some(f => f.code === 'no-valid-target-with-live-target'), 'post-turn replacements should not make the earlier skip invalid');
  });

  T('11c. structured event identity resolves mirror-name no-valid-target actions', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const player = turn.pre.roster.player[0];
    const opponent = turn.pre.roster.opponent[0];
    turn.actions.player = [{
      actor: player.name,
      actor_key: player.stableKey,
      kind: 'move',
      move: 'Knock Off',
      target: opponent.name,
      target_key: opponent.stableKey,
      target_side: 'opponent'
    }];
    turn.actions.opponent = [{
      actor: player.name,
      actor_key: opponent.stableKey,
      kind: 'move',
      move: 'Knock Off',
      target: player.name,
      target_key: player.stableKey,
      target_side: 'player'
    }];
    turn.events = [{
      type: 'log',
      text: `${player.name} used Knock Off! (no valid target)`,
      actor: player.name,
      actor_key: player.stableKey,
      side: 'player',
      move: 'Knock Off',
      target: opponent.name,
      target_key: opponent.stableKey,
      target_side: 'opponent'
    }];

    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(!res.findings.some(f => f.code === 'no-valid-target-actor-unresolved'), 'structured identity must resolve the acting side');
    truthy(res.findings.some(f => f.code === 'no-valid-target-with-live-target'), 'resolved event must still be checked for a live target');

    turn.events[0].actor_key = opponent.stableKey;
    const contradicted = validateTurnLogPayload(payload, { requireStable: true });
    truthy(contradicted.findings.some(f => f.code === 'no-valid-target-actor-unresolved'), 'contradictory side and actor key must fail closed');
  });

  T('11d. observed action order uses side and stable keys for mirror species', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const playerIncin = Object.assign({}, baseRow('player', 'active', 0, 'Incineroar', 'Sitrus Berry', 'Intimidate', 0), {
      calculatedStats: '202/157/110/90/128/88'
    });
    const playerWhim = Object.assign({}, baseRow('player', 'active', 1, 'Whimsicott', 'Focus Sash', 'Prankster', 3), {
      calculatedStats: '137/78/95/121/96/184'
    });
    const oppZard = Object.assign({}, baseRow('opponent', 'active', 0, 'Charizard-Mega-X', 'Charizardite X', 'Tough Claws', 0), {
      calculatedStats: '167/177/131/135/105/149'
    });
    const oppIncin = Object.assign({}, baseRow('opponent', 'active', 1, 'Incineroar', 'Sitrus Berry', 'Intimidate', 4), {
      calculatedStats: '202/157/110/90/128/91'
    });
    const activePlayer = [playerIncin, playerWhim];
    const activeOpponent = [oppZard, oppIncin];
    const hpPct = {};
    const hpPctStable = {};
    for (const row of activePlayer.concat(activeOpponent)) {
      hpPct[row.key] = 1;
      hpPctStable[row.stableKey] = 1;
    }
    const snapshot = {
      active: { player: ['Incineroar', 'Whimsicott'], opponent: ['Charizard-Mega-X', 'Incineroar'] },
      bench: { player: [], opponent: [] },
      active_keys: { player: activePlayer.map(row => row.key), opponent: activeOpponent.map(row => row.key) },
      bench_keys: { player: [], opponent: [] },
      active_stable_keys: { player: activePlayer.map(row => row.stableKey), opponent: activeOpponent.map(row => row.stableKey) },
      bench_stable_keys: { player: [], opponent: [] },
      hp_pct: hpPct,
      hp_pct_stable: hpPctStable,
      roster: { player: activePlayer, opponent: activeOpponent },
      status: {},
      field: { trick_room: 0 },
      speed_control: { player: { tailwind_turns: 2 }, opponent: {} },
      speed_order: ['Whimsicott', 'Incineroar', 'Charizard-Mega-X', 'Incineroar'],
      speed_order_keys: [playerWhim.key, playerIncin.key, oppZard.key, oppIncin.key],
      speed_order_stable_keys: [playerWhim.stableKey, playerIncin.stableKey, oppZard.stableKey, oppIncin.stableKey],
      speed_order_details: [
        { side: 'player', key: playerWhim.key, stableKey: playerWhim.stableKey, pokemon: 'Whimsicott', effective_speed: 368 },
        { side: 'player', key: playerIncin.key, stableKey: playerIncin.stableKey, pokemon: 'Incineroar', effective_speed: 176 },
        { side: 'opponent', key: oppZard.key, stableKey: oppZard.stableKey, pokemon: 'Charizard-Mega-X', effective_speed: 149 },
        { side: 'opponent', key: oppIncin.key, stableKey: oppIncin.stableKey, pokemon: 'Incineroar', effective_speed: 91 }
      ]
    };
    turn.pre = clone(snapshot);
    turn.post = clone(snapshot);
    turn.actions = {
      player: [
        { actor: 'Incineroar', kind: 'move', move: 'Knock Off', target: 'Charizard-Mega-X' },
        { actor: 'Whimsicott', kind: 'move', move: 'Protect', target: 'Incineroar' }
      ],
      opponent: [
        { actor: 'Charizard-Mega-X', kind: 'move', move: 'Flare Blitz', target: 'Whimsicott' },
        { actor: 'Incineroar', kind: 'move', move: 'Flare Blitz', target: 'Whimsicott' }
      ]
    };
    turn.events = [
      { type: 'log', text: 'Whimsicott used Protect!' },
      { type: 'log', text: 'Incineroar used Knock Off!' },
      { type: 'damage', text: 'Incineroar used Knock Off! -> Charizard-Mega-X [30 dmg, 67/167 HP]' },
      { type: 'log', text: 'Charizard-Mega-X used Flare Blitz!' },
      { type: 'log', text: 'Whimsicott protected itself!' },
      { type: 'log', text: 'Incineroar used Flare Blitz!' },
      { type: 'log', text: 'Whimsicott protected itself!' }
    ];

    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(!res.findings.some(f => f.code === 'observed-action-order-mismatch'), 'mirror Incineroar names should not corrupt speed order');
  });

  T('11e. identical mirror actions remain visible as an explicit identity ambiguity', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const mirror = Object.assign({}, turn.pre.roster.player[0], {
      stableKey: 'opponent:slot:1:Incineroar', key: 'opponent:active:0:Incineroar'
    });
    turn.pre.roster.opponent[0] = mirror;
    turn.post.roster.opponent[0] = Object.assign({}, mirror);
    turn.actions.player[0].move = 'Protect';
    turn.actions.opponent[0] = { actor: 'Incineroar', actor_key: mirror.stableKey, move: 'Protect' };
    turn.events = [
      { text: 'Incineroar used Protect!' },
      { text: 'Incineroar used Protect!' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'observed-action-identity-ambiguous'), 'mirror action ambiguity was silently discarded');
  });

  T('11f. stable actor identity resolves identical mirror action text', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const player = turn.pre.roster.player[0];
    const mirror = Object.assign({}, player, {
      stableKey: 'opponent:slot:1:Incineroar', key: 'opponent:active:0:Incineroar'
    });
    turn.pre.roster.opponent[0] = mirror;
    turn.post.roster.opponent[0] = Object.assign({}, mirror);
    turn.actions.player[0] = { actor: 'Incineroar', actor_key: player.stableKey, move: 'Protect' };
    turn.actions.opponent[0] = { actor: 'Incineroar', actor_key: mirror.stableKey, move: 'Protect' };
    turn.events = [
      { text: 'Incineroar used Protect!', actor_key: player.stableKey, side: 'player' },
      { text: 'Incineroar used Protect!', actor_key: mirror.stableKey, side: 'opponent' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(!res.findings.some(f => f.code === 'observed-action-identity-ambiguous'), 'stable identity still reported as ambiguous');
  });

  T('11g. structured action identity ignores repeated damage-detail text', () => {
    const payload = stableFixture();
    const turn = payload.turnLog[0];
    const playerAction = turn.actions.player[0];
    turn.events = [
      { text: 'Incineroar used Knock Off!', actor: playerAction.actor, move: playerAction.move, actor_key: playerAction.actor_key, side: 'player' },
      { text: 'Incineroar used Knock Off! -> Milotic [20 dmg]' },
      { text: 'Milotic used Scald!', actor: 'Milotic', move: 'Scald', actor_key: turn.actions.opponent[0].actor_key, side: 'opponent' }
    ];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
    truthy(!res.findings.some(f => f.code === 'observed-action-identity-ambiguous'), 'damage detail was mistaken for a second action');
  });

  T('12. calculated damage_events pass validation with modifier evidence', () => {
    const payload = stableFixture();
    payload.turnLog[0].damage_events = [{
      attacker: 'Incineroar',
      attacker_key: 'player:slot:0:Incineroar',
      target: 'Milotic',
      target_key: 'opponent:slot:0:Milotic',
      move: 'Knock Off',
      damage_kind: 'calculated',
      damage: 44,
      applied_damage: 44,
      hp_delta: 44,
      calculated_damage: 44,
      overkill_damage: 0,
      damage_capped_by_hp: false,
      target_hp_before: 160,
      target_hp_after: 116,
      target_max_hp: 170,
      move_type: 'Dark',
      category: 'physical',
      type_effectiveness: 1,
      critical: false,
      base_power_initial: 65,
      base_power_modified: 65,
      attack_stat_key: 'atk',
      defense_stat_key: 'def',
      attack_stat_stage: 0,
      defense_stat_stage: 0,
      attack_stat_stage_used: 0,
      defense_stat_stage_used: 0,
      attack_stat_value: 135,
      defense_stat_value: 100,
      attacker_stat_format: 'champions',
      defender_stat_format: 'champions',
      typed_item_boost: false,
      typed_item_boost_mod: 4096,
      spread_mod: 4096,
      weather_mod: 4096,
      screen_mod: 4096,
      stab_mod: 6144,
      final_mod: 4096,
      status_penalty: false,
      roll: 1,
      weather: 'none',
      terrain: 'none'
    }];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
  });

  T('13. malformed calculated damage_events fail validation', () => {
    const payload = stableFixture();
    payload.turnLog[0].damage_events = [{
      attacker: 'Incineroar',
      target: 'Milotic',
      move: 'Knock Off',
      damage_kind: 'calculated',
      damage: 'big',
      applied_damage: 50,
      hp_delta: 43,
      calculated_damage: 70,
      overkill_damage: 19,
      damage_capped_by_hp: false,
      target_hp_before: 160,
      target_hp_after: 116,
      target_max_hp: 170,
      move_type: '',
      category: '',
      type_effectiveness: 'strong'
    }, {
      attacker: 'Milotic',
      target: 'Incineroar',
      move: 'Scald',
      damage_kind: 'fixed_or_direct',
      damage: 70,
      applied_damage: 50,
      hp_delta: 43,
      calculated_damage: 70,
      overkill_damage: 19,
      damage_capped_by_hp: false,
      target_hp_before: 160,
      target_hp_after: 116,
      target_max_hp: 170
    }];
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'damage-event-missing-number'), 'missing damage number error');
    truthy(res.findings.some(f => f.code === 'damage-event-applied-mismatch'), 'missing applied damage mismatch error');
    truthy(res.findings.some(f => f.code === 'damage-event-damage-mismatch'), 'missing damage mismatch error');
    truthy(res.findings.some(f => f.code === 'damage-event-hp-delta-mismatch'), 'missing HP delta mismatch error');
    truthy(res.findings.some(f => f.code === 'damage-event-overkill-mismatch'), 'missing overkill mismatch error');
    truthy(res.findings.some(f => f.code === 'damage-event-cap-flag-mismatch'), 'missing cap flag mismatch error');
    truthy(res.findings.some(f => f.code === 'damage-calc-missing-number'), 'missing calculated numeric error');
    truthy(res.findings.some(f => f.code === 'damage-calc-missing-field'), 'missing calculated field error');
  });

  T('14. effect_events pass validation and malformed effect math fails', () => {
    const valid = stableFixture();
    valid.turnLog[0].effect_events = [{
      actor: 'Incineroar',
      actor_key: 'player:slot:0:Incineroar',
      side: 'player',
      move: 'Flare Blitz',
      effect_kind: 'recoil',
      hp_before: 120,
      hp_after: 90,
      hp_delta: -30,
      max_hp: 170,
      rule: { numerator: 33, denominator: 100, basis: 'applied_damage', rounding: 'half_up' },
      source_damage: 91,
      damage_applied_to_user: 30,
      move_context: 'Has 33% recoil.'
    }];
    eq(validateTurnLogPayload(valid, { requireStable: true }).summary.errors, 0, 'valid effect row should pass');

    const bad = stableFixture();
    bad.turnLog[0].effect_events = [{
      actor: 'Incineroar',
      move: 'Flare Blitz',
      effect_kind: '',
      hp_before: 120,
      hp_after: 90,
      hp_delta: -29,
      max_hp: 170,
      damage_applied_to_user: 31,
      rule: {},
      move_context: { text: 'bad' }
    }];
    const res = validateTurnLogPayload(bad, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'effect-event-missing-identity'), 'missing effect identity error');
    truthy(res.findings.some(f => f.code === 'effect-event-hp-delta-mismatch'), 'missing effect delta mismatch error');
    truthy(res.findings.some(f => f.code === 'effect-event-applied-user-damage-mismatch'), 'missing applied user damage mismatch error');
    truthy(res.findings.some(f => f.code === 'effect-event-rule-missing-basis'), 'missing effect rule basis error');
    truthy(res.findings.some(f => f.code === 'effect-event-context-malformed'), 'missing effect context malformed error');
  });

  T('15. qa_coverage_summary passes when totals match turnLog evidence', () => {
    const payload = stableFixture();
    payload.qa_coverage_summary = {
      schema_version: 'champions-qa-coverage-v1',
      totals: {
        turns: 1,
        action_rows: 2,
        damage_events: 0,
        effect_events: 0,
        turns_with_damage_events: 0,
        turns_with_effect_events: 0
      },
      mechanics_seen: { damage_events: 0, effect_events: 0 },
      source_truth_versions: { pokemon_showdown: { source_repository: 'https://github.com/smogon/pokemon-showdown' } },
      missing_targeted_proof: [],
      moves_seen: { damage: {}, effects: {} },
      effect_kinds: {}
    };
    const res = validateTurnLogPayload(payload, { requireStable: true });
    eq(res.summary.errors, 0, JSON.stringify(res.findings));
  });

  T('16. qa_coverage_summary fails when totals drift from turnLog evidence', () => {
    const payload = stableFixture();
    payload.qa_coverage_summary = {
      schema_version: 'champions-qa-coverage-v1',
      totals: {
        turns: 2,
        damage_events: 1,
        effect_events: 0,
        turns_with_damage_events: 0,
        turns_with_effect_events: 0
      },
      mechanics_seen: {},
      source_truth_versions: {},
      missing_targeted_proof: []
    };
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'qa-coverage-total-mismatch' && f.field === 'turns'), 'missing QA coverage turn mismatch');
    truthy(res.findings.some(f => f.code === 'qa-coverage-total-mismatch' && f.field === 'damage_events'), 'missing QA coverage damage mismatch');
  });

  T('17. top-level turns fails when it drifts from turnLog evidence', () => {
    const payload = stableFixture();
    payload.schema_version = 'champions-turn-log-v2';
    payload.turns = null;
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'top-level-turn-count-mismatch' && f.field === 'turns'), 'missing top-level turns mismatch');
  });

  T('18. champions-turn-log-v2 requires top-level turns', () => {
    const payload = stableFixture();
    payload.schema_version = 'champions-turn-log-v2';
    const res = validateTurnLogPayload(payload, { requireStable: true });
    truthy(res.findings.some(f => f.code === 'top-level-turn-count-missing' && f.field === 'turns'), 'missing top-level turns required error');
  });

  console.log('\nturn log export validator:', pass + ' pass, ' + fail + ' fail\n');
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
