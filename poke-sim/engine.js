// ============================================================
// BATTLE ENGINE — VGC Doubles Simulator
// Simulates VGC-style 4v4 doubles with priority, speed tiers,
// weather, Trick Room, Intimidate, and damage variance
// ============================================================

// ============================================================
// SEEDED PRNG — Issue #2 FIX
// Mulberry32: fast, deterministic, browser-safe.
// All battle randomness goes through rng() — never Math.random().
// Seed is a 4-number array [a,b,c,d] passed via opts.seed to
// simulateBattle(). runSimulation() auto-generates seeds per battle
// so each battle is independently reproducible.
// ============================================================
function makePRNG(seed) {
  // seed: [a, b, c, d] — four 32-bit integers
  let [a, b, c, d] = seed.map(n => n >>> 0);
  return function rng() {
    let t = b << 9;
    let r = a * 5; r = (r << 7 | r >>> 25) * 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t;
    d = d << 11 | d >>> 21;
    return (r >>> 0) / 4294967296;
  };
}

// Generate a random seed array (for external callers who don't supply one)
function makeSeed() {
  return [
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
  ];
}

// ============================================================
// TEAM LEGALITY VALIDATOR — Issue #5
// Called before every simulateBattle() invocation.
// Blocks on errors, warns on warnings.
// ============================================================
function validateTeam(team, format = 'vgc') {
  const errors = [];
  const warnings = [];
  if (!team || !team.members || team.members.length === 0) {
    errors.push('Team has no members.');
    return { valid: false, errors, warnings };
  }
  for (const mon of team.members) {
    const name = mon.name || 'Unknown';
    // EV total cap
    const totalEVs = Object.values(mon.evs || {}).reduce((a, b) => a + b, 0);
    if (totalEVs > 510) errors.push(`${name}: EVs exceed 510 (got ${totalEVs})`);
    // Individual EV cap
    for (const [stat, val] of Object.entries(mon.evs || {})) {
      if (val > 252) errors.push(`${name}: ${stat} EV exceeds 252 (got ${val})`);
      if (val < 0)   errors.push(`${name}: ${stat} EV is negative (got ${val})`);
    }
    // Move count
    if (!mon.moves || mon.moves.length === 0) errors.push(`${name}: no moves defined`);
    if (mon.moves && mon.moves.length > 4)    errors.push(`${name}: more than 4 moves (got ${mon.moves.length})`);
    // VGC level
    if (format === 'vgc') {
      const lvl = mon.level || 50;
      if (lvl !== 50) warnings.push(`${name}: level should be 50 for VGC (got ${lvl})`);
    }
  }
  // Duplicate species
  const names = team.members.map(m => m.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) warnings.push(`Duplicate species: ${[...new Set(dupes)].join(', ')}`);
  // Duplicate items
  const items = team.members.map(m => m.item).filter(Boolean);
  const dupeItems = items.filter((it, i) => items.indexOf(it) !== i);
  if (dupeItems.length > 0) warnings.push(`Duplicate items: ${[...new Set(dupeItems)].join(', ')}`);

  return { valid: errors.length === 0, errors, warnings };
}

class Pokemon {
  constructor(data, teamStyle) {
    this.name = data.name;
    this.item = data.item;
    this.ability = data.ability;
    this.nature = data.nature;
    this.evs = data.evs || { hp:0,atk:0,def:0,spa:0,spd:0,spe:0 };
    this.moves = [...data.moves];
    this.role = data.role || '';
    this.teamStyle = teamStyle;
    this.tera = data.tera || null;
    const _baseStats = BASE_STATS[data.name] || { hp:80,atk:80,def:80,spa:80,spd:80,spe:80, types:['Normal'] };
    // Use POKEMON_TYPES_DB for more accurate type coverage on imported Pokémon
    const _types = (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[data.name])
      ? POKEMON_TYPES_DB[data.name]
      : _baseStats.types;
    this._base = Object.assign({}, _baseStats, { types: _types });
    this.types = [...this._base.types];
    this.level = data.level || 50;
    this._calcStats();
    this.hp = this.maxHp;
    this.status = null; // burn, paralysis, sleep, poison
    this.statusTurns = 0;
    this.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    this.alive = true;
    this.hasActed = false;
    this.teraActivated = false;
    this.itemConsumed = false;
    this.substituteHp = 0;
    // Sinistcha Hospitality: restores ally HP on switch
    this.hospitality = (this.ability === 'Hospitality');
    // Multiscale: halves first hit if full HP
    this.multiscaleActive = (this.ability === 'Multiscale');
  }

  // Issue #4 FIX: _stat() is HP-only. Removed broken nature logic that
  // compared a stat-key string to a numeric base value (always returned nm=1).
  // Natures do not apply to HP — no nature logic needed here.
  _stat(base, ev, nature, isHp) {
    const iv = 31;
    if (isHp) return Math.floor(((2*base + iv + Math.floor(ev/4)) * this.level / 100) + this.level + 10);
    // Non-HP fallback (should not be called — _statRaw() handles all non-HP stats)
    return Math.floor(Math.floor((2*base + iv + Math.floor(ev/4)) * this.level / 100 + 5));
  }

  _calcStats() {
    const b = this._base, e = this.evs;
    this.maxHp = this._stat(b.hp, e.hp||0, null, true);
    this.baseAtk = this._statRaw(b.atk, e.atk||0, 'atk');
    this.baseDef = this._statRaw(b.def, e.def||0, 'def');
    this.baseSpa = this._statRaw(b.spa, e.spa||0, 'spa');
    this.baseSpd = this._statRaw(b.spd, e.spd||0, 'spd');
    this.baseSpe = this._statRaw(b.spe, e.spe||0, 'spe');
  }

