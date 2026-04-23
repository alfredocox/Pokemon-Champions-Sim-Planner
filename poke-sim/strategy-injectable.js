// ============================================================
// strategy-knowledge-base.js
// Drop this <script> BEFORE engine.js in index.html
// It adds:
//   TEAM_META, TEAM_ARCHETYPES, POKEMON_MOVE_LOG,
//   renderArchetypeTags(), renderMoveLog(),
//   renderSetupPlays(), getTeamGuide(),
//   detectTeamArchetypes(), renderStrategyTab()
// ============================================================

// ============================================================
// STRATEGY KNOWLEDGE BASE — VGC 2026 Reg M-A
// ============================================================

const TEAM_ARCHETYPES = {
  aggressive:    { label:'Aggressive',    icon:'⚔️',  color:'#e74c3c', desc:'Win via raw offensive pressure. Win before opponent sets up.' },
  hyper_offense: { label:'Hyper Offense', icon:'💥',  color:'#ff6b35', desc:'Maximum damage output turns 1-2. Relies on first-turn KOs.' },
  trick_room:    { label:'Trick Room',    icon:'🔀',  color:'#9b59b6', desc:'Set TR turn 1, abuse slow powerhouses. Counter-speed control wins.' },
  weather_sun:   { label:'Sun Offense',   icon:'☀️',  color:'#f39c12', desc:'Drought/Sunny Day powers Eruption, Solar Beam, Solar Power.' },
  weather_sand:  { label:'Sand Control',  icon:'🏜️',  color:'#d4a017', desc:'Sand Stream chips non-immune mons. Sand Rush boosts allies.' },
  weather_rain:  { label:'Rain Offense',  icon:'🌧️',  color:'#3498db', desc:'Rain boosts Water moves, enables Thunder accuracy.' },
  control:       { label:'Control',       icon:'🛡️',  color:'#27ae60', desc:'Deny opponent gameplan via redirection, status, speed drops, Fake Out chains.' },
  balance:       { label:'Balance',       icon:'⚖️',  color:'#1abc9c', desc:'Offensive threats backed by defensive pivots. Flexible leads.' },
  veil:          { label:'Aurora Veil',   icon:'❄️',  color:'#74b9ff', desc:'Set Veil turn 1 under hail, then set up sweeper.' },
  kingambit:     { label:'Kingambit+',    icon:'♟️',  color:'#636e72', desc:'Kingambit win condition — Supreme Overlord boosts after KOs.' },
};

