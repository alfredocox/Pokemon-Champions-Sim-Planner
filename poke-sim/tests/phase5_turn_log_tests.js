// Phase 5 (Refs PHASE5_TURN_LOG_SPEC_DRAFT.md) - turnLog, positionScore, Replay Log v2.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function stubEl() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    innerHTML: '',
    textContent: '',
    value: 'mega_altaria',
    options: [],
    children: [],
    querySelector: () => null,
    querySelectorAll: () => [],
    click: () => {},
    focus: () => {},
    blur: () => {}
  };
}

const replayListEl = stubEl();
const created = [];
const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window: {},
  Blob: function(parts, opts) { this.parts = parts; this.opts = opts; },
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
  document: {
    getElementById: (id) => id === 'replay-list' ? replayListEl : stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    body: stubEl(),
    documentElement: stubEl(),
    head: stubEl(),
    createElement: () => {
      const el = stubEl();
      created.push(el);
      return el;
    }
  },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  }
};
ctx.window.matchMedia = () => ({ matches: false });
ctx.matchMedia = () => ({ matches: false });
ctx.addEventListener = () => {};
ctx.removeEventListener = () => {};
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
try { load('legality.js'); } catch (_) {}
load('engine.js');
try { load('strategy-injectable.js'); } catch (_) {}
load('ui.js');
load('release_manifest.js');

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.simulateBattle = simulateBattle;',
  'this.positionScore = positionScore;',
  'this.winProbabilityDelta = winProbabilityDelta;',
  'this.csReplaySparkline = csReplaySparkline;',
  'this.csRenderTurnLogRows = csRenderTurnLogRows;',
  'this.csRenderReplayTurn0 = csRenderReplayTurn0;',
  'this.csRenderReplayTurnRoster = csRenderReplayTurnRoster;',
  'this.csBuildDecisionAudit = csBuildDecisionAudit;',
  'this.csBuildReplayCoachingSummary = csBuildReplayCoachingSummary;',
  'this.csRenderReplayCoachingSummary = csRenderReplayCoachingSummary;',
  'this.downloadReplayTurnLog = downloadReplayTurnLog;'
].join(' '), ctx);

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'not equal') + ' expected=' + b + ' got=' + a); }

console.log('\n=== Phase 5 turn log tests ===\n');

let battleA;
T('T5a-1 turnLog is populated after simulateBattle', () => {
  battleA = ctx.simulateBattle(ctx.TEAMS.player, ctx.TEAMS.mega_altaria, {});
  truthy(Array.isArray(battleA.turnLog), 'turnLog array missing');
  truthy(battleA.turnLog.length > 0, 'turnLog empty');
  eq(battleA.turns, battleA.turnLog.length, 'battle turns should equal completed turnLog rows');
  truthy(battleA.turnLog[0].pre && battleA.turnLog[0].post, 'pre/post state missing');
  truthy(Array.isArray(battleA.turnLog[0].pre.roster.player), 'player roster snapshot missing');
  truthy(Array.isArray(battleA.turnLog[0].pre.roster.opponent), 'opponent roster snapshot missing');
  const payload = ctx.ChampionsSim.internal.buildAnalysisPayload('player', 'mega_altaria', 1, {
    wins: 1, losses: 0, draws: 0, avgTurns: 1, avgTrTurns: 0, allLogs: [battleA]
  });
  truthy(!payload.logs[0].turnLog, 'turnLog must not be persisted in save payload logs');
  truthy(Array.isArray(payload.logs[0].position_path), 'summary position path should persist');
});

T('T5a-1a live turn snapshots keep player/opponent side keys distinct', () => {
  const first = battleA.turnLog[0] || {};
  const speedKeys = (((first.pre || {}).speed_order_keys) || []).join(' ');
  truthy(speedKeys.includes('player:active:'), 'player active key missing from live snapshot');
  truthy(speedKeys.includes('opponent:active:'), 'opponent active key missing from live snapshot');
});

T('T5a-1b exported turn snapshots can be rescored directly', () => {
  const first = battleA.turnLog[0] || {};
  eq(ctx.positionScore(first.pre), first.pre.position_score, 'flattened pre snapshot score mismatch');
  eq(ctx.positionScore(first.post), first.post.position_score, 'flattened post snapshot score mismatch');

  truthy(first.pre.score_state && first.pre.score_state.player && first.pre.score_state.opponent, 'score_state missing from pre snapshot');

  const flattenedWithScoreState = {
    active: { player: ['A'], opponent: ['B'] },
    bench: { player: [], opponent: [] },
    active_keys: { player: ['player:active:0:A'], opponent: ['opponent:active:0:B'] },
    bench_keys: { player: [], opponent: [] },
    hp_pct: { 'player:active:0:A': 0.333, 'opponent:active:0:B': 0.667 },
    roster: {
      player: [{ displayName: 'A', status: 'active' }],
      opponent: [{ displayName: 'B', status: 'active' }]
    },
    status: {},
    field: {},
    speed_control: { player: {}, opponent: {} },
    speed_order_keys: ['player:active:0:A', 'opponent:active:0:B'],
    score_state: {
      player: { hp_total: 0.3334, alive_count: 1, max_count: 1, active: ['A'], bench: [], active_keys: ['player:active:0:A'], bench_keys: [] },
      opponent: { hp_total: 0.6666, alive_count: 1, max_count: 1, active: ['B'], bench: [], active_keys: ['opponent:active:0:B'], bench_keys: [] }
    }
  };
  const nestedEquivalent = {
    player: flattenedWithScoreState.score_state.player,
    opponent: flattenedWithScoreState.score_state.opponent,
    status: {},
    field: {},
    speed_control: { player: {}, opponent: {} },
    speed_order_keys: ['player:active:0:A', 'opponent:active:0:B']
  };
  eq(ctx.positionScore(flattenedWithScoreState), ctx.positionScore(nestedEquivalent), 'score_state should preserve exact scorer inputs');
});

T('T5a-1c roster calculated stats include non-HP stats', () => {
  const first = battleA.turnLog[0] || {};
  const row = (((first.pre || {}).roster || {}).player || [])[0] || {};
  truthy(!/\/0\/0\/0\/0\/0$/.test(row.calculatedStats || ''), 'calculated stats should not zero non-HP stats');
});

