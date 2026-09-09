const fs = require('fs');
const vm = require('vm');
const engineSrc = fs.readFileSync(require('path').join(__dirname, '..', 'engine.js'),'utf8');
const dataSrc = fs.readFileSync(require('path').join(__dirname, '..', 'data.js'),'utf8');
const legalitySrc = fs.readFileSync(require('path').join(__dirname, '..', 'legality.js'),'utf8');

const combined = dataSrc + '\n' + legalitySrc + '\n' + engineSrc + `
globalThis._exported = { Pokemon, Field, TEAMS, simulateBattle, validateTeam, BASE_STATS, ENGINE_VERSION };
`;
new vm.Script(combined).runInThisContext();
const { TEAMS, simulateBattle, validateTeam, ENGINE_VERSION } = globalThis._exported;

// Filter to the known shipped teams (skip any custom_* imports)
const KNOWN_TEAMS = [
  'player', 'mega_altaria', 'mega_dragonite', 'mega_houndoom',
  'rin_sand', 'suica_sun', 'cofagrigus_tr',
  'champions_arena_1st', 'champions_arena_2nd', 'champions_arena_3rd',
  'aurora_veil_froslass',
  'fabulous_sunroom', 'sand_bulky_offense', 'fire_ice_fullroom', 'zardx_snow_setup'
];

const available = KNOWN_TEAMS.filter(k => TEAMS[k]);
const missingTeams = KNOWN_TEAMS.filter(k => !TEAMS[k]);
console.log('Available teams:', available.length, '/', KNOWN_TEAMS.length);
console.log('Missing:', missingTeams);
if (available.length === 0) {
  console.error('FATAL: no known teams loaded; audit cannot validate placeholder or empty data.js.');
  process.exit(1);
}
if (missingTeams.length > 0) {
  console.error('FATAL: configured audit teams are missing: ' + missingTeams.join(', '));
  process.exit(1);
}

const N = 20; // 20 battles per matchup across the shipped calibration set
const FORMAT = 'doubles';

function auditSeed(player, opp, battleIndex) {
  const text = player + '|' + opp + '|' + battleIndex + '|champions-audit-v2';
  const seeds = [0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f];
  for (let i = 0; i < text.length; i++) {
    const slot = i % 4;
    seeds[slot] ^= text.charCodeAt(i);
    seeds[slot] = (Math.imul(seeds[slot], 1664525) + 1013904223) >>> 0;
  }
  return seeds.map(s => s || 0xa5a5a5a5);
}

// Metrics to collect per team
const matrix = {};
const globalFlags = [];
let totalBattles = 0;
let totalErrors = 0;
const winConditionCounts = {};
const jsErrors = [];
const legalityFailures = [];
const legalityWarnings = [];

// Legality pre-check
console.log('\n=== LEGALITY AUDIT ===');
for (const t of available) {
  const v = validateTeam(TEAMS[t], 'vgc');
  if (!v.valid) {
    legalityFailures.push({ team: t, errors: v.errors.slice() });
    console.log(`  [INVALID] ${t}: ${v.errors.length} errors`);
    console.log(`    first 3: ${v.errors.slice(0,3).join(' | ')}`);
  } else if (v.warnings.length > 0) {
    legalityWarnings.push({ team: t, warnings: v.warnings.slice() });
    console.log(`  [WARN]    ${t}: ${v.warnings.length} warnings`);
    console.log(`    first 3: ${v.warnings.slice(0,3).join(' | ')}`);
  } else {
    console.log(`  [CLEAN]   ${t}`);
  }
}
if (legalityFailures.length > 0) {
  console.error('FATAL: one or more configured audit teams are illegal.');
  process.exit(1);
}

const expectedBattles = available.length * available.length * N;
console.log('\n=== MATRIX SIM (' + available.length + 'x' + available.length + ', N=' + N + ' per cell; ' + expectedBattles + ' planned) ===');
const startTime = Date.now();

