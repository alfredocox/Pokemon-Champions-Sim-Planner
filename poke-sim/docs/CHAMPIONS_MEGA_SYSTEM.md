# Champions Mega Evolution System

**Data source:** `CHAMPIONS_MEGA_DATASET.json` (cross-confirmed from Serebii, Game8, Bulbapedia, Victory Road, Destructoid).
**Registry:** `CHAMPIONS_MEGAS` in `data.js` (60 entries, all `CROSS_CONFIRMED`).
**Full audit:** `CHAMPIONS_MEGA_AUDIT_REPORT.md` in repo root.

---

## Gameplay Mechanics

Mega Evolution in Champions differs from Gen 6/7:

| Rule | Behavior |
|------|----------|
| **Trigger** | Mid-battle, user-initiated on the turn the player commands it |
| **Requirement** | Holder must be carrying the matching Mega Stone |
| **Limit** | One Mega Evolution per side per battle |
| **Timing** | Activation resolves at start of turn, before move selection effects |
| **Stat change** | Base stats swap to the Mega form's stat line; SP, Alignment, and current HP% are retained |
| **Ability change** | Base ability swaps to the Mega's ability (e.g. Kangaskhan -> Parental Bond) |
| **Type change** | Types swap to the Mega form's types (e.g. Charizard -> Charizard-Mega-X gains Dragon) |
| **Intimidate timing** | Incineroar entering the same turn can Intimidate the base form before it Megas. Post-Mega, Scrappy/Inner Focus (if applicable) blocks future Intimidates. |
| **Weather timing** | Drought-Mega (Charizard Y) weather can overwrite a slower-setter's weather because Mega activation precedes ability triggers |

