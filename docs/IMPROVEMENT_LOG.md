# Improvement Log

Purpose: show what improved, why it improved, how we checked it, and what is still open. This is a change history, not another roadmap or a percentage-accuracy score.

`STATUS.md` owns current status. `ROADMAP.md` owns future outcomes. Detailed dated reports own the underlying evidence. New entries use stable ascending IDs; append verification/rollback/recurrence notes to existing entries without deleting history. Only evidence-supported states may advance from local to staging, merged or deployed.

## Review Index

### IMP-0040: Test M-C Drafts Before Importing Into An Older Runtime

September 9, local reference-only: three full doubles drafts, explicit Champions
SP, base/Mega stat checks and six reproducible random-policy games. Negative
controls reject legacy EVs, duplicate items and an unavailable move. Live v142
has no M-C selection; no imports or browser battles were falsely counted as
M-C evidence. [Results and limits](release/MC_DRAFT_TEAMS_2026-09-09.md).
Lesson: familiar moves, usable artwork and successful reference battles do not
prove deployed support. Keep reference drafts separate until runtime parity and
the regulation approval gate are complete. No runtime, DB or deployment change.
Independent review caught a wall-clock-dependent repeat assertion. Preserve both
raw logs; normalize only timestamp records for event-repeat checks, and test
across a real time delay instead of relying on same-second runs.
First hosted run also caught upstream's verbatim config-example.js copy retaining
Windows CRLF. Normalize only that file for the canonical build fingerprint,
retain raw fingerprints, and require the same canonical bytes on Linux.

### IMP-0039: Replace Stale Regulation Blockers With Captured Evidence

September 9, v163: capture/hash the now-public M-C roster, preserve ambiguous
form IDs, and stage a pinned upstream inventory with explicit historical M-B
routing. Runtime warning text acknowledges completed evidence without silently
granting legality or learning eligibility. [Evidence and remaining activation gates](release/REG_MC_INTAKE_2026-09-09.md).
Lesson: active dates, available reference data and verified implementation are
different states. Bad probe inputs must be corrected as harness failures, not
counted as illegal-team evidence. No installed reference upgrade or DB promotion.

### IMP-0038: Align The Next-Work Queue

September 9, v162: STATUS and the generated Markdown/browser roadmap now put
security staging, known mechanics defects, broader identity/legality and reviewed
deployment in the same order. The stale v145 manual-QA target is retired. Runtime
labels/cache are bumped so roadmap changes can be distinguished from v161;
battle logic and engine version are unchanged. Both remote main branches remain
different from the candidate; no deployment or cross-repo parity is implied.
Lesson: one generated roadmap should describe future work, with STATUS recording
current proof, not competing outdated task lists.
Verification: 180 fast test files passed, four manual/helper files skipped;
11 release checks and roadmap generation check passed. Local browser reads show
the new queue and v162 label at 1440px and 390px, with no mobile horizontal
overflow. Screenshots: local `poke-sim/artifacts/roadmap-v162-desktop.png` and
`roadmap-v162-mobile.png`. No battles or database writes were performed in this
documentation/UI-label check; no new simulation proof is claimed.

### IMP-0037: Bind Required External Assets To Release Evidence

September 9: the HTML digest omitted the required move-pool file. The generator
now records that file and both intro sprites; freshness and staged Pages checks
reject changed or missing bytes. Eleven focused groups pass, including negative
fixtures. Runtime behavior is unchanged. [Release review and remaining gates](release/RELEASE_REVIEW_2026-09-09.md).
Lesson: a reviewed HTML hash alone cannot identify separately shipped inputs.
Independent review caught checkout line-ending drift; LF attributes and real
Git-filter coverage now protect the hashed text asset across platforms.
Local verification is not deployment; shared-evidence security and mechanics
review remain open.

### IMP-0036: Preserve Member Identity Across Edits

Paste edits no longer erase IDs/annotations, and individual species replacements
no longer inherit the displaced Pokemon's ID. Exact unique identities survive
reordering; ambiguous matches block saving. Real upload/edit/reload and paired
battle exports verify the custom-team path. See [proof and remaining gaps](../poke-sim/reports/member_edit_identity_2026-09-08.md).
Lesson: durable registration identity must not depend on current slot position.

### IMP-0035: Keep Imported Names Literal In The Edit Dialog

The edit dialog now applies the established output-escaping helper to imported
names. Stored names, titles, selections and custom/preloaded guidance remain
unchanged. A negative-control regression, independent boundary review and actual
local upload/Edit checks pass for both HTML builds. This is scoped local display
hardening, not a repository-wide or deployed security sign-off.
Lesson: safe rendering in the catalog must continue into every detail/edit view.

### IMP-0034: Bind Move Validation To Explicit Context

The shared helper now uses a reproducible pinned Champions inherited-pool
artifact, not historical move presence. Imported formats survive storage;
missing/conflicting replay context stays unchecked. Stale catalog records remain
available for repair without entering runnable selections. All 235 reviewed
identity pools agree locally; separate complete-team and official approval gates
remain. [Evidence, tests and DB limits](../poke-sim/reports/champions_move_context_validation_2026-09-08.md).
Lesson: a source is trustworthy only within its named context, and stricter
validation must not destroy the original data it rejects.

