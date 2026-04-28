// legality.js - Pokemon Champions Reg M-A legality checks (Issue #T4)
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

var FAKEMON_BLOCKLIST = new Set([]);

var CHAMPIONS_BANNED_ITEMS = new Set([
  'Life Orb','Choice Band','Choice Specs','Assault Vest','Rocky Helmet',
  'Heavy-Duty Boots','Black Sludge','Eviolite','Light Clay',
  'Heat Rock','Damp Rock','Smooth Rock','Icy Rock','Terrain Extender',
  'Toxic Orb','Flame Orb'
]);

var CHAMPIONS_STONE_TO_SPECIES = {};
(function buildStoneIndex(){
  if (typeof CHAMPIONS_MEGAS === 'undefined') return;
  for (var k in CHAMPIONS_MEGAS) {
    var m = CHAMPIONS_MEGAS[k];
    if (m && m.megaStone) CHAMPIONS_STONE_TO_SPECIES[m.megaStone] = m.baseSpecies;
  }
})();

var CHAMPIONS_HOME_TRANSFER_MEGAS = new Set([
  'Chesnaught-Mega','Delphox-Mega','Greninja-Mega',
  'Floette-Mega','Floette-Mega-EF','Floette (Eternal Flower)-Mega'
]);

function _stripForm(name) {
  return name.replace(
    /-(Mega(?:-[XY])?|Alola|Galar|Hisui|Paldea(?:-[A-Za-z]+)?|Therian|Incarnate|White|Black|Origin|Crowned|Ice|Shadow|Dusk-Mane|Dawn-Wings|Ultra|Rapid-Strike|Single-Strike|Ice-Rider|Shadow-Rider|Wellspring|Hearthflame|Cornerstone|Teal)$/i,
    ''
  );
}

function validateChampionsLegality(team) {
  var violations = [];
  if (!team || !Array.isArray(team.members)) return { violations: violations };

  for (var i = 0; i < team.members.length; i++) {
    var mon = team.members[i];
    var name = mon && mon.name ? mon.name : '';

    if (FAKEMON_BLOCKLIST.has(name)) {
      violations.push({ severity: 'error', code: 'FAKEMON', message: name + ': not a real Pokemon form (fakemon blocked)' });
      continue;
    }

    var base = _stripForm(name);
    if (CHAMPIONS_BANNED_POKEMON.has(name) || CHAMPIONS_BANNED_POKEMON.has(base)) {
      violations.push({ severity: 'error', code: 'BANNED', message: name + ': banned in Reg M-A (Legendary/Mythical/Restricted/Paradox)' });
    }

    var item = mon && mon.item ? mon.item : '';
    if (item && CHAMPIONS_BANNED_ITEMS.has(item)) {
      violations.push({ severity: 'error', code: 'ITEM_ABSENT', message: name + ': item "' + item + '" is not in Champions Reg M-A item pool' });
    }

    if (item && CHAMPIONS_STONE_TO_SPECIES[item]) {
      var required = CHAMPIONS_STONE_TO_SPECIES[item];
      if (base !== required) {
        violations.push({ severity: 'error', code: 'MEGA_STONE_MISMATCH', message: name + ': cannot hold ' + item + ' (only ' + required + ' can)' });
      }
    }

    if (CHAMPIONS_HOME_TRANSFER_MEGAS.has(name)) {
      violations.push({ severity: 'warn', code: 'HOME_TRANSFER', message: name + ': legal in Reg M-A but requires HOME transfer to obtain' });
    }
  }
  return { violations: violations };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAMPIONS_BANNED_POKEMON: CHAMPIONS_BANNED_POKEMON,
    FAKEMON_BLOCKLIST: FAKEMON_BLOCKLIST,
    CHAMPIONS_BANNED_ITEMS: CHAMPIONS_BANNED_ITEMS,
    CHAMPIONS_STONE_TO_SPECIES: CHAMPIONS_STONE_TO_SPECIES,
    CHAMPIONS_HOME_TRANSFER_MEGAS: CHAMPIONS_HOME_TRANSFER_MEGAS,
    validateChampionsLegality: validateChampionsLegality
  };
}
