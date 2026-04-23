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
document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFormat = btn.dataset.fmt;
    const indicator = document.getElementById('fmt-indicator');
    if (currentFormat === 'doubles') {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/></svg> DOUBLES · 4v4 · Spread moves active`;
    } else {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/></svg> SINGLES · 6v6 · No spread nerf`;
    }
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

// ---- Initial renders ----
renderRoster('player-roster', TEAMS.player.members);
renderRoster('opp-roster', TEAMS.mega_altaria.members);

// ---- Opponent select ----
document.getElementById('opponent-select').addEventListener('change', function() {
  const team = TEAMS[this.value];
  if (team) {
    document.getElementById('opp-team-name').textContent = team.name;
    renderRoster('opp-roster', team.members);
  }
});

// ============================================================
// TEAMS TAB
// ============================================================
function renderTeamsGrid() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const [key, team] of Object.entries(TEAMS)) {
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
          <button class="export-card-btn" data-team="${key}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Export
          </button>
        </div>
      </div>
      ${team.members.map(m => {
        const base = BASE_STATS[m.name]||{types:['Normal']};
        return `<div class="poke-full-row">
          <img class="poke-full-sprite" src="${getSpriteUrl(m.name)}" alt="${m.name}" loading="lazy" onerror="this.style.opacity='.3'"/>
          <div class="poke-full-info">
            <div class="poke-full-name">${m.name} <span style="font-weight:400;color:var(--text-m);font-size:10px">@ ${m.item||'—'}</span></div>
            <div class="poke-full-detail">${m.ability||'—'} · ${m.nature||'Hardy'} · Lv${m.level||50}</div>
            <div class="move-tags">${(m.moves||[]).map(mv=>`<span class="move-tag">${mv}</span>`).join('')}</div>
          </div>
        </div>`;
      }).join('')}`;
    grid.appendChild(card);
  }
  // Export buttons
  grid.querySelectorAll('.export-card-btn').forEach(btn => {
    btn.addEventListener('click', () => openExportModal(btn.dataset.team));
  });
  // Speed tier sections appended by renderSpeedTiersForGrid() after TEAMS data
}
renderTeamsGrid();
// Note: renderSpeedTiersForGrid is called at bottom after it's defined

document.getElementById('import-team-btn')?.addEventListener('click', () => openImportModal());

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
  document.getElementById('export-this-mon').addEventListener('click', () => openExportModal('player'));
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

document.getElementById('export-team-editor')?.addEventListener('click', ()=>openExportModal('player'));
document.getElementById('import-team-editor')?.addEventListener('click', ()=>{ openImportModal(); document.getElementById('import-slot').value='player'; });

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
  // Modern clipboard API (requires HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(ta.value).then(showCopied).catch(()=>{
      ta.select(); ta.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); showCopied(); } catch(e) {}
    });
  } else {
    // Fallback for HTTP or older browsers (iOS Safari < 13.4)
    ta.select(); ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); showCopied(); } catch(e) {}
  }
});
document.getElementById('export-player-btn')?.addEventListener('click', ()=>openExportModal('player'));
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
}
function closeImportModal() { document.getElementById('import-modal').style.display = 'none'; }

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
    // Extract paste ID and fetch raw
    const match = url.match(/pokepast\.es\/([a-f0-9]+)/i);
    if (!match) { statusEl.textContent = 'Invalid pokepast.es URL format'; statusEl.className='modal-status err'; return; }
    statusEl.textContent = 'Fetching paste…';
    try {
      const resp = await fetch(`https://pokepast.es/${match[1]}/raw`);
      if (!resp.ok) throw new Error('Fetch failed');
      pasteText = await resp.text();
    } catch(e) {
      // CORS fallback — try without cors
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
    // Create a new team slot with a unique key
    const newKey = 'custom_' + Date.now();
    // Detect team name from first Pokémon or use generic
    const guessedName = members[0] ? `${members[0].name}'s Team` : 'Imported Team';
    TEAMS[newKey] = {
      name: guessedName,
      label: 'CUSTOM',
      style: 'custom',
      description: 'Imported via Showdown paste',
      members: members
    };
    targetSlot = newKey;
    teamName = guessedName;
    // Add to opponent select dropdown
    const oppSel = document.getElementById('opponent-select');
    if (oppSel) {
      const opt = document.createElement('option');
      opt.value = newKey;
      opt.textContent = guessedName;
      oppSel.appendChild(opt);
    }
    // Add to import-slot dropdown for future reference
    const importSlot = document.getElementById('import-slot');
    if (importSlot) {
      const opt = document.createElement('option');
      opt.value = newKey;
      opt.textContent = guessedName;
      importSlot.appendChild(opt);
    }
  } else {
    // Load into team slot
    const teamKeys = Object.keys(TEAMS);
    if (!teamKeys.includes(slot)) { statusEl.textContent = 'Unknown slot'; statusEl.className='modal-status err'; return; }
    // Preserve team metadata, replace members
    TEAMS[slot].members = members;
    targetSlot = slot;
    teamName = TEAMS[slot].name;
    // If player team, re-render editor
    if (slot === 'player') {
      renderRoster('player-roster', TEAMS.player.members);
      renderEditorRoster();
    }
    // Update opponent roster if currently selected
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
  // HiDPI/Retina support
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
  document.getElementById('stat-format').textContent = `${fmtLabel} ${boLabel}`;

  const circle = document.getElementById('win-circle');
  circle.className = `win-circle ${winPct>=55?'s-win':winPct<=45?'s-loss':'s-even'}`;

  // Win conditions
  const wc = document.getElementById('win-conditions');
  wc.innerHTML = '';
  const wcEntries = Object.entries(res.winConditions||{}).sort((a,b)=>b[1]-a[1]).slice(0,7);
  if (!wcEntries.length || !res.wins) { wc.innerHTML='<p style="color:var(--text-m);font-size:11px">No wins recorded</p>'; }
  else {
    const maxWC = wcEntries[0][1]; // normalize to max for bar width
    for (const [cond,cnt] of wcEntries) {
      const barPct = Math.round(cnt/maxWC*100); // relative bar width
      const labelPct = Math.min(100, Math.round(cnt/total*100)); // % of all series
      const d = document.createElement('div');
      d.className='win-cond-row';
      d.innerHTML=`<div style="display:flex;justify-content:space-between"><span>${cond}</span><span style="color:var(--primary);font-family:var(--font-mono);font-weight:700">${labelPct}%</span></div><div class="win-cond-bar" style="width:${barPct}%"></div>`;
      wc.appendChild(d);
    }
  }

  const isDark = document.documentElement.dataset.theme!=='light';
  const gn=isDark?'#4ec994':'#2a9d6a', rd=isDark?'#f05464':'#d63048', gd=isDark?'#f5c542':'#c89a00';
  const pri=isDark?'#7c6af5':'#5b49d6';

  // Outcome split chart
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

  // Game length chart
  setTimeout(()=>{
    const td=res.turnDist||{};
    const turns=Object.keys(td).map(Number).sort((a,b)=>a-b);
    drawBarChart('turns-chart', turns.map(String), turns.map(t=>td[t]), pri);
  },60);

  addReplays(res.allLogs||[], oppKey);
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
// Wraps individual battles into a Bo series
// ============================================================
async function runBoSeries(numSeries, playerTeamKey, oppTeamKey, bo, onProgress) {
  const results = { wins:0, losses:0, draws:0, totalTurns:0, totalTrTurns:0, winConditions:{}, allLogs:[], turnDist:{} };
  let liveW=0, liveL=0;
  const BATCH = 20;

  for (let i=0; i<numSeries; i+=BATCH) {
    const bSize = Math.min(BATCH, numSeries-i);
    for (let j=0; j<bSize; j++) {
      // Play a series
      let seriesW=0, seriesL=0;
      const gamesNeeded = Math.ceil(bo/2);
      let gamesPlayed = 0;
      let seriesTurns=0, seriesTrTurns=0;

      while (seriesW<gamesNeeded && seriesL<gamesNeeded && gamesPlayed<bo) {
        const battle = simulateBattle(TEAMS[playerTeamKey], TEAMS[oppTeamKey]);
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

async function runAllMatchups(numSeries, bo, onProgress, onDone) {
  const _pKey = (typeof document !== 'undefined' && document.getElementById('player-select')?.value) || 'player';
  const opps = Object.keys(TEAMS).filter(k=>k!==_pKey);
  let done=0;
  for (const opp of opps) {
    const res = await runBoSeries(numSeries,_pKey,opp,bo,(cur,tot,w,l)=>{
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
  const playerKey = (document.getElementById('player-select')?.value) || 'player';
  const matBadge=document.getElementById('matrix-badge');
  if(matBadge) matBadge.textContent=`${currentFormat==='doubles'?'Doubles':'Singles'} · Bo${bo} · ${n} series`;

  const res = await runBoSeries(n,playerKey,oppKey,bo,(cur,tot,w,l)=>{
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

  await runAllMatchups(n,bo,(cur,tot,w,l)=>{
    totalW=w; totalL=l;
    setProgress(Math.round(cur/tot*100),`Running matchups… ${cur} / ${tot}`,w,l);
  },(opp,res)=>{
    // Store results globally
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
    // Generate pilot guide for this opponent
    generatePilotGuide(opp, res);
  });

  document.getElementById('progress-wrap').style.display='none';
  // Show PDF report button
  const pdfBtn = document.getElementById('pdf-report-btn');
  if (pdfBtn) pdfBtn.style.display = '';
  simRunning=false; this.disabled=false; document.getElementById('run-sim-btn').disabled=false;
});

// ============================================================
// PART 2: PILOT GUIDE GENERATOR
// ============================================================
// ─── April 2026 Usage Weights ─────────────────────────────────
const APRIL_2026_META_USAGE = {
  'Incineroar':62.4,'Sneasler':51.2,'Garchomp':48.7,'Whimsicott':44.1,
  'Kingambit':41.8,'Sinistcha':38.9,'Flutter Mane':36.2,'Pelipper':34.5,
  'Charizard-Mega-Y':33.1,'Tyranitar':31.4,'Farigiraf':29.8,'Basculegion':28.3,
  'Rotom-Wash':27.9,'Excadrill':26.1,'Amoonguss':24.7,'Dragonite':23.5,
  'Maushold':22.8,'Archaludon':21.4,'Gholdengo':19.6,'Iron Hands':18.9
};

// ─── Wolfe Coach Data ─────────────────────────────────────────
const WOLFE_LINES = {
  favorable:[
    "This is your matchup to win. Execute your gameplan — don't overthink it. Close it out.",
    "You've got the tools. Win conditions line up cleanly. Don't let them steal Game 1.",
    "Favorable means nothing if you don't respect their threats. Win early turns, convert the advantage."
  ],
  even:[
    "Coin flip on paper — but whoever leads better wins this. Lead selection is everything.",
    "Even matchup means skill gap decides it. Read their lead, deny their setup, execute cleaner.",
    "You'll see this at top cut. Don't auto-pilot. Every turn matters in a 50/50."
  ],
  risky:[
    "This is rough. Accept it. Your path to winning: deny their win condition turn 1.",
    "Uphill battle. Your only clean route is disruption. Speed control and Fake Out need to land right.",
    "I've seen worse odds win at Regionals. But you need to play perfect. No freebies."
  ],
  avoid:[
    "This matchup is bad. Have a plan before you sit down.",
    "Don't tilt — but this is genuinely difficult. Deny their best 4 completely.",
    "Some matchups you just have to survive. Know your outs."
  ]
};

const ARCHETYPE_COACH = {
  sun:{label:'Sun Offense',
    plan:"Deny weather turn 1. Lead Incineroar + Rotom-Wash: Fake Out the support, Thunderbolt the Drought setter. No Drought = 50% damage loss. Tailwind wins from there.",
    threats:"Charizard-Y + Venusaur under sun hit brutal spread. Chlorophyll Venusaur outspeeds everything. Priority: Charizard-Y setter first.",
    leads:"Incineroar + Rotom-Wash. Fake Out support, Thunderbolt Charizard. If they lead Sneasler, pivot Incineroar.",
    late:"Once weather is denied your speed advantage takes over. Tailwind + Garchomp spread cleans up.",
    tera:"Watch Tera Grass on Charizard-Y (removes Water weakness). Tera Poison on Sneasler blocks Spore."
  },
  rain:{label:'Rain Offense',
    plan:"Target Pelipper turn 1. No rain = Electro Shot charges, Last Respects is 50 BP. Rotom-Wash threatens Pelipper hard.",
    threats:"Basculegion Last Respects hits 300 BP at 5 KOs. Prevent their first KO. Archaludon Electro Shot fires instantly in rain.",
    leads:"Incineroar + Rotom-Wash. Fake Out Liepard, Thunderbolt Pelipper. If they Protect Pelipper, U-turn and reset.",
    late:"Under Tailwind you outspeed everything. Garchomp EQ + Rock Slide for spread cleanup.",
    tera:"Tera Water Basculegion removes Rock weakness. Rock Slide is still the answer."
  },
  trick_room:{label:'Trick Room',
    plan:"Prankster Encore via Whimsicott locks their sweeper before it moves. Fake Out the TR setter turn 1. Arcanine Extreme Speed has priority even under TR.",
    threats:"Cofagrigus with Mental Herb ignores your first disruption. Expect TR up turn 1 regardless — have Extreme Speed ready.",
    leads:"Arcanine + Whimsicott. Fake Out setter, Encore sweeper. If Mental Herb fires, Extreme Speed is priority under TR.",
    late:"If TR goes up, Extreme Speed still moves first. Amoonguss Spore on their sweeper buys turns.",
    tera:"Tera Ghost on Cofagrigus removes Fighting coverage. Knock Off strips Mental Herb first."
  },
  sand:{label:'Sand Offense',
    plan:"Kill Tyranitar before Sand Rush fires. Rotom-Wash is sand-immune via Levitate. Disrupt T-tar + Excadrill immediately.",
    threats:"Sand Rush Excadrill doubles to 200+ speed under sand. Dragon Darts bypasses Follow Me. Priority: Tyranitar first.",
    leads:"Incineroar + Garchomp. Fake Out Tyranitar, EQ threatens Excadrill. Rocky Helmet chip on contact.",
    late:"Outside of sand your speed advantage takes over. Once T-tar is down, cleanup is clean.",
    tera:"Excadrill may Tera Flying to remove Ground immunity — Iron Head becomes the threat. Rotom Thunderbolt still works."
  },
  veil:{label:'Aurora Veil',
    plan:"KO Froslass before Veil goes up. Fake Out Froslass turn 1. Snow Warning fires immediately — 1 turn window.",
    threats:"Dragonite behind Veil sets Dragon Dance freely. Kingambit stacks Supreme Overlord. Veil halves your damage for 8 turns.",
    leads:"Incineroar + Rotom-Wash. Fake Out Froslass. If they lead Dragonite to bait, Thunderbolt it instead.",
    late:"Veil expires after 8 turns. Stall if needed. Amoonguss Spore on Dragonite buys turns.",
    tera:"Kingambit Tera Dark boosts Kowtow Cleave. Protect scout every turn against Supreme Overlord."
  },
  balance:{label:'Balance',
    plan:"No single win condition to shut down — map their team in preview and identify their Tera user. Fake Out chains deny setup leads.",
    threats:"Last Respects Basculegion snowballs on KOs. Sneasler Unburden after White Herb is near-uncatchable. Remove their Fake Out check first.",
    leads:"Incineroar + Garchomp. Intimidate cripples physical attackers. EQ threatens spread. Rocky Helmet punishes contact.",
    late:"Your speed advantage wins the endgame. Keep fast threats healthy for cleanup.",
    tera:"Unexpected Tera is how balance teams steal games. Identify their Tera target in preview."
  },
  offense:{label:'Hyper Offense',
    plan:"Speed race. Fake Out disrupts their first turn completely. Chain Intimidates to cripple physical damage. Your sustained damage outlasts their burst.",
    threats:"Unburden Sneasler after White Herb is top speed tier. Fake Out it every turn. Kingambit Defiant punishes Intimidate — use Parting Shot carefully.",
    leads:"Incineroar + Arcanine. Double Intimidate turn 1. Extreme Speed for priority KOs.",
    late:"If game goes long you have better sustained damage. Weather them out.",
    tera:"Sneasler may Tera Poison for Spore immunity. Tera Dark Kingambit amps Kowtow Cleave. Protect scout both."
  }
};

function getArchetypeCoach(oppKey) {
  const team = TEAMS[oppKey];
  const keyL = (oppKey||'').toLowerCase();
  const style = (((team&&(team.style||team.archetype))||'') + ' ' + keyL).toLowerCase();
  if (style.includes('sun') || keyL.includes('houndoom')) return ARCHETYPE_COACH.sun;
  if (style.includes('rain')) return ARCHETYPE_COACH.rain;
  if (style.includes('trick') || style.includes('cofagrigus') || keyL.includes('cofagrigus')) return ARCHETYPE_COACH.trick_room;
  if (style.includes('sand') || keyL.includes('sand')) return ARCHETYPE_COACH.sand;
  if (style.includes('veil') || keyL.includes('veil') || keyL.includes('froslass')) return ARCHETYPE_COACH.veil;
  if (style.includes('offense') || keyL.includes('kingambit') || keyL.includes('sneasler') || keyL.includes('dragonite')) return ARCHETYPE_COACH.offense;
  return ARCHETYPE_COACH.balance;
}

function generatePilotGuide(oppKey, results) {
  const el = document.getElementById('pilot-content');
  if (!el) return;
  const emptyEl = el.querySelector('.pilot-empty');
  if (emptyEl) emptyEl.remove();

  const total = results.wins + results.losses + (results.draws||0);
  const winPct = Math.round(results.winRate * 100);
  const oppTeam = TEAMS[oppKey];
  const teamName = oppTeam ? oppTeam.name : oppKey;
  const arch = getArchetypeCoach(oppKey);
  const playerKey = document.getElementById('player-select')?.value || 'player';
  const playerTeam = TEAMS[playerKey] || TEAMS.player;

  let verdict, verdictClass, toneKey;
  if (winPct >= 65) { verdict = '✅ Favorable'; verdictClass = 'verdict-favorable'; toneKey = 'favorable'; }
  else if (winPct >= 45) { verdict = '⚖️ Even'; verdictClass = 'verdict-even'; toneKey = 'even'; }
  else if (winPct >= 30) { verdict = '⚠️ Risky'; verdictClass = 'verdict-risky'; toneKey = 'risky'; }
  else { verdict = '🔴 Avoid'; verdictClass = 'verdict-avoid'; toneKey = 'avoid'; }

  const wolfeLine = WOLFE_LINES[toneKey][Math.floor(Math.random() * 3)];
  const wcEntries = Object.entries(results.winConditions||{}).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const maxWC = wcEntries.length ? wcEntries[0][1] : 1;

  const oppRosterHTML = (oppTeam ? oppTeam.members : []).map(m => {
    const usage = APRIL_2026_META_USAGE[m.name] || null;
    const bstat = BASE_STATS[m.name] || {};
    const types = bstat.types || [];
    const typeChips = types.map(t => {
      const clr = (typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[t]) || '#888';
      return `<span style="background:${clr}22;color:${clr};border:1px solid ${clr}44;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600">${t}</span>`;
    }).join(' ');
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">
      <img src="${getSpriteUrl(m.name)}" style="width:52px;height:52px;image-rendering:pixelated;flex-shrink:0" loading="lazy" onerror="this.style.opacity=.2">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:13px">${m.name}</span>
          ${usage ? `<span style="font-size:10px;color:var(--primary);font-weight:700">${usage}% meta</span>` : ''}
          <span style="font-size:10px;color:var(--text-m)">${m.item||''}</span>
        </div>
        <div style="font-size:11px;color:var(--text-m);margin:2px 0">${m.ability||''} · ${m.nature||''}</div>
        <div style="font-size:11px;color:var(--text-f);margin:1px 0;font-style:italic">${m.role||''}</div>
        <div style="font-size:11px;color:var(--text-m)">${(m.moves||[]).join(' · ')}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${typeChips}</div>
      </div>
    </div>`;
  }).join('');

  const circleClass = winPct >= 55 ? 's-win' : winPct <= 45 ? 's-loss' : 's-even';

  const card = document.createElement('div');
  card.className = 'pilot-card';
  card.style.cssText = 'border-left:3px solid var(--primary);margin-bottom:16px';
  card.innerHTML = `
    <div style="background:linear-gradient(135deg,var(--surface),var(--surface-2,#1e1e2e));border-radius:8px 8px 0 0;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1">
        <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:2px">🏆 COACH WOLFE — MATCHUP BRIEF</div>
        <div style="font-size:16px;font-weight:700">vs ${teamName} <span style="font-size:12px;color:var(--text-m)">[${arch.label}]</span></div>
      </div>
      <span class="pilot-verdict ${verdictClass}">${verdict}</span>
    </div>

    <div style="padding:10px 16px;background:var(--surface);border-bottom:1px solid var(--border);font-style:italic;color:var(--text-m);font-size:13px">
      "${wolfeLine}"
    </div>

    <div style="padding:14px 16px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
        <div>
          <div class="win-circle ${circleClass}" style="width:72px;height:72px;margin-bottom:4px">
            <span class="win-pct" style="font-size:18px">${winPct}</span>
            <span class="win-label">Win %</span>
          </div>
          <div style="font-size:11px;color:var(--text-m)">${results.wins}W · ${results.losses}L · ${total} series</div>
        </div>
        ${wcEntries.length ? `<div style="flex:1;min-width:180px">
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:8px">🏁 WIN CONDITIONS</div>
          ${wcEntries.map(([cond,cnt]) => `
            <div class="pilot-wc-row" style="margin-bottom:5px">
              <span style="font-size:11px">${cond}</span>
              <div class="pilot-wc-bar-wrap"><div class="pilot-wc-bar" style="width:${Math.round(cnt/maxWC*100)}%"></div></div>
              <span style="font-size:10px;color:var(--primary);font-weight:700;white-space:nowrap">${Math.round(cnt/total*100)}%</span>
            </div>`).join('')}
        </div>` : ''}
      </div>

      <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:8px">📋 OPPONENT ROSTER</div>
      ${oppRosterHTML}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:5px">⚔️ GAME PLAN</div>
          <p style="font-size:12px;line-height:1.6;margin:0 0 10px;color:var(--text)">${arch.plan}</p>
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:#e05060;margin-bottom:5px">⚠️ THREATS</div>
          <p style="font-size:12px;line-height:1.6;margin:0;color:var(--text)">${arch.threats}</p>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:5px">🎯 LEAD SELECTION</div>
          <p style="font-size:12px;line-height:1.6;margin:0 0 10px;color:var(--text)">${arch.leads}</p>
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--primary);margin-bottom:5px">🔄 LATE-GAME</div>
          <p style="font-size:12px;line-height:1.6;margin:0 0 10px;color:var(--text)">${arch.late}</p>
          <div style="font-size:10px;font-weight:800;letter-spacing:1px;color:#a860e0;margin-bottom:5px">💎 TERA WATCH</div>
          <p style="font-size:12px;line-height:1.6;margin:0;color:var(--text)">${arch.tera}</p>
        </div>
      </div>
    </div>`;

  el.appendChild(card);
  document.querySelector('[data-tab="pilot"]')?.click();
}

// ============================================================
// PART 3: PDF REPORT BUILDER
// ============================================================
document.getElementById('pdf-report-btn')?.addEventListener('click', generatePDFReport);

function generatePDFReport() {
  const results = window.lastSimResults || {};
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const playerKey = document.getElementById('player-select')?.value || 'player';
  const playerTeam = TEAMS[playerKey] || TEAMS.player;
  const bo = currentBo;

  const playerRosterRows = playerTeam.members.map(m => {
    const evStr = m.evs ? Object.entries(m.evs).filter(([,v])=>v>0).map(([k,v])=>`${v} ${k.toUpperCase()}`).join(', ') : '—';
    return `<tr><td style="font-weight:700">${m.name}</td><td>${m.item||'—'}</td><td>${m.ability||'—'}</td><td>${m.nature||'—'}</td><td style="font-size:10px">${evStr}</td><td style="font-size:10px">${(m.moves||[]).join(', ')}</td><td style="font-size:10px;font-style:italic;color:#555">${m.role||'—'}</td></tr>`;
  }).join('');

  const speedRows = [...playerTeam.members].map(m => {
    const base = BASE_STATS[m.name]; if (!base) return null;
    const nat = {Timid:1.1,Jolly:1.1,Naive:1.1,Hasty:1.1,Modest:0.9,Adamant:0.9,Bold:0.9,Careful:0.9,Calm:0.9,Quiet:0.9,Relaxed:0.9,Sassy:0.9}[m.nature]||1;
    const ev = (m.evs&&m.evs.spe)||0;
    const spe = Math.floor(Math.floor((2*base.spe+31+Math.floor(ev/4))*50/100+5)*nat);
    const scarf = m.item==='Choice Scarf' ? Math.floor(spe*1.5) : null;
    return {name:m.name,spe,scarf,item:m.item||''};
  }).filter(Boolean).sort((a,b)=>b.spe-a.spe);
  const speedHTML = speedRows.map((s,i)=>`<tr><td style="text-align:center">${i+1}</td><td style="font-weight:700">${s.name}</td><td style="text-align:center">${s.spe}</td><td style="text-align:center;color:#0066cc">${s.scarf||'—'}</td><td style="font-size:10px;color:#555">${s.item}</td></tr>`).join('');

  const allEntries = Object.entries(results);
  let fav=0,even_=0,risky=0,avoid=0,totalSeries=0;
  allEntries.forEach(([,r])=>{const w=Math.round(r.winRate*100),t=r.wins+r.losses+(r.draws||0);totalSeries+=t;if(w>=65)fav++;else if(w>=45)even_++;else if(w>=30)risky++;else avoid++;});

  const summaryRows = allEntries.sort((a,b)=>b[1].winRate-a[1].winRate).map(([opp,res])=>{
    const winPct=Math.round(res.winRate*100),total=res.wins+res.losses+(res.draws||0);
    const verdict=winPct>=65?'Favorable':winPct>=45?'Even':winPct>=30?'Risky':'Avoid';
    const vColor=winPct>=65?'#155724':winPct>=45?'#856404':winPct>=30?'#721c24':'#6c1a1a';
    const wColor=winPct>=55?'#155724':winPct<=45?'#721c24':'#856404';
    const wcTop=Object.entries(res.winConditions||{}).sort((a,b)=>b[1]-a[1])[0];
    return `<tr><td style="font-weight:700">${TEAMS[opp]?.name||opp}</td><td style="text-align:center;font-weight:800;color:${wColor}">${winPct}%</td><td style="text-align:center;color:#155724">${res.wins}</td><td style="text-align:center;color:#721c24">${res.losses}</td><td style="text-align:center">${total}</td><td style="text-align:center">${res.avgTurns?.toFixed(1)||'—'}</td><td style="font-size:10px;color:${vColor};font-weight:700">${verdict}</td><td style="font-size:10px;color:#555">${wcTop?wcTop[0]:'—'}</td></tr>`;
  }).join('');

  const detailSections = allEntries.sort((a,b)=>b[1].winRate-a[1].winRate).map(([opp,res])=>{
    const winPct=Math.round(res.winRate*100),total=res.wins+res.losses+(res.draws||0);
    const oppTeam=TEAMS[opp];
    const arch=getArchetypeCoach(opp);
    const verdict=winPct>=65?'FAVORABLE':winPct>=45?'EVEN':winPct>=30?'RISKY':'AVOID';
    const vColor=winPct>=65?'#155724':winPct>=45?'#856404':winPct>=30?'#721c24':'#6c1a1a';
    const vBg=winPct>=65?'#d4edda':winPct>=45?'#fff3cd':winPct>=30?'#f8d7da':'#f5c6cb';
    const wolfeLine=WOLFE_LINES[winPct>=65?'favorable':winPct>=45?'even':winPct>=30?'risky':'avoid'][0];
    const oppRoster=(oppTeam?oppTeam.members:[]).map(m=>{
      const usage=APRIL_2026_META_USAGE[m.name];
      const evStr=m.evs?Object.entries(m.evs).filter(([,v])=>v>0).map(([k,v])=>`${v} ${k.toUpperCase()}`).join(', '):'—';
      return `<tr><td style="font-weight:700">${m.name}</td><td>${m.item||'—'}</td><td>${m.ability||'—'}</td><td>${m.nature||'—'}</td><td style="font-size:10px">${evStr}</td><td style="font-size:10px">${(m.moves||[]).join(', ')}</td><td style="font-size:10px;color:#0066cc">${usage?usage+'%':'—'}</td><td style="font-size:10px;font-style:italic">${m.role||'—'}</td></tr>`;
    }).join('');
    const wcEntries=Object.entries(res.winConditions||{}).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const wcRows=wcEntries.map(([c,n])=>`<tr><td>${c}</td><td style="text-align:center;font-weight:700;color:#0066cc">${Math.round(n/total*100)}%</td><td style="text-align:center">${n}</td></tr>`).join('');
    return `<div style="page-break-inside:avoid;margin-bottom:22px;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="background:#1a1a2e;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:10px;letter-spacing:1px;color:#a0a0c0;margin-bottom:2px">${arch.label} · VGC Doubles</div>
        <div style="font-size:15px;font-weight:700">vs ${oppTeam?.name||opp}</div></div>
        <div style="text-align:right">
          <span style="background:${vBg};color:${vColor};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800">${verdict}</span>
          <div style="font-size:22px;font-weight:900;margin-top:2px">${winPct}%</div>
          <div style="font-size:10px;color:#ccc">${res.wins}W / ${res.losses}L / ${total} series</div>
        </div>
      </div>
      <div style="padding:8px 14px;background:#f9f9fc;border-bottom:1px solid #e0e0e0;font-style:italic;font-size:11px;color:#444">Coach Wolfe: "${wolfeLine}"</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div style="padding:10px 14px;border-right:1px solid #eee">
          <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#0066cc;margin-bottom:4px">GAME PLAN</div>
          <p style="font-size:11px;line-height:1.5;margin:0 0 8px;color:#333">${arch.plan}</p>
          <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#cc2200;margin-bottom:4px">THREATS</div>
          <p style="font-size:11px;line-height:1.5;margin:0;color:#333">${arch.threats}</p>
        </div>
        <div style="padding:10px 14px">
          <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#0066cc;margin-bottom:4px">LEAD SELECTION</div>
          <p style="font-size:11px;line-height:1.5;margin:0 0 8px;color:#333">${arch.leads}</p>
          <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#5500aa;margin-bottom:4px">TERA WATCH</div>
          <p style="font-size:11px;line-height:1.5;margin:0 0 8px;color:#333">${arch.tera}</p>
          <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#007700;margin-bottom:4px">LATE-GAME</div>
          <p style="font-size:11px;line-height:1.5;margin:0;color:#333">${arch.late}</p>
        </div>
      </div>
      ${oppRoster ? `<div style="padding:10px 14px;border-top:1px solid #eee">
        <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#0066cc;margin-bottom:5px">OPPONENT ROSTER + April 2026 Usage</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="background:#f0f0f8"><th style="text-align:left;padding:3px 5px">Pokémon</th><th>Item</th><th>Ability</th><th>Nature</th><th>EVs</th><th>Moves</th><th>Usage%</th><th>Role</th></tr></thead>
          <tbody>${oppRoster}</tbody></table></div>` : ''}
      ${wcRows ? `<div style="padding:10px 14px;border-top:1px solid #eee">
        <div style="font-size:9px;font-weight:800;letter-spacing:1px;color:#0066cc;margin-bottom:5px">WIN CONDITIONS</div>
        <table style="width:50%;border-collapse:collapse;font-size:10px">
          <thead><tr style="background:#f0f0f8"><th style="text-align:left;padding:3px 5px">Condition</th><th style="text-align:center">Rate</th><th style="text-align:center">Count</th></tr></thead>
          <tbody>${wcRows}</tbody></table></div>` : ''}
    </div>`;
  }).join('');

  const noDataWarning = allEntries.length === 0
    ? '<div style="margin:20px 0;padding:14px;background:#fff3cd;border-radius:6px;font-size:13px;color:#856404">⚠️ Run "Run All Matchups" first to populate the full report with matchup data.</div>'
    : '';

  const reportHTML = `<!DOCTYPE html><html><head><title>Champions Sim 2026 — ${playerTeam.name}</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;padding:20px;color:#111;background:#fff}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}
    thead tr{background:#1a1a2e!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{body{padding:0} @page{margin:12mm} div{page-break-inside:avoid}}
  </style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1a1a2e;padding-bottom:12px;margin-bottom:20px">
    <div><div style="font-size:22px;font-weight:900;color:#1a1a2e">CHAMPIONS SIM 2026</div>
    <div style="font-size:12px;color:#555">VGC Battle Analysis — Reg M-A · ${date} · Bo${bo}</div></div>
    <div style="text-align:right"><div style="font-size:11px;color:#777">YOUR TEAM</div>
    <div style="font-size:15px;font-weight:800;color:#1a1a2e">${playerTeam.name}</div></div>
  </div>

  <div style="margin-bottom:18px">
    <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#1a1a2e;margin-bottom:6px">YOUR TEAM ROSTER</div>
    <table><thead><tr><th style="text-align:left;padding:5px 7px">Pokémon</th><th>Item</th><th>Ability</th><th>Nature</th><th>EVs</th><th>Moves</th><th>Role</th></tr></thead>
    <tbody>${playerRosterRows}</tbody></table>
  </div>

  <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;margin-bottom:18px">
    <div><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#1a1a2e;margin-bottom:6px">SPEED TIERS</div>
    <table style="width:auto"><thead><tr><th style="text-align:center;padding:4px 8px">#</th><th style="text-align:left">Pokémon</th><th style="text-align:center">Spe</th><th style="text-align:center">+Scarf</th><th>Item</th></tr></thead>
    <tbody>${speedHTML}</tbody></table></div>
    <div><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#1a1a2e;margin-bottom:6px">MATCHUP OVERVIEW</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:320px">
      ${[['✅ Favorable',fav,'#155724','#d4edda'],['⚖️ Even',even_,'#856404','#fff3cd'],['⚠️ Risky',risky,'#721c24','#f8d7da'],['🔴 Avoid',avoid,'#6c1a1a','#f5c6cb']].map(([l,n,c,bg])=>`<div style="background:${bg};border-radius:6px;padding:8px;text-align:center"><div style="font-size:20px;font-weight:900;color:${c}">${n}</div><div style="font-size:10px;color:${c};font-weight:700">${l}</div></div>`).join('')}
    </div>
    <div style="font-size:11px;color:#555;margin-top:8px">Total series simulated: <strong>${totalSeries}</strong></div></div>
  </div>

  ${noDataWarning}

  ${summaryRows ? `<div style="margin-bottom:18px">
    <div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#1a1a2e;margin-bottom:6px">MATCHUP SUMMARY</div>
    <table><thead><tr><th style="text-align:left;padding:5px 7px">Opponent</th><th>Win%</th><th>W</th><th>L</th><th>Total</th><th>Avg Turns</th><th>Verdict</th><th>Top Win Con</th></tr></thead>
    <tbody>${summaryRows}</tbody></table></div>` : ''}

  ${detailSections ? `<div><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#1a1a2e;margin-bottom:10px">DETAILED MATCHUP ANALYSIS — Coach Wolfe Pilot Briefs</div>${detailSections}</div>` : ''}

  <div style="border-top:1px solid #ddd;padding-top:8px;margin-top:16px;font-size:10px;color:#888;text-align:center">Champions Sim 2026 · Reg M-A · Generated ${date} · For competitive prep use only</div>
  </body></html>`;

  const w = window.open('','_blank','width=1100,height=900');
  if (!w) { alert('Allow popups to view the PDF report.'); return; }
  w.document.write(reportHTML);
  w.document.close();
  w.focus();
  setTimeout(()=>{ w.print(); }, 600);
}


// ============================================================
// PART 4: SERIES SUMMARY MODE (Replay Log)
// ============================================================
let replayMode = 'log'; // 'log' or 'summary'

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
    const draws = total - wins - losses;
    const winPct = total ? Math.round(wins/total*100) : 0;

    // Key KO = first fainted found in the log
    let keyKO = '—';
    for (const game of logs) {
      const faintedLine = (game.log || []).find(l => l.includes('fainted'));
      if (faintedLine) {
        const match = faintedLine.match(/(\w[\w\s-]+)\s+fainted/);
        if (match) { keyKO = match[1].trim(); break; }
      }
    }

    // Top win condition
    const wcTop = Object.entries(res.winConditions || {}).sort((a,b)=>b[1]-a[1])[0];
    const winCond = wcTop ? wcTop[0] : '—';

    // Verdict color
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
  // Approximate Lv50 speed: floor((2*base + 31 + ev/4) * 50/100 + 5) * nature
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

// Speed tier sections are appended by renderSpeedTiersForGrid() which is called after renderTeamsGrid()
function renderSpeedTiersForGrid() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.team-full-card');
  const teamKeys = Object.keys(TEAMS);
  cards.forEach((card, idx) => {
    const key = teamKeys[idx];
    const team = TEAMS[key];
    if (!team || !team.members) return;
    // Remove existing speed tier if re-rendering
    const existing = card.querySelector('.speed-tier-section');
    if (existing) existing.remove();
    card.insertAdjacentHTML('beforeend', buildSpeedTierHTML(team.members));
  });
}

// ============================================================
// PART 5B: ROLE COVERAGE CHECKER
// ============================================================
const COVERAGE_CHECKS = [
  { label: 'Fake Out', check: m => m.moves && m.moves.includes('Fake Out') },
  { label: 'Trick Room Counter', check: m => m.moves && (m.moves.includes('Taunt') || m.moves.includes('Imprison') || m.moves.includes('Tailwind') || m.moves.includes('Icy Wind')) },
  { label: 'Redirection', check: m => m.moves && (m.moves.includes('Follow Me') || m.moves.includes('Rage Powder')) },
  { label: 'Priority', check: m => m.moves && (m.moves.includes('Extreme Speed') || m.moves.includes('Fake Out') || m.moves.includes('Aqua Jet') || m.moves.includes('Sucker Punch')) },
  { label: 'Weather Setter', check: m => m.ability && (m.ability === 'Drought' || m.ability === 'Drizzle' || m.ability === 'Sand Stream' || m.ability === 'Snow Warning') }
];

function renderCoverageWidget() {
  const el = document.getElementById('coverage-items');
  if (!el) return;
  const members = TEAMS.player.members;
  el.innerHTML = COVERAGE_CHECKS.map(chk => {
    const covered = members.some(chk.check);
    return `<div class="coverage-item ${covered ? 'coverage-ok' : 'coverage-miss'}">
      <span>${covered ? '✓' : '✗'}</span>
      <span>${chk.label}</span>
    </div>`;
  }).join('');
}

renderCoverageWidget();

// Render speed tiers for initial teams grid
renderSpeedTiersForGrid();

// Coverage widget is updated directly inside saveEdits() above

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
  // Check if player team has SE coverage (moves that hit the threat's types SE)
  const playerMoves = TEAMS.player.members.flatMap(m => m.moves || []);
  const playerSpeeds = TEAMS.player.members.map(m => getEffectiveSpe(m));
  const maxPlayerSpe = Math.max(...playerSpeeds);

  // SE coverage check
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

  // Speed advantage check
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

// ============================================================
// PART 4: SERIES SUMMARY — RE-RENDER ON IMPORT SLOT CLICK
// ============================================================
// (Series Summary is already handled by the patched renderReplays above)


// ─── Your Team Selector ───────────────────────────────────────
(function() {
  const sel = document.getElementById('player-select');
  if (!sel) return;
  sel.addEventListener('change', function() {
    const key = this.value;
    const team = TEAMS[key];
    if (!team) return;
    const titleEl = document.querySelector('.player-card .card-title');
    if (titleEl) titleEl.textContent = team.name;
    renderRoster('player-roster', team.members);
    renderCoverageWidget && renderCoverageWidget();
  });
})();
