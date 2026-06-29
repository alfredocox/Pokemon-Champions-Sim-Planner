// ============================================================
// SOURCE TRUTH PACKAGE FOUNDATION
// ============================================================
// Rule facts and compiled ruleset packages for evidence-bound simulator work.
// This module stores uncertainty instead of promoting unknown Champion data.
(function(root) {
  'use strict';

  /** @typedef {'mechanic'|'legality'|'regulation'|'battle_flow'|'item'|'ability'|'move'|'form'|'pokemon_home'|'meta'} RuleFactCategory */
  /** @typedef {'official_verified'|'in_game_verified'|'replay_verified'|'showdown_reference'|'community_reference'|'needs_verification'|'conflicting'} RuleFactVerificationStatus */
  /** @typedef {'verified'|'partial'|'needs_verification'|'stale'} RulesetPackageStatus */
  /**
   * @typedef {Object} RuleFact
   * @property {string} id
   * @property {RuleFactCategory} category
   * @property {string} statement
   * @property {string=} regulation_id
   * @property {string} ruleset_version
   * @property {'singles'|'doubles'=} format
   * @property {RuleFactVerificationStatus} verification_status
   * @property {string=} source_url
   * @property {string=} source_note
   * @property {string=} source_hash
   * @property {string[]=} tests_linked
   * @property {Object=} data
   */
  /**
   * @typedef {Object} RulesetPackage
   * @property {string} regulation_id
   * @property {string} ruleset_version
   * @property {'singles'|'doubles'} format
   * @property {string[]} legal_species
   * @property {string[]} legal_forms
   * @property {string[]} legal_moves
   * @property {string[]} legal_items
   * @property {string[]} legal_abilities
   * @property {Object} clauses
   * @property {Object} mechanics
   * @property {Object} source_status
   * @property {Object[]} source_gaps
   * @property {string[]} compiled_from_rule_fact_ids
   * @property {RulesetPackageStatus} status
   */

  var VALID_FACT_CATEGORIES = ['mechanic', 'legality', 'regulation', 'battle_flow', 'item', 'ability', 'move', 'form', 'pokemon_home', 'meta'];
  var VALID_FACT_STATUS = ['official_verified', 'in_game_verified', 'replay_verified', 'showdown_reference', 'community_reference', 'needs_verification', 'conflicting'];
  var VERIFIED_FACT_STATUS = ['official_verified', 'in_game_verified', 'replay_verified'];
  var REFERENCE_ONLY_STATUS = ['showdown_reference', 'community_reference'];
  var LEGALITY_LIST_KEYS = ['legal_species', 'legal_forms', 'legal_moves', 'legal_items', 'legal_abilities'];

  function unique(values) {
    var out = [];
    (values || []).forEach(function(value) {
      if (value == null || value === '') return;
      if (out.indexOf(value) === -1) out.push(value);
    });
    return out;
  }

  function sourceGap(code, message, pointer, factId) {
    var gap = { code: code, severity: 'needs_source', message: message };
    if (pointer) gap.pointer = pointer;
    if (factId) gap.rule_fact_id = factId;
    return gap;
  }

  function ruleFactIsVerified(fact) {
    return !!(fact && VERIFIED_FACT_STATUS.indexOf(fact.verification_status) !== -1);
  }

  function ruleFactIsReferenceOnly(fact) {
    return !!(fact && REFERENCE_ONLY_STATUS.indexOf(fact.verification_status) !== -1);
  }

  function validateRuleFact(fact) {
    var errors = [];
    var warnings = [];
    if (!fact || typeof fact !== 'object') {
      errors.push({ code: 'RULE_FACT_MISSING', message: 'Rule fact payload is missing.' });
      return { valid: false, errors: errors, warnings: warnings };
    }
    if (!fact.id) errors.push({ code: 'RULE_FACT_ID_MISSING', message: 'Rule fact id is required.' });
    if (VALID_FACT_CATEGORIES.indexOf(fact.category) === -1) errors.push({ code: 'RULE_FACT_CATEGORY_INVALID', message: 'Rule fact category is invalid.' });
    if (!fact.statement) errors.push({ code: 'RULE_FACT_STATEMENT_MISSING', message: 'Rule fact statement is required.' });
    if (!fact.ruleset_version) errors.push({ code: 'RULE_FACT_RULESET_VERSION_MISSING', message: 'Rule fact ruleset_version is required.' });
    if (VALID_FACT_STATUS.indexOf(fact.verification_status) === -1) errors.push({ code: 'RULE_FACT_STATUS_INVALID', message: 'Rule fact verification_status is invalid.' });
    if (ruleFactIsReferenceOnly(fact)) warnings.push({ code: 'REFERENCE_ONLY_FACT', message: 'Reference-only facts must not be promoted as Champion truth without Champion verification.' });
    if (fact.verification_status === 'needs_verification' || fact.verification_status === 'conflicting') warnings.push({ code: 'UNRESOLVED_FACT', message: 'Unresolved facts should surface as source gaps in compiled ruleset packages.' });
    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  function factMatchesPackage(fact, input) {
    if (!fact) return false;
    if (input.regulation_id && fact.regulation_id && fact.regulation_id !== input.regulation_id) return false;
    if (input.ruleset_version && fact.ruleset_version && fact.ruleset_version !== input.ruleset_version) return false;
    if (input.format && fact.format && fact.format !== input.format) return false;
    return true;
  }

  function mergeList(target, values) {
    if (!Array.isArray(values)) return target;
    return unique(target.concat(values));
  }

  function applyFactToPackage(pkg, fact, gaps) {
    var data = fact.data || {};
    if (!ruleFactIsVerified(fact)) {
      var code = fact.verification_status === 'conflicting' ? 'CONFLICTING_RULE_FACT' : 'UNVERIFIED_RULE_FACT';
      gaps.push(sourceGap(code, 'Rule fact is not Champion-verified and cannot be promoted as package truth.', fact.source_url || fact.source_note, fact.id));
      return;
    }

    LEGALITY_LIST_KEYS.forEach(function(key) {
      pkg[key] = mergeList(pkg[key], data[key]);
    });
    if (data.clauses && typeof data.clauses === 'object') pkg.clauses = Object.assign({}, pkg.clauses, data.clauses);
    if (data.mechanics && typeof data.mechanics === 'object') pkg.mechanics = Object.assign({}, pkg.mechanics, data.mechanics);
  }

  function summarizeRuleFacts(facts) {
    var summary = {
      total: 0,
      verified: 0,
      reference_only: 0,
      needs_verification: 0,
      conflicting: 0,
      by_category: {},
      by_status: {}
    };
    (facts || []).forEach(function(fact) {
      summary.total += 1;
      summary.by_category[fact.category || 'unknown'] = (summary.by_category[fact.category || 'unknown'] || 0) + 1;
      summary.by_status[fact.verification_status || 'unknown'] = (summary.by_status[fact.verification_status || 'unknown'] || 0) + 1;
      if (ruleFactIsVerified(fact)) summary.verified += 1;
      else if (ruleFactIsReferenceOnly(fact)) summary.reference_only += 1;
      else if (fact.verification_status === 'conflicting') summary.conflicting += 1;
      else summary.needs_verification += 1;
    });
    return summary;
  }

  function compileRulesetPackage(input) {
    var opts = input || {};
    var facts = (opts.facts || []).filter(function(fact) { return factMatchesPackage(fact, opts); });
    var gaps = [];
    var pkg = {
      regulation_id: opts.regulation_id || 'unknown',
      ruleset_version: opts.ruleset_version || 'unknown',
      format: opts.format || 'doubles',
      legal_species: [],
      legal_forms: [],
      legal_moves: [],
      legal_items: [],
      legal_abilities: [],
      clauses: Object.assign({ species_clause: false, item_clause: false, team_size: 6, bring_size: null, level_cap: 50 }, opts.clauses || {}),
      mechanics: Object.assign({ mega_evolution: 'needs_verification', tera: 'needs_verification', dynamax: 'needs_verification' }, opts.mechanics || {}),
      source_status: { legality: 'needs_verification', mechanics: 'needs_verification' },
      source_gaps: gaps,
      compiled_from_rule_fact_ids: [],
      status: 'needs_verification'
    };

    if (!facts.length) {
      gaps.push(sourceGap('NO_RULE_FACTS', 'No rule facts were available for this regulation/ruleset/format package.', opts.source_pointer || null));
    }

    facts.forEach(function(fact) {
      var validation = validateRuleFact(fact);
      if (!validation.valid) {
        gaps.push(sourceGap('INVALID_RULE_FACT', 'Invalid rule fact cannot be used for package compilation.', fact.source_url || fact.source_note, fact.id));
        return;
      }
      pkg.compiled_from_rule_fact_ids.push(fact.id);
      applyFactToPackage(pkg, fact, gaps);
    });

    LEGALITY_LIST_KEYS.forEach(function(key) {
      if (!pkg[key].length) gaps.push(sourceGap('MISSING_' + key.toUpperCase(), 'Compiled ruleset package has no verified ' + key + ' list.'));
    });

    var mechanicsValues = Object.keys(pkg.mechanics).map(function(key) { return pkg.mechanics[key]; });
    var legalityComplete = LEGALITY_LIST_KEYS.every(function(key) { return pkg[key].length > 0; });
    var mechanicsComplete = mechanicsValues.every(function(value) { return value === 'enabled' || value === 'disabled'; });
    pkg.source_status = {
      legality: legalityComplete ? 'verified' : (pkg.compiled_from_rule_fact_ids.length ? 'partial' : 'needs_verification'),
      mechanics: mechanicsComplete ? 'verified' : (pkg.compiled_from_rule_fact_ids.length ? 'partial' : 'needs_verification')
    };
    pkg.source_gaps = gaps;
    pkg.status = gaps.length ? (pkg.compiled_from_rule_fact_ids.length ? 'partial' : 'needs_verification') : 'verified';
    pkg.compiled_from_rule_fact_ids = unique(pkg.compiled_from_rule_fact_ids);
    return pkg;
  }

  function packageCanOfficiallyRank(pkg) {
    return !!(pkg && pkg.status === 'verified' && pkg.source_status && pkg.source_status.legality === 'verified' && pkg.source_status.mechanics === 'verified');
  }

  var api = {
    VALID_FACT_CATEGORIES: VALID_FACT_CATEGORIES,
    VALID_FACT_STATUS: VALID_FACT_STATUS,
    VERIFIED_FACT_STATUS: VERIFIED_FACT_STATUS,
    validateRuleFact: validateRuleFact,
    ruleFactIsVerified: ruleFactIsVerified,
    ruleFactIsReferenceOnly: ruleFactIsReferenceOnly,
    summarizeRuleFacts: summarizeRuleFacts,
    compileRulesetPackage: compileRulesetPackage,
    packageCanOfficiallyRank: packageCanOfficiallyRank
  };

  root.SourceTruth = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
