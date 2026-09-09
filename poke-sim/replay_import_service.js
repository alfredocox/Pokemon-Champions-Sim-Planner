// ============================================================
// TRAINER REPLAY IMPORT SERVICE
// Converts uploaded replay/artifact files into private governance rows.
// This does not write to Supabase directly and does not promote evidence.
// ============================================================

(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.replayImportService = ChampionsSim.replayImportService || {};

  var PARSER_VERSION = 'trainer-replay-import-parser-v1';
  var PROMOTION_BLOCK = 'PRIVATE_IMPORT_NOT_PROMOTED';

  function str(value) {
    return String(value == null ? '' : value);
  }

  function clean(value) {
    return str(value).trim();
  }

  function unique(list) {
    var seen = {};
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function(value) {
      var key = clean(value);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function hashText(text) {
    var input = str(text);
    var h = 2166136261;
    for (var i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function nowIso(opts) {
    return clean(opts && opts.now) || new Date().toISOString();
  }

  function sourceTypeForText(text, filename) {
    var raw = str(text);
    var name = clean(filename).toLowerCase();
    if (/champions-sim-qa-artifact/i.test(name)) return 'qa_artifact';
    if (/champions-turn-log/i.test(name)) return 'champions_turn_log';
    if (/\.html?$/.test(name) || /<html|battle-log-data|replayLog\s*=|var\s+replay/i.test(raw)) return 'showdown_html';
    if (/^\s*\|(?:player|poke|turn|move|switch|win|tie)\|/m.test(raw)) return 'showdown_text';
    if (/^\s*\{/.test(raw)) {
      try {
        var payload = JSON.parse(raw);
        if (payload && payload.schema_version === 'champions-qa-artifact-v1') return 'qa_artifact';
        if (payload && payload.schema_version === 'champions-turn-log-v2') return 'champions_turn_log';
      } catch (_err) {}
    }
    return 'unknown';
  }

  function statusFromCounts(count, warnings, hardFailed) {
    if (hardFailed) return 'failed';
    if (count > 0 && warnings && warnings.length) return 'partial';
    if (count > 0) return 'parsed';
    return 'needs_review';
  }

  function confidenceFromStatus(status) {
    if (status === 'parsed') return 'medium';
    if (status === 'partial') return 'low';
    return 'needs_review';
  }

  function sourceGap(code, message, pointer) {
    return {
      code: code,
      message: message,
      pointer: pointer || null
    };
  }

  function normalizeTeamName(value) {
    return clean(value)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/^champions[-_\s]*/i, '')
      .replace(/^showdown[-_\s]*/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function personalTeamsFromOpts(opts) {
    opts = opts || {};
    var raw = opts.personal_teams || opts.personalTeams || opts.custom_teams || opts.customTeams || [];
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      return Object.keys(raw).map(function(key) {
        var team = raw[key] || {};
        return Object.assign({ key: key }, team);
      });
    }
    return [];
  }

  function findPersonalTeamMatch(filename, opts) {
    var fileToken = normalizeTeamName(filename);
    if (!fileToken) return null;
    var teams = personalTeamsFromOpts(opts);
    for (var i = 0; i < teams.length; i += 1) {
      var team = teams[i] || {};
      var candidates = [
        team.name,
        team.label,
        team.team_name,
        team.team_id,
        team.teamId,
        team.team_lab_team_id,
        team.id,
        team.key
      ];
      for (var c = 0; c < candidates.length; c += 1) {
        if (normalizeTeamName(candidates[c]) && normalizeTeamName(candidates[c]) === fileToken) {
          return {
            match_type: 'filename_team_name',
            source_filename: clean(filename),
            team_name: clean(team.name || team.label || team.team_name || candidates[c]),
            team_key: clean(team.key || team.team_id || team.teamId || team.id || ''),
            team_lab_team_id: clean(team.team_lab_team_id || team.teamLabTeamId || team.id || team.team_id || ''),
            visibility: clean(team.visibility || 'private'),
            verification_status: 'needs_review',
            note: 'Filename matched a personal/custom team name. This is private Pilot-room mapping evidence, not global truth.'
          };
        }
      }
    }
    return null;
  }

  function findExplicitPersonalTeamMatch(opts) {
    opts = opts || {};
    var selected = clean(opts.reference_team_id || opts.referenceTeamId || opts.selected_team_id || opts.selectedTeamId);
    if (!selected) return null;
    var teams = personalTeamsFromOpts(opts);
    for (var i = 0; i < teams.length; i += 1) {
      var team = teams[i] || {};
      var ids = [
        team.key,
        team.id,
        team.team_id,
        team.teamId,
        team.team_lab_team_id,
        team.teamLabTeamId
      ].map(clean).filter(Boolean);
      if (ids.indexOf(selected) >= 0) {
        return {
          match_type: 'manual_reference_team',
          source_filename: clean(opts.filename || opts.source_filename || ''),
          team_name: clean(team.name || team.label || team.team_name || selected),
          team_key: clean(team.key || team.team_id || team.teamId || team.id || ''),
          team_lab_team_id: clean(team.team_lab_team_id || team.teamLabTeamId || team.id || team.team_id || selected),
          visibility: clean(team.visibility || 'private'),
          verification_status: 'needs_review',
          note: 'User selected this reference team in the Pilot-room replay upload flow. This is private mapping evidence, not global truth.'
        };
      }
    }
    return {
      match_type: 'manual_reference_team',
      source_filename: clean(opts.filename || opts.source_filename || ''),
      team_name: selected,
      team_key: selected,
      team_lab_team_id: selected,
      visibility: 'private',
      verification_status: 'needs_review',
      note: 'User selected a reference team id. This is private mapping evidence, not global truth.'
    };
  }

  function baseImportRow(text, opts, sourceType, sourceGaps, warnings, eventCount, hardFailed) {
    opts = opts || {};
    var parseStatus = statusFromCounts(eventCount, warnings, hardFailed);
    var personalTeamMatch = opts._personal_team_match || null;
    var mappingStatus = personalTeamMatch ? 'mapped' : (eventCount > 0 ? 'needs_review' : 'pending');
    var pilotRoomContext = 'unmapped_private_import';
    if (personalTeamMatch && personalTeamMatch.match_type === 'manual_reference_team') {
      pilotRoomContext = 'manual_reference_team';
    } else if (personalTeamMatch) {
      pilotRoomContext = 'filename_matched_personal_team';
    }
    return {
      room_id: clean(opts.room_id || opts.roomId || 'room-id-required'),
      uploaded_by_user_id: clean(opts.uploaded_by_user_id || opts.user_id || opts.userId || 'user-id-required'),
      source_type: sourceType || 'unknown',
      source_filename: clean(opts.source_filename || opts.filename || opts.source_file || ''),
      source_hash: clean(opts.source_hash) || hashText(text),
      parser_version: clean(opts.parser_version) || PARSER_VERSION,
      parse_status: parseStatus,
      team_mapping_status: mappingStatus,
      regulation_id: clean(opts.regulation_id || ''),
      format: clean(opts.format || ''),
      engine_version: clean(opts.engine_version || ''),
      ruleset_version: clean(opts.ruleset_version || ''),
      source_gaps: unique((sourceGaps || []).map(function(gap) { return gap.code || gap; }).concat([PROMOTION_BLOCK])),
      confidence_flags: unique((warnings || []).map(function(w) { return w.code || w; }).concat([
        'private_trainer_import',
        parseStatus === 'parsed' ? 'parser_medium_confidence' : 'parser_needs_review'
      ])),
      metadata: {
        source_gaps_detail: sourceGaps || [],
        warnings: warnings || [],
        personal_team_match: personalTeamMatch,
        pilot_room_context: pilotRoomContext,
        import_policy: 'private_only_no_global_learning',
        promotion_blocked_until: 'trusted_worker_mapping_legality_consent_review',
        event_count: eventCount || 0
      },
      created_at: nowIso(opts),
      updated_at: nowIso(opts)
    };
  }

  function eventRow(importId, index, turn, eventType, payload, confidence, sourceLine) {
    return {
      import_id: importId || 'import-id-after-insert',
      event_index: index,
      turn: turn == null ? null : turn,
      event_type: eventType || 'unknown',
      actor_key: payload && (payload.actor_key || payload.actor || payload.pokemon) || null,
      target_key: payload && (payload.target_key || payload.target) || null,
      event_payload: payload || {},
      source_line: sourceLine == null ? null : sourceLine,
      parser_confidence: confidence || 'needs_review'
    };
  }

  function refsForImport(importId, evidence) {
    var refs = [];
    if (!evidence) return refs;
    (evidence.replay_records || []).forEach(function(replay, index) {
      var replayRef = replay && (replay.id || replay.seed || replay.sim_run_id);
      if (replayRef) {
        refs.push({
          import_id: importId || 'import-id-after-insert',
          ref_type: 'replay_log',
          ref_id: String(replayRef),
          verification_status: 'needs_review',
          notes: 'Private imported replay record candidate #' + (index + 1)
        });
      }
    });
    if (evidence.sim_job) {
      refs.push({
        import_id: importId || 'import-id-after-insert',
        ref_type: 'qa_artifact',
        ref_id: String(evidence.sim_job.id || evidence.sim_job.seed || 'qa-artifact-job'),
        verification_status: 'needs_review',
        notes: 'Private imported QA artifact job candidate'
      });
    }
    return refs;
  }

  function personalTeamRefs(importId, match) {
    if (!match || !match.team_lab_team_id) return [];
    return [{
      import_id: importId || 'import-id-after-insert',
      ref_type: 'team_lab_team',
      ref_id: String(match.team_lab_team_id),
      verification_status: 'needs_review',
      notes: 'Private Pilot-room filename match for personal team: ' + (match.team_name || match.team_lab_team_id)
    }];
  }

  function showdownEventsFromParsed(parsed, importId) {
    var out = [];
    var idx = 0;
    (parsed.turns || []).forEach(function(turn) {
      var turnNumber = Number(turn.number || 0);
      ['moves', 'switches', 'damage', 'faints', 'field', 'rng'].forEach(function(group) {
        (turn[group] || []).forEach(function(row) {
          out.push(eventRow(importId, idx, turnNumber, group.slice(0, -1) || group, row, 'medium', row && row.line));
          idx += 1;
        });
      });
    });
    if (!out.length && parsed.rawPreviewLines) {
      parsed.rawPreviewLines.forEach(function(line, lineIndex) {
        out.push(eventRow(importId, idx, null, 'raw_protocol_line', { raw: line }, 'low', lineIndex + 1));
        idx += 1;
      });
    }
    return out;
  }

  function artifactEventsFromEvidence(evidence, importId) {
    var out = [];
    var idx = 0;
    (evidence.replay_records || []).forEach(function(replay, replayIndex) {
      (replay.event_log || []).forEach(function(row) {
        out.push(eventRow(importId, idx, row.turn || null, row.event_type || 'event_log', {
          replay_index: replayIndex,
          replay_id: replay.id || null,
          row: row
        }, 'medium', row.row || null));
        idx += 1;
      });
      (replay.turn_log || []).forEach(function(turn) {
        out.push(eventRow(importId, idx, turn.turn || turn.number || null, 'turn_snapshot', {
          replay_index: replayIndex,
          replay_id: replay.id || null,
          turn: turn
        }, 'medium', turn.turn || turn.number || null));
        idx += 1;
      });
    });
    return out;
  }

  function parseJsonArtifact(text, opts, sourceType) {
    var sourceGaps = [sourceGap(PROMOTION_BLOCK, 'Private import rows are not official Team Lab ranking or global learning truth.', 'trusted worker required')];
    var warnings = [];
    var payload;
    try {
      payload = JSON.parse(str(text));
    } catch (err) {
      warnings.push(sourceGap('JSON_PARSE_FAILED', err.message, 'uploaded file'));
      return { ok: false, import_row: baseImportRow(text, opts, sourceType || 'unknown', sourceGaps, warnings, 0, true), refs: [], events: [], source_gaps: sourceGaps, warnings: warnings };
    }
    var evidence = null;
    if (root.SimEvidence && typeof root.SimEvidence.createSimEvidenceFromArtifact === 'function') {
      evidence = root.SimEvidence.createSimEvidenceFromArtifact(payload, opts || {});
      if (!evidence.ok) warnings = warnings.concat(evidence.errors || []);
      sourceGaps = sourceGaps.concat(evidence.source_gaps || []);
    } else {
      warnings.push(sourceGap('SIM_EVIDENCE_ADAPTER_MISSING', 'SimEvidence adapter is not loaded.', 'SimEvidence.createSimEvidenceFromArtifact'));
    }
    var events = evidence && evidence.ok ? artifactEventsFromEvidence(evidence, 'import-id-after-insert') : [];
    if (opts && opts._personal_team_match) {
      sourceGaps.push(sourceGap(
        opts._personal_team_match.match_type === 'manual_reference_team' ? 'PERSONAL_TEAM_MANUAL_REFERENCE' : 'PERSONAL_TEAM_FILENAME_MATCH',
        opts._personal_team_match.match_type === 'manual_reference_team'
          ? 'User selected a personal/custom team for private Pilot-room grouping only.'
          : 'Import filename matched a personal/custom team name for private Pilot-room grouping only.',
        opts._personal_team_match.source_filename
      ));
    }
    var row = baseImportRow(text, opts, sourceType || sourceTypeForText(text, opts && opts.filename), sourceGaps, warnings, events.length, evidence && !evidence.ok);
    row.regulation_id = row.regulation_id || (evidence && evidence.sim_job && evidence.sim_job.regulation_id) || (evidence && evidence.replay_records && evidence.replay_records[0] && evidence.replay_records[0].regulation_id) || '';
    row.format = row.format || (evidence && evidence.sim_job && evidence.sim_job.format) || (evidence && evidence.replay_records && evidence.replay_records[0] && evidence.replay_records[0].format) || '';
    row.engine_version = row.engine_version || (evidence && evidence.sim_job && evidence.sim_job.engine_version) || (evidence && evidence.replay_records && evidence.replay_records[0] && evidence.replay_records[0].engine_version) || '';
    row.ruleset_version = row.ruleset_version || (evidence && evidence.sim_job && evidence.sim_job.ruleset_version) || (evidence && evidence.replay_records && evidence.replay_records[0] && evidence.replay_records[0].ruleset_version) || '';
    return {
      ok: !!(evidence && evidence.ok),
      import_row: row,
      refs: refsForImport('import-id-after-insert', evidence).concat(personalTeamRefs('import-id-after-insert', opts && opts._personal_team_match)),
      events: events,
      source_gaps: sourceGaps,
      warnings: warnings,
      evidence: evidence
    };
  }

  function parseShowdown(text, opts, sourceType) {
    var sourceGaps = [sourceGap(PROMOTION_BLOCK, 'Private import rows are not official Team Lab ranking or global learning truth.', 'trusted worker required')];
    var warnings = [];
    var normalized = str(text);
    if (root.ChampionsSim && root.ChampionsSim.replayCoach && typeof root.ChampionsSim.replayCoach.normalizeReplayLogInput === 'function') {
      normalized = root.ChampionsSim.replayCoach.normalizeReplayLogInput(text);
    }
    var parsed = null;
    if (root.ChampionsSim && root.ChampionsSim.replayCoach && typeof root.ChampionsSim.replayCoach.parseShowdownLog === 'function') {
      parsed = root.ChampionsSim.replayCoach.parseShowdownLog(normalized, opts || {});
      warnings = warnings.concat(parsed.warnings || []);
    } else {
      warnings.push(sourceGap('REPLAY_COACH_PARSER_MISSING', 'Battle Sensei replay parser is not loaded.', 'replay_coach.js'));
    }
    if (opts && opts._personal_team_match) {
      sourceGaps.push(sourceGap(
        opts._personal_team_match.match_type === 'manual_reference_team' ? 'PERSONAL_TEAM_MANUAL_REFERENCE' : 'PERSONAL_TEAM_FILENAME_MATCH',
        opts._personal_team_match.match_type === 'manual_reference_team'
          ? 'User selected a personal/custom team for private Pilot-room grouping only.'
          : 'Import filename matched a personal/custom team name for private Pilot-room grouping only.',
        opts._personal_team_match.source_filename
      ));
    } else {
      sourceGaps.push(sourceGap('TEAM_MAPPING_NEEDS_REVIEW', 'Replay player/team identities must be mapped to trainer/team records before aggregation.', 'team_mapping_status'));
    }
    sourceGaps.push(sourceGap('SHOWDOWN_REPLAY_NOT_CHAMPION_RULE_TRUTH', 'Showdown replay imports are review evidence, not official Champion legality or mechanics truth.', 'source_type'));
    var events = parsed ? showdownEventsFromParsed(parsed, 'import-id-after-insert') : [];
    var row = baseImportRow(text, opts, sourceType || sourceTypeForText(text, opts && opts.filename), sourceGaps, warnings, events.length, parsed && !parsed.ok);
    row.format = row.format || (parsed && parsed.format) || '';
    return {
      ok: !!(parsed && parsed.ok),
      import_row: row,
      refs: personalTeamRefs('import-id-after-insert', opts && opts._personal_team_match),
      events: events,
      source_gaps: sourceGaps,
      warnings: warnings,
      parsed: parsed
    };
  }

  function buildReplayImportPayload(input, opts) {
    opts = opts || {};
    var text = typeof input === 'string' ? input : str(input && (input.text || input.content || input.body));
    var filename = clean(opts.filename || opts.source_filename || (input && input.filename));
    var sourceType = clean(opts.source_type || sourceTypeForText(text, filename));
    opts = Object.assign({}, opts, { filename: filename, source_filename: filename });
    opts._personal_team_match = findExplicitPersonalTeamMatch(opts) || findPersonalTeamMatch(filename, opts);
    if (sourceType === 'qa_artifact' || sourceType === 'champions_turn_log') return parseJsonArtifact(text, opts, sourceType);
    if (sourceType === 'showdown_html' || sourceType === 'showdown_text') return parseShowdown(text, opts, sourceType);
    var sourceGaps = [
      sourceGap(PROMOTION_BLOCK, 'Private import rows are not official Team Lab ranking or global learning truth.', 'trusted worker required'),
      sourceGap('SOURCE_TYPE_UNSUPPORTED', 'Uploaded file type is not recognized by the private parser service.', filename || 'uploaded file')
    ];
    var row = baseImportRow(text, opts, 'unknown', sourceGaps, sourceGaps, 0, true);
    return { ok: false, import_row: row, refs: [], events: [], source_gaps: sourceGaps, warnings: sourceGaps };
  }

  function createReplayImportService(adapter) {
    var db = adapter || {};
    return {
      buildReplayImportPayload: buildReplayImportPayload,
      saveReplayImport: function(input, opts) {
        var payload = buildReplayImportPayload(input, opts || {});
        if (!db.saveReplayImport) return Promise.resolve(payload);
        return db.saveReplayImport(payload).then(function(saved) {
          return Object.assign({}, payload, { saved: saved });
        });
      },
      saveTrustedReplayImport: function(input, opts) {
        var payload = buildReplayImportPayload(input, opts || {});
        if (db.saveTrustedReplayImport) {
          return db.saveTrustedReplayImport(payload, opts || {}).then(function(saved) {
            return Object.assign({}, payload, { saved: saved });
          });
        }
        if (db.prepareTrustedReplayImport) {
          return db.prepareTrustedReplayImport(payload, opts || {}).then(function(prepared) {
            if (!db.saveReplayImport) return prepared;
            return db.saveReplayImport(prepared).then(function(saved) {
              return Object.assign({}, prepared, { saved: saved });
            });
          });
        }
        return Promise.resolve(payload);
      }
    };
  }

  var api = {
    PARSER_VERSION: PARSER_VERSION,
    PROMOTION_BLOCK: PROMOTION_BLOCK,
    sourceTypeForText: sourceTypeForText,
    normalizeTeamName: normalizeTeamName,
    findPersonalTeamMatch: findPersonalTeamMatch,
    findExplicitPersonalTeamMatch: findExplicitPersonalTeamMatch,
    buildReplayImportPayload: buildReplayImportPayload,
    createReplayImportService: createReplayImportService
  };

  ChampionsSim.replayImportService = api;
  root.ReplayImportService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
