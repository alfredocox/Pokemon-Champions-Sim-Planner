# Ability Coverage Audit

Date: 2026-08-29

Scope:
- curated shipped teams in `data.js` excluding `player` and `custom_*`
- `CHAMPIONS_MEGAS` ability catalog
- current battle engine ability hooks and inline checks in `engine.js`

Summary:
- unique curated-team + Mega abilities audited: 84
- modeled by the engine: 84
- still unmodeled and classified: 0

Why this exists:
- Issue #125 showed repeated review friction around ability gaps being noticed ad hoc.
- This audit turns that into a maintained inventory with a guard test so new gaps cannot quietly pile up.
- Coverage here means the ability has an engine path for the current simulator surface. It does not by itself prove full Champion/Showdown behavioral parity for every edge case.

Resolved high-impact gaps in this pass:
- `Shadow Tag`: blocks voluntary pivot/switch attempts for trapped non-Ghost foes.
- `Gale Wings`: gives Flying moves +1 priority only while the user is at full HP.
- `Skill Link`: supported multi-hit moves use the maximum hit count.
- `Stamina`: raises Defense after surviving a damaging hit.
- `Protean`: changes type once per switch-in before the first eligible move.
- `Berserk`: raises Special Attack when direct damage crosses the half-HP threshold.
- `Innards Out`: reflects the target pre-hit HP to the attacker after a direct-damage KO.
- `Flower Veil`: protects allied Grass Pokemon from opponent stat drops and major status.
- `Stalwart`: ignores Follow Me / Rage Powder redirection in supported targeting paths.
- `Mind's Eye`: blocks accuracy drops, ignores target evasion, and lets Normal/Fighting moves hit Ghost targets.
- `No Guard`, `Compound Eyes`, `Sand Veil`, `Snow Cloak`: route through the shared accuracy gate.
- `Poison Touch`: contact damage can poison the target.
- `Regenerator`: successful switch-outs restore one third max HP rounded down through the shared switch hook.

Resolved lower-impact or narrow gaps:
- `Bulletproof`: blocks ballistic moves using Showdown flags plus local fallbacks.
- `Mummy`: contact attackers have their ability overwritten after damaging contact.
- `Shell Armor`: prevents critical hits.
- `Trace`: copies the first eligible opposing active ability and refreshes derived state.
- `Limber`: blocks paralysis.
- `Insomnia`: blocks sleep.
- `Unnerve`: suppresses opposing berry activation.
- `Healer`: end-turn chance to cure an active ally status.
- `Frisk`: explicit current-sim no-op because item reveal is already visible.
- `Pressure`: explicit current-sim no-op because PP drain is not modeled.

Guardrail:
- `tests/ability_coverage_audit_tests.js` compares the current unmodeled ability inventory against `tests/fixtures/ability_gap_classification.json`.
- If a new shipped-team or mega ability is unmodeled and unclassified, the test fails immediately.
- Former high-impact gaps are now asserted as modeled so they cannot silently fall out of the engine catalog.
- Golden battle hashes were regenerated after confirming the trace drift came from the new accuracy gate allowing inaccurate moves such as `Head Smash` to miss under deterministic seeds.

Focused coverage:
- `tests/ability_damage_parity_tests.js`
- `tests/ability_priority_targeting_tests.js`
- `tests/ability_coverage_audit_tests.js`

Known trust boundary:
- Spread moves now roll accuracy independently per target. Immunity-before-accuracy ordering and mixed-target ability interactions remain explicit case-level follow-ups.
- Champion-specific differences must stay as explicit sourced overrides. If Showdown or secondary Champion sources change, the overview should show an update-needed state before any trust claim is upgraded.
