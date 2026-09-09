# OODA Replay Attribution Fix

Local candidate: `v2.2.147-replay-attribution`; engine remains `1.1.6`.
This is agent-executed QA, not Josh's independent review or approval.

## Observe

The [previous QA pass](JOSH_ASSIGNMENT_AGENT_QA_2026-09-08.md) found false
switch/weather coaching, incorrect move and damage attribution, item/ability
confusion, and unverified catalog matches presented as trusted identities.

## Orient

The parser grouped evidence by turn/species instead of the relevant event and
target slot. Export mapping treated catalog overlap as identity and substituted
the exporter build for unknown source versions. The export helper also read a
global replay context instead of its supplied context.

## Decide And Act

- Track fainted slots; mark forced replacements and drags nonvoluntary. Keep
  ordinary switches voluntary and disguise replacement events nonvoluntary.
- Preserve weather upkeep. Only newly started, attributable opponent field
  effects count as field progress; endings and unknown owners do not.
- Associate miss/failure move labels with the matching actor's current move.
- Consume effectiveness evidence for its target slot at the damage event.
  Later hits, opposing mirror species and residual damage cannot inherit it.
- Separate ability activations and generic move activations from item events.
- Keep catalog overlap under `candidate_team_id`; authoritative IDs stay null.
  Species overlap cannot prove hidden sets, regulation or legality.
- Export unknown source engine/ruleset versions separately from
  `exporter_build_id`, and use the supplied replay context.

## Verification

- All six original regression groups were observed failing before their fixes.
- Eight focused regression groups now pass, including mirror slots and unknown
  field-owner/turn-boundary cases: `poke-sim/tests/replay_event_attribution_tests.js`.
- The initial broad run reported two failing files. Rechecking identified stale
  parser assertions that required Rough Skin as an item and field-failure advice
  despite recorded own Tailwind. Corrected those expectations; the final full
  fast gate passed 158 files, zero failures, four manual/helper skips.
- Existing parser suite: 19 checks pass. Summary/timeline: 7. Learning: 16.
- Manually opened the generated v147 bundle on local port 8770. Replayed battle
  `gen9championsvgc2026regmb-2638363717` using pasted public protocol, retaining
  battle events while omitting chat/timestamps/rating commentary. This was not
  the original saved-HTML upload flow.
- Visible review preserved five turns, players, loss, leads and revealed player
  four. False switch/weather warnings disappeared; Hurricane was named; Protect
  was not an item; Supreme Overlord appeared as ability evidence. Pelipper's
  22% HP event retained resistance; the earlier 53% event did not inherit it.
- Export click reported `champions-replay-scenario-tactical-qa-01-2026-09-08T02-08-57.json`
  and blocked trusted use pending mapping/regulation. The file was not found in
  inspected local download/workspace locations: physical download readback is
  NOT verified. Payload content is covered by the executable export test.

Bundle: 11,485,741 bytes. SHA-256:
`d863672500a888703ab39dfb4a52b49fbe0db62586939236871571f3eee44b47`.

## Next OODA Cycles / Release Holds

1. Diagnose browser replay URL `Failed to fetch`; shell HTTP works. No CORS/CSP
   root cause is established. Verify actual HTML upload and download readback.
2. Replace unsupported outcome-based judgments: the visible final loss still
   yields `Endgame Misplay` without a proven better alternative. Battle IQ and
   generic confidence remain uncalibrated.
3. Test exact-set verification and ambiguity, Illusion/form changes, pivot and
   revival sequences, multi-hit effectiveness and delayed effects. This patch
   does not claim complete action provenance for all Showdown protocol events.
4. Finish PP/Substitute, regulation, complete-game/paired export and live
   database security gates from the product trust audit.

No battle-engine change, production DB write, merge, deployment or Alfredo
alignment is established by this pass. Broad green tests do not establish 99%
competitive accuracy. Keep PR #195 behind its remaining review gates.

## Publication Readback

- Runtime/tests/report committed and pushed as `29fc41f` to the existing
  candidate branch and PR #195. Hosted checks were pending when inspected;
  this is not deployment or independent approval.
- GitHub's push response reported 16 default-branch dependency alerts: seven
  high, seven moderate and two low. These are untriaged platform-reported
  alerts, not independently validated exploit paths. Review Dependabot and
  affected runtime/development scopes before public-launch approval.
