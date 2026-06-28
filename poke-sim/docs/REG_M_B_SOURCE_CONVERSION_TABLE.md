# Reg M-B Source Conversion Table

Status: active conversion ledger, not runtime legality.

Last reviewed in repo: June 27, 2026.

Primary structured artifact: `../regmb_source_conversion.js`

## Why This Exists

Reg M-B is the active external Champion regulation window, but the simulator should not become a guessing engine. Victory Road gives strong source facts for the regulation window, Worlds usage, Mega Evolution availability, the full allowed-Pokemon image sheets, and the 16 new Mega names. It does not give this repo a ready-to-run legality table by itself.

The top-1% simulator standard is:

- Source fact goes into the conversion ledger first.
- Runtime legality changes only after the source fact becomes explicit reviewed data.
- Every promotion has positive and negative fixtures.
- Historical Reg M-A behavior stays test-protected.

## Verified Source Facts

| Claim | Source | Status |
|---|---|---|
| Reg M-B runs June 17 to September 2, 2026 | Victory Road Champion regulations | Verified |
| Reg M-B is used for in-game Ranked Battles and VGC events on those dates, including Worlds 2026 | Victory Road Champion regulations | Verified |
| Mega Evolutions are allowed | Victory Road Champion regulations | Verified |
| All Reg M-A Mega Evolutions remain allowed | Victory Road Champion regulations | Verified |
| Reg M-B adds 16 new Mega Evolutions | Victory Road Champion regulations + `NewMegasRMB.png` | Names verified only |
| Reg M-B adds 22 Pokemon versus Reg M-A | Victory Road Champion regulations + `NewPokemonRMB.png` | Names extracted, review-only |
| Full allowed-Pokemon list exists | Victory Road image sheets `Reg-M-B-Pokemon1.jpg` and `Reg-M-B-Pokemon2.jpg` | Needs extraction |

## Reg M-B Addition Rows

These rows are the 22 additions Victory Road lists with respect to Reg M-A. They are explicit source-review rows, not runtime legality rows. Runtime promotion still needs full allowlist conversion, accepted/rejected fixtures, and implementation checks.

| Species | Source | Runtime status |
|---|---|---|
| Vileplume | `NewPokemonRMB.png` | Review-only |
| Qwilfish | `NewPokemonRMB.png` | Review-only |
| Sceptile | `NewPokemonRMB.png` | Review-only |
| Blaziken | `NewPokemonRMB.png` | Review-only |
| Swampert | `NewPokemonRMB.png` | Review-only |
| Mawile | `NewPokemonRMB.png` | Review-only |
| Metagross | `NewPokemonRMB.png` | Review-only |
| Staraptor | `NewPokemonRMB.png` | Review-only |
| Musharna | `NewPokemonRMB.png` | Review-only |
| Scolipede | `NewPokemonRMB.png` | Review-only |
| Scrafty | `NewPokemonRMB.png` | Review-only |
| Eelektross | `NewPokemonRMB.png` | Review-only |
| Pyroar | `NewPokemonRMB.png` | Review-only |
| Malamar | `NewPokemonRMB.png` | Review-only |
| Barbaracle | `NewPokemonRMB.png` | Review-only |
| Dragalge | `NewPokemonRMB.png` | Review-only |
| Grimmsnarl | `NewPokemonRMB.png` | Review-only |
| Falinks | `NewPokemonRMB.png` | Review-only |
| Overqwil | `NewPokemonRMB.png` | Review-only |
| Houndstone | `NewPokemonRMB.png` | Review-only |
| Annihilape | `NewPokemonRMB.png` | Review-only |
| Gholdengo | `NewPokemonRMB.png` | Review-only |

## New Mega Name Rows

These rows are source-reviewed names only. They are not implemented Mega forms until stone names, stats, typing, abilities, sprites, and fixtures are reviewed.

| Base species | Mega form | Source label | Runtime status |
|---|---|---|---|
| Raichu | Raichu-Mega-X | Mega Raichu X | Blocked |
| Raichu | Raichu-Mega-Y | Mega Raichu Y | Blocked |
| Sceptile | Sceptile-Mega | Mega Sceptile | Blocked |
| Blaziken | Blaziken-Mega | Mega Blaziken | Blocked |
| Swampert | Swampert-Mega | Mega Swampert | Blocked |
| Mawile | Mawile-Mega | Mega Mawile | Blocked |
| Metagross | Metagross-Mega | Mega Metagross | Blocked |
| Staraptor | Staraptor-Mega | Mega Staraptor | Blocked |
| Scolipede | Scolipede-Mega | Mega Scolipede | Blocked |
| Scrafty | Scrafty-Mega | Mega Scrafty | Blocked |
| Eelektross | Eelektross-Mega | Mega Eelektross | Blocked |
| Pyroar | Pyroar-Mega | Mega Pyroar | Blocked |
| Malamar | Malamar-Mega | Mega Malamar | Blocked |
| Barbaracle | Barbaracle-Mega | Mega Barbaracle | Blocked |
| Dragalge | Dragalge-Mega | Mega Dragalge | Blocked |
| Falinks | Falinks-Mega | Mega Falinks | Blocked |

