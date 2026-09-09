'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
function makeStubEl() {
  return {
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){},
    removeEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    setAttribute(){},
    getAttribute(){ return null; },
    appendChild(){},
    click(){},
    value: '',
    options: [],
    selectedIndex: 0,
    innerHTML: '',
    textContent: ''
  };
}

const document = {
  documentElement: makeStubEl(),
  body: makeStubEl(),
  getElementById(){ return makeStubEl(); },
  querySelector(){ return makeStubEl(); },
  querySelectorAll(){ return []; },
  createElement(){ return makeStubEl(); },
  addEventListener(){},
  removeEventListener(){}
};

const ctx = {
  console, Math, Object, Array, Set, Map, JSON, Date, String, Number, Boolean, RegExp, Error, Symbol, parseFloat, parseInt, isFinite,
  document,
  window: {
    document,
    addEventListener(){},
    removeEventListener(){},
    matchMedia(){ return { matches: false, addEventListener(){}, removeEventListener(){} }; }
  },
  matchMedia(){ return { matches: false, addEventListener(){}, removeEventListener(){} }; },
  localStorage: {
    getItem(){ return null; },
    setItem(){},
    removeItem(){}
  }
};
ctx.window.localStorage = ctx.localStorage;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
vm.runInContext('this.TEAMS = TEAMS;', ctx);
vm.runInContext('this.__branchTestTeams = { targeted_proof_legal: TEAMS.targeted_proof_legal, cofagrigus_tr: TEAMS.cofagrigus_tr };', ctx);
try { load('generated/pokemon_showdown_legal_data.js'); } catch (_) {}
load('generated/champions_move_pools.js');
try { load('runtime_data.js'); } catch (_) {}
try { load('move_legality.js'); } catch (_) {}
try { load('legality.js'); } catch (_) {}
load('engine.js');
load('ui.js');
// Synthetic algorithm fixtures, not reviewed regulation evidence.
ctx.canRunRegulationAnalysis = () => true;
vm.runInContext('TEAMS.targeted_proof_legal = this.__branchTestTeams.targeted_proof_legal; TEAMS.cofagrigus_tr = this.__branchTestTeams.cofagrigus_tr;', ctx);

vm.runInContext([
  'this.csBuildForcedBranchMatrixSweepEvidence = csBuildForcedBranchMatrixSweepEvidence;',
  'this.csBranchMatrixRunKey = csBranchMatrixRunKey;',
  'this.csSummarizeBranchTactics = csSummarizeBranchTactics;'
].join(' '), ctx);

let pass = 0;
let fail = 0;
const pendingTests = [];
function T(name, fn) {
  let result;
  try {
    result = fn();
  } catch (err) {
    fail++;
    console.log('  FAIL', name, '-', err.message);
    return;
  }
  if (result && typeof result.then === 'function') {
    pendingTests.push(
      result.then(() => { pass++; console.log('  PASS', name); })
             .catch((err) => { fail++; console.log('  FAIL', name, '-', err.message); })
    );
  } else {
    pass++;
    console.log('  PASS', name);
  }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'mismatch') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== forced branch matrix tests ===\n');

T('1. selected lead mode locks the lead pair', async () => {
  const sweep = await ctx.csBuildForcedBranchMatrixSweepEvidence({
    playerTeamId: 'targeted_proof_legal',
    opponentTeamId: 'cofagrigus_tr',
    playerLeadMode: 'selected',
    opponentLeadMode: 'selected',
    playerLeadNames: ['Orthworm', 'Kangaskhan'],
    opponentLeadNames: ['Cofagrigus', 'Sinistcha'],
    maxRuns: 2,
    maxMovesPerMon: 1,
    maxTargetsPerMove: 1
  });
  eq(sweep.status, 'complete', 'status');
  eq(sweep.coverage_space.player_lead_pairs_considered, 1, 'player lead pair count');
  eq(sweep.coverage_space.opponent_lead_pairs_considered, 1, 'opponent lead pair count');
  truthy(sweep.runs.every((run) => run.player_bring[0] === 'Orthworm' && run.player_bring[1] === 'Kangaskhan'), 'player lead not locked');
  truthy(sweep.runs.every((run) => run.opponent_bring[0] === 'Cofagrigus' && run.opponent_bring[1] === 'Sinistcha'), 'opponent lead not locked');
  truthy(sweep.runs.every((run) => run.tactical_summary && run.tactical_summary.schema_version === 'champions-branch-tactics-v1'), 'missing tactical summary');
  truthy(sweep.runs.every((run) => run.tactical_summary.horizon_turns === 3), 'default tactical horizon should be 3 turns');
});