### IMP-0033: Compare Inherited Runtime Move Pools

Added a separate inherited-pool/runtime acceptance audit without relabeling the
old direct-row diagnostic. Seven narrowed full-set disagreements are reproduced;
235-key census differences remain candidates, not an accuracy denominator.
Five harness tests validate the detector, not the current app's correctness.
Independent review expanded its move universe and installed-reference fingerprint
so hidden acceptance and changed dependencies cannot masquerade as agreement.
See [reproductions and shared-path fix plan](../poke-sim/reports/champions_move_pool_alignment_2026-09-08.md).
Lesson: historical learn-method presence is not a current-format move pool;
form traversal must use the pinned reference rather than ad hoc inheritance.

### IMP-0032: Separate Team Checks From Competitive Approval

The Teams page combined unverified/historical regulation badges with a green
LEGAL shortcut. It now labels local validation without claiming tournament
approval. Mobile roster rows wrap full-width Details controls instead of crushing
Pokemon text. Actual browser checks cover 16 cards across five viewport/input
cases, with no hidden games. See [scope and evidence](../poke-sim/reports/team_review_clarity_2026-09-08.md).
Lesson: independent badges must not contradict each other, and source-string CSS
tests cannot substitute for checking rendered geometry.

### IMP-0031: Check Every Consumer, Not Only Mirrored Rows

Correct database/baseline rows did not guarantee correct roster displays. The UI
used stale species and nature tables, while an accepted Floette alias missed the
engine resolver. Runtime-backed types and starting Speed now replace those paths;
unknown formats remain unknown, and the species-only radar withdraws unsupported
safety ratings. See [tests, review and limits](../poke-sim/reports/roster_runtime_validation_2026-09-08.md).
Lesson: prove identity and field parity through each consumer, including imports
and presentation. A valid source row alone does not prove a valid user experience.

### IMP-0030: Resolve Official Form Identity Without Promoting Legality

Official rendered IDs and sprite positions distinguish Fancy Vivillon and
Eternal Flower Floette where text labels alone were ambiguous. Explicit aliases
now complete 235 review-only mappings. Source asset hashes, screenshot hashes,
named official references and independent visual-review limits are retained.
The generated artifact binds the added evidence fingerprint and rejects missing
form records or identity/source drift. All 235 baseline stats/types/ability slots
and Dex numbers match pinned Champions; this does not test every runtime consumer.
Lesson: reconcile identity with evidence, then validate fields and combinations
separately. No human approval or competitive publication. See
[M-B sign-off audit](release/REG_MB_SIGNOFF_AUDIT.md).

### IMP-0029: Templates Report Facts Without Inventing Confidence

Separate generic coach templates invented causes, best plans, default scores and
confidence from volume. They now retain current matchup/recorded row facts and
explicit uncertainty. Missing turns no longer reuse the last turn; a real zero
heuristic score stays zero. Removed dead aggregate-inference helpers and an
unverified performance tagline. Four negative reproductions fail before/pass
after; the voice suite passes with two incorrect old expectations corrected.
See [scope and remaining gates](../poke-sim/reports/coach_template_validation_2026-09-08.md).
Lesson: uncertainty must hold in every presentation path, not just one summary.

### IMP-0028: Withdraw Unsupported Decision Diagnoses

Independent replay review reproduced a zero-PP Recover recommendation and an
execution diagnosis from a heuristic score gap, even on a different turn from
the recorded turning point. Historical move inventories are not action legality.
The decision audit now preserves its empty API shape without authoritative flags;
the summary keeps factual replay review and states the evidence limit. Nine
negative regressions fail before/pass after, and three wrong old expectations
were corrected. Lesson: positive PP is necessary, not sufficient, and a utility
score is not a counterfactual outcome. See the
[evidence and re-enabling gate](../poke-sim/reports/decision_evidence_validation_2026-09-08.md).
This withdraws unsupported advice; it does not prove the rest of coaching.

### IMP-0027: Intentional Runs And Readable Replay Evidence

Removed a startup simulation that silently added games before the requested run.
Paired browser testing exposed it, then screenshots exposed light-theme contrast
and mobile reserve overflow. Corrected all three without altering mechanics or
discarding user history. Independent review strengthened the harness: exported
matchup identity must match the selected teams, and actual re-downloads must
retain all historical fields, excluding only two documented creation timestamps.
Lesson: replay/export agreement alone can agree on the wrong requested matchup;
DOM parity also does not prove readable pixels. Scope and unsuccessful captures
remain documented in the [replay audit](../poke-sim/reports/intentional_replay_validation_2026-09-08.md).
Unsupported causal coaching was independently reproduced and remains next.
No live database changes, deployment, regulation approval or 99% accuracy claim.

### IMP-0026: Perish Song Countdown, Recipients And Terminal Result

