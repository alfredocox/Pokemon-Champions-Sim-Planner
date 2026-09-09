# Replay Evidence Guard

Change class: evidence/brain, experience. Local audit candidate only.

## Reproduction

On public v138, paste ordinary prose into Review and select Analyze Replay.
The page reports no parsed turns but generates decision scores, coaching and
an enabled private-save button. A lower confidence label does not repair this.

## Intended Change

Reject coaching when parsed input contains no observed battle events in a
positive-numbered turn. Preserve raw parser metadata for diagnostics.
Clear old results and save/export context when input changes or review fails.
Keep partial replays with observed battle events supported and uncertainty labeled.

## Verification

Add regression coverage for prose, chat-only, empty turn markers, winner-only
metadata, valid partial/full replays, and valid-to-invalid UI transitions.
Rebuild the local bundle and verify the same malformed-input journey locally.
Public v138 remains unchanged; no mechanics or database changes are authorized.

## Implemented And Reviewed

The bounded local patch, independent-review corrections, test results, remaining
gaps and exact artifact identity are recorded in
[the final player-trust audit](PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md).
Release marker: `v2.2.139-replay-evidence-guard`. This draft describes intent;
the final report owns observed proof. Full protocol validity, partial-log
confidence and authenticated save/readback remain open.
