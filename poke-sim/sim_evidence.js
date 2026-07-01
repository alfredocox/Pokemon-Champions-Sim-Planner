// ============================================================
// TEAM LAB SIM EVIDENCE FOUNDATION
// ============================================================
// First-class replay records and simulation jobs for Team Lab evidence.
// This module does not run battles. It normalizes metadata so future runners,
// replays, and leaderboard aggregation can stay versioned and auditable.
(function(root) {
  'use strict';

  /** @typedef {'team_vs_team'|'team_vs_leaderboard'|'archetype_sweep'|'full_leaderboard_recalc'|'qa_regression'} SimJobType */
  /** @typedef {'queued'|'running'|'completed'|'failed'|'cancelled'} SimJobStatus */
  /** @typedef {'ko'|'timer'|'forfeit'|'draw'|'error'} SimResultReason */
  /**
   * @typedef {Object} SimJob
   * @property {string=} id
   * @property {SimJobType} job_type
   * @property {string} regulation_id
   * @property {string} ruleset_version
   * @property {string} engine_version
   * @property {'singles'|'doubles'} format
   * @property {string[]} team_ids
   * @property {string[]=} opponent_team_ids
   * @property {string[]=} opponent_archetypes
   * @property {number} games_per_matchup
   * @property {SimJobStatus} status
   * @property {Object=} status_report
   * @property {string[]=} confidence_flags
   * @property {string[]=} source_gaps
   */
  /**
   * @typedef {Object} ReplayRecord
   * @property {string=} id
   * @property {string=} sim_run_id
   * @property {string=} job_id
   * @property {string} team_a_id
   * @property {string} team_b_id
   * @property {string} regulation_id
   * @property {'singles'|'doubles'} format
   * @property {string} engine_version
   * @property {string} ruleset_version
   * @property {string} seed
   * @property {string=} winner_team_id
   * @property {SimResultReason} result_reason
   * @property {number=} turns
   * @property {Object[]} event_log
   * @property {Object[]=} turn_log
   * @property {Object[]=} damage_events
   * @property {Object[]=} effect_events
   * @property {Object=} qa_coverage_summary
   * @property {string[]=} confidence_flags
   * @property {string[]=} source_gaps
   */
   /**
    * @typedef {Object} ReplayEvidenceSummary
    * @property {number} events
    * @property {number} turns
    * @property {number} damage_events
    * @property {number} effect_events
    * @property {boolean} has_qa_coverage
    * @property {string[]} confidence_flags
    * @property {string[]} source_gaps
    */

  var VALID_JOB_TYPES = ['team_vs_team', 'team_vs_leaderboard', 'archetype_sweep', 'full_leaderboard_recalc', 'qa_regression'];
  var VALID_JOB_STATUS = ['queued', 'running', 'completed', 'failed', 'cancelled'];
  var VALID_FORMATS = ['singles', 'doubles'];
  var VALID_RESULT_REASONS = ['ko', 'timer', 'forfeit', 'draw', 'error'];

  function cloneArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function unique(values) {
    var out = [];
    (values || []).forEach(function(value) {
      if (value == null || value === '') return;
      if (out.indexOf(value) === -1) out.push(value);
    });
    return out;
  }

  function issue(code, message) {
    return { code: code, message: message };
  }

  function requireVersionedScope(input, errors) {
    if (!input.regulation_id) errors.push(issue('REGULATION_ID_MISSING', 'regulation_id is required.'));
    if (!input.ruleset_version) errors.push(issue('RULESET_VERSION_MISSING', 'ruleset_version is required.'));
    if (!input.engine_version) errors.push(issue('ENGINE_VERSION_MISSING', 'engine_version is required.'));
    if (VALID_FORMATS.indexOf(input.format) === -1) errors.push(issue('FORMAT_INVALID', 'format must be singles or doubles.'));
  }

  function validateSimJob(job) {
    var errors = [];
    if (!job || typeof job !== 'object') {
      return { valid: false, errors: [issue('SIM_JOB_MISSING', 'Sim job payload is missing.')], warnings: [] };
    }
    if (VALID_JOB_TYPES.indexOf(job.job_type) === -1) errors.push(issue('JOB_TYPE_INVALID', 'job_type is invalid.'));
    if (VALID_JOB_STATUS.indexOf(job.status || 'queued') === -1) errors.push(issue('JOB_STATUS_INVALID', 'status is invalid.'));
    requireVersionedScope(job, errors);
    if (!Array.isArray(job.team_ids) || job.team_ids.length === 0) errors.push(issue('TEAM_IDS_MISSING', 'At least one team id is required.'));
    if (job.games_per_matchup == null || Number(job.games_per_matchup) < 1) errors.push(issue('GAMES_PER_MATCHUP_INVALID', 'games_per_matchup must be at least 1.'));
    return { valid: errors.length === 0, errors: errors, warnings: [] };
  }

  function normalizeSimJob(job) {
    var now = new Date().toISOString();
    var copy = Object.assign({}, job || {});
    copy.status = copy.status || 'queued';
    copy.team_ids = unique(copy.team_ids || []);
    copy.opponent_team_ids = unique(copy.opponent_team_ids || []);
    copy.opponent_archetypes = unique(copy.opponent_archetypes || []);
    copy.games_per_matchup = Number(copy.games_per_matchup || 0);
    copy.confidence_flags = unique(copy.confidence_flags || []);
    copy.source_gaps = unique(copy.source_gaps || []);
    copy.status_report = copy.status_report || {};
    copy.created_at = copy.created_at || now;
    copy.updated_at = now;
    return copy;
  }

  function replayEvidenceSummary(replay) {
    var turnLog = cloneArray(replay && replay.turn_log);
    var eventLog = cloneArray(replay && replay.event_log);
    var damageRows = cloneArray(replay && replay.damage_events);
    var effectRows = cloneArray(replay && replay.effect_events);
    if (!damageRows.length && turnLog.length) {
      turnLog.forEach(function(turn) { damageRows = damageRows.concat((turn && turn.damage_events) || []); });
    }
    if (!effectRows.length && turnLog.length) {
      turnLog.forEach(function(turn) { effectRows = effectRows.concat((turn && turn.effect_events) || []); });
    }
    return {
      events: eventLog.length,
      turns: Number((replay && replay.turns) || turnLog.length || 0),
      damage_events: damageRows.length,
      effect_events: effectRows.length,
      has_qa_coverage: !!(replay && replay.qa_coverage_summary && typeof replay.qa_coverage_summary === 'object'),
      confidence_flags: unique(replay && replay.confidence_flags || []),
      source_gaps: unique(replay && replay.source_gaps || [])
    };
  }

  function artifactSourceGap(code, message, pointer) {
    var row = { code: code, message: message };
    if (pointer) row.pointer = pointer;
    return row;
  }

  function sourceGapId(gap) {
    if (!gap) return '';
    return String(gap.code || '') + '::' + String(gap.pointer || '') + '::' + String(gap.message || '');
  }

  function uniqueGaps(gaps) {
    var seen = {};
    var out = [];
    (gaps || []).forEach(function(gap) {
      var key = sourceGapId(gap);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(gap);
    });
    return out;
  }

  function artifactFormat(value) {
    var fmt = String(value || '').toLowerCase();
    if (fmt === 'single' || fmt === 'singles') return 'singles';
    if (fmt === 'double' || fmt === 'doubles') return 'doubles';
    return null;
  }

  function artifactResultReason(result) {
    var value = String(result || '').toLowerCase();
    if (value === 'draw') return 'draw';
    if (value === 'timeout' || value === 'timer') return 'timer';
    if (value === 'forfeit') return 'forfeit';
    if (value === 'error') return 'error';
    return 'ko';
  }

  function artifactWinnerTeamId(result, playerTeamId, opponentTeamId) {
    var value = String(result || '').toLowerCase();
    if (value === 'win') return playerTeamId || null;
    if (value === 'loss') return opponentTeamId || null;
    return null;
  }

  function stableTextHash(text) {
    var hash = 2166136261;
    var input = String(text || '');
    for (var i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function decodeHtmlEntities(text) {
    return String(text || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function normalizeShowdownName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  function slugToken(value) {
    return String(value || 'unknown')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown';
  }

  function showdownProtocolLinesFromHtml(html) {
    var out = [];
    var raw = String(html || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var re = /(?:^|\n)(\|[^\n<\r]+)/g;
    var match;
    while ((match = re.exec(raw))) {
      var line = decodeHtmlEntities(match[1]).trim();
      if (line.charAt(0) === '|') out.push(line);
    }
    return out;
  }

  function showdownReplayTitle(html) {
    var match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? decodeHtmlEntities(match[1]).trim() : '';
  }

  function showdownRegulationId(title, sourceName) {
    var text = String(title || '') + ' ' + String(sourceName || '');
    var compact = text.match(/Reg\s*M[-\s]?([A-Z])/i) || text.match(/RegM([A-Z])/i);
    if (!compact) return null;
    return 'champions_reg_m_' + compact[1].toLowerCase();
  }

  function showdownReplayFormat(title, sourceName) {
    var text = String(title || '') + ' ' + String(sourceName || '');
    if (/single/i.test(text)) return 'singles';
    if (/vgc|double/i.test(text)) return 'doubles';
    return 'doubles';
  }

  function showdownBattleDate(sourceName) {
    var match = String(sourceName || '').match(/(20\d{2}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  function showdownFormatId(sourceName) {
    var match = String(sourceName || '').match(/^(Gen\d+ChampionsVGC\d+RegM[A-Z])/i);
    return match ? match[1] : null;
  }

  function createShowdownReplayEvidenceFromHtml(html, opts) {
    opts = opts || {};
    var sourceName = opts.source_file || opts.source_name || 'showdown-replay.html';
    var title = showdownReplayTitle(html);
    var lines = showdownProtocolLinesFromHtml(html);
    var sourceGaps = [];
    if (!lines.length) {
      return {
        ok: false,
        errors: [issue('SHOWDOWN_PROTOCOL_LINES_MISSING', 'No Showdown packed protocol lines were found in the HTML replay.')],
        warnings: [],
        source_gaps: []
      };
    }
    var players = {};
    var roster = { p1: [], p2: [] };
    var winnerName = null;
    var isDraw = false;
    var turnCount = 0;
    var moveCount = 0;
    var switchCount = 0;
    var faintCount = 0;
    var eventLog = lines.map(function(line, index) {
      var parts = line.split('|').slice(1);
      var type = parts[0] || 'unknown';
      if (type === 'player') {
        players[parts[1]] = normalizeShowdownName(parts[2]);
      } else if (type === 'poke') {
        var side = parts[1];
        var species = String(parts[2] || '').split(',')[0].trim();
        if (roster[side] && species && roster[side].indexOf(species) === -1) roster[side].push(species);
      } else if (type === 'turn') {
        turnCount = Math.max(turnCount, Number(parts[1] || 0));
      } else if (type === 'move') {
        moveCount += 1;
      } else if (type === 'switch' || type === 'drag') {
        switchCount += 1;
      } else if (type === 'faint') {
        faintCount += 1;
      } else if (type === 'win') {
        winnerName = normalizeShowdownName(parts[1]);
      } else if (type === 'tie') {
        isDraw = true;
      }
      return {
        row: index + 1,
        event_type: type,
        args: parts.slice(1),
        raw: line
      };
    });
    var p1Name = players.p1 || 'p1';
    var p2Name = players.p2 || 'p2';
    var p1Team = opts.team_a_id || ('showdown:p1:' + slugToken(p1Name));
    var p2Team = opts.team_b_id || ('showdown:p2:' + slugToken(p2Name));
    if (!opts.team_a_id || !opts.team_b_id) {
      sourceGaps.push(artifactSourceGap(
        'TEAM_ID_MAPPING_NEEDED',
        'Showdown replay player names must be mapped to Team Lab team IDs before leaderboard aggregation.',
        'player protocol rows'
      ));
    }
    var regulationId = opts.regulation_id || showdownRegulationId(title, sourceName);
    if (!regulationId) {
      regulationId = 'unknown-regulation';
      sourceGaps.push(artifactSourceGap('REGULATION_ID_INFERRED', 'Replay title/file did not expose a Champion regulation.', 'title/source_file'));
    }
    var formatId = showdownFormatId(sourceName) || 'showdown-html-replay';
    var hash = opts.source_hash || stableTextHash(html);
    var winnerTeamId = null;
    if (!isDraw && winnerName) {
      if (winnerName === p1Name) winnerTeamId = p1Team;
      else if (winnerName === p2Name) winnerTeamId = p2Team;
      else sourceGaps.push(artifactSourceGap('WINNER_MAPPING_NEEDED', 'Winner name did not match p1/p2 protocol names.', 'win protocol row'));
    }
    sourceGaps.push(artifactSourceGap(
      'SHOWDOWN_REPLAY_NOT_OFFICIAL_RULE_TRUTH',
      'Imported Showdown HTML replay is replay/meta/coaching evidence only; it must not overwrite official Champion legality or mechanics truth.',
      'showdown html replay'
    ));
    sourceGaps.push(artifactSourceGap(
      'STRUCTURED_DAMAGE_ROWS_NOT_IMPORTED',
      'Showdown protocol damage rows are preserved as raw events; app-specific damage_events are not reconstructed by this importer yet.',
      'event_log'
    ));
    var replay = normalizeReplayRecord({
      id: opts.id || ('showdown-html:' + hash),
      team_a_id: p1Team,
      team_b_id: p2Team,
      regulation_id: regulationId,
      format: opts.format || showdownReplayFormat(title, sourceName),
      engine_version: opts.engine_version || 'showdown-html-replay-import-v1',
      ruleset_version: opts.ruleset_version || formatId,
      seed: 'showdown-html:' + hash,
      winner_team_id: winnerTeamId || undefined,
      result_reason: isDraw ? 'draw' : (winnerName ? 'ko' : 'error'),
      turns: turnCount,
      event_log: eventLog,
      turn_log: [],
      damage_events: [],
      effect_events: [],
      qa_coverage_summary: null,
      confidence_flags: unique(['showdown_html_replay', 'replay_verified_source']),
      source_gaps: uniqueGaps(sourceGaps).map(function(gap) { return gap.code; }),
      source_metadata: {
        source_type: 'showdown_html_replay',
        source_file: sourceName,
        source_hash: hash,
        title: title,
        battle_date: showdownBattleDate(sourceName),
        players: { p1: p1Name, p2: p2Name },
        rosters: roster,
        event_counts: {
          protocol_lines: lines.length,
          turns: turnCount,
          moves: moveCount,
          switches: switchCount,
          faints: faintCount
        }
      }
    });
    return {
      ok: true,
      artifact_type: 'showdown_html_replay',
      replay_record: replay,
      source_gaps: uniqueGaps(sourceGaps),
      warnings: []
    };
  }

  function artifactTeamId(rawId, side, opts, sourceGaps) {
    opts = opts || {};
    var map = opts.teamIdMap || opts.team_id_map || {};
    var key = rawId == null || rawId === '' ? side : String(rawId);
    var mapped = map[key] || map[side] || null;
    if (mapped) return String(mapped);
    sourceGaps.push(artifactSourceGap(
      'TEAM_ID_MAPPING_NEEDED',
      'Artifact uses a local/team-key identifier that must be mapped to a Team Lab team UUID before database insertion or leaderboard aggregation.',
      key
    ));
    return 'artifact:' + side + ':' + key;
  }

  function artifactVersionScope(payload, opts, sourceGaps) {
    opts = opts || {};
    var buildId = opts.engine_version || payload.engine_version || payload.build_id || 'unknown-engine-version';
    var rulesetVersion = opts.ruleset_version || payload.ruleset_version || payload.ruleset_id || 'unknown-ruleset-version';
    var regulationId = opts.regulation_id || payload.regulation_id || (payload.qa_coverage_summary && payload.qa_coverage_summary.regulation_id) || 'unknown-regulation';
    var fmt = artifactFormat(opts.format || payload.format || payload.current_format || (payload.qa_coverage_summary && payload.qa_coverage_summary.format)) || 'doubles';
    if (!opts.regulation_id && !payload.regulation_id) {
      sourceGaps.push(artifactSourceGap('REGULATION_ID_INFERRED', 'Artifact did not include a first-class regulation_id; caller must attach the Champion regulation before ranking.', 'regulation_id'));
    }
    if (!opts.ruleset_version && !payload.ruleset_version && !payload.ruleset_id) {
      sourceGaps.push(artifactSourceGap('RULESET_VERSION_INFERRED', 'Artifact did not include ruleset_version; caller must attach the compiled ruleset package before ranking.', 'ruleset_version'));
    }
    if (!opts.engine_version && !payload.engine_version && !payload.build_id) {
      sourceGaps.push(artifactSourceGap('ENGINE_VERSION_MISSING', 'Artifact did not include build_id or engine_version.', 'engine_version'));
    }
    return {
      engine_version: String(buildId),
      ruleset_version: String(rulesetVersion),
      regulation_id: String(regulationId),
      format: fmt
    };
  }

  function artifactRowsFromTextLog(lines) {
    if (!Array.isArray(lines)) return [];
    return lines.map(function(line, index) {
      return { row: index + 1, event_type: 'log_line', message: String(line == null ? '' : line) };
    });
  }

  function artifactDamageRows(turnLog) {
    var out = [];
    (turnLog || []).forEach(function(turn) {
      ((turn && turn.damage_events) || []).forEach(function(row) { out.push(row); });
    });
    return out;
  }

  function artifactEffectRows(turnLog) {
    var out = [];
    (turnLog || []).forEach(function(turn) {
      ((turn && turn.effect_events) || []).forEach(function(row) { out.push(row); });
    });
    return out;
  }

  function replayRecordFromArtifactCard(card, payload, opts, parentSourceGaps) {
    card = card || {};
    payload = payload || {};
    opts = opts || {};
    var sourceGaps = cloneArray(parentSourceGaps);
    var scope = artifactVersionScope(Object.assign({}, payload, card), opts, sourceGaps);
    var playerKey = card.player_team_id || card.playerKey || payload.player_team_id || 'player';
    var opponentKey = card.opponent_team_id || card.oppKey || payload.opponent_team_id || 'opponent';
    var playerTeamId = artifactTeamId(playerKey, 'player', opts, sourceGaps);
    var opponentTeamId = artifactTeamId(opponentKey, 'opponent', opts, sourceGaps);
    var turnLog = Array.isArray(card.turnLog) ? card.turnLog : (Array.isArray(card.turn_log) ? card.turn_log : []);
    var eventLog = Array.isArray(card.event_log) ? card.event_log : artifactRowsFromTextLog(card.log);
    var result = card.result || payload.result || null;
    var replay = {
      id: card.id || undefined,
      job_id: opts.job_id || undefined,
      sim_run_id: card.sim_run_id || undefined,
      team_a_id: playerTeamId,
      team_b_id: opponentTeamId,
      regulation_id: scope.regulation_id,
      format: artifactFormat(card.format || scope.format) || scope.format,
      engine_version: scope.engine_version,
      ruleset_version: scope.ruleset_version,
      seed: String(card.seed || payload.seed || 'artifact-seed-needed'),
      winner_team_id: artifactWinnerTeamId(result, playerTeamId, opponentTeamId) || undefined,
      result_reason: artifactResultReason(result),
      turns: Number(card.turns || turnLog.length || 0),
      event_log: eventLog,
      turn_log: turnLog,
      damage_events: Array.isArray(card.damage_events) ? card.damage_events : artifactDamageRows(turnLog),
      effect_events: Array.isArray(card.effect_events) ? card.effect_events : artifactEffectRows(turnLog),
      qa_coverage_summary: card.qa_coverage_summary || payload.qa_coverage_summary || null,
      confidence_flags: unique(['imported_artifact'].concat(card.confidence_flags || [])),
      source_gaps: uniqueGaps(sourceGaps).map(function(gap) { return gap.code; })
    };
    if (!card.seed && !payload.seed) {
      sourceGaps.push(artifactSourceGap('SEED_MISSING_FROM_ARTIFACT', 'Artifact replay card did not include a deterministic seed.', 'seed'));
      replay.seed = 'artifact-seed-needed';
    }
    replay.source_gaps = uniqueGaps(sourceGaps).map(function(gap) { return gap.code; });
    return { replay: normalizeReplayRecord(replay), source_gaps: uniqueGaps(sourceGaps) };
  }

  function simJobFromQaArtifact(payload, opts, sourceGaps, replayRecords) {
    payload = payload || {};
    opts = opts || {};
    var scope = artifactVersionScope(payload, opts, sourceGaps);
    var retained = payload.retained || {};
    var summary = payload.summary || {};
    var replayCards = Array.isArray(retained.replay_cards) ? retained.replay_cards : [];
    var teamIds = unique((replayRecords || []).map(function(row) { return row && row.team_a_id; }).filter(Boolean));
    var opponentTeamIds = unique((replayRecords || []).map(function(row) { return row && row.team_b_id; }).filter(Boolean));
    if (!replayCards.length && payload.qa_coverage_summary) {
      sourceGaps.push(artifactSourceGap(
        'SUMMARY_ONLY_QA_ARTIFACT',
        'QA artifact has coverage summary but no retained replay cards; it can support QA coverage review, not replay-level Team Lab aggregation.',
        'retained.replay_cards'
      ));
    }
    if (payload.targeted_qa_sweep || payload.tactical_sweep || payload.branch_move_analysis) {
      sourceGaps.push(artifactSourceGap(
        'SWEEP_SUMMARY_NOT_REPLAY_ROWS',
        'Targeted/tactical sweep summary evidence is preserved at job level until individual branch runs are exported as replay records.',
        'targeted_qa_sweep/tactical_sweep'
      ));
    }
    return normalizeSimJob({
      job_type: 'qa_regression',
      regulation_id: scope.regulation_id,
      ruleset_version: scope.ruleset_version,
      engine_version: scope.engine_version,
      format: scope.format,
      team_ids: teamIds.length ? teamIds : ['artifact:player:' + String(payload.player_team_id || 'player')],
      opponent_team_ids: opponentTeamIds,
      opponent_archetypes: [],
      games_per_matchup: Math.max(1, Number(summary.retained_replay_cards || replayCards.length || 1)),
      status: 'completed',
      status_report: {
        schema_version: payload.schema_version || null,
        artifact_type: payload.artifact_type || null,
        qa_run_type: payload.qa_run_type || null,
        retained_replay_cards: replayCards.length,
        retained_simlog_entries: Array.isArray(retained.sim_log) ? retained.sim_log.length : 0,
        coverage_totals: payload.qa_coverage_summary && payload.qa_coverage_summary.totals || null,
        proof_manifest: payload.proof_manifest || null
      },
      confidence_flags: unique(['imported_qa_artifact'].concat((sourceGaps || []).map(function(gap) { return gap.code; }))),
      source_gaps: uniqueGaps(sourceGaps).map(function(gap) { return gap.code; })
    });
  }

  function createSimEvidenceFromArtifact(payload, opts) {
    opts = opts || {};
    var sourceGaps = [];
    var warnings = [];
    if (!payload || typeof payload !== 'object') {
      return { ok: false, errors: [issue('ARTIFACT_MISSING', 'Artifact payload is missing.')], warnings: warnings, source_gaps: [] };
    }
    var schema = payload.schema_version || payload.schemaVersion || null;
    if (schema === 'champions-turn-log-v2') {
      var single = replayRecordFromArtifactCard(payload, payload, opts, sourceGaps);
      return {
        ok: true,
        artifact_type: 'turn_log',
        sim_job: null,
        replay_records: [single.replay],
        source_gaps: single.source_gaps,
        warnings: warnings
      };
    }
    if (schema === 'champions-qa-artifact-v1') {
      var retained = payload.retained || {};
      var cards = Array.isArray(retained.replay_cards) ? retained.replay_cards : [];
      var replayResults = cards.map(function(card) {
        return replayRecordFromArtifactCard(card, payload, opts, sourceGaps);
      });
      replayResults.forEach(function(result) {
        sourceGaps = sourceGaps.concat(result.source_gaps || []);
      });
      sourceGaps = uniqueGaps(sourceGaps);
      var replays = replayResults.map(function(result) { return result.replay; });
      var job = simJobFromQaArtifact(payload, opts, sourceGaps, replays);
      return {
        ok: true,
        artifact_type: 'qa_artifact',
        sim_job: job,
        replay_records: replays,
        source_gaps: uniqueGaps(sourceGaps),
        warnings: warnings
      };
    }
    return {
      ok: false,
      errors: [issue('ARTIFACT_SCHEMA_UNSUPPORTED', 'Unsupported artifact schema_version: ' + String(schema || 'missing') + '.')],
      warnings: warnings,
      source_gaps: []
    };
  }

  function validateReplayRecord(replay) {
    var errors = [];
    var warnings = [];
    if (!replay || typeof replay !== 'object') {
      return { valid: false, errors: [issue('REPLAY_MISSING', 'Replay payload is missing.')], warnings: warnings };
    }
    requireVersionedScope(replay, errors);
    if (!replay.team_a_id) errors.push(issue('TEAM_A_ID_MISSING', 'team_a_id is required.'));
    if (!replay.team_b_id) errors.push(issue('TEAM_B_ID_MISSING', 'team_b_id is required.'));
    if (!replay.seed) errors.push(issue('SEED_MISSING', 'seed is required for deterministic replay evidence.'));
    if (VALID_RESULT_REASONS.indexOf(replay.result_reason) === -1) errors.push(issue('RESULT_REASON_INVALID', 'result_reason is invalid.'));
    if (!Array.isArray(replay.event_log)) errors.push(issue('EVENT_LOG_MISSING', 'event_log must be an array.'));
    if (replay.turn_log != null && !Array.isArray(replay.turn_log)) errors.push(issue('TURN_LOG_INVALID', 'turn_log must be an array when present.'));
    var summary = replayEvidenceSummary(replay || {});
    if (!summary.events && !summary.turns) warnings.push(issue('REPLAY_EVIDENCE_EMPTY', 'Replay has no event_log rows and no turn_log rows.'));
    return { valid: errors.length === 0, errors: errors, warnings: warnings, summary: summary };
  }

  function normalizeReplayRecord(replay) {
    var now = new Date().toISOString();
    var copy = Object.assign({}, replay || {});
    copy.event_log = cloneArray(copy.event_log);
    copy.turn_log = cloneArray(copy.turn_log);
    copy.damage_events = cloneArray(copy.damage_events);
    copy.effect_events = cloneArray(copy.effect_events);
    copy.confidence_flags = unique(copy.confidence_flags || []);
    copy.source_gaps = unique(copy.source_gaps || []);
    copy.evidence_summary = replayEvidenceSummary(copy);
    copy.created_at = copy.created_at || now;
    return copy;
  }

  function attachReplayToSimRun(simRun, replay) {
    var replayValidation = validateReplayRecord(replay);
    if (!replayValidation.valid) return { ok: false, errors: replayValidation.errors, warnings: replayValidation.warnings };
    var run = Object.assign({}, simRun || {});
    var normalized = normalizeReplayRecord(replay);
    run.replay_id = normalized.id || run.replay_id || null;
    run.job_id = normalized.job_id || run.job_id || null;
    run.confidence_flags = unique((run.confidence_flags || []).concat(normalized.confidence_flags || []));
    run.replay_evidence_summary = normalized.evidence_summary;
    return { ok: true, sim_run: run, replay: normalized, warnings: replayValidation.warnings };
  }

  function createSimEvidenceService(adapter) {
    var db = adapter || {};
    return {
      createSimJob: function(input) {
        var job = normalizeSimJob(input);
        var validation = validateSimJob(job);
        if (!validation.valid) return Promise.reject(Object.assign(new Error('Invalid sim job'), { validation: validation }));
        return db.createSimJob ? db.createSimJob(job) : Promise.resolve(job);
      },
      updateSimJobStatus: function(jobId, status, statusReport) {
        if (VALID_JOB_STATUS.indexOf(status) === -1) return Promise.reject(new Error('Invalid sim job status'));
        return db.updateSimJobStatus ? db.updateSimJobStatus(jobId, status, statusReport || {}) : Promise.resolve({ id: jobId, status: status, status_report: statusReport || {} });
      },
      saveReplayRecord: function(input) {
        var replay = normalizeReplayRecord(input);
        var validation = validateReplayRecord(replay);
        if (!validation.valid) return Promise.reject(Object.assign(new Error('Invalid replay record'), { validation: validation }));
        return db.saveReplayRecord ? db.saveReplayRecord(replay) : Promise.resolve(replay);
      },
      attachReplayToSimRun: function(simRun, replay) {
        return Promise.resolve(attachReplayToSimRun(simRun, replay));
      },
      listReplays: function(filters) {
        return Promise.resolve(db.listReplays ? db.listReplays(filters || {}) : []);
      },
      listSimJobs: function(filters) {
        return Promise.resolve(db.listSimJobs ? db.listSimJobs(filters || {}) : []);
      }
    };
  }

  var api = {
    VALID_JOB_TYPES: VALID_JOB_TYPES,
    VALID_JOB_STATUS: VALID_JOB_STATUS,
    VALID_RESULT_REASONS: VALID_RESULT_REASONS,
    validateSimJob: validateSimJob,
    normalizeSimJob: normalizeSimJob,
    validateReplayRecord: validateReplayRecord,
    normalizeReplayRecord: normalizeReplayRecord,
    replayEvidenceSummary: replayEvidenceSummary,
    attachReplayToSimRun: attachReplayToSimRun,
    createSimEvidenceService: createSimEvidenceService
    ,
    createSimEvidenceFromArtifact: createSimEvidenceFromArtifact,
    showdownProtocolLinesFromHtml: showdownProtocolLinesFromHtml,
    createShowdownReplayEvidenceFromHtml: createShowdownReplayEvidenceFromHtml
  };

  root.SimEvidence = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
