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
  champions_custom_practice: {
    id: 'champions_custom_practice', version: 'champions-practice-v1',
    label: 'Custom practice - NOT regulation verified', status: 'experimental',
    selectorLabel: 'Practice (unverified)',
    runtimePromotable: false, learningEligibility: 'blocked_experimental',
    dataPolicy: 'do_not_write_trusted_stats', coachingPolicy: 'review_only_no_matchup_learning',
    blocker: 'Unverified practice data is not competitive regulation evidence.'
  },
  champions_reg_m_a_2026: {
    id: 'champions_reg_m_a_2026',
    version: 'champions-reg-ma-2026-v1',
    legacyIds: ['champions_reg_m_doubles_bo3', 'champions-vgc-2026-regma'],
    label: 'Champions Reg M-A Historical Lane',
    selectorLabel: 'Reg M-A (historical)',
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
    version: 'champions-reg-mb-source-review-v1',
    legacyIds: ['champions_reg_m_b_doubles_bo3_source_review'],
    label: 'Champions Reg M-B Source Review',
    selectorLabel: 'Reg M-B (review)',
    startsAt: '2026-06-17',
    endsAt: '2026-09-09',
    endsAtUtc: '2026-09-09T01:59:00Z',
    durationSourceUrl: 'https://champions-news.pokemon-home.com/en/page/776.html',
    status: CHAMPIONS_RULESET_STATUS.SOURCE_REVIEW,
    inheritsFrom: 'champions_reg_m_a_2026',
    runtimePromotable: false,
    validator: null,
    engineFormatId: null,
    learningEligibility: 'blocked_source_review',
    dataPolicy: 'do_not_write_trusted_stats',
    coachingPolicy: 'review_only_no_matchup_learning',
    sourceCheckedAtUtc: '2026-06-27T23:20:00Z',
    blocker: 'Reg M-B has 235 reconciled official roster identities. Complete-set legality, remaining mechanics checks and exact-package approval are still incomplete.'
  },
  champions_reg_m_c_2026: {
    id: 'champions_reg_m_c_2026',
    version: 'champions-reg-mc-source-review-v1',
    legacyIds: ['champions_reg_m_c_doubles_bo3_source_review'],
    label: 'Champions Reg M-C Source Review',
    selectorLabel: 'Reg M-C (review)',
    startsAt: '2026-09-09',
    startsAtUtc: '2026-09-09T02:00:00Z',
    endsAt: '2026-12-02',
    endsAtUtc: '2026-12-02T01:59:00Z',
    status: CHAMPIONS_RULESET_STATUS.SOURCE_REVIEW,
    inheritsFrom: 'champions_reg_m_b_2026',
    runtimePromotable: false,
    validator: null,
    engineFormatId: null,
    learningEligibility: 'blocked_source_review',
    dataPolicy: 'do_not_write_trusted_stats',
    coachingPolicy: 'review_only_no_matchup_learning',
    sourceCheckedAtUtc: '2026-09-08T00:52:48.095Z',
    sourceUrl: 'https://www.pokemon.com/us/news/get-ready-for-regulation-set-m-c-in-pokemon-champions',
    blocker: 'All 262 official Reg M-C roster IDs and a pinned M-C Showdown reference are captured, but form reconciliation, item/move/Ability evidence, mechanics tests and exact-package approval are still incomplete.'
  }
};