T('T5a-1d stable roster identity survives bench to active movement', () => {
  const battle = ctx.simulateBattle(ctx.TEAMS.player, ctx.TEAMS.mega_altaria, {
    format: 'doubles',
    seed: [1, 1015568748, 22695478, 1103527590],
    playerBring: ['Incineroar', 'Arcanine', 'Garchomp', 'Whimsicott']
  });
  const rows = [];
  for (const turn of battle.turnLog || []) {
    for (const snapName of ['pre', 'post']) {
      const snap = turn[snapName] || {};
      const playerRows = ((snap.roster || {}).player || []);
      for (const row of playerRows) {
        if (row.displayName === 'Garchomp') rows.push(row);
      }
    }
  }
  truthy(rows.some(row => row.zone === 'bench'), 'expected Garchomp to appear on bench');
  truthy(rows.some(row => row.zone === 'active'), 'expected Garchomp to appear active after a replacement');
  eq(new Set(rows.map(row => row.stableKey)).size, 1, 'Garchomp stableKey changed across movement');
  eq(new Set(rows.map(row => row.item)).size, 1, 'Garchomp item changed across movement');

  const first = rows[0];
  truthy(first.stableKey && first.stableKey.includes(':slot:'), 'stableKey missing slot identity');
  const firstPre = ((battle.turnLog[0] || {}).pre || {});
  truthy(firstPre.hp_pct_stable && Object.prototype.hasOwnProperty.call(firstPre.hp_pct_stable, first.stableKey), 'stable HP map missing Garchomp');
  truthy(Array.isArray(firstPre.bench_stable_keys.player) && firstPre.bench_stable_keys.player.includes(first.stableKey), 'stable bench keys missing Garchomp');
});

T('T5a-1e action summaries export stable actor and target identity', () => {
  const rows = [];
  for (const turn of battleA.turnLog || []) {
    const actions = turn.actions || {};
    (actions.player || []).forEach(row => rows.push(Object.assign({ side: 'player' }, row)));
    (actions.opponent || []).forEach(row => rows.push(Object.assign({ side: 'opponent' }, row)));
  }
  truthy(rows.length > 0, 'expected action summary rows');
  rows.forEach(row => {
    truthy(row.actor_key && row.actor_key.indexOf(row.side + ':slot:') === 0, 'action actor_key missing stable side/slot identity');
    if (row.target) {
      truthy(row.target_key && /^(player|opponent):slot:/.test(row.target_key), 'targeted action missing stable target_key');
      truthy(row.target_side === 'player' || row.target_side === 'opponent', 'targeted action missing target_side');
    }
  });
});

T('T5a-2 turnLog clears on new sim run', () => {
  const battleB = ctx.simulateBattle(ctx.TEAMS.player, ctx.TEAMS.mega_charizard_y, {});
  truthy(Array.isArray(battleB.turnLog), 'second turnLog missing');
  truthy(battleB.turnLog !== battleA.turnLog, 'turnLog reused across runs');
  eq(ctx.window.ChampionsSim.turnLog, battleB.turnLog, 'latest namespace turnLog not refreshed');
});

T('T5b-1 positionScore returns 0..1', () => {
  const score = ctx.positionScore({
    player: { hp_total: 2, alive_count: 2, max_count: 4, active: ['A'], bench: ['B'] },
    opponent: { hp_total: 2, alive_count: 2, max_count: 4, active: ['C'], bench: ['D'] },
    speed_control: { player: {}, opponent: {} },
    status: {}
  });
  truthy(score >= 0 && score <= 1, 'score outside range: ' + score);
});

T('T5b-2 positionScore favors higher player HP', () => {
  const score = ctx.positionScore({
    player: { hp_total: 3, alive_count: 2, max_count: 4, active: ['A'], bench: ['B'] },
    opponent: { hp_total: 1, alive_count: 2, max_count: 4, active: ['C'], bench: ['D'] },
    speed_control: { player: {}, opponent: {} },
    status: {}
  });
  truthy(score > 0.5, 'expected player-favored score, got ' + score);
});

T('T5b-2a positionScore uses actual turn order under Trick Room', () => {
  const playerAhead = ctx.positionScore({
    player: { hp_total: 2, alive_count: 1, max_count: 2, active: ['Slowmon'], active_keys: ['player:active:0:Slowmon'], bench: [], bench_keys: [] },
    opponent: { hp_total: 2, alive_count: 1, max_count: 2, active: ['Fastmon'], active_keys: ['opponent:active:0:Fastmon'], bench: [], bench_keys: [] },
    field: { trick_room: 1 },
    speed_control: { player: {}, opponent: {} },
    speed_order_keys: ['player:active:0:Slowmon', 'opponent:active:0:Fastmon'],
    status: {}
  });
  const opponentAhead = ctx.positionScore({
    player: { hp_total: 2, alive_count: 1, max_count: 2, active: ['Slowmon'], active_keys: ['player:active:0:Slowmon'], bench: [], bench_keys: [] },
    opponent: { hp_total: 2, alive_count: 1, max_count: 2, active: ['Fastmon'], active_keys: ['opponent:active:0:Fastmon'], bench: [], bench_keys: [] },
    field: { trick_room: 1 },
    speed_control: { player: {}, opponent: {} },
    speed_order_keys: ['opponent:active:0:Fastmon', 'player:active:0:Slowmon'],
    status: {}
  });
  truthy(playerAhead > opponentAhead, 'expected Trick Room score to follow actual order');
});

T('T5b-3 winProbabilityDelta length is turnLog.length - 1', () => {
  const deltas = ctx.winProbabilityDelta(battleA.turnLog);
  eq(deltas.length, Math.max(0, battleA.turnLog.length - 1), 'delta length mismatch');
});

T('T5b-4 swing turn is flagged on known fixture', () => {
  const fixture = [
    { turn: 1, post: { position_score: 0.52 } },
    { turn: 2, post: { position_score: 0.55 } },
    { turn: 3, post: { position_score: 0.31 } },
    { turn: 4, post: { position_score: 0.35 } }
  ];
  ctx.winProbabilityDelta(fixture);
  truthy(fixture[2].swingTurn === true, 'largest swing turn not flagged');
});

T('T5c-1 Replay Log v2 renders turn rows', () => {
  const html = ctx.csRenderTurnLogRows(battleA.turnLog);
  truthy(html.includes('replay-turn-row'), 'turn rows missing');
});

