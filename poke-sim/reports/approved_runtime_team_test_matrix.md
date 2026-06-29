# Approved Runtime Team Test Matrix

Purpose: explain why each newly approved bundled team exists and what it should help QA prove.

Status: active QA guide for the `v2.2.24-kevin-team-qa` team lane.

These teams are not random presets. They are legal runtime rows built to exercise important battle systems, replay evidence, tactical QA, and future coaching recommendations.

## Team Matrix

| Team key | Display name | Main job | What it helps test |
|---|---|---|---|
| `indeedee_hatterene_tr` | Indeedee Hatterene Trick Room | Psychic Terrain plus Trick Room pressure | Psychic Terrain priority blocking, Follow Me redirection, Trick Room setup timing, Expanding Force terrain behavior, anti-priority replay evidence |
| `rillaboom_archaludon_balance` | Rillaboom Archaludon Balance | Grassy Terrain balance with rain-supported pressure | Grassy Surge, terrain pivoting, Pelipper rain, Tailwind timing, Archaludon Electro Shot lines, Body Press stat-source evidence |
| `arboliva_seed_sower_balance` | Arboliva Seed Sower Balance | Reactive terrain and sustain | Seed Sower terrain creation, Giga Drain and Pollen Puff healing evidence, Terrain Pulse behavior, long-game sustain patterns |
| `pelipper_basculegion_rain` | Pelipper Basculegion Rain | Rain offense with terrain pivot | Drizzle, Tailwind, Weather Ball, Swift Swim pressure, Rillaboom terrain counterplay, rain-versus-sun matchup behavior |
| `kevin_meta_sun` | Kevin Meta Sun | Coached baseline sun team for real testing | Mega Charizard Y sun, Venusaur Chlorophyll pressure, Sleep Powder risk/reward, Garchomp spread pressure, Sneasler disruption, Incineroar Fake Out tempo, Whimsicott Tailwind and Encore |

## How QA Should Use Them

Run `kevin_meta_sun` into the other new rows first.

Recommended first pass:

1. `kevin_meta_sun` vs `pelipper_basculegion_rain`
2. `kevin_meta_sun` vs `indeedee_hatterene_tr`
3. `kevin_meta_sun` vs `rillaboom_archaludon_balance`
4. `kevin_meta_sun` vs `arboliva_seed_sower_balance`

Then run each new row into older archetype rows:

1. `cofagrigus_tr`
2. `rin_sand`
3. `suica_sun`
4. `aurora_veil_froslass`
5. `targeted_proof_legal`

## Evidence To Collect

Each QA packet should include:

1. one single battle turn-log export
2. one QA Artifact export from Stress Lite, Tactical Sweep QA, or Run All
3. notes for matchup, leads, result, and anything that looked wrong

Reviewer checks:

1. team appears in selector without illegal warnings
2. selected six and selected four stay tied to the chosen team
3. replay exposes field state, terrain, weather, Trick Room, Tailwind, status, volatile tags, and HP-loss causes where present
4. damage events and effect events explain why HP changed
5. coaching summary does not learn from a hidden or unexplained mechanic

## Coaching Use

`kevin_meta_sun` is the first named coached baseline team.

Future saved-team analysis should treat it as the model flow:

1. save original team as `baseline_v1`
2. run matchup simulations and replay analysis
3. propose legal evidence-backed variants
4. let the user accept or reject changes
5. store each accepted version separately
6. graph whether the accepted changes improved matchups, lead quality, move value, speed-control conversion, and replay decision quality

## Guardrail

Do not mark a team as trusted coaching data only because it exists in the catalog.

A team becomes trusted only when:

1. Champion legality passes
2. move legality passes
3. it is visible in the approved selector lane
4. its key matchup logs expose enough replay evidence for review
5. QA artifacts confirm the expected mechanics occurred