  _statRaw(base, ev, stat) {
    const iv = 31;
    const natureBonus = {
      Adamant:{atk:1.1,spa:0.9}, Modest:{spa:1.1,atk:0.9}, Jolly:{spe:1.1,spa:0.9},
      Timid:{spe:1.1,atk:0.9}, Bold:{def:1.1,atk:0.9}, Calm:{spd:1.1,atk:0.9},
      Careful:{spd:1.1,spa:0.9}, Quiet:{spa:1.1,spe:0.9}, Relaxed:{def:1.1,spe:0.9},
      Sassy:{spd:1.1,spe:0.9}, Serious:{}, Hasty:{spe:1.1,def:0.9},
      Naive:{spe:1.1,spd:0.9}, Hardy:{}
    };
    const nm = (natureBonus[this.nature] || {})[stat] || 1;
    return Math.floor(Math.floor((2*base + iv + Math.floor(ev/4)) * this.level / 100 + 5) * nm);
  }

  getStat(stat, field) {
    const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
    const base = { atk:this.baseAtk, def:this.baseDef, spa:this.baseSpa, spd:this.baseSpd, spe:this.baseSpe }[stat];
    const boost = this.statBoosts[stat] || 0;
    let val = boost >= 0 ? base * boostTable[boost] : base / boostTable[-boost];
    // Burn halves attack
    if (stat === 'atk' && this.status === 'burn') val *= 0.5;
    // Paralysis halves speed (Gen 9 — no action skip, speed only)
    if (stat === 'spe' && this.status === 'paralysis') val *= 0.5;
    // Sand Rush doubles speed in sand
    if (stat === 'spe' && this.ability === 'Sand Rush' && field.weather === 'sand') val *= 2;
    // Unburden doubles speed after item consumed
    if (stat === 'spe' && this.ability === 'Unburden' && this.itemConsumed) val *= 2;
    // Intimidate already applied to statBoosts.atk
    // Eviolite for Dusclops
    if ((stat === 'def' || stat === 'spd') && this.item === 'Eviolite') val *= 1.5;
    // Issue #9 FIX: Choice item stat multipliers
    if (stat === 'spe' && this.item === 'Choice Scarf') val *= 1.5;
    if (stat === 'atk' && this.item === 'Choice Band')  val *= 1.5;
    if (stat === 'spa' && this.item === 'Choice Specs')  val *= 1.5;
    // Issue #11: Assault Vest — 1.5x Sp. Def
    if (stat === 'spd' && this.item === 'Assault Vest') val *= 1.5;
    // Trick Room inverts speed (handled in turn order)
    return Math.floor(val);
  }

  getEffSpeed(field) {
    let spe = this.getStat('spe', field);
    if (field.trickRoom) spe = 10000 - spe; // lower is faster under TR
    return spe;
  }