T('T5c-1a Replay Log v2 renders Turn 0 and both board sides', () => {
  const html = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [
          { displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 100, hpLabel: '100%', moves: ['Fake Out'], baseStatsLabel: '105/95/80/40/80/90' },
          { displayName: 'Milotic', species: 'Milotic', status: 'bench', hp: 100, hpLabel: '100%', moves: ['Recover'] }
        ],
        opponent: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 100, hpLabel: '100%', moves: ['Rock Slide'] }
        ]
      }
    },
    post: {
      roster: {
        player: [
          { displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 70, hpLabel: '70%', moves: ['Fake Out'] },
          { displayName: 'Milotic', species: 'Milotic', status: 'bench', hp: 100, hpLabel: '100%', moves: ['Recover'] }
        ],
        opponent: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'fainted', hp: 0, hpLabel: '0%', faintTurn: 1, moves: ['Rock Slide'] }
        ]
      },
      position_score: 0.6
    },
    actions: { player: [{ actor: 'Kangaskhan', move: 'Fake Out', target: 'Tyranitar' }], opponent: [] },
    events: [{ type: 'ko', text: 'Tyranitar fainted!' }, { type: 'log', text: 'Milotic was sent out!' }],
    delta: { position_score: 0.1 }
  }]);
  truthy(html.includes('Turn 0 — Starting State'), 'Turn 0 block missing');
  truthy(html.includes('replay-stadium-vs'), 'VS stadium divider missing');
  truthy(html.includes('Your team'), 'your board missing');
  truthy(html.includes('Their team'), 'their board missing');
  truthy(html.includes('Their team · On field'), 'opponent top field label missing');
  truthy(html.includes('Your team · On field'), 'player bottom field label missing');
  truthy(html.includes('replay-stadium-sprite'), 'stadium sprite missing');
  truthy(html.includes('Kangaskhan sprite'), 'stadium sprite alt text missing');
  truthy(html.includes('Bench / knocked out'), 'off-field zone missing');
  truthy(html.includes('Battle log'), 'battle-log section missing');
  truthy(html.includes('Kangaskhan used Fake Out!'), 'Showdown-style move line missing');
  truthy(html.includes('→ Tyranitar'), 'target arrow missing');
  truthy(!html.includes('your move'), 'debug move label leaked');
  truthy(!html.includes('their move'), 'debug opponent label leaked');
  truthy(!html.includes('damage</span>'), 'debug damage label leaked');
  truthy(!html.includes('field</span>'), 'debug field label leaked');
  truthy(html.includes('Tyranitar fainted!'), 'KO play-by-play missing');
  truthy(html.includes('Milotic was sent out!'), 'switch play-by-play missing');
  truthy(html.includes('Tyranitar'), 'opponent mon missing');
  truthy(html.includes('fainted'), 'fainted status missing');
  truthy(html.includes('0%'), 'zero HP missing');
});

T('T5c-1ab Replay Log v2 does not duplicate planned move lines when resolved events exist', () => {
  const html = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [{ displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 100, hpLabel: '100%', moves: ['Fake Out'] }],
        opponent: [{ displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 100, hpLabel: '100%', moves: ['Rock Slide'] }]
      }
    },
    post: {
      roster: {
        player: [{ displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 100, hpLabel: '100%', moves: ['Fake Out'] }],
        opponent: [{ displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 82, hpLabel: '82%', moves: ['Rock Slide'] }]
      },
      position_score: 0.55
    },
    actions: { player: [{ actor: 'Kangaskhan', move: 'Fake Out', target: 'Tyranitar' }], opponent: [] },
    events: [
      { type: 'log', text: 'Kangaskhan used Fake Out! -> Tyranitar [18 dmg, 82/100 HP]' },
      { type: 'log', text: 'Kangaskhan used Fake Out! -> Tyranitar [18 dmg, 82/100 HP]' }
    ],
    delta: { position_score: 0.05 }
  }]);
  const matches = html.match(/Kangaskhan used Fake Out!/g) || [];
  eq(matches.length, 1, 'resolved move line should render once');
  truthy(html.includes('Resolved action order shown below'), 'turn header should not repeat planned actions');
  truthy(html.includes('lost 18 HP'), 'damage text should stay attached to resolved move line');
});

T('T5c-1ac Replay Log v2 groups spread damage and surfaces miss/failure details', () => {
  const html = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [{ displayName: 'Charizard', species: 'Charizard', status: 'active', hp: 100, hpLabel: '100%', moves: ['Heat Wave'] }],
        opponent: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 100, hpLabel: '100%', moves: ['Rock Slide'] },
          { displayName: 'Indeedee-F', species: 'Indeedee-F', status: 'active', hp: 100, hpLabel: '100%', moves: ['Follow Me'] }
        ]
      }
    },
    post: {
      roster: {
        player: [{ displayName: 'Charizard', species: 'Charizard', status: 'active', hp: 100, hpLabel: '100%', moves: ['Heat Wave'] }],
        opponent: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 76, hpLabel: '76%', moves: ['Rock Slide'] },
          { displayName: 'Indeedee-F', species: 'Indeedee-F', status: 'active', hp: 69, hpLabel: '69%', moves: ['Follow Me'] }
        ]
      },
      position_score: 0.6
    },
    actions: { player: [{ actor: 'Charizard', move: 'Heat Wave' }], opponent: [{ actor: 'Tyranitar', move: 'Stone Edge', target: 'Charizard' }] },
    events: [{ type: 'log', text: 'Charizard used Heat Wave!' }],
    damage_events: [
      { attacker: 'Charizard', attacker_key: 'player:slot:0:Charizard', move: 'Heat Wave', target: 'Tyranitar', target_key: 'opponent:slot:0:Tyranitar', applied_damage: 24, target_hp_after: 76, target_max_hp: 100, type_effectiveness: 0.5, spread_mod: 3072 },
      { attacker: 'Charizard', attacker_key: 'player:slot:0:Charizard', move: 'Heat Wave', target: 'Indeedee-F', target_key: 'opponent:slot:1:Indeedee-F', applied_damage: 31, target_hp_after: 69, target_max_hp: 100, type_effectiveness: 1, spread_mod: 3072 }
    ],
    effect_events: [{
      actor: 'Tyranitar',
      actor_key: 'opponent:slot:0:Tyranitar',
      effect_kind: 'move-failure',
      failed_move: 'Stone Edge',
      failure_reason: 'accuracy-miss',
      target: 'Charizard',
      accuracy: 0.8,
      hp_before: 100,
      hp_after: 100
    }],
    delta: { position_score: 0.1 }
  }]);
  truthy(html.includes('Charizard used Heat Wave! Tyranitar lost 24 HP (76/100 HP) [resisted, spread]; Indeedee-F lost 31 HP (69/100 HP) [spread]'), 'spread damage should show both targets in one resolved row');
  truthy(html.includes('Tyranitar used Stone Edge! → Charizard It missed. Accuracy 80%.'), 'accuracy miss detail missing');
});

