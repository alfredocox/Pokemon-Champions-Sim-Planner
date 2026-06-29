# Pokemon Champions Mechanics Truth Gate

Status: active map for issue `#149`.

Date context: June 28-29, 2026.

Purpose: define exactly what must be proven before the simulator can make stronger Pokemon Champions singles, doubles, battle-accuracy, and coaching-trust claims.

## Scope Rule

This is a Pokemon Champions simulator gate.

Do not frame the product as another Pokemon game's simulator. Do not use non-Champion mechanics as player-facing scope. If legacy imported data contains a mechanic that is not enabled by the active Pokemon Champions ruleset, the app must block it, strip it, or label it as non-Champion legacy data.

Pokemon Showdown remains an executable mechanics and data source, but only through the Champion ruleset/source-truth boundary. Showdown can prove standard Pokemon mechanics and metadata. It cannot by itself promote a mechanic into the active Champion lane when Champion sources do not allow it.

This gate covers both Champion singles and Champion doubles. Doubles has more interaction risk because two active Pokemon per side create spread, redirection, ally-target, guard, target-filtering, and lead-pair problems. Singles still needs the same truth standard for damage, status, action denial, switching, items, abilities, field state, and coaching-safe learning.

## Source Hierarchy

Use the existing Data Source Registry hierarchy for every mechanics decision.

| Tier | Source | Allowed to prove for this gate |
|---|---|---|
| 0 | Official Pokemon, Play! Pokemon, Pokemon Champions notices, rules, patch notes, event pages | Active ruleset, official tournament structure, official Champion-specific mechanics when stated directly |
| 1 | Champion-specific references such as Serebii Champions pages, Victory Road Champion regulation pages, Game8 Champion pages | Champion legality, regulation dates, availability, item pool, allowed Mega/forms, and Champion-specific differences |
| 2 | Pokemon Showdown upstream, Pokemon Showdown Champion mod, `@pkmn/sim`, `@smogon/calc` | Baseline move data, ability data, item data, type chart, target flags, learnsets, standard battle behavior, damage oracle checks |
| 3 | Human-readable cross-checkers such as Bulbapedia, Smogon strategy pages, usage/meta sites, tournament reports | Plain-English explanation, coaching context, usage patterns, archetypes, and secondary confirmation |
| 4 | Repo QA artifacts, turn logs, branch-memory rows, browser exports, source-truth tests | What this app actually executed and proved |

If sources conflict, do not pick the convenient answer. Add a source-review finding, keep the runtime conservative, and require a focused test plus Overview note before changing behavior.

## Active Ruleset Boundary

As of the June 27-29, 2026 repo review:

- Reg M-B is the active external source-review lane.
- The implemented deterministic simulator lane remains historical Reg M-A style until Reg M-B data is fully converted, source-backed, tested, bundled, and QA-proven.
- Reg M-B rows may appear as review-only coverage data, but they must not train trusted coaching, ranking, or aggregate recommendations until promoted.
- All exported analysis must preserve ruleset ID and ruleset status so future learning does not mix implemented, historical, review-only, and blocked data.

## Closure Standard

A mechanics family is closed only when all of these are true:

- Source basis is documented using the hierarchy above.
- Deterministic tests prove the supported behavior.
- Replay logs expose the reason in trainer-readable form.
- QA Artifact exports count the proof so the team knows whether the mechanic actually occurred.
- Overview/release docs show the family as closed, partly closed, deferred, or blocked.
- Coaching logic either uses the proven evidence or refuses to make a strong recommendation.

## Mechanics Family Map