Ten initial probes reproduced an early third-turn KO and missing recipient
defenses. Candidate v153 / engine 1.1.9 preserves four-turn timing, existing
countdowns, Soundproof/Mold Breaker/Ability Shield and concealed recipients with
No Guard exceptions. Two-wave games exposed a false terminal draw; the candidate
uses pinned residual action-speed order and last-faint resolution. Review then
caught an initially omitted Trick Room transformation; new fixtures reproduced
and corrected it. Charge-start actions are now present in logs.
Independent final review passes 22 probes and has no remaining scoped findings.
Lesson: duration, recipient selection, action evidence and winner resolution are
separate contracts. A valid alternative replacement choice is not an engine bug,
but prevents full trace parity unless both harnesses use the same choices.
Full local gate passed 165 fast and 12 offline/mock DB files with four skips;
standing audit passed its selected suites, three unchanged goldens and 4,500
matrix games with zero JS errors. Local version/roadmap smoke passes with no page
errors. Hosted CI and paired interactive replay proof remain separate; no
deployment or regulation promotion.
See [Perish Song audit](../poke-sim/reports/perish_song_validation_2026-09-08.md).

### IMP-0025: PP Drain And Substitute Defense Boundaries

The old local Spite test asserted the wrong Substitute result. New paired
reference probes exposed that mistake, sound bypass and immunity gaps, then
reflection and secondary-effect protections during independent review.
Candidate engine 1.1.8 uses mirrored bypass flags, protects Eerie Spell's
secondary from Sheer Force/Shield Dust/Covert Cloak, and checks relevant Spite
defenses. Additive Substitute HP evidence supports direct preservation checks.
The knockout fixture also needed correction: Choice Specs had locked Splash.
Lesson: challenge fixtures against the reference, and assert the intended action
actually occurred; a passing local expected value is not an oracle.
Eighty focused reference probes pass. Independent final review rechecked all
reported fixes and found no remaining findings in that scope. Final artifact gate
passed 164 fast and 12 offline/mock DB files, with four manual/helper skips.
Three golden traces remained unchanged and
4,500 matrix games had zero JS errors. Local browser version/roadmap smoke passes
with zero page errors; no new interactive simulation or deployed proof claimed.
See [boundary audit](../poke-sim/reports/pp_substitute_validation_2026-09-08.md).

### IMP-0024: Explicit Official Roster Identity Candidates

Added a deterministic review-only mapper and hash-bound identity artifact for
the official M-B capture. 233 candidates resolve; two nondefault forms fail closed.
Tests cover altered labels, unknown IDs, dex mismatch, exclusions, duplicates,
input immutability and generated-artifact freshness. Sixteen Mega records also
match pinned Showdown Champions fields and each stone's actual owner map.
The initial test assumed an old Showdown string field; inspection showed the
pinned API uses an owner-to-form object, so the harness was corrected without
changing engine data. These are identity/field checks, not live game approval.
Independent review exposed default-form substitution within one Dex number and
CRLF false drift. Both were reproduced or exercised in executable regressions
and corrected before push. Named default states remain supported.
See [overnight handoff](release/OVERNIGHT_HANDOFF_2026-09-08.md).

### IMP-0023: Official M-B Roster And Extension Audit

Observed: the M-B end date was stale and the visual ledger's 235 rows hid duplicate
and mismatched species. Captured 235 unique official roster IDs with source hash
`8b0c6db8dcd403bb1f5453c1c6f9ac35c80192762219a308c80023375a93d617`.
Corrected the September 9 Ranked deadline, reproduced the old date failure, and
passed 15 selection, six M-C transition, 20 legacy audit tests plus official
presence/absence and form-ID checks. Marked the old visual ledger superseded for
eligibility; kept it as historical evidence. Roadmap source and generated site view
now prioritize exact mapping and full validation. See
[M-B sign-off audit](release/REG_MB_SIGNOFF_AUDIT.md).
Lesson: equal row counts and green review-only tests do not establish roster truth.
v151 candidate only; no competitive approval, database change, or deployment.

### IMP-0021: Retro Homepage Battle Opening

Replaced the abstract Team Test/Benchmark preview with a decorative Gengar versus
Nidorino pixel-sprite opening, authored CSS lunge/dodge motion, a keyboard-accessible
pause checkbox, and reduced-motion support. Removed the preview's unused base styles.
This is not engine output and does not affect teams, mechanics, or coaching evidence.
Overview checks and all 160 fast-gate files pass (four manual/helper skips);
real Chromium checks at 1440px and 390px prove sprite loading,
scene bounds, movement, pause and reduced-motion behavior. Screenshots were inspected
and Nidorino spacing corrected. Reproduce with `tools/verify-retro-intro.cjs` and
Playwright available through NODE_PATH, against localhost:8770. Sprite provenance and
artwork-rights caveat are in `poke-sim/assets/retro-intro/README.md`.
Promoted to v150 candidate identity with sprite precache entries and PNG checks.
Desktop/mobile browser checks pass again. Offline browser behavior and commercial
artwork permission remain unverified. No mechanics or deployment claim added.

