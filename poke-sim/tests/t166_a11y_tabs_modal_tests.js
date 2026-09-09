// Issue #96 - tabs need roving tabindex/ARIA and modals need focus trapping.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function makeNode(id) {
  const node = {
    id: id || '',
    style: {},
    dataset: {},
    attributes: {},
    textContent: '',
    innerHTML: '',
    value: '',
    options: [],
    hidden: false,
    disabled: false,
    tabIndex: 0,
    className: '',
    listeners: {},
    children: [],
    parentNode: null,
    classList: {
      _set: new Set(),
      add(cls) { this._set.add(cls); },
      remove(cls) { this._set.delete(cls); },
      toggle(cls, on) { if (on) this._set.add(cls); else this._set.delete(cls); },
      contains(cls) { return this._set.has(cls); }
    },
    addEventListener(type, fn) {
      (this.listeners[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      if (!this.listeners[type]) return;
      this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (Array.isArray(this.options)) this.options.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') this.id = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    querySelector(selector) {
      return (this._queryMap && this._queryMap[selector]) || null;
    },
    querySelectorAll(selector) {
      if (selector === 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') {
        return this._focusables || [];
      }
      return (this._queryMap && this._queryMap[selector]) || [];
    },
    focus() {
      document.activeElement = this;
    },
    blur() {},
    click() {
      const ev = { target: this, preventDefault() {}, stopPropagation() {} };
      (this.listeners.click || []).forEach((fn) => fn.call(this, ev));
    },
    dispatchKey(key, extra) {
      const ev = Object.assign({
        key,
        target: this,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() { this.stopped = true; }
      }, extra || {});
      (this.listeners.keydown || []).forEach((fn) => fn.call(this, ev));
      return ev;
    }
  };
  return node;
}

const ids = {};
function byId(id) {
  if (!ids[id]) ids[id] = makeNode(id);
  return ids[id];
}

const tabOrder = ['simulator', 'overview', 'teams', 'editor', 'strategy', 'replay-coach', 'replays', 'sources', 'pilot'];
const tabButtons = tabOrder.map((tabId, idx) => {
  const btn = makeNode(`tab-btn-${tabId}`);
  btn.dataset.tab = tabId;
  btn.classList.add('tab-btn');
  btn.textContent = tabId;
  if (idx === 0) btn.classList.add('active');
  return btn;
});

const tabPanels = tabOrder.map((tabId, idx) => {
  const panel = makeNode(`tab-${tabId}`);
  panel.classList.add('tab-panel');
  if (idx === 0) panel.classList.add('active');
  return panel;
});

const tabNav = makeNode('tab-nav');
const importTabs = ['paste', 'url'].map((name, idx) => {
  const btn = makeNode(`import-tab-${name}`);
  btn.dataset.itab = name;
  btn.classList.add('import-tab');
  if (idx === 0) btn.classList.add('active');
  return btn;
});

const exportDialog = makeNode('export-dialog');
const exportModal = makeNode('export-modal');
const exportText = byId('export-text');
const copyExport = byId('copy-export-btn');
const closeExport = byId('close-export');
exportDialog._queryMap = {
  '.modal-box': exportDialog,
  '#export-text': exportText,
  '#copy-export-btn': copyExport,
  '#close-export': closeExport
};
exportModal._queryMap = { '.modal-box': exportDialog };
exportModal.appendChild(exportDialog);
ids['export-modal'] = exportModal;

const importDialog = makeNode('import-dialog');
const importModal = makeNode('import-modal');
const importTitle = byId('import-modal-title');
const importHint = makeNode('import-hint');
const showdownPaste = byId('showdown-paste');
const pasteUrlInput = byId('paste-url-input');
const importStatus = byId('import-status');
const importPreview = byId('import-preview');
const importSlot = byId('import-slot');
const closeImport = byId('close-import');
const closeImport2 = byId('close-import-2');
const doImport = byId('do-import-btn');
importDialog._queryMap = {
  '.modal-box': importDialog,
  '#showdown-paste': showdownPaste,
  '#paste-url-input': pasteUrlInput,
  '#import-status': importStatus,
  '#import-preview': importPreview,
  '#import-slot': importSlot,
  '#close-import': closeImport,
  '#close-import-2': closeImport2,
  '.modal-title': importTitle,
  '.modal-hint': importHint
};
importDialog._focusables = [closeImport, importTabs[0], importTabs[1], showdownPaste, pasteUrlInput, importSlot, doImport, closeImport2];
importModal._queryMap = { '.modal-box': importDialog };
importModal.appendChild(importDialog);
ids['import-modal'] = importModal;

const confirmDialog = makeNode('confirm-dialog');
const confirmModal = makeNode('confirm-modal');
const confirmTitle = byId('confirm-title');
const confirmBody = byId('confirm-body');
const confirmOk = byId('confirm-ok');
const confirmCancel = byId('confirm-cancel');
const confirmClose = byId('confirm-close');
confirmDialog._queryMap = {
  '.modal-box': confirmDialog,
  '#confirm-title': confirmTitle,
  '#confirm-body': confirmBody,
  '#confirm-ok': confirmOk,
  '#confirm-cancel': confirmCancel,
  '#confirm-close': confirmClose
};
confirmDialog._focusables = [confirmClose, confirmOk, confirmCancel];
confirmModal._queryMap = { '.modal-box': confirmDialog };
confirmModal.appendChild(confirmDialog);
ids['confirm-modal'] = confirmModal;

const openImportModal = byId('open-import-modal');

tabNav._queryMap = {};
ids['tab-nav'] = tabNav;
tabButtons.forEach((btn, idx) => { ids[`tab-btn-${tabOrder[idx]}`] = btn; ids[`tab-${tabOrder[idx]}`] = tabPanels[idx]; });

const selectorMap = {
  '.tab-nav': tabNav,
  '.tab-btn': tabButtons,
  '.tab-panel': tabPanels,
  '.fmt-btn': [],
  '.import-tab': importTabs,
  '.modal-overlay': [exportModal, importModal, confirmModal],
  '.tab-btn[data-tab="simulator"]': [tabButtons[0]],
  '.tab-btn[data-tab="overview"]': [tabButtons[1]],
  '.tab-btn[data-tab="teams"]': [tabButtons[2]],
  '.tab-btn[data-tab="editor"]': [tabButtons[3]],
  '.tab-btn[data-tab="strategy"]': [tabButtons[4]],
  '.tab-btn[data-tab="replay-coach"]': [tabButtons[5]],
  '.tab-btn[data-tab="replays"]': [tabButtons[6]],
  '.tab-btn[data-tab="sources"]': [tabButtons[7]],
  '.tab-btn[data-tab="pilot"]': [tabButtons[8]],
  '#import-modal .modal-title': importTitle,
  '#import-modal .modal-hint': importHint,
  '#confirm-modal .modal-title': confirmTitle,
  '#confirm-modal .modal-hint': confirmBody,
  '.modal-overlay .modal-box': [exportDialog, importDialog, confirmDialog]
};

const documentListeners = {};
const document = {
  activeElement: null,
  documentElement: makeNode('html'),
  body: makeNode('body'),
  head: makeNode('head'),
  getElementById(id) { return byId(id); },
  querySelector(selector) {
    const value = selectorMap[selector];
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
  },
  querySelectorAll(selector) {
    const value = selectorMap[selector];
    return Array.isArray(value) ? value : (value ? [value] : []);
  },
  addEventListener(type, fn) {
    (documentListeners[type] ||= []).push(fn);
  },
  removeEventListener(type, fn) {
    if (!documentListeners[type]) return;
    documentListeners[type] = documentListeners[type].filter((f) => f !== fn);
  },
  createElement(tag) { return makeNode(tag); },
  createTextNode(text) { return { nodeType: 3, textContent: text }; }
};
document.documentElement.dataset = { theme: 'dark' };

function fireDocumentKeydown(key, extra) {
  const ev = Object.assign({
    key,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; }
  }, extra || {});
  (documentListeners.keydown || []).forEach((fn) => fn(ev));
  return ev;
}