T('T5c-1ad Replay Log preserves status moves, resolved move order and Tailwind field tags', () => {
  const html = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [
          { displayName: 'Whimsicott', species: 'Whimsicott', status: 'active', hp: 100, hpLabel: '100%', moves: ['Tailwind'] },
          { displayName: 'Incineroar', species: 'Incineroar', status: 'active', hp: 100, hpLabel: '100%', moves: ['Flare Blitz'] }
        ],
        opponent: [{ displayName: 'Milotic', species: 'Milotic', status: 'active', hp: 100, hpLabel: '100%', moves: ['Scald'] }]
      }
    },
    post: {
      roster: {
        player: [
          { displayName: 'Whimsicott', species: 'Whimsicott', status: 'active', hp: 100, hpLabel: '100%', moves: ['Tailwind'] },
          { displayName: 'Incineroar', species: 'Incineroar', status: 'active', hp: 90, hpLabel: '90%', moves: ['Flare Blitz'] }
        ],
        opponent: [{ displayName: 'Milotic', species: 'Milotic', status: 'active', hp: 40, hpLabel: '40%', moves: ['Scald'] }]
      },
      speed_control: { player: { tailwind_turns: 3 }, opponent: {} },
      position_score: 0.6
    },
    actions: {
      player: [{ actor: 'Whimsicott', move: 'Tailwind' }, { actor: 'Incineroar', move: 'Flare Blitz', target: 'Milotic' }],
      opponent: [{ actor: 'Milotic', move: 'Scald', target: 'Incineroar' }]
    },
    events: [
      { type: 'field', text: 'Whimsicott used Tailwind!' },
      { type: 'log', text: 'Incineroar used Flare Blitz!' },
      { type: 'damage', text: 'Incineroar used Flare Blitz! → Milotic [60 dmg, 40/100 HP]' },
      { type: 'log', text: 'Milotic used Scald!' }
    ],
    damage_events: [{ attacker: 'Incineroar', attacker_key: 'player:slot:1:Incineroar', move: 'Flare Blitz', target: 'Milotic', applied_damage: 60, target_hp_after: 40, target_max_hp: 100 }],
    delta: { position_score: 0.1 }
  }]);
  const tailwind = html.indexOf('Whimsicott used Tailwind!');
  const flareBlitz = html.indexOf('Incineroar used Flare Blitz!');
  const scald = html.indexOf('Milotic used Scald!');
  truthy(tailwind >= 0 && tailwind < flareBlitz && flareBlitz < scald, 'resolved action order should follow event evidence');
  truthy(html.includes('Your Tailwind 3T'), 'Tailwind duration tag missing from post-turn board');
});

T('T5c-1ae Replay Log preserves identical mirror-match move actions', () => {
  const html = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: { roster: { player: [], opponent: [] } },
    post: { roster: { player: [], opponent: [] } },
    actions: {
      player: [{ actor: 'Incineroar', actor_key: 'player:slot:1:Incineroar', move: 'Protect' }],
      opponent: [{ actor: 'Incineroar', actor_key: 'opponent:slot:1:Incineroar', move: 'Protect' }]
    },
    events: [
      { type: 'log', text: 'Incineroar used Protect!' },
      { type: 'log', text: 'Incineroar used Protect!' }
    ],
    damage_events: [], effect_events: []
  }]);
  eq((html.match(/Incineroar used Protect!/g) || []).length, 2, 'mirror actions were collapsed');
});

T('T5c-1aa Replay Log v2 supports singles and doubles field visibility', () => {
  const singles = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [{ displayName: 'Charizard', species: 'Charizard', status: 'active', hp: 100, hpLabel: '100%', moves: ['Heat Wave'] }],
        opponent: [{ displayName: 'Blastoise', species: 'Blastoise', status: 'active', hp: 100, hpLabel: '100%', moves: ['Water Pulse'] }]
      }
    },
    post: {
      roster: {
        player: [{ displayName: 'Charizard', species: 'Charizard', status: 'active', hp: 55, hpLabel: '55%', moves: ['Heat Wave'] }],
        opponent: [{ displayName: 'Blastoise', species: 'Blastoise', status: 'active', hp: 40, hpLabel: '40%', moves: ['Water Pulse'] }]
      },
      position_score: 0.5
    },
    actions: { player: [{ actor: 'Charizard', move: 'Heat Wave', target: 'Blastoise' }], opponent: [{ actor: 'Blastoise', move: 'Water Pulse', target: 'Charizard' }] },
    delta: { position_score: 0 }
  }]);
  const doubles = ctx.csRenderTurnLogRows([{
    turn: 1,
    pre: {
      roster: {
        player: [
          { displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 100, hpLabel: '100%', moves: ['Fake Out'] },
          { displayName: 'Arcanine-Hisui', species: 'Arcanine-Hisui', status: 'active', hp: 100, hpLabel: '100%', moves: ['Rock Slide'] }
        ],
        opponent: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 100, hpLabel: '100%', moves: ['Rock Slide'] },
          { displayName: 'Indeedee-F', species: 'Indeedee-F', status: 'active', hp: 100, hpLabel: '100%', moves: ['Follow Me'] }
        ]
      }
    },
    post: { roster: { player: [], opponent: [] }, position_score: 0.5 },
    actions: { player: [], opponent: [] },
    delta: { position_score: 0 }
  }]);
  truthy(singles.includes('Charizard') && singles.includes('Blastoise'), 'singles active field missing');
  truthy((singles.match(/replay-stadium-vs/g) || []).length >= 2, 'singles stadium missing Turn 0/post-turn VS views');
  truthy(doubles.includes('Kangaskhan') && doubles.includes('Arcanine-Hisui'), 'doubles player leads missing');
  truthy(doubles.includes('Tyranitar') && doubles.includes('Indeedee-F'), 'doubles opponent leads missing');
});

