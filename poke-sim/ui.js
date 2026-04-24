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
// GITHUB WRITE-BACK (TEAMS -> poke-sim/data.js)
// ============================================================
let DATA_JS_SHA = null;

async function fetchDataJsSha() {
  if (DATA_JS_SHA) return DATA_JS_SHA;
  const tokenInput = document.getElementById('gh-token-input');
  if (!tokenInput) return null;
  const token = tokenInput.value.trim();
  if (!token) return null;

  const statusEl = document.getElementById('gh-sync-status');
  try {
    const resp = await fetch('https://api.github.com/repos/alfredocox/Pokemon-Champions-Sim-Planner/contents/poke-sim/data.js', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const json = await resp.json();
    DATA_JS_SHA = json.sha;
    if (statusEl) statusEl.textContent = 'GitHub: ready (SHA cached)';
    return DATA_JS_SHA;
  } catch (e) {
    console.warn('[GitHub] Failed to fetch data.js SHA', e);
    if (statusEl) statusEl.textContent = 'GitHub: auth or network error';
    return null;
  }
}

function serializeTeamsBlock() {
  // JSON is valid JS literal; safe as a const assignment
  return 'const TEAMS = ' + JSON.stringify(TEAMS, null, 2) + ';\n';
}

async function saveTeamsToGitHub(reason) {
  const tokenInput = document.getElementById('gh-token-input');
  if (!tokenInput) return; // UI not present
  const token = tokenInput.value.trim();
  const statusEl = document.getElementById('gh-sync-status');
  if (!token) {
    if (statusEl) statusEl.textContent = 'GitHub: no token entered (local-only change)';
    return;
  }

  const sha = await fetchDataJsSha();
  if (!sha) return;

  try {
    // Get current data.js content
    const respGet = await fetch('https://api.github.com/repos/alfredocox/Pokemon-Champions-Sim-Planner/contents/poke-sim/data.js', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!respGet.ok) throw new Error(`GET failed: ${respGet.status}`);
    const json = await respGet.json();
    const content = atob(json.content.replace(/\n/g, ''));
    const newTeamsBlock = serializeTeamsBlock();

    // Replace const TEAMS = { ... };
    const replaced = content.replace(
      /const TEAMS\s*=\s*\{[\s\S]*?\};\s*/m,
      newTeamsBlock
    );
    // UTF-8 safe base64 encoding — handles é, —, · and all non-ASCII chars
    const bytes = new TextEncoder().encode(replaced);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    const b64 = btoa(binary);

    const respPut = await fetch('https://api.github.com/repos/alfredocox/Pokemon-Champions-Sim-Planner/contents/poke-sim/data.js', {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `chore: update TEAMS (${reason || 'Champions Sim'})`,
        content: b64,
        sha: json.sha
      })
    });
    if (!respPut.ok) throw new Error(`PUT failed: ${respPut.status}`);
    const putJson = await respPut.json();
    DATA_JS_SHA = putJson.content?.sha || json.sha;
    if (statusEl) statusEl.textContent = 'GitHub: TEAMS saved ✓';
  } catch (e) {
    console.warn('[GitHub] Failed to save TEAMS', e);
    if (statusEl) statusEl.textContent = 'GitHub: save failed (see console)';
  }
}

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
  // Persist TEAMS back to GitHub if token is present
  saveTeamsToGitHub('Set Editor');
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
      members: members
    };
    targetSlot = newKey;
    teamName = guessedName;
    const oppSel = document.getElementById('opponent-select');
    if (oppSel) {
      const opt = document.createElement('option');
      opt.value = newKey;
      opt.textContent = guessedName;
      oppSel.appendChild(opt);
    }
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
    if (slot === 'player') {
      renderRoster('player-roster', TEAMS.player.members);
      renderEditorRoster();
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
  // Persist TEAMS back to GitHub if token is present
  saveTeamsToGitHub('Import Team');
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

  // Top leads from winning logs
  const leadCounts = {};
  const winLogs = (res.allLogs || []).filter(g => g.result === 'win');
  for (const game of winLogs) {
    const firstLines = (game.log || []).slice(0,8).join(' ');
    for (const m of TEAMS.player.members) {
      if (firstLines.includes(m.name)) leadCounts[m.name] = (leadCounts[m.name]||0)+1;
    }
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
async function runBoSeries(numSeries, playerTeamKey, oppTeamKey, bo, onProgress) {
  const results = { wins:0, losses:0, draws:0, totalTurns:0, totalTrTurns:0, winConditions:{}, allLogs:[], turnDist:{} };
  let liveW=0, liveL=0;
  const BATCH = 20;

  for (let i=0; i<numSeries; i+=BATCH) {
    const bSize = Math.min(BATCH, numSeries-i);
    for (let j=0; j<bSize; j++) {
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

// runAllMatchupsUI — UI wrapper; distinct from engine.js runAllMatchups
async function runAllMatchupsUI(numSeries, bo, onProgress, onDone) {
  const opps = Object.keys(TEAMS).filter(k=>k!=='player');
  let done=0;
  for (const opp of opps) {
    const res = await runBoSeries(numSeries,'player',opp,bo,(cur,tot,w,l)=>{
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

  const res = await runBoSeries(n,'player',oppKey,bo,(cur,tot,w,l)=>{
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

  const leadCounts = {};
  const allLogs = results.allLogs || [];
  const winLogs = allLogs.filter(g => g.result === 'win');
  for (const game of winLogs) {
    const log = game.log || [];
    const firstTurnLines = log.slice(0, 8).join(' ');
    for (const m of TEAMS.player.members) {
      if (firstTurnLines.includes(m.name)) {
        leadCounts[m.name] = (leadCounts[m.name] || 0) + 1;
      }
    }
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
      </div>
    </div>`;
  el.appendChild(card);
}

// ============================================================
// PART 3: PDF REPORT BUILDER
// ============================================================
document.getElementById('pdf-report-btn')?.addEventListener('click', generatePDFReport);

function generatePDFReport() {
  const container = document.getElementById('pdf-report-container');
  if (!container) return;

  const results = window.lastSimResults || {};
  const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const bo = currentBo;
  const fmt = currentFormat === 'doubles' ? 'Doubles' : 'Singles';

  const summaryRows = Object.entries(results).map(([opp, res]) => {
    const winPct = Math.round(res.winRate * 100);
    let verdict, verdictCls;
    if (winPct >= 65) { verdict = 'Favorable'; verdictCls = 'pdf-verdict-favorable'; }
    else if (winPct >= 45) { verdict = 'Even'; verdictCls = 'pdf-verdict-even'; }
    else if (winPct >= 30) { verdict = 'Risky'; verdictCls = 'pdf-verdict-risky'; }
    else { verdict = 'Avoid'; verdictCls = 'pdf-verdict-avoid'; }
    return `<tr>
      <td>${TEAMS[opp]?.name || opp}</td>
      <td><span class="${verdictCls}">${winPct}%</span></td>
      <td>${res.wins}</td><td>${res.losses}</td>
      <td><span class="${verdictCls}">${verdict}</span></td>
    </tr>`;
  }).join('');

  const detailSections = Object.entries(results).map(([opp, res]) => {
    const total = res.wins + res.losses + res.draws;
    const winPct = Math.round(res.winRate * 100);
    let verdict, verdictCls;
    if (winPct >= 65) { verdict = 'Favorable'; verdictCls = 'pdf-verdict-favorable'; }
    else if (winPct >= 45) { verdict = 'Even'; verdictCls = 'pdf-verdict-even'; }
    else if (winPct >= 30) { verdict = 'Risky'; verdictCls = 'pdf-verdict-risky'; }
    else { verdict = 'Avoid'; verdictCls = 'pdf-verdict-avoid'; }

    const wcEntries = Object.entries(res.winConditions || {}).sort((a,b) => b[1]-a[1]).slice(0,3);
    const wcText = wcEntries.map(([c,n]) => `${c} (${Math.round(n/total*100)}%)`).join(', ');

    const leadCounts = {};
    const winLogs = (res.allLogs || []).filter(g => g.result === 'win');
    for (const game of winLogs) {
      const firstLines = (game.log || []).slice(0,8).join(' ');
      for (const m of TEAMS.player.members) {
        if (firstLines.includes(m.name)) leadCounts[m.name] = (leadCounts[m.name]||0)+1;
      }
    }
    const leads = Object.entries(leadCounts).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);

    const lossSeries = (res.allLogs || []).filter(g => g.result === 'loss');
    const riskCounts = {};
    for (const game of lossSeries) {
      const kos = (game.log || []).filter(l => l.includes('fainted'));
      for (const ko of kos) {
        for (const m of (TEAMS[opp]?.members || [])) {
          if (ko.includes(m.name)) riskCounts[m.name] = (riskCounts[m.name]||0)+1;
        }
      }
    }
    const riskThreshold = Math.max(1, lossSeries.length * 0.4);
    const risks = Object.entries(riskCounts).filter(([,c])=>c>=riskThreshold).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);

    return `<div class="pdf-section">
      <div class="pdf-matchup-header">vs ${TEAMS[opp]?.name || opp}</div>
      <div class="pdf-win-rate">${winPct}%</div>
      <div style="margin-bottom:6px"><span class="${verdictCls}">${verdict}</span> · ${total} series · ${res.wins}W / ${res.losses}L</div>
      ${wcText ? `<div style="font-size:12px;margin-bottom:4px"><strong>Win Conditions:</strong> ${wcText}</div>` : ''}
      ${leads.length ? `<div style="font-size:12px;margin-bottom:4px"><strong>Recommended Leads:</strong> ${leads.join(' + ')}</div>` : ''}
      ${risks.length ? `<div style="font-size:12px"><strong>Key Risks:</strong> ${risks.join(', ')}</div>` : ''}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="pdf-title">Pokémon Champion 2026 — Match Report</div>
    <div class="pdf-subtitle">${date} · ${fmt} · Bo${bo} series</div>
    <div class="pdf-section">
      <strong style="font-size:14px">Summary</strong>
      <table class="pdf-table" style="margin-top:8px">
        <thead><tr><th>Opponent</th><th>Win Rate</th><th>Wins</th><th>Losses</th><th>Verdict</th></tr></thead>
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
    ${detailSections}
    <div style="font-size:11px;color:#888;margin-top:20px;border-top:1px solid #ccc;padding-top:8px">
      Generated by Pokémon Champion 2026 Simulator
    </div>`;

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
var COVERAGE_CHECKS = [
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
