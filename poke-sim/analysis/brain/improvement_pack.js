(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var Schemas = ChampionsSim.analysis.schemas;
  var Feedback = ChampionsSim.analysis.brain.feedback;
  if (typeof require === 'function') {
    if (!Schemas) { try { Schemas = require('../schemas.js'); } catch (_e1) {} }
    if (!Feedback) { try { Feedback = require('./brain_feedback.js'); } catch (_e2) {} }
  }

  function benchmarkFromFeedback(row) {
    var type = row.feedback_type || row.vote || 'not_helpful';
    var expected = {
      confidence_max: type === 'confidence_too_high' ? 'medium' : undefined,
      must_include_card: row.card_type || undefined,
      must_reference_evidence_category: type === 'wrong_lead' ? 'speed' : undefined,
      must_mark_single_replay_observation: type === 'missed_turning_point' ? true : undefined
    };
    Object.keys(expected).forEach(function(key) {
      if (expected[key] === undefined) delete expected[key];
    });
    return {
      name: 'Brain feedback regression: ' + type,
      expected_properties: expected
    };
  }

  function caseFromFeedback(row, options) {
    options = options || {};
    return {
      case_id: Schemas.createId('case'),
      case_type: row.feedback_type,
      analysis_type: (options.evidence_bundle && options.evidence_bundle.analysis_type) || (options.brain_output && options.brain_output.analysis_type) || 'team-review',
      evidence_bundle: options.evidence_bundle || {},
      brain_output: options.brain_output || {},
      user_feedback: row,
      correction: row.correction || {},
      replay_id: row.replay_id || (options.inputs && options.inputs.replay_id) || null,
      regulation_id: row.regulation_id || (options.evidence_bundle && options.evidence_bundle.regulation && options.evidence_bundle.regulation.id) || null,
      release_build_id: row.release_build_id || (options.evidence_bundle && options.evidence_bundle.simulator && options.evidence_bundle.simulator.release_build_id) || null,
      suggested_benchmark: benchmarkFromFeedback(row)
    };
  }

  function createImprovementPack(options) {
    options = options || {};
    var rows = options.feedback_records || (Feedback && Feedback.listBrainFeedback ? Feedback.listBrainFeedback(options) : []);
    if (options.feedback) rows = [options.feedback];
    rows = rows || [];
    return {
      schema_version: Schemas.IMPROVEMENT_PACK_SCHEMA_VERSION,
      created_at: options.created_at || Schemas.nowIso(),
      release_build_id: options.release_build_id || (options.evidence_bundle && options.evidence_bundle.simulator && options.evidence_bundle.simulator.release_build_id) || null,
      cases: rows.map(function(row) { return caseFromFeedback(row, options); })
    };
  }

  function exportImprovementPackAsJson(options) {
    return JSON.stringify(createImprovementPack(options || {}), null, 2);
  }

  function downloadImprovementPack(options) {
    var json = exportImprovementPackAsJson(options || {});
    if (!root.document || !root.URL || !root.Blob) return { ok: true, json: json, downloaded: false };
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'champions-brain-improvement-pack.json';
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true, downloaded: true };
  }

  function saveImprovementPack(pack, options) {
    if (!Feedback || !Feedback.saveBrainImprovementPack) {
      return { ok: false, errors: [Schemas.issue('IMPROVEMENT_PACK_STORAGE_UNAVAILABLE', 'Brain improvement-pack storage is unavailable.', 'storage')] };
    }
    return Feedback.saveBrainImprovementPack(pack || createImprovementPack(options || {}), options || {});
  }

  function listImprovementPacks(options) {
    if (!Feedback || !Feedback.listBrainImprovementPacks) return [];
    return Feedback.listBrainImprovementPacks(options || {});
  }

  function deleteImprovementPack(packId, options) {
    if (!Feedback || !Feedback.deleteBrainImprovementPack) return { ok: false, deleted: 0 };
    return Feedback.deleteBrainImprovementPack(packId, options || {});
  }

  function summarizeImprovementPack(pack) {
    var cases = pack && Array.isArray(pack.cases) ? pack.cases : [];
    var byType = {};
    cases.forEach(function(row) {
      byType[row.case_type] = (byType[row.case_type] || 0) + 1;
    });
    return { total_cases: cases.length, by_type: byType };
  }

  var api = {
    createImprovementPack: createImprovementPack,
    exportImprovementPackAsJson: exportImprovementPackAsJson,
    downloadImprovementPack: downloadImprovementPack,
    saveImprovementPack: saveImprovementPack,
    listImprovementPacks: listImprovementPacks,
    deleteImprovementPack: deleteImprovementPack,
    summarizeImprovementPack: summarizeImprovementPack
  };

  ChampionsSim.analysis.brain.improvementPack = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
