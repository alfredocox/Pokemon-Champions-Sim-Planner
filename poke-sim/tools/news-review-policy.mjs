import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ALLOWED = new Set(['poke-sim/generated/news_feed.js', 'poke-sim/pokemon-champion-2026.html', 'poke-sim/generated/release_artifact.json']);
export function validateNewsPaths(paths) {
  if (paths.some(file => !ALLOWED.has(file))) throw new Error('News candidate exceeds the three generated-file boundary');
}
export function validateNewsPrs(pulls, repository) {
  const candidates = pulls.filter(pr => String(pr.head?.ref || '').startsWith('automation/home-news-'));
  if (candidates.length > 1) throw new Error('Multiple news PRs require human reconciliation');
  for (const pr of candidates) {
    if (!/^automation\/home-news-[0-9]+$/.test(pr.head.ref) || pr.head.repo?.full_name !== repository ||
      pr.user?.login !== 'github-actions[bot]' || !/^[a-f0-9]{40}$/.test(pr.head.sha) || pr.base?.ref !== 'main') {
      throw new Error('News PR branch, repository, author, base or commit identity mismatch');
    }
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  if (process.argv[2] === '--prs') validateNewsPrs(JSON.parse(input), process.argv[3]);
  else if (process.argv[2] === '--paths') validateNewsPaths(input.split('\0').filter(Boolean));
  else throw new Error('Expected --prs or --paths');
}
