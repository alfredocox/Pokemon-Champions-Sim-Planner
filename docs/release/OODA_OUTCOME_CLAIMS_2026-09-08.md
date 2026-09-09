# OODA: Outcome Is Not Decision Quality

Candidate `v2.2.148-evidence-not-outcome`, engine unchanged at `1.1.6`.

## Closed Locally

- Removed the automatic `endgame_misplay` inference from terminal loss/faint
  counts. Result, faints, timeline and material-exchange observations remain.
- Removed three IQ bonuses based only on absent detected errors. A parser's
  failure to detect an error is not positive evidence of good play.
- Both regression groups failed on the old behavior and pass after the patch.
  Terminal-loss checks cover both sides in singles and doubles. The initial
  sparse-input test was corrected to include a battle action before measuring
  the claimed behavior; empty input was already rejected correctly.
- Historical issue IDs remain readable; this does not rewrite saved reports.

## Remaining Trust Gates

1. Calibrate or withhold the wider IQ/percentile/confidence system. Other
   heuristic judgments still do not establish a proven better legal action.
2. Audit downstream learning consumers: `inferOpponentPlan` still has broad
   field-event attribution and needs upkeep/owner boundary tests.
3. Diagnose replay URL loading and verify actual saved-HTML import and physical
   export readback. The prior pasted-log UI pass is not proof of these paths.
4. Finish mechanics, regulation and approved-source gates; retain M-C quarantine.
5. Triage the GitHub-reported dependency alerts and complete live database
   security/isolation verification before public launch.
6. Independent review, hosted CI, exact-artifact deployment, manual user-path
   checks and Alfredo synchronization follow the release gates, not precede them.

OODA operating rule: reproduce, make a bounded fix, run its regression and
applicable wider tests, record proof and exclusions, then publish a candidate.
Close only the acceptance scope actually proved. No automatic production
promotion, 99% accuracy claim, or Josh approval is implied.

## Verification Record

Focused outcome regressions: two groups passing, with four side/format cases.
Full fast gate: 159 files passed, zero failures, four manual/helper skips.
Roadmap source and browser view regenerated. No new manual browser verification
is claimed for v148. Bundle identity is recorded in STATUS.md.