T('T5c-1b Battle Sensei renders Turn 0 and both side boards', () => {
  const turn0Html = ctx.csRenderReplayTurn0({
    sides: {
      p1: {
        player: 'Alice',
        teamPreview: ['Kangaskhan', 'Milotic'],
        roster: [
          { displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 100, hpLabel: '100%' },
          { displayName: 'Milotic', species: 'Milotic', status: 'bench', hp: 100, hpLabel: '100%' }
        ]
      },
      p2: {
        player: 'Bob',
        teamPreview: ['Tyranitar'],
        roster: [
          { displayName: 'Tyranitar', species: 'Tyranitar', status: 'active', hp: 100, hpLabel: '100%' }
        ]
      }
    }
  }, 'p1');
  const turnHtml = ctx.csRenderReplayTurnRoster({
    p1: [
      { displayName: 'Kangaskhan', species: 'Kangaskhan', status: 'active', hp: 75, hpLabel: '75%' },
      { displayName: 'Milotic', species: 'Milotic', status: 'bench', hp: 100, hpLabel: '100%' }
    ],
    p2: [
      { displayName: 'Tyranitar', species: 'Tyranitar', status: 'fainted', hp: 0, hpLabel: '0%', faintTurn: 1 }
    ]
  }, 'p1');
  truthy(turn0Html.includes('Turn 0 — Starting State'), 'Battle Sensei Turn 0 header missing');
  truthy(turn0Html.includes('Your team — Alice · Turn 0'), 'Battle Sensei your Turn 0 side missing');
  truthy(turn0Html.includes('Their team — Bob · Turn 0'), 'Battle Sensei their Turn 0 side missing');
  truthy(turn0Html.includes('replay-roster-sprite'), 'Battle Sensei sprite missing');
  truthy(turnHtml.includes('Your team after this turn'), 'Battle Sensei your per-turn board missing');
  truthy(turnHtml.includes('Their team after this turn'), 'Battle Sensei their per-turn board missing');
  truthy(turnHtml.includes('replay-stadium-vs'), 'Battle Sensei VS stadium missing');
  truthy(turnHtml.indexOf('Their team after this turn · On field') < turnHtml.indexOf('Your team after this turn · On field'), 'Battle Sensei should render opponent field above player field');
  truthy(turnHtml.includes('Bench / knocked out'), 'Battle Sensei off-field zone missing');
  truthy(turnHtml.includes('Tyranitar'), 'Battle Sensei opponent mon missing');
  truthy(turnHtml.includes('fainted'), 'Battle Sensei fainted status missing');
  truthy(turnHtml.includes('0%'), 'Battle Sensei zero HP missing');
});

T('T5c-1c replay snapshot surfaces field-state chips and impact summaries', () => {
  const html = ctx.csRenderReplayLogSnapshot({
    roster: {
      player: [
        { stable_key: 'p1a', displayName: 'Incineroar', species: 'Incineroar', status: 'active', hp: 82, hpLabel: '82%', moves: ['Fake Out'] }
      ],
      opponent: [
        { stable_key: 'p2a', displayName: 'Farigiraf', species: 'Farigiraf', status: 'active', hp: 100, hpLabel: '100%', moves: ['Trick Room'] }
      ]
    },
    field: { weather: 'sun', weather_turns: 3, terrain: 'psychic', terrain_turns: 2, trick_room: 4 },
    speed_control: {
      player: { tailwind: 2, screens: { reflect: 1 } },
      opponent: { tailwind: 0, screens: {} }
    }
  }, 'Turn 1', false, {
    damage_events: [
      { target_key: 'p1a', target: 'Incineroar', attacker: 'Farigiraf', move: 'Psychic', applied_damage: 18, target_hp_before: 100, target_hp_after: 82 }
    ],
    effect_events: [
      { actor_key: 'p1a', actor: 'Incineroar', effect_kind: 'flinch-skip', skipped_move: true, skipped_action_move: 'Fake Out' }
    ]
  });
  truthy(html.includes('sun 3T'), 'weather chip missing');
  truthy(html.includes('psychic 2T'), 'terrain chip missing');
  truthy(html.includes('Trick Room 4T'), 'Trick Room chip missing');
  truthy(html.includes('Your Tailwind 2T'), 'Tailwind chip missing');
  truthy(html.includes('Impact:'), 'impact summary missing');
  truthy(html.includes('lost 18 HP to Psychic'), 'damage reason summary missing');
  truthy(html.includes('lost its move: flinch skipped move'), 'skip reason summary missing');
});

T('T5c-1ca replay impact deduplicates recoil represented by damage and effect evidence', () => {
  const html = ctx.csRenderReplayLogSnapshot({
    roster: {
      player: [{ stable_key: 'p1a', displayName: 'Incineroar', species: 'Incineroar', status: 'active', hp: 82, hpLabel: '41%', moves: ['Flare Blitz'] }],
      opponent: [{ stable_key: 'p2a', displayName: 'Sableye', species: 'Sableye', status: 'fainted', hp: 0, hpLabel: '0%', moves: ['Recover'] }]
    }
  }, 'Turn 6', false, {
    damage_events: [{
      attacker_key: 'p1a', attacker: 'Incineroar', target_key: 'p2a', target: 'Sableye', move: 'Flare Blitz',
      applied_damage: 65, target_hp_before: 65, target_hp_after: 0,
      recoil_damage: 21, recoil_hp_before: 103, recoil_hp_after: 82
    }],
    effect_events: [{ actor_key: 'p1a', actor: 'Incineroar', move: 'Flare Blitz', effect_kind: 'recoil', hp_before: 103, hp_after: 82 }]
  });
  eq((html.match(/Incineroar lost 21 HP to recoil/g) || []).length, 1, 'duplicate recoil impact summary');
});

T('T5c-2 swing turn row is highlighted', () => {
  const rows = [
    { turn: 1, post: { position_score: 0.5 }, delta: { position_score: 0 }, actions: { player: [], opponent: [] } },
    { turn: 2, swingTurn: true, post: { position_score: 0.3 }, delta: { position_score: -0.2 }, actions: { player: [], opponent: [] } }
  ];
  truthy(ctx.csRenderTurnLogRows(rows).includes('replay-turn-row swing'), 'swing class missing');
});

T('T5c-3 JSON download produces valid parseable file', () => {
  let parsed = null;
  ctx.Blob = function(parts) { parsed = JSON.parse(parts[0]); };
  ctx.downloadReplayTurnLog({ seed: 'abc', result: 'win', turns: battleA.turnLog.length + 1, playerKey: 'player', oppKey: 'mega_altaria', turnLog: battleA.turnLog, position_path: battleA.position_path });
  truthy(parsed && Array.isArray(parsed.turnLog), 'download JSON did not parse');
  eq(parsed.schema_version, 'champions-turn-log-v2', 'download schema version missing');
  eq(parsed.build_id, ctx.window.CHAMPIONS_RELEASE_MANIFEST.build_id, 'download build id must match release manifest');
  truthy(typeof parsed.exported_at === 'string' && parsed.exported_at.length > 0, 'download timestamp missing');
  eq(parsed.turns, parsed.turnLog.length, 'download top-level turns must match turnLog rows');
  eq(parsed.sim_turns_reported, parsed.turnLog.length + 1, 'download should preserve stale/internal turn counter separately');
  eq(parsed.turn_count_source, 'turnLog.length', 'download turn count source should be explicit');
  eq(parsed.qa_scope, 'single-turn-log', 'download QA scope should be explicit');
  truthy(String(parsed.qa_scope_note || '').includes('one replay sample'), 'download QA scope note missing');
  eq(parsed.player_team_id, 'player', 'download player team id missing');
  eq(parsed.opponent_team_id, 'mega_altaria', 'download opponent team id missing');
  truthy(parsed.player_team && parsed.player_team.members && parsed.player_team.members.length === 6, 'download full player team missing');
  truthy(parsed.opponent_team && parsed.opponent_team.members && parsed.opponent_team.members.length === 6, 'download full opponent team missing');
  truthy(parsed.team_preview && parsed.team_preview.player_brought_count >= 1, 'download brought team preview missing');
  eq(parsed.qa_coverage_summary.schema_version, 'champions-qa-coverage-v1', 'QA coverage schema missing');
  eq(parsed.qa_coverage_summary.scope, 'single-turn-log', 'QA coverage scope mismatch');
  truthy(String(parsed.qa_coverage_summary.coverage_scope_note || '').includes('single-replay evidence'), 'QA coverage scope note missing');
  eq(parsed.qa_coverage_summary.totals.turns, parsed.turnLog.length, 'QA coverage turn count mismatch');
  truthy(parsed.qa_coverage_summary.source_truth_versions && parsed.qa_coverage_summary.source_truth_versions.pokemon_showdown, 'QA source truth versions missing');
  truthy(Array.isArray(parsed.qa_coverage_summary.missing_targeted_proof), 'QA missing proof list missing');
  eq(parsed.qa_coverage_summary.missing_targeted_proof.length, 0, 'single replay download should not expose release-wide missing proof');
  truthy(String(parsed.qa_coverage_summary.missing_targeted_proof_note || '').includes('Suppressed for single-turn-log'), 'single replay missing proof note missing');
  truthy(Array.isArray(parsed.qa_coverage_summary.single_replay_missing_mechanics), 'QA coverage single replay missing mechanics missing');
  truthy(Array.isArray(parsed.single_replay_missing_mechanics), 'single replay missing mechanics list missing');
});

