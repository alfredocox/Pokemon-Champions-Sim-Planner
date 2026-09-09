# M-C Draft Team Smoke Tests

## Scope

Three authored, experimental doubles teams, not copied tournament teams or a
claim about the strongest current metagame. Official additions informed the
choice of Mega Salamence, Mega Golisopod and Mega Baxcalibur:

- https://champions-news.pokemon-home.com/en/page/816.html
- https://www.pokemon.com/us/news/get-ready-for-regulation-set-m-c-in-pokemon-champions

Pinned reference: `efe4948570d5e8189751792136d26e71710c6c66`, format
`gen9championsvgc2026regmc`, mod `champions`. Compiled bytes must match the
reviewed canonical fingerprint below. This is not an installed-reference upgrade.

## Drafts

1. Salamence balance: Salamence, Rillaboom, Incineroar, Rotom-Wash,
   Gholdengo, Whimsicott.
2. Golisopod rain: Golisopod, Pelipper, Archaludon, Rillaboom,
   Gholdengo, Incineroar.
3. Baxcalibur snow: Baxcalibur, Ninetales-Alola, Incineroar, Gholdengo,
   Rillaboom, Rotom-Wash.

The tool contains exact registered sets. Every spread uses 66 Champions SP,
at most 32 per stat. Its `evs` property is Showdown's Champions SP encoding,
not main-series EVs and not a supported old-site import contract.

## Executed Evidence

Run `node poke-sim/tools/test-mc-draft-teams.cjs` after preparing the exact
isolated compiled reference described in the M-C intake document.

- Three complete six-member teams accepted by the pinned validator.
- Eighteen base-stat checks and three Mega stat/type/Ability checks passed.
- All 72 move slots retained with power, accuracy, priority, category and target
  metadata from that reference. This does not assert all moves were used.
- Six distinct completed doubles games, 7-17 turns, both directions for each
  pair. Each repeated after 1.1 seconds with identical battle-event hash:
  12 executions total. Only exact wall-clock timestamp records are normalized;
  both raw logs and their separate integrity hashes are retained.
- Both sides Mega Evolved in each game. Registered brings rotate; no ranking
  is derived from the random-policy results.
- Negative controls reject duplicate items, a 508-EV main-series spread, and
  Incineroar with Knock Off.

Generated local evidence is under `poke-sim/artifacts/mc-draft-teams/`:
`TEAMS.md`, `report.json`, and twelve referenced raw `.log` files. These ignored artifacts
are reproducible, not automatically published. No engine or database changes.

## Live Blocker And Lessons

Actual live browser inspection showed `v2.2.142-pp-replay-proof`; regulation
choices were Practice, M-A and M-B only. M-C is absent. Teams also displayed
both Unknown ruleset and LEGAL, a known misleading-label release gap.
No teams were imported, no existing saves overwritten, and no browser battles
run. Therefore there is no paired visible/export battle evidence for this task.

Do not force these drafts through Practice and call the result M-C. Do not
convert 32 SP into 32 EVs. Reference move pools exclude Incineroar's Knock Off
and U-turn and Archaludon's Body Press; familiar older teams are not proof of
Champions learnsets. Mega Golisopod is Bug/Steel with Tough Claws in this pin,
not its base Bug/Water typing and Emergency Exit Ability.

Next: integrate the reviewed M-C data and exact stat-point import contract in
the candidate, close activation gates, then test actual imported teams with
paired visible/export logs. Missing exact sprites, Champions-specific mechanics
confirmation, supported policies and deployment remain separate gates.

Random-player smoke tests prove bounded execution and repeatability, not
competitive strength, app/reference parity, official legality or game accuracy.

Independent reviewer Hegel caught raw-clock timestamps invalidating the original
repeat comparison. The harness now preserves separate original/repeat files,
checks timestamp-only normalization and rejects changed battle events. Earlier
same-second hash agreement was insufficient evidence of repeatability.

## Delivery

Before candidate push, a fresh full `npm --prefix poke-sim test` passed, including
12 offline/mock database files and four manual/helper skips. Three administrative
checks remain not verified. The reference draft harness also passed again.
These are local results; hosted receipts belong to the exact pushed revision.

The `M-C Reference Drafts` pull-request workflow prepares the exact isolated
reference under Node 24, verifies its compiled fingerprint, runs this harness,
and retains the generated team sheets and original/repeat logs for 14 days.
It has read-only repository permission, no secrets, and no deploy or database
step. Main CI continues to test the existing app baseline separately. A green
reference job must not be described as app parity or regulation approval.

Fastest safe live path remains: candidate runtime data and mechanics integration,
paired app/reference tests, regulation review and release/security gates, then
Pages deployment and artifact/readback verification. This workflow does not
short-circuit those steps or replace the public site with an untested candidate.

### Cross-Platform Failure And Fix

The first hosted run failed the original exact Windows compiled fingerprint.
Local inspection proved only `dist/config/config-example.js` contains CRLF:
upstream copies this tracked file verbatim instead of transpiling it. Normalizing
only that file to LF produces exactly the Linux job's observed fingerprint:
`2ac4f2a3fd74a17a1509ebb5e1b191c55a7bf9292dfe76c2a0da468a411c59ad`.
All other compiled JS bytes remain exact, with no arbitrary fingerprint allowlist.
Reports retain raw and canonical fingerprints; the original intake is unchanged.
First failing Yfactor run: 34416210855. Canonical fingerprint fixes must pass a
new hosted run before delivery is considered verified.
