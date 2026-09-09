# Tailwind, Growl And Leer Scoped Validation

Date: September 1 EDT / September 2 UTC, 2026. Change class: mechanics, evidence and release identity. Local engine `1.1.4`, build `v2.2.141-tailwind-stage-proof`; not published.

## Result

The local engine now agrees with pinned `pokemon-showdown@0.11.11` for the declared synthetic doubles probes. This closes the three previously observed five-probe runner disagreements when combined with the earlier Seismic Toss fix. It does not prove complete-game parity, official Pokemon Champions behavior, a regulation, live database security or a percentage-accuracy claim.

## Before And Root Cause

- Tailwind: all actions were sorted once before the turn. A Tailwind established mid-turn could not reorder the equal-priority actions still waiting.
- Growl/Leer: both moves had mirrored metadata but no executable status-stage path, so opposing stages remained zero.
- Clear Amulet: the shared opponent stat-drop helper did not block negative stages from the item.

## Bounded Change

- Re-sort only unexecuted actions against current priority, effective Speed and Trick Room state. Runtime actions opt into live priority recalculation; audit inputs may retain an explicit priority bracket. Executed actions cannot move and priority brackets remain authoritative.
- Read Growl/Leer boosts and flags from the mirrored Showdown move row. Resolve each live target independently in Showdown order through Protect, concealment, priority protection, Prankster/Dark, Good as Gold, Magic Bounce, accuracy, Substitute and the shared stat-stage helper.
- Apply Clear Amulet, Clear Body-family protection, stat-specific blockers, Contrary, Simple, Mirror Armor, Defiant and Competitive through the shared stage boundary, including allied spread drops where Showdown applies those protections.

## Evidence

- Focused tests: 25/25 groups in `tailwind_dynamic_order_tests.mjs` and `growl_leer_stage_tests.mjs`.
- Boundaries: side-swapped Tailwind; live Gale Wings priority loss; priority brackets; Tailwind under Trick Room; two opposing stage targets; per-target Protect; Clear Body/White Smoke/Hyper Cutter; Defiant/Competitive; Clear Amulet; Good as Gold; Soundproof; Contrary; Mirror Armor; Mold Breaker; protected, dual and spread Magic Bounce; allied Bulldoze drops; Growl bypassing Substitute; Leer accuracy before Substitute; Magic Bounce before accuracy.
- Pinned runner: 5/5 declared probes completed and agreed, zero unsupported/rejected/reference-error/mismatch probes. These are bounded probes and zero completed games.
- Full project gate: 153 fast files and 12 offline/mock database files passed with zero failed files.
- Stress audit: 44 deterministic audit files, three golden traces and 4,500/4,500 headless matrix battles completed with zero JavaScript errors. Mirror results stayed within the configured hard bounds; 21 timer expiries and zero HP tiebreaks were observed in the final run.
- Database gate: 12 offline/mock files passed. Eight M9 local checks passed; applied migration ledger, security advisor and performance advisor remain not verified without authorized administrative readback.
- The first stress-report invocation completed the mechanics run but failed to write because the supplied path was doubled after the runner changed directory. The corrected invocation wrote `artifacts/battle-audit-tailwind-growl-2026-09-01.json` and passed.

## Remaining Scope

- Other arbitrary mid-turn Speed/priority changes and exact ties after a change need more differential probes.
- The wider status-stage move, ability and item inventory remains incomplete despite the newly covered boundaries.
- Complete games, paired visible/export logs, imported-team breadth and browser behavior remain unproved here.
- Champions-specific deltas and Regulation M-B require approved official or captured evidence.
- Live Supabase grants, RLS, migrations, two-user isolation, visitor denial, backups and abuse controls remain open.

## Independent Review

The first independent read-only audit found eight mismatches after the original 13 focused checks: live Gale Wings priority, Soundproof, Hyper Cutter, Contrary, White Smoke, Mirror Armor, spread Magic Bounce, Mold Breaker, allied Clear Amulet and changed-tie handling. After bounded fixes, its original eight probes agreed 8/8.

A second adversarial pass found protected and dual Magic Bounce, allied Clear Body-family protection and Leer accuracy/Substitute ordering. Those three exact probes then agreed 3/3. The reviewer also found Magic Bounce had to precede accuracy; after the final reorder, 64/64 accuracy-sensitive seeds bounced with the original attacker at -6 Accuracy and zero premature misses. No mismatch remained in this declared scope. This is independent Showdown-baseline evidence, not Champions-specific certification.
