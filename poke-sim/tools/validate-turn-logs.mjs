#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { moves: referenceMoves } = createRequire(import.meta.url)('../generated/pokemon_showdown_legal_data.js');

const SIDES = ['player', 'opponent'];

const STATUS_MOVES = new Set([
  'Will-O-Wisp', 'Thunder Wave', 'Taunt', 'Sleep Powder', 'Tailwind', 'Sunny Day',
  'Trick Room', 'Life Dew', 'Rage Powder', 'Roost', 'Parting Shot', 'Shed Tail',
  'Quick Guard', 'Endure', 'Wide Guard', 'Follow Me', 'Protect', 'Detect',
  "King's Shield", 'Spiky Shield', 'Baneful Bunker', 'Obstruct', 'Light Screen',
  'Reflect', 'Aurora Veil', 'Encore', 'Haze', 'Defog', 'Recover', 'Shore Up',
  'Rest', 'Sleep Talk', 'Substitute', 'Imprison', 'Ally Switch', 'Toxic',
  'Poison Powder'
]);

const PRIORITY = {
  'Helping Hand': 5,
  'Protect': 4,
  'Detect': 4,
  'Endure': 4,
  'Fake Out': 3,
  'Wide Guard': 3,
  'Quick Guard': 3,
  'Extreme Speed': 2,
  'Ally Switch': 2,
  'Follow Me': 2,
  'Rage Powder': 2,
  'Aqua Jet': 1,
  'Ice Shard': 1,
  'Shadow Sneak': 1,
  'Sucker Punch': 1,
  'Vacuum Wave': 1,
  'Quick Attack': 1,
  'Feint': 2,
  "King's Shield": 4,
  'Spiky Shield': 4,
  'Baneful Bunker': 4,
  'Obstruct': 4,
  'Trick Room': -7
};

function cleanText(text) {
  return String(text || '').replace(/\uFFFD/g, '').trim();
}

function finding(severity, code, message, ctx) {
  return Object.assign({ severity, code, message }, ctx || {});
}

function snapshotEntries(turn) {
  const out = [];
  if (turn && turn.pre) out.push(['pre', turn.pre]);
  if (turn && turn.post) out.push(['post', turn.post]);
  return out;
}

function rowName(row) {
  return String((row && (row.displayName || row.species || row.key)) || 'Unknown');
}

function movesSig(row) {
  return Array.isArray(row && row.moves) ? row.moves.join('|') : '';
}

function identityFor(side, row) {
  if (row && row.stableKey) return row.stableKey;
  if (row && row.teamSlot != null) return `${side}:slot:${row.teamSlot}:${rowName(row)}`;
  return `${side}:name:${rowName(row)}`;
}

function ensureIdentity(state, side, row) {
  const id = identityFor(side, row);
  if (!state.identities.has(id)) {
    state.identities.set(id, {
      id,
      side,
      name: rowName(row),
      items: new Set(),
      moves: new Set(),
      volatileKeys: new Set(),
      stableKeys: new Set(),
      itemConsumedSeen: false,
      snapshots: 0
    });
  }
  return state.identities.get(id);
}

function setEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function getSideKeys(snapshot, side, kind) {
  const map = snapshot && snapshot[kind];
  const keys = map && Array.isArray(map[side]) ? map[side] : [];
  return keys.filter(Boolean).map(String);
}

function validateSnapshot(snapshot, turnNo, snapName, state, findings) {
  if (!snapshot || typeof snapshot !== 'object') {
    findings.push(finding('error', 'snapshot-missing', `Missing ${snapName} snapshot.`, { turn: turnNo, snapshot: snapName }));
    return;
  }

  if (!snapshot.roster || typeof snapshot.roster !== 'object') {
    findings.push(finding('error', 'roster-missing', `Missing roster object in ${snapName}.`, { turn: turnNo, snapshot: snapName }));
    return;
  }

  if (!snapshot.hp_pct_stable) state.missingStableMaps.add('hp_pct_stable');
  if (!Array.isArray(snapshot.speed_order_stable_keys)) state.missingStableMaps.add('speed_order_stable_keys');

  const liveKeys = new Set();
  for (const side of SIDES) {
    const rows = Array.isArray(snapshot.roster[side]) ? snapshot.roster[side] : [];
    if (!rows.length) {
      findings.push(finding('warning', 'side-roster-empty', `${side} roster is empty in ${snapName}.`, { turn: turnNo, snapshot: snapName, side }));
    }

    const activeKeys = new Set(getSideKeys(snapshot, side, 'active_keys'));
    const benchKeys = new Set(getSideKeys(snapshot, side, 'bench_keys'));
    const expectedActive = new Set();
    const expectedBench = new Set();
    const rowKeys = new Set();

    if (!snapshot.active_stable_keys || !Array.isArray(snapshot.active_stable_keys[side])) state.missingStableMaps.add('active_stable_keys');
    if (!snapshot.bench_stable_keys || !Array.isArray(snapshot.bench_stable_keys[side])) state.missingStableMaps.add('bench_stable_keys');

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      if (!row.stableKey) state.rowsMissingStableKey += 1;
      if (row.key) {
        if (rowKeys.has(row.key)) {
          findings.push(finding('error', 'duplicate-row-key', `Duplicate roster key ${row.key}.`, { turn: turnNo, snapshot: snapName, side }));
        }
        rowKeys.add(row.key);
      }

      const id = ensureIdentity(state, side, row);
      id.snapshots += 1;
      if (row.key) id.volatileKeys.add(String(row.key));
      if (row.stableKey) id.stableKeys.add(String(row.stableKey));
      if (row.item) id.items.add(String(row.item));
      id.moves.add(movesSig(row));
      if (row.itemConsumed) id.itemConsumedSeen = true;

      if (row.status === 'active' && row.key) expectedActive.add(String(row.key));
      if (row.status === 'bench' && row.key) expectedBench.add(String(row.key));
    }

    for (const key of activeKeys) liveKeys.add(key);
    for (const key of benchKeys) liveKeys.add(key);

    if (!setEqual(activeKeys, expectedActive)) {
      findings.push(finding('error', 'active-key-mismatch', `${side} active_keys do not match active roster rows.`, {
        turn: turnNo,
        snapshot: snapName,
        side,
        expected: Array.from(expectedActive),
        actual: Array.from(activeKeys)
      }));
    }
    if (!setEqual(benchKeys, expectedBench)) {
      findings.push(finding('error', 'bench-key-mismatch', `${side} bench_keys do not match bench roster rows.`, {
        turn: turnNo,
        snapshot: snapName,
        side,
        expected: Array.from(expectedBench),
        actual: Array.from(benchKeys)
      }));
    }
  }

  const hpPct = snapshot.hp_pct || {};
  for (const key of liveKeys) {
    if (!Object.prototype.hasOwnProperty.call(hpPct, key)) {
      findings.push(finding('error', 'hp-key-missing', `hp_pct is missing live key ${key}.`, { turn: turnNo, snapshot: snapName }));
    }
  }

  const speedKeys = Array.isArray(snapshot.speed_order_keys) ? snapshot.speed_order_keys.map(String) : [];
  for (const key of speedKeys) {
    if (!liveKeys.has(key)) {
      findings.push(finding('error', 'speed-key-not-live', `speed_order_keys contains non-active key ${key}.`, { turn: turnNo, snapshot: snapName }));
    }
  }

  const speedDetails = Array.isArray(snapshot.speed_order_details) ? snapshot.speed_order_details : [];
  for (const row of speedDetails) {
    if (!row || typeof row !== 'object') continue;
    if (row.key && !liveKeys.has(String(row.key))) {
      findings.push(finding('error', 'speed-detail-key-not-live', `speed_order_details contains non-active key ${row.key}.`, { turn: turnNo, snapshot: snapName }));
    }
    if (!Number.isFinite(Number(row.effective_speed))) {
      findings.push(finding('error', 'speed-detail-missing-effective-speed', 'speed_order_details row is missing numeric effective_speed.', { turn: turnNo, snapshot: snapName, row }));
    }
  }
}

