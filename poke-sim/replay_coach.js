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
        rng: [],
        abilities: [],
        items: [],
        actionDenials: [],
        effectiveness: [],
        singleTurn: [],
        formChanges: []
      });
    }
    return model.turns[model.turns.length - 1];
  }

  function addUnique(list, value) {
    var v = cleanText(value);
    if (v && list.indexOf(v) < 0) list.push(v);
  }

  function looksLikeReplayTag(tag) {
    return /^(player|teamsize|gametype|gen|tier|rule|rated|poke|teampreview|start|turn|upkeep|move|switch|drag|replace|faint|win|tie|cant|detailschange|formechange|-damage|-heal|-status|-curestatus|-boost|-unboost|-mega|-weather|-fieldstart|-fieldend|-fieldactivate|-sidestart|-sideend|-sideactivate|-crit|-miss|-fail|-immune|-message|-ability|-item|-enditem|-activate|-singleturn|-supereffective|-resisted|-start|-end|j|c)$/i.test(tag || '');
  }

  function decodeReplayHtmlEntities(text) {
    return String(text == null ? '' : text).replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, function(match, token) {
      var key = String(token || '').toLowerCase();
      if (key === 'amp') return '&';
      if (key === 'lt') return '<';
      if (key === 'gt') return '>';
      if (key === 'quot') return '"';
      if (key === 'apos') return "'";
      if (key === 'nbsp') return ' ';
      if (key.charAt(0) === '#') {
        var n = key.charAt(1) === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
        if (Number.isFinite(n) && n >= 0) return String.fromCharCode(n);
      }
      return match;
    });
  }

  function normalizeReplayHtmlText(text) {
    var out = String(text == null ? '' : text);
    if (!/<[a-z][\s\S]*>/i.test(out) && out.indexOf('&') < 0) return out;
    out = decodeReplayHtmlEntities(out);
    out = out
      .replace(/\\u007c/gi, '|')
      .replace(/\\x7c/gi, '|')
      .replace(/\\r\\n|\\r|\\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:div|p|li|pre|textarea|script)>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    return decodeReplayHtmlEntities(out);
  }

  function normalizeReplayLogInput(rawInput) {
    var text = String(rawInput == null ? '' : rawInput)
      .replace(/^\uFEFF/, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n');
    text = normalizeReplayHtmlText(text);
    if (!text.trim()) return '';
    if (text.indexOf('\\n|') >= 0 || text.indexOf('|\\n') >= 0) {
      text = text.replace(/\\n/g, '\n');
    }
    var directLines = [];
    text.split('\n').forEach(function(line) {
      var trimmed = cleanText(line);
      if (!trimmed) return;
      if (trimmed.charAt(0) === '|') {
        var directTag = trimmed.split('|')[1] || '';
        if (looksLikeReplayTag(directTag)) directLines.push(trimmed);
        return;
      }
      var idx = trimmed.indexOf('|');
      if (idx >= 0) {
        var candidate = trimmed.slice(idx);
        var tag = candidate.split('|')[1] || '';
        if (looksLikeReplayTag(tag)) directLines.push(candidate);
      }
    });
    if (directLines.length) return directLines.join('\n');
    return cleanText(text);
  }

  function replayUrlToLogUrl(rawUrl) {
    var input = cleanText(rawUrl);
    if (!input) throw new Error('Enter a replay URL.');
    var normalized = input;
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;
    var url;
    try {
      url = new URL(normalized);
    } catch (e) {
      throw new Error('Replay URL is not valid.');
    }
    if (!/replay\.pokemonshowdown\.com$/i.test(url.hostname || '')) {
      throw new Error('Use a replay.pokemonshowdown.com URL.');
    }
    var path = String(url.pathname || '').replace(/^\/+/, '');
    if (!path) throw new Error('Replay URL is missing an ID.');
    path = path.replace(/\.json$/i, '').replace(/\.log$/i, '');
    return url.origin + '/' + path + '.log';
  }

  async function fetchReplayLog(rawUrl, fetchImpl) {
    var fetcher = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetcher) throw new Error('Replay URL loading is not available in this build.');
    var logUrl = replayUrlToLogUrl(rawUrl);
    var resp = await fetcher(logUrl, { credentials: 'omit' });
    if (!resp || !resp.ok) {
      throw new Error('Could not load that replay URL.');
    }
    var text = await resp.text();
    return normalizeReplayLogInput(text);
  }

  function sourceStatsForSpecies(species) {
    var key = cleanText(species);
    if (!key) return null;
    if (typeof BASE_STATS !== 'undefined' && BASE_STATS && BASE_STATS[key]) return BASE_STATS[key];
    var audit = ChampionsSim.pokemonDataAudit;
    var sourceRow = audit && audit.species ? audit.species[key] : null;
    return sourceRow && sourceRow.stats ? sourceRow.stats : null;
  }

  function statLine(stats) {
    if (!stats) return 'unknown';
    return [stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe].join('/');
  }

  function addReplayWarning(warnings, value) {
    var text = cleanText(value);
    if (text && warnings.indexOf(text) < 0) warnings.push(text);
  }

  // Exact supported tier labels from the pinned Showdown 0.11.11 formats.
  var CHAMPIONS_REPLAY_TIERS = {
    '[Gen 9 Champions] BSS Reg M-A': 'singles',
    '[Gen 9 Champions] BSS Reg M-B': 'singles',
    '[Gen 9 Champions] VGC 2026 Reg M-A': 'doubles',
    '[Gen 9 Champions] VGC 2026 Reg M-A (Bo3)': 'doubles',
    '[Gen 9 Champions] VGC 2026 Reg M-B': 'doubles',
    '[Gen 9 Champions] VGC 2026 Reg M-B (Bo3)': 'doubles'
  };

  function replayLearnsetContext(tier) {
    var name = cleanText(tier);
    if (Object.prototype.hasOwnProperty.call(CHAMPIONS_REPLAY_TIERS, name)) return 'champions';
    if (/^\[Gen 9\] (?:OU|Ubers|UU|RU|NU|PU|ZU|LC|Monotype|Doubles OU|Doubles Ubers|VGC 20\d{2}(?: Reg [A-Z])?(?: Bo3)?|Battle Stadium (?:Singles|Doubles)(?: Reg [A-Z])?)$/i.test(name)) return 'historical';
    return '';
  }

  function resolveReplayMetadata(lines, model) {
    var tiers = [], gameTypes = [], generations = [], battleStarted = false;
    model.metadataConflicts = [];
    lines.forEach(function(line) {
      var parts = cleanText(line).split('|');
      if (parts[0] !== '') return;
      var tag = parts[1], value = cleanText(parts[2]);
      if (tag === 'tier' || tag === 'gametype' || tag === 'gen') {
        if (tag !== 'gen') model.format = model.format || value;
        var values = tag === 'tier' ? tiers : tag === 'gametype' ? gameTypes : generations;
        if (values.indexOf(value) < 0) values.push(value);
        if (battleStarted) addReplayWarning(model.metadataConflicts, 'late ' + tag + ' header');
        if (tag === 'gen' && (parts.length !== 3 || !/^[1-9]\d*$/.test(value))) {
          addReplayWarning(model.metadataConflicts, 'malformed gen header');
        }
      } else if (/^(start|turn|switch|drag|replace|move|faint|win|tie|cant)$/.test(tag) || /^-/.test(tag)) {
        battleStarted = true;
      }
    });
    model.tier = tiers[0] || '';
    model.gameType = gameTypes[0] || '';
    model.generation = generations[0] || '';
    if (tiers.length > 1) addReplayWarning(model.metadataConflicts, 'conflicting tier headers');
    if (gameTypes.length > 1) addReplayWarning(model.metadataConflicts, 'conflicting gametype headers');
    if (generations.length > 1) addReplayWarning(model.metadataConflicts, 'conflicting gen headers');
    var context = replayLearnsetContext(model.tier);
    // Every recognized tier above is Gen 9; absence is allowed, contradiction is not.
    if (context && generations.length && model.generation !== '9') {
      addReplayWarning(model.metadataConflicts, 'tier and gen disagree');
    }
    var expected = context === 'champions' ? CHAMPIONS_REPLAY_TIERS[model.tier] :
      context === 'historical' ? (/VGC|Doubles/i.test(model.tier) ? 'doubles' : 'singles') : '';
    if (gameTypes.length && expected && model.gameType !== expected) {
      addReplayWarning(model.metadataConflicts, 'tier and gametype disagree');
    }
    model.learnsetContext = model.metadataConflicts.length ? '' : context;
    model.metadataConflicts.forEach(function(reason) {
      addReplayWarning(model.warnings, 'Replay learnset context unchecked: ' + reason + '.');
    });
  }

  function legalityForMoves(species, moves, ctx) {
    var context = ctx && ctx.learnsetContext;
    var api = ChampionsSim.moveLegality;
    if (!context || !api || typeof api.isMoveLegalForSpecies !== 'function') {
      return (moves || []).map(function(move) {
        return {
          move: move,
          legal: false,
          reason: !context ? 'learnset_context_unavailable' : 'source_unavailable',
          verification_status: 'unchecked',
          learnsetContext: context || '',
          notes: 'unchecked'
        };
      });
    }
    return (moves || []).map(function(move) {
      var out = api.isMoveLegalForSpecies(species, move, { learnsetContext: context });
      return {
        move: move,
        legal: out.verification_status === 'known' && !!out.legal,
        verification_status: out.verification_status || 'unchecked',
        learnsetContext: context,
        reason: out.reason || '',
        notes: out.notes || '',
        source: out.source || '',
        sourceVersion: out.sourceVersion || ''
      };
    });
  }

  function observedMovesForSpecies(ctx, species, aliases) {
    var seen = [];
    var lookup = (ctx && ctx.observedMovesBySpecies) || {};
    [species].concat(aliases || []).forEach(function(key) {
      (lookup[key] || []).forEach(function(move) { addUnique(seen, move); });
    });
    return seen;
  }

  function applyMoveLegalityWarnings(warnings, legality) {
    (legality || []).forEach(function(item) {
      if (item.verification_status === 'unchecked') {
        addReplayWarning(warnings, 'move legality unchecked: ' + item.move + ' (' + item.reason + ')');
      } else if (item.learnsetContext === 'historical') {
        addReplayWarning(warnings, 'historical learnset membership ' + (item.legal ? 'found' : 'not found') + '; not current Champions legality: ' + item.move);
      } else if (item.verification_status === 'known' && !item.legal) {
        addReplayWarning(warnings, 'move not legal for this species/form: ' + item.move);
      }
    });
  }

  function supportForMoves(moves) {
    var api = ChampionsSim.moveSupport;
    if (!api || typeof api.summarizeMoveSupport !== 'function') return [];
    return api.summarizeMoveSupport(moves || []);
  }

  function applyMoveSupportWarnings(warnings, supportRows) {
    (supportRows || []).forEach(function(item) {
      if (item.supportLevel === 'incomplete') addReplayWarning(warnings, 'local sim move data incomplete: ' + item.moveName);
      if (item.supportLevel === 'baseline') addReplayWarning(warnings, 'advanced move interactions not individually verified: ' + item.moveName);
    });
  }

  function auditRosterRow(row, ctx) {
    row = row || {};
    var species = row.species || 'unknown';
    var warnings = (row.warnings || row.parserWarnings || []).slice();
    var stats = sourceStatsForSpecies(species);
    var moves = observedMovesForSpecies(ctx, species, [row.postImportSpecies, row.resolvedSpecies, row.baseSpecies]);
    if (!stats) addReplayWarning(warnings, 'stats fallback used or source stats unavailable for ' + species);
    var legality = legalityForMoves(species, moves, ctx);
    var support = supportForMoves(moves);
    applyMoveLegalityWarnings(warnings, legality);
    applyMoveSupportWarnings(warnings, support);
    return {
      side: row.side || '',
      slot: row.slot || '',
      leadOrder: row.leadOrder || null,
      species: species,
      displayName: row.displayName || species,
      baseSpecies: row.baseSpecies || replayBaseSpecies(species),
      resolvedSpecies: row.resolvedSpecies || row.postImportSpecies || '',
      status: row.status || 'bench',
      hp: row.hp == null ? (row.status === 'unknown' ? null : 100) : row.hp,
      hpLabel: row.hp == null ? (row.status === 'unknown' ? 'unknown' : '100%') : String(row.hp) + '%',
      faintTurn: row.faintTurn || null,
      gender: row.gender || 'unknown',
      level: row.level || 'unknown',
      item: row.item || 'unknown',
      ability: row.ability || 'unknown',
      moves: moves.length ? moves : ['unknown'],
      baseStats: stats || null,
      baseStatsLabel: statLine(stats),
      calculatedStats: 'unknown',
      moveLegality: legality,
      moveSupport: support,
      parserWarnings: warnings
    };
  }

  function ensureRosterEntry(rosterState, side, species, meta) {
    meta = meta || {};
    var key = cleanText(species);
    if (!side || !key) return null;
    var sideRows = rosterState[side] = rosterState[side] || {};
    var row = sideRows[key] = sideRows[key] || {
      side: side,
      species: key,
      displayName: key,
      baseSpecies: replayBaseSpecies(key),
      status: 'bench',
      hp: 100,
      warnings: []
    };
    if (meta.displayName) row.displayName = meta.displayName;
    if (meta.baseSpecies) row.baseSpecies = meta.baseSpecies;
    if (meta.slot) row.slot = meta.slot;
    if (meta.status) row.status = meta.status;
    if (meta.hp != null) row.hp = meta.hp;
    if (meta.faintTurn) row.faintTurn = meta.faintTurn;
    if (meta.gender) row.gender = meta.gender;
    if (meta.level) row.level = meta.level;
    if (meta.item) row.item = meta.item;
    if (meta.ability) row.ability = meta.ability;
    if (meta.leadOrder) row.leadOrder = meta.leadOrder;
    (meta.warnings || []).forEach(function(w) { addReplayWarning(row.warnings, w); });
    return row;
  }

  function benchSlotOccupant(rosterState, side, species) {
    var row = ensureRosterEntry(rosterState, side, species);
    if (row && row.status !== 'fainted') {
      row.status = 'bench';
      row.slot = '';
    }
  }

  function replaceRosterSpecies(rosterState, side, before, after, meta) {
    var oldKey = cleanText(before);
    var newKey = cleanText(after);
    if (!side || !oldKey || !newKey || oldKey === newKey) return ensureRosterEntry(rosterState, side, newKey, meta || {});
    var sideRows = rosterState[side] = rosterState[side] || {};
    var oldRow = sideRows[oldKey];
    var newRow = sideRows[newKey] || oldRow || { side: side, warnings: [] };
    if (oldRow && oldRow !== newRow) delete sideRows[oldKey];
    newRow.species = newKey;
    newRow.displayName = newKey;
    newRow.baseSpecies = replayBaseSpecies(newKey);
    sideRows[newKey] = newRow;
    return ensureRosterEntry(rosterState, side, newKey, meta || {});
  }

  function rosterRowsForSide(rosterState, side, ctx) {
    var rows = Object.keys((rosterState && rosterState[side]) || {}).map(function(key) {
      return auditRosterRow(rosterState[side][key], ctx);
    });
    rows.sort(function(a, b) {
      var order = { active: 0, bench: 1, fainted: 2, unknown: 3 };
      var ao = order[a.status] == null ? 9 : order[a.status];
      var bo = order[b.status] == null ? 9 : order[b.status];
      if (ao !== bo) return ao - bo;
      if ((a.leadOrder || 99) !== (b.leadOrder || 99)) return (a.leadOrder || 99) - (b.leadOrder || 99);
      return (a.species || '').localeCompare(b.species || '');
    });
    return rows;
  }

  function snapshotRosterState(rosterState, ctx) {
    return {
      p1: rosterRowsForSide(rosterState, 'p1', ctx),
      p2: rosterRowsForSide(rosterState, 'p2', ctx)
    };
  }

  function buildReplayTurn0Snapshot(model, ctx) {
    ctx = ctx || {};
    var sides = {};
    ['p1', 'p2'].forEach(function(side) {
      var preview = ctx.previewDetails && ctx.previewDetails[side] ? ctx.previewDetails[side] : [];
      var starters = ctx.startingSlots && ctx.startingSlots[side] ? ctx.startingSlots[side] : [];
      var starterBySpecies = {};
      starters.forEach(function(row, idx) {
        starterBySpecies[row.species] = Object.assign({}, row, { status: 'active', hp: row.hp == null ? 100 : row.hp, leadOrder: idx + 1 });
      });
      var roster = [];
      preview.forEach(function(row) {
        var active = starterBySpecies[row.species];
        roster.push(auditRosterRow(active || {
          side: side,
          species: row.species || 'unknown',
          displayName: row.species || 'unknown',
          baseSpecies: row.baseSpecies,
          status: 'bench',
          hp: 100,
          gender: row.gender,
          level: row.level,
          item: row.item,
          ability: row.ability,
          warnings: row.gender ? ['gender token seen and stripped'] : []
        }, ctx));
        if (active) delete starterBySpecies[row.species];
      });
      Object.keys(starterBySpecies).forEach(function(key) {
        roster.push(auditRosterRow(starterBySpecies[key], ctx));
      });
      sides[side] = {
        side: side,
        player: model.players[side] || side,
        teamPreview: preview.map(function(row) { return row.species || 'unknown'; }),
        roster: roster,
        leads: roster.filter(function(row) { return row.status === 'active'; })
      };
    });
    return {
      title: 'Turn 0 — Starting State',
      generatedFrom: 'local replay parser audit',
      sides: sides,
      parserWarnings: (ctx.parserWarnings || []).slice()
    };
  }

  function parseManualReplayRoster(input) {
    var text = String(input || '').trim();
    if (!text) return [];
    var chunks = text.split(/\r?\n|;/);
    if (chunks.length === 1 && text.indexOf(',') >= 0 && !/\bL(?:evel)?\s*\d+\b/i.test(text)) {
      chunks = text.split(',');
    }
    var out = [];
    chunks.forEach(function(chunk) {
      var line = cleanText(chunk);
      if (!line) return;
      if (line.indexOf('|poke|') >= 0) {
        var parts = line.split('|');
        line = cleanText(parts[3] || '');
      }
      line = line.replace(/^[\s*#\-\d.)]+/, '');
      line = line.replace(/\s+\((?:M|F|N)\)\s*$/i, '');
      if (line.indexOf('@') >= 0) line = line.split('@')[0];
      var details = normalizeReplayPokemonDetails('', line);
      addUnique(out, details.species || line);
    });
    return out.slice(0, 6);
  }

  function parseShowdownLog(rawLog, opts) {
    opts = opts || {};
    var selectedSide = normalizeSide(opts.selectedSide || 'p1');
    var text = normalizeReplayLogInput(rawLog);
    var model = {
      ok: false,
      selectedSide: selectedSide,
      format: '',
      tier: '',
      gameType: '',
      learnsetContext: '',
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
      turn0: null,
      expectedLineupSize: opts.lineupSize || opts.bringCount || null,
      manualTeamPreview: { p1: [], p2: [] },
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
    var activeSpeciesBySlot = {};
    var faintedSlots = {};
    var pendingEffectiveness = {};
    var lastMove = null;
    var previewDetails = { p1: [], p2: [] };
    var startingSlots = { p1: [], p2: [] };
    var startingBySlot = {};
    var rosterState = { p1: {}, p2: {} };
    var observedMovesBySpecies = {};
    var parserWarnings = [];
    var lines = text.split(/\r?\n/);
    // Resolve the complete metadata envelope before producing any roster verdict.
    resolveReplayMetadata(lines, model);
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
        return;
      }
      if (tag === 'rated') {
        model.rated = true;
        return;
      }
      if (tag === 'poke') {
        var previewSide = normalizeSide(parts[2]);
        var previewMon = normalizeReplayPokemonDetails('', parts[3] || '');
        addUnique(model.teamPreview[previewSide], previewMon.species);
        if (previewMon.gender) addReplayWarning(parserWarnings, 'gender token seen and stripped for ' + (previewMon.species || 'unknown'));
        previewDetails[previewSide].push(previewMon);
        ensureRosterEntry(rosterState, previewSide, previewMon.species, {
          side: previewSide,
          status: 'bench',
          hp: 100,
          displayName: previewMon.displayName,
          baseSpecies: previewMon.baseSpecies,
          gender: previewMon.gender,
          level: previewMon.level,
          item: previewMon.item,
          ability: previewMon.ability,
          warnings: previewMon.gender ? ['gender token seen and stripped'] : []
        });
        return;
      }
      if (tag === 'turn') {
        if (currentTurn && currentTurn.number > 0) {
          currentTurn.rosterState = snapshotRosterState(rosterState, { observedMovesBySpecies: observedMovesBySpecies, learnsetContext: model.learnsetContext });
        }
        seenFirstTurn = true;
        lastMove = null;
        pendingEffectiveness = {};
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
        var parsedMon = normalizeReplayPokemonDetails(slot, parts[3] || '');
        var mon = parsedMon.species || speciesForSlot(activeSpeciesBySlot, slot) || nameFromSlot(slot);
        var details = parsedMon.species || mon;
        var hp = hpPercent(parts[4] || '');
        var key = slotKey(slot);
        var forcedReplacement = tag === 'drag' || !!faintedSlots[key];
        delete faintedSlots[key];
        pendingEffectiveness = {};
        lastMove = null;
        var previous = key ? activeSpeciesBySlot[key] : '';
        if (side && previous && previous !== details) benchSlotOccupant(rosterState, side, previous);
        if (key && details) activeSpeciesBySlot[key] = details;
        if (parsedMon.gender) addReplayWarning(parserWarnings, 'gender token seen and stripped for ' + details);
        if (side) {
          addUnique(model.selectedPokemon[side], details);
          if (!seenFirstTurn) addUnique(activeSeenBeforeTurnOne[side], details);
          ensureRosterEntry(rosterState, side, details, {
            side: side,
            slot: key,
            status: 'active',
            hp: hp == null ? 100 : hp,
            displayName: details,
            baseSpecies: parsedMon.baseSpecies || replayBaseSpecies(details),
            gender: parsedMon.gender,
            level: parsedMon.level,
            item: parsedMon.item,
            ability: parsedMon.ability,
            warnings: parsedMon.gender ? ['gender token seen and stripped'] : []
          });
        }
        if (side && key && !seenFirstTurn && !startingBySlot[key]) {
          startingBySlot[key] = {
            side: side,
            slot: key,
            species: details,
            postImportSpecies: details,
            baseSpecies: parsedMon.baseSpecies || replayBaseSpecies(details),
            gender: parsedMon.gender,
            level: parsedMon.level,
            item: parsedMon.item,
            ability: parsedMon.ability,
            hp: hp == null ? 100 : hp,
            warnings: parsedMon.gender ? ['gender token seen and stripped'] : []
          };
          startingSlots[side].push(startingBySlot[key]);
        }
        currentTurn.switches.push({
          side: side,
          pokemon: details,
          details: details,
          nickname: nameFromSlot(slot),
          gender: parsedMon.gender,
          level: parsedMon.level,
          hp: hp,
          forced: forcedReplacement,
          voluntary: tag === 'switch' && !forcedReplacement && seenFirstTurn
        });
        currentTurn.events.push({ type: tag, side: side, pokemon: details, text: raw });
        return;
      }

      if (tag === '-mega') {
        var megaSlot = parts[2];
        var megaSide = sideOf(megaSlot);
        var megaKey = slotKey(megaSlot);
        var currentSpecies = speciesForSlot(activeSpeciesBySlot, megaSlot) || nameFromSlot(megaSlot);
        var megaItem = parts[4] || parts[3] || '';
        var formHint = parts[4] ? parts[3] : '';
        var baseSpecies = normalizeReplayPokemonDetails(currentSpecies || formHint).species || currentSpecies || formHint;
        var megaSpecies = resolveReplayMegaSpecies(baseSpecies, megaItem || formHint);
        if (megaKey && megaSpecies) activeSpeciesBySlot[megaKey] = megaSpecies;
        if (megaSide && megaSpecies) {
          replaceUniquePokemon(model.selectedPokemon[megaSide], baseSpecies, megaSpecies);
          replaceRosterSpecies(rosterState, megaSide, baseSpecies, megaSpecies, {
            side: megaSide,
            slot: megaKey,
            status: 'active',
            item: cleanText(megaItem),
            warnings: megaSpecies !== baseSpecies ? ['Mega form resolved from ' + baseSpecies + ' to ' + megaSpecies] : []
          });
        }
        if (megaKey && startingBySlot[megaKey] && megaSpecies && megaSpecies !== baseSpecies) {
          startingBySlot[megaKey].resolvedSpecies = megaSpecies;
          startingBySlot[megaKey].item = cleanText(megaItem) || startingBySlot[megaKey].item;
          addReplayWarning(startingBySlot[megaKey].warnings, 'Mega form resolved from ' + baseSpecies + ' to ' + megaSpecies);
          addReplayWarning(parserWarnings, 'Mega form resolved from ' + baseSpecies + ' to ' + megaSpecies);
        }
        currentTurn.events.push({
          type: 'mega',
          side: megaSide,
          pokemon: megaSpecies || baseSpecies,
          baseSpecies: baseSpecies,
          item: cleanText(megaItem),
          text: raw
        });
        currentTurn.formChanges.push({
          type: 'mega',
          side: megaSide,
          pokemon: megaSpecies || baseSpecies,
          baseSpecies: baseSpecies,
          item: cleanText(megaItem),
          text: raw
        });
        return;
      }

      if (tag === 'detailschange' || tag === 'formechange') {
        var formSlot = parts[2];
        var formSide = sideOf(formSlot);
        var formKey = slotKey(formSlot);
        var nextDetails = normalizeReplayPokemonDetails(formSlot, parts[3] || '');
        var nextSpecies = nextDetails.species || speciesForSlot(activeSpeciesBySlot, formSlot) || nameFromSlot(formSlot);
        var previousSpecies = speciesForSlot(activeSpeciesBySlot, formSlot);
        if (formKey && nextSpecies) activeSpeciesBySlot[formKey] = nextSpecies;
        if (formSide && previousSpecies && nextSpecies && previousSpecies !== nextSpecies) {
          replaceUniquePokemon(model.selectedPokemon[formSide], previousSpecies, nextSpecies);
          replaceRosterSpecies(rosterState, formSide, previousSpecies, nextSpecies, {
            side: formSide,
            slot: formKey,
            status: 'active',
            warnings: ['Form changed from ' + previousSpecies + ' to ' + nextSpecies]
          });
        }
        currentTurn.formChanges.push({
          type: tag,
          side: formSide,
          pokemon: nextSpecies,
          previousPokemon: previousSpecies,
          details: cleanText(parts[3]),
          hp: hpPercent(parts[4] || ''),
          text: raw
        });
        currentTurn.events.push({ type: tag, side: formSide, pokemon: nextSpecies, text: raw });
        return;
      }

      if (tag === 'move') {
        pendingEffectiveness = {};
        var actorSlot = parts[2];
        var actorSide = sideOf(actorSlot);
        var actor = speciesForSlot(activeSpeciesBySlot, actorSlot);
        var move = cleanText(parts[3]);
        var targetSlot = parts[4] || '';
        var targetSide = sideOf(targetSlot);
        var target = speciesForSlot(activeSpeciesBySlot, targetSlot);
        lastMove = { slot: slotKey(actorSlot), move: move, side: actorSide };
        if (actorSide) addUnique(model.selectedPokemon[actorSide], actor);
        if (actor && move) addUnique((observedMovesBySpecies[actor] = observedMovesBySpecies[actor] || []), move);
        currentTurn.moves.push({ side: actorSide, pokemon: actor, move: move, targetSide: targetSide, target: target });
        currentTurn.events.push({ type: 'move', side: actorSide, pokemon: actor, move: move, target: target, text: raw });
        return;
      }

      if (tag === 'faint') {
        var faintSlot = parts[2];
        faintedSlots[slotKey(faintSlot)] = true;
        var faintSide = sideOf(faintSlot);
        var faintMon = speciesForSlot(activeSpeciesBySlot, faintSlot);
        if (faintSide) addUnique(model.selectedPokemon[faintSide], faintMon);
        ensureRosterEntry(rosterState, faintSide, faintMon, {
          side: faintSide,
          status: 'fainted',
          hp: 0,
          faintTurn: currentTurn.number
        });
        currentTurn.faints.push({ side: faintSide, pokemon: faintMon });
        currentTurn.events.push({ type: 'faint', side: faintSide, pokemon: faintMon, text: raw });
        return;
      }

      if (tag === '-damage' || tag === '-heal') {
        var hpSlot = parts[2];
        var hpSide = sideOf(hpSlot);
        var hpMon = speciesForSlot(activeSpeciesBySlot, hpSlot);
        var hpValue = hpPercent(parts[3] || '');
        var row = { side: hpSide, pokemon: hpMon, hp: hpValue, cause: cleanText(parts.slice(4).join('|')) };
        row.effects = tag === '-damage' && !row.cause ? (pendingEffectiveness[slotKey(hpSlot)] || []).slice() : [];
        delete pendingEffectiveness[slotKey(hpSlot)];
        ensureRosterEntry(rosterState, hpSide, hpMon, {
          side: hpSide,
          hp: hpValue,
          status: hpValue === 0 ? 'fainted' : '',
          faintTurn: hpValue === 0 ? currentTurn.number : null
        });
        if (tag === '-damage') currentTurn.damage.push(row);
        else currentTurn.healing.push(row);
        currentTurn.events.push({ type: tag.slice(1), side: hpSide, pokemon: hpMon, hp: hpValue, text: raw });
        return;
      }

      if (tag === '-status' || tag === '-curestatus' || tag === '-boost' || tag === '-unboost') {
        var statusSlot = parts[2];
        currentTurn.status.push({ type: tag.slice(1), side: sideOf(statusSlot), pokemon: speciesForSlot(activeSpeciesBySlot, statusSlot), value: cleanText(parts[3]) });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(statusSlot), pokemon: speciesForSlot(activeSpeciesBySlot, statusSlot), text: raw });
        return;
      }

      if (tag === '-weather' || tag === '-fieldstart' || tag === '-fieldend' || tag === '-fieldactivate' || tag === '-sidestart' || tag === '-sideend' || tag === '-sideactivate') {
        var fieldOwner = parts.find(function(part) { return /^\[of\] /.test(part); });
        var sideEvent = /^-side/.test(tag);
        var fieldMatchesMove = lastMove && cleanText(parts[2]).replace(/^move: /, '').replace(/\s/g, '').toLowerCase() === lastMove.move.replace(/\s/g, '').toLowerCase();
        var fieldSide = sideEvent ? sideOf(parts[2]) : (fieldOwner ? sideOf(fieldOwner.replace(/^\[of\] /, '')) : (fieldMatchesMove ? lastMove.side : ''));
        currentTurn.field.push({ type: tag.slice(1), value: cleanText(parts[sideEvent ? 3 : 2]), side: fieldSide, upkeep: parts.indexOf('[upkeep]') >= 0 });
        currentTurn.events.push({ type: tag.slice(1), text: raw });
        return;
      }

      if (tag === '-crit' || tag === '-miss' || tag === '-fail' || tag === '-immune') {
        var rngSlot = parts[2];
        currentTurn.rng.push({ type: tag.slice(1), side: sideOf(rngSlot), pokemon: speciesForSlot(activeSpeciesBySlot, rngSlot), value: cleanText(parts[3]), move: lastMove && lastMove.slot === slotKey(rngSlot) ? lastMove.move : '' });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(rngSlot), pokemon: speciesForSlot(activeSpeciesBySlot, rngSlot), text: raw });
        return;
      }

      if (tag === 'cant') {
        var cantSlot = parts[2];
        currentTurn.actionDenials.push({
          type: 'cant',
          side: sideOf(cantSlot),
          pokemon: speciesForSlot(activeSpeciesBySlot, cantSlot),
          reason: cleanText(parts[3]),
          move: cleanText(parts[4]),
          text: raw
        });
        currentTurn.events.push({ type: 'cant', side: sideOf(cantSlot), pokemon: speciesForSlot(activeSpeciesBySlot, cantSlot), reason: cleanText(parts[3]), text: raw });
        return;
      }

      if (tag === '-ability' || (tag === '-activate' && /^ability: /.test(parts[3] || ''))) {
        var abilitySlot = parts[2];
        currentTurn.abilities.push({
          type: 'ability',
          side: sideOf(abilitySlot),
          pokemon: speciesForSlot(activeSpeciesBySlot, abilitySlot),
          ability: cleanText(parts[3]),
          detail: cleanText(parts.slice(4).join('|')),
          text: raw
        });
        currentTurn.events.push({ type: 'ability', side: sideOf(abilitySlot), pokemon: speciesForSlot(activeSpeciesBySlot, abilitySlot), ability: cleanText(parts[3]), text: raw });
        return;
      }

      if (tag === '-activate' && !/^item: /.test(parts[3] || '')) {
        currentTurn.events.push({ type: 'activate', side: sideOf(parts[2]), pokemon: speciesForSlot(activeSpeciesBySlot, parts[2]), effect: cleanText(parts[3]), text: raw });
        return;
      }

      if (tag === '-item' || tag === '-enditem' || tag === '-activate') {
        var itemSlot = parts[2];
        currentTurn.items.push({
          type: tag.slice(1),
          side: sideOf(itemSlot),
          pokemon: speciesForSlot(activeSpeciesBySlot, itemSlot),
          item: cleanText(parts[3]),
          detail: cleanText(parts.slice(4).join('|')),
          text: raw
        });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(itemSlot), pokemon: speciesForSlot(activeSpeciesBySlot, itemSlot), item: cleanText(parts[3]), text: raw });
        return;
      }

      if (tag === '-singleturn') {
        var singleSlot = parts[2];
        currentTurn.singleTurn.push({
          type: 'singleturn',
          side: sideOf(singleSlot),
          pokemon: speciesForSlot(activeSpeciesBySlot, singleSlot),
          effect: cleanText(parts[3]),
          text: raw
        });
        currentTurn.events.push({ type: 'singleturn', side: sideOf(singleSlot), pokemon: speciesForSlot(activeSpeciesBySlot, singleSlot), effect: cleanText(parts[3]), text: raw });
        return;
      }

      if (tag === '-supereffective' || tag === '-resisted') {
        var effSlot = parts[2];
        (pendingEffectiveness[slotKey(effSlot)] = pendingEffectiveness[slotKey(effSlot)] || []).push(tag.slice(1));
        currentTurn.effectiveness.push({
          type: tag.slice(1),
          side: sideOf(effSlot),
          pokemon: speciesForSlot(activeSpeciesBySlot, effSlot),
          text: raw
        });
        currentTurn.events.push({ type: tag.slice(1), side: sideOf(effSlot), pokemon: speciesForSlot(activeSpeciesBySlot, effSlot), text: raw });
        return;
      }
    });

    if (currentTurn && currentTurn.number > 0) {
      currentTurn.rosterState = snapshotRosterState(rosterState, { observedMovesBySpecies: observedMovesBySpecies, learnsetContext: model.learnsetContext });
    }

    model.leads.p1 = activeSeenBeforeTurnOne.p1.slice(0, 2);
    model.leads.p2 = activeSeenBeforeTurnOne.p2.slice(0, 2);
    if (!model.leads.p1.length && model.turns[0]) {
      model.leads.p1 = model.turns[0].switches.filter(function(s) { return s.side === 'p1'; }).map(function(s) { return s.pokemon; }).slice(0, 2);
      model.leads.p2 = model.turns[0].switches.filter(function(s) { return s.side === 'p2'; }).map(function(s) { return s.pokemon; }).slice(0, 2);
    }
    model.turns = model.turns.filter(function(t) { return t.number > 0; });
    if (!model.totalTurns && model.turns.length) model.totalTurns = model.turns[model.turns.length - 1].number || 0;

    var selectedName = model.players[selectedSide];
    var oppSide = selectedSide === 'p1' ? 'p2' : 'p1';
    if (model.result !== 'tie' && model.winner) {
      model.result = selectedName && model.winner === selectedName ? 'win' : 'loss';
    }
    if (!model.players.p1 && !model.players.p2) model.warnings.push('Player names were not found in the log.');
    if (!model.leads.p1.length || !model.leads.p2.length) model.warnings.push('Lead Pokemon could not be fully inferred.');
    if (!model.teamPreview.p1.length && !model.teamPreview.p2.length) model.warnings.push('Team preview was not present; selected Pokemon are inferred from revealed actions.');
    var manualRoster = parseManualReplayRoster(opts.manualTeamPreview || opts.manualFullRoster || opts.fullRoster || '');
    if (manualRoster.length) {
      model.manualTeamPreview[selectedSide] = manualRoster.slice();
      manualRoster.forEach(function(species) {
        var details = normalizeReplayPokemonDetails('', species);
        var mon = details.species || species;
        addUnique(model.teamPreview[selectedSide], mon);
        if (!previewDetails[selectedSide].some(function(row) { return row && row.species === mon; })) {
          previewDetails[selectedSide].push(details);
        }
        if (model.selectedPokemon[selectedSide].indexOf(mon) < 0) {
          ensureRosterEntry(rosterState, selectedSide, mon, {
            side: selectedSide,
            status: 'bench',
            hp: 100,
            displayName: mon,
            baseSpecies: details.baseSpecies || replayBaseSpecies(mon),
            gender: details.gender,
            level: details.level,
            item: details.item,
            ability: details.ability,
            source: 'manual-full-roster'
          });
        }
      });
      addReplayWarning(parserWarnings, 'Manual full roster was used to complete missing replay preview data.');
    }
    model.turn0 = buildReplayTurn0Snapshot(model, {
      previewDetails: previewDetails,
      startingSlots: startingSlots,
      observedMovesBySpecies: observedMovesBySpecies,
      learnsetContext: model.learnsetContext,
      parserWarnings: parserWarnings
    });
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
    var knownExtraKeys = { id: 1, category: 1, whatHappened: 1, whyMattered: 1, doInstead: 1, evidence: 1 };
    var customFields = {};
    Object.keys(extra).forEach(function(k) { if (!knownExtraKeys[k]) customFields[k] = extra[k]; });
    issues.push(Object.assign({
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
    }, customFields));
  }

  function moveNames(moves) {
    return (moves || []).map(function(m) { return (m.pokemon || '?') + ' used ' + (m.move || '?'); }).join('; ');
  }

  function hasOpponentFieldProgress(turn, oppSide) {
    return (turn.field || []).some(function(f) {
      return !f.upkeep && /^(weather|fieldstart|sidestart)$/.test(f.type) && f.value !== 'none' && f.side === oppSide;
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
    var previewCount = preview.length;
    var selectedCount = selected.length;
    var format = cleanText(parsed.format || '').toLowerCase();
    var expectedLineupSize = parsed.expectedLineupSize || (/singles|1v1|battle stadium singles|bss/.test(format) ? 3 : 4);
    var fullRosterKnown = previewCount >= 6;
    var selectedFourKnown = selectedCount >= expectedLineupSize;
    var base = {
      previewCount: previewCount,
      selectedCount: selectedCount,
      expectedLineupSize: expectedLineupSize,
      fullRosterKnown: fullRosterKnown,
      selectedFourKnown: selectedFourKnown,
      bringChoiceReviewable: fullRosterKnown && selectedFourKnown,
      limitation: ''
    };
    if (fullRosterKnown && selectedFourKnown) {
      return Object.assign(base, {
        level: 'high',
        label: 'Full preview + lineup inferred',
        reason: 'Team preview showed the registered six and the expected game-specific lineup appeared in the log, so the squad choice can be reviewed.'
      });
    }
    if (selectedFourKnown) {
      return Object.assign(base, {
        level: 'medium',
        label: 'Visible lineup inferred',
        reason: 'The expected brought Pokemon count appeared in the log, so replay review can continue.',
        limitation: 'Lineup analysis is limited — the registered six were not fully revealed, so benched swap options are unknown.'
      });
    }
    if (fullRosterKnown && selectedCount > 0) {
      return Object.assign(base, {
        level: 'medium',
        label: 'Partial bring',
        reason: 'Team preview showed the registered six, but fewer than the expected brought Pokemon were revealed.',
        limitation: 'Lineup analysis is limited until the missing game-specific squad Pokemon appear in the log or are entered manually.'
      });
    }
    if (selectedCount > 0) {
      return Object.assign(base, {
        level: 'medium',
        label: 'Partial visible roster',
        reason: 'Selected Pokemon are inferred from revealed actions only.',
        limitation: 'Both the full six and complete selected four are incomplete from this replay.'
      });
    }
    return Object.assign(base, {
      level: 'low',
      label: 'Unknown',
      reason: 'The log did not reveal selected Pokemon.',
      limitation: 'Upload a fuller replay log before using bring-choice coaching.'
    });
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
    if (ev.type === 'mega') return (ev.baseSpecies || '?') + ' Mega Evolved into ' + (ev.pokemon || '?') + (ev.item ? ' with ' + ev.item : '') + ' (timing shown in replay order)';
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
      var userSwitches = turn.switches.filter(function(s) { return s.side === side && s.voluntary; });
      var oppSwitches = turn.switches.filter(function(s) { return s.side === names.opp && s.voluntary; });
      var userSpeed = userMoves.filter(function(m) { return classifyMove(m.move) === 'speed_control'; });
      var oppSpeed = oppMoves.filter(function(m) { return classifyMove(m.move) === 'speed_control'; });
      var tactical = turn.tacticalRead || {};
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
      if (tactical.stateShift) {
        severity = tactical.severity || severity;
        confidence = tactical.confidence || confidence;
        stateShift = tactical.stateShift;
        coachingRead = tactical.coachingRead || coachingRead;
        betterLine = tactical.betterLine || betterLine;
      } else if (userSpeed.length && !oppFaints.length) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Speed control set without clear payoff';
        coachingRead = 'You used speed control. The next coaching check is whether it created immediate pressure, protected a win condition, or just spent a turn.';
        betterLine = betterLine || 'After setting speed control, plan the next two turns before clicking it: target, forced Protect, or preserved closer.';
      }
      if (!tactical.stateShift && oppSpeed.length) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Opponent advanced speed control';
        coachingRead = 'The opponent advanced speed control. If this was not denied or punished, your next turns may be played from behind.';
      }
      if (!tactical.stateShift && userProtect.length && (oppSpeed.length || fieldEvents.length)) {
        severity = severity === 'high' ? severity : 'medium';
        stateShift = 'Protect gave space';
        coachingRead = 'Your Protect may have preserved HP, but the opponent also improved the field or speed state. That trade needs a clear reason.';
        betterLine = betterLine || 'Use Protect when it preserves the actual win condition or stalls a limited field turn, not as a default pause.';
      }
      if (!tactical.stateShift && userSwitches.length && !oppFaints.length && (oppSpeed.length || fieldEvents.length || oppSwitches.length)) {
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
        rosterState: turn.rosterState || null,
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

  function replayMoveName(move) {
    return cleanText((move && move.move) || move || '');
  }

  function isTailwindMove(move) {
    return /^tailwind$/i.test(replayMoveName(move));
  }

  function isTrickRoomMove(move) {
    return /^trick room$/i.test(replayMoveName(move));
  }

  function isSpeedControlMove(move) {
    return classifyMove(replayMoveName(move)) === 'speed_control';
  }

  function isSetupOrProtectionMove(move) {
    var kind = classifyMove(replayMoveName(move));
    return kind === 'setup' || kind === 'protection' || kind === 'redirection';
  }

  function turnSideMoves(turn, side) {
    return ((turn && turn.moves) || []).filter(function(m) { return m.side === side; });
  }

  function turnSideFaints(turn, side) {
    return ((turn && turn.faints) || []).filter(function(f) { return f.side === side; });
  }

  function turnSideTookMajorDamage(turn, side) {
    return ((turn && turn.damage) || []).some(function(d) {
      return d.side === side && d.hp != null && Number(d.hp) <= 70;
    });
  }

  function turnSideGainedMaterial(turn, side, opp) {
    return turnSideFaints(turn, opp).length > turnSideFaints(turn, side).length ||
      (turnSideTookMajorDamage(turn, opp) && !turnSideFaints(turn, side).length);
  }

  function sideHasNaturalSpeedLead(turn, side, opp) {
    var details = (((turn || {}).pre || {}).speed_order_details) || (((turn || {}).post || {}).speed_order_details) || [];
    if (!details.length) return false;
    var firstUser = null;
    var firstOpp = null;
    details.forEach(function(row) {
      if (!row) return;
      var rowSide = row.side;
      var base = row.calculated_speed != null ? Number(row.calculated_speed) : Number(row.base_speed || row.effective_speed || 0);
      if (rowSide === side && (firstUser == null || base > firstUser)) firstUser = base;
      if (rowSide === opp && (firstOpp == null || base > firstOpp)) firstOpp = base;
    });
    return firstUser != null && firstOpp != null && firstUser > firstOpp;
  }

  function trickRoomActive(turn) {
    var pre = (((turn || {}).pre || {}).field || {}).trick_room || 0;
    var post = (((turn || {}).post || {}).field || {}).trick_room || 0;
    return Number(pre) > 0 || Number(post) > 0;
  }

  function buildSpeedControlInsights(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    var turns = (parsed && parsed.turns) || [];
    var byTurn = {};
    turns.forEach(function(turn, idx) {
      var userSpeed = turnSideMoves(turn, side).filter(isSpeedControlMove);
      var oppSpeed = turnSideMoves(turn, opp).filter(isSpeedControlMove);
      var userSetup = turnSideMoves(turn, side).filter(isSetupOrProtectionMove);
      var userTR = userSpeed.some(isTrickRoomMove);
      var oppTR = oppSpeed.some(isTrickRoomMove);
      var userTW = userSpeed.some(isTailwindMove);
      var oppTW = oppSpeed.some(isTailwindMove);
      var userSpeedNames = userSpeed.map(replayMoveName).filter(Boolean).join(', ');
      var oppSpeedNames = oppSpeed.map(replayMoveName).filter(Boolean).join(', ');
      var immediatePayoff = turnSideGainedMaterial(turn, side, opp);
      var deferredPayoffTurn = null;
      turns.slice(idx + 1, idx + 4).some(function(future) {
        if (turnSideGainedMaterial(future, side, opp)) {
          deferredPayoffTurn = future.number;
          return true;
        }
        return false;
      });
      var insight = {
        turn: turn.number,
        userSpeed: userSpeed,
        oppSpeed: oppSpeed,
        immediatePayoff: immediatePayoff,
        deferredPayoffTurn: deferredPayoffTurn,
        suppressSpeedNoPressure: false,
        suppressFieldFailure: false,
        notes: []
      };
      var previousTurn = idx > 0 ? turns[idx - 1] : null;
      var previousTrickRoom = previousTurn && trickRoomActive(previousTurn);
      var currentTrickRoom = trickRoomActive(turn);
      var plannedTransition = previousTrickRoom && !currentTrickRoom && sideHasNaturalSpeedLead(turn, side, opp);

      if (!userSpeed.length && !oppSpeed.length && !userSetup.length && !plannedTransition) return;

      if (plannedTransition) {
        insight.stateShift = 'Planned speed transition';
        insight.severity = 'good';
        insight.confidence = 'medium';
        insight.coachingRead = 'Trick Room was no longer active and your visible natural speed order was favorable, so the line transitioned back into normal speed advantage.';
        insight.notes.push({
          id: 'planned_speed_transition',
          tag: 'Planned Speed Transition',
          category: 'speed_control',
          severity: 'good',
          confidence: 'medium',
          message: 'Trick Room ended and the visible natural speed order favored your side.',
          whatHappened: 'The turn after Trick Room ended, your side appeared to hold the faster visible board.',
          whyMattered: 'A good speed plan includes the turn after the field state ends; preserving fast attackers can convert the transition instead of losing tempo.',
          doInstead: 'When Trick Room is expiring, preserve or bring in the Pokemon that wins normal speed order.',
          evidence: 'Trick Room inactive after previous active state; visible speed order favors selected side'
        });
      } else if (userTR && oppTW) {
        insight.stateShift = 'Speed control reversed';
        insight.severity = 'good';
        insight.confidence = 'high';
        insight.coachingRead = 'You answered Tailwind with Trick Room, flipping the move-order plan instead of trying to race it.';
        insight.suppressSpeedNoPressure = true;
        insight.suppressFieldFailure = true;
        insight.notes.push({
          id: 'speed_control_reversal',
          tag: 'Speed Control Reversal',
          category: 'speed_control',
          severity: 'good',
          confidence: 'high',
          message: 'Trick Room reversed the opponent Tailwind plan.',
          whatHappened: 'You used Trick Room into opposing Tailwind.',
          whyMattered: 'Trick Room overrides the normal speed race, so their Tailwind plan no longer gives the same offensive tempo.',
          doInstead: 'When the opponent commits Tailwind, either reverse it with Trick Room or punish the setter immediately.',
          evidence: userSpeedNames + ' into ' + oppSpeedNames
        });
      } else if (oppTR && userTW) {
        insight.stateShift = 'Speed control got reversed';
        insight.severity = 'high';
        insight.confidence = 'high';
        insight.coachingRead = 'Your Tailwind line ran into Trick Room, so the speed advantage likely flipped against the intended plan.';
        insight.betterLine = 'When Trick Room is available, pressure or deny the setter before spending a turn on Tailwind.';
      } else if (userTW && oppTW) {
        insight.stateShift = 'Speed control neutralized';
        insight.severity = 'medium';
        insight.confidence = 'high';
        insight.coachingRead = 'Both sides used Tailwind, so the speed plan became closer to neutral instead of a clean advantage.';
        insight.suppressSpeedNoPressure = true;
        insight.notes.push({
          id: 'speed_control_neutralized',
          tag: 'Speed Control Neutralized',
          category: 'speed_control',
          severity: 'low',
          confidence: 'high',
          message: 'Tailwind was matched by opposing Tailwind.',
          whatHappened: 'Both sides established Tailwind on the same turn.',
          whyMattered: 'Dual Tailwind removes the clean move-order edge; the next decision should be target pressure, preservation, or stalling their window.',
          doInstead: 'After neutralized Tailwind, switch from speed racing to board pressure: force Protect, remove the setter, or preserve the closer.',
          evidence: userSpeedNames + ' vs ' + oppSpeedNames
        });
      } else if (userSpeed.length && (immediatePayoff || deferredPayoffTurn)) {
        insight.stateShift = 'Speed control and HP changes observed';
        insight.severity = 'low';
        insight.confidence = 'low';
        insight.coachingRead = 'HP or faint events occurred near speed control. These events do not establish that speed control caused an advantage.';
        insight.suppressSpeedNoPressure = true;
        insight.notes.push({
          id: 'speed_control_pressure_observed',
          observationOnly: true,
          tag: 'Speed Control Context',
          category: 'speed_control',
          severity: 'low',
          confidence: 'low',
          message: 'Speed control and subsequent HP or faint events were observed; causality is unverified.',
          whatHappened: 'You used ' + userSpeedNames + '. HP or faint events also occurred in this window.',
          whyMattered: 'Residual damage, existing low HP and unrelated actions can produce the same observation.',
          doInstead: 'Inspect action order and damage sources before attributing an advantage to speed control.',
          evidence: deferredPayoffTurn ? 'HP or faint events within T+3; no causal proof' : 'Same-turn HP or faint events; no causal proof'
        });
      } else if (userSetup.length && deferredPayoffTurn) {
        insight.stateShift = 'Setup and later HP changes observed';
        insight.severity = 'low';
        insight.confidence = 'low';
        insight.coachingRead = 'HP or faint events followed setup or protection. This does not establish that the earlier action enabled them.';
        insight.notes.push({
          id: 'setup_pressure_observed',
          observationOnly: true,
          tag: 'Setup Context',
          category: 'turn_execution',
          severity: 'low',
          confidence: 'low',
          message: 'HP or faint events followed setup or protection; causality is unverified.',
          whatHappened: 'You used ' + userSetup.map(replayMoveName).filter(Boolean).join(', ') + '. Later HP or faint events were observed by turn ' + deferredPayoffTurn + '.',
          whyMattered: 'Residual damage and unrelated actions can produce the same sequence.',
          doInstead: 'Inspect event causes before treating the earlier turn as successful setup.',
          evidence: 'HP or faint events within T+3; no causal proof'
        });
      }

      byTurn[turn.number] = insight;
      turn.tacticalRead = insight;
    });
    return byTurn;
  }

  function buildActionDenialCards(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    var cards = [];
    (parsed.turns || []).forEach(function(turn) {
      var rows = [];
      (turn.actionDenials || []).forEach(function(row) {
        rows.push({
          turn: turn.number,
          side: row.side,
          pokemon: row.pokemon,
          move: row.move || '',
          reason: row.reason || 'blocked',
          type: 'cant',
          text: row.text || ''
        });
      });
      (turn.rng || []).forEach(function(row) {
        if (row.type === 'miss' || row.type === 'fail' || row.type === 'immune') {
          rows.push({
            turn: turn.number,
            side: row.side,
            pokemon: row.pokemon,
            move: row.move || '',
            reason: row.type,
            type: row.type,
            text: row.text || ''
          });
        }
      });
      rows.forEach(function(row) {
        var playerOwned = row.side === side;
        var opponentOwned = row.side === opp;
        var reason = cleanText(row.reason || row.type || 'blocked');
        var moveText = row.move ? ' while trying to use ' + row.move : '';
        var subject = (playerOwned ? 'Your ' : (opponentOwned ? 'Their ' : '')) + (row.pokemon || 'Pokemon');
        var label = reason === 'flinch' ? 'Flinch skipped action'
          : reason === 'miss' ? 'Move missed'
          : reason === 'immune' ? 'Target was immune'
          : reason === 'fail' ? 'Move failed'
          : 'Action denied';
        cards.push({
          turn: row.turn,
          side: row.side,
          pokemon: row.pokemon || '',
          move: row.move || '',
          reason: reason,
          label: label,
          severity: playerOwned ? 'high' : (opponentOwned ? 'good' : 'medium'),
          confidence: 'high',
          whatHappened: subject + ' could not complete its action' + moveText + ' because of ' + reason + '.',
          whyItMattered: playerOwned
            ? 'A skipped or failed action can give the opponent a free setup, damage, switch, or speed-control turn.'
            : 'Denying an opposing action is real tempo. The next check is whether you converted that denied turn into damage, positioning, or preservation.',
          doNext: playerOwned
            ? 'Check whether the denial was preventable: Fake Out timing, flinch risk, immunity, Protect, terrain, priority blocking, typing, or targeting.'
            : 'When you deny an action, plan the follow-up before the opponent resets position.',
          evidence: row.text || (reason + ' on turn ' + row.turn)
        });
      });
    });
    return cards;
  }

  function buildAbilityItemImpactCards(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    var cards = [];
    (parsed.turns || []).forEach(function(turn) {
      var rows = [];
      (turn.abilities || []).forEach(function(row) {
        rows.push({
          kind: 'ability',
          turn: turn.number,
          side: row.side,
          pokemon: row.pokemon,
          name: row.ability || '',
          detail: row.detail || '',
          text: row.text || ''
        });
      });
      (turn.items || []).forEach(function(row) {
        rows.push({
          kind: row.type || 'item',
          turn: turn.number,
          side: row.side,
          pokemon: row.pokemon,
          name: row.item || '',
          detail: row.detail || '',
          text: row.text || ''
        });
      });
      rows.forEach(function(row) {
        var playerOwned = row.side === side;
        var opponentOwned = row.side === opp;
        var source = (playerOwned ? 'Your ' : (opponentOwned ? 'Their ' : '')) + (row.pokemon || 'Pokemon');
        var kindLabel = row.kind === 'ability' ? 'Ability activation'
          : row.kind === 'enditem' ? 'Item consumed'
          : row.kind === 'activate' ? 'Effect activation'
          : 'Item revealed';
        cards.push({
          turn: row.turn,
          side: row.side,
          pokemon: row.pokemon || '',
          sourceName: row.name || '',
          kind: row.kind,
          label: kindLabel,
          severity: playerOwned ? 'medium' : 'low',
          confidence: 'high',
          whatHappened: source + ' triggered or revealed ' + (row.name || 'an effect') + '.',
          whyItMattered: row.kind === 'ability'
            ? 'Ability timing can change stats, weather, targeting, damage, or whether a plan is safe.'
            : 'Item timing can change survival math, contact punishment, damage thresholds, or whether the next attack still KOs.',
          doNext: playerOwned
            ? 'Track whether this effect preserved your win condition or created the next turn you wanted.'
            : 'Ask whether your line accounted for that ability/item before committing damage, Fake Out, or a target.'
          ,
          evidence: row.text || (row.name + ' on turn ' + row.turn)
        });
      });
    });
    return cards;
  }

  function buildMegaTimingCards(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    var cards = [];
    (parsed.turns || []).forEach(function(turn) {
      (turn.formChanges || []).forEach(function(row) {
        var isMega = row.type === 'mega' || /-Mega/i.test(row.pokemon || row.details || '');
        if (!isMega) return;
        var playerOwned = row.side === side;
        var opponentOwned = row.side === opp;
        var source = (playerOwned ? 'Your ' : (opponentOwned ? 'Their ' : '')) + (row.baseSpecies || row.previousPokemon || row.pokemon || 'Pokemon');
        cards.push({
          turn: row.turn || turn.number,
          side: row.side,
          pokemon: row.pokemon || '',
          baseSpecies: row.baseSpecies || row.previousPokemon || '',
          item: row.item || '',
          label: 'Mega timing',
          severity: playerOwned ? 'medium' : 'low',
          confidence: 'high',
          whatHappened: source + ' changed into ' + (row.pokemon || 'a Mega form') + (row.item ? ' with ' + row.item : '') + '.',
          whyItMattered: 'Mega timing can change stats, type, ability, weather, damage ranges, and whether the opponent can safely target or outspeed it.',
          doNext: playerOwned
            ? 'Check whether the Mega turn immediately created pressure, weather, Intimidate-style value, or a safer endgame.'
            : 'Check whether your turn respected the new form, typing, ability, and damage thresholds after Mega Evolution.',
          evidence: row.text || 'Mega/form change protocol row'
        });
      });
    });
    return cards;
  }

  function buildDamageContextCards(parsed, side) {
    var opp = side === 'p1' ? 'p2' : 'p1';
    var cards = [];
    (parsed.turns || []).forEach(function(turn) {
      (turn.damage || []).forEach(function(row) {
        if (!row || !row.pokemon) return;
        var effects = row.effects || [];
        if (!effects.length && !(row.hp != null && Number(row.hp) <= 50)) return;
        var playerOwned = row.side === side;
        var opponentOwned = row.side === opp;
        var label = effects.indexOf('supereffective') >= 0 ? 'Super-effective pressure'
          : effects.indexOf('resisted') >= 0 ? 'Resisted damage'
          : 'Major damage threshold';
        cards.push({
          turn: turn.number,
          side: row.side,
          pokemon: row.pokemon || '',
          hp: row.hp,
          effects: effects,
          label: label,
          severity: playerOwned ? 'high' : 'good',
          confidence: effects.length ? 'high' : 'medium',
          whatHappened: (playerOwned ? 'Your ' : (opponentOwned ? 'Their ' : '')) + (row.pokemon || 'Pokemon') + ' was left at ' + (row.hp == null ? 'unknown HP' : row.hp + '%') + (effects.length ? ' after ' + effects.join(' / ') + ' damage context.' : '.'),
          whyItMattered: playerOwned
            ? 'Taking large or super-effective damage changes whether that Pokemon can still preserve the win condition or safely stay in.'
            : 'Meaningful damage only matters if it creates a KO threat, forces Protect, or changes the opponent switch/target decision.',
          doNext: playerOwned
            ? 'Check whether a switch, Protect, redirection, or target change would have preserved this Pokemon.'
            : 'Check whether you converted this damage into a KO, forced Protect, or better board position before they recovered or switched.',
          evidence: row.cause || row.text || 'damage/effectiveness protocol rows'
        });
      });
    });
    return cards;
  }

  function buildReplayScenarioQueue(parsed, side, ctx) {
    ctx = ctx || {};
    var summary = {
      yourLead: ((parsed.leads && parsed.leads[side]) || []).slice(),
      opponentLead: ((parsed.leads && parsed.leads[side === 'p1' ? 'p2' : 'p1']) || []).slice(),
      yourFour: ((parsed.selectedPokemon && parsed.selectedPokemon[side]) || []).slice(),
      opponentFour: ((parsed.selectedPokemon && parsed.selectedPokemon[side === 'p1' ? 'p2' : 'p1']) || []).slice()
    };
    var queue = [];
    var seen = {};
    function push(row) {
      if (!row || !row.title) return;
      var key = [row.title, row.turn || '', row.evidence || ''].join('|');
      if (seen[key]) return;
      seen[key] = true;
      queue.push(Object.assign({
        id: 'scenario_' + String(queue.length + 1).padStart(2, '0'),
        source: 'showdown_replay_import',
        regulationStatus: 'not_rule_truth',
        confidence: 'medium',
        sourceGaps: [
          'Replay data is player-match evidence, not official Pokemon Champion rule truth.',
          'Use simulator output to compare candidate lines; do not promote results without engine/ruleset/version metadata.'
        ],
        boardContext: {
          yourLead: summary.yourLead,
          opponentLead: summary.opponentLead,
          yourFour: summary.yourFour,
          opponentFour: summary.opponentFour
        }
      }, row));
    }

    (ctx.issues || []).filter(function(issue) {
      return issue && (issue.severity === 'high' || issue.turn != null);
    }).slice(0, 5).forEach(function(issue) {
      push({
        priority: issue.severity === 'high' ? 'high' : 'medium',
        turn: issue.turn || null,
        title: 'Replay coaching check: ' + (issue.tag || issue.category || 'decision point'),
        setup: 'Recreate the visible board around ' + (issue.turn ? 'turn ' + issue.turn : 'the opening preview') + ' and compare at least three legal candidate lines.',
        testGoal: issue.doInstead || issue.recommendation || 'Compare the chosen line against safer preservation, pressure, and switch lines.',
        why: issue.whyMattered || issue.message || 'This decision may affect tempo, material, or the win condition.',
        evidence: issue.evidence || issue.whatHappened || issue.message || 'coaching tag',
        confidence: issue.confidence || 'medium'
      });
    });

    (ctx.actionDenialCards || []).slice(0, 4).forEach(function(card) {
      push({
        priority: card.severity === 'high' ? 'high' : 'medium',
        turn: card.turn || null,
        title: 'Action-denial branch: ' + (card.reason || card.label || 'blocked action'),
        setup: 'Run branches where the denied Pokemon acts normally, gets denied again, or the player targets the support slot instead.',
        testGoal: 'Measure whether the replay line only worked because of denial, or whether it still wins if the denied action succeeds.',
        why: card.whyItMattered || 'Action denial can decide a full turn of tempo.',
        evidence: card.evidence || card.whatHappened || 'action denial row',
        confidence: card.confidence || 'high'
      });
    });

    (ctx.megaTimingCards || []).slice(0, 3).forEach(function(card) {
      push({
        priority: 'medium',
        turn: card.turn || null,
        title: 'Mega timing branch: ' + (card.pokemon || card.baseSpecies || 'Mega form'),
        setup: 'Compare Mega-now, Mega-later, and no-Mega fallback lines from the same visible board.',
        testGoal: 'Check whether Mega timing changed ability value, damage ranges, speed order, or survival thresholds.',
        why: card.whyItMattered || 'Mega timing can change ability, stats, type, and pressure immediately.',
        evidence: card.evidence || 'Mega/form-change row',
        confidence: card.confidence || 'high'
      });
    });

    (ctx.damageContextCards || []).slice(0, 4).forEach(function(card) {
      push({
        priority: card.severity === 'high' ? 'high' : 'medium',
        turn: card.turn || null,
        title: 'Damage threshold branch: ' + (card.pokemon || 'target'),
        setup: 'Replay the turn with alternate target choices, Protect, switch, or preservation line.',
        testGoal: 'Find whether this HP threshold created a forced KO, forced Protect, or avoidable loss of a win condition.',
        why: card.whyItMattered || 'Damage thresholds decide whether the next turn is forced or flexible.',
        evidence: card.evidence || 'damage context row',
        confidence: card.confidence || 'medium'
      });
    });

    if (!queue.length) {
      push({
        priority: 'low',
        turn: null,
        title: 'Baseline replay reconstruction',
        setup: 'Recreate the opening leads and selected Pokemon, then run a small branch sweep from turn one.',
        testGoal: 'Confirm the parser has enough data before making coaching claims.',
        why: 'No strong tactical trigger was parsed, but the match can still validate replay intake and lineup handling.',
        evidence: 'No high-priority replay trigger detected.',
        confidence: 'low'
      });
    }
    return queue.slice(0, 12);
  }

  function buildReplayClaimAudit(parsed, side, ctx) {
    ctx = ctx || {};
    var opp = side === 'p1' ? 'p2' : 'p1';
    var warnings = (parsed && parsed.warnings) || [];
    var sourceGaps = [];
    function addGap(code, message) {
      if (!sourceGaps.some(function(row) { return row.code === code; })) sourceGaps.push({ code: code, message: message });
    }
    if (!((parsed.teamPreview && parsed.teamPreview[side] || []).length >= 6)) {
      addGap('REGISTERED_SIX_MISSING', 'Registered six is missing or incomplete; lineup and BO3/BO5 swap coaching stays limited.');
    }
    if (!((parsed.teamPreview && parsed.teamPreview[opp] || []).length >= 6)) {
      addGap('OPPONENT_PREVIEW_MISSING', 'Opponent full preview is missing or incomplete; opponent-plan reads must stay cautious.');
    }
    if (warnings.length) {
      addGap('PARSER_WARNINGS_PRESENT', warnings.slice(0, 3).join(' '));
    }
    addGap('CHAMPION_LEGALITY_NOT_VALIDATED', 'Replay import is player-match evidence only; it does not validate Champion regulation legality.');
    addGap('ALTERNATIVE_BRANCHES_NOT_EXHAUSTIVE', 'Best-move, best-target, and best-lineup claims require simulator branch comparison before promotion.');
    return {
      schema_version: 'champions-replay-claim-audit-v1',
      source: 'showdown_replay_import',
      selected_side: side,
      format: parsed.format || 'unknown',
      observed: {
        label: 'Observed from replay log',
        count: ((parsed.turns || []).length || 0) + ((ctx.actionDenialCards || []).length) + ((ctx.abilityItemImpactCards || []).length) + ((ctx.megaTimingCards || []).length) + ((ctx.damageContextCards || []).length),
        claims: [
          'players, winner/result, turns, visible leads, visible moves, switches, faints, damage/status rows, and protocol events when present',
          'action-denial, ability/item, Mega/form-change, and damage-context cards only when matching replay rows exist'
        ]
      },
      inferred: {
        label: 'Inferred with caution',
        count: (ctx.issues || []).length,
        claims: [
          'selected lineup from revealed Pokemon',
          'critical turn, coaching tags, lead logic, Battle IQ, and opponent plan reads'
        ],
        boundary: 'Inference must keep confidence visible and must not invent hidden items, EVs, full movesets, or opponent intent.'
      },
      sim_derived: {
        label: 'Requires simulator evidence',
        count: (ctx.scenarioQueue || []).length,
        claims: [
          'better move, better target, better lead, best lineup, model update, and leaderboard impact'
        ],
        boundary: 'Replay-derived scenarios are QA targets until run with engine_version, ruleset_version, regulation_id, format, and sample size.'
      },
      source_gaps: sourceGaps,
      forbidden_claims: [
        'Do not treat Showdown/community replay data as official Pokemon Champion legality.',
        'Do not say a move or lineup was definitely best until alternatives were simulated.',
        'Do not store or share raw replay logs without explicit user opt-in.'
      ]
    };
  }

  function buildReplayCoachReview(parsed, opts) {
    var hasBattleEvents = parsed && Array.isArray(parsed.turns) && parsed.turns.some(function(turn) {
      return Number.isFinite(turn.number) && turn.number > 0 && Array.isArray(turn.events) && turn.events.some(function(event) {
        var fields = String(event && event.text || '').split('|');
        var required = {
          move: 3, switch: 4, drag: 4, replace: 3, detailschange: 3, '-formechange': 3,
          faint: 2, '-damage': 3, '-heal': 3, '-status': 3, '-curestatus': 3,
          '-boost': 4, '-unboost': 4, '-weather': 2, '-fieldstart': 2,
          '-fieldend': 2, '-fieldactivate': 2, '-sidestart': 3, '-sideend': 3,
          '-sideactivate': 3, '-crit': 2, '-miss': 2, '-fail': 2, '-immune': 2,
          cant: 3, '-ability': 3, '-item': 3, '-enditem': 3, '-activate': 3,
          '-singleturn': 3, '-supereffective': 2, '-resisted': 2
        }[fields[1]];
        if (!required || fields.length <= required) return false;
        for (var i = 2; i <= required; i++) if (!String(fields[i] || '').trim()) return false;
        if (/^-(?:weather|fieldstart|fieldend|fieldactivate)$/.test(fields[1])) return true;
        return /^p[1-4][a-d]?:\s*\S/.test(fields[2]);
      });
    });
    if (!hasBattleEvents) {
      throw new Error('No battle events were found. Use a replay with observed turns before requesting coaching.');
    }
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
    var benchedTwo = bringConfidence.bringChoiceReviewable
      ? (parsed.teamPreview[side] || []).filter(function(s) { return userSelected.indexOf(s) < 0; })
      : [];
    var speedControlPieces = {};
    var speedInsights = buildSpeedControlInsights(parsed, side);

    if (bringConfidence.bringChoiceReviewable && benchedTwo.length) {
      addIssue(issues, 'Bring Choice Review', 'low', null,
        'You left ' + benchedTwo.join(' and ') + ' on the bench.',
        'medium',
        'After each game, ask whether either benched Pokemon would have answered a key threat you struggled to handle.',
        {
          id: 'bring_choice_review',
          category: 'bring_four',
          benchedSpecies: benchedTwo.slice(),
          whatHappened: 'You brought ' + userSelected.join(', ') + ' and left ' + benchedTwo.join(' and ') + ' on the bench.',
          whyMattered: 'In VGC doubles, the bring-four choice shapes every matchup plan. The two mons you left behind could have offered different speed control, redirection, or win conditions against this opponent.',
          doInstead: 'After each game, check whether either benched Pokemon would have handled a key threat better than one of your brought four.',
          evidence: 'Preview: ' + (parsed.teamPreview[side] || []).join(', ')
        }
      );
    }

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
    if (bringConfidence.selectedFourKnown && !bringConfidence.fullRosterKnown) {
      addIssue(issues, 'Lineup Limited', 'low', null, bringConfidence.limitation, 'medium', 'Add the registered six in the optional roster field after upload when Showdown does not expose team preview.', {
        id: 'bring_four_limited',
        category: 'bring_four',
        whatHappened: 'The replay exposed the game-specific lineup, but did not reveal the full registered six.',
        whyMattered: 'In best-of-three, you can change the game-specific lineup from the same registered six between games, so coaching needs the benched swap options to judge the squad choice.',
        doInstead: 'Paste the registered six into the optional roster completion field before analysis when the replay log only exposes selected Pokemon.',
        evidence: 'Preview count ' + bringConfidence.previewCount + ', revealed selected count ' + bringConfidence.selectedCount
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
      var userSwitches = turn.switches.filter(function(s) { return s.side === side && s.voluntary; });
      var userField = turn.field.filter(function(f) { return f.side === side && !f.upkeep; });
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
      var speedInsight = speedInsights[turn.number] || {};

      (speedInsight.notes || []).forEach(function(note) {
        if (note.observationOnly) return;
        addIssue(issues, note.tag, note.severity || 'low', turn.number, note.message || note.whatHappened, note.confidence || 'medium', note.doInstead, note);
      });

      if (userSpeed.length) {
        speedTurns.push(turn.number);
        userSpeed.forEach(function(move) { if (move.pokemon) speedControlPieces[move.pokemon] = true; });
        if (!speedInsight.suppressSpeedNoPressure && !oppFaints.length && !turn.damage.some(function(d) { return d.side === opp && d.hp != null && d.hp < 75; })) {
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
        addIssue(issues, 'Field Control Failure', speedInsight.suppressFieldFailure ? 'low' : (turn.number === 1 ? 'high' : 'medium'), turn.number, speedInsight.suppressFieldFailure ? 'The opponent advanced field control, but your line also reversed or answered the speed state.' : 'The opponent advanced field control or setup without being punished.', speedInsight.suppressFieldFailure ? 'low' : 'medium', speedInsight.suppressFieldFailure ? 'Do not over-penalize this turn; check whether the reversal converted into pressure before the field window expired.' : 'When the opponent sets Trick Room, Tailwind, terrain, weather, or redirection, answer it immediately or use the turn to take a meaningful trade.', {
          id: 'field_control_failure',
          category: 'field_control',
          whatHappened: speedInsight.suppressFieldFailure ? 'The opponent advanced a field or speed state, but your response created a speed-state answer.' : 'The opponent gained setup, redirection, speed control, or field control and you did not take a knockout back.',
          whyMattered: speedInsight.suppressFieldFailure ? 'A field-control tag should not stay high confidence when the same turn or short window contains the answer.' : 'Field control changes what moves first, what survives, and which side gets to dictate defensive choices on the next turn.',
          doInstead: speedInsight.suppressFieldFailure ? 'Judge this as a speed-control contest: did your answer convert into material, preservation, or a forced defensive turn?' : 'Deny the field effect when possible; if denial is impossible, punish the setter or switch into a board that can stall or reverse the field state.',
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

    // A terminal loss records an outcome, not proof that a better legal line existed.

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
    var actionDenialCards = buildActionDenialCards(parsed, side);
    var abilityItemImpactCards = buildAbilityItemImpactCards(parsed, side);
    var megaTimingCards = buildMegaTimingCards(parsed, side);
    var damageContextCards = buildDamageContextCards(parsed, side);
    var scenarioQueue = buildReplayScenarioQueue(parsed, side, {
      issues: issues,
      actionDenialCards: actionDenialCards,
      abilityItemImpactCards: abilityItemImpactCards,
      megaTimingCards: megaTimingCards,
      damageContextCards: damageContextCards
    });
    var claimAudit = buildReplayClaimAudit(parsed, side, {
      issues: issues,
      actionDenialCards: actionDenialCards,
      abilityItemImpactCards: abilityItemImpactCards,
      megaTimingCards: megaTimingCards,
      damageContextCards: damageContextCards,
      scenarioQueue: scenarioQueue
    });

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
        benchedTwo: benchedTwo.slice(),
        selectedFourConfidence: bringConfidence,
        leadGrade: userLead.length && oppLead.length ? 'Reviewable' : 'Unknown',
        criticalTurn: criticalTurn,
        mainIssue: firstMistake ? firstMistake.tag : 'No major issue detected',
        mainPracticePoint: firstMistake ? firstMistake.recommendation : 'Upload more logs to build a reliable player pattern.',
        confidence: confidence
      },
      coachingTags: issues.slice(0, 12),
      actionDenialCards: actionDenialCards.slice(0, 12),
      abilityItemImpactCards: abilityItemImpactCards.slice(0, 12),
      megaTimingCards: megaTimingCards.slice(0, 12),
      damageContextCards: damageContextCards.slice(0, 12),
      scenarioQueue: scenarioQueue,
      claimAudit: claimAudit,
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
  ChampionsSim.replayCoach.normalizeReplayPokemonDetails = normalizeReplayPokemonDetails;
  ChampionsSim.replayCoach.resolveReplayMegaSpecies = resolveReplayMegaSpecies;
  ChampionsSim.replayCoach.normalizeReplayLogInput = normalizeReplayLogInput;
  ChampionsSim.replayCoach.parseManualReplayRoster = parseManualReplayRoster;
  ChampionsSim.replayCoach.replayUrlToLogUrl = replayUrlToLogUrl;
  ChampionsSim.replayCoach.fetchReplayLog = fetchReplayLog;
  ChampionsSim.replayCoach.buildReplayCoachReview = buildReplayCoachReview;
  ChampionsSim.replayCoach.buildReplayScenarioQueue = buildReplayScenarioQueue;
  ChampionsSim.replayCoach.buildReplayClaimAudit = buildReplayClaimAudit;
  ChampionsSim.replayCoach.analyzeShowdownReplay = analyzeShowdownReplay;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChampionsSim.replayCoach;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
