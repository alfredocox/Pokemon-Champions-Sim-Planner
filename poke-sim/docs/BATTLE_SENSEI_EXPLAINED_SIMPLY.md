# Battle Sensei Explained Simply

This document explains what Battle Sensei is supposed to do in plain language.

Imagine Pokemon battles like a game of chess with timers.

The app should not only say:

- who won
- who lost
- what moves happened

The app should explain:

- why a turn mattered
- what changed the battle
- what the player should try next time
- what the sim learned from many tries

## The Big Goal

Battle Sensei should help a player get better.

It should answer:

- Did I bring the right Pokemon?
- Did I lead with the right two Pokemon?
- Did I use Tailwind or Trick Room at the right time?
- Did my setup turn actually help me win later?
- Did I lose because of my team, my move, my target, my switch, or bad luck?

The app should teach decisions, not just show battle history.

## The Team Rule

If the player manually chooses a team, that team is locked for the sim run.

In a best-of-three or best-of-five set:

- the registered six Pokemon stay the same
- the player can change which three or four Pokemon they bring each game
- the app must not secretly swap to a totally different team

This matters because players need to learn what works from their actual team.

## Speed Control

Speed control means changing who moves first.

Common examples:

- Tailwind makes one side faster.
- Trick Room makes slower Pokemon move first.
- Icy Wind can make the other side slower.
- Priority moves can jump ahead.

Speed control is important because moving first can decide who gets knocked out before they can act.

## Tailwind Example

If you use Tailwind, your team may move first.

But Tailwind is only good if it helps you do something useful, like:

- get a knockout
- force the opponent to Protect
- save your important Pokemon
- set up a safer next turn

If you use Tailwind and nothing useful happens, the app should say:

> You got speed, but you did not turn it into pressure.

## Trick Room Example

Trick Room flips the battle.

Usually faster Pokemon move first.

Under Trick Room, slower Pokemon move first.

So if the opponent has fast Pokemon and you have slow Pokemon, Trick Room can be a good plan.

The app should check:

- Did Trick Room become active?
- Did your slow Pokemon move before their fast Pokemon?
- Did you gain value while Trick Room was active?

If Trick Room helped, the app should say:

> Trick Room changed the speed order and your slow Pokemon used that window well.

If Trick Room did not help, the app should say:

> Trick Room was active, but you did not convert it into enough pressure.

## Deferred Payoff

Sometimes a good turn does not look good right away.

Example:

- Turn 1: You use Tailwind.
- Turn 1: You do not get a knockout.
- Turn 2: You move first and damage the right target.
- Turn 3: You get the knockout.

The app should not call Turn 1 bad just because it did not win immediately.

It should look ahead a few turns.

If the setup helped within the next three turns, the app should say:

> That setup paid off later.

## Complementary Turns

Some turns are helper turns.

Examples:

- Protect keeps a Pokemon safe.
- Redirection protects a partner.
- Ally Switch changes targeting.
- Trick Room or Tailwind sets up the next turns.

These turns are only good if they help the next part of the plan.

The app should connect the turns together.

It should not judge every turn alone.

## What The QA Artifacts Prove

QA artifacts are evidence files.

They show what the app actually saw in simulations.

They can prove things like:

- how many battles ran
- whether Tailwind appeared
- whether Trick Room appeared
- whether speed order was recorded
- whether damage and healing were recorded
- whether the database saved evidence

Example from the current proof:

- Trick Room appeared in retained evidence.
- Tailwind appeared in retained evidence.
- Speed order details were exported.
- Turn logs showed position-score changes.

That means the app has the raw evidence needed to teach better lessons.

## What The App Must Not Do

The app must not make up coaching.

It should not say:

- this was the best move unless alternatives were checked
- this was always correct
- this team is perfect
- the player only lost because of luck

Instead, the app should say what it can prove.

Good coaching language:

> The replay shows Tailwind was active and your side improved over the next two turns.

Bad coaching language:

> Tailwind was definitely the best possible play.

The second claim needs more proof.

## Source Truth Rule

Source truth means the app should know where its claims come from.

Examples:

- Pokemon stats and move data should come from approved Showdown data or documented Champions overrides.
- Battle mechanics should be tested before we trust them.
- Coaching claims should point to replay evidence, sim evidence, or missing-data notes.

If the app is unsure, it should say so.

## Current Battle Sensei Labels

The app is being taught these labels:

- `speed_control_reversal`: you answered their speed plan, such as Trick Room into Tailwind.
- `speed_control_neutralized`: both sides used matching speed control, so nobody got a clean speed edge.
- `speed_control_converted`: speed control quickly became pressure or material.
- `deferred_payoff`: setup looked quiet at first but paid off within the next few turns.
- `planned_speed_transition`: a speed state ended and your next board was ready for normal speed.
- `complementary_turn_payoff`: a helper turn, like Protect or setup, helped create later value.
- `speed_control_without_pressure`: speed control happened but did not create enough value.

## The Coaching Brain

The coaching brain is the next layer above labels.

Think of it like this:

- Labels say what happened.
- The Decision Ledger counts how often it happened.
- The coaching brain says what the pattern means.
- Memory should remember whether the same pattern keeps happening over time.

Example:

- Label: `tailwind_without_pressure`
- Ledger: Player Tailwind had 10 chances, 3 good, 6 bad, 1 neutral.
- Coaching Brain: "Tailwind is available, but too many windows are not becoming pressure."
- Next Game Plan: "Only use Tailwind when the next two turns can create damage, a KO, a forced Protect, or save a key Pokemon."
- Practice Drill: "Play 10 reps where every Tailwind must be followed by a planned two-turn pressure sequence."

This is the difference between a stat sheet and a coach.

The coaching brain should be strict:

- It can name a primary issue when the ledger has enough evidence.
- It can name a best measured strength.
- It can give one next-game plan.
- It can give one practice drill.
- It must explain confidence.
- It must not say "this was the best possible move" until alternative branches were checked.

The coaching brain should follow this learning loop:

- `Observe`: collect sim logs, replay logs, QA artifacts, turn states, damage, speed states, KOs, and position changes.
- `Structure`: turn raw events into tactical labels.
- `Count`: turn labels into denominators and rates.
- `Diagnose`: name the repeated pattern.
- `Predict Risk`: explain what keeps happening if nothing changes.
- `Prescribe`: give one next-game solution.
- `Drill`: turn the solution into practice reps.
- `Remember`: compare future sessions against the current pattern.

The first coaching brain scope is speed control:

- Player Tailwind
- Opponent Tailwind Defense
- Trick Room
- Speed-Control Contest

Later coaching brain layers should add:

- lineup choice
- lead choice
- Protect timing
- switch timing
- target choice
- move sequencing
- resource trades
- loss-cause classification
- repeated player memory by team and matchup

## What Memory Should Do

Memory should help the app learn from repeated use.

The long-term product goal is shared learning from simulator data.

That means the app can learn from many simulations across many users, but it must do that safely:

- use aggregated matchup and archetype patterns
- do not expose another player's private team or identity
- separate public/preloaded team data from private custom team data
- use shared evidence to improve recommendations, not to copy hidden teams
- label recommendations by confidence and sample size

It should remember patterns like:

- "This team keeps setting Trick Room but not converting it."
- "This player defends opponent Tailwind well."
- "This matchup keeps punishing the same lead."
- "Across three sessions, Tailwind conversion improved from 36% to 52%."

Shared learning can later support recommendations like:

- move options to test
- lineup swaps to try
- lead pairs that perform better into an archetype
- speed-control plans that convert more often
- practice drills based on repeated mistakes

Memory should be grouped by:

- player team
- opponent team or archetype
- format
- BO1 / BO3 / BO5
- tactical category

Memory should not overwrite truth after one game.

One battle can suggest a pattern.

Many battles can confirm a pattern.

## What We Still Need

The next source-truth work is to make structured sim turn logs teach the same lessons as replay parsing.

The app should read sim logs and say:

- Trick Room was established.
- Trick Room converted.
- Trick Room failed to convert.
- Tailwind converted.
- Tailwind expired before enough value was gained.
- A Protect/setup turn helped later.

After that, the next larger layer is the Decision Opportunity Ledger.

That means the app should count decisions like:

- Speed Control: 2 of 3 correct
- Protect Usage: 1 of 2 correct
- Target Choice: needs more evidence

This should come after the tactical interpreter is solid.

After the ledger, the coaching brain should turn repeated counts into coaching:

- Primary issue
- Best measured strength
- Next-game plan
- Practice drill
- Confidence
- Memory key

## Simple Summary

Battle Sensei should be like a coach.

It should say:

> Here is what happened.
> Here is why it mattered.
> Here is what changed the battle.
> Here is what you should try next.
> Here is how confident we are.

If the app cannot prove something, it should not pretend.

## Duration and Timing Windows