function actorOrderFromEvents(events) {
  const structured = (events || [])
    .filter(event => event && event.actor && event.move && (event.actor_key || event.side))
    .map(event => ({
      actor: String(event.actor),
      move: String(event.move),
      actor_key: event.actor_key ? String(event.actor_key) : null,
      side: SIDES.includes(event.side) ? event.side : null
    }));
  if (structured.length) return structured;

  const out = [];
  for (const event of events || []) {
    const text = cleanText(event && event.text);
    if (text && text.includes(String.fromCharCode(0x2192))) continue;
    if (!text || text.includes('->') || text.includes('→') || text.includes('â†’')) continue;
    const match = text.match(/^(.+?) used (.+?)!/);
    if (!match) continue;
    out.push({
      actor: match[1],
      move: match[2],
      actor_key: event && event.actor_key ? String(event.actor_key) : null,
      side: event && SIDES.includes(event.side) ? event.side : null
    });
  }
  return out;
}

function movePriority(move, row) {
  const reference = referenceMoves[String(move).toLowerCase().replace(/[^a-z0-9]/g, '')];
  let p = reference && Number.isFinite(reference.priority) ? reference.priority : (PRIORITY[move] || 0);
  if (row && row.ability === 'Prankster' && (reference ? reference.category === 'Status' : STATUS_MOVES.has(move))) p += 1;
  if (row && row.ability === 'Gale Wings' && reference && reference.type === 'Flying'
      && (typeof row.hp_current === 'number' ? row.hp_current === row.hp_max : row.hp === 100)) p += 1;
  return p;
}

function parsedCalculatedSpeed(row) {
  const stats = row && row.calculatedStats;
  if (stats && typeof stats === 'object') {
    const value = Number(stats.spe ?? stats.speed);
    return Number.isFinite(value) ? Math.floor(value) : null;
  }
  const parts = String(stats || '').split('/');
  if (parts.length >= 6) {
    const value = Number(parts[5]);
    return Number.isFinite(value) ? Math.floor(value) : null;
  }
  return null;
}

function speedDetailForRow(row, snapshot) {
  const rows = Array.isArray(snapshot && snapshot.speed_order_details) ? snapshot.speed_order_details : [];
  if (!row || !rows.length) return null;
  if (row.stableKey) {
    const byStable = rows.find(detail => detail && String(detail.stableKey || '') === String(row.stableKey));
    if (byStable) return byStable;
  }
  if (row.key) {
    const byKey = rows.find(detail => detail && String(detail.key || '') === String(row.key));
    if (byKey) return byKey;
  }
  const name = rowName(row);
  const byName = rows.filter(detail => detail && String(detail.pokemon || '') === name);
  return byName.length === 1 ? byName[0] : null;
}

function speedOrderIndexForRow(row, snapshot) {
  if (!row || !snapshot) return null;
  const details = Array.isArray(snapshot.speed_order_details) ? snapshot.speed_order_details : [];
  if (row.stableKey && details.length) {
    const idx = details.findIndex(detail => detail && String(detail.stableKey || '') === String(row.stableKey));
    if (idx >= 0) return idx;
  }
  if (row.key && details.length) {
    const idx = details.findIndex(detail => detail && String(detail.key || '') === String(row.key));
    if (idx >= 0) return idx;
  }
  const stableKeys = Array.isArray(snapshot.speed_order_stable_keys) ? snapshot.speed_order_stable_keys.map(String) : [];
  if (row.stableKey && stableKeys.length) {
    const idx = stableKeys.indexOf(String(row.stableKey));
    if (idx >= 0) return idx;
  }
  const keys = Array.isArray(snapshot.speed_order_keys) ? snapshot.speed_order_keys.map(String) : [];
  if (row.key && keys.length) {
    const idx = keys.indexOf(String(row.key));
    if (idx >= 0) return idx;
  }
  const names = Array.isArray(snapshot.speed_order) ? snapshot.speed_order.map(String) : [];
  const name = rowName(row);
  const matches = [];
  names.forEach((candidate, idx) => {
    if (candidate === name) matches.push(idx);
  });
  return matches.length === 1 ? matches[0] : null;
}