T('T5c-3identity download retains original run identity and snapshots', () => {
  let parsed = null;
  ctx.Blob = function(parts) { parsed = JSON.parse(parts[0]); };
  const provenance = { build_id: 'execution-build', engine_version: 'execution-engine', format: 'doubles', player_team_id: 'original-player', opp_team_id: 'original-opp' };
  ctx.downloadReplayTurnLog({ seed: 'identity', turnLog: battleA.turnLog, provenance,
    team_snapshots: { player: { name: 'Original team', members: [{ name: 'Original member' }] }, opponent: { members: [] } },
    participants: { player: [{ member_id: 'durable-member', item: 'Original item' }], opponent: [] } }, { playerKey: 'changed', oppKey: 'changed' });
  eq(parsed.build_id, 'execution-build', 'must not relabel with export build');
  eq(parsed.player_team_id, 'original-player', 'must not relabel with selected team');
  eq(parsed.player_team.name, 'Original team', 'must not reload edited team');
  eq(parsed.provenance.engine_version, 'execution-engine', 'execution provenance dropped');
  eq(parsed.participants.player[0].member_id, 'durable-member', 'participant identity dropped');
  eq(parsed.team_snapshot_source, 'execution_time', 'snapshot origin missing');
});

T('T5c-3a QA coverage counts recoil occurrences once and keeps damage-row evidence separate', () => {
  const summary = ctx.csBuildQaCoverageSummary([{
    turn: 1,
    actions: { player: [], opponent: [] },
    damage_events: [{
      move: 'Flare Blitz',
      type_effectiveness: 1,
      effect_tags: ['recoil'],
      recoil_rule: { numerator: 33, denominator: 100, basis: 'applied_damage' },
      recoil_damage: 20
    }],
    effect_events: [{
      move: 'Flare Blitz',
      effect_kind: 'recoil',
      hp_before: 10,
      hp_after: 0,
      hp_delta: -10,
      max_hp: 100,
      damage_applied_to_user: 10,
      calculated_effect_damage: 20
    }]
  }]);
  eq(summary.mechanics_seen.recoil, 1, 'QA coverage should count recoil effect occurrences once');
  eq(summary.mechanics_seen.recoil_damage_rows, 1, 'QA coverage should keep separate recoil damage-row evidence');
});

T('T5c-4 Sparkline renders without error on 1-turn game', () => {
  const html = ctx.csReplaySparkline([{ turn: 1, post: { position_score: 0.5 } }]);
  truthy(html.includes('polyline'), 'sparkline missing polyline');
});

T('T5c-4a replay HP bars hide snapshot side prefixes on mirror species', () => {
  const html = ctx.csRenderHpBars({
    post: {
      hp_pct: {
        'player:active:0:Incineroar': 0.55,
        'opponent:active:0:Incineroar': 0.25
      }
    }
  });
  truthy(!html.includes('player:active:0:'), 'snapshot key leaked into HP bars');
  truthy(!html.includes('opponent:active:0:'), 'snapshot key leaked into HP bars');
  truthy((html.match(/Incineroar/g) || []).length >= 2, 'expected mirrored species labels to render');
});

const DECISION_PLAYER = [{ name: 'Hero', moves: ['Earthquake', 'Recover'], item: 'Leftovers', ability: 'Tough Claws', types: ['Ground'] }];
const DECISION_OPP = [{ name: 'Dummy', moves: ['Tackle'], item: 'Sitrus Berry', ability: 'Run Away', types: ['Flying'] }];
const DECISION_TURN_LOG = [{
  turn: 1,
  pre: {
    active: { player: ['Hero'], opponent: ['Dummy'] },
    hp_pct: { Hero: 0.22, Dummy: 1 },
    field: { weather: null, weather_turns: 0, terrain: null, terrain_turns: 0, trick_room: 0 },
    speed_order: ['Dummy', 'Hero'],
    legal_options: {
      Hero: ['Earthquake -> Dummy', 'Recover -> Dummy']
    }
  },
  actions: {
    player: [{ actor: 'Hero', move: 'Earthquake', target: 'Dummy' }],
    opponent: [{ actor: 'Dummy', move: 'Tackle', target: 'Hero' }]
  },
  post: { position_score: 0.3 },
  delta: { position_score: -0.2 }
}];

T('T5c-5 move inventories do not prove an alternative was usable', () => {
  const audit = ctx.csBuildDecisionAudit(DECISION_TURN_LOG, {
    playerKey: 'player',
    oppKey: 'opp',
    teamLookup: DECISION_PLAYER,
    oppLookup: DECISION_OPP,
    threshold: 10
  });
  eq(audit.total_flags, 0, 'unverified availability must not produce advice');
  eq(audit.flagged_turns.length, 0);
});

T('T5c-6 Replay Log does not render an unsupported better-line chip', () => {
  const html = ctx.csRenderTurnLogRows(DECISION_TURN_LOG, {
    playerKey: 'player',
    oppKey: 'opp',
    teamLookup: DECISION_PLAYER,
    oppLookup: DECISION_OPP
  });
  truthy(!html.includes('decision-gap'), 'unsupported decision gap rendered');
  truthy(!html.includes('Better line: Recover'), 'unsupported alternative rendered');
});

