(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'detectCriticalTurns';
  var VERSION = 'v1';

  function detectCriticalTurns(input) {
    input = input || {};
    var candidates = Array.isArray(input.candidates) ? input.candidates : [];
    var findings = candidates.slice(0, 5).map(function(turn, index) {
      return H.makeFinding(H.id('critical_turn', index + 1), 'critical_turn', turn.claim || ('Turn ' + turn.turn + ' is a possible swing turn.'), turn.confidence_prior || 'medium', {
        turn: turn.turn,
        signals: turn.signals || [],
        single_replay_observation: true
      }, TOOL, VERSION);
    });
    return H.toolResult(TOOL, VERSION, findings, findings.length ? [] : ['No critical-turn candidates were supplied.']);
  }

  var api = { detectCriticalTurns: detectCriticalTurns };
  ChampionsSim.analysis.tools.criticalTurns = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
