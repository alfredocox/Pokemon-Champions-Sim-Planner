(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};

  var Schemas = ChampionsSim.analysis.schemas;
  var Provenance = ChampionsSim.analysis.provenance;
  if (typeof require === 'function') {
    if (!Schemas) { try { Schemas = require('./schemas.js'); } catch (_e1) {} }
    if (!Provenance) { try { Provenance = require('./provenance.js'); } catch (_e2) {} }
  }

  function issue(code, message, path) {
    return Schemas && Schemas.issue ? Schemas.issue(code, message, path) : { code: code, message: message, path: path || null };
  }

  function cloneJson(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function asArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function normalizeFinding(finding) {
    var copy = Object.assign({}, finding || {});
    copy.evidence = copy.evidence && typeof copy.evidence === 'object' && !Array.isArray(copy.evidence) ? cloneJson(copy.evidence) : {};
    copy.provenance = Provenance && Provenance.normalizeProvenance ? Provenance.normalizeProvenance(copy.provenance || {}) : (copy.provenance || {});
    return copy;
  }

  function createEvidenceBundle(input) {
    var source = input || {};
    return {
      schema_version: source.schema_version || Schemas.EVIDENCE_BUNDLE_SCHEMA_VERSION,
      bundle_id: source.bundle_id || (Schemas.createId ? Schemas.createId('bundle') : 'bundle_' + Date.now()),
      created_at: source.created_at || (Schemas.nowIso ? Schemas.nowIso() : new Date().toISOString()),
      analysis_type: source.analysis_type || 'team-review',
      regulation: cloneJson(source.regulation || {}),
      simulator: cloneJson(source.simulator || {}),
      inputs: cloneJson(source.inputs || {}),
      findings: asArray(source.findings).map(normalizeFinding),
      uncertainty: asArray(source.uncertainty)
    };
  }

  function validateFinding(finding, seen, index) {
    var path = 'findings[' + index + ']';
    var errors = [];
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
      return [issue('FINDING_INVALID', 'finding must be an object.', path)];
    }
    if (!finding.id) errors.push(issue('FINDING_ID_MISSING', 'finding.id is required.', path + '.id'));
    if (finding.id && seen[finding.id]) errors.push(issue('FINDING_ID_DUPLICATE', 'finding.id must be unique.', path + '.id'));
    if (finding.id) seen[finding.id] = true;
    if (!Schemas.isValidEvidenceCategory(finding.category)) errors.push(issue('FINDING_CATEGORY_INVALID', 'finding.category is invalid.', path + '.category'));
    if (!finding.claim) errors.push(issue('FINDING_CLAIM_MISSING', 'finding.claim is required.', path + '.claim'));
    if (!Schemas.isValidConfidenceLevel(finding.confidence_prior)) errors.push(issue('FINDING_CONFIDENCE_INVALID', 'finding.confidence_prior must be low, medium, or high.', path + '.confidence_prior'));
    if (!finding.evidence || typeof finding.evidence !== 'object' || Array.isArray(finding.evidence)) errors.push(issue('FINDING_EVIDENCE_INVALID', 'finding.evidence must be an object.', path + '.evidence'));
    if (Provenance && Provenance.validateProvenance) {
      errors = errors.concat(Provenance.validateProvenance(finding.provenance, path + '.provenance').errors);
    } else if (!finding.provenance) {
      errors.push(issue('PROVENANCE_MISSING', 'finding.provenance is required.', path + '.provenance'));
    }
    return errors;
  }

  function validateEvidenceBundle(bundle) {
    var errors = [];
    var warnings = [];
    if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) {
      return { ok: false, valid: false, errors: [issue('BUNDLE_INVALID', 'EvidenceBundle must be an object.', 'bundle')], warnings: [] };
    }
    if (bundle.schema_version !== Schemas.EVIDENCE_BUNDLE_SCHEMA_VERSION) errors.push(issue('SCHEMA_VERSION_INVALID', 'schema_version must be champions-evidence-bundle-v1.', 'schema_version'));
    if (!bundle.bundle_id) errors.push(issue('BUNDLE_ID_MISSING', 'bundle_id is required.', 'bundle_id'));
    if (!Schemas.isValidAnalysisType(bundle.analysis_type)) errors.push(issue('ANALYSIS_TYPE_INVALID', 'analysis_type is invalid.', 'analysis_type'));
    if (!bundle.regulation || typeof bundle.regulation !== 'object' || Array.isArray(bundle.regulation)) errors.push(issue('REGULATION_MISSING', 'regulation object is required.', 'regulation'));
    if (!Array.isArray(bundle.findings)) errors.push(issue('FINDINGS_INVALID', 'findings must be an array.', 'findings'));
    if (bundle.uncertainty && !Array.isArray(bundle.uncertainty)) errors.push(issue('UNCERTAINTY_INVALID', 'uncertainty must be an array.', 'uncertainty'));
    var seen = {};
    if (Array.isArray(bundle.findings)) {
      bundle.findings.forEach(function(finding, index) {
        errors = errors.concat(validateFinding(finding, seen, index));
      });
    }
    if (Array.isArray(bundle.findings) && bundle.findings.length === 0) warnings.push(issue('FINDINGS_EMPTY', 'EvidenceBundle has no findings yet.', 'findings'));
    return { ok: errors.length === 0, valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  function collectEvidenceIds(bundle) {
    return (bundle && Array.isArray(bundle.findings) ? bundle.findings : []).map(function(finding) {
      return finding && finding.id;
    }).filter(Boolean);
  }

  function hasEvidence(bundle, evidenceId) {
    return collectEvidenceIds(bundle).indexOf(evidenceId) !== -1;
  }

  function getFindingsByCategory(bundle, category) {
    return (bundle && Array.isArray(bundle.findings) ? bundle.findings : []).filter(function(finding) {
      return finding && finding.category === category;
    });
  }

  function addFinding(bundle, finding) {
    if (!bundle.findings) bundle.findings = [];
    if (hasEvidence(bundle, finding && finding.id)) throw new Error('Duplicate evidence id: ' + finding.id);
    var normalized = normalizeFinding(finding);
    var errors = validateFinding(normalized, {}, bundle.findings.length);
    if (errors.length) throw new Error(errors.map(function(err) { return err.code; }).join(', '));
    bundle.findings.push(normalized);
    return bundle;
  }

  var api = {
    createEvidenceBundle: createEvidenceBundle,
    addFinding: addFinding,
    validateEvidenceBundle: validateEvidenceBundle,
    collectEvidenceIds: collectEvidenceIds,
    getFindingsByCategory: getFindingsByCategory,
    hasEvidence: hasEvidence,
    validateFinding: validateFinding
  };

  ChampionsSim.analysis.evidenceBundle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