  // Issue #2 FIX: calcDamage now receives rng from simulateBattle scope
  calcDamage(move, target, field, partner, rng) {
    const moveType = MOVE_TYPES[move] || 'Normal';
    const isPhysical = ['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Ice','Electric','Dragon','Dark','Fairy'].includes(moveType)
      && ['Fake Out','Flare Blitz','Head Smash','Power Gem','Earthquake','Dragon Claw','Rock Slide',
          'Wave Crash','Iron Head','Flash Cannon','Close Combat','Dire Claw','High Horsepower',
          'Ice Punch','Dragon Darts','Phantom Force','Knock Off','Rock Slide','Extreme Speed',
          'Ice Punch','Foul Play','Throat Chop','Fire Fang','Shadow Sneak','Aqua Jet'].includes(move);

    const atk = isPhysical ? this.getStat('atk', field) : this.getStat('spa', field);
    const def = isPhysical ? target.getStat('def', field) : target.getStat('spd', field);

    // Base power
    const BP_MAP = {
      'Fake Out':40,'Flare Blitz':120,'Parting Shot':0,'Knock Off':65,'Power Gem':80,
      'Head Smash':150,'Extreme Speed':80,'Will-O-Wisp':0,'Earthquake':100,'Dragon Claw':80,
      'Rock Slide':75,'Protect':0,'Tailwind':0,'Sunny Day':0,'Moonblast':95,'Thunderbolt':90,
      'Hydro Pump':110,'Fire Fang':65,'Eruption':150,'Heat Wave':95,'Focus Blast':120,
      'Shadow Ball':80,'Flamethrower':90,'Hyper Voice':90,'Roost':0,'Trick Room':0,
      'Life Dew':0,'Rage Powder':0,'Matcha Gotcha':80,'Ice Beam':90,'Thunder':110,
      'Hurricane':110,'Wave Crash':120,'Aqua Jet':40,'Flip Turn':60,'Last Respects':50,
      'Rain Dance':0,'Thunder Wave':0,'Foul Play':95,'Flash Cannon':80,'Dragon Pulse':85,
      'Electro Shot':130,'Weather Ball':50,'U-turn':70,'Helping Hand':0,'Shed Tail':0,
      'Iron Head':80,'Scorching Sands':70,'Dark Pulse':80,'Psychic Noise':75,'Draco Meteor':130,
      'Close Combat':120,'Dire Claw':60,'Ice Punch':75,'High Horsepower':95,
      'Dragon Darts':50,'Phantom Force':90,'Solar Beam':120,'Dazzling Gleam':80,'Air Slash':75,
      'Energy Ball':90,'Sludge Bomb':90,'Sleep Powder':0
    };
    let bp = BP_MAP[move] || 60;

    // Weather Ball doubles in active weather
    if (move === 'Weather Ball' && field.weather !== 'none') bp = 100;
    // Electro Shot: 130 in rain (one-turn), else still 130 after charge
    if (move === 'Electro Shot' && field.weather === 'rain') bp = 130;
    // Last Respects: +50 per fainted ally (max +300)
    if (move === 'Last Respects') {
      const fainted = target.side?.fainted || 0;
      bp = 50 + Math.min(fainted, 5) * 50;
    }
    // Eruption: scales with user HP
    if (move === 'Eruption') {
      bp = Math.max(1, Math.floor(150 * this.hp / this.maxHp));
    }

    if (bp === 0) return 0; // Status move

    // Type effectiveness
    const TYPE_CHART = {
      Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
      Fire:     { Fire:0.5, Water:0.5, Rock:0.5, Dragon:0.5, Grass:2, Ice:2, Bug:2, Steel:2 },
      Water:    { Water:0.5, Grass:0.5, Dragon:0.5, Fire:2, Ground:2, Rock:2 },
      Electric: { Electric:0.5, Grass:0.5, Dragon:0.5, Ground:0, Flying:2, Water:2 },
      Grass:    { Fire:0.5, Grass:0.5, Poison:0.5, Flying:0.5, Bug:0.5, Dragon:0.5, Steel:0.5, Water:2, Ground:2, Rock:2 },
      Ice:      { Water:0.5, Ice:0.5, Fire:0.5, Steel:0.5, Grass:2, Ground:2, Flying:2, Dragon:2 },
      Fighting: { Normal:2, Ice:2, Rock:2, Dark:2, Steel:2, Poison:0.5, Bug:0.5, Psychic:0.5, Flying:0.5, Ghost:0, Fairy:0.5 },
      Poison:   { Grass:2, Fairy:2, Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0 },
      Ground:   { Electric:2, Fire:2, Poison:2, Rock:2, Steel:2, Grass:0.5, Bug:0.5, Flying:0 },
      Flying:   { Grass:2, Fighting:2, Bug:2, Rock:0.5, Steel:0.5, Electric:0.5 },
      Psychic:  { Fighting:2, Poison:2, Psychic:0.5, Steel:0.5, Dark:0 },
      Bug:      { Grass:2, Psychic:2, Dark:2, Fire:0.5, Fighting:0.5, Flying:0.5, Ghost:0.5, Steel:0.5, Fairy:0.5 },
      Rock:     { Fire:2, Ice:2, Flying:2, Bug:2, Fighting:0.5, Ground:0.5, Steel:0.5 },
      Ghost:    { Ghost:2, Psychic:2, Normal:0, Dark:0.5 },
      Dragon:   { Dragon:2, Steel:0.5, Fairy:0 },
      Dark:     { Ghost:2, Psychic:2, Fighting:0.5, Dark:0.5, Fairy:0.5 },
      Steel:    { Ice:2, Rock:2, Fairy:2, Fire:0.5, Water:0.5, Electric:0.5, Steel:0.5 },
      Fairy:    { Fighting:2, Dragon:2, Dark:2, Fire:0.5, Poison:0.5, Steel:0.5 },
    };

    // Use Tera type if activated
    const targetTypes = (this.teraActivated && target.tera)
      ? [target.tera]
      : target.types;

    let typeEff = 1;
    const chart = TYPE_CHART[moveType] || {};
    for (const t of targetTypes) {
      typeEff *= (chart[t] !== undefined ? chart[t] : 1);
    }
    if (typeEff === 0) return 0;

    // STAB — include Tera STAB
    const attackerTypes = (this.teraActivated && this.tera) ? [this.tera] : this.types;
    const stab = attackerTypes.includes(moveType) ? 1.5 : 1;

    // Doubles spread nerf
    const isSpread = (move === 'Earthquake' || move === 'Rock Slide' ||
                      move === 'Heat Wave' || move === 'Hyper Voice' ||
                      move === 'Dazzling Gleam' || move === 'Eruption');
    const spreadMod = isSpread ? 0.75 : 1;

    // Weather bonus
    let weatherMod = 1;
    if (field.weather === 'sun')  { if (moveType === 'Fire') weatherMod = 1.5; if (moveType === 'Water') weatherMod = 0.5; }
    if (field.weather === 'rain') { if (moveType === 'Water') weatherMod = 1.5; if (moveType === 'Fire') weatherMod = 0.5; }
    if (field.weather === 'sand') { if (moveType === 'Rock') weatherMod = 1.5; }

    // Terrain bonus
    let terrainMod = 1;
    if (field.terrain === 'electric' && moveType === 'Electric' && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'grassy'   && moveType === 'Grass'    && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'psychic'  && moveType === 'Psychic'  && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'misty'    && moveType === 'Dragon')                     terrainMod = 0.5;

    // Screen modifiers
    let screenMod = 1;
    if (isPhysical  && target.side?.reflect)    screenMod = 0.5;
    if (!isPhysical && target.side?.lightScreen) screenMod = 0.5;

    // Helping Hand boost
    const hhMod = (this.helpingHand) ? 1.5 : 1;

    // Life Orb
    const loMod = (this.item === 'Life Orb') ? 1.3 : 1;

    // Choice Specs/Band handled in getStat
    // Burn handled in getStat

    // Base damage formula (Gen 9)
    const raw = Math.floor(Math.floor(Math.floor(2 * this.level / 5 + 2) * bp * atk / def) / 50) + 2;
    const dmg = Math.floor(raw * stab * typeEff * spreadMod * weatherMod * terrainMod * screenMod * hhMod * loMod);

    // Random roll 85–100%
    const roll = 0.85 + rng() * 0.15;
    return Math.max(1, Math.floor(dmg * roll));
  }