| Family | Player question | Required source basis | Engine proof | Replay/QA proof | Current status |
|---|---|---|---|---|---|
| Targeting and immunity | Why did this move hit, miss, fail, or ignore a target? | Showdown target/type/ability data plus Champion legality gate | Ground immunity, airborne checks, Ghost targeting edge cases, redirection, spread filtering, no-valid-target timing | Target row names every affected target and blocked target with reason | Open |
| Action denial | Why did my Pokemon lose the turn? | Showdown status/volatile behavior plus Champion ruleset permission | Flinch, sleep, freeze, paralysis, confusion, Taunt, Encore, Disable, Throat Chop, Imprison, trapping limits | Pokemon card tags and action rows show applied condition versus actual skipped action | Partly closed |
| Priority suppression | Why did priority fail? | Showdown mechanics plus Champion allowed ability/source gate | Fake Out window, Quick Guard, Psychic Terrain, Armor Tail, Dazzling, Queenly Majesty, Feint exceptions | Failure row shows blocker, target grounding, priority value, and whether the move was protected or suppressed | Partly closed |
| Protect and guard family | What shield blocked the move and what rider effect happened? | Showdown move flags, contact flags, guard/protect behavior | Protect, Detect, Quick Guard, Wide Guard, Feint, King's Shield, Spiky Shield, Baneful Bunker, Obstruct | Replay row shows blocked move plus stat drop, poison, contact damage, or guard break when applicable | Partly closed |
| Multi-effect damaging moves | Did the move do damage plus another effect? | Showdown move secondary/drain/recoil/stat metadata | Damage + status, damage + stat drop, damage + recoil, damage + drain, self-boost, multi-hit, conditional effects | One resolved action row groups damage_events and effect_events by target and effect order | Partly closed |
| Field and duration effects | What field is active and how many turns remain? | Champion ruleset plus Showdown baseline for duration behavior | Tailwind, Trick Room, terrain, weather, screens, reissue timing, expiration timing | Timeline and QA summary show active/expired/reissued/wasted windows and remaining turns | Partly closed |
| Items and abilities | Which item or ability changed the result? | Champion item/ability legality plus Showdown metadata | Berries, damage boosts, contact damage, immunities, weather/terrain abilities, Mega ability changes, Knock Off, item consumption | HP/stat rows name the item or ability and before/after state | Partly closed |
| Switching and replacement | Why did target or board position change? | Showdown baseline plus Champion BO rules | Faint replacement, pivot moves, trapping, forced switch, Fake Out reset on switch-in, BO3/BO5 bring-from-six behavior | Replay row shows target disappeared, replacement timing, bench state, and registered six | Open |
| Spread and doubles resolution | Did both targets resolve correctly? | Showdown target flags and doubles behavior | Spread modifier, ally/foe filtering, immunities per target, redirection, target cap | One move row can show every target's damage, immunity, miss, or failure | Partly closed |
| Singles resolution | Did one active Pokemon per side resolve cleanly without doubles-only assumptions? | Champion singles ruleset plus Showdown baseline | Target selection, switching, action denial, field duration, items, abilities, no ally-target leakage | Replay row shows exact one-target resolution and no doubles-only UI/counter pollution | Open |
| Coaching-safe learning | Can the sim recommend from this result? | Repo QA evidence and source hierarchy | Recommendation only reads proven families and ruleset-matched rows | Artifact shows sample size, confidence, ruleset, build, and missing proof before coaching claims | Open |

## Already Shipped Proof To Build On

This gate does not restart the project. It organizes the work already shipped and makes the missing pieces explicit.

| Shipped proof area | What it already gives us | How it feeds this gate |
|---|---|---|
| Fake Out first-turn gate | Fake Out cannot be selected or forced as a normal attack after the user's first turn out, and the attempted window is consumed when blocked | Baseline for priority/action-denial proof |
| Priority blockers | Quick Guard, Psychic Terrain, Armor Tail, Dazzling, and Queenly Majesty are already named in engine/test coverage | Expand replay reason rows and QA counters by blocker |
| Status/action-denial tests | Flinch, sleep, freeze, paralysis, confusion, Rest/Sleep Talk, and status terrain prevention already have focused coverage | Normalize skipped-action evidence and Pokemon-card tags |
| Terrain and duration labels | Tailwind, Trick Room, terrains, and speed-order exports already exist, with tactical labels and duration summaries started | Add remaining-turn visibility and coaching-safe counters |
| Move-failure rows | Structured failure evidence now exists for high-value blocked or failed moves | Turn this into a complete source-backed failure inventory |
| `damage_events` / `effect_events` | HP changes, recoil, drain, recovery, HP costs, item recovery, flinch application, and move failures can be exported | Require every supported family to be visible through these rows |
| Replay detail rows | Resolved replay actions can group target damage, misses, failures, and KOs instead of duplicating pre-call lines | Make one trainer-facing row explain each action fully |
| QA coverage summary | Artifacts count mechanics actually observed instead of implying unobserved mechanics are proven | Add counters for action denial, blocked priority, field state, and failure reason families |
| Ruleset lifecycle guard | Implemented, historical, source-review, and blocked ruleset statuses already exist | Prevent Reg M-B review-only data from poisoning trusted coaching |
| Source registry | Source hierarchy and timestamp rules already exist | Every family closure must cite the source tier and checked date |

