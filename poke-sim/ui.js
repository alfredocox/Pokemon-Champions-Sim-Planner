// ============================================================
// CHAMPIONS SIM — UI CONTROLLER
// ============================================================

// ---- Theme Toggle ----
(function() {
  const t = document.querySelector('[data-theme-toggle]'), r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  if (t) t.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    t.innerHTML = d === 'dark'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  });
})();

// ---- Tabs ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---- Format Toggle (Doubles / Singles) ----
let currentFormat = 'doubles';
// T9j.2 — expose for engine.js runSimulation (which can't see ui.js lexical scope).
if (typeof window !== 'undefined') window.currentFormat = currentFormat;
document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFormat = btn.dataset.fmt;
    if (typeof window !== 'undefined') window.currentFormat = currentFormat;
    const indicator = document.getElementById('fmt-indicator');
    if (currentFormat === 'doubles') {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/></svg> DOUBLES · 4v4 · Spread moves active`;
    } else {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/></svg> SINGLES · 6v6 · No spread nerf`;
    }
    // T9j.12 (Refs #74): format change alters bring slot count (4 vs 3);
    // re-render both Teams grid and Simulator pickers to reflect.
    if (typeof renderTeamsGrid === 'function') renderTeamsGrid();
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
  });
});

// ---- Bo Picker ----
let currentBo = 3;
document.querySelectorAll('.bo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBo = parseInt(btn.dataset.bo);
  });
});

// ============================================================
// SHOWDOWN PASTE PARSER
// Parses standard PS! export format into team member objects
// ============================================================
function parseShowdownPaste(text) {
  const members = [];
  const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Line 1: "Name (Nickname) @ Item"  or  "Name @ Item"  or just "Name"
    const line1 = lines[0];
    const itemMatch = line1.match(/^(.+?)\s*@\s*(.+)$/);
    let rawName = itemMatch ? itemMatch[1].trim() : line1.trim();
    const item = itemMatch ? itemMatch[2].trim() : '';

    // Strip nickname: "Nickname (Species)" -> use Species
    const nicknameMatch = rawName.match(/^.+\((.+)\)$/);
    if (nicknameMatch) rawName = nicknameMatch[1].trim();

    // Strip gender suffix M/F
    rawName = rawName.replace(/\s*\(([MF])\)\s*$/, '').trim();

    let ability = '', level = 50, nature = 'Hardy', tera = null;
    const evs = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
    const moves = [];

    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('Ability:')) ability = l.replace('Ability:', '').trim();
      else if (l.startsWith('Level:')) level = parseInt(l.replace('Level:', '').trim()) || 50;
      else if (l.startsWith('Tera Type:')) tera = l.replace('Tera Type:', '').trim();
      else if (l.startsWith('EVs:')) {
        const evParts = l.replace('EVs:', '').split('/').map(s => s.trim());
        for (const p of evParts) {
          const m = p.match(/(\d+)\s+(\w+)/);
          if (m) {
            const val = parseInt(m[1]), stat = m[2].toLowerCase();
            const key = stat === 'spatk' ? 'spa' : stat === 'spdef' ? 'spd' : stat === 'speed' ? 'spe' :
                        stat === 'attack' ? 'atk' : stat === 'defense' ? 'def' : stat === 'hp' ? 'hp' : stat;
            if (key in evs) evs[key] = val;
          }
        }
      } else if (l.endsWith('Nature')) {
        nature = l.replace('Nature', '').trim();
      } else if (l.startsWith('- ')) {
        moves.push(l.replace('- ', '').trim());
      }
    }

    if (!rawName) continue;
    members.push({ name: rawName, item, ability, level, nature, evs, moves, role: '', tera });
  }
  return members;
}

