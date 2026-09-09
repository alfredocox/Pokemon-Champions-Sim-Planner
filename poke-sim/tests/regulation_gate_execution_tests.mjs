import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const ui = fs.readFileSync(new URL('ui.js', root), 'utf8');
assert.match(ui, /var selectedRegulationId = 'champions_custom_practice';/, 'fresh users must start in the safe runnable practice lane');
const ctx = vm.createContext({ console, currentFormat: 'doubles', currentBo: 3,
  TEAMS: { player: { name: 'Player', members: [] }, opponent: { name: 'Opponent', members: [] } },
  getSelectedRegulationId: () => 'champions_reg_m_b_2026',
  normalizeBranchMaxRuns: () => 1, csMergeQaCoverageSummaries: () => ({}),
  simulateBattle: () => { throw new Error('ENGINE_REACHED'); },
  runMegaTriggerSweep: () => { throw new Error('ENGINE_REACHED'); } });
vm.runInContext(fs.readFileSync(new URL('rulesets.js', root), 'utf8'), ctx);
function section(start, end) { vm.runInContext(ui.slice(ui.indexOf(start), ui.indexOf(end, ui.indexOf(start))), ctx); }
section('function canRunRegulationAnalysis(', 'function regulationCheckHtml(');
ctx.selectedRegulationCheck = team => ctx.checkTeamForSelectedRegulation(team, ctx.getSelectedRegulationId(), { format: 'doubles', bo: 3 });
section('async function runBoSeries(', '// runAllMatchupsUI');
section('async function runAllMatchupsUI(', '// __M4_BUILD_PAYLOAD_BEGIN__');
section('function solveThreatResponse(', 'function queueThreatResponseSolve(');
section('function computeMegaTriggerSweep(', '// PART 3: PDF');
section('async function csBuildForcedBranchMatrixSweepEvidence(', 'function csBranchMoveResultScore(');
await assert.rejects(ctx.runBoSeries(1, 'player', 'opponent', 1), /Regulation preflight blocked/);
assert.equal(ctx.solveThreatResponse('player', 'opponent'), null);
assert.equal(ctx.computeMegaTriggerSweep('player', 'opponent', 1, 'doubles'), null);
const branch = await ctx.csBuildForcedBranchMatrixSweepEvidence({ playerTeamId: 'player', opponentTeamId: 'opponent' });
assert.equal(branch.status, 'blocked_regulation');
ctx.checkTeamForSelectedRegulation = undefined;
await assert.rejects(ctx.runBoSeries(1, 'player', 'opponent', 1), /validator unavailable/);
await assert.rejects(ctx.runAllMatchupsUI(1, 1), /validator unavailable/);
assert.equal(ctx.solveThreatResponse('player', 'opponent'), null);
assert.equal(ctx.computeMegaTriggerSweep('player', 'opponent', 1, 'doubles'), null);
console.log('Regulation execution gates: 8/8 passed; no engine invocation');
