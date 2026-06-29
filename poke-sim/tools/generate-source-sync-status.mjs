import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GENERATED_DATA = path.join(ROOT, 'generated', 'pokemon_showdown_legal_data.js');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUTPUT = path.join(ROOT, 'generated', 'source_sync_status.js');

function readBuildId() {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');
  const match = html.match(/id="build-version"[^>]*>([^<]+)</);
  return match ? match[1].trim() : 'unknown-build';
}

function loadAuditData() {
  const src = fs.readFileSync(GENERATED_DATA, 'utf8');
  const ctx = {
    console,
    ChampionsSim: {},
    window: {},
    globalThis: {}
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: GENERATED_DATA });
  return ctx.ChampionsSim && ctx.ChampionsSim.pokemonDataAudit ? ctx.ChampionsSim.pokemonDataAudit : null;
}

const audit = loadAuditData() || {};
const buildId = readBuildId();

const payload = {
  buildId,
  generatedAt: new Date().toISOString(),
  sourcesPageReviewedAt: '2026-06-28T00:00:00Z',
  generatedShowdown: {
    source: audit.source || audit.dataSource || 'Unknown generated source',
    sourceCommitOrVersion: audit.sourceCommitOrVersion || 'unknown',
    generatedAt: audit.generatedAt || null,
    approvedEntityCount: audit.meta && Number(audit.meta.approvedEntityCount || 0) || 0,
    activeOverrideCount: audit.meta && Number(audit.meta.activeOverrideCount || 0) || 0
  },
  approvedDb: {
    generatedAt: audit.generatedAt || null,
    sourceCommitOrVersion: audit.sourceCommitOrVersion || 'unknown',
    approvedEntityCount: audit.meta && Number(audit.meta.approvedEntityCount || 0) || 0,
    activeOverrideCount: audit.meta && Number(audit.meta.activeOverrideCount || 0) || 0,
    syncRunId: null
  },
  reviewTracks: {
    regulationLabel: 'Reg M-B review lane',
    regulationReviewAt: '2026-06-27T00:00:00Z'
  }
};

const output = `(function(root){\n` +
`  'use strict';\n` +
`  root.ChampionsSim = root.ChampionsSim || {};\n` +
`  root.ChampionsSim.sourceSyncStatus = ${JSON.stringify(payload, null, 2)};\n` +
`})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));\n`;

fs.writeFileSync(OUTPUT, output, 'utf8');
console.log(`Wrote ${OUTPUT}`);
