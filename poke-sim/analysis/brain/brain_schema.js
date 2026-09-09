(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var Schemas = ChampionsSim.analysis.schemas;
  if (!Schemas && typeof require === 'function') {
    try { Schemas = require('../schemas.js'); } catch (_e) { Schemas = null; }
  }

  var SEVERITY_LEVELS = ['low', 'medium', 'high'];

  function emptyBrainAnalysis(input) {
    input = input || {};
    return {
      schema_version: Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION,
      analysis_output_id: input.analysis_output_id || (Schemas.createId ? Schemas.createId('analysis') : 'analysis_' + Date.now()),
      analysis_type: input.analysis_type || 'team-review',
      summary: '',
      team_identity: '',
      win_conditions: [],
      best_leads: [],
      major_threats: [],
      recommended_changes: [],
      replay_turning_points: [],
      confidence: { level: 'low', reason: 'No evidence has been evaluated yet.' },
      assumptions: [],
      uncertainty: [],
      evidence_used: []
    };
  }

  function normalizeEvidenceIds(value) {
    return Schemas.unique(Array.isArray(value) ? value : []);
  }

  var api = {
    SEVERITY_LEVELS: SEVERITY_LEVELS.slice(),
    emptyBrainAnalysis: emptyBrainAnalysis,
    normalizeEvidenceIds: normalizeEvidenceIds
  };

  ChampionsSim.analysis.brain.schema = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
