#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUT = path.join(ROOT, 'generated', 'pokemon_showdown_legal_data.js');

function argValue(name, fallback = '') {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

function toId(value) {
  return String(value == null ? '' : value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    if (value[key] !== undefined) acc[key] = sortObject(value[key]);
    return acc;
  }, {});
}

function clone(value) {
  return JSON.parse(JSON.stringify(value == null ? null : value));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function normalizeKind(kind) {
  const id = String(kind || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return {
    moves: 'move',
    move: 'move',
    species: 'species',
    pokedex: 'species',
    abilities: 'ability',
    ability: 'ability',
    items: 'item',
    item: 'item',
    typechart: 'typechart',
    aliases: 'alias',
    alias: 'alias',
    learnsets: 'learnset',
    learnset: 'learnset',
    formats: 'format',
    format: 'format'
  }[id] || id;
}

function collectionForKind(kind) {
  return {
    move: 'moves',
    species: 'species',
    ability: 'abilities',
    item: 'items',
    typechart: 'typechart',
    alias: 'aliases',
    learnset: 'learnsets',
    format: 'formats'
  }[kind] || `${kind}s`;
}

function rowsFromNestedEntities(payload) {
  const rows = [];
  const collections = ['moves', 'species', 'abilities', 'items', 'typechart', 'aliases', 'learnsets', 'formats'];
  for (const collection of collections) {
    const values = payload && payload[collection];
    if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    const kind = normalizeKind(collection);
    for (const [key, data] of Object.entries(values)) {
      rows.push({
        entity_kind: kind,
        entity_key: key,
        display_name: data && (data.displayName || data.name || data.move_name) || key,
        source_hash: '',
        approved: true,
        data
      });
    }
  }
  return rows;
}

function normalizeEntityRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  if (payload && Array.isArray(payload.entities)) return payload.entities;
  return rowsFromNestedEntities(payload || {});
}

function normalizeOverrideRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.overrides)) return payload.overrides;
  return [];
}

