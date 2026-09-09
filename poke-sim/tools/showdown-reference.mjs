import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Battle, Dex, TeamValidator } = require('pokemon-showdown');
const root = new URL('../', import.meta.url);
const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const PIN = '0.11.11';
export const FORMATS = ['gen9championsvgc2026regma', 'gen9championsvgc2026regmb', 'gen9championsdoublescustomgame'];
export const INTAKE_POLICY = 'champions-reference-intake-v1';
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');

export function referenceIdentity() {
  const installed = require('pokemon-showdown/package.json');
  if (installed.version !== PIN) throw new Error('Reference package version differs from reviewed pin');
  const lock = JSON.parse(fs.readFileSync(new URL('package-lock.json', root)));
  return { package: installed.name, version: installed.version,
    integrity: lock.packages['node_modules/pokemon-showdown']?.integrity,
    simulator_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/sim/battle.js'))),
    champions_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/mods/champions/scripts.js'))),
    champions_learnsets_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/mods/champions/learnsets.js'))),
    champions_rulesets_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/mods/champions/rulesets.js'))),
    validator_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/sim/team-validator.js'))),
    champions_ma_sha256: hash(fs.readFileSync(require.resolve('pokemon-showdown/dist/data/mods/championsregma/scripts.js'))) };
}

export function resolveFormat(id) {
  const format = Dex.formats.get(id);
  if (!FORMATS.includes(id) || !format.exists || format.gameType !== 'doubles') throw new Error('Unsupported explicit doubles reference format: ' + id);
  return format;
}

function inputError(code, path, message) {
  return Object.assign(new Error(message), { code, path });
}

export function prepareReferenceTeam(team, formatId, policy = 'strict-v1') {
  if (!['strict-v1', INTAKE_POLICY].includes(policy)) throw inputError('unknown_policy', 'policy', 'Unknown explicit intake policy');
  const format = resolveFormat(formatId);
  const originalText = JSON.stringify(team, (key, value) => {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint' ||
        (typeof value === 'number' && !Number.isFinite(value))) throw inputError('non_json_input', key, 'Input must retain exact JSON values');
    return value;
  });
  const original = JSON.parse(originalText);
  const canonical = clone(original);
  const evidence = { policy_id: policy, original_input: original, original_sha256: hash(originalText),
    canonical_input: canonical, normalizations: [], provenance: [] };
  if (policy === INTAKE_POLICY) {
    const dex = Dex.mod(format.mod);
    if (formatId.includes('customgame') || dex.formats.getRuleTable(format).adjustLevel !== 50) {
      throw inputError('unsupported_policy_format', 'format_id', 'Normalization requires pinned rated Flat Rules Adjust Level = 50');
    }
    if (canonical?.format === 'champions' && Array.isArray(canonical.members)) {
      canonical.members.forEach((member, index) => {
        if (!member || typeof member !== 'object' || Array.isArray(member)) return;
        const prefix = 'members[' + index + ']';
        if (!Object.hasOwn(member, 'level')) {
          member.level = 50;
          evidence.normalizations.push({ path: prefix + '.level', before_present: false, after: 50,
            reason: 'pinned_flat_rules_adjust_level_50', source: 'pokemon-showdown@' + PIN + ':' + formatId + ':flatrules' });
        }
        for (const field of ['nature_source', 'ev_source']) if (Object.hasOwn(member, field)) {
          evidence.provenance.push({ path: prefix + '.' + field, value: clone(member[field]) });
          evidence.normalizations.push({ path: prefix + '.' + field, before_present: true, after_present: false, reason: 'retained_as_provenance_not_battle_input' });
          delete member[field];
        }
      });
    }
  }
  evidence.canonical_sha256 = hash(JSON.stringify(canonical));
  return evidence;
}

