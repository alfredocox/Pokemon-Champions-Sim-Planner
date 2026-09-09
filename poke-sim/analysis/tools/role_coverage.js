(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'summarizeRoleCoverage';
  var VERSION = 'v1';

  function summarizeRoleCoverage(input) {
    input = input || {};
    var identity = input.team_identity || input.identity || null;
    if (!identity) return H.toolResult(TOOL, VERSION, [], ['No team identity or role coverage input was supplied.']);
    return H.toolResult(TOOL, VERSION, [
      H.makeFinding(H.id('role', 1), 'team_identity', 'Team identity is ' + identity + '.', 'medium', {
        identity: identity,
        roles: input.roles || []
      }, TOOL, VERSION)
    ], []);
  }

  var api = { summarizeRoleCoverage: summarizeRoleCoverage };
  ChampionsSim.analysis.tools.roleCoverage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
