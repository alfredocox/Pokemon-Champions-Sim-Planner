// Issue #192 - Battle Sensei critical turn + learning report.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'replay_learning.js'));
const replayCoach = require(path.join(ROOT, 'replay_coach.js'));
const sample = fs.readFileSync(path.join(ROOT, 'tests/fixtures/showdown_replay_sample.txt'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== Battle Sensei learning tests ===\n');

T('1. learning report is attached to replay reviews', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const learning = analysis.review.learningReport;
  truthy(learning, 'missing learning report');
  eq(learning.productMode, 'Battle Sensei', 'product mode');
  inc(learning.philosophy, 'Decision quality', 'philosophy');
  truthy(learning.battleSummary.majorTurningPoint, 'major turning point');
});

T('2. critical engine separates first mistake from fatal mistake on fixture', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const critical = analysis.review.learningReport.criticalTurns;
  truthy(critical.firstMistake, 'first mistake');
  truthy(critical.fatalMistake, 'fatal mistake');
  eq(critical.firstMistake.turn, 1, 'first mistake turn');
  eq(critical.fatalMistake.turn, 3, 'fatal mistake turn');
  inc(critical.note, 'differ', 'critical note');
  truthy(critical.turns.every((t) => t.whatHappened && t.whyItMattered && t.betterAlternative && t.confidence), 'critical cards complete');
});

T('2b. lead logic explains opener synergy plus concession risk', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const lead = analysis.review.learningReport.leadLogic;
  truthy(lead, 'lead logic missing');
  inc(lead.label, 'opener', 'lead label');
  truthy(lead.synergySignals.length >= 1, 'lead synergy signals');
  truthy(lead.pros.length >= 1, 'lead pros');
  truthy(lead.cons.length >= 1, 'lead cons');
  inc(lead.limitation, 'visible turn-one replay evidence', 'lead limitation boundary');
});

T('3. decision quality matrix separates decision and outcome', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const rows = analysis.review.learningReport.decisionQuality;
  truthy(rows.length >= 5, 'decision rows');
  truthy(rows.some((r) => r.matrixQuadrant === 'bad decision / bad outcome'), 'bad/bad quadrant');
  truthy(rows.every((r) => r.decisionQualityScore >= 1 && r.decisionQualityScore <= 10), 'score range');
  truthy(rows.every((r) => r.alternativeLine && r.whyAlternativeMayBeBetter), 'alternatives');
});

T('4. scorecard and practice plan are generated from coaching tags', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const learning = analysis.review.learningReport;
  truthy(learning.scorecard.cards.length >= 5, 'scorecard categories');
  truthy(learning.scorecard.overallDecisionQuality > 0, 'overall score');
  truthy(learning.practicePlan.drills.length >= 1, 'practice drills');
  truthy(learning.practicePlan.drills[0].skill, 'practice skill');
  truthy(learning.practicePlan.learningLoop.observe, 'OODA observe');
  truthy(learning.practicePlan.learningLoop.decide, 'OODA decide');
});

T('5. Battle IQ scoring is provisional, explainable, and scoped to game intelligence', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const learning = analysis.review.learningReport;
  const iq = learning.battleIq;
  truthy(iq, 'battle iq missing');
  eq(iq.status, 'Provisional Battle IQ', 'provisional status');
  inc(iq.definition, 'game-specific competitive battle intelligence', 'game intelligence boundary');
  inc(iq.definition, 'not a measure of general human intelligence', 'general intelligence boundary');
  eq(iq.confidence, 'medium', 'single-battle score confidence should not overclaim');
  inc(iq.reliabilityNote, 'single clean battle', 'single-battle reliability note');
  truthy(iq.rawComposite >= 0 && iq.rawComposite <= 100, 'raw composite range');
  truthy(iq.standardScore >= 55 && iq.standardScore <= 145, 'standard range');
  truthy(iq.confidenceInterval.length === 2, 'confidence interval');
  truthy(iq.subScores.length === 8, 'eight sub-scores');
  ['Lead IQ','Turn 1 IQ','Speed Control IQ','Resource IQ','Threat Recognition IQ','Win Condition IQ','Endgame IQ','Risk Discipline IQ'].forEach((label) => {
    truthy(iq.subScores.some((s) => s.label === label), 'missing sub-score ' + label);
  });
  truthy(iq.loweredBy.length >= 1, 'lowered by evidence');
  truthy(iq.recommendedDrill && iq.recommendedDrill.skill, 'recommended drill');
  truthy(learning.coachingReadouts, 'coaching readouts missing');
  truthy(learning.coachingReadouts.strengths.length >= 1, 'positive coaching evidence missing');
  eq(new Set(learning.coachingReadouts.strengths.map((row) => row.label + '|' + row.evidence)).size, learning.coachingReadouts.strengths.length, 'positive coaching rows should dedupe duplicate evidence');
  truthy(learning.coachingReadouts.tightenUp.length >= 1, 'tighten-up guidance missing');
  inc(learning.coachingReadouts.note, 'evidence-bound', 'coaching note');
});

