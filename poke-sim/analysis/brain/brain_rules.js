(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var EvidenceBundle = ChampionsSim.analysis.evidenceBundle;
  var Confidence = ChampionsSim.analysis.confidence;
  if (typeof require === 'function') {
    if (!EvidenceBundle) { try { EvidenceBundle = require('../evidence_bundle.js'); } catch (_e1) {} }
    if (!Confidence) { try { Confidence = require('../confidence.js'); } catch (_e2) {} }
  }

  function findings(bundle, category) {
    return EvidenceBundle && EvidenceBundle.getFindingsByCategory ? EvidenceBundle.getFindingsByCategory(bundle, category) : [];
  }

  function claimHas(finding, text) {
    return String((finding && finding.claim) || '').toLowerCase().indexOf(String(text || '').toLowerCase()) !== -1;
  }

  function detectTeamIdentity(bundle) {
    var direct = findings(bundle, 'team_identity')[0] || findings(bundle, 'role')[0];
    if (direct) {
      return {
        team_identity: (direct.evidence && direct.evidence.identity) || direct.claim,
        evidence_ids: [direct.id]
      };
    }
    if (findings(bundle, 'lead').length && findings(bundle, 'speed').length) {
      return { team_identity: 'pressure offense with speed-control dependency', evidence_ids: [findings(bundle, 'lead')[0].id, findings(bundle, 'speed')[0].id] };
    }
    return { team_identity: 'evidence-limited team profile', evidence_ids: [] };
  }

  function detectSpeedRisk(bundle) {
    var speedFindings = findings(bundle, 'speed');
    var match = null;
    for (var i = 0; i < speedFindings.length; i++) {
      if (claimHas(speedFindings[i], 'speed-control dependency') || claimHas(speedFindings[i], 'trick room') || claimHas(speedFindings[i], 'tailwind')) {
        match = speedFindings[i];
        break;
      }
    }
    if (!match) return null;
    return {
      type: 'major_threat',
      threat: 'Speed-control dependency',
      severity: 'high',
      reason: 'The evidence suggests this team can fall behind if the opponent wins the speed-control exchange.',
      evidence_ids: [match.id]
    };
  }

  function detectLeadPlan(bundle) {
    return findings(bundle, 'lead').map(function(finding) {
      return {
        lead: (finding.evidence && finding.evidence.lead) || [],
        reason_codes: (finding.evidence && finding.evidence.reason_codes) || [],
        assumptions: (finding.evidence && finding.evidence.assumptions) || [],
        evidence_ids: [finding.id]
      };
    });
  }

  function detectMajorThreats(bundle) {
    var threats = findings(bundle, 'threat').map(function(finding) {
      return {
        threat: (finding.evidence && finding.evidence.threat) || finding.claim,
        reason: finding.claim,
        severity: (finding.evidence && finding.evidence.severity) || finding.confidence_prior || 'medium',
        evidence_ids: [finding.id]
      };
    });
    var speedRisk = detectSpeedRisk(bundle);
    if (speedRisk) threats.unshift(speedRisk);
    return threats;
  }

  function detectWinConditions(bundle) {
    var direct = findings(bundle, 'win_condition').map(function(finding) {
      return { text: finding.claim, evidence_ids: [finding.id] };
    });
    if (direct.length) return direct;
    var leads = findings(bundle, 'lead');
    if (leads.length) {
      return [{ text: 'Create early pressure while preserving the late-game cleaner.', evidence_ids: [leads[0].id] }];
    }
    return [];
  }

  function detectReplayTurningPoint(bundle) {
    var turns = findings(bundle, 'critical_turn').concat(findings(bundle, 'replay')).filter(function(finding) {
      return finding.evidence && (finding.evidence.turn != null || finding.evidence.turn_number != null || finding.evidence.single_replay_observation);
    });
    return turns.slice(0, 3).map(function(finding) {
      var turn = finding.evidence.turn != null ? finding.evidence.turn : finding.evidence.turn_number;
      return {
        turn: turn == null ? null : turn,
        text: finding.claim,
        scope: finding.evidence.single_replay_observation ? 'single_replay_observation' : (finding.evidence.scope || 'replay_observation'),
        evidence_ids: [finding.id]
      };
    });
  }

  function detectSuggestedChanges(bundle) {
    var changes = findings(bundle, 'recommendation').map(function(finding) {
      return {
        change: finding.claim,
        reason: (finding.evidence && finding.evidence.reason) || finding.claim,
        legality_status: (finding.evidence && finding.evidence.legality_status) || 'unknown',
        evidence_ids: [finding.id]
      };
    });
    if (!changes.length && detectSpeedRisk(bundle)) {
      changes.push({
        change: 'Test a secondary speed-control line.',
        reason: 'Current evidence shows speed control is a major swing factor.',
        legality_status: 'unknown',
        evidence_ids: detectSpeedRisk(bundle).evidence_ids
      });
    }
    return changes;
  }

  function calculateBrainConfidence(bundle) {
    var level = Confidence && Confidence.confidenceFromEvidence ? Confidence.confidenceFromEvidence(bundle.findings || [], bundle.uncertainty || []) : 'low';
    level = Confidence && Confidence.downgradeConfidenceForUncertainty ? Confidence.downgradeConfidenceForUncertainty(level, bundle.uncertainty || []) : level;
    var reason = (bundle.findings || []).length + ' evidence finding(s)';
    if ((bundle.uncertainty || []).length) reason += ' with ' + (bundle.uncertainty || []).length + ' uncertainty note(s)';
    else reason += ' and no uncertainty notes';
    return { level: level, reason: reason };
  }

  var api = {
    detectTeamIdentity: detectTeamIdentity,
    detectSpeedRisk: detectSpeedRisk,
    detectLeadPlan: detectLeadPlan,
    detectMajorThreats: detectMajorThreats,
    detectWinConditions: detectWinConditions,
    detectReplayTurningPoint: detectReplayTurningPoint,
    detectSuggestedChanges: detectSuggestedChanges,
    calculateBrainConfidence: calculateBrainConfidence
  };

  ChampionsSim.analysis.brain.rules = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
