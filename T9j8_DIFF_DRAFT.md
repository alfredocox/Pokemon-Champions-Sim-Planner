# T9j.8 — Crits, Flinch, Abilities (Draft — awaiting approval)

**Scope:** tickets #27 (crits), #19 (flinch), #30 (abilities)
**Branch:** `fix/champions-sp-and-legality`
**Framework:** applies CHAMPIONS_VALIDATOR_FRAMEWORK.md v2 (strict CONFIRMED / ASSUMED / UNKNOWN labels)

---

## 1. Validator findings — ticket #30 has multiple primary-source errors

The ticket scope text mixes mainline Gen 9 defaults with Champions-specific changes and misrepresents several mechanics. Validated against Game8, Bulbapedia, IGN, and VGC streams:

| Ticket claim | Primary source says | Verdict |
|---|---|---|
| **Piercing Drill:** "Contact moves bypass Protect 25% of the time" | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)) + [Game8 Mega Excadrill](https://game8.co/games/Pokemon-Champions/archives/592396): contact moves **always bypass Protect, dealing 1/4 (25%) of the damage**. Deterministic, not probabilistic. | **TICKET WRONG** — implement as deterministic damage reduction |
| **Spicy Spray:** "30% burn attacker" | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)) + [Game8 Mega Scovillain](https://game8.co/games/Pokemon-Champions/archives/592424) + [VGC James Baek](https://www.youtube.com/watch?v=_R-OPsog2OM): **100% burn whenever attacker damages holder**. No probability. Triggers on physical or special. Not blocked by Substitute on attacker. Fails if holder behind Sub. | **TICKET WRONG** — implement as guaranteed |
| **Dragonize:** "Normal → Dragon +20% BP" | [Game8 Mega Feraligatr](https://game8.co/games/Pokemon-Champions/archives/592444) + [IGN New Mega Abilities](https://www.ign.com/wikis/pokemon-champions/All_New_Mega_Abilities): Normal-type moves become Dragon with +20% power | **CORRECT** ✓ |
| **Mega Sol:** "Personal sun (solar moves full power)" | [IGN](https://www.ign.com/wikis/pokemon-champions/All_New_Mega_Abilities): "weather-based moves hit as if harsh sunlight is in play" for the holder — narrow scope: Solar Beam skips charge, sun-boost effects apply to the holder's moves. Does **not** set field weather. | **PARTIAL** — correct but subtle; keep scope narrow |
| **Unseen Fist:** "Now 25% Protect bypass (from 100%)" | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Unseen_Fist_(Ability)): Gen 8/9 standard is **100% Protect bypass at full damage**. No Champions source confirms a 25% nerf. Moreover, **Urshifu is not confirmed on the Champions launch roster** (no Game8/IGN page for Urshifu in Champions). | **UNKNOWN** — defer; WONTFIX if Urshifu absent |
| **Parental Bond:** "Child hit reduced to 1/4 power (from 1/2)" | [Game8 Parental Bond Champions](https://game8.co/games/Pokemon-Champions/archives/593625) + [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability)): child at 1/4 power is the **Gen 7+ mainline default**. The "from 1/2" is a Gen 6 → Gen 7 change, not a Champions-specific nerf. | **MISLEADING** — already mainline default; engine needs the mechanic anyway |
| **Protean:** "Once per switch-in (not unlimited)" | [Bulbapedia Protean](https://bulbapedia.bulbagarden.net/wiki/Protean_(Ability)): once-per-switch is the **Gen 9 mainline default**, not a Champions-specific change. | **MISLEADING** — already Gen 9 default |

### What this changes in scope

- **Piercing Drill** → deterministic 1/4 damage through Protect (not 25% probability)
- **Spicy Spray** → 100% burn on damaging hit (not 30%)
- **Unseen Fist** → **WONTFIX** unless we confirm Urshifu is in the Champions roster (none of Game8/IGN/games.gg list it); if confirmed, keep Gen 9 default (100% bypass), not the ticket's invented 25% nerf
- **Parental Bond / Protean** → implement Gen 9 default behavior; no Champions-specific delta

---

## 2. #27 — Critical hits (P0)

### Validated mechanics
[Game8 crit guide](https://game8.co/games/Pokemon-Champions/archives/594137) + [games.gg crit guide](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/):

- Base rate: **1/24 (~4.17%)** — `CHAMPIONS-CONFIRMED`
- Crit damage: **×1.5** — `CHAMPIONS-CONFIRMED` (Gen 6+ standard, game docs confirm)
- Ignores: target's positive Def/SpD boosts, attacker's negative Atk/SpA drops, Reflect, Light Screen (and by extension Aurora Veil)
- High-crit moves: Slash, Razor Leaf, Crabhammer, Karate Chop, Night Slash, Stone Edge, Cross Chop, Leaf Blade, etc. get **+1 crit stage** (1/8 base)
- Focus Energy: **+2 crit stages** (to 50% → 100% with further boost)
- Always-crit moves: Flower Trick, Storm Throw, Frost Breath, Surging Strikes per Champions docs

### Engine placement per validator framework (step 9 of damage calc)
- In `calcDamage()` between weather/terrain multipliers and final floor
- `CRIT_STAGES` lookup: stage 0 = 1/24, stage 1 = 1/8, stage 2 = 1/2, stage 3 = always
- Query `move` against `HIGH_CRIT_MOVES` set (+1 stage) and `ALWAYS_CRIT_MOVES` set (→ stage 3)
- Attacker's `critStage` field (for Focus Energy later, stubbed for now)
- On crit: recompute attacker Atk/SpA using `Math.max(0, boost)` (ignore drops), defender Def/SpD using `Math.min(0, boost)` (ignore boosts), bypass `screenMod` (set to 1), multiply by 1.5

### Acceptance
- 1000 Tackle uses, crit rate in [30, 55] (expected 42, 95% CI)
- 1000 Night Slash, crit rate in [100, 150] (expected 125)
- Flower Trick always crits

---

## 3. #19 — Flinch (P1)

### Validated flinch moves in Champions
[Game8 physical moves list](https://game8.co/games/Pokemon-Champions/archives/590527) + cross-check:

| Move | Flinch chance | Source |
|---|---|---|
| Rock Slide | 30% | Game8 |
| Iron Head | 30% | Game8 Kingambit/other Steel sweepers |
| Air Slash | 30% | Game8 |
| Bite | 30% | Game8 (in Mega Scovillain learnset) |
| Zen Headbutt | 20% | Game8 (Mega Scovillain learnset confirms 20%) |
| Fire Fang | 10% | Game8 |
| Dark Pulse | 20% | confirm before adding |
| Fake Out | 100% (turn 1 only) | already implemented |

### Engine placement per validator framework (step 13 — apply secondary effects)
- `FLINCH_MOVES = { 'Rock Slide': 0.30, 'Iron Head': 0.30, 'Air Slash': 0.30, 'Bite': 0.30, 'Zen Headbutt': 0.20, 'Fire Fang': 0.10 }`
- After damage applied in `applyDamage()`, and target is alive, and target has not yet acted this turn: roll once per target
- Spread moves (Rock Slide) get one roll per target (already implemented structurally — each target gets its own `applyDamage` call)
- Set `target._flinched = true` if roll succeeds and target hasn't acted

### Acceptance
- 1000 Rock Slide hits → flinch rate in [250, 350] (expected 300, tight CI)
- 1000 Iron Head hits → flinch rate in [250, 350]
- 1000 Zen Headbutt → flinch rate in [150, 250] (expected 200)
- Flinch only triggers pre-act: if target already moved that turn, no flinch effect

---

## 4. #30 — Abilities (scoped per validator findings)

### In scope (confirmed present in Champions)

| Ability | Mechanic | Champions source |
|---|---|---|
| **Piercing Drill** (Mega Excadrill) | Contact moves ALWAYS bypass Protect dealing **1/4 damage** | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)) + [Game8](https://game8.co/games/Pokemon-Champions/archives/592396) |
| **Dragonize** (Mega Feraligatr) | Normal-type moves become Dragon with ×1.2 power | [IGN](https://www.ign.com/wikis/pokemon-champions/All_New_Mega_Abilities) + [Game8](https://game8.co/games/Pokemon-Champions/archives/592444) |
| **Mega Sol** (Mega Meganium) | Weather-dependent moves act as if harsh sunlight is active for holder (Solar Beam no charge, sun-boost effects) | [IGN](https://www.ign.com/wikis/pokemon-champions/All_New_Mega_Abilities) |
| **Spicy Spray** (Mega Scovillain) | **100%** burn on attacker that damages holder (not 30%); fails if holder behind Sub | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)) + [Game8](https://game8.co/games/Pokemon-Champions/archives/592424) |
| **Parental Bond** (Mega Kangaskhan) | Second hit at 1/4 power (Gen 9 default); per-target moves only; separate crit/flinch/secondary rolls | [Game8](https://game8.co/games/Pokemon-Champions/archives/593625) + [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability)) |

### Deferred / WONTFIX

| Ability | Reason |
|---|---|
| **Unseen Fist** | Urshifu not confirmed in Champions roster. No Game8/IGN Champions page for Urshifu. Defer as `CHAMPIONS-UNKNOWN` absent until confirmed. If Urshifu ships later, implement Gen 9 default (100% bypass full damage) — not the ticket's invented 25% nerf. |
| **Protean** | Gen 9 default "once per switch" is mainline behavior; no Champions deviation to implement beyond standard. Full Protean implementation is out of scope for T9j.8 (requires type-change tracking across move selection; queue for T9j.9/T9j.10). |

### Engine placement per validator framework (step 15 — contact triggers + event hooks)
- Create `ABILITIES` registry in `engine.js` with lifecycle hooks:
  - `onModifyMove(move, attacker)` — Dragonize type swap + BP boost
  - `onProtectResolve(attacker, target, move, damage)` — Piercing Drill 1/4 through-protect
  - `onWeatherCheck(mon, move)` — Mega Sol personal sun
  - `onDamageTaken(defender, attacker, move)` — Spicy Spray burn
  - Parental Bond handled inline in `executeAction` as a 2-strike loop (event order: both strikes resolve as separate `applyDamage` calls, each with own crit/flinch/secondary rolls per Bulbapedia spec)

### Acceptance
- Mega Feraligatr Return → Dragon type, BP 102 (was 85, ×1.2 floor)
- Mega Excadrill Earthquake into Protect → deals 1/4 damage, no ×0.75 spread (since Earthquake is non-contact, **does NOT bypass** — Piercing Drill requires contact)
- Mega Excadrill Drill Run (contact) into Protect → deals 1/4 damage
- Mega Scovillain hit by any damaging move while alive and not behind Sub → attacker burned 100% of the time
- Mega Meganium Solar Beam → fires turn 1 without charge regardless of field weather
- Mega Kangaskhan Return → 2 strikes, second at BP×0.25, separate crit rolls

---

## 5. Test plan — `/tmp/t9j8_tests.js`

~28 tests targeted:

**Crits (12):**
- Base rate Bernoulli CI on 2000 samples
- ×1.5 damage confirmed
- High-crit move 1/8 rate
- Always-crit move = 1.0
- Positive def boost ignored on crit (damage unchanged)
- Negative atk drop ignored on crit
- Reflect/Light Screen/Aurora Veil bypassed on crit
- No double-dipping with non-crit Reflect reduction

**Flinch (8):**
- Rock Slide 30% rate on 1000 hits
- Iron Head 30%, Zen Headbutt 20%, Fire Fang 10%
- Flinch only if `!hasActed`
- Spread move independent rolls
- Fake Out still works (regression)

**Abilities (8):**
- Dragonize on Normal move: type swap + BP×1.2
- Piercing Drill: contact through Protect at 1/4 damage; non-contact blocked fully
- Mega Sol: Solar Beam no-charge
- Spicy Spray: 100% burn on damaging hit
- Spicy Spray: no burn if holder behind Sub
- Parental Bond: 2-strike with second at 1/4 power
- Parental Bond: multi-target move single-strike only

---

## 6. Spec updates

- `CHAMPIONS_MECHANICS_SPEC.md §9` — add crit multipliers and stage table
- New `§7.8 Champions-specific abilities` subsection (or append to §7.2) documenting Piercing Drill / Dragonize / Mega Sol / Spicy Spray / Parental Bond with citations and implementation notes
- Close-out note: Unseen Fist + Protean deferred to future work

---

## 7. Commit plan

**Message (no em-dashes):**
```
add critical hits flinch rolls and five champions abilities with validator framework (Refs #27 #19 #30 T9j8)
```

Closure plan:
- Close #27 COMPLETED
- Close #19 COMPLETED
- Close #30 COMPLETED for the 5 implemented abilities; post explicit note that Unseen Fist (Urshifu absent) and Protean (mainline default) are deferred, with sources

---

## Questions for approval

1. **Piercing Drill:** confirm implement as **deterministic 1/4 damage through Protect** (not ticket's 25% probability)?
2. **Spicy Spray:** confirm implement as **100% burn** (not ticket's 30%)?
3. **Unseen Fist:** confirm **defer as WONTFIX** until Urshifu confirmed in Champions roster?
4. **Parental Bond / Protean:** ship Parental Bond now; **defer Protean** to T9j.9 or T9j.10?
5. **Flinch scope:** ship the 6 moves above (Rock Slide, Iron Head, Air Slash, Bite, Zen Headbutt, Fire Fang), or include more from the Game8 move list?