// ============================================================
// SHOWDOWN PASTE EXPORTER
// Generates a valid PS!/pokepast.es paste from a team object
// ============================================================
function exportTeamToPaste(team) {
  if (!team || !team.members) return '';
  const lines = [];
  for (const m of team.members) {
    // Line 1
    const itemStr = m.item ? ` @ ${m.item}` : '';
    lines.push(`${m.name}${itemStr}`);
    if (m.ability) lines.push(`Ability: ${m.ability}`);
    lines.push(`Level: ${m.level || 50}`);
    if (m.tera) lines.push(`Tera Type: ${m.tera}`);
    // EVs — only non-zero
    const evs = m.evs || {};
    const evParts = [];
    const statLabels = { hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe' };
    for (const [k, label] of Object.entries(statLabels)) {
      const v = evs[k] || 0;
      if (v > 0) evParts.push(`${v} ${label}`);
    }
    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`);
    if (m.nature) lines.push(`${m.nature} Nature`);
    for (const mv of (m.moves || [])) lines.push(`- ${mv}`);
    lines.push(''); // blank line between mons
  }
  return lines.join('\n').trim();
}

// ---- Helper: sprite URL (defined in data.js; safe no-op re-export for ui.js compat) ----
// getSpriteUrl is already defined in data.js — do not redefine here

// ---- Type color ----
function typeColor(type) { return TYPE_COLORS[type] || '#888'; }

// ============================================================
// ROSTER RENDERING
// ============================================================
function getPokemonTypes(name) {
  // Check POKEMON_TYPES_DB first (comprehensive), then BASE_STATS, then fallback
  if (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[name]) return POKEMON_TYPES_DB[name];
  const base = BASE_STATS[name];
  if (base && base.types) return base.types;
  // Try partial match (e.g. 'Milotic' vs 'Milotic-something')
  if (typeof POKEMON_TYPES_DB !== 'undefined') {
    const key = Object.keys(POKEMON_TYPES_DB).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) return POKEMON_TYPES_DB[key];
  }
  return ['Normal']; // last resort
}

function renderRoster(containerId, members) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  for (const m of members) {
    const types = getPokemonTypes(m.name);
    const row = document.createElement('div');
    row.className = 'poke-row';
    row.innerHTML = `
      <img class="poke-sprite" src="${getSpriteUrl(m.name)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity='.3'"/>
      <div class="poke-info">
        <div class="poke-name">${m.name}</div>
        <div class="poke-item">${m.item || '—'} · ${m.ability || '—'}</div>
        <div class="poke-moves">${(m.moves||[]).join(' / ')}</div>
      </div>
      <div class="type-chips">
        ${types.map(t=>`<span class="type-chip" style="background:${typeColor(t)}20;color:${typeColor(t)};border:1px solid ${typeColor(t)}40">${t}</span>`).join('')}
      </div>`;
    el.appendChild(row);
  }
}

// ============================================================
// T9d: Dynamic player/opponent team selectors + Swap button
// currentPlayerKey tracks the active player team (user-selectable).
// rebuildTeamSelects() re-populates both dropdowns from TEAMS so that
// imported/custom teams appear in BOTH sides.
// ============================================================
var currentPlayerKey = 'player';

// ============================================================
// T9f: Custom-team persistence (localStorage)
// - Only teams with source === 'custom' are persisted
// - Preloaded teams are protected (not written, not deletable)
// - Schema version bumps require migration
// ============================================================
var CUSTOM_TEAMS_STORAGE_KEY = 'champions_sim_custom_teams_v1';
var CUSTOM_TEAMS_SCHEMA_VERSION = 1;

function loadCustomTeamsFromStorage() {
  try {
    var raw = localStorage.getItem(CUSTOM_TEAMS_STORAGE_KEY);
    if (!raw) return 0;
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== CUSTOM_TEAMS_SCHEMA_VERSION) return 0;
    var count = 0;
    for (var key in parsed.teams) {
      if (TEAMS[key]) continue; // never clobber preloaded
      TEAMS[key] = parsed.teams[key];
      TEAMS[key].source = 'custom';
      count++;
    }
    return count;
  } catch (e) {
    console.warn('[T9f] Failed to load custom teams:', e);
    return 0;
  }
}

function saveCustomTeamsToStorage() {
  try {
    var out = { version: CUSTOM_TEAMS_SCHEMA_VERSION, saved_at: new Date().toISOString(), teams: {} };
    for (var key in TEAMS) {
      if (TEAMS[key] && TEAMS[key].source === 'custom') {
        out.teams[key] = TEAMS[key];
      }
    }
    localStorage.setItem(CUSTOM_TEAMS_STORAGE_KEY, JSON.stringify(out));
    return Object.keys(out.teams).length;
  } catch (e) {
    console.warn('[T9f] Failed to save custom teams (quota?):', e);
    return -1;
  }
}

// Load persisted custom teams BEFORE first rebuildTeamSelects() call
loadCustomTeamsFromStorage();

// ============================================================
// T9h: Preloaded overrides + async confirm modal
// ============================================================
var PRELOADED_OVERRIDES_KEY = 'champions_sim_preloaded_overrides_v1';
var PRELOADED_OVERRIDES_SCHEMA = 1;

function loadPreloadedOverridesFromStorage() {
  try {
    var raw = localStorage.getItem(PRELOADED_OVERRIDES_KEY);
    if (!raw) return 0;
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PRELOADED_OVERRIDES_SCHEMA) return 0;
    var count = 0;
    for (var key in parsed.overrides) {
      if (!TEAMS[key]) continue; // only apply to still-existing preloaded keys
      if (TEAMS[key].source === 'custom') continue;
      // Override the members only; preserve name/meta/format/legality
      TEAMS[key].members = parsed.overrides[key].members;
      TEAMS[key]._hasOverride = true;
      count++;
    }
    return count;
  } catch (e) {
    console.warn('[T9h] Failed to load preloaded overrides:', e);
    return 0;
  }
}

function savePreloadedOverride(key) {
  try {
    var raw = localStorage.getItem(PRELOADED_OVERRIDES_KEY);
    var store = (raw && JSON.parse(raw)) || { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    if (store.version !== PRELOADED_OVERRIDES_SCHEMA) store = { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    store.overrides[key] = { members: TEAMS[key].members, saved_at: new Date().toISOString() };
    store.saved_at = new Date().toISOString();
    localStorage.setItem(PRELOADED_OVERRIDES_KEY, JSON.stringify(store));
    TEAMS[key]._hasOverride = true;
    return true;
  } catch (e) {
    console.warn('[T9h] Failed to save preloaded override:', e);
    return false;
  }
}

function clearPreloadedOverride(key) {
  try {
    var raw = localStorage.getItem(PRELOADED_OVERRIDES_KEY);
    if (!raw) return false;
    var store = JSON.parse(raw);
    if (!store || !store.overrides || !store.overrides[key]) return false;
    delete store.overrides[key];
    localStorage.setItem(PRELOADED_OVERRIDES_KEY, JSON.stringify(store));
    return true;
  } catch (e) {
    console.warn('[T9h] Failed to clear preloaded override:', e);
    return false;
  }
}

// Load overrides after initial TEAMS load (and after custom teams)
loadPreloadedOverridesFromStorage();

// Async confirm (replaces window.confirm — blocked in sandboxed iframes)
var _pendingConfirm = null;
function asyncConfirm(title, body, okLabel) {
  return new Promise(function(resolve) {
    var modal = document.getElementById('confirm-modal');
    var titleEl = document.getElementById('confirm-title');
    var bodyEl = document.getElementById('confirm-body');
    var okBtn = document.getElementById('confirm-ok');
    if (!modal || !titleEl || !bodyEl || !okBtn) { resolve(window.confirm(body)); return; }
    titleEl.textContent = title || 'Confirm';
    bodyEl.textContent = body || '';
    okBtn.textContent = okLabel || 'Confirm';
    modal.style.display = 'flex';
    _pendingConfirm = resolve;
  });
}
function _resolveConfirm(v) {
  var modal = document.getElementById('confirm-modal');
  if (modal) modal.style.display = 'none';
  if (_pendingConfirm) { var fn = _pendingConfirm; _pendingConfirm = null; fn(v); }
}
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'confirm-ok') _resolveConfirm(true);
  else if (e.target && (e.target.id === 'confirm-cancel' || e.target.id === 'confirm-close')) _resolveConfirm(false);
});

// ============================================================
// T9g: Delete custom teams (gated by team.source === 'custom')
// ============================================================
async function deleteCustomTeam(key) {
  var team = TEAMS[key];
  if (!team) return;
  if (team.source !== 'custom') {
    console.warn('[T9g] Refusing to delete preloaded team:', key);
    return;
  }
  var ok = await asyncConfirm('Delete team', 'Delete "' + team.name + '"?\n\nThis cannot be undone.', 'Delete');
  if (!ok) return;

  delete TEAMS[key];
  if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();

  // Fallback selections if deleted team was selected
  if (currentPlayerKey === key) {
    currentPlayerKey = TEAMS.player ? 'player' : Object.keys(TEAMS)[0];
  }
  var oppSel = document.getElementById('opponent-select');
  if (oppSel && oppSel.value === key) {
    oppSel.value = TEAMS.mega_altaria ? 'mega_altaria' : Object.keys(TEAMS)[0];
  }

  if (typeof rebuildTeamSelects === 'function') rebuildTeamSelects();
  if (typeof renderTeamsGrid === 'function') renderTeamsGrid();
  if (TEAMS[currentPlayerKey]) renderRoster('player-roster', TEAMS[currentPlayerKey].members);
  if (oppSel && TEAMS[oppSel.value]) renderRoster('opp-roster', TEAMS[oppSel.value].members);
  // T9j.3b: coverage must refresh after team removal / fallback.
  if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
}

function rebuildTeamSelects() {
  var playerSel = document.getElementById('player-select');
  var oppSel = document.getElementById('opponent-select');
  if (!playerSel || !oppSel) return;
  var prevPlayer = playerSel.value || currentPlayerKey;
  var prevOpp = oppSel.value || 'mega_altaria';
  playerSel.innerHTML = '';
  // Rebuild opponent while preserving order (existing option text has
  // ladder-gate glyph mutations; start fresh from TEAMS)
  oppSel.innerHTML = '';
  for (var key in TEAMS) {
    var t = TEAMS[key];
    if (!t || !t.name) continue;
    var o1 = document.createElement('option');
    o1.value = key; o1.textContent = t.name;
    playerSel.appendChild(o1);
    var o2 = document.createElement('option');
    o2.value = key; o2.textContent = t.name;
    oppSel.appendChild(o2);
  }
  if (TEAMS[prevPlayer]) playerSel.value = prevPlayer;
  if (TEAMS[prevOpp]) oppSel.value = prevOpp;
  currentPlayerKey = playerSel.value;
  if (typeof applyLadderGate === 'function') applyLadderGate();
}

// ---- Initial renders ----
renderRoster('player-roster', TEAMS.player.members);
renderRoster('opp-roster', TEAMS.mega_altaria.members);
rebuildTeamSelects();
// T9j.12 (Refs #74): draw sim-side bring pickers on initial load.
if (typeof renderSimBringPickers === 'function') renderSimBringPickers();

// ---- Player select ----
document.getElementById('player-select').addEventListener('change', function() {
  var team = TEAMS[this.value];
  if (team) {
    currentPlayerKey = this.value;
    document.getElementById('player-team-name').textContent = team.name;
    renderRoster('player-roster', team.members);
    if (typeof applyLadderGate === 'function') applyLadderGate();
    // T9j.3b: recompute coverage on active-team change (no cache, always fresh).
    if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
    // T9j.12 (Refs #74): refresh sim-side bring picker after active-team change.
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
  }
});

// ---- Opponent select ----
document.getElementById('opponent-select').addEventListener('change', function() {
  const team = TEAMS[this.value];
  if (team) {
    document.getElementById('opp-team-name').textContent = team.name;
    renderRoster('opp-roster', team.members);
    // T9j.12 (Refs #74): refresh sim-side bring picker on opponent switch.
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
  }
});

// ---- T9d: Swap Teams button ----
document.getElementById('swap-teams-btn')?.addEventListener('click', function() {
  var pSel = document.getElementById('player-select');
  var oSel = document.getElementById('opponent-select');
  if (!pSel || !oSel) return;
  var tmp = pSel.value;
  pSel.value = oSel.value;
  oSel.value = tmp;
  pSel.dispatchEvent(new Event('change'));
  oSel.dispatchEvent(new Event('change'));
  // T9j.12 (Refs #74): ensure sim-side pickers reflect the swap.
  if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
});

// ============================================================
// Issue #T6: Ladder Mode gate
// Ladder Mode ON (default): only teams whose format==='champions'
// AND legality_status==='legal' appear in opponent-select; Run All
// iterates only those teams. OFF: all teams visible.
// Reads T5 schema fields: team.format, team.legality_status.
// ============================================================
// T9h: default OFF so all preloaded + inferred + custom teams are visible.
// T9h: isLadderLegal accepts 'legal' (manually verified) AND 'legal_inferred'
// (tournament placement teams with archetype-default spreads).
var LADDER_MODE = false;

function isLadderLegal(teamKey) {
  var t = (typeof TEAMS !== 'undefined') && TEAMS[teamKey];
  if (!t) return false;
  if (t.format !== 'champions') return false;
  return t.legality_status === 'legal' || t.legality_status === 'legal_inferred';
}

function _gateOneSelect(selId) {
  var sel = document.getElementById(selId);
  if (!sel) return { anyVisible:false, firstVisibleValue:null };
  var anyVisible = false;
  var firstVisibleValue = null;
  for (var i = 0; i < sel.options.length; i++) {
    var opt = sel.options[i];
    var key = opt.value;
    var team = (typeof TEAMS !== 'undefined') && TEAMS[key];
    var legal = isLadderLegal(key);
    opt.hidden = false;
    opt.disabled = false;
    opt.textContent = opt.textContent.replace(/\s*[\u2705\u26A0\u274C].*$/,'').trim();
    if (team) {
      var glyph = legal ? '\u2705' : (team.legality_status === 'illegal' ? '\u274C' : '\u26A0');
      // T9h: distinguish inferred from manually-verified legal
      var legalLabel = (team.legality_status === 'legal_inferred') ? 'Legal (inferred)' : 'Legal';
      opt.textContent = opt.textContent + '  ' + glyph + ' ' +
        (legal ? legalLabel : (team.legality_status === 'illegal' ? 'Illegal' : (team.format || '?').toUpperCase()));
    }
    if (LADDER_MODE && team && !legal) {
      opt.hidden = true;
      opt.disabled = true;
    } else {
      anyVisible = true;
      if (firstVisibleValue === null) firstVisibleValue = key;
    }
  }
  if (LADDER_MODE && sel.selectedOptions[0] && sel.selectedOptions[0].hidden && firstVisibleValue) {
    sel.value = firstVisibleValue;
    sel.dispatchEvent(new Event('change'));
  }
  return { anyVisible: anyVisible, firstVisibleValue: firstVisibleValue };
}

function applyLadderGate() {
  var pg = _gateOneSelect('player-select');
  var og = _gateOneSelect('opponent-select');
  var anyVisible = pg.anyVisible || og.anyVisible;
  if (!anyVisible && LADDER_MODE) {
    LADDER_MODE = false;
    var cb = document.getElementById('ladder-mode-toggle');
    if (cb) cb.checked = false;
    applyLadderGate();
  }
}

document.getElementById('ladder-mode-toggle')?.addEventListener('change', function() {
  LADDER_MODE = !!this.checked;
  applyLadderGate();
});

// Initial gate on load
applyLadderGate();

// ============================================================
// TEAMS TAB
// ============================================================
// ============================================================
// T9j.12 (Refs #74) Shared bring-picker HTML builder + wiring
// ------------------------------------------------------------
// Same markup used on Teams tab (cards) and Simulator tab (inline, under the
// two VS roster columns). State (BRING_SELECTION + BRING_MODE) is authoritative
// in localStorage via the T9j.10 helpers getBringFor/setBringFor/getBringMode/
// setBringMode; both tabs read/write the same key so an override on one tab
// propagates to the other on next render.
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Lead_Pok%C3%A9mon
//   Cite: https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
// ============================================================
function buildBringPickerHtml(teamKey, opts) {
  opts = opts || {};
  var compact = !!opts.compact;
  var team = TEAMS[teamKey];
  if (!team || !team.members) return '';
  var bringCount = (typeof currentFormat !== 'undefined' && currentFormat === 'singles') ? 3 : 4;
  var leadCount  = (typeof currentFormat !== 'undefined' && currentFormat === 'singles') ? 1 : 2;
  var bring = (typeof getBringFor === 'function')
    ? getBringFor(teamKey)
    : team.members.slice(0, bringCount).map(function(m){ return m.name; });
  var mode = (typeof getBringMode === 'function')
    ? getBringMode(teamKey)
    : (teamKey === (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player') ? 'manual' : 'random');
  var slotLabels = [];
  for (var i = 0; i < bringCount; i++) slotLabels.push(i < leadCount ? 'LEAD ' + (i+1) : 'BENCH ' + (i+1));
  var slotsHtml = slotLabels.map(function(label, i){
    var monName = bring[i] || '';
    var sprite = monName ? getSpriteUrl(monName) : '';
    return '<div class="bring-slot ' + (i < leadCount ? 'bring-slot-lead' : 'bring-slot-bench') +
      '" data-team="' + teamKey + '" data-slot="' + i +
      '" draggable="' + (monName ? 'true' : 'false') +
      '" title="' + label + (mode === 'random' ? ' (random mode)' : '') + '">' +
      '<div class="bring-slot-label">' + label + '</div>' +
      (monName
        ? '<img class="bring-slot-sprite" src="' + sprite + '" alt="' + monName + '" loading="lazy" onerror="this.style.opacity=\'.3\'"/>' +
          '<div class="bring-slot-name">' + monName + '</div>'
        : '<div class="bring-slot-empty">\u2014</div>') +
      '</div>';
  }).join('');
  // Compact pool (for Simulator side) omits the heavy meta rows in favor of
  // a single sprite strip so it tucks under the roster without pushing the
  // Run Simulation button off-screen. The full pool stays on Teams tab.
  var poolHtml;
  if (compact) {
    poolHtml = team.members.map(function(m){
      var inBring = bring.indexOf(m.name) >= 0;
      var pos = inBring ? (bring.indexOf(m.name) < leadCount ? 'LEAD ' + (bring.indexOf(m.name)+1) : 'BENCH ' + (bring.indexOf(m.name)+1)) : '';
      return '<div class="bring-pool-chip ' + (inBring ? 'bring-in' : 'bring-out') +
        '" data-team="' + teamKey + '" data-mon="' + m.name +
        '" draggable="' + (mode === 'random' ? 'false' : 'true') +
        '" title="' + m.name + (inBring ? ' (' + pos + ')' : '') + '">' +
        '<img class="bring-pool-chip-sprite" src="' + getSpriteUrl(m.name) + '" alt="' + m.name + '" loading="lazy" onerror="this.style.opacity=\'.3\'"/>' +
        '<span class="bring-pool-chip-name">' + m.name + '</span>' +
        (inBring ? '<span class="bring-pool-chip-pos">' + pos + '</span>' : '') +
        '</div>';
    }).join('');
  } else {
    poolHtml = team.members.map(function(m){
      var inBring = bring.indexOf(m.name) >= 0;
      return '<div class="bring-pool-row ' + (inBring ? 'bring-in' : 'bring-out') +
        '" data-team="' + teamKey + '" data-mon="' + m.name +
        '" draggable="' + (mode === 'random' ? 'false' : 'true') + '">' +
        '<img class="poke-full-sprite" src="' + getSpriteUrl(m.name) + '" alt="' + m.name + '" loading="lazy" onerror="this.style.opacity=\'.3\'"/>' +
        '<div class="poke-full-info">' +
          '<div class="poke-full-name">' + m.name +
            ' <span style="font-weight:400;color:var(--text-m);font-size:10px">@ ' + (m.item || '\u2014') + '</span>' +
            (inBring ? ' <span style="font-size:9px;color:var(--accent,#4a9eff);font-weight:600;margin-left:4px">\u25c6 ' +
              (bring.indexOf(m.name) < leadCount ? 'LEAD' : 'BENCH') + ' ' + (bring.indexOf(m.name)+1) + '</span>' : '') +
          '</div>' +
          '<div class="poke-full-detail">' + (m.ability || '\u2014') + ' \u00b7 ' + (m.nature || 'Hardy') + ' \u00b7 Lv' + (m.level || 50) + '</div>' +
          '<div class="move-tags">' + (m.moves || []).map(function(mv){ return '<span class="move-tag">' + mv + '</span>'; }).join('') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }
  var modeToggle =
    '<div class="bring-mode-row" data-team="' + teamKey + '">' +
      '<span class="bring-mode-label">Bring picker:</span>' +
      '<button class="bring-mode-btn ' + (mode === 'manual' ? 'active' : '') + '" data-team="' + teamKey + '" data-mode="manual" title="Pick your ' + bringCount + ' Pokemon by hand">Manual</button>' +
      '<button class="bring-mode-btn ' + (mode === 'random' ? 'active' : '') + '" data-team="' + teamKey + '" data-mode="random" title="Re-roll a random ' + bringCount + ' of 6 each series">Random ' + bringCount + '/6</button>' +
    '</div>';
  var poolCls = compact ? 'bring-pool bring-pool-compact' : 'bring-pool';
  return modeToggle +
    '<div class="bring-slots">' + slotsHtml + '</div>' +
    '<div class="' + poolCls + '">' + poolHtml + '</div>';
}

// Shared wiring: attach drag/tap handlers to every .bring-mode-btn /
// .bring-pool-row / .bring-pool-chip / .bring-slot inside rootEl, and call
// onChange() after any state mutation (both renders must re-run).
function wireBringPickerElements(rootEl, onChange) {
  if (!rootEl) return;
  var _isHoverCapable = (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true;
  var _tapState = {};
  function _assignSlot(teamKey, slotIdx, monName) {
    if (getBringMode(teamKey) === 'random') return;
    var count = getBringCount();
    var cur = getBringFor(teamKey).slice();
    while (cur.length < count) cur.push(null);
    var existingIdx = cur.indexOf(monName);
    if (existingIdx >= 0 && existingIdx !== slotIdx) cur[existingIdx] = cur[slotIdx] || null;
    cur[slotIdx] = monName;
    var compact = cur.filter(Boolean);
    var team = TEAMS[teamKey];
    if (team) {
      for (var i = 0; i < team.members.length; i++) {
        if (compact.length >= count) break;
        if (compact.indexOf(team.members[i].name) < 0) compact.push(team.members[i].name);
      }
    }
    setBringFor(teamKey, compact.slice(0, count));
  }
  function _clearSlot(teamKey, slotIdx) {
    if (getBringMode(teamKey) === 'random') return;
    var count = getBringCount();
    var cur = getBringFor(teamKey).slice();
    if (slotIdx < cur.length) cur.splice(slotIdx, 1);
    var team = TEAMS[teamKey];
    if (team) {
      for (var i = 0; i < team.members.length; i++) {
        if (cur.length >= count) break;
        if (cur.indexOf(team.members[i].name) < 0) cur.push(team.members[i].name);
      }
    }
    setBringFor(teamKey, cur.slice(0, count));
  }
  rootEl.querySelectorAll('.bring-mode-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      setBringMode(btn.dataset.team, btn.dataset.mode);
      onChange && onChange();
    });
  });
  // Pool handles BOTH shapes: .bring-pool-row (Teams tab) and .bring-pool-chip (Simulator compact).
  rootEl.querySelectorAll('.bring-pool-row, .bring-pool-chip').forEach(function(row){
    var teamKey = row.dataset.team;
    var monName = row.dataset.mon;
    if (_isHoverCapable) {
      row.addEventListener('dragstart', function(ev){
        if (getBringMode(teamKey) === 'random') { ev.preventDefault(); return; }
        try { ev.dataTransfer.setData('text/plain', JSON.stringify({ teamKey: teamKey, monName: monName })); } catch (e) {}
        ev.dataTransfer.effectAllowed = 'move';
        row.classList.add('bring-dragging');
      });
      row.addEventListener('dragend', function(){ row.classList.remove('bring-dragging'); });
    }
    row.addEventListener('click', function(){
      if (getBringMode(teamKey) === 'random') return;
      _tapState[teamKey] = (_tapState[teamKey] === monName) ? null : monName;
      rootEl.querySelectorAll('[data-team="' + teamKey + '"][data-mon]').forEach(function(r){
        r.classList.toggle('bring-picked', r.dataset.mon === _tapState[teamKey]);
      });
    });
  });
  rootEl.querySelectorAll('.bring-slot').forEach(function(slot){
    var teamKey = slot.dataset.team;
    var slotIdx = parseInt(slot.dataset.slot, 10);
    if (_isHoverCapable) {
      slot.addEventListener('dragover', function(ev){
        if (getBringMode(teamKey) === 'random') return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        slot.classList.add('bring-drop-hover');
      });
      slot.addEventListener('dragleave', function(){ slot.classList.remove('bring-drop-hover'); });
      slot.addEventListener('drop', function(ev){
        ev.preventDefault();
        slot.classList.remove('bring-drop-hover');
        if (getBringMode(teamKey) === 'random') return;
        var payload = null;
        try { payload = JSON.parse(ev.dataTransfer.getData('text/plain') || 'null'); } catch (e) {}
        if (payload && payload.teamKey === teamKey && payload.monName) {
          _assignSlot(teamKey, slotIdx, payload.monName);
          onChange && onChange();
        }
      });
      slot.addEventListener('dragstart', function(ev){
        if (getBringMode(teamKey) === 'random') { ev.preventDefault(); return; }
        var cur = getBringFor(teamKey);
        var mon = cur[slotIdx];
        if (!mon) { ev.preventDefault(); return; }
        try { ev.dataTransfer.setData('text/plain', JSON.stringify({ teamKey: teamKey, monName: mon, fromSlot: slotIdx })); } catch (e) {}
        ev.dataTransfer.effectAllowed = 'move';
      });
    }
    slot.addEventListener('click', function(){
      if (getBringMode(teamKey) === 'random') return;
      var picked = _tapState[teamKey];
      if (picked) {
        _assignSlot(teamKey, slotIdx, picked);
        _tapState[teamKey] = null;
        onChange && onChange();
      } else {
        _clearSlot(teamKey, slotIdx);
        onChange && onChange();
      }
    });
  });
}

// T9j.12 (Refs #74) — render the compact bring picker into one Simulator side.
//   containerId — 'player-bring-picker' or 'opp-bring-picker'
//   teamKey     — currentPlayerKey for player side, opponent-select.value for opp
function renderSimBringPicker(containerId, teamKey) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!TEAMS[teamKey]) { el.innerHTML = ''; return; }
  el.innerHTML =
    '<div class="sim-bring-header">Bring (' +
      (typeof currentFormat !== 'undefined' && currentFormat === 'singles' ? '3 of 6' : '4 of 6') +
    ') \u2014 LEAD + BENCH</div>' +
    buildBringPickerHtml(teamKey, { compact: true });
  wireBringPickerElements(el, function(){
    // Re-render both sides AND the Teams tab grid so an override on one
    // view propagates to the other immediately.
    renderSimBringPickers();
    if (typeof renderTeamsGrid === 'function') renderTeamsGrid();
  });
}

function renderSimBringPickers() {
  var playerKey = (typeof currentPlayerKey !== 'undefined') ? currentPlayerKey : 'player';
  var oppSel = document.getElementById('opponent-select');
  var oppKey = oppSel ? oppSel.value : 'mega_altaria';
  renderSimBringPicker('player-bring-picker', playerKey);
  renderSimBringPicker('opp-bring-picker', oppKey);
}

// ============================================================
// T9j.11 (Refs #73) Teams-tab filter + persistence banner + bulk file I/O
// ------------------------------------------------------------
// Filter chips: All / Preloaded / Custom / Tournament / Mega
//   - Preloaded = any team whose source !== 'custom'
//   - Custom    = team.source === 'custom' (imported by user, localStorage-backed)
//   - Tournament = preloaded team whose key matches champions_arena_* or known
//                  tournament rosters (chuppa_balance, aurora_veil_froslass,
//                  kingambit_sneasler, cofagrigus_tr, rin_sand, suica_sun).
//   - Mega      = team whose key starts with mega_ (mega_altaria / mega_dragonite
//                  / mega_houndoom).
// Bulk I/O: JSON is the authoritative round-trip format (uses the T9f schema
//   { version:1, saved_at, teams:{...} }). Showdown .txt is the interop format
//   (multi-team pokepaste; split on `=== name ===` markers or blank-line runs).
// Cite: Pokemon Showdown team format -- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Showdown
// Cite: Smogon export convention   -- https://www.smogon.com/forums/threads/3587177/
// Cite: MDN File API (reader)      -- https://developer.mozilla.org/en-US/docs/Web/API/File_API
// ============================================================
var TEAMS_FILTER = 'all'; // 'all' | 'preloaded' | 'custom' | 'tournament' | 'mega'
var TOURNAMENT_TEAM_KEYS = {
  champions_arena_1st:1, champions_arena_2nd:1, champions_arena_3rd:1,
  chuppa_balance:1, aurora_veil_froslass:1, kingambit_sneasler:1,
  cofagrigus_tr:1, rin_sand:1, suica_sun:1
};
function teamMatchesFilter(key, team, filter) {
  if (!team) return false;
  var isCustom = team.source === 'custom';
  if (filter === 'all') return true;
  if (filter === 'custom') return isCustom;
  if (filter === 'preloaded') return !isCustom;
  if (filter === 'tournament') return !isCustom && !!TOURNAMENT_TEAM_KEYS[key];
  if (filter === 'mega') return /^mega_/.test(key);
  return true;
}
function countTeamsByFilter(filter) {
  var n = 0;
  for (var k in TEAMS) if (teamMatchesFilter(k, TEAMS[k], filter)) n++;
  return n;
}
function renderTeamsPersistenceBanner() {
  var el = document.getElementById('teams-persistence-banner');
  if (!el) return;
  var customCount = countTeamsByFilter('custom');
  el.className = 'teams-persistence-banner' + (customCount === 0 ? ' empty' : '');
  el.style.display = '';
  if (customCount === 0) {
    el.textContent = 'No custom teams saved yet. Imported teams persist automatically across refresh.';
  } else {
    el.textContent = 'Loaded ' + customCount + ' custom team' + (customCount === 1 ? '' : 's') +
      ' from this device (auto-saved across refresh).';
  }
}
function renderTeamsFilterRow() {
  var row = document.getElementById('teams-filter-row');
  if (!row) return;
  var chips = [
    { id:'all',        label:'All' },
    { id:'preloaded',  label:'Preloaded' },
    { id:'custom',     label:'Custom' },
    { id:'tournament', label:'Tournament' },
    { id:'mega',       label:'Mega' }
  ];
  row.innerHTML = chips.map(function(c){
    var count = countTeamsByFilter(c.id);
    var active = (c.id === TEAMS_FILTER) ? ' active' : '';
    return '<button class="teams-filter-chip' + active + '" data-filter="' + c.id + '">' +
      '<span class="chip-label">' + c.label + '</span>' +
      '<span class="chip-count">' + count + '</span></button>';
  }).join('');
  row.querySelectorAll('.teams-filter-chip').forEach(function(btn){
    btn.addEventListener('click', function(){
      TEAMS_FILTER = btn.dataset.filter;
      renderTeamsFilterRow();
      renderTeamsGrid();
    });
  });
}

function renderTeamsGrid() {
  renderTeamsPersistenceBanner();
  renderTeamsFilterRow();
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const [key, team] of Object.entries(TEAMS)) {
    if (!teamMatchesFilter(key, team, TEAMS_FILTER)) continue;
    const isPlayer = key === 'player';
    const card = document.createElement('div');
    card.className = 'team-full-card';
    card.innerHTML = `
      <div class="tfcard-header">
        <div>
          <div class="tfcard-name">${team.name}</div>
          <div class="tfcard-meta">${team.style?.toUpperCase().replace('_',' ')} · ${(team.description||'').substring(0,55)}…</div>
        </div>
        <div class="tfcard-badges">
          <span class="badge ${isPlayer?'badge-blue':'badge-red'}">${team.label||key}</span>
          ${(function(){ /* Issue #T6: legality badge - T9h: legal_inferred */
            var st = team.legality_status; var fmt = team.format;
            if (st === 'legal' && fmt === 'champions') return '<span class="badge-legal">\u2705 LEGAL</span>';
            if (st === 'legal_inferred' && fmt === 'champions') return '<span class="badge-warn" title="Tournament-placement team; EVs are archetype defaults (Open Team Lists redact EVs). Ladder-legal in Ladder Mode.">\u26A0 LEGAL (inferred)</span>';
            if (st === 'illegal') return '<span class="badge-illegal">\u274C ILLEGAL</span>';
            if (fmt === 'sv') return '<span class="badge-warn">\u26A0 SV FORMAT</span>';
            return '<span class="badge-warn">\u26A0 UNVERIFIED</span>';
          })()}
          <button class="export-card-btn" data-team="${key}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Export
          </button>
          <!-- T9h: universal edit button (works on custom, preloaded, and player slots) -->
          <button class="edit-card-btn" data-team="${key}" title="Edit this team via Showdown paste"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Edit</button>
          ${team._hasOverride && team.source !== 'custom' ? `<button class="reset-card-btn" data-team="${key}" title="Revert this preloaded team to its original"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Reset</button>` : ''}
          ${team.source === 'custom' ? `<button class="delete-card-btn" data-team="${key}" title="Delete this custom team"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</button>` : ''}
        </div>
      </div>
      ${buildBringPickerHtml(key, { compact: false })}`;
    grid.appendChild(card);
  }
  // Export buttons
  grid.querySelectorAll('.export-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openExportModal(btn.dataset.team));
  });
  // T9g: delete button wiring (only rendered for custom teams)
  grid.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCustomTeam(btn.dataset.team));
  });
  // T9h: edit button wiring (all teams)
  grid.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditTeamModal(btn.dataset.team));
  });
  // T9h: reset button wiring (preloaded teams with overrides)
  grid.querySelectorAll('.reset-card-btn').forEach(btn => {
    btn.addEventListener('click', () => resetPreloadedTeam(btn.dataset.team));
  });
  // T9j.12 (Refs #74) — Bring picker wiring delegated to shared helper so
  // Simulator side (wired in renderSimBringPicker) uses identical logic.
  // After any state mutation we re-render both Teams grid AND the Simulator
  // bring pickers so an override on one view propagates to the other.
  // Refs: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
  wireBringPickerElements(grid, function(){
    renderTeamsGrid();
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
  });
  // Speed tier sections appended by renderSpeedTiersForGrid() after TEAMS data
}
renderTeamsGrid();
// Note: renderSpeedTiersForGrid is called at bottom after it's defined

document.getElementById('import-team-btn')?.addEventListener('click', () => openImportModal());

// ============================================================
// T9j.11 (Refs #73) Bulk file import/export
// ------------------------------------------------------------
// parseMultiTeamShowdown(text): accepts a Smogon/pokepaste multi-team dump.
//   Splits first on lines of the form `=== [name] ===` (pokepaste convention
//   used by Showdown's teambuilder export-all). If no `=== ... ===` markers
//   are found, falls back to splitting on two-or-more consecutive blank lines
//   and treats each block as one team. Normalizes CRLF/CR before splitting.
// Returns: [{ name, members:[...] }, ...]
// Cite: Smogon export-all team format -- https://www.smogon.com/forums/threads/3587177/
// Cite: MDN File API                  -- https://developer.mozilla.org/en-US/docs/Web/API/File_API
// ============================================================
function parseMultiTeamShowdown(text) {
  if (!text) return [];
  // Normalize line endings (Windows CRLF, classic Mac CR -> \n).
  var norm = String(text).replace(/\r\n?/g, '\n').trim();
  if (!norm) return [];
  var out = [];
  // Strategy 1: explicit team markers `=== [name] ===` (pokepaste convention).
  //   Pokepaste and Showdown's "Export all teams" output wrap the team name
  //   in square brackets; accept both bracketed and bare forms.
  var markerRe = /^===\s*(?:\[([^\]\n]+)\]|([^=\n]+?))\s*===\s*$/gm;
  var markers = [];
  var m;
  while ((m = markerRe.exec(norm)) !== null) {
    markers.push({ idx: m.index, end: markerRe.lastIndex, name: ((m[1] || m[2] || '')).trim() });
  }
  if (markers.length > 0) {
    for (var i = 0; i < markers.length; i++) {
      var start = markers[i].end;
      var stop  = (i + 1 < markers.length) ? markers[i + 1].idx : norm.length;
      var block = norm.slice(start, stop).trim();
      if (!block) continue;
      var members = parseShowdownPaste(block);
      if (members.length === 0) continue;
      out.push({ name: markers[i].name || (members[0] ? members[0].name + "'s Team" : 'Imported Team'), members: members });
    }
    if (out.length > 0) return out;
  }
  // Strategy 2: no markers -> split on 2+ blank lines between teams.
  //   Single blank lines separate mons WITHIN a team, so a run of >=2 blank
  //   lines is the team boundary. This matches how users manually glue pastes.
  var chunks = norm.split(/\n\s*\n\s*\n+/);
  if (chunks.length > 1) {
    for (var j = 0; j < chunks.length; j++) {
      var ch = chunks[j].trim();
      if (!ch) continue;
      var mems = parseShowdownPaste(ch);
      if (mems.length === 0) continue;
      out.push({ name: (mems[0] ? mems[0].name + "'s Team" : 'Imported Team'), members: mems });
    }
    if (out.length > 0) return out;
  }
  // Fallback: treat the whole blob as one team.
  var single = parseShowdownPaste(norm);
  if (single.length > 0) out.push({ name: (single[0] ? single[0].name + "'s Team" : 'Imported Team'), members: single });
  return out;
}

function _uniqueCustomKey(baseName) {
  // Generate a collision-free custom_<ts>_<n> key even when many teams are
  // imported in the same millisecond. baseName is purely informational.
  var root = 'custom_' + Date.now();
  if (!TEAMS[root]) return root;
  var n = 1;
  while (TEAMS[root + '_' + n]) n++;
  return root + '_' + n;
}

function _uniqueTeamName(wanted) {
  // Append "(2)", "(3)" etc. if a team with this name already exists. Case
  // sensitive; duplicates are user-facing so we leave capitalization alone.
  var existing = {};
  for (var k in TEAMS) if (TEAMS[k] && TEAMS[k].name) existing[TEAMS[k].name] = 1;
  if (!existing[wanted]) return wanted;
  var n = 2;
  while (existing[wanted + ' (' + n + ')']) n++;
  return wanted + ' (' + n + ')';
}

function importCustomTeamsBulk(teams /* [{name, members}] */) {
  // Returns { added, skipped, keys:[...] }
  var added = 0, skipped = 0, keys = [];
  if (!Array.isArray(teams)) return { added: 0, skipped: 0, keys: [] };
  for (var i = 0; i < teams.length; i++) {
    var t = teams[i];
    if (!t || !Array.isArray(t.members) || t.members.length === 0) { skipped++; continue; }
    var key = _uniqueCustomKey(t.name);
    var name = _uniqueTeamName(t.name || 'Imported Team');
    TEAMS[key] = {
      name: name,
      label: 'CUSTOM',
      style: 'custom',
      description: 'Imported via bulk file',
      members: t.members,
      source: 'custom',
      format: 'champions',
      legality_status: 'unverified',
      created_at: new Date().toISOString()
    };
    added++;
    keys.push(key);
  }
  if (added > 0 && typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
  return { added: added, skipped: skipped, keys: keys };
}

function importFromJsonText(jsonText) {
  // Restores the T9f schema { version:1, saved_at, teams:{ key: teamObj } }.
  // Unknown versions are rejected so we do not silently mis-import future schemas.
  var parsed;
  try { parsed = JSON.parse(jsonText); }
  catch (e) { throw new Error('Invalid JSON: ' + e.message); }
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON must be an object');
  if (parsed.version !== CUSTOM_TEAMS_SCHEMA_VERSION) {
    throw new Error('Unsupported schema version ' + parsed.version + ' (expected ' + CUSTOM_TEAMS_SCHEMA_VERSION + ')');
  }
  if (!parsed.teams || typeof parsed.teams !== 'object') throw new Error('Missing teams object');
  var asArr = [];
  for (var k in parsed.teams) {
    var t = parsed.teams[k];
    if (t && Array.isArray(t.members) && t.members.length > 0) {
      asArr.push({ name: t.name || k, members: t.members });
    }
  }
  return importCustomTeamsBulk(asArr);
}

function exportAllCustomAsJson() {
  var out = { version: CUSTOM_TEAMS_SCHEMA_VERSION, saved_at: new Date().toISOString(), teams: {} };
  for (var k in TEAMS) {
    if (TEAMS[k] && TEAMS[k].source === 'custom') out.teams[k] = TEAMS[k];
  }
  return JSON.stringify(out, null, 2);
}

function exportAllCustomAsShowdown() {
  // Multi-team pokepaste using `=== [Name] ===` markers between teams.
  // Two trailing blank lines separate teams so the result re-parses cleanly
  // via either strategy in parseMultiTeamShowdown.
  var parts = [];
  for (var k in TEAMS) {
    if (TEAMS[k] && TEAMS[k].source === 'custom') {
      parts.push('=== [' + (TEAMS[k].name || k) + '] ===');
      parts.push(exportTeamToPaste(TEAMS[k]));
      parts.push('');
    }
  }
  return parts.join('\n').trim() + '\n';
}

function _downloadBlob(filename, mime, text) {
  try {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  } catch (e) { console.warn('[T9j.11] download failed:', e); alert('Could not download file: ' + e.message); }
}

document.getElementById('bulk-export-json-btn')?.addEventListener('click', function(){
  var customCount = countTeamsByFilter('custom');
  if (customCount === 0) { alert('No custom teams to export. Import a team first.'); return; }
  var ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  _downloadBlob('champions-sim-custom-teams-' + ts + '.json', 'application/json', exportAllCustomAsJson());
});
document.getElementById('bulk-export-showdown-btn')?.addEventListener('click', function(){
  var customCount = countTeamsByFilter('custom');
  if (customCount === 0) { alert('No custom teams to export. Import a team first.'); return; }
  var ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  _downloadBlob('champions-sim-custom-teams-' + ts + '.txt', 'text/plain', exportAllCustomAsShowdown());
});
document.getElementById('bulk-import-btn')?.addEventListener('click', function(){
  var picker = document.getElementById('bulk-import-file');
  if (picker) { picker.value = ''; picker.click(); }
});
document.getElementById('bulk-import-file')?.addEventListener('change', function(ev){
  var file = ev.target.files && ev.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onerror = function(){ alert('Could not read file'); };
  reader.onload = function(){
    var text = String(reader.result || '');
    var looksJson = /\.json$/i.test(file.name) || /^\s*\{/.test(text);
    var result;
    try {
      if (looksJson) {
        result = importFromJsonText(text);
      } else {
        var teams = parseMultiTeamShowdown(text);
        if (teams.length === 0) throw new Error('No teams parsed from file');
        result = importCustomTeamsBulk(teams);
      }
    } catch (e) {
      alert('Import failed: ' + e.message);
      return;
    }
    if (typeof rebuildTeamSelects === 'function') rebuildTeamSelects();
    renderTeamsGrid();
    var msg = 'Imported ' + result.added + ' team' + (result.added === 1 ? '' : 's');
    if (result.skipped > 0) msg += ' (' + result.skipped + ' skipped)';
    alert(msg + '.');
  };
  reader.readAsText(file);
});


// ============================================================
// EDITOR TAB
// ============================================================
let editingIdx = null;

function renderEditorRoster() {
  const el = document.getElementById('editor-roster');
  if (!el) return;
  el.innerHTML = '';
  TEAMS.player.members.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'editor-poke-btn';
    btn.innerHTML = `<img class="editor-poke-sprite" src="${getSpriteUrl(m.name)}" alt="${m.name}" onerror="this.style.opacity='.3'"/><span>${m.name}</span>`;
    btn.addEventListener('click', () => { document.querySelectorAll('.editor-poke-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); openEditorForm(i); });
    el.appendChild(btn);
  });
}

function openEditorForm(idx) {
  editingIdx = idx;
  const m = TEAMS.player.members[idx];
  const form = document.getElementById('editor-form');
  const evsHtml = ['hp','atk','def','spa','spd','spe'].map(s=>`
    <div class="form-group">
      <label class="form-label">${s.toUpperCase()}</label>
      <input class="form-input" id="ev-${s}" value="${m.evs?.[s]||0}" type="number" min="0" max="252"/>
    </div>`).join('');
  form.innerHTML = `
    <div class="editor-poke-name">${m.name}</div>
    <div class="editor-2col">
      <div class="form-group"><label class="form-label">Item</label><input class="form-input" id="ed-item" value="${m.item||''}"/></div>
      <div class="form-group"><label class="form-label">Ability</label><input class="form-input" id="ed-ability" value="${m.ability||''}"/></div>
      <div class="form-group"><label class="form-label">Nature</label><input class="form-input" id="ed-nature" value="${m.nature||'Hardy'}"/></div>
      <div class="form-group"><label class="form-label">Role</label><input class="form-input" id="ed-role" value="${m.role||''}"/></div>
    </div>
    <div style="margin-top:var(--sp4)"><label class="form-label" style="display:block;margin-bottom:6px">Moves</label>
    <div class="moves-2col">${(m.moves||[]).map((mv,i)=>`<input class="form-input" id="ed-mv-${i}" value="${mv}"/>`).join('')}</div></div>
    <div style="margin-top:var(--sp4)"><label class="form-label" style="display:block;margin-bottom:6px">EVs (max 510 total)</label>
    <div class="ev-6col">${evsHtml}</div></div>
    <div style="display:flex;gap:var(--sp3);margin-top:var(--sp4)">
      <button class="btn-save" id="save-edits">Save Changes</button>
      <button class="btn-secondary" style="font-size:11px" id="export-this-mon" title="Export full team">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Export Team
      </button>
    </div>
    <p style="font-size:10px;color:var(--text-m);margin-top:6px">Changes apply to all future simulations immediately.</p>`;
  document.getElementById('save-edits').addEventListener('click', saveEdits);
  document.getElementById('export-this-mon').addEventListener('click', () => openExportModal(currentPlayerKey));
}

function saveEdits() {
  if (editingIdx === null) return;
  const m = TEAMS.player.members[editingIdx];
  m.item = document.getElementById('ed-item').value.trim();
  m.ability = document.getElementById('ed-ability').value.trim();
  m.nature = document.getElementById('ed-nature').value.trim();
  m.role = document.getElementById('ed-role').value.trim();
  m.moves = [0,1,2,3].map(i => (document.getElementById(`ed-mv-${i}`)?.value||'').trim()).filter(Boolean);
  ['hp','atk','def','spa','spd','spe'].forEach(s => { if (!m.evs) m.evs={}; m.evs[s]=parseInt(document.getElementById(`ev-${s}`)?.value)||0; });
  renderRoster('player-roster', TEAMS.player.members);
  renderTeamsGrid();
  const btn = document.getElementById('save-edits');
  const orig = btn.textContent;
  btn.textContent = '✓ Saved!'; btn.style.background='var(--green)';
  setTimeout(()=>{ btn.textContent=orig; btn.style.background=''; }, 1500);
  // Update coverage widget when player team changes
  if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
}

renderEditorRoster();

document.getElementById('export-team-editor')?.addEventListener('click', ()=>openExportModal(currentPlayerKey));
document.getElementById('import-team-editor')?.addEventListener('click', ()=>{ openImportModal(); var imp=document.getElementById('import-slot'); if(imp) imp.value=currentPlayerKey; });

// ============================================================
// EXPORT MODAL
// ============================================================
function openExportModal(teamKey) {
  const team = TEAMS[teamKey];
  if (!team) return;
  const paste = exportTeamToPaste(team);
  document.getElementById('export-text').value = paste;
  document.getElementById('export-modal').style.display = 'flex';
}
document.getElementById('close-export')?.addEventListener('click', ()=>{ document.getElementById('export-modal').style.display='none'; });
document.getElementById('copy-export-btn')?.addEventListener('click', function() {
  const ta = document.getElementById('export-text');
  const btn = this;
  const origHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy to Clipboard';
  function showCopied() {
    btn.textContent = '✓ Copied!'; btn.style.background = 'var(--green)';
    setTimeout(()=>{ btn.innerHTML = origHTML; btn.style.background = ''; }, 1800);
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(ta.value).then(showCopied).catch(()=>{
      ta.select(); ta.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); showCopied(); } catch(e) {}
    });
  } else {
    ta.select(); ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); showCopied(); } catch(e) {}
  }
});
document.getElementById('export-player-btn')?.addEventListener('click', ()=>openExportModal(currentPlayerKey));
document.getElementById('export-opp-btn')?.addEventListener('click', ()=>{ const oppKey = document.getElementById('opponent-select').value; openExportModal(oppKey); });

// ============================================================
// IMPORT MODAL
// ============================================================
function openImportModal() {
  document.getElementById('import-modal').style.display = 'flex';
  document.getElementById('showdown-paste').value = '';
  document.getElementById('paste-url-input').value = '';
  document.getElementById('import-status').textContent = '';
  document.getElementById('import-preview').style.display = 'none';
  // T9h: reset modal title + hint to defaults (openEditTeamModal may have changed them)
  var hdr = document.querySelector('#import-modal .modal-title');
  if (hdr) hdr.textContent = 'Import Team from Showdown Paste';
  var hint = document.querySelector('#import-modal .modal-hint');
  if (hint) hint.innerHTML = 'Paste Showdown-format text directly from <strong>PS! Teambuilder \u2192 Export</strong> or from a pokepast.es page. All 6 Pok\u00e9mon will be parsed automatically.';
}
function closeImportModal() { document.getElementById('import-modal').style.display = 'none'; }

// ============================================================
// T9h: Edit any team (preloaded, opponent-added, or custom)
// Reuses the import modal pre-populated with the team's current Showdown paste.
// Saving writes: custom -> localStorage custom; preloaded -> localStorage override.
// ============================================================
function openEditTeamModal(teamKey) {
  var team = TEAMS[teamKey];
  if (!team) return;
  // Ensure the import-slot <select> has an option for this key (preloaded keys
  // may or may not be listed; custom keys are added dynamically on import).
  var importSlot = document.getElementById('import-slot');
  if (importSlot) {
    var has = false;
    for (var i = 0; i < importSlot.options.length; i++) {
      if (importSlot.options[i].value === teamKey) { has = true; break; }
    }
    if (!has) {
      var opt = document.createElement('option');
      opt.value = teamKey;
      opt.textContent = team.name;
      importSlot.appendChild(opt);
    }
    importSlot.value = teamKey;
  }
  // Pre-populate paste from current members
  var paste = '';
  try { paste = exportTeamToPaste(team); } catch (e) { paste = ''; }
  openImportModal();
  var ta = document.getElementById('showdown-paste');
  if (ta) {
    ta.value = paste;
    // Trigger live preview
    ta.dispatchEvent(new Event('input'));
  }
  // Switch to the "Paste Text" tab
  var pasteTab = document.querySelector('.import-tab[data-itab="paste"]');
  if (pasteTab) pasteTab.click();
  // Update modal title so user knows they're editing
  var hdr = document.querySelector('#import-modal .modal-title');
  if (hdr) hdr.textContent = 'Edit Team: ' + team.name;
  var hint = document.querySelector('#import-modal .modal-hint');
  if (hint) {
    hint.innerHTML = 'Editing <strong>' + team.name + '</strong>. Modify the Showdown paste below, then click Load Team. ' +
      (team.source === 'custom' ? 'Custom team — saved to localStorage.' :
       'Preloaded team — your edits save as an override; use Reset to revert to the original.');
  }
}

async function resetPreloadedTeam(teamKey) {
  var team = TEAMS[teamKey];
  if (!team) return;
  if (team.source === 'custom') return; // wrong button
  var ok = await asyncConfirm('Reset team',
    'Revert "' + team.name + '" to the original preloaded version?\n\nYour custom edits to this team will be lost.',
    'Reset');
  if (!ok) return;
  clearPreloadedOverride(teamKey);
  // Reload page so original BASE data is restored cleanly from data.js
  // (simpler and safer than trying to re-fetch in-memory defaults).
  location.reload();
}

document.getElementById('close-import')?.addEventListener('click', closeImportModal);
document.getElementById('close-import-2')?.addEventListener('click', closeImportModal);
document.getElementById('open-import-modal')?.addEventListener('click', openImportModal);

// Import tabs
document.querySelectorAll('.import-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.import-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('itab-paste').style.display = tab.dataset.itab==='paste' ? '' : 'none';
    document.getElementById('itab-url').style.display = tab.dataset.itab==='url' ? '' : 'none';
  });
});

// Live paste parse preview
document.getElementById('showdown-paste')?.addEventListener('input', function() {
  const parsed = parseShowdownPaste(this.value);
  if (parsed.length > 0) showImportPreview(parsed);
  else document.getElementById('import-preview').style.display = 'none';
});

function showImportPreview(members) {
  const preview = document.getElementById('import-preview');
  const roster = document.getElementById('preview-roster');
  roster.innerHTML = members.map(m => `
    <div class="preview-row">
      <img class="preview-sprite" src="${getSpriteUrl(m.name)}" alt="${m.name}" onerror="this.style.opacity='.3'"/>
      <span class="preview-name">${m.name}</span>
      <span class="preview-item">${m.item||'No item'} · ${m.ability||'?'}</span>
    </div>`).join('');
  preview.style.display = '';
}

// Do import
document.getElementById('do-import-btn')?.addEventListener('click', async function() {
  const slot = document.getElementById('import-slot').value;
  const activeTab = document.querySelector('.import-tab.active')?.dataset.itab;
  const statusEl = document.getElementById('import-status');
  statusEl.className = 'modal-status';

  let pasteText = '';

  if (activeTab === 'url') {
    const url = document.getElementById('paste-url-input').value.trim();
    if (!url) { statusEl.textContent = 'Enter a pokepast.es URL'; statusEl.className='modal-status err'; return; }
    const match = url.match(/pokepast\.es\/([a-f0-9]+)/i);
    if (!match) { statusEl.textContent = 'Invalid pokepast.es URL format'; statusEl.className='modal-status err'; return; }
    statusEl.textContent = 'Fetching paste…';
    try {
      const resp = await fetch(`https://pokepast.es/${match[1]}/raw`);
      if (!resp.ok) throw new Error('Fetch failed');
      pasteText = await resp.text();
    } catch(e) {
      statusEl.textContent = `Could not fetch directly (CORS). Copy the paste text from pokepast.es and use the "Paste Text" tab instead.`;
      statusEl.className = 'modal-status err';
      return;
    }
  } else {
    pasteText = document.getElementById('showdown-paste').value.trim();
  }

  if (!pasteText) { statusEl.textContent = 'No paste text found'; statusEl.className='modal-status err'; return; }

  const members = parseShowdownPaste(pasteText);
  if (members.length === 0) { statusEl.textContent = 'Could not parse any Pokémon from this paste'; statusEl.className='modal-status err'; return; }

  let targetSlot = slot;
  let teamName = '';

  if (slot === '__new__') {
    const newKey = 'custom_' + Date.now();
    const guessedName = members[0] ? `${members[0].name}'s Team` : 'Imported Team';
    TEAMS[newKey] = {
      name: guessedName,
      label: 'CUSTOM',
      style: 'custom',
      description: 'Imported via Showdown paste',
      members: members,
      // T9f: persistence + legality flags
      source: 'custom',
      format: 'champions',
      legality_status: 'unverified',
      created_at: new Date().toISOString()
    };
    // T9f: persist to localStorage immediately
    if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
    targetSlot = newKey;
    teamName = guessedName;
    // T9d: rebuild both player + opponent dropdowns so the new team is
    // pickable from either side.
    if (typeof rebuildTeamSelects === 'function') rebuildTeamSelects();
    const importSlot = document.getElementById('import-slot');
    if (importSlot) {
      const opt = document.createElement('option');
      opt.value = newKey;
      opt.textContent = guessedName;
      importSlot.appendChild(opt);
    }
  } else {
    const teamKeys = Object.keys(TEAMS);
    if (!teamKeys.includes(slot)) { statusEl.textContent = 'Unknown slot'; statusEl.className='modal-status err'; return; }
    TEAMS[slot].members = members;
    targetSlot = slot;
    teamName = TEAMS[slot].name;
    // T9h: persist edits appropriately by team source
    if (TEAMS[slot].source === 'custom') {
      if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
    } else if (typeof savePreloadedOverride === 'function') {
      savePreloadedOverride(slot); // preloaded override survives reload
    }
    if (slot === currentPlayerKey) {
      renderRoster('player-roster', TEAMS[currentPlayerKey].members);
      renderEditorRoster();
      // T9j.3b: imported team replacing active slot must refresh coverage.
      if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
    }
    const oppSel = document.getElementById('opponent-select');
    if (oppSel && oppSel.value === slot) renderRoster('opp-roster', TEAMS[slot].members);
  }

  renderTeamsGrid();

  statusEl.textContent = `✓ Loaded ${members.length} Pokémon into ${teamName}`;
  statusEl.className = 'modal-status ok';
  const previewLabel = document.getElementById('import-preview-label');
  if (previewLabel) previewLabel.textContent = `Preview (${members.length} Pok\u00e9mon parsed)`;
  showImportPreview(members);
  setTimeout(closeImportModal, 1400);
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display='none'; });
});

