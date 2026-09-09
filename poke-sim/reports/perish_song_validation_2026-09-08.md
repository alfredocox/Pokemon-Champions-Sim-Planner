# Perish Song Countdown And Immunity Audit

September 8, 2026. v153 / engine 1.1.9 local candidate; not release clearance.

## Reproduction

Ten side-swapped synthetic doubles probes failed before the change. The engine
initialized a three-turn counter and decremented it immediately, fainting all
affected active Pokemon at the third end-of-turn. The pinned reference keeps
them alive through that boundary and resolves the song on the fourth.
The implementation also reapplied the counter to every active member without
checking Soundproof or preserving an existing countdown.

Reference: `pokemon-showdown@0.11.11`, `champions` mod,
`gen9championsdoublescustomgame`, seed `[123,456,789,42]`. Pinned Perish Song has
duration four; Soundproof exempts self-originated sound and may be bypassed by
Mold Breaker unless Ability Shield preserves it. Synthetic assignments isolate
mechanics, not legal competitive sets.

## Candidate Changes

- Initialize the internal countdown at four before the current end-of-turn.
- Check Soundproof per recipient, preserving the reference's source exception.
- Do not restart a running countdown when the song is reused.
- Add `perish_song_turns` to local/reference snapshots for direct comparison.
- Skip concealed recipients; record charge-start move use in the action log.
- Resolve expiration using the pinned reference's Trick Room-adjusted 13-bit
  action-speed key. When Perish
  expiration leaves both complete rosters fainted, use the last fainting side as
  the winner, as the pinned reference does, instead of applying the generic draw.

Twelve probes now pass through four turns: recasting, source/target Soundproof,
Mold Breaker, Ability Shield, exact HP, PP, countdowns and fourth-turn faints.
The existing 105-case move registry also passes. Independent review found no new
regression in that declared fix. The pre-registration standing battle audit
passed its selected suites, goldens and matrix; it did not yet include this new
file. Final full-project/battle/release gates remain pending.

## Replacement Boundary

An attempted exact replacement-member comparison exposed different chooser
policies: the reference takes the first living bench member while local policy
ranks candidates. One surviving side legally chose slot 3 locally versus slot 2
in the reference. This is not evidence of an illegal switch, but it prevents
claims of identical continued games without a shared replacement script.

The current test therefore proves replacement counts, unique living registered
identities, and cleared counters. It does not claim identical tactical choices.
The failed exact comparison is retained in the local test log.

## Remaining

Independent review reproduced two broader defects: Phantom Force's concealed
recipient incorrectly receives a countdown; a two-wave terminal song resolves
to a local draw while the reference awards the surviving last-fainting side.
These reproduced defects now have candidate fixes. Sixteen probes pass, including
the two-wave complete-game winner and faint order in both orientations and
Phantom Force's missed recipient. The complete-game test does not claim full
actor/PP trace equality because replacement policies differ. Final review and
full gate are rerunning on the v153 artifact.
Four further controls reproduced No Guard source/target bypass of concealment.
The guard now respects No Guard, and 20 probes pass. First v153 full project and
battle audit passed before that final guard refinement; the final gate reruns.
Independent review then reproduced the initially omitted Trick Room transformation
in terminal ordering. Added a turn-six Trick Room control to both eight-turn
scripts, reproduced the wrong winners, and corrected the action-speed key against
the pinned implementation. All 22 probes now pass; final gates rerun after this
correction. Earlier assumptions and passing counts did not clear this boundary.
Independent final recheck passes 22/22 probes with no remaining scoped findings.
Tied-Speed RNG, mixed residual/timer outcomes and identical replacement choices
remain excluded. Final artifact: 11,481,778 bytes, SHA-256
`29808a41882457256e5f3747421f05e1bca7c2b892f2660ae550e2b105b0c354`.

## Final Local Verification

Full project gate: 165 fast files, 12 offline/mock DB files, zero failures and
four manual/helper skips. Three administrative security checks remain unverified.
Battle audit: all selected suites, three unchanged goldens and 4,500 matrix games
pass with zero JS errors. Release manifest's six artifact/freshness checks pass.
Local Chromium confirms v153 and its new roadmap entry with zero page errors;
no simulation ran in that smoke. Hosted CI and paired replay verification remain
separate. These final results supersede the pending-gate notes above without
erasing the failed attempts and corrections.
Switching/re-entry, timer/recast edge cases and paired visible/export logs also
need further work.
No production, regulation promotion, Pages deployment or game-accuracy percentage
is implied by this candidate.
