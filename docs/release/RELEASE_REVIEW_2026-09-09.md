# Release Review - September 9, 2026

Decision: do not merge the entire candidate yet. This is a release review, not
competitive accuracy certification. No production mutation or deployment occurred.

## Identity And Delivery

- Reviewed starting revision: c5e5a72753835ff2bec477066371216bebd45660,
  PR #195, runtime v2.2.161-member-edit-identity, engine 1.1.10.
- Starting revision hosted CI passed; Supabase Preview was skipped.
- Public artifact readback still identifies v2.2.142-pp-replay-proof,
  bundle digest 66f3fcb60f6034576f1ff9862778af7d91548f9d29394071cc2cb3a4dbeaa7fd.
  This readback is not a new browser battle audit.
- Local and origin candidate were identical before this patch. Alfredo is not
  updated by this review; no force-copy or cross-repo parity claim.

## Bounded Release Fix

The HTML checksum did not cover its required external move-pool file. Generated
release metadata now records exact SHA-256 and byte counts for that file and both
retro-opening sprites. The bundle freshness check verifies those bytes; Pages
also checks the actual staged directory before upload. Runtime HTML and build ID
are unchanged because this patch changes release verification, not battle logic.

Regression: the new asset-identity test failed before regeneration. All ten
release-manifest groups then passed, including changed same-length bytes, missing
files, missing digests and altered metadata for all three assets. This covers the
named assets, not every external runtime resource. The verifier is not a
cryptographic signature and cannot replace review of the source revision.

Independent reviewer Banach caught checkout line-ending drift in the initial
patch. The pool is now pinned to LF in `.gitattributes`; an eleventh test uses
Git checkout filters with autocrlf true, false and input, checking identical bytes.
All eleven focused groups pass. The initial ten-group result alone missed this
cross-platform case. Local Bash execution was unavailable through the installed
WSL/Python3 aliases; hosted Linux CI must verify that command path.

Full local `npm test` passed, including 12 offline/mock DB files and four
manual/helper skips. Administrative checks skipped by that runner are not passes;
the separate metadata readback below has its own narrower scope. No new browser
simulation was run because runtime bytes did not change.

## Database Readback

Authorized metadata-only reads confirm only the default main branch and four
April migrations. All inspected public base tables have RLS enabled. Team-table
anonymous policies are SELECT-only; broad grants alone do not establish a write
bypass. Shared evidence protections still require the previously documented
hardening work. No private records were read and no test writes were performed.
Protected staging and two-user isolation are still unverified. Disabling cloud
saving in a webpage would not repair existing database permissions.

## Remaining Release Work

1. Triage all unresolved PR threads against current code and regression evidence;
   do not bulk-resolve historical comments merely because CI is green.
2. Validate and fix Toxic rounding, Spite hit resolution, suppressed-item behavior
   and Wish/Leftovers ordering against the pinned reference. Current code still
   contains the Toxic rounding and direct Covert Cloak predicates flagged in review.
3. Complete external-package failure UX and packaging checks. The app is not a
   standalone HTML download; required assets must travel with it.
4. Review/apply containment in an explicitly authorized isolated environment;
   prove anonymous denial and owner isolation before production approval.
5. Obtain final review of the exact candidate; update Josh's manual checklist to
   that revision, not the stale v145 checklist.
6. Merge only after applicable gates pass, watch Pages, compare deployed artifact
   and asset hashes, then run paired visible/export browser battles and verify
   the homepage animation. Record the receipt before calling changes delivered.

Regulation approval, full-game parity and a 99% accuracy claim remain separate
unmet gates. This report does not authorize production migrations or rule promotion.