  applyItem(trigger, field) {
    if (this.itemConsumed) return;
    // Lum Berry: clears status
    if (this.item === 'Lum Berry' && trigger === 'status') {
      this.status = null; this.statusTurns = 0; this.itemConsumed = true;
      return `${this.name}'s Lum Berry cured its status!`;
    }
    // Sitrus Berry: restores 25% HP
    if (this.item === 'Sitrus Berry' && trigger === 'damage' && this.hp <= this.maxHp * 0.5) {
      const heal = Math.floor(this.maxHp * 0.25);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.itemConsumed = true;
      return `${this.name}'s Sitrus Berry restored HP!`;
    }
    // Oran Berry: restores 10 HP
    if (this.item === 'Oran Berry' && trigger === 'damage' && this.hp <= this.maxHp * 0.5) {
      this.hp = Math.min(this.maxHp, this.hp + 10);
      this.itemConsumed = true;
      return `${this.name}'s Oran Berry restored HP!`;
    }
    // Mental Herb: clears taunt etc (placeholder)
    if (this.item === 'Mental Herb' && trigger === 'taunt') {
      this.itemConsumed = true;
      return `${this.name}'s Mental Herb removed the effect!`;
    }
  }
}

// ============================================================
// FIELD STATE
// ============================================================
class Field {
  constructor() {
    this.weather      = 'none'; // 'sun','rain','sand','hail','snow'
    this.weatherTurns = 0;
    this.trickRoom    = false;
    this.trickRoomTurns = 0;
    this.terrain      = 'none';
    this.terrainTurns = 0;
    this.playerSide   = { tailwind:false, tailwindTurns:0, reflect:false, lightScreen:false, auroraVeil:false };
    this.oppSide      = { tailwind:false, tailwindTurns:0, reflect:false, lightScreen:false, auroraVeil:false };
  }

  tick(logs) {
    // Weather countdown
    if (this.weather !== 'none' && this.weatherTurns > 0) {
      this.weatherTurns--;
      if (this.weatherTurns === 0) { logs.push(`The ${this.weather} subsided.`); this.weather = 'none'; }
    }
    // Trick Room countdown
    if (this.trickRoom) {
      this.trickRoomTurns--;
      if (this.trickRoomTurns <= 0) { this.trickRoom = false; logs.push('Trick Room returned to NORMAL!'); }
    }
    // Terrain countdown
    if (this.terrain !== 'none' && this.terrainTurns > 0) {
      this.terrainTurns--;
      if (this.terrainTurns === 0) { this.terrain = 'none'; logs.push('The terrain returned to normal.'); }
    }
    // Tailwind countdown
    if (this.playerSide.tailwind) {
      this.playerSide.tailwindTurns--;
      if (this.playerSide.tailwindTurns <= 0) { this.playerSide.tailwind = false; logs.push("Player's Tailwind ended."); }
    }
    if (this.oppSide.tailwind) {
      this.oppSide.tailwindTurns--;
      if (this.oppSide.tailwindTurns <= 0) { this.oppSide.tailwind = false; logs.push("Opponent's Tailwind ended."); }
    }
  }
}

// ============================================================
// TEAM BUILDER — builds active battlers from team definition
// ============================================================
function buildTeam(teamDef) {
  if (!teamDef || !teamDef.members) return [];
  const style = teamDef.style || '';
  return teamDef.members.map(m => new Pokemon(m, style));
}