function activeRowForAction(snapshot, actionRecord) {
  const actorKey = actionRecord && actionRecord.action && actionRecord.action.actor_key;
  if (actorKey) {
    for (const row of ((snapshot && snapshot.roster && snapshot.roster[actionRecord.side]) || [])) {
      if (!row || row.status !== 'active') continue;
      if (String(row.stableKey || '') === String(actorKey) || String(row.key || '') === String(actorKey)) return row;
    }
  }
  const rows = ((snapshot && snapshot.roster && snapshot.roster[actionRecord.side]) || [])
    .filter(row => row && row.status === 'active')
    .filter(row => rowName(row) === actionRecord.action.actor || row.species === actionRecord.action.actor);
  return rows.length === 1 ? rows[0] : null;
}

function sideFromStableKey(key) {
  const text = String(key || '');
  if (text.startsWith('player:')) return 'player';
  if (text.startsWith('opponent:')) return 'opponent';
  return null;
}

function snapshotEffectiveSpeed(row, snapshot) {
  const detail = speedDetailForRow(row, snapshot);
  if (detail && Number.isFinite(Number(detail.effective_speed))) {
    return Math.floor(Number(detail.effective_speed));
  }

  const baseSpeed = parsedCalculatedSpeed(row);
  if (!row || baseSpeed == null) return null;

  const field = (snapshot && snapshot.field) || {};
  const weather = field.weather || null;
  let statSpeed = baseSpeed;
  if (row.ability === 'Sand Rush' && weather === 'sand') statSpeed *= 2;
  if (row.ability === 'Unburden' && row.itemConsumed) statSpeed *= 2;
  if (row.item === 'Choice Scarf') statSpeed *= 1.5;
  statSpeed = Math.floor(statSpeed);

  let effectiveSpeed = statSpeed;
  const speedControl = (snapshot && snapshot.speed_control && snapshot.speed_control[row.side]) || {};
  if ((speedControl.tailwind_turns || 0) > 0) effectiveSpeed *= 2;
  if (row.ability === 'Swift Swim' && weather === 'rain') effectiveSpeed *= 2;
  if (row.ability === 'Chlorophyll' && weather === 'sun') effectiveSpeed *= 2;
  if (row.ability === 'Slush Rush' && weather === 'snow') effectiveSpeed *= 2;
  return effectiveSpeed;
}

function isSameEffectiveSpeedTie(rowA, rowB, snapshot) {
  const speedA = snapshotEffectiveSpeed(rowA, snapshot);
  const speedB = snapshotEffectiveSpeed(rowB, snapshot);
  return speedA != null && speedB != null && speedA === speedB;
}

function snapshotSupportsObservedSpeed(first, second, snapshot) {
  if (!snapshot) return false;
  const firstIndex = speedOrderIndexForRow(first.row, snapshot);
  const secondIndex = speedOrderIndexForRow(second.row, snapshot);
  if (firstIndex == null || secondIndex == null) return false;
  if (firstIndex <= secondIndex) return true;
  return isSameEffectiveSpeedTie(first.row, second.row, snapshot);
}

function speedOrderChangedDuringTurn(turn) {
  const signature = snapshot => (Array.isArray(snapshot && snapshot.speed_order_details) ? snapshot.speed_order_details : [])
    .map(row => `${row && (row.stableKey || row.key || row.pokemon)}:${Number(row && row.effective_speed)}`)
    .join('|');
  return !!(turn && turn.pre && turn.post && signature(turn.pre) !== signature(turn.post));
}

function tailwindAdjustedOrderSupports(first, second, turn, actionsBefore) {
  const activatedSides = new Set((actionsBefore || [])
    .filter(action => action && action.move === 'Tailwind')
    .map(action => action.side));
  if (!activatedSides.size) return false;

  const adjustedSpeed = action => {
    let speed = snapshotEffectiveSpeed(action.row, turn.pre);
    if (speed == null) return null;
    const detail = speedDetailForRow(action.row, turn.pre);
    const alreadyActive = !!(detail && detail.tailwind);
    if (activatedSides.has(action.side) && !alreadyActive) speed *= 2;
    return speed;
  };
  const firstSpeed = adjustedSpeed(first);
  const secondSpeed = adjustedSpeed(second);
  if (firstSpeed == null || secondSpeed == null) return false;
  if (firstSpeed === secondSpeed) return true;
  const trickRoom = Number(turn.pre && turn.pre.field && (turn.pre.field.trick_room || turn.pre.field.trickRoom) || 0) > 0;
  return trickRoom ? firstSpeed < secondSpeed : firstSpeed > secondSpeed;
}

function trickRoomAdjustedOrderSupports(first, second, turn, actionsBefore) {
  const toggles = (actionsBefore || []).filter(action => action && action.move === 'Trick Room').length;
  if (!toggles) return false;
  const firstSpeed = snapshotEffectiveSpeed(first.row, turn.pre);
  const secondSpeed = snapshotEffectiveSpeed(second.row, turn.pre);
  if (firstSpeed == null || secondSpeed == null) return false;
  if (firstSpeed === secondSpeed) return true;
  const preActive = Number(turn.pre && turn.pre.field && (turn.pre.field.trick_room || turn.pre.field.trickRoom) || 0) > 0;
  const active = toggles % 2 ? !preActive : preActive;
  return active ? firstSpeed < secondSpeed : firstSpeed > secondSpeed;
}

