(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};

  var Schemas = ChampionsSim.analysis.schemas;
  if (!Schemas && typeof require === 'function') {
    try { Schemas = require('./schemas.js'); } catch (_e) { Schemas = null; }
  }

  function issue(code, message, path) {
    return Schemas && Schemas.issue ? Schemas.issue(code, message, path) : { code: code, message: message, path: path || null };
  }

  function normalizeProvenance(input) {
    var source = input || {};
    return {
      source_tool: source.source_tool || source.tool_name || 'unknown_tool',
      source_version: source.source_version || source.tool_version || 'v1',
      source_file: source.source_file || null,
      source_id: source.source_id || null,
      evidence_pointer: source.evidence_pointer || null
    };
  }

  function validateProvenance(input, path) {
    var errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, valid: false, errors: [issue('PROVENANCE_MISSING', 'provenance is required.', path || 'provenance')], warnings: [] };
    }
    if (!input.source_tool) errors.push(issue('SOURCE_TOOL_MISSING', 'provenance.source_tool is required.', (path || 'provenance') + '.source_tool'));
    if (!input.source_version) errors.push(issue('SOURCE_VERSION_MISSING', 'provenance.source_version is required.', (path || 'provenance') + '.source_version'));
    return { ok: errors.length === 0, valid: errors.length === 0, errors: errors, warnings: [] };
  }

  function evidencePointer(sourceFile, sourceId, field) {
    return {
      source_file: sourceFile || null,
      source_id: sourceId || null,
      field: field || null
    };
  }

  var api = {
    normalizeProvenance: normalizeProvenance,
    validateProvenance: validateProvenance,
    evidencePointer: evidencePointer
  };

  ChampionsSim.analysis.provenance = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
