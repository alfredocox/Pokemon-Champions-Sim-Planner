// Regression coverage for Alfredo issue #221:
// loose replay gender tokens must not become species, and Mega replay events
// must resolve the active Pokemon to the correct Mega form.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const replayCoach = require(path.join(ROOT, 'replay_coach.js'));

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (e) {
    console.log('  FAIL', name, '-', e.message);
    fail++;
  }
}

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function notIncludes(list, value, msg) {
  if (Array.isArray(list) && list.includes(value)) throw new Error((msg || 'unexpected value') + ': ' + value);
}

function includes(list, value, msg) {
  if (!Array.isArray(list) || !list.includes(value)) throw new Error((msg || 'missing value') + ': ' + value);
}

function parse(lines) {
  return replayCoach.parseShowdownLog(lines.join('\n'), { selectedSide: 'p1' });
}

function loadBaseStats() {
  const ctx = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + '\nthis.BASE_STATS = BASE_STATS;',
    ctx,
    { filename: 'data.js' }
  );
  return ctx.BASE_STATS;
}

console.log('\n=== replay species parser tests ===\n');

T('1. Kangaskhan Level 50 Female details keep Kangaskhan as species', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Kangaskhan, Level 50, Female|',
    '|poke|p2|Tyranitar, L50, M|',
    '|switch|p1a: Kangaskhan|Kangaskhan, Level 50, Female|100/100',
    '|switch|p2a: Tyranitar|Tyranitar, L50, M|100/100',
    '|turn|1',
    '|move|p1a: Kangaskhan|Fake Out|p2a: Tyranitar',
    '|win|Alice',
  ]);
  includes(parsed.teamPreview.p1, 'Kangaskhan', 'preview species');
  includes(parsed.selectedPokemon.p1, 'Kangaskhan', 'selected species');
  notIncludes(parsed.teamPreview.p1, 'Female', 'preview must not contain Female');
  notIncludes(parsed.selectedPokemon.p1, 'F', 'selected must not contain F');
});

T('2. L50 F and impossible loose M are metadata, not species', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Kangaskhan, L50, F|',
    '|poke|p2|Kangaskhan, L50, M|',
    '|switch|p1a: Kangaskhan|Kangaskhan, L50, F|100/100',
    '|switch|p2a: Kangaskhan|Kangaskhan, L50, M|100/100',
    '|turn|1',
    '|move|p1a: Kangaskhan|Fake Out|p2a: Kangaskhan',
    '|win|Alice',
  ]);
  includes(parsed.teamPreview.p1, 'Kangaskhan', 'F metadata still keeps species');
  includes(parsed.teamPreview.p2, 'Kangaskhan', 'M metadata still keeps species');
  ['F', 'M', 'Female', 'Male'].forEach((token) => {
    notIncludes(parsed.teamPreview.p1, token, 'p1 loose token stripped');
    notIncludes(parsed.teamPreview.p2, token, 'p2 loose token stripped');
    notIncludes(parsed.selectedPokemon.p1, token, 'selected loose token stripped');
    notIncludes(parsed.selectedPokemon.p2, token, 'selected loose token stripped');
  });
});

T('3. Nickname pipe details prefer species details over nickname', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|switch|p1a: Joey|Kangaskhan, L50, F|100/100',
    '|switch|p2a: Rock|Tyranitar, L50, M|100/100',
    '|turn|1',
    '|move|p1a: Joey|Fake Out|p2a: Rock',
    '|win|Alice',
  ]);
  includes(parsed.selectedPokemon.p1, 'Kangaskhan', 'selected species from details');
  eq(parsed.leads.p1[0], 'Kangaskhan', 'lead species from details');
  eq(parsed.turns.find((t) => t.number === 1).moves[0].pokemon, 'Kangaskhan', 'move actor resolved from active slot species');
});

