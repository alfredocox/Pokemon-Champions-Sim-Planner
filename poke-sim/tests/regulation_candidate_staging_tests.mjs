import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonical, sha256, verifyCandidate, makeCandidate } from '../tools/regulation-watch-core.mjs';
import { MAX_PAYLOAD_BYTES, TABLE, parseArgs, prepareCandidate, stageCandidate } from '../tools/stage-regulation-candidate.mjs';

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
const envelope = {
  schema_version: 'regulation-review-envelope-v1', source_policy_sha256: 'a'.repeat(64), parser_version: '1',
  change_occurrence: 1,
  review_status: 'needs_review', competitive_use: false,
  source: { url: 'https://champions.pokemon.com/en-us/news/rules/', final_url: 'https://champions.pokemon.com/en-us/news/rules/',
    raw_sha256: 'b'.repeat(64), semantic_sha256: 'c'.repeat(64), kind: 'official_article', title: 'Regulation notice',
    mentions: { regulations: ['M-B'], dates: [], entities: [], rule_topics: [] }, paragraph_hashes: [] },
  previous: null, changed_fields: ['initial_observation'],
  impact: { scope: 'bundled_teams_only', potential_team_ids: [], unassessed: 'Imported/private teams require separate legality review' },
  uncertainty: ['Effective dates and eligibility require human review.']
};
envelope.change_key = sha256(canonical({ policy: envelope.source_policy_sha256, url: envelope.source.url,
  before: null, after: envelope.source.semantic_sha256, final_url: envelope.source.final_url }));
function wrap(value) { return { schema_version: 'regulation-review-candidate-v1', candidate_sha256: sha256(canonical(value)), envelope: value }; }
const candidate = wrap(envelope);
const digest = candidate.candidate_sha256;
const env = { SUPABASE_URL: 'https://staging-fixture.supabase.co', SUPABASE_REGULATION_STAGING_KEY: 'test-secret-never-used-on-network',
  REGULATION_STAGING_PROVISIONING_VERIFIED: 'true' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
function mockStore({ duplicate = false, mutate = row => row } = {}) {
  const calls = [];
  let row = prepareCandidate(candidate, digest);
  return { calls, fetcher: async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'POST') {
      if (duplicate) return json({ code: '23505' }, 409);
      row = JSON.parse(options.body);
      return new Response(null, { status: 201 });
    }
    assert.equal(options.method, 'GET');
    return json([mutate(row)]);
  } };
}