## Required Promotion Fields

Each Reg M-B Mega row must carry:

- `baseSpecies`
- `megaForm`
- `megaStone`
- `megaBaseStats`
- `types`
- `ability`
- `spriteFallback`
- `itemSourceUrl`
- `statsSourceUrl`
- `abilitySourceUrl`
- `typeSourceUrl`
- `learnsetPolicy`
- `positiveFixture`
- `negativeFixture`

## Visual Allowlist Review Grid

The two Victory Road full-allowlist sheets are sprite-only, so the first complete mapping is a visual review ledger. The app renders these rows in the Teams tab under Reg M-B Review so humans can compare sprites against source sheets before promotion.

Current extraction status:

- `Reg-M-B-Pokemon1.jpg`: 120 visual rows.
- `Reg-M-B-Pokemon2.jpg`: 115 visual rows.
- Total: 235 visual review rows.
- Confidence labels: `verified_visual` for straightforward sprites and `needs_human_review` for ambiguous forms.
- All rows remain `review_only_do_not_train_or_rank`.

Known rows requiring human review before runtime promotion include Tauros Paldea forms, Meowstic forms, Gourgeist sizes, Basculegion forms, and Sinistcha-style form identification.

## Runtime Promotion Blockers

- The full allowed-Pokemon list is still image-sheet source data, not explicit species/form rows.
- The 22 Reg M-B additions are explicit review-only rows, but are not runtime-promoted.
- The 16 new Mega names are verified, but stone/item names are not source-promoted.
- Mega stats, typing, abilities, and sprite handling are not source-promoted.
- No accepted/rejected Reg M-B legality fixtures exist yet.
- Reg M-A historical fixtures must remain stable through any Reg M-B promotion.

## Dataset And Coaching Poisoning Guard

Ruleset data must protect downstream learning.

- `source_review` rulesets may be visible in the UI but must not be treated as legal sim evidence.
- DB analysis rows must carry `ruleset_status`, `learning_eligibility`, `data_policy`, `coaching_policy`, and `poisoning_guard`.
- Review-only runs should use `review_only_do_not_train_or_rank` until the ruleset is promoted.
- Illegal teams should use `illegal_team_do_not_train_or_rank`.
- Historical implemented lanes can remain replayable, but coaching must label them as historical so current-meta recommendations do not silently mix seasons.
- No aggregate matchup stat, Battle Sensei trend, or branch-memory recommendation should combine rows from different implemented rulesets unless the report explicitly asks for cross-regulation comparison.

## Review-Only Coverage Sections

Reg M-B coverage sections are planning fixtures, not playable trusted teams. They exist so contributors can see which new Mega rows still need stones, stats, typing, abilities, sprites, learnsets, and positive/negative fixtures.

| Section | Covered new Mega rows | Runtime policy |
|---|---|---|
| Reg M-B review: Raichu plus starter Megas | Raichu-Mega-X, Raichu-Mega-Y, Sceptile-Mega, Blaziken-Mega, Swampert-Mega | Hidden from legal sim; do not train/rank |
| Reg M-B review: Steel and physical pressure Megas | Mawile-Mega, Metagross-Mega, Staraptor-Mega, Scolipede-Mega | Hidden from legal sim; do not train/rank |
| Reg M-B review: unusual matchup Megas | Scrafty-Mega, Eelektross-Mega, Pyroar-Mega, Malamar-Mega | Hidden from legal sim; do not train/rank |
| Reg M-B review: poison and formation-pressure Megas | Barbaracle-Mega, Dragalge-Mega, Falinks-Mega | Hidden from legal sim; do not train/rank |

The UI can show regulation tags and review lanes, but source-review rows must remain blocked from normal selectors, DB learning, and coaching recommendations until promotion gates pass.

## Next Implementation Slices

