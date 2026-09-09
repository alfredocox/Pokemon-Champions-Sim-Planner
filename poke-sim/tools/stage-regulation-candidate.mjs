#!/usr/bin/env node
// Private review staging only. This tool never approves or publishes rules.
// Provisioning gate: review grants/RLS and the exact target project before enabling
// --write. Prefer SUPABASE_REGULATION_STAGING_KEY backed by a least-privilege
// server-side writer. No such role is provisioned by this tool or its migration.
// REGULATION_STAGING_PROVISIONING_VERIFIED=true is a required operator
// attestation after provisioning readback, not an automated permissions proof.
// The protected staging workflow must pass its same-named environment variable
// from vars.REGULATION_STAGING_PROVISIONING_VERIFIED, not hard-code success.
// SUPABASE_SERVICE_ROLE_KEY is a compatibility option, NOT an isolated staging
// credential: it bypasses RLS and may write other tables outside this CLI.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256, verifyCandidate, HOSTS } from './regulation-watch-core.mjs';
import { safeUrl } from './news-feed-core.mjs';

export const TABLE = 'regulation_review_candidates';
export const MAX_PAYLOAD_BYTES = 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const SELECT = 'candidate_sha256,schema_version,canonical_payload,review_status,competitive_use';

function requireShape(valid) {
  if (!valid) throw new Error('Invalid candidate envelope structure');
}

function objectKeys(value, required, optional = []) {
  requireShape(value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype);
  requireShape(required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key)));
}

function strings(value) {
  requireShape(Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim().length > 0));
}

function validateSnapshot(value) {
  objectKeys(value, ['url', 'final_url', 'raw_sha256', 'semantic_sha256', 'kind', 'title', 'mentions', 'paragraph_hashes'],
    ['potential_team_ids', 'discovery', 'manual_pdf_review']);
  requireShape(typeof value.url === 'string' && !!safeUrl(value.url, undefined, HOSTS));
  requireShape(typeof value.final_url === 'string' && !!safeUrl(value.final_url, undefined, HOSTS));
  requireShape(typeof value.kind === 'string' && value.kind.trim().length > 0 && typeof value.title === 'string');
  requireShape(typeof value.raw_sha256 === 'string' && HASH.test(value.raw_sha256) &&
    typeof value.semantic_sha256 === 'string' && HASH.test(value.semantic_sha256));
  strings(value.paragraph_hashes);
  requireShape(value.paragraph_hashes.every(hash => HASH.test(hash)));
  objectKeys(value.mentions, ['regulations', 'dates', 'entities', 'rule_topics']);
  Object.values(value.mentions).forEach(strings);
  if (Object.hasOwn(value, 'potential_team_ids')) strings(value.potential_team_ids);
  if (Object.hasOwn(value, 'discovery')) {
    strings(value.discovery);
    requireShape(value.discovery.every(url => !!safeUrl(url, undefined, HOSTS)));
  }
  if (Object.hasOwn(value, 'manual_pdf_review')) requireShape(typeof value.manual_pdf_review === 'boolean');
}

function validateEnvelope(candidate, envelope) {
  objectKeys(candidate, ['schema_version', 'candidate_sha256', 'envelope']);
  objectKeys(envelope, ['schema_version', 'source_policy_sha256', 'parser_version', 'change_key', 'change_occurrence', 'review_status',
    'competitive_use', 'source', 'previous', 'changed_fields', 'impact', 'uncertainty']);
  requireShape(typeof envelope.source_policy_sha256 === 'string' && HASH.test(envelope.source_policy_sha256) &&
    typeof envelope.change_key === 'string' && HASH.test(envelope.change_key) && envelope.parser_version === '1');
  requireShape(Number.isSafeInteger(envelope.change_occurrence) && envelope.change_occurrence >= 1);
  validateSnapshot(envelope.source);
  if (envelope.previous !== null) {
    validateSnapshot(envelope.previous);
    requireShape(envelope.previous.url === envelope.source.url);
  }
  strings(envelope.changed_fields);
  requireShape(envelope.changed_fields.length > 0 && envelope.changed_fields.every(field =>
    ['initial_observation', 'extraction_policy', 'mentions', 'paragraph_hashes', 'discovery', 'semantic_sha256', 'final_url'].includes(field)));
  objectKeys(envelope.impact, ['scope', 'potential_team_ids', 'unassessed']);
  requireShape(envelope.impact.scope === 'bundled_teams_only' &&
    envelope.impact.unassessed === 'Imported/private teams require separate legality review');
  strings(envelope.impact.potential_team_ids);
  strings(envelope.uncertainty);
  requireShape(envelope.uncertainty.length > 0);
  const transition = { policy: envelope.source_policy_sha256, url: envelope.source.url,
    before: envelope.previous?.semantic_sha256 || null, after: envelope.source.semantic_sha256, final_url: envelope.source.final_url };
  requireShape(envelope.change_key === sha256(canonical(transition)));
}

export function prepareCandidate(candidate, expectedSha) {
  if (!HASH.test(expectedSha || '')) throw new Error('An exact lowercase --expected-sha256 is required');
  const envelope = verifyCandidate(candidate, expectedSha);
  validateEnvelope(candidate, envelope);
  if (candidate.schema_version !== 'regulation-review-candidate-v1' ||
      candidate.candidate_sha256 !== expectedSha ||
      envelope?.schema_version !== 'regulation-review-envelope-v1' ||
      envelope.review_status !== 'needs_review' || envelope.competitive_use !== false) {
    throw new Error('Candidate must remain needs_review and noncompetitive');
  }
  const canonicalPayload = canonical(envelope);
  if (sha256(canonicalPayload) !== expectedSha) throw new Error('Candidate digest mismatch');
  if (Buffer.byteLength(canonicalPayload, 'utf8') > MAX_PAYLOAD_BYTES) throw new Error('Candidate exceeds 1 MiB staging limit');
  return { candidate_sha256: expectedSha, schema_version: candidate.schema_version,
    canonical_payload: canonicalPayload, review_status: 'needs_review', competitive_use: false };
}

