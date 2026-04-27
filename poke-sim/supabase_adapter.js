// ============================================================
// supabase_adapter.js  v1.0
// Supabase sync layer for Pokemon Champions Sim Planner
//
// Architecture:
//   localStorage = primary cache (always works, offline-safe)
//   Supabase     = async cloud sync (additive, non-blocking)
//
// Setup in index.html (add BEFORE other <script> tags):
//   <script>
//     window.__SUPABASE_URL__ = 'https://YOUR_PROJECT.supabase.co';
//     window.__SUPABASE_KEY__ = 'YOUR_ANON_PUBLIC_KEY';
//   </script>
//   <script src="supabase_adapter.js"></script>
//
// Call from ui.js after any sim completes:
//   SupabaseAdapter.saveAnalysis({ playerKey, opponentKey, ... });
//   SupabaseAdapter.ping();  // health check from console
// ============================================================

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────
  const SUPABASE_URL = (window.__SUPABASE_URL__ || '').replace(/\/$/, '');
  const SUPABASE_KEY = window.__SUPABASE_KEY__ || '';
  const ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);
  const LS_KEY  = 'pcs_analyses';
  const LS_MAX  = 200; // max records kept in localStorage

  if (!ENABLED) {
    console.warn('[SupabaseAdapter] No credentials — localStorage-only mode.');
  }

  // ── Low-level REST helper ─────────────────────────────────
  async function sbFetch(table, method, body, params) {
    if (!ENABLED) return { data: null, error: 'disabled' };
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }
    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        method === 'POST' ? 'return=representation' : 'return=minimal'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      return res.ok ? { data, error: null } : { data: null, error: `HTTP ${res.status}: ${text}` };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }

  // ── localStorage helpers ──────────────────────────────────
  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
  }
  function lsWrite(arr) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, LS_MAX))); } catch (e) {
      console.warn('[SupabaseAdapter] localStorage write failed:', e);
    }
  }

  // ── Public API ────────────────────────────────────────────
  window.SupabaseAdapter = {

    /**
     * Save a completed sim analysis.
     * @param {object} opts
     * @param {string}   opts.playerKey         - TEAMS key for player
     * @param {string}   opts.opponentKey        - TEAMS key for opponent
     * @param {string}   opts.format             - 'doubles' | 'singles'
     * @param {number}   opts.boSize             - 1 | 3 | 5 | 10
     * @param {number}   opts.wins
     * @param {number}   opts.losses
     * @param {number}   opts.winRate            - 0–1 float
     * @param {string}   [opts.pilotNotes]       - free text summary
     * @param {Array}    [opts.matchupResults]   - per-matchup rows
     */
    async saveAnalysis({ playerKey, opponentKey, format, boSize, wins, losses, winRate, pilotNotes, matchupResults }) {
      const record = {
        id:           crypto.randomUUID(),
        created_at:   new Date().toISOString(),
        player_team:  playerKey,
        opponent_team: opponentKey,
        format:       format || 'doubles',
        bo_size:      boSize || 1,
        wins:         wins   || 0,
        losses:       losses || 0,
        win_rate:     typeof winRate === 'number' ? parseFloat(winRate.toFixed(4)) : 0,
        pilot_notes:  pilotNotes || null
      };

      // 1. localStorage (synchronous, always first)
      const stored = lsRead();
      stored.unshift(record);
      lsWrite(stored);

      // 2. Supabase (async, fire-and-forget)
      if (ENABLED) {
        sbFetch('analyses', 'POST', record).then(({ error }) => {
          if (error) console.warn('[SupabaseAdapter] analyses sync failed:', error);
          else       console.info('[SupabaseAdapter] ✅ analysis saved:', record.id);
        });

        // Per-matchup breakdown rows
        if (Array.isArray(matchupResults) && matchupResults.length) {
          const rows = matchupResults.map(m => ({
            analysis_id:          record.id,
            opponent_team:        m.opponentKey || m.opponent_team || '',
            wins:                 m.wins   || 0,
            losses:               m.losses || 0,
            win_rate:             typeof m.winRate === 'number' ? parseFloat(m.winRate.toFixed(4)) : 0,
            lead_recommendation:  m.leads  || m.lead_recommendation || null,
            created_at:           record.created_at
          }));
          sbFetch('matchup_results', 'POST', rows).then(({ error }) => {
            if (error) console.warn('[SupabaseAdapter] matchup_results sync failed:', error);
          });
        }
      }

      return record;
    },

    /**
     * Load recent analyses — Supabase first, localStorage fallback.
     */
    async loadAnalyses({ limit = 50 } = {}) {
      if (ENABLED) {
        const { data, error } = await sbFetch('analyses', 'GET', null, {
          select: '*', order: 'created_at.desc', limit
        });
        if (!error && Array.isArray(data)) return data;
        console.warn('[SupabaseAdapter] loadAnalyses Supabase failed, using localStorage:', error);
      }
      return lsRead().slice(0, limit);
    },

    /**
     * Load teams from Supabase (read-only reference data).
     * Returns null if disabled — caller falls back to in-memory TEAMS object.
     */
    async loadTeams() {
      if (!ENABLED) return null;
      const { data, error } = await sbFetch('teams', 'GET', null, {
        select: 'id,name,team_key,format,source_url', order: 'name.asc'
      });
      if (error) { console.warn('[SupabaseAdapter] loadTeams failed:', error); return null; }
      return data;
    },

    /**
     * Log a discrete pilot note event (non-blocking).
     */
    async logPilotNote({ analysisId, opponentKey, noteText }) {
      if (!ENABLED) return;
      sbFetch('pilot_notes', 'POST', {
        analysis_id:   analysisId,
        opponent_team: opponentKey,
        note_text:     noteText,
        created_at:    new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.warn('[SupabaseAdapter] pilot_notes sync failed:', error);
      });
    },

    /**
     * Health check — run from browser console: SupabaseAdapter.ping()
     */
    async ping() {
      if (!ENABLED) return console.warn('[SupabaseAdapter] disabled — set window.__SUPABASE_URL__ + window.__SUPABASE_KEY__');
      const { data, error } = await sbFetch('rulesets', 'GET', null, { limit: 1 });
      if (error) console.error('[SupabaseAdapter] ❌ PING FAILED:', error);
      else       console.info('[SupabaseAdapter] ✅ PING OK — Supabase connected.', data);
    },

    /** Is Supabase wired up? */
    get isEnabled() { return ENABLED; }
  };

  console.info(`[SupabaseAdapter] loaded. Cloud sync: ${ENABLED ? '✅ ENABLED' : '❌ DISABLED (localStorage only)'}`);
})();
