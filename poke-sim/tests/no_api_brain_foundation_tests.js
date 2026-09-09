'use strict';

const fs = require('fs');
const path = require('path');
const Schemas = require('../analysis/schemas.js');
const EvidenceBundle = require('../analysis/evidence_bundle.js');
require('../analysis/confidence.js');
require('../analysis/provenance.js');
require('../analysis/brain/brain_schema.js');
require('../analysis/brain/brain_templates.js');
require('../analysis/brain/brain_rules.js');
const Validator = require('../analysis/brain/brain_validator.js');
const Composer = require('../analysis/brain/brain_composer.js');
const Feedback = require('../analysis/brain/brain_feedback.js');
const ImprovementPack = require('../analysis/brain/improvement_pack.js');
const Tools = require('../analysis/tools/index.js');

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS ' + name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}

function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}

function eq(actual, expected, message) {
  if (actual !== expected) throw new Error((message || 'mismatch') + ': expected ' + expected + ', got ' + actual);
}

function hasError(result, code) {
  return result.errors && result.errors.some((err) => err.code === code);
}

function memoryStorage() {
  const bag = {};
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null; },
    setItem(key, value) { bag[key] = String(value); },
    removeItem(key) { delete bag[key]; }
  };
}

function sampleBundle(extra) {
  return EvidenceBundle.createEvidenceBundle(Object.assign({
    bundle_id: 'bundle_test_001',
    created_at: '2026-07-05T00:00:00.000Z',
    analysis_type: 'team-review',
    regulation: { id: 'champions_reg_m_b_doubles_bo3_source_review', version: 'v1', format: 'doubles' },
    simulator: { release_build_id: 'v2.2.131-production-launch-gate', engine_version: 'test-engine', ruleset_version: 'test-rules' },
    inputs: { our_team_id: 'team_shadow_pressure' },
    findings: [
      {
        id: 'ev_speed_001',
        category: 'speed',
        claim: 'Team has speed-control dependency.',
        confidence_prior: 'medium',
        evidence: { speed_control_sources: ['Whimsicott'], risk: 'team may fall behind if speed control is lost' },
        provenance: { source_tool: 'computeSpeedTiers', source_version: 'v1' }
      },
      {
        id: 'ev_lead_001',
        category: 'lead',
        claim: 'Mega Gengar + Incineroar is a pressure/disruption lead.',
        confidence_prior: 'medium',
        evidence: { lead: ['Mega Gengar', 'Incineroar'], reason_codes: ['fast_pressure', 'disruption'] },
        provenance: { source_tool: 'recommendLeads', source_version: 'v1' }
      },
      {
        id: 'ev_identity_001',
        category: 'team_identity',
        claim: 'Team identity is pressure offense.',
        confidence_prior: 'medium',
        evidence: { identity: 'pressure offense' },
        provenance: { source_tool: 'summarizeRoleCoverage', source_version: 'v1' }
      }
    ],
    uncertainty: ['No full matchup simulation batch was available.']
  }, extra || {}));
}

console.log('\n=== no-api brain foundation tests ===\n');

T('1. valid EvidenceBundle passes and exposes evidence IDs', () => {
  const bundle = sampleBundle();
  const result = EvidenceBundle.validateEvidenceBundle(bundle);
  eq(result.ok, true, 'valid bundle');
  truthy(EvidenceBundle.hasEvidence(bundle, 'ev_speed_001'), 'speed evidence missing');
  eq(EvidenceBundle.getFindingsByCategory(bundle, 'lead').length, 1, 'lead count');
});

T('2. invalid EvidenceBundle reports useful schema errors', () => {
  const result = EvidenceBundle.validateEvidenceBundle({ findings: [{}] });
  eq(result.ok, false, 'invalid bundle should fail');
  truthy(hasError(result, 'SCHEMA_VERSION_INVALID'), 'schema error missing');
  truthy(hasError(result, 'BUNDLE_ID_MISSING'), 'bundle id error missing');
  truthy(hasError(result, 'ANALYSIS_TYPE_INVALID'), 'analysis type error missing');
  truthy(hasError(result, 'FINDING_ID_MISSING'), 'finding id error missing');
});

T('3. duplicate evidence IDs fail validation', () => {
  const bundle = sampleBundle();
  bundle.findings.push(Object.assign({}, bundle.findings[0]));
  const result = EvidenceBundle.validateEvidenceBundle(bundle);
  eq(result.ok, false, 'duplicate id should fail');
  truthy(hasError(result, 'FINDING_ID_DUPLICATE'), 'duplicate id error missing');
});

