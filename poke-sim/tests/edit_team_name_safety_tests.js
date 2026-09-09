const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');

function harness() {
  const file = path.join(__dirname, 't9j11_tests.js');
  const source = fs.readFileSync(file, 'utf8');
  const marker = '// Expose ctx-scoped';
  assert(source.includes(marker));
  const host = vm.createContext({ require: createRequire(file), __dirname, console,
    setTimeout, setInterval, clearTimeout, clearInterval });
  vm.runInContext(source.slice(0, source.indexOf(marker)) + '\nthis.context = ctx;', host);
  const ctx = host.context;
  vm.runInContext(`
    this.TEAMS = TEAMS;
    this.hint = { innerHTML: '' };
    this.title = { textContent: '' };
    openImportModal = function() {};
    document.getElementById = function() { return null; };
    document.querySelector = function(selector) {
      return selector === '#import-modal .modal-hint' ? hint : selector === '#import-modal .modal-title' ? title : null;
    };
  `, ctx);
  return ctx;
}

test('edit dialog treats team names as literal text without changing stored names', () => {
  const ctx = harness();
  for (const source of ['custom', 'preloaded']) {
    for (const name of ['Plain team', 'A & B <team> "quotes"', "Trainer's team", '&lt;team&gt;', '<img src=x>', '<svg></svg>']) {
      ctx.TEAMS.test_name = { name, source, members: [] };
      ctx.openEditTeamModal('test_name');
      const escaped = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      assert(ctx.hint.innerHTML.includes('<strong>' + escaped + '</strong>'));
      assert(!/<img|<svg/i.test(ctx.hint.innerHTML));
      assert.equal(ctx.title.textContent, 'Edit Team: ' + name);
      assert.equal(ctx.TEAMS.test_name.name, name);
      assert(ctx.hint.innerHTML.includes(source === 'custom' ? 'saved to localStorage' : 'save as an override'));
    }
  }
});
