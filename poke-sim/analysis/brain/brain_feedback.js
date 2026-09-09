(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var Schemas = ChampionsSim.analysis.schemas;
  if (!Schemas && typeof require === 'function') {
    try { Schemas = require('../schemas.js'); } catch (_e) { Schemas = null; }
  }

  var FEEDBACK_KEY = 'champions:brain:feedback:v1';
  var OUTPUTS_KEY = 'champions:brain:outputs:v1';
  var IMPROVEMENT_PACKS_KEY = 'champions:brain:improvement_packs:v1';
  var memory = {};
  memory[FEEDBACK_KEY] = [];
  memory[OUTPUTS_KEY] = [];
  memory[IMPROVEMENT_PACKS_KEY] = [];

  function storageFromOptions(options) {
    if (options && options.storage) return options.storage;
    if (root.localStorage) return root.localStorage;
    return null;
  }

  function readRowsForKey(key, options) {
    var storage = storageFromOptions(options);
    if (!storage) return (memory[key] || []).slice();
    try {
      var raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (_e) {
      return [];
    }
  }

  function writeRowsForKey(key, rows, options) {
    var storage = storageFromOptions(options);
    if (!storage) {
      memory[key] = rows.slice();
      return;
    }
    storage.setItem(key, JSON.stringify(rows));
  }

  function readRows(options) {
    return readRowsForKey(FEEDBACK_KEY, options);
  }

  function writeRows(rows, options) {
    writeRowsForKey(FEEDBACK_KEY, rows, options);
  }

  function normalizeFeedback(feedback) {
    var source = feedback || {};
    return {
      feedback_id: source.feedback_id || Schemas.createId('fb'),
      created_at: source.created_at || Schemas.nowIso(),
      analysis_output_id: source.analysis_output_id || null,
      evidence_bundle_id: source.evidence_bundle_id || null,
      scope: source.scope || 'overall',
      card_type: source.card_type || null,
      vote: source.vote || source.feedback_type || 'not_helpful',
      feedback_type: source.feedback_type || source.vote || 'not_helpful',
      comment: source.comment || '',
      correction: Schemas.isPlainObject(source.correction) ? source.correction : {},
      regulation_id: source.regulation_id || null,
      release_build_id: source.release_build_id || null,
      replay_id: source.replay_id || null
    };
  }

  function validateFeedback(feedback) {
    var errors = [];
    function err(code, message, path) { errors.push(Schemas.issue(code, message, path)); }
    if (!feedback.analysis_output_id) err('ANALYSIS_OUTPUT_ID_MISSING', 'analysis_output_id is required.', 'analysis_output_id');
    if (!feedback.evidence_bundle_id) err('EVIDENCE_BUNDLE_ID_MISSING', 'evidence_bundle_id is required.', 'evidence_bundle_id');
    if (Schemas.FEEDBACK_SCOPES.indexOf(feedback.scope) === -1) err('FEEDBACK_SCOPE_INVALID', 'scope must be overall or card.', 'scope');
    if (feedback.scope === 'card' && !Schemas.isValidBrainCardType(feedback.card_type)) err('FEEDBACK_CARD_TYPE_INVALID', 'card_type is invalid.', 'card_type');
    if (Schemas.FEEDBACK_VOTES.indexOf(feedback.vote) === -1) err('FEEDBACK_VOTE_INVALID', 'vote is invalid.', 'vote');
    if (!Schemas.isValidFeedbackType(feedback.feedback_type)) err('FEEDBACK_TYPE_INVALID', 'feedback_type is invalid.', 'feedback_type');
    return { ok: errors.length === 0, valid: errors.length === 0, errors: errors, warnings: [] };
  }

  function recordBrainFeedback(feedback, options) {
    var normalized = normalizeFeedback(feedback);
    var validation = validateFeedback(normalized);
    if (!validation.ok) return { ok: false, feedback: normalized, validation: validation, errors: validation.errors };
    var rows = readRows(options).filter(function(row) { return row.feedback_id !== normalized.feedback_id; });
    rows.push(normalized);
    writeRows(rows, options);
    return { ok: true, feedback: normalized, validation: validation };
  }

  function listBrainFeedback(options) {
    return readRows(options);
  }

  function getBrainFeedbackByOutput(analysisOutputId, options) {
    return readRows(options).filter(function(row) {
      return row.analysis_output_id === analysisOutputId;
    });
  }

  function deleteBrainFeedback(feedbackId, options) {
    var rows = readRows(options);
    var next = rows.filter(function(row) { return row.feedback_id !== feedbackId; });
    writeRows(next, options);
    return { ok: next.length !== rows.length, deleted: rows.length - next.length };
  }

  function summarizeFeedback(options) {
    var rows = readRows(options);
    var byType = {};
    var byCard = {};
    rows.forEach(function(row) {
      byType[row.feedback_type] = (byType[row.feedback_type] || 0) + 1;
      if (row.card_type) byCard[row.card_type] = (byCard[row.card_type] || 0) + 1;
    });
    return { total: rows.length, by_type: byType, by_card: byCard };
  }

  function recordBrainOutput(output, options) {
    var source = output || {};
    var row = Object.assign({}, source);
    row.analysis_output_id = row.analysis_output_id || Schemas.createId('analysis');
    row.created_at = row.created_at || Schemas.nowIso();
    var rows = readRowsForKey(OUTPUTS_KEY, options).filter(function(existing) {
      return existing.analysis_output_id !== row.analysis_output_id;
    });
    rows.push(row);
    writeRowsForKey(OUTPUTS_KEY, rows, options);
    return { ok: true, output: row };
  }

  function listBrainOutputs(options) {
    return readRowsForKey(OUTPUTS_KEY, options);
  }

  function getBrainOutput(analysisOutputId, options) {
    return readRowsForKey(OUTPUTS_KEY, options).filter(function(row) {
      return row.analysis_output_id === analysisOutputId;
    })[0] || null;
  }

  function deleteBrainOutput(analysisOutputId, options) {
    var rows = readRowsForKey(OUTPUTS_KEY, options);
    var next = rows.filter(function(row) { return row.analysis_output_id !== analysisOutputId; });
    writeRowsForKey(OUTPUTS_KEY, next, options);
    return { ok: next.length !== rows.length, deleted: rows.length - next.length };
  }

  function saveBrainImprovementPack(pack, options) {
    var source = pack || {};
    var row = Object.assign({}, source);
    row.pack_id = row.pack_id || Schemas.createId('pack');
    row.created_at = row.created_at || Schemas.nowIso();
    var rows = readRowsForKey(IMPROVEMENT_PACKS_KEY, options).filter(function(existing) {
      return existing.pack_id !== row.pack_id;
    });
    rows.push(row);
    writeRowsForKey(IMPROVEMENT_PACKS_KEY, rows, options);
    return { ok: true, pack: row };
  }

  function listBrainImprovementPacks(options) {
    return readRowsForKey(IMPROVEMENT_PACKS_KEY, options);
  }

  function getBrainImprovementPack(packId, options) {
    return readRowsForKey(IMPROVEMENT_PACKS_KEY, options).filter(function(row) {
      return row.pack_id === packId;
    })[0] || null;
  }

  function deleteBrainImprovementPack(packId, options) {
    var rows = readRowsForKey(IMPROVEMENT_PACKS_KEY, options);
    var next = rows.filter(function(row) { return row.pack_id !== packId; });
    writeRowsForKey(IMPROVEMENT_PACKS_KEY, next, options);
    return { ok: next.length !== rows.length, deleted: rows.length - next.length };
  }

  var api = {
    FEEDBACK_KEY: FEEDBACK_KEY,
    OUTPUTS_KEY: OUTPUTS_KEY,
    IMPROVEMENT_PACKS_KEY: IMPROVEMENT_PACKS_KEY,
    normalizeFeedback: normalizeFeedback,
    validateFeedback: validateFeedback,
    recordBrainFeedback: recordBrainFeedback,
    listBrainFeedback: listBrainFeedback,
    getBrainFeedbackByOutput: getBrainFeedbackByOutput,
    deleteBrainFeedback: deleteBrainFeedback,
    summarizeFeedback: summarizeFeedback,
    recordBrainOutput: recordBrainOutput,
    listBrainOutputs: listBrainOutputs,
    getBrainOutput: getBrainOutput,
    deleteBrainOutput: deleteBrainOutput,
    saveBrainImprovementPack: saveBrainImprovementPack,
    listBrainImprovementPacks: listBrainImprovementPacks,
    getBrainImprovementPack: getBrainImprovementPack,
    deleteBrainImprovementPack: deleteBrainImprovementPack
  };

  ChampionsSim.analysis.brain.feedback = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
