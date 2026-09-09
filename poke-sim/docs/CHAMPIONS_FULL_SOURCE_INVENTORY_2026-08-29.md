# Pokemon Champions Full Source And Data Inventory

Date: 2026-09-07 (updated from the 2026-08-29 inventory)
Status: M-C official notice captured; inventory framework active; complete Champion client inventory still required

## Decision

We should inventory every battle-relevant field, but we must not pretend the public web contains a complete Pokemon Champions database.

The correct source model is:

```text
Official Champion pages and client captures = Champion facts and legality
Pinned Pokemon Showdown data              = complete baseline rows and mechanics oracle
Reviewed champions_overrides              = confirmed differences
Unresolved field                          = needs_verification
```

The machine-readable manifest is `tools/champions_source_inventory.json`. The read-only collector is `tools/audit-champions-sources.mjs`. Its latest metadata/hash report is `reports/champions-source-inventory-latest.json`.

The read-only `.github/workflows/champions-source-inventory.yml` job runs weekly and on manual dispatch. It has `contents: read`, receives no Supabase credentials, and uploads the report for review instead of changing runtime data or the database.

## First Collection Result

The 2026-09-07 EDT run checked 12 official public endpoints:

- 10 responded successfully and were hashed.
- the two optional Pokemon Support pages returned HTTP 403 to automated collection and remain manual/browser review sources.
- no required public source failed.
- 7 official in-game capture sets remain required.

The official Regulation M-C notice is now part of the daily inventory. It confirms the September 9, 2026 02:00 UTC through December 2, 2026 01:59 UTC window, inherited prior eligibility, six named Mega additions, and Rillaboom as one example among 24 newly available Pokemon. It directs players to the in-game Roster Info pages for the complete roster, so the notice is not a complete allowlist.

The collector stores URL, final URL, UTC check time, HTTP status, content type, byte size, SHA-256, page title, canonical URL, and official modified date when exposed. It does not commit full page bodies.

Run:

```powershell
cd poke-sim
npm run champions:sources
node tests/champions_source_inventory_tests.js
```

## What Public Official Sources Prove

| Source family | Can prove | Cannot prove completely |
| --- | --- | --- |
| Pokemon Champions official site | modes, Singles/Doubles, Mega availability, HOME/training policy, official news links | every species/form/stat/move/item/Ability row |
| Pokemon.com regulation/news articles | regulation dates, named additions, rewards, selected Mega Stones and strategy examples | complete legal roster and complete item/move tables |
| Play! Pokemon VGC handbook | team construction, species/item clauses, level handling, forms, team-list requirements, event policy | every active Ranked Battle eligibility row or detailed mechanic |
| Pokemon HOME official pages | transfer/origin/move-replacement rules and named promotions | complete Champions legality and learnsets |
| Championship Series pages | event transition, competition context, results | simulator mechanics |

Official regulation M-B notice confirms that the complete list must be viewed in the game through Roster Info. That makes the in-game capture lane a required source, not optional QA.

## Complete Field Inventory

### Species And Forms

Required fields:

- canonical ID and display name
- National Dex and base species
- form and cosmetic/battle-form distinction
- types
- base stats or a reproducible derivation from controlled displayed stats
- Abilities
- weight
- gender-dependent battle form
- required item/move
- Mega form, Mega Stone, Mega typing, Mega stats, and Mega Ability
- active-regulation eligibility

Baseline: Showdown species/form data.
Champion proof: complete client roster plus controlled species-detail captures.
Gap rule: a Showdown form is not Champion-legal merely because it exists upstream.

### Moves

Required fields:

- ID/name, type, category, base power, accuracy, PP, priority, target
- contact/sound/pulse/bite/punch and other flags
- recoil, drain, HP cost, healing, stat changes, status, field and delayed effects
- multi-hit/spread/redirection/protection behavior
- Champion trainability per species/form
- Champion-specific behavior overrides

Baseline: Showdown moves, learnsets, protocol, and executable oracle.
Champion proof: client training availability, explicit official text, and focused client/replay fixtures.
Gap rule: matching static rows do not prove that the local engine executes the move correctly.

### Abilities

Required fields:

