# CHAMPIONS_MECHANICS_SPEC.md
**Source of Truth for Pokémon Champions 2026 Battle Engine Implementation**
Last updated: 2026-04

> **Confidence tags used throughout:**
> - `CHAMPIONS-CONFIRMED` — explicitly stated in Champions-specific source (Serebii Champions pages, Game8 Champions, IGN Champions coverage, official VGC regulations)
> - `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — no Champions-specific deviation found; value matches Gen 9 SV; treat as correct unless contradicted
> - `CHAMPIONS-UNKNOWN` — insufficient Champions-specific evidence; do not assume, flag for testing

---

## 1. STATUS CONDITIONS

### 1.1 Burn
- **Atk modifier:** ×0.5 to physical moves for the burned Pokémon `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Chip damage:** 1/16 max HP per end-of-turn `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Guts interaction:** Guts negates Atk drop (still takes chip) `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Toxic Orb / Flame Orb:** Flame Orb is **NOT currently in Champions** (confirmed absent at launch per [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained)); Toxic Orb also absent. Marvel Scale and Poison Heal are effectively nerfed for this reason. `CHAMPIONS-CONFIRMED`
- **Champions deviation:** None found for burn mechanics themselves; but Orb items missing from launch item pool.
- **Sources:** [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [Game8 Changes List](https://game8.co/games/Pokemon-Champions/archives/593893)

### 1.2 Paralysis
- **Full-paralysis rate:** **12.5%** (was 25% in prior gens) `CHAMPIONS-CONFIRMED`
- **Speed modifier:** Speed reduced to **50%** of max (unchanged from SV) `CHAMPIONS-CONFIRMED`
- **Electric-type immunity:** Electric types immune to Paralysis (Gen 6+, unchanged) `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Champions deviation:** Full-paralysis chance halved from 25% → 12.5%. Speed reduction unchanged.
- **Sources:** [Serebii Champions Status Conditions](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg status nerfs](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/)

### 1.3 Sleep
- **Normal sleep (not Rest):** Lasts **1–2 turns**. 33.3% chance to wake on Turn 2 of sleep; **guaranteed wake on Turn 3** (i.e., max duration is 2 turns of being unable to move, always wakes on the turn after that). `CHAMPIONS-CONFIRMED`
  - IGN wording: "will wake up by the second turn at most" for non-Rest sleep.
  - Serebii wording: "33.3% chance of waking on Turn 2 of Sleep. 100% on Turn 3."
  - **Implementation note:** Turn count starts at 0 when status is applied. On Turn 1 of sleep: cannot move (no wake check). On Turn 2: 33.3% chance to wake. Turn 3: guaranteed wake.
- **Rest sleep:** Pokémon sleeps for **3 turns** before waking (buffed from 2 turns in SV). `CHAMPIONS-CONFIRMED`
- **Sleep Talk interaction:** `CHAMPIONS-UNKNOWN` — no Champions-specific source found; assume SV behavior (can use Sleep Talk while asleep, acts as normal turn, does not reduce sleep counter in Champions—needs verification).
- **Early Bird:** `CHAMPIONS-UNKNOWN` — Early Bird is not on any current Champions-available Pokémon; behavior unconfirmed.
- **Wake on switch:** `CHAMPIONS-UNKNOWN` — no Champions-specific ruling found; assume no (sleep persists through switches, SV behavior).
- **Sources:** [Serebii Champions Status Conditions](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/)

### 1.4 Freeze
- **Thaw rate per turn:** **25%** chance to thaw when the frozen Pokémon attempts to use a move (up from 20% in prior gens) `CHAMPIONS-CONFIRMED`
- **Guaranteed thaw turn:** Always thaws on **Turn 3** of being frozen (3-turn maximum). `CHAMPIONS-CONFIRMED`
- **Fire-move self-thaw:** Being hit by a damaging Fire-type move that can inflict burn immediately thaws `CHAMPIONS-LIKELY-INHERITED-FROM-SV` (confirmed by [Bulbapedia Champions entry](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition)): "Can be thawed immediately by certain Fire-type moves")
- **Sun thaw:** Cannot be frozen in harsh sunlight; existing freeze is NOT auto-cured by sun (same as SV) `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Ice-type immunity to Freeze:** Ice types cannot be frozen `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Champions deviation:** Thaw chance raised 20%→25%. Guaranteed thaw on Turn 3 (was unlimited prior gens).
- **Sources:** [Serebii Champions Status Conditions](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [Game8 Changes](https://game8.co/games/Pokemon-Champions/archives/593893), [Bulbapedia Freeze](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition)), [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/)

### 1.5 Frostbite
- **Does Champions use Frostbite instead of Freeze?** **NO.** Freeze exists in Champions as a status condition (explicitly listed in Serebii's status changes page). Frostbite was a Legends: Arceus-exclusive mechanic and was not in Legends: Z-A. Community consensus (Smogon thread): "Frostbite will never happen, it wasn't even in ZA." `CHAMPIONS-CONFIRMED`
- **Sources:** [Serebii Champions Status Conditions](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [Smogon Champions thread](https://www.smogon.com/forums/threads/pok%C3%A9mon-champions-releasing-april-8-2026.3779617/page-9)

### 1.6 Poison / Badly Poisoned (Toxic)
- **Regular Poison:** 1/8 max HP chip per turn `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Badly Poisoned (Toxic):** Escalates N/16 per turn (N=1 on first tick, +1 each subsequent turn) `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Poison-type immunity:** Poison and Steel types immune to being Poisoned `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Toxic Spikes interaction:** Toxic Spikes not currently in Champions (VGC Doubles format; entry hazards generally not relevant in 4v4 doubles). `CHAMPIONS-LIKELY-INHERITED-FROM-SV` for mechanics if ever relevant.
- **Toxic Orb:** **NOT in Champions** at launch. `CHAMPIONS-CONFIRMED`
- **Champions deviation:** No mechanical deviation found for poison itself.
- **Sources:** [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained)

### 1.7 Confusion
**Champions:** Inherited from SV. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Duration:** 2–5 turns (random at application)
- **Self-hit rate:** 33% per attempt; self-hit is typeless physical 40 BP, no STAB, no crit (uses attacker's own Atk vs Def)
- **Misty Terrain immunity:** Grounded Pokémon immune to confusion under Misty Terrain

### 1.8 Other Residual / Damage-over-Time Effects (V2 additions)

| Effect | End-of-turn damage | Notes | Confidence |
|---|---|---|---|
| Curse (Ghost-type Curse on target) | **1/4 max HP** | Non-volatile; persists through switch | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Bound / Trapped (Bind, Wrap, Fire Spin, Whirlpool, Infestation, Sand Tomb, Magma Storm, Clamp, Thunder Cage, Snap Trap) | **1/8 max HP** | 4–5 turns; 7 turns with Grip Claw (if available); user can't switch | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Leech Seed | **1/16 max HP** drained, restored to seeder | Grass types immune | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Salt Cure | **1/16 max HP** (1/8 on Water or Steel) | Already in §14 | `CHAMPIONS-CONFIRMED` |

**Engine requirement (T9j.4):** residual handler must tick all of these after major status damage on end-of-turn phase, in a defined order: major status → Leech Seed → Curse → Bound → Salt Cure → Item heal (Leftovers, Shell Bell trigger, etc.).

---

## 2. WEATHER

> All weather durations: **5 turns** base (ability or move-triggered). Item extension (Heat Rock, etc.) extends to **8 turns** — see §2.5. `CHAMPIONS-CONFIRMED` for 5-turn base (Game8 Champions).

### 2.1 Sun (Harsh Sunlight)
| Effect | Value | Confidence |
|--------|-------|------------|
| Fire-type move boost | ×1.5 | `CHAMPIONS-CONFIRMED` |
| Water-type move penalty | ×0.5 | `CHAMPIONS-CONFIRMED` |
| Solar Beam / Solar Blade | 1-turn charge | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Freeze prevention | Pokémon cannot be Frozen in sunlight | `CHAMPIONS-CONFIRMED` |
| Chlorophyll | ×2 Speed | `CHAMPIONS-CONFIRMED` (listed in Game8 affected abilities) |
| Solar Power | Sp.Atk boosted, HP lost per turn | `CHAMPIONS-CONFIRMED` (listed) |
| Growth | +2 Atk/Sp.Atk instead of +1 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Thunder / Hurricane accuracy | Reduced to 50% | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Dry Skin | Takes 1/8 HP damage per turn, ×1.25 to Fire damage | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Harvest | 50% chance to restore used Berry | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Leaf Guard | Prevents status conditions | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

**Mega Sol** (new Champions ability on Mega Meganium): Acts as if harsh sunlight is active even without weather. `CHAMPIONS-CONFIRMED`

**Setter ability:** Drought (5 turns). `CHAMPIONS-CONFIRMED`

### 2.2 Rain
| Effect | Value | Confidence |
|--------|-------|------------|
| Water-type move boost | ×1.5 | `CHAMPIONS-CONFIRMED` |
| Fire-type move penalty | ×0.5 | `CHAMPIONS-CONFIRMED` |
| Thunder accuracy | 100% | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Hurricane accuracy | 100% | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Swift Swim | ×2 Speed | `CHAMPIONS-CONFIRMED` (listed) |
| Hydration | Cures status each turn | `CHAMPIONS-CONFIRMED` (listed) |
| Rain Dish | 1/16 max HP recovery per turn | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Solar Beam | 2-turn charge, halved damage | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Electro Shot | 1-turn charge (no charge needed) | `CHAMPIONS-CONFIRMED` (listed as affected move) |

**Setter ability:** Drizzle (5 turns). `CHAMPIONS-CONFIRMED`

### 2.3 Sandstorm
| Effect | Value | Confidence |
|--------|-------|------------|
| Chip damage | 1/16 max HP per turn to non-Rock/Ground/Steel types | `CHAMPIONS-CONFIRMED` |
| Rock-type Sp.Def boost | ×1.5 | `CHAMPIONS-CONFIRMED` |
| Sand Rush | ×2 Speed | `CHAMPIONS-CONFIRMED` (listed) |
| Sand Force | Rock/Ground/Steel moves ×1.3 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Sand Veil | Evasion +20% | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Overcoat | Immune to sandstorm chip | `CHAMPIONS-CONFIRMED` (listed) |

**Setter abilities:** Sand Stream (5 turns), Sand Spit (on taking damage, 5 turns). `CHAMPIONS-CONFIRMED`

### 2.4 Snow (replaces Hail in Gen 9)
| Effect | Value | Confidence |
|--------|-------|------------|
| Ice-type Defense boost | ×1.5 | `CHAMPIONS-CONFIRMED` |
| Chip damage | **None** (Snow does NOT deal chip damage; Hail did) | `CHAMPIONS-CONFIRMED` |
| Slush Rush | ×2 Speed | `CHAMPIONS-CONFIRMED` (listed) |
| Ice Body | 1/16 max HP recovery per turn | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Snow Cloak | Evasion +20% | `CHAMPIONS-CONFIRMED` (listed) |
| Aurora Veil | Can only be set during Snow | `CHAMPIONS-CONFIRMED` (listed as Snow-affected move) |
| Blizzard accuracy | 100% | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

**Champions deviation:** Game uses Snow (not Hail). Snow gives Ice Defense boost, no chip damage. `CHAMPIONS-CONFIRMED`
**Setter ability:** Snow Warning (5 turns). `CHAMPIONS-CONFIRMED`

### 2.5 Weather Rock Items
| Item | Effect | Confidence |
|------|--------|------------|
| Heat Rock | Sun → 8 turns | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — **item not confirmed present in Champions; likely ABSENT at launch** |
| Damp Rock | Rain → 8 turns | Same — **likely ABSENT** |
| Smooth Rock | Sand → 8 turns | Same — **likely ABSENT** |
| Icy Rock | Snow → 8 turns | Same — **likely ABSENT** |

> **NOTE:** None of these Rock weather-extending items appear in the confirmed Champions item list at launch. Weather is 5 turns fixed until confirmed otherwise. `CHAMPIONS-UNKNOWN` for item availability.

### 2.6 Weather Priority (Simultaneous Setting)
- When two Pokémon with weather-setting abilities enter the field simultaneously, **the slower Pokémon's weather overrides**. `CHAMPIONS-CONFIRMED` ([Game8 Champions Weather](https://game8.co/games/Pokemon-Champions/archives/594098))

### 2.7 Cloud Nine / Air Lock
- **Cloud Nine:** Eliminates effects of weather (listed in Champions source). `CHAMPIONS-CONFIRMED`
- **Air Lock:** Same effect as Cloud Nine `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- Neither of these abilities is currently on confirmed Champions roster Pokémon (Castform has Forecast, Rayquaza not in roster); confirm upon roster expansion.

---

## 3. TERRAIN

> All terrains last **5 turns**. Only affect **grounded** Pokémon (Flying types and Levitate users are unaffected unless grounded). `CHAMPIONS-CONFIRMED`
> **Terrain Extender:** Listed as unconfirmed for Champions ("may be a good idea to give it" — Game8 wording implies unavailable at launch). `CHAMPIONS-UNKNOWN`

### 3.1 Electric Terrain
| Effect | Value | Confidence |
|--------|-------|------------|
| Electric-type move boost (grounded) | **×1.3** | `CHAMPIONS-CONFIRMED` (Game8 Champions) |
| Sleep prevention (grounded) | Grounded Pokémon immune to sleep (Spore, Yawn, etc.) | `CHAMPIONS-CONFIRMED` |
| Affected moves | Rising Voltage, Terrain Pulse | `CHAMPIONS-CONFIRMED` |
| Seed boost | Electric Seed → +1 Defense | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — seed not confirmed in item list |

> **Important:** The terrain boost in Champions is **×1.3** NOT ×1.5 (SV VGC standard). This is a potential deviation. The Game8 Champions terrain page explicitly states 30%. Cross-check with engine.

**Setter abilities:** Electric Surge, Hadron Engine.

### 3.2 Psychic Terrain
| Effect | Value | Confidence |
|--------|-------|------------|
| Psychic-type move boost (grounded) | **×1.3** | `CHAMPIONS-CONFIRMED` (Game8) |
| Priority move block vs. grounded | Blocks all priority moves targeting grounded Pokémon | `CHAMPIONS-CONFIRMED` |
| Affected moves | Expanding Force, Terrain Pulse | `CHAMPIONS-CONFIRMED` |
| Seed boost | Psychic Seed → +1 Sp.Def | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — seed not confirmed |

**Setter ability:** Psychic Surge.

### 3.3 Grassy Terrain
| Effect | Value | Confidence |
|--------|-------|------------|
| Grass-type move boost (grounded) | **×1.3** | `CHAMPIONS-CONFIRMED` (Game8) |
| HP recovery (grounded) | 1/16 max HP per end-of-turn | `CHAMPIONS-CONFIRMED` |
| Earthquake / Magnitude / Bulldoze | Halved damage | `CHAMPIONS-CONFIRMED` (listed as "negatively affected" moves; Bulldoze and Earthquake explicitly listed) |
| Grassy Glide | +1 priority during Grassy Terrain | `CHAMPIONS-CONFIRMED` (listed as affected move) |
| Terrain Pulse | Becomes Grass-type | `CHAMPIONS-CONFIRMED` |
| Seed boost | Grassy Seed → +1 Defense | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — seed not confirmed |

**Setter ability:** Grassy Surge.

### 3.4 Misty Terrain
| Effect | Value | Confidence |
|--------|-------|------------|
| Dragon-type move penalty (grounded) | ×0.5 | `CHAMPIONS-CONFIRMED` (Game8) |
| Status immunity (grounded) | Immune to all major non-volatile status conditions and Confusion | `CHAMPIONS-CONFIRMED` |
| Affected moves | Misty Explosion, Terrain Pulse | `CHAMPIONS-CONFIRMED` |
| Seed boost | Misty Seed → +1 Sp.Def | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` — seed not confirmed |

**Setter ability:** Misty Surge.

### 3.5 Terrain Notes
- **Terrain Extender (5→8 turns):** `CHAMPIONS-UNKNOWN` — not confirmed in Champions item list.
- **Seed items:** Not confirmed available in Champions item pool at launch. `CHAMPIONS-UNKNOWN`

---

## 4. TRICK ROOM

| Property | Value | Confidence |
|----------|-------|------------|
| Duration | 5 turns (turn of activation counts, so 4 "effective" turns of reversed speed) | `CHAMPIONS-CONFIRMED` |
| Effect | Slower Pokémon move first (reversed Speed order) | `CHAMPIONS-CONFIRMED` |
| Priority | -7 (lowest priority, always last to execute on its turn) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Stacking / canceling | Setting Trick Room while already active cancels it immediately | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Ties under Trick Room | Ties resolved randomly (same as outside TR) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| IVs | All Pokémon have **perfect IVs** in Champions (no 0 Speed IV for TR); must use EVs to manipulate Speed `CHAMPIONS-CONFIRMED` |
| TR + Tailwind | Both can be active simultaneously; effects compound (Tailwind doubles Speed, TR reverses order of doubled Speeds) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

**Sources:** [games.gg TR Team](https://games.gg/news/pokemon-champions-trick-room-team-forfeits/), [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), YouTube speed control guide

---

## 5. TAILWIND

| Property | Value | Confidence |
|----------|-------|------------|
| Duration | **4 turns** (confirmed in Champions) | `CHAMPIONS-CONFIRMED` |
| Speed effect | Exactly **×2** Speed for all Pokémon on user's side | `CHAMPIONS-CONFIRMED` |
| Persists through switches | Yes, Tailwind persists; the speed boost applies to whichever Pokémon is on the field | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Defog interaction | Defog removes hazards; in Gen 7+ Defog removes screens but **not Tailwind** `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Stacking (both sides) | If both sides have Tailwind, speeds are both doubled — no net Speed advantage | `CHAMPIONS-CONFIRMED` (Reddit r/PokemonChampions) |

**Sources:** [Reddit Tailwind glitch clarification](https://www.reddit.com/r/PokemonChampions/comments/1sn5z8s/tailwind_glitch_or_am_i_miss_understanding_the/), YouTube HOW TO USE SPEED CONTROL

---

## 6. SCREENS

> **NOTE:** Light Clay, Choice Band, Choice Specs, Life Orb, Assault Vest, and Heavy-Duty Boots are **NOT available** in Champions at launch. `CHAMPIONS-CONFIRMED`

| Screen | Effect | Duration (base) | Duration (Light Clay) | Confidence |
|--------|--------|-----------------|----------------------|------------|
| Light Screen | Halves Special damage taken by user's side | 5 turns | 8 turns | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` for effect; Light Clay **ABSENT** |
| Reflect | Halves Physical damage taken by user's side | 5 turns | 8 turns | Same |
| Aurora Veil | Halves both Physical and Special; requires Snow to be active to set | 5 turns | 8 turns | Same |

**Doubles damage reduction:** In Doubles, screens reduce incoming damage to **2732/4096 (≈0.6670, ~2/3)** when more than one Pokémon is on the receiving side. In 1v1 situations within Doubles (when only one target remains on the side), it reduces to **2048/4096 (0.5, 1/2)** as in Singles. Use the exact fractions for integer-math golden tests. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

**Crit interaction:** Critical hits bypass screens entirely. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

**Screen removal moves:**
- Brick Break: removes opponent's screens `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- Psychic Fangs: removes opponent's screens `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- Raging Bull: removes opponent's screens `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

**Aurora Veil stacking note:** Aurora Veil does NOT stack with Light Screen + Reflect simultaneously for additional reduction — they cap at 2/3 / 1/2 reduction. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

**Light Clay availability:** `CHAMPIONS-UNKNOWN` — not in confirmed Champions item list. Screens are 5 turns until confirmed otherwise for the engine.

---

## 7. ABILITIES — CHAMPIONS DEVIATIONS

### 7.1 Abilities Confirmed Changed in Champions

| Ability | Prior Effect | Champions Effect | Confidence |
|---------|-------------|-----------------|------------|
| **Unseen Fist** | Contact moves deal full damage through Protect | Contact moves deal **25%** of normal damage through Protect | `CHAMPIONS-CONFIRMED` |
| **Healer** | 30% chance per turn to cure ally's status | **50%** chance per turn to cure ally's status | `CHAMPIONS-CONFIRMED` |
| **Unnerve** | Prevents opponent from using held Berries | May no longer suppress berries from entry-activation abilities (e.g., Hospitality, Drizzle activating Sitrus via timing); **potentially bugged** — unclear if intentional | `CHAMPIONS-UNKNOWN` |

**Sources:** [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml), [Game8 Changes](https://game8.co/games/Pokemon-Champions/archives/593893), [False Swipe Gaming YouTube](https://www.youtube.com/watch?v=bSamJ5plm-4)

### 7.2 New Champions-Introduced Abilities (Mega Evolutions)

| Ability | Effect | Pokémon | Confidence |
|---------|--------|---------|------------|
| **Piercing Drill** | Contact moves hit through Protect, dealing **25%** of would-be damage. All other contact effects (Rough Skin, Iron Barbs, etc.) still trigger. | Mega Excadrill (`Excadrite`) | `CHAMPIONS-CONFIRMED` |
| **Dragonize** | Normal-type moves become Dragon-type with **×1.2** power boost | Mega Feraligatr (`Feraligite`) | `CHAMPIONS-CONFIRMED` |
| **Mega Sol** | Always acts as if harsh sunlight is active (even without weather) | Mega Meganium (`Meganiumite`) | `CHAMPIONS-CONFIRMED` |
| **Spicy Spray** | When the Pokémon takes damage from a move, it **burns the attacker** | Mega Scovillain (`Scovillainite`) | `CHAMPIONS-CONFIRMED` |

**Source:** [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)

### 7.3 Parental Bond (Mega Kangaskhan)

- **Child hit power:** **25%** of normal damage (was 50% in Gen 6, nerfed to 25% in Gen 7+). Champions inherits the 25% value. `CHAMPIONS-CONFIRMED`
- **YouTube confirmation:** "Mega Kangaskhan has access to Parental Bond as its ability, which adds a 25% damage boost" — this phrasing means the second hit deals 25% of the base damage, making total ~125%.
- **Spread moves:** Parental Bond does NOT apply to spread moves (moves that hit both opponents). Applies only to single-target moves. `CHAMPIONS-CONFIRMED` (Reddit r/stunfisk 2026 thread)
- **Multi-hit moves:** Does not apply to multi-hit moves (Triple Axel, etc.) `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

**Sources:** [YouTube Kangaskhan video](https://www.youtube.com/watch?v=cV8_88U_OUM), [Reddit Parental Bond spread thread](https://www.reddit.com/r/stunfisk/comments/1sfxsl2/parental_bond_spread_moves_only_hit_once/)

### 7.4 Protean
- **Once per switch-in:** Protean only changes type **once per switch-in** (Gen 9 SV change, inherited). `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Mega Evolution resets Protean:** Mega Evolving Greninja resets the Protean "once per switch-in" rule, allowing one additional type change. `CHAMPIONS-CONFIRMED` (Reddit r/stunfisk)
- **Source:** [Reddit Protean Champions](https://www.reddit.com/r/stunfisk/comments/1sfkbif/protean_in_champions/)

### 7.5 Intimidate
- **Trigger:** On entry; drops all opponents' Attack by 1 stage. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Inner Focus / Own Tempo / Oblivious / Scrappy:** These abilities in SV **do not block Intimidate**. Intimidate is blocked by Clear Amulet (item) and abilities like Guard Dog. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Clear Amulet:** Not confirmed in Champions item list at launch. `CHAMPIONS-UNKNOWN`
- **Source:** [OP.GG Intimidate Champions](https://op.gg/pokemon-champions/abilities/intimidate)

### 7.6 Moody
- **Champions legality:** `CHAMPIONS-UNKNOWN` — no Pokémon with Moody is confirmed in the Champions roster at launch. Not applicable.

### 7.7 Other Relevant Abilities (Unchanged from SV)
| Ability | Effect | Confidence |
|---------|--------|------------|
| Sand Rush | ×2 Speed in Sandstorm | `CHAMPIONS-CONFIRMED` |
| Sand Force | Rock/Ground/Steel ×1.3 in Sandstorm | `CHAMPIONS-CONFIRMED` |
| Chlorophyll | ×2 Speed in Sun | `CHAMPIONS-CONFIRMED` |
| Swift Swim | ×2 Speed in Rain | `CHAMPIONS-CONFIRMED` |
| Slush Rush | ×2 Speed in Snow | `CHAMPIONS-CONFIRMED` |
| Intimidate | −1 Atk to all active opponents on entry | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Cloud Nine | Negates weather effects | `CHAMPIONS-CONFIRMED` |

---

## 8. ITEMS

> **Critical note:** Champions launched with a **limited item pool**. Many standard competitive items are ABSENT. This directly impacts engine logic — do not assume an item is available without checking the confirmed list.

### 8.1 Confirmed Available Items

| Item | Effect | Availability | Confidence |
|------|--------|-------------|------------|
| **Leftovers** | Restores **1/16** max HP at end of each turn | Starting item | `CHAMPIONS-CONFIRMED` |
| **Choice Scarf** | +50% Speed; locked to first move used | Starting item | `CHAMPIONS-CONFIRMED` |
| **Focus Sash** | Survive any OHKO at full HP with 1 HP; consumed | Starting item | `CHAMPIONS-CONFIRMED` |
| **Shell Bell** | Restores 1/8 of damage dealt | Shop 700 VP | `CHAMPIONS-CONFIRMED` |
| **Scope Lens** | +1 crit rate stage | Shop 1000 VP | `CHAMPIONS-CONFIRMED` |
| **King's Rock** | 10% flinch on damaging moves | Starting item | `CHAMPIONS-CONFIRMED` |
| **Bright Powder** | −10% accuracy on opponents' moves | Starting item | `CHAMPIONS-CONFIRMED` |
| **White Herb** | Restores lowered stats once; consumed | Starting item | `CHAMPIONS-CONFIRMED` |
| **Quick Claw** | 20% chance to move first in same priority bracket | Starting item | `CHAMPIONS-CONFIRMED` |
| **Mental Herb** | Cures infatuation, Taunt, etc.; consumed once | Shop 1000 VP | `CHAMPIONS-CONFIRMED` |
| **Focus Band** | 10% chance to survive OHKO with 1 HP | Starting item | `CHAMPIONS-CONFIRMED` |
| Type-boosting items (Charcoal, Magnet, etc.) | +20% power to matching type | Shop 700 VP | `CHAMPIONS-CONFIRMED` |
| **Light Ball** | Doubles Pikachu's Atk and Sp.Atk | Shop 1000 VP | `CHAMPIONS-CONFIRMED` |
| Resistance Berries (Occa, Passho, Wacan, etc.) | Halves super-effective damage of matching type | Shop 400 VP | `CHAMPIONS-CONFIRMED` |
| Status cure Berries (Cheri, Chesto, etc.) | Cures specific status | Shop 400 VP | `CHAMPIONS-CONFIRMED` |

### 8.2 Confirmed ABSENT Items at Launch

| Item | Confirmation |
|------|-------------|
| Life Orb | `CHAMPIONS-CONFIRMED` absent — [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/) |
| Choice Band | `CHAMPIONS-CONFIRMED` absent — "Choice Band... oddly absent" per IGN |
| Choice Specs | `CHAMPIONS-CONFIRMED` absent |
| Assault Vest | `CHAMPIONS-CONFIRMED` absent |
| Eviolite | `CHAMPIONS-CONFIRMED` absent (also no pre-evos except Pikachu) |
| Black Sludge | `CHAMPIONS-CONFIRMED` absent (not in item list) |
| Rocky Helmet | `CHAMPIONS-CONFIRMED` absent |
| Heavy-Duty Boots | `CHAMPIONS-CONFIRMED` absent |
| Toxic Orb | `CHAMPIONS-CONFIRMED` absent |
| Flame Orb | `CHAMPIONS-CONFIRMED` absent |
| Weakness Policy | `CHAMPIONS-CONFIRMED` absent at launch (community posts confirm) |
| Eject Button | `CHAMPIONS-UNKNOWN` — not in confirmed list; likely absent |
| Eject Pack | `CHAMPIONS-UNKNOWN` — not in confirmed list; likely absent |
| Red Card | `CHAMPIONS-UNKNOWN` — not in confirmed list; likely absent |
| Covert Cloak | `CHAMPIONS-UNKNOWN` — not in confirmed list; likely absent |
| Booster Energy | `CHAMPIONS-UNKNOWN` — Paradox Pokémon not in launch roster |
| Clear Amulet | `CHAMPIONS-UNKNOWN` — not in confirmed list |
| Sitrus Berry | `CHAMPIONS-UNKNOWN` — NOT in confirmed item list (only Oran Berry at 400 VP; Sitrus not listed) |
| Light Clay | `CHAMPIONS-UNKNOWN` — not in confirmed list |
| Weather rocks (Heat Rock, etc.) | `CHAMPIONS-UNKNOWN` — not in confirmed list |
| Terrain Extender | `CHAMPIONS-UNKNOWN` — not in confirmed list |

### 8.3 Items With Confirmed Mechanics

**Leftovers:** 1/16 max HP end-of-turn. `CHAMPIONS-CONFIRMED`

**Focus Sash:** Consumed on OHKO at full HP. Does not activate at partial HP. `CHAMPIONS-CONFIRMED`

**Choice Scarf:** +50% Speed; locked to first move after switch-in. `CHAMPIONS-CONFIRMED`

**Life Orb:** **ABSENT** — do not implement ×1.3 damage + 1/10 recoil for now. `CHAMPIONS-CONFIRMED`

**Black Sludge:** **ABSENT.** `CHAMPIONS-CONFIRMED`

**Sitrus Berry:** `CHAMPIONS-UNKNOWN` — not confirmed; assume absent until verified. If present, effect would be heal 25% at ≤50% HP (SV value).

**Figy/Wiki/Mago/Aguav/Iapapa Berries:** `CHAMPIONS-UNKNOWN` — not in confirmed launch list.

**Booster Energy (Paradox):** `CHAMPIONS-UNKNOWN` — irrelevant; no Paradox Pokémon in current roster.

---

## 9. DAMAGE FORMULA

### 9.0 Type Chart Display Labels (Champions-specific)

| Multiplier | Label displayed |
|---|---|
| 0× | Has no effect |
| 0.25× | **Mostly Ineffective** (new label; dual-type resist stack) |
| 0.5× | Not very effective |
| 1× | (regular) |
| 2× | Super Effective |
| 4× | **Extremely Effective** (new label; dual-type weakness stack) |

Underlying 18-type chart is unchanged from SV; only the two extreme labels are Champions-specific. `CHAMPIONS-CONFIRMED`

### 9.1 Core Formula
The damage formula is **Gen 5+ standard** (Gen 9 SV inherits this unchanged):

```
Damage = floor(floor(floor(2 × L / 5 + 2) × BP × A / D) / 50 + 2) × Modifiers
```

Where:
- `L` = attacker's level (always 50 in Champions)
- `BP` = effective base power
- `A` = relevant attacking stat (Attack or Sp.Atk, with stat stage multipliers applied)
- `D` = relevant defending stat (Defense or Sp.Def, with stat stage multipliers applied)

**At level 50:** `floor(2×50/5 + 2) = floor(22) = 22`, so the base becomes `floor(22 × BP × A / D / 50 + 2)`

`CHAMPIONS-LIKELY-INHERITED-FROM-SV` — no Champions-specific deviation found.

### 9.2 Modifier Chain (applied multiplicatively)

**Canonical final-modifier pipeline order** (apply in this sequence, with integer rounding after each step per Gen 5+ rules):

```
base → Targets(0.75 if spread) → ParentalBond(0.25 on hit 2) → Weather
     → Crit(1.5) → RandomRoll(86..100) → STAB(1.5 or 2.0 Adaptability)
     → TypeEff(0/0.25/0.5/1/2/4) → Burn(0.5 physical)
     → FinalMods(screens, Life Orb*, Friend Guard, Expert Belt, resist berries, etc.)
     → ProtectBypass(per-ability pct, e.g., 0.25 for Unseen Fist / Piercing Drill)
     → max(1, dmg) unless type immune → dmg % 65536 overflow cap
```
`CHAMPIONS-CONFIRMED` per second-source verification. *Life Orb absent at launch; listed for completeness.

| Modifier | Value | Notes | Confidence |
|----------|-------|-------|------------|
| Targets (Spread) | **0.75×** in Doubles when hitting multiple targets | Single target = 1.0× | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Weather | ×1.5 (boost) or ×0.5 (penalty) | See §2 | `CHAMPIONS-CONFIRMED` |
| Critical hit | **×1.5** | Crits also ignore: burn Atk drop, stat-lowering effects on attacker, stat-raising on defender, screens | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Random roll | **86–100%** | Each integer from 86 to 100, uniform distribution (**15 outcomes**) — Champions narrowed from SV's 85–100 per [Bulbapedia Champions mechanics](https://bulbapedia.bulbagarden.net/). **Empirical verification pending** (`MECH-ROLL-WINDOW`) | `CHAMPIONS-CONFIRMED` (second-source, pending replay verify) |
| Friend Guard (ally) | **×0.75** | Applies at final-mod stage when ally has ability; Doubles only | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| STAB | **×1.5** | Normal STAB | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Type effectiveness | ×2, ×0.5, ×0 | Multiplicative for dual types | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Burn | ×0.5 to Physical moves (burned attacker) | Unless Guts | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Screens | ×0.5 Singles / ×(2/3) Doubles | Only physical or special; crits bypass | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Terrain | ×1.3 for matching type on grounded | See §3 | `CHAMPIONS-CONFIRMED` |
| Helping Hand | ×1.5 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Charge | ×2 to Electric moves (when Charged) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

### 9.3 Critical Hit Rate
| Stage | Rate | Confidence |
|-------|------|------------|
| Base (Stage 0) | **1/24** (~4.17%) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` (Gen 6+ value) |
| Stage +1 (High-crit moves, Scope Lens) | **1/8** (12.5%) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Stage +2 | **1/2** (50%) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Stage +3 | **Always crits** (100%) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Crit damage multiplier | **×1.5** | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` (Gen 6+ value; was ×2 in gens 1–5) |
| Sniper | ×2.25 on crit (×1.5 × 1.5) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

**Note:** Scope Lens gives +1 crit stage. Super Luck also +1. Laser Focus gives +3 (always crit) on next move. Flower Trick, Wicked Blow, Storm Throw, Surging Strikes, Frost Breath always crit. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

### 9.4 STAB
| Condition | STAB Multiplier | Confidence |
|-----------|----------------|------------|
| Normal STAB | ×1.5 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Adaptability | ×2.0 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Tera (original type) | ×2.0 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Tera (new type) + old type STAB | ×2.0 from Tera type; ×1.5 from original types (separate) | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Adaptability + Tera (original type) | ×2.25 | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| Stellar Tera | Each type boosted once until used | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

### 9.5 Multi-Hit Moves
- **2–5 hit moves:** Each hit calculates independently with its own random roll. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Skill Link:** Always hits 5 times. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Parental Bond second hit:** 25% of each hit's damage (see §7.3). `CHAMPIONS-CONFIRMED`

---

## 10. TERA / DYNAMAX / MEGA

### 10.1 Terastallization
- **Legal in Champions:** **YES** — Tera is confirmed in Regulation Set M-A. `CHAMPIONS-CONFIRMED`
- **Once per battle:** Yes, one Tera per team per battle. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Tera Blast:** Changes type to Tera type; becomes Physical if Atk > Sp.Atk. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Stellar Tera:** Each type gets a one-time boost. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- **Open team sheets include Tera Type:** Yes — Tera Type listed on team sheet. `CHAMPIONS-CONFIRMED` (Victory Road regulations)
- **Sources:** [Nintendo Life](https://www.nintendolife.com/news/2026/03/pokemon-vgc-competitions-officially-transition-to-pokemon-champions), [games.gg Champions Battle Mechanics](https://games.gg/pokemon-champions/guides/pokmon-champions-battle-mechanics-and-vp-system-guide/)

### 10.2 Mega Evolution

**Format:** Reg M-A allows Mega Evolution; one Mega per trainer per match. `CHAMPIONS-CONFIRMED`
Source: [Victory Road Regulations](https://victoryroad.pro/champions-regulations/).

**Prerequisites:** Trainer must equip the Omni Ring accessory. The Pokémon must hold its species-specific Mega Stone. `CHAMPIONS-CONFIRMED`
Source: [Game8 Mega list](https://game8.co/games/Pokemon-Champions/archives/592472).

**Trigger:** Player-initiated during move selection via the Mega Evolution button. Modeled in engine as an automatic turn-start phase between switching and move execution. Simultaneous Mega (both sides on same turn) resolves by speed with random tiebreak — documented Champions behavior is "random" per [Game8 Known Bugs](https://game8.co/games/Pokemon-Champions/archives/593898); speed+RNG is a deterministic spec choice for sim reproducibility.

**Form swap on activation:**
- Stats swap to `CHAMPIONS_MEGAS[megaName].megaBaseStats`; HP% preserved.
- Types swap to `CHAMPIONS_MEGAS[megaName].types`.
- Ability swaps to `CHAMPIONS_MEGAS[megaName].ability`. Stat boosts, status, items, PP, turn counters, and side-state do NOT reset.

**Persistence:** Once evolved, form persists for the remainder of the battle including across switches. Does NOT revert on faint. Source: [Bulbapedia Mega Evolution](https://bulbapedia.bulbagarden.net/wiki/Mega_Evolution).

**Mega Stone is held item:** Mega Stone occupies the held item slot; Pokémon cannot hold another item. `CHAMPIONS-CONFIRMED`

**Strategic timing:** Timing matters — some team archetypes explicitly delay Mega by one or more turns for weather or setup optimization. Source: [Game8 Sun Team guide](https://game8.co/games/Pokemon-Champions/archives/594157).

**AI timing (sim default):** `MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE` — AI Megas on first turn the mon is active and the team has no prior Mega. Sweep results override this.

**Engine implementation (T9j.7, `Refs #23`):**
- `CHAMPIONS_BASE_ABILITIES` map (data.js) restores base ability at team-build time.
- `Pokemon.megaForm` stores the deferred Mega payload; constructor rewrites `name` to base species only when `item === megaStone`.
- `Pokemon.prototype.megaEvolve(log)` performs the form swap preserving HP%.
- `simulateBattle` runs a `tryMegaPhase(activeArr, sideFlagKey)` at start of every turn, after win-condition check, before action queue.
- `field.playerMegaUsed` / `field.oppMegaUsed` enforce one-per-team.

**Confirmed Mega Stones at launch (59 Mega forms):** See §10.4 below.

### 10.2.1 Trigger Sweep (sim-specific methodology)

The engine exports `runMegaTriggerSweep(teamA, teamB, bo, opts)` which computes the WR-by-trigger-turn curve for every Mega-capable mon on teamA vs teamB. Methodology:

- **Pass 1 (coarse):** For each Mega holder, iterate trigger turns 1..`maxTurn` and a `'never'` baseline, running `coarseN=50` battles per cell.
- **Pass 2 (refine):** Top 3 trigger turns by coarse WR are rerun at `refineN=500` battles each.
- **Output:** Per-Mega-slot structure `{ megaSlot, curve, refinedTop3, bestTurn }` suitable for JSON serialization. Consumed by:
  - **M2 Pilot Guide card:** "Best Mega trigger turn" per matchup.
  - **M3 Trend Dashboard:** Mega timing heatmap across all matchups.
- **Determinism:** Each cell uses per-battle seeds for reproducibility. `ci95` on each cell is Wilson 95% half-width.

### 10.3 Dynamax / Z-Moves
- **Dynamax in Champions:** **NOT legal at launch**. Strongly implied to come in future seasons. `CHAMPIONS-CONFIRMED`
- **Z-Moves in Champions:** **NOT legal at launch**. Strongly implied via Omni Ring (Z-Crystal symbol visible). `CHAMPIONS-CONFIRMED`
- **Sources:** [ComicBook.com](https://comicbook.com/gaming/feature/pokemon-battle-gimmicks-in-pokemon-champions-explained/), [Nintendo Wire](https://nintendowire.com/news/2026/02/27/heres-what-you-need-to-know-about-pokemon-champions/)

### 10.4 Confirmed Mega Stone List at Launch

| Mega Stone | Pokémon | How to Get |
|------------|---------|------------|
| Abomasite | Mega Abomasnow | Tutorial |
| Absolite | Mega Absol | Shop 2000 VP |
| Aerodactylite | Mega Aerodactyl | Shop 2000 VP |
| Aggronite | Mega Aggron | Tutorial |
| Alakazite | Mega Alakazam | Shop 2000 VP |
| Altarianite | Mega Altaria | Shop 2000 VP |
| Ampharosite | Mega Ampharos | Shop 2000 VP |
| Audinite | Mega Audino | Shop 2000 VP |
| Banettite | Mega Banette | Shop 2000 VP |
| Beedrillite | Mega Beedrill | Tutorial |
| Blastoisinite | Mega Blastoise | Shop 2000 VP |
| Cameruptite | Mega Camerupt | Shop 2000 VP |
| Chandelurite | Mega Chandelure | Shop 2000 VP |
| Charizardite X | Mega Charizard X | Shop 2000 VP |
| Charizardite Y | Mega Charizard Y | Shop 2000 VP |
| Chesnaughtite | Mega Chesnaught | Transfer Chesnaught from Z-A |
| Chimechite | Mega Chimecho | Shop 2000 VP |
| Clefablite | Mega Clefable | Shop 2000 VP |
| Crabominite | Mega Crabominable | Shop 2000 VP |
| Delphoxite | Mega Delphox | Transfer Delphox from Z-A |
| Dragoninite | Mega Dragonite | Shop 2000 VP (also S1 Battle Pass) |
| Drampanite | Mega Drampa | Shop 2000 VP |
| Emboarite | Mega Emboar | Shop 2000 VP / S1 Battle Pass |
| Excadrite | Mega Excadrill | Shop 2000 VP |
| Feraligite | Mega Feraligatr | Shop 2000 VP / S1 Battle Pass |
| Floettite | Mega Floette (Eternal) | Transfer Eternal Floette from Z-A |
| Froslassite | Mega Froslass | Shop 2000 VP |
| Galladite | Mega Gallade | Shop 2000 VP |
| Garchompite | Mega Garchomp | Tutorial |
| Gardevoirite | Mega Gardevoir | Shop 2000 VP |
| Gengarite | Mega Gengar | Shop 2000 VP |
| Glalitite | Mega Glalie | Shop 2000 VP |
| Glimmoranite | Mega Glimmora | Shop 2000 VP |
| Golurkite | Mega Golurk | Shop 2000 VP |
| Greninjite | Mega Greninja | Transfer Greninja from Z-A |
| Gyaradosite | Mega Gyarados | Tutorial |
| Hawluchanite | Mega Hawlucha | Shop 2000 VP |
| Heracronite | Mega Heracross | Tutorial |
| Houndoominite | Mega Houndoom | Shop 2000 VP |
| Kangaskhanite | Mega Kangaskhan | Shop 2000 VP |
| Lopunnite | Mega Lopunny | Shop 2000 VP |
| Lucarionite | Mega Lucario | Shop 2000 VP |
| Manectite | Mega Manectric | Tutorial |
| Medichamite | Mega Medicham | Shop 2000 VP |
| Meganiumite | Mega Meganium | Shop 2000 VP / S1 Battle Pass |
| Meowsticite | Mega Meowstic | Shop 2000 VP |
| Pidgeotite | Mega Pidgeot | Shop 2000 VP |
| Pinsirite | Mega Pinsir | Shop 2000 VP |
| Sablenite | Mega Sableye | Shop 2000 VP |
| Scizorite | Mega Scizor | Shop 2000 VP |
| Scovillainite | Mega Scovillain | Shop 2000 VP |
| Sharpedonite | Mega Sharpedo | Shop 2000 VP |
| Skarmorite | Mega Skarmory | Shop 2000 VP |
| Slowbronite | Mega Slowbro | Shop 2000 VP |
| Starminite | Mega Starmie | Shop 2000 VP |
| Steelixite | Mega Steelix | Tutorial |
| Tyranitarite | Mega Tyranitar | Shop 2000 VP |
| Venusaurite | Mega Venusaur | Shop 2000 VP |
| Victreebelite | Mega Victreebel | Shop 2000 VP |

*59 confirmed Mega forms at launch.* Source: [Game8 Mega Stones List](https://game8.co/games/Pokemon-Champions/archives/588885)

---

## 11. TURN STRUCTURE / PRIORITY

### 11.1 Priority Brackets

| Priority | Moves | Notes | Confidence |
|----------|-------|-------|------------|
| +5 | Helping Hand | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| +4 | Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, Obstruct, Silk Trap, Max Guard | PP reduced to **8** in Champions | `CHAMPIONS-CONFIRMED` for PP change |
| +3 | Fake Out, Wide Guard, Quick Guard, Magic Coat, Snatch | Fake Out can no longer be selected after first turn | `CHAMPIONS-CONFIRMED` |
| +2 | Extreme Speed, Feint | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| +1 | Aqua Jet, Bullet Punch, Ice Shard, Mach Punch, Quick Attack, Shadow Sneak, Sucker Punch, Vacuum Wave, Water Shuriken, First Impression, Grassy Glide (in Grassy Terrain) | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| 0 | Normal moves | | |
| -1 | Vital Throw | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| -3 | Focus Punch | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| -4 | Avalanche, Revenge | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| -5 | Counter, Mirror Coat | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| -6 | Roar, Whirlwind (irrelevant in 4v4) | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |
| -7 | Trick Room | | `CHAMPIONS-LIKELY-INHERITED-FROM-SV` |

**Pursuit:** `CHAMPIONS-UNKNOWN` — Pursuit was removed in Gen 8; behavior irrelevant.

### 11.2 Speed Tiebreaking
- Ties in speed are resolved **randomly** in competitive (50/50). `CHAMPIONS-LIKELY-INHERITED-FROM-SV`

### 11.3 Turn Order
1. All Pokémon select actions simultaneously (hidden)
2. Switches resolve before attacks
3. Mega Evolution is declared at move selection; Mega stats apply from the moment the turn resolves (before any moves execute)
4. Moves execute in priority order (ties broken by Speed, then randomly)

**Source:** [Clutch Points Mega Guide](https://clutchpoints.com/gaming/pokemon-champions-mega-evolutions-guide)

### 11.4 Fake Out
- Can only be used on the Pokémon's **first turn on the field**. `CHAMPIONS-LIKELY-INHERITED-FROM-SV`
- In Champions: **can no longer be selected after it has been used** (even if it would fail). This prevents using it to bait Sucker Punch, and effectively leaves the Pokémon with 3 usable moves for the rest of its time on field. `CHAMPIONS-CONFIRMED`

### 11.5 Protect and Variants (PP Change + Diminishing Returns)

**Success rate on consecutive use:** Each successful Protect in a row reduces the next Protect's success chance to **1/3 of the previous chance**. First use = 100%, second = 33.3%, third = 11.1%, fourth = 3.7%, etc. Non-Protect move resets the counter. `CHAMPIONS-CONFIRMED` (V2 verification)

**PP change:**
- All protection moves (Protect, Detect, King's Shield, Spiky Shield, Baneful Bunker, Obstruct, Silk Trap) now have **PP = 8** (halved from 16 in SV). `CHAMPIONS-CONFIRMED`

### 11.6 Timer / Draw Rule
- If the game timer expires with both players having the **same number of Pokémon remaining**, the result is now a **DRAW** (previously: player with higher % total HP wins). `CHAMPIONS-CONFIRMED`
- Source: [Game8 Changes](https://game8.co/games/Pokemon-Champions/archives/593893)

---

## 12. ITEMS THAT RESTORE / HEAL AT HP THRESHOLDS

| Item | Threshold | Heal | Champions Status | Confidence |
|------|-----------|------|-----------------|------------|
| Leftovers | End of turn (no threshold) | 1/16 max HP | **Available** | `CHAMPIONS-CONFIRMED` |
| Shell Bell | On dealing damage | 1/8 of damage dealt | **Available** | `CHAMPIONS-CONFIRMED` |
| Sitrus Berry | ≤50% HP | Heal 25% max HP | **NOT confirmed available** | `CHAMPIONS-UNKNOWN` |
| Oran Berry | ≤50% HP | Heal 10 HP flat | Available (listed at 400 VP) | `CHAMPIONS-CONFIRMED` |
| Figy/Wiki/Mago/Aguav/Iapapa | ≤25% HP | Heal 33% max HP; may confuse based on nature | **NOT confirmed available** | `CHAMPIONS-UNKNOWN` |
| Focus Sash | 100% HP OHKO | Survive with 1 HP; consumed | **Available** | `CHAMPIONS-CONFIRMED` |
| Focus Band | Any OHKO | 10% chance survive with 1 HP; not consumed | **Available** | `CHAMPIONS-CONFIRMED` |

---

## 13. FORMAT RULES (Champions 2026 — Regulation Set M-A)

| Rule | Value | Confidence |
|------|-------|------------|
| Battle format | **Double Battles** | `CHAMPIONS-CONFIRMED` |
| Team size | Bring 6, Pick 4 | `CHAMPIONS-CONFIRMED` |
| Singles format | Not the standard competitive format for VGC; doubles only for official events | `CHAMPIONS-CONFIRMED` |
| Level cap | Auto-leveled to **Level 50** | `CHAMPIONS-CONFIRMED` |
| IVs | All Pokémon have **perfect IVs** (no IV manipulation possible) | `CHAMPIONS-CONFIRMED` |
| Species Clause | Yes — no two Pokémon of the same National Dex number | `CHAMPIONS-CONFIRMED` |
| Item Clause | **Yes** — no two Pokémon may hold the same item | `CHAMPIONS-CONFIRMED` |
| Open Team Sheets | **Yes** — team lists exchanged at start; includes species, ability, item, moves, Tera Type | `CHAMPIONS-CONFIRMED` |
| Mega Evolution | **Legal** (Regulation Set M-A) | `CHAMPIONS-CONFIRMED` |
| Terastallization | **Legal** (Regulation Set M-A) | `CHAMPIONS-CONFIRMED` |
| Dynamax | **NOT legal** at launch | `CHAMPIONS-CONFIRMED` |
| Z-Moves | **NOT legal** at launch | `CHAMPIONS-CONFIRMED` |
| Eviolite / pre-evolutions | **NOT legal** (only fully evolved Pokémon, except Pikachu) | `CHAMPIONS-CONFIRMED` |
| Match format | Bo1 (Swiss) or Bo3 (Swiss top cut and above); Bo3 for all top cuts | `CHAMPIONS-CONFIRMED` |
| Timer | Team Preview: 90s; Move time: 45s; Player time ("Your time"): 7 min; Game time: 20 min | `CHAMPIONS-CONFIRMED (TBC)` |
| Worlds 2026 | Pokémon Champions, San Francisco, August 29–30 2026 | `CHAMPIONS-CONFIRMED` |

**Sources:** [Victory Road Regulations](https://victoryroad.pro/champions-regulations/), [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [Nintendo Life](https://www.nintendolife.com/news/2026/03/pokemon-vgc-competitions-officially-transition-to-pokemon-champions)

---

## 14. NOTABLE MOVE CHANGES IN CHAMPIONS

Key moves changed from SV (partial list — most relevant to engine):

| Move | Prior BP/Effect | Champions BP/Effect | Confidence |
|------|----------------|---------------------|------------|
| **Protect** and all variants | 16 PP | **8 PP** | `CHAMPIONS-CONFIRMED` |
| **Fake Out** | Usable any turn (fails after T1) | Cannot be selected after first use | `CHAMPIONS-CONFIRMED` |
| **Salt Cure** | Steel/Water: 1/8 HP/turn; others: 1/16 HP/turn | Steel/Water: **1/16** HP/turn; others: **1/32** (actually halved to 6.25%) | `CHAMPIONS-CONFIRMED` |
| **Dire Claw** | 50% status chance (16.67% each: poison/para/sleep) | **30%** status chance (10% each); now **Slicing move** | `CHAMPIONS-CONFIRMED` |
| **Moonblast** | 30% Sp.Atk drop | **10%** Sp.Atk drop | `CHAMPIONS-CONFIRMED` |
| **Iron Head** | 30% flinch | **20%** flinch (40% with Serene Grace) | `CHAMPIONS-CONFIRMED` |
| **Trop Kick** | 70 BP | **85 BP** | `CHAMPIONS-CONFIRMED` |
| **First Impression** | 90 BP | **100 BP** | `CHAMPIONS-CONFIRMED` |
| **Bone Rush** | 25 BP/hit | **30 BP/hit** (5 hits max = 150); Loaded Dice no longer works | `CHAMPIONS-CONFIRMED` |
| **Dragon Claw** | Standard | Now a **Slicing move** (+50% with Sharpness) | `CHAMPIONS-CONFIRMED` |
| **Shadow Claw** | 70 BP | Now a **Slicing move** (effectively 105 BP with Sharpness) | `CHAMPIONS-CONFIRMED` |
| **Snap Trap** | Grass-type | **Steel-type** (Galarian Stunfisk now gets STAB) | `CHAMPIONS-CONFIRMED` |
| **Night Daze** | 85 BP | **90 BP** | `CHAMPIONS-CONFIRMED` |
| **Spirit Shackle** | 80 BP | **90 BP** | `CHAMPIONS-CONFIRMED` |
| **Psyshield Bash** | 70 BP | **90 BP** | `CHAMPIONS-CONFIRMED` |
| **Beak Blast** | 100 BP | **120 BP** | `CHAMPIONS-CONFIRMED` |
| **Growth** | Normal-type | **Grass-type** | `CHAMPIONS-CONFIRMED` |
| **Knock Off** | Item removal doesn't activate if user faints first | Item removal **activates even if user faints** | `CHAMPIONS-CONFIRMED` |
| **Make It Rain** | 100% accuracy | **95% accuracy** | `CHAMPIONS-CONFIRMED` |
| **Freeze-Dry** | 20% freeze chance + hits Water super-effective | Super-effective on Water **retained**; **freeze chance removed** (cannot inflict Freeze) | `CHAMPIONS-CONFIRMED` (V2 verification) |
| **Hard Press** | Variable BP (target HP%) | **1–100 BP** scaled by target HP% (same mechanic, confirm scaling) | `CHAMPIONS-CONFIRMED` (V2 verification) |

---

## 15. PP SYSTEM CHANGES

Champions uses a revised PP system (not Showdown/SV PP Max style):

| Prior PP | Champions PP |
|----------|-------------|
| 5 | 8 |
| 8 | 12 |
| 10 | 12 |
| 15 | 24 |
| 20+ | 20 |

`CHAMPIONS-CONFIRMED` — [False Swipe Gaming YouTube](https://www.youtube.com/watch?v=bSamJ5plm-4)

---

## 16. EXPLICIT CHAMPIONS DEVIATIONS FROM SV VGC REGULATION H (SUMMARY)

| Mechanic | SV Value | Champions Value |
|----------|----------|----------------|
| Full Paralysis chance | 25% | **12.5%** |
| Sleep duration (non-Rest) | 1–3 turns (random) | **1–2 turns max**; 33% wake on T2, guaranteed T3 |
| Rest sleep | 2 turns | **3 turns** |
| Freeze thaw chance | 20% per turn | **25% per turn** |
| Freeze max duration | Unlimited (thaw chance each turn) | **3 turns maximum** |
| Unseen Fist | 100% damage through Protect | **25%** damage through Protect |
| Healer | 30% ally status cure | **50%** ally status cure |
| Protect PP | 16 | **8** |
| Fake Out | Selectable (fails after T1) | **Locked out after first use** |
| Terrain boost | ×1.5 (in SV) | **×1.3** |
| Timer expiry tiebreak | HP % remaining wins | **Draw** |
| IVs | Variable (Bottle Caps for max) | **All perfect IVs** at all times |
| Snow weather | Gives no chip damage; Ice Def ×1.5 | Same (Snow was already Gen 9) |
| Salt Cure damage | 1/8 / 1/16 | **1/16 / ~1/32** |
| Dire Claw status chance | 50% | **30%** |
| Moonblast Sp.Atk drop | 30% | **10%** |
| Iron Head flinch | 30% | **20%** |
| Life Orb | Available | **Not available at launch** |
| Choice Band/Specs | Available | **Not available at launch** |
| Assault Vest | Available | **Not available at launch** |
| Heavy-Duty Boots | Available | **Not available at launch** |

---

## 17. OPEN QUESTIONS / UNKNOWNS

Items to flag for testing before engine commit:

1. **Terrain boost value:** Game8 Champions says ×1.3 for all terrains. SV value was ×1.5. Confirm via damage calculation against a known Pokémon in Electric Terrain. Critical discrepancy.
2. **Sleep turn counting:** Exact implementation of "33% wake on T2, guaranteed T3" — does the turn counter start at 0 (applied turn) or 1? Serebii says "Turn 2 of Sleep" — need to confirm whether the turn sleep is inflicted counts.
3. **Sitrus Berry:** Not in confirmed item list; community posts mention it's absent ("need Assault Vest, Life Orb, and Weakness Policy" — implying others available). Verify via in-game testing.
4. **Weather rock items:** Not confirmed in Champions item list. Weather lasts 5 turns. Confirm no 8-turn weather exists.
5. **Terrain Extender:** Not confirmed available. Terrain lasts 5 turns. Confirm.
6. **Seed items (Electric Seed, etc.):** Not in confirmed item list. Treat as unavailable.
7. **Confusion self-hit rate:** No Champions-specific confirmation. Using 33% (SV value) until tested.
8. **Sleep Talk in sleep:** Does using Sleep Talk affect the sleep turn counter? No Champions-specific source.
9. **Unnerve interaction with entry activation:** May be bugged — test with Pelipper entry vs. Unnerve user.
10. **Defog:** Not confirmed in Champions moveset availability list. If present, does it remove Tailwind? SV: no.
11. **Toxic/Badly Poisoned escalation cap:** In SV, N/16 escalates but stops dealing damage at N=16 (caps). No Champions deviation found. Assume same behavior.
12. **Red Card / Eject Button / Eject Pack:** Not in confirmed item list. Assume absent.
13. **Covert Cloak / Clear Amulet:** Not in confirmed item list. Assume absent.
14. **Moody:** No relevant Pokémon in roster. Flag when roster expands.
15. **Sand Force exact multiplier:** Stated as ×1.3 in Gen 9 SV. No Champions deviation found. Confirm.
16. **Weakness Policy:** Community posts suggest absent at launch; verify.
17. **`MECH-ROLL-WINDOW` — damage random roll 86–100 vs 85–100:** Bulbapedia current Champions page says 86–100 (15 rolls); SV uses 85–100 (16 rolls). Adopted 86–100 for now. Requires replay-capture verification before golden test freeze.
18. **Spicy Spray (Mega Scovillain) effect text:** ability name confirmed; full effect text has no primary indexed source. Do not code behavior yet.
19. **Magic Bounce current behavior in Champions:** one Game8 abilities page describes it differently from historical Gen 6–9 behavior. Possible data-entry bug or Champions-specific rewrite; verify in-game.
20. **Mega Sol scope:** does it affect only move-side sunlight logic (Solar Beam, Weather Ball, Growth) or also passive ability/item interactions (Harvest, Solar Power, Chlorophyll)? Unresolved.
21. **Switch persistence of Sleep/Freeze counters:** modern-core inherited assumption; no explicit Champions confirmation.
22. **Piercing Drill / Unseen Fist vs punish-on-Protect moves:** when 25% damage goes through, do King's Shield / Baneful Bunker / Spiky Shield / Jaw Lock / etc. still apply their punish effect? Needs direct test matrix.

---

## 17B. TEAM COVERAGE DETECTION (added 2026-04-24, T9j.3b)

**Purpose:** The UI "Team Coverage" widget flags whether the current player team has representation across six strategic categories. The list below is the binding spec; `ui.js::computeCoverage(teamKey?)` is the implementation and must stay in sync.

**Categories (six rows in the UI):**

1. **Fake Out** — any member with `Fake Out` in moves.
2. **Trick Room** — renamed from "Trick Room Counter". Flagged if any member has one of the TR pressure moves: `Trick Room`, `Taunt`, `Imprison`, `Fake Out`. Per user direction 2026-04-24, Trick Room is counted as own-team speed control only (opposing TR is a matchup-time concern, not a coverage gap).
3. **Redirection** — any member with `Follow Me`, `Rage Powder`, or `Spotlight`.
4. **Priority** — any member with a Champions-legal priority move: `Fake Out`, `Extreme Speed`, `Aqua Jet`, `Shadow Sneak`, `Sucker Punch`, `Bullet Punch`, `Ice Shard`, `Vacuum Wave`, `Mach Punch`, `Grassy Glide`, `Quick Attack`, `Accelerock`, `First Impression`.
5. **Weather Setter** — any member with a weather ability (`Drought`, `Drizzle`, `Sand Stream`, `Snow Warning`) OR a weather-setting move (`Sunny Day`, `Rain Dance`, `Snowscape`, `Hail`, `Sandstorm`).
6. **Speed Control** — logical OR across five sub-flags exposed on `computeCoverage().speed_control`:
   - `speed_lowering` (moves): `Electroweb`, `Icy Wind`, `Bulldoze`, `Low Sweep`, `Rock Tomb`, `Scary Face`, `Glaciate`, `String Shot`, `Mud Shot`, `Drum Beating`, **`Sticky Web`**, `Cotton Spore`. Sticky Web is included per user direction 2026-04-24 as a hazard that reduces switch-in speed.
   - `speed_boosting` (moves): `Dragon Dance`, `Agility`, `Rock Polish`, `Flame Charge`, `Shift Gear`, `Trailblaze`, `Quiver Dance`, `Victory Dance`, `Autotomize`, `Rapid Spin`.
   - `field_effects` (moves): `Tailwind`, `Trick Room` **(own-team only)**.
   - `abilities`: `Chlorophyll`, `Swift Swim`, `Sand Rush`, `Slush Rush`, `Unburden`, `Surge Surfer`, `Wind Rider`, `Quick Feet`, `Steam Engine`, `Motor Drive`. **`Intimidate` is intentionally excluded** (indirect and already covered by existing mechanic).
   - `priority_speed` (moves): `Feint`, `After You`, `Quash`, `Ally Switch`.
   - `speed_control.any` is true when any of the five sub-flags is true.

**Freshness contract:** `computeCoverage()` never caches; it always reads live `TEAMS[key].members`. `renderCoverageWidget()` must be invoked after any of: player-select change, team removal that reassigns `currentPlayerKey`, import success into the active slot, or set editor save. These four call sites are present in `ui.js` as of T9j.3b.

**TDZ-safe init pattern:** The lists (`SPEED_LOWER_MOVES`, `SPEED_BOOST_MOVES`, `SPEED_FIELD_MOVES`, `SPEED_PRIORITY_MANIP`, `SPEED_ABILITIES`, `WEATHER_ABILITIES`, `WEATHER_MOVES`, `REDIRECTION_MOVES`, `TR_PRESSURE_MOVES`, `PRIORITY_MOVES`) and the row table `COVERAGE_CHECKS` are declared with `var`, not `const`/`let`, because they are referenced during init before their declaration line is reached. Do not change this.

**Public export:** `globalThis.computeCoverage = computeCoverage` is set for test harnesses. Unit tests live at `/tmp/coverage_tests.js` and cover empty team, ability-only, mixed moves, multi-weather, own-team TR, Sticky Web, no-cache freshness, Intimidate exclusion, and post-mutation recompute (9/9 passing at T9j.3b).

**Deferred to T9j.7 (Mega Evolution):** Mega base stats currently static in `BASE_STATS` (e.g. `Dragonite-Mega`). Per user direction 2026-04-24, Mega forms are not always active at send-out; stats should switch only when the Mega Stone is triggered. This architecture work is tracked as Issue T9j.7 and is out of scope for T9j.3b. Static stats were corrected against canonical Champions data:

| Species | T9j.3b value | Source |
|---|---|---|
| Dragonite-Mega | 91 / 124 / 115 / 145 / 125 / 100 (BST 700) | [Game8](https://game8.co/games/Pokemon-Champions/archives/592442), [RotomLabs](https://rotomlabs.net/dex/champions/dragonite/mega) |
| Drampa-Mega | 78 / 85 / 110 / 160 / 116 / 36 (BST 585) | [Game8](https://game8.co/games/Pokemon-Champions/archives/592423), [RotomLabs](https://rotomlabs.net/dex/champions/drampa/mega) |
| Froslass-Mega | 70 / 80 / 70 / 140 / 100 / 120 (BST 580) | [Game8](https://game8.co/games/Pokemon-Champions/archives/592410), [OP.GG](https://op.gg/pokemon-champions/pokedex/mega-froslass) |

---

## 17A. DAMAGE ORACLE RECONCILIATION POLICY (added 2026-04-24)

**Policy:** Smogon's Champions damage calculator, once available (tracked in Issue #35), is treated as the AUTHORITATIVE oracle for golden damage tests (DAMAGE-###) EXCEPT where this spec (§1-§16) documents a Champions-specific primary-source override. Divergences are enumerated below as `ORACLE-DIVERGENCE-N` with citations. The engine follows this spec, not the calc, when a divergence is flagged.

**Quarterly reconciliation:** Re-run the full golden pack against the latest public Smogon Champions calc. For any new or resolved divergence, update this section and (if appropriate) adjust the spec. Any divergence whose Champions primary source turns out to be wrong is downgraded to match Smogon and removed from the override list.

**Known divergences at filing (pre-calc release):**

| ID | Scope | Champions (this spec) | Expected Smogon initial | Source |
|---|---|---|---|---|
| ORACLE-DIVERGENCE-1 | Damage random roll | 86–100 (15 rolls) | 85–100 (SV inheritance, 16 rolls) | [Bulbapedia Champions](https://bulbapedia.bulbagarden.net/) (§1 `MECH-ROLL-WINDOW`, open question #17) |
| ORACLE-DIVERGENCE-2 | Freeze-Dry secondary | Cannot inflict Freeze status | 10% Freeze chance on Water targets | Verified V2 report (§14 Notable Move Changes) |
| ORACLE-DIVERGENCE-3 | Rage Powder priority | +2 | +3 (Gen 8/9 SV value) | [Serebii Rage Powder Champions](https://www.serebii.net/attackdex-champions/ragepowder.shtml) (§4 priority table) |

Further divergences must be added here with (a) ID, (b) scope, (c) Champions value, (d) Smogon value, (e) primary-source citation. Golden tests that exercise a divergence must mark `oracle: 'spec-override'` so the diff reporter ignores that mismatch.

---

## 18. SOURCES BIBLIOGRAPHY

1. [Serebii — Pokémon Champions Main Page](https://www.serebii.net/pokemonchampions/)
2. [Serebii — Status Condition Changes](https://www.serebii.net/pokemonchampions/statusconditions.shtml)
3. [Serebii — Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml)
4. [Serebii — New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)
5. [Serebii — Available Pokémon](https://www.serebii.net/pokemonchampions/pokemon.shtml)
6. [Serebii — Items](https://www.serebii.net/pokemonchampions/items.shtml)
7. [IGN — Biggest Changes Explained](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained) (Casey De Freitas, 2026-04-13)
8. [Victory Road — Champions Regulations](https://victoryroad.pro/champions-regulations/) (Alberto Núñez, updated 2026-03-06)
9. [Victory Road — 2026 Season Structure](https://victoryroad.pro/2026-season-structure/)
10. [Game8 — List of Changes from Previous Games](https://game8.co/games/Pokemon-Champions/archives/593893) (2026-04-21)
11. [Game8 — All Weather Conditions](https://game8.co/games/Pokemon-Champions/archives/594098) (2026-04-24)
12. [Game8 — All Terrains and Effects](https://game8.co/games/Pokemon-Champions/archives/594155) (2026-04-23)
13. [Game8 — Leftovers](https://game8.co/games/Pokemon-Champions/archives/593875) (2026-04-20)
14. [Game8 — Items List](https://game8.co/games/Pokemon-Champions/archives/588871)
15. [Game8 — All Mega Stones List](https://game8.co/games/Pokemon-Champions/archives/588885)
16. [Game8 — Intimidate](https://game8.co/games/Pokemon-Champions/archives/593590)
17. [games.gg — Item List, What's Missing](https://games.gg/news/pokemon-champions-items-list-meta/) (2026-04-09)
18. [games.gg — Status Nerfs](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) (2026-04-09)
19. [games.gg — Mega Evolution Guide](https://games.gg/pokemon-champions/guides/pokemon-champions-all-mega-evolution-and-abilities/)
20. [games.gg — Mega Stones Collection Guide](https://games.gg/pokemon-champions/guides/pokemon-champions-mega-stones/)
21. [games.gg — Battle Mechanics and VP](https://games.gg/pokemon-champions/guides/pokmon-champions-battle-mechanics-and-vp-system-guide/)
22. [Nintendo Life — VGC Transitions to Champions](https://www.nintendolife.com/news/2026/03/pokemon-vgc-competitions-officially-transition-to-pokemon-champions) (2026-03-29)
23. [Nintendo Wire — What You Need to Know](https://nintendowire.com/news/2026/02/27/heres-what-you-need-to-know-about-pokemon-champions/) (2026-02-27)
24. [ComicBook.com — Battle Gimmicks Explained](https://comicbook.com/gaming/feature/pokemon-battle-gimmicks-in-pokemon-champions-explained/) (2026-03-27)
25. [False Swipe Gaming YouTube — Every Mechanics Change](https://www.youtube.com/watch?v=bSamJ5plm-4) (2026-04-17) — primary mechanic change reference
26. [Bulbapedia — Freeze Status Condition](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition))
27. [Bulbapedia — Protean Ability](https://bulbapedia.bulbagarden.net/wiki/Protean_(Ability))
28. [Bulbapedia — Damage Formula](https://bulbapedia.bulbagarden.net/wiki/Damage)
29. [Reddit r/PokemonChampions — Tailwind Glitch Clarification](https://www.reddit.com/r/PokemonChampions/comments/1sn5z8s/tailwind_glitch_or_am_i_miss_understanding_the/)
30. [Reddit r/stunfisk — Protean in Champions](https://www.reddit.com/r/stunfisk/comments/1sfkbif/protean_in_champions/)
31. [Reddit r/stunfisk — Parental Bond Spread Moves](https://www.reddit.com/r/stunfisk/comments/1sfxsl2/parental_bond_spread_moves_only_hit_once/)
32. [Smogon Forums — Champions Thread (Frostbite never)](https://www.smogon.com/forums/threads/pok%C3%A9mon-champions-releasing-april-8-2026.3779617/page-9)
33. [OP.GG — Intimidate in Champions](https://op.gg/pokemon-champions/abilities/intimidate)
34. [Operation Sports — Mega Stones Guide](https://www.operationsports.com/how-to-use-and-get-all-mega-stones-in-pokemon-champions/)
35. [Video Games Chronicle — All Items](https://www.videogameschronicle.com/guide/pokemon-champions-all-items-in-pokemon-champions/)
36. [Sportskeeda — Tailwind in Champions](https://www.sportskeeda.com/pokemon/best-tailwind-team-composition-pokemon-champions)
37. [YouTube — HOW TO USE SPEED CONTROL IN CHAMPIONS](https://www.youtube.com/watch?v=NT899be3c7Q)
38. [PokeTooling — VGC Damage Formula Reference](https://poketooling.com/info/articles/pokemon-vgc/vgc-battle-mechanics/dealing-damage)
39. [FRVR — Complete Champions Roster List](https://frvr.com/blog/pokemon-champions-roster-list/)
40. V2 second-source verification report (user-supplied 2026-04-24) — Bulbapedia damage/mechanics, Game8 type-chart labels, move balance changes, residual status catalog, final-modifier pipeline order. See `CHAMPIONS_SPEC_DELTAS.md` for delta analysis.
