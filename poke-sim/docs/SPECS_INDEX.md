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
| [`SHOWDOWN_SYNC_ARCHITECTURE.md`](SHOWDOWN_SYNC_ARCHITECTURE.md) | Data/DB/Oracle | TBD | Draft architecture |
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
- [ ] Delete `poke-sim/MASTER_PROMPT.md` — duplicate of root `MASTER_PROMPT.md`
- [ ] Update all `..` relative links after move
- [ ] Close informational issue #164 (snapshot archived — work is done)

---

*Last updated: 2026-05-16*
