(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'validateTeamAnalysis';
  var VERSION = 'v1';

  function validateTeamAnalysis(input) {
    input = input || {};
    var status = input.legality_status || input.legalityStatus || 'unknown';
    if (['legal', 'illegal', 'unknown', 'missing_data'].indexOf(status) === -1) status = 'unknown';
    var uncertainty = [];
    if (status === 'unknown' || status === 'missing_data') uncertainty.push('Team legality is not fully proven.');
    return H.toolResult(TOOL, VERSION, [
      H.makeFinding(H.id('legality', 1), 'legality', 'Team legality status is ' + status + '.', status === 'legal' || status === 'illegal' ? 'high' : 'low', {
        legality_status: status === 'missing_data' ? 'unknown' : status,
        source_gaps: input.source_gaps || []
      }, TOOL, VERSION)
    ], uncertainty);
  }

  var api = { validateTeamAnalysis: validateTeamAnalysis };
  ChampionsSim.analysis.tools.validateTeamAnalysis = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