### IMP-0022: Migration Filename Boundary And Staging Discovery

Moved manual migration input from shell-source interpolation into an environment
variable, with a restricted SQL filename alphabet; existing traversal and file-existence
guards remain. Bash execution of the actual workflow validation block accepts the
existing migration and rejects 11 invalid/injection examples without execution.
The regression runs inside the workflow governance suite on CI.
Dispatch still requires repository permissions and production environment handling;
this is defense in depth, not a claim of an unauthenticated exploit.
An independent agent could not start due to the session agent limit; the parent
performed a second source-to-sink review and executable compatibility checks.

Both repositories' GitHub inventories and the connected Supabase project were read
without mutation. See [staging discovery](release/SUPABASE_STAGING_DISCOVERY.md).
Live migration ledger still contains four entries; the advisor's informational
missing-policy notice does not certify application security. Policy/grant readback
confirms the existing shared-write containment gate remains unresolved. Do not
publish a production security clearance or run write tests without isolated staging.

v150 local verification: `npm test` passes 160 fast files and 12 offline/mock DB
files, with four manual/helper skips. Browser checks pass at 1440px and 390px.
No live write checks ran. Repository push is distinct from a Pages deployment.

### IMP-0020: Company Audit Trust-Boundary Fixes

Changed: Leftovers precedes status damage; Toxic rounds before tick multiplication; replay plans cannot impersonate verified matches; timing-only coaching stays outside scoring and critical-mistake selection; news discovery uses compatible CLI options. Separate shared-write containment is locally tested but not applied live. Evidence: [OODA remediation](release/OODA_COMPANY_FINDINGS_2026-09-08.md), eight bounded reference probes, six new regression groups, independent review, isolated PostgreSQL denial/positive controls and two manual replay reviews. Lesson: follow incorrect evidence into every downstream consumer and test later turns, not just the reported example. v149 candidate only; live security, verified matching, broader mechanics/coaching and hosted release remain open.

### IMP-0019: Independent Company Audit

Observed: five focused suites pass while fresh reference, replay-identity and causal-coaching counterexamples fail. Changed: recorded [independent audit and ordered OODA backlog](release/INDEPENDENT_COMPANY_AUDIT_2026-09-08.md), distinguished public v142 from candidate v148, and rechecked release/source/security gates. Verification: parent reproduced three reviewer findings; read-only live metadata and public navigation were inspected. Lesson: test contracts and player decisions, not just battle volume. Documentation only; no finding is closed, no security migration applied and no release deployed. Detailed live authorization evidence remains private.

### IMP-0014: OODA Strategy Identity And Advice

Observed: nature edits and separately registered identical teams reused the wrong Strategy report, while two heuristics invented mistakes. Root cause: incomplete cache identity and advice without action evidence. Changed: canonical full-input Strategy/Mega keys and disabled unsupported Fake Out/redirection predicates. Three regression groups failed before and pass after; all 69 focused Strategy checks pass. See [OODA evidence](release/OODA_STRATEGY_FIX_2026-09-08.md). Lesson: reproduce player-visible correctness separately from existing green suites. Local v146 candidate only; confidence, mechanics, persisted UI and live verification remain open.

