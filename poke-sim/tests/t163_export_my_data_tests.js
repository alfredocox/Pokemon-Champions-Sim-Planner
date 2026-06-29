// T163 — Export My Data as JSON
//
// Coverage targets (10 cases):
//   1. HTML exposes the export button in the Saved Analyses header.
//   2. Local export payload includes sim log + cached reports for the active team.
//   3. DB-backed export payload includes analyses + nested analysis logs.
//   4. Click handler downloads a JSON file with the expected prefix.
//   5. HTML exposes the QA artifact export button in the Saved Analyses header.
//   6. QA artifact documents retention caps, build ID, source URL, and retained evidence.
//   7. QA artifact click handler downloads a JSON file with the expected prefix.
//   8. Tactical Sweep QA can fan branch coverage across multiple opponents.
//   9. Tactical Sweep QA emits progress callbacks while running.
//   10. QA Artifact targeted sweep clears stat-source proof gaps.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { URL: NativeURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl(id) {
  return {
    id: id || '',
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    options: [],
    selectedIndex: 0,
    className: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    setAttribute(){},
    getAttribute(){ return null; },
    addEventListener(ev, fn) {
      this._listeners = this._listeners || {};
      (this._listeners[ev] = this._listeners[ev] || []).push(fn);
    },
    querySelector() { return makeStubEl('query'); },
    querySelectorAll() { return []; },
    appendChild(){},
    removeChild(){},
    click(){},
  };
}

const document = {
  _els: {},
  getElementById(id) {
    if (!this._els[id]) this._els[id] = makeStubEl(id);
    return this._els[id];
  },
  querySelector() { return makeStubEl('query'); },
  querySelectorAll() { return []; },
  createElement() { return makeStubEl('el'); },
  addEventListener() {},
  removeEventListener() {},
  body: makeStubEl('body'),
  documentElement: makeStubEl('html'),
  head: makeStubEl('head')
};

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error,
  RegExp, Symbol, parseFloat, parseInt, isFinite,
  window: {
    matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
    addEventListener() {},
    removeEventListener() {}
  },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document,
  navigator: { serviceWorker: { register() { return Promise.resolve(); } } },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] !== undefined ? this._s[k] : null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; },
    clear() { this._s = {}; }
  },
  URL: Object.assign(class extends NativeURL {}, { createObjectURL() { return 'blob:stub'; }, revokeObjectURL() {} }),
  Blob: function(parts) { this.parts = parts; },
  alert(msg) { ctx._lastAlert = msg; },
  location: { href: 'http://localhost/' }
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
ctx.window.window = ctx.window;
ctx.window.document = document;
ctx.window.navigator = ctx.navigator;
ctx.window.localStorage = ctx.localStorage;
ctx.window.URL = ctx.URL;
ctx.window.Blob = ctx.Blob;
ctx.window.alert = ctx.alert;
ctx.window.location = ctx.location;

vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

[
  'release_manifest.js',
  'app_shell.js',
  'data.js',
  'logger.js',
  'engine.js',
  'storage_adapter.js',
  'supabase_adapter.js',
  'ui.js'
].forEach(load);

vm.runInContext([
  'this.TEAMS = TEAMS;',
  'this.Storage = Storage;',
  'this.teamSignature = teamSignature;',
  'this.csBuildMyDataExport = csBuildMyDataExport;',
  'this.csExportMyDataJson = csExportMyDataJson;',
  'this.csBuildQaArtifactExport = csBuildQaArtifactExport;',
  'this.csExportQaArtifactJson = csExportQaArtifactJson;',
  'this.csGetPublicBetaGuardProfile = csGetPublicBetaGuardProfile;',
  'this.csApplyPublicBetaGuardrails = csApplyPublicBetaGuardrails;',
  'this.csLoadCoachBrainMemory = csLoadCoachBrainMemory;',
  'this.addReplays = addReplays;'
].join(' '), ctx);

const {
  TEAMS,
  Storage,
  teamSignature,
  csBuildMyDataExport,
  csExportMyDataJson,
  csBuildQaArtifactExport,
  csExportQaArtifactJson,
  csGetPublicBetaGuardProfile,
  csApplyPublicBetaGuardrails,
  addReplays
} = ctx;

