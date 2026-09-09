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
  if (file === 'move_legality.js') ctx.window.ChampionsSim = ctx.ChampionsSim;
}

[
  'release_manifest.js',
  'app_shell.js',
  'data.js',
  'generated/pokemon_showdown_legal_data.js',
  'generated/champions_move_pools.js',
  'move_legality.js',
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
  'this.csRenderQaClaimReviewReadout = csRenderQaClaimReviewReadout;',
  'this.csGetPublicBetaGuardProfile = csGetPublicBetaGuardProfile;',
  'this.csApplyPublicBetaGuardrails = csApplyPublicBetaGuardrails;',
  'this.csLoadCoachBrainMemory = csLoadCoachBrainMemory;',
  'this.addReplays = addReplays;'
].join(' '), ctx);

// Synthetic export/algorithm fixtures only. Production preflight is tested separately.
ctx.canRunRegulationAnalysis = () => true;
const {
  TEAMS,
  Storage,
  teamSignature,
  csBuildMyDataExport,
  csExportMyDataJson,
  csBuildQaArtifactExport,
  csExportQaArtifactJson,
  csRenderQaClaimReviewReadout,
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
          { analysis_id: 'a1', created_at: '2026-05-15T10:00:00.000Z', player_team_id: 'player', opp_team_id: 'mega_altaria', bo: 3, win_rate: 0.75, wins: 3, losses: 1, sample_size: 4,
            engine_version: '1.1.1', format: 'doubles', evidence_policy: { poisoning_guard: 'identity_mismatch_do_not_train_or_rank' },
            analysis_json: { provenance: { build_id: 'original-build' }, evidence_policy: { poisoning_guard: 'trusted_stats_allowed' } } }
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
    eq(payload.db.analyses[0].engine_version, '1.1.1', 'execution engine missing');
    eq(payload.db.analyses[0].analysis_json.provenance.build_id, 'original-build', 'export dropped provenance');
    eq(payload.db.analyses[0].evidence_policy.poisoning_guard, 'identity_mismatch_do_not_train_or_rank', 'export dropped recomputed quarantine');
    eq(payload.db.analyses[0].analysis_json.evidence_policy.poisoning_guard, 'identity_mismatch_do_not_train_or_rank', 'nested policy must not remain trusted');
    eq(payload.db.analyses[0].stored_evidence_policy.poisoning_guard, 'trusted_stats_allowed', 'original policy retained for inspection');
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
    truthy(/Current Evidence QA/.test(html), 'Current Evidence QA label missing');
    truthy(/id="run-all-export-qa-btn"/.test(html), 'Release Matrix QA button missing');
    truthy(/id="stress-lite-qa-btn"/.test(html), 'Device-Safe Stress QA button missing');
    truthy(/id="tactical-sweep-qa-btn"/.test(html), 'Tactical Coaching QA button missing');
    truthy(/On-page battle test: runs the selected matchup/.test(html), 'Run Selected Matchup hover help missing');
    truthy(/On-page matchup matrix: runs your selected team against every loaded team/.test(html), 'Run All Loaded Teams hover help missing');
    truthy(/Run All \+ Download QA File/.test(html), 'Run All QA file button label missing');
    truthy(/QA file export \/ Release Matrix QA: runs all loaded team matchups/.test(html), 'Run All QA file hover help missing');
    truthy(/Device-Safe Stress QA: runs capped lower-load coverage/.test(html), 'Device-Safe Stress QA hover help missing');
    truthy(/Tactical Coaching QA: tests branches/.test(html), 'Tactical Coaching QA hover help missing');
    truthy(/Workflow helper: choose a local folder/.test(html), 'QA drop folder hover help missing');
    truthy(/id="beta-guard-note"/.test(html), 'beta guard note missing');
    truthy(/id="qa-drop-folder-btn"/.test(html), 'QA drop folder button missing');
    truthy(/Tactical Coaching QA/.test(html), 'Tactical Coaching QA label missing');
    truthy(/id="sim-scope"/.test(html), 'Test Scope selector missing');
    truthy(/All loaded teams/.test(html), 'All loaded teams scope option missing');
    truthy(/Selected matchup/.test(html), 'Selected matchup scope option missing');
    truthy(/5,000 series \(selected-team stress\)/.test(html), '5,000 selected-team stress sample option missing');
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
    truthy(/^(v2\.\d+\.\d+-[a-z0-9-]+|battle-labs-beta-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)$/.test(payload.build_id || ''), 'QA build id missing');
    truthy(/^http:\/\/localhost\/\?v=(v2\.\d+\.\d+-[a-z0-9-]+|battle-labs-beta-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)&fresh=1$/.test(payload.source_url || ''), 'QA source URL missing build cache buster');
    eq(payload.retention.max_replay_cards, 240);
    eq(payload.retention.max_replay_log_lines, 200);
    eq(payload.retention.max_simlog_total, 500);
    eq(payload.retention.max_simlog_per_pair, 100);
    truthy(payload.summary && payload.summary.total_retained_simlog_entries >= 1, 'sim log summary missing');
    truthy(payload.summary.retained_replay_cards >= 1, 'replay summary missing');
    eq(payload.qa_coverage_summary.schema_version, 'champions-qa-coverage-v1', 'QA artifact coverage schema missing');
    eq(payload.qa_coverage_summary.totals.replay_cards_scanned, 1, 'QA artifact coverage replay count mismatch');
    eq(payload.qa_coverage_summary.totals.targeted_sweep_runs, 14, 'QA artifact targeted sweep count mismatch');
    truthy(payload.qa_coverage_summary.totals.turns > 1, 'QA artifact merged coverage should include targeted sweep turns');
    truthy(payload.targeted_qa_sweep && payload.targeted_qa_sweep.status === 'complete', 'targeted QA sweep should be complete');
    truthy(payload.qa_coverage_summary.mechanics_seen.screen_reduction > 0, 'targeted sweep should add screen reduction proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.hp_cost > 0, 'targeted sweep should add HP-cost proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.recovery > 0, 'targeted sweep should add direct recovery proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.item_recovery > 0, 'targeted sweep should add item recovery proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.move_lock_failures > 0, 'targeted sweep should add move-lock proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.blocked_priority_events > 0, 'targeted sweep should add blocked-priority proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.trick_room_active > 0, 'targeted sweep should add Trick Room active proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.delayed_recovery > 0, 'targeted sweep should add delayed recovery proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.residual_drain > 0, 'targeted sweep should add residual drain proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.nonstandard_stat_source_trace > 0, 'targeted sweep should add stat-source proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.foul_play_trace > 0, 'targeted sweep should add Foul Play proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.body_press_trace > 0, 'targeted sweep should add Body Press proof');
    truthy(payload.qa_coverage_summary.mechanics_seen.psyshock_trace > 0, 'targeted sweep should add Psyshock proof');
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix, 'move/effect logic matrix missing');
    eq(payload.qa_coverage_summary.move_effect_logic_matrix.schema_version, 'champions-move-effect-logic-matrix-v1', 'move/effect logic matrix schema');
    truthy(Array.isArray(payload.qa_coverage_summary.move_effect_logic_matrix.families), 'move/effect logic matrix families missing');
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix.families.some(row => row.id === 'damage_math' && row.status !== 'missing'), 'damage math matrix family should have evidence');
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix.families.some(row => row.id === 'priority_prevention' && row.status === 'proven'), 'priority-prevention matrix family should be proven by targeted sweep');
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix.families.some(row => row.id === 'nonstandard_stat_source' && row.status === 'proven'), 'stat-source matrix family should be proven by targeted sweep');
    truthy(payload.retained && payload.retained.sim_log.length >= 1, 'retained sim log missing');
    truthy(payload.retained && payload.retained.replay_cards.length >= 1, 'retained replay cards missing');
    eq(payload.retained.replay_cards[0].seed, 'qa-seed-1');
    eq(payload.retained.replay_cards[0].qa_coverage_summary.schema_version, 'champions-qa-coverage-v1', 'retained replay coverage missing');
    eq(payload.retained.replay_cards[0].turns, payload.retained.replay_cards[0].turnLog.length, 'retained replay turns should match turnLog rows');
    eq(payload.retained.replay_cards[0].turn_count_source, 'turnLog.length', 'retained replay turn count source');
    truthy(payload.replay_logic_audit, 'replay logic audit missing');
    eq(payload.replay_logic_audit.schema_version, 'champions-replay-logic-audit-v1', 'replay logic audit schema');
    eq(payload.replay_logic_audit.retained_replay_cards, payload.retained.replay_cards.length, 'replay logic audit retained count mismatch');
    truthy(payload.replay_logic_audit.retained_replay_cards_with_turn_logs >= 1, 'replay logic audit turn-log count missing');
    truthy(Array.isArray(payload.replay_logic_audit.risks), 'replay logic audit risks missing');
    truthy(/exported replay evidence quality/i.test(payload.replay_logic_audit.boundary), 'replay logic audit boundary missing');
    truthy(payload.proof_manifest, 'proof manifest missing');
    eq(payload.proof_manifest.schema_version, 'champions-qa-proof-manifest-v1', 'proof manifest schema');
    eq(payload.proof_manifest.build_id, payload.build_id, 'proof manifest build id mismatch');
    eq(payload.proof_manifest.source_url, payload.source_url, 'proof manifest source url mismatch');
    eq(payload.proof_manifest.qa_run_type, payload.qa_run_type, 'proof manifest qa run type mismatch');
    eq(payload.proof_manifest.proof_tier, 'tactical', 'proof manifest tier should show the strongest included evidence');
    truthy(payload.proof_manifest.coverage_flags.has_retained_replays, 'proof manifest retained replay flag missing');
    truthy(payload.proof_manifest.coverage_flags.has_targeted_sweep, 'proof manifest targeted flag missing');
    eq(payload.proof_manifest.evidence_counts.retained_replay_cards, payload.retained.replay_cards.length, 'proof manifest replay count mismatch');
    eq(payload.proof_manifest.evidence_counts.targeted_sweep_runs, payload.qa_coverage_summary.totals.targeted_sweep_runs, 'proof manifest targeted count mismatch');
    truthy(payload.codex_context && payload.codex_context.claim_audit, 'QA claim audit missing');
    eq(payload.codex_context.claim_audit.schema_version, 'champions-qa-artifact-claim-audit-v1', 'QA claim audit schema');
    truthy(/do not become official Pokemon Champion legality/i.test(payload.codex_context.claim_audit.source_boundary), 'QA claim boundary should block legality overclaiming');
    truthy(payload.codex_context.claim_audit.evidence_scope.build_id === payload.build_id, 'QA claim audit build scope mismatch');
    truthy(payload.codex_context.claim_audit.forbidden_claims.some(claim => /complete Pokemon Champion legality/i.test(claim)), 'QA claim audit legality guard missing');
    truthy(payload.qa_dashboard && payload.qa_dashboard.claim_boundary, 'QA dashboard claim boundary missing');
    eq(payload.qa_dashboard.claim_boundary.schema_version, 'champions-qa-artifact-claim-audit-v1', 'QA dashboard claim boundary schema');
    truthy(payload.qa_dashboard.claim_boundary.forbidden_claims.some(claim => /regulation_id, ruleset_version, engine_version/i.test(claim)), 'QA dashboard ranking guard missing');
    truthy(payload.qa_dashboard.qa_lanes.some(row => row.id === 'replay_logic'), 'replay logic QA lane missing');
    truthy(typeof payload.qa_dashboard.evidence_counts.replay_logic_risks === 'number', 'replay logic risk count missing');
    truthy(payload.qa_claim_review, 'top-level QA claim review missing');
    eq(payload.qa_claim_review.schema_version, 'champions-qa-claim-review-v1', 'QA claim review schema');
    truthy(/Plain-English trust boundary/i.test(payload.qa_claim_review.purpose), 'QA claim review purpose missing');
    truthy(/official Champion legality|incomplete proof/i.test(payload.qa_claim_review.verdict), 'QA claim review verdict should prevent overclaiming');
    truthy(payload.qa_claim_review.evidence_scope.build_id === payload.build_id, 'QA claim review build scope mismatch');
    truthy(Array.isArray(payload.qa_claim_review.forbidden_claims), 'QA claim review forbidden claims missing');
    truthy(typeof payload.qa_claim_review.reviewer_next_step === 'string' && payload.qa_claim_review.reviewer_next_step.length, 'QA claim review next step missing');
    truthy(payload.production_readiness_gate, 'production readiness gate missing');
    eq(payload.production_readiness_gate.schema_version, 'champions-production-readiness-gate-v1', 'production readiness gate schema');
    eq(payload.production_readiness_gate.can_public_launch, false, 'public launch should stay blocked by source-truth gates');
    truthy(payload.production_readiness_gate.public_launch_blockers.some(row => row.id === 'legality_truth'), 'production gate should surface legality truth blocker');
    truthy(payload.qa_dashboard.production_readiness_gate, 'QA dashboard production gate missing');
    eq(payload.qa_dashboard.can_public_launch, false, 'QA dashboard public launch decision should mirror production gate');
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
    truthy(!document._els['qa-claim-review-readout'], 'QA export should not auto-insert claim review into page flow');
    document._els['qa-claim-review-readout'] = makeStubEl('qa-claim-review-readout');
    csRenderQaClaimReviewReadout(payload);
    const readout = document.getElementById('qa-claim-review-readout').innerHTML;
    truthy(/QA Claim Review - Tactical Coaching QA/.test(readout), 'QA claim review slice title missing');
    truthy(/Active QA gate/.test(readout), 'QA active gate readout missing');
    truthy(/Recommended test/.test(readout), 'QA recommended test readout missing');
    truthy(/Production gate/.test(readout), 'QA production gate readout missing');
    truthy(/Public launch/.test(readout), 'QA public launch metric missing');
    truthy(!/<details|<summary|<select/i.test(readout), 'QA claim review should render inline, not as a dropdown/disclosure');
    truthy(/Forbidden claims/.test(readout), 'QA claim forbidden-claims readout missing');
    truthy(/Source boundary/.test(readout), 'QA claim source-boundary readout missing');
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
    truthy(Array.isArray(payload.codex_context.qa_gate_results), 'codex true QA gate results missing');
    truthy(payload.codex_context.qa_gate_results.some(row => row.id === 'damage-events-present' && row.status === 'pass'), 'damage event QA gate should pass');
    truthy(payload.codex_context.qa_gate_results.some(row => row.id === 'move-rule-trace-present' && row.status === 'pass'), 'move rule trace QA gate should pass');
    truthy(payload.codex_context.qa_gate_results.some(row => row.id === 'targeted-proof-closed'), 'targeted proof QA gate missing');
    truthy(payload.codex_context.qa_gate_results.some(row => row.id === 'branch-analysis-usable' && row.status === 'pass'), 'branch analysis QA gate should pass');
    truthy(Array.isArray(payload.codex_context.qa_release_blockers), 'codex QA release blockers missing');
    truthy(payload.codex_context.qa_release_blockers.every(row => row.release_blocking), 'QA release blockers should be explicitly marked');
    truthy(Array.isArray(payload.codex_context.qa_action_plan), 'codex QA action plan missing');
    truthy(payload.codex_context.qa_action_plan.length >= 1, 'codex QA action plan should include next action');
    truthy(payload.codex_context.qa_readiness.some(row => row.id === 'branch_move_analysis'), 'branch move readiness missing');
    eq(payload.codex_context.retained_evidence.tactical_sweep_opponents, 2, 'codex tactical opponent count');
    eq(payload.codex_context.retained_evidence.tactical_sweep_status, 'complete', 'codex tactical status');
    truthy(payload.codex_context.retained_evidence.branch_analysis_rows >= 2, 'codex branch rows should count rows_read');
    truthy(payload.qa_dashboard && payload.qa_dashboard.schema_version === 'champions-qa-dashboard-v1', 'top-level QA dashboard missing');
    truthy(payload.qa_claim_review && payload.qa_claim_review.schema_version === 'champions-qa-claim-review-v1', 'top-level QA claim review missing');
    truthy(Array.isArray(payload.qa_dashboard.qa_lanes), 'QA dashboard lanes missing');
    truthy(payload.qa_dashboard.qa_lanes.some(row => row.id === 'release'), 'release QA lane missing');
    truthy(payload.qa_dashboard.qa_lanes.some(row => row.id === 'battle_engine'), 'battle engine QA lane missing');
    truthy(payload.qa_dashboard.qa_lanes.some(row => row.id === 'coaching_product'), 'coaching/product QA lane missing');
    truthy(payload.qa_dashboard.qa_lanes.some(row => row.id === 'replay_logic'), 'replay logic QA lane missing');
    truthy(typeof payload.qa_dashboard.can_ship === 'boolean', 'QA dashboard ship decision missing');
    truthy(typeof payload.qa_dashboard.can_public_launch === 'boolean', 'QA dashboard public launch decision missing');
    truthy(payload.production_readiness_gate && payload.production_readiness_gate.verdict === 'not_ready_for_public_launch', 'production gate should block public launch');
    truthy(payload.production_readiness_gate.blocked_public_claims.some(claim => /Production-ready public launch/i.test(claim)), 'production gate blocked claims missing');
    truthy(typeof payload.qa_dashboard.battle_engine_trust === 'string', 'battle engine trust missing');
    truthy(typeof payload.qa_dashboard.coaching_product_trust === 'string', 'coaching product trust missing');
    truthy(Array.isArray(payload.qa_dashboard.critical_bugs), 'QA dashboard critical bugs missing');
    truthy(Array.isArray(payload.qa_dashboard.recommended_fix_order), 'QA dashboard fix order missing');
    truthy(Array.isArray(payload.qa_gate_results), 'top-level QA gate results missing');
    truthy(Array.isArray(payload.qa_release_blockers), 'top-level QA release blockers missing');
    truthy(Array.isArray(payload.recommended_fix_order), 'top-level recommended fix order missing');
    eq(payload.qa_coverage_summary.totals.branch_matrix_runs, 2, 'coverage branch run total');
    truthy(payload.forced_branch_matrix && payload.forced_branch_matrix.coverage_space.executed_runs === 1, 'compat forced_branch_matrix missing');
    truthy(payload.branch_move_analysis && payload.branch_move_analysis.totals.rows_read >= 2, 'combined branch move analysis missing');
    eq(payload.proof_manifest.proof_tier, 'tactical', 'proof manifest tactical tier');
    truthy(payload.proof_manifest.coverage_flags.has_tactical_sweep, 'proof manifest tactical flag missing');
    eq(payload.proof_manifest.evidence_counts.tactical_sweep_opponents, 2, 'proof manifest tactical opponent count');
    eq(payload.proof_manifest.evidence_counts.branch_matrix_runs, 2, 'proof manifest branch run count');
    eq(payload.qa_coverage_summary.totals.move_rule_trace_rows, payload.qa_coverage_summary.mechanics_seen.move_rule_trace_rows, 'coverage totals should mirror move_rule_trace_rows mechanics count');
    eq(payload.qa_coverage_summary.totals.move_rule_trace_rows, payload.proof_manifest.evidence_counts.move_rule_trace_rows, 'proof manifest should mirror coverage move_rule_trace_rows total');
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
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix, 'stress lite move/effect logic matrix missing');
    truthy(payload.qa_coverage_summary.move_effect_logic_matrix.totals.proven >= 1, 'stress lite matrix should prove at least one family');
    eq(payload.turns_total, payload.qa_coverage_summary.totals.turns, 'top-level turns total mismatch');
    eq(payload.action_rows_total, payload.qa_coverage_summary.totals.action_rows, 'top-level action row total mismatch');
    eq(payload.damage_events_total, payload.qa_coverage_summary.totals.damage_events, 'top-level damage total mismatch');
    eq(payload.effect_events_total, payload.qa_coverage_summary.totals.effect_events, 'top-level effect total mismatch');
    eq(payload.branch_matrix_runs, payload.qa_coverage_summary.totals.branch_matrix_runs, 'top-level branch runs mismatch');
    eq(payload.proof_manifest.proof_tier, 'stress_lite', 'proof manifest stress lite tier');
    truthy(payload.proof_manifest.coverage_flags.has_stress_lite, 'proof manifest stress lite flag missing');
    truthy(payload.proof_manifest.known_limits.join(' ').indexOf('not exhaustive Run All proof') >= 0, 'proof manifest stress boundary missing');
    truthy(payload.proof_manifest.next_action.indexOf('capped stress evidence') >= 0, 'proof manifest stress next action missing');
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
