#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPORT_DIR = path.join(ROOT, 'reports');
const DEFAULT_DROP_DIR = path.join(process.env.HOME || process.cwd(), 'Champions-QA-Drops');
const OUT_JSON = path.join(REPORT_DIR, 'codex-qa-context-latest.json');
const OUT_MD = path.join(REPORT_DIR, 'codex-qa-context-latest.md');

function isQaJsonFile(file) {
  const base = path.basename(file);
  return /\.json$/i.test(base) && (
    /^champions-sim-qa-artifact-/i.test(base) ||
    /^champions-turn-log-/i.test(base) ||
    /^champions.*qa.*artifact/i.test(base)
  );
}

function listQaFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'processed' || entry.name === 'archive') continue;
      out.push(...listQaFiles(full));
    } else if (entry.isFile() && isQaJsonFile(full)) {
      out.push(full);
    }
  }
  return out.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function resolveInputs(argv) {
  let dropDir = null;
  let latest = false;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--drop-dir') {
      dropDir = argv[++i] ? path.resolve(argv[i]) : DEFAULT_DROP_DIR;
    } else if (arg === '--latest') {
      latest = true;
    } else {
      files.push(path.resolve(arg));
    }
  }
  if (!files.length) {
    dropDir = dropDir || DEFAULT_DROP_DIR;
    fs.mkdirSync(dropDir, { recursive: true });
    const found = listQaFiles(dropDir);
    return latest && found.length ? [found[0]] : found;
  }
  const expanded = [];
  for (const file of files) {
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) expanded.push(...listQaFiles(file));
    else expanded.push(file);
  }
  return latest && expanded.length ? [expanded[0]] : expanded;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function number(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function deriveContext(payload, file) {
  if (payload && payload.codex_context && payload.codex_context.schema_version) {
    return Object.assign({}, payload.codex_context, {
      source_file: file
    });
  }
  const coverage = payload && payload.qa_coverage_summary || {};
  const mechanics = coverage.mechanics_seen || {};
  const missing = Array.isArray(coverage.missing_targeted_proof) ? coverage.missing_targeted_proof : [];
  const turnLog = Array.isArray(payload && payload.turnLog) ? payload.turnLog : [];
  let damageEvents = number(mechanics.damage_events);
  let effectEvents = number(mechanics.effect_events);
  let moveRuleTraceRows = number(mechanics.move_rule_trace_rows);
  if (!damageEvents && turnLog.length) {
    for (const turn of turnLog) {
      const damageRows = Array.isArray(turn && turn.damage_events) ? turn.damage_events : [];
      const effectRows = Array.isArray(turn && turn.effect_events) ? turn.effect_events : [];
      damageEvents += damageRows.length;
      effectEvents += effectRows.length;
      moveRuleTraceRows += damageRows.filter(row => row && row.move_rule_trace).length;
    }
  }
  return {
    schema_version: 'champions-codex-qa-context-v1',
    source_file: file,
    generated_at: new Date().toISOString(),
    artifact_identity: {
      schema_version: payload && payload.schema_version || 'unknown',
      build_id: payload && payload.build_id || null,
      source_url: payload && payload.source_url || null,
      player_team_id: payload && payload.player_team_id || null,
      opponent_team_id: payload && payload.opponent_team_id || null,
      current_format: payload && (payload.current_format || payload.format) || null
    },
    qa_readiness: [
      {
        id: 'move_rule_trace',
        label: 'Move rule trace layer',
        status: moveRuleTraceRows > 0 ? 'green' : 'yellow',
        detail: moveRuleTraceRows > 0 ? `${moveRuleTraceRows} move rule trace rows found.` : 'No move_rule_trace rows found.'
      },
      {
        id: 'damage_events',
        label: 'Damage transparency',
        status: damageEvents > 0 ? 'green' : 'red',
        detail: damageEvents > 0 ? `${damageEvents} damage_events found.` : 'No damage_events found.'
      },
      {
        id: 'effect_events',
        label: 'Effect transparency',
        status: effectEvents > 0 ? 'green' : 'yellow',
        detail: effectEvents > 0 ? `${effectEvents} effect_events found.` : 'No effect_events found.'
      }
    ],
    mechanics_seen: Object.assign({}, mechanics, {
      damage_events: damageEvents,
      effect_events: effectEvents,
      move_rule_trace_rows: moveRuleTraceRows
    }),
    missing_targeted_proof: missing,
    recommended_codex_prompt: 'Use this ingested QA context as evidence. Inspect source_file, qa_readiness, mechanics_seen, and missing_targeted_proof before changing simulator code.'
  };
}

function summarize(contexts) {
  const totals = {
    artifacts: contexts.length,
    damage_events: 0,
    effect_events: 0,
    move_rule_trace_rows: 0,
    red_items: 0,
    yellow_items: 0,
    green_items: 0
  };
  const missing = new Set();
  for (const ctx of contexts) {
    const mechanics = ctx.mechanics_seen || {};
    totals.damage_events += number(mechanics.damage_events);
    totals.effect_events += number(mechanics.effect_events);
    totals.move_rule_trace_rows += number(mechanics.move_rule_trace_rows);
    for (const item of ctx.qa_readiness || []) {
      if (item.status === 'red') totals.red_items += 1;
      else if (item.status === 'yellow') totals.yellow_items += 1;
      else if (item.status === 'green') totals.green_items += 1;
    }
    for (const gap of ctx.missing_targeted_proof || []) missing.add(gap);
  }
  return {
    schema_version: 'champions-codex-qa-ingest-v1',
    generated_at: new Date().toISOString(),
    totals,
    missing_targeted_proof: [...missing].sort(),
    contexts
  };
}

function mdReport(report) {
  const lines = [];
  lines.push('# Codex QA Context Latest');
  lines.push('');
  lines.push('- Generated at: ' + report.generated_at);
  lines.push('- Artifacts: ' + report.totals.artifacts);
  lines.push('- Damage events: ' + report.totals.damage_events);
  lines.push('- Effect events: ' + report.totals.effect_events);
  lines.push('- Move rule trace rows: ' + report.totals.move_rule_trace_rows);
  lines.push('- Readiness: green ' + report.totals.green_items + ' / yellow ' + report.totals.yellow_items + ' / red ' + report.totals.red_items);
  lines.push('');
  lines.push('## Missing Targeted Proof');
  lines.push('');
  if (report.missing_targeted_proof.length) {
    for (const gap of report.missing_targeted_proof) lines.push('- ' + gap);
  } else {
    lines.push('- None reported by ingested artifacts.');
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  for (const ctx of report.contexts) {
    const id = ctx.artifact_identity || {};
    lines.push('### ' + path.basename(ctx.source_file || 'artifact'));
    lines.push('');
    lines.push('- Build: ' + (id.build_id || '-'));
    lines.push('- Source URL: ' + (id.source_url || '-'));
    lines.push('- Player team: ' + (id.player_team_id || '-'));
    lines.push('- Opponent team: ' + (id.opponent_team_id || '-'));
    for (const item of ctx.qa_readiness || []) {
      lines.push('- ' + item.status.toUpperCase() + ': ' + item.label + ' - ' + item.detail);
    }
    lines.push('');
  }
  lines.push('## Codex Use');
  lines.push('');
  lines.push('When starting work, read this file first, then inspect the source artifact listed above if a readiness item is yellow/red.');
  return lines.join('\n') + '\n';
}

const args = process.argv.slice(2).filter(Boolean);
const files = resolveInputs(args);
if (!files.length) {
  console.error('No QA JSON files found.');
  console.error('Default drop folder: ' + DEFAULT_DROP_DIR);
  console.error('Usage: npm run codex:qa -- [--drop-dir /path/to/folder] [--latest] [file-or-folder ...]');
  process.exit(2);
}

const contexts = [];
for (const file of files) {
  const payload = readJson(file);
  contexts.push(deriveContext(payload, file));
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = summarize(contexts);
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
fs.writeFileSync(OUT_MD, mdReport(report));
console.log('Wrote ' + path.relative(process.cwd(), OUT_JSON));
console.log('Wrote ' + path.relative(process.cwd(), OUT_MD));
console.log('Ingested ' + contexts.length + ' artifact(s).');
console.log('Default drop folder: ' + DEFAULT_DROP_DIR);
