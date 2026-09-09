(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};

  var Schemas = ChampionsSim.analysis.schemas;
  if (!Schemas && typeof require === 'function') {
    try { Schemas = require('./schemas.js'); } catch (_e) { Schemas = null; }
  }

  var LEVEL_RANK = { low: 0, medium: 1, high: 2 };
  var LEVELS = ['low', 'medium', 'high'];

  function isValidConfidenceLevel(level) {
    return !!Schemas && Schemas.isValidConfidenceLevel(level);
  }

  function confidenceRank(level) {
    return Object.prototype.hasOwnProperty.call(LEVEL_RANK, level) ? LEVEL_RANK[level] : -1;
  }

  function clampConfidence(level) {
    return isValidConfidenceLevel(level) ? level : 'low';
  }

  function lowerConfidence(level) {
    var rank = Math.max(0, confidenceRank(clampConfidence(level)) - 1);
    return LEVELS[rank];
  }

  function minConfidence(a, b) {
    var ar = confidenceRank(clampConfidence(a));
    var br = confidenceRank(clampConfidence(b));
    return LEVELS[Math.min(ar, br)];
  }

  function downgradeConfidenceForUncertainty(level, uncertainty) {
    var current = clampConfidence(level);
    var count = Array.isArray(uncertainty) ? uncertainty.length : 0;
    if (count >= 3) return 'low';
    if (count >= 1 && current === 'high') return 'medium';
    return current;
  }

  function confidenceFromEvidence(findings, uncertainty) {
    var count = Array.isArray(findings) ? findings.length : 0;
    var gaps = Array.isArray(uncertainty) ? uncertainty.length : 0;
    if (count >= 5 && gaps === 0) return 'high';
    if (count >= 2 && gaps <= 2) return 'medium';
    return 'low';
  }

  var api = {
    confidenceRank: confidenceRank,
    clampConfidence: clampConfidence,
    lowerConfidence: lowerConfidence,
    minConfidence: minConfidence,
    isValidConfidenceLevel: isValidConfidenceLevel,
    downgradeConfidenceForUncertainty: downgradeConfidenceForUncertainty,
    confidenceFromEvidence: confidenceFromEvidence
  };

  ChampionsSim.analysis.confidence = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
