-- Private immutable discovery evidence, never an approved ruleset package.
-- Prepared only: applying this migration requires separate environment approval.
-- No new role, extension, approval endpoint, public view, or promotion is added.
-- Activation gate: verify live grants/RLS with the intended staging identity.
-- service_role bypasses RLS and may have broad privileges on OTHER tables;
-- limiting this table and CLI is not least-privilege credential isolation.
BEGIN;

CREATE TABLE public.regulation_review_candidates (
  candidate_sha256 text PRIMARY KEY CHECK (candidate_sha256 ~ '^[a-f0-9]{64}$'),
  schema_version text NOT NULL DEFAULT 'regulation-review-candidate-v1'
    CHECK (schema_version = 'regulation-review-candidate-v1'),
  canonical_payload text NOT NULL CHECK (octet_length(canonical_payload) BETWEEN 2 AND 1048576),
  review_status text NOT NULL DEFAULT 'needs_review' CHECK (review_status = 'needs_review'),
  competitive_use boolean NOT NULL DEFAULT false CHECK (competitive_use = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regulation_candidate_digest CHECK (
    candidate_sha256 = encode(sha256(convert_to(canonical_payload, 'UTF8')), 'hex')
  ),
  -- IS TRUE prevents SQL NULL from accepting absent JSON keys.
  CONSTRAINT regulation_candidate_envelope CHECK ((
    jsonb_typeof(canonical_payload::jsonb) = 'object'
    AND canonical_payload::jsonb ->> 'schema_version' = 'regulation-review-envelope-v1'
    AND canonical_payload::jsonb ->> 'review_status' = 'needs_review'
    AND canonical_payload::jsonb -> 'competitive_use' = 'false'::jsonb
  ) IS TRUE)
);

ALTER TABLE public.regulation_review_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.regulation_review_candidates FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.regulation_review_candidates TO service_role;
GRANT INSERT (candidate_sha256, schema_version, canonical_payload, review_status, competitive_use)
  ON TABLE public.regulation_review_candidates TO service_role;
-- No client policies: discovery evidence stays private, including SELECT.

CREATE FUNCTION public.reject_regulation_candidate_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Regulation review candidates are immutable; insert a new digest'
    USING ERRCODE = '55000';
END;
$$;
REVOKE ALL ON FUNCTION public.reject_regulation_candidate_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER regulation_candidates_no_mutation
  BEFORE UPDATE OR DELETE ON public.regulation_review_candidates
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_regulation_candidate_mutation();
CREATE TRIGGER regulation_candidates_no_truncate
  BEFORE TRUNCATE ON public.regulation_review_candidates
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_regulation_candidate_mutation();

COMMENT ON TABLE public.regulation_review_candidates IS
  'Private append-only unapproved discovery evidence. Exact canonical UTF-8 envelope bytes are hashed. Approval decisions and package promotion are separate workflows, not updates to this table.';
COMMENT ON COLUMN public.regulation_review_candidates.canonical_payload IS
  'Versioned sorted-key JSON from regulation-watch-core canonical(). Database checks the exact text digest and fixed unapproved envelope policy; the staging CLI additionally verifies canonical serialization and full candidate validity.';

COMMIT;
