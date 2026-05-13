// Issue #150 - Set Editor stat panel HTML markup.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeStubEl() {
  return {
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    setAttribute(){}, getAttribute(){ return null; },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    style: {}, dataset: {}, innerHTML: '', textContent: '', value: '',
    options: [], children: [], selectedOptions: [],
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    click(){}, focus(){}, blur(){}
  };
}

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, setInterval, clearInterval, clearTimeout, Date,
  String, Number, Boolean, RegExp, parseInt, parseFloat,
  window: { matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }) },
  matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
  document: {
    documentElement: makeStubEl(),
    body: makeStubEl(),
    getElementById: () => makeStubEl(),
    querySelector: () => makeStubEl(),
    querySelectorAll: () => [],
    createElement: () => makeStubEl(),
    addEventListener(){}
  },
  localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){}, clear(){} },
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' },
  fetch: () => Promise.reject(new Error('no network in tests')),
  URL: { createObjectURL(){ return 'blob:stub'; }, revokeObjectURL(){} },
  Blob: function(parts){ this.parts = parts; },
  FileReader: function(){},
  alert(){}
};
ctx.self = ctx.window;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

load('data.js');
load('engine.js');
load('storage_adapter.js');
load('ui.js');
vm.runInContext('this.renderStatPanelHtml=renderStatPanelHtml;', ctx);

const renderStatPanelHtml = ctx.renderStatPanelHtml;
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== stat panel markup tests ===\n');

T('1. renderStatPanelHtml emits stat panel section', () => {
  const html = renderStatPanelHtml({
    name: 'Garchomp',
    nature: 'Jolly',
    evs: { hp:4, atk:252, def:0, spa:0, spd:0, spe:252 },
    ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 }
  });
  inc(html, 'class="stat-panel"');
  inc(html, 'aria-label="Stat panel"');
  inc(html, 'Jolly · EV 508/510');
});

T('2. stat panel renders all six stat labels', () => {
  const html = renderStatPanelHtml({ nature: 'Hardy', evs: {}, ivs: {} });
  ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'].forEach(label => inc(html, '>' + label + '<'));
});

T('3. stat panel displays EV and IV values', () => {
  const html = renderStatPanelHtml({ nature: 'Modest', evs: { spa:252 }, ivs: { spa:30 } });
  inc(html, 'EV 252');
  inc(html, 'IV 30');
});

T('4. stat panel marks nature plus/minus stats', () => {
  const html = renderStatPanelHtml({ nature: 'Jolly', evs: {}, ivs: {} });
  inc(html, 'stat-panel-nature plus">+');
  inc(html, 'stat-panel-nature minus">-');
});

T('5. openEditorForm includes the stat panel helper', () => {
  inc(ui, '${renderStatPanelHtml(m)}');
});

T('6. stylesheet includes stat panel classes', () => {
  ['.stat-panel', '.stat-panel-row', '.stat-panel-pill', '.stat-panel-nature.plus'].forEach(cls => inc(css, cls));
});

console.log(`\nstat panel markup: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
