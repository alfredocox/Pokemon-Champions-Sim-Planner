# Regulation M-C Readiness Review

Date: 2026-09-07 EDT / 2026-09-08 UTC  
Build: `v2.2.145-reg-mc-source-review`  
Status: official announcement captured; runtime legality and trusted learning blocked

## Confirmed Champion Facts

The official Pokemon notice confirms:

- Regulation M-C runs from `2026-09-09T02:00:00Z` through `2026-12-02T01:59:00Z`.
- Pokemon eligible in prior regulation sets remain eligible.
- Mega Salamence, Mega Golisopod and Mega Baxcalibur are named additions.
- Mega Absol Z, Mega Garchomp Z and Mega Lucario Z are named Z Mega additions.
- The update says 24 Pokemon become newly available and names Rillaboom as an example.
- The complete roster must be read from the in-game Recruit roster-information flow.

Source: https://www.pokemon.com/us/news/get-ready-for-regulation-set-m-c-in-pokemon-champions

The collected official page was reachable at `2026-09-08T00:52:48.095Z`: 309,739 bytes, SHA-256 `1559f6bc356ce1a507922f6e563ceb59f94a8e4935f6e43129b17e4a3b088a42`.

## Showdown Observation

Pokemon Showdown master commit `6b4bc34e44cc2541929cc4b8fff96e756ab3f268` still exposes M-B Champions VGC/BSS formats and maps the common Champions aliases to M-B. It does not yet provide an M-C format to validate teams against.

Master does contain partial future rows for the six named Mega forms. Commit `7340ea497118a6752336d735e193cdf89a1adb5f` changes the Z Mega Abilities to Sharpness, Levitate and Aura Guard and implements Aura Guard as half damage from contact moves. These are candidate baseline facts only. They are not official M-C legality or Champion mechanics proof, and the installed executable reference remains pinned.

## Sprite Readiness

HTTP checks against Showdown's `ani` and `gen5` sprite families found:

- Mega Salamence: exact animated and static assets available.
- Mega Golisopod, Mega Baxcalibur, Mega Absol Z, Mega Garchomp Z and Mega Lucario Z: exact assets returned 404 in both families.

The shared resolver now understands `-Mega-Z` and falls back to the base Pokemon instead of ending on a broken image. That fallback is a visual placeholder, not the exact new form and not legality evidence.

## Implemented Safeguards

- Added a versioned M-C source-review ruleset with exact UTC boundaries.
- The pre-start gap identifies scheduled M-C while remaining noncompetitive.
- Active M-C remains `source_review`, with no runtime validator or Showdown format ID.
- Added a structured source-review package containing confirmed facts, observations and promotion gates.
- Added exact date-boundary, non-promotion, roster-unknown and sprite-status regressions.
- Added the official M-C notice to the read-only source inventory.

## Manual Browser Check

The local v145 bundle loaded with the expected build and local-roster labels. Selecting `Reg M-C (review)` changed both team labels to `Not verified`, displayed the missing-evidence explanation and blocked the selected matchup at regulation preflight. Returning to `Practice (unverified)` produced one complete doubles Bo3 series with three simulated games and retained replay samples. The visible audit included turn order, switching, persistent Pokemon/item identity, HP, field timers, status/effect evidence and faint causes. The Roadmap tab displayed the generated M-C next action and the project-wide accuracy disclaimer.

This is a bounded user-path smoke test. It does not validate every battle event, screen size, assistive technology or hosted deployment.

## Required Human Evidence

1. Capture every M-C Roster Info page in sequence for Singles and Doubles.
2. Capture rules, team/bring size, level, clauses and timers from the current client build.
3. Capture every new species/form, Mega Stone, move, Ability and held-item delta.
4. Record accepted and rejected teams for species, form, item, move, Ability and Mega boundaries.
5. Run controlled Champion battles for Z Mega timing, Aura Guard contact/noncontact behavior, switching, suppression, Mold Breaker-style effects and multi-hit/spread interactions.
6. Recheck Showdown for an M-C format and review its exact commit before updating the pinned reference package.
7. Acquire approved exact sprites or keep clearly labeled base-form fallbacks.

## Accuracy Concerns

- The full list of 24 newly available Pokemon is unknown from the public notice alone.
- "Previous regulation sets" inheritance does not repair the repository's still-unapproved M-A/M-B packages.
- Upstream Future rows can change before release, as the Z Mega Ability commit already demonstrates.
- Aura Guard needs Champion evidence for contact flags, multi-hit rounding, critical hits, ability suppression/ignoring and attacker/defender switching.
- Mega and Z Mega item naming, transformation timing, one-Mega limits and preview/reveal behavior need in-game proof.
- Missing exact sprites must never silently become evidence that a form is unsupported or illegal.

This slice prepares safe intake. It does not establish complete M-C legality, full mechanic parity, or a 99% universal accuracy result.