T('T5c-7 replay coaching does not diagnose execution from heuristic scores', () => {
  const out = ctx.csBuildReplayCoachingSummary({
    result: 'loss',
    oppKey: 'opp',
    turnLog: DECISION_TURN_LOG,
    turning_point: { turn: 1 }
  }, {
    playerKey: 'player',
    oppKey: 'opp',
    teamLookup: DECISION_PLAYER,
    oppLookup: DECISION_OPP
  });
  eq(out.issue_category, 'not enough evidence', 'expected conservative issue');
  eq(out.evidence_label, 'not enough evidence', 'expected evidence boundary');
  truthy(!/clearer line|execution rather/.test(out.detail), 'unsupported causal conclusion');
});

T('T5c-8 replay coaching summary does not fall back to strategy context in v1', () => {
  const out = ctx.csBuildReplayCoachingSummary({
    result: 'loss',
    oppKey: 'mega_altaria',
    turnLog: [{
      turn: 1,
      pre: {},
      actions: { player: [{ actor: 'Hero', move: 'Protect', target: 'Dummy' }], opponent: [] },
      post: { position_score: 0.4 },
      delta: { position_score: -0.1 }
    }],
    turning_point: { turn: 2 }
  });
  eq(out.issue_category, 'not enough evidence', 'expected conservative fallback');
  eq(out.evidence_label, 'not enough evidence', 'expected conservative evidence label');
  truthy(!/Protect the speed-control turn/.test(out.next_action), 'unexpected strategy-context action');
});

T('T5c-9 replay coaching summary supports not enough evidence', () => {
  const out = ctx.csBuildReplayCoachingSummary({
    result: 'loss',
    oppKey: 'mega_altaria',
    log: ['Turn 1']
  });
  eq(out.issue_category, 'not enough evidence', 'expected not-enough-evidence issue');
  eq(out.evidence_label, 'not enough evidence', 'expected not-enough-evidence label');
});

T('T5c-10 replay coaching summary renderer prints the bounded output rows', () => {
  const html = ctx.csRenderReplayCoachingSummary({
    issue_category: 'execution',
    evidence_label: 'replay + turn log',
    next_action: 'Review T1',
    detail: 'Replay shows a clearer line on the turning turn.'
  });
  truthy(html.includes('Coaching Summary'), 'summary title missing');
  truthy(html.includes('Issue'), 'issue row missing');
  truthy(html.includes('Evidence'), 'evidence row missing');
  truthy(html.includes('Next action'), 'next action row missing');
});

T('T5c-11 QA coverage counts blocked-priority families separately', () => {
  const turnLog = [{
    turn: 1,
    pre: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    post: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    actions: { player: [{ actor: 'Incineroar', move: 'Fake Out', priority: 3, target: 'Farigiraf' }], opponent: [] },
    damage_events: [],
    effect_events: [{
      actor: 'Incineroar',
      actor_key: 'player:slot:0:Incineroar',
      effect_kind: 'move-failure',
      move: 'Fake Out',
      move_failed: true,
      failed_move: 'Fake Out',
      failure_reason: 'armor_tail_priority_block',
      failure_reason_id: 'armor_tail_priority_block',
      reason_id: 'armor_tail_priority_block',
      blocked_priority: true,
      priority_failure_family: 'ability',
      blocker: 'Armor Tail',
      blocker_kind: 'armor_tail',
      target: 'Farigiraf',
      target_key: 'opponent:slot:0:Farigiraf',
      target_side: 'opponent'
    }, {
      actor: 'Incineroar',
      actor_key: 'player:slot:0:Incineroar',
      effect_kind: 'move-failure',
      move: 'Fake Out',
      move_failed: true,
      failed_move: 'Fake Out',
      failure_reason: 'quick_guard_priority_block',
      failure_reason_id: 'quick_guard_priority_block',
      reason_id: 'quick_guard_priority_block',
      blocked_priority: true,
      priority_failure_family: 'guard',
      blocker: 'Quick Guard',
      blocker_kind: 'quick_guard',
      target: 'Whimsicott',
      target_key: 'opponent:slot:1:Whimsicott',
      target_side: 'opponent'
    }, {
      actor: 'Incineroar',
      actor_key: 'player:slot:0:Incineroar',
      effect_kind: 'move-failure',
      move: 'Fake Out',
      move_failed: true,
      failed_move: 'Fake Out',
      failure_reason: 'psychic_terrain_priority_block',
      failure_reason_id: 'psychic_terrain_priority_block',
      reason_id: 'psychic_terrain_priority_block',
      blocked_priority: true,
      priority_failure_family: 'terrain',
      blocker: 'Psychic Terrain',
      blocker_kind: 'psychic_terrain',
      target: 'Indeedee-F',
      target_key: 'opponent:slot:2:Indeedee-F',
      target_side: 'opponent'
    }, {
      actor: 'Incineroar',
      actor_key: 'player:slot:0:Incineroar',
      effect_kind: 'move-failure',
      move: 'Fake Out',
      move_failed: true,
      failed_move: 'Fake Out',
      failure_reason: 'fake_out_timing',
      failure_reason_id: 'fake_out_timing',
      reason_id: 'fake_out_timing',
      blocked_priority: true,
      priority_failure_family: 'fake_out_timing'
    }]
  }];
  const summary = ctx.csBuildQaCoverageSummary(turnLog);
  eq(summary.mechanics_seen.blocked_priority_events, 4, 'blocked priority total mismatch');
  eq(summary.mechanics_seen.priority_ability_blocks, 1, 'ability priority block count mismatch');
  eq(summary.mechanics_seen.quick_guard_priority_blocks, 1, 'Quick Guard block count mismatch');
  eq(summary.mechanics_seen.psychic_terrain_priority_blocks, 1, 'Psychic Terrain block count mismatch');
  eq(summary.mechanics_seen.fake_out_timing_failures, 1, 'Fake Out timing count mismatch');
});