export function mapTeam(team, side, formatId) {
  const format = resolveFormat(formatId);
  if (!['p1', 'p2'].includes(side)) throw new Error('Invalid side');
  if (team?.format !== 'champions') throw inputError('missing_stat_format', 'format', 'Explicit Champions stat-point format required; EV conversion is not implicit');
  if (!Array.isArray(team.members) || team.members.length < 2 || team.members.length > 6) throw inputError('member_count', 'members', 'Expected two to six registered members');
  const dex = Dex.mod(format.mod);
  return team.members.map((member, slot) => {
    const at = 'members[' + slot + ']';
    if (!member || typeof member !== 'object' || Array.isArray(member)) throw inputError('invalid_member', at, 'Expected a member object');
    const allowed = ['name', 'species', 'ability', 'item', 'nature', 'level', 'evs', 'sps', 'spread', 'moves', 'role'];
    const unknown = Object.keys(member).find(k => !allowed.includes(k));
    if (unknown) throw inputError('unsupported_member_field', at + '.' + unknown, 'Unsupported member field or initial battle state at ' + side + ':' + slot);
    if (member.name && member.species && dex.species.get(member.name).id !== dex.species.get(member.species).id) throw inputError('conflicting_species', at, 'Conflicting species identity');
    const species = dex.species.get(member.name || member.species);
    if (!species.exists) throw inputError('unknown_species', at + '.species', 'Unknown species at ' + side + ':' + slot);
    if (member.level !== 50) throw inputError(Object.hasOwn(member, 'level') ? 'unsupported_level' : 'missing_level', at + '.level', 'Prototype requires explicit level 50');
    const nature = dex.natures.get(member.nature);
    const ability = dex.abilities.get(member.ability);
    if (!nature.exists || !ability.exists) throw inputError('unknown_nature_ability', at, 'Unknown or missing nature/ability at ' + side + ':' + slot);
    if (member.item && !dex.items.get(member.item).exists) throw inputError('unknown_item', at + '.item', 'Unknown item at ' + side + ':' + slot);
    const sources = [member.sps, member.spread, member.evs].filter(Boolean);
    if (sources.length !== 1) throw inputError('ambiguous_stat_source', at, 'Missing or ambiguous stat-point source at ' + side + ':' + slot);
    const spread = sources[0];
    if (Object.keys(spread).some(k => !keys.includes(k)) || keys.some(k => !Number.isInteger(spread[k]) || spread[k] < 0 || spread[k] > 32) ||
        keys.reduce((n, k) => n + spread[k], 0) > 66) throw inputError('invalid_stat_points', at, 'Invalid Champions stat points at ' + side + ':' + slot);
    if (!Array.isArray(member.moves) || member.moves.length < 1 || member.moves.length > 4 ||
        member.moves.some(m => !dex.moves.get(m).exists)) throw inputError('unknown_move', at + '.moves', 'Unknown or missing move at ' + side + ':' + slot);
    return { name: side + 'm' + (slot + 1), species: species.name, ability: ability.name,
      item: member.item ? dex.items.get(member.item).name : '', nature: nature.name, level: 50, evs: clone(spread), moves: member.moves.map(m => dex.moves.get(m).name) };
  });
}

export function validateReferenceTeam(team, formatId, side = 'p1', options = {}) {
  let intake, mapped;
  const base = { format_id: formatId, side, evidence_scope: typeof formatId === 'string' && formatId.includes('customgame') ? 'synthetic_mechanics_only' : 'showdown_validation_not_official_approval' };
  try {
    referenceIdentity();
  } catch (error) {
    return { ...base, status: 'reference_error', reference_validation: 'not_run', errors: [error.message],
      reasons: [{ code: 'reference_setup_error', path: '', message: error.message }] };
  }
  try {
    intake = prepareReferenceTeam(team, formatId, options.policy);
    mapped = mapTeam(intake.canonical_input, side, formatId);
  } catch (error) {
    return { ...base, status: 'unsupported_input', reference_validation: 'not_run', errors: [error.message],
      reasons: [{ code: error.code || 'adapter_error', path: error.path || '', message: error.message }], intake };
  }
  try {
    const validated = clone(mapped);
    const errors = new TeamValidator(formatId).validateTeam(validated) || [];
    return { ...base, status: errors.length ? 'rejected' : 'accepted_by_reference', reference_validation: 'completed',
      errors, reasons: errors.map(message => ({ code: 'reference_rejection', path: '', message })), intake,
      mapped, validated, normalized_by_validator: JSON.stringify(mapped) !== JSON.stringify(validated) };
  } catch (error) {
    return { ...base, status: 'reference_error', reference_validation: 'failed', errors: [error.message],
      reasons: [{ code: 'reference_execution_error', path: '', message: error.message }], intake, mapped };
  }
}

