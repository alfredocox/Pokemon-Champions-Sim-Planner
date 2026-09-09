import assert from 'node:assert/strict';

export function assertRequestedReplay(log, selection) {
  assert.equal(log.player_team_id, selection['player-select']);
  assert.equal(log.opponent_team_id, selection['opponent-select']);
  assert.equal(log.provenance.player_team_id, selection['player-select']);
  assert.equal(log.provenance.opp_team_id, selection['opponent-select']);
  assert.equal(log.provenance.ruleset_id, selection['sim-regulation']);
  assert.equal(log.provenance.opponent_ruleset_id, selection['sim-regulation']);
  assert.equal(log.format, 'doubles');
  assert.equal(log.provenance.format, 'doubles');
  assert.equal(log.provenance.bo, 1);
}

export function assertReplayContinuity(original, exported) {
  // Export/coverage creation times change on download; battle evidence must not.
  const stable = log => {
    const value = structuredClone(log);
    delete value.exported_at;
    if (value.qa_coverage_summary) delete value.qa_coverage_summary.generated_at;
    return value;
  };
  assert.deepEqual(stable(exported), stable(original), 'Retained replay changed after a team swap');
}
