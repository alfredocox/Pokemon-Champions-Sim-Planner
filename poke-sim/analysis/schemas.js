(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};

  var EVIDENCE_BUNDLE_SCHEMA_VERSION = 'champions-evidence-bundle-v1';
  var BRAIN_ANALYSIS_SCHEMA_VERSION = 'champions-brain-analysis-v1';
  var IMPROVEMENT_PACK_SCHEMA_VERSION = 'champions-brain-improvement-pack-v1';

  var ANALYSIS_TYPES = [
    'team-review',
    'matchup-review',
    'replay-review',
    'simulation-batch',
    'team-lab-review'
  ];

  var EVIDENCE_CATEGORIES = [
    'legality',
    'speed',
    'damage',
    'threat',
    'lead',
    'role',
    'replay',
    'critical_turn',
    'win_condition',
    'recommendation',
    'confidence',
    'source',
    'team_identity',
    'uncertainty'
  ];

  var CONFIDENCE_LEVELS = ['low', 'medium', 'high'];
  var LEGALITY_STATUSES = ['legal', 'illegal', 'unknown'];
  var BRAIN_CARD_TYPES = [
    'summary',
    'team_identity',
    'win_conditions',
    'best_leads',
    'major_threats',
    'recommended_changes',
    'replay_turning_point',
    'confidence',
    'evidence_used',
    'uncertainty',
    'feedback',
    'export_improvement_pack'
  ];
  var FEEDBACK_TYPES = [
    'helpful',
    'not_helpful',
    'mostly_right',
    'mostly_wrong',
    'wrong_reason',
    'wrong_lead',
    'missed_turning_point',
    'illegal_suggestion',
    'too_vague',
    'confidence_too_high',
    'confidence_too_low',
    'missing_evidence',
    'accepted_suggestion',
    'rejected_suggestion'
  ];
  var FEEDBACK_SCOPES = ['overall', 'card'];
  var FEEDBACK_VOTES = ['up', 'down', 'helpful', 'not_helpful', 'mostly_right', 'mostly_wrong'];

  function issue(code, message, path) {
    return { code: code, message: message, path: path || null };
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function unique(values) {
    var out = [];
    (values || []).forEach(function(value) {
      if (value == null || value === '') return;
      if (out.indexOf(value) === -1) out.push(value);
    });
    return out;
  }

  function isValidAnalysisType(value) {
    return includes(ANALYSIS_TYPES, value);
  }

  function isValidEvidenceCategory(value) {
    return includes(EVIDENCE_CATEGORIES, value);
  }

  function isValidConfidenceLevel(value) {
    return includes(CONFIDENCE_LEVELS, value);
  }

  function isValidLegalityStatus(value) {
    return includes(LEGALITY_STATUSES, value);
  }

  function isValidFeedbackType(value) {
    return includes(FEEDBACK_TYPES, value);
  }

  function isValidBrainCardType(value) {
    return includes(BRAIN_CARD_TYPES, value);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createId(prefix) {
    var rand = Math.random().toString(36).slice(2, 10);
    return String(prefix || 'id') + '_' + Date.now().toString(36) + '_' + rand;
  }

  var api = {
    EVIDENCE_BUNDLE_SCHEMA_VERSION: EVIDENCE_BUNDLE_SCHEMA_VERSION,
    BRAIN_ANALYSIS_SCHEMA_VERSION: BRAIN_ANALYSIS_SCHEMA_VERSION,
    IMPROVEMENT_PACK_SCHEMA_VERSION: IMPROVEMENT_PACK_SCHEMA_VERSION,
    ANALYSIS_TYPES: ANALYSIS_TYPES.slice(),
    EVIDENCE_CATEGORIES: EVIDENCE_CATEGORIES.slice(),
    CONFIDENCE_LEVELS: CONFIDENCE_LEVELS.slice(),
    LEGALITY_STATUSES: LEGALITY_STATUSES.slice(),
    BRAIN_CARD_TYPES: BRAIN_CARD_TYPES.slice(),
    FEEDBACK_TYPES: FEEDBACK_TYPES.slice(),
    FEEDBACK_SCOPES: FEEDBACK_SCOPES.slice(),
    FEEDBACK_VOTES: FEEDBACK_VOTES.slice(),
    issue: issue,
    isPlainObject: isPlainObject,
    unique: unique,
    isValidAnalysisType: isValidAnalysisType,
    isValidEvidenceCategory: isValidEvidenceCategory,
    isValidConfidenceLevel: isValidConfidenceLevel,
    isValidLegalityStatus: isValidLegalityStatus,
    isValidFeedbackType: isValidFeedbackType,
    isValidBrainCardType: isValidBrainCardType,
    nowIso: nowIso,
    createId: createId
  };

  ChampionsSim.analysis.schemas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