function getChampionsRegulationCoverage(asOf) {
  var now = asOf == null ? new Date() : new Date(asOf);
  if (!Number.isFinite(now.getTime())) {
    return { status: 'invalid_date', covered: false, regulation_id: null, message: 'Regulation coverage date is invalid.' };
  }
  var dated = Object.values(CHAMPIONS_RULESETS).filter(function(row) {
    return row && row.id !== 'champions_custom_practice' && row.startsAt && (row.endsAtUtc || row.endsAt);
  });
  var active = dated.find(function(row) {
    var start = new Date(row.startsAtUtc || (row.startsAt + 'T00:00:00Z'));
    var end = new Date(row.endsAtUtc || (row.endsAt + 'T23:59:59Z'));
    return now >= start && now <= end;
  });
  if (active) {
    return { status: active.runtimePromotable ? 'covered' : 'source_review', covered: !!active.runtimePromotable,
      regulation_id: active.id, ends_at_utc: active.endsAtUtc || active.endsAt,
      message: active.runtimePromotable ? 'A dated regulation lane is implemented.' : active.selectorLabel + ' is current for this date, but competitive verification is incomplete.' };
  }
  var upcoming = dated.filter(function(row) {
    return now < new Date(row.startsAtUtc || (row.startsAt + 'T00:00:00Z'));
  }).sort(function(a, b) {
    return new Date(a.startsAtUtc || (a.startsAt + 'T00:00:00Z')) - new Date(b.startsAtUtc || (b.startsAt + 'T00:00:00Z'));
  })[0] || null;
  if (upcoming) {
    return { status: 'scheduled_source_review', covered: false, regulation_id: upcoming.id,
      starts_at_utc: upcoming.startsAtUtc || upcoming.startsAt,
      message: upcoming.label + ' starts at ' + (upcoming.startsAtUtc || upcoming.startsAt) + ' and remains blocked pending complete source review.' };
  }
  var latest = dated.sort(function(a, b) {
    return new Date(b.endsAtUtc || (b.endsAt + 'T23:59:59Z')) - new Date(a.endsAtUtc || (a.endsAt + 'T23:59:59Z'));
  })[0] || null;
  if (latest && now > new Date(latest.endsAtUtc || (latest.endsAt + 'T23:59:59Z'))) {
    return { status: 'successor_required', covered: false, regulation_id: null,
      last_regulation_id: latest.id, coverage_ended_at_utc: latest.endsAtUtc || latest.endsAt,
      message: 'Official current-regulation evidence is missing after ' + (latest.endsAtUtc || latest.endsAt) + '. Competitive use stays blocked.' };
  }
  return { status: 'not_started', covered: false, regulation_id: null, message: 'No reviewed regulation covers this date.' };
}

function getChampionsRuleset(rulesetId) {
  var id = rulesetId == null ? '' : String(rulesetId);
  if (Object.prototype.hasOwnProperty.call(CHAMPIONS_RULESETS, id)) return CHAMPIONS_RULESETS[id];
  for (var key in CHAMPIONS_RULESETS) {
    var row = CHAMPIONS_RULESETS[key];
    if (row && Array.isArray(row.legacyIds) && row.legacyIds.indexOf(id) >= 0) return row;
  }
  return {
    id: id,
    label: 'Unknown ruleset',
    status: 'unknown',
    runtimePromotable: false,
    learningEligibility: 'blocked_unknown_ruleset',
    dataPolicy: 'do_not_write_trusted_stats',
    coachingPolicy: 'review_only_no_matchup_learning',
    blocker: 'A recognized, explicitly selected ruleset is required; unknown IDs are not historical aliases.'
  };
}

function isRulesetRuntimeLegal(rulesetId) {
  var row = getChampionsRuleset(rulesetId);
  return !!(row && row.runtimePromotable && row.status !== CHAMPIONS_RULESET_STATUS.SOURCE_REVIEW);
}

function getRulesetEvidencePolicy(rulesetId) {
  var row = getChampionsRuleset(rulesetId);
  // Catalog compatibility is not approval of a regulation-specific data package.
  var approved = row.runtimePromotable && row.regulationDataApproved === true;
  return {
    ruleset_id: row.id,
    ruleset_label: row.label,
    ruleset_status: row.status,
    runtime_promotable: !!row.runtimePromotable,
    learning_eligibility: approved ? row.learningEligibility : (row.runtimePromotable ? 'blocked_unapproved_regulation_data' : row.learningEligibility),
    data_policy: approved ? row.dataPolicy : 'do_not_write_trusted_stats',
    coaching_policy: approved ? row.coachingPolicy : 'review_only_no_matchup_learning',
    source_checked_at_utc: row.sourceCheckedAtUtc || null,
    poisoning_guard: approved ? 'trusted_stats_allowed' : 'review_only_do_not_train_or_rank',
    blocker: row.blocker || (approved ? null : 'No approved regulation-specific data package.')
  };
}

