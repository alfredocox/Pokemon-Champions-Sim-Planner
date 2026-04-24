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
      'Energy Ball':90,'Sludge Bomb':90,'Sleep Powder':0,'Earth Power':90,'Throat Chop':80,
      'Ally Switch':0,'Lunar Dance':0,'Psychic':90,'Shadow Sneak':40,'Psyshock':80,
      'Mystical Fire':75,
    };

    let bp = BP_MAP[move] || 60;
    if (bp === 0) return 0; // status move

    // Weather boost
    const w = field.weather;
    if (w === 'sun') {
      if (moveType === 'Fire') bp = Math.floor(bp * 1.5);
      if (moveType === 'Water') bp = Math.floor(bp * 0.5);
    }
    if (w === 'rain') {
      if (moveType === 'Water') bp = Math.floor(bp * 1.5);
      if (moveType === 'Fire') bp = Math.floor(bp * 0.5);
    }

    // Solar Beam halved in non-sun
    if (move === 'Solar Beam' && w !== 'sun') bp = 60;

    // Weather Ball power boost
    if (move === 'Weather Ball' && w !== 'clear') bp = 100;

    // Eruption power scales with HP%
    if (move === 'Eruption' || move === 'Last Respects') {
      if (move === 'Eruption') bp = Math.max(1, Math.floor(150 * this.hp / this.maxHp));
      if (move === 'Last Respects') bp = 50; // simplified
    }

    // Solar Power boost under sun
    if (this.ability === 'Solar Power' && w === 'sun') bp = Math.floor(bp * 1.5);

    // Helping Hand boost
    if (partner && partner.justUsedHelpingHand) bp = Math.floor(bp * 1.5);

    // Issue #11: Life Orb — 1.3x damage multiplier
    const lifeOrbMult = (this.item === 'Life Orb' && !this.itemConsumed) ? 1.3 : 1.0;

    // Adaptability
    const stab = this.types.includes(moveType) ? (this.ability === 'Adaptability' ? 2.0 : 1.5) : 1.0;

    // Type effectiveness
    let targetTypes = target.types;
    if (target.teraActivated && target.tera) targetTypes = [target.tera];
    const eff = getEffectiveness(moveType, targetTypes);
    if (eff === 0) return 0;

    // Doubles spread nerf (Earthquake, Rock Slide, Heat Wave, etc.)
    const spreadMoves = ['Earthquake','Rock Slide','Heat Wave','Eruption','Hyper Voice','Dazzling Gleam','Moonblast','Discharge','Blizzard','Surf'];
    const spreadMult = spreadMoves.includes(move) ? 0.75 : 1.0;

    // Multiscale
    let multiscale = 1;
    if (target.multiscaleActive && target.hp === target.maxHp) multiscale = 0.5;

    // Base damage formula
    const baseDmg = Math.floor((Math.floor((2 * 50 / 5 + 2) * bp * atk / def) / 50) + 2);

    // Issue #2 FIX: use seeded rng() instead of Math.random()
    const roll = 0.85 + rng() * 0.15;

    const total = Math.floor(baseDmg * stab * eff * spreadMult * multiscale * lifeOrbMult * roll);
    return Math.max(1, total);
  }

  applyDamage(dmg, source) {
    // Issue #8 FIX: snapshot full-HP status BEFORE applying damage.
    // The old check (this.hp + dmg === this.maxHp) ran after hp was already 0 — always wrong.
    const wasFullHp = this.hp === this.maxHp;

    // Rocky Helmet recoil — handled in engine after hit
    this.hp = Math.max(0, this.hp - dmg);

    // Multiscale breaks on any damage
    if (dmg > 0) this.multiscaleActive = false;

    // Focus Sash: activates only from full HP on a would-be KO
    if (this.item === 'Focus Sash' && !this.itemConsumed && wasFullHp && this.hp <= 0) {
      this.hp = 1;
      this.alive = true;
      this.itemConsumed = true;
      return; // stop further processing — mon survived
    }

    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }

    // Sitrus Berry
    if (this.item === 'Sitrus Berry' && !this.itemConsumed && this.hp < this.maxHp / 2 && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp / 4));
      this.itemConsumed = true;
    }

    // Issue #11: Life Orb recoil — 1/10 max HP after dealing damage
    if (source && source.item === 'Life Orb' && !source.itemConsumed && dmg > 0) {
      const recoil = Math.floor(source.maxHp / 10);
      source.hp = Math.max(0, source.hp - recoil);
      if (source.hp <= 0) { source.alive = false; source.hp = 0; }
    }
    // White Herb consumed on stat drop — handled separately
  }

  applyRecoil(fraction) {
    const dmg = Math.floor(this.maxHp * fraction);
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp <= 0) { this.alive = false; this.hp = 0; }
  }

  heal(fraction) {
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp * fraction));
    if (!this.alive && this.hp > 0) this.alive = true;
  }

  applyStatus(status) {
    if (this.status) return false; // already statused
    if (status === 'burn' && (this.types.includes('Fire') || this.ability === 'Water Veil')) return false;
    if (status === 'paralysis' && this.types.includes('Electric')) return false;
    if (status === 'poison' && (this.types.includes('Poison') || this.types.includes('Steel'))) return false;
    if (status === 'sleep' && this.ability === 'Sweet Veil') return false;
    this.status = status;
    this.statusTurns = 0;
    return true;
  }

  // Issue #2 FIX: endOfTurn now receives rng from simulateBattle scope
  endOfTurn(field, rng) {
    const msgs = [];
    if (!this.alive) return msgs;
    if (this.status === 'burn') {
      const dmg = Math.floor(this.maxHp / 16);
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp <= 0) { this.alive = false; msgs.push(`${this.name} fainted from burn`); }
      else msgs.push(`${this.name} hurt by burn`);
    }
    if (this.status === 'poison') {
      this.statusTurns++;
      const dmg = Math.floor(this.maxHp / 8);
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp <= 0) { this.alive = false; msgs.push(`${this.name} fainted from poison`); }
    }
    if (this.status === 'sleep') {
      this.statusTurns++;
      // Issue #2 FIX: use seeded rng() instead of Math.random()
      if (this.statusTurns >= 2 + Math.floor(rng() * 2)) { this.status = null; msgs.push(`${this.name} woke up`); }
    }
    // Leftovers
    if (this.item === 'Leftovers' && !this.itemConsumed) {
      this.hp = Math.min(this.maxHp, this.hp + Math.floor(this.maxHp / 16));
    }
    // Solar Power damage in sun
    if (this.ability === 'Solar Power' && field.weather === 'sun') {
      const dmg = Math.floor(this.maxHp / 8);
      this.hp = Math.max(0, this.hp - dmg);
      if (this.hp <= 0) { this.alive = false; }
    }
    // Sand damage
    if (field.weather === 'sand') {
      const sandImmune = ['Rock','Ground','Steel'];
      if (!sandImmune.some(t => this.types.includes(t))) {
        const dmg = Math.floor(this.maxHp / 16);
        this.hp = Math.max(0, this.hp - dmg);
        if (this.hp <= 0) { this.alive = false; msgs.push(`${this.name} buffeted by sand`); }
      }
    }
    return msgs;
  }
}

