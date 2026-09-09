(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'detectThreats';
  var VERSION = 'v1';

  function detectThreats(input) {
    input = input || {};
    var threats = Array.isArray(input.threats) ? input.threats : [];
    var findings = threats.slice(0, 8).map(function(threat, index) {
      return H.makeFinding(H.id('threat', index + 1), 'threat', threat.claim || ('Threat detected: ' + (threat.name || threat.threat || 'unknown')), threat.confidence_prior || 'medium', {
        threat: threat.name || threat.threat || null,
        severity: threat.severity || 'medium',
        reason_codes: threat.reason_codes || []
      }, TOOL, VERSION);
    });
    return H.toolResult(TOOL, VERSION, findings, findings.length ? [] : ['No deterministic threat input was available.']);
  }

  var api = { detectThreats: detectThreats };
  ChampionsSim.analysis.tools.threatDetection = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
