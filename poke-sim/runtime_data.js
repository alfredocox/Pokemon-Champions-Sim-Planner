(function(root) {
  'use strict';

  root.ChampionsSim = root.ChampionsSim || {};
  var ChampionsSim = root.ChampionsSim;

  ChampionsSim.overrides = ChampionsSim.overrides || {};
  ChampionsSim.overrides.damage = ChampionsSim.overrides.damage || {};
  ChampionsSim.overrides.damage.rollWindows = ChampionsSim.overrides.damage.rollWindows || {
    champions: { mode: 'discrete_percent', min: 86, max: 100 },
    default: { mode: 'continuous_percent', min: 85, max: 100 }
  };

  function toId(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function getAuditData() {
    return ChampionsSim.pokemonDataAudit || null;
  }

  function getMoveRow(move) {
    var data = getAuditData();
    var rows = data && data.moves ? data.moves : null;
    if (!rows) return null;
    return rows[toId(move)] || null;
  }

  function getSpeciesRow(species) {
    var data = getAuditData();
    var rows = data && data.species ? data.species : null;
    if (!rows) return null;
    if (rows[species]) return rows[species];
    var id = toId(species);
    var altId = (id === 'floetteeternalflower' || id === 'eternalflowerfloette') ? 'floetteeternal' : id;
    if (id === 'floetteeternalflowermega') altId = 'floettemega';
    for (var key in rows) {
      if (!Object.prototype.hasOwnProperty.call(rows, key)) continue;
      var row = rows[key];
      if (!row) continue;
      var rowId = row.id || '';
      var rowNameId = toId(row.speciesKey || row.displayName || key);
      if (rowId === id || rowId === altId || rowNameId === id || rowNameId === altId) return row;
    }
    return null;
  }

  function getSpeciesBase(species) {
    var row = getSpeciesRow(species);
    if (!row || !row.stats) return null;
    var base = {
      hp: Number(row.stats.hp),
      atk: Number(row.stats.atk),
      def: Number(row.stats.def),
      spa: Number(row.stats.spa),
      spd: Number(row.stats.spd),
      spe: Number(row.stats.spe),
      types: Array.isArray(row.types) ? row.types.slice() : []
    };
    if (!Number.isFinite(base.hp) || !Number.isFinite(base.atk) ||
        !Number.isFinite(base.def) || !Number.isFinite(base.spa) ||
        !Number.isFinite(base.spd) || !Number.isFinite(base.spe) ||
        !base.types.length) return null;
    return base;
  }

  function getMoveType(move) {
    var row = getMoveRow(move);
    if (row && row.type) return row.type;
    if (typeof MOVE_TYPES !== 'undefined' &&
        Object.prototype.hasOwnProperty.call(MOVE_TYPES, move)) return MOVE_TYPES[move];
    return 'Normal';
  }

  function getMoveCategory(move) {
    var row = getMoveRow(move);
    if (row && row.category) return String(row.category).toLowerCase();
    if (typeof MOVE_CATEGORY !== 'undefined' &&
        Object.prototype.hasOwnProperty.call(MOVE_CATEGORY, move)) return MOVE_CATEGORY[move];
    return '';
  }

  function getMoveBasePower(move) {
    var row = getMoveRow(move);
    var rowBasePower = row && row.base_power !== undefined ? row.base_power : (row && row.basePower);
    if (rowBasePower !== undefined && rowBasePower !== null && rowBasePower !== '') {
      var bp = Number(rowBasePower);
      if (Number.isFinite(bp)) return bp;
    }
    if (typeof MOVE_BP !== 'undefined' &&
        Object.prototype.hasOwnProperty.call(MOVE_BP, move)) return MOVE_BP[move];
    return undefined;
  }

  function getMoveAccuracy(move, localValue) {
    var row = getMoveRow(move);
    if (row && row.accuracy !== undefined && row.accuracy !== null && row.accuracy !== '') {
      if (row.accuracy === true || row.accuracy === 'true') return 1.0;
      var acc = Number(row.accuracy);
      if (Number.isFinite(acc)) return acc > 1 ? acc / 100 : acc;
    }
    if (localValue !== undefined && localValue !== null) return localValue;
    return 1.0;
  }

  function getMovePriority(move) {
    var row = getMoveRow(move);
    if (!row || row.priority === undefined || row.priority === null || row.priority === '') return 0;
    var priority = Number(row.priority);
    return Number.isFinite(priority) ? priority : 0;
  }

  var ENGINE_MOVE_TARGET_CATEGORIES = [
    'normal',
    'adjacent-foe',
    'all-adjacent',
    'all-adjacent-foes',
    'all-foes',
    'all-allies',
    'self',
    'random-foe'
  ];
  var ENGINE_MOVE_TARGET_CATEGORY_SET = new Set(ENGINE_MOVE_TARGET_CATEGORIES);

  // Showdown keeps target categories in upstream names; the engine consumes these
  // canonical internal buckets so generated data cannot bypass doubles targeting.
  var SHOWDOWN_TARGET_CATEGORY_MAP = {
    allAdjacent: 'all-adjacent',
    allAdjacentFoes: 'all-adjacent-foes',
    allAdjacentAlly: 'all-allies',
    allAllies: 'all-allies',
    adjacentAlly: 'all-allies',
    adjacentAllyOrSelf: 'all-allies',
    adjacentFoe: 'adjacent-foe',
    allies: 'all-allies',
    allySide: 'self',
    allyTeam: 'all-allies',
    foeSide: 'all-foes',
    randomNormal: 'random-foe',
    any: 'normal',
    all: 'all-adjacent',
    scripted: 'normal'
  };

  function normalizeMoveTargetCategory(raw) {
    var target = String(raw || '');
    return SHOWDOWN_TARGET_CATEGORY_MAP[target] || target || 'normal';
  }

  function isEngineMoveTargetCategory(raw) {
    return ENGINE_MOVE_TARGET_CATEGORY_SET.has(String(raw || ''));
  }

  function getMoveTargetCategory(move) {
    var row = getMoveRow(move);
    if (row && row.target) return normalizeMoveTargetCategory(row.target);
    if (typeof MOVE_TARGETS !== 'undefined' &&
        Object.prototype.hasOwnProperty.call(MOVE_TARGETS, move)) return normalizeMoveTargetCategory(MOVE_TARGETS[move]);
    return 'normal';
  }

  function moveHasFlag(move, flag) {
    var row = getMoveRow(move);
    if (!row || !row.flags) return false;
    if (typeof row.flags === 'object') return !!row.flags[flag];
    return String(row.flags).split('|').indexOf(flag) >= 0;
  }

  function normalizeFormatHint(formatHint) {
    if (!formatHint) return '';
    if (typeof formatHint === 'string') return formatHint.toLowerCase();
    if (typeof formatHint === 'object') {
      var parts = [
        formatHint.teamFormat,
        formatHint.statFormat,
        formatHint.format,
        formatHint.rulesetId,
        formatHint.label
      ].filter(Boolean);
      return parts.join(' ').toLowerCase();
    }
    return String(formatHint).toLowerCase();
  }

  function isChampionsFormat(formatHint) {
    return normalizeFormatHint(formatHint).indexOf('champions') >= 0;
  }

  function getDamageRollWindow(formatHint) {
    var windows = ChampionsSim.overrides.damage.rollWindows || {};
    if (isChampionsFormat(formatHint) && windows.champions) return windows.champions;
    return windows.default || { mode: 'continuous_percent', min: 85, max: 100 };
  }

  function sampleDamageRoll(formatHint, rngFn) {
    var rollWindow = getDamageRollWindow(formatHint);
    var rng = typeof rngFn === 'function' ? rngFn : Math.random;
    if (rollWindow.mode === 'discrete_percent') {
      var span = Number(rollWindow.max) - Number(rollWindow.min) + 1;
      var percent = Number(rollWindow.min) + Math.floor(rng() * span);
      return percent / 100;
    }
    var min = Number(rollWindow.min);
    var max = Number(rollWindow.max);
    return (min + rng() * (max - min)) / 100;
  }

  ChampionsSim.runtimeData = ChampionsSim.runtimeData || {};
  ChampionsSim.runtimeData.toId = toId;
  ChampionsSim.runtimeData.getAuditData = getAuditData;
  ChampionsSim.runtimeData.getMoveRow = getMoveRow;
  ChampionsSim.runtimeData.getSpeciesRow = getSpeciesRow;
  ChampionsSim.runtimeData.getSpeciesBase = getSpeciesBase;
  ChampionsSim.runtimeData.getMoveType = getMoveType;
  ChampionsSim.runtimeData.getMoveCategory = getMoveCategory;
  ChampionsSim.runtimeData.getMoveBasePower = getMoveBasePower;
  ChampionsSim.runtimeData.getMoveAccuracy = getMoveAccuracy;
  ChampionsSim.runtimeData.getMovePriority = getMovePriority;
  ChampionsSim.runtimeData.getMoveTargetCategory = getMoveTargetCategory;
  ChampionsSim.runtimeData.normalizeMoveTargetCategory = normalizeMoveTargetCategory;
  ChampionsSim.runtimeData.isEngineMoveTargetCategory = isEngineMoveTargetCategory;
  ChampionsSim.runtimeData.ENGINE_MOVE_TARGET_CATEGORIES = ENGINE_MOVE_TARGET_CATEGORIES;
  ChampionsSim.runtimeData.SHOWDOWN_TARGET_CATEGORY_MAP = SHOWDOWN_TARGET_CATEGORY_MAP;
  ChampionsSim.runtimeData.moveHasFlag = moveHasFlag;
  ChampionsSim.runtimeData.isChampionsFormat = isChampionsFormat;
  ChampionsSim.runtimeData.getDamageRollWindow = getDamageRollWindow;
  ChampionsSim.runtimeData.sampleDamageRoll = sampleDamageRoll;

  if (typeof module !== 'undefined' && module.exports) module.exports = ChampionsSim.runtimeData;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