function getSimulationEvidencePolicy(provenance, games) {
  var p = provenance || {};
  var policy = getRulesetEvidencePolicy(p.ruleset_id);
  var gaps = [];
  var ruleset = getChampionsRuleset(p.ruleset_id);
  if (!ruleset.version || p.ruleset_version !== ruleset.version) gaps.push('ruleset_version');
  if (p.regulation_id !== ruleset.id) gaps.push('regulation_id');
  if (p.stale === true) gaps.push('stale');
  if (Array.isArray(p.source_gaps) && p.source_gaps.length) gaps.push('source_gaps');
  if (p.schema_version !== 'champions-simulation-provenance-v1') gaps.push('schema_version');
  ['engine_version', 'build_id', 'player_team_id', 'opp_team_id', 'policy_model'].forEach(function(key) {
    if (typeof p[key] !== 'string' || !p[key] || p[key] === 'unknown') gaps.push(key);
  });
  ['player_team_digest', 'opp_team_digest'].forEach(function(key) {
    if (!/^[a-f0-9]{64}$/.test(p[key] || '')) gaps.push(key);
  });
  if (['singles', 'doubles'].indexOf(p.format) < 0) gaps.push('format');
  if ([1, 3, 5, 10].indexOf(p.bo) < 0) gaps.push('bo');
  if (!p.selection_policy || !p.selection_policy.player || !p.selection_policy.opponent) gaps.push('selection_policy');
  if (getChampionsRuleset(p.opponent_ruleset_id).id !== policy.ruleset_id || !p.opponent_ruleset_id) gaps.push('opponent_ruleset_id');
  if (Array.isArray(games) && games.some(function(game) {
    var evidence = game && game.provenance;
    return !evidence || evidence.stale === true ||
      (Array.isArray(evidence.source_gaps) && evidence.source_gaps.length > 0) || game.format !== p.format ||
      ['schema_version', 'engine_version', 'build_id', 'ruleset_id', 'opponent_ruleset_id', 'format', 'bo',
        'ruleset_version', 'regulation_id', 'policy_model', 'player_team_id', 'opp_team_id', 'player_team_digest', 'opp_team_digest'].some(function(key) {
        return evidence[key] !== p[key];
      });
  })) gaps.push('game_provenance_mismatch');
  policy.provenance_gaps = gaps;
  if (gaps.length || p.format !== 'doubles') {
    policy.learning_eligibility = gaps.length ? 'blocked_missing_provenance' : 'isolated_singles_regression';
    policy.data_policy = 'do_not_write_trusted_stats';
    policy.coaching_policy = 'review_only_no_matchup_learning';
    policy.poisoning_guard = 'unverified_evidence_do_not_train_or_rank';
  }
  return policy;
}

