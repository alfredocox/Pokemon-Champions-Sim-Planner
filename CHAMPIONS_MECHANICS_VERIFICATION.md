# Champions 2026 Mechanics Verification

*Research completed: April 2026. Sources: Serebii, Game8, Bulbapedia, Victory Road, MetaVGC, IGN, games.gg, Pikalytics, GamesRadar.*

---

## Executive Summary

**What changed from SV VGC:**
- **IVs**: All Pokémon now have perfect IVs (31 across all stats) — no more 0-Speed IV trick room optimization
- **EV system replaced**: Stat Points (SP) replace EVs entirely. 66 total SP, 32 per stat cap; stat formulas are new
- **Stat alignment replaces Natures**: Alignment (0.9 / 1.0 / 1.1 multiplier) replaces Nature system
- **Status conditions nerfed**: Paralysis full-para chance halved (25% → 12.5%); Sleep capped at 3 turns max; Freeze capped at 3 turns max with 25% thaw chance each turn
- **Protect PP halved**: 16 → 8 PP
- **Fake Out locked**: Cannot be selected after first turn (greyed out in UI)
- **Life Orb, Choice Band, Choice Specs, Assault Vest, Rocky Helmet, Heavy-Duty Boots ABSENT** from item pool at launch
- **No automatic terrain setters** legal in Reg M-A (no Rillaboom, no Indeedee) — "Terrain Vacuum"
- **Weather durations**: 5 turns standard (same as Gen 8+), rock extension items implied but not confirmed in game yet
- **New abilities**: Piercing Drill, Dragonize, Mega Sol, Spicy Spray (Mega-exclusive)
- **Updated abilities**: Unseen Fist now deals 25% damage through Protect (previously full damage); Scrappy blocks Intimidate
- **Fake Out priority**: Confirmed +3 (unchanged from SV), but UI locks it after first use

**What stayed the same:**
- Type chart: identical to Gen 6+ (18 types, Fairy rules unchanged); no new types
- Critical hits: 1.5× multiplier (Gen 6 rule), 1/24 base rate
- Spread move modifier: 0.75× in doubles (confirmed by community)
- Follow Me / Rage Powder: +2 priority, redirects single-target moves
- Wide Guard: +3 priority, protects both allies from spread moves
- Trick Room: −7 priority, 5 turns, reverses speed order within brackets (priority unaffected)
- Tailwind: 4 turns, doubles Speed for user's side
- Terrain effects: 5 turns (Terrain Extender for 8 turns not yet confirmed as available in Champions)
- Leftovers: 1/16 HP per turn (confirmed in game)
- Focus Sash: survives 1 KO hit at full HP (confirmed)
- Choice Scarf: +50% Speed, locks move (confirmed in game)
- Species Clause, Item Clause confirmed
- Bring 6 pick 4 in doubles

**Still unconfirmed / unknown:**
- Weather rock items (Heat Rock, Damp Rock, etc.) — referenced in videos but not confirmed in Champions item pool
- Terrain Extender — listed as "future item" by Game8
- Exact Tailwind interaction when set mid-turn vs. start of turn (SV rule was instantaneous)
- Whether Assault Vest / Life Orb will be added in future updates
- Speed tie resolution (random vs. deterministic)
- Exact match clock: Victory Road lists 20 min game time TBC, 7 min player timer TBC, 45 s move time TBC

---

## Per-System Findings

### Stat Points (SP)

**Rules:**
- Each Pokémon has **66 Stat Points total**, **32 SP cap per individual stat**
- Replaces EVs entirely; no IV variation (all IVs fixed at 31)
- VP cost: 5 VP per SP assigned (330 VP for full 66 SP from scratch); removal is free
- When a HOME Pokémon visits Champions for the first time, EVs are converted to SP: 4 EVs = 1st SP in a stat, 8 EVs per additional SP. A Pokémon fully EV'd in 3–4 stats arrives with max 65 SP; 5–6 stats = 66 SP cap

**Formulas (confirmed by Bulbapedia primary source):**

| Stat | Formula |
|------|---------|
| HP | `Base + StatPoints + 75` |
| All Others | `⌊(Base + StatPoints + 20) × Alignment⌋` |

Where `Alignment` = 0.9 (lowered), 1.0 (neutral), or 1.1 (raised)