- ID/name and description
- eligible species/forms
- activation timing and event hooks
- suppression, copying, swapping, reveal, and switch/faint behavior
- Champion availability and overrides

Baseline: Showdown ability data and simulator behavior.
Champion proof: client training/species details plus focused behavior fixtures.

### Items

Required fields:

- ID/name and description
- held-item availability
- berries, consumption, removal, swapping, Fling, and Knock Off behavior
- choice/boost/recovery/protection effects
- Mega Stone ownership and form requirement
- item-clause legality
- reward availability versus battle legality

Baseline: Showdown item data and simulator behavior.
Champion proof: client item inventory plus official regulation/handbook facts.
Gap rule: “obtainable as a reward” and “legal/effective in this regulation” are separate facts.

### Learnsets And Legality

Required fields:

- species/form-to-move mapping
- training availability
- HOME replacement behavior
- event/promotion-only move or Ability
- active regulation, format, effective dates, species/form/item clauses
- legal, illegal, stale, and needs-verification fixtures

Baseline: Showdown learnsets.
Champion proof: client training and validation captures.
Gap rule: HOME compatibility does not prove that a transferred move remains usable in Champions.

### Battle Mechanics

Required families:

- action priority and effective speed
- Trick Room and speed-control ordering
- target/redirection/protection
- damage and rounding
- RNG
- switching, bench state, fainting, replacement, and stable identity
- items and Abilities through switch/faint/transfer
- status, weather, terrain, field and side conditions
- Mega Evolution timing and form changes

Baseline: pinned Showdown simulator/oracle behavior.
Champion proof: explicit official/client evidence or controlled Champion replay/client fixtures.
Gap rule: public descriptions are insufficient for edge-case mechanics.

## Required In-Game Capture Sets

1. Client version/build, platform, locale, and UTC timestamp.
2. Every active regulation page for Singles and Doubles.
3. Complete Roster Info pages, including forms and Mega forms.
4. Per-species training move and Ability availability.
5. Complete held-item and Mega Stone inventory/descriptions.
6. Controlled species/form details for type, stats, weight, Ability, and Mega changes.
7. Accepted/rejected teams covering each legality boundary.

Every capture must receive:

- capture ID and SHA-256
- source/device/build/locale
- UTC captured time
- regulation and format scope
- page/row sequence completeness
- extractor version
- reviewer decision
- linked normalized rows and regression fixtures

## Supabase Staging Design

Do not write source facts directly into approved runtime tables.

The next reviewed migration should add or confirm equivalent contracts for:

- `champions_source_documents`: URL/capture metadata, hashes, source tier, scope, fetch/review status
- `champions_source_facts`: normalized candidate facts with source pointer and field-level value
- `champions_inventory_findings`: missing/conflicting/drift findings
- `champions_overrides`: only reviewed Champion deltas from the pinned Showdown baseline

Public clients may read approved projections only. Source ingestion and promotion require a protected writer. RLS, security-invoker views, idempotent hashes, and append-only review history are mandatory.

No migration is added in this slice because the source/fact contract should be reviewed before a live schema is changed.

## Promotion Workflow

```text
Fetch/capture
  -> hash and metadata
  -> parse candidate facts
  -> normalize IDs
  -> compare with pinned Showdown baseline
  -> classify match / Champion override / conflict / missing
  -> human review
  -> add regression fixture
  -> promote approved rows
  -> regenerate offline runtime data
  -> run parity and release gates
  -> verify deployed artifact
```

Removed upstream rows are never silently deleted from approved runtime data. They become a blocking drift finding until reviewed.

## Definition Of Complete

The full inventory is complete only when:

- every field family in the manifest has a baseline owner and Champion authority
- every public official source has a fresh hash or documented access exception
- all seven client capture sets are complete for the named build/regulation
- every eligible Champion species/form has explicit legality status
- every approved move, Ability, item, and learnset row has provenance
- static rows and executable mechanics coverage are reported separately
- all differences from Showdown are reviewed override rows with tests
- source changes automatically stale affected evidence and coaching
- Supabase approved projections, generated JS, tests, and deployed Pages artifact agree

Current status is not complete. The public-source inventory is established; client capture, normalized field comparison, and reviewed promotion remain open.
