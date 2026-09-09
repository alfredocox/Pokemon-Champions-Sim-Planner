const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const legalitySource = fs.readFileSync(path.join(ROOT, 'legality.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');

const ctx = { console, require };
vm.createContext(ctx);
vm.runInContext(
  dataSource + '\n' + legalitySource + '\n' + engineSource + '\n' +
  'this.TEAMS=TEAMS; this.validateTeam=validateTeam; this.buildTeam=buildTeam;',
  ctx,
  { filename: 'preloaded_team_legality_bundle.js' }
);

const { TEAMS, validateTeam, buildTeam } = ctx;

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

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy');
}

function notInc(text, needle, msg) {
  if (String(text).includes(needle)) throw new Error(msg || `did not expect ${needle}`);
}

console.log('\n=== preloaded team legality tests ===\n');

const championPreloaded = Object.entries(TEAMS).filter(([, team]) =>
  team && team.source === 'preloaded' && team.format === 'champions'
);

T('1. no preloaded Champions team has an illegal SP spread', () => {
  const offenders = [];
  for (const [key, team] of championPreloaded) {
    const verdict = validateTeam(team, 'vgc');
    const spreadErrors = (verdict.errors || []).filter(err =>
      err.includes('SPs exceed 66') || err.includes('SP exceeds 32')
    );
    if (spreadErrors.length) offenders.push({ key, spreadErrors });
  }
  truthy(offenders.length === 0, JSON.stringify(offenders, null, 2));
});

T('2. preloaded Champions teams no longer rely on SV-spread runtime fallback', () => {
  const offenders = [];
  for (const [key, team] of championPreloaded) {
    const mons = buildTeam(team);
    const mismatched = mons.filter(mon => mon.formatMismatch);
    if (mismatched.length) offenders.push({ key, mismatched: mismatched.map(mon => mon.name) });
    const verdict = validateTeam(team, 'vgc');
    if ((verdict.warnings || []).some(w => w.includes('runtime falls back to SV stat math'))) {
      offenders.push({ key, warnings: verdict.warnings });
    }
  }
  truthy(offenders.length === 0, JSON.stringify(offenders, null, 2));
});

T('3. declared Champions teams with SV-shaped spreads are hard invalid', () => {
  const verdict = validateTeam({
    name: 'Invalid spread fixture',
    format: 'champions',
    members: [{
      name: 'Garchomp',
      item: 'Soft Sand',
      ability: 'Rough Skin',
      nature: 'Jolly',
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      moves: ['Earthquake', 'Protect']
    }]
  }, 'vgc');
  truthy(!verdict.valid, 'SV-shaped spread must invalidate declared Champions team');
  truthy((verdict.errors || []).some(err => err.includes('atk SP exceeds 32')), 'per-stat SP error missing');
  truthy((verdict.errors || []).some(err => err.includes('SPs exceed 66')), 'total SP error missing');
});

T('4. true Champions item-pool violations still remain hard errors', () => {
  const verdict = validateTeam({
    name: 'Invalid fixture',
    format: 'champions',
    members: [{
      name: 'Milotic',
      item: 'Loaded Dice',
      ability: 'Competitive',
      nature: 'Bold',
      evs: { hp: 32, atk: 0, def: 10, spa: 23, spd: 0, spe: 1 },
      moves: ['Scald', 'Protect', 'Recover', 'Ice Beam']
    }]
  }, 'vgc');
  truthy((verdict.errors || []).some(err => err.includes('Loaded Dice')), 'expected actual item-pool violation to remain');
});

T('5. preloaded Champions legality tags match the validator', () => {
  const offenders = [];
  for (const [key, team] of championPreloaded) {
    const verdict = validateTeam(team, 'vgc');
    const expected = verdict.valid ? team.legality_status !== 'illegal' : team.legality_status === 'illegal';
    if (!expected) {
      offenders.push({
        key,
        legality_status: team.legality_status,
        valid: verdict.valid,
        errors: verdict.errors
      });
    }
    if (!verdict.valid && !(team.legality_notes || '').trim()) {
      offenders.push({
        key,
        legality_status: team.legality_status,
        valid: verdict.valid,
        errors: ['invalid team missing legality_notes']
      });
    }
  }
  truthy(offenders.length === 0, JSON.stringify(offenders, null, 2));
});

console.log(`\npreloaded team legality: ${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
