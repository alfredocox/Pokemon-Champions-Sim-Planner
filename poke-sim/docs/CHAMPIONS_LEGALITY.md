# Champions Reg M-A Legality

**Format:** `champions-vgc-2026-regma`
**Active period:** historical/source-sensitive. Treat Reg M-A as the active simulator lane only when the user or test explicitly selects the Reg M-A lane; do not call it the live ladder after source pages identify a newer regulation.
**Authoritative sources:**
- [Serebii Reg M-A](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml)
- [Victory Road Regulations](https://victoryroad.pro/champions-regulations/)
- [Game8 Items List](https://game8.co/games/Pokemon-Champions/archives/588871)
- [Data Source Registry](DATA_SOURCE_REGISTRY.md)

Last reviewed in repo: June 27, 2026.

Source freshness note: the June 27, 2026 review found that Reg M-A should be treated as a named historical lane unless a stronger source still identifies it as live. The next ruleset migration task is Reg M-B source review and implementation.

---

## Reg M-B Source-Review Boundary

Reg M-B is the active external season window after June 17, 2026, but this validator remains the implemented Reg M-A historical lane until Reg M-B species, item, form, move, ability, and mechanic differences are source-confirmed.

Passing this validator proves compatibility with the implemented historical lane. It does not prove full Reg M-B legality. Reg M-B promotion must update source rows, fixtures, QA artifacts, generated bundle/cache guards, and the browser QA artifact before the UI can claim Reg M-B as the implemented ruleset.

Structured conversion ledger: [`REG_M_B_SOURCE_CONVERSION_TABLE.md`](REG_M_B_SOURCE_CONVERSION_TABLE.md) and `../regmb_source_conversion.js`.

Verified June 27, 2026 Reg M-B source facts:

- Victory Road lists Regulation Set M-B as June 17 to September 2, 2026.
- Victory Road states Reg M-B allows Mega Evolutions and keeps all Reg M-A Mega Evolutions allowed.
- Victory Road states Reg M-B adds 16 new Mega Evolutions: Mega Raichu X, Mega Raichu Y, Mega Sceptile, Mega Blaziken, Mega Swampert, Mega Mawile, Mega Metagross, Mega Staraptor, Mega Scolipede, Mega Scrafty, Mega Eelektross, Mega Pyroar, Mega Malamar, Mega Barbaracle, Mega Dragalge, and Mega Falinks.
- The full Reg M-B Pokemon allowlist is source-visible as image sheets, so it must be converted into explicit reviewed rows before runtime promotion.

---

## Team Engineering Rule

Champion legality is ruleset-gated.

Do not assume that a mechanic belongs in the active sim just because it exists in Pokemon Showdown, Scarlet/Violet, or another Champion mode. The simulator must answer a narrower question:

> Is this mechanic legal for the current Champion ruleset lane being simulated?

Current implemented lane:

- `champions_reg_m_doubles_bo3`
- Reg M-A style doubles, now treated as source-sensitive/historical until Reg M-B migration is reviewed
- Mega Evolution enabled
- Champion SP spreads enabled
- Champion item pool allowlist enforced
- Champion species/form ban list enforced
- Scarlet/Violet Tera fields are not active in this lane unless a reviewed source explicitly enables them for the ruleset

Showdown is still useful, but its role is source data, not automatic permission:

- Use Showdown for species data, learnsets, base move metadata, flags, target categories, and standard battle mechanics.
- Use Champion sources and reviewed overrides to decide whether a Pokemon, item, ability, move, or mechanic is allowed in the active Champion ruleset.
- If Showdown and Champion sources conflict, do not silently pick one. Add a source-review note, test, and Overview entry.
- Use [`DATA_SOURCE_REGISTRY.md`](DATA_SOURCE_REGISTRY.md) to decide which source can prove legality, mechanics, coaching usage, or app evidence.

Ruleset lifecycle guard:

- `rulesets.js` owns whether a ruleset is `source_review`, `implemented`, or `historical`.
- `validateTeamForRuleset(team, rulesetId)` is the builder/sim entry point.
- Source-review rulesets return `RULESET_NOT_RUNTIME_PROMOTED` and `review_only_do_not_train_or_rank`.
- DB/coaching payloads must preserve ruleset status so future learning does not mix illegal, review-only, historical, and current-implemented rows.

## June 27, 2026 Ruleset Drift Fix

QA artifacts from `v2.1.82-replay-effect-tags` showed Champion battle logs containing `Terastallized` lines, including stale team data such as Dragapult with a Fairy Tera type. This was a ruleset leak: the engine was auto-activating Tera when a Pokemon had legacy `tera`, `teraType`, or `tera_type` data.

Fix shipped in `v2.1.83-champions-tera-gate`:

- Current Champion Reg M-A sim runs no longer auto-Terastallize from stale team data.
- Active Champion team catalog data no longer carries Tera fields.
- Active Champion team catalog data no longer carries `Tera Blast` as a team move.
- Champion exports no longer write `Tera Type:` lines.
- DB persistence strips Champion Tera fields and `Tera Blast` before saving.
- `validateChampionsLegality()` rejects current Reg M-A teams with:
- `TERA_NOT_CHAMPIONS_LEGAL`
- `MOVE_NOT_CHAMPIONS_LEGAL`
- `ABILITY_NOT_CHAMPIONS_LEGAL`
- Active Champion strategy copy no longer teaches `Protosynthesis` as approved coaching.
- Legacy/SV Tera parity code remains isolated for explicit non-Reg-M-A test contexts so future Champion rulesets can opt in only after source review.

Required validation before closing any similar issue:

- Scan active Champion catalog for Tera fields, `Tera Blast`, `Protosynthesis`, `Quark Drive`, and `Booster Energy`.
- Run `t152_tera_activation_tests.js`.
- Run `champion_pack_legality_tests.js`.
- Run `preloaded_team_legality_tests.js`.
- Run `champion_drift_guard_tests.js`.
- Export one fresh QA Artifact and verify there are no Champion-format `Terastallized` lines.

This is the pattern for future mixed-rule findings: gate the current Champion lane, preserve isolated source/oracle tests where useful, and document the source boundary.

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

## Stat Point Rules

Champion teams use **Stat Points (SPs)**, not Scarlet/Violet EVs.

Current simulator enforcement:

- Max **32 SP per stat**
- Max **66 SP total per Pokemon**
- SP values must be integers in an object with `hp`, `atk`, `def`, `spa`, `spd`, and `spe`
- Raw Showdown `EVs:` lines are rejected by Champion imports
- `IVs:` lines are rejected because Champions treats IVs as fixed/perfect for simulator purposes

Source truth:

- Pokemon Showdown's current Champions validator treats Champion sets as `Stat Points`, rejects more than `32` in a stat, and applies the Champion stat formula from the `champions` mod. Relevant source files: [`team-validator.ts`](https://github.com/smogon/pokemon-showdown/blob/master/sim/team-validator.ts) and [`data/mods/champions/scripts.ts`](https://github.com/smogon/pokemon-showdown/blob/master/data/mods/champions/scripts.ts).
- The repo follows Showdown behavior for simulator parity and uses `32/66` as the active guardrail.
- A public [GamesRadar hands-on preview](https://www.gamesradar.com/games/pokemon/i-made-a-competitively-viable-team-in-a-matter-of-minutes-in-pokemon-champions-and-im-confident-this-could-open-the-door-to-high-level-battles-for-newcomers-galore/) says Champion training has `66` Stat Points with a `31` per-stat cap. That conflicts with Showdown's current validator, so the repo tracks it as a source-review note instead of silently changing runtime behavior. If a stronger official Champion source confirms `31`, update `validateChampionsSpread()`, fixtures, seed tests, and the Overview source-truth note in the same change.

Known conversion policy for inferred archetype spreads:

- Showdown-style `252` investment maps to `32` Champion SP.
- Showdown-style `4` investment maps to `1` Champion SP.
- The conversion preserves the original archetype direction; it does not invent extra filler points merely to reach 66 total.

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

## Legal Item Pool

Enforced by `CHAMPIONS_LEGAL_ITEMS` in `legality.js`.

The validator now uses a positive allowlist from the Game8 Champions item list. Game8 marks that page as last updated April 10, 2026 and states that the listed items are the only ones available so far. Item effects still come from Showdown/generated runtime data; the allowlist only controls Champions availability.

Known absent SV carryovers are also kept in `CHAMPIONS_BANNED_ITEMS` so error messages stay clear. Examples include Life Orb, Choice Band, Choice Specs, Assault Vest, Rocky Helmet, Safety Goggles, Covert Cloak, Clear Amulet, Booster Energy, and Loaded Dice.

Any held item outside `CHAMPIONS_LEGAL_ITEMS` is a hard legality error until a stronger Champions source confirms it.

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
| `ITEM_ABSENT` | error | Held item is a known absent SV carryover |
| `ITEM_NOT_IN_CHAMPIONS_POOL` | error | Held item is outside `CHAMPIONS_LEGAL_ITEMS` |
| `TERA_NOT_CHAMPIONS_LEGAL` | error | Tera field present in a current Reg M-A Champion team |
| `MOVE_NOT_CHAMPIONS_LEGAL` | error | Move belongs to an unapproved mechanic for current Reg M-A, e.g. `Tera Blast` |
| `ABILITY_NOT_CHAMPIONS_LEGAL` | error | Ability belongs to an unapproved mechanic for current Reg M-A, e.g. `Protosynthesis` or `Quark Drive` |
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

- Legal-item allowlist maintenance on patch notes
- Reg M-B full Pokemon allowlist extraction from Victory Road image sheets
- Reg M-B new Mega implementation for Raichu X/Y, Sceptile, Blaziken, Swampert, Mawile, Metagross, Staraptor, Scolipede, Scrafty, Eelektross, Pyroar, Malamar, Barbaracle, Dragalge, and Falinks after stone/item names, stats, abilities, typing, sprites, and fixtures are sourced
- Mewtwo X/Y, Latias, Latios — stones not in Game8 item list as of April 2026 and not part of the June 27 verified Reg M-B new-Mega list
- Broader ruleset matrix: if Champion modes later enable Omni Ring mechanics such as Tera, add a separate ruleset flag instead of loosening current Reg M-A validation.
