// supabase_adapter.js — Champions Sim v1 (M3: init / source-of-truth)
// Thin Supabase layer. Falls back to local silently if credentials missing or disabled.
// Load AFTER data.js, engine.js, ui.js — and AFTER supabase-js CDN script.
//
// Credentials injected via window.__SUPABASE_URL__ and window.__SUPABASE_KEY__
// Set these in index.html <script> block — do NOT hardcode here.
//   Original cred wiring: 2026-04-27 by TheYfactora12 (commit 001b37b)
//   Security hardening:   2026-04-27 by TheYfactora12 (commit effad08) —
//                         removed hardcoded fallbacks; inject at runtime only.
//   M3 refactor:          2026-04-27 — adds __DISABLE_SUPABASE__ test override,
//                                      loadRulesets(), explicit init contract.
//                                      Ownership of TEAMS-merge moved to ui.js.

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  // Credentials must be injected at runtime — no hardcoded fallbacks.
  // In index.html, add before this script loads:
  //
  //     window.__SUPABASE_URL__ = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  //     window.__SUPABASE_KEY__ = '<your-anon-key>';
  //
  // (See index.html credential block for the full inline snippet.)
  //
  // Tests / sandboxes can also set window.__DISABLE_SUPABASE__ = true to force
  // the adapter into local-only mode regardless of injected creds (defense-in-
  // depth: even if a future change re-introduces hardcoded creds, this flag
  // still wins).
  const DISABLED = !!(typeof window !== 'undefined' && window.__DISABLE_SUPABASE__);

  const SUPABASE_URL = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_URL__ : undefined);
  const SUPABASE_KEY = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_KEY__ : undefined);
  const ENABLED = !!(SUPABASE_URL && SUPABASE_KEY) && !DISABLED;
  const log = (typeof window !== 'undefined' && window.ChampionsSim && window.ChampionsSim.logger)
    ? window.ChampionsSim.logger.for('persistence')
    : { debug(){}, info(){}, warn(){}, error(){} };

  // Canonical ruleset_id — must match seed_teams_v2.sql (M2)
  const DEFAULT_RULESET_ID = 'champions_reg_m_doubles_bo3';
  const TEAM_LAB_SIM_JOBS_TABLE = 'team_lab_sim_jobs';
  const TEAM_LAB_REPLAYS_TABLE = 'team_lab_replays';
  const TEAM_LAB_TEAM_KEY_MAPPINGS_TABLE = 'team_lab_team_key_mappings';
  const TRAINER_REPLAY_IMPORTS_TABLE = 'trainer_replay_imports';
  const TRAINER_REPLAY_IMPORT_REFS_TABLE = 'trainer_replay_import_refs';
  const TRAINER_REPLAY_IMPORT_EVENTS_TABLE = 'trainer_replay_import_events';

  if (!ENABLED) {
    log.info('No credentials; running in local-only mode');
  }

  // ── Supabase client ───────────────────────────────────────────────────────
  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!ENABLED) return null;
    if (typeof window.supabase === 'undefined') {
      log.warn('supabase-js not loaded');
      return null;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  // ── UUID helper ───────────────────────────────────────────────────────────
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function normalizeDbError(err) {
    if (!err) return null;
    if (typeof err === 'string') return err;

    function attachParsedBody(errObject, target) {
      if (!errObject || typeof errObject !== 'object') return;

      if (errObject.body !== undefined) {
        target.body = safeJsonForDb(errObject.body, null);
        if (typeof target.body === 'string') {
          var trimmedBody = target.body.trim();
          if (trimmedBody.indexOf('{') === 0 || trimmedBody.indexOf('[') === 0) {
            var parsedBody = safeJsonForDb(tryParseJson(trimmedBody), null);
            if (parsedBody !== null) target.body_json = parsedBody;
          }
        }
        return;
      }

      if (errObject.response && errObject.response.body !== undefined) {
        target.response_body = safeJsonForDb(errObject.response.body, null);
      }

      if (errObject.response && errObject.response.text !== undefined) {
        if (typeof errObject.response.text === 'string') {
          target.response_text = safeTextForDb(errObject.response.text, null);
        } else {
          target.response_text = '[unreadable-response-text-function]';
        }
      }

      if (errObject.response && typeof errObject.response.status !== 'undefined') {
        target.response_status = safeTextForDb(errObject.response.status, null);
      }

      if (errObject.response && errObject.response.statusText !== undefined) {
        target.response_status_text = safeTextForDb(errObject.response.statusText, null);
      }
    }

    function tryParseJson(rawText) {
      if (typeof rawText !== 'string') return rawText;
      try {
        return JSON.parse(rawText);
      } catch (_parseErr) {
        return rawText;
      }
    }

    function setIfEmptyMessage(target, candidate) {
      if (target.message) return;
      if (!candidate) return;
      if (typeof candidate === 'string') {
        var trimmed = candidate.trim();
        if (trimmed) {
          target.message = trimmed;
          return;
        }
      }
      if (candidate && typeof candidate === 'object' && candidate.message) {
        var candidateMessage = safeTextForDb(candidate.message, null);
        if (candidateMessage) {
          var trimmedCandidateMessage = candidateMessage.trim();
          if (trimmedCandidateMessage) {
            target.message = trimmedCandidateMessage;
          }
        }
      }
      if (!target.message && typeof candidate === 'function') {
        try {
          var candidateText = safeTextForDb(candidate(), null);
          if (candidateText) {
            var trimmedCandidateText = candidateText.trim();
            if (trimmedCandidateText) {
              target.message = trimmedCandidateText;
            }
          }
        } catch (_toStringErr) {
          // ignore; best-effort message extraction
        }
      }
    }

    var details = {
      name: err.name || null,
      message: err.message || null,
      error: err.error || null,
      code: err.code || null,
      details: err.details || null,
      hint: err.hint || null,
      status: err.status || null,
      statusText: err.statusText || null
    };

    if (err.cause) {
      details.cause = normalizeDbError(err.cause);
    }
    if (typeof err.stack === 'string') {
      details.stack = err.stack;
    }
    if (err.context) {
      details.context = safeJsonForDb(err.context, null);
    }
    if (!details.message && err.response && err.response.text) {
      details.message = safeTextForDb(err.response.text, null);
    }

    setIfEmptyMessage(details, err.message);
    setIfEmptyMessage(details, err.msg);
    setIfEmptyMessage(details, err.description);
    setIfEmptyMessage(details, err.body);
    setIfEmptyMessage(details, err.error && err.error.message);
    setIfEmptyMessage(details, err.cause && err.cause.message);
    setIfEmptyMessage(details, err.toString && err.toString());

    if (err.details) details.api_details = safeJsonForDb(err.details, safeTextForDb(err.details, null));
    if (err.hint) details.api_hint = safeTextForDb(err.hint, null);
    if (err.code && (!details.code || !String(details.code).trim())) details.code = safeTextForDb(err.code, null);

    attachParsedBody(err, details);
    if (err.cause) {
      attachParsedBody(err.cause, details);
      details.cause = normalizeDbError(err.cause);
    }
    if (err.error) {
      if (typeof err.error === 'string' || (err.error && typeof err.error === 'object')) {
        details.nested_error = normalizeDbError(err.error);
      }
    }

    var hasValue = false;
    Object.keys(details).forEach(function(key) {
      if (details[key] !== null && details[key] !== undefined && details[key] !== '') {
        hasValue = true;
      }
    });
    if (hasValue) {
      if (details.message && typeof details.message === 'string') {
        details.message = details.message.trim();
      }
      if (typeof details.message === 'string' && !details.message) {
        details.message = null;
      }
      if (!details.message && (details.error || details.cause || details.nested_error)) {
        var fallbackMessage = safeTextForDb(details.error || details.cause || details.nested_error, null);
        if (fallbackMessage) details.message = fallbackMessage;
      }
      if (!details.message) {
        details.message = 'Database operation error';
      }
      if (!details.raw) {
        var rawErrFromHasValue = safeJsonForDb(err, null);
        if (rawErrFromHasValue) details.raw = rawErrFromHasValue;
      }
      return details;
    }

    try {
      return JSON.parse(JSON.stringify(err));
    } catch (_e) {
      var rawErr = safeJsonForDb(err, null);
      return {
        message: 'Database operation error',
        raw: rawErr !== null ? rawErr : safeTextForDb(err, null)
      };
    }
  }

  function safeJsonForDb(value, fallbackValue) {
    if (value === undefined || value === null) return fallbackValue;
    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return fallbackValue;
    if (typeof value === 'number' && !Number.isFinite(value)) return fallbackValue;
    if (value instanceof Date) return value.toISOString();

    try {
      var serialized = JSON.stringify(value);
      if (typeof serialized !== 'string') return fallbackValue;
      return JSON.parse(serialized);
    } catch (_err) {
      return fallbackValue;
    }
  }

  function safeTextForDb(value, fallbackValue) {
    if (value === undefined || value === null) return fallbackValue;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return String(value);
    } catch (_err) {
      return fallbackValue;
    }
  }

  function safeIntForDb(value, fallbackValue) {
    var normalized = Number(value);
    if (!Number.isFinite(normalized)) return fallbackValue;
    return Math.round(normalized);
  }

  function sanitizeBranchKey(rawBranchKey) {
    var normalized = safeTextForDb(rawBranchKey, null);
    if (!normalized) return null;
    return normalized;
  }

  function stripJsonbForDb(value, fallbackValue) {
    if (typeof fallbackValue === 'undefined') {
      fallbackValue = {};
    }
    var safeValue = safeJsonForDb(value, null);
    if (safeValue === null || safeValue === undefined) {
      return fallbackValue;
    }
    if (Array.isArray(safeValue) || typeof safeValue === 'object') {
      return safeValue;
    }
    return fallbackValue;
  }

  function buildBranchCoverageRow(run, payload, includeCoverageSummary, defaultRunCount, defaultDriftCount) {
    includeCoverageSummary = includeCoverageSummary !== false;
    var rowBranchKey = sanitizeBranchKey(run.branch_key);
    if (rowBranchKey == null) return null;

    var row = {
      branch_key: rowBranchKey,
      ruleset_id: safeTextForDb(payload.ruleset_id || run.ruleset_id || DEFAULT_RULESET_ID, DEFAULT_RULESET_ID),
      player_team_id: safeTextForDb(payload.player_team_id || run.player_team_id, null),
      opponent_team_id: safeTextForDb(payload.opponent_team_id || run.opponent_team_id, null),
      player_leads: stripJsonbForDb(Array.isArray(run.player_bring) ? run.player_bring.slice(0, 2) : [], []),
      opponent_leads: stripJsonbForDb(Array.isArray(run.opponent_bring) ? run.opponent_bring.slice(0, 2) : [], []),
      player_bring: stripJsonbForDb(Array.isArray(run.player_bring) ? run.player_bring : [], []),
      opponent_bring: stripJsonbForDb(Array.isArray(run.opponent_bring) ? run.opponent_bring : [], []),
      forced_actions: stripJsonbForDb(Array.isArray(run.forced_actions) ? run.forced_actions : [], []),
      tactical_summary: stripJsonbForDb(run.tactical_summary, {}),
      result: safeTextForDb(run.result, null),
      turns: Number.isFinite(Number(run.turns)) ? Number(run.turns) : 0,
      outcome_signature: safeTextForDb(run.outcome_signature, null),
      run_count: safeIntForDb(defaultRunCount, 1),
      outcome_drift_count: safeIntForDb(defaultDriftCount, 0),
      build_id: safeTextForDb(payload.build_id, null),
      source_url: safeTextForDb(payload.source_url, null),
      last_seen_at: new Date().toISOString()
    };

    if (includeCoverageSummary) {
      row.qa_coverage_summary = stripJsonbForDb(run.qa_coverage_summary, {});
    }

    return row;
  }

  function buildMinimalBranchCoverageRow(run, payload) {
    var row = {
      branch_key: sanitizeBranchKey(run.branch_key),
      ruleset_id: safeTextForDb(payload.ruleset_id || run.ruleset_id || DEFAULT_RULESET_ID, DEFAULT_RULESET_ID),
      player_team_id: safeTextForDb(payload.player_team_id || run.player_team_id, null),
      opponent_team_id: safeTextForDb(payload.opponent_team_id || run.opponent_team_id, null),
      player_bring: stripJsonbForDb(Array.isArray(run.player_bring) ? run.player_bring : [], []),
      opponent_bring: stripJsonbForDb(Array.isArray(run.opponent_bring) ? run.opponent_bring : [], []),
      forced_actions: stripJsonbForDb(Array.isArray(run.forced_actions) ? run.forced_actions : [], []),
      result: safeTextForDb(run.result, null),
      turns: Number.isFinite(Number(run.turns)) ? Number(run.turns) : 0,
      outcome_signature: safeTextForDb(run.outcome_signature, null),
      run_count: 1,
      outcome_drift_count: 0,
      build_id: safeTextForDb(payload.build_id, null),
      source_url: safeTextForDb(payload.source_url, null),
      last_seen_at: new Date().toISOString()
    };
    return row;
  }

  function asIntFallback(value, fallbackValue) {
    var parsed = safeIntForDb(value, null);
    if (Number.isFinite(parsed)) return parsed;
    return fallbackValue;
  }

  function branchCoverageError(err, context) {
    var normalized = normalizeDbError(err);
    normalized = safeJsonForDb(normalized, null);
    if (!normalized || typeof normalized !== 'object') {
      normalized = {};
    }
    if (!normalized.message) {
      var messageCandidates = [
        err && err.message,
        err && err.error && err.error.message,
        err && err.msg,
        err && err.description,
        err && err.body,
        err && err.toString && err.toString()
      ];
      for (var m = 0; m < messageCandidates.length; m++) {
        var msg = safeTextForDb(messageCandidates[m], null);
        if (msg && msg.trim()) {
          normalized.message = msg.trim();
          break;
        }
      }
      if (!normalized.message) {
        normalized.message = 'Database operation failed';
      }
    }
    if (typeof normalized.message === 'string') {
      normalized.message = normalized.message.trim();
      if (!normalized.message) {
        normalized.message = 'Database operation failed';
      }
    }
    if (!normalized.message) {
      var rawTextForMessage = safeTextForDb(normalized.raw || normalized.raw_text, null);
      if (!rawTextForMessage && err) {
        rawTextForMessage = safeTextForDb(err, null);
      }
      if (!rawTextForMessage && err && err.message === '') {
        rawTextForMessage = 'Database operation failed';
      }
      if (rawTextForMessage) {
        normalized.message = rawTextForMessage.length > 256 ? rawTextForMessage.slice(0, 256) + '...' : rawTextForMessage;
      }
      if (!normalized.message) {
        normalized.message = 'Database operation failed';
      }
    }

    if (err && err.context && err.context.code === 23505) {
      normalized.message = 'Supabase conflict while saving branch coverage';
    }
    if (typeof normalized.status === 'undefined' && err && err.status) {
      normalized.status = safeTextForDb(err.status, null);
    }
    if (typeof normalized.statusText === 'undefined' && err && err.statusText) {
      normalized.statusText = safeTextForDb(err.statusText, null);
    }

    if (!normalized.raw) {
      normalized.raw = safeJsonForDb(err, null);
    }
    if (!normalized.raw_text) {
      normalized.raw_text = safeTextForDb(err, null);
    }

    if (!context) return normalized;
    var contextWrapped = safeJsonForDb(context, {});
    var out = Object.create(null);
    Object.keys(normalized).forEach(function(key) {
      out[key] = normalized[key];
    });
    Object.keys(contextWrapped).forEach(function(key) {
      out[key] = contextWrapped[key];
    });
    return out;
  }

  async function loadExistingBranchCoverageRows(sb, runKeys) {
    var table = 'branch_coverage_runs';
    var columns = 'branch_key,run_count,outcome_signature,outcome_drift_count';

    if (!runKeys.length) return [];
    var chunkSize = 120;
    var allKeys = [];
    var keySeen = Object.create(null);

    try {
      for (var keyIndex = 0; keyIndex < runKeys.length; keyIndex++) {
        var key = safeTextForDb(runKeys[keyIndex], null);
        if (key == null) continue;
        if (!Object.prototype.hasOwnProperty.call(keySeen, key)) {
          keySeen[key] = true;
          allKeys.push(key);
        }
      }

      if (!allKeys.length) return [];

      var foundRows = [];
      for (var i = 0; i < allKeys.length; i += chunkSize) {
        var chunk = allKeys.slice(i, i + chunkSize);
        try {
          var selectResult = await sb
            .from(table)
            .select(columns)
            .in('branch_key', chunk);
          if (selectResult.error) throw selectResult.error;
          if (selectResult.data && selectResult.data.length) {
            foundRows = foundRows.concat(selectResult.data);
          }
          continue;
        } catch (_inErr) {
          log.warn('loadExistingBranchCoverageRows chunked in() lookup failed; falling back to per-key eq', {
            chunk_index: i,
            chunk_size: chunk.length,
            attempted_keys: chunk
          });
        }

        for (var k = 0; k < chunk.length; k++) {
          var fallbackKey = chunk[k];
          try {
            var rowResult = await sb
              .from(table)
              .select(columns)
              .eq('branch_key', fallbackKey);
            if (rowResult && rowResult.data && rowResult.data.length) {
              foundRows = foundRows.concat(rowResult.data);
            }
          } catch (_e) {
            // continue; saving later will upsert new rows safely
          }
        }
      }
      return foundRows;
    } catch (err) {
      log.warn('loadExistingBranchCoverageRows failed; proceeding with empty existing cache', err);
      return [];
    }
  }

  let lastTeamLoadStatus = {
    state: 'idle',
    detail: 'Team DB has not been checked yet.',
    checked_at: null,
    teams: 0,
    members: 0
  };

  function setLastTeamLoadStatus(status) {
    lastTeamLoadStatus = Object.assign({
      state: 'unknown',
      detail: '',
      checked_at: new Date().toISOString(),
      teams: 0,
      members: 0
    }, status || {});
    return lastTeamLoadStatus;
  }

  function getLastTeamLoadStatus() {
    return Object.assign({}, lastTeamLoadStatus);
  }

  // ── loadTeamsFromDB ───────────────────────────────────────────────────────
  // Returns {[team_id]: {team_id, name, label, description, source, metadata, members[]}}
  // or null if disabled / errored. NEVER throws.
  async function loadTeamsFromDB() {
    const sb = getClient();
    if (!sb) {
      setLastTeamLoadStatus({ state: 'disabled', detail: 'Supabase client unavailable or disabled.' });
      return null;
    }
    try {
      const { data: teams, error: tErr } = await sb
        .from('teams')
        .select('*');
      if (tErr) throw tErr;

      const { data: members, error: mErr } = await sb
        .from('team_members')
        .select('*')
        .order('slot', { ascending: true });
      if (mErr) throw mErr;

      const memberMap = {};
      for (const m of (members || [])) {
        if (!memberMap[m.team_id]) memberMap[m.team_id] = [];
        memberMap[m.team_id].push({
          name:     m.species,
          item:     m.item      || '',
          ability:  m.ability   || '',
          nature:   m.nature    || '',
          level:    m.level     || 50,
          evs:      m.evs       || {},
          moves:    m.moves     || [],
          teraType: m.tera_type || '',
          role:     m.role_tag  || ''
        });
      }

      const result = {};
      for (const t of (teams || [])) {
        const rulesetId = t.ruleset_id || (t.metadata && t.metadata.ruleset_id) || DEFAULT_RULESET_ID;
        result[t.team_id] = {
          team_id:     t.team_id,
          name:        t.name,
          label:       t.label,
          description: t.description,
          source:      t.source,
          ruleset_id:  rulesetId,
          format:      t.format || 'champions',
          legality_status: t.legality_status || 'legal_inferred',
          metadata:    Object.assign({ ruleset_id: rulesetId }, t.metadata || {}),
          members:     memberMap[t.team_id] || []
        };
      }
      const teamCount = Object.keys(result).length;
      setLastTeamLoadStatus({
        state: teamCount ? 'connected' : 'empty',
        detail: teamCount ? 'Live team database returned teams.' : 'Live team database returned zero teams.',
        teams: teamCount,
        members: (members || []).length
      });
      log.info('Loaded teams from DB', { count: teamCount });
      return result;
    } catch (err) {
      setLastTeamLoadStatus({
        state: 'error',
        detail: (err && (err.message || err.code)) ? String(err.message || err.code) : 'Unknown Supabase read error.'
      });
      log.warn('loadTeamsFromDB failed; using local data', err);
      return null;
    }
  }

  // ── loadRulesets ──────────────────────────────────────────────────────────
  // Returns array of ruleset rows (or [] if disabled / errored). NEVER throws.
  async function loadRulesets() {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('rulesets')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      log.warn('loadRulesets failed', err);
      return [];
    }
  }

  // ── saveAnalysis ──────────────────────────────────────────────────────────
  const VALID_BO = [1, 3, 5, 10];

  async function saveAnalysis(payload) {
    const sb = getClient();
    if (!sb) return null;

    if (!payload || VALID_BO.indexOf(payload.bo) === -1) {
      log.warn('saveAnalysis rejected: invalid bo', { bo: payload && payload.bo });
      return null;
    }
    if (!payload.policy_model || typeof payload.policy_model !== 'string') {
      log.warn('saveAnalysis rejected: policy_model must be non-empty string');
      return null;
    }
    if (typeof payload.win_rate === 'number' && (payload.win_rate < 0 || payload.win_rate > 1)) {
      log.warn('saveAnalysis rejected: win_rate out of range', { win_rate: payload.win_rate });
      return null;
    }

    const provenance = payload.analysis_json && payload.analysis_json.provenance;
    const evidencePolicy = typeof window.getSimulationEvidencePolicy === 'function'
      ? window.getSimulationEvidencePolicy(provenance, payload.analysis_json && payload.analysis_json.game_provenance) : null;
    if (!evidencePolicy || !evidencePolicy.runtime_promotable || evidencePolicy.provenance_gaps.length ||
        provenance.player_team_id !== payload.player_team_id || provenance.opp_team_id !== payload.opp_team_id ||
        provenance.bo !== payload.bo || provenance.ruleset_id !== payload.ruleset_id ||
        provenance.engine_version !== payload.engine_version || provenance.policy_model !== payload.policy_model ||
        provenance.format !== payload.format ||
        payload.poisoning_guard === 'identity_mismatch_do_not_train_or_rank') {
      log.warn('saveAnalysis quarantined: missing or conflicting execution provenance');
      return null;
    }

    const analysis_id = uuid();
    const row = {
      analysis_id,
      engine_version:    provenance.engine_version,
      ruleset_id:        provenance.ruleset_id,
      player_team_id:    payload.player_team_id,
      opp_team_id:       payload.opp_team_id,
      prior_id:          payload.prior_id          || null,
      policy_model:      payload.policy_model      || 'random',
      sample_size:       payload.sample_size       || 0,
      bo:                payload.bo                || 1,
      win_rate:          payload.win_rate          || 0,
      wins:              payload.wins              || 0,
      losses:            payload.losses            || 0,
      draws:             payload.draws             || 0,
      avg_turns:         payload.avg_turns         || 0,
      avg_tr_turns:      payload.avg_tr_turns      || 0,
      ci_low:            payload.ci_low            || null,
      ci_high:           payload.ci_high           || null,
      hidden_info_model: payload.hidden_info_model  || null,
      analysis_json:     Object.assign({}, payload.analysis_json, { evidence_policy: evidencePolicy })
    };

    try {
      const { error: aErr } = await sb.from('analyses').insert(row);
      if (aErr) throw aErr;

      if (payload.win_conditions && payload.win_conditions.length) {
        const wcRows = payload.win_conditions.map(wc => ({
          analysis_id,
          label: wc.label,
          count: wc.count
        }));
        const { error: wcErr } = await sb.from('analysis_win_conditions').insert(wcRows);
        if (wcErr) log.warn('win_conditions insert error', wcErr);
      }

      if (payload.logs && payload.logs.length) {
        const logRows = payload.logs.slice(0, 50).map((l, i) => ({
          analysis_id,
          log_index:     i,
          result:        l.result        || 'unknown',
          turns:         l.turns         || 0,
          tr_turns:      l.tr_turns      || 0,
          win_condition: l.win_condition || null,
          log:           l.log           || {}
        }));
        const { error: lErr } = await sb.from('analysis_logs').insert(logRows);
        if (lErr) log.warn('logs insert error', lErr);
      }

      log.info('Saved analysis', { analysis_id });
      return analysis_id;
    } catch (err) {
      log.warn('saveAnalysis failed; result not persisted', err);
      return null;
    }
  }

  function analysisWithEvidence(row) {
    const provenance = row.analysis_json && row.analysis_json.provenance;
    const policy = typeof window.getSimulationEvidencePolicy === 'function'
      ? window.getSimulationEvidencePolicy(provenance, row.analysis_json && row.analysis_json.game_provenance)
      : { learning_eligibility: 'blocked_missing_provenance', poisoning_guard: 'unverified_evidence_do_not_train_or_rank' };
    if (provenance && (provenance.engine_version !== row.engine_version || provenance.ruleset_id !== row.ruleset_id ||
        provenance.player_team_id !== row.player_team_id || provenance.opp_team_id !== row.opp_team_id || provenance.bo !== row.bo ||
        provenance.policy_model !== row.policy_model)) {
      policy.learning_eligibility = 'blocked_identity_mismatch';
      policy.poisoning_guard = 'identity_mismatch_do_not_train_or_rank';
      policy.data_policy = 'do_not_write_trusted_stats';
      policy.coaching_policy = 'review_only_no_matchup_learning';
    }
    return Object.assign({}, row, { format: provenance && provenance.format || 'unknown', evidence_policy: policy });
  }

  // ── loadRecentAnalyses ────────────────────────────────────────────────────
  async function loadRecentAnalyses(limit) {
    limit = limit || 20;
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analyses')
        .select('analysis_id, created_at, player_team_id, opp_team_id, bo, win_rate, wins, losses, sample_size, engine_version, ruleset_id, policy_model, analysis_json')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(analysisWithEvidence);
    } catch (err) {
      log.warn('loadRecentAnalyses failed', err);
      return [];
    }
  }

  // ── saveTeam (M5) ────────────────────────────────────────────────────────
  async function saveTeam(payload) {
    const sb = getClient();
    if (!sb) return null;

    if (!payload || !payload.team_id || !payload.name) {
      log.warn('saveTeam rejected: team_id and name required');
      return null;
    }

    const teamRow = {
      team_id:     payload.team_id,
      name:        payload.name,
      label:       payload.label        || 'CUSTOM',
      mode:        payload.mode         || 'opponent',
      ruleset_id:  payload.ruleset_id   || DEFAULT_RULESET_ID,
      source:      payload.source       || 'unknown',
      description: payload.description  || '',
      metadata:    payload.metadata     || { source: payload.source || 'unknown' }
    };

    try {
      const { error: tErr } = await sb.from('teams').upsert(teamRow);
      if (tErr) throw tErr;

      // Delete existing members then re-insert (normalized replace)
      const deleteResult = await sb.from('team_members').delete().eq('team_id', payload.team_id);
      if (deleteResult && deleteResult.error) throw deleteResult.error;

      if (payload.members && payload.members.length) {
        const memberRows = payload.members.map(function(m, i) {
          return {
            team_id:    payload.team_id,
            slot:       i + 1,
            species:    m.species || m.name || 'Unknown',
            ability:    m.ability || null,
            item:       m.item    || null,
            nature:     m.nature  || null,
            evs:        m.evs     || null,
            moves:      m.moves   || [],
            level:      m.level   || 50,
            tera_type:  m.tera_type || m.teraType || null
          };
        });
        const { error: mErr } = await sb.from('team_members').insert(memberRows);
        if (mErr) throw mErr;
      }

      log.info('Saved team', { team_id: payload.team_id });
      return payload.team_id;
    } catch (err) {
      log.warn('saveTeam failed; team not persisted', err);
      return null;
    }
  }

  // ── loadAnalysesForPlayer (M6) ───────────────────────────────────────────
  async function loadAnalysesForPlayer(playerKey, limit) {
    limit = limit || 50;
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analyses')
        .select('analysis_id, created_at, player_team_id, opp_team_id, bo, win_rate, wins, losses, sample_size, engine_version, ruleset_id, policy_model, analysis_json')
        .eq('player_team_id', playerKey)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(analysisWithEvidence);
    } catch (err) {
      log.warn('loadAnalysesForPlayer failed', err);
      return [];
    }
  }

  // ── loadAnalysisLogs (M6) — lazy-load turn logs for a single analysis ──
  async function loadAnalysisLogs(analysisId) {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analysis_logs')
        .select('log_index, result, turns, tr_turns, win_condition, log')
        .eq('analysis_id', analysisId)
        .order('log_index', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      log.warn('loadAnalysisLogs failed', err);
      return [];
    }
  }

  // ── M8: Load prior snapshot for hidden-info inference ───────────────────
  // Returns the most recent prior_snapshots row for the given format where
  // month ≤ targetMonth. Returns null if none found or on error (fail-soft).
  async function loadPriorSnapshot(format, targetMonth) {
    var sb = getClient();
    if (!sb) return null;
    try {
      var { data, error } = await sb
        .from('prior_snapshots')
        .select('*')
        .eq('format', format)
        .lte('month', targetMonth)
        .order('month', { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data || null;
    } catch (err) {
      log.warn('loadPriorSnapshot failed', err);
      return null;
    }
  }

  // ── Showdown DB status probe ──────────────────────────────────────────────
  // Lightweight Overview-tab check. It proves whether the approved Showdown
  // views are reachable without loading the full mirrored data set.
  const SHOWDOWN_ENTITY_KINDS = [
    'species',
    'moves',
    'abilities',
    'items',
    'learnsets',
    'formats',
    'aliases',
    'typechart'
  ];

  function normalizeShowdownKind(kind) {
    if (kind === 'moves') return 'move';
    if (kind === 'abilities') return 'ability';
    if (kind === 'items') return 'item';
    if (kind === 'learnsets') return 'learnset';
    if (kind === 'formats') return 'format';
    if (kind === 'aliases') return 'alias';
    return kind;
  }

  async function loadShowdownDbStatus() {
    var sb = getClient();
    if (!sb) {
      return { enabled: false, available: false, mode: 'static', message: 'Static bundle' };
    }
    try {
      var approved = await sb
        .from('approved_showdown_entities')
        .select('entity_kind,entity_key,approved_at')
        .limit(1);
      if (approved.error) throw approved.error;

      var latestRun = null;
      try {
        var runs = await sb
          .from('showdown_sync_runs')
          .select('sync_run_id,status,finished_at,summary')
          .order('finished_at', { ascending: false })
          .limit(1);
        if (!runs.error && runs.data && runs.data.length) latestRun = runs.data[0];
      } catch (_runErr) {
        latestRun = null;
      }

      return {
        enabled: true,
        available: true,
        mode: approved.data && approved.data.length ? 'approved-db' : 'empty-db',
        approvedSample: approved.data && approved.data[0] ? approved.data[0] : null,
        latestRun: latestRun,
        message: approved.data && approved.data.length ? 'Approved DB rows' : 'DB views empty'
      };
    } catch (err) {
      log.warn('loadShowdownDbStatus failed', err);
      return { enabled: true, available: false, mode: 'missing-db', message: 'Showdown DB unavailable' };
    }
  }

  // Read-only inspector for the Overview tab. This intentionally uses only
  // anon-role SELECTs against approved views/audit rows; browser code never
  // uploads, approves, or receives service-role credentials.
  async function loadShowdownDbSnapshot() {
    var sb = getClient();
    if (!sb) {
      return { enabled: false, available: false, mode: 'static', message: 'Static bundle' };
    }
    try {
      var status = await loadShowdownDbStatus();
      if (!status || !status.available) return status;

      var sample = await sb
        .from('approved_showdown_entities')
        .select('sync_run_id,entity_kind,entity_key,display_name,source_hash,approved_at,created_at')
        .order('entity_kind', { ascending: true })
        .order('entity_key', { ascending: true })
        .limit(12);
      if (sample.error) throw sample.error;

      var countResults = await Promise.all(SHOWDOWN_ENTITY_KINDS.map(function(kind) {
        return sb
          .from('approved_showdown_entities')
          .select('entity_id', { count: 'exact', head: true })
          .eq('entity_kind', normalizeShowdownKind(kind))
          .then(function(result) {
            return { kind: kind, count: result && !result.error ? (result.count || 0) : null };
          })
          .catch(function() {
            return { kind: kind, count: null };
          });
      }));

      var sourceFiles = [];
      if (status.latestRun && status.latestRun.sync_run_id) {
        try {
          var files = await sb
            .from('showdown_source_files')
            .select('source_name,source_hash,normalized_hash,byte_size,parse_status,fetched_at')
            .eq('sync_run_id', status.latestRun.sync_run_id)
            .order('source_name', { ascending: true })
            .limit(20);
          if (!files.error && files.data) sourceFiles = files.data;
        } catch (_fileErr) {
          sourceFiles = [];
        }
      }

      return {
        enabled: true,
        available: true,
        mode: status.mode,
        message: status.message,
        latestRun: status.latestRun || null,
        approvedSample: sample.data || [],
        approvedCounts: countResults,
        sourceFiles: sourceFiles
      };
    } catch (err) {
      log.warn('loadShowdownDbSnapshot failed', err);
      return { enabled: true, available: false, mode: 'missing-db', message: 'Showdown DB unavailable' };
    }
  }

  // Read approved Showdown rows for browser-side inspectors and future
  // team-builder validation. Battle simulation still uses the generated
  // static asset first so offline GitHub Pages remains deterministic.
  async function loadShowdownEntities(kind, options) {
    var sb = getClient();
    options = options || {};
    var normalizedKind = normalizeShowdownKind(kind || '');
    var allowedKinds = ['species', 'move', 'ability', 'item', 'typechart', 'alias', 'learnset', 'format'];
    var limit = Number(options.limit || options.maxRows || 5000);
    if (!Number.isFinite(limit) || limit < 1) limit = 5000;
    limit = Math.max(1, Math.min(5000, Math.floor(limit)));

    if (!sb) {
      return { enabled: false, available: false, mode: 'static', message: 'Static bundle', kind: normalizedKind || null, rows: [] };
    }
    if (allowedKinds.indexOf(normalizedKind) === -1) {
      return { enabled: true, available: false, mode: 'invalid-kind', message: 'Invalid Showdown entity kind', kind: normalizedKind || null, rows: [] };
    }

    try {
      var result = await sb
        .from('approved_showdown_entities')
        .select('sync_run_id,entity_kind,entity_key,display_name,source_hash,approved_at,data')
        .eq('entity_kind', normalizedKind)
        .order('entity_key', { ascending: true })
        .limit(limit);
      if (result.error) throw result.error;
      var rows = result.data || [];

      return {
        enabled: true,
        available: rows.length > 0,
        mode: rows.length ? 'approved-db' : 'empty-approved-db',
        message: rows.length ? 'Approved DB rows' : 'DB views empty',
        kind: normalizedKind,
        rows: rows,
        row_count: rows.length,
        limit: limit
      };
    } catch (err) {
      log.warn('loadShowdownEntities failed', err);
      return { enabled: true, available: false, mode: 'missing-db', message: 'Showdown DB unavailable', kind: normalizedKind, rows: [] };
    }
  }

  async function loadBranchCoverageSummary(filters) {
    var sb = getClient();
    if (!sb) return [];
    filters = filters || {};
    try {
      var query = sb
        .from('branch_coverage_runs')
        .select('branch_key,player_team_id,opponent_team_id,player_leads,opponent_leads,player_bring,opponent_bring,forced_actions,tactical_summary,run_count,last_seen_at,result,turns,outcome_signature,outcome_drift_count')
        .order('last_seen_at', { ascending: false })
        .limit(filters.limit || 5000);
      if (filters.player_team_id) query = query.eq('player_team_id', filters.player_team_id);
      if (filters.opponent_team_id) query = query.eq('opponent_team_id', filters.opponent_team_id);
      var result = await query;
      if (result.error) throw result.error;
      return result.data || [];
    } catch (err) {
      log.warn('loadBranchCoverageSummary failed', err);
      return [];
    }
  }

  async function saveBranchCoverageRuns(payload) {
    var sb = getClient();
    if (!sb) return { enabled: false, saved: 0, updated: 0, inserted: 0 };
    payload = payload || {};
    var runs = Array.isArray(payload.runs) ? payload.runs.filter(function(run) {
      return run && run.branch_key;
    }) : [];
    if (!runs.length) return { enabled: true, saved: 0, updated: 0, inserted: 0 };

    try {
      var keys = runs.map(function(run) { return run.branch_key; });
      var existingRows = await loadExistingBranchCoverageRows(sb, keys);

      var existing = {};
      existingRows.forEach(function(row) {
        var parsedRunCount = safeIntForDb(row.run_count, 0);
        var parsedDriftCount = safeIntForDb(row.outcome_drift_count, 0);
        existing[row.branch_key] = {
          run_count: Number.isFinite(parsedRunCount) ? parsedRunCount : 0,
          outcome_signature: row.outcome_signature || null,
          outcome_drift_count: Number.isFinite(parsedDriftCount) ? parsedDriftCount : 0
        };
      });

      var saveResult = { enabled: true, saved: 0, updated: 0, inserted: 0, errors: [] };
      var rowsToWrite = [];
      var seenInBatch = Object.create(null);
      var rowToKey = function(row) {
        return row && row.branch_key ? row.branch_key : null;
      };
      for (var i = 0; i < runs.length; i++) {
        var run = runs[i];
        var runBranchKey = sanitizeBranchKey(run.branch_key);
        if (!runBranchKey) continue;
        if (seenInBatch[runBranchKey]) continue;
        seenInBatch[runBranchKey] = true;
        try {
          var prior = existing[runBranchKey] || {};
          var priorRunCount = asIntFallback(prior.run_count, 0);
          var priorDriftCount = asIntFallback(prior.outcome_drift_count, 0);
          var priorOutcome = prior.outcome_signature == null ? null : safeTextForDb(prior.outcome_signature, null);
          var normalizedPriorOutcome = priorOutcome == null ? null : priorOutcome;
          var normalizedCurrentOutcome = safeTextForDb(run.outcome_signature, null);
          var changed = !!(normalizedPriorOutcome && normalizedCurrentOutcome && normalizedPriorOutcome !== normalizedCurrentOutcome);

          var row = buildBranchCoverageRow(run, payload, true, priorRunCount + (Object.prototype.hasOwnProperty.call(existing, runBranchKey) ? 1 : 0), priorDriftCount + (Object.prototype.hasOwnProperty.call(existing, runBranchKey) && changed ? 1 : 0));
          if (!row) continue;
          rowsToWrite.push(row);
        } catch (_rowErr) {
          saveResult.errors.push(branchCoverageError(_rowErr, {
            context: 'branch_coverage_row_prepare_failed',
            run_index: i,
            source_run: safeJsonForDb(run, null),
            branch_key: rowToKey(run)
          }));
        }
      }
      if (!rowsToWrite.length) {
        if (saveResult.errors.length) {
          saveResult.errors = saveResult.errors.map(function(error) {
            return error && error.message ? error : branchCoverageError(error, { context: 'branch_coverage_row_prepare_failed' });
          });
          saveResult.error = branchCoverageError(new Error('No valid branch coverage rows were produced for save'), {
            context: 'branch_coverage_row_prepare_failed',
            error_count: saveResult.errors.length,
            run_count: runs.length,
            sample_failed_rows: saveResult.errors.slice(0, 3).map(function(error) {
              if (!error) return null;
              return {
                message: error.message || null,
                run_index: error.run_index || null,
                branch_key: error.branch_key || null,
                code: error.code || null,
                status: error.status || error.statusText || null,
                details: error.details || null
              };
            })
          });
          saveResult.error_count = saveResult.errors.length;
          return saveResult;
        }
        return { enabled: true, saved: 0, updated: 0, inserted: 0 };
      }
      var saveChunkSize = 24;
      if (rowsToWrite.length <= 120) {
        saveChunkSize = 80;
      } else if (rowsToWrite.length <= 1500) {
        saveChunkSize = 40;
      }
      var onProgress = typeof payload.onProgress === 'function' ? payload.onProgress : null;

      function emitSaveProgress(event) {
        if (!onProgress) return;
        var payloadEvent = event || {};
        var safeEvent = {
          phase: 'save_progress',
          attempted_rows: Number(payloadEvent.attempted_rows || 0),
          attempted_chunk_index: Number(payloadEvent.attempted_chunk_index || 0),
          attempted_chunk_size: Number(payloadEvent.attempted_chunk_size || 0),
          saved_rows: Number(saveResult.saved || 0),
          inserted_rows: Number(saveResult.inserted || 0),
          updated_rows: Number(saveResult.updated || 0),
          error_count: Number(saveResult.errors.length || 0)
        };
        var keys = Object.keys(payloadEvent);
        for (var i = 0; i < keys.length; i++) {
          safeEvent[keys[i]] = payloadEvent[keys[i]];
        }
        try { onProgress(safeEvent); } catch (_err) {}
      }

      function countChunkRows(chunk) {
        var chunkUpdated = 0;
        var chunkInserted = 0;
        for (var c = 0; c < chunk.length; c++) {
          var row = chunk[c] || {};
          if (existing[row.branch_key]) chunkUpdated += 1;
          else chunkInserted += 1;
        }
        return { updated: chunkUpdated, inserted: chunkInserted };
      }

      async function persistChunk(chunk, startIndex) {
          if (!chunk.length) return;
          var chunkInfo = countChunkRows(chunk);
          try {
            var upsertResult = await sb
              .from('branch_coverage_runs')
              .upsert(chunk, { onConflict: 'branch_key' });
            if (upsertResult && upsertResult.error) {
              throw {
                message: upsertResult.error.message || 'Bad Request',
                code: upsertResult.error.code || null,
                details: upsertResult.error.details || null,
                hint: upsertResult.error.hint || null,
                status: upsertResult.status || upsertResult.error.status || null,
                statusText: upsertResult.statusText || upsertResult.error.statusText || null,
                body: upsertResult.error.body || null,
                raw: safeTextForDb(upsertResult.error.raw || upsertResult.error, null),
                branch_keys: (chunk || []).map(function(row) { return row && row.branch_key ? row.branch_key : null; }),
                request_rows: chunk.length
              };
            }
            saveResult.saved += chunk.length;
            saveResult.updated += chunkInfo.updated;
            saveResult.inserted += chunkInfo.inserted;
            emitSaveProgress({
                context: 'branch_coverage_chunk_saved',
                attempted_rows: chunk.length,
                attempted_chunk_index: startIndex,
                attempted_chunk_size: chunk.length
              });
          return;
        } catch (err) {
          if (chunk.length === 1) {
            var singleRow = chunk[0] || {};
            emitSaveProgress({
              context: 'branch_coverage_single_row_failed',
              attempted_rows: 1,
              attempted_chunk_index: startIndex,
              attempted_chunk_size: 1,
              failed_row_key: singleRow && singleRow.branch_key
            });

            var minimalRow;
            try {
              minimalRow = buildMinimalBranchCoverageRow(singleRow, payload);
            } catch (_minimalBuildErr) {
              minimalRow = null;
            }

            if (singleRow && singleRow.branch_key && minimalRow) {
              try {
                var fallbackResult = await sb
                  .from('branch_coverage_runs')
                  .upsert([minimalRow], { onConflict: 'branch_key' });
                if (!fallbackResult || fallbackResult.error) {
                  var fallbackErr = fallbackResult && fallbackResult.error ? {
                    message: fallbackResult.error.message || 'Bad Request',
                    code: fallbackResult.error.code || null,
                    details: fallbackResult.error.details || null,
                    hint: fallbackResult.error.hint || null,
                    status: fallbackResult.status || fallbackResult.error.status || null,
                    statusText: fallbackResult.statusText || fallbackResult.error.statusText || null,
                    body: fallbackResult.error.body || null,
                    raw: safeTextForDb(fallbackResult.error.raw || fallbackResult.error, null),
                    branch_keys: [singleRow.branch_key],
                    request_rows: 1,
                    fallback_mode: 'minimal_row'
                  } : null;
                  if (fallbackErr) {
                    throw fallbackErr;
                  }
                }

                saveResult.saved += 1;
                if (chunkInfo.updated) {
                  saveResult.updated += 1;
                } else {
                  saveResult.inserted += 1;
                }
                emitSaveProgress({
                  context: 'branch_coverage_single_row_recovered',
                  attempted_rows: 1,
                  attempted_chunk_index: startIndex,
                  attempted_chunk_size: 1,
                  recovered_row_key: singleRow.branch_key
                });
                return;
              } catch (fallbackErr) {
                // fall through to record the full error below if minimal payload also fails
                err = fallbackErr;
              }
            }

            saveResult.errors.push(branchCoverageError(err, {
              context: 'branch_coverage_single_row_failed',
              branch_key: singleRow.branch_key || null,
              branch_payload: singleRow ? safeJsonForDb(singleRow, null) : null,
              minimal_branch_payload: minimalRow ? safeJsonForDb(minimalRow, null) : null,
              attempted_chunk_size: 1,
              attempted_chunk_index: startIndex,
              requested_rows: 1,
              attempted_rows: 1,
              requested_keys: [singleRow.branch_key || null]
            }));
            return;
          }

          if (chunk.length <= 3) {
            for (var iRow = 0; iRow < chunk.length; iRow++) {
              await persistChunk([chunk[iRow]], startIndex + iRow);
            }
            return;
          }

          var half = Math.max(1, Math.floor(chunk.length / 2));
          await persistChunk(chunk.slice(0, half), startIndex);
          await persistChunk(chunk.slice(half), startIndex + half);
          return;
        }
      }

      for (var i = 0; i < rowsToWrite.length; i += saveChunkSize) {
        var baseChunk = rowsToWrite.slice(i, i + saveChunkSize);
        if (!baseChunk.length) continue;
        if (baseChunk.length === 1) {
          await persistChunk(baseChunk, i);
          continue;
        }
        await persistChunk(baseChunk, i);
      }

      if (saveResult.errors.length) {
        var firstErr = saveResult.errors[0] && saveResult.errors[0].message ? saveResult.errors[0].message : null;
        var lastErr = saveResult.errors[saveResult.errors.length - 1] && saveResult.errors[saveResult.errors.length - 1].message ? saveResult.errors[saveResult.errors.length - 1].message : null;
        saveResult.error = branchCoverageError(new Error('Branch coverage chunk write failed; see details in errors[]'), {
          context: 'one_or_more_branch_coverage_chunk_writes_failed',
          error_count: saveResult.errors.length,
          first_error_message: firstErr,
          last_error_message: lastErr,
          first_failed_row_context: saveResult.errors[0] && saveResult.errors[0].branch_key
            ? {
              branch_key: saveResult.errors[0].branch_key,
              payload: saveResult.errors[0].branch_payload || null
            }
            : null,
          sample_failed_rows: saveResult.errors.slice(0, 3).map(function(error) {
            if (!error) return null;
            return {
              message: error.message || null,
              branch_key: error.branch_key || null,
              requested_rows: error.requested_rows || null,
              status: error.status || error.statusText || null,
              details: error.details || null,
              code: error.code || null,
              hint: error.hint || null
            };
          })
        });
        saveResult.error_count = saveResult.errors.length;
        saveResult.failed_chunks = Math.max(saveResult.errors.length, 0);
        return saveResult;
      }
      return saveResult;
    } catch (err) {
      log.warn('saveBranchCoverageRuns failed', err);
      return {
        enabled: true,
        saved: 0,
        updated: 0,
        inserted: 0,
        error: branchCoverageError(err, { context: 'saveBranchCoverageRuns_unexpected_failure' }),
        errors: [branchCoverageError(err, { context: 'saveBranchCoverageRuns_unexpected_failure' })],
        error_count: 1
      };
    }
  }

  function teamLabTrustedWriteError(err) {
    var normalized = normalizeDbError(err) || {};
    var text = [
      normalized.message,
      normalized.details,
      normalized.hint,
      normalized.code,
      normalized.status,
      normalized.statusText
    ].filter(Boolean).join(' ');
    return /row-level security|permission denied|not authorized|42501|401|403/i.test(text);
  }

  function teamLabEvidenceUnavailableResult(reason, payload) {
    return {
      ok: false,
      reason: reason,
      message: reason === 'trusted_writer_required'
        ? 'Team Lab evidence writes require a trusted server-side workflow; browser anon clients must remain read-only under RLS.'
        : 'Team Lab evidence was not persisted.',
      payload: payload || null
    };
  }

  function normalizeTeamLabEvidenceLimit(limit) {
    var n = Number(limit || 50);
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.max(1, Math.min(250, Math.floor(n)));
  }

  function applyTeamLabEvidenceFilters(query, filters) {
    filters = filters || {};
    [
      'id',
      'job_id',
      'sim_run_id',
      'team_a_id',
      'team_b_id',
      'owner_user_id',
      'regulation_id',
      'format',
      'engine_version',
      'ruleset_version',
      'status',
      'job_type'
    ].forEach(function(key) {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query = query.eq(key, filters[key]);
      }
    });
    return query;
  }

  async function createSimJob(job) {
    const sb = getClient();
    if (!sb) return teamLabEvidenceUnavailableResult('supabase_unavailable', job);
    try {
      const { data, error } = await sb
        .from(TEAM_LAB_SIM_JOBS_TABLE)
        .insert(job)
        .select('*')
        .single();
      if (error) throw error;
      return data || job;
    } catch (err) {
      log.warn('createSimJob failed', err);
      if (teamLabTrustedWriteError(err)) return teamLabEvidenceUnavailableResult('trusted_writer_required', job);
      return teamLabEvidenceUnavailableResult('write_failed', { error: normalizeDbError(err), job: job });
    }
  }

  async function updateSimJobStatus(jobId, status, statusReport) {
    const sb = getClient();
    var now = new Date().toISOString();
    var patch = {
      status: status,
      status_report: statusReport || {},
      updated_at: now
    };
    if (status === 'running') patch.started_at = now;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') patch.finished_at = now;
    if (!sb) return teamLabEvidenceUnavailableResult('supabase_unavailable', { id: jobId, patch: patch });
    try {
      const { data, error } = await sb
        .from(TEAM_LAB_SIM_JOBS_TABLE)
        .update(patch)
        .eq('id', jobId)
        .select('*')
        .single();
      if (error) throw error;
      return data || Object.assign({ id: jobId }, patch);
    } catch (err) {
      log.warn('updateSimJobStatus failed', err);
      if (teamLabTrustedWriteError(err)) return teamLabEvidenceUnavailableResult('trusted_writer_required', { id: jobId, patch: patch });
      return teamLabEvidenceUnavailableResult('write_failed', { error: normalizeDbError(err), id: jobId, patch: patch });
    }
  }

  async function saveReplayRecord(replay) {
    const sb = getClient();
    if (!sb) return teamLabEvidenceUnavailableResult('supabase_unavailable', replay);
    try {
      const { data, error } = await sb
        .from(TEAM_LAB_REPLAYS_TABLE)
        .insert(replay)
        .select('*')
        .single();
      if (error) throw error;
      return data || replay;
    } catch (err) {
      log.warn('saveReplayRecord failed', err);
      if (teamLabTrustedWriteError(err)) return teamLabEvidenceUnavailableResult('trusted_writer_required', replay);
      return teamLabEvidenceUnavailableResult('write_failed', { error: normalizeDbError(err), replay: replay });
    }
  }

  function normalizeReplayImportChildRows(rows, importId) {
    return (Array.isArray(rows) ? rows : []).map(function(row) {
      var copy = Object.assign({}, row || {});
      copy.import_id = importId;
      return copy;
    });
  }

  function uniqueTextRows(rows) {
    var seen = {};
    var out = [];
    (Array.isArray(rows) ? rows : []).forEach(function(value) {
      var key = safeTextForDb(value, '');
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(key);
    });
    return out;
  }

  function mappingGapCode(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'string') return value;
    return value.code || value.message || String(value);
  }

  function clearResolvedMappingGaps(gaps) {
    return uniqueTextRows(gaps).filter(function(code) {
      if (code === 'TEAM_ID_MAPPING_NEEDED' || code === 'TEAM_MAPPING_NEEDS_REVIEW') return false;
      return String(code).indexOf('TEAM_KEY_MAPPING_') !== 0;
    });
  }

  function teamLabApi() {
    if (typeof window === 'undefined') return null;
    return window.TeamLab || (window.ChampionsSim && window.ChampionsSim.TeamLab) || null;
  }

  function mappingSourceSystemForImport(importRow, opts) {
    if (opts && (opts.source_system || opts.sourceSystem)) return safeTextForDb(opts.source_system || opts.sourceSystem, null);
    var sourceType = safeTextForDb(importRow && importRow.source_type, '');
    if (sourceType === 'qa_artifact' || sourceType === 'champions_turn_log') return 'qa_artifact';
    if (sourceType === 'showdown_html' || sourceType === 'showdown_text') return 'showdown_import';
    return 'manual_admin';
  }

  function replayImportMappingFilters(payload, opts) {
    opts = opts || {};
    var row = payload && (payload.import_row || payload.import) || {};
    var evidence = payload && payload.evidence || {};
    var simJob = evidence && evidence.sim_job || {};
    var replay = evidence && Array.isArray(evidence.replay_records) ? evidence.replay_records[0] || {} : {};
    return {
      source_system: mappingSourceSystemForImport(row, opts),
      regulation_id: safeTextForDb(opts.regulation_id || row.regulation_id || simJob.regulation_id || replay.regulation_id, null),
      format: safeTextForDb(opts.format || row.format || simJob.format || replay.format, null)
    };
  }

  function mappingStatusFromResolution(resolution) {
    if (!resolution || !resolution.refs || !resolution.refs.length) return 'pending';
    if (resolution.ok) return 'mapped';
    if (resolution.status === 'ambiguous') return 'failed';
    if (Number(resolution.resolved_count || 0) > 0) return 'partial';
    return 'needs_review';
  }

  function refsFromMappingResolution(importId, resolution) {
    var refs = [];
    var seen = {};
    (resolution && resolution.mappings || []).forEach(function(row) {
      if (!row || !row.ok) return;
      var mapping = row.mapping || {};
      if (mapping.id && !seen['mapping:' + mapping.id]) {
        seen['mapping:' + mapping.id] = true;
        refs.push({
          import_id: importId || 'import-id-after-insert',
          ref_type: 'team_key_mapping',
          ref_id: String(mapping.id),
          verification_status: 'verified',
          notes: 'Trusted import worker verified artifact key "' + String(row.source_team_key || row.raw_key || 'team') + '" maps to Team Lab team ' + String(row.team_lab_team_id || '')
        });
      }
      if (row.team_lab_team_id && !seen['team:' + row.team_lab_team_id]) {
        seen['team:' + row.team_lab_team_id] = true;
        refs.push({
          import_id: importId || 'import-id-after-insert',
          ref_type: 'team_lab_team',
          ref_id: String(row.team_lab_team_id),
          verification_status: 'verified',
          notes: 'Trusted import worker resolved artifact team key "' + String(row.source_team_key || row.raw_key || 'team') + '".'
        });
      }
    });
    return refs;
  }

  function applyReplayImportMappingResolution(payload, resolution) {
    payload = payload || {};
    var importRow = Object.assign({}, payload.import_row || payload.import || {});
    importRow.metadata = Object.assign({}, importRow.metadata || {});
    var existingGaps = uniqueTextRows(importRow.source_gaps || []);
    var resolutionGaps = uniqueTextRows((resolution && resolution.source_gaps || []).map(mappingGapCode).filter(Boolean));
    importRow.source_gaps = resolution && resolution.ok
      ? uniqueTextRows(clearResolvedMappingGaps(existingGaps).concat(resolutionGaps))
      : uniqueTextRows(existingGaps.concat(resolutionGaps));
    if (importRow.source_gaps.indexOf('PRIVATE_IMPORT_NOT_PROMOTED') < 0) importRow.source_gaps.push('PRIVATE_IMPORT_NOT_PROMOTED');
    importRow.team_mapping_status = mappingStatusFromResolution(resolution);
    importRow.metadata.team_lab_mapping_resolution = resolution || null;
    importRow.metadata.promotion_blocked_until = 'trusted_worker_mapping_legality_consent_review';

    var importId = importRow.id || 'import-id-after-insert';
    var refs = normalizeReplayImportChildRows(payload.refs || payload.import_refs, importId)
      .concat(refsFromMappingResolution(importId, resolution));
    return Object.assign({}, payload, {
      import_row: importRow,
      refs: refs,
      events: normalizeReplayImportChildRows(payload.events || payload.import_events, importId),
      team_lab_mapping_resolution: resolution || null
    });
  }

  async function listTeamKeyMappings(filters) {
    const sb = getClient();
    if (!sb) return teamLabEvidenceUnavailableResult('supabase_unavailable', filters);
    try {
      var query = sb
        .from(TEAM_LAB_TEAM_KEY_MAPPINGS_TABLE)
        .select('*');
      if (filters && filters.source_system) query = query.eq('source_system', filters.source_system);
      if (filters && filters.regulation_id) query = query.eq('regulation_id', filters.regulation_id);
      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      log.warn('listTeamKeyMappings failed', err);
      if (teamLabTrustedWriteError(err)) return teamLabEvidenceUnavailableResult('trusted_writer_required', { filters: filters, error: normalizeDbError(err) });
      return teamLabEvidenceUnavailableResult('read_failed', { filters: filters, error: normalizeDbError(err) });
    }
  }

  async function prepareTrustedReplayImport(payload, opts) {
    payload = payload || {};
    opts = opts || {};
    var teamLab = teamLabApi();
    if (!teamLab || typeof teamLab.resolveArtifactTeamMappings !== 'function') {
      return applyReplayImportMappingResolution(payload, {
        ok: false,
        status: 'needs_review',
        refs: [],
        mappings: [],
        team_id_map: {},
        source_gaps: ['TEAM_KEY_MAPPING_RESOLVER_MISSING'],
        unresolved_count: 0,
        ambiguous_count: 0,
        resolved_count: 0
      });
    }
    if (!payload.evidence) {
      return applyReplayImportMappingResolution(payload, {
        ok: false,
        status: 'needs_review',
        refs: [],
        mappings: [],
        team_id_map: {},
        source_gaps: ['TEAM_KEY_MAPPING_EVIDENCE_MISSING'],
        unresolved_count: 0,
        ambiguous_count: 0,
        resolved_count: 0
      });
    }
    var filters = replayImportMappingFilters(payload, opts);
    var mappings = await listTeamKeyMappings(filters);
    if (!Array.isArray(mappings)) {
      return applyReplayImportMappingResolution(payload, {
        ok: false,
        status: mappings && mappings.reason === 'trusted_writer_required' ? 'needs_trusted_worker' : 'needs_review',
        refs: [],
        mappings: [],
        team_id_map: {},
        source_gaps: [mappings && mappings.reason === 'trusted_writer_required' ? 'TEAM_KEY_MAPPING_TRUSTED_WORKER_REQUIRED' : 'TEAM_KEY_MAPPING_LOOKUP_FAILED'],
        lookup_result: mappings,
        unresolved_count: 0,
        ambiguous_count: 0,
        resolved_count: 0
      });
    }
    var resolution = teamLab.resolveArtifactTeamMappings(payload.evidence, mappings, filters);
    return applyReplayImportMappingResolution(payload, resolution);
  }

  async function saveTrustedReplayImport(payload, opts) {
    var prepared = await prepareTrustedReplayImport(payload, opts || {});
    var saved = await saveReplayImport(prepared);
    if (!saved) return saved;
    return Object.assign({}, saved, {
      team_lab_mapping_resolution: prepared.team_lab_mapping_resolution || null
    });
  }

  function sanitizeReplayImportPayload(payload) {
    payload = payload || {};
    var importRow = Object.assign({}, payload.import_row || payload.import || {});
    if (!importRow.id) importRow.id = uuid();
    importRow.metadata = stripJsonbForDb(importRow.metadata, {});
    importRow.source_gaps = Array.isArray(importRow.source_gaps) ? importRow.source_gaps : [];
    importRow.confidence_flags = Array.isArray(importRow.confidence_flags) ? importRow.confidence_flags : [];
    importRow.source_type = safeTextForDb(importRow.source_type, 'unknown');
    importRow.parser_version = safeTextForDb(importRow.parser_version, 'trainer-replay-import-parser-v1');
    importRow.parse_status = safeTextForDb(importRow.parse_status, 'needs_review');
    importRow.team_mapping_status = safeTextForDb(importRow.team_mapping_status, 'pending');
    return {
      import_row: importRow,
      refs: normalizeReplayImportChildRows(payload.refs || payload.import_refs, importRow.id),
      events: normalizeReplayImportChildRows(payload.events || payload.import_events, importRow.id)
    };
  }

  async function saveReplayImport(payload) {
    const sb = getClient();
    if (!sb) return null;
    var normalized = sanitizeReplayImportPayload(payload);
    var importRow = normalized.import_row;
    try {
      const { data, error } = await sb
        .from(TRAINER_REPLAY_IMPORTS_TABLE)
        .insert(importRow)
        .select('*')
        .single();
      if (error) throw error;
      var savedImport = data || importRow;
      var importId = savedImport.id || importRow.id;
      var refs = normalizeReplayImportChildRows(normalized.refs, importId);
      var events = normalizeReplayImportChildRows(normalized.events, importId);

      if (refs.length) {
        const { error: refsError } = await sb
          .from(TRAINER_REPLAY_IMPORT_REFS_TABLE)
          .insert(refs);
        if (refsError) throw refsError;
      }

      if (events.length) {
        const { error: eventsError } = await sb
          .from(TRAINER_REPLAY_IMPORT_EVENTS_TABLE)
          .insert(events);
        if (eventsError) throw eventsError;
      }

      return {
        import_row: savedImport,
        refs: refs,
        events: events,
        saved_counts: {
          refs: refs.length,
          events: events.length
        }
      };
    } catch (err) {
      log.warn('saveReplayImport failed; private replay import not persisted', err);
      return null;
    }
  }

  async function listSimJobs(filters) {
    const sb = getClient();
    if (!sb) return [];
    try {
      var query = sb
        .from(TEAM_LAB_SIM_JOBS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(normalizeTeamLabEvidenceLimit(filters && filters.limit));
      query = applyTeamLabEvidenceFilters(query, filters);
      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      log.warn('listSimJobs failed', err);
      return [];
    }
  }

  async function listReplays(filters) {
    const sb = getClient();
    if (!sb) return [];
    try {
      var query = sb
        .from(TEAM_LAB_REPLAYS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(normalizeTeamLabEvidenceLimit(filters && filters.limit));
      query = applyTeamLabEvidenceFilters(query, filters);
      const { data, error } = await query;
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      log.warn('listReplays failed', err);
      return [];
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.SupabaseAdapter = {
    enabled:            ENABLED,
    DEFAULT_RULESET_ID: DEFAULT_RULESET_ID,
    loadTeamsFromDB,
    getLastTeamLoadStatus,
    loadRulesets,
    saveAnalysis,
    loadRecentAnalyses,
    saveTeam,
    loadAnalysesForPlayer,
    loadAnalysisLogs,
    loadPriorSnapshot,
    loadShowdownDbStatus,
    loadShowdownDbSnapshot,
    loadShowdownEntities,
    loadBranchCoverageSummary,
    saveBranchCoverageRuns,
    createSimJob,
    updateSimJobStatus,
    saveReplayRecord,
    listTeamKeyMappings,
    prepareTrustedReplayImport,
    saveTrustedReplayImport,
    saveReplayImport,
    listSimJobs,
    listReplays
  };

  // M3 NOTE: Auto-merge of DB teams into TEAMS has moved to ui.js's
  // DOMContentLoaded handler so that rebuildTeamSelects() is awaited
  // (no flash of static teams). See ui.js — search for
  // "M3 — DB init: source-of-truth merge".

})();
