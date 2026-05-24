# Ability Coverage Audit

Date: 2026-05-24

Scope:
- curated shipped teams in `data.js` excluding `player` and `custom_*`
- `CHAMPIONS_MEGAS` ability catalog
- current battle engine ability hooks and inline checks in `engine.js`

Summary:
- unique curated-team + mega abilities audited: 82
- already modeled by the engine: 23
- still unmodeled and classified: 59

Why this exists:
- Issue #125 showed repeated review friction around ability gaps being noticed ad hoc.
- This audit turns that into a maintained inventory with a guard test so new gaps cannot quietly pile up.

Classification buckets:
- `passive_or_noop_for_current_sim`
- `missing_low_impact`
- `missing_battle_result_impacting`

Highest-priority shipped-team gaps:
- `Adaptability`: affects Basculegion damage across multiple shipped teams.
- `Clear Body`, `Competitive`, `Defiant`: all change Intimidate-heavy matchups.
- `Cloud Nine`: changes weather suppression, damage, and speed.
- `Shadow Tag`: changes switch options and perish-style endgames.
- `Solar Power`, `Tough Claws`, `Pixilate`, `Supreme Overlord`: direct damage modifiers.
- `Stance Change`, `Sturdy`, `Unaware`: major battle-result mechanics, not flavor.

Implemented after this audit:
- `Prankster`: real battle priority for status moves, with Dark-type immunity on targeted opposing status.
- `Armor Tail`: side-wide blocking for opposing priority moves.
- `Good as Gold`: targeted status immunity.
- `Magic Bounce`: targeted status reflection back to the user.

Lower-priority or no-op examples:
- `Frisk`: item reveal is effectively already visible in the sim.
- `Pressure`: PP drain is not modeled, so it has no current battle-math path.
- `Healer`, `Shell Armor`, `Trace`, `Limber`, `Insomnia`: real mechanics, but narrower current user impact than the top gaps.

Recommended implementation order:
1. Priority and targeting control
   - `Shadow Tag`
2. Damage modifiers with broad shipped-team exposure
   - `Adaptability`
   - `Tough Claws`
   - `Pixilate`
   - `Solar Power`
   - `Supreme Overlord`
3. Stat-reaction and anti-Intimidate slice
   - `Clear Body`
   - `Competitive`
   - `Defiant`
   - `Unaware`
4. Defensive and board-state mechanics
   - `Cloud Nine`
   - `Earth Eater`
   - `Sturdy`
   - `Stance Change`
   - `Friend Guard`

Guardrail:
- `tests/ability_coverage_audit_tests.js` compares the current unmodeled ability inventory against `tests/fixtures/ability_gap_classification.json`.
- If a new shipped-team or mega ability is unmodeled and unclassified, the test fails immediately.

Out of scope for this pass:
- implementing the missing mechanics
- Supabase changes
- bundle or deployment changes
- broad engine rewrite
