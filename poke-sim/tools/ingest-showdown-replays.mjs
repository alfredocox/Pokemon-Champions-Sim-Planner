#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const SimEvidence = require('../sim_evidence.js');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const DEFAULT_REPLAY_DIR = path.join(process.env.HOME || process.cwd(), 'Downloads', 'battles');
const OUT_JSON = path.join(REPORT_DIR, 'showdown-replay-context-latest.json');
const OUT_MD = path.join(REPORT_DIR, 'showdown-replay-context-latest.md');

function isReplayHtml(file) {
  return /\.html?$/i.test(path.basename(file));
}

function listReplayFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listReplayFiles(full));
    else if (entry.isFile() && isReplayHtml(full)) out.push(full);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function resolveInputs(argv) {
  let replayDir = null;
  let latest = false;
  const files = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--replay-dir' || arg === '--drop-dir') {
      replayDir = argv[++i] ? path.resolve(argv[i]) : DEFAULT_REPLAY_DIR;
    } else if (arg === '--latest') {
      latest = true;
    } else {
      files.push(path.resolve(arg));
    }
  }
  if (!files.length) {
    replayDir = replayDir || DEFAULT_REPLAY_DIR;
    const found = listReplayFiles(replayDir).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return latest && found.length ? [found[0]] : found;
  }
  const expanded = [];
  for (const file of files) {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) expanded.push(...listReplayFiles(file));
    else expanded.push(file);
  }
  return latest && expanded.length ? [expanded[0]] : expanded;
}

function ingestFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const result = SimEvidence.createShowdownReplayEvidenceFromHtml(html, {
    source_file: file
  });
  if (!result.ok) {
    return {
      ok: false,
      source_file: file,
      errors: result.errors || [],
      warnings: result.warnings || []
    };
  }
  return {
    ok: true,
    source_file: file,
    replay_record: result.replay_record,
    source_gaps: (result.source_gaps || []).map((gap) => gap.code || String(gap))
  };
}

function summarize(results) {
  const successful = results.filter((row) => row.ok);
  const failed = results.filter((row) => !row.ok);
  const seenIds = new Set();
  const duplicateIds = new Set();
  const byRegulation = {};
  const byFormat = {};
  const gaps = {};
  let totalEvents = 0;
  let totalTurns = 0;
  let totalMoves = 0;
  let totalFaints = 0;
  for (const row of successful) {
    const replay = row.replay_record;
    if (seenIds.has(replay.id)) duplicateIds.add(replay.id);
    seenIds.add(replay.id);
    byRegulation[replay.regulation_id] = (byRegulation[replay.regulation_id] || 0) + 1;
    byFormat[replay.format] = (byFormat[replay.format] || 0) + 1;
    totalEvents += replay.evidence_summary.events;
    totalTurns += replay.evidence_summary.turns;
    totalMoves += Number(replay.source_metadata && replay.source_metadata.event_counts && replay.source_metadata.event_counts.moves || 0);
    totalFaints += Number(replay.source_metadata && replay.source_metadata.event_counts && replay.source_metadata.event_counts.faints || 0);
    for (const gap of replay.source_gaps || []) gaps[gap] = (gaps[gap] || 0) + 1;
  }
  return {
    schema_version: 'champions-showdown-replay-ingest-v1',
    generated_at: new Date().toISOString(),
    boundary: 'Showdown HTML replays are replay/meta/coaching evidence. They do not overwrite official Champion legality or mechanic truth.',
    totals: {
      files: results.length,
      successful: successful.length,
      failed: failed.length,
      unique_replays: seenIds.size,
      duplicate_replay_ids: duplicateIds.size,
      events: totalEvents,
      turns: totalTurns,
      moves: totalMoves,
      faints: totalFaints
    },
    by_regulation: byRegulation,
    by_format: byFormat,
    source_gaps: gaps,
    duplicate_ids: [...duplicateIds].sort(),
    failed_files: failed,
    replays: successful.map((row) => row.replay_record)
  };
}

function mdReport(report) {
  const lines = [];
  lines.push('# Showdown Replay Context Latest');
  lines.push('');
  lines.push('- Generated at: ' + report.generated_at);
  lines.push('- Boundary: ' + report.boundary);
  lines.push('- Files: ' + report.totals.files);
  lines.push('- Successful: ' + report.totals.successful);
  lines.push('- Failed: ' + report.totals.failed);
  lines.push('- Unique replays: ' + report.totals.unique_replays);
  lines.push('- Duplicate replay IDs: ' + report.totals.duplicate_replay_ids);
  lines.push('- Events: ' + report.totals.events);
  lines.push('- Turns: ' + report.totals.turns);
  lines.push('- Moves: ' + report.totals.moves);
  lines.push('- Faints: ' + report.totals.faints);
  lines.push('');
  lines.push('## Regulation Coverage');
  lines.push('');
  Object.keys(report.by_regulation).sort().forEach((key) => lines.push('- ' + key + ': ' + report.by_regulation[key]));
  if (!Object.keys(report.by_regulation).length) lines.push('- None.');
  lines.push('');
  lines.push('## Source Gaps');
  lines.push('');
  Object.keys(report.source_gaps).sort().forEach((key) => lines.push('- ' + key + ': ' + report.source_gaps[key]));
  if (!Object.keys(report.source_gaps).length) lines.push('- None.');
  lines.push('');
  lines.push('## Replays');
  lines.push('');
  for (const replay of report.replays) {
    const meta = replay.source_metadata || {};
    const counts = meta.event_counts || {};
    const players = meta.players || {};
    lines.push('### ' + path.basename(meta.source_file || replay.id));
    lines.push('');
    lines.push('- ID: ' + replay.id);
    lines.push('- Title: ' + (meta.title || '-'));
    lines.push('- Regulation: ' + replay.regulation_id);
    lines.push('- Format: ' + replay.format);
    lines.push('- Players: ' + (players.p1 || 'p1') + ' vs ' + (players.p2 || 'p2'));
    lines.push('- Winner team id: ' + (replay.winner_team_id || '-'));
    lines.push('- Turns: ' + replay.turns);
    lines.push('- Moves: ' + Number(counts.moves || 0));
    lines.push('- Faints: ' + Number(counts.faints || 0));
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

const files = resolveInputs(process.argv.slice(2).filter(Boolean));
if (!files.length) {
  console.error('No Showdown HTML replay files found.');
  console.error('Default replay folder: ' + DEFAULT_REPLAY_DIR);
  console.error('Usage: npm run showdown:replays -- [--replay-dir /path/to/battles] [--latest] [file-or-folder ...]');
  process.exit(2);
}

const results = files.map(ingestFile);
const report = summarize(results);
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
fs.writeFileSync(OUT_MD, mdReport(report));
console.log('Wrote ' + path.relative(process.cwd(), OUT_JSON));
console.log('Wrote ' + path.relative(process.cwd(), OUT_MD));
console.log('Ingested ' + report.totals.successful + ' replay(s), failed ' + report.totals.failed + '.');
console.log('Default replay folder: ' + DEFAULT_REPLAY_DIR);