1. Convert `Reg-M-B-Pokemon1.jpg` and `Reg-M-B-Pokemon2.jpg` into explicit species/form rows with reviewer notes.
2. Source-confirm the 16 new Mega stones/items.
3. Source-confirm stats, typing, and abilities for each new Mega.
4. Add Reg M-B legality fixtures.
5. Only then promote runtime legality from source-review to implemented Reg M-B.

## Runtime promotion gate - v2.1.99

Reg M-B source-review data is still blocked from runtime legality, DB learning, ranking, and trusted coaching recommendations.

Current promotion buckets:

| Bucket | Count | Runtime policy |
| --- | ---: | --- |
| Visual reviewed | 235 | Review-only, hidden from legal sim |
| Data incomplete | 14 required fields | Blocks runtime promotion |
| Ready for runtime review | 0 | No rows ready yet |
| Promoted | 0 | Nothing promoted |

Required fields that must be source-reviewed before promotion:

| Field | Current status |
| --- | --- |
| baseSpecies | visual reviewed, not runtime-promoted |
| megaForm | name verified, not implemented |
| megaStone | blocked, missing item source |
| megaBaseStats | blocked, missing stats source |
| types | blocked, missing form type source |
| ability | blocked, missing form ability source |
| spriteFallback | visual reviewed with GIF-primary fallback, still not a legality source |
| itemSourceUrl | blocked, missing URL |
| statsSourceUrl | blocked, missing URL |
| abilitySourceUrl | blocked, missing URL |
| typeSourceUrl | blocked, missing URL |
| learnsetPolicy | blocked, missing policy review |
| positiveFixture | blocked, missing accepted fixture |
| negativeFixture | blocked, missing rejected fixture |

Next human source actions:

1. Source item and stone names for every new Mega.
2. Source Mega stats, typing, and abilities from approved sources.
3. Define learnset inheritance policy for every new Mega form.
4. Add accepted and rejected legality fixtures before selector promotion.
5. Rerun Reg M-A regression fixtures before changing active runtime legality.

Do not promote Reg M-B into selectors, training data, coaching stats, or recommendation logic until every row above is reviewed and the promotion bucket `Promoted` is non-zero by explicit implementation change.

## Mega stone source pass - v2.2.0

Source checked: Pokemon Showdown `data/items.ts` on June 27, 2026.
Source URL: https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/items.ts

The following item names are source-verified for review, but they are not runtime-promoted. They must not enter legal selectors, ranking, DB learning, or trusted coaching until the remaining fields and fixtures pass.

| Mega form | Source-backed item name | Item id | Runtime policy |
| --- | --- | --- | --- |
| Raichu-Mega-X | Raichunite X | raichunitex | review-only |
| Raichu-Mega-Y | Raichunite Y | raichunitey | review-only |
| Sceptile-Mega | Sceptilite | sceptilite | review-only |
| Blaziken-Mega | Blazikenite | blazikenite | review-only |
| Swampert-Mega | Swampertite | swampertite | review-only |
| Mawile-Mega | Mawilite | mawilite | review-only |
| Metagross-Mega | Metagrossite | metagrossite | review-only |
| Staraptor-Mega | Staraptite | staraptite | review-only |
| Scolipede-Mega | Scolipite | scolipite | review-only |
| Scrafty-Mega | Scraftinite | scraftinite | review-only |
| Eelektross-Mega | Eelektrossite | eelektrossite | review-only |
| Pyroar-Mega | Pyroarite | pyroarite | review-only |
| Malamar-Mega | Malamarite | malamarite | review-only |
| Barbaracle-Mega | Barbaracite | barbaracite | review-only |
| Dragalge-Mega | Dragalgite | dragalgite | review-only |
| Falinks-Mega | Falinksite | falinksite | review-only |

Gate movement after this pass:

| Field | Previous status | New status |
| --- | --- | --- |
| megaStone | blocked, missing item source | source-verified review-only |
| itemSourceUrl | blocked, missing URL | source-verified review-only |

Promotion remains blocked. Current gate count: `2` source-verified review-only fields, `12` blocked fields, `0` promoted fields.

## Mega stats, typing, and ability source pass - v2.2.1

Source checked: Pokemon Showdown `data/pokedex.ts` on June 27, 2026.
Source URL: https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/pokedex.ts

The following Mega form implementation facts are source-verified for review, but they are not runtime-promoted. They must not enter legal selectors, ranking, DB learning, or trusted coaching until base/form implementation, learnset policy, and positive/negative fixtures pass.