await test('Core verifier and canonical wire payload agree exactly', () => {
  assert.deepEqual(verifyCandidate(candidate, digest), envelope);
  const row = prepareCandidate(candidate, digest);
  assert.equal(row.canonical_payload, canonical(envelope));
  assert.equal(sha256(row.canonical_payload), digest);
  assert.deepEqual(Object.keys(row).sort(), ['candidate_sha256', 'canonical_payload', 'competitive_use', 'review_status', 'schema_version']);
});
await test('Default dry run needs neither credentials nor network', async () => {
  const result = await stageCandidate(candidate, digest, { env: {}, fetcher: () => assert.fail('network forbidden') });
  assert.equal(result.mode, 'dry_run');
  assert.equal(result.competitive_use, false);
});
await test('Missing, malformed, uppercase and wrong expected digests fail before network', async () => {
  for (const expected of [undefined, '', 'abc', digest.toUpperCase(), '0'.repeat(64)]) {
    await assert.rejects(stageCandidate(candidate, expected, { write: true, env, fetcher: () => assert.fail('network forbidden') }));
  }
});
await test('Mutated envelope and wrapper identity fail before network', async () => {
  for (const bad of [{ ...candidate, envelope: { ...envelope, parser_version: '2' } }, { ...candidate, schema_version: 'other' }, { ...candidate, candidate_sha256: 'd'.repeat(64) }]) {
    await assert.rejects(stageCandidate(bad, digest, { write: true, env, fetcher: () => assert.fail('network forbidden') }));
  }
});
await test('Even correctly rehashed approved or competitive envelopes are rejected', async () => {
  for (const change of [{ review_status: 'approved' }, { competitive_use: true }, { competitive_use: 'false' }, { schema_version: 'other' }]) {
    const bad = wrap({ ...envelope, ...change });
    await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }));
  }
});
await test('Unapproved source hosts cannot be staged with a valid hash', async () => {
  const bad = wrap({ ...envelope, source: { ...envelope.source, final_url: 'https://unapproved.invalid/rules' } });
  await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }));
});
await test('Payload size is bounded in UTF-8 bytes before network', async () => {
  const bad = wrap({ ...envelope, uncertainty: ['x'.repeat(MAX_PAYLOAD_BYTES)] });
  await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /1 MiB/);
});
await test('Canonical Unicode payload uses the same bytes on insert and readback', async () => {
  const unicode = wrap({ ...envelope, source: { ...envelope.source, title: 'Pok\u00e9mon \u65e5\u672c' } });
  let stored;
  const result = await stageCandidate(unicode, unicode.candidate_sha256, { write: true, env, fetcher: async (_, options) => {
    if (options.method === 'POST') { stored = JSON.parse(options.body); return new Response(null, { status: 201 }); }
    return json([stored]);
  } });
  assert.equal(result.readback_verified, true);
  assert.equal(stored.canonical_payload, canonical(unicode.envelope));
});
await test('Insert uses only candidate table, no upsert, and reads exact digest', async () => {
  const store = mockStore();
  const result = await stageCandidate(candidate, digest, { write: true, env, fetcher: store.fetcher });
  assert.equal(result.mode, 'staged');
  assert.equal(result.duplicate, false);
  assert.equal(result.readback_verified, true);
  assert.equal(store.calls.length, 2);
  for (const call of store.calls) {
    assert.equal(new URL(call.url).pathname, '/rest/v1/' + TABLE);
    assert.equal(call.redirect, 'error');
    assert.ok(call.signal instanceof AbortSignal);
  }
  assert.equal(store.calls[0].headers.Prefer, 'return=minimal');
  assert.equal(new URL(store.calls[0].url).search, '');
  assert.equal(new URL(store.calls[1].url).searchParams.get('candidate_sha256'), 'eq.' + digest);
  assert.equal(new URL(store.calls[1].url).searchParams.get('limit'), '2');
  assert.ok(!JSON.stringify(result).includes(env.SUPABASE_REGULATION_STAGING_KEY));
});
await test('Duplicate digest is idempotent only after byte-exact readback', async () => {
  const store = mockStore({ duplicate: true });
  const result = await stageCandidate(candidate, digest, { write: true, env, fetcher: store.fetcher });
  assert.equal(result.duplicate, true);
  assert.deepEqual(store.calls.map(call => call.method), ['POST', 'GET']);
});
await test('Same semantic JSON with different stored bytes is not accepted', async () => {
  const store = mockStore({ duplicate: true, mutate: row => ({ ...row, canonical_payload: JSON.stringify(envelope, null, 2) }) });
  await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: store.fetcher }), /readback mismatch/);
});
await test('Changed readback digest, schema, policy or payload is rejected', async () => {
  for (const change of [{ candidate_sha256: 'e'.repeat(64) }, { schema_version: 'other' }, { review_status: 'approved' }, { competitive_use: true }, { canonical_payload: '{}' }]) {
    const store = mockStore({ mutate: row => ({ ...row, ...change }) });
    await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: store.fetcher }), /readback mismatch/);
  }
});
await test('Empty, multiple, null and malformed readback rows are unverified', async () => {
  for (const rows of [[], [{}, {}], null, [null], {}]) {
    await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async (_, options) => options.method === 'POST' ? new Response(null, { status: 201 }) : json(rows) }), /readback mismatch/);
  }
});
await test('Non-unique conflict does not get idempotent success or a read', async () => {
  let calls = 0;
  await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async () => { calls++; return json({ code: '23514' }, 409); } }), /insert conflict/);
  assert.equal(calls, 1);
});
await test('HTTP failure and redirect do not leak server error bodies', async () => {
  for (const status of [301, 401, 403, 500]) {
    await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async () => json({ secret: env.SUPABASE_REGULATION_STAGING_KEY }, status) }), error => /insert failed/.test(error.message) && !error.message.includes('test-secret'));
  }
});
await test('Transport error is sanitized and reports uncertain outcome', async () => {
  await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async () => { throw Error(env.SUPABASE_REGULATION_STAGING_KEY); } }), error => /outcome may be unknown/.test(error.message) && !error.message.includes('test-secret'));
});
await test('Readback failure never reports insertion as verified success', async () => {
  await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async (_, options) => options.method === 'POST' ? new Response(null, { status: 201 }) : new Response(null, { status: 403 }) }), /readback failed/);
});
await test('Malformed and oversized response bodies fail closed', async () => {
  for (const body of ['not-json', 'x'.repeat(MAX_PAYLOAD_BYTES * 8 + 1)]) {
    await assert.rejects(stageCandidate(candidate, digest, { write: true, env, fetcher: async (_, options) => options.method === 'POST' ? new Response(null, { status: 201 }) : new Response(body) }), /Invalid or oversized/);
  }
});
await test('Project URL cannot redirect credentials through URL components', async () => {
  for (const url of ['http://staging-fixture.supabase.co', 'https://user:password@example.test', 'https://example.test/path', 'https://example.test/?q=x', 'https://example.test/#x', 'https://example.test:444', 'bad']) {
    await assert.rejects(stageCandidate(candidate, digest, { write: true, env: { ...env, SUPABASE_URL: url }, fetcher: () => assert.fail('network forbidden') }), /HTTPS project origin/);
  }
});
await test('Writing without a credential fails before network', async () => {
  await assert.rejects(stageCandidate(candidate, digest, { write: true, env: { SUPABASE_URL: env.SUPABASE_URL, REGULATION_STAGING_PROVISIONING_VERIFIED: 'true' }, fetcher: () => assert.fail('network forbidden') }), /credential/);
});
await test('Legacy service key fallback is explicit and never returned', async () => {
  const store = mockStore();
  const result = await stageCandidate(candidate, digest, { write: true, env: { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: 'legacy-test-secret', REGULATION_STAGING_PROVISIONING_VERIFIED: 'true' }, fetcher: store.fetcher });
  assert.equal(store.calls[0].headers.apikey, 'legacy-test-secret');
  assert.ok(!JSON.stringify(result).includes('legacy-test-secret'));
});
await test('CLI defaults dry-run and requires explicit path and digest', () => {
  assert.equal(parseArgs(['--candidate', 'candidate.json', '--expected-sha256', digest]).write, false);
  assert.equal(parseArgs(['--write', '--candidate', 'candidate.json', '--expected-sha256', digest]).write, true);
  for (const args of [[], ['--write'], ['--candidate', '--write'], ['--candidate', 'x'], ['--expected-sha256', digest], ['--upsert'], ['--write', '--write']]) assert.throws(() => parseArgs(args));
});
await test('CLI help documents credential isolation gate without accessing DB', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/stage-regulation-candidate.mjs', import.meta.url)), '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /least-privilege/);
  assert.match(result.stdout, /bypass RLS/);
  assert.match(result.stdout, /REGULATION_STAGING_PROVISIONING_VERIFIED=true/);
});

