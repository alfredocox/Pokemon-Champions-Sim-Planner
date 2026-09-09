// golden_battles_runner.js — M7: Deterministic engine regression runner
// Loads data.js + engine.js in VM, replays battles from a JSON fixture,
// and verifies trace hashes match. Exit 0 = all pass, exit 1 = mismatch.
//
// Usage:
//   node tests/golden_battles_runner.js            — verify hashes
//   node tests/golden_battles_runner.js --generate — compute & save hashes

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'golden_battles.json');

// ─── VM Context (same pattern as other test files) ────────────────────────
function load(ctx, filename) {
  var src = fs.readFileSync(path.join(ROOT, filename), 'utf8');
  vm.runInContext(src, ctx, { filename: filename });
}

function createEngineContext() {
  var ctx = vm.createContext({ console: console });
  load(ctx, 'data.js');
  load(ctx, 'engine.js');
  load(ctx, 'generated/pokemon_showdown_legal_data.js');
  // const-scoped vars need explicit export to context's this
  vm.runInContext('this.TEAMS=TEAMS; this.simulateBattle=simulateBattle;', ctx);
  return ctx;
}

// ─── Trace hash: SHA256 of battle log joined by newlines ──────────────────
function traceHash(log) {
  if (!log || !log.length) return 'EMPTY_LOG';
  var canonical = log.join('\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ─── Main ─────────────────────────────────────────────────────────────────
function run(generateMode) {
  var fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  var battles = fixture.battles;

  if (!battles || !battles.length) {
    console.error('FATAL: No battles in fixture file.');
    process.exit(1);
  }

  var ctx = createEngineContext();
  var TEAMS = ctx.TEAMS;
  var simulateBattle = ctx.simulateBattle;

  console.log('Golden Battles Runner — ' + battles.length + ' battle(s)');
  console.log(generateMode ? 'MODE: --generate (computing hashes)\n' : 'MODE: verify\n');

  var passed = 0, failed = 0;
  var updated = false;

  for (var i = 0; i < battles.length; i++) {
    var b = battles[i];
    var playerTeam = TEAMS[b.player_team_id];
    var oppTeam = TEAMS[b.opp_team_id];

    if (!playerTeam) { console.error('  MISSING TEAM: ' + b.player_team_id); failed++; continue; }
    if (!oppTeam)    { console.error('  MISSING TEAM: ' + b.opp_team_id); failed++; continue; }

    var result = simulateBattle(playerTeam, oppTeam, {
      format: b.format || 'doubles',
      seed: b.seed
    });

    var hash = traceHash(result.log);
    var winner = result.result; // 'win' | 'loss' | 'draw'

    if (generateMode) {
      b.expected_trace_hash = hash;
      b.expected_winner = winner;
      updated = true;
      console.log('  [' + b.golden_id + '] ' + b.description);
      console.log('    hash: ' + hash.substring(0, 16) + '…  winner: ' + winner);
    } else {
      if (!b.expected_trace_hash) {
        console.log('  ✖ [' + b.golden_id + '] MISSING EXPECTED HASH');
        failed++;
        continue;
      }
      if (hash === b.expected_trace_hash && winner === b.expected_winner) {
        console.log('  ✔ [' + b.golden_id + '] ' + b.description);
        passed++;
      } else {
        console.log('  ✖ [' + b.golden_id + '] GOLDEN STATE MISMATCH');
        console.log('    Expected: ' + b.expected_trace_hash.substring(0, 16) + '…');
        console.log('    Actual:   ' + hash.substring(0, 16) + '…');
        console.log('    Winner:   expected ' + b.expected_winner + ', got ' + winner);
        console.log('    Turns:    ' + result.turns);
        // Find first differing line (rough diff)
        if (b._expected_log_length) {
          console.log('    (expected ~' + b._expected_log_length + ' log lines, got ' + (result.log || []).length + ')');
        }
        failed++;
      }
    }
  }

  if (generateMode && updated) {
    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + '\n');
    console.log('\n✅ Fixture updated with ' + battles.length + ' hashes.');
  } else if (!generateMode) {
    if (passed === 0) {
      console.log('❌ No golden battle was verified.');
      failed++;
    }
    console.log('\n' + '='.repeat(50));
    console.log('Golden Battles: ' + passed + ' passed, ' + failed + ' failed');
    if (failed > 0) {
      console.log('❌ FAIL');
      process.exit(1);
    } else {
      console.log('✅ All golden battles passed');
    }
  }
}

// ─── Export for db_m7 tests + direct invocation ───────────────────────────
module.exports = { run: run, traceHash: traceHash, createEngineContext: createEngineContext, FIXTURE_PATH: FIXTURE_PATH };

if (require.main === module) {
  var generateMode = process.argv.includes('--generate');
  run(generateMode);
}