Some moves do not just happen once. They create a temporary window. The coach brain must track when that window starts, how long it stays active, when it ends, and whether the player wasted a turn by using it at the wrong time.

Tailwind is the first priority example. It gives a speed window for a limited number of turns, so the tool should not only ask, "Did you use Tailwind?" It should ask, "Did Tailwind create pressure before it ended?" Reusing Tailwind while it is already active can waste a turn. Using Tailwind into active Trick Room can also be bad unless the player is intentionally preparing for the turn Trick Room ends.

The source-of-truth output for this is `duration_effect_summary`. It labels active multi-turn effects, expirations, reissues after a visible expiry, Tailwind while already active, Tailwind into active Trick Room, and Tailwind delayed until after Trick Room ends.

For a 10-year-old: this is like timing a power-up in a race. If you use the speed boost while the track is blocked, you wasted it. If you wait until the block is gone and then use the boost, that can be smart. The sim is learning the difference.

Later, the same idea should expand to weather, terrain, screens, Protect/guard turns, priority turns, and other effects where timing changes whether a move is good or bad.

## Coach Event Rows

The coach brain now writes small coaching facts called `coach_event_rows`.

A row is one important moment from a battle. It says what happened, why it matters, whether it looked positive, negative, or neutral, how confident the app is, and what branch should be tested next.

Example in plain English: "Tailwind was used while Trick Room was active. That may waste the speed boost. Next test: wait until Trick Room has 1 or 0 turns left before using Tailwind."

This is the bridge from replay labels to real coaching memory. Labels detect the event. Event rows explain the event. Later, database aggregates can compare many users' non-personal rows to learn which choices usually work in the same matchup.

Guardrail: a single row is evidence, not a final truth. Strong recommendations require repeated rows, sample size, confidence, and comparison against alternative branches.

## Faint Cause Evidence

The replay coach must explain why a Pokemon went down. If a Pokemon had 1 HP and then fainted, the export should say what caused it: attack damage, recoil, burn, poison, sandstorm, Leech Seed, Spiky Shield contact damage, Perish Song, or another tracked effect.

The source-of-truth field is `faint_cause_summary`. It counts total faints, explained faints, unexplained faints, HP drops, and unexplained HP drops. A clean replay should drive unexplained counts toward zero.

For faint explanations, the matching evidence must be lethal. If a Pokemon took chip damage and then later fainted on the same turn, the coach must name the damage or effect row that actually reached 0 HP. Nonlethal chip can explain an HP drop, but it cannot be used as the faint cause.

Flinch is different from burn, poison, paralysis, sleep, or frostbite. It is a one-turn action-denial condition. The replay should separate two facts:

- `flinch-applied`: a move such as Fake Out successfully applied the flinch state.
- `flinch-skip`: the target was still alive when its action resolved, so it actually lost its move that turn.

If the flinched Pokemon faints before its action, the replay can say the flinch was applied, but it should not claim the Pokemon skipped a move.

## Replay Board-State Badges

Players should be able to understand the board by looking at the replay, not by reading raw JSON. Each replay turn should visibly show:

- field setup: Tailwind, Trick Room, weather, terrain, screens, Protect, Guard moves, and remaining turns when known.
- Pokemon conditions: burn, poison, toxic, paralysis, sleep, frozen/frostbite, confusion, flinch, Perish Song, Leech Seed, Substitute, and similar visible state.
- action denial: why a Pokemon did not move, such as flinch, sleep, full paralysis, freeze, no valid target, Protect, or fainted before action.

The coaching standard is: if a condition changed the turn, the replay timeline should show it as a readable badge or chip.

## Contact Move Audit

Some effects only happen when a move makes contact. Rough Skin and Spiky Shield are good examples: the damage is not just random chip; it happens because the attacker touched the opponent with a contact move.

The source-of-truth field is `contact_move_audit_summary`. It records which moves were seen, whether the sim classified each move as contact, and where that answer came from:

- `showdown_flag`: trusted Pokemon Showdown move metadata says the move has the contact flag.
- `local_contact_override`: local fallback data was used because the move needs a known override.
- `showdown_no_contact_flag`: trusted move metadata was found and the move is not contact.
- `missing_move_metadata`: the sim could not prove the move's contact status.

The coaching rule is simple: if contact damage happened, the replay should show the trigger, the effect, the damage dealt, and the HP before/after. If a physical move has missing metadata, QA should treat that as a data gap before trusting contact-based coaching.

This matters because coaching cannot be trusted if it says a Pokemon fainted without saying what triggered the HP loss.
