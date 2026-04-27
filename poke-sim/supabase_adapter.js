/**
 * supabase_adapter.js  -- Champions Sim 2026
 * Thin async wrapper over the Supabase REST API.
 * Uses the anon (public) key -- read-only on reference tables,
 * insert-only on analyses + logs.
 *
 * USAGE:
 *   <script src="supabase_adapter.js"></script>
 *   After DOM ready: await SupabaseAdapter.init();
 *   Then: await SupabaseAdapter.loadTeams();
 *         await SupabaseAdapter.saveAnalysis(payload);
 *
 * KEY INJECTION:
 *   Set window.__SUPABASE_ANON_KEY__ before this script loads,
 *   OR pass it to init({ anonKey: '...' }).
 *   Never hardcode the key here -- keep it out of source control.
 */

var SupabaseAdapter = (function () {
  'use strict';

  var PROJECT_REF = 'ymlahqnshgiarpbgxehp';
  var BASE_URL    = 'https://' + PROJECT_REF + '.supabase.co/rest/v1';
  var _anonKey    = null;

  /* --------------------------------------------------------
   * INIT -- call once after page load
   * opts: { anonKey: string }  (optional if window key is set)
   * -------------------------------------------------------- */
  async function init(opts) {
    opts = opts || {};
    _anonKey = opts.anonKey
      || (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__)
      || null;

    if (!_anonKey) {
      console.warn('[SupabaseAdapter] No anon key found. '
        + 'Set window.__SUPABASE_ANON_KEY__ before calling init().');
      return false;
    }
    console.log('[SupabaseAdapter] Initialized -- project:', PROJECT_REF);
    return true;
  }

  /* --------------------------------------------------------
   * INTERNAL fetch helper
   * -------------------------------------------------------- */
  async function _req(method, table, opts) {
    opts = opts || {};
    var url = BASE_URL + '/' + table;
    if (opts.query) url += '?' + opts.query;

    var headers = {
      'apikey'        : _anonKey,
      'Authorization' : 'Bearer ' + _anonKey,
      'Content-Type'  : 'application/json',
      'Prefer'        : opts.prefer || 'return=representation'
    };

    var fetchOpts = { method: method, headers: headers };
    if (opts.body) fetchOpts.body = JSON.stringify(opts.body);

    var res = await fetch(url, fetchOpts);

    if (!res.ok) {
      var errText = await res.text();
      throw new Error('[SupabaseAdapter] ' + method + ' ' + table
        + ' -> ' + res.status + ' ' + errText);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  /* --------------------------------------------------------
   * PUBLIC API
   * -------------------------------------------------------- */

  /** Load all active rulesets. */
  async function loadRulesets() {
    return _req('GET', 'rulesets', { query: 'is_active=eq.true&order=ruleset_id' });
  }

  /** Load all teams with members joined. */
  async function loadTeams() {
    return _req('GET', 'teams', { query: 'order=name&select=*,team_members(*)' });
  }

  /** Load a single team by team_id. */
  async function loadTeam(teamId) {
    var rows = await _req('GET', 'teams', {
      query: 'team_id=eq.' + encodeURIComponent(teamId)
            + '&select=*,team_members(*)&limit=1'
    });
    return rows && rows[0] ? rows[0] : null;
  }

  /**
   * Save a full analysis result.
   * payload fields: analysis_id, engine_version, ruleset_id,
   *   player_team_id, opp_team_id, policy_model, sample_size, bo,
   *   win_rate, wins, losses, draws, avg_turns, avg_tr_turns,
   *   ci_low, ci_high, hidden_info_model, analysis_json,
   *   win_conditions: [{label, count}],
   *   logs: [{result, turns, tr_turns, win_condition, log}] (optional)
   */
  async function saveAnalysis(payload) {
    if (!_anonKey) {
      console.warn('[SupabaseAdapter] saveAnalysis skipped -- not initialized.');
      return null;
    }

    var winConditions = payload.win_conditions || [];
    var logs          = payload.logs || [];
    var analysisId    = payload.analysis_id
      || (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'fallback-' + Date.now());

    var coreRow = {
      analysis_id       : analysisId,
      engine_version    : payload.engine_version    || 'unknown',
      ruleset_id        : payload.ruleset_id        || 'vgc2025regi',
      player_team_id    : payload.player_team_id,
      opp_team_id       : payload.opp_team_id,
      prior_id          : payload.prior_id          || null,
      policy_model      : payload.policy_model      || 'default',
      sample_size       : payload.sample_size,
      bo                : payload.bo,
      win_rate          : payload.win_rate,
      wins              : payload.wins,
      losses            : payload.losses,
      draws             : payload.draws,
      avg_turns         : payload.avg_turns,
      avg_tr_turns      : payload.avg_tr_turns,
      ci_low            : payload.ci_low            || null,
      ci_high           : payload.ci_high           || null,
      hidden_info_model : payload.hidden_info_model || null,
      analysis_json     : payload.analysis_json     || {}
    };

    await _req('POST', 'analyses', { body: coreRow, prefer: 'return=minimal' });

    if (winConditions.length > 0) {
      var wcRows = winConditions.map(function (wc) {
        return { analysis_id: analysisId, label: wc.label, count: wc.count };
      });
      await _req('POST', 'analysis_win_conditions', { body: wcRows, prefer: 'return=minimal' });
    }

    if (logs.length > 0) {
      var logRows = logs.map(function (lg, i) {
        return {
          analysis_id   : analysisId,
          log_index     : i,
          result        : lg.result,
          turns         : lg.turns,
          tr_turns      : lg.tr_turns     || 0,
          win_condition : lg.win_condition || null,
          log           : lg.log          || {}
        };
      });
      await _req('POST', 'analysis_logs', { body: logRows, prefer: 'return=minimal' });
    }

    console.log('[SupabaseAdapter] Saved analysis:', analysisId);
    return analysisId;
  }

  /**
   * Fetch last N analyses for a matchup (newest first).
   */
  async function loadMatchupHistory(playerTeamId, oppTeamId, limit) {
    limit = limit || 10;
    var q = 'player_team_id=eq.' + encodeURIComponent(playerTeamId)
          + '&opp_team_id=eq.'   + encodeURIComponent(oppTeamId)
          + '&order=created_at.desc'
          + '&limit='            + limit;
    return _req('GET', 'analyses', { query: q });
  }

  /** Quick connectivity check -- reads one ruleset row. */
  async function ping() {
    try {
      var rows = await _req('GET', 'rulesets', { query: 'limit=1' });
      console.log('[SupabaseAdapter] Ping OK:', rows);
      return true;
    } catch (e) {
      console.error('[SupabaseAdapter] Ping FAILED:', e.message);
      return false;
    }
  }

  return {
    init               : init,
    ping               : ping,
    loadRulesets       : loadRulesets,
    loadTeams          : loadTeams,
    loadTeam           : loadTeam,
    saveAnalysis       : saveAnalysis,
    loadMatchupHistory : loadMatchupHistory
  };

}());
