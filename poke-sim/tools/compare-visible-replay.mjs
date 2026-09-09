import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const labelKey = value => normalize(value).toLowerCase();
const movePrefixes = lines => [...new Set(lines.map(line => normalize(line).match(/^(.+? used .+?!)/)?.[1]).filter(Boolean))];

export function compareVisibleReplay(log, visual) {
  const issues = [];
  let checks = 0;
  const check = (ok, code, location, expected, actual) => {
    checks++;
    if (!ok) issues.push({ code, location, expected, actual });
  };
  const equal = (actual, expected, code, location) => check(JSON.stringify(actual) === JSON.stringify(expected), code, location, expected, actual);
  const turns = Array.isArray(log?.turnLog) ? log.turnLog : [];
  check(turns.length > 0, 'missing_turn_log', 'log', 'nonempty turnLog', turns.length);
  check(visual?.schema_version === 'champions-visible-replay-v1', 'invalid_capture', 'visual', 'champions-visible-replay-v1', visual?.schema_version);
  const p = log?.provenance;
  check(!!p?.build_id && !!p?.player_team_digest && !!p?.opp_team_digest, 'missing_identity', 'log.provenance', 'execution identity', p || null);
  // Older captures retain the exact version in the banner rather than a dedicated field.
  const rendererBuild = visual?.renderer_build_id || (visual?.banner || '').match(/\b(v\d+\.\d+\.\d+-[a-z0-9-]+)\b/)?.[1];
  equal(rendererBuild, log?.exporter_build_id || p?.build_id, 'build_mismatch', 'renderer_build_id');
  check(!!p?.build_id && log?.build_id === p.build_id, 'execution_build_mismatch', 'log.build_id', p?.build_id, log?.build_id);
  equal(visual?.title, `${String(log?.result || '').toUpperCase()} vs ${log?.opponent_team?.name || ''}`, 'replay_title_mismatch', 'title');
  equal(Number((visual?.meta || '').match(/^(\d+) turns/)?.[1]), turns.length, 'turn_count_mismatch', 'meta');
  equal((visual?.turns || []).map(t => t.label), turns.map(t => `T${t.turn}`), 'turn_sequence_mismatch', 'turns');
  equal((visual?.boards || []).map(b => labelKey(b.label)), turns.length ? ['turn 0', ...turns.map(t => `after t${t.turn}`)] : [], 'board_sequence_mismatch', 'boards');
  const snapshots = turns.length ? [{ label: 'Turn 0', snapshot: turns[0].pre }, ...turns.map(t => ({ label: `After T${t.turn}`, snapshot: t.post }))] : [];
  for (const { label, snapshot } of snapshots) {
    const board = visual?.boards?.find(b => labelKey(b.label) === labelKey(label));
    for (const side of ['player', 'opponent']) {
      const roster = snapshot?.roster?.[side] || [];
      const actual = board?.[side] || [];
      check(roster.length > 0, 'missing_roster', `${label}.${side}`, 'nonempty roster', roster.length);
      equal(actual.length, roster.length, 'roster_count_mismatch', `${label}.${side}`);
      const keys = log?.participants?.[side]?.map(m => m.stable_key) || [];
      for (const mon of roster) {
        const location = `${label}.${side}.${mon.stableKey || mon.displayName}`;
        check(keys.includes(mon.stableKey), 'unselected_participant', location, keys, mon.stableKey);
        const matches = actual.filter(row => row.name === mon.displayName);
        equal(matches.length, 1, 'ambiguous_or_missing_member', location);
        if (matches.length !== 1) continue;
        const row = matches[0];
        equal(labelKey(row.status), labelKey(mon.status), 'status_mismatch', location);
        check(normalize(row.hp).startsWith(`HP: ${mon.hpLabel}`), 'hp_mismatch', location, mon.hpLabel, row.hp);
        equal(Number.parseFloat(row.hp_bar), Number(mon.hp), 'hp_bar_mismatch', location);
        const meta = [mon.item, mon.ability].filter(Boolean).join(' \u00b7 ');
        const visibleMeta = row.metadata.filter(value => !/^(HP|Impact|Moves):/.test(value));
        equal(visibleMeta, meta ? [meta] : [], 'item_ability_mismatch', location);
        check(row.metadata.includes(`Moves: ${(mon.moves || []).slice(0, 4).join(' / ') || 'unknown'}`), 'moves_mismatch', location, mon.moves, row.metadata);
      }
    }
    const field = snapshot?.field || {};
    const expectedTags = [];
    for (const key of ['weather', 'terrain']) if (field[key]) expectedTags.push(`${field[key]}${field[key + '_turns'] ? ` ${field[key + '_turns']}T` : ''}`);
    if (field.trick_room > 0) expectedTags.push(`Trick Room ${field.trick_room}T`);
    for (const [side, prefix] of [['player', 'Your'], ['opponent', 'Their']]) {
      const speed = snapshot?.speed_control?.[side] || {};
      if (speed.tailwind_turns > 0) expectedTags.push(`${prefix} Tailwind ${speed.tailwind_turns}T`);
      for (const [key, name] of [['reflect', 'Reflect'], ['light', 'Light Screen'], ['aurora', 'Aurora Veil']]) {
        if (speed.screens?.[key] > 0) expectedTags.push(`${prefix} ${name} ${speed.screens[key]}T`);
      }
    }
    equal((board?.field || []).map(labelKey).sort(), expectedTags.map(labelKey).sort(), 'field_state_mismatch', label);
  }
  for (const turn of turns) {
    const lines = visual?.turns?.find(t => t.label === `T${turn.turn}`)?.lines || [];
    const expected = movePrefixes((turn.events || []).map(e => e.text || e.message || ''));
    const actual = movePrefixes(lines);
    check(Array.isArray(turn.events), 'missing_action_evidence', `T${turn.turn}`, 'events array', turn.events);
    equal(actual, expected, 'resolved_move_order_or_omission', `T${turn.turn}`);
    for (const event of turn.damage_events || []) {
      const amount = event.applied_damage ?? event.damage ?? 0;
      const token = `${event.target} lost ${amount} HP`;
      check(lines.some(line => line.startsWith(`${event.attacker} used ${event.move}!`) && line.includes(token)), 'damage_display_mismatch', `T${turn.turn}`, token, lines);
    }
  }
  return { schema_version: 'champions-visual-comparison-v1', seed: log?.seed || null,
    build_id: p?.build_id || null, team_ids: [p?.player_team_id, p?.opp_team_id],
    status: issues.length ? 'mismatch' : 'matched_observable_fields', checks, turns: turns.length, issues,
    not_checked: ['Independent real-game mechanics parity', 'Hidden stable IDs and exact stats not printed in replay cards',
      'Every same-name repeated action, effect tooltip and coach claim', 'Pixel layout outside inspected screenshots; lazy sprites outside viewport', 'Production DB persistence'] };
}

