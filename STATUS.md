# Project Status

> Current evidence only. Direction and acceptance gates live in [ROADMAP.md](ROADMAP.md); dated reports preserve historical proof.

Review how changes improved the project in [the improvement log](docs/IMPROVEMENT_LOG.md). Its recorded history does not replace current gates or imply that local changes are deployed.

## Local Candidate

- M-C draft-team reference smoke tests: three complete doubles teams validate;
  base/Mega stats checked; six distinct games reproduce battle events across
  delayed repeats (12 executions; raw timestamp records retained separately).
  Live v142 has no M-C option, so these are not live-app results or competitive
  approval. [Exact scope and next integration gate](docs/release/MC_DRAFT_TEAMS_2026-09-09.md).

- v163 captures the newly published 262-row official M-C roster and an isolated
  pinned Showdown M-C/M-B reference. 260 identity candidates map; two form IDs
  remain unresolved. 42 individual-set reference probes pass, not full-team or
  in-game proof. Stale warning text is corrected without approving M-C.
  [M-C intake, migration risks and remaining gates](docs/release/REG_MC_INTAKE_2026-09-09.md).

- Cross-repo candidate handoff: Alfredo draft PR #276 now carries the same v162
  candidate as Yfactor PR #195. Read-only merge simulation found no conflicts and
  no content delta from the tested candidate. Main branches and live deployment
  remain unchanged. See [exact comparison and release gates](docs/release/CROSS_REPO_ALIGNMENT_2026-09-09.md).

- v162 is a roadmap/release-label update only; engine 1.1.10 and battle logic
  are unchanged from v161. Markdown and the browser roadmap now use the same
  ordered queue. This candidate is not a new mechanics-accuracy claim or deployment.

- September 9 release review: v161 remains candidate-only; live artifact readback
  identifies v142. Required move-pool and intro-sprite bytes now have generated
  digests and pre-upload verification. See [release review](docs/release/RELEASE_REVIEW_2026-09-09.md).
  Open mechanics reviews and live security gates still prevent merging the full
  candidate. Read-only database access works; isolated staging remains absent.

- v161 preserves registered member IDs through unambiguous paste edits and
  reordering; species replacements get fresh IDs. Conflicts block saving, and
  SV preview uses the saved format. Actual upload/edit/reload plus paired battle
  exports pass. [Identity evidence and limits](poke-sim/reports/member_edit_identity_2026-09-08.md).
  Local full gate and hosted CI `34294165076` pass for code commit `e3705db`.
  Final independent review was
  unavailable after agent usage limits, so parent verification is identified.

- v160 fixes the shared Champions move-pool path exposed by the preceding audit.
  All 235 reviewed identities and eight narrowed set probes agree with pinned
  Champions. Imports/replays use explicit context; stale teams remain editable
  under Needs review but cannot enter runnable selections. Full local gate,
  independent review and browser failure-path checks pass; hosted CI `34198148786`
  passed for `31b7d92`. Complete-set,
  official approval and DB publication remain open. See
  [scope and evidence](poke-sim/reports/champions_move_context_validation_2026-09-08.md).

- The paste-editor identity/preview findings are addressed in v161 above.
  Broader copy/restore identity, SV IV roundtrip fidelity and complete-set legality
  remain open; the bounded custom-team test does not close those contracts.

- v159 separates team validation from regulation approval and fixes compressed
  mobile roster text. Five browser viewport/input checks cover the actual Teams
  page. [Team review evidence](poke-sim/reports/team_review_clarity_2026-09-08.md)
  retains remaining contrast and broader legality-path gaps.

- v158 aligns roster types and unboosted Speed with generated/runtime data and
  fixes Eternal Flower Floette alias fallback. Unknown formats stay unknown;
  species-only radar entries no longer claim matchup safety. Verification and
  exclusions: [runtime consumer audit](poke-sim/reports/roster_runtime_validation_2026-09-08.md).

- M-B identity review now resolves all 235 official rows. Two explicit aliases
  are backed by official sprite/DOM evidence and independent visual review.
  All mapped baseline stats/types/ability slots/Dex numbers match pinned
  Showdown Champions. No runtime legality or in-game approval is inferred.
  [Sign-off audit](docs/release/REG_MB_SIGNOFF_AUDIT.md) retains the remaining gates.

