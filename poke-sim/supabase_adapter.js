// ============================================================
// supabase_adapter.js — Champions Sim Supabase Integration
// Offline-first: localStorage writes first (via Storage object);
// Supabase writes are async fire-and-forget with silent failure.
//
// SETUP: Before loading this file, inject your keys:
//   <script>
//     window.__SUPABASE_URL__      = 'https://xxxx.supabase.co';
//     window.__SUPABASE_ANON_KEY__ = 'eyJ...';
//   </script>
// ============================================================

(function () {
  'use strict';

  const SUPABASE_URL =
    (typeof window !== 'undefined' && window.__SUPABASE_URL__) ||
    'https://YOUR_PROJECT_REF.supabase.co';

  const SUPABASE_ANON_KEY =
    (typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__) ||
    'YOUR_ANON_KEY';

  const configured =
    !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

  // ----------------------------------------------------------
  // Lightweight REST helpers (no Supabase SDK dependency)
  // ----------------------------------------------------------
  const sb = {
    async post(table, payload) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`POST ${table} ${res.status}: ${await res.text()}`);
      return res;
    },

    async get(table, params = '') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) throw new Error(`GET ${table} ${res.status}: ${await res.text()}`);
      return res.json();
    }
  };

  // ----------------------------------------------------------
  // loadRemoteTeams — merges Supabase teams into global TEAMS
  // Runs once at boot. Skips built-in teams from data.js.
  // ----------------------------------------------------------
  async function loadRemoteTeams() {
    if (!configured) return;
    try {
      const teams = await sb.get('teams', 'select=team_id,name,label,mode,description');
      if (!Array.isArray(teams) || teams.length === 0) return;

      for (const t of teams) {
        if (typeof TEAMS === 'undefined') break;
        if (TEAMS[t.team_id]) continue; // don't overwrite built-ins

        const members = await sb.get(
          'team_members',
          `select=slot,species,item,ability,nature,level,evs,moves,tera_type,role_tag` +
          `&team_id=eq.${encodeURIComponent(t.team_id)}&order=slot.asc`
        );

        TEAMS[t.team_id] = {
          name:        t.name,
          label:       t.label,
          mode:        t.mode,
          description: t.description,
          source:      'supabase',
          members: (members || []).map(m => ({
            species:  m.species,
            item:     m.item     || '',
            ability:  m.ability  || '',
            nature:   m.nature   || '',
            level:    m.level    || 50,
            evs:      m.evs      || {},
            moves:    m.moves    || [],
            teraType: m.tera_type || '',
            roleTag:  m.role_tag  || ''
          }))
        };
      }
      console.log(`[SupabaseAdapter] Loaded ${teams.length} remote team(s).`);
    } catch (e) {
      console.warn('[SupabaseAdapter] loadRemoteTeams skipped:', e.message);
    }
  }

  // ----------------------------------------------------------
  // saveAnalysis — persists a completed sim result.
  // Caller passes a plain result object; this function maps
  // it to the DB schema and fires async.
  //
  // Usage in ui.js after runBoSeries():
  //   if (window.SupabaseAdapter) {
  //     SupabaseAdapter.saveAnalysis({
  //       analysis_id:   crypto.randomUUID(),
  //       player_team_id: currentPlayerKey,
  //       opp_team_id:    oppKey,
  //       bo:             currentBo,
  //       win_rate:       res.winRate,
  //       wins:           res.wins,
  //       losses:         res.losses,
  //       draws:          res.draws || 0,
  //       avg_turns:      res.avgTurns || 0,
  //       avg_tr_turns:   res.avgTrTurns || 0,
  //       sample_size:    currentBo,
  //       win_conditions: res.winConditions || [],
  //       logs:           res.logs || []
  //     });
  //   }
  // ----------------------------------------------------------
  async function saveAnalysis(result) {
    if (!result || !result.analysis_id) return;
    if (!configured) {
      console.warn('[SupabaseAdapter] Not configured — skipping remote save.');
      return;
    }

    const row = {
      analysis_id:       result.analysis_id,
      engine_version:    result.engine_version    || '1.0.0',
      ruleset_id:        result.ruleset_id         || 'vgc2026_reg_m_a',
      player_team_id:    result.player_team_id,
      opp_team_id:       result.opp_team_id,
      prior_id:          result.prior_id           || null,
      policy_model:      result.policy_model        || 'random',
      sample_size:       result.sample_size         || 1,
      bo:                result.bo                  || 1,
      win_rate:          result.win_rate,
      wins:              result.wins,
      losses:            result.losses,
      draws:             result.draws              || 0,
      avg_turns:         result.avg_turns           || 0,
      avg_tr_turns:      result.avg_tr_turns        || 0,
      ci_low:            result.ci_low              || null,
      ci_high:           result.ci_high             || null,
      hidden_info_model: result.hidden_info_model   || null,
      analysis_json:     result
    };

    try {
      await sb.post('analyses', row);

      if (Array.isArray(result.win_conditions) && result.win_conditions.length > 0) {
        const wcRows = result.win_conditions.map(wc => ({
          analysis_id: result.analysis_id,
          label:       wc.label,
          count:       wc.count
        }));
        await sb.post('analysis_win_conditions', wcRows);
      }

      if (Array.isArray(result.logs) && result.logs.length > 0) {
        const logRows = result.logs.slice(0, 5).map((log, i) => ({
          analysis_id:   result.analysis_id,
          log_index:     i,
          result:        log.result        || '',
          turns:         log.turns         || 0,
          tr_turns:      log.tr_turns      || 0,
          win_condition: log.win_condition || null,
          log:           log
        }));
        await sb.post('analysis_logs', logRows);
      }

      console.log(`[SupabaseAdapter] Saved analysis ${result.analysis_id}`);
    } catch (e) {
      console.warn('[SupabaseAdapter] Remote save failed:', e.message);
    }
  }

  // ----------------------------------------------------------
  // Public API
  // ----------------------------------------------------------
  window.SupabaseAdapter = { saveAnalysis, loadRemoteTeams, sb };

  // Auto-boot: load remote teams once DOM + data.js are ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRemoteTeams);
  } else {
    loadRemoteTeams();
  }

})();
