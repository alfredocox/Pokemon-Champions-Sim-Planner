# Engineering Lane Matrix

| Lane | Owns | Primary proof | Specialist capabilities | Independent check |
|---|---|---|---|---|
| Mechanics | Turn order, priority, speed, damage, status, terrain, weather, switching, fainting | Focused regression plus Showdown oracle or approved Champion evidence | Mechanics reviewer, data validation | Mechanics reviewer who did not author the change |
| Source data | Showdown mirrors, Champion overrides, legality, regulation packages, generated runtime data | Version/hash drift report, mapping tests, regenerated artifact | Data quality, source-data engineer | Data approver for Champion deltas |
| Database | Supabase schema, migrations, RLS, grants, mappings, durable evidence | Migration tests, mock contract, security review; live readback only when authorized | Supabase, Postgres, security | Security reviewer and human production operator |
| Evidence/Brain | EvidenceBundle, replay facts, composer, validator, feedback, benchmarks | Fixture with evidence IDs, confidence/uncertainty checks, validator regression | Data validation, replay/evidence engineer | Reviewer confirms the Brain does not invent mechanics |
| Release | CI, bundle, cache, manifest, Pages, repo alignment | Cross-platform gate, generated bundle hash, deployed artifact check | Release engineer, browser control | Release manager |
| Experience | Simulator workflow, Review tab, accessibility, responsive behavior | Focused UI tests plus desktop/mobile browser inspection | Experience engineer, browser control | QA reviewer |
| Product/audit | Roadmap, milestones, issue priority, success measures, docs | Source-backed status, explicit open/closed criteria, one next task | Product/QA coordinator, analytics validation | Owner/reviewer of affected lane |

## Minimum Commands

Run from `poke-sim/`:

```text
npm run test:fast     shared offline regression gate
npm run test:db       Supabase mock/contract gate
npm test              complete offline merge-candidate gate
npm run test:source-truth
```

Use `npm run test:db:live` only against an explicitly approved test environment. A passing mock suite is not live Supabase proof.

For browser-facing source changes, rebuild through `tools/build-bundle.py`, then run release-manifest and Overview-tab checks. Verify GitHub Pages separately before claiming deployment.