const window = {
  __SUPABASE_URL__: '',
  __SUPABASE_KEY__: '',
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
window.window = window;
window.document = document;

const ctx = {
  console, require, module: {}, exports: {}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, clearTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt, isFinite,
  window,
  document,
  navigator: { serviceWorker: { register() { return Promise.resolve(); } } },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  },
  addEventListener() {},
  removeEventListener() {},
  matchMedia: window.matchMedia,
  Blob: function(parts) { this.parts = parts; },
  URL: { createObjectURL() { return 'blob:test'; }, revokeObjectURL() {} }
};

vm.createContext(ctx);

function load(file) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

[
  'data.js',
  'logger.js',
  'engine.js',
  'storage_adapter.js',
  'supabase_adapter.js',
  'ui.js',
  'legality.js',
  'strategy-injectable.js'
].forEach(load);

vm.runInContext('this.__openImportModal = openImportModal; this.__asyncConfirm = asyncConfirm;', ctx);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('\n=== a11y tabs and modal tests ===\n');

  assert(tabButtons[0].getAttribute('aria-selected') === 'true', 'active tab not selected');
  assert(tabButtons[0].tabIndex === 0, 'active tab not tabbable');
  assert(tabButtons.slice(1).every((btn) => btn.tabIndex === -1), 'inactive tabs should be roving');
  assert(tabPanels[0].hidden === false, 'active panel should be visible');
  assert(tabPanels.slice(1).every((panel) => panel.hidden === true), 'inactive panels should be hidden');
  assert(tabPanels[0].getAttribute('role') === 'tabpanel', 'panel role missing');

  tabButtons[0].focus();
  tabButtons[0].dispatchKey('ArrowRight');
  assert(document.activeElement === tabButtons[1], 'ArrowRight did not move focus to next tab');
  assert(tabButtons[1].getAttribute('aria-selected') === 'true', 'ArrowRight did not activate next tab');
  assert(tabButtons[0].tabIndex === -1 && tabButtons[1].tabIndex === 0, 'roving tabindex not updated after ArrowRight');

  tabButtons[1].dispatchKey('Home');
  assert(document.activeElement === tabButtons[0], 'Home did not move focus back to first tab');

  const homeAction = makeNode('home-edit-action');
  homeAction.setAttribute('data-home-tab', 'editor');
  const homeRoot = makeNode('home-root');
  homeRoot._queryMap = { '[data-home-tab]': [homeAction] };
  ctx.csInitHomeTabActions(homeRoot);
  homeAction.focus();
  homeAction.click();
  assert(document.activeElement === tabPanels[3], 'home action must focus its visible destination panel');
  assert(!tabPanels[3].hidden, 'home action destination must be visible');
  homeAction.setAttribute('data-home-tab', 'missing');
  homeAction.click();
  assert(document.activeElement === tabPanels[3], 'invalid destination must not steal focus');

  const importTrigger = byId('open-import-modal');
  importTrigger.focus();
  ctx.__openImportModal();
  assert(importModal.style.display === 'flex', 'import modal did not open');
  assert(document.activeElement === showdownPaste, 'import modal initial focus should land on paste box');

  const importFocusables = [closeImport, importTabs[0], importTabs[1], showdownPaste, pasteUrlInput, importSlot, doImport, closeImport2];
  document.activeElement = importFocusables[importFocusables.length - 1];
  fireDocumentKeydown('Tab');
  assert(document.activeElement === closeImport, 'Tab did not wrap to first element in import modal');

  document.activeElement = closeImport;
  fireDocumentKeydown('Tab', { shiftKey: true });
  assert(document.activeElement === closeImport2, 'Shift+Tab did not wrap to last element in import modal');

  closeImport.focus();
  fireDocumentKeydown('Escape');
  assert(importModal.style.display === 'none', 'Escape did not close import modal');
  assert(document.activeElement === importTrigger, 'closing import modal did not restore focus');

  const confirmTrigger = makeNode('confirm-trigger');
  confirmTrigger.focus();
  const confirmPromise = ctx.__asyncConfirm('Delete team', 'Delete this team?', 'Delete');
  assert(confirmModal.style.display === 'flex', 'confirm modal did not open');
  assert(document.activeElement === confirmOk, 'confirm modal did not focus safe action');

  document.activeElement = confirmCancel;
  fireDocumentKeydown('Tab');
  assert(document.activeElement === confirmClose, 'Tab did not wrap inside confirm modal');

  fireDocumentKeydown('Escape');
  const confirmResult = await confirmPromise;
  assert(confirmResult === false, 'Escape should reject async confirm');
  assert(confirmModal.style.display === 'none', 'confirm modal did not close');
  assert(document.activeElement === confirmTrigger, 'confirm modal did not restore focus');

  console.log('  PASS tabs use roving tabindex and modal focus stays trapped');
}

main().catch((err) => {
  console.log('  FAIL a11y tabs/modal -', err.message);
  process.exit(1);
});