export function ingestDirectory(directory) {
  const names = fs.readdirSync(directory);
  const files = names.filter(name => name.endsWith('.visual.json')).sort();
  if (!files.length) throw new Error('No paired visible replay captures');
  const inventory = JSON.parse(fs.readFileSync(path.join(directory, 'capture-inventory.json')));
  const cases = inventory.cases;
  if (inventory.schema_version !== 'champions-visual-inventory-v1' || !Array.isArray(cases) || !cases.length ||
      !Number.isInteger(inventory.expected_game_count) || inventory.expected_game_count < 0 ||
      cases.some(c => !/^[a-zA-Z0-9,._-]+$/.test(c.id) || !['simulation', 'continuity'].includes(c.kind) || !c.seed) ||
      new Set(cases.map(c => c.id)).size !== cases.length ||
      cases.filter(c => c.kind === 'simulation').length !== inventory.expected_game_count) throw new Error('Invalid expected-game inventory');
  const ids = cases.map(c => c.id).sort();
  const visualIds = files.map(f => f.replace(/\.visual\.json$/, '')).sort();
  const logIds = names.filter(f => f.endsWith('.log.json')).map(f => f.replace(/\.log\.json$/, '')).sort();
  if (JSON.stringify(ids) !== JSON.stringify(visualIds) || JSON.stringify(ids) !== JSON.stringify(logIds)) {
    throw new Error('Unpaired, unexpected or missing evidence: inventory, logs and visible captures must match exactly');
  }
  const reports = files.map(file => {
    const logName = file.replace(/\.visual\.json$/, '.log.json');
    const logBytes = fs.readFileSync(path.join(directory, logName));
    const visualBytes = fs.readFileSync(path.join(directory, file));
    const log = JSON.parse(logBytes);
    const captureCase = cases.find(c => c.id === file.replace(/\.visual\.json$/, ''));
    if (JSON.stringify(captureCase.seed) !== JSON.stringify(log.seed)) throw new Error('Seed differs from capture inventory: ' + file);
    const report = compareVisibleReplay(log, JSON.parse(visualBytes));
    return { ...report, case_kind: captureCase.kind, log_file: logName, visual_file: file,
      log_sha256: createHash('sha256').update(logBytes).digest('hex'), visual_sha256: createHash('sha256').update(visualBytes).digest('hex') };
  });
  const issue_counts = {};
  for (const report of reports) for (const issue of report.issues) issue_counts[issue.code] = (issue_counts[issue.code] || 0) + 1;
  return { schema_version: 'champions-visual-ingestion-v1', generated_at: new Date().toISOString(),
    evidence_scope: 'local downloaded JSON versus visible DOM; not trusted promotion',
    expected_game_count: inventory.expected_game_count, pairs: reports.length, mismatch_pairs: reports.filter(r => r.issues.length).length,
    turns: reports.reduce((n, r) => n + r.turns, 0), issue_counts, reports };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const directory = path.resolve(process.argv[2]);
    const report = ingestDirectory(directory);
    fs.writeFileSync(path.join(directory, 'comparison-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ pairs: report.pairs, turns: report.turns, mismatch_pairs: report.mismatch_pairs, issue_counts: report.issue_counts }, null, 2));
    process.exitCode = report.mismatch_pairs ? 1 : 0;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
