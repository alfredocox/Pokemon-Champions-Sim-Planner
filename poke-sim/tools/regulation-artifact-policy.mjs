import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateEvidenceRun(run, { repository, runId, attempt, digest }) {
  if (repository !== 'TheYfactora12/Pokemon-Champions-Sim-Planner' || !/^[1-9]\d*$/.test(runId || '') ||
      !/^[1-9]\d*$/.test(attempt || '') || !/^[a-f0-9]{64}$/.test(digest || '')) throw new Error('Invalid evidence selection');
  if (String(run.id) !== runId || String(run.run_attempt) !== attempt || run.repository?.full_name !== repository ||
      run.path !== '.github/workflows/regulation-watch.yml' || run.head_branch !== 'main' || run.status !== 'completed' ||
      !['schedule', 'workflow_dispatch'].includes(run.event) || !['success', 'failure'].includes(run.conclusion) || !/^[a-f0-9]{40}$/.test(run.head_sha || '')) {
    throw new Error('Evidence must come from a completed official watcher run on canonical main');
  }
  return { artifact_name: `regulation-watch-${runId}-${attempt}`, source_commit: run.head_sha, candidate_sha256: digest };
}

async function main() {
  const selection = { repository: process.env.GITHUB_REPOSITORY, runId: process.env.SOURCE_RUN, attempt: process.env.SOURCE_ATTEMPT, digest: process.env.CANDIDATE_SHA256 };
  // Reject all interpolated URL components before using the token.
  if (!/^[1-9]\d*$/.test(selection.runId || '') || !/^[1-9]\d*$/.test(selection.attempt || '') ||
      selection.repository !== 'TheYfactora12/Pokemon-Champions-Sim-Planner' || !/^[a-f0-9]{64}$/.test(selection.digest || '')) throw new Error('Invalid evidence selection');
  const response = await fetch(`https://api.github.com/repos/${selection.repository}/actions/runs/${selection.runId}/attempts/${selection.attempt}`, {
    redirect: 'error', signal: AbortSignal.timeout(15000), headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: 'application/vnd.github+json' }
  });
  if (!response.ok) throw new Error('Cannot verify evidence run: HTTP ' + response.status);
  console.log(JSON.stringify(validateEvidenceRun(await response.json(), selection)));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
