// ============================================================
// BATTLE ENGINE — VGC Doubles Simulator
// Simulates VGC-style 4v4 doubles with priority, speed tiers,
// weather, Trick Room, Intimidate, and damage variance
// ============================================================

// ============================================================
// CHAMPIONS REG M-A MECHANICS REFERENCE (T10, verified April 2026)
// See docs/CHAMPIONS_MEGA_SYSTEM.md + docs/CHAMPIONS_LEGALITY.md +
// CHAMPIONS_MECHANICS_VERIFICATION.md + ENGINE_AUDIT_REPORT.md for
// full audit. Engine hooks for the behaviors below are DEFERRED;
// this block documents target behavior for future engine tickets.
//
// Stat formula (IMPLEMENTED in T1):
//   HP     = Base + SP + 75
//   Other  = floor((Base + SP + 20) * Alignment)
//   Alignment = 0.9 (lowered) | 1.0 (neutral) | 1.1 (raised)
//   All IVs fixed at 31.
//
// Status nerfs (IMPLEMENTED — see canInflictStatus + getStat + end-of-turn):
//   Paralysis full-para: 12.5%  (was 25%). Speed -50% unchanged.
//   Sleep:  max 3 turns  (T1 cant act, T2 33% wake, T3 guaranteed).
//   Freeze: 25% thaw/turn, guaranteed thaw T3. Sun thaws.
//   Frostbite (T9j.17): 1/16 chip, SpA halved, no action skip.
//     Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
//   Toxic ramp: N/16 escalating, capped at N=15.
//
// Doubles:
//   Spread modifier 0.75x; spread MUST hit all valid targets.
//   Fake Out (T9j.17 hard-gate): cannot be selected past first turn out;
//     resets on switch-in. Encore->Struggle handled in executeAction.
//   Protect PP halved 16 -> 8.
//
// Ability nerfs (flags in data.js::CHAMPIONS_UPDATED_ABILITIES):
//   Unseen Fist:   25% damage through Protect (was 100%).
//   Parental Bond: child hit 1/4 power (was 1/2). T9j.8 inline 2-strike loop.
//   Protean:       fires once per entry (was every move).
//
// New abilities (data.js::CHAMPIONS_NEW_ABILITIES):
//   Piercing Drill (Mega Excadrill): 25% miss chance on every move (T9j.17).
//     Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
//   Dragonize (Mega Feraligatr):     Normal -> Dragon, +20% BP.
//   Mega Sol (Mega Meganium):        personal sun, no weather set.
//   Spicy Spray (Mega Scovillain):   burn attacker on any damage taken.
//
// T9j.17 move/item additions:
//   Expanding Force x Psychic Terrain: grounded user spreads to all foes
//     and gains 1.5x BP. Cite: https://bulbapedia.bulbagarden.net/wiki/Expanding_Force_(move)
//   Terrain Seeds (Grassy/Electric +1 Def, Psychic/Misty +1 SpD): consume
//     on switch-in to matching terrain. Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed
//
// Items NOT in Champions (enforced in legality.js::CHAMPIONS_BANNED_ITEMS):
//   Life Orb, Choice Band/Specs, Assault Vest, Rocky Helmet, HDB,
//   Black Sludge, Eviolite, Light Clay, weather rocks, Terrain Extender,
//   Toxic Orb, Flame Orb.
//
// Sources:
//   https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
//   https://www.serebii.net/pokemonchampions/statusconditions.shtml
//   https://www.serebii.net/pokemonchampions/newabilities.shtml
//   https://www.serebii.net/pokemonchampions/updatedabilities.shtml
//   https://bulbapedia.bulbagarden.net/wiki/Stat_point
//   https://game8.co/games/Pokemon-Champions/archives/588871
//   https://victoryroad.pro/champions-regulations/
// ============================================================

var CHAMPIONS_FORMAT_ID = 'champions-vgc-2026-regma';
var CHAMPIONS_ACTIVE_SOURCE_RULESET_ID = 'champions_reg_m_b_doubles_bo3_source_review';
var CHAMPIONS_ACTIVE_SOURCE_FORMAT_LABEL = 'Champions Reg M-B Source Review (Jun 17 - Sep 2, 2026)';
var CHAMPIONS_FORMAT_LABEL = 'Champions Reg M-A Historical Lane (Apr 8 - Jun 17, 2026)';

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
// TEAM LEGALITY VALIDATOR — Issue #5 + #T2
// Called before every simulateBattle() invocation.
// Blocks on errors, warns on warnings.
//
// #T2 updates:
//   - Dual-format stat caps: Champions SP (<=32/stat, <=66 total)
//     vs SV EV (<=252/stat, <=510 total). Detects per team.
//   - Species Clause and Item Clause upgraded from warning -> ERROR
//     (VGC/Champions rules: both are hard bans, not soft recommendations).
//   - Optional Champions legality layer (ban list, fakemon) wired in
//     via validateChampionsLegality() if legality.js is loaded.
// ============================================================
function detectSpreadStatFormat(evs) {
  const vals = Object.values(evs || {});
  if (vals.length === 0) return 'sv';
  const total = vals.reduce((a, b) => a + b, 0);
  const max = Math.max(...vals);
  if (total === 0) return 'sv';
  if (max <= 32 && total <= 66) return 'champions';
  return 'sv';
}

function spreadFitsChampions(evs) {
  return validateChampionsSpread(evs).length === 0;
}

function validateChampionsSpread(evs, label = 'Pokemon') {
  const errors = [];
  if (evs != null && (typeof evs !== 'object' || Array.isArray(evs))) {
    return [`${label}: Champion SP spread must be a stat object (hp/atk/def/spa/spd/spe).`];
  }
  const spread = evs || {};
  const statKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  let total = 0;
  for (const stat of statKeys) {
    const raw = spread[stat] == null ? 0 : spread[stat];
    const val = Number(raw);
    if (!Number.isFinite(val)) {
      errors.push(`${label}: ${stat} SP is not a number (got ${raw})`);
      continue;
    }
    if (!Number.isInteger(val)) errors.push(`${label}: ${stat} SP must be an integer (got ${val})`);
    total += val;
    if (val > 32) errors.push(`${label}: ${stat} SP exceeds 32 (got ${val}) [champions format]`);
    if (val < 0) errors.push(`${label}: ${stat} SP is negative (got ${val})`);
  }
  if (total > 66) errors.push(`${label}: SPs exceed 66 (got ${total}) [champions format]`);
  return errors;
}

function resolveMonStatFormat(mon, teamFormat) {
  const declaredFmt = teamFormat || (mon && mon.format) || null;
  if (declaredFmt === 'champions' && !spreadFitsChampions((mon && mon.evs) || {})) {
    return { statFormat: 'sv', formatMismatch: true, declaredFormat: declaredFmt };
  }
  return {
    statFormat: declaredFmt || detectSpreadStatFormat((mon && mon.evs) || {}),
    formatMismatch: false,
    declaredFormat: declaredFmt
  };
}

function validateTeam(team, format = 'vgc') {
  const errors = [];
  const warnings = [];
  if (!team || !team.members || team.members.length === 0) {
    errors.push('Team has no members.');
    return { valid: false, errors, warnings };
  }

  for (const mon of team.members) {
    const name = mon.name || 'Unknown';
    const declaredFmt = team.format || mon.format || null;
    const declaredChampions = declaredFmt === 'champions';
    const resolved = declaredChampions
      ? { statFormat: 'champions', formatMismatch: false, declaredFormat: declaredFmt }
      : resolveMonStatFormat(mon, team.format);
    const fmt = resolved.statFormat;
    const caps = fmt === 'champions'
      ? { perStat: 32, total: 66, label: 'SP' }
      : { perStat: 252, total: 510, label: 'EV' };

    if (declaredChampions) {
      errors.push(...validateChampionsSpread(mon.evs || {}, name));
    } else if (resolved.formatMismatch) {
      errors.push(`${name}: declared Champions but spread is SV-scale; Champion teams must use Stat Points (max 32 per stat, 66 total)`);
    }

    // Total cap
    const totalPoints = Object.values(mon.evs || {}).reduce((a, b) => a + b, 0);
    if (!declaredChampions && totalPoints > caps.total) {
      errors.push(`${name}: ${caps.label}s exceed ${caps.total} (got ${totalPoints}) [${fmt} format]`);
    }
    // Individual cap
    for (const [stat, val] of Object.entries(mon.evs || {})) {
      if (!declaredChampions && val > caps.perStat) errors.push(`${name}: ${stat} ${caps.label} exceeds ${caps.perStat} (got ${val}) [${fmt} format]`);
      if (!declaredChampions && val < 0)            errors.push(`${name}: ${stat} ${caps.label} is negative (got ${val})`);
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

  // #T2: Species Clause is a hard ban in VGC/Champions, not a warning.
  // Same National Dex # (and regional forms share dex #s) not allowed twice.
  const names = team.members.map(m => m.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) errors.push(`Species Clause violation: duplicate Pokemon: ${[...new Set(dupes)].join(', ')}`);

  // #T2: Item Clause is also a hard ban ("no two Pokemon may hold the same item").
  const items = team.members.map(m => m.item).filter(Boolean);
  const dupeItems = items.filter((it, i) => items.indexOf(it) !== i);
  if (dupeItems.length > 0) errors.push(`Item Clause violation: duplicate items: ${[...new Set(dupeItems)].join(', ')}`);

  // #T2: Optional Champions-specific legality (ban list + fakemon) — only
  // runs if legality.js has been loaded and team is declared Champions format.
  if ((team.format === 'champions' || format === 'champions')
      && typeof validateChampionsLegality === 'function') {
    const champ = validateChampionsLegality(team);
    if (champ && Array.isArray(champ.violations)) {
      for (const v of champ.violations) {
        if (v.severity === 'error') errors.push(v.message);
        else                        warnings.push(v.message);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// T9j.8 — CRITICAL HITS, FLINCH, AND ABILITIES FRAMEWORK
// Refs #27 (crits), #19 (flinch), #30 (abilities).
// All tables are `var` for TDZ-safety (referenced from Pokemon methods).
//
// CRIT_STAGES: Gen 9 crit probability ladder.
//   Stage 0 = 1/24 ≈ 4.17%, Stage 1 = 1/8 = 12.5%, Stage 2 = 1/2, Stage 3+ = always.
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Critical_hit
// HIGH_CRIT_MOVES: moves that START at stage 1 instead of 0. Narrow Champions list.
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Critical_hit#High_critical-hit_ratio_moves
// ALWAYS_CRIT_MOVES: +3 stage floor (always crit). Frost Breath / Storm Throw.
//
// CRIT BYPASS RULES (applied in calcDamage when crit lands):
//   - Attacker's NEGATIVE Atk/SpA stages ignored (taken as 0).
//   - Defender's POSITIVE Def/SpD stages ignored (taken as 0).
//   - Screens (Reflect/Light Screen/Aurora Veil) bypassed — screenMod = 1.
//   - Burn STILL halves physical Atk on crit (Gen 6+ rule — verified Bulbapedia).
//   - Final damage × 1.5 (Gen 6+; was × 2 in earlier gens).
//
// FLINCH_MOVES: secondary-effect flinch chances. Data-driven per Bulbapedia
// per-move pages and Pokemon Champions nerfs:
//   Iron Head: 20% in Champions (nerfed from Gen 9's 30%).
//     Cite: https://www.serebii.net/pokemonchampions/updatedattacks.shtml
//     Cite: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions
//   Rock Slide / Air Slash / Bite: 30% (unchanged).
//   Zen Headbutt: 20%. Fire/Ice/Thunder Fang: 10% flinch (+10% independent status).
//   Dark Pulse / Twister / Icicle Crash / Waterfall: secondary flinch retained.
//   Cite: https://game8.co/games/Pokemon-Champions/archives/590527 (move list)
// ============================================================
var CRIT_STAGES = [1/24, 1/8, 1/2, 1, 1]; // index by clamped stage
var HIGH_CRIT_MOVES = new Set([
  // Gen 9 +1 stage list. Champions retains standard list per Game8 move pages.
  'Night Slash','Cross Poison','Drill Run','Stone Edge','Leaf Blade',
  'Psycho Cut','Slash','Shadow Claw','Attack Order','Spacial Rend','Blaze Kick'
]);
var ALWAYS_CRIT_MOVES = new Set(['Frost Breath','Storm Throw','Surging Strikes']);
var FLINCH_MOVES = {
  'Rock Slide':   { chance: 0.30 },
  'Iron Head':    { chance: 0.20 }, // Champions nerf (30% -> 20%)
  'Air Slash':    { chance: 0.30 },
  'Bite':         { chance: 0.30 },
  'Zen Headbutt': { chance: 0.20 },
  'Fire Fang':    { chance: 0.10 },
  'Ice Fang':     { chance: 0.10 },
  'Thunder Fang': { chance: 0.10 },
  'Dark Pulse':   { chance: 0.20 },
  'Twister':      { chance: 0.20 },
  'Icicle Crash': { chance: 0.30 },
  'Waterfall':    { chance: 0.20 },
  'Astonish':     { chance: 0.30 },
  'Extrasensory': { chance: 0.10 },
  'Heart Stamp':  { chance: 0.30 },
  'Needle Arm':   { chance: 0.30 },
  'Bone Club':    { chance: 0.10 },
  'Headbutt':     { chance: 0.30 },
  'Rolling Kick': { chance: 0.30 },
  'Stomp':        { chance: 0.30 }
};

var SOUND_MOVES = new Set([
  'Bug Buzz','Clanging Scales','Clangorous Soul','Disarming Voice',
  'Echoed Voice','Eerie Spell','Hyper Voice','Metal Sound','Noble Roar',
  'Overdrive','Parting Shot','Perish Song','Psychic Noise','Roar',
  'Round','Sing','Snarl','Sparkling Aria','Torch Song','Uproar'
]);

var SHEER_FORCE_MOVES = new Set([
  'Air Slash','Ancient Power','Bite','Blizzard','Body Slam','Bug Buzz',
  'Charge Beam','Crunch','Dark Pulse','Discharge','Dragon Rush','Earth Power',
  'Energy Ball','Extrasensory','Fire Blast','Fire Fang','Flamethrower',
  'Flash Cannon','Focus Blast','Heat Wave','Hurricane','Hyper Fang',
  'Ice Beam','Ice Fang','Icicle Crash','Icy Wind','Iron Head','Lava Plume',
  'Lunge','Meteor Mash','Moonblast','Muddy Water','Needle Arm','Poison Jab',
  'Psychic','Psychic Noise','Rock Slide','Rock Tomb','Scald','Scorching Sands',
  'Seed Flare','Shadow Ball','Sludge Bomb','Sludge Wave','Snarl','Thunder',
  'Thunder Fang','Thunderbolt','Tri Attack','Twister','Waterfall','Zen Headbutt',
  'Dire Claw','Matcha Gotcha'
]);

var SECONDARY_EFFECTS = {
  'Breaking Swipe':   { chance: 1.00, targetStages: { atk: -1 } },
  'Blizzard':         { chance: 0.10, status: 'frozen' },
  'Bulldoze':         { chance: 1.00, targetStages: { spe: -1 } },
  'Burning Jealousy': { chance: 1.00, conditionalStatus: 'burn', condition: 'targetStatsRaisedThisTurn' },
  'Crunch':           { chance: 0.20, targetStages: { def: -1 } },
  'Diamond Storm':    { chance: 0.50, selfStages: { def: 2 } },
  'Earth Power':      { chance: 0.10, targetStages: { spd: -1 } },
  'Energy Ball':      { chance: 0.10, targetStages: { spd: -1 } },
  'Discharge':        { chance: 0.30, status: 'paralysis' },
  'Fire Fang':        { chance: 0.10, status: 'burn' },
  'Fire Punch':       { chance: 0.10, status: 'burn' },
  'Flamethrower':     { chance: 0.10, status: 'burn' },
  'Flare Blitz':      { chance: 0.10, status: 'burn' },
  'Flash Cannon':     { chance: 0.10, targetStages: { spd: -1 } },
  'Focus Blast':      { chance: 0.10, targetStages: { spd: -1 } },
  'Freeze-Dry':       { chance: 0.10, status: 'frozen' },
  'Gunk Shot':        { chance: 0.30, status: 'poison' },
  'Heat Wave':        { chance: 0.10, status: 'burn' },
  'Hurricane':        { chance: 0.30, volatile: 'confusion' },
  'Ice Beam':         { chance: 0.10, status: 'frozen' },
  'Ice Fang':         { chance: 0.10, status: 'frozen' },
  'Ice Punch':        { chance: 0.10, status: 'frozen' },
  'Icy Wind':         { chance: 1.00, targetStages: { spe: -1 } },
  'Infernal Parade':  { chance: 0.30, status: 'burn' },
  'Lava Plume':       { chance: 0.30, status: 'burn' },
  'Liquidation':      { chance: 0.20, targetStages: { def: -1 } },
  'Lunge':            { chance: 1.00, targetStages: { atk: -1 } },
  'Moonblast':        { chance: 0.30, targetStages: { spa: -1 } },
  'Muddy Water':      { chance: 0.30, targetStages: { acc: -1 } },
  'Mystical Fire':    { chance: 1.00, targetStages: { spa: -1 } },
  'Night Daze':       { chance: 0.40, targetStages: { acc: -1 } },
  'Play Rough':       { chance: 0.10, targetStages: { atk: -1 } },
  'Poison Jab':       { chance: 0.30, status: 'poison' },
  'Psychic':          { chance: 0.10, targetStages: { spd: -1 } },
  'Psyshield Bash':   { chance: 1.00, selfStages: { def: 1 } },
  'Rock Tomb':        { chance: 1.00, targetStages: { spe: -1 } },
  'Scald':            { chance: 0.30, status: 'burn' },
  'Scorching Sands':  { chance: 0.30, status: 'burn' },
  'Shadow Ball':      { chance: 0.20, targetStages: { spd: -1 } },
  'Sludge Bomb':      { chance: 0.30, status: 'poison' },
  'Sludge Wave':      { chance: 0.10, status: 'poison' },
  'Snarl':            { chance: 1.00, targetStages: { spa: -1 } },
  'Spirit Shackle':   { chance: 1.00, volatile: 'trapped' },
  'Throat Chop':      { chance: 1.00, volatile: 'throatChop' },
  'Thunder':          { chance: 0.30, status: 'paralysis' },
  'Thunder Fang':     { chance: 0.10, status: 'paralysis' },
  'Thunder Punch':    { chance: 0.10, status: 'paralysis' },
  'Thunderbolt':      { chance: 0.10, status: 'paralysis' },
  'Trop Kick':        { chance: 1.00, targetStages: { atk: -1 } }
};

// Contact moves — Champions/Gen 9 contact list used by Piercing Drill,
// Unseen Fist, and future contact-triggered hooks (Rough Skin, Iron Barbs).
// Cite: https://bulbapedia.bulbagarden.net/wiki/Contact
// Conservative: every physical contact move present in the engine's move set.
var CONTACT_MOVES = new Set([
  'Fake Out','Flare Blitz','Head Smash','Extreme Speed','Wave Crash',
  'Iron Head','Close Combat','Dire Claw','Ice Punch','Knock Off',
  'Dragon Claw','Phantom Force','Fire Fang','Ice Fang','Thunder Fang',
  'Aqua Jet','Foul Play','Shadow Sneak','Flip Turn','U-turn',
  'First Impression','Trop Kick','Sucker Punch','Kowtow Cleave',
  'Crunch','Stomping Tantrum','Liquidation','Fire Punch','Thunder Punch',
  'Psyshield Bash','High Horsepower','Body Press','Zen Headbutt',
  'Bite','Waterfall','Headbutt','Rolling Kick','Stomp','Needle Arm',
  'Heart Stamp','Wicked Blow','Surging Strikes',
  'Low Kick','Throat Chop','Darkest Lariat','Tackle',
  'Brave Bird','Double-Edge','Wild Charge','Volt Tackle',
  'Wood Hammer','Take Down','Submission','Head Charge'
]);

var MOVE_RECOIL_BY_ID = {
  bravebird:   { numerator: 33, denominator: 100 },
  doubleedge:  { numerator: 33, denominator: 100 },
  flareblitz:  { numerator: 33, denominator: 100 },
  headcharge:  { numerator: 1,  denominator: 4 },
  headsmash:   { numerator: 1,  denominator: 2 },
  lightofruin: { numerator: 1,  denominator: 2 },
  submission:  { numerator: 1,  denominator: 4 },
  takedown:    { numerator: 1,  denominator: 4 },
  volttackle:  { numerator: 33, denominator: 100 },
  wavecrash:   { numerator: 33, denominator: 100 },
  wildcharge:  { numerator: 1,  denominator: 4 },
  woodhammer:  { numerator: 33, denominator: 100 }
};

function _moveId(move) {
  return String(move == null ? '' : move).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function _runtimeDataApi() {
  try {
    var root = (typeof globalThis !== 'undefined') ? globalThis
      : ((typeof window !== 'undefined') ? window : null);
    return root && root.ChampionsSim && root.ChampionsSim.runtimeData
      ? root.ChampionsSim.runtimeData
      : null;
  } catch (_e) {
    return null;
  }
}

function _showdownMoveRow(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveRow === 'function') return api.getMoveRow(move);
  try {
    var root = (typeof globalThis !== 'undefined') ? globalThis
      : ((typeof window !== 'undefined') ? window : null);
    var data = root && root.ChampionsSim && root.ChampionsSim.pokemonDataAudit;
    return data && data.moves ? (data.moves[_moveId(move)] || null) : null;
  } catch (_e) {
    return null;
  }
}

function _showdownSpeciesRow(species) {
  var api = _runtimeDataApi();
  if (api && typeof api.getSpeciesRow === 'function') return api.getSpeciesRow(species);
  try {
    var root = (typeof globalThis !== 'undefined') ? globalThis
      : ((typeof window !== 'undefined') ? window : null);
    var data = root && root.ChampionsSim && root.ChampionsSim.pokemonDataAudit;
    var rows = data && data.species ? data.species : null;
    if (!rows) return null;
    if (rows[species]) return rows[species];
    var id = _moveId(species);
    var altId = id === 'floetteeternalflower' ? 'floetteeternal' : id;
    if (id === 'floetteeternalflowermega') altId = 'floettemega';
    for (var key in rows) {
      if (!Object.prototype.hasOwnProperty.call(rows, key)) continue;
      var row = rows[key];
      if (!row) continue;
      var rowId = row.id || '';
      var rowNameId = _moveId(row.speciesKey || row.displayName || key);
      if (rowId === id || rowId === altId || rowNameId === id || rowNameId === altId) return row;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

function _showdownSpeciesBase(species) {
  var api = _runtimeDataApi();
  if (api && typeof api.getSpeciesBase === 'function') return api.getSpeciesBase(species);
  var row = _showdownSpeciesRow(species);
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

function _showdownSpeciesWeightKg(species, seen) {
  var id = _moveId(species);
  seen = seen || new Set();
  if (!id || seen.has(id)) return 0;
  seen.add(id);
  try {
    var root = (typeof globalThis !== 'undefined') ? globalThis
      : ((typeof window !== 'undefined') ? window : null);
    var weights = root && root.ChampionsSim && root.ChampionsSim.pokemonShowdownWeights;
    var weightRows = weights && weights.species ? weights.species : null;
    if (weightRows) {
      var direct = Number(weightRows[id]);
      if (Number.isFinite(direct) && direct > 0) return direct;
    }
  } catch (_e) {}
  var row = _showdownSpeciesRow(species);
  var rowWeight = Number(row && row.weightkg);
  if (Number.isFinite(rowWeight) && rowWeight > 0) return rowWeight;
  if (row && row.baseSpecies && _moveId(row.baseSpecies) !== id) {
    var baseWeight = _showdownSpeciesWeightKg(row.baseSpecies, seen);
    if (Number.isFinite(baseWeight) && baseWeight > 0) return baseWeight;
  }
  return 0;
}

function _targetWeightBasePower(target) {
  var weight = Number(target && target.weightkg);
  if (!Number.isFinite(weight) || weight <= 0) {
    weight = _showdownSpeciesWeightKg(target && target.name);
  }
  if (!Number.isFinite(weight) || weight <= 0) return 60;
  if (weight < 10) return 20;
  if (weight < 25) return 40;
  if (weight < 50) return 60;
  if (weight < 100) return 80;
  if (weight < 200) return 100;
  return 120;
}

function _moveType(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveType === 'function') return api.getMoveType(move);
  var row = _showdownMoveRow(move);
  if (row && row.type) return row.type;
  if (typeof MOVE_TYPES !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(MOVE_TYPES, move)) return MOVE_TYPES[move];
  return 'Normal';
}

function _moveCategory(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveCategory === 'function') return api.getMoveCategory(move);
  var row = _showdownMoveRow(move);
  if (row && row.category) return String(row.category).toLowerCase();
  if (typeof MOVE_CATEGORY !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(MOVE_CATEGORY, move)) return MOVE_CATEGORY[move];
  return '';
}

function _moveBasePower(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveBasePower === 'function') return api.getMoveBasePower(move);
  var row = _showdownMoveRow(move);
  var rowBasePower = row && row.base_power !== undefined ? row.base_power : (row && row.basePower);
  if (rowBasePower !== undefined && rowBasePower !== null && rowBasePower !== '') {
    var bp = Number(rowBasePower);
    if (Number.isFinite(bp)) return bp;
  }
  if (typeof MOVE_BP !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(MOVE_BP, move)) return MOVE_BP[move];
  return undefined;
}

function _moveAccuracy(move, localValue) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveAccuracy === 'function') return api.getMoveAccuracy(move, localValue);
  var row = _showdownMoveRow(move);
  if (row && row.accuracy !== undefined && row.accuracy !== null && row.accuracy !== '') {
    if (row.accuracy === true || row.accuracy === 'true') return 1.0;
    var acc = Number(row.accuracy);
    if (Number.isFinite(acc)) return acc > 1 ? acc / 100 : acc;
  }
  if (localValue !== undefined && localValue !== null) return localValue;
  return 1.0;
}

function _moveNeverMiss(move) {
  var row = _showdownMoveRow(move);
  if (row && (row.accuracy === true || row.accuracy === 'true')) return true;
  return false;
}

function _movePriority(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMovePriority === 'function') return api.getMovePriority(move);
  var row = _showdownMoveRow(move);
  if (!row || row.priority === undefined || row.priority === null || row.priority === '') return 0;
  var priority = Number(row.priority);
  return Number.isFinite(priority) ? priority : 0;
}

// Runtime data owns the canonical target bridge. This fallback keeps older
// engine-only VM tests working; runtime_data_bridge_tests.js guards drift.
var SHOWDOWN_TARGET_CATEGORY_FALLBACK_MAP = {
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

function _normalizeMoveTargetCategory(raw) {
  var api = _runtimeDataApi();
  if (api && typeof api.normalizeMoveTargetCategory === 'function') {
    return api.normalizeMoveTargetCategory(raw);
  }
  var target = String(raw || '');
  return SHOWDOWN_TARGET_CATEGORY_FALLBACK_MAP[target] || target || 'normal';
}

function _moveTargetCategory(move) {
  var api = _runtimeDataApi();
  if (api && typeof api.getMoveTargetCategory === 'function') return _normalizeMoveTargetCategory(api.getMoveTargetCategory(move));
  var row = _showdownMoveRow(move);
  if (row && row.target) return _normalizeMoveTargetCategory(row.target);
  if (typeof MOVE_TARGETS !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(MOVE_TARGETS, move)) return _normalizeMoveTargetCategory(MOVE_TARGETS[move]);
  return 'normal';
}

function _moveHasFlag(move, flag) {
  var api = _runtimeDataApi();
  if (api && typeof api.moveHasFlag === 'function') return api.moveHasFlag(move, flag);
  var row = _showdownMoveRow(move);
  if (!row || !row.flags) return false;
  if (typeof row.flags === 'object') return !!row.flags[flag];
  return String(row.flags).split('|').indexOf(flag) >= 0;
}

var BALLISTIC_MOVES = new Set([
  'Acid Spray','Aura Sphere','Barrage','Beak Blast','Bullet Seed','Egg Bomb',
  'Electro Ball','Energy Ball','Focus Blast','Gyro Ball','Magnet Bomb',
  'Mist Ball','Mud Bomb','Octazooka','Pollen Puff','Pyro Ball','Rock Blast',
  'Searing Shot','Seed Bomb','Shadow Ball','Sludge Bomb','Weather Ball',
  'Zap Cannon'
]);

function _isBallisticMove(move) {
  return _moveHasFlag(move, 'bullet') || BALLISTIC_MOVES.has(move);
}

function _isSoundMove(move) {
  return _moveHasFlag(move, 'sound') || SOUND_MOVES.has(move);
}

var ACC_STAGE_TABLE = [1, 1.5, 2, 2.5, 3, 3.5, 4];

function _accuracyStageMult(stage) {
  return stage >= 0
    ? ACC_STAGE_TABLE[Math.min(stage, 6)]
    : (1 / ACC_STAGE_TABLE[Math.min(-stage, 6)]);
}

var MULTI_HIT_MOVES = new Set([
  'Arm Thrust','Bone Rush','Bullet Seed','Fury Attack','Fury Swipes',
  'Icicle Spear','Pin Missile','Rock Blast','Scale Shot','Tail Slap',
  'Dual Wingbeat'
]);

function _multiHitCount(attacker, move, rng) {
  if (attacker && attacker.ability === 'Skill Link') return 5;
  if (move === 'Triple Kick' || move === 'Triple Axel' || move === 'Triple Dive') return 3;
  if (move === 'Double Hit' || move === 'Double Kick' || move === 'Dual Chop' || move === 'Dual Wingbeat') return 2;
  var roll = (typeof rng === 'function' ? rng() : Math.random());
  if (roll < 0.35) return 2;
  if (roll < 0.70) return 3;
  if (roll < 0.85) return 4;
  return 5;
}

function _sampleDamageRoll(attacker, field, rng) {
  var api = _runtimeDataApi();
  var rngFn = typeof rng === 'function' ? rng : Math.random;
  if (api && typeof api.sampleDamageRoll === 'function') {
    return api.sampleDamageRoll({
      teamFormat: attacker && attacker.teamFormat,
      statFormat: attacker && attacker.statFormat,
      format: field && field._format
    }, rngFn);
  }
  return 0.85 + rngFn() * 0.15;
}

function _pokeRound(num) {
  return num % 1 > 0.5 ? Math.ceil(num) : Math.floor(num);
}

function _of32(num) {
  return num > 4294967295 ? num % 4294967296 : num;
}

function _chain4096Mods(modifiers) {
  var total = 4096;
  for (var i = 0; i < modifiers.length; i++) {
    var mod = modifiers[i];
    if (mod !== 4096) total = (total * mod + 2048) >> 12;
  }
  return total;
}

function _applyBasePowerMods(basePower, modifiers) {
  if (!modifiers || !modifiers.length) return basePower;
  return Math.max(1, _pokeRound((basePower * _chain4096Mods(modifiers)) / 4096));
}

var TYPE_BOOSTING_ITEMS = {
  'Black Belt': 'Fighting',
  'Black Glasses': 'Dark',
  'Charcoal': 'Fire',
  'Dragon Fang': 'Dragon',
  'Fairy Feather': 'Fairy',
  'Hard Stone': 'Rock',
  'Magnet': 'Electric',
  'Metal Coat': 'Steel',
  'Miracle Seed': 'Grass',
  'Mystic Water': 'Water',
  'Never-Melt Ice': 'Ice',
  'Poison Barb': 'Poison',
  'Sharp Beak': 'Flying',
  'Silk Scarf': 'Normal',
  'Silver Powder': 'Bug',
  'Soft Sand': 'Ground',
  'Spell Tag': 'Ghost',
  'Twisted Spoon': 'Psychic'
};

function _heldItemTypeBoostMod(mon, moveType) {
  if (!mon || !mon.item || mon.itemConsumed) return 4096;
  return TYPE_BOOSTING_ITEMS[mon.item] === moveType ? 4915 : 4096;
}

var NON_REMOVABLE_KNOCK_OFF_ITEMS = new Set([
  'Adamant Crystal',
  'Adamant Orb',
  'Booster Energy',
  'Cornerstone Mask',
  'Griseous Core',
  'Griseous Orb',
  'Hearthflame Mask',
  'Lustrous Globe',
  'Lustrous Orb',
  'Rusted Shield',
  'Rusted Sword',
  'Wellspring Mask'
]);

function _hasUsableHeldItem(mon) {
  return !!(mon && mon.item && !mon.itemConsumed);
}

function _holdsCorrespondingMegaStone(mon) {
  if (!_hasUsableHeldItem(mon)) return false;
  if (mon.megaForm && mon.megaForm.stone === mon.item) return true;
  if (typeof CHAMPIONS_MEGAS === 'undefined' || !CHAMPIONS_MEGAS) return false;
  const displayName = mon.displayName || mon.name || '';
  for (const megaName of Object.keys(CHAMPIONS_MEGAS)) {
    const row = CHAMPIONS_MEGAS[megaName];
    if (!row || row.megaStone !== mon.item) continue;
    if (mon.name === row.baseSpecies || displayName === megaName || mon.name === megaName) return true;
  }
  return false;
}

function _isKnockOffRestrictedItem(mon) {
  if (!_hasUsableHeldItem(mon)) return false;
  if (_holdsCorrespondingMegaStone(mon)) return true;
  return NON_REMOVABLE_KNOCK_OFF_ITEMS.has(mon.item);
}

function _knockOffBasePowerMod(target) {
  if (!_hasUsableHeldItem(target)) return 4096;
  return _isKnockOffRestrictedItem(target) ? 4096 : 6144;
}

function _canKnockOffHeldItem(target) {
  if (!_hasUsableHeldItem(target)) return false;
  if (_isKnockOffRestrictedItem(target)) return false;
  if (target.ability === 'Sticky Hold' && target.hp > 0) return false;
  return true;
}

function _applyKnockOffItemRemoval(target, log) {
  if (!_canKnockOffHeldItem(target)) return false;
  const removed = target.item;
  target.item = '';
  target.itemConsumed = true;
  if (log) log.push(`${target.name} lost its ${removed} because of Knock Off!`);
  return true;
}

function _applyBaseDamageMod(baseDamage, mod4096) {
  if (mod4096 === 4096) return baseDamage;
  return _pokeRound(_of32(baseDamage * mod4096) / 4096);
}

function _applyDamageModifier(value, modifier) {
  return Math.floor(value * modifier);
}

function _finalizeDamage(baseAmount, roll, effectiveness, applyStatusPenalty, stabMod, finalMod) {
  var damageAmount = Math.floor(_of32(baseAmount * roll));
  if (stabMod !== 4096) damageAmount = _of32(damageAmount * stabMod) / 4096;
  damageAmount = Math.floor(_of32(_pokeRound(damageAmount) * effectiveness));
  if (applyStatusPenalty) damageAmount = Math.floor(damageAmount / 2);
  return Math.max(1, _pokeRound(_of32(damageAmount * finalMod) / 4096));
}

function _getStabMod(attacker, moveType) {
  var stabMod = 4096;
  var originalTypes = attacker && Array.isArray(attacker.types) ? attacker.types : [];
  var hasOriginalType = originalTypes.indexOf(moveType) >= 0;
  if (hasOriginalType) stabMod += 2048;
  var hasActiveTera = !!(attacker && attacker.teraActivated && attacker.tera);
  var currentHasType = hasActiveTera && attacker.tera !== 'Stellar'
    ? attacker.tera === moveType
    : hasOriginalType;
  if (hasActiveTera && attacker.tera === moveType && attacker.tera !== 'Stellar') stabMod += 2048;
  if (attacker && attacker.ability === 'Adaptability' && currentHasType) {
    stabMod += (hasActiveTera && originalTypes.indexOf(attacker.tera) >= 0) ? 1024 : 2048;
  }
  return stabMod;
}

function _boostedAttackSideStat(mon, stat) {
  if (!mon) return 0;
  var base = stat === 'atk' ? Number(mon.baseAtk || 0) : Number(mon.baseSpa || 0);
  var boost = mon.statBoosts ? Number(mon.statBoosts[stat] || 0) : 0;
  boost = Math.max(-6, Math.min(6, boost));
  var boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  var value = boost >= 0 ? base * boostTable[boost] : base / boostTable[-boost];
  return Math.floor(value);
}

function _teraBlastUsesPhysical(attacker) {
  return _boostedAttackSideStat(attacker, 'atk') > _boostedAttackSideStat(attacker, 'spa');
}

function _resolveDynamicMoveType(attacker, move, field, baseMoveType) {
  var moveType = baseMoveType || _moveType(move);
  var _fieldWeather = _effectiveFieldWeather(field);
  if (move === 'Weather Ball') {
    moveType =
      _fieldWeather === 'sun'  ? 'Fire'
    : _fieldWeather === 'rain' ? 'Water'
    : _fieldWeather === 'sand' ? 'Rock'
    : _fieldWeather === 'snow' ? 'Ice'
    : 'Normal';
  }
  if (move === 'Terrain Pulse' && _isGrounded(attacker)) {
    moveType =
      field && field.terrain === 'electric' ? 'Electric'
    : field && field.terrain === 'grassy'  ? 'Grass'
    : field && field.terrain === 'misty'   ? 'Fairy'
    : field && field.terrain === 'psychic' ? 'Psychic'
    : 'Normal';
  }
  if (move === 'Tera Blast' && attacker && attacker.teraActivated && attacker.tera) {
    moveType = attacker.tera;
  }
  return moveType;
}

function _isActiveTeraBlastContext(ctx) {
  return !!(
    ctx &&
    ctx.move === 'Tera Blast' &&
    ctx.attacker &&
    ctx.attacker.teraActivated &&
    ctx.attacker.tera
  );
}

function _applyStatMod(value, mod4096) {
  if (mod4096 === 4096) return value;
  return Math.max(1, _pokeRound(_of32(value * mod4096) / 4096));
}

function _moveOverrideOffensiveStat(move, isPhysical) {
  if (move === 'Body Press') return 'def';
  return isPhysical ? 'atk' : 'spa';
}

function _moveOverrideDefensiveStat(move, isPhysical) {
  if (move === 'Psyshock' || move === 'Psystrike' || move === 'Secret Sword') return 'def';
  return isPhysical ? 'def' : 'spd';
}

function _preDamageSpaBoostDelta(mon, move) {
  if (move !== 'Electro Shot' && move !== 'Meteor Beam') return 0;
  if (mon && mon.ability === 'Simple') return 2;
  if (mon && mon.ability === 'Contrary') return -1;
  return 1;
}

function _applyStageDelta(mon, stat, delta) {
  if (!mon || !delta) return 0;
  var before = mon.statBoosts[stat] || 0;
  var after = Math.max(-6, Math.min(6, before + delta));
  mon.statBoosts[stat] = after;
  return after - before;
}

function _logStageDelta(log, mon, stat, delta) {
  if (!log || !mon || !delta) return;
  var statLabel = stat === 'spa' ? 'Special Attack' : stat.toUpperCase();
  if (stat === 'spd') statLabel = 'Special Defense';
  if (stat === 'spe') statLabel = 'Speed';
  if (stat === 'atk') statLabel = 'Attack';
  if (stat === 'def') statLabel = 'Defense';
  if (stat === 'acc') statLabel = 'accuracy';
  if (delta >= 2) log.push(`${mon.name}'s ${statLabel} sharply rose!`);
  else if (delta === 1) log.push(`${mon.name}'s ${statLabel} rose!`);
  else if (delta <= -2) log.push(`${mon.name}'s ${statLabel} harshly fell!`);
  else log.push(`${mon.name}'s ${statLabel} fell!`);
}

function _applyStageMap(mon, deltas, log) {
  var applied = 0;
  for (const [stat, delta] of Object.entries(deltas || {})) {
    const actual = _applyStageDelta(mon, stat, delta);
    if (actual) {
      applied++;
      if (actual > 0) mon._statsRaisedThisTurn = true;
      _logStageDelta(log, mon, stat, actual);
    }
  }
  return applied;
}

function _applyTargetStageMap(source, target, deltas, log) {
  if (!target || !deltas) return 0;
  var normalized = {};
  for (const [stat, delta] of Object.entries(deltas || {})) {
    if (delta) normalized[stat] = delta;
  }
  var sourceIsOpponent = _sourceIsOpponent(source, target);
  var clearBodyBlocked = false;
  if (sourceIsOpponent && target.ability === 'Clear Body') {
    for (const [stat, delta] of Object.entries(normalized)) {
      if (delta < 0) {
        delete normalized[stat];
        clearBodyBlocked = true;
      }
    }
    if (clearBodyBlocked && log) {
      log.push(`${target.name}'s Clear Body prevented its stats from being lowered!`);
    }
  }
  var flowerVeilBlocked = false;
  if (_isFlowerVeilProtected(target, source)) {
    for (const [stat, delta] of Object.entries(normalized)) {
      if (delta < 0) {
        delete normalized[stat];
        flowerVeilBlocked = true;
      }
    }
    if (flowerVeilBlocked && log) {
      log.push(`${target.name}'s Flower Veil prevented its stats from being lowered!`);
    }
  }
  if (sourceIsOpponent && target.ability === "Mind's Eye" && normalized.acc < 0) {
    delete normalized.acc;
    if (log) log.push(`${target.name}'s Mind's Eye prevented its accuracy from being lowered!`);
  }

  var applied = 0;
  var negativeApplied = false;
  for (const [stat, delta] of Object.entries(normalized)) {
    const actual = _applyStageDelta(target, stat, delta);
    if (actual) {
      applied++;
      if (actual < 0) negativeApplied = true;
      if (actual > 0) target._statsRaisedThisTurn = true;
      _logStageDelta(log, target, stat, actual);
    }
  }

  if (sourceIsOpponent && negativeApplied) {
    if (target.ability === 'Defiant') _applyStageMap(target, { atk: 2 }, log);
    if (target.ability === 'Competitive') _applyStageMap(target, { spa: 2 }, log);
  }
  return applied;
}

function _attackerIgnoresTargetAbility(attacker, target) {
  return !!(
    attacker &&
    target &&
    attacker !== target &&
    attacker.ability === 'Mold Breaker' &&
    target.item !== 'Ability Shield'
  );
}

function _targetAbilityActive(target, attacker, ability) {
  return !!(
    target &&
    target.ability === ability &&
    !_attackerIgnoresTargetAbility(attacker, target)
  );
}

function _isGrounded(mon) {
  return !!mon && !mon.flying;
}

function _canReceiveHealing(mon) {
  return !!(mon && mon.alive && (!mon.healBlockedTurns || mon.healBlockedTurns <= 0));
}

function _isTrappedByMove(mon) {
  return !!(mon && mon.trappedByMove && mon.trappedByMon && mon.trappedByMon.alive);
}

function _sideActiveMons(side) {
  return side && Array.isArray(side.activeMons) ? side.activeMons.filter(function(mon) {
    return !!(mon && mon.alive);
  }) : [];
}

function _opposingActiveMons(mon, field) {
  if (!mon || !field || !mon.side) return [];
  if (mon.side === field.playerSide) return _sideActiveMons(field.oppSide);
  if (mon.side === field.oppSide) return _sideActiveMons(field.playerSide);
  return [];
}

function _sideHasActiveAbility(side, ability) {
  return _sideActiveMons(side).some(function(mon) {
    return mon.ability === ability;
  });
}

function _sourceIsOpponent(source, target) {
  return !!(
    source &&
    target &&
    source !== target &&
    (!source.side || !target.side || source.side !== target.side)
  );
}

function _isFlowerVeilProtected(target, source) {
  return !!(
    target &&
    Array.isArray(target.types) &&
    target.types.indexOf('Grass') !== -1 &&
    _sourceIsOpponent(source, target) &&
    _sideHasActiveAbility(target.side, 'Flower Veil')
  );
}

function _itemSuppressedByUnnerve(mon, field) {
  return !!(
    mon &&
    mon.item &&
    String(mon.item).indexOf('Berry') !== -1 &&
    _opposingActiveMons(mon, field).some(function(opp) { return opp.ability === 'Unnerve'; })
  );
}

function _isTrappedByShadowTag(mon, field) {
  if (!mon || !mon.alive || !field) return false;
  if (Array.isArray(mon.types) && mon.types.indexOf('Ghost') !== -1) return false;
  if (mon.ability === 'Shadow Tag') return false;
  return _opposingActiveMons(mon, field).some(function(opp) {
    return opp.ability === 'Shadow Tag';
  });
}

function _isAccuracyBypassed(attacker, target) {
  return !!(
    (attacker && attacker.ability === 'No Guard') ||
    (target && target.ability === 'No Guard')
  );
}

function _moveHits(attacker, target, move, field, rng, localAccuracy) {
  if (!target) return true;
  if (_isAccuracyBypassed(attacker, target)) return true;
  if (_moveNeverMiss(move)) return true;
  var rngFn = typeof rng === 'function' ? rng : Math.random;
  var effectiveWeather = _effectiveFieldWeather(field);
  if (move === 'Blizzard' && (effectiveWeather === 'hail' || effectiveWeather === 'snow')) return true;
  if ((move === 'Thunder' || move === 'Hurricane') && effectiveWeather === 'rain') return true;
  var acc = _moveAccuracy(move, localAccuracy);
  if ((move === 'Thunder' || move === 'Hurricane') && effectiveWeather === 'sun') acc = 0.50;
  if (acc >= 1 && (!attacker || !(attacker.statBoosts && attacker.statBoosts.acc < 0)) &&
      (!target || !(target.statBoosts && target.statBoosts.eva > 0))) {
    if (!(_targetAbilityActive(target, attacker, 'Sand Veil') && _effectiveFieldWeather(field) === 'sand') &&
        !(_targetAbilityActive(target, attacker, 'Snow Cloak') && _effectiveFieldWeather(field) === 'snow')) {
      return true;
    }
  }
  if (attacker && attacker.ability === 'Compound Eyes') acc *= 1.3;
  var accBoost = attacker && attacker.statBoosts ? (attacker.statBoosts.acc || 0) : 0;
  var evaBoost = target && target.statBoosts ? (target.statBoosts.eva || 0) : 0;
  if (attacker && attacker.ability === "Mind's Eye") evaBoost = 0;
  acc *= _accuracyStageMult(accBoost);
  acc *= (evaBoost >= 0) ? (1 / _accuracyStageMult(evaBoost)) : _accuracyStageMult(-evaBoost);
  if (_targetAbilityActive(target, attacker, 'Sand Veil') && _effectiveFieldWeather(field) === 'sand') acc *= 0.8;
  if (_targetAbilityActive(target, attacker, 'Snow Cloak') && _effectiveFieldWeather(field) === 'snow') acc *= 0.8;
  acc = Math.max(0, Math.min(1, acc));
  return rngFn() <= acc;
}

var SUPREME_OVERLORD_MODS = [4096, 4506, 4915, 5325, 5734, 6144];

function _activeWeatherMons(field) {
  if (!field) return [];
  var playerActive = field.playerSide && Array.isArray(field.playerSide.activeMons) ? field.playerSide.activeMons : [];
  var oppActive = field.oppSide && Array.isArray(field.oppSide.activeMons) ? field.oppSide.activeMons : [];
  return playerActive.concat(oppActive).filter(function(mon) {
    return !!(mon && mon.alive);
  });
}

function _fieldHasWeatherSuppression(field) {
  return _activeWeatherMons(field).some(function(mon) {
    return mon.ability === 'Cloud Nine' || mon.ability === 'Air Lock';
  });
}

function _effectiveFieldWeather(field) {
  if (!field || !field.weather) return 'none';
  return _fieldHasWeatherSuppression(field) ? 'none' : field.weather;
}

function _effectiveMoveWeather(mon, field, moveType) {
  var effectiveWeather = _effectiveFieldWeather(field);
  var wxRes = callAbilityHook(mon, 'onWeatherCheck', {
    mon: mon,
    moveType: moveType,
    field: field,
    effectiveWeather: effectiveWeather
  });
  if (wxRes && wxRes.effectiveWeather) effectiveWeather = wxRes.effectiveWeather;
  return effectiveWeather;
}

function _isChargeMove(move) {
  return move === 'Electro Shot' || move === 'Meteor Beam' || move === 'Solar Beam' || move === 'Solar Blade' || move === 'Phantom Force';
}

function _moveSkipsChargeTurn(mon, move, field) {
  if (!_isChargeMove(move)) return false;
  if (mon && mon.item === 'Power Herb' && !mon.itemConsumed) return true;
  var weather = _effectiveFieldWeather(field);
  if (move === 'Electro Shot') return weather === 'rain';
  if (move === 'Solar Beam' || move === 'Solar Blade') return weather === 'sun';
  return false;
}

function _isContactMove(move) {
  return CONTACT_MOVES.has(move) || _moveHasFlag(move, 'contact');
}

function getMoveContactInfo(move) {
  var name = String(move || '');
  var row = _showdownMoveRow(name);
  var showdownContact = !!(row && _moveHasFlag(name, 'contact'));
  var fallbackContact = CONTACT_MOVES.has(name);
  return {
    move: name,
    is_contact: !!(showdownContact || fallbackContact),
    source: showdownContact ? 'showdown_flag' : (fallbackContact ? 'local_contact_override' : (row ? 'showdown_no_contact_flag' : 'missing_move_metadata')),
    has_showdown_row: !!row,
    has_local_override: fallbackContact
  };
}

function _normalizeRecoilRule(value) {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) {
    var arrNum = Number(value[0]);
    var arrDen = Number(value[1]);
    if (Number.isFinite(arrNum) && Number.isFinite(arrDen) && arrNum > 0 && arrDen > 0) {
      return { numerator: arrNum, denominator: arrDen };
    }
  }
  if (typeof value === 'object') {
    var objNum = Number(value.numerator || value.num || value[0]);
    var objDen = Number(value.denominator || value.den || value[1]);
    if (Number.isFinite(objNum) && Number.isFinite(objDen) && objNum > 0 && objDen > 0) {
      return { numerator: objNum, denominator: objDen };
    }
  }
  return null;
}

function _moveRecoilRule(move) {
  var row = _showdownMoveRow(move);
  var rowRule = _normalizeRecoilRule(row && row.recoil);
  return rowRule || MOVE_RECOIL_BY_ID[_moveId(move)] || null;
}

var MODELED_DRAIN_BY_ID = {
  gigadrain: { numerator: 1, denominator: 2 },
  matchagotcha: { numerator: 1, denominator: 2 }
};

function _moveDrainRule(move) {
  var row = _showdownMoveRow(move);
  var rowRule = _normalizeRecoilRule(row && row.drain);
  if (rowRule) return rowRule;
  var rule = MODELED_DRAIN_BY_ID[_moveId(move)];
  return rule ? { numerator: rule.numerator, denominator: rule.denominator } : null;
}

function _ratioRuleObject(rule, basis, rounding) {
  if (!rule) return null;
  return {
    numerator: Number(rule.numerator),
    denominator: Number(rule.denominator),
    basis: basis || 'applied_damage',
    rounding: rounding || 'half_up'
  };
}

function _ratioAmount(value, rule) {
  if (!rule) return 0;
  var amount = Math.round(Number(value || 0) * Number(rule.numerator) / Number(rule.denominator));
  return Math.max(1, amount);
}

function _moveContextText(move) {
  var row = _showdownMoveRow(move);
  if (!row) return '';
  return row.shortDesc || row.short_desc || row.desc || '';
}

function _recordEffectEvent(field, mon, move, kind, hpBefore, hpAfter, details) {
  if (!field || !field._ctx || !mon) return null;
  if (!Array.isArray(field._ctx.turnEffectEvents)) field._ctx.turnEffectEvents = [];
  var side = mon.side === field.playerSide ? 'player' : (mon.side === field.oppSide ? 'opponent' : 'unknown');
  var before = Number(hpBefore || 0);
  var after = Number(hpAfter || 0);
  var row = Object.assign({
    actor: mon.name || 'Unknown',
    actor_key: _snapshotMonStableKey(side, mon),
    side: side,
    move: move || '',
    effect_kind: kind || 'effect',
    hp_before: before,
    hp_after: after,
    hp_delta: after - before,
    max_hp: Number(mon.maxHp || 0),
    source: 'pokemon-showdown move metadata + engine rule',
    move_context: _moveContextText(move)
  }, details || {});
  field._ctx.turnEffectEvents.push(row);
  return row;
}

function _normalizeMechanicsReasonId(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

function _recordActionDenialEvent(field, mon, move, kind, reason, details) {
  var reasonId = _normalizeMechanicsReasonId(reason || kind || 'action-denial');
  return _recordEffectEvent(field, mon, move || reason || 'action-denial', kind || 'action-denial', mon && mon.hp, mon && mon.hp, Object.assign({
    source: 'engine action gate',
    reason_id: reasonId,
    action_denial_reason: reasonId,
    action_denial_family: reasonId,
    action_denial: true,
    skipped_move: true,
    skipped_action_move: move || null,
    volatile_status: reason || kind || 'action-denial'
  }, details || {}));
}

function _recordMoveFailureEvent(field, mon, move, reason, details) {
  var reasonId = _normalizeMechanicsReasonId(reason || 'unknown');
  return _recordEffectEvent(field, mon, move || 'move-failure', 'move-failure', mon && mon.hp, mon && mon.hp, Object.assign({
    source: 'engine move failure gate',
    reason_id: reasonId,
    failure_reason_id: reasonId,
    move_failed: true,
    failed_move: move || null,
    failure_reason: reason || 'unknown',
    skipped_move: false,
    action_denial: false
  }, details || {}));
}

// ============================================================
// ABILITIES REGISTRY — T9j.8
// Each entry declares the hooks an ability participates in. Handlers return
// a mutation object (or undefined for no-op). The engine calls the relevant
// hook at the canonical trigger points documented below.
//
// Hook signatures:
//   onModifyMove({move, attacker, field}) -> {move?, bpMult?, typeOverride?}
//     Fires at the top of calcDamage so type/STAB/type-chart all see the change.
//   onBasePower({move, moveType, basePower, attacker, defender, field}) -> {bpMod}
//     Fires after dynamic BP resolution and before terrain/helping-hand BP mods.
//     bpMod uses Showdown's 4096 fixed-point modifier scale.
//   onSourceModifyAtk({move, moveType, attacker, defender, field}) -> {statMod}
//     Fires from the defender before base damage is computed. statMod uses
//     Showdown's 4096 fixed-point scale against the attack/sp-atk value.
//   onModifyDamage({move, moveType, attacker, defender, typeEffectiveness, field}) -> {finalMod}
//   onSourceModifyDamage({move, moveType, attacker, defender, typeEffectiveness, field}) -> {finalMod}
//     Fires during final-mod construction. finalMod uses Showdown's 4096 scale.
//   onTryHit({move, moveType, attacker, defender, field}) -> {immune, healFraction}
//     Fires before damage calculation in battle execution and as a zero-damage
//     guard in calcDamage previews.
//   onProtectResolve({attacker, defender, move, moveType, isContact}) -> {damageMult}
//     Fires when a target's Protect flag is up; default is 0 (full block). A
//     positive damageMult lets the attacker deal dmg * mult through Protect.
//     Piercing Drill / Unseen Fist use this shared 25% path.
//   onDamageTaken({attacker, defender, move, moveType, damage, field, log})
//     Fires AFTER applyDamage writes HP, iff damage > 0 AND defender still alive.
//     Used by Spicy Spray (burn attacker).
//   onWeatherCheck({mon, moveType, field}) -> {effectiveWeather}
//     Fires inside calcDamage's weather branch. Mega Sol provides personal sun
//     for the holder's Fire-typed moves even if field weather is 'none'.
//
// Sources cited per-ability.
// ============================================================
var ABILITIES = {
  'Aerilate': {
    onModifyMove: function(ctx) {
      if (_isActiveTeraBlastContext(ctx)) return null;
      var baseType = _moveType(ctx.move);
      if (baseType === 'Normal') return { typeOverride: 'Flying', bpMult: 1.20 };
      return null;
    }
  },
  'Air Lock': {
    suppressesWeather: true
  },
  'Cloud Nine': {
    suppressesWeather: true
  },
  'Dragonize': {
    // Normal moves become Dragon-type and gain 20% BP. Mirrors -ate ability
    // family (Pixilate/Aerilate/Refrigerate) with Dragon as the target type.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions
    onModifyMove: function(ctx) {
      if (_isActiveTeraBlastContext(ctx)) return null;
      var baseType = _moveType(ctx.move);
      if (baseType === 'Normal') return { typeOverride: 'Dragon', bpMult: 1.20 };
      return null;
    }
  },
  'Pixilate': {
    onModifyMove: function(ctx) {
      if (_isActiveTeraBlastContext(ctx)) return null;
      var baseType = _moveType(ctx.move);
      if (baseType === 'Normal') return { typeOverride: 'Fairy', bpMult: 1.20 };
      return null;
    }
  },
  'Piercing Drill': {
    // T9j.17 (Refs #101) -- Champions Piercing Drill: 25% miss chance on every move.
    // The previous T9j.8 implementation (25% Protect bypass on contact) was
    // incorrect for Champions Reg M-A. Rewritten per user-confirmed spec.
    // The 25% miss roll fires inside executeMove right after the standard
    // accuracy check; this entry is intentionally hookless (no onProtectResolve)
    // so Mega Excadrill obeys default full-block Protect rules.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)
  },
  'Unseen Fist': {
    // Champions: 25% damage through Protect on contact moves (nerfed from 100%).
    // Cite: https://www.serebii.net/pokemonchampions/updatedabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Unseen_Fist_(Ability)
    onProtectResolve: function(ctx) {
      if (ctx.isContact) return { damageMult: 0.25 };
      return null;
    }
  },
  'Refrigerate': {
    onModifyMove: function(ctx) {
      if (_isActiveTeraBlastContext(ctx)) return null;
      var baseType = _moveType(ctx.move);
      if (baseType === 'Normal') return { typeOverride: 'Ice', bpMult: 1.20 };
      return null;
    }
  },
  'Mega Launcher': {
    // Pulse moves gain 50% power.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Mega_Launcher_(Ability)
    onModifyMove: function(ctx) {
      if (_moveHasFlag(ctx.move, 'pulse')) return { bpMult: 1.50 };
      return null;
    }
  },
  'Spicy Spray': {
    // 100% burn attacker when holder takes any damage (except Fire attackers,
    // attackers already statused, or if holder is behind a Substitute).
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)
    onDamageTaken: function(ctx) {
      var attacker = ctx.attacker, defender = ctx.defender;
      if (!attacker || !attacker.alive) return;
      if (defender.substituteHp > 0) return;     // holder behind Sub blocks
      if (attacker.status) return;               // already statused
      if (attacker.types && attacker.types.indexOf('Fire') !== -1) return;
      attacker.status = 'burn';
      attacker.statusTurns = 0;
      if (ctx.log) ctx.log.push(defender.name + "'s Spicy Spray burned " + attacker.name + '!');
    }
  },
  'Tough Claws': {
    onModifyMove: function(ctx) {
      if (_isContactMove(ctx.move)) return { bpMult: 1.30 };
      return null;
    }
  },
  'Strong Jaw': {
    // Bite moves gain 50% power.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Strong_Jaw_(Ability)
    onModifyMove: function(ctx) {
      if (_moveHasFlag(ctx.move, 'bite')) return { bpMult: 1.50 };
      return null;
    }
  },
  'Sheer Force': {
    // Moves with eligible secondary effects gain 30% power and those effects
    // are suppressed after damage. Uses the current engine's secondary-effect
    // surface plus common Showdown secondary moves used by shipped teams.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onBasePower: function(ctx) {
      if (SHEER_FORCE_MOVES.has(ctx.move)) return { bpMod: 5325 };
      return null;
    }
  },
  'Fairy Aura': {
    // Fairy moves gain Showdown's aura modifier, 0x1548 / 0x1000.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onBasePower: function(ctx) {
      if (ctx.moveType === 'Fairy') return { bpMod: 5448 };
      return null;
    }
  },
  'Iron Fist': {
    // Punch moves gain 20% power.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onBasePower: function(ctx) {
      if (_moveHasFlag(ctx.move, 'punch')) return { bpMod: 4915 };
      return null;
    }
  },
  'Technician': {
    // Moves with 60 or lower current BP gain 50% power.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onBasePower: function(ctx) {
      if (ctx.basePower <= 60) return { bpMod: 6144 };
      return null;
    }
  },
  'Sand Force': {
    // Rock/Ground/Steel moves gain 30% power during sand.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onBasePower: function(ctx) {
      if (_effectiveFieldWeather(ctx.field) === 'sand' &&
          (ctx.moveType === 'Rock' || ctx.moveType === 'Ground' || ctx.moveType === 'Steel')) {
        return { bpMod: 5325 };
      }
      return null;
    }
  },
  'Thick Fat': {
    // Incoming Fire/Ice moves use half the attacker's relevant attacking stat.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onSourceModifyAtk: function(ctx) {
      if (ctx.moveType === 'Fire' || ctx.moveType === 'Ice') return { statMod: 2048 };
      return null;
    }
  },
  'Filter': {
    // Super-effective hits against the holder deal 0.75x damage.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onSourceModifyDamage: function(ctx) {
      if (ctx.typeEffectiveness > 1) return { finalMod: 3072 };
      return null;
    }
  },
  'Tinted Lens': {
    // Not-very-effective hits from the holder deal 2x damage.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onModifyDamage: function(ctx) {
      if (ctx.typeEffectiveness < 1) return { finalMod: 8192 };
      return null;
    }
  },
  'Levitate': {
    // Ground immunity for grounded non-Thousand Arrows attacks. Flying-type
    // immunity is still handled by the type chart; this covers non-Flying
    // Levitate users such as Cresselia/Rotom/Chimecho.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onTryHit: function(ctx) {
      if (ctx.defender !== ctx.attacker && ctx.moveType === 'Ground' && ctx.move !== 'Thousand Arrows') {
        return { immune: true };
      }
      return null;
    }
  },
  'Bulletproof': {
    // Ballistic move immunity. Uses Showdown's bullet flag where available and
    // a local fallback list for imported/generated gaps.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onTryHit: function(ctx) {
      if (ctx.defender !== ctx.attacker && _isBallisticMove(ctx.move)) return { immune: true };
      return null;
    }
  },
  'Earth Eater': {
    // Ground moves targeting another Pokemon are absorbed; holder heals 1/4 max HP.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onTryHit: function(ctx) {
      if (ctx.defender !== ctx.attacker && ctx.moveType === 'Ground') {
        return { immune: true, healFraction: 0.25 };
      }
      return null;
    }
  },
  'Rough Skin': {
    // Contact attackers lose 1/8 of their own max HP on a damaging hit.
    // Mirrors Pokemon Showdown's onDamagingHit hook.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onDamagingHit: function(ctx) {
      var attacker = ctx.attacker, defender = ctx.defender;
      if (!attacker || !attacker.alive || !defender) return;
      if (!ctx.damage || ctx.damage <= 0) return;
      if (!_isContactMove(ctx.move)) return;
      var chip = Math.max(1, Math.floor(attacker.maxHp / 8));
      var hpBeforeRoughSkin = attacker.hp;
      attacker.hp = Math.max(0, attacker.hp - chip);
      if (ctx.log) ctx.log.push(attacker.name + " was hurt by " + defender.name + "'s Rough Skin! [" + chip + " dmg]");
      _recordEffectEvent(ctx.field, attacker, 'Rough Skin', 'ability-contact-damage', hpBeforeRoughSkin, attacker.hp, {
        source: 'engine ability contact rule',
        source_actor: defender.name || '',
        rule: { numerator: 1, denominator: 8, basis: 'max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforeRoughSkin - attacker.hp)
      });
      if (attacker.hp === 0) {
        attacker.alive = false;
        if (ctx.log) ctx.log.push(attacker.name + ' fainted!');
        if (typeof ctx.recordKO === 'function') {
          ctx.recordKO(attacker, { move: ctx.move, attacker: defender, reason: 'Rough Skin' });
        }
      }
    }
  },
  'Mummy': {
    // Contact attackers have their ability overwritten with Mummy after a
    // damaging contact hit.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onDamagingHit: function(ctx) {
      var attacker = ctx.attacker, defender = ctx.defender;
      if (!attacker || !defender || !ctx.damage || ctx.damage <= 0) return;
      if (!_isContactMove(ctx.move)) return;
      if (attacker.ability === 'Mummy') return;
      attacker.ability = 'Mummy';
      attacker.flying = attacker.types.includes('Flying') || attacker.ability === 'Levitate';
      if (ctx.log) ctx.log.push(attacker.name + "'s Ability became Mummy!");
    }
  },
  'Stamina': {
    // Defense rises by one stage after taking a damaging hit and surviving.
    // Cite: https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
    onDamagingHit: function(ctx) {
      if (!ctx.defender || ctx.defender.hp <= 0) return;
      _applyStageMap(ctx.defender, { def: 1 }, ctx.log);
    }
  },
  // Inline in applyDamage: raises Special Attack once damage crosses half HP.
  'Berserk': {},
  // Inline in calcDamage/applyDamage: ignores modeled target defensive hooks,
  // defender Unaware, Sturdy, Levitate/Earth Eater immunity, and reductions.
  'Mold Breaker': {},
  // Inline in calcDamage/applyEntryAbility: Normal/Fighting hit Ghosts and
  // Intimidate-style Attack drops are ignored.
  'Scrappy': {},
  // Inline in calcDamage/status/applyDamage: bypasses screens and Substitute.
  'Infiltrator': {},
  // Inline in getPriority: Flying moves gain +1 priority at full HP.
  'Gale Wings': {},
  // Inline in accuracy gates: holder's moves use 1.3x accuracy.
  'Compound Eyes': {},
  // Inline in accuracy gates: holder's and target's moves do not miss.
  'No Guard': {},
  // Inline in accuracy gates: sand/snow evasion modifiers.
  'Sand Veil': {},
  'Snow Cloak': {},
  // Inline in status/stat-drop gates: allied Grass-types avoid drops/status.
  'Flower Veil': {},
  // Inline in accuracy/stat/type gates: ignores evasion, blocks accuracy drops,
  // and lets Normal/Fighting damage Ghost targets.
  "Mind's Eye": {},
  // Inline in canInflictStatus.
  'Insomnia': {},
  'Limber': {},
  // Inline in calcDamage: prevents critical hits.
  'Shell Armor': {},
  // Inline in applyDamage: contact hits can poison the target.
  'Poison Touch': {},
  // Inline in applyDamage: attacker loses HP equal to the holder's pre-hit HP
  // when direct damage knocks the holder out.
  'Innards Out': {},
  // Inline in executeAction: once per switch-in type change to the used move.
  'Protean': {},
  // Inline in executeMove / Dragon Darts: ignores redirection.
  'Stalwart': {},
  // Inline in multi-hit execution: supported multi-hit moves hit max count.
  'Skill Link': {},
  // Inline in voluntary switch/pivot helper.
  'Shadow Tag': {},
  // Inline in applyItem: opposing berries cannot activate.
  'Unnerve': {},
  // Inline in applyEntryAbility: copy the first eligible opposing ability.
  'Trace': {},
  // Inline at end of turn: 30% chance to cure an adjacent ally's major status.
  'Healer': {},
  // Current sim no-op: item reveal is already visible to the planner.
  'Frisk': {},
  // Current sim no-op: PP consumption/drain is not modeled.
  'Pressure': {},
  // Inline in executeAction/setStanceForm: Aegislash swaps between Shield and Blade.
  'Stance Change': {},
  // Inline in getStat: Attack is doubled after stat-stage resolution.
  'Huge Power': {},
  // Inline in getStat: Attack is doubled after stat-stage resolution.
  'Pure Power': {},
  // Inline in calcDamage: low-HP Fire moves get a 1.5x attacking-stat boost.
  'Blaze': {},
  // Inline in calcDamage: low-HP Grass moves get a 1.5x attacking-stat boost.
  'Overgrow': {},
  'Solar Power': {},
  // Inline in applyDamage: survive lethal direct damage from full HP at 1 HP.
  'Sturdy': {},
  'Supreme Overlord': {},
  // Inline in calcDamage: ignore opposing offensive/defensive stat stages.
  'Unaware': {},
  'Mega Sol': {
    // Personal sun — treats Fire moves as if sun is up when computing the
    // weather multiplier, but does NOT set field weather. Water 0.5x penalty
    // and Fire 1.5x bonus apply only for the holder's own move resolution.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    onWeatherCheck: function(ctx) {
      if (ctx.field.weather === 'none' || !ctx.field.weather) {
        return { effectiveWeather: 'sun' };
      }
      return null;
    }
  }
  // Parental Bond handled inline in executeMove (2-strike loop with BP override)
};

// ============================================================
// T9j.17 (Refs #44) -- TERRAIN SEEDS
// One-shot consumable items that boost the holder by +1 to a defensive stat
// when present in matching terrain at switch-in. Standard mainline behavior
// per Bulbapedia. Champions inherits this verbatim (no nerfs).
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Electric_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Psychic_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Misty_Seed
// In-engine, the trigger fires inside applyEntryAbility when the holder
// switches into a matching terrain. Trigger on terrain-set (e.g. a partner
// uses Grassy Terrain mid-match) is wired in via the same helper called
// from terrain-setting hooks; until terrain-setting moves are added to the
// engine, only the switch-in path activates in real battles. Tests cover
// both paths via direct helper invocation.
// ============================================================
var TERRAIN_SEEDS = {
  'Grassy Seed':  { terrain: 'grassy',   stat: 'def', stages: 1 },
  'Electric Seed':{ terrain: 'electric', stat: 'def', stages: 1 },
  'Psychic Seed': { terrain: 'psychic',  stat: 'spd', stages: 1 },
  'Misty Seed':   { terrain: 'misty',    stat: 'spd', stages: 1 },
};

// T9j.17 helper -- triggered from applyEntryAbility (switch-in) and from any
// future terrain-set hook. Returns true iff the seed activated. Boosts cap
// at +6, item is consumed (sets itemConsumed flag for Unburden).
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed (mechanics box)
function tryTerrainSeed(mon, field, log) {
  if (!mon || !mon.alive) return false;
  if (mon.itemConsumed) return false;
  var seed = TERRAIN_SEEDS[mon.item];
  if (!seed) return false;
  if (!field || field.terrain !== seed.terrain) return false;
  // Ungrounded mons (Flying / Levitate) do NOT receive terrain effects, so
  // their seed should not consume either. Cite: Bulbapedia Terrain.
  if (mon.flying) return false;
  if (!mon.statBoosts) mon.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
  var prev = mon.statBoosts[seed.stat] || 0;
  mon.statBoosts[seed.stat] = Math.min(6, prev + seed.stages);
  mon.itemConsumed = true;
  var prettyStat = (seed.stat === 'def') ? 'Defense' : 'Special Defense';
  if (log) log.push(mon.name + "'s " + mon.item + ' raised its ' + prettyStat + '!');
  return true;
}

function applyWeatherAbility(mon, field, log) {
  if (!mon || !mon.alive || !field) return false;
  if (mon.ability === 'Drought') {
    field.weather = 'sun';
    field.weatherTurns = 5;
    if (log) log.push(`${mon.name}'s Drought summoned harsh sunlight!`);
    return true;
  }
  if (mon.ability === 'Drizzle') {
    field.weather = 'rain';
    field.weatherTurns = 5;
    if (log) log.push(`${mon.name}'s Drizzle summoned rain!`);
    return true;
  }
  if (mon.ability === 'Sand Stream') {
    field.weather = 'sand';
    field.weatherTurns = 5;
    if (log) log.push(`${mon.name}'s Sand Stream summoned a sandstorm!`);
    return true;
  }
  if (mon.ability === 'Snow Warning') {
    field.weather = 'snow';
    field.weatherTurns = 5;
    if (log) log.push(`${mon.name}'s Snow Warning summoned snow!`);
    return true;
  }
  return false;
}

function applyTerrainAbility(mon, field, log) {
  if (!mon || !mon.alive || !field) return false;
  if (mon.ability === 'Grassy Surge') {
    field.terrain = 'grassy'; field.terrainTurns = 5;
    if (log) log.push(`${mon.name}'s Grassy Surge set Grassy Terrain!`);
    return true;
  }
  if (mon.ability === 'Electric Surge') {
    field.terrain = 'electric'; field.terrainTurns = 5;
    if (log) log.push(`${mon.name}'s Electric Surge set Electric Terrain!`);
    return true;
  }
  if (mon.ability === 'Misty Surge') {
    field.terrain = 'misty'; field.terrainTurns = 5;
    if (log) log.push(`${mon.name}'s Misty Surge set Misty Terrain!`);
    return true;
  }
  if (mon.ability === 'Psychic Surge') {
    field.terrain = 'psychic'; field.terrainTurns = 5;
    if (log) log.push(`${mon.name}'s Psychic Surge set Psychic Terrain!`);
    return true;
  }
  return false;
}

function applySeedSowerOnHit(target, field, log) {
  if (!target || !target.alive || !field || target.ability !== 'Seed Sower') return false;
  field.terrain = 'grassy';
  field.terrainTurns = 5;
  if (log) log.push(`${target.name}'s Seed Sower set Grassy Terrain!`);
  _recordEffectEvent(field, target, 'Seed Sower', 'ability-terrain-set', target.hp, target.hp, {
    source: 'pokemon-showdown ability metadata + engine rule',
    ability: 'Seed Sower',
    terrain: 'grassy',
    terrain_turns: field.terrainTurns,
    note: 'Seed Sower activated after the Pokemon was hit by a damaging attack.'
  });
  return true;
}

// T9j.8 — Ability hook dispatcher. Safe call: returns null when no ability or
// no matching hook. Invoked from engine trigger points.
function callAbilityHook(mon, hookName, ctx) {
  if (!mon || !mon.ability) return null;
  if ((hookName === 'onTryHit' || hookName === 'onSourceModifyAtk' || hookName === 'onSourceModifyDamage') &&
      ctx && _attackerIgnoresTargetAbility(ctx.attacker, mon)) return null;
  var ability = ABILITIES[mon.ability];
  if (!ability || typeof ability[hookName] !== 'function') return null;
  try {
    return ability[hookName](ctx);
  } catch (e) {
    // Ability hooks must never crash the engine. Log and continue.
    if (ctx && ctx.log) ctx.log.push('[ability-error] ' + mon.ability + '.' + hookName + ': ' + e.message);
    return null;
  }
}

// T9j.7 — Mega trigger policy enum. `var` for TDZ-safety (referenced from
// Pokemon constructor before top-of-file const binding would be reached).
var MEGA_TRIGGER_POLICY = {
  FIRST_ELIGIBLE: 'first_eligible',   // default — AI Megas on first legal turn
  AT_TURN:        'at_turn',           // sweep mode — triggers on mon.megaTriggerTurn
  NEVER:          'never'              // sweep baseline — skip Mega this battle
};

// T9j.7 — Trigger decision helper. Consulted at start of each turn by
// simulateBattle's Mega Evolution phase.
function shouldMegaThisTurn(mon, currentTurn) {
  if (!mon || !mon.megaForm || mon.hasMegaEvolved || !mon.alive) return false;
  var p = mon.megaPolicy || MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE;
  if (p === MEGA_TRIGGER_POLICY.NEVER) return false;
  if (p === MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE) return true;
  if (p === MEGA_TRIGGER_POLICY.AT_TURN) return currentTurn >= (mon.megaTriggerTurn || 1);
  return false;
}

// Issue #141 / mirrored #46 - canonical Pokemon role classifier.
var CANONICAL_ROLES = [
  'Sweeper',
  'Wall',
  'Tank',
  'Speed Control',
  'Pivot',
  'Support',
  'Weather Control'
];

var ROLE_SPEED_MOVES = ['Icy Wind','Electroweb','Bulldoze','Rock Tomb','Scary Face','Tailwind','Trick Room','Dragon Dance','Agility','Trailblaze'];
var ROLE_SPEED_ABILITIES = ['Chlorophyll','Swift Swim','Sand Rush','Slush Rush','Unburden','Surge Surfer'];
var ROLE_PIVOT_MOVES = ['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport','Baton Pass'];
var ROLE_SUPPORT_MOVES = ['Follow Me','Rage Powder','Fake Out','Helping Hand','Wide Guard','Quick Guard','Reflect','Light Screen','Aurora Veil','Heal Pulse','Encore','Taunt'];
var ROLE_WEATHER_MOVES = ['Sunny Day','Rain Dance','Snowscape','Sandstorm'];
var ROLE_WEATHER_ABILITIES = ['Drought','Drizzle','Snow Warning','Sand Stream'];
var ROLE_RECOVERY_MOVES = ['Recover','Roost','Strength Sap','Moonlight','Morning Sun','Synthesis','Slack Off','Soft-Boiled','Wish'];
var ROLE_STALL_MOVES = ['Will-O-Wisp','Iron Defense','Calm Mind','Bulk Up','Amnesia','Cosmic Power','Leech Seed'];
var ROLE_BOOSTING_MOVES = ['Swords Dance','Nasty Plot','Dragon Dance','Quiver Dance','Calm Mind','Bulk Up','Shell Smash','Agility','Trailblaze'];
var ROLE_DAMAGE_ITEMS = ['Life Orb','Choice Band','Choice Specs','Choice Scarf','Expert Belt','Clear Amulet'];

function _roleStatsFor(mon) {
  var base = (mon && mon.name && _showdownSpeciesBase(mon.name)) ||
    ((typeof BASE_STATS !== 'undefined' && mon && mon.name && BASE_STATS[mon.name]) ? BASE_STATS[mon.name] : {});
  return {
    hp:  Number(base.hp  || mon && mon.hp  || 80),
    atk: Number(base.atk || mon && mon.atk || 80),
    def: Number(base.def || mon && mon.def || 80),
    spa: Number(base.spa || mon && mon.spa || 80),
    spd: Number(base.spd || mon && mon.spd || 80),
    spe: Number(base.spe || mon && mon.spe || 80)
  };
}

function _roleHasAny(values, needles) {
  values = values || [];
  return needles.some(function(n){ return values.indexOf(n) >= 0; });
}

function _roleAdd(out, role) {
  if (CANONICAL_ROLES.indexOf(role) >= 0 && out.indexOf(role) < 0 && out.length < 4) out.push(role);
}

function classifyPokemon(mon) {
  mon = mon || {};
  var stats = _roleStatsFor(mon);
  stats.total = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;

  var moves = Array.isArray(mon.moves) ? mon.moves.slice(0, 4) : [];
  var ability = mon.ability || '';
  var item = mon.item || '';
  var roles = [];
  var offense = Math.max(stats.atk, stats.spa);
  var mixedOffense = Math.min(stats.atk, stats.spa);
  var bulk = stats.hp + Math.max(stats.def, stats.spd);
  var balancedBulk = stats.hp + Math.min(stats.def, stats.spd);

  if (_roleHasAny(moves, ROLE_SPEED_MOVES) || ROLE_SPEED_ABILITIES.indexOf(ability) >= 0) _roleAdd(roles, 'Speed Control');
  if (_roleHasAny(moves, ROLE_PIVOT_MOVES)) _roleAdd(roles, 'Pivot');
  if (_roleHasAny(moves, ROLE_SUPPORT_MOVES) || ability === 'Intimidate' || ability === 'Prankster') _roleAdd(roles, 'Support');
  if (_roleHasAny(moves, ROLE_WEATHER_MOVES) || ROLE_WEATHER_ABILITIES.indexOf(ability) >= 0) _roleAdd(roles, 'Weather Control');
  if (bulk >= 210 || balancedBulk >= 190 || _roleHasAny(moves, ROLE_RECOVERY_MOVES) || _roleHasAny(moves, ROLE_STALL_MOVES)) _roleAdd(roles, 'Wall');
  if (offense >= 115 && (bulk >= 185 || stats.hp >= 95 || stats.def >= 105 || stats.spd >= 105)) _roleAdd(roles, 'Tank');
  if (stats.spe >= 100 || offense >= 120 || mixedOffense >= 105 || _roleHasAny(moves, ROLE_BOOSTING_MOVES) || ROLE_DAMAGE_ITEMS.indexOf(item) >= 0) _roleAdd(roles, 'Sweeper');

  if (!roles.length) {
    if (offense >= 100) _roleAdd(roles, 'Sweeper');
    else if (bulk >= 190) _roleAdd(roles, 'Wall');
    else _roleAdd(roles, 'Support');
  }

  return {
    roles: roles,
    stats: stats,
    evs: mon.evs || {},
    ivs: mon.ivs || {},
    nature: mon.nature || '',
    ability: ability,
    item: item,
    moves: moves
  };
}

class Pokemon {
  constructor(data, teamStyle, teamFormat) {
    this.name = data.name;
    this.item = data.item;
    this.ability = data.ability;
    this.nature = data.nature;
    this.evs = data.evs || { hp:0,atk:0,def:0,spa:0,spd:0,spe:0 };
    this.moves = [...data.moves];
    this.role = data.role || '';
    this.roles = (typeof classifyPokemon === 'function' ? (classifyPokemon(data).roles || []) : []);
    this.teamStyle = teamStyle;
    this.tera = data.teraType || data.tera_type || data.tera || null;
    // Issue #T1: Champions Stat Point (SP) system support.
    // Champions replaced SV-style EVs with Stat Points:
    //   - Per-stat cap 32 (SV: 252), total cap 66 (SV: 510)
    //   - IVs fixed at 31 and removed from formula
    //   - HP = Base + SP + 75 ; Other = floor((Base + SP + 20) * Alignment)
    // Source: https://bulbapedia.bulbagarden.net/wiki/Stat_point
    // Format resolution order: explicit teamFormat > auto-detect from spread shape > 'sv'.
    //
    // T9j.13 (Refs #42) — Format-mismatch guard.
    // If the team is declared 'champions' but the spread is SV-scale (total > 66
    // OR any stat > 32), fall back to SV-scale to prevent god-tier stats from the
    // Champions HP formula (Base + SP + 75) being applied to a 252 SP value.
    // This was the root cause of Cofagrigus / Aurora Veil teams hitting 100% WR
    // in the 5070-battle audit (#42). Non-breaking for legitimate Champions
    // teams because they already satisfy the cap; only misdeclared teams shift.
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Stat_point
    //   Cite: https://game8.co/games/Pokemon-Champions/archives/538683
    var _declaredFmt = teamFormat || data.format || null;
    var _resolvedStatFormat = resolveMonStatFormat(data, _declaredFmt);
    this.teamFormat = _declaredFmt;
    this.statFormat = _resolvedStatFormat.statFormat;
    this.formatMismatch = _resolvedStatFormat.formatMismatch;

    // T9j.7 — Mega form resolution.
    // If this is a -Mega name and we have a CHAMPIONS_MEGAS entry AND the
    // correct Mega Stone is held, enter battle in BASE form. Store Mega form
    // for later trigger during simulateBattle. Backward-compat: no stone held
    // means legacy behavior (name unchanged, Mega stats from turn 1).
    const _megaInfo = (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[data.name]) || null;
    if (_megaInfo && _megaInfo.baseSpecies && data.item === _megaInfo.megaStone) {
      this.megaForm = {
        megaName:    data.name,
        megaStats:   _megaInfo.megaBaseStats,
        megaTypes:   _megaInfo.types,
        megaAbility: _megaInfo.ability,
        stone:       _megaInfo.megaStone
      };
      this.displayName = data.name;                 // keep Mega name for UI
      this.name        = _megaInfo.baseSpecies;     // engine reads base stats
      this.ability     = (typeof CHAMPIONS_BASE_ABILITIES !== 'undefined'
                         && CHAMPIONS_BASE_ABILITIES[_megaInfo.baseSpecies])
                         || this.ability;
      this.hasMegaEvolved = false;
    } else {
      this.megaForm       = null;
      this.hasMegaEvolved = false;
      this.displayName    = data.name;
    }
    // Default Mega trigger policy (overridden by sweep driver).
    this.megaPolicy      = (typeof MEGA_TRIGGER_POLICY !== 'undefined'
                           ? MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE : 'first_eligible');
    this.megaTriggerTurn = 1;

    // Source order: generated Showdown species rows first; local tables only
    // backfill unknown/custom/partial rows and Champions-specific overrides.
    const _showdownBaseStats = _showdownSpeciesBase(this.name);
    const _isAegislashStanceMon = data.ability === 'Stance Change' &&
      (data.name === 'Aegislash' || data.name === 'Aegislash-Blade');
    const _aegislashShieldBase = _isAegislashStanceMon ? (_showdownSpeciesBase('Aegislash') || BASE_STATS.Aegislash || null) : null;
    const _aegislashBladeBase = _isAegislashStanceMon ? (_showdownSpeciesBase('Aegislash-Blade') || BASE_STATS['Aegislash-Blade'] || null) : null;
    const _baseStats = _showdownBaseStats || BASE_STATS[this.name] || { hp:80,atk:80,def:80,spa:80,spd:80,spe:80, types:['Normal'] };
    const _sourceWeightKg = Number(data.weightkg != null ? data.weightkg : _showdownSpeciesWeightKg(this.name));
    this.weightkg = Number.isFinite(_sourceWeightKg) && _sourceWeightKg > 0 ? _sourceWeightKg : 0;
    // Use POKEMON_TYPES_DB for more accurate type coverage on imported Pokémon
    const _types = (_showdownBaseStats && Array.isArray(_showdownBaseStats.types) && _showdownBaseStats.types.length)
      ? _showdownBaseStats.types
      : (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[this.name])
      ? POKEMON_TYPES_DB[this.name]
      : _baseStats.types;
    this._base = Object.assign({}, _baseStats, { types: _types });
    this.types = [...this._base.types];
    this.stanceChangeForms = null;
    this.stanceForm = null;
    if (_isAegislashStanceMon && _aegislashShieldBase && _aegislashBladeBase) {
      const _shieldTypes = Array.isArray(_aegislashShieldBase.types) && _aegislashShieldBase.types.length
        ? _aegislashShieldBase.types.slice()
        : this.types.slice();
      const _bladeTypes = Array.isArray(_aegislashBladeBase.types) && _aegislashBladeBase.types.length
        ? _aegislashBladeBase.types.slice()
        : _shieldTypes.slice();
      this.stanceChangeForms = {
        shield: Object.assign({}, _aegislashShieldBase, { types: _shieldTypes }),
        blade: Object.assign({}, _aegislashBladeBase, { types: _bladeTypes })
      };
      this.stanceForm = (data.name === 'Aegislash-Blade') ? 'blade' : 'shield';
      this._base = Object.assign({}, this.stanceChangeForms[this.stanceForm], {
        types: this.stanceChangeForms[this.stanceForm].types.slice()
      });
      this.types = this._base.types.slice();
      this.name = 'Aegislash';
      this.displayName = 'Aegislash';
    }
    this.level = data.level || 50;
    this._calcStats();
    const _initialHp = (data.hp != null ? data.hp : (data.currentHp != null ? data.currentHp : this.maxHp));
    this.hp = Math.max(1, Math.min(this.maxHp, _initialHp));
    this.status = data.status || null; // burn, paralysis, sleep, poison, toxic, frozen
    this.statusTurns = data.statusTurns || 0;
    // T9j.4 (#41) — status residual counters.
    // toxicCounter: N in the N/16 Bad Poison formula. Starts at 1 on inflict,
    //   increments post-tick, caps at 15, resets on switch-out.
    // frozenTurns: turns spent frozen. Champions: 25% thaw per move attempt;
    //   guaranteed thaw on turn 3 (3-turn maximum).
    // sleepTurns: turns-asleep counter for 33% turn-2 wake and 3-turn cap.
    // Cite: Bulbapedia Freeze (Pokemon Champions section); Bulbapedia Status.
    this.toxicCounter = data.toxicCounter || 0;
    this.frozenTurns  = data.frozenTurns || 0;
    this.sleepTurns   = data.sleepTurns || 0;
    this.tauntedTurns = data.tauntedTurns || 0;
    this.encoredTurns = data.encoredTurns || 0;
    this.encoredMove  = data.encoredMove || null;
    this.lastMoveUsed  = null;
    this.lastTarget    = null;
    this.protectChain  = 0;
    this.protectKind   = null;
    this.enduring      = false;
    this.turnsSinceEntry = 0;
    // T9j.17 (Refs #101) -- Fake Out hard-gate flag. Initialized false so first
    // turn out is the only legal use. Reset on every switch-in (replaceOnField).
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move)
    this._fakeDone    = false;
    // T9j.6 (#18) — Choice Scarf move lock. Set to move name after first use,
    // cleared on switch in. Champions only has Choice Scarf (Band/Specs absent).
    this.choiceLock   = null;
    this.proteanUsed  = !!data.proteanUsed;
    // Optional charge-state hydration is used by deterministic engine tests and
    // replay-style state restoration. Normal team imports do not populate it.
    this.chargingMove = data.chargingMove || null;
    this.chargingTarget = data.chargingTarget || null;
    this.chargingTargetSide = data.chargingTargetSide || null;
    this.chargingTargetSlot = Number.isFinite(data.chargingTargetSlot) ? data.chargingTargetSlot : null;
    this.concealedByMove = data.concealedByMove || null;
    this.statBoosts = Object.assign(
      { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
      data.statBoosts || {}
    );
    this.leechSeededBy = data.leechSeededBy || null;
    this.perishSongTurns = data.perishSongTurns || 0;
    this.healBlockedTurns = data.healBlockedTurns || 0;
    this.throatChopTurns = data.throatChopTurns || 0;
    this.confusionTurns = data.confusionTurns || 0;
    this.trappedByMove = data.trappedByMove || null;
    this.trappedByMon = data.trappedByMon || null;
    this._statsRaisedThisTurn = false;
    this.lastMoveFailed = !!data.lastMoveFailed;
    this.alive = true;
    this.hasActed = false;
    this.teraActivated = false;
    this.itemConsumed = false;
    this.substituteHp = Math.max(0, data.substituteHp || 0);
    this.roosting = false;
    // Sinistcha Hospitality: restores ally HP on switch
    this.hospitality = (this.ability === 'Hospitality');
    // Multiscale: halves first hit if full HP
    this.multiscaleActive = (this.ability === 'Multiscale');
    // T9j.1 (Issue #25) — side-state plumbing.
    // this.side is assigned by simulateBattle once the mon is placed on a side.
    // Points to the field's side object ({tailwind, tailwindTurns, reflect,
    // lightScreen, auroraVeil, fainted}). Reads of target.side.X in calcDamage
    // (screens, Last Respects ramp) rely on this.
    this.side = null;
    // T9j.1 — grounded check for terrain immunity and Ground-type immunity.
    // Mon is 'flying' (ungrounded) if Flying type OR Levitate ability.
    // Iron Ball, Gravity, Thousand Arrows, Roost mid-turn can override this —
    // not modeled yet (tracked separately).
    this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
  }

  // Issue #T1: Auto-detect SP vs SV spreads.
  // Champions spreads: every stat ≤32 AND total ≤66 AND total > 0.
  // All-zero or anything exceeding the SP caps → SV (preserves legacy behavior).
  _detectStatFormat(evs) {
    return detectSpreadStatFormat(evs);
  }

  // T9j.13 (Refs #42) — static shape check. Returns true iff the spread
  // satisfies the Champions SP caps (per-stat ≤32, total ≤66).
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/Stat_point
  //   Cite: https://pokeos.com/p/champions/stats
  static _spreadFitsChampions(evs) {
    return spreadFitsChampions(evs);
  }

  // Issue #4 FIX: _stat() is HP-only. Removed broken nature logic that
  // compared a stat-key string to a numeric base value (always returned nm=1).
  // Natures do not apply to HP — no nature logic needed here.
  // Issue #T1: Dual-mode formula for Champions Stat Points.
  _stat(base, ev, nature, isHp) {
    if (this.statFormat === 'champions') {
      // Champions HP: Base + SP + 75 (no IV, L50 fixed)
      if (isHp) return base + (ev || 0) + 75;
      // Non-HP fallback (should not be called — _statRaw() handles all non-HP stats)
      return Math.floor(base + (ev || 0) + 20);
    }
    // SV formula (unchanged)
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

  // T9j.7 — Perform Mega Evolution at start of turn.
  // Swaps stats, types, ability. Preserves HP%, stat boosts, status, item,
  // side-state, turn counters, PP. Idempotent — returns false if already
  // evolved or not Mega-capable.
  megaEvolve(log, field) {
    if (!this.megaForm || this.hasMegaEvolved) return false;
    const m = this.megaForm;
    const hpFrac = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1;
    // Swap base stats + types
    this._base = Object.assign({}, m.megaStats, { types: m.megaTypes.slice() });
    this.types = m.megaTypes.slice();
    this.name = m.megaName;
    this.displayName = m.megaName;
    this.ability = m.megaAbility;
    // Recalculate derived stats
    this._calcStats();
    this.hp = Math.max(1, Math.round(this.maxHp * hpFrac));
    // Re-evaluate derived flags that depend on ability/types.
    this.multiscaleActive = (this.ability === 'Multiscale') && this.hp === this.maxHp;
    this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
    this.hasMegaEvolved = true;
    if (log) log.push(`${m.megaName} Mega Evolved!`);
    if (field) applyWeatherAbility(this, field, log);
    return true;
  }

  setStanceForm(form) {
    if (!this.stanceChangeForms) return false;
    if (form !== 'shield' && form !== 'blade') return false;
    if (this.stanceForm === form) return false;
    const nextBase = this.stanceChangeForms[form];
    if (!nextBase) return false;
    const currentHp = this.hp;
    this._base = Object.assign({}, nextBase, { types: nextBase.types.slice() });
    this.types = nextBase.types.slice();
    this.stanceForm = form;
    this._calcStats();
    this.hp = Math.min(this.maxHp, currentHp);
    this.multiscaleActive = (this.ability === 'Multiscale') && this.hp === this.maxHp;
    this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
    return true;
  }

  _statRaw(base, ev, stat) {
    // Nature / Stat Alignment table is identical in both systems (0.9 / 1.0 / 1.1).
    const natureBonus = {
      Hardy:{}, Docile:{}, Serious:{}, Bashful:{}, Quirky:{},
      Lonely:{atk:1.1,def:0.9}, Brave:{atk:1.1,spe:0.9},
      Adamant:{atk:1.1,spa:0.9}, Naughty:{atk:1.1,spd:0.9},
      Bold:{def:1.1,atk:0.9}, Relaxed:{def:1.1,spe:0.9},
      Impish:{def:1.1,spa:0.9}, Lax:{def:1.1,spd:0.9},
      Timid:{spe:1.1,atk:0.9}, Hasty:{spe:1.1,def:0.9},
      Jolly:{spe:1.1,spa:0.9}, Naive:{spe:1.1,spd:0.9},
      Modest:{spa:1.1,atk:0.9}, Mild:{spa:1.1,def:0.9},
      Quiet:{spa:1.1,spe:0.9}, Rash:{spa:1.1,spd:0.9},
      Calm:{spd:1.1,atk:0.9}, Gentle:{spd:1.1,def:0.9},
      Sassy:{spd:1.1,spe:0.9}, Careful:{spd:1.1,spa:0.9}
    };
    const nm = (natureBonus[this.nature] || {})[stat] || 1;
    if (this.statFormat === 'champions') {
      // Champions: floor((Base + SP + 20) × Alignment)
      return Math.floor((base + (ev || 0) + 20) * nm);
    }
    // SV (unchanged)
    const iv = 31;
    return Math.floor(Math.floor((2*base + iv + Math.floor(ev/4)) * this.level / 100 + 5) * nm);
  }

  getStat(stat, field) {
    field = field || { weather: 'none' };
    const effectiveWeather = _effectiveFieldWeather(field);
    const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
    const base = { atk:this.baseAtk, def:this.baseDef, spa:this.baseSpa, spd:this.baseSpd, spe:this.baseSpe }[stat];
    const boost = this.statBoosts[stat] || 0;
    let val = boost >= 0 ? base * boostTable[boost] : base / boostTable[-boost];
    // Paralysis halves speed (Gen 9 — no action skip, speed only)
    if (stat === 'spe' && this.status === 'paralysis') val *= 0.5;
    // Sand Rush doubles speed in sand
    if (stat === 'spe' && this.ability === 'Sand Rush' && effectiveWeather === 'sand') val *= 2;
    // Unburden doubles speed after item consumed
    if (stat === 'spe' && this.ability === 'Unburden' && this.itemConsumed) val *= 2;
    // Intimidate already applied to statBoosts.atk
    if (stat === 'atk' && (this.ability === 'Huge Power' || this.ability === 'Pure Power')) val *= 2;
    // Standard baseline: Rock-types gain 1.5x Special Defense in sand.
    if (stat === 'spd' && effectiveWeather === 'sand' && Array.isArray(this.types) && this.types.includes('Rock')) val *= 1.5;
    // Eviolite for Dusclops
    if ((stat === 'def' || stat === 'spd') && this.item === 'Eviolite') val *= 1.5;
    // T9j.6 (#18) — Choice Scarf +50% Spe (confirmed in Champions). Band/Specs
    // absent from Champions launch (IGN Changes, games.gg); kept here as no-op
    // safe: if user imports a legacy set with Band/Specs, they simply have no
    // effect (matches in-game reality until items are added).
    if (stat === 'spe' && this.item === 'Choice Scarf') val *= 1.5;
    // (Choice Band / Choice Specs multipliers removed — #11 WONTFIX pattern.)
    // T9j.6 (#11 WONTFIX) — Assault Vest absent from Champions launch item pool
    // (Game8 Champions item list; IGN Champions Changes). No effect applied.
    // Trick Room is a turn-order rule, so it is applied by the action/speed
    // comparators. This getter returns boosted Speed only.
    return Math.floor(val);
  }

  getEffSpeed(field) {
    let spe = this.getStat('spe', field);
    const effectiveWeather = _effectiveFieldWeather(field);
    // T9j.1 (Issue #28) — Tailwind doubles effective speed for the side that set it.
    // Champions: Tailwind lasts 4 turns (turns active + 3 more) per Game8 page;
    // counter handled in Field.endTurn().
    const side = this.side;
    if (side && side.tailwind) spe *= 2;
    // Weather speed abilities consolidated here so they compound correctly with Tailwind.
    if (this.ability === 'Swift Swim'   && effectiveWeather === 'rain') spe *= 2;
    if (this.ability === 'Chlorophyll'  && effectiveWeather === 'sun')  spe *= 2;
    if (this.ability === 'Slush Rush'   && effectiveWeather === 'snow') spe *= 2;
    return spe;
  }

  // Issue #2 FIX: calcDamage now receives rng from simulateBattle scope
  // T9j.8 (Refs #27): crit roll + bypass rules applied inline when crit lands.
  // T9j.8 (Refs #30): Dragonize (type override + BP mult) and Mega Sol
  //   (personal-sun effective weather) consulted via onModifyMove / onWeatherCheck.
  calcDamage(move, target, field, partner, rng) {
    // --- T9j.8 (Refs #30) Dragonize onModifyMove: Normal -> Dragon + 20% BP ---
    let _typeOverride = null;
    let _bpMult = 1;
    const _modRes = callAbilityHook(this, 'onModifyMove', { move: move, attacker: this, field: field });
    if (_modRes) {
      if (_modRes.typeOverride) _typeOverride = _modRes.typeOverride;
      if (_modRes.bpMult) _bpMult = _modRes.bpMult;
    }
    let moveType = _resolveDynamicMoveType(this, move, field, _typeOverride || _moveType(move));

    // --- T9j.9 (Refs #3) Physical/Special classifier ---
    // Data-driven: MOVE_CATEGORY from data.js is the canonical source of truth.
    // Fallback: legacy type-heuristic if the move is missing from the table,
    // with a one-shot console warning so gaps are visible in the test log.
    //   Cite: https://game8.co/games/Pokemon-Champions/archives/590527
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Damage_category
    let isPhysical;
    const moveCategory = _moveCategory(move);
    if (move === 'Tera Blast' && this.teraActivated && this.tera) {
      isPhysical = _teraBlastUsesPhysical(this);
    } else if (moveCategory) {
      isPhysical = moveCategory === 'physical';
    } else {
      // Fallback: Gen 1-3 style type-based physical/special split.
      const _physTypes = ['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel'];
      isPhysical = _physTypes.includes(moveType);
      if (typeof _WARNED_MOVE_CAT === 'undefined') { globalThis._WARNED_MOVE_CAT = new Set(); }
      if (!globalThis._WARNED_MOVE_CAT.has(move)) {
        globalThis._WARNED_MOVE_CAT.add(move);
        engineLogWarn('Missing move category; using type fallback', { move: move });
      }
    }

    // --- T9j.8 (Refs #27) Crit roll ---
    // Stage ladder: base 0, +1 HIGH_CRIT, +3 ALWAYS_CRIT. Force-crit via field._ctx.forceCrit (tests).
    let _critStage = 0;
    if (HIGH_CRIT_MOVES.has(move)) _critStage += 1;
    if (ALWAYS_CRIT_MOVES.has(move)) _critStage += 3;
    const _critProb = CRIT_STAGES[Math.min(_critStage, CRIT_STAGES.length - 1)];
    const _forceCrit = !!(field && field._ctx && field._ctx.forceCrit);
    const _forceNoCrit = !!(field && field._ctx && field._ctx.forceNoCrit);
    const _critBlocked = _targetAbilityActive(target, this, 'Shell Armor');
    const _isCrit = !_critBlocked && (_forceCrit || (!_forceNoCrit && rng() < _critProb));
    if (_isCrit && field && field._ctx) field._ctx.lastWasCrit = true;

    // Weather Ball, Terrain Pulse, and active Tera Blast resolve dynamic type
    // before STAB, chart, and weather damage modifiers are resolved.
    const _fieldWeather = _effectiveFieldWeather(field);
    const _tryHitPreview = callAbilityHook(target, 'onTryHit', {
      move: move,
      moveType: moveType,
      attacker: this,
      defender: target,
      field: field
    });
    if (_tryHitPreview && _tryHitPreview.immune) return 0;
    if (move === 'Poltergeist' && !_hasUsableHeldItem(target)) return 0;

    // T9j.8 (Refs #30) Mega Sol: personal sun when field weather is 'none'.
    let _effWeather = _effectiveMoveWeather(this, field, moveType);

    // Meteor Beam / Electro Shot raise SpA before damage. When calcDamage is
    // called directly in tests or heuristics, preview the stage locally without
    // mutating persistent state. executeMove marks the already-applied path so
    // battle execution does not double count it.
    const _ctx = field && field._ctx ? field._ctx : null;
    const _spaPreviewBlocked = !!(_ctx && _ctx.preDamageSpaBoostMon === this && _ctx.preDamageSpaBoostMove === move);
    const _spaPreviewDelta = (!isPhysical && !_spaPreviewBlocked) ? _preDamageSpaBoostDelta(this, move) : 0;
    const _spaPreviewApplied = _spaPreviewDelta ? _applyStageDelta(this, 'spa', _spaPreviewDelta) : 0;

    // Atk / Def with crit bypass.
    //   Crit: attacker ignores negative Atk/SpA stages (takes 0 instead).
    //         defender ignores positive Def/SpD stages (takes 0 instead).
    //         Burn still halves physical Atk (Gen 6+).
    let atk, def;
    const aStatKey = _moveOverrideOffensiveStat(move, isPhysical);
    const dStatKey = _moveOverrideDefensiveStat(move, isPhysical);
    const attackStatSource = move === 'Foul Play' ? target : this;
    const aBoost = attackStatSource.statBoosts[aStatKey] || 0;
    const dBoost = target.statBoosts[dStatKey] || 0;
    let aOverride = aBoost;
    let dOverride = dBoost;
    if (move !== 'Foul Play' && _targetAbilityActive(target, this, 'Unaware')) aOverride = 0;
    if (this.ability === 'Unaware') dOverride = 0;
    if (move === 'Darkest Lariat') dOverride = 0;
    if (_isCrit) {
      if (aOverride < 0) aOverride = 0;
      if (dOverride > 0) dOverride = 0;
    }
    const _aSaved = aBoost;
    const _dSaved = dBoost;
    const _stageOverrideApplied = (aOverride !== aBoost) || (dOverride !== dBoost);
    let _targetPhysicalPowerIgnored = false;
    let _userPhysicalPowerApplied = false;
    try {
      if (_stageOverrideApplied) {
        attackStatSource.statBoosts[aStatKey] = aOverride;
        target.statBoosts[dStatKey] = dOverride;
      }
      atk = attackStatSource.getStat(aStatKey, field);
      if (move === 'Foul Play' && aStatKey === 'atk' &&
          (attackStatSource.ability === 'Huge Power' || attackStatSource.ability === 'Pure Power')) {
        atk = Math.floor(atk / 2);
        _targetPhysicalPowerIgnored = true;
      }
      def = target.getStat(dStatKey, field);
    } finally {
      if (_stageOverrideApplied) {
        attackStatSource.statBoosts[aStatKey] = _aSaved;
        target.statBoosts[dStatKey] = _dSaved;
      }
      if (_spaPreviewApplied) _applyStageDelta(this, 'spa', -_spaPreviewApplied);
    }
    if (isPhysical && this.ability === 'Guts' && this.status) {
      atk = _applyStatMod(atk, 6144);
    }
    if (isPhysical && (this.ability === 'Huge Power' || this.ability === 'Pure Power') &&
        (attackStatSource !== this || aStatKey !== 'atk')) {
      atk = _applyStatMod(atk, 8192);
      _userPhysicalPowerApplied = true;
    }
    if (!isPhysical && this.ability === 'Solar Power' && _fieldWeather === 'sun') {
      atk = _applyStatMod(atk, 6144);
    }
    if (this.hp <= this.maxHp / 3) {
      if (this.ability === 'Blaze' && moveType === 'Fire') {
        atk = _applyStatMod(atk, 6144);
      }
      if (this.ability === 'Overgrow' && moveType === 'Grass') {
        atk = _applyStatMod(atk, 6144);
      }
    }
    const _sourceAtkRes = callAbilityHook(target, 'onSourceModifyAtk', {
      move: move,
      moveType: moveType,
      attacker: this,
      defender: target,
      field: field
    });
    if (_sourceAtkRes && _sourceAtkRes.statMod) {
      atk = _applyStatMod(atk, _sourceAtkRes.statMod);
    }

    // Base power
    // T9j.9 (Refs #24): BP lookup promoted to data.js MOVE_BP table.
    // Legacy inline BP_MAP kept as secondary fallback for any engine-only
    // Champions additions not yet migrated. Missing moves warn once and use 60.
    //   Cite: https://www.serebii.net/pokemonchampions/updatedattacks.shtml
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Base_power
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
      'Energy Ball':90,'Sludge Bomb':90,'Sleep Powder':0,
      // Issue #T3: Champions-specific additions
      'Night Daze':90,'Spirit Shackle':90,'Trop Kick':85,'Psyshield Bash':90,
      'Beak Blast':120,'Mountain Gale':120,'First Impression':100,
      'Infernal Parade':65,'Bone Rush':30
    };
    let bp;
    const moveBasePower = _moveBasePower(move);
    if (moveBasePower !== undefined) {
      bp = moveBasePower;
    } else if (BP_MAP[move] !== undefined) {
      bp = BP_MAP[move];
    } else {
      bp = 60;
      if (typeof _WARNED_MOVE_BP === 'undefined') { globalThis._WARNED_MOVE_BP = new Set(); }
      if (!globalThis._WARNED_MOVE_BP.has(move)) {
        globalThis._WARNED_MOVE_BP.add(move);
        engineLogWarn('Missing move base power; defaulting to 60', { move: move });
      }
    }
    if (move === 'Low Kick' || move === 'Grass Knot') {
      bp = _targetWeightBasePower(target);
    }
    const _basePowerBeforeModifiers = bp;
    // T9j.8 Dragonize BP multiplier applied after base lookup so spread / screens
    // all see the boosted value.
    if (_bpMult !== 1) bp = Math.floor(bp * _bpMult);
    // T9j.8 Parental Bond child strike: field._ctx.bpMult forces second-hit BP
    // multiplier (0.25). Cleared by executeAction after the second call.
    if (field && field._ctx && field._ctx.bpMult && field._ctx.bpMult !== 1) {
      bp = Math.max(1, Math.floor(bp * field._ctx.bpMult));
    }

    // Weather Ball doubles in active weather and already has its weather type.
    if (move === 'Weather Ball' && _fieldWeather !== 'none') bp = 100;
    if (move === 'Terrain Pulse' && _isGrounded(this) && field.terrain !== 'none') bp *= 2;
    // Electro Shot: 130 in rain (one-turn), else still 130 after charge
    if (move === 'Electro Shot' && _fieldWeather === 'rain') bp = 130;
    if (move === 'Rising Voltage' && field.terrain === 'electric' && _isGrounded(target)) bp *= 2;
    // Last Respects: +50 per fainted ally (max +300)
    if (move === 'Last Respects') {
      const fainted = this.side?.fainted || 0;
      bp = 50 + Math.min(fainted, 5) * 50;
    }
    if (move === 'Stomping Tantrum' && (this.lastMoveFailed || this._previousMoveFailedForDamage)) {
      bp *= 2;
    }
    // Eruption: scales with user HP
    if (move === 'Eruption') {
      bp = Math.max(1, Math.floor(150 * this.hp / this.maxHp));
    }
    if ((move === 'Solar Beam' || move === 'Solar Blade') && (_effWeather === 'rain' || _effWeather === 'sand' || _effWeather === 'snow')) {
      bp = Math.max(1, Math.floor(bp / 2));
    }
    if (move === 'Facade' && ['burn', 'paralysis', 'poison', 'toxic'].includes(this.status)) {
      bp *= 2;
    }

    if (bp === 0) return 0; // Status move

    // Showdown / mainline terrain and Helping Hand modify base power, not the
    // late final-damage stage. Use fixed-point chaining so ranges stay aligned.
    const bpMods = [];
    const _abilityBpRes = callAbilityHook(this, 'onBasePower', {
      move: move,
      moveType: moveType,
      basePower: bp,
      attacker: this,
      defender: target,
      field: field
    });
    if (_abilityBpRes && _abilityBpRes.bpMod) bpMods.push(_abilityBpRes.bpMod);
    const _itemTypeBoostMod = _heldItemTypeBoostMod(this, moveType);
    if (_itemTypeBoostMod !== 4096) bpMods.push(_itemTypeBoostMod);
    const _knockOffBoostMod = move === 'Knock Off' ? _knockOffBasePowerMod(target) : 4096;
    if (_knockOffBoostMod !== 4096) bpMods.push(_knockOffBoostMod);
    if (this.helpingHand) bpMods.push(6144);
    if (_isGrounded(this)) {
      if (field.terrain === 'electric' && moveType === 'Electric') bpMods.push(5325);
      if (field.terrain === 'grassy'  && moveType === 'Grass') bpMods.push(5325);
      if (field.terrain === 'psychic' && moveType === 'Psychic') bpMods.push(5325);
    }
    if (_isGrounded(target)) {
      if (field.terrain === 'misty' && moveType === 'Dragon') bpMods.push(2048);
      if (field.terrain === 'grassy' && (move === 'Earthquake' || move === 'Bulldoze')) bpMods.push(2048);
    }
    bp = _applyBasePowerMods(bp, bpMods);

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
    const targetTypes = (target.teraActivated && target.tera)
      ? [target.tera]
      : target.types;

    let typeEff = 1;
    const chart = TYPE_CHART[moveType] || {};
    for (const t of targetTypes) {
      let eff = (chart[t] !== undefined ? chart[t] : 1);
      // Freeze-Dry replaces Ice's normal Water matchup with super effective.
      if (move === 'Freeze-Dry' && t === 'Water') eff = 2;
      if (eff === 0 && t === 'Ghost' && (this.ability === 'Scrappy' || this.ability === "Mind's Eye") &&
          (moveType === 'Normal' || moveType === 'Fighting')) eff = 1;
      typeEff *= eff;
    }
    if (typeEff === 0) return 0;

    // STAB / Tera STAB follow Showdown's additive fixed-point rules.
    const stabMod = _getStabMod(this, moveType);

    // T9j.2 (Issue #26) — spread 0.75× applied by executeMove when >1 valid
    // target AND format is doubles. Pulled from field._ctx.isSpread so we have
    // access to runtime target-count and format state (set by executeMove,
    // cleared after each per-target calcDamage call).
    const spreadMod = (field && field._ctx && field._ctx.isSpread) ? 3072 : 4096;

    // Weather bonus
    let weatherMod = 4096;
    if (_effWeather === 'sun')  { if (moveType === 'Fire') weatherMod = 6144; if (moveType === 'Water') weatherMod = 2048; }
    if (_effWeather === 'rain') { if (moveType === 'Water') weatherMod = 6144; if (moveType === 'Fire') weatherMod = 2048; }

    // T9j.3 Screens modifier — exact Gen 9 fractions.
    // Singles: 2048/4096 = 0.5. Doubles: 2732/4096 ≈ 0.6670.
    // Aurora Veil: applies to BOTH physical and special (does not stack w/ R/LS).
    // T9j.8 (Refs #27) Crits bypass screens entirely — screenMod forced to 1 on crit.
    const _fmt = (field && field._format) || 'doubles';
    const _screenBase = (_fmt === 'doubles') ? 2732 : 2048;
    let screenMod = 4096;
    const _tSide = target.side;
    if (_tSide && !_isCrit && this.ability !== 'Infiltrator') {
      if (_tSide.auroraVeil) {
        screenMod = _screenBase;
      } else if (isPhysical && _tSide.reflect) {
        screenMod = _screenBase;
      } else if (!isPhysical && _tSide.lightScreen) {
        screenMod = _screenBase;
      }
    }

    // T9j.6 (#11 WONTFIX) — Life Orb absent from Champions launch (games.gg,
    // IGN Champions Changes, Game8 item list). No multiplier.
    const loMod = 4096;
    const supremeOverlordMod = this.ability === 'Supreme Overlord'
      ? SUPREME_OVERLORD_MODS[Math.min(this.side?.fainted || 0, 5)]
      : 4096;
    const _attackerDamageRes = callAbilityHook(this, 'onModifyDamage', {
      move: move,
      moveType: moveType,
      attacker: this,
      defender: target,
      typeEffectiveness: typeEff,
      field: field
    });
    const _defenderDamageRes = callAbilityHook(target, 'onSourceModifyDamage', {
      move: move,
      moveType: moveType,
      attacker: this,
      defender: target,
      typeEffectiveness: typeEff,
      field: field
    });

    // Choice Specs/Band handled in getStat
    // Burn handled in getStat

    // Base damage formula (Gen 9)
    const raw = Math.floor(Math.floor(Math.floor(2 * this.level / 5 + 2) * bp * atk / def) / 50) + 2;
    const roll = _sampleDamageRoll(this, field, rng);
    const applyStatusPenalty =
      (isPhysical && this.status === 'burn' && this.ability !== 'Guts' && move !== 'Facade') ||
      (!isPhysical && this.status === 'frostbite');

    // Match Showdown's stage ordering: spread/weather/crit at base-damage
    // stage, then roll, STAB, type, status penalty, and final modifiers.
    let baseDamage = raw;
    baseDamage = _applyBaseDamageMod(baseDamage, spreadMod);
    baseDamage = _applyBaseDamageMod(baseDamage, weatherMod);
    if (_isCrit) baseDamage = Math.floor(_of32(baseDamage * 1.5));
    const finalMods = [screenMod, loMod, supremeOverlordMod];
    if (_attackerDamageRes && _attackerDamageRes.finalMod) finalMods.push(_attackerDamageRes.finalMod);
    if (_defenderDamageRes && _defenderDamageRes.finalMod) finalMods.push(_defenderDamageRes.finalMod);
    const finalMod = _chain4096Mods(finalMods);
    const finalDamage = _finalizeDamage(baseDamage, roll, typeEff, applyStatusPenalty, stabMod, finalMod);
    if (_ctx && _ctx.captureDamageCalc) {
      const attackerSide = this.side === (field && field.playerSide) ? 'player' : (this.side === (field && field.oppSide) ? 'opponent' : 'unknown');
      const targetSide = target.side === (field && field.playerSide) ? 'player' : (target.side === (field && field.oppSide) ? 'opponent' : 'unknown');
      const _offensiveStatSourceSide = attackStatSource === target ? targetSide : attackerSide;
      const _offensiveStatSourceRole = attackStatSource === target ? 'target' : 'attacker';
      const _nonstandardOffensiveStatSource = attackStatSource !== this || aStatKey !== (isPhysical ? 'atk' : 'spa');
      const _nonstandardDefensiveStat = dStatKey !== (isPhysical ? 'def' : 'spd');
      _ctx.lastDamageCalc = {
        attacker: this.name,
        attacker_key: _snapshotMonStableKey(attackerSide, this),
        target: target.name,
        target_key: _snapshotMonStableKey(targetSide, target),
        move: move,
        move_type: moveType,
        category: isPhysical ? 'physical' : 'special',
        type_effectiveness: typeEff,
        critical: !!_isCrit,
        base_power_initial: Number(_basePowerBeforeModifiers || 0),
        base_power_modified: Number(bp || 0),
        attack_stat_key: aStatKey,
        defense_stat_key: dStatKey,
        attack_stat_stage: Number(aBoost || 0),
        defense_stat_stage: Number(dBoost || 0),
        attack_stat_stage_used: Number(aOverride || 0),
        defense_stat_stage_used: Number(dOverride || 0),
        attack_stat_value: Number(atk || 0),
        defense_stat_value: Number(def || 0),
        attacker_stat_format: this.statFormat || '',
        defender_stat_format: target.statFormat || '',
        attacker_item: this.item || '',
        defender_item: target.item || '',
        attacker_ability: this.ability || '',
        defender_ability: target.ability || '',
        typed_item_boost: _itemTypeBoostMod !== 4096,
        typed_item_boost_mod: Number(_itemTypeBoostMod || 4096),
        knock_off_boost: _knockOffBoostMod !== 4096,
        knock_off_boost_mod: Number(_knockOffBoostMod || 4096),
        spread_mod: Number(spreadMod || 4096),
        weather_mod: Number(weatherMod || 4096),
        screen_mod: Number(screenMod || 4096),
        stab_mod: Number(stabMod || 4096),
        final_mod: Number(finalMod || 4096),
        status_penalty: !!applyStatusPenalty,
        roll: Number(roll || 0),
        weather: _effWeather,
        terrain: field && field.terrain || 'none',
        move_rule_trace: {
          schema_version: 'champions-move-rule-trace-v1',
          source: 'engine.calcDamage',
          move: move,
          move_type: moveType,
          category: isPhysical ? 'physical' : 'special',
          offensive_stat: {
            source_role: _offensiveStatSourceRole,
            source_side: _offensiveStatSourceSide,
            source_name: attackStatSource.name || '',
            source_key: _snapshotMonStableKey(_offensiveStatSourceSide, attackStatSource),
            stat_key: aStatKey,
            stage_seen: Number(aBoost || 0),
            stage_used: Number(aOverride || 0),
            value_used: Number(atk || 0),
            ability: attackStatSource.ability || '',
            target_side_power_ability_ignored: !!_targetPhysicalPowerIgnored,
            user_side_power_ability_applied: !!_userPhysicalPowerApplied
          },
          defensive_stat: {
            source_role: 'target',
            source_side: targetSide,
            source_name: target.name || '',
            source_key: _snapshotMonStableKey(targetSide, target),
            stat_key: dStatKey,
            stage_seen: Number(dBoost || 0),
            stage_used: Number(dOverride || 0),
            value_used: Number(def || 0),
            ability: target.ability || ''
          },
          modifiers: {
            base_power_initial: Number(_basePowerBeforeModifiers || 0),
            base_power_modified: Number(bp || 0),
            typed_item_boost: _itemTypeBoostMod !== 4096,
            typed_item_boost_mod: Number(_itemTypeBoostMod || 4096),
            knock_off_boost: _knockOffBoostMod !== 4096,
            knock_off_boost_mod: Number(_knockOffBoostMod || 4096),
            spread_mod: Number(spreadMod || 4096),
            weather_mod: Number(weatherMod || 4096),
            screen_mod: Number(screenMod || 4096),
            stab_mod: Number(stabMod || 4096),
            final_mod: Number(finalMod || 4096),
            status_penalty: !!applyStatusPenalty,
            critical: !!_isCrit,
            roll: Number(roll || 0),
            type_effectiveness: Number(typeEff || 0)
          },
          ruleset_flags: {
            nonstandard_offensive_stat_source: !!_nonstandardOffensiveStatSource,
            nonstandard_defensive_stat: !!_nonstandardDefensiveStat,
            foul_play_target_attack_source: move === 'Foul Play',
            foul_play_target_power_ability_ignored: !!_targetPhysicalPowerIgnored,
            user_physical_power_ability_applied_to_nonstandard_source: !!_userPhysicalPowerApplied,
            psyshock_targets_defense: move === 'Psyshock' && dStatKey === 'def',
            body_press_uses_user_defense: move === 'Body Press' && aStatKey === 'def' && attackStatSource === this,
            champion_choice_item_modifiers_absent: this.item === 'Choice Band' || this.item === 'Choice Specs'
          }
        }
      };
    }
    return finalDamage;
  }

  applyItem(trigger, field) {
    if (this.itemConsumed) return;
    if (_itemSuppressedByUnnerve(this, field)) return;
    // Lum Berry: clears status
    if (this.item === 'Lum Berry' && trigger === 'status') {
      this.status = null; this.statusTurns = 0; this.itemConsumed = true;
      return `${this.name}'s Lum Berry cured its status!`;
    }
    // Sitrus Berry: restores 25% HP
    if (this.item === 'Sitrus Berry' && trigger === 'damage' && this.hp > 0 && this.hp <= this.maxHp * 0.5 && _canReceiveHealing(this)) {
      const heal = Math.floor(this.maxHp * 0.25);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.itemConsumed = true;
      return `${this.name}'s Sitrus Berry restored HP!`;
    }
    // Oran Berry: restores 10 HP
    if (this.item === 'Oran Berry' && trigger === 'damage' && this.hp > 0 && this.hp <= this.maxHp * 0.5 && _canReceiveHealing(this)) {
      this.hp = Math.min(this.maxHp, this.hp + 10);
      this.itemConsumed = true;
      return `${this.name}'s Oran Berry restored HP!`;
    }
    // Mental Herb: clears taunt etc (placeholder)
    if (this.item === 'Mental Herb' && trigger === 'taunt') {
      this.tauntedTurns = 0;
      this.itemConsumed = true;
      return `${this.name}'s Mental Herb removed the effect!`;
    }
  }
}

// ============================================================
// STATUS INFLICT GATE (T9j.4 #41)
// ============================================================
// Central gate for status inflict attempts. Returns false if the target is
// type-immune, already statused, under weather protection, or has a blocking
// ability. Cite: Bulbapedia Status; Bulbapedia Freeze.
function canInflictStatus(mon, status, field, source) {
  if (!mon || !mon.alive) return false;
  if (mon.status) return false; // one major status at a time
  const effectiveWeather = _effectiveFieldWeather(field);
  const types = mon.types || [];
  if (_isFlowerVeilProtected(mon, source)) return false;
  // Misty Terrain blocks all major status conditions on grounded mons.
  if (field && field.terrain === 'misty' && _isGrounded(mon)) return false;
  // Electric Terrain blocks sleep on grounded mons.
  if (field && field.terrain === 'electric' && status === 'sleep' && _isGrounded(mon)) return false;
  if (status === 'burn'      && (types.includes('Fire')     || mon.ability === 'Water Veil')) return false;
  if (status === 'paralysis' && (types.includes('Electric') || mon.ability === 'Limber')) return false;
  if ((status === 'poison' || status === 'toxic') &&
      (types.includes('Poison') || types.includes('Steel'))) return false;
  if (status === 'frozen'    &&  types.includes('Ice')) return false;
  if (status === 'frozen'    && effectiveWeather === 'sun') return false;
  if (status === 'sleep'     && (mon.ability === 'Sweet Veil' || mon.ability === 'Insomnia')) return false;
  if (status === 'frozen'    && mon.ability === 'Magma Armor')  return false;
  // T9j.17 (Refs #101) -- Frostbite gates. Ice types and Magma Armor block,
  // mirroring Champions' Freeze immunity rules. Sun thaws/prevents same as freeze.
  // Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
  if (status === 'frostbite' && types.includes('Ice')) return false;
  if (status === 'frostbite' && mon.ability === 'Magma Armor') return false;
  if (status === 'frostbite' && effectiveWeather === 'sun') return false;
  return true;
}

function _applyDamagingMoveSecondary(attacker, move, target, field, log, rng) {
  const effect = SECONDARY_EFFECTS[move];
  if (!effect || !target || !target.alive) return false;
  if (attacker && attacker.ability === 'Sheer Force' && SHEER_FORCE_MOVES.has(move)) return false;
  const chance = Number(effect.chance);
  if (Number.isFinite(chance) && chance < 1 && rng() >= chance) return false;
  let applied = false;
  if (effect.targetStages) {
    applied = _applyTargetStageMap(attacker, target, effect.targetStages, log) > 0 || applied;
  }
  if (effect.selfStages) {
    applied = _applyStageMap(attacker, effect.selfStages, log) > 0 || applied;
  }
  if (effect.status && canInflictStatus(target, effect.status, field, attacker)) {
    target.status = effect.status;
    if (effect.status === 'toxic') target.toxicCounter = 1;
    if (effect.status === 'poison') target.toxicCounter = 0;
    if (effect.status === 'sleep') {
      target.statusTurns = 2 + Math.floor(rng() * 2);
      target.sleepTurns = 0;
    }
    if (effect.status === 'frozen') target.frozenTurns = 0;
    const statusLabel = effect.status === 'paralysis' ? 'paralysed'
      : effect.status === 'frozen' ? 'frozen'
      : effect.status === 'burn' ? 'burned'
      : effect.status === 'poison' ? 'poisoned'
      : effect.status;
    if (log) log.push(`${target.name} was ${statusLabel} by ${attacker.name}'s ${move}!`);
    applied = true;
  }
  if (effect.conditionalStatus === 'burn' &&
      effect.condition === 'targetStatsRaisedThisTurn' &&
      target._statsRaisedThisTurn &&
      canInflictStatus(target, 'burn', field, attacker)) {
    target.status = 'burn';
    if (log) log.push(`${target.name} was burned by ${attacker.name}'s ${move}!`);
    applied = true;
  }
  if (effect.volatile === 'confusion') {
    target.confusionTurns = Math.max(target.confusionTurns || 0, 2 + Math.floor(rng() * 4));
    if (log) log.push(`${target.name} became confused!`);
    applied = true;
  }
  if (effect.volatile === 'throatChop') {
    target.throatChopTurns = Math.max(target.throatChopTurns || 0, 2);
    if (log) log.push(`${target.name} cannot use sound-based moves after Throat Chop!`);
    applied = true;
  }
  if (effect.volatile === 'trapped') {
    target.trappedByMove = move;
    target.trappedByMon = attacker;
    if (log) log.push(`${target.name} can no longer escape because of ${move}!`);
    applied = true;
  }
  return applied;
}

function _confusionSelfHitDamage(mon, field, rng) {
  if (!mon || !mon.alive) return 0;
  const atk = mon.getStat ? mon.getStat('atk', field) : 1;
  const def = mon.getStat ? mon.getStat('def', field) : 1;
  const level = mon.level || 50;
  const raw = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * 40 * atk / Math.max(1, def)) / 50) + 2;
  const roll = _sampleDamageRoll(mon, field, rng);
  let dmg = Math.floor(raw * roll);
  if (mon.status === 'burn' && mon.ability !== 'Guts') dmg = Math.floor(dmg / 2);
  return Math.max(1, dmg);
}

// ============================================================
// FIELD STATE
// ============================================================
class Field {
  constructor(init) {
    init = init || {};
    this.weather      = 'none'; // 'sun','rain','sand','snow' (Hail does not exist in Champions; Snow replaces it)
    this.weatherTurns = 0;
    this.trickRoom    = false;
    this.trickRoomTurns = 0;
    this.trickRoomActive = 0;   // T9j.3 (#37): cumulative turns TR was active
    this.terrain      = 'none';
    this.terrainTurns = 0;
    // T9j.3 (#38, screens): tailwind + 3 screens w/ remaining turns AND cumulative active counters.
    this.playerSide = {
      tailwind:false, tailwindTurns:0, tailwindActive:0,
      reflect:false, reflectTurns:0, reflectActive:0,
      lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
      auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
      // T9j.2 (#31/#32) — Wide Guard turn flag + chain counter, redirect target
      wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null,
      quickGuard:false,
      fainted:0,
      activeMons:[],
      wishes:[]
    };
    this.oppSide = {
      tailwind:false, tailwindTurns:0, tailwindActive:0,
      reflect:false, reflectTurns:0, reflectActive:0,
      lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
      auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
      wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null,
      quickGuard:false,
      fainted:0,
      activeMons:[],
      wishes:[]
    };
    // T9j.2 (#26) — spread context sidecar. Set per-hit by executeMove, read by calcDamage.
    // T9j.8 (Refs #27/#30): lastWasCrit (for log/test assertion), bpMult
    // (Parental Bond 2nd hit), forceCrit/forceNoCrit (test harness overrides).
    this._ctx = {
      isSpread:false,
      lastWasCrit:false,
      bpMult:1,
      forceCrit:false,
      forceNoCrit:false,
      captureDamageCalc:false,
      lastDamageCalc:null,
      turnDamageEvents:[],
      turnEffectEvents:[]
    };
    // T9j.7 — One Mega per team per match flags. Once set, no further Megas
    // fire for that side for the remainder of the battle.
    this.playerMegaUsed = false;
    this.oppMegaUsed    = false;
    // T9j.3 (#39) — timer state. Standard VGC: 7 min team, 45s turn. Batch sim
    // uses 15s/turn deterministic proxy → ~28-turn cap. Draw tiebreaker cascade:
    // Pokemon alive > total HP > true draw.
    this.clockPlayer = 7 * 60 * 1000;
    this.clockOpp    = 7 * 60 * 1000;
    this._format     = 'doubles';  // set by simulateBattle from opts.format

    if (init.weather != null) this.weather = init.weather;
    if (init.weatherTurns != null) this.weatherTurns = init.weatherTurns;
    if (init.trickRoom != null) this.trickRoom = init.trickRoom;
    if (init.trickRoomTurns != null) this.trickRoomTurns = init.trickRoomTurns;
    if (init.trickRoomActive != null) this.trickRoomActive = init.trickRoomActive;
    if (init.terrain != null) this.terrain = init.terrain;
    if (init.terrainTurns != null) this.terrainTurns = init.terrainTurns;
    if (init.playerMegaUsed != null) this.playerMegaUsed = init.playerMegaUsed;
    if (init.oppMegaUsed != null) this.oppMegaUsed = init.oppMegaUsed;
    if (init.clockPlayer != null) this.clockPlayer = init.clockPlayer;
    if (init.clockOpp != null) this.clockOpp = init.clockOpp;
    if (init.format != null) this._format = init.format;
    if (init._format != null) this._format = init._format;
    if (init.playerSide) Object.assign(this.playerSide, init.playerSide);
    if (init.oppSide) Object.assign(this.oppSide, init.oppSide);
    if (init._ctx) Object.assign(this._ctx, init._ctx);
  }

  tick(logs) {
    // T9j.2 — clear per-turn Wide Guard + redirect flags at end of turn.
    // Chain counter only resets on non-WG move use (handled in executeAction).
    this.playerSide.wideGuard = false;
    this.oppSide.wideGuard    = false;
    this.playerSide.quickGuard = false;
    this.oppSide.quickGuard    = false;
    this.playerSide.redirectTo = null;
    this.oppSide.redirectTo    = null;
    this.playerSide.redirectType = null;
    this.oppSide.redirectType    = null;
    // Weather countdown
    if (this.weather !== 'none' && this.weatherTurns > 0) {
      this.weatherTurns--;
      if (this.weatherTurns === 0) { logs.push(`The ${this.weather} subsided.`); this.weather = 'none'; }
    }
    // Trick Room countdown — T9j.3 (#37): increment cumulative BEFORE decrement
    if (this.trickRoom) {
      this.trickRoomActive++;
      this.trickRoomTurns--;
      if (this.trickRoomTurns <= 0) { this.trickRoom = false; logs.push('Trick Room returned to NORMAL!'); }
    }
    // Terrain countdown
    if (this.terrain !== 'none' && this.terrainTurns > 0) {
      this.terrainTurns--;
      if (this.terrainTurns === 0) { this.terrain = 'none'; logs.push('The terrain returned to normal.'); }
    }
    // Tailwind + Screens countdowns — T9j.3 (#38, screens): cumulative active + 5-turn countdown for both sides.
    for (const [label, side] of [['Player', this.playerSide], ['Opponent', this.oppSide]]) {
      if (side.tailwind) {
        side.tailwindActive++;
        side.tailwindTurns--;
        if (side.tailwindTurns <= 0) { side.tailwind = false; logs.push(`${label}'s Tailwind ended.`); }
      }
      if (side.reflect) {
        side.reflectActive++;
        side.reflectTurns--;
        if (side.reflectTurns <= 0) { side.reflect = false; logs.push(`${label}'s Reflect wore off.`); }
      }
      if (side.lightScreen) {
        side.lightScreenActive++;
        side.lightScreenTurns--;
        if (side.lightScreenTurns <= 0) { side.lightScreen = false; logs.push(`${label}'s Light Screen wore off.`); }
      }
      if (side.auroraVeil) {
        side.auroraVeilActive++;
        side.auroraVeilTurns--;
        if (side.auroraVeilTurns <= 0) { side.auroraVeil = false; logs.push(`${label}'s Aurora Veil wore off.`); }
      }
    }
  }
}

// ============================================================
// TEAM BUILDER — builds active battlers from team definition
// ============================================================
function buildTeam(teamDef, side) {
  if (!teamDef || !teamDef.members) return [];
  const style = teamDef.style || '';
  // Issue #T1: propagate team.format so Pokemon uses correct stat math.
  return teamDef.members.map(function(m, i) {
    const mon = new Pokemon(m, style, teamDef.format);
    mon.teamSlot = i;
    mon.stableKey = (side || 'team') + ':slot:' + i + ':' + (mon.displayName || mon.name || 'Unknown');
    return mon;
  });
}

function _clamp01(v) {
  v = Number(v);
  if (!isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}

function engineLogWarn(message, fields) {
  const logger = (typeof window !== 'undefined' && window.ChampionsSim && window.ChampionsSim.logger) || null;
  if (logger) logger.warn('sim', message, fields);
}

function _hpPct(mon) {
  if (!mon || !mon.maxHp) return 0;
  return _clamp01(mon.hp / mon.maxHp);
}

function _snapshotMonKey(side, zone, index, mon) {
  const label = mon && (mon.displayName || mon.name) ? (mon.displayName || mon.name) : 'Unknown';
  return side + ':' + zone + ':' + index + ':' + label;
}

function _snapshotMonStableKey(side, mon) {
  if (mon && mon.stableKey) return mon.stableKey;
  const slot = mon && mon.teamSlot != null ? mon.teamSlot : 'unknown';
  const label = mon && (mon.displayName || mon.name) ? (mon.displayName || mon.name) : 'Unknown';
  return side + ':slot:' + slot + ':' + label;
}

function _sideSnapshot(active, bench, side) {
  const all = (active || []).concat(bench || []);
  return {
    active: (active || []).filter(m => m && m.alive).map(m => m.name),
    bench: (bench || []).filter(m => m && m.alive).map(m => m.name),
    active_keys: (active || []).map((m, i) => (m && m.alive ? _snapshotMonKey(side, 'active', i, m) : null)).filter(Boolean),
    bench_keys: (bench || []).map((m, i) => (m && m.alive ? _snapshotMonKey(side, 'bench', i, m) : null)).filter(Boolean),
    active_stable_keys: (active || []).map(m => (m && m.alive ? _snapshotMonStableKey(side, m) : null)).filter(Boolean),
    bench_stable_keys: (bench || []).map(m => (m && m.alive ? _snapshotMonStableKey(side, m) : null)).filter(Boolean),
    alive_count: all.filter(m => m && m.alive).length,
    hp_total: all.reduce((s, m) => s + (m && m.alive ? _hpPct(m) : 0), 0),
    max_count: Math.max(1, all.length || 1)
  };
}

function _fieldSnapshot(field) {
  return {
    weather: field.weather === 'none' ? null : field.weather,
    weather_turns: field.weatherTurns || 0,
    terrain: field.terrain === 'none' ? null : field.terrain,
    terrain_turns: field.terrainTurns || 0,
    trick_room: field.trickRoom ? (field.trickRoomTurns || 0) : 0
  };
}

function _speedControlSnapshot(field) {
  return {
    player: {
      tailwind_turns: field.playerSide.tailwind ? (field.playerSide.tailwindTurns || 0) : 0,
      screens: {
        reflect: field.playerSide.reflect ? (field.playerSide.reflectTurns || 0) : 0,
        light: field.playerSide.lightScreen ? (field.playerSide.lightScreenTurns || 0) : 0,
        aurora: field.playerSide.auroraVeil ? (field.playerSide.auroraVeilTurns || 0) : 0
      }
    },
    opponent: {
      tailwind_turns: field.oppSide.tailwind ? (field.oppSide.tailwindTurns || 0) : 0,
      screens: {
        reflect: field.oppSide.reflect ? (field.oppSide.reflectTurns || 0) : 0,
        light: field.oppSide.lightScreen ? (field.oppSide.lightScreenTurns || 0) : 0,
        aurora: field.oppSide.auroraVeil ? (field.oppSide.auroraVeilTurns || 0) : 0
      }
    }
  };
}

function _statusSnapshot(playerActive, playerBench, oppActive, oppBench) {
  const out = {};
  const groups = [
    { side: 'player', zone: 'active', mons: playerActive || [] },
    { side: 'player', zone: 'bench', mons: playerBench || [] },
    { side: 'opponent', zone: 'active', mons: oppActive || [] },
    { side: 'opponent', zone: 'bench', mons: oppBench || [] }
  ];
  for (const group of groups) {
    for (let i = 0; i < group.mons.length; i += 1) {
      const m = group.mons[i];
      if (m && m.status) out[_snapshotMonKey(group.side, group.zone, i, m)] = m.status;
    }
  }
  return out;
}

function _statusStableSnapshot(playerActive, playerBench, oppActive, oppBench) {
  const out = {};
  const groups = [
    { side: 'player', mons: playerActive || [] },
    { side: 'player', mons: playerBench || [] },
    { side: 'opponent', mons: oppActive || [] },
    { side: 'opponent', mons: oppBench || [] }
  ];
  for (const group of groups) {
    for (const m of group.mons) {
      if (m && m.status) out[_snapshotMonStableKey(group.side, m)] = m.status;
    }
  }
  return out;
}

function _hpPctSnapshot(playerActive, playerBench, oppActive, oppBench) {
  const out = {};
  const groups = [
    { side: 'player', zone: 'active', mons: playerActive || [] },
    { side: 'player', zone: 'bench', mons: playerBench || [] },
    { side: 'opponent', zone: 'active', mons: oppActive || [] },
    { side: 'opponent', zone: 'bench', mons: oppBench || [] }
  ];
  for (const group of groups) {
    for (let i = 0; i < group.mons.length; i += 1) {
      const m = group.mons[i];
      if (m) out[_snapshotMonKey(group.side, group.zone, i, m)] = Math.round(_hpPct(m) * 1000) / 1000;
    }
  }
  return out;
}

function _hpPctStableSnapshot(playerActive, playerBench, oppActive, oppBench) {
  const out = {};
  const groups = [
    { side: 'player', mons: playerActive || [] },
    { side: 'player', mons: playerBench || [] },
    { side: 'opponent', mons: oppActive || [] },
    { side: 'opponent', mons: oppBench || [] }
  ];
  for (const group of groups) {
    for (const m of group.mons) {
      if (m) out[_snapshotMonStableKey(group.side, m)] = Math.round(_hpPct(m) * 1000) / 1000;
    }
  }
  return out;
}

function _statBoostSnapshot(playerActive, playerBench, oppActive, oppBench, stableKeys) {
  const out = {};
  const groups = stableKeys ? [
    { side: 'player', mons: playerActive || [] },
    { side: 'player', mons: playerBench || [] },
    { side: 'opponent', mons: oppActive || [] },
    { side: 'opponent', mons: oppBench || [] }
  ] : [
    { side: 'player', zone: 'active', mons: playerActive || [] },
    { side: 'player', zone: 'bench', mons: playerBench || [] },
    { side: 'opponent', zone: 'active', mons: oppActive || [] },
    { side: 'opponent', zone: 'bench', mons: oppBench || [] }
  ];
  for (const group of groups) {
    for (let i = 0; i < group.mons.length; i += 1) {
      const m = group.mons[i];
      if (!m || !m.statBoosts) continue;
      const boosts = {
        atk: Number(m.statBoosts.atk || 0),
        def: Number(m.statBoosts.def || 0),
        spa: Number(m.statBoosts.spa || 0),
        spd: Number(m.statBoosts.spd || 0),
        spe: Number(m.statBoosts.spe || 0),
        acc: Number(m.statBoosts.acc || 0),
        eva: Number(m.statBoosts.eva || 0)
      };
      if (!Object.values(boosts).some(v => v !== 0)) continue;
      const key = stableKeys
        ? _snapshotMonStableKey(group.side, m)
        : _snapshotMonKey(group.side, group.zone, i, m);
      out[key] = boosts;
    }
  }
  return out;
}

function _statsLabel(stats) {
  stats = stats || {};
  return ['hp','atk','def','spa','spd','spe'].map(k => Number(stats[k] || 0)).join('/');
}

function _battleRosterSnapshot(active, bench, roster, side) {
  const activeSet = new Set(active || []);
  const benchSet = new Set(bench || []);
  const rows = [];
  for (const mon of (roster || [])) {
    if (!mon) continue;
    const hpPct = Math.round(_hpPct(mon) * 100);
    const status = (!mon.alive || mon.hp <= 0) ? 'fainted' : (activeSet.has(mon) ? 'active' : 'bench');
    const zone = status === 'active' ? 'active' : (status === 'bench' && benchSet.has(mon) ? 'bench' : status);
    const activeIdx = (active || []).indexOf(mon);
    const benchIdx = (bench || []).indexOf(mon);
    const idx = activeIdx >= 0 ? activeIdx : (benchIdx >= 0 ? benchIdx : rows.length);
    rows.push({
      key: _snapshotMonKey(side, zone, idx, mon),
      stableKey: _snapshotMonStableKey(side, mon),
      teamSlot: mon.teamSlot != null ? mon.teamSlot : null,
      zone,
      zoneIndex: idx,
      side,
      status,
      displayName: mon.displayName || mon.name || 'Unknown',
      species: mon.name || mon.displayName || 'Unknown',
      hp: hpPct,
      hpLabel: hpPct + '%',
      level: mon.level || 50,
      item: mon.item || '',
      itemConsumed: !!mon.itemConsumed,
      ability: mon.ability || '',
      moves: Array.isArray(mon.moves) ? mon.moves.slice() : [],
      baseStatsLabel: _statsLabel(mon._base),
      calculatedStats: _statsLabel({
        hp: mon.maxHp,
        atk: mon.baseAtk,
        def: mon.baseDef,
        spa: mon.baseSpa,
        spd: mon.baseSpd,
        spe: mon.baseSpe
      })
    });
  }
  return rows;
}

function _comparePokemonSpeedOrder(a, b, field, rng) {
  const sA = a && a.getEffSpeed ? a.getEffSpeed(field) : 0;
  const sB = b && b.getEffSpeed ? b.getEffSpeed(field) : 0;
  if (sA !== sB) return field && field.trickRoom ? sA - sB : sB - sA;
  if (typeof rng === 'function') return rng() < 0.5 ? -1 : 1;
  return 0;
}

function _compareTurnActionOrder(a, b, field, rng) {
  const pA = a && a.priority ? a.priority : 0;
  const pB = b && b.priority ? b.priority : 0;
  if (pB !== pA) return pB - pA;
  return _comparePokemonSpeedOrder(a && a.attacker, b && b.attacker, field, rng);
}

function _speedOrderSnapshot(playerActive, oppActive, field, useKeys) {
  return (playerActive || []).concat(oppActive || [])
    .filter(m => m && m.alive)
    .sort((a, b) => _comparePokemonSpeedOrder(a, b, field))
    .map(m => {
      if (!useKeys) return m.name;
      const sideName = m && m.side === (field && field.playerSide) ? 'player' : 'opponent';
      const idx = (sideName === 'player' ? (playerActive || []) : (oppActive || [])).indexOf(m);
      return _snapshotMonKey(sideName, 'active', Math.max(0, idx), m);
    });
}

function _speedOrderStableSnapshot(playerActive, oppActive, field) {
  return (playerActive || []).concat(oppActive || [])
    .filter(m => m && m.alive)
    .sort((a, b) => _comparePokemonSpeedOrder(a, b, field))
    .map(m => {
      const sideName = m && m.side === (field && field.playerSide) ? 'player' : 'opponent';
      return _snapshotMonStableKey(sideName, m);
    });
}

function _speedOrderDetailsSnapshot(playerActive, oppActive, field) {
  const active = (playerActive || []).concat(oppActive || []).filter(m => m && m.alive);
  const rows = active.map(m => {
    const sideName = m && m.side === (field && field.playerSide) ? 'player' : 'opponent';
    const sideActive = sideName === 'player' ? (playerActive || []) : (oppActive || []);
    const idx = sideActive.indexOf(m);
    const side = m ? m.side : null;
    const effectiveSpeed = m && m.getEffSpeed ? m.getEffSpeed(field) : 0;
    return {
      side: sideName,
      key: _snapshotMonKey(sideName, 'active', Math.max(0, idx), m),
      stableKey: _snapshotMonStableKey(sideName, m),
      pokemon: m.name,
      stat_format: m.statFormat || '',
      nature: m.nature || '',
      speed_points: Number((m.evs && m.evs.spe) || 0),
      species_base_speed: Number((m._base && m._base.spe) || 0),
      base_speed: Number(m.baseSpe || 0),
      calculated_speed: Number(m.baseSpe || 0),
      speed_stage: Number((m.statBoosts && m.statBoosts.spe) || 0),
      effective_speed: Number(effectiveSpeed || 0),
      item: m.item || '',
      ability: m.ability || '',
      status: m.status || '',
      tailwind: !!(side && side.tailwind),
      trick_room: !!(field && field.trickRoom),
      weather: _effectiveFieldWeather(field)
    };
  });
  const speedCounts = {};
  for (const row of rows) speedCounts[row.effective_speed] = (speedCounts[row.effective_speed] || 0) + 1;
  rows.sort((a, b) => {
    if (a.effective_speed !== b.effective_speed) {
      return field && field.trickRoom
        ? a.effective_speed - b.effective_speed
        : b.effective_speed - a.effective_speed;
    }
    return 0;
  });
  return rows.map(row => Object.assign({}, row, {
    exact_speed_tie: speedCounts[row.effective_speed] > 1
  }));
}

function _legalOptionsSnapshot(active, enemies) {
  const liveTargets = (enemies || []).filter(e => e && e.alive);
  const targetName = liveTargets[0] ? liveTargets[0].name : 'none';
  const out = {};
  for (const mon of (active || []).filter(m => m && m.alive)) {
    out[mon.name] = (mon.moves || []).map(move => move + (liveTargets.length ? ' -> ' + targetName : ''));
  }
  return out;
}

function _buildPositionState(playerActive, playerBench, oppActive, oppBench, field) {
  const player = _sideSnapshot(playerActive, playerBench, 'player');
  const opponent = _sideSnapshot(oppActive, oppBench, 'opponent');
  return {
    player,
    opponent,
    field: _fieldSnapshot(field),
    speed_control: _speedControlSnapshot(field),
    speed_order: _speedOrderSnapshot(playerActive, oppActive, field, false),
    speed_order_keys: _speedOrderSnapshot(playerActive, oppActive, field, true),
    speed_order_stable_keys: _speedOrderStableSnapshot(playerActive, oppActive, field),
    speed_order_details: _speedOrderDetailsSnapshot(playerActive, oppActive, field),
    status: _statusSnapshot(playerActive, playerBench, oppActive, oppBench)
  };
}

function positionScore(state) {
  state = state || {};
  if (state.score_state && state.score_state.player && state.score_state.opponent) {
    state = Object.assign({}, state, {
      player: state.score_state.player,
      opponent: state.score_state.opponent
    });
  }
  if ((!state.player || !state.opponent) && state.active && state.bench) {
    const hpPct = state.hp_pct || {};
    const roster = state.roster || {};
    function sideFromFlat(side) {
      const activeKeys = (state.active_keys && state.active_keys[side]) || [];
      const benchKeys = (state.bench_keys && state.bench_keys[side]) || [];
      const keys = activeKeys.concat(benchKeys);
      return {
        active: (state.active && state.active[side]) || [],
        bench: (state.bench && state.bench[side]) || [],
        active_keys: activeKeys,
        bench_keys: benchKeys,
        alive_count: keys.filter(k => Number(hpPct[k] || 0) > 0).length,
        hp_total: keys.reduce((s, k) => s + Number(hpPct[k] || 0), 0),
        max_count: Math.max(1, keys.length || ((roster[side] || []).length))
      };
    }
    state = Object.assign({}, state, {
      player: sideFromFlat('player'),
      opponent: sideFromFlat('opponent')
    });
  }
  const player = state.player || {};
  const opponent = state.opponent || {};
  const maxCount = Math.max(player.max_count || 1, opponent.max_count || 1, 1);
  const pHp = Number(player.hp_total != null ? player.hp_total : player.total_hp_pct || 0);
  const oHp = Number(opponent.hp_total != null ? opponent.hp_total : opponent.total_hp_pct || 0);
  const hpDiffNorm = ((pHp - oHp) / Math.max(1, maxCount)) / 2 + 0.5;
  const pAlive = Number(player.alive_count != null ? player.alive_count : player.survivors || 0);
  const oAlive = Number(opponent.alive_count != null ? opponent.alive_count : opponent.survivors || 0);
  const survivorsDiffNorm = ((pAlive - oAlive) / Math.max(1, maxCount)) + 0.5;
  const sc = state.speed_control || {};
  const pSc = sc.player || {};
  const oSc = sc.opponent || sc.opp || {};
  const field = state.field || {};
  let speedEdge = ((pSc.tailwind_turns || 0) - (oSc.tailwind_turns || 0)) / 4;
  const pKeys = new Set((player.active_keys || []).concat(player.bench_keys || [], player.active || [], player.bench || []));
  const oKeys = new Set((opponent.active_keys || []).concat(opponent.bench_keys || [], opponent.active || [], opponent.bench || []));
  const speedOrder = Array.isArray(state.speed_order_keys) && state.speed_order_keys.length
    ? state.speed_order_keys
    : (Array.isArray(state.speed_order) ? state.speed_order : []);
  if (speedOrder.length) {
    let orderEdge = 0;
    let totalWeight = 0;
    for (let i = 0; i < speedOrder.length; i += 1) {
      const weight = speedOrder.length - i;
      totalWeight += weight;
      if (pKeys.has(speedOrder[i])) orderEdge += weight;
      else if (oKeys.has(speedOrder[i])) orderEdge -= weight;
    }
    if (totalWeight > 0) speedEdge += (orderEdge / totalWeight) * 0.25;
  }
  speedEdge = Math.max(-0.5, Math.min(0.5, speedEdge));
  function screenCount(side) {
    const s = (side && side.screens) || {};
    return (s.reflect ? 1 : 0) + (s.light ? 1 : 0) + (s.aurora ? 1 : 0);
  }
  const screensEdge = Math.max(-0.5, Math.min(0.5, (screenCount(pSc) - screenCount(oSc)) * 0.1));
  let statusEdge = 0;
  const status = state.status || {};
  Object.keys(status).forEach(key => {
    const bad = status[key] ? 0.05 : 0;
    if (pKeys.has(key)) statusEdge -= bad;
    if (oKeys.has(key)) statusEdge += bad;
  });
  const score = 0.5
    + 0.30 * (hpDiffNorm - 0.5)
    + 0.20 * (survivorsDiffNorm - 0.5)
    + 0.15 * speedEdge
    + 0.05 * screensEdge
    + 0.10 * Math.max(-0.5, Math.min(0.5, statusEdge));
  return Math.round(_clamp01(score) * 1000) / 1000;
}

function _makeTurnSnapshot(playerActive, playerBench, oppActive, oppBench, field, includeLegal, playerRoster, oppRoster) {
  const state = _buildPositionState(playerActive, playerBench, oppActive, oppBench, field);
  return {
    active: { player: state.player.active, opponent: state.opponent.active },
    bench: { player: state.player.bench, opponent: state.opponent.bench },
    active_keys: { player: state.player.active_keys, opponent: state.opponent.active_keys },
    bench_keys: { player: state.player.bench_keys, opponent: state.opponent.bench_keys },
    active_stable_keys: { player: state.player.active_stable_keys, opponent: state.opponent.active_stable_keys },
    bench_stable_keys: { player: state.player.bench_stable_keys, opponent: state.opponent.bench_stable_keys },
    hp_pct: _hpPctSnapshot(playerActive, playerBench, oppActive, oppBench),
    hp_pct_stable: _hpPctStableSnapshot(playerActive, playerBench, oppActive, oppBench),
    score_state: {
      player: Object.assign({}, state.player),
      opponent: Object.assign({}, state.opponent)
    },
    roster: {
      player: _battleRosterSnapshot(playerActive, playerBench, playerRoster || playerActive.concat(playerBench), 'player'),
      opponent: _battleRosterSnapshot(oppActive, oppBench, oppRoster || oppActive.concat(oppBench), 'opponent')
    },
    status: state.status,
    status_stable: _statusStableSnapshot(playerActive, playerBench, oppActive, oppBench),
    stat_boosts: _statBoostSnapshot(playerActive, playerBench, oppActive, oppBench, false),
    stat_boosts_stable: _statBoostSnapshot(playerActive, playerBench, oppActive, oppBench, true),
    field: state.field,
    speed_control: state.speed_control,
    speed_order: state.speed_order,
    speed_order_keys: state.speed_order_keys,
    speed_order_stable_keys: state.speed_order_stable_keys,
    speed_order_details: state.speed_order_details,
    legal_options: includeLegal ? _legalOptionsSnapshot(playerActive, oppActive) : {},
    position_score: positionScore(state),
    win_probability: null
  };
}

function _actionSummary(actions) {
  const out = { player: [], opponent: [] };
  for (const action of actions || []) {
    const side = action.side === 'opp' ? 'opponent' : 'player';
    const targetSide = _actionTargetSide(action, side);
    out[side].push({
      actor: action.attacker ? action.attacker.name : null,
      actor_key: action.attacker ? _snapshotMonStableKey(side, action.attacker) : null,
      kind: 'move',
      move: action.move || null,
      target: action.target ? action.target.name : null,
      target_key: action.target ? (targetSide ? _snapshotMonStableKey(targetSide, action.target) : (action.target.stableKey || null)) : null,
      target_side: targetSide
    });
  }
  return out;
}

function _actionTargetSide(action, actorSide) {
  if (!action || !action.target) return null;
  if (action.attacker && action.attacker.side && action.target.side) {
    if (action.target.side === action.attacker.side) return actorSide;
    return actorSide === 'player' ? 'opponent' : 'player';
  }
  return null;
}

function _eventsFromLog(lines) {
  return (lines || []).map(line => {
    const text = String(line || '');
    if (text.includes('fainted')) return { type: 'ko', text };
    if (text.includes('dmg')) return { type: 'damage', text };
    if (text.includes('Tailwind') || text.includes('Trick Room') || text.includes('weather') || text.includes('terrain')) return { type: 'field', text };
    if (text.includes('burn') || text.includes('poison') || text.includes('sleep') || text.includes('paralys')) return { type: 'status', text };
    return { type: 'log', text };
  });
}

function winProbabilityDelta(turnLog) {
  const rows = Array.isArray(turnLog) ? turnLog : [];
  const deltas = [];
  let maxAbs = -1;
  let swingIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1] && rows[i - 1].post ? rows[i - 1].post.position_score : null;
    const curr = rows[i] && rows[i].post ? rows[i].post.position_score : null;
    const delta = (typeof prev === 'number' && typeof curr === 'number') ? Math.round((curr - prev) * 1000) / 1000 : 0;
    deltas.push({ turn: rows[i].turn, delta });
    if (Math.abs(delta) > maxAbs) {
      maxAbs = Math.abs(delta);
      swingIdx = i;
    }
  }
  rows.forEach(r => { if (r) delete r.swingTurn; });
  if (swingIdx >= 0 && rows[swingIdx]) {
    rows[swingIdx].swingTurn = true;
    deltas[swingIdx - 1].swingTurn = true;
  }
  return deltas;
}

function isRNGBlame(turnLog, turn) {
  const rows = Array.isArray(turnLog) ? turnLog : [];
  const targetTurn = Number(turn) || (rows.find(r => r && r.swingTurn) || {}).turn || 0;
  let hits = 0;
  rows.forEach(row => {
    if (!row || Math.abs((row.turn || 0) - targetTurn) > 1) return;
    (row.events || []).forEach(ev => {
      const text = String((ev && (ev.text || ev.type)) || '');
      if (/critical hit|missed|flinched|fully paralysed|frozen solid|woke up early/i.test(text)) hits++;
    });
  });
  return hits >= 2;
}

// ============================================================
// SIMULATE BATTLE
// ============================================================
function simulateBattle(playerTeam, oppTeam, opts = {}) {
  const seed = opts.seed || makeSeed();
  const rng  = makePRNG(seed);
  const log  = [];
  const field = new Field();
  // T9j.3 (#39) — stamp format on field so calcDamage can pick singles vs doubles screen fraction.
  field._format = (opts.format === 'singles') ? 'singles' : 'doubles';
  const DECISION_TIME_MS = 15 * 1000;  // deterministic 15s/turn proxy for timer-draw

  // #5 — Legality validation (non-blocking by default).
  // validateTeam detects stat-point caps (SP or EV), move count, Species/Item
  // Clause, Champions ban list. Errors are logged to battle log and attached
  // to the result so UI / PDF report can surface them. Pass opts.strict=true
  // to abort before rolling seeds (for CI / golden tests).
  const fmt = opts.format === 'singles' ? 'singles' : 'vgc';
  const playerLegality = validateTeam(playerTeam, fmt);
  const oppLegality    = validateTeam(oppTeam, fmt);
  if (!playerLegality.valid) {
    log.push(`[LEGALITY] Player team errors: ${playerLegality.errors.join('; ')}`);
  }
  for (const w of playerLegality.warnings) log.push(`[LEGALITY] Player warning: ${w}`);
  if (!oppLegality.valid) {
    log.push(`[LEGALITY] Opponent team errors: ${oppLegality.errors.join('; ')}`);
  }
  for (const w of oppLegality.warnings) log.push(`[LEGALITY] Opponent warning: ${w}`);
  if (opts.strict && (!playerLegality.valid || !oppLegality.valid)) {
    return {
      result: 'error', turns: 0, trTurns: 0,
      twTurns: 0, twTurnsPlayer: 0, twTurnsOpp: 0,
      timerExpired: false, clockPlayer: 0, clockOpp: 0, pHpSum: 0, oHpSum: 0,
      screens: { playerReflect:0, playerLightScreen:0, playerAuroraVeil:0, oppReflect:0, oppLightScreen:0, oppAuroraVeil:0 },
      log,
      winCondition: 'Illegal team — simulation aborted (strict mode)',
      seed, playerSurvivors: 0, oppSurvivors: 0,
      legality: { player: playerLegality, opp: oppLegality },
    };
  }

  const playerPokemon = buildTeam(playerTeam, 'player');
  const oppPokemon    = buildTeam(oppTeam, 'opponent');

  // T9j.10 (Refs #16) — Team Preview / bring-N-of-6.
  //   Doubles: bring 4 of 6 (leads 1-2, bench 3-4)
  //   Singles: bring 3 of 6 (lead 1, bench 2-3)
  // Caller passes opts.playerBring / opts.opponentBring — arrays of Pokemon
  // names in picked order. Names not in bring list are EXCLUDED from battle.
  // Legacy opts.playerLeads / opts.opponentLeads still supported: leads occupy
  // indices 0-1 and the rest of the team fills remaining slots in original order.
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/VGC
  const _bringCount = (field._format === 'singles') ? 3 : 4;
  const _leadSlots = (field._format === 'singles') ? 1 : 2;
  function _battleLeadScore(mon) {
    const roles = Array.isArray(mon.roles) ? mon.roles : [];
    const moves = Array.isArray(mon.moves) ? mon.moves : [];
    let score = 0;
    if (roles.indexOf('Speed Control') >= 0) score += 120;
    if (roles.indexOf('Support') >= 0) score += 95;
    if (roles.indexOf('Pivot') >= 0) score += 55;
    if (roles.indexOf('Sweeper') >= 0) score += 20;
    if (roles.indexOf('Tank') >= 0) score -= 5;
    if (roles.indexOf('Wall') >= 0) score -= 15;
    if (moves.indexOf('Tailwind') >= 0 || moves.indexOf('Trick Room') >= 0) score += 35;
    if (moves.indexOf('Fake Out') >= 0 || moves.indexOf('Follow Me') >= 0 || moves.indexOf('Rage Powder') >= 0) score += 25;
    if (moves.indexOf('Parting Shot') >= 0 || moves.indexOf('U-turn') >= 0 || moves.indexOf('Volt Switch') >= 0 || moves.indexOf('Flip Turn') >= 0) score += 20;
    const stats = (typeof classifyPokemon === 'function' ? classifyPokemon(mon).stats : null) || {};
    score += Math.min(Math.round((stats.spe || 0) / 5), 20);
    return score;
  }
  function _sortByLeadScore(arr) {
    return arr.slice().sort(function(a, b) {
      const sA = _battleLeadScore(a);
      const sB = _battleLeadScore(b);
      if (sA !== sB) return sB - sA;
      const spA = (classifyPokemon(a).stats || {}).spe || 0;
      const spB = (classifyPokemon(b).stats || {}).spe || 0;
      if (spA !== spB) return spB - spA;
      return a.name.localeCompare(b.name);
    });
  }
  function _applyBring(pokemonArr, bringNames, leadNames) {
    // Prefer explicit bring list. Falls back to lead list (legacy T9j.10 early rev).
    const useBring = Array.isArray(bringNames) && bringNames.length > 0;
    const names = useBring ? bringNames : (Array.isArray(leadNames) ? leadNames : []);
    if (names.length === 0) return pokemonArr.slice();

    const picked = [];
    const rest = pokemonArr.slice();
    for (const name of names) {
      if (picked.length >= _bringCount) break;
      const idx = rest.findIndex(p => p.name === name);
      if (idx >= 0) picked.push(rest.splice(idx, 1)[0]);
    }
    // When explicit bring list is given, unbrought mons DO NOT enter battle.
    // When only leads given (legacy), keep the rest as bench so teams still have switches.
    if (useBring) {
      // Pad with original-order filler only if picks are short (invalid names etc).
      while (picked.length < _bringCount && rest.length) picked.push(rest.shift());
      return picked;
    }

    return picked.concat(rest);
  }
  function _chooseOpeningSlots(pokemonArr, explicitLeadNames, explicitBringNames, roleAwareOpeners) {
    const hasExplicitBring = Array.isArray(explicitBringNames) && explicitBringNames.length > 0;
    const hasExplicitLeads = Array.isArray(explicitLeadNames) && explicitLeadNames.length > 0;
    if (hasExplicitBring || hasExplicitLeads) {
      return pokemonArr.slice(0, _leadSlots);
    }
    if (roleAwareOpeners) return _sortByLeadScore(pokemonArr).slice(0, _leadSlots);
    return pokemonArr.slice(0, _leadSlots);
  }
  const _orderedPlayer = _applyBring(playerPokemon, opts.playerBring,   opts.playerLeads);
  const _orderedOpp    = _applyBring(oppPokemon,    opts.opponentBring, opts.opponentLeads);
  const _roleAwareOpeners = !!opts.roleAwareOpeners;
  const _playerOpening = _chooseOpeningSlots(_orderedPlayer, opts.playerLeads, opts.playerBring, _roleAwareOpeners);
  const _oppOpening    = _chooseOpeningSlots(_orderedOpp,    opts.opponentLeads, opts.opponentBring, _roleAwareOpeners);

  // T9j.7 — apply Mega trigger policy override from sweep driver.
  // When runMegaTriggerSweep() calls simulateBattle with _megaPolicyOverride,
  // we stamp every Mega-capable mon on the target side with the requested
  // policy and trigger turn. Only affects mons with megaForm set.
  if (opts._megaPolicyOverride) {
    const ov = opts._megaPolicyOverride;
    const targets = (ov.side === 'opp') ? oppPokemon : playerPokemon;
    for (const m of targets) {
      if (!m.megaForm) continue;
      m.megaPolicy      = ov.policy || m.megaPolicy;
      m.megaTriggerTurn = (typeof ov.triggerTurn === 'number') ? ov.triggerTurn : m.megaTriggerTurn;
    }
  }

  // Active battlers (doubles: 2 per side)
  let playerActive = _playerOpening.slice(0, _leadSlots).filter(Boolean);
  let oppActive    = _oppOpening.slice(0, _leadSlots).filter(Boolean);
  let playerBench  = _orderedPlayer.filter(function(p) { return playerActive.indexOf(p) < 0; });
  let oppBench     = _orderedOpp.filter(function(p) { return oppActive.indexOf(p) < 0; });
  const _initialPlayerActive = playerActive.slice();
  const _initialOppActive = oppActive.slice();

  // T9j.1 (Issue #25) — wire every Pokemon to its side object so that
  // screens, Tailwind speed, and Last Respects fainted count all work.
  for (const m of playerPokemon) m.side = field.playerSide;
  for (const m of oppPokemon)    m.side = field.oppSide;
  // Expose fainted count on side objects so calcDamage's Last Respects
  // lookup (attacker.side.fainted) reads real state.
  field.playerSide.fainted = 0;
  field.oppSide.fainted    = 0;
  field.playerSide.activeMons = playerActive;
  field.oppSide.activeMons = oppActive;

  // Track fainted counts per side for Last Respects
  const sideFainted = { player: 0, opp: 0 };

  // Apply on-entry abilities
  function applyEntryAbility(mon, side, field, log) {
    if (mon.ability === 'Trace') {
      const targets = side === 'player' ? oppActive : playerActive;
      const traced = targets.find(function(t) {
        return t && t.alive && t.ability && t.ability !== 'Trace';
      });
      if (traced) {
        mon.ability = traced.ability;
        mon.flying = mon.types.includes('Flying') || mon.ability === 'Levitate';
        log.push(`${mon.name} traced ${traced.name}'s ${traced.ability}!`);
      }
    }
    if (mon.ability === 'Intimidate') {
      const targets = side === 'player' ? oppActive : playerActive;
      log.push(`${mon.name}'s Intimidate activated!`);
      for (const t of targets) {
        if (!t.alive) continue;
        if (t.ability === 'Inner Focus' || t.ability === 'Own Tempo' || t.ability === 'Oblivious' || t.ability === 'Scrappy') {
          log.push(`${t.name} ignored Intimidate!`);
          continue;
        }
        if (_applyTargetStageMap(mon, t, { atk: -1 }, log)) {
          log.push(`${mon.name}'s Intimidate lowered ${t.name}'s Attack!`);
        }
      }
    }
    applyWeatherAbility(mon, field, log);
    applyTerrainAbility(mon, field, log);
    if (mon.ability === 'Hospitality' && side === 'player') {
      const ally = playerActive.find(a => a !== mon && a.alive);
      if (ally) { ally.hp = Math.min(ally.maxHp, ally.hp + Math.floor(ally.maxHp * 0.25)); log.push(`${mon.name}'s Hospitality restored ${ally.name}'s HP!`); }
    }
    // T9j.17 (Refs #44) -- Terrain Seed switch-in trigger.
    // Grassy/Electric/Misty/Psychic Seed give +1 Def or +1 SpD when the
    // matching terrain is already active as the holder switches in. Item is
    // consumed in the process. Helper handles ungrounded skip + match logic.
    if (typeof tryTerrainSeed === 'function') tryTerrainSeed(mon, field, log);
  }

  function _chooseBenchReplacement(bench) {
    return bench.filter(b => b.alive).sort(function(a, b) {
      const sA = _battleLeadScore(a);
      const sB = _battleLeadScore(b);
      if (sA !== sB) return sB - sA;
      const hpA = a.hp / Math.max(1, a.maxHp);
      const hpB = b.hp / Math.max(1, b.maxHp);
      if (hpA !== hpB) return hpB - hpA;
      return a.name.localeCompare(b.name);
    })[0] || null;
  }

  function _clearImprisonEffectsForMon(mon, field) {
    if (!mon || !field) return;
    [field.playerSide, field.oppSide].forEach(function(sideRef) {
      if (sideRef && sideRef.imprisonedBy === mon.name) {
        sideRef.imprisonedBy = null;
        sideRef.imprisonedMoves = null;
      }
    });
  }

  function _resetSwitchInState(replacement) {
    if (!replacement) return;
    if (replacement.stanceChangeForms) replacement.setStanceForm('shield');
    replacement.toxicCounter = 0;
    replacement.frozenTurns  = 0;
    replacement.sleepTurns   = 0;
    replacement._fakeDone    = false;
    replacement.tauntedTurns = 0;
    replacement.encoredTurns = 0;
    replacement.encoredMove  = null;
    replacement.protectChain = 0;
    replacement.protectKind  = null;
    replacement.enduring     = false;
    replacement.proteanUsed  = false;
    replacement.substituteHp = 0;
    replacement.leechSeededBy = null;
    replacement.perishSongTurns = 0;
    replacement.healBlockedTurns = 0;
    replacement.throatChopTurns = 0;
    replacement.confusionTurns = 0;
    replacement.trappedByMove = null;
    replacement.trappedByMon = null;
    replacement._statsRaisedThisTurn = false;
    replacement.lastMoveFailed = false;
    replacement.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    replacement.choiceLock = null;
    replacement.turnsSinceEntry = 0;
  }

  function _applyIncomingSwitchState(replacement, incomingState) {
    if (!replacement || !incomingState) return;
    if (incomingState.statBoosts) {
      replacement.statBoosts = Object.assign(
        { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 },
        incomingState.statBoosts
      );
    }
    if (Number.isFinite(incomingState.substituteHp) && incomingState.substituteHp > 0) {
      replacement.substituteHp = incomingState.substituteHp;
    }
  }

  function _switchOutActiveMon(mon, side, field, log, opts) {
    const activeArr = side === 'player' ? playerActive : oppActive;
    const bench = side === 'player' ? playerBench : oppBench;
    const idx = activeArr.indexOf(mon);
    if (idx < 0) return false;
    if (_isTrappedByShadowTag(mon, field)) {
      if (log) log.push(`${mon.name} is trapped by Shadow Tag!`);
      return false;
    }
    if (_isTrappedByMove(mon)) {
      if (log) log.push(`${mon.name} is trapped by ${mon.trappedByMove}!`);
      return false;
    }
    const replacement = _chooseBenchReplacement(bench);
    if (!replacement) return false;
    bench.splice(bench.indexOf(replacement), 1);
    if (bench.indexOf(mon) < 0) bench.push(mon);
    _clearImprisonEffectsForMon(mon, field);
    mon.chargingMove = null;
    mon.chargingTarget = null;
    mon.chargingTargetSide = null;
    mon.chargingTargetSlot = null;
    mon.concealedByMove = null;
    mon.substituteHp = 0;
    mon.leechSeededBy = null;
    mon.perishSongTurns = 0;
    mon.trappedByMove = null;
    mon.trappedByMon = null;
    _resetSwitchInState(replacement);
    _applyIncomingSwitchState(replacement, opts && opts.incomingState);
    if (opts && opts.incomingSubstituteHp > 0) replacement.substituteHp = opts.incomingSubstituteHp;
    activeArr[idx] = replacement;
    if (!opts || !opts.silentPivotLog) log.push(`${mon.name} pivoted out!`);
    log.push(`${replacement.name} was sent out!`);
    applyEntryAbility(replacement, side, field, log);
    return true;
  }

  for (const m of playerActive) applyEntryAbility(m, 'player', field, log);
  for (const m of oppActive)    applyEntryAbility(m, 'opp', field, log);

  // ============================================================
  // GREEDY MOVE SELECTION
  // Scores moves by expected damage or utility value.
  // ============================================================
  function selectMove(attacker, allies, enemies, field) {
    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);
    if (attacker.chargingMove) {
      const _storedTarget = attacker.chargingTarget || null;
      const _storedTargetIsLiveBattler = !!(_storedTarget && _storedTarget.alive &&
        (enemies.includes(_storedTarget) || allies.includes(_storedTarget)));
      let lockedTarget = _storedTargetIsLiveBattler ? _storedTarget : null;
      if (!lockedTarget && Number.isFinite(attacker.chargingTargetSlot)) {
        const lockedSide = attacker.chargingTargetSide === 'ally' ? allies : enemies;
        const slotTarget = lockedSide[attacker.chargingTargetSlot] || null;
        if (slotTarget && slotTarget.alive && slotTarget !== attacker) lockedTarget = slotTarget;
      }
      if (!lockedTarget && _storedTarget && _storedTarget.alive) lockedTarget = _storedTarget;
      if (!lockedTarget) lockedTarget = liveEnemies[0] || liveAllies[0] || null;
      return { move: attacker.chargingMove, target: lockedTarget };
    }
    // T9j.6 (#18) — Choice Scarf lock enforcement. If holder already used a move
    // and still has it legal, must use same move. Cite: Bulbapedia Choice Scarf.
    if (attacker.item === 'Choice Scarf' && attacker.choiceLock &&
        attacker.moves.includes(attacker.choiceLock)) {
      const target = liveEnemies[0] || allies.find(a => a !== attacker && a.alive) || null;
      return { move: attacker.choiceLock, target };
    }
    const STATUS_MOVES = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder','Toxic','Poison Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail','Quick Guard',
      'Protect','Detect',
      // T9j.3 Screens setters
      'Light Screen','Reflect','Aurora Veil',
      // Move-control / field-reset support
      'Encore','Haze','Defog',
      // Recovery / board-state support
      'Recover','Shore Up','Rest','Sleep Talk','Substitute','Imprison','Ally Switch']);
    const TURN1_ROLE_UTILITY = new Set([
      'Tailwind','Trick Room','Fake Out','Follow Me','Rage Powder',
      'Light Screen','Reflect','Aurora Veil','Will-O-Wisp','Thunder Wave',
      'Encore','Taunt','Quick Guard','Protect','Detect','Parting Shot',
      'Haze','Defog','Recover','Shore Up','Rest','Substitute','Ally Switch'
    ]);
    const roles = Array.isArray(attacker.roles) ? attacker.roles : [];
    const turnsSinceEntry = attacker.turnsSinceEntry || 0;
    const freshEntry = turnsSinceEntry <= 1;
    const isSupportRole = roles.indexOf('Support') >= 0 || roles.indexOf('Speed Control') >= 0;
    const isPivotRole = roles.indexOf('Pivot') >= 0;

    let best = { move: null, target: null, score: -Infinity };

    const attackerOnPlayerSide = !!(field && attacker && attacker.side === field.playerSide);
    const enemySide = field && attackerOnPlayerSide ? field.oppSide : field.playerSide;

    if (attacker.status === 'sleep' && attacker.moves.includes('Sleep Talk')) {
      const target = liveEnemies[0] || liveAllies[0] || null;
      return { move: 'Sleep Talk', target };
    }

    for (const move of attacker.moves) {
      const moveType = _moveType(move);

      if (attacker.encoredTurns > 0 && attacker.encoredMove) {
        const target = attacker.lastTarget && attacker.lastTarget.alive
          ? attacker.lastTarget
          : liveEnemies[0] || liveAllies[0] || null;
        return { move: attacker.encoredMove, target };
      }

      // Status/utility scoring
      if (STATUS_MOVES.has(move) || _moveCategory(move) === 'status') {
        if (attacker.tauntedTurns > 0) continue;
        if (enemySide && enemySide.imprisonedMoves && enemySide.imprisonedMoves.has(move)) continue;
        let score = 0;
        if (freshEntry && isSupportRole && TURN1_ROLE_UTILITY.has(move)) score += 35;
        if (freshEntry && isPivotRole && (move === 'Parting Shot' || move === 'U-turn' || move === 'Volt Switch' || move === 'Flip Turn' || move === 'Teleport' || move === 'Baton Pass')) score += 28;
        if (freshEntry && roles.indexOf('Sweeper') >= 0 && (move === 'Protect' || move === 'Detect')) score += 10;
        if (attacker.hp < attacker.maxHp * 0.3 && (move === 'Protect' || move === 'Detect' || move === 'Ally Switch' || move === 'Parting Shot' || move === 'U-turn' || move === 'Volt Switch' || move === 'Flip Turn')) score += 25;
        if (move === 'Trick Room' && !field.trickRoom) score = 55;
        if (move === 'Tailwind'   && !(attackerOnPlayerSide ? field.playerSide : field.oppSide)?.tailwind) score = 50;
        // T9j.3 Screens scoring — value them when not already up.
        const _selfSide = attackerOnPlayerSide ? field.playerSide : field.oppSide;
        if (move === 'Light Screen' && _selfSide && !_selfSide.lightScreen) score = 42;
        if (move === 'Reflect'      && _selfSide && !_selfSide.reflect)     score = 42;
        const effectiveWeather = _effectiveFieldWeather(field);
        if (move === 'Aurora Veil' && _selfSide && !_selfSide.auroraVeil
            && (effectiveWeather === 'hail' || effectiveWeather === 'snow')) score = 52;
        if (move === 'Will-O-Wisp' && liveEnemies.length) {
          const target = liveEnemies.find(e => !e.status) || liveEnemies[0];
          if (target && !target.status && target.types.every(t => t !== 'Fire')) {
            if (best.score < 45) { best = { move, target, score: 45 }; }
          }
          continue;
        }
        if (move === 'Life Dew' && liveAllies.some(a => a.hp < a.maxHp * 0.6)) score = 40;
        if (move === 'Pollen Puff' && liveAllies.some(a => a !== attacker && a.alive && a.hp < a.maxHp)) {
          const target = liveAllies.find(a => a !== attacker && a.alive && a.hp < a.maxHp) || liveAllies[0] || null;
          if (target) {
            if (best.score < 43) { best = { move, target, score: 43 }; }
          }
          continue;
        }
        if (move === 'Rage Powder' && liveAllies.some(a => !a.alive)) score = 35;
        if (move === 'Quick Guard') {
          const hasPriorityThreat = liveEnemies.some(e => Array.isArray(e.moves) && e.moves.some(m => getPriority(m) > 0));
          if (hasPriorityThreat) score = 48;
        }
        if ((move === "King's Shield" || move === 'Spiky Shield' || move === 'Baneful Bunker' || move === 'Obstruct')) {
          const hasContactThreat = liveEnemies.some(e => Array.isArray(e.moves) && e.moves.some(m => _isContactMove(m)));
          if (hasContactThreat) score = 43;
        }
        if (move === 'Endure' && attacker.hp < attacker.maxHp * 0.35) score = 41;
        if (move === 'Taunt' && liveEnemies.some(e => Array.isArray(e.moves) && e.moves.some(m => _moveCategory(m) === 'status'))) {
          score = 34;
        }
        if (move === 'Encore' && liveEnemies.some(e => e.lastMoveUsed)) {
          score = 46;
        }
        if (move === 'Haze' && liveEnemies.some(e => e.statBoosts && Object.values(e.statBoosts).some(v => v !== 0))) {
          score = 44;
        }
        if (move === 'Defog' && (field.terrain !== 'none' || liveEnemies.some(e => e.side && (e.side.reflect || e.side.lightScreen || e.side.auroraVeil)))) {
          score = 44;
        }
        if ((move === 'Recover' || move === 'Shore Up') && attacker.hp < attacker.maxHp * 0.65) score = 46;
        if (move === 'Rest' && attacker.hp < attacker.maxHp * 0.55) score = 47;
        if (move === 'Substitute' && attacker.hp > attacker.maxHp * 0.35 && attacker.substituteHp <= 0) score = 38;
        if (move === 'Imprison' && liveEnemies.some(e => Array.isArray(e.moves) && e.moves.some(m => attacker.moves.includes(m)))) score = 45;
        if (move === 'Ally Switch' && liveAllies.length > 0) score = 32;
        if (move === 'Roost' && attacker.hp < attacker.maxHp * 0.5) score = 45;
        if (freshEntry && isSupportRole && TURN1_ROLE_UTILITY.has(move)) score = Math.max(score, 70);
        if (freshEntry && isPivotRole && (move === 'Parting Shot' || move === 'U-turn' || move === 'Volt Switch' || move === 'Flip Turn' || move === 'Teleport' || move === 'Baton Pass')) score = Math.max(score, 62);
        if (attacker.hp < attacker.maxHp * 0.3 && (move === 'Protect' || move === 'Detect' || move === 'Ally Switch' || move === 'Parting Shot' || move === 'U-turn' || move === 'Volt Switch' || move === 'Flip Turn')) score = Math.max(score, 66);
        if (score > best.score) best = { move, target: liveEnemies[0] || null, score };
        continue;
      }

      // Priority move logic
      if (getPriority(move, attacker) > 0) {
        // T9j.17 (Refs #101) -- Fake Out hard-gate: skip selection entirely past
        // first turn out. Previously it fell through to the damage-scoring loop
        // below, which let the AI "select" Fake Out turn 2+ as a 40-BP attack.
        // Champions rule: Fake Out is only legal on the user's first turn out.
        // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move)
        if (move === 'Fake Out') {
          if (attacker._fakeDone || (attacker.turnsSinceEntry || 0) > 1) continue; // illegal selection -- skip entirely
          const target = liveEnemies[0];
          if (target) {
            const dmg = attacker.calcDamage(move, target, field, null, rng);
            let score = dmg / target.maxHp * 100 + 25;
            // Turn-1 support leads should strongly prefer legal Fake Out pressure
            // over passive lines like Protect so guard/counterplay tests reflect
            // actual opener behavior instead of AI scoring noise.
            if (freshEntry) score = Math.max(score, 74);
            if (score > best.score) best = { move, target, score };
          }
          continue;
        }
      }

      // Damage scoring — pick highest damage target
      if (move === 'Pollen Puff' && liveAllies.some(a => a !== attacker && a.alive && a.hp < a.maxHp)) {
        const target = liveAllies.find(a => a !== attacker && a.alive && a.hp < a.maxHp) || liveAllies[0] || null;
        if (target) {
          const score = 43;
          if (score > best.score) best = { move, target, score };
        }
        continue;
      }
      for (const target of liveEnemies) {
        const dmg = attacker.calcDamage(move, target, field, null, rng);
        // Score: damage fraction + KO bonus + priority bonus
        let score = dmg / target.maxHp * 100;
        if (dmg >= target.hp) score += 50; // KO bonus
        if (getPriority(move, attacker) > 0) score += 10;
        if (score > best.score) best = { move, target, score };
      }
    }

    // Fallback
    if (!best.move) {
      if (attacker.tauntedTurns > 0) {
        best.move = 'Struggle';
        best.target = liveEnemies[0] || allies.find(a => a !== attacker && a.alive) || null;
        return best;
      }
      best.move   = attacker.moves[0] || 'Tackle';
      best.target = liveEnemies[0] || allies[0];
    }
    return best;
  }

  // ============================================================
  // EXECUTE ACTION
  // ============================================================
  function executeAction(attacker, move, target, allies, enemies, field, log, rng, opts) {
    const fromSleepTalk = !!(opts && opts.fromSleepTalk);
    if (!attacker.alive) return;
    if (!move) return;
    attacker.lastMoveUsed = move;
    attacker.lastTarget = target || null;
    attacker._previousMoveFailedForDamage = !!attacker.lastMoveFailed;
    attacker.lastMoveFailed = false;

    if (attacker.throatChopTurns > 0 && _isSoundMove(move)) {
      log.push(`${attacker.name} used ${move}! But it failed because of Throat Chop!`);
      _recordMoveFailureEvent(field, attacker, move, 'throat-chop', {
        move_failure_family: 'move_lock',
        blocker_kind: 'throat_chop',
        lock_state: 'throat_chop',
        sound_move_blocked: true,
        note: 'The selected sound move failed because the user was under Throat Chop.'
      });
      attacker.lastMoveFailed = true;
      return;
    }

    // T9j.6 (#18) — Choice Scarf lock SET on first move used. Exempt utility
    // moves that break/transfer the lock per Bulbapedia (Trick, Switcheroo).
    if (attacker.item === 'Choice Scarf' && !attacker.choiceLock &&
        move !== 'Trick' && move !== 'Switcheroo' && move !== 'Struggle') {
      attacker.choiceLock = move;
    }

    // T9j.2 (#31) — if side uses ANY non-Wide-Guard move this turn, reset chain.
    if (move !== 'Wide Guard') {
      const wgSide = (allies === playerActive) ? field.playerSide : field.oppSide;
      if (wgSide && wgSide.wideGuardChain > 0) wgSide.wideGuardChain = 0;
    }

    const moveType = _moveType(move);
    const PROTECT_MOVES = new Set(['Protect','Detect','Wide Guard','Quick Guard','Endure',
      "King's Shield",'Spiky Shield','Baneful Bunker','Obstruct']);
    const STATUS_MOVES  = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder','Hypnosis','Spore','Leech Seed','Toxic','Poison Powder','Perish Song','Trick',
      'Tailwind','Sunny Day','Rain Dance','Trick Room','Life Dew','Heal Pulse','Rage Powder','Roost','Parting Shot','Shed Tail','Wish','Teleport','Baton Pass','Quick Guard','Endure',
      // T9j.2 additions — side-state setters
      'Wide Guard','Follow Me','Quick Guard','Protect','Detect','King\'s Shield','Spiky Shield','Baneful Bunker','Obstruct',
      // T9j.3 Screens setters
      'Light Screen','Reflect','Aurora Veil',
      // Move-control / field-reset support
      'Encore','Haze','Defog',
      // Recovery / board-state support
      'Recover','Shore Up','Rest','Sleep Talk','Substitute','Imprison','Ally Switch',
      // Stage / pressure moves
      'Swords Dance','Dragon Dance','Calm Mind','Coil','Fake Tears','Coaching','Clangorous Soul',
      'Heal Bell','Aromatherapy','Jungle Healing','Noble Roar']);

    // Attacker must be alive
    if (!attacker.alive) return;

    if (attacker.stanceChangeForms) {
      if (move === "King's Shield") {
        if (attacker.setStanceForm('shield')) log.push(`${attacker.name} shifted into Shield Forme!`);
      } else if (_moveCategory(move) !== 'status') {
        if (attacker.setStanceForm('blade')) log.push(`${attacker.name} shifted into Blade Forme!`);
      }
    }

    if (attacker.ability === 'Protean' && !attacker.proteanUsed && !attacker.teraActivated &&
        moveType && move !== 'Struggle' && attacker.types.indexOf(moveType) === -1) {
      attacker.types = [moveType];
      attacker.flying = attacker.types.includes('Flying') || attacker.ability === 'Levitate';
      attacker.proteanUsed = true;
      log.push(`${attacker.name}'s Protean changed it into the ${moveType} type!`);
    }

    const _continuingCharge = attacker.chargingMove === move;
    const _effectiveWeather = _effectiveFieldWeather(field);
    const _naturalChargeSkip = !_continuingCharge && (
      (move === 'Electro Shot' && _effectiveWeather === 'rain') ||
      ((move === 'Solar Beam' || move === 'Solar Blade') && _effectiveWeather === 'sun')
    );
    const _powerHerbSkip = !_continuingCharge && _isChargeMove(move) &&
      attacker.item === 'Power Herb' && !attacker.itemConsumed &&
      !_naturalChargeSkip;
    const _chargeWouldNormallyBeSkipped = _naturalChargeSkip || _powerHerbSkip;
    if (_continuingCharge) {
      attacker.chargingMove = null;
      attacker.chargingTarget = null;
      attacker.chargingTargetSide = null;
      attacker.chargingTargetSlot = null;
      attacker.concealedByMove = null;
    } else if (_isChargeMove(move) && !_chargeWouldNormallyBeSkipped) {
      attacker.chargingMove = move;
      attacker.chargingTarget = target || null;
      attacker.chargingTargetSide = enemies.includes(target) ? 'enemy'
        : (allies.includes(target) ? 'ally' : null);
      attacker.chargingTargetSlot = attacker.chargingTargetSide === 'enemy'
        ? enemies.indexOf(target)
        : (attacker.chargingTargetSide === 'ally' ? allies.indexOf(target) : null);
      attacker.concealedByMove = move === 'Phantom Force' ? move : null;
      log.push(`${attacker.name} began charging ${move}!`);
      return;
    } else if (_powerHerbSkip) {
      attacker.itemConsumed = true;
      log.push(`${attacker.name} consumed its Power Herb!`);
    }

    if (attacker.tauntedTurns > 0 && _moveCategory(move) === 'status' && move !== 'Sleep Talk') {
      log.push(`${attacker.name} used ${move}! But it failed because of Taunt!`);
      _recordMoveFailureEvent(field, attacker, move, 'taunt', {
        move_failure_family: 'move_lock',
        blocker_kind: 'taunt',
        lock_state: 'taunt',
        taunted_turns: attacker.tauntedTurns || 0,
        note: 'The selected status move failed because the user was taunted.'
      });
      attacker.lastMoveFailed = true;
      return;
    }

    if (!PROTECT_MOVES.has(move)) attacker.protectChain = 0;

    const _protectFamilyChance = Math.pow(1/3, attacker.protectChain || 0);
    const enemySide = (allies === playerActive) ? field.oppSide : field.playerSide;
    const _protectFail = () => {
      log.push(`${attacker.name} used ${move}! But it failed!`);
      _recordMoveFailureEvent(field, attacker, move, 'protect-consecutive-fail', {
        note: 'The Protect-family move failed its consecutive-use check.'
      });
      attacker.protectChain = 0;
      attacker.protectKind = null;
      attacker.lastMoveFailed = true;
      return;
    };

    // Handle Protect (self only — Wide Guard/Quick Guard handled in status branch below)
    if (move === 'Protect' || move === 'Detect') {
      if (rng() > _protectFamilyChance) {
        _protectFail();
        attacker.lastMoveFailed = true;
        return;
      }
      attacker.protected = true;
      attacker.protectKind = move;
      attacker.enduring = false;
      attacker.protectChain++;
      log.push(`${attacker.name} used ${move}!`);
      return;
    }

    // Status moves
    if (STATUS_MOVES.has(move)) {
      log.push(`${attacker.name} used ${move}!`);
      const blockedBySubstitute = new Set([
        'Will-O-Wisp',
        'Thunder Wave',
        'Taunt',
        'Sleep Powder',
        'Hypnosis',
        'Spore',
        'Leech Seed',
        'Toxic',
        'Poison Powder',
        'Encore',
        'Parting Shot',
        'Trick'
      ]);
      if (target && target.alive && target.substituteHp > 0 && attacker.ability !== 'Infiltrator' && blockedBySubstitute.has(move)) {
        log.push(`${attacker.name} used ${move}! But it failed because of Substitute!`);
        _recordMoveFailureEvent(field, attacker, move, 'substitute-block', {
          target: target.name || null,
          target_key: _snapshotMonStableKey(target.side === field.playerSide ? 'player' : 'opponent', target),
          note: 'The selected move failed because the target was protected by Substitute.'
        });
        attacker.lastMoveFailed = true;
        return;
      }
      if (target && target.alive && shouldPranksterFailOnTarget(attacker, move, target)) {
        log.push(`${target.name} is immune to Prankster-boosted ${move}!`);
        _recordMoveFailureEvent(field, attacker, move, 'prankster-dark-immunity', {
          target: target.name || null,
          target_key: _snapshotMonStableKey(target.side === field.playerSide ? 'player' : 'opponent', target),
          note: 'The Prankster-boosted status move failed into a Dark-type target.'
        });
        attacker.lastMoveFailed = true;
        return;
      }
      if (target && target.alive && isBlockedByGoodAsGold(target, move)) {
        log.push(`${target.name}'s Good as Gold blocked ${move}!`);
        _recordMoveFailureEvent(field, attacker, move, 'good-as-gold', {
          target: target.name || null,
          target_key: _snapshotMonStableKey(target.side === field.playerSide ? 'player' : 'opponent', target),
          ability: 'Good as Gold',
          note: 'The status move failed because Good as Gold blocked it.'
        });
        attacker.lastMoveFailed = true;
        return;
      }
      if (target && target.alive && shouldReflectByMagicBounce(attacker, target, move)) {
        log.push(`${target.name}'s Magic Bounce reflected ${move}!`);
        target = attacker;
      }
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
      if (move === 'Ally Switch') {
        if (allies.length < 2) {
          log.push(`${attacker.name} used Ally Switch! But it failed!`);
          return;
        }
        const allyIdx = allies.findIndex(m => m !== attacker && m.alive);
        const selfIdx = allies.indexOf(attacker);
        if (allyIdx < 0 || selfIdx < 0) {
          log.push(`${attacker.name} used Ally Switch! But it failed!`);
          return;
        }
        const other = allies[allyIdx];
        allies[allyIdx] = attacker;
        allies[selfIdx] = other;
        log.push(`${attacker.name} switched places with its ally using Ally Switch!`);
        return;
      }
      if (move === 'Recover') {
        if (attacker.hp >= attacker.maxHp || !_canReceiveHealing(attacker)) {
          log.push(`${attacker.name} used Recover! But it failed!`);
          return;
        }
        const healFrac = (typeof MOVE_EFFECTS !== 'undefined' && MOVE_EFFECTS.Recover && MOVE_EFFECTS.Recover.healFraction) || 0.5;
        const hpBeforeHeal = attacker.hp;
        const heal = Math.floor(attacker.maxHp * healFrac);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        log.push(`${attacker.name} regained health with Recover!`);
        _recordEffectEvent(field, attacker, move, 'recovery', hpBeforeHeal, attacker.hp, {
          rule: { numerator: 1, denominator: 2, basis: 'max_hp', rounding: 'down' },
          heal_candidate: heal,
          heal_applied: Math.max(0, attacker.hp - hpBeforeHeal)
        });
        return;
      }
      if (move === 'Shore Up') {
        if (attacker.hp >= attacker.maxHp) {
          log.push(`${attacker.name} used Shore Up! But it failed!`);
          return;
        }
        const shoreUp = (typeof MOVE_EFFECTS !== 'undefined' && MOVE_EFFECTS['Shore Up']) || {};
        const healFrac = _effectiveFieldWeather(field) === 'sand'
          ? (shoreUp.sandHealFraction || (2 / 3))
          : (shoreUp.healFraction || 0.5);
        const hpBeforeHeal = attacker.hp;
        const heal = Math.floor(attacker.maxHp * healFrac);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        log.push(`${attacker.name} regained health with Shore Up!`);
        _recordEffectEvent(field, attacker, move, 'recovery', hpBeforeHeal, attacker.hp, {
          rule: {
            numerator: _effectiveFieldWeather(field) === 'sand' ? 2 : 1,
            denominator: _effectiveFieldWeather(field) === 'sand' ? 3 : 2,
            basis: 'max_hp',
            rounding: 'down'
          },
          heal_candidate: heal,
          heal_applied: Math.max(0, attacker.hp - hpBeforeHeal),
          weather: _effectiveFieldWeather(field)
        });
        return;
      }
      if (move === 'Rest') {
        if (attacker.hp >= attacker.maxHp || attacker.ability === 'Insomnia' || attacker.ability === 'Sweet Veil') {
          log.push(`${attacker.name} used Rest! But it failed!`);
          return;
        }
        const hpBeforeHeal = attacker.hp;
        attacker.hp = attacker.maxHp;
        attacker.status = 'sleep';
        attacker.statusTurns = ((typeof MOVE_EFFECTS !== 'undefined' && MOVE_EFFECTS.Rest && MOVE_EFFECTS.Rest.sleepTurns) || 2);
        attacker.sleepTurns = 0;
        attacker.toxicCounter = 0;
        attacker.frozenTurns = 0;
        log.push(`${attacker.name} went to sleep with Rest!`);
        _recordEffectEvent(field, attacker, move, 'full-recovery-status', hpBeforeHeal, attacker.hp, {
          rule: { basis: 'full_hp_restore', sleep_turns: attacker.statusTurns },
          heal_candidate: attacker.maxHp - hpBeforeHeal,
          heal_applied: Math.max(0, attacker.hp - hpBeforeHeal),
          status_after: attacker.status
        });
        return;
      }
      if (move === 'Substitute') {
        const subFrac = (typeof MOVE_EFFECTS !== 'undefined' && MOVE_EFFECTS.Substitute && MOVE_EFFECTS.Substitute.selfHpFraction) || 0.25;
        const subHp = Math.floor(attacker.maxHp * subFrac);
        if (attacker.substituteHp > 0 || attacker.hp <= subHp) {
          log.push(`${attacker.name} used Substitute! But it failed!`);
          return;
        }
        const hpBeforeCost = attacker.hp;
        attacker.substituteHp = subHp;
        attacker.hp -= subHp;
        log.push(`${attacker.name} made a Substitute!`);
        _recordEffectEvent(field, attacker, move, 'hp-cost', hpBeforeCost, attacker.hp, {
          rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
          hp_cost: subHp,
          substitute_hp: subHp
        });
        return;
      }
      if (move === 'Sleep Talk') {
        const asleep = attacker.status === 'sleep' || attacker.ability === 'Comatose';
        if (!asleep) {
          log.push(`${attacker.name} used Sleep Talk! But it failed!`);
          return;
        }
        const pool = attacker.moves.filter(m => m !== 'Sleep Talk');
        if (!pool.length) {
          log.push(`${attacker.name} used Sleep Talk! But it failed!`);
          return;
        }
        const calledMove = pool[Math.floor(rng() * pool.length)];
        log.push(`${attacker.name} used Sleep Talk!`);
        executeAction(attacker, calledMove, target, allies, enemies, field, log, rng, { fromSleepTalk: true });
        return;
      }
      // T9j.3 Screens setters. Duration fixed at 5 turns. Light Clay absent
      // from Champions (games.gg, Game8); T9j.6 closed #43 as WONTFIX — no
      // 5→8 extension applies.
      //    Cite: https://games.gg/news/pokemon-champions-items-list-meta/
      if (move === 'Light Screen') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.lightScreen = true;
        side.lightScreenTurns = 5;
        log.push(`${attacker.name} raised a Light Screen!`);
        return;
      }
      if (move === 'Reflect') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.reflect = true;
        side.reflectTurns = 5;
        log.push(`${attacker.name} raised a Reflect!`);
        return;
      }
      if (move === 'Aurora Veil') {
        // Gated: Aurora Veil only succeeds if hail/snow active at cast time.
        const wx = _effectiveFieldWeather(field);
        if (wx !== 'hail' && wx !== 'snow') {
          log.push(`${attacker.name} used Aurora Veil! But it failed (no hail/snow).`);
          return;
        }
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.auroraVeil = true;
        side.auroraVeilTurns = 5;
        log.push(`${attacker.name} activated Aurora Veil!`);
        return;
      }
      // T9j.2 (#31) — Wide Guard with 1/3 consecutive-use diminishing returns.
      if (move === 'Wide Guard') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        if (rng() > _protectFamilyChance) {
          log.push(`${attacker.name}'s Wide Guard failed!`);
          attacker.protectChain = 0;
          attacker.protectKind = null;
          return;
        }
          side.wideGuard = true;
        attacker.protectChain++;
        attacker.protectKind = move;
        log.push(`${attacker.name} protected its team with Wide Guard!`);
        return;
      }
      if (move === 'Quick Guard') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        if (rng() > _protectFamilyChance) {
          _protectFail();
          return;
        }
        side.quickGuard = true;
        attacker.protectChain++;
        attacker.protectKind = move;
        log.push(`${attacker.name} used Quick Guard!`);
        return;
      }
      if (move === 'Endure') {
        if (rng() > _protectFamilyChance) {
          _protectFail();
          return;
        }
        attacker.enduring = true;
        attacker.protectChain++;
        attacker.protectKind = move;
        log.push(`${attacker.name} braced itself with Endure!`);
        return;
      }
      if (move === "King's Shield" || move === 'Spiky Shield' || move === 'Baneful Bunker' || move === 'Obstruct') {
        if (rng() > _protectFamilyChance) {
          _protectFail();
          return;
        }
        attacker.protected = true;
        attacker.protectKind = move;
        attacker.protectChain++;
        log.push(`${attacker.name} used ${move}!`);
        return;
      }
      if (move === 'Taunt' && target && target.alive) {
        const targetAllies = (target.side && attacker.side && target.side === attacker.side) ? allies : enemies;
        const aromaVeilOnSide = targetAllies.some(m => m.alive && m.ability === 'Aroma Veil');
        if (target.ability === 'Oblivious' || target.ability === 'Aroma Veil' || aromaVeilOnSide) {
          log.push(`${target.name} is immune to Taunt!`);
          return;
        }
        if (target.tauntedTurns > 0) {
          log.push(`${target.name} is already taunted!`);
          return;
        }
        const mh = target.applyItem('taunt', field);
        if (mh) {
          log.push(mh);
          return;
        }
        target.tauntedTurns = 3;
        log.push(`${target.name} fell for the Taunt!`);
        return;
      }
      if (move === 'Encore' && target && target.alive) {
        const targetAllies = (target.side && attacker.side && target.side === attacker.side) ? allies : enemies;
        const aromaVeilOnSide = targetAllies.some(m => m.alive && m.ability === 'Aroma Veil');
        if (target.ability === 'Oblivious' || target.ability === 'Aroma Veil' || aromaVeilOnSide) {
          log.push(`${target.name} is immune to Encore!`);
          return;
        }
        if (!target.lastMoveUsed) {
          log.push(`${attacker.name} used Encore! But it failed!`);
          return;
        }
        target.encoredMove = target.lastMoveUsed;
        target.encoredTurns = 3;
        log.push(`${target.name} got an Encore!`);
        return;
      }
      // T9j.2 (#32) — Follow Me / Rage Powder set side redirect flag.
      if (move === 'Follow Me') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'followMe';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
      if (move === 'Rage Powder') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'ragePowder';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
      if (move === 'Sunny Day') { field.weather = 'sun'; field.weatherTurns = 5; log.push('The sunlight turned harsh!'); }
      if (move === 'Rain Dance') { field.weather = 'rain'; field.weatherTurns = 5; log.push('It started to rain!'); }
      if (move === 'Will-O-Wisp' && target && target.alive && canInflictStatus(target, 'burn', field, attacker)) {
        if (!_moveHits(attacker, target, move, field, rng, 0.85)) { log.push(`${attacker.name}'s Will-O-Wisp missed!`); return; }
        target.status = 'burn'; log.push(`${target.name} was burned by ${attacker.name}'s Will-O-Wisp!`);
        target.applyItem('status', field);
      }
      if (move === 'Thunder Wave' && target && target.alive && !target.types.includes('Ground') &&
          canInflictStatus(target, 'paralysis', field, attacker)) {
        if (!_moveHits(attacker, target, move, field, rng, 0.90)) { log.push(`${attacker.name}'s Thunder Wave missed!`); return; }
        target.status = 'paralysis'; log.push(`${target.name} is paralysed! It may be unable to move!`);
      }
      // T9j.4 (#41) — Toxic / Poison Powder inflict paths. Gate via canInflictStatus.
      if (move === 'Toxic' && target && target.alive &&
          canInflictStatus(target, 'toxic', field, attacker)) {
        if (!_moveHits(attacker, target, move, field, rng, 0.90)) { log.push(`${attacker.name}'s Toxic missed!`); return; }
        target.status = 'toxic';
        target.toxicCounter = 1;
        log.push(`${target.name} was badly poisoned!`);
      }
      if (move === 'Poison Powder' && target && target.alive &&
          canInflictStatus(target, 'poison', field, attacker) && !target.types.includes('Grass')) {
        if (!_moveHits(attacker, target, move, field, rng, 0.75)) { log.push(`${attacker.name}'s Poison Powder missed!`); return; }
        target.status = 'poison';
        log.push(`${target.name} was poisoned!`);
      }
      if (move === 'Sleep Powder' && target && target.alive && canInflictStatus(target, 'sleep', field, attacker) && !target.types.includes('Grass')) {
        if (!_moveHits(attacker, target, move, field, rng, 0.75)) { log.push(`${attacker.name}'s Sleep Powder missed!`); return; }
        target.status = 'sleep'; target.statusTurns = 2 + Math.floor(rng() * 2);
        target.sleepTurns = 0;
        log.push(`${target.name} fell asleep from ${attacker.name}'s Sleep Powder!`);
      }
      if (move === 'Hypnosis' && target && target.alive && canInflictStatus(target, 'sleep', field, attacker)) {
        if (!_moveHits(attacker, target, move, field, rng, 0.60)) { log.push(`${attacker.name}'s Hypnosis missed!`); return; }
        target.status = 'sleep';
        target.statusTurns = 2 + Math.floor(rng() * 2);
        target.sleepTurns = 0;
        log.push(`${target.name} fell asleep from ${attacker.name}'s Hypnosis!`);
      }
      if (move === 'Spore' && target && target.alive && canInflictStatus(target, 'sleep', field, attacker) && !target.types.includes('Grass')) {
        if (!_moveHits(attacker, target, move, field, rng, 1.0)) { log.push(`${attacker.name}'s Spore missed!`); return; }
        target.status = 'sleep';
        target.statusTurns = 2 + Math.floor(rng() * 2);
        target.sleepTurns = 0;
        log.push(`${target.name} fell asleep from ${attacker.name}'s Spore!`);
      }
      if (move === 'Leech Seed' && target && target.alive && !target.types.includes('Grass')) {
        if (target.leechSeededBy) {
          log.push(`${target.name} is already seeded!`);
          return;
        }
        if (!_moveHits(attacker, target, move, field, rng, 0.90)) { log.push(`${attacker.name}'s Leech Seed missed!`); return; }
        target.leechSeededBy = attacker;
        log.push(`${target.name} was seeded!`);
      }
      if (move === 'Perish Song') {
        for (const mon of [...playerActive, ...oppActive].filter(m => m.alive)) {
          mon.perishSongTurns = 3;
        }
        log.push(`${attacker.name} sang a Perish Song!`);
        return;
      }
      if (move === 'Life Dew') {
        for (const a of allies.filter(a => a.alive)) {
          if (!_canReceiveHealing(a)) continue;
          const hpBeforeHeal = a.hp;
          const heal = Math.floor(a.maxHp * 0.25);
          a.hp = Math.min(a.maxHp, a.hp + heal);
          log.push(`${a.name} had its HP restored by Life Dew!`);
          _recordEffectEvent(field, a, move, 'ally-recovery', hpBeforeHeal, a.hp, {
            source_actor: attacker.name,
            rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
            heal_candidate: heal,
            heal_applied: Math.max(0, a.hp - hpBeforeHeal)
          });
        }
      }
      if (move === 'Heal Pulse') {
        const healTarget = (target && target.alive && target.side === attacker.side)
          ? target
          : allies.find(a => a !== attacker && a.alive) || null;
        if (!healTarget || healTarget.hp >= healTarget.maxHp || !_canReceiveHealing(healTarget)) {
          log.push(`${attacker.name} used Heal Pulse! But it failed!`);
          return;
        }
        const hpBeforeHeal = healTarget.hp;
        const heal = Math.floor(healTarget.maxHp * 0.5);
        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + heal);
        log.push(`${attacker.name} restored HP for ${healTarget.name} with Heal Pulse!`);
        _recordEffectEvent(field, healTarget, move, 'target-recovery', hpBeforeHeal, healTarget.hp, {
          source_actor: attacker.name,
          rule: { numerator: 1, denominator: 2, basis: 'max_hp', rounding: 'down' },
          heal_candidate: heal,
          heal_applied: Math.max(0, healTarget.hp - hpBeforeHeal)
        });
        return;
      }
      if (move === 'Pollen Puff' && target && target.alive && target.side === attacker.side) {
        if (target.hp >= target.maxHp || !_canReceiveHealing(target)) {
          log.push(`${attacker.name} used Pollen Puff! But it failed!`);
          return;
        }
        const hpBeforeHeal = target.hp;
        const heal = Math.floor(target.maxHp * 0.5);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        log.push(`${attacker.name} restored HP for ${target.name} with Pollen Puff!`);
        _recordEffectEvent(field, target, move, 'target-recovery', hpBeforeHeal, target.hp, {
          source_actor: attacker.name,
          rule: { numerator: 1, denominator: 2, basis: 'max_hp', rounding: 'down' },
          heal_candidate: heal,
          heal_applied: Math.max(0, target.hp - hpBeforeHeal)
        });
        return;
      }
      if (move === 'Heal Bell' || move === 'Aromatherapy' || move === 'Jungle Healing') {
        const alliedTeam = attacker.side === field.playerSide
          ? [...playerActive, ...playerBench]
          : [...oppActive, ...oppBench];
        let curedCount = 0;
        for (const mon of alliedTeam) {
          if (!mon || !mon.alive || !mon.status) continue;
          mon.status = null;
          mon.statusTurns = 0;
          mon.toxicCounter = 0;
          mon.sleepTurns = 0;
          mon.healBlockedTurns = 0;
          curedCount++;
        }
        if (move === 'Jungle Healing') {
          for (const mon of allies.filter((a) => a.alive)) {
            if (!_canReceiveHealing(mon)) continue;
            const hpBeforeHeal = mon.hp;
            const heal = Math.floor(mon.maxHp * 0.25);
            if (heal > 0 && mon.hp < mon.maxHp) mon.hp = Math.min(mon.maxHp, mon.hp + heal);
            _recordEffectEvent(field, mon, move, 'ally-recovery-status', hpBeforeHeal, mon.hp, {
              source_actor: attacker.name,
              rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
              heal_candidate: heal,
              heal_applied: Math.max(0, mon.hp - hpBeforeHeal),
              cured_status: true
            });
          }
          log.push(`${attacker.name} healed its allies with Jungle Healing!`);
        } else {
          log.push(`${attacker.name}'s team was cured of status conditions with ${move}!`);
        }
        if (curedCount === 0 && move !== 'Jungle Healing') {
          return;
        }
        return;
      }
      if (move === 'Roost') {
        if (!_canReceiveHealing(attacker)) {
          log.push(`${attacker.name} used Roost! But it failed!`);
          return;
        }
        const hpBeforeHeal = attacker.hp;
        const heal = Math.floor(attacker.maxHp * 0.5);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        attacker.roosting = true;
        attacker.flying = attacker.ability === 'Levitate';
        log.push(`${attacker.name} restored HP with Roost!`);
        _recordEffectEvent(field, attacker, move, 'recovery', hpBeforeHeal, attacker.hp, {
          rule: { numerator: 1, denominator: 2, basis: 'max_hp', rounding: 'down' },
          heal_candidate: heal,
          heal_applied: Math.max(0, attacker.hp - hpBeforeHeal),
          temporary_grounding: true
        });
        return;
      }
      if (move === 'Wish') {
        const side = allies === playerActive ? field.playerSide : field.oppSide;
        const slot = allies.indexOf(attacker);
        if (slot < 0) {
          log.push(`${attacker.name} used Wish! But it failed!`);
          return;
        }
        side.wishes.push({
          slot: slot,
          amount: Math.max(1, Math.floor(attacker.maxHp / 2)),
          resolveTurn: turn + 1,
          sourceName: attacker.name
        });
        log.push(`${attacker.name} made a wish!`);
        return;
      }
      if (move === 'Teleport') {
        const pivotSide = attacker.side === field.playerSide ? 'player' : 'opp';
        if (!_switchOutActiveMon(attacker, pivotSide, field, log, { silentPivotLog: true })) {
          log.push(`${attacker.name} used Teleport! But it failed!`);
        }
        return;
      }
      if (move === 'Baton Pass') {
        const pivotSide = attacker.side === field.playerSide ? 'player' : 'opp';
        const pivotBench = pivotSide === 'player' ? playerBench : oppBench;
        if (!_chooseBenchReplacement(pivotBench)) {
          log.push(`${attacker.name} used Baton Pass! But it failed!`);
          return;
        }
        _switchOutActiveMon(attacker, pivotSide, field, log, {
          silentPivotLog: true,
          incomingState: {
            statBoosts: Object.assign({}, attacker.statBoosts),
            substituteHp: attacker.substituteHp
          }
        });
        log.push(`${attacker.name} passed its battle state to the replacement!`);
        return;
      }
      if (move === 'Swords Dance') {
        if (!_applyStageMap(attacker, { atk: 2 }, log)) {
          log.push(`${attacker.name} used Swords Dance! But it failed!`);
        }
        return;
      }
      if (move === 'Dragon Dance') {
        if (!_applyStageMap(attacker, { atk: 1, spe: 1 }, log)) {
          log.push(`${attacker.name} used Dragon Dance! But it failed!`);
        }
        return;
      }
      if (move === 'Calm Mind') {
        if (!_applyStageMap(attacker, { spa: 1, spd: 1 }, log)) {
          log.push(`${attacker.name} used Calm Mind! But it failed!`);
        }
        return;
      }
      if (move === 'Coil') {
        if (!_applyStageMap(attacker, { atk: 1, def: 1, acc: 1 }, log)) {
          log.push(`${attacker.name} used Coil! But it failed!`);
        }
        return;
      }
      if (move === 'Fake Tears' && target && target.alive) {
        if (!_applyStageMap(target, { spd: -2 }, log)) {
          log.push(`${attacker.name} used Fake Tears! But it failed!`);
        }
        return;
      }
      if (move === 'Noble Roar' && target && target.alive) {
        if (!_applyStageMap(target, { atk: -1, spa: -1 }, log)) {
          log.push(`${attacker.name} used Noble Roar! But it failed!`);
        }
        return;
      }
      if (move === 'Coaching') {
        const coachedAllies = allies.filter((mon) => mon !== attacker && mon.alive && !mon.concealedByMove);
        if (!coachedAllies.length) {
          log.push(`${attacker.name} used Coaching! But it failed!`);
          return;
        }
        for (const ally of coachedAllies) _applyStageMap(ally, { atk: 1, def: 1 }, log);
        return;
      }
      if (move === 'Clangorous Soul') {
        const soulCost = Math.floor(attacker.maxHp / 3);
        if (attacker.hp <= soulCost) {
          log.push(`${attacker.name} used Clangorous Soul! But it failed!`);
          return;
        }
        const applied = _applyStageMap(attacker, { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, log);
        if (!applied) {
          log.push(`${attacker.name} used Clangorous Soul! But it failed!`);
          return;
        }
        const hpBeforeCost = attacker.hp;
        attacker.hp -= soulCost;
        log.push(`${attacker.name} paid ${soulCost} HP for Clangorous Soul!`);
        _recordEffectEvent(field, attacker, move, 'hp-cost-stat-boost', hpBeforeCost, attacker.hp, {
          rule: { numerator: 1, denominator: 3, basis: 'max_hp', rounding: 'down' },
          hp_cost: soulCost,
          stat_boosts: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }
        });
        return;
      }
      if (move === 'Trick' && target && target.alive) {
        const attackerItem = (attacker.item && !attacker.itemConsumed) ? attacker.item : '';
        const targetItem = (target.item && !target.itemConsumed) ? target.item : '';
        if (!attackerItem && !targetItem) {
          log.push(`${attacker.name} used Trick! But it failed!`);
          return;
        }
        attacker.item = targetItem || '';
        target.item = attackerItem || '';
        attacker.itemConsumed = false;
        target.itemConsumed = false;
        attacker.choiceLock = null;
        target.choiceLock = null;
        log.push(`${attacker.name} swapped items with ${target.name} using Trick!`);
        return;
      }
      if (move === 'Parting Shot' && target && target.alive) {
        if (_applyTargetStageMap(attacker, target, { atk: -1, spa: -1 }, log)) {
          log.push(`${attacker.name}'s Parting Shot lowered ${target.name}'s offenses!`);
        }
        _switchOutActiveMon(attacker, attacker.side === field.playerSide ? 'player' : 'opp', field, log, { silentPivotLog: true });
        return;
      }
      if (move === 'Haze') {
        for (const mon of [...playerActive, ...oppActive].filter(m => m.alive)) {
          mon.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
        }
        log.push(`${attacker.name} cleared all stat changes with Haze!`);
        return;
      }
      if (move === 'Defog' && target && target.alive) {
        _applyTargetStageMap(attacker, target, { eva: -1 }, log);
        const side = target.side || null;
        if (side) {
          side.reflect = false; side.reflectTurns = 0;
          side.lightScreen = false; side.lightScreenTurns = 0;
          side.auroraVeil = false; side.auroraVeilTurns = 0;
        }
        field.terrain = 'none';
        field.terrainTurns = 0;
        log.push(`${target.name}'s evasiveness fell and the field was cleared by Defog!`);
        return;
      }
      if (move === 'Imprison') {
        const targetSide = enemySide;
        const blocked = attacker.moves.filter(m => m !== 'Imprison');
        targetSide.imprisonedMoves = new Set(blocked);
        targetSide.imprisonedBy = attacker.name;
        log.push(`${attacker.name} sealed away its foes' moves with Imprison!`);
        return;
      }
      if (move === 'Shed Tail') {
        const tailEffect = (typeof MOVE_EFFECTS !== 'undefined' && MOVE_EFFECTS['Shed Tail']) || {};
        const tailCostFrac = tailEffect.selfHpFraction || 0.5;
        const tailSubFrac = tailEffect.substituteHpFraction || 0.25;
        const tailCost = tailEffect.selfHpRounding === 'up'
          ? Math.ceil(attacker.maxHp * tailCostFrac)
          : Math.floor(attacker.maxHp * tailCostFrac);
        const subHp = tailEffect.substituteHpRounding === 'up'
          ? Math.ceil(attacker.maxHp * tailSubFrac)
          : Math.floor(attacker.maxHp * tailSubFrac);
        const pivotSide = attacker.side === field.playerSide ? 'player' : 'opp';
        const pivotBench = pivotSide === 'player' ? playerBench : oppBench;
        if (attacker.substituteHp > 0 || attacker.hp <= tailCost || !_chooseBenchReplacement(pivotBench)) {
          log.push(`${attacker.name} used Shed Tail! But it failed!`);
          return;
        }
        const hpBeforeCost = attacker.hp;
        attacker.hp -= tailCost;
        _switchOutActiveMon(attacker, pivotSide, field, log, {
          silentPivotLog: true,
          incomingSubstituteHp: subHp
        });
        log.push(`${attacker.name} shed its tail and created a Substitute!`);
        _recordEffectEvent(field, attacker, move, 'hp-cost-pivot-substitute', hpBeforeCost, attacker.hp, {
          rule: { numerator: 1, denominator: 2, basis: 'max_hp', rounding: 'up' },
          substitute_rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
          hp_cost: tailCost,
          substitute_hp: subHp,
          pivoted: true
        });
        return;
      }
      return;
    }

    // T9j.17 (Refs #101) -- Fake Out hard-gate enforced inside executeAction.
    // selectMove already filters Fake Out past turn 1, so this branch is a
    // safety net for forced-move paths (Encore lock, imported test moves).
    // Champions rule: if a Pokemon is forced into Fake Out past its first turn
    // out, the move fails and the user Struggles instead (mirrors Encore -> Struggle
    // when no legal move remains). Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Encore_(move)
    //
    // PLACEMENT: this block lives ABOVE the Protect check so that even when
    // a legal Fake Out is blocked by Protect, the _fakeDone flag is still set --
    // i.e. the user has spent its one Fake Out window for this stay on the field.
    if (move === 'Fake Out') {
      if (attacker._fakeDone || (attacker.turnsSinceEntry || 0) > 1) {
        log.push(`${attacker.name} tried Fake Out -- but it failed! (only on first turn out)`);
        attacker.lastMoveFailed = true;
        _recordMoveFailureEvent(field, attacker, move, 'fake_out_timing', {
          blocked_priority: true,
          priority_failure_family: 'fake_out_timing',
          turns_since_entry: attacker.turnsSinceEntry || 0,
          fake_out_window_spent: !!attacker._fakeDone,
          note: 'Fake Out failed because it can only be used on the user first turn out.'
        });
        // Encore -> Struggle path: deal 1/4 max HP fixed damage to a live
        // enemy and recoil 1/4 max HP. Standard Struggle resolution.
        // Cite: https://bulbapedia.bulbagarden.net/wiki/Struggle
        const _struggleTgt = (target && target.alive) ? target : enemies.find(e => e.alive);
        if (_struggleTgt && _struggleTgt.alive) {
          log.push(`${attacker.name} used Struggle!`);
          const _stDmg = Math.max(1, Math.floor(_struggleTgt.maxHp * 0.25));
          applyDamage(attacker, 'Struggle', _struggleTgt, _stDmg, field, log, rng);
        }
        const _stRecoil = Math.max(1, Math.floor(attacker.maxHp * 0.25));
        const _stHpBeforeRecoil = attacker.hp;
        attacker.hp = Math.max(0, attacker.hp - _stRecoil);
        const _stAppliedRecoil = Math.max(0, _stHpBeforeRecoil - attacker.hp);
        log.push(`${attacker.name} is hit by Struggle recoil! [${_stAppliedRecoil} dmg${_stRecoil !== _stAppliedRecoil ? ', calc ' + _stRecoil : ''}]`);
        _recordEffectEvent(field, attacker, 'Struggle', 'recoil', _stHpBeforeRecoil, attacker.hp, {
          rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
          calculated_effect_damage: _stRecoil,
          damage_applied_to_user: _stAppliedRecoil
        });
        if (attacker.hp === 0) {
          attacker.alive = false;
          log.push(`${attacker.name} fainted from Struggle recoil!`);
          _recordKO(attacker, { move: 'Struggle', attacker: attacker, reason: 'recoil' });
        }
        return;
      }
      // Mark the Fake Out window consumed BEFORE the Protect check so that a
      // Protect-blocked Fake Out still counts as the user's one attempt.
      attacker._fakeDone = true;
    }

    // Skip if target protected.
    // T9j.8 (Refs #30): Piercing Drill / Unseen Fist piercing paths are resolved
    // inside executeMove (per-target loop). Utility branches reaching THIS block
    // (U-turn / Flip Turn / Dragon Darts below) fall through to those specific
    // handlers, which all delegate to applyDamage directly -- and currently treat
    // Protect as full block. Keeping default full-block here preserves parity
    // with pre-T9j.8 behavior for those narrow paths.
    const _shieldRiderKinds = new Set(["King's Shield",'Spiky Shield','Baneful Bunker','Obstruct']);
    const _directProtectGateMoves = new Set(['Struggle']);
    if (target && target.protected && _directProtectGateMoves.has(move) &&
        move !== 'Feint' && move !== 'Dragon Darts' && move !== 'Phantom Force' &&
        !_shieldRiderKinds.has(target.protectKind)) {
      log.push(`${attacker.name} used ${move}! But ${target.name} was protected!`);
      return;
    }

    if (move === 'Struggle') {
      const _struggleTgt = (target && target.alive) ? target : enemies.find(e => e.alive);
      if (!_struggleTgt) return;
      log.push(`${attacker.name} used Struggle!`);
      const _stDmg = Math.max(1, Math.floor(_struggleTgt.maxHp * 0.25));
      applyDamage(attacker, 'Struggle', _struggleTgt, _stDmg, field, log, rng);
      const _stRecoil = Math.max(1, Math.floor(attacker.maxHp * 0.25));
      const _stHpBeforeRecoil = attacker.hp;
      attacker.hp = Math.max(0, attacker.hp - _stRecoil);
      const _stAppliedRecoil = Math.max(0, _stHpBeforeRecoil - attacker.hp);
      log.push(`${attacker.name} is hit by Struggle recoil! [${_stAppliedRecoil} dmg${_stRecoil !== _stAppliedRecoil ? ', calc ' + _stRecoil : ''}]`);
      _recordEffectEvent(field, attacker, 'Struggle', 'recoil', _stHpBeforeRecoil, attacker.hp, {
        rule: { numerator: 1, denominator: 4, basis: 'max_hp', rounding: 'down' },
        calculated_effect_damage: _stRecoil,
        damage_applied_to_user: _stAppliedRecoil
      });
      if (attacker.hp === 0) {
        attacker.alive = false;
        log.push(`${attacker.name} fainted from Struggle recoil!`);
        _recordKO(attacker, { move: 'Struggle', attacker: attacker, reason: 'recoil' });
      }
      return;
    }

    if (move === 'Sucker Punch') {
      const targetMove = target && target._chosenMove;
      const targetCategory = _moveCategory(targetMove);
      const targetIsAttack = !!(targetMove && targetCategory && targetCategory !== 'status');
      if (!target || !target.alive || target.hasActed || !targetIsAttack) {
        log.push(`${attacker.name} used Sucker Punch! But it failed!`);
        return;
      }
    }
    if (enemySide && enemySide.imprisonedMoves && enemySide.imprisonedMoves.has(move) && !fromSleepTalk) {
      log.push(`${attacker.name} used ${move}! But it failed because of Imprison!`);
      _recordMoveFailureEvent(field, attacker, move, 'imprison', {
        move_failure_family: 'move_lock',
        blocker_kind: 'imprison',
        lock_state: 'imprison',
        imprisoned_by: enemySide && enemySide.imprisonedBy || null,
        note: 'The selected move failed because an opposing Imprison effect blocked shared moves.'
      });
      attacker.lastMoveFailed = true;
      return;
    }

    // Miss chance for low-accuracy moves
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                     'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                     'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0 };
    const acc = _moveAccuracy(move, ACC_MAP[move]);
    if (!_moveHits(attacker, target, move, field, rng, acc)) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      _recordMoveFailureEvent(field, attacker, move, 'accuracy-miss', {
        target: target && target.name || null,
        target_key: target ? _snapshotMonStableKey(target.side === field.playerSide ? 'player' : 'opponent', target) : null,
        accuracy: acc,
        note: 'The selected move failed because the accuracy check missed.'
      });
      attacker.lastMoveFailed = true;
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

    if (move === 'Pollen Puff' && target && target.alive && target.side === attacker.side) {
      if (target.hp >= target.maxHp || !_canReceiveHealing(target)) {
        log.push(`${attacker.name} used Pollen Puff! But it failed!`);
        return;
      }
      const heal = Math.floor(target.maxHp * 0.5);
      target.hp = Math.min(target.maxHp, target.hp + heal);
      log.push(`${attacker.name} restored HP for ${target.name} with Pollen Puff!`);
      return;
    }

    // Dragon Darts has bespoke doubles targeting rules and ignores Wide Guard.
    if (move === 'Dragon Darts') {
      executeDragonDarts(attacker, target, allies, enemies, field, log, rng);
      return;
    }

    if (MULTI_HIT_MOVES.has(move)) {
      const _mhResult = executeMultiHitMove(attacker, move, target, allies, enemies, field, log, rng);
      attacker.lastMoveFailed = !(_mhResult && _mhResult.didDamage);
      return;
    }

    // T9j.2 (Issue #26) — per-target damage via executeMove wrapper.
    // Handles spread, Wide Guard, Follow Me/Rage Powder redirection,
    // per-target type eff, and format-aware 0.75× mod.
    // T9j.8 (Refs #30) Parental Bond: Kangaskhan-Mega single-target damaging
    // moves strike twice. Second strike fires at 1/4 BP via field._ctx.bpMult.
    // Spread moves (all-adjacent, all-foes) do NOT get the second strike per
    // mainline behavior (Bulbapedia Parental Bond). Status, multi-hit moves
    // (Dragon Darts / Bone Rush), and fainted attackers also skip the 2nd hit.
    const _isParentalBond = (attacker.ability === 'Parental Bond');
    const _tCat = _moveTargetCategory(move);
    const _isSingleTargetDamage = (_tCat === 'normal' || _tCat === 'adjacent-foe');
    const _skipSecond = new Set(['Dragon Darts','Bone Rush','U-turn','Flip Turn','Fake Out']);
    const _pbEligible = _isParentalBond && _isSingleTargetDamage && !_skipSecond.has(move);
    const _moveResult = executeMove(attacker, move, target, allies, enemies, field, log, rng);
    attacker.lastMoveFailed = !(_moveResult && _moveResult.didDamage);
    const _pivotAttackMoves = new Set(['U-turn', 'Flip Turn', 'Volt Switch']);
    if (_pivotAttackMoves.has(move) && _moveResult && _moveResult.didDamage && attacker.alive) {
      _switchOutActiveMon(attacker, attacker.side === field.playerSide ? 'player' : 'opp', field, log);
    }
    if (_pbEligible && attacker.alive && target && target.alive) {
      // Second strike at 1/4 BP per Champions nerf (was 1/2 in mainline).
      // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
      field._ctx.bpMult = 0.25;
      executeMove(attacker, move, target, allies, enemies, field, log, rng);
      field._ctx.bpMult = 1;
      log.push(`${attacker.name} struck again with Parental Bond!`);
    }
  }

  // ============================================================
  // T9j.2 — executeMove: per-target damage resolution
  // Refs #26 (spread), #31 (Wide Guard), #32 (Follow Me/Rage Powder),
  //      #33 (MOVE_TARGETS registry)
  // ============================================================
  function dragonDartsNoDamageTarget(attacker, target, field) {
    if (!target || !target.alive) return true;
    if (target.protected) return true;
    if (target.concealedByMove) return true;
    const _savedForceNoCrit = field._ctx.forceNoCrit;
    const _savedLastWasCrit = field._ctx.lastWasCrit;
    field._ctx.forceNoCrit = true;
    field._ctx.lastWasCrit = false;
    try {
      return attacker.calcDamage('Dragon Darts', target, field, null, function() { return 0; }) === 0;
    } finally {
      field._ctx.forceNoCrit = _savedForceNoCrit;
      field._ctx.lastWasCrit = _savedLastWasCrit;
    }
  }

  function captureBattleDamage(attacker, move, target, field, rng) {
    const ctx = field && field._ctx;
    if (!ctx) return attacker.calcDamage(move, target, field, null, rng);
    const prevCapture = !!ctx.captureDamageCalc;
    ctx.captureDamageCalc = true;
    ctx.lastDamageCalc = null;
    try {
      return attacker.calcDamage(move, target, field, null, rng);
    } finally {
      ctx.captureDamageCalc = prevCapture;
    }
  }

  function applySingleTargetHit(attacker, move, target, field, log, rng) {
    if (!target || !target.alive) return;
    if (target.concealedByMove && move !== 'Phantom Force') {
      log.push(`${target.name} avoided the attack while concealed!`);
      return;
    }
    let _protectMult = 0;
    const _resolvedMoveType = _resolveDynamicMoveType(attacker, move, field);
    const _isContact = _isContactMove(move);
    const _shieldKind = target.protectKind || 'Protect';
    if (move === 'Phantom Force' && target.protected) {
      target.protected = false;
      target.protectKind = null;
      if (target.side) {
        target.side.quickGuard = false;
        target.side.wideGuard = false;
      }
      log.push(`${attacker.name}'s Phantom Force pierced through protection!`);
    } else if (target.protected && move !== 'Feint') {
      const _protRes = callAbilityHook(attacker, 'onProtectResolve', {
        attacker: attacker, defender: target, move: move,
        moveType: _resolvedMoveType, isContact: _isContact, log: log
      });
      if (_protRes && _protRes.damageMult > 0) {
        _protectMult = _protRes.damageMult;
        log.push(`${target.name} protected itself, but ${attacker.ability} pierced through!`);
      } else {
        if (_isContact && (_shieldKind === "King's Shield" || _shieldKind === 'Spiky Shield' || _shieldKind === 'Baneful Bunker' || _shieldKind === 'Obstruct')) {
          if (_shieldKind === "King's Shield") {
            _applyTargetStageMap(target, attacker, { atk: -1 }, log);
          }
          if (_shieldKind === 'Spiky Shield') {
            const recoil = Math.max(1, Math.floor(attacker.maxHp / 8));
            const hpBeforeShield = attacker.hp;
            attacker.hp = Math.max(0, attacker.hp - recoil);
            log.push(`${attacker.name} was hurt by Spiky Shield! [${recoil} dmg]`);
            _recordEffectEvent(field, attacker, 'Spiky Shield', 'protect-contact-damage', hpBeforeShield, attacker.hp, {
              source: 'engine protect contact rule',
              rule: { numerator: 1, denominator: 8, basis: 'max_hp', rounding: 'down' },
              damage_applied: Math.max(0, hpBeforeShield - attacker.hp)
            });
            if (attacker.hp === 0) {
              attacker.alive = false;
              log.push(`${attacker.name} fainted!`);
              _recordKO(attacker, { move: 'Spiky Shield', attacker: target, reason: 'shield' });
            }
          }
          if (_shieldKind === 'Baneful Bunker') {
            if (canInflictStatus(attacker, 'poison', field, target)) {
              attacker.status = 'poison';
              log.push(`${attacker.name} was poisoned by Baneful Bunker!`);
            }
          }
          if (_shieldKind === 'Obstruct') {
            _applyTargetStageMap(target, attacker, { def: -2 }, log);
          }
          log.push(`${target.name} protected itself!`);
          return;
        }
        log.push(`${target.name} protected itself!`);
        return;
      }
    }

    field._ctx.isSpread = false;
    field._ctx.lastWasCrit = false;
    let dmg = captureBattleDamage(attacker, move, target, field, rng);
    const _wasCrit = !!field._ctx.lastWasCrit;
    field._ctx.isSpread = false;
    field._ctx.lastWasCrit = false;
    if (_protectMult > 0 && dmg > 0) dmg = Math.max(1, Math.floor(dmg * _protectMult));
    if (dmg > 0) {
      if (_wasCrit) log.push(`A critical hit!`);
      applyDamage(attacker, move, target, dmg, field, log, rng);
    } else {
      log.push(`${move} had no effect on ${target.name}!`);
    }
  }

  function executeDragonDarts(attacker, intendedTarget, allies, enemies, field, log, rng) {
    const liveEnemies = enemies.filter(function(e) { return e.alive; });
    if (!liveEnemies.length) {
      log.push(`${attacker.name} used Dragon Darts! (no valid target)`);
      _recordMoveFailureEvent(field, attacker, 'Dragon Darts', 'no-valid-target', {
        note: 'Dragon Darts failed because no opposing target was alive.'
      });
      return;
    }

    log.push(`${attacker.name} used Dragon Darts!`);

    if (intendedTarget && intendedTarget.side === attacker.side) {
      applySingleTargetHit(attacker, 'Dragon Darts', intendedTarget, field, log, rng);
      if (attacker.alive) applySingleTargetHit(attacker, 'Dragon Darts', intendedTarget, field, log, rng);
      return;
    }

    var primary = (intendedTarget && intendedTarget.alive) ? intendedTarget : liveEnemies[0];
    var redirect = primary && primary.side ? primary.side.redirectTo : null;
    var redirectType = primary && primary.side ? primary.side.redirectType : null;
    if (redirect && redirect.alive && redirect !== attacker) {
      var bypassRedirect = false;
      if (redirectType === 'ragePowder') {
        if (attacker.types.includes('Grass')) bypassRedirect = true;
        if (attacker.ability === 'Overcoat') bypassRedirect = true;
        if (attacker.item === 'Safety Goggles') bypassRedirect = true;
      }
      if (attacker.ability === 'Stalwart') bypassRedirect = true;
      if (!bypassRedirect) {
        log.push(`${attacker.name}'s attack was drawn to ${redirect.name}!`);
        applySingleTargetHit(attacker, 'Dragon Darts', redirect, field, log, rng);
        if (attacker.alive) applySingleTargetHit(attacker, 'Dragon Darts', redirect, field, log, rng);
        return;
      }
    }

    var secondary = liveEnemies.find(function(e) { return e !== primary; }) || null;
    var hitTargets;
    if (!secondary) {
      hitTargets = [primary, primary];
    } else {
      var primaryBlocked = dragonDartsNoDamageTarget(attacker, primary, field);
      var secondaryBlocked = dragonDartsNoDamageTarget(attacker, secondary, field);
      if (primaryBlocked && !secondaryBlocked) hitTargets = [secondary, secondary];
      else if (secondaryBlocked && !primaryBlocked) hitTargets = [primary, primary];
      else hitTargets = [primary, secondary];
    }

    applySingleTargetHit(attacker, 'Dragon Darts', hitTargets[0], field, log, rng);
    if (attacker.alive) applySingleTargetHit(attacker, 'Dragon Darts', hitTargets[1], field, log, rng);
  }

  function executeMultiHitMove(attacker, move, intendedTarget, allies, enemies, field, log, rng) {
    const liveEnemies = enemies.filter(function(e) { return e.alive; });
    let target = (intendedTarget && intendedTarget.alive) ? intendedTarget : liveEnemies[0] || null;
    if (target && target.side && target.side !== attacker.side) {
      const redirect = target.side.redirectTo;
      const redirectType = target.side.redirectType;
      if (redirect && redirect.alive && redirect !== attacker) {
        let bypassRedirect = attacker.ability === 'Stalwart';
        if (redirectType === 'ragePowder') {
          if (attacker.types.includes('Grass')) bypassRedirect = true;
          if (attacker.ability === 'Overcoat') bypassRedirect = true;
          if (attacker.item === 'Safety Goggles') bypassRedirect = true;
        }
        if (!bypassRedirect) {
          log.push(`${attacker.name}'s attack was drawn to ${redirect.name}!`);
          target = redirect;
        }
      }
    }
    if (!target || !target.alive) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      _recordMoveFailureEvent(field, attacker, move, 'no-valid-target', {
        note: 'The multi-hit move failed because no valid target remained.'
      });
      return { didDamage: false };
    }
    const hitCount = _multiHitCount(attacker, move, rng);
    log.push(`${attacker.name} used ${move}!`);
    for (let i = 0; i < hitCount; i++) {
      if (!attacker.alive || !target.alive) break;
      applySingleTargetHit(attacker, move, target, field, log, rng);
    }
    log.push(`${move} hit ${hitCount} time${hitCount === 1 ? '' : 's'}!`);
    return { didDamage: hitCount > 0 };
  }

  function executeMove(attacker, move, intendedTarget, allies, enemies, field, log, rng) {
    const resolution = { didDamage: false };
    const format = (opts && opts.format) || 'doubles';
    const isDoubles = (format !== 'singles');
    let targetCat = _moveTargetCategory(move);

    const teraAllowed = attacker.teamFormat !== 'champions' && opts && opts.allowTera === true;
    if (teraAllowed && attacker.tera && !attacker.teraActivated) {
      attacker.teraActivated = true;
      log.push(`${attacker.name} Terastallized into ${attacker.tera}!`);
    }
    const _resolvedMoveType = _resolveDynamicMoveType(attacker, move, field);

    // T9j.17 (Refs #36) -- Expanding Force x Psychic Terrain dynamic target.
    // When the user is grounded AND Psychic Terrain is active, Expanding Force
    // becomes a spread move hitting all adjacent foes and gets a 1.5x BP boost.
    // Ungrounded users (Flying-type or Levitate) keep the default single-target.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Expanding_Force_(move)
    // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
    const _prevBpMult = (field._ctx && field._ctx.bpMult) || 1;
    let _bpMultPushed = false;
    if (move === 'Expanding Force' && field.terrain === 'psychic' && !attacker.flying) {
      targetCat = 'all-adjacent-foes';
      field._ctx.bpMult = _prevBpMult * 1.5;
      _bpMultPushed = true;
      log.push(`${attacker.name}'s Expanding Force surged through the Psychic Terrain!`);
    }

    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);

    // Resolve valid targets by category.
    let targets = [];
    switch (targetCat) {
      case 'all-adjacent':
        targets = isDoubles ? [...liveEnemies, ...liveAllies] : liveEnemies.slice(0, 1);
        break;
      case 'all-adjacent-foes':
        targets = isDoubles ? liveEnemies : liveEnemies.slice(0, 1);
        break;
      case 'all-foes':
        targets = liveEnemies;
        break;
      case 'random-foe':
        if (liveEnemies.length > 0) {
          targets = [liveEnemies[Math.floor(rng() * liveEnemies.length)]];
        }
        break;
      case 'all-allies':
      case 'self':
        targets = intendedTarget ? [intendedTarget] : [attacker];
        break;
      case 'normal':
      case 'adjacent-foe':
      default: {
        let t = intendedTarget;
        if ((!t || !t.alive) && (!t || !t.side || t.side !== attacker.side)) {
          t = liveEnemies[0] || null;
        }
        // T9j.2 (#32) — redirection: single-target moves to a side with redirectTo
        if (t && t.side) {
          const rTo = t.side.redirectTo;
          const rType = t.side.redirectType;
          if (rTo && rTo.alive && rTo !== attacker) {
            let bypass = false;
            if (rType === 'ragePowder') {
              if (attacker.types.includes('Grass')) bypass = true;
              if (attacker.ability === 'Overcoat') bypass = true;
              if (attacker.item === 'Safety Goggles') bypass = true;
            }
            if (attacker.ability === 'Stalwart') bypass = true;
            if (!bypass) {
              log.push(`${attacker.name}'s attack was drawn to ${rTo.name}!`);
              t = rTo;
            }
          }
        }
        targets = (t && t.alive) ? [t] : [];
        break;
      }
    }

    if (targets.length === 0) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      _recordMoveFailureEvent(field, attacker, move, 'no-valid-target', {
        note: 'The selected move failed because no valid target remained after targeting and redirection resolution.'
      });
      attacker.lastMoveFailed = true;
      return resolution;
    }

    if (move === 'Poltergeist') {
      targets = targets.filter(t => {
        if (_hasUsableHeldItem(t)) return true;
        log.push(`${attacker.name} used Poltergeist! But it failed because ${t.name} has no item!`);
        _recordMoveFailureEvent(field, attacker, move, 'poltergeist-no-item', {
          target: t.name || null,
          target_key: _snapshotMonStableKey(t.side === field.playerSide ? 'player' : 'opponent', t),
          note: 'Poltergeist failed because the target had no usable held item.'
        });
        return false;
      });
      if (targets.length === 0) {
        attacker.lastMoveFailed = true;
        return resolution;
      }
    }

    const isSpread =
      targetCat === 'all-adjacent' ||
      targetCat === 'all-adjacent-foes' ||
      targetCat === 'all-foes';

    // T9j.2 (#31) — Wide Guard filter on damaging spread moves.
    // Haze / Perish Song are non-damaging 'all-foes' status; spec says WG does NOT
    // block them. They're routed through the status-move branch above and never
    // reach executeMove, so no additional gate needed.
    if (isSpread) {
      targets = targets.filter(t => {
        if (t === attacker) return true;
        if (t.side && t.side.wideGuard) {
          log.push(`Wide Guard blocked ${move} on ${t.name}!`);
          return false;
        }
        return true;
      });
      if (targets.length === 0) {
        attacker.lastMoveFailed = true;
        return resolution;
      }
    }

    const movePriority = getPriority(move, attacker);
    if (movePriority > 0) {
      targets = targets.filter(t => {
        if (!t.side || !attacker.side || t.side === attacker.side) return true;
        if (t.side.quickGuard && move !== 'Feint') {
          log.push(`Quick Guard blocked ${move} on ${t.name}!`);
          _recordMoveFailureEvent(field, attacker, move, 'quick_guard_priority_block', {
            blocked_priority: true,
            priority_failure_family: 'guard',
            blocker: 'Quick Guard',
            blocker_kind: 'quick_guard',
            target: t.name || null,
            target_key: _snapshotMonStableKey(t.side === field.playerSide ? 'player' : 'opponent', t),
            target_side: t.side === field.playerSide ? 'player' : 'opponent',
            move_priority: movePriority,
            format: field && field.format || null,
            note: 'Quick Guard blocked this positive-priority move.'
          });
          return false;
        }
        const defenders = (t.side === field.playerSide) ? playerActive : oppActive;
        const priorityBlocker = defenders.find(function(m) {
          return m.alive && (m.ability === 'Armor Tail' || m.ability === 'Dazzling' || m.ability === 'Queenly Majesty');
        });
        if (priorityBlocker) {
          log.push(`${priorityBlocker.ability} blocked ${move} on ${t.name}!`);
          _recordMoveFailureEvent(field, attacker, move, _normalizeMechanicsReasonId(priorityBlocker.ability) + '_priority_block', {
            blocked_priority: true,
            priority_failure_family: 'ability',
            blocker: priorityBlocker.ability,
            blocker_kind: _normalizeMechanicsReasonId(priorityBlocker.ability),
            blocker_key: _snapshotMonStableKey(priorityBlocker.side === field.playerSide ? 'player' : 'opponent', priorityBlocker),
            target: t.name || null,
            target_key: _snapshotMonStableKey(t.side === field.playerSide ? 'player' : 'opponent', t),
            target_side: t.side === field.playerSide ? 'player' : 'opponent',
            move_priority: movePriority,
            format: field && field.format || null,
            note: priorityBlocker.ability + ' blocked this positive-priority move for its side.'
          });
          return false;
        }
        // Psychic Terrain blocks priority moves from hitting grounded mons.
        if (field && field.terrain === 'psychic' && _isGrounded(t)) {
          log.push(`Psychic Terrain blocked ${move} on ${t.name}!`);
          _recordMoveFailureEvent(field, attacker, move, 'psychic_terrain_priority_block', {
            blocked_priority: true,
            priority_failure_family: 'terrain',
            blocker: 'Psychic Terrain',
            blocker_kind: 'psychic_terrain',
            target: t.name || null,
            target_key: _snapshotMonStableKey(t.side === field.playerSide ? 'player' : 'opponent', t),
            target_side: t.side === field.playerSide ? 'player' : 'opponent',
            target_grounded: true,
            move_priority: movePriority,
            format: field && field.format || null,
            note: 'Psychic Terrain blocked this priority move because the target was grounded.'
          });
          return false;
        }
        return true;
      });
      if (targets.length === 0) {
        attacker.lastMoveFailed = true;
        return resolution;
      }
    }

    const applySpreadMod = isSpread && isDoubles && targets.length > 1;

    // Miss check — single roll for whole move (VGC spread behavior)
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                      'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                      'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0,
                      'Rock Slide':0.90, 'Heat Wave':0.90 };
    const accuracyTarget = targets.find(function(t) {
      return t && t.alive && _isAccuracyBypassed(attacker, t);
    }) || targets.find(function(t) {
      return t && t.alive;
    }) || null;
    const acc = _moveAccuracy(move, ACC_MAP[move]);
    if (!_moveHits(attacker, accuracyTarget, move, field, rng, acc)) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
      attacker.lastMoveFailed = true;
      return resolution;
    }

    // T9j.17 (Refs #101) -- Piercing Drill 25% miss chance on every move.
    // Replaces the prior contact-bypass-Protect interpretation. The roll fires
    // here (after the move is selected and the standard ACC_MAP roll passes)
    // so it stacks correctly with low-accuracy moves.
    // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
    if (attacker.ability === 'Piercing Drill' && rng() < 0.25) {
      log.push(`${attacker.name} used ${move}! But Piercing Drill missed!`);
      if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
      attacker.lastMoveFailed = true;
      return resolution;
    }

    log.push(`${attacker.name} used ${move}!`);

    const _prevPreDamageBoostMon = field._ctx.preDamageSpaBoostMon;
    const _prevPreDamageBoostMove = field._ctx.preDamageSpaBoostMove;
    if (move === 'Electro Shot' || move === 'Meteor Beam') {
      const _stageDelta = _applyStageDelta(attacker, 'spa', _preDamageSpaBoostDelta(attacker, move));
      if (_stageDelta) _logStageDelta(log, attacker, 'spa', _stageDelta);
      field._ctx.preDamageSpaBoostMon = attacker;
      field._ctx.preDamageSpaBoostMove = move;
    }

    // Speed order so faints register correctly mid-spread
    const ordered = [...targets].sort((a, b) => _comparePokemonSpeedOrder(a, b, field));

    for (const t of ordered) {
      if (!t.alive) continue;
      const _hadSubstitute = t.substituteHp > 0 && attacker.ability !== 'Infiltrator';
      if (t.concealedByMove && move !== 'Phantom Force') {
        log.push(`${t.name} avoided the attack while concealed!`);
        continue;
      }
      // T9j.8 (Refs #30) Protect resolution: Piercing Drill / Unseen Fist deal
      // 25% damage through Protect on contact moves. Default path is full block.
      let _protectMult = 0;
      const _isContact = _isContactMove(move);
      const _shieldKind = t.protectKind || 'Protect';
      if (move === 'Phantom Force' && t.protected) {
        t.protected = false;
        t.protectKind = null;
        if (t.side) {
          t.side.quickGuard = false;
          t.side.wideGuard = false;
        }
        log.push(`${attacker.name}'s Phantom Force pierced through protection!`);
      } else if (t.protected && move !== 'Feint') {
        const _protRes = callAbilityHook(attacker, 'onProtectResolve', {
          attacker: attacker, defender: t, move: move,
          moveType: _resolvedMoveType, isContact: _isContact, log: log
        });
        if (_protRes && _protRes.damageMult > 0) {
          _protectMult = _protRes.damageMult;
          log.push(`${t.name} protected itself, but ${attacker.ability} pierced through!`);
        } else {
          if (_isContact && (_shieldKind === "King's Shield" || _shieldKind === 'Spiky Shield' || _shieldKind === 'Baneful Bunker' || _shieldKind === 'Obstruct')) {
            if (_shieldKind === "King's Shield") {
              attacker.statBoosts.atk = Math.max(-6, (attacker.statBoosts.atk || 0) - 1);
              log.push(`${attacker.name}'s Attack fell due to King's Shield!`);
            }
            if (_shieldKind === 'Spiky Shield') {
              const recoil = Math.max(1, Math.floor(attacker.maxHp / 8));
              const hpBeforeShield = attacker.hp;
              attacker.hp = Math.max(0, attacker.hp - recoil);
              log.push(`${attacker.name} was hurt by Spiky Shield! [${recoil} dmg]`);
              _recordEffectEvent(field, attacker, 'Spiky Shield', 'protect-contact-damage', hpBeforeShield, attacker.hp, {
                source: 'engine protect contact rule',
                rule: { numerator: 1, denominator: 8, basis: 'max_hp', rounding: 'down' },
                damage_applied: Math.max(0, hpBeforeShield - attacker.hp)
              });
              if (attacker.hp === 0) {
                attacker.alive = false;
                log.push(`${attacker.name} fainted!`);
                _recordKO(attacker, { move: 'Spiky Shield', attacker: t, reason: 'shield' });
              }
            }
            if (_shieldKind === 'Baneful Bunker') {
              if (canInflictStatus(attacker, 'poison', field, t)) {
                attacker.status = 'poison';
                log.push(`${attacker.name} was poisoned by Baneful Bunker!`);
              }
            }
            if (_shieldKind === 'Obstruct') {
              attacker.statBoosts.def = Math.max(-6, (attacker.statBoosts.def || 0) - 2);
              log.push(`${attacker.name}'s Defense harshly fell due to Obstruct!`);
            }
            log.push(`${t.name} protected itself!`);
            continue;
          } else {
            log.push(`${t.name} protected itself!`);
            continue;
          }
        }
      }
      if (move === 'Feint' && t.protected) {
        t.protected = false;
        t.protectKind = null;
        if (t.side) t.side.quickGuard = false;
        log.push(`${attacker.name}'s Feint broke through ${t.name}'s protection!`);
      }
      const _tryHitRes = callAbilityHook(t, 'onTryHit', {
        attacker: attacker,
        defender: t,
        move: move,
        moveType: _resolvedMoveType,
        field: field,
        log: log
      });
      if (_tryHitRes && _tryHitRes.immune) {
        const healFraction = Number(_tryHitRes.healFraction) || 0;
        const healAmount = healFraction > 0 ? Math.max(1, Math.floor(t.maxHp * healFraction)) : 0;
        const healed = healAmount > 0 && _canReceiveHealing(t)
          ? Math.max(0, Math.min(t.maxHp, t.hp + healAmount) - t.hp)
          : 0;
        if (healed > 0) {
          const hpBeforeImmuneHeal = t.hp;
          t.hp += healed;
          log.push(`${t.name}'s ${t.ability} restored HP! [+${healed} HP]`);
          _recordEffectEvent(field, t, move, 'ability-immunity-heal', hpBeforeImmuneHeal, t.hp, {
            source: 'ability onTryHit immunity',
            source_actor: attacker.name || null,
            source_actor_key: _snapshotMonStableKey(attacker.side === field.playerSide ? 'player' : 'opponent', attacker),
            blocked_move: move,
            blocked_move_type: _resolvedMoveType,
            ability: t.ability || null,
            immune: true,
            heal_amount: healed,
            note: t.name + ' was immune to ' + move + ' because of ' + (t.ability || 'its ability') + ' and restored HP.'
          });
        } else {
          log.push(`${t.name} is immune to ${move} because of ${t.ability}!`);
          _recordEffectEvent(field, t, move, 'ability-immunity', t.hp, t.hp, {
            source: 'ability onTryHit immunity',
            source_actor: attacker.name || null,
            source_actor_key: _snapshotMonStableKey(attacker.side === field.playerSide ? 'player' : 'opponent', attacker),
            blocked_move: move,
            blocked_move_type: _resolvedMoveType,
            ability: t.ability || null,
            immune: true,
            note: t.name + ' was immune to ' + move + ' because of ' + (t.ability || 'its ability') + '.'
          });
        }
        continue;
      }
      // Set spread context for calcDamage
      field._ctx.isSpread = applySpreadMod;
      field._ctx.lastWasCrit = false;
      let dmg = captureBattleDamage(attacker, move, t, field, rng);
      if (move === 'Super Fang') {
        dmg = Math.max(1, Math.floor(t.hp / 2));
      }
      const _wasCrit = !!field._ctx.lastWasCrit;
      field._ctx.isSpread = false;
      field._ctx.lastWasCrit = false;
      if (_protectMult > 0 && dmg > 0) dmg = Math.max(1, Math.floor(dmg * _protectMult));
      if (dmg > 0) {
        if (_wasCrit) log.push(`A critical hit!`);
        applyDamage(attacker, move, t, dmg, field, log, rng);
        resolution.didDamage = true;
        const _suppressSecondary = attacker.ability === 'Sheer Force' && SHEER_FORCE_MOVES.has(move);
        if (!_suppressSecondary && move === 'Psychic Noise' && t.alive) {
          t.healBlockedTurns = Math.max(t.healBlockedTurns || 0, 2);
          log.push(`${t.name} can no longer recover HP because of Psychic Noise!`);
        }
        if (!_suppressSecondary && !_hadSubstitute) {
          _applyDamagingMoveSecondary(attacker, move, t, field, log, rng);
        }
        // T9j.8 (Refs #19) Flinch roll: after damage applied, target alive,
        // target hasn't acted yet. Fang moves roll flinch + status independently.
        if (t.alive) {
          const _flinch = FLINCH_MOVES[move];
          if (!_suppressSecondary && _flinch && !t.hasActed && rng() < _flinch.chance) {
            t._flinched = true;
            t._flinchSource = {
              actor: attacker.name || null,
              actor_key: _snapshotMonStableKey(attacker.side === field.playerSide ? 'player' : 'opponent', attacker),
              move: move
            };
            _recordEffectEvent(field, t, move, 'flinch-applied', t.hp, t.hp, {
              source: 'pokemon-showdown move metadata + engine rule',
              source_actor: attacker.name || null,
              source_actor_key: _snapshotMonStableKey(attacker.side === field.playerSide ? 'player' : 'opponent', attacker),
              volatile_status: 'flinch',
              action_denial: true,
              skipped_move: false,
              note: 'Flinch was applied. It only skips the target action if the target is still alive and has not moved when its action resolves.'
            });
            log.push(`${t.name} flinched!`);
          }
        }
      } else {
        const typeImmune = typeof getEffectiveness === 'function'
          && Array.isArray(t.types)
          && getEffectiveness(_resolvedMoveType, t.types) === 0;
        if (typeImmune) {
          _recordEffectEvent(field, t, move, 'type-immunity', t.hp, t.hp, {
            source: 'type chart immunity',
            source_actor: attacker.name || null,
            source_actor_key: _snapshotMonStableKey(attacker.side === field.playerSide ? 'player' : 'opponent', attacker),
            blocked_move: move,
            blocked_move_type: _resolvedMoveType,
            defender_types: Array.isArray(t.types) ? t.types.slice() : [],
            immune: true,
            note: t.name + ' was immune to ' + move + ' because ' + _resolvedMoveType + ' does not affect ' + (Array.isArray(t.types) ? t.types.join('/') : 'that typing') + '.'
          });
        }
        log.push(`${move} had no effect on ${t.name}!`);
      }
      if (!attacker.alive) break;
    }
    if (resolution.didDamage && attacker.alive) {
      const selfDrops = {
        'Draco Meteor': { spa: -2 },
        'Overheat': { spa: -2 },
        'Leaf Storm': { spa: -2 },
        'Close Combat': { def: -1, spd: -1 },
        'Headlong Rush': { def: -1, spd: -1 },
        'Clanging Scales': { def: -1 }
      };
      if (selfDrops[move]) _applyStageMap(attacker, selfDrops[move], log);
    }
    field._ctx.preDamageSpaBoostMon = _prevPreDamageBoostMon;
    field._ctx.preDamageSpaBoostMove = _prevPreDamageBoostMove;
    // Restore the prior bpMult so we don't leak the 1.5x onto a Parental Bond
    // second strike or any subsequent move.
    if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
    return resolution;
  }

  function applyDamage(attacker, move, target, dmg, field, log, rng) {
    if (dmg <= 0) return;
    const calculatedDamage = Math.max(0, Number(dmg) || 0);
    let finalDmg = calculatedDamage;
    const drainRule = _moveDrainRule(move);
    const recoilRuleForEvidence = _moveRecoilRule(move);
    const moveContext = _moveContextText(move);
    let damageRow = null;
    // Substitute absorb
    if (target.substituteHp > 0 && !(attacker && attacker.ability === 'Infiltrator')) {
      const substituteHpBefore = target.substituteHp;
      const substituteDamage = Math.max(0, Math.min(substituteHpBefore, finalDmg));
      target.substituteHp -= finalDmg;
      if (target.substituteHp <= 0) { target.substituteHp = 0; log.push(`${target.name}'s Substitute was destroyed!`); }
      else log.push(`${attacker.name} used ${move}! (Substitute absorbed ${substituteDamage} dmg${calculatedDamage !== substituteDamage ? `; calc ${calculatedDamage}` : ''})`);
      if (drainRule && attacker && attacker.alive) {
        if (_canReceiveHealing(attacker)) {
          const hpBeforeHeal = attacker.hp;
          const drainHeal = _ratioAmount(substituteDamage, drainRule);
          const healed = Math.max(0, Math.min(attacker.maxHp, attacker.hp + drainHeal) - attacker.hp);
          attacker.hp += healed;
          if (healed > 0) log.push(`${attacker.name} restored HP with ${move}! [${healed} HP]`);
          _recordEffectEvent(field, attacker, move, 'drain-heal', hpBeforeHeal, attacker.hp, {
            rule: _ratioRuleObject(drainRule, 'substitute_damage', 'half_up'),
            source_damage: substituteDamage,
            heal_candidate: drainHeal,
            heal_applied: healed,
            move_context: moveContext
          });
        }
      }
      return;
    }
    // T9j.6 (#8) — Focus Sash: snapshot full-HP state BEFORE damage mutation.
    // Cite: Bulbapedia Focus Sash.
    const wasFullHp = (target.hp === target.maxHp);
    const hpBeforeDamage = target.hp;
    const wasAboveHalf = target.hp > target.maxHp / 2;
    let enduredHit = false;
    if (target.enduring && finalDmg >= target.hp) {
      target.hp = 1;
      enduredHit = true;
    } else {
      target.hp = Math.max(0, target.hp - finalDmg);
    }
    // T9j.6 (#8) — Focus Sash survives a KO from full HP; consumed.
    let sturdySaved = false;
    if (!enduredHit && target.hp === 0 && _targetAbilityActive(target, attacker, 'Sturdy') && wasFullHp) {
      target.hp = 1;
      sturdySaved = true;
    }
    let sashSaved = false;
    if (!enduredHit && !sturdySaved && target.hp === 0 && target.item === 'Focus Sash' && !target.itemConsumed && wasFullHp) {
      target.hp = 1;
      target.itemConsumed = true;
      sashSaved = true;
    }
    const appliedDamage = Math.max(0, Number(hpBeforeDamage || 0) - Number(target.hp || 0));
    const overkillDamage = Math.max(0, calculatedDamage - appliedDamage);
    const damageDetail = calculatedDamage !== appliedDamage ? `; calc ${calculatedDamage}` : '';
    log.push(`${attacker.name} used ${move}! → ${target.name} [${appliedDamage} dmg, ${target.hp}/${target.maxHp} HP${damageDetail}]`);
    if (field && field._ctx) {
      if (!Array.isArray(field._ctx.turnDamageEvents)) field._ctx.turnDamageEvents = [];
      const attackerSide = attacker && attacker.side === field.playerSide ? 'player' : (attacker && attacker.side === field.oppSide ? 'opponent' : 'unknown');
      const targetSide = target && target.side === field.playerSide ? 'player' : (target && target.side === field.oppSide ? 'opponent' : 'unknown');
      const attackerKey = _snapshotMonStableKey(attackerSide, attacker);
      const targetKey = _snapshotMonStableKey(targetSide, target);
      const calc = field._ctx.lastDamageCalc;
      const calcMatches = calc &&
        calc.attacker_key === attackerKey &&
        calc.target_key === targetKey &&
        calc.move === move;
      const resolvedMoveType = calcMatches && calc && calc.move_type
        ? calc.move_type
        : _resolveDynamicMoveType(attacker, move, field);
      const row = Object.assign({
        attacker: attacker ? attacker.name : 'Unknown',
        attacker_key: attackerKey,
        target: target ? target.name : 'Unknown',
        target_key: targetKey,
        move: move,
        damage_kind: calcMatches ? 'calculated' : 'fixed_or_direct',
        damage: Number(appliedDamage || 0),
        applied_damage: Number(appliedDamage || 0),
        hp_delta: Number(appliedDamage || 0),
        calculated_damage: Number(calculatedDamage || 0),
        overkill_damage: Number(overkillDamage || 0),
        damage_capped_by_hp: calculatedDamage !== appliedDamage,
        target_hp_before: Number(hpBeforeDamage || 0),
        target_hp_after: Number(target.hp || 0),
        target_max_hp: Number(target.maxHp || 0),
        target_survived: target.hp > 0,
        move_context: moveContext,
        effect_tags: []
      }, calcMatches ? calc : {
        move_type: resolvedMoveType,
        category: _moveCategory(move) || 'fixed',
        type_effectiveness: null,
        critical: false
      });
      row.damage = Number(appliedDamage || 0);
      row.applied_damage = Number(appliedDamage || 0);
      row.hp_delta = Number(appliedDamage || 0);
      row.calculated_damage = Number(calculatedDamage || 0);
      row.overkill_damage = Number(overkillDamage || 0);
      row.damage_capped_by_hp = calculatedDamage !== appliedDamage;
      row.target_hp_before = Number(hpBeforeDamage || 0);
      row.target_hp_after = Number(target.hp || 0);
      row.target_max_hp = Number(target.maxHp || 0);
      row.target_survived = target.hp > 0;
      if (drainRule) {
        row.effect_tags.push('drain');
        row.drain_rule = _ratioRuleObject(drainRule, 'applied_damage', 'half_up');
      }
      if (recoilRuleForEvidence) {
        row.effect_tags.push('recoil');
        row.recoil_rule = _ratioRuleObject(recoilRuleForEvidence, 'applied_damage', 'half_up');
      }
      if (calculatedDamage !== appliedDamage) row.effect_tags.push('hp-cap');
      field._ctx.turnDamageEvents.push(row);
      damageRow = row;
      field._ctx.lastDamageCalc = null;
    }
    if (enduredHit) log.push(`${target.name} endured the hit!`);
    if (sturdySaved) log.push(`${target.name} hung on with Sturdy!`);
    if (sashSaved) log.push(`${target.name} hung on with its Focus Sash!`);
    if (appliedDamage > 0) applySeedSowerOnHit(target, field, log);
    if (target.hp > 0 && target.ability === 'Berserk' && wasAboveHalf && target.hp <= target.maxHp / 2) {
      _applyStageMap(target, { spa: 1 }, log);
    }
    if (drainRule && attacker && attacker.alive) {
      if (_canReceiveHealing(attacker)) {
        const hpBeforeHeal = attacker.hp;
        const drainHeal = _ratioAmount(appliedDamage, drainRule);
        const healed = Math.max(0, Math.min(attacker.maxHp, attacker.hp + drainHeal) - attacker.hp);
        attacker.hp += healed;
        if (healed > 0) log.push(`${attacker.name} restored HP with ${move}! [${healed} HP]`);
        if (damageRow) {
          damageRow.drain_heal_candidate = Number(drainHeal || 0);
          damageRow.drain_heal_applied = Number(healed || 0);
          damageRow.drain_hp_before = Number(hpBeforeHeal || 0);
          damageRow.drain_hp_after = Number(attacker.hp || 0);
        }
        _recordEffectEvent(field, attacker, move, 'drain-heal', hpBeforeHeal, attacker.hp, {
          rule: _ratioRuleObject(drainRule, 'applied_damage', 'half_up'),
          source_damage: appliedDamage,
          heal_candidate: drainHeal,
          heal_applied: healed,
          damage_event_index: field && field._ctx && Array.isArray(field._ctx.turnDamageEvents)
            ? field._ctx.turnDamageEvents.length - 1
            : null,
          move_context: moveContext
        });
      }
    }
    // T9j.4 (#41) — Fire-move thaw on hit. Any damaging Fire move thaws target.
    // Cite: Bulbapedia Freeze.
    const postHitMoveType = field && field._ctx && field._ctx.turnDamageEvents && field._ctx.turnDamageEvents.length
      ? field._ctx.turnDamageEvents[field._ctx.turnDamageEvents.length - 1].move_type
      : _resolveDynamicMoveType(attacker, move, field);
    if (target.status === 'frozen' && appliedDamage > 0 && target.hp > 0 &&
        postHitMoveType === 'Fire') {
      target.status = null;
      target.frozenTurns = 0;
      log.push(`${target.name} was thawed out by ${attacker.name}'s ${move}!`);
    }
    const suppressSecondary = attacker && attacker.ability === 'Sheer Force' && SHEER_FORCE_MOVES.has(move);
    if (move === 'Matcha Gotcha' && target.alive && target.hp > 0) {
      if (!suppressSecondary && !target.status && canInflictStatus(target, 'burn', field, attacker) && rng() < 0.2) {
        target.status = 'burn';
        log.push(`${target.name} was burned by ${attacker.name}'s Matcha Gotcha!`);
      }
    }
    if (move === 'Sparkling Aria' && target.status === 'burn' && target.alive && target.hp > 0) {
      target.status = null;
      log.push(`${target.name}'s burn was healed by ${attacker.name}'s Sparkling Aria!`);
    }
    if (!suppressSecondary && move === 'Dire Claw' && target.alive && target.hp > 0 && !target.status) {
      if (rng() < 0.5) {
        const options = ['poison', 'paralysis', 'sleep'].filter((status) => canInflictStatus(target, status, field, attacker));
        if (options.length) {
          const status = options[Math.floor(rng() * options.length)];
          target.status = status;
          if (status === 'sleep') {
            target.statusTurns = 2 + Math.floor(rng() * 2);
            target.sleepTurns = 0;
          } else if (status === 'poison') {
            target.toxicCounter = 0;
          }
          log.push(`${target.name} was ${status === 'paralysis' ? 'paralysed' : status === 'sleep' ? 'put to sleep' : 'poisoned'} by ${attacker.name}'s Dire Claw!`);
        }
      }
    }
    callAbilityHook(target, 'onDamagingHit', {
      attacker: attacker, defender: target, move: move,
      moveType: postHitMoveType,
      damage: appliedDamage, field: field, log: log,
      recordKO: _recordKO
    });
    if (attacker && attacker.alive && attacker.ability === 'Poison Touch' &&
        _isContactMove(move) && target.alive && target.hp > 0 && canInflictStatus(target, 'poison', field, attacker) &&
        rng() < 0.30) {
      target.status = 'poison';
      log.push(`${target.name} was poisoned by ${attacker.name}'s Poison Touch!`);
    }
    // Recoil
    const recoilRule = _moveRecoilRule(move);
    if (recoilRule && attacker && attacker.alive) {
      const hpBeforeRecoil = attacker.hp;
      const recoil = _ratioAmount(appliedDamage, recoilRule);
      attacker.hp = Math.max(0, attacker.hp - recoil);
      const appliedRecoil = Math.max(0, hpBeforeRecoil - attacker.hp);
      log.push(`${attacker.name} was hurt by recoil! [${appliedRecoil} dmg${recoil !== appliedRecoil ? ', calc ' + recoil : ''}]`);
      if (damageRow) {
        damageRow.recoil_damage = Number(recoil || 0);
        damageRow.recoil_hp_before = Number(hpBeforeRecoil || 0);
        damageRow.recoil_hp_after = Number(attacker.hp || 0);
      }
      _recordEffectEvent(field, attacker, move, 'recoil', hpBeforeRecoil, attacker.hp, {
        rule: _ratioRuleObject(recoilRule, 'applied_damage', 'half_up'),
        source_damage: appliedDamage,
        calculated_effect_damage: recoil,
        damage_applied_to_user: appliedRecoil,
        damage_event_index: field && field._ctx && Array.isArray(field._ctx.turnDamageEvents)
          ? field._ctx.turnDamageEvents.length - 1
          : null,
        move_context: moveContext
      });
      if (attacker.hp === 0) {
        attacker.alive = false;
        log.push(`${attacker.name} fainted!`);
        _recordKO(attacker, { move: move, attacker: attacker, reason: 'recoil' });
      }
    }
    // T9j.6 (#11 WONTFIX) — Life Orb recoil removed; item absent from Champions.
    // Berry check after damage
    const berryMsg = target.applyItem('damage', field);
    if (berryMsg) log.push(berryMsg);
    if (move === 'Knock Off') _applyKnockOffItemRemoval(target, log);
    // Multiscale: deactivate after first hit
    target.multiscaleActive = false;
    if (target.hp === 0) {
      target.alive = false;
      log.push(`${target.name} fainted!`);
      _recordKO(target, { move: move, attacker: attacker, reason: 'attack' });
      if (target.ability === 'Innards Out' && attacker && attacker.alive && attacker !== target && hpBeforeDamage > 0) {
        const reflected = Math.min(attacker.hp, Math.max(1, hpBeforeDamage));
        attacker.hp = Math.max(0, attacker.hp - reflected);
        log.push(`${attacker.name} was hurt by ${target.name}'s Innards Out! [${reflected} dmg]`);
        if (attacker.hp === 0) {
          attacker.alive = false;
          log.push(`${attacker.name} fainted!`);
          _recordKO(attacker, { move: 'Innards Out', attacker: target, reason: 'ability' });
        }
      }
    }
    // T9j.8 (Refs #30) onDamageTaken hook: Spicy Spray burns attacker.
    // Fires only if target still alive AND damage > 0.
    if (target.alive && appliedDamage > 0) {
      callAbilityHook(target, 'onDamageTaken', {
        attacker: attacker, defender: target, move: move,
        moveType: postHitMoveType,
        damage: appliedDamage, field: field, log: log
      });
    }
  }

  // ============================================================
  // MAIN BATTLE LOOP
  // ============================================================
  let turn = 0;
  // Phase 4a (Refs #52) — structured KO event log for dynamic coaching.
  // Populated at every faint site below. UI reads this instead of parsing
  // log strings (fragile). Shape:
  //   { turn, victim, side: 'player'|'opp', byMove, byAttacker, reason }
  // reason: 'attack' | 'recoil' | 'sandstorm' | 'burn' | 'frostbite'
  //       | 'poison' | 'toxic'
  const koEvents = [];
  // Phase 4b (Refs #52) — per-mon move-call histogram + max-consecutive-Protect
  // streak. Used by UI to detect dead moves and Protect misuse.
  //   movesUsed[mon.name][side] = { moveName: callCount, ... }
  //   protectStreakMax[mon.name+side] = peak consecutive turns this mon chose
  //     a Protect family move. Reset on any non-Protect action.
  const movesUsed = { player: {}, opp: {} };
  const _protectFamily = new Set(['Protect','Detect','Wide Guard','Quick Guard']);
  const _protectStreak = {};     // running count keyed by side:name
  const _protectStreakMax = {};  // observed peak keyed by side:name
  const turnLog = [];
  const _recordAction = function(action) {
    try {
      if (!action || !action.attacker || !action.move) return;
      const side = action.side;
      const name = action.attacker.name;
      if (!movesUsed[side][name]) movesUsed[side][name] = {};
      movesUsed[side][name][action.move] = (movesUsed[side][name][action.move] || 0) + 1;
      const key = side + ':' + name;
      if (_protectFamily.has(action.move)) {
        _protectStreak[key] = (_protectStreak[key] || 0) + 1;
        if (_protectStreak[key] > (_protectStreakMax[key] || 0)) {
          _protectStreakMax[key] = _protectStreak[key];
        }
      } else {
        _protectStreak[key] = 0;
      }
    } catch (_e) { /* never kill sim for telemetry */ }
  };
  const _recordKO = function(mon, cause) {
    try {
      const side = (playerPokemon.indexOf(mon) >= 0) ? 'player' : 'opp';
      koEvents.push({
        turn: turn,
        victim: mon.name,
        side: side,
        byMove: (cause && cause.move) || null,
        byAttacker: (cause && cause.attacker) ? cause.attacker.name : null,
        reason: (cause && cause.reason) || 'unknown'
      });
    } catch (_e) { /* never let logging kill the sim */ }
  };
  // T9j.3 (#39): raised from 25 → 30 so timer-draw (28-turn budget at 15s/turn)
  // can actually resolve before the hard cap. Stall mirrors will now reach timer.
  const MAX_TURNS = (opts && Number.isFinite(opts.maxTurns) && opts.maxTurns > 0)
    ? Math.floor(opts.maxTurns)
    : 30;

  function _clearStoredCharge(mon) {
    if (!mon) return;
    mon.chargingMove = null;
    mon.chargingTarget = null;
    mon.chargingTargetSide = null;
    mon.chargingTargetSlot = null;
    mon.concealedByMove = null;
  }

  // Source-truth notes:
  // - Phantom Force: sleep on the release turn ends the semi-invulnerable turn
  //   without executing the move. We treat any pre-action skip the same way so
  //   concealment cannot linger indefinitely.
  // - Solar Beam / Solar Blade: interruption by flinch/paralysis cancels the
  //   queued attack rather than pausing it.
  function _shouldCancelStoredCharge(mon, move, reason) {
    if (!mon || mon.chargingMove !== move) return false;
    if (move === 'Phantom Force') return true;
    if ((move === 'Solar Beam' || move === 'Solar Blade') &&
        (reason === 'flinch' || reason === 'paralysis')) {
      return true;
    }
    return false;
  }

  function _cancelInterruptedCharge(mon, move, reason) {
    if (!_shouldCancelStoredCharge(mon, move, reason)) return false;
    _clearStoredCharge(mon);
    return true;
  }

  function _forcedActionFor(side, mon, allies, enemies) {
    const forced = Array.isArray(opts && opts.forcedActions) ? opts.forcedActions : [];
    if (!forced.length || !mon) return null;
    const sideAliases = side === 'opp' ? ['opp', 'opponent'] : [side];
    const activeSlot = allies.indexOf(mon);
    const entry = forced.find(function(row) {
      if (!row || typeof row !== 'object') return false;
      if (Number.isFinite(Number(row.turn)) && Number(row.turn) !== turn) return false;
      if (row.side && sideAliases.indexOf(String(row.side)) < 0) return false;
      if (Number.isFinite(Number(row.slot)) && Number(row.slot) !== activeSlot) return false;
      if (row.pokemon && row.pokemon !== mon.name) return false;
      return !!row.move;
    });
    if (!entry || mon.moves.indexOf(entry.move) < 0) return null;

    function byName(list, name) {
      return list.find(function(candidate) { return candidate && candidate.alive && candidate.name === name; }) || null;
    }

    const targetSide = String(entry.targetSide || entry.target_side || '').toLowerCase();
    let target = null;
    if (entry.target === 'self' || targetSide === 'self') {
      target = mon;
    } else if (entry.targetPokemon || entry.target_pokemon) {
      target = byName(enemies, entry.targetPokemon || entry.target_pokemon) ||
        byName(allies, entry.targetPokemon || entry.target_pokemon);
    } else if (Number.isFinite(Number(entry.targetSlot)) || Number.isFinite(Number(entry.target_slot))) {
      const slot = Number.isFinite(Number(entry.targetSlot)) ? Number(entry.targetSlot) : Number(entry.target_slot);
      if (targetSide === 'ally' || targetSide === 'allies') target = allies[slot] || null;
      else target = enemies[slot] || null;
    } else if (targetSide === 'ally' || targetSide === 'allies') {
      target = allies.find(function(candidate) { return candidate && candidate !== mon && candidate.alive; }) || mon;
    } else {
      target = enemies.find(function(candidate) { return candidate && candidate.alive; }) || null;
    }

    return { move: entry.move, target: target };
  }

  while (turn < MAX_TURNS) {
    turn++;
    log.push(`--- Turn ${turn} ---`);
    const _turnLogStart = log.length;
    field._ctx.turnDamageEvents = [];
    field._ctx.turnEffectEvents = [];
    field._ctx.lastDamageCalc = null;

    // Clear per-turn flags
    for (const m of [...playerActive, ...oppActive]) {
      m.hasActed = false;
      m.protected = false;
      m.protectKind = null;
      m.enduring = false;
      m.helpingHand = false;
      m._chosenMove = null;
      m.turnsSinceEntry = (m.turnsSinceEntry || 0) + 1;
      // T9j.8 (Refs #19) Flinch flag resets at top of turn so last-turn flinch
      // cannot bleed into this turn's action.
      m._flinched = false;
      m._flinchSource = null;
    }

    // Check win condition
    const pAlive = playerActive.filter(m => m.alive).length + playerBench.filter(m => m.alive).length;
    const oAlive = oppActive.filter(m => m.alive).length + oppBench.filter(m => m.alive).length;
    if (pAlive === 0 || oAlive === 0) break;

    // --------------------------------------------------------
    // T9j.7 — MEGA EVOLUTION PHASE
    // Champions rule: one Mega per team per match, persists through switch
    // and even after faint. Triggers at start of turn, after switches, before
    // moves. Simultaneous Megas resolve by speed with RNG tiebreak (documented
    // Champions behavior is 'random' per Game8 Known Bugs; speed+RNG is a
    // deterministic spec choice for sim reproducibility).
    // Source: https://game8.co/games/Pokemon-Champions/archives/592472
    //         https://bulbapedia.bulbagarden.net/wiki/Priority
    // --------------------------------------------------------
    function tryMegaPhase(activeArr, sideFlagKey) {
      if (field[sideFlagKey]) return;
      const candidates = activeArr.filter(m => shouldMegaThisTurn(m, turn));
      if (candidates.length === 0) return;
      candidates.sort((a, b) => _comparePokemonSpeedOrder(a, b, field, rng));
      // One per team: only the first (fastest / coin-flip) evolves.
      candidates[0].megaEvolve(log, field);
      field[sideFlagKey] = true;
    }
    tryMegaPhase(playerActive, 'playerMegaUsed');
    tryMegaPhase(oppActive,    'oppMegaUsed');

    // --------------------------------------------------------
    // BUILD ACTION QUEUE
    // --------------------------------------------------------
    const actions = [];

    for (const mon of playerActive.filter(m => m.alive)) {
      const { move, target } = _forcedActionFor('player', mon, playerActive, oppActive) ||
        selectMove(mon, playerActive, oppActive, field);
      const _act = {
        attacker: mon,
        move,
        target,
        targetIndex: (target && oppActive.indexOf(target) >= 0) ? oppActive.indexOf(target) : null,
        side: 'player',
        priority: getPriority(move, mon)
      };
      mon._chosenMove = move;
      _recordAction(_act);
      actions.push(_act);
    }
    for (const mon of oppActive.filter(m => m.alive)) {
      const { move, target } = _forcedActionFor('opp', mon, oppActive, playerActive) ||
        selectMove(mon, oppActive, playerActive, field);
      const _act = {
        attacker: mon,
        move,
        target,
        targetIndex: (target && playerActive.indexOf(target) >= 0) ? playerActive.indexOf(target) : null,
        side: 'opp',
        priority: getPriority(move, mon)
      };
      mon._chosenMove = move;
      _recordAction(_act);
      actions.push(_act);
    }

    const _turnEntry = {
      turn: turn,
      playerHP: playerPokemon.map(m => Math.round(_hpPct(m) * 1000) / 1000),
      oppHP: oppPokemon.map(m => Math.round(_hpPct(m) * 1000) / 1000),
      activePair: playerActive.concat(oppActive).filter(Boolean).map(m => m.name),
      action: actions.map(a => (a.attacker ? a.attacker.name : '?') + ':' + (a.move || '?')).join(' | '),
      positionScore: 0,
      pre: _makeTurnSnapshot(playerActive, playerBench, oppActive, oppBench, field, true, _orderedPlayer, _orderedOpp),
      actions: _actionSummary(actions),
      events: [],
      damage_events: [],
      effect_events: [],
      post: null,
      delta: { position_score: 0, win_probability: null, primary_cause: 'none', explanation: '' }
    };
    _turnEntry.positionScore = _turnEntry.pre.position_score;

    // Sort by priority → then speed (Trick Room inverts)
    actions.sort((a, b) => _compareTurnActionOrder(a, b, field, rng));

    // Execute actions
    for (const action of actions) {
      if (!action.attacker.alive) continue;
      // T9j.4 (#41) — Freeze resolution per Champions rules:
      //   25% thaw per move attempt, guaranteed thaw on turn 3 (3-turn cap).
      // Cite: Bulbapedia Freeze — Pokemon Champions section.
      if (action.attacker.status === 'frozen') {
        action.attacker.frozenTurns = (action.attacker.frozenTurns || 0) + 1;
        if (action.attacker.frozenTurns >= 3 || rng() < 0.25) {
          const frozenTurnsBeforeThaw = action.attacker.frozenTurns || 0;
          action.attacker.status = null;
          action.attacker.frozenTurns = 0;
          log.push(`${action.attacker.name} thawed out!`);
          _recordEffectEvent(field, action.attacker, action.move || 'Freeze', 'frozen-thaw', action.attacker.hp, action.attacker.hp, {
            source: 'engine status resolution gate',
            reason_id: 'frozen_thaw',
            status_resolution: true,
            resolved_status: 'frozen',
            thawed_this_turn: true,
            frozen_turns: frozenTurnsBeforeThaw,
            action_denial: false,
            skipped_move: false,
            note: 'The Pokemon thawed before action execution, so freeze did not deny this move.'
          });
          // falls through to act this turn
        } else {
          _cancelInterruptedCharge(action.attacker, action.move, 'frozen');
          log.push(`${action.attacker.name} is frozen solid!`);
          _recordActionDenialEvent(field, action.attacker, action.move, 'frozen-skip', 'frozen', {
            note: 'The Pokemon lost its action because it was frozen solid.'
          });
          continue;
        }
      }
      // T9j.5 (#17) — Sleep: turn 1 always skip; turn 2 33% early wake;
      // turn 3 guaranteed wake (3-turn cap). Cite: games.gg Champions nerfs.
      if (action.attacker.status === 'sleep') {
        action.attacker.sleepTurns = (action.attacker.sleepTurns || 0) + 1;
        action.attacker.statusTurns--;
        if (action.attacker.sleepTurns >= 3 || action.attacker.statusTurns <= 0) {
          const sleepTurnsBeforeWake = action.attacker.sleepTurns || 0;
          action.attacker.status = null;
          action.attacker.sleepTurns = 0;
          action.attacker.statusTurns = 0;
          log.push(`${action.attacker.name} woke up!`);
          _recordEffectEvent(field, action.attacker, action.move || 'Sleep', 'sleep-wake', action.attacker.hp, action.attacker.hp, {
            source: 'engine status resolution gate',
            reason_id: 'sleep_wake',
            status_resolution: true,
            resolved_status: 'sleep',
            woke_this_turn: true,
            early_wake: false,
            sleep_turns: sleepTurnsBeforeWake,
            action_denial: false,
            skipped_move: false,
            note: 'The Pokemon woke before action execution, so sleep did not deny this move.'
          });
        } else if (action.attacker.sleepTurns === 2 && rng() < 0.333) {
          const sleepTurnsBeforeWake = action.attacker.sleepTurns || 0;
          action.attacker.status = null;
          action.attacker.sleepTurns = 0;
          action.attacker.statusTurns = 0;
          log.push(`${action.attacker.name} woke up early!`);
          _recordEffectEvent(field, action.attacker, action.move || 'Sleep', 'sleep-wake', action.attacker.hp, action.attacker.hp, {
            source: 'engine status resolution gate',
            reason_id: 'sleep_wake_early',
            status_resolution: true,
            resolved_status: 'sleep',
            woke_this_turn: true,
            early_wake: true,
            sleep_turns: sleepTurnsBeforeWake,
            action_denial: false,
            skipped_move: false,
            note: 'The Pokemon woke early before action execution, so sleep did not deny this move.'
          });
        } else if (action.move === 'Sleep Talk') {
          // Sleep Talk is allowed to execute while the user remains asleep.
          _recordEffectEvent(field, action.attacker, action.move || 'Sleep Talk', 'sleep-exception', action.attacker.hp, action.attacker.hp, {
            source: 'engine status resolution gate',
            reason_id: 'sleep_talk_exception',
            status_exception: true,
            sleep_exception: true,
            resolved_status: 'sleep',
            sleep_turns: action.attacker.sleepTurns || 0,
            status_turns_remaining: action.attacker.statusTurns || 0,
            action_denial: false,
            skipped_move: false,
            note: 'Sleep Talk is allowed while the user remains asleep, so sleep did not deny this selected move.'
          });
        } else {
          _cancelInterruptedCharge(action.attacker, action.move, 'sleep');
          log.push(`${action.attacker.name} is fast asleep!`);
          _recordActionDenialEvent(field, action.attacker, action.move, 'sleep-skip', 'sleep', {
            sleep_turns: action.attacker.sleepTurns || 0,
            status_turns_remaining: action.attacker.statusTurns || 0,
            note: 'The Pokemon lost its action because it remained asleep.'
          });
          continue;
        }
      }
      // T9j.5 (#17) — Paralysis full-skip nerfed from 25% to 12.5% in Champions.
      // Cite: Serebii Champions Status; games.gg. Spec §1.2.
      if (action.attacker.status === 'paralysis' && rng() < 0.125) {
        _cancelInterruptedCharge(action.attacker, action.move, 'paralysis');
        log.push(`${action.attacker.name} is fully paralysed and can't move!`);
        _recordActionDenialEvent(field, action.attacker, action.move, 'paralysis-skip', 'paralysis', {
          note: 'The Pokemon lost its action because paralysis triggered a full-skip.'
        });
        continue;
      } else if (action.attacker.status === 'paralysis') {
        _recordEffectEvent(field, action.attacker, action.move || 'Paralysis', 'paralysis-speed-only', action.attacker.hp, action.attacker.hp, {
          source: 'engine status resolution gate',
          reason_id: 'paralysis_speed_only',
          status_resolution: true,
          resolved_status: 'paralysis',
          speed_only_status_effect: true,
          action_denial: false,
          skipped_move: false,
          note: 'Paralysis affected Speed but did not deny this action.'
        });
      }
      // T9j.8 (Refs #19) Flinch consumption: _flinched was set in a prior
      // action's applyDamage hook this turn. Pre-act gate eats the flag and
      // skips the action. Cleared on use; clearing of stale values happens in
      // the per-turn reset loop (m._flinched = false).
      if (action.attacker._flinched) {
        const _flinchSource = action.attacker._flinchSource || {};
        _cancelInterruptedCharge(action.attacker, action.move, 'flinch');
        log.push(`${action.attacker.name} flinched and couldn't move!`);
        _recordEffectEvent(field, action.attacker, _flinchSource.move || action.move || 'Flinch', 'flinch-skip', action.attacker.hp, action.attacker.hp, {
          source: 'volatile flinch state',
          reason_id: 'flinch',
          action_denial_reason: 'flinch',
          source_actor: _flinchSource.actor || null,
          source_actor_key: _flinchSource.actor_key || null,
          volatile_status: 'flinch',
          action_denial: true,
          skipped_move: true,
          skipped_action_move: action.move || null,
          note: 'The Pokemon lost its action this turn because it flinched.'
        });
        action.attacker._flinched = false;
        action.attacker._flinchSource = null;
        action.attacker.hasActed = true;
        continue;
      }
      if (action.attacker.confusionTurns > 0) {
        log.push(`${action.attacker.name} is confused!`);
        if (rng() < (1 / 3)) {
          _cancelInterruptedCharge(action.attacker, action.move, 'confusion');
          const confusionDmg = _confusionSelfHitDamage(action.attacker, field, rng);
          const hpBeforeConfusion = action.attacker.hp;
          action.attacker.hp = Math.max(0, action.attacker.hp - confusionDmg);
          log.push(`${action.attacker.name} hurt itself in its confusion! [${confusionDmg} dmg]`);
          _recordEffectEvent(field, action.attacker, 'Confusion', 'confusion-self-hit', hpBeforeConfusion, action.attacker.hp, {
            source: 'volatile confusion state',
            reason_id: 'confusion',
            action_denial_reason: 'confusion',
            action_denial: true,
            skipped_move: true,
            skipped_action_move: action.move || null,
            volatile_status: 'confusion',
            damage_applied: confusionDmg,
            calculated_effect_damage: confusionDmg,
            note: 'The Pokemon lost its selected action and damaged itself because confusion triggered.'
          });
          if (action.attacker.hp === 0) {
            action.attacker.alive = false;
            log.push(`${action.attacker.name} fainted!`);
            _recordKO(action.attacker, { move: 'confusion', attacker: action.attacker, reason: 'confusion' });
          }
          action.attacker.hasActed = true;
          continue;
        } else {
          _recordEffectEvent(field, action.attacker, action.move || 'Confusion', 'confusion-pass-through', action.attacker.hp, action.attacker.hp, {
            source: 'volatile confusion state',
            reason_id: 'confusion_pass_through',
            status_resolution: true,
            volatile_status: 'confusion',
            confusion_passed: true,
            confusion_turns_remaining: action.attacker.confusionTurns || 0,
            action_denial: false,
            skipped_move: false,
            note: 'The Pokemon was confused but did not hurt itself, so its selected action continued.'
          });
        }
      }
      const _allies = action.side === 'player' ? playerActive : oppActive;
      const _enemies = action.side === 'player' ? oppActive : playerActive;
      const _resolvedTarget = (typeof action.targetIndex === 'number' && action.targetIndex >= 0)
        ? (_enemies[action.targetIndex] || action.target)
        : action.target;
      executeAction(action.attacker, action.move, _resolvedTarget,
        _allies, _enemies, field, log, rng);
      // T9j.8 (Refs #19) Mark as acted so later-in-queue flinch rolls against
      // this mon have no effect (can't flinch a mon that already moved).
      action.attacker.hasActed = true;
    }

    // Sand damage
    if (_effectiveFieldWeather(field) === 'sand') {
      for (const mon of [...playerActive, ...oppActive].filter(m => m.alive)) {
        if (!['Rock','Steel','Ground'].includes(mon.types[0]) &&
            !['Rock','Steel','Ground'].includes(mon.types[1] || '')) {
          const sandDmg = Math.floor(mon.maxHp / 16);
          const hpBeforeSand = mon.hp;
          mon.hp = Math.max(0, mon.hp - sandDmg);
          log.push(`${mon.name} is buffeted by the sandstorm! [${sandDmg} dmg]`);
          _recordEffectEvent(field, mon, 'Sandstorm', 'weather-damage', hpBeforeSand, mon.hp, {
            source: 'engine weather rule',
            rule: { numerator: 1, denominator: 16, basis: 'max_hp', rounding: 'down' },
            damage_applied: Math.max(0, hpBeforeSand - mon.hp)
          });
          if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'sandstorm' }); }
        }
      }
    }

    // Solar Power recoil
    if (_effectiveFieldWeather(field) === 'sun') {
      for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.ability === 'Solar Power')) {
        const solarPowerDmg = Math.floor(mon.maxHp / 8);
        const hpBeforeSolar = mon.hp;
        mon.hp = Math.max(0, mon.hp - solarPowerDmg);
        log.push(`${mon.name} is hurt by its Solar Power! [${solarPowerDmg} dmg]`);
        _recordEffectEvent(field, mon, 'Solar Power', 'ability-recoil', hpBeforeSolar, mon.hp, {
          source: 'engine ability rule',
          rule: { numerator: 1, denominator: 8, basis: 'max_hp', rounding: 'down' },
          damage_applied: Math.max(0, hpBeforeSolar - mon.hp)
        });
        if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'Solar Power' }); }
      }
    }

    // Burn damage
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'burn')) {
      const burnDmg = Math.floor(mon.maxHp / 16);
      const hpBeforeBurn = mon.hp;
      mon.hp = Math.max(0, mon.hp - burnDmg);
      log.push(`${mon.name} is hurt by its burn! [${burnDmg} dmg]`);
      _recordEffectEvent(field, mon, 'Burn', 'status-damage', hpBeforeBurn, mon.hp, {
        source: 'engine status rule',
        rule: { numerator: 1, denominator: 16, basis: 'max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforeBurn - mon.hp)
      });
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'burn' }); }
    }

    // T9j.17 (Refs #101) -- Frostbite residual (1/16 max HP). Mirrors burn chip.
    // Frostbite is the SpA-side analogue of burn introduced in Gen IX/Champions:
    // halves SpA (handled in getStat) and chips 1/16 maxHp end-of-turn.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'frostbite')) {
      const frostDmg = Math.max(1, Math.floor(mon.maxHp / 16));
      const hpBeforeFrost = mon.hp;
      mon.hp = Math.max(0, mon.hp - frostDmg);
      log.push(`${mon.name} is hurt by frostbite! [${frostDmg} dmg]`);
      _recordEffectEvent(field, mon, 'Frostbite', 'status-damage', hpBeforeFrost, mon.hp, {
        source: 'engine status rule',
        rule: { numerator: 1, denominator: 16, basis: 'max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforeFrost - mon.hp)
      });
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'frostbite' }); }
    }

    // T9j.4 (#41) — Poison residual (1/8 max HP). Cite: Bulbapedia Status; Spec §1.6.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'poison')) {
      const poisonDmg = Math.max(1, Math.floor(mon.maxHp / 8));
      const hpBeforePoison = mon.hp;
      mon.hp = Math.max(0, mon.hp - poisonDmg);
      log.push(`${mon.name} is hurt by poison! [${poisonDmg} dmg]`);
      _recordEffectEvent(field, mon, 'Poison', 'status-damage', hpBeforePoison, mon.hp, {
        source: 'engine status rule',
        rule: { numerator: 1, denominator: 8, basis: 'max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforePoison - mon.hp)
      });
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'poison' }); }
    }

    // T9j.4 (#41) — Toxic residual (N/16 escalating, cap N=15; counter increments post-tick).
    // Cite: Bulbapedia Status; Spec §1.6.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'toxic')) {
      if (!mon.toxicCounter || mon.toxicCounter < 1) mon.toxicCounter = 1;
      const n = Math.min(15, mon.toxicCounter);
      const toxicDmg = Math.max(1, Math.floor(mon.maxHp * n / 16));
      const hpBeforeToxic = mon.hp;
      mon.hp = Math.max(0, mon.hp - toxicDmg);
      log.push(`${mon.name} is hurt by toxic! [${toxicDmg} dmg] (tick ${n}/16)`);
      _recordEffectEvent(field, mon, 'Toxic', 'status-damage', hpBeforeToxic, mon.hp, {
        source: 'engine status rule',
        rule: { numerator: n, denominator: 16, basis: 'max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforeToxic - mon.hp)
      });
      mon.toxicCounter++;
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'toxic' }); }
    }
    for (const healer of [...playerActive, ...oppActive].filter(m => m.alive && m.ability === 'Healer')) {
      const activeAllies = healer.side === field.playerSide ? playerActive : oppActive;
      const ally = activeAllies.find(function(mon) {
        return mon && mon !== healer && mon.alive && mon.status;
      });
      if (ally && rng() < 0.30) {
        ally.status = null;
        ally.statusTurns = 0;
        ally.toxicCounter = 0;
        ally.sleepTurns = 0;
        log.push(`${healer.name}'s Healer cured ${ally.name}'s status!`);
      }
    }
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.tauntedTurns > 0)) {
      mon.tauntedTurns--;
      if (mon.tauntedTurns <= 0) {
        mon.tauntedTurns = 0;
        log.push(`${mon.name}'s Taunt wore off.`);
      }
    }
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.encoredTurns > 0)) {
      mon.encoredTurns--;
      if (mon.encoredTurns <= 0) {
        mon.encoredTurns = 0;
        mon.encoredMove = null;
        log.push(`${mon.name}'s Encore wore off.`);
      }
    }
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.healBlockedTurns > 0)) {
      mon.healBlockedTurns--;
      if (mon.healBlockedTurns <= 0) {
        mon.healBlockedTurns = 0;
        log.push(`${mon.name} can recover HP again.`);
      }
    }
    for (const mon of [...playerActive, ...oppActive]) {
      mon._statsRaisedThisTurn = false;
    }
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.throatChopTurns > 0)) {
      mon.throatChopTurns--;
      if (mon.throatChopTurns <= 0) {
        mon.throatChopTurns = 0;
        log.push(`${mon.name} can use sound-based moves again.`);
      }
    }
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.confusionTurns > 0)) {
      mon.confusionTurns--;
      if (mon.confusionTurns <= 0) {
        mon.confusionTurns = 0;
        log.push(`${mon.name} snapped out of its confusion.`);
      }
    }
    // Note: Snow intentionally has no chip damage (Champions Gen-IX). Hail is absent.

    for (const [sideLabel, sideRef, activeArr] of [
      ['Player', field.playerSide, playerActive],
      ['Opponent', field.oppSide, oppActive]
    ]) {
        const pendingWishes = Array.isArray(sideRef.wishes) ? sideRef.wishes : [];
        sideRef.wishes = pendingWishes.filter((wish) => {
        if (!wish || wish.resolveTurn !== turn) return true;
        const recipient = activeArr[wish.slot] || null;
        if (recipient && recipient.alive && _canReceiveHealing(recipient)) {
          const hpBeforeHeal = recipient.hp;
          const heal = Math.max(0, Math.min(recipient.maxHp, recipient.hp + wish.amount) - recipient.hp);
          if (heal > 0) {
            recipient.hp += heal;
            log.push(`${sideLabel}'s Wish came true for ${recipient.name}!`);
            log.push(`${recipient.name} restored HP with Wish! [+${heal}]`);
            _recordEffectEvent(field, recipient, 'Wish', 'delayed-recovery', hpBeforeHeal, recipient.hp, {
              source_actor: wish.sourceName || '',
              rule: { numerator: 1, denominator: 2, basis: 'source_max_hp', rounding: 'down' },
              heal_candidate: wish.amount,
              heal_applied: heal
            });
          }
        }
        return false;
      });
    }

    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.leechSeededBy)) {
      const source = mon.leechSeededBy;
      const drain = Math.max(1, Math.floor(mon.maxHp / 8));
      const hpBeforeDrain = mon.hp;
      mon.hp = Math.max(0, mon.hp - drain);
      log.push(`${mon.name} was sapped by Leech Seed! [${drain} dmg]`);
      _recordEffectEvent(field, mon, 'Leech Seed', 'residual-drain-damage', hpBeforeDrain, mon.hp, {
        source_actor: source && source.name || '',
        rule: { numerator: 1, denominator: 8, basis: 'target_max_hp', rounding: 'down' },
        damage_applied: Math.max(0, hpBeforeDrain - mon.hp)
      });
      if (source && source.alive && _canReceiveHealing(source)) {
        const sourceHpBeforeHeal = source.hp;
        const heal = Math.max(0, Math.min(source.maxHp, source.hp + drain) - source.hp);
        if (heal > 0) {
          source.hp += heal;
          log.push(`${source.name} restored HP with Leech Seed! [+${heal}]`);
          _recordEffectEvent(field, source, 'Leech Seed', 'residual-drain-heal', sourceHpBeforeHeal, source.hp, {
            source_actor: source.name,
            drained_target: mon.name,
            rule: { numerator: 1, denominator: 1, basis: 'leech_seed_damage', rounding: 'none' },
            source_damage: Math.max(0, hpBeforeDrain - mon.hp),
            heal_candidate: drain,
            heal_applied: heal
          });
        }
      }
      if (mon.hp === 0) {
        mon.alive = false;
        log.push(`${mon.name} fainted!`);
        _recordKO(mon, { attacker: source || mon, move: 'Leech Seed', reason: 'seed' });
      }
    }

    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.perishSongTurns > 0)) {
      mon.perishSongTurns--;
      if (mon.perishSongTurns <= 0) {
        const hpBeforePerish = mon.hp;
        mon.hp = 0;
        mon.alive = false;
        log.push(`${mon.name} perished due to Perish Song!`);
        _recordEffectEvent(field, mon, 'Perish Song', 'perish-song-faint', hpBeforePerish, mon.hp, {
          source: 'engine field-effect rule',
          damage_applied: Math.max(0, hpBeforePerish - mon.hp)
        });
        _recordKO(mon, { move: 'Perish Song', attacker: null, reason: 'perish' });
      }
    }

    // T9j.6 (#29) — Leftovers: heal 1/16 maxHp end of turn. Only while below max HP.
    // Cite: Game8 Champions item list; Bulbapedia Leftovers.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.item === 'Leftovers' && m.hp < m.maxHp)) {
      if (!_canReceiveHealing(mon)) continue;
      const heal = Math.max(1, Math.floor(mon.maxHp / 16));
      const hpBeforeHeal = mon.hp;
      mon.hp = Math.min(mon.maxHp, mon.hp + heal);
      log.push(`${mon.name} restored HP with Leftovers! [+${heal}]`);
      _recordEffectEvent(field, mon, 'Leftovers', 'item-recovery', hpBeforeHeal, mon.hp, {
        source: 'engine item rule',
        rule: { numerator: 1, denominator: 16, basis: 'max_hp', rounding: 'down' },
        heal_candidate: heal,
        heal_applied: Math.max(0, mon.hp - hpBeforeHeal)
      });
    }

    // Grassy Terrain: heal grounded mons 1/16 maxHp at end of turn.
    if (field.terrain === 'grassy') {
      for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && _isGrounded(m) && m.hp < m.maxHp)) {
        if (!_canReceiveHealing(mon)) continue;
        const heal = Math.max(1, Math.floor(mon.maxHp / 16));
        const hpBefore = mon.hp;
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        log.push(`${mon.name} restored HP with Grassy Terrain! [+${heal}]`);
        _recordEffectEvent(field, mon, 'Grassy Terrain', 'terrain-recovery', hpBefore, mon.hp, {
          source: 'engine terrain rule',
          rule: { numerator: 1, denominator: 16, basis: 'max_hp', rounding: 'down' },
          heal_candidate: heal,
          heal_applied: Math.max(0, mon.hp - hpBefore)
        });
      }
    }

    // Field upkeep
    field.tick(log);
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.roosting)) {
      mon.roosting = false;
      mon.flying = mon.types.includes('Flying') || mon.ability === 'Levitate';
    }

    // --------------------------------------------------------
    // REPLACEMENTS
    // --------------------------------------------------------
    function replaceOnField(activeArr, bench, side, field, log) {
      const fainted = activeArr.filter(m => !m.alive);
      for (const mon of fainted) {
        sideFainted[side]++;
        // T9j.1 — keep side.fainted on the field in sync so calcDamage's
        // Last Respects lookup (attacker.side.fainted) uses the real count.
        (side === 'player' ? field.playerSide : field.oppSide).fainted = sideFainted[side];
        _clearImprisonEffectsForMon(mon, field);
        const idx = activeArr.indexOf(mon);
        const replacement = _chooseBenchReplacement(bench);
        if (replacement) {
          bench.splice(bench.indexOf(replacement), 1);
          _resetSwitchInState(replacement);
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

    // T9j.3 (#39) — timer-draw check. Deduct deterministic 15s/turn proxy.
    // If either clock expires, force battle end via tiebreaker cascade.
    field.clockPlayer -= DECISION_TIME_MS;
    field.clockOpp    -= DECISION_TIME_MS;
    if (field.clockPlayer <= 0 || field.clockOpp <= 0) {
      log.push(`[TIMER] Clock expired at turn ${turn}. Resolving via tiebreaker.`);
      _turnEntry.events = _eventsFromLog(log.slice(_turnLogStart));
      _turnEntry.damage_events = (field._ctx.turnDamageEvents || []).slice();
      _turnEntry.effect_events = (field._ctx.turnEffectEvents || []).slice();
      _turnEntry.post = _makeTurnSnapshot(playerActive, playerBench, oppActive, oppBench, field, false, _orderedPlayer, _orderedOpp);
      _turnEntry.delta.position_score = Math.round((_turnEntry.post.position_score - _turnEntry.pre.position_score) * 1000) / 1000;
      _turnEntry.delta.primary_cause = _turnEntry.delta.position_score >= 0 ? 'position_improved' : 'position_lost';
      turnLog.push(_turnEntry);
      break;
    }
    _turnEntry.events = _eventsFromLog(log.slice(_turnLogStart));
    _turnEntry.damage_events = (field._ctx.turnDamageEvents || []).slice();
    _turnEntry.effect_events = (field._ctx.turnEffectEvents || []).slice();
    _turnEntry.post = _makeTurnSnapshot(playerActive, playerBench, oppActive, oppBench, field, false, _orderedPlayer, _orderedOpp);
    _turnEntry.delta.position_score = Math.round((_turnEntry.post.position_score - _turnEntry.pre.position_score) * 1000) / 1000;
    _turnEntry.delta.primary_cause = _turnEntry.delta.position_score >= 0 ? 'position_improved' : 'position_lost';
    turnLog.push(_turnEntry);
  }

  const positionDeltas = winProbabilityDelta(turnLog);
  const swingTurn = turnLog.find(t => t && t.swingTurn) || null;
  const positionPath = [];
  if (turnLog[0] && turnLog[0].pre) positionPath.push(turnLog[0].pre.position_score);
  for (const t of turnLog) if (t && t.post) positionPath.push(t.post.position_score);
  if (typeof window !== 'undefined') {
    window.ChampionsSim = window.ChampionsSim || {};
    window.ChampionsSim.turnLog = turnLog;
    window.ChampionsSim.positionScore = positionScore;
    window.ChampionsSim.winProbabilityDelta = winProbabilityDelta;
    window.ChampionsSim.isRNGBlame = isRNGBlame;
  }

  // ============================================================
  // RESULT
  // ============================================================
  const pAliveAll = [...playerActive, ...playerBench].filter(m => m.alive);
  const oAliveAll = [...oppActive, ...oppBench].filter(m => m.alive);
  const pSurvive = pAliveAll.length;
  const oSurvive = oAliveAll.length;
  // T9j.3 (#39) tiebreaker cascade: Pokemon alive → total HP → true draw.
  const pHpSum = pAliveAll.reduce((s, m) => s + m.hp, 0);
  const oHpSum = oAliveAll.reduce((s, m) => s + m.hp, 0);
  const timerExpired = (field.clockPlayer <= 0 || field.clockOpp <= 0);

  let result;
  let winCondition = '';
  if (pSurvive > oSurvive) {
    result = 'win';
    const ko = log.filter(l => l.includes('fainted')).length;
    const trSet = log.some(l => l.includes('Trick Room was set'));
    const twSet = log.some(l => l.includes('Tailwind is blowing'));
    winCondition = timerExpired ? 'Timer Win (pokemon)'
      : (trSet ? 'TR Win' : twSet ? 'Tailwind Win' : ko >= 4 ? 'KO Sweep' : 'Attrition Win');
  } else if (oSurvive > pSurvive) {
    result = 'loss';
    winCondition = timerExpired ? 'Timer Loss (pokemon)' : 'Opponent Win';
  } else {
    // Equal Pokemon count — fall to HP tiebreaker.
    if (pHpSum > oHpSum) {
      result = 'win';
      winCondition = timerExpired ? 'Timer Win (HP)' : 'HP Tiebreak Win';
    } else if (oHpSum > pHpSum) {
      result = 'loss';
      winCondition = timerExpired ? 'Timer Loss (HP)' : 'HP Tiebreak Loss';
    } else {
      result = 'draw';
      winCondition = timerExpired ? 'Timer Draw' : 'Draw';
    }
  }
  if (timerExpired) log.push(`[TIMER] Resolved ${winCondition} — alive p${pSurvive}/o${oSurvive}, HP p${pHpSum}/o${oHpSum}`);

  return {
    result, turns: turn,
    // T9j.3 (#37) — cumulative active turns, replaces meaningless end-of-battle remaining counter.
    trTurns: field.trickRoomActive,
    // T9j.3 (#38) — Tailwind cumulative active per side and combined.
    twTurnsPlayer: field.playerSide.tailwindActive,
    twTurnsOpp:    field.oppSide.tailwindActive,
    twTurns:       field.playerSide.tailwindActive + field.oppSide.tailwindActive,
    // T9j.3 Screens cumulative active for diagnostics.
    screens: {
      playerReflect:     field.playerSide.reflectActive,
      playerLightScreen: field.playerSide.lightScreenActive,
      playerAuroraVeil:  field.playerSide.auroraVeilActive,
      oppReflect:        field.oppSide.reflectActive,
      oppLightScreen:    field.oppSide.lightScreenActive,
      oppAuroraVeil:     field.oppSide.auroraVeilActive,
    },
    // T9j.3 (#39) timer-draw diagnostics.
    timerExpired, clockPlayer: field.clockPlayer, clockOpp: field.clockOpp,
    pHpSum, oHpSum,
    log, winCondition, seed,
    turnLog: turnLog,
    position_path: positionPath,
    position_deltas: positionDeltas,
    turning_point: swingTurn ? {
      turn: swingTurn.turn,
      direction: swingTurn.delta && swingTurn.delta.position_score >= 0 ? 'player' : 'opponent',
      cause: swingTurn.delta ? swingTurn.delta.primary_cause : 'unknown'
    } : null,
    playerSurvivors: pSurvive, oppSurvivors: oSurvive,
    // T9j.10 (Refs #16) — structured lead + bring info so UI never parses log strings.
    //   leads:  active battlers at turn 1 (doubles: 2, singles: 1)
    //   bring:  the N-of-6 actually entering battle (doubles: 4, singles: 3)
    leads: {
      player:   _initialPlayerActive.map(p => p.name),
      opponent: _initialOppActive.map(p => p.name)
    },
    bring: {
      // Always slice to bring count so default (no override) still reflects VGC rules:
      // doubles 4 of 6, singles 3 of 6. When caller supplies playerBring, the team
      // has already been pruned to that count by _applyBring above.
      player:   _orderedPlayer.slice(0, field._format === 'singles' ? 3 : 4).map(p => p.name),
      opponent: _orderedOpp.slice(0,    field._format === 'singles' ? 3 : 4).map(p => p.name)
    },
    // #5 — attach legality verdict so UI can surface warnings on team/match cards.
    legality: { player: playerLegality, opp: oppLegality },
    // Phase 4a (Refs #52) — structured KO event log. See _recordKO site above.
    koEvents: koEvents,
    // Phase 4b (Refs #52) — per-mon move-call histogram + Protect streak
    // peaks. Compact shape; the simlog writer strips to what's needed.
    movesUsed: movesUsed,
    protectStreakMax: _protectStreakMax
  };
}

// ============================================================
// PRIORITY LOOKUP
// ============================================================
var STATUS_MOVE_NAMES = new Set([
  'Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder','Hypnosis','Spore','Leech Seed','Perish Song','Trick','Tailwind','Sunny Day',
  'Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail',
  'Wish','Teleport','Baton Pass',
  'Quick Guard','Endure','Wide Guard','Follow Me','Protect','Detect',
  "King's Shield",'Spiky Shield','Baneful Bunker','Obstruct','Light Screen',
  'Reflect','Aurora Veil','Encore','Haze','Defog','Recover','Shore Up','Rest',
  'Sleep Talk','Substitute','Imprison','Ally Switch','Toxic','Poison Powder',
  'Rain Dance','Swords Dance','Dragon Dance','Calm Mind','Coil','Fake Tears',
  'Coaching','Clangorous Soul','Heal Bell','Aromatherapy','Jungle Healing','Noble Roar'
]);

var TARGETED_STATUS_MOVES = new Set([
  'Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder','Hypnosis','Spore','Leech Seed','Toxic',
  'Poison Powder','Encore','Parting Shot','Fake Tears','Trick','Noble Roar'
]);

function isStatusMoveName(move) {
  return !!(move && (STATUS_MOVE_NAMES.has(move) || _moveCategory(move) === 'status'));
}

function getPriority(move, attacker) {
  const CHAMPIONS_PRIORITY_OVERRIDES = {
    // Keep intentional Champions-vs-Showdown differences here with source notes.
  };
  const LOCAL_PRIORITY_FALLBACK = {
    'Fake Out':3, 'Extreme Speed':2, 'Aqua Jet':1, 'Shadow Sneak':1,
    'Sucker Punch':1, 'Vacuum Wave':1, 'Quick Attack':1, 'Ice Shard':1,
    'Feint':2,
    'Helping Hand':5,
    'Endure':4,
    'Protect':4, 'Detect':4,
    "King's Shield":4, 'Spiky Shield':4, 'Baneful Bunker':4, 'Obstruct':4,
    'Wide Guard':3, 'Quick Guard':3, 'Ally Switch':2,
    'Follow Me':2, 'Rage Powder':2,
    'Trick Room':-7, 'Roost':0
  };
  let priority = 0;
  if (Object.prototype.hasOwnProperty.call(CHAMPIONS_PRIORITY_OVERRIDES, move)) {
    priority = CHAMPIONS_PRIORITY_OVERRIDES[move];
  } else if (_showdownMoveRow(move)) {
    priority = _movePriority(move);
  } else if (Object.prototype.hasOwnProperty.call(LOCAL_PRIORITY_FALLBACK, move)) {
    priority = LOCAL_PRIORITY_FALLBACK[move];
  }
  if (attacker && attacker.ability === 'Prankster' && isStatusMoveName(move)) priority += 1;
  if (attacker && attacker.ability === 'Gale Wings' &&
      attacker.hp === attacker.maxHp && _moveType(move) === 'Flying') priority += 1;
  return priority;
}

function shouldPranksterFailOnTarget(attacker, move, target) {
  return !!(attacker
    && attacker.ability === 'Prankster'
    && target
    && target.alive
    && target.side
    && attacker.side
    && target.side !== attacker.side
    && TARGETED_STATUS_MOVES.has(move)
    && Array.isArray(target.types)
    && target.types.indexOf('Dark') !== -1);
}

function isBlockedByGoodAsGold(target, move) {
  return !!(target
    && target.alive
    && target.ability === 'Good as Gold'
    && TARGETED_STATUS_MOVES.has(move));
}

function shouldReflectByMagicBounce(attacker, target, move) {
  return !!(attacker
    && target
    && target.alive
    && target.ability === 'Magic Bounce'
    && attacker.side
    && target.side
    && attacker.side !== target.side
    && TARGETED_STATUS_MOVES.has(move));
}

// ============================================================
// MONTE CARLO RUNNER
// ============================================================

async function runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress) {
  const playerTeamDef = TEAMS[playerTeamKey];
  const oppTeamDef = TEAMS[oppTeamKey];

  const results = { wins:0, losses:0, draws:0, errors:0, totalTurns:0, totalTrTurns:0,
    // T9j.3 (#38) Tailwind cumulative + (#39) timer-draw bucket.
    totalTwTurns:0, timerDraws:0, timerWins:0, timerLosses:0,
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
      // T9j.2 / #78 - thread format through the shared ChampionsSim namespace.
      const fmt = (typeof window !== 'undefined'
        && window.ChampionsSim
        && window.ChampionsSim.state
        && window.ChampionsSim.state.format) || 'doubles';
      const battle = simulateBattle(playerTeamDef, oppTeamDef, { seed, format: fmt });
      if (battle.result === 'error') {
        results.errors++;
        if (results.allLogs.length < 5) results.allLogs.push({ ...battle, oppTeam: oppTeamKey });
        continue;
      }
      results[battle.result === 'win' ? 'wins' : battle.result === 'loss' ? 'losses' : 'draws']++;
      results.totalTurns += battle.turns;
      results.totalTrTurns += battle.trTurns;
      // T9j.3 (#38, #39)
      results.totalTwTurns += (battle.twTurns || 0);
      if (battle.timerExpired) {
        if (battle.result === 'draw') results.timerDraws++;
        else if (battle.result === 'win')  results.timerWins++;
        else if (battle.result === 'loss') results.timerLosses++;
      }
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
  results.avgTwTurns = validBattles > 0 ? results.totalTwTurns / validBattles : 0;  // T9j.3 (#38)
  // Issue #6: confidence tier label
  results.confidenceNote = numBattles < 20  ? 'Low confidence — run more simulations or increase sample size' :
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

// M8: Build hidden_info_priors from a prior snapshot (Smogon usage data).
// Returns an enriched priors object if prior is valid, or the default stub.
function applyPrior(prior) {
  if (!prior || !prior.usage_data) {
    return {
      note:   'All opponent set details taken as declared in TEAMS definition. No hidden-set priors applied.',
      source: 'exact-input',
      items:  'declared',
      evs:    'declared',
      tera:   'declared',
      moves:  'declared'
    };
  }
  return {
    note:    'Hidden-info priors applied from ' + prior.source + ' (' + prior.month + ')',
    source:  prior.source,
    prior_id: prior.prior_id,
    month:   prior.month,
    items:   'usage-weighted',
    evs:     'usage-weighted',
    tera:    'usage-weighted',
    moves:   'usage-weighted',
    species_usage: prior.usage_data.species || [],
    item_usage:    prior.usage_data.items   || [],
    move_usage:    prior.usage_data.moves   || []
  };
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
    prior_id:           (ctx.prior && ctx.prior.prior_id) || null,
    hidden_info_model:   (ctx.prior && ctx.prior.source && ctx.prior.month)
                           ? ctx.prior.source + '-' + ctx.prior.month
                           : null,
    hidden_info_priors:  applyPrior(ctx.prior || null),
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
      (tier === 'Low'      ? 'Low confidence — run more series or increase sample size' :
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

// ============================================================
// T9j.7 — MEGA TRIGGER SWEEP
// Explores the full WR-by-trigger-turn curve for every Mega on teamA
// against teamB. Progressive refinement: coarse pass (50 battles per cell)
// identifies promising turns, then top 3 re-run at 500 battles each.
// Output consumed by M2 Pilot Guide card and M3 Trend Dashboard heatmap.
// ============================================================

/**
 * Run one cell of the sweep: force teamA's Mega-capable mons to use the
 * supplied policy, run nBattles, and return {wr, n, wins, losses, ci95}.
 */
function runMegaSweepCell(teamA, teamB, bo, policy, triggerTurn, nBattles) {
  let wins = 0, losses = 0, draws = 0;
  for (let i = 0; i < nBattles; i++) {
    // Deep copy team data so we can override Mega policy without mutating
    // the caller's team state across cells.
    const teamACopy = JSON.parse(JSON.stringify(teamA));
    const teamBCopy = JSON.parse(JSON.stringify(teamB));
    const res = simulateBattle(teamACopy, teamBCopy, {
      bo: bo || 1,
      _megaPolicyOverride: {
        side: 'player',
        policy: policy,
        triggerTurn: triggerTurn
      }
    });
    if (res && res.winner === 'player') wins++;
    else if (res && res.winner === 'opp') losses++;
    else draws++;
  }
  const n  = wins + losses + draws;
  const wr = n > 0 ? wins / n : 0;
  // 95% Wilson CI half-width (approx)
  const z = 1.96;
  const ci95 = n > 0 ? z * Math.sqrt(wr * (1 - wr) / n) : 0;
  return { wr: wr, n: n, wins: wins, losses: losses, draws: draws, ci95: ci95 };
}

/**
 * Progressive sweep across every legal trigger turn 1..MAX_TURN plus a
 * 'never' baseline, per Mega-capable member on teamA.
 * Returns { matchup, results: [ { megaSlot, curve, refinedTop3, bestTurn } ] }
 */
function runMegaTriggerSweep(teamA, teamB, bo, opts) {
  opts = opts || {};
  const MAX_TURN   = opts.maxTurn  || 10;
  const COARSE_N   = opts.coarseN  ||  50;
  const REFINE_N   = opts.refineN  || 500;
  const teamAName  = teamA.name || teamA.key || 'teamA';
  const teamBName  = teamB.name || teamB.key || 'teamB';

  // Identify Mega-capable slots by inspecting team member items/names.
  // We need a peek without burning a full simulation, so construct Pokemon
  // objects once.
  const peek = new Field ? null : null; // no-op; using constructor directly
  const megaSlots = (teamA.members || []).filter(function(mem) {
    const mInfo = (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[mem.name]) || null;
    return mInfo && mInfo.baseSpecies && mem.item === mInfo.megaStone;
  });

  const results = [];
  for (const slot of megaSlots) {
    const curve = [];
    // Pass 1: every legal turn
    for (let t = 1; t <= MAX_TURN; t++) {
      const cell = runMegaSweepCell(teamA, teamB, bo, 'at_turn', t, COARSE_N);
      curve.push({ turn: t, wr: cell.wr, n: cell.n, ci95: cell.ci95 });
    }
    // Pass 1: 'never' baseline
    const neverCell = runMegaSweepCell(teamA, teamB, bo, 'never', null, COARSE_N);
    curve.push({ turn: 'never', wr: neverCell.wr, n: neverCell.n, ci95: neverCell.ci95 });

    // Pass 2: refine top 3 by coarse WR
    const top3 = curve.slice().sort((a, b) => b.wr - a.wr).slice(0, 3);
    const refined = top3.map(function(cell) {
      const policy = cell.turn === 'never' ? 'never' : 'at_turn';
      const refinedCell = runMegaSweepCell(teamA, teamB, bo, policy, cell.turn, REFINE_N);
      return { turn: cell.turn, wr: refinedCell.wr, n: refinedCell.n, ci95: refinedCell.ci95 };
    });
    const bestTurn = refined.slice().sort((a, b) => b.wr - a.wr)[0].turn;

    results.push({
      megaSlot:     slot.name,
      curve:        curve,
      refinedTop3:  refined,
      bestTurn:     bestTurn
    });
  }

  return {
    matchup: teamAName + '_vs_' + teamBName,
    teamA:   teamAName,
    teamB:   teamBName,
    bo:      bo || 1,
    config:  { maxTurn: MAX_TURN, coarseN: COARSE_N, refineN: REFINE_N },
    results: results
  };
}

if (typeof window !== 'undefined') {
  window.ChampionsSim = window.ChampionsSim || {};
  window.ChampionsSim.battle = window.ChampionsSim.battle || {};
  window.ChampionsSim.turnLog = window.ChampionsSim.turnLog || [];
  window.ChampionsSim.positionScore = positionScore;
  window.ChampionsSim.winProbabilityDelta = winProbabilityDelta;
  window.ChampionsSim.isRNGBlame = isRNGBlame;
  window.ChampionsSim.battle.getMoveContactInfo = getMoveContactInfo;
}
