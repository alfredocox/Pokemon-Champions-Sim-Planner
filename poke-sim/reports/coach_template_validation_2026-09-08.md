# Coaching Template Evidence Audit

Independent review after v155 found separate template paths that still promoted
missing or aggregate evidence into advice. `coachPost` diagnosed position-control
failure and high confidence from 100 wins with no turn log. `coachIn` fabricated
50% for missing or zero scores and reused the last row if the requested turn was
absent. `coachPre` prescribed a first-four bring and best lead without comparative
evidence. The footer called unspecified counts games and asserted Battle-tested.

## Bounded Changes

- Pre-battle text identifies the current selected matchup, not an inferred best
  plan from aggregate history or arbitrary first-four roster order.
- In-battle text requires the requested turn, preserves finite zero values and
  labels a position score as a heuristic index, not calibrated win probability.
  Speed snapshot is explicitly not complete priority/action order.
- Post-battle text counts supplied log entries, not games or evidence quality, and makes no
  root-cause, team-flaw or high-confidence inference from volume or RNG proximity.
- Footer states the simulation evidence limit without fabricated counts or a
  performance tagline. Three now-unused inference helpers were removed.

Four initial function-only regressions failed before and pass after. Three more
cover ambiguous/malformed input and invalid-current versus legacy score handling.
Independent review caught that invalid-current fallback, then confirmed all seven
tests passing after correction with no remaining scoped findings. Existing voice
tests pass after correcting old RNG-cause and marketing-tagline expectations.
These tests do not establish real-game mechanics or the broader Strategy system.

## Browser Evidence

Candidate v2.2.156-coaching-template-evidence / engine 1.1.9 unchanged:
11,475,575 bytes, SHA-256
`6790c626d1460c9760c98ab92e1a254c27c8e8079c701978f5ac276e6dea3e84`.
`artifacts/browser-replay-imNN7A` pairs two games plus one continuity revisit,
17 paired turn rows, zero mismatches/page errors. Starting loss-summary and dark
mobile faint/reserve screenshots inspected. It had speed-control effects but no
weather/terrain/Trick Room, exposing an overly narrow screenshot selector.
The selector now also captures Tailwind/screens. `browser-replay-cv4AvB` pairs
two games plus continuity, 21 rows, zero mismatches/page errors. The inspected
field screenshot shows resolved Tailwind/Trick Room, faint/replacement events,
and the corrected neutral heuristic text. DOM parity is not mechanics proof.
Final project gate passes 169 fast and 12 offline/mock DB files, with four
manual/helper skips. No production DB or deployed-site verification is implied.

Remaining presentation observation: the replay row's separate score header still
uses a percentage-style heuristic label. Its missing/invalid evidence handling
needs a separate consistency review; this template fix does not close that path.

## Remaining Gates

Re-enable tactical recommendations only with historical action availability,
immutable matchup identity, calibrated outcome comparisons and negative fixtures.
The Brain, other strategy cards, score model and saved-result aggregation still
need independent correctness review. No live DB change or regulation promotion.