function speedStageAdjustedOrderSupports(first, second, turn) {
  const events = Array.isArray(turn && turn.events) ? turn.events : [];
  const firstPrefix = `${first.actor} used ${first.move}!`;
  const boundary = events.findIndex(event => cleanText(event && (event.text || event.message)).startsWith(firstPrefix));
  if (boundary < 1) return false;
  const prior = events.slice(0, boundary).map(event => cleanText(event && (event.text || event.message)));
  const fallCount = action => prior.filter(text => text === `${action.actor}'s Speed fell!` || text === `${action.actor}'s Speed harshly fell!`).length;
  const firstFalls = fallCount(first);
  const secondFalls = fallCount(second);
  if (!firstFalls && !secondFalls) return false;
  const multiplier = stage => stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  const adjustedSpeed = (action, falls) => {
    const speed = snapshotEffectiveSpeed(action.row, turn.pre);
    if (speed == null) return null;
    const detail = speedDetailForRow(action.row, turn.pre) || {};
    const oldStage = Math.max(-6, Math.min(6, Number(detail.speed_stage || 0)));
    const newStage = Math.max(-6, oldStage - falls);
    return Math.floor((speed / multiplier(oldStage)) * multiplier(newStage));
  };
  const firstSpeed = adjustedSpeed(first, firstFalls);
  const secondSpeed = adjustedSpeed(second, secondFalls);
  if (firstSpeed == null || secondSpeed == null) return false;
  if (firstSpeed === secondSpeed) return true;
  const toggles = actualTrickRoomToggleCount(turn, boundary);
  const preActive = Number(turn.pre && turn.pre.field && (turn.pre.field.trick_room || turn.pre.field.trickRoom) || 0) > 0;
  const active = toggles % 2 ? !preActive : preActive;
  return active ? firstSpeed < secondSpeed : firstSpeed > secondSpeed;
}

function actualTrickRoomToggleCount(turn, eventBoundary) {
  const events = Array.isArray(turn && turn.events) ? turn.events.slice(0, eventBoundary) : [];
  return events.filter(event => /^Trick Room (was set|returned to NORMAL)!/.test(cleanText(event && (event.text || event.message)))).length;
}

function paralysisAdjustedOrderSupports(first, second, turn) {
  const events = Array.isArray(turn && turn.events) ? turn.events : [];
  const firstPrefix = `${first.actor} used ${first.move}!`;
  const firstEventIndex = events.findIndex(event => cleanText(event && (event.text || event.message)).startsWith(firstPrefix));
  if (firstEventIndex < 0) return false;
  const priorText = events.slice(0, firstEventIndex).map(event => cleanText(event && (event.text || event.message)));
  const wasParalyzed = action => {
    const status = String(action.row && action.row.status || '').toLowerCase();
    if (status === 'paralysis' || status === 'paralyzed' || status === 'paralysed') return false;
    return priorText.some(text => text.startsWith(`${action.actor} was paralysed`) || text.startsWith(`${action.actor} was paralyzed`));
  };
  const firstChanged = wasParalyzed(first);
  const secondChanged = wasParalyzed(second);
  if (!firstChanged && !secondChanged) return false;
  let firstSpeed = snapshotEffectiveSpeed(first.row, turn.pre);
  let secondSpeed = snapshotEffectiveSpeed(second.row, turn.pre);
  if (firstSpeed == null || secondSpeed == null) return false;
  if (firstChanged) firstSpeed = Math.floor(firstSpeed / 2);
  if (secondChanged) secondSpeed = Math.floor(secondSpeed / 2);
  if (firstSpeed === secondSpeed) return true;
  const trickRoom = Number(turn.pre && turn.pre.field && (turn.pre.field.trick_room || turn.pre.field.trickRoom) || 0) > 0;
  return trickRoom ? firstSpeed < secondSpeed : firstSpeed > secondSpeed;
}

function validateObservedActionOrder(turn, findings) {
  const observed = actorOrderFromEvents(turn.events);
  if (observed.length < 2 || !turn.pre || !turn.actions) return;

  const actionRows = [];
  for (const side of SIDES) {
    const rows = Array.isArray(turn.actions[side]) ? turn.actions[side] : [];
    for (const action of rows) {
      if (action && action.actor && action.move) actionRows.push({ side, action });
    }
  }
  if (actionRows.length < 2) return;

  const actionsByObservedKey = new Map();
  for (const row of actionRows) {
    const key = `${row.action.actor}|${row.action.move}`;
    if (!actionsByObservedKey.has(key)) actionsByObservedKey.set(key, []);
    actionsByObservedKey.get(key).push(row);
  }
  for (const [key, matches] of actionsByObservedKey) {
    if (matches.length < 2 || !observed.some(row => `${row.actor}|${row.move}` === key && !row.actor_key && !row.side)) continue;
    findings.push(finding('warning', 'observed-action-identity-ambiguous', 'Identical actor and move text spans multiple registered actions; preserve actor_key/side in resolved events before using this pair for order proof.', {
      turn: turn.turn,
      key,
      sides: matches.map(match => match.side)
    }));
  }
  const actual = observed
    .map(o => {
      const key = `${o.actor}|${o.move}`;
      let matches = actionsByObservedKey.get(key) || [];
      if (o.actor_key) matches = matches.filter(row => String(row.action.actor_key || '') === o.actor_key);
      if (o.side) matches = matches.filter(row => row.side === o.side);
      if (matches.length !== 1) return null;
      const row = activeRowForAction(turn.pre, matches[0]);
      if (!row) return null;
      return {
        key,
        actor: o.actor,
        move: o.move,
        side: matches[0].side,
        action: matches[0].action,
        row,
        speedIndex: speedOrderIndexForRow(row, turn.pre)
      };
    })
    .filter(Boolean);

  if (actual.length < 2) return;

  const failOrder = (reason, expectedBefore, actualBefore) => {
    findings.push(finding('error', 'observed-action-order-mismatch', 'Observed event order does not match priority plus speed_order snapshot.', {
      turn: turn.turn,
      reason,
      expectedBefore,
      actualBefore,
      actual: actual.map(a => a.key)
    }));
  };

  for (let i = 0; i < actual.length; i += 1) {
    for (let j = i + 1; j < actual.length; j += 1) {
      const first = actual[i];
      const second = actual[j];
      const firstPriority = movePriority(first.move, first.row);
      const secondPriority = movePriority(second.move, second.row);

      if (firstPriority < secondPriority) {
        failOrder('priority', second.key, first.key);
        return;
      }

      if (firstPriority !== secondPriority) continue;
      if (first.speedIndex == null || second.speedIndex == null) continue;

      if (snapshotSupportsObservedSpeed(first, second, turn.pre)) continue;
      if (trickRoomAdjustedOrderSupports(first, second, turn, actual.slice(0, i))) continue;
      if (tailwindAdjustedOrderSupports(first, second, turn, actual.slice(0, i))) continue;
      if (paralysisAdjustedOrderSupports(first, second, turn)) continue;
      if (speedStageAdjustedOrderSupports(first, second, turn)) continue;

      failOrder('speed', second.key, first.key);
      return;
    }
  }
}

