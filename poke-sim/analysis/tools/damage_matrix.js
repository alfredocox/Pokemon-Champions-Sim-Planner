(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'summarizeDamageMatrix';
  var VERSION = 'v1';

  function summarizeDamageMatrix(input) {
    input = input || {};
    var rows = input.damage_events || input.damage_matrix || [];
    if (!Array.isArray(rows) || !rows.length) {
      return H.toolResult(TOOL, VERSION, [], ['No damage matrix or damage events were available.']);
    }
    return H.toolResult(TOOL, VERSION, [
      H.makeFinding(H.id('damage', 1), 'damage', 'Known damage pressure exists in supplied battle evidence.', 'medium', {
        observed_rows: rows.length,
        source: input.damage_events ? 'damage_events' : 'damage_matrix'
      }, TOOL, VERSION)
    ], []);
  }

  var api = { summarizeDamageMatrix: summarizeDamageMatrix };
  ChampionsSim.analysis.tools.damageMatrix = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