// ============================================================
// SIMULATE BATTLE
// ============================================================
function simulateBattle(playerTeam, oppTeam, opts = {}) {
  const seed = opts.seed || makeSeed();
  const rng  = makePRNG(seed);
  const log  = [];
  const field = new Field();

  const playerPokemon = buildTeam(playerTeam);
  const oppPokemon    = buildTeam(oppTeam);

  // Active battlers (doubles: 2 per side)
  let playerActive = [playerPokemon[0], playerPokemon[1]].filter(Boolean);
  let oppActive    = [oppPokemon[0],    oppPokemon[1]   ].filter(Boolean);
  let playerBench  = playerPokemon.slice(2);
  let oppBench     = oppPokemon.slice(2);

  // Track fainted counts per side for Last Respects
  const sideFainted = { player: 0, opp: 0 };

  // Apply on-entry abilities
  function applyEntryAbility(mon, side, field, log) {
    if (mon.ability === 'Intimidate') {
      const targets = side === 'player' ? oppActive : playerActive;
      for (const t of targets) {
        if (t.alive && t.ability !== 'Inner Focus' && t.ability !== 'Own Tempo' && t.ability !== 'Oblivious') {
          t.statBoosts.atk = Math.max(-6, t.statBoosts.atk - 1);
          log.push(`${mon.name}'s Intimidate lowered ${t.name}'s Attack!`);
        }
      }
    }
    if (mon.ability === 'Drought')       { field.weather = 'sun';  field.weatherTurns = 5; log.push(`${mon.name} summoned harsh sunlight!`); }
    if (mon.ability === 'Drizzle')       { field.weather = 'rain'; field.weatherTurns = 5; log.push(`${mon.name} summoned rain!`); }
    if (mon.ability === 'Sand Stream')   { field.weather = 'sand'; field.weatherTurns = 5; log.push(`${mon.name} summoned a sandstorm!`); }
    if (mon.ability === 'Snow Warning')  { field.weather = 'snow'; field.weatherTurns = 5; log.push(`${mon.name} summoned snow!`); }
    if (mon.ability === 'Hospitality' && side === 'player') {
      const ally = playerActive.find(a => a !== mon && a.alive);
      if (ally) { ally.hp = Math.min(ally.maxHp, ally.hp + Math.floor(ally.maxHp * 0.25)); log.push(`${mon.name}'s Hospitality restored ${ally.name}'s HP!`); }
    }
  }

  for (const m of playerActive) applyEntryAbility(m, 'player', field, log);
  for (const m of oppActive)    applyEntryAbility(m, 'opp', field, log);

  // ============================================================
  // GREEDY MOVE SELECTION
  // Scores moves by expected damage or utility value.
  // ============================================================
  function selectMove(attacker, allies, enemies, field) {
    const STATUS_MOVES = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail']);
    const PRIORITY_MOVES = new Set(['Fake Out','Aqua Jet','Extreme Speed','Shadow Sneak']);

    let best = { move: null, target: null, score: -Infinity };

    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);

    for (const move of attacker.moves) {
      const moveType = MOVE_TYPES[move] || 'Normal';

      // Status/utility scoring
      if (STATUS_MOVES.has(move)) {
        let score = 0;
        if (move === 'Trick Room' && !field.trickRoom) score = 55;
        if (move === 'Tailwind'   && !field[attacker.side === 'player' ? 'playerSide' : 'oppSide']?.tailwind) score = 50;
        if (move === 'Will-O-Wisp' && liveEnemies.length) {
          const target = liveEnemies.find(e => !e.status) || liveEnemies[0];
          if (target && !target.status && target.types.every(t => t !== 'Fire')) {
            if (best.score < 45) { best = { move, target, score: 45 }; }
          }
          continue;
        }
        if (move === 'Life Dew' && liveAllies.some(a => a.hp < a.maxHp * 0.6)) score = 40;
        if (move === 'Rage Powder' && liveAllies.some(a => !a.alive)) score = 35;
        if (move === 'Roost' && attacker.hp < attacker.maxHp * 0.5) score = 45;
        if (score > best.score) best = { move, target: liveEnemies[0] || null, score };
        continue;
      }

      // Priority move logic
      if (PRIORITY_MOVES.has(move)) {
        if (move === 'Fake Out' && !attacker._fakeDone) {
          const target = liveEnemies[0];
          if (target) {
            const dmg = attacker.calcDamage(move, target, field, null, rng);
            const score = dmg / target.maxHp * 100 + 25;
            if (score > best.score) best = { move, target, score };
          }
          continue;
        }
      }

      // Damage scoring — pick highest damage target
      for (const target of liveEnemies) {
        const dmg = attacker.calcDamage(move, target, field, null, rng);
        // Score: damage fraction + KO bonus + priority bonus
        let score = dmg / target.maxHp * 100;
        if (dmg >= target.hp) score += 50; // KO bonus
        if (PRIORITY_MOVES.has(move)) score += 10;
        if (score > best.score) best = { move, target, score };
      }
    }

    // Fallback
    if (!best.move) {
      best.move   = attacker.moves[0] || 'Tackle';
      best.target = liveEnemies[0] || allies[0];
    }
    return best;
  }

  // ============================================================
  // EXECUTE ACTION
  // ============================================================
  function executeAction(attacker, move, target, allies, enemies, field, log, rng) {
    if (!attacker.alive) return;
    if (!move) return;

    const moveType = MOVE_TYPES[move] || 'Normal';
    const PROTECT_MOVES = new Set(['Protect','Wide Guard','Quick Guard']);
    const STATUS_MOVES  = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail']);

    // Attacker must be alive
    if (!attacker.alive) return;

    // Handle Protect
    if (PROTECT_MOVES.has(move)) {
      attacker.protected = true;
      log.push(`${attacker.name} used ${move}!`);
      return;
    }

    // Status moves
    if (STATUS_MOVES.has(move)) {
      log.push(`${attacker.name} used ${move}!`);
      if (move === 'Trick Room') {
        if (field.trickRoom) {
          field.trickRoom = false;
          field.trickRoomTurns = 0;
          log.push('Trick Room returned to NORMAL!');
        } else {
          field.trickRoom = true;
          field.trickRoomTurns = 5;
          log.push('Trick Room was set! Slower Pokémon go first!');
        }
      }
      if (move === 'Tailwind') {
        const side = allies === playerActive ? field.playerSide : field.oppSide;
        side.tailwind = true;
        side.tailwindTurns = 4;
        log.push(`${attacker.name}'s Tailwind is blowing!`);
      }
      if (move === 'Sunny Day') { field.weather = 'sun'; field.weatherTurns = 5; log.push('The sunlight turned harsh!'); }
      if (move === 'Rain Dance') { field.weather = 'rain'; field.weatherTurns = 5; log.push('It started to rain!'); }
      if (move === 'Will-O-Wisp' && target && target.alive && !target.status && !target.types.includes('Fire')) {
        // Miss chance 15%
        if (rng() < 0.15) { log.push(`${attacker.name}'s Will-O-Wisp missed!`); return; }
        target.status = 'burn'; log.push(`${target.name} was burned by ${attacker.name}'s Will-O-Wisp!`);
        target.applyItem('status', field);
      }
      if (move === 'Thunder Wave' && target && target.alive && !target.status && !target.types.includes('Electric') && !target.types.includes('Ground')) {
        target.status = 'paralysis'; log.push(`${target.name} is paralysed! It may be unable to move!`);
      }
      if (move === 'Sleep Powder' && target && target.alive && !target.status) {
        if (rng() < 0.25) { log.push(`${attacker.name}'s Sleep Powder missed!`); return; }
        target.status = 'sleep'; target.statusTurns = 2 + Math.floor(rng() * 2);
        log.push(`${target.name} fell asleep from ${attacker.name}'s Sleep Powder!`);
      }
      if (move === 'Life Dew') {
        for (const a of allies.filter(a => a.alive)) {
          const heal = Math.floor(a.maxHp * 0.25);
          a.hp = Math.min(a.maxHp, a.hp + heal);
          log.push(`${a.name} had its HP restored by Life Dew!`);
        }
      }
      if (move === 'Roost') {
        const heal = Math.floor(attacker.maxHp * 0.5);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        log.push(`${attacker.name} restored HP with Roost!`);
      }
      if (move === 'Parting Shot' && target && target.alive) {
        target.statBoosts.atk = Math.max(-6, target.statBoosts.atk - 1);
        target.statBoosts.spa = Math.max(-6, target.statBoosts.spa - 1);
        log.push(`${attacker.name}'s Parting Shot lowered ${target.name}'s offenses!`);
      }
      if (move === 'Shed Tail') {
        attacker.substituteHp = Math.floor(attacker.maxHp * 0.25);
        attacker.hp -= attacker.substituteHp;
        log.push(`${attacker.name} shed its tail and created a Substitute!`);
      }
      return;
    }

    // Skip if target protected
    if (target && target.protected) {
      log.push(`${attacker.name} used ${move}! But ${target.name} was protected!`);
      return;
    }

    // Fake Out: only first turn
    if (move === 'Fake Out') {
      if (attacker._fakeDone) {
        // Fall through to damage
      } else {
        attacker._fakeDone = true;
      }
    }

    // Miss chance for low-accuracy moves
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                     'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                     'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0 };
    const acc = ACC_MAP[move] || 1.0;
    if (rng() > acc) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      return;
    }

    // Helping Hand: boost ally
    if (move === 'Helping Hand') {
      const ally = allies.find(a => a !== attacker && a.alive);
      if (ally) {
        ally.helpingHand = true;
        log.push(`${attacker.name} used Helping Hand for ${ally.name}!`);
      }
      return;
    }

    // U-turn / Flip Turn: damage + switch
    if (move === 'U-turn' || move === 'Flip Turn') {
      if (target && target.alive) {
        const dmg = attacker.calcDamage(move, target, field, null, rng);
        applyDamage(attacker, move, target, dmg, field, log);
        log.push(`${attacker.name} pivoted out!`);
      }
      return;
    }

    // Dragon Darts: hits twice, targets split between enemies
    if (move === 'Dragon Darts') {
      const darts = 2;
      const targets = enemies.filter(e => e.alive);
      for (let d = 0; d < darts; d++) {
        const t = targets[d % targets.length];
        if (t) {
          const dmg = attacker.calcDamage(move, t, field, null, rng);
          applyDamage(attacker, move, t, dmg, field, log);
        }
      }
      return;
    }

    // Regular damage
    if (!target || !target.alive) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      return;
    }
    const dmg = attacker.calcDamage(move, target, field, null, rng);
    applyDamage(attacker, move, target, dmg, field, log);
  }

  function applyDamage(attacker, move, target, dmg, field, log) {
    if (dmg <= 0) return;
    let finalDmg = dmg;
    // Substitute absorb
    if (target.substituteHp > 0) {
      target.substituteHp -= finalDmg;
      if (target.substituteHp <= 0) { target.substituteHp = 0; log.push(`${target.name}'s Substitute was destroyed!`); }
      else log.push(`${attacker.name} used ${move}! (Substitute absorbed ${finalDmg} dmg)`);
      return;
    }
    target.hp = Math.max(0, target.hp - finalDmg);
    log.push(`${attacker.name} used ${move}! → ${target.name} [${finalDmg} dmg, ${target.hp}/${target.maxHp} HP]`);
    // Recoil
    if (move === 'Flare Blitz' || move === 'Head Smash' || move === 'Wave Crash') {
      const recoil = Math.floor(finalDmg / 3);
      attacker.hp = Math.max(0, attacker.hp - recoil);
      log.push(`${attacker.name} was hurt by recoil! [${recoil} dmg]`);
    }
    // Life Orb recoil
    if (attacker.item === 'Life Orb') {
      const loRecoil = Math.floor(attacker.maxHp * 0.1);
      attacker.hp = Math.max(0, attacker.hp - loRecoil);
      if (attacker.hp <= 0) attacker.alive = false;
    }
    // Berry check after damage
    const berryMsg = target.applyItem('damage', field);
    if (berryMsg) log.push(berryMsg);
    // Multiscale: deactivate after first hit
    target.multiscaleActive = false;
    if (target.hp === 0) { target.alive = false; log.push(`${target.name} fainted!`); }
  }

  // ============================================================
  // MAIN BATTLE LOOP
  // ============================================================
  let turn = 0;
  const MAX_TURNS = 25;

  while (turn < MAX_TURNS) {
    turn++;
    log.push(`--- Turn ${turn} ---`);

    // Clear per-turn flags
    for (const m of [...playerActive, ...oppActive]) {
      m.hasActed = false;
      m.protected = false;
      m.helpingHand = false;
    }

    // Check win condition
    const pAlive = playerActive.filter(m => m.alive).length + playerBench.filter(m => m.alive).length;
    const oAlive = oppActive.filter(m => m.alive).length + oppBench.filter(m => m.alive).length;
    if (pAlive === 0 || oAlive === 0) break;

    // --------------------------------------------------------
    // BUILD ACTION QUEUE
    // --------------------------------------------------------
    const actions = [];

    for (const mon of playerActive.filter(m => m.alive)) {
      const { move, target } = selectMove(mon, playerActive, oppActive, field);
      actions.push({ attacker:mon, move, target, side:'player', priority: getPriority(move) });
    }
    for (const mon of oppActive.filter(m => m.alive)) {
      const { move, target } = selectMove(mon, oppActive, playerActive, field);
      actions.push({ attacker:mon, move, target, side:'opp', priority: getPriority(move) });
    }

    // Sort by priority → then speed (Trick Room inverts)
    actions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const sA = a.attacker.getEffSpeed(field);
      const sB = b.attacker.getEffSpeed(field);
      if (sA !== sB) return field.trickRoom ? sA - sB : sB - sA;
      return rng() < 0.5 ? -1 : 1; // Speed tie
    });

    // Execute actions
    for (const action of actions) {
      if (!action.attacker.alive) continue;
      // Status check before acting
      if (action.attacker.status === 'sleep') {
        action.attacker.statusTurns--;
        if (action.attacker.statusTurns <= 0) {
          action.attacker.status = null;
          log.push(`${action.attacker.name} woke up!`);
        } else {
          log.push(`${action.attacker.name} is fast asleep!`);
          continue;
        }
      }
      if (action.attacker.status === 'paralysis' && rng() < 0.25) {
        log.push(`${action.attacker.name} is fully paralysed and can't move!`);
        continue;
      }
      executeAction(action.attacker, action.move, action.target,
        action.side === 'player' ? playerActive : oppActive,
        action.side === 'player' ? oppActive : playerActive,
        field, log, rng);
    }

    // Sand damage
    if (field.weather === 'sand') {
      for (const mon of [...playerActive, ...oppActive].filter(m => m.alive)) {
        if (!['Rock','Steel','Ground'].includes(mon.types[0]) &&
            !['Rock','Steel','Ground'].includes(mon.types[1] || '')) {
          const sandDmg = Math.floor(mon.maxHp / 16);
          mon.hp = Math.max(0, mon.hp - sandDmg);
          log.push(`${mon.name} is buffeted by the sandstorm! [${sandDmg} dmg]`);
          if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); }
        }
      }
    }

    // Burn damage
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'burn')) {
      const burnDmg = Math.floor(mon.maxHp / 16);
      mon.hp = Math.max(0, mon.hp - burnDmg);
      log.push(`${mon.name} is hurt by its burn! [${burnDmg} dmg]`);
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); }
    }

    // Field upkeep
    field.tick(log);

    // --------------------------------------------------------
    // REPLACEMENTS
    // --------------------------------------------------------
    function replaceOnField(activeArr, bench, side, field, log) {
      const fainted = activeArr.filter(m => !m.alive);
      for (const mon of fainted) {
        sideFainted[side]++;
        const idx = activeArr.indexOf(mon);
        const replacement = bench.find(b => b.alive);
        if (replacement) {
          bench.splice(bench.indexOf(replacement), 1);
          activeArr[idx] = replacement;
          log.push(`${replacement.name} was sent out!`);
          applyEntryAbility(replacement, side, field, log);
        }
      }
      // Remove dead and no replacement
      for (let i = activeArr.length - 1; i >= 0; i--) {
        if (!activeArr[i].alive) activeArr.splice(i, 1);
      }
    }
    replaceOnField(playerActive, playerBench, 'player', field, log);
    replaceOnField(oppActive, oppBench, 'opp', field, log);
  }

  // ============================================================
  // RESULT
  // ============================================================
  const pSurvive = playerActive.filter(m => m.alive).length + playerBench.filter(m => m.alive).length;
  const oSurvive = oppActive.filter(m => m.alive).length + oppBench.filter(m => m.alive).length;
  let result;
  let winCondition = '';
  if (pSurvive > oSurvive) {
    result = 'win';
    const ko = log.filter(l => l.includes('fainted')).length;
    const trSet = log.some(l => l.includes('Trick Room was set'));
    const twSet = log.some(l => l.includes('Tailwind is blowing'));
    winCondition = trSet ? 'TR Win' : twSet ? 'Tailwind Win' : ko >= 4 ? 'KO Sweep' : 'Attrition Win';
  } else if (oSurvive > pSurvive) {
    result = 'loss';
    winCondition = 'Opponent Win';
  } else {
    result = 'draw';
    winCondition = 'Draw';
  }

  return { result, turns: turn, trTurns: field.trickRoomTurns, log, winCondition, seed,
    playerSurvivors: pSurvive, oppSurvivors: oSurvive };
}