await test('Neither staging nor service-role credentials alone activate writes', async () => {
  for (const credential of ['SUPABASE_REGULATION_STAGING_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    for (const gate of [undefined, 'false', true, 'TRUE']) {
      await assert.rejects(stageCandidate(candidate, digest, { write: true,
        env: { SUPABASE_URL: env.SUPABASE_URL, [credential]: 'test', REGULATION_STAGING_PROVISIONING_VERIFIED: gate },
        fetcher: () => assert.fail('network forbidden') }), /prior least-privilege provisioning/);
    }
  }
});
await test('Missing envelope fields fail even with a matching candidate digest', async () => {
  for (const field of ['change_key', 'change_occurrence', 'source_policy_sha256', 'parser_version', 'previous', 'changed_fields', 'impact', 'uncertainty']) {
    const value = structuredClone(envelope);
    delete value[field];
    const bad = wrap(value);
    await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /structure/);
  }
});
await test('Unknown envelope fields cannot smuggle approval metadata', async () => {
  const bad = wrap({ ...envelope, approved: true });
  await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /structure/);
});
await test('Malformed hashes, lists, policy and bundled impact are rejected', async () => {
  const changes = [
    { source_policy_sha256: 'bad' }, { change_key: 'a'.repeat(64) }, { parser_version: '2' },
    { source: { ...envelope.source, raw_sha256: null } },
    { source: { ...envelope.source, paragraph_hashes: ['not-a-hash'] } },
    { source: { ...envelope.source, mentions: { ...envelope.source.mentions, dates: 'today' } } },
    { source: { ...envelope.source, discovery: ['https://unapproved.invalid/'] } },
    { changed_fields: [] }, { changed_fields: ['approved'] }, { uncertainty: [] },
    { impact: { ...envelope.impact, scope: 'all_teams' } },
    { impact: { ...envelope.impact, potential_team_ids: [123] } }
  ];
  for (const change of changes) {
    const bad = wrap({ ...envelope, ...change });
    await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /structure/);
  }
});
await test('Previous snapshots must be structurally valid and from the same official source', async () => {
  for (const previous of [{}, { ...envelope.source, url: 'https://unapproved.invalid/' }, { ...envelope.source, url: 'https://champions.pokemon.com/different' }]) {
    const bad = wrap({ ...envelope, previous });
    await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /structure/);
  }
});
await test('Actual core candidates with full snapshots and prior history remain compatible', () => {
  const before = { ...envelope.source, potential_team_ids: [], discovery: [], manual_pdf_review: false };
  const current = { ...before, semantic_sha256: 'd'.repeat(64), raw_sha256: 'e'.repeat(64) };
  for (const previous of [null, before]) {
    const real = makeCandidate(current, previous, envelope.source_policy_sha256);
    assert.equal(prepareCandidate(real, real.candidate_sha256).canonical_payload, canonical(real.envelope));
  }
});
await test('Occurrence is a required positive safe integer, never coerced or defaulted by staging', async () => {
  for (const change_occurrence of [0, -1, 1.5, '2', null, true, Number.MAX_SAFE_INTEGER + 1]) {
    const bad = wrap({ ...envelope, change_occurrence });
    await assert.rejects(stageCandidate(bad, bad.candidate_sha256, { write: true, env, fetcher: () => assert.fail('network forbidden') }), /structure/);
  }
});
await test('Occurrence changes the exact digest but not the semantic transition key', () => {
  const recurring = wrap({ ...envelope, change_occurrence: 2 });
  assert.notEqual(recurring.candidate_sha256, digest);
  assert.equal(recurring.envelope.change_key, candidate.envelope.change_key);
  assert.equal(prepareCandidate(recurring, recurring.candidate_sha256).canonical_payload, canonical(recurring.envelope));
  assert.throws(() => prepareCandidate(recurring, digest), /fingerprint|digest/);
});
await test('Recurring core transitions stage separately while same-occurrence retries deduplicate', async () => {
  const previous = { ...envelope.source, potential_team_ids: [], discovery: [], manual_pdf_review: false };
  const current = { ...previous, semantic_sha256: 'd'.repeat(64), raw_sha256: 'e'.repeat(64) };
  const first = makeCandidate(current, previous, envelope.source_policy_sha256, 1);
  const second = makeCandidate(current, previous, envelope.source_policy_sha256, 2);
  assert.equal(first.envelope.change_key, second.envelope.change_key);
  assert.notEqual(first.candidate_sha256, second.candidate_sha256);
  assert.equal(makeCandidate(current, previous, envelope.source_policy_sha256, 2).candidate_sha256, second.candidate_sha256);
  const rows = new Map();
  const fetcher = async (url, options) => {
    assert.equal(new URL(url).pathname, '/rest/v1/' + TABLE);
    if (options.method === 'POST') {
      const row = JSON.parse(options.body);
      if (rows.has(row.candidate_sha256)) return json({ code: '23505' }, 409);
      rows.set(row.candidate_sha256, row);
      return new Response(null, { status: 201 });
    }
    assert.equal(options.method, 'GET');
    const sha = new URL(url).searchParams.get('candidate_sha256').slice(3);
    return json(rows.has(sha) ? [rows.get(sha)] : []);
  };
  for (const item of [first, second]) {
    assert.equal((await stageCandidate(item, item.candidate_sha256, { write: true, env, fetcher })).duplicate, false);
    assert.equal((await stageCandidate(item, item.candidate_sha256, { write: true, env, fetcher })).duplicate, true);
  }
  assert.equal(rows.size, 2);
  assert.equal(rows.get(first.candidate_sha256).canonical_payload, canonical(first.envelope));
});
await test('Policy re-extraction accepts extraction_policy with the previous snapshot retained', () => {
  const source = { ...envelope.source, potential_team_ids: [], discovery: [], manual_pdf_review: false };
  const item = makeCandidate(source, structuredClone(source), 'f'.repeat(64), 1);
  assert.deepEqual(item.envelope.changed_fields, ['extraction_policy']);
  assert.deepEqual(item.envelope.previous, source);
  assert.equal(prepareCandidate(item, item.candidate_sha256).canonical_payload, canonical(item.envelope));
});
await test('Protected staging workflow passes provisioning variable rather than hard-coding success', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/regulation-stage.yml', import.meta.url), 'utf8');
  assert.match(workflow, /REGULATION_STAGING_PROVISIONING_VERIFIED:\s*\$\{\{\s*vars\.REGULATION_STAGING_PROVISIONING_VERIFIED\s*\}\}/);
  assert.match(workflow, /SUPABASE_REGULATION_STAGING_KEY:\s*\$\{\{\s*secrets\.SUPABASE_REGULATION_STAGING_KEY\s*\}\}/);
});