T('4. deterministic tool contracts return findings not final coaching prose', () => {
  const speed = Tools.speedTiers.computeSpeedTiers({ speed_control_sources: ['Whimsicott'] });
  eq(speed.tool_name, 'computeSpeedTiers', 'speed tool name');
  eq(speed.findings[0].category, 'speed', 'speed category');
  const leads = Tools.leadRecommendations.recommendLeads({ leads: [{ lead: ['Mega Gengar', 'Incineroar'], reason_codes: ['pressure'] }] });
  eq(leads.findings[0].category, 'lead', 'lead category');
  const damage = Tools.damageMatrix.summarizeDamageMatrix({});
  eq(damage.findings.length, 0, 'damage should not invent rows');
  truthy(damage.uncertainty.length >= 1, 'damage uncertainty missing');
});

T('5. composer creates validated BrainAnalysis without API calls', () => {
  const result = Composer.composeBrainAnalysis(sampleBundle());
  eq(result.ok, true, 'composition should validate');
  eq(result.analysis.schema_version, Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION, 'brain schema');
  truthy(result.analysis.evidence_used.includes('ev_speed_001'), 'speed evidence not cited');
  truthy(result.analysis.best_leads[0].evidence_ids.includes('ev_lead_001'), 'lead evidence not cited');
  eq(result.analysis.recommended_changes[0].legality_status, 'unknown', 'default legality');
});

T('6. validator rejects fake evidence IDs', () => {
  const bundle = sampleBundle();
  const output = Composer.composeBrainAnalysis(bundle).analysis;
  output.best_leads[0].evidence_ids = ['ev_fake_001'];
  const result = Validator.validateBrainAnalysis(output, bundle);
  eq(result.ok, false, 'fake evidence should fail');
  truthy(hasError(result, 'EVIDENCE_ID_MISSING'), 'fake evidence error missing');
});

T('7. validator rejects high confidence while uncertainty exists', () => {
  const bundle = sampleBundle();
  const output = Composer.composeBrainAnalysis(bundle).analysis;
  output.confidence.level = 'high';
  const result = Validator.validateBrainAnalysis(output, bundle);
  eq(result.ok, false, 'high confidence should fail with uncertainty');
  truthy(hasError(result, 'HIGH_CONFIDENCE_WITH_UNCERTAINTY'), 'confidence error missing');
});

T('8. validator rejects recommended change missing legality status', () => {
  const bundle = sampleBundle();
  const output = Composer.composeBrainAnalysis(bundle).analysis;
  delete output.recommended_changes[0].legality_status;
  const result = Validator.validateBrainAnalysis(output, bundle);
  eq(result.ok, false, 'missing legality should fail');
  truthy(hasError(result, 'RECOMMENDATION_LEGALITY_STATUS_MISSING'), 'legality error missing');
});

T('9. validator rejects illegal suggestion marked legal', () => {
  const bundle = sampleBundle({
    findings: sampleBundle().findings.concat([{
      id: 'ev_recommendation_001',
      category: 'recommendation',
      claim: 'Use an unverified illegal move.',
      confidence_prior: 'medium',
      evidence: { legality_status: 'illegal', reason: 'source validator rejected it' },
      provenance: { source_tool: 'validateTeamAnalysis', source_version: 'v1' }
    }]),
    uncertainty: []
  });
  const output = {
    schema_version: Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION,
    analysis_type: 'team-review',
    win_conditions: [],
    best_leads: [],
    major_threats: [],
    replay_turning_points: [],
    recommended_changes: [{ change: 'Use an unverified illegal move.', reason: 'bad', legality_status: 'legal', evidence_ids: ['ev_recommendation_001'] }],
    confidence: { level: 'medium', reason: 'test' },
    evidence_used: ['ev_recommendation_001']
  };
  const result = Validator.validateBrainAnalysis(output, bundle);
  eq(result.ok, false, 'illegal-as-legal should fail');
  truthy(hasError(result, 'ILLEGAL_SUGGESTION_MARKED_LEGAL'), 'illegal legality error missing');
});

T('10. validator rejects single replay findings overstated as global truth', () => {
  const bundle = sampleBundle({
    findings: sampleBundle().findings.concat([{
      id: 'ev_replay_001',
      category: 'replay',
      claim: 'Turn 4 was a possible swing turn.',
      confidence_prior: 'medium',
      evidence: { turn: 4, single_replay_observation: true },
      provenance: { source_tool: 'summarizeReplay', source_version: 'v1' }
    }]),
    uncertainty: []
  });
  const output = {
    schema_version: Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION,
    analysis_type: 'replay-review',
    win_conditions: [],
    best_leads: [],
    major_threats: [{ threat: 'Always loses all matchups after Turn 4', reason: 'always loses all matchups', severity: 'high', evidence_ids: ['ev_replay_001'] }],
    recommended_changes: [],
    replay_turning_points: [],
    confidence: { level: 'medium', reason: 'test' },
    evidence_used: ['ev_replay_001']
  };
  const result = Validator.validateBrainAnalysis(output, bundle);
  eq(result.ok, false, 'replay overstatement should fail');
  truthy(hasError(result, 'REPLAY_OBSERVATION_OVERSTATED'), 'replay overstatement error missing');
});