// ============================================================
// PRIORITY LOOKUP
// ============================================================
function getPriority(move) {
  const P = {
    'Fake Out':3, 'Extreme Speed':2, 'Aqua Jet':1, 'Shadow Sneak':1, 'Helping Hand':5,
    'Protect':4, 'Wide Guard':3, 'Quick Guard':3,
    'Trick Room':-7, 'Roost':0
  };
  return P[move] || 0;
}

// ============================================================
// MONTE CARLO RUNNER
// ============================================================

async function runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress) {
  const playerTeamDef = TEAMS[playerTeamKey];
  const oppTeamDef = TEAMS[oppTeamKey];

  const results = { wins:0, losses:0, draws:0, errors:0, totalTurns:0, totalTrTurns:0,
    winConditions:{}, allLogs:[], koLogs:[], turnDist:{},
    seeds: [],          // Issue #2: store seeds for reproducibility
    // Issue #6: metadata fields for trustworthy win-rate display
    sampleSize: numBattles,
    policy: 'greedy-vs-greedy',
    format: 'vgc-doubles',
    playerTeam: playerTeamKey,
    oppTeam: oppTeamKey,
  };

  const BATCH = 50;
  for (let i = 0; i < numBattles; i += BATCH) {
    const batchSize = Math.min(BATCH, numBattles - i);
    for (let j = 0; j < batchSize; j++) {
      // Issue #2 FIX: generate a unique seed per battle and pass it in
      const seed = makeSeed();
      const battle = simulateBattle(playerTeamDef, oppTeamDef, { seed });
      if (battle.result === 'error') {
        results.errors++;
        if (results.allLogs.length < 5) results.allLogs.push({ ...battle, oppTeam: oppTeamKey });
        continue;
      }
      results[battle.result === 'win' ? 'wins' : battle.result === 'loss' ? 'losses' : 'draws']++;
      results.totalTurns += battle.turns;
      results.totalTrTurns += battle.trTurns;
      results.turnDist[battle.turns] = (results.turnDist[battle.turns]||0) + 1;
      if (battle.winCondition) {
        results.winConditions[battle.winCondition] = (results.winConditions[battle.winCondition]||0) + 1;
      }
      const isClutch = battle.turns >= 8 || battle.result === 'loss';
      if (results.allLogs.length < 30 || (isClutch && results.allLogs.length < 60)) {
        results.allLogs.push({ ...battle, oppTeam: oppTeamKey });
      }
      // Issue #2: store seeds for first 100 battles so any battle can be replayed
      if (results.seeds.length < 100) results.seeds.push(battle.seed);
    }
    if (onProgress) onProgress(i + batchSize, numBattles);
    await new Promise(r => setTimeout(r, 0));
  }

  const validBattles = results.wins + results.losses + results.draws;
  results.winRate = validBattles > 0 ? results.wins / validBattles : 0;
  results.avgTurns = validBattles > 0 ? results.totalTurns / validBattles : 0;
  results.avgTrTurns = validBattles > 0 ? results.totalTrTurns / validBattles : 0;
  // Issue #6: confidence tier label
  results.confidenceNote = numBattles < 20  ? 'Low confidence — run more simulations (Bo10+)' :
                           numBattles < 100 ? 'Moderate confidence' : 'High confidence';
  return results;
}