function sideFromActions(turn, actor, move) {
  const matches = [];
  for (const side of SIDES) {
    const rows = Array.isArray(turn && turn.actions && turn.actions[side]) ? turn.actions[side] : [];
    for (const action of rows) {
      if (!action || action.actor !== actor || action.move !== move) continue;
      matches.push({ side, action });
    }
  }
  const sides = Array.from(new Set(matches.map(m => m.side)));
  return sides.length === 1 ? matches.find(m => m.side === sides[0]) : null;
}

function sideFromStructuredEvent(event) {
  const explicitSide = SIDES.includes(event && event.side) ? event.side : null;
  const keySide = sideFromStableKey(event && event.actor_key);
  if (explicitSide && keySide && explicitSide !== keySide) return null;
  const resolvedSide = explicitSide || keySide;
  return resolvedSide ? { side: resolvedSide, action: event } : null;
}

function activeSideForName(snapshot, name) {
  const matches = [];
  for (const side of SIDES) {
    const rows = ((snapshot && snapshot.roster && snapshot.roster[side]) || []);
    for (const row of rows) {
      if (!row || row.status !== 'active') continue;
      if (rowName(row) === name || row.species === name) matches.push(side);
    }
  }
  const unique = Array.from(new Set(matches));
  return unique.length === 1 ? unique[0] : null;
}

function activeTargetKeys(snapshot, side) {
  const stable = getSideKeys(snapshot, side, 'active_stable_keys');
  return stable.length ? stable : getSideKeys(snapshot, side, 'active_keys');
}

function hasSwitchInAfterEvent(events, index) {
  for (let i = index + 1; i < events.length; i += 1) {
    if (/ was sent out!$/.test(cleanText(events[i] && events[i].text))) return true;
  }
  return false;
}

function validateNoValidTargetSkips(turn, findings) {
  const events = Array.isArray(turn && turn.events) ? turn.events : [];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    const event = events[eventIndex];
    const text = cleanText(event && event.text);
    const match = text.match(/^(.+?) used (.+?)! \(no valid target\)$/);
    if (!match) continue;

    const actor = match[1];
    const move = match[2];
    const resolved = sideFromStructuredEvent(event) || sideFromActions(turn, actor, move);
    if (!resolved) {
      findings.push(finding('warning', 'no-valid-target-actor-unresolved', 'Could not resolve the side for a no-valid-target action.', {
        turn: turn && turn.turn,
        actor,
        move,
        text
      }));
      continue;
    }

    const actionTarget = resolved.action && resolved.action.target;
    const targetSide = resolved.action && (resolved.action.target_side || sideFromStableKey(resolved.action.target_key))
      ? (resolved.action.target_side || sideFromStableKey(resolved.action.target_key))
      : (actionTarget
          ? (activeSideForName(turn && turn.pre, actionTarget) || activeSideForName(turn && turn.post, actionTarget))
          : null);
    const checkedSide = targetSide || (resolved.side === 'player' ? 'opponent' : 'player');
    const actorRow = activeRowForAction(turn.pre, resolved);
    const eligible = key => !(move === 'Pollen Puff' && checkedSide === resolved.side && actorRow
      && (key === actorRow.stableKey || key === actorRow.key));
    const preActive = activeTargetKeys(turn && turn.pre, checkedSide).filter(eligible);
    const postActive = activeTargetKeys(turn && turn.post, checkedSide).filter(eligible);
    const originalActiveStillPresent = postActive.filter(key => preActive.includes(key));
    const onlyPostTurnReplacementsLive = (
      postActive.length > 0 &&
      preActive.length > 0 &&
      originalActiveStillPresent.length === 0 &&
      hasSwitchInAfterEvent(events, eventIndex)
    );

    if (postActive.length && !onlyPostTurnReplacementsLive) {
      findings.push(finding('error', 'no-valid-target-with-live-target', 'A no-valid-target action resolved while the intended target side still had a live active Pokemon.', {
        turn: turn && turn.turn,
        actor,
        move,
        target: actionTarget || '',
        targetSide: checkedSide,
        preActiveTargetKeys: preActive,
        postActiveTargetKeys: postActive,
        originalActiveStillPresentKeys: originalActiveStillPresent
      }));
    }
  }
}

