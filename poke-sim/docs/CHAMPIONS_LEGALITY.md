# Champions Reg M-A Legality

**Format:** `champions-vgc-2026-regma`
**Active period:** April 8, 2026 - June 17, 2026
**Authoritative sources:**
- [Serebii Reg M-A](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml)
- [Victory Road Regulations](https://victoryroad.pro/champions-regulations/)
- [Game8 Items List](https://game8.co/games/Pokemon-Champions/archives/588871)

---

## Ruleset Summary

| Parameter | Value |
|-----------|-------|
| Battle format | Doubles |
| Bring / pick | 4-6 / 4 |
| Level cap | 50 (auto-level) |
| Species Clause | Yes (no two Pokemon with same National Dex #) |
| Item Clause | Yes (no two Pokemon holding the same item) |
| Mega Evolution | Allowed (this is the Mega format) |
| Team preview | 90 seconds |
| Open team lists | Yes at TPCi events |
| Best-of format | Swiss = Bo1/Bo3; Top Cut = Bo3 |

---

## Banned Pokemon Categories

Enforced by `CHAMPIONS_BANNED_POKEMON` in `legality.js`.

- **Paradox (Past):** Great Tusk, Scream Tail, Brute Bonnet, Flutter Mane, Slither Wing, Sandy Shocks, Roaring Moon, Walking Wake, Gouging Fire, Raging Bolt
- **Paradox (Future):** Iron Treads, Iron Bundle, Iron Hands, Iron Jugulis, Iron Moth, Iron Thorns, Iron Valiant, Iron Leaves, Iron Boulder, Iron Crown
- **Mythical:** Mew, Celebi, Jirachi, Deoxys, Phione, Manaphy, Darkrai, Shaymin, Arceus, Victini, Keldeo, Meloetta, Genesect, Diancie, Hoopa, Volcanion, Magearna, Marshadow, Zeraora, Meltan, Melmetal, Zarude
- **Restricted / Box Legendaries:** Mewtwo, Lugia, Ho-Oh, Kyogre, Groudon, Rayquaza, Dialga, Palkia, Giratina, Reshiram, Zekrom, Kyurem, Xerneas, Yveltal, Zygarde, Cosmog/Cosmoem, Solgaleo, Lunala, Necrozma, Zacian, Zamazenta, Eternatus, Calyrex, Koraidon, Miraidon, Terapagos
- **Sub-Legendary (non-Paradox):** Articuno/Zapdos/Moltres (all forms), Raikou/Entei/Suicune, Regis, Latias/Latios, Uxie/Mesprit/Azelf, Heatran, Regigigas, Cresselia, Cobalion/Terrakion/Virizion, Forces of Nature (all forms), Tapus, Ultra Beasts, Kubfu/Urshifu, Regieleki/Regidrago, Glastrier/Spectrier, Enamorus, Treasures of Ruin (Wo-Chien, Chien-Pao, Ting-Lu, Chi-Yu), Ogerpon, Loyal Three, Pecharunt

The `_stripForm()` helper strips regional/Mega/Therian/etc. suffixes so banned sub-legendary forms (e.g. `Urshifu-Rapid-Strike`) still match the base species ban list.

---

## Banned Items (Not in Champions item pool at launch)

Enforced by `CHAMPIONS_BANNED_ITEMS` in `legality.js`.

| Item | Reason |
|------|--------|
| Life Orb | Not in game ([IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg](https://games.gg/news/pokemon-champions-items-list-meta/)) |
| Choice Band | Not in game |
| Choice Specs | Not in game |
| Assault Vest | Not in game |
| Rocky Helmet | Not in game |
| Heavy-Duty Boots | Not in game |
| Black Sludge | Not in game |
| Eviolite | Not in game |
| Light Clay | Not in game |
| Heat/Damp/Smooth/Icy Rock | Not confirmed in item pool |
| Terrain Extender | Not confirmed in item pool |
| Toxic Orb | Not confirmed |
| Flame Orb | Not confirmed |

These must be monitored for future patches; the Champions meta is young.

---

## Mega Stone Rules

Enforced by `CHAMPIONS_STONE_TO_SPECIES` (built from `CHAMPIONS_MEGAS` registry at load).

A Mega Stone can only be held by its matching base species. Example: Venusaurite requires `Venusaur`; held by `Charizard` yields `MEGA_STONE_MISMATCH`.

The stone index covers 59 stones across 60 Mega entries (Meowstic-M and Meowstic-F share Meowsticite).

---

## HOME-Transfer-Only Megas

These are **legal** in Reg M-A but can only be obtained via HOME transfer (not in Champions shop). Surfaced as a **warning**, not an error:

- Chesnaught-Mega (Chesnaughtite)
- Delphox-Mega (Delphoxite)
- Greninja-Mega (Greninjite)
- Floette-Mega and Floette-Mega-EF (Floettite)

---

## Violation Codes

Returned from `validateChampionsLegality(team)` in `{severity, code, message}` form.

| Code | Severity | Trigger |
|------|----------|---------|
| `BANNED` | error | Pokemon base species on `CHAMPIONS_BANNED_POKEMON` |
| `FAKEMON` | error | Pokemon name in `FAKEMON_BLOCKLIST` (currently empty) |
| `ITEM_ABSENT` | error | Held item in `CHAMPIONS_BANNED_ITEMS` |
| `MEGA_STONE_MISMATCH` | error | Mega Stone held by non-matching species |
| `HOME_TRANSFER` | warn | HOME-transfer-only Mega (legal but not shop-obtainable) |

Species Clause and Item Clause are enforced separately in `engine.js::validateTeam()`.

---

## UI Integration

- **Ladder Mode toggle** in `ui.js` gates battle start on a clean legality pass.
- Errors block simulation; warnings surface in the team card.
- `CHAMPIONS_FORMAT_LABEL` from `engine.js` is used as the format badge.

---

## Pending Work (Tracked in GitHub Issues)

Not enforced by `legality.js` yet; filed as follow-up tickets:

- Absent-item set maintenance on patch notes
- Mewtwo X/Y, Latias, Latios — stones not in Game8 item list as of April 2026; may become Reg M-B content
- Mega Raichu — Beebom tier list reference unverified; stone not confirmed in item pool
