# PP Drain And Substitute Boundary Audit

September 8, 2026. v152 / engine 1.1.8 local candidate; not public release clearance.

## Observe And Orient

The September 3 local test expected Substitute to block Spite. The pinned
Showdown move has `bypasssub`; Eerie Spell and other sound moves also bypass
Substitute. Ten initial side-swapped probes failed against the old behavior.
Expansion exposed Protect/reflection ordering, ability suppression, Soundproof
and Eerie Spell secondary handling gaps. Independent review reproduced reflected
Spite versus Good as Gold and Eerie Spell versus Shield Dust/Covert Cloak.

Reference: development-only `pokemon-showdown@0.11.11`,
`gen9championsdoublescustomgame`, seed `[123,456,789,42]`. Synthetic abilities and
moves deliberately isolate mechanics and do not assert legal competitive sets.

## Decide And Act

Use shared mirrored move flags for Substitute bypass. Apply target defenses to
Spite, respect sound immunity and distinguish Eerie Spell's damage from its
secondary PP drain. Expose remaining Substitute HP in local and reference
snapshots to test preservation directly. Add tests before closing each finding.

The expanded knockout fixture initially used Choice Specs after first-turn
Splash. Showdown correctly rejected Eerie Spell because of the choice lock.
Correct the fixture, not the reference's rejection or the knockout assertion.

## Verification

- Tests: `tests/pp_substitute_reference_tests.mjs` and
  `tests/pp_drain_move_tests.mjs`.
- Expanded focused and snapshot/export checks: 103/103 passed, including 62
  pinned reference probes. Both orientations cover reflected Good as Gold,
  Shield Dust/Covert Cloak, Mold Breaker/Ability Shield, actual knockouts and
  surviving Substitute HP preservation. Non-sound damage is a negative control.
- A second independent review found Protect bypass for Taunt/Encore and missed
  Soundproof for Parting Shot. Shared status defenses were corrected. The expanded
  suite passes 72/72 probes, including a third-turn action after Protect and
  Parting Shot stage/switch checks. General reflected-move recursion is still open.
- The first full gate exposed the wrong Taunt smoke expectation; the second
  exposed a bare harness that omitted mirrored data. Corrected the expectation
  only after reference proof, then aligned the harness's data load. The standalone
  mechanics audit passes 20/20. Full gates are rerunning after the final fixes.
- Third gate attempt exposed a Noble Roar success fixture using Protect. Replaced
  its dummy action with Splash and added paired success/Protect references that
  compare both stat stages. Focused reference suite now passes 76/76; the prior
  counts above preserve the sequence of findings, not competing current totals.
- Fourth full gate and battle audit passed, but independent review caught an
  overbroad Soundproof status guard affecting self/field moves and a negative
  Encore assertion using incorrect log wording. Corrected both and added controls.
  Clangorous Soul's exact HP check exposed 1/3 versus the pinned source's 33% cost;
  fixed the cost and failure boundary. The focused suite now passes 80/80.
  Perish Song's new control proves field activation only. Its existing per-target
  immunity and countdown code need separate differential work and remain open.
- Fifth full gate passed 164 fast files and 12 offline/mock DB files with four
  manual/helper skips. Three administrative security checks remain unverified.
  Battle audit passed all selected families, three unchanged golden traces and
  4,500 seeded matrix games with zero JS errors; 21 timer expiries were reported.
- Final review caught the stale `1/3` cost rule in Clangorous Soul's event after
  execution was fixed to 33%. Corrected it and asserted event/calculation equality
  in both orientations. All 80 focused probes pass again; final full gate reruns.
- Rebuilt artifact: 11,480,121 bytes; SHA-256
  `7b5d750e392614bdb8357562d82e68bc2172601dd2963c92bec9feb6713e3cb2`.
- Independent final readback closed all findings from this patch review. Local
  Chromium loaded the exact v152 visible version and corrected roadmap with zero
  page errors. No simulation was started in that smoke check; it is not replay
  or screenshot/layout proof.
- Final artifact full gate passed 164 fast and 12 offline/mock DB files with four
  manual/helper skips. Independent review and local artifact identity checks pass.
  Hosted CI, paired interactive replay checks and deployment remain separate.
- No browser simulation batch or paired visual/export verification is claimed.

## Remaining Scope

Bounded probes do not establish exact random damage, all target positions, ally
targeting, general reflected-move recursion, every secondary effect, complete
games or Champions-specific legality. Preserve those as separate gates.
No production database mutation, regulation approval or deployment is included.
