// Species/form-specific learnset legality helper.
// Uses generated Pokemon Showdown audit data when available.

(function(root) {
  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.moveLegality = ChampionsSim.moveLegality || {};

  var data = ChampionsSim.pokemonDataAudit;
  if (!data && typeof require === 'function') {
    try { data = require('./generated/pokemon_showdown_legal_data.js'); } catch (_e) { data = null; }
  }
  var championsPools = ChampionsSim.championsMovePools;
  if (!championsPools && typeof require === 'function') {
    try { championsPools = require('./generated/champions_move_pools.js'); } catch (_e) { championsPools = null; }
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function toId(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function buildSpeciesIndex() {
    var index = Object.create(null);
    if (!data || !data.species) return index;
    Object.keys(data.species).forEach(function(key) {
      var row = data.species[key] || {};
      index[toId(key)] = key;
      index[toId(row.displayName || key)] = key;
      index[toId(row.speciesKey || key)] = key;
      if (row.forme) index[toId((row.baseSpecies || key) + '-' + row.forme)] = key;
    });
    Object.keys(data.species).forEach(function(key) {
      if (/-Hisui$/i.test(key)) {
        var base = key.replace(/-Hisui$/i, '');
        index[toId('Hisuian ' + base)] = key;
        index[toId(base + ' Hisui')] = key;
      }
    });
    if (data.species['Floette-Eternal']) {
      index[toId('Floette (Eternal Flower)')] = 'Floette-Eternal';
      index[toId('Eternal Flower Floette')] = 'Floette-Eternal';
    }
    return index;
  }

  function buildMoveIndex() {
    var index = Object.create(null);
    if (!data || !data.moves) return index;
    Object.keys(data.moves).forEach(function(id) {
      var row = data.moves[id] || {};
      index[toId(id)] = id;
      index[toId(row.move_name || id)] = id;
    });
    return index;
  }

  var speciesIndex = buildSpeciesIndex();
  var moveIndex = buildMoveIndex();

  // These are learnset supplements, not species aliases. Stats, typing,
  // sprite, Mega state, and display identity remain the exact form row.
  var FORM_LEARNSET_SUPPLEMENTS = {
    'Indeedee-M': ['Indeedee'],
    'Meowstic-M': ['Meowstic'],
    'Rotom-Fan': ['Rotom'],
    'Rotom-Frost': ['Rotom'],
    'Rotom-Heat': ['Rotom'],
    'Rotom-Mow': ['Rotom'],
    'Rotom-Wash': ['Rotom']
  };

  // Champion preview forms that exist in app data before the generated
  // Showdown snapshot has an exact species key. Keep the app form identity
  // and only borrow the explicit learnset rows listed here.
  var CHAMPIONS_VIRTUAL_FORM_LEARNSETS = {
    'Floette (Eternal Flower)-Mega': {
      aliases: [
        'Floette (Eternal Flower)-Mega',
        'Floette-Eternal-Mega',
        'Floette-Mega-EF',
        'Floette-Mega Eternal Flower'
      ],
      learnsetKeys: ['Floette-Eternal', 'Floette'],
      notes: 'Champion-specific Mega Eternal Flower app identity uses the generated Floette-Mega stat row and Eternal Flower/Floette learnset rows until the generated source has an exact Eternal-Mega form key.'
    }
  };

  Object.keys(CHAMPIONS_VIRTUAL_FORM_LEARNSETS).forEach(function(key) {
    var rule = CHAMPIONS_VIRTUAL_FORM_LEARNSETS[key] || {};
    speciesIndex[toId(key)] = key;
    (rule.aliases || []).forEach(function(alias) {
      speciesIndex[toId(alias)] = key;
    });
  });

  Object.keys(FORM_LEARNSET_SUPPLEMENTS).forEach(function(key) {
    if (!data || !data.species || data.species[key]) return;
    speciesIndex[toId(key)] = key;
  });

  // These labels name the default male identities, not shared female pools.
  var EXACT_MALE_IDENTITIES = { 'Indeedee-M': 'Indeedee', 'Meowstic-M': 'Meowstic' };

  function canonicalSpeciesKey(speciesKey) {
    var raw = clean(speciesKey);
    if (!raw) return '';
    var id = toId(raw);
    if (speciesIndex[id]) return speciesIndex[id];
    var hisui = raw.match(/^Hisuian\s+(.+)$/i);
    if (hisui) {
      var converted = clean(hisui[1]) + '-Hisui';
      if (speciesIndex[toId(converted)]) return speciesIndex[toId(converted)];
    }
    var suffix = raw.match(/^(.+)\s+Hisui$/i);
    if (suffix) {
      var convertedSuffix = clean(suffix[1]) + '-Hisui';
      if (speciesIndex[toId(convertedSuffix)]) return speciesIndex[toId(convertedSuffix)];
    }
    return '';
  }

  function canonicalMoveId(moveName) {
    var id = toId(moveName);
    return moveIndex[id] || id;
  }

  function learnsetSpeciesKey(speciesKey) {
    var canonical = canonicalSpeciesKey(speciesKey);
    if (!canonical || !data || !data.species) return '';
    if (CHAMPIONS_VIRTUAL_FORM_LEARNSETS[canonical]) return canonical;
    var row = data.species[canonical];
    if (!row) return '';
    if (row.moves && Object.keys(row.moves).length) return canonical;
    if (/-Mega(?:-[XY])?$/i.test(canonical) && row.baseSpecies) {
      var base = canonicalSpeciesKey(row.baseSpecies);
      if (base && data.species[base] && data.species[base].moves) return base;
    }
    return canonical;
  }

  function candidateLearnsetKeys(species) {
    var out = [];
    if (!species) return out;
    var virtualRule = CHAMPIONS_VIRTUAL_FORM_LEARNSETS[species];
    if (virtualRule) {
      (virtualRule.learnsetKeys || []).forEach(function(key) {
        if (data && data.species && data.species[key]) out.push(key);
      });
      return out;
    }
    var exact = learnsetSpeciesKey(species);
    if (exact && data && data.species && data.species[exact]) out.push(exact);
    (FORM_LEARNSET_SUPPLEMENTS[species] || []).forEach(function(key) {
      if (data && data.species && data.species[key] && out.indexOf(key) === -1) out.push(key);
    });
    return out;
  }

  function moveDisplayName(moveId, fallback) {
    var row = data && data.moves ? data.moves[moveId] : null;
    return row && row.move_name ? row.move_name : clean(fallback || moveId);
  }

  function unchecked(speciesKey, moveName, reason, notes) {
    return {
      legal: false,
      speciesKey: clean(speciesKey),
      canonicalSpeciesKey: '',
      moveName: clean(moveName),
      canonicalMoveName: clean(moveName),
      source: data && data.source ? data.source : 'unavailable',
      sourceVersion: data && data.sourceCommitOrVersion ? data.sourceCommitOrVersion : 'unavailable',
      reason: reason,
      notes: notes || 'unchecked'
    };
  }

  function historicalMoveVerdict(speciesKey, moveName, opts) {
    opts = opts || {};
    if (!data || !data.species || !data.moves) {
      return unchecked(speciesKey, moveName, 'source_unavailable', 'Generated Pokemon Showdown legality data is not loaded.');
    }
    var species = canonicalSpeciesKey(speciesKey);
    if (!species) return unchecked(speciesKey, moveName, 'unknown_species', 'Species/form was not found in generated source data.');
    var moveId = canonicalMoveId(moveName);
    if (!moveId || !data.moves[moveId]) {
      return {
        legal: false,
        speciesKey: clean(speciesKey),
        canonicalSpeciesKey: species,
        moveName: clean(moveName),
        canonicalMoveName: clean(moveName),
        source: data.source,
        sourceVersion: data.sourceCommitOrVersion,
        reason: 'unknown_move',
        notes: 'Move was not found in Pokemon Showdown moves data.'
      };
    }
    var learnKeys = candidateLearnsetKeys(species);
    var learnKey = '';
    var row = null;
    var codes = '';
    for (var i = 0; i < learnKeys.length; i++) {
      var key = learnKeys[i];
      var candidateRow = data.species[key];
      var candidateCodes = candidateRow && candidateRow.moves ? candidateRow.moves[moveId] : '';
      if (candidateCodes) {
        learnKey = key;
        row = candidateRow;
        codes = candidateCodes;
        break;
      }
      if (!row) {
        learnKey = key;
        row = candidateRow;
      }
    }
    var legal = !!codes;
    var inherited = (row && row.inheritedFrom) || (learnKey && learnKey !== species ? learnKey : '');
    var virtualNotes = CHAMPIONS_VIRTUAL_FORM_LEARNSETS[species] ? CHAMPIONS_VIRTUAL_FORM_LEARNSETS[species].notes : '';
    var supplementNotes = FORM_LEARNSET_SUPPLEMENTS[species] && inherited
      ? ' Form identity remains ' + species + '; move is accepted through an explicit shared learnset supplement.'
      : '';
    return {
      legal: legal,
      speciesKey: clean(speciesKey),
      canonicalSpeciesKey: species,
      moveName: clean(moveName),
      canonicalMoveName: moveDisplayName(moveId, moveName),
      source: data.source,
      sourceVersion: data.sourceCommitOrVersion,
      reason: legal ? 'learnset_match' : 'not_in_species_form_learnset',
      notes: legal
        ? ((inherited ? 'Legal via ' + inherited + ' learnset.' : 'Legal for exact species/form learnset.') + supplementNotes + (virtualNotes ? ' ' + virtualNotes : ''))
        : 'Move exists globally but is not present in this species/form learnset.',
      learnMethodCodes: codes,
      inheritedFrom: inherited
    };
  }

  function resolveLearnsetPool(speciesKey, opts) {
    var context = opts && opts.learnsetContext;
    var species = canonicalSpeciesKey(speciesKey);
    var result = {
      status: 'unchecked', moves: [], source: 'unavailable', context: context || null,
      referenceSpeciesId: species ? toId(species) : '', canonicalSpeciesKey: species,
      reason: 'learnset_context_unavailable'
    };
    if (context !== 'champions' && context !== 'historical') return result;
    if (context === 'champions') {
      result.reason = 'champions_pool_unavailable';
      var sourceRow = data && data.species && data.species[species];
      var maleKey = EXACT_MALE_IDENTITIES[species];
      if (!sourceRow && maleKey && data && data.species && data.species[maleKey] && data.species[maleKey].gender === 'M') {
        species = maleKey;
        sourceRow = data.species[species];
        result.canonicalSpeciesKey = species;
      }
      // A conflicting or virtual identity must not select a different pinned pool.
      if (!sourceRow || typeof sourceRow.id !== 'string' || !/^[a-z0-9]+$/.test(sourceRow.id) ||
          sourceRow.id !== toId(species)) return result;
      result.referenceSpeciesId = sourceRow.id;
      if (!championsPools || championsPools.schema_version !== 'champions-inherited-move-pools-v1' ||
          championsPools.mod !== 'champions' || !championsPools.reference || championsPools.reference.version !== '0.11.11' ||
          !species || !championsPools.species || !Object.prototype.hasOwnProperty.call(championsPools.species, result.referenceSpeciesId)) return result;
      var pool = championsPools.species[result.referenceSpeciesId];
      if (!pool || pool.reference_species_id !== sourceRow.id || pool.status !== 'known' || !Array.isArray(pool.moves) ||
          !pool.moves.every(function(id) { return typeof id === 'string' && /^[a-z0-9]+$/.test(id); }) ||
          !Array.isArray(pool.inherited_from) || !pool.inherited_from.every(function(id) { return typeof id === 'string' && /^[a-z0-9]+$/.test(id); })) return result;
      result.moves = Array.from(new Set(pool.moves));
      result.source = 'champions-inherited-move-pools-v1';
      result.sourceVersion = championsPools.reference.version;
      result.inheritedFrom = pool.inherited_from.slice();
    } else {
      result.reason = !data || !data.species || !data.moves ? 'source_unavailable' : 'unknown_species';
      if (!data || !data.species || !data.moves || !species) return result;
      var seen = Object.create(null);
      candidateLearnsetKeys(species).forEach(function(key) {
        Object.keys(data.species[key].moves || {}).forEach(function(id) { seen[id] = true; });
      });
      result.moves = Object.keys(seen);
      result.source = data.source;
      result.sourceVersion = data.sourceCommitOrVersion;
    }
    result.status = 'known';
    result.reason = 'pool_available';
    return result;
  }

  function isMoveLegalForSpecies(speciesKey, moveName, opts) {
    var pool = resolveLearnsetPool(speciesKey, opts);
    if (pool.status !== 'known') {
      return Object.assign(unchecked(speciesKey, moveName, pool.reason, 'No verified pool for the requested learnset context.'), {
        verification_status: 'unchecked', source: pool.source, sourceVersion: pool.sourceVersion || 'unavailable', learnsetContext: pool.context,
        canonicalSpeciesKey: pool.canonicalSpeciesKey, referenceSpeciesId: pool.referenceSpeciesId
      });
    }
    if (pool.context === 'historical') {
      var historical = historicalMoveVerdict(speciesKey, moveName, opts);
      historical.learnsetContext = 'historical';
      historical.verification_status = historical.reason === 'unknown_move' ? 'unchecked' : 'known';
      historical.notes = 'Historical learnset evidence only; not current SV or Champions approval. ' + historical.notes;
      return historical;
    }
    var id = canonicalMoveId(moveName);
    var legal = pool.moves.indexOf(id) !== -1;
    return {
      legal: legal, speciesKey: clean(speciesKey), canonicalSpeciesKey: pool.canonicalSpeciesKey,
      moveName: clean(moveName), canonicalMoveName: moveDisplayName(id, moveName),
      source: pool.source, sourceVersion: pool.sourceVersion, learnsetContext: pool.context,
      referenceSpeciesId: pool.referenceSpeciesId, verification_status: 'known',
      reason: legal ? 'learnset_match' : 'not_in_species_form_learnset',
      notes: 'Pinned Champions inherited move pool only; not full-set or regulation approval.',
      inheritedFrom: pool.inheritedFrom.slice()
    };
  }

  function validateMovesForSet(member, opts) {
    member = member || {};
    return (member.moves || []).filter(Boolean).map(function(move) {
      return isMoveLegalForSpecies(member.name || member.species || '', move, opts || {});
    });
  }

  function isAbilityLegalForSpecies(speciesKey, abilityName) {
    var requested = clean(abilityName);
    if (!data || !data.species || !data.abilities) {
      return unchecked(speciesKey, requested, 'source_unavailable', 'Generated Pokemon Showdown ability data is not loaded.');
    }
    var species = canonicalSpeciesKey(speciesKey);
    if (!species) return unchecked(speciesKey, requested, 'unknown_species', 'Species/form was not found in generated source data.');
    var abilityId = toId(requested);
    if (!abilityId || !data.abilities[abilityId]) {
      return {
        legal: false,
        speciesKey: clean(speciesKey),
        canonicalSpeciesKey: species,
        abilityName: requested,
        source: data.source,
        sourceVersion: data.sourceCommitOrVersion,
        reason: 'unknown_ability',
        notes: 'Ability was not found in Pokemon Showdown ability data.'
      };
    }
    var row = data.species[species] || {};
    var allowed = Object.keys(row.abilities || {}).map(function(slot) { return clean(row.abilities[slot]); }).filter(Boolean);
    var legal = allowed.some(function(name) { return toId(name) === abilityId; });
    return {
      legal: legal,
      speciesKey: clean(speciesKey),
      canonicalSpeciesKey: species,
      abilityName: requested,
      canonicalAbilityName: data.abilities[abilityId].name || requested,
      legalAbilities: allowed,
      source: data.source,
      sourceVersion: data.sourceCommitOrVersion,
      reason: legal ? 'species_form_ability_match' : 'not_in_species_form_abilities',
      notes: legal
        ? 'Ability matches the exact species/form source row.'
        : 'Ability exists globally but is not assigned to this species/form.'
    };
  }

  function validateAbilityForSet(member) {
    member = member || {};
    if (!clean(member.ability)) return null;
    return isAbilityLegalForSpecies(member.name || member.species || '', member.ability);
  }

  function legalMoveDisplayNamesForSpecies(speciesKey, opts) {
    var pool = resolveLearnsetPool(speciesKey, opts);
    if (pool.status !== 'known') return [];
    var out = pool.moves.map(function(id) { return moveDisplayName(id, id); });
    return out.sort(function(a, b) { return a.localeCompare(b); });
  }

  ChampionsSim.moveLegality.isMoveLegalForSpecies = isMoveLegalForSpecies;
  ChampionsSim.moveLegality.validateMovesForSet = validateMovesForSet;
  ChampionsSim.moveLegality.isAbilityLegalForSpecies = isAbilityLegalForSpecies;
  ChampionsSim.moveLegality.validateAbilityForSet = validateAbilityForSet;
  ChampionsSim.moveLegality.legalMoveDisplayNamesForSpecies = legalMoveDisplayNamesForSpecies;
  ChampionsSim.moveLegality.canonicalSpeciesKey = canonicalSpeciesKey;
  ChampionsSim.moveLegality.canonicalMoveId = canonicalMoveId;
  ChampionsSim.moveLegality.resolveLearnsetPool = resolveLearnsetPool;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChampionsSim.moveLegality;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
