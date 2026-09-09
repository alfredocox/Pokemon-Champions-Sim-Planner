import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { canonical, sha256, fetchOfficial, snapshot, observe, makeCandidate, verifyCandidate, reviewBody } from '../tools/regulation-watch-core.mjs';
import { publishAlerts } from '../tools/report-regulation-changes.mjs';
import { validateEvidenceRun } from '../tools/regulation-artifact-policy.mjs';
import { evidencePublicKey, sealSource, openSource } from '../tools/regulation-evidence.mjs';

const url = 'https://champions.pokemon.com/en-us/gameplay/';
const source = { url, kind: 'official_gameplay', required: true };
const registry = { public_sources: [source] };
const teams = { alpha: { members: [{ name: 'Pikachu', item: 'Light Ball', ability: 'Static', moves: ['Protect'] }] }, beta: { members: [{ name: 'Incineroar' }] } };
const page = (text = 'Regulation Set M-B begins August 5, 2026. Pikachu and Light Ball are discussed. Double Battles rules require review.') => `<html><title>Champions</title><body><nav>Changing navigation</nav><main><h1>Champions rules</h1><p>${text}</p></main><footer>footer</footer></body></html>`;
const response = text => ({ bytes: Buffer.from(text), final_url: url, content_type: 'text/html' });
const fetcher = async () => new Response(page(), { headers: { 'content-type': 'text/html' } });