## Alignment Rule While We Build

Every new mechanics slice must update the same five surfaces together:

1. Runtime behavior or explicit blocked/deferred status.
2. Deterministic test or source-truth guard.
3. Replay/turn-log/QA evidence field.
4. Overview/release documentation.
5. Issue status and coaching-safe boundary.

If a slice cannot update all five, it stays partly closed and cannot feed strong coaching recommendations.

## First Implementation Slice

Start with action denial plus priority suppression because it affects common doubles decisions immediately.

The same slice must be valid for singles. If a reason only exists in doubles, such as redirection or ally-target guard behavior, mark it as doubles-only. If a reason exists in both formats, such as Fake Out timing, flinch, sleep, paralysis, Protect, or switching, tests and replay evidence should not depend on doubles-only assumptions.

Implementation start: `v2.2.32-action-denial-priority` adds stable reason IDs and QA counters for the first priority-suppression proof family. Fake Out timing failure, Quick Guard priority block, Psychic Terrain priority block, and Armor Tail/Dazzling/Queenly Majesty priority blocks now emit structured move-failure evidence with `reason_id`, `failure_reason_id`, `blocked_priority`, blocker metadata, target metadata, and format metadata when available.

Slice 2: `v2.2.33-status-lock-proof` keeps battle behavior stable and expands the proof layer. Sleep, freeze, paralysis, flinch, and confusion action denials now group into status/action-denial counters, while Taunt, Imprison, and Throat Chop move-lock failures export named lock metadata for QA and coaching review. Accuracy misses, no-valid-target failures, and consecutive Protect-family failures also get separate QA counters so artifacts can distinguish player decision failure, random miss, target-resolution failure, and state-based move lock.

Deliverables:

- Inventory every current action-denial and priority-suppression reason the engine can emit.
- Add or update deterministic tests for each supported reason.
- Make replay rows and Pokemon cards show the condition clearly.
- Add QA coverage counters for applied condition, skipped action, and blocked priority.
- Update Overview with closed/partly-closed status by reason, not vague family claims.

### Slice 1 Stress-Test Checklist

The first slice is ready to implement when every row below has an explicit status: `covered`, `needs replay proof`, `needs engine proof`, `blocked by source`, or `deferred`.

