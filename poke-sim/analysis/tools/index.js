(function(root) {
  'use strict';
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.tools = ChampionsSim.analysis.tools || {};

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      helpers: require('./_tool_helpers.js'),
      validateTeamAnalysis: require('./validate_team_analysis.js'),
      speedTiers: require('./speed_tiers.js'),
      damageMatrix: require('./damage_matrix.js'),
      threatDetection: require('./threat_detection.js'),
      leadRecommendations: require('./lead_recommendations.js'),
      roleCoverage: require('./role_coverage.js'),
      replaySummary: require('./replay_summary.js'),
      criticalTurns: require('./critical_turns.js')
    };
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
