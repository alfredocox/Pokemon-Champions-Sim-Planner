import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { safeUrl } from './news-feed-core.mjs';

export const HOSTS = ['champions.pokemon.com', 'www.pokemon.com', 'mcdn.pokemon.com', 'home.pokemon.com', 'support.pokemon.com', 'championships.pokemon.com'];
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  throw new Error('Candidate contains non-JSON data');
}
export function verifyCandidate(candidate, expectedSha) {
  if (!/^[a-f0-9]{64}$/.test(expectedSha || '') || candidate.schema_version !== 'regulation-review-candidate-v1' ||
      candidate.candidate_sha256 !== expectedSha || sha256(canonical(candidate.envelope)) !== expectedSha) throw new Error('Candidate fingerprint mismatch');
  const envelope = candidate.envelope;
  if (envelope.schema_version !== 'regulation-review-envelope-v1' || envelope.review_status !== 'needs_review' || envelope.competitive_use !== false ||
      !safeUrl(envelope.source?.url, undefined, HOSTS) || !safeUrl(envelope.source?.final_url, undefined, HOSTS)) throw new Error('Invalid quarantined candidate');
  return envelope;
}

export async function fetchOfficial(url, fetcher = fetch) {
  const signal = AbortSignal.timeout(15000);
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!safeUrl(url, undefined, HOSTS)) throw new Error('Unapproved source/redirect URL');
    const response = await fetcher(url, { signal, redirect: 'manual', headers: { 'user-agent': 'champions-regulation-watch/1.0' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Redirect missing Location');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error('HTTP ' + response.status); }
    let size = 0;
    const chunks = [];
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 12 * 1024 * 1024) throw new Error('Source exceeds 12 MiB');
      chunks.push(chunk);
    }
    return { bytes: Buffer.concat(chunks), final_url: url, content_type: response.headers.get('content-type') || '' };
  }
  throw new Error('Too many redirects');
}

const clean = text => text.replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values)].sort();
export function snapshot(source, response, teams = {}) {
  const raw_sha256 = sha256(response.bytes);
  const base = { url: source.url, final_url: response.final_url, raw_sha256, kind: source.kind };
  if (source.kind === 'official_rules_pdf' || /application\/pdf/i.test(response.content_type)) {
    if (response.bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Expected PDF, received an error page');
    return { ...base, title: 'Official rules PDF', semantic_sha256: raw_sha256, paragraph_hashes: [],
      mentions: { regulations: [], dates: [], entities: [], rule_topics: [] }, potential_team_ids: [], discovery: [], manual_pdf_review: true };
  }
  if (!/text\/html/i.test(response.content_type)) throw new Error('Expected HTML content type');
  const $ = load(response.bytes.toString('utf8'));
  $('script, style, nav, footer, header, noscript, [role="navigation"]').remove();
  const main = $('main').first().length ? $('main').first() :
    new URL(source.url).hostname === 'champions.pokemon.com' && $('#__next').length ? $('#__next') : $('article').first();
  main.find('h1, h2, h3, h4, p, li, td, div, section, br').each((_, el) => { $(el).before(' '); $(el).after(' '); });
  if (!main.length || clean(main.text()).length < 80) throw new Error('Source layout/content unavailable; manual parser review required');
  const text = clean(main.text());
  if (/access denied|just a moment|verify (?:that )?you are human|checking your browser|enable javascript and cookies|complete the security check/i.test(text)) throw new Error('Source returned a challenge/error page');
  const paragraphs = main.find('h1, h2, h3, p, li, td, [class*="__description"], [class*="__date"]').map((_, el) => clean($(el).text())).get().filter(Boolean);
  const entities = unique(Object.values(teams).flatMap(team => (team.members || []).flatMap(member => [member.name, member.item, member.ability, ...(member.moves || [])])).filter(Boolean));
  const normalizedText = ' ' + text.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  const mentioned = entities.filter(entity => normalizedText.includes(' ' + entity.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' '));
  const potential_team_ids = Object.entries(teams).filter(([, team]) => (team.members || []).some(member => [member.name, member.item, member.ability, ...(member.moves || [])].some(entity => mentioned.includes(entity)))).map(([id]) => id).sort();
  const mentions = {
    regulations: unique((text.match(/\b(?:Regulation\s+(?:Set\s+)?)M[-\s][A-Z]\b/gi) || []).map(value => value.toUpperCase().replace(/^REGULATION\s+(SET\s+)?/, '').replace(/\s+/g, '-'))),
    dates: unique(text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+20\d{2})?\b|\b20\d{2}-\d{2}-\d{2}\b/gi) || []),
    entities: mentioned,
    rule_topics: ['eligible', 'prohibited', 'banned', 'restricted', 'item clause', 'species clause', 'double battles', 'single battles', 'level', 'time limit'].filter(word => text.toLowerCase().includes(word))
  };
  const links = unique(main.find('a[href]').map((_, el) => safeUrl($(el).attr('href'), response.final_url, HOSTS)).get().filter(Boolean));
  const discovery = links.filter(url => {
    if (!url || url === source.url) return false;
    const path = new URL(url).pathname;
    return /\.pdf$/i.test(path) || (source.kind === 'official_news_index' && /\/us\/(pokemon-news|news|features|strategy)\/|\/en-us\/(news|about)\/.+/.test(path));
  });
  if (source.kind === 'official_news_index' && !discovery.length) throw new Error('News discovery returned no official articles');
  return { ...base, title: clean(main.find('h1').first().text() || $('title').text()).split(/\s+/).slice(0, 20).join(' ').slice(0, 200),
    semantic_sha256: sha256(canonical({ text, links })), paragraph_hashes: paragraphs.map(sha256), mentions, potential_team_ids, discovery, manual_pdf_review: false };
}

