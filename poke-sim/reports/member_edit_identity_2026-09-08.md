# Member Edit Identity

Candidate: v2.2.161-member-edit-identity, engine 1.1.10 unchanged.
Local and hosted candidate proof; no deployment.

Hosted readback September 9 UTC: code commit `e3705db` passed CI run
`34294165076`, including the test suite and declared battle audit. Bundle run
`34294164893` and cache run `34294164923` also passed. Supabase Preview was skipped,
not a live database pass.

## Fixed Scope

Unchanged paste edits replaced parsed member objects and lost durable IDs and
annotations. Individual-set species replacements had the opposite risk: retaining
the old ID and species alias. Normalization also discarded unknown annotations.

Both save paths now reconcile exact, unambiguous species/form identities, retain
same-member IDs through reordering and set changes, and allocate fresh IDs for
replacements. Duplicate existing IDs, conflicting identity fields and ambiguous
matches block the save without persistence. IDs are not transferred by position.
Normalization retains annotations and does not allocate identities while rendering.
The existing SV paste preview uses its stored format, matching save validation;
normalized Tera aliases survive export/edit. This is not full SV rules support.

## Verification

- The first eight regressions failed against committed v160 in memory and passed
  after the fix. Final twelve groups include actual paste and individual save
  handlers, role clearing, replacements, ambiguity, collisions, normalization and
  Tera retention. Mocked persistence verifies save/no-save behavior without DB writes.
- Full project gate: 180 fast files and 12 offline/mock DB files pass; four
  manual/helper skips. Final focused identity rerun also passes.
- Declared battle audit passes its 4,500-game invariant matrix and three unchanged
  golden traces. These are scoped regression checks, not an accuracy percentage.
- Browser artifact `artifacts/browser-replay-7T6Erv`: actual JSON file upload,
  paste reorder/save and page reload preserve IDs and annotations. Subsequent
  engine participant exports retain four registered IDs and their original items.
  Two games and three visible/actual-download pairs compare 32 turn rows with
  zero mismatches and page errors, including historical continuity after a swap.
- Reusable browser command: `AUDIT_MEMBER_EDIT=1 node tools/audit-browser-replay.mjs`
  with an explicit local candidate URL. The normal audit remains available.
- A read-only reviewer supplied the identity contract and identified the sibling
  single-editor issue. Independent final review could not finish because agent
  usage limits were reached. Parent reviewed the final diff and executed the
  additional failure tests; this limitation is not called independent approval.

## Remaining Gates

Final rebuilt artifact is 11,493,759 bytes, SHA-256
`cc2e5f76f8219b25a561ce0f4d26bdf3fe1faea3209fb21db6ad64e7b9aa125b`.
Manifest identity/freshness checks pass after rebuilding the roadmap.

- Broaden JSON restore-versus-new-copy identity policy and older storage formats.
- SV IV text parsing/export remains incomplete; do not claim lossless arbitrary
  Showdown-set roundtrips. Full preloaded override reload and every alias/form
  transition are not established by the custom-team browser fixture.
- Retained annotations are historical data, not renewed source verification.
  Current move/regulation checks still govern admission. Complete-set legality,
  official Champions confirmation and full-battle parity remain separate.
- No Supabase migration, live persistence proof, merge, Pages deployment,
  regulation promotion or 99% game-accuracy claim.

Lesson: team identity, registered member identity and battle-local slot identity
are different contracts. Editing a set is not replacing its registered Pokemon.