const TEAM_META = {
  player: {
    archetypes: ['control','balance'],
    style: 'TR Counter + Speed Control',
    guide: `OVERVIEW: Anti-Trick-Room + Tailwind hybrid. Incineroar provides Fake Out + Intimidate. Arcanine enables Power Gem chip + Head Smash nukes. Garchomp sweeps with Earthquake + Rock Slide spread. Whimsicott sets Tailwind. Rotom-Wash handles Rain and physical attackers.

SETUP PLAYS:
• Turn 1 [Standard Lead]: Incineroar + Arcanine — Fake Out + Power Gem to deny TR setter or chip Tailwind leads
• Turn 1 [vs TR]: Incineroar Fake Out the TR setter, Arcanine Head Smash the second mon
• Turn 2: Pivot Incineroar (Parting Shot) → bring Garchomp, maintain Tailwind
• Endgame: Garchomp Earthquake + Arcanine Fire Fang spread KOs under Tailwind

KEY LEADS: Incineroar + Arcanine (vs TR), Whimsicott + Garchomp (vs offense), Rotom-Wash + Incineroar (vs Rain)
WIN CONDITIONS: Fake Out pressure turn 1 → Tailwind → Garchomp sweep
COUNTERS THIS TEAM: Wide Guard, Redirection on Fake Out targets, Flutter Mane Moonblast under Tailwind`,
    counters: ['Flutter Mane','Amoonguss','Gholdengo','Cresselia','Hatterene'],
    setupPlays: [
      { turn:1, lead:'Incineroar + Arcanine', action:'Fake Out TR setter + Head Smash second mon', condition:'vs Trick Room' },
      { turn:1, lead:'Whimsicott + Garchomp', action:'Tailwind + Earthquake', condition:'vs slow offense' },
      { turn:2, lead:'Incineroar pivot out', action:'Parting Shot → Rotom-Wash, Tailwind up', condition:'mid-game reset' },
    ]
  },
  mega_altaria: {
    archetypes: ['balance','control'],
    style: 'Altaria-Mega Fairy/Dragon Pivot Balance',
    guide: `OVERVIEW: Mega Altaria is a Dragon/Fairy bulky attacker that walls Dragon-type moves entirely. Typhlosion-Hisui provides Ghost/Fire coverage + Eruption. Whimsicott sets Tailwind + Prankster priority. Rotom-Wash handles Rain and physical attackers. Sableye handles Trick Room. Sinistcha provides Hospitality recovery.

SETUP PLAYS:
• Turn 1 [Standard]: Whimsicott + Altaria-Mega — Tailwind + Moonblast aggression
• Turn 1 [vs TR]: Sableye + Altaria-Mega — Prankster disruption, Altaria tanks hits
• Midgame: Typhlosion-Hisui Eruption under Tailwind for massive spread chip

KEY LEADS: Whimsicott + Altaria-Mega (standard), Sableye + Altaria-Mega (vs TR)
WIN CONDITIONS: Tailwind + Altaria Dragon Claw/Moonblast sweep. Eruption nuke for cleanup.
HARD COUNTERS: Kingambit (Steel resists Fairy, Supreme Overlord). Incineroar (Intimidate). Steel/Poison mons.`,
    counters: ['Kingambit','Incineroar','Gholdengo','Heatran','Steel types'],
    setupPlays: [
      { turn:1, lead:'Whimsicott + Altaria-Mega', action:'Tailwind + Moonblast', condition:'standard' },
      { turn:1, lead:'Sableye + Altaria-Mega', action:'Prankster Fake Out + Dragon Claw', condition:'vs Trick Room' },
      { turn:2, lead:'Sinistcha in', action:'Hospitality heal ally + Matcha Gotcha chip', condition:'sustain game' },
    ]
  },
  mega_dragonite: {
    archetypes: ['hyper_offense','weather_rain'],
    style: 'Mega Dragonite Hyper Offense + Rain Support',
    guide: `OVERVIEW: Dragonite-Mega has 175 base Atk — the highest physical attacker in the format. Multiscale ensures survival at full HP. Pelipper sets Rain for Basculegion. Liepard provides Fake Out + Encore disruption.

SETUP PLAYS:
• Turn 1 [Standard]: Liepard + Dragonite-Mega — Fake Out biggest threat, Dragonite Extreme Speed
• Turn 1 [vs TR]: Liepard Encore the TR setup move, Dragonite Dragon Dance
• Turn 1 [Rain]: Pelipper + Basculegion — Drizzle + Wave Crash nuke

KEY LEADS: Liepard + Dragonite-Mega (offense), Pelipper + Basculegion (rain)
WIN CONDITIONS: Dragonite Extreme Speed priority chain. Dragon Dance + sweep. Last Respects nuke after KOs stack.
HARD COUNTERS: Fairy types (immune to Dragon), Ice moves (4x), Trick Room, Intimidate through Multiscale.`,
    counters: ['Flutter Mane','Altaria-Mega','Togekiss','Ice move users'],
    setupPlays: [
      { turn:1, lead:'Liepard + Dragonite-Mega', action:'Fake Out + Extreme Speed', condition:'standard offense' },
      { turn:1, lead:'Pelipper + Basculegion', action:'Rain + Wave Crash', condition:'rain mode' },
      { turn:1, lead:'Liepard + Dragonite-Mega', action:'Encore TR setter + Dragon Dance', condition:'vs Trick Room' },
    ]
  },
  mega_houndoom: {
    archetypes: ['weather_sun','hyper_offense'],
    style: 'Sun Hyper Offense — Solar Power nuke',
    guide: `OVERVIEW: Houndoom-Mega Solar Power under Torkoal Drought = highest effective Fire SpA in format. Farigiraf (Armor Tail) blocks TR priority. Drampa-Mega provides Hyper Voice spread.

SETUP PLAYS:
• Turn 1 [Standard]: Torkoal + Houndoom-Mega — auto Drought, Heat Wave + Flamethrower
• Turn 1 [vs TR]: Farigiraf + Torkoal — Armor Tail blocks TR, Follow Me redirects, sun up
• Midgame: Drampa-Mega Hyper Voice spread

WIN CONDITIONS: Eruption/Heat Wave under Solar Power + Sun for massive chip every turn.
HARD COUNTERS: Rain (weather override), Rock Slide (4x Torkoal), Tyranitar (sand).`,
    counters: ['Rain teams','Tyranitar','Charizard-Mega-Y','Rock Slide users'],
    setupPlays: [
      { turn:1, lead:'Torkoal + Houndoom-Mega', action:'Drought auto + Heat Wave + Flamethrower', condition:'standard sun' },
      { turn:1, lead:'Farigiraf + Torkoal', action:'Follow Me redirect + Drought', condition:'vs disruption' },
      { turn:2, lead:'Drampa-Mega in', action:'Hyper Voice spread + Solar Beam Water counter', condition:'cleanup' },
    ]
  },
  rin_sand: {
    archetypes: ['weather_sand','aggressive'],
    style: 'Sand Aggressive — Sneasler + Tyranitar',
    guide: `OVERVIEW: Tyranitar sets permanent Sand. Sneasler is the primary win condition (130 Atk / 120 Spe). Excadrill Sand Rush = fastest mon under Sand. Dragapult provides Ghost priority.

SETUP PLAYS:
• Turn 1: Tyranitar + Sneasler — Sand auto, Fake Out + Dire Claw, Rock Slide spread
• Midgame: Excadrill in under Sand Rush — fastest mon, High Horsepower + Iron Head

KEY LEADS: Tyranitar + Sneasler (standard), Excadrill + Tyranitar (Sand Rush sweep)
WIN CONDITIONS: Sand attrition + Sneasler KO stack → Excadrill Sand Rush sweep.
HARD COUNTERS: Fairy types, Wide Guard, Fighting immunities.`,
    counters: ['Altaria-Mega','Flutter Mane','Amoonguss','Wide Guard users'],
    setupPlays: [
      { turn:1, lead:'Tyranitar + Sneasler', action:'Sand auto + Fake Out + Rock Slide', condition:'standard' },
      { turn:1, lead:'Excadrill + Tyranitar', action:'Sand Rush + High Horsepower spread', condition:'fast sweep' },
    ]
  },
  suica_sun: {
    archetypes: ['weather_sun','balance'],
    style: 'Suica Sun Balance — Charizard + Venusaur',
    guide: `OVERVIEW: Classic VGC sun balance. Charizard Heat Wave + Air Slash under sun. Venusaur Solar Beam + Sludge Bomb. Complementary coverage: Fire hits Grass/Ice/Steel, Poison/Grass hits Water/Ground/Rock.

SETUP PLAYS:
• Turn 1: Drought setter + Charizard — Heat Wave nuke, Venusaur instant Solar Beam
• Midgame: Venusaur Sleep Powder → Charizard sweeps

WIN CONDITIONS: Heat Wave + Solar Beam combined coverage. Sleep Powder buys free turns.
HARD COUNTERS: Rain, Rock Slide (4x Charizard), Tyranitar sand override.`,
    counters: ['Tyranitar','Pelipper','Rock Slide users','Incineroar'],
    setupPlays: [
      { turn:1, lead:'Torkoal + Charizard', action:'Drought + Heat Wave', condition:'standard sun' },
      { turn:1, lead:'Whimsicott + Venusaur', action:'Tailwind + Sleep Powder', condition:'speed control' },
    ]
  },
  cofagrigus_tr: {
    archetypes: ['trick_room','control'],
    style: 'Full Trick Room — Cofagrigus + Cresselia',
    guide: `OVERVIEW: Sets TR via Cofagrigus (Ghost immune to Fake Out, Mummy denies physical abilities on contact) or Cresselia. Gothitelle Imprison locks opponent TR. Flutter Mane + Hatterene are TR abusers.

SETUP PLAYS:
• Turn 1 [Standard TR]: Cofagrigus + Cresselia — TR (Mummy blocks Fake Out), Cresselia Helping Hand
• Turn 1 [vs Imprison]: Gothitelle + Dusclops — Imprison + TR lock
• Turn 2: Flutter Mane + Hatterene sweep under TR

WIN CONDITIONS: TR up turn 1 → Moonblast/Dazzling Gleam sweep. Mummy denies Fake Out chains.
HARD COUNTERS: Taunt, Prankster Taunt, fast Fake Out on CRESSELIA before TR, TR expiring.`,
    counters: ['Incineroar','Sableye','Whimsicott','Taunt users','Dragapult'],
    setupPlays: [
      { turn:1, lead:'Cofagrigus + Cresselia', action:'Trick Room + Helping Hand', condition:'standard TR' },
      { turn:1, lead:'Gothitelle + Cofagrigus', action:'Imprison + Trick Room', condition:'vs mirror TR' },
      { turn:2, lead:'Flutter Mane + Hatterene in', action:'Moonblast + Dazzling Gleam nuke', condition:'abuser sweep' },
    ]
  },
  aurora_veil_froslass: {
    archetypes: ['veil','control'],
    style: 'Aurora Veil Setup — Froslass-Mega',
    guide: `OVERVIEW: Froslass-Mega sets Aurora Veil (halves all damage 8 turns under Snow) turn 1, then sets up sweeper behind screens.

SETUP PLAYS:
• Turn 1: Froslass-Mega + sweeper — Snow auto, Aurora Veil, Icy Wind speed drop
• Turn 2: Sweeper sets Dragon Dance / Nasty Plot safely
• Turn 3: Sweep with boosted attacker under Veil

HARD COUNTERS: Brick Break (bypasses Veil), Haze (clears boosts), weather override, Taunt.`,
    counters: ['Brick Break users','Haze users','Weather override','Taunt'],
    setupPlays: [
      { turn:1, lead:'Froslass-Mega + sweeper', action:'Aurora Veil + Snow + Icy Wind', condition:'standard' },
      { turn:2, lead:'Sweeper sets up', action:'Dragon Dance / Nasty Plot behind Veil', condition:'setup phase' },
    ]
  },
  kingambit_sneasler: {
    archetypes: ['kingambit','aggressive'],
    style: 'Kingambit + Sneasler — Supreme Overlord',
    guide: `OVERVIEW: Use Sneasler to stack KOs early (130 Atk / 120 Spe). Then Kingambit enters with Supreme Overlord (+10% Atk per fainted mon) for +20-30% buffed nuke.

SETUP PLAYS:
• Turn 1: Sneasler + support — Fake Out + Close Combat / Dire Claw for KO
• Turns 2-3: Stack 2nd KO with Sneasler
• Midgame: Kingambit in at +20-30% Atk — Kowtow Cleave + Sucker Punch

WIN CONDITIONS: 2 KOs via Sneasler → Kingambit Supreme Overlord sweep.
HARD COUNTERS: Fighting types (4x Kingambit), Fairy types, Wide Guard, Intimidate chains.`,
    counters: ['Fighting types','Fairy types','Wide Guard','Intimidate chains','Amoonguss'],
    setupPlays: [
      { turn:1, lead:'Sneasler + Incineroar', action:'Fake Out + Close Combat KO', condition:'KO stack' },
      { turn:2, lead:'Sneasler continues', action:'Dire Claw second KO', condition:'Supreme Overlord stack' },
      { turn:3, lead:'Kingambit in', action:'Kowtow Cleave + Sucker Punch at +20% Atk', condition:'cleanup' },
    ]
  },
  champions_arena_1st: { archetypes:['balance','control'], style:'Hyungwoo Shin — Champions Arena Winner', guide:'Tournament-winning balance build. Run simulations for matchup-specific pilot advice.', counters:[], setupPlays:[] },
  champions_arena_2nd: { archetypes:['aggressive','balance'], style:'Jorge Tabuyo — Champions Arena Finalist', guide:'Finalist aggressive build. Run simulations for matchup pilot advice.', counters:[], setupPlays:[] },
  champions_arena_3rd: { archetypes:['control','balance'], style:'Juan Benítez — Champions Arena Top 3', guide:'Control build. Run simulations for matchup pilot advice.', counters:[], setupPlays:[] },
  chuppa_balance: { archetypes:['balance','control'], style:'Chuppa Cross IV — Pittsburgh Champion', guide:'Proven regional balance team. Run simulations for pilot advice.', counters:[], setupPlays:[] },
};