// ============================================================
// CHART HELPERS
// ============================================================
function drawBarChart(canvasId, labels, values, color) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  if (!cv._dprSet) {
    const w = cv.width, h = cv.height;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv._dprSet = true;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cv.clientWidth || (cv.width/dpr), H = cv.clientHeight || (cv.height/dpr);
  const max = Math.max(...values, 1);
  const padL = 30, padB = 24, padT = 10, padR = 8;
  const bW = Math.max(3, (W-padL-padR)/labels.length - 2);
  const isDark = document.documentElement.dataset.theme !== 'light';
  const tc = isDark ? '#6b6f85' : '#9298b0';
  const gc = isDark ? '#272a3a' : '#dde0ef';
  ctx.clearRect(0,0,W,H);
  for (let i=0;i<=4;i++) {
    const y = H-padB-((i/4)*(H-padB-padT));
    ctx.strokeStyle=gc; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillStyle=tc; ctx.font=`9px JetBrains Mono,monospace`; ctx.textAlign='right';
    ctx.fillText(Math.round((i/4)*max), padL-3, y+3);
  }
  for (let i=0;i<labels.length;i++) {
    const x = padL + i*(bW+2);
    const bH = (values[i]/max)*(H-padB-padT);
    const y = H-padB-bH;
    ctx.fillStyle = color||'#7c6af5';
    ctx.globalAlpha = 0.85;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,bW,bH,[3,3,0,0]); ctx.fill(); }
    else { ctx.fillRect(x,y,bW,bH); }
    ctx.globalAlpha = 1;
    if (labels.length <= 14) {
      ctx.fillStyle=tc; ctx.font='8px JetBrains Mono,monospace'; ctx.textAlign='center';
      ctx.fillText(labels[i], x+bW/2, H-6);
    }
  }
}

