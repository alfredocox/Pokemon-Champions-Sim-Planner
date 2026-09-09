# Champions Move Context Validation

Candidate: v2.2.160-champions-move-context; engine 1.1.10 unchanged.
Proof state: local verification and scoped independent review complete; hosted CI pending.

## Observe And Orient

The preceding [inherited-pool audit](champions_move_pool_alignment_2026-09-08.md)
reproduced seven individual-set acceptance disagreements. Generic historical
learn-method rows were being used as Champions pools. Correct species IDs and
stats did not make that consumer correct.

## Decide And Act

- Generate all mirrored identities through pinned Showdown 0.11.11 Champions
  `getMovePool` and `getFullLearnset`, preserving source fingerprints and exact
  identities. The artifact contains 1,517 identities: 1,500 known pools and 17
  unavailable Pokestar entries. This is not a regulation-eligible roster.
- Require explicit Champions or historical context for move listing/validation.
  Unknown contexts, missing data and conflicting pool identity fail unchecked;
  Champions never borrows historical moves. Historical is not current SV proof.
- Route stored team format through imports, editor and validation. JSON imports
  retain explicit `champions`/`sv`; missing or unsupported formats are rejected.
  Showdown text retains the existing explicit import-path Champions default.
- Resolve replay context from recognized tier/game-type evidence. Missing,
  contradictory or late headers remain unchecked. Exact pinned A/B VGC, Bo3
  and BSS names are recognized; arbitrary future regulations are not inferred.
- Preserve outdated catalog records under Needs review instead of deleting them
  from runtime memory. They remain excluded from runnable selections. Original
  curated moves are not silently rewritten to make a fixture legal.
- Load the pool as a separately cached static asset before its consumers in
  source and bundled HTML. Missing asset must fail closed. The battle engine
  dependency is not shipped to the browser; the existing bundle-size cap stays.

## Local Evidence

- Full gate: 179 fast test files and 12 offline/mock DB files pass, with four
  manual/helper skips. No live DB verification is implied.
- Generator: nine regression groups and deterministic freshness check. Runtime:
  eleven groups including all source keys, exact male identities, opposite-form
  separation and swapped/missing/conflicting pool-row IDs.
- Imports: eight explicit-format/container groups and 35 existing import checks.
  Seven source-gap groups reject absent/throwing/incomplete validators while
  preserving the matching-stone pre-Mega registration ability. Replay: fifteen
  context groups, including generation contradictions, plus parser/evidence gates.
- Census `artifacts/move-pools-c8wQWx/report.json`: all 235 reviewed identity
  candidates agree with the pinned inherited pools; all eight narrowed set
  probes agree. The audit fingerprints the generator, generated pool, consumers,
  mirror, mappings and installed reference distribution.
- Browser `artifacts/browser-replay-hK0d24`: two intentional games, three
  actual-download/visible-log pairs, 23 compared turn rows, zero mismatched pairs
  and no page errors, including retained evidence after a team swap.
- Battle audit: declared 4,500-game invariant matrix and three unchanged golden
  battles pass. It includes synthetic/legacy sets and is NOT proof that those
  teams pass current competitive admission.
- Browser `artifacts/move-context-ui-nfRaW8`: source and bundle, each with the
  external pool loaded and blocked, pass 82 checks. Original rejected moves
  remain available under Needs review and absent from runnable selectors.
  Import persistence is suppressed; SV editor helper coverage is not a full SV
  editing journey. No games or database writes occur in this audit.
- Independent review reproduced then closed generation contradictions, malformed
  JSON partial-import throws, source-gap admission and a newly caught Mega
  registration regression. The final reviewer reran all six affected suites.
- Edit-dialog name rendering was separately hardened with literal-text controls,
  an in-memory pre-fix negative test, independent source-boundary review, and
  actual local file-upload/Edit clicks in source and bundle. Stored names remain
  unchanged; no live/deployed security verification is implied.

Several old UI fixtures lacked the actual legality modules or relied on stale
curated moves. Fixtures now load the real source stack; unrelated render tests
use explicitly valid test-only moves. Separate assertions preserve and reject
the original stale catalog data. No production team data was edited.

Final rebuilt artifact: 11,489,176 bytes, SHA-256
`3e00c95ae14119257242f10bb579903d0edf0efcb8ea6b09bf5a9fe1b0f86392`.
Fresh manifest/load-order checks pass. Final repeat browser artifacts are
`browser-replay-OAzDCm` (two games, three pairs, 17 rows, no mismatches/errors)
and `move-context-ui-yEWfHY` (all four source/asset-availability cases pass).

## Remaining Gates

1. Hosted CI and exact candidate artifact verification; no merge/deployment.
   Follow-up investigation reproduced loss of `member_id` during an unchanged
   existing-team paste edit. Team ID and format survive, but individual identity
   does not. Preserve unambiguous identity without transferring IDs by slot.
   The same SV edit preview incorrectly uses Champions while save retains SV.
2. Complete-set combinations, abilities/items, availability and global bans are
   separate from a species move pool. Broaden reference comparisons and obtain
   official/in-game Champions confirmation before competitive sign-off.
3. Supabase still holds the generic mirror, not newly published Champions pool
   rows. This change adds a reproducible offline reference artifact; it does not
   establish a DB-backed publication pipeline or live source parity. Design
   versioned row storage/publication through the existing reviewed package gate.
4. M-A/M-B/M-C remain unapproved. Human approval must bind the exact reviewed
   fingerprint. No regulation promotion, live DB writes, merge or deployment.
5. Full-battle mechanics, broader Strategy correctness and live shared-write/
   two-user isolation remain open. No defensible 99% game-accuracy claim.

Learning: format belongs to evidence and team identity, not the currently selected
UI filter. A safer validator must preserve rejected user data for repair without
letting it pass as trusted simulation input.