- v156 generic coach templates stop inventing causes, best plans, absent scores
  and confidence from volume. They retain recorded facts and explicit unknowns.
  [Template audit](poke-sim/reports/coach_template_validation_2026-09-08.md)
  records the bounded withdrawal; broader strategy correctness remains open.

- v155 withdraws unsupported decision-audit alternatives and execution diagnoses.
  Current snapshots cannot establish full historical action availability; the
  UI retains actual replay evidence and states this limit. See
  [regressions and re-enabling gate](poke-sim/reports/decision_evidence_validation_2026-09-08.md).
  Broader coaching correctness remains open.

- v154 removes hidden startup games and corrects replay contrast/mobile reserve
  overflow. Browser audits download each intentional game, bind requested team
  identity and recheck retained history after swapping. See the
  [scoped audit](poke-sim/reports/intentional_replay_validation_2026-09-08.md).
  Independent review reproduced unsupported causal coaching and zero-PP
  alternatives; the v155 entry records their bounded withdrawal, not full coach approval.

- v153 Perish Song follow-up: 22 independent-review-confirmed probes cover
  countdown, recipient defenses, concealment/No Guard and terminal faint order
  with/without Trick Room. Full gate passed 165 fast and 12 offline/mock DB files,
  with four manual/helper skips; battle audit and local version smoke passed. See
  [evidence and exclusions](poke-sim/reports/perish_song_validation_2026-09-08.md).

- v152 PP/Substitute candidate, engine 1.1.8: 80 scoped synthetic reference probes
  pass after corrections to bypass, status protection, sound immunity, secondary
  PP drain and Clangorous Soul cost/evidence. Three wrong historical expectations
  were corrected only after reference checks. See the
  [boundary audit](poke-sim/reports/pp_substitute_validation_2026-09-08.md).
  Final artifact full gate passed 164 fast and 12 offline/mock DB files, with four
  manual/helper skips. No deployment or competitive legality approval.

- [One-time overnight handoff](docs/release/OVERNIGHT_HANDOFF_2026-09-08.md):
  initial 233 review-only identity candidates (now 235 after form review), and 16
  pinned-baseline Mega field comparisons. No regulation promotion. Independent
  review caught and verified fixes for form substitution and CRLF artifact drift.

- v151 M-B sign-off audit: official deadline correction and 235 unique official
  roster IDs captured. The old visual ledger has a duplicate and species
  discrepancies, so full approval remains blocked. See
  [acceptance work and evidence](docs/release/REG_MB_SIGNOFF_AUDIT.md).
  Bundle: 11,478,185 bytes, SHA-256
  `8a9882d50d0a646dc6f0516d777433612a183a27f149c118452550e6e9cdd265`.

- [Staging discovery](docs/release/SUPABASE_STAGING_DISCOVERY.md): GitHub and the
  connected Supabase account checked read-only. Only main is confirmed; CI test
  secret names are absent at repository scope. `_T` alone does not prove isolation.
  Staging mutation and two-user tests remain gated; no database changes made.

- v150 candidate: retro Gengar/Nidorino opening, sprite precache, and migration
  filename hardening. See IMP-0021/0022. Bundle: 11,477,562 bytes, SHA-256
  `d025ef402e86007c8fcf8169018e7cc7f73b18224ce8c330938a5e35cedd8549`.
  Desktop/mobile motion checks and 12 Bash filename cases pass. Production database,
  staging creation and Pages deployment are unchanged.

- [Seasonal skill/reviewer readiness](docs/release/SEASONAL_AGENT_READINESS_2026-09-08.md): reusable season skill and read-only reviewer added, locally validated and independently scenario-tested. Existing regulation/staging/selection gates pass. Live Regulation Watch is enabled but its latest three inspected scheduled runs failed; September 7 reports 28 unavailable sources. Source/parser recovery is open, not masked by adding another scheduler.

- September 8 audit correction: [product trust audit](docs/release/PRODUCT_TRUST_AUDIT_2026-09-08.md) reproduces stale/misattributed Strategy reports and evidence-free advice; unresolved PR #195 mechanics and regulation findings remain release blockers despite green CI. The requested destination now includes both singles and doubles; existing doubles-only roadmap scope requires reconciliation. Do not treat Josh QA as the only remaining release gate.