// ============================================================
// RESULTS DISPLAY
// ============================================================
function displayResults(res, oppKey) {
  const total = res.wins + res.losses + res.draws;
  const winPct = Math.round(res.winRate * 100);
  const team = TEAMS[oppKey];
  const boLabel = `Bo${currentBo}`;
  const fmtLabel = currentFormat === 'doubles' ? 'Doubles' : 'Singles';

  document.getElementById('results-section').style.display='';
  document.getElementById('results-title').textContent = `vs ${team?.name||oppKey}`;
  document.getElementById('results-sub').textContent = `${total} series · ${boLabel} · ${fmtLabel} · ${new Date().toLocaleTimeString()}`;
  document.getElementById('win-pct').textContent = `${winPct}%`;
  document.getElementById('stat-wins').textContent = res.wins;
  document.getElementById('stat-losses').textContent = res.losses;
  document.getElementById('stat-draws').textContent = res.draws;
  document.getElementById('stat-turns').textContent = res.avgTurns.toFixed(1);
  document.getElementById('stat-tr-turns').textContent = res.avgTrTurns.toFixed(1);
  // T9j.3 (#38, #39)
  const twEl = document.getElementById('stat-tw-turns');
  if (twEl) twEl.textContent = (res.avgTwTurns || 0).toFixed(1);
  const tdEl = document.getElementById('stat-timer-draws');
  if (tdEl) tdEl.textContent = res.timerDraws || 0;
  document.getElementById('stat-format').textContent = `${fmtLabel} ${boLabel}`;

  const circle = document.getElementById('win-circle');
  circle.className = `win-circle ${winPct>=55?'s-win':winPct<=45?'s-loss':'s-even'}`;

  // Win conditions
  const wc = document.getElementById('win-conditions');
  wc.innerHTML = '';
  const wcEntries = Object.entries(res.winConditions||{}).sort((a,b)=>b[1]-a[1]).slice(0,7);
  if (!wcEntries.length || !res.wins) { wc.innerHTML='<p style="color:var(--text-m);font-size:11px">No wins recorded</p>'; }
  else {
    const maxWC = wcEntries[0][1];
    for (const [cond,cnt] of wcEntries) {
      const barPct = Math.round(cnt/maxWC*100);
      const labelPct = Math.min(100, Math.round(cnt/total*100));
      const d = document.createElement('div');
      d.className='win-cond-row';
      d.innerHTML=`<div style="display:flex;justify-content:space-between"><span>${cond}</span><span style="color:var(--primary);font-family:var(--font-mono);font-weight:700">${labelPct}%</span></div><div class="win-cond-bar" style="width:${barPct}%"></div>`;
      wc.appendChild(d);
    }
  }

  const isDark = document.documentElement.dataset.theme!=='light';
  const gn=isDark?'#4ec994':'#2a9d6a', rd=isDark?'#f05464':'#d63048', gd=isDark?'#f5c542':'#c89a00';
  const pri=isDark?'#7c6af5':'#5b49d6';

  setTimeout(()=>{
    const cv = document.getElementById('ko-chart');
    if (!cv) return;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    const data=[res.wins,res.losses,res.draws], colors=[gn,rd,gd], labels=['Wins','Losses','Draws'];
    const bW=54,gap=18,sx=(cv.width-(3*bW+2*gap))/2;
    for (let i=0;i<3;i++) {
      const x=sx+i*(bW+gap);
      const h=(data[i]/total)*(cv.height-44);
      const y=cv.height-22-h;
      ctx.fillStyle=colors[i]+'22'; ctx.strokeStyle=colors[i]; ctx.lineWidth=2;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,bW,h,[4,4,0,0]);ctx.fill();ctx.stroke();}
      else{ctx.fillRect(x,y,bW,h);}
      ctx.fillStyle=colors[i]; ctx.font='bold 11px JetBrains Mono,monospace'; ctx.textAlign='center';
      ctx.fillText(`${Math.round(data[i]/total*100)}%`,x+bW/2,y-5);
      const tc=isDark?'#6b6f85':'#9298b0';
      ctx.fillStyle=tc; ctx.font='9px JetBrains Mono,monospace';
      ctx.fillText(labels[i],x+bW/2,cv.height-5);
    }
  },60);

  setTimeout(()=>{
    const td=res.turnDist||{};
    const turns=Object.keys(td).map(Number).sort((a,b)=>a-b);
    drawBarChart('turns-chart', turns.map(String), turns.map(t=>td[t]), pri);
  },60);

  addReplays(res.allLogs||[], oppKey);

  // Auto-show inline pilot card after every single sim
  showInlinePilotCard(oppKey, res);
}

// ============================================================
// INLINE PILOT CARD — shown after every single sim run
// ============================================================
function showInlinePilotCard(oppKey, res) {
  // Find or create the inline pilot container in the results section
  let container = document.getElementById('inline-pilot-card');
  if (!container) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;
    container = document.createElement('div');
    container.id = 'inline-pilot-card';
    container.style.cssText = 'margin-top:var(--sp5,20px);';
    resultsSection.appendChild(container);
  }

  const total = res.wins + res.losses + res.draws;
  const winPct = Math.round(res.winRate * 100);
  const oppTeam = TEAMS[oppKey];
  const teamName = oppTeam ? oppTeam.name : oppKey;

  let verdict, verdictClass;
  if (winPct >= 65) { verdict = 'Favorable'; verdictClass = 'verdict-favorable'; }
  else if (winPct >= 45) { verdict = 'Even'; verdictClass = 'verdict-even'; }
  else if (winPct >= 30) { verdict = 'Risky'; verdictClass = 'verdict-risky'; }
  else { verdict = 'Avoid'; verdictClass = 'verdict-avoid'; }

  const wcEntries = Object.entries(res.winConditions || {}).sort((a,b) => b[1]-a[1]).slice(0,2);

  // T9j.10 (Refs #16) — Top leads from STRUCTURED battle.leads (post-override team ordering).
  // Old behavior parsed log strings which falsely named fainted or targeted Pokemon as leads.
  const leadCounts = {};
  const winLogs = (res.allLogs || []).filter(g => g.result === 'win');
  for (const game of winLogs) {
    const names = (game.leads && Array.isArray(game.leads.player)) ? game.leads.player : [];
    for (const n of names) leadCounts[n] = (leadCounts[n]||0)+1;
  }
  const leads = Object.entries(leadCounts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);

  const tips = [];
  if (leads.length >= 2) tips.push(`Lead ${leads[0]} + ${leads[1]}`);
  if (wcEntries.length) tips.push(`Win condition: ${wcEntries[0][0]} (${Math.round(wcEntries[0][1]/total*100)}%)`);
  if (winPct < 45) tips.push('Use speed control to disrupt their gameplan');

  container.innerHTML = `
    <div class="pilot-card" style="border:1px solid var(--border,#333);border-radius:8px;padding:14px;background:var(--surface,#1c1b19)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:13px">📋 Pilot Notes vs ${teamName}</span>
        <span class="pilot-verdict ${verdictClass}" style="font-size:11px;padding:3px 8px;border-radius:4px">${verdict} · ${winPct}%</span>
      </div>
      ${tips.length ? `<div style="font-size:11px;color:var(--text-m,#888);line-height:1.7">${tips.map(t=>`• ${t}`).join('<br>')}</div>` : ''}
    </div>`;
}

// ============================================================
// REPLAY LOG
// ============================================================
let allReplays = [];
let replayFilter = 'all';

function addReplays(logs, oppKey) {
  for (const b of logs) allReplays.unshift({...b, oppKey, id:Math.random()});
  renderReplays();
}

function renderReplays() {
  const el = document.getElementById('replay-list');
  if (!el) return;
  const filtered = allReplays.filter(r => {
    if (replayFilter==='all') return true;
    if (replayFilter==='win') return r.result==='win';
    if (replayFilter==='loss') return r.result==='loss';
    if (replayFilter==='clutch') return r.turns>=8||(r.result==='win'&&r.trTurns>0);
    return true;
  }).slice(0,60);

  el.innerHTML='';
  if (!filtered.length) { el.innerHTML='<div class="replay-empty">No replays match this filter.</div>'; return; }

  for (const r of filtered) {
    const rc=r.result==='win'?'var(--green)':r.result==='loss'?'var(--red)':'var(--gold)';
    const rl=r.result==='win'?'WIN':r.result==='loss'?'LOSS':'DRAW';
    const kos=(r.log||[]).filter(l=>l.includes('fainted')).length;
    const trSet=(r.log||[]).some(l=>l.includes('Trick Room'));
    const trBroken=(r.log||[]).some(l=>l.includes('NORMAL'));
    const tw=(r.log||[]).some(l=>l.includes('Tailwind'));
    const card=document.createElement('div');
    card.className='replay-card';
    card.innerHTML=`
      <div class="replay-card-hdr">
        <div class="replay-title"><span style="color:${rc};font-weight:900">${rl}</span> vs ${TEAMS[r.oppKey]?.name||r.oppKey}</div>
        <div class="replay-meta">${r.turns} turns · TR:${r.trTurns} · ${r.winCondition||'—'}</div>
      </div>
      <div class="replay-chips">
        ${r.result==='win'?'<span class="rchip win">WIN</span>':''}
        ${kos?`<span class="rchip ko">${kos} KO${kos>1?'s':''}</span>`:''}
        ${trSet?'<span class="rchip tr">TR SET</span>':''}
        ${trBroken?'<span class="rchip tr">TR BROKEN</span>':''}
        ${tw?'<span class="rchip tw">TAILWIND</span>':''}
        <span class="rchip">${r.turns} turns</span>
      </div>
      <div class="replay-expanded">
        <div class="battle-log">${(r.log||[]).join('<br>')}</div>
      </div>`;
    card.addEventListener('click', ()=>card.classList.toggle('open'));
    el.appendChild(card);
  }
}

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); replayFilter=btn.dataset.filter;
    if (typeof replayMode !== 'undefined' && replayMode === 'summary') renderSeriesSummary();
    else renderReplays();
  });
});

