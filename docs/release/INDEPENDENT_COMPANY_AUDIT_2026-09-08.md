# Independent Product And Engineering Audit

Research snapshot: September 7-8, 2026. Audited runtime commit: `c45a70298110c7cac8fe0c791e1456440fb88306`. Documentation-only follow-up; no runtime fix, database write, release or accuracy certification.

## Decision

Follow-up: [v149 OODA remediation](OODA_COMPANY_FINDINGS_2026-09-08.md) records subsequent scoped fixes and containment. The observations below remain the original audit snapshot, not the current closure status.

Keep the product in controlled preview. The deterministic engine, pinned reference adapter, evidence contracts and fail-closed regulation gates are useful foundations, but new reproduced failures block reliable competitive-advice claims. The product hypothesis is a traceable team-revision loop: build -> validate -> simulate -> inspect -> improve. Demand and player benefit remain to be demonstrated.

Two independent read-only reviewers covered engineering and product boundaries. The parent independently reproduced all three code failures below, inspected the public site's initial navigation, checked live GitHub and database metadata, and reran five focused test files. This is a critical-path audit, not an exhaustive file-by-file certification.

## Fresh Findings

| ID | Priority | Observed evidence | Required closure |
|---|---|---|---|
| AUD-1901 | High | Toxic into full-health Leftovers Blastoise: local 186 HP versus pinned Showdown 175 HP in a synthetic doubles probe. Reviewer also swapped sides. `engine.js:6850,6997`. | Shared residual ordering plus full/lethal HP, recovery, status, field and side-swap regressions; retain Champions-specific verification gap. |
| AUD-1902 | High | Zero replay/plan lineup overlap still produces `matched`, `observed` and `shouldUpdateBringFourModel: true`. `ui.js:9254`, `replay_learning.js:692,799`. | Verify both team versions, format/ruleset and evaluated coverage; reject placeholders and ambiguous partial rosters before trusted comparison. Persistence or mutation was not demonstrated. |
| AUD-1903 | Medium | Tailwind with only poison damage from 50% to 38% yields high-confidence conversion praise and +10 Speed Control IQ. `replay_coach.js:1392,1524`, `replay_learning.js:365`. | Require cause-linked action evidence; residual and unrelated damage must not create speed-control credit. |
| AUD-1904 | High release gate | Live authorization metadata recheck does not clear the shared-evidence security gate. RLS enabled is not sufficient. | Reconcile schema/migrations in staging, prove visitor denial and two-user isolation; retain detailed metadata privately. No write attack executed. |
| AUD-1905 | Medium operations | Three latest news runs failed; hosted log rejects combining `gh api --slurp` with `--jq`. Candidate workflow retains that invocation. Three latest Regulation Watch runs also failed; latest Showdown sync runs succeeded. | Repair each watcher with fresh hosted proof; keep source failures distinct from unchanged sources. Do not weaken fail-closed regulation checks. |

## Reproduction Inputs

- AUD-1901: use the first `referenceProbes()` fixture, replace player moves with Splash and Growl, give player slot 1 Leftovers, replace opponent moves with Leer and Toxic targeting foe slot 1. One scripted turn through `compareProbe` returns `post_hp` local 186/reference 175. This is synthetic mechanics evidence, not competitive legality approval.
- AUD-1902: call `buildSimComparison` with replay `yourFour` Magikarp/Feebas/Sunkern/Caterpie and supplied `simPlan.bestFour` Whimsicott/Incineroar/Dragapult/unclear. `fourMatch` is 0 yet status is matched; `buildSimFeedbackPacket` sets the bring-four update flag true.
- AUD-1903: replay starts Whimsicott at 100/100 and opposing Arcanine at 50/100 psn. Whimsicott sets Tailwind; the only damage event is Arcanine at 38/100 psn with `[from] psn`; advance to turn 2 and Protect. Inspect `speed_control_converted` and `learningReport.battleIq.raisedBy`.

## Passing Tests And Their Limits

Fresh parent and reviewer runs passed:

```text
node --test tests/replay_outcome_claim_tests.js tests/replay_event_attribution_tests.js tests/t192_battle_sensei_learning_tests.js tests/showdown_reference_tests.mjs tests/t9j16_tests.js
```

These include 69 Strategy checks and 19 reference contracts, but do not catch the new failures. The reference comparator supports doubles; singles stress invariants do not prove singles parity. The accuracy loader differs from the browser stack. No new full-browser simulation, paired visible/export batch, complete-game parity or mobile screenshot study was performed in this audit.

## Product And Release Snapshot

- Public site: `v2.2.142-pp-replay-proof`; its fetched bytes/hash match the deployment manifest. Candidate: v148, not deployed.
- PR 195 remains open; applicable checks pass, Supabase Preview is skipped. An empty reviewDecision field is not independent approval.
- Main and Alfredo main differ. TheYfactora12 main reports no protection/rulesets; Alfredo main reports protected. Align only after a reviewed release; no force-sync.
- Public Start Team Test navigation worked. Eleven peer tabs mix player and developer tasks. Friction is a hypothesis requiring observed users, not a measured usability failure.
- README/AGENTS/roadmap emphasize doubles; STATUS also records the requested eventual singles-and-doubles destination. Resolve that scope explicitly. Recommend separate format release gates, not discarding singles.
- README bundle size and historical test baseline are outdated. Consolidate current status and label older evidence rather than rewriting historical results.
- Sixteen open development-scoped dependency alerts require reachability/build-chain triage, not an unsupported browser-compromise claim.

## Ordered OODA Backlog

1. Contain shared-evidence authorization risk and verify staging isolation.
2. Reject mismatched replay/simulation identity before trusted feedback.
3. Fix residual ordering from retained failing reference fixtures.
4. Require cause-linked coaching evidence; remove unsupported score contributions.
5. Repair news and regulation watcher health without automatic rule promotion.
6. Reconcile release scope and one claim ledger across current docs/site.
7. Expand selected complete-game and browser-equivalent reference checks, preserving paired logs.
8. Observe six target players completing one team revision using controlled/local data. Formative sample, not statistical market proof.
9. Enforce protected release gates, triage dependencies, verify hosted build, then align Alfredo.
10. Run a bounded Showdown engine-adapter feasibility experiment before deciding on any replacement.

All ten remain open; this audit discovers and prioritizes rather than closes them. Observe a reproducible failure, orient around its shared contract, decide a bounded fix, act and retest independently. Do not mutate expectations merely to restore green tests. Track player task completion and evidence-backed revisions alongside correctness; raw battle count is not the product outcome.

## Sources And Limits

- [Showdown Node API](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/sim/README.md): battle simulation, team conversion/validation, Dex APIs; not a promised drop-in browser engine, and undocumented APIs need exact pins.
- [Showdown damage calculator](https://calc.pokemonshowdown.com/): exposes Champions and singles/doubles controls. An alternative for isolated calculations, not a complete-game accuracy endorsement.
- [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api): grants and RLS jointly enforce authorization.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): enforce reviews and status checks.
- [PR 195](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/195), [failed Regulation Watch](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/actions/runs/34149511818), [failed news job](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/actions/runs/34163343118).

The full official M-C notice was not retrievable this pass; prior captured roster/dates are not newly certified. No formal exhaustive security scan, live writes, two-user HTTP test, restore test, complete browser battle, human usability session or universal accuracy study was completed. Human help remains necessary for authorized staging users, official/in-game confirmation, independent release review and player sessions.