function snapshot(battle) {
  return Object.fromEntries(battle.sides.map(side => [side.id, side.pokemon.map(mon => ({
    key: mon.set.name, species: mon.species.name, hp: mon.hp, maxhp: mon.maxhp, stats: { ...mon.storedStats },
    substitute_hp: mon.volatiles.substitute?.hp || 0,
    perish_song_turns: mon.volatiles.perishsong?.duration || 0,
    item: mon.item, ability: mon.ability, active: mon.isActive, fainted: mon.fainted, boosts: { ...mon.boosts }, action_speed: mon.getActionSpeed(),
    moves: mon.moveSlots.map(m => ({ id: m.id, pp: m.pp, maxpp: m.maxpp }))
  }))]));
}

function scriptedChoice(battle, sideId, actions) {
  const side = battle[sideId];
  if (!Array.isArray(actions) || actions.length !== 2) throw new Error('Every turn needs two explicit moves per side');
  return actions.map((action, slot) => {
    const actor = side.active[slot];
    if (!actor || actor.fainted) throw new Error('Replacement/fainted-slot scripting is outside this prototype');
    const move = battle.dex.moves.get(action.move);
    if (!move.exists || !actor.moveSlots.some(m => m.id === move.id)) throw new Error('Scripted move is not on the actor');
    const targeted = ['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf', 'adjacentFoe'].includes(move.target);
    let target = '';
    if (targeted) {
      if (![0, 1].includes(action.targetSlot) || !['foe', 'ally'].includes(action.targetSide)) throw new Error('Explicit target slot and side required');
      target = ' ' + (action.targetSide === 'ally' ? -(action.targetSlot + 1) : action.targetSlot + 1);
    }
    return 'move ' + move.id + target;
  }).join(', ');
}

function resolveForcedSwitches(battle) {
  let guard = 0;
  while (!battle.ended && battle.requestState === 'switch') {
    if (++guard > 4) throw new Error('Forced replacement loop did not settle');
    let submitted = 0;
    for (const sideId of ['p1', 'p2']) {
      const side = battle[sideId];
      const request = side.activeRequest;
      if (!request || !Array.isArray(request.forceSwitch) || !request.forceSwitch.some(Boolean)) continue;
      const chosen = new Set();
      const choices = request.forceSwitch.map((mustSwitch, slot) => {
        if (!mustSwitch) return 'pass';
        const replacement = side.pokemon.find(mon => mon.position >= request.forceSwitch.length && !mon.fainted && !mon.isActive && !chosen.has(mon.position));
        if (!replacement) return 'pass';
        chosen.add(replacement.position);
        return 'switch ' + (replacement.position + 1);
      }).join(', ');
      if (!battle.choose(sideId, choices)) throw new Error('Forced replacement rejected for ' + sideId);
      submitted++;
    }
    if (!submitted) throw new Error('Switch request had no actionable side');
  }
}

