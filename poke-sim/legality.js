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

var FAKEMON_BLOCKLIST = new Set([
  'Dragonite-Mega','Drampa-Mega','Meganium-Mega','Froslass-Mega'
]);

// Strip form suffixes to compare against base-species ban list.
// Keeps regional forms (Alola/Galar/Hisui/Paldea) legal where the base is legal,
// but banned sub-legendary forms (e.g. Urshifu-Rapid-Strike) still match their base.
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
        message: name + ': banned in Reg M-A (Legendary/Mythical/Restricted/Paradox)'
      });
    }
  }
  return { violations: violations };
}

// CommonJS export for Node tests; harmless in browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAMPIONS_BANNED_POKEMON: CHAMPIONS_BANNED_POKEMON,
    FAKEMON_BLOCKLIST: FAKEMON_BLOCKLIST,
    validateChampionsLegality: validateChampionsLegality
  };
}