const migrations = new URL('../db/migrations/', import.meta.url);
const matching = fs.readdirSync(migrations).filter(name => /^\d{14}_regulation_review_candidates\.sql$/.test(name));
assert.equal(matching.length, 1, 'one CLI-timestamped additive migration');
const sql = fs.readFileSync(new URL(matching[0], migrations), 'utf8');
await test('Migration hashes exact UTF-8 text using built-in SHA-256, no extension', () => {
  assert.match(sql, /candidate_sha256 = encode\(sha256\(convert_to\(canonical_payload, 'UTF8'\)\), 'hex'\)/);
  assert.doesNotMatch(sql, /CREATE\s+EXTENSION/i);
  assert.match(sql, /octet_length\(canonical_payload\) BETWEEN 2 AND 1048576/);
});
await test('Migration fixes unapproved state in columns and JSON with NULL-safe check', () => {
  assert.match(sql, /CHECK \(review_status = 'needs_review'\)/);
  assert.match(sql, /CHECK \(competitive_use = false\)/);
  assert.match(sql, /-> 'competitive_use' = 'false'::jsonb/);
  assert.match(sql, /\) IS TRUE\)/);
});
await test('Migration explicitly denies public clients and enables RLS', () => {
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.regulation_review_candidates FROM PUBLIC, anon, authenticated, service_role/);
  assert.doesNotMatch(sql, /CREATE\s+POLICY|CREATE\s+(?:OR\s+REPLACE\s+)?VIEW/i);
});
await test('Migration bounds service role to insert/read here and blocks all mutation', () => {
  assert.match(sql, /GRANT SELECT ON TABLE public\.regulation_review_candidates TO service_role/);
  assert.match(sql, /GRANT INSERT \(candidate_sha256, schema_version, canonical_payload, review_status, competitive_use\)/);
  assert.match(sql, /BEFORE UPDATE OR DELETE/);
  assert.match(sql, /BEFORE TRUNCATE/);
  assert.match(sql, /SECURITY INVOKER SET search_path = pg_catalog/);
  assert.doesNotMatch(sql, /CREATE\s+ROLE|SECURITY DEFINER|GRANT\s+(?:UPDATE|DELETE|TRUNCATE)/i);
});
await test('No migration statement targets approved rules, existing tables or runtime', () => {
  assert.doesNotMatch(sql, /(?:INSERT\s+INTO|UPDATE|ALTER\s+TABLE|DROP\s+TABLE)\s+(?:public\.)?(?:ruleset_packages|rule_facts|rulesets|champions_overrides)\b/i);
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
});
console.log(`Regulation candidate staging: ${passed} offline checks passed. HTTP is mocked; SQL checks are static, not executed database/RLS proof.`);