const POKEMON_MOVE_LOG = {
  'Incineroar': {
    role: 'Support Pivot', tags: ['Fake Out','Intimidate','Pivot','Speed Control'],
    moves: {
      'Fake Out': { purpose:'Turn 1 flinch +3 priority. Denies opponent setup. Ghost/Dark types immune.', useWhen:'Turn 1 vs TR setters, vs fast attackers you need to stop.' },
      'Parting Shot': { purpose:'Switch out while lowering opponent Atk+SpA by 1. Momentum keeper.', useWhen:'Mid-game pivot when you want to deny offensive pressure before switching.' },
      'Flare Blitz': { purpose:'130 BP Fire STAB. Recoil 1/3. Strong but costs HP.', useWhen:'When you need the KO and Incineroar is expendable.' },
      'Knock Off': { purpose:'65 BP (+50% if target has item). Removes item permanently. Essential utility.', useWhen:'Remove Choice Scarf, Life Orb, Sitrus Berry from key threats.' },
    },
    counters: ['Ghost types immune to Fake Out','Soundproof blocks Parting Shot','Water moves (4x)'],
    keyInteractions: 'Intimidate on entry drops opponent Atk by 1. Parting Shot + Intimidate double-drops Atk. Core anti-physical support in VGC.'
  },
  'Arcanine': {
    role: 'Offensive Pivot', tags: ['Pivot','Physical Nuke','Anti-TR'],
    moves: {
      'Power Gem': { purpose:'80 BP Rock Special. Hits Flying types hard (Charizard, Dragonite-Mega).', useWhen:'vs Flying types, Dragon/Ice types weak to Rock.' },
      'Head Smash': { purpose:'150 BP Rock Physical. 50% recoil. Pure KO confirmation nuke.', useWhen:'KO confirmation only. Arcanine loses 50% HP after.' },
      'Extreme Speed': { purpose:'80 BP Normal Priority +2. Fastest priority available. STAB?', useWhen:'Clean up low-HP targets. Priority speed control.' },
      'Will-O-Wisp': { purpose:'Burns target — halves physical Atk, 1/16 chip/turn.', useWhen:'vs Physical attackers: Garchomp, Dragonite-Mega, Sneasler, Kingambit.' },
    },
    counters: ['Ground types','Water super-effective','Rock types resist Power Gem'],
    keyInteractions: 'Extreme Speed out-prioritizes almost everything. Head Smash + Power Gem destroys Dragon/Flying types including Charizard-Mega-Y and Dragonite.'
  },
  'Garchomp': {
    role: 'Physical Sweeper', tags: ['Spread Damage','Ground Immunity','Dragon STAB','Anti-Electric'],
    moves: {
      'Earthquake': { purpose:'100 BP Ground spread (hits both opponents). Avoid if partner is grounded.', useWhen:'Spread chip when both opponents grounded and partner is Flying/Levitating.' },
      'Dragon Claw': { purpose:'80 BP Dragon single target STAB.', useWhen:'Dragon threats. Safer than EQ when partner is grounded.' },
      'Rock Slide': { purpose:'75 BP spread Rock. 30% flinch. Pairs with Earthquake.', useWhen:'vs Flying types. Dual spread combo with Earthquake.' },
      'Protect': { purpose:'Shields 1 turn.', useWhen:'Dodge opponent EQ/Rock Slide. Avoid Fake Out.' },
    },
    counters: ['Ice moves (4x)','Fairy types (Dragon 0x)','Flutter Mane Moonblast OHKO'],
    keyInteractions: 'Dragon/Ground typing = Electric immunity (counters Rotom-Wash, Raging Bolt). Rock Slide + Earthquake dual spread is signature VGC combo.'
  },
  'Whimsicott': {
    role: 'Speed Control Support', tags: ['Tailwind','Prankster','Redirection','Anti-TR'],
    moves: {
      'Tailwind': { purpose:'Doubles Speed for 4 turns. Prankster = Priority +1.', useWhen:'Turn 1 before sweepers move. Priority means it beats non-Prankster actions.' },
      'Moonblast': { purpose:'95 BP Fairy STAB. 30% SpA drop. Hits Dragon/Dark/Fighting.', useWhen:'Offensive option when Tailwind is set. Dragon counter.' },
      'Encore': { purpose:'Forces opponent to repeat last move 3 turns. Prankster +1 priority.', useWhen:'Lock TR setter into TR, lock Protect spam, lock setup.' },
    },
    counters: ['Taunt blocks Tailwind','Dark types immune to Prankster','Steel resists Moonblast'],
    keyInteractions: 'Prankster Tailwind is the strongest speed control tool in VGC. Encore can lock TR for a dead turn. Fairy STAB hard-checks Dragon Mega leads.'
  },
  'Flutter Mane': {
    role: 'Paradox Sweeper', tags: ['Protosynthesis','Fairy STAB','Ghost STAB','Ultra Fast'],
    moves: {
      'Moonblast': { purpose:'95 BP Fairy STAB. 30% SpA drop. Hits Dragon/Dark/Fighting.', useWhen:'Primary coverage vs most of meta.' },
      'Shadow Ball': { purpose:'80 BP Ghost STAB. Hits Ghost/Psychic.', useWhen:'Mirror matches, TR setters, Gholdengo.' },
      'Dazzling Gleam': { purpose:'80 BP Fairy spread. Hits both opponents.', useWhen:'Spread chip with Fairy type.' },
      'Psyshock': { purpose:'80 BP Psychic hits Defense not SpDef.', useWhen:'vs specially bulky mons (Cresselia, Blissey).' },
    },
    counters: ['Kingambit (Steel+Dark resists Fairy+Ghost)','Incineroar (Dark immune Ghost)','Amoonguss (Rage Powder)','Iron Hands'],
    keyInteractions: 'Protosynthesis under Sun boosts SpA 1.3x. 135 SpA + Protosynthesis rivals Choice Specs without the lock. 135 Spe outspeeds almost everything except Dragapult/Sneasler.'
  },
  'Tyranitar': {
    role: 'Sand Setter + Physical Tank', tags: ['Sand Stream','Rock STAB','Dark STAB','Specially Bulky'],
    moves: {
      'Rock Slide': { purpose:'75 BP Rock spread. 30% flinch. Primary spread damage.', useWhen:'Every turn vs non-Ground/Steel targets.' },
      'Crunch': { purpose:'80 BP Dark STAB. 20% Def drop. Single target.', useWhen:'Ghost/Psychic targets when spread not needed.' },
      'Ice Punch': { purpose:'75 BP Ice. Hits Dragon/Flying/Grass/Ground.', useWhen:'Garchomp (4x), Dragonite (4x), Altaria (4x), Landorus.' },
      'Protect': { purpose:'Shields 1 turn.', useWhen:'Dodge Earthquake from partner Excadrill. Scout turn.' },
    },
    counters: ['Fighting (4x)','Ground super-effective','Fairy super-effective','Wide Guard blocks Rock Slide'],
    keyInteractions: 'Sand Stream = permanent Sand (not overridden by other weather permanently). Mega Tyranitar SpDef x1.5 under Sand = incredibly specially bulky. Psychic immunity from Dark type.'
  },
  'Sneasler': {
    role: 'Physical Sweeper / KO Machine', tags: ['High Speed','Fighting STAB','Poison STAB','KO Stacker'],
    moves: {
      'Close Combat': { purpose:'120 BP Fighting STAB. -1 Def/-1 SpDef after. Destroys Steel/Normal/Ice.', useWhen:'Primary nuke. Hits Kingambit, Tyranitar, Incineroar super-effective.' },
      'Dire Claw': { purpose:'60 BP Poison. 50% chance Poison/Para/Sleep.', useWhen:'Chip + status fishing. Targets support mons.' },
      'Acrobatics': { purpose:'110 BP Flying (no item). Hits Grass/Fighting/Bug.', useWhen:'vs Amoonguss, Fighting types.' },
      'Fake Out': { purpose:'+3 Priority flinch. Normal type. Ghost immune.', useWhen:'Turn 1 flinch deny setup.' },
    },
    counters: ['Psychic (super-effective vs Fight/Poison)','Fairy types','Ground (immune Poison)','Ghost immune Fake Out'],
    keyInteractions: '130 Atk + 120 Speed = premier physical attacker speed class. Dire Claw in 2 uses = ~75% status chance. Fake Out + Dire Claw = flinch turn 1, status turn 2 combo.'
  },
  'Kingambit': {
    role: 'Win Condition — Supreme Overlord', tags: ['Supreme Overlord','Priority','Steel STAB','Dark STAB'],
    moves: {
      'Kowtow Cleave': { purpose:'85 BP Dark never-miss STAB. Supreme Overlord makes this a nuke.', useWhen:'Primary STAB. Reliable, never misses.' },
      'Sucker Punch': { purpose:'70 BP Dark +1 Priority. Fails vs non-attacking moves.', useWhen:'Closing vs faster mons. Fails vs Protect/status.' },
      'Iron Head': { purpose:'80 BP Steel STAB. 30% flinch. Hits Fairy.', useWhen:'vs Fairy types. Flinch fishing.' },
      'Low Kick': { purpose:'Weight-based Fighting. Heavy mons = 120 BP.', useWhen:'vs other Kingambit (4x Fighting), vs Normal types.' },
    },
    counters: ['Fighting (4x weakness)','Ground super-effective','Fire super-effective','Wide Guard','Intimidate before Overlord activates'],
    keyInteractions: 'Supreme Overlord: +10% Atk per fainted mon EITHER side. +3 KOs = +30%, +5 KOs = +50% Atk. Strategy: use Sneasler to stack KOs early then bring Kingambit. Sucker Punch requires bait — use Protect turn then attack.'
  },
  'Cofagrigus': {
    role: 'Trick Room Setter', tags: ['Trick Room','Mummy','Anti-Fake Out','Defensive Anchor'],
    moves: {
      'Trick Room': { purpose:'Reverses Speed 5 turns. Ghost type = Fake Out fails (Normal immune).', useWhen:'Turn 1. Mummy means physical contact copier gets Mummy ability.' },
      'Shadow Ball': { purpose:'80 BP Ghost STAB. Hits Ghost/Psychic.', useWhen:'vs mirror Ghost TR setters, Cresselia.' },
      'Will-O-Wisp': { purpose:'Burns opponent — halves Atk, chip.', useWhen:'vs Physical attackers trying to break through.' },
    },
    counters: ['Taunt blocks TR','Dark immune to Ghost','Fast Fake Out on Cresselia partner'],
    keyInteractions: 'Mummy: when hit by contact move, attacker gets Mummy (replaces their ability). Negates Intimidate, Sand Rush, Multiscale on contact. Ghost = immune to Normal/Fighting = Fake Out FAILS.'
  },
  'Gholdengo': {
    role: 'Utility Blocker / SpA', tags: ['Good as Gold','Anti-Status','Steel STAB','Ghost STAB'],
    moves: {
      'Make It Rain': { purpose:'120 BP Steel spread. -1 SpA after. Hits both opponents.', useWhen:'Spread nuke early. Hits Ice/Fairy/Rock super-effective.' },
      'Shadow Ball': { purpose:'80 BP Ghost STAB. 20% SpDef drop.', useWhen:'Ghost/Psychic single targets.' },
      'Nasty Plot': { purpose:'+2 SpA. Safe setup move.', useWhen:'When safe behind redirection/Protect.' },
      'Thunderbolt': { purpose:'90 BP Electric coverage.', useWhen:'Water/Flying targets resisting Steel+Ghost.' },
    },
    counters: ['Dark types (Ghost immune)','Ground super-effective vs Steel','Fire super-effective vs Steel'],
    keyInteractions: 'Good as Gold: immune to ALL status moves, Taunt, Encore, Trick Room, Encore. Cannot be Taunted or directly statused. Make It Rain is one of the strongest spread moves at 120 BP.'
  },
  'Amoonguss': {
    role: 'Defensive Support / Redirector', tags: ['Rage Powder','Spore','Redirection','Grass-Poison'],
    moves: {
      'Rage Powder': { purpose:'Forces ALL moves to target Amoonguss for 1 turn. +2 priority.', useWhen:'Protect your sweeper from targeted moves. Block Fake Out. Redirect spread.' },
      'Spore': { purpose:'100% accurate Sleep. Most broken status move in VGC.', useWhen:'Every safe turn. Sleep = 2-3 turns free.' },
      'Sludge Bomb': { purpose:'90 BP Poison STAB. 30% Poison chance.', useWhen:'Fairy types. General offense.' },
      'Pollen Puff': { purpose:'90 BP Bug. On ally: heals 50% HP.', useWhen:'Heal partner in doubles. Bug vs Psychic/Dark/Grass.' },
    },
    counters: ['Fire (4x)','Ice (Blizzard, Freeze-Dry 4x)','Flying (immune Ground, resist Grass)','Gholdengo (immune to Spore via Good as Gold)'],
    keyInteractions: 'Spore is the most game-breaking move in VGC — 100% sleep. Rage Powder forces ALL moves to Amoonguss, protecting sweeper. Regenerator heals 1/3 HP on switch-out = nearly impossible to wear down.'
  },
};

