import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(HERE, 'champions_source_inventory.json');
const defaultOutput = path.join(HERE, '..', 'reports', 'champions-source-inventory-latest.json');
const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg ? path.resolve(process.cwd(), outputArg.slice('--output='.length)) : defaultOutput;
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function textMeta(buffer, contentType) {
  if (!/html|text|json|xml/i.test(contentType || '')) return {};
  const sourceText = buffer.toString('utf8');
  const title = sourceText.match(/<title[^>]*>([^<]+)<\/title>/i);
  const modified = sourceText.match(/<meta[^>]+name=["']pkm-modified-date["'][^>]+content=["']([^"']+)/i);
  const canonical = sourceText.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  return {
    title: title ? title[1].replace(/\s+/g, ' ').trim() : null,
    source_modified_at: modified ? modified[1] : null,
    canonical_url: canonical ? canonical[1] : null
  };
}

async function fetchSource(source) {
  const started = new Date().toISOString();
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Pokemon-Champions-Sim-Planner source-audit/1.0 (+source inventory; no content republication)',
        accept: 'text/html,application/pdf,application/json,text/plain;q=0.9,*/*;q=0.5'
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    return {
      source_id: source.source_id,
      url: source.url,
      final_url: response.url,
      checked_at_utc: started,
      status: response.ok ? 'reachable' : 'http_error',
      http_status: response.status,
      content_type: contentType,
      byte_size: buffer.length,
      sha256: hashBuffer(buffer),
      ...textMeta(buffer, contentType)
    };
  } catch (error) {
    return {
      source_id: source.source_id,
      url: source.url,
      checked_at_utc: started,
      status: 'fetch_error',
      error: String(error && error.message ? error.message : error)
    };
  }
}

const rows = [];
for (const source of manifest.public_sources) rows.push(await fetchSource(source));

const requiredFailures = rows.filter((row) => {
  const source = manifest.public_sources.find((candidate) => candidate.source_id === row.source_id);
  return source && source.required && row.status !== 'reachable';
});

const report = {
  schema_version: 'champions-source-inventory-audit-v1',
  generated_at_utc: new Date().toISOString(),
  manifest_schema_version: manifest.schema_version,
  manifest_reviewed_at: manifest.reviewed_at,
  summary: {
    public_source_count: manifest.public_sources.length,
    reachable_count: rows.filter((row) => row.status === 'reachable').length,
    required_failure_count: requiredFailures.length,
    manual_capture_count: manifest.manual_captures.length,
    field_inventory_count: manifest.field_inventory.length
  },
  public_sources: rows,
  manual_captures: manifest.manual_captures.map((source) => ({
    source_id: source.source_id,
    status: 'manual_capture_required',
    required: source.required,
    capture: source.capture,
    claim_scopes: source.claim_scopes
  })),
  baseline_manifests: manifest.baseline_manifests,
  policy_result: requiredFailures.length ? 'blocked_required_source_unreachable' : 'public_sources_reachable_manual_proof_pending'
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log('Champion source inventory: ' + report.summary.reachable_count + '/' + report.summary.public_source_count + ' public sources reachable; ' + report.summary.manual_capture_count + ' manual capture sets pending.');
console.log('Report: ' + outputPath);
if (requiredFailures.length) process.exitCode = 1;