for (const player of available) {
  matrix[player] = {};
  for (const opp of available) {
    const cell = {
      wins:0, losses:0, draws:0, errors:0,
      totalTurns:0,
      trSet:0, trTurnsSum:0,
      twSet:0, twTurnsSum:0,
      screensSet:0, screensTurnsSum:0,
      timerExpired:0, hpTiebreak:0,
      winConditions:{},
      sampleLog: null,
    };
    for (let i = 0; i < N; i++) {
      let b;
      try {
        b = simulateBattle(TEAMS[player], TEAMS[opp], { format: FORMAT, seed: auditSeed(player, opp, i) });
      } catch (e) {
        cell.errors++;
        totalErrors++;
        jsErrors.push({player, opp, error: e.message, stack: e.stack.split('\n').slice(0,3).join(' | ')});
        continue;
      }
      if (!b || !['win', 'loss', 'draw'].includes(b.result) || !Array.isArray(b.log)) {
        cell.errors++;
        totalErrors++;
        jsErrors.push({ player, opp, error: 'Malformed battle result or log', stack: String(b && b.result) });
        continue;
      }
      totalBattles++;
      cell[b.result === 'win' ? 'wins' : b.result === 'loss' ? 'losses' : 'draws']++;
      cell.totalTurns += b.turns;
      if (b.trTurns > 0) { cell.trSet++; cell.trTurnsSum += b.trTurns; }
      if (b.twTurns > 0) { cell.twSet++; cell.twTurnsSum += b.twTurns; }
      const scr = b.screens || {};
      const scrSum = (scr.playerReflect||0)+(scr.playerLightScreen||0)+(scr.playerAuroraVeil||0)
                   +(scr.oppReflect||0)+(scr.oppLightScreen||0)+(scr.oppAuroraVeil||0);
      if (scrSum > 0) { cell.screensSet++; cell.screensTurnsSum += scrSum; }
      if (b.timerExpired) cell.timerExpired++;
      if (b.winCondition && b.winCondition.includes('HP Tiebreak')) cell.hpTiebreak++;
      const wc = b.winCondition || 'unknown';
      cell.winConditions[wc] = (cell.winConditions[wc]||0)+1;
      winConditionCounts[wc] = (winConditionCounts[wc]||0)+1;
      if (!cell.sampleLog && b.log.length > 5) cell.sampleLog = b.log.slice(0, 30);
    }
    matrix[player][opp] = cell;
  }
}

const elapsed = ((Date.now() - startTime)/1000).toFixed(1);
console.log(`Completed ${totalBattles} battles in ${elapsed}s, ${totalErrors} JS errors`);

console.log('\n=== WIN CONDITION DISTRIBUTION (all battles) ===');
const wcSorted = Object.entries(winConditionCounts).sort((a,b)=>b[1]-a[1]);
for (const [wc, count] of wcSorted) {
  console.log(`  ${wc}: ${count} (${(count/totalBattles*100).toFixed(1)}%)`);
}

console.log('\n=== WIN RATE MATRIX (% player wins) ===');
process.stdout.write('player\\opp        ');
for (const o of available) process.stdout.write(o.slice(0,10).padEnd(11));
process.stdout.write('\n');
for (const p of available) {
  process.stdout.write(p.slice(0,17).padEnd(18));
  for (const o of available) {
    const c = matrix[p][o];
    const total = c.wins + c.losses + c.draws;
    const wr = total > 0 ? (c.wins/total*100).toFixed(0) : '--';
    process.stdout.write(String(wr).padEnd(11));
  }
  process.stdout.write('\n');
}

console.log('\n=== MIRROR-MATCH WIN RATE CHECK (should be ~50%) ===');
const mirrorFlags = [];
for (const t of available) {
  const c = matrix[t][t];
  const total = c.wins + c.losses + c.draws;
  const wr = total > 0 ? (c.wins/total*100).toFixed(0) : '--';
  const hardFail = total > 0 && (c.wins / total < 0.15 || c.wins / total > 0.85);
  const softFlag = !hardFail && total > 0 && Math.abs(c.wins/total - 0.5) > 0.25;
  const flag = hardFail ? ' [FAIL: mirror WR outside 15-85%]' : softFlag ? ' [FLAG: >25% off 50%]' : '';
  if (hardFail) mirrorFlags.push({ team: t, severity: 'fail', wins: c.wins, losses: c.losses, draws: c.draws, total: total, winRate: total > 0 ? Math.round(c.wins/total*100) : 0 });
  if (softFlag)  mirrorFlags.push({ team: t, severity: 'flag', wins: c.wins, losses: c.losses, draws: c.draws, total: total, winRate: total > 0 ? Math.round(c.wins/total*100) : 0 });
  console.log(`  ${t.padEnd(22)} ${wr}% (${c.wins}w/${c.losses}l/${c.draws}d)${flag}`);
}

