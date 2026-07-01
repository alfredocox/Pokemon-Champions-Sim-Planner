// ============================================================
// TEAM LAB FOUNDATION
// ============================================================
// Evidence-bound team ranking helpers. This module intentionally does not
// invent Pokemon Champions legality. Unknown source data returns
// needs_verification so rankings can stay auditable and stale-safe.
(function(root) {
  'use strict';

  /** @typedef {'singles'|'doubles'} TeamLabFormat */
  /** @typedef {'private'|'hidden_details'|'public'} TeamLabVisibility */
  /** @typedef {'user_custom'|'official_event'|'community_meta'|'engine_generated'|'dev_seed'} TeamLabSourceType */
  /** @typedef {'verified'|'needs_verification'|'illegal'|'stale'} TeamLabLegalityStatus */
  /** @typedef {'low'|'medium'|'high'|'experimental'} TeamLabConfidence */
  /** @typedef {'official_sim_top_25'|'community_candidate'|'personal'|'experimental'|'stale'} TeamLabRankingScope */
  /** @typedef {'official_ready'|'community_safe'|'personal_only'|'experimental'|'blocked'} TeamLabEvidenceQuality */
  /** @typedef {'mark_stale'|'delete_dev_seed'} TeamLabAdminResetMode */
  /** @typedef {'error'|'warning'|'needs_source'} LegalityIssueSeverity */
  /**
   * @typedef {Object} LegalityIssue
   * @property {string} code
   * @property {LegalityIssueSeverity} severity
   * @property {string} message
   * @property {string=} pointer
   * @property {number=} affected_slot
   */
  /**
   * @typedef {Object} LegalityReport
   * @property {TeamLabLegalityStatus} status
   * @property {string} regulation_id
   * @property {string} ruleset_version
   * @property {LegalityIssue[]} errors
   * @property {LegalityIssue[]} warnings
   * @property {LegalityIssue[]} source_gaps
   */
  /**
   * @typedef {Object} TeamMember
   * @property {string=} id
   * @property {string=} team_id
   * @property {number} slot
   * @property {string} pokemon_id
   * @property {string=} form_id
   * @property {string=} item_id
   * @property {string=} ability_id
   * @property {string[]} moves
   * @property {string=} nature
   * @property {Object=} evs
   * @property {Object=} ivs
   * @property {number=} level
   * @property {boolean=} is_hidden_publicly
   */
  /**
   * @typedef {Object} Team
   * @property {string=} id
   * @property {string=} owner_user_id
   * @property {string} name
   * @property {TeamLabFormat} format
   * @property {string} regulation_id
   * @property {TeamLabVisibility} visibility
   * @property {TeamLabSourceType} source_type
   * @property {string[]=} archetype_tags
   * @property {TeamLabLegalityStatus=} legality_status
   * @property {LegalityReport=} legality_report
   * @property {TeamMember[]=} members
   */
  /**
   * @typedef {Object} SimRun
   * @property {string} id
   * @property {string} team_a_id
   * @property {string} team_b_id
   * @property {string} regulation_id
   * @property {TeamLabFormat} format
   * @property {string} engine_version
   * @property {string} ruleset_version
   * @property {string} seed
   * @property {string=} winner_team_id
   * @property {'ko'|'timer'|'forfeit'|'draw'|'error'} result_reason
   * @property {number=} turns
   * @property {string[]=} confidence_flags
   */
  /**
   * @typedef {Object} LeaderboardEntry
   * @property {string=} id
   * @property {string} team_id
   * @property {string} leaderboard_scope
   * @property {string} regulation_id
   * @property {TeamLabFormat} format
   * @property {string} engine_version
   * @property {string} ruleset_version
   * @property {number} rating
   * @property {number} raw_win_rate
   * @property {number} adjusted_win_rate
   * @property {number} games_played
   * @property {number} wins
   * @property {number} losses
   * @property {number} draws
   * @property {TeamLabConfidence} confidence
   * @property {number=} rank
   * @property {boolean} stale
   * @property {string=} stale_reason
   */
  /**
   * @typedef {Object} TeamMatchup
   * @property {string=} id
   * @property {string} team_id
   * @property {string=} opponent_team_id
   * @property {string=} opponent_archetype
   * @property {string} regulation_id
   * @property {TeamLabFormat} format
   * @property {string} engine_version
   * @property {string} ruleset_version
   * @property {number} games_played
   * @property {number} wins
   * @property {number} losses
   * @property {number} draws
   * @property {number} win_rate
   * @property {number=} rating_delta
   * @property {TeamLabConfidence} confidence
   */

  var DEFAULT_MIN_SAMPLE_SIZE = 30;
  var VALID_FORMATS = ['singles', 'doubles'];
  var VALID_VISIBILITY = ['private', 'hidden_details', 'public'];
  var VALID_LEGALITY = ['verified', 'needs_verification', 'illegal', 'stale'];
  var VALID_CONFIDENCE = ['low', 'medium', 'high', 'experimental'];

  function unique(values) {
    var out = [];
    (values || []).forEach(function(value) {
      if (value == null || value === '') return;
      if (out.indexOf(value) === -1) out.push(value);
    });
    return out;
  }

  function issue(code, severity, message, pointer, affectedSlot) {
    var row = { code: code, severity: severity, message: message };
    if (pointer) row.pointer = pointer;
    if (affectedSlot != null) row.affected_slot = affectedSlot;
    return row;
  }

  function hasList(regulation, key) {
    return !!(regulation && Array.isArray(regulation[key]));
  }

  function includesIfKnown(regulation, key, value) {
    if (value == null || value === '') return true;
    if (!hasList(regulation, key)) return null;
    return regulation[key].indexOf(value) !== -1;
  }

  function validateTeamForRegulation(team, regulation) {
    var errors = [];
    var warnings = [];
    var sourceGaps = [];
    var regulationId = (regulation && regulation.regulation_id) || (team && team.regulation_id) || 'unknown';
    var rulesetVersion = (regulation && regulation.ruleset_version) || 'unknown';

    if (!team || typeof team !== 'object') {
      errors.push(issue('TEAM_MISSING', 'error', 'Team payload is missing.'));
      return { status: 'illegal', regulation_id: regulationId, ruleset_version: rulesetVersion, errors: errors, warnings: warnings, source_gaps: sourceGaps };
    }

    if (VALID_FORMATS.indexOf(team.format) === -1) errors.push(issue('FORMAT_INVALID', 'error', 'Team format must be singles or doubles.'));
    if (VALID_VISIBILITY.indexOf(team.visibility) === -1) errors.push(issue('VISIBILITY_INVALID', 'error', 'Team visibility is invalid.'));
    if (!Array.isArray(team.members) || team.members.length === 0) errors.push(issue('TEAM_MEMBERS_MISSING', 'error', 'Team must include at least one Pokemon member.'));
    if (team.members && team.members.length > 6) errors.push(issue('TEAM_TOO_LARGE', 'error', 'Team cannot contain more than six Pokemon.'));

    if (!regulation || typeof regulation !== 'object') {
      sourceGaps.push(issue('REGULATION_SOURCE_MISSING', 'needs_source', 'No Champion regulation source data is available; legality cannot be verified.', 'regulation'));
    } else {
      if (regulation.verification_status !== 'verified') {
        sourceGaps.push(issue('REGULATION_NOT_VERIFIED', 'needs_source', 'Regulation source is not marked verified; legality remains provisional.', regulation.source_pointer || 'regulation'));
      }
      if (regulation.regulation_id && team.regulation_id && regulation.regulation_id !== team.regulation_id) {
        errors.push(issue('REGULATION_MISMATCH', 'error', 'Team regulation_id does not match the selected regulation.', regulation.source_pointer || 'regulation'));
      }
      ['legal_pokemon_ids', 'legal_form_ids', 'legal_move_ids', 'legal_item_ids', 'legal_ability_ids'].forEach(function(key) {
        if (!hasList(regulation, key)) {
          sourceGaps.push(issue('SOURCE_GAP_' + key.toUpperCase(), 'needs_source', 'Missing verified Champion source list: ' + key + '.', regulation.source_pointer || 'regulation'));
        }
      });
    }

    var speciesSeen = {};
    var itemSeen = {};
    (team.members || []).forEach(function(member, index) {
      var slot = member && member.slot != null ? member.slot : index + 1;
      if (!member || typeof member !== 'object') {
        errors.push(issue('MEMBER_INVALID', 'error', 'Team member payload is invalid.', null, slot));
        return;
      }
      if (!member.pokemon_id) errors.push(issue('POKEMON_MISSING', 'error', 'Pokemon id is required.', null, slot));
      if (!Array.isArray(member.moves) || member.moves.length === 0) errors.push(issue('MOVES_MISSING', 'error', 'At least one move is required.', null, slot));
      if (Array.isArray(member.moves) && member.moves.length > 4) errors.push(issue('TOO_MANY_MOVES', 'error', 'A Pokemon cannot have more than four moves.', null, slot));
      if (member.level != null && (member.level < 1 || member.level > 100)) errors.push(issue('LEVEL_INVALID', 'error', 'Pokemon level must be between 1 and 100.', null, slot));

      if (member.pokemon_id) {
        if (speciesSeen[member.pokemon_id]) warnings.push(issue('DUPLICATE_SPECIES', 'warning', 'Duplicate species detected; clause legality depends on regulation source.', null, slot));
        speciesSeen[member.pokemon_id] = true;
      }
      if (member.item_id) {
        if (itemSeen[member.item_id]) warnings.push(issue('DUPLICATE_ITEM', 'warning', 'Duplicate held item detected; clause legality depends on regulation source.', null, slot));
        itemSeen[member.item_id] = true;
      }

      var pokemonOk = includesIfKnown(regulation, 'legal_pokemon_ids', member.pokemon_id);
      if (pokemonOk === false) errors.push(issue('POKEMON_ILLEGAL', 'error', 'Pokemon is not legal for this regulation.', regulation && regulation.source_pointer, slot));
      var formOk = includesIfKnown(regulation, 'legal_form_ids', member.form_id);
      if (formOk === false) errors.push(issue('FORM_ILLEGAL', 'error', 'Pokemon form is not legal for this regulation.', regulation && regulation.source_pointer, slot));
      var itemOk = includesIfKnown(regulation, 'legal_item_ids', member.item_id);
      if (itemOk === false) errors.push(issue('ITEM_ILLEGAL', 'error', 'Held item is not legal for this regulation.', regulation && regulation.source_pointer, slot));
      var abilityOk = includesIfKnown(regulation, 'legal_ability_ids', member.ability_id);
      if (abilityOk === false) errors.push(issue('ABILITY_ILLEGAL', 'error', 'Ability is not legal for this regulation.', regulation && regulation.source_pointer, slot));
      (member.moves || []).forEach(function(moveId) {
        var moveOk = includesIfKnown(regulation, 'legal_move_ids', moveId);
        if (moveOk === false) errors.push(issue('MOVE_ILLEGAL', 'error', 'Move is not legal for this regulation: ' + moveId + '.', regulation && regulation.source_pointer, slot));
      });
    });

    var status = 'verified';
    if (errors.length) status = 'illegal';
    else if (sourceGaps.length) status = 'needs_verification';
    return { status: status, regulation_id: regulationId, ruleset_version: rulesetVersion, errors: errors, warnings: warnings, source_gaps: sourceGaps };
  }

  function rawWinRate(wins, losses, draws) {
    var w = Number(wins || 0);
    var l = Number(losses || 0);
    var d = Number(draws || 0);
    var games = w + l + d;
    if (!games) return 0;
    return (w + d * 0.5) / games;
  }

  function adjustedWinRate(wins, losses, draws, prior, priorGames) {
    var w = Number(wins || 0);
    var l = Number(losses || 0);
    var d = Number(draws || 0);
    var p = prior == null ? 0.5 : Number(prior);
    var pg = priorGames == null ? DEFAULT_MIN_SAMPLE_SIZE : Number(priorGames);
    var games = w + l + d;
    return (w + d * 0.5 + p * pg) / (games + pg || 1);
  }

  function confidenceForSample(gamesPlayed, legalityStatus) {
    if (legalityStatus === 'needs_verification' || legalityStatus === 'illegal' || legalityStatus === 'stale') return 'experimental';
    var games = Number(gamesPlayed || 0);
    if (games >= 200) return 'high';
    if (games >= 60) return 'medium';
    return 'low';
  }

  function ratingFromAdjusted(adjustedRate, gamesPlayed, confidence) {
    var confidenceBonus = confidence === 'high' ? 120 : confidence === 'medium' ? 60 : confidence === 'experimental' ? -75 : 0;
    var sampleBonus = Math.min(80, Math.log(Math.max(1, Number(gamesPlayed || 0))) * 18);
    return Math.round(1000 + (Number(adjustedRate || 0) - 0.5) * 900 + sampleBonus + confidenceBonus);
  }

  function teamSourceGaps(team) {
    var gaps = [];
    if (!team) return gaps;
    if (Array.isArray(team.source_gaps)) gaps = gaps.concat(team.source_gaps);
    if (team.legality_report && Array.isArray(team.legality_report.source_gaps)) {
      gaps = gaps.concat(team.legality_report.source_gaps.map(function(gap) { return gap.code || gap.message || 'SOURCE_GAP'; }));
    }
    return unique(gaps);
  }

  function evidenceQualityForRanking(input) {
    var row = input || {};
    var legality = row.legality_status || 'needs_verification';
    var games = Number(row.games_played || 0);
    var sourceGaps = row.source_gaps || [];
    if (legality === 'illegal') return 'blocked';
    if (row.stale) return 'blocked';
    if (legality === 'stale') return 'blocked';
    if (legality === 'needs_verification' || sourceGaps.length) return 'experimental';
    if (row.visibility === 'private') return 'personal_only';
    if (games < Number(row.min_sample_size || DEFAULT_MIN_SAMPLE_SIZE)) return 'community_safe';
    if (row.approved_benchmark_pool && row.current_versions) return 'official_ready';
    return 'community_safe';
  }

  function scopeForEvidenceQuality(quality, requestedScope) {
    if (quality === 'official_ready') return requestedScope === 'personal' ? 'personal' : 'official_sim_top_25';
    if (quality === 'personal_only') return 'personal';
    if (quality === 'experimental') return 'experimental';
    if (quality === 'blocked') return 'stale';
    return requestedScope === 'personal' ? 'personal' : 'community_candidate';
  }

  function rankingScore(parts) {
    var p = parts || {};
    var adjusted = Number(p.adjusted_win_rate || 0.5);
    var opponent = Number(p.opponent_strength_delta || 0);
    var coverage = Number(p.matchup_coverage_bonus || 0);
    var confidence = p.confidence === 'high' ? 0.035 : p.confidence === 'medium' ? 0.018 : p.confidence === 'experimental' ? -0.05 : 0;
    var stale = p.stale ? 0.12 : 0;
    var sourceGapPenalty = Math.min(0.12, Number((p.source_gaps || []).length) * 0.025);
    var volatilityPenalty = Number(p.volatility_penalty || 0);
    var score = adjusted + opponent + coverage + confidence - stale - sourceGapPenalty - volatilityPenalty;
    return Number(Math.max(0, Math.min(1, score)).toFixed(4));
  }

  function ratingFromRankingScore(score, gamesPlayed, quality) {
    var qualityBonus = quality === 'official_ready' ? 80 : quality === 'community_safe' ? 25 : quality === 'experimental' ? -90 : quality === 'blocked' ? -180 : 0;
    var sampleBonus = Math.min(70, Math.log(Math.max(1, Number(gamesPlayed || 0))) * 15);
    return Math.round(1000 + (Number(score || 0) - 0.5) * 1000 + sampleBonus + qualityBonus);
  }

  function isEntryCurrent(entry, current) {
    if (!entry) return false;
    if (entry.stale) return false;
    if (current && current.engine_version && entry.engine_version !== current.engine_version) return false;
    if (current && current.ruleset_version && entry.ruleset_version !== current.ruleset_version) return false;
    return true;
  }

  function markLeaderboardEntriesStale(entries, reason, engineVersion, rulesetVersion, teamId) {
    return (entries || []).map(function(entry) {
      var versionHit = (engineVersion && entry.engine_version === engineVersion) || (rulesetVersion && entry.ruleset_version === rulesetVersion);
      var teamHit = teamId && entry.team_id === teamId;
      var globalHit = !engineVersion && !rulesetVersion && !teamId;
      if (versionHit || teamHit || globalHit) {
        var copy = Object.assign({}, entry);
        copy.stale = true;
        copy.stale_reason = reason || 'rules_or_engine_changed';
        return copy;
      }
      return entry;
    });
  }

  function resetLeaderboardRankings(entries, params, actor) {
    var input = params || {};
    var reason = String(input.reason || '').trim();
    var admin = actor || {};
    if (!admin.is_admin) {
      return { ok: false, error: 'ADMIN_REQUIRED', message: 'Team Lab ranking reset requires trusted admin authorization.', entries: entries || [], audit: null };
    }
    if (reason.length < 8) {
      return { ok: false, error: 'REASON_REQUIRED', message: 'Team Lab ranking reset requires an audit reason of at least 8 characters.', entries: entries || [], audit: null };
    }

    var mode = input.mode || 'mark_stale';
    var changed = 0;
    var next = (entries || []).filter(function(entry) {
      if (!entry) return false;
      var match = true;
      if (input.regulation_id && entry.regulation_id !== input.regulation_id) match = false;
      if (input.format && entry.format !== input.format) match = false;
      if (input.leaderboard_scope && entry.leaderboard_scope !== input.leaderboard_scope) match = false;
      if (input.engine_version && entry.engine_version !== input.engine_version) match = false;
      if (input.ruleset_version && entry.ruleset_version !== input.ruleset_version) match = false;
      if (input.team_id && entry.team_id !== input.team_id) match = false;
      if (!match) return true;
      changed += 1;
      if (mode === 'delete_dev_seed' && entry.source_type === 'dev_seed') return false;
      entry.stale = true;
      entry.stale_reason = reason;
      return true;
    }).map(function(entry) { return Object.assign({}, entry); });

    return {
      ok: true,
      entries: next,
      changed_count: changed,
      audit: {
        action: 'team_lab_ranking_reset',
        mode: mode,
        reason: reason,
        actor_user_id: admin.user_id || null,
        regulation_id: input.regulation_id || null,
        format: input.format || null,
        leaderboard_scope: input.leaderboard_scope || null,
        engine_version: input.engine_version || null,
        ruleset_version: input.ruleset_version || null,
        team_id: input.team_id || null,
        changed_count: changed,
        created_at: input.created_at || new Date().toISOString()
      }
    };
  }

  function buildLeaderboardEntries(teams, simRuns, options) {
    var opts = options || {};
    var minSampleSize = opts.min_sample_size == null ? DEFAULT_MIN_SAMPLE_SIZE : Number(opts.min_sample_size);
    var current = { engine_version: opts.engine_version || 'unknown', ruleset_version: opts.ruleset_version || 'unknown' };
    var teamById = {};
    (teams || []).forEach(function(team) { if (team && team.id) teamById[team.id] = team; });

    var stats = {};
    function ensure(teamId) {
      if (!stats[teamId]) stats[teamId] = { wins: 0, losses: 0, draws: 0, opponents: {}, opponent_archetypes: {} };
      return stats[teamId];
    }

    (simRuns || []).forEach(function(run) {
      if (!run || run.result_reason === 'error') return;
      if (opts.regulation_id && run.regulation_id !== opts.regulation_id) return;
      if (opts.format && run.format !== opts.format) return;
      if (current.engine_version !== 'unknown' && run.engine_version !== current.engine_version) return;
      if (current.ruleset_version !== 'unknown' && run.ruleset_version !== current.ruleset_version) return;
      var a = teamById[run.team_a_id];
      var b = teamById[run.team_b_id];
      if (!a || !b) return;
      if (a.legality_status === 'illegal' || b.legality_status === 'illegal') return;
      var as = ensure(run.team_a_id);
      var bs = ensure(run.team_b_id);
      as.opponents[run.team_b_id] = true;
      bs.opponents[run.team_a_id] = true;
      (b.archetype_tags || []).forEach(function(tag) { as.opponent_archetypes[tag] = true; });
      (a.archetype_tags || []).forEach(function(tag) { bs.opponent_archetypes[tag] = true; });
      if (!run.winner_team_id || run.result_reason === 'draw') {
        as.draws += 1;
        bs.draws += 1;
      } else if (run.winner_team_id === run.team_a_id) {
        as.wins += 1;
        bs.losses += 1;
      } else if (run.winner_team_id === run.team_b_id) {
        bs.wins += 1;
        as.losses += 1;
      }
    });

    var entries = [];
    Object.keys(stats).forEach(function(teamId) {
      var team = teamById[teamId];
      if (!team || team.legality_status === 'illegal') return;
      if (opts.visibility && team.visibility !== opts.visibility) return;
      if (opts.legality_status && team.legality_status !== opts.legality_status) return;
      var row = stats[teamId];
      var games = row.wins + row.losses + row.draws;
      var legality = team.legality_status || 'needs_verification';
      var confidence = confidenceForSample(games, legality);
      if (legality === 'verified' && games < minSampleSize) return;
      var raw = rawWinRate(row.wins, row.losses, row.draws);
      var adjusted = adjustedWinRate(row.wins, row.losses, row.draws, opts.prior_win_rate, opts.prior_games);
      var sourceGaps = teamSourceGaps(team);
      var uniqueOpponents = Object.keys(row.opponents || {}).length;
      var uniqueArchetypes = Object.keys(row.opponent_archetypes || {}).length;
      var coverageBonus = Math.min(0.055, uniqueOpponents * 0.006 + uniqueArchetypes * 0.008);
      var volatilityPenalty = games < minSampleSize ? Math.min(0.08, (minSampleSize - games) / Math.max(1, minSampleSize) * 0.08) : 0;
      var quality = evidenceQualityForRanking({
        legality_status: legality,
        visibility: team.visibility,
        games_played: games,
        min_sample_size: minSampleSize,
        source_gaps: sourceGaps,
        stale: false,
        approved_benchmark_pool: !!opts.approved_benchmark_pool,
        current_versions: current.engine_version !== 'unknown' && current.ruleset_version !== 'unknown'
      });
      var scope = scopeForEvidenceQuality(quality, opts.leaderboard_scope);
      var entry = {
        team_id: teamId,
        team_name: team.name,
        leaderboard_scope: scope,
        regulation_id: opts.regulation_id || team.regulation_id,
        format: opts.format || team.format,
        engine_version: current.engine_version,
        ruleset_version: current.ruleset_version,
        rating: ratingFromAdjusted(adjusted, games, confidence),
        raw_win_rate: Number(raw.toFixed(4)),
        adjusted_win_rate: Number(adjusted.toFixed(4)),
        ranking_score: 0,
        games_played: games,
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
        confidence: confidence,
        stale: false,
        stale_reason: null,
        legality_status: legality,
        visibility: team.visibility,
        archetype_tags: (team.archetype_tags || []).slice(),
        source_gaps: sourceGaps,
        evidence_quality: quality,
        matchup_coverage: {
          unique_opponents: uniqueOpponents,
          unique_archetypes: uniqueArchetypes,
          bonus: Number(coverageBonus.toFixed(4))
        },
        opponent_strength_delta: 0,
        volatility_penalty: Number(volatilityPenalty.toFixed(4))
      };
      entries.push(entry);
    });

    var adjustedByTeam = {};
    entries.forEach(function(entry) { adjustedByTeam[entry.team_id] = entry.adjusted_win_rate; });
    entries.forEach(function(entry) {
      var row = stats[entry.team_id] || {};
      var opponentIds = Object.keys(row.opponents || {});
      var opponentStrength = 0;
      if (opponentIds.length) {
        opponentStrength = opponentIds.reduce(function(sum, id) {
          return sum + ((adjustedByTeam[id] == null ? 0.5 : adjustedByTeam[id]) - 0.5);
        }, 0) / opponentIds.length;
      }
      opponentStrength = Math.max(-0.04, Math.min(0.04, opponentStrength * 0.35));
      entry.opponent_strength_delta = Number(opponentStrength.toFixed(4));
      entry.ranking_score = rankingScore({
        adjusted_win_rate: entry.adjusted_win_rate,
        opponent_strength_delta: entry.opponent_strength_delta,
        matchup_coverage_bonus: entry.matchup_coverage.bonus,
        confidence: entry.confidence,
        stale: entry.stale,
        source_gaps: entry.source_gaps,
        volatility_penalty: entry.volatility_penalty
      });
      entry.rating = ratingFromRankingScore(entry.ranking_score, entry.games_played, entry.evidence_quality);
    });

    entries.sort(function(a, b) {
      if (b.ranking_score !== a.ranking_score) return b.ranking_score - a.ranking_score;
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.adjusted_win_rate !== a.adjusted_win_rate) return b.adjusted_win_rate - a.adjusted_win_rate;
      return b.games_played - a.games_played;
    });
    entries.forEach(function(entry, index) { entry.rank = index + 1; });
    return entries;
  }

  function filterLeaderboard(entries, filters) {
    var f = filters || {};
    return (entries || []).filter(function(entry) {
      if (f.regulation_id && entry.regulation_id !== f.regulation_id) return false;
      if (f.format && entry.format !== f.format) return false;
      if (f.leaderboard_scope && entry.leaderboard_scope !== f.leaderboard_scope) return false;
      if (f.confidence && entry.confidence !== f.confidence) return false;
      if (f.legality_status && entry.legality_status !== f.legality_status) return false;
      if (f.engine_version && entry.engine_version !== f.engine_version) return false;
      if (f.ruleset_version && entry.ruleset_version !== f.ruleset_version) return false;
      if (f.visibility && entry.visibility !== f.visibility) return false;
      if (f.evidence_quality && entry.evidence_quality !== f.evidence_quality) return false;
      if (f.stale === true && !entry.stale) return false;
      if (f.stale === false && entry.stale) return false;
      return true;
    });
  }

  function redactMember(member) {
    var copy = Object.assign({}, member || {});
    delete copy.item_id;
    delete copy.ability_id;
    delete copy.moves;
    delete copy.nature;
    delete copy.evs;
    delete copy.ivs;
    copy.hidden_details_redacted = true;
    return copy;
  }

  function applyTeamVisibility(team, viewerUserId) {
    if (!team) return null;
    var owner = team.owner_user_id || null;
    var isOwner = !!(owner && viewerUserId && owner === viewerUserId);
    if (team.visibility === 'private' && !isOwner) return null;
    var copy = Object.assign({}, team);
    if (Array.isArray(team.members)) {
      copy.members = team.members.map(function(member) {
        if (team.visibility === 'hidden_details' && !isOwner && member && member.is_hidden_publicly) return redactMember(member);
        return Object.assign({}, member);
      });
    }
    copy.viewer_is_owner = isOwner;
    return copy;
  }

  function compareTeamToLeaderboard(teamId, entries, matchups, filters) {
    var f = filters || {};
    var topN = f.top_n == null ? 10 : Number(f.top_n);
    var filtered = filterLeaderboard(entries || [], f).slice(0, topN);
    var rows = (matchups || []).filter(function(row) {
      if (row.team_id !== teamId) return false;
      if (f.regulation_id && row.regulation_id !== f.regulation_id) return false;
      if (f.format && row.format !== f.format) return false;
      return true;
    });
    var best = rows.slice().sort(function(a, b) { return b.win_rate - a.win_rate; }).slice(0, 3);
    var worst = rows.slice().sort(function(a, b) { return a.win_rate - b.win_rate; }).slice(0, 3);
    var staleWarnings = unique(filtered.concat(rows).filter(function(row) { return row.stale; }).map(function(row) { return row.stale_reason || 'stale result'; }));
    var sourceGaps = unique(filtered.concat(rows).reduce(function(acc, row) { return acc.concat(row.source_gaps || row.confidence_flags || []); }, []));
    return {
      label: 'Simulator-derived evidence, not real ladder truth.',
      team_id: teamId,
      compared_against: filtered,
      matchup_rows: rows,
      best_matchups: best,
      worst_matchups: worst,
      stale_warnings: staleWarnings,
      unresolved_source_gaps: sourceGaps
    };
  }

  function resolveTeamKeyMapping(sourceTeamKey, mappings, filters) {
    var f = filters || {};
    var rows = (mappings || []).filter(function(row) {
      if (!row || row.source_team_key !== sourceTeamKey) return false;
      if (f.source_system && row.source_system !== f.source_system) return false;
      if (f.regulation_id && row.regulation_id !== f.regulation_id) return false;
      if (f.format && row.format && row.format !== f.format) return false;
      return true;
    }).sort(function(a, b) {
      var rank = { verified: 4, pending: 3, stale: 2, rejected: 1 };
      var ar = rank[a.mapping_status] || 0;
      var br = rank[b.mapping_status] || 0;
      if (br !== ar) return br - ar;
      return String(b.updated_at || b.verified_at || '').localeCompare(String(a.updated_at || a.verified_at || ''));
    });
    var best = rows[0] || null;
    if (!best) {
      return {
        ok: false,
        status: 'missing',
        team_lab_team_id: null,
        mapping: null,
        source_gap: 'TEAM_KEY_MAPPING_MISSING'
      };
    }
    if (best.mapping_status !== 'verified' || !best.team_id) {
      return {
        ok: false,
        status: best.mapping_status || 'pending',
        team_lab_team_id: best.team_id || null,
        mapping: best,
        source_gap: 'TEAM_KEY_MAPPING_' + String(best.mapping_status || 'pending').toUpperCase()
      };
    }
    return {
      ok: true,
      status: 'verified',
      team_lab_team_id: best.team_id,
      mapping: best,
      source_gap: null
    };
  }

  function defaultPromotionRule(input) {
    var opts = input || {};
    return {
      regulation_id: opts.regulation_id || null,
      format: opts.format || null,
      leaderboard_scope: opts.leaderboard_scope || 'official_sim_top_25',
      min_sample_size: opts.min_sample_size == null ? 200 : Number(opts.min_sample_size),
      require_verified_legality: opts.require_verified_legality !== false,
      require_current_engine: opts.require_current_engine !== false,
      require_current_ruleset: opts.require_current_ruleset !== false,
      require_verified_team_mapping: opts.require_verified_team_mapping !== false,
      require_approved_benchmark_pool: opts.require_approved_benchmark_pool !== false,
      allowed_evidence_qualities: Array.isArray(opts.allowed_evidence_qualities) ? opts.allowed_evidence_qualities : ['official_ready']
    };
  }

  function evaluateLeaderboardPromotion(entry, context) {
    var row = entry || {};
    var ctx = context || {};
    var rule = defaultPromotionRule(ctx.rule || ctx);
    var mapping = ctx.mapping || null;
    var reasons = [];
    var sourceGaps = unique((row.source_gaps || []).concat(ctx.source_gaps || []));

    if (row.stale) reasons.push('STALE_ENTRY');
    if (rule.regulation_id && row.regulation_id !== rule.regulation_id) reasons.push('REGULATION_MISMATCH');
    if (rule.format && row.format !== rule.format) reasons.push('FORMAT_MISMATCH');
    if (rule.require_current_engine && ctx.current_engine_version && row.engine_version !== ctx.current_engine_version) reasons.push('ENGINE_VERSION_STALE');
    if (rule.require_current_ruleset && ctx.current_ruleset_version && row.ruleset_version !== ctx.current_ruleset_version) reasons.push('RULESET_VERSION_STALE');
    if (rule.require_verified_legality && row.legality_status !== 'verified') reasons.push('LEGALITY_NOT_VERIFIED');
    if (Number(row.games_played || 0) < Number(rule.min_sample_size || DEFAULT_MIN_SAMPLE_SIZE)) reasons.push('INSUFFICIENT_SAMPLE_SIZE');
    if (rule.require_approved_benchmark_pool && !ctx.approved_benchmark_pool) reasons.push('BENCHMARK_POOL_NOT_APPROVED');
    if (rule.allowed_evidence_qualities.indexOf(row.evidence_quality || '') === -1) reasons.push('EVIDENCE_QUALITY_NOT_ALLOWED');
    if (rule.require_verified_team_mapping) {
      if (!mapping || mapping.status !== 'verified' || !mapping.team_lab_team_id) {
        reasons.push(mapping && mapping.source_gap ? mapping.source_gap : 'TEAM_KEY_MAPPING_MISSING');
      }
    }
    if (sourceGaps.length) reasons.push('UNRESOLVED_SOURCE_GAPS');

    var decision = 'approved';
    if (row.stale || row.legality_status === 'stale') decision = 'stale';
    else if (row.legality_status === 'needs_verification' || sourceGaps.length || (mapping && mapping.status && mapping.status !== 'verified')) decision = 'experimental';
    if (reasons.length && decision === 'approved') decision = 'blocked';
    var approved = decision === 'approved' && reasons.length === 0;

    return {
      approved: approved,
      decision: approved ? 'approved' : decision,
      reasons: unique(reasons),
      promotion_status: approved ? 'approved' : decision,
      leaderboard_scope: approved ? (rule.leaderboard_scope || 'official_sim_top_25') : (decision === 'experimental' ? 'experimental' : 'stale'),
      source_gaps: sourceGaps,
      rule: rule,
      mapping: mapping || null
    };
  }

  function applyPromotionDecision(entry, decision) {
    var row = Object.assign({}, entry || {});
    var d = decision || {};
    row.promotion_status = d.promotion_status || d.decision || 'blocked';
    row.promotion_reasons = unique(d.reasons || []);
    if (d.mapping && d.mapping.mapping && d.mapping.mapping.id) row.team_key_mapping_id = d.mapping.mapping.id;
    if (d.approved) {
      row.leaderboard_scope = d.leaderboard_scope || 'official_sim_top_25';
      row.evidence_quality = 'official_ready';
      row.stale = false;
      row.stale_reason = null;
    } else if (d.decision === 'experimental') {
      row.leaderboard_scope = 'experimental';
      row.confidence = 'experimental';
      row.evidence_quality = 'experimental';
    } else if (d.decision === 'stale') {
      row.leaderboard_scope = 'stale';
      row.stale = true;
      row.stale_reason = row.stale_reason || 'promotion_stale';
    }
    return row;
  }

  function createTeamService(adapter) {
    var db = adapter || {};
    return {
      createTeam: function(input, userId) {
        var regulation = db.getRegulation ? db.getRegulation(input.regulation_id) : null;
        var team = Object.assign({}, input, { owner_user_id: userId || input.owner_user_id || null });
        var report = validateTeamForRegulation(team, regulation);
        team.legality_status = report.status;
        team.legality_report = report;
        return db.createTeam ? db.createTeam(team) : Promise.resolve(team);
      },
      updateTeam: function(teamId, input, userId) {
        var regulation = db.getRegulation ? db.getRegulation(input.regulation_id) : null;
        var team = Object.assign({}, input, { id: teamId, owner_user_id: userId || input.owner_user_id || null });
        var report = validateTeamForRegulation(team, regulation);
        team.legality_status = report.status;
        team.legality_report = report;
        if (db.markLeaderboardStale) db.markLeaderboardStale('team_changed', null, null, teamId);
        return db.updateTeam ? db.updateTeam(teamId, team, userId) : Promise.resolve(team);
      },
      getTeam: function(teamId, viewerUserId) {
        if (!db.getTeam) return Promise.resolve(null);
        return Promise.resolve(db.getTeam(teamId)).then(function(team) { return applyTeamVisibility(team, viewerUserId); });
      },
      listLeaderboard: function(filters) {
        return Promise.resolve(db.listLeaderboard ? db.listLeaderboard(filters || {}) : []).then(function(entries) { return filterLeaderboard(entries, filters || {}); });
      },
      getTeamMatchups: function(teamId, filters) {
        return Promise.resolve(db.getTeamMatchups ? db.getTeamMatchups(teamId, filters || {}) : []);
      },
      compareTeamToLeaderboard: function(teamId, filters) {
        var entries = db.listLeaderboard ? db.listLeaderboard(filters || {}) : [];
        var matchups = db.getTeamMatchups ? db.getTeamMatchups(teamId, filters || {}) : [];
        return Promise.resolve(compareTeamToLeaderboard(teamId, entries, matchups, filters || {}));
      },
      markLeaderboardStale: function(reason, engineVersion, rulesetVersion, teamId) {
        return db.markLeaderboardStale ? db.markLeaderboardStale(reason, engineVersion, rulesetVersion, teamId) : Promise.resolve({ reason: reason, engine_version: engineVersion, ruleset_version: rulesetVersion, team_id: teamId });
      },
      resetTeamLabRankings: function(input, adminUserId) {
        var params = input || {};
        var isAdmin = db.isTeamLabAdmin ? !!db.isTeamLabAdmin(adminUserId) : false;
        if (!isAdmin) return Promise.resolve({ ok: false, error: 'ADMIN_REQUIRED', message: 'Team Lab ranking reset requires trusted admin authorization.' });
        if (db.resetTeamLabRankings) return Promise.resolve(db.resetTeamLabRankings(params, adminUserId));
        var rows = db.listLeaderboard ? db.listLeaderboard(params) : [];
        return Promise.resolve(rows).then(function(resolvedRows) {
          var result = resetLeaderboardRankings(resolvedRows, params, { is_admin: true, user_id: adminUserId });
          if (result.ok && db.recordAdminAction) db.recordAdminAction(result.audit);
          return result;
        });
      }
    };
  }

  var api = {
    DEFAULT_MIN_SAMPLE_SIZE: DEFAULT_MIN_SAMPLE_SIZE,
    VALID_FORMATS: VALID_FORMATS,
    VALID_VISIBILITY: VALID_VISIBILITY,
    VALID_LEGALITY: VALID_LEGALITY,
    VALID_CONFIDENCE: VALID_CONFIDENCE,
    validateTeamForRegulation: validateTeamForRegulation,
    rawWinRate: rawWinRate,
    adjustedWinRate: adjustedWinRate,
    confidenceForSample: confidenceForSample,
    ratingFromAdjusted: ratingFromAdjusted,
    rankingScore: rankingScore,
    ratingFromRankingScore: ratingFromRankingScore,
    evidenceQualityForRanking: evidenceQualityForRanking,
    scopeForEvidenceQuality: scopeForEvidenceQuality,
    isEntryCurrent: isEntryCurrent,
    markLeaderboardEntriesStale: markLeaderboardEntriesStale,
    resetLeaderboardRankings: resetLeaderboardRankings,
    buildLeaderboardEntries: buildLeaderboardEntries,
    filterLeaderboard: filterLeaderboard,
    applyTeamVisibility: applyTeamVisibility,
    compareTeamToLeaderboard: compareTeamToLeaderboard,
    resolveTeamKeyMapping: resolveTeamKeyMapping,
    defaultPromotionRule: defaultPromotionRule,
    evaluateLeaderboardPromotion: evaluateLeaderboardPromotion,
    applyPromotionDecision: applyPromotionDecision,
    createTeamService: createTeamService
  };

  root.TeamLab = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
