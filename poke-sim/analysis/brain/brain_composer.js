(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.analysis = ChampionsSim.analysis || {};
  ChampionsSim.analysis.brain = ChampionsSim.analysis.brain || {};

  var EvidenceBundle = ChampionsSim.analysis.evidenceBundle;
  var BrainSchema = ChampionsSim.analysis.brain.schema;
  var Rules = ChampionsSim.analysis.brain.rules;
  var Templates = ChampionsSim.analysis.brain.templates;
  var Validator = ChampionsSim.analysis.brain.validator;
  var Schemas = ChampionsSim.analysis.schemas;
  if (typeof require === 'function') {
    if (!Schemas) { try { Schemas = require('../schemas.js'); } catch (_e0) {} }
    if (!EvidenceBundle) { try { EvidenceBundle = require('../evidence_bundle.js'); } catch (_e1) {} }
    if (!BrainSchema) { try { BrainSchema = require('./brain_schema.js'); } catch (_e2) {} }
    if (!Rules) { try { Rules = require('./brain_rules.js'); } catch (_e3) {} }
    if (!Templates) { try { Templates = require('./brain_templates.js'); } catch (_e4) {} }
    if (!Validator) { try { Validator = require('./brain_validator.js'); } catch (_e5) {} }
  }

  function unique(values) {
    return Schemas && Schemas.unique ? Schemas.unique(values) : Array.from(new Set(values || []));
  }

  function addEvidence(target, ids) {
    (ids || []).forEach(function(id) {
      if (id && target.indexOf(id) === -1) target.push(id);
    });
  }

  function composeBrainAnalysis(evidenceBundle) {
    var bundleValidation = EvidenceBundle.validateEvidenceBundle(evidenceBundle);
    if (!bundleValidation.ok) {
      return { ok: false, analysis: null, validation: bundleValidation, errors: bundleValidation.errors, warnings: bundleValidation.warnings };
    }

    var analysis = BrainSchema.emptyBrainAnalysis({ analysis_type: evidenceBundle.analysis_type });
    analysis.uncertainty = (evidenceBundle.uncertainty || []).slice();
    var evidenceUsed = [];

    var identity = Rules.detectTeamIdentity(evidenceBundle);
    analysis.team_identity = Templates.teamIdentity(identity.team_identity);
    addEvidence(evidenceUsed, identity.evidence_ids);

    var threats = Rules.detectMajorThreats(evidenceBundle);
    analysis.major_threats = threats.map(function(threat) {
      addEvidence(evidenceUsed, threat.evidence_ids);
      return {
        threat: threat.threat,
        reason: Templates.majorThreat(threat),
        severity: threat.severity || 'medium',
        evidence_ids: threat.evidence_ids || []
      };
    });

    var leads = Rules.detectLeadPlan(evidenceBundle);
    analysis.best_leads = leads.map(function(lead) {
      addEvidence(evidenceUsed, lead.evidence_ids);
      return {
        lead: lead.lead || [],
        reason: Templates.leadReason(lead.reason_codes),
        assumptions: lead.assumptions || [],
        evidence_ids: lead.evidence_ids || []
      };
    });

    analysis.win_conditions = Rules.detectWinConditions(evidenceBundle).map(function(win) {
      addEvidence(evidenceUsed, win.evidence_ids);
      return { text: win.text || Templates.winCondition(), evidence_ids: win.evidence_ids || [] };
    });

    analysis.replay_turning_points = Rules.detectReplayTurningPoint(evidenceBundle).map(function(turn) {
      addEvidence(evidenceUsed, turn.evidence_ids);
      return {
        turn: turn.turn,
        text: turn.text || Templates.replayTurningPoint(turn.turn),
        scope: turn.scope || 'single_replay_observation',
        evidence_ids: turn.evidence_ids || []
      };
    });

    analysis.recommended_changes = Rules.detectSuggestedChanges(evidenceBundle).map(function(change) {
      addEvidence(evidenceUsed, change.evidence_ids);
      return {
        change: change.change,
        reason: change.reason,
        legality_status: change.legality_status || 'unknown',
        evidence_ids: change.evidence_ids || []
      };
    });

    analysis.confidence = Rules.calculateBrainConfidence(evidenceBundle);
    analysis.summary = Templates.summary(analysis.team_identity, analysis.major_threats[0] && analysis.major_threats[0].threat);
    analysis.evidence_used = unique(evidenceUsed);
    if (!analysis.evidence_used.length) analysis.uncertainty.push(Templates.insufficientEvidence('no evidence findings were available'));

    var validation = Validator.validateBrainAnalysis(analysis, evidenceBundle);
    return { ok: validation.ok, analysis: analysis, validation: validation, errors: validation.errors, warnings: validation.warnings };
  }

  var api = {
    composeBrainAnalysis: composeBrainAnalysis
  };

  ChampionsSim.analysis.brain.composer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