T('6. low-confidence incomplete logs do not overclaim', () => {
  const lowLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|turn|1',
    '|move|p1a: Incineroar|Fake Out|p2a: Hatterene',
    '|-fail|p1a: Incineroar|move: Fake Out'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(lowLog, { selectedSide: 'p1' });
  const learning = analysis.review.learningReport;
  eq(learning.confidence, 'low', 'overall confidence');
  eq(learning.criticalTurns.confidence, 'low', 'critical confidence');
  eq(learning.battleIq.confidence, 'low', 'battle iq confidence');
  eq(learning.battleIq.status, 'Provisional Battle IQ', 'battle iq provisional');
  eq(learning.battleIq.displayScore, null, 'low-confidence battle iq should hide the player-facing score');
  eq(learning.battleIq.band, 'Needs more data', 'low-confidence battle iq should show a needs-more-data band');
  eq(learning.battleIq.percentile, null, 'low-confidence battle iq should hide percentile');
  eq(learning.battleIq.confidenceInterval.length, 0, 'low-confidence battle iq should hide score range');
  truthy(/Needs more data|same turn/i.test(learning.criticalTurns.note), 'low confidence note');
  eq(learning.evidenceStandard.label, 'Needs more data', 'evidence standard lowers confidence');
  inc(learning.opponentPlan.pressurePattern, 'Not enough observed', 'opponent plan avoids invented intent');
});

T('7. evidence standard and opponent plan expose support level', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const learning = analysis.review.learningReport;
  truthy(learning.evidenceStandard, 'evidence standard');
  inc(learning.evidenceStandard.priority, 'Observable battle evidence first', 'evidence priority');
  inc(learning.evidenceStandard.opponentIntentRule, 'Never invent opponent intent', 'opponent intent boundary');
  truthy(['Observed', 'Strong inference', 'Weak inference', 'Needs more data'].includes(learning.opponentPlan.evidenceLabel), 'opponent evidence label');
  truthy(Array.isArray(learning.opponentPlan.evidence), 'opponent evidence rows');
});

T('7b. advanced play recognition stays evidence-bound', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const readouts = analysis.review.learningReport.coachingReadouts;
  truthy(Array.isArray(readouts.advancedPlays), 'advanced plays array');
  readouts.advancedPlays.forEach((row) => {
    truthy(row.label && row.evidence && row.limitation, 'advanced play row completeness');
  });
});

T('8. sim comparison stays low confidence until matched sim data exists', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const sim = analysis.review.learningReport.simComparison;
  const packet = analysis.review.learningReport.simFeedback;
  eq(sim.status, 'needs_sim_data', 'needs sim status');
  eq(sim.evidenceLabel, 'Needs more data', 'needs evidence');
  inc(sim.decisionChange, 'Run this matchup in Sim Mode or upload more logs', 'decision-changing next step');
  eq(packet.shouldUpdateLeadModel, false, 'no sim match means no lead model update');
  eq(packet.shouldUpdateBringFourModel, false, 'no sim match means no bring model update');
  eq(packet.confidence, 'low', 'unmatched feedback stays low confidence');

  const matched = replayCoach.analyzeShowdownReplay(sample, {
    selectedSide: 'p1',
    simPlan: {
      bestLead: analysis.review.summary.yourLead,
      bestFour: analysis.review.summary.yourFour,
      registeredRoster: analysis.review.summary.yourPreview,
      lineupSize: 4,
      seriesFormat: 'bo3',
      expectedWinPath: 'Set speed control, preserve cleaner, and convert pressure.'
    }
  }).review.learningReport.simComparison;
  eq(matched.status, 'unverified_plan', 'a supplied plan does not verify team identity');
  eq(matched.leadMatch, 100, 'lead match score');
  inc(matched.bo3SwapContext, 'Series context', 'series swap context');
  eq(matched.evidenceLabel, 'Needs more data', 'reference overlap does not authenticate evidence');
});

T('8b. sim feedback packet emits calibration signals without auto-updating models', () => {
  const base = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const mismatch = replayCoach.analyzeShowdownReplay(sample, {
    selectedSide: 'p1',
    simPlan: {
      bestLead: ['Wrong Lead A', 'Wrong Lead B'],
      bestFour: base.review.summary.yourFour,
      registeredRoster: base.review.summary.yourPreview,
      lineupSize: 4,
      seriesFormat: 'bo3',
      expectedWinPath: 'Set speed control, preserve cleaner, and convert pressure.',
      matchConfidence: 'medium'
    }
  }).review.learningReport.simFeedback;
  truthy(mismatch, 'sim feedback missing');
  eq(mismatch.shouldUpdateLeadModel, false, 'unverified plan cannot update the lead model');
  eq(mismatch.shouldUpdateBringFourModel, false, 'matched four should not update bring model signal');
  eq(mismatch.shouldUpdateArchetypeModel, false, 'single medium-confidence replay should not update archetype model');
  eq(mismatch.shouldCreateScenario, true, 'replay should create scenario');
  truthy(mismatch.scenarioType && mismatch.scenarioType !== 'none', 'scenario type');
  truthy(['none', 'minor', 'moderate'].includes(mismatch.rngContamination), 'rng contamination label');
  inc(mismatch.evidence.note, 'Do not automatically rewrite sim models', 'auto-update guardrail');
});