function detectTeamArchetypes(teamKey) {
  const meta = TEAM_META[teamKey];
  if (meta && meta.archetypes) return meta.archetypes;
  const team = TEAMS[teamKey];
  if (!team || !team.members) return ['balance'];
  const tags = new Set();
  const allMoves = team.members.flatMap(m => m.moves || []);
  const allAbilities = team.members.map(m => m.ability || '');
  const allNames = team.members.map(m => m.name);
  if (allAbilities.includes('Drought') || allMoves.includes('Sunny Day')) tags.add('weather_sun');
  if (allAbilities.includes('Drizzle') || allMoves.includes('Rain Dance')) tags.add('weather_rain');
  if (allAbilities.includes('Sand Stream')) tags.add('weather_sand');
  if (allMoves.includes('Trick Room')) tags.add('trick_room');
  if (allMoves.includes('Aurora Veil')) tags.add('veil');
  if (allMoves.includes('Tailwind')) tags.add('control');
  if (allNames.includes('Kingambit')) tags.add('kingambit');
  if (allMoves.filter(m => ['Earthquake','Rock Slide','Heat Wave','Eruption','Hyper Voice'].includes(m)).length >= 2) tags.add('aggressive');
  return tags.size > 0 ? [...tags] : ['balance'];
}

function getTeamGuide(teamKey) {
  const meta = TEAM_META[teamKey];
  if (!meta) return { archetypes: detectTeamArchetypes(teamKey), guide: 'Run simulations to generate pilot advice.', counters: [], setupPlays: [] };
  return meta;
}

