# Spec Documents Index

> All engineering specifications for Pokémon Champion 2026.
> For the full milestone map and sprint plan see [`/ROADMAP.md`](../../ROADMAP.md).

---

## ⚠️ File Location Notice

Spec files currently live in two places during a cleanup migration:
- **Here (`poke-sim/docs/`)** ← canonical destination for all specs
- **`poke-sim/` root** ← legacy location, being cleaned up

When the migration is complete, `poke-sim/*.md` spec files will be deleted from root and only exist here.

---

## Spec Files

| File | Phase | Issues | Status |
|---|---|---|---|
| [../../docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md](../../docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md) | Direction/Gate | TBD | Active direction |
| [../../docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md](../../docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md) | Release/Gate | TBD | Active direction |
| [`CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md`](CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md) | Sim Truth / QA Evidence | TBD | Active map |
| [`DATA_SOURCE_REGISTRY.md`](DATA_SOURCE_REGISTRY.md) | Sim Truth / Source Registry | TBD | Active source challenge page |
| [`REG_M_B_SOURCE_CONVERSION_TABLE.md`](REG_M_B_SOURCE_CONVERSION_TABLE.md) | Sim Truth / Reg M-B Conversion | TBD | Active conversion ledger |
| [`SOURCE_TRUTH_DOCUMENT_AUDIT_2026-06-26.md`](SOURCE_TRUTH_DOCUMENT_AUDIT_2026-06-26.md) | Sim Truth / Docs Audit | TBD | Active source-truth audit |
| [`SHOWDOWN_ORACLE_SIM_TRUTH_PLAN.md`](SHOWDOWN_ORACLE_SIM_TRUTH_PLAN.md) | Sim Truth / Oracle | TBD | Active execution plan |
| [`SHOWDOWN_SYNC_ARCHITECTURE.md`](SHOWDOWN_SYNC_ARCHITECTURE.md) | Data/DB/Oracle | TBD | Draft architecture |
| [`SHOWDOWN_DB_SOURCE_OF_TRUTH_PLAN.md`](SHOWDOWN_DB_SOURCE_OF_TRUTH_PLAN.md) | Data/DB/Oracle | TBD | Implementation plan |
| [`SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md`](SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md) | Runtime/Data Boundary | TBD | Active guardrail |
| [`POKEMON_DATA_AUDIT_REVIEW.md`](POKEMON_DATA_AUDIT_REVIEW.md) | Data Audit | #117, #123 | Review control |
| [`PHASE4_DYNAMIC_ADVICE_SPEC.md`](../PHASE4_DYNAMIC_ADVICE_SPEC.md) | 4 — Dynamic Advice | #141, #144 | ✅ Final |
| [`PHASE4C_DETECTORS_SPEC.md`](../PHASE4C_DETECTORS_SPEC.md) | 4c — Archetype Detectors | #165 | ✅ Final |
| [`PHASE4D_THREAT_RESPONSE_SPEC.md`](../PHASE4D_THREAT_RESPONSE_SPEC.md) | 4d — Threat Response | #166 | ✅ Final |
| [`PHASE4E_POLICY_AUDIT_SPEC.md`](../PHASE4E_POLICY_AUDIT_SPEC.md) | 4e — Policy Audit | #167 | ✅ Final |
| [`PHASE5_TURN_LOG_SPEC_DRAFT.md`](../PHASE5_TURN_LOG_SPEC_DRAFT.md) | 5 — Turn Log | #168 | 📝 Draft — not final |
| [`PHASE6_COACHING_VOICE_SPEC.md`](../PHASE6_COACHING_VOICE_SPEC.md) | 6 — Coaching Voice | #169 | ✅ Final |
| [`SHOWDOWN_REPLAY_COACH_SPEC.md`](./SHOWDOWN_REPLAY_COACH_SPEC.md) | Stage 3 — Battle Sensei | #187 | 🧪 R1/R2 MVP started |
| [`BATTLE_IQ_SPEC.md`](./BATTLE_IQ_SPEC.md) | Stage 3 — Battle Sensei scoring | #187 | 🧪 R1 shipped |
| [`META_STRESS_LAB_SPEC.md`](./META_STRESS_LAB_SPEC.md) | M13 — Meta Stress Lab | #202 | 📝 Planned |
| [`PHASE_ROLLOUT_REVIEW.md`](../PHASE_ROLLOUT_REVIEW.md) | All phases | #170 | 📋 Review doc |
| [`COACHING_NORTH_STAR.md`](../COACHING_NORTH_STAR.md) | All phases | — | ⭐ Reference — do not delete |

---

## Pending Cleanup Tasks

- [ ] Move all `poke-sim/PHASE*.md` files into `poke-sim/docs/`
- [ ] Review and consolidate `poke-sim/MASTER_PROMPT.md` with root `MASTER_PROMPT.md`; they are not byte-identical, so do not delete without a content merge decision.
- [ ] Update all `..` relative links after move
- [ ] Close informational issue #164 (snapshot archived — work is done)

---

*Last updated: 2026-06-27*
