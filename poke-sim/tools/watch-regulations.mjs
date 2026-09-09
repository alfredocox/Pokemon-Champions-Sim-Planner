#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { observe, reviewBody } from './regulation-watch-core.mjs';
import { evidencePublicKey, sealSource } from './regulation-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--require-complete')) throw new Error('Unknown watcher argument');
  const directory = path.join(root, 'artifacts/regulation-watch');
  const baseline = path.join(root, 'artifacts/regulation-watch-baseline/state.json');
  const registry = JSON.parse(await fs.readFile(path.join(root, 'tools/champions_source_inventory.json'), 'utf8'));
  let previous = null;
  try { previous = JSON.parse(await fs.readFile(baseline, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const context = vm.createContext({});
  vm.runInContext(await fs.readFile(path.join(root, 'data.js'), 'utf8'), context, { timeout: 2000 });
  const teams = JSON.parse(vm.runInContext('JSON.stringify(TEAMS)', context));
  await fs.mkdir(directory, { recursive: true });
  const publicKey = process.env.REGULATION_EVIDENCE_PUBLIC_KEY ? evidencePublicKey(process.env.REGULATION_EVIDENCE_PUBLIC_KEY) : null;
  const captureSource = publicKey ? async (bytes, digest) => {
    const sealed = sealSource(bytes, publicKey);
    await fs.mkdir(path.join(directory, 'sealed-sources'), { recursive: true });
    await fs.writeFile(path.join(directory, 'sealed-sources', digest + '.json'), JSON.stringify(sealed) + '\n');
  } : null;
  const result = await observe(registry, previous, { teams, captureSource });
  await fs.writeFile(path.join(directory, 'report.json'), JSON.stringify(result.report, null, 2) + '\n');
  await fs.writeFile(path.join(directory, 'candidates.json'), JSON.stringify(result.candidates, null, 2) + '\n');
  await fs.writeFile(path.join(directory, 'next-state.json'), JSON.stringify(result.state, null, 2) + '\n');
  for (const candidate of result.candidates) {
    await fs.writeFile(path.join(directory, candidate.candidate_sha256 + '.json'), JSON.stringify(candidate, null, 2) + '\n');
    await fs.writeFile(path.join(directory, candidate.candidate_sha256 + '.md'), reviewBody(candidate));
  }
  console.log(JSON.stringify(result.report, null, 2));
  if (args.includes('--require-complete') && result.report.incomplete) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