T('8c. sim comparison treats selected lineup as a BO3 swap choice from registered six', () => {
  const base = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const actual = base.review.summary.yourFour;
  const registeredRoster = actual.concat(['Bench Option A', 'Bench Option B']).slice(0, 6);
  const sim = replayCoach.analyzeShowdownReplay(sample, {
    selectedSide: 'p1',
    manualTeamPreview: registeredRoster.join('\n'),
    simPlan: {
      bestLead: base.review.summary.yourLead,
      bestFour: actual.slice(0, 3).concat(['Bench Option A']),
      registeredRoster: registeredRoster,
      lineupSize: 4,
      lineupMatrixComplete: true,
      seriesFormat: 'bo3',
      expectedWinPath: 'Swap one bench option into game two if the first lineup loses tempo.',
      matchConfidence: 'medium'
    }
  }).review.learningReport.simComparison;
  eq(sim.status, 'unverified_plan', 'lineup coverage does not verify identity');
  truthy(sim.fourMatch < 100, 'lineup mismatch should be visible');
  inc(sim.firstDeviation, 'game-specific lineup', 'lineup deviation wording');
  inc(sim.decisionChange, 'registered roster', 'registered roster decision wording');
  eq(sim.expectedLineupCount, 15, 'six choose four lineup count');
  eq(sim.lineupMatrixComplete, true, 'complete matrix flag');
  truthy(sim.actualSwapOptions.includes('Bench Option A'), 'actual swap option missing');
  truthy(sim.simBenchOptions.includes(actual[3]), 'sim bench option missing');
});

T('8d. incomplete sim lineup matrix is explicit before model calibration', () => {
  const base = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const actual = base.review.summary.yourFour;
  const registeredRoster = actual.concat(['Bench Option A', 'Bench Option B']).slice(0, 6);
  const analysis = replayCoach.analyzeShowdownReplay(sample, {
    selectedSide: 'p1',
    simPlan: {
      bestLead: base.review.summary.yourLead,
      bestFour: actual,
      registeredRoster: registeredRoster,
      lineupSize: 4,
      evaluatedLineups: [actual],
      seriesFormat: 'bo3',
      matchConfidence: 'medium'
    }
  });
  const sim = analysis.review.learningReport.simComparison;
  const packet = analysis.review.learningReport.simFeedback;
  eq(sim.expectedLineupCount, 15, 'expected full lineup matrix count');
  eq(sim.evaluatedLineupCount, 1, 'evaluated lineup count');
  eq(sim.lineupMatrixComplete, false, 'matrix should be incomplete');
  inc(sim.lineupCoverageLabel, '1/15', 'coverage label');
  eq(packet.evidence.lineupMatrixComplete, false, 'feedback carries incomplete matrix');
});

T('8e. lineup matrix report supports BO1, BO3, and BO5 series options', () => {
  const roster = ['A', 'B', 'C', 'D', 'E', 'F'];
  const matrix = globalThis.ChampionsSim.replayLearning.lineupCombinations(roster, 4);
  const evaluatedLineups = matrix.map((lineup, idx) => ({ lineup, winRate: 0.4 + idx / 100 }));
  ['bo1', 'bo3', 'bo5'].forEach((seriesFormat) => {
    const report = globalThis.ChampionsSim.replayLearning.buildLineupMatrixReport({
      registeredRoster: roster,
      lineupSize: 4,
      lineupMatrix: matrix,
      evaluatedLineups,
      lineupMatrixComplete: true,
      actualFour: matrix[0],
      seriesFormat
    });
    eq(report.status, 'ranked', seriesFormat + ' ranked status');
    eq(report.seriesFormat, seriesFormat, seriesFormat + ' format');
    truthy(report.topLineups.length === 3, seriesFormat + ' top lineups');
    truthy(report.adaptationNote.length > 0, seriesFormat + ' adaptation note');
  });
});

T('9. trend dashboard stays cautious for a single review', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const trend = analysis.review.learningReport.trendDashboard;
  eq(trend.confidence, 'needs more data', 'trend confidence');
  inc(trend.recommendedNextPracticeBlock, 'top practice drill', 'trend practice guidance');
});

T('10. premium memory preview separates anonymous learning from private profiles', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const premium = analysis.review.learningReport.premiumTeasers;
  truthy(premium, 'premium teaser');
  inc(premium.title, 'Battle IQ Memory', 'teaser title');
  inc(premium.freeValue, 'local and temporary', 'free value');
  inc(premium.premiumValue, 'saved profile', 'premium value');
  truthy(premium.lockedInsights.length >= 4, 'locked insight count');
  truthy(premium.lockedInsights.some((x) => x.id === 'full_battle_iq_subscores'), 'battle iq trend teaser');
  inc(premium.backendLearningPolicy.freeAnonymous, 'opt-in anonymized signals', 'anonymous learning policy');
  inc(premium.backendLearningPolicy.rawLogDefault, 'Raw logs should not be silently stored', 'raw log boundary');
});

console.log(`\nBattle Sensei learning: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
