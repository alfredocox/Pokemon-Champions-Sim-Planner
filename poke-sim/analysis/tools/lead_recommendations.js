(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};
  var H = ChampionsSim.analysis.tools.helpers;
  if (!H && typeof require === 'function') { try { H = require('./_tool_helpers.js'); } catch (_e) {} }
  var TOOL = 'recommendLeads';
  var VERSION = 'v1';

  function recommendLeads(input) {
    input = input || {};
    var leads = Array.isArray(input.leads) ? input.leads : [];
    var findings = leads.slice(0, 8).map(function(lead, index) {
      return H.makeFinding(H.id('lead', index + 1), 'lead', (lead.claim || (lead.lead || []).join(' + ') + ' is a candidate lead.'), lead.confidence_prior || 'medium', {
        lead: lead.lead || [],
        reason_codes: lead.reason_codes || [],
        assumptions: lead.assumptions || [],
        risk_flags: lead.risk_flags || []
      }, TOOL, VERSION);
    });
    return H.toolResult(TOOL, VERSION, findings, findings.length ? [] : ['No lead candidates were supplied.']);
  }

  var api = { recommendLeads: recommendLeads };
  ChampionsSim.analysis.tools.leadRecommendations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