T('11. feedback storage records overall and card feedback locally', () => {
  const storage = memoryStorage();
  const record = Feedback.recordBrainFeedback({
    analysis_output_id: 'analysis_001',
    evidence_bundle_id: 'bundle_001',
    scope: 'card',
    card_type: 'best_leads',
    vote: 'down',
    feedback_type: 'wrong_lead',
    comment: 'Speed control lead mattered more.',
    correction: { expected_card: 'best_leads', expected_change: 'Rank speed-control lead higher.' },
    regulation_id: 'reg-m-b',
    release_build_id: 'v-test'
  }, { storage });
  eq(record.ok, true, 'feedback should record');
  eq(Feedback.listBrainFeedback({ storage }).length, 1, 'feedback count');
  eq(Feedback.getBrainFeedbackByOutput('analysis_001', { storage }).length, 1, 'feedback by output');
  eq(Feedback.summarizeFeedback({ storage }).by_type.wrong_lead, 1, 'summary by type');
});

T('12. improvement pack export includes correction and suggested benchmark', () => {
  const feedback = {
    feedback_id: 'fb_001',
    analysis_output_id: 'analysis_001',
    evidence_bundle_id: 'bundle_001',
    scope: 'card',
    card_type: 'best_leads',
    vote: 'down',
    feedback_type: 'wrong_lead',
    comment: 'Wrong lead.',
    correction: { expected_card: 'best_leads', expected_change: 'Use speed-control evidence.' },
    regulation_id: 'reg-m-b',
    release_build_id: 'v-test'
  };
  const pack = ImprovementPack.createImprovementPack({
    evidence_bundle: sampleBundle(),
    brain_output: Composer.composeBrainAnalysis(sampleBundle()).analysis,
    feedback_records: [feedback],
    release_build_id: 'v-test'
  });
  eq(pack.schema_version, Schemas.IMPROVEMENT_PACK_SCHEMA_VERSION, 'pack schema');
  eq(pack.cases.length, 1, 'case count');
  eq(pack.cases[0].case_type, 'wrong_lead', 'case type');
  truthy(pack.cases[0].suggested_benchmark.name.indexOf('wrong_lead') >= 0, 'benchmark suggestion missing');
  const json = ImprovementPack.exportImprovementPackAsJson({ feedback_records: [feedback] });
  truthy(json.indexOf('champions-brain-improvement-pack-v1') >= 0, 'json export missing schema');
});

T('13. Brain card schema covers document-listed Evidence Mode cards', () => {
  truthy(Schemas.isValidBrainCardType('summary'), 'summary card missing');
  truthy(Schemas.isValidBrainCardType('evidence_used'), 'evidence used card missing');
  truthy(Schemas.isValidBrainCardType('feedback'), 'feedback card missing');
  truthy(Schemas.isValidBrainCardType('export_improvement_pack'), 'export pack card missing');
});

T('14. feedback module stores outputs and improvement packs under document keys', () => {
  const storage = memoryStorage();
  const output = Feedback.recordBrainOutput({
    analysis_output_id: 'analysis_doc_001',
    schema_version: Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION,
    analysis_type: 'team-review',
    evidence_used: ['ev_speed_001']
  }, { storage });
  eq(output.ok, true, 'output should store');
  eq(Feedback.getBrainOutput('analysis_doc_001', { storage }).analysis_output_id, 'analysis_doc_001', 'stored output missing');

  const pack = ImprovementPack.createImprovementPack({
    evidence_bundle: sampleBundle(),
    brain_output: Composer.composeBrainAnalysis(sampleBundle()).analysis,
    feedback_records: [{
      feedback_id: 'fb_doc_001',
      analysis_output_id: 'analysis_doc_001',
      evidence_bundle_id: 'bundle_test_001',
      scope: 'overall',
      vote: 'mostly_wrong',
      feedback_type: 'mostly_wrong',
      correction: { expected_change: 'Use stronger evidence before confidence.' }
    }]
  });
  const saved = ImprovementPack.saveImprovementPack(pack, { storage });
  eq(saved.ok, true, 'pack should save');
  eq(ImprovementPack.listImprovementPacks({ storage }).length, 1, 'saved pack count');
});

T('15. benchmark fixture cases promised by build document exist', () => {
  const fixtureDir = path.join(__dirname, 'fixtures', 'analysis', 'brain_cases');
  [
    'missing_evidence_case.json',
    'fake_evidence_id_case.json',
    'bad_confidence_case.json',
    'illegal_suggestion_case.json',
    'replay_overstatement_case.json',
    'wrong_lead_feedback_case.json',
    'missed_turning_point_feedback_case.json'
  ].forEach((file) => {
    const fullPath = path.join(fixtureDir, file);
    truthy(fs.existsSync(fullPath), file + ' missing');
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    truthy(parsed.case_id, file + ' missing case_id');
    truthy(parsed.expected_properties, file + ' missing expected_properties');
  });
});

console.log('\nno-api brain foundation: ' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
