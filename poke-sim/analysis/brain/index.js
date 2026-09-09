(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var api = ChampionsSim.analysis.brain;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      schema: require('./brain_schema.js'),
      rules: require('./brain_rules.js'),
      templates: require('./brain_templates.js'),
      composer: require('./brain_composer.js'),
      validator: require('./brain_validator.js'),
      feedback: (function() { try { return require('./brain_feedback.js'); } catch (_e) { return null; } })(),
      improvementPack: (function() { try { return require('./improvement_pack.js'); } catch (_e) { return null; } })()
    };
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
