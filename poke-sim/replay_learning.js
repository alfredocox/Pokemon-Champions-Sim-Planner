// Battle Sensei learning layer.
// Consumes parsed Showdown logs + rule tags and turns them into practice-focused coaching.
(function(root) {
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.replayLearning = ChampionsSim.replayLearning || {};

  function escText(v) { return String(v == null ? '' : v).trim(); }

  function gradeFromScore(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  var BATTLE_IQ_WEIGHTS = {
    lead_iq: 0.12,
    turn_1_iq: 0.13,
    speed_control_iq: 0.13,
    resource_iq: 0.14,
    threat_recognition_iq: 0.14,
    win_condition_iq: 0.14,
    endgame_iq: 0.10,
    risk_discipline_iq: 0.10
  };

  var BATTLE_IQ_LABELS = {
    lead_iq: 'Lead IQ',
    turn_1_iq: 'Turn 1 IQ',
    speed_control_iq: 'Speed Control IQ',
    resource_iq: 'Resource IQ',
    threat_recognition_iq: 'Threat Recognition IQ',
    win_condition_iq: 'Win Condition IQ',
    endgame_iq: 'Endgame IQ',
    risk_discipline_iq: 'Risk Discipline IQ'
  };

  function clampScore(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function standardFromRaw(raw) {
    return Math.max(55, Math.min(145, Math.round(100 + (raw - 70))));
  }

  function battleIqBand(score) {
    if (score >= 130) return 'Elite Battle IQ';
    if (score >= 120) return 'Advanced';
    if (score >= 110) return 'Strong';
    if (score >= 90) return 'Average / Developing';
    if (score >= 80) return 'Needs Focus';
    return 'Major Coaching Opportunity';
  }

  function uniqueReadoutRows(rows) {
    var seen = {};
    return (rows || []).filter(function(row) {
      if (!row) return false;
      var key = [
        escText(row.label).toLowerCase(),
        escText(row.evidence).toLowerCase()
      ].join('||');
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function uniqueReadoutLabels(rows) {
    var seen = {};
    return (rows || []).filter(function(row) {
      if (!row) return false;
      var key = escText(row.label).toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function erfApprox(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function percentileFromStandard(score) {
    var z = (score - 100) / 15;
    return Math.max(1, Math.min(99, Math.round(100 * 0.5 * (1 + erfApprox(z / Math.SQRT2)))));
  }

  function issueWeight(issue) {
    if (!issue) return 0;
    if (issue.severity === 'high') return 18;
    if (issue.severity === 'medium') return 10;
    if (issue.severity === 'low') return 4;
    return 6;
  }

  function confidenceFor(parsed, issues) {
    parsed = parsed || {};
    if (!parsed.ok || !parsed.turns || parsed.turns.length < 2) return 'low';
    if ((parsed.warnings || []).length || (issues || []).some(function(i) { return i.confidence === 'low'; })) return 'medium';
    return 'high';
  }

  function evidenceTier(confidence, evidenceCount) {
    if (confidence === 'high' && evidenceCount >= 2) return 'observed';
    if ((confidence === 'high' || confidence === 'medium') && evidenceCount >= 1) return 'strong_inference';
    if (confidence === 'medium') return 'weak_inference';
    return 'needs_more_data';
  }

  function evidenceLabel(tier) {
    var labels = {
      observed: 'Observed',
      strong_inference: 'Strong inference',
      weak_inference: 'Weak inference',
      needs_more_data: 'Needs more data'
    };
    return labels[tier] || 'Needs more data';
  }

  function buildEvidenceStandard(parsed, review) {
    var issues = (review && review.coachingTags) || [];
    var confidence = confidenceFor(parsed, issues);
    var evidenceCount = 0;
    if (parsed && parsed.leads && parsed.leads.p1 && parsed.leads.p1.length && parsed.leads.p2 && parsed.leads.p2.length) evidenceCount++;
    if (parsed && parsed.teamPreview && ((parsed.teamPreview.p1 || []).length || (parsed.teamPreview.p2 || []).length)) evidenceCount++;
    if (parsed && parsed.turns && parsed.turns.length >= 2) evidenceCount++;
    if (issues.some(function(i) { return i && i.evidence; })) evidenceCount++;
    var tier = evidenceTier(confidence, evidenceCount);
    return {
      priority: 'Observable battle evidence first; supported inference second; speculation last or not at all.',
      tier: tier,
      label: evidenceLabel(tier),
      confidence: confidence,
      rule: 'If evidence is weak, lower confidence, avoid hard claims, and recommend additional battles.',
      opponentIntentRule: 'Never invent opponent intent. Infer likely strategic intent only from common archetype behavior, board state, move sequencing, and revealed information.',
      evidenceCount: evidenceCount,
      missingData: (parsed && parsed.warnings || []).slice()
    };
  }

  function confidenceIntervalFor(confidence) {
    if (confidence === 'high') return 5;
    if (confidence === 'medium') return 8;
    return 12;
  }

  function battleIqConfidenceFor(parsed, issues, sampleSize) {
    var base = confidenceFor(parsed, issues);
    if (base === 'low') return 'low';
    if ((sampleSize || 1) < 5) return 'medium';
    return base;
  }

  function categoryForIssue(issue) {
    var id = issue && issue.id || '';
    var map = {
      bad_lead: 'Lead Selection',
      questionable_bring: 'Lead Selection',
      win_condition_exposed: 'Win Condition Misread',
      speed_control_without_pressure: 'Speed Control Error',
      field_control_failure: 'Speed Control Error',
      protect_misuse: 'Resource Misuse',
      switch_tempo_loss: 'Switching Error',
      targeting_error: 'Targeting Error',
      endgame_misplay: 'Endgame Conversion Error',
      rng_material: 'Risk Management Error'
    };
    return map[id] || (issue && issue.category) || 'Matchup Knowledge Gap';
  }

  function riskForIssue(issue) {
    if (!issue) return 'medium';
    if (issue.severity === 'high') return 'high';
    if (issue.severity === 'low') return 'low';
    return 'medium';
  }

  function decisionScore(issue) {
    var base = 8;
    if (!issue) return base;
    if (issue.severity === 'high') base = 4;
    else if (issue.severity === 'medium') base = 6;
    else if (issue.severity === 'low') base = 7;
    if (issue.id === 'rng_material') base = 7;
    if (issue.confidence === 'low') base += 1;
    return Math.max(1, Math.min(10, base));
  }

  function outcomeQuality(parsed, issue) {
    if (issue && issue.id === 'rng_material') return 'bad outcome / variance check';
    if (parsed && parsed.result === 'win' && issue && issue.severity !== 'high') return 'good outcome';
    if (parsed && parsed.result === 'loss') return 'bad outcome';
    return 'mixed outcome';
  }

  function buildDecisionQuality(parsed, review) {
    var issues = (review && review.coachingTags) || [];
    return issues.slice(0, 8).map(function(issue) {
      var score = decisionScore(issue);
      var outcome = outcomeQuality(parsed, issue);
      var quadrant = score >= 7
        ? (String(outcome).indexOf('bad') >= 0 ? 'good decision / bad outcome' : 'good decision / good outcome')
        : (String(outcome).indexOf('good') >= 0 ? 'bad decision / good outcome' : 'bad decision / bad outcome');
      return {
        turn: issue.turn || null,
        category: categoryForIssue(issue),
        issueId: issue.id,
        decisionQualityScore: score,
        outcomeQuality: outcome,
        matrixQuadrant: quadrant,
        riskLevel: riskForIssue(issue),
        whatHappened: issue.whatHappened || issue.message || '',
        alternativeLine: issue.doInstead || issue.recommendation || '',
        whyAlternativeMayBeBetter: issue.whyMattered || 'It protects decision quality even when the immediate outcome is uncertain.',
        confidence: issue.confidence || 'medium'
      };
    });
  }

  function turnIssueScore(issue) {
    var score = issueWeight(issue);
    if (issue && issue.id === 'bad_lead') score += 4;
    if (issue && issue.id === 'win_condition_exposed') score += 8;
    if (issue && issue.id === 'endgame_misplay') score += 6;
    return score;
  }

  function buildCriticalTurns(parsed, review) {
    parsed = parsed || {};
    review = review || {};
    var issues = (review.coachingTags || []).filter(function(i) { return i && i.turn != null; });
    var timeline = review.turnTimeline || [];
    var confidence = confidenceFor(parsed, issues);
    if (!issues.length) {
      return {
        confidence: confidence,
        firstMistake: null,
        fatalMistake: null,
        biggestSwing: null,
        turns: [],
        note: confidence === 'low' ? 'Needs more data before naming a critical turn.' : 'No clear critical mistake was detected.'
      };
    }

    var ranked = issues.slice().sort(function(a, b) {
      var ds = turnIssueScore(b) - turnIssueScore(a);
      if (ds !== 0) return ds;
      return (a.turn || 0) - (b.turn || 0);
    });
    var firstMistake = issues.find(function(i) { return i.severity !== 'low'; }) || issues[0];
    var fatalMistake = ranked[0] || firstMistake;
    var swingRow = timeline.slice().sort(function(a, b) {
      var am = ((a.metrics || {}).yourFaints || 0) * 3 + ((a.metrics || {}).opponentMoves || 0) - ((a.metrics || {}).opponentFaints || 0) * 2;
      var bm = ((b.metrics || {}).yourFaints || 0) * 3 + ((b.metrics || {}).opponentMoves || 0) - ((b.metrics || {}).opponentFaints || 0) * 2;
      return bm - am;
    })[0] || null;
    var swingIssue = swingRow ? issues.find(function(i) { return i.turn === swingRow.turn; }) : null;
    var biggestSwing = swingIssue || fatalMistake;

    function card(kind, issue) {
      if (!issue) return null;
      return {
        kind: kind,
        turn: issue.turn,
        category: categoryForIssue(issue),
        issueId: issue.id,
        whatHappened: issue.whatHappened || issue.message || '',
        whyItMattered: issue.whyMattered || '',
        betterAlternative: issue.doInstead || issue.recommendation || '',
        confidence: confidence === 'low' ? 'low' : (issue.confidence || confidence),
        timelineAnchor: 'turn-' + issue.turn
      };
    }

    return {
      confidence: confidence,
      firstMistake: card('First mistake', firstMistake),
      fatalMistake: card('Fatal mistake', fatalMistake),
      biggestSwing: card('Biggest swing', biggestSwing),
      turns: [card('First mistake', firstMistake), card('Fatal mistake', fatalMistake), card('Biggest swing', biggestSwing)].filter(Boolean),
      note: firstMistake && fatalMistake && firstMistake.turn !== fatalMistake.turn
        ? 'First mistake and fatal mistake differ; the game likely became harder before it became unrecoverable.'
        : 'First mistake and fatal mistake may be the same turn from this log.'
    };
  }

  function buildScorecard(parsed, review) {
    var issues = (review && review.coachingTags) || [];
    function scoreFor(ids, base) {
      return Math.max(45, base - issues.filter(function(i) { return ids.indexOf(i.id) >= 0; }).reduce(function(sum, i) { return sum + issueWeight(i); }, 0));
    }
    var cards = [
      { label: 'Lead Selection', score: scoreFor(['bad_lead', 'questionable_bring'], 88) },
      { label: 'Turn 1 Plan', score: scoreFor(['bad_lead', 'targeting_error', 'field_control_failure'], 86) },
      { label: 'Speed Control', score: scoreFor(['speed_control_without_pressure', 'field_control_failure'], 86) },
      { label: 'Resource Management', score: scoreFor(['protect_misuse', 'switch_tempo_loss', 'rng_material'], 84) },
      { label: 'Endgame Conversion', score: scoreFor(['endgame_misplay', 'win_condition_exposed'], 86) }
    ];
    var overall = Math.round(cards.reduce(function(sum, c) { return sum + c.score; }, 0) / Math.max(1, cards.length));
    cards.forEach(function(c) { c.grade = gradeFromScore(c.score); });
    return {
      overallDecisionQuality: overall,
      overallGrade: gradeFromScore(overall),
      confidence: confidenceFor(parsed, issues),
      cards: cards
    };
  }

  function meaningfulEndgame(parsed, review) {
    parsed = parsed || {};
    var issues = review && review.coachingTags || [];
    return (parsed.totalTurns || 0) >= 4 || issues.some(function(i) { return i.id === 'endgame_misplay'; });
  }

  function buildBattleIqScore(parsed, review, opts) {
    parsed = parsed || {};
    review = review || {};
    opts = opts || {};
    var issues = review.coachingTags || [];
    var confidence = battleIqConfidenceFor(parsed, issues, opts.sampleSize || 1);
    var scores = {};
    var positive = {};
    var negative = {};
    Object.keys(BATTLE_IQ_WEIGHTS).forEach(function(k) {
      scores[k] = 70;
      positive[k] = [];
      negative[k] = [];
    });

    function add(key, points, text) {
      if (!scores.hasOwnProperty(key)) return;
      scores[key] += points;
      if (points >= 0) positive[key].push({ points: points, text: text });
      else negative[key].push({ points: points, text: text });
    }

    var summary = review.summary || {};
    if ((summary.yourLead || []).length && (summary.opponentLead || []).length) add('lead_iq', 8, 'Opening leads were visible enough to evaluate the plan.');
    if (summary.selectedFourConfidence && summary.selectedFourConfidence.level === 'high') add('lead_iq', 5, 'Selected four were inferred with high confidence.');
    if (parsed.result === 'win') add('risk_discipline_iq', 3, 'Result slightly supports execution, but win/loss is not the primary scoring driver.');

    issues.forEach(function(issue) {
      var id = issue.id;
      if (id === 'bad_lead') {
        add('lead_iq', -15, 'Lead gave the opponent too much opening access.');
        add('turn_1_iq', -10, 'Turn 1 plan depended on an interrupt that did not hold.');
        add('threat_recognition_iq', -4, 'Opponent setup threat was not fully answered from preview.');
      } else if (id === 'questionable_bring') {
        add('lead_iq', -5, 'Bring-four evidence was incomplete, so lead quality is less reliable.');
      } else if (id === 'speed_control_without_pressure') {
        add('speed_control_iq', -12, 'Speed control was used without immediate pressure or conversion.');
        add('turn_1_iq', -6, 'Early speed control did not create a clear follow-up.');
      } else if (id === 'speed_control_reversal') {
        add('speed_control_iq', 12, 'Trick Room or a reversal line answered the opponent speed plan.');
        add('turn_1_iq', 6, 'The opening speed contest was handled with a concrete answer.');
      } else if (id === 'speed_control_neutralized') {
        add('speed_control_iq', 4, 'Opponent speed control was matched, making the next board decision more important than raw speed.');
      } else if (id === 'speed_control_converted' || id === 'deferred_payoff') {
        add('speed_control_iq', 10, 'Speed control converted into immediate or short-window payoff.');
        add('resource_iq', 4, 'The setup turn produced value instead of becoming a passive tempo loss.');
      } else if (id === 'planned_speed_transition') {
        add('speed_control_iq', 8, 'The line preserved normal-speed advantage after Trick Room ended.');
        add('endgame_iq', 4, 'The transition window was handled with a clearer closer plan.');
      } else if (id === 'complementary_turn_payoff') {
        add('resource_iq', 8, 'A setup/protection turn enabled payoff instead of wasting tempo.');
        add('turn_1_iq', 3, 'The turn sequence showed multi-turn planning.');
      } else if (id === 'field_control_failure') {
        add('speed_control_iq', -15, 'Opponent field or speed control advanced without a meaningful trade.');
        add('threat_recognition_iq', -12, 'The must-answer field threat was not denied or punished.');
        add('turn_1_iq', -8, 'The opening sequence let the opponent establish their plan.');
      } else if (id === 'protect_misuse') {
        add('resource_iq', -8, 'Protect did not clearly preserve the right resource or deny progress.');
        add('risk_discipline_iq', -4, 'The defensive line gave the opponent room to improve position.');
      } else if (id === 'switch_tempo_loss') {
        add('resource_iq', -6, 'Switching did not clearly convert into a stronger resource state.');
        add('risk_discipline_iq', -5, 'The position reset lacked enough fallback pressure.');
      } else if (id === 'targeting_error') {
        add('threat_recognition_iq', -10, 'Targeting spent pressure into a low-value or blocked line.');
        add('turn_1_iq', -8, 'The first action did not answer the immediate threat cleanly.');
        add('risk_discipline_iq', -4, 'The line was fragile if the target interaction failed.');
      } else if (id === 'win_condition_exposed') {
        add('win_condition_iq', -15, 'A key piece for the win path was exposed before its value was converted.');
        add('resource_iq', -10, 'A limited resource was lost without enough compensation.');
      } else if (id === 'endgame_misplay') {
        add('endgame_iq', -15, 'The final exchange did not preserve the closing piece.');
        add('win_condition_iq', -6, 'The late-game win path was not fully protected.');
      } else if (id === 'rng_material') {
        add('risk_discipline_iq', -3, 'Variance appeared, so the prior turn should be checked for safer alternatives.');
      } else if (id === 'lost_exchange') {
        add('resource_iq', -8, 'Material was lost without an immediate trade.');
        add('win_condition_iq', -6, 'The exchange may have weakened the remaining win path.');
      }
    });

    if (!issues.some(function(i) { return i.id === 'speed_control_without_pressure' || i.id === 'field_control_failure'; })) {
      add('speed_control_iq', 6, 'No major speed-control error was detected from this log.');
    }
    if (!issues.some(function(i) { return i.id === 'win_condition_exposed' || i.id === 'endgame_misplay'; })) {
      add('win_condition_iq', 5, 'No clear win-condition abandonment was detected.');
    }
    if (!issues.some(function(i) { return i.id === 'protect_misuse' || i.id === 'switch_tempo_loss'; })) {
      add('resource_iq', 4, 'No major resource misuse was detected from parsed events.');
    }

    Object.keys(scores).forEach(function(k) { scores[k] = clampScore(scores[k]); });
    var weights = Object.assign({}, BATTLE_IQ_WEIGHTS);
    if (!meaningfulEndgame(parsed, review)) {
      var redistributed = weights.endgame_iq / 4;
      weights.endgame_iq = 0;
      weights.turn_1_iq += redistributed;
      weights.resource_iq += redistributed;
      weights.threat_recognition_iq += redistributed;
      weights.win_condition_iq += redistributed;
    }
    var rawComposite = 0;
    Object.keys(weights).forEach(function(k) { rawComposite += scores[k] * weights[k]; });
    rawComposite = clampScore(rawComposite);
    var standard = standardFromRaw(rawComposite);
    var displayScore = standard;
    var displayBand = battleIqBand(standard);
    var displayPercentile = percentileFromStandard(standard);
    var margin = confidenceIntervalFor(confidence);
    var subScores = Object.keys(BATTLE_IQ_LABELS).map(function(k) {
      return {
        id: k,
        label: BATTLE_IQ_LABELS[k],
        rawScore: scores[k],
        standardScore: standardFromRaw(scores[k]),
        confidence: confidence,
        weight: Math.round((weights[k] || 0) * 100),
        positiveEvidence: positive[k].slice(0, 3),
        negativeEvidence: negative[k].slice(0, 3)
      };
    });
    var raisedBy = [];
    var loweredBy = [];
    subScores.forEach(function(s) {
      s.positiveEvidence.forEach(function(e) { raisedBy.push({ area: s.label, points: e.points, text: e.text }); });
      s.negativeEvidence.forEach(function(e) { loweredBy.push({ area: s.label, points: e.points, text: e.text }); });
    });
    raisedBy.sort(function(a, b) { return b.points - a.points; });
    loweredBy.sort(function(a, b) { return a.points - b.points; });
    if (confidence === 'low') {
      displayScore = null;
      displayBand = 'Needs more data';
      displayPercentile = null;
    }
    var weakest = subScores.slice().sort(function(a, b) { return a.rawScore - b.rawScore; })[0];
    var drillIssue = issues.find(function(issue) {
      return categoryForIssue(issue).toLowerCase().indexOf((weakest.label || '').split(' ')[0].toLowerCase()) >= 0;
    }) || issues.slice().sort(function(a, b) { return issueWeight(b) - issueWeight(a); })[0] || null;
    return {
      definition: 'A standardized estimate of game-specific competitive battle intelligence based on observable battle decisions, matchup context, and player execution patterns. This is not a measure of general human intelligence.',
      status: 'Provisional Battle IQ',
      rawComposite: rawComposite,
      standardScore: standard,
      displayScore: displayScore,
      percentile: displayPercentile,
      confidence: confidence,
      confidenceInterval: confidence === 'low' ? [] : [standard - margin, standard + margin],
      band: displayBand,
      subScores: subScores,
      raisedBy: raisedBy.slice(0, 2),
      loweredBy: loweredBy.slice(0, 2),
      recommendedDrill: drillForIssue(drillIssue),
      outcomeBiasProtection: 'Win/loss is only a small modifier. The score prioritizes line quality, resource trade, threat recognition, and win-condition alignment.',
      reliabilityNote: confidence === 'medium' ? 'A single clean battle can support useful coaching, but profile-level Battle IQ needs repeated logs across matchups.' : (confidence === 'low' ? 'This log is too incomplete for strong Battle IQ claims.' : 'Multiple comparable battles support a more reliable Battle IQ estimate.')
    };
  }

  function inferOpponentPlan(parsed, side) {
    parsed = parsed || {};
    var opp = side === 'p1' ? 'p2' : 'p1';
    var oppMoves = [];
    var fieldSignals = [];
    (parsed.turns || []).forEach(function(t) {
      (t.moves || []).forEach(function(m) { if (m.side === opp) oppMoves.push(m.move); });
      (t.field || []).forEach(function(f) {
        if (!f.side || f.side === opp || /trick room|tailwind|weather|terrain/i.test(f.value || f.text || '')) {
          fieldSignals.push(f.value || f.text || f.type || 'field effect');
        }
      });
    });
    var joined = oppMoves.join(' | ');
    var signals = [];
    if (/Trick Room/i.test(joined)) signals.push('establish Trick Room and reverse speed order');
    if (/Tailwind|Icy Wind|Electroweb|Thunder Wave/i.test(joined)) signals.push('control move order');
    if (/Follow Me|Rage Powder/i.test(joined)) signals.push('use redirection to protect setup');
    if (/Helping Hand/i.test(joined)) signals.push('amplify one-slot damage pressure');
    var confidence = confidenceFor(parsed, []);
    var tier = evidenceTier(confidence, signals.length + fieldSignals.length);
    if (!signals.length) {
      return {
        leadGoal: 'Needs more data',
        pressurePattern: 'Not enough observed move sequencing to infer a reliable opponent plan.',
        setupPattern: 'Needs more data',
        baitPattern: 'Needs more data',
        endgamePlan: 'Needs more data',
        recognizeNextTime: 'Upload a fuller log or more battles, then identify the must-answer slot before turn 1.',
        confidence: 'low',
        evidenceTier: 'needs_more_data',
        evidenceLabel: evidenceLabel('needs_more_data'),
        evidence: fieldSignals.slice(0, 4)
      };
    }
    return {
      leadGoal: signals[0],
      pressurePattern: signals.join('; '),
      setupPattern: /Trick Room/i.test(joined) ? 'setup protected by support or redirection' : 'not enough setup evidence from this log',
      baitPattern: /Fake Out|Protect|Follow Me|Rage Powder/i.test(joined) ? 'possible support bait around turn-one protection or redirection' : 'not enough bait evidence',
      endgamePlan: tier === 'observed' || tier === 'strong_inference' ? 'likely preserve the attacker or field state that benefits from the observed opening plan' : 'Needs more data',
      recognizeNextTime: 'Identify the must-answer slot before turn 1, then ask whether your lead still works if Fake Out or Protect fails.',
      confidence: confidence === 'high' ? 'medium' : confidence,
      evidenceTier: tier,
      evidenceLabel: evidenceLabel(tier),
      evidence: signals.concat(fieldSignals).slice(0, 4)
    };
  }

  function normalizeNames(list) {
    return (list || []).map(function(v) { return escText(v).toLowerCase(); }).filter(Boolean);
  }

  function overlapScore(a, b) {
    var aa = normalizeNames(a);
    var bb = normalizeNames(b);
    if (!aa.length || !bb.length) return null;
    var hits = aa.filter(function(x) { return bb.indexOf(x) >= 0; }).length;
    return hits / Math.max(aa.length, bb.length);
  }

  function namesNotIn(pool, used) {
    var usedNames = normalizeNames(used);
    return (pool || []).filter(function(name) {
      return usedNames.indexOf(escText(name).toLowerCase()) < 0;
    });
  }

  function lineupCombinations(roster, size) {
    roster = (roster || []).slice(0, 6);
    size = Math.max(1, Math.min(size || 4, roster.length));
    var out = [];
    function walk(start, picked) {
      if (picked.length === size) {
        out.push(picked.slice());
        return;
      }
      for (var i = start; i < roster.length; i++) {
        picked.push(roster[i]);
        walk(i + 1, picked);
        picked.pop();
      }
    }
    walk(0, []);
    return out;
  }

  function lineupKey(lineup) {
    return normalizeNames(lineup).sort().join('|');
  }

  function lineupNames(row) {
    if (Array.isArray(row)) return row.slice();
    return (row && (row.lineup || row.four || row.bring || row.pokemon || row.team)) || [];
  }

  function lineupScore(row) {
    if (!row || Array.isArray(row)) return null;
    if (typeof row.winRate === 'number') return row.winRate;
    if (typeof row.win_rate === 'number') return row.win_rate;
    if (typeof row.score === 'number') return row.score;
    if (typeof row.expectedWinRate === 'number') return row.expectedWinRate;
    if (typeof row.wins === 'number' && typeof row.losses === 'number' && row.wins + row.losses > 0) return row.wins / (row.wins + row.losses);
    return null;
  }

  function buildLineupMatrixReport(ctx) {
    ctx = ctx || {};
    var seriesFormat = String(ctx.seriesFormat || 'bo3').toLowerCase();
    var seriesGames = seriesFormat === 'bo1' ? 1 : seriesFormat === 'bo5' ? 5 : 3;
    var adaptationNote = seriesGames === 1
      ? 'Best-of-one context: choose the highest-confidence game-one lineup because there is no in-series swap chance.'
      : 'Series context: rank opening lineup plus swap options because players can adapt between games.';
    var matrix = ctx.lineupMatrix || [];
    var scored = (ctx.evaluatedLineups || []).map(function(row) {
      return {
        lineup: lineupNames(row),
        score: lineupScore(row),
        wins: row && typeof row.wins === 'number' ? row.wins : null,
        losses: row && typeof row.losses === 'number' ? row.losses : null,
        note: row && row.note ? row.note : ''
      };
    }).filter(function(row) { return row.lineup.length && row.score != null; });
    scored.sort(function(a, b) { return b.score - a.score; });
    var actualKey = lineupKey(ctx.actualFour || []);
    var actualIndex = scored.findIndex(function(row) { return lineupKey(row.lineup) === actualKey; });
    var best = scored[0] || null;
    var worst = scored.length ? scored[scored.length - 1] : null;
    var actual = actualIndex >= 0 ? scored[actualIndex] : null;
    var recommendation = '';
    if (!ctx.registeredRoster || ctx.registeredRoster.length < (ctx.lineupSize || 4)) {
      recommendation = 'Enter the registered six before trusting lineup recommendations.';
    } else if (!ctx.lineupMatrixComplete) {
      recommendation = 'Run the missing lineup-matrix sims before calling any lineup the best.';
    } else if (best) {
      recommendation = 'Use the top scored lineup first, then compare the replay lineup against its win path and switch options.';
    } else {
      recommendation = 'Lineup matrix is enumerated, but scored win-rate results are still needed to choose the best lineup.';
    }
    return {
      status: ctx.lineupMatrixComplete && scored.length ? 'ranked' : (ctx.lineupMatrixComplete ? 'needs_scores' : 'incomplete'),
      expectedLineupCount: matrix.length,
      scoredLineupCount: scored.length,
      actualRank: actualIndex >= 0 ? actualIndex + 1 : null,
      actualLineup: ctx.actualFour || [],
      actualScore: actual ? actual.score : null,
      bestLineup: best ? best.lineup : (ctx.bestFour || []),
      bestScore: best ? best.score : null,
      worstLineup: worst ? worst.lineup : [],
      worstScore: worst ? worst.score : null,
      topLineups: scored.slice(0, 3),
      avoidLineups: scored.slice(-3).reverse(),
      seriesFormat: seriesFormat,
      seriesGames: seriesGames,
      adaptationNote: adaptationNote,
      recommendation: recommendation,
      playerNeed: 'Find the best lineup from the registered roster for the selected series format, then explain whether the loss came from lineup choice, lead choice, move choice, switch timing, or execution.'
    };
  }

  function buildSimComparison(parsed, review, opts) {
    opts = opts || {};
    var plan = opts.simPlan || opts.simRecommendation || opts.simComparison || null;
    var summary = (review && review.summary) || {};
    var actualLead = summary.yourLead || [];
    var actualFour = summary.yourFour || [];
    var registeredRoster = (plan && (plan.registeredRoster || plan.fullRoster || plan.teamPreview)) ||
      summary.yourPreview ||
      (parsed && parsed.teamPreview && parsed.teamPreview[summary.yourSide || parsed.selectedSide || 'p1']) ||
      [];
    var lineupSize = plan && (plan.lineupSize || plan.bringCount) ? (plan.lineupSize || plan.bringCount) : Math.max(actualFour.length || 0, 4);
    var noData = {
      status: 'needs_sim_data',
      evidenceTier: 'needs_more_data',
      evidenceLabel: evidenceLabel('needs_more_data'),
      confidence: 'low',
      note: 'No matched simulation recommendation was provided for this replay yet.',
      decisionChange: 'Run this matchup in Sim Mode or upload more logs so Battle Sensei can compare the best sim lead/four/path against the trainer’s real replay choices.',
      actualLead: actualLead,
      actualFour: actualFour,
      registeredRoster: registeredRoster,
      lineupSize: lineupSize,
      bo3SwapContext: registeredRoster.length >= lineupSize ? 'Registered roster known; compare each game-specific lineup against the available swap options.' : 'Registered roster incomplete; lineup swap analysis is limited.'
    };
    if (!plan) return noData;
    var bestLead = plan.bestLead || plan.recommendedLead || plan.bestSimLead || [];
    var bestFour = plan.bestFour || plan.recommendedFour || plan.bestSimFour || [];
    var expectedWinPath = plan.expectedWinPath || plan.winPath || plan.safestLine || '';
    var seriesFormat = plan.seriesFormat || plan.matchType || plan.series || opts.seriesFormat || opts.matchType || 'bo3';
    var leadOverlap = overlapScore(actualLead, bestLead);
    var fourOverlap = overlapScore(actualFour, bestFour);
    var confidence = confidenceFor(parsed, (review && review.coachingTags) || []);
    if (plan.matchConfidence === 'low' || plan.confidence === 'low') confidence = 'low';
    var registeredCount = registeredRoster.length;
    var swapOptions = namesNotIn(registeredRoster, actualFour);
    var simBenchOptions = namesNotIn(registeredRoster, bestFour);
    var lineupMatrix = (plan.lineupMatrix || plan.lineupCombos || plan.allLineupCombos || []);
    if (!lineupMatrix.length && registeredCount >= lineupSize) lineupMatrix = lineupCombinations(registeredRoster, lineupSize);
    var evaluatedLineups = plan.evaluatedLineups || plan.scoredLineups || [];
    var expectedLineupCount = lineupMatrix.length;
    var evaluatedLineupCount = evaluatedLineups.length || (plan.lineupMatrixComplete ? expectedLineupCount : 0);
    var lineupMatrixComplete = !!plan.lineupMatrixComplete || (expectedLineupCount > 0 && evaluatedLineupCount >= expectedLineupCount);
    var lineupCoverageLabel = expectedLineupCount
      ? (lineupMatrixComplete ? 'All ' + expectedLineupCount + ' registered-roster lineups evaluated' : evaluatedLineupCount + '/' + expectedLineupCount + ' registered-roster lineups evaluated')
      : 'Registered roster incomplete; lineup matrix unavailable';
    var lineupMatrixReport = buildLineupMatrixReport({
      registeredRoster: registeredRoster,
      lineupSize: lineupSize,
      lineupMatrix: lineupMatrix,
      evaluatedLineups: evaluatedLineups,
      lineupMatrixComplete: lineupMatrixComplete,
      actualFour: actualFour,
      bestFour: bestFour,
      seriesFormat: seriesFormat
    });
    var evidenceCount = 1 + (leadOverlap != null ? 1 : 0) + (fourOverlap != null ? 1 : 0) + (expectedWinPath ? 1 : 0) + (registeredCount >= lineupSize ? 1 : 0) + (lineupMatrixComplete ? 1 : 0);
    var tier = evidenceTier(confidence, evidenceCount);
    var firstDeviation = 'Needs more data';
    if (leadOverlap != null && leadOverlap < 1) firstDeviation = 'Actual lead differed from the sim-recommended lead.';
    else if (fourOverlap != null && fourOverlap < 1) firstDeviation = 'Actual game-specific lineup differed from the sim-recommended lineup from the registered roster.';
    else if (expectedWinPath) firstDeviation = 'Lead/four matched; compare turn sequencing against expected win path.';
    return {
      status: 'matched',
      evidenceTier: tier,
      evidenceLabel: evidenceLabel(tier),
      confidence: confidence === 'high' ? 'medium' : confidence,
      actualLead: actualLead,
      bestSimLead: bestLead,
      actualFour: actualFour,
      bestSimFour: bestFour,
      registeredRoster: registeredRoster,
      lineupSize: lineupSize,
      actualSwapOptions: swapOptions,
      simBenchOptions: simBenchOptions,
      lineupMatrix: lineupMatrix.slice(0, 30),
      expectedLineupCount: expectedLineupCount,
      evaluatedLineupCount: evaluatedLineupCount,
      lineupMatrixComplete: lineupMatrixComplete,
      lineupCoverageLabel: lineupCoverageLabel,
      lineupMatrixReport: lineupMatrixReport,
      seriesFormat: lineupMatrixReport.seriesFormat,
      seriesGames: lineupMatrixReport.seriesGames,
      bo3SwapContext: registeredCount >= lineupSize
        ? lineupMatrixReport.adaptationNote + ' Evaluate this game lineup as one selectable squad from the registered roster, not as the whole team. Sim coverage should include every legal lineup combination.'
        : 'Series lineup swap analysis is limited because the registered roster is incomplete.',
      leadMatch: leadOverlap == null ? 'unknown' : Math.round(leadOverlap * 100),
      fourMatch: fourOverlap == null ? 'unknown' : Math.round(fourOverlap * 100),
      expectedWinPath: expectedWinPath || 'Needs sim win-path data',
      actualPath: summary.mainIssue || 'Needs turn review',
      firstDeviation: firstDeviation,
      teamVsPilotDiagnosis: firstDeviation.indexOf('Lead/four matched') === 0 ? 'Pilot or sequencing issue is more likely than team selection, but this remains provisional.' : 'Lead/lineup selection may have diverged from the simulated plan; verify across best-of-three games before changing the team.',
      decisionChange: 'Use this comparison to decide whether the trainer should swap to a different game-specific lineup from the registered roster, practice the same sim plan with cleaner sequencing, or run the missing lineup-matrix sims before changing the team.',
      source: plan.source || 'matched simulation plan',
      matchedOpponentKey: plan.matchedOpponentKey || '',
      matchedOpponentName: plan.matchedOpponentName || '',
      matchConfidence: plan.matchConfidence || confidence
    };
  }

  function normalizeSignalConfidence(confidence) {
    if (confidence === 'high') return 'high';
    if (confidence === 'medium') return 'medium';
    return 'low';
  }

  function issueIds(review) {
    return ((review && review.coachingTags) || []).map(function(issue) { return issue && issue.id; }).filter(Boolean);
  }

  function countIssues(review, ids) {
    var set = {};
    (ids || []).forEach(function(id) { set[id] = true; });
    return issueIds(review).filter(function(id) { return !!set[id]; }).length;
  }

  function scenarioFromIssues(review, simComparison) {
    var ids = issueIds(review);
    if (ids.indexOf('speed_control_without_pressure') >= 0) return 'speed_control_no_pressure';
    if (ids.indexOf('field_control_failure') >= 0) return 'field_control_allowed';
    if (ids.indexOf('bad_lead') >= 0) return 'turn_one_lead_collapse';
    if (ids.indexOf('protect_misuse') >= 0) return 'protect_gives_free_setup';
    if (ids.indexOf('switch_tempo_loss') >= 0) return 'passive_switch_tempo_loss';
    if (ids.indexOf('win_condition_exposed') >= 0) return 'win_condition_exposed_before_conversion';
    if (ids.indexOf('endgame_misplay') >= 0) return 'endgame_conversion_failure';
    if (simComparison && simComparison.status === 'matched' && simComparison.firstDeviation) {
      if (/lead/i.test(simComparison.firstDeviation)) return 'actual_lead_differs_from_sim_plan';
      if (/four|selected/i.test(simComparison.firstDeviation)) return 'actual_four_differs_from_sim_plan';
    }
    return 'general_replay_review';
  }

  function rngContamination(review) {
    var rng = ((review && review.coachingTags) || []).filter(function(issue) { return issue && issue.id === 'rng_material'; }).length;
    if (rng >= 2) return 'moderate';
    if (rng === 1) return 'minor';
    return 'none';
  }

  function buildSimFeedbackPacket(parsed, review, simComparison) {
    review = review || {};
    simComparison = simComparison || buildSimComparison(parsed, review, {});
    var ids = issueIds(review);
    var matched = simComparison.status === 'matched';
    var leadMismatch = matched && typeof simComparison.leadMatch === 'number' && simComparison.leadMatch < 100;
    var fourMismatch = matched && typeof simComparison.fourMatch === 'number' && simComparison.fourMatch < 100;
    var leadIssue = ids.indexOf('bad_lead') >= 0 || leadMismatch;
    var bringIssue = ids.indexOf('questionable_bring') >= 0 || fourMismatch;
    var fieldOrSpeedIssue = countIssues(review, ['speed_control_without_pressure', 'field_control_failure']) > 0;
    var executionIssueCount = countIssues(review, [
      'speed_control_without_pressure',
      'field_control_failure',
      'protect_misuse',
      'switch_tempo_loss',
      'targeting_error',
      'win_condition_exposed',
      'endgame_misplay',
      'lost_exchange'
    ]);
    var teamConstructionCount = countIssues(review, ['bad_lead', 'questionable_bring']);
    var confidence = normalizeSignalConfidence((simComparison && simComparison.confidence) || confidenceFor(parsed, review.coachingTags || []));
    if (!matched && confidence !== 'low') confidence = 'medium';
    if (!parsed || !parsed.ok) confidence = 'low';

    var shouldCreateScenario = fieldOrSpeedIssue || leadIssue || bringIssue || executionIssueCount >= 2;
    var scenarioType = shouldCreateScenario ? scenarioFromIssues(review, simComparison) : 'none';
    var pilotDifficultySignal = executionIssueCount >= 3 ? 'high' : executionIssueCount >= 1 ? 'medium' : 'low';
    var teamConstructionSignal = teamConstructionCount >= 2 ? 'medium' : teamConstructionCount === 1 ? 'low' : 'none';
    var archetypeSignal = matched && (fieldOrSpeedIssue || leadIssue);
    var packet = {
      shouldUpdateLeadModel: !!(matched && leadIssue && confidence !== 'low'),
      shouldUpdateBringFourModel: !!(matched && bringIssue && confidence !== 'low'),
      shouldUpdateArchetypeModel: !!(matched && archetypeSignal && confidence === 'high'),
      shouldCreateScenario: !!shouldCreateScenario,
      scenarioType: scenarioType,
      pilotDifficultySignal: pilotDifficultySignal,
      teamConstructionSignal: teamConstructionSignal,
      rngContamination: rngContamination(review),
      confidence: confidence,
      evidence: {
        source: 'replay_review',
        simMatched: !!matched,
        leadMatch: simComparison.leadMatch == null ? 'unknown' : simComparison.leadMatch,
        fourMatch: simComparison.fourMatch == null ? 'unknown' : simComparison.fourMatch,
        bo3SwapContext: simComparison.bo3SwapContext || '',
        lineupCoverageLabel: simComparison.lineupCoverageLabel || '',
        lineupMatrixComplete: !!simComparison.lineupMatrixComplete,
        lineupMatrixReport: simComparison.lineupMatrixReport || null,
        actualSwapOptions: simComparison.actualSwapOptions || [],
        simBenchOptions: simComparison.simBenchOptions || [],
        issueIds: ids.slice(0, 8),
        firstDeviation: simComparison.firstDeviation || '',
        note: 'Replay-derived calibration signal only. Do not automatically rewrite sim models from one replay.'
      },
      recommendedAction: shouldCreateScenario
        ? 'Queue this as a replay-derived stress scenario, then retest with simulations before changing recommendations.'
        : 'Keep as coaching context; collect more logs before changing sim assumptions.'
    };
    if (!matched) {
      packet.shouldUpdateLeadModel = false;
      packet.shouldUpdateBringFourModel = false;
      packet.shouldUpdateArchetypeModel = false;
      packet.evidence.note = 'No matched sim plan was available; use this packet for coaching only until the matchup is simulated.';
    }
    if (packet.rngContamination === 'moderate') {
      packet.shouldUpdateLeadModel = false;
      packet.shouldUpdateBringFourModel = false;
      packet.shouldUpdateArchetypeModel = false;
      packet.recommendedAction = 'Treat this replay as variance-contaminated; review safer lines before using it for calibration.';
    }
    return { simFeedback: packet };
  }

  function buildWinPath(parsed, review, critical) {
    var side = parsed && parsed.selectedSide || 'p1';
    var summary = (review && review.summary) || {};
    var first = critical && critical.firstMistake;
    var fatal = critical && critical.fatalMistake;
    var leadNames = (summary.yourLead || []).join(' + ') || 'your lead pair';
    return {
      beforeGame: 'Use your selected four to create speed or positioning control, then preserve the Pokemon that converts the endgame.',
      afterLeads: 'With ' + leadNames + ', your first test is whether the lead pressures the opponent plan even if the first interrupt fails.',
      afterKeyTurn: fatal ? 'After turn ' + fatal.turn + ', the win path likely shifted toward recovery: preserve the remaining cleaner and stop further field control.' : 'No key-turn shift was proven from the log.',
      followedOrAbandoned: first && fatal && first.turn !== fatal.turn ? 'The early plan was stressed before the fatal turn. This suggests an execution path problem, not only a last-turn mistake.' : 'The log does not prove a separate abandoned win path.',
      primaryWinCondition: 'Preserve the piece that converts speed control or endgame damage.',
      opponentWinCondition: inferOpponentPlan(parsed, side).leadGoal
    };
  }

  function drillForIssue(issue) {
    var id = issue && issue.id;
    var table = {
      bad_lead: ['Lead Selection Drill', 'Pick leads into five opposing previews before simming; write what each lead denies and what it loses to.', 'A lead is successful when it has a backup plan if Fake Out, Protect, or redirection changes turn 1.'],
      speed_control_without_pressure: ['Speed Control Conversion Drill', 'Play five games where every Tailwind/Trick Room/Icy Wind turn must create damage, a forced Protect, or preservation of the win condition.', 'Convert speed control into pressure within the first two active turns in four of five games.'],
      protect_misuse: ['Protect Timing Drill', 'Review three turns before clicking Protect and name the resource it preserves.', 'Protect is successful when it stalls a field turn, saves the real win condition, or punishes a double target.'],
      switch_tempo_loss: ['Pivot / Reset Drill', 'Practice switching only when it absorbs damage, resets Intimidate/Fake Out, or improves next-turn pressure.', 'Four of five switches should either deny damage or create a stronger next board.'],
      win_condition_exposed: ['Win Condition Identification Drill', 'Before turn 1 and after every KO, name your current closer and the support piece it needs.', 'The closer survives into the endgame in four of five practice games.'],
      endgame_misplay: ['Endgame Conversion Drill', 'Start from late-game board states and choose the target that keeps your closer alive.', 'Convert favorable 2v2 or 2v1 endgames in four of five drills.'],
      targeting_error: ['Threat Recognition Drill', 'Before choosing a target, label the must-answer opposing slot and the bait slot.', 'Avoid spending Fake Out or double targets into a low-value or protected slot in four of five openings.'],
      field_control_failure: ['Trick Room / Field Denial Drill', 'Practice turns where the opponent threatens Trick Room, weather, terrain, or redirection.', 'Either deny the field state or take a meaningful trade on turn 1 in four of five drills.'],
      rng_material: ['Risk Exposure Review', 'Mark the turn before the RNG event and ask whether a lower-risk line existed.', 'Reduce reliance on one roll when a stable line preserves the same win path.']
    };
    var row = table[id] || ['Decision Review Drill', 'Replay the key turn and write one lower-risk alternative.', 'Name what changed and why the alternative improves future decision quality.'];
    return {
      skill: row[0],
      whyItMatters: issue && issue.whyMattered || 'Repeated decision patterns matter more than one result.',
      drillSetup: row[1],
      whatToRepeat: 'Run the same matchup until the decision process is automatic, then test it against a similar archetype.',
      successCriteria: row[2],
      promptBeforeEachTurn: 'What is my win condition, what is the must-answer threat, and what resource am I spending?'
    };
  }

  function buildPracticePlan(review) {
    var issues = ((review && review.coachingTags) || []).slice().sort(function(a, b) { return issueWeight(b) - issueWeight(a); });
    var drills = [];
    var seen = {};
    issues.forEach(function(issue) {
      if (drills.length >= 3 || seen[issue.id]) return;
      seen[issue.id] = true;
      drills.push(drillForIssue(issue));
    });
    if (!drills.length) drills.push(drillForIssue(null));
    return {
      immediateFocus: drills[0].skill,
      drills: drills,
      learningLoop: {
        observe: 'Review the key board state and identify what actually changed.',
        orient: 'Name the opponent plan, your win condition, and the hidden-information risk.',
        decide: 'Pick the lower-risk line that preserves the win path.',
        act: 'Run the drill repeatedly, then compare the next log against this pattern.'
      }
    };
  }

  function buildTrendDashboard(reports) {
    reports = Array.isArray(reports) ? reports : [];
    if (reports.length < 2) {
      return {
        confidence: 'needs more data',
        mostCommonLossReason: 'Upload multiple logs to detect repeated patterns.',
        repeatedMistakePattern: 'No trend yet from a single review.',
        recommendedNextPracticeBlock: 'Start with the top practice drill from this replay.'
      };
    }
    var counts = {};
    reports.forEach(function(r) {
      (((r.review || {}).coachingTags) || []).forEach(function(issue) {
        counts[issue.id] = (counts[issue.id] || 0) + 1;
      });
    });
    var top = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; })[0];
    return {
      confidence: reports.length >= 10 ? 'medium' : 'low',
      mostCommonLossReason: top || 'No repeated loss reason yet.',
      repeatedMistakePattern: top ? top + ' appeared ' + counts[top] + ' times.' : 'No repeated mistake pattern yet.',
      recommendedNextPracticeBlock: top ? drillForIssue({ id: top }).skill : 'Decision Review Drill'
    };
  }

  function buildPremiumTeasers(report) {
    report = report || {};
    var topDrill = report.practicePlan && report.practicePlan.drills && report.practicePlan.drills[0];
    var critical = report.criticalTurns && report.criticalTurns.fatalMistake;
    var weakest = report.battleIq && report.battleIq.subScores && report.battleIq.subScores.slice().sort(function(a, b) { return a.rawScore - b.rawScore; })[0];
    return {
      title: 'Battle IQ Memory',
      freeValue: 'This review is local and temporary: you get the battle summary, key turns, scorecard, and practice drill without saving a profile.',
      premiumValue: 'A saved profile can remember teams, logs, decisions, recurring patterns, matchup comfort, drills, and improvement over time.',
      lockedInsights: [
        {
          id: 'recurring_mistake_fingerprint',
          label: 'Recurring mistake fingerprint',
          preview: critical ? 'Track how often ' + critical.category + ' appears across your saved games.' : 'Track which mistake categories repeat across your saved games.'
        },
        {
          id: 'personal_practical_win_rate',
          label: 'Personal practical win rate',
          preview: 'Compare simulated win rate against your real replay results and execution difficulty.'
        },
        {
          id: 'adaptive_training_plan',
          label: 'Adaptive training plan',
          preview: topDrill ? 'Turn drills like ' + topDrill.skill + ' into a weekly practice block with progress tracking.' : 'Turn report findings into weekly drills with progress tracking.'
        },
        {
          id: 'matchup_memory',
          label: 'Matchup memory',
          preview: 'Remember which leads, bring-fours, and win paths worked for you into each archetype.'
        },
        {
          id: 'full_battle_iq_subscores',
          label: 'Full Battle IQ sub-score trends',
          preview: weakest ? 'Track whether ' + weakest.label + ' is improving across teams and matchups.' : 'Track all eight Battle IQ sub-scores over time.'
        }
      ],
      backendLearningPolicy: {
        freeAnonymous: 'Free reviews should only contribute opt-in anonymized signals such as archetype, rule id, confidence, lead outcome, and coaching usefulness rating.',
        premiumPrivate: 'Premium profiles can save full normalized reports, teams, logs, drills, and longitudinal player patterns for personalized coaching.',
        rawLogDefault: 'Raw logs should not be silently stored. Save raw logs only when the user explicitly chooses profile history or export.'
      }
    };
  }

  function replayMoveKind(move) {
    var m = escText(move).toLowerCase();
    if (!m) return 'unknown';
    if (m === 'protect' || m === 'detect' || m === 'spiky shield' || m === 'wide guard' || m === 'quick guard') return 'protection';
    if (m === 'fake out') return 'fake_out';
    if (m === 'tailwind' || m === 'trick room' || m === 'icy wind' || m === 'electroweb' || m === 'thunder wave') return 'speed_control';
    if (m === 'follow me' || m === 'rage powder') return 'redirection';
    if (m === 'swords dance' || m === 'nasty plot' || m === 'calm mind' || m === 'dragon dance') return 'setup';
    if (m === 'parting shot' || m === 'u-turn' || m === 'volt switch') return 'pivot';
    if (m === 'helping hand') return 'damage_support';
    return 'attack_or_support';
  }

  function buildLeadLogicRead(parsed, review) {
    parsed = parsed || {};
    review = review || {};
    var summary = review.summary || {};
    var side = parsed.selectedSide || 'p1';
    var opp = side === 'p1' ? 'p2' : 'p1';
    var firstTurn = (parsed.turns || []).find(function(turn) { return turn && turn.number === 1; }) || null;
    var yourMoves = firstTurn ? (firstTurn.moves || []).filter(function(move) { return move.side === side; }) : [];
    var oppMoves = firstTurn ? (firstTurn.moves || []).filter(function(move) { return move.side === opp; }) : [];
    var issueMap = {};
    (review.coachingTags || []).forEach(function(issue) {
      if (issue && issue.id) issueMap[issue.id] = issue;
    });
    var kinds = {};
    yourMoves.forEach(function(move) {
      var kind = replayMoveKind(move.move);
      if (!kinds[kind]) kinds[kind] = [];
      kinds[kind].push(move);
    });
    var oppKinds = {};
    oppMoves.forEach(function(move) {
      var kind = replayMoveKind(move.move);
      if (!oppKinds[kind]) oppKinds[kind] = [];
      oppKinds[kind].push(move);
    });

    var signals = [];
    if ((kinds.fake_out || []).length) {
      signals.push('Fake Out pressure from ' + (kinds.fake_out[0].pokemon || 'your lead') + ' gave the opener an interrupt line into the opposing board.');
    }
    if ((kinds.speed_control || []).length) {
      signals.push((kinds.speed_control[0].move || 'Speed control') + ' gave the pair a move-order plan instead of pure damage racing.');
    }
    if ((kinds.redirection || []).length) {
      signals.push((kinds.redirection[0].move || 'Redirection') + ' gave the lead a protection layer for a setup or pressure partner.');
    }
    if ((kinds.pivot || []).length) {
      signals.push((kinds.pivot[0].move || 'Pivoting') + ' gave the opener a repositioning option if the first board state was unstable.');
    }
    if (!signals.length && (summary.yourLead || []).length) {
      signals.push('Lead logic is only partially visible because this replay did not reveal a strong turn-one support pattern from the opening pair.');
    }

    var pros = [];
    if ((kinds.fake_out || []).length) pros.push('The lead had a turn-one interrupt tool, which is useful when the opponent relies on setup or support to unlock their damage.');
    if ((kinds.speed_control || []).length) pros.push('The lead had direct move-order control, which can create a safer line for your backline if it converts quickly.');
    if ((kinds.redirection || []).length) pros.push('The lead included visible support synergy, so one slot could buy time for the other.');
    if ((oppKinds.setup || oppKinds.speed_control || oppKinds.redirection) && ((kinds.fake_out || []).length || (kinds.speed_control || []).length)) {
      pros.push('Into the shown opposing opener, your pair at least had tools that could contest setup, support, or speed manipulation on turn 1.');
    }

    var cons = [];
    if (issueMap.bad_lead) cons.push(issueMap.bad_lead.whyMattered || issueMap.bad_lead.whatHappened || 'The opening pair still gave the opponent too much access to their plan.');
    if (issueMap.targeting_error) cons.push(issueMap.targeting_error.whyMattered || 'The interrupt line was fragile to protection, terrain, redirection, or move blocking.');
    if (issueMap.field_control_failure || issueMap.speed_control_without_pressure) {
      var issue = issueMap.field_control_failure || issueMap.speed_control_without_pressure;
      cons.push(issue.whyMattered || 'The lead did not convert its speed or field plan into immediate pressure.');
    }
    if (!cons.length && (oppKinds.setup || oppKinds.speed_control)) {
      cons.push('The replay still requires a check on whether the lead could punish the opponent if their first support line resolved cleanly.');
    }

    var identity = [];
    if ((kinds.fake_out || []).length) identity.push('interrupt');
    if ((kinds.speed_control || []).length) identity.push('speed control');
    if ((kinds.redirection || []).length) identity.push('support');
    if ((kinds.setup || []).length) identity.push('setup');
    if (!identity.length) identity.push('pressure');

    return {
      label: identity.join(' + ') + ' opener',
      yourLead: (summary.yourLead || []).slice(),
      opponentLead: (summary.opponentLead || []).slice(),
      synergySignals: signals,
      pros: pros,
      cons: cons,
      confidence: confidenceFor(parsed, review.coachingTags || []),
      limitation: 'This lead read is based on visible turn-one replay evidence and revealed support tools. It does not assume hidden sets, items, or full team intent.'
    };
  }

  function playerMoveNames(parsed) {
    var side = parsed && parsed.selectedSide || 'p1';
    var names = [];
    (parsed && parsed.turns || []).forEach(function(turn) {
      (turn.moves || []).forEach(function(move) {
        if (move && move.side === side && move.move) names.push(String(move.move));
      });
    });
    return names;
  }

  function buildCoachingReadouts(parsed, review, battleIq, critical) {
    parsed = parsed || {};
    review = review || {};
    battleIq = battleIq || buildBattleIqScore(parsed, review, {});
    critical = critical || buildCriticalTurns(parsed, review);
    var confidence = confidenceFor(parsed, review.coachingTags || []);
    var strengths = [];
    var advanced = [];
    var tighten = [];
    var moves = playerMoveNames(parsed);
    var moveText = moves.join(' | ');
    var issueMap = {};
    (review.coachingTags || []).forEach(function(issue) {
      if (issue && issue.id) issueMap[issue.id] = issue;
    });

    (battleIq.raisedBy || []).slice(0, 3).forEach(function(row) {
      strengths.push({
        label: row.area || 'Positive signal',
        evidence: row.text || '',
        confidence: confidence,
        tradeoff: 'Keep repeating this only when it still protects the current win path.'
      });
    });
    if (!strengths.length && !(review.coachingTags || []).length) {
      strengths.push({
        label: 'No major execution error detected',
        evidence: 'This log did not expose a clear tactical collapse from the current parser.',
        confidence: confidence,
        tradeoff: 'Treat this as a small-sample result until more replay evidence is collected.'
      });
    }

    if (/Tailwind|Icy Wind|Electroweb|Thunder Wave|Trick Room/i.test(moveText) && !issueMap.speed_control_without_pressure && !issueMap.field_control_failure) {
      advanced.push({
        label: 'Speed-control setup recognized',
        evidence: 'Your replay shows a speed-control line without a flagged conversion failure.',
        confidence: confidence,
        limitation: 'This recognizes the setup pattern, not whether it was the only correct line.'
      });
    }
    if (/Follow Me|Rage Powder/i.test(moveText) && !issueMap.win_condition_exposed) {
      advanced.push({
        label: 'Support redirection recognized',
        evidence: 'The log shows redirection support while keeping the win condition intact.',
        confidence: confidence,
        limitation: 'This does not prove every redirection turn was optimal; it only confirms the pattern existed.'
      });
    }
    if (/Protect|Detect/i.test(moveText) && !issueMap.protect_misuse) {
      advanced.push({
        label: 'Defensive timing recognized',
        evidence: 'Protect-style resource management appeared without a tagged Protect misuse.',
        confidence: confidence,
        limitation: 'A clean Protect pattern in one battle does not guarantee repeatable timing across matchups.'
      });
    }
    if (/Helping Hand|Parting Shot|Fake Out/i.test(moveText) && !issueMap.targeting_error) {
      advanced.push({
        label: 'Support sequencing recognized',
        evidence: 'The log includes pressure-support tools without a flagged targeting collapse on those lines.',
        confidence: confidence,
        limitation: 'This is replay evidence only; it does not grade hidden alternatives the log never reveals.'
      });
    }

    (battleIq.loweredBy || []).slice(0, 3).forEach(function(row) {
      tighten.push({
        label: row.area || 'Tighten-up area',
        evidence: row.text || '',
        nextStep: 'Use the top practice drill to rehearse a lower-risk line in the same board state.',
        confidence: confidence
      });
    });
    if (!tighten.length && critical && critical.fatalMistake) {
      tighten.push({
        label: critical.fatalMistake.category || 'Tighten-up area',
        evidence: critical.fatalMistake.whyItMattered || critical.fatalMistake.whatHappened || '',
        nextStep: critical.fatalMistake.betterAlternative || 'Replay the critical turn and name the lower-risk alternative before locking an action.',
        confidence: critical.fatalMistake.confidence || confidence
      });
    }

    return {
      strengths: uniqueReadoutLabels(uniqueReadoutRows(strengths)).slice(0, 3),
      advancedPlays: uniqueReadoutRows(advanced).slice(0, 3),
      tightenUp: uniqueReadoutRows(tighten).slice(0, 3),
      note: 'Every section is evidence-bound to the parsed replay. Missing context lowers confidence instead of filling gaps with guesswork.'
    };
  }

  function buildLearningReport(parsed, review, opts) {
    opts = opts || {};
    var issues = (review && review.coachingTags) || [];
    var critical = buildCriticalTurns(parsed, review);
    var report = {
      productMode: 'Battle Sensei',
      philosophy: 'Decision quality over outcome. Every statistic should change a decision.',
      confidence: confidenceFor(parsed, issues),
      evidenceStandard: buildEvidenceStandard(parsed, review),
      battleSummary: {
        matchup: ((review && review.summary && review.summary.yourPlayer) || 'You') + ' vs ' + ((review && review.summary && review.summary.opponentPlayer) || 'Opponent'),
        apparentPlayerPlan: 'Create a stable opening, preserve the win condition, and convert speed or positioning into pressure.',
        apparentOpponentPlan: inferOpponentPlan(parsed, (parsed && parsed.selectedSide) || opts.selectedSide || 'p1').pressurePattern,
        result: parsed && parsed.result || 'unknown',
        majorTurningPoint: critical.biggestSwing ? 'Turn ' + critical.biggestSwing.turn : 'Needs more data'
      },
      criticalTurns: critical,
      decisionQuality: buildDecisionQuality(parsed, review),
      scorecard: buildScorecard(parsed, review),
      battleIq: buildBattleIqScore(parsed, review, opts),
      leadLogic: buildLeadLogicRead(parsed, review),
      winPath: buildWinPath(parsed, review, critical),
      opponentPlan: inferOpponentPlan(parsed, (parsed && parsed.selectedSide) || opts.selectedSide || 'p1'),
      simComparison: buildSimComparison(parsed, review, opts),
      practicePlan: buildPracticePlan(review),
      trendDashboard: buildTrendDashboard(opts.priorReports || [])
    };
    report.coachingReadouts = buildCoachingReadouts(parsed, review, report.battleIq, critical);
    report.simFeedback = buildSimFeedbackPacket(parsed, review, report.simComparison).simFeedback;
    report.premiumTeasers = buildPremiumTeasers(report);
    return report;
  }

  ChampionsSim.replayLearning.buildLearningReport = buildLearningReport;
  ChampionsSim.replayLearning.lineupCombinations = lineupCombinations;
  ChampionsSim.replayLearning.buildLineupMatrixReport = buildLineupMatrixReport;
  ChampionsSim.replayLearning.buildCriticalTurns = buildCriticalTurns;
  ChampionsSim.replayLearning.buildDecisionQuality = buildDecisionQuality;
  ChampionsSim.replayLearning.buildPracticePlan = buildPracticePlan;
  ChampionsSim.replayLearning.buildTrendDashboard = buildTrendDashboard;
  ChampionsSim.replayLearning.buildPremiumTeasers = buildPremiumTeasers;
  ChampionsSim.replayLearning.buildBattleIqScore = buildBattleIqScore;
  ChampionsSim.replayLearning.buildLeadLogicRead = buildLeadLogicRead;
  ChampionsSim.replayLearning.buildCoachingReadouts = buildCoachingReadouts;
  ChampionsSim.replayLearning.buildEvidenceStandard = buildEvidenceStandard;
  ChampionsSim.replayLearning.buildSimComparison = buildSimComparison;
  ChampionsSim.replayLearning.buildSimFeedbackPacket = buildSimFeedbackPacket;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChampionsSim.replayLearning;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
