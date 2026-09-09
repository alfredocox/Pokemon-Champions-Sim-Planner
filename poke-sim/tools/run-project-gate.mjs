#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const TESTS_DIR = join(ROOT, 'tests');

const SKIPPED_TESTS = new Map([
  ['audit.js', 'expensive battle audit has its own gated CI job'],
  ['_db_helpers.js', 'shared helper, not a standalone test'],
  ['nightly_bring_harness.js', 'manual harness'],
  ['golden_battles_runner.js', 'helper, not a standalone test'],
]);

export function classifyTest(filename) {
  if (SKIPPED_TESTS.has(filename)) {
    return { lane: 'skip', reason: SKIPPED_TESTS.get(filename) };
  }
  if (/^db_.*_tests\.js$/.test(filename)) {
    return { lane: 'db' };
  }
  if (/\.(?:js|mjs)$/.test(filename)) {
    return { lane: 'fast' };
  }
  return { lane: 'ignore' };
}

export function discoverTests(directory = TESTS_DIR) {
  return readdirSync(directory)
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({ filename, ...classifyTest(filename) }));
}

function loadLocalEnvironment() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function configureLiveDb() {
  loadLocalEnvironment();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('live DB mode requires SUPABASE_URL and SUPABASE_ANON_KEY in the environment or poke-sim/.env.local');
  }
  process.env.SUPABASE_KEY ||= process.env.SUPABASE_ANON_KEY;
  process.env.RUN_LIVE_DB = '1';
  console.log(`Live DB mode enabled for ${new URL(process.env.SUPABASE_URL).origin}`);
}

function runFiles(files, label) {
  let failures = 0;
  for (const filename of files) {
    console.log(`\nRUN ${filename}`);
    const result = spawnSync(process.execPath, [join(TESTS_DIR, filename)], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });
    if (result.error) {
      console.error(`FAIL ${filename}: ${result.error.message}`);
      failures += 1;
    } else if (result.status !== 0) {
      console.error(`FAIL ${filename}: exit ${result.status}`);
      failures += 1;
    }
  }
  console.log(`\n${label}: ran ${files.length} file(s), ${failures} failure(s).`);
  return failures;
}

function parseMode(args) {
  const modes = ['--fast', '--db'].filter((flag) => args.has(flag));
  if (modes.length > 1) throw new Error('choose only one of --fast or --db');
  return modes[0]?.slice(2) || 'full';
}

export function main(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  const supported = new Set(['--fast', '--db', '--live', '--list']);
  const unknown = argv.filter((arg) => !supported.has(arg));
  if (unknown.length) throw new Error(`unknown option(s): ${unknown.join(', ')}`);

  const mode = parseMode(args);
  if (args.has('--live') && mode === 'fast') throw new Error('--live is valid only for DB or full mode');
  if (args.has('--live')) configureLiveDb();

  const discovered = discoverTests();
  if (args.has('--list')) {
    for (const test of discovered) {
      if (test.lane !== 'ignore') console.log(`${test.lane.padEnd(5)} ${test.filename}${test.reason ? ` - ${test.reason}` : ''}`);
    }
    return 0;
  }

  const lanes = mode === 'full' ? ['fast', 'db'] : [mode];
  let failures = 0;
  for (const lane of lanes) {
    failures += runFiles(
      discovered.filter((test) => test.lane === lane).map((test) => test.filename),
      lane === 'db' ? 'DB gate' : 'Fast gate',
    );
  }

  const skipped = discovered.filter((test) => test.lane === 'skip');
  console.log(`Skipped ${skipped.length} manual/helper file(s).`);
  if (failures) {
    console.error(`Project gate failed: ${failures} test file(s) failed.`);
    return 1;
  }
  console.log('Project gate passed.');
  return 0;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`Project gate configuration error: ${error.message}`);
    process.exitCode = 2;
  }
}