let pass = 0, fail = 0;
async function T(name, fn) {
  try {
    await fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '—', e.message);
    fail++;
  }
}
function eq(a, b, msg='') { if (a !== b) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
function truthy(v, msg='') { if (!v) throw new Error(msg || 'expected truthy'); }

function seedLocalHistory() {
  const sig = teamSignature(TEAMS.player);
  Storage.set('champions_strategy_report_v1', {
    schema_version: 1,
    reports: {
      [sig]: {
        team_key: 'player',
        theory_report: { team_signature: sig, trend_analysis: { has_data: true } },
        simulation_overlay: null,
        last_built_at: '2026-05-15T10:00:00.000Z',
        last_simmed_at: '2026-05-15T10:00:00.000Z'
      }
    }
  });
  Storage.set('champions_sim_log_v1', {
    schema_version: 1,
    entries: [
      {
        id: 'sim_1',
        ts: 123,
        playerKey: 'player',
        oppKey: 'mega_altaria',
        format: 'doubles',
        bo: 3,
        games: [{ result: 'win', turns: 7, winCondition: 'speed control' }],
        seriesResult: 'win'
      }
    ]
  });
}

async function main() {
  console.log('\nExport my data (T163):');

  await T('1. index.html exposes the export-history-json button', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    truthy(/id="export-history-json-btn"/.test(html), 'export button missing');
    truthy(/Export JSON/.test(html), 'export label missing');
  });

  await T('2. local export payload includes cached reports and sim log', async () => {
    seedLocalHistory();
    ctx.window.SupabaseAdapter = { enabled: false };
    ctx.currentPlayerKey = 'player';
    const payload = await csBuildMyDataExport('player');
    eq(payload.schema_version, 1);
    eq(payload.player_team_id, 'player');
    truthy(payload.local && payload.local.reports, 'reports missing');
    truthy(payload.local && Array.isArray(payload.local.sim_log), 'sim_log missing');
    truthy(payload.local && Array.isArray(payload.local.team_history), 'team_history missing');
    truthy(payload.local.sim_log.length >= 1, 'local sim log not exported');
    truthy(payload.local.current_report, 'current_report missing');
  });

  await T('3. db export payload includes analyses and nested logs', async () => {
    ctx.window.SupabaseAdapter = {
      enabled: true,
      loadAnalysesForPlayer: async function(playerKey, limit) {
        eq(playerKey, 'player');
        eq(limit, 500);
        return [
          { analysis_id: 'a1', created_at: '2026-05-15T10:00:00.000Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.75, wins: 3, losses: 1, sample_size: 4 }
        ];
      },
      loadAnalysisLogs: async function(analysisId) {
        eq(analysisId, 'a1');
        return [
          { game_number: 1, result: 'win', turns: 8, tr_turns: 2, win_condition: 'setup' }
        ];
      }
    };
    const payload = await csBuildMyDataExport('player');
    truthy(payload.db && payload.db.enabled, 'db not marked enabled');
    eq(payload.db.analyses.length, 1, 'analysis count');
    eq(payload.db.analyses[0].analysis_id, 'a1');
    eq(payload.db.analyses[0].logs.length, 1, 'nested logs missing');
  });

  await T('4. export click downloads a JSON file with the expected prefix', async () => {
    seedLocalHistory();
    ctx.window.SupabaseAdapter = { enabled: false };
    ctx._downloaded = null;
    ctx._downloadBlob = function(filename, mime, text) {
      ctx._downloaded = { filename: filename, mime: mime, text: text };
    };
    const payload = await csExportMyDataJson('player');
    truthy(ctx._downloaded, 'download not triggered');
    truthy(/^champions-sim-my-data-/.test(ctx._downloaded.filename), 'unexpected filename');
    eq(ctx._downloaded.mime, 'application/json');
    const parsed = JSON.parse(ctx._downloaded.text);
    eq(parsed.schema_version, 1);
    eq(parsed.player_team_id, 'player');
    truthy(payload.db && Array.isArray(payload.db.analyses), 'returned payload malformed');
  });

  await T('5. index.html exposes the QA artifact export button', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    truthy(/id="export-qa-artifact-json-btn"/.test(html), 'QA artifact button missing');
    truthy(/QA Artifact/.test(html), 'QA artifact label missing');
    truthy(/id="run-all-export-qa-btn"/.test(html), 'Run All + QA Artifact button missing');
    truthy(/id="stress-lite-qa-btn"/.test(html), 'Stress Lite + QA button missing');
    truthy(/id="tactical-sweep-qa-btn"/.test(html), 'Tactical Sweep + QA button missing');
    truthy(/Quick check: runs one matchup/.test(html), 'Run Simulation hover help missing');
    truthy(/Broad release check: runs many matchups/.test(html), 'Run All hover help missing');
    truthy(/Release evidence: runs all matchups/.test(html), 'Run All + QA hover help missing');
    truthy(/Safe stress check: runs capped lower-load coverage/.test(html), 'Stress Lite hover help missing');
    truthy(/Coaching and strategy check: tests branches/.test(html), 'Tactical Sweep hover help missing');
    truthy(/Workflow helper: choose a local folder/.test(html), 'QA drop folder hover help missing');
    truthy(/id="beta-guard-note"/.test(html), 'beta guard note missing');
    truthy(/id="qa-drop-folder-btn"/.test(html), 'QA drop folder button missing');
    truthy(/Tactical Sweep \+ QA/.test(html), 'Tactical Sweep + QA label missing');
    truthy(/id="sim-scope"/.test(html), 'Test Scope selector missing');
    truthy(/Selected matchup/.test(html), 'Selected matchup scope option missing');
    truthy(/10,000 series \(full team stress\)/.test(html), '10,000 stress sample option missing');
    truthy(/id="tactical-depth"/.test(html), 'Tactical Depth selector missing');
    truthy(/Deep 100 branches/.test(html), 'Tactical Depth deep option missing');
    const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
    const appShell = fs.readFileSync(path.join(ROOT, 'app_shell.js'), 'utf8');
    truthy(/function setBranchProgress/.test(ui), 'branch progress helper missing');
    truthy(/saved_rows/.test(ui), 'branch progress saved-row counter missing');
    truthy(/function getTacticalDepthMaxRuns/.test(ui), 'tactical depth helper missing');
    truthy(/function csBuildStressLiteOptions/.test(ui), 'Stress Lite options helper missing');
    truthy(/qaRunType = stressLite \? 'stress_lite_qa'/.test(ui), 'Stress Lite QA run type missing');
    truthy(/branchMatrixMaxRunsPerOpponent:\s*tacticalDepthMaxRuns/.test(ui), 'Tactical Sweep should use selected depth');
    truthy(/function csReloadAfterBuildCacheReset/.test(appShell), 'build cache refresh reload helper missing');
    truthy(/location\.replace/.test(appShell), 'build cache refresh should replace stale page after cleanup');
  });

  await T('6. QA artifact includes retention caps, build, source, and retained evidence', async () => {
    seedLocalHistory();
    ctx.window.SupabaseAdapter = { enabled: false };
    ctx.currentPlayerKey = 'player';
    addReplays([
      {
        seed: 'qa-seed-1',
        playerKey: 'player',
        oppKey: 'mega_altaria',
        result: 'win',
        turns: 6,
        winCondition: 'speed control',
        trTurns: 0,
        twTurns: 2,
        log: ['Turn 1', 'Turn 2'],
        turnLog: [{ turn: 1, actions: { player: [], opponent: [] } }],
        position_path: [{ turn: 1, position_score: 0.6 }]
      }
    ], 'mega_altaria');
    const payload = await csBuildQaArtifactExport('player');
    eq(payload.schema_version, 'champions-qa-artifact-v1');
    eq(payload.artifact_type, 'large-run-qa-retained-evidence');
    truthy(/^v2\.\d+\.\d+-[a-z0-9-]+$/.test(payload.build_id || ''), 'QA build id missing');
    truthy(/^http:\/\/localhost\/\?v=v2\.\d+\.\d+-[a-z0-9-]+&fresh=1$/.test(payload.source_url || ''), 'QA source URL missing build cache buster');
    eq(payload.retention.max_replay_cards, 240);
    eq(payload.retention.max_replay_log_lines, 200);
    eq(payload.retention.max_simlog_total, 500);
    eq(payload.retention.max_simlog_per_pair, 100);
    truthy(payload.summary && payload.summary.total_retained_simlog_entries >= 1, 'sim log summary missing');
    truthy(payload.summary.retained_replay_cards >= 1, 'replay summary missing');
    eq(payload.qa_coverage_summary.schema_version, 'champions-qa-coverage-v1', 'QA artifact coverage schema missing');
    eq(payload.qa_coverage_summary.totals.replay_cards_scanned, 1, 'QA artifact coverage replay count mismatch');
    eq(payload.qa_coverage_summary.totals.targeted_sweep_runs, 9, 'QA artifact targeted sweep count mismatch');
    truthy(payload.qa_coverage_summary.totals.turns > 1, 'QA artifact merged coverage should include targeted sweep turns');
    truthy(payload.targeted_qa_sweep && payload.targeted_qa_sweep.status === 'complete', 'targeted QA sweep should be complete');
    truthy(payload.qa_coverage_summary.mechanics_seen.screen_reduction > 0, 'targeted sweep should add screen reduction proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.hp_cost > 0, 'targeted sweep should add HP-cost proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.delayed_recovery > 0, 'targeted sweep should add delayed recovery proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.residual_drain > 0, 'targeted sweep should add residual drain proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.nonstandard_stat_source_trace > 0, 'targeted sweep should add stat-source proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.foul_play_trace > 0, 'targeted sweep should add Foul Play proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.body_press_trace > 0, 'targeted sweep should add Body Press proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.psyshock_trace > 0, 'targeted sweep should add Psyshock proof');
    truthy(payload.retained && payload.retained.sim_log.length >= 1, 'retained sim log missing');
    truthy(payload.retained && payload.retained.replay_cards.length >= 1, 'retained replay cards missing');
    eq(payload.retained.replay_cards[0].seed, 'qa-seed-1');
    eq(payload.retained.replay_cards[0].qa_coverage_summary.schema_version, 'champions-qa-coverage-v1', 'retained replay coverage missing');
  });

  await T('7. QA artifact click downloads a JSON file with the expected prefix', async () => {
    seedLocalHistory();
    ctx.window.SupabaseAdapter = { enabled: false };
    ctx._downloaded = null;
    ctx.window.showDirectoryPicker = null;
    ctx._downloadBlob = function(filename, mime, text) {
      ctx._downloaded = { filename: filename, mime: mime, text: text };
    };
    const payload = await csExportQaArtifactJson('player');
    truthy(ctx._downloaded, 'download not triggered');
    truthy(/^champions-sim-qa-artifact-/.test(ctx._downloaded.filename), 'unexpected filename');
    eq(ctx._downloaded.mime, 'application/json');
    const parsed = JSON.parse(ctx._downloaded.text);
    eq(parsed.schema_version, 'champions-qa-artifact-v1');
    eq(parsed.player_team_id, 'player');
    truthy(payload.summary && payload.retention, 'returned QA payload malformed');
  });

  await T('8. Tactical Sweep QA covers multiple branch opponents', async () => {
    seedLocalHistory();
    ctx.window.SupabaseAdapter = { enabled: false };
    const payload = await csBuildQaArtifactExport('player', {
      branchMatrixUseScope: true,
      branchOpponentTeamIds: ['mega_altaria', 'mega_dragonite'],
      branchMatrixMaxRunsPerOpponent: 1,
      includeReplayCards: false,
      includeSimLog: false,
      includeTargetedSweep: false
    });
    truthy(payload.tactical_sweep && payload.tactical_sweep.enabled, 'tactical sweep block missing');
    eq(payload.qa_run_type, 'tactical_sweep', 'qa run type');
    eq(payload.tactical_sweep.schema_version, 'champions-tactical-sweep-v1', 'tactical schema version');
    eq(payload.tactical_sweep.status, 'complete', 'tactical status');
    eq(payload.tactical_sweep.opponent_count, 2, 'opponent count');
    eq(payload.tactical_sweep.opponents.length, 2, 'opponent metadata count');
    eq(payload.tactical_sweep.matrices.length, 2, 'matrix count');
    eq(payload.tactical_sweep.total_executed_runs, 2, 'executed branch total');
    truthy(payload.tactical_sweep.opponents[0].opponent_team_id, 'opponent id missing');
    truthy(typeof payload.ready_for_codex === 'boolean', 'ready_for_codex missing');
    truthy(Array.isArray(payload.next_missing_proof), 'next_missing_proof missing');
    truthy(typeof payload.recommended_next_test === 'string' && payload.recommended_next_test.length, 'recommended_next_test missing');
    truthy(payload.qa_coverage_summary.coach_brain_summary && payload.qa_coverage_summary.coach_brain_summary.tactical_interpretation, 'coach tactical interpretation missing');
    eq(payload.qa_coverage_summary.coach_brain_summary.tactical_interpretation.schema_version, 'champions-coach-tactical-interpretation-v1', 'coach tactical interpretation schema');
    truthy(Array.isArray(payload.qa_coverage_summary.coach_brain_summary.tactical_interpretation.coach_checklist), 'coach tactical checklist missing');
    truthy(ctx.csLoadCoachBrainMemory().summaries.length >= 1, 'QA artifact should save compact coach brain memory');
    truthy(payload.codex_context && payload.codex_context.qa_run_type === 'tactical_sweep', 'codex qa run type missing');
    truthy(typeof payload.codex_context.ready_for_codex === 'boolean', 'codex readiness missing');
    truthy(payload.codex_context.coach_focus, 'codex coach focus missing');
    truthy(Object.prototype.hasOwnProperty.call(payload.codex_context.coach_focus, 'recommended_solution'), 'codex coach solution missing');
    truthy(Array.isArray(payload.codex_context.coach_focus.tactical_watch_next), 'codex coach watch list missing');
    eq(payload.codex_context.retained_evidence.tactical_sweep_opponents, 2, 'codex tactical opponent count');
    eq(payload.codex_context.retained_evidence.tactical_sweep_status, 'complete', 'codex tactical status');
    eq(payload.qa_coverage_summary.totals.branch_matrix_runs, 2, 'coverage branch run total');
    truthy(payload.forced_branch_matrix && payload.forced_branch_matrix.coverage_space.executed_runs === 1, 'compat forced_branch_matrix missing');
    truthy(payload.branch_move_analysis && payload.branch_move_analysis.totals.rows_read >= 2, 'combined branch move analysis missing');
  });

  await T('9. Tactical Sweep QA emits progress callbacks', async () => {
    ctx.window.SupabaseAdapter = { enabled: false };
    const events = [];
    await csBuildQaArtifactExport('player', {
      branchMatrixUseScope: true,
      branchOpponentTeamIds: ['mega_altaria', 'mega_dragonite'],
      branchMatrixMaxRunsPerOpponent: 1,
      includeReplayCards: false,
      includeSimLog: false,
      includeTargetedSweep: false,
      onBranchMatrixProgress(event) {
        events.push(event && event.phase);
      }
    });
    truthy(events.includes('start'), 'progress start missing');
    truthy(events.includes('load'), 'progress load missing');
    truthy(events.includes('build'), 'progress build missing');
    truthy(events.includes('save'), 'progress save missing');
    truthy(events.includes('done'), 'progress done missing');
    truthy(events.includes('complete'), 'progress complete missing');
  });

  await T('10. Stress Lite QA is capped and explicitly labeled', async () => {
    ctx.window.SupabaseAdapter = { enabled: false };
    const payload = await csBuildQaArtifactExport('player', Object.assign(ctx.csBuildStressLiteOptions({ simScope: 'preloaded' }), {
      branchOpponentTeamIds: ['mega_altaria', 'mega_dragonite', 'mega_gengar', 'mega_lapras'],
      includeReplayCards: false,
      includeSimLog: false
    }));
    eq(payload.qa_run_type, 'stress_lite_qa', 'stress lite run type');
    truthy(payload.stress_lite && payload.stress_lite.schema_version === 'champions-stress-lite-qa-v1', 'stress lite block missing');
    truthy(payload.stress_lite.max_runs_per_opponent <= 12, 'stress lite per-opponent cap should not exceed default');
    truthy(payload.stress_lite.opponent_count <= 4, 'stress lite opponent cap count should not exceed default');
    truthy(payload.stress_lite.opponent_count >= 1, 'stress lite should keep at least one opponent when available');
    eq(payload.retention.include_stress_lite, true, 'stress lite retention flag');
    truthy(payload.stress_lite.boundary.indexOf('not exhaustive Run All proof') >= 0, 'stress lite boundary missing');
    eq(payload.tactical_sweep.total_executed_runs <= (payload.stress_lite.opponent_count * payload.stress_lite.max_runs_per_opponent), true, 'stress lite should cap total branch runs');
    truthy(payload.stress_lite.summary && payload.stress_lite.summary.schema_version === 'champions-stress-lite-summary-v1', 'stress lite summary missing');
    truthy(payload.stress_lite.summary.totals.branch_runs_executed >= 1, 'stress lite summary run total missing');
    truthy(typeof payload.stress_lite.summary.totals.damage_events === 'number', 'stress lite summary damage total missing');
    truthy(typeof payload.stress_lite.summary.totals.effect_events === 'number', 'stress lite summary effect total missing');
    truthy(payload.stress_lite.summary.coaching_signal, 'stress lite coaching signal missing');
    eq(payload.turns_total, payload.qa_coverage_summary.totals.turns, 'top-level turns total mismatch');
    eq(payload.action_rows_total, payload.qa_coverage_summary.totals.action_rows, 'top-level action row total mismatch');
    eq(payload.damage_events_total, payload.qa_coverage_summary.totals.damage_events, 'top-level damage total mismatch');
    eq(payload.effect_events_total, payload.qa_coverage_summary.totals.effect_events, 'top-level effect total mismatch');
    eq(payload.branch_matrix_runs, payload.qa_coverage_summary.totals.branch_matrix_runs, 'top-level branch runs mismatch');
  });

  await T('11. QA Artifact targeted sweep clears stat-source proof gaps', async () => {
    ctx.window.SupabaseAdapter = { enabled: false };
    const payload = await csBuildQaArtifactExport('player', {
      includeReplayCards: false,
      includeSimLog: false,
      includeBranchMatrix: false
    });
    const mechanics = payload.qa_coverage_summary && payload.qa_coverage_summary.mechanics_seen || {};
    truthy(TEAMS.targeted_stat_source_proof, 'targeted stat-source proof team missing');
    truthy(mechanics.nonstandard_stat_source_trace > 0, 'nonstandard stat-source trace missing');
    truthy(mechanics.foul_play_trace > 0, 'foul play trace missing');
    truthy(mechanics.body_press_trace > 0, 'body press trace missing');
    truthy(mechanics.psyshock_trace > 0, 'psyshock trace missing');
    truthy(mechanics.ignored_target_power_ability_trace > 0, 'Foul Play target power ability guard missing');
    eq((payload.next_missing_proof || []).includes('non-standard stat-source move trace'), false, 'stat-source proof should not be missing');
  });

  await T('12. hard beta guardrails force Stress Lite on mobile or low-memory devices', async () => {
    document.getElementById('sim-count').options = [
      { value: '10', disabled: false },
      { value: '50', disabled: false },
      { value: '100', disabled: false },
      { value: '500', disabled: false },
      { value: '1000', disabled: false },
      { value: '10000', disabled: false }
    ];
    document.getElementById('sim-count').value = '10000';
    document.getElementById('tactical-depth').options = [
      { value: '24', disabled: false },
      { value: '100', disabled: false },
      { value: '250', disabled: false },
      { value: 'all', disabled: false }
    ];
    document.getElementById('tactical-depth').value = 'all';
    ctx.window.matchMedia = (query) => ({ matches: query.indexOf('pointer: coarse') >= 0 || query.indexOf('max-width: 760px') >= 0, addEventListener(){}, removeEventListener(){} });
    ctx.matchMedia = ctx.window.matchMedia;
    ctx.navigator.deviceMemory = 4;
    const profile = csGetPublicBetaGuardProfile();
    truthy(profile.should_force_stress_lite, 'hard beta profile should force Stress Lite');
    csApplyPublicBetaGuardrails();
    truthy(document.getElementById('run-all-btn').disabled, 'Run All should be disabled by hard beta guard');
    truthy(document.getElementById('run-all-export-qa-btn').disabled, 'Run All + QA should be disabled by hard beta guard');
    truthy(document.getElementById('beta-guard-note').textContent.indexOf('Hard beta guard active') >= 0, 'hard beta note missing');
    eq(document.getElementById('sim-count').value, '500', 'hard beta should cap series count');
    eq(document.getElementById('tactical-depth').value, '250', 'hard beta should cap tactical depth');
  });
}

main().then(() => {
  if (fail > 0) process.exit(1);
  console.log(`\nT163: ${pass}/${pass + fail} passed`);
}).catch(err => {
  console.log('  FAIL export test harness —', err.message);
  process.exit(1);
});
