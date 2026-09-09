(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};

  function makeFinding(id, category, claim, confidence, evidence, toolName, toolVersion) {
    return {
      id: id,
      category: category,
      claim: claim,
      confidence_prior: confidence || 'low',
      evidence: evidence || {},
      provenance: {
        source_tool: toolName,
        source_version: toolVersion || 'v1'
      }
    };
  }

  function toolResult(name, version, findings, uncertainty) {
    return {
      tool_name: name,
      tool_version: version || 'v1',
      findings: findings || [],
      uncertainty: uncertainty || []
    };
  }

  function id(prefix, index) {
    return 'ev_' + prefix + '_' + String(index || 1).padStart(3, '0');
  }

  var api = { makeFinding: makeFinding, toolResult: toolResult, id: id };
  ChampionsSim.analysis.tools.helpers = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