- Branch: `candidate/v143-regulation-db-diagnosis`, based on merged `origin/main` at `81bb0ef250da`.
- Current runtime candidate: `v2.2.163-mc-evidence-intake`; engine `1.1.10`. Earlier mechanics receipts retain their original scope. The installed reference is not upgraded. Candidate updates go through PR #195; no new Pages deployment is claimed.
- [Company-findings OODA cycle](docs/release/OODA_COMPANY_FINDINGS_2026-09-08.md): eight Leftovers/Toxic reference probes pass; replay matching is contained pending a verified identity resolver; timing-only coaching is excluded from scoring and critical-mistake cards. Six new regression groups and manual doubles/p1 plus singles/p2 replay reviews pass. News CLI repair is candidate-only. Shared-write containment passed isolated PostgreSQL controls but is not applied to Supabase; staging and private-schema verification remain open.
- [Independent company audit](docs/release/INDEPENDENT_COMPANY_AUDIT_2026-09-08.md) preserves the original findings. The linked OODA report owns their subsequent disposition. Live security and watcher health remain release gates; the inspected public site is v142.
- [Outcome-claim OODA cycle](docs/release/OODA_OUTCOME_CLAIMS_2026-09-08.md): removed automatic endgame-error judgments from final losses and positive IQ evidence from missing errors. Two regression groups pass across both formats/sides and sparse evidence; full fast gate passed 159 files with four manual/helper skips. Roadmap source/browser view regenerated. Broader IQ calibration, downstream inference, URL/download and all independent release/security gates remain open; no manual v148 browser verification is claimed.
- [Replay OODA cycle](docs/release/OODA_REPLAY_ATTRIBUTION_2026-09-08.md): forced-switch/weather-upkeep classification, damage/move attribution, ability/item separation and unverified export identity corrected. Eight focused groups and 158 fast files pass. Manual pasted M-B replay confirms scoped visible fixes; URL fetch and physical download readback remain unverified. Outcome-based Endgame Misplay/Battle IQ claims still need correction. This is agent QA, not Josh approval.
- [First OODA fix cycle](docs/release/OODA_STRATEGY_FIX_2026-09-08.md): full-input Strategy/Mega cache identities, separate cloned-team reports, and disabled unsupported Fake Out/redirection claims; 69 focused checks pass. Saved-history/UI continuity, confidence, PP and regulation findings remain open.
- Historical v149 project gate: 160 fast files and 12 offline/mock DB files passed, with four manual/helper skips and three administrative security checks explicitly unverified. Its battle audit included 4,500 matrix runs and three golden battles. See the v161 entry and latest release review for current receipts. Production was not mutated.
- [Regulation M-C source review](poke-sim/reports/reg_m_c_readiness_2026-09-07.md): exact official UTC dates, six named Mega additions, the 24-Pokemon statement and Rillaboom example are captured from the official notice. M-C is visible but noncompetitive and blocked pending the complete in-game roster, rules, legality fixtures, mechanic deltas and reviewed reference format. Five named forms use base-form sprite placeholders because exact upstream assets returned 404.
- [Eerie Spell and Spite PP-drain validation](poke-sim/reports/pp_drain_validation_2026-09-03.md): four focused boundary groups and all 19 pinned Showdown reference contracts pass, including exact post-turn PP parity for a doubles probe. Protect, Substitute, missing move history and zero-PP failure behavior are covered. Broader PP-changing moves, Pressure interactions and complete-game parity remain open.
- [September 3 regulation/database diagnosis](docs/release/REGULATION_AND_DB_DIAGNOSIS_2026-09-03.md): M-B coverage now expires at the retained exact UTC boundary and requires an unknown successor rather than inventing one. Live Supabase returned 36 legacy teams and 204 members, but all rows lack current version identity, so the UI reports `[DB review needed]` and keeps the bundled roster authoritative.
- [Tailwind/Growl/Leer validation](poke-sim/reports/tailwind_growl_leer_validation_2026-09-01.md): 25 focused checks and all five declared pinned probes agree in bounded synthetic doubles scope. Two independent adversarial review passes closed live priority, reflection, accuracy/Substitute and selected ability/item boundary mismatches. Coverage remains partial; complete games, browser parity, broader interactions and official Champions proof remain open.
- [Seismic Toss validation](poke-sim/reports/seismic_toss_validation_2026-08-30.md): 20 focused groups pass, including ten pinned side-swapped doubles probes for ordinary damage, Ghost, Protect, Unseen Fist and Parental Bond. Independent reviewer confirmed 18 additional probes and closed its scoped finding. Coverage remains partial. Local v140 header/roadmap loaded without captured console errors; no browser battle or production save was performed.
- [Player trust and journey audit](docs/release/PLAYER_TRUST_AND_JOURNEY_AUDIT_2026-08-30.md): inspected all 11 public sections and bounded desktop/mobile journeys; 4,500 headless battles completed without execution errors, but three pinned mechanics disagreements remain. Local replay guard rejects absent/malformed observations, clears stale review actions/status and preserves original HTML provenance. Local browser positive/negative checks passed. Public Strategy counts/coaching, roster trust labels, stale source/roadmap text and navigation friction remain open. Zero browser simulation batches or paired exported games were produced in this audit.
- [Site quick wins](docs/release/SITE_QUICK_WINS_2026-08-30.md): homepage destination focus, direct editor routing, removal of canned replay advice, native roadmap disclosure markers and only the first blocker expanded. Desktop and 390px iframe checks passed in their stated scope; the full beginner, physical-device and screen-reader audits remain open. Independent scoped release review found no actionable issue.
- [First intake diagnostic fix](poke-sim/reports/showdown_intake_diagnosis_2026-08-30.md): unsupported inputs no longer become top-level reference rejections; 18/18 reference contracts pass. Fresh pinned probes still report 2 scoped agreements, 3 mechanics mismatches and zero completed games. Corrected the old explanation of unsupported catalog inputs; no team/learnset data changed.
- [Explicit reference intake and learnset audit](poke-sim/reports/reference_intake_policy_2026-08-30.md): strict defaults preserved; opt-in level/provenance normalization, original/canonical hashes, structured reasons and separate reference-error counters implemented. Seven new intake/audit tests plus 18 reference checks pass. Per pinned format, 1,517 direct rows yield 995 equal, 232 review-required and 290 unresolved; this is not official eligibility or DB alignment.
- Shared roadmap source: [project-roadmap.json](poke-sim/source/project-roadmap.json). It generates both this repo's [ROADMAP.md](ROADMAP.md) and the local browser Roadmap data. Stable roadmap IDs are not GitHub milestone numbers.
- Browser evidence links target GitHub main; local candidate documents may not be published there yet. Current Markdown/evidence paths were checked locally, not proven deployed.
- [Consolidation audit](docs/release/ROADMAP_CONSOLIDATION_2026-08-30.md): removed stale active percentage scores and monetization-first blockers, merged overlapping plans, and preserved historical notes.