T('T5c-12 QA coverage counts status denial and move-lock families separately', () => {
  const turnLog = [{
    turn: 1,
    pre: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    post: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    actions: { player: [], opponent: [] },
    damage_events: [],
    effect_events: [{
      actor: 'Amoonguss',
      effect_kind: 'sleep-skip',
      move: 'Spore',
      reason_id: 'sleep',
      action_denial_reason: 'sleep',
      action_denial: true,
      skipped_move: true,
      skipped_action_move: 'Spore'
    }, {
      actor: 'Froslass',
      effect_kind: 'frozen-skip',
      move: 'Blizzard',
      reason_id: 'frozen',
      action_denial_reason: 'frozen',
      action_denial: true,
      skipped_move: true,
      skipped_action_move: 'Blizzard'
    }, {
      actor: 'Dragonite',
      effect_kind: 'paralysis-skip',
      move: 'Extreme Speed',
      reason_id: 'paralysis',
      action_denial_reason: 'paralysis',
      action_denial: true,
      skipped_move: true,
      skipped_action_move: 'Extreme Speed'
    }, {
      actor: 'Incineroar',
      effect_kind: 'flinch-skip',
      move: 'Fake Out',
      reason_id: 'flinch',
      action_denial_reason: 'flinch',
      action_denial: true,
      skipped_move: true,
      skipped_action_move: 'Fake Out'
    }, {
      actor: 'Golduck',
      effect_kind: 'confusion-self-hit',
      move: 'Confusion',
      reason_id: 'confusion',
      action_denial_reason: 'confusion',
      action_denial: true,
      skipped_move: true,
      skipped_action_move: 'Hydro Pump',
      damage_applied: 12
    }, {
      actor: 'Whimsicott',
      effect_kind: 'move-failure',
      move: 'Tailwind',
      move_failed: true,
      failure_reason_id: 'taunt',
      reason_id: 'taunt',
      move_failure_family: 'move_lock',
      blocker_kind: 'taunt'
    }, {
      actor: 'Toxtricity',
      effect_kind: 'move-failure',
      move: 'Boomburst',
      move_failed: true,
      failure_reason_id: 'throat_chop',
      reason_id: 'throat_chop',
      move_failure_family: 'move_lock',
      blocker_kind: 'throat_chop',
      sound_move_blocked: true
    }, {
      actor: 'Gengar',
      effect_kind: 'move-failure',
      move: 'Protect',
      move_failed: true,
      failure_reason_id: 'imprison',
      reason_id: 'imprison',
      move_failure_family: 'move_lock',
      blocker_kind: 'imprison'
    }, {
      actor: 'Greninja',
      effect_kind: 'move-failure',
      move: 'Hydro Pump',
      move_failed: true,
      failure_reason_id: 'accuracy_miss',
      reason_id: 'accuracy_miss'
    }, {
      actor: 'Dragapult',
      effect_kind: 'move-failure',
      move: 'Dragon Darts',
      move_failed: true,
      failure_reason_id: 'no_valid_target',
      reason_id: 'no_valid_target'
    }, {
      actor: 'Klefki',
      effect_kind: 'move-failure',
      move: 'Protect',
      move_failed: true,
      failure_reason_id: 'protect_consecutive_fail',
      reason_id: 'protect_consecutive_fail'
    }]
  }];
  const summary = ctx.csBuildQaCoverageSummary(turnLog);
  eq(summary.mechanics_seen.status_action_denials, 5, 'status/action denial count mismatch');
  eq(summary.mechanics_seen.sleep_action_denials, 1, 'sleep denial count mismatch');
  eq(summary.mechanics_seen.freeze_action_denials, 1, 'freeze denial count mismatch');
  eq(summary.mechanics_seen.paralysis_action_denials, 1, 'paralysis denial count mismatch');
  eq(summary.mechanics_seen.flinch_action_denials, 1, 'flinch denial count mismatch');
  eq(summary.mechanics_seen.confusion_action_denials, 1, 'confusion denial count mismatch');
  eq(summary.mechanics_seen.move_lock_failures, 3, 'move-lock count mismatch');
  eq(summary.mechanics_seen.taunt_move_blocks, 1, 'Taunt block count mismatch');
  eq(summary.mechanics_seen.throat_chop_sound_blocks, 1, 'Throat Chop block count mismatch');
  eq(summary.mechanics_seen.imprison_move_blocks, 1, 'Imprison block count mismatch');
  eq(summary.mechanics_seen.accuracy_misses, 1, 'accuracy miss count mismatch');
  eq(summary.mechanics_seen.no_valid_target_failures, 1, 'no-valid-target count mismatch');
  eq(summary.mechanics_seen.target_resolution_failures, 1, 'target-resolution count mismatch');
  eq(summary.mechanics_seen.protect_consecutive_failures, 1, 'Protect consecutive failure count mismatch');
  eq(summary.mechanics_seen.protect_consecutive_unexpected_failures, 1, 'Protect unexpected failure count mismatch');
});

T('T5c-13 QA coverage counts status resolution pass-through families separately', () => {
  const turnLog = [{
    turn: 1,
    pre: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    post: { active: { player: [], opponent: [] }, bench: { player: [], opponent: [] }, roster: { player: [], opponent: [] }, status: {}, field: {}, speed_control: {} },
    actions: { player: [], opponent: [] },
    damage_events: [],
    effect_events: [{
      actor: 'Froslass',
      effect_kind: 'frozen-thaw',
      move: 'Blizzard',
      reason_id: 'frozen_thaw',
      status_resolution: true,
      thawed_this_turn: true,
      resolved_status: 'frozen'
    }, {
      actor: 'Amoonguss',
      effect_kind: 'sleep-wake',
      move: 'Spore',
      reason_id: 'sleep_wake',
      status_resolution: true,
      woke_this_turn: true,
      resolved_status: 'sleep'
    }, {
      actor: 'Snorlax',
      effect_kind: 'sleep-exception',
      move: 'Sleep Talk',
      reason_id: 'sleep_talk_exception',
      status_exception: true,
      sleep_exception: true,
      resolved_status: 'sleep'
    }, {
      actor: 'Dragonite',
      effect_kind: 'paralysis-speed-only',
      move: 'Extreme Speed',
      reason_id: 'paralysis_speed_only',
      status_resolution: true,
      speed_only_status_effect: true,
      resolved_status: 'paralysis'
    }, {
      actor: 'Golduck',
      effect_kind: 'confusion-pass-through',
      move: 'Hydro Pump',
      reason_id: 'confusion_pass_through',
      status_resolution: true,
      confusion_passed: true,
      volatile_status: 'confusion'
    }]
  }];
  const summary = ctx.csBuildQaCoverageSummary(turnLog);
  eq(summary.mechanics_seen.status_resolution_events, 5, 'status resolution count mismatch');
  eq(summary.mechanics_seen.frozen_thaws, 1, 'freeze thaw count mismatch');
  eq(summary.mechanics_seen.sleep_wakes, 1, 'sleep wake count mismatch');
  eq(summary.mechanics_seen.sleep_talk_exceptions, 1, 'Sleep Talk exception count mismatch');
  eq(summary.mechanics_seen.paralysis_speed_only, 1, 'paralysis speed-only count mismatch');
  eq(summary.mechanics_seen.confusion_pass_through, 1, 'confusion pass-through count mismatch');
});

console.log(`\nPhase 5 turn log: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