// Selection is separate from a team's original registration and never rewrites it.
function checkTeamForSelectedRegulation(team, rulesetId, options) {
  var opts = options || {};
  var profile = getChampionsRuleset(rulesetId);
  var practice = profile.id === 'champions_custom_practice';
  var errors = [], gaps = [];
  var result = { regulation_id: profile.id, ruleset_version: profile.version || null,
    status: 'not_verified', allowed: false, competitive_eligible: false, errors: errors, source_gaps: gaps,
    mechanics_status: 'not_verified', scope: 'bundled_regulation_checks_not_official_certification' };
  if (!practice && (!profile.runtimePromotable || profile.id !== 'champions_reg_m_a_2026')) {
    gaps.push(profile.blocker || 'No implemented validator and engine mapping for this regulation.');
    return result;
  }
  if (!practice) gaps.push('Regulation-scoped species, forms and learnsets are not yet approved. The general Showdown mirror is not proof of M-A eligibility.');
  // Reject malformed imports before calling validators that expect set objects.
  if (!team || !Array.isArray(team.members) || team.members.some(function(member) {
    return !member || typeof member !== 'object' || typeof member.name !== 'string' || !member.name.trim() ||
      !Array.isArray(member.moves) || member.moves.some(function(move) { return typeof move !== 'string'; }) ||
      (member.ability != null && typeof member.ability !== 'string') ||
      (member.item != null && typeof member.item !== 'string');
  })) {
    errors.push('Team members must be Pokemon sets with a name and a list of move names.');
    result.status = 'illegal';
    return result;
  }
  if (opts.format && opts.format !== 'doubles') gaps.push('This regulation workflow currently supports doubles only.');
  if (opts.bo != null && [1, 3].indexOf(opts.bo) === -1) gaps.push('Competitive regulation checks support Bo1 or Bo3; other series are not verified.');
  if (!team || !Array.isArray(team.members) || team.members.length < 4 || team.members.length > 6) errors.push('Register four to six Pokemon for doubles.');
  if (!team || team.format !== 'champions') gaps.push('Explicit Champions stat-point format is required.');
  if (typeof validateTeamForRuleset !== 'function' || typeof validateTeam !== 'function') {
    gaps.push('Team validators are unavailable.');
  } else if (team && Array.isArray(team.members)) {
    var base = validateTeamForRuleset(team, 'champions_reg_m_a_2026');
    (base.violations || []).forEach(function(v) { if (v.severity === 'error') errors.push(v.message); });
    var general = validateTeam(team, 'champions') || {};
    errors = errors.concat(general.errors || []); result.errors = errors;
  }
  var api = typeof ChampionsSim !== 'undefined' && ChampionsSim.moveLegality;
  if (!api || !api.validateMovesForSet || !api.validateAbilityForSet) gaps.push('Species-specific move and ability sources are unavailable.');
  var speciesData = typeof ChampionsSim !== 'undefined' && ChampionsSim.pokemonDataAudit && ChampionsSim.pokemonDataAudit.species;
  var seenDexNumbers = new Set();
  if (!speciesData || !api || typeof api.canonicalSpeciesKey !== 'function') gaps.push('Species identity source is unavailable.');
  (team && team.members || []).forEach(function(member) {
    if (!member || !member.name) { errors.push('Pokemon identity is missing.'); return; }
    if (speciesData && api && typeof api.canonicalSpeciesKey === 'function') {
      var speciesRow = speciesData[api.canonicalSpeciesKey(member.name)];
      if (!speciesRow || !Number.isInteger(speciesRow.num) || speciesRow.num <= 0) gaps.push(member.name + ': National Dex identity is not verified.');
      else if (seenDexNumbers.has(speciesRow.num)) errors.push(member.name + ': Species Clause forbids two forms with the same National Dex number.');
      else seenDexNumbers.add(speciesRow.num);
    }
    var natures = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];
    if (natures.indexOf(member.nature) === -1) errors.push(member.name + ': unknown nature.');
    if (member.level != null && member.level !== 50) errors.push(member.name + ': only level 50 is supported.');
    if (member.level == null && !practice) gaps.push(member.name + ': explicit level 50 is missing.');
    if (!member.evs || ['hp','atk','def','spa','spd','spe'].some(function(k) { return !Number.isInteger(member.evs[k]) || member.evs[k] < 0 || member.evs[k] > 32; })) gaps.push(member.name + ': complete integer stat points are required.');
    if (Array.isArray(member.moves) && (member.moves.some(function(m) { return typeof m !== 'string' || !m.trim(); }) || new Set(member.moves.map(function(m) { return String(m).toLowerCase().replace(/[^a-z0-9]/g, ''); })).size !== member.moves.length)) errors.push(member.name + ': moves must be nonblank and distinct.');
    if (!member.ability || !member.nature || !Array.isArray(member.moves) || !member.moves.length) errors.push(member.name + ': ability, nature and moves are required.');
    if (member.item && (typeof CHAMPIONS_LEGAL_ITEMS === 'undefined' || !CHAMPIONS_LEGAL_ITEMS.has(member.item))) errors.push(member.name + ': item is outside the selected historical M-A pool.');
    if (!api || !api.validateMovesForSet || !api.validateAbilityForSet) return;
    var abilityMember = member;
    var mega = typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[member.name];
    if (mega && member.item !== mega.megaStone) errors.push(member.name + ': the matching Mega Stone is required for this registered form.');
    // Existing catalog encodes the Mega display name with its pre-Mega ability.
    // Validate that registration view only when the matching stone is present.
    if (mega && member.item === mega.megaStone && typeof api.isAbilityLegalForSpecies === 'function' && api.isAbilityLegalForSpecies(mega.baseSpecies, member.ability).legal) {
      abilityMember = Object.assign({}, member, { name: mega.baseSpecies });
    }
    var checks = api.validateMovesForSet(member, { learnsetContext: 'champions' }).concat([api.validateAbilityForSet(abilityMember)]).filter(Boolean);
    checks.forEach(function(check) {
      if (check.legal) return;
      var message = member.name + ': ' + (check.moveName || check.abilityName || '') + ' - ' + (check.notes || check.reason);
      if (check.verification_status === 'unchecked' || ['source_unavailable', 'learnset_context_unavailable', 'champions_pool_unavailable', 'unknown_species', 'unknown_move', 'unknown_ability'].indexOf(check.reason) !== -1) gaps.push(message);
      else errors.push(message);
    });
  });
  if (opts.bring) {
    var names = (team && team.members || []).map(function(m) { return m && m.name; });
    if (!Array.isArray(opts.bring) || opts.bring.length !== 4 || new Set(opts.bring).size !== 4 ||
        opts.bring.some(function(name) { return names.filter(function(n) { return n === name; }).length !== 1; })) errors.push('Select four distinct registered Pokemon.');
  }
  result.errors = Array.from(new Set(errors)); result.source_gaps = Array.from(new Set(gaps));
  result.status = errors.length ? 'illegal' : (gaps.length ? 'not_verified' : 'legal');
  result.allowed = practice && !errors.length && !gaps.length;
  if (result.allowed) result.status = 'experimental';
  result.competitive_eligible = false;
  result.level_policy = practice ? 'explicit_50_or_captured_practice_default_50' : 'explicit_50_required';
  return result;
}