## Remote Evidence

- [PR #194](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/194) merged v142 through green hosted checks at `81bb0ef250dab05d46c7435f3a1a25899c9521b1`; Pages deployment `33746502806` passed and the public artifact was manually smoke-tested. V143 remains a candidate until its own review and deployment finish.
- Narrow clean-main site fixes merged through [PR #193](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/pull/193) after green hosted checks on candidate `6fe9cd1`; merge commit `4f2cb179265d647706f4a1749c47d85e3e707043`. Pages run `33344630879` succeeded. Public v138 bytes/hash and all three homepage button destinations/focus were verified. This is not the full audit worktree or Node-only normalization deployment. See [publication evidence](docs/release/SITE_NAVIGATION_PUBLISH_2026-08-30.md).

- [August 30 live GitHub reconciliation](docs/release/GITHUB_QUEUE_RECONCILIATION_2026-08-30.md): canonical repo has 69 open issues, 17 open milestones and 2 open PRs; Alfredo has 56, 15 and 4 respectively.
- 54 matching-title cross-repo issue pairs are reconciliation candidates, not proven duplicate acceptance contracts. No issue/milestone was closed.
- Remote main commit identities differ; repo, deployment and DB 1:1 alignment are not established. Canonical branch API reports unprotected; full environment/ruleset verification remains open.
- Historical Pages evidence (August 30 EDT / August 31 UTC): deployed `v2.2.138-site-navigation-fixes`, 11,293,894 bytes, SHA-256 `078fff650a4ef2fe154d1b50e09534f031de3232e48a464e6c3c947136cffa1a`. September 9 manifest readback identifies v142; this does not constitute a fresh manual battle audit.
- August 29 public Supabase audit: 8,653 approved Showdown rows, 36 teams / 204 members / 34 complete teams, zero active Champions overrides. Public connectivity does not prove applied private schema, migrations, persistence or safe writer permissions.

## Active Gates

Immediate priority: [Supabase public-launch security gate](docs/release/SUPABASE_PUBLIC_LAUNCH_GATE_2026-08-30.md). Live administrative readback is available and confirms remaining security work; protected staging and two-user isolation proof are missing. No production security change is claimed.

| Gate | Local evidence | Still open |
|---|---|---|
| Simulation and replay | [Identity/bring-four fixes](poke-sim/reports/identity_validation_2026-08-30.md), [Seismic Toss proof](poke-sim/reports/seismic_toss_validation_2026-08-30.md), [Tailwind/Growl/Leer proof](poke-sim/reports/tailwind_growl_leer_validation_2026-09-01.md), [PP-drain proof](poke-sim/reports/pp_drain_validation_2026-09-03.md), [paired replay audit](poke-sim/reports/visual_replay_audit_2026-08-30.md) | Team translation; complete-game and visible action/Tailwind parity; broader fixed-damage, timing, stage and resource-changing interactions; Strategy-cache context and misleading coaching; broader mechanics coverage |
| Regulations and sources | [Watcher/staging safeguards](docs/release/REGULATION_WATCH_2026-08-30.md): 35 watcher tests, 39 staging checks, 10 legacy approval checks; [M-C source review](poke-sim/reports/reg_m_c_readiness_2026-09-07.md): exact dates and named additions captured while runtime promotion fails closed | Capture the complete M-C in-game Singles/Doubles roster and rules, accepted/rejected legality fixtures, move/item/Ability deltas and reviewed reference format. M-A/M-B remain unverified. Hosted activation, evidence keys and atomic human approval/publication remain open |
| Database and evidence | [DB audit](docs/release/SUPABASE_FULL_AUDIT_2026-08-29.md), [September 3 diagnosis](docs/release/REGULATION_AND_DB_DIAGNOSIS_2026-09-03.md), private staging migration prepared | Reconcile four live migrations and 36 legacy teams; protected migration/reseed, anonymous denials, two-user isolation, roster pagination, indexes and trusted private writers |
| Release and repo alignment | Local manifest/cache, test gate and Pages asset checks exist | Reconcile incoming changes, dependency/install-policy review, protected main/environments, hosted CI, reviewed deploy, rollback and parity proof |
| News/reference catalog | [Curated feed](docs/release/HOMEPAGE_NEWS_REFRESH_2026-08-30.md), [13 Worlds review-only teams](poke-sim/reports/worlds_top_cut_validation_2026-08-30.md) | Hosted refresh/deployment proof, full replay coverage, private stat points and approved regulation mapping |

Current competitive product scope is **doubles only**. Singles fixtures are shared-mechanics regressions. No verified 99% game-accuracy claim follows from passing tests.

## Next Task

1. Establish protected staging; test shared-evidence write containment and private-save ownership before explicitly approved production changes.
2. While those approvals are pending, reproduce and fix Toxic rounding, Spite hit resolution, suppressed-item effects and Wish/Leftovers ordering against pinned Showdown. Each fix needs a failing regression, related cases and independent review.
3. Extend copy/restore identity, SV IV roundtrip and complete-set legality tests. Complete M-C source evidence without silently approving rules.
4. Review the exact final candidate, run hosted CI, then have `@jdoutt38` test that revision with paired visible/export logs. The old v145 checklist is historical, not the current sign-off target.
5. Deploy only after applicable gates pass; verify live artifact/assets and user journeys. Reconcile Alfredo through a reviewed PR, not an overwrite.

September 9 remote readback: origin candidate `08451b7`, origin main `81bb0ef`, Alfredo main `15f0f98`. Both main branches differ and neither is the tested candidate. Documentation alignment does not establish repository parity. The [release review](docs/release/RELEASE_REVIEW_2026-09-09.md) owns detailed evidence and blockers; the generated roadmap uses this same priority order.

Preliminary agent walkthrough is recorded in the player-trust audit. The full [beginner homepage/navigation study](ROADMAP.md#beginner-experience) and its [checklist](docs/strategy/BEGINNER_HOMEPAGE_AUDIT_PLAN.md) remain queued after simulation readiness. Neither roadmap consolidation nor an agent walkthrough proves A+ usability. Evidence-backed Brain expansion follows trusted simulation/evidence; optional LLM, social, premium and broader product ideas remain deferred.

## History

The [previous status snapshot](docs/archive/STATUS_PRE_CONSOLIDATION_2026-08-30.md) retains earlier builds, test counts and dated observations. Historical reports do not override current gates. Use [AGENTS.md](AGENTS.md) for policy and fully qualified GitHub references for issue actions.
