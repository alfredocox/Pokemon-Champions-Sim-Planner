// rulesets.js
// Versioned legality profiles for Pokemon Champions simulator lanes.
// Rulesets prevent source-review data from poisoning sim, DB, and coaching stats.

var CHAMPIONS_RULESET_STATUS = {
  SOURCE_REVIEW: 'source_review',
  DATA_CONVERTED: 'data_converted',
  TESTED: 'tested',
  IMPLEMENTED: 'implemented',
  HISTORICAL: 'historical'
};

var CHAMPIONS_RULESETS = {
  champions_reg_m_a_2026: {
    id: 'champions_reg_m_a_2026',
    legacyIds: ['champions_reg_m_doubles_bo3', 'champions-vgc-2026-regma'],
    label: 'Champions Reg M-A Historical Lane',
    startsAt: '2026-04-08',
    endsAt: '2026-06-17',
    status: CHAMPIONS_RULESET_STATUS.HISTORICAL,
    runtimePromotable: true,
    validator: 'validateChampionsLegality',
    engineFormatId: 'champions-vgc-2026-regma',
    learningEligibility: 'trusted_historical',
    dataPolicy: 'legal_sim_allowed',
    coachingPolicy: 'eligible_with_historical_label',
    sourceCheckedAtUtc: '2026-06-27T23:20:00Z'
  },
  champions_reg_m_b_2026: {
    id: 'champions_reg_m_b_2026',
    legacyIds: ['champions_reg_m_b_doubles_bo3_source_review'],
    label: 'Champions Reg M-B Source Review',
    startsAt: '2026-06-17',
    endsAt: '2026-09-02',
    status: CHAMPIONS_RULESET_STATUS.SOURCE_REVIEW,
    inheritsFrom: 'champions_reg_m_a_2026',
    runtimePromotable: false,
    validator: null,
    engineFormatId: null,
    learningEligibility: 'blocked_source_review',
    dataPolicy: 'do_not_write_trusted_stats',
    coachingPolicy: 'review_only_no_matchup_learning',
    sourceCheckedAtUtc: '2026-06-27T23:20:00Z',
    blocker: 'Reg M-B allowed-Pokemon image sheets and new Mega implementation fields are not converted into reviewed runtime data.'
  }
};

function getChampionsRuleset(rulesetId) {
  var id = String(rulesetId || '');
  if (CHAMPIONS_RULESETS[id]) return CHAMPIONS_RULESETS[id];
  for (var key in CHAMPIONS_RULESETS) {
    var row = CHAMPIONS_RULESETS[key];
    if (row && Array.isArray(row.legacyIds) && row.legacyIds.indexOf(id) >= 0) return row;
  }
  return CHAMPIONS_RULESETS.champions_reg_m_a_2026;
}

function isRulesetRuntimeLegal(rulesetId) {
  var row = getChampionsRuleset(rulesetId);
  return !!(row && row.runtimePromotable && row.status !== CHAMPIONS_RULESET_STATUS.SOURCE_REVIEW);
}

function getRulesetEvidencePolicy(rulesetId) {
  var row = getChampionsRuleset(rulesetId);
  return {
    ruleset_id: row.id,
    ruleset_label: row.label,
    ruleset_status: row.status,
    runtime_promotable: !!row.runtimePromotable,
    learning_eligibility: row.learningEligibility,
    data_policy: row.dataPolicy,
    coaching_policy: row.coachingPolicy,
    source_checked_at_utc: row.sourceCheckedAtUtc || null,
    poisoning_guard: row.runtimePromotable ? 'trusted_stats_allowed' : 'review_only_do_not_train_or_rank',
    blocker: row.blocker || null
  };
}

if (typeof window !== 'undefined') {
  window.CHAMPIONS_RULESET_STATUS = CHAMPIONS_RULESET_STATUS;
  window.CHAMPIONS_RULESETS = CHAMPIONS_RULESETS;
  window.getChampionsRuleset = getChampionsRuleset;
  window.isRulesetRuntimeLegal = isRulesetRuntimeLegal;
  window.getRulesetEvidencePolicy = getRulesetEvidencePolicy;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAMPIONS_RULESET_STATUS: CHAMPIONS_RULESET_STATUS,
    CHAMPIONS_RULESETS: CHAMPIONS_RULESETS,
    getChampionsRuleset: getChampionsRuleset,
    isRulesetRuntimeLegal: isRulesetRuntimeLegal,
    getRulesetEvidencePolicy: getRulesetEvidencePolicy
  };
}