test('canonical encoding is key-order independent but binds every value', () => {
  assert.equal(canonical({ b: 2, a: [1, true] }), canonical({ a: [1, true], b: 2 }));
  assert.notEqual(sha256(canonical({ a: 1 })), sha256(canonical({ a: 2 })));
  assert.throws(() => canonical({ a: undefined }));
});
test('extracts mentions and team candidates without asserting eligibility or effective dates', () => {
  const result = snapshot(source, response(page()), teams);
  assert.deepEqual(result.mentions.regulations, ['M-B']);
  assert.deepEqual(result.mentions.dates, ['August 5, 2026']);
  assert.deepEqual(result.potential_team_ids, ['alpha']);
  assert.equal(result.mentions.legal_species, undefined);
  assert.equal(result.mentions.effective_at, undefined);
});
test('navigation changes do not become meaningful rule changes', () => {
  const first = snapshot(source, response(page()), teams);
  const second = snapshot(source, response(page().replace('Changing navigation', 'Different navigation').replace('footer', 'new footer')), teams);
  assert.notEqual(first.raw_sha256, second.raw_sha256);
  assert.equal(first.semantic_sha256, second.semantic_sha256);
});
test('paragraph changes and removals are detected', () => {
  const first = snapshot(source, response(page()), teams);
  const second = snapshot(source, response(page('Regulation Set M-C begins September 1, 2026. Incineroar is discussed. Eligibility is still unverified and requires review.')), teams);
  const candidate = makeCandidate(second, first, 'a'.repeat(64));
  assert.ok(candidate.envelope.changed_fields.includes('mentions'));
  assert.deepEqual(candidate.envelope.impact.potential_team_ids, ['alpha', 'beta']);
  assert.equal(candidate.envelope.competitive_use, false);
  assert.equal(candidate.envelope.review_status, 'needs_review');
});
test('exact digest rejects mutated approval/staging evidence', () => {
  const candidate = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  assert.equal(verifyCandidate(candidate, candidate.candidate_sha256), candidate.envelope);
  assert.throws(() => verifyCandidate(candidate, 'f'.repeat(64)), /fingerprint/);
  candidate.envelope.source.mentions.regulations.push('M-Z');
  assert.throws(() => verifyCandidate(candidate, candidate.candidate_sha256), /fingerprint/);
});
test('valid digest alone cannot permit competitive use', () => {
  const candidate = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  candidate.envelope.competitive_use = true;
  candidate.candidate_sha256 = sha256(canonical(candidate.envelope));
  assert.throws(() => verifyCandidate(candidate, candidate.candidate_sha256), /quarantined/);
});
test('first capture creates candidate, unchanged capture does not', async () => {
  const first = await observe(registry, null, { fetcher, teams });
  const next = await observe(registry, first.state, { fetcher, teams });
  assert.equal(first.candidates.length, 1);
  assert.equal(next.candidates.length, 0);
  assert.equal(next.report.health[0].status, 'unchanged');
});
test('retry time does not change the candidate fingerprint', async () => {
  const first = await observe(registry, null, { fetcher, teams, now: '2026-08-30T00:00:00Z' });
  const next = await observe(registry, null, { fetcher, teams, now: '2026-08-31T00:00:00Z' });
  assert.equal(first.candidates[0].candidate_sha256, next.candidates[0].candidate_sha256);
});
test('required source outage preserves last-known-good, reports unavailable and incomplete', async () => {
  const first = await observe(registry, null, { fetcher, teams });
  const next = await observe(registry, first.state, { fetcher: async () => { throw new Error('timeout'); }, teams });
  assert.equal(next.report.incomplete, true);
  assert.equal(next.report.health[0].status, 'unavailable');
  assert.deepEqual(next.state.sources, first.state.sources);
  assert.equal(next.candidates.length, 0);
});
test('optional source failure is reported without claiming complete success', async () => {
  const result = await observe({ public_sources: [{ ...source, required: false }] }, null, { fetcher: async () => new Response('', { status: 503 }) });
  assert.equal(result.report.incomplete, false);
  assert.equal(result.report.health[0].status, 'unavailable');
});
test('policy/catalog changes force a new review instead of trusting old extraction', async () => {
  const first = await observe(registry, null, { fetcher, teams });
  const next = await observe(registry, first.state, { fetcher, teams: {} });
  assert.equal(next.report.policy_changed, true);
  assert.equal(next.candidates.length, 1);
  assert.notEqual(first.candidates[0].candidate_sha256, next.candidates[0].candidate_sha256);
});
test('catalog changes cannot remove previously discovered unavailable sources', async () => {
  const index = { ...source, kind: 'official_news_index' };
  const a = 'https://www.pokemon.com/us/news/old-required';
  const b = 'https://www.pokemon.com/us/news/new-required';
  const getter = link => async address => address === url ? new Response(page().replace('</main>', `<a href="${link}">Notice</a></main>`), { headers: { 'content-type': 'text/html' } }) : new Response('', { status: 503 });
  const first = await observe({ public_sources: [index] }, null, { fetcher: getter(a), teams });
  const next = await observe({ public_sources: [index] }, first.state, { fetcher: getter(b), teams: {} });
  assert.ok(next.report.health.some(row => row.url === a && row.status === 'unavailable'));
  assert.equal(next.report.incomplete, true);
});
test('catalog change followed by fetch/archive failure retains per-source policy until recovery review', async () => {
  for (const archiveFailure of [false, true]) {
    const first = await observe(registry, null, { fetcher, teams: {} });
    const failed = await observe(registry, first.state, { teams,
      fetcher: archiveFailure ? fetcher : async () => { throw new Error('Fetch unavailable'); },
      captureSource: archiveFailure ? async () => { throw new Error('Archive unavailable'); } : null });
    assert.equal(failed.candidates.length, 0);
    const recovered = await observe(registry, failed.state, { fetcher, teams });
    assert.equal(recovered.candidates.length, 1);
    assert.deepEqual(recovered.candidates[0].envelope.previous.mentions.entities, []);
    assert.ok(recovered.candidates[0].envelope.source.mentions.entities.includes('Pikachu'));
    const repeated = await observe(registry, recovered.state, { fetcher, teams });
    assert.equal(repeated.candidates.length, 0);
  }
});
test('relative rulebook links resolve against the final redirect URL, including approved host changes', async () => {
  for (const final of ['https://champions.pokemon.com/en-us/rules/current/', 'https://www.pokemon.com/us/news/rules/current/']) {
    const html = page().replace('</main>', '<a href="handbook.pdf">Official rulebook</a></main>');
    const addresses = [];
    const result = await observe(registry, null, { fetcher: async address => {
      addresses.push(address);
      if (address === url) return new Response(null, { status: 302, headers: { location: final } });
      return new Response(address === final ? html : '%PDF-test', { headers: { 'content-type': address === final ? 'text/html' : 'application/pdf' } });
    } });
    assert.deepEqual(addresses, [url, final, final + 'handbook.pdf']);
    assert.equal(result.report.incomplete, false);
  }
});
test('link-only PDF replacements change semantics and discover the new rulebook', async () => {
  const html = link => page().replace('</main>', `<a href="https://mcdn.pokemon.com/rules/${link}.pdf">Official rulebook</a></main>`);
  const first = snapshot(source, response(html('v1')));
  const next = snapshot(source, response(html('v2')));
  assert.notEqual(first.semantic_sha256, next.semantic_sha256);
  assert.deepEqual(next.discovery, ['https://mcdn.pokemon.com/rules/v2.pdf']);
  const addresses = [];
  const result = await observe(registry, null, { fetcher: async address => {
    addresses.push(address);
    return new Response(address === url ? html('v2') : '%PDF-test', { headers: { 'content-type': address === url ? 'text/html' : 'application/pdf' } });
  } });
  assert.equal(addresses.length, 2);
  assert.equal(result.report.incomplete, false);
});
test('branded challenge pages are failures even with long content after the heading', async () => {
  const challenge = page('Welcome to Pokemon Champions. Please verify you are human before continuing. This security check may take a few seconds.');
  const result = await observe(registry, null, { fetcher: async () => new Response(challenge, { headers: { 'content-type': 'text/html' } }) });
  assert.equal(result.report.incomplete, true);
  assert.equal(result.candidates.length, 0);
});
test('A to B to A to B increments occurrence and reopens a closed semantic-change issue', async () => {
  let previous = null, firstB, lastB;
  for (const version of ['A', 'B', 'A', 'B']) {
    const result = await observe(registry, previous, { fetcher: async () => new Response(page('Regulation M-' + version + '. Pikachu and Light Ball are discussed. Double Battles rules and effective dates require careful review.'), { headers: { 'content-type': 'text/html' } }) });
    previous = result.state;
    if (version === 'B') { firstB ||= result.candidates[0]; lastB = result.candidates[0]; }
  }
  assert.equal(firstB.envelope.change_key, lastB.envelope.change_key);
  assert.equal(firstB.envelope.change_occurrence, 1);
  assert.equal(lastB.envelope.change_occurrence, 2);
  const writes = [];
  await publishAlerts({ repository: 'owner/repo', token: 'test', runId: '123', candidates: [lastB], report: { health: [] }, fetcher: async (address, options) => {
    if (options.method === 'GET') return Response.json([{ number: 7, body: reviewBody(firstB), state: 'closed', user: { login: 'github-actions[bot]' } }]);
    writes.push({ address, body: JSON.parse(options.body) });
    return Response.json({ number: 7 });
  } });
  assert.equal(writes.length, 2);
  assert.equal(writes[1].body.state, 'open');
  assert.ok(writes[1].body.body.includes(lastB.candidate_sha256));
});
test('invalid baseline fails rather than silently resetting', async () => {
  await assert.rejects(observe(registry, { sources: {} }, { fetcher }), /Invalid baseline/);
});
test('discovery follows new official announcements and rejects lookalike hosts', async () => {
  const article = 'https://www.pokemon.com/us/pokemon-news/new-champions-rules';
  const index = { url: 'https://champions.pokemon.com/en-us/news/', kind: 'official_news_index' };
  const visited = [];
  const result = await observe({ public_sources: [index] }, null, { fetcher: async address => {
    visited.push(address);
    return new Response(address === index.url ? page() .replace('</main>', `<a href="${article}">Notice</a><a href="https://www.pokemon.com.evil.example/us/pokemon-news/test">bad</a></main>`) : page(), { headers: { 'content-type': 'text/html' } });
  } });
  assert.deepEqual(visited, [index.url, article]);
  assert.equal(result.candidates.length, 2);
});
test('empty discovery and challenge pages become unavailable, not unchanged', async () => {
  const result = await observe({ public_sources: [{ ...source, kind: 'official_news_index' }] }, null, { fetcher });
  assert.equal(result.report.health[0].status, 'unavailable');
  assert.throws(() => snapshot(source, response('<html><main>Just a moment</main></html>')), /layout/);
});
test('official Next.js index discovers every article, not only the first', () => {
  const html = '<div id="__next"><h1>Latest Champions News</h1>' + [1, 2, 3].map(n => `<article><p>Official Champions regulation announcement number ${n}, to be reviewed before approval.</p><a href="https://www.pokemon.com/us/pokemon-news/regulation-${n}">Read news</a></article>`).join('') + '</div>';
  const result = snapshot({ ...source, kind: 'official_news_index' }, response(html));
  assert.equal(result.discovery.length, 3);
});
test('PDF bytes are preserved for hashing and require manual interpretation', () => {
  const result = snapshot({ ...source, kind: 'official_rules_pdf' }, { bytes: Buffer.from('%PDF-test\xff'), final_url: url, content_type: 'application/pdf' });
  assert.equal(result.raw_sha256, result.semantic_sha256);
  assert.equal(result.manual_pdf_review, true);
  assert.throws(() => snapshot({ ...source, kind: 'official_rules_pdf' }, response(page())), /Expected PDF/);
});
test('redirect SSRF and oversized responses are refused', async () => {
  let calls = 0;
  await assert.rejects(fetchOfficial(url, async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }); }), /Unapproved/);
  assert.equal(calls, 1);
  await assert.rejects(fetchOfficial(url, async () => new Response(Buffer.alloc(12 * 1024 * 1024 + 1))), /12 MiB/);
});
test('review issue explains uncertainty and never interprets closure as approval', () => {
  const candidate = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  const body = reviewBody(candidate);
  assert.ok(body.includes(candidate.candidate_sha256));
  assert.ok(body.includes('does not approve or publish'));
  assert.ok(body.includes('imported teams'));
});
test('closed bot issues deduplicate exact candidate; user-made markers do not suppress alerts', async () => {
  const candidate = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  for (const bot of [true, false]) {
    let writes = 0;
    const result = await publishAlerts({ repository: 'owner/repo', token: 'test', runId: '123', candidates: [candidate], report: { health: [] }, fetcher: async (address, options) => {
      if (options.method !== 'GET') { writes++; return Response.json({ number: 2 }); }
      return Response.json([{ number: 1, state: 'closed', body: reviewBody(candidate), user: { login: bot ? 'github-actions[bot]' : 'someone' } }]);
    } });
    assert.equal(writes, bot ? 0 : 1);
    assert.equal(result.created, bot ? 0 : 1);
  }
});
test('all issue pages are searched, not just open/first 100', async () => {
  const candidate = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  const visited = [];
  await publishAlerts({ repository: 'owner/repo', token: 'test', runId: '123', candidates: [candidate], report: { health: [] }, fetcher: async (address, options) => {
    visited.push(address);
    assert.equal(options.method, 'GET');
    return Response.json(address.endsWith('page=1') ? Array.from({ length: 100 }, () => ({ user: { login: 'someone' } })) : [{ body: reviewBody(candidate), user: { login: 'github-actions[bot]' } }]);
  } });
  assert.equal(visited.length, 2);
});
test('nonsemantic raw changes on a retry reuse one review issue but retain distinct exact digests', async () => {
  const first = makeCandidate(snapshot(source, response(page()), teams), null, 'a'.repeat(64));
  const next = makeCandidate(snapshot(source, response(page().replace('Changing navigation', 'new nav')), teams), null, 'a'.repeat(64));
  assert.notEqual(first.candidate_sha256, next.candidate_sha256);
  assert.equal(first.envelope.change_key, next.envelope.change_key);
  const result = await publishAlerts({ repository: 'owner/repo', token: 'test', runId: '123', candidates: [next], report: { health: [] }, fetcher: async (_, options) => {
    assert.equal(options.method, 'GET');
    return Response.json([{ body: reviewBody(first), user: { login: 'github-actions[bot]' } }]);
  } });
  assert.equal(result.created, 0);
});
test('failed discovered articles remain watched even if removed from the next index', async () => {
  const index = { ...source, kind: 'official_news_index' };
  const article = 'https://www.pokemon.com/us/news/announcement';
  const secondArticle = 'https://www.pokemon.com/us/news/another';
  const get = link => async address => address === url ? new Response(page().replace('</main>', `<a href="${link}">Article</a></main>`), { headers: { 'content-type': 'text/html' } }) : new Response('', { status: 503 });
  const first = await observe({ public_sources: [index] }, null, { fetcher: get(article) });
  const next = await observe({ public_sources: [index] }, first.state, { fetcher: get(secondArticle) });
  assert.ok(next.report.health.some(row => row.url === article && row.status === 'unavailable'));
});
test('failed issue requests cannot silently advance baseline', async () => {
  await assert.rejects(publishAlerts({ repository: 'owner/repo', token: 'test', runId: '123', candidates: [], report: { health: [] }, fetcher: async () => new Response('', { status: 403 }) }), /403/);
});
test('workflow is daily, serial, default-branch-only, never carries DB secrets or approves', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/regulation-watch.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes("'43 12 * * *'"));
  assert.ok(workflow.includes('cancel-in-progress: false'));
  assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
  assert.ok(workflow.indexOf('report-regulation-changes.mjs') < workflow.indexOf('actions/cache/save'));
  assert.ok(workflow.indexOf('actions/upload-artifact') < workflow.indexOf('report-regulation-changes.mjs'));
  assert.ok(!/SUPABASE|--approve|contents: write/.test(workflow));
});
test('staging accepts exact completed watcher attempts, not arbitrary workflow/PR/branch artifacts', () => {
  const selection = { repository: 'TheYfactora12/Pokemon-Champions-Sim-Planner', runId: '123', attempt: '2', digest: 'a'.repeat(64) };
  const run = { id: 123, run_attempt: 2, repository: { full_name: selection.repository }, path: '.github/workflows/regulation-watch.yml',
    head_branch: 'main', status: 'completed', event: 'schedule', conclusion: 'failure', head_sha: 'b'.repeat(40) };
  assert.equal(validateEvidenceRun(run, selection).artifact_name, 'regulation-watch-123-2');
  for (const patch of [{ head_branch: 'unreviewed' }, { event: 'pull_request' }, { path: '.github/workflows/ci.yml' }, { run_attempt: 1 }, { status: 'in_progress' }, { repository: { full_name: 'attacker/fork' } }]) {
    assert.throws(() => validateEvidenceRun({ ...run, ...patch }, selection));
  }
  assert.throws(() => validateEvidenceRun(run, { ...selection, runId: '../secret' }));
  assert.throws(() => validateEvidenceRun(run, { ...selection, digest: 'latest' }));
});
test('staging workflow consumes retained evidence, not new upstream data', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/regulation-stage.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('environment: regulation-staging'));
  assert.ok(workflow.includes('regulation-artifact-policy.mjs'));
  assert.ok(workflow.includes('actions/download-artifact'));
  assert.ok(workflow.includes('--expected-sha256'));
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY|--approve|watch-regulations.mjs|fetch_showdown/.test(workflow));
});
test('encrypted source evidence reconstructs exact bytes without publishing plaintext bodies', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const bytes = Buffer.from('%PDF-private official source bytes\xff');
  const sealed = sealSource(bytes, evidencePublicKey(publicPem));
  assert.ok(!JSON.stringify(sealed).includes('private official source bytes'));
  assert.deepEqual(openSource(sealed, privatePem, sha256(bytes)), bytes);
  assert.throws(() => openSource(sealed, privatePem, '0'.repeat(64)), /identity mismatch/);
  const altered = { ...sealed, ciphertext: Buffer.alloc(32).toString('base64') };
  assert.throws(() => openSource(altered, privatePem, sha256(bytes)));
});
test('observer retains exactly the bytes it fingerprints, not a later source refetch', async () => {
  const captured = [];
  let fetches = 0;
  const result = await observe(registry, null, { fetcher: async () => { fetches++; return fetcher(); }, captureSource: async (bytes, digest) => captured.push({ bytes, digest }) });
  assert.equal(fetches, 1);
  assert.equal(captured.length, 1);
  assert.equal(sha256(captured[0].bytes), result.candidates[0].envelope.source.raw_sha256);
  assert.equal(result.report.source_evidence_retention, 'encrypted_artifact');
});
test('failed source retention is visible and cannot advance that source baseline', async () => {
  const result = await observe(registry, null, { fetcher, captureSource: async () => { throw new Error('Archive unavailable'); } });
  assert.equal(result.report.incomplete, true);
  assert.equal(result.candidates.length, 0);
  assert.deepEqual(result.state.sources, {});
});