async function fetchRestRows(viewName, supabaseUrl, supabaseKey) {
  const rows = [];
  const pageSize = 1000;
  let start = 0;
  while (true) {
    const url = new URL(`/rest/v1/${viewName}`, supabaseUrl);
    url.searchParams.set('select', '*');
    url.searchParams.set(
      'order',
      viewName === 'approved_champions_data'
        ? 'entity_kind.asc,entity_key.asc,field_path.asc,created_at.asc,override_id.asc'
        : 'entity_kind.asc,entity_key.asc'
    );
    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        range: `${start}-${start + pageSize - 1}`
      }
    });
    if (!response.ok) {
      throw new Error(`${viewName} REST fetch failed: HTTP ${response.status} ${response.statusText}`);
    }
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${viewName} REST response was not an array`);
    rows.push(...page);
    if (page.length < pageSize) break;
    start += pageSize;
  }
  return rows;
}

function normalizeFlags(flags) {
  if (!flags) return '';
  if (typeof flags === 'string') {
    return flags.split('|').map((flag) => flag.trim()).filter(Boolean).sort().join('|');
  }
  if (Array.isArray(flags)) {
    return flags.map(String).filter(Boolean).sort().join('|');
  }
  if (typeof flags === 'object') {
    return Object.keys(flags).filter((key) => !!flags[key]).sort().join('|');
  }
  return '';
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.slice();
  if (typeof value === 'string') return value.split('|').map((part) => part.trim()).filter(Boolean);
  return [];
}

function normalizeMove(key, displayName, data) {
  const id = toId(firstDefined(data.move_id, data.id, key));
  const name = firstDefined(data.move_name, data.name, displayName, key);
  const basePower = firstDefined(data.base_power, data.basePower, data.basepower);
  return sortObject(Object.assign({}, data, {
    id,
    move_id: id,
    name,
    move_name: name,
    type: firstDefined(data.type, ''),
    category: firstDefined(data.category, ''),
    basePower: firstDefined(basePower, ''),
    base_power: firstDefined(basePower, ''),
    accuracy: firstDefined(data.accuracy, ''),
    pp: firstDefined(data.pp, ''),
    priority: firstDefined(data.priority, 0),
    target: firstDefined(data.target, ''),
    flags: normalizeFlags(data.flags),
    recoil: firstDefined(data.recoil, null),
    shortDesc: firstDefined(data.shortDesc, data.short_desc, ''),
    short_desc: firstDefined(data.short_desc, data.shortDesc, ''),
    desc: firstDefined(data.desc, '')
  }));
}

function normalizeSpecies(key, displayName, data) {
  const id = toId(firstDefined(data.id, key));
  const speciesKey = firstDefined(data.speciesKey, data.species_key, data.name, displayName, key);
  return sortObject(Object.assign({}, data, {
    id,
    speciesKey,
    displayName: firstDefined(data.displayName, data.display_name, data.name, displayName, speciesKey),
    baseSpecies: firstDefined(data.baseSpecies, data.base_species, speciesKey),
    forme: firstDefined(data.forme, ''),
    gender: firstDefined(data.gender, data.gender_lock, ''),
    learnsetId: firstDefined(data.learnsetId, data.learnset_id, id),
    inheritedFrom: firstDefined(data.inheritedFrom, data.inherited_from, ''),
    stats: firstDefined(data.stats, null),
    types: normalizeArray(data.types),
    weightkg: firstDefined(data.weightkg, data.weight_kg, data.weightKg, ''),
    requiredItem: firstDefined(data.requiredItem, data.required_item, ''),
    moves: firstDefined(data.moves, {})
  }));
}

function normalizeGeneric(key, displayName, data) {
  return sortObject(Object.assign({}, data, {
    id: firstDefined(data.id, key),
    name: firstDefined(data.name, data.displayName, data.display_name, displayName, key)
  }));
}

function setPath(target, fieldPath, value) {
  const parts = String(fieldPath || '').split('.').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return false;
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
  return true;
}

function buildRuntime(entityRows, overrideRows, options) {
  const warnings = [];
  const entitiesByKey = new Map();
  const approvedRows = normalizeEntityRows(entityRows)
    .filter((row) => row && row.approved !== false)
    .sort((a, b) => {
      const ak = `${normalizeKind(a.entity_kind || a.entityKind || a.kind)}:${toId(a.entity_key || a.entityKey || a.key || a.id)}`;
      const bk = `${normalizeKind(b.entity_kind || b.entityKind || b.kind)}:${toId(b.entity_key || b.entityKey || b.key || b.id)}`;
      return ak.localeCompare(bk);
    });

  for (const row of approvedRows) {
    const data = clone(row.data || {});
    const kind = normalizeKind(row.entity_kind || row.entityKind || row.kind || data.kind);
    const key = toId(row.entity_key || row.entityKey || row.key || data.id || data.name);
    if (!kind || !key) {
      warnings.push(`Skipped approved row with missing kind/key: ${JSON.stringify(row).slice(0, 120)}`);
      continue;
    }
    const displayName = firstDefined(row.display_name, row.displayName, data.displayName, data.name, key);
    entitiesByKey.set(`${kind}:${key}`, {kind, key, displayName, data});
  }

  let appliedOverrideCount = 0;
  const activeOverrides = normalizeOverrideRows(overrideRows)
    .filter((row) => row && (row.status || 'active') === 'active')
    .sort((a, b) => {
      const ak = `${normalizeKind(a.entity_kind || a.entityKind || a.kind)}:${toId(a.entity_key || a.entityKey || a.key)}:${a.field_path || a.fieldPath || ''}`;
      const bk = `${normalizeKind(b.entity_kind || b.entityKind || b.kind)}:${toId(b.entity_key || b.entityKey || b.key)}:${b.field_path || b.fieldPath || ''}`;
      return ak.localeCompare(bk);
    });

  const activeOverrideSubjects = new Set();
  for (const override of activeOverrides) {
    const subject = `${normalizeKind(override.entity_kind || override.entityKind || override.kind)}:${toId(override.entity_key || override.entityKey || override.key)}:${override.field_path || override.fieldPath || ''}`;
    if (activeOverrideSubjects.has(subject)) {
      throw new Error(`Multiple active Champions overrides target ${subject}`);
    }
    activeOverrideSubjects.add(subject);
  }

  for (const override of activeOverrides) {
    const kind = normalizeKind(override.entity_kind || override.entityKind || override.kind);
    const key = toId(override.entity_key || override.entityKey || override.key);
    const fieldPath = override.field_path || override.fieldPath;
    const target = entitiesByKey.get(`${kind}:${key}`);
    if (!target) {
      warnings.push(`Skipped override for missing approved entity ${kind}:${key}`);
      continue;
    }
    if (!setPath(target.data, fieldPath, clone(override.override_value ?? override.overrideValue))) {
      warnings.push(`Skipped override with missing field path for ${kind}:${key}`);
      continue;
    }
    appliedOverrideCount += 1;
  }

  const runtime = {
    source: 'Supabase approved Showdown entities + Champions overrides',
    sourceRepository: 'https://github.com/smogon/pokemon-showdown',
    sourceCommitOrVersion: options.sourceVersion || 'approved-db',
    generatedAt: options.generatedAt,
    dataSource: 'approved-db',
    meta: {
      approvedEntityCount: entitiesByKey.size,
      activeOverrideCount: activeOverrides.length,
      appliedOverrideCount,
      warnings
    },
    species: {},
    moves: {},
    abilities: {},
    items: {},
    typechart: {},
    aliases: {},
    learnsets: {},
    formats: {}
  };

  for (const entity of Array.from(entitiesByKey.values()).sort((a, b) => `${a.kind}:${a.key}`.localeCompare(`${b.kind}:${b.key}`))) {
    const collection = collectionForKind(entity.kind);
    if (!runtime[collection]) runtime[collection] = {};
    if (entity.kind === 'move') runtime[collection][entity.key] = normalizeMove(entity.key, entity.displayName, entity.data);
    else if (entity.kind === 'species') runtime[collection][entity.displayName] = normalizeSpecies(entity.key, entity.displayName, entity.data);
    else runtime[collection][entity.key] = normalizeGeneric(entity.key, entity.displayName, entity.data);
  }

  return sortObject(runtime);
}

async function writeRuntime(file, runtime) {
  await fs.mkdir(path.dirname(file), {recursive: true});
  const body = [
    '(function(root){',
    `  var data = ${JSON.stringify(runtime)};`,
    '  root.ChampionsSim = root.ChampionsSim || {};',
    '  root.ChampionsSim.pokemonDataAudit = data;',
    '  if (typeof module !== "undefined" && module.exports) module.exports = data;',
    '})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));',
    ''
  ].join('\n');
  await fs.writeFile(file, body, 'utf8');
}

async function loadInputs() {
  const entitiesPath = argValue('--entities', '');
  const overridesPath = argValue('--overrides', '');
  if (entitiesPath) {
    return {
      entityRows: await readJson(path.resolve(entitiesPath)),
      overrideRows: overridesPath ? await readJson(path.resolve(overridesPath)) : []
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Provide --entities <json> or set SUPABASE_URL and SUPABASE_ANON_KEY to read approved Supabase views.');
  }
  return {
    entityRows: await fetchRestRows('approved_showdown_entities', supabaseUrl, supabaseKey),
    overrideRows: await fetchRestRows('approved_champions_data', supabaseUrl, supabaseKey)
  };
}

async function main() {
  const outPath = path.resolve(argValue('--out', DEFAULT_OUT));
  const generatedAt = argValue('--generated-at', new Date().toISOString());
  const sourceVersion = argValue('--source-version', '');
  const {entityRows, overrideRows} = await loadInputs();
  const runtime = buildRuntime(entityRows, overrideRows, {generatedAt, sourceVersion});
  if (!runtime.meta.approvedEntityCount) throw new Error('No approved entity rows were available to generate runtime data.');
  await writeRuntime(outPath, runtime);
  console.log(`Wrote approved runtime data -> ${outPath}`);
  console.log(`Approved entities: ${runtime.meta.approvedEntityCount}`);
  console.log(`Applied overrides: ${runtime.meta.appliedOverrideCount}/${runtime.meta.activeOverrideCount}`);
  if (runtime.meta.warnings.length) {
    console.log(`Warnings: ${runtime.meta.warnings.length}`);
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
