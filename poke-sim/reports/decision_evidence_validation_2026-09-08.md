# Decision Advice Evidence Boundary

## Reproduced Problem

A synthetic T7 snapshot with Protect chosen, Recover at zero PP, and the replay's
turning point set to T1 produced a Recover recommendation, an `expected_delta`
of 17 and an execution-error diagnosis. No post-turn or counterfactual evidence
was needed. The score gap was an arbitrary heuristic utility difference, not a
predicted change in outcome.

The engine's legacy `legal_options` field is a move inventory paired with the
first opponent name. It is not a verified action request. Historical snapshots
include PP but omit complete Disable, Encore, Choice and action-lock state and
candidate target availability. Positive PP cannot prove an alternative was usable.
Falling back to current team definitions also cannot establish historical facts.

## Bounded Correction

The decision-audit API preserves its public empty result shape but emits no
authoritative alternative flags from these snapshots. The replay summary no
longer diagnoses execution mistakes or a better turning-turn line from heuristic
scores. It directs review to recorded actions and board changes and explicitly
states the evidence boundary. Actual replay facts remain visible.

This intentionally withdraws unsupported advice. It does not repair the engine's
legacy move-inventory schema, introduce an alternative battle policy, or claim
the broader coaching system is correct. The unused scoring helper is not proof
and is not used to generate authoritative flags.

## Regression Evidence

Nine new negative cases fail before/pass after: zero PP, positive PP with missing
locks, absent PP, stale current-team fallback, Choice, Assault Vest, Struggle,
ambiguous actors and missing candidate targets. Three historical phase5 tests
were corrected because they required unsupported advice; the phase5 suite passes.
These are function-only synthetic evidence tests, not simulations or game oracles.

Independent review confirms the two edited functions close the original paths
and all nine boundary cases pass. It reproduced two separate next-priority paths
in `strategy-injectable.js`: `coachIn` invents a 50% score when absent and emits a
generic directive; `coachPost` invents a position-control root cause and raises
confidence from count alone, even for 100 wins with no turn evidence. Those
findings are not closed by this scoped batch. Pre-battle templates also need review.

Local browser capture `artifacts/browser-replay-VJXy7g`: two intentional games,
three pairs including continuity, 22 paired turn rows, zero mismatches/page errors.
The runner captures summary text and rejects the retired causal phrase. This is
not a check of every other coach card. Candidate bundle SHA-256:
`2aadb38210f6d0173619af888b0cae3ba53f2c87671f0ca80c2d701cd30de28a`
(11,477,850 bytes), build v2.2.155-decision-evidence-boundary, engine 1.1.9 unchanged.
Full project gate passed 168 fast and 12 offline/mock DB files, with four
manual/helper skips. Starting-state screenshot inspected. Hosted CI is separate.

## Re-Enabling Gate

1. Capture versioned historical move-and-target availability using stable actor
   IDs and all relevant action restrictions, not current team definitions.
2. Validate availability against the pinned reference with negative fixtures.
3. Separate a heuristic review candidate from a verified alternative. Any outcome
   claim needs a stated counterfactual method and uncertainty, not a score gap.
4. Bind the analysis to the immutable replay, ruleset and analysis version; test
   stale caches, edited teams, imports and both format lanes before publication.

Broader coach cards, score calibration, complete-battle parity, live DB security
and official regulation approval remain distinct open gates. No accuracy percent.
