# Seismic Toss: Scoped Baseline Correction

Date: August 30 EDT / August 31 UTC, 2026. Change class: mechanics, regression evidence and release identity. Primary owner: Mechanics Engineer; independent read-only battle auditor. Uncommitted local candidate, engine `1.1.3`, build `v2.2.140-seismic-toss-proof`. No database, official regulation, deployment or repo-alignment change.

## Intended Behavior And Source

Pinned `pokemon-showdown@0.11.11` defines Seismic Toss with `damage: 'level'`, zero base power, Fighting typing, contact and Protect flags. Its `sim/battle-actions.ts` checks immunity before returning the attacker's level; ordinary stat, STAB, resistance/weakness, critical, roll and damage multipliers do not calculate this amount. The package's Champions modifier for attacks passing Protect occurs later in normal damage calculation, so it does not quarter fixed level damage. Champions-specific legality still requires approved official evidence.

Sources inspected: installed `data/moves.ts`, `sim/battle-actions.ts` and Champions module; upstream [battle-actions](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts) for context only. Executable proof uses the installed pinned package and recorded hashes, not mutable master. Final raw fixtures/results and package identity are saved in `artifacts/seismic-toss-2026-08-30/final-reference-probes.json`; earlier artifacts preserve the first iteration.

## Reproduction And Correction

- Before: both side orientations left the ordinary target at 197 HP; Showdown left 147 HP. Our zero-base-power guard returned zero, incorrectly treating fixed damage like a status move.
- Local correction: Seismic Toss skips critical/damage randomness and the zero-BP exit, retains existing immunity resolution, then returns the attacker's level before normal damage modifiers. The shared HP application path still owns caps, survival effects and Substitute.
- Independent review found another boundary: Unseen Fist through Protect was reduced to 12 rather than 50 by the caller. New side-swapped regressions reproduced it; both protection-multiplier call sites now exempt Seismic Toss. Normal attacks retain their previous modifier behavior.
- No automatic expansion to Night Shade, counter-style callbacks, OHKO moves or every fixed-damage move. Those require their own reviewed execution contracts; metadata alone does not execute battle rules.

## Focused Proof

`node tests/seismic_toss_tests.mjs`: 20 passing test groups.

| Boundary | Proof |
|---|---|
| Ordinary target, Ghost, Protect | Six side-swapped pinned custom-doubles probes; exact roster HP, initial stats, move order, field durations and stages agree |
| Unseen Fist through Protect | Two side-swapped pinned probes; exactly 50, not 12 |
| Parental Bond | Two side-swapped pinned probes; two separate 50-damage hits, not a reduced second hit |
| Level and modifiers | Local previews at levels 1, 37, 50, 100; four target typings; altered attack/defense stages, burn, screens, Helping Hand and Black Belt do not change the amount |
| Critical/randomness | Both forced and normal crit settings consume zero calculator RNG calls and do not mark a critical hit |
| Immunity exceptions | Local Ghost, synthetic Scrappy and Tera type-change previews |
| HP application | Eight side-swapped local scenarios for HP cap, Focus Sash, Sturdy and Substitute; applied versus calculated damage remains explicit |

The level-varied previews and synthetic level-100 survival fixtures test the level rule, not a legal Champions tournament configuration. Champions stat calculations remain fixed-level in this engine; a first survival fixture using level 1 did not reduce max HP and was corrected to an explicit low-HP species/level-100 attack. No stat-system fix is claimed.

The first isolation attempt used Helping Hand and exposed an existing text-order comparator limitation (`used Helping Hand for ...` versus `used Helping Hand`). The persisted fixtures instead use an attack into a protected partner, retaining strict comparison and excluding the unrelated text normalization issue. They do not ignore differences to pass.

## Remaining Boundaries

Ten bounded reference probes are not completed games, legal tournament teams, Champions certification or site/export parity. Other damage callbacks, arbitrary ability/item combinations, full-game RNG alignment, runtime eligibility and official Champions approval remain open. Tera previews are synthetic compatibility checks, not a claim that a Champions format permits Tera.

The original five-probe runner remains red: Tailwind still orders the remaining actions incorrectly, and two mixed fixtures still disagree on Growl/Leer stages. In the original Seismic Toss + Leer fixture, the HP disagreement is gone but the defense-stage disagreement remains. Preserve that test instead of relabeling it green. Recorded baseline follow-up: `artifacts/showdown-reference/2026-08-31T03-40-27-577Z/`.

Coverage entry `DAMAGE-SEISMIC-TOSS-LEVEL` advances from **open** to **partial**, not universally covered. The audit inventory now has 17 covered, 18 partial and 9 open cases. Overall families remain unchanged and universal accuracy remains false.

## Verification And Release

First broad gate found two stale test expectations: the old service-worker cache literal and pre-fix edge-case counts. The cache test now checks the canonical manifest; the inventory test preserves Seismic Toss as an unproved partial case. No assertion of complete coverage was removed.

- Final full gate: **151 fast files + 12 offline/mock DB files**, zero failures. M9 retains three unverified administrative checks. Output: `artifacts/seismic-toss-2026-08-30/final-project-gate.txt`.
- Final battle audit: **44 deterministic files, three golden traces, 4,500 completed headless battles**, zero execution errors; 24 timer expiries and zero HP tiebreaks. Output: `final-battle-audit.json` and `final-battle-audit-output.txt` in the same directory. Stress is not reference accuracy proof.
- Final focused suite: **20/20 groups**; ten persisted reference probes agree. Independent reviewer additionally reports **18/18 probes** across Unseen Fist/Protect, Parental Bond and Ghost through protection, three seeds and both sides. Those extra probes were read-only/in-memory, not added to the persisted raw artifact. Reversing the caller guards in memory reproduced 12 versus 50. No remaining actionable scoped reviewer finding.
- Final bundle: **11,455,354 bytes**, SHA-256 `2c83ddabb21ebbafcc19aa50d731c246852387a69a37d7463aa88b894d4ab245`. Canonical manifest, visible header, fallback/cache and reproducible bundle tests agree.
- Local browser reload displayed v140 and the updated Roadmap next action; no captured console errors. Snapshot: `local-roadmap.txt`. **Zero interactive browser battle batches or paired exported games**; this is startup/roadmap verification only.
- Public v138 was not changed or freshly re-audited in this task. The dirty audit branch is still 9 ahead/4 behind cached origin/main; no new fetch, push, PR or migration was attempted.

Rollback: reverse only this scoped mechanics patch through review and rebuild/version the resulting artifact. Do not reset the dirty audit worktree or publish it wholesale. Previous public v138 is unaffected.

Next local mechanics task: same-turn Tailwind reordering, followed by Growl/Leer. Live database security still blocks public activation.
