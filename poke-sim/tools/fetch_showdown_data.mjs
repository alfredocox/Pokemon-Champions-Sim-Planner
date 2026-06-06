#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_MANIFEST = path.join(__dirname, 'showdown_sources.json');
const DEFAULT_OUT = path.join(ROOT, 'artifacts', 'showdown-sync');

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function toId(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = sortObject(value[key]);
    return acc;
  }, {});
}

function stableJson(value) {
  return JSON.stringify(sortObject(value));
}

function loadShowdownExports(source, filename) {
  const context = vm.createContext({exports: {}});
  const script = new vm.Script(source, {filename});
  script.runInContext(context, {timeout: 5000});
  return context.exports || {};
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, {recursive: true});
}

async function readJsonIfExists(file) {
  try {
    return await readJson(file);
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Pokemon-Champions-Sim-Planner showdown sync'
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function getExportName(sourceName) {
  return {
    pokedex: 'BattlePokedex',
    moves: 'BattleMovedex',
    abilities: 'BattleAbilities',
    items: 'BattleItems',
    typechart: 'BattleTypeChart',
    aliases: 'BattleAliases',
    learnsets: 'BattleLearnsets',
    'formats-data': 'BattleFormatsData'
  }[sourceName];
}

function normalizeLearnsets(rawLearnsets) {
  const learnsets = {};
  for (const [id, row] of Object.entries(rawLearnsets || {}).sort(([a], [b]) => a.localeCompare(b))) {
    const moveMap = row && row.learnset ? row.learnset : {};
    learnsets[id] = Object.keys(moveMap).sort().reduce((acc, moveId) => {
      acc[moveId] = moveMap[moveId];
      return acc;
    }, {});
  }
  return learnsets;
}

function resolveLearnset(id, row, learnsets) {
  const candidates = [
    id,
    toId(row.learnsetId),
    toId(row.baseSpecies),
    toId(row.changesFrom),
    toId(row.battleOnly)
  ].filter(Boolean);
  const learnsetId = candidates.find((candidate) => learnsets[candidate]) || id;
  return {
    learnsetId,
    inheritedFrom: learnsetId === id ? '' : (row.baseSpecies || row.changesFrom || row.battleOnly || '')
  };
}

function inheritedSpeciesValue(rawPokedex, id, row, key, fallback) {
  const seen = new Set([id]);
  let current = row || {};
  for (let i = 0; i < 8; i++) {
    const value = current[key];
    if (Array.isArray(value) && value.length) return value;
    if (value && typeof value === 'object' && Object.keys(value).length) return value;
    if (value !== undefined && value !== null && value !== '') return value;
    const nextId = toId(current.changesFrom || current.baseSpecies || current.battleOnly);
    if (!nextId || seen.has(nextId) || !rawPokedex[nextId]) break;
    seen.add(nextId);
    current = rawPokedex[nextId];
  }
  return fallback;
}

function normalizeSpecies(rawPokedex, learnsets) {
  const species = {};
  for (const [id, row] of Object.entries(rawPokedex || {}).sort(([a], [b]) => a.localeCompare(b))) {
    const resolved = resolveLearnset(id, row || {}, learnsets);
    const moves = learnsets[resolved.learnsetId] || {};
    const types = inheritedSpeciesValue(rawPokedex, id, row || {}, 'types', []);
    const stats = inheritedSpeciesValue(rawPokedex, id, row || {}, 'baseStats', {});
    const abilities = inheritedSpeciesValue(rawPokedex, id, row || {}, 'abilities', {});
    species[id] = {
      id,
      speciesKey: row.name || id,
      displayName: row.name || id,
      num: row.num || 0,
      baseSpecies: row.baseSpecies || row.name || id,
      forme: row.forme || row.baseForme || '',
      gender: row.gender || '',
      types: Array.isArray(types) ? types.slice() : [],
      stats,
      abilities,
      requiredItem: row.requiredItem || '',
      requiredMove: row.requiredMove || '',
      battleOnly: row.battleOnly || '',
      changesFrom: row.changesFrom || '',
      tier: row.tier || '',
      isNonstandard: row.isNonstandard || '',
      learnsetId: resolved.learnsetId,
      inheritedFrom: resolved.inheritedFrom,
      moveCount: Object.keys(moves).length,
      moves
    };
  }
  return species;
}

function normalizeMoves(rawMoves) {
  const moves = {};
  for (const [id, row] of Object.entries(rawMoves || {}).sort(([a], [b]) => a.localeCompare(b))) {
    moves[id] = {
      id,
      name: row.name || id,
      num: row.num || 0,
      type: row.type || '',
      category: row.category || '',
      basePower: row.basePower,
      accuracy: row.accuracy,
      pp: row.pp,
      priority: row.priority || 0,
      target: row.target || '',
      flags: row.flags || {},
      status: row.status || '',
      volatileStatus: row.volatileStatus || '',
      sideCondition: row.sideCondition || '',
      slotCondition: row.slotCondition || '',
      pseudoWeather: row.pseudoWeather || '',
      boosts: row.boosts || null,
      secondary: row.secondary || null,
      secondaries: row.secondaries || null,
      self: row.self || null,
      drain: row.drain || null,
      recoil: row.recoil || null,
      multihit: row.multihit || null,
      critRatio: row.critRatio || 1,
      willCrit: !!row.willCrit,
      hasCrashDamage: !!row.hasCrashDamage,
      selfSwitch: row.selfSwitch || false,
      isNonstandard: row.isNonstandard || '',
      shortDesc: row.shortDesc || ''
    };
  }
  return moves;
}

function normalizeSimple(raw, mapper) {
  const out = {};
  for (const [id, row] of Object.entries(raw || {}).sort(([a], [b]) => a.localeCompare(b))) {
    out[id] = mapper(id, row || {});
  }
  return out;
}

function normalizeAll(exported) {
  const learnsets = normalizeLearnsets(exported.learnsets);
  return {
    species: normalizeSpecies(exported.pokedex, learnsets),
    moves: normalizeMoves(exported.moves),
    abilities: normalizeSimple(exported.abilities, (id, row) => ({
      id,
      name: row.name || id,
      rating: row.rating ?? null,
      isNonstandard: row.isNonstandard || '',
      shortDesc: row.shortDesc || '',
      desc: row.desc || ''
    })),
    items: normalizeSimple(exported.items, (id, row) => ({
      id,
      name: row.name || id,
      num: row.num || 0,
      fling: row.fling || null,
      megaStone: row.megaStone || '',
      megaEvolves: row.megaEvolves || '',
      isBerry: !!row.isBerry,
      isNonstandard: row.isNonstandard || '',
      shortDesc: row.shortDesc || ''
    })),
    typechart: normalizeSimple(exported.typechart, (id, row) => ({
      id,
      name: row.name || id,
      damageTaken: row.damageTaken || {},
      HPivs: row.HPivs || null,
      HPdvs: row.HPdvs || null
    })),
    aliases: normalizeSimple(exported.aliases, (id, row) => ({
      id,
      target: row
    })),
    learnsets,
    formats: normalizeSimple(exported.formats, (id, row) => ({
      id,
      tier: row.tier || '',
      doublesTier: row.doublesTier || '',
      natDexTier: row.natDexTier || '',
      isNonstandard: row.isNonstandard || ''
    }))
  };
}

function validateEntities(entities) {
  const findings = [];
  for (const [id, row] of Object.entries(entities.species || {})) {
    if (!row.types.length) findings.push({severity: 'high', kind: 'species', id, message: 'missing types'});
    const statKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const missingStats = statKeys.filter((key) => typeof row.stats[key] !== 'number');
    if (missingStats.length) findings.push({severity: 'high', kind: 'species', id, message: `missing stats: ${missingStats.join(', ')}`});
  }
  for (const [id, row] of Object.entries(entities.moves || {})) {
    if (!row.name) findings.push({severity: 'medium', kind: 'move', id, message: 'missing name'});
    if (!row.type) findings.push({severity: 'high', kind: 'move', id, message: 'missing type'});
    if (!row.category) findings.push({severity: 'high', kind: 'move', id, message: 'missing category'});
    if (!row.target) findings.push({severity: 'medium', kind: 'move', id, message: 'missing target'});
  }
  for (const [id, row] of Object.entries(entities.aliases || {})) {
    if (!toId(row.target)) findings.push({severity: 'low', kind: 'alias', id, message: 'alias target normalizes to empty id'});
  }
  return findings;
}

function hashEntities(entities) {
  const hashes = {};
  const kindHashes = {};
  for (const [kind, rows] of Object.entries(entities)) {
    hashes[kind] = {};
    for (const [id, row] of Object.entries(rows || {})) {
      hashes[kind][id] = sha256(stableJson(row));
    }
    kindHashes[kind] = sha256(stableJson(hashes[kind]));
  }
  return {hashes, kindHashes};
}

function diffEntityHashes(current, previous) {
  const summary = {
    hasPrevious: !!previous,
    totals: {},
    added: {},
    removed: {},
    changed: {}
  };
  const previousHashes = previous && previous.entities ? previous.entities : {};
  const kinds = Array.from(new Set([...Object.keys(current), ...Object.keys(previousHashes)])).sort();
  for (const kind of kinds) {
    const now = current[kind] || {};
    const before = previousHashes[kind] || {};
    const added = Object.keys(now).filter((id) => !before[id]).sort();
    const removed = Object.keys(before).filter((id) => !now[id]).sort();
    const changed = Object.keys(now).filter((id) => before[id] && before[id] !== now[id]).sort();
    summary.added[kind] = added;
    summary.removed[kind] = removed;
    summary.changed[kind] = changed;
    summary.totals[kind] = {
      current: Object.keys(now).length,
      previous: Object.keys(before).length,
      added: added.length,
      removed: removed.length,
      changed: changed.length
    };
  }
  return summary;
}

async function main() {
  const manifestPath = path.resolve(argValue('--manifest', DEFAULT_MANIFEST));
  const outDir = path.resolve(argValue('--out', DEFAULT_OUT));
  const previousPath = argValue('--previous', '');
  const manifest = await readJson(manifestPath);
  const baseUrl = manifest.baseUrl.endsWith('/') ? manifest.baseUrl : `${manifest.baseUrl}/`;
  const startedAt = new Date().toISOString();
  const rawDir = path.join(outDir, 'raw');
  const normalizedDir = path.join(outDir, 'normalized');
  await ensureDir(rawDir);
  await ensureDir(normalizedDir);

  const files = [];
  const exported = {};
  let failed = false;

  for (const source of manifest.sources || []) {
    const url = new URL(source.path, baseUrl).toString();
    const fetchedAt = new Date().toISOString();
    const record = {
      name: source.name,
      kind: source.kind,
      required: !!source.required,
      path: source.path,
      url,
      fetchedAt,
      status: 'pending'
    };

    try {
      const body = await fetchText(url);
      const rawPath = path.join(rawDir, source.path.replace(/[\\/]/g, '_'));
      await fs.writeFile(rawPath, body, 'utf8');
      record.status = 'passed';
      record.byteSize = Buffer.byteLength(body, 'utf8');
      record.sourceHash = sha256(body);
      record.rawArtifact = path.relative(outDir, rawPath).replace(/\\/g, '/');
      const exportName = getExportName(source.name);
      if (exportName) {
        const sourceExports = loadShowdownExports(body, source.path);
        exported[source.name === 'formats-data' ? 'formats' : source.name] = sourceExports[exportName] || {};
      }
    } catch (error) {
      record.status = 'failed';
      record.error = error && error.message ? error.message : String(error);
      if (source.required) failed = true;
    }

    files.push(record);
  }

  const entities = normalizeAll(exported);
  const validationFindings = validateEntities(entities);
  if (validationFindings.some((finding) => finding.severity === 'high')) failed = true;
  const {hashes: entityHashes, kindHashes} = hashEntities(entities);
  const previous = previousPath ? await readJsonIfExists(path.resolve(previousPath)) : null;
  const changeSummary = diffEntityHashes(entityHashes, previous);

  for (const record of files) {
    if (record.status === 'passed' && kindHashes[record.kind]) {
      record.normalizedHash = kindHashes[record.kind];
    }
  }

  const finishedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    manifestVersion: manifest.version || 1,
    startedAt,
    finishedAt,
    status: failed ? 'failed' : 'passed',
    baseUrl,
    kindHashes,
    validationFindings,
    changeSummary,
    files
  };

  await fs.writeFile(path.join(normalizedDir, 'entities.json'), `${JSON.stringify(sortObject(entities), null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(normalizedDir, 'entity_hashes.json'),
    `${JSON.stringify({schemaVersion: 1, generatedAt: finishedAt, kindHashes, entities: entityHashes}, null, 2)}\n`,
    'utf8'
  );
  await fs.writeFile(path.join(normalizedDir, 'change_summary.json'), `${JSON.stringify(changeSummary, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(normalizedDir, 'validation_findings.json'), `${JSON.stringify(validationFindings, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    path.join(outDir, 'source_files.json'),
    `${JSON.stringify(files.map(({name, kind, required, path: sourcePath, url, status, byteSize, sourceHash, normalizedHash, error}) => ({
      name,
      kind,
      required,
      path: sourcePath,
      url,
      status,
      byteSize,
      sourceHash,
      normalizedHash,
      error
    })), null, 2)}\n`,
    'utf8'
  );

  const changeCounts = Object.values(changeSummary.totals).reduce((acc, row) => {
    acc.added += row.added;
    acc.removed += row.removed;
    acc.changed += row.changed;
    return acc;
  }, {added: 0, removed: 0, changed: 0});
  console.log(`Showdown sync ${report.status}: ${files.filter((f) => f.status === 'passed').length}/${files.length} source(s) fetched.`);
  console.log(`Mapped entities: ${Object.entries(changeSummary.totals).map(([kind, row]) => `${kind}=${row.current}`).join(', ')}`);
  console.log(`Entity diff: +${changeCounts.added} -${changeCounts.removed} ~${changeCounts.changed}${changeSummary.hasPrevious ? '' : ' (no previous baseline)'}`);
  if (validationFindings.length) console.log(`Mapping validation findings: ${validationFindings.length}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