function validateDamageEvents(turn, findings) {
  const rows = Array.isArray(turn && turn.damage_events) ? turn.damage_events : [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || typeof row !== 'object') {
      findings.push(finding('error', 'damage-event-malformed', 'damage_events contains a non-object row.', { turn: turn && turn.turn, index: i }));
      continue;
    }
    for (const key of ['attacker', 'target', 'move']) {
      if (!row[key]) {
        findings.push(finding('error', 'damage-event-missing-identity', `damage_events row is missing ${key}.`, { turn: turn && turn.turn, index: i }));
      }
    }
    const damageNumberKeys = [
      'damage', 'applied_damage', 'hp_delta', 'calculated_damage',
      'overkill_damage', 'target_hp_before', 'target_hp_after',
      'target_max_hp'
    ];
    const damageNumbers = {};
    let damageNumbersValid = true;
    for (const key of damageNumberKeys) {
      if (!Number.isFinite(Number(row[key]))) {
        damageNumbersValid = false;
        findings.push(finding('error', 'damage-event-missing-number', `damage_events row is missing numeric ${key}.`, { turn: turn && turn.turn, index: i }));
      } else {
        damageNumbers[key] = Number(row[key]);
      }
    }
    if (typeof row.damage_capped_by_hp !== 'boolean') {
      findings.push(finding('error', 'damage-event-missing-flag', 'damage_events row is missing boolean damage_capped_by_hp.', { turn: turn && turn.turn, index: i }));
    }
    if (row.move_context != null && typeof row.move_context !== 'string') {
      findings.push(finding('error', 'damage-event-context-malformed', 'damage_events move_context must be a string when present.', { turn: turn && turn.turn, index: i }));
    }
    if (row.effect_tags != null) {
      if (!Array.isArray(row.effect_tags) || row.effect_tags.some(tag => typeof tag !== 'string' || !tag)) {
        findings.push(finding('error', 'damage-event-effect-tags-malformed', 'damage_events effect_tags must be an array of strings.', { turn: turn && turn.turn, index: i }));
      }
    }
    if (damageNumbersValid) {
      const expectedApplied = Math.max(0, damageNumbers.target_hp_before - damageNumbers.target_hp_after);
      const expectedOverkill = Math.max(0, damageNumbers.calculated_damage - damageNumbers.applied_damage);
      if (damageNumbers.target_hp_after > damageNumbers.target_hp_before) {
        findings.push(finding('error', 'damage-event-hp-increase', 'damage_events row shows target HP increasing during damage.', {
          turn: turn && turn.turn,
          index: i,
          target_hp_before: damageNumbers.target_hp_before,
          target_hp_after: damageNumbers.target_hp_after
        }));
      }
      if (damageNumbers.target_hp_after < 0 || damageNumbers.target_hp_after > damageNumbers.target_max_hp) {
        findings.push(finding('error', 'damage-event-hp-out-of-range', 'damage_events target HP is outside 0..max HP.', {
          turn: turn && turn.turn,
          index: i,
          target_hp_after: damageNumbers.target_hp_after,
          target_max_hp: damageNumbers.target_max_hp
        }));
      }
      if (damageNumbers.applied_damage !== expectedApplied) {
        findings.push(finding('error', 'damage-event-applied-mismatch', 'applied_damage must equal target HP lost.', {
          turn: turn && turn.turn,
          index: i,
          expected: expectedApplied,
          actual: damageNumbers.applied_damage
        }));
      }
      if (damageNumbers.damage !== damageNumbers.applied_damage) {
        findings.push(finding('error', 'damage-event-damage-mismatch', 'damage must equal applied_damage, not raw formula damage.', {
          turn: turn && turn.turn,
          index: i,
          expected: damageNumbers.applied_damage,
          actual: damageNumbers.damage
        }));
      }
      if (damageNumbers.hp_delta !== damageNumbers.applied_damage) {
        findings.push(finding('error', 'damage-event-hp-delta-mismatch', 'hp_delta must equal applied_damage.', {
          turn: turn && turn.turn,
          index: i,
          expected: damageNumbers.applied_damage,
          actual: damageNumbers.hp_delta
        }));
      }
      if (damageNumbers.overkill_damage !== expectedOverkill) {
        findings.push(finding('error', 'damage-event-overkill-mismatch', 'overkill_damage must equal calculated_damage minus applied_damage when positive.', {
          turn: turn && turn.turn,
          index: i,
          expected: expectedOverkill,
          actual: damageNumbers.overkill_damage
        }));
      }
      if (typeof row.damage_capped_by_hp === 'boolean' && row.damage_capped_by_hp !== (damageNumbers.calculated_damage !== damageNumbers.applied_damage)) {
        findings.push(finding('error', 'damage-event-cap-flag-mismatch', 'damage_capped_by_hp must reflect calculated versus applied damage.', {
          turn: turn && turn.turn,
          index: i,
          expected: damageNumbers.calculated_damage !== damageNumbers.applied_damage,
          actual: row.damage_capped_by_hp
        }));
      }
    }
    if (row.recoil_rule) {
      const num = Number(row.recoil_rule.numerator);
      const den = Number(row.recoil_rule.denominator);
      if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0 || row.recoil_rule.basis !== 'applied_damage') {
        findings.push(finding('error', 'damage-event-recoil-rule-malformed', 'recoil_rule must use a positive applied_damage ratio.', { turn: turn && turn.turn, index: i }));
      } else if (row.recoil_damage != null) {
        const expected = Math.max(1, Math.round(Number(row.applied_damage || 0) * num / den));
        if (Number(row.recoil_damage) !== expected) {
          findings.push(finding('error', 'damage-event-recoil-mismatch', 'recoil_damage must match the applied damage ratio.', {
            turn: turn && turn.turn,
            index: i,
            expected,
            actual: row.recoil_damage
          }));
        }
      }
    }
    if (row.drain_rule) {
      const num = Number(row.drain_rule.numerator);
      const den = Number(row.drain_rule.denominator);
      if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0 || row.drain_rule.basis !== 'applied_damage') {
        findings.push(finding('error', 'damage-event-drain-rule-malformed', 'drain_rule must use a positive applied_damage ratio.', { turn: turn && turn.turn, index: i }));
      } else if (row.drain_heal_candidate != null) {
        const expected = Math.max(1, Math.round(Number(row.applied_damage || 0) * num / den));
        if (Number(row.drain_heal_candidate) !== expected) {
          findings.push(finding('error', 'damage-event-drain-mismatch', 'drain_heal_candidate must match the applied damage ratio.', {
            turn: turn && turn.turn,
            index: i,
            expected,
            actual: row.drain_heal_candidate
          }));
        }
      }
    }
    if (row.damage_kind === 'calculated') {
      const numericKeys = [
        'type_effectiveness', 'base_power_initial', 'base_power_modified',
        'attack_stat_stage', 'defense_stat_stage', 'attack_stat_stage_used',
        'defense_stat_stage_used', 'attack_stat_value', 'defense_stat_value',
        'typed_item_boost_mod', 'spread_mod', 'weather_mod', 'screen_mod',
        'stab_mod', 'final_mod', 'roll'
      ];
      for (const key of numericKeys) {
        if (!Number.isFinite(Number(row[key]))) {
          findings.push(finding('error', 'damage-calc-missing-number', `calculated damage row is missing numeric ${key}.`, { turn: turn && turn.turn, index: i }));
        }
      }
      for (const key of ['move_type', 'category', 'attack_stat_key', 'defense_stat_key']) {
        if (!row[key]) {
          findings.push(finding('error', 'damage-calc-missing-field', `calculated damage row is missing ${key}.`, { turn: turn && turn.turn, index: i }));
        }
      }
    }
  }
}

