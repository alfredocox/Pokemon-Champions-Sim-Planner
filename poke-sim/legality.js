// legality.js - Pokemon Champions Reg M-A historical legality checks with Reg M-B source-review guard (Issue #T4)
// Loaded before engine.js. Exposes globals:
//   CHAMPIONS_BANNED_POKEMON  - ban list (Legendary/Mythical/Restricted/Paradox/sub-legends)
//   FAKEMON_BLOCKLIST         - known fabricated/non-existent forms
//   validateChampionsLegality(team) -> { violations: [{severity, code, message}] }
//
// Sources:
//   https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
//   https://victoryroad.pro/champions-regulations/

var CHAMPIONS_BANNED_POKEMON = new Set([
  // Paradox (Past)
  'Great Tusk','Scream Tail','Brute Bonnet','Flutter Mane','Slither Wing',
  'Sandy Shocks','Roaring Moon','Walking Wake','Gouging Fire','Raging Bolt',
  // Paradox (Future)
  'Iron Treads','Iron Bundle','Iron Hands','Iron Jugulis','Iron Moth',
  'Iron Thorns','Iron Valiant','Iron Leaves','Iron Boulder','Iron Crown',
  // Mythical
  'Mew','Celebi','Jirachi','Deoxys','Phione','Manaphy','Darkrai','Shaymin',
  'Arceus','Victini','Keldeo','Meloetta','Genesect','Diancie','Hoopa',
  'Volcanion','Magearna','Marshadow','Zeraora','Meltan','Melmetal','Zarude',
  // Restricted / Box Legendaries
  'Mewtwo','Lugia','Ho-Oh','Kyogre','Groudon','Rayquaza','Dialga','Palkia',
  'Giratina','Reshiram','Zekrom','Kyurem','Xerneas','Yveltal','Zygarde',
  'Cosmog','Cosmoem','Solgaleo','Lunala','Necrozma','Zacian','Zamazenta',
  'Eternatus','Calyrex','Koraidon','Miraidon','Terapagos',
  // Sub-Legendary (non-Paradox)
  'Articuno','Zapdos','Moltres','Raikou','Entei','Suicune','Regirock','Regice',
  'Registeel','Latias','Latios','Uxie','Mesprit','Azelf','Heatran','Regigigas',
  'Cresselia','Cobalion','Terrakion','Virizion','Tornadus','Thundurus','Landorus',
  'Tapu Koko','Tapu Lele','Tapu Bulu','Tapu Fini','Nihilego','Buzzwole','Pheromosa',
  'Xurkitree','Celesteela','Kartana','Guzzlord','Poipole','Naganadel','Stakataka',
  'Blacephalon','Kubfu','Urshifu','Regieleki','Regidrago','Glastrier','Spectrier',
  'Enamorus','Wo-Chien','Chien-Pao','Ting-Lu','Chi-Yu','Ogerpon','Okidogi',
  'Munkidori','Fezandipiti','Pecharunt'
]);

// Reserved for actually-fabricated forms. Previously contained
// Dragonite-Mega / Drampa-Mega / Meganium-Mega / Froslass-Mega,
// which are REAL new Champions-introduced Mega Evolutions
// (Dragoninite, Drampanite, Meganiumite, Froslassite — all Shop: 2000 VP).
// Retracted in T9a after source verification:
//   - Game8 Items List: https://game8.co/games/Pokemon-Champions/archives/588871
//   - Victory Road Reg M-A: https://victoryroad.pro/champions-regulations/
var FAKEMON_BLOCKLIST = new Set([
  // empty; add only truly fabricated forms here
]);

// Source-reviewed Reg M-B deltas that are NOT runtime-promoted yet.
// Victory Road states Reg M-B adds 16 new Mega Evolutions over Reg M-A.
// Keep this as audit evidence until each base species, Mega form, stone/item,
// stats, ability, move data, and fixtures are promoted together.
var CHAMPIONS_REGMB_REVIEW_NEW_MEGAS = [
  'Raichu-Mega-X',
  'Raichu-Mega-Y',
  'Sceptile-Mega',
  'Blaziken-Mega',
  'Swampert-Mega',
  'Mawile-Mega',
  'Metagross-Mega',
  'Staraptor-Mega',
  'Scolipede-Mega',
  'Scrafty-Mega',
  'Eelektross-Mega',
  'Pyroar-Mega',
  'Malamar-Mega',
  'Barbaracle-Mega',
  'Dragalge-Mega',
  'Falinks-Mega'
];