function getRegulationChoices(kind, speciesName, rulesetId, showUnavailable) {
  var profile = getChampionsRuleset(rulesetId);
  var sim = typeof ChampionsSim !== 'undefined' ? ChampionsSim : {};
  var data = sim.pokemonDataAudit, api = sim.moveLegality;
  if (!data || !data.species || !api || typeof api.canonicalSpeciesKey !== 'function') return [];
  var speciesKey = api.canonicalSpeciesKey(speciesName || '');
  var movePool = kind === 'move' && typeof api.resolveLearnsetPool === 'function'
    ? api.resolveLearnsetPool(speciesName, { learnsetContext: 'champions' }) : null;
  var names = [], allowedAbilities = [];
  if (kind === 'species') names = Object.keys(data.species || {});
  if (kind === 'item') names = Object.keys(data.items || {}).map(function(k) { return data.items[k].name || k; });
  if (kind === 'move') names = showUnavailable ? Object.keys(data.moves || {}).map(function(k) { return data.moves[k].name || k; }) : api.legalMoveDisplayNamesForSpecies(speciesName, { learnsetContext: 'champions' });
  if (kind === 'ability') {
    allowedAbilities = Object.values((data.species[speciesKey] || {}).abilities || {});
    var mega = typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[speciesName];
    if (mega) allowedAbilities = allowedAbilities.concat(Object.values((data.species[api.canonicalSpeciesKey(mega.baseSpecies)] || {}).abilities || {}));
    names = showUnavailable ? Object.keys(data.abilities || {}).map(function(k) { return data.abilities[k].name || k; }) : allowedAbilities;
  }
  return Array.from(new Set(names)).sort().map(function(name) {
    var status = 'not_verified';
    if (profile.id === 'champions_custom_practice') {
      var allowed = true;
      if (kind === 'item') allowed = typeof CHAMPIONS_LEGAL_ITEMS !== 'undefined' && CHAMPIONS_LEGAL_ITEMS.has(name);
      if (kind === 'move') allowed = api.isMoveLegalForSpecies(speciesName, name, { learnsetContext: 'champions' }).legal && !(typeof CHAMPIONS_BANNED_MECHANIC_MOVES !== 'undefined' && CHAMPIONS_BANNED_MECHANIC_MOVES.has(name));
      if (kind === 'ability') allowed = allowedAbilities.indexOf(name) !== -1 && !(typeof CHAMPIONS_BANNED_MECHANIC_ABILITIES !== 'undefined' && CHAMPIONS_BANNED_MECHANIC_ABILITIES.has(name));
      if (kind === 'species') allowed = typeof validateChampionsLegality === 'function' && !(validateChampionsLegality({ members: [{ name: name, moves: [] }] }).violations || []).some(function(v) { return v.severity === 'error'; });
      status = allowed ? 'reference_only' : 'unavailable';
    }
    return { name: name, status: status, regulation_id: profile.id, ruleset_version: profile.version || null,
      source_version: kind === 'move' ? (movePool && movePool.status === 'known' ? movePool.sourceVersion : null) : (data.sourceCommitOrVersion || null),
      source: kind === 'move' ? (movePool && movePool.status === 'known' ? movePool.source : 'unavailable') : (data.source || null) };
  }).filter(function(row) { return showUnavailable || row.status === 'reference_only'; });
}

if (typeof window !== 'undefined') {
  window.CHAMPIONS_RULESET_STATUS = CHAMPIONS_RULESET_STATUS;
  window.CHAMPIONS_RULESETS = CHAMPIONS_RULESETS;
  window.getChampionsRuleset = getChampionsRuleset;
  window.isRulesetRuntimeLegal = isRulesetRuntimeLegal;
  window.getRulesetEvidencePolicy = getRulesetEvidencePolicy;
  window.getSimulationEvidencePolicy = getSimulationEvidencePolicy;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAMPIONS_RULESET_STATUS: CHAMPIONS_RULESET_STATUS,
    CHAMPIONS_RULESETS: CHAMPIONS_RULESETS,
    getChampionsRuleset: getChampionsRuleset,
    isRulesetRuntimeLegal: isRulesetRuntimeLegal,
    getRulesetEvidencePolicy: getRulesetEvidencePolicy,
    getSimulationEvidencePolicy: getSimulationEvidencePolicy,
    checkTeamForSelectedRegulation: checkTeamForSelectedRegulation,
    getRegulationChoices: getRegulationChoices
  };
}
