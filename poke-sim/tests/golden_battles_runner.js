// golden_battles_runner.js — Golden battles test runner
// Used by db_m7_golden_battles_tests.js to validate engine changes
// Part of Module 7 implementation

'use strict';

const fs = require('fs');
const path = require('path');

// Load Supabase adapter
var adapterCode = fs.readFileSync('./supabase_adapter.js', 'utf8');
eval(adapterCode);

async function main() {
  console.log('🏁 Running golden battles test suite...');
  
  try {
    // Load golden battles and teams from Supabase
    const goldenBattles = await SupabaseAdapter.loadGoldenBattles();
    const teams = await SupabaseAdapter.loadTeamsFromDB();
    
    console.log('📊 Loaded ' + goldenBattles.length + ' golden battles');
    console.log('📊 Loaded ' + Object.keys(teams).length + ' teams');
    
    let passed = 0;
    let failed = 0;
    
    for (const battle of goldenBattles) {
      console.log('⚔️ Testing battle: ' + battle.player_team_id + ' vs ' + battle.opp_team_id + ' (seed: ' + battle.seed + ')');
      
      try {
        // Get team data
        const playerTeam = teams[battle.player_team_id];
        const oppTeam = teams[battle.opp_team_id];
        
        if (!playerTeam || !oppTeam) {
          throw new Error('Missing team data for battle: ' + battle.analysis_id);
        }
        
        // Run the battle with the specified seed
        const result = window.engine.runOneBattle(battle.seed);
        
        // Generate trace hash (simplified SHA256 of battle logs)
        const trace = generateTraceHash(result.logs || []);
        
        // Compare with expected
        if (trace === battle.expected_trace_hash) {
          console.log('✅ PASS: Trace hash matches expected');
          passed++;
        } else {
          console.log('❌ FAIL: Trace hash mismatch');
          console.log('   Expected: ' + battle.expected_trace_hash);
          console.log('   Actual:   ' + trace);
          console.log('   First differing turn: ' + findFirstDifferingTurn(result.logs || [], battle.expected_logs || []));
          failed++;
        }
        
      } catch (error) {
        console.log('❌ ERROR: Battle execution failed: ' + error.message);
        failed++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Golden Battles Test Results: ' + passed + ' passed, ' + failed + ' failed');
    
    if (failed > 0) {
      console.log('❌ ' + failed + ' battles failed');
      process.exit(1);
    } else {
      console.log('✅ All ' + passed + ' golden battles passed');
    }
    
  } catch (error) {
    console.log('❌ FATAL: Runner failed: ' + error.message);
    process.exit(1);
  }
}

function generateTraceHash(logs) {
  // Simple SHA256 implementation for battle trace comparison
  const crypto = require('crypto');
  const traceString = logs.map(log => 
    log.result + '|' + log.turns + '|' + log.tr_turns + '|' + log.win_condition + '|' + log.log
  ).join('\n');
  
  return crypto.createHash('sha256').update(traceString).digest('hex');
}

function findFirstDifferingTurn(actualLogs, expectedLogs) {
  // Find the first turn where logs differ
  const maxTurns = Math.max(actualLogs.length, expectedLogs.length);
  for (let i = 0; i < maxTurns; i++) {
    const actualTurn = actualLogs[i] || {};
    const expectedTurn = expectedLogs[i] || {};
    
    if (JSON.stringify(actualTurn) !== JSON.stringify(expectedTurn)) {
      return i + 1; // Turns are 1-indexed
    }
  }
  return null;
}

// Run if called directly
if (require.main === module) {
  main();
}