console.log('\n=== TR USAGE BY TEAM (as player) ===');
for (const p of available) {
  let trSetTotal = 0, battles = 0, trTurnsSum = 0;
  for (const o of available) {
    const c = matrix[p][o];
    trSetTotal += c.trSet;
    trTurnsSum += c.trTurnsSum;
    battles += c.wins + c.losses + c.draws;
  }
  const pct = battles > 0 ? (trSetTotal/battles*100).toFixed(0) : '--';
  const avg = trSetTotal > 0 ? (trTurnsSum/trSetTotal).toFixed(1) : '0.0';
  console.log(`  ${p.padEnd(22)} TR set ${pct}% of battles, avg ${avg} turns when set`);
}

console.log('\n=== TAILWIND USAGE BY TEAM (as player) ===');
for (const p of available) {
  let twSetTotal = 0, battles = 0, twTurnsSum = 0;
  for (const o of available) {
    const c = matrix[p][o];
    twSetTotal += c.twSet;
    twTurnsSum += c.twTurnsSum;
    battles += c.wins + c.losses + c.draws;
  }
  const pct = battles > 0 ? (twSetTotal/battles*100).toFixed(0) : '--';
  const avg = twSetTotal > 0 ? (twTurnsSum/twSetTotal).toFixed(1) : '0.0';
  console.log(`  ${p.padEnd(22)} TW set ${pct}% of battles, avg ${avg} turns when set`);
}

console.log('\n=== SCREENS USAGE BY TEAM (as player) ===');
for (const p of available) {
  let scrSetTotal = 0, battles = 0;
  for (const o of available) {
    const c = matrix[p][o];
    scrSetTotal += c.screensSet;
    battles += c.wins + c.losses + c.draws;
  }
  const pct = battles > 0 ? (scrSetTotal/battles*100).toFixed(0) : '--';
  console.log(`  ${p.padEnd(22)} screens up ${pct}% of battles`);
}

console.log('\n=== TIMER / HP TIEBREAK OBSERVABILITY ===');
let totalTimer = 0, totalHpTB = 0;
for (const p of available) for (const o of available) {
  totalTimer += matrix[p][o].timerExpired;
  totalHpTB += matrix[p][o].hpTiebreak;
}
console.log(`  timer expiries: ${totalTimer} / ${totalBattles}`);
console.log(`  HP tiebreaks:   ${totalHpTB} / ${totalBattles}`);

console.log('\n=== AVG TURNS PER TEAM (as player) ===');
for (const p of available) {
  let turns = 0, battles = 0;
  for (const o of available) {
    const c = matrix[p][o];
    turns += c.totalTurns;
    battles += c.wins + c.losses + c.draws;
  }
  const avg = battles > 0 ? (turns/battles).toFixed(1) : '--';
  console.log(`  ${p.padEnd(22)} avg ${avg} turns`);
}

if (jsErrors.length > 0) {
  console.log('\n=== JS ERRORS (first 10) ===');
  jsErrors.slice(0,10).forEach(e => {
    console.log(`  ${e.player} vs ${e.opp}: ${e.error}`);
  });
}

// Write full matrix to JSON for deeper analysis
fs.writeFileSync(require('path').join(__dirname, 'audit_matrix.json'), JSON.stringify({
  timestamp: new Date().toISOString(),
  engineVersion: ENGINE_VERSION,
  rulesetId: 'champions_reg_m_a_2026',
  teams: available,
  N, format: FORMAT,
  totalBattles, totalErrors, elapsed, mirrorFlags,
  matrix, winConditionCounts, legalityWarnings, jsErrors: jsErrors.slice(0,50)
}, null, 2));
console.log('\n[wrote tests/audit_matrix.json]');

const hardFailFlags = mirrorFlags.filter(function(f) { return f.severity === 'fail'; });
const fatalReasons = [];
if (hardFailFlags.length > 0) fatalReasons.push('mirror-match win-rate hard failures');
if (totalErrors > 0) fatalReasons.push(totalErrors + ' simulation error(s)');
if (totalBattles !== expectedBattles) fatalReasons.push('completed ' + totalBattles + ' of ' + expectedBattles + ' planned battles');
if (fatalReasons.length > 0) {
  console.error('\nFATAL: battle audit failed: ' + fatalReasons.join('; '));
  hardFailFlags.forEach(function(f){
    console.error(`  ${f.team}: ${f.winRate}% (${f.wins}w/${f.losses}l/${f.draws}d)`);
  });
  process.exit(1);
}
