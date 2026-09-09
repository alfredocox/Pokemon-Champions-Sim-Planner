# M-C Evidence Intake

M-C is active by the official September 9 schedule, but this app has not approved
its competitive implementation. v163 corrects stale warnings and captures the
new evidence. It does not remove the verification gate.

## New Official Evidence

- [Updated game notice](https://champions-news.pokemon-home.com/en/page/816.html)
- [Eligible Pokemon table](https://web-view.app.pokemonchampions.jp/battle/pages/events/rs178713870219xeaaio/en/pokemon.html)
- Captured and hashed notice/roster: `poke-sim/source/reg-m-c-official-roster.json`.
- 262 unique eligible IDs, compared with 235 previously captured M-B IDs:
  28 added, one removed. This is an ID diff, not 28 newly released species.
- Exact labels and Dex numbers reconcile 260 review-only identity candidates.
  Maushold `0925-001` and Squawkabilly `0931-002` remain unresolved. Neither is
  silently substituted with the base form. The five newly explicit form labels
  are Alolan Persian, both Toxtricity forms, and both Indeedee genders.

The official notice establishes the Mega limit, duplicate-item prohibition and
timers, but does not enumerate the complete eligible item/move/Ability inventory.
The earlier September 8 claim that the full roster was only accessible in-game
is historical and superseded. Source inventory now includes both new official URLs.

## Isolated Reference

Exact Showdown commit: `efe4948570d5e8189751792136d26e71710c6c66`.
Captured diff/probes: `poke-sim/source/reg-m-c-reference-intake.json`.
The installed app reference and lockfile are unchanged. The isolated upstream
checkout was installed with lifecycle scripts disabled and explicitly transpiled
using its build utility. No server was launched.

Important migration boundary: `champions` now means M-C; `championsregmb`
preserves M-B. A blind reference upgrade could change historical results.
The upstream checkout also requires Node >=22.18, while current hosted app CI
uses Node 20; the eventual upgrade must review runtime compatibility explicitly.

Availability-marker comparison: 357 to 392 species/form rows and 148 to 166 item
rows. These counts include a different universe than the official registered
roster and are NOT eligible-roster counts. Added rows include six Mega forms,
Rillaboom and other species; 18 additional item rows include the new stones,
Rocky Helmet, terrain seeds, Eject Button and Red Card. They are reference
candidates, not officially approved inventory.

Seven individual sets (Rillaboom and the six named Mega item combinations) were
tested in BSS, VGC and VGC Bo3 for M-C and historical M-B: 42 expected outcomes.
All M-C probes accept and corresponding M-B probes reject. These are individual
sets, not whole-team legality, in-game testing or battle-engine parity.

An initial harness draft used zero SP and an incorrect Golisopod stone spelling.
Those produced setup errors, not useful legality proof. The fixture now uses
66 SP and the captured upstream item name Golisopite, and generation fails on an
unexpected outcome. Never reinterpret bad fixture input as game rejection.

## Before Verified Activation

1. Resolve the two ambiguous official form IDs using exact official visual/form evidence.
2. Capture current-client eligible held items, stones, moves and abilities and
   review their differences from the pinned reference.
3. Add complete-team accepted/rejected tests, including clauses and selection
   sizes; validate new Mega timing, item effects and singles/doubles interactions.
4. Upgrade the reference only with explicit M-B/M-C routing, runtime compatibility
   checks, historic replay protection and regenerated artifacts.
5. Review the immutable package fingerprint, obtain the required approval, then
   implement the verified regulation path and rerun visible/exported battle tests.

Runtime warnings now acknowledge captured evidence instead of repeating the old
M-B image-sheet blocker. M-C remains noncompetitive and cannot write trusted
learning statistics. No DB mutation, rule approval or deployment occurred.

Independent reviewer Hegel reproduced all 42 saved inputs with exact errors:
21 accepted M-C and 21 rejected M-B. Regeneration matches the captured output.
Review found and closed incomplete saved inputs and stale M-B mapper metadata;
all 235 historical identity rows remain unchanged. The first full gate caught
the stale M-B fingerprint, which was regenerated rather than disabling its test.

Local browser selection of M-C confirms the corrected warning and current-date
message. Light/dark warning surfaces were checked and the prior low-contrast
light warning corrected. Screenshots are local artifacts `mc-v163-light.png` and
`mc-v163-dark.png`. This warning-only check ran no battles and does not certify
the broader simulator UI or replay behavior.

Fresh full local `npm test` passed after the evidence fixes, including 12
offline/mock DB files and four manual/helper skips. The runner's three skipped
administrative checks are not live DB proof. Roadmap generation check also passes.

Reproduction from `poke-sim`: clone the exact upstream commit into an isolated
directory, install its locked dependencies with scripts disabled, transpile,
then run `node tools/audit-mc-reference.mjs <upstream> <commit> <output-json>`.
Capture tools only collect candidates; never run them during approval to replace
the bytes being reviewed. Preserve historical captures.
