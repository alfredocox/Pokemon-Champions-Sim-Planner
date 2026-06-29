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
  };

  root.SimEvidence = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