export function runReferenceProbe({ formatId, player, opponent, turns, seed = [1, 2, 3, 4], synthetic = false, intakePolicy = 'strict-v1', completeGame = false }) {
  resolveFormat(formatId);
  if (formatId.includes('customgame') !== synthetic) throw new Error('Custom probes require explicit synthetic scope');
  const turnLimit = completeGame ? 40 : 5;
  if (!Array.isArray(turns) || turns.length < 1 || turns.length > turnLimit) throw new Error(`Prototype supports one to ${turnLimit} scripted turns${completeGame ? ' in completed-game mode' : ''}`);
  if (!Array.isArray(seed) || seed.length !== 4 || seed.some(n => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) throw new Error('Invalid seed');
  const validations = [validateReferenceTeam(player, formatId, 'p1', { policy: intakePolicy }), validateReferenceTeam(opponent, formatId, 'p2', { policy: intakePolicy })];
  if (validations.some(v => v.status !== 'accepted_by_reference')) {
    // A mapping gap cannot become a legality verdict; retain each side's actual result.
    const status = validations.some(v => v.status === 'reference_error') ? 'reference_error' : validations.some(v => v.status === 'unsupported_input') ? 'unsupported_input' : 'rejected';
    return { status, validations, completed_games: 0 };
  }
  const battle = new Battle({ formatid: formatId, seed, strictChoices: true,
    p1: { name: 'Reference player', team: clone(validations[0].validated) }, p2: { name: 'Reference opponent', team: clone(validations[1].validated) } });
  try {
    if (battle.requestState !== 'teampreview') throw new Error('Unexpected initial request');
    for (const id of ['p1', 'p2']) {
      const count = Math.min(4, battle[id].pokemon.length);
      if (!battle.choose(id, 'team ' + Array.from({ length: count }, (_, i) => i + 1).join(''))) throw new Error('Team preview rejected');
    }
    const initial = snapshot(battle);
    const frames = [];
    for (const turn of turns) {
      if (battle.ended && completeGame) break;
      if (battle.ended || battle.requestState !== 'move') throw new Error('Script needs unsupported request handling');
      const number = battle.turn;
      const start = battle.log.length;
      const choices = { p1: scriptedChoice(battle, 'p1', turn.player), p2: scriptedChoice(battle, 'p2', turn.opponent) };
      if (!battle.choose('p1', choices.p1) || !battle.choose('p2', choices.p2)) throw new Error('Choice rejected');
      resolveForcedSwitches(battle);
      frames.push({ turn: number, choices, protocol: battle.log.slice(start), post: snapshot(battle),
        field: { trick_room: battle.field.pseudoWeather.trickroom?.duration || 0,
          p1_tailwind: battle.p1.sideConditions.tailwind?.duration || 0, p2_tailwind: battle.p2.sideConditions.tailwind?.duration || 0 } });
    }
    if (completeGame && !battle.ended) throw new Error('Completed-game script exhausted before the battle ended');
    return { status: 'probe_complete', evidence_scope: synthetic ? 'synthetic_mechanics_only' : 'bounded_reference_probe',
      format_id: formatId, mod: battle.format.mod, seed, validations, initial, frames, raw_protocol: battle.log.slice(),
      completed_games: battle.ended ? 1 : 0, winner: battle.ended ? battle.winner : null };
  } finally { battle.destroy(); }
}

export function loadLocalEngine() {
  const context = vm.createContext({ console });
  const hashes = {};
  for (const file of ['data.js', 'generated/pokemon_showdown_legal_data.js', 'generated/pokemon_showdown_species_weights.js', 'generated/champions_move_overrides.js', 'runtime_data.js', 'engine.js']) {
    const content = fs.readFileSync(new URL(file, root), 'utf8');
    hashes[file] = hash(content); vm.runInContext(content, context, { filename: file });
  }
  vm.runInContext('this.simulateBattle = simulateBattle; this.TEAMS = TEAMS; this.engineVersion = ENGINE_VERSION;', context);
  return { context, hashes };
}

function moveOrder(protocol, teams) {
  return protocol.filter(line => line.startsWith('|move|')).map(line => {
    const [, , actor, move] = line.split('|');
    const nickname = actor.split(': ')[1];
    const side = nickname.slice(0, 2);
    const slot = Number(nickname.slice(3)) - 1;
    return `${teams[side].members[slot].name} used ${move}!`;
  });
}

function validateSnapshotEvidence(value, fixture) {
  for (const side of ['player', 'opponent']) {
    const rows = value?.roster?.[side];
    if (!Array.isArray(rows) || rows.length !== 4 || new Set(rows.map(m => m.teamSlot)).size !== 4 ||
        new Set(rows.map(m => m.stableKey)).size !== 4) throw new Error('Incomplete or duplicate roster evidence');
    for (const row of rows) {
      if (![0, 1, 2, 3].includes(row.teamSlot) || row.side !== side || typeof row.stableKey !== 'string' || !row.stableKey ||
          row.species !== fixture[side].members[row.teamSlot].name || !Number.isFinite(row.hp_current) || !Number.isFinite(row.hp_max) ||
          !/^\d+(\/\d+){5}$/.test(row.calculatedStats)) throw new Error('Incomplete roster identity/stat evidence');
    }
  }
  if (!value.field || !value.speed_control?.player || !value.speed_control?.opponent || !value.stat_boosts_stable) throw new Error('Incomplete field/stage evidence');
}

function rejectTiedReferenceSpeeds(value) {
  const speeds = Object.values(value).flat().filter(m => m.active && !m.fainted).map(m => m.action_speed);
  if (new Set(speeds).size !== speeds.length) throw new Error('Tied-speed order needs an RNG-aware comparator; unsupported in exact-order probes');
}

export function compareProbe(fixture, local) {
  const members = [...fixture.player.members, ...fixture.opponent.members];
  if (fixture.player.members.length !== 4 || fixture.opponent.members.length !== 4 ||
      members.some(m => !m.name) || new Set(members.map(m => Dex.toID(m.name))).size !== members.length) {
    throw new Error('Comparison requires four members per side with globally unique species names; mirror-name text events are ambiguous');
  }
  const reference = runReferenceProbe(fixture);
  if (reference.status !== 'probe_complete') return { id: fixture.id, status: reference.status, reference };
  rejectTiedReferenceSpeeds(reference.initial);
  reference.frames.forEach(frame => rejectTiedReferenceSpeeds(frame.post));
  // Both engines receive the same canonical stat points, not differently interpreted aliases.
  const canonical = Object.fromEntries(['player', 'opponent'].map((side, i) => [side, { format: 'champions', members: reference.validations[i].mapped.map(m => ({
    name: m.species, item: m.item, ability: m.ability, nature: m.nature, level: m.level, evs: clone(m.evs), moves: m.moves.slice()
  })) }]));
  const forcedActions = fixture.turns.flatMap((turn, index) => ['player', 'opponent'].flatMap(side => turn[side].map((a, slot) => ({
    turn: index + 1, side, slot, move: a.move, targetSlot: a.targetSlot,
    targetSide: a.targetSide === 'ally' ? 'ally' : 'enemy'
  }))));
  const simulation = local.context.simulateBattle(clone(canonical.player), clone(canonical.opponent), {
    format: 'doubles', seed: fixture.seed || [1, 2, 3, 4], maxTurns: fixture.turns.length,
    playerBring: fixture.player.members.slice(0, 4).map(m => m.name), opponentBring: fixture.opponent.members.slice(0, 4).map(m => m.name), forcedActions });
  const differences = [];
  const equal = (kind, where, ours, theirs) => { if (JSON.stringify(ours) !== JSON.stringify(theirs)) differences.push({ kind, where, local: ours, reference: theirs }); };
  const first = simulation.turnLog?.[0]?.pre;
  if (!first) throw new Error('Local simulator did not produce a turn');
  if (new Set(simulation.turnLog.map(t => t.turn)).size !== simulation.turnLog.length) throw new Error('Duplicate turn evidence');
  for (const turn of simulation.turnLog) {
    validateSnapshotEvidence(turn.pre, canonical); validateSnapshotEvidence(turn.post, canonical);
    const speeds = turn.pre.speed_order_details?.map(m => m.effective_speed);
    if (!speeds || speeds.some(n => !Number.isFinite(n))) throw new Error('Missing effective-speed evidence');
    if (new Set(speeds).size !== speeds.length) throw new Error('Tied-speed order needs an RNG-aware comparator; unsupported in exact-order probes');
  }
  for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
    for (const member of first.roster[side]) {
      const other = reference.initial[refSide].find(m => m.key === refSide + 'm' + (member.teamSlot + 1));
      equal('initial_stats', `${side}:${member.teamSlot}`, member.calculatedStats,
        other ? [other.maxhp, ...keys.slice(1).map(k => other.stats[k])].join('/') : null);
    }
  }
  for (const frame of reference.frames) {
    const ours = simulation.turnLog.find(t => t.turn === frame.turn);
    if (!ours) { differences.push({ kind: 'missing_turn', where: frame.turn }); continue; }
    const localMoves = [...new Set((ours.events || []).map(e => e.text?.match(/^(.+? used .+?!)/)?.[1]).filter(Boolean))];
    equal('resolved_move_order', frame.turn, localMoves, moveOrder(frame.protocol, { p1: fixture.player, p2: fixture.opponent }));
    equal('trick_room_duration', frame.turn, ours.post.field.trick_room, frame.field.trick_room);
    equal('player_tailwind_duration', frame.turn, ours.post.speed_control.player.tailwind_turns, frame.field.p1_tailwind);
    equal('opponent_tailwind_duration', frame.turn, ours.post.speed_control.opponent.tailwind_turns, frame.field.p2_tailwind);
    if (fixture.compareBoosts) for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      for (const member of ours.post.roster[side]) {
        const other = frame.post[refSide].find(m => m.key === refSide + 'm' + (member.teamSlot + 1));
        const boosts = ours.post.stat_boosts_stable[member.stableKey] || {};
        const stats = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
        equal('stat_stages', `${frame.turn}:${side}:${member.teamSlot}`, stats.map(k => boosts[k === 'accuracy' ? 'acc' : k === 'evasion' ? 'eva' : k] || 0), stats.map(k => other?.boosts[k] ?? null));
      }
    }
    if (fixture.comparePP) for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      for (const member of ours.post.roster[side]) {
        const other = frame.post[refSide].find(m => m.key === refSide + 'm' + (member.teamSlot + 1));
        for (const move of fixture[side].members[member.teamSlot].moves) {
          const localPP = member.move_pp?.[move] || null;
          const referencePP = other?.moves.find(row => row.id === Dex.toID(move));
          equal('move_pp', `${frame.turn}:${side}:${member.teamSlot}:${move}`,
            localPP ? { current: localPP.current, max: localPP.max } : null,
            referencePP ? { current: referencePP.pp, max: referencePP.maxpp } : null);
        }
      }
    }
    if (fixture.hpChange && frame.turn === 1) for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      for (const member of ours.post.roster[side]) {
        const before = first.roster[side].find(m => m.teamSlot === member.teamSlot);
        const refKey = refSide + 'm' + (member.teamSlot + 1);
        const refBefore = reference.initial[refSide].find(m => m.key === refKey);
        const refAfter = frame.post[refSide].find(m => m.key === refKey);
        const expected = fixture.hpChange[side][member.teamSlot];
        equal('local_hp_change_sign', `${frame.turn}:${side}:${member.teamSlot}`, Math.sign(member.hp_current - before.hp_current), expected);
        equal('reference_hp_change_sign', `${frame.turn}:${side}:${member.teamSlot}`, Math.sign(refAfter.hp - refBefore.hp), expected);
      }
    }
    if (fixture.compareExactHP) for (const [side, refSide] of [['player', 'p1'], ['opponent', 'p2']]) {
      for (const member of ours.post.roster[side]) equal('post_hp', `${frame.turn}:${side}:${member.teamSlot}`, member.hp_current,
        frame.post[refSide].find(m => m.key === refSide + 'm' + (member.teamSlot + 1))?.hp);
    }
  }
  if (fixture.completeGame) {
    equal('local_terminal', 'battle', simulation.terminal, true);
    equal('completed_game', 'battle', simulation.turnLog.length, reference.frames.length);
    equal('winner', 'battle', simulation.result === 'win' ? 'Reference player' : simulation.result === 'loss' ? 'Reference opponent' : '', reference.winner || '');
  }
  return { id: fixture.id, status: differences.length ? 'mismatch' : 'agreement_in_declared_scope', comparisons: ['initial_stats', 'move_order', 'field_durations', ...(fixture.compareExactHP ? ['exact_hp_deterministic_fixture'] : []), ...(fixture.compareBoosts ? ['deterministic_stat_stages'] : []), ...(fixture.comparePP ? ['move_pp'] : []), ...(fixture.hpChange ? ['expected_hp_change_sign'] : [])],
    differences, fixture: clone(fixture), canonical_input: canonical, reference, local: clone(simulation),
    limits: ['Independent RNG streams: random damage/winners not compared', 'Synthetic custom doubles is not M-A or M-B legality approval',
      ...(fixture.completeGame ? ['Scripted synthetic completed game is not a representative competitive-game sample'] : ['Bounded probe is not a completed competitive game']), 'Headless: no current-site visual comparison',
      'First-four unique-name scripted moves only; no switching, called moves or durable DB-ID proof',
      'Boundary speed ties rejected conservatively; transient mid-action ties are not covered'] };
}

export const sourceFile = fileURLToPath(import.meta.url);