T('4. Loose gender tokens alone never become display species', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|F|',
    '|switch|p1a: F|F|100/100',
    '|switch|p2a: Male|Male|100/100',
    '|turn|1',
    '|move|p1a: F|Protect|p1a: F',
    '|win|Alice',
  ]);
  ['F', 'M', 'Female', 'Male'].forEach((token) => {
    notIncludes(parsed.teamPreview.p1, token, 'preview loose token stripped');
    notIncludes(parsed.selectedPokemon.p1, token, 'selected loose token stripped');
    notIncludes(parsed.selectedPokemon.p2, token, 'selected loose token stripped');
  });
});

T('5. Real gendered form names are preserved', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Nidoran-F, L50, F|',
    '|poke|p1|Nidoran-M, L50, M|',
    '|poke|p2|Indeedee-F, L50, F|',
    '|poke|p2|Meowstic-M, L50, M|',
    '|switch|p1a: Nidoran-F|Nidoran-F, L50, F|100/100',
    '|switch|p2a: Indeedee-F|Indeedee-F, L50, F|100/100',
    '|turn|1',
    '|win|Alice',
  ]);
  includes(parsed.teamPreview.p1, 'Nidoran-F', 'Nidoran-F preserved');
  includes(parsed.teamPreview.p1, 'Nidoran-M', 'Nidoran-M preserved');
  includes(parsed.teamPreview.p2, 'Indeedee-F', 'Indeedee-F preserved');
  includes(parsed.teamPreview.p2, 'Meowstic-M', 'Meowstic-M preserved');
});

T('6. Mega event resolves Kangaskhan to Kangaskhan-Mega downstream', () => {
  const parsed = parse([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Kangaskhan, L50, F|',
    '|poke|p2|Tyranitar, L50, M|',
    '|switch|p1a: Kangaskhan|Kangaskhan, L50, F|100/100',
    '|switch|p2a: Tyranitar|Tyranitar, L50, M|100/100',
    '|turn|1',
    '|-mega|p1a: Kangaskhan|Kangaskhanite',
    '|move|p1a: Kangaskhan|Fake Out|p2a: Tyranitar',
    '|win|Alice',
  ]);
  includes(parsed.selectedPokemon.p1, 'Kangaskhan-Mega', 'selected species updates to Mega');
  notIncludes(parsed.selectedPokemon.p1, 'Kangaskhan', 'base species replaced after Mega event');
  const turn1 = parsed.turns.find((t) => t.number === 1);
  truthy(turn1.events.some((event) => event.type === 'mega' && event.pokemon === 'Kangaskhan-Mega'), 'Mega event recorded');
  eq(turn1.moves[0].pokemon, 'Kangaskhan-Mega', 'post-Mega move actor uses Mega species');
});

T('7. Kangaskhan and Kangaskhan-Mega stats are present for Set Editor lookup', () => {
  const stats = loadBaseStats();
  eq(stats.Kangaskhan.hp, 105, 'Kangaskhan hp');
  eq(stats.Kangaskhan.atk, 95, 'Kangaskhan atk');
  eq(stats.Kangaskhan.def, 80, 'Kangaskhan def');
  eq(stats.Kangaskhan.spa, 40, 'Kangaskhan spa');
  eq(stats.Kangaskhan.spd, 80, 'Kangaskhan spd');
  eq(stats.Kangaskhan.spe, 90, 'Kangaskhan spe');
  eq(stats['Kangaskhan-Mega'].hp, 105, 'Mega hp');
  eq(stats['Kangaskhan-Mega'].atk, 125, 'Mega atk');
  eq(stats['Kangaskhan-Mega'].def, 100, 'Mega def');
  eq(stats['Kangaskhan-Mega'].spa, 60, 'Mega spa');
  eq(stats['Kangaskhan-Mega'].spd, 100, 'Mega spd');
  eq(stats['Kangaskhan-Mega'].spe, 100, 'Mega spe');
});

console.log(`\nreplay species parser: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
