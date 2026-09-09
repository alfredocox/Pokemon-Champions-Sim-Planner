import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { main, validateRoadmap, roadmapMarkdown, roadmapScript, STATUS_LABELS } from '../tools/build-project-roadmap.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(root);
const source = JSON.parse(fs.readFileSync(path.join(root, 'source/project-roadmap.json'), 'utf8'));
const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
const clone = () => JSON.parse(JSON.stringify(source));
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const renderCode = ui.slice(ui.indexOf('function csRenderCurrentRoadmap()'), ui.indexOf('function renderOverviewTab()'));
function render(data) {
  const context = { _escapeHtml: esc, ...(data ? { CHAMPIONS_PROJECT_ROADMAP: { ...data, status_labels: STATUS_LABELS } } : {}) };
  vm.runInNewContext(renderCode + '\nresult = csRenderCurrentRoadmap();', context);
  return context.result;
}

test('canonical roadmap validates and all evidence documents exist', () => {
  assert.equal(validateRoadmap(source, repo), source);
  assert.equal(source.milestones.length, 8);
});
test('Markdown and browser artifacts exactly match their one shared source', () => {
  assert.doesNotThrow(() => main(['--check']));
  assert.equal(fs.readFileSync(path.join(repo, 'ROADMAP.md'), 'utf8').replace(/\r\n/g, '\n'), roadmapMarkdown(source));
  assert.equal(fs.readFileSync(path.join(root, 'generated/project_roadmap.js'), 'utf8').replace(/\r\n/g, '\n'), roadmapScript(source));
});
test('duplicate IDs and unknown statuses fail the build contract', () => {
  const duplicate = clone(); duplicate.milestones[1].id = duplicate.milestones[0].id;
  assert.throws(() => validateRoadmap(duplicate, repo), /Duplicate/);
  const invalid = clone(); invalid.milestones[0].status = '99%';
  assert.throws(() => validateRoadmap(invalid, repo), /status/);
});
test('missing and cyclic dependencies fail instead of generating an impossible plan', () => {
  const missing = clone(); missing.milestones[0].depends_on = ['missing'];
  assert.throws(() => validateRoadmap(missing, repo), /Missing milestone dependency/);
  const cycle = clone(); cycle.milestones[0].depends_on = ['release-alignment'];
  assert.throws(() => validateRoadmap(cycle, repo), /Cyclic/);
});
test('completion cannot hide open work or unresolved prerequisites', () => {
  const unfinished = clone(); unfinished.milestones[0].status = 'completed';
  assert.throws(() => validateRoadmap(unfinished, repo), /open work/);
  const blocked = clone(); const milestone = blocked.milestones.find(row => row.id === 'beginner-experience'); milestone.status = 'completed'; milestone.remaining = [];
  assert.throws(() => validateRoadmap(blocked, repo), /unresolved dependencies/);
});
test('missing or unsafe evidence links fail validation', () => {
  for (const link of ['../private.md', 'not-present.md', 'https://elsewhere.example/proof.md']) {
    const invalid = clone(); invalid.milestones[0].evidence = [link];
    assert.throws(() => validateRoadmap(invalid, repo), /evidence document/);
  }
});
test('browser data preserves exactly the source milestone identities and order', () => {
  const context = {}; vm.runInNewContext(roadmapScript(source), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.CHAMPIONS_PROJECT_ROADMAP.milestones)), source.milestones);
});
test('current rendered board shows every milestone once with explicit proof state', () => {
  const dom = load(render(source));
  assert.equal(dom('.roadmap-current-milestone').length, 8);
  for (const row of source.milestones) {
    assert.equal(dom('#roadmap-' + row.id).length, 1);
    assert.ok(dom('#roadmap-' + row.id + ' > summary').text().includes(STATUS_LABELS[row.status]));
  }
  assert.ok(dom('.roadmap-current').text().includes(source.next_action));
  assert.ok(dom('.roadmap-current').text().includes('local candidate documents may not be published yet'));
  assert.ok(!dom('.roadmap-current').text().includes('83%'));
});
test('only the first blocker starts expanded so the workstream list stays scannable', () => {
  const dom = load(render(source));
  assert.notEqual(dom('#roadmap-simulation-truth').attr('open'), undefined);
  assert.equal(dom('#roadmap-beginner-experience').attr('open'), undefined);
  assert.equal(dom('#roadmap-evidence-brain').attr('open'), undefined);
  assert.equal(dom('.roadmap-current-milestone[open]').length, 1);
});
test('missing roadmap fails visibly, never relabels legacy history as current', () => {
  assert.ok(render(null).includes('Current roadmap unavailable'));
  assert.ok(render(null).includes('do not establish current project status'));
});
test('rendered titles and notes cannot inject HTML', () => {
  const altered = clone(); altered.milestones[0].title = '<img src=x onerror=alert(1)>';
  const dom = load(render(altered));
  assert.equal(dom('img, script').length, 0);
  assert.ok(dom.text().includes('<img src=x onerror=alert(1)>'));
});
test('current plan precedes explicitly closed legacy disclosure; tournament catalog remains accessible', () => {
  const body = ui.slice(ui.indexOf('function renderOverviewTab()'), ui.indexOf('function csUpdateShowdownDbStatus()'));
  assert.ok(body.includes('host.innerHTML = csRenderCurrentRoadmap() + csRenderTournamentCatalog() +'));
  assert.ok(body.includes('<details class="roadmap-history"><summary>Historical implementation notes (not current status)'));
  assert.ok(!body.includes('<details class="roadmap-history" open'));
});
test('new asset is in source HTML, bundle generator, service worker and Pages inventory', () => {
  for (const file of ['index.html', 'tools/build-bundle.py', 'sw.js']) assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('generated/project_roadmap.js'), file);
  assert.ok(fs.readFileSync(path.join(repo, '.github/workflows/pages.yml'), 'utf8').includes('project_roadmap.js'));
});
test('current Markdown and STATUS local links resolve, including stable roadmap anchors', () => {
  for (const file of ['ROADMAP.md', 'STATUS.md']) {
    const content = fs.readFileSync(path.join(repo, file), 'utf8');
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const [target, anchor] = match[1].split('#');
      if (/^https?:/.test(target) || !target) continue;
      assert.ok(fs.existsSync(path.join(repo, target)), `${file}: ${target}`);
      if (target === 'ROADMAP.md' && anchor) assert.ok(source.milestones.some(row => row.id === anchor), 'Missing roadmap anchor');
    }
  }
});
test('historical roadmap/status and full beginner checklist are preserved', () => {
  for (const file of ['docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md', 'docs/archive/STATUS_PRE_CONSOLIDATION_2026-08-30.md', 'docs/strategy/BEGINNER_HOMEPAGE_AUDIT_PLAN.md']) assert.ok(fs.existsSync(path.join(repo, file)));
  assert.ok(fs.readFileSync(path.join(repo, 'docs/archive/ROADMAP_PRE_CONSOLIDATION_2026-08-30.md'), 'utf8').includes('83%'));
  assert.ok(!roadmapMarkdown(source).includes('Ko-fi account missing'));
});