| Reason family | Concrete Champion battle question | Minimum proof required |
|---|---|---|
| Fake Out timing | Was the user on its first turn out, or was the Fake Out window already spent? | Engine test, replay failure reason, QA counter |
| Fake Out target immunity | Did typing/ability/field/target state make Fake Out fail? | Engine test by reason, replay failure reason, target evidence |
| Flinch application | Did a move apply flinch before the target acted? | Effect event, Pokemon-card tag, skipped-action row |
| Flinch no-op | Did the target already act, making flinch not deny that turn? | Engine test and replay wording that avoids overclaim |
| Sleep skip | Was the Pokemon asleep and unable to act this turn? | Status tag, skipped-action row, sleep turn counter |
| Sleep exception | Did Sleep Talk or a source-backed exception allow action while asleep? | Engine test, replay row naming exception |
| Freeze skip/thaw | Was action denied by freeze, or did thaw occur first? | Status tag, skipped-action/thaw row, QA counter |
| Paralysis skip | Did paralysis deny the action, or only reduce Speed? | Speed evidence plus skipped-action row only when action is actually denied |
| Confusion self-hit | Did confusion cause self-damage instead of the selected move? | Effect event with self-hit HP change and skipped selected action |
| Taunt/Encore/Disable/Imprison | Was the chosen move illegal because of a move-lock or move-block state? | Failure row naming blocker and source |
| Throat Chop/sound lock | Was a sound move blocked by active sound suppression? | Failure row naming Throat Chop state and source |
| Quick Guard | Was a positive-priority move blocked, and did Feint bypass correctly? | Engine test, failure row, QA blocked-priority counter |
| Psychic Terrain | Was the target grounded and protected from priority? | Engine test with grounded/ungrounded split, failure row |
| Armor Tail/Dazzling/Queenly Majesty | Did same-family priority suppression block the target side? | Same-rule regression test and failure row naming ability |
| Protect interaction | Did Protect or a guard move block the action before/after priority checks? | Resolution-order test and replay reason |
| No valid target | Did the target faint/switch/disappear before action? | Stable target key evidence and replay row naming timing |
| Singles-vs-doubles format split | Does the reason behave correctly in singles and doubles without leaking ally/partner assumptions? | At least one singles proof for shared reasons and doubles-only labeling where appropriate |

### Slice 1 Closure Bar

Do not call slice 1 closed until:

- the inventory names every action-denial/priority-suppression reason currently emitted by the engine
- each supported reason has at least one deterministic test or a documented blocked/deferred status
- replay rows expose applied condition, skipped action, blocker, source, and target when available
- Pokemon cards show visible status/volatile chips for the turn being reviewed
- QA artifacts count action-denial and blocked-priority families separately
- Overview says which reasons are covered versus still open
- Battle Sensei/coaching refuses strong recommendations when the relevant reason family is missing proof
- shared reasons are proven for both singles and doubles, or explicitly marked format-specific

### Slice 1 Implementation Order

1. Inventory current emitted reasons from engine/effect rows.
2. Normalize reason IDs so tests, replay rows, QA counters, and coaching all use the same vocabulary.
3. Add missing deterministic tests for the highest-risk supported reasons.
4. Add replay and QA counters for reason families already proven.
5. Update Overview and issue `#149` with the exact covered/open reason list.

## Slice 1 Current Coverage

| Reason | Format status | Proof status |
|---|---|---|
| Fake Out timing failure | singles + doubles shared | structured failure row and QA counter started |
| Quick Guard priority block | doubles-oriented guard interaction | structured failure row and QA counter started |
| Psychic Terrain priority block | singles + doubles shared when grounded target exists | structured failure row and QA counter started |
| Armor Tail priority block | singles + doubles shared where ability is legal | structured failure row, same-family regression, and QA counter started |
| Dazzling priority block | singles + doubles shared where ability is legal | structured failure row, same-family regression, and QA counter started |
| Queenly Majesty priority block | singles + doubles shared where ability is legal | structured failure row, same-family regression, and QA counter started |

Still open after slice 2: source-backed exception inventory for Sleep Talk/Rest and other sleep exceptions, freeze thaw timing rows, paralysis speed-only proof when no action is denied, confusion non-hit pass-through rows, Encore/Disable lock reasons, deeper Protect ordering, replacement/switch timing, spread targeting detail, Pokemon-card chip consistency across singles and doubles, and a smoother Showdown-style team/set/upload editor flow.

## What Must Not Happen

- Do not close issue `#149` because one or two targeted tests pass.
- Do not let review-only Reg M-B rows train coaching data.
- Do not make a coaching recommendation from an unsupported or non-visible mechanic.
- Do not use non-Champion legacy data as product scope.
- Do not aggregate runs across rulesets unless the report explicitly says it is cross-ruleset comparison.

## Definition Of Done For Issue #149

Issue `#149` can close only when:

- Every family in this map has a closed, deferred, or blocked status with source notes.
- Every supported family has deterministic tests.
- Replay/QA exports expose each supported family clearly enough for a player to challenge the result.
- The Overview page, release docs, and issue comments point to the same closure state.
- The coaching layer refuses strong advice when a required family is missing proof.