class Field {
  constructor() {
    this.weather = 'clear'; // clear, sun, rain, sand, hail
    this.weatherTurns = 0;
    this.trickRoom = false;
    this.trickRoomTurns = 0;
    this.tailwind = { player: false, opponent: false };
    this.tailwindTurns = { player: 0, opponent: 0 };
    this.reflect = { player: false, opponent: false };
    this.lightScreen = { player: false, opponent: false };
    this.reflectTurns = { player: 0, opponent: 0 };
    this.lightScreenTurns = { player: 0, opponent: 0 };
    this.turn = 0;
    this.log = [];
  }

  setWeather(type, permanent) {
    this.weather = type;
    this.weatherTurns = permanent ? 999 : 8;
  }

  endOfTurn() {
    this.turn++;
    if (this.weatherTurns > 0 && this.weatherTurns < 999) {
      this.weatherTurns--;
      if (this.weatherTurns === 0) this.weather = 'clear';
    }
    if (this.trickRoom) {
      this.trickRoomTurns++;
      if (this.trickRoomTurns >= 5) { this.trickRoom = false; this.trickRoomTurns = 0; }
    }
    for (const side of ['player','opponent']) {
      if (this.tailwind[side]) {
        this.tailwindTurns[side]++;
        if (this.tailwindTurns[side] >= 4) { this.tailwind[side] = false; this.tailwindTurns[side] = 0; }
      }
      if (this.reflect[side]) {
        this.reflectTurns[side]++;
        if (this.reflectTurns[side] >= 5) { this.reflect[side] = false; }
      }
      if (this.lightScreen[side]) {
        this.lightScreenTurns[side]++;
        if (this.lightScreenTurns[side] >= 5) { this.lightScreen[side] = false; }
      }
    }
  }