**Source-confirmed:** YES
- [Bulbapedia — Stat point](https://bulbapedia.bulbagarden.net/wiki/Stat_point) (primary)
- [Game8 — What Are Stat Points?](https://game8.co/games/Pokemon-Champions/archives/538683)

**Conflicts:** None found. Both sources agree on 66 total / 32 per stat / formulas above.

**Implementation notes:**
- This replaces the SV formula: `⌊((2×Base + IV + ⌊EV/4⌋) × Level/100 + Level + 10) × Nature⌋`
- The new HP formula omits IV contribution (always 31 baked in) and uses a simplified flat constant (+75)
- The non-HP formula constant is +20 instead of SV's dynamic IV/EV/level scaling
- No need for Nature lookup table; replace with Alignment 3-way enum

---

### Status Conditions

| Condition | SV / Prior Effect | Champions New Effect | Source-Confirmed |
|-----------|------------------|---------------------|-----------------|
| **Burn** | −50% Attack; 1/16 HP end-of-turn | **Unchanged** — same Attack cut and residual | No direct Serebii change listed = unchanged |
| **Paralysis** | 25% full-para chance; −50% Speed | **12.5% full-para chance**; Speed still −50% | YES — [Serebii](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) |
| **Sleep** | Lasts 2–4 turns (random); cannot act | **Max 3 turns**; 33.3% wake chance on Turn 2; 100% wake on Turn 3 | YES — [Serebii](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |
| **Freeze** | Indefinite; 20% thaw each turn | **Max 3 turns**; 25% thaw chance per turn; guaranteed thaw on turn 3 | YES — [Serebii](https://www.serebii.net/pokemonchampions/statusconditions.shtml) |
| **Poison** | 1/8 HP per turn | **Unchanged** | Not listed as changed |
| **Toxic (Bad Poison)** | Escalating: 1/16, 2/16, 3/16… | **Unchanged** | Not listed as changed |
| **Confusion** | 1/3 chance to hit self each turn (SV) | **Unchanged** | Not listed as changed |
| **Flinch** | Prevents action that turn, Speed-dependent | **Unchanged** | Not listed as changed |

**Critical hit and Burn interaction:** Even in Champions, a critical hit does NOT bypass the burn Attack penalty. Confirmed by [games.gg crit guide](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/).

**Additional move-based status notes (from Game8 moves page):**
- Scald / Scorching Sands: Still cure Freeze on use (30% burn chance)
- Flare Blitz: Still cures user's Freeze, 10% burn chance on target
- Inferno: Still 100% burn
- Zap Cannon: Still 100% paralysis
- Electric-type Terrain blocks Sleep for grounded Pokémon
- Misty Terrain blocks all major status conditions for grounded Pokémon

---

### Doubles Mechanics

| Mechanic | Champions Behavior | Source |
|----------|-------------------|--------|
| **Spread move modifier** | **0.75×** (75%) damage when targeting both opponents | [Reddit community confirmation](https://www.reddit.com/r/PokemonChampions/comments/1sl16f6/in_doubles_how_does_spread_damage_interact_with/); consistent with SV |
| **Spread + Protect** | Target still counts; 0.75× applies to Pokemon that IS hit | [Reddit thread](https://www.reddit.com/r/PokemonChampions/comments/1sl16f6/) |
| **Follow Me** | +2 priority; redirects all single-target moves to user | [Game8 Priority page](https://game8.co/games/Pokemon-Champions/archives/591716), [YouTube](https://www.youtube.com/watch?v=fAcyIs5XT5Y) |
| **Rage Powder** | +2 priority; same as Follow Me (identical effect) | [Game8 Priority page](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Wide Guard** | +3 priority; blocks spread moves for both allies that turn | [Serebii attackdex Champions](https://www.serebii.net/attackdex-champions/wideguard.shtml), [Game8](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Protect** | +4 priority; successive use → 1/3 success each time; **PP reduced to 8** | [Game8 Priority page](https://game8.co/games/Pokemon-Champions/archives/591716); PP change [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) |
| **Ally damage from spread moves** | Wide Guard blocks ally-hitting spread moves (e.g. Surf, EQ hitting partner) | [Serebii Wide Guard](https://www.serebii.net/attackdex-champions/wideguard.shtml) |
| **Fake Out** | +3 priority; only selectable on user's first turn in battle — greyed out after | [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/), [GamesRadar](https://www.gamesradar.com/games/pokemon/pokemon-champions-patches-out-strategies-competitive-players-have-been-using-for-years-but-hey-at-least-freeze-has-finally-been-nerfed/) |
| **Helping Hand** | +5 priority; +50% ally move power | [Game8 Priority page](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Dragon Darts targeting** | Smart targeting: if one target uses Protect, both darts hit the other target | [Reddit thread](https://www.reddit.com/r/PokemonChampions/comments/1sl16f6/) |

**Note on ally damage:** Wide Guard protects allies from friendly-fire spread moves (e.g., using Earthquake when your ally is grounded). Grassy Terrain halves Earthquake/Bulldoze damage (but no auto-Grassy Terrain setters are legal in Reg M-A).

---

### Speed / Turn Order

| Mechanic | Champions Behavior | Source |
|----------|-------------------|--------|
| **Priority bracket range** | −7 to +5 | [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Within-bracket tie** | Higher Speed stat moves first | [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Speed tie (equal Speed)** | Random (implied; not explicitly confirmed in Champions) | Standard Pokémon rule; no Champions-specific change noted |
| **Trick Room** | −7 priority; 5 turns; reverses Speed order within brackets; priority moves unaffected | [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716), [MetaVGC](https://metavgc.com/guides/vgc-speed-control-tailwind-vs-trick-room) |
| **Tailwind** | Doubles Speed for 4 turns for user's side | [MetaVGC guide](https://metavgc.com/guides/vgc-speed-control-tailwind-vs-trick-room) |
| **Paralysis Speed penalty** | −50% Speed (unchanged) | [Serebii](https://www.serebii.net/pokemonchampions/statusconditions.shtml) |
| **Choice Scarf** | +50% Speed, locks move | [Game8 Items](https://game8.co/games/Pokemon-Champions/archives/588871) |
| **Quick Claw** | 20% chance to go first within same priority bracket | [Game8 Items](https://game8.co/games/Pokemon-Champions/archives/588871) |
| **Prankster** | +1 priority to all status moves | [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Gale Wings** | +1 priority to Flying-type moves at full HP | [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716) |
| **Trick Room + IVs** | All IVs fixed at 31; cannot have 0-Speed IVs | [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |

**Key priority table (selected moves):**

| Priority | Examples |
|----------|---------|
| +5 | Helping Hand |
| +4 | Protect, Detect, Endure, Baneful Bunker, Spiky Shield, King's Shield, Obstruct, Magic Coat, Snatch |
| +3 | Wide Guard, Quick Guard, Fake Out, Crafty Shield, Spotlight |
| +2 | Follow Me, Rage Powder, Ally Switch, First Impression, Extreme Speed, Feint |
| +1 | Quick Attack, Aqua Jet, Sucker Punch, Thunderclap, Mach Punch, Bullet Punch, Accelerock, Shadow Sneak, Ice Shard, Jet Punch, Water Shuriken, Baby-Doll Eyes |
| 0 | Standard moves |
| −7 | Trick Room |

---

### Weather

| Weather | Trigger Abilities | Primary Effect | Secondary Effect | Duration |
|---------|------------------|----------------|-----------------|----------|
| **Harsh Sunlight** | Drought, Mega Sol | Fire ×1.5; Water ×0.5 | No Freeze; Synthesis 66% heal | **5 turns** |
| **Rain** | Drizzle | Water ×1.5; Fire ×0.5 | Hurricane/Thunder 100% acc | **5 turns** |
| **Sandstorm** | Sand Stream, Sand Spit | 1/16 HP chip (non-Rock/Ground/Steel) | +50% SpDef for Rock-types | **5 turns** |
| **Snow** | Snow Warning | Blizzard 100% accuracy | +50% Defense for Ice-types | **5 turns** |

**Key findings:**
- All weather durations confirmed at **5 turns** regardless of ability or move activation ([Game8 Weather](https://game8.co/games/Pokemon-Champions/archives/594098), [MetaVGC](https://metavgc.com/guides/pokemon-champions-weather-and-terrain))
- **Weather rock items (Heat Rock, Damp Rock, Smooth Rock, Icy Rock) for 8-turn extension**: Referenced in YouTube guides as expected functionality but **not confirmed in the Champions item list at launch** ([Game8 Items list](https://game8.co/games/Pokemon-Champions/archives/588871) does not include them)
- **Slower Pokémon's weather wins** when two setters enter simultaneously (consistent with SV rule)
- **Mega Evolution Disruption**: Mega transformation occurs at start of turn, so Mega Charizard Y's Drought can overwrite weather set by a slower Pokémon that entered the same turn ([MetaVGC](https://metavgc.com/guides/pokemon-champions-weather-and-terrain))
- **Terrain Vacuum**: No auto-terrain setters legal in Reg M-A (no Tapus, no Rillaboom, no Indeedee)
- Cloud Nine eliminates weather effects
- **Mega Sol** (new ability on Mega Meganium): Acts as if sun is active regardless of actual weather — unique to Champions

---

### Terrain

| Terrain | Offensive Effect | Defensive/Secondary Effect | Duration |
|---------|-----------------|---------------------------|----------|
| **Electric** | Electric moves +30% power | Prevents Sleep for grounded Pokémon; Surge Surfer doubles Speed | **5 turns** |
| **Grassy** | Grass moves +30% power | 1/16 HP heal end of turn; Earthquake/Bulldoze/Magnitude ×0.5 | **5 turns** |
| **Psychic** | Psychic moves +30% power | Blocks priority moves against grounded targets | **5 turns** |
| **Misty** | Dragon moves ×0.5 | Immunity to all major status conditions and Confusion | **5 turns** |

**Key findings:**
- All terrains: **5 turns** ([Game8 Terrain](https://game8.co/games/Pokemon-Champions/archives/594155), [MetaVGC](https://metavgc.com/guides/pokemon-champions-weather-and-terrain))
- **Terrain Extender for 8-turn extension**: "may be a good idea" language from Game8 — **not yet in Champions item pool**
- Terrain only affects grounded Pokémon (Flying-types and Levitate users immune unless grounded)
- **No automatic terrain-setting abilities** are legal in Reg M-A — all terrain must be set manually via moves (Electric Terrain, Grassy Terrain, etc.)
- Defog and Steel Roller remove terrain
- Affect on affected moves: Rising Voltage (Electric), Expanding Force (Psychic), Grassy Glide and halved Earthquake/Bulldoze (Grassy), Misty Explosion (Misty)

---

### Items

**Available in Champions at launch (confirmed):**

| Item | Effect | Category |
|------|--------|----------|
| Leftovers | Restores 1/16 max HP end of turn | Recovery |
| Choice Scarf | +50% Speed; locks move | Stat Boost |
| Focus Sash | Survive 1-hit KO at full HP (single use) | Stat Boost |
| White Herb | Restores lowered stats once (single use) | Stat Boost |
| Shell Bell | Restores 1/8 damage dealt as HP | Recovery |
| Sitrus Berry | Restores 1/4 HP when below 50% HP | Recovery |
| Lum Berry | Cures any status/confusion (single use) | Recovery |
| Scope Lens | +1 stage Crit ratio | Other |
| Quick Claw | 20% chance to move first within bracket | Other |
| Light Ball | Doubles Pikachu's Atk and SpAtk | Other |
| King's Rock | 10% flinch chance on hits | Other |
| Bright Powder | −10% opponent accuracy | Other |
| Mental Herb | Cures Infatuation/Taunt/Encore/etc. (single use) | Recovery |
| Type-boosting items (20 types) | +20% power for respective type | Power Boost |
| Defensive Berries (18 types) | Halve super-effective damage (single use) | Defense |
| Focus Band | 10% chance to survive KO | Recovery |
| Pecha/Rawst/Aspear/Cheri/Chesto Berry | Cure specific status (single use) | Recovery |
| Mega Stones | Allow Mega Evolution | Mega Stone |

**ABSENT at launch (significant competitive items):**

| Item | Notes |
|------|-------|
| Life Orb | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/) |
| Choice Band | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |
| Choice Specs | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/) |
| Assault Vest | Not in game — [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/) |
| Rocky Helmet | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |
| Heavy-Duty Boots | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |
| Black Sludge | Not in game — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) |
| Eviolite | Not in game (Pikachu only unevolved; no Eviolite) |
| Light Clay | Not in game — [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/) |
| Heat/Damp/Smooth/Icy Rock | Not confirmed in item pool |
| Terrain Extender | Not confirmed in item pool |
| Toxic Orb / Flame Orb | Not confirmed |

**For engine implementation:** Treat Life Orb multiplier as N/A in current format. Type-boosting items = ×1.2. Choice Scarf = ×1.5 Speed, move-lock applies.

---

### Type Chart

| Finding | Detail | Source |
|---------|--------|--------|
| Number of types | **18** (Normal, Fire, Water, Grass, Flying, Fighting, Poison, Electric, Ground, Rock, Psychic, Ice, Bug, Ghost, Steel, Dragon, Dark, Fairy) | [Beebom 2026](https://beebom.com/pokemon-type-chart/) |
| New types in Champions | **None** | No source mentions new types |
| Fairy rules | Same as Gen 6+: immune to Dragon; SE vs Dragon/Dark/Fighting; resists Bug/Dark/Fighting; Steel resists Fairy | Unchanged from SV |
| Changes from SV | **None confirmed** | Champions uses same Gen 6+ chart |
| In-game type chart | Champions includes an official type chart in-game UI | [Reddit](https://www.reddit.com/r/pokemon/comments/1slus79/pokemon_champions_has_a_type_chart_ingame/) |

**Implementation:** Use the standard Gen 6+ type effectiveness matrix unchanged. No modifications needed.

---

### Critical Hits

| Parameter | Champions Value | Source |
|-----------|----------------|--------|
| Crit multiplier | **1.5×** (Gen 6+ rule) | [games.gg crit guide](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/), [Game8](https://game8.co/games/Pokemon-Champions/archives/594137) |
| Base crit rate | **1/24 ≈ 4.17%** | [games.gg](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/), [Game8](https://game8.co/games/Pokemon-Champions/archives/594137) |
| Crit ignores | Attack/SpAtk drops on attacker; Defense/SpDef boosts on defender; Reflect/Light Screen | [Game8](https://game8.co/games/Pokemon-Champions/archives/594137) |
| Crit does NOT ignore | Burn's Attack penalty on attacker | [games.gg](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/) |
| +1 stage crit moves | Blaze Kick, Cross Poison, Triple Arrows, Sky Attack, Stone Edge, Slash, Leaf Blade, Crabhammer, Karate Chop | Game8 move list |
| +2 stage items/moves | Scope Lens (item, passive); Focus Energy (status move); Dragon Cheer (support, +2 for Dragon allies, +1 for others) | [games.gg](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/) |
| Guaranteed crit moves | Flower Trick, Storm Throw, Frost Breath | [games.gg](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/) |

**Implementation:** Use 1.5× multiplier (not the 2× from Gen 1–5). Stage system: base = 1/24, +1 stage increases probability significantly (exact per-stage table not published in Champions docs; use Gen 9 stage table as baseline).

---

### Reg M-A Ruleset

| Parameter | Value | Source |
|-----------|-------|--------|
| Format | **Doubles** | [Victory Road](https://victoryroad.pro/champions-regulations/), [Serebii Reg M-A](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) |
| Team size | Bring **4–6**, pick **4** for battle | [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Level cap | **Level 50** (auto-level) | [Serebii](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml), [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Species Clause | **Yes** — no two Pokémon with same National Dex number | [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Item Clause | **Yes** — no two Pokémon holding same item | [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Mega Evolutions | **Allowed** (Reg M-A is the Mega format) | [Serebii](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) |
| Game time clock | **20 minutes** *(TBC — Victory Road notes unconfirmed)* | [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Player time ("Your Time") | **10 minutes** (Serebii) / **7 minutes TBC** (Victory Road) | Conflicting sources |
| Team preview | **90 seconds** | [Serebii](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) |
| Move time limit | **60 seconds** (Serebii) / **45 seconds TBC** (Victory Road) | Conflicting sources |
| Pokémon Restrictions | Paldea Pokédex + Mega Evolutions + HOME-eligible mons; Paldea Origin Mark required for ranked | [Serebii](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) |
| Active period | April 8 – June 17, 2026 | [Serebii](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) |
| Restricted species list | No Paradox Pokémon; no Treasures of Ruin; non-fully evolved Pokémon excluded (except Pikachu) | [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Open team lists | **Yes** at TPCi events; players swap lists before battle | [Victory Road](https://victoryroad.pro/champions-regulations/) |
| Best-of format | Swiss = Bo1 or Bo3; Top Cut = **Bo3** | [Victory Road](https://victoryroad.pro/champions-regulations/) |

---

### Ability Changes (Non-Mega)

**New abilities introduced in Champions:**

| Ability | Effect | Pokémon |
|---------|--------|---------|
| Piercing Drill | Contact moves hit through Protect, dealing 1/4 damage; all other effects (status, etc.) still trigger | Mega Excadrill |
| Dragonize | Normal-type moves → Dragon-type, +20% power boost | Mega Dragonite |
| Mega Sol | Acts as if harsh sunlight is active regardless of actual weather | Mega Meganium |
| Spicy Spray | When Pokémon takes damage, burns the attacker | Mega Scovillain |

Source: [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)

**Updated abilities:**

| Ability | Prior Effect | Champions Effect | Source |
|---------|-------------|-----------------|--------|
| Unseen Fist | Hit through Protect (full damage) | Hit through Protect, deals **25% of normal damage** | [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml) |

*(Note: Unseen Fist now matches Piercing Drill — both deal 1/4 damage through Protect)*

**Scrappy (confirmed in Champions):**
- Allows Normal/Fighting moves to hit Ghost-types
- **Blocks Intimidate** — Pokémon with Scrappy are immune to Intimidate's Attack drop
- Source: [Serebii AbilityDex](https://www.serebii.net/abilitydex/scrappy.shtml)

**Intimidate (confirmed behavior):**
- Lowers all adjacent opponents' Attack by 1 stage upon entry
- Blocked by: Clear Body, Hyper Cutter, White Smoke, Inner Focus (Gen 8+), Scrappy (Gen 8+), Oblivious, Own Tempo, Guard Dog (raises Attack instead)
- Source: [Bulbapedia Intimidate](https://bulbapedia.bulbagarden.net/wiki/Intimidate_(Ability)), [Game8 Intimidate](https://game8.co/games/Pokemon-Champions/archives/593590)

**Mega Evolution timing and Intimidate interaction (Champions-specific):**
- Mega Evolution occurs at start of turn. If a Pokémon's ability changes upon Mega Evolution (e.g., base Kangaskhan → Mega Kangaskhan gains Parental Bond; base Lucario → Inner Focus), the Mega ability activates after transformation
- This means: Incineroar entering same turn as a non-Mega Kangaskhan can Intimidate it before it Mega Evolves, as the transformation doesn't have Scrappy yet. After transformation, Scrappy blocks future Intimidates
- Source: [YouTube analysis](https://www.youtube.com/watch?v=m-k5-ThSWKM)

**Other notable abilities confirmed in game:**
- Prankster: +1 priority to status moves (Whimsicott, Mega Banette)
- Gale Wings: +1 priority to Flying moves at full HP (Talonflame)
- Armor Tail / Queenly Majesty: Block priority moves against holder and allies
- Sand Rush / Swift Swim / Chlorophyll / Slush Rush: Double Speed in respective weather
- Surge Surfer: Double Speed in Electric Terrain
- Mimicry: Type changes to match terrain
- Parental Bond (Mega Kangaskhan): Hits twice — second hit at 25% power

---

### Pokémon HOME Transfer

| Rule | Detail | Source |
|------|--------|--------|
| Transfer mechanism | "Visit" model — Pokémon remains in HOME, is borrowed by Champions | [IGN HOME guide](https://www.ign.com/wikis/pokemon-champions/How_to_Link_Pokemon_Champions_to_Pokemon_HOME), [Game8](https://game8.co/games/Pokemon-Champions/archives/501825) |
| Transfer platform | **Switch HOME only** — mobile HOME cannot initiate transfers | [YouTube guide](https://www.youtube.com/watch?v=9etf-PgMFAY) |
| Eligible Pokémon | Only Pokémon available within Champions (fully-evolved, Reg M-A eligible) can visit | [Game8](https://game8.co/games/Pokemon-Champions/archives/501825) |
| Champions → HOME | Pokémon obtained **inside Champions cannot be sent to HOME** | [Game8](https://game8.co/games/Pokemon-Champions/archives/501825), [pkmbuy.com](https://www.pkmbuy.com/news/pok-mon-champions-transfer-guide) |
| IV/EV conversion | On first visit: EVs converted to SP at rate of 4 EVs = 1st SP, 8 EVs = each additional SP. IVs set to 31 regardless | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Stat_point) |
| Unusable moves | If a visitor knows a move unavailable in Champions, **the move must be changed before use** (costs VP) | [Game8](https://game8.co/games/Pokemon-Champions/archives/501825) |
| Training persistence | Training done in Champions does NOT reflect in HOME; but if the same Pokémon visits again, its Champions training is saved (as long as form is unchanged) | [Game8](https://game8.co/games/Pokemon-Champions/archives/501825), [pkmbuy.com](https://www.pkmbuy.com/news/pok-mon-champions-transfer-guide) |
| Form change reset | If Pokémon is sent back to HOME, moved to another game, and **form changed**, all Champions training resets | [pkmbuy.com](https://www.pkmbuy.com/news/pok-mon-champions-transfer-guide) |
| Cost of return | Sending back to HOME is **free** (no VP cost) | [YouTube](https://www.youtube.com/watch?v=5A4oXlbzgw0) |

---

## Conflicts Found

| System | Field | Value A | Source A | Value B | Source B | Recommended Resolution |
|--------|-------|---------|----------|---------|----------|----------------------|
| Reg M-A | Player time ("Your Time") | 10 minutes | Serebii | 7 minutes (TBC) | Victory Road | **Use Serebii's 10 minutes** — more specific and not flagged as TBC |
| Reg M-A | Move time limit | 60 seconds | Serebii | 45 seconds (TBC) | Victory Road | **Use Serebii's 60 seconds** — Victory Road explicitly marks as TBC |
| Freeze | Thaw chance | 25% | Serebii, games.gg | 50% | IGN | **Use 25% from Serebii** (primary source); IGN likely misread |
| Wide Guard | PP | 12 PP (Serebii attackdex-champions) | Serebii | (legacy PP was 8) | Prior games | **Use 12 PP** per Champions-specific Serebii page |
| Weather rocks | Available | Implied yes (video guides) | YouTube community | Not in item list | Game8 Items List | **Treat as unavailable until confirmed** in Game8 item DB |

---

## Still Unknown

| Topic | What's Missing | Recommended Follow-up |
|-------|---------------|----------------------|
| Speed tie resolution | Whether ties are broken randomly or deterministically in Champions | Test in-game: same-Speed Pokémon, same move, log order over 100 battles |
| Weather rock items | Not in confirmed item list; videos reference them | Monitor Game8 item list for future updates |
| Terrain Extender | Listed as future item | Monitor Game8 item list |
| Exact thaw table | Gen 9 had a 3-turn cap implied; Serebii confirms 3-turn cap + 25% chance, but exact Stage 1/2/3 probabilities not fully documented | Datamine or additional Serebii pages |
| Assault Vest future availability | Mentioned as absent; may return | Monitor official Pokémon Champions patch notes |
| Life Orb future availability | Absent at launch | Monitor patch notes |
| Knock Off availability | Incineroar notably **cannot use Knock Off** in Champions | Community verified; engine should remove Knock Off from Incineroar learnset |
| Spread modifier exact value | Community consensus 0.75×, but no official in-game documentation found | Community calc tests; consistent with SV precedent |
| Speed order instantaneous update | SV rule: Speed changes (paralysis, Tailwind, Icy Wind) take effect immediately within the turn; Champions likely same | Verify with in-game testing |
| Burn Attack penalty value | Assumed −50% (unchanged from SV/Gen 9) | No official Champions page found confirming; Serebii only listed changed conditions |
| Confusion self-hit damage | Assumed 40 base power typeless, Gen 7+ (33% self-hit) | Not confirmed; use Gen 7+ formula |
| Toxic escalation | Assumed unchanged (1/16, 2/16…) per turn | Not mentioned in any Champions change list |
| Leech Seed / Ingrain | Assumed unchanged | Not mentioned in any Champions change list |

---

## Recommended Engine Behaviors

### Stat Calculation
```
HP stat = Base + SP + 75
Other stat = floor((Base + SP + 20) * Alignment)
  Alignment: 0.9 (lowered), 1.0 (neutral), 1.1 (raised)
SP: 0–32 per stat, 0–66 total
All IVs = 31 (do not expose IV slider in engine)
```

### Status Conditions
```
Paralysis:
  - Speed multiplier: 0.5×
  - Full-para probability: 0.125 (12.5%)

Sleep:
  - Turn 1: cannot act, 0% wake
  - Turn 2: cannot act, 33.3% wake chance
  - Turn 3: guaranteed wake (100%)
  - REST special case: wake on turn 3 (same as standard)

Freeze:
  - Each turn: 25% thaw chance
  - Turn 3: guaranteed thaw (100% forced)
  - Sun weather: immune to Freeze; immediately thaws if frozen when Sun activates
  - Scald / Scorching Sands / Flare Blitz: immediately thaw freeze

Burn:
  - Attack multiplier: 0.5×
  - End-of-turn damage: 1/16 max HP
  - Critical hits do NOT ignore burn Attack penalty

Poison:
  - End-of-turn damage: 1/8 max HP

Toxic (Bad Poison):
  - End-of-turn damage: N/16 max HP where N increments each turn (1, 2, 3...)
```

### Doubles Damage
```
Spread move modifier: 0.75× when move targets both opponents
  - Applies even if one target used Protect (the non-protected target still takes 0.75×)
  - Ally damage from spread moves also uses 0.75× (e.g., Surf hitting partner)
  - Wide Guard (+3 priority) blocks all spread moves for both allies
```

### Critical Hits
```
Base rate: 1/24
Multiplier: 1.5×
Ignores: attacker's Atk/SpAtk drops; defender's Def/SpDef boosts; Reflect/Light Screen
Does NOT ignore: burn Attack penalty
Guaranteed crits: Flower Trick, Storm Throw, Frost Breath
Stage 0 (base): 1/24; Stage 1: 1/8; Stage 2: 1/2; Stage 3+: guaranteed
  (Use Gen 9 stage table as baseline — no Champions-specific deviation confirmed)
```

### Items
```
Available:
  Leftovers: +1/16 HP end of turn
  Choice Scarf: ×1.5 Speed, move-lock
  Focus Sash: survive 1-hit KO at full HP (single use)
  White Herb: restore stat drops (single use)
  Shell Bell: heal 1/8 damage dealt
  Sitrus Berry: heal 1/4 HP at ≤50% HP (single use)
  Scope Lens: +1 crit stage (persistent)
  Type gems (20 types): ×1.2 to respective type moves
  Defensive berries: ×0.5 to super-effective hit (single use)

NOT available (remove from engine or mark as illegal):
  Life Orb, Choice Band, Choice Specs, Assault Vest,
  Rocky Helmet, Heavy-Duty Boots, Black Sludge, Eviolite,
  Light Clay, Heat Rock, Damp Rock, Smooth Rock, Icy Rock,
  Terrain Extender, Toxic Orb, Flame Orb
```

### Weather
```
All weather: 5 turns duration
No rock extension items confirmed; treat as non-existent for now
Terrain: 5 turns duration (no Terrain Extender available)
No automatic terrain setters in Reg M-A
```

### Priority Brackets
```
+5: Helping Hand
+4: Protect, Detect, Endure, King's Shield, Obstruct, Baneful Bunker, Spiky Shield, Magic Coat, Snatch
+3: Wide Guard, Quick Guard, Fake Out*, Crafty Shield, Spotlight
+2: Follow Me, Rage Powder, Ally Switch, First Impression, Extreme Speed, Feint
+1: Quick Attack, Aqua Jet, Mach Punch, Bullet Punch, Sucker Punch, Thunderclap,
    Shadow Sneak, Ice Shard, Accelerock, Jet Punch, Water Shuriken, Baby-Doll Eyes
 0: Standard moves
-7: Trick Room

*Fake Out: available only on user's first turn in battle; engine should reject selection after first turn

Trick Room: reverses order WITHIN brackets only; priority moves still execute in priority order
Tailwind: doubles Speed for 4 turns on user's side
All IVs fixed at 31; 0-Speed IV builds are not legal
```

### HOME Transfer
```
Visitor Pokémon with unavailable moves: flag move as illegal; require move slot change before battle
EV → SP conversion (reference only, not engine-critical):
  4 EVs = first SP in stat; 8 EVs = each subsequent SP
Pokémon caught in Champions: cannot be sent to HOME
Training in Champions: not reflected in HOME
```

---

*Sources used: [Serebii Reg M-A](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) · [Serebii Status Conditions](https://www.serebii.net/pokemonchampions/statusconditions.shtml) · [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml) · [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml) · [Bulbapedia Stat Point](https://bulbapedia.bulbagarden.net/wiki/Stat_point) · [Game8 Stat Points](https://game8.co/games/Pokemon-Champions/archives/538683) · [Game8 Items](https://game8.co/games/Pokemon-Champions/archives/588871) · [Game8 Priority Brackets](https://game8.co/games/Pokemon-Champions/archives/591716) · [Game8 Weather](https://game8.co/games/Pokemon-Champions/archives/594098) · [Game8 Terrain](https://game8.co/games/Pokemon-Champions/archives/594155) · [Game8 HOME](https://game8.co/games/Pokemon-Champions/archives/501825) · [Game8 Crit](https://game8.co/games/Pokemon-Champions/archives/594137) · [Victory Road Regulations](https://victoryroad.pro/champions-regulations/) · [MetaVGC Weather/Terrain](https://metavgc.com/guides/pokemon-champions-weather-and-terrain) · [IGN Biggest Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) · [games.gg Status Nerfs](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) · [games.gg Item List](https://games.gg/news/pokemon-champions-items-list-meta/) · [games.gg Crit Guide](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/) · [GamesRadar Fake Out](https://www.gamesradar.com/games/pokemon/pokemon-champions-patches-out-strategies-competitive-players-have-been-using-for-years-but-hey-at-least-freeze-has-finally-been-nerfed/) · [Pikalytics Speed Tiers](https://www.pikalytics.com/speed-tiers)*