T('2. random lead mode rotates ordered lead combinations', async () => {
  const sweep = await ctx.csBuildForcedBranchMatrixSweepEvidence({
    playerTeamId: 'targeted_proof_legal',
    opponentTeamId: 'cofagrigus_tr',
    playerLeadMode: 'random',
    opponentLeadMode: 'random',
    maxLeadPairsPerSide: 2,
    maxRuns: 8,
    maxMovesPerMon: 1,
    maxTargetsPerMove: 1
  });
  eq(sweep.coverage_space.player_lead_pairs_considered, 2, 'player random lead pair count');
  eq(sweep.coverage_space.opponent_lead_pairs_considered, 2, 'opponent random lead pair count');
  truthy(sweep.coverage_space.candidate_runs >= 4, 'candidate branch count too small');
  truthy(new Set(sweep.runs.map((run) => run.player_bring.slice(0, 2).join('+'))).size > 1, 'random mode did not rotate player leads');
});

T('3. seen branch keys are deprioritized and counted', async () => {
  const first = await ctx.csBuildForcedBranchMatrixSweepEvidence({
    playerTeamId: 'targeted_proof_legal',
    opponentTeamId: 'cofagrigus_tr',
    playerLeadMode: 'selected',
    opponentLeadMode: 'selected',
    playerLeadNames: ['Orthworm', 'Kangaskhan'],
    opponentLeadNames: ['Cofagrigus', 'Sinistcha'],
    maxRuns: 1,
    maxMovesPerMon: 1,
    maxTargetsPerMove: 1
  });
  const key = first.runs[0].branch_key;
  const second = await ctx.csBuildForcedBranchMatrixSweepEvidence({
    playerTeamId: 'targeted_proof_legal',
    opponentTeamId: 'cofagrigus_tr',
    playerLeadMode: 'selected',
    opponentLeadMode: 'selected',
    playerLeadNames: ['Orthworm', 'Kangaskhan'],
    opponentLeadNames: ['Cofagrigus', 'Sinistcha'],
    seenBranchKeys: [key],
    maxRuns: 1,
    maxMovesPerMon: 1,
    maxTargetsPerMove: 1
  });
  eq(second.coverage_space.unseen_candidate_runs, 0, 'unseen count');
  eq(second.runs[0].seen_before, true, 'seen flag');
});

T('4. tactical summary extracts protect, pivot, speed control, and position timing', () => {
  const summary = ctx.csSummarizeBranchTactics([
    {
      turn: 1,
      actions: {
        player: [{ actor: 'A', move: 'Protect' }, { actor: 'B', move: 'U-turn' }],
        opponent: [{ actor: 'C', move: 'Tailwind' }]
      },
      events: [{ text: 'B pivoted out!' }],
      pre: { position_score: 0.4 },
      post: { position_score: 0.45 }
    },
    {
      turn: 2,
      actions: { player: [{ actor: 'D', move: 'Dragon Dance' }], opponent: [] },
      events: [{ text: 'A fainted!' }],
      post: { position_score: 0.1 }
    }
  ], [{ turn: 1, side: 'player', slot: 0, move: 'Protect' }], { horizonTurns: 3 });
  truthy(summary.timing_tags.includes('player_protect_t1'), 'missing protect timing tag');
  truthy(summary.timing_tags.includes('player_pivot_t1'), 'missing pivot timing tag');
  truthy(summary.timing_tags.includes('opponent_speed_control_t1'), 'missing speed control timing tag');
  truthy(summary.timing_tags.includes('first_ko_t2'), 'missing first KO timing tag');
  truthy(summary.timing_tags.includes('early_position_loss'), 'missing position-loss tag');
});

Promise.all(pendingTests).then(() => {
  console.log(`\nforced branch matrix tests: ${pass} pass, ${fail} fail\n`);
  process.exit(fail ? 1 : 0);
});
