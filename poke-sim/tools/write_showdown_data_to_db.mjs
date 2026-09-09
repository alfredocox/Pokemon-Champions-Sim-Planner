#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'showdown-sync');
const APPROVAL_DISABLED = 'Showdown approval is disabled. Promotion of an exact reviewed sync-run ID and SHA-256 digest is not implemented; this writer only stages unapproved rows. No automatic approval is available.';
const ENTITY_KINDS = ['species', 'move', 'ability', 'item', 'typechart', 'alias', 'learnset', 'format'];
const COLLECTION_KIND = {
  species: 'species',
  moves: 'move',
  abilities: 'ability',
  items: 'item',
  typechart: 'typechart',
  aliases: 'alias',
  learnsets: 'learnset',
  formats: 'format'
};
const KIND_COLLECTION = Object.entries(COLLECTION_KIND).reduce((acc, [collection, kind]) => {
  acc[kind] = collection;
  return acc;
}, {});

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function toId(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function stableId(...parts) {
  return parts.map((part) => String(part == null ? '' : part).replace(/[^a-zA-Z0-9_.:-]+/g, '_')).join(':');
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function countEntities(entities) {
  return Object.entries(COLLECTION_KIND).reduce((acc, [collection, kind]) => {
    acc[kind] = Object.keys((entities && entities[collection]) || {}).length;
    return acc;
  }, {});
}

function displayNameFor(kind, key, data) {
  if (kind === 'move') return firstDefined(data.name, data.move_name, data.moveName, key);
  if (kind === 'species') return firstDefined(data.displayName, data.speciesKey, data.name, key);
  if (kind === 'alias') return key;
  return firstDefined(data.name, data.displayName, data.display_name, key);
}

function entityHashesForKind(entityHashes, kind) {
  const entities = entityHashes && entityHashes.entities;
  if (!entities) return {};
  return entities[kind] || entities[KIND_COLLECTION[kind]] || {};
}

function buildSyncRunRow({syncRunId, report, sourceVersion}) {
  const totals = report && report.changeSummary ? report.changeSummary.totals : {};
  return {
    sync_run_id: syncRunId,
    started_at: report.startedAt || new Date().toISOString(),
    finished_at: report.finishedAt || new Date().toISOString(),
    status: report.status === 'passed' ? 'passed' : (report.status === 'failed' ? 'failed' : 'blocked'),
    upstream_ref: sourceVersion || report.baseUrl || 'https://play.pokemonshowdown.com/data/',
    workflow_run_id: process.env.GITHUB_RUN_ID || null,
    summary: {
      schemaVersion: report.schemaVersion || 1,
      manifestVersion: report.manifestVersion || 1,
      baseUrl: report.baseUrl || '',
      kindHashes: report.kindHashes || {},
      entityTotals: Object.fromEntries(Object.entries(totals).map(([kind, row]) => [kind, row.current])),
      validationFindings: report.validationFindings || [],
      approvedOnWrite: false
    }
  };
}

function buildSourceFileRows(syncRunId, sourceFiles) {
  return (sourceFiles || []).map((file) => ({
    sync_run_id: syncRunId,
    source_name: file.name,
    source_url: file.url,
    source_hash: file.sourceHash || '',
    normalized_hash: file.normalizedHash || null,
    byte_size: file.byteSize || 0,
    parse_status: file.status === 'passed' ? 'passed' : 'failed',
    parse_error: file.error || null,
    fetched_at: file.fetchedAt || new Date().toISOString()
  }));
}

function buildEntityRows({syncRunId, entities, entityHashes}) {
  const rows = [];
  for (const [collection, kind] of Object.entries(COLLECTION_KIND)) {
    const rowsForKind = (entities && entities[collection]) || {};
    const hashesForKind = entityHashesForKind(entityHashes, kind);
    for (const [key, data] of Object.entries(rowsForKind)) {
      const entityKey = toId(key);
      rows.push({
        entity_id: stableId(syncRunId, kind, entityKey),
        sync_run_id: syncRunId,
        entity_kind: kind,
        entity_key: entityKey,
        display_name: displayNameFor(kind, key, data || {}),
        source_hash: hashesForKind[key] || hashesForKind[entityKey] || '',
        data: data || {},
        approved: false,
        approved_at: null
      });
    }
  }
  return rows.sort((a, b) => `${a.entity_kind}:${a.entity_key}`.localeCompare(`${b.entity_kind}:${b.entity_key}`));
}

function buildDiffRows({syncRunId, entities, entityHashes, changeSummary}) {
  const diffs = [];
  const changed = (changeSummary && changeSummary.changed) || {};
  const added = (changeSummary && changeSummary.added) || {};
  const removed = (changeSummary && changeSummary.removed) || {};
  const allKinds = Array.from(new Set([...Object.keys(changed), ...Object.keys(added), ...Object.keys(removed)])).filter((kind) => ENTITY_KINDS.includes(kind));
  for (const kind of allKinds) {
    const collection = KIND_COLLECTION[kind];
    const rowsForKind = (entities && entities[collection]) || {};
    const hashesForKind = entityHashesForKind(entityHashes, kind);
    for (const diffType of ['added', 'changed', 'removed']) {
      const list = (({added, changed, removed})[diffType] || {})[kind] || [];
      for (const key of list) {
        const entityKey = toId(key);
        const currentData = diffType === 'removed' ? null : (rowsForKind[key] || rowsForKind[entityKey] || null);
        const currentHash = diffType === 'removed' ? null : (hashesForKind[key] || hashesForKind[entityKey] || null);
        diffs.push({
          diff_id: stableId(syncRunId, kind, entityKey, diffType),
          sync_run_id: syncRunId,
          entity_kind: kind,
          entity_key: entityKey,
          diff_type: diffType,
          previous_hash: null,
          current_hash: currentHash,
          previous_data: null,
          current_data: currentData,
          review_status: 'pending'
        });
      }
    }
  }
  return diffs.sort((a, b) => `${a.entity_kind}:${a.entity_key}:${a.diff_type}`.localeCompare(`${b.entity_kind}:${b.entity_key}:${b.diff_type}`));
}

export async function loadArtifactInputs(artifactDir = DEFAULT_ARTIFACT_DIR) {
  const root = path.resolve(artifactDir);
  return {
    report: await readJson(path.join(root, 'report.json')),
    sourceFiles: await readJson(path.join(root, 'source_files.json')),
    entities: await readJson(path.join(root, 'normalized', 'entities.json')),
    entityHashes: await readJson(path.join(root, 'normalized', 'entity_hashes.json')),
    changeSummary: await readJson(path.join(root, 'normalized', 'change_summary.json'))
  };
}

export function buildDbPayload(inputs, options = {}) {
  if (options.approve) throw new Error(APPROVAL_DISABLED);
  const reportId = (inputs.report.startedAt || new Date().toISOString()).replace(/[^0-9TZ]+/g, '').replace(/Z$/, 'Z');
  const syncRunId = options.syncRunId || `showdown_${reportId}`;
  const sourceVersion = options.sourceVersion || '';
  const syncRun = buildSyncRunRow({syncRunId, report: inputs.report, sourceVersion});
  const sourceFiles = buildSourceFileRows(syncRunId, inputs.sourceFiles);
  const entities = buildEntityRows({syncRunId, entities: inputs.entities, entityHashes: inputs.entityHashes});
  const diffs = buildDiffRows({
    syncRunId,
    entities: inputs.entities,
    entityHashes: inputs.entityHashes,
    changeSummary: inputs.changeSummary
  });
  return {
    syncRunId,
    approve: false,
    counts: {
      sourceFiles: sourceFiles.length,
      entities: entities.length,
      diffs: diffs.length,
      byKind: countEntities(inputs.entities)
    },
    rows: {
      showdown_sync_runs: [syncRun],
      showdown_source_files: sourceFiles,
      showdown_entities: entities,
      showdown_entity_diffs: diffs
    }
  };
}

async function postgrestUpsert({supabaseUrl, supabaseKey, table, rows, conflictColumns}) {
  if (!rows.length) return {table, count: 0};
  const pageSize = Number(argValue('--batch-size', '500')) || 500;
  let written = 0;
  for (let start = 0; start < rows.length; start += pageSize) {
    const chunk = rows.slice(start, start + pageSize);
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.searchParams.set('on_conflict', conflictColumns.join(','));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(chunk)
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${table} upsert failed: HTTP ${response.status} ${response.statusText} ${body}`);
    }
    written += chunk.length;
  }
  return {table, count: written};
}

async function writePayload(payload) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_DB_WRITE_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_DB_WRITE_KEY) to write Showdown rows.');
  }
  const steps = [
    ['showdown_sync_runs', payload.rows.showdown_sync_runs, ['sync_run_id']],
    ['showdown_source_files', payload.rows.showdown_source_files, ['sync_run_id', 'source_name']],
    ['showdown_entities', payload.rows.showdown_entities, ['entity_id']],
    ['showdown_entity_diffs', payload.rows.showdown_entity_diffs, ['diff_id']]
  ];
  const results = [];
  for (const [table, rows, conflictColumns] of steps) {
    results.push(await postgrestUpsert({supabaseUrl, supabaseKey, table, rows, conflictColumns}));
  }
  return results;
}

async function main() {
  // Reject the removed option before artifact reads, credentials, or network use.
  if (process.argv.slice(2).some(arg => arg === '--approve' || arg.startsWith('--approve='))) {
    throw new Error(APPROVAL_DISABLED);
  }
  const artifactDir = argValue('--artifact-dir', DEFAULT_ARTIFACT_DIR);
  const dryRun = hasFlag('--dry-run');
  const json = hasFlag('--json');
  const syncRunId = argValue('--sync-run-id', '');
  const sourceVersion = argValue('--source-version', '');
  const inputs = await loadArtifactInputs(artifactDir);
  const payload = buildDbPayload(inputs, {syncRunId, sourceVersion});
  if (dryRun) {
    if (json) {
      process.stdout.write(`${JSON.stringify({syncRunId: payload.syncRunId, approve: payload.approve, counts: payload.counts}, null, 2)}\n`);
    } else {
      console.log(`Showdown DB dry run: ${payload.syncRunId}`);
      console.log(`Source files: ${payload.counts.sourceFiles}`);
      console.log(`Entities: ${payload.counts.entities}`);
      console.log(`Diffs: ${payload.counts.diffs}`);
      console.log(`Approve on write: ${payload.approve ? 'yes' : 'no'}`);
    }
    return;
  }
  const results = await writePayload(payload);
  console.log(`Wrote Showdown sync run ${payload.syncRunId} to Supabase.`);
  for (const result of results) {
    console.log(`  ${result.table}: ${result.count}`);
  }
  console.log('Rows were staged unapproved. ' + APPROVAL_DISABLED);
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === __filename;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}