function validateEffectEvents(turn, findings) {
  const rows = Array.isArray(turn && turn.effect_events) ? turn.effect_events : [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || typeof row !== 'object') {
      findings.push(finding('error', 'effect-event-malformed', 'effect_events contains a non-object row.', { turn: turn && turn.turn, index: i }));
      continue;
    }
    for (const key of ['actor', 'move', 'effect_kind']) {
      if (!row[key]) {
        findings.push(finding('error', 'effect-event-missing-identity', `effect_events row is missing ${key}.`, { turn: turn && turn.turn, index: i }));
      }
    }
    const numericKeys = ['hp_before', 'hp_after', 'hp_delta', 'max_hp'];
    const numbers = {};
    let ok = true;
    for (const key of numericKeys) {
      if (!Number.isFinite(Number(row[key]))) {
        ok = false;
        findings.push(finding('error', 'effect-event-missing-number', `effect_events row is missing numeric ${key}.`, { turn: turn && turn.turn, index: i }));
      } else {
        numbers[key] = Number(row[key]);
      }
    }
    if (ok) {
      if (numbers.hp_delta !== numbers.hp_after - numbers.hp_before) {
        findings.push(finding('error', 'effect-event-hp-delta-mismatch', 'hp_delta must equal hp_after minus hp_before.', {
          turn: turn && turn.turn,
          index: i,
          expected: numbers.hp_after - numbers.hp_before,
          actual: numbers.hp_delta
        }));
      }
      if (numbers.hp_after < 0 || numbers.hp_after > numbers.max_hp) {
        findings.push(finding('error', 'effect-event-hp-out-of-range', 'effect_events hp_after is outside 0..max HP.', {
          turn: turn && turn.turn,
          index: i,
          hp_after: numbers.hp_after,
          max_hp: numbers.max_hp
        }));
      }
      if (row.damage_applied_to_user != null) {
        const expectedAppliedToUser = Math.max(0, numbers.hp_before - numbers.hp_after);
        if (Number(row.damage_applied_to_user) !== expectedAppliedToUser) {
          findings.push(finding('error', 'effect-event-applied-user-damage-mismatch', 'damage_applied_to_user must equal actual HP lost by the affected Pokemon.', {
            turn: turn && turn.turn,
            index: i,
            expected: expectedAppliedToUser,
            actual: row.damage_applied_to_user
          }));
        }
      }
    }
    if (row.rule != null && typeof row.rule !== 'object') {
      findings.push(finding('error', 'effect-event-rule-malformed', 'effect_events rule must be an object when present.', { turn: turn && turn.turn, index: i }));
    } else if (row.rule && !row.rule.basis) {
      findings.push(finding('error', 'effect-event-rule-missing-basis', 'effect_events rule is missing basis.', { turn: turn && turn.turn, index: i }));
    }
    if (row.move_context != null && typeof row.move_context !== 'string') {
      findings.push(finding('error', 'effect-event-context-malformed', 'effect_events move_context must be a string when present.', { turn: turn && turn.turn, index: i }));
    }
  }
}

function validateQaCoverageSummary(payload, turnLog, findings) {
  const summary = payload && payload.qa_coverage_summary;
  if (summary == null) return;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    findings.push(finding('error', 'qa-coverage-malformed', 'qa_coverage_summary must be an object when present.'));
    return;
  }
  if (summary.schema_version !== 'champions-qa-coverage-v1') {
    findings.push(finding('error', 'qa-coverage-schema', 'qa_coverage_summary has an unexpected schema_version.', {
      actual: summary.schema_version || null
    }));
  }
  if (!summary.totals || typeof summary.totals !== 'object') {
    findings.push(finding('error', 'qa-coverage-totals-missing', 'qa_coverage_summary is missing totals.'));
    return;
  }
  if (!summary.mechanics_seen || typeof summary.mechanics_seen !== 'object') {
    findings.push(finding('error', 'qa-coverage-mechanics-missing', 'qa_coverage_summary is missing mechanics_seen.'));
  }
  if (!summary.source_truth_versions || typeof summary.source_truth_versions !== 'object') {
    findings.push(finding('error', 'qa-coverage-source-truth-missing', 'qa_coverage_summary is missing source_truth_versions.'));
  }
  if (!Array.isArray(summary.missing_targeted_proof)) {
    findings.push(finding('error', 'qa-coverage-missing-proof-malformed', 'qa_coverage_summary missing_targeted_proof must be an array.'));
  }

  const expected = {
    turns: turnLog.length,
    damage_events: 0,
    effect_events: 0,
    turns_with_damage_events: 0,
    turns_with_effect_events: 0
  };
  for (const turn of turnLog) {
    const damageRows = Array.isArray(turn && turn.damage_events) ? turn.damage_events : [];
    const effectRows = Array.isArray(turn && turn.effect_events) ? turn.effect_events : [];
    expected.damage_events += damageRows.length;
    expected.effect_events += effectRows.length;
    if (damageRows.length) expected.turns_with_damage_events += 1;
    if (effectRows.length) expected.turns_with_effect_events += 1;
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = Number(summary.totals[key]);
    if (!Number.isFinite(actual) || actual !== expectedValue) {
      findings.push(finding('error', 'qa-coverage-total-mismatch', `qa_coverage_summary totals.${key} does not match the turnLog evidence.`, {
        field: key,
        expected: expectedValue,
        actual: summary.totals[key]
      }));
    }
  }
}

function validateTopLevelTurnMetadata(payload, turnLog, findings) {
  if (!payload) return;
  const isTurnLogV2 = payload.schema_version === 'champions-turn-log-v2';
  if (!Object.prototype.hasOwnProperty.call(payload, 'turns')) {
    if (isTurnLogV2) {
      findings.push(finding('error', 'top-level-turn-count-missing', 'champions-turn-log-v2 payloads must include top-level turns.', {
        field: 'turns',
        expected: turnLog.length,
        actual: undefined
      }));
    }
    return;
  }
  const actual = Number(payload.turns);
  if (!Number.isFinite(actual) || actual !== turnLog.length) {
    findings.push(finding('error', 'top-level-turn-count-mismatch', 'Top-level turns must match the structured turnLog row count.', {
      field: 'turns',
      expected: turnLog.length,
      actual: payload.turns
    }));
  }
}

