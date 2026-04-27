/**
 * supabase_adapter.js - Champions Sim 2026
 * Thin Supabase sync layer.
 * - Reads teams from Supabase (falls back to TEAMS in data.js)
 * - Writes analyses + win conditions to Supabase
 * - Never blocks the UI - all calls are async fire-and-forget
 *
 * USAGE: In index.html, before </head>:
 *   <script>window.SUPABASE_ANON_KEY = 'your-anon-key';</script>
 *   <script src="supabase_adapter.js"></script>
 *
 * Project ref: ymlahqnshgiarpbgxehp
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY || '';
  const API = SUPABASE_URL + '/rest/v1';

  // --- helpers ---

  function headers(extra) {
    return Object.assign({
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    }, extra || {});
  }

  async function sbFetch(path, opts) {
    if (!SUPABASE_KEY) {
      console.warn('[SupabaseAdapter] No anon key set - skipping remote call');
      return null;
    }
    try {
      const res = await fetch(API + path, opts);
      if (!res.ok) {
        const err = await res.text();
        console.error('[SupabaseAdapter] HTTP ' + res.status, err);
        return null;
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (e) {
      console.error('[SupabaseAdapter] fetch error:', e);
      return null;
    }
  }

  // --- PUBLIC API ---

  const SupabaseAdapter = {

    /**
     * Save a completed sim analysis to Supabase.
     * Call after runBoSeries() completes.
     * @param {object} result    - result object from runBoSeries()
     * @param {string} playerKey
     * @param {string} oppKey
     * @param {number} bo        - 1, 3, 5, or 10
     * @returns {string|null}    - UUID of saved analysis
     */
    async saveAnalysis(result, playerKey, oppKey, bo) {
      if (!result) return null;

      const analysisId = crypto.randomUUID();
      const total = result.total || bo || 1;

      const payload = {
        analysis_id:       analysisId,
        engine_version:    window.ENGINE_VERSION || '2026-04',
        ruleset_id:        (window.currentFormat === 'singles') ? 'vgc2026-singles' : 'vgc2026-doubles',
        player_team_id:    playerKey,
        opp_team_id:       oppKey,
        prior_id:          null,
        policy_model:      'heuristic-v1',
        sample_size:       total,
        bo:                bo,
        win_rate:          parseFloat(((result.wins || 0) / total).toFixed(4)),
        wins:              result.wins   || 0,
        losses:            result.losses || 0,
        draws:             result.draws  || 0,
        avg_turns:         parseFloat((result.avgTurns   || 0).toFixed(2)),
        avg_tr_turns:      parseFloat((result.avgTrTurns || 0).toFixed(2)),
        ci_low:            result.ciLow  || null,
        ci_high:           result.ciHigh || null,
        hidden_info_model: null,
        analysis_json:     result
      };

      const saved = await sbFetch('/analyses', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload)
      });

      if (saved === null) {
        console.warn('[SupabaseAdapter] Analysis not saved remotely - local only');
        return null;
      }

      // Save top win conditions
      if (result.winConditions && result.winConditions.length) {
        const wcRows = result.winConditions.slice(0, 10).map(function (wc) {
          return {
            analysis_id: analysisId,
            label:       typeof wc === 'string' ? wc : (wc.label || 'unknown'),
            count:       typeof wc === 'object' ? (wc.count || 1) : 1
          };
        });
        await sbFetch('/analysis_win_conditions', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(wcRows)
        });
      }

      console.log('[SupabaseAdapter] Analysis saved:', analysisId);
      return analysisId;
    },

    /**
     * Load teams from Supabase.
     * Returns null if offline or no key - caller falls back to data.js TEAMS.
     * @returns {Array|null}
     */
    async loadTeams() {
      const rows = await sbFetch('/teams?select=*,team_members(*)', {
        method: 'GET',
        headers: headers({ 'Prefer': 'return=representation' })
      });
      if (!rows || !rows.length) {
        console.info('[SupabaseAdapter] Using local TEAMS (no remote data or no key)');
        return null;
      }
      return rows;
    },

    /**
     * Load recent analyses for a matchup.
     * @param {string} playerKey
     * @param {string} oppKey
     * @param {number} limit
     * @returns {Array}
     */
    async loadAnalyses(playerKey, oppKey, limit) {
      limit = limit || 10;
      const qs = '/analyses?player_team_id=eq.' + encodeURIComponent(playerKey) +
                 '&opp_team_id=eq.'   + encodeURIComponent(oppKey) +
                 '&order=created_at.desc&limit=' + limit;
      const rows = await sbFetch(qs, {
        method: 'GET',
        headers: headers({ 'Prefer': 'return=representation' })
      });
      return rows || [];
    },

    /**
     * Connectivity check.
     * @returns {boolean}
     */
    async ping() {
      const r = await sbFetch('/rulesets?limit=1', {
        method: 'GET',
        headers: headers({ 'Prefer': 'return=representation' })
      });
      return r !== null;
    }
  };

  window.SupabaseAdapter = SupabaseAdapter;

  // Silent ping on load
  SupabaseAdapter.ping().then(function (ok) {
    console.log('[SupabaseAdapter] Status:', ok ? 'connected' : 'offline / no key');
  });

}());
