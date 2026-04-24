// T9j.12 lead-impact empirical validation.
//
// QUESTION: Does changing the LEAD pair (same 4-mon bring, different order)
// measurably change sim outcomes? If yes, the bring picker is not cosmetic;
// the logic is live end-to-end.
//
// APPROACH:
//   Fix a matchup (player vs opp).
//   Run N=200 battles with lead-order A.
//   Run N=200 battles with lead-order B (same 4 mons, swap positions 0 and 1).
//   Run N=200 battles with lead-order C (bring a different 4-of-6 subset).
//   Compare win rates. If leads don't matter, all three should be statistically
//   the same (within ~7pp at N=200 per Wilson 95% CI at wr~0.5).
//
// Cites:
//   https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Math, Object, Array, JSON, Date };
vm.createContext(ctx);
function load(f){ vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'), ctx, { filename:f }); }
load('data.js');
load('engine.js');
vm.runInContext('this.TEAMS=TEAMS; this.simulateBattle=simulateBattle;', ctx);
const { TEAMS, simulateBattle } = ctx;

function runN(N, playerKey, oppKey, playerBring, opponentBring) {
  let w=0, l=0, d=0;
  for (let i=0; i<N; i++) {
    const r = simulateBattle(TEAMS[playerKey], TEAMS[oppKey], {
      format: 'doubles', playerBring, opponentBring
    });
    if (r.result === 'win') w++;
    else if (r.result === 'loss') l++;
    else d++;
  }
  const wr = w / N;
  // Wilson 95% CI for a binomial proportion (N=200, z=1.96).
  const z=1.96, p=wr, n=N;
  const denom = 1 + z*z/n;
  const center = (p + z*z/(2*n)) / denom;
  const margin = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / denom;
  return { w, l, d, wr, lo: center-margin, hi: center+margin };
}

function fmt(x){ return (x*100).toFixed(1)+'%'; }
function pair(lineup){ return '[' + lineup.join(', ') + ']'; }

const PLAYER_KEY = 'player';                  // TR Counter Squad
const OPP_KEY    = 'mega_altaria';            // Mega Altaria
const N = 200;

console.log(`\n=== T9j.12 lead-impact validation ===`);
console.log(`Matchup: ${TEAMS[PLAYER_KEY].name} vs ${TEAMS[OPP_KEY].name}`);
console.log(`Sample: N=${N} per cell, format=doubles\n`);

const pMembers = TEAMS[PLAYER_KEY].members.map(m => m.name);
const oMembers = TEAMS[OPP_KEY].members.map(m => m.name);
console.log(`Player 6: ${pair(pMembers)}`);
console.log(`Opp 6:    ${pair(oMembers)}\n`);

// A: first 4 members, original lead order.
const bringA_p = pMembers.slice(0, 4);
// B: same 4 members, swap LEADS (positions 0 and 1).
const bringB_p = [pMembers[1], pMembers[0], pMembers[2], pMembers[3]];
// D: same 4 members, swap BENCH (positions 2 and 3).
const bringD_p = [pMembers[0], pMembers[1], pMembers[3], pMembers[2]];
// C: bring a DIFFERENT 4-of-6 (last 4 members).
const bringC_p = pMembers.slice(2, 6);
// Opp stays fixed on its first 4 so we isolate the player-bring effect.
const bringO   = oMembers.slice(0, 4);

const resA = runN(N, PLAYER_KEY, OPP_KEY, bringA_p, bringO);
const resB = runN(N, PLAYER_KEY, OPP_KEY, bringB_p, bringO);
const resD = runN(N, PLAYER_KEY, OPP_KEY, bringD_p, bringO);
const resC = runN(N, PLAYER_KEY, OPP_KEY, bringC_p, bringO);

function row(label, bring, r) {
  console.log(`  ${label.padEnd(34)} bring ${pair(bring).padEnd(70)}  W/L/D = ${String(r.w).padStart(3)}/${String(r.l).padStart(3)}/${String(r.d).padStart(3)}   wr = ${fmt(r.wr)}   95% CI [${fmt(r.lo)}, ${fmt(r.hi)}]`);
}
row('A original order',                       bringA_p, resA);
row('B swap LEADS 0<->1 (same 4)',            bringB_p, resB);
row('D swap BENCH 2<->3 (same 4)',            bringD_p, resD);
row('C different 4-of-6 (last 4)',            bringC_p, resC);

function overlap(r1, r2) { return !(r1.hi < r2.lo || r2.hi < r1.lo); }

console.log(`\nInterpretation:`);
console.log(`  A vs B (swap leads):        CI overlap = ${overlap(resA, resB) ? 'YES' : 'NO '} - |dwr| = ${fmt(Math.abs(resA.wr - resB.wr))}`);
console.log(`  A vs D (swap bench):        CI overlap = ${overlap(resA, resD) ? 'YES' : 'NO '} - |dwr| = ${fmt(Math.abs(resA.wr - resD.wr))}`);
console.log(`  A vs C (different bring):   CI overlap = ${overlap(resA, resC) ? 'YES' : 'NO '} - |dwr| = ${fmt(Math.abs(resA.wr - resC.wr))}`);

// Exit 0 always; this is a validation report, not a pass/fail test.
