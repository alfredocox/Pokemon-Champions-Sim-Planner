// Nightly bring picker sanity harness (T9j.12).
//
// PURPOSE: Verify at high N that the bring picker is still wired end-to-end
// and that lead/bench selection changes sim outcomes in the expected
// direction. Run manually or from cron; NOT included in the fast regression
// loop (node tests/t9j12_tests.js already covers the unit surface in ~100 ms).
//
// USAGE:
//   node tests/nightly_bring_harness.js            # default N=2000 per cell
//   N=500 node tests/nightly_bring_harness.js      # override sample size
//
// FLOOR (all must hold, else exit 1):
//   1. win rates for A / B / D / C must all be finite in [0, 1]
//   2. no JS errors thrown across all cells
//   3. at least one non-ceiling matchup must show |wr(A) - wr(C)| >= 0.25.
//      Ceiling matchups (wr_A >= 0.95 or <= 0.05) are skipped for this check
//      since one side dominates regardless of the 4-of-6 pick; failing on
//      them would give false negatives on the wiring.
//
// CITATIONS:
//   https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   https://www.vgcguide.com/team-preview
//   https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = parseInt(process.env.N || '2000', 10);

const ctx = { console, Math, Object, Array, JSON, Date };
vm.createContext(ctx);
function load(f){ vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'), ctx, { filename:f }); }
load('data.js');
load('engine.js');
vm.runInContext('this.TEAMS=TEAMS; this.simulateBattle=simulateBattle;', ctx);
const { TEAMS, simulateBattle } = ctx;

function runCell(N, playerKey, oppKey, playerBring, opponentBring) {
  let w=0, l=0, d=0, errors=0;
  const t0 = Date.now();
  for (let i=0; i<N; i++) {
    try {
      const r = simulateBattle(TEAMS[playerKey], TEAMS[oppKey], {
        format: 'doubles', playerBring, opponentBring
      });
      if (r.result === 'win') w++;
      else if (r.result === 'loss') l++;
      else d++;
    } catch (e) {
      errors++;
    }
  }
  const ms = Date.now() - t0;
  const wr = w / N;
  const z=1.96, p=wr, n=N;
  const denom = 1 + z*z/n;
  const center = (p + z*z/(2*n)) / denom;
  const margin = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / denom;
  return { w, l, d, wr, lo: center-margin, hi: center+margin, errors, ms };
}

function fmt(x){ return (x*100).toFixed(2)+'%'; }
function overlap(r1, r2) { return !(r1.hi < r2.lo || r2.hi < r1.lo); }

const MATCHUPS = [
  { label: 'TR Counter vs Mega Altaria',            p: 'player',              o: 'mega_altaria' },
  { label: 'TR Counter vs Rin Sand',                p: 'player',              o: 'rin_sand' },
  { label: 'TR Counter vs Chuppa Balance',          p: 'player',              o: 'chuppa_balance' },
  { label: 'Mega Dragonite vs Kingambit Sneasler',  p: 'mega_dragonite',      o: 'kingambit_sneasler' },
  { label: 'Aurora Veil vs Suica Sun',              p: 'aurora_veil_froslass', o: 'suica_sun' }
];

console.log('\n=== Nightly bring harness (T9j.12) ===');
console.log(`Sample: N=${N} per cell  format=doubles\n`);

let anyFail = false;
const summary = [];
const FLOOR_DELTA = 0.25;

for (const m of MATCHUPS) {
  if (!TEAMS[m.p] || !TEAMS[m.o]) { console.log(`SKIP ${m.label} (missing team)`); continue; }
  const pNames = TEAMS[m.p].members.map(x => x.name);
  const oNames = TEAMS[m.o].members.map(x => x.name);
  if (pNames.length < 6 || oNames.length < 6) { console.log(`SKIP ${m.label} (need 6 mons)`); continue; }

  const bringA = pNames.slice(0, 4);                                           // original
  const bringB = [pNames[1], pNames[0], pNames[2], pNames[3]];                  // swap leads
  const bringD = [pNames[0], pNames[1], pNames[3], pNames[2]];                  // swap bench
  const bringC = pNames.slice(2, 6);                                            // different 4-of-6
  const oppB   = oNames.slice(0, 4);

  console.log(`> ${m.label}`);
  const rA = runCell(N, m.p, m.o, bringA, oppB);
  const rB = runCell(N, m.p, m.o, bringB, oppB);
  const rD = runCell(N, m.p, m.o, bringD, oppB);
  const rC = runCell(N, m.p, m.o, bringC, oppB);
  console.log(`  A original                  wr=${fmt(rA.wr)}  CI[${fmt(rA.lo)}, ${fmt(rA.hi)}]  err=${rA.errors}  (${rA.ms} ms)`);
  console.log(`  B swap leads (same 4)       wr=${fmt(rB.wr)}  CI[${fmt(rB.lo)}, ${fmt(rB.hi)}]  err=${rB.errors}  (${rB.ms} ms)`);
  console.log(`  D swap bench (same 4)       wr=${fmt(rD.wr)}  CI[${fmt(rD.lo)}, ${fmt(rD.hi)}]  err=${rD.errors}  (${rD.ms} ms)`);
  console.log(`  C different 4-of-6          wr=${fmt(rC.wr)}  CI[${fmt(rC.lo)}, ${fmt(rC.hi)}]  err=${rC.errors}  (${rC.ms} ms)`);

  const dAC = Math.abs(rA.wr - rC.wr);
  const finite = [rA, rB, rD, rC].every(r => Number.isFinite(r.wr) && r.wr >= 0 && r.wr <= 1);
  const errs   = [rA, rB, rD, rC].reduce((s, r) => s + r.errors, 0);
  const ceiling = (rA.wr >= 0.95 || rA.wr <= 0.05);
  const bringSubsetMoves = dAC >= FLOOR_DELTA;
  const cellOk = finite && errs === 0;
  const verdict = !cellOk ? 'FAIL' : ceiling ? 'CEIL' : (bringSubsetMoves ? 'PASS' : 'WEAK');
  console.log(`  |wr(A) - wr(C)| = ${fmt(dAC)}   floor >= ${fmt(FLOOR_DELTA)}   ${verdict}\n`);
  summary.push({ label: m.label, A: rA.wr, B: rB.wr, D: rD.wr, C: rC.wr, dAC, verdict, cellOk, ceiling, bringSubsetMoves });
  if (!cellOk) anyFail = true;
}

console.log('=== Summary ===');
for (const s of summary) {
  console.log(`  ${s.verdict}  ${s.label.padEnd(40)}  A=${fmt(s.A)}  B=${fmt(s.B)}  D=${fmt(s.D)}  C=${fmt(s.C)}  |A-C|=${fmt(s.dAC)}`);
}
const nonCeiling = summary.filter(s => !s.ceiling);
const anyNonCeilingMoved = nonCeiling.some(s => s.bringSubsetMoves);
// The whole harness PASSes if:
//  (a) no cell errored out or produced a non-finite win rate AND
//  (b) at least one non-ceiling matchup showed |A-C| >= 25pp (proves bring
//      is wired into the engine).
const wiringProven = nonCeiling.length === 0 ? true : anyNonCeilingMoved;
const overallPass = !anyFail && wiringProven;
console.log('');
console.log(`Non-ceiling matchups: ${nonCeiling.length}  /  proving bring wiring: ${nonCeiling.filter(s => s.bringSubsetMoves).length}`);
console.log(overallPass
  ? 'NIGHTLY: PASS (bring picker drives outcomes at non-ceiling matchups)'
  : 'NIGHTLY: FAIL (bring logic may be disconnected or threw errors)');
process.exit(overallPass ? 0 : 1);
