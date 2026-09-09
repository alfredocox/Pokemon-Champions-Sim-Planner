import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STATUS_LABELS = { blocked: 'Blocked', local_only: 'Local only', queued: 'Queued', deferred: 'Deferred', completed: 'Verified complete' };
export function validateRoadmap(data, repo = path.dirname(root)) {
  if (data.schema_version !== 'champions-project-roadmap-v1' || !/^\d{4}-\d{2}-\d{2}$/.test(data.reviewed_at) || !Array.isArray(data.milestones) || !data.milestones.length) throw new Error('Invalid roadmap schema');
  for (const field of ['direction', 'scope', 'proof_note', 'next_action']) if (typeof data[field] !== 'string' || !data[field].trim()) throw new Error('Missing roadmap ' + field);
  const ids = new Set();
  for (const row of data.milestones) {
    if (!/^[a-z][a-z0-9-]+$/.test(row.id) || ids.has(row.id)) throw new Error('Duplicate/invalid milestone ID');
    ids.add(row.id);
    if (!Object.hasOwn(STATUS_LABELS, row.status)) throw new Error('Unknown milestone status');
    for (const field of ['title', 'owner', 'exit']) if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error('Missing milestone ' + field);
    for (const field of ['legacy', 'depends_on', 'completed_locally', 'remaining', 'evidence']) if (!Array.isArray(row[field]) || row[field].some(v => typeof v !== 'string' || !v.trim())) throw new Error('Invalid milestone list');
    if (row.status === 'completed' && row.remaining.length) throw new Error('Completed milestone still has open work');
    if (!row.evidence.length) throw new Error('Missing evidence references');
    for (const link of row.evidence) {
      if (!/^[a-zA-Z0-9_./-]+\.md$/.test(link) || link.split('/').includes('..') || path.isAbsolute(link) || !fs.existsSync(path.join(repo, link))) throw new Error('Missing/unsafe evidence document: ' + link);
    }
  }
  const byId = new Map(data.milestones.map(row => [row.id, row]));
  for (const row of data.milestones) if (row.status === 'completed' && row.depends_on.some(id => byId.get(id)?.status !== 'completed')) throw new Error('Completed milestone has unresolved dependencies');
  function visit(id, trail = []) {
    if (!byId.has(id)) throw new Error('Missing milestone dependency');
    if (trail.includes(id)) throw new Error('Cyclic milestone dependencies');
    for (const dependency of byId.get(id).depends_on) visit(dependency, [...trail, id]);
  }
  for (const id of ids) visit(id);
  return data;
}
export function roadmapMarkdown(data) {
  const lines = ['# Pokemon Champions Product Roadmap', '', '<!-- Generated from poke-sim/source/project-roadmap.json. Run npm run roadmap:build in poke-sim. -->', '',
    `Reviewed: ${data.reviewed_at}. Current runtime/deployment evidence: [STATUS.md](STATUS.md).`, '', `**${data.direction}**`, '', data.scope, '', data.proof_note, '',
    '## Next Action', '', data.next_action, '', '## Milestone Index', '', '| Milestone | State | Former lanes |', '|---|---|---|'];
  for (const row of data.milestones) lines.push(`| [${row.title}](#${row.id}) | ${STATUS_LABELS[row.status]} | ${row.legacy.join(', ')} |`);
  lines.push('', 'Former lanes are archived planning labels, not GitHub milestone numbers or IDs. See the [live queue inventory](docs/release/GITHUB_QUEUE_RECONCILIATION_2026-08-30.md) for actual repository-specific milestones.', '', 'No percentage here measures game accuracy. Local completion notes are narrower than milestone completion. Deferred ideas are not commitments to build everything.', '', '## Milestones');
  for (const row of data.milestones) {
    lines.push('', `<a id="${row.id}"></a>`, '', `### ${row.title}`, '', `**${STATUS_LABELS[row.status]}** | Owner: ${row.owner}`, '',
      'Depends on: ' + (row.depends_on.length ? row.depends_on.map(id => `[${data.milestones.find(r => r.id === id).title}](#${id})`).join(', ') : 'Independent workstream; readiness still requires the other release gates.'), '', 'Completed locally / recorded:', ...row.completed_locally.map(item => '- ' + item), '', 'Remaining:', ...row.remaining.map(item => '- [ ] ' + item), '', '**Exit:** ' + row.exit, '',
      'Evidence: ' + row.evidence.map(link => `[${path.basename(link)}](${link})`).join(', '));
  }
  lines.push('', '## Documentation Authority', '', '1. [AGENTS.md](AGENTS.md): operating policy.', '2. [STATUS.md](STATUS.md): current tested build, deployment and live-proof state.', '3. This roadmap: milestone order, scope and exit gates. Edit the shared JSON source, not this generated file.',
    '4. Dated release audits: reproducible evidence and historical findings, not overriding plans.', '5. GitHub issues: team execution queue; verify fully qualified references before closing or merging issues.', '',
    '## Consolidation Record', '', 'Superseded sprint plans, percentage scores, old issue snapshots and monetization-first blockers were archived in [the historical roadmap](docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md), not erased. Current consolidation decisions: [audit](docs/release/ROADMAP_CONSOLIDATION_2026-08-30.md).', '',
    'The browser Roadmap tab and this document are generated from the same milestone source. Neither a local build nor a checked box proves deployment. Preserve older audit evidence; add new milestones with stable IDs, dependencies, acceptance criteria and evidence links.', '');
  return lines.join('\n');
}
export function roadmapScript(data) {
  return '// Generated by tools/build-project-roadmap.mjs. Do not edit.\n(function(root) {\n  root.CHAMPIONS_PROJECT_ROADMAP = ' + JSON.stringify({ ...data, status_labels: STATUS_LABELS }, null, 2).replace(/</g, '\\u003c') + ';\n})(typeof self !== \'undefined\' ? self : globalThis);\n';
}
export function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--check')) throw new Error('Unknown roadmap build argument');
  const data = validateRoadmap(JSON.parse(fs.readFileSync(path.join(root, 'source/project-roadmap.json'), 'utf8')));
  for (const [file, content] of [[path.join(root, '../ROADMAP.md'), roadmapMarkdown(data)], [path.join(root, 'generated/project_roadmap.js'), roadmapScript(data)]]) {
    if (args.includes('--check')) {
      if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error('Roadmap drift: ' + file);
    } else fs.writeFileSync(file, content, 'utf8');
  }
  console.log('Roadmap: ' + data.milestones.length + ' milestones; markdown/browser source ' + (args.includes('--check') ? 'match.' : 'generated.'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