  log_(msg) { this.log.push(msg); }
}

// ============================================================
// BATTLE SIMULATION — 4v4 Doubles
// ============================================================

function simulateBattle(playerTeam, oppTeam, opts = {}) {
  // Issue #5 FIX: validate both teams before any simulation begins
  const pVal = validateTeam(playerTeam, 'vgc');
  const oVal = validateTeam(oppTeam, 'vgc');
  if (!pVal.valid) {
    return {
      result: 'error',
      validationErrors: { player: pVal.errors, opponent: oVal.errors },
      validationWarnings: { player: pVal.warnings, opponent: oVal.warnings },
      log: [`VALIDATION ERROR (Player): ${pVal.errors.join(' | ')}`],
      turns: 0, trTurns: 0, winCondition: 'Invalid team'
    };
  }
  if (!oVal.valid) {
    return {
      result: 'error',
      validationErrors: { player: pVal.errors, opponent: oVal.errors },
      validationWarnings: { player: pVal.warnings, opponent: oVal.warnings },
      log: [`VALIDATION ERROR (Opponent): ${oVal.errors.join(' | ')}`],
      turns: 0, trTurns: 0, winCondition: 'Invalid team'
    };
  }

  // Issue #2 FIX: initialise seeded PRNG for this battle.
  // Caller may supply opts.seed = [a,b,c,d]; otherwise auto-generate.
  const seed = opts.seed || makeSeed();
  const rng = makePRNG(seed);

  const field = new Field();
  const log = [];

  // Attach validation warnings to log (non-blocking)
  for (const w of [...pVal.warnings, ...oVal.warnings]) {
    log.push(`<span class="log-warn">⚠ Legality warning: ${w}</span>`);
  }

  // Build Pokemon instances
  const pTeam = playerTeam.members.map(m => new Pokemon(m, playerTeam.style));
  const oTeam = oppTeam.members.map(m => new Pokemon(m, oppTeam.style));

  // Choose leads
  function chooseLead(team, teamObj) {
    const style = teamObj.style;
    if (style === 'trick_room') {
      const setter = team.find(p => p.moves.includes('Trick Room') && p.alive);
      const ragePowder = team.find(p => p.moves.includes('Rage Powder') && p.alive);
      if (setter && ragePowder) return [setter, ragePowder];
    }
    if (style === 'sun' || style === 'sun_tr') {
      const setter = team.find(p => p.moves.includes('Sunny Day') || p.ability === 'Drought' || p.ability === 'Blaze');
      const sweeper = team.find(p => p !== setter && p.alive);
      if (setter) return [setter, sweeper || team[1]];
    }
    if (style === 'rain') {
      const setter = team.find(p => p.ability === 'Drizzle' || p.moves.includes('Rain Dance'));
      const sweeper = team.find(p => p !== setter && p.alive);
      if (setter) return [setter, sweeper || team[1]];
    }
    if (style === 'sand') {
      const setter = team.find(p => p.ability === 'Sand Stream');
      const rusher = team.find(p => p.ability === 'Sand Rush');
      if (setter && rusher) return [setter, rusher];
    }
    return [team[0], team[1]];
  }

  const [pA, pB] = chooseLead(pTeam, playerTeam);
  const [oA, oB] = chooseLead(oTeam, oppTeam);

  let active = {
    player: [pA, pB].filter(Boolean),
    opponent: [oA, oB].filter(Boolean)
  };

  function processEntryAbilities(mon, side) {
    if (!mon) return;
    if (mon.ability === 'Drought') field.setWeather('sun', false);
    if (mon.ability === 'Drizzle') field.setWeather('rain', false);
    if (mon.ability === 'Sand Stream') field.setWeather('sand', true);
    if (mon.ability === 'Snow Warning') field.setWeather('hail', false);
    if (mon.ability === 'Intimidate') {
      for (const opp of active.opponent) {
        if (!opp.alive) continue;
        opp.statBoosts.atk = Math.max(-6, (opp.statBoosts.atk||0) - 1);
      }
    }
    if (mon.hospitality) {
      const ally = active[side].find(a => a !== mon && a.alive);
      if (ally) ally.heal(0.25);
    }
  }

  for (const m of active.player) if (m) processEntryAbilities(m, 'player');
  for (const m of active.opponent) if (m) processEntryAbilities(m, 'opponent');

  let trickRoomTurnsActive = 0;
  let battleResult = null;
  let winCondition = '';

  // ---- MOVE DECISION AI ----
  function chooseMove(mon, allies, opponents, isPlayer) {
    if (!mon.alive) return null;
    const alive_opps = opponents.filter(o => o && o.alive);
    const alive_allies = allies.filter(a => a && a.alive && a !== mon);
    if (alive_opps.length === 0) return null;

    // Fake Out
    if (mon.moves.includes('Fake Out') && !mon.hasActed && alive_opps.length > 0) {
      const target = alive_opps.reduce((a,b) => a.hp < b.hp ? a : b);
      return { move: 'Fake Out', target, priority: 3 };
    }

    // TR prevention
    if (isPlayer && field.trickRoom === false) {
      const trSetter = alive_opps.find(o => o.moves.includes('Trick Room'));
      if (trSetter) {
        if (mon.moves.includes('Will-O-Wisp')) {
          return { move: 'Will-O-Wisp', target: trSetter, priority: 0 };
        }
        const atkMove = mon.moves.find(m => ['Power Gem','Head Smash','Flare Blitz','Earthquake','Dragon Claw','Thunderbolt','Hydro Pump','Moonblast'].includes(m));
        if (atkMove) return { move: atkMove, target: trSetter, priority: 0 };
      }
    }

    // Issue #2 FIX: all AI probability rolls use seeded rng()
    // Protect
    if (mon.moves.includes('Protect') && mon.hp < mon.maxHp * 0.4 && rng() < 0.35) {
      return { move: 'Protect', target: mon, priority: 4 };
    }

    // Trick Room (opponent AI)
    if (!isPlayer && mon.moves.includes('Trick Room') && !field.trickRoom && alive_allies.length > 0 && rng() < 0.85) {
      return { move: 'Trick Room', target: null, priority: -7 };
    }

    // Tailwind / weather setup
    if (mon.moves.includes('Tailwind') && !field.tailwind[isPlayer?'player':'opponent'] && rng() < 0.7) {
      return { move: 'Tailwind', target: null, priority: 0 };
    }
    if (mon.moves.includes('Sunny Day') && field.weather !== 'sun' && !['Drizzle','Sand Stream'].includes(alive_allies[0]?.ability)) {
      if (rng() < 0.6) return { move: 'Sunny Day', target: null, priority: 0 };
    }
    if (mon.moves.includes('Rain Dance') && field.weather !== 'rain' && rng() < 0.6) {
      return { move: 'Rain Dance', target: null, priority: 0 };
    }

    // Rage Powder
    if (mon.moves.includes('Rage Powder') && alive_allies.length > 0) {
      const needsProtection = alive_allies.find(a => a.hp < a.maxHp * 0.6);
      if (needsProtection && rng() < 0.6) {
        return { move: 'Rage Powder', target: mon, priority: 0 };
      }
    }

    // Parting Shot
    if (mon.moves.includes('Parting Shot') && mon.hp < mon.maxHp * 0.5) {
      const target = alive_opps[0];
      return { move: 'Parting Shot', target, priority: 0 };
    }

    // Best damaging move
    let bestMove = null, bestDmg = -1, bestTarget = null;
    for (const move of mon.moves) {
      if (['Protect','Tailwind','Trick Room','Sunny Day','Rain Dance','Life Dew','Rage Powder',
           'Parting Shot','Roost','Reflect','Light Screen','Recover','Shed Tail',
           'Helping Hand','Ally Switch','Lunar Dance','Fake Out','Thunder Wave','Sleep Powder',
           'Will-O-Wisp'].includes(move)) continue;
      for (const t of alive_opps) {
        // Issue #2 FIX: pass rng to calcDamage for move-selection look-ahead
        const dmg = mon.calcDamage(move, t, field, null, rng);
        if (dmg > bestDmg) { bestDmg = dmg; bestMove = move; bestTarget = t; }
      }
    }

    if (!bestMove) {
      bestMove = mon.moves.find(m => !['Protect'].includes(m)) || mon.moves[0];
      bestTarget = alive_opps[0];
    }

    return { move: bestMove, target: bestTarget, priority: 0 };
  }

  // ---- EXECUTE MOVE ----
  function executeMove(mon, decision, allies, opponents, side, logLines) {
    if (!mon || !mon.alive || !decision) return;
    const { move, target } = decision;

    // Issue #17 FIX: Gen 9 paralysis does NOT skip turns — speed halving only.
    // The 25% skip block has been removed entirely.
    // Sleep skip
    if (mon.status === 'sleep') {
      logLines.push(`  ${mon.name} is fast asleep.`);
      return;
    }

    mon.hasActed = true;
    const aliveOpps = opponents.filter(o => o.alive);
    const aliveAllies = allies.filter(a => a.alive && a !== mon);

    // -- STATUS / SUPPORT MOVES --
    if (move === 'Protect') {
      mon._protected = true;
      logLines.push(`  ${mon.name} used Protect`);
      return;
    }
    if (move === 'Trick Room') {
      field.trickRoom = !field.trickRoom;
      field.trickRoomTurns = 0;
      trickRoomTurnsActive += field.trickRoom ? 1 : 0;
      logLines.push(`  <span class="log-tr">${mon.name} set up Trick Room! Field is now ${field.trickRoom ? 'SLOW-FIRST' : 'NORMAL'}</span>`);
      return;
    }
    if (move === 'Tailwind') {
      field.tailwind[side] = true; field.tailwindTurns[side] = 0;
      logLines.push(`  ${mon.name} whipped up Tailwind for ${side}`);
      return;
    }
    if (move === 'Sunny Day' || (mon.ability === 'Drought')) {
      field.setWeather('sun', mon.ability === 'Drought');
      logLines.push(`  ${mon.name} used Sunny Day — Sun is harsh!`);
      return;
    }
    if (move === 'Rain Dance') {
      field.setWeather('rain', false);
      logLines.push(`  ${mon.name} used Rain Dance — Rain started!`);
      return;
    }
    if (move === 'Will-O-Wisp') {
      if (target && target.alive) {
        if (target.applyStatus('burn')) logLines.push(`  ${mon.name} burned ${target.name}!`);
        else logLines.push(`  Will-O-Wisp failed on ${target.name}`);
      }
      return;
    }
    if (move === 'Thunder Wave') {
      if (target && target.alive) {
        if (target.applyStatus('paralysis')) logLines.push(`  ${mon.name} paralyzed ${target.name}!`);
      }
      return;
    }
    if (move === 'Sleep Powder') {
      // Issue #2 FIX: use seeded rng()
      if (target && target.alive && rng() < 0.75) {
        if (target.applyStatus('sleep')) logLines.push(`  ${target.name} fell asleep!`);
      }
      return;
    }
    if (move === 'Parting Shot') {
      if (target && target.alive) {
        target.statBoosts.atk = Math.max(-6, (target.statBoosts.atk||0) - 1);
        target.statBoosts.spa = Math.max(-6, (target.statBoosts.spa||0) - 1);
        logLines.push(`  ${mon.name} used Parting Shot on ${target.name} then switched`);
        mon.alive = false; // simplified pivot out
      }
      return;
    }
    if (move === 'Rage Powder') {
      mon._ragePowder = true;
      logLines.push(`  ${mon.name} used Rage Powder — drawing attacks!`);
      return;
    }
    if (move === 'Life Dew') {
      for (const a of allies.filter(a => a.alive)) a.heal(0.25);
      logLines.push(`  ${mon.name} used Life Dew — healed team!`);
      return;
    }
    if (move === 'Roost') { mon.heal(0.5); logLines.push(`  ${mon.name} roosted`); return; }
    if (move === 'Recover') { mon.heal(0.5); return; }
    if (move === 'Reflect') {
      field.reflect[side] = true; field.reflectTurns[side] = 0;
      logLines.push(`  Reflect set on ${side}`); return;
    }
    if (move === 'Light Screen') {
      field.lightScreen[side] = true; field.lightScreenTurns[side] = 0;
      logLines.push(`  Light Screen set on ${side}`); return;
    }
    if (move === 'Helping Hand') {
      if (aliveAllies[0]) aliveAllies[0].justUsedHelpingHand = true;
      return;
    }
    if (move === 'Knock Off') {
      if (target && target.alive && target.item && !target.itemConsumed) {
        target.item = null; target.itemConsumed = true;
        logLines.push(`  ${mon.name} knocked off ${target.name}'s item!`);
      }
    }
    if (move === 'Shed Tail') {
      if (aliveAllies[0]) aliveAllies[0].substituteHp = Math.floor(mon.maxHp * 0.25);
      logLines.push(`  ${mon.name} used Shed Tail`); return;
    }
    if (move === 'Ally Switch') { return; }
    if (move === 'Lunar Dance') {
      mon.alive = false; mon.hp = 0;
      logLines.push(`  ${mon.name} used Lunar Dance!`);
      return;
    }
    if (move === 'Fake Out') {
      if (target && target.alive) {
        target._flinched = true;
        // Issue #2 FIX: pass rng to calcDamage
        const dmg = mon.calcDamage(move, target, field, null, rng);
        target.applyDamage(dmg, mon);
        logLines.push(`  ${mon.name} used Fake Out → ${target.name} flinched! (${dmg} dmg)`);
        if (!target.alive) logLines.push(`  <span class="log-ko">${target.name} fainted!</span>`);
      }
      return;
    }

    // -- DAMAGING MOVES --
    if (!target || !target.alive) return;

    if (target._protected) {
      logLines.push(`  ${target.name} protected itself from ${move}`);
      return;
    }

    const spreadMoves = ['Earthquake','Rock Slide','Heat Wave','Eruption','Hyper Voice',
      'Dazzling Gleam','Moonblast','Discharge','Blizzard','Surf','Thunderbolt'];
    const isSpread = spreadMoves.includes(move) && aliveOpps.length > 1 && move !== 'Thunderbolt';

    let hitTargets = [target];
    if (isSpread) {
      hitTargets = opponents.filter(o => o.alive);
    }

    // Electro Shot: charge turn in non-rain
    if (move === 'Electro Shot' && field.weather !== 'rain') {
      if (!mon._electroCharging) {
        mon._electroCharging = true;
        mon.statBoosts.spa = Math.min(6, (mon.statBoosts.spa||0) + 1);
        logLines.push(`  ${mon.name} is charging Electro Shot...`);
        return;
      } else {
        mon._electroCharging = false;
      }
    }

    // Phantom Force two-turn
    if (move === 'Phantom Force' && !mon._phantomTurn) {
      mon._phantomTurn = true;
      mon._invisible = true;
      logLines.push(`  ${mon.name} vanished!`);
      return;
    } else if (mon._phantomTurn) {
      mon._phantomTurn = false;
      mon._invisible = false;
    }

    for (const t of hitTargets) {
      if (!t.alive) continue;
      // Issue #2 FIX: pass rng to calcDamage
      let dmg = mon.calcDamage(move, t, field, null, rng);

      // Screen halving
      const oppSide = side === 'player' ? 'opponent' : 'player';
      if (MOVE_TYPES[move] && ['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Ice','Electric','Dragon','Dark','Fairy'].includes(MOVE_TYPES[move])) {
        const isPhys = ['Earthquake','Rock Slide','Close Combat','High Horsepower','Iron Head','Flash Cannon','Wave Crash','Dragon Darts','Foul Play','Shadow Sneak','Ice Punch','Head Smash','Flare Blitz','Dragon Claw','Fire Fang','Throat Chop','Dire Claw','Phantom Force'].includes(move);
        if (isPhys && field.reflect[oppSide]) dmg = Math.floor(dmg * 0.5);
        if (!isPhys && field.lightScreen[oppSide]) dmg = Math.floor(dmg * 0.5);
      }

      // Substitute intercepts
      if (t.substituteHp > 0) {
        t.substituteHp -= dmg;
        if (t.substituteHp <= 0) { t.substituteHp = 0; logLines.push(`  ${t.name}'s substitute broke!`); }
        continue;
      }

      t.applyDamage(dmg, mon);
      logLines.push(`  ${mon.name} → ${move} → ${t.name}: ${dmg} dmg (${Math.floor(t.hp/t.maxHp*100)}% HP left)`);

      // Rocky Helmet
      if (t.item === 'Rocky Helmet' && !t.itemConsumed) {
        const recoilDmg = Math.floor(mon.maxHp / 6);
        mon.applyDamage(recoilDmg, t);
        logLines.push(`  ${mon.name} hurt by Rocky Helmet (${recoilDmg} dmg)`);
      }

      if (!t.alive) logLines.push(`  <span class="log-ko">${t.name} fainted!</span>`);

      // Life Orb recoil log
      if (mon.item === 'Life Orb' && !mon.itemConsumed && dmg > 0) {
        logLines.push(`  ${mon.name} lost HP from Life Orb recoil`);
        if (!mon.alive) logLines.push(`  <span class="log-ko">${mon.name} fainted from Life Orb recoil!</span>`);
      }

      // Recoil moves
      if (['Flare Blitz','Head Smash','Wave Crash'].includes(move)) {
        const recoil = move === 'Head Smash' ? 0.5 : 0.33;
        mon.applyRecoil(recoil);
        if (!mon.alive) logLines.push(`  <span class="log-ko">${mon.name} fainted from recoil!</span>`);
      }
    }
  }

  // ---- REPLACE FAINTED ----
  function replaceFainted(side, teamArr, activeArr) {
    const bench = teamArr.filter(p => p && p.alive && !activeArr.includes(p));
    for (let i = 0; i < activeArr.length; i++) {
      if (!activeArr[i] || !activeArr[i].alive) {
        const next = bench.shift();
        if (next) {
          activeArr[i] = next;
          if (next.ability === 'Drought') field.setWeather('sun', false);
          if (next.ability === 'Drizzle') field.setWeather('rain', false);
          if (next.ability === 'Sand Stream') field.setWeather('sand', true);
          if (next.ability === 'Intimidate') {
            const oppSide = side === 'player' ? 'opponent' : 'player';
            for (const o of active[oppSide]) {
              if (o && o.alive) o.statBoosts.atk = Math.max(-6, (o.statBoosts.atk||0) - 1);
            }
          }
          if (next.hospitality) {
            const ally = activeArr.find(a => a && a.alive && a !== next);
            if (ally) ally.heal(0.25);
          }
          log.push(`  ${next.name} sent in for ${side}!`);
        } else {
          activeArr[i] = null;
        }
      }
    }
  }

  // ---- MAIN LOOP ----
  const MAX_TURNS = 30;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    field.turn = turn + 1;
    const turnLog = [`<span class="log-turn">--- Turn ${turn+1} | Weather: ${field.weather} | TR: ${field.trickRoom?'ON':'OFF'} | TW-P:${field.tailwind.player?'✓':'✗'} TW-O:${field.tailwind.opponent?'✓':'✗'} ---</span>`];

    for (const side of ['player','opponent']) {
      for (const m of active[side].filter(Boolean)) {
        m.hasActed = false; m._protected = false; m._ragePowder = false; m.justUsedHelpingHand = false; m._flinched = false;
      }
    }

    const actions = [];
    const pActive = active.player.filter(Boolean);
    const oActive = active.opponent.filter(Boolean);
    for (const m of pActive) {
      if (!m.alive) continue;
      const dec = chooseMove(m, pActive, oActive, true);
      if (dec) actions.push({ mon:m, dec, side:'player', allies:pActive, opponents:oActive });
    }
    for (const m of oActive) {
      if (!m.alive) continue;
      const dec = chooseMove(m, oActive, pActive, false);
      if (dec) actions.push({ mon:m, dec, side:'opponent', allies:oActive, opponents:pActive });
    }

    actions.sort((a,b) => {
      const pa = a.dec.priority || 0, pb = b.dec.priority || 0;
      if (pa !== pb) return pb - pa;
      return b.mon.getEffSpeed(field) - a.mon.getEffSpeed(field);
    });

    for (const act of actions) {
      if (!act.mon.alive) continue;
      if (act.mon._flinched) { turnLog.push(`  ${act.mon.name} flinched!`); continue; }
      executeMove(act.mon, act.dec, act.allies, act.opponents, act.side, turnLog);
    }

    const allActive = [...active.player.filter(Boolean), ...active.opponent.filter(Boolean)].filter(m => m.alive);
    for (const m of allActive) {
      // Issue #2 FIX: pass rng to endOfTurn
      const eotMsgs = m.endOfTurn(field, rng);
      for (const msg of eotMsgs) turnLog.push(`  ${msg}`);
    }
    field.endOfTurn();

    log.push(...turnLog);

    replaceFainted('player', pTeam, active.player);
    replaceFainted('opponent', oTeam, active.opponent);

    const pAlive = pTeam.filter(p => p && p.alive).length;
    const oAlive = oTeam.filter(o => o && o.alive).length;

    if (pAlive === 0 && oAlive === 0) { battleResult = 'draw'; break; }
    if (pAlive === 0) { battleResult = 'loss'; break; }
    if (oAlive === 0) { battleResult = 'win'; break; }
  }

  if (!battleResult) {
    const pHp = pTeam.filter(p=>p&&p.alive).reduce((s,p) => s + p.hp/p.maxHp, 0);
    const oHp = oTeam.filter(o=>o&&o.alive).reduce((s,o) => s + o.hp/o.maxHp, 0);
    battleResult = pHp > oHp ? 'win' : pHp < oHp ? 'loss' : 'draw';
  }

  if (battleResult === 'win') {
    winCondition = field.tailwind.player ? 'Tailwind Sweep' :
                   log.some(l => l.includes('Trick Room') && l.includes('NORMAL')) ? 'TR Broken' :
                   log.some(l => l.includes('Power Gem') || l.includes('Head Smash')) ? 'Arcanine Punch' :
                   log.some(l => l.includes('Earthquake')) ? 'Garchomp Ground' :
                   log.some(l => l.includes('Parting Shot')) ? 'Incineroar Pivot' :
                   log.some(l => l.includes('Fake Out')) ? 'Priority Pressure' : 'Speed Advantage';
  }

  return {
    result: battleResult,
    seed,                  // Issue #2: seed returned for reproducibility auditing
    turns: field.turn,
    trTurns: trickRoomTurnsActive,
    winCondition,
    validationWarnings: { player: pVal.warnings, opponent: oVal.warnings },
    log: log.slice(0, 150),
  };
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