| Record | Improvement | Recorded proof state |
|---|---|---|
| [IMP-0001](#imp-0001) | Homepage destinations and neutral replay preview | Deployed v138; bounded live verification |
| [IMP-0002](#imp-0002) | Explicit reference intake and error classification | Local candidate; not published |
| [IMP-0003](#imp-0003) | Honest security-readiness reporting | Local candidate; live security clearance blocked |
| [IMP-0004](#imp-0004) | Persistent improvement documentation | Local policy/docs candidate |
| [IMP-0005](#imp-0005) | Replay evidence boundary and player-trust audit | Local candidate; not deployed |
| [IMP-0006](#imp-0006) | Seismic Toss fixed-damage baseline | Local candidate; scoped parity, not Champions certification |
| [IMP-0007](#imp-0007) | Live turn order and per-target stage moves | Local candidate; scoped parity, not Champions certification |
| [IMP-0008](#imp-0008) | Persistent PP, Pressure and resolved replay identity | Local candidate; 100% clean scoped invariant gate |
| [IMP-0009](#imp-0009) | Authorized Supabase security readback | Live read-only audit; public launch blocked |
| [IMP-0010](#imp-0010) | Fresh-user simulator starts in safe Practice lane | Local candidate; browser and export verified |
| [IMP-0011](#imp-0011) | Expired regulation and rejected DB catalog are explicit | Local candidate; live DB read-only diagnosis |
| [IMP-0012](#imp-0012) | Eerie Spell and Spite preserve exact PP state | Local candidate; scoped Showdown parity |

Historical entries below summarize already-recorded evidence, not new runs. This index is intentionally not an exhaustive reconstruction of older work.

<a id="imp-0001"></a>
## IMP-0001: Homepage Navigation And Preview

- Recorded: 2026-08-30. Lane: experience/release.
- Before: homepage navigation did not consistently focus the destination; Edit a Team did not go directly to the editor; static preview copy implied a replay result without an uploaded replay.
- Change: focus the destination panel, route editing directly, show a neutral no-replay state.
- Evidence: [publication record](release/SITE_NAVIGATION_PUBLISH_2026-08-30.md). Hosted checks, deployed HTML fingerprint and three live button destinations/focus were verified. [PR 193](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/193), merge `4f2cb179265d647706f4a1749c47d85e3e707043`, public build `v2.2.138-site-navigation-fixes`.
- Lesson: navigation should move focus along with the view; placeholder UI must not manufacture evidence.
- Remaining: full beginner/accessibility/responsive testing, cramped preview content and separate news/database issues. This release did not change battle mechanics or publish the broader audit branch.

<a id="imp-0002"></a>
## IMP-0002: Reference Intake And Learnset Diagnostics

- Recorded: 2026-08-30. Lane: source/evidence tooling. State: uncommitted local candidate.
- Before: unsupported input could be confused with a completed reference rejection; source/setup errors could be flattened into other outcomes. Team metadata and missing fields obscured meaningful comparison.
- Change: strict default intake plus explicit, recorded normalization; retain original/canonical hashes and transformations; distinguish unsupported, rejected and reference-error outcomes. Direct learnset differences are reported, not automatically promoted.
- Evidence: [intake report](../poke-sim/reports/reference_intake_policy_2026-08-30.md); `reference_intake_policy_tests.mjs` and `showdown_reference_tests.mjs` cover policy boundaries and error propagation.
- Lesson: fix the comparison's input contract before interpreting discrepancies as battle-engine defects. Reference acceptance does not prove official Champions legality.
- Remaining: source/form/IV alignment, three mechanics disagreements, complete-game and visible-log parity. No database data was changed and no 99% accuracy claim is established.

<a id="imp-0003"></a>
## IMP-0003: Security Verification Must Not Invent Passes

- Recorded: 2026-08-30. Lane: database verification. State: uncommitted local candidate; no production security change.
- Before/root cause: three checks labeled live used a local file or mock result, and skipped checks could be counted as passes.
- Change: unperformed administrative checks remain explicitly not verified; a request for their unimplemented live verification fails closed. Added read-only metadata inventory and a guarded staging SQL fixture, both clearly separated from runtime proof.
- Evidence: `poke-sim/tests/security_readiness_reporting_tests.mjs` passed four focused checks, including permissive-policy/grant mutations. The full local gate before the final guard refinement passed 149 fast and 12 offline/mock DB files. M9 reports eight local passes and three unverified administrative checks. SQL fixtures have not been executed. Independent tooling review corrections were retained and retested.
- Lesson: test the test harness itself. A green offline suite cannot substitute for real identity, permissions or deployment evidence; even ordinary omitted/default syntax needs negative regression coverage.
- Remaining: administrative readback, approved migration reconciliation, two real staging users, visitor denial tests, backup/restore and abuse-limit proof. Detailed security evidence is restricted under scan ID `459dc437-1bfb-4cf3-8fa3-367f20386396`; do not copy unresolved exploit details to public records.
- Next: obtain authorized read-only project access and an isolated staging environment. Do not apply earlier hardening proposals blindly or relax protection just to make saves work.

<a id="imp-0004"></a>
## IMP-0004: Record The Learning With The Fix

- Recorded: 2026-08-30. Lane: documentation/process. State: uncommitted local candidate.
- Before: dated reports existed, but there was no single compact improvement history or required before/after/lesson reference in each PR.
- Change: `AGENTS.md` now requires stable improvement records and explicit proof boundaries; contributor guidance and the PR template reference the same log. Removed the PR checklist's conflicting requirement to use historical `MASTER_PROMPT.md` as current status.
- Evidence: `node tests/agent_configuration_tests.mjs` passed, including log references, unique IDs and retained unverified-security scope. `git diff --check` passed for the touched files. No application/runtime behavior changed; the full application suite was not rerun for this documentation-only policy change.
- Lesson: preserve evidence in one place, link it from reviews, and make failed attempts and remaining gaps visible. Updating rules/tests through review is learning; silently rewriting production is not.
- Remaining: publish these policy/docs changes through review, then append evidence-backed entries as future fixes ship. The website and other repository are not automatically synchronized by this local change.

<a id="imp-0005"></a>
## IMP-0005: Require Evidence Before Replay Coaching

- Recorded: 2026-08-30. Lane: replay/evidence/experience. Local v139 candidate only.
- Before: plain prose generated a B/82 review on public v138. An edited or replaced log could retain old review state; a reference change could restore invalid save eligibility.
- Change: require observed positive turns and structurally populated events; invalidate review actions when evidence changes; require analysis before UI saves and retain unchanged uploaded HTML provenance.
- Evidence: [player-trust audit](release/PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md), new `replay_evidence_gate_tests.js`, existing parser/UI contracts and full local project gate. The audit records separate baseline, final-candidate and browser evidence instead of treating them as one proof.
- Lesson: test invalid evidence and transitions between valid/invalid inputs, not only successful fixtures. Preserve original-source identity separately from normalized display text. Independent review must challenge the test harness and the patch.
- Remaining: partial-log confidence, full protocol validity, async recovery, authenticated persistence and deployed verification. Three mechanics disagreements, live security proof and measured beginner usability remain open. No engine or DB schema change; no public accuracy certification.

<a id="imp-0006"></a>
## IMP-0006: Fixed Damage Is Not Zero Power

- Recorded: 2026-08-30. Lane: mechanics/evidence/release. Local engine `1.1.3`, build `v2.2.140-seismic-toss-proof`; not published.
- Before: Seismic Toss left a target at 197 HP instead of the pinned reference's 147. The zero-base-power guard conflated fixed damage with a status move.
- Change: retain immunity but bypass normal damage/crit calculation for Seismic Toss. Independent review exposed an additional Unseen Fist/Protect caller multiplier; side-swapped regressions reproduced 12 instead of 50 and now pass after the bounded correction.
- Evidence: [scoped validation](../poke-sim/reports/seismic_toss_validation_2026-08-30.md), 20 focused test groups including ten pinned doubles probes, local modifier/HP-application tests, independent read-only review and broad gate results recorded in that report.
- Lesson: validate both the damage calculator and its callers; a correct intermediate number can still be altered incorrectly. Isolate mechanics without hiding mixed-fixture failures, and exercise each side rather than one favorite team.
- Remaining: same-turn Tailwind and Growl/Leer, other fixed-damage callbacks, wider ability/item interactions, full-game/browser parity and official Champions proof. Coverage is partial, not universal. DB security and public activation remain separately gated.

<a id="imp-0007"></a>
## IMP-0007: Reorder What Has Not Moved Yet

- Recorded: 2026-09-01. Lane: mechanics/evidence/release. Local engine `1.1.4`, build `v2.2.141-tailwind-stage-proof`; not published.
- Before: the engine sorted the entire action queue before the turn, so same-turn Tailwind could not reorder waiting moves. Growl and Leer had mirrored metadata but no executable multi-target stage path. Clear Amulet did not block the shared opponent stat-drop helper.
- Change: re-sort only pending runtime actions against live priority, effective Speed and Trick Room; route Growl/Leer through a per-target Showdown-ordered resolver; expand shared stage handling for protection, reflection, inversion and allied spread-drop boundaries.
- Evidence: [scoped validation](../poke-sim/reports/tailwind_growl_leer_validation_2026-09-01.md), 25 focused checks, 5/5 declared runner probes, 153-file fast gate, 12-file offline/mock DB gate, two independent adversarial review passes and a 4,500-battle stress audit. Exact reviewer findings live in the report.
- Lesson: a turn queue is live state, not a frozen list. Spread status moves need per-target failure gates just like spread damage. Mirrored metadata is source data, not executable behavior by itself.
- Remaining: wider mid-turn Speed/priority and stat-stage inventories; complete-game/visible-log parity; official Champions proof; authorized live Supabase security checks. Coverage remains partial and cannot establish 99% or universal accuracy.

<a id="imp-0008"></a>
## IMP-0008: PP Belongs To The Pokemon, Not The Active Slot

- Recorded: 2026-09-02. Lane: mechanics/evidence/release. Local engine `1.1.5`, build `v2.2.142-pp-replay-proof`; not published.
- Before/root cause: move PP did not persist on a Pokemon, Pressure was an explicit no-op and an exhausted move could not drive the normal Struggle path. Replay rendering also discarded some non-damaging action order.
- Change: store PP by stable Pokemon identity; consume one PP normally and additional PP for each applicable opposing Pressure; derive Champion-effective max PP from the pinned Showdown mirror plus generated overrides; route exhaustion to Struggle. Preserve ordered status/action events in visible replay output.
- Evidence: `tests/pp_pressure_tests.mjs`, `tests/showdown_complete_game_tests.mjs`, `tests/phase5_turn_log_tests.js`, `tests/turn_log_export_validator_tests.js`, `tests/accuracy_harness_tests.mjs`, and `reports/pp_pressure_replay_validation_2026-09-02.md`. PP passes 11/11, complete-game comparison passes 4/4, the 155-file fast gate passes, and the final three-turn browser/export pair has zero observable mismatches. The 4,624-battle invariant gate has zero errors, warnings and repeatability failures.
- Lesson: resource state follows the registered Pokemon through switching, `BeforeMove` denial must happen before PP deduction, and replay proof needs stable action identity plus exact execution position. Generated overrides make differences inspectable instead of hiding them in hand-maintained code. Regulation/version/promotion drift must fail the harness until its exact evidence lane is reviewed.
- Remaining: Disable, Encore, Spite, Grudge and wider resource-changing interactions; more complete games, imported teams and official Champion-specific confirmation. The cross-format harness is 100% clean in its declared scope, not universal game accuracy.

<a id="imp-0009"></a>
## IMP-0009: Live Security Readback Replaces Assumptions

- Recorded: 2026-09-02. Lane: database/security. State: live read-only audit complete; no production mutation.
- Before/root cause: local tests correctly refused to label administrative checks as passed, but production policy state and migration alignment were unknown.
- Change: inspect the named Supabase project's live RLS flags, policies, role grants, functions, migration ledger and anonymous read surface. Reconcile those results with the existing local hardening migration and public-launch checklist.
- Evidence: `docs/release/SUPABASE_PUBLIC_LAUNCH_GATE_2026-08-30.md` records the sanitized readback. All 16 public tables have RLS, but production still allows anonymous shared-evidence inserts and unrestricted branch-coverage updates. The live ledger has only four entries, and no owner identity exists in the public schema.
- Lesson: RLS being enabled is not the same as least privilege, and two-user isolation cannot be tested until ownership exists in the data model. Keep production unchanged until the exact migration and staging denial evidence are reviewed together.
- Remaining: apply the hardening migration in protected staging, run anonymous HTTP mutation denials, add owner-scoped private persistence, test two real staging users, verify backups/restore and add abuse controls.

<a id="imp-0010"></a>
## IMP-0010: A Safe Gate Must Still Let A New User Practice

- Recorded: 2026-09-02. Lane: regulation/experience/release. Build `v2.2.142-pp-replay-proof`; local candidate, not published.
- Before/root cause: a fresh browser selected historical Reg M-A by default. The legality gate correctly blocked bundled teams because regulation-specific species, forms and learnsets are not approved, but a new user could not run the first simulation without understanding that Practice must be selected.
- Change: default fresh sessions to `champions_custom_practice`. Keep saved user choices, historical/review options and all competitive evidence blocks unchanged.
- Evidence: a fresh-origin browser opened Start Team Test on `Practice (unverified)`, ran one doubles Bo3 without a preflight block, rendered three retained replay samples and exported JSON. The visible sample (`loss`, seven turns) matched the exported game, which retained build `v2.2.142-pp-replay-proof`, practice ruleset/version, team digests, four stable participants per side and registered items. Regulation selection/execution, release-manifest and bundle load-order tests pass.
- Lesson: fail-closed competitive rules and a runnable practice experience are separate requirements. The safe default must never imply that practice results are regulation-approved or trusted learning evidence.
- Remaining: repeat the journey on the hosted candidate and mobile; validate detailed downloaded turn logs against visible events for more teams. This manual path proves usability of one bounded journey, not 99% universal mechanics accuracy.

<a id="imp-0011"></a>
## IMP-0011: Reachable Data Is Not Approved Data

- Recorded: 2026-09-03. Lane: regulation/database/experience. Local v143 candidate; no production mutation.
- Before/root cause: after M-B ended, the UI had no explicit current-coverage warning. A successful Supabase request still displayed `[DB connected]` when all 36 returned teams were rejected, hiding catalog and migration drift behind network health.
- Change: use the recorded M-B UTC end to report `successor_required` without inventing a regulation; classify DB roster rejection reasons and show `[DB review needed]` when zero returned teams pass the catalog gate.
- Evidence: [regulation and DB diagnosis](release/REGULATION_AND_DB_DIAGNOSIS_2026-09-03.md), deterministic regulation boundary tests, DB status tests, read-only row/migration queries and live Supabase advisors.
- Lesson: connection health, catalog acceptance, regulation approval and competitive trust are different states. Unknown current rules must fail closed while Practice remains clearly unverified.
- Remaining: human capture of the post-M-B regulation, digest-bound review, protected DB migration/reseed, anonymous-denial and two-user staging tests. No 99% accuracy or public-launch claim is established.

<a id="imp-0012"></a>
## IMP-0012: PP-Draining Moves Use One Auditable Rule

- Recorded: 2026-09-03. Lane: mechanics/evidence/release. Local engine `1.1.6`, build `v2.2.144-pp-drain-proof`; not published.
- Before/root cause: ordinary PP spending and Pressure were persistent, but Eerie Spell and Spite had no executable drain behavior and the Pressure registry comment still described the old no-op state.
- Change: add one zero-clamped PP-drain helper with structured before/after evidence; wire Eerie Spell after a successful direct hit and Spite to the target's last used move; preserve Protect, Substitute and missing-history failures.
- Evidence: [PP-drain validation](../poke-sim/reports/pp_drain_validation_2026-09-03.md), `tests/pp_drain_move_tests.mjs`, and the pinned-reference PP probe in `tests/showdown_reference_tests.mjs`.
- Lesson: resource-changing moves need exact state evidence and an independent post-turn comparison, not only a matching log sentence. Their state remains attached to stable Pokemon identity.
- Remaining: Grudge, Disable, Leppa Berry restoration, switching/called-move interactions, complete-game/browser parity and Champion-specific source approval. Scoped agreement is not a 99% or universal accuracy result.

<a id="imp-0013"></a>
## IMP-0013: Announced Is Not Approved

- Recorded: 2026-09-07 EDT. Lane: regulation/source/experience. Build `v2.2.145-reg-mc-source-review`; candidate only.
- Before/root cause: M-B had ended and the app correctly required an unknown successor, but the newly published M-C notice was not represented. Adding only the name would have hidden the incomplete roster, absent Showdown M-C format and missing sprites.
- Change: add M-C as a versioned source-review lane with exact UTC boundaries, official confirmed facts, explicit unknown roster fields, partial Showdown observations and sprite status. The app recognizes scheduled/active M-C but blocks competitive legality, trusted learning and coaching.
- Evidence: [M-C readiness review](../poke-sim/reports/reg_m_c_readiness_2026-09-07.md), `source/reg-m-c-source-review.json`, six focused M-C tests, regulation-boundary tests, sprite-fallback tests and the refreshed official-source inventory.
- Lesson: a regulation announcement is enough to create a quarantined candidate, not enough to create an allowlist. Upstream Future rows and base-form sprite fallbacks must remain visibly provisional.
- Remaining: complete in-game Singles/Doubles roster and rule captures, accepted/rejected teams, exact sprites, Z Mega mechanics fixtures, reviewed Showdown pin, immutable package approval and database publication. No M-C legality or 99% universal accuracy claim is established.

<a id="imp-0015"></a>
## IMP-0015: Replay Claims Follow Events, Not Turn-Wide Coincidence

- Recorded: September 8 UTC / September 7 EDT. Local candidate `v2.2.147-replay-attribution`; no deployed proof.
- Before: forced replacements became switch criticism, weather upkeep became fresh control, damage borrowed another hit's effectiveness, and candidate catalog matches became trusted IDs.
- Root cause: turn/species grouping and implicit/global export identity instead of event/slot and explicit context.
- Change: event-scoped parser distinctions, cautious field attribution, separated activations, unverified candidate IDs and unknown source versions distinct from exporter build.
- Evidence: [OODA report](release/OODA_REPLAY_ATTRIBUTION_2026-09-08.md), eight regression groups, 158 fast files passing, and manual local replay review.
- Lesson: shared species, shared turn and shared catalog membership are not proof of the same event or registered team. Unknown must survive serialization.
- Remaining: replay URL fetch, physical export readback, unsupported endgame/IQ judgments, extended protocol coverage, full competitive mechanics/security gates and independent review. No 99% claim.

<a id="imp-0016"></a>
## IMP-0016: Do Not Grade Decisions From Outcomes Or Missing Errors

- Local candidate: `v2.2.148-evidence-not-outcome`, September 8 UTC.
- Problem: terminal losses automatically generated Endgame Misplay; missing detected errors generated positive IQ evidence.
- Change: remove both unsupported inference paths without removing observed results or faints.
- Evidence: [OODA outcome report](release/OODA_OUTCOME_CLAIMS_2026-09-08.md), two failing-then-passing regression groups covering both formats/sides and sparse evidence.
- Lesson: an outcome does not prove an avoidable error, and absent findings do not prove skill. Keep historical records separate from revised analysis.
- Remaining: broader score/confidence calibration, downstream inference audit and public-launch gates. No manual browser or deployed proof for this candidate yet.

<a id="imp-0017"></a>
## IMP-0017: Seasonal Maintenance Is A Reviewed Evidence Loop

- September 8 UTC: added `$pokemon-season-update`, its impact checklist and read-only `season_reviewer`; routed existing engineering guidance to them.
- Reuses existing watcher/staging/sync/audit workflows rather than duplicating scheduling or granting production authority to an agent.
- [Validation and live findings](release/SEASONAL_AGENT_READINESS_2026-09-08.md): skill/TOML validation, byte-identical local installation, independent adversarial scenario test and four existing regulation test files passing.
- Lesson: workflow enabled, source healthy, candidate reviewed and rules approved are separate states. Unknown registered sets remain unknown.
- Remaining: three failed scheduled watcher runs require per-source/parser diagnosis and hosted recovery proof. New agent selection by name, actual seasonal promotion and production readiness are not established.

<a id="imp-0018"></a>
## IMP-0018: Standing Adversarial Review Mandate

- September 8 UTC: recorded the user's standing request to challenge designs and stress-test material changes in AGENTS.md.
- Requires risk-scaled failure-path tests, reproducible evidence, scrutiny of the test harness itself, and clear alternatives when assumptions fail.
- Documentation-only change: checked patch consistency; no new battle, live-service, accuracy or deployment proof claimed.
- Lesson: useful disagreement and independently grounded acceptance criteria matter more than larger passing test counts. Existing production approval boundaries remain intact.

## Entry Template

```text
ID / date / change lane:
Problem before and observed impact:
Root cause (confirmed or hypothesis):
Bounded change:
Regression/evidence links and related cases:
Proof state / environment / revision or build:
Reusable lesson:
Remaining gaps and next action:
Dated verification / rollback / recurrence notes:
```

For documentation-only work, use a document consistency check instead of claiming a runtime regression. For sensitive security work, keep the public entry general and point to an access-controlled record by ID.
