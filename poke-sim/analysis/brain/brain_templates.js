(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  function teamIdentity(identity) {
    return identity || 'Evidence-backed team identity is still forming.';
  }

  function summary(identity, risk) {
    var base = identity ? 'This team currently reads as ' + identity + '.' : 'This analysis is based on the available evidence.';
    if (risk) return base + ' Main watch point: ' + risk + '.';
    return base;
  }

  function speedRisk() {
    return 'The main risk is speed control. If the opponent controls speed first, pressure pieces may be forced to trade from behind.';
  }

  function leadReason(reasonCodes) {
    var codes = Array.isArray(reasonCodes) && reasonCodes.length ? reasonCodes.join(', ') : 'available lead evidence';
    return 'This lead is supported by ' + codes + '.';
  }

  function majorThreat(threat) {
    return threat && threat.reason ? threat.reason : 'This threat is supported by the cited evidence.';
  }

  function winCondition() {
    return 'Create early pressure while preserving the late-game cleaner or main win condition.';
  }

  function replayTurningPoint(turn) {
    return 'Replay evidence points to turn ' + turn + ' as a possible swing turn.';
  }

  function confidence(level, reason) {
    return 'Confidence is ' + level + ' because ' + (reason || 'the available evidence is limited') + '.';
  }

  function insufficientEvidence(kind) {
    return 'Insufficient evidence: ' + (kind || 'more simulator or replay evidence is needed') + '.';
  }

  function unknownLegality() {
    return 'Legality is unknown until source-truth validation proves it.';
  }

  var api = {
    teamIdentity: teamIdentity,
    summary: summary,
    speedRisk: speedRisk,
    leadReason: leadReason,
    majorThreat: majorThreat,
    winCondition: winCondition,
    replayTurningPoint: replayTurningPoint,
    confidence: confidence,
    insufficientEvidence: insufficientEvidence,
    unknownLegality: unknownLegality
  };

  ChampionsSim.analysis.brain.templates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