function finalizeIdentityChecks(state, findings) {
  for (const id of state.identities.values()) {
    const moves = Array.from(id.moves).filter(Boolean);
    if (moves.length > 1) {
      findings.push(finding('error', 'moves-drift', `${id.name} changed move list across snapshots.`, {
        side: id.side,
        identity: id.id,
        moves
      }));
    }

    const items = Array.from(id.items).filter(Boolean);
    if (items.length > 1) {
      findings.push(finding(id.itemConsumedSeen ? 'warning' : 'error', 'item-drift', `${id.name} changed item across snapshots.`, {
        side: id.side,
        identity: id.id,
        items
      }));
    }

    if (!id.stableKeys.size && id.volatileKeys.size > 1) {
      findings.push(finding('warning', 'legacy-volatile-movement', `${id.name} moved through multiple active/bench/fainted keys without a stableKey.`, {
        side: id.side,
        identity: id.id,
        volatileKeys: Array.from(id.volatileKeys)
      }));
    }
  }
}

export function validateTurnLogPayload(payload, options = {}) {
  const findings = [];
  const state = {
    identities: new Map(),
    rowsMissingStableKey: 0,
    missingStableMaps: new Set()
  };
  const turnLog = Array.isArray(payload && payload.turnLog) ? payload.turnLog : null;

  if (!turnLog) {
    findings.push(finding('error', 'turn-log-missing', 'Payload does not contain a turnLog array.'));
    return { findings, summary: { turns: 0, errors: 1, warnings: 0, stableFieldsPresent: false } };
  }

  for (const turn of turnLog) {
    const turnNo = turn && turn.turn != null ? turn.turn : null;
    for (const [snapName, snapshot] of snapshotEntries(turn)) {
      validateSnapshot(snapshot, turnNo, snapName, state, findings);
    }
    validateObservedActionOrder(turn || {}, findings);
    validateNoValidTargetSkips(turn || {}, findings);
    validateDamageEvents(turn || {}, findings);
    validateEffectEvents(turn || {}, findings);
  }

  validateQaCoverageSummary(payload, turnLog, findings);
  validateTopLevelTurnMetadata(payload, turnLog, findings);
  finalizeIdentityChecks(state, findings);

  const stableFieldsPresent = state.rowsMissingStableKey === 0 && state.missingStableMaps.size === 0;
  if (options.requireStable && !stableFieldsPresent) {
    findings.push(finding('error', 'stable-fields-missing', 'Stable identity export fields are missing; refresh the app bundle and export a new log.', {
      rowsMissingStableKey: state.rowsMissingStableKey,
      missingMaps: Array.from(state.missingStableMaps)
    }));
  } else {
    if (state.rowsMissingStableKey > 0) {
      findings.push(finding('warning', 'stable-key-missing', `${state.rowsMissingStableKey} roster row(s) are missing stableKey.`, {
        rowsMissingStableKey: state.rowsMissingStableKey
      }));
    }
    for (const mapName of state.missingStableMaps) {
      findings.push(finding('warning', 'stable-map-missing', `${mapName} is missing from at least one snapshot.`, { mapName }));
    }
  }

  const errors = findings.filter(f => f.severity === 'error').length;
  const warnings = findings.filter(f => f.severity === 'warning').length;
  return {
    findings,
    summary: {
      turns: turnLog.length,
      errors,
      warnings,
      stableFieldsPresent,
      identities: state.identities.size
    }
  };
}

export function validateTurnLogFile(filePath, options = {}) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(raw);
  const result = validateTurnLogPayload(payload, options);
  result.file = filePath;
  result.seed = Array.isArray(payload.seed) ? payload.seed.join(' ') : String(payload.seed || '');
  result.result = payload.result || '';
  return result;
}

function formatFinding(item) {
  const where = [
    item.turn != null ? `turn ${item.turn}` : '',
    item.snapshot ? item.snapshot : '',
    item.side ? item.side : ''
  ].filter(Boolean).join(' ');
  return `  ${item.severity.toUpperCase()} ${item.code}${where ? ` (${where})` : ''}: ${item.message}`;
}

function usage() {
  return [
    'Usage: node tools/validate-turn-logs.mjs [--require-stable] [--json] <champions-turn-log.json...>',
    '',
    'Checks exported battle logs for roster identity, item drift, active/bench key mapping,',
    'HP key coverage, speed-order key coverage, observed priority/speed event order,',
    'damage/effect evidence shape, qa_coverage_summary totals when present, and',
    'no-valid-target skips while a target side still has a live active Pokemon.'
  ].join('\n');
}

function runCli(argv) {
  const args = argv.slice(2);
  const options = { requireStable: false };
  let jsonOut = false;
  const files = [];
  for (const arg of args) {
    if (arg === '--require-stable') options.requireStable = true;
    else if (arg === '--json') jsonOut = true;
    else if (arg === '-h' || arg === '--help') {
      console.log(usage());
      return 0;
    } else {
      files.push(arg);
    }
  }
  if (!files.length) {
    console.error(usage());
    return 2;
  }

  const results = [];
  let hasError = false;
  for (const file of files) {
    const resolved = path.resolve(file);
    try {
      const result = validateTurnLogFile(resolved, options);
      results.push(result);
      if (result.summary.errors > 0) hasError = true;
    } catch (err) {
      hasError = true;
      results.push({
        file: resolved,
        findings: [finding('error', 'read-failed', err && err.message ? err.message : String(err))],
        summary: { turns: 0, errors: 1, warnings: 0, stableFieldsPresent: false }
      });
    }
  }

  if (jsonOut) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      const label = path.basename(result.file);
      const status = result.summary.errors ? 'FAIL' : 'PASS';
      const stable = result.summary.stableFieldsPresent ? 'stable-ids=yes' : 'stable-ids=no';
      console.log(`${status} ${label} turns=${result.summary.turns} errors=${result.summary.errors} warnings=${result.summary.warnings} ${stable}`);
      for (const item of result.findings) console.log(formatFinding(item));
    }
  }
  return hasError ? 1 : 0;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) process.exit(runCli(process.argv));
