# T9j.4 / T9j.5 — Status Residuals + Paralysis + Sleep (Refs #41 #17)

**Scope (merged):** End-of-turn residuals (Poison, Toxic, Freeze) from #41 **plus** paralysis/sleep nerfs from #17. Both tickets live on M1 Engine Truth. Shipping together avoids a second regression cycle on the same files.

**Hail removed from scope (user-flagged, validated):** Hail does NOT exist in Pokémon Champions — Gen IX replaced Hail with Snow, and Snow has no chip damage ([Bulbapedia Hail](https://bulbapedia.bulbagarden.net/wiki/Hail_(weather_condition))). Engine never sets `field.weather = 'hail'`. No Hail block added; Snow remains chip-less.

**Spec vs. ticket conflict (documented decision):** Ticket #17 says "remove paralysis skip entirely" (Gen 9 core = 0%). Our spec §1.2 says Champions has **12.5%** full-para (nerfed from SV's 25%, not removed) per [Serebii Champions Status](https://www.serebii.net/pokemonchampions/statusconditions.shtml) and [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/). Engine follows the spec (12.5%); #17 acceptance criteria will be updated in the close comment.

---

## 1. Decisions

| Mechanic | Decision | Citation |
|---|---|---|
| Regular Poison chip | 1/8 max HP end of turn | [Bulbapedia Status](https://bulbapedia.bulbagarden.net/wiki/Status_condition) |
| Toxic chip | N/16 escalating; N starts 1, cap 15 (SV cap) | [Bulbapedia Status](https://bulbapedia.bulbagarden.net/wiki/Status_condition) |
| Toxic counter reset on switch-out | Yes — resets on next entry | [Bulbapedia Status](https://bulbapedia.bulbagarden.net/wiki/Status_condition) |
| Poison + Steel immune to poison/toxic | Yes | [Bulbapedia Status](https://bulbapedia.bulbagarden.net/wiki/Status_condition) |
| Freeze thaw | 25% per move attempt; guaranteed thaw on turn 3 (3-turn cap) | [Bulbapedia Freeze](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition)) — Champions section |
| Fire-move thaw on hit | Yes — any damaging Fire move | [Bulbapedia Freeze](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition)) |
| Ice immune to freeze; Sun prevents | Yes; existing freeze not cured by sun | [Bulbapedia Freeze](https://bulbapedia.bulbagarden.net/wiki/Freeze_(status_condition)) |
| Frostbite | **NOT in Champions** — not implemented | [Spec §1.5](CHAMPIONS_MECHANICS_SPEC.md) |
| Paralysis full-skip | 12.5% (nerfed from SV 25%) | [Serebii Champions Status](https://www.serebii.net/pokemonchampions/statusconditions.shtml), [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) |
| Sleep | Turn 1 skip; turn 2 33% wake; turn 3 guaranteed wake (3-turn cap) | [games.gg](https://games.gg/news/pokemon-champions-nerfs-freeze-sleep-paralysis/) |
| Hail | **NOT in Champions** — not implemented (Snow replaces, no chip) | [Bulbapedia Hail](https://bulbapedia.bulbagarden.net/wiki/Hail_(weather_condition)) |
| Snow | No chip damage | [Spec §2.4](CHAMPIONS_MECHANICS_SPEC.md) |

---

## 2. Files changed

| File | Change summary |
|---|---|
| `poke-sim/engine.js` | Constructor adds `toxicCounter`, `frozenTurns`, `sleepTurns`; new `canInflictStatus()` helper; Toxic + Poison Powder inflict paths; freeze move-attempt gate + Fire-move thaw; paralysis 25% → 12.5%; sleep 3-turn cap with 33% turn-2 wake; poison (1/8) + toxic (N/16 cap 15) end-of-turn residuals; `replaceOnField` resets toxicCounter / frozenTurns |
| `CHAMPIONS_MECHANICS_SPEC.md` | Adds §1.2.1, §1.3.1, §1.4.1, §1.6.1 Engine Implementation subsections |
| `/tmp/status_tests.js` (new) | ~27 cases covering all 8 mechanics |

---

## 3. Commit message (no em-dashes)

```
add status residuals poison toxic freeze plus paralysis and sleep nerfs (Refs #41 #17 T9j4 T9j5)
```

---

## 4. Test plan — `/tmp/status_tests.js`

- **Poison (4):** residual 1/8, no counter increment, Poison-type immune, Steel-type immune
- **Toxic (7):** inflict sets N=1; tick 1/2/3 escalates; cap at 15; switch-out resets counter; Poison/Steel immune
- **Freeze (5):** Ice immune, Sun blocks, Magma Armor blocks, 25% thaw path, guaranteed thaw turn 3
- **Fire thaw (1):** damaging Fire move on frozen target thaws
- **Snow/no-weather (2):** Snow no chip; no-weather no chip
- **Paralysis (2):** 12.5% skip within 95% CI on 1000 rolls; speed halving unchanged
- **Sleep (3):** inflict sets sleepTurns=0; turn-3 guaranteed wake; turn-2 33% early wake
- **Regression (2):** canInflictStatus returns false on !alive; Dragonite constructor compat

---

## 5. Acceptance gates

- [ ] status_tests.js: all PASS
- [ ] mega_tests.js: 27/27 PASS
- [ ] coverage_tests.js: 9/9 PASS
- [ ] audit: 5070 battles, 0 JS errors
- [ ] Bundle rebuilt; commit message above (no em-dashes)
- [ ] #41 + #17 closed with evidence
