// UI smoke test: real script order + Run Simulation button.
// This catches bundle/preview regressions where the engine works but the page does not simulate.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');
const { runMechanicsSmoke } = require('./mechanics_audit_cases');

const ROOT = path.resolve(__dirname, '..');

function stubEl(id) {
  const el = {
    id: id || '',
    style: {},
    dataset: {},
    options: [],
    children: [],
    value: id === 'sim-count' ? '10' : (id === 'opponent-select' ? 'mega_altaria' : ''),
    textContent: '',
    innerHTML: '',
    disabled: false,
    className: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(ev, fn) { this['on' + ev] = fn; },
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    prepend(child) { this.children.unshift(child); return child; },
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return stubEl('query'); },
    querySelectorAll() { return []; },
    focus() {},
    blur() {},
    click() { if (this.onclick) return this.onclick.call(this, { target: this }); },
    getContext() {
      return {
        clearRect(){}, fillRect(){}, beginPath(){}, roundRect(){}, fill(){}, stroke(){},
        fillText(){}, moveTo(){}, lineTo(){}, arc(){}, closePath(){}, save(){}, restore(){},
        setTransform(){}, measureText(){ return { width: 10 }; }
      };
    }
  };
  return el;
}

const ids = {};
const document = {
  getElementById(id) { return ids[id] || (ids[id] = stubEl(id)); },
  querySelector() { return stubEl('query'); },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {},
  body: stubEl('body'),
  documentElement: stubEl('html'),
  head: stubEl('head'),
  createElement(tag) { return stubEl(tag); },
  createTextNode(text) { return { nodeType: 3, textContent: text }; }
};
document.documentElement.dataset = { theme: 'dark' };

const window = {
  __SUPABASE_URL__: '',
  __SUPABASE_KEY__: '',
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} })
};
window.window = window;
window.document = document;

const ctx = {
  crypto: webcrypto, TextEncoder,
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window,
  document,
  navigator: { serviceWorker: { register() { return Promise.resolve(); } } },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: window.matchMedia,
  Blob: function(parts) { this.parts = parts; },
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
};

vm.createContext(ctx);
ctx.ChampionsSim = window.ChampionsSim = {};

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

[
  'rulesets.js',
  'release_manifest.js',
  'data.js',
  'generated/pokemon_showdown_legal_data.js',
  'generated/champions_move_pools.js',
  'generated/pokemon_showdown_species_weights.js',
  'move_legality.js',
  'runtime_data.js',
  'logger.js',
  'engine.js',
  'storage_adapter.js',
  'supabase_adapter.js',
  'ui.js',
  'legality.js',
  'strategy-injectable.js'
].forEach(load);
// This smoke exercises the explicitly unverified practice lane, not M-A approval.
vm.runInContext('selectedRegulationId = "champions_custom_practice";', ctx);
ctx.CHAMPIONS_RELEASE_MANIFEST = window.CHAMPIONS_RELEASE_MANIFEST;

vm.runInContext('this.runButton = document.getElementById("run-sim-btn");', ctx);
vm.runInContext('this.runAllButton = document.getElementById("run-all-btn");', ctx);