// Run all matchups
async function runAllMatchups(numBattles, onProgress, onMatchupDone) {
  const opponents = Object.keys(TEAMS).filter(k => k !== 'player');
  const allResults = {};
  let done = 0;
  for (const opp of opponents) {
    const res = await runSimulation(numBattles, 'player', opp, (current, total) => {
      if (onProgress) onProgress(done * numBattles + current, opponents.length * numBattles);
    });
    allResults[opp] = res;
    done++;
    if (onMatchupDone) onMatchupDone(opp, res);
  }
  return allResults;
}

// ============================================================
// ISSUE #1 FIX — CANONICAL ANALYSIS PAYLOAD
// buildAnalysisPayload() wraps any raw sim result (from runSimulation
// or runBoSeries) into the canonical structured object.
// ALL coaching layers (showInlinePilotCard, generatePilotGuide,
// buildReportText) MUST consume this object — never the raw result.
// Fields:
//   analysis_id     — unique run identifier (timestamp + random)
//   engine_version  — semantic version of this engine file
//   formatid        — format string ("vgc-doubles" | "singles")
//   custom_rules    — array of any active custom rules
//   team_inputs     — player + opponent team keys
//   hidden_info_priors — what is assumed vs known about hidden sets
//   seed_policy     — how seeds were generated
//   sample_size     — battles or series run
//   policy_models   — description of AI decision policy
//   win_rate        — raw float 0–1
//   confidence_interval — Wilson score 95% CI [lo, hi]
//   confidence_tier — "Low" | "Moderate" | "High"
//   top_win_paths   — top win conditions by frequency
//   top_loss_paths  — placeholder (requires loss-path tracking)
//   critical_damage_calcs — placeholder for future calc layer
//   traceable_log_refs    — first N seed refs for replayability
// ============================================================
const ENGINE_VERSION = '1.1.0'; // Increment on any mechanics change

