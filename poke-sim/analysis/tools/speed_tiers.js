(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'computeSpeedTiers';
  var VERSION = 'v1';

  function computeSpeedTiers(input) {
    input = input || {};
    var findings = [];
    var uncertainty = [];
    var speedControl = input.speed_control_sources || input.speedControlSources || [];
    if (!Array.isArray(speedControl)) speedControl = [];
    if (speedControl.length) {
      findings.push(H.makeFinding(H.id('speed', 1), 'speed', 'Team has speed-control dependency.', 'medium', {
        speed_control_sources: speedControl,
        risk: 'team may fall behind if speed control is lost'
      }, TOOL, VERSION));
    } else {
      uncertainty.push('No speed-control source data was provided.');
    }
    if (input.trick_room_risk) {
      findings.push(H.makeFinding(H.id('speed', 2), 'speed', 'Team has Trick Room risk.', 'medium', {
        trick_room_risk: true
      }, TOOL, VERSION));
    }
    return H.toolResult(TOOL, VERSION, findings, uncertainty);
  }

  var api = { computeSpeedTiers: computeSpeedTiers };
  ChampionsSim.analysis.tools.speedTiers = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