async function main() {
  const btn = ctx.runButton;
  const runAllBtn = ctx.runAllButton;
  if (!btn || typeof btn.onclick !== 'function') throw new Error('Run Simulation click handler missing');
  if (!runAllBtn || typeof runAllBtn.onclick !== 'function') throw new Error('Run All click handler missing');
  vm.runInContext('selectedRegulationId = "champions_reg_m_b_2026";', ctx);
  await btn.onclick.call(btn, { target: btn });
  if (!/Regulation preflight blocked/.test(ids['sim-run-error'].textContent) || ids['sim-run-error'].hidden) throw new Error('blocked run did not expose simulator error');
  vm.runInContext('selectedRegulationId = "champions_custom_practice";', ctx);
  await btn.onclick.call(btn, { target: btn });
  await new Promise(resolve => setTimeout(resolve, 80));

  const progress = ids['progress-label'] && ids['progress-label'].textContent;
  const winPct = ids['win-pct'] && ids['win-pct'].textContent;
  const resultsDisplay = ids['results-section'] && ids['results-section'].style.display;
  const resultsSub = ids['results-sub'] && ids['results-sub'].textContent;

  if (/^Simulation failed/.test(progress || '')) throw new Error(progress);
  if (!winPct || !/%$/.test(winPct)) throw new Error('win percentage did not render');
  if (resultsDisplay === 'none') throw new Error('results section stayed hidden');
  if (!/games simulated/.test(resultsSub || '')) throw new Error('results subtitle did not show actual game count');
  if (!/adaptive lineups/.test(resultsSub || '')) throw new Error('Bo3 results did not show adaptive lineup evidence');

  runMechanicsSmoke(ctx.simulateBattle);

  const identityRun = await ctx.runBoSeries(1, 'mega_dragonite', 'mega_altaria', 1);
  if (identityRun.provenance.engine_version !== vm.runInContext('ENGINE_VERSION', ctx)) throw new Error('wrong captured engine version');
  if (!/^[a-f0-9]{64}$/.test(identityRun.provenance.player_team_digest)) throw new Error('missing execution team digest');
  if (identityRun.allLogs.some(g => g.provenance.format !== 'doubles' || g.participants.player.length !== 4)) throw new Error('UI run lost game identity');
  const identityPayload = ctx._buildAnalysisPayload('mega_dragonite', 'mega_altaria', 1, identityRun);
  if (identityPayload.poisoning_guard === 'trusted_stats_allowed') throw new Error('practice evidence incorrectly promoted');
  if (identityRun.provenance.ruleset_id !== 'champions_custom_practice') throw new Error('explicit practice identity lost');
  const unregistered = vm.runInContext('JSON.parse(JSON.stringify(TEAMS.player))', ctx);
  delete unregistered.ruleset_id;
  delete unregistered.metadata.ruleset_id;
  ctx.normalizeTeamRecordForSim('unregistered', unregistered);
  const missingOriginal = await ctx._captureSimulationProvenance('unregistered', 'opp', unregistered, unregistered, 'doubles', 1, {}, 'champions_custom_practice');
  if (missingOriginal.original_player_ruleset_id) throw new Error('normalization invented original registration');

  const auditPanel = ids['audit-panel'] && ids['audit-panel'].innerHTML;
  if (!auditPanel || !/Battle Audit/.test(auditPanel)) throw new Error('audit panel did not render');
  if (!/Bo adaptation/.test(auditPanel)) throw new Error('audit panel did not render Bo adaptation evidence');

  const stablePlayerKey = vm.runInContext('getActivePlayerTeamKey()', ctx);
  const stablePlayerExists = vm.runInContext('!!(TEAMS && TEAMS["' + stablePlayerKey + '"])', ctx);
  if (!stablePlayerKey || !stablePlayerExists) throw new Error('failed to resolve a stable player team key');
  vm.runInContext(`
    TEAMS.custom_run_all_probe = JSON.parse(JSON.stringify(TEAMS["${stablePlayerKey}"]));
    TEAMS.custom_run_all_probe.name = 'Custom Run All Probe';
    TEAMS.custom_run_all_probe.source = 'custom';
    TEAMS.custom_run_all_probe.format = 'champions';
    TEAMS.custom_run_all_probe.legality_status = 'verified';
    normalizeTeamCatalogForSim();
    rebuildTeamSelects();
  `, ctx);
  vm.runInContext('currentPlayerKey = "stale_missing_team_key";', ctx);
  ids['player-select'].value = stablePlayerKey;
  await btn.onclick.call(btn, { target: btn });
  await new Promise(resolve => setTimeout(resolve, 80));

  const progressAfterRecovery = ids['progress-label'] && ids['progress-label'].textContent;
  if (/^Simulation failed/.test(progressAfterRecovery || '')) {
    throw new Error('stale player key recovery failed: ' + progressAfterRecovery);
  }

  vm.runInContext('currentPlayerKey = "stale_missing_team_key";', ctx);
  ids['player-select'].value = stablePlayerKey;
  await runAllBtn.onclick.call(runAllBtn, { target: runAllBtn });
  await new Promise(resolve => setTimeout(resolve, 80));

  const runAllProgress = ids['progress-label'] && ids['progress-label'].textContent;
  const matchupBody = ids['matchup-tbody'];
  if (/^Simulation failed/.test(runAllProgress || '')) {
    throw new Error('run-all stale player key recovery failed: ' + runAllProgress);
  }
  if (!matchupBody || !Array.isArray(matchupBody.children) || matchupBody.children.length === 0) {
    throw new Error('run-all matchup table did not render');
  }
  const allLoadedOpps = vm.runInContext('getRunAllOpponentKeys(getActivePlayerTeamKey(), resolveSimContext())', ctx);
  if (!Array.isArray(allLoadedOpps) || allLoadedOpps.indexOf('custom_run_all_probe') === -1) {
    throw new Error('run-all all-loaded scope did not include custom/imported teams: ' + JSON.stringify(allLoadedOpps));
  }
  if (allLoadedOpps.indexOf(stablePlayerKey) === -1) {
    throw new Error('run-all all-loaded scope did not include mirror matchup for selected team: ' + JSON.stringify(allLoadedOpps));
  }

  const dbStyleKey = 'db_missing_format_team';
  vm.runInContext(`
    TEAMS.${dbStyleKey} = JSON.parse(JSON.stringify(TEAMS["${stablePlayerKey}"]));
    TEAMS.${dbStyleKey}.name = 'DB Missing Format Team';
    TEAMS.${dbStyleKey}.source = 'supabase';
    TEAMS.${dbStyleKey}.metadata = { ruleset_id: 'champions_reg_m_doubles_bo3' };
    delete TEAMS.${dbStyleKey}.format;
    delete TEAMS.${dbStyleKey}.legality_status;
    normalizeTeamCatalogForSim();
    rebuildTeamSelects();
    currentPlayerKey = 'stale_missing_team_key';
  `, ctx);
  ids['player-select'].value = dbStyleKey;
  ids['opponent-select'].value = stablePlayerKey;
  await btn.onclick.call(btn, { target: btn });
  await new Promise(resolve => setTimeout(resolve, 80));

  const dbProgress = ids['progress-label'] && ids['progress-label'].textContent;
  if (/^Simulation failed/.test(dbProgress || '')) {
    throw new Error('DB-style missing-format team recovery failed: ' + dbProgress);
  }

  vm.runInContext('currentPlayerKey = "stale_missing_team_key";', ctx);
  ids['player-select'].value = dbStyleKey;
  ids['opponent-select'].value = stablePlayerKey;
  await runAllBtn.onclick.call(runAllBtn, { target: runAllBtn });
  await new Promise(resolve => setTimeout(resolve, 80));

  const dbRunAllProgress = ids['progress-label'] && ids['progress-label'].textContent;
  if (/^Simulation failed/.test(dbRunAllProgress || '')) {
    throw new Error('run-all DB-style missing-format team recovery failed: ' + dbRunAllProgress);
  }

  ids['player-select'].value = stablePlayerKey;
  const selectedOpponent = stablePlayerKey === 'mega_altaria' ? 'mega_dragonite' : 'mega_altaria';
  ids['opponent-select'].value = selectedOpponent;
  ids['sim-scope'].value = 'selected';
  const selectedOpps = vm.runInContext('getRunAllOpponentKeys(getActivePlayerTeamKey(), resolveSimContext())', ctx);
  if (!Array.isArray(selectedOpps) || selectedOpps.length !== 1 || selectedOpps[0] !== selectedOpponent) {
    throw new Error('selected matchup scope did not resolve exactly one opponent: ' + JSON.stringify(selectedOpps));
  }
  ids['matchup-tbody'].children = [];
  await runAllBtn.onclick.call(runAllBtn, { target: runAllBtn });
  await new Promise(resolve => setTimeout(resolve, 80));
  if (!ids['matrix-badge'].textContent || !/Selected matchup/.test(ids['matrix-badge'].textContent)) {
    throw new Error('selected matchup scope badge did not render');
  }
  if (!ids['matchup-tbody'].children || ids['matchup-tbody'].children.length !== 1) {
    throw new Error('selected matchup run-all should render one matchup row');
  }

  console.log('  PASS UI Run Simulation smoke rendered', winPct);
}

main().catch(err => {
  console.log('  FAIL UI Run Simulation smoke -', err.message);
  process.exit(1);
});
