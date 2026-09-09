#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewBody } from './regulation-watch-core.mjs';

export async function publishAlerts({ repository, token, candidates, report, runId, fetcher = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^\d+$/.test(runId || '') || !token) throw new Error('Missing/invalid GitHub alert configuration');
  const base = `https://api.github.com/repos/${repository}`;
  async function api(endpoint, method = 'GET', body) {
    const response = await fetcher(base + endpoint, { method, signal: AbortSignal.timeout(15000),
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'x-github-api-version': '2022-11-28' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`GitHub alert request failed (${response.status})`);
    return response.json();
  }
  const issues = [];
  for (let page = 1; ; page++) {
    if (page > 100) throw new Error('Issue pagination limit reached; refusing incomplete deduplication');
    const rows = await api(`/issues?state=all&per_page=100&page=${page}`);
    issues.push(...rows.filter(row => !row.pull_request && row.user?.login === 'github-actions[bot]'));
    if (rows.length < 100) break;
  }
  let created = 0;
  const evidenceNote = `\nEvidence artifact: https://github.com/${repository}/actions/runs/${runId}\nRaw-source retention: ${report.source_evidence_retention || 'not_configured'}. Missing raw captures block final rule approval.\n`;
  for (const candidate of candidates) {
    const body = reviewBody(candidate);
    const marker = `<!-- regulation-watch:${candidate.envelope.change_key} -->`;
    const existingCandidate = issues.find(issue => issue.body?.startsWith(marker));
    if (existingCandidate) {
      const priorOccurrence = Number((existingCandidate.body.match(/<!-- regulation-occurrence:(\d+) -->/) || [])[1] || 1);
      if (candidate.envelope.change_occurrence > priorOccurrence) {
        await api('/issues/' + existingCandidate.number + '/comments', 'POST', { body: 'This semantic change recurred. Previous review evidence:\n\n' + existingCandidate.body });
        await api('/issues/' + existingCandidate.number, 'PATCH', { state: 'open', body: body + evidenceNote });
      }
      continue;
    }
    const issue = await api('/issues', 'POST', { title: `[Rules review] ${candidate.envelope.source.kind}: ${candidate.candidate_sha256.slice(0, 12)}`,
      body: body + evidenceNote });
    issues.push(issue);
    created++;
  }
  const marker = '<!-- regulation-watch:source-health-v1 -->';
  const failed = report.health.filter(row => row.status === 'unavailable');
  const existing = issues.find(issue => issue.body?.startsWith(marker));
  if (failed.length || existing?.state === 'open') {
    const body = marker + '\n## Official Source Health\n\n' + (failed.length ? 'Unavailable sources are not evidence of unchanged rules.\n\n```json\n' + JSON.stringify(failed, null, 2) + '\n```' : 'All watched sources responded successfully. Historical failures remain in workflow artifacts.') + `\n\nLatest check: ${report.checked_at}\nEvidence: https://github.com/${repository}/actions/runs/${runId}\n`;
    if (existing) await api('/issues/' + existing.number, 'PATCH', { body, ...(failed.length ? { state: 'open' } : {}) });
    else await api('/issues', 'POST', { title: '[Rules watch] Official sources unavailable', body });
  }
  return { created, candidates: candidates.length, unavailable: failed.length };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'artifacts/regulation-watch');
  const candidates = JSON.parse(await fs.readFile(path.join(root, 'candidates.json'), 'utf8'));
  const report = JSON.parse(await fs.readFile(path.join(root, 'report.json'), 'utf8'));
  console.log(await publishAlerts({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN, runId: process.env.GITHUB_RUN_ID, candidates, report }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
