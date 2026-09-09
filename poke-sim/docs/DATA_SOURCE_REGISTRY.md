# Data Source Registry

Status: active source-truth control page.

Last inventory review: August 29, 2026. Ranked regulation duration rechecked August 30, 2026; this does not refresh every source or promote runtime data.

Purpose: give the team one place to inspect, challenge, replace, and improve the sources used by the Pokemon Champions simulator. If a source is stale, weak, contradicted, or not allowed to prove the claim it is being used for, update this page before changing runtime behavior.

## August 29, 2026 Full Inventory Control

The complete field/source inventory is now machine-readable at `tools/champions_source_inventory.json`. It separates public official pages, required in-game captures, the pinned Showdown baseline manifest, and field-level promotion rules for species/forms, moves, Abilities, items, learnsets, battle rules, and mechanics.

Run `npm run champions:sources` to create the metadata/hash audit at `reports/champions-source-inventory-latest.json`. The collector does not republish full page bodies and does not promote runtime rows.

Review plan: [`CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md`](CHAMPIONS_FULL_SOURCE_INVENTORY_2026-08-29.md).

First run: 9 of 11 official public endpoints were reachable; two optional Pokemon Support pages returned HTTP 403 to automation; no required public endpoint failed; seven official in-game capture sets remain required. Public pages do not expose a complete catalog of every Champion species/form/stat/move/item/Ability/learnset/mechanic, so those gaps must stay explicit until client capture or executable Champion evidence exists.

Product scope rule: this project is Pokemon Champions only. Non-Champion legacy mechanics/data may be mentioned only when documenting blocked imports, source drift, or migration hazards. They are not player-facing scope and must not train trusted coaching data.

## Current Ruleset Alert

