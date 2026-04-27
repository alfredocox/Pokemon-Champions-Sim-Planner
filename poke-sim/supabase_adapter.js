// ============================================================
// supabase_adapter.js — Champions Sim DB bridge v1
// Sits on top of the existing localStorage layer.
// Auto-saves every Bo run to Supabase analyses table.
// Falls back silently if Supabase is unreachable.
//
// WIRE IN index.html — add BEFORE this script tag:
//   <script>
//     window.__SUPABASE_URL__ = 'https://YOUR-ID.supabase.co';
//     window.__SUPABASE_KEY__ = 'your-anon-key';
//   </script>
//   <script src="supabase_adapter.js"></script>
// ============================================================

(function () {
  'use strict';

  const SUPABASE_URL = window.__SUPABASE_URL__ || '';
  const SUPABASE_KEY = window.__SUPABASE_KEY__ || '';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[SupabaseAdapter] No credentials — localStorage-only mode.');
  }

  // ----------------------------------------------------------
  // Thin REST fetch helper — no SDK dependency needed
  // ----------------------------------------------------------
  async function sbFetch(path, method = 'GET', body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : 'return=representation'
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${method} ${path} => ${res.status}: ${err}`);
    }
    return method === 'GET' ? res.json() : null;
  }

  // ----------------------------------------------------------
  // saveAnalysis — builds 3 related rows and inserts them
  // ----------------------------------------------------------
  async function saveAnalysis(result, playerKey, oppKey, bo) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    const analysis_id = crypto.randomUUID();
    const total = result.total || (result.wins + result.losses + (result.draws || 0)) || bo;

    const row = {
      analysis_id,
      created_at:        new Date().toISOString(),
      engine_version:    '1.0.0',
      ruleset_id:        ((window.currentFormat || 'doubles') + '_reg_m_a'),
      player_team_id:    playerKey,
      opp_team_id:       oppKey,
      prior_id:          null,
      policy_model:      'random',
      sample_size:       total,
      bo,
      win_rate:          total > 0 ? parseFloat((result.wins / total).toFixed(4)) : 0,
      wins:              result.wins   || 0,
      losses:            result.losses || 0,
      draws:             result.draws  || 0,
      avg_turns:         parseFloat((result.avgTurns   || 0).toFixed(2)),
      avg_tr_turns:      parseFloat((result.avgTrTurns || 0).toFixed(2)),
      ci_low:            result.ciLow  != null ? parseFloat(result.ciLow.toFixed(4))  : null,
      ci_high:           result.ciHigh != null ? parseFloat(result.ciHigh.toFixed(4)) : null,
      hidden_info_model: null,
      analysis_json:     result
    };

    try {
      await sbFetch('analyses', 'POST', row);
    } catch (e) {
      console.warn('[SupabaseAdapter] analyses insert failed:', e.message);
      return;
    }

    // Win conditions
    const wcs = result.winConditions || {};
    const wcRows = Object.entries(wcs)
      .filter(([, c]) => c > 0)
      .map(([label, count]) => ({ analysis_id, label, count }));
    if (wcRows.length) {
      try { await sbFetch('analysis_win_conditions', 'POST', wcRows); }
      catch (e) { console.warn('[SupabaseAdapter] win_conditions failed:', e.message); }
    }

    // Battle logs (first 10 games only)
    const games = (result.games || []).slice(0, 10);
    if (games.length) {
      const logRows = games.map((g, i) => ({
        analysis_id,
        log_index:     i,
        result:        g.winner || 'draw',
        turns:         g.turns    || 0,
        tr_turns:      g.trTurns  || 0,
        win_condition: g.winCondition || null,
        log:           g
      }));
      try { await sbFetch('analysis_logs', 'POST', logRows); }
      catch (e) { console.warn('[SupabaseAdapter] analysis_logs failed:', e.message); }
    }

    console.log(`[SupabaseAdapter] ✓ Saved ${analysis_id} (${playerKey} vs ${oppKey} Bo${bo})`);
  }

  // ----------------------------------------------------------
  // loadTeams — pull teams + members from Supabase
  // Returns null on failure so caller can fall back to TEAMS{}
  // ----------------------------------------------------------
  async function loadTeams() {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    try {
      const teams   = await sbFetch('teams?select=*');
      const members = await sbFetch('team_members?select=*&order=team_id,slot');
      const map = {};
      teams.forEach(t => { map[t.team_id] = { ...t, members: [] }; });
      members.forEach(m => { if (map[m.team_id]) map[m.team_id].members.push(m); });
      return Object.values(map);
    } catch (e) {
      console.warn('[SupabaseAdapter] loadTeams failed — using in-memory TEAMS:', e.message);
      return null;
    }
  }

  // ----------------------------------------------------------
  // Monkey-patch runBoSeries to auto-save every result
  // ----------------------------------------------------------
  const _orig = window.runBoSeries;
  if (typeof _orig === 'function') {
    window.runBoSeries = function (n, playerKey, oppKey, bo) {
      const result = _orig(n, playerKey, oppKey, bo);
      if (result && typeof result.then === 'function') {
        result.then(r => saveAnalysis(r, playerKey, oppKey, bo));
      } else if (result) {
        saveAnalysis(result, playerKey, oppKey, bo);
      }
      return result;
    };
  }

  // Expose for manual calls from ui.js
  window.SupabaseAdapter = { saveAnalysis, loadTeams };

})();
