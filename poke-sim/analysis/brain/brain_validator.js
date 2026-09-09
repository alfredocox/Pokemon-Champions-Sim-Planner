(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var Schemas = ChampionsSim.analysis.schemas;
  var EvidenceBundle = ChampionsSim.analysis.evidenceBundle;
  if (typeof require === 'function') {
    if (!Schemas) { try { Schemas = require('../schemas.js'); } catch (_e1) {} }
    if (!EvidenceBundle) { try { EvidenceBundle = require('../evidence_bundle.js'); } catch (_e2) {} }
  }

  function issue(code, message, path) {
    return Schemas && Schemas.issue ? Schemas.issue(code, message, path) : { code: code, message: message, path: path || null };
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function evidenceIdsFromItem(item) {
    return asArray(item && item.evidence_ids).filter(Boolean);
  }

  function missingEvidenceErrors(ids, allowed, path) {
    var errors = [];
    ids.forEach(function(id) {
      if (allowed.indexOf(id) === -1) errors.push(issue('EVIDENCE_ID_MISSING', path + ' references missing evidence id ' + id, path));
    });
    return errors;
  }

  function textOf(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  function findingById(bundle, id) {
    var list = bundle && Array.isArray(bundle.findings) ? bundle.findings : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function isReplayOnlyFinding(finding) {
    if (!finding) return false;
    if (finding.category === 'replay' || finding.category === 'critical_turn') return true;
    var evidence = finding.evidence || {};
    return !!(evidence.single_replay_observation || evidence.scope === 'single_replay_observation');
  }

  function overstatesReplay(item) {
    var text = (textOf(item.text) + ' ' + textOf(item.reason) + ' ' + textOf(item.threat) + ' ' + textOf(item.change)).toLowerCase();
    return /\b(always|all matchups|every matchup|global rule|always loses|always wins)\b/.test(text);
  }

  function referencedIllegalFinding(bundle, item) {
    var ids = evidenceIdsFromItem(item);
    for (var i = 0; i < ids.length; i++) {
      var finding = findingById(bundle, ids[i]);
      var status = finding && finding.evidence && finding.evidence.legality_status;
      if (status === 'illegal') return finding;
    }
    return null;
  }

  function requireEvidence(items, allowed, name, errors) {
    asArray(items).forEach(function(item, index) {
      var path = name + '[' + index + ']';
      var ids = evidenceIdsFromItem(item);
      if (!ids.length) errors.push(issue('MAJOR_CLAIM_EVIDENCE_MISSING', path + ' must include evidence_ids.', path + '.evidence_ids'));
      errors.push.apply(errors, missingEvidenceErrors(ids, allowed, path));
    });
  }

  function validateBrainAnalysis(output, evidenceBundle) {
    var errors = [];
    var warnings = [];
    var allowed = EvidenceBundle.collectEvidenceIds(evidenceBundle || {});

    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      return { ok: false, valid: false, errors: [issue('BRAIN_OUTPUT_INVALID', 'BrainAnalysis output must be an object.', 'output')], warnings: [] };
    }
    if (output.schema_version !== Schemas.BRAIN_ANALYSIS_SCHEMA_VERSION) errors.push(issue('BRAIN_SCHEMA_VERSION_INVALID', 'schema_version must be champions-brain-analysis-v1.', 'schema_version'));
    if (!Schemas.isValidAnalysisType(output.analysis_type)) errors.push(issue('BRAIN_ANALYSIS_TYPE_INVALID', 'analysis_type is invalid.', 'analysis_type'));

    errors.push.apply(errors, missingEvidenceErrors(asArray(output.evidence_used), allowed, 'evidence_used'));
    requireEvidence(output.win_conditions, allowed, 'win_conditions', errors);
    requireEvidence(output.best_leads, allowed, 'best_leads', errors);
    requireEvidence(output.major_threats, allowed, 'major_threats', errors);
    requireEvidence(output.replay_turning_points, allowed, 'replay_turning_points', errors);
    requireEvidence(output.recommended_changes, allowed, 'recommended_changes', errors);

    asArray(output.recommended_changes).forEach(function(change, index) {
      var path = 'recommended_changes[' + index + ']';
      if (!Schemas.isValidLegalityStatus(change && change.legality_status)) errors.push(issue('RECOMMENDATION_LEGALITY_STATUS_MISSING', path + ' must include legality_status legal, illegal, or unknown.', path + '.legality_status'));
      if (change && change.legality_status === 'legal' && referencedIllegalFinding(evidenceBundle, change)) errors.push(issue('ILLEGAL_SUGGESTION_MARKED_LEGAL', path + ' marks an illegal suggestion as legal.', path + '.legality_status'));
    });

    var confidence = output.confidence || {};
    if (!Schemas.isValidConfidenceLevel(confidence.level)) errors.push(issue('BRAIN_CONFIDENCE_INVALID', 'confidence.level must be low, medium, or high.', 'confidence.level'));
    if (confidence.level === 'high' && asArray(evidenceBundle && evidenceBundle.uncertainty).length) {
      errors.push(issue('HIGH_CONFIDENCE_WITH_UNCERTAINTY', 'High confidence is not allowed while bundle uncertainty exists.', 'confidence.level'));
    }

    ['win_conditions', 'best_leads', 'major_threats', 'recommended_changes', 'replay_turning_points'].forEach(function(section) {
      asArray(output[section]).forEach(function(item, index) {
        var ids = evidenceIdsFromItem(item);
        ids.forEach(function(id) {
          var finding = findingById(evidenceBundle, id);
          if (isReplayOnlyFinding(finding) && overstatesReplay(item)) {
            errors.push(issue('REPLAY_OBSERVATION_OVERSTATED', section + '[' + index + '] overstates a replay-only finding as a global rule.', section + '[' + index + ']'));
          }
        });
      });
    });

    return { ok: errors.length === 0, valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  var api = {
    validateBrainAnalysis: validateBrainAnalysis
  };

  ChampionsSim.analysis.brain.validator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
