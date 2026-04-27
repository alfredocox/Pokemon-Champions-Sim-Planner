/**
 * supabase_adapter.js — Champions Sim v1
 * Supabase REST layer. Falls back to localStorage if unreachable.
 *
 * Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY before this
 * script loads (e.g. in a <script> block at the top of index.html).
 */
(function () {
  'use strict';

  const URL  = window.SUPABASE_URL      || '__YOUR_SUPABASE_URL__';
  const KEY  = window.SUPABASE_ANON_KEY || '__YOUR_SUPABASE_ANON_KEY__';
  const LIVE = !URL.startsWith('__');

  if (!LIVE) {
    console.warn('[SupabaseAdapter] No credentials — localStorage-only mode.');
  }

  const BASE    = `${URL}/rest/v1`;
  const HEADERS = {
    'apikey':        KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  async function get(table, qs = '') {
    if (!LIVE) return null;
    try {
      const r = await fetch(`${BASE}/${table}?${qs}`, { headers: HEADERS });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    } catch (e) { console.error(`[SB] GET ${table}`, e); return null; }
  }

  async function post(table, body) {
    if (!LIVE) return null;
    try {
      const r = await fetch(`${BASE}/${table}`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(body)
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    } catch (e) { console.error(`[SB] POST ${table}`, e); return null; }
  }

  window.SupabaseAdapter = {

    /** Load all teams with nested members */
    loadTeams() {
      return get('teams', 'select=*,team_members(*)');
    },

    /** Load all rulesets */
    loadRulesets() {
      return get('rulesets', 'select=*');
    },

    /**
     * Save a completed sim run.
     * @param {object} analysis  — matches analyses table schema
     * @param {Array}  winConds  — [{ label, count }, ...]
     * @param {Array}  logs      — optional per-game logs
     * @returns {string|null} analysis_id on success
     */
    async saveAnalysis(analysis, winConds = [], logs = []) {
      const rows = await post('analyses', analysis);
      if (!rows?.[0]) {
        console.warn('[SB] saveAnalysis: insert failed');
        return null;
      }
      const id = rows[0].analysis_id;

      if (winConds.length) {
        await post('analysis_win_conditions',
          winConds.map(w => ({ analysis_id: id, label: w.label, count: w.count }))
        );
      }

      if (logs.length) {
        await post('analysis_logs',
          logs.map((l, i) => ({
            analysis_id:   id,
            log_index:     i,
            result:        l.result,
            turns:         l.turns,
            tr_turns:      l.tr_turns     || 0,
            win_condition: l.win_condition || null,
            log:           l.log          || {}
          }))
        );
      }

      console.log(`[SB] Saved analysis ${id}`);
      return id;
    },

    /** Fetch last N analyses for a matchup */
    getRecentAnalyses(playerTeamId, oppTeamId, limit = 10) {
      return get('analyses',
        `player_team_id=eq.${playerTeamId}&opp_team_id=eq.${oppTeamId}` +
        `&order=created_at.desc&limit=${limit}&select=*`
      );
    },

    /** Connectivity check */
    async ping() {
      const rows = await get('rulesets', 'limit=1');
      const ok = Array.isArray(rows);
      console.log(`[SB] ping: ${ok ? 'OK ✓' : 'FAILED ✗'}`);
      return ok;
    }
  };

  if (LIVE) window.SupabaseAdapter.ping();

})();