As checked August 30, 2026, the official Ranked Battle M-B window is June 17, 2026 at 02:00 UTC through September 9, 2026 at 01:59 UTC. The August 5 notice extended the originally announced September 2 end date. Source: [official Regulation Set M-B notice](https://champions-news.pokemon-home.com/en/page/776.html). Event-specific competition regulations must be verified separately; ranked eligibility alone does not establish a tournament's rules.

Runtime date drift corrected in the M-B sign-off audit candidate: `../rulesets.js`
now records September 9 at 01:59 UTC. Boundary regressions pass; this does not
approve M-B legality. The official roster capture now supplies 235 unique
species/form IDs and exposes visual-ledger discrepancies. See
[the sign-off audit](../../docs/release/REG_MB_SIGNOFF_AUDIT.md).

Do not casually call Reg M-A the live ladder unless a current source confirms it. The simulator now treats Reg M-B as the active source-review lane while keeping Reg M-A as the implemented historical runtime lane until source-backed legality and mechanic deltas are promoted.

## June 29, 2026 Research Dossier Intake

Status: planning input, not runtime promotion.

The user supplied `/Users/kevinmedeiros/Downloads/deep-research-report-2.md` as a research dossier. Treat it as a useful source-review brief, not as a direct machine-readable authority, until each claim is backed by exact URLs, official page captures, or official in-client screenshots/exported lists.

Engineering conclusions from the dossier that are safe to document:

- Pokemon Champions should be treated as the competitive 2026 battle title for this project, not Scarlet/Violet.
- Champions supports Singles and Doubles; official VGC-style events should remain modeled as doubles with registered six and selected four where the event rules require that structure.
- Ranked regulations rotate; legality rows must carry ruleset, effective dates, source tier, verification status, and format scope.
- HOME compatibility does not equal Champion legality. A Pokemon, form, move, Ability, or item must be Champion-legal for the active lane before it can train trusted sim/coaching data.
- Mega Evolution is the confirmed current gimmick family in the dossier; Terastallization, Dynamax, Z-Moves, and future Omni Ring features remain blocked unless Champion-specific sources enable them.
- Official/client-captured eligibility lists should outrank secondary web mirrors for complete legal Pokemon, move, Ability, held-item, Mega Stone, and form tables.
- Victory Road and tournament result sources are high-value meta/coaching inputs, but they must not rewrite mechanics or legality.

Open conversion work from the dossier:

- Replace citation placeholders with exact official URLs, Victory Road URLs, Serebii/Game8/Pokeos/Bulbapedia URLs, or direct official client captures.
- Split any imported data into `authoritative_legality`, `working_mirror`, and `meta_evidence` states before runtime use.
- Add source rows for official battle modes, HOME boundaries, recruitment/training boundaries, M-B regulation dates, Worlds/VGC software usage, and singles/doubles format distinctions.
- Keep all M-B legality/content deltas provisional until exact source pointers and tests are attached.

## Reg M-B Source-Review Lane

Status: active external season, not yet promoted as the implemented simulator legality lane.

As of June 27, 2026, the app exposes Reg M-B as the active source-review lane while keeping deterministic battle validation on the historical Reg M-A implementation. This avoids silently allowing or banning Pokemon, moves, items, forms, abilities, or battle mechanics without a trusted source trail.

Structured conversion ledger: [`REG_M_B_SOURCE_CONVERSION_TABLE.md`](REG_M_B_SOURCE_CONVERSION_TABLE.md) and `../regmb_source_conversion.js`.

Verified June 27, 2026 source facts:

- Victory Road lists Regulation Set M-B from June 17 to September 2, 2026.
- Victory Road states Reg M-B is the official in-game Ranked Battle format and is used for VGC events on the same dates, including the 2026 World Championships.
- Victory Road states Mega Evolutions are allowed in Reg M-B.
- Victory Road provides the full Reg M-B allowed-Pokemon list as image sheets:
- `https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon1.jpg`
- `https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon2.jpg`
- Victory Road states all Reg M-A Mega Evolutions remain allowed and Reg M-B adds 16 new Mega Evolutions.
- The Reg M-B new Mega image is `https://victoryroad.pro/wp-content/uploads/2026/06/NewMegasRMB.png`.
- The source-reviewed new Mega list is: Mega Raichu X, Mega Raichu Y, Mega Sceptile, Mega Blaziken, Mega Swampert, Mega Mawile, Mega Metagross, Mega Staraptor, Mega Scolipede, Mega Scrafty, Mega Eelektross, Mega Pyroar, Mega Malamar, Mega Barbaracle, Mega Dragalge, and Mega Falinks.

Promotion checklist before Reg M-B can become the default implemented lane:

- Add authoritative Reg M-B source rows with `checked_at_utc` timestamps.
- Convert the image-sheet allowed-Pokemon source into explicit species/form rows with review proof; do not manually guess from sprites in runtime code.
- Add the 16 Reg M-B Mega forms only after stone/item names, stats, abilities, typing, sprites, and Showdown/Champion override behavior are source-backed.
- Compare source data against the supported Pokemon Showdown format or document an explicit Champion override.
- Update species, item, form, move, ability, and mechanic gates from source-backed data only.
- Add legality fixtures for accepted and rejected Reg M-B cases.
- Regenerate seed SQL, QA baseline, golden battle hashes, bundle, cache guard, and browser QA artifact.
- Keep historical Reg M-A artifacts labeled as historical instead of rewriting old replay/team provenance.

Non-goal: do not enable any unapproved Champion mechanic, form, item, or move from assumption alone.

## Regulation M-B Scrape And Capture Targets

Status: source-capture checklist for the legality evidence package. These links help reviewers collect candidate rows, screenshots, hashes, and source pointers. They do not automatically promote runtime legality.

Promotion rule: scraped/web rows are `working_mirror` until matched to official Pokemon, Play! Pokemon, Pokemon Champions, or timestamped in-client evidence. If a source cannot prove a row, the row stays `needs_verification`.

### Tier 0 official/client capture targets

| Target | Link or capture path | Pull/capture goal | Promotion use |
|---|---|---|---|
| Pokemon Champions official site | <https://champions.pokemon.com/> | Official product, mode, cross-platform, HOME/training, and news entry points | Rules/policy claims only when the page text directly states them |
| Official Pokemon news search | <https://www.pokemon.com/us/pokemon-news/> | Pokemon Champions announcements, regulation notices, patch notes, event/news posts | Official source pointer for regulation windows and policy claims |
| Play! Pokemon rules/resources | <https://www.pokemon.com/us/play-pokemon/about/tournaments-rules-and-resources/> | Tournament structure, match procedure, team-sheet/rules docs, event rules | Official competitive-format source when Champion-specific event rules reference it |
| In-game Regulation M-B rules screen | Manual capture: screenshot/video/export with UTC timestamp, build/version, format, and account/device context | Clauses, team size, bring size, level rules, timer/open-sheet notes, format scope | Highest-trust legality package evidence |
| In-game eligible Pokemon/forms list | Manual capture: all pages/screens, stored as reviewed source rows with image/file names and UTC timestamp | `legal_pokemon_ids`, `legal_form_ids`, banned/restricted rows | Required before Reg M-B runtime promotion |
| In-game moves/Abilities/items/training screens | Manual capture: selected Pokemon examples plus full available lists when possible | `legal_move_ids`, `legal_ability_ids`, `legal_item_ids`, Mega Stone or Omni Ring constraints | Required before verified team validation |
| Known accepted/rejected Champion teams | Manual capture: accepted team plus rejected species/form/move/item/Mega examples | legal, illegal, stale, and needs-verification fixtures | Required before Team Lab official ranking promotion |

### Champion-specific mirror targets

| Target | Link | Pull/capture goal | Allowed use |
|---|---|---|---|
| Victory Road Champions regulations | <https://victoryroad.pro/champions-regulations/> | Regulation dates, allowed Pokemon image sheets, new Mega image/list, event/meta context | Champion-specific mirror; useful for conversion, not final official proof alone |
| Victory Road Reg M-B allowed Pokemon sheet 1 | <https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon1.jpg> | Candidate allowed Pokemon/form OCR/review queue | Working mirror until official/client confirmed |
| Victory Road Reg M-B allowed Pokemon sheet 2 | <https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon2.jpg> | Candidate allowed Pokemon/form OCR/review queue | Working mirror until official/client confirmed |
| Victory Road Reg M-B new Mega sheet | <https://victoryroad.pro/wp-content/uploads/2026/06/NewMegasRMB.png> | Candidate Mega additions review queue | Working mirror until official/client confirmed |
| Serebii Pokemon Champions section | <https://www.serebii.net/pokemonchampions/> | Champion-specific regulation, availability, forms, item, and move references | Preferred Champion-specific secondary reference when reachable |
| Game8 Pokemon Champions pages | <https://game8.co/games/Pokemon-Champions> | Item/move/team-building convenience references and page-date checks | Secondary mirror; cannot override official/client capture |
| Pokeos Pokemon Champions pages | <https://www.pokeos.com/> | Champion availability cross-checks when exact Champion page is identified | Secondary mirror only |
| Bulbapedia Pokemon Champions page | <https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions> | General background and terminology cross-check | Background only unless no stronger source exists |

### Executable/reference scrape targets

| Target | Link | Pull/capture goal | Allowed use |
|---|---|---|---|
| Pokemon Showdown repository | <https://github.com/smogon/pokemon-showdown> | Baseline species, moves, abilities, items, learnsets, simulator behavior | Standard Pokemon/reference baseline, not Champion legality |
| Pokemon Showdown Champions scripts | <https://github.com/smogon/pokemon-showdown/blob/master/data/mods/champions/scripts.ts> | Champion mod stat formula and battle-behavior reference | Executable baseline unless official/client Champion evidence differs |
| Pokemon Showdown validator | <https://github.com/smogon/pokemon-showdown/blob/master/sim/team-validator.ts> | Stat Point and team validation behavior reference | Validator parity checks; not final Champion source if contradicted |
| Pokemon Showdown damage calculator | <https://github.com/smogon/damage-calc> | Damage formula oracle cases | Damage/math baseline only |
| `@pkmn` modular packages | <https://github.com/pkmn/ps> | Portable Showdown data/sim package references | Oracle harness/reference data |

### Capture output requirements

Every scrape/capture output should save:

- source URL or local capture file path
- `checked_at_utc`
- source tier
- regulation id and format scope
- source hash or screenshot filename when available
- extractor/parser version when automated
- reviewer decision: `candidate`, `needs_verification`, `verified`, `conflicting`, or `rejected`
- linked fixture or test name when the row affects runtime legality

Do not write scraped rows directly into `legal_pokemon_ids`, `legal_move_ids`, `legal_item_ids`, `legal_ability_ids`, or `legal_form_ids` without a verified source tier and passing legal/illegal/stale/needs-verification fixture coverage.

Dataset poisoning guard:

- Source-review rulesets are not legal sim lanes.
- Analysis rows must carry ruleset status and poisoning policy before DB or coaching systems aggregate them.
- Future coaching reports must not mix Reg M-A, Reg M-B, and later regulations unless the report explicitly requests cross-regulation comparison.

Smooth-upgrade guard:

- Any approved team/data change must move as one unit: source note, `data.js` or generated runtime asset, generated seed SQL, generated QA baseline/report snapshots, live Supabase migration, legality tests, bundle rebuild, Overview/build label, and fresh QA artifact.
- A local-only pass is not enough when the site reads live Supabase. If preloaded team IDs change, run or trigger the live DB parity path before treating the deployed page as validated.
- Do not add a team purely to force a test if that team is not legal in the active runtime lane. Add targeted QA instrumentation instead, or mark the row review-only so it cannot train coaching data.
- When a mistake is found, add the failure mode to docs and a drift guard test in the same change whenever practical. The goal is not just to fix the symptom; it is to make the same class of partial upgrade harder to repeat.
- Generated reports are source-truth surfaces. If a team, move, item, ruleset, or runtime proof target changes, refresh the Overview-linked QA baseline snapshot and let `qa_baseline_snapshot_tests.js` prove it is current before push.

## Source Priority

| Tier | Source type | Allowed to prove | Not allowed to prove alone |
|---|---|---|---|
| 0 | Official Pokemon, Play! Pokemon, Pokemon Champions notices, rules, patch notes, event pages, and direct official in-client captures | Active ruleset, tournament structure, official mechanics when stated directly, official eligible lists when captured with timestamp and version context | Detailed simulator edge behavior when the official text/capture is ambiguous |
| 1 | Champion-specific pages from Serebii, Victory Road, Game8, Pokeos, PokeBase, and equivalent reviewed Champion pages | Champion legality, item availability, ranked regulation dates, format deltas, working mirrors pending Tier 0 confirmation | Full engine implementation without executable or test proof |
| 2 | Pokemon Showdown upstream, Pokemon Showdown data CDN, `@pkmn/sim`, and `@smogon/calc` | Standard Pokemon data, move metadata, type chart, learnsets, target flags, baseline battle behavior, damage oracle checks | Champion legality when Champion sources say the active lane differs |
| 3 | Human-readable cross-checkers such as Bulbapedia, Serebii dex pages, Smogon strategy pages, RotomLabs, OP.GG, Pikalytics-style usage sources, and community tournament reports | Plain-English confirmation, move wording, common usage, archetypes, coaching context, meta pressure | Hard legality, exact runtime behavior, or active ruleset by itself |
| 4 | Repo QA artifacts, turn logs, branch-memory rows, source-truth tests, and browser exports | What this app actually executed and proved | External game truth if the app is already wrong |

## Serebii Champions Source Policy

Status: preferred Champion-specific reference, pending fresh live verification after the June 28, 2026 DNS failure in local tooling.

Use Serebii Champions pages ahead of generic Bulbapedia pages when the claim is about Pokemon Champions itself, including ranked regulations, Champion availability, item pool, Champion forms, and Champion-specific mechanics. Serebii is not a replacement for official Pokemon notices or executable Showdown/oracle checks:

- Official Pokemon/TPC pages still win for official tournament and rules-policy claims.
- Pokemon Showdown source, `@pkmn/sim`, and `@smogon/calc` still win for executable battle mechanics unless a Champion source requires an explicit override.
- Bulbapedia remains useful for general Pokemon explanations, but it should not be the primary proof for Champions-specific legality when a Serebii Champions page exists.
- Any Serebii-sourced runtime change must record the exact URL, `checked_at_utc`, source freshness status, affected ruleset, and a focused test or QA artifact.

June 28, 2026 check note: local network lookup for `www.serebii.net` failed with DNS resolution error, so no new runtime data was changed from Serebii in this pass.

## Golden Source Links

| Area | Primary source | Cross-check source | Repo owner area |
|---|---|---|---|
| Active Champion regulation | Official Champion/TPC notices when available; Serebii Champions regulation pages and Victory Road Champion regulations as Champion-specific references | Game8 Champion regulation pages; Bulbapedia only for general background | `docs/CHAMPIONS_LEGALITY.md`, `legality.js`, Overview |
| Champion item pool | Serebii Champions item/availability pages when verified; Champion-specific item pages such as Game8 items list | Bulbapedia item pages for descriptions/effects only | `CHAMPIONS_LEGAL_ITEMS`, item legality tests |
| Species, forms, stats, types | Pokemon Showdown `pokedex.js` | Bulbapedia and Serebii dex pages | generated Showdown data, `runtime_data.js` |
| Moves | Pokemon Showdown `moves.js` and `data/text/moves.ts` | Bulbapedia and Serebii move pages | move registry, move-support audit, engine tests |
| Abilities | Pokemon Showdown `abilities.js` | Serebii and Bulbapedia ability pages | ability inventory, ability parity tests |
| Items and berries | Pokemon Showdown `items.js` | Champion item pages, Bulbapedia, Serebii | generated data, item effect tests |
| Type chart | Pokemon Showdown `typechart.js` | Bulbapedia and Serebii type charts | damage oracle tests |
| Learnsets | Pokemon Showdown `learnsets.js` | Official availability notes when available, Serebii, Game8 | `approved_species_move_legality`, team gates |
| Damage math | Pokemon Showdown simulator, `@smogon/calc` | Champion override notes when Champion differs | damage oracle tests, turn-log validator |
| Meta/team coaching | User sim evidence and branch-memory rows first | Victory Road teams/articles, Smogon usage context, RotomLabs, OP.GG, Pikalytics-style data | Battle Sensei, Tactical Sweep QA, Meta Stress Lab |

## Pull And Check Areas

| Repo area | What it does | Required source stamp |
|---|---|---|
| `tools/showdown_sources.json` | Lists Showdown source files to fetch | source URL and source kind |
| `tools/fetch_showdown_data.mjs` | Fetches, parses, hashes, and normalizes upstream data | `checked_at`, URL, hash, parse status |
| `showdown_sync_runs` | One row per source sync attempt | UTC `started_at`, UTC `finished_at`, source version/commit when available |
| `showdown_source_files` | One row per fetched source file | source URL, hash, byte size, parse status |
| `showdown_entities` | Normalized source rows | source kind, entity key, source hash |
| `approved_showdown_entities` | Reviewed rows promoted for app use | approval status, source hash, reviewer/process |
| `champions_overrides` | Champion-specific differences from Showdown | Champion source URL, review date, status, test reference |
| `authoritative_legality` | Future official/client-captured Champion legality rows | Tier 0 source pointer, capture timestamp, ruleset, format scope, reviewer/process |
| `working_mirror` | Future secondary-source convenience rows pending promotion | Mirror URL, source tier, checked timestamp, provisional status, matching authoritative row when promoted |
| `meta_evidence` | Future tournament/team/result evidence for coaching | Event URL, ruleset, format, player/team context, sample size, and coaching-only status |
| `generated/pokemon_showdown_legal_data.js` | Offline GitHub Pages runtime data | generated timestamp, source hashes, approved counts |
| `db/seed_teams_v2.sql` and DB migrations | Approved team catalog seed and live DB alignment | generated from the same reviewed team catalog; live parity checked before Pages publish |
| `reports/champion_qa_baseline_snapshot.md` | Human-readable approved team and move baseline for QA | generated from current approved catalog; checked by `qa_baseline_snapshot_tests.js` |
| `legality.js` | Champion ruleset gate | ruleset ID, source review date, violation codes |
| `engine.js` | Deterministic execution | tests proving behavior against source/oracle |
| `ui.js` Overview | Human-visible status, docs, source inspector, QA path | build ID and source URL in exported artifacts |

## Timestamp Contract

Every automated or manual source check must record:

- `checked_at` in UTC.
- Source URL.
- Source owner or upstream project.
- Source type: official, Champion regulation, Showdown mirror, oracle, readable cross-checker, usage/meta, or repo QA evidence.
- Source version, commit, page last-updated date, or fetched hash when available.
- Ruleset ID being checked, for example `champions_reg_m_doubles_bo3`.
- Decision: `approved`, `blocked`, `needs_review`, `historical`, or `override_required`.
- Related commit SHA, workflow run ID, PR, issue, or QA artifact path.

If a source has no visible last-updated date, store the fetch/check timestamp and mark freshness as `checked_not_source_dated`.

## Challenge Process

To challenge a source or propose a better one, include:

- The current source being challenged.
- The stronger replacement source URL.
- What claim changes.
- Why the new source is higher-trust or more current.
- Which runtime areas are impacted.
- Which tests or QA artifacts must prove the change.

Do not update runtime behavior from a lower-tier source when a higher-tier source is available and contradicts it. Create a source-review finding first.

## Conflict Handling

When sources disagree:

- Do not silently pick the convenient answer.
- Keep Showdown mirror rows unchanged.
- Add or update a `champions_overrides` row if the Champion source is stronger for the active Champion lane.
- Add a focused test proving the intended runtime behavior.
- Add an Overview note if the conflict affects player-facing trust.
- Mark the source status as `needs_review` if no source clearly wins.

## Current Open Source Questions

- Reg M-B migration: source facts are recorded, but runtime promotion is blocked until image-sheet Pokemon allowlists and the 16 new Mega forms are converted into explicit reviewed data.
- Unapproved Champion mechanics: document only after an active ruleset source enables them; do not let non-Champion legacy data leak into Reg M-A/Reg M-B by default.
- Champion SP cap conflict: Showdown currently supports the `32` per-stat / `66` total guardrail, while at least one public preview conflicts. Keep the source conflict documented until a stronger Champion source resolves it.
- Champion-specific damage roll window: keep any confirmed Champion delta as an override with oracle tests, not a hand-edited hidden constant.
- Usage/meta sources: use them to guide coaching and team archetype testing, not as legality proof.
