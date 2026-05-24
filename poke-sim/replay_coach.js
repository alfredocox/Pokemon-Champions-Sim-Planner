// ============================================================
// BATTLE SENSEI
// Local-only parser and coaching summary helpers.
// ============================================================

(function(root) {
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.replayCoach = ChampionsSim.replayCoach || {};

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeSide(side) {
    var s = cleanText(side).toLowerCase();
    if (s === 'p2' || s === 'player2' || s === 'opponent') return 'p2';
    return 'p1';
  }

  function sideOf(slot) {
    var m = cleanText(slot).match(/^(p[12])/i);
    return m ? m[1].toLowerCase() : '';
  }

  function nameFromSlot(slot) {
    var raw = cleanText(slot);
    var idx = raw.indexOf(':');
    return cleanText(idx >= 0 ? raw.slice(idx + 1) : raw);
  }

  function slotKey(slot) {
    var raw = cleanText(slot);
    var m = raw.match(/^(p[12][a-z]?)(?::|$)/i);
    return m ? m[1].toLowerCase() : '';
  }

  function isLooseGenderToken(value) {
    var raw = cleanText(value);
    return /^(?:gender\s*:\s*)?(?:F|M|Female|Male)$/i.test(raw);
  }

  function normalizeGenderToken(value) {
    var raw = cleanText(value).replace(/^gender\s*:\s*/i, '');
    if (/^(F|Female)$/i.test(raw)) return 'F';
    if (/^(M|Male)$/i.test(raw)) return 'M';
    return '';
  }

  function parseLevelToken(value) {
    var raw = cleanText(value);
    var m = raw.match(/^(?:L|Level|lvl)\s*\.?\s*(\d{1,3})$/i);
    return m ? Math.max(1, Math.min(100, parseInt(m[1], 10) || 0)) : null;
  }

  function normalizeReplaySpeciesName(value) {
    var raw = cleanText(value);
    if (!raw) return '';
    if (/^Nidoran(?:♀|\s+F)$/i.test(raw)) return 'Nidoran-F';
    if (/^Nidoran(?:♂|\s+M)$/i.test(raw)) return 'Nidoran-M';
    return raw;
  }

  function isReplayMetadataToken(value) {
    var raw = cleanText(value);
    return !raw
      || isLooseGenderToken(raw)
      || parseLevelToken(raw) != null
      || /^shiny$/i.test(raw)
      || /^tera\s*type\s*:/i.test(raw)
      || /^ability\s*:/i.test(raw)
      || /^item\s*:/i.test(raw);
  }

  function splitIdentityAndDetails(identityOrDetails, details) {
    var identity = cleanText(identityOrDetails);
    var detailText = cleanText(details);
    if (!detailText && identity.indexOf('|') >= 0) {
      var pieces = identity.split('|');
      identity = cleanText(pieces[0]);
      detailText = cleanText(pieces.slice(1).join('|'));
    }
    if (!detailText) detailText = identity;
    return { identity: identity, details: detailText };
  }

  function replayBaseSpecies(species) {
    var raw = cleanText(species);
    if (!raw) return '';
    return raw
      .replace(/-Mega(?:-[XY])?$/i, '')
      .replace(/-(?:Gmax|Totem)$/i, '');
  }

  function replayForme(species) {
    var raw = cleanText(species);
    var base = replayBaseSpecies(raw);
    if (!raw || raw === base) return '';
    return raw.slice(base.length).replace(/^-/, '');
  }

  function normalizeReplayPokemonDetails(identityOrDetails, details, opts) {
    opts = opts || {};
    var split = splitIdentityAndDetails(identityOrDetails, details);
    var tokens = split.details.split(',').map(cleanText).filter(Boolean);
    var identityName = nameFromSlot(split.identity);
    var species = '';
    var gender = '';
    var level = null;
    var item = cleanText(opts.item || '');
    var ability = cleanText(opts.ability || '');

    tokens.forEach(function(token) {
      var parsedLevel = parseLevelToken(token);
      if (parsedLevel != null) {
        level = parsedLevel;
        return;
      }
      if (isLooseGenderToken(token)) {
        gender = gender || normalizeGenderToken(token);
        return;
      }
      var itemMatch = token.match(/^item\s*:\s*(.+)$/i);
      if (itemMatch) {
        item = item || cleanText(itemMatch[1]);
        return;
      }
      var abilityMatch = token.match(/^ability\s*:\s*(.+)$/i);
      if (abilityMatch) {
        ability = ability || cleanText(abilityMatch[1]);
        return;
      }
      if (!species && !isReplayMetadataToken(token)) {
        species = normalizeReplaySpeciesName(token);
      }
    });

    if ((!species || isLooseGenderToken(species)) && identityName && !isLooseGenderToken(identityName)) {
      species = normalizeReplaySpeciesName(identityName);
    }
    if (isLooseGenderToken(species)) species = '';

    return {
      displayName: species,
      species: species,
      baseSpecies: replayBaseSpecies(species),
      gender: gender,
      level: level,
      forme: replayForme(species),
      item: item,
      ability: ability,
      raw: {
        identity: split.identity,
        details: split.details,
        tokens: tokens
      }
    };
  }

  function speciesFromDetails(details) {
    return normalizeReplayPokemonDetails('', details).species;
  }

  function showId(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  var MEGA_ITEM_FORM_MAP = {
    kangaskhanite: 'Kangaskhan-Mega',
    charizarditex: 'Charizard-Mega-X',
    charizarditey: 'Charizard-Mega-Y',
    venusaurite: 'Venusaur-Mega',
    blastoisinite: 'Blastoise-Mega',
    gengarite: 'Gengar-Mega',
    gyaradosite: 'Gyarados-Mega',
    aerodactylite: 'Aerodactyl-Mega',
    ampharosite: 'Ampharos-Mega',
    scizorite: 'Scizor-Mega',
    heracronite: 'Heracross-Mega',
    houndoominite: 'Houndoom-Mega',
    tyranitarite: 'Tyranitar-Mega',
    blazikenite: 'Blaziken-Mega',
    gardevoirite: 'Gardevoir-Mega',
    mawilite: 'Mawile-Mega',
    aggronite: 'Aggron-Mega',
    medichamite: 'Medicham-Mega',
    manectite: 'Manectric-Mega',
    banettite: 'Banette-Mega',
    absolite: 'Absol-Mega',
    garchompite: 'Garchomp-Mega',
    lucarionite: 'Lucario-Mega',
    abomasite: 'Abomasnow-Mega',
    beedrillite: 'Beedrill-Mega',
    pidgeotite: 'Pidgeot-Mega',
    slowbronite: 'Slowbro-Mega',
    steelixite: 'Steelix-Mega',
    sceptilite: 'Sceptile-Mega',
    swampertite: 'Swampert-Mega',
    sableite: 'Sableye-Mega',
    sharpedonite: 'Sharpedo-Mega',
    cameruptite: 'Camerupt-Mega',
    altarianite: 'Altaria-Mega',
    glalitite: 'Glalie-Mega',
    salamencite: 'Salamence-Mega',
    metagrossite: 'Metagross-Mega',
    lopunnite: 'Lopunny-Mega',
    galladite: 'Gallade-Mega',
    audinite: 'Audino-Mega',
    diancite: 'Diancie-Mega'
  };

  function resolveReplayMegaSpecies(baseSpecies, itemOrForm) {
    var base = normalizeReplayPokemonDetails(baseSpecies).species || cleanText(baseSpecies);
    var item = cleanText(itemOrForm);
    var mapped = MEGA_ITEM_FORM_MAP[showId(item)];
    if (mapped) return mapped;
    if (/-Mega(?:-[XY])?$/i.test(base)) return base;
    if (/^(Charizard|Mewtwo)$/i.test(base)) return base;

    if (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS) {
      var matches = Object.keys(CHAMPIONS_MEGAS).filter(function(key) {
        var row = CHAMPIONS_MEGAS[key] || {};
        return cleanText(row.baseSpecies).toLowerCase() === base.toLowerCase();
      });
      if (matches.length === 1) return matches[0];
    }

    var candidate = base + '-Mega';
    if ((typeof BASE_STATS !== 'undefined' && BASE_STATS && BASE_STATS[candidate])
      || (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB && POKEMON_TYPES_DB[candidate])) {
      return candidate;
    }
    return base;
  }

  function replaceUniquePokemon(list, before, after) {
    var target = cleanText(after);
    if (!Array.isArray(list) || !target || isLooseGenderToken(target)) return;
    var old = cleanText(before);
    var existing = list.indexOf(target);
    var idx = old ? list.indexOf(old) : -1;
    if (idx >= 0) {
      if (existing >= 0 && existing !== idx) list.splice(idx, 1);
      else list[idx] = target;
      return;
    }
    if (existing < 0) list.push(target);
  }

  function speciesForSlot(activeBySlot, slot) {
    var key = slotKey(slot);
    var active = key ? activeBySlot[key] : '';
    if (active && !isLooseGenderToken(active)) return active;
    var name = nameFromSlot(slot);
    return isLooseGenderToken(name) ? '' : name;
  }

  function hpPercent(hpText) {
    var raw = cleanText(hpText);
    if (!raw || raw === '0 fnt') return 0;
    var m = raw.match(/(\d+)\/(\d+)/);
    if (m) {
      var cur = parseInt(m[1], 10);
      var max = parseInt(m[2], 10);
      return max > 0 ? Math.max(0, Math.min(100, Math.round((cur / max) * 100))) : null;
    }
    m = raw.match(/^(\d+)%/);
    if (m) return Math.max(0, Math.min(100, parseInt(m[1], 10)));
    return null;
  }

  function ensureTurn(model, number) {
    var n = Math.max(0, parseInt(number, 10) || 0);
    if (!model.turns.length || model.turns[model.turns.length - 1].number !== n) {
      model.turns.push({
        number: n,
        events: [],
        moves: [],
        switches: [],
        faints: [],
        damage: [],
        healing: [],
        field: [],
        status: [],
        rng: []
      });
    }
    return model.turns[model.turns.length - 1];
  }

  function addUnique(list, value) {
    var v = cleanText(value);
    if (v && list.indexOf(v) < 0) list.push(v);
  }

  function parseShowdownLog(rawLog, opts) {
    opts = opts || {};
    var selectedSide = normalizeSide(opts.selectedSide || 'p1');
    var text = cleanText(rawLog);
    var model = {
      ok: false,
      selectedSide: selectedSide,
      format: '',
      rated: null,
      players: { p1: '', p2: '' },
      teamPreview: { p1: [], p2: [] },
      selectedPokemon: { p1: [], p2: [] },
      leads: { p1: [], p2: [] },
      winner: '',
      result: 'unknown',
      forfeit: false,
      totalTurns: 0,
      turns: [],
      warnings: [],
      rawLineCount: text ? text.split(/\r?\n/).length : 0,
      rawPreviewLines: []
    };

    if (!text) {
      model.warnings.push('No replay log was provided.');
      return model;
    }

    var currentTurn = ensureTurn(model, 0);
    var seenFirstTurn = false;
    var activeSeenBeforeTurnOne = { p1: [], p2: [] };
    var activeBySlot = {};
    var lines = text.split(/\r?\n/);
    model.rawPreviewLines = lines.map(cleanText).filter(Boolean).slice(-250);

    lines.forEach(function(line) {
      var raw = cleanText(line);
      if (!raw || raw.charAt(0) !== '|') return;
      var parts = raw.split('|');
      var tag = parts[1] || '';

      if (tag === 'player') {
        var side = normalizeSide(parts[2]);
        model.players[side] = cleanText(parts[3]);
        return;
      }
      if (tag === 'tier' || tag === 'gametype') {
        model.format = model.format || cleanText(parts[2]);
        return;
      }
      if (tag === 'rated') {
        model.rated = true;
        return;
      }
      if (tag === 'poke') {
        var previewSide = normalizeSide(parts[2]);
        addUnique(model.teamPreview[previewSide], speciesFromDetails(parts[3] || ''));
        return;
      }
      if (tag === 'turn') {
        seenFirstTurn = true;
        currentTurn = ensureTurn(model, parts[2]);
        model.totalTurns = Math.max(model.totalTurns, currentTurn.number);
        return;
      }
      if (tag === 'win') {
        model.winner = cleanText(parts[2]);
        return;
      }
      if (tag === 'tie') {
        model.result = 'tie';
        return;
      }
      if (tag === '-message' && /forfeit/i.test(raw)) {
        model.forfeit = true;
      }

      if (tag === 'switch' || tag === 'drag' || tag === 'replace') {
        var slot = parts[2];
        var side = sideOf(slot);
        var parsedDetails = normalizeReplayPokemonDetails(slot, parts[3] || '');
        var slotName = nameFromSlot(slot);
        if (isLooseGenderToken(slotName)) slotName = '';
        var mon = parsedDetails.species || speciesFromDetails(parts[3] || '') || slotName;
        var details = parsedDetails.species || mon;
        var hp = hpPercent(parts[4] || '');
        var key = slotKey(slot);
        if (key && mon && !isLooseGenderToken(mon)) activeBySlot[key] = mon;
        if (side) {
          addUnique(model.selectedPokemon[side], mon || details);
          if (!seenFirstTurn) addUnique(activeSeenBeforeTurnOne[side], mon || details);
        }
        currentTurn.switches.push({
          side: side,
          pokemon: mon || details,
          details: details,
          gender: parsedDetails.gender,
          level: parsedDetails.level,
          hp: hp,
          forced: tag === 'drag'
        });
        currentTurn.events.push({ type: tag, side: side, pokemon: mon || details, text: raw });
        return;
      }

      if (tag === 'move') {
        var actorSlot = parts[2];
        var actorSide = sideOf(actorSlot);
        var actor = speciesForSlot(activeBySlot, actorSlot);
        var move = cleanText(parts[3]);
        var targetSlot = parts[4] || '';
        var targetSide = sideOf(targetSlot);
        var target = speciesForSlot(activeBySlot, targetSlot);
        if (actorSide) addUnique(model.selectedPokemon[actorSide], actor);
        currentTurn.moves.push({ side: actorSide, pokemon: actor, move: move, targetSide: targetSide, target: target });
        currentTurn.events.push({ type: 'move', side: actorSide, pokemon: actor, move: move, target: target, text: raw });
        return;
      }

      if (tag === 'faint') {
        var faintSlot = parts[2];
        var faintSide = sideOf(faintSlot);
        var faintMon = speciesForSlot(activeBySlot, faintSlot);
        if (faintSide) addUnique(model.selectedPokemon[faintSide], faintMon);
        currentTurn.faints.push({ side: faintSide, pokemon: faintMon });
        currentTurn.events.push({ type: 'faint', side: faintSide, pokemon: faintMon, text: raw });
        return;
      }

      if (tag === '-damage' || tag === '-heal') {
        var hpSlot = parts[2];
        var hpSide = sideOf(hpSlot);
        var hpMon = speciesForSlot(activeBySlot, hpSlot);
        var hpValue = hpPercent(parts[3] || '');
        var row = { side: hpSide, pokemon: hpMon, hp: hpValue, cause: cleanText(parts.slice(4).join('|')) };
        if (tag === '-damage') currentTurn.damage.push(row);
        else currentTurn.healing.push(row);
        currentTurn.events.push({ type: tag.slice(1), side: hpSide, pokemon: hpMon, hp: hpValue, text: raw });
        return;
      }

      if (tag === '-mega') {
        var megaSlot = parts[2];
        var megaSide = sideOf(megaSlot);
        var beforeMega = speciesForSlot(activeBySlot, megaSlot);
        var afterMega = resolveReplayMegaSpecies(beforeMega, parts[3] || '');
        var megaKey = slotKey(megaSlot);
        if (megaKey && afterMega && !isLooseGenderToken(afterMega)) activeBySlot[megaKey] = afterMega;
        if (megaSide) {
          replaceUniquePokemon(model.selectedPokemon[megaSide], beforeMega, afterMega);
          replaceUniquePokemon(model.teamPreview[megaSide], beforeMega, afterMega);
          replaceUniquePokemon(activeSeenBeforeTurnOne[megaSide], beforeMega, afterMega);
        }
        currentTurn.events.push({
          type: 'mega',
          side: megaSide,
          pokemon: afterMega || beforeMega,
          baseSpecies: beforeMega,
          item: cleanText(parts[3] || ''),
          text: raw
        });
        return;
      }

      if (tag === '-status' || tag === '-curestatus' || tag === '-boost' || tag === '-unboost') {
        var statusSlot = parts[2];
        currentTurn.status.push({ type: tag.slice(1), side: sideOf(statusSlot), pokemon: speciesForSlot(activeBySlot, statusSlot), value: cleanText(parts[3]) });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(statusSlot), pokemon: speciesForSlot(activeBySlot, statusSlot), text: raw });
        return;
      }

      if (tag === '-weather' || tag === '-fieldstart' || tag === '-fieldend' || tag === '-sidestart' || tag === '-sideend') {
        currentTurn.field.push({ type: tag.slice(1), value: cleanText(parts[2]), side: sideOf(parts[3] || '') });
        currentTurn.events.push({ type: tag.slice(1), text: raw });
        return;
      }

      if (tag === '-crit' || tag === '-miss' || tag === '-fail' || tag === '-immune') {
        var rngSlot = parts[2];
        currentTurn.rng.push({ type: tag.slice(1), side: sideOf(rngSlot), pokemon: speciesForSlot(activeBySlot, rngSlot), value: cleanText(parts[3]) });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(rngSlot), pokemon: speciesForSlot(activeBySlot, rngSlot), text: raw });
      }
    });

    model.leads.p1 = activeSeenBeforeTurnOne.p1.slice(0, 2);
    model.leads.p2 = activeSeenBeforeTurnOne.p2.slice(0, 2);
    if (!model.leads.p1.length && model.turns[0]) {
      model.leads.p1 = model.turns[0].switches.filter(function(s) { return s.side === 'p1'; }).map(function(s) { return s.pokemon; }).slice(0, 2);
      model.leads.p2 = model.turns[0].switches.filter(function(s) { return s.side === 'p2'; }).map(function(s) { return s.pokemon; }).slice(0, 2);
    }
    model.turns = model.turns.filter(function(t) { return t.number > 0 || t.events.length > 0; });
    if (!model.totalTurns && model.turns.length) model.totalTurns = model.turns[model.turns.length - 1].number || 0;

    var selectedName = model.players[selectedSide];
    var oppSide = selectedSide === 'p1' ? 'p2' : 'p1';
    if (model.result !== 'tie' && model.winner) {
      model.result = selectedName && model.winner === selectedName ? 'win' : 'loss';
    }
    if (!model.players.p1 && !model.players.p2) model.warnings.push('Player names were not found in the log.');
    if (!model.leads.p1.length || !model.leads.p2.length) model.warnings.push('Lead Pokemon could not be fully inferred.');
    if (!model.teamPreview.p1.length && !model.teamPreview.p2.length) model.warnings.push('Team preview was not present; selected Pokemon are inferred from revealed actions.');
    model.ok = model.turns.length > 0 || !!model.winner;
    model.opponentSide = oppSide;
    return model;
  }

  function classifyMove(move) {
    var m = cleanText(move).toLowerCase();
    if (!m) return 'unknown';
    if (m === 'protect' || m === 'detect' || m === 'spiky shield' || m === 'wide guard' || m === 'quick guard') return 'protection';
    if (m === 'fake out') return 'fake_out';
    if (m === 'tailwind' || m === 'trick room' || m === 'icy wind' || m === 'electroweb' || m === 'thunder wave') return 'speed_control';
    if (m === 'follow me' || m === 'rage powder') return 'redirection';
    if (m === 'swords dance' || m === 'nasty plot' || m === 'calm mind' || m === 'dragon dance') return 'setup';
    if (m === 'parting shot' || m === 'u-turn' || m === 'volt switch') return 'pivot';
    return 'attack_or_support';
  }

  function addIssue(issues, tag, severity, turn, message, confidence, recommendation, extra) {
    extra = extra || {};
    var id = extra.id || cleanText(tag).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    var whatHappened = extra.whatHappened || message || 'The replay showed a coaching-relevant event.';
    var whyMattered = extra.whyMattered || 'This can change tempo, board position, or the path to your win condition.';
    var doInstead = extra.doInstead || recommendation || 'Review the board state and choose the line that preserves your win condition.';
    issues.push({
      id: id,
      tag: tag,
      category: extra.category || id,
      severity: severity,
      turn: turn || null,
      message: message,
      confidence: confidence || 'medium',
      evidence: extra.evidence || '',
      whatHappened: whatHappened,
      whyMattered: whyMattered,
      doInstead: doInstead,
      recommendation: recommendation || doInstead
    });
  }

  function moveNames(moves) {
    return (moves || []).map(function(m) { return (m.pokemon || '?') + ' used ' + (m.move || '?'); }).join('; ');
  }

  function hasOpponentFieldProgress(turn, oppSide) {
    return (turn.field || []).some(function(f) {
      return !f.side || f.side === oppSide || /trick room|weather|terrain|tailwind/i.test(f.value || '');
    });
  }

  function fieldNames(fieldEvents) {
    return (fieldEvents || []).map(function(f) { return f.value || f.text || f.type || 'field effect'; }).join('; ');
  }

  function hasIssue(issues, id, turn) {
    return (issues || []).some(function(issue) {
      return issue.id === id && (turn == null || issue.turn === turn);
    });
  }

  function selectedFourConfidence(parsed, side) {
    var preview = parsed.teamPreview && parsed.teamPreview[side] ? parsed.teamPreview[side] : [];
    var selected = parsed.selectedPokemon && parsed.selectedPokemon[side] ? parsed.selectedPokemon[side] : [];
    if (selected.length >= 4) return { level: 'high', label: 'Four inferred', reason: 'At least four selected Pokemon appeared in the log.' };
    if (preview.length >= 6 && selected.length > 0) return { level: 'medium', label: 'Partial bring', reason: 'Team preview exists, but not all brought Pokemon were revealed.' };
    if (selected.length > 0) return { level: 'medium', label: 'Revealed only', reason: 'Selected Pokemon are inferred from revealed actions only.' };
    return { level: 'low', label: 'Unknown', reason: 'The log did not reveal selected Pokemon.' };
  }

  function sideNames(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    return {
      side: side,
      opp: opp,
      you: parsed.players[side] || side,
      opponent: parsed.players[opp] || opp
    };
  }

  function eventLabel(ev) {
    if (!ev) return '';
    if (ev.type === 'move') return (ev.pokemon || '?') + ' used ' + (ev.move || '?') + (ev.target ? ' into ' + ev.target : '');
    if (ev.type === 'switch' || ev.type === 'drag' || ev.type === 'replace') return (ev.forced ? 'Forced switch: ' : 'Switch: ') + (ev.pokemon || '?');
    if (ev.type === 'faint') return (ev.pokemon || '?') + ' fainted';
    if (ev.type === 'damage') return (ev.pokemon || '?') + ' took damage' + (ev.hp != null ? ' to ' + ev.hp + '%' : '');
    if (ev.type === 'heal') return (ev.pokemon || '?') + ' healed' + (ev.hp != null ? ' to ' + ev.hp + '%' : '');
    if (ev.type === 'fieldstart' || ev.type === 'sidestart' || ev.type === 'weather') return ev.text || ev.type;
    if (ev.type === 'crit') return 'Critical hit on ' + (ev.pokemon || '?');
    if (ev.type === 'miss') return (ev.pokemon || '?') + ' missed';
    if (ev.type === 'fail') return (ev.pokemon || '?') + ' action failed';
    return ev.text || ev.type || '';
  }

  function buildTurnTimeline(parsed, side, issues) {
    var names = sideNames(parsed, side);
    var issueByTurn = {};
    (issues || []).forEach(function(issue) {
      if (issue && issue.turn != null) {
        (issueByTurn[issue.turn] = issueByTurn[issue.turn] || []).push(issue);
      }
    });

    return (parsed.turns || []).filter(function(turn) {
      return turn && turn.number > 0;
    }).map(function(turn) {
      var turnIssues = issueByTurn[turn.number] || [];
      var userMoves = turn.moves.filter(function(m) { return m.side === side; });
      var oppMoves = turn.moves.filter(function(m) { return m.side === names.opp; });
      var userFaints = turn.faints.filter(function(f) { return f.side === side; });
      var oppFaints = turn.faints.filter(function(f) { return f.side === names.opp; });
      var userSwitches = turn.switches.filter(function(s) { return s.side === side; });
      var oppSwitches = turn.switches.filter(function(s) { return s.side === names.opp; });
      var userSpeed = userMoves.filter(function(m) { return classifyMove(m.move) === 'speed_control'; });
      var oppSpeed = oppMoves.filter(function(m) { return classifyMove(m.move) === 'speed_control'; });
      var userProtect = userMoves.filter(function(m) { return classifyMove(m.move) === 'protection'; });
      var fieldEvents = turn.field || [];
      var rngEvents = turn.rng || [];
      var severity = 'neutral';
      var confidence = 'medium';
      var stateShift = 'Neutral exchange';
      var coachingRead = 'No major state swing was detected from the parsed log.';
      var betterLine = '';

      if (oppFaints.length && !userFaints.length) {
        severity = 'good';
        confidence = 'high';
        stateShift = 'You gained material';
        coachingRead = 'You removed an opposing Pokemon without losing one back. This is the kind of turn that should convert into board control.';
      }
      if (userFaints.length && !oppFaints.length) {
        severity = 'high';
        confidence = 'high';
        stateShift = 'You lost material';
        coachingRead = 'You lost a Pokemon without taking one back. Check whether that piece was still needed for speed control, pivoting, or the endgame.';
        betterLine = 'Look for a line that either trades KOs, protects the key piece, or switches into a resist/immunity before this turn.';
      }
      if (userFaints.length && oppFaints.length) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Material trade';
        coachingRead = 'Both sides lost a Pokemon. The key question is whether your fainted Pokemon was more important to the matchup plan than the one you removed.';
      }
      if (userSpeed.length && !oppFaints.length) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Speed control set without clear payoff';
        coachingRead = 'You used speed control. The next coaching check is whether it created immediate pressure, protected a win condition, or just spent a turn.';
        betterLine = betterLine || 'After setting speed control, plan the next two turns before clicking it: target, forced Protect, or preserved closer.';
      }
      if (oppSpeed.length) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Opponent advanced speed control';
        coachingRead = 'The opponent advanced speed control. If this was not denied or punished, your next turns may be played from behind.';
      }
      if (userProtect.length && (oppSpeed.length || fieldEvents.length)) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Protect gave space';
        coachingRead = 'Your Protect may have preserved HP, but the opponent also improved the field or speed state. That trade needs a clear reason.';
        betterLine = betterLine || 'Use Protect when it preserves the actual win condition or stalls a limited field turn, not as a default pause.';
      }
      if (userSwitches.length && !oppFaints.length && (oppSpeed.length || fieldEvents.length || oppSwitches.length)) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Positioning risk';
        coachingRead = 'You changed position while the opponent also improved theirs. The switch needs to either preserve a key piece or deny their next payoff.';
      }
      if (rngEvents.length) {
        confidence = 'medium';
        if (severity === 'neutral') severity = 'low';
        coachingRead += ' RNG appeared on this turn, so avoid overclaiming until damage rolls and safer alternatives are checked.';
      }
      if (turnIssues.length) {
        var hasHigh = turnIssues.some(function(i) { return i.severity === 'high'; });
        severity = hasHigh ? 'high' : (severity === 'neutral' ? 'medium' : severity);
        confidence = turnIssues.some(function(i) { return i.confidence === 'high'; }) ? 'high' : confidence;
      }

      var primaryEvents = (turn.events || []).slice(0, 10).map(eventLabel).filter(Boolean);
      return {
        turn: turn.number,
        severity: severity,
        confidence: confidence,
        stateShift: stateShift,
        coachingRead: coachingRead,
        betterLine: betterLine,
        tags: turnIssues.map(function(i) { return i.tag; }),
        events: primaryEvents,
        rawEventCount: (turn.events || []).length,
        metrics: {
          yourMoves: userMoves.length,
          opponentMoves: oppMoves.length,
          yourSwitches: userSwitches.length,
          opponentSwitches: oppSwitches.length,
          yourFaints: userFaints.length,
          opponentFaints: oppFaints.length
        }
      };
    });
  }

  function buildReplayCoachReview(parsed, opts) {
    opts = opts || {};
    var side = normalizeSide(opts.selectedSide || parsed.selectedSide || 'p1');
    var opp = side === 'p1' ? 'p2' : 'p1';
    var issues = [];
    var turnScores = {};
    var speedTurns = [];
    var userLead = parsed.leads[side] || [];
    var oppLead = parsed.leads[opp] || [];
    var userSelected = parsed.selectedPokemon[side] || [];
    var oppSelected = parsed.selectedPokemon[opp] || [];
    var bringConfidence = selectedFourConfidence(parsed, side);
    var speedControlPieces = {};

    if (!userLead.length || !oppLead.length) {
      addIssue(issues, 'Lead Unclear', 'medium', null, 'The log does not expose a complete opening board.', 'medium', 'Use a full Showdown replay export when possible so lead coaching can be more precise.', {
        id: 'bad_lead',
        category: 'lead_quality',
        whatHappened: 'The replay did not expose both opening leads clearly enough for a reliable lead grade.',
        whyMattered: 'Lead coaching depends on the first board state because doubles games often swing on turn-one speed control, Fake Out, redirection, and setup pressure.',
        doInstead: 'Use a full Showdown replay export when possible, then compare your lead against the opponent plan before judging the rest of the game.',
        evidence: 'Missing lead data'
      });
    }
    if (parsed.teamPreview[side] && parsed.teamPreview[side].length >= 6 && userSelected.length && userSelected.length < 4) {
      addIssue(issues, 'Questionable Bring Evidence', 'low', null, 'Only part of your selected four could be inferred from revealed actions.', 'medium', 'Treat bring-four grades as incomplete until all brought Pokemon are revealed.', {
        id: 'questionable_bring',
        category: 'bring_four',
        whatHappened: 'Team preview showed six Pokemon, but fewer than four of your brought Pokemon appeared in the parsed log.',
        whyMattered: 'Bring-four coaching can overclaim when the backline is hidden, especially in VGC-style games where the benched two explain the matchup plan.',
        doInstead: 'Use the bring-four read as provisional until the full selected four are visible or entered manually.',
        evidence: 'Preview count ' + parsed.teamPreview[side].length + ', revealed selected count ' + userSelected.length
      });
    }

    parsed.turns.forEach(function(turn) {
      var userMoves = turn.moves.filter(function(m) { return m.side === side; });
      var oppMoves = turn.moves.filter(function(m) { return m.side === opp; });
      var userFaints = turn.faints.filter(function(f) { return f.side === side; });
      var oppFaints = turn.faints.filter(function(f) { return f.side === opp; });
      var userSpeed = userMoves.filter(function(m) { return classifyMove(m.move) === 'speed_control'; });
      var userProtect = userMoves.filter(function(m) { return classifyMove(m.move) === 'protection'; });
      var userFakeOut = userMoves.filter(function(m) { return classifyMove(m.move) === 'fake_out'; });
      var userSwitches = turn.switches.filter(function(s) { return s.side === side; });
      var userField = turn.field.filter(function(f) { return f.side === side; });
      var userTookDamage = turn.damage.some(function(d) { return d.side === side && d.hp != null && d.hp < 100; });
      var oppSetupOrSpeed = oppMoves.filter(function(m) {
        var kind = classifyMove(m.move);
        return kind === 'setup' || kind === 'speed_control' || kind === 'redirection';
      });
      var userRngBad = turn.rng.filter(function(r) { return r.side === side && (r.type === 'miss' || r.type === 'fail'); });
      var oppRngGood = turn.rng.filter(function(r) { return r.side === opp && r.type === 'crit'; });
      var opponentProgress = oppSetupOrSpeed.length || hasOpponentFieldProgress(turn, opp);
      var userMoveText = moveNames(userMoves);
      var oppMoveText = moveNames(oppMoves);
      var turnEvidence = [userMoveText, oppMoveText, fieldNames(turn.field)].filter(Boolean).join(' | ');

      if (userSpeed.length) {
        speedTurns.push(turn.number);
        userSpeed.forEach(function(move) { if (move.pokemon) speedControlPieces[move.pokemon] = true; });
        if (!oppFaints.length && !turn.damage.some(function(d) { return d.side === opp && d.hp != null && d.hp < 75; })) {
          addIssue(issues, 'Speed Control Without Pressure', 'high', turn.number, 'You used speed control but did not immediately create clear damage or KO pressure.', 'medium', 'After Tailwind, Trick Room, Icy Wind, or Electroweb, convert the speed edge into a KO, forced Protect, or preserved win condition.', {
            id: 'speed_control_without_pressure',
            category: 'speed_control',
            whatHappened: 'You used ' + userSpeed.map(function(m) { return m.move; }).join(', ') + ', but the turn did not remove an opposing Pokemon or create clear damage pressure.',
            whyMattered: 'Speed control only wins games when it turns into pressure, preservation, or forced defensive choices before the opponent resets the board.',
            doInstead: 'Before using speed control, plan the next two actions: what target you pressure, what Protect you force, and which win condition you preserve.',
            evidence: turnEvidence
          });
        }
      }
      if (userProtect.length && (opponentProgress || userTookDamage) && !oppFaints.length) {
        addIssue(issues, 'Protect Misuse', 'medium', turn.number, 'You protected while the opponent advanced position or damaged the other slot.', 'medium', 'Protect is strongest when it preserves the win condition, not when it gives the opponent a free board improvement.', {
          id: 'protect_misuse',
          category: 'resource_use',
          whatHappened: 'You clicked ' + userProtect.map(function(m) { return m.move; }).join(', ') + ', but the opponent still improved the turn by advancing position or damaging your partner.',
          whyMattered: 'A defensive turn is only good if it stalls a limited resource, protects the correct piece, or prevents the opponent from converting pressure elsewhere.',
          doInstead: 'Use Protect with a purpose: stall Trick Room/Tailwind/weather turns, shield the actual win condition, or pair it with a partner action that punishes the expected attack.',
          evidence: turnEvidence
        });
      }
      if (userFakeOut.length && turn.rng.some(function(r) { return r.type === 'fail' && r.side === side; })) {
        addIssue(issues, 'Targeting Error', 'medium', turn.number, 'Your Fake Out failed or was blocked.', 'high', 'Check Protect, Ghost typing, priority blocking, terrain, and move timing before leaning on Fake Out.', {
          id: 'targeting_error',
          category: 'targeting',
          whatHappened: 'Your Fake Out did not affect the intended target.',
          whyMattered: 'Fake Out is a turn-one resource. When it fails, the opponent may get setup, redirection, or speed control without being forced to trade.',
          doInstead: 'Before using Fake Out, verify terrain, typing, protection, priority blocking, and whether the other opposing slot is the real setup threat.',
          evidence: turnEvidence || 'Fake Out failed'
        });
        if (turn.number === 1 && opponentProgress && !hasIssue(issues, 'bad_lead', turn.number)) {
          addIssue(issues, 'Bad Lead', 'high', turn.number, 'Your opening did not stop the opponent from establishing their plan.', 'medium', 'A safe lead should either threaten the setup piece, block the support line, or create pressure even if Fake Out fails.', {
            id: 'bad_lead',
            category: 'lead_quality',
            whatHappened: 'Your lead used Fake Out, it failed, and the opponent still advanced their opening plan.',
            whyMattered: 'A lead that depends on one interrupt can collapse when the opponent has redirection, terrain, Protect, Ghost typing, or a better speed-control line.',
            doInstead: 'Lead with a pair that has a backup answer: direct pressure into the setup Pokemon, Taunt/deny tools, or damage that still matters if Fake Out fails.',
            evidence: turnEvidence
          });
        }
      }
      if (userSwitches.length && (opponentProgress || userTookDamage) && !oppFaints.length) {
        addIssue(issues, 'Switch Tempo Loss', 'medium', turn.number, 'Your switch coincided with the opponent improving their board.', 'medium', 'Switches should either preserve a key piece, absorb a hit, or deny the opponent progress.', {
          id: 'switch_tempo_loss',
          category: 'positioning',
          whatHappened: 'You switched while the opponent advanced board state, field control, or damage into your side.',
          whyMattered: 'Switching can be correct, but a passive switch gives the opponent a free turn if it does not absorb damage, preserve a win condition, or deny setup.',
          doInstead: 'Make the switch earn something concrete: protect a key Pokemon, reset Intimidate/Fake Out, absorb a resisted hit, or force the opponent backward next turn.',
          evidence: turnEvidence
        });
      }
      if (userFaints.length && !oppFaints.length) {
        var exposedWinPiece = userFaints.some(function(f) { return speedControlPieces[f.pokemon]; });
        addIssue(issues, exposedWinPiece ? 'Win Condition Exposed' : 'Lost Exchange', 'high', turn.number, 'You lost a Pokemon without taking one back that turn.', 'high', 'Review whether that Pokemon was still needed for speed control, pivoting, or endgame cleanup.', {
          id: exposedWinPiece ? 'win_condition_exposed' : 'lost_exchange',
          category: exposedWinPiece ? 'win_condition' : 'material_exchange',
          whatHappened: exposedWinPiece ? 'A Pokemon that had provided your speed-control plan fainted without an immediate trade.' : 'You lost ' + userFaints.map(function(f) { return f.pokemon; }).join(', ') + ' without removing an opposing Pokemon that turn.',
          whyMattered: exposedWinPiece ? 'If your speed-control or endgame piece disappears before its advantage is converted, the rest of the game may no longer follow your intended win path.' : 'A clean material loss usually means the opponent gained both board control and future flexibility.',
          doInstead: exposedWinPiece ? 'Preserve that support piece until the speed advantage creates a KO, forces Protect, or safely hands the endgame to your cleaner.' : 'Look for a line that trades KOs, protects the threatened piece, or switches into a resist before the opponent gets a free knockout.',
          evidence: turnEvidence
        });
      }
      if (opponentProgress && !oppFaints.length && !userField.length) {
        addIssue(issues, 'Field Control Failure', turn.number === 1 ? 'high' : 'medium', turn.number, 'The opponent advanced field control or setup without being punished.', 'medium', 'When the opponent sets Trick Room, Tailwind, terrain, weather, or redirection, answer it immediately or use the turn to take a meaningful trade.', {
          id: 'field_control_failure',
          category: 'field_control',
          whatHappened: 'The opponent gained setup, redirection, speed control, or field control and you did not take a knockout back.',
          whyMattered: 'Field control changes what moves first, what survives, and which side gets to dictate defensive choices on the next turn.',
          doInstead: 'Deny the field effect when possible; if denial is impossible, punish the setter or switch into a board that can stall or reverse the field state.',
          evidence: turnEvidence
        });
      }
      if (userRngBad.length || oppRngGood.length) {
        addIssue(issues, 'RNG Materiality Check', 'low', turn.number, 'The turn included a miss, failed action, or critical hit that may have affected the line.', 'high', 'Separate bad luck from avoidable exposure: ask whether a safer line reduced reliance on that roll.', {
          id: 'rng_material',
          category: 'variance',
          whatHappened: 'The log recorded RNG or failed-action variance on this turn.',
          whyMattered: 'RNG can change outcomes, but coaching should separate unavoidable variance from earlier decisions that increased exposure to that roll.',
          doInstead: 'Review the previous turn for a safer line before blaming the result entirely on variance.',
          evidence: turn.rng.map(function(r) { return r.type + (r.pokemon ? ' on ' + r.pokemon : ''); }).join('; ')
        });
      }
      turnScores[turn.number] = (turnScores[turn.number] || 0) + userFaints.length * 3 + oppSetupOrSpeed.length + userRngBad.length + oppRngGood.length;
    });

    if (parsed.result === 'loss' && parsed.turns.length) {
      var finalTurn = parsed.turns[parsed.turns.length - 1];
      var finalUserFaints = finalTurn.faints.filter(function(f) { return f.side === side; });
      var finalOppFaints = finalTurn.faints.filter(function(f) { return f.side === opp; });
      if (finalUserFaints.length && finalUserFaints.length >= finalOppFaints.length && !hasIssue(issues, 'endgame_misplay', finalTurn.number)) {
        addIssue(issues, 'Endgame Misplay', 'medium', finalTurn.number, 'The final exchange still lost the game even after your side found some pressure.', 'medium', 'In the endgame, preserve the piece that can close and target the Pokemon that prevents that closer from winning.', {
          id: 'endgame_misplay',
          category: 'endgame',
          whatHappened: 'On the last parsed turn, your side lost a key Pokemon and the game ended in a loss.',
          whyMattered: 'Endgames are often decided by preservation, target priority, remaining speed control, and whether the final attacker survives long enough to convert.',
          doInstead: 'Before the final turns, identify the exact closer and choose the line that keeps that Pokemon alive or removes its biggest blocker first.',
          evidence: 'Final turn ' + finalTurn.number + ': ' + moveNames(finalTurn.moves)
        });
      }
    }

    var criticalTurn = null;
    var criticalScore = -1;
    Object.keys(turnScores).forEach(function(k) {
      if (turnScores[k] > criticalScore) {
        criticalScore = turnScores[k];
        criticalTurn = parseInt(k, 10);
      }
    });
    if (!criticalTurn && parsed.turns.length) criticalTurn = parsed.turns[0].number;

    var firstMistake = issues.find(function(i) { return i.turn != null && i.severity !== 'low'; }) || issues[0] || null;
    var fatalMistake = issues.filter(function(i) { return i.severity === 'high'; }).slice(-1)[0] || firstMistake;
    var confidence = parsed.warnings.length ? 'medium' : 'high';
    if (!parsed.ok) confidence = 'low';
    var turnTimeline = buildTurnTimeline(parsed, side, issues);

    var review = {
      summary: {
        result: parsed.result,
        turns: parsed.totalTurns,
        winner: parsed.winner,
        yourSide: side,
        yourPlayer: parsed.players[side] || side,
        opponentPlayer: parsed.players[opp] || opp,
        yourLead: userLead,
        opponentLead: oppLead,
        yourFour: userSelected,
        opponentFour: oppSelected,
        yourPreview: parsed.teamPreview[side] || [],
        opponentPreview: parsed.teamPreview[opp] || [],
        selectedFourConfidence: bringConfidence,
        leadGrade: userLead.length && oppLead.length ? 'Reviewable' : 'Unknown',
        criticalTurn: criticalTurn,
        mainIssue: firstMistake ? firstMistake.tag : 'No major issue detected',
        mainPracticePoint: firstMistake ? firstMistake.recommendation : 'Upload more logs to build a reliable player pattern.',
        confidence: confidence
      },
      coachingTags: issues.slice(0, 12),
      criticalTurn: {
        turn: criticalTurn,
        firstMistake: firstMistake,
        fatalMistake: fatalMistake,
        confidence: confidence
      },
      speedControl: {
        turnsUsed: speedTurns,
        note: speedTurns.length ? 'Review whether speed-control turns converted into pressure.' : 'No user speed-control move was detected.'
      },
      turnTimeline: turnTimeline,
      rawLogPreview: {
        lineCount: parsed.rawLineCount || 0,
        shownCount: parsed.rawPreviewLines ? parsed.rawPreviewLines.length : 0,
        lines: (parsed.rawPreviewLines || []).slice()
      },
      warnings: parsed.warnings.slice()
    };
    if (ChampionsSim.replayLearning && typeof ChampionsSim.replayLearning.buildLearningReport === 'function') {
      review.learningReport = ChampionsSim.replayLearning.buildLearningReport(parsed, review, opts || {});
    }
    return review;
  }

  function analyzeShowdownReplay(rawLog, opts) {
    var parsed = parseShowdownLog(rawLog, opts || {});
    return {
      parsed: parsed,
      review: buildReplayCoachReview(parsed, opts || {})
    };
  }

  ChampionsSim.replayCoach.parseShowdownLog = parseShowdownLog;
  ChampionsSim.replayCoach.buildReplayCoachReview = buildReplayCoachReview;
  ChampionsSim.replayCoach.analyzeShowdownReplay = analyzeShowdownReplay;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChampionsSim.replayCoach;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