export function makeCandidate(current, previous, policy, occurrence = 1) {
  const changed_fields = previous ? ['mentions', 'paragraph_hashes', 'discovery', 'semantic_sha256', 'final_url'].filter(key => canonical(current[key]) !== canonical(previous[key])) : ['initial_observation'];
  if (!changed_fields.length) changed_fields.push('extraction_policy');
  const envelope = { schema_version: 'regulation-review-envelope-v1', source_policy_sha256: policy, parser_version: '1',
    change_occurrence: occurrence,
    change_key: sha256(canonical({ policy, url: current.url, before: previous?.semantic_sha256 || null, after: current.semantic_sha256, final_url: current.final_url })),
    review_status: 'needs_review', competitive_use: false, source: current, previous: previous || null, changed_fields,
    impact: { scope: 'bundled_teams_only', potential_team_ids: unique([...current.potential_team_ids, ...(previous?.potential_team_ids || [])]), unassessed: 'Imported/private teams require separate legality review' },
    uncertainty: ['A mention is not a legality decision. Dates are mentions, not verified effective dates.', 'Game, regulation revision and singles/doubles scope require human confirmation.',
      'Changed text is detected but not interpreted as authoritative rule additions/removals.', ...(current.manual_pdf_review ? ['PDF changed or first observed; inspect the linked handbook manually.'] : []),
      'Species, moves and items outside the bundled team catalog are not exhaustively extracted.'] };
  return { schema_version: 'regulation-review-candidate-v1', candidate_sha256: sha256(canonical(envelope)), envelope };
}