// Items verified in the Champions launch item pool. Implemented Champions teams may carry
// only this pool until a newer source confirms additions. Item effects still
// come from Showdown/generated runtime data; this list is only the Champions
// availability gate. Source:
//   https://game8.co/games/Pokemon-Champions/archives/588871
//   Game8 line 715: "The items listed above are the only ones available..."
var CHAMPIONS_LEGAL_ITEMS = new Set([
  // Defensive berries
  'Roseli Berry','Chilan Berry','Babiri Berry','Haban Berry','Charti Berry',
  'Tanga Berry','Payapa Berry','Kebia Berry','Chople Berry','Rindo Berry',
  'Occa Berry','Wacan Berry','Colbur Berry','Kasib Berry','Coba Berry',
  'Shuca Berry','Yache Berry','Passho Berry',
  // Mega Stones
  'Manectite','Houndoominite','Audinite','Lopunnite','Sablenite',
  'Sharpedonite','Gyaradosite','Lucarionite','Heracronite','Aerodactylite',
  'Glalitite','Pinsirite','Gardevoirite','Galladite','Skarmorite',
  'Clefablite','Alakazite','Drampanite','Excadrite','Chandelurite',
  'Aggronite','Gengarite','Medichamite','Abomasite','Scizorite',
  'Garchompite','Steelixite','Kangaskhanite','Charizardite X',
  'Charizardite Y','Blastoisinite','Meganiumite','Feraligite','Emboarite',
  'Beedrillite','Ampharosite','Victreebelite','Banettite','Cameruptite',
  'Absolite','Slowbronite','Hawluchanite','Altarianite','Dragoninite',
  'Froslassite','Pidgeotite','Starminite','Tyranitarite','Venusaurite',
  'Floettite','Greninjite','Delphoxite','Chesnaughtite','Chimechite',
  'Crabominite','Glimmoranite','Golurkite','Meowsticite','Scovillainite',
  // Other / power / recovery / stat items
  "King's Rock",'Bright Powder','Scope Lens','Quick Claw','Light Ball',
  'Spell Tag','Metal Coat','Soft Sand','Sharp Beak','Silk Scarf','Magnet',
  'Black Belt','Black Glasses','Silver Powder','Miracle Seed','Hard Stone',
  'Mystic Water','Poison Barb','Never-Melt Ice','Twisted Spoon','Charcoal',
  'Dragon Fang','Fairy Feather','Sitrus Berry','Lum Berry','Persim Berry',
  'Oran Berry','Leppa Berry','Aspear Berry','Rawst Berry','Pecha Berry',
  'Chesto Berry','Cheri Berry','Focus Band','Mental Herb','Leftovers',
  'Shell Bell','White Herb','Choice Scarf','Focus Sash'
]);

// Items confirmed ABSENT from Champions launch item pool. Kept separately so
// violation messages can distinguish known absent SV carryovers from unknown
// unreviewed names.
// Sources:
//   https://game8.co/games/Pokemon-Champions/archives/588871
//   https://games.gg/news/pokemon-champions-items-list-meta/
//   https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained
var CHAMPIONS_BANNED_ITEMS = new Set([
  'Life Orb','Choice Band','Choice Specs','Assault Vest','Rocky Helmet',
  'Heavy-Duty Boots','Black Sludge','Eviolite','Light Clay',
  'Heat Rock','Damp Rock','Smooth Rock','Icy Rock','Terrain Extender',
  'Toxic Orb','Flame Orb','Safety Goggles','Covert Cloak','Clear Amulet',
  'Booster Energy','Loaded Dice'
]);

// Battle mechanics that must not appear in the current active Champions
// Reg M-A lane unless a reviewed ruleset source explicitly enables them.
var CHAMPIONS_BANNED_MECHANIC_MOVES = new Set([
  'Tera Blast'
]);

var CHAMPIONS_BANNED_MECHANIC_ABILITIES = new Set([
  'Protosynthesis',
  'Quark Drive'
]);