function renderArchetypeTags(archetypes) {
  return (archetypes || []).map(a => {
    const arch = TEAM_ARCHETYPES[a];
    if (!arch) return '';
    return `<span class="archetype-tag" style="background:${arch.color}20;color:${arch.color};border:1px solid ${arch.color}40;display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;cursor:default" title="${arch.desc}">${arch.icon} ${arch.label}</span>`;
  }).join('');
}

function renderMoveLog(pokemonName) {
  const log = POKEMON_MOVE_LOG[pokemonName];
  if (!log) return `<div style="color:#888;font-style:italic;font-size:0.78rem;padding:8px">No detailed move log for ${pokemonName}.</div>`;
  let html = `<div style="margin-top:4px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
      <span style="font-weight:700;font-size:0.85rem">${pokemonName}</span>
      <span style="background:rgba(114,137,218,0.2);border:1px solid rgba(114,137,218,0.4);color:#7289da;padding:1px 8px;border-radius:999px;font-size:0.7rem;font-weight:600">${log.role}</span>
      ${log.tags.map(t=>`<span style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#aaa;padding:1px 6px;border-radius:4px;font-size:0.65rem;text-transform:uppercase">${t}</span>`).join('')}
    </div>
    <div style="background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:6px;padding:5px 9px;font-size:0.73rem;color:#e74c3c;margin-bottom:5px">⚠️ <strong>Countered by:</strong> ${log.counters.join(' · ')}</div>
    <div style="background:rgba(93,173,226,0.08);border:1px solid rgba(93,173,226,0.2);border-radius:6px;padding:5px 9px;font-size:0.73rem;color:#5dade2;margin-bottom:8px;line-height:1.5">💡 ${log.keyInteractions}</div>
    <div style="display:flex;flex-direction:column;gap:6px">`;
  for (const [moveName, data] of Object.entries(log.moves)) {
    const mtype = (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[moveName]) || 'Normal';
    const col = (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[mtype]) || '#888';
    html += `<div style="background:var(--surface2,#1e1e2e);border:1px solid var(--border,#333);border-radius:7px;padding:8px 10px">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;padding-left:6px;border-left:3px solid ${col}">
        <span style="font-weight:700;font-size:0.83rem">${moveName}</span>
        <span style="background:${col};color:#fff;padding:1px 6px;border-radius:4px;font-size:0.63rem;font-weight:700;text-transform:uppercase">${mtype}</span>
      </div>
      <div style="font-size:0.77rem;color:#aaa;line-height:1.5;margin-bottom:3px">${data.purpose}</div>
      <div style="font-size:0.73rem;color:#a9d18e;line-height:1.45"><strong style="color:#82c37d">Use when:</strong> ${data.useWhen}</div>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderSetupPlays(teamKey) {
  const meta = TEAM_META[teamKey];
  if (!meta || !meta.setupPlays || !meta.setupPlays.length) return '<em style="color:#888;font-size:0.78rem">Run simulations for setup play recommendations.</em>';
  return meta.setupPlays.map(sp => `
    <div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--border,#333)">
      <div style="flex-shrink:0;width:50px;background:rgba(114,137,218,0.12);border:1px solid rgba(114,137,218,0.3);border-radius:6px;color:#7289da;font-size:0.7rem;font-weight:700;text-align:center;padding:3px;display:flex;align-items:center;justify-content:center">T${sp.turn}</div>
      <div style="flex:1;font-size:0.78rem;line-height:1.6">
        <div style="color:#ccc;margin-bottom:2px">📍 Lead: <strong>${sp.lead}</strong></div>
        <div style="color:#5dade2;margin-bottom:2px">▶ ${sp.action}</div>
        <div style="color:#888;font-style:italic">🎯 ${sp.condition}</div>
      </div>
    </div>
  `).join('');
}

function renderStrategyTab(teamKey) {
  const el = document.getElementById('tab-strategy');
  if (!el) return;
  const guide = getTeamGuide(teamKey);
  const team = TEAMS[teamKey];
  const archetypes = guide.archetypes || detectTeamArchetypes(teamKey);
  const teamName = team ? (team.name || teamKey) : teamKey;

  el.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <label style="font-size:0.78rem;font-weight:600;color:#aaa">Strategy for:</label>
        <select id="strategy-team-picker" style="font-size:0.8rem;padding:4px 8px;background:var(--surface2,#1e1e2e);border:1px solid var(--border,#444);color:#ccc;border-radius:6px" onchange="renderStrategyTab(this.value)">
          ${Object.keys(TEAMS).map(k=>`<option value="${k}" ${k===teamKey?'selected':''}>${TEAMS[k].name||k}</option>`).join('')}
        </select>
      </div>

      <div style="background:var(--surface2,#1e1e2e);border:1px solid var(--border,#333);border-radius:10px;padding:14px;margin-bottom:14px">
        <div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#7289da;margin-bottom:8px">${teamName} — ${guide.style || 'Strategy'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${renderArchetypeTags(archetypes)}</div>
        <div style="font-size:0.8rem;line-height:1.7;color:#aaa;white-space:pre-line">${guide.guide || 'Run simulations for pilot advice.'}</div>
        ${guide.counters && guide.counters.length ? `
          <div style="margin-top:10px">
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:#7289da;margin-bottom:6px">⚠️ Primary Counters</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${guide.counters.map(c=>`<span style="background:rgba(231,76,60,0.12);border:1px solid rgba(231,76,60,0.35);color:#e74c3c;padding:2px 8px;border-radius:999px;font-size:0.7rem;font-weight:600">${c}</span>`).join('')}</div>
          </div>` : ''}
        ${guide.setupPlays && guide.setupPlays.length ? `
          <div style="margin-top:12px">
            <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:#7289da;margin-bottom:6px">⚡ Setup Plays</div>
            ${renderSetupPlays(teamKey)}
          </div>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${(team && team.members || []).filter(m => POKEMON_MOVE_LOG[m.name]).map(m => `
          <div style="background:var(--surface2,#1e1e2e);border:1px solid var(--border,#333);border-radius:10px;padding:12px">
            ${renderMoveLog(m.name)}
          </div>
        `).join('')}
      </div>
    </div>`;
}



// ============================================================
// STRATEGY UI INTEGRATION — Tab init, archetype injection
// ============================================================

(function initStrategyUI() {
  function waitForReady(fn, maxMs) {
    const start = Date.now();
    const check = () => {
      if (typeof TEAMS !== 'undefined' && typeof TEAM_META !== 'undefined') { fn(); return; }
      if (Date.now() - start < (maxMs||5000)) setTimeout(check, 100);
    };
    check();
  }

  function addStrategyTabIfMissing() {
    if (document.getElementById('tab-strategy')) return;

    // Add tab button
    const tabBar = document.querySelector('.tab-bar, .tabs, [role="tablist"]') ||
                   document.querySelector('.tab-btn')?.parentElement;
    if (tabBar) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.tab = 'strategy';
      btn.innerHTML = '🧠 Strategy';
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-strategy').classList.add('active');
        const sel = document.getElementById('player-select')?.value ||
                    document.getElementById('opponent-select')?.value ||
                    Object.keys(TEAMS)[0];
        renderStrategyTab(sel);
      });
      tabBar.appendChild(btn);
    }

    // Add tab panel
    const panel = document.createElement('div');
    panel.className = 'tab-panel';
    panel.id = 'tab-strategy';
    panel.style.cssText = 'display:none';
    panel.innerHTML = '<div style="padding:20px;color:#888;font-style:italic">Click the 🧠 Strategy tab above to open strategy guides.</div>';
    const container = document.querySelector('.tab-panels, .tab-content, main') ||
                      document.querySelector('.tab-panel')?.parentElement;
    if (container) container.appendChild(panel);
  }

  function injectArchetypeTagsIntoTeams() {
    document.querySelectorAll('.team-card, [data-team-key]').forEach(card => {
      const teamKey = card.dataset.teamKey || card.dataset.key;
      if (!teamKey || card.querySelector('.arch-tags-injected')) return;
      const archetypes = detectTeamArchetypes(teamKey);
      const wrapper = document.createElement('div');
      wrapper.className = 'arch-tags-injected';
      wrapper.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin:5px 0';
      wrapper.innerHTML = renderArchetypeTags(archetypes);
      const nameEl = card.querySelector('.team-name, h3, .team-card-name, strong') || card.firstElementChild;
      if (nameEl && nameEl.parentNode === card) nameEl.insertAdjacentElement('afterend', wrapper);
      else card.insertAdjacentElement('afterbegin', wrapper);
    });
  }

  function patchStrategyTabButtons() {
    // Wire existing tab button if it was added in HTML
    const stratBtn = document.querySelector('[data-tab="strategy"]');
    if (stratBtn && !stratBtn._strategyWired) {
      stratBtn._strategyWired = true;
      stratBtn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        stratBtn.classList.add('active');
        const panel = document.getElementById('tab-strategy');
        if (panel) panel.classList.add('active');
        const sel = document.getElementById('player-select')?.value || Object.keys(TEAMS)[0];
        renderStrategyTab(sel);
      });
    }

    // When player-select changes, update strategy tab if it's visible
    document.getElementById('player-select')?.addEventListener('change', (e) => {
      const panel = document.getElementById('tab-strategy');
      if (panel && (panel.classList.contains('active') || panel.style.display !== 'none')) {
        renderStrategyTab(e.target.value);
      }
    });
  }

  waitForReady(() => {
    addStrategyTabIfMissing();
    patchStrategyTabButtons();
    setTimeout(injectArchetypeTagsIntoTeams, 400);

    // Inject into Teams tab on click
    document.querySelector('[data-tab="teams"]')?.addEventListener('click', () => {
      setTimeout(injectArchetypeTagsIntoTeams, 200);
    });
  }, 8000);
})();