// ============================================================
// GLOBAL SIMULATION RESULTS STORE
// ============================================================
window.lastSimResults = {};

// ============================================================
// BO SERIES RUNNER
// ============================================================
// T9j.10 (Refs #16) — Team Preview bring-N-of-6 state.
// Keyed by team slot (e.g. 'player', 'mega_altaria'). Value is an ordered
// array of Pokemon names of length BRING_COUNT. Slot 1-2 (or 1 in singles)
// are leads; remaining slots are bench. Picked via slot-layout UI in
// renderTeamsGrid and forwarded into simulateBattle() via opts.playerBring
// / opts.opponentBring. Unset keys fall back to team.members[0..bring-1].
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
//   Cite: https://bulbapedia.bulbagarden.net/wiki/VGC
var BRING_SELECTION = {};
// BRING_MODE[teamKey] = 'manual' | 'random'. Defaults to 'manual' for the
// player slot and 'random' for every other team (opponents reroll per series).
var BRING_MODE = {};
// localStorage persistence keyed by teamKey + format so each format keeps its
// own bring order. Saved on every setBringFor / setBringMode mutation.
const _BRING_LS_KEY = 'poke-sim:bring:v1';
function _loadBringState() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(_BRING_LS_KEY) : null;
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      if (obj.selection && typeof obj.selection === 'object') BRING_SELECTION = obj.selection;
      if (obj.mode      && typeof obj.mode      === 'object') BRING_MODE      = obj.mode;
    }
  } catch (e) { /* corrupt storage — ignore */ }
}
function _saveBringState() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(_BRING_LS_KEY, JSON.stringify({ selection: BRING_SELECTION, mode: BRING_MODE }));
  } catch (e) { /* quota / private mode — ignore */ }
}
_loadBringState();

function getBringCount() {
  return (currentFormat === 'singles') ? 3 : 4;
}
function getLeadCount() {
  return (currentFormat === 'singles') ? 1 : 2;
}
function getBringMode(teamKey) {
  // Guard for early-load invocations (renderTeamsGrid fires before the var
  // initializer for BRING_MODE runs; var hoists declaration but leaves undefined).
  if (typeof BRING_MODE !== 'undefined' && BRING_MODE && BRING_MODE[teamKey]) return BRING_MODE[teamKey];
  // Default: player slot is manual, every other team is random.
  return (teamKey === currentPlayerKey) ? 'manual' : 'random';
}
function setBringMode(teamKey, mode) {
  BRING_MODE[teamKey] = (mode === 'random') ? 'random' : 'manual';
  _saveBringState();
}
function getBringFor(teamKey) {
  const team = TEAMS[teamKey];
  if (!team) return [];
  const count = getBringCount();
  // Guard for early-load (var hoisted, initializer not yet run).
  const picked = (typeof BRING_SELECTION !== 'undefined' && BRING_SELECTION && BRING_SELECTION[teamKey]) ? BRING_SELECTION[teamKey] : [];
  // Keep only names that still exist on the team (handles edits / resets).
  const valid  = picked.filter(n => team.members.some(m => m.name === n));
  const filled = valid.slice(0, count);
  // Fill missing slots from team order, skipping already-picked names.
  for (const m of team.members) {
    if (filled.length >= count) break;
    if (!filled.includes(m.name)) filled.push(m.name);
  }
  return filled;
}
function setBringFor(teamKey, names) {
  const arr = Array.isArray(names) ? names.slice(0, getBringCount()) : [];
  BRING_SELECTION[teamKey] = arr;
  _saveBringState();
}
// Random pick helper — deterministic given optional seed, otherwise Math.random.
// Always returns exactly bringCount unique members from team.members.
function randomBringFor(teamKey, seed) {
  const team = TEAMS[teamKey];
  if (!team) return [];
  const count = Math.min(getBringCount(), team.members.length);
  // Fisher-Yates on a copy. Seed optional for reproducible tests.
  const pool = team.members.map(m => m.name);
  let rnd = (typeof seed === 'number')
    ? (function(){ let s = seed >>> 0; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; }; })()
    : Math.random;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool.slice(0, count);
}
// Legacy shims — kept in case external callers / saved sessions still reference
// the pre-T9j.10 lead-only API. Map onto the bring picker (leads = first N).
function getLeadsFor(teamKey) {
  return getBringFor(teamKey).slice(0, getLeadCount());
}
function setLeadsFor(teamKey, leads) {
  const cur = getBringFor(teamKey).slice();
  const cap = getLeadCount();
  const next = Array.isArray(leads) ? leads.slice(0, cap) : [];
  // Replace slots 0..cap-1, keep bench slots cap.. unchanged (or fill from team).
  const merged = next.slice();
  for (const n of cur) {
    if (merged.length >= getBringCount()) break;
    if (!merged.includes(n)) merged.push(n);
  }
  setBringFor(teamKey, merged);
}
window.BRING_SELECTION = BRING_SELECTION;
window.BRING_MODE      = BRING_MODE;
window.getBringFor     = getBringFor;
window.setBringFor     = setBringFor;
window.getBringMode    = getBringMode;
window.setBringMode    = setBringMode;
window.randomBringFor  = randomBringFor;
window.getLeadsFor     = getLeadsFor;
window.setLeadsFor     = setLeadsFor;

async function runBoSeries(numSeries, playerTeamKey, oppTeamKey, bo, onProgress) {
  const results = { wins:0, losses:0, draws:0, totalTurns:0, totalTrTurns:0, winConditions:{}, allLogs:[], turnDist:{} };
  let liveW=0, liveL=0;
  const BATCH = 20;
  // T9j.10 — resolve bring picks. Manual mode: resolve ONCE per series (locked).
  // Random mode: reroll each series so the matrix explores every 4-of-6 over
  // a long Bo run but individual games within a series keep the same bring.
  const playerMode = getBringMode(playerTeamKey);
  const oppMode    = getBringMode(oppTeamKey);
  const manualPlayerBring = (playerMode === 'manual') ? getBringFor(playerTeamKey) : null;
  const manualOpponentBring = (oppMode === 'manual') ? getBringFor(oppTeamKey) : null;

  for (let i=0; i<numSeries; i+=BATCH) {
    const bSize = Math.min(BATCH, numSeries-i);
    for (let j=0; j<bSize; j++) {
      let seriesW=0, seriesL=0;
      const gamesNeeded = Math.ceil(bo/2);
      let gamesPlayed = 0;
      let seriesTurns=0, seriesTrTurns=0;

      // Per-series bring lock. Re-roll for random teams at each new series.
      const playerBring   = manualPlayerBring   || randomBringFor(playerTeamKey);
      const opponentBring = manualOpponentBring || randomBringFor(oppTeamKey);

      while (seriesW<gamesNeeded && seriesL<gamesNeeded && gamesPlayed<bo) {
        const battle = simulateBattle(TEAMS[playerTeamKey], TEAMS[oppTeamKey], { format: currentFormat, playerBring, opponentBring });
        if (battle.result==='win') seriesW++;
        else if (battle.result==='loss') seriesL++;
        else { seriesW+=0.5; seriesL+=0.5; }
        seriesTurns+=battle.turns;
        seriesTrTurns+=battle.trTurns;
        gamesPlayed++;
        results.turnDist[battle.turns]=(results.turnDist[battle.turns]||0)+1;
        if (battle.winCondition) results.winConditions[battle.winCondition]=(results.winConditions[battle.winCondition]||0)+1;
        if (results.allLogs.length<50) results.allLogs.push({...battle, oppKey:oppTeamKey});
      }

      const seriesResult = seriesW>seriesL?'wins':seriesW<seriesL?'losses':'draws';
      results[seriesResult]++;
      if (seriesResult==='wins') liveW++;
      if (seriesResult==='losses') liveL++;
      results.totalTurns += seriesTurns/gamesPlayed;
      results.totalTrTurns += seriesTrTurns/gamesPlayed;
    }
    if (onProgress) onProgress(i+bSize, numSeries, liveW, liveL);
    await new Promise(r=>setTimeout(r,0));
  }

  results.winRate = results.wins/numSeries;
  results.avgTurns = results.totalTurns/numSeries;
  results.avgTrTurns = results.totalTrTurns/numSeries;
  return results;
}

// runAllMatchupsUI — UI wrapper; distinct from engine.js runAllMatchups
// Issue #T6: when LADDER_MODE is ON, iterate only ladder-legal opponents.
async function runAllMatchupsUI(numSeries, bo, onProgress, onDone) {
  const opps = Object.keys(TEAMS).filter(k => {
    if (k === currentPlayerKey) return false;
    if (typeof LADDER_MODE !== 'undefined' && LADDER_MODE && typeof isLadderLegal === 'function') {
      return isLadderLegal(k);
    }
    return true;
  });
  let done=0;
  for (const opp of opps) {
    const res = await runBoSeries(numSeries,currentPlayerKey,opp,bo,(cur,tot,w,l)=>{
      if (onProgress) onProgress(done*numSeries+cur, opps.length*numSeries, w, l);
    });
    done++;
    if (onDone) onDone(opp, res);
  }
}

// ============================================================
// SIM BUTTON HANDLERS
// ============================================================
let simRunning = false;

function setProgress(pct, label, w, l) {
  document.getElementById('progress-fill').style.width=pct+'%';
  document.getElementById('progress-label').textContent=label;
  if (w!==undefined) {
    document.getElementById('live-wins').textContent=w+'W';
    document.getElementById('live-losses').textContent=l+'L';
    const total=w+l;
    document.getElementById('live-pct').textContent=total?Math.round(w/total*100)+'%':'—';
  }
}

document.getElementById('run-sim-btn')?.addEventListener('click', async function() {
  if (simRunning) return;
  simRunning=true; this.disabled=true; document.getElementById('run-all-btn').disabled=true;
  document.getElementById('results-section').style.display='none';
  document.getElementById('progress-wrap').style.display='';
  setProgress(0,'Starting…',0,0);

  const oppKey=document.getElementById('opponent-select').value;
  const n=parseInt(document.getElementById('sim-count').value);
  const bo=currentBo;
  const matBadge=document.getElementById('matrix-badge');
  if(matBadge) matBadge.textContent=`${currentFormat==='doubles'?'Doubles':'Singles'} · Bo${bo} · ${n} series`;

  const res = await runBoSeries(n,currentPlayerKey,oppKey,bo,(cur,tot,w,l)=>{
    setProgress(Math.round(cur/tot*100),`Running… ${cur} / ${tot}`,w,l);
  });

  document.getElementById('progress-wrap').style.display='none';
  displayResults(res, oppKey);
  simRunning=false; this.disabled=false; document.getElementById('run-all-btn').disabled=false;
});