// Mega Stone -> required base species. Built from CHAMPIONS_MEGAS at load.
// Enables "wrong species holding stone" validation.
var CHAMPIONS_STONE_TO_SPECIES = {};
(function buildStoneIndex(){
  if (typeof CHAMPIONS_MEGAS === 'undefined') return;
  for (var k in CHAMPIONS_MEGAS) {
    var m = CHAMPIONS_MEGAS[k];
    if (m && m.megaStone) CHAMPIONS_STONE_TO_SPECIES[m.megaStone] = m.baseSpecies;
  }
})();

// HOME-transfer-only Megas. Legal in Reg M-A but not obtainable in
// Champions alone. Warn, do not block.
var CHAMPIONS_HOME_TRANSFER_MEGAS = new Set([
  'Chesnaught-Mega','Delphox-Mega','Greninja-Mega',
  'Floette-Mega','Floette-Mega-EF','Floette (Eternal Flower)-Mega'
]);

// Strip form suffixes to compare against base-species ban list.
// Keeps regional forms (Alola/Galar/Hisui/Paldea) legal where the base is legal,
// but banned sub-legendary forms (e.g. Urshifu-Rapid-Strike) still match their base.
function _stripForm(name) {
  return String(name || '').replace(
    /-(Mega(?:-[XY])?|Alola|Galar|Hisui|Paldea(?:-[A-Za-z]+)?|Therian|Incarnate|White|Black|Origin|Crowned|Ice|Shadow|Dusk-Mane|Dawn-Wings|Ultra|Rapid-Strike|Single-Strike|Ice-Rider|Shadow-Rider|Wellspring|Hearthflame|Cornerstone|Teal)$/i,
    ''
  );
}

function validateChampionsLegality(team) {
  var violations = [];
  if (!team || !Array.isArray(team.members)) return { violations: violations };
  if (typeof FAKEMON_BLOCKLIST === 'undefined'
      || typeof CHAMPIONS_BANNED_POKEMON === 'undefined'
      || typeof CHAMPIONS_LEGAL_ITEMS === 'undefined'
      || typeof CHAMPIONS_BANNED_ITEMS === 'undefined'
      || typeof CHAMPIONS_STONE_TO_SPECIES === 'undefined'
      || typeof CHAMPIONS_HOME_TRANSFER_MEGAS === 'undefined') {
    return { violations: violations };
  }

  for (var i = 0; i < team.members.length; i++) {
    var mon = team.members[i];
    var name = mon && mon.name ? String(mon.name) : '';

    if (FAKEMON_BLOCKLIST.has(name)) {
      violations.push({
        severity: 'error',
        code: 'FAKEMON',
        message: name + ': not a real Pokemon form (fakemon blocked)'
      });
      continue;
    }

    var base = _stripForm(name);
    if (CHAMPIONS_BANNED_POKEMON.has(name) || CHAMPIONS_BANNED_POKEMON.has(base)) {
      violations.push({
        severity: 'error',
        code: 'BANNED',
        message: name + ': banned in the implemented Champions ruleset lane (Legendary/Mythical/Restricted/Paradox)'
      });
    }

    // Item legality checks
    var item = mon && mon.item ? mon.item : '';
    if (item && !CHAMPIONS_LEGAL_ITEMS.has(item)) {
      var knownAbsent = CHAMPIONS_BANNED_ITEMS.has(item);
      violations.push({
        severity: 'error',
        code: knownAbsent ? 'ITEM_ABSENT' : 'ITEM_NOT_IN_CHAMPIONS_POOL',
        message: name + ': item "' + item + '" is not in verified implemented Champions item pool'
      });
    }

    var tera = mon && (mon.tera || mon.teraType || mon.tera_type);
    if (tera) {
      violations.push({
        severity: 'error',
        code: 'TERA_NOT_CHAMPIONS_LEGAL',
        message: name + ': Tera type "' + tera + '" is not legal in current implemented Champions teams'
      });
    }

    var ability = mon && mon.ability ? mon.ability : '';
    if (ability && CHAMPIONS_BANNED_MECHANIC_ABILITIES.has(ability)) {
      violations.push({
        severity: 'error',
        code: 'ABILITY_NOT_CHAMPIONS_LEGAL',
        message: name + ': ability "' + ability + '" belongs to an unapproved mechanic for current Champions Reg M-A'
      });
    }

    var moves = mon && Array.isArray(mon.moves) ? mon.moves : [];
    for (var mv = 0; mv < moves.length; mv++) {
      if (CHAMPIONS_BANNED_MECHANIC_MOVES.has(moves[mv])) {
        violations.push({
          severity: 'error',
          code: 'MOVE_NOT_CHAMPIONS_LEGAL',
          message: name + ': move "' + moves[mv] + '" belongs to an unapproved mechanic for current Champions Reg M-A'
        });
      }
    }

    // Mega stone must match holder species
    if (item && CHAMPIONS_STONE_TO_SPECIES[item]) {
      var required = CHAMPIONS_STONE_TO_SPECIES[item];
      if (base !== required) {
        violations.push({
          severity: 'error',
          code: 'MEGA_STONE_MISMATCH',
          message: name + ': cannot hold ' + item + ' (only ' + required + ' can)'
        });
      }
    }

    // HOME-transfer-only Megas: warn
    if (CHAMPIONS_HOME_TRANSFER_MEGAS.has(name)) {
      violations.push({
        severity: 'warn',
        code: 'HOME_TRANSFER',
        message: name + ': legal in Reg M-A but requires HOME transfer to obtain'
      });
    }
  }
  return { violations: violations };
}