function wilsonCI(wins, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = wins / n;
  const denom = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [
    Math.max(0, Math.round(((centre - margin) / denom) * 1000) / 1000),
    Math.min(1, Math.round(((centre + margin) / denom) * 1000) / 1000)
  ];
}

function buildAnalysisPayload(rawResult, ctx = {}) {
  const n   = rawResult.wins + rawResult.losses + (rawResult.draws || 0);
  const ci  = wilsonCI(rawResult.wins, n);
  const tier = n < 20 ? 'Low' : n < 100 ? 'Moderate' : 'High';

  // Top win paths from winConditions map
  const topWinPaths = Object.entries(rawResult.winConditions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cond, count]) => ({ condition: cond, count, pct: n > 0 ? Math.round(count / n * 100) : 0 }));

  return {
    analysis_id:           `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    engine_version:        ENGINE_VERSION,
    formatid:              rawResult.format || ctx.formatid || 'vgc-doubles',
    custom_rules:          ctx.custom_rules || [],
    team_inputs: {
      player:   rawResult.playerTeam || ctx.playerTeamKey || 'player',
      opponent: rawResult.oppTeam    || ctx.oppTeamKey    || 'unknown'
    },
    hidden_info_priors: {
      note:   'All opponent set details taken as declared in TEAMS definition. No hidden-set priors applied.',
      source: 'exact-input',
      items:  'declared',
      evs:    'declared',
      tera:   'declared',
      moves:  'declared'
    },
    seed_policy:    rawResult.seeds ? 'per-battle-mulberry32' : 'legacy-unseed',
    sample_size:    rawResult.sampleSize || n,
    bo_mode:        ctx.bo || null,
    policy_models:  rawResult.policy || ctx.policy || 'greedy-vs-greedy',
    win_rate:       rawResult.winRate,
    wins:           rawResult.wins,
    losses:         rawResult.losses,
    draws:          rawResult.draws || 0,
    total_battles:  n,
    confidence_interval: ci,
    confidence_tier:     tier,
    confidence_note:     rawResult.confidenceNote ||
      (tier === 'Low'      ? 'Low confidence — run Bo10+ or increase sample size' :
       tier === 'Moderate' ? 'Moderate confidence' : 'High confidence'),
    top_win_paths:        topWinPaths,
    top_loss_paths:       [], // TODO: requires per-loss winCondition tracking
    critical_damage_calcs: [], // TODO: populated by damage calc layer (future)
    traceable_log_refs:   (rawResult.seeds || []).slice(0, 10),
    avg_turns:            rawResult.avgTurns    || 0,
    avg_tr_turns:         rawResult.avgTrTurns  || 0,
    raw_logs_sample:      (rawResult.allLogs    || []).slice(0, 5)
  };
}