document.getElementById('run-all-btn')?.addEventListener('click', async function() {
  if (simRunning) return;
  simRunning=true; this.disabled=true; document.getElementById('run-sim-btn').disabled=true;
  document.getElementById('matchup-table-wrap').style.display='';
  document.getElementById('results-section').style.display='none';
  document.getElementById('matchup-tbody').innerHTML='<tr><td colspan="7" style="color:var(--text-m);font-size:12px;text-align:center;padding:20px;font-family:var(--font-mono)">Running all matchups…</td></tr>';

  const n=parseInt(document.getElementById('sim-count').value);
  const bo=currentBo;
  document.getElementById('progress-wrap').style.display='';
  setProgress(0,'Starting…',0,0);
  const matBadge=document.getElementById('matrix-badge');
  if(matBadge) matBadge.textContent=`${currentFormat==='doubles'?'Doubles':'Singles'} · Bo${bo} · ${n} series`;

  const tbody=document.getElementById('matchup-tbody');
  tbody.innerHTML='';
  let totalW=0,totalL=0;

  await runAllMatchupsUI(n,bo,(cur,tot,w,l)=>{
    totalW=w; totalL=l;
    setProgress(Math.round(cur/tot*100),`Running matchups… ${cur} / ${tot}`,w,l);
  },(opp,res)=>{
    window.lastSimResults[opp] = res;
    const winPct=Math.round(res.winRate*100);
    const pillCls=winPct>=55?'fav':winPct<=45?'unfav':'even';
    const aCls=winPct>=55?'win':winPct<=45?'loss':'close';
    const aLbl=winPct>=60?'Favorable':winPct>=55?'Slight Edge':winPct>=45?'Even':winPct>=40?'Slight Disadvantage':'Unfavorable';
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td style="font-weight:700">${TEAMS[opp]?.name||opp}</td>
      <td><span class="win-pill ${pillCls}">${winPct}%</span></td>
      <td style="color:var(--green);font-family:var(--font-mono)">${res.wins}</td>
      <td style="color:var(--red);font-family:var(--font-mono)">${res.losses}</td>
      <td style="font-family:var(--font-mono)">${res.avgTurns.toFixed(1)}</td>
      <td style="font-family:var(--font-mono)">${res.avgTrTurns.toFixed(1)}</td>
      <td><span class="assess-chip ${aCls}">${aLbl}</span></td>`;
    tbody.appendChild(tr);
    addReplays(res.allLogs||[], opp);
    generatePilotGuide(opp, res);
  });

  document.getElementById('progress-wrap').style.display='none';
  const pdfBtn = document.getElementById('pdf-report-btn');
  if (pdfBtn) pdfBtn.style.display = '';
  simRunning=false; this.disabled=false; document.getElementById('run-sim-btn').disabled=false;
});

// ============================================================
// PART 2: PILOT GUIDE GENERATOR
// ============================================================
function generatePilotGuide(oppKey, results) {
  const el = document.getElementById('pilot-content');
  if (!el) return;

  const emptyEl = el.querySelector('.pilot-empty');
  if (emptyEl) emptyEl.remove();

  const total = results.wins + results.losses + results.draws;
  const winPct = Math.round(results.winRate * 100);

  let verdict, verdictClass;
  if (winPct >= 65) { verdict = 'Favorable'; verdictClass = 'verdict-favorable'; }
  else if (winPct >= 45) { verdict = 'Even'; verdictClass = 'verdict-even'; }
  else if (winPct >= 30) { verdict = 'Risky'; verdictClass = 'verdict-risky'; }
  else { verdict = 'Avoid'; verdictClass = 'verdict-avoid'; }

  const wcEntries = Object.entries(results.winConditions || {}).sort((a,b) => b[1]-a[1]).slice(0,2);
  const maxWC = wcEntries.length ? wcEntries[0][1] : 1;

  // T9j.10 (Refs #16) — read leads from battle.leads, not log string matching.
  const leadCounts = {};
  const allLogs = results.allLogs || [];
  const winLogs = allLogs.filter(g => g.result === 'win');
  for (const game of winLogs) {
    const names = (game.leads && Array.isArray(game.leads.player)) ? game.leads.player : [];
    for (const n of names) leadCounts[n] = (leadCounts[n] || 0) + 1;
  }
  const leads = Object.entries(leadCounts).sort((a,b) => b[1]-a[1]).slice(0,2).map(e => e[0]);

  const lossSeries = allLogs.filter(g => g.result === 'loss');
  const riskCounts = {};
  for (const game of lossSeries) {
    const kos = (game.log || []).filter(l => l.includes('fainted'));
    for (const ko of kos) {
      for (const m of (TEAMS[oppKey] ? TEAMS[oppKey].members : [])) {
        if (ko.includes(m.name)) {
          riskCounts[m.name] = (riskCounts[m.name] || 0) + 1;
        }
      }
    }
  }
  const riskThreshold = Math.max(1, lossSeries.length * 0.4);
  const risks = Object.entries(riskCounts)
    .filter(([,cnt]) => cnt >= riskThreshold)
    .sort((a,b) => b[1]-a[1])
    .slice(0,3)
    .map(e => e[0]);

  const tips = [];
  if (leads.length >= 2) tips.push(`Lead with ${leads[0]} + ${leads[1]} for best results.`);
  if (wcEntries.length) tips.push(`${wcEntries[0][0]} was the top win condition in ${Math.round(wcEntries[0][1]/total*100)}% of all series.`);
  if (risks.length) tips.push(`Watch for ${risks[0]} — it appeared in over 40% of your losses.`);
  else if (winPct > 55) tips.push('Your team has a consistent edge — focus on denying their setup turns.');
  if (winPct < 45) tips.push('Consider leading with Fake Out + speed control to disrupt their gameplan.');

  const oppTeam = TEAMS[oppKey];
  const teamName = oppTeam ? oppTeam.name : oppKey;
  const circleClass = winPct >= 55 ? 's-win' : winPct <= 45 ? 's-loss' : 's-even';

  // T9j.15 (Refs #71) — Mega trigger card (only injected when player team holds a Mega).
  // Sweep is computed lazily and cached; safe no-op for non-Mega teams.
  let megaTriggerHtml = '';
  try {
    const playerKey = (typeof currentPlayerKey !== 'undefined') ? currentPlayerKey : 'player';
    const format = (typeof currentFormat !== 'undefined') ? currentFormat : 'doubles';
    const bo = (typeof currentBo !== 'undefined') ? currentBo : 1;
    const sweep = computeMegaTriggerSweep(playerKey, oppKey, bo, format);
    megaTriggerHtml = renderMegaTriggerCards(sweep);
  } catch (e) {
    console.warn('[T9j.15] Mega card render skipped:', e && e.message);
  }

  const card = document.createElement('div');
  card.className = 'pilot-card';
  card.innerHTML = `
    <div class="pilot-card-header">
      <div class="pilot-card-title">${teamName}</div>
      <span class="pilot-verdict ${verdictClass}">${verdict}</span>
    </div>
    <div class="pilot-card-body">
      <div class="win-circle ${circleClass}" style="width:72px;height:72px;flex-shrink:0">
        <span class="win-pct" style="font-size:18px">${winPct}%</span>
        <span class="win-label">Series W%</span>
      </div>
      <div class="pilot-details">
        ${leads.length ? `<div class="pilot-leads"><span class="pilot-section-label">LEADS</span> ${leads.join(' + ')}</div>` : ''}
        <div class="pilot-section-label">WIN CONDITIONS</div>
        ${wcEntries.map(([cond,cnt]) => `
          <div class="pilot-wc-row">
            <span>${cond}</span>
            <div class="pilot-wc-bar-wrap"><div class="pilot-wc-bar" style="width:${Math.round(cnt/maxWC*100)}%"></div></div>
            <span style="font-size:10px;color:var(--primary);font-family:var(--font-mono)">${Math.round(cnt/total*100)}%</span>
          </div>`).join('')}
        ${risks.length ? `<div class="pilot-section-label" style="margin-top:8px">RISKS</div>
          ${risks.map(r => `<div class="pilot-risk">⚠ Watch out for: <strong>${r}</strong></div>`).join('')}` : ''}
        <div class="pilot-section-label" style="margin-top:8px">TIPS</div>
        <div class="pilot-tips">${tips.map(t => `<div class="pilot-tip">• ${t}</div>`).join('')}</div>
        ${megaTriggerHtml}
      </div>
    </div>`;
  el.appendChild(card);
}

// ============================================================
// T9j.15 (Refs #71) — Best Mega Trigger Turn card
// ============================================================
// Consumes runMegaTriggerSweep() from engine.js (T9j.7, shipped #23).
// Sweep output shape is { results: [ { megaSlot, curve, refinedTop3, bestTurn } ] }
// where each curve entry is { turn: <int|'never'>, wr, n, ci95 } — refinedTop3
// uses the same shape at higher sample counts.
//
// Design invariants:
//   - Only render for matchups where the player team has at least one Mega
//     holder (item === megaStone in CHAMPIONS_MEGAS). Non-Mega teams get no card.
//   - Severity bands: green >=3% delta vs turn 1, amber 1-3%, gray <1%.
//   - Cache keyed on (playerKey, oppKey, bo, format) with TTL; in-memory only.
//   - Card doubles as PDF matchup-guide "Mega Trigger" column filler.

var MEGA_TRIGGER_CACHE = {};
var MEGA_TRIGGER_TTL_MS = 30 * 60 * 1000; // 30 min — sweeps are deterministic per seed but expensive

function teamHasMega(team) {
  if (!team || !team.members) return false;
  if (typeof CHAMPIONS_MEGAS === 'undefined') return false;
  return team.members.some(function(m){
    var info = CHAMPIONS_MEGAS[m.name] || null;
    return info && info.megaStone && m.item === info.megaStone;
  });
}

function megaTriggerCacheKey(playerKey, oppKey, bo, format) {
  return [playerKey, oppKey, bo || 1, format || 'doubles'].join('|');
}

function getCachedMegaSweep(playerKey, oppKey, bo, format) {
  var k = megaTriggerCacheKey(playerKey, oppKey, bo, format);
  var hit = MEGA_TRIGGER_CACHE[k];
  if (!hit) return null;
  if (Date.now() - hit.t > MEGA_TRIGGER_TTL_MS) { delete MEGA_TRIGGER_CACHE[k]; return null; }
  return hit.sweep;
}

function setCachedMegaSweep(playerKey, oppKey, bo, format, sweep) {
  var k = megaTriggerCacheKey(playerKey, oppKey, bo, format);
  MEGA_TRIGGER_CACHE[k] = { t: Date.now(), sweep: sweep };
}

// Pick the best refined entry from a sweep result for a single Mega slot.
// Returns null if the result is empty or malformed.
function pickBestMegaRefined(slotResult) {
  if (!slotResult || !Array.isArray(slotResult.refinedTop3) || slotResult.refinedTop3.length === 0) return null;
  var sorted = slotResult.refinedTop3.slice().sort(function(a, b){ return b.wr - a.wr; });
  return sorted[0];
}

// Locate the turn-1 reference WR from the coarse curve. Falls back to the
// worst refined entry if turn 1 is missing (shouldn't happen in normal sweeps).
function findTurn1Baseline(slotResult) {
  if (!slotResult || !Array.isArray(slotResult.curve)) return null;
  var t1 = slotResult.curve.filter(function(c){ return c.turn === 1; })[0];
  if (t1) return t1;
  // fallback — lowest-WR refined
  if (Array.isArray(slotResult.refinedTop3) && slotResult.refinedTop3.length) {
    return slotResult.refinedTop3.slice().sort(function(a, b){ return a.wr - b.wr; })[0];
  }
  return null;
}

// Classify the delta between best turn and turn-1 baseline into a severity band.
// Returns { band: 'green'|'amber'|'gray', label: string }.
function megaTriggerSeverity(deltaWr) {
  var pct = deltaWr * 100;
  if (pct >= 3)  return { band: 'green', label: 'strong lift' };
  if (pct >= 1)  return { band: 'amber', label: 'moderate lift' };
  return { band: 'gray', label: 'marginal' };
}

// Render a single Mega slot's card HTML. Returns '' if the slot has no
// useful data (card is skipped upstream).
function renderMegaTriggerCard(slotResult) {
  var best = pickBestMegaRefined(slotResult);
  var base = findTurn1Baseline(slotResult);
  if (!best || !base) return '';

  var deltaWr = best.wr - base.wr;
  var sev = megaTriggerSeverity(deltaWr);
  var bestLabel = (best.turn === 'never') ? 'Hold Mega (never trigger)' : ('Trigger Mega on Turn ' + best.turn);
  var bestPct = Math.round(best.wr * 100);
  var deltaPct = (deltaWr * 100);
  var deltaSigned = (deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1) + '%';

  // Build full-sweep detail rows (sorted by turn then 'never' last).
  var curveSorted = (slotResult.curve || []).slice().sort(function(a, b){
    if (a.turn === 'never') return 1;
    if (b.turn === 'never') return -1;
    return a.turn - b.turn;
  });
  var detailRows = curveSorted.map(function(c){
    var wrPct = Math.round(c.wr * 100);
    var ci = Math.round(c.ci95 * 1000) / 10; // 1 decimal
    var barW = Math.max(4, Math.min(100, wrPct));
    return '<tr>' +
      '<td class="mt-turn">' + (c.turn === 'never' ? 'never' : ('T' + c.turn)) + '</td>' +
      '<td class="mt-wr">' + wrPct + '%</td>' +
      '<td class="mt-ci">&plusmn;' + ci + '%</td>' +
      '<td class="mt-bar-cell"><div class="mt-bar-wrap"><div class="mt-bar" style="width:' + barW + '%"></div></div></td>' +
    '</tr>';
  }).join('');

  return '<div class="mega-trigger-card mega-trigger-' + sev.band + '" data-mega-slot="' + _escapeHtml(slotResult.megaSlot) + '">' +
    '<div class="mega-trigger-head">' +
      '<span class="mega-trigger-badge mega-trigger-badge-' + sev.band + '">MEGA</span>' +
      '<strong class="mega-trigger-slot">' + _escapeHtml(slotResult.megaSlot) + '</strong>' +
      '<span class="mega-trigger-verdict">' + bestLabel + '</span>' +
    '</div>' +
    '<div class="mega-trigger-body">' +
      '<span class="mega-trigger-metric"><em>WR</em> ' + bestPct + '%</span>' +
      '<span class="mega-trigger-metric"><em>vs T1</em> ' + deltaSigned + '</span>' +
      '<span class="mega-trigger-metric mega-trigger-sev-' + sev.band + '">' + sev.label + '</span>' +
    '</div>' +
    '<details class="mega-trigger-details"><summary>Full sweep + 95% CI</summary>' +
      '<table class="mega-trigger-table"><thead><tr><th>Turn</th><th>WR</th><th>CI&plusmn;</th><th>Distribution</th></tr></thead>' +
      '<tbody>' + detailRows + '</tbody></table>' +
    '</details>' +
  '</div>';
}

// Render all Mega cards for a matchup (multi-Mega teams get multiple cards).
// Returns '' if the sweep is empty or the team has no Mega slots.
function renderMegaTriggerCards(sweep) {
  if (!sweep || !Array.isArray(sweep.results) || sweep.results.length === 0) return '';
  var cards = sweep.results.map(renderMegaTriggerCard).filter(function(s){ return s; }).join('');
  if (!cards) return '';
  return '<div class="mega-trigger-group">' +
    '<div class="mega-trigger-group-label">MEGA TIMING</div>' +
    cards +
  '</div>';
}

// Compact single-line summary for the PDF Matchup Guide row. Returns ''
// if no useful Mega call exists (e.g., no Mega on team or no refined data).
function buildMegaTriggerPdfSummary(sweep) {
  if (!sweep || !Array.isArray(sweep.results) || sweep.results.length === 0) return '';
  var parts = sweep.results.map(function(slot){
    var best = pickBestMegaRefined(slot);
    var base = findTurn1Baseline(slot);
    if (!best || !base) return '';
    var deltaPct = (best.wr - base.wr) * 100;
    var turnLabel = (best.turn === 'never') ? 'hold' : ('T' + best.turn);
    var bestPct = Math.round(best.wr * 100);
    var deltaSigned = (deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1) + '%';
    return slot.megaSlot + ' ' + turnLabel + ' (' + bestPct + '%, ' + deltaSigned + ' vs T1)';
  }).filter(function(s){ return s; });
  return parts.join(' | ');
}

// Compute (or fetch cached) sweep for a matchup. Returns null if the player
// team has no Mega holder, so callers can cheaply skip rendering.
function computeMegaTriggerSweep(playerKey, oppKey, bo, format) {
  if (typeof TEAMS === 'undefined' || !TEAMS[playerKey] || !TEAMS[oppKey]) return null;
  if (!teamHasMega(TEAMS[playerKey])) return null;
  if (typeof runMegaTriggerSweep !== 'function') return null;

  var cached = getCachedMegaSweep(playerKey, oppKey, bo, format);
  if (cached) return cached;

  try {
    // Use smaller sample counts than engine default so Pilot Guide render
    // stays within the <30s acceptance budget even on 13-matchup full runs.
    var sweep = runMegaTriggerSweep(TEAMS[playerKey], TEAMS[oppKey], bo || 1, { coarseN: 30, refineN: 200, maxTurn: 6 });
    setCachedMegaSweep(playerKey, oppKey, bo, format, sweep);
    return sweep;
  } catch (e) {
    console.warn('[T9j.15] Mega sweep failed:', e && e.message);
    return null;
  }
}

// ============================================================
// PART 3: PDF REPORT BUILDER — T9j.14 (Refs #75) Shadow Pressure master sheet + coaching
// ============================================================
// Source design: user-supplied Shadow_Pressure_vFINAL_PLUS.pdf master sheet.
// Structure: title banner, team overview, core game plan, role breakdown,
// lead system, matchup guide, turn flow, rules to win, Bo3 adaptation,
// final verdict, coaching notes.
//
// All analytics are derived from window.lastSimResults + currentPlayerKey.
// COACHING_RULES below is a pluggable registry — add entries to extend
// advice without touching the renderer.
document.getElementById('pdf-report-btn')?.addEventListener('click', generatePDFReport);

// --- Move/ability taxonomies used by role inference and coaching ---------
var PDF_FAKE_OUT = ['Fake Out'];
var PDF_TAILWIND = ['Tailwind'];
var PDF_TRICK_ROOM = ['Trick Room'];
var PDF_REDIRECT = ['Follow Me', 'Rage Powder'];
var PDF_SCREENS = ['Reflect', 'Light Screen', 'Aurora Veil'];
var PDF_PRIORITY = ['Sucker Punch', 'Extreme Speed', 'Bullet Punch', 'Aqua Jet', 'Ice Shard', 'Mach Punch', 'Vacuum Wave', 'Shadow Sneak', 'Quick Attack', 'Accelerock', 'First Impression'];
var PDF_SPREAD = ['Earthquake', 'Rock Slide', 'Heat Wave', 'Hyper Voice', 'Blizzard', 'Surf', 'Muddy Water', 'Make It Rain', 'Dazzling Gleam', 'Discharge', 'Snarl', 'Icy Wind', 'Electroweb', 'Earth Power'];
var PDF_DISRUPT = ['Taunt', 'Encore', 'Haze', 'Clear Smog', 'Destiny Bond', 'Perish Song', 'Disable'];
var PDF_WEATHER_MOVES = ['Rain Dance', 'Sunny Day', 'Sandstorm', 'Hail', 'Snowscape', 'Chilly Reception'];
var PDF_WEATHER_ABILITIES = ['Drought', 'Drizzle', 'Sand Stream', 'Snow Warning', 'Orichalcum Pulse', 'Hadron Engine'];
var PDF_TRAP_ABILITIES = ['Shadow Tag', 'Arena Trap', 'Magnet Pull'];

function _pdfHasAny(mon, list) {
  return !!(mon && mon.moves && list.some(function(x){ return mon.moves.indexOf(x) >= 0; }));
}

// Infer a single-word role label per member based on moves + ability + item.
function inferRole(mon) {
  if (!mon) return '-';
  var ab = mon.ability || '';
  var item = mon.item || '';
  if (PDF_TRAP_ABILITIES.indexOf(ab) >= 0) return 'Control / Trapper';
  if (_pdfHasAny(mon, PDF_FAKE_OUT) && /Incineroar|Rillaboom|Meowscarada/i.test(mon.name)) return 'Lead / Pivot';
  if (_pdfHasAny(mon, PDF_FAKE_OUT)) return 'Pivot';
  if (_pdfHasAny(mon, PDF_TAILWIND) || _pdfHasAny(mon, PDF_TRICK_ROOM)) return 'Speed Control';
  if (_pdfHasAny(mon, PDF_SCREENS)) return 'Support / Screens';
  if (_pdfHasAny(mon, PDF_REDIRECT)) return 'Redirector';
  if (_pdfHasAny(mon, PDF_PRIORITY) && /Kingambit|Scizor|Dragonite|Lucario/i.test(mon.name)) return 'Cleaner';
  if (_pdfHasAny(mon, PDF_DISRUPT)) return 'Disruptor';
  if (_pdfHasAny(mon, PDF_SPREAD)) return 'Wallbreaker';
  if (_pdfHasAny(mon, PDF_WEATHER_MOVES) || PDF_WEATHER_ABILITIES.indexOf(ab) >= 0) return 'Weather Setter';
  if (/Scarf/.test(item)) return 'Revenge Killer';
  return 'Attacker';
}

function inferWinFunction(mon) {
  if (!mon) return '-';
  if (_pdfHasAny(mon, PDF_FAKE_OUT)) return 'Fake Out + tempo';
  if (_pdfHasAny(mon, PDF_TAILWIND)) return 'Tailwind / speed flip';
  if (_pdfHasAny(mon, PDF_TRICK_ROOM)) return 'Trick Room setter';
  if (_pdfHasAny(mon, PDF_SCREENS)) return 'Screens / bulk support';
  if (_pdfHasAny(mon, PDF_REDIRECT)) return 'Redirect damage off allies';
  if (_pdfHasAny(mon, PDF_PRIORITY)) return 'Priority cleaner';
  if (_pdfHasAny(mon, PDF_DISRUPT)) return 'Disrupt + force mistakes';
  if (_pdfHasAny(mon, PDF_SPREAD)) return 'Spread damage / chip board';
  if (PDF_TRAP_ABILITIES.indexOf(mon.ability || '') >= 0) return 'Trap + remove key threats';
  if (PDF_WEATHER_ABILITIES.indexOf(mon.ability || '') >= 0) return 'Weather engine';
  return 'Damage output';
}

// Classify a team's overall playstyle from member mix.
function inferPlaystyle(members) {
  if (!Array.isArray(members) || !members.length) return 'Balanced';
  var hasTW = members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
  var hasTR = members.some(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var hasTrap = members.some(function(m){ return PDF_TRAP_ABILITIES.indexOf(m.ability||'') >= 0; });
  var hasFO = members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
  var weather = members.find(function(m){ return PDF_WEATHER_ABILITIES.indexOf(m.ability||'') >= 0; });
  if (weather) return (weather.ability || 'Weather') + ' Offense';
  if (hasTR && !hasTW) return 'Trick Room Offense';
  if (hasTrap) return 'Aggressive Control';
  if (hasTW && hasFO) return 'Balanced Offense';
  if (hasTW) return 'Hyper Offense';
  return 'Balanced';
}

// Aggregate top-2 leads across all matchups, partitioned by profile.
function buildLeadSystem(results, playerMembers) {
  var safeLeads = {}, speedLeads = {}, pressureLeads = {}, punishLeads = {};
  Object.entries(results).forEach(function(pair){
    var res = pair[1];
    (res.allLogs || []).filter(function(g){ return g.result === 'win'; }).forEach(function(game){
      var names = (game.leads && Array.isArray(game.leads.player)) ? game.leads.player : [];
      if (names.length !== 2) return;
      var pair2 = names.slice().sort().join(' + ');
      var leadMons = names.map(function(n){ return (playerMembers || []).find(function(m){ return m.name === n; }); }).filter(Boolean);
      var hasFO = leadMons.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
      var hasSpeed = leadMons.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); });
      var hasTrap = leadMons.some(function(m){ return PDF_TRAP_ABILITIES.indexOf(m.ability||'') >= 0; });
      var hasPrio = leadMons.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
      if (hasFO) safeLeads[pair2] = (safeLeads[pair2]||0)+1;
      if (hasSpeed) speedLeads[pair2] = (speedLeads[pair2]||0)+1;
      if (hasTrap) pressureLeads[pair2] = (pressureLeads[pair2]||0)+1;
      if (hasPrio) punishLeads[pair2] = (punishLeads[pair2]||0)+1;
    });
  });
  function top(obj) {
    var entries = Object.entries(obj).sort(function(a,b){ return b[1]-a[1]; });
    return entries.length ? entries[0][0] : null;
  }
  return {
    safe: top(safeLeads),
    speed: top(speedLeads),
    pressure: top(pressureLeads),
    punish: top(punishLeads)
  };
}

// Analyze loss trends across all matchups.
function analyzeLossTrends(results, playerMembers) {
  var totalLosses = 0;
  var firstKoTurns = [];
  var playerKoCounts = {};
  var oppFinisherCounts = {};
  var trSetInLoss = 0, twSetInLoss = 0;
  var playerNames = (playerMembers || []).map(function(m){ return m.name; });
  Object.entries(results).forEach(function(pair){
    var res = pair[1];
    (res.allLogs || []).filter(function(g){ return g.result === 'loss'; }).forEach(function(game){
      totalLosses++;
      if (game.trTurns && game.trTurns > 0) trSetInLoss++;
      if (game.twTurnsOpp && game.twTurnsOpp > 0) twSetInLoss++;
      var log = game.log || [];
      var firstSeen = null;
      for (var i = 0; i < log.length; i++) {
        var line = log[i];
        if (typeof line !== 'string') continue;
        if (line.indexOf('fainted') < 0) continue;
        for (var j = 0; j < playerNames.length; j++) {
          if (line.indexOf(playerNames[j]) >= 0) {
            playerKoCounts[playerNames[j]] = (playerKoCounts[playerNames[j]]||0)+1;
            if (firstSeen === null) {
              firstSeen = i;
              // best-effort turn approximation: count [TURN ...] markers before this line
              var t = 1;
              for (var k = 0; k < i; k++) { if (typeof log[k]==='string' && log[k].indexOf('[TURN') >= 0) t++; }
              firstKoTurns.push(t);
            }
            break;
          }
        }
      }
      var oppMembers = (TEAMS[game.oppKey] && TEAMS[game.oppKey].members) || [];
      var lastKoLine = null;
      for (var a = log.length - 1; a >= 0; a--) {
        var ln = log[a];
        if (typeof ln === 'string' && ln.indexOf('fainted') >= 0 && playerNames.some(function(n){ return ln.indexOf(n) >= 0; })) {
          lastKoLine = a; break;
        }
      }
      if (lastKoLine !== null) {
        for (var b = lastKoLine; b >= Math.max(0, lastKoLine-4); b--) {
          var prev = log[b];
          if (typeof prev !== 'string') continue;
          for (var c = 0; c < oppMembers.length; c++) {
            if (prev.indexOf(oppMembers[c].name) >= 0 && prev.indexOf('used') >= 0) {
              oppFinisherCounts[oppMembers[c].name] = (oppFinisherCounts[oppMembers[c].name]||0)+1;
              b = -1; break;
            }
          }
        }
      }
    });
  });
  var avgFirstKo = firstKoTurns.length ? (firstKoTurns.reduce(function(s,x){return s+x;},0)/firstKoTurns.length) : 0;
  var topPlayerLost = Object.entries(playerKoCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,2).map(function(e){return e[0];});
  var topFinisher = Object.entries(oppFinisherCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,2).map(function(e){return e[0];});
  return {
    totalLosses: totalLosses,
    avgFirstKoTurn: +avgFirstKo.toFixed(1),
    mostLostMons: topPlayerLost,
    topOppFinishers: topFinisher,
    trPctInLosses: totalLosses ? Math.round(trSetInLoss/totalLosses*100) : 0,
    twPctInLosses: totalLosses ? Math.round(twSetInLoss/totalLosses*100) : 0
  };
}

// Find dead moves: moves never referenced in any win log across all matchups.
function findDeadMoves(results, members) {
  var used = {};
  Object.entries(results).forEach(function(pair){
    (pair[1].allLogs || []).filter(function(g){ return g.result === 'win'; }).forEach(function(game){
      (game.log || []).forEach(function(line){
        if (typeof line !== 'string') return;
        (members || []).forEach(function(m){
          if (line.indexOf(m.name) < 0) return;
          (m.moves || []).forEach(function(mv){
            if (line.indexOf(mv) >= 0) { used[m.name+'|'+mv] = (used[m.name+'|'+mv]||0)+1; }
          });
        });
      });
    });
  });
  var dead = [];
  (members || []).forEach(function(m){
    (m.moves || []).forEach(function(mv){
      if (!used[m.name+'|'+mv]) dead.push({ pokemon: m.name, move: mv });
    });
  });
  return dead;
}

// Coverage gaps — reuse COVERAGE_CHECKS.
function findCoverageGaps(members) {
  if (typeof COVERAGE_CHECKS === 'undefined') return [];
  return COVERAGE_CHECKS.filter(function(chk){ return !(members||[]).some(function(m){ return chk.check(m); }); }).map(function(c){ return c.label; });
}

// ------------- COACHING_RULES pluggable registry ------------------------
// Each rule:
//   when(ctx) — returns bool  (ctx: { playstyle, members, results, trends, gaps, deadMoves, overallWR })
//   say(ctx)  — returns string advice
//   severity  — 'critical' | 'suggested' | 'optional'
//   priority  — number (higher = sort first within same severity)
// Add new rules by pushing to COACHING_RULES before generatePDFReport runs.
var COACHING_RULES = [
  {
    id: 'no-speed-control',
    severity: 'critical', priority: 100,
    when: function(c){ return c.gaps.indexOf('Speed Control') >= 0; },
    say: function(){ return 'No Speed Control present. Add Tailwind, Trick Room, Icy Wind, or a Choice Scarf revenge killer — teams without speed control routinely get outsped in Doubles.'; }
  },
  {
    id: 'no-fake-out',
    severity: 'suggested', priority: 90,
    when: function(c){ return c.gaps.indexOf('Fake Out') >= 0; },
    say: function(){ return 'No Fake Out user. Consider Incineroar, Rillaboom, or Meowscarada to lock in Turn 1 tempo.'; }
  },
  {
    id: 'no-priority',
    severity: 'suggested', priority: 80,
    when: function(c){ return c.gaps.indexOf('Priority') >= 0; },
    say: function(){ return 'No priority move. Endgame cleaning is harder when opponents scarf or set Tailwind. A Sucker Punch or Extreme Speed line is a high-value patch.'; }
  },
  {
    id: 'tr-bleed',
    severity: 'critical', priority: 95,
    when: function(c){ return c.trends.trPctInLosses >= 40; },
    say: function(c){ return 'Trick Room was up in ' + c.trends.trPctInLosses + '% of your losses. Add Taunt or a fast TR spoiler (Whimsicott, Indeedee). Removing TR pressure turns most of those losses into wins.'; }
  },
  {
    id: 'tw-bleed',
    severity: 'suggested', priority: 85,
    when: function(c){ return c.trends.twPctInLosses >= 40; },
    say: function(c){ return 'Opponent Tailwind up in ' + c.trends.twPctInLosses + '% of losses. Your own speed control is getting out-paced — consider Haze or a faster setter.'; }
  },
  {
    id: 'early-losses',
    severity: 'critical', priority: 90,
    when: function(c){ return c.trends.avgFirstKoTurn && c.trends.avgFirstKoTurn <= 2.5; },
    say: function(c){ return 'You lose your first mon on avg turn ' + c.trends.avgFirstKoTurn + '. Lead pair is getting blown up — switch to a Safe lead (Fake Out + Redirector or Screens) or stop leading your most fragile breaker.'; }
  },
  {
    id: 'most-lost',
    severity: 'suggested', priority: 70,
    when: function(c){ return c.trends.mostLostMons && c.trends.mostLostMons.length; },
    say: function(c){ return c.trends.mostLostMons[0] + ' faints most often in losses. Bulk investment, Assault Vest, or Sitrus Berry would increase your ceiling here.'; }
  },
  {
    id: 'opp-finisher',
    severity: 'optional', priority: 60,
    when: function(c){ return c.trends.topOppFinishers && c.trends.topOppFinishers.length; },
    say: function(c){ return 'Top finisher across your losses: ' + c.trends.topOppFinishers.join(', ') + '. Plan a dedicated remove line (KO math, scout move, or switch-in) for this threat.'; }
  },
  {
    id: 'dead-moves',
    severity: 'optional', priority: 50,
    when: function(c){ return c.deadMoves && c.deadMoves.length > 0; },
    say: function(c){
      var sample = c.deadMoves.slice(0,3).map(function(d){ return d.pokemon+'\u2019s '+d.move; }).join(', ');
      return 'Moves never used in a win: ' + sample + (c.deadMoves.length > 3 ? ' (+' + (c.deadMoves.length-3) + ' more)' : '') + '. Consider swapping to coverage or utility that the sim actually clicks.';
    }
  },
  {
    id: 'overall-avoid',
    severity: 'critical', priority: 99,
    when: function(c){ return c.overallWR < 0.40; },
    say: function(c){ return 'Overall win rate ' + Math.round(c.overallWR*100) + '%. Team needs structural rework — pick one matchup above 45% and reverse-engineer why it worked.'; }
  }
];

function evaluateCoachingRules(ctx) {
  return COACHING_RULES
    .filter(function(r){ try { return !!r.when(ctx); } catch(e){ return false; } })
    .map(function(r){ return { id: r.id, severity: r.severity, priority: r.priority, text: r.say(ctx) }; })
    .sort(function(a,b){
      var sevOrder = { critical: 0, suggested: 1, optional: 2 };
      if (sevOrder[a.severity] !== sevOrder[b.severity]) return sevOrder[a.severity] - sevOrder[b.severity];
      return b.priority - a.priority;
    });
}

function _verdictFor(winPct) {
  if (winPct >= 65) return { label: 'Favorable', cls: 'pdf-verdict-favorable' };
  if (winPct >= 45) return { label: 'Even',      cls: 'pdf-verdict-even' };
  if (winPct >= 30) return { label: 'Risky',     cls: 'pdf-verdict-risky' };
  return                     { label: 'Avoid',    cls: 'pdf-verdict-avoid' };
}

function _escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function generatePDFReport() {
  var container = document.getElementById('pdf-report-container');
  if (!container) return;

  var results = window.lastSimResults || {};
  var date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  var bo = (typeof currentBo !== 'undefined') ? currentBo : 3;
  var fmtLabel = (typeof currentFormat !== 'undefined' && currentFormat === 'singles') ? 'Singles (Bring 6, Pick 3)' : 'Doubles (Bring 6, Pick 4)';
  var playerKey = (typeof currentPlayerKey !== 'undefined' && TEAMS[currentPlayerKey]) ? currentPlayerKey : 'player';
  var playerTeam = TEAMS[playerKey] || { name: playerKey, members: [] };
  var playerMembers = playerTeam.members || [];
  var teamTitle = (playerTeam.name || playerKey).toUpperCase() + ' — MASTER SHEET';
  var playstyle = inferPlaystyle(playerMembers);

  // --- Section 1: Team Overview ------------------------------------------
  var overviewRows = playerMembers.map(function(m, i){
    return '<tr>' +
      '<td>' + (i+1) + '</td>' +
      '<td><strong>' + _escapeHtml(m.name) + '</strong></td>' +
      '<td>' + _escapeHtml(inferRole(m)) + '</td>' +
      '<td>' + _escapeHtml(inferWinFunction(m)) + '</td>' +
    '</tr>';
  }).join('');

  // --- Section 2: Core Game Plan ----------------------------------------
  var allWinConds = {};
  Object.values(results).forEach(function(res){
    Object.entries(res.winConditions || {}).forEach(function(wc){ allWinConds[wc[0]] = (allWinConds[wc[0]]||0) + wc[1]; });
  });
  var topWC = Object.entries(allWinConds).sort(function(a,b){ return b[1]-a[1]; }).slice(0,2).map(function(e){ return e[0]; });
  var planPrimary = topWC[0] ? ('Primary: ' + topWC[0] + ' — shown most often in winning series.') : 'Primary: Win Turn 1 (tempo) → force Protects → KO Turn 2-3 → clean lategame.';
  var planSecondary = topWC[1] ? ('Secondary: ' + topWC[1] + ' — fallback win condition when primary line is answered.') : 'Secondary: Apply pressure + chip board until a clean win condition opens.';

  // --- Section 3: Role Breakdown ----------------------------------------
  var roleCards = playerMembers.map(function(m){
    return '<div class="pdf-role-card"><strong>' + _escapeHtml(m.name) + ':</strong> ' + _escapeHtml(inferRole(m)) + ' — ' + _escapeHtml(inferWinFunction(m)) + '.</div>';
  }).join('');

  // --- Section 4: Lead System -------------------------------------------
  var leads = buildLeadSystem(results, playerMembers);
  function _leadRow(label, pair){
    return '<div class="pdf-lead-row"><strong>' + label + ':</strong> ' + (pair ? _escapeHtml(pair) : '<em style="color:#888">no qualifying wins yet</em>') + '</div>';
  }

  // --- Section 5: Matchup Guide table -----------------------------------
  // T9j.15 (Refs #71) — appends a "Mega Trigger" column when the player team
  // holds a Mega. Column is omitted entirely for non-Mega teams to keep the
  // Shadow Pressure layout tight.
  var pdfPlayerKey = (typeof currentPlayerKey !== 'undefined') ? currentPlayerKey : 'player';
  var pdfFormat    = (typeof currentFormat !== 'undefined') ? currentFormat : 'doubles';
  var pdfBo        = (typeof currentBo !== 'undefined') ? currentBo : 1;
  var pdfShowMegaCol = (typeof TEAMS !== 'undefined' && TEAMS[pdfPlayerKey] && teamHasMega(TEAMS[pdfPlayerKey]));

  var matchupRows = Object.entries(results).map(function(pair){
    var opp = pair[0], res = pair[1];
    var winPct = Math.round((res.winRate || 0) * 100);
    var v = _verdictFor(winPct);
    var leadCounts = {}, backCounts = {};
    (res.allLogs || []).filter(function(g){ return g.result === 'win'; }).forEach(function(game){
      var picked = (game.bring && Array.isArray(game.bring.player)) ? game.bring.player : (game.leads && Array.isArray(game.leads.player) ? game.leads.player : []);
      var ld = (game.leads && Array.isArray(game.leads.player)) ? game.leads.player : picked.slice(0,2);
      var back = picked.filter(function(n){ return ld.indexOf(n) < 0; });
      if (ld.length === 2) { var k = ld.slice().sort().join(' + '); leadCounts[k] = (leadCounts[k]||0)+1; }
      if (back.length) { var kb = back.slice().sort().join(' + '); backCounts[kb] = (backCounts[kb]||0)+1; }
    });
    var bestLead = Object.entries(leadCounts).sort(function(a,b){return b[1]-a[1];})[0];
    var bestBack = Object.entries(backCounts).sort(function(a,b){return b[1]-a[1];})[0];
    var notes = winPct + '% WR — ' + v.label;

    var megaCell = '';
    if (pdfShowMegaCol) {
      var megaSummary = '';
      try {
        var sweep = getCachedMegaSweep(pdfPlayerKey, opp, pdfBo, pdfFormat) ||
                    computeMegaTriggerSweep(pdfPlayerKey, opp, pdfBo, pdfFormat);
        megaSummary = buildMegaTriggerPdfSummary(sweep);
      } catch (e) { megaSummary = ''; }
      megaCell = '<td>' + (megaSummary ? _escapeHtml(megaSummary) : '<em style="color:#888">-</em>') + '</td>';
    }

    return '<tr>' +
      '<td><strong>' + _escapeHtml((TEAMS[opp] && TEAMS[opp].name) || opp) + '</strong></td>' +
      '<td>' + (bestLead ? _escapeHtml(bestLead[0]) : '<em style="color:#888">-</em>') + '</td>' +
      '<td>' + (bestBack ? _escapeHtml(bestBack[0]) : '<em style="color:#888">-</em>') + '</td>' +
      megaCell +
      '<td><span class="' + v.cls + '">' + notes + '</span></td>' +
    '</tr>';
  }).join('');

  // --- Sections 6+: templated blocks -----------------------------------
  var turnFlow = [
    'Turn 1: Fake Out / Tailwind / trap line — establish tempo.',
    'Turn 2: Force Protect or take a KO into the opened target.',
    'Turn 3: Gain position advantage; preserve your cleaner.',
    'Endgame: Clean with priority / trap the last mon.'
  ];

  var overallSeries = 0, overallWins = 0;
  Object.values(results).forEach(function(r){ overallSeries += (r.wins + r.losses + r.draws); overallWins += r.wins; });
  var overallWR = overallSeries ? (overallWins / overallSeries) : 0;
  var overallPct = Math.round(overallWR * 100);
  var overallV = _verdictFor(overallPct);

  // --- Coaching analysis ------------------------------------------------
  var trends = analyzeLossTrends(results, playerMembers);
  var deadMoves = findDeadMoves(results, playerMembers);
  var gaps = findCoverageGaps(playerMembers);
  var notesList = evaluateCoachingRules({
    playstyle: playstyle, members: playerMembers, results: results,
    trends: trends, gaps: gaps, deadMoves: deadMoves, overallWR: overallWR
  });

  var coachingHtml = notesList.length
    ? notesList.map(function(n){
        return '<div class="pdf-coach-item pdf-coach-' + n.severity + '">' +
          '<span class="pdf-coach-badge pdf-coach-badge-' + n.severity + '">' + n.severity.toUpperCase() + '</span> ' +
          _escapeHtml(n.text) + '</div>';
      }).join('')
    : '<div class="pdf-coach-item pdf-coach-optional">No coaching flags triggered — team composition and simulation trends look clean.</div>';

  var lossTrendHtml = trends.totalLosses
    ? '<ul class="pdf-trend-list">' +
        '<li>Total losses sampled: <strong>' + trends.totalLosses + '</strong></li>' +
        '<li>Average first-KO turn: <strong>' + trends.avgFirstKoTurn + '</strong></li>' +
        (trends.mostLostMons.length ? '<li>Most lost in losses: <strong>' + _escapeHtml(trends.mostLostMons.join(', ')) + '</strong></li>' : '') +
        (trends.topOppFinishers.length ? '<li>Top opponent finishers: <strong>' + _escapeHtml(trends.topOppFinishers.join(', ')) + '</strong></li>' : '') +
        '<li>Trick Room up in losses: <strong>' + trends.trPctInLosses + '%</strong></li>' +
        '<li>Opponent Tailwind up in losses: <strong>' + trends.twPctInLosses + '%</strong></li>' +
      '</ul>'
    : '<div style="color:#666">No losses recorded in this simulation.</div>';

  var deadMovesHtml = deadMoves.length
    ? '<table class="pdf-table"><thead><tr><th>Pokémon</th><th>Dead Move</th><th>Rationale</th></tr></thead><tbody>' +
        deadMoves.slice(0, 12).map(function(d){
          return '<tr><td>' + _escapeHtml(d.pokemon) + '</td><td>' + _escapeHtml(d.move) + '</td><td>Never appeared in a winning battle log — candidate for swap.</td></tr>';
        }).join('') +
      '</tbody></table>'
    : '<div style="color:#666">All moves were used in at least one win — no dead-move swaps suggested.</div>';

  // --- Render -----------------------------------------------------------
  container.innerHTML = [
    '<div class="pdf-banner">',
      '<div class="pdf-title">' + _escapeHtml(teamTitle) + '</div>',
      '<div class="pdf-subtitle">Format: ' + _escapeHtml(fmtLabel) + '  |  Playstyle: ' + _escapeHtml(playstyle) + ' (Bo' + bo + ')  |  ' + _escapeHtml(date) + '</div>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">TEAM OVERVIEW</div>',
      '<table class="pdf-table"><thead><tr><th>Slot</th><th>Pokémon</th><th>Role</th><th>Win Function</th></tr></thead><tbody>' + overviewRows + '</tbody></table>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">CORE GAME PLAN</div>',
      '<p class="pdf-p">' + _escapeHtml(planPrimary) + '</p>',
      '<p class="pdf-p">' + _escapeHtml(planSecondary) + '</p>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">ROLE BREAKDOWN</div>',
      roleCards,
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">LEAD SYSTEM</div>',
      _leadRow('Safe',     leads.safe),
      _leadRow('Speed',    leads.speed),
      _leadRow('Pressure', leads.pressure),
      _leadRow('Punish',   leads.punish),
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">MATCHUP GUIDE</div>',
      '<table class="pdf-table"><thead><tr><th>Opponent</th><th>Lead</th><th>Backline</th>' +
        (pdfShowMegaCol ? '<th>Mega Trigger</th>' : '') +
        '<th>Notes</th></tr></thead><tbody>' + matchupRows + '</tbody></table>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">TURN FLOW</div>',
      turnFlow.map(function(t){ return '<p class="pdf-p">' + _escapeHtml(t) + '</p>'; }).join(''),
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">RULES TO WIN</div>',
      '<p class="pdf-p">Do not over-commit your cleaner Turn 1. Do not delay speed control past Turn 2. Do not spam spread moves when allies are exposed. Always force action Turn 1. Aim for a KO by Turn 3.</p>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">BO3 ADAPTATION</div>',
      '<p class="pdf-p">Game 1: Safe lead, gather information.</p>',
      '<p class="pdf-p">Game 2: Adjust to opponent adaptation.</p>',
      '<p class="pdf-p">Game 3: Force your best-performing win condition from the Matchup Guide.</p>',
    '</div>',

    '<div class="pdf-section">',
      '<div class="pdf-h2">FINAL VERDICT</div>',
      '<p class="pdf-p">Overall simulated win rate: <span class="' + overallV.cls + '"><strong>' + overallPct + '% — ' + overallV.label + '</strong></span> across ' + overallSeries + ' series.</p>',
    '</div>',

    '<div class="pdf-section pdf-coach-section">',
      '<div class="pdf-h2">COACHING NOTES</div>',
      '<div class="pdf-h3">Why You Lost — Trends</div>',
      lossTrendHtml,
      '<div class="pdf-h3">Suggested Move Changes</div>',
      deadMovesHtml,
      (gaps.length ? '<div class="pdf-h3">Coverage Gaps</div><p class="pdf-p">Missing: <strong>' + _escapeHtml(gaps.join(', ')) + '</strong></p>' : ''),
      '<div class="pdf-h3">Strategy Flags</div>',
      coachingHtml,
    '</div>',

    '<div class="pdf-footer">Generated by Pokémon Champion 2026 Simulator — ' + _escapeHtml(date) + '</div>'
  ].join('');

  window.print();
}

// ============================================================
// PART 4: SERIES SUMMARY MODE (Replay Log)
// ============================================================
let replayMode = 'log';

document.getElementById('replay-mode-toggle')?.addEventListener('click', function() {
  replayMode = replayMode === 'log' ? 'summary' : 'log';
  this.textContent = replayMode === 'log' ? 'Series Summary' : 'Game Log';
  this.classList.toggle('active', replayMode === 'summary');
  if (replayMode === 'summary') renderSeriesSummary();
  else renderReplays();
});

function renderSeriesSummary() {
  const el = document.getElementById('replay-list');
  if (!el) return;

  const results = window.lastSimResults;
  if (!results || !Object.keys(results).length) {
    el.innerHTML = '<div class="replay-empty">No simulation results yet — run "Run All Matchups" first.</div>';
    return;
  }

  let rows = '';
  let seriesNum = 1;
  for (const [opp, res] of Object.entries(results)) {
    const logs = res.allLogs || [];
    const total = logs.length;
    const wins = logs.filter(g => g.result === 'win').length;
    const losses = logs.filter(g => g.result === 'loss').length;
    const winPct = total ? Math.round(wins/total*100) : 0;

    let keyKO = '—';
    for (const game of logs) {
      const faintedLine = (game.log || []).find(l => l.includes('fainted'));
      if (faintedLine) {
        const match = faintedLine.match(/(\w[\w\s-]+)\s+fainted/);
        if (match) { keyKO = match[1].trim(); break; }
      }
    }

    const wcTop = Object.entries(res.winConditions || {}).sort((a,b)=>b[1]-a[1])[0];
    const winCond = wcTop ? wcTop[0] : '—';

    let verdictCls = winPct >= 65 ? 'verdict-favorable' : winPct >= 45 ? 'verdict-even' : winPct >= 30 ? 'verdict-risky' : 'verdict-avoid';

    rows += `<tr class="ss-row ss-${winPct>=55?'win':winPct<=45?'loss':'draw'}">
      <td style="font-family:var(--font-mono);font-size:11px">${seriesNum++}</td>
      <td style="font-weight:700">${TEAMS[opp]?.name || opp}</td>
      <td><span class="pilot-verdict ${verdictCls}" style="font-size:10px">${winPct}%</span></td>
      <td style="font-family:var(--font-mono);font-size:11px">${total}</td>
      <td style="font-size:11px">${winCond}</td>
      <td style="font-size:11px;color:var(--text-m)">${keyKO}</td>
    </tr>`;
  }

  el.innerHTML = `<table class="series-summary-table">
    <thead><tr>
      <th>#</th><th>Opponent</th><th>W%</th><th>Games</th><th>Win Condition</th><th>Key KO</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ============================================================
// PART 5A: SPEED TIER WIDGET (Teams Tab)
// ============================================================
const NATURE_SPE = {
  Timid:1.1, Jolly:1.1, Naive:1.1, Hasty:1.1,
  Modest:0.9, Adamant:0.9, Bold:0.9, Impish:0.9, Careful:0.9, Calm:0.9,
  Quiet:0.9, Brave:0.9, Relaxed:0.9, Sassy:0.9, Serious:1, Hardy:1, Bashful:1, Docile:1, Quirky:1
};

function getEffectiveSpe(member) {
  const base = BASE_STATS[member.name];
  if (!base) return 0;
  const nat = NATURE_SPE[member.nature] || 1;
  const ev = (member.evs && member.evs.spe) ? member.evs.spe : 0;
  const raw = Math.floor((2 * base.spe + 31 + Math.floor(ev / 4)) * 50 / 100 + 5);
  return Math.floor(raw * nat);
}

function buildSpeedTierHTML(members) {
  const sorted = [...members].map(m => ({
    name: m.name,
    spe: getEffectiveSpe(m),
    item: m.item || '',
    note: m.item === 'Choice Scarf' ? '×1.5 Scarf' : ''
  })).sort((a,b) => b.spe - a.spe);

  return `<div class="speed-tier-section">
    <button class="speed-tier-toggle" onclick="this.nextElementSibling.classList.toggle('open')">
      ▸ Speed Tiers
    </button>
    <div class="speed-tier-list">
      ${sorted.map((s,i) => `<div class="speed-tier-row">
        <span class="speed-rank">${i+1}</span>
        <span class="speed-name">${s.name}</span>
        <span class="speed-val">${s.spe}${s.note ? ` <em style="color:var(--text-m);font-size:9px">${s.note}</em>` : ''}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderSpeedTiersForGrid() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.team-full-card');
  const teamKeys = Object.keys(TEAMS);
  cards.forEach((card, idx) => {
    const key = teamKeys[idx];
    const team = TEAMS[key];
    if (!team || !team.members) return;
    const existing = card.querySelector('.speed-tier-section');
    if (existing) existing.remove();
    card.insertAdjacentHTML('beforeend', buildSpeedTierHTML(team.members));
  });
}

// ============================================================
// PART 5B: ROLE COVERAGE CHECKER
// FIX: Must use var (not const/let) — referenced during init before declaration
// ============================================================
// ---- T9j.3b: Champions-legal move/ability lists for coverage detection ----
// All lists kept as `var` for the same TDZ-safe init pattern COVERAGE_CHECKS uses.
var PRIORITY_MOVES = [
  'Fake Out','Extreme Speed','Aqua Jet','Shadow Sneak','Sucker Punch',
  'Bullet Punch','Ice Shard','Vacuum Wave','Mach Punch','Grassy Glide',
  'Quick Attack','Accelerock','First Impression'
];
// Sticky Web counted per user direction 2026-04-24: hazard that reduces switch-in speed.
var SPEED_LOWER_MOVES = [
  'Electroweb','Icy Wind','Bulldoze','Low Sweep','Rock Tomb','Scary Face',
  'Glaciate','String Shot','Mud Shot','Drum Beating','Sticky Web','Cotton Spore'
];
var SPEED_BOOST_MOVES = [
  'Dragon Dance','Agility','Rock Polish','Flame Charge','Shift Gear',
  'Trailblaze','Quiver Dance','Victory Dance','Autotomize','Rapid Spin'
];
// Own-team only (user direction 2026-04-24: opposing TR is matchup-time, not coverage).
var SPEED_FIELD_MOVES = ['Tailwind','Trick Room'];
var SPEED_PRIORITY_MANIP = ['Feint','After You','Quash','Ally Switch'];
// Intimidate excluded (indirect per user direction).
var SPEED_ABILITIES = [
  'Chlorophyll','Swift Swim','Sand Rush','Slush Rush','Unburden',
  'Surge Surfer','Wind Rider','Quick Feet','Steam Engine','Motor Drive'
];
var WEATHER_ABILITIES = ['Drought','Drizzle','Sand Stream','Snow Warning'];
var WEATHER_MOVES = ['Sunny Day','Rain Dance','Snowscape','Hail','Sandstorm'];
var REDIRECTION_MOVES = ['Follow Me','Rage Powder','Spotlight'];
var TR_PRESSURE_MOVES = ['Trick Room','Taunt','Imprison','Fake Out'];

function _anyMove(members, list) {
  return members.some(m => m && m.moves && list.some(x => m.moves.includes(x)));
}
function _anyAbility(members, list) {
  return members.some(m => m && m.ability && list.includes(m.ability));
}
function _memberHasSpeedControl(m) {
  if (!m) return false;
  if (m.moves && SPEED_LOWER_MOVES.some(x => m.moves.includes(x))) return true;
  if (m.moves && SPEED_BOOST_MOVES.some(x => m.moves.includes(x))) return true;
  if (m.moves && SPEED_FIELD_MOVES.some(x => m.moves.includes(x))) return true;
  if (m.moves && SPEED_PRIORITY_MANIP.some(x => m.moves.includes(x))) return true;
  if (m.ability && SPEED_ABILITIES.includes(m.ability)) return true;
  return false;
}

// Structured coverage object. No caching; always recomputed from current TEAMS state.
// Returns null if the requested team does not exist.
function computeCoverage(teamKey) {
  var key = teamKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player');
  var team = (typeof TEAMS !== 'undefined') ? TEAMS[key] : null;
  if (!team || !team.members) return null;
  var members = team.members;
  var speed_lowering = _anyMove(members, SPEED_LOWER_MOVES);
  var speed_boosting = _anyMove(members, SPEED_BOOST_MOVES);
  var field_effects  = _anyMove(members, SPEED_FIELD_MOVES);
  var ability_speed  = _anyAbility(members, SPEED_ABILITIES);
  var priority_speed = _anyMove(members, SPEED_PRIORITY_MANIP);
  return {
    fake_out:       _anyMove(members, ['Fake Out']),
    trick_room:     _anyMove(members, TR_PRESSURE_MOVES),
    redirection:    _anyMove(members, REDIRECTION_MOVES),
    priority:       _anyMove(members, PRIORITY_MOVES),
    weather_setter: _anyAbility(members, WEATHER_ABILITIES) || _anyMove(members, WEATHER_MOVES),
    speed_control: {
      speed_lowering: speed_lowering,
      speed_boosting: speed_boosting,
      field_effects:  field_effects,
      abilities:      ability_speed,
      priority_speed: priority_speed,
      any: (speed_lowering || speed_boosting || field_effects || ability_speed || priority_speed)
    }
  };
}
// Expose for tests and any external module consumers.
if (typeof globalThis !== 'undefined') {
  globalThis.computeCoverage = computeCoverage;
}

// COVERAGE_CHECKS drives the checkmark UI row. Kept as `var` (see file-header note).
// "Trick Room Counter" renamed to "Trick Room" per user direction 2026-04-24.
var COVERAGE_CHECKS = [
  { label: 'Fake Out',       check: (m) => m && m.moves && m.moves.includes('Fake Out') },
  { label: 'Trick Room',     check: (m) => m && m.moves && TR_PRESSURE_MOVES.some(x => m.moves.includes(x)) },
  { label: 'Redirection',    check: (m) => m && m.moves && REDIRECTION_MOVES.some(x => m.moves.includes(x)) },
  { label: 'Priority',       check: (m) => m && m.moves && PRIORITY_MOVES.some(x => m.moves.includes(x)) },
  { label: 'Weather Setter', check: (m) => (m && m.ability && WEATHER_ABILITIES.includes(m.ability))
                                         || (m && m.moves && WEATHER_MOVES.some(x => m.moves.includes(x))) },
  { label: 'Speed Control',  check: (m) => _memberHasSpeedControl(m) }
];

function renderCoverageWidget() {
  var el = document.getElementById('coverage-items');
  if (!el) return;
  var key = (typeof currentPlayerKey === 'string' && TEAMS[currentPlayerKey])
            ? currentPlayerKey
            : (TEAMS.player ? 'player' : Object.keys(TEAMS)[0]);
  var members = (TEAMS[key] && TEAMS[key].members) || [];
  el.innerHTML = COVERAGE_CHECKS.map(chk => {
    var covered = members.some(m => chk.check(m));
    return `<div class="coverage-item ${covered ? 'coverage-ok' : 'coverage-miss'}">
      <span>${covered ? '✓' : '✗'}</span>
      <span>${chk.label}</span>
    </div>`;
  }).join('');
}

renderCoverageWidget();

// Render speed tiers for initial teams grid
renderSpeedTiersForGrid();

// ============================================================
// PART 6: META THREAT RADAR
// ============================================================
const META_THREATS = [
  { name:'Sneasler',   types:['Fighting','Poison'], usage:42.1, winRate:54.2 },
  { name:'Garchomp',  types:['Dragon','Ground'],   usage:38.7, winRate:52.8 },
  { name:'Kingambit', types:['Dark','Steel'],       usage:36.4, winRate:53.1 },
  { name:'Basculegion', types:['Water','Ghost'],    usage:28.3, winRate:55.0 },
  { name:'Incineroar', types:['Fire','Dark'],       usage:67.2, winRate:50.4 },
  { name:'Sinistcha',  types:['Grass','Ghost'],     usage:24.1, winRate:51.9 },
  { name:'Rotom-Wash', types:['Electric','Water'],  usage:22.8, winRate:50.7 },
  { name:'Aerodactyl', types:['Rock','Flying'],     usage:19.5, winRate:52.3 },
  { name:'Farigiraf',  types:['Normal','Psychic'],  usage:18.2, winRate:51.1 },
  { name:'Froslass',   types:['Ice','Ghost'],       usage:16.7, winRate:53.6 }
];

function computeThreatLevel(threat) {
  const playerMoves = TEAMS.player.members.flatMap(m => m.moves || []);
  const playerSpeeds = TEAMS.player.members.map(m => getEffectiveSpe(m));
  const maxPlayerSpe = Math.max(...playerSpeeds);

  let hasSECoverage = false;
  for (const mv of playerMoves) {
    const mvType = (typeof MOVE_TYPES !== 'undefined') ? MOVE_TYPES[mv] : null;
    if (!mvType) continue;
    let eff = 1;
    for (const dt of threat.types) {
      const row = (typeof TYPE_CHART !== 'undefined' && TYPE_CHART[mvType]) ? TYPE_CHART[mvType] : {};
      eff *= (row[dt] !== undefined ? row[dt] : 1);
    }
    if (eff >= 2) { hasSECoverage = true; break; }
  }

  const threatBase = BASE_STATS[threat.name];
  const threatSpe = threatBase ? threatBase.spe : 100;
  const hasSpeedAdv = maxPlayerSpe > threatSpe;

  if (hasSECoverage && hasSpeedAdv) return 'radar-safe';
  if (hasSECoverage || hasSpeedAdv) return 'radar-neutral';
  return 'radar-threat';
}

function renderMetaRadar() {
  const grid = document.getElementById('radar-grid');
  if (!grid) return;
  grid.innerHTML = META_THREATS.map(t => {
    const lvl = computeThreatLevel(t);
    const dot = lvl === 'radar-safe' ? '#22c55e' : lvl === 'radar-neutral' ? '#f59e0b' : '#ef4444';
    return `<div class="radar-card ${lvl}">
      <div class="radar-card-header">
        <span style="width:10px;height:10px;border-radius:50%;background:${dot};display:inline-block;flex-shrink:0"></span>
        <span class="radar-name">${t.name}</span>
      </div>
      <div class="radar-types">${t.types.map(tp => `<span class="type-chip" style="background:${typeColor(tp)}20;color:${typeColor(tp)};border:1px solid ${typeColor(tp)}40">${tp}</span>`).join('')}</div>
      <div class="radar-stats">
        <span>Usage: <strong>${t.usage}%</strong></span>
        <span>WR: <strong>${t.winRate}%</strong></span>
      </div>
    </div>`;
  }).join('');
}

renderMetaRadar();