export async function observe(registry, previous = null, { fetcher = fetch, teams = {}, now = new Date().toISOString(), captureSource = null } = {}) {
  const policy = sha256(canonical({ parser_version: '1', hosts: HOSTS, sources: registry.public_sources, teams }));
  if (previous && (previous.schema_version !== 'regulation-watch-state-v1' || !previous.sources || typeof previous.sources !== 'object' || Array.isArray(previous.sources))) throw new Error('Invalid baseline; do not silently reset history');
  const samePolicy = previous?.source_policy_sha256 === policy;
  const old = previous?.sources || {};
  const state = { schema_version: 'regulation-watch-state-v1', source_policy_sha256: policy, sources: {}, watched_sources: [],
    source_policies: Object.fromEntries(Object.keys(old).map(url => [url, previous.source_policies?.[url] || previous.source_policy_sha256])),
    transition_counts: { ...(previous?.transition_counts || {}) } };
  const candidates = [], health = [];
  const queue = registry.public_sources.map(source => ({ ...source }));
  const seen = new Set(queue.map(source => source.url));
  const retained = unique([...Object.keys(old), ...(previous?.watched_sources || []).map(source => source.url)]);
  for (const url of retained) {
    if (!safeUrl(url, undefined, HOSTS)) throw new Error('Baseline contains an unapproved URL');
    if (!seen.has(url)) { queue.push({ url, kind: old[url]?.kind || (/\.pdf$/i.test(new URL(url).pathname) ? 'official_rules_pdf' : 'discovered_official_article'), required: true }); seen.add(url); }
  }
  for (let index = 0; index < queue.length; index++) {
    if (index >= 200) { health.push({ status: 'unavailable', url: 'discovery-limit', error: 'Discovery exceeds 200 pages; increase scope after review', required: true }); break; }
    const source = queue[index];
    try {
      const fetched = await fetchOfficial(source.url, fetcher);
      const current = snapshot(source, fetched, teams);
      if (captureSource) await captureSource(fetched.bytes, current.raw_sha256);
      const before = old[source.url];
      const changed = state.source_policies[source.url] !== policy || !before || before.semantic_sha256 !== current.semantic_sha256 || before.final_url !== current.final_url;
      if (changed) {
        const draft = makeCandidate(current, before, policy);
        const occurrence = (state.transition_counts[draft.envelope.change_key] || 0) + 1;
        if (!Number.isSafeInteger(occurrence) || occurrence < 1) throw new Error('Invalid transition history');
        state.transition_counts[draft.envelope.change_key] = occurrence;
        candidates.push(makeCandidate(current, before, policy, occurrence));
      }
      state.sources[source.url] = current;
      state.source_policies[source.url] = policy;
      health.push({ url: source.url, status: !before ? 'new' : changed ? 'changed' : 'unchanged', required: source.required !== false });
      for (const url of current.discovery) if (!seen.has(url)) { queue.push({ url, kind: /\.pdf$/i.test(new URL(url).pathname) ? 'official_rules_pdf' : 'discovered_official_article', required: true }); seen.add(url); }
    } catch (error) {
      if (old[source.url]) state.sources[source.url] = old[source.url];
      health.push({ url: source.url, status: 'unavailable', required: source.required !== false, error: error.message });
    }
  }
  // A failed source must never disappear from the next baseline.
  for (const [url, value] of Object.entries(old)) if (!state.sources[url]) state.sources[url] = value;
  state.watched_sources = queue.map(({ url, kind, required }) => ({ url, kind, required: required !== false }));
  return { state, candidates, report: { checked_at: now, source_policy_sha256: policy, policy_changed: !!previous && !samePolicy,
    source_evidence_retention: captureSource ? 'encrypted_artifact' : 'not_configured',
    candidate_count: candidates.length, incomplete: health.some(row => row.status === 'unavailable' && row.required), health } };
}

export function reviewBody(candidate) {
  const data = verifyCandidate(candidate, candidate.candidate_sha256);
  const mentions = data.source.mentions, before = data.previous?.mentions || {};
  return `<!-- regulation-watch:${data.change_key} -->\n<!-- regulation-occurrence:${data.change_occurrence} -->\n## Unverified Regulation Source Change\n\nSource: ${data.source.url}\n\nCandidate SHA-256: \`${candidate.candidate_sha256}\`\n\nThis is an observation, not an approved rule update.\n\nChanged fields: ${data.changed_fields.join(', ')}\n\n` +
    '```json\n' + JSON.stringify({ before, after: mentions, potential_bundled_team_ids: data.impact.potential_team_ids,
      added_links: data.source.discovery.filter(url => !data.previous?.discovery.includes(url)),
      removed_links: (data.previous?.discovery || []).filter(url => !data.source.discovery.includes(url)),
      changed_paragraphs: { added: data.source.paragraph_hashes.filter(hash => !data.previous?.paragraph_hashes.includes(hash)).length,
        removed: (data.previous?.paragraph_hashes || []).filter(hash => !data.source.paragraph_hashes.includes(hash)).length }
    }, null, 2) + '\n```\n\n' +
    data.uncertainty.map(note => '- ' + note).join('\n') + '\n\n' +
    '- [ ] Confirm game, regulation, format, effective dates and full eligibility scope against official evidence.\n' +
    '- [ ] Review additions/removals and affected saved/imported teams.\n' +
    '- [ ] Run legality, stats, mechanics, import and replay regression gates.\n' +
    '- [ ] Record human/in-game evidence for ambiguous facts.\n' +
    '- [ ] Review the exact candidate digest; approval is separate from publication.\n' +
    '- [ ] Preserve old regulation packages and saved-battle version identities.\n\nClosing this issue or adding a label does not approve or publish rules.\n';
}
