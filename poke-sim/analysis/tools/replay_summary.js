(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'summarizeReplay';
  var VERSION = 'v1';

  function summarizeReplay(input) {
    input = input || {};
    var turns = input.turns || (Array.isArray(input.turn_log) ? input.turn_log.length : null);
    if (!turns) return H.toolResult(TOOL, VERSION, [], ['No replay turn data was supplied.']);
    return H.toolResult(TOOL, VERSION, [
      H.makeFinding(H.id('replay', 1), 'replay', 'Replay contains ' + turns + ' observed turn(s).', 'medium', {
        turn_count: turns,
        kos: input.kos || [],
        failed_moves: input.failed_moves || [],
        switches: input.switches || [],
        status_events: input.status_events || [],
        single_replay_observation: true
      }, TOOL, VERSION)
    ], []);
  }

  var api = { summarizeReplay: summarizeReplay };
  ChampionsSim.analysis.tools.replaySummary = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