Sources:
- [games.gg Mega mechanics](https://games.gg/pokemon-champions/guides/)
- [MetaVGC Weather/Mega timing](https://metavgc.com/guides/pokemon-champions-weather-and-terrain)
- [YouTube analysis](https://www.youtube.com/watch?v=m-k5-ThSWKM)

---

## Registry Schema

```js
CHAMPIONS_MEGAS['Base-Mega'] = {
  baseSpecies:    'Base',
  nationalDex:    N,
  types:          ['Type1','Type2'],
  ability:        'AbilityName',
  abilityIsNew:   false,      // true for 4 Champions-only abilities
  abilityIsUpdated: false,    // true for nerfed abilities (Unseen Fist, Parental Bond, Protean)
  megaBaseStats:  { hp, atk, def, spa, spd, spe },
  megaStone:      'StoneName',
  megaStoneSource: 'Shop: 2000 VP' | 'Tutorial: ...' | 'Season M-1 Pass' | 'HOME transfer'
};
```

Keys follow `BaseSpecies-Mega` / `BaseSpecies-Mega-X|Y|M|F|EF` convention matching the sim's existing naming.

---

## New Abilities (Champions-exclusive)

All four debut on Champions-introduced Megas. Engine hooks are **not yet implemented**; spec captured here for the engine ticket.

### Piercing Drill (Mega Excadrill)

Contact moves deal 25% damage through protection moves; non-damage effects (status, stat drops) still trigger. Functionally the renamed + re-nerfed Unseen Fist.
- Source: [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml), [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403)

### Dragonize (Mega Feraligatr)

Normal-type moves become Dragon-type with +20% BP. Combined with Water/Dragon STAB, converted moves gain x1.2 (Dragonize) * x1.5 (Dragon STAB) = x1.8.
- Source: [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)

### Mega Sol (Mega Meganium)

The holder treats all moves as if Harsh Sunlight were active, **without** triggering actual Drought weather. Fire moves get x1.5 for holder; Solar Beam requires no charge; Chlorophyll/Flower Gift activate for holder. Water moves from opponents are **not** reduced (not real sun). Personal flag, not a weather setter.
- Source: [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)

### Spicy Spray (Mega Scovillain)

When the holder takes any damage from a move, the attacker is burned. Unlike Flame Body, triggers on **any** damaging move (not just contact). Fire-type attackers are immune.
- Source: [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)

---

## Updated Abilities (Nerfed from Prior Gens)

Exposed via `CHAMPIONS_UPDATED_ABILITIES` in `data.js`. Engine must use Champions values.

| Ability | Prior | Champions | Flag field |
|---------|-------|-----------|-----------|
| Unseen Fist | 100% damage through Protect | **25%** damage through Protect | `damageThroughProtect: 0.25` |
| Parental Bond | Child hit @ 1/2 power | **Child hit @ 1/4 power** | `childPowerMult: 0.25` |
| Protean | Changes type every move | **Changes type once per entry** | `oncePerEntry: true` |

Sources: [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml), [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403)

---

## Data Conflicts Resolved

| Conflict | Value A | Value B | Resolution |
|----------|---------|---------|-----------|
| Mega Starmie BST | 660 (Game8 aggregated row) | 620 (stat sum) | **620** (per-stat breakdown authoritative) |
| Mega Meowstic-F stats | Identical to base | Game8 + Bulbapedia agree | Use reported values; flag for in-game verification |
| Mega Chimecho type | Psychic/Steel (Destructoid) | Blank on Serebii Mega page | **Psychic/Steel** (Game8 individual page confirms) |
| Unseen Fist effect | Full bypass (IGN) | 25% (Serebii + Game8) | **25%** (higher-trust sources + community testing) |

---

## Data Gaps (Filed as GitHub Issues)

- **Mewtwo X/Y, Latias, Latios** — Stones not in Game8 item list; likely Reg M-B or later content.
- **Mega Raichu** — Beebom tier list reference unverified; Raichunite not in item pool.
- **Mega Meowstic-F** — In-game verification that female Mega has stat improvement over base female form.
- **Legacy Mega type column on Serebii** — image-dependent; not machine-parseable. Inferred from legacy data where unchanged.

---

## Engine Integration Checklist

For future engine ticket (T9c-engine / Scope B upgrade):

1. **Activation prompt:** UI surfaces "Mega Evolve?" on turn start if `CHAMPIONS_MEGAS[name]` exists AND `item === megaStone`.
2. **Side flag:** `side.megaUsed = true` after activation. Block further activations on that side.
3. **Stat swap:** Replace `mon.baseStats` with `CHAMPIONS_MEGAS[megaKey].megaBaseStats`. Recompute derived stats (keep SP/Alignment/HP%).
4. **Ability swap:** Replace `mon.ability` with `CHAMPIONS_MEGAS[megaKey].ability`. Re-fire entry-abilities (Intimidate on Mega Manectric, weather on Mega Charizard Y, etc.).
5. **Type swap:** Replace `mon.types`.
6. **New ability dispatch:** Wire Piercing Drill / Dragonize / Mega Sol / Spicy Spray into damage + hit pipeline.
7. **Updated-ability dispatch:** Respect `CHAMPIONS_UPDATED_ABILITIES` flags for Unseen Fist / Parental Bond / Protean.
8. **Legality:** Already enforced in `legality.js` via `MEGA_STONE_MISMATCH` and `HOME_TRANSFER` checks.

---

## Citations

- [Serebii Mega Abilities](https://www.serebii.net/pokemonchampions/megaabilities.shtml)
- [Serebii New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml)
- [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml)
- [Serebii Reg M-A](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml)
- [Game8 Mega Evolutions](https://game8.co/games/Pokemon-Champions/archives/592472)
- [Game8 Items List](https://game8.co/games/Pokemon-Champions/archives/588871)
- [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403)
- [Bulbapedia Champions list](https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_in_Pok%C3%A9mon_Champions)
- [Destructoid Mega Guide](https://www.destructoid.com/all-mega-evolutions-and-abilities-in-pokemon-champions/)
- [Victory Road Regulations](https://victoryroad.pro/champions-regulations/)