function validateTeamForRuleset(team, rulesetId) {
  var ruleset = typeof getChampionsRuleset === 'function' ? getChampionsRuleset(rulesetId) : null;
  var violations = [];
  if (ruleset && !ruleset.runtimePromotable) {
    violations.push({
      severity: 'error',
      code: 'RULESET_NOT_RUNTIME_PROMOTED',
      message: ruleset.label + ': source-review ruleset is blocked from legal sim until source conversion, fixtures, and runtime promotion are complete',
      ruleset_id: ruleset.id,
      ruleset_status: ruleset.status,
      data_policy: ruleset.dataPolicy || 'do_not_write_trusted_stats',
      coaching_policy: ruleset.coachingPolicy || 'review_only_no_matchup_learning',
      blocker: ruleset.blocker || null
    });
    return {
      ruleset_id: ruleset.id,
      ruleset_status: ruleset.status,
      allowed: false,
      learning_eligible: false,
      poisoning_guard: 'review_only_do_not_train_or_rank',
      violations: violations
    };
  }
  var base = validateChampionsLegality(team);
  var hardErrors = (base.violations || []).filter(function(v){ return v && v.severity === 'error'; });
  return {
    ruleset_id: ruleset && ruleset.id || 'champions_reg_m_a_2026',
    ruleset_status: ruleset && ruleset.status || 'historical',
    allowed: hardErrors.length === 0,
    learning_eligible: hardErrors.length === 0,
    poisoning_guard: hardErrors.length === 0 ? 'trusted_stats_allowed' : 'illegal_team_do_not_train_or_rank',
    violations: base.violations || []
  };
}

// CommonJS export for Node tests; harmless in browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAMPIONS_BANNED_POKEMON: CHAMPIONS_BANNED_POKEMON,
    FAKEMON_BLOCKLIST: FAKEMON_BLOCKLIST,
    CHAMPIONS_REGMB_REVIEW_NEW_MEGAS: CHAMPIONS_REGMB_REVIEW_NEW_MEGAS,
    CHAMPIONS_LEGAL_ITEMS: CHAMPIONS_LEGAL_ITEMS,
    CHAMPIONS_BANNED_ITEMS: CHAMPIONS_BANNED_ITEMS,
    CHAMPIONS_BANNED_MECHANIC_MOVES: CHAMPIONS_BANNED_MECHANIC_MOVES,
    CHAMPIONS_BANNED_MECHANIC_ABILITIES: CHAMPIONS_BANNED_MECHANIC_ABILITIES,
    CHAMPIONS_STONE_TO_SPECIES: CHAMPIONS_STONE_TO_SPECIES,
    CHAMPIONS_HOME_TRANSFER_MEGAS: CHAMPIONS_HOME_TRANSFER_MEGAS,
    validateChampionsLegality: validateChampionsLegality,
    validateTeamForRuleset: validateTeamForRuleset
  };
}
