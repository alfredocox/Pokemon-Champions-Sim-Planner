'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');

const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const strategyInjectable = fs.readFileSync(path.join(ROOT, 'strategy-injectable.js'), 'utf8');
const seedV1 = fs.readFileSync(path.join(ROOT, 'db', 'seed_teams_v1.sql'), 'utf8');
const dbReadme = fs.readFileSync(path.join(ROOT, 'db', 'README_DB.md'), 'utf8');
const bundleWorkflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'bundle-freshness-check.yml'), 'utf8');
const cacheWorkflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'cache-bump-check.yml'), 'utf8');
const pagesWorkflow = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'pages.yml'), 'utf8');

const ABSENT_CHAMPION_ITEMS = [
  'Life Orb',
  'Choice Band',
  'Choice Specs',
  'Assault Vest',
  'Rocky Helmet',
  'Safety Goggles',
  'Covert Cloak',
  'Clear Amulet',
  'Booster Energy',
  'Loaded Dice'
];

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function inc(text, needle, msg) {
  truthy(String(text).includes(needle), msg || ('missing ' + needle));
}

function notInc(text, needle, msg) {
  truthy(!String(text).includes(needle), msg || ('unexpected ' + needle));
}

function extractStringArrayAssignment(source, name) {
  const match = source.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\[([\\s\\S]*?)\\];'));
  truthy(match, 'missing array assignment for ' + name);
  const out = [];
  const itemRe = /'([^']+)'/g;
  let m;
  while ((m = itemRe.exec(match[1])) !== null) out.push(m[1]);
  return out;
}

console.log('\n=== Champion drift guard tests ===\n');

T('1. current UI classifier does not score absent Champion items as win-condition items', () => {
  const winItems = extractStringArrayAssignment(ui, 'CLASSIFY_WIN_ITEMS');
  ABSENT_CHAMPION_ITEMS.forEach((item) => {
    truthy(winItems.indexOf(item) === -1, 'CLASSIFY_WIN_ITEMS includes absent item ' + item);
  });
  inc(winItems.join('|'), 'Choice Scarf', 'legal Champion item should remain available to classifier');
});

T('2. current coaching fallback copy does not recommend absent Champion items', () => {
  const fallbackLines = ui.split(/\r?\n/).filter((line) => /fallback_plan\s*:/.test(line));
  const joined = fallbackLines.join('\n');
  ABSENT_CHAMPION_ITEMS.forEach((item) => {
    notInc(joined, item, 'fallback_plan recommends absent item ' + item);
  });
});

T('3. active Champion strategy copy does not teach unapproved Scarlet/Violet mechanic labels', () => {
  [
    'Protosynthesis under Sun',
    'Paradox Sweeper',
    'Terastallized',
    'Tera Type:'
  ].forEach((token) => {
    notInc(strategyInjectable, token, 'strategy injectable includes unapproved mechanic copy ' + token);
  });
});

T('4. bundle and cache drift workflows treat legality/ruleset files as app source', () => {
  inc(bundleWorkflow, 'legality', 'bundle freshness workflow must watch legality.js');
  inc(cacheWorkflow, 'legality', 'cache bump workflow must watch legality.js');
  inc(bundleWorkflow, 'rulesets', 'bundle freshness workflow must watch rulesets.js');
  inc(cacheWorkflow, 'rulesets', 'cache bump workflow must watch rulesets.js');
  inc(bundleWorkflow, 'regmb_source_conversion', 'bundle freshness workflow must watch Reg M-B source conversion');
  inc(cacheWorkflow, 'regmb_source_conversion', 'cache bump workflow must watch Reg M-B source conversion');
});

T('5. Pages deploy runs Champion source-of-truth checks before publishing', () => {
  [
    'db_m2_seed_tests.js',
    'RUN_LIVE_DB=1',
    'SUPABASE_ANON_KEY',
    'SUPABASE_KEY',
    'Live Supabase seed parity enabled for Pages deploy.',
    // pages_asset_inventory_tests checks all four former individual suites remain discovered.
    'npm run test:fast',
    'check-bundle.sh'
  ].forEach((token) => inc(pagesWorkflow, token, 'Pages deploy missing ' + token));
});

T('6. retired v1 seed and old Kouba correction cannot look current', () => {
  inc(seedV1, 'HISTORICAL / SUPERSEDED', 'seed_teams_v1.sql must stay clearly retired');
  inc(dbReadme, 'Historical/superseded item correction', 'old Kouba migration row must be marked superseded');
  inc(dbReadme, 'Coba Berry', 'current DB docs must point to Coba Berry');
  inc(dbReadme, 'Kouba Berry` is not in the verified Champions item pool', 'old Kouba spelling must not read as current truth');
});

console.log('\nChampion drift guard:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