| Mega form | Types | Ability | Base stats HP/Atk/Def/SpA/SpD/Spe | Runtime policy |
| --- | --- | --- | --- | --- |
| Raichu-Mega-X | Electric | Electric Surge | 60/135/95/90/95/110 | review-only |
| Raichu-Mega-Y | Electric | No Guard | 60/100/55/160/80/130 | review-only |
| Sceptile-Mega | Grass / Dragon | Lightning Rod | 70/110/75/145/85/145 | review-only |
| Blaziken-Mega | Fire / Fighting | Speed Boost | 80/160/80/130/80/100 | review-only |
| Swampert-Mega | Water / Ground | Swift Swim | 100/150/110/95/110/70 | review-only |
| Mawile-Mega | Steel / Fairy | Huge Power | 50/105/125/55/95/50 | review-only |
| Metagross-Mega | Steel / Psychic | Tough Claws | 80/145/150/105/110/110 | review-only |
| Staraptor-Mega | Fighting / Flying | Contrary | 85/140/100/60/90/110 | review-only |
| Scolipede-Mega | Bug / Poison | Shell Armor | 60/140/149/75/99/62 | review-only |
| Scrafty-Mega | Dark / Fighting | Intimidate | 65/130/135/55/135/68 | review-only |
| Eelektross-Mega | Electric | Eelevate | 85/145/80/135/90/80 | review-only |
| Pyroar-Mega | Fire / Normal | Fire Mane | 86/88/92/129/86/126 | review-only |
| Malamar-Mega | Dark / Psychic | Contrary | 86/102/88/98/120/88 | review-only |
| Barbaracle-Mega | Rock / Fighting | Tough Claws | 72/140/130/64/106/88 | review-only |
| Dragalge-Mega | Poison / Dragon | Regenerator | 65/85/105/132/163/44 | review-only |
| Falinks-Mega | Fighting | Defiant | 65/135/135/70/65/100 | review-only |

Gate movement after this pass:

| Field | Previous status | New status |
| --- | --- | --- |
| megaBaseStats | blocked, missing stats source | source-verified review-only |
| statsSourceUrl | blocked, missing URL | source-verified review-only |
| types | blocked, missing form type source | source-verified review-only |
| typeSourceUrl | blocked, missing URL | source-verified review-only |
| ability | blocked, missing form ability source | source-verified review-only |
| abilitySourceUrl | blocked, missing URL | source-verified review-only |

Promotion remains blocked. Current gate count: `8` source-verified review-only fields, `6` blocked fields, `0` promoted fields.

## Mega learnset policy source pass - v2.2.2

Source checked: Pokemon Showdown `data/pokedex.ts` plus local `poke-sim/move_legality.js` on June 27, 2026.
Source URL: https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/pokedex.ts

Policy: every Reg M-B new Mega form inherits its base species learnset. The Showdown Pokedex rows identify `baseSpecies` and `requiredItem` for each Mega form, and the local move legality helper already routes `*-Mega`, `*-Mega-X`, and `*-Mega-Y` forms back to the base species learnset.

This is source-verified for review only. It is not runtime-promoted until accepted and rejected fixtures prove every new Mega form uses the intended inherited learnset behavior.

| Mega form | Base species learnset | Required item | Runtime policy |
| --- | --- | --- | --- |
| Raichu-Mega-X | Raichu | Raichunite X | review-only |
| Raichu-Mega-Y | Raichu | Raichunite Y | review-only |
| Sceptile-Mega | Sceptile | Sceptilite | review-only |
| Blaziken-Mega | Blaziken | Blazikenite | review-only |
| Swampert-Mega | Swampert | Swampertite | review-only |
| Mawile-Mega | Mawile | Mawilite | review-only |
| Metagross-Mega | Metagross | Metagrossite | review-only |
| Staraptor-Mega | Staraptor | Staraptite | review-only |
| Scolipede-Mega | Scolipede | Scolipite | review-only |
| Scrafty-Mega | Scrafty | Scraftinite | review-only |
| Eelektross-Mega | Eelektross | Eelektrossite | review-only |
| Pyroar-Mega | Pyroar | Pyroarite | review-only |
| Malamar-Mega | Malamar | Malamarite | review-only |
| Barbaracle-Mega | Barbaracle | Barbaracite | review-only |
| Dragalge-Mega | Dragalge | Dragalgite | review-only |
| Falinks-Mega | Falinks | Falinksite | review-only |

Gate movement after this pass:

| Field | Previous status | New status |
| --- | --- | --- |
| learnsetPolicy | blocked, missing policy review | source-verified review-only |

Promotion remains blocked. Current gate count: `9` source-verified review-only fields, `5` blocked fields, `0` promoted fields.
