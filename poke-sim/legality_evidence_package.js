// ============================================================
// LEGALITY EVIDENCE PACKAGE
// ============================================================
// A source-bound package wrapper for Champion regulation legality evidence.
// This module does not invent Champion data. Missing package fields and
// incomplete allowlists remain needs_verification until source captures and
// fixtures prove the active regulation.
(function(root) {
  'use strict';

  var TeamLabApi = root.TeamLab || (typeof require === 'function' ? require('./team_lab.js') : null);
  var TRUSTED_SOURCE_TIERS = ['official', 'in_game_verified', 'replay_verified'];
  var LIST_KEYS = ['legal_pokemon_ids', 'legal_form_ids', 'legal_move_ids', 'legal_item_ids', 'legal_ability_ids'];

  function issue(code, severity, message, pointer) {
    var row = { code: code, severity: severity, message: message };
    if (pointer) row.pointer = pointer;
    return row;
  }

  function unique(values) {
    var out = [];
    (values || []).forEach(function(value) {
      if (value == null || value === '') return;
      if (out.indexOf(value) < 0) out.push(value);
    });
    return out;
  }

  function listFromPackage(pkg, key) {
    if (!pkg || !pkg.allowlists) return null;
    return Array.isArray(pkg.allowlists[key]) ? unique(pkg.allowlists[key]) : null;
  }

  function allowlistComplete(pkg, key) {
    if (!pkg || !pkg.allowlist_completeness) return false;
    return pkg.allowlist_completeness[key] === true || pkg.allowlist_completeness[key] === 'complete';
  }

  function validateLegalityEvidencePackage(pkg) {
    var errors = [];
    var warnings = [];
    var sourceGaps = [];
    var captures = pkg && Array.isArray(pkg.source_captures) ? pkg.source_captures : [];

    if (!pkg || typeof pkg !== 'object') {
      errors.push(issue('PACKAGE_MISSING', 'error', 'Legality evidence package is missing.'));
      return { status: 'illegal', errors: errors, warnings: warnings, source_gaps: sourceGaps };
    }
    if (pkg.schema_version !== 'champions-legality-evidence-package-v1') {
      errors.push(issue('PACKAGE_SCHEMA_INVALID', 'error', 'Legality evidence package schema_version is invalid.'));
    }
    if (!pkg.package_id) errors.push(issue('PACKAGE_ID_MISSING', 'error', 'Legality evidence package id is required.'));
    if (!pkg.regulation_id) errors.push(issue('REGULATION_ID_MISSING', 'error', 'regulation_id is required.'));
    if (!pkg.ruleset_version) errors.push(issue('RULESET_VERSION_MISSING', 'error', 'ruleset_version is required.'));
    if (!pkg.format) errors.push(issue('FORMAT_MISSING', 'error', 'format is required.'));

    if (!captures.length) {
      sourceGaps.push(issue('SOURCE_CAPTURE_MISSING', 'needs_source', 'At least one official, in-game, or replay-verified source capture is required.'));
    }

    var trustedCaptureCount = 0;
    captures.forEach(function(capture, index) {
      var pointer = capture && (capture.source_url || capture.pointer || capture.id);
      if (!capture || typeof capture !== 'object') {
        errors.push(issue('SOURCE_CAPTURE_INVALID', 'error', 'Source capture row is invalid.', 'source_captures[' + index + ']'));
        return;
      }
      if (!capture.id) sourceGaps.push(issue('SOURCE_CAPTURE_ID_MISSING', 'needs_source', 'Source capture id is missing.', pointer));
      if (TRUSTED_SOURCE_TIERS.indexOf(capture.source_tier) >= 0 && capture.verification_status === 'verified') trustedCaptureCount += 1;
      if (capture.verification_status !== 'verified') {
        sourceGaps.push(issue('SOURCE_CAPTURE_NOT_VERIFIED', 'needs_source', 'Source capture is not verified.', pointer));
      }
      if (TRUSTED_SOURCE_TIERS.indexOf(capture.source_tier) < 0) {
        warnings.push(issue('SOURCE_TIER_NOT_AUTHORITATIVE', 'warning', 'Source tier cannot promote Champion legality by itself.', pointer));
      }
    });
    if (!trustedCaptureCount) {
      sourceGaps.push(issue('TRUSTED_SOURCE_CAPTURE_MISSING', 'needs_source', 'No verified official, in-game, or replay-verified capture is attached.'));
    }

    LIST_KEYS.forEach(function(key) {
      var list = listFromPackage(pkg, key);
      if (!list || !list.length) {
        sourceGaps.push(issue('ALLOWLIST_MISSING_' + key.toUpperCase(), 'needs_source', 'Missing allowlist: ' + key + '.'));
      }
      if (!allowlistComplete(pkg, key)) {
        sourceGaps.push(issue('ALLOWLIST_INCOMPLETE_' + key.toUpperCase(), 'needs_source', 'Allowlist is not marked complete: ' + key + '.'));
      }
    });

    var status = 'verified';
    if (errors.length) status = 'illegal';
    else if (sourceGaps.length || pkg.verification_status !== 'verified') status = 'needs_verification';
    return { status: status, errors: errors, warnings: warnings, source_gaps: sourceGaps };
  }

  function regulationFromEvidencePackage(pkg) {
    var packageReport = validateLegalityEvidencePackage(pkg);
    var sourcePointer = (pkg && Array.isArray(pkg.source_captures) && pkg.source_captures[0])
      ? (pkg.source_captures[0].source_url || pkg.source_captures[0].pointer || pkg.source_captures[0].id)
      : 'legality_evidence_package';
    var regulation = {
      regulation_id: (pkg && pkg.regulation_id) || 'unknown',
      ruleset_version: (pkg && pkg.ruleset_version) || 'unknown',
      format: (pkg && pkg.format) || null,
      verification_status: packageReport.status === 'verified' ? 'verified' : 'needs_verification',
      source_pointer: sourcePointer,
      source_package_id: (pkg && pkg.package_id) || null,
      source_gaps: packageReport.source_gaps.slice()
    };
    LIST_KEYS.forEach(function(key) {
      var list = listFromPackage(pkg, key);
      if (list && allowlistComplete(pkg, key)) regulation[key] = list;
    });
    return regulation;
  }

  function expectedFixtureStatus(fixture, pkg) {
    if (!fixture) return 'illegal';
    if (fixture.expected_status === 'stale') return 'stale';
    if (fixture.ruleset_version && pkg && pkg.ruleset_version && fixture.ruleset_version !== pkg.ruleset_version) return 'stale';
    return fixture.expected_status || 'needs_verification';
  }

  function actualFixtureStatus(fixture, regulation, pkg) {
    if (fixture && fixture.ruleset_version && pkg && pkg.ruleset_version && fixture.ruleset_version !== pkg.ruleset_version) return 'stale';
    if (!TeamLabApi || typeof TeamLabApi.validateTeamForRegulation !== 'function') return 'needs_verification';
    if (fixture && fixture.use_missing_source === true) return TeamLabApi.validateTeamForRegulation(fixture.team, null).status;
    return TeamLabApi.validateTeamForRegulation(fixture && fixture.team, regulation).status;
  }

  function evaluateLegalityFixtures(pkg, fixtures) {
    var regulation = regulationFromEvidencePackage(pkg);
    var rows = (fixtures || []).map(function(fixture) {
      var expected = expectedFixtureStatus(fixture, pkg);
      var actual = actualFixtureStatus(fixture, regulation, pkg);
      return {
        id: fixture && fixture.id || null,
        label: fixture && fixture.label || null,
        expected_status: expected,
        actual_status: actual,
        passed: expected === actual,
        fixture_type: fixture && fixture.fixture_type || expected,
        source_pointer: fixture && fixture.source_pointer || null
      };
    });
    var counts = rows.reduce(function(acc, row) {
      acc.total += 1;
      if (row.passed) acc.passed += 1;
      else acc.failed += 1;
      acc[row.expected_status] = (acc[row.expected_status] || 0) + 1;
      return acc;
    }, { total: 0, passed: 0, failed: 0 });
    return {
      regulation_id: (pkg && pkg.regulation_id) || 'unknown',
      ruleset_version: (pkg && pkg.ruleset_version) || 'unknown',
      rows: rows,
      counts: counts,
      all_passed: counts.failed === 0
    };
  }

  function promotionReadinessFromEvidencePackage(pkg, fixtures) {
    var packageReport = validateLegalityEvidencePackage(pkg);
    var fixtureReport = evaluateLegalityFixtures(pkg, fixtures || []);
    var requiredFixtureTypes = ['verified', 'illegal', 'stale', 'needs_verification'];
    var missingFixtureTypes = requiredFixtureTypes.filter(function(type) {
      return !fixtureReport.rows.some(function(row) { return row.expected_status === type; });
    });
    var sourceGaps = packageReport.source_gaps.map(function(row) { return row.code; });
    if (missingFixtureTypes.length) sourceGaps.push('FIXTURE_TYPES_MISSING_' + missingFixtureTypes.join('_').toUpperCase());
    var ready = packageReport.status === 'verified' && fixtureReport.all_passed && !missingFixtureTypes.length;
    return {
      ready_for_runtime_promotion: ready,
      status: ready ? 'verified' : 'needs_verification',
      regulation_id: (pkg && pkg.regulation_id) || 'unknown',
      ruleset_version: (pkg && pkg.ruleset_version) || 'unknown',
      package_status: packageReport.status,
      fixture_status: fixtureReport.all_passed ? 'passed' : 'failed',
      fixture_counts: fixtureReport.counts,
      missing_fixture_types: missingFixtureTypes,
      source_gaps: unique(sourceGaps),
      rule: 'Runtime/team-lab promotion requires verified package source rows plus verified, illegal, stale, and needs_verification fixtures.'
    };
  }

  var api = {
    TRUSTED_SOURCE_TIERS: TRUSTED_SOURCE_TIERS,
    LIST_KEYS: LIST_KEYS,
    validateLegalityEvidencePackage: validateLegalityEvidencePackage,
    regulationFromEvidencePackage: regulationFromEvidencePackage,
    evaluateLegalityFixtures: evaluateLegalityFixtures,
    promotionReadinessFromEvidencePackage: promotionReadinessFromEvidencePackage
  };

  root.LegalityEvidencePackage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