function endpointFor(base) {
  let url;
  try { url = new URL(base); } catch { throw new Error('SUPABASE_URL must be an HTTPS project origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash) throw new Error('SUPABASE_URL must be an HTTPS project origin');
  return new URL('/rest/v1/' + TABLE, url);
}

async function request(fetcher, url, options) {
  try { return await fetcher(url.href, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error('Staging request failed; outcome may be unknown. Retry the same digest.'); }
}

async function boundedJson(response) {
  let size = 0;
  const chunks = [];
  try {
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_PAYLOAD_BYTES * 8) throw new Error('oversize');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new Error('Invalid or oversized staging response; stored state is unverified'); }
}

export async function stageCandidate(candidate, expectedSha, { write = false, env = process.env, fetcher = fetch } = {}) {
  // Validate and freeze the exact wire payload before looking up credentials or
  // making any request. Never re-read the candidate file after review.
  const row = prepareCandidate(candidate, expectedSha);
  if (!write) return { mode: 'dry_run', candidate_sha256: expectedSha, review_status: row.review_status,
    competitive_use: false, payload_bytes: Buffer.byteLength(row.canonical_payload, 'utf8') };
  if (write !== true || env.REGULATION_STAGING_PROVISIONING_VERIFIED !== 'true') {
    throw new Error('Write blocked: REGULATION_STAGING_PROVISIONING_VERIFIED=true requires prior least-privilege provisioning readback');
  }
  const endpoint = endpointFor(env.SUPABASE_URL);
  const key = env.SUPABASE_REGULATION_STAGING_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof key !== 'string' || !key.trim()) throw new Error('A server-side staging credential is required');
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const inserted = await request(fetcher, endpoint, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  let duplicate = false;
  if (inserted.status === 409) {
    const error = await boundedJson(inserted);
    if (error.code !== '23505') throw new Error('Staging insert conflict; no overwrite attempted');
    duplicate = true;
  } else if (inserted.status !== 201) {
    await inserted.body?.cancel();
    throw new Error('Staging insert failed (HTTP ' + inserted.status + '); stored state is unverified');
  } else await inserted.body?.cancel();

  const readUrl = new URL(endpoint);
  readUrl.searchParams.set('candidate_sha256', 'eq.' + expectedSha);
  readUrl.searchParams.set('select', SELECT);
  readUrl.searchParams.set('limit', '2');
  const response = await request(fetcher, readUrl, { method: 'GET', headers });
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error('Staging readback failed (HTTP ' + response.status + '); stored state is unverified');
  }
  const rows = await boundedJson(response);
  if (!Array.isArray(rows) || rows.length !== 1 || Object.keys(row).some(key => rows[0]?.[key] !== row[key]) ||
      sha256(rows[0].canonical_payload) !== expectedSha) throw new Error('Staging readback mismatch; stored state is unverified');
  return { mode: 'staged', candidate_sha256: expectedSha, duplicate, readback_verified: true,
    review_status: 'needs_review', competitive_use: false };
}

export function parseArgs(args) {
  const options = { write: false };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (seen.has(arg)) throw new Error('Duplicate option: ' + arg);
    seen.add(arg);
    if (arg === '--write') options.write = true;
    else if (arg === '--help') options.help = true;
    else if (arg === '--candidate' || arg === '--expected-sha256') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error('Missing value for ' + arg);
      options[arg === '--candidate' ? 'candidatePath' : 'expectedSha'] = value;
    } else throw new Error('Unknown option: ' + arg);
  }
  if (!options.help && (!options.candidatePath || !HASH.test(options.expectedSha || ''))) {
    throw new Error('--candidate <path> and --expected-sha256 <64 lowercase hex> are required');
  }
  return options;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log('Usage: node tools/stage-regulation-candidate.mjs --candidate <path> --expected-sha256 <digest> [--write]\nDefault: offline dry run. Writes stage unapproved evidence only.\nWrite env: SUPABASE_URL, SUPABASE_REGULATION_STAGING_KEY (or SUPABASE_SERVICE_ROLE_KEY), REGULATION_STAGING_PROVISIONING_VERIFIED=true.\nProvision least-privilege access before activation. The gate is an operator attestation, not permissions proof. Service-role credentials bypass RLS; this CLI is not credential isolation.');
    return;
  }
  const handle = await fs.open(options.candidatePath, 'r');
  const input = Buffer.alloc(MAX_PAYLOAD_BYTES * 2 + 1);
  let size = 0;
  try {
    while (size < input.length) {
      const { bytesRead } = await handle.read(input, size, input.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
  } finally { await handle.close(); }
  if (size > MAX_PAYLOAD_BYTES * 2) throw new Error('Candidate file exceeds 2 MiB input limit');
  const candidate = JSON.parse(input.subarray(0, size).toString('utf8'));
  if (options.write) console.error('Private staging only. Service-role credentials bypass RLS; least-privilege provisioning and target-project review are separate activation gates.');
  console.log(JSON.stringify(await stageCandidate(candidate, options.expectedSha, { write: options.write })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
