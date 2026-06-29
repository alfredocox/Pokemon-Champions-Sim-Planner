// ============================================================
// POKE-E-SIM CHAMPION 2026 — UI CONTROLLER
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

// ============================================================
// CHAMPIONS SIM NAMESPACE - Issue #78
// Cross-module state and public helper APIs live here.
// ============================================================
var ChampionsSim = (typeof window !== 'undefined')
  ? (window.ChampionsSim = window.ChampionsSim || {})
  : {};
ChampionsSim.state = ChampionsSim.state || {};
ChampionsSim.bring = ChampionsSim.bring || {};
ChampionsSim.history = ChampionsSim.history || {};
ChampionsSim.internal = ChampionsSim.internal || {};
ChampionsSim.phase4c = ChampionsSim.phase4c || {};
ChampionsSim.phase4d = ChampionsSim.phase4d || {};
ChampionsSim.simLog = ChampionsSim.simLog || {};
ChampionsSim.strategy = ChampionsSim.strategy || {};
ChampionsSim.tests = ChampionsSim.tests || {};
ChampionsSim.logger = ChampionsSim.logger || { debug(){}, info(){}, warn(){}, error(){}, for(){ return this; } };
var UILog = ChampionsSim.logger.for ? ChampionsSim.logger.for('ui') : ChampionsSim.logger;

// App-shell API bridge. The real release/security implementations live in
// app_shell.js; these no-op fallbacks keep older isolated VM tests from loading
// ui.js without the documented app-shell script order.
var csSpriteFallbackAttrs = (typeof csSpriteFallbackAttrs === 'function') ? csSpriteFallbackAttrs : function() { return ''; };
var csInitPublicSecurityDelegates = (typeof csInitPublicSecurityDelegates === 'function') ? csInitPublicSecurityDelegates : function() {};
var csGetBuildId = (typeof csGetBuildId === 'function') ? csGetBuildId : function() { return 'v2.2.46-source-truth-packages'; };
var csApplyReleaseManifestToHeader = (typeof csApplyReleaseManifestToHeader === 'function') ? csApplyReleaseManifestToHeader : function() {};
var csReloadAfterBuildCacheReset = (typeof csReloadAfterBuildCacheReset === 'function') ? csReloadAfterBuildCacheReset : function() { return false; };
var csGetSourceUrl = (typeof csGetSourceUrl === 'function') ? csGetSourceUrl : function() { return null; };

function exposeLegacyWindowAlias(name, value) {
  if (typeof window === 'undefined') return;
  try {
    var desc = Object.getOwnPropertyDescriptor(window, name);
    if (desc) {
      if ('value' in desc && desc.value === value) return;
      if (desc.configurable || desc.writable) {
        window[name] = value;
        return;
      }
      return;
    }
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  } catch (e) {
    try { window[name] = value; } catch (_) {}
  }
}
function getWindowValue(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return Object.prototype.hasOwnProperty.call(window, name) ? window[name] : fallback;
}

function safeRemoveNode(node) {
  if (!node) return false;
  if (typeof node.remove === 'function') {
    node.remove();
    return true;
  }
  if (node.parentNode && typeof node.parentNode.removeChild === 'function') {
    node.parentNode.removeChild(node);
    return true;
  }
  return false;
}

function safeReplaceChild(parent, nextNode, prevNode) {
  if (!parent || !nextNode) return false;
  if (prevNode && typeof parent.replaceChild === 'function') {
    parent.replaceChild(nextNode, prevNode);
    return true;
  }
  if (prevNode) safeRemoveNode(prevNode);
  if (typeof parent.appendChild === 'function') {
    parent.appendChild(nextNode);
    return true;
  }
  return false;
}


async function csHardenClientState() {
  if (typeof Storage === 'undefined') return false;
  var buildId = csGetBuildId();
  var storedBuildId = null;
  try { storedBuildId = Storage.get('app:build-id'); } catch (e) {}
  if (storedBuildId === buildId) return false;

  try {
    Storage.del('strategy:report');
    Storage.del('sim_log:v1');
    Storage.del('app:build-id');
    if (typeof Storage.list === 'function') {
      Storage.list().forEach(function(key) {
        if (key.indexOf('champions_strategy_v1::') === 0) {
          Storage.del(key);
        }
      });
    }
    Storage.set('app:build-id', buildId);
  } catch (e) {
    UILog.warn('client-state hardening skipped', e);
    return false;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      var regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(function(reg) {
        return reg.unregister();
      }));
    }
  } catch (e) {
    UILog.warn('service worker cleanup skipped', e);
  }

  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      var cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(function(name) {
        return name.indexOf('champions-sim-') === 0 ? caches.delete(name) : Promise.resolve(false);
      }));
    }
  } catch (e) {
    UILog.warn('cache cleanup skipped', e);
  }

  return true;
}

// ---- Tabs ----
var _activeA11yTabId = null;
var _activeModalState = null;
function _getFocusableElements(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(function(el) { return !!el && !el.disabled && !el.hidden && el.getAttribute('aria-hidden') !== 'true'; });
}
function _focusFirstFocusable(root) {
  var items = _getFocusableElements(root);
  if (items.length && typeof items[0].focus === 'function') {
    items[0].focus();
    return items[0];
  }
  if (root && typeof root.focus === 'function') {
    root.focus();
    return root;
  }
  return null;
}
function _syncTabA11yState(activeTabId) {
  _activeA11yTabId = activeTabId;
  var mobileTabSelect = document.getElementById('mobile-tab-select');
  if (mobileTabSelect && mobileTabSelect.value !== activeTabId) mobileTabSelect.value = activeTabId;
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    var isActive = btn.dataset.tab === activeTabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.tabIndex = isActive ? 0 : -1;
  });
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    var panelTabId = panel.id ? panel.id.replace(/^tab-/, '') : '';
    var isActive = panelTabId === activeTabId;
    panel.classList.toggle('active', isActive);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    panel.hidden = !isActive;
    panel.tabIndex = isActive ? 0 : -1;
  });
}
function _activateTab(tabId, opts) {
  var btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  var panel = document.getElementById('tab-' + tabId);
  if (!btn || !panel) return false;
  _syncTabA11yState(tabId);
  btn.setAttribute('aria-controls', 'tab-' + tabId);
  if (!btn.id) btn.id = 'tab-btn-' + tabId;
  panel.setAttribute('aria-labelledby', btn.id);
  if ((tabId === 'replays' || tabId === 'replay') && typeof loadAnalysisHistory === 'function') {
    loadAnalysisHistory(typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player');
  }
  return true;
}
function _handleTabKeydown(ev) {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
  var idx = tabs.indexOf(ev.currentTarget || ev.target);
  if (idx < 0) return;
  var nextIdx = null;
  if (ev.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
  else if (ev.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
  else if (ev.key === 'Home') nextIdx = 0;
  else if (ev.key === 'End') nextIdx = tabs.length - 1;
  else if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    _activateTab(tabs[idx].dataset.tab, { focus: true });
    return;
  } else {
    return;
  }
  ev.preventDefault();
  tabs[nextIdx].focus();
  _activateTab(tabs[nextIdx].dataset.tab, { focus: true });
}
function initTabA11y() {
  var tablist = document.querySelector('.tab-nav');
  if (tablist) tablist.setAttribute('aria-label', 'Main sections');
  var mobileTabSelect = document.getElementById('mobile-tab-select');
  if (mobileTabSelect) {
    mobileTabSelect.value = (_activeA11yTabId || 'simulator');
    mobileTabSelect.addEventListener('change', function() {
      _activateTab(this.value, { focus: true });
    });
  }
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    var tabId = btn.dataset.tab;
    if (!btn.id) btn.id = 'tab-btn-' + tabId;
    btn.setAttribute('aria-controls', 'tab-' + tabId);
    btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
    btn.tabIndex = btn.classList.contains('active') ? 0 : -1;
    btn.addEventListener('click', function() { _activateTab(tabId, { focus: true }); });
    btn.addEventListener('keydown', _handleTabKeydown);
  });
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    var tabId = panel.id ? panel.id.replace(/^tab-/, '') : '';
    var linkedBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', linkedBtn ? linkedBtn.id : 'tab-btn-' + tabId);
    panel.setAttribute('aria-hidden', panel.classList.contains('active') ? 'false' : 'true');
    panel.hidden = !panel.classList.contains('active');
    panel.tabIndex = panel.classList.contains('active') ? 0 : -1;
  });
  if (_activeA11yTabId) _syncTabA11yState(_activeA11yTabId);
}
initTabA11y();

function _getModalDialog(overlay) {
  if (!overlay || typeof overlay.querySelector !== 'function') return null;
  return overlay.querySelector('.modal-box') || overlay.querySelector('.modal') || null;
}
function _openModalOverlay(overlayId, opts) {
  var overlay = document.getElementById(overlayId);
  if (!overlay) return null;
  var dialog = _getModalDialog(overlay);
  _activeModalState = {
    overlay: overlay,
    dialog: dialog,
    returnFocus: document.activeElement || null
  };
  overlay.style.display = 'flex';
  if (typeof overlay.setAttribute === 'function') overlay.setAttribute('aria-hidden', 'false');
  if (dialog && typeof dialog.setAttribute === 'function') {
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (opts && opts.labelledbyId) dialog.setAttribute('aria-labelledby', opts.labelledbyId);
    if (opts && opts.describedbyId) dialog.setAttribute('aria-describedby', opts.describedbyId);
    if (!dialog.hasAttribute || !dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  }
  var focusTarget = null;
  if (opts && opts.focusSelector && dialog && typeof dialog.querySelector === 'function') {
    focusTarget = dialog.querySelector(opts.focusSelector);
  }
  if (!focusTarget && dialog) {
    var focusables = _getFocusableElements(dialog);
    focusTarget = focusables.length ? focusables[0] : dialog;
  }
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus(); } catch (e) {}
  }
  return _activeModalState;
}
function _closeModalOverlay(overlayId, restoreFocus) {
  var overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.style.display = 'none';
    if (typeof overlay.setAttribute === 'function') overlay.setAttribute('aria-hidden', 'true');
  }
  var prev = _activeModalState && _activeModalState.returnFocus;
  _activeModalState = null;
  var focusTarget = restoreFocus || prev;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus(); } catch (e) {}
  }
}
function _handleModalKeydown(ev) {
  if (!_activeModalState || !_activeModalState.dialog) return;
  if (ev.key === 'Escape') {
    ev.preventDefault();
    ev.stopPropagation && ev.stopPropagation();
    if (_activeModalState.overlay && _activeModalState.overlay.id === 'confirm-modal') {
      _resolveConfirm(false);
    } else {
      _closeModalOverlay(_activeModalState.overlay && _activeModalState.overlay.id);
    }
    return;
  }
  if (ev.key !== 'Tab') return;
  var focusables = _getFocusableElements(_activeModalState.dialog);
  if (!focusables.length) {
    ev.preventDefault();
    if (typeof _activeModalState.dialog.focus === 'function') _activeModalState.dialog.focus();
    return;
  }
  var first = focusables[0];
  var last = focusables[focusables.length - 1];
  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault();
    first.focus();
  }
}
document.addEventListener('keydown', _handleModalKeydown, true);

// ---- Format Toggle (Doubles / Singles) ----
let currentFormat = 'doubles';
let currentRuleset = 'champions';
function getCurrentRuleset() {
  return currentRuleset === 'sv' ? 'sv' : 'champions';
}
function setCurrentRuleset(ruleset) {
  currentRuleset = (ruleset === 'sv') ? 'sv' : 'champions';
  ChampionsSim.state.ruleset = currentRuleset;
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('currentRuleset', currentRuleset);
  return currentRuleset;
}
function isTeamCompatibleWithCurrentRuleset(team) {
  var teamFormat = (team && team.format) || 'champions';
  return teamFormat === getCurrentRuleset();
}
function getActiveValidationFormat(team) {
  if (!isTeamCompatibleWithCurrentRuleset(team)) return 'champions';
  return getCurrentRuleset() === 'champions' ? 'champions' : 'vgc';
}
setCurrentRuleset(currentRuleset);
function setCurrentFormat(format) {
  currentFormat = (format === 'singles') ? 'singles' : 'doubles';
  // T9j.2 / #78 - expose for engine.js through the shared namespace.
  ChampionsSim.state.format = currentFormat;
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('currentFormat', currentFormat);
  return currentFormat;
}
setCurrentFormat(currentFormat);
document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setCurrentFormat(btn.dataset.fmt);
    const indicator = document.getElementById('fmt-indicator');
    if (currentFormat === 'doubles') {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/></svg> DOUBLES · CHAMPIONS · 4v4 · Spread moves active`;
    } else {
      indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/></svg> SINGLES · CHAMPIONS · 6v6 · No spread nerf`;
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
function _applySpreadLineToEvs(lineText, evs) {
  const parts = String(lineText || '').split('/').map(s => s.trim());
  for (const p of parts) {
    const m = p.match(/(\d+)\s+(\w+)/);
    if (m) {
      const val = parseInt(m[1]), stat = m[2].toLowerCase();
      const key = stat === 'spatk' || stat === 'spa' ? 'spa' :
                  stat === 'spdef' || stat === 'spd' ? 'spd' :
                  stat === 'speed' || stat === 'spe' ? 'spe' :
                  stat === 'attack' || stat === 'atk' ? 'atk' :
                  stat === 'defense' || stat === 'def' ? 'def' :
                  stat === 'hp' ? 'hp' : stat;
      if (key in evs) evs[key] = val;
    }
  }
}

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
    const importFormatSignals = {
      sawSpsLine: false,
      sawEvsLine: false,
      sawIvsLine: false
    };
    const moves = [];

    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('Ability:')) ability = l.replace('Ability:', '').trim();
      else if (l.startsWith('Level:')) level = parseInt(l.replace('Level:', '').trim()) || 50;
      else if (l.startsWith('Tera Type:')) tera = l.replace('Tera Type:', '').trim();
      else if (l.startsWith('SPs:')) {
        importFormatSignals.sawSpsLine = true;
        _applySpreadLineToEvs(l.replace('SPs:', ''), evs);
      }
      else if (l.startsWith('EVs:')) {
        importFormatSignals.sawEvsLine = true;
        _applySpreadLineToEvs(l.replace('EVs:', ''), evs);
      } else if (l.startsWith('IVs:')) {
        importFormatSignals.sawIvsLine = true;
      } else if (l.endsWith('Nature')) {
        nature = l.replace('Nature', '').trim();
      } else if (l.startsWith('- ')) {
        moves.push(l.replace('- ', '').trim());
      }
    }

    if (!rawName) continue;
    const member = { name: rawName, item, ability, level, nature, evs, moves, role: '', tera };
    if (importFormatSignals.sawSpsLine || importFormatSignals.sawEvsLine || importFormatSignals.sawIvsLine) {
      member.import_format_signals = importFormatSignals;
    }
    members.push(member);
  }
  return members;
}

function buildChampionImportGateErrors(members) {
  var errors = [];
  (members || []).forEach(function(member) {
    var name = member && member.name ? member.name : 'Pokemon';
    var signals = (member && member.import_format_signals) || {};
    var spreadOk = true;
    if (typeof spreadFitsChampions === 'function') spreadOk = spreadFitsChampions((member && member.evs) || {});
    else {
      var evsForCheck = (member && member.evs) || {};
      var totalForCheck = ['hp','atk','def','spa','spd','spe'].reduce(function(sum, stat) { return sum + (parseInt(evsForCheck[stat], 10) || 0); }, 0);
      spreadOk = totalForCheck <= 66 && ['hp','atk','def','spa','spd','spe'].every(function(stat) { return (parseInt(evsForCheck[stat], 10) || 0) <= 32; });
    }
    if (signals.sawEvsLine && !spreadOk) {
      errors.push(name + ': raw Showdown EVs are SV-format data; use Champion SPs or EV values within Champion SP caps.');
    }
    if (signals.sawIvsLine) {
      errors.push(name + ': IVs are not configurable in Champions; remove IVs before import.');
    }
    if (typeof validateChampionsSpread === 'function') {
      errors = errors.concat(validateChampionsSpread((member && member.evs) || {}, name));
    } else if (typeof spreadFitsChampions === 'function' && !spreadFitsChampions((member && member.evs) || {})) {
      errors.push(name + ': SP spread exceeds Champions caps (max 32 per stat, 66 total).');
    }
  });
  return errors;
}

function getChampionSpreadErrorsForTeam(team) {
  if (!team || team.format !== 'champions') return [];
  var errors = [];
  (team.members || []).forEach(function(member) {
    var name = member && member.name ? member.name : 'Pokemon';
    if (typeof validateChampionsSpread === 'function') {
      errors = errors.concat(validateChampionsSpread((member && member.evs) || {}, name));
    } else if (typeof spreadFitsChampions === 'function' && !spreadFitsChampions((member && member.evs) || {})) {
      errors.push(name + ': SP spread exceeds Champions caps (max 32 per stat, 66 total).');
    }
  });
  return errors;
}

function buildImportedTeamValidation(members, opts) {
  opts = opts || {};
  // Imports stay usable when source data is unavailable, but known illegal
  // species/form move rows are hard errors so they cannot enter the sim.
  var team = {
    name: opts.name || 'Imported Team',
    format: opts.format || 'champions',
    legality_status: 'unverified',
    members: members || []
  };
  var out = {
    valid: true,
    errors: [],
    warnings: [],
    sourceVersion: '',
    memberWarnings: {}
  };
  if ((opts.format || 'champions') === 'champions') {
    out.errors = out.errors.concat(buildChampionImportGateErrors(members));
  }
  if (typeof validateTeam === 'function') {
    try {
      var verdict = validateTeam(team, getActiveValidationFormat(team)) || {};
      out.errors = out.errors.concat(verdict.errors || []);
      out.warnings = out.warnings.concat(verdict.warnings || []);
    } catch (_e) {
      out.warnings.push('Team rules could not be fully checked.');
    }
  }
  var root = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : null);
  var simRoot = (typeof ChampionsSim !== 'undefined') ? ChampionsSim : (root && root.ChampionsSim);
  var api = simRoot && simRoot.moveLegality ? simRoot.moveLegality : null;
  if (!api || typeof api.validateMovesForSet !== 'function') {
    out.warnings.push('Showdown species and move legality data is not loaded.');
  } else {
    (members || []).forEach(function(member, idx) {
      var checks = api.validateMovesForSet(member || {});
      checks.forEach(function(row) {
        if (!out.sourceVersion && row.sourceVersion) out.sourceVersion = row.sourceVersion;
        if (row.legal) return;
        var label = (member && member.name ? member.name : 'Pokemon') + ': ' + (row.moveName || 'unknown move') + ' - ' + (row.notes || row.reason || 'not verified');
        var severity = getMoveLegalityIssueSeverity(row.reason);
        if (severity === 'error') out.errors.push(label);
        else out.warnings.push(label);
        out.memberWarnings[String(idx)] = out.memberWarnings[String(idx)] || [];
        out.memberWarnings[String(idx)].push({
          severity: severity,
          text: label
        });
      });
    });
  }
  out.errors = Array.from(new Set(out.errors.filter(Boolean)));
  out.warnings = Array.from(new Set(out.warnings.filter(Boolean)));
  out.valid = out.errors.length === 0;
  return out;
}

function getMoveLegalityIssueSeverity(reason) {
  if (reason === 'source_unavailable') return 'unchecked';
  if (reason === 'unknown_species' ||
      reason === 'unknown_move' ||
      reason === 'not_in_species_form_learnset') {
    return 'error';
  }
  return 'warning';
}

// ============================================================
// CHAMPION PASTE EXPORTER
// Generates a Champion-safe text export. Uses SPs instead of Showdown EVs so
// round-tripping does not re-import SV-format spread lines by mistake.
// ============================================================
function exportTeamToPaste(team) {
  return exportTeamToPasteWithOptions(team, {});
}

function exportTeamToPasteWithOptions(team, opts) {
  opts = opts || {};
  if (!team || !team.members) return '';
  const lines = [];
  var spreadLabel = opts.showdownCompatible ? 'EVs' : 'SPs';
  for (const m of team.members) {
    // Line 1
    const itemStr = m.item ? ` @ ${m.item}` : '';
    lines.push(`${m.name}${itemStr}`);
    if (m.ability) lines.push(`Ability: ${m.ability}`);
    lines.push(`Level: ${m.level || 50}`);
    if (team.format !== 'champions' && m.tera) lines.push(`Tera Type: ${m.tera}`);
    // SPs — only non-zero
    const evs = m.evs || {};
    const evParts = [];
    const statLabels = { hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe' };
    for (const [k, label] of Object.entries(statLabels)) {
      const v = evs[k] || 0;
      if (v > 0) evParts.push(`${v} ${label}`);
    }
    if (evParts.length) lines.push(`${spreadLabel}: ${evParts.join(' / ')}`);
    if (m.nature) lines.push(`${m.nature} Nature`);
    for (const mv of (m.moves || [])) lines.push(`- ${mv}`);
    lines.push(''); // blank line between mons
  }
  return lines.join('\n').trim();
}

// ---- Helper: sprite URL helpers live in app_shell.js; getSpriteUrl remains in data.js.



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
    const escName = _escapeHtml(m.name || '');
    const escItem = _escapeHtml(m.item || '—');
    const escAbility = _escapeHtml(m.ability || '—');
    const escMoves = _escapeHtml((m.moves || []).join(' / '));
    const row = document.createElement('div');
    row.className = 'poke-row';
    row.innerHTML = `
      <img class="poke-sprite" src="${getSpriteUrl(m.name)}" alt="${escName}" loading="lazy" ${csSpriteFallbackAttrs(m.name)}/>
      <div class="poke-info">
        <div class="poke-name">${escName}</div>
        <div class="poke-item">${escItem} · ${escAbility}</div>
        <div class="poke-moves">${escMoves}</div>
      </div>
      <div class="type-chips">
        ${types.map(t=>`<span class="type-chip" style="background:${typeColor(t)}20;color:${typeColor(t)};border:1px solid ${typeColor(t)}40">${_escapeHtml(t)}</span>`).join('')}
      </div>
      <button class="team-mon-detail-btn" type="button" data-team="${containerId === 'player-roster' ? currentPlayerKey : (document.getElementById('opponent-select') ? document.getElementById('opponent-select').value : '')}" data-mon="${escName}" title="View full stat details">Stats</button>`;
    el.appendChild(row);
  }
  el.querySelectorAll('.team-mon-detail-btn').forEach(btn => {
    btn.addEventListener('click', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof openTeamStatDetailPanel === 'function') {
        openTeamStatDetailPanel(btn.dataset.team, btn.dataset.mon, btn);
      }
    });
  });
}

// ============================================================
// T9d: Dynamic player/opponent team selectors + Swap button
// currentPlayerKey tracks the active player team (user-selectable).
// rebuildTeamSelects() re-populates both dropdowns from TEAMS so that
// imported/custom teams appear in BOTH sides.
// ============================================================
function normalizeTeamRecordForSim(teamKey, team) {
  if (!team || typeof team !== 'object') return null;
  team.team_id = team.team_id || teamKey;
  team.name = team.name || team.label || teamKey;
  team.metadata = team.metadata || {};
  if (!Array.isArray(team.members)) team.members = [];

  var rulesetId = team.ruleset_id || team.metadata.ruleset_id || 'champions_reg_m_doubles_bo3';
  team.ruleset_id = team.ruleset_id || rulesetId;
  team.metadata.ruleset_id = team.metadata.ruleset_id || rulesetId;
  var rulesetEvidence = typeof getRulesetEvidencePolicy === 'function'
    ? getRulesetEvidencePolicy(rulesetId)
    : null;
  if (rulesetEvidence) {
    team.metadata.ruleset_label = team.metadata.ruleset_label || rulesetEvidence.ruleset_label;
    team.metadata.ruleset_status = team.metadata.ruleset_status || rulesetEvidence.ruleset_status;
    team.metadata.runtime_promotable = (team.metadata.runtime_promotable !== undefined)
      ? team.metadata.runtime_promotable
      : rulesetEvidence.runtime_promotable;
    team.metadata.learning_eligibility = team.metadata.learning_eligibility || rulesetEvidence.learning_eligibility;
    team.metadata.data_policy = team.metadata.data_policy || rulesetEvidence.data_policy;
    team.metadata.coaching_policy = team.metadata.coaching_policy || rulesetEvidence.coaching_policy;
    team.metadata.poisoning_guard = team.metadata.poisoning_guard || rulesetEvidence.poisoning_guard;
    team.metadata.source_checked_at_utc = team.metadata.source_checked_at_utc || rulesetEvidence.source_checked_at_utc;
  }
  var normalizedTags = Array.isArray(team.tags) ? team.tags.slice() : [];
  function addTeamTag(tag) {
    if (tag && normalizedTags.indexOf(tag) === -1) normalizedTags.push(tag);
  }
  addTeamTag(team.source === 'custom' ? 'custom' : 'preloaded');
  if (rulesetId.indexOf('reg_m_a') >= 0 || rulesetId.indexOf('regma') >= 0 || rulesetId === 'champions_reg_m_doubles_bo3') addTeamTag('reg-m-a');
  if (rulesetId.indexOf('reg_m_b') >= 0) addTeamTag('reg-m-b');
  if (team.metadata.ruleset_status) addTeamTag(team.metadata.ruleset_status.replace(/_/g, '-'));
  if (team.metadata.runtime_promotable === false) addTeamTag('not-runtime-promoted');
  team.tags = normalizedTags;
  if (!team.format) {
    team.format = 'champions';
  }
  if (!team.legality_status && team.format === 'champions') {
    team.legality_status = team.source === 'custom' ? 'unverified' : 'legal_inferred';
  }

  var championFormat = team.format === 'champions';
  team.members = team.members.map(function(member) {
    member = member || {};
    var name = member.name || member.species || 'Unknown';
    var moves = Array.isArray(member.moves) ? member.moves.slice() : [];
    if (championFormat) {
      moves = moves.filter(function(move) { return move !== 'Tera Blast'; });
    }
    var teraType = championFormat ? '' : (member.teraType || member.tera_type || '');
    return {
      name: name,
      species: member.species || name,
      item: member.item || '',
      ability: member.ability || '',
      nature: member.nature || '',
      level: member.level || 50,
      evs: member.evs || {},
      ivs: member.ivs || {},
      moves: moves,
      teraType: teraType,
      tera_type: teraType,
      role: member.role || member.role_tag || ''
    };
  });
  return team;
}

var CS_REMOVED_TEAM_CATALOG = {};

function removeTeamFromRuntimeCatalog(teamKey, team, verdict, reason) {
  if (!teamKey || !team || team.source === 'custom') return false;
  CS_REMOVED_TEAM_CATALOG[teamKey] = {
    key: teamKey,
    name: team.name || teamKey,
    format: team.format || '',
    legality_status: team.legality_status || '',
    reason: reason || 'not_approved_champion_legal',
    errors: verdict && Array.isArray(verdict.errors) ? verdict.errors.slice(0, 8) : [],
    warnings: verdict && Array.isArray(verdict.warnings) ? verdict.warnings.slice(0, 8) : []
  };
  delete TEAMS[teamKey];
  return true;
}

function pruneRuntimeTeamCatalog() {
  if (typeof TEAMS === 'undefined') return 0;
  var removed = 0;
  Object.keys(TEAMS).forEach(function(key) {
    var team = normalizeTeamRecordForSim(key, TEAMS[key]);
    if (!team || team.source === 'custom') return;
    var verdict = (typeof getTeamLegalityVerdict === 'function')
      ? getTeamLegalityVerdict(key, team)
      : { valid: false, errors: ['Team legality validator is unavailable.'] };
    if (typeof isApprovedPreloadedChampionTeam === 'function' &&
        isApprovedPreloadedChampionTeam(key, team, verdict)) {
      return;
    }
    if (removeTeamFromRuntimeCatalog(key, team, verdict, 'not_approved_champion_legal')) removed++;
  });
  var root = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : null);
  var simRoot = (typeof ChampionsSim !== 'undefined') ? ChampionsSim : (root && root.ChampionsSim);
  if (simRoot) {
    simRoot.catalog = simRoot.catalog || {};
    simRoot.catalog.removedTeams = CS_REMOVED_TEAM_CATALOG;
  }
  return removed;
}

function normalizeTeamCatalogForSim() {
  if (typeof TEAMS === 'undefined') return 0;
  var count = 0;
  for (var key in TEAMS) {
    if (normalizeTeamRecordForSim(key, TEAMS[key])) count++;
  }
  pruneRuntimeTeamCatalog();
  return count;
}

function isSimReadyTeam(teamKey, team, opts) {
  team = normalizeTeamRecordForSim(teamKey, team || ((typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null));
  opts = opts || {};
  if (!team || !team.name) return false;
  if (opts.requireMembers !== false && (!Array.isArray(team.members) || team.members.length === 0)) return false;
  return isVisibleTeamInCatalog(teamKey, team, { includeCustom: opts.includeCustom !== false });
}

function isVisibleTeamInCatalog(teamKey, team, opts) {
  team = normalizeTeamRecordForSim(teamKey, team || ((typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null));
  opts = opts || {};
  if (!team || !team.name) return false;
  if (team.source === 'custom' && opts.includeCustom === false) return false;
  if (team.format !== 'champions') return false;
  if (team.legality_status === 'illegal') return false;
  var verdict = null;
  if (typeof getTeamLegalityVerdict === 'function') {
    verdict = getTeamLegalityVerdict(teamKey, team);
    if (verdict && !verdict.valid) return false;
  }
  if (team.source !== 'custom' && typeof isApprovedPreloadedChampionTeam === 'function' &&
      !isApprovedPreloadedChampionTeam(teamKey, team, verdict)) {
    return false;
  }
  return true;
}

function getVisibleTeamKeys(opts) {
  if (typeof TEAMS === 'undefined') return [];
  normalizeTeamCatalogForSim();
  var out = [];
  for (var key in TEAMS) {
    if (isVisibleTeamInCatalog(key, TEAMS[key], opts)) out.push(key);
  }
  return out;
}

function getDefaultVisiblePlayerTeamKey() {
  var visible = getVisibleTeamKeys({ includeCustom: true }).filter(function(key) {
    return isSimReadyTeam(key, TEAMS[key], { includeCustom: true });
  });
  return visible[0] || (TEAMS.player ? 'player' : Object.keys(TEAMS)[0]);
}

function getDefaultVisibleOpponentTeamKey(excludeKey) {
  var visible = getVisibleTeamKeys({ includeCustom: true }).filter(function(key) {
    return key !== excludeKey && isSimReadyTeam(key, TEAMS[key], { includeCustom: true });
  });
  return visible[0] || getDefaultVisiblePlayerTeamKey();
}

function mergeDbTeamsIntoCatalog(dbTeams) {
  var summary = { added: 0, replaced: 0, skipped: 0, blocked: [] };
  if (!dbTeams || typeof TEAMS === 'undefined') return summary;
  for (var key in dbTeams) {
    if (!Object.prototype.hasOwnProperty.call(dbTeams, key)) continue;
    var team = dbTeams[key];
    normalizeTeamRecordForSim(key, team);
    var verdict = (typeof getTeamLegalityVerdict === 'function')
      ? getTeamLegalityVerdict(key, team)
      : { valid: true, errors: [] };
    if (!team || team.format !== 'champions' || !verdict.valid ||
        (typeof isApprovedPreloadedChampionTeam === 'function' &&
          !isApprovedPreloadedChampionTeam(key, team, verdict))) {
      summary.skipped++;
      summary.blocked.push({
        key: key,
        name: team && team.name,
        errors: (verdict && verdict.errors && verdict.errors.length)
          ? verdict.errors
          : ['Not an approved Champion-legal team']
      });
      continue;
    }
    if (TEAMS[key]) summary.replaced++;
    else summary.added++;
    TEAMS[key] = team;
  }
  return summary;
}

var currentPlayerKey = getDefaultVisiblePlayerTeamKey();

function getActivePlayerTeamKey() {
  var playerSel = (typeof document !== 'undefined') ? document.getElementById('player-select') : null;
  if (playerSel
      && playerSel.value
      && TEAMS[playerSel.value]
      && isSimReadyTeam(playerSel.value, TEAMS[playerSel.value], { includeCustom: true })) {
    return playerSel.value;
  }
  if (typeof currentPlayerKey === 'string'
      && TEAMS[currentPlayerKey]
      && isSimReadyTeam(currentPlayerKey, TEAMS[currentPlayerKey], { includeCustom: true })) {
    return currentPlayerKey;
  }
  return getDefaultVisiblePlayerTeamKey();
}

function getActivePlayerTeam() {
  return TEAMS[getActivePlayerTeamKey()] || null;
}

function syncActivePlayerTeamKey() {
  var resolvedKey = getActivePlayerTeamKey();
  currentPlayerKey = resolvedKey;
  var playerSel = (typeof document !== 'undefined') ? document.getElementById('player-select') : null;
  if (playerSel && resolvedKey && playerSel.value !== resolvedKey && TEAMS[resolvedKey]) {
    playerSel.value = resolvedKey;
  }
  return resolvedKey;
}

function getSimScopeMode() {
  var el = (typeof document !== 'undefined') ? document.getElementById('sim-scope') : null;
  var mode = el && typeof el.value === 'string' ? el.value : 'preloaded';
  return mode === 'selected' ? 'selected' : 'preloaded';
}

function getSimScopeLabel(mode) {
  return mode === 'selected' ? 'Selected matchup' : 'Preloaded team suite';
}

function getTacticalDepthMaxRuns() {
  var el = (typeof document !== 'undefined') ? document.getElementById('tactical-depth') : null;
  var value = el && typeof el.value === 'string' ? el.value : '';
  if (value === 'all') return -1;
  value = Number(value);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return 100;
}

function normalizeBranchMaxRuns(maxRuns) {
  if (maxRuns === -1 || maxRuns === 'all' || maxRuns === 'ALL' || maxRuns === 'All') return -1;
  var parsed = Number(maxRuns);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 100;
}

function resolveBranchRunLimit(candidateCount, maxRuns) {
  if (maxRuns === -1) return candidateCount;
  return Math.min(candidateCount, normalizeBranchMaxRuns(maxRuns));
}

function isPreloadedSimTeam(teamKey, team) {
  team = normalizeTeamRecordForSim(teamKey, team || ((typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null));
  if (!team) return false;
  return !team.source || team.source === 'preloaded' || team.source === 'bundled';
}

function getRunAllOpponentKeys(playerKey, simCtx) {
  simCtx = simCtx || {};
  var scope = simCtx.simScope || getSimScopeMode();
  var includeCustom = scope === 'selected';
  if (scope === 'selected') {
    var selectedOpp = simCtx.oppKey || getDefaultVisibleOpponentTeamKey(playerKey);
    if (selectedOpp
        && selectedOpp !== playerKey
        && isSimReadyTeam(selectedOpp, TEAMS[selectedOpp], { includeCustom: true })) {
      return [selectedOpp];
    }
    return [];
  }
  return Object.keys(TEAMS).filter(function(k) {
    if (k === playerKey) return false;
    if (!isSimReadyTeam(k, TEAMS[k], { includeCustom: includeCustom })) return false;
    if (!isPreloadedSimTeam(k, TEAMS[k])) return false;
    if (typeof LADDER_MODE !== 'undefined' && LADDER_MODE && typeof isLadderLegal === 'function') {
      return isLadderLegal(k);
    }
    return true;
  });
}

function formatSeriesCount(n) {
  n = Number(n) || 0;
  return n.toLocaleString ? n.toLocaleString('en-US') : String(n);
}

function getRunScopeBadgeText(simCtx, opponentCount) {
  simCtx = simCtx || {};
  var perOpponent = Number(simCtx.numSeries) || 0;
  var totalSeries = Math.max(0, opponentCount || 0) * perOpponent;
  return getSimScopeLabel(simCtx.simScope) + ' · ' + formatSeriesCount(totalSeries) + ' total series';
}

function resolveSimContext(opts) {
  opts = opts || {};
  normalizeTeamCatalogForSim();
  var playerSel = (typeof document !== 'undefined') ? document.getElementById('player-select') : null;
  var oppSel = (typeof document !== 'undefined') ? document.getElementById('opponent-select') : null;
  var playerCandidate = opts.playerKey || (playerSel && playerSel.value) || currentPlayerKey || getDefaultVisiblePlayerTeamKey();
  var playerKey = isSimReadyTeam(playerCandidate, TEAMS[playerCandidate], { includeCustom: true })
    ? playerCandidate
    : getDefaultVisiblePlayerTeamKey();
  if (!isSimReadyTeam(playerKey, TEAMS[playerKey], { includeCustom: true })) {
    throw new Error('player team not loaded: ' + (playerCandidate || 'none'));
  }

  var oppCandidate = opts.oppKey || (oppSel && oppSel.value) || getDefaultVisibleOpponentTeamKey(playerKey);
  var oppKey = isSimReadyTeam(oppCandidate, TEAMS[oppCandidate], { includeCustom: true }) && oppCandidate !== playerKey
    ? oppCandidate
    : getDefaultVisibleOpponentTeamKey(playerKey);
  if (!isSimReadyTeam(oppKey, TEAMS[oppKey], { includeCustom: true })) {
    throw new Error('opponent team not loaded: ' + (oppCandidate || 'none'));
  }
  if (oppKey === playerKey) {
    throw new Error('opponent team not loaded: no distinct opponent available');
  }

  currentPlayerKey = playerKey;
  if (playerSel && playerSel.value !== playerKey) playerSel.value = playerKey;
  if (oppSel && oppSel.value !== oppKey) oppSel.value = oppKey;

  var countEl = (typeof document !== 'undefined') ? document.getElementById('sim-count') : null;
  var n = opts.numSeries != null ? Number(opts.numSeries) : parseInt(countEl && countEl.value, 10);
  var bo = opts.bo || currentBo;
  var simScope = opts.simScope || getSimScopeMode();
  return {
    playerKey: playerKey,
    oppKey: oppKey,
    playerTeam: TEAMS[playerKey],
    oppTeam: TEAMS[oppKey],
    numSeries: n,
    bo: bo,
    simScope: simScope,
    simScopeLabel: getSimScopeLabel(simScope),
    format: currentFormat,
    formatLabel: currentFormat === 'doubles' ? 'Doubles' : 'Singles',
    boLabel: 'Bo' + bo
  };
}

function getEditablePlayerTeamKey() {
  var playerSel = (typeof document !== 'undefined') ? document.getElementById('player-select') : null;
  if (playerSel && playerSel.value && TEAMS[playerSel.value]) return playerSel.value;
  if (TEAMS.player) return 'player';
  return getActivePlayerTeamKey();
}

function getEditablePlayerTeam() {
  return TEAMS[getEditablePlayerTeamKey()] || null;
}

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
    var parsed = (typeof Storage !== 'undefined') ? Storage.get('teams:custom') : null;
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
    UILog.warn('Failed to load custom teams', e);
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
    if (typeof Storage !== 'undefined') Storage.set('teams:custom', out);
    return Object.keys(out.teams).length;
  } catch (e) {
    UILog.warn('Failed to save custom teams', e);
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
    var parsed = (typeof Storage !== 'undefined') ? Storage.get('overrides:preloaded') : null;
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
    UILog.warn('Failed to load preloaded overrides', e);
    return 0;
  }
}

function savePreloadedOverride(key) {
  try {
    var store = (typeof Storage !== 'undefined')
      ? (Storage.get('overrides:preloaded') || { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} })
      : { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    if (store.version !== PRELOADED_OVERRIDES_SCHEMA) store = { version: PRELOADED_OVERRIDES_SCHEMA, overrides: {} };
    store.overrides[key] = { members: TEAMS[key].members, saved_at: new Date().toISOString() };
    store.saved_at = new Date().toISOString();
    if (typeof Storage !== 'undefined') Storage.set('overrides:preloaded', store);
    TEAMS[key]._hasOverride = true;
    return true;
  } catch (e) {
    UILog.warn('Failed to save preloaded override', e);
    return false;
  }
}

function clearPreloadedOverride(key) {
  try {
    var store = (typeof Storage !== 'undefined') ? Storage.get('overrides:preloaded') : null;
    if (!store || !store.overrides || !store.overrides[key]) return false;
    delete store.overrides[key];
    if (typeof Storage !== 'undefined') Storage.set('overrides:preloaded', store);
    return true;
  } catch (e) {
    UILog.warn('Failed to clear preloaded override', e);
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
    _openModalOverlay('confirm-modal', { focusSelector: '#confirm-ok', labelledbyId: 'confirm-title', describedbyId: 'confirm-body' });
    _pendingConfirm = resolve;
  });
}
function _resolveConfirm(v) {
  _closeModalOverlay('confirm-modal');
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
    UILog.warn('Refusing to delete preloaded team', { teamKey: key });
    return;
  }
  var ok = await asyncConfirm('Delete team', 'Delete "' + team.name + '"?\n\nThis cannot be undone.', 'Delete');
  if (!ok) return;

  delete TEAMS[key];
  if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();

  // Fallback selections if deleted team was selected
  if (currentPlayerKey === key) {
    currentPlayerKey = getDefaultVisiblePlayerTeamKey();
  }
  var oppSel = document.getElementById('opponent-select');
  if (oppSel && oppSel.value === key) {
    oppSel.value = getDefaultVisibleOpponentTeamKey(currentPlayerKey);
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
  var prevPlayer = playerSel.value || currentPlayerKey || getDefaultVisiblePlayerTeamKey();
  var prevOpp = oppSel.value || getDefaultVisibleOpponentTeamKey(prevPlayer);
  var hadDuplicateSelection = prevPlayer && prevOpp && prevPlayer === prevOpp;
  playerSel.innerHTML = '';
  // Rebuild opponent while preserving order (existing option text has
  // ladder-gate glyph mutations; start fresh from TEAMS)
  oppSel.innerHTML = '';
  getVisibleTeamKeys({ includeCustom: true }).forEach(function(key) {
    var t = TEAMS[key];
    if (!t || !t.name) return;
    var o1 = document.createElement('option');
    o1.value = key; o1.textContent = t.name;
    playerSel.appendChild(o1);
    var o2 = document.createElement('option');
    o2.value = key; o2.textContent = t.name;
    oppSel.appendChild(o2);
  });
  playerSel.value = TEAMS[prevPlayer] && isVisibleTeamInCatalog(prevPlayer, TEAMS[prevPlayer], { includeCustom: true })
    ? prevPlayer
    : getDefaultVisiblePlayerTeamKey();
  if (TEAMS[prevOpp] && isVisibleTeamInCatalog(prevOpp, TEAMS[prevOpp], { includeCustom: true }) && prevOpp !== playerSel.value) {
    oppSel.value = prevOpp;
  } else if (hadDuplicateSelection) {
    oppSel.value = playerSel.value;
  } else {
    oppSel.value = getDefaultVisibleOpponentTeamKey(playerSel.value);
  }
  currentPlayerKey = playerSel.value;
  if (typeof applyLadderGate === 'function') applyLadderGate();
}

// ---- Initial renders ----
currentPlayerKey = getDefaultVisiblePlayerTeamKey();
var _initialOppKey = getDefaultVisibleOpponentTeamKey(currentPlayerKey);
renderRoster('player-roster', (TEAMS[currentPlayerKey] && TEAMS[currentPlayerKey].members) || []);
renderRoster('opp-roster', (TEAMS[_initialOppKey] && TEAMS[_initialOppKey].members) || []);
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
    var nextOpp = enforceDistinctBattleTeams();
    if (nextOpp && TEAMS[nextOpp]) {
      document.getElementById('opp-team-name').textContent = TEAMS[nextOpp].name;
      renderRoster('opp-roster', TEAMS[nextOpp].members);
      if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
    }
    if (typeof applyLadderGate === 'function') applyLadderGate();
    // T9j.3b: recompute coverage on active-team change (no cache, always fresh).
    if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
    // T9j.12 (Refs #74): refresh sim-side bring picker after active-team change.
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
    if (typeof invalidateThreatResponseCache === 'function') invalidateThreatResponseCache();
    // Phase 2 (Refs #46 #49) - rebuild Strategy tab when player switches teams.
    // Phase 3 (Refs #51) - paint cached snapshot first so the tab never flashes
    // blank between switches; the debounced rebuild will repaint with fresh data.
    if (typeof renderStrategyTabFromCache === 'function') renderStrategyTabFromCache(this.value);
    if (typeof csScheduleStrategyRebuild === 'function') csScheduleStrategyRebuild();
  }
});

// ---- Opponent select ----
document.getElementById('opponent-select').addEventListener('change', function() {
  const team = TEAMS[this.value];
  if (team) {
    document.getElementById('opp-team-name').textContent = team.name;
    renderRoster('opp-roster', team.members);
    var nextOpp = enforceDistinctBattleTeams();
    if (nextOpp && TEAMS[nextOpp]) {
      document.getElementById('opp-team-name').textContent = TEAMS[nextOpp].name;
      renderRoster('opp-roster', TEAMS[nextOpp].members);
      if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
    }
    // T9j.12 (Refs #74): refresh sim-side bring picker on opponent switch.
    if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
    if (typeof invalidateThreatResponseCache === 'function') invalidateThreatResponseCache();
    if (typeof csScheduleStrategyRebuild === 'function') csScheduleStrategyRebuild();
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

function getTeamLegalityVerdict(teamKey, team) {
  team = team || ((typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null);
  if (team && !isTeamCompatibleWithCurrentRuleset(team)) {
    return {
      valid: false,
      inferred: false,
      statAware: false,
      errors: ['SV-format compatibility team; excluded from Champions source-truth review.'],
      warnings: ['Keep this team for legacy comparison only until an explicit SV ruleset mode is added.'],
      label: 'SV compatibility only'
    };
  }
  var moveIssues = collectTeamMoveLegalityIssues(team);
  var hardMoveIssues = moveIssues.filter(function(row) { return row && row.severity === 'error'; });
  var sourceWarnings = moveIssues.filter(function(row) { return row && row.severity !== 'error'; });
  var fallback = {
    valid: !!team && hardMoveIssues.length === 0 && (team.legality_status === 'legal' || team.legality_status === 'legal_inferred'),
    inferred: !!team && team.legality_status === 'legal_inferred',
    errors: hardMoveIssues.map(function(row) { return row.label; }),
    warnings: sourceWarnings.map(function(row) { return row.label; }),
    label: team && team.legality_status === 'legal_inferred' ? 'Legal (inferred)' : 'Legal'
  };
  if (!team || typeof validateTeam !== 'function') return fallback;
  var verdict = validateTeam(team, getActiveValidationFormat(team)) || {};
  var errors = Array.isArray(verdict.errors) ? verdict.errors.slice() : [];
  hardMoveIssues.forEach(function(row) { errors.push(row.label); });
  var warnings = Array.isArray(verdict.warnings) ? verdict.warnings.slice() : [];
  sourceWarnings.forEach(function(row) { warnings.push(row.label); });
  var valid = errors.length === 0;
  return {
    valid: valid,
    inferred: team.legality_status === 'legal_inferred',
    statAware: false,
    errors: errors,
    warnings: warnings,
    label: valid
      ? (team.legality_status === 'legal_inferred'
          ? 'Legal (inferred)'
          : 'Legal')
      : 'Not legal'
  };
}

function collectTeamMoveLegalityIssues(team) {
  var out = [];
  if (!team || !Array.isArray(team.members)) return out;
  var root = (typeof globalThis !== 'undefined') ? globalThis : (typeof window !== 'undefined' ? window : null);
  var simRoot = (typeof ChampionsSim !== 'undefined') ? ChampionsSim : (root && root.ChampionsSim);
  var api = simRoot && simRoot.moveLegality ? simRoot.moveLegality : null;
  if (!api || typeof api.validateMovesForSet !== 'function') {
    out.push({
      severity: 'unchecked',
      label: 'Showdown species and move legality data is not loaded.'
    });
    return out;
  }
  (team.members || []).forEach(function(member) {
    var checks = api.validateMovesForSet(member || {});
    checks.forEach(function(row) {
      if (row.legal) return;
      var label = (member && member.name ? member.name : 'Pokemon') + ': ' + (row.moveName || 'unknown move') + ' - ' + (row.notes || row.reason || 'not verified');
      out.push({
        severity: getMoveLegalityIssueSeverity(row.reason),
        label: label,
        reason: row.reason,
        member: member && member.name,
        move: row.moveName || ''
      });
    });
  });
  return out;
}

function isApprovedPreloadedChampionTeam(teamKey, team, verdict) {
  team = team || ((typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null);
  if (!team || team.format !== 'champions') return false;
  if (team.source === 'custom') return false;
  if (team.legality_status !== 'legal') return false;
  verdict = verdict || getTeamLegalityVerdict(teamKey, team);
  return !!(verdict && verdict.valid);
}

function isLadderLegal(teamKey) {
  var t = (typeof TEAMS !== 'undefined') && TEAMS[teamKey];
  if (!t) return false;
  if (t.format !== 'champions') return false;
  return getTeamLegalityVerdict(teamKey, t).valid
    && (t.legality_status === 'legal' || t.legality_status === 'legal_inferred');
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
      var verdict = getTeamLegalityVerdict(key, team);
      var glyph = legal ? '\u2705' : (!verdict.valid || team.legality_status === 'illegal' ? '\u274C' : '\u26A0');
      // T9h: distinguish inferred from manually-verified legal
      var legalLabel = verdict.label || ((team.legality_status === 'legal_inferred') ? 'Legal (inferred)' : 'Legal');
      opt.textContent = opt.textContent + '  ' + glyph + ' ' +
        (legal ? legalLabel : (!verdict.valid ? legalLabel : (team.legality_status === 'illegal' ? 'Illegal' : (team.format || '?').toUpperCase())));
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

function _firstDifferentTeamKey(excludeKey) {
  var oppSel = (typeof document !== 'undefined') ? document.getElementById('opponent-select') : null;
  if (oppSel && Array.isArray(oppSel.options)) {
    for (var i = 0; i < oppSel.options.length; i++) {
      var opt = oppSel.options[i];
      if (opt && opt.value && opt.value !== excludeKey && TEAMS[opt.value]) return opt.value;
    }
  }
  return getDefaultVisibleOpponentTeamKey(excludeKey);
}

function enforceDistinctBattleTeams() {
  var playerSel = document.getElementById('player-select');
  var oppSel = document.getElementById('opponent-select');
  if (!playerSel || !oppSel) return null;
  if (!playerSel.value || !oppSel.value) return null;
  if (playerSel.value !== oppSel.value) return null;
  var nextOpp = _firstDifferentTeamKey(playerSel.value);
  if (!nextOpp || nextOpp === playerSel.value) return null;
  oppSel.value = nextOpp;
  return nextOpp;
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
  var manualMode = mode === 'manual';
  var visibleBring = manualMode ? bring : [];
  var slotLabels = [];
  for (var i = 0; i < bringCount; i++) slotLabels.push(i < leadCount ? 'LEAD ' + (i+1) : 'BENCH ' + (i+1));
  var slotsHtml = slotLabels.map(function(label, i){
    var monName = visibleBring[i] || '';
    var sprite = monName ? getSpriteUrl(monName) : '';
    return '<div class="bring-slot ' + (i < leadCount ? 'bring-slot-lead' : 'bring-slot-bench') +
      '" data-team="' + teamKey + '" data-slot="' + i +
      '" draggable="' + (manualMode && monName ? 'true' : 'false') +
      '" title="' + label + (!manualMode ? ' (random mode)' : '') + '">' +
      '<div class="bring-slot-label">' + label + '</div>' +
      (monName
        ? '<img class="bring-slot-sprite" src="' + sprite + '" alt="' + _escapeHtml(monName) + '" loading="lazy" ' + csSpriteFallbackAttrs(monName) + '/>' +
          '<div class="bring-slot-name">' + _escapeHtml(monName) + '</div>'
        : '<div class="bring-slot-empty">\u2014</div>') +
      '</div>';
  }).join('');
  // Compact pool (for Simulator side) omits the heavy meta rows in favor of
  // a single sprite strip so it tucks under the roster without pushing the
  // Run Simulation button off-screen. The full pool stays on Teams tab.
  var poolHtml;
  if (compact) {
    poolHtml = team.members.map(function(m){
      var inBring = manualMode && bring.indexOf(m.name) >= 0;
      var pos = inBring ? (bring.indexOf(m.name) < leadCount ? 'LEAD ' + (bring.indexOf(m.name)+1) : 'BENCH ' + (bring.indexOf(m.name)+1)) : '';
      return '<div class="bring-pool-chip ' + (inBring ? 'bring-in' : 'bring-out') +
        '" data-team="' + teamKey + '" data-mon="' + _escapeHtml(m.name) +
        '" draggable="' + (manualMode ? 'true' : 'false') +
        '" title="' + _escapeHtml(m.name) + (inBring ? ' (' + _escapeHtml(pos) + ')' : '') + '">' +
        '<img class="bring-pool-chip-sprite" src="' + getSpriteUrl(m.name) + '" alt="' + _escapeHtml(m.name) + '" loading="lazy" ' + csSpriteFallbackAttrs(m.name) + '/>' +
        '<span class="bring-pool-chip-name">' + _escapeHtml(m.name) + '</span>' +
        (inBring ? '<span class="bring-pool-chip-pos">' + _escapeHtml(pos) + '</span>' : '') +
        '</div>';
    }).join('');
  } else {
    poolHtml = team.members.map(function(m){
      var inBring = manualMode && bring.indexOf(m.name) >= 0;
      return '<div class="bring-pool-row ' + (inBring ? 'bring-in' : 'bring-out') +
        '" data-team="' + teamKey + '" data-mon="' + _escapeHtml(m.name) +
        '" draggable="' + (manualMode ? 'true' : 'false') + '">' +
        '<img class="poke-full-sprite" src="' + getSpriteUrl(m.name) + '" alt="' + _escapeHtml(m.name) + '" loading="lazy" ' + csSpriteFallbackAttrs(m.name) + '/>' +
        '<div class="poke-full-info">' +
          '<div class="poke-full-name">' +
            '<span class="poke-full-name-main">' + _escapeHtml(m.name) + '</span>' +
            '<span class="poke-full-item">@ ' + _escapeHtml(m.item || '\u2014') + '</span>' +
            (inBring ? '<span class="poke-full-bring">\u25c6 ' +
              _escapeHtml((bring.indexOf(m.name) < leadCount ? 'LEAD' : 'BENCH') + ' ' + (bring.indexOf(m.name)+1)) + '</span>' : '') +
          '</div>' +
          '<div class="poke-full-detail">' + _escapeHtml(m.ability || '\u2014') + ' \u00b7 ' + _escapeHtml(m.nature || 'Hardy') + ' \u00b7 Lv' + _escapeHtml(String(m.level || 50)) + '</div>' +
          '<div class="move-tags">' + (m.moves || []).map(function(mv){ return '<span class="move-tag">' + _escapeHtml(mv) + '</span>'; }).join('') + '</div>' +
        '</div>' +
        '<button class="team-mon-detail-btn" type="button" data-team="' + teamKey + '" data-mon="' + _escapeHtml(m.name) + '" title="View full stat details">Details</button>' +
      '</div>';
    }).join('');
  }
  var modeToggle =
    '<div class="bring-mode-row" data-team="' + teamKey + '">' +
      '<span class="bring-mode-label">Bring picker:</span>' +
      '<button class="bring-mode-btn ' + (mode === 'manual' ? 'active' : '') + '" data-team="' + teamKey + '" data-mode="manual" title="Pick your ' + bringCount + ' Pokemon by hand">Manual</button>' +
      '<button class="bring-mode-btn ' + (mode === 'random' ? 'active' : '') + '" data-team="' + teamKey + '" data-mode="random" title="Re-roll a random ' + bringCount + ' of 6 each series">Random ' + bringCount + '/6</button>' +
    '</div>';
  var modeHint = !manualMode
    ? '<div class="bring-mode-hint" id="lead-hint" data-team="' + teamKey + '">Leads will be chosen randomly.</div>'
    : '';
  var poolCls = compact ? 'bring-pool bring-pool-compact' : 'bring-pool';
  return modeToggle + modeHint +
    '<div class="bring-slots">' + slotsHtml + '</div>' +
    '<div class="' + poolCls + '">' + poolHtml + '</div>';
}

function shouldUseCompactTeamsPicker() {
  var matchMediaFn = getWindowValue('matchMedia', null);
  return !!(matchMediaFn && matchMediaFn('(hover: none) and (pointer: coarse) and (max-width: 760px)').matches);
}

// Shared wiring: attach drag/tap handlers to every .bring-mode-btn /
// .bring-pool-row / .bring-pool-chip / .bring-slot inside rootEl, and call
// onChange() after any state mutation (both renders must re-run).
function wireBringPickerElements(rootEl, onChange) {
  if (!rootEl) return;
  var matchMediaFn = getWindowValue('matchMedia', null);
  var _isHoverCapable = matchMediaFn
    ? matchMediaFn('(hover: hover) and (pointer: fine)').matches
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
  var playerKey = getActivePlayerTeamKey();
  var oppSel = document.getElementById('opponent-select');
  var oppKey = oppSel ? oppSel.value : getDefaultVisibleOpponentTeamKey(playerKey);
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
//                  Champions-focused tournament/sample rosters
//                  (aurora_veil_froslass, cofagrigus_tr, rin_sand, suica_sun).
//   - Mega      = team whose key starts with mega_ (mega_altaria / mega_dragonite
//                  / mega_houndoom).
// Bulk I/O: JSON is the authoritative round-trip format (uses the T9f schema
//   { version:1, saved_at, teams:{...} }). Showdown .txt is the interop format
//   (multi-team pokepaste; split on `=== name ===` markers or blank-line runs).
// Cite: Pokemon Showdown team format -- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Showdown
// Cite: Smogon export convention   -- https://www.smogon.com/forums/threads/3587177/
// Cite: MDN File API (reader)      -- https://developer.mozilla.org/en-US/docs/Web/API/File_API
// ============================================================
var TEAMS_FILTER = 'all'; // 'all' | 'preloaded' | 'custom' | 'tournament' | 'mega' | 'regma' | 'historical' | 'regmb_review'
var TOURNAMENT_TEAM_KEYS = {
  champions_arena_1st:1, champions_arena_2nd:1, champions_arena_3rd:1,
  aurora_veil_froslass:1, cofagrigus_tr:1, rin_sand:1, suica_sun:1
};
function csTeamRulesetEvidence(team) {
  team = team || {};
  var meta = team.metadata || {};
  var rulesetId = team.ruleset_id || meta.ruleset_id || 'champions_reg_m_doubles_bo3';
  var evidence = typeof getRulesetEvidencePolicy === 'function'
    ? getRulesetEvidencePolicy(rulesetId)
    : {
      ruleset_id: rulesetId,
      ruleset_label: meta.ruleset_label || rulesetId,
      ruleset_status: meta.ruleset_status || 'unknown',
      runtime_promotable: meta.runtime_promotable !== false,
      learning_eligibility: meta.learning_eligibility || 'unknown',
      data_policy: meta.data_policy || 'unknown',
      coaching_policy: meta.coaching_policy || 'unknown',
      poisoning_guard: meta.poisoning_guard || 'unknown_ruleset_do_not_train_or_rank',
      source_checked_at_utc: meta.source_checked_at_utc || null
    };
  return {
    ruleset_id: evidence.ruleset_id || rulesetId,
    ruleset_label: meta.ruleset_label || evidence.ruleset_label || rulesetId,
    ruleset_status: meta.ruleset_status || evidence.ruleset_status || 'unknown',
    runtime_promotable: meta.runtime_promotable !== undefined ? meta.runtime_promotable : !!evidence.runtime_promotable,
    learning_eligibility: meta.learning_eligibility || evidence.learning_eligibility || 'unknown',
    data_policy: meta.data_policy || evidence.data_policy || 'unknown',
    coaching_policy: meta.coaching_policy || evidence.coaching_policy || 'unknown',
    poisoning_guard: meta.poisoning_guard || evidence.poisoning_guard || 'unknown_ruleset_do_not_train_or_rank',
    source_checked_at_utc: meta.source_checked_at_utc || evidence.source_checked_at_utc || null
  };
}
function csTeamRulesetTags(key, team) {
  var evidence = csTeamRulesetEvidence(team);
  var tags = Array.isArray(team && team.tags) ? team.tags.slice() : [];
  function add(tag) { if (tag && tags.indexOf(tag) === -1) tags.push(tag); }
  add(team && team.source === 'custom' ? 'custom' : 'preloaded');
  if (String(evidence.ruleset_id).indexOf('reg_m_a') >= 0 || String(evidence.ruleset_id).indexOf('regma') >= 0 || evidence.ruleset_id === 'champions_reg_m_doubles_bo3') add('reg-m-a');
  if (String(evidence.ruleset_id).indexOf('reg_m_b') >= 0) add('reg-m-b');
  add(String(evidence.ruleset_status || '').replace(/_/g, '-'));
  if (evidence.runtime_promotable === false) add('not-runtime-promoted');
  if (key && /^mega_/.test(key)) add('mega');
  return tags;
}
function csRenderTeamRulesetBadges(key, team) {
  var evidence = csTeamRulesetEvidence(team);
  var label = evidence.ruleset_label || evidence.ruleset_id || 'Ruleset unknown';
  var status = evidence.ruleset_status || 'unknown';
  var guard = evidence.poisoning_guard || 'unknown_ruleset_do_not_train_or_rank';
  var statusClass = evidence.runtime_promotable ? 'badge-legal' : 'badge-warn';
  var title = 'Ruleset: ' + label + ' | data policy: ' + (evidence.data_policy || 'unknown') + ' | coaching: ' + (evidence.coaching_policy || 'unknown');
  return '<span class="' + statusClass + '" title="' + _escapeHtml(title) + '">' + _escapeHtml(label) + '</span>' +
    '<span class="' + statusClass + '" title="' + _escapeHtml(guard) + '">' + _escapeHtml(String(status).replace(/_/g, ' ').toUpperCase()) + '</span>';
}
function csGetRegmbCoverageSections() {
  var source = typeof CHAMPIONS_REGMB_SOURCE_CONVERSION !== 'undefined'
    ? CHAMPIONS_REGMB_SOURCE_CONVERSION
    : null;
  return source && Array.isArray(source.coverageSections) ? source.coverageSections : [];
}
function csGetRegmbVisualRows() {
  var source = typeof CHAMPIONS_REGMB_SOURCE_CONVERSION !== 'undefined'
    ? CHAMPIONS_REGMB_SOURCE_CONVERSION
    : null;
  return source && Array.isArray(source.visualAllowlistRows) ? source.visualAllowlistRows : [];
}
function csGetRegmbPromotionReadiness() {
  var source = typeof CHAMPIONS_REGMB_SOURCE_CONVERSION !== 'undefined'
    ? CHAMPIONS_REGMB_SOURCE_CONVERSION
    : null;
  return source && source.promotionReadiness ? source.promotionReadiness : null;
}
function csGetRegmbPromotionBuckets() {
  var source = typeof CHAMPIONS_REGMB_SOURCE_CONVERSION !== 'undefined'
    ? CHAMPIONS_REGMB_SOURCE_CONVERSION
    : null;
  return source && Array.isArray(source.promotionStatusBuckets) ? source.promotionStatusBuckets : [];
}
function csGetRegmbPromotionChecklist() {
  var source = typeof CHAMPIONS_REGMB_SOURCE_CONVERSION !== 'undefined'
    ? CHAMPIONS_REGMB_SOURCE_CONVERSION
    : null;
  return source && Array.isArray(source.promotionFieldChecklist) ? source.promotionFieldChecklist : [];
}
function csRenderRegmbPromotionGateCard(grid) {
  if (!grid) return 0;
  var readiness = csGetRegmbPromotionReadiness();
  var buckets = csGetRegmbPromotionBuckets();
  var checklist = csGetRegmbPromotionChecklist();
  if (!readiness || !checklist.length) return 0;
  var bucketHtml = buckets.map(function(bucket) {
    var cls = bucket.runtimePromotable ? 'badge-legal' : 'badge-warn';
    return '<span class="' + cls + '" title="runtimePromotable=' + _escapeHtml(String(!!bucket.runtimePromotable)) + '">' + _escapeHtml(bucket.label + ': ' + bucket.count) + '</span>';
  }).join('');
  var blocked = checklist.filter(function(row) { return row.blocksRuntime; });
  var sample = blocked.slice(0, 6).map(function(row) {
    return '<span class="replay-coach-tag high">' + _escapeHtml(row.field) + ': ' + _escapeHtml(row.status.replace(/_/g, ' ')) + '</span>';
  }).join('');
  var actions = (readiness.nextHumanActions || []).slice(0, 5).map(function(action) {
    return '<li>' + _escapeHtml(action) + '</li>';
  }).join('');
  var card = document.createElement('div');
  card.className = 'team-full-card';
  card.innerHTML = '<div class="tfcard-header"><div><div class="tfcard-name">Reg M-B runtime promotion gate</div><div class="tfcard-meta">DATA TRUST · ' + _escapeHtml(readiness.status.replace(/_/g, ' ').toUpperCase()) + ' · ' + _escapeHtml(String(readiness.fieldsBlockedForRuntime)) + ' blocked fields</div></div><div class="tfcard-badges"><span class="badge-warn">HIDDEN FROM LEGAL SIM</span><span class="badge-warn">DO NOT TRAIN/RANK</span></div></div>' +
    '<div class="team-legality-note"><strong>Promotion is blocked until every field is source-reviewed</strong><span>Visual review is complete enough to inspect sprites, but Reg M-B still cannot power selectors, training data, coaching recommendations, or trusted matchup stats.</span><small>Selector policy: ' + _escapeHtml(readiness.selectorPolicy) + ' · learning policy: ' + _escapeHtml(readiness.learningPolicy) + ' · coaching policy: ' + _escapeHtml(readiness.coachingPolicy) + '</small></div>' +
    '<div class="tfcard-badges">' + bucketHtml + '</div>' +
    '<div class="replay-coach-tags">' + sample + '</div>' +
    '<div class="team-legality-note"><strong>Next human source actions</strong><ul>' + actions + '</ul></div>';
  grid.appendChild(card);
  return 1;
}
function csRegmbSpriteUrl(species) {
  if (typeof getSpriteUrl === 'function') return getSpriteUrl(species);
  var raw = String(species || '');
  var aliases = {
    'Arcanine-Hisui': 'arcanine-hisui',
    'Ninetales-Alola': 'ninetales-alola',
    'Raichu-Alola': 'raichu-alola',
    'Slowbro-Galar': 'slowbro-galar',
    'Slowking-Galar': 'slowking-galar',
    'Samurott-Hisui': 'samurott-hisui',
    'Typhlosion-Hisui': 'typhlosion-hisui',
    'Zoroark-Hisui': 'zoroark-hisui',
    'Stunfisk-Galar': 'stunfisk-galar',
    'Goodra-Hisui': 'goodra-hisui',
    'Avalugg-Hisui': 'avalugg-hisui',
    'Decidueye-Hisui': 'decidueye-hisui',
    'Tauros-Paldea-Combat': 'tauros-paldea-combat',
    'Tauros-Paldea-Blaze': 'tauros-paldea-blaze',
    'Tauros-Paldea-Aqua': 'tauros-paldea-aqua',
    'Meowstic-M': 'meowstic',
    'Meowstic-F': 'meowstic-f',
    'Gourgeist-Small': 'gourgeist-small',
    'Gourgeist-Average': 'gourgeist',
    'Gourgeist-Large': 'gourgeist-large',
    'Gourgeist-Super': 'gourgeist-super',
    'Basculegion-M': 'basculegion',
    'Basculegion-F': 'basculegion-f',
    'Rotom-Heat': 'rotom-heat',
    'Rotom-Wash': 'rotom-wash',
    'Rotom-Frost': 'rotom-frost',
    'Rotom-Fan': 'rotom-fan',
    'Rotom-Mow': 'rotom-mow',
    'Lycanroc-Midday': 'lycanroc',
    'Lycanroc-Midnight': 'lycanroc-midnight',
    'Lycanroc-Dusk': 'lycanroc-dusk',
    'Maushold': 'maushold',
    'Sinistcha': 'sinistcha'
  };
  var clean = aliases[raw] || raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return 'https://play.pokemonshowdown.com/sprites/ani/' + clean + '.gif';
}
function csRenderRegmbVisualReviewGrid(grid) {
  if (!grid) return 0;
  var rows = csGetRegmbVisualRows();
  if (!rows.length) return 0;
  var host = document.createElement('div');
  host.className = 'team-full-card';
  host.innerHTML = '<div class="tfcard-header"><div><div class="tfcard-name">Reg M-B visual allowlist review</div><div class="tfcard-meta">Sprite-sheet mapping · source-review only · ' + _escapeHtml(rows.length + ' rows') + '</div></div><div class="tfcard-badges"><span class="badge-warn">DO NOT TRAIN/RANK</span><span class="badge-warn">VISUAL REVIEW</span></div></div>' +
    '<div class="team-legality-note"><strong>Human review needed before promotion</strong><span>Compare these rows against the Victory Road source sheets. Rows marked NEEDS REVIEW should be challenged before runtime legality.</span><small>These are not playable teams and do not write trusted coaching stats.</small></div>' +
    '<div class="regmb-visual-grid">' + rows.map(function(row) {
      var confidence = row.confidence || 'needs_human_review';
      var badge = confidence === 'verified_visual' ? 'badge-legal' : 'badge-warn';
      var title = (row.sheetId || '') + ' row ' + (row.sheetRow || '?') + ', col ' + (row.sheetColumn || '?');
      return '<div class="regmb-visual-card" title="' + _escapeHtml(title) + '">' +
        '<img src="' + _escapeHtml(csRegmbSpriteUrl(row.species)) + '" alt="' + _escapeHtml(row.species) + ' sprite" loading="lazy" ' + csSpriteFallbackAttrs(row.species) + '/>' +
        '<div class="regmb-visual-fallback">?</div>' +
        '<strong>' + _escapeHtml(row.species) + '</strong>' +
        '<span>' + _escapeHtml((row.sheetId || '').replace('.jpg', '') + ' R' + row.sheetRow + ' C' + row.sheetColumn) + '</span>' +
        '<em class="' + badge + '">' + _escapeHtml(confidence.replace(/_/g, ' ').toUpperCase()) + '</em>' +
      '</div>';
    }).join('') + '</div>';
  grid.appendChild(host);
  return rows.length;
}
function csRenderRegmbCoverageCards(grid) {
  if (!grid) return 0;
  var sections = csGetRegmbCoverageSections();
  sections.forEach(function(section) {
    var forms = Array.isArray(section.coveredMegaForms) ? section.coveredMegaForms : [];
    var card = document.createElement('div');
    card.className = 'team-full-card';
    if (card.dataset) card.dataset.reviewSection = section.sectionId || '';
    card.innerHTML =
      '<div class="tfcard-header">' +
        '<div>' +
          '<div class="tfcard-name">' + _escapeHtml(section.label || 'Reg M-B review section') + '</div>' +
          '<div class="tfcard-meta">SOURCE REVIEW · Hidden from legal sim selectors · ' + _escapeHtml(forms.length + ' new Mega rows') + '</div>' +
        '</div>' +
        '<div class="tfcard-badges">' +
          '<span class="badge-warn">REG M-B REVIEW</span>' +
          '<span class="badge-warn" title="' + _escapeHtml(section.poisoningGuard || 'review_only_do_not_train_or_rank') + '">DO NOT TRAIN/RANK</span>' +
        '</div>' +
      '</div>' +
      '<div class="team-legality-note"><strong>Review-only coverage fixture</strong><span>' +
        _escapeHtml(forms.join(', ')) +
      '</span><small>These rows are visible for source conversion planning only. They are not playable teams until stones, stats, typing, abilities, sprites, learnsets, and fixtures are promoted.</small></div>';
    grid.appendChild(card);
  });
  return sections.length;
}
function teamMatchesFilter(key, team, filter) {
  if (!team) return false;
  if (!isVisibleTeamInCatalog(key, team, { includeCustom: true })) return false;
  var isCustom = team.source === 'custom';
  var evidence = csTeamRulesetEvidence(team);
  var tags = csTeamRulesetTags(key, team);
  if (filter === 'all') return true;
  if (filter === 'custom') return isCustom;
  if (filter === 'preloaded') return !isCustom;
  if (filter === 'tournament') return !isCustom && !!TOURNAMENT_TEAM_KEYS[key];
  if (filter === 'mega') return /^mega_/.test(key);
  if (filter === 'regma') return tags.indexOf('reg-m-a') >= 0;
  if (filter === 'historical') return evidence.ruleset_status === 'historical';
  if (filter === 'regmb_review') return tags.indexOf('reg-m-b') >= 0 || evidence.ruleset_status === 'source_review';
  return true;
}
function countTeamsByFilter(filter) {
  var n = 0;
  for (var k in TEAMS) if (teamMatchesFilter(k, TEAMS[k], filter)) n++;
  if (filter === 'regmb_review') n += csGetRegmbCoverageSections().length;
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
    { id:'mega',       label:'Mega' },
    { id:'regma',      label:'Reg M-A' },
    { id:'historical', label:'Historical' },
    { id:'regmb_review', label:'Reg M-B Review' }
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
    const isPlayer = key === currentPlayerKey;
    const compactTeamsPicker = shouldUseCompactTeamsPicker();
    const legalityVerdict = getTeamLegalityVerdict(key, team);
    const legalityNote = !legalityVerdict.valid
      ? ((team.format === 'sv')
          ? '<div class="team-legality-note"><strong>SV compatibility team</strong><span>' +
            _escapeHtml(legalityVerdict.errors.slice(0, 3).join('; ') || 'This team is outside the Champions review lane.') +
            '</span><small>Keep this visible for legacy comparison only. Live Champions review and trust scoring stay on Champions-format teams.</small></div>'
          : '<div class="team-legality-note"><strong>Not legal for current sim rules</strong><span>' +
            _escapeHtml(legalityVerdict.errors.slice(0, 3).join('; ') || 'Unknown legality issue') +
            '</span><small>Team remains visible for review/testing, but results should be treated as untrusted until the source data is fixed.</small></div>')
      : '';
    const card = document.createElement('div');
    card.className = 'team-full-card';
    if (card.dataset) card.dataset.teamKey = key;
    else card._teamKey = key;
    card.innerHTML = `
      <div class="tfcard-header">
        <div>
          <div class="tfcard-name">${_escapeHtml(team.name)}</div>
          <div class="tfcard-meta">${_escapeHtml((team.style || '').toUpperCase().replace('_',' '))} · ${_escapeHtml((team.description||'').substring(0,55))}…</div>
        </div>
        <div class="tfcard-badges">
          <span class="badge ${isPlayer?'badge-blue':'badge-red'}">${_escapeHtml(team.label||key)}</span>
          ${csRenderTeamRulesetBadges(key, team)}
          ${(function(){ /* Issue #T6: legality badge - T9h: legal_inferred */
            var st = team.legality_status; var fmt = team.format;
            if (!legalityVerdict.valid && fmt === 'sv') return '<span class="badge-warn" title="' + _escapeHtml((legalityVerdict.errors || []).join('; ')) + '">\u26A0 SV COMPAT ONLY</span>';
            if (!legalityVerdict.valid) return '<span class="badge-illegal" title="' + _escapeHtml(legalityVerdict.errors.join('; ')) + '">\u274C NOT LEGAL</span>';
            if (st === 'legal' && fmt === 'champions') return '<span class="badge-legal">\u2705 LEGAL</span>';
            if (st === 'legal_inferred' && fmt === 'champions') return '<span class="badge-warn" title="' + _escapeHtml((legalityVerdict.warnings || []).join('; ') || 'Tournament-placement team; spreads are inferred from source archetypes.') + '">\u26A0 ' + _escapeHtml(legalityVerdict.label || 'LEGAL (inferred)') + '</span>';
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
      ${legalityNote}
      ${buildBringPickerHtml(key, { compact: compactTeamsPicker })}`;
    grid.appendChild(card);
  }
  if (TEAMS_FILTER === 'regmb_review') {
    csRenderRegmbCoverageCards(grid);
    csRenderRegmbVisualReviewGrid(grid);
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
  grid.querySelectorAll('.team-mon-detail-btn').forEach(btn => {
    btn.addEventListener('click', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openTeamStatDetailPanel(btn.dataset.team, btn.dataset.mon, btn);
    });
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
  // Returns { added, skipped, keys:[...], skippedErrors:[...] } so file-upload
  // imports can tell users exactly why a parsed team did not enter the sim.
  var added = 0, skipped = 0, keys = [], skippedErrors = [];
  if (!Array.isArray(teams)) return { added: 0, skipped: 0, keys: [], skippedErrors: [] };
  for (var i = 0; i < teams.length; i++) {
    var t = teams[i];
    if (!t || !Array.isArray(t.members) || t.members.length === 0) {
      skipped++;
      skippedErrors.push({ name: (t && t.name) || 'Imported Team', errors: ['No Pokemon or moves were parsed from this team.'], warnings: [] });
      continue;
    }
    var key = _uniqueCustomKey(t.name);
    var name = _uniqueTeamName(t.name || 'Imported Team');
    var validation = buildImportedTeamValidation(t.members, { name: name, format: 'champions' });
    if (!validation.valid) {
      skipped++;
      skippedErrors.push({ name: name, errors: validation.errors.slice(0), warnings: validation.warnings.slice(0) });
      continue;
    }
    TEAMS[key] = {
      name: name,
      label: 'CUSTOM',
      style: 'custom',
      description: 'Imported via bulk file',
      members: t.members,
      source: 'custom',
      format: 'champions',
      legality_status: 'unverified',
      import_warnings: validation.warnings,
      import_errors: validation.errors,
      showdown_source_version: validation.sourceVersion,
      created_at: new Date().toISOString()
    };
    added++;
    keys.push(key);
    // M5: persist to Supabase (fire-and-forget)
    if (typeof _upsertTeamToDB === 'function') _upsertTeamToDB(key, TEAMS[key], 'bulk_import');
  }
  if (added > 0 && typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
  return { added: added, skipped: skipped, keys: keys, skippedErrors: skippedErrors };
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
      parts.push(exportTeamToPasteWithOptions(TEAMS[k], { showdownCompatible: true }));
      parts.push('');
    }
  }
  return parts.join('\n').trim() + '\n';
}

var CS_LAST_DOWNLOAD_URL = null;
var CS_QA_DROP_DIR_HANDLE = null;
function csQaDropFolderSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}
async function csChooseQaDropFolder() {
  if (!csQaDropFolderSupported()) {
    alert('This browser cannot write directly to a Mac folder from the page. Use normal download, then move the JSON into /Users/kevinmedeiros/Champions-QA-Drops.');
    return null;
  }
  CS_QA_DROP_DIR_HANDLE = await window.showDirectoryPicker({
    id: 'champions-qa-drops',
    mode: 'readwrite',
    startIn: 'downloads'
  });
  try {
    var btn = document.getElementById('qa-drop-folder-btn');
    if (btn) btn.textContent = 'QA Drop Folder Set';
  } catch (_e) {}
  return CS_QA_DROP_DIR_HANDLE;
}
async function csSaveTextToQaDropFolder(filename, mime, text) {
  if (!csQaDropFolderSupported()) return false;
  var handle = CS_QA_DROP_DIR_HANDLE || await csChooseQaDropFolder();
  if (!handle) return false;
  if (handle.requestPermission) {
    var perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return false;
  }
  var fileHandle = await handle.getFileHandle(filename, { create: true });
  var writable = await fileHandle.createWritable();
  await writable.write(new Blob([text], { type: mime }));
  await writable.close();
  return true;
}
function _downloadBlob(filename, mime, text) {
  try {
    if (CS_LAST_DOWNLOAD_URL && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(CS_LAST_DOWNLOAD_URL); } catch (_e) {}
      CS_LAST_DOWNLOAD_URL = null;
    }
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    CS_LAST_DOWNLOAD_URL = url;
    var a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function(){ try { document.body.removeChild(a); } catch (_e) {} }, 100);
    var wrap = document.getElementById('progress-wrap') || document.body;
    var fallback = document.getElementById('download-ready-link');
    if (!fallback) {
      fallback = document.createElement('a');
      fallback.id = 'download-ready-link';
      fallback.className = 'btn-secondary';
      fallback.style.display = 'inline-flex';
      fallback.style.marginTop = '8px';
      fallback.style.width = 'fit-content';
      fallback.style.textDecoration = 'none';
      wrap.appendChild(fallback);
    }
    fallback.href = url;
    fallback.download = filename;
    fallback.textContent = 'Download ready: ' + filename;
  } catch (e) { UILog.warn('Download failed', e); alert('Could not download file: ' + e.message); }
}

async function _saveQaArtifactBlob(filename, mime, text, opts) {
  opts = opts || {};
  if (opts.preferDropFolder !== false && csQaDropFolderSupported()) {
    try {
      var saved = await csSaveTextToQaDropFolder(filename, mime, text);
      if (saved) {
        var fallback = document.getElementById('download-ready-link');
        if (!fallback) {
          var wrap = document.getElementById('progress-wrap') || document.body;
          fallback = document.createElement('span');
          fallback.id = 'download-ready-link';
          fallback.className = 'btn-secondary';
          fallback.style.display = 'inline-flex';
          fallback.style.marginTop = '8px';
          fallback.style.width = 'fit-content';
          wrap.appendChild(fallback);
        }
        fallback.textContent = 'Saved to QA drop folder: ' + filename;
        return 'drop-folder';
      }
    } catch (e) {
      UILog.warn('QA drop folder save failed; falling back to browser download', e);
    }
  }
  _downloadBlob(filename, mime, text);
  return 'download';
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
    if (result.skipped > 0) {
      msg += ' (' + result.skipped + ' skipped)';
      if (result.skippedErrors && result.skippedErrors.length) {
        var firstSkip = result.skippedErrors[0] || {};
        var firstErrors = (firstSkip.errors || []).slice(0, 3).join('; ');
        if (firstErrors) msg += '\n\nFirst skipped team: ' + (firstSkip.name || 'Imported Team') + '\n' + firstErrors;
      }
    }
    alert(msg + '.');
  };
  reader.readAsText(file);
});


// ============================================================
// EDITOR TAB
// ============================================================
let editingIdx = null;
const STAT_PANEL_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_PANEL_LABELS = { hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe' };
const STAT_PANEL_NATURE_PLUS = {
  Adamant:'atk', Bold:'def', Modest:'spa', Calm:'spd', Jolly:'spe', Timid:'spe',
  Impish:'def', Careful:'spd', Brave:'atk', Quiet:'spa', Relaxed:'def', Sassy:'spd'
};
const STAT_PANEL_NATURE_MINUS = {
  Adamant:'spa', Bold:'atk', Modest:'atk', Calm:'atk', Jolly:'spa', Timid:'atk',
  Impish:'spa', Careful:'spa', Brave:'spe', Quiet:'spe', Relaxed:'spe', Sassy:'spe'
};

function renderStatPanelHtml(member) {
  const evs = (member && member.evs) || {};
  const ivs = (member && member.ivs) || {};
  const nature = (member && member.nature) || 'Hardy';
  const plus = STAT_PANEL_NATURE_PLUS[nature] || null;
  const minus = STAT_PANEL_NATURE_MINUS[nature] || null;
  const evTotal = STAT_PANEL_KEYS.reduce((sum, key) => sum + (parseInt(evs[key], 10) || 0), 0);
  const rows = STAT_PANEL_KEYS.map(key => {
    const natureMark = key === plus ? '+' : key === minus ? '-' : '';
    const natureCls = key === plus ? ' plus' : key === minus ? ' minus' : '';
    return '<div class="stat-panel-row">' +
      '<span class="stat-panel-stat">' + STAT_PANEL_LABELS[key] + '</span>' +
      '<span class="stat-panel-pill">SP ' + (parseInt(evs[key], 10) || 0) + '</span>' +
      '<span class="stat-panel-pill">Fixed IV ' + (ivs[key] == null ? 31 : parseInt(ivs[key], 10) || 0) + '</span>' +
      '<span class="stat-panel-nature' + natureCls + '">' + natureMark + '</span>' +
    '</div>';
  }).join('');
  return '<section class="stat-panel" aria-label="Stat panel">' +
    '<div class="stat-panel-head">' +
      '<span>Stats</span>' +
      '<span class="stat-panel-meta">' + _escapeHtml(nature) + ' · SP ' + evTotal + '/66</span>' +
    '</div>' +
    '<div class="stat-panel-grid">' + rows + '</div>' +
  '</section>';
}

function buildTeamStatDetailModel(teamKey, monName) {
  const team = TEAMS[teamKey];
  const member = team && Array.isArray(team.members)
    ? team.members.find(function(m){ return m && m.name === monName; })
    : null;
  if (!team || !member) return null;
  const evs = Object.assign({ hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }, member.evs || {});
  const ivs = Object.assign({ hp:31, atk:31, def:31, spa:31, spd:31, spe:31 }, member.ivs || {});
  let battleMon = null;
  try {
    if (typeof Pokemon !== 'undefined') {
      battleMon = new Pokemon(Object.assign({}, member, { evs: evs, ivs: ivs }), team.style || '', team.format || member.format || null);
    }
  } catch (_e) { battleMon = null; }
  const baseName = battleMon ? battleMon.name : member.name;
  const base = (battleMon && battleMon._base)
    || (typeof BASE_STATS !== 'undefined' && BASE_STATS[baseName])
    || { hp:0, atk:0, def:0, spa:0, spd:0, spe:0, types:[] };
  const types = (battleMon && battleMon.types)
    || (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[baseName])
    || base.types
    || [];
  const finalStats = battleMon ? {
    hp: battleMon.maxHp,
    atk: battleMon.baseAtk,
    def: battleMon.baseDef,
    spa: battleMon.baseSpa,
    spd: battleMon.baseSpd,
    spe: battleMon.baseSpe
  } : { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
  finalStats.total = STAT_PANEL_KEYS.reduce(function(sum, key){ return sum + (parseInt(finalStats[key], 10) || 0); }, 0);
  const baseStats = {
    hp: base.hp || 0, atk: base.atk || 0, def: base.def || 0,
    spa: base.spa || 0, spd: base.spd || 0, spe: base.spe || 0
  };
  baseStats.total = STAT_PANEL_KEYS.reduce(function(sum, key){ return sum + (parseInt(baseStats[key], 10) || 0); }, 0);
  let roles = [];
  try {
    if (typeof classifyPokemon === 'function') roles = (classifyPokemon(member).roles || []);
  } catch (_e) { roles = []; }
  return {
    teamKey: teamKey,
    teamName: team.name || teamKey,
    name: member.name,
    displayName: (battleMon && battleMon.displayName) || member.name,
    form: (battleMon && battleMon.megaForm) ? (member.name + ' -> ' + battleMon.megaForm.megaName) : member.name,
    types: types,
    baseStats: baseStats,
    evs: evs,
    ivs: ivs,
    nature: member.nature || 'Hardy',
    finalStats: finalStats,
    ability: (battleMon && battleMon.ability) || member.ability || '',
    item: member.item || '',
    moves: member.moves || [],
    roles: roles
  };
}

function renderTeamStatDetailHtml(model) {
  if (!model) return '';
  function statRow(key) {
    return '<tr><th scope="row">' + STAT_PANEL_LABELS[key] + '</th>' +
      '<td>' + (model.baseStats[key] || 0) + '</td>' +
      '<td>' + (parseInt(model.evs[key], 10) || 0) + '</td>' +
      '<td>' + (model.ivs[key] == null ? 31 : parseInt(model.ivs[key], 10) || 0) + '</td>' +
      '<td>' + (model.finalStats[key] || 0) + '</td></tr>';
  }
  const moveHtml = (model.moves.length ? model.moves : ['-', '-', '-', '-']).map(function(mv){
    return '<span class="team-detail-chip">' + _escapeHtml(mv || '-') + '</span>';
  }).join('');
  const roleHtml = (model.roles && model.roles.length ? model.roles : ['Support']).map(function(role){
    return '<span class="team-detail-chip muted">' + _escapeHtml(role) + '</span>';
  }).join('');
  return '<div class="team-detail-backdrop" id="team-detail-modal" role="presentation">' +
    '<section class="team-detail-modal" role="dialog" aria-modal="true" aria-labelledby="team-detail-title" tabindex="-1">' +
      '<div class="team-detail-head">' +
        '<div><div class="team-detail-kicker">' + _escapeHtml(model.teamName) + '</div>' +
        '<h2 id="team-detail-title">' + _escapeHtml(model.displayName) + '</h2></div>' +
        '<button class="team-detail-close" id="team-detail-close" type="button" aria-label="Close Pokemon details">&times;</button>' +
      '</div>' +
      '<div class="team-detail-meta">' +
        '<span>' + _escapeHtml((model.types || []).join(' / ') || '-') + '</span>' +
        '<span>' + _escapeHtml(model.form || '-') + '</span>' +
        '<span>' + _escapeHtml(model.nature || 'Hardy') + '</span>' +
      '</div>' +
      '<div class="team-detail-fields">' +
        '<div><strong>Ability</strong><span>' + _escapeHtml(model.ability || '-') + '</span></div>' +
        '<div><strong>Item</strong><span>' + _escapeHtml(model.item || '-') + '</span></div>' +
        '<div><strong>BST</strong><span>' + model.baseStats.total + '</span></div>' +
        '<div><strong>Total</strong><span>' + model.finalStats.total + '</span></div>' +
      '</div>' +
      '<div class="team-detail-section"><h3>Stats</h3>' +
        '<div class="team-detail-table-wrap"><table class="team-detail-table">' +
          '<thead><tr><th>Stat</th><th>Base</th><th>SP</th><th>Fixed IV</th><th>Final</th></tr></thead>' +
          '<tbody>' + STAT_PANEL_KEYS.map(statRow).join('') + '</tbody>' +
        '</table></div>' +
      '</div>' +
      '<div class="team-detail-section"><h3>Moves</h3><div class="team-detail-chip-row">' + moveHtml + '</div></div>' +
      '<div class="team-detail-section"><h3>Roles</h3><div class="team-detail-chip-row">' + roleHtml + '</div></div>' +
    '</section>' +
  '</div>';
}

let _teamDetailReturnFocus = null;
function closeTeamStatDetailPanel() {
  const modal = document.getElementById('team-detail-modal');
  if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  document.removeEventListener('keydown', _handleTeamDetailKeydown);
  if (_teamDetailReturnFocus && typeof _teamDetailReturnFocus.focus === 'function') {
    try { _teamDetailReturnFocus.focus(); } catch (_e) {}
  }
  _teamDetailReturnFocus = null;
}
function _handleTeamDetailKeydown(ev) {
  const modal = document.getElementById('team-detail-modal');
  if (!modal) return;
  if (ev.key === 'Escape') { ev.preventDefault(); closeTeamStatDetailPanel(); return; }
  if (ev.key !== 'Tab') return;
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (ev.shiftKey && document.activeElement === first) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && document.activeElement === last) {
    ev.preventDefault();
    first.focus();
  }
}
function openTeamStatDetailPanel(teamKey, monName, triggerEl) {
  const model = buildTeamStatDetailModel(teamKey, monName);
  if (!model) return;
  closeTeamStatDetailPanel();
  _teamDetailReturnFocus = triggerEl || document.activeElement;
  const wrap = document.createElement('div');
  wrap.innerHTML = renderTeamStatDetailHtml(model);
  const modal = wrap.firstElementChild;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(ev){ if (ev.target === modal) closeTeamStatDetailPanel(); });
  const closeBtn = document.getElementById('team-detail-close');
  if (closeBtn) closeBtn.addEventListener('click', closeTeamStatDetailPanel);
  document.addEventListener('keydown', _handleTeamDetailKeydown);
  const dialog = modal.querySelector('.team-detail-modal');
  if (dialog && typeof dialog.focus === 'function') dialog.focus();
}

function renderEditorRoster() {
  const el = document.getElementById('editor-roster');
  const team = getEditablePlayerTeam();
  const status = document.getElementById('editor-team-status');
  if (status) {
    var count = team && Array.isArray(team.members) ? team.members.length : 0;
    var sourceLabel = team && team.source === 'custom' ? 'Custom team' : 'Preloaded override';
    status.innerHTML = team
      ? '<strong>Editing: ' + _escapeHtml(team.name || currentPlayerKey) + '</strong><span>' + _escapeHtml(sourceLabel) + ' · ' + count + '/6 Pokemon · saves affect future sims</span>'
      : '<strong>No team loaded</strong><span>Select a player team first.</span>';
  }
  if (!el) return;
  el.innerHTML = '';
  if (!team || !Array.isArray(team.members)) return;
  team.members.forEach((m, i) => {
    const btn = document.createElement('button');
    btn.className = 'editor-poke-btn';
    btn.innerHTML = `<img class="editor-poke-sprite" src="${getSpriteUrl(m.name)}" alt="${_escapeHtml(m.name || '')}" ${csSpriteFallbackAttrs(m.name)}/><span>${_escapeHtml(m.name || '')}</span>`;
    btn.addEventListener('click', () => { document.querySelectorAll('.editor-poke-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); openEditorForm(i); });
    el.appendChild(btn);
  });
}

function csBlankChampionMember() {
  return {
    name: 'Pikachu',
    item: '',
    ability: 'Static',
    level: 50,
    nature: 'Hardy',
    role: '',
    moves: ['Protect'],
    evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }
  };
}

function csPersistEditedTeam(team, sourceTag) {
  if (!team) return;
  if (team.source === 'custom' && typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
  else if (team.source !== 'custom' && typeof savePreloadedOverride === 'function') savePreloadedOverride(currentPlayerKey);
  if (typeof _upsertTeamToDB === 'function') _upsertTeamToDB(currentPlayerKey, team, sourceTag || 'set_editor');
}

function csRefreshEditorTeamViews(team) {
  if (!team) return;
  renderRoster('player-roster', team.members || []);
  renderEditorRoster();
  renderTeamsGrid();
  if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
}

function addEditorPokemonSlot() {
  const team = getEditablePlayerTeam();
  if (!team) return;
  team.members = Array.isArray(team.members) ? team.members : [];
  if (team.members.length >= 6) {
    alert('Champion teams are capped at 6 Pokemon.');
    return;
  }
  team.members.push(csBlankChampionMember());
  csPersistEditedTeam(team, 'set_editor_add_slot');
  csRefreshEditorTeamViews(team);
  openEditorForm(team.members.length - 1);
}

function removeEditorPokemonSlot() {
  if (editingIdx === null) return;
  const team = getEditablePlayerTeam();
  if (!team || !Array.isArray(team.members) || !team.members[editingIdx]) return;
  if (team.members.length <= 1) {
    alert('Keep at least one Pokemon on the team.');
    return;
  }
  var removed = team.members[editingIdx].name || 'this Pokemon';
  if (!confirm('Remove ' + removed + ' from this team?')) return;
  team.members.splice(editingIdx, 1);
  var nextIdx = Math.min(editingIdx, team.members.length - 1);
  editingIdx = null;
  csPersistEditedTeam(team, 'set_editor_remove_slot');
  csRefreshEditorTeamViews(team);
  if (nextIdx >= 0) openEditorForm(nextIdx);
}

function buildSetEditorMoveLegalityWarnings(member) {
  var api = ChampionsSim && ChampionsSim.moveLegality;
  if (!api || typeof api.validateMovesForSet !== 'function') {
    return [{
      severity: 'unchecked',
      text: 'Move legality unchecked: generated Pokemon Showdown source data is not loaded.'
    }];
  }
  var checks = api.validateMovesForSet(member || {});
  if (!checks.length) return [];
  return checks.filter(function(row) {
    return !row.legal || row.reason === 'source_unavailable' || row.reason === 'unknown_species';
  }).map(function(row) {
    var severity = getMoveLegalityIssueSeverity(row.reason);
    return {
      severity: severity,
      text: (row.moveName || 'Unknown move') + ' on ' + (row.canonicalSpeciesKey || member.name || 'unknown species') + ': ' + (row.reason || 'unchecked') + '. Source: ' + (row.source || 'unavailable') + ' ' + (row.sourceVersion || '') + '. ' + (row.notes || '')
    };
  });
}

function renderSetEditorMoveLegalityHtml(member) {
  var warnings = buildSetEditorMoveLegalityWarnings(member);
  if (!warnings.length) {
    return '<div class="editor-legality-ok">Move legality checked against Pokemon Showdown species/form learnsets.</div>';
  }
  return '<div class="editor-legality-warnings">' + warnings.map(function(row) {
    return '<div class="editor-legality-warning ' + _escapeHtml(row.severity) + '">' + _escapeHtml(row.text) + '</div>';
  }).join('') + '</div>';
}

function csRenderEditorItemDatalist() {
  var list = document.getElementById('editor-item-list');
  if (!list || typeof CHAMPIONS_LEGAL_ITEMS === 'undefined' || !CHAMPIONS_LEGAL_ITEMS) return 0;
  var items = Array.from(CHAMPIONS_LEGAL_ITEMS).sort(function(a, b) { return a.localeCompare(b); });
  list.innerHTML = items.map(function(item) {
    return '<option value="' + _escapeHtml(item) + '"></option>';
  }).join('');
  return items.length;
}

function csRenderEditorItemLegalityHtml(member) {
  var item = member && member.item ? String(member.item).trim() : '';
  if (!item) return '<div class="editor-legality-ok">No held item selected.</div>';
  if (typeof CHAMPIONS_LEGAL_ITEMS !== 'undefined' && CHAMPIONS_LEGAL_ITEMS && CHAMPIONS_LEGAL_ITEMS.has(item)) {
    return '<div class="editor-legality-ok">Item checked against the current Champions item pool.</div>';
  }
  var knownAbsent = typeof CHAMPIONS_BANNED_ITEMS !== 'undefined' && CHAMPIONS_BANNED_ITEMS && CHAMPIONS_BANNED_ITEMS.has(item);
  return '<div class="editor-legality-warnings"><div class="editor-legality-warning error">' +
    _escapeHtml(item + ': not legal for the current implemented Champions item pool' + (knownAbsent ? ' (confirmed absent).' : '.')) +
    '</div></div>';
}

function csRenderEditorMoveDatalist(speciesName) {
  var list = document.getElementById('editor-move-list');
  if (!list) return 0;
  var api = ChampionsSim && ChampionsSim.moveLegality;
  var moves = api && typeof api.legalMoveDisplayNamesForSpecies === 'function'
    ? api.legalMoveDisplayNamesForSpecies(speciesName)
    : [];
  list.setAttribute('data-moves', JSON.stringify(moves));
  list.innerHTML = moves.slice(0, 450).map(function(move) {
    return '<option value="' + _escapeHtml(move) + '"></option>';
  }).join('');
  return moves.length;
}

function csGetEditorLegalMoves() {
  var list = document.getElementById('editor-move-list');
  if (!list) return [];
  try {
    var parsed = JSON.parse(list.getAttribute('data-moves') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function csScoreMoveSearch(move, query) {
  var m = String(move || '').toLowerCase();
  var q = String(query || '').toLowerCase().trim();
  if (!q) return 1;
  if (m === q) return 100;
  if (m.indexOf(q) === 0) return 80;
  if (m.indexOf(q) >= 0) return 60;
  var parts = q.split(/\s+/).filter(Boolean);
  var matched = parts.filter(function(part) { return m.indexOf(part) >= 0; }).length;
  return matched ? 30 + matched : 0;
}

function csRenderMoveSearchMenu(input) {
  if (!input) return;
  var idx = input.getAttribute('data-move-index');
  var menu = document.getElementById('ed-mv-menu-' + idx);
  if (!menu) return;
  var query = input.value || '';
  var moves = csGetEditorLegalMoves();
  var ranked = moves.map(function(move) {
    return { move: move, score: csScoreMoveSearch(move, query) };
  }).filter(function(row) {
    return row.score > 0;
  }).sort(function(a, b) {
    return b.score - a.score || a.move.localeCompare(b.move);
  }).slice(0, 12);
  if (!ranked.length) {
    menu.innerHTML = '<div class="editor-move-empty">No legal move matches. Save will block illegal moves.</div>';
    menu.style.display = 'block';
    return;
  }
  menu.innerHTML = ranked.map(function(row) {
    return '<button type="button" class="editor-move-option" data-move="' + _escapeHtml(row.move) + '">' + _escapeHtml(row.move) + '</button>';
  }).join('');
  menu.style.display = 'block';
  menu.querySelectorAll('.editor-move-option').forEach(function(btn) {
    btn.addEventListener('mousedown', function(ev) {
      ev.preventDefault();
      input.value = btn.getAttribute('data-move') || '';
      menu.style.display = 'none';
      refreshEditorMoveLegality();
      input.focus();
    });
  });
}

function csHideMoveSearchMenu(input) {
  if (!input) return;
  var idx = input.getAttribute('data-move-index');
  var menu = document.getElementById('ed-mv-menu-' + idx);
  if (menu) setTimeout(function() { menu.style.display = 'none'; }, 120);
}

function currentEditorMemberForLegality(baseMember) {
  var moves = [0,1,2,3].map(function(i) {
    var el = document.getElementById('ed-mv-' + i);
    return el ? (el.value || '').trim() : '';
  }).filter(Boolean);
  var nameEl = document.getElementById('ed-name');
  var itemEl = document.getElementById('ed-item');
  var abilityEl = document.getElementById('ed-ability');
  return Object.assign({}, baseMember || {}, {
    name: nameEl ? (nameEl.value || '').trim() : ((baseMember && baseMember.name) || ''),
    item: itemEl ? (itemEl.value || '').trim() : ((baseMember && baseMember.item) || ''),
    ability: abilityEl ? (abilityEl.value || '').trim() : ((baseMember && baseMember.ability) || ''),
    moves: moves
  });
}

function refreshEditorMoveLegality(baseMember) {
  var host = document.getElementById('editor-move-legality');
  if (!host) return;
  var current = currentEditorMemberForLegality(baseMember);
  var legalMoveCount = csRenderEditorMoveDatalist(current.name);
  csRenderEditorItemDatalist();
  host.innerHTML = csRenderEditorItemLegalityHtml(current) + renderSetEditorMoveLegalityHtml(current) +
    '<div class="editor-move-source">' +
      (legalMoveCount
        ? _escapeHtml(String(legalMoveCount)) + ' legal move suggestions loaded for ' + _escapeHtml(current.name || 'this Pokemon') + '. You can type a move manually, but Save blocks moves outside this learnset.'
        : 'No legal move suggestions found for this species/form. Check the spelling or source data before saving.') +
    '</div>';
}

function openEditorForm(idx) {
  editingIdx = idx;
  const team = getEditablePlayerTeam();
  if (!team || !Array.isArray(team.members) || !team.members[idx]) return;
  const m = team.members[idx];
  const form = document.getElementById('editor-form');
  const currentSpTotal = ['hp','atk','def','spa','spd','spe'].reduce(function(sum, stat) {
    return sum + (parseInt((m.evs || {})[stat], 10) || 0);
  }, 0);
  const evsHtml = ['hp','atk','def','spa','spd','spe'].map(s=>`
    <div class="form-group">
      <label class="form-label">${s.toUpperCase()}</label>
      <input class="form-input" id="ev-${s}" value="${_escapeHtml(String(m.evs?.[s]||0))}" type="number" min="0" max="32"/>
    </div>`).join('');
  form.innerHTML = `
    <div class="editor-builder-head">
      <div>
        <div class="editor-team-kicker">Editing ${_escapeHtml(team.name || currentPlayerKey)} · Slot ${idx + 1}</div>
        <div class="editor-poke-name">${_escapeHtml(m.name || '')}</div>
      </div>
      <div class="editor-save-note" id="editor-save-note">Draft mode: changes are local until you click Save. Save validates Champion item pool, SP caps, and species-specific moves.</div>
    </div>
    <div class="editor-2col">
      <div class="form-group"><label class="form-label">Pokémon</label><input class="form-input" id="ed-name" value="${_escapeHtml(m.name||'')}" placeholder="Exact species/form name"/></div>
      <div class="form-group"><label class="form-label">Item</label><input class="form-input" id="ed-item" list="editor-item-list" value="${_escapeHtml(m.item||'')}" placeholder="Legal held item"/></div>
      <div class="form-group"><label class="form-label">Ability</label><input class="form-input" id="ed-ability" value="${_escapeHtml(m.ability||'')}"/></div>
      <div class="form-group"><label class="form-label">Nature</label><input class="form-input" id="ed-nature" value="${_escapeHtml(m.nature||'Hardy')}"/></div>
      <div class="form-group"><label class="form-label">Level</label><input class="form-input" id="ed-level" value="${_escapeHtml(String(m.level||50))}" type="number" min="1" max="100"/></div>
      <div class="form-group"><label class="form-label">Role</label><input class="form-input" id="ed-role" value="${_escapeHtml(m.role||'')}"/></div>
    </div>
    <div style="margin-top:var(--sp4)"><label class="form-label" style="display:block;margin-bottom:6px">Moves</label>
    <div class="moves-2col">${[0,1,2,3].map((i)=>`<div class="editor-move-combobox"><input class="form-input" id="ed-mv-${i}" data-move-index="${i}" value="${_escapeHtml((m.moves||[])[i] || '')}" placeholder="Search legal move ${i + 1}"/><div class="editor-move-menu" id="ed-mv-menu-${i}" style="display:none"></div></div>`).join('')}</div></div>
    <div id="editor-move-legality">${renderSetEditorMoveLegalityHtml(m)}</div>
    ${renderStatPanelHtml(m)}
    <div style="margin-top:var(--sp4)"><label class="form-label" style="display:block;margin-bottom:6px">SPs (max 66 total, 32 per stat)</label>
    <div class="ev-6col">${evsHtml}</div>
    <div class="sp-guard-row"><span id="sp-total-chip">SP ${currentSpTotal}/66</span><span id="sp-guard-status"></span></div></div>
    <div style="display:flex;gap:var(--sp3);margin-top:var(--sp4)">
      <button class="btn-save" id="save-edits">Save Changes</button>
      <button class="btn-secondary" style="font-size:11px" id="cancel-edits" title="Discard unsaved field changes and restore the saved set">Cancel</button>
      <button class="btn-secondary" style="font-size:11px" id="export-this-mon" title="Export full team">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Export Team
      </button>
      <button class="btn-secondary" style="font-size:11px" id="remove-this-mon" title="Remove this Pokemon from the current editable team">Remove</button>
    </div>
    <p style="font-size:10px;color:var(--text-m);margin-top:6px">Save applies changes to future simulations. Cancel restores the last saved set.</p>`;
  document.getElementById('save-edits').addEventListener('click', saveEdits);
  document.getElementById('cancel-edits').addEventListener('click', cancelEditorDraft);
  document.getElementById('export-this-mon').addEventListener('click', () => openExportModal(currentPlayerKey));
  document.getElementById('remove-this-mon').addEventListener('click', removeEditorPokemonSlot);
  [0,1,2,3].forEach(function(i) {
    var el = document.getElementById('ed-mv-' + i);
    if (el) {
      el.addEventListener('input', function() { markEditorDraftDirty(); refreshEditorMoveLegality(m); csRenderMoveSearchMenu(el); });
      el.addEventListener('focus', function() { refreshEditorMoveLegality(m); csRenderMoveSearchMenu(el); });
      el.addEventListener('blur', function() { csHideMoveSearchMenu(el); });
      el.addEventListener('keydown', function(ev) {
        var menu = document.getElementById('ed-mv-menu-' + i);
        if (ev.key === 'Escape' && menu) menu.style.display = 'none';
        if (ev.key === 'Enter' && menu && menu.style.display !== 'none') {
          var first = menu.querySelector('.editor-move-option');
          if (first) {
            ev.preventDefault();
            el.value = first.getAttribute('data-move') || '';
            menu.style.display = 'none';
            refreshEditorMoveLegality(m);
          }
        }
      });
    }
  });
  ['ed-name','ed-item','ed-ability'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function() { markEditorDraftDirty(); refreshEditorMoveLegality(m); });
  });
  ['hp','atk','def','spa','spd','spe'].forEach(function(stat) {
    var el = document.getElementById('ev-' + stat);
    if (el) el.addEventListener('input', function() { markEditorDraftDirty(); refreshEditorSpreadGuard(); });
  });
  refreshEditorSpreadGuard();
  refreshEditorMoveLegality(m);
}

function markEditorDraftDirty() {
  var note = document.getElementById('editor-save-note');
  var cancelBtn = document.getElementById('cancel-edits');
  if (note) {
    note.classList.add('dirty');
    note.textContent = 'Unsaved draft: click Save to apply this set, or Cancel to restore the last saved version.';
  }
  if (cancelBtn) cancelBtn.classList.add('dirty');
}

function clearEditorDraftDirty() {
  var note = document.getElementById('editor-save-note');
  var cancelBtn = document.getElementById('cancel-edits');
  if (note) {
    note.classList.remove('dirty');
    note.textContent = 'Draft mode: changes are local until you click Save. Save validates Champion item pool, SP caps, and species-specific moves.';
  }
  if (cancelBtn) cancelBtn.classList.remove('dirty');
}

function cancelEditorDraft() {
  if (editingIdx === null) return;
  openEditorForm(editingIdx);
}

function getEditorSpreadFromInputs() {
  var evs = {};
  ['hp','atk','def','spa','spd','spe'].forEach(function(stat) {
    var el = document.getElementById('ev-' + stat);
    var raw = el ? el.value : '0';
    var parsed = parseInt(raw, 10);
    evs[stat] = Number.isFinite(parsed) ? parsed : 0;
  });
  return evs;
}

function refreshEditorSpreadGuard() {
  var evs = getEditorSpreadFromInputs();
  var total = ['hp','atk','def','spa','spd','spe'].reduce(function(sum, stat) { return sum + (evs[stat] || 0); }, 0);
  var chip = document.getElementById('sp-total-chip');
  var status = document.getElementById('sp-guard-status');
  var saveBtn = document.getElementById('save-edits');
  var errors = typeof validateChampionsSpread === 'function'
    ? validateChampionsSpread(evs, 'This Pokemon')
    : (total > 66 ? ['This Pokemon: SPs exceed 66 (got ' + total + ') [champions format]'] : []);
  if (chip) {
    chip.textContent = 'SP ' + total + '/66';
    chip.classList.toggle('bad', errors.length > 0);
  }
  if (status) {
    status.textContent = errors.length ? errors[0] : 'Legal Champion spread';
    status.classList.toggle('bad', errors.length > 0);
  }
  if (saveBtn) saveBtn.disabled = errors.length > 0;
  return { evs: evs, errors: errors };
}

function saveEdits() {
  if (editingIdx === null) return;
  const team = getEditablePlayerTeam();
  if (!team || !Array.isArray(team.members) || !team.members[editingIdx]) return;
  var spreadGuard = refreshEditorSpreadGuard();
  if (spreadGuard.errors.length) return;
  const editedMember = Object.assign({}, team.members[editingIdx], {
    name: (document.getElementById('ed-name').value.trim() || team.members[editingIdx].name),
    item: document.getElementById('ed-item').value.trim(),
    ability: document.getElementById('ed-ability').value.trim(),
    nature: document.getElementById('ed-nature').value.trim(),
    level: Math.max(1, Math.min(100, parseInt(document.getElementById('ed-level').value, 10) || 50)),
    role: document.getElementById('ed-role').value.trim(),
    moves: [0,1,2,3].map(i => (document.getElementById(`ed-mv-${i}`)?.value||'').trim()).filter(Boolean),
    evs: spreadGuard.evs
  });
  var candidateMembers = team.members.slice();
  candidateMembers[editingIdx] = editedMember;
  var validation = buildImportedTeamValidation(candidateMembers, { name: team.name, format: team.format || 'champions' });
  if (!validation.valid) {
    var status = document.getElementById('sp-guard-status');
    if (status) {
      status.textContent = validation.errors[0] || 'Team is not legal for Champions.';
      status.classList.add('bad');
    }
    return;
  }
  team.members[editingIdx] = editedMember;
  team.import_warnings = validation.warnings;
  team.import_errors = validation.errors;
  team.showdown_source_version = validation.sourceVersion;
  csPersistEditedTeam(team, 'set_editor');
  csRefreshEditorTeamViews(team);
  const btn = document.getElementById('save-edits');
  const orig = btn.textContent;
  clearEditorDraftDirty();
  btn.textContent = '✓ Saved!'; btn.style.background='var(--green)';
  setTimeout(()=>{ btn.textContent=orig; btn.style.background=''; }, 1500);
  // Update coverage widget when player team changes
}

renderEditorRoster();

document.getElementById('export-team-editor')?.addEventListener('click', ()=>openExportModal(currentPlayerKey));
document.getElementById('import-team-editor')?.addEventListener('click', ()=>{ openImportModal(); var imp=document.getElementById('import-slot'); if(imp) imp.value=currentPlayerKey; });
document.getElementById('add-team-mon')?.addEventListener('click', addEditorPokemonSlot);

// ============================================================
// EXPORT MODAL
// ============================================================
function openExportModal(teamKey) {
  const team = TEAMS[teamKey];
  if (!team) return;
  const paste = exportTeamToPasteWithOptions(team, { showdownCompatible: true });
  document.getElementById('export-text').value = paste;
  _openModalOverlay('export-modal', { focusSelector: '#export-text', labelledbyId: 'export-modal-title' });
}
document.getElementById('close-export')?.addEventListener('click', ()=>{ _closeModalOverlay('export-modal'); });
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
  _openModalOverlay('import-modal', { focusSelector: '#showdown-paste', labelledbyId: 'import-modal-title' });
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
function closeImportModal() { _closeModalOverlay('import-modal'); }

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

document.getElementById('load-sample-import-team')?.addEventListener('click', function() {
  var sample = TEAMS.kevin_meta_sun || TEAMS.targeted_proof_legal || TEAMS.player;
  var ta = document.getElementById('showdown-paste');
  if (!sample || !ta) return;
  ta.value = exportTeamToPasteWithOptions(sample, { showdownCompatible: true });
  var pasteTab = document.querySelector('.import-tab[data-itab="paste"]');
  if (pasteTab) pasteTab.click();
  var slot = document.getElementById('import-slot');
  if (slot) slot.value = '__new__';
  ta.dispatchEvent(new Event('input'));
  var statusEl = document.getElementById('import-status');
  if (statusEl) {
    statusEl.textContent = 'Sample loaded. Review the checker, then click Load Team.';
    statusEl.className = 'modal-status ok';
  }
});

document.getElementById('import-slot')?.addEventListener('change', function() {
  var ta = document.getElementById('showdown-paste');
  if (ta && ta.value.trim()) {
    var parsed = parseShowdownPaste(ta.value);
    if (parsed.length) showImportPreview(parsed);
  }
});

function showImportPreview(members) {
  const preview = document.getElementById('import-preview');
  const roster = document.getElementById('preview-roster');
  const validation = buildImportedTeamValidation(members, { format: 'champions' });
  const flow = document.getElementById('import-flow-card');
  const dest = document.getElementById('import-destination-card');
  const slotEl = document.getElementById('import-slot');
  const slot = slotEl ? slotEl.value : '__new__';
  const destination = slot === '__new__' ? 'New custom team' : ((TEAMS[slot] && TEAMS[slot].name) || slot || 'Selected slot');
  const memberWarningsTotal = Object.keys(validation.memberWarnings || {}).reduce(function(sum, key) {
    return sum + ((validation.memberWarnings[key] || []).length);
  }, 0);
  if (flow) {
    flow.innerHTML = '<strong>' + (validation.valid ? 'Ready to load' : 'Blocked until fixed') + '</strong>' +
      '<span>' + members.length + '/6 Pokemon parsed · ' + validation.errors.length + ' errors · ' + validation.warnings.length + ' warnings · ' + memberWarningsTotal + ' move checks flagged</span>' +
      '<div class="import-check-chips">' +
        '<span class="' + (members.length >= 1 && members.length <= 6 ? 'ok' : 'bad') + '">Roster ' + members.length + '/6</span>' +
        '<span class="' + (validation.errors.length ? 'bad' : 'ok') + '">' + (validation.errors.length ? 'Fix errors' : 'No hard errors') + '</span>' +
        '<span class="' + (memberWarningsTotal ? 'warn' : 'ok') + '">' + (memberWarningsTotal ? memberWarningsTotal + ' move flags' : 'Moves checked') + '</span>' +
      '</div>';
  }
  if (dest) {
    dest.innerHTML = '<strong>Destination</strong><span>' + _escapeHtml(destination) + '</span><small>' +
      _escapeHtml(slot === '__new__' ? 'Creates a saved custom team you can edit and sim.' : 'Replaces this slot after validation; preloaded teams save as overrides.') +
      '</small>';
  }
  roster.innerHTML = members.map((m, idx) => {
    const warnings = validation.memberWarnings[String(idx)] || [];
    const warningHtml = warnings.length
      ? '<div class="preview-warnings">' + warnings.slice(0, 3).map(w => '<span class="preview-warning ' + _escapeHtml(w.severity) + '">' + _escapeHtml(w.text) + '</span>').join('') + '</div>'
      : '<div class="preview-ok">Showdown species and moves checked</div>';
    return `
    <div class="preview-row">
      <img class="preview-sprite" src="${getSpriteUrl(m.name)}" alt="${_escapeHtml(m.name || '')}" ${csSpriteFallbackAttrs(m.name)}/>
      <div class="preview-main">
        <span class="preview-name">${_escapeHtml(m.name || '')}</span>
        <span class="preview-item">${_escapeHtml(m.item||'No item')} · ${_escapeHtml(m.ability||'?')}</span>
        ${warningHtml}
      </div>
    </div>`;
  }).join('') + (validation.errors.length || validation.warnings.length
    ? '<div class="preview-team-warnings">' +
        validation.errors.slice(0, 3).map(e => '<div class="preview-team-error">' + _escapeHtml(e) + '</div>').join('') +
        validation.warnings.slice(0, 5).map(w => '<div class="preview-team-warning">' + _escapeHtml(w) + '</div>').join('') +
      '</div>'
    : '');
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
    const validation = buildImportedTeamValidation(members, { name: guessedName, format: 'champions' });
    if (!validation.valid) {
      statusEl.textContent = validation.errors.slice(0, 3).join(' ');
      statusEl.className = 'modal-status err';
      showImportPreview(members);
      return;
    }
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
      import_warnings: validation.warnings,
      import_errors: validation.errors,
      showdown_source_version: validation.sourceVersion,
      created_at: new Date().toISOString()
    };
    // T9f: persist to localStorage immediately
    if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
    // M5: persist to Supabase (fire-and-forget)
    if (typeof _upsertTeamToDB === 'function') _upsertTeamToDB(newKey, TEAMS[newKey], 'pokepaste');
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
    const validation = buildImportedTeamValidation(members, { name: TEAMS[slot].name, format: TEAMS[slot].format || 'champions' });
    if (!validation.valid) {
      statusEl.textContent = validation.errors.slice(0, 3).join(' ');
      statusEl.className = 'modal-status err';
      showImportPreview(members);
      return;
    }
    TEAMS[slot].members = members;
    TEAMS[slot].legality_status = 'unverified';
    TEAMS[slot].import_warnings = validation.warnings;
    TEAMS[slot].import_errors = validation.errors;
    TEAMS[slot].showdown_source_version = validation.sourceVersion;
    targetSlot = slot;
    teamName = TEAMS[slot].name;
    // T9h: persist edits appropriately by team source
    if (TEAMS[slot].source === 'custom') {
      if (typeof saveCustomTeamsToStorage === 'function') saveCustomTeamsToStorage();
    } else if (typeof savePreloadedOverride === 'function') {
      savePreloadedOverride(slot); // preloaded override survives reload
    }
    // M5: persist edits to Supabase (fire-and-forget)
    if (typeof _upsertTeamToDB === 'function') _upsertTeamToDB(slot, TEAMS[slot], 'set_editor');
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
  overlay.addEventListener('click', e => {
    if (e.target !== overlay) return;
    if (overlay.id === 'confirm-modal') _resolveConfirm(false);
    else _closeModalOverlay(overlay.id);
  });
});

// ============================================================
// CHART HELPERS
// ============================================================
function drawBarChart(canvasId, labels, values, color) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const dpr = getWindowValue('devicePixelRatio', 1) || 1;
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
function displayResults(res, oppKey, simCtx) {
  simCtx = simCtx || resolveSimContext({ bo: currentBo, oppKey: oppKey });
  oppKey = oppKey || simCtx.oppKey;
  const total = res.wins + res.losses + res.draws;
  const winPct = Math.round(res.winRate * 100);
  const team = simCtx.oppTeam || TEAMS[oppKey];
  const boLabel = simCtx.boLabel || `Bo${currentBo}`;
  const fmtLabel = simCtx.formatLabel || (currentFormat === 'doubles' ? 'Doubles' : 'Singles');

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

  renderAuditPanel(res, oppKey, simCtx);

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

  addReplays(res.allLogs||[], oppKey, simCtx.playerKey);

  // Auto-show inline pilot card after every single sim
  showInlinePilotCard(oppKey, res, simCtx);

  // PDF progressive reveal (Refs #57) - after ANY single sim, stash the
  // result so the PDF button can build a fresh packet. Each new sim either
  // adds a new matchup entry or replaces the prior one for the same
  // opponent, so the button always regenerates from the latest data.
  if (!ChampionsSim.state.lastResults) ChampionsSim.state.lastResults = {};
  ChampionsSim.state.lastResults[oppKey] = res;
  revealPdfButton();
}

function renderAuditPanel(res, oppKey, simCtx) {
  const panel = document.getElementById('audit-panel');
  if (!panel) return;
  simCtx = simCtx || resolveSimContext({ oppKey: oppKey, bo: currentBo });
  const playerKey = simCtx.playerKey;
  const playerTeam = simCtx.playerTeam || TEAMS[playerKey] || null;
  const sample = Array.isArray(res && res.allLogs) ? res.allLogs.find(function(row) {
    return row && Array.isArray(row.turnLog) && row.turnLog.length;
  }) || res.allLogs[0] : null;
  const sampleTurnLog = sample && Array.isArray(sample.turnLog) ? sample.turnLog : [];
  const sampleMoves = sample && sample.movesUsed ? sample.movesUsed : {};
  const metaRows = [
    ['Battle', (playerTeam?.name || playerKey || 'Current Team') + ' vs ' + (TEAMS[oppKey]?.name || oppKey)],
    ['Format', simCtx.formatLabel || (currentFormat === 'doubles' ? 'Doubles' : 'Singles')],
    ['Series', simCtx.boLabel || ('Bo' + currentBo)],
    ['Sample', sample ? ((sample.result || 'unknown') + ' · ' + (sample.turns || 0) + ' turns') : 'No sample battle'],
    ['Win condition', sample && sample.winCondition ? sample.winCondition : '—']
  ];
  const metaHtml = metaRows.map(function(row) {
    return '<div class="audit-meta-row"><span>' + _escapeHtml(row[0]) + '</span><strong>' + _escapeHtml(row[1]) + '</strong></div>';
  }).join('');
  const roster = (playerTeam && Array.isArray(playerTeam.members)) ? playerTeam.members : [];
  const rosterRows = roster.map(function(m) {
    var model = null;
    try { model = buildTeamStatDetailModel(playerKey, m.name); } catch (_e) { model = null; }
    if (!model) return '';
    return '<tr>' +
      '<td><strong>' + _escapeHtml(model.name) + '</strong><br><span class="audit-subtle">' + _escapeHtml((model.moves || []).join(', ')) + '</span></td>' +
      '<td>' + _escapeHtml(model.ability || '—') + '</td>' +
      '<td>' + _escapeHtml(model.item || '—') + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.hp)) + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.atk)) + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.def)) + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.spa)) + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.spd)) + '</td>' +
      '<td>' + _escapeHtml(String(model.finalStats.spe)) + '</td>' +
    '</tr>';
  }).join('');
  const moveUsage = Object.keys(sampleMoves).length ? Object.entries(sampleMoves).map(function(sidePair) {
    var side = sidePair[0];
    var mons = sidePair[1] || {};
    var rows = Object.entries(mons).map(function(entry) {
      return '<tr><td>' + _escapeHtml(entry[0]) + '</td><td>' + _escapeHtml(JSON.stringify(entry[1] || {})) + '</td></tr>';
    }).join('');
    return '<details class="audit-move-block"><summary>' + _escapeHtml(side) + ' move usage</summary><table class="audit-table"><tbody>' + rows + '</tbody></table></details>';
  }).join('') : '<div class="audit-empty">No move usage captured.</div>';
  panel.innerHTML =
    '<details class="audit-panel" open>' +
      '<summary>Battle Audit</summary>' +
      '<div class="audit-grid">' +
        '<section class="audit-card">' +
          '<h3>Battle Snapshot</h3>' +
          metaHtml +
          '<div class="audit-turn-log">' + csRenderTurnLogRows(sampleTurnLog) + '</div>' +
        '</section>' +
        '<section class="audit-card">' +
          '<h3>Team Stats</h3>' +
          '<table class="audit-table">' +
            '<thead><tr><th>Mon</th><th>Ability</th><th>Item</th><th>HP</th><th>Atk</th><th>Def</th><th>SpA</th><th>SpD</th><th>Spe</th></tr></thead>' +
            '<tbody>' + rosterRows + '</tbody>' +
          '</table>' +
        '</section>' +
      '</div>' +
      '<section class="audit-card">' +
        '<h3>Move Usage</h3>' +
        moveUsage +
      '</section>' +
    '</details>';
}

// PDF progressive reveal (Refs #57) - show the Download PDF Report button
// as soon as there is at least one matchup in lastSimResults, and relabel
// it so users know how many matchups the next PDF click will include.
function revealPdfButton() {
  var btn = document.getElementById('pdf-report-btn');
  if (!btn) return;
  var count = Object.keys(ChampionsSim.state.lastResults || {}).length;
  if (count < 1) return;
  btn.style.display = '';
  var label = btn.querySelector('.pdf-btn-label');
  if (!label) {
    // First reveal - wrap the text node so we can update the count later
    // without clobbering the icon SVG.
    var textNode = Array.from(btn.childNodes).find(function(n){
      return n.nodeType === 3 && n.textContent.trim().length > 0;
    });
    if (textNode) {
      label = document.createElement('span');
      label.className = 'pdf-btn-label';
      label.textContent = textNode.textContent.trim();
      btn.replaceChild(label, textNode);
    }
  }
  if (label) {
    label.textContent = count === 1
      ? 'Download PDF Report (1 matchup)'
      : 'Download PDF Report (' + count + ' matchups)';
  }
  btn.title = 'Generates a fresh PDF packet from the latest simulation data (' + count + ' matchup' + (count === 1 ? '' : 's') + ' included). Run another sim to refresh.';
}

// ============================================================
// INLINE PILOT CARD — shown after every single sim run
// ============================================================
function showInlinePilotCard(oppKey, res, simCtx) {
  simCtx = simCtx || resolveSimContext({ playerKey: res && res.playerKey, oppKey: oppKey || (res && res.oppKey), bo: res && res.bo });
  var playerKey = simCtx.playerKey;
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

  // T9j.16 (Refs #65) - inject top critical/high coaching rule for this matchup.
  // Lightweight: builds a single-matchup report and pulls the top-severity rule.
  try {
    if (typeof buildStrategyReport === 'function' && playerKey) {
      const singleResults = {}; singleResults[oppKey] = res;
      const fmt = simCtx.format || ((typeof currentFormat !== 'undefined') ? currentFormat : 'doubles');
      const rep = buildStrategyReport(playerKey, singleResults, fmt);
      if (rep && rep.coaching_rules && rep.coaching_rules.length) {
        const top = rep.coaching_rules[0];
        tips.push(`<strong>Coach (${top.severity}):</strong> ${top.correction}`);
      }
    }
  } catch(e) { /* silent - inline card stays minimal on error */ }

  const postCoach = (typeof coachPost === 'function') ? coachPost(res) : '';
  container.innerHTML = `
    <div class="pilot-card" style="border:1px solid var(--border,#333);border-radius:8px;padding:14px;background:var(--surface,#1c1b19)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:13px">📋 Pilot Notes vs ${_escapeHtml(teamName)}</span>
        <span class="pilot-verdict ${verdictClass}" style="font-size:11px;padding:3px 8px;border-radius:4px">${_escapeHtml(verdict)} · ${_escapeHtml(String(winPct))}%</span>
      </div>
      ${postCoach ? `<pre class="cs-pilot-card-v2">${_escapeHtml(postCoach)}</pre>` : (tips.length ? `<div style="font-size:11px;color:var(--text-m,#888);line-height:1.7">${tips.map(t=>`• ${_escapeHtml(t)}`).join('<br>')}</div>` : '')}
    </div>`;
}

// ============================================================
// REPLAY LOG
// ============================================================
let allReplays = [];
let replayFilter = 'all';
const MAX_REPLAY_LOG_LINES = 200;
const MAX_REPLAY_CARDS = 240;

function csCapBattleReplay(battle, maxLines) {
  var cap = typeof maxLines === 'number' && maxLines >= 0 ? maxLines : MAX_REPLAY_LOG_LINES;
  var out = Object.assign({}, battle || {});
  var log = Array.isArray(out.log) ? out.log.slice() : [];
  out.logLineCount = log.length;
  if (log.length > cap) {
    out.log = log.slice(log.length - cap);
    out.logTruncated = true;
    out.logShownCount = out.log.length;
  } else {
    out.log = log;
    out.logTruncated = false;
    out.logShownCount = log.length;
  }
  return out;
}
ChampionsSim.simLog.csCapBattleReplay = csCapBattleReplay;
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csCapBattleReplay', csCapBattleReplay);

function addReplays(logs, oppKey, playerKey) {
  playerKey = playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : null);
  for (const b of logs) allReplays.unshift({...csCapBattleReplay(b), playerKey: b.playerKey || playerKey, oppKey, id:Math.random()});
  if (allReplays.length > MAX_REPLAY_CARDS) allReplays.length = MAX_REPLAY_CARDS;
  renderReplays();
}
ChampionsSim.simLog.addReplays = addReplays;
ChampionsSim.simLog.renderReplays = renderReplays;
ChampionsSim.simLog._setReplayState = function(replays, filter) {
  allReplays = Array.isArray(replays) ? replays.slice() : [];
  if (typeof filter === 'string') replayFilter = filter;
};
ChampionsSim.simLog._getReplayState = function() {
  return { allReplays: allReplays.slice(), replayFilter: replayFilter };
};

function csReplaySparkline(turnLog) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var scores = rows.map(function(t) {
    return t && t.post && typeof t.post.position_score === 'number' ? t.post.position_score : null;
  }).filter(function(v) { return v != null; });
  if (!scores.length) scores = [0.5];
  var points = scores.map(function(v, i) {
    var x = scores.length === 1 ? 50 : Math.round((i / (scores.length - 1)) * 100);
    var y = Math.round((1 - Math.max(0, Math.min(1, v))) * 30 + 2);
    return x + ',' + y;
  }).join(' ');
  return '<svg class="replay-sparkline" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">' +
    '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
    '</svg>';
}

function csReplayPositionScore(row) {
  if (!row) return null;
  if (typeof row.positionScore === 'number') return row.positionScore;
  if (row.post && typeof row.post.position_score === 'number') return row.post.position_score;
  return null;
}

function csIsClutchReplay(replay) {
  replay = replay || {};
  var turns = Number(replay.turns || 0);
  var turnLog = Array.isArray(replay.turnLog) ? replay.turnLog : [];
  var turning = replay.turning_point || null;
  var finalTurn = turnLog.length ? turnLog[turnLog.length - 1] : null;
  var finalScore = csReplayPositionScore(finalTurn);
  var minScore = turnLog.reduce(function(min, row) {
    var score = csReplayPositionScore(row);
    return score == null ? min : Math.min(min, score);
  }, 1);
  var maxDelta = turnLog.reduce(function(max, row) {
    var d = row && row.delta && typeof row.delta.position_score === 'number' ? Math.abs(row.delta.position_score) : 0;
    return Math.max(max, d);
  }, 0);
  var comebackWin = replay.result === 'win' && minScore <= 0.42 && finalScore != null && finalScore >= 0.58;
  var lateSwing = turning && turning.turn != null && turns >= 5 && turning.turn >= Math.max(3, turns - 2);
  var majorSwing = maxDelta >= 0.18;
  var closeEndgame = finalScore != null && finalScore >= 0.35 && finalScore <= 0.65 && turns >= 5 && (majorSwing || lateSwing);
  var fieldReversalWin = replay.result === 'win' && ((replay.trTurns || 0) > 0 || (replay.twTurns || 0) > 0) && (lateSwing || comebackWin || majorSwing);
  return !!(comebackWin || closeEndgame || (lateSwing && majorSwing) || fieldReversalWin);
}

function csRenderHpBars(turn) {
  var hp = (turn && turn.post && turn.post.hp_pct) || {};
  var names = Object.keys(hp).slice(0, 8);
  if (!names.length) return '';
  return '<div class="replay-hp-bars">' + names.map(function(name) {
    var pct = Math.max(0, Math.min(1, Number(hp[name]) || 0));
    var label = _csSnapshotDisplayName(name);
    return '<span class="replay-hp-chip" title="' + _escapeHtml(label) + ' ' + Math.round(pct * 100) + '%">' +
      '<span class="replay-hp-fill" style="width:' + Math.round(pct * 100) + '%"></span>' +
      '<span class="replay-hp-label">' + _escapeHtml(label) + '</span>' +
    '</span>';
  }).join('') + '</div>';
}

function _csSnapshotDisplayName(key) {
  var raw = String(key || '');
  var parts = raw.split(':');
  return parts.length >= 4 ? parts.slice(3).join(':') : raw;
}

function _csSnapshotSideRows(snapshot, side) {
  snapshot = snapshot || {};
  side = side || 'player';
  if (snapshot.roster && Array.isArray(snapshot.roster[side])) {
    return snapshot.roster[side].map(function(row) {
      row = row || {};
      var hp = row.hp == null ? null : Number(row.hp);
      return Object.assign({}, row, {
        hp: hp == null ? null : Math.max(0, Math.min(100, hp)),
        hpLabel: row.hpLabel || (hp == null ? 'unknown' : Math.round(hp) + '%')
      });
    });
  }

  var activeNames = (snapshot.active && snapshot.active[side]) || [];
  var benchNames = (snapshot.bench && snapshot.bench[side]) || [];
  var activeKeys = (snapshot.active_keys && snapshot.active_keys[side]) || [];
  var benchKeys = (snapshot.bench_keys && snapshot.bench_keys[side]) || [];
  var hp = snapshot.hp_pct || {};
  function rowFrom(name, key, status) {
    var pct = hp[key];
    if (pct == null) pct = hp[name];
    var pct100 = pct == null ? null : Math.round(Math.max(0, Math.min(1, Number(pct) || 0)) * 100);
    return {
      stable_key: key || name,
      status: status,
      displayName: _csSnapshotDisplayName(key || name),
      species: _csSnapshotDisplayName(key || name),
      hp: pct100,
      hpLabel: pct100 == null ? 'unknown' : pct100 + '%'
    };
  }
  return activeNames.map(function(name, i) {
    return rowFrom(name, activeKeys[i] || name, 'active');
  }).concat(benchNames.map(function(name, i) {
    return rowFrom(name, benchKeys[i] || name, 'bench');
  }));
}

function csReplayTagClass(kind) {
  kind = String(kind || '').toLowerCase();
  if (kind.indexOf('skip') >= 0 || kind.indexOf('self-hit') >= 0 || kind.indexOf('faint') >= 0) return 'high';
  if (kind.indexOf('immunity') >= 0 || kind.indexOf('immune') >= 0) return 'low';
  if (kind.indexOf('flinch') >= 0 || kind.indexOf('sleep') >= 0 || kind.indexOf('frozen') >= 0 || kind.indexOf('paralysis') >= 0 || kind.indexOf('confusion') >= 0) return 'medium';
  return 'low';
}

function csReplayEffectTagLabel(kind, effect) {
  kind = String(kind || '').toLowerCase();
  if (kind === 'flinch-applied') return 'Flinch tech used';
  if (kind === 'flinch-skip') return 'Flinch skipped move';
  if (kind === 'sleep-skip') return 'Sleep skipped move';
  if (kind === 'frozen-skip') return 'Frozen skipped move';
  if (kind === 'paralysis-skip') return 'Full paralysis';
  if (kind === 'confusion-self-hit') return 'Confusion self-hit';
  if (kind === 'ability-immunity') return 'Immune: ' + String((effect && effect.ability) || 'Ability');
  if (kind === 'ability-immunity-heal') return 'Absorbed: ' + String((effect && effect.ability) || 'Ability');
  if (kind === 'type-immunity') return 'Immune: ' + String((effect && effect.blocked_move_type) || 'Type');
  if (kind === 'recoil') return 'Recoil damage';
  if (kind === 'item-recovery') return 'Item recovery';
  if (kind === 'drain-heal') return 'Drain heal';
  if (kind === 'hp-cost') return 'HP cost';
  if (kind === 'contact-damage' || kind.indexOf('contact-damage') >= 0) return 'Contact damage';
  return String((effect && effect.volatile_status) || (effect && effect.effect_kind) || 'Effect');
}

function csReplayBuildEffectTagMap(turn) {
  var out = {};
  (Array.isArray(turn && turn.effect_events) ? turn.effect_events : []).forEach(function(effect) {
    if (!effect || !effect.actor_key) return;
    var kind = String(effect.effect_kind || 'effect');
    var tag = {
      label: csReplayEffectTagLabel(kind, effect),
      kind: kind,
      cls: csReplayTagClass(kind),
      title: [
        effect.actor || 'Pokemon',
        effect.move ? 'via ' + effect.move : '',
        effect.skipped_action_move ? 'skipped ' + effect.skipped_action_move : '',
        effect.hp_delta ? 'HP ' + effect.hp_before + ' -> ' + effect.hp_after : '',
        effect.note || ''
      ].filter(Boolean).join(' · ')
    };
    if (!out[effect.actor_key]) out[effect.actor_key] = [];
    out[effect.actor_key].push(tag);
  });
  return out;
}

function csReplayBuildSnapshotTags(row) {
  row = row || {};
  var tags = Array.isArray(row.replayTags) ? row.replayTags.slice() : [];
  var majorStatus = row.major_status || row.majorStatus || row.condition || row.status_condition || row.statusEffect || null;
  if (majorStatus) {
    tags.push({
      label: String(majorStatus),
      kind: 'major-status',
      cls: 'medium',
      title: 'Major status on this Pokemon: ' + String(majorStatus)
    });
  }
  var volatile = row.volatile_status || row.volatileStatus || row.volatile || null;
  if (volatile) {
    tags.push({
      label: String(volatile),
      kind: 'volatile-status',
      cls: 'medium',
      title: 'Volatile state on this Pokemon: ' + String(volatile)
    });
  }
  var boosts = row.stat_boosts || row.boosts || null;
  if (boosts && typeof boosts === 'object') {
    Object.keys(boosts).forEach(function(stat) {
      var value = Number(boosts[stat] || 0);
      if (!value) return;
      tags.push({
        label: stat.toUpperCase() + ' ' + (value > 0 ? '+' : '') + value,
        kind: 'stat-boost',
        cls: value > 0 ? 'low' : 'medium',
        title: 'Stat stage on this turn: ' + stat + ' ' + (value > 0 ? '+' : '') + value
      });
    });
  }
  var seen = {};
  return tags.filter(function(tag) {
    var key = String((tag && tag.label) || '') + '|' + String((tag && tag.kind) || '');
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  }).slice(0, 8);
}

function csRenderReplayEffectTags(row) {
  var tags = csReplayBuildSnapshotTags(row);
  if (!tags.length) return '';
  return '<div class="replay-effect-tags">' + tags.map(function(tag) {
    return '<span class="replay-effect-tag ' + _escapeHtml(tag.cls || csReplayTagClass(tag.kind)) + '" title="' + _escapeHtml(tag.title || tag.label || '') + '">' +
      _escapeHtml(tag.label || 'Effect') +
    '</span>';
  }).join('') + '</div>';
}

function csReplayFieldTags(snapshot) {
  var tags = [];
  var field = snapshot && snapshot.field ? snapshot.field : {};
  var speed = snapshot && snapshot.speed_control ? snapshot.speed_control : {};
  function add(label, cls, title) {
    tags.push({
      label: label,
      cls: cls || 'low',
      title: title || label
    });
  }
  if (field.weather) {
    add(String(field.weather) + (field.weather_turns ? ' ' + field.weather_turns + 'T' : ''), 'low', 'Weather on this board');
  }
  if (field.terrain) {
    add(String(field.terrain) + (field.terrain_turns ? ' ' + field.terrain_turns + 'T' : ''), 'low', 'Terrain on this board');
  }
  if (Number(field.trick_room || field.trickRoom || 0) > 0) {
    add('Trick Room ' + Number(field.trick_room || field.trickRoom || 0) + 'T', 'medium', 'Trick Room is active on this board');
  }
  ['player', 'opponent'].forEach(function(side) {
    var row = speed && speed[side] ? speed[side] : {};
    var tailwindTurns = Number(row.tailwind || 0);
    if (tailwindTurns > 0) {
      add((side === 'player' ? 'Your Tailwind ' : 'Their Tailwind ') + tailwindTurns + 'T', 'low', 'Tailwind is active for ' + side);
    }
    var screens = row.screens || {};
    if (Number(screens.reflect || 0) > 0) add((side === 'player' ? 'Your Reflect ' : 'Their Reflect ') + Number(screens.reflect || 0) + 'T', 'low', 'Reflect is active for ' + side);
    if (Number(screens.light || 0) > 0) add((side === 'player' ? 'Your Light Screen ' : 'Their Light Screen ') + Number(screens.light || 0) + 'T', 'low', 'Light Screen is active for ' + side);
    if (Number(screens.aurora || 0) > 0) add((side === 'player' ? 'Your Aurora Veil ' : 'Their Aurora Veil ') + Number(screens.aurora || 0) + 'T', 'low', 'Aurora Veil is active for ' + side);
  });
  if (!tags.length) return '';
  return '<div class="replay-effect-tags replay-field-tags">' + tags.map(function(tag) {
    return '<span class="replay-effect-tag ' + _escapeHtml(tag.cls || 'low') + '" title="' + _escapeHtml(tag.title || tag.label || '') + '">' +
      _escapeHtml(tag.label || 'Field') +
    '</span>';
  }).join('') + '</div>';
}

function csReplayBuildImpactMap(turn) {
  var out = {};
  var rows = csHpEvidenceRows(turn);
  rows.forEach(function(row) {
    if (!row || !row.key) return;
    if (!out[row.key]) out[row.key] = [];
    if (row.kind === 'damage') {
      out[row.key].push((row.name || 'Pokemon') + ' lost ' + row.amount + ' HP to ' + (row.move || 'an attack'));
    } else if (row.effect_kind === 'recoil') {
      out[row.key].push((row.name || 'Pokemon') + ' lost ' + row.amount + ' HP to recoil');
    } else {
      out[row.key].push((row.name || 'Pokemon') + ' lost ' + row.amount + ' HP to ' + (row.effect_kind || row.move || 'an effect'));
    }
  });
  (Array.isArray(turn && turn.effect_events) ? turn.effect_events : []).forEach(function(effect) {
    if (!effect || !effect.actor_key || !effect.skipped_move) return;
    if (!out[effect.actor_key]) out[effect.actor_key] = [];
    var reason = csReplayEffectTagLabel(effect.effect_kind, effect);
    out[effect.actor_key].push((effect.actor || 'Pokemon') + ' lost its move: ' + reason.toLowerCase());
  });
  Object.keys(out).forEach(function(key) {
    out[key] = out[key].filter(Boolean).slice(0, 2);
  });
  return out;
}

function csRenderReplayStadiumMon(row) {
  row = row || {};
  var status = String(row.status || 'bench').toLowerCase();
  var hp = row.hp == null ? null : Math.max(0, Math.min(100, Number(row.hp) || 0));
  var hpClass = csReplayCoachHpClass(row);
  var moves = (row.moves || []).slice(0, 4).join(' / ');
  var meta = [];
  if (row.item) meta.push(row.item);
  if (row.ability) meta.push(row.ability);
  var species = row.species || row.displayName || 'unknown';
  var spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(species) : '';
  return '<div class="replay-stadium-mon ' + _escapeHtml(status) + '">' +
    '<div class="replay-stadium-mon-shell">' +
      (spriteUrl
        ? '<img class="replay-stadium-sprite" src="' + _escapeHtml(spriteUrl) + '" alt="' + _escapeHtml((row.displayName || species) + ' sprite') + '" loading="lazy" ' + csSpriteFallbackAttrs(species) + '/>'
        : '<div class="replay-stadium-sprite replay-mon-sprite-fallback" aria-hidden="true"></div>') +
      '<div class="replay-stadium-mon-body">' +
        '<div class="replay-roster-mon-head">' +
          '<strong>' + _escapeHtml(row.displayName || row.species || 'unknown') + '</strong>' +
          '<span class="replay-roster-status ' + _escapeHtml(hpClass) + '">' + _escapeHtml(status || 'bench') + '</span>' +
        '</div>' +
        csRenderReplayEffectTags(row) +
        '<div class="replay-hp-track ' + _escapeHtml(hpClass) + '"><span style="width:' + _escapeHtml(String(hp == null ? 0 : hp)) + '%"></span></div>' +
        '<div class="replay-roster-meta"><b>HP:</b> ' + _escapeHtml(row.hpLabel || (hp == null ? 'unknown' : hp + '%')) + (row.faintTurn ? ' · <b>Fainted:</b> Turn ' + _escapeHtml(String(row.faintTurn)) : '') + '</div>' +
        (Array.isArray(row.replayImpact) && row.replayImpact.length
          ? '<div class="replay-roster-meta"><b>Impact:</b> ' + _escapeHtml(row.replayImpact.join(' · ')) + '</div>'
          : '') +
        (meta.length ? '<div class="replay-roster-meta">' + _escapeHtml(meta.join(' · ')) + '</div>' : '') +
        '<div class="replay-roster-meta"><b>Moves:</b> ' + _escapeHtml(moves || 'unknown') + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function csRenderReplayStadiumSide(rows, label) {
  rows = Array.isArray(rows) ? rows : [];
  var active = rows.filter(function(row) { return String((row && row.status) || '').toLowerCase() === 'active'; });
  var offField = rows.filter(function(row) { return String((row && row.status) || '').toLowerCase() !== 'active'; });
  return { active: active, offField: offField, label: label };
}

function csRenderReplayStadiumActive(side, position) {
  side = side || { active: [], label: 'Team' };
  return '<div class="replay-stadium-side replay-stadium-' + _escapeHtml(position || 'side') + '">' +
    '<strong class="replay-stadium-side-title">' + _escapeHtml(side.label || 'Team') + ' · On field</strong>' +
    '<div class="replay-stadium-active-slots">' +
      (side.active.length ? side.active.map(csRenderReplayStadiumMon).join('') : '<div class="replay-coach-list-row"><strong>No active Pokemon</strong>None currently on field.</div>') +
    '</div>' +
  '</div>';
}

function csRenderReplayStadiumReserve(side) {
  side = side || { offField: [], label: 'Team' };
  return '<div class="replay-stadium-zone off-field">' +
    '<span>' + _escapeHtml(side.label || 'Team') + ' · Bench / knocked out</span>' +
    (side.offField.length ? side.offField.map(csRenderReplayStadiumMon).join('') : '<div class="replay-coach-list-row"><strong>No bench shown</strong>No off-field Pokemon in this snapshot.</div>') +
  '</div>';
}

function csRenderReplayStadium(rowsBySide, title, labels) {
  rowsBySide = rowsBySide || {};
  labels = labels || {};
  var yourSide = csRenderReplayStadiumSide(rowsBySide.left || [], labels.left || 'Your team');
  var theirSide = csRenderReplayStadiumSide(rowsBySide.right || [], labels.right || 'Their team');
  var fieldTags = rowsBySide.fieldTags || '';
  return '<div class="replay-stadium">' +
    (title ? '<div class="replay-stadium-title">' + _escapeHtml(title) + '</div>' : '') +
    fieldTags +
    '<div class="replay-stadium-field">' +
      csRenderReplayStadiumActive(theirSide, 'opponent') +
      '<div class="replay-stadium-vs">VS</div>' +
      csRenderReplayStadiumActive(yourSide, 'player') +
    '</div>' +
    '<div class="replay-stadium-reserves">' +
      csRenderReplayStadiumReserve(yourSide) +
      csRenderReplayStadiumReserve(theirSide) +
    '</div>' +
  '</div>';
}

function csRenderReplayLogSnapshot(snapshot, title, compact, turn) {
  if (!snapshot) return '';
  var effectTags = csReplayBuildEffectTagMap(turn);
  var impactMap = csReplayBuildImpactMap(turn);
  function withEffectTags(rows) {
    return rows.map(function(row) {
      var key = row && (row.stable_key || row.stableKey || row.key);
      var tags = key && effectTags[key] ? effectTags[key] : [];
      var impact = key && impactMap[key] ? impactMap[key] : [];
      if (!tags.length && !impact.length) return row;
      return Object.assign({}, row, {
        replayTags: (row.replayTags || []).concat(tags),
        replayImpact: impact
      });
    });
  }
  return csRenderReplayStadium({
    left: withEffectTags(_csSnapshotSideRows(snapshot, 'player')),
    right: withEffectTags(_csSnapshotSideRows(snapshot, 'opponent')),
    fieldTags: csReplayFieldTags(snapshot)
  }, title || '', {
    left: 'Your team',
    right: 'Their team'
  });
}

function csRenderReplayLogTurnZero(turnLog) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var first = rows[0] || {};
  if (!first.pre) return '';
  return '<div class="replay-turn-zero">' +
    '<div class="replay-turn-main"><strong>Turn 0 — Starting State</strong><span>Before any moves: leads, bench, HP, stats, items, abilities, and known moves.</span></div>' +
    csRenderReplayLogSnapshot(first.pre, 'Turn 0', false) +
  '</div>';
}

function csRenderReplayPlayByPlay(turn) {
  turn = turn || {};
  var rows = [];
  function hpText(row) {
    var after = row && row.target_hp_after != null ? row.target_hp_after : row && row.hp_after;
    var max = row && row.target_max_hp != null ? row.target_max_hp : row && row.max_hp;
    return after != null && max != null ? ' (' + after + '/' + max + ' HP)' : '';
  }
  function damageNote(row) {
    var bits = [];
    if (row.critical || row.crit || row.is_critical) bits.push('critical');
    var eff = Number(row.type_effectiveness);
    if (Number.isFinite(eff)) {
      if (eff > 1) bits.push('super effective');
      else if (eff > 0 && eff < 1) bits.push('resisted');
      else if (eff === 0) bits.push('immune');
    }
    if (row.spread_mod && Number(row.spread_mod) !== 4096 && Number(row.spread_mod) !== 1) bits.push('spread');
    if (row.damage_capped_by_hp) bits.push('HP capped');
    return bits.length ? ' [' + bits.join(', ') + ']' : '';
  }
  function failureReasonText(reason) {
    return String(reason || 'failed').replace(/-/g, ' ');
  }
  function structuredDamageRows() {
    var damage = Array.isArray(turn.damage_events) ? turn.damage_events : [];
    if (!damage.length) return [];
    var grouped = [];
    var byKey = {};
    damage.forEach(function(row) {
      if (!row) return;
      var key = [row.attacker_key || row.attacker || 'Pokemon', row.move || 'Move'].join('|');
      if (!byKey[key]) {
        byKey[key] = {
          attacker: row.attacker || 'Pokemon',
          move: row.move || 'Move',
          targets: []
        };
        grouped.push(byKey[key]);
      }
      byKey[key].targets.push(row);
    });
    return grouped.map(function(group) {
      var targetText = group.targets.map(function(row) {
        return (row.target || 'target') + ' lost ' + (row.applied_damage != null ? row.applied_damage : row.damage || 0) + ' HP' +
          hpText(row) + damageNote(row);
      }).join('; ');
      return group.attacker + ' used ' + group.move + '! ' + targetText;
    });
  }
  function structuredEffectRows() {
    var effects = Array.isArray(turn.effect_events) ? turn.effect_events : [];
    var out = [];
    effects.forEach(function(effect) {
      if (!effect) return;
      var kind = String(effect.effect_kind || '');
      if (kind === 'move-failure') {
        var miss = effect.failure_reason === 'accuracy-miss';
        var target = effect.target ? ' → ' + effect.target : '';
        var acc = effect.accuracy != null ? ' Accuracy ' + Math.round(Number(effect.accuracy) * 100) + '%.' : '';
        out.push((effect.actor || 'Pokemon') + ' used ' + (effect.failed_move || effect.move || 'a move') + '!' + target + ' ' +
          (miss ? 'It missed.' : 'It failed: ' + failureReasonText(effect.failure_reason) + '.') + acc);
      } else if (kind === 'type-immunity' || kind === 'ability-immunity' || kind === 'ability-immunity-heal') {
        out.push(effect.note || ((effect.actor || 'Pokemon') + ' was immune to ' + (effect.blocked_move || effect.move || 'the move') + '.'));
      } else if (effect.action_denial && effect.skipped_move) {
        out.push((effect.actor || 'Pokemon') + ' could not use ' + (effect.skipped_action_move || 'its move') + ': ' + csReplayEffectTagLabel(kind, effect) + '.');
      } else if (kind === 'flinch-applied') {
        out.push((effect.actor || 'Pokemon') + ' flinched from ' + (effect.move || 'the move') + '.');
      } else if ((effect.hp_delta || 0) !== 0 && (kind === 'recoil' || kind === 'weather-damage' || kind === 'status-damage' || kind === 'ability-recoil' || kind === 'protect-contact-damage' || kind === 'ability-contact-damage')) {
        var lost = Math.abs(Number(effect.hp_delta || 0));
        out.push((effect.actor || 'Pokemon') + ' lost ' + lost + ' HP from ' + (effect.move || failureReasonText(kind)) + hpText(effect) + '.');
      }
    });
    return out;
  }
  function showdownMoveText(action) {
    if (!action || !action.actor || !action.move) return '';
    var text = action.actor + ' used ' + action.move + '!';
    if (action.target) text += ' → ' + action.target;
    return text;
  }
  function showdownEventText(ev) {
    var text = String((ev && (ev.text || ev.message)) || '').trim();
    if (!text) return '';
    text = text.replace(/\[(\d+)\s*dmg(?:,[^\]]*)?\]/ig, 'lost $1 HP');
    text = text.replace(/\[\+(\d+)\]/g, 'restored $1 HP');
    text = text.replace(/\s+/g, ' ');
    return text;
  }
  var structuredRows = structuredDamageRows().concat(structuredEffectRows());
  var eventRows = [];
  (turn.events || []).forEach(function(ev) {
    if (!ev) return;
    var text = showdownEventText(ev);
    if (!text) return;
    eventRows.push(text);
  });
  var eventRowsHaveMoves = eventRows.some(function(text) {
    return /\bused\b/.test(String(text || ''));
  });
  if (structuredRows.length) {
    rows = structuredRows;
  } else if (eventRows.length && eventRowsHaveMoves) {
    rows = eventRows;
  } else {
    (turn.actions.player || []).forEach(function(action) {
      if (!action) return;
      var line = showdownMoveText(action);
      if (line) rows.push(line);
    });
    (turn.actions.opponent || []).forEach(function(action) {
      if (!action) return;
      var line = showdownMoveText(action);
      if (line) rows.push(line);
    });
    rows = rows.concat(eventRows);
  }
  var seen = {};
  rows = rows.filter(function(text) {
    var key = String(text || '').trim();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
  if (!rows.length) return '';
  return '<div class="replay-play-by-play"><strong>Battle log</strong>' +
    rows.slice(0, 20).map(function(text, idx) {
      return '<div class="replay-play-row">' +
        '<span>' + _escapeHtml(String(idx + 1).padStart(2, '0')) + '</span>' +
        '<b>' + _escapeHtml(text || '') + '</b>' +
      '</div>';
    }).join('') +
  '</div>';
}

function _csResolveSnapshotKey(pre, side, name) {
  if (!pre || !name) return name;
  var groups = [];
  if (pre.active_keys && Array.isArray(pre.active_keys[side])) groups = groups.concat(pre.active_keys[side]);
  if (pre.bench_keys && Array.isArray(pre.bench_keys[side])) groups = groups.concat(pre.bench_keys[side]);
  for (var i = 0; i < groups.length; i++) {
    if (_csSnapshotDisplayName(groups[i]) === name) return groups[i];
  }
  return name;
}

function _csDecisionMemberMap(members) {
  var out = {};
  for (var i = 0; i < (members || []).length; i++) {
    var mem = members[i];
    if (mem && mem.name) out[mem.name] = mem;
  }
  return out;
}

function _csDecisionMoveScore(move, actor, target, turn, opts) {
  var score = 0;
  var moveType = (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[move]) ? MOVE_TYPES[move] : 'Normal';
  var category = (typeof MOVE_CATEGORY !== 'undefined' && MOVE_CATEGORY[move]) ? MOVE_CATEGORY[move] : 'status';
  var bp = (typeof MOVE_BP !== 'undefined' && MOVE_BP[move]) ? MOVE_BP[move] : 0;
  var field = (turn && turn.pre && turn.pre.field) || {};
  var speedOrder = (turn && turn.pre && Array.isArray(turn.pre.speed_order_keys) && turn.pre.speed_order_keys.length)
    ? turn.pre.speed_order_keys
    : ((turn && turn.pre && Array.isArray(turn.pre.speed_order)) ? turn.pre.speed_order : []);
  var hpPct = 1;
  var targetHpPct = 1;
  var actorSnapshotKey = _csResolveSnapshotKey(turn && turn.pre, 'player', actor && actor.name);
  var targetSnapshotKey = _csResolveSnapshotKey(turn && turn.pre, 'opponent', target && target.name);
  if (turn && turn.pre && turn.pre.hp_pct && actorSnapshotKey && typeof turn.pre.hp_pct[actorSnapshotKey] === 'number') {
    hpPct = turn.pre.hp_pct[actorSnapshotKey];
  } else if (actor && actor.hp != null && actor.maxHp) {
    hpPct = Math.max(0, Math.min(1, actor.hp / actor.maxHp));
  }
  if (turn && turn.pre && turn.pre.hp_pct && targetSnapshotKey && typeof turn.pre.hp_pct[targetSnapshotKey] === 'number') {
    targetHpPct = turn.pre.hp_pct[targetSnapshotKey];
  } else if (target && target.hp != null && target.maxHp) {
    targetHpPct = Math.max(0, Math.min(1, target.hp / target.maxHp));
  }

  var actorTypes = (actor && Array.isArray(actor.types)) ? actor.types : [];
  var targetTypes = (target && Array.isArray(target.types)) ? target.types : [];
  var liveEnemies = ((turn && turn.pre && turn.pre.active && turn.pre.active.opponent) || []).slice();
  var liveAllies = ((turn && turn.pre && turn.pre.active && turn.pre.active.player) || []).slice();
  var oppLookup = (opts && opts.oppLookup) || {};
  var hasPriorityThreat = false;
  var enemyHasStatusMoves = false;
  var enemyHasSetupMoves = false;
  var sharedMoveThreat = false;

  for (var i = 0; i < liveEnemies.length; i++) {
    var oppName = liveEnemies[i];
    var oppSpec = oppLookup[oppName] || null;
    if (!oppSpec || !Array.isArray(oppSpec.moves)) continue;
    for (var j = 0; j < oppSpec.moves.length; j++) {
      var oppMove = oppSpec.moves[j];
      if (typeof getPriority === 'function' && getPriority(oppMove) > 0) hasPriorityThreat = true;
      if (typeof MOVE_CATEGORY !== 'undefined' && MOVE_CATEGORY[oppMove] === 'status') enemyHasStatusMoves = true;
      if (typeof CLASSIFY_SETUP_MOVES !== 'undefined' && Array.isArray(CLASSIFY_SETUP_MOVES) && CLASSIFY_SETUP_MOVES.indexOf(oppMove) >= 0) enemyHasSetupMoves = true;
    }
  }
  if (move === 'Imprison') {
    var ownMoves = (actor && Array.isArray(actor.moves)) ? actor.moves : [];
    for (var k = 0; k < liveEnemies.length; k++) {
      var enemySpec = oppLookup[liveEnemies[k]] || null;
      if (!enemySpec || !Array.isArray(enemySpec.moves)) continue;
      for (var m = 0; m < enemySpec.moves.length; m++) {
        if (ownMoves.indexOf(enemySpec.moves[m]) >= 0) {
          sharedMoveThreat = true;
          break;
        }
      }
      if (sharedMoveThreat) break;
    }
  }

  if (category === 'status') {
    if (move === 'Recover' || move === 'Shore Up') {
      score = hpPct < 0.65 ? 72 : 14;
    } else if (move === 'Rest') {
      score = hpPct < 0.50 ? 68 : 10;
    } else if (move === 'Roost') {
      score = hpPct < 0.55 ? 58 : 12;
    } else if (move === 'Protect' || move === 'Detect') {
      score = (hpPct < 0.35 || hasPriorityThreat) ? 55 : 18;
    } else if (move === 'Quick Guard') {
      score = hasPriorityThreat ? 52 : 10;
    } else if (move === 'Taunt') {
      score = enemyHasStatusMoves ? 48 : 8;
    } else if (move === 'Encore') {
      score = 32;
    } else if (move === 'Haze') {
      score = enemyHasSetupMoves ? 44 : 8;
    } else if (move === 'Defog') {
      var side = turn && turn.pre && turn.pre.speed_control ? turn.pre.speed_control : null;
      var enemyScreens = side && side.opponent && side.opponent.screens;
      var ownScreens = side && side.player && side.player.screens;
      var hasScreenPressure = !!(field.terrain || (enemyScreens && (enemyScreens.reflect || enemyScreens.light || enemyScreens.aurora)) || (ownScreens && (ownScreens.reflect || ownScreens.light || ownScreens.aurora)));
      score = hasScreenPressure ? 44 : 8;
    } else if (move === 'Trick Room') {
      var enemySpeedIdx = liveEnemies.length ? speedOrder.indexOf(_csResolveSnapshotKey(turn && turn.pre, 'opponent', liveEnemies[0])) : -1;
      var actorSpeedIdx = speedOrder.indexOf(actorSnapshotKey);
      score = (!field.trick_room && actorSpeedIdx > -1 && enemySpeedIdx > -1 && actorSpeedIdx > enemySpeedIdx) ? 56 : 20;
    } else if (move === 'Tailwind') {
      score = 50;
    } else if (move === 'Substitute') {
      score = hpPct > 0.35 ? 36 : 10;
    } else if (move === 'Imprison') {
      score = sharedMoveThreat ? 45 : 6;
    } else if (move === 'Ally Switch') {
      score = liveAllies.length > 0 ? 26 : 5;
    } else {
      score = 10;
    }
  } else {
    score = bp / 2;
    if ((actorTypes.indexOf(moveType) >= 0) && moveType !== 'Normal') score += 10;
    if (typeof getEffectiveness === 'function' && targetTypes.length) {
      var eff = getEffectiveness(moveType, targetTypes);
      if (eff >= 2) score += 18;
      else if (eff === 0) score -= 70;
      else if (eff < 1) score -= 8;
    }
    if (bp >= 100 && targetHpPct <= 0.45) score += 16;
    else if (bp >= 80 && targetHpPct <= 0.30) score += 12;
    if (targetHpPct <= 0.20) score += 14;
    if ((move === 'Sucker Punch' || move === 'Feint' || move === 'Extreme Speed' || move === 'Aqua Jet' || move === 'Shadow Sneak') && targetHpPct <= 0.35) score += 8;
    if (typeof getPriority === 'function' && getPriority(move) > 0) score += 5;
  }

  if (hpPct < 0.35 && (move === 'Protect' || move === 'Detect' || move === 'Recover' || move === 'Shore Up' || move === 'Rest' || move === 'Roost')) score += 8;
  return score;
}

function csBuildDecisionAudit(turnLog, opts) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var out = { total_flags: 0, flagged_turns: [], byTurn: {}, byKey: {} };
  if (!rows.length) return out;
  opts = opts || {};
  var playerKey = opts.playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player');
  var oppKey = opts.oppKey || null;
  var teamLookup = opts.teamLookup || ((typeof TEAMS !== 'undefined' && TEAMS[playerKey] && Array.isArray(TEAMS[playerKey].members)) ? TEAMS[playerKey].members : []);
  var oppLookup = opts.oppLookup || ((oppKey && typeof TEAMS !== 'undefined' && TEAMS[oppKey] && Array.isArray(TEAMS[oppKey].members)) ? TEAMS[oppKey].members : []);
  var playerMap = _csDecisionMemberMap(teamLookup);
  var oppMap = _csDecisionMemberMap(oppLookup);
  var threshold = typeof opts.threshold === 'number' ? opts.threshold : 12;

  for (var i = 0; i < rows.length; i++) {
    var turn = rows[i];
    if (!turn || !turn.pre || !turn.actions) continue;
    var playerActs = (turn.actions.player || []).slice();
    if (!playerActs.length) continue;
    var bestGap = -Infinity;
    var bestFlag = null;

    for (var a = 0; a < playerActs.length; a++) {
      var act = playerActs[a];
      if (!act || !act.actor || !act.move) continue;
      var actor = playerMap[act.actor] || { name: act.actor, moves: [], types: [] };
      var legal = (turn.pre.legal_options && turn.pre.legal_options[act.actor]) ? turn.pre.legal_options[act.actor] : [];
      var candidates = legal.map(function(opt) {
        return String(opt).split(' -> ')[0];
      }).filter(function(mv) { return mv && mv.length; });
      if (!candidates.length && Array.isArray(actor.moves)) candidates = actor.moves.slice();
      if (!candidates.length) candidates = [act.move];
      var targetName = act.target || ((turn.pre.active && turn.pre.active.opponent && turn.pre.active.opponent[0]) || null);
      var target = targetName ? (oppMap[targetName] || { name: targetName, moves: [], types: [] }) : null;

      var chosenScore = _csDecisionMoveScore(act.move, actor, target, turn, { oppLookup: oppMap });
      var bestMove = act.move;
      var bestScore = chosenScore;
      for (var c = 0; c < candidates.length; c++) {
        var mv = candidates[c];
        var sc = _csDecisionMoveScore(mv, actor, target, turn, { oppLookup: oppMap });
        if (sc > bestScore) {
          bestScore = sc;
          bestMove = mv;
        }
      }
      var gap = Math.round((bestScore - chosenScore) * 10) / 10;
      if (bestMove !== act.move && gap >= threshold && gap > bestGap) {
        bestGap = gap;
        bestFlag = {
          turn: turn.turn,
          actor: act.actor,
          chosen_move: act.move,
          best_move: bestMove,
          chosen_score: Math.round(chosenScore * 10) / 10,
          best_score: Math.round(bestScore * 10) / 10,
          score_gap: gap,
          expected_delta: Math.round(gap),
          target: targetName,
          reason: 'A better line was available based on current board state'
        };
      }
    }

    if (bestFlag) {
      out.total_flags++;
      out.flagged_turns.push(bestFlag);
      out.byTurn[turn.turn] = bestFlag;
      out.byKey[turn.turn + '|' + bestFlag.actor] = bestFlag;
    }
  }
  return out;
}

function csRenderDecisionAuditChip(flag) {
  if (!flag) return '';
  var delta = (flag.score_gap >= 0 ? '+' : '') + Math.round(flag.score_gap);
  return '<span class="rchip decision-gap" title="' + _escapeHtml(flag.reason || 'Suboptimal line') + '">' +
    'Better line: ' + _escapeHtml(flag.best_move) + ' (' + _escapeHtml(delta) + ')' +
  '</span>';
}

function csRenderTurnLogRows(turnLog, opts) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  if (!rows.length) return '<div class="replay-turn-empty">No structured turn log for this replay.</div>';
  var audit = (opts && (opts.playerKey || opts.oppKey || opts.teamLookup || opts.oppLookup)) && typeof csBuildDecisionAudit === 'function'
    ? csBuildDecisionAudit(rows, opts)
    : null;
  return '<div class="replay-turn-log">' + csRenderReplayLogTurnZero(rows) + rows.map(function(t) {
    var score = t && t.post && typeof t.post.position_score === 'number' ? t.post.position_score : (t.positionScore || 0.5);
    var delta = t && t.delta && typeof t.delta.position_score === 'number' ? t.delta.position_score : 0;
    var actions = [];
    if (t && t.actions) {
      actions = (t.actions.player || []).concat(t.actions.opponent || []).map(function(a) {
        return [a.actor, a.move, a.target ? '-> ' + a.target : ''].filter(Boolean).join(' ');
      });
    }
    var playByPlayHtml = csRenderReplayPlayByPlay(t);
    var headerText = playByPlayHtml ? 'Resolved action order shown below' : (actions.join(' | ') || t.action || '-');
    var inCoach = (typeof coachIn === 'function') ? coachIn(rows, t && t.turn) : '';
    var turnAudit = audit && audit.byTurn ? audit.byTurn[t && t.turn] : null;
    return '<div class="replay-turn-row' + (t && t.swingTurn ? ' swing' : '') + (turnAudit ? ' decision-gap' : '') + '"' + (turnAudit ? ' style="border-left:4px solid var(--gold);"' : '') + '>' +
      '<div class="replay-turn-main"><strong>T' + _escapeHtml(t && t.turn) + '</strong><span>' + _escapeHtml(headerText) + '</span></div>' +
      '<div class="replay-turn-score">Score ' + Math.round(score * 100) + '% · ' + (delta >= 0 ? '+' : '') + Math.round(delta * 100) + '</div>' +
      csRenderDecisionAuditChip(turnAudit) +
      playByPlayHtml +
      csRenderReplayLogSnapshot(t && t.post, 'After T' + (t && t.turn), true, t) +
      csRenderHpBars(t) +
      (inCoach ? '<pre class="replay-turn-coach">' + _escapeHtml(inCoach) + '</pre>' : '') +
    '</div>';
  }).join('') + '</div>';
}

function csTurnLogMemberSnapshot(member, index) {
  member = member || {};
  var spread = member.sps || member.spread || member.evs || {};
  return {
    slot: index,
    name: member.name || member.species || null,
    species: member.species || member.name || null,
    item: member.item || null,
    ability: member.ability || null,
    nature: member.nature || null,
    level: member.level || 50,
    tera_type: member.tera_type || member.teraType || null,
    stat_format: 'champion_sp',
    stat_points: Object.assign({}, spread || {}),
    moves: Array.isArray(member.moves) ? member.moves.slice() : [],
    role: member.role || null
  };
}

function csTurnLogTeamSnapshot(teamKey) {
  var team = (typeof TEAMS !== 'undefined' && teamKey && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return null;
  return {
    key: teamKey,
    name: team.name || team.label || teamKey,
    format: team.format || team.formatid || null,
    formatid: team.formatid || null,
    gametype: team.gametype || null,
    ruleset: team.ruleset || null,
    champion_pack_id: team.champion_pack_id || null,
    legality_status: team.legality_status || null,
    legality_notes: team.legality_notes || null,
    source: team.source || (team.provenance && team.provenance.source) || null,
    members: Array.isArray(team.members) ? team.members.map(csTurnLogMemberSnapshot) : []
  };
}

function csTurnLogBroughtSnapshot(turnLog, side) {
  var first = Array.isArray(turnLog) && turnLog.length ? turnLog[0] : null;
  var rows = first && first.pre && first.pre.roster && Array.isArray(first.pre.roster[side]) ? first.pre.roster[side] : [];
  return rows.map(function(row) {
    return {
      team_slot: row.teamSlot,
      name: row.displayName || row.species || row.name || null,
      species: row.species || row.displayName || row.name || null,
      stable_key: row.stableKey || null,
      key: row.key || null,
      item: row.item || null,
      ability: row.ability || null,
      nature: row.nature || null,
      stat_format: row.stat_format || null,
      calculated_stats: row.calculatedStats || null,
      moves: Array.isArray(row.moves) ? row.moves.slice() : []
    };
  });
}

function csQaInc(bucket, key, amount) {
  if (!bucket) return;
  var label = key == null || key === '' ? 'unknown' : String(key);
  bucket[label] = (bucket[label] || 0) + (Number.isFinite(Number(amount)) ? Number(amount) : 1);
}

function csQaNonNeutralMod(value) {
  if (value == null || value === '') return false;
  var n = Number(value);
  if (!Number.isFinite(n)) return false;
  return n !== 1 && n !== 4096;
}

function csQaSourceTruthVersions() {
  var audit = (typeof ChampionsSim !== 'undefined' && ChampionsSim && ChampionsSim.pokemonDataAudit) ? ChampionsSim.pokemonDataAudit : null;
  return {
    pokemon_showdown: {
      source: audit && audit.source ? audit.source : 'generated Pokemon Showdown audit data',
      source_repository: audit && audit.sourceRepository ? audit.sourceRepository : null,
      source_commit_or_version: audit && audit.sourceCommitOrVersion ? audit.sourceCommitOrVersion : null,
      generated_at: audit && audit.generatedAt ? audit.generatedAt : null
    },
    champions_runtime: {
      source: 'poke-sim/data.js + poke-sim/runtime_data.js + poke-sim/move_support.js',
      note: 'Champion overrides and runtime fallback data live in repo assets until a reviewed DB runtime-source promotion is complete.'
    }
  };
}

function csQaBlankMechanicsSeen() {
  return {
    damage_events: 0,
    effect_events: 0,
    super_effective_damage: 0,
    resisted_damage: 0,
    immunity_rows: 0,
    critical_hits: 0,
    spread_damage: 0,
    hp_cap: 0,
    recoil: 0,
    recoil_damage_rows: 0,
    drain_heal: 0,
    drain_damage_rows: 0,
    recovery: 0,
    hp_cost: 0,
    delayed_recovery: 0,
    residual_drain: 0,
    item_recovery: 0,
    knock_off_boost: 0,
    typed_item_boost: 0,
    stat_stage_damage: 0,
    base_power_modified: 0,
    move_rule_trace_rows: 0,
    nonstandard_stat_source_trace: 0,
    foul_play_trace: 0,
    body_press_trace: 0,
    psyshock_trace: 0,
    ignored_target_power_ability_trace: 0,
    applied_user_power_ability_trace: 0,
    weather_damage_modifier: 0,
    screen_reduction: 0,
    priority_actions: 0,
    blocked_priority_events: 0,
    quick_guard_priority_blocks: 0,
    psychic_terrain_priority_blocks: 0,
    priority_ability_blocks: 0,
    fake_out_timing_failures: 0,
    speed_order_details: 0,
    action_denial_events: 0,
    status_action_denials: 0,
    sleep_action_denials: 0,
    freeze_action_denials: 0,
    paralysis_action_denials: 0,
    flinch_action_denials: 0,
    confusion_action_denials: 0,
    move_lock_failures: 0,
    taunt_move_blocks: 0,
    imprison_move_blocks: 0,
    throat_chop_sound_blocks: 0,
    target_resolution_failures: 0,
    no_valid_target_failures: 0,
    accuracy_misses: 0,
    protect_consecutive_failures: 0,
    status_resolution_events: 0,
    frozen_thaws: 0,
    sleep_wakes: 0,
    sleep_talk_exceptions: 0,
    paralysis_speed_only: 0,
    confusion_pass_through: 0,
    flinch_applied: 0,
    flinch_skip: 0,
    frozen_skip: 0,
    sleep_skip: 0,
    paralysis_skip: 0,
    confusion_self_hit: 0,
    stat_boost_snapshots: 0,
    weather_active: 0,
    trick_room_active: 0,
    tailwind_active: 0,
    tactical_speed_labels: 0,
    speed_state_active: 0,
    speed_order_reversed: 0,
    trick_room_established: 0,
    trick_room_converted: 0,
    trick_room_failed_to_convert: 0,
    tailwind_established: 0,
    tailwind_converted: 0,
    tailwind_without_pressure: 0,
    opponent_tailwind_established: 0,
    opponent_tailwind_converted: 0,
    opponent_tailwind_without_pressure: 0,
    speed_control_neutralized: 0,
    speed_control_reversal: 0,
    duration_timing_labels: 0,
    tailwind_reused_while_active: 0,
    tailwind_into_active_trick_room: 0,
    tailwind_delayed_until_trick_room_end: 0,
    field_effect_expired: 0,
    field_effect_reissued_after_expiry: 0
  };
}

function csQaSnapshotHasNonzeroStatBoosts(snapshot) {
  function hasNonzero(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        if (hasNonzero(obj[i])) return true;
      }
      return false;
    }
    for (var key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      var value = obj[key];
      if (value && typeof value === 'object') {
        if (hasNonzero(value)) return true;
      } else if (value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) !== 0) {
        return true;
      }
    }
    return false;
  }
  return hasNonzero(snapshot && (snapshot.stat_boosts_stable || snapshot.stat_boosts));
}

function csQaSnapshotWeather(snapshot) {
  var field = snapshot && snapshot.field ? snapshot.field : {};
  var weather = field.weather || field.weather_name || null;
  var text = String(weather || '').toLowerCase();
  return !!(text && text !== 'none' && text !== 'clear' && text !== 'null');
}

function csQaSnapshotTrickRoom(snapshot) {
  var field = snapshot && snapshot.field ? snapshot.field : {};
  return Number(field.trick_room || field.trickRoom || 0) > 0;
}

function csQaSnapshotTailwind(snapshot) {
  var speedControl = snapshot && snapshot.speed_control ? snapshot.speed_control : null;
  if (speedControl) {
    for (var side in speedControl) {
      if (!Object.prototype.hasOwnProperty.call(speedControl, side)) continue;
      var row = speedControl[side] || {};
      if (Number(row.tailwind_turns || row.tailwind || 0) > 0) return true;
    }
  }
  var details = Array.isArray(snapshot && snapshot.speed_order_details) ? snapshot.speed_order_details : [];
  for (var i = 0; i < details.length; i++) {
    if (details[i] && details[i].tailwind) return true;
  }
  return false;
}

function csQaSnapshotTailwindTurns(snapshot, side) {
  var speedControl = snapshot && snapshot.speed_control ? snapshot.speed_control : null;
  var row = speedControl && speedControl[side] ? speedControl[side] : {};
  return Number(row.tailwind_turns || row.tailwind || 0) || 0;
}

function csQaTurnPosition(row, point) {
  var snap = row && row[point || 'post'] ? row[point || 'post'] : null;
  return snap && typeof snap.position_score === 'number' ? snap.position_score : null;
}

function csQaActionMoveSide(turn, side, moveName) {
  var actions = turn && turn.actions && Array.isArray(turn.actions[side]) ? turn.actions[side] : [];
  for (var i = 0; i < actions.length; i++) {
    if (String(actions[i] && actions[i].move || '') === moveName) return true;
  }
  return false;
}

function csQaFuturePositionDelta(rows, idx, horizon) {
  var start = csQaTurnPosition(rows[idx], 'pre');
  if (typeof start !== 'number') start = csQaTurnPosition(rows[idx], 'post');
  if (typeof start !== 'number') return null;
  var best = start;
  var last = start;
  var end = Math.min(rows.length - 1, idx + (horizon || 3));
  for (var i = idx; i <= end; i++) {
    var pos = csQaTurnPosition(rows[i], 'post');
    if (typeof pos !== 'number') continue;
    if (pos > best) best = pos;
    last = pos;
  }
  return {
    best: Math.round((best - start) * 1000) / 1000,
    final: Math.round((last - start) * 1000) / 1000
  };
}

function csQaSpeedOrderLooksReversed(snapshot) {
  var details = Array.isArray(snapshot && snapshot.speed_order_details) ? snapshot.speed_order_details : [];
  if (details.length < 2 || !csQaSnapshotTrickRoom(snapshot)) return false;
  var first = Number(details[0] && details[0].effective_speed);
  var last = Number(details[details.length - 1] && details[details.length - 1].effective_speed);
  return Number.isFinite(first) && Number.isFinite(last) && first <= last;
}

function csAddTacticalSpeedLabel(summary, label, turn, detail) {
  summary.label_counts[label] = (summary.label_counts[label] || 0) + 1;
  if (summary.labels.indexOf(label) < 0) summary.labels.push(label);
  summary.events.push(Object.assign({ label: label, turn: turn || null }, detail || {}));
}

function csBuildTacticalSpeedSummary(turnLog, opts) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var summary = {
    schema_version: 'champions-tactical-speed-summary-v1',
    scope: opts && opts.scope || 'turn-log',
    horizon_turns: 3,
    labels: [],
    label_counts: {},
    events: [],
    windows: [],
    notes: [
      'Labels are evidence reads from exported turn logs, not proof that a move was the best possible choice.',
      'Converted means player position improved within the next three turns while the speed plan was active or newly established.'
    ]
  };
  var playerTailwindWindowSeen = false;
  var opponentTailwindWindowSeen = false;

  for (var i = 0; i < rows.length; i++) {
    var turn = rows[i] || {};
    var pre = turn.pre || {};
    var post = turn.post || {};
    var turnNo = Number(turn.turn || (i + 1));
    var preTr = csQaSnapshotTrickRoom(pre);
    var postTr = csQaSnapshotTrickRoom(post);
    var prePlayerTw = csQaSnapshotTailwindTurns(pre, 'player');
    var postPlayerTw = csQaSnapshotTailwindTurns(post, 'player');
    var preOppTw = csQaSnapshotTailwindTurns(pre, 'opponent');
    var postOppTw = csQaSnapshotTailwindTurns(post, 'opponent');
    var delta = csQaFuturePositionDelta(rows, i, 3);

    if (postTr || postPlayerTw || postOppTw) {
      csAddTacticalSpeedLabel(summary, 'speed_state_active', turnNo, {
        trick_room_turns: post && post.field ? Number(post.field.trick_room || 0) : 0,
        player_tailwind_turns: postPlayerTw,
        opponent_tailwind_turns: postOppTw
      });
    }
    if (postTr && csQaSpeedOrderLooksReversed(post)) {
      csAddTacticalSpeedLabel(summary, 'speed_order_reversed', turnNo, {
        evidence: 'post.speed_order_details sorted lower effective Speed first under Trick Room'
      });
    }
    if (!preTr && postTr) {
      csAddTacticalSpeedLabel(summary, 'trick_room_established', turnNo, {
        actor_side: csQaActionMoveSide(turn, 'player', 'Trick Room') ? 'player' : (csQaActionMoveSide(turn, 'opponent', 'Trick Room') ? 'opponent' : 'unknown')
      });
      if (prePlayerTw || preOppTw || postPlayerTw || postOppTw) {
        csAddTacticalSpeedLabel(summary, 'speed_control_reversal', turnNo, {
          evidence: 'Trick Room became active while Tailwind was visible in the speed state.'
        });
      }
      if (delta) {
        var trLabel = delta.best >= 0.05 ? 'trick_room_converted' : (delta.final <= -0.05 ? 'trick_room_failed_to_convert' : null);
        if (trLabel) {
          csAddTacticalSpeedLabel(summary, trLabel, turnNo, {
            position_delta_best_next_3: delta.best,
            position_delta_final_next_3: delta.final
          });
        }
        summary.windows.push({
          label: trLabel || 'trick_room_window_even',
          turn: turnNo,
          kind: 'trick_room',
          position_delta_best_next_3: delta.best,
          position_delta_final_next_3: delta.final
        });
      }
    }
    if ((prePlayerTw || postPlayerTw) && !playerTailwindWindowSeen) {
      playerTailwindWindowSeen = true;
      csAddTacticalSpeedLabel(summary, 'tailwind_established', turnNo, {
        side: 'player',
        evidence: prePlayerTw ? 'Tailwind was already active in the first visible speed window.' : 'Tailwind became active this turn.'
      });
      if (delta) {
        var twLabel = delta.best >= 0.05 ? 'tailwind_converted' : (delta.final <= 0.03 ? 'tailwind_without_pressure' : null);
        if (twLabel) {
          csAddTacticalSpeedLabel(summary, twLabel, turnNo, {
            position_delta_best_next_3: delta.best,
            position_delta_final_next_3: delta.final
          });
        }
        summary.windows.push({
          label: twLabel || 'tailwind_window_even',
          turn: turnNo,
          kind: 'tailwind',
          side: 'player',
          position_delta_best_next_3: delta.best,
          position_delta_final_next_3: delta.final
        });
      }
    }
    if (postPlayerTw && postOppTw) {
      csAddTacticalSpeedLabel(summary, 'speed_control_neutralized', turnNo, {
        evidence: 'Both sides had Tailwind active in the exported speed state.'
      });
    }
    if ((preOppTw || postOppTw) && !opponentTailwindWindowSeen) {
      opponentTailwindWindowSeen = true;
      csAddTacticalSpeedLabel(summary, 'opponent_tailwind_established', turnNo, {
        side: 'opponent',
        evidence: preOppTw ? 'Opponent Tailwind was already active in the first visible speed window.' : 'Opponent Tailwind became active this turn.'
      });
      if (delta) {
        var oppTwLabel = delta.final <= -0.05 ? 'opponent_tailwind_converted' : (delta.best >= 0.03 ? 'opponent_tailwind_without_pressure' : null);
        if (oppTwLabel) {
          csAddTacticalSpeedLabel(summary, oppTwLabel, turnNo, {
            position_delta_best_next_3: delta.best,
            position_delta_final_next_3: delta.final
          });
        }
        summary.windows.push({
          label: oppTwLabel || 'opponent_tailwind_window_even',
          turn: turnNo,
          kind: 'tailwind',
          side: 'opponent',
          position_delta_best_next_3: delta.best,
          position_delta_final_next_3: delta.final
        });
      }
    }
  }

  return summary;
}

function csAddDurationTimingLabel(summary, label, turn, detail) {
  summary.label_counts[label] = (summary.label_counts[label] || 0) + 1;
  if (summary.labels.indexOf(label) < 0) summary.labels.push(label);
  summary.events.push(Object.assign({ label: label, turn: turn || null }, detail || {}));
}

function csDurationSideScreens(snapshot, side) {
  var speedControl = snapshot && snapshot.speed_control ? snapshot.speed_control : null;
  var row = speedControl && speedControl[side] ? speedControl[side] : {};
  var screens = row.screens || {};
  return {
    reflect: Number(screens.reflect || 0),
    light: Number(screens.light || 0),
    aurora: Number(screens.aurora || 0)
  };
}

function csDurationFieldTurns(snapshot, key) {
  var field = snapshot && snapshot.field ? snapshot.field : {};
  if (key === 'trick_room') return Number(field.trick_room || field.trickRoom || 0) || 0;
  if (key === 'weather') return Number(field.weather_turns || field.weatherTurns || 0) || 0;
  if (key === 'terrain') return Number(field.terrain_turns || field.terrainTurns || 0) || 0;
  return 0;
}

function csDurationEffectRows(snapshot) {
  var rows = [];
  ['player', 'opponent'].forEach(function(side) {
    rows.push({ effect: 'tailwind', side: side, turns: csQaSnapshotTailwindTurns(snapshot, side) });
    var screens = csDurationSideScreens(snapshot, side);
    rows.push({ effect: 'reflect', side: side, turns: screens.reflect });
    rows.push({ effect: 'light_screen', side: side, turns: screens.light });
    rows.push({ effect: 'aurora_veil', side: side, turns: screens.aurora });
  });
  rows.push({ effect: 'trick_room', side: 'field', turns: csDurationFieldTurns(snapshot, 'trick_room') });
  rows.push({ effect: 'weather', side: 'field', turns: csDurationFieldTurns(snapshot, 'weather') });
  rows.push({ effect: 'terrain', side: 'field', turns: csDurationFieldTurns(snapshot, 'terrain') });
  return rows;
}

function csBuildDurationEffectSummary(turnLog, opts) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var summary = {
    schema_version: 'champions-duration-effect-summary-v1',
    scope: opts && opts.scope || 'turn-log',
    labels: [],
    label_counts: {},
    events: [],
    active_turns: {},
    notes: [
      'Duration timing is based on exported remaining-turn counters and action rows.',
      'A timing label is a coaching risk signal, not proof of the best possible move.'
    ]
  };
  var prevPost = null;
  var seenTrickRoomExpired = false;
  var seenExpired = {};

  for (var i = 0; i < rows.length; i++) {
    var turn = rows[i] || {};
    var pre = turn.pre || {};
    var post = turn.post || {};
    var turnNo = Number(turn.turn || (i + 1));
    csDurationEffectRows(post).forEach(function(effectRow) {
      if (effectRow.turns > 0) {
        var key = effectRow.side + ':' + effectRow.effect;
        summary.active_turns[key] = (summary.active_turns[key] || 0) + 1;
      }
    });

    if (prevPost) {
      csDurationEffectRows(prevPost).forEach(function(prevEffect) {
        var current = csDurationEffectRows(post).filter(function(row) {
          return row.effect === prevEffect.effect && row.side === prevEffect.side;
        })[0] || { turns: 0 };
        if (prevEffect.turns > 0 && current.turns <= 0) {
          csAddDurationTimingLabel(summary, 'field_effect_expired', turnNo, {
            effect: prevEffect.effect,
            side: prevEffect.side
          });
          seenExpired[prevEffect.side + ':' + prevEffect.effect] = true;
          if (prevEffect.effect === 'trick_room') seenTrickRoomExpired = true;
        }
        if (prevEffect.turns <= 0 && current.turns > 0 && seenExpired[current.side + ':' + current.effect]) {
          csAddDurationTimingLabel(summary, 'field_effect_reissued_after_expiry', turnNo, {
            effect: current.effect,
            side: current.side,
            turns_remaining: current.turns
          });
        }
      });
    }

    ['player', 'opponent'].forEach(function(side) {
      var tailwindMove = csQaActionMoveSide(turn, side, 'Tailwind');
      if (!tailwindMove) return;
      var preTailwind = csQaSnapshotTailwindTurns(pre, side);
      var postTailwind = csQaSnapshotTailwindTurns(post, side);
      var trActive = csQaSnapshotTrickRoom(pre) || csQaSnapshotTrickRoom(post);
      if (preTailwind > 0) {
        csAddDurationTimingLabel(summary, 'tailwind_reused_while_active', turnNo, {
          side: side,
          turns_remaining_before_use: preTailwind
        });
      }
      if (trActive) {
        csAddDurationTimingLabel(summary, 'tailwind_into_active_trick_room', turnNo, {
          side: side,
          trick_room_turns: Math.max(csDurationFieldTurns(pre, 'trick_room'), csDurationFieldTurns(post, 'trick_room')),
          tailwind_turns_after_use: postTailwind
        });
      }
      if (!trActive && seenTrickRoomExpired) {
        csAddDurationTimingLabel(summary, 'tailwind_delayed_until_trick_room_end', turnNo, {
          side: side,
          evidence: 'Tailwind was used after a visible Trick Room expiration in this log.'
        });
      }
    });

    prevPost = post;
  }

  return summary;
}

function csLedgerRate(good, total) {
  total = Number(total || 0);
  if (!total) return null;
  return Math.round((Number(good || 0) / total) * 1000) / 10;
}

function csLedgerCategory(id, label, opportunities, positive, negative, neutral, evidenceLabels, coachingRead) {
  opportunities = Number(opportunities || 0);
  positive = Number(positive || 0);
  negative = Number(negative || 0);
  neutral = Number(neutral || 0);
  if (opportunities && positive + negative + neutral < opportunities) {
    neutral += opportunities - positive - negative - neutral;
  }
  return {
    id: id,
    label: label,
    opportunities: opportunities,
    positive: positive,
    negative: negative,
    neutral: neutral,
    positive_rate_pct: csLedgerRate(positive, opportunities),
    evidence_labels: evidenceLabels || [],
    coaching_read: coachingRead
  };
}

function csBuildDecisionOpportunityLedger(tacticalSpeedSummary, opts) {
  var options = opts || {};
  var counts = tacticalSpeedSummary && tacticalSpeedSummary.label_counts ? tacticalSpeedSummary.label_counts : {};
  var playerTailwindOpp = Number(counts.tailwind_established || 0);
  var playerTailwindGood = Number(counts.tailwind_converted || 0);
  var playerTailwindBad = Number(counts.tailwind_without_pressure || 0);
  var opponentTailwindOpp = Number(counts.opponent_tailwind_established || 0);
  var opponentTailwindGood = Number(counts.opponent_tailwind_without_pressure || 0);
  var opponentTailwindBad = Number(counts.opponent_tailwind_converted || 0);
  var trickRoomOpp = Number(counts.trick_room_established || 0);
  var trickRoomGood = Number(counts.trick_room_converted || 0);
  var trickRoomBad = Number(counts.trick_room_failed_to_convert || 0);
  var contestOpp = Number(counts.speed_control_reversal || 0) + Number(counts.speed_control_neutralized || 0);
  var contestGood = Number(counts.speed_control_reversal || 0);
  var contestNeutral = Number(counts.speed_control_neutralized || 0);
  var categories = [
    csLedgerCategory(
      'player_tailwind',
      'Player Tailwind',
      playerTailwindOpp,
      playerTailwindGood,
      playerTailwindBad,
      0,
      ['tailwind_established', 'tailwind_converted', 'tailwind_without_pressure'],
      'Counts visible player Tailwind windows and whether they converted into position within the next three turns.'
    ),
    csLedgerCategory(
      'opponent_tailwind_defense',
      'Opponent Tailwind Defense',
      opponentTailwindOpp,
      opponentTailwindGood,
      opponentTailwindBad,
      0,
      ['opponent_tailwind_established', 'opponent_tailwind_converted', 'opponent_tailwind_without_pressure'],
      'Counts opponent Tailwind windows. Positive means the player prevented their Tailwind from creating pressure.'
    ),
    csLedgerCategory(
      'trick_room',
      'Trick Room',
      trickRoomOpp,
      trickRoomGood,
      trickRoomBad,
      0,
      ['trick_room_established', 'trick_room_converted', 'trick_room_failed_to_convert'],
      'Counts Trick Room windows and whether the player position improved while the inverted speed state was active.'
    ),
    csLedgerCategory(
      'speed_control_contest',
      'Speed-Control Contest',
      contestOpp,
      contestGood,
      0,
      contestNeutral,
      ['speed_control_reversal', 'speed_control_neutralized'],
      'Counts speed-control answers. Reversal is positive; neutralization is tracked separately as a held-position outcome.'
    )
  ];
  var totals = categories.reduce(function(acc, row) {
    acc.opportunities += row.opportunities;
    acc.positive += row.positive;
    acc.negative += row.negative;
    acc.neutral += row.neutral;
    return acc;
  }, { opportunities: 0, positive: 0, negative: 0, neutral: 0 });
  totals.positive_rate_pct = csLedgerRate(totals.positive, totals.opportunities);
  return {
    schema_version: 'champions-decision-opportunity-ledger-v1',
    scope: options.scope || (tacticalSpeedSummary && tacticalSpeedSummary.scope) || 'turn-log',
    source: 'tactical_speed_summary.label_counts',
    totals: totals,
    categories: categories,
    notes: [
      'This ledger counts evidence-backed opportunities. It does not claim the best possible move until alternative branches are compared.',
      'Positive means the exported position score moved in the player-favorable direction for that tactical window.'
    ]
  };
}

function csCoachBrainBestCategory(categories, mode) {
  var rows = Array.isArray(categories) ? categories.filter(function(row) {
    return row && Number(row.opportunities || 0) > 0;
  }) : [];
  if (!rows.length) return null;
  rows.sort(function(a, b) {
    if (mode === 'weakness') {
      var an = Number(a.negative || 0);
      var bn = Number(b.negative || 0);
      if (bn !== an) return bn - an;
      return Number(a.positive_rate_pct || 0) - Number(b.positive_rate_pct || 0);
    }
    var ar = Number(a.positive_rate_pct || 0);
    var br = Number(b.positive_rate_pct || 0);
    if (br !== ar) return br - ar;
    return Number(b.positive || 0) - Number(a.positive || 0);
  });
  return rows[0] || null;
}

function csCoachBrainIssueText(row) {
  if (!row) return 'Needs more tactical samples before naming a primary issue.';
  if (row.id === 'player_tailwind') return 'Tailwind is available, but too many windows are not becoming pressure.';
  if (row.id === 'opponent_tailwind_defense') return 'Opponent Tailwind is creating too much value against this plan.';
  if (row.id === 'trick_room') return 'Trick Room windows are not converting reliably enough.';
  if (row.id === 'speed_control_contest') return 'Speed-control contests need cleaner conversion after the answer is found.';
  return row.label + ' is the highest-risk tactical category.';
}

function csCoachBrainRootProblem(row) {
  if (!row) return 'Not enough structured evidence yet.';
  if (row.id === 'player_tailwind') return 'Speed is being created, but the next actions are not consistently turning it into material, pressure, or preservation.';
  if (row.id === 'opponent_tailwind_defense') return 'The team needs a clearer plan for the turns after the opponent wins speed.';
  if (row.id === 'trick_room') return 'The setup turn is not consistently paired with a safe slow attacker or immediate payoff.';
  if (row.id === 'speed_control_contest') return 'The answer to speed control is being found, but the follow-up conversion still needs proof.';
  return 'The measured tactical category is producing too many negative outcomes.';
}

function csCoachBrainRisk(row) {
  if (!row) return 'If no more data is collected, the app should not make a confident coaching claim.';
  if (row.id === 'player_tailwind') return 'If nothing changes, the player may keep spending turns on Tailwind while opponents trade damage, Protect, or reposition through it.';
  if (row.id === 'opponent_tailwind_defense') return 'If nothing changes, fast opposing teams can keep using Tailwind windows to force bad trades before the player stabilizes.';
  if (row.id === 'trick_room') return 'If nothing changes, Trick Room turns can keep being spent without enough damage, KOs, or preserved win conditions.';
  if (row.id === 'speed_control_contest') return 'If nothing changes, speed-control answers may stop the opponent temporarily without creating a winning board.';
  return 'If nothing changes, this pattern can continue costing tempo and win condition clarity.';
}

function csCoachBrainExpectedResult(row) {
  if (!row) return 'More structured samples should make the next recommendation more reliable.';
  if (row.id === 'player_tailwind') return 'If fixed, Tailwind conversion rate should rise and more games should show early pressure after speed is established.';
  if (row.id === 'opponent_tailwind_defense') return 'If fixed, opponent Tailwind windows should create fewer negative position swings.';
  if (row.id === 'trick_room') return 'If fixed, Trick Room windows should show more immediate material gain or safer preservation of the slow attacker.';
  if (row.id === 'speed_control_contest') return 'If fixed, reversals and neutralizations should be followed by damage, KOs, or safer board states.';
  return 'If fixed, the category positive rate should improve in later sessions.';
}

function csCoachBrainStrengthText(row) {
  if (!row) return 'No clear strength yet.';
  if (row.id === 'player_tailwind') return 'Player Tailwind is the cleanest current speed-control win path.';
  if (row.id === 'opponent_tailwind_defense') return 'Opponent Tailwind defense is holding up well.';
  if (row.id === 'trick_room') return 'Trick Room is producing the best current conversion windows.';
  if (row.id === 'speed_control_contest') return 'Speed-control answers are a current strength.';
  return row.label + ' is the strongest measured category.';
}

function csCoachBrainNextPlan(row) {
  if (!row) return 'Run more BO1/BO3 samples with retained turn logs before changing the team.';
  if (row.id === 'player_tailwind') return 'Only commit Tailwind when the next two turns can create damage, a KO, a forced Protect, or preservation of a win condition.';
  if (row.id === 'opponent_tailwind_defense') return 'When the opponent gets Tailwind, play the next two turns around survival, Protect timing, priority, or reversing the speed state instead of trading blindly.';
  if (row.id === 'trick_room') return 'Before setting Trick Room, confirm the next board has a slow attacker ready to act safely; otherwise trade or reposition first.';
  if (row.id === 'speed_control_contest') return 'After reversing or neutralizing speed control, immediately convert with target pressure instead of spending the window passively.';
  return 'Focus the next set on improving ' + row.label + ' conversion.';
}

function csCoachBrainDrill(row) {
  if (!row) return 'Run 5 more games and export turn logs with tactical summaries enabled.';
  if (row.id === 'player_tailwind') return 'Play 10 reps where every Tailwind must be followed by a planned two-turn pressure sequence.';
  if (row.id === 'opponent_tailwind_defense') return 'Play 10 reps starting from opponent Tailwind active; score the rep only if you preserve a key Pokemon or reverse tempo.';
  if (row.id === 'trick_room') return 'Play 10 reps where the goal is not setting Trick Room, but getting value during turns 1-3 after it starts.';
  if (row.id === 'speed_control_contest') return 'Play 10 reps focused on the turn after speed control is answered: choose the target that turns tempo into material.';
  return 'Run focused reps for ' + row.label + ' and compare the next ledger.';
}

function csCoachBrainTacticalInterpretation(row, strength) {
  var id = row && row.id;
  var strengthId = strength && strength.id;
  var base = {
    schema_version: 'champions-coach-tactical-interpretation-v1',
    primary_category: id || null,
    strength_category: strengthId || null,
    player_question: 'What changed because of this decision, and what happens if the player does nothing different next time?',
    evidence_boundary: 'This explains observed sim evidence. It does not claim a universal best move until alternative branches and matchup samples agree.'
  };
  if (!row) {
    base.why_good_windows_worked = 'No repeated positive tactical window is proven yet.';
    base.why_bad_windows_failed = 'No repeated negative tactical window is proven yet.';
    base.turn_sequence_rule = 'Collect more retained turn logs before changing team structure.';
    base.coach_checklist = [
      'Identify the speed-control state.',
      'Compare the next one to three turns.',
      'Only call the decision good if it created pressure, material, preservation, or a safer win condition.'
    ];
    base.data_to_watch_next = ['opportunities', 'positive_rate_pct', 'negative', 'neutral'];
    return base;
  }
  if (id === 'player_tailwind') {
    base.why_good_windows_worked = 'Tailwind worked when the next turns converted speed into pressure: damage, KO threat, forced Protect, safer positioning, or preserved win condition.';
    base.why_bad_windows_failed = 'Tailwind failed when it spent a turn creating speed but the following turns did not change board pressure enough; opponents could trade damage, Protect, reposition, or let Trick Room blunt the payoff.';
    base.turn_sequence_rule = 'Before clicking Tailwind, name the two-turn payoff: which Pokemon moves first, which target is pressured, what Protect/switch is forced, and what win condition is preserved.';
    base.coach_checklist = [
      'Do not click Tailwind just because it is available.',
      'Check whether Trick Room is active or likely before committing the speed turn.',
      'Plan the next two attacks or preservation moves before setting Tailwind.',
      'Score the window by conversion, not by whether Tailwind was successfully set.'
    ];
    base.data_to_watch_next = ['tailwind_converted', 'tailwind_without_pressure', 'tailwind_into_active_trick_room', 'field_effect_expired'];
    return base;
  }
  if (id === 'opponent_tailwind_defense') {
    base.why_good_windows_worked = 'The defense worked when the opponent gained speed but the player preserved material, denied pressure, reversed tempo, or forced low-value attacks.';
    base.why_bad_windows_failed = 'The defense failed when the opponent used the speed window to force damage before the player could stabilize.';
    base.turn_sequence_rule = 'When the opponent sets Tailwind, the next two turns should prioritize survival, Protect timing, priority pressure, switching, or speed reversal over blind trades.';
    base.coach_checklist = [
      'Identify the fastest opposing threat under Tailwind.',
      'Protect or reposition the Pokemon that loses the game if it falls.',
      'Use priority, Fake Out, switching, or reverse speed control to shorten the opponent payoff.'
    ];
    base.data_to_watch_next = ['opponent_tailwind_converted', 'opponent_tailwind_without_pressure', 'speed_control_reversal', 'speed_control_neutralized'];
    return base;
  }
  if (id === 'trick_room') {
    base.why_good_windows_worked = 'Trick Room worked when the setup turn led into safe slow-attacker pressure or immediate material gain.';
    base.why_bad_windows_failed = 'Trick Room failed when turns were spent setting the room without a protected attacker, clear target, or enough damage during the inverted-speed window.';
    base.turn_sequence_rule = 'Before setting Trick Room, confirm the next board has a slow attacker ready, a protected setter or pivot path, and a target that creates material or win-condition pressure.';
    base.coach_checklist = [
      'Confirm the slow attacker survives the setup turn.',
      'Avoid setting Trick Room if the opponent can stall all payoff turns with Protect or switches.',
      'Use the first two Trick Room turns for material, not passive setup.'
    ];
    base.data_to_watch_next = ['trick_room_converted', 'trick_room_failed_to_convert', 'speed_order_reversed', 'tailwind_into_active_trick_room'];
    return base;
  }
  base.why_good_windows_worked = 'Speed-control answers worked when they immediately became pressure, material, or safer board position.';
  base.why_bad_windows_failed = 'Speed-control answers failed when they stopped the opponent temporarily but did not create a useful follow-up.';
  base.turn_sequence_rule = 'After answering speed control, spend the next action on the target or switch that converts tempo into a measurable board advantage.';
  base.coach_checklist = [
    'Name the opposing speed plan.',
    'Pick the answer: reverse it, neutralize it, stall it, or attack through it.',
    'Use the next turn to create pressure instead of resetting passively.'
  ];
  base.data_to_watch_next = ['speed_control_reversal', 'speed_control_neutralized', 'tailwind_converted', 'trick_room_converted'];
  return base;
}

function csBuildCoachBrainSummary(ledger, opts) {
  var options = opts || {};
  var categories = Array.isArray(ledger && ledger.categories) ? ledger.categories : [];
  var totals = ledger && ledger.totals ? ledger.totals : {};
  var opportunities = Number(totals.opportunities || 0);
  var issue = csCoachBrainBestCategory(categories, 'weakness');
  var strength = csCoachBrainBestCategory(categories, 'strength');
  var confidence = opportunities >= 100 ? 'high' : (opportunities >= 20 ? 'medium' : (opportunities > 0 ? 'low' : 'needs_more_data'));
  return {
    schema_version: 'champions-coach-brain-summary-v1',
    scope: options.scope || (ledger && ledger.scope) || 'decision-ledger',
    memory_key: [
      options.player_team_id || 'player',
      options.opponent_team_id || 'opponent',
      options.format || 'format',
      'speed-control-ledger'
    ].join('::'),
    confidence: confidence,
    sample: {
      opportunities: opportunities,
      positive: Number(totals.positive || 0),
      negative: Number(totals.negative || 0),
      neutral: Number(totals.neutral || 0),
      positive_rate_pct: totals.positive_rate_pct == null ? null : Number(totals.positive_rate_pct)
    },
    primary_issue: issue ? {
      category: issue.id,
      label: issue.label,
      opportunities: issue.opportunities,
      positive: issue.positive,
      negative: issue.negative,
      neutral: issue.neutral,
      positive_rate_pct: issue.positive_rate_pct,
      read: csCoachBrainIssueText(issue)
    } : null,
    observed_pattern: issue ? csCoachBrainIssueText(issue) : 'No reliable repeated tactical pattern yet.',
    root_problem: csCoachBrainRootProblem(issue),
    risk_if_unchanged: csCoachBrainRisk(issue),
    best_strength: strength ? {
      category: strength.id,
      label: strength.label,
      opportunities: strength.opportunities,
      positive: strength.positive,
      negative: strength.negative,
      neutral: strength.neutral,
      positive_rate_pct: strength.positive_rate_pct,
      read: csCoachBrainStrengthText(strength)
    } : null,
    recommended_solution: csCoachBrainNextPlan(issue),
    next_game_plan: csCoachBrainNextPlan(issue),
    expected_result_if_fixed: csCoachBrainExpectedResult(issue),
    practice_drill: csCoachBrainDrill(issue),
    tactical_interpretation: csCoachBrainTacticalInterpretation(issue, strength),
    learning_direction: {
      next_layer: 'coach_memory',
      purpose: 'Compare this summary against future sessions and broader shared sim evidence before recommending move, lineup, or team changes.',
      shared_data_boundary: 'Use aggregated, non-personal sim evidence and matchup patterns; do not expose another player private team or identity.'
    },
    boundary: 'Evidence-bound speed-control coaching. This does not claim best move or best team until alternative branches are compared.'
  };
}

function csCoachEventOutcome(label) {
  var good = {
    tailwind_converted: true,
    opponent_tailwind_without_pressure: true,
    trick_room_converted: true,
    speed_control_reversal: true,
    tailwind_delayed_until_trick_room_end: true
  };
  var bad = {
    tailwind_without_pressure: true,
    opponent_tailwind_converted: true,
    trick_room_failed_to_convert: true,
    tailwind_reused_while_active: true,
    tailwind_into_active_trick_room: true
  };
  if (good[label]) return 'positive';
  if (bad[label]) return 'negative';
  return 'neutral';
}

function csCoachEventDecisionType(label) {
  if (String(label || '').indexOf('tailwind') >= 0) return 'speed_control_tailwind';
  if (String(label || '').indexOf('trick_room') >= 0) return 'speed_control_trick_room';
  if (String(label || '').indexOf('speed_control') >= 0 || String(label || '').indexOf('speed_state') >= 0) return 'speed_control_contest';
  if (String(label || '').indexOf('field_effect') >= 0) return 'duration_timing';
  return 'tactical_timing';
}

function csCoachEventPlainEnglish(label) {
  var text = {
    speed_state_active: 'A speed-control state was active on this turn.',
    speed_order_reversed: 'Trick Room made slower Pokemon move before faster Pokemon.',
    trick_room_established: 'Trick Room was established.',
    trick_room_converted: 'Trick Room created a favorable position window.',
    trick_room_failed_to_convert: 'Trick Room did not create enough value in the next turns.',
    tailwind_established: 'Tailwind was established.',
    tailwind_converted: 'Tailwind turned into pressure or position gain.',
    tailwind_without_pressure: 'Tailwind was active but did not create enough pressure.',
    opponent_tailwind_established: 'The opponent established Tailwind.',
    opponent_tailwind_converted: 'The opponent converted Tailwind into pressure.',
    opponent_tailwind_without_pressure: 'The player held position through the opponent Tailwind window.',
    speed_control_neutralized: 'Both sides had speed control, so the speed advantage was neutralized.',
    speed_control_reversal: 'One speed plan reversed or disrupted the other speed plan.',
    field_effect_expired: 'A multi-turn field effect expired.',
    field_effect_reissued_after_expiry: 'A multi-turn effect was used again after a visible expiry.',
    tailwind_reused_while_active: 'Tailwind was selected while Tailwind was already active.',
    tailwind_into_active_trick_room: 'Tailwind was selected while Trick Room was active.',
    tailwind_delayed_until_trick_room_end: 'Tailwind was selected after Trick Room ended.'
  };
  return text[label] || ('Tactical event detected: ' + label + '.');
}

function csCoachEventNextTest(label) {
  var text = {
    trick_room_failed_to_convert: 'Test Trick Room only when a slow attacker can act safely on the next turn.',
    tailwind_without_pressure: 'Test Tailwind only when the next two turns create damage, KO pressure, forced Protect, or preservation.',
    opponent_tailwind_converted: 'Test Protect, priority, switching, or speed reversal on the first two opponent Tailwind turns.',
    tailwind_reused_while_active: 'Do not retest Tailwind until the active Tailwind window expires unless the branch proves a specific payoff.',
    tailwind_into_active_trick_room: 'Test waiting until Trick Room has 1 or 0 turns left before committing Tailwind.',
    tailwind_delayed_until_trick_room_end: 'Keep testing this timing branch against Trick Room teams because it may preserve the Tailwind payoff.',
    field_effect_reissued_after_expiry: 'Compare the reissue turn against attacking, switching, or Protect to prove the effect was worth the tempo.',
    speed_control_reversal: 'After reversing speed control, test immediate target pressure so the answer becomes a win path.'
  };
  return text[label] || 'Compare the next branch against attacking, protecting, switching, or delaying the setup turn.';
}

function csCoachEventConfidence(label, detail) {
  if (label === 'tailwind_into_active_trick_room' || label === 'tailwind_reused_while_active') return 'medium';
  if (label === 'tailwind_converted' || label === 'trick_room_converted' || label === 'trick_room_failed_to_convert') return 'medium';
  if (detail && (detail.position_delta_best_next_3 != null || detail.position_delta_final_next_3 != null)) return 'medium';
  return 'low';
}

function csCoachEventRowsFromEvents(events, family, opts) {
  var options = opts || {};
  var rows = [];
  var sourceEvents = Array.isArray(events) ? events : [];
  for (var i = 0; i < sourceEvents.length; i++) {
    var event = sourceEvents[i] || {};
    var label = event.label || 'unknown';
    var outcome = csCoachEventOutcome(label);
    rows.push({
      schema_version: 'champions-coach-event-row-v1',
      event_id: [
        options.scope || 'scope',
        options.player_team_id || 'player',
        options.opponent_team_id || 'opponent',
        family || 'family',
        label,
        event.turn || i + 1,
        i
      ].join('::'),
      scope: options.scope || 'turn-log',
      family: family || 'tactical',
      event_label: label,
      turn: event.turn || null,
      decision_type: csCoachEventDecisionType(label),
      outcome: outcome,
      confidence: csCoachEventConfidence(label, event),
      player_team_id: options.player_team_id || null,
      opponent_team_id: options.opponent_team_id || null,
      format: options.format || null,
      situation: csCoachEventPlainEnglish(label),
      why_it_matters: outcome === 'negative'
        ? 'This pattern can spend tempo without creating pressure or preserving the win condition.'
        : (outcome === 'positive'
          ? 'This pattern is evidence that the decision created pressure, preserved position, or answered the opponent plan.'
          : 'This is a timing marker that needs outcome comparison before calling it good or bad.'),
      next_test: csCoachEventNextTest(label),
      evidence: Object.assign({}, event),
      sample_size: 1,
      db_ready: true,
      privacy_boundary: 'Aggregate this as non-personal matchup evidence before using it for shared recommendations.'
    });
  }
  return rows;
}

function csBuildCoachEventRows(tacticalSpeedSummary, durationEffectSummary, opts) {
  var options = opts || {};
  var maxRows = Number.isFinite(Number(options.maxRows)) ? Math.max(0, Number(options.maxRows)) : 120;
  var rows = [];
  rows = rows.concat(csCoachEventRowsFromEvents(tacticalSpeedSummary && tacticalSpeedSummary.events, 'tactical_speed', options));
  rows = rows.concat(csCoachEventRowsFromEvents(durationEffectSummary && durationEffectSummary.events, 'duration_timing', options));
  return maxRows ? rows.slice(0, maxRows) : rows;
}

function csSummarizeCoachEventRows(rows) {
  var list = Array.isArray(rows) ? rows : [];
  var summary = {
    schema_version: 'champions-coach-event-row-summary-v1',
    total_rows: list.length,
    by_outcome: {},
    by_decision_type: {},
    by_label: {},
    confidence: {}
  };
  for (var i = 0; i < list.length; i++) {
    var row = list[i] || {};
    csQaInc(summary.by_outcome, row.outcome || 'unknown');
    csQaInc(summary.by_decision_type, row.decision_type || 'unknown');
    csQaInc(summary.by_label, row.event_label || 'unknown');
    csQaInc(summary.confidence, row.confidence || 'unknown');
  }
  return summary;
}

function csSnapshotHpMap(snapshot) {
  return snapshot && snapshot.hp_pct_stable ? snapshot.hp_pct_stable : {};
}

function csSnapshotNameMap(snapshot) {
  var out = {};
    var roster = snapshot && snapshot.roster ? snapshot.roster : {};
  ['player', 'opponent'].forEach(function(side) {
    var rows = Array.isArray(roster[side]) ? roster[side] : [];
    rows.forEach(function(row) {
      var key = row && (row.stable_key || row.stableKey);
      if (key) out[key] = row.name || row.displayName || row.species || key;
    });
  });
  return out;
}

function csSnapshotStatusMap(snapshot) {
  var out = {};
  var roster = snapshot && snapshot.roster ? snapshot.roster : {};
  ['player', 'opponent'].forEach(function(side) {
    var rows = Array.isArray(roster[side]) ? roster[side] : [];
    rows.forEach(function(row) {
      var key = row && (row.stable_key || row.stableKey);
      if (key) out[key] = row.status || '';
    });
  });
  return out;
}

function csHpEvidenceRows(turn) {
  var rows = [];
  (Array.isArray(turn && turn.damage_events) ? turn.damage_events : []).forEach(function(row) {
    rows.push({
      kind: 'damage',
      key: row && row.target_key,
      name: row && row.target,
      source: row && row.attacker,
      move: row && row.move,
      amount: Number(row && (row.applied_damage != null ? row.applied_damage : row.damage) || 0),
      hp_before: Number(row && row.target_hp_before || 0),
      hp_after: Number(row && row.target_hp_after || 0),
      explanation: (row && row.target || 'Pokemon') + ' took ' + Number(row && (row.applied_damage != null ? row.applied_damage : row.damage) || 0) + ' damage from ' + (row && row.move || 'an attack') + '.'
    });
    if (row && row.recoil_damage != null) {
      rows.push({
        kind: 'effect',
        key: row.attacker_key,
        name: row.attacker,
        source: row.attacker,
        move: row.move,
        effect_kind: 'recoil',
        amount: Number(row.recoil_hp_before || 0) - Number(row.recoil_hp_after || 0),
        hp_before: Number(row.recoil_hp_before || 0),
        hp_after: Number(row.recoil_hp_after || 0),
        explanation: (row.attacker || 'Pokemon') + ' took ' + (Number(row.recoil_hp_before || 0) - Number(row.recoil_hp_after || 0)) + ' recoil damage from ' + (row.move || 'its move') + '.'
      });
    }
  });
  (Array.isArray(turn && turn.effect_events) ? turn.effect_events : []).forEach(function(row) {
    var before = Number(row && row.hp_before || 0);
    var after = Number(row && row.hp_after || 0);
    var amount = Math.max(0, before - after);
    if (!amount) return;
    rows.push({
      kind: 'effect',
      key: row && row.actor_key,
      name: row && row.actor,
      source: row && (row.source_actor || row.source || row.move),
      move: row && row.move,
      effect_kind: row && row.effect_kind,
      amount: amount,
      hp_before: before,
      hp_after: after,
      explanation: (row && row.actor || 'Pokemon') + ' took ' + amount + ' damage from ' + (row && (row.move || row.effect_kind) || 'an effect') + '.'
    });
  });
  return rows;
}

function csBuildFaintCauseSummary(turnLog) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var out = {
    schema_version: 'champions-faint-cause-summary-v1',
    total_faints: 0,
    explained_faints: 0,
    unexplained_faints: 0,
    hp_drops: 0,
    unexplained_hp_drops: 0,
    faint_causes: [],
    unexplained: []
  };
  for (var i = 0; i < rows.length; i++) {
    var turn = rows[i] || {};
    var preHp = csSnapshotHpMap(turn.pre);
    var postHp = csSnapshotHpMap(turn.post);
    var names = Object.assign({}, csSnapshotNameMap(turn.pre), csSnapshotNameMap(turn.post));
    var postStatus = csSnapshotStatusMap(turn.post);
    var evidence = csHpEvidenceRows(turn);
    Object.keys(preHp || {}).forEach(function(key) {
      var beforePct = Number(preHp[key]);
      if (!Number.isFinite(beforePct)) return;
      var hasPostHp = Object.prototype.hasOwnProperty.call(postHp, key);
      if (!hasPostHp && postStatus[key] !== 'fainted') return;
      var afterPct = hasPostHp ? Number(postHp[key]) : 0;
      if (!Number.isFinite(afterPct) || afterPct >= beforePct) return;
      out.hp_drops += 1;
      var matches = evidence.filter(function(row) { return row && row.key === key && Number(row.amount || 0) > 0; });
      if (afterPct <= 0) {
        var lethalMatch = matches.filter(function(row) {
          return Number(row.hp_after || 0) <= 0;
        })[0] || null;
        out.total_faints += 1;
        if (lethalMatch) {
          out.explained_faints += 1;
          out.faint_causes.push(Object.assign({
            turn: turn.turn || i + 1,
            pokemon: names[key] || key,
            stable_key: key,
            hp_pct_before: beforePct,
            hp_pct_after: afterPct,
            cause_text: (names[key] || key) + ' fainted because ' + lethalMatch.explanation
          }, lethalMatch));
        } else {
          out.unexplained_faints += 1;
          out.unexplained.push({
            turn: turn.turn || i + 1,
            pokemon: names[key] || key,
            stable_key: key,
            hp_pct_before: beforePct,
            hp_pct_after: afterPct,
            issue: matches.length ? 'faint_without_lethal_damage_or_effect_evidence' : 'faint_without_damage_or_effect_evidence'
          });
        }
      } else if (!matches.length) {
        out.unexplained_hp_drops += 1;
        out.unexplained.push({
          turn: turn.turn || i + 1,
          pokemon: names[key] || key,
          stable_key: key,
          hp_pct_before: beforePct,
          hp_pct_after: afterPct,
          issue: 'hp_drop_without_damage_or_effect_evidence'
        });
      }
    });
  }
  return out;
}

function csQaMoveContactInfo(move) {
  try {
    if (typeof ChampionsSim !== 'undefined' &&
        ChampionsSim.battle &&
        typeof ChampionsSim.battle.getMoveContactInfo === 'function') {
      return ChampionsSim.battle.getMoveContactInfo(move);
    }
  } catch (_e) {}
  return {
    move: String(move || ''),
    is_contact: null,
    source: 'contact_helper_unavailable',
    has_showdown_row: null,
    has_local_override: null
  };
}

function csBuildContactMoveAuditSummary(turnLog) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var summary = {
    schema_version: 'champions-contact-move-audit-v1',
    moves: {},
    totals: {
      action_moves: 0,
      damaging_moves: 0,
      contact_true: 0,
      contact_false: 0,
      unknown_contact: 0,
      missing_move_metadata: 0,
      local_contact_override: 0,
      showdown_contact_flag: 0,
      contact_damage_events: 0
    },
    unknown_physical_moves: [],
    contact_damage_events: []
  };
  function remember(move, info, extra) {
    var name = String(move || 'unknown');
    var row = summary.moves[name] || {
      move: name,
      seen: 0,
      damaging_seen: 0,
      category: null,
      contact: info && info.is_contact,
      contact_source: info && info.source || 'unknown',
      has_showdown_row: info && info.has_showdown_row,
      has_local_override: info && info.has_local_override
    };
    row.seen += 1;
    if (extra && extra.damaging) row.damaging_seen += 1;
    if (extra && extra.category) row.category = extra.category;
    if (info && info.source) row.contact_source = info.source;
    if (info && info.is_contact !== null) row.contact = info.is_contact;
    summary.moves[name] = row;
  }
  rows.forEach(function(turn) {
    ['player', 'opponent'].forEach(function(side) {
      var actions = turn && turn.actions && Array.isArray(turn.actions[side]) ? turn.actions[side] : [];
      actions.forEach(function(action) {
        if (!action || !action.move) return;
        var info = csQaMoveContactInfo(action.move);
        summary.totals.action_moves += 1;
        if (info.source === 'missing_move_metadata') summary.totals.missing_move_metadata += 1;
        if (info.source === 'local_contact_override') summary.totals.local_contact_override += 1;
        if (info.source === 'showdown_flag') summary.totals.showdown_contact_flag += 1;
        if (info.is_contact === true) summary.totals.contact_true += 1;
        else if (info.is_contact === false) summary.totals.contact_false += 1;
        else summary.totals.unknown_contact += 1;
        remember(action.move, info, {});
      });
    });
    (Array.isArray(turn && turn.damage_events) ? turn.damage_events : []).forEach(function(row) {
      if (!row || !row.move) return;
      var info = csQaMoveContactInfo(row.move);
      summary.totals.damaging_moves += 1;
      remember(row.move, info, { damaging: true, category: row.category || null });
      if ((row.category === 'physical' || row.category === 'Physical') && info.is_contact === null && summary.unknown_physical_moves.indexOf(row.move) < 0) {
        summary.unknown_physical_moves.push(row.move);
      }
    });
    (Array.isArray(turn && turn.effect_events) ? turn.effect_events : []).forEach(function(row) {
      var kind = String(row && row.effect_kind || '');
      if (kind.indexOf('contact-damage') < 0) return;
      summary.totals.contact_damage_events += 1;
      summary.contact_damage_events.push({
        turn: turn.turn || null,
        actor: row.actor || null,
        actor_key: row.actor_key || null,
        move: row.move || null,
        effect_kind: row.effect_kind || null,
        hp_before: row.hp_before,
        hp_after: row.hp_after,
        damage_applied: row.damage_applied
      });
    });
  });
  summary.unknown_physical_moves = summary.unknown_physical_moves.slice(0, 50);
  summary.contact_damage_events = summary.contact_damage_events.slice(0, 120);
  return summary;
}

function csQaCountSnapshotCoverage(snapshot, mechanics) {
  if (!snapshot || typeof snapshot !== 'object') return;
  if (Array.isArray(snapshot.speed_order_details) && snapshot.speed_order_details.length) mechanics.speed_order_details += 1;
  if (csQaSnapshotHasNonzeroStatBoosts(snapshot)) mechanics.stat_boost_snapshots += 1;
  if (csQaSnapshotWeather(snapshot)) mechanics.weather_active += 1;
  if (csQaSnapshotTrickRoom(snapshot)) mechanics.trick_room_active += 1;
  if (csQaSnapshotTailwind(snapshot)) mechanics.tailwind_active += 1;
}

function csQaActionLooksPriority(action) {
  if (!action || typeof action !== 'object') return false;
  if (Number.isFinite(Number(action.priority)) && Number(action.priority) !== 0) return true;
  var priorityMoves = {
    'Helping Hand': true,
    'Protect': true,
    'Detect': true,
    'Endure': true,
    'Fake Out': true,
    'Wide Guard': true,
    'Quick Guard': true,
    'Extreme Speed': true,
    'Ally Switch': true,
    'Follow Me': true,
    'Rage Powder': true,
    'Aqua Jet': true,
    'Ice Shard': true,
    'Shadow Sneak': true,
    'Sucker Punch': true,
    'Vacuum Wave': true,
    'Quick Attack': true,
    'Feint': true,
    "King's Shield": true,
    'Spiky Shield': true,
    'Baneful Bunker': true,
    'Obstruct': true,
    'Trick Room': true
  };
  return !!priorityMoves[action.move];
}

function csQaEffectKindMatches(kind, token) {
  return String(kind || '').toLowerCase().indexOf(token) >= 0;
}

function csQaIsDirectRecoveryKind(kind) {
  var text = String(kind || '').toLowerCase();
  return text === 'recovery' ||
    text === 'full-recovery-status' ||
    text === 'ally-recovery' ||
    text === 'target-recovery' ||
    text === 'ally-recovery-status';
}

function csQaTagsInclude(tags, token) {
  if (!Array.isArray(tags)) return false;
  for (var i = 0; i < tags.length; i++) {
    if (String(tags[i] || '').toLowerCase().indexOf(token) >= 0) return true;
  }
  return false;
}

function csQaMissingTargetedProof(mechanics) {
  var checks = [
    ['spread_damage', 'spread damage rows'],
    ['screen_reduction', 'screen or Aurora Veil damage reduction'],
    ['weather_damage_modifier', 'non-neutral weather damage modifier'],
    ['trick_room_active', 'Trick Room active state'],
    ['tailwind_active', 'Tailwind active state'],
    ['stat_stage_damage', 'stat-stage damage calculation'],
    ['move_rule_trace_rows', 'move rule trace rows'],
    ['nonstandard_stat_source_trace', 'non-standard stat-source move trace'],
    ['priority_actions', 'priority move ordering'],
    ['recoil', 'recoil effect math'],
    ['drain_heal', 'drain healing'],
    ['recovery', 'direct recovery'],
    ['hp_cost', 'HP-cost moves'],
    ['delayed_recovery', 'delayed recovery'],
    ['residual_drain', 'residual drain'],
    ['item_recovery', 'item recovery']
  ];
  var out = [];
  for (var i = 0; i < checks.length; i++) {
    if (!Number(mechanics && mechanics[checks[i][0]] || 0)) out.push(checks[i][1]);
  }
  return out;
}

function csQaFamilyCount(mechanics, keys) {
  var total = 0;
  (Array.isArray(keys) ? keys : []).forEach(function(key) {
    total += Number(mechanics && mechanics[key] || 0);
  });
  return total;
}

function csQaBuildFamilyStatus(id, label, mechanics, requiredKeys, optionalKeys, note) {
  var required = Array.isArray(requiredKeys) ? requiredKeys : [];
  var optional = Array.isArray(optionalKeys) ? optionalKeys : [];
  var provenRequired = required.filter(function(key) {
    return Number(mechanics && mechanics[key] || 0) > 0;
  });
  var missingRequired = required.filter(function(key) {
    return !Number(mechanics && mechanics[key] || 0);
  });
  var optionalSeen = optional.filter(function(key) {
    return Number(mechanics && mechanics[key] || 0) > 0;
  });
  var observedRows = csQaFamilyCount(mechanics, required.concat(optional));
  var status = !required.length || provenRequired.length === required.length
    ? 'proven'
    : (provenRequired.length || optionalSeen.length ? 'partial' : 'missing');
  return {
    id: id,
    label: label,
    status: status,
    observed_rows: observedRows,
    required_mechanics: required,
    proven_required_mechanics: provenRequired,
    missing_required_mechanics: missingRequired,
    optional_mechanics_seen: optionalSeen,
    note: note || null
  };
}

function csBuildMoveEffectLogicMatrix(mechanics, opts) {
  mechanics = mechanics || {};
  var options = opts || {};
  var contact = options.contact_move_audit_summary || {};
  var contactTotals = contact.totals || {};
  var faint = options.faint_cause_summary || {};
  var families = [
    csQaBuildFamilyStatus(
      'damage_math',
      'Damage math and modifiers',
      mechanics,
      ['damage_events', 'move_rule_trace_rows', 'stat_stage_damage'],
      ['super_effective_damage', 'resisted_damage', 'immunity_rows', 'critical_hits', 'spread_damage', 'weather_damage_modifier', 'screen_reduction', 'base_power_modified', 'typed_item_boost', 'knock_off_boost'],
      'Core proof that damage rows carry enough math detail to audit move results.'
    ),
    csQaBuildFamilyStatus(
      'nonstandard_stat_source',
      'Non-standard stat-source moves',
      mechanics,
      ['nonstandard_stat_source_trace', 'foul_play_trace', 'body_press_trace', 'psyshock_trace'],
      ['ignored_target_power_ability_trace', 'applied_user_power_ability_trace'],
      'Protects Foul Play, Body Press, Psyshock-style defense targeting, and related ability-modifier boundaries.'
    ),
    csQaBuildFamilyStatus(
      'hp_effects',
      'HP-changing move and item effects',
      mechanics,
      ['effect_events', 'recoil', 'drain_heal', 'recovery', 'hp_cost', 'delayed_recovery', 'residual_drain', 'item_recovery'],
      ['recoil_damage_rows', 'drain_damage_rows', 'hp_cap'],
      'Proof that non-direct-damage HP changes are exported as structured effect_events.'
    ),
    csQaBuildFamilyStatus(
      'status_action_denial',
      'Status and volatile action denial',
      mechanics,
      ['action_denial_events', 'status_action_denials'],
      ['sleep_action_denials', 'freeze_action_denials', 'paralysis_action_denials', 'flinch_action_denials', 'confusion_action_denials', 'status_resolution_events', 'frozen_thaws', 'sleep_wakes', 'sleep_talk_exceptions', 'paralysis_speed_only', 'confusion_pass_through'],
      'Covers turns where a Pokemon cannot move and the replay must explain why.'
    ),
    csQaBuildFamilyStatus(
      'move_failure_prevention',
      'Move failure and prevention rules',
      mechanics,
      ['move_lock_failures', 'target_resolution_failures', 'accuracy_misses', 'protect_consecutive_failures'],
      ['taunt_move_blocks', 'imprison_move_blocks', 'throat_chop_sound_blocks', 'no_valid_target_failures'],
      'Covers failed move attempts such as Taunt/Imprison/Throat Chop, misses, no valid target, and Protect timing.'
    ),
    csQaBuildFamilyStatus(
      'priority_prevention',
      'Priority and anti-priority rules',
      mechanics,
      ['priority_actions', 'blocked_priority_events'],
      ['quick_guard_priority_blocks', 'psychic_terrain_priority_blocks', 'priority_ability_blocks', 'fake_out_timing_failures'],
      'Covers priority ordering plus Quick Guard, Psychic Terrain, ability blockers, and Fake Out timing failures.'
    ),
    csQaBuildFamilyStatus(
      'field_duration_speed_control',
      'Field duration and speed control',
      mechanics,
      ['trick_room_active', 'tailwind_active', 'speed_order_details'],
      ['speed_control_neutralized', 'speed_control_reversal', 'duration_timing_labels', 'field_effect_expired', 'field_effect_reissued_after_expiry', 'tailwind_reused_while_active', 'tailwind_into_active_trick_room', 'tailwind_delayed_until_trick_room_end'],
      'Covers duration counters and speed-control state so coaching can reason about timing without guessing.'
    ),
    csQaBuildFamilyStatus(
      'contact_item_damage',
      'Contact and item damage transparency',
      mechanics,
      [],
      ['effect_events'],
      'Uses the contact audit plus effect_events to show whether contact damage and item damage are inspectable.'
    ),
    csQaBuildFamilyStatus(
      'faint_transparency',
      'Faint and HP-drop transparency',
      mechanics,
      [],
      ['damage_events', 'effect_events'],
      'Every faint or HP drop should trace back to damage_events or HP-changing effect_events.'
    )
  ];
  families.forEach(function(row) {
    if (row.id === 'contact_item_damage') {
      var contactKnown = Number(contactTotals.contact_true || 0) + Number(contactTotals.contact_false || 0);
      var contactUnknown = Number(contactTotals.unknown_contact || 0) + Number(contactTotals.missing_move_metadata || 0);
      row.observed_rows = Number(contactTotals.action_moves || 0) + Number(contactTotals.contact_damage_events || 0);
      row.contact_known_rows = contactKnown;
      row.contact_unknown_rows = contactUnknown;
      row.status = contactKnown > 0 && contactUnknown === 0 ? 'proven' : (row.observed_rows > 0 ? 'partial' : 'missing');
      row.missing_required_mechanics = row.status === 'proven' ? [] : ['known contact metadata for observed moves'];
    }
    if (row.id === 'faint_transparency') {
      var faintTotal = Number(faint.total_faints || 0);
      var unexplained = Number(faint.unexplained_faints || 0) + Number(faint.unexplained_hp_drops || 0);
      row.observed_rows = faintTotal + Number(faint.hp_drops || 0);
      row.total_faints = faintTotal;
      row.unexplained_faints = Number(faint.unexplained_faints || 0);
      row.unexplained_hp_drops = Number(faint.unexplained_hp_drops || 0);
      row.status = row.observed_rows > 0 && unexplained === 0 ? 'proven' : (row.observed_rows > 0 ? 'partial' : 'missing');
      row.missing_required_mechanics = unexplained ? ['all faints and HP drops explained by damage_events/effect_events'] : [];
    }
  });
  var totals = { proven: 0, partial: 0, missing: 0 };
  families.forEach(function(row) {
    totals[row.status] = Number(totals[row.status] || 0) + 1;
  });
  return {
    schema_version: 'champions-move-effect-logic-matrix-v1',
    purpose: 'Coverage gate for move damage, secondary effects, prevention rules, field duration, status denial, contact/item damage, and faint transparency.',
    scope: options.scope || 'qa-coverage-summary',
    totals: totals,
    families: families,
    missing_families: families.filter(function(row) { return row.status === 'missing'; }).map(function(row) { return row.id; }),
    partial_families: families.filter(function(row) { return row.status === 'partial'; }).map(function(row) { return row.id; }),
    notes: [
      'This matrix proves only mechanics that occurred in exported evidence.',
      'Missing or partial families are QA targets, not automatic engine bugs.',
      'Do not use coaching claims from a family until the relevant evidence is proven or explicitly caveated.'
    ]
  };
}

function csBuildQaCoverageSummary(turnLog, opts) {
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var options = opts || {};
  var qaSides = ['player', 'opponent'];
  var totals = {
    turns: rows.length,
    action_rows: 0,
    damage_events: 0,
    effect_events: 0,
    turns_with_damage_events: 0,
    turns_with_effect_events: 0
  };
  var mechanics = csQaBlankMechanicsSeen();
  var tacticalSpeedSummary = csBuildTacticalSpeedSummary(rows, { scope: options.scope || 'single-turn-log' });
  var durationEffectSummary = csBuildDurationEffectSummary(rows, { scope: options.scope || 'single-turn-log' });
  var decisionLedger = csBuildDecisionOpportunityLedger(tacticalSpeedSummary, { scope: options.scope || 'single-turn-log' });
  var faintCauseSummary = csBuildFaintCauseSummary(rows);
  var contactMoveAuditSummary = csBuildContactMoveAuditSummary(rows);
  var coachEventRows = csBuildCoachEventRows(tacticalSpeedSummary, durationEffectSummary, {
    scope: options.scope || 'single-turn-log',
    player_team_id: options.player_team_id || null,
    opponent_team_id: options.opponent_team_id || null,
    format: options.format || null,
    maxRows: 120
  });
  var tacticalLabels = tacticalSpeedSummary.label_counts || {};
  for (var tacticalLabel in tacticalLabels) {
    if (!Object.prototype.hasOwnProperty.call(tacticalLabels, tacticalLabel)) continue;
    mechanics.tactical_speed_labels += Number(tacticalLabels[tacticalLabel] || 0);
    if (Object.prototype.hasOwnProperty.call(mechanics, tacticalLabel)) {
      mechanics[tacticalLabel] += Number(tacticalLabels[tacticalLabel] || 0);
    }
  }
  var durationLabels = durationEffectSummary.label_counts || {};
  for (var durationLabel in durationLabels) {
    if (!Object.prototype.hasOwnProperty.call(durationLabels, durationLabel)) continue;
    mechanics.duration_timing_labels += Number(durationLabels[durationLabel] || 0);
    if (Object.prototype.hasOwnProperty.call(mechanics, durationLabel)) {
      mechanics[durationLabel] += Number(durationLabels[durationLabel] || 0);
    }
  }
  var damageMoves = {};
  var effectMoves = {};
  var effectKinds = {};

  for (var t = 0; t < rows.length; t++) {
    var turn = rows[t] || {};
    csQaCountSnapshotCoverage(turn.pre, mechanics);
    csQaCountSnapshotCoverage(turn.post, mechanics);

    for (var s = 0; s < qaSides.length; s++) {
      var actions = turn.actions && Array.isArray(turn.actions[qaSides[s]]) ? turn.actions[qaSides[s]] : [];
      totals.action_rows += actions.length;
      for (var a = 0; a < actions.length; a++) {
        if (csQaActionLooksPriority(actions[a])) mechanics.priority_actions += 1;
      }
    }

    var damageRows = Array.isArray(turn.damage_events) ? turn.damage_events : [];
    var effectRows = Array.isArray(turn.effect_events) ? turn.effect_events : [];
    totals.damage_events += damageRows.length;
    totals.effect_events += effectRows.length;
    mechanics.damage_events += damageRows.length;
    mechanics.effect_events += effectRows.length;
    if (damageRows.length) totals.turns_with_damage_events += 1;
    if (effectRows.length) totals.turns_with_effect_events += 1;

    for (var d = 0; d < damageRows.length; d++) {
      var row = damageRows[d] || {};
      csQaInc(damageMoves, row.move || 'unknown');
      var typeEffectiveness = Number(row.type_effectiveness);
      if (Number.isFinite(typeEffectiveness)) {
        if (typeEffectiveness > 1) mechanics.super_effective_damage += 1;
        else if (typeEffectiveness > 0 && typeEffectiveness < 1) mechanics.resisted_damage += 1;
        else if (typeEffectiveness === 0) mechanics.immunity_rows += 1;
      }
      if (row.critical || row.crit || row.is_critical) mechanics.critical_hits += 1;
      if (csQaNonNeutralMod(row.spread_mod)) mechanics.spread_damage += 1;
      if (csQaNonNeutralMod(row.screen_mod)) mechanics.screen_reduction += 1;
      if (csQaNonNeutralMod(row.weather_mod)) mechanics.weather_damage_modifier += 1;
      if (row.damage_capped_by_hp) mechanics.hp_cap += 1;
      if (row.recoil_rule || row.recoil_damage != null || csQaTagsInclude(row.effect_tags, 'recoil')) mechanics.recoil_damage_rows += 1;
      if (row.drain_rule || row.drain_heal_candidate != null || csQaTagsInclude(row.effect_tags, 'drain')) mechanics.drain_damage_rows += 1;
      if (row.knock_off_boost || csQaNonNeutralMod(row.knock_off_boost_mod)) mechanics.knock_off_boost += 1;
      if (row.typed_item_boost || csQaNonNeutralMod(row.typed_item_boost_mod)) mechanics.typed_item_boost += 1;
      if (Number(row.attack_stat_stage_used || row.attack_stat_stage || 0) !== 0 || Number(row.defense_stat_stage_used || row.defense_stat_stage || 0) !== 0) {
        mechanics.stat_stage_damage += 1;
      }
      if (Number.isFinite(Number(row.base_power_initial)) && Number.isFinite(Number(row.base_power_modified)) && Number(row.base_power_initial) !== Number(row.base_power_modified)) {
        mechanics.base_power_modified += 1;
      }
      var trace = row.move_rule_trace || {};
      var flags = trace.ruleset_flags || {};
      if (trace.schema_version === 'champions-move-rule-trace-v1') mechanics.move_rule_trace_rows += 1;
      if (flags.nonstandard_offensive_stat_source || flags.nonstandard_defensive_stat) mechanics.nonstandard_stat_source_trace += 1;
      if (flags.foul_play_target_attack_source) mechanics.foul_play_trace += 1;
      if (flags.body_press_uses_user_defense) mechanics.body_press_trace += 1;
      if (flags.psyshock_targets_defense) mechanics.psyshock_trace += 1;
      if (flags.foul_play_target_power_ability_ignored || (trace.offensive_stat && trace.offensive_stat.target_side_power_ability_ignored)) {
        mechanics.ignored_target_power_ability_trace += 1;
      }
      if (flags.user_physical_power_ability_applied_to_nonstandard_source || (trace.offensive_stat && trace.offensive_stat.user_side_power_ability_applied)) {
        mechanics.applied_user_power_ability_trace += 1;
      }
    }

    for (var e = 0; e < effectRows.length; e++) {
      var effect = effectRows[e] || {};
      var kind = effect.effect_kind || 'unknown';
      csQaInc(effectKinds, kind);
      csQaInc(effectMoves, effect.move || 'unknown');
      var lowerKind = String(kind || '').toLowerCase();
      var actionDenialReasonId = String(effect.action_denial_reason || effect.reason_id || effect.volatile_status || '').toLowerCase();
      var failureReasonId = String(effect.failure_reason_id || effect.reason_id || effect.failure_reason || '').toLowerCase();
      if (effect.action_denial) {
        mechanics.action_denial_events += 1;
        if (/sleep|frozen|freeze|paralysis|flinch|confusion/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.status_action_denials += 1;
        if (/sleep/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.sleep_action_denials += 1;
        else if (/frozen|freeze/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.freeze_action_denials += 1;
        else if (/paralysis/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.paralysis_action_denials += 1;
        else if (/flinch/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.flinch_action_denials += 1;
        else if (/confusion/.test(actionDenialReasonId + ' ' + lowerKind)) mechanics.confusion_action_denials += 1;
      }
      if (effect.move_failed) {
        if (effect.move_failure_family === 'move_lock' || /taunt|imprison|throat[_-]?chop/.test(failureReasonId)) mechanics.move_lock_failures += 1;
        if (failureReasonId === 'taunt' || effect.blocker_kind === 'taunt') mechanics.taunt_move_blocks += 1;
        else if (failureReasonId === 'imprison' || effect.blocker_kind === 'imprison') mechanics.imprison_move_blocks += 1;
        else if (/throat[_-]?chop/.test(failureReasonId) || effect.blocker_kind === 'throat_chop') mechanics.throat_chop_sound_blocks += 1;
        if (/no[_-]?valid[_-]?target/.test(failureReasonId)) {
          mechanics.target_resolution_failures += 1;
          mechanics.no_valid_target_failures += 1;
        } else if (failureReasonId === 'accuracy_miss' || failureReasonId === 'accuracy-miss') {
          mechanics.accuracy_misses += 1;
        } else if (failureReasonId === 'protect_consecutive_fail' || failureReasonId === 'protect-consecutive-fail') {
          mechanics.protect_consecutive_failures += 1;
        }
      }
      if (effect.status_resolution || effect.status_exception) {
        mechanics.status_resolution_events += 1;
        if (lowerKind === 'frozen-thaw' || effect.thawed_this_turn) mechanics.frozen_thaws += 1;
        else if (lowerKind === 'sleep-wake' || effect.woke_this_turn) mechanics.sleep_wakes += 1;
        else if (lowerKind === 'sleep-exception' || effect.sleep_exception) mechanics.sleep_talk_exceptions += 1;
        else if (lowerKind === 'paralysis-speed-only' || effect.speed_only_status_effect) mechanics.paralysis_speed_only += 1;
        else if (lowerKind === 'confusion-pass-through' || effect.confusion_passed) mechanics.confusion_pass_through += 1;
      }
      if (effect.blocked_priority) {
        mechanics.blocked_priority_events += 1;
        var blockerKind = String(effect.blocker_kind || '').toLowerCase();
        if (failureReasonId === 'quick_guard_priority_block' || blockerKind === 'quick_guard') mechanics.quick_guard_priority_blocks += 1;
        else if (failureReasonId === 'psychic_terrain_priority_block' || blockerKind === 'psychic_terrain') mechanics.psychic_terrain_priority_blocks += 1;
        else if (failureReasonId === 'fake_out_timing') mechanics.fake_out_timing_failures += 1;
        else if (effect.priority_failure_family === 'ability' || /armor_tail|dazzling|queenly_majesty/.test(failureReasonId + ' ' + blockerKind)) mechanics.priority_ability_blocks += 1;
      }
      if (lowerKind === 'flinch-applied') mechanics.flinch_applied += 1;
      else if (lowerKind === 'flinch-skip') mechanics.flinch_skip += 1;
      else if (lowerKind === 'frozen-skip') mechanics.frozen_skip += 1;
      else if (lowerKind === 'sleep-skip') mechanics.sleep_skip += 1;
      else if (lowerKind === 'paralysis-skip') mechanics.paralysis_skip += 1;
      else if (lowerKind === 'confusion-self-hit') mechanics.confusion_self_hit += 1;
      if (csQaEffectKindMatches(kind, 'recoil')) mechanics.recoil += 1;
      if (csQaEffectKindMatches(kind, 'drain-heal')) mechanics.drain_heal += 1;
      if (csQaIsDirectRecoveryKind(kind)) mechanics.recovery += 1;
      if (csQaEffectKindMatches(kind, 'hp-cost')) mechanics.hp_cost += 1;
      if (csQaEffectKindMatches(kind, 'delayed-recovery')) mechanics.delayed_recovery += 1;
      if (csQaEffectKindMatches(kind, 'residual-drain')) mechanics.residual_drain += 1;
      if (csQaEffectKindMatches(kind, 'item-recovery')) mechanics.item_recovery += 1;
    }
  }

  var moveEffectLogicMatrix = csBuildMoveEffectLogicMatrix(mechanics, {
    scope: options.scope || 'single-turn-log',
    contact_move_audit_summary: contactMoveAuditSummary,
    faint_cause_summary: faintCauseSummary
  });

  return {
    schema_version: 'champions-qa-coverage-v1',
    generated_at: options.generated_at || new Date().toISOString(),
    scope: options.scope || 'single-turn-log',
    source: {
      build_id: options.build_id || ((typeof csGetBuildId === 'function') ? csGetBuildId() : null),
      source_url: options.source_url || ((typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null),
      format: options.format || null,
      player_team_id: options.player_team_id || null,
      opponent_team_id: options.opponent_team_id || null
    },
    source_truth_versions: csQaSourceTruthVersions(),
    totals: totals,
    mechanics_seen: mechanics,
    tactical_speed_summary: tacticalSpeedSummary,
    duration_effect_summary: durationEffectSummary,
    decision_opportunity_ledger: decisionLedger,
    faint_cause_summary: faintCauseSummary,
    contact_move_audit_summary: contactMoveAuditSummary,
    move_effect_logic_matrix: moveEffectLogicMatrix,
    coach_event_rows: coachEventRows,
    coach_event_summary: csSummarizeCoachEventRows(coachEventRows),
    coach_brain_summary: csBuildCoachBrainSummary(decisionLedger, {
      scope: options.scope || 'single-turn-log',
      player_team_id: options.player_team_id || null,
      opponent_team_id: options.opponent_team_id || null,
      format: options.format || null
    }),
    moves_seen: {
      damage: damageMoves,
      effects: effectMoves
    },
    effect_kinds: effectKinds,
    missing_targeted_proof: csQaMissingTargetedProof(mechanics),
    notes: [
      'This summary only proves mechanics that occurred in this exported evidence.',
      'Use targeted scenario logs for mechanics listed in missing_targeted_proof.'
    ]
  };
}

function csMergeQaCoverageSummaries(summaries, opts) {
  var options = opts || {};
  var valid = Array.isArray(summaries) ? summaries.filter(function(summary) {
    return summary && summary.schema_version === 'champions-qa-coverage-v1';
  }) : [];
  var merged = csBuildQaCoverageSummary([], Object.assign({}, options, {
    scope: options.scope || 'qa-artifact-retained-replay-cards'
  }));
  merged.totals.replay_cards_scanned = valid.length;
  var mergedCoachEventRows = [];
  var mergedFaintCauseSummary = csBuildFaintCauseSummary([]);
  var mergedContactAudit = csBuildContactMoveAuditSummary([]);

  for (var i = 0; i < valid.length; i++) {
    var summary = valid[i] || {};
    var totals = summary.totals || {};
    for (var key in totals) {
      if (!Object.prototype.hasOwnProperty.call(totals, key)) continue;
      merged.totals[key] = (merged.totals[key] || 0) + (Number.isFinite(Number(totals[key])) ? Number(totals[key]) : 0);
    }
    var mechanics = summary.mechanics_seen || {};
    for (var m in mechanics) {
      if (!Object.prototype.hasOwnProperty.call(mechanics, m)) continue;
      merged.mechanics_seen[m] = (merged.mechanics_seen[m] || 0) + (Number.isFinite(Number(mechanics[m])) ? Number(mechanics[m]) : 0);
    }
    var damageMoves = summary.moves_seen && summary.moves_seen.damage ? summary.moves_seen.damage : {};
    for (var d in damageMoves) {
      if (Object.prototype.hasOwnProperty.call(damageMoves, d)) csQaInc(merged.moves_seen.damage, d, damageMoves[d]);
    }
    var effectMoves = summary.moves_seen && summary.moves_seen.effects ? summary.moves_seen.effects : {};
    for (var e in effectMoves) {
      if (Object.prototype.hasOwnProperty.call(effectMoves, e)) csQaInc(merged.moves_seen.effects, e, effectMoves[e]);
    }
    var effectKinds = summary.effect_kinds || {};
    for (var k in effectKinds) {
      if (Object.prototype.hasOwnProperty.call(effectKinds, k)) csQaInc(merged.effect_kinds, k, effectKinds[k]);
    }
    var tactical = summary.tactical_speed_summary || {};
    var labelCounts = tactical.label_counts || {};
    merged.tactical_speed_summary = merged.tactical_speed_summary || csBuildTacticalSpeedSummary([], { scope: options.scope || 'qa-artifact-retained-replay-cards' });
    for (var tl in labelCounts) {
      if (!Object.prototype.hasOwnProperty.call(labelCounts, tl)) continue;
      csQaInc(merged.tactical_speed_summary.label_counts, tl, labelCounts[tl]);
      if (merged.tactical_speed_summary.labels.indexOf(tl) < 0) merged.tactical_speed_summary.labels.push(tl);
    }
    if (Array.isArray(tactical.events)) {
      merged.tactical_speed_summary.events = merged.tactical_speed_summary.events.concat(tactical.events.slice(0, 12));
    }
    if (Array.isArray(tactical.windows)) {
      merged.tactical_speed_summary.windows = merged.tactical_speed_summary.windows.concat(tactical.windows.slice(0, 12));
    }
    var duration = summary.duration_effect_summary || {};
    var durationCounts = duration.label_counts || {};
    merged.duration_effect_summary = merged.duration_effect_summary || csBuildDurationEffectSummary([], { scope: options.scope || 'qa-artifact-retained-replay-cards' });
    for (var dl in durationCounts) {
      if (!Object.prototype.hasOwnProperty.call(durationCounts, dl)) continue;
      csQaInc(merged.duration_effect_summary.label_counts, dl, durationCounts[dl]);
      if (merged.duration_effect_summary.labels.indexOf(dl) < 0) merged.duration_effect_summary.labels.push(dl);
    }
    if (Array.isArray(duration.events)) {
      merged.duration_effect_summary.events = merged.duration_effect_summary.events.concat(duration.events.slice(0, 12));
    }
    if (Array.isArray(summary.coach_event_rows)) {
      mergedCoachEventRows = mergedCoachEventRows.concat(summary.coach_event_rows.slice(0, 24));
    }
    var faintCause = summary.faint_cause_summary || {};
    mergedFaintCauseSummary.total_faints += Number(faintCause.total_faints || 0);
    mergedFaintCauseSummary.explained_faints += Number(faintCause.explained_faints || 0);
    mergedFaintCauseSummary.unexplained_faints += Number(faintCause.unexplained_faints || 0);
    mergedFaintCauseSummary.hp_drops += Number(faintCause.hp_drops || 0);
    mergedFaintCauseSummary.unexplained_hp_drops += Number(faintCause.unexplained_hp_drops || 0);
    if (Array.isArray(faintCause.faint_causes)) mergedFaintCauseSummary.faint_causes = mergedFaintCauseSummary.faint_causes.concat(faintCause.faint_causes.slice(0, 12));
    if (Array.isArray(faintCause.unexplained)) mergedFaintCauseSummary.unexplained = mergedFaintCauseSummary.unexplained.concat(faintCause.unexplained.slice(0, 12));
    var contactAudit = summary.contact_move_audit_summary || {};
    var contactTotals = contactAudit.totals || {};
    for (var ct in contactTotals) {
      if (Object.prototype.hasOwnProperty.call(contactTotals, ct)) {
        mergedContactAudit.totals[ct] = Number(mergedContactAudit.totals[ct] || 0) + Number(contactTotals[ct] || 0);
      }
    }
    var contactMoves = contactAudit.moves || {};
    for (var cm in contactMoves) {
      if (!Object.prototype.hasOwnProperty.call(contactMoves, cm)) continue;
      var existingContactMove = mergedContactAudit.moves[cm] || Object.assign({}, contactMoves[cm], { seen: 0, damaging_seen: 0 });
      existingContactMove.seen += Number(contactMoves[cm].seen || 0);
      existingContactMove.damaging_seen += Number(contactMoves[cm].damaging_seen || 0);
      mergedContactAudit.moves[cm] = existingContactMove;
    }
    if (Array.isArray(contactAudit.unknown_physical_moves)) {
      contactAudit.unknown_physical_moves.forEach(function(move) {
        if (mergedContactAudit.unknown_physical_moves.indexOf(move) < 0) mergedContactAudit.unknown_physical_moves.push(move);
      });
    }
    if (Array.isArray(contactAudit.contact_damage_events)) {
      mergedContactAudit.contact_damage_events = mergedContactAudit.contact_damage_events.concat(contactAudit.contact_damage_events.slice(0, 12));
    }
    var activeTurns = duration.active_turns || {};
    for (var at in activeTurns) {
      if (Object.prototype.hasOwnProperty.call(activeTurns, at)) csQaInc(merged.duration_effect_summary.active_turns, at, activeTurns[at]);
    }
  }

  merged.missing_targeted_proof = csQaMissingTargetedProof(merged.mechanics_seen);
  merged.decision_opportunity_ledger = csBuildDecisionOpportunityLedger(merged.tactical_speed_summary, { scope: options.scope || 'qa-artifact-retained-replay-cards' });
  merged.coach_event_rows = mergedCoachEventRows.slice(0, 240);
  merged.coach_event_summary = csSummarizeCoachEventRows(merged.coach_event_rows);
  merged.faint_cause_summary = Object.assign({}, mergedFaintCauseSummary, {
    faint_causes: mergedFaintCauseSummary.faint_causes.slice(0, 240),
    unexplained: mergedFaintCauseSummary.unexplained.slice(0, 240)
  });
  merged.contact_move_audit_summary = Object.assign({}, mergedContactAudit, {
    unknown_physical_moves: mergedContactAudit.unknown_physical_moves.slice(0, 50),
    contact_damage_events: mergedContactAudit.contact_damage_events.slice(0, 240)
  });
  merged.move_effect_logic_matrix = csBuildMoveEffectLogicMatrix(merged.mechanics_seen, {
    scope: options.scope || 'qa-artifact-retained-replay-cards',
    contact_move_audit_summary: merged.contact_move_audit_summary,
    faint_cause_summary: merged.faint_cause_summary
  });
  merged.coach_brain_summary = csBuildCoachBrainSummary(merged.decision_opportunity_ledger, {
    scope: options.scope || 'qa-artifact-retained-replay-cards',
    player_team_id: options.player_team_id || null,
    opponent_team_id: options.opponent_team_id || null,
    format: options.format || null
  });
  return merged;
}

function csQaProofMon(name, moves, extra) {
  return Object.assign({
    name: name,
    ability: '',
    item: '',
    nature: 'Calm',
    level: 50,
    moves: moves || ['Tackle'],
    evs: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }
  }, extra || {});
}

function csQaProofTeam(name, members) {
  return {
    name: name,
    format: 'champions',
    legality_status: 'legal',
    members: members || []
  };
}

function csRunTargetedQaProofBattle(config) {
  config = config || {};
  var seeds = config.seeds || [[1, 2, 3, 4], [100, 200, 300, 400], [10, 20, 30, 40], [123, 456, 789, 1011]];
  var selected = null;
  var selectedSummary = null;
  for (var i = 0; i < seeds.length; i++) {
    var result = simulateBattle(config.playerTeam, config.opponentTeam, {
      format: config.format || 'singles',
      seed: seeds[i],
      maxTurns: config.maxTurns || 2,
      playerBring: config.playerBring || null,
      opponentBring: config.opponentBring || null
    });
    var summary = csBuildQaCoverageSummary(result && result.turnLog, {
      scope: 'targeted-qa-sweep-' + (config.id || 'proof'),
      build_id: config.build_id || ((typeof csGetBuildId === 'function') ? csGetBuildId() : null),
      source_url: config.source_url || ((typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null),
      format: config.format || 'singles',
      player_team_id: config.playerTeamId || null,
      opponent_team_id: config.opponentTeamId || null
    });
    selected = result;
    selectedSummary = summary;
    if (!config.requireMechanic || Number(summary.mechanics_seen && summary.mechanics_seen[config.requireMechanic] || 0) > 0) break;
  }
  return {
    id: config.id || 'proof',
    label: config.label || config.id || 'Targeted QA proof',
    required_mechanic: config.requireMechanic || null,
    format: config.format || 'singles',
    seed: selected && selected.seed ? selected.seed : null,
    result: selected && selected.result ? selected.result : null,
    turns: selected && selected.turns ? selected.turns : 0,
    qa_coverage_summary: selectedSummary,
    turnLog: selected && Array.isArray(selected.turnLog) ? selected.turnLog : [],
    log: selected && Array.isArray(selected.log) ? selected.log : []
  };
}

function csBuildTargetedQaSweepEvidence(opts) {
  var options = opts || {};
  var buildId = options.build_id || ((typeof csGetBuildId === 'function') ? csGetBuildId() : null);
  var sourceUrl = options.source_url || ((typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null);
  var runs = [
    csRunTargetedQaProofBattle({
      id: 'screen_reduction_aurora_veil',
      label: 'Screen reduction proof: Aurora Veil',
      requireMechanic: 'screen_reduction',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_screen_player',
      opponentTeamId: 'targeted_qa_screen_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Screen Player', [
        csQaProofMon('Ninetales-Alola', ['Aurora Veil'], {
          ability: 'Snow Warning',
          nature: 'Timid',
          evs: { hp: 32, atk: 0, def: 0, spa: 2, spd: 0, spe: 32 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Screen Opponent', [
        csQaProofMon('Gardevoir', ['Moonblast'], {
          nature: 'Modest',
          evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 2, spe: 0 }
        })
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'hp_cost_clangorous_soul',
      label: 'HP-cost proof: Clangorous Soul',
      requireMechanic: 'hp_cost',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_hp_cost_player',
      opponentTeamId: 'targeted_qa_hp_cost_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA HP Cost Player', [
        csQaProofMon('Kommo-o', ['Clangorous Soul'], {
          ability: 'Overcoat',
          nature: 'Modest',
          evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 0, spe: 2 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA HP Cost Opponent', [
        csQaProofMon('Pelipper', ['Tackle'])
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'hp_cost_shed_tail',
      label: 'HP-cost proof: Shed Tail pivot',
      requireMechanic: 'hp_cost',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_shed_tail_player',
      opponentTeamId: 'targeted_qa_shed_tail_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Shed Tail Player', [
        csQaProofMon('Orthworm', ['Shed Tail'], {
          ability: 'Earth Eater',
          nature: 'Careful',
          evs: { hp: 32, atk: 1, def: 1, spa: 0, spd: 32, spe: 0 }
        }),
        csQaProofMon('Garchomp', ['Tackle'], {
          ability: 'Rough Skin',
          nature: 'Jolly',
          evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Shed Tail Opponent', [
        csQaProofMon('Pelipper', ['Tackle'])
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'delayed_recovery_wish',
      label: 'Delayed recovery proof: Wish',
      requireMechanic: 'delayed_recovery',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_wish_player',
      opponentTeamId: 'targeted_qa_wish_opponent',
      maxTurns: 2,
      playerTeam: csQaProofTeam('Targeted QA Wish Player', [
        csQaProofMon('Kangaskhan', ['Wish'], {
          ability: 'Scrappy',
          nature: 'Careful',
          evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Wish Opponent', [
        csQaProofMon('Jolteon', ['Tackle'], {
          nature: 'Timid',
          evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
        })
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'residual_drain_leech_seed',
      label: 'Residual drain proof: Leech Seed',
      requireMechanic: 'residual_drain',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_leech_seed_player',
      opponentTeamId: 'targeted_qa_leech_seed_opponent',
      maxTurns: 2,
      playerTeam: csQaProofTeam('Targeted QA Leech Seed Player', [
        csQaProofMon('Meganium', ['Leech Seed'], {
          ability: 'Overgrow',
          nature: 'Calm',
          evs: { hp: 32, atk: 0, def: 1, spa: 0, spd: 32, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Leech Seed Opponent', [
        csQaProofMon('Pelipper', ['Tackle'])
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'stat_source_foul_play',
      label: 'Stat-source proof: Foul Play target Attack',
      requireMechanic: 'foul_play_trace',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_foul_play_player',
      opponentTeamId: 'targeted_qa_foul_play_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Foul Play Player', [
        csQaProofMon('Sableye', ['Foul Play'], {
          ability: 'Prankster',
          item: 'Black Glasses',
          nature: 'Impish',
          evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Foul Play Opponent', [
        csQaProofMon('Garchomp', ['Tackle'], {
          ability: 'Rough Skin',
          nature: 'Adamant',
          evs: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 }
        })
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'stat_source_body_press',
      label: 'Stat-source proof: Body Press user Defense',
      requireMechanic: 'body_press_trace',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_body_press_player',
      opponentTeamId: 'targeted_qa_body_press_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Body Press Player', [
        csQaProofMon('Orthworm', ['Body Press'], {
          ability: 'Earth Eater',
          nature: 'Impish',
          evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Body Press Opponent', [
        csQaProofMon('Tyranitar', ['Tackle'], {
          ability: 'Sand Stream',
          nature: 'Careful',
          evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
        })
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'stat_source_psyshock',
      label: 'Stat-source proof: Psyshock targets Defense',
      requireMechanic: 'psyshock_trace',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_psyshock_player',
      opponentTeamId: 'targeted_qa_psyshock_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Psyshock Player', [
        csQaProofMon('Cresselia', ['Psyshock'], {
          ability: 'Levitate',
          nature: 'Modest',
          evs: { hp: 32, atk: 0, def: 0, spa: 32, spd: 2, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Psyshock Opponent', [
        csQaProofMon('Amoonguss', ['Tackle'], {
          ability: 'Regenerator',
          nature: 'Calm',
          evs: { hp: 32, atk: 0, def: 2, spa: 0, spd: 32, spe: 0 }
        })
      ])
    }),
    csRunTargetedQaProofBattle({
      id: 'stat_source_foul_play_power_ability_guard',
      label: 'Stat-source proof: Foul Play ignores target power ability',
      requireMechanic: 'ignored_target_power_ability_trace',
      build_id: buildId,
      source_url: sourceUrl,
      playerTeamId: 'targeted_qa_foul_play_power_guard_player',
      opponentTeamId: 'targeted_qa_foul_play_power_guard_opponent',
      maxTurns: 1,
      playerTeam: csQaProofTeam('Targeted QA Foul Play Power Guard Player', [
        csQaProofMon('Sableye', ['Foul Play'], {
          ability: 'Prankster',
          item: 'Black Glasses',
          nature: 'Impish',
          evs: { hp: 32, atk: 0, def: 32, spa: 0, spd: 2, spe: 0 }
        })
      ]),
      opponentTeam: csQaProofTeam('Targeted QA Foul Play Power Guard Opponent', [
        csQaProofMon('Medicham', ['Tackle'], {
          ability: 'Pure Power',
          nature: 'Adamant',
          evs: { hp: 32, atk: 32, def: 2, spa: 0, spd: 0, spe: 0 }
        })
      ])
    })
  ];
  var summary = csMergeQaCoverageSummaries(runs.map(function(run) {
    return run && run.qa_coverage_summary;
  }), {
    generated_at: options.generated_at || new Date().toISOString(),
    build_id: buildId,
    source_url: sourceUrl,
    format: 'targeted-sweep',
    player_team_id: 'targeted_qa_sweep',
    scope: 'targeted-qa-sweep'
  });
  summary.totals.targeted_sweep_runs = runs.length;
  var missingRequiredMechanics = runs.filter(function(run) {
    var key = run && run.required_mechanic;
    return key && !Number(run.qa_coverage_summary && run.qa_coverage_summary.mechanics_seen && run.qa_coverage_summary.mechanics_seen[key] || 0);
  }).map(function(run) {
    return run.required_mechanic;
  });
  return {
    schema_version: 'champions-targeted-qa-sweep-v1',
    generated_at: options.generated_at || new Date().toISOString(),
    build_id: buildId,
    source_url: sourceUrl,
    status: missingRequiredMechanics.length ? 'incomplete' : 'complete',
    missing_required_mechanics: missingRequiredMechanics,
    qa_coverage_summary: summary,
    runs: runs,
    notes: [
      'Normal battle simulation is greedy/sampled, not an exhaustive game-tree traversal.',
      'This targeted sweep deliberately forces known long-tail mechanics so QA artifacts can prove those branches occurred in browser evidence.'
    ]
  };
}

function csBranchMatrixMemberNames(team) {
  return team && Array.isArray(team.members) ? team.members.map(function(member) {
    return member && member.name;
  }).filter(Boolean) : [];
}

function csBranchMatrixOrderedLeadPairs(names, limit) {
  var out = [];
  var cap = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : names.length * Math.max(0, names.length - 1);
  for (var i = 0; i < names.length && out.length < cap; i++) {
    for (var j = 0; j < names.length && out.length < cap; j++) {
      if (i === j) continue;
      out.push([names[i], names[j]]);
    }
  }
  return out;
}

function csBranchMatrixLeadPairsForMode(team, mode, selectedNames, limit) {
  var names = csBranchMatrixMemberNames(team);
  var selected = Array.isArray(selectedNames) ? selectedNames.filter(function(name) {
    return names.indexOf(name) >= 0;
  }) : [];
  if (mode === 'selected' && selected.length >= 2) return [selected.slice(0, 2)];
  return csBranchMatrixOrderedLeadPairs(names, limit);
}

function csBranchMatrixBringFromLeadPair(names, pair) {
  var bring = (pair || []).filter(Boolean);
  names.forEach(function(name) {
    if (bring.length < 4 && bring.indexOf(name) < 0) bring.push(name);
  });
  return bring.slice(0, 4);
}

function csBranchMatrixMemberByName(team, name) {
  var members = team && Array.isArray(team.members) ? team.members : [];
  return members.find(function(member) { return member && member.name === name; }) || null;
}

function csBranchMatrixTargetsForMove(move) {
  var target = (typeof MOVE_TARGETS !== 'undefined' && MOVE_TARGETS && MOVE_TARGETS[move]) || 'normal';
  if (target === 'self' || target === 'all-allies') return [{ targetSide: 'self' }];
  if (target === 'all-adjacent' || target === 'all-adjacent-foes' || target === 'all-foes' || target === 'random-foe') {
    return [{ targetSide: 'enemy', targetSlot: 0 }];
  }
  if (target === 'ally' || target === 'adjacentAlly') return [{ targetSide: 'ally', targetSlot: 1 }];
  return [
    { targetSide: 'enemy', targetSlot: 0 },
    { targetSide: 'enemy', targetSlot: 1 }
  ];
}

function csBranchMatrixAlternatives(side, slot, mon, maxMovesPerMon, maxTargetsPerMove) {
  var moves = mon && Array.isArray(mon.moves) ? mon.moves.filter(Boolean).slice(0, maxMovesPerMon) : [];
  var out = [];
  moves.forEach(function(move) {
    csBranchMatrixTargetsForMove(move).slice(0, maxTargetsPerMove).forEach(function(target) {
      out.push(Object.assign({ turn: 1, side: side, slot: slot, move: move }, target));
    });
  });
  return out;
}

function csBuildBranchMatrixForcedActionSets(playerTeam, opponentTeam, playerBring, opponentBring, options) {
  options = options || {};
  var maxMovesPerMon = Number.isFinite(Number(options.maxMovesPerMon)) ? Math.max(1, Number(options.maxMovesPerMon)) : 2;
  var maxTargetsPerMove = Number.isFinite(Number(options.maxTargetsPerMove)) ? Math.max(1, Number(options.maxTargetsPerMove)) : 2;
  var actors = [
    { side: 'player', slot: 0, mon: csBranchMatrixMemberByName(playerTeam, playerBring[0]) },
    { side: 'player', slot: 1, mon: csBranchMatrixMemberByName(playerTeam, playerBring[1]) },
    { side: 'opponent', slot: 0, mon: csBranchMatrixMemberByName(opponentTeam, opponentBring[0]) },
    { side: 'opponent', slot: 1, mon: csBranchMatrixMemberByName(opponentTeam, opponentBring[1]) }
  ];
  var sets = [[]];
  actors.forEach(function(actor) {
    var alternatives = csBranchMatrixAlternatives(actor.side, actor.slot, actor.mon, maxMovesPerMon, maxTargetsPerMove);
    if (!alternatives.length) return;
    var next = [];
    sets.forEach(function(prefix) {
      alternatives.forEach(function(action) {
        next.push(prefix.concat([action]));
      });
    });
    sets = next;
  });
  return sets;
}

function csBranchMatrixStableActionKey(action) {
  return [
    action.side || '',
    action.slot,
    action.move || '',
    action.targetSide || '',
    Number.isFinite(Number(action.targetSlot)) ? Number(action.targetSlot) : ''
  ].join(':');
}

function csBranchMatrixRunKey(playerTeamId, opponentTeamId, playerBring, opponentBring, forcedActions, horizonTurns) {
  return [
    playerTeamId,
    opponentTeamId,
    'h' + (Number.isFinite(Number(horizonTurns)) ? Math.max(1, Number(horizonTurns)) : 1),
    (playerBring || []).slice(0, 2).join('+'),
    (opponentBring || []).slice(0, 2).join('+'),
    (forcedActions || []).map(csBranchMatrixStableActionKey).join('|')
  ].join('::');
}

function csBranchMatrixOutcomeSignature(battle, turnLog) {
  var last = Array.isArray(turnLog) && turnLog.length ? turnLog[turnLog.length - 1] : null;
  var playerAlive = last && last.summary ? last.summary.player_alive : null;
  var opponentAlive = last && last.summary ? last.summary.opponent_alive : null;
  return [
    battle && battle.result || 'unknown',
    battle && battle.turns || (Array.isArray(turnLog) ? turnLog.length : 0),
    playerAlive == null ? '' : playerAlive,
    opponentAlive == null ? '' : opponentAlive
  ].join(':');
}

function csBranchTacticalMoveTags(move) {
  var m = String(move || '');
  return {
    protect: ['Protect', 'Detect', 'Wide Guard', 'Quick Guard', 'Endure', 'King\'s Shield', 'Spiky Shield', 'Baneful Bunker', 'Obstruct'].indexOf(m) >= 0,
    switch_or_pivot: ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Shed Tail', 'Teleport', 'Baton Pass'].indexOf(m) >= 0,
    speed_control: ['Tailwind', 'Trick Room', 'Icy Wind', 'Thunder Wave', 'Rock Tomb', 'Electroweb'].indexOf(m) >= 0,
    redirection: ['Follow Me', 'Rage Powder', 'Ally Switch'].indexOf(m) >= 0,
    setup: ['Swords Dance', 'Dragon Dance', 'Calm Mind', 'Nasty Plot', 'Bulk Up', 'Clangorous Soul', 'Meteor Beam', 'Electro Shot'].indexOf(m) >= 0,
    recovery: ['Protect', 'Detect', 'Recover', 'Roost', 'Shore Up', 'Life Dew', 'Heal Pulse', 'Wish', 'Rest'].indexOf(m) >= 0
  };
}

function csSummarizeBranchTactics(turnLog, forcedActions, opts) {
  opts = opts || {};
  var rows = Array.isArray(turnLog) ? turnLog : [];
  var forced = Array.isArray(forcedActions) ? forcedActions : [];
  var summary = {
    schema_version: 'champions-branch-tactics-v1',
    horizon_turns: Number.isFinite(Number(opts.horizonTurns)) ? Math.max(1, Number(opts.horizonTurns)) : rows.length,
    turn_count: rows.length,
    first_ko_turn: null,
    early_position_delta: null,
    player: { protect_turns: [], pivot_turns: [], speed_control_turns: [], redirection_turns: [], setup_turns: [], forced_turn1_line: [] },
    opponent: { protect_turns: [], pivot_turns: [], speed_control_turns: [], redirection_turns: [], setup_turns: [], forced_turn1_line: [] },
    timing_tags: [],
    switch_events: [],
    protect_events: []
  };
  forced.filter(function(action) {
    return action && Number(action.turn || 1) === 1 && action.move;
  }).forEach(function(action) {
    var side = action.side === 'opponent' || action.side === 'opp' ? 'opponent' : 'player';
    summary[side].forced_turn1_line.push({
      slot: Number.isFinite(Number(action.slot)) ? Number(action.slot) : null,
      move: action.move,
      targetSide: action.targetSide || '',
      targetSlot: Number.isFinite(Number(action.targetSlot)) ? Number(action.targetSlot) : null
    });
  });
  rows.forEach(function(row) {
    var turn = Number(row && row.turn) || 0;
    var actionGroups = row && row.actions ? row.actions : {};
    ['player', 'opponent'].forEach(function(side) {
      var actions = Array.isArray(actionGroups[side]) ? actionGroups[side] : [];
      actions.forEach(function(action) {
        var tags = csBranchTacticalMoveTags(action && action.move);
        if (tags.protect) {
          summary[side].protect_turns.push(turn);
          summary.protect_events.push({ turn: turn, side: side, actor: action.actor || null, move: action.move || null });
        }
        if (tags.switch_or_pivot) summary[side].pivot_turns.push(turn);
        if (tags.speed_control) summary[side].speed_control_turns.push(turn);
        if (tags.redirection) summary[side].redirection_turns.push(turn);
        if (tags.setup) summary[side].setup_turns.push(turn);
      });
    });
    var events = Array.isArray(row && row.events) ? row.events : [];
    events.forEach(function(event) {
      var text = String(event && event.text || '');
      if (!summary.first_ko_turn && /fainted/i.test(text)) summary.first_ko_turn = turn || null;
      if (/pivoted out|switched out|switched in|was dragged out|Shed Tail|Baton Pass|Parting Shot/i.test(text)) {
        summary.switch_events.push({ turn: turn, text: text.slice(0, 180) });
      }
    });
  });
  var first = rows[0] || null;
  var last = rows.length ? rows[rows.length - 1] : null;
  if (first && first.pre && last && last.post &&
      typeof first.pre.position_score === 'number' && typeof last.post.position_score === 'number') {
    summary.early_position_delta = Math.round((last.post.position_score - first.pre.position_score) * 1000) / 1000;
  }
  ['player', 'opponent'].forEach(function(side) {
    if (summary[side].protect_turns.length) summary.timing_tags.push(side + '_protect_t' + summary[side].protect_turns[0]);
    if (summary[side].pivot_turns.length) summary.timing_tags.push(side + '_pivot_t' + summary[side].pivot_turns[0]);
    if (summary[side].speed_control_turns.length) summary.timing_tags.push(side + '_speed_control_t' + summary[side].speed_control_turns[0]);
    if (summary[side].redirection_turns.length) summary.timing_tags.push(side + '_redirection_t' + summary[side].redirection_turns[0]);
    if (summary[side].setup_turns.length) summary.timing_tags.push(side + '_setup_t' + summary[side].setup_turns[0]);
  });
  if (summary.first_ko_turn) summary.timing_tags.push('first_ko_t' + summary.first_ko_turn);
  if (typeof summary.early_position_delta === 'number') {
    if (summary.early_position_delta >= 0.2) summary.timing_tags.push('early_position_gain');
    else if (summary.early_position_delta <= -0.2) summary.timing_tags.push('early_position_loss');
    else summary.timing_tags.push('early_position_even');
  }
  summary.timing_tags = Array.from(new Set(summary.timing_tags));
  return summary;
}

async function csBuildForcedBranchMatrixSweepEvidence(opts) {
  var options = opts || {};
  var buildId = options.build_id || ((typeof csGetBuildId === 'function') ? csGetBuildId() : null);
  var sourceUrl = options.source_url || ((typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null);
  var playerTeamId = options.playerTeamId || 'targeted_proof_legal';
  var opponentTeamId = options.opponentTeamId || 'cofagrigus_tr';
  var playerTeam = (typeof TEAMS !== 'undefined' && TEAMS[playerTeamId]) ? TEAMS[playerTeamId] : null;
  var opponentTeam = (typeof TEAMS !== 'undefined' && TEAMS[opponentTeamId]) ? TEAMS[opponentTeamId] : null;
  var maxLeadPairsPerSide = Number.isFinite(Number(options.maxLeadPairsPerSide)) ? Math.max(1, Number(options.maxLeadPairsPerSide)) : 3;
  var maxRuns = normalizeBranchMaxRuns(options.maxRuns);
  var maxTurns = Number.isFinite(Number(options.maxTurns)) ? Math.max(1, Number(options.maxTurns)) : 3;
  var generatedAt = options.generated_at || new Date().toISOString();

  function empty(status, reason) {
    return {
      schema_version: 'champions-forced-branch-matrix-v1',
      generated_at: generatedAt,
      build_id: buildId,
      source_url: sourceUrl,
      status: status,
      reason: reason,
      runs: [],
      qa_coverage_summary: csMergeQaCoverageSummaries([], {
        generated_at: generatedAt,
        build_id: buildId,
        source_url: sourceUrl,
        format: 'forced-branch-matrix',
        player_team_id: playerTeamId,
        opponent_team_id: opponentTeamId,
        scope: 'forced-branch-matrix'
      })
    };
  }
  if (!playerTeam || !opponentTeam || typeof simulateBattle !== 'function') {
    return empty('unavailable', 'Required runtime teams or simulateBattle were not available.');
  }

  var playerNames = csBranchMatrixMemberNames(playerTeam);
  var opponentNames = csBranchMatrixMemberNames(opponentTeam);
  var playerLeadMode = options.playerLeadMode === 'selected' ? 'selected' : 'random';
  var opponentLeadMode = options.opponentLeadMode === 'selected' ? 'selected' : 'random';
  var playerLeadPairs = csBranchMatrixLeadPairsForMode(playerTeam, playerLeadMode, options.playerLeadNames, maxLeadPairsPerSide);
  var opponentLeadPairs = csBranchMatrixLeadPairsForMode(opponentTeam, opponentLeadMode, options.opponentLeadNames, maxLeadPairsPerSide);
  if (!playerLeadPairs.length || !opponentLeadPairs.length) return empty('empty', 'No legal lead pairs were available for the requested branch matrix.');

  var seenKeys = {};
  (Array.isArray(options.seenBranchKeys) ? options.seenBranchKeys : []).forEach(function(key) {
    if (key) seenKeys[key] = true;
  });
  var candidates = [];
  var seenCandidateKeys = Object.create(null);
  var runs = [];
  var lastPaintAt = 0;
  playerLeadPairs.forEach(function(playerPair) {
    opponentLeadPairs.forEach(function(opponentPair) {
      var playerBring = csBranchMatrixBringFromLeadPair(playerNames, playerPair);
      var opponentBring = csBranchMatrixBringFromLeadPair(opponentNames, opponentPair);
      var forcedSets = csBuildBranchMatrixForcedActionSets(playerTeam, opponentTeam, playerBring, opponentBring, options);
      forcedSets.forEach(function(forcedActions) {
        var branchKey = csBranchMatrixRunKey(playerTeamId, opponentTeamId, playerBring, opponentBring, forcedActions, maxTurns);
        if (seenCandidateKeys[branchKey]) return;
        seenCandidateKeys[branchKey] = true;
        candidates.push({
          branch_key: branchKey,
          seen_before: !!seenKeys[branchKey],
          player_bring: playerBring,
          opponent_bring: opponentBring,
          forced_actions: forcedActions
        });
      });
    });
  });
  candidates.sort(function(a, b) {
    if (a.seen_before !== b.seen_before) return a.seen_before ? 1 : -1;
    return a.branch_key.localeCompare(b.branch_key);
  });
  var maxPlannedRuns = resolveBranchRunLimit(candidates.length, maxRuns);
  for (var i = 0; i < maxPlannedRuns; i++) {
    var candidate = candidates[i];
    var seedBase = i + 1;
    var battle = simulateBattle(playerTeam, opponentTeam, {
      format: 'doubles',
      seed: [seedBase, seedBase + 101, seedBase + 202, seedBase + 303],
      maxTurns: maxTurns,
      playerBring: candidate.player_bring,
      opponentBring: candidate.opponent_bring,
      forcedActions: candidate.forced_actions
    });
    var turnLog = Array.isArray(battle && battle.turnLog) ? battle.turnLog : [];
    var tacticalSummary = csSummarizeBranchTactics(turnLog, candidate.forced_actions, { horizonTurns: maxTurns });
    runs.push({
      id: 'branch_matrix_' + runs.length,
      branch_key: candidate.branch_key,
      outcome_signature: csBranchMatrixOutcomeSignature(battle, turnLog),
      seen_before: candidate.seen_before,
      player_team_id: playerTeamId,
      opponent_team_id: opponentTeamId,
      player_bring: candidate.player_bring,
      opponent_bring: candidate.opponent_bring,
      forced_actions: candidate.forced_actions,
      tactical_summary: tacticalSummary,
      result: battle && battle.result || null,
      turns: battle && battle.turns || turnLog.length,
      qa_coverage_summary: csBuildQaCoverageSummary(turnLog, {
        generated_at: generatedAt,
        build_id: buildId,
        source_url: sourceUrl,
        format: 'forced-branch-matrix',
        player_team_id: playerTeamId,
        opponent_team_id: opponentTeamId,
        scope: 'forced-branch-matrix-run'
      }),
      turnLog: turnLog
    });
    if (typeof options.onProgress === 'function') {
      var paintNow = (i + 1 === maxPlannedRuns) || (i + 1) % 5 === 0;
      var now = Date.now();
      if (!paintNow && lastPaintAt && (now - lastPaintAt) >= 150) paintNow = true;
      if (paintNow) {
        lastPaintAt = now;
        options.onProgress({
          executed_runs: i + 1,
          total_planned_runs: maxPlannedRuns,
          unseen_candidate_runs: maxPlannedRuns
        });
        var paintWait = csYieldForProgressPaint();
        if (paintWait) await paintWait;
      }
    }
  }

  var summary = csMergeQaCoverageSummaries(runs.map(function(run) {
    return run && run.qa_coverage_summary;
  }), {
    generated_at: generatedAt,
    build_id: buildId,
    source_url: sourceUrl,
    format: 'forced-branch-matrix',
    player_team_id: playerTeamId,
    opponent_team_id: opponentTeamId,
    scope: 'forced-branch-matrix'
  });
  var candidateRuns = candidates.length;
  var unseenCandidates = candidates.filter(function(candidate) { return !candidate.seen_before; }).length;
  var newlyExecuted = runs.filter(function(run) { return !run.seen_before; }).length;
  summary.totals.branch_matrix_candidate_runs = candidateRuns;
  summary.totals.branch_matrix_runs = runs.length;
  summary.totals.branch_matrix_unseen_candidates = unseenCandidates;
  summary.totals.branch_matrix_newly_executed = newlyExecuted;
  return {
    schema_version: 'champions-forced-branch-matrix-v1',
    generated_at: generatedAt,
    build_id: buildId,
    source_url: sourceUrl,
    status: runs.length ? 'complete' : 'empty',
    player_team_id: playerTeamId,
    opponent_team_id: opponentTeamId,
    lead_policy: {
      player: playerLeadMode,
      opponent: opponentLeadMode,
      selected_player_leads: playerLeadMode === 'selected' ? playerLeadPairs[0] : [],
      selected_opponent_leads: opponentLeadMode === 'selected' ? opponentLeadPairs[0] : []
    },
    coverage_space: {
      player_lead_pairs_considered: playerLeadPairs.length,
      opponent_lead_pairs_considered: opponentLeadPairs.length,
      candidate_runs: candidateRuns,
      unseen_candidate_runs: unseenCandidates,
      executed_runs: runs.length,
      newly_executed_runs: newlyExecuted,
      capped: runs.length < candidateRuns,
      max_runs: maxPlannedRuns,
      max_turns: maxTurns
    },
    qa_coverage_summary: summary,
    runs: runs,
    notes: [
      'Selected lead mode locks the lead pair. Random lead mode rotates through ordered legal lead combinations.',
      'Each branch run calls the real simulateBattle engine with legal brings and forced legal turn-1 choices.',
      'The sweep is capped by default for browser safety; candidate_runs reports the enumerated space before the cap.'
    ]
  };
}

function csBranchMoveResultScore(result) {
  if (result === 'win') return 1;
  if (result === 'draw') return 0.5;
  return 0;
}

function csBranchMoveRate(wins, total) {
  return total > 0 ? wins / total : 0;
}

function csBranchMovePct(value) {
  return Math.round(value * 1000) / 10;
}

function csBranchMoveSortedValues(map) {
  return Object.keys(map || {}).map(function(key) { return map[key]; });
}

function csBranchMoveActionLabel(action) {
  var target = action.targetSide ? String(action.targetSide) : '';
  if (target && Number.isFinite(Number(action.targetSlot))) target += ':' + Number(action.targetSlot);
  return [action.actor || ('slot' + action.slot), action.move || 'Unknown', target].filter(Boolean).join(' -> ');
}

function csBranchMoveRowWeight(row) {
  var n = Number(row && row.run_count);
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.floor(n)) : 1;
}

function csBranchMoveNormalizeRow(row) {
  if (!row || !Array.isArray(row.forced_actions)) return null;
  var playerLeads = Array.isArray(row.player_leads) ? row.player_leads
    : Array.isArray(row.player_bring) ? row.player_bring.slice(0, 2) : [];
  var opponentLeads = Array.isArray(row.opponent_leads) ? row.opponent_leads
    : Array.isArray(row.opponent_bring) ? row.opponent_bring.slice(0, 2) : [];
  var playerActions = row.forced_actions.filter(function(action) {
    return action && action.side === 'player' && action.move;
  }).map(function(action) {
    var slot = Number.isFinite(Number(action.slot)) ? Number(action.slot) : 0;
    return {
      side: 'player',
      slot: slot,
      actor: playerLeads[slot] || ('slot' + slot),
      move: action.move,
      targetSide: action.targetSide || '',
      targetSlot: Number.isFinite(Number(action.targetSlot)) ? Number(action.targetSlot) : null
    };
  });
  if (!playerActions.length) return null;
  playerActions.sort(function(a, b) {
    if (a.slot !== b.slot) return a.slot - b.slot;
    return String(a.move).localeCompare(String(b.move));
  });
  return {
    branch_key: row.branch_key || null,
    player_team_id: row.player_team_id || null,
    opponent_team_id: row.opponent_team_id || null,
    player_leads: playerLeads.slice(0, 2),
    opponent_leads: opponentLeads.slice(0, 2),
    result: row.result || null,
    turns: row.turns || 0,
    run_count: csBranchMoveRowWeight(row),
    player_actions: playerActions,
    tactical_summary: row.tactical_summary && typeof row.tactical_summary === 'object' ? row.tactical_summary : null
  };
}

function csBranchMoveBucketAdd(bucket, row) {
  var weight = row.run_count || 1;
  bucket.samples += weight;
  bucket.weighted_score += csBranchMoveResultScore(row.result) * weight;
  if (row.result === 'win') bucket.wins += weight;
  else if (row.result === 'loss') bucket.losses += weight;
  else if (row.result === 'draw') bucket.draws += weight;
}

function csBranchTacticalBucketAdd(bucket, row) {
  csBranchMoveBucketAdd(bucket, row);
  var ts = row && row.tactical_summary ? row.tactical_summary : {};
  if (typeof ts.early_position_delta === 'number') {
    bucket.position_delta_total += ts.early_position_delta * (row.run_count || 1);
  }
  if (ts.first_ko_turn) bucket.first_ko_turn_total += Number(ts.first_ko_turn) * (row.run_count || 1);
}

function csBranchMoveConfidence(samples, minStrongSamples) {
  return samples >= minStrongSamples ? 'strong' : 'early_signal';
}

function csAnalyzeBranchCoverageRows(rows, opts) {
  var options = opts || {};
  var minStrongSamples = Number.isFinite(Number(options.minStrongSamples)) ? Math.max(1, Number(options.minStrongSamples)) : 8;
  var avoidWinRate = Number.isFinite(Number(options.avoidWinRate)) ? Math.max(0, Math.min(1, Number(options.avoidWinRate))) : 0.35;
  var limit = Number.isFinite(Number(options.limit)) ? Math.max(1, Number(options.limit)) : 12;
  var normalized = (Array.isArray(rows) ? rows : []).map(csBranchMoveNormalizeRow).filter(Boolean);
  var byLine = {};
  var byMove = {};
  var byContextActorMove = {};
  var byTactic = {};
  var seen = {};

  normalized.forEach(function(row) {
    if (row.branch_key && seen[row.branch_key]) return;
    if (row.branch_key) seen[row.branch_key] = true;
    var matchupKey = [row.player_team_id || 'player', row.opponent_team_id || 'opponent'].join('::');
    var leadKey = [row.player_leads.join('+'), row.opponent_leads.join('+')].join(' vs ');
    var contextKey = [matchupKey, leadKey].join('::');
    var lineKey = row.player_actions.map(csBranchMoveActionLabel).join(' | ');
    var fullLineKey = [contextKey, lineKey].join('::');
    if (!byLine[fullLineKey]) {
      byLine[fullLineKey] = {
        matchup_key: matchupKey,
        player_team_id: row.player_team_id,
        opponent_team_id: row.opponent_team_id,
        player_leads: row.player_leads,
        opponent_leads: row.opponent_leads,
        context_key: contextKey,
        line_key: lineKey,
        samples: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        weighted_score: 0
      };
    }
    csBranchMoveBucketAdd(byLine[fullLineKey], row);

    var tacticTags = row.tactical_summary && Array.isArray(row.tactical_summary.timing_tags)
      ? row.tactical_summary.timing_tags
      : [];
    tacticTags.forEach(function(tag) {
      var tacticKey = [contextKey, tag].join('::');
      if (!byTactic[tacticKey]) {
        byTactic[tacticKey] = {
          context_key: contextKey,
          matchup_key: matchupKey,
          player_team_id: row.player_team_id,
          opponent_team_id: row.opponent_team_id,
          player_leads: row.player_leads,
          opponent_leads: row.opponent_leads,
          tactic_tag: tag,
          samples: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          weighted_score: 0,
          position_delta_total: 0,
          first_ko_turn_total: 0
        };
      }
      csBranchTacticalBucketAdd(byTactic[tacticKey], row);
    });

    row.player_actions.forEach(function(action) {
      var moveKey = [matchupKey, action.actor, action.move].join('::');
      if (!byMove[moveKey]) {
        byMove[moveKey] = {
          matchup_key: matchupKey,
          player_team_id: row.player_team_id,
          opponent_team_id: row.opponent_team_id,
          actor: action.actor,
          move: action.move,
          samples: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          weighted_score: 0
        };
      }
      csBranchMoveBucketAdd(byMove[moveKey], row);

      var actorContextKey = [contextKey, action.actor, action.move].join('::');
      if (!byContextActorMove[actorContextKey]) {
        byContextActorMove[actorContextKey] = {
          context_key: contextKey,
          matchup_key: matchupKey,
          player_team_id: row.player_team_id,
          opponent_team_id: row.opponent_team_id,
          player_leads: row.player_leads,
          opponent_leads: row.opponent_leads,
          actor: action.actor,
          move: action.move,
          samples: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          weighted_score: 0
        };
      }
      csBranchMoveBucketAdd(byContextActorMove[actorContextKey], row);
    });
  });

  var lineRankings = csBranchMoveSortedValues(byLine).map(function(line) {
    line.win_rate = csBranchMoveRate(line.weighted_score, line.samples);
    line.win_rate_pct = csBranchMovePct(line.win_rate);
    line.confidence = csBranchMoveConfidence(line.samples, minStrongSamples);
    return line;
  }).sort(function(a, b) {
    if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
    return b.samples - a.samples;
  }).slice(0, limit);

  var avoidMoves = csBranchMoveSortedValues(byMove).map(function(move) {
    move.win_rate = csBranchMoveRate(move.weighted_score, move.samples);
    move.win_rate_pct = csBranchMovePct(move.win_rate);
    move.confidence = csBranchMoveConfidence(move.samples, minStrongSamples);
    move.reason = move.confidence === 'strong'
      ? 'Low weighted win rate across repeated branch runs.'
      : 'Early low-result signal; run more branches before replacing this move.';
    return move;
  }).filter(function(move) {
    return move.samples > 0 && move.win_rate <= avoidWinRate;
  }).sort(function(a, b) {
    if (a.confidence !== b.confidence) return a.confidence === 'strong' ? -1 : 1;
    if (a.win_rate !== b.win_rate) return a.win_rate - b.win_rate;
    return b.samples - a.samples;
  }).slice(0, limit);

  var contextMoves = {};
  csBranchMoveSortedValues(byContextActorMove).forEach(function(move) {
    move.win_rate = csBranchMoveRate(move.weighted_score, move.samples);
    move.win_rate_pct = csBranchMovePct(move.win_rate);
    move.confidence = csBranchMoveConfidence(move.samples, minStrongSamples);
    var key = [move.context_key, move.actor].join('::');
    if (!contextMoves[key]) contextMoves[key] = [];
    contextMoves[key].push(move);
  });

  var replacementCandidates = [];
  Object.keys(contextMoves).forEach(function(key) {
    var moves = contextMoves[key].slice().sort(function(a, b) {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      return b.samples - a.samples;
    });
    var best = moves[0];
    moves.forEach(function(move) {
      if (!best || move.move === best.move) return;
      if (move.win_rate > avoidWinRate && move.confidence !== 'strong') return;
      var lift = best.win_rate - move.win_rate;
      if (lift < 0.2) return;
      replacementCandidates.push({
        player_team_id: move.player_team_id,
        opponent_team_id: move.opponent_team_id,
        player_leads: move.player_leads,
        opponent_leads: move.opponent_leads,
        actor: move.actor,
        avoid_move: move.move,
        better_legal_move_seen: best.move,
        avoid_samples: move.samples,
        better_samples: best.samples,
        avoid_win_rate_pct: move.win_rate_pct,
        better_win_rate_pct: best.win_rate_pct,
        lift_pct: csBranchMovePct(lift),
        confidence: (move.confidence === 'strong' && best.confidence === 'strong') ? 'strong' : 'early_signal',
        note: 'Replacement is limited to legal moves already observed on this set in the same lead/matchup context.'
      });
    });
  });
  replacementCandidates.sort(function(a, b) {
    if (a.confidence !== b.confidence) return a.confidence === 'strong' ? -1 : 1;
    if (b.lift_pct !== a.lift_pct) return b.lift_pct - a.lift_pct;
    return b.avoid_samples - a.avoid_samples;
  });

  var betterLines = [];
  var linesByContext = {};
  csBranchMoveSortedValues(byLine).forEach(function(line) {
    line.win_rate = csBranchMoveRate(line.weighted_score, line.samples);
    line.win_rate_pct = csBranchMovePct(line.win_rate);
    line.confidence = csBranchMoveConfidence(line.samples, minStrongSamples);
    if (!linesByContext[line.context_key]) linesByContext[line.context_key] = [];
    linesByContext[line.context_key].push(line);
  });
  Object.keys(linesByContext).forEach(function(contextKey) {
    var lines = linesByContext[contextKey].slice().sort(function(a, b) {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      return b.samples - a.samples;
    });
    var best = lines[0];
    if (!best) return;
    lines.slice(1).forEach(function(line) {
      var lift = best.win_rate - line.win_rate;
      if (lift < 0.2) return;
      betterLines.push({
        player_team_id: line.player_team_id,
        opponent_team_id: line.opponent_team_id,
        player_leads: line.player_leads,
        opponent_leads: line.opponent_leads,
        avoid_line: line.line_key,
        suggested_line: best.line_key,
        avoid_samples: line.samples,
        suggested_samples: best.samples,
        avoid_win_rate_pct: line.win_rate_pct,
        suggested_win_rate_pct: best.win_rate_pct,
        lift_pct: csBranchMovePct(lift),
        confidence: (line.confidence === 'strong' && best.confidence === 'strong') ? 'strong' : 'early_signal'
      });
    });
  });
  betterLines.sort(function(a, b) {
    if (a.confidence !== b.confidence) return a.confidence === 'strong' ? -1 : 1;
    if (b.lift_pct !== a.lift_pct) return b.lift_pct - a.lift_pct;
    return b.suggested_samples - a.suggested_samples;
  });

  var tacticalSignals = csBranchMoveSortedValues(byTactic).map(function(tactic) {
    tactic.win_rate = csBranchMoveRate(tactic.weighted_score, tactic.samples);
    tactic.win_rate_pct = csBranchMovePct(tactic.win_rate);
    tactic.confidence = csBranchMoveConfidence(tactic.samples, minStrongSamples);
    tactic.avg_position_delta = tactic.samples > 0 ? Math.round((tactic.position_delta_total / tactic.samples) * 1000) / 1000 : 0;
    tactic.avg_first_ko_turn = tactic.first_ko_turn_total > 0 && tactic.samples > 0 ? Math.round((tactic.first_ko_turn_total / tactic.samples) * 10) / 10 : null;
    tactic.coach_note = tactic.win_rate <= avoidWinRate
      ? 'Avoid or re-time this tactical pattern in the listed lead context.'
      : tactic.win_rate >= 0.6
        ? 'This tactical pattern is winning enough to rehearse in the listed lead context.'
        : 'Mixed result; keep sampling before making it a rule.';
    return tactic;
  }).filter(function(tactic) {
    return tactic.samples > 0 && (tactic.win_rate <= avoidWinRate || tactic.win_rate >= 0.6 || Math.abs(tactic.avg_position_delta) >= 0.2);
  }).sort(function(a, b) {
    if (a.confidence !== b.confidence) return a.confidence === 'strong' ? -1 : 1;
    if (a.win_rate !== b.win_rate) return a.win_rate - b.win_rate;
    return b.samples - a.samples;
  }).slice(0, limit);

  var totalWeight = normalized.reduce(function(sum, row) { return sum + (row.run_count || 1); }, 0);
  var strongAvoids = avoidMoves.filter(function(m) { return m.confidence === 'strong'; }).length;
  var strongTactics = tacticalSignals.filter(function(t) { return t.confidence === 'strong'; }).length;
  var analysis = {
    schema_version: 'champions-branch-tactical-analysis-v2',
    generated_at: new Date().toISOString(),
    thresholds: {
      min_strong_samples: minStrongSamples,
      avoid_win_rate_pct: csBranchMovePct(avoidWinRate),
      note: 'Early signals are useful for QA targeting, but only strong rows should drive meta replacement calls.'
    },
    totals: {
      rows_read: Array.isArray(rows) ? rows.length : 0,
      unique_rows_analyzed: normalized.length,
      weighted_samples: totalWeight,
      line_contexts: Object.keys(byLine).length,
      move_contexts: Object.keys(byMove).length,
      tactical_contexts: Object.keys(byTactic).length,
      strong_avoid_moves: strongAvoids,
      early_avoid_moves: avoidMoves.length - strongAvoids,
      replacement_candidates: replacementCandidates.length,
      suggested_line_swaps: betterLines.length,
      tactical_signals: tacticalSignals.length,
      strong_tactical_signals: strongTactics
    },
    overview: [
      'This is QA/meta analysis on saved branch coverage rows; it does not alter battle mechanics.',
      'Highest priority is to keep running branch matrix exports until the same matchup has repeated samples per move, target, lead, and early tactical timing context.',
      'Use strong avoid/replacement rows for meta decisions; use early_signal rows to choose the next stress tests.'
    ],
    trainer_report: [],
    avoid_moves: avoidMoves,
    move_replacement_candidates: replacementCandidates.slice(0, limit),
    suggested_lines: betterLines.slice(0, limit),
    tactical_signals: tacticalSignals,
    best_lines_overall: lineRankings
  };
  analysis.trainer_report = csBranchMoveTrainerSummary(analysis);
  return analysis;
}

function csBranchMoveTrainerSummary(analysis) {
  if (!analysis) return [];
  var lines = [];
  var strongAvoids = (analysis.avoid_moves || []).filter(function(row) { return row.confidence === 'strong'; });
  var earlyAvoids = (analysis.avoid_moves || []).filter(function(row) { return row.confidence !== 'strong'; });
  var strongSwaps = (analysis.move_replacement_candidates || []).filter(function(row) { return row.confidence === 'strong'; });
  var strongTactics = (analysis.tactical_signals || []).filter(function(row) { return row.confidence === 'strong'; });
  lines.push(strongAvoids.length
    ? 'Strong avoid signals found: ' + strongAvoids.length + '. Stop autopiloting those clicks in the listed lead and matchup context.'
    : 'No strong avoid signal yet. Keep collecting lead pair and opposing lead samples before cutting a move from the game plan.');
  lines.push(strongSwaps.length
    ? 'Strong legal swap signals found: ' + strongSwaps.length + '. Prefer those moves when the same lead pair and opposing lead show up.'
    : 'No strong legal swap signal yet. Early signals are for stress testing, not final meta calls.');
  lines.push(strongTactics.length
    ? 'Strong tactical timing signals found: ' + strongTactics.length + '. Review Protect, pivot, speed-control, first-KO, and early-position tags before locking your game plan.'
    : 'No strong tactical timing signal yet. Keep sampling Protect timing, pivots, speed control, first-KO timing, and early board position.');
  if (earlyAvoids.length) lines.push('Early avoid signals: ' + earlyAvoids.length + '. Re-run that matchup branch until it becomes a real read or disappears.');
  return lines;
}

var CS_BRANCH_STRATEGY_MEMORY_KEY = 'champions_branch_strategy_memory_v1';
var CS_BRANCH_STRATEGY_MEMORY_LIMIT = 12;
var CS_COACH_BRAIN_MEMORY_KEY = 'champions_coach_brain_memory_v1';
var CS_COACH_BRAIN_MEMORY_LIMIT = 12;

function csLoadBranchStrategyMemory() {
  try {
    var raw = localStorage && localStorage.getItem(CS_BRANCH_STRATEGY_MEMORY_KEY);
    var parsed = raw ? JSON.parse(raw) : null;
    return parsed && Array.isArray(parsed.analyses) ? parsed : { schema_version: 1, analyses: [] };
  } catch (_e) {
    return { schema_version: 1, analyses: [] };
  }
}

function csSaveBranchStrategyMemory(memory) {
  try {
    if (!localStorage) return false;
    localStorage.setItem(CS_BRANCH_STRATEGY_MEMORY_KEY, JSON.stringify(memory));
    return true;
  } catch (_e) {
    return false;
  }
}

function csRememberBranchMoveAnalysis(analysis, opts) {
  if (!analysis || !analysis.totals || !analysis.totals.weighted_samples) return null;
  opts = opts || {};
  var memory = csLoadBranchStrategyMemory();
  var keyParts = [];
  var firstLine = (analysis.best_lines_overall || [])[0] || (analysis.avoid_moves || [])[0] || (analysis.move_replacement_candidates || [])[0] || null;
  keyParts.push(opts.player_team_id || firstLine && firstLine.player_team_id || 'player');
  keyParts.push(opts.opponent_team_id || firstLine && firstLine.opponent_team_id || 'opponent');
  var customSignature = opts.player_team_signature || null;
  var memoryKey = [keyParts[0], keyParts[1], customSignature || 'static'].join('::');
  var entry = {
    saved_at: new Date().toISOString(),
    memory_key: memoryKey,
    player_team_id: keyParts[0],
    opponent_team_id: keyParts[1],
    player_team_signature: customSignature,
    custom_team: !!customSignature,
    build_id: (typeof csGetBuildId === 'function') ? csGetBuildId() : null,
    totals: analysis.totals,
    trainer_report: analysis.trainer_report || [],
    avoid_moves: (analysis.avoid_moves || []).slice(0, 8),
    move_replacement_candidates: (analysis.move_replacement_candidates || []).slice(0, 8),
    suggested_lines: (analysis.suggested_lines || []).slice(0, 8),
    tactical_signals: (analysis.tactical_signals || []).slice(0, 8),
    best_lines_overall: (analysis.best_lines_overall || []).slice(0, 8)
  };
  memory.analyses = (memory.analyses || []).filter(function(item) {
    return item && item.memory_key !== entry.memory_key;
  });
  memory.analyses.unshift(entry);
  memory.analyses = memory.analyses.slice(0, CS_BRANCH_STRATEGY_MEMORY_LIMIT);
  memory.updated_at = entry.saved_at;
  csSaveBranchStrategyMemory(memory);
  ChampionsSim.state.lastBranchStrategyMemory = memory;
  return memory;
}

function csLatestBranchMoveAnalysisForTeam(teamKey) {
  var memory = (ChampionsSim && ChampionsSim.state && ChampionsSim.state.lastBranchStrategyMemory) || csLoadBranchStrategyMemory();
  var analyses = Array.isArray(memory && memory.analyses) ? memory.analyses : [];
  if (!teamKey) return analyses[0] || null;
  var sig = null;
  try {
    if (typeof TEAMS !== 'undefined' && TEAMS[teamKey] && typeof teamSignature === 'function') sig = teamSignature(TEAMS[teamKey]);
  } catch (_e) {}
  var live = ChampionsSim && ChampionsSim.state && ChampionsSim.state.lastBranchMoveAnalysis;
  if (live) {
    var liveLine = (live.best_lines_overall || [])[0] || (live.avoid_moves || [])[0] || (live.move_replacement_candidates || [])[0] || null;
    if (!teamKey || (liveLine && liveLine.player_team_id === teamKey)) return live;
  }
  return analyses.find(function(entry) {
    return entry && entry.player_team_id === teamKey && (!entry.player_team_signature || entry.player_team_signature === sig);
  }) || analyses.find(function(entry) { return entry && entry.player_team_id === teamKey; }) || analyses[0] || null;
}

function csLoadCoachBrainMemory() {
  try {
    var raw = localStorage && localStorage.getItem(CS_COACH_BRAIN_MEMORY_KEY);
    var parsed = raw ? JSON.parse(raw) : null;
    return parsed && Array.isArray(parsed.summaries) ? parsed : { schema_version: 1, summaries: [] };
  } catch (_e) {
    return { schema_version: 1, summaries: [] };
  }
}

function csSaveCoachBrainMemory(memory) {
  try {
    if (!localStorage) return false;
    localStorage.setItem(CS_COACH_BRAIN_MEMORY_KEY, JSON.stringify(memory));
    return true;
  } catch (_e) {
    return false;
  }
}

function csRememberCoachBrainSummary(summary, opts) {
  if (!summary || !summary.tactical_interpretation) return null;
  opts = opts || {};
  var playerKey = opts.player_team_id || 'player';
  var customSignature = opts.player_team_signature || null;
  var memoryKey = [playerKey, customSignature || 'static', opts.format || 'format', 'coach-brain'].join('::');
  var entry = {
    saved_at: new Date().toISOString(),
    memory_key: memoryKey,
    player_team_id: playerKey,
    player_team_signature: customSignature,
    custom_team: !!customSignature,
    format: opts.format || null,
    build_id: (typeof csGetBuildId === 'function') ? csGetBuildId() : null,
    confidence: summary.confidence || null,
    primary_issue: summary.primary_issue || null,
    observed_pattern: summary.observed_pattern || null,
    root_problem: summary.root_problem || null,
    risk_if_unchanged: summary.risk_if_unchanged || null,
    recommended_solution: summary.recommended_solution || null,
    expected_result_if_fixed: summary.expected_result_if_fixed || null,
    practice_drill: summary.practice_drill || null,
    tactical_interpretation: summary.tactical_interpretation,
    sample: summary.sample || null,
    boundary: summary.boundary || null
  };
  var memory = csLoadCoachBrainMemory();
  memory.summaries = (memory.summaries || []).filter(function(item) {
    return item && item.memory_key !== entry.memory_key;
  });
  memory.summaries.unshift(entry);
  memory.summaries = memory.summaries.slice(0, CS_COACH_BRAIN_MEMORY_LIMIT);
  memory.updated_at = entry.saved_at;
  csSaveCoachBrainMemory(memory);
  ChampionsSim.state.lastCoachBrainMemory = memory;
  return memory;
}

function csLatestCoachBrainForTeam(teamKey) {
  var memory = (ChampionsSim && ChampionsSim.state && ChampionsSim.state.lastCoachBrainMemory) || csLoadCoachBrainMemory();
  var summaries = Array.isArray(memory && memory.summaries) ? memory.summaries : [];
  if (!teamKey) return summaries[0] || null;
  var sig = null;
  try {
    if (typeof TEAMS !== 'undefined' && TEAMS[teamKey] && typeof teamSignature === 'function') sig = teamSignature(TEAMS[teamKey]);
  } catch (_e) {}
  return summaries.find(function(entry) {
    return entry && entry.player_team_id === teamKey && (!entry.player_team_signature || entry.player_team_signature === sig);
  }) || summaries.find(function(entry) { return entry && entry.player_team_id === teamKey; }) || null;
}

function downloadReplayTurnLog(replay, opts) {
  if (!replay || !Array.isArray(replay.turnLog)) return;
  opts = opts || {};
  var playerKey = opts.playerKey || replay.playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player');
  var oppKey = opts.oppKey || replay.oppKey || null;
  var playerTeam = csTurnLogTeamSnapshot(playerKey);
  var opponentTeam = csTurnLogTeamSnapshot(oppKey);
  var exportedAt = new Date().toISOString();
  var buildId = (typeof csGetBuildId === 'function') ? csGetBuildId() : null;
  var sourceUrl = (typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null;
  var format = replay.format || (typeof currentFormat !== 'undefined' ? currentFormat : null);
  var payload = {
    schema_version: 'champions-turn-log-v2',
    exported_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    seed: replay.seed || null,
    result: replay.result || null,
    format: format,
    player_team_id: playerKey || null,
    opponent_team_id: oppKey || null,
    player_team: playerTeam,
    opponent_team: opponentTeam,
    team_preview: {
      player_full_count: playerTeam && Array.isArray(playerTeam.members) ? playerTeam.members.length : null,
      opponent_full_count: opponentTeam && Array.isArray(opponentTeam.members) ? opponentTeam.members.length : null,
      player_brought_count: csTurnLogBroughtSnapshot(replay.turnLog, 'player').length,
      opponent_brought_count: csTurnLogBroughtSnapshot(replay.turnLog, 'opponent').length,
      player_brought: csTurnLogBroughtSnapshot(replay.turnLog, 'player'),
      opponent_brought: csTurnLogBroughtSnapshot(replay.turnLog, 'opponent')
    },
    winCondition: replay.winCondition || null,
    turning_point: replay.turning_point || null,
    position_path: replay.position_path || [],
    tactical_speed_summary: csBuildTacticalSpeedSummary(replay.turnLog, { scope: 'downloaded-turn-log' }),
    duration_effect_summary: csBuildDurationEffectSummary(replay.turnLog, { scope: 'downloaded-turn-log' }),
    decision_opportunity_ledger: csBuildDecisionOpportunityLedger(csBuildTacticalSpeedSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), { scope: 'downloaded-turn-log' }),
    faint_cause_summary: csBuildFaintCauseSummary(replay.turnLog),
    contact_move_audit_summary: csBuildContactMoveAuditSummary(replay.turnLog),
    coach_event_rows: csBuildCoachEventRows(csBuildTacticalSpeedSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), csBuildDurationEffectSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), {
      scope: 'downloaded-turn-log',
      player_team_id: playerKey || null,
      opponent_team_id: oppKey || null,
      format: format,
      maxRows: 120
    }),
    coach_event_summary: csSummarizeCoachEventRows(csBuildCoachEventRows(csBuildTacticalSpeedSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), csBuildDurationEffectSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), {
      scope: 'downloaded-turn-log',
      player_team_id: playerKey || null,
      opponent_team_id: oppKey || null,
      format: format,
      maxRows: 120
    })),
    coach_brain_summary: csBuildCoachBrainSummary(csBuildDecisionOpportunityLedger(csBuildTacticalSpeedSummary(replay.turnLog, { scope: 'downloaded-turn-log' }), { scope: 'downloaded-turn-log' }), {
      scope: 'downloaded-turn-log',
      player_team_id: playerKey || null,
      opponent_team_id: oppKey || null,
      format: format
    }),
    qa_coverage_summary: csBuildQaCoverageSummary(replay.turnLog, {
      generated_at: exportedAt,
      build_id: buildId,
      source_url: sourceUrl,
      format: format,
      player_team_id: playerKey || null,
      opponent_team_id: oppKey || null
    }),
    turnLog: replay.turnLog
  };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'champions-turn-log-' + (replay.seed || Date.now()) + '.json';
  a.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 0);
}

function csBuildReplayCoachingSummary(replay, opts) {
  opts = opts || {};
  var fallback = {
    issue_category: 'not enough evidence',
    evidence_label: 'not enough evidence',
    next_action: 'Run another replay with structured turn log so the Replay Log can show a clearer decision review.',
    detail: 'This replay does not expose enough structured evidence to label the miss confidently.'
  };
  if (!replay || typeof replay !== 'object') return fallback;

  var rows = Array.isArray(replay.turnLog) ? replay.turnLog : [];
  if (rows.length) {
    var audit = csBuildDecisionAudit(rows, {
      playerKey: opts.playerKey || replay.playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player'),
      oppKey: opts.oppKey || replay.oppKey || null,
      teamLookup: opts.teamLookup,
      oppLookup: opts.oppLookup
    });
    if (audit && audit.total_flags && Array.isArray(audit.flagged_turns) && audit.flagged_turns.length) {
      var flag = audit.flagged_turns[0];
      return {
        issue_category: 'execution',
        evidence_label: 'replay + turn log',
        next_action: 'Review T' + flag.turn + ': compare ' + flag.chosen_move + ' against ' + flag.best_move + '.',
        detail: 'The replay shows a clearer line on the turning turn, so the next review target is execution rather than team theory.'
      };
    }
  }

  return fallback;
}

function csRenderReplayCoachingSummary(summary) {
  if (!summary) return '';
  var issue = summary.issue_category || 'not enough evidence';
  var issueClass = issue.replace(/\s+/g, '-');
  return '<div class="replay-coach-summary replay-coach-' + _escapeHtml(issueClass) + '">' +
    '<div class="replay-coach-title">Coaching Summary</div>' +
    (summary.detail ? '<div class="replay-coach-detail">' + _escapeHtml(summary.detail) + '</div>' : '') +
    '<div class="replay-coach-row"><span class="replay-coach-label">Issue</span><strong>' + _escapeHtml(issue) + '</strong></div>' +
    '<div class="replay-coach-row"><span class="replay-coach-label">Evidence</span><span>' + _escapeHtml(summary.evidence_label || 'not enough evidence') + '</span></div>' +
    '<div class="replay-coach-row"><span class="replay-coach-label">Next action</span><span>' + _escapeHtml(summary.next_action || '') + '</span></div>' +
  '</div>';
}

function csReplayCoachSeverityClass(severity) {
  var key = String(severity || '').toLowerCase();
  if (key === 'high' || key === 'critical') return 'high';
  if (key === 'low' || key === 'good') return 'low';
  return 'medium';
}

function csReplayCoachJoin(list, fallback) {
  if (!Array.isArray(list) || !list.length) return fallback || 'Unknown';
  return list.join(' + ');
}

function csReplayCoachHpClass(row) {
  var status = String((row && row.status) || '').toLowerCase();
  var hp = row && row.hp;
  if (status === 'fainted' || hp === 0) return 'fainted';
  if (status === 'bench') return 'bench';
  return 'active';
}

function csRenderReplayRosterMon(row, compact) {
  row = row || {};
  var status = String(row.status || 'bench').toLowerCase();
  var hp = row.hp == null ? null : Math.max(0, Math.min(100, Number(row.hp) || 0));
  var hpLabel = row.hpLabel || (hp == null ? 'unknown' : hp + '%');
  var hpClass = csReplayCoachHpClass(row);
  var moves = (row.moves || []).join(', ');
  var species = row.species || row.displayName || 'unknown';
  var spriteUrl = (typeof getSpriteUrl === 'function') ? getSpriteUrl(species) : '';
  var legality = (row.moveLegality || []).filter(function(item) {
    return item && item.move && item.move !== 'unknown';
  }).map(function(item) {
    var cls = item.legal ? 'low' : (item.reason === 'source_unavailable' || item.reason === 'unknown_species' ? 'medium' : 'high');
    return '<span class="replay-coach-tag ' + cls + '">' + _escapeHtml(item.move || 'unknown') + ': ' + _escapeHtml(item.legal ? 'legal' : (item.reason || 'unchecked')) + '</span>';
  }).join('');
  var warnings = (row.parserWarnings || []).map(function(w) {
    return '<span class="replay-coach-tag medium">' + _escapeHtml(w) + '</span>';
  }).join('');
  return '<div class="replay-roster-mon ' + _escapeHtml(status) + '">' +
    '<div class="replay-roster-mon-shell">' +
      (spriteUrl
        ? '<img class="replay-roster-sprite" src="' + _escapeHtml(spriteUrl) + '" alt="' + _escapeHtml((row.displayName || species) + ' sprite') + '" loading="lazy" ' + csSpriteFallbackAttrs(species) + '/>'
        : '<div class="replay-roster-sprite replay-mon-sprite-fallback" aria-hidden="true"></div>') +
      '<div class="replay-roster-mon-body">' +
        '<div class="replay-roster-mon-head">' +
          '<strong>' + _escapeHtml(row.displayName || row.species || 'unknown') + '</strong>' +
          '<span class="replay-roster-status ' + _escapeHtml(hpClass) + '">' + _escapeHtml(status || 'bench') + '</span>' +
        '</div>' +
        csRenderReplayEffectTags(row) +
        '<div class="replay-hp-track ' + _escapeHtml(hpClass) + '"><span style="width:' + _escapeHtml(String(hp == null ? 0 : hp)) + '%"></span></div>' +
        '<div class="replay-roster-meta"><b>HP:</b> ' + _escapeHtml(hpLabel) + (row.faintTurn ? ' · <b>Fainted:</b> Turn ' + _escapeHtml(String(row.faintTurn)) : '') + '</div>' +
        '<div class="replay-roster-meta"><b>Species/form:</b> ' + _escapeHtml(row.species || 'unknown') + ' · <b>Gender:</b> ' + _escapeHtml(row.gender || 'unknown') + ' · <b>Level:</b> ' + _escapeHtml(String(row.level || 'unknown')) + '</div>' +
        (compact ? '' : '<div class="replay-roster-meta"><b>Item:</b> ' + _escapeHtml(row.item || 'unknown') + ' · <b>Ability:</b> ' + _escapeHtml(row.ability || 'unknown') + '</div>') +
        (compact ? '' : '<div class="replay-roster-meta"><b>Base stats:</b> ' + _escapeHtml(row.baseStatsLabel || 'unknown') + ' · <b>Calculated L50:</b> ' + _escapeHtml(row.calculatedStats || 'unknown') + '</div>') +
        (compact ? '' : '<div class="replay-roster-meta"><b>Known moves:</b> ' + _escapeHtml(moves || 'unknown') + '</div>') +
        (legality && !compact ? '<div class="replay-coach-tags">' + legality + '</div>' : '') +
        (warnings && !compact ? '<div class="replay-coach-tags">' + warnings + '</div>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

function csRenderReplayRosterRows(roster, compact) {
  var rows = Array.isArray(roster) ? roster : [];
  if (!rows.length) return '<div class="replay-coach-list-row"><strong>No roster state found</strong>Replay data did not expose this side.</div>';
  return rows.map(function(row) { return csRenderReplayRosterMon(row, compact); }).join('');
}

function csRenderReplayTurnRoster(rosterState, selectedSide) {
  if (!rosterState) return '';
  var selected = selectedSide || 'p1';
  var other = selected === 'p1' ? 'p2' : 'p1';
  return csRenderReplayStadium({
    left: rosterState[selected] || [],
    right: rosterState[other] || []
  }, 'After this turn', {
    left: 'Your team after this turn',
    right: 'Their team after this turn'
  });
}

function csRenderReplayTurn0(turn0, selectedSide) {
  if (!turn0 || !turn0.sides) return '';
  var order = [selectedSide || 'p1', (selectedSide || 'p1') === 'p1' ? 'p2' : 'p1'];
  var sideHtml = order.map(function(side) {
    var row = turn0.sides[side] || {};
    var sideLabel = side === (selectedSide || 'p1') ? 'Your team' : 'Their team';
    var roster = csRenderReplayRosterRows(row.roster || [], false);
    return '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">' + _escapeHtml(sideLabel + ' — ' + (row.player || side) + ' · Turn 0') + '</h3>' +
      '<div class="replay-coach-metric"><strong>Team preview</strong><span>' + _escapeHtml(csReplayCoachJoin(row.teamPreview, 'Unknown')) + '</span></div>' +
      '<div class="replay-roster-grid">' + roster + '</div>' +
    '</div>';
  }).join('');
  var parserWarnings = (turn0.parserWarnings || []).map(function(w) {
    return '<span class="replay-coach-tag medium">' + _escapeHtml(w) + '</span>';
  }).join('');
  return '<div class="replay-coach-card replay-turn0-card">' +
    '<div class="replay-coach-card-head"><h3 class="replay-coach-h3">Turn 0 — Starting State</h3><span class="replay-coach-tag low">audit snapshot</span></div>' +
    '<p class="replay-coach-turn-read">Starting snapshot before Turn 1. Unknown fields stay unknown; this does not change battle simulation results.</p>' +
    (parserWarnings ? '<div class="replay-coach-tags">' + parserWarnings + '</div>' : '') +
    '<div class="replay-coach-turn0-grid">' + sideHtml + '</div>' +
  '</div>';
}

function csReplayCoachRenderAnalysis(analysis) {
  var host = document.getElementById('replay-coach-results');
  if (!host || !analysis) return;
  var parsed = analysis.parsed || {};
  var review = analysis.review || {};
  var summary = review.summary || {};
  var learning = review.learningReport || null;
  var evidenceStandard = learning && learning.evidenceStandard ? learning.evidenceStandard : null;
  var simComparison = learning && learning.simComparison ? learning.simComparison : null;
  var simFeedback = learning && learning.simFeedback ? learning.simFeedback : null;
  var rawPreview = review.rawLogPreview || {};
  var turn0 = parsed.turn0 || null;
  var bringConfidence = summary.selectedFourConfidence || {};
  var rosterEvidenceLabel = bringConfidence.fullRosterKnown
    ? 'Full six shown'
    : (bringConfidence.selectedFourKnown ? 'Visible four only' : 'Partial replay only');
  var bringScopeLabel = bringConfidence.bringChoiceReviewable
    ? 'Bring choice reviewable'
    : 'Bring-choice limited';
  var warnings = (review.warnings || []).map(function(w) {
    return '<span class="replay-coach-tag medium">' + _escapeHtml(w) + '</span>';
  }).join('');
  var tags = (review.coachingTags || []).map(function(tag) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(tag.tag || 'Coaching Note') + ' · ' + _escapeHtml(tag.severity || 'medium') + '</strong>' +
      '<div><b>What happened:</b> ' + _escapeHtml(tag.whatHappened || tag.message || 'The replay showed a coaching-relevant event.') + '</div>' +
      '<div><b>Why it mattered:</b> ' + _escapeHtml(tag.whyMattered || 'This can change tempo, board position, or the path to your win condition.') + '</div>' +
      '<div><b>Do instead:</b> ' + _escapeHtml(tag.doInstead || tag.recommendation || 'Review this turn in context.') + '</div>' +
      '<small>' + (tag.evidence ? 'Evidence: ' + _escapeHtml(tag.evidence) + ' · ' : '') + 'Confidence: ' + _escapeHtml(tag.confidence || 'medium') + (tag.turn ? ' · Turn ' + _escapeHtml(String(tag.turn)) : '') + '</small>' +
      '</div>';
  }).join('');
  var turns = (review.turnTimeline || []).slice(0, 80).map(function(turn) {
    var events = (turn.events || []).slice(0, 8).map(function(ev) { return _escapeHtml(ev); }).filter(Boolean);
    var tags = (turn.tags || []).map(function(tag) {
      return '<span class="replay-coach-tag medium">' + _escapeHtml(tag) + '</span>';
    }).join('');
    var rosterState = csRenderReplayTurnRoster(turn.rosterState, parsed.selectedSide || 'p1');
    return '<div class="replay-coach-turn ' + _escapeHtml(csReplayCoachSeverityClass(turn.severity)) + '">' +
      '<div class="replay-coach-turn-title"><span>Turn ' + _escapeHtml(String(turn.turn)) + '</span><span class="replay-coach-tag ' + _escapeHtml(csReplayCoachSeverityClass(turn.severity)) + '">' + _escapeHtml(turn.severity || 'neutral') + ' · ' + _escapeHtml(turn.confidence || 'medium') + '</span></div>' +
      '<div class="replay-coach-turn-read"><strong>' + _escapeHtml(turn.stateShift || 'Neutral exchange') + '</strong>' + _escapeHtml(turn.coachingRead || '') + '</div>' +
      rosterState +
      (turn.betterLine ? '<div class="replay-coach-better-line">' + _escapeHtml(turn.betterLine) + '</div>' : '') +
      (tags ? '<div class="replay-coach-tags">' + tags + '</div>' : '') +
      '<details class="replay-coach-events"><summary>' + _escapeHtml(String(turn.rawEventCount || events.length)) + ' parsed events</summary><div class="replay-coach-turn-body">' + (events.length ? events.join('<br/>') : 'No parsed coaching events.') + '</div></details>' +
      '</div>';
  }).join('');
  var rawLines = (rawPreview.lines || []).slice(-80).map(function(line) {
    return _escapeHtml(line);
  }).join('\n');
  var criticalCards = learning && learning.criticalTurns ? (learning.criticalTurns.turns || []).map(function(card) {
    return '<div class="replay-coach-list-row" id="' + _escapeHtml(card.timelineAnchor || '') + '-critical">' +
      '<strong>' + _escapeHtml(card.kind || 'Critical turn') + ' · Turn ' + _escapeHtml(String(card.turn || '?')) + '</strong>' +
      '<div><b>What happened:</b> ' + _escapeHtml(card.whatHappened || '') + '</div>' +
      '<div><b>Why it mattered:</b> ' + _escapeHtml(card.whyItMattered || '') + '</div>' +
      '<div><b>Better line:</b> ' + _escapeHtml(card.betterAlternative || '') + '</div>' +
      '<small>' + _escapeHtml(card.category || 'Decision') + ' · Confidence: ' + _escapeHtml(card.confidence || 'medium') + '</small>' +
      '</div>';
  }).join('') : '';
  var scoreCards = learning && learning.scorecard ? (learning.scorecard.cards || []).map(function(card) {
    return '<div class="replay-coach-metric"><strong>' + _escapeHtml(card.label || 'Skill') + '</strong><span>' + _escapeHtml((card.grade || '?') + ' · ' + String(card.score || 0)) + '</span></div>';
  }).join('') : '';
  var decisionRows = learning ? (learning.decisionQuality || []).slice(0, 5).map(function(row) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(row.category || 'Decision') + ' · ' + _escapeHtml(row.matrixQuadrant || 'decision review') + '</strong>' +
      '<div><b>Decision quality:</b> ' + _escapeHtml(String(row.decisionQualityScore || '?')) + '/10 · <b>Risk:</b> ' + _escapeHtml(row.riskLevel || 'medium') + '</div>' +
      '<div><b>Alternative:</b> ' + _escapeHtml(row.alternativeLine || '') + '</div>' +
      '<small>Confidence: ' + _escapeHtml(row.confidence || 'medium') + (row.turn ? ' · Turn ' + _escapeHtml(String(row.turn)) : '') + '</small>' +
      '</div>';
  }).join('') : '';
  var drillRows = learning && learning.practicePlan ? (learning.practicePlan.drills || []).map(function(drill) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(drill.skill || 'Practice drill') + '</strong>' +
      '<div><b>Why:</b> ' + _escapeHtml(drill.whyItMatters || '') + '</div>' +
      '<div><b>Drill:</b> ' + _escapeHtml(drill.drillSetup || '') + '</div>' +
      '<div><b>Success:</b> ' + _escapeHtml(drill.successCriteria || '') + '</div>' +
      '<small>' + _escapeHtml(drill.promptBeforeEachTurn || '') + '</small>' +
      '</div>';
  }).join('') : '';
  var premium = learning && learning.premiumTeasers ? learning.premiumTeasers : null;
  var premiumRows = premium ? (premium.lockedInsights || []).map(function(item) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(item.label || 'Premium insight') + '</strong>' +
      _escapeHtml(item.preview || '') +
      '</div>';
  }).join('') : '';
  var battleIq = learning && learning.battleIq ? learning.battleIq : null;
  var battleIqRaised = battleIq ? (battleIq.raisedBy || []).map(function(row) {
    return '<div><b>' + _escapeHtml(row.area || 'Raised by') + ':</b> ' + _escapeHtml(row.text || '') + '</div>';
  }).join('') : '';
  var battleIqLowered = battleIq ? (battleIq.loweredBy || []).map(function(row) {
    return '<div><b>' + _escapeHtml(row.area || 'Lowered by') + ':</b> ' + _escapeHtml(row.text || '') + '</div>';
  }).join('') : '';
  var battleIqSubPreview = battleIq ? (battleIq.subScores || []).slice(0, 4).map(function(row) {
    return '<div class="replay-coach-metric"><strong>' + _escapeHtml(row.label || 'Sub-score') + '</strong><span>' + _escapeHtml(String(row.standardScore || 0)) + ' · raw ' + _escapeHtml(String(row.rawScore || 0)) + '</span></div>';
  }).join('') : '';
  var coachingReadouts = learning && learning.coachingReadouts ? learning.coachingReadouts : null;
  var leadLogic = learning && learning.leadLogic ? learning.leadLogic : null;
  var leadSignals = leadLogic ? (leadLogic.synergySignals || []).map(function(row) {
    return '<div class="replay-coach-list-row"><strong>Observed synergy</strong>' + _escapeHtml(row || '') + '</div>';
  }).join('') : '';
  var leadPros = leadLogic ? (leadLogic.pros || []).map(function(row) {
    return '<div class="replay-coach-list-row"><strong>Why this lead made sense</strong>' + _escapeHtml(row || '') + '</div>';
  }).join('') : '';
  var leadCons = leadLogic ? (leadLogic.cons || []).map(function(row) {
    return '<div class="replay-coach-list-row"><strong>What it still conceded</strong>' + _escapeHtml(row || '') + '</div>';
  }).join('') : '';
  var strengthsRows = coachingReadouts ? (coachingReadouts.strengths || []).map(function(row) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(row.label || 'What you did well') + '</strong>' +
      '<div><b>Supported by log:</b> ' + _escapeHtml(row.evidence || '') + '</div>' +
      '<small>Confidence: ' + _escapeHtml(row.confidence || 'medium') + ' · Tradeoff: ' + _escapeHtml(row.tradeoff || '') + '</small>' +
      '</div>';
  }).join('') : '';
  var advancedRows = coachingReadouts ? (coachingReadouts.advancedPlays || []).map(function(row) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(row.label || 'Advanced play recognized') + '</strong>' +
      '<div><b>Observed:</b> ' + _escapeHtml(row.evidence || '') + '</div>' +
      '<small>Confidence: ' + _escapeHtml(row.confidence || 'medium') + ' · Limit: ' + _escapeHtml(row.limitation || '') + '</small>' +
      '</div>';
  }).join('') : '';
  var tightenRows = coachingReadouts ? (coachingReadouts.tightenUp || []).map(function(row) {
    return '<div class="replay-coach-list-row">' +
      '<strong>' + _escapeHtml(row.label || 'Tighten up next') + '</strong>' +
      '<div><b>Why:</b> ' + _escapeHtml(row.evidence || '') + '</div>' +
      '<div><b>Next rep:</b> ' + _escapeHtml(row.nextStep || '') + '</div>' +
      '<small>Confidence: ' + _escapeHtml(row.confidence || 'medium') + '</small>' +
      '</div>';
  }).join('') : '';

  host.innerHTML =
    '<div class="replay-coach-summary-card">' +
      '<div class="replay-coach-card-head"><span class="badge badge-blue">MATCH SUMMARY</span><span class="replay-coach-tag ' + _escapeHtml(summary.result === 'win' ? 'low' : summary.result === 'loss' ? 'high' : 'medium') + '">' + _escapeHtml((summary.result || 'unknown').toUpperCase()) + '</span></div>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Players</strong><span>' + _escapeHtml((summary.yourPlayer || 'You') + ' vs ' + (summary.opponentPlayer || 'Opponent')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Turns</strong><span>' + _escapeHtml(String(summary.turns || 0)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Your Lead</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.yourLead)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Opp Lead</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.opponentLead)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Your Four</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.yourFour, 'Inferred from revealed actions')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Bring Confidence</strong><span>' + _escapeHtml((bringConfidence.label || 'Unknown') + ' · ' + (bringConfidence.level || 'low')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Critical Turn</strong><span>' + _escapeHtml(summary.criticalTurn ? 'Turn ' + summary.criticalTurn : 'Unknown') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Main Issue</strong><span>' + _escapeHtml(summary.mainIssue || 'No major issue detected') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(summary.confidence || 'medium') + '</span></div>' +
      '</div>' +
      '<div class="replay-coach-tags">' + (warnings || '<span class="replay-coach-tag low">Parsed locally. No raw log saved.</span>') + '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Team Preview Read</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Your Preview</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.yourPreview, 'Missing')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Opponent Preview</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.opponentPreview, 'Missing')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Opponent Four</strong><span>' + _escapeHtml(csReplayCoachJoin(summary.opponentFour, 'Inferred from revealed actions')) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Roster Evidence</strong><span>' + _escapeHtml(rosterEvidenceLabel + ' · ' + String(bringConfidence.previewCount || 0) + ' preview / ' + String(bringConfidence.selectedCount || 0) + ' visible') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Bring Scope</strong><span>' + _escapeHtml(bringScopeLabel) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Bring Read</strong><span>' + _escapeHtml(bringConfidence.reason || 'Bring data is unknown from this log.') + '</span></div>' +
        (bringConfidence.limitation ? '<div class="replay-coach-metric"><strong>Limit</strong><span>' + _escapeHtml(bringConfidence.limitation) + '</span></div>' : '') +
      '</div>' +
    '</div>' +
    csRenderReplayTurn0(turn0, parsed.selectedSide || 'p1') +
    (leadLogic ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Lead Logic Read</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Lead identity</strong><span>' + _escapeHtml(leadLogic.label || 'Unknown opener') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Your lead</strong><span>' + _escapeHtml((leadLogic.yourLead || []).join(' + ') || 'Unknown') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Opp lead</strong><span>' + _escapeHtml((leadLogic.opponentLead || []).join(' + ') || 'Unknown') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(leadLogic.confidence || 'medium') + '</span></div>' +
      '</div>' +
      '<div class="replay-coach-list">' +
        (leadSignals || '<div class="replay-coach-list-row"><strong>Observed synergy</strong>Turn-one synergy was not clear enough to grade beyond the board state.</div>') +
        (leadPros || '<div class="replay-coach-list-row"><strong>Why this lead made sense</strong>Use a lead that pressures the shown opposing mode while still keeping a backup line if the first interrupt fails.</div>') +
        (leadCons || '<div class="replay-coach-list-row"><strong>What it still conceded</strong>Check whether the pair still has play if the opponent gets their support or speed plan through.</div>') +
      '</div>' +
      '<small>' + _escapeHtml(leadLogic.limitation || '') + '</small>' +
    '</div>' : '') +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Coaching Tags</h3>' +
      '<div class="replay-coach-list">' + (tags || '<div class="replay-coach-list-row"><strong>No major issue detected</strong>Upload more complete logs to build stronger coaching confidence.</div>') + '</div>' +
    '</div>' +
    (evidenceStandard ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Evidence Standard</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Evidence</strong><span>' + _escapeHtml(evidenceStandard.label || 'Needs more data') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(evidenceStandard.confidence || 'low') + '</span></div>' +
      '</div>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>Rule</strong>' + _escapeHtml(evidenceStandard.priority || '') + '<small>' + _escapeHtml(evidenceStandard.rule || '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Opponent intent boundary</strong>' + _escapeHtml(evidenceStandard.opponentIntentRule || '') + '</div>' +
      '</div>' +
    '</div>' : '') +
    (coachingReadouts ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">What You Did Well</h3>' +
      '<div class="replay-coach-list">' + (strengthsRows || '<div class="replay-coach-list-row"><strong>No positive signal proven yet</strong>Use a fuller replay log before treating a line as repeatable.</div>') + '</div>' +
      '<small>' + _escapeHtml(coachingReadouts.note || '') + '</small>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Advanced Plays Recognized</h3>' +
      '<div class="replay-coach-list">' + (advancedRows || '<div class="replay-coach-list-row"><strong>No advanced pattern proven yet</strong>This log may still be useful, but the parser did not find a strong advanced setup or support line.</div>') + '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Tighten Up Next</h3>' +
      '<div class="replay-coach-list">' + (tightenRows || '<div class="replay-coach-list-row"><strong>No tighten-up item proven yet</strong>Collect more complete turns before naming a concrete adjustment.</div>') + '</div>' +
    '</div>' : '') +
    (learning ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Battle IQ Score</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Battle IQ</strong><span>' + _escapeHtml(battleIq && battleIq.displayScore != null ? String(battleIq.displayScore) : 'Needs more data') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Band</strong><span>' + _escapeHtml(battleIq ? battleIq.band : 'Unknown') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(battleIq ? battleIq.confidence : 'low') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Status</strong><span>' + _escapeHtml(battleIq ? battleIq.status : 'Provisional') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Percentile</strong><span>' + _escapeHtml(battleIq && battleIq.percentile != null ? String(battleIq.percentile) + 'th provisional' : 'Needs more data') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Range</strong><span>' + _escapeHtml(battleIq && battleIq.confidenceInterval && battleIq.confidenceInterval.length ? battleIq.confidenceInterval.join('-') : 'Needs more data') + '</span></div>' +
        battleIqSubPreview +
      '</div>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>What this means</strong>' + _escapeHtml(battleIq ? battleIq.definition : '') + '<small>' + _escapeHtml(battleIq ? battleIq.outcomeBiasProtection : '') + '</small><small>' + _escapeHtml(battleIq ? battleIq.reliabilityNote : '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Why it moved</strong>' + (battleIqRaised || '<div>No positive score driver was clear from this log.</div>') + (battleIqLowered || '<div>No negative score driver was clear from this log.</div>') + '</div>' +
        '<div class="replay-coach-list-row"><strong>Recommended drill</strong>' + _escapeHtml(battleIq && battleIq.recommendedDrill ? battleIq.recommendedDrill.skill : 'Decision Review Drill') + '<small>' + _escapeHtml(battleIq && battleIq.recommendedDrill ? battleIq.recommendedDrill.successCriteria : '') + '</small></div>' +
      '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Critical Turn Engine</h3>' +
      '<div class="replay-coach-list">' + (criticalCards || '<div class="replay-coach-list-row"><strong>No critical turn proven</strong>Needs more complete turns before naming a swing turn.</div>') + '</div>' +
      '<small>' + _escapeHtml((learning.criticalTurns && learning.criticalTurns.note) || '') + '</small>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Decision Quality Scorecard</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Overall Decision Quality</strong><span>' + _escapeHtml((learning.scorecard.overallGrade || '?') + ' · ' + String(learning.scorecard.overallDecisionQuality || 0)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(learning.scorecard.confidence || 'medium') + '</span></div>' +
        scoreCards +
      '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Win Path + Opponent Plan</h3>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>Your win path</strong>' + _escapeHtml(learning.winPath.afterLeads || '') + '<small>' + _escapeHtml(learning.winPath.followedOrAbandoned || '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Opponent plan recognition</strong>' + _escapeHtml(learning.opponentPlan.pressurePattern || '') + '<small>' + _escapeHtml(learning.opponentPlan.recognizeNextTime || '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Opponent plan evidence</strong>' + _escapeHtml((learning.opponentPlan.evidenceLabel || 'Needs more data') + ' · Confidence: ' + (learning.opponentPlan.confidence || 'low')) + '<small>' + _escapeHtml((learning.opponentPlan.evidence || []).join('; ') || 'Upload more complete logs before treating opponent intent as fact.') + '</small></div>' +
      '</div>' +
    '</div>' +
    (simComparison ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Sim Comparison</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Status</strong><span>' + _escapeHtml(simComparison.status || 'needs_sim_data') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Evidence</strong><span>' + _escapeHtml(simComparison.evidenceLabel || 'Needs more data') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Lead match</strong><span>' + _escapeHtml(String(simComparison.leadMatch == null ? 'unknown' : simComparison.leadMatch)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Four match</strong><span>' + _escapeHtml(String(simComparison.fourMatch == null ? 'unknown' : simComparison.fourMatch)) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Registered roster</strong><span>' + _escapeHtml((simComparison.registeredRoster || []).join(', ') || 'Needs full six') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Series format</strong><span>' + _escapeHtml((simComparison.seriesFormat || 'bo3').toUpperCase()) + '</span></div>' +
        '<div class="replay-coach-metric"><strong>BO3 swap options</strong><span>' + _escapeHtml((simComparison.actualSwapOptions || []).join(', ') || 'No hidden swaps known') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Lineup matrix</strong><span>' + _escapeHtml(simComparison.lineupCoverageLabel || 'Needs registered-roster combo sims') + '</span></div>' +
      '</div>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>Actual lead</strong>' + _escapeHtml((simComparison.actualLead || []).join(' + ') || 'Needs data') + '<small>Best sim lead: ' + _escapeHtml((simComparison.bestSimLead || []).join(' + ') || 'Needs sim data') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>First deviation</strong>' + _escapeHtml(simComparison.firstDeviation || simComparison.note || 'Needs sim data') + '<small>' + _escapeHtml(simComparison.decisionChange || '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Series lineup context</strong>' + _escapeHtml(simComparison.bo3SwapContext || 'Best-of-three lineup swap context needs the registered roster.') + '<small>Sim bench options: ' + _escapeHtml((simComparison.simBenchOptions || []).join(', ') || 'Needs sim data') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Diagnosis boundary</strong>' + _escapeHtml(simComparison.teamVsPilotDiagnosis || 'Do not judge team vs pilot until sim and replay data are matched.') + '</div>' +
      '</div>' +
    '</div>' : '') +
    (simFeedback ? '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Sim Feedback Packet</h3>' +
      '<div class="replay-coach-summary-grid">' +
        '<div class="replay-coach-metric"><strong>Confidence</strong><span>' + _escapeHtml(simFeedback.confidence || 'low') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Scenario</strong><span>' + _escapeHtml(simFeedback.scenarioType || 'none') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>Pilot difficulty</strong><span>' + _escapeHtml(simFeedback.pilotDifficultySignal || 'low') + '</span></div>' +
        '<div class="replay-coach-metric"><strong>RNG</strong><span>' + _escapeHtml(simFeedback.rngContamination || 'none') + '</span></div>' +
      '</div>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>Model updates</strong>' + _escapeHtml('Lead: ' + !!simFeedback.shouldUpdateLeadModel + ' · Bring four: ' + !!simFeedback.shouldUpdateBringFourModel + ' · Archetype: ' + !!simFeedback.shouldUpdateArchetypeModel) + '<small>Single replay signals do not automatically rewrite sim models.</small></div>' +
        '<div class="replay-coach-list-row"><strong>Scenario queue</strong>' + _escapeHtml(simFeedback.shouldCreateScenario ? 'Queue for stress retest' : 'Do not queue yet') + '<small>' + _escapeHtml(simFeedback.recommendedAction || '') + '</small></div>' +
        '<div class="replay-coach-list-row"><strong>Evidence</strong>' + _escapeHtml((simFeedback.evidence && simFeedback.evidence.note) || 'Replay-derived calibration signal only.') + '</div>' +
      '</div>' +
    '</div>' : '') +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Decision Quality Matrix</h3>' +
      '<div class="replay-coach-list">' + (decisionRows || '<div class="replay-coach-list-row"><strong>No key decision rows yet</strong>Upload a fuller log for decision/outcome separation.</div>') + '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Practice Plan</h3>' +
      '<div class="replay-coach-list">' + (drillRows || '<div class="replay-coach-list-row"><strong>No practice drill yet</strong>More replay data will unlock personalized drills.</div>') + '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Battle IQ Memory Preview</h3>' +
      '<div class="replay-coach-list">' +
        '<div class="replay-coach-list-row"><strong>Free review</strong>' + _escapeHtml(premium.freeValue || '') + '</div>' +
        '<div class="replay-coach-list-row"><strong>Profile unlock</strong>' + _escapeHtml(premium.premiumValue || '') + '</div>' +
        premiumRows +
        '<div class="replay-coach-list-row"><strong>Privacy boundary</strong>' + _escapeHtml((premium.backendLearningPolicy && premium.backendLearningPolicy.rawLogDefault) || '') + '<small>' + _escapeHtml((premium.backendLearningPolicy && premium.backendLearningPolicy.freeAnonymous) || '') + '</small></div>' +
      '</div>' +
    '</div>' : '') +
    '<div class="replay-coach-card">' +
      '<h3 class="replay-coach-h3">Turn Timeline</h3>' +
      '<div class="replay-coach-turns">' + (turns || '<div class="replay-coach-turn"><div class="replay-coach-turn-body">No turns parsed from this log.</div></div>') + '</div>' +
    '</div>' +
    '<div class="replay-coach-card">' +
      '<details class="replay-coach-raw"><summary>Raw log preview hidden by default · ' + _escapeHtml(String(rawPreview.lineCount || 0)) + ' lines</summary>' +
        '<pre class="battle-log replay-coach-raw-log">' + (rawLines || 'No raw log lines available.') + '</pre>' +
      '</details>' +
    '</div>';
}

function csNormalizeReplayName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function csTeamPreviewOverlap(previewNames, teamKey) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  var preview = (previewNames || []).map(csNormalizeReplayName).filter(Boolean);
  if (!team || !preview.length) return 0;
  var roster = (team.members || []).map(function(m) { return csNormalizeReplayName(m && m.name); }).filter(Boolean);
  if (!roster.length) return 0;
  var hits = preview.filter(function(n) { return roster.indexOf(n) >= 0; }).length;
  return hits / Math.max(preview.length, Math.min(6, roster.length));
}

function csSplitLeadPair(label) {
  return String(label || '').split(/\s*\+\s*/).map(function(v) { return v.trim(); }).filter(Boolean);
}

function csUniquePokemonNames(names, teamKey, cap) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  var out = [];
  var seen = Object.create(null);
  (names || []).forEach(function(n) {
    var name = String(n || '').trim();
    if (!name || seen[name]) return;
    seen[name] = true;
    out.push(name);
  });
  if (team && Array.isArray(team.members)) {
    team.members.forEach(function(m) {
      var name = m && m.name;
      if (!name || seen[name] || out.length >= cap) return;
      seen[name] = true;
      out.push(name);
    });
  }
  return out.slice(0, cap || getBringCount());
}

function csBuildBattleSenseiSimPlan(parsed, selectedSide) {
  parsed = parsed || {};
  var playerKey = (typeof currentPlayerKey === 'string' && TEAMS[currentPlayerKey]) ? currentPlayerKey : 'player';
  var results = (ChampionsSim && ChampionsSim.state && ChampionsSim.state.lastResults) ? ChampionsSim.state.lastResults : {};
  var oppSide = (selectedSide || parsed.selectedSide || 'p1') === 'p1' ? 'p2' : 'p1';
  var oppPreview = parsed.teamPreview && parsed.teamPreview[oppSide] ? parsed.teamPreview[oppSide] : [];
  var oppSelect = (typeof document !== 'undefined') ? document.getElementById('opponent-select') : null;
  var selectedOppKey = oppSelect && oppSelect.value && TEAMS[oppSelect.value] ? oppSelect.value : '';
  var candidateKeys = Object.keys(results || {}).filter(function(k) { return TEAMS[k]; });
  if (selectedOppKey && candidateKeys.indexOf(selectedOppKey) < 0) candidateKeys.unshift(selectedOppKey);
  if (!candidateKeys.length) return null;

  var ranked = candidateKeys.map(function(key) {
    var previewScore = csTeamPreviewOverlap(oppPreview, key);
    var hasResult = results && results[key] ? 0.25 : 0;
    var selectedBoost = key === selectedOppKey ? 0.15 : 0;
    return { key: key, score: previewScore + hasResult + selectedBoost, previewScore: previewScore, hasResult: !!(results && results[key]) };
  }).sort(function(a, b) { return b.score - a.score; });
  var best = ranked[0];
  if (!best || (!best.hasResult && best.previewScore <= 0)) return null;

  var scopedResults = {};
  if (results && results[best.key]) scopedResults[best.key] = results[best.key];
  var report = null;
  try {
    if (typeof buildStrategyReport === 'function') report = buildStrategyReport(playerKey, scopedResults, currentFormat);
  } catch (e) { report = null; }
  if (!report && typeof loadStrategyReport === 'function') {
    try { report = loadStrategyReport(playerKey); } catch (_e) { report = null; }
  }
  if (!report) return null;

  var leadSystem = report.lead_system || {};
  var matchupIntel = report.matchup_intelligence || {};
  var bestLeadLabel = (matchupIntel.safe_leads && matchupIntel.safe_leads[0]) || leadSystem.safe || leadSystem.speed || leadSystem.pressure || leadSystem.punish || '';
  var bestLead = csSplitLeadPair(bestLeadLabel);
  var preserveNames = [];
  if (report.team_identity && report.team_identity.primary_win_condition) preserveNames = preserveNames.concat(csSplitLeadPair(report.team_identity.primary_win_condition.replace(/->/g, '+')));
  if (report.team_identity && Array.isArray(report.team_identity.speed_control_mons)) preserveNames = preserveNames.concat(report.team_identity.speed_control_mons);
  if (report.team_identity && Array.isArray(report.team_identity.pivot_mons)) preserveNames = preserveNames.concat(report.team_identity.pivot_mons);
  var bestFour = csUniquePokemonNames(bestLead.concat(preserveNames), playerKey, getBringCount());
  var matchConfidence = best.previewScore >= 0.5 && best.hasResult ? 'medium' : 'low';

  return {
    source: 'latest in-app simulation strategy report',
    matchedOpponentKey: best.key,
    matchedOpponentName: TEAMS[best.key] && TEAMS[best.key].name ? TEAMS[best.key].name : best.key,
    registeredRoster: parsed.teamPreview && parsed.teamPreview[selectedSide] ? parsed.teamPreview[selectedSide] : [],
    lineupSize: getBringCount(),
    lineupMatrix: (ChampionsSim.replayLearning && typeof ChampionsSim.replayLearning.lineupCombinations === 'function' && parsed.teamPreview && parsed.teamPreview[selectedSide])
      ? ChampionsSim.replayLearning.lineupCombinations(parsed.teamPreview[selectedSide], getBringCount())
      : [],
    matchConfidence: matchConfidence,
    bestLead: bestLead,
    bestFour: bestFour,
    expectedWinPath: matchupIntel.best_win_path || (report.coaching_notes && report.coaching_notes.best_win_path) || (report.team_identity && report.team_identity.primary_win_condition) || '',
    safestLine: report.pilot_plan ? report.pilot_plan.turn_1 : '',
    confidence: matchConfidence,
    sampleSize: report.sample_size || 0
  };
}

function csInitReplayCoachUi() {
  var logEl = document.getElementById('replay-coach-log');
  var rosterEl = document.getElementById('replay-coach-full-roster');
  var urlEl = document.getElementById('replay-coach-url');
  var sideEl = document.getElementById('replay-coach-side');
  var runBtn = document.getElementById('replay-coach-run-btn');
  var clearBtn = document.getElementById('replay-coach-clear-btn');
  var uploadBtn = document.getElementById('replay-coach-upload-btn');
  var fetchBtn = document.getElementById('replay-coach-fetch-btn');
  var fileEl = document.getElementById('replay-coach-file');
  var statusEl = document.getElementById('replay-coach-status');
  if (!logEl || !sideEl || !runBtn) return;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('error', !!isError);
  }

  runBtn.addEventListener('click', function() {
    var api = ChampionsSim && ChampionsSim.replayCoach;
    if (!api || typeof api.analyzeShowdownReplay !== 'function') {
      setStatus('Battle Sensei parser is not available in this build.', true);
      return;
    }
    var raw = logEl.value || '';
    if (!raw.trim()) {
      setStatus('Paste a Showdown log before running analysis.', true);
      return;
    }
    try {
      var selectedSide = sideEl.value || 'p1';
      var opts = { selectedSide: selectedSide, manualTeamPreview: rosterEl ? rosterEl.value : '' };
      var analysis;
      if (typeof api.parseShowdownLog === 'function' && typeof api.buildReplayCoachReview === 'function') {
        var parsed = api.parseShowdownLog(raw, opts);
        opts.simPlan = csBuildBattleSenseiSimPlan(parsed, selectedSide);
        opts.sampleSize = opts.simPlan && opts.simPlan.sampleSize ? opts.simPlan.sampleSize : 1;
        analysis = { parsed: parsed, review: api.buildReplayCoachReview(parsed, opts) };
      } else {
        analysis = api.analyzeShowdownReplay(raw, opts);
      }
      csReplayCoachRenderAnalysis(analysis);
      var parsedTurns = analysis && analysis.parsed ? analysis.parsed.totalTurns : 0;
      setStatus('Parsed ' + parsedTurns + ' turn' + (parsedTurns === 1 ? '' : 's') + '. Review is local-only and not saved.');
    } catch (e) {
      setStatus('Could not analyze replay: ' + (e && e.message ? e.message : 'unknown error'), true);
    }
  });

  if (clearBtn) clearBtn.addEventListener('click', function() {
    logEl.value = '';
    if (rosterEl) rosterEl.value = '';
    setStatus('');
    var host = document.getElementById('replay-coach-results');
    if (host) host.innerHTML = '<div class="replay-coach-empty">Paste a log and run analysis to see result, leads, critical turn, coaching tags, and a readable turn timeline.</div>';
  });

  if (uploadBtn && fileEl) {
    uploadBtn.addEventListener('click', function() { fileEl.click(); });
    fileEl.addEventListener('change', function() {
      var file = fileEl.files && fileEl.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() {
        var api = ChampionsSim && ChampionsSim.replayCoach;
        var raw = String(reader.result || '');
        var normalized = api && typeof api.normalizeReplayLogInput === 'function' ? api.normalizeReplayLogInput(raw) : raw;
        logEl.value = normalized;
        setStatus('Loaded ' + file.name + '. Run analysis when ready.');
      };
      reader.onerror = function() { setStatus('Could not read that file.', true); };
      reader.readAsText(file);
    });
  }

  if (fetchBtn && urlEl) {
    fetchBtn.addEventListener('click', async function() {
      var api = ChampionsSim && ChampionsSim.replayCoach;
      if (!api || typeof api.fetchReplayLog !== 'function') {
        setStatus('Replay URL loading is not available in this build.', true);
        return;
      }
      var rawUrl = urlEl.value || '';
      if (!rawUrl.trim()) {
        setStatus('Paste a replay URL before loading it.', true);
        return;
      }
      setStatus('Loading replay URL...');
      try {
        var normalized = await api.fetchReplayLog(rawUrl);
        if (!normalized) throw new Error('Replay log was empty.');
        logEl.value = normalized;
        setStatus('Loaded replay URL into the log box. Run analysis when ready.');
      } catch (e) {
        setStatus((e && e.message) ? e.message : 'Could not load that replay URL.', true);
      }
    });
  }
}

function renderReplays() {
  const el = document.getElementById('replay-list');
  if (!el) return;
  const filtered = allReplays.filter(r => {
    if (replayFilter==='all') return true;
    if (replayFilter==='win') return r.result==='win';
    if (replayFilter==='loss') return r.result==='loss';
    if (replayFilter==='clutch') return csIsClutchReplay(r);
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
    const hasTurnLog = Array.isArray(r.turnLog) && r.turnLog.length > 0;
    const showCoachingSummary = r.result === 'loss';
    const coachingSummary = showCoachingSummary ? csBuildReplayCoachingSummary(r, {
      playerKey: r.playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player'),
      oppKey: r.oppKey || null
    }) : null;
    const logLen = (r.log || []).length;
    const logCapActive = !!r.logTruncated ||
      (typeof r.logLineCount === 'number' && r.logLineCount > logLen) ||
      logLen > MAX_REPLAY_LOG_LINES;
    const rawLogHtml = (r.log || []).join('<br>');
    const turning = r.turning_point ? 'Swing T' + r.turning_point.turn : 'No swing';
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
        ${logCapActive?`<span class="rchip">Showing last ${MAX_REPLAY_LOG_LINES} lines</span>`:''}
        ${hasTurnLog?`<span class="rchip">${turning}</span>`:''}
      </div>
      <div class="replay-expanded">
        ${showCoachingSummary ? csRenderReplayCoachingSummary(coachingSummary) : ''}
        ${hasTurnLog ? `<div class="replay-v2-tools">${csReplaySparkline(r.turnLog)}<button class="btn-secondary replay-json-btn" type="button">Download JSON</button></div>${csRenderTurnLogRows(r.turnLog, { playerKey: r.playerKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player'), oppKey: r.oppKey || null })}` : ''}
        ${hasTurnLog
          ? `<details class="battle-log-raw"><summary>Raw engine log</summary><div class="battle-log">${rawLogHtml}</div></details>`
          : `<div class="battle-log">${rawLogHtml}</div>`}
      </div>`;
    const dlBtn = card.querySelector('.replay-json-btn');
    if (dlBtn) dlBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); downloadReplayTurnLog(r); });
    card.addEventListener('click', ()=>card.classList.toggle('open'));
    el.appendChild(card);
  }
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.phase5 = ChampionsSim.phase5 || {};
  ChampionsSim.phase5.csBuildDecisionAudit = csBuildDecisionAudit;
  ChampionsSim.phase5.csRenderDecisionAuditChip = csRenderDecisionAuditChip;
  ChampionsSim.phase5.csBuildReplayCoachingSummary = csBuildReplayCoachingSummary;
  ChampionsSim.phase5.csRenderReplayCoachingSummary = csRenderReplayCoachingSummary;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildDecisionAudit', csBuildDecisionAudit);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderDecisionAuditChip', csRenderDecisionAuditChip);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildReplayCoachingSummary', csBuildReplayCoachingSummary);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderReplayCoachingSummary', csRenderReplayCoachingSummary);

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); replayFilter=btn.dataset.filter;
    if (typeof replayMode !== 'undefined' && replayMode === 'summary') renderSeriesSummary();
    else renderReplays();
  });
});

// __M6_HISTORY_BEGIN__
// ============================================================
// M6 — HISTORY: load past analyses from DB into Replay Log
// ============================================================
let historyRows = [];
let historyFilter = 'all';

async function loadAnalysisHistory(playerKey) {
  var adapter = getWindowValue('SupabaseAdapter', null);
  if (!adapter || !adapter.enabled || typeof adapter.loadAnalysesForPlayer !== 'function') return;
  try {
    historyRows = await adapter.loadAnalysesForPlayer(playerKey || 'player', 50);
    renderHistorySection();
  } catch (e) {
    UILog.warn('loadAnalysisHistory failed', e);
  }
}

function renderHistorySection() {
  var el = document.getElementById('history-list') || document.getElementById('replay-list');
  if (!el) return;

  var filtered = historyRows;
  if (historyFilter === 'win') filtered = historyRows.filter(function(r) { return r.wins > r.losses; });
  else if (historyFilter === 'loss') filtered = historyRows.filter(function(r) { return r.losses > r.wins; });
  else if (historyFilter === 'clutch') filtered = historyRows.filter(function(r) { return r.bo > 1 && Math.abs(r.wins - r.losses) <= 2; });

  el.innerHTML = '';
  if (!filtered.length) {
    el.innerHTML = '<div class="replay-empty">No analyses yet — run a simulation to see history here.</div>';
    return;
  }

  for (var i = 0; i < filtered.length; i++) {
    var row = filtered[i];
    var isWin = row.wins > row.losses;
    var rc = isWin ? 'var(--green)' : 'var(--red)';
    var rl = isWin ? 'WIN' : 'LOSS';
    var oppName = (typeof TEAMS !== 'undefined' && TEAMS[row.opp_team_id]) ? TEAMS[row.opp_team_id].name : row.opp_team_id;
    var card = document.createElement('div');
    card.className = 'replay-card history-card';
    card.dataset.analysisId = row.analysis_id;
    card.innerHTML =
      '<div class="replay-card-hdr">' +
        '<div class="replay-title"><span style="color:' + rc + ';font-weight:900">' + rl + '</span> vs ' + _escapeHtml(oppName) + '</div>' +
        '<div class="replay-meta">Bo' + _escapeHtml(String(row.bo)) + ' · ' + _escapeHtml(String(row.wins)) + 'W/' + _escapeHtml(String(row.losses)) + 'L · WR ' + _escapeHtml((row.win_rate * 100).toFixed(0)) + '% · ' + _escapeHtml(new Date(row.created_at).toLocaleDateString()) + '</div>' +
      '</div>' +
      '<div class="replay-expanded"><div class="history-logs-placeholder">Click to load game logs…</div></div>';
    card.addEventListener('click', (function(analysisId, cardEl) {
      return function() {
        cardEl.classList.toggle('open');
        if (cardEl.classList.contains('open') && !cardEl.dataset.loaded) {
          lazyLoadAnalysisLogs(analysisId, cardEl);
        }
      };
    })(row.analysis_id, card));
    el.appendChild(card);
  }
}

async function lazyLoadAnalysisLogs(analysisId, cardEl) {
  var adapter = getWindowValue('SupabaseAdapter', null);
  if (!adapter || typeof adapter.loadAnalysisLogs !== 'function') return;
  try {
    var logs = await adapter.loadAnalysisLogs(analysisId);
    var expanded = cardEl.querySelector('.replay-expanded');
    if (!expanded) return;
    if (!logs || !logs.length) {
      expanded.innerHTML = '<div class="history-logs-placeholder">No game logs recorded.</div>';
    } else {
      var html = '<div class="battle-log">';
      for (var i = 0; i < logs.length; i++) {
        var g = logs[i];
        var gRc = g.result === 'win' ? 'var(--green)' : 'var(--red)';
        html += '<div class="history-log-entry"><span style="color:' + gRc + '">' + (g.result || '?').toUpperCase() + '</span> — ' + (g.turns || '?') + ' turns · ' + (g.win_condition || '—') + '</div>';
      }
      html += '</div>';
      expanded.innerHTML = html;
    }
    cardEl.dataset.loaded = 'true';
  } catch (e) {
    UILog.warn('lazyLoadAnalysisLogs failed', e);
  }
}

function csGetActivePlayerKey() {
  return (typeof currentPlayerKey === 'string' && currentPlayerKey) ? currentPlayerKey : 'player';
}

async function csBuildMyDataExport(teamKey) {
  var key = teamKey || csGetActivePlayerKey();
  var team = (typeof TEAMS !== 'undefined' && TEAMS[key]) ? TEAMS[key] : null;
  var adapter = getWindowValue('SupabaseAdapter', null);
  var localReports = (typeof csLoadAllReports === 'function') ? csLoadAllReports() : {};
  var localSimLog = (typeof csSimLogGetAll === 'function') ? csSimLogGetAll() : [];
  var localTeamHistory = (typeof csSimLogForTeamBothSides === 'function') ? csSimLogForTeamBothSides(key) : [];
  var activeReport = (typeof csLoadReport === 'function') ? csLoadReport(key) : null;
  var dbAnalyses = [];

  if (adapter && adapter.enabled && typeof adapter.loadAnalysesForPlayer === 'function') {
    try {
      var rows = await adapter.loadAnalysesForPlayer(key, 500);
      if (Array.isArray(rows)) {
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i] || {};
          var logs = [];
          if (typeof adapter.loadAnalysisLogs === 'function' && row.analysis_id) {
            try { logs = await adapter.loadAnalysisLogs(row.analysis_id) || []; }
            catch (e) { UILog.warn('export my data loadAnalysisLogs failed', e); }
          }
          dbAnalyses.push({
            analysis_id: row.analysis_id || null,
            created_at: row.created_at || null,
            player_team_id: row.player_team_id || key,
            opp_team_id: row.opp_team_id || null,
            bo: row.bo || null,
            win_rate: row.win_rate || 0,
            wins: row.wins || 0,
            losses: row.losses || 0,
            sample_size: row.sample_size || 0,
            logs: logs
          });
        }
      }
    } catch (e) {
      UILog.warn('export my data loadAnalysesForPlayer failed', e);
    }
  }

  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    player_team_id: key,
    player_team_name: team && team.name ? team.name : null,
    current_format: (typeof currentFormat !== 'undefined') ? currentFormat : null,
    local: {
      reports: localReports,
      current_report: activeReport,
      sim_log: localSimLog,
      team_history: localTeamHistory
    },
    db: {
      enabled: !!(adapter && adapter.enabled),
      analyses: dbAnalyses
    }
  };
}

async function csExportMyDataJson(teamKey) {
  var payload = await csBuildMyDataExport(teamKey);
  var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  _downloadBlob('champions-sim-my-data-' + ts + '.json', 'application/json', JSON.stringify(payload, null, 2));
  return payload;
}

function csQaCountResult(bucket, result) {
  var key = result === 'win' || result === 'loss' || result === 'draw' ? result : 'other';
  bucket[key] = (bucket[key] || 0) + 1;
}

function csBuildQaArtifactSummary(simLog, replayCards, teamKey) {
  var entries = Array.isArray(simLog) ? simLog : [];
  var replays = Array.isArray(replayCards) ? replayCards : [];
  var byPair = {};
  var seriesResults = { win: 0, loss: 0, draw: 0, other: 0 };
  var gameResults = { win: 0, loss: 0, draw: 0, other: 0 };
  var replayResults = { win: 0, loss: 0, draw: 0, other: 0 };
  var teamEntries = 0;
  var totalGames = 0;
  var retainedTurnLogs = 0;
  var truncatedReplayLogs = 0;
  var latestTs = null;

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i] || {};
    if (e.playerKey === teamKey || e.oppKey === teamKey) teamEntries++;
    var pairKey = (e.playerKey || '?') + '::' + (e.oppKey || '?');
    byPair[pairKey] = (byPair[pairKey] || 0) + 1;
    csQaCountResult(seriesResults, e.seriesResult);
    if (typeof e.ts === 'number' && (!latestTs || e.ts > latestTs)) latestTs = e.ts;
    var games = Array.isArray(e.games) ? e.games : [];
    totalGames += games.length;
    for (var g = 0; g < games.length; g++) {
      csQaCountResult(gameResults, games[g] && games[g].result);
    }
  }

  for (var r = 0; r < replays.length; r++) {
    var replay = replays[r] || {};
    csQaCountResult(replayResults, replay.result);
    if (Array.isArray(replay.turnLog) && replay.turnLog.length) retainedTurnLogs++;
    if (replay.logTruncated || (typeof replay.logLineCount === 'number' && typeof replay.logShownCount === 'number' && replay.logLineCount > replay.logShownCount)) {
      truncatedReplayLogs++;
    }
  }

  return {
    total_retained_simlog_entries: entries.length,
    team_retained_simlog_entries: teamEntries,
    total_retained_games: totalGames,
    retained_replay_cards: replays.length,
    retained_replay_cards_with_turn_logs: retainedTurnLogs,
    truncated_replay_logs: truncatedReplayLogs,
    latest_retained_simlog_entry_at: latestTs ? new Date(latestTs).toISOString() : null,
    series_results: seriesResults,
    game_results: gameResults,
    replay_results: replayResults,
    matchup_pair_counts: byPair
  };
}

function csSafeNumber(value) {
  var n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function csBuildStressLiteSummary(stressLite, mergedCoverage, tacticalSweep, branchMoveAnalysis) {
  if (!stressLite) return null;
  var coverageTotals = mergedCoverage && mergedCoverage.totals ? mergedCoverage.totals : {};
  var opponentRows = tacticalSweep && Array.isArray(tacticalSweep.opponents) ? tacticalSweep.opponents : [];
  var branchRows = [];
  var results = { win: 0, loss: 0, draw: 0, other: 0 };
  var slowestMatchup = null;
  var heaviestMatchup = null;
  var i;
  for (i = 0; i < opponentRows.length; i++) {
    var opponent = opponentRows[i] || {};
    var space = opponent.coverage_space || {};
    var turns = csSafeNumber(space.executed_runs) * csSafeNumber(space.max_turns);
    var density = csSafeNumber(space.executed_runs) + csSafeNumber(opponent.loaded_rows);
    var opponentSummary = {
      opponent_team_id: opponent.opponent_team_id || null,
      executed_runs: csSafeNumber(space.executed_runs),
      newly_executed_runs: csSafeNumber(space.newly_executed_runs),
      candidate_runs: csSafeNumber(space.candidate_runs),
      max_turns: csSafeNumber(space.max_turns),
      estimated_turn_volume: turns,
      loaded_rows: csSafeNumber(opponent.loaded_rows)
    };
    branchRows.push(opponentSummary);
    if (!slowestMatchup || opponentSummary.estimated_turn_volume > slowestMatchup.estimated_turn_volume) slowestMatchup = opponentSummary;
    if (!heaviestMatchup || density > heaviestMatchup.evidence_density) {
      heaviestMatchup = {
        opponent_team_id: opponentSummary.opponent_team_id,
        evidence_density: density,
        executed_runs: opponentSummary.executed_runs,
        loaded_rows: opponentSummary.loaded_rows
      };
    }
  }
  if (tacticalSweep && tacticalSweep.matrices && tacticalSweep.matrices.length) {
    tacticalSweep.matrices.forEach(function(entry) {
      var matrix = entry && entry.branch_matrix;
      var runs = matrix && Array.isArray(matrix.runs) ? matrix.runs : [];
      runs.forEach(function(run) {
        var result = run && run.result;
        if (result === 'win' || result === 'loss' || result === 'draw') results[result]++;
        else results.other++;
      });
    });
  }
  var totalRuns = csSafeNumber(stressLite.total_executed_runs);
  var winRatePct = totalRuns > 0 ? Math.round(((results.win + (results.draw * 0.5)) / totalRuns) * 1000) / 10 : null;
  var coachBrain = mergedCoverage && mergedCoverage.coach_brain_summary ? mergedCoverage.coach_brain_summary : {};
  var tacticalInterpretation = coachBrain.tactical_interpretation || {};
  var bestLine = branchMoveAnalysis && Array.isArray(branchMoveAnalysis.best_lines_overall) && branchMoveAnalysis.best_lines_overall[0]
    ? branchMoveAnalysis.best_lines_overall[0]
    : null;
  var avoidMove = branchMoveAnalysis && Array.isArray(branchMoveAnalysis.avoid_moves) && branchMoveAnalysis.avoid_moves[0]
    ? branchMoveAnalysis.avoid_moves[0]
    : null;
  var tacticalSignal = branchMoveAnalysis && Array.isArray(branchMoveAnalysis.tactical_signals) && branchMoveAnalysis.tactical_signals[0]
    ? branchMoveAnalysis.tactical_signals[0]
    : null;
  return {
    schema_version: 'champions-stress-lite-summary-v1',
    status: stressLite.status || null,
    proof_boundary: stressLite.boundary || null,
    caps: {
      opponent_limit: csSafeNumber(stressLite.opponent_limit),
      opponent_count: csSafeNumber(stressLite.opponent_count),
      max_runs_per_opponent: csSafeNumber(stressLite.max_runs_per_opponent),
      branch_scope: stressLite.branch_scope || null,
      memory_guard: stressLite.memory_guard || null
    },
    totals: {
      branch_runs_executed: totalRuns,
      branch_runs_newly_executed: csSafeNumber(stressLite.total_newly_executed_runs),
      targeted_sweep_runs: csSafeNumber(stressLite.targeted_sweep_runs),
      replay_cards_scanned: csSafeNumber(coverageTotals.replay_cards_scanned),
      turns: csSafeNumber(coverageTotals.turns),
      action_rows: csSafeNumber(coverageTotals.action_rows),
      damage_events: csSafeNumber(coverageTotals.damage_events),
      effect_events: csSafeNumber(coverageTotals.effect_events),
      results: results,
      win_rate_pct: winRatePct
    },
    coverage_signal: {
      slowest_matchup: slowestMatchup,
      heaviest_evidence_matchup: heaviestMatchup,
      opponent_breakdown: branchRows
    },
    coaching_signal: {
      best_line: bestLine ? {
        player_leads: bestLine.player_leads || [],
        opponent_leads: bestLine.opponent_leads || [],
        line_key: bestLine.line_key || null,
        win_rate_pct: bestLine.win_rate_pct || null,
        confidence: bestLine.confidence || null
      } : null,
      avoid_move: avoidMove ? {
        actor: avoidMove.actor || null,
        move: avoidMove.move || null,
        player_leads: avoidMove.player_leads || [],
        opponent_leads: avoidMove.opponent_leads || [],
        win_rate_pct: avoidMove.win_rate_pct || null,
        confidence: avoidMove.confidence || null,
        reason: avoidMove.reason || null
      } : null,
      tactical_pattern: tacticalSignal ? {
        tactic_tag: tacticalSignal.tactic_tag || null,
        player_leads: tacticalSignal.player_leads || [],
        opponent_leads: tacticalSignal.opponent_leads || [],
        win_rate_pct: tacticalSignal.win_rate_pct || null,
        confidence: tacticalSignal.confidence || null,
        coach_note: tacticalSignal.coach_note || null
      } : null,
      recommended_focus: coachBrain.recommended_solution || tacticalInterpretation.turn_sequence_rule || null,
      risk_if_unchanged: coachBrain.risk_if_unchanged || null,
      practice_drill: coachBrain.practice_drill || null
    }
  };
}

function csCompactQaReplayCard(replay, playerKey) {
  var r = replay || {};
  var log = Array.isArray(r.log) ? r.log : [];
  var turnLog = Array.isArray(r.turnLog) ? r.turnLog : [];
  var buildId = (typeof csGetBuildId === 'function') ? csGetBuildId() : null;
  var sourceUrl = (typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null;
  var compactTacticalSpeedSummary = csBuildTacticalSpeedSummary(turnLog, { scope: 'retained-replay-card' });
  var compactDurationEffectSummary = csBuildDurationEffectSummary(turnLog, { scope: 'retained-replay-card' });
  var compactDecisionLedger = csBuildDecisionOpportunityLedger(compactTacticalSpeedSummary, { scope: 'retained-replay-card' });
  var compactCoachEventRows = csBuildCoachEventRows(compactTacticalSpeedSummary, compactDurationEffectSummary, {
    scope: 'retained-replay-card',
    player_team_id: r.playerKey || playerKey || null,
    opponent_team_id: r.oppKey || null,
    format: r.format || (typeof currentFormat !== 'undefined' ? currentFormat : null),
    maxRows: 120
  });
  return {
    id: r.id || null,
    seed: r.seed || null,
    playerKey: r.playerKey || playerKey || null,
    oppKey: r.oppKey || null,
    result: r.result || null,
    turns: r.turns || 0,
    winCondition: r.winCondition || null,
    trTurns: r.trTurns || 0,
    twTurns: r.twTurns || 0,
    logLineCount: (typeof r.logLineCount === 'number') ? r.logLineCount : log.length,
    logShownCount: (typeof r.logShownCount === 'number') ? r.logShownCount : log.length,
    logTruncated: !!r.logTruncated,
    turning_point: r.turning_point || null,
    position_path: Array.isArray(r.position_path) ? r.position_path : [],
    tactical_speed_summary: compactTacticalSpeedSummary,
    duration_effect_summary: compactDurationEffectSummary,
    decision_opportunity_ledger: compactDecisionLedger,
    faint_cause_summary: csBuildFaintCauseSummary(turnLog),
    contact_move_audit_summary: csBuildContactMoveAuditSummary(turnLog),
    coach_event_rows: compactCoachEventRows,
    coach_event_summary: csSummarizeCoachEventRows(compactCoachEventRows),
    coach_brain_summary: csBuildCoachBrainSummary(compactDecisionLedger, {
      scope: 'retained-replay-card',
      player_team_id: r.playerKey || playerKey || null,
      opponent_team_id: r.oppKey || null,
      format: r.format || (typeof currentFormat !== 'undefined' ? currentFormat : null)
    }),
    qa_coverage_summary: csBuildQaCoverageSummary(turnLog, {
      build_id: buildId,
      source_url: sourceUrl,
      format: r.format || (typeof currentFormat !== 'undefined' ? currentFormat : null),
      player_team_id: r.playerKey || playerKey || null,
      opponent_team_id: r.oppKey || null,
      scope: 'retained-replay-card'
    }),
    turnLog: turnLog,
    log: log
  };
}

function csBuildCodexQaContext(args) {
  args = args || {};
  var coverage = args.qa_coverage_summary || {};
  var mechanics = coverage.mechanics_seen || {};
  var missing = Array.isArray(coverage.missing_targeted_proof) ? coverage.missing_targeted_proof : [];
  var branch = args.branch_move_analysis || {};
  var branchTotals = branch.totals || {};
  var tactical = args.tactical_sweep || {};
  var retained = args.retained || {};
  var replayCards = Array.isArray(retained.replay_cards) ? retained.replay_cards : [];
  var coachBrain = coverage.coach_brain_summary || {};
  var coachInterp = coachBrain.tactical_interpretation || {};
  var moveTraceRows = Number(mechanics.move_rule_trace_rows || 0);
  var damageEvents = Number(mechanics.damage_events || 0);
  var effectEvents = Number(mechanics.effect_events || 0);
  var qaRunType = args.qa_run_type || 'manual_export';
  var readyForCodex = damageEvents > 0 && moveTraceRows > 0 && missing.length === 0;
  var recommendedNextTest = missing.length
    ? 'Run targeted QA proof for: ' + missing.slice(0, 8).join(', ') + '.'
    : (!damageEvents
        ? 'Run QA Artifact after battles with retained replay cards so damage_events are available.'
        : (!moveTraceRows
            ? 'Run targeted damage QA so move_rule_trace rows are exported for damage math review.'
            : (qaRunType === 'tactical_sweep'
                ? 'Artifact is Codex-ready; inspect qa_coverage_summary.coach_brain_summary.tactical_interpretation first, then branch_move_analysis for the next tactical coaching implementation target.'
                : 'Run Tactical Sweep + QA to add branch learning coverage across lineups, moves, and targets.')));
  var readiness = [];
  function addReadiness(id, label, status, detail) {
    readiness.push({ id: id, label: label, status: status, detail: detail });
  }
  addReadiness(
    'move_rule_trace',
    'Move rule trace layer',
    moveTraceRows > 0 ? 'green' : 'yellow',
    moveTraceRows > 0
      ? moveTraceRows + ' damage rows include move_rule_trace evidence.'
      : 'No move_rule_trace rows were observed in this artifact; run a damage-focused QA set or targeted proof.'
  );
  addReadiness(
    'damage_events',
    'Damage transparency',
    damageEvents > 0 ? 'green' : 'red',
    damageEvents > 0
      ? damageEvents + ' structured damage_events are available.'
      : 'No damage_events were retained; Codex cannot audit damage math from this artifact.'
  );
  addReadiness(
    'effect_events',
    'Effect transparency',
    effectEvents > 0 ? 'green' : 'yellow',
    effectEvents > 0
      ? effectEvents + ' structured effect_events are available.'
      : 'No effect_events were observed; run scenarios with recoil, drain, recovery, status, or field effects.'
  );
  addReadiness(
    'targeted_proof',
    'Named targeted proof gaps',
    missing.length === 0 ? 'green' : 'yellow',
    missing.length === 0
      ? 'No named targeted proof gaps remain in this artifact.'
      : 'Missing proof: ' + missing.slice(0, 12).join(', ')
  );
  return {
    schema_version: 'champions-codex-qa-context-v1',
    purpose: 'Compact handoff for Codex/local agents. Keep this object with QA artifacts so implementation work can start from evidence instead of re-reading raw logs.',
    generated_at: args.exported_at || new Date().toISOString(),
    qa_run_type: qaRunType,
    ready_for_codex: readyForCodex,
    next_missing_proof: missing.slice(),
    recommended_next_test: recommendedNextTest,
    artifact_identity: {
      schema_version: args.schema_version || 'champions-qa-artifact-v1',
      build_id: args.build_id || null,
      source_url: args.source_url || null,
      player_team_id: args.player_team_id || null,
      player_team_name: args.player_team_name || null,
      current_format: args.current_format || null
    },
    qa_readiness: readiness,
    mechanics_seen: {
      damage_events: damageEvents,
      effect_events: effectEvents,
      move_rule_trace_rows: moveTraceRows,
      nonstandard_stat_source_trace: Number(mechanics.nonstandard_stat_source_trace || 0),
      foul_play_trace: Number(mechanics.foul_play_trace || 0),
      ignored_target_power_ability_trace: Number(mechanics.ignored_target_power_ability_trace || 0),
      applied_user_power_ability_trace: Number(mechanics.applied_user_power_ability_trace || 0),
      recoil: Number(mechanics.recoil || 0),
      drain_heal: Number(mechanics.drain_heal || 0),
      flinch_applied: Number(mechanics.flinch_applied || 0),
      speed_control_neutralized: Number(mechanics.speed_control_neutralized || 0),
      trick_room_active: Number(mechanics.trick_room_active || 0),
      tailwind_active: Number(mechanics.tailwind_active || 0)
    },
    missing_targeted_proof: missing,
    retained_evidence: {
      replay_cards: replayCards.length,
      replay_cards_with_turn_logs: replayCards.filter(function(card) {
        return card && Array.isArray(card.turnLog) && card.turnLog.length;
      }).length,
      tactical_sweep_opponents: tactical && Array.isArray(tactical.opponents) ? tactical.opponents.length : 0,
      tactical_sweep_status: tactical && tactical.status || null,
      tactical_sweep_total_executed_runs: Number(tactical && tactical.total_executed_runs || 0),
      branch_analysis_rows: Number(branchTotals.rows || branchTotals.total_rows || 0)
    },
    coach_focus: {
      confidence: coachBrain.confidence || null,
      primary_issue: coachBrain.primary_issue && coachBrain.primary_issue.category || null,
      observed_pattern: coachBrain.observed_pattern || null,
      root_problem: coachBrain.root_problem || null,
      recommended_solution: coachBrain.recommended_solution || null,
      practice_drill: coachBrain.practice_drill || null,
      tactical_interpretation_schema: coachInterp.schema_version || null,
      tactical_player_question: coachInterp.player_question || null,
      tactical_turn_rule: coachInterp.turn_sequence_rule || null,
      tactical_watch_next: Array.isArray(coachInterp.data_to_watch_next) ? coachInterp.data_to_watch_next.slice(0, 8) : []
    },
    recommended_codex_prompt: [
      'Use this QA artifact as evidence. First inspect codex_context.qa_readiness, codex_context.coach_focus, and qa_coverage_summary.mechanics_seen.',
      'If a mechanic is yellow/red, locate the retained replay card or tactical_sweep run with the missing/weak evidence before changing engine code.',
      'For coaching work, start from codex_context.coach_focus and qa_coverage_summary.coach_brain_summary.tactical_interpretation before writing new advice.',
      'For damage issues, inspect turnLog[].damage_events[].move_rule_trace before editing calcDamage.',
      'Keep fixes source-truth aligned with Pokemon Showdown/Champion rules and add or update targeted QA proof when closing a mechanic gap.'
    ].join(' '),
    local_ingest_hint: 'Drop downloaded champions-sim-qa-artifact-*.json or champions-turn-log-*.json into a known folder, then run: cd poke-sim && npm run codex:qa -- <paths>'
  };
}

function csBuildQaProofManifest(payload) {
  payload = payload || {};
  var coverage = payload.qa_coverage_summary || {};
  var totals = coverage.totals || {};
  var mechanics = coverage.mechanics_seen || {};
  var retained = payload.retained || {};
  var replayCards = Array.isArray(retained.replay_cards) ? retained.replay_cards : [];
  var damageEvents = Number(totals.damage_events || mechanics.damage_events || payload.damage_events_total || 0);
  var effectEvents = Number(totals.effect_events || mechanics.effect_events || payload.effect_events_total || 0);
  var moveRuleTraceRows = Number(totals.move_rule_trace_rows || mechanics.move_rule_trace_rows || 0);
  var targetedMissing = Array.isArray(coverage.missing_targeted_proof) ? coverage.missing_targeted_proof : [];
  var tactical = payload.tactical_sweep || {};
  var stressLite = payload.stress_lite || null;
  var proofTier = 'manual';
  if (stressLite) proofTier = 'stress_lite';
  else if (payload.qa_run_type === 'tactical_sweep' || tactical.enabled) proofTier = 'tactical';
  else if (payload.targeted_qa_sweep) proofTier = 'targeted';
  else if (replayCards.length) proofTier = 'retained_replay';
  var hasTacticalSweep = !!(tactical && tactical.enabled);
  var hasStressLite = !!stressLite;
  var hasTargetedSweep = !!payload.targeted_qa_sweep;
  var knownLimits = [
    'Browser history is capped by retention settings; absence beyond caps is not proof the battle never happened.'
  ];
  if (hasStressLite) {
    knownLimits.push('Stress Lite is capped browser-safe evidence, not exhaustive Run All proof.');
  }
  if (targetedMissing.length) {
    knownLimits.push('Named targeted proof gaps remain: ' + targetedMissing.slice(0, 8).join(', ') + '.');
  }
  var readiness = payload.ready_for_codex ? 'ready_for_codex' : 'needs_more_evidence';
  var nextAction = payload.recommended_next_test || 'Run QA Artifact after a representative sim run.';
  if (!replayCards.length && !hasTacticalSweep && !hasTargetedSweep) {
    nextAction = 'Run Simulation or Tactical Sweep + QA so the artifact includes retained battle evidence.';
  } else if (hasStressLite) {
    nextAction = 'Use this as capped stress evidence; run full Run All on a desktop before claiming exhaustive release proof.';
  } else if (hasTacticalSweep && tactical.status === 'complete') {
    nextAction = 'Review tactical_sweep, branch_move_analysis, and retained replay cards for the next coaching or engine fix.';
  } else if (targetedMissing.length) {
    nextAction = 'Run targeted QA proof for: ' + targetedMissing.slice(0, 8).join(', ') + '.';
  }
  return {
    schema_version: 'champions-qa-proof-manifest-v1',
    purpose: 'Fast evidence index for Codex, QA reviewers, and contributors. Use this before walking the full artifact.',
    build_id: payload.build_id || null,
    source_url: payload.source_url || null,
    qa_run_type: payload.qa_run_type || null,
    artifact_type: payload.artifact_type || null,
    proof_tier: proofTier,
    readiness: readiness,
    evidence_counts: {
      retained_replay_cards: replayCards.length,
      retained_sim_log_rows: Array.isArray(retained.sim_log) ? retained.sim_log.length : 0,
      damage_events: damageEvents,
      effect_events: effectEvents,
      move_rule_trace_rows: moveRuleTraceRows,
      branch_matrix_runs: Number(totals.branch_matrix_runs || payload.branch_matrix_runs || tactical.total_executed_runs || 0),
      tactical_sweep_opponents: Array.isArray(tactical.opponents) ? tactical.opponents.length : 0,
      targeted_sweep_runs: Number(totals.targeted_sweep_runs || payload.targeted_sweep_runs || 0),
      targeted_sweep_missing: targetedMissing.length
    },
    coverage_flags: {
      has_retained_replays: replayCards.length > 0,
      has_damage_events: damageEvents > 0,
      has_effect_events: effectEvents > 0,
      has_move_rule_trace: moveRuleTraceRows > 0,
      has_tactical_sweep: hasTacticalSweep,
      has_stress_lite: hasStressLite,
      has_targeted_sweep: hasTargetedSweep,
      db_status_available: !!(payload.db && payload.db.branch_coverage)
    },
    known_limits: knownLimits,
    next_action: nextAction
  };
}

function csUniqueTeamKeys(keys) {
  var seen = {};
  return (Array.isArray(keys) ? keys : []).filter(function(key) {
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function csResolveTacticalSweepOpponentKeys(playerKey, options) {
  options = options || {};
  var resolvedKeys = [];
  if (Array.isArray(options.branchOpponentTeamIds) && options.branchOpponentTeamIds.length) {
    resolvedKeys = csUniqueTeamKeys(options.branchOpponentTeamIds).filter(function(key) {
      return key !== playerKey && typeof TEAMS !== 'undefined' && TEAMS[key];
    });
    return csLimitTacticalOpponentKeys(resolvedKeys, options);
  }
  if (options.branchOpponentTeamId) {
    resolvedKeys = [options.branchOpponentTeamId].filter(function(key) { return key && key !== playerKey; });
    return csLimitTacticalOpponentKeys(resolvedKeys, options);
  }
  var oppSelect = (typeof document !== 'undefined') ? document.getElementById('opponent-select') : null;
  if (!options.branchMatrixUseScope) {
    var selectedKey = (oppSelect && oppSelect.value) || null;
    resolvedKeys = selectedKey && selectedKey !== playerKey ? [selectedKey] : [];
    return csLimitTacticalOpponentKeys(resolvedKeys, options);
  }
  try {
    var simCtx = (typeof resolveSimContext === 'function')
      ? resolveSimContext({ playerKey: playerKey, simScope: options.branchMatrixScope || getSimScopeMode() })
      : { playerKey: playerKey, oppKey: (oppSelect && oppSelect.value) || null, simScope: options.branchMatrixScope || 'selected' };
    resolvedKeys = csUniqueTeamKeys(getRunAllOpponentKeys(playerKey, simCtx));
    return csLimitTacticalOpponentKeys(resolvedKeys, options);
  } catch (e) {
    UILog.warn('QA tactical sweep opponent resolution failed', e);
    var fallbackKey = (oppSelect && oppSelect.value) || null;
    resolvedKeys = fallbackKey && fallbackKey !== playerKey ? [fallbackKey] : [];
    return csLimitTacticalOpponentKeys(resolvedKeys, options);
  }
}

function csLimitTacticalOpponentKeys(keys, options) {
  var out = csUniqueTeamKeys(keys || []);
  var limit = Number(options && options.branchMatrixOpponentLimit);
  if (Number.isFinite(limit) && limit > 0 && out.length > limit) return out.slice(0, Math.floor(limit));
  return out;
}

var CS_QA_STRESS_LITE_MAX_BYTES = 50 * 1024 * 1024;
var CS_QA_STRESS_LITE_TARGET_BYTES = 45 * 1024 * 1024;
var CS_QA_STRESS_LITE_REPLAY_CARD_LIMIT = 80;
var CS_QA_STRESS_LITE_SIM_LOG_LIMIT = 240;
var CS_QA_STRESS_LITE_TEAM_HISTORY_LIMIT = 240;

function csEstimateJsonBytes(value) {
  var json = '';
  try {
    json = JSON.stringify(value || {});
  } catch (_e) {
    json = '';
  }
  try {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(json).length;
  } catch (_e2) {}
  try {
    if (typeof Blob === 'function') return new Blob([json]).size;
  } catch (_e3) {}
  return json.length;
}

function csApplyStressLiteArtifactBudget(payload, options) {
  if (!payload || !payload.stress_lite) return payload;
  options = options || {};
  var maxBytes = Number(options.qaArtifactMaxBytes || CS_QA_STRESS_LITE_MAX_BYTES);
  var targetBytes = Number(options.qaArtifactTargetBytes || CS_QA_STRESS_LITE_TARGET_BYTES);
  var retained = payload.retained || {};
  var trimReport = {
    schema_version: 'champions-stress-lite-artifact-budget-v1',
    purpose: 'Keep Stress Lite QA export browser-safe while preserving calculation and logic proof.',
    max_bytes: maxBytes,
    target_bytes: targetBytes,
    initial_bytes: csEstimateJsonBytes(payload),
    trimming_applied: false,
    preserved_for_josh: [
      'build_id and source_url',
      'qa coverage summary',
      'damage and effect event totals',
      'contact move audit',
      'move rule trace coverage',
      'decision opportunity ledger',
      'targeted sweep and branch matrix summaries',
      'database save status'
    ]
  };
  function trimArray(key, limit) {
    if (!Array.isArray(retained[key])) return;
    if (retained[key].length > limit) {
      retained[key] = retained[key].slice(0, limit);
      trimReport.trimming_applied = true;
    }
  }
  trimArray('replay_cards', Number(options.stressLiteReplayCardLimit || CS_QA_STRESS_LITE_REPLAY_CARD_LIMIT));
  trimArray('sim_log', Number(options.stressLiteSimLogLimit || CS_QA_STRESS_LITE_SIM_LOG_LIMIT));
  trimArray('team_history', Number(options.stressLiteTeamHistoryLimit || CS_QA_STRESS_LITE_TEAM_HISTORY_LIMIT));
  var finalBytes = csEstimateJsonBytes(payload);
  var replayFallbacks = [40, 20, 10, 0];
  for (var i = 0; finalBytes > targetBytes && i < replayFallbacks.length; i++) {
    trimArray('replay_cards', replayFallbacks[i]);
    finalBytes = csEstimateJsonBytes(payload);
  }
  if (finalBytes > targetBytes) {
    trimArray('sim_log', 120);
    trimArray('team_history', 120);
    finalBytes = csEstimateJsonBytes(payload);
  }
  if (finalBytes > targetBytes) {
    trimArray('sim_log', 40);
    trimArray('team_history', 40);
    finalBytes = csEstimateJsonBytes(payload);
  }
  trimReport.final_bytes = finalBytes;
  trimReport.under_max_bytes = finalBytes <= maxBytes;
  trimReport.retained_counts = {
    replay_cards: Array.isArray(retained.replay_cards) ? retained.replay_cards.length : 0,
    sim_log: Array.isArray(retained.sim_log) ? retained.sim_log.length : 0,
    team_history: Array.isArray(retained.team_history) ? retained.team_history.length : 0
  };
  payload.retained = retained;
  payload.artifact_size_guard = trimReport;
  payload.stress_lite.artifact_budget = trimReport;
  return payload;
}

function csBuildStressLiteOptions(simCtx) {
  simCtx = simCtx || {};
  var opponentLimit = 4;
  var maxRunsPerOpponent = 12;
  var memoryNote = 'safe-default';
  try {
    var deviceMemory = Number(navigator && navigator.deviceMemory || 0);
    if (deviceMemory && deviceMemory <= 4) {
      opponentLimit = 2;
      maxRunsPerOpponent = 8;
      memoryNote = 'low-memory-device';
    }
  } catch (_e) {}
  return {
    stressLite: {
      schema_version: 'champions-stress-lite-qa-v1',
      reason: 'Safe stress proof for browsers where full Run All may overload the device.',
      opponent_limit: opponentLimit,
      max_runs_per_opponent: maxRunsPerOpponent,
      max_artifact_bytes: CS_QA_STRESS_LITE_MAX_BYTES,
      target_artifact_bytes: CS_QA_STRESS_LITE_TARGET_BYTES,
      branch_scope: simCtx.simScope || 'selected',
      includes_targeted_sweep: true,
      memory_guard: memoryNote,
      boundary: 'This is capped stress evidence, not exhaustive Run All proof.',
      size_budget_note: 'Stress Lite QA is designed to stay under 50 MB while keeping the calculation and logic proof needed for review.',
      josh_validation_data: [
        'damage totals and retained damage event samples',
        'effect/status/weather/field event totals',
        'contact move metadata audit',
        'move rule trace coverage',
        'decision opportunity ledger',
        'targeted sweep and branch matrix summaries',
        'database save proof'
      ]
    },
    qaArtifactMaxBytes: CS_QA_STRESS_LITE_MAX_BYTES,
    qaArtifactTargetBytes: CS_QA_STRESS_LITE_TARGET_BYTES,
    stressLiteReplayCardLimit: CS_QA_STRESS_LITE_REPLAY_CARD_LIMIT,
    stressLiteSimLogLimit: CS_QA_STRESS_LITE_SIM_LOG_LIMIT,
    stressLiteTeamHistoryLimit: CS_QA_STRESS_LITE_TEAM_HISTORY_LIMIT,
    branchMatrixUseScope: true,
    branchMatrixScope: simCtx.simScope || 'selected',
    branchMatrixOpponentLimit: opponentLimit,
    branchMatrixMaxRunsPerOpponent: maxRunsPerOpponent,
    branchMatrixMaxLeadPairsPerSide: 2,
    branchMatrixMaxMovesPerMon: 2,
    branchMatrixMaxTargetsPerMove: 2,
    branchMatrixMaxTurns: 3
  };
}

function csCreateTimedFallbackFallback(ms, fallback) {
  return new Promise(function(resolve) {
    setTimeout(function() { resolve(fallback); }, Math.max(1, Number(ms) || 1000));
  });
}

function csWithTimeout(workPromise, ms, fallback) {
  if (!workPromise || !ms || ms <= 0) return workPromise;
  var fallbackPromise = csCreateTimedFallbackFallback(ms, fallback);
  return Promise.race([workPromise, fallbackPromise]);
}

function csAggregateBranchSaveResults(results) {
  var out = { enabled: false, saved: 0, updated: 0, inserted: 0, errors: [] };
  (Array.isArray(results) ? results : []).forEach(function(result) {
    if (!result) return;
    if (result.enabled) out.enabled = true;
    out.saved += Number(result.saved || 0);
    out.updated += Number(result.updated || 0);
    out.inserted += Number(result.inserted || 0);
    if (result.error) out.errors.push(csNormalizeEvidenceError(result.error));
  });
  if (!out.errors.length) delete out.errors;
  return out;
}

function csNormalizeEvidenceError(err) {
  if (!err) return err;
  if (typeof err === 'string') {
    if (err === '[object Object]') {
      return {
        message: 'Error object was string-coerced before export',
        raw: err
      };
    }
    return err;
  }
  var fallbackMessage = null;
  if (typeof err === 'object') {
    try {
      var probe = JSON.parse(JSON.stringify(err));
      if (probe && typeof probe === 'object') {
        if (!probe.message || (typeof probe.message === 'string' && !probe.message.trim())) {
          fallbackMessage = String(err);
          if (!fallbackMessage || !fallbackMessage.trim()) {
            fallbackMessage = null;
          }
          probe.message = fallbackMessage || 'Error object missing message';
        }
        return probe;
      }
    } catch (_e) {
      // keep object shape when JSON-safe copy is unavailable
      fallbackMessage = String(err);
      if (!fallbackMessage || !fallbackMessage.trim()) {
        fallbackMessage = 'Error object is not JSON-safe';
      }
      return {
        message: fallbackMessage,
        raw: err
      };
    }
  }
  fallbackMessage = String(err);
  return fallbackMessage && fallbackMessage.trim() ? fallbackMessage : 'Unknown error';
}

function csReportBranchMatrixProgress(options, event) {
  if (!options || typeof options.onBranchMatrixProgress !== 'function') return;
  try {
    options.onBranchMatrixProgress(event || {});
  } catch (e) {
    UILog.warn('QA tactical sweep progress callback failed', e);
  }
}

function csYieldForProgressPaint() {
  if (typeof Promise === 'undefined' || typeof setTimeout !== 'function') return null;
  return new Promise(function(resolve) { setTimeout(resolve, 0); });
}

async function csBuildBranchMatrixForOpponent(args) {
  args = args || {};
  var adapter = args.adapter || null;
  var options = args.options || {};
  var branchPlayerKey = args.playerTeamId;
  var branchOpponentKey = args.opponentTeamId;
  var exportedAt = args.generated_at;
  var buildId = args.build_id;
  var sourceUrl = args.source_url;
  var loadedRows = [];
  var saveResult = null;
  var matrix = null;
  var hadWarning = false;

  if (!branchPlayerKey || !branchOpponentKey || typeof csBuildForcedBranchMatrixSweepEvidence !== 'function') {
    return null;
  }
  csReportBranchMatrixProgress(options, {
    phase: 'load',
    opponent_team_id: branchOpponentKey,
    opponent_index: args.opponent_index,
    opponent_count: args.opponent_count
  });
  if (adapter && typeof adapter.loadBranchCoverageSummary === 'function') {
    var loadLimit = adapter && adapter.loadBranchCoverageSummary ? (options.branchMatrixLoadLimit || 5000) : 5000;
    try {
      loadedRows = await csWithTimeout(adapter.loadBranchCoverageSummary({
        player_team_id: branchPlayerKey,
        opponent_team_id: branchOpponentKey,
        limit: loadLimit
      }), 9000, []);
      if (!Array.isArray(loadedRows)) loadedRows = [];
    } catch (e) {
      UILog.warn('QA branch matrix loadBranchCoverageSummary failed', e);
      hadWarning = true;
    }
  }
  var playerMode = (typeof getBringMode === 'function') ? getBringMode(branchPlayerKey) : 'random';
  var opponentMode = (typeof getBringMode === 'function') ? getBringMode(branchOpponentKey) : 'random';
  csReportBranchMatrixProgress(options, {
    phase: 'build',
    opponent_team_id: branchOpponentKey,
    opponent_index: args.opponent_index,
    opponent_count: args.opponent_count,
    loaded_rows: loadedRows.length
  });
  matrix = await csBuildForcedBranchMatrixSweepEvidence({
    generated_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    playerTeamId: branchPlayerKey,
    opponentTeamId: branchOpponentKey,
    playerLeadMode: playerMode === 'manual' ? 'selected' : 'random',
    opponentLeadMode: opponentMode === 'manual' ? 'selected' : 'random',
    playerLeadNames: (typeof getBringFor === 'function') ? getBringFor(branchPlayerKey).slice(0, 2) : [],
    opponentLeadNames: (typeof getBringFor === 'function') ? getBringFor(branchOpponentKey).slice(0, 2) : [],
    seenBranchKeys: loadedRows.map(function(row) {
      return row && row.branch_key && !Number(row.outcome_drift_count || 0) ? row.branch_key : null;
    }).filter(Boolean),
    maxRuns: Object.prototype.hasOwnProperty.call(options, 'branchMatrixMaxRunsPerOpponent')
      ? normalizeBranchMaxRuns(options.branchMatrixMaxRunsPerOpponent)
      : (Object.prototype.hasOwnProperty.call(options, 'branchMatrixMaxRuns')
          ? normalizeBranchMaxRuns(options.branchMatrixMaxRuns)
          : getTacticalDepthMaxRuns()),
    maxLeadPairsPerSide: options.branchMatrixMaxLeadPairsPerSide || 3,
    maxMovesPerMon: options.branchMatrixMaxMovesPerMon || 2,
    maxTargetsPerMove: options.branchMatrixMaxTargetsPerMove || 2,
    maxTurns: options.branchMatrixMaxTurns || 3,
    onProgress: function(event) {
      csReportBranchMatrixProgress(options, {
        phase: 'build-progress',
        opponent_team_id: branchOpponentKey,
        opponent_index: args.opponent_index,
        opponent_count: args.opponent_count,
        loaded_rows: loadedRows.length,
        executed_runs: event && event.executed_runs || 0,
        total_planned_runs: event && event.total_planned_runs || 0,
        unseen_candidate_runs: event && event.unseen_candidate_runs || 0
      });
    }
  });
  csReportBranchMatrixProgress(options, {
    phase: 'save',
    opponent_team_id: branchOpponentKey,
    opponent_index: args.opponent_index,
    opponent_count: args.opponent_count,
    loaded_rows: loadedRows.length,
    executed_runs: matrix && matrix.coverage_space ? matrix.coverage_space.executed_runs : 0,
    unseen_candidate_runs: matrix && matrix.coverage_space ? matrix.coverage_space.unseen_candidate_runs : 0,
    candidate_runs: matrix && matrix.coverage_space ? matrix.coverage_space.candidate_runs : 0
  });
  if (adapter && typeof adapter.saveBranchCoverageRuns === 'function' && matrix && Array.isArray(matrix.runs)) {
    try {
      var branchSaveTimeoutMs = Number.isFinite(Number(options.branchMatrixSaveTimeoutMs))
        ? Math.max(30000, Number(options.branchMatrixSaveTimeoutMs))
        : 120000;
      saveResult = await csWithTimeout(adapter.saveBranchCoverageRuns({
        build_id: buildId,
        source_url: sourceUrl,
        player_team_id: branchPlayerKey,
        opponent_team_id: branchOpponentKey,
        runs: matrix.runs,
        onProgress: function(event) {
          event = event || {};
          setBranchProgress(94, 'Saving branch runs for ' + branchOpponentKey + ' (' + Number(event.saved_rows || 0) + ' rows saved)...', {
            opponent_index: args.opponent_index,
            opponent_count: args.opponent_count,
            saved_rows: Number(event.saved_rows || 0),
            inserted_rows: Number(event.inserted_rows || 0),
            updated_rows: Number(event.updated_rows || 0),
            attempted_rows: Number(event.attempted_rows || 0)
          });
        }
      }), branchSaveTimeoutMs, {
        enabled: true,
        saved: 0,
        updated: 0,
        inserted: 0,
        error: 'branch_coverage_save_timed_out'
      });
      if (saveResult && saveResult.error) {
        saveResult.error = csNormalizeEvidenceError(saveResult.error);
      }
      hadWarning = hadWarning || !!(saveResult && saveResult.error);
    } catch (e) {
      UILog.warn('QA branch matrix saveBranchCoverageRuns failed', e);
      hadWarning = true;
    }
  }
  csReportBranchMatrixProgress(options, {
    phase: 'done',
    opponent_team_id: branchOpponentKey,
    opponent_index: args.opponent_index,
    opponent_count: args.opponent_count,
    loaded_rows: loadedRows.length,
    saved_rows: saveResult && saveResult.saved || 0,
    inserted_rows: saveResult && saveResult.inserted || 0,
    updated_rows: saveResult && saveResult.updated || 0,
    executed_runs: matrix && matrix.coverage_space ? matrix.coverage_space.executed_runs : 0
  });
  return {
    opponent_team_id: branchOpponentKey,
    loaded_rows: loadedRows,
    save_result: saveResult,
    branch_matrix: matrix
  };
}

async function csBuildQaArtifactExport(teamKey, opts) {
  var key = teamKey || csGetActivePlayerKey();
  var options = opts || {};
  var team = (typeof TEAMS !== 'undefined' && TEAMS[key]) ? TEAMS[key] : null;
  var adapter = getWindowValue('SupabaseAdapter', null);
  var localSimLog = (typeof csSimLogGetAll === 'function') ? csSimLogGetAll() : [];
  var localTeamHistory = (typeof csSimLogForTeamBothSides === 'function') ? csSimLogForTeamBothSides(key) : [];
  var replaySource = Array.isArray(options.replayCardsOverride) ? options.replayCardsOverride : (Array.isArray(allReplays) ? allReplays : []);
  var replayCards = replaySource.map(function(replay) {
    return csCompactQaReplayCard(replay, key);
  });
  var exportedAt = new Date().toISOString();
  var buildId = (typeof csGetBuildId === 'function') ? csGetBuildId() : null;
  var sourceUrl = (typeof csGetSourceUrl === 'function') ? csGetSourceUrl() : null;
  var coverageReplayCards = options.includeReplayCards === false ? [] : replayCards;
  var retainedReplayCoverageSummaries = coverageReplayCards.map(function(card) {
    return card && card.qa_coverage_summary;
  });
  var fullArtifactCoverageSummaries = retainedReplayCoverageSummaries.slice();
  var targetedSweep = options.includeTargetedSweep === false ? null : csBuildTargetedQaSweepEvidence({
    generated_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl
  });
  if (targetedSweep && targetedSweep.qa_coverage_summary) {
    fullArtifactCoverageSummaries.push(targetedSweep.qa_coverage_summary);
  }
  var branchMatrixDbRows = [];
  var branchMatrixDbSaves = [];
  var branchMatrixDbSave = null;
  var branchMatrix = null;
  var branchMatrixCoverageSummaries = [];
  var tacticalSweepMatrices = [];
  var tacticalSweepOpponentKeys = [];
  var branchMoveAnalysis = null;
  if (options.includeBranchMatrix !== false) {
    var branchPlayerKey = options.branchPlayerTeamId || key;
    tacticalSweepOpponentKeys = csResolveTacticalSweepOpponentKeys(branchPlayerKey, options);
    csReportBranchMatrixProgress(options, {
      phase: 'start',
      opponent_count: tacticalSweepOpponentKeys.length,
      opponent_team_ids: tacticalSweepOpponentKeys
    });
    for (var bmIdx = 0; bmIdx < tacticalSweepOpponentKeys.length; bmIdx++) {
      var branchOpponentKey = tacticalSweepOpponentKeys[bmIdx];
      var paintWait = csYieldForProgressPaint();
      if (paintWait) await paintWait;
      var builtMatrix = await csBuildBranchMatrixForOpponent({
        adapter: adapter,
        options: options,
        playerTeamId: branchPlayerKey,
        opponentTeamId: branchOpponentKey,
        opponent_index: bmIdx + 1,
        opponent_count: tacticalSweepOpponentKeys.length,
        generated_at: exportedAt,
        build_id: buildId,
        source_url: sourceUrl
      });
      if (!builtMatrix || !builtMatrix.branch_matrix) continue;
      tacticalSweepMatrices.push(builtMatrix);
      branchMatrixDbRows = branchMatrixDbRows.concat(builtMatrix.loaded_rows || []);
      if (builtMatrix.save_result) branchMatrixDbSaves.push(builtMatrix.save_result);
      if (!branchMatrix) {
        branchMatrix = builtMatrix.branch_matrix;
        branchMatrixDbSave = builtMatrix.save_result;
      }
      if (builtMatrix.branch_matrix && builtMatrix.branch_matrix.qa_coverage_summary) {
        branchMatrixCoverageSummaries.push(builtMatrix.branch_matrix.qa_coverage_summary);
        fullArtifactCoverageSummaries.push(builtMatrix.branch_matrix.qa_coverage_summary);
      }
    }
    csReportBranchMatrixProgress(options, {
      phase: 'analyze',
      opponent_count: tacticalSweepMatrices.length,
      executed_runs: tacticalSweepMatrices.reduce(function(sum, entry) {
        var space = entry.branch_matrix && entry.branch_matrix.coverage_space;
        return sum + Number(space && space.executed_runs || 0);
      }, 0)
    });
    if (tacticalSweepMatrices.length && typeof csAnalyzeBranchCoverageRows === 'function') {
      var combinedBranchRows = [];
      tacticalSweepMatrices.forEach(function(entry) {
        combinedBranchRows = combinedBranchRows.concat(entry.loaded_rows || []);
        combinedBranchRows = combinedBranchRows.concat(entry.branch_matrix && Array.isArray(entry.branch_matrix.runs) ? entry.branch_matrix.runs : []);
      });
      branchMoveAnalysis = csAnalyzeBranchCoverageRows(combinedBranchRows, {
        minStrongSamples: options.branchMoveAnalysisMinStrongSamples || 8,
        avoidWinRate: options.branchMoveAnalysisAvoidWinRate == null ? 0.35 : options.branchMoveAnalysisAvoidWinRate,
        limit: options.branchMoveAnalysisLimit || 12
      });
      ChampionsSim.state.lastBranchMoveAnalysis = branchMoveAnalysis;
      var branchTeamSig = null;
      try {
        if (typeof TEAMS !== 'undefined' && TEAMS[branchPlayerKey] && typeof teamSignature === 'function') {
          branchTeamSig = teamSignature(TEAMS[branchPlayerKey]);
        }
      } catch (_e) {}
      csRememberBranchMoveAnalysis(branchMoveAnalysis, {
        player_team_id: branchPlayerKey,
        opponent_team_id: tacticalSweepOpponentKeys.length === 1 ? tacticalSweepOpponentKeys[0] : 'tactical-sweep:' + tacticalSweepOpponentKeys.length,
        player_team_signature: branchTeamSig
      });
      branchMatrixDbSave = tacticalSweepMatrices.length === 1 ? branchMatrixDbSave : csAggregateBranchSaveResults(branchMatrixDbSaves);
    } else {
      branchMatrixDbSave = csAggregateBranchSaveResults(branchMatrixDbSaves);
    }
    csReportBranchMatrixProgress(options, {
      phase: 'complete',
      opponent_count: tacticalSweepMatrices.length,
      saved_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.saved || 0); }, 0),
      inserted_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.inserted || 0); }, 0),
      updated_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.updated || 0); }, 0)
    });
  }
  var retainedReplayCardSummary = csMergeQaCoverageSummaries(retainedReplayCoverageSummaries, {
    generated_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    format: (typeof currentFormat !== 'undefined') ? currentFormat : null,
    player_team_id: key,
    scope: 'qa-artifact-retained-replay-cards'
  });
  retainedReplayCardSummary.totals.replay_cards_scanned = coverageReplayCards.length;
  var tacticalSweepCoverageSummary = branchMatrixCoverageSummaries.length
    ? csMergeQaCoverageSummaries(branchMatrixCoverageSummaries, {
        generated_at: exportedAt,
        build_id: buildId,
        source_url: sourceUrl,
        format: (typeof currentFormat !== 'undefined') ? currentFormat : null,
        player_team_id: key,
        scope: 'qa-artifact-tactical-sweep'
      })
    : null;
  var mergedCoverage = csMergeQaCoverageSummaries(fullArtifactCoverageSummaries, {
    generated_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    format: (typeof currentFormat !== 'undefined') ? currentFormat : null,
    player_team_id: key,
    scope: 'qa-artifact-full-evidence'
  });
  mergedCoverage.totals.replay_cards_scanned = coverageReplayCards.length;
  mergedCoverage.totals.targeted_sweep_runs = targetedSweep && Array.isArray(targetedSweep.runs) ? targetedSweep.runs.length : 0;
  var branchMatrixRunsTotal = tacticalSweepMatrices.reduce(function(sum, entry) {
    var space = entry.branch_matrix && entry.branch_matrix.coverage_space;
    return sum + Number(space && space.executed_runs || 0);
  }, 0);
  var branchMatrixNewTotal = tacticalSweepMatrices.reduce(function(sum, entry) {
    var space = entry.branch_matrix && entry.branch_matrix.coverage_space;
    return sum + Number(space && space.newly_executed_runs || 0);
  }, 0);
  mergedCoverage.totals.branch_matrix_runs = branchMatrixRunsTotal;
  mergedCoverage.totals.branch_matrix_newly_executed = branchMatrixNewTotal;
  if (tacticalSweepCoverageSummary) {
    tacticalSweepCoverageSummary.totals.branch_matrix_runs = branchMatrixRunsTotal;
    tacticalSweepCoverageSummary.totals.branch_matrix_newly_executed = branchMatrixNewTotal;
  }
  var tacticalSweepOpponents = tacticalSweepMatrices.map(function(entry) {
    return {
      opponent_team_id: entry.opponent_team_id,
      loaded_rows: (entry.loaded_rows || []).length,
      save_result: entry.save_result,
      coverage_space: entry.branch_matrix && entry.branch_matrix.coverage_space ? entry.branch_matrix.coverage_space : null,
      analysis_totals: branchMoveAnalysis && branchMoveAnalysis.totals ? branchMoveAnalysis.totals : null
    };
  });
  var tacticalSweepStatus = tacticalSweepMatrices.length
    ? 'complete'
    : (tacticalSweepOpponentKeys.length ? 'no_matrix_runs' : 'not_requested_or_no_opponents');
  var tacticalSweep = {
    schema_version: 'champions-tactical-sweep-v1',
    status: tacticalSweepStatus,
    enabled: !!tacticalSweepMatrices.length,
    scope: options.branchMatrixUseScope ? (options.branchMatrixScope || (typeof getSimScopeMode === 'function' ? getSimScopeMode() : 'selected')) : 'selected',
    player_team_id: options.branchPlayerTeamId || key,
    opponent_count: tacticalSweepOpponentKeys.length,
    opponent_team_ids: tacticalSweepOpponentKeys,
    max_runs_per_opponent: Object.prototype.hasOwnProperty.call(options, 'branchMatrixMaxRunsPerOpponent')
      ? normalizeBranchMaxRuns(options.branchMatrixMaxRunsPerOpponent)
      : (Object.prototype.hasOwnProperty.call(options, 'branchMatrixMaxRuns')
          ? normalizeBranchMaxRuns(options.branchMatrixMaxRuns)
          : getTacticalDepthMaxRuns()),
    opponents: tacticalSweepOpponents,
    matrices: tacticalSweepOpponents,
    total_loaded_rows: branchMatrixDbRows.length,
    total_saved_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.saved || 0); }, 0),
    total_inserted_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.inserted || 0); }, 0),
    total_updated_rows: branchMatrixDbSaves.reduce(function(sum, result) { return sum + Number(result && result.updated || 0); }, 0),
    total_executed_runs: branchMatrixRunsTotal,
    total_newly_executed_runs: branchMatrixNewTotal
  };
  var stressLite = options.stressLite ? Object.assign({}, options.stressLite, {
    status: tacticalSweepMatrices.length ? 'complete' : tacticalSweepStatus,
    opponent_count: tacticalSweepOpponentKeys.length,
    opponent_team_ids: tacticalSweepOpponentKeys,
    total_executed_runs: branchMatrixRunsTotal,
    total_newly_executed_runs: branchMatrixNewTotal,
    targeted_sweep_runs: targetedSweep && Array.isArray(targetedSweep.runs) ? targetedSweep.runs.length : 0
  }) : null;
  var stressLiteSummary = csBuildStressLiteSummary(stressLite, mergedCoverage, {
    opponents: tacticalSweepOpponents,
    matrices: tacticalSweepMatrices
  }, branchMoveAnalysis);
  if (stressLite && stressLiteSummary) stressLite.summary = stressLiteSummary;
  var retainedSimLog = options.includeSimLog === false ? [] : localSimLog;
  var retainedTeamHistory = options.includeSimLog === false ? [] : localTeamHistory;
  var retainedReplayCards = options.includeReplayCards === false ? [] : replayCards;
  if (stressLite) {
    retainedReplayCards = retainedReplayCards.slice(0, Number(options.stressLiteReplayCardLimit || CS_QA_STRESS_LITE_REPLAY_CARD_LIMIT));
    retainedSimLog = retainedSimLog.slice(0, Number(options.stressLiteSimLogLimit || CS_QA_STRESS_LITE_SIM_LOG_LIMIT));
    retainedTeamHistory = retainedTeamHistory.slice(0, Number(options.stressLiteTeamHistoryLimit || CS_QA_STRESS_LITE_TEAM_HISTORY_LIMIT));
  }

  var artifactSummary = csBuildQaArtifactSummary(localSimLog, replayCards, key);
  var qaRunType = stressLite ? 'stress_lite_qa' : (tacticalSweepMatrices.length ? 'tactical_sweep' : (targetedSweep ? 'qa_artifact_with_targeted_sweep' : 'qa_artifact'));
  var payload = {
    schema_version: 'champions-qa-artifact-v1',
    artifact_type: 'large-run-qa-retained-evidence',
    qa_run_type: qaRunType,
    exported_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    player_team_id: key,
    player_team_name: team && team.name ? team.name : null,
    current_format: (typeof currentFormat !== 'undefined') ? currentFormat : null,
    retention: {
      scope: 'retained browser evidence',
      note: 'Normal browser history is intentionally capped. This artifact records all retained local evidence plus the caps that shaped it; it is not proof that only this many battles ran.',
      max_replay_cards: MAX_REPLAY_CARDS,
      max_replay_log_lines: MAX_REPLAY_LOG_LINES,
      max_simlog_total: CS_SIMLOG_MAX_TOTAL,
      max_simlog_per_pair: CS_SIMLOG_MAX_PER_PAIR,
      include_replay_cards: options.includeReplayCards !== false,
      include_sim_log: options.includeSimLog !== false,
      include_targeted_sweep: !!targetedSweep,
      include_branch_matrix: !!branchMatrix,
      include_tactical_sweep: !!tacticalSweepMatrices.length,
      include_stress_lite: !!stressLite
    },
    summary: artifactSummary,
    turns_total: csSafeNumber(mergedCoverage.totals.turns),
    action_rows_total: csSafeNumber(mergedCoverage.totals.action_rows),
    damage_events_total: csSafeNumber(mergedCoverage.totals.damage_events),
    effect_events_total: csSafeNumber(mergedCoverage.totals.effect_events),
    replay_cards_scanned: csSafeNumber(mergedCoverage.totals.replay_cards_scanned),
    targeted_sweep_runs: csSafeNumber(mergedCoverage.totals.targeted_sweep_runs),
    branch_matrix_runs: csSafeNumber(mergedCoverage.totals.branch_matrix_runs),
    qa_coverage_summary: mergedCoverage,
    coverage_breakdown: {
      retained_replay_card_summary: retainedReplayCardSummary,
      full_artifact_summary: mergedCoverage,
      targeted_sweep_summary: targetedSweep && targetedSweep.qa_coverage_summary ? targetedSweep.qa_coverage_summary : null,
      forced_branch_matrix_summary: branchMatrix && branchMatrix.qa_coverage_summary ? branchMatrix.qa_coverage_summary : null,
      tactical_sweep_summary: tacticalSweepCoverageSummary,
      note: 'qa_coverage_summary is the full-artifact summary. Use retained_replay_card_summary for the 240 retained replay cards only; targeted and tactical sweep evidence may add extra totals.'
    },
    targeted_qa_sweep: targetedSweep,
    forced_branch_matrix: branchMatrix,
    tactical_sweep: tacticalSweep,
    stress_lite: stressLite,
    stress_lite_summary: stressLiteSummary,
    branch_move_analysis: branchMoveAnalysis,
    retained: {
      sim_log: retainedSimLog,
      team_history: retainedTeamHistory,
      replay_cards: retainedReplayCards
    },
    db: {
      enabled: !!(adapter && adapter.enabled),
      branch_coverage: {
        loaded_rows: branchMatrixDbRows.length,
        save_result: branchMatrixDbSave && branchMatrixDbSave.error
          ? Object.assign({}, branchMatrixDbSave, { error: csNormalizeEvidenceError(branchMatrixDbSave.error) })
          : branchMatrixDbSave
      },
      note: 'Supabase stores approved source data, teams, overrides, and saved analysis history. The deterministic browser runtime still uses generated/static data plus runtime_data.js for battle execution.'
    }
  };
  payload.codex_context = csBuildCodexQaContext({
    schema_version: payload.schema_version,
    exported_at: exportedAt,
    build_id: buildId,
    source_url: sourceUrl,
    player_team_id: key,
    player_team_name: team && team.name ? team.name : null,
    current_format: payload.current_format,
    qa_run_type: qaRunType,
    qa_coverage_summary: mergedCoverage,
    summary: artifactSummary,
    retained: payload.retained,
    tactical_sweep: tacticalSweep,
    stress_lite: stressLite,
    stress_lite_summary: stressLiteSummary,
    branch_move_analysis: branchMoveAnalysis
  });
  payload.ready_for_codex = payload.codex_context.ready_for_codex;
  payload.next_missing_proof = payload.codex_context.next_missing_proof;
  payload.recommended_next_test = payload.codex_context.recommended_next_test;
  payload.stress_lite_josh_validation = stressLite ? {
    schema_version: 'champions-stress-lite-josh-validation-v1',
    purpose: 'Compact proof that the sim is making the right calculations and applying expected battle logic without requiring a massive file.',
    calculation_proof: {
      damage_events_total: csSafeNumber(mergedCoverage.totals.damage_events),
      effect_events_total: csSafeNumber(mergedCoverage.totals.effect_events),
      move_rule_trace_rows: csSafeNumber(mergedCoverage.totals.move_rule_trace_rows),
      replay_cards_retained_for_sampling: retainedReplayCards.length,
      sim_log_rows_retained_for_sampling: retainedSimLog.length,
      team_history_rows_retained_for_sampling: retainedTeamHistory.length
    },
    logic_proof: {
      contact_move_audit_summary: mergedCoverage.contact_move_audit_summary || null,
      decision_opportunity_summary: mergedCoverage.decision_opportunity_summary || null,
      branch_move_analysis_totals: branchMoveAnalysis && branchMoveAnalysis.totals ? branchMoveAnalysis.totals : null,
      next_missing_proof: payload.next_missing_proof,
      ready_for_codex: payload.ready_for_codex
    },
    review_notes: [
      'Use qa_coverage_summary for totals and missing-proof gates.',
      'Use retained replay cards for concrete damage/effect examples.',
      'Use contact audit and move rule trace totals to catch bad move metadata.',
      'Use branch matrix and targeted sweep summaries to verify tactical coverage.'
    ]
  } : null;
  payload = csApplyStressLiteArtifactBudget(payload, options);
  payload.proof_manifest = csBuildQaProofManifest(payload);
  try {
    csRememberCoachBrainSummary(mergedCoverage && mergedCoverage.coach_brain_summary, {
      player_team_id: key,
      player_team_signature: team && typeof teamSignature === 'function' ? teamSignature(team) : null,
      format: payload.current_format
    });
  } catch (_coachMemoryErr) {}
  return payload;
}

async function csExportQaArtifactJson(teamKey, opts) {
  opts = opts || {};
  var payload = await csBuildQaArtifactExport(teamKey, opts);
  var ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  await _saveQaArtifactBlob('champions-sim-qa-artifact-' + ts + '.json', 'application/json', JSON.stringify(payload, null, 2), opts);
  return payload;
}

// Wire history filter buttons
document.querySelectorAll('.history-filter-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.history-filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    historyFilter = btn.dataset.filter || 'all';
    renderHistorySection();
  });
});

document.getElementById('export-history-json-btn')?.addEventListener('click', function() {
  csExportMyDataJson(csGetActivePlayerKey()).catch(function(e) {
    UILog.warn('export my data failed', e);
    alert('Could not export history: ' + (e && e.message ? e.message : 'unknown error'));
  });
});

document.getElementById('export-qa-artifact-json-btn')?.addEventListener('click', function() {
  csExportQaArtifactJson(csGetActivePlayerKey()).catch(function(e) {
    UILog.warn('export QA artifact failed', e);
    alert('Could not export QA artifact: ' + (e && e.message ? e.message : 'unknown error'));
  });
});

document.getElementById('qa-drop-folder-btn')?.addEventListener('click', function() {
  csChooseQaDropFolder().catch(function(e) {
    UILog.warn('QA drop folder selection failed', e);
    alert('Could not set QA drop folder: ' + (e && e.message ? e.message : 'unknown error'));
  });
});

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.history.loadAnalysisHistory = loadAnalysisHistory;
  ChampionsSim.history.renderHistorySection = renderHistorySection;
  ChampionsSim.history.buildMyDataExport = csBuildMyDataExport;
  ChampionsSim.history.exportMyDataJson = csExportMyDataJson;
  ChampionsSim.history.buildQaCoverageSummary = csBuildQaCoverageSummary;
  ChampionsSim.history.mergeQaCoverageSummaries = csMergeQaCoverageSummaries;
  ChampionsSim.history.buildTargetedQaSweepEvidence = csBuildTargetedQaSweepEvidence;
  ChampionsSim.history.buildForcedBranchMatrixSweepEvidence = csBuildForcedBranchMatrixSweepEvidence;
  ChampionsSim.history.analyzeBranchCoverageRows = csAnalyzeBranchCoverageRows;
  ChampionsSim.history.summarizeBranchTactics = csSummarizeBranchTactics;
  ChampionsSim.history.rememberBranchMoveAnalysis = csRememberBranchMoveAnalysis;
  ChampionsSim.history.loadBranchStrategyMemory = csLoadBranchStrategyMemory;
  ChampionsSim.history.rememberCoachBrainSummary = csRememberCoachBrainSummary;
  ChampionsSim.history.loadCoachBrainMemory = csLoadCoachBrainMemory;
  ChampionsSim.history.latestCoachBrainForTeam = csLatestCoachBrainForTeam;
  ChampionsSim.history.buildQaArtifactExport = csBuildQaArtifactExport;
  ChampionsSim.history.exportQaArtifactJson = csExportQaArtifactJson;
  ChampionsSim.history.buildCodexQaContext = csBuildCodexQaContext;
  ChampionsSim.history.buildStressLiteOptions = csBuildStressLiteOptions;
  ChampionsSim.history.chooseQaDropFolder = csChooseQaDropFolder;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('loadAnalysisHistory', loadAnalysisHistory);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderHistorySection', renderHistorySection);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildMyDataExport', csBuildMyDataExport);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csExportMyDataJson', csExportMyDataJson);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildQaArtifactExport', csBuildQaArtifactExport);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csExportQaArtifactJson', csExportQaArtifactJson);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildCodexQaContext', csBuildCodexQaContext);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildStressLiteOptions', csBuildStressLiteOptions);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csAnalyzeBranchCoverageRows', csAnalyzeBranchCoverageRows);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSummarizeBranchTactics', csSummarizeBranchTactics);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csLoadBranchStrategyMemory', csLoadBranchStrategyMemory);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRememberCoachBrainSummary', csRememberCoachBrainSummary);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csLoadCoachBrainMemory', csLoadCoachBrainMemory);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csLatestCoachBrainForTeam', csLatestCoachBrainForTeam);
// __M6_HISTORY_END__

// ============================================================
// GLOBAL SIMULATION RESULTS STORE
// ============================================================
ChampionsSim.state.lastResults = {};

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
// BRING_MODE[teamKey] = 'manual' | 'random' | 'auto'. Defaults to 'manual' for the
// player slot and 'random' for every other team (opponents reroll per series).
var BRING_MODE = {};
// localStorage persistence keyed by teamKey + format so each format keeps its
// own bring order. Saved on every setBringFor / setBringMode mutation.
const _BRING_LS_KEY = 'poke-sim:bring:v1';
function _loadBringState() {
  try {
    const obj = (typeof Storage !== 'undefined') ? Storage.get('bring:default') : null;
    if (obj && typeof obj === 'object') {
      if (obj.selection && typeof obj.selection === 'object') BRING_SELECTION = obj.selection;
      if (obj.mode      && typeof obj.mode      === 'object') BRING_MODE      = obj.mode;
    }
  } catch (e) { /* corrupt storage — ignore */ }
}
function _saveBringState() {
  try {
    if (typeof Storage !== 'undefined') Storage.set('bring:default', { selection: BRING_SELECTION, mode: BRING_MODE });
  } catch (e) { /* quota / private mode — ignore */ }
}
_loadBringState();

function getBringCount() {
  return (currentFormat === 'singles') ? 3 : 4;
}
function getLeadCount() {
  return (currentFormat === 'singles') ? 1 : 2;
}
function _normalizeBringOrder(teamKey, names) {
  var team = TEAMS[teamKey];
  if (!team || !Array.isArray(team.members)) return [];
  var count = getBringCount();
  var seen = Object.create(null);
  var out = [];
  var source = Array.isArray(names) ? names : [];
  for (var i = 0; i < source.length && out.length < count; i++) {
    var n = source[i];
    if (!n || seen[n]) continue;
    if (!team.members.some(function(m) { return m.name === n; })) continue;
    seen[n] = true;
    out.push(n);
  }
  for (var j = 0; j < team.members.length && out.length < count; j++) {
    var monName = team.members[j] && team.members[j].name;
    if (!monName || seen[monName]) continue;
    seen[monName] = true;
    out.push(monName);
  }
  return out.slice(0, count);
}
function getBringMode(teamKey) {
  // Guard for early-load invocations (renderTeamsGrid fires before the var
  // initializer for BRING_MODE runs; var hoists declaration but leaves undefined).
  if (typeof BRING_MODE !== 'undefined' && BRING_MODE && BRING_MODE[teamKey]) return BRING_MODE[teamKey];
  // Default: player slot is manual, every other team is random.
  return (teamKey === currentPlayerKey) ? 'manual' : 'random';
}
function setBringMode(teamKey, mode) {
  BRING_MODE[teamKey] = (mode === 'random' || mode === 'auto') ? mode : 'manual';
  _saveBringState();
}
function getBringFor(teamKey) {
  const team = TEAMS[teamKey];
  if (!team) return [];
  // Guard for early-load (var hoisted, initializer not yet run).
  const picked = (typeof BRING_SELECTION !== 'undefined' && BRING_SELECTION && BRING_SELECTION[teamKey]) ? BRING_SELECTION[teamKey] : [];
  return _normalizeBringOrder(teamKey, picked);
}
function setBringFor(teamKey, names) {
  const arr = _normalizeBringOrder(teamKey, names);
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
ChampionsSim.bring.BRING_SELECTION = BRING_SELECTION;
ChampionsSim.bring.BRING_MODE = BRING_MODE;
ChampionsSim.bring.getBringFor = getBringFor;
ChampionsSim.bring.setBringFor = setBringFor;
ChampionsSim.bring.getBringMode = getBringMode;
ChampionsSim.bring.setBringMode = setBringMode;
ChampionsSim.bring.randomBringFor = randomBringFor;
ChampionsSim.bring.getLeadsFor = getLeadsFor;
ChampionsSim.bring.setLeadsFor = setLeadsFor;
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('BRING_SELECTION', BRING_SELECTION);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('BRING_MODE', BRING_MODE);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('getBringFor', getBringFor);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('setBringFor', setBringFor);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('getBringMode', getBringMode);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('setBringMode', setBringMode);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('randomBringFor', randomBringFor);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('getLeadsFor', getLeadsFor);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('setLeadsFor', setLeadsFor);

async function runBoSeries(numSeries, playerTeamKey, oppTeamKey, bo, onProgress) {
  if (!isSimReadyTeam(playerTeamKey, TEAMS[playerTeamKey], { includeCustom: true })) {
    throw new Error('player team not loaded: ' + (playerTeamKey || 'none'));
  }
  if (!isSimReadyTeam(oppTeamKey, TEAMS[oppTeamKey], { includeCustom: true })) {
    throw new Error('opponent team not loaded: ' + (oppTeamKey || 'none'));
  }
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

      // Phase 4a (Refs #52) — capture every game of this series so we can
      // append one sim-log entry per series at the end.
      const seriesBattles = [];

      while (seriesW<gamesNeeded && seriesL<gamesNeeded && gamesPlayed<bo) {
        const battle = simulateBattle(TEAMS[playerTeamKey], TEAMS[oppTeamKey], {
          format: currentFormat,
          playerBring,
          opponentBring,
          roleAwareOpeners: true
        });
        if (battle.result==='win') seriesW++;
        else if (battle.result==='loss') seriesL++;
        else { seriesW+=0.5; seriesL+=0.5; }
        seriesTurns+=battle.turns;
        seriesTrTurns+=battle.trTurns;
        gamesPlayed++;
        results.turnDist[battle.turns]=(results.turnDist[battle.turns]||0)+1;
        if (battle.winCondition) results.winConditions[battle.winCondition]=(results.winConditions[battle.winCondition]||0)+1;
        if (results.allLogs.length<50) results.allLogs.push({...battle, playerKey:playerTeamKey, oppKey:oppTeamKey, format:currentFormat});
        seriesBattles.push(battle);
      }

      const seriesResult = seriesW>seriesL?'wins':seriesW<seriesL?'losses':'draws';
      results[seriesResult]++;
      if (seriesResult==='wins') liveW++;
      if (seriesResult==='losses') liveL++;
      results.totalTurns += seriesTurns/gamesPlayed;
      results.totalTrTurns += seriesTrTurns/gamesPlayed;

      // Phase 4a — append one entry per series to the sim log. Wrapped in
      // try so a storage failure never kills the sim run.
      try {
        if (typeof csSimLogAppendSeries === 'function') {
          // Map plural 'wins'/'losses'/'draws' to singular for storage.
          const srOut = seriesResult === 'wins' ? 'win'
                      : seriesResult === 'losses' ? 'loss'
                      : 'draw';
          csSimLogAppendSeries({
            playerKey: playerTeamKey,
            oppKey: oppTeamKey,
            format: currentFormat,
            bo: bo,
            battleResults: seriesBattles,
            seriesResult: srOut
          });
        }
      } catch (e) {
        UILog.warn('simlog append in runBoSeries failed', e);
      }
    }
    if (onProgress) onProgress(i+bSize, numSeries, liveW, liveL);
    await new Promise(r=>setTimeout(r,0));
  }

  results.allLogs = results.allLogs.map(function(battle) {
    return csCapBattleReplay(battle);
  });
  results.winRate = results.wins/numSeries;
  results.avgTurns = results.totalTurns/numSeries;
  results.avgTrTurns = results.totalTrTurns/numSeries;
  results.playerKey = playerTeamKey;
  results.oppKey = oppTeamKey;
  results.bo = bo;
  results.format = currentFormat;
  return results;
}

// runAllMatchupsUI — UI wrapper; distinct from engine.js runAllMatchups
// Issue #T6: when LADDER_MODE is ON, iterate only ladder-legal opponents.
async function runAllMatchupsUI(numSeries, bo, onProgress, onDone, simCtx) {
  simCtx = simCtx || resolveSimContext({ numSeries: numSeries, bo: bo });
  var playerKey = simCtx.playerKey;
  const opps = getRunAllOpponentKeys(playerKey, simCtx);
  if (!opps.length) throw new Error('no opponents available for ' + getSimScopeLabel(simCtx.simScope || getSimScopeMode()));
  let done=0;
  for (const opp of opps) {
    const res = await runBoSeries(numSeries,playerKey,opp,bo,(cur,tot,w,l)=>{
      if (onProgress) onProgress(done*numSeries+cur, opps.length*numSeries, w, l);
    });
    done++;
    if (onDone) onDone(opp, res);
    // M4: persist each matchup result to Supabase (fire-and-forget)
    try {
      var _adapter = getWindowValue('SupabaseAdapter', null);
      if (_adapter && _adapter.enabled) {
        Promise.resolve(_adapter.saveAnalysis(_buildAnalysisPayload(playerKey, opp, bo, res)))
          .catch(function(e) { UILog.warn('run-all saveAnalysis failed', e); });
      }
    } catch (_m4e) { UILog.warn('run-all payload build failed', _m4e); }
  }
}

// __M4_BUILD_PAYLOAD_BEGIN__
// ============================================================
// M4 — _buildAnalysisPayload: builds the canonical payload for SupabaseAdapter.saveAnalysis
// ============================================================
var _M4_VALID_BO = [1, 3, 5, 10];

function _stripTurnLogForPersistence(logRow) {
  if (!logRow || typeof logRow !== 'object') return logRow;
  return {
    result: logRow.result || null,
    turns: logRow.turns || 0,
    trTurns: logRow.trTurns || 0,
    tr_turns: logRow.tr_turns || logRow.trTurns || 0,
    winCondition: logRow.winCondition || null,
    win_condition: logRow.win_condition || logRow.winCondition || null,
    seed: logRow.seed || null,
    log: Array.isArray(logRow.log) ? logRow.log.slice(0, 200) : (logRow.log || []),
    position_path: Array.isArray(logRow.position_path) ? logRow.position_path.slice(0, 40) : [],
    turning_point: logRow.turning_point || null
  };
}

function _buildAnalysisPayload(playerKey, oppKey, bo, res) {
  if (_M4_VALID_BO.indexOf(bo) === -1) {
    throw new Error('[M4] _buildAnalysisPayload: invalid bo=' + bo + ' — must be one of 1,3,5,10');
  }

  var policyModel = (res && res.policy_model);
  if (policyModel === undefined) {
    policyModel = 'deterministic-v1'; // Default only if not provided
  }
  if (!policyModel || typeof policyModel !== 'string' || policyModel.length === 0) {
    throw new Error('[M4] _buildAnalysisPayload: policy_model must be non-empty string');
  }

  var wins   = (res && res.wins)   || 0;
  var losses = (res && res.losses) || 0;
  var draws  = (res && res.draws)  || 0;
  var sampleSize = wins + losses + draws;
  var winRate = sampleSize > 0 ? wins / sampleSize : 0;

  if (typeof res.win_rate === 'number') { winRate = res.win_rate; }
  if (typeof res.winRate  === 'number') { winRate = res.winRate; }
  if (winRate < 0 || winRate > 1) {
    throw new Error('[M4] _buildAnalysisPayload: win_rate out of [0,1]: ' + winRate);
  }

  var rulesetId = 'champions_reg_m_doubles_bo3';
  if (typeof TEAMS !== 'undefined' && TEAMS[playerKey] && TEAMS[playerKey].metadata && TEAMS[playerKey].metadata.ruleset_id) {
    rulesetId = TEAMS[playerKey].metadata.ruleset_id;
  }
  var rulesetEvidence = typeof getRulesetEvidencePolicy === 'function'
    ? getRulesetEvidencePolicy(rulesetId)
    : {
      ruleset_id: rulesetId,
      ruleset_status: 'unknown',
      runtime_promotable: false,
      learning_eligibility: 'unknown',
      data_policy: 'unknown',
      coaching_policy: 'unknown',
      poisoning_guard: 'unknown_ruleset_do_not_train_or_rank'
    };

  var engineVersion = (typeof window === 'undefined') ? '1.0.0' : (window['ENGINE_VERSION'] || '1.0.0');

  var winConditions = [];
  if (res && res.winConditions && typeof res.winConditions === 'object') {
    var wcObj = res.winConditions;
    var keys = Object.keys(wcObj);
    for (var i = 0; i < keys.length; i++) {
      winConditions.push({ label: keys[i], count: wcObj[keys[i]] });
    }
  }
  if (res && Array.isArray(res.win_conditions)) {
    winConditions = res.win_conditions;
  }

  var logs = [];
  if (res && res.allLogs && Array.isArray(res.allLogs)) {
    logs = res.allLogs.slice(0, 50).map(_stripTurnLogForPersistence);
  }
  if (res && Array.isArray(res.logs)) {
    logs = res.logs.slice(0, 50).map(_stripTurnLogForPersistence);
  }

  var analysisJson = (res && res.analysis_json) || {};
  if (res && res.turning_point && !analysisJson.turning_point) analysisJson.turning_point = res.turning_point;
  if (res && Array.isArray(res.position_path) && !analysisJson.position_path) {
    analysisJson.position_path = res.position_path.slice(0, 40);
  }
  if (res && !analysisJson.pilot_summary) {
    analysisJson.pilot_summary = {
      player_team_id: playerKey,
      opp_team_id: oppKey,
      top_win_conditions: winConditions.slice(0, 5),
      sample_size: sampleSize,
      win_rate: winRate
    };
  }

  var ciLow  = (res && typeof res.ci_low  === 'number') ? res.ci_low  : 0;
  var ciHigh = (res && typeof res.ci_high === 'number') ? res.ci_high : 1;
  if (sampleSize > 0) {
    var z = 1.96;
    var p = winRate;
    var denom = 1 + z * z / sampleSize;
    ciLow  = Math.max(0, (p + z * z / (2 * sampleSize) - z * Math.sqrt(p * (1 - p) / sampleSize + z * z / (4 * sampleSize * sampleSize))) / denom);
    ciHigh = Math.min(1, (p + z * z / (2 * sampleSize) + z * Math.sqrt(p * (1 - p) / sampleSize + z * z / (4 * sampleSize * sampleSize))) / denom);
  }

  return {
    engine_version:    engineVersion,
    ruleset_id:        rulesetId,
    ruleset_status:    rulesetEvidence.ruleset_status,
    learning_eligibility: rulesetEvidence.learning_eligibility,
    data_policy:       rulesetEvidence.data_policy,
    coaching_policy:   rulesetEvidence.coaching_policy,
    poisoning_guard:   rulesetEvidence.poisoning_guard,
    source_checked_at_utc: rulesetEvidence.source_checked_at_utc,
    player_team_id:    playerKey,
    opp_team_id:       oppKey,
    prior_id:          (res && res.prior_id) || null,
    policy_model:      policyModel,
    sample_size:       sampleSize,
    bo:                bo,
    win_rate:          winRate,
    wins:              wins,
    losses:            losses,
    draws:             draws,
    avg_turns:         (res && res.avgTurns)   || (res && res.avg_turns)    || 0,
    avg_tr_turns:      (res && res.avgTrTurns) || (res && res.avg_tr_turns) || 0,
    ci_low:            ciLow,
    ci_high:           ciHigh,
    hidden_info_model: (res && res.hidden_info_model) || null,
    analysis_json:     analysisJson,
    win_conditions:    winConditions,
    logs:              logs
  };
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.internal.buildAnalysisPayload = _buildAnalysisPayload;
}
if (typeof exposeLegacyWindowAlias !== 'function') {
  var exposeLegacyWindowAlias = function(name, value) {
    if (typeof window === 'undefined') return;
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  };
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('_buildAnalysisPayload', _buildAnalysisPayload);
// __M4_BUILD_PAYLOAD_END__

// __M5_UPSERT_TEAM_BEGIN__
// ============================================================
// M5 — _upsertTeamToDB: persists imported/edited teams to Supabase
// ============================================================
function _upsertTeamToDB(teamId, team, source) {
  try {
    var adapter = (typeof window === 'undefined') ? null : window['SupabaseAdapter'];
    if (!adapter || !adapter.enabled || typeof adapter.saveTeam !== 'function') {
      return; // Adapter not available or disabled — graceful no-op
    }
    var guardErrors = [];
    if (typeof getChampionSpreadErrorsForTeam === 'function') {
      guardErrors = guardErrors.concat(getChampionSpreadErrorsForTeam(team));
    }
    if (typeof validateTeam === 'function') {
      var verdict = validateTeam(team, 'vgc') || {};
      guardErrors = guardErrors.concat(verdict.errors || []);
    }
    if (guardErrors.length) {
      UILog.warn('Refusing to persist illegal Champion team to DB', {
        team_id: teamId,
        source: source || 'unknown',
        errors: guardErrors.slice(0, 6)
      });
      return;
    }

    var members = (team && Array.isArray(team.members)) ? team.members : [];
    var payload = {
      team_id:     teamId,
      name:        (team && team.name) || 'Unknown Team',
      label:       (team && team.label) || 'CUSTOM',
      mode:        'opponent',
      ruleset_id:  (adapter.DEFAULT_RULESET_ID) || 'champions_reg_m_doubles_bo3',
      source:      source || (team && team.source) || 'unknown',
      description: (team && team.description) || '',
      metadata:    {
        source: source || 'unknown',
        format: (team && team.format) || 'champions',
        legality_status: (team && team.legality_status) || 'unverified',
        import_warnings: (team && team.import_warnings) || [],
        import_errors: (team && team.import_errors) || [],
        showdown_source_version: (team && team.showdown_source_version) || ''
      },
      members:     members.map(function(m) {
        return {
          name:      m.name      || m.species || 'Unknown',
          species:   m.species   || m.name    || 'Unknown',
          ability:   m.ability   || null,
          item:      m.item      || null,
          nature:    m.nature    || null,
          evs:       m.evs       || null,
          ivs:       m.ivs       || null,
          moves:     ((team && team.format) === 'champions' && Array.isArray(m.moves))
            ? m.moves.filter(function(move) { return move !== 'Tera Blast'; })
            : (m.moves || []),
          level:     m.level     || 50,
          tera_type: (team && team.format) === 'champions' ? null : (m.tera_type || m.teraType || null)
        };
      })
    };

    Promise.resolve(adapter.saveTeam(payload))
      .catch(function(e) { UILog.warn('_upsertTeamToDB failed', e); });
  } catch (err) {
    UILog.warn('_upsertTeamToDB error', err);
  }
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.internal.upsertTeamToDB = _upsertTeamToDB;
}
if (typeof exposeLegacyWindowAlias !== 'function') {
  var exposeLegacyWindowAlias = function(name, value) {
    if (typeof window === 'undefined') return;
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: value
    });
  };
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('_upsertTeamToDB', _upsertTeamToDB);
// __M5_UPSERT_TEAM_END__

// ============================================================
// SIM BUTTON HANDLERS
// ============================================================
let simRunning = false;

function setProgress(pct, label, w, l) {
  document.getElementById('progress-fill').style.width=pct+'%';
  document.getElementById('progress-label').textContent=label;
  if (w!==undefined) {
    var winsEl = document.getElementById('live-wins');
    var lossesEl = document.getElementById('live-losses');
    winsEl.textContent=w+'W';
    lossesEl.textContent=l+'L';
    winsEl.style.color = 'var(--green)';
    lossesEl.style.color = 'var(--red)';
    const total=w+l;
    document.getElementById('live-pct').textContent=total?Math.round(w/total*100)+'%':'—';
  }
}

function setBranchProgress(pct, label, meta) {
  meta = meta || {};
  var safePct = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  document.getElementById('progress-fill').style.width = safePct + '%';
  document.getElementById('progress-label').textContent = label;
  var left = document.getElementById('live-wins');
  var mid = document.getElementById('live-losses');
  var right = document.getElementById('live-pct');
  if (left) {
    var idx = Number(meta.opponent_index || 0);
    var count = Number(meta.opponent_count || 0);
    left.textContent = count ? (idx ? idx + '/' + count : '0/' + count) : '0/0';
    left.style.color = 'var(--blue)';
  }
  if (mid) {
    var savedRows = Number(meta.saved_rows || 0);
    var testedRows = Number(meta.executed_runs || 0);
    if (savedRows && testedRows && savedRows !== testedRows) {
      mid.textContent = savedRows + ' saved · ' + testedRows + ' runs';
    } else if (savedRows) {
      mid.textContent = savedRows + ' rows';
    } else if (testedRows) {
      mid.textContent = testedRows + ' runs';
    } else {
      mid.textContent = '0 rows';
    }
    mid.style.color = 'var(--green)';
  }
  if (right) right.textContent = safePct + '%';
}

function setSimError(err) {
  var msg = (err && err.message) ? err.message : String(err || 'Unknown simulation error');
  UILog.error('Simulation run failed', err);
  var wrap = document.getElementById('progress-wrap');
  var fill = document.getElementById('progress-fill');
  var label = document.getElementById('progress-label');
  if (wrap) wrap.style.display = '';
  if (fill) fill.style.width = '100%';
  if (label) label.textContent = 'Simulation failed: ' + msg;
}

function csGetPublicBetaGuardProfile() {
  var matchMediaFn = getWindowValue('matchMedia', null);
  var isCoarsePointer = false;
  var isNarrowViewport = false;
  try {
    isCoarsePointer = !!(matchMediaFn && matchMediaFn('(hover: none) and (pointer: coarse)').matches);
    isNarrowViewport = !!(matchMediaFn && matchMediaFn('(max-width: 760px)').matches);
  } catch (_e) {}
  var deviceMemory = 0;
  try {
    deviceMemory = Number(navigator && navigator.deviceMemory || 0);
  } catch (_e2) {}
  var isLowMemory = !!(deviceMemory && deviceMemory <= 4);
  var shouldForceStressLite = isLowMemory || (isCoarsePointer && isNarrowViewport);
  return {
    is_coarse_pointer: isCoarsePointer,
    is_narrow_viewport: isNarrowViewport,
    device_memory_gb: deviceMemory || null,
    is_low_memory: isLowMemory,
    should_force_stress_lite: shouldForceStressLite,
    max_series_value: shouldForceStressLite ? 500 : 10000,
    max_tactical_depth_value: shouldForceStressLite ? 250 : null
  };
}

function csApplyPublicBetaGuardrails() {
  var profile = csGetPublicBetaGuardProfile();
  var noteEl = document.getElementById('beta-guard-note');
  var runAllBtn = document.getElementById('run-all-btn');
  var qaRunBtn = document.getElementById('run-all-export-qa-btn');
  var simCountEl = document.getElementById('sim-count');
  var tacticalDepthEl = document.getElementById('tactical-depth');
  if (!profile.should_force_stress_lite) {
    if (runAllBtn) {
      runAllBtn.disabled = false;
      runAllBtn.title = 'Run all matchups across the current scope';
    }
    if (qaRunBtn) {
      qaRunBtn.disabled = false;
      qaRunBtn.title = 'Run all matchups, then download one retained-evidence QA Artifact JSON';
    }
    if (noteEl) noteEl.style.display = 'none';
    return profile;
  }
  if (runAllBtn) {
    runAllBtn.disabled = true;
    runAllBtn.title = 'Hard beta guard: Run All is disabled on mobile/low-memory devices. Use Stress Lite + QA.';
  }
  if (qaRunBtn) {
    qaRunBtn.disabled = true;
    qaRunBtn.title = 'Hard beta guard: Run All + QA is disabled on mobile/low-memory devices. Use Stress Lite + QA.';
  }
  if (simCountEl && simCountEl.options) {
    for (var i = 0; i < simCountEl.options.length; i++) {
      var simOpt = simCountEl.options[i];
      var simValue = Number(simOpt && simOpt.value || 0);
      if (!simValue) continue;
      simOpt.disabled = simValue > profile.max_series_value;
    }
    if (Number(simCountEl.value || 0) > profile.max_series_value) simCountEl.value = String(profile.max_series_value);
  }
  if (tacticalDepthEl && tacticalDepthEl.options) {
    for (var j = 0; j < tacticalDepthEl.options.length; j++) {
      var depthOpt = tacticalDepthEl.options[j];
      var depthValue = depthOpt && depthOpt.value;
      if (!depthValue) continue;
      depthOpt.disabled = depthValue === 'all' || Number(depthValue) > Number(profile.max_tactical_depth_value || 999999);
    }
    if (tacticalDepthEl.value === 'all' || Number(tacticalDepthEl.value || 0) > Number(profile.max_tactical_depth_value || 999999)) {
      tacticalDepthEl.value = String(profile.max_tactical_depth_value);
    }
  }
  if (noteEl) {
    noteEl.textContent = 'Hard beta guard active on this device: Run All is disabled, Stress Lite + QA is the safe path, series are capped at 500, and full branch coverage is blocked to protect phones and low-memory browsers.';
    noteEl.style.display = '';
  }
  return profile;
}

document.getElementById('run-sim-btn')?.addEventListener('click', async function() {
  if (simRunning) return;
  var runBtn = this;
  var allBtn = document.getElementById('run-all-btn');
  var qaRunBtn = document.getElementById('run-all-export-qa-btn');
  var tacticalSweepBtn = document.getElementById('tactical-sweep-qa-btn');
  var stressLiteBtn = document.getElementById('stress-lite-qa-btn');
  simRunning=true; runBtn.disabled=true; if (allBtn) allBtn.disabled=true; if (qaRunBtn) qaRunBtn.disabled=true; if (tacticalSweepBtn) tacticalSweepBtn.disabled=true; if (stressLiteBtn) stressLiteBtn.disabled=true;
  try {
    document.getElementById('results-section').style.display='none';
    document.getElementById('progress-wrap').style.display='';
    setProgress(0,'Starting…',0,0);

    var swappedOpp = enforceDistinctBattleTeams();
    if (swappedOpp && TEAMS[swappedOpp]) {
      document.getElementById('opp-team-name').textContent = TEAMS[swappedOpp].name;
      renderRoster('opp-roster', TEAMS[swappedOpp].members);
      if (typeof renderSimBringPickers === 'function') renderSimBringPickers();
    }
    var simCtx = resolveSimContext();
    var playerKey = simCtx.playerKey;
    const oppKey=simCtx.oppKey;
    const n=simCtx.numSeries;
    const bo=simCtx.bo;
    if (!Number.isFinite(n) || n < 1) throw new Error('invalid simulation count');
    const matBadge=document.getElementById('matrix-badge');
    if(matBadge) matBadge.textContent=`${simCtx.formatLabel} · Bo${bo} · ${formatSeriesCount(n)} series`;

    const res = await runBoSeries(n,playerKey,oppKey,bo,(cur,tot,w,l)=>{
      setProgress(Math.round(cur/tot*100),`Running… ${cur} / ${tot}`,w,l);
    });

    document.getElementById('progress-wrap').style.display='none';
    displayResults(res, oppKey, simCtx);
    // Refs #95 - also populate the Pilot Guide tab after a single sim so the
    // tab isn't stuck on its empty-state message. generatePilotGuide is
    // upsert-by-oppKey, so re-running the same matchup replaces its card.
    try { generatePilotGuide(oppKey, res, simCtx); } catch (e) { UILog.warn('single-sim Pilot Guide populate failed', e); }
    // Cache for Run All parity - keeps PDF builder and strategy rebuild in sync.
    try { if (ChampionsSim.state.lastResults) ChampionsSim.state.lastResults[oppKey] = res; } catch(_){}
    // M4: persist single-sim result to Supabase (fire-and-forget)
    try {
      var _adapter = getWindowValue('SupabaseAdapter', null);
      if (_adapter && _adapter.enabled) {
        Promise.resolve(_adapter.saveAnalysis(_buildAnalysisPayload(playerKey, oppKey, bo, res)))
          .catch(function(e) { UILog.warn('single-sim saveAnalysis failed', e); });
      }
    } catch (_m4e) { UILog.warn('single-sim payload build failed', _m4e); }
  } catch (e) {
    setSimError(e);
  } finally {
    simRunning=false; runBtn.disabled=false; if (allBtn) allBtn.disabled=false; if (qaRunBtn) qaRunBtn.disabled=false; if (tacticalSweepBtn) tacticalSweepBtn.disabled=false; if (stressLiteBtn) stressLiteBtn.disabled=false;
  }
});

ChampionsSim.battle = ChampionsSim.battle || {};
ChampionsSim.battle.enforceDistinctBattleTeams = enforceDistinctBattleTeams;
ChampionsSim.battle.resolveSimContext = resolveSimContext;
ChampionsSim.battle.normalizeTeamCatalogForSim = normalizeTeamCatalogForSim;
ChampionsSim.battle.getRunAllOpponentKeys = getRunAllOpponentKeys;
ChampionsSim.battle.getSimScopeMode = getSimScopeMode;
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('enforceDistinctBattleTeams', enforceDistinctBattleTeams);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('resolveSimContext', resolveSimContext);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('normalizeTeamCatalogForSim', normalizeTeamCatalogForSim);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('getRunAllOpponentKeys', getRunAllOpponentKeys);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('getSimScopeMode', getSimScopeMode);

async function csRunAllMatchupsFromButton(allBtn, opts) {
  if (simRunning) return;
  opts = opts || {};
  var runBtn = document.getElementById('run-sim-btn');
  var qaRunBtn = document.getElementById('run-all-export-qa-btn');
  var tacticalSweepBtn = document.getElementById('tactical-sweep-qa-btn');
  var stressLiteBtn = document.getElementById('stress-lite-qa-btn');
  simRunning=true;
  if (allBtn) allBtn.disabled=true;
  if (runBtn) runBtn.disabled=true;
  if (qaRunBtn) qaRunBtn.disabled=true;
  if (tacticalSweepBtn) tacticalSweepBtn.disabled=true;
  if (stressLiteBtn) stressLiteBtn.disabled=true;
  try {
    document.getElementById('matchup-table-wrap').style.display='';
    document.getElementById('results-section').style.display='none';
    document.getElementById('matchup-tbody').innerHTML='<tr><td colspan="7" style="color:var(--text-m);font-size:12px;text-align:center;padding:20px;font-family:var(--font-mono)">Running all matchups…</td></tr>';

    var simCtx = resolveSimContext();
    const n=simCtx.numSeries;
    const bo=simCtx.bo;
    var playerKey = simCtx.playerKey;
    var runOpps = getRunAllOpponentKeys(playerKey, simCtx);
    if (!Number.isFinite(n) || n < 1) throw new Error('invalid simulation count');
    document.getElementById('progress-wrap').style.display='';
    setProgress(0,'Starting…',0,0);
    const matBadge=document.getElementById('matrix-badge');
    if(matBadge) matBadge.textContent=`${simCtx.formatLabel} · Bo${bo} · ${getRunScopeBadgeText(simCtx, runOpps.length)}`;

    const tbody=document.getElementById('matchup-tbody');
    tbody.innerHTML='';
    let totalW=0,totalL=0;
    var runAllQaReplayCards = [];

    await runAllMatchupsUI(n,bo,(cur,tot,w,l)=>{
      totalW=w; totalL=l;
      setProgress(Math.round(cur/tot*100),`Running matchups… ${cur} / ${tot}`,w,l);
    },(opp,res)=>{
      ChampionsSim.state.lastResults[opp] = res;
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
      (res.allLogs || []).forEach(function(b) {
        runAllQaReplayCards.unshift(Object.assign({}, csCapBattleReplay(b), {
          playerKey: b.playerKey || playerKey,
          oppKey: opp,
          id: Math.random()
        }));
      });
      if (runAllQaReplayCards.length > MAX_REPLAY_CARDS) runAllQaReplayCards.length = MAX_REPLAY_CARDS;
      addReplays(res.allLogs||[], opp, playerKey);
      generatePilotGuide(opp, res, Object.assign({}, simCtx, { oppKey: opp, oppTeam: TEAMS[opp] }));
    }, simCtx);

    document.getElementById('progress-wrap').style.display='none';
    // Refs #57 - progressive reveal helper relabels with the correct matchup
    // count and binds the tooltip. Replaces the old hardcoded display='' line.
    revealPdfButton();
    // T9j.16 (Refs #65) - auto-save Strategy Report after Run All Matchups completes.
    // Persists to localStorage keyed on teamSignature so any imported team gets continuity.
    try { if (typeof t9j16AutoSave === 'function') t9j16AutoSave(); } catch(e) { UILog.warn('autosave skipped', e); }
    // Phase 2 (Refs #46 #49) - rebuild Strategy tab now that fresh sim data is available.
    try { if (typeof csScheduleStrategyRebuild === 'function') csScheduleStrategyRebuild(); } catch(e) { UILog.warn('strategy rebuild skipped', e); }
    if (opts.autoExportQaArtifact) {
      setProgress(100, 'Run All complete. Exporting QA Artifact...', totalW, totalL);
      await csExportQaArtifactJson(playerKey, { replayCardsOverride: runAllQaReplayCards });
      setProgress(100, 'Run All complete. QA Artifact downloaded.', totalW, totalL);
    }
  } catch (e) {
    setSimError(e);
  } finally {
    simRunning=false;
    if (allBtn) allBtn.disabled=false;
    if (runBtn) runBtn.disabled=false;
    if (qaRunBtn) qaRunBtn.disabled=false;
    if (tacticalSweepBtn) tacticalSweepBtn.disabled=false;
    if (stressLiteBtn) stressLiteBtn.disabled=false;
  }
}

document.getElementById('run-all-btn')?.addEventListener('click', async function() {
  if (csGetPublicBetaGuardProfile().should_force_stress_lite) return;
  await csRunAllMatchupsFromButton(this);
});

document.getElementById('run-all-export-qa-btn')?.addEventListener('click', async function() {
  if (csGetPublicBetaGuardProfile().should_force_stress_lite) return;
  await csRunAllMatchupsFromButton(this, { autoExportQaArtifact: true });
});

document.getElementById('stress-lite-qa-btn')?.addEventListener('click', async function() {
  if (simRunning) return;
  var stressBtn = this;
  var runBtn = document.getElementById('run-sim-btn');
  var allBtn = document.getElementById('run-all-btn');
  var qaRunBtn = document.getElementById('run-all-export-qa-btn');
  var tacticalSweepBtn = document.getElementById('tactical-sweep-qa-btn');
  simRunning = true;
  stressBtn.disabled = true;
  if (runBtn) runBtn.disabled = true;
  if (allBtn) allBtn.disabled = true;
  if (qaRunBtn) qaRunBtn.disabled = true;
  if (tacticalSweepBtn) tacticalSweepBtn.disabled = true;
  try {
    document.getElementById('progress-wrap').style.display = '';
    var simCtx = resolveSimContext();
    var stressOptions = csBuildStressLiteOptions(simCtx);
    var stressSavedRows = 0;
    var stressOpponentCount = 0;
    setBranchProgress(0, 'Starting Stress Lite QA with capped browser-safe limits...', { opponent_count: 0, saved_rows: 0 });
    await csExportQaArtifactJson(simCtx.playerKey, Object.assign({}, stressOptions, {
      onBranchMatrixProgress: function(event) {
        event = event || {};
        var count = Number(event.opponent_count || 0);
        var idx = Number(event.opponent_index || 0);
        if (count) stressOpponentCount = count;
        var basePct = count && idx ? Math.round(10 + ((idx - 1) / count) * 78) : 5;
        var teamName = event.opponent_team_id && TEAMS[event.opponent_team_id] && TEAMS[event.opponent_team_id].name
          ? TEAMS[event.opponent_team_id].name
          : (event.opponent_team_id || 'opponent');
        if (event.phase === 'start') {
          setBranchProgress(5, 'Stress Lite planning ' + count + ' capped opponent' + (count === 1 ? '' : 's') + '...', {
            opponent_count: count,
            saved_rows: stressSavedRows
          });
        } else if (event.phase === 'load') {
          setBranchProgress(basePct, 'Stress Lite loading memory ' + idx + ' / ' + count + ': ' + teamName + '...', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: stressSavedRows
          });
        } else if (event.phase === 'build-progress') {
          var runIndex = Number(event.executed_runs || 0);
          var runTotal = Number(event.total_planned_runs || 0);
          var runPct = runTotal ? Math.round((runIndex / Math.max(1, runTotal)) * 70) : 0;
          setBranchProgress(Math.min(92, basePct + runPct), 'Stress Lite testing ' + idx + ' / ' + count + ': ' + teamName + ' (' + runIndex + ' / ' + (runTotal || '?') + ' capped runs)...', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: stressSavedRows,
            executed_runs: runIndex
          });
        } else if (event.phase === 'done') {
          stressSavedRows += Number(event.saved_rows || 0);
          setBranchProgress(Math.min(96, basePct + 8), 'Stress Lite done ' + idx + ' / ' + count + ': saved ' + Number(event.saved_rows || 0) + ' rows', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: stressSavedRows
          });
        } else if (event.phase === 'analyze') {
          setBranchProgress(96, 'Stress Lite analyzing ' + Number(event.executed_runs || 0) + ' capped branch runs...', {
            opponent_index: count,
            opponent_count: count,
            saved_rows: stressSavedRows
          });
        } else if (event.phase === 'complete') {
          stressSavedRows = Number(event.saved_rows || stressSavedRows || 0);
          setBranchProgress(98, 'Stress Lite complete. Preparing QA artifact...', {
            opponent_index: count,
            opponent_count: count,
            saved_rows: stressSavedRows
          });
        }
      }
    }));
    setBranchProgress(100, 'Stress Lite QA Artifact downloaded.', {
      opponent_index: stressOpponentCount,
      opponent_count: stressOpponentCount,
      saved_rows: stressSavedRows
    });
  } catch (e) {
    setSimError(e);
  } finally {
    simRunning = false;
    stressBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
    if (allBtn) allBtn.disabled = false;
    if (qaRunBtn) qaRunBtn.disabled = false;
    if (tacticalSweepBtn) tacticalSweepBtn.disabled = false;
  }
});

document.getElementById('tactical-sweep-qa-btn')?.addEventListener('click', async function() {
  if (simRunning) return;
  var sweepBtn = this;
  var runBtn = document.getElementById('run-sim-btn');
  var allBtn = document.getElementById('run-all-btn');
  var qaRunBtn = document.getElementById('run-all-export-qa-btn');
  var stressLiteBtn = document.getElementById('stress-lite-qa-btn');
  simRunning = true;
  sweepBtn.disabled = true;
  if (runBtn) runBtn.disabled = true;
  if (allBtn) allBtn.disabled = true;
  if (qaRunBtn) qaRunBtn.disabled = true;
  if (stressLiteBtn) stressLiteBtn.disabled = true;
  try {
    document.getElementById('progress-wrap').style.display = '';
    setBranchProgress(0, 'Starting tactical sweep...', { opponent_count: 0, saved_rows: 0 });
    var simCtx = resolveSimContext();
    setBranchProgress(2, 'Building unseen branch coverage for ' + getSimScopeLabel(simCtx.simScope) + '...', { opponent_count: 0, saved_rows: 0 });
    var tacticalSavedRows = 0;
    var tacticalOpponentCount = 0;
    var tacticalDepthMaxRuns = getTacticalDepthMaxRuns();
    await csExportQaArtifactJson(simCtx.playerKey, {
      branchMatrixUseScope: true,
      branchMatrixScope: simCtx.simScope,
      branchMatrixMaxRunsPerOpponent: tacticalDepthMaxRuns,
      onBranchMatrixProgress: function(event) {
        event = event || {};
        var count = Number(event.opponent_count || 0);
        var idx = Number(event.opponent_index || 0);
        var basePct = count && idx ? Math.round(8 + ((idx - 1) / count) * 82) : 5;
        if (count) tacticalOpponentCount = count;
        var teamName = event.opponent_team_id && TEAMS[event.opponent_team_id] && TEAMS[event.opponent_team_id].name
          ? TEAMS[event.opponent_team_id].name
          : (event.opponent_team_id || 'opponent');
        if (event.phase === 'start') {
          setBranchProgress(5, 'Preparing tactical sweep for ' + count + ' opponent' + (count === 1 ? '' : 's') + '...', {
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        } else if (event.phase === 'load') {
          setBranchProgress(basePct, 'Loading branch memory ' + idx + ' / ' + count + ': ' + teamName + '...', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        } else if (event.phase === 'build') {
          setBranchProgress(Math.min(92, basePct + 3), 'Testing unseen branches ' + idx + ' / ' + count + ': ' + teamName + ' (' + Number(event.loaded_rows || 0) + ' prior rows)...', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: tacticalSavedRows,
            executed_runs: 0
          });
        } else if (event.phase === 'build-progress') {
          var runIndex = Number(event.executed_runs || 0);
          var runTotal = Number(event.total_planned_runs || 0);
          var runPct = runTotal ? Math.round((runIndex / Math.max(1, runTotal)) * 85) : 0;
          setBranchProgress(
            Math.min(92, basePct + runPct),
            'Testing unseen branches ' + idx + ' / ' + count + ': ' + teamName + ' (' + runIndex + ' / ' + (runTotal || '?') + ' runs)...',
            {
              opponent_index: idx,
              opponent_count: count,
              saved_rows: tacticalSavedRows,
              executed_runs: runIndex
            }
          );
        } else if (event.phase === 'save') {
          setBranchProgress(Math.min(94, basePct + 6), 'Saving ' + Number(event.executed_runs || 0) + ' branch runs for ' + teamName + '...', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        } else if (event.phase === 'done') {
          tacticalSavedRows += Number(event.saved_rows || 0);
          setBranchProgress(Math.min(96, basePct + 8), 'Done ' + idx + ' / ' + count + ': ' + teamName + ' · saved ' + Number(event.saved_rows || 0) + ' rows', {
            opponent_index: idx,
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        } else if (event.phase === 'analyze') {
          setBranchProgress(96, 'Analyzing ' + Number(event.executed_runs || 0) + ' tactical branch runs...', {
            opponent_index: count,
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        } else if (event.phase === 'complete') {
          tacticalSavedRows = Number(event.saved_rows || tacticalSavedRows || 0);
          setBranchProgress(98, 'Sweep complete: saved ' + tacticalSavedRows + ' rows. Preparing download...', {
            opponent_index: count,
            opponent_count: count,
            saved_rows: tacticalSavedRows
          });
        }
      }
    });
    setBranchProgress(100, 'Tactical Sweep QA Artifact downloaded.', {
      opponent_index: tacticalOpponentCount,
      opponent_count: tacticalOpponentCount,
      saved_rows: tacticalSavedRows
    });
  } catch (e) {
    setSimError(e);
  } finally {
    simRunning = false;
    sweepBtn.disabled = false;
    if (runBtn) runBtn.disabled = false;
    if (allBtn) allBtn.disabled = false;
    if (qaRunBtn) qaRunBtn.disabled = false;
    if (stressLiteBtn) stressLiteBtn.disabled = false;
  }
});

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.battle.runAllMatchupsFromButton = csRunAllMatchupsFromButton;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRunAllMatchupsFromButton', csRunAllMatchupsFromButton);

// ============================================================
// PART 2: PILOT GUIDE GENERATOR
// ============================================================
function generatePilotGuide(oppKey, results, simCtx) {
  const el = document.getElementById('pilot-content');
  if (!el) return;
  simCtx = simCtx || resolveSimContext({ playerKey: results && results.playerKey, oppKey: oppKey || (results && results.oppKey), bo: results && results.bo });
  var playerKey = simCtx.playerKey;

  const emptyEl = el.querySelector('.pilot-empty');
  safeRemoveNode(emptyEl);

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
  if (leads.length >= 2) tips.push(`Lead ${leads[0]} + ${leads[1]} as the first option.`);
  if (wcEntries.length) tips.push(`${wcEntries[0][0]} was the top win condition in ${Math.round(wcEntries[0][1]/total*100)}% of all series.`);
  if (risks.length) tips.push(`Watch for ${risks[0]} — it appeared in over 40% of your losses.`);
  else if (winPct > 55) tips.push('Your team has a consistent edge — focus on denying their setup turns.');
  if (winPct < 45) tips.push('Open with Fake Out + speed control to disrupt their gameplan.');
  const policyOutputAudit = (typeof auditPolicyOutput === 'function') ? auditPolicyOutput(tips) : { fakeGoodCount: 0, flagged: [] };
  const staticAdviceWarningHtml = (typeof renderStaticAdviceWarning === 'function')
    ? renderStaticAdviceWarning(policyOutputAudit, 'pilot') : '';

  const oppTeam = TEAMS[oppKey];
  const teamName = oppTeam ? oppTeam.name : oppKey;
  const circleClass = winPct >= 55 ? 's-win' : winPct <= 45 ? 's-loss' : 's-even';

  // T9j.15 (Refs #71) — Mega trigger card (only injected when player team holds a Mega).
  // Sweep is computed lazily and cached; safe no-op for non-Mega teams.
  let megaTriggerHtml = '';
  try {
    const format = simCtx.format || ((typeof currentFormat !== 'undefined') ? currentFormat : 'doubles');
    const bo = simCtx.bo || ((typeof currentBo !== 'undefined') ? currentBo : 1);
    const sweep = computeMegaTriggerSweep(playerKey, oppKey, bo, format);
    megaTriggerHtml = renderMegaTriggerCards(sweep);
  } catch (e) {
    UILog.warn('Mega card render skipped', e);
  }
  let threatResponseHtml = '';
  try {
    if (typeof solveThreatResponse === 'function' && typeof renderThreatResponseCard === 'function') {
      threatResponseHtml = renderThreatResponseCard(solveThreatResponse(playerKey, oppKey, {
        simsPerBranch: 30,
        rngSeed: 'pilot-guide'
    }));
    }
  } catch (e) {
    UILog.warn('Threat response render skipped', e);
  }

  const card = document.createElement('div');
  card.className = 'pilot-card';
  // Refs #95 - tag the card with its opponent key so we can upsert instead of
  // duplicating when the same matchup is re-simulated from the single-sim path.
  card.dataset.oppKey = oppKey;
  const preCoach = (typeof coachPre === 'function') ? coachPre(playerKey, oppKey, { result: results }) : '';
  card.innerHTML = `
    ${staticAdviceWarningHtml}
    <div class="pilot-card-header">
      <div class="pilot-card-title">${_escapeHtml(teamName)}</div>
      <span class="pilot-verdict ${verdictClass}">${_escapeHtml(verdict)}</span>
    </div>
    <div class="pilot-card-body">
      <div class="win-circle ${circleClass}" style="width:72px;height:72px;flex-shrink:0">
        <span class="win-pct" style="font-size:18px">${winPct}%</span>
        <span class="win-label">Series W%</span>
      </div>
      <div class="pilot-details">
        ${preCoach ? `<details class="cs-pre-coach"><summary>PRE coaching</summary><pre>${_escapeHtml(preCoach)}</pre></details>` : ''}
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
        ${threatResponseHtml}
      </div>
    </div>`;
  // Refs #95 - if a card for this opponent already exists (from a prior sim
  // of the same matchup, or from Run All), replace it in place. Keeps the tab
  // incremental when the user runs a single sim and prevents duplicate cards.
  const existing = el.querySelector('.pilot-card[data-opp-key="' + (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(oppKey) : oppKey) + '"]');
  if (existing) {
    safeReplaceChild(el, card, existing);
  } else {
    el.appendChild(card);
  }
  const dismiss = card.querySelector('[data-phase4e-dismiss]');
  if (dismiss) dismiss.addEventListener('click', function(){
    CS_PHASE4E_DISMISSED = true;
    const banner = card.querySelector('[data-phase4e-warning]');
    safeRemoveNode(banner);
  });
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
    UILog.warn('Mega sweep failed', e);
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
// All analytics are derived from ChampionsSim.state.lastResults + currentPlayerKey.
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

function _csHasTrueDamageWincon(mon) {
  var moves = (mon && mon.moves) || [];
  var damaging = moves.filter(function(mv) {
    return typeof MOVE_CATEGORY !== 'undefined' && MOVE_CATEGORY[mv] && MOVE_CATEGORY[mv] !== 'status';
  });
  if (damaging.length >= 2) return true;
  if (!damaging.length) return false;
  if (_pdfHasAny(mon, PDF_SPREAD) || _pdfHasAny(mon, PDF_PRIORITY)) return true;
  var base = (typeof BASE_STATS !== 'undefined' && mon && BASE_STATS[mon.name]) ? BASE_STATS[mon.name] : null;
  var offense = base ? Math.max(base.atk || 0, base.spa || 0) : 0;
  return offense >= 95;
}

var CLASSIFY_POKEMON_LEGACY_ROLES = [
  'lead',
  'sweeper',
  'support',
  'pivot',
  'disruptor',
  'win_condition',
  'sacrifice_piece'
];
var CLASSIFY_SETUP_MOVES = ['Dragon Dance', 'Swords Dance', 'Calm Mind', 'Clangorous Soul', 'Coil', 'Nasty Plot', 'Bulk Up'];
var CLASSIFY_PIVOT_MOVES = ['Parting Shot', 'U-turn', 'Flip Turn', 'Volt Switch', 'Baton Pass'];
var CLASSIFY_SACRIFICE_MOVES = ['Lunar Dance', 'Memento', 'Healing Wish', 'Explosion', 'Final Gambit', 'Shed Tail'];
var CLASSIFY_WIN_ITEMS = [
  'Choice Scarf',
  'Hard Stone','Soft Sand','Black Glasses','Charcoal','Mystic Water',
  'Never-Melt Ice','Dragon Fang','Fairy Feather','Magnet','Miracle Seed',
  'Twisted Spoon'
];
var CLASSIFY_LEAD_ITEMS = ['Focus Sash', 'Eject Button', 'Mental Herb'];

function _classifyHasAny(mon, list) {
  return !!(mon && Array.isArray(mon.moves) && list.some(function(x){ return mon.moves.indexOf(x) >= 0; }));
}

function _classifyAdd(scores, role, points, reason) {
  scores[role].score += points;
  scores[role].reasons.push(reason);
}

// Seven-role classifier for the dynamic coaching layer (#141).
// Returns a stable object so UI, tests, and future detectors can share it.
function classifyPokemonLegacy(mon, teamMembers) {
  var scores = {};
  CLASSIFY_POKEMON_LEGACY_ROLES.forEach(function(role){
    scores[role] = { role: role, score: 0, reasons: [] };
  });
  if (!mon || typeof mon !== 'object') {
    return { role: 'support', confidence: 'low', score: 0, reasons: ['missing Pokemon data'], scores: scores };
  }

  var name = mon.name || '';
  var ability = mon.ability || '';
  var item = mon.item || '';
  var moves = Array.isArray(mon.moves) ? mon.moves : [];
  var damagingMoves = moves.filter(function(move){
    return !(typeof MOVE_CATEGORY !== 'undefined' && MOVE_CATEGORY[move] === 'status');
  });

  if (_classifyHasAny(mon, PDF_FAKE_OUT)) _classifyAdd(scores, 'lead', 4, 'Fake Out creates turn-one pressure');
  if (/Prankster|Intimidate/i.test(ability)) _classifyAdd(scores, 'lead', 2, ability + ' is strongest early');
  if (CLASSIFY_LEAD_ITEMS.indexOf(item) >= 0) _classifyAdd(scores, 'lead', 1, item + ' supports lead positioning');

  if (_classifyHasAny(mon, CLASSIFY_SETUP_MOVES)) _classifyAdd(scores, 'sweeper', 3, 'setup move enables sweep');
  if (_classifyHasAny(mon, PDF_SPREAD)) _classifyAdd(scores, 'sweeper', 2, 'spread damage pressures both foes');
  if (damagingMoves.length >= 3) _classifyAdd(scores, 'sweeper', 1, 'three or more attacking moves');

  if (_classifyHasAny(mon, PDF_TAILWIND) || _classifyHasAny(mon, PDF_TRICK_ROOM)) _classifyAdd(scores, 'support', 3, 'speed control support');
  if (_classifyHasAny(mon, PDF_REDIRECT) || _classifyHasAny(mon, PDF_SCREENS)) _classifyAdd(scores, 'support', 3, 'team protection support');
  if (_classifyHasAny(mon, ['Helping Hand', 'Coaching', 'Life Dew', 'Recover', 'Roost'])) _classifyAdd(scores, 'support', 2, 'support or sustain move');

  if (_classifyHasAny(mon, CLASSIFY_PIVOT_MOVES)) _classifyAdd(scores, 'pivot', 3, 'pivot move preserves positioning');
  if (/Intimidate|Regenerator|Natural Cure/i.test(ability)) _classifyAdd(scores, 'pivot', 2, ability + ' rewards cycling');

  if (_classifyHasAny(mon, PDF_DISRUPT) || _classifyHasAny(mon, ['Will-O-Wisp', 'Thunder Wave', 'Spore', 'Sleep Powder', 'Hypnosis', 'Imprison', 'Trick'])) {
    _classifyAdd(scores, 'disruptor', 3, 'status or denial move');
  }
  if (PDF_TRAP_ABILITIES.indexOf(ability) >= 0) _classifyAdd(scores, 'disruptor', 3, ability + ' traps targets');

  if (/-Mega(?:$|-)/.test(name) || /-Mega(?:$|-)/.test(mon.species || '')) _classifyAdd(scores, 'win_condition', 4, 'Mega slot is a primary win condition');
  if (CLASSIFY_WIN_ITEMS.indexOf(item) >= 0) _classifyAdd(scores, 'win_condition', 2, item + ' indicates committed damage role');
  if (_classifyHasAny(mon, ['Last Respects', 'Blood Moon', 'Make It Rain', 'Eruption', 'Expanding Force', 'Light of Ruin'])) {
    _classifyAdd(scores, 'win_condition', 3, 'signature high-impact attack');
  }
  if (_classifyHasAny(mon, CLASSIFY_SETUP_MOVES) && damagingMoves.length >= 2) {
    _classifyAdd(scores, 'win_condition', 2, 'setup plus attacks can close games');
  }

  if (_classifyHasAny(mon, CLASSIFY_SACRIFICE_MOVES)) _classifyAdd(scores, 'sacrifice_piece', 6, 'self-sacrifice or pass move');
  if (item === 'Focus Sash' && (_classifyHasAny(mon, PDF_TAILWIND) || _classifyHasAny(mon, PDF_TRICK_ROOM) || _classifyHasAny(mon, PDF_DISRUPT))) {
    _classifyAdd(scores, 'sacrifice_piece', 1, 'Focus Sash helps guarantee one utility action');
  }

  var tieOrder = ['win_condition', 'lead', 'support', 'pivot', 'disruptor', 'sweeper', 'sacrifice_piece'];
  var best = CLASSIFY_POKEMON_LEGACY_ROLES
    .slice()
    .sort(function(a, b){
      var diff = scores[b].score - scores[a].score;
      if (diff !== 0) return diff;
      return tieOrder.indexOf(a) - tieOrder.indexOf(b);
    })[0];

  if (scores[best].score === 0) {
    best = damagingMoves.length ? 'sweeper' : 'support';
    scores[best].score = 1;
    scores[best].reasons.push(damagingMoves.length ? 'default damaging role' : 'default utility role');
  }

  var confidence = scores[best].score >= 4 ? 'high' : scores[best].score >= 2 ? 'medium' : 'low';
  return {
    role: best,
    confidence: confidence,
    score: scores[best].score,
    reasons: scores[best].reasons.slice(),
    scores: scores
  };
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

try { csApplyPublicBetaGuardrails(); } catch (_betaGuardErr) {}
if (typeof ChampionsSim !== 'undefined') ChampionsSim.publicBeta = ChampionsSim.publicBeta || {};
if (typeof ChampionsSim !== 'undefined') ChampionsSim.publicBeta.getGuardProfile = csGetPublicBetaGuardProfile;
if (typeof ChampionsSim !== 'undefined') ChampionsSim.publicBeta.applyGuardrails = csApplyPublicBetaGuardrails;
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csGetPublicBetaGuardProfile', csGetPublicBetaGuardProfile);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csApplyPublicBetaGuardrails', csApplyPublicBetaGuardrails);
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

// Coverage gaps — reuse the lazy coverage-check registry.
function findCoverageGaps(members) {
  return getCoverageChecks()
    .filter(function(chk){ return !(members||[]).some(function(m){ return chk.check(m); }); })
    .map(function(c){ return c.label; });
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
    say: function(c){ return c.trends.mostLostMons[0] + ' faints most often in losses. Bulk SP investment, Sitrus Berry, Leftovers, or a defensive berry would increase your ceiling here.'; }
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

var CS_OVERVIEW_DATA = {
  updated: '2026-06-28',
  metrics: [
    { label: 'Current Truth', value: 'Not 100% yet' },
    { label: 'Damage Logs', value: 'Applied/calc split fixed locally' },
    { label: 'Release Teams', value: '15 approved runtime rows' },
    { label: 'Testing Catalog Target', value: 'Top 10 Champion archetypes live' },
    { label: 'Removed Teams', value: '17 legacy/inferred rows' },
    { label: 'DB Team Rule', value: 'Approved rows must pass gates' },
    { label: 'Stress Status', value: 'Stress Lite totals + coaching summary live' },
    { label: 'Sim Truth Gate', value: 'Mechanics first' },
    { label: 'Live Supabase', value: 'Teams + analyses, gated' },
    { label: 'DB Log Detail', value: 'Summary/capped; exports are forensic proof' },
    { label: 'Showdown DB', value: 'Manual approval only' },
    { label: 'Team Format', value: 'Champion/SP focus' },
    { label: 'Turn Logs', value: 'Strict applied damage fields' },
    { label: 'Move Support', value: '120 verified / 0 baseline' },
    { label: 'Showdown Oracle', value: '56/56 green' },
    { label: 'Ability Inventory', value: '80/80 modeled' }
  ],
  shipped: [
    {
      status: 'done',
      title: 'Champion-format Tera leak gated off',
      detail: 'v2.1.83 prevents the current Champions Reg M-A sim lane from auto-Terastallizing stale team data. Tera support remains isolated behind explicit ruleset/test contexts so future Champion rules can opt in if source-approved; current Reg M-A exports no longer write Tera Type lines. The same audit removed active strategy copy that taught Protosynthesis without source approval.'
    },
    {
      status: 'done',
      title: 'Data source registry added',
      detail: 'v2.1.84 adds docs/DATA_SOURCE_REGISTRY.md as the team challenge page for source tiers, golden links, pull/check areas, timestamp rules, conflict handling, and the June 27 Reg M-A versus Reg M-B source warning.'
    },
    {
      status: 'done',
      title: 'Reg M-B source audit recorded',
      detail: 'v2.1.86 records the June 27 Victory Road Reg M-B facts: June 17 to September 2 window, Worlds usage, Mega Evolution allowed, full allowed-Pokemon image sheets, and 16 source-reviewed new Mega names. Runtime promotion remains blocked until those image sources become explicit reviewed data rows with fixtures.'
    },
    {
      status: 'done',
      title: 'Reg M-B conversion ledger added',
      detail: 'v2.1.87 adds a structured Reg M-B conversion table and JS ledger. The 16 new Mega names are explicit rows with source URLs, required promotion fields, and blockers, while runtimePromotable remains false until stones, stats, typing, abilities, sprites, species/form rows, and fixtures are reviewed.'
    },
    {
      status: 'done',
      title: 'Ruleset lifecycle guard added',
      detail: 'v2.1.87 adds a versioned ruleset registry and validation wrapper so source-review formats cannot be treated as legal sim evidence. Analysis payloads now carry ruleset status, learning eligibility, data policy, coaching policy, and a poisoning guard before DB/coaching stats consume results.'
    },
    {
      status: 'done',
      title: 'Ruleset-aware team sections and tags added',
      detail: 'v2.1.88 labels team cards by regulation lane, adds Reg M-A/Historical/Reg M-B Review filters, and keeps Reg M-B coverage sections review-only so future team experiments cannot train matchup recommendations until the ruleset is promoted.'
    },
    {
      status: 'done',
      title: 'Reg M-B review cards made visible',
      detail: 'v2.1.89 renders the Reg M-B source-review coverage sections inside the Teams tab filter. These are planning cards, not legal sim teams, so testers can see the new Mega coverage without poisoning selectors, DB learning, or coaching stats.'
    },
    {
      status: 'done',
      title: 'Sprite fallback chain added',
      detail: 'v2.1.95 adds a shared sprite fallback chain so animated Showdown sprites can fall back to static Showdown sprites instead of blanking. Lycanroc forms are now explicit aliases and all major card surfaces share the same fallback handler.'
    },
    {
      status: 'done',
      title: 'Alolan Raichu sprite alias and fallback coverage',
      detail: 'v2.1.96 maps Raichu-Alola to the verified Showdown surfing-style animated sprite and extends the shared sprite fallback helper into bring-selection, replay, and Reg M-B visual-review surfaces.'
    },
    {
      status: 'done',
      title: 'Hisuian Zoroark animated sprite alias',
      detail: 'v2.1.97 maps Zoroark-Hisui to the verified Showdown animated GIF and static fallback slug so Hisuian Zoroark no longer renders as regular Zoroark on shared Pokemon card surfaces.'
    },
    {
      status: 'done',
      title: 'GIF-primary sprite resolver',
      detail: 'v2.1.98 makes Showdown animated GIFs the primary sprite source for standard Pokemon rendering, adds explicit Alolan Ninetales and Hisuian Arcanine form slugs, and keeps static Showdown fallback for missing GIFs.'
    },
    {
      status: 'done',
      title: 'Reg M-B promotion gate added',
      detail: 'v2.1.99 adds explicit Reg M-B promotion buckets, required-field readiness counts, and Teams-page gate visibility so source-review rows stay blocked from legal selectors, trusted coaching, and DB learning until every source field and fixture is reviewed.'
    },
    {
      status: 'done',
      title: 'Reg M-B stone source pass',
      detail: 'v2.2.0 source-verifies all 16 Reg M-B new Mega stone item names against Pokemon Showdown items.ts while keeping the rows review-only and blocked from runtime legality, ranking, DB learning, and trusted coaching until the remaining source fields and fixtures are complete.'
    },
    {
      status: 'done',
      title: 'Reg M-B stats/types/abilities source pass',
      detail: 'v2.2.1 source-verifies all 16 Reg M-B new Mega base stats, types, and abilities against Pokemon Showdown pokedex.ts while keeping the rows review-only and blocked from runtime legality until base/form implementation, learnset policy, and positive/negative fixtures are reviewed.'
    },
    {
      status: 'done',
      title: 'Foul Play stat-source audit',
      detail: 'v2.2.9 fixes stat-source edge cases for unusual physical moves. Foul Play now uses the target Attack stat and stages without borrowing target Huge Power/Pure Power, while still applying user-side physical ability modifiers. Body Press also keeps user-side Huge/Pure Power behavior when using Defense as its offensive stat.'
    },
    {
      status: 'done',
      title: 'Move rule trace QA layer',
      detail: 'v2.2.10 adds structured move_rule_trace evidence to damage_events so downloaded replay logs, Run All QA, Tactical Sweep QA, and targeted proof artifacts show the stat source, ability modifier decisions, base-power modifiers, screen/weather/spread/STAB/final modifiers, and fixed ruleset flags for Foul Play, Body Press, and Psyshock-style edge cases.'
    },
    {
      status: 'done',
      title: 'Codex QA context drop connector',
      detail: 'v2.2.11 adds a compact codex_context block to QA Artifact exports and a local ingest workflow so downloaded QA files can be dropped into the repo and summarized for Codex without a backend bridge from GitHub Pages.'
    },
    {
      status: 'done',
      title: 'Codex QA drop-folder save',
      detail: 'v2.2.12 adds a Set QA Drop Folder control. Supported browsers can save QA Artifact exports directly into the local Champions-QA-Drops folder after user folder permission; unsupported browsers fall back to normal JSON download.'
    },
    {
      status: 'done',
      title: 'Tactical Sweep schema handoff',
      detail: 'v2.2.13 gives QA Artifact exports explicit qa_run_type, ready_for_codex, next_missing_proof, recommended_next_test, and non-null tactical_sweep schema/status/opponent metadata so Codex and team review can distinguish completed tactical evidence from missing proof.'
    },
    {
      status: 'done',
      title: 'Stat-source proof team and targeted QA',
      detail: 'v2.2.14 adds a legal Targeted Stat Source Proof team plus forced targeted QA battles for Foul Play, Body Press, Psyshock, and the Foul Play Pure Power guard so QA Artifacts can deterministically clear non-standard stat-source proof gaps.'
    },
    {
      status: 'done',
      title: 'Editor and import UX closed out',
      detail: 'v2.2.26 and v2.2.27 add explicit editor save/cancel controls plus Showdown/text-file import feedback. The custom-team workflow now gives users visible parser results, edit rollback, and legality-gated saves instead of failing silently when uploaded sets have missing or malformed moves.'
    },
    {
      status: 'done',
      title: 'Move failure evidence added',
      detail: 'v2.2.28 adds structured move-failure rows so replay and QA evidence can show misses, immunities, invalid targets, blocked attempts, and other non-damage outcomes instead of leaving players to infer why a move did nothing.'
    },
    {
      status: 'done',
      title: 'Replay log duplication cleaned up',
      detail: 'v2.2.29 removes the duplicate pre-call replay lines and keeps the resolved action row as the visible trainer-facing line, so move order, damage, misses, failures, and KOs are easier to audit in order.'
    },
    {
      status: 'done',
      title: 'Detailed replay event rows shipped',
      detail: 'v2.2.30 groups richer replay details by resolved action. Spread and doubles moves can show every target hit in the same action row, while miss/failure rows expose reason and accuracy evidence when available.'
    },
    {
      status: 'done',
      title: 'Y and Alfredo repos synced through v2.2.30',
      detail: 'TheYfactora12 PR #160 merged with green CI and Pages deploy, then Alfredo PR #256 synced the same tree through v2.2.30 and passed Syntax Check, Test Suite, bundle freshness, service-worker cache, Detect Engine/Data Changes, and the 5,070-battle Battle Audit before merge.'
    },
    {
      status: 'done',
      title: 'Overview closeout status refreshed',
      detail: 'v2.2.31 updates the Overview and release docs so closed work, still-open beta gates, and repo sync proof are visible from the app instead of trapped in chat history.'
    },
    {
      status: 'done',
      title: 'Action-denial and priority-block evidence normalized',
      detail: 'v2.2.32 starts the Pokemon Champions mechanics truth gate for singles and doubles by adding stable reason IDs for action-denial and priority-suppression evidence. Fake Out timing failures, Quick Guard blocks, Psychic Terrain priority blocks, and Armor Tail/Dazzling/Queenly Majesty blocks now export structured move-failure rows and QA counters instead of relying only on free-text logs.'
    },
    {
      status: 'done',
      title: 'Status and move-lock proof counters added',
      detail: 'v2.2.33 expands issue #149 slice 2 by grouping sleep, freeze, paralysis, flinch, confusion, Taunt, Imprison, Throat Chop, accuracy miss, no-valid-target, and consecutive Protect-family failures into distinct QA counters. This lets replay artifacts prove why a Pokemon lost its action or why a selected move failed without mixing random misses, target issues, and lock states.'
    },
    {
      status: 'done',
      title: 'Status resolution pass-through proof added',
      detail: 'v2.2.34 adds proof rows and QA counters for the other side of status logic: freeze thawed before moving, sleep wake/early wake, Sleep Talk allowed while asleep, paralysis only lowering Speed, and confusion allowing the selected move to continue. This prevents coaching from over-crediting status when the status existed but did not actually deny the action.'
    },
    {
      status: 'done',
      title: 'Canonical release manifest added',
      detail: 'v2.2.35 starts the release-reliability cleanup by adding release_manifest.js as the source of truth for visible build ID, export build_id, bundled artifact identity, source-sync policy, and service-worker cache name. The header now derives from the manifest instead of treating scattered README/header/query/cache state as independent truth.'
    },
    {
      status: 'done',
      title: 'Public launch security guardrails started',
      detail: 'v2.2.37 adds a CI security guard for the public app shell: local credentials and env files must stay ignored, Pages deploy can inject only anon/public Supabase runtime config, service-role/write/database secrets are blocked from browser runtime files, and committed bundles must keep Supabase placeholders empty before deploy-time injection.'
    },
    {
      status: 'done',
      title: 'CSP and public XSS guardrails added',
      detail: 'v2.2.38 adds a baseline Content Security Policy to the app shell and a CI guard that blocks dynamic code execution, inline event-handler attributes, CSP stripping during Pages deploy, and missing public XSS regression coverage. Inline script/style allowances remain documented as an architecture cleanup target until the bundle is split further.'
    },
    {
      status: 'done',
      title: 'App shell security module split started',
      detail: 'v2.2.39 moves release identity, runtime error surfacing, build-cache reload, source URL proof, sprite fallback delegates, and speed-tier delegated click handling out of ui.js into app_shell.js. This gives release/security boot code a smaller owner surface before deeper UI/runtime splitting.'
    },
    {
      status: 'planned',
      title: 'Future login and saved profile boundary documented',
      detail: 'Login remains gated until simulator math and exported coaching outputs are trusted. Saved teams, personal sim history, replay summaries, and cross-device profile learning will require Supabase Auth, RLS ownership checks, per-user data separation, export/delete controls, and consent-safe aggregation before launch.'
    },
    {
      status: 'done',
      title: 'Sprite fallback chain hardened after live GIF report',
      detail: 'v2.2.40 keeps GIFs as the first visual path but adds a multi-stage fallback chain: exact static Showdown PNG, base-form animated GIF, then base-form static PNG. Live check found Charizard-Mega-X animated GIF returns 404 while exact static charizard-megax.png succeeds, so broken form GIFs should recover instead of staying visually broken.'
    },
    {
      status: 'done',
      title: 'Move/effect logic QA matrix added',
      detail: 'v2.2.43 adds a move_effect_logic_matrix to QA coverage summaries so damage math, stat-source moves, HP effects, action denial, move failure prevention, priority prevention, field duration, contact/item damage, and faint transparency report proven, partial, or missing evidence before coaching claims are trusted.'
    },
    {
      status: 'done',
      title: 'Champion source-confidence intake added',
      detail: 'v2.2.44 records the June 29 Champion research dossier as planning input, separates official/client-captured authoritative legality from provisional working mirrors and meta evidence, and keeps M-B legality/content deltas blocked from runtime truth until exact source pointers, timestamps, and tests are attached.'
    },
    {
      status: 'done',
      title: 'Team Lab backend foundation added',
      detail: 'v2.2.45 adds the evidence-bound Team Lab backend foundation: namespaced Supabase tables, visibility-safe team records, versioned simulator run evidence, staleable leaderboard rows, matchup summaries, legality reports that return needs_verification for missing Champion source data, and unit tests for ranking, confidence, stale marking, illegal exclusion, and hidden-detail redaction.'
    },
    {
      status: 'done',
      title: 'Source-truth ruleset package foundation added',
      detail: 'v2.2.46 adds rule_facts and ruleset_packages as the next trust layer beneath Team Lab: granular source claims stay separate from compiled validator/sim packages, reference-only Showdown/community facts cannot promote Champion legality, and missing lists/mechanics surface as source_gaps instead of verified runtime truth.'
    },
    {
      status: 'done',
      title: 'Kevin coached baseline team added',
      detail: 'v2.2.24 adds Kevin Meta Sun as the first named coached baseline team and documents the approved runtime team test matrix so QA knows which teams prove terrain, weather, Trick Room, replay evidence, and future saved-team recommendation work.'
    },
    {
      status: 'done',
      title: 'Pages deploy now gates live DB team parity',
      detail: 'v2.2.15 makes GitHub Pages run live Supabase seed parity when anon secrets are available, so bundled teams, generated SQL, and live DB team IDs must stay aligned before publish. The follow-up CI repair also refreshed the generated QA baseline snapshot, documenting the broader upgrade rule: approved data changes must update runtime data, seed SQL, live DB, generated reports, bundle, Overview, and QA artifacts together.'
    },
    {
      status: 'done',
      title: 'Stress Lite QA added',
      detail: 'v2.2.17 adds a browser-safe Stress Lite + QA path for testers who should not run full Run All on a local machine. It uses capped Tactical Sweep branch coverage, targeted proof, memory-aware limits, and an explicit stress_lite artifact block so the team can collect stress evidence without confusing it with exhaustive Run All proof.'
    },
    {
      status: 'done',
      title: 'Stress Lite summary made readable',
      detail: 'v2.2.18 mirrors QA totals at the artifact top level and adds stress_lite.summary so testers, Codex, and the team can immediately see capped run volume, result counts, replay and damage evidence weight, the slowest capped matchup, and the best or riskiest tactical signals without re-reading the full coverage tree.'
    },
    {
      status: 'done',
      title: 'Hard beta device guardrails added',
      detail: 'v2.2.19 disables Run All on mobile/coarse-pointer and low-memory devices, caps public phone series volume, blocks full branch-coverage depth on risky browsers, and pushes users toward Stress Lite + QA so public testers do not become accidental load tests.'
    },
    {
      status: 'done',
      title: 'Coach brain now explains speed-control sequence quality',
      detail: 'v2.2.16 adds a structured tactical_interpretation block to coach_brain_summary and renders it in the Strategy Priority Board when available. Tactical Sweep QA can now explain why Tailwind, Trick Room, or speed-control answers worked or failed, what the player should check before clicking the setup move, what sequence to practice, and which counters should improve next. If full coach brain data is absent, the board falls back to conservative branch timing signals.'
    },
    {
      status: 'done',
      title: 'Drain rule source audit',
      detail: 'v2.2.8 reads generated Pokemon Showdown drain metadata before manual fallbacks, so every locally supported drain move with source data, including Parabolic Charge, emits drain healing and replay evidence from the same rule path.'
    },
    {
      status: 'done',
      title: 'Secondary table consolidation',
      detail: 'v2.2.7 consolidates remaining simple damaging secondaries into the source-audited SECONDARY_EFFECTS table, including Breaking Swipe, Bulldoze, Icy Wind, Rock Tomb, Snarl, Lunge, and Muddy Water, and adds an audit guard for uncovered simple Showdown secondary effects.'
    },
    {
      status: 'done',
      title: 'Complex secondary state pass',
      detail: 'v2.2.6 starts the complex secondary-effect layer: Burning Jealousy burns targets that raised stats that turn, Diamond Storm can self-boost Defense, Spirit Shackle traps pivot/switch attempts while the trapper is alive, and Sparkling Aria cures burn after a successful hit.'
    },
    {
      status: 'done',
      title: 'Secondary effect source audit',
      detail: 'v2.2.5 fills straightforward Showdown-backed damaging move secondaries that were missing from runtime: paralysis, burn, freeze, poison, target stat drops, and Psyshield Bash self-Defense. Complex state effects remain explicit follow-up work instead of hidden assumptions.'
    },
    {
      status: 'done',
      title: 'Contact flag source audit',
      detail: 'v2.2.4 audits local contact move overrides against generated Pokemon Showdown flags. Beak Blast, Bone Club, and Scale Shot are now treated as non-contact so Rough Skin, shield riders, replay tags, and coaching evidence do not fire false contact events.'
    },
    {
      status: 'done',
      title: 'Damage stat override audit',
      detail: 'v2.2.3 audits Showdown damage stat override semantics after a Foul Play report. Foul Play remains oracle-aligned, including burned-user behavior; confirmed local gaps are fixed for Body Press using user Defense as offense and Psyshock targeting Defense instead of Special Defense.'
    },
    {
      status: 'done',
      title: 'Reg M-B learnset policy source pass',
      detail: 'v2.2.2 records the source-backed learnset policy for all 16 Reg M-B new Megas: Mega forms inherit their base species learnset through the existing move_legality.js Mega fallback. The policy remains review-only until accepted and rejected fixtures prove the behavior.'
    },
    {
      status: 'done',
      title: 'Replay Pokemon effect tags added',
      detail: 'v2.1.82 adds compact Pokemon-card effect tags in replay turns. Structured effect_events such as flinch-applied, flinch-skip, sleep/freeze/paralysis skips, confusion self-hit, recoil, item recovery, and contact damage now surface as visible chips so players and QA can identify status/effect tech without opening raw JSON.'
    },
    {
      status: 'done',
      title: 'Lethal faint cause matching fixed',
      detail: 'v2.1.81 requires faint_cause_summary to match the lethal damage/effect row that actually reaches 0 HP. Earlier chip on the same Pokemon can explain HP loss, but it cannot be reported as the faint cause. The same fix records action-denial evidence for flinch, sleep, freeze, paralysis, and confusion self-hit, including applied state versus actually skipped move.'
    },
    {
      status: 'planned',
      title: 'Replay board-state badges',
      detail: 'Next replay UI pass should show field setup and Pokemon conditions as visible timeline chips/badges: Tailwind, Trick Room, weather, terrain, screens, Protect/Guard, major status, volatile/action-denial states such as flinch, and remaining turns. Players should not need raw JSON to know board condition on each turn.'
    },
    {
      status: 'done',
      title: 'Legacy lead dropdown removed',
      detail: 'v2.1.80 removes the unused Lead Pair dropdown from the main controls. Lead and bench selection now routes through the Bring picker only: Manual locks the selected lineup for the series, while Random explores legal bring combinations.'
    },
    {
      status: 'done',
      title: 'QA artifact summaries split',
      detail: 'v2.1.80 adds coverage_breakdown so retained replay-card validation, full-artifact totals, targeted sweep evidence, and tactical sweep evidence are separated. qa_coverage_summary stays as the full-artifact summary for compatibility, while retained_replay_card_summary is the source of truth for the 240 replay-card totals.'
    },
    {
      status: 'done',
      title: 'Faint cause evidence added',
      detail: 'v2.1.79 adds faint_cause_summary and contact_move_audit_summary to turn logs, replay cards, and QA artifacts. It explains which attack, status, recoil, weather, shield, drain, item, or field effect caused HP loss or a faint, audits contact-move metadata for Rough Skin/Spiky Shield style effects, and flags unexplained HP drops/faints for QA.'
    },
    {
      status: 'done',
      title: 'Coach event rows added',
      detail: 'v2.1.78 adds coach_event_rows and coach_event_summary to turn logs, retained replay cards, and QA artifacts. These rows translate tactical and duration labels into DB-ready coaching facts with outcome, confidence, why-it-matters, and next-test guidance.'
    },
    {
      status: 'done',
      title: 'Run All QA replay export hardened',
      detail: 'v2.1.77 makes Run All QA export replay-card evidence from the just-finished run and rebuilds tactical, duration, ledger, and coach summaries safely for each retained replay card.'
    },
    {
      status: 'done',
      title: 'Duration timing summary added',
      detail: 'v2.1.76 adds duration_effect_summary to turn-log and QA exports. It tracks active multi-turn effect windows, expirations, reissues after expiry, Tailwind used while already active, Tailwind into active Trick Room, and Tailwind delayed until after Trick Room ends.'
    },
    {
      status: 'done',
      title: 'Coach Brain strategic loop added',
      detail: 'v2.1.75 extends coach_brain_summary with observed_pattern, root_problem, risk_if_unchanged, recommended_solution, expected_result_if_fixed, and learning_direction so the sim can explain what is happening, what risk repeats, what to change, and what improvement should look like.'
    },
    {
      status: 'done',
      title: 'Coach Brain Summary added',
      detail: 'v2.1.74 adds coach_brain_summary on top of the Decision Opportunity Ledger. It names the primary tactical issue, best measured strength, next-game plan, practice drill, confidence, and memory key while staying evidence-bound.'
    },
    {
      status: 'done',
      title: 'Decision Opportunity Ledger added',
      detail: 'v2.1.73 adds decision_opportunity_ledger to turn-log exports, retained replay cards, and QA coverage summaries. The first ledger pass converts tactical speed labels into counted opportunities for Player Tailwind, Opponent Tailwind Defense, Trick Room, and Speed-Control Contest without claiming best-move certainty.'
    },
    {
      status: 'done',
      title: 'Tactical speed labels added to turn-log exports',
      detail: 'v2.1.71 adds tactical_speed_summary to downloaded turn logs, retained replay cards, and QA coverage summaries. The export now labels speed_state_active, speed_order_reversed, Trick Room established/converted/failed-to-convert, Tailwind established/converted/without-pressure, neutralized speed control, and speed-control reversal from exported evidence instead of asking QA to infer those reads by hand.'
    },
    {
      status: 'done',
      title: 'Bring-choice coaching added — benchedTwo + bring_choice_review tag (#220)',
      detail: 'When the full six-mon roster and the brought four are both known (bringChoiceReviewable=true), review.summary.benchedTwo now contains the two not-brought mons and a bring_choice_review coaching tag fires with benchedSpecies, whatHappened, whyMattered, and doInstead fields. Covered by 4 new tests in t220_bring_choice_tests.js. Also updated addIssue to forward unrecognized extra fields so future coaching tags can carry custom domain-specific properties.'
    },
    {
      status: 'done',
      title: 'All 4 terrain mechanics wired (PR #141)',
      detail: 'v2.1.70-terrain-gaps-fixed closes all 4 terrain engine gaps: A) Misty Terrain blocks all major status on grounded mons in canInflictStatus; B) new applyTerrainAbility wires all 4 Surge abilities (Grassy/Electric/Misty/Psychic) on entry; C) Grassy Terrain heals grounded mons floor(maxHp/16) per end-of-turn; D) Electric Terrain blocks sleep on grounded mons; E) Psychic Terrain blocks priority moves from hitting grounded mons. Covered by 9 new tests: T28-T30 in status_tests.js, T1-T7 in engine_terrain_tests.js.'
    },
    {
      status: 'done',
      title: 'Source-truth document audit added',
      detail: 'v2.1.69-source-truth-audit adds docs/SOURCE_TRUTH_DOCUMENT_AUDIT_2026-06-26.md, cataloguing Showdown, Champion, and DB source-truth references so QA has a single canonical map of every approved data source used by the sim.'
    },
    {
      status: 'done',
      title: 'Battle Sensei speed-transition payoff reads added',
      detail: 'v2.1.68-speed-transition implements speed-control payoff classification in replay_coach.js: Trick Room/Tailwind reversal, dual-speed neutralization, immediate conversion, T+1 to T+3 deferred payoff, planned speed transitions, and complementary setup/protection payoff. Covered by t188 tests 12-16 and t190 structure guard.'
    },
    {
      status: 'done',
      title: 'Team evidence dashboard added',
      detail: 'v2.1.59 folds shared evidence into the Strategy Priority Board per selected team. Normal sim samples, tactical branch samples, best-case, worst-case, likely-case, confidence, set-change comparison, and next-test guidance now render together instead of living as separate QA concepts.'
    },
    {
      status: 'done',
      title: 'Tactical Depth selector added',
      detail: 'v2.1.58 adds Quick 24, Deep 100, Deep 250, and All candidate branches for Tactical Sweep + QA so players can choose between fast proof and full tactical coverage.'
    },
    {
      status: 'done',
      title: 'Cache refresh reload added',
      detail: 'v2.1.57 reloads once after build-change cache cleanup so a tester does not keep running the just-cleaned older bundle. This prevents old Tactical Sweep UI code from continuing to show 0W / 0L after the fixed branch counters are deployed.'
    },
    {
      status: 'done',
      title: 'Branch progress counters added',
      detail: 'v2.1.56 changes Tactical Sweep from normal sim W/L counters to branch-specific progress counters. The progress area now shows opponent index, saved branch rows, and percent complete instead of 0W / 0L / 0%.'
    },
    {
      status: 'done',
      title: 'Tactical Sweep progress added',
      detail: 'v2.1.55 makes Deep/Tactical Sweep progress visible while it runs. The Simulator progress bar now reports branch-memory load, unseen branch testing, saved rows, and opponent count instead of sitting on one static message during preloaded-suite sweeps.'
    },
    {
      status: 'done',
      title: 'QA download fallback added',
      detail: 'v2.1.54 keeps the Tactical Sweep + QA export reliable when the browser blocks delayed automatic downloads. Every JSON export still attempts the normal download, then leaves a visible Download ready link in the Simulator progress area so the player can manually save the artifact.'
    },
    {
      status: 'done',
      title: 'Tactical Sweep QA added',
      detail: 'v2.1.53 adds a Tactical Sweep + QA control that uses Test Scope to build unseen branch coverage for the selected matchup or the approved preloaded team suite. The QA Artifact now includes tactical_sweep with per-opponent branch coverage, DB save totals, and combined branch_move_analysis so repeated runs fill coverage instead of replaying the same tactical branches.'
    },
    {
      status: 'done',
      title: 'Tactical Branch Memory added',
      detail: 'v2.1.52 extends branch matrix QA from first-click move coverage into early battle tactics. Branch rows now store tactical summaries for Protect timing, pivot/switch timing, speed control, setup/redirection, first-KO timing, and early board-position change, and the Strategy guide can render those timing signals with confidence labels.'
    },
    {
      status: 'done',
      title: 'Simulator Test Scope added',
      detail: 'v2.1.51 adds a Test Scope selector so players can run either a focused selected matchup or the approved preloaded team suite. Sample size now includes 1,000-series deep matchup and 10,000-series full-team stress options. This improves tactical coverage collection for lead pairs, move lines, targets, switching, and timing; it does not claim exhaustive proof by itself.'
    },
    {
      status: 'done',
      title: 'Strategy Priority Board added',
      detail: 'v2.1.50 updates the Strategy tab around player decision order: coach call first, then click plan, move swap, avoid trap, lead mode, matchup health, confidence, and next test. The layout uses player psychology from competitive doubles: show the action before the evidence, then explain trust and what to run next.'
    },
    {
      status: 'done',
      title: 'Branch move coach feeds the Strategy guide',
      detail: 'v2.1.49 turns saved branch coverage rows into trainer-facing confidence-rated avoid moves, legal move swaps already seen on the set, and suggested lead/move lines. Every recommendation carries confidence: early_signal rows are stress-test targets, while strong rows require repeated samples before they should drive meta calls. This is strategy analysis on top of the branch database, not a battle-engine mechanics change.'
    },
    {
      status: 'done',
      title: 'Current truth board corrected',
      detail: 'The Overview top row now states the release truth plainly: the sim is not 100% yet, damage applied-vs-calculated logging is fixed locally, normal selectors are limited to approved Champion-legal teams, legacy/inferred teams are removed from the runtime catalog, and full stress/deployed browser proof is still required before broad accuracy claims.'
    },
    {
      status: 'done',
      title: 'Damage applied versus calculated logging fixed locally',
      detail: 'Damage events now separate actual HP loss from raw formula output. Visible logs and the `damage` field use applied HP loss, while `calculated_damage`, `overkill_damage`, and `damage_capped_by_hp` preserve formula evidence for QA. Recoil and drain now use applied damage so overkill cannot inflate downstream effects.'
    },
    {
      status: 'done',
      title: 'Approved Champion team lane guarded',
      detail: 'Normal sim selectors and Run All now accept only Champion-format rows that pass current legality checks and are marked approved legal, plus valid custom teams. The runtime catalog now keeps 10 Champion-legal testing archetypes and removes 17 legacy/inferred rows into the removed-team audit object.'
    },
    {
      status: 'done',
      title: 'Current Champion source sweep recorded',
      detail: 'The June 23 online sweep found the official Champions site confirming Singles and Doubles, Ranked/Casual/Private modes, Mega Evolution in the first Ranked rules, HOME visitor/training restrictions, and June 17 Regulation Set M-B news. Current meta/build sample signals point at Incineroar, Whimsicott/Tailwind, Sneasler, Mega Charizard Y sun, Garchomp, Eternal Flower Floette, rain, and anti-meta Trick Room, so the runtime sample catalog is intentionally style-balanced instead of claiming exact tournament-sheet provenance.'
    },
    {
      status: 'done',
      title: 'DB species/move legality view added',
      detail: 'A Supabase migration adds `approved_species_move_legality`, joining approved species/form learnsets to approved move metadata so DB/editor/QA tooling can inspect legal moves with base power, category, type, target, flags, and source hashes without making the DB an unchecked battle calculator.'
    },
    {
      status: 'done',
      title: 'Showdown sync approval guard tightened',
      detail: 'Scheduled Showdown sync can detect reviewable source changes, but approved rows now require manual `workflow_dispatch` approval after human review instead of automatic scheduled approval.'
    },
    {
      status: 'done',
      title: 'Review tab restored',
      detail: 'The replay-analysis entry point is back as a top-level Review tab with a Review Overview heading.'
    },
    {
      status: 'done',
      title: 'Live team-load simulation failure fixed',
      detail: 'v2.1.21 normalized DB and static teams into one sim context so Run Simulation and Run All no longer fail with player team not loaded when a saved DB team lacks UI-only fields.'
    },
    {
      status: 'done',
      title: 'Lethal Sitrus and Oran timing fixed',
      detail: 'v2.1.22 prevents damage-trigger berries from restoring a holder that was already reduced to 0 HP before faint cleanup; the fix is covered by focused item tests and bundled for GitHub Pages.'
    },
    {
      status: 'done',
      title: 'Champion item and SP gate added',
      detail: 'v2.1.23 adds a positive Champions item allowlist, blocks stale DB teams before they replace bundled teams, rejects raw EV/IV imports, exports Champion SPs, and keeps illegal teams out of sim selectors.'
    },
    {
      status: 'done',
      title: 'Champion SP spread legality guard tightened',
      detail: 'v2.1.30 converts 32 shipped inferred SV-shaped archetype spreads into legal Champion SP spreads, validates every bundled Champion team at max 32 SP per stat and 66 total, blocks SP-labeled over-cap imports, blocks malformed DB spread payloads, and prevents illegal editor saves or Supabase team upserts.'
    },
    {
      status: 'done',
      title: 'Stable Pokemon identity in sim exports',
      detail: 'Battle snapshots now carry stable roster keys, stable HP maps, bench/active stable keys, and item-consumption state.'
    },
    {
      status: 'done',
      title: 'Full team roster metadata added to turn-log exports',
      detail: 'v2.1.40 downloaded turn-log JSON now includes player_team, opponent_team, and team_preview metadata with full six-slot Champion team snapshots plus the four Pokemon actually brought into the battle, so QA can audit hidden slots and legal sets without guessing from turn snapshots.'
    },
    {
      status: 'done',
      title: 'QA baseline snapshot added',
      detail: 'reports/champion_qa_baseline_snapshot.md is generated from current source data and lists approved Champion runtime team movesets, move metadata, support status, baseline data, and all shipped move support so QA has one readable reference from the Overview page.'
    },
    {
      status: 'done',
      title: 'Architecture and evidence map added',
      detail: 'docs/CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md gives QA a source-to-engine-to-export map: Showdown and Champion source truth, Supabase boundaries, generated runtime assets, deterministic engine responsibilities, damage_events/effect_events evidence, DB history limits, and the required proof workflow.'
    },
    {
      status: 'done',
      title: 'Showdown recoil context added to QA baseline',
      detail: 'v2.1.41 preserves Pokemon Showdown move recoil tuples and official data/text/moves.ts descriptions in generated move metadata. The QA Baseline Snapshot now lists recoil rules and Showdown context for Flare Blitz, Wave Crash, Head Smash, Light of Ruin, and other shipped recoil moves, and recoil tests assert exact applied-damage ratios.'
    },
    {
      status: 'done',
      title: 'Effect math evidence added to turn logs',
      detail: 'v2.1.42 adds structured effect_events for recovery, drain healing, HP-cost moves, delayed Wish healing, Leech Seed drain/heal, Leftovers, and Struggle recoil. Shed Tail now follows Showdown context: 1/2 max HP cost rounded up, passing a 1/4 max HP Substitute rounded down. damage_events now carry drain/recoil effect tags, Showdown context, and applied-damage-based drain/recoil rules so QA can audit effect math without parsing free-text logs.'
    },
    {
      status: 'done',
      title: 'Move priority aligned with Showdown data',
      detail: 'Feint, Ice Shard, and Protect-family shield priorities are covered by local priority drift tests.'
    },
    {
      status: 'done',
      title: 'Showdown primary move metadata for imported teams',
      detail: 'The engine now reads generated Showdown move rows first for type, category, base power, accuracy, priority, target, and contact flags, then falls back to local Champions data for custom gaps.'
    },
    {
      status: 'done',
      title: 'Target category bridge and stale-target retargeting guarded',
      detail: 'v2.1.25 canonicalizes Showdown target strings such as allAdjacentFoes into engine target categories, then retargets dead opposing intended targets to a live opposing slot when the move can still legally hit.'
    },
    {
      status: 'done',
      title: 'Runtime naming cheat sheet added',
      detail: 'v2.1.26 documents Showdown target names versus Champion engine categories so future data, DB, and generated-asset work uses the adapter boundary instead of leaking raw source vocabulary into battle logic.'
    },
    {
      status: 'done',
      title: 'Large-run QA artifact export added',
      detail: 'v2.1.27 adds a retained-evidence QA export with build ID, source URL, sim-log caps, replay caps, summary counts, retained replay cards, and retained compact sim-log entries so partner test runs do not depend on reading the capped UI by eye.'
    },
    {
      status: 'done',
      title: 'QA coverage summary added to exports',
      detail: 'v2.1.43 adds qa_coverage_summary to downloaded turn-log JSON, retained QA replay cards, and top-level QA Artifact exports. The summary counts the mechanics actually seen in the evidence, lists source-truth versions from the generated Pokemon Showdown audit data, and names missing targeted proof so QA does not infer 100% coverage from logs that never triggered a mechanic.'
    },
    {
      status: 'done',
      title: 'Recoil applied HP evidence corrected',
      detail: 'v2.1.44 keeps the Pokemon Showdown recoil formula amount as calculated_effect_damage, but damage_applied_to_user and visible recoil log damage now mean actual HP lost after the user HP cap. QA coverage also separates recoil effect occurrences from recoil damage-row evidence so one recoil is not counted twice.'
    },
    {
      status: 'done',
      title: 'Type multiplier audit added',
      detail: 'v2.1.28 adds reports/type_multiplier_audit.md so reviewers can inspect each shipped move user, resolved move type, 4x/2x/1x/0.5x/0.25x/0x roster buckets, declared defensive Tera buckets, and dynamic move-type rules.'
    },
    {
      status: 'done',
      title: 'Low Kick weight source added',
      detail: 'v2.1.35 adds generated/pokemon_showdown_species_weights.js from Pokemon Showdown data/pokedex.ts so variable base-power moves can use target species weight without hard-coding battle data in the engine.'
    },
    {
      status: 'done',
      title: 'Core shipped move parity closed',
      detail: 'v2.1.36 promotes the remaining shipped baseline moves to verified coverage: weather and true-accuracy rules, spread damage ranges, Dual Wingbeat two-hit behavior, Poltergeist no-item failure, Foul Play target-Attack damage, Darkest Lariat defense-stage bypass, Stomping Tantrum prior-fail boost, Leaf Storm self-drop, Light of Ruin recoil, Throat Chop sound lock, Hurricane confusion, and common damaging secondary effects now have local source-truth tests.'
    },
    {
      status: 'done',
      title: 'Typed held-item damage boosts fixed',
      detail: 'v2.1.28 applies legal typed held-item boosts such as Charcoal, Mystic Water, Soft Sand, Black Glasses, Spell Tag, Fairy Feather, and Never-Melt Ice as Showdown-style base-power modifiers before final damage.'
    },
    {
      status: 'done',
      title: 'Stat and effective-speed evidence added to exports',
      detail: 'v2.1.28 turn snapshots added stat_boosts, stat_boosts_stable, speed_order_details, and damage_events with Champions SP/SV stat format, nature, Speed points, species base Speed, calculated Speed, speed stage, item, ability, status, weather, Tailwind, Trick Room, effective Speed, exact-speed-tie markers, type effectiveness, typed item boosts, STAB, spread, weather, screen, final modifier, and attack/defense stage evidence. v2.1.42 adds effect_events for HP-changing move and item effects.'
    },
    {
      status: 'done',
      title: 'Knock Off item behavior guarded',
      detail: 'v2.1.29 aligns Knock Off with Showdown/Bulbapedia behavior for removable held-item damage boost, post-damage item removal, legal no-item targets, corresponding Mega Stone protection before Mega activation, and Sticky Hold removal blocking.'
    },
    {
      status: 'done',
      title: 'Showdown sync and DB writer staged',
      detail: 'The repo has migrations and writer tooling for showdown_sync_runs, showdown_source_files, showdown_entities, and champions_overrides, approved-view tests, generate-approved-data-from-db.mjs, the Phase 4 compatibility alias generate_showdown_data.mjs, and generated static Showdown runtime assets. Battle runtime reads generated data first with local fallback; live DB reads stay inspector/team-builder scoped.'
    },
    {
      status: 'done',
      title: 'Exported log validator added',
      detail: 'poke-sim/tools/validate-turn-logs.mjs checks identity, item drift, HP maps, active/bench mapping, speed order, observed priority order, damage/effect evidence shape, and no-valid-target skips. v2.1.39 validates observed action order by side/stable identity so mirror species and form names do not corrupt speed checks; v2.1.42 validates effect_events and drain/recoil rule math.'
    },
    {
      status: 'done',
      title: 'Curated ability inventory modeled',
      detail: 'The curated-team plus Champions mega ability audit now reports 80 of 80 abilities modeled, with focused coverage for priority, targeting, accuracy, status immunity, trapping, multi-hit, threshold, contact, crit-prevention, and no-op ability paths.'
    },
    {
      status: 'done',
      title: 'Showdown DB source-of-truth plan written',
      detail: 'Repo docs now describe Showdown-mirrored rows plus separate Champions override rows as the target architecture.'
    },
    {
      status: 'done',
      title: 'Simulation-first direction documented',
      detail: 'Roadmap and release docs now make simulation correctness the gate before new coaching, premium, Battle IQ, or recommendation work.'
    },
    {
      status: 'done',
      title: 'Public release milestone map documented',
      detail: 'The team now has a release issue layout covering repo alignment, GitHub Pages hosting, CI gates, Supabase security, Showdown data promotion, launch, rollback, and post-trust growth.'
    }
  ],
  validation: [
    {
      status: 'validated',
      title: 'Focused local damage-log proof is green',
      detail: '`recoil_faint_turn_log_tests.js` now proves an overkill hit records applied HP loss in visible logs and damage_events, preserves larger formula output as `calculated_damage`, records `overkill_damage`, marks the HP cap, and bases recoil on applied damage.'
    },
    {
      status: 'validated',
      title: 'Strict turn-log damage contract is green',
      detail: '`turn_log_export_validator_tests.js` now requires damage_events to include `damage`, `applied_damage`, `hp_delta`, `calculated_damage`, `overkill_damage`, `damage_capped_by_hp`, and target HP bounds, and rejects rows where applied damage does not equal HP lost.'
    },
    {
      status: 'validated',
      title: 'Run All doubles validator proof is green',
      detail: 'Four v2.1.37 GitHub Pages Run All doubles exports from June 23 validate with zero errors after the no-valid-target guard was corrected for post-turn replacement timing. The sample covers 23 turns, 56 damage events, 18 spread hits, 26 capped/overkill damage rows, 5 crits, 33 super-effective hits, Tailwind, Trick Room, Mega evolution, Knock Off removal, Protect, stat drops, and typed item boosts.'
    },
    {
      status: 'validated',
      title: 'Stable action identity export is green',
      detail: 'v2.1.39 turn-log action rows now include actor_key, target_key, and target_side. The focused engine test asserts those fields directly, and seven fresh v2.1.38 browser logs validate after the action-order guard stopped using display names as unique identities.'
    },
    {
      status: 'validated',
      title: 'Fresh v2.1.39 browser logs are structurally clean',
      detail: 'Six fresh doubles exports from the public page validate with zero errors and zero warnings across 40 turns, 144 action rows, and 108 damage events. The batch proves stable action keys, direct damage, super-effective/resisted damage, crits, capped overkill rows, typed-item/Knock Off item evidence, Tailwind, and Trick Room. It does not include spread-hit damage rows, so spread coverage still needs targeted fresh logs.'
    },
    {
      status: 'validated',
      title: 'Approved-team selector gate is green locally',
      detail: '`t9j11_tests.js` now proves known illegal imported moves are hard-blocked and the visible runtime selector catalog is the 10 approved Champion-legal test rows. Still-conflicting or inferred rows such as `champions_arena_3rd` and `perish_trap_gengar` are removed from the runtime catalog until reviewed.'
    },
    {
      status: 'validated',
      title: 'Supabase app wiring is live for existing app tables',
      detail: 'The deployed page has runtime Supabase config, and read checks reached teams, team_members, and analyses through the public anon path.'
    },
    {
      status: 'validated',
      title: 'Local DB contract suite is green',
      detail: '`bash tests/_run_all_db.sh` passes the local DB adapter/schema contract suites in mock/offline mode. Live Supabase freshness checks require `RUN_LIVE_DB=1` and valid anon credentials, so this proves the repo-side DB contract, not that every remote row is current.'
    },
    {
      status: 'validated',
      title: 'Latest v2.1.42 browser logs validate and expose effect evidence',
      detail: 'Six fresh GitHub Pages exports from v2.1.42 validate with zero errors and zero warnings across 34 turns, 124 action rows, 98 damage events, and 18 effect_events. They prove stable IDs, super-effective/resisted damage, crits, HP caps, recoil rows, Knock Off boost evidence, typed held-item boost evidence, stat-stage damage rows, priority actions, and Leftovers item recovery. They do not prove drain, Shed Tail, Wish, Leech Seed, spread rows, or screen reduction in that batch because those mechanics did not occur.'
    },
    {
      status: 'validated',
      title: 'Fresh v2.1.43 single logs exposed recoil evidence naming drift',
      detail: 'Two fresh singles exports from the v2.1.43 public page validate structurally with zero errors and zero warnings across 20 turns. They confirm the new qa_coverage_summary is present, but they also exposed an export-evidence issue: when recoil KOed the user, hp_delta showed the actual HP lost while damage_applied_to_user still carried the uncapped formula recoil. v2.1.44 fixes that naming drift and adds validator coverage.'
    },
    {
      status: 'validated',
      title: 'Live exported logs prove the sim now runs',
      detail: 'Fresh GitHub Pages turn-log exports from June 22 have no team-load failure, pass the strict stable turn-log validator with zero warnings, and carry the live source URL for traceability.'
    },
    {
      status: 'validated',
      title: 'Latest v2.1.33 logs pass strict structure and expose stacked mechanics evidence',
      detail: 'Five June 22 exports carry build_id v2.1.33-log-target-guard and pass strict validation with zero warnings across 27 turns. They include 67 damage events, 31 super-effective hits, 14 resisted hits, 20 typed held-item boosts, 5 Knock Off boosts, 28 spread reductions, 8 sun weather boosts, 5 stat-stage damage rows, and 8 exact-speed-tie markers. The only no-valid-target line is terminal after the player side is empty, consecutive Torkoal Protect failures are expected, and no Tera Blast event appeared in this batch. The source_url query still showed ?v=e209f3b, so build_id is the authoritative bundle proof for these files.'
    },
    {
      status: 'validated',
      title: 'Item timing regression reproduced and covered',
      detail: 'Fresh logs showed Sitrus restoring after a 0 HP hit; items_tests.js now verifies surviving Sitrus, lethal Sitrus rejection, lethal Oran rejection, and battle-log faint behavior.'
    },
    {
      status: 'validated',
      title: 'Live logs exposed stale DB item drift',
      detail: 'The June 21 live logs still showed SV/unsupported items from loaded opponent teams, including Life Orb, Assault Vest, Choice Specs, Rocky Helmet, Safety Goggles, and Loaded Dice. The v2.1.23 DB merge gate blocks those rows before they can enter selectors or Run All.'
    },
    {
      status: 'validated',
      title: 'Fresh logs exposed a targeting boundary bug',
      detail: 'The latest logs stayed structurally clean, but deeper replay review found Hyper Voice and stale single-target actions reporting no valid target while another opposing slot was still active. Runtime bridge tests now enumerate every generated Showdown target value, and move registry tests cover spread targeting plus stale opposing-target retargeting.'
    },
    {
      status: 'validated',
      title: 'Previous v2.1.36 release checks were green',
      detail: 'v2.1.36 Core Move Parity carried v2.1.35 Low Kick Weight Parity, v2.1.34 Live Log Proof, v2.1.33 Log Target Guard, v2.1.32 Tera Blast Parity, v2.1.31 Editor Builder Roadmap, v2.1.30 Spread Legality Guard, v2.1.29 Knock Off guard, and v2.1.28 mechanics stack guard. The current local damage-log and approved-team-gate slice has focused green checks, but still needs full stress, bundle rebuild, deploy, and browser exports before release proof.'
    },
    {
      status: 'validated',
      title: 'Low Kick weight-based damage matches Showdown',
      detail: 'Showdown data/moves.ts records Low Kick basePower as 0 because it is target-weight based. The engine now reads target species weight from the generated Showdown pokedex weight companion file, selects the official weight tier, and has oracle cases for Tyranitar and Froslass so Low Kick no longer becomes zero damage.'
    },
    {
      status: 'validated',
      title: 'Damage stack oracle is green for covered mechanics',
      detail: 'showdown_damage_oracle_tests.js covers Low Kick target-weight base power, isolated Tera Blast parity, former baseline direct/spread damage ranges, Foul Play target-Attack damage, and Darkest Lariat defense-stage bypass, alongside terrain, weather, ability, screen, immunity, item, and spread-sensitive damage cases. Current Champions Reg M-A battle runs gate Tera off by default.'
    },
    {
      status: 'validated',
      title: '100% Champion parity checklist is explicit',
      detail: 'reports/champion_parity_100_checklist.md defines the practical 100% gate: 120 shipped moves verified with zero baseline/incomplete rows, legal Champion teams, DB rows unable to override clean bundled data, browser single-run/Run All/QA artifact proof, current source versions, and every known gap labeled before accuracy claims.'
    },
    {
      status: 'validated',
      title: 'Tera Blast parity is isolated from current Reg M-A',
      detail: 'v2.1.32 kept Tera Blast parity for explicit ruleset/test contexts. v2.1.83 gates current Champions Reg M-A battles so stale Tera fields and Tera Blast data do not auto-activate Terastallization or create Reg M-A replay logs that teach mechanics not enabled for that ruleset.'
    },
    {
      status: 'validated',
      title: 'Knock Off source-truth behavior is documented',
      detail: 'The release notes now state the Showdown-first rule: legal no-item targets get no boost or removal, removable held items get the boost and post-damage removal, corresponding Mega Stones are protected even before Mega activation, and Sticky Hold blocks removal while preserving the boost.'
    },
    {
      status: 'validated',
      title: 'Champion SP legality source guard is green',
      detail: 'Pokemon Showdown Champion validation rejects more than 32 Stat Points per stat and the repo validator caps Champion spreads at 32 per stat and 66 total. A public preview article says 31 per stat, so that source conflict is documented as an open review note while the sim follows Showdown behavior until a stronger Champion source changes it.'
    },
    {
      status: 'validated',
      title: 'Turn-order stack evidence is green',
      detail: 'turn_order_priority_tests.js now checks SP-aware effective Speed stacks from stat stage, Choice Scarf, Tailwind, and exact-speed ties, while turn_log_export_validator_tests.js still guards observed action order.'
    },
    {
      status: 'validated',
      title: 'Priority and turn-log tests are green',
      detail: 'showdown_priority_drift_tests.js, showdown_approved_data_generator_tests.js, turn_order_priority_tests.js, recoil_faint_turn_log_tests.js, move_support_audit_tests.js, and turn_log_export_validator_tests.js passed after the fixes.'
    },
    {
      status: 'validated',
      title: 'Ability coverage guard is green',
      detail: 'ability_coverage_audit_tests.js reports 80/80 curated and mega abilities modeled; ability_damage_parity_tests.js and ability_priority_targeting_tests.js cover the current high-risk behavior paths added in the ability parity slice.'
    },
    {
      status: 'validated',
      title: 'Priority-suppression family now has same-rule regression proof',
      detail: 'Issue #149 raised the long-tail risk that Armor Tail could be covered while same-family blockers drifted. ability_priority_targeting_tests.js now keeps Armor Tail, Dazzling, and Queenly Majesty on the same Fake Out suppression contract so coaching and QA do not learn a false opening-turn line from an omitted sibling ability.'
    },
    {
      status: 'validated',
      title: 'Bundle freshness rule remains active',
      detail: 'The standalone GitHub Pages bundle must be rebuilt from source and the service-worker cache must be bumped for every engine, legality, or data-path release. This current local slice is not release-proven until that bundle and deployed-browser proof are complete.'
    },
    {
      status: 'validated',
      title: 'GitHub issue sweep completed',
      detail: 'Open issues were checked in TheYfactora12 and alfredocox repos on June 25. Active sim-truth trackers are Alfredo #241 and Y #137 for live approved-DB generation/override proof, Alfredo #231 and Y #123 for Josh/JD data audit risk, Alfredo #220 for full six-mon replay parsing, Alfredo #213 and Y #103 for deployment/cache hardening, Alfredo #206/#204 and Y #96/#94 for stress/legal-set automation, and Alfredo #35/Y #4 for the public Champions damage oracle. Alfredo #239 and #240 are closed and should not be treated as active blockers.'
    },
    {
      status: 'validated',
      title: 'v2.2.30 replay detail release is validated',
      detail: 'TheYfactora12 main CI completed successfully on merge commit 880b2e4 for PR #160, and Alfredo PR #256 merged the same v2.2.30 tree after all required checks passed, including the 5,070-battle Battle Audit. This closes the repo-sync proof for the replay detail row slice.'
    },
    {
      status: 'validated',
      title: 'Action-denial slice 1 proof started',
      detail: 'ability_priority_targeting_tests.js now asserts structured failure evidence for Armor Tail, Dazzling, and Queenly Majesty priority suppression, while phase5_turn_log_tests.js proves QA coverage counts blocked priority, ability blockers, Quick Guard, Psychic Terrain, and Fake Out timing separately.'
    },
    {
      status: 'validated',
      title: 'Previous Y/Alfredo source sync completed',
      detail: 'Alfredo PR #245 merged the prior Champion parity tree after required checks passed, and TheYfactora12 main was fast-forwarded to the same merge commit. The current local damage-log and approved-team-gate slice should prove out on the Y fork first; Alfredo sync is lower priority until the browser proof gate is clean.'
    }
  ],
  gaps: [
    {
      status: 'gap',
      title: 'Most bundled teams are review data, not release-safe opponents',
      detail: 'The current audit found only `mega_altaria` and `mega_dragonite` are approved Champion-legal fallback rows under the current Showdown-backed move legality gate. Twenty-five legacy, inferred, or move-conflict rows are removed from the runtime catalog until replaced by approved Champion teams or backed by reviewed Champion overrides.'
    },
    {
      status: 'gap',
      title: 'Damage calculator is improved, not globally proven 100%',
      detail: 'The confirmed applied-vs-calculated log/recoil bug is fixed locally, and the existing damage oracle remains green for covered cases. Broad damage accuracy still requires more long-tail proof around remaining Champion overrides, redirection, Protect-family interactions, switching/replacement timing, status/item edge cases, and deployed browser logs.'
    },
    {
      status: 'gap',
      title: 'Champions override seed/review remains open',
      detail: 'Alfredo #241 is partly closed in repo: live approved_showdown_entities plus approved_champions_data generated pokemon_showdown_legal_data.js on June 25 with 8,653 approved entities and 0 active overrides, source-truth tests passed, runtime bridge and battle helpers prefer generated data, legality reads generated learnsets, and SupabaseAdapter exposes read-only loadShowdownEntities. Remaining risk is seeding/reviewing Champions overrides and keeping source drift visible before release.'
    },
    {
      status: 'gap',
      title: 'Pokemon data audit has unresolved reviewer risk',
      detail: 'Josh/JD notes on Alfredo #231 flag that Showdown data is present but not fully used for every move calculation and regional forms such as Arcanine may still need targeted review.'
    },
    {
      status: 'gap',
      title: '100% parity still has non-move gates',
      detail: 'The team-load, item timing, ability inventory, typed held-item damage boosts, Champion-gated legacy Tera data, Low Kick target-weight base power, Knock Off removable-item behavior, stat/speed snapshot evidence, target category bridge, stale opposing-target retarget, and shipped move-support slices are covered. Move support is 120 verified / 0 baseline / 0 incomplete. Remaining 100% proof still needs deployed-browser single/Run All/QA artifacts, DB runtime-source promotion or explicit static fallback signoff, source-drift visibility, and deeper long-tail checks for redirection, Protect-family interactions, switching/replacement, status, items, and Champion overrides as sources change.'
    },
    {
      status: 'gap',
      title: 'Mechanics truth beta gate remains open',
      detail: 'Issue #149 stays open until the long-tail mechanics inventory is explicit and source-backed: same-family priority suppression, multi-effect move stacks, field/state legality shifts, Fake Out windows, flinch/status action denial, and replay/QA evidence all need deterministic proof before broader coaching trust claims.'
    },
    {
      status: 'gap',
      title: 'Deployment hardening and cache safety remain open',
      detail: 'Alfredo #213 and Y #103 remain open for deployment hardening, cache safety, and abuse protection. The current release bumps cache names and verifies bundle freshness, but broader deploy/security hardening is still issue-backed work.'
    },
    {
      status: 'gap',
      title: 'Source refresh needed must be visible before trust claims',
      detail: 'If Showdown sync hashes or Champion secondary sources change, the site should show an update-needed state until the change is reviewed, tested, and either promoted into generated data or documented as a Champions override.'
    },
    {
      status: 'gap',
      title: 'Reg M-B source review is now a ruleset migration blocker',
      detail: 'The June 27 source review now exposes Reg M-B as the active source-review lane while keeping the implemented validator on the historical Reg M-A lane. Victory Road confirms the Reg M-B window, Worlds usage, Mega Evolution support, full Pokemon image sheets, and 16 new Mega names. Next work is source-backed data conversion: explicit species/form rows, Mega stone/item names, stats, abilities, typing, Champion overrides, and refreshed QA artifacts before changing runtime legality.'
    },
    {
      status: 'gap',
      title: 'Full raw thousand-battle retention is still not automatic',
      detail: 'The sim can run thousands of battles, but normal UI retention is bounded: replay cards cap at 240, raw replay display shows the last 200 lines, stored sim logs cap at 500 total and 100 per matchup pair. The QA artifact now exports retained evidence plus caps; a later artifact-stream mode is still needed if every raw battle log must be preserved.'
    },
    {
      status: 'gap',
      title: 'Battle Sensei tactical learning is still being built',
      detail: 'Replay upload friction is fixed, but number-one coaching needs the brain layer: speed-control reversal/neutralization, deferred payoff, move/target alternatives, switch preservation, decision-opportunity denominators, and repeated matchup learning. Manual team selection must lock the registered team for the sim scope; BO3/BO5 may only swap selected game lineups from that same six.'
    },
    {
      status: 'gap',
      title: 'Supabase history is not full forensic turn-log storage yet',
      detail: 'Saved analysis history keeps bounded matchup summaries and capped log rows. The current source of truth for structured QA evidence is the downloaded turn-log JSON and QA Artifact export, which carry full turn snapshots, damage_events, and effect_events. Treat DB history as replay/navigation support until a reviewed DB retention upgrade preserves detailed turn logs intentionally.'
    },
    {
      status: 'gap',
      title: 'Team editor is guarded but not a fluid full builder yet',
      detail: 'The current edit-team surface now blocks illegal Champion SP saves, but it is still a clunky set editor rather than a fully customizable Champion team builder. Later UX work should support fast add/remove/reorder Pokemon, searchable species/forms/items/abilities/moves, SP sliders with live legality totals, import/export, DB save status, and rollback without breaking sim source truth.'
    },
  ],
  next: [
    {
      status: 'next',
      title: 'Stress-test, rebuild, and prove the new truth board',
      detail: 'After v2.2.31 deploys, use the fresh cache-busted URL to export one single-run log, one Run All or Stress Lite artifact depending on device safety, and one QA Artifact. Confirm build_id/source_url, detailed replay rows, move-failure evidence, retained coverage totals, and no stale cache before using the result as public proof.'
    },
    {
      status: 'next',
      title: '#223 Battle Sensei speed-control payoff interpreter',
      detail: 'Active brain-layer work: classify Trick Room/Tailwind reversal, dual-speed neutralization, immediate conversion, T+1 to T+3 deferred payoff, planned speed transitions, and complementary setup/protection payoff before the Decision Opportunity Ledger scores decisions.'
    },
    {
      status: 'next',
      title: '#224 Decision Opportunity Ledger after #223',
      detail: 'Later layer: add opportunity denominators, positive execution notes, four-quadrant decision outcomes, and denominator-weighted Battle IQ after tactical interpretation is reliable.'
    },
    {
      status: 'next',
      title: 'Convert stress and legal-set issues into repo gates',
      detail: 'Use `POKESIM_CODEX_STRESS_TEST_BRIEF.md` plus Alfredo #206/#204 and Y #96/#94 to add deterministic stress, legal-set generation, invariant, browser-smoke, bundle-drift, and preserved-failing-seed scripts instead of relying on manual downloaded logs.'
    },
    {
      status: 'next',
      title: 'Replace removed teams with approved Champion teams',
      detail: 'Move the testing catalog toward roughly 10 current Champion competitive/tournament archetypes in Supabase and bundled fallback: Trick Room, anti-Trick Room, Tailwind/speed, sun, rain, sand or snow, bulky balance, hyper offense, setup/boosting, and control/status/positioning. A DB team is selectable only after Champion SP, item, species/form, move legality, source provenance, and override checks pass; DB existence alone is not enough.'
    },
    {
      status: 'next',
      title: 'Verify the next deployed source URL and QA artifact',
      detail: 'Use the newest GitHub Pages commit URL, fresh logs, and the QA Artifact export to confirm the build label, source URL query, stable turn-log fields, qa_coverage_summary, applied/calculated damage fields, effect_events for HP-changing effects, no team-load failure, retained-evidence summary, speed_order_details, stat_boosts, legal Champion SP team data, no Champion-format Terastallized lines, Low Kick/Knock Off evidence when present, move-secondary evidence when present, and no live-target no-valid-target skips.'
    },
    {
      status: 'next',
      title: 'Mirror or update JD issue alignment in the Y fork',
      detail: 'The Y fork has #137 and #123 for the current source-truth/data-audit mirrors. Alfredo #241 should stay linked there; Alfredo #239 and #240 are closed, so do not list either as an active blocker.'
    },
    {
      status: 'next',
      title: 'Apply Champion item cleanup to live Supabase rows',
      detail: 'Use the v2.1.23 item-block evidence and v2.1.30 SP-spread guard to update, reject, or remove stale Supabase team rows so the DB matches Champion source truth instead of relying only on frontend gating.'
    },
    {
      status: 'next',
      title: 'Seed and review Champions overrides',
      detail: 'Live approved DB generation is now proven with 8,653 approved entities and 0 active overrides. Keep Alfredo #241 and Y #137 open until Champions-specific deltas are either seeded into champions_overrides with source notes or explicitly signed off as not needed, then rebuild, rerun source-truth tests, and capture browser proof.'
    },
    {
      status: 'next',
      title: 'Design DB forensic log retention before relying on saved history',
      detail: 'If QA needs Supabase to be the long-term audit store, add a reviewed schema/payload path for structured turnLog, damage_events, effect_events, build_id, source_url, and retention metadata. Until then, keep QA Artifact exports as the authoritative evidence bundle.'
    },
    {
      status: 'next',
      title: 'Prove post-move mechanics by battle system',
      detail: 'With the shipped move audit at 120 verified / 0 baseline / 0 incomplete, continue from exported-log evidence into deployed-browser proof, DB approved-runtime promotion, long-run/golden trace auditing, source-drift guardrails, and battle-system slices for redirection, Protect family, switching/replacement, status, abilities, items, terrain/weather, and Champion-only overrides.'
    },
    {
      status: 'next',
      title: 'Close the mechanics truth beta gate',
      detail: 'Continue issue #149 from the Pokemon Champions mechanics truth gate: finish action-denial and priority-suppression reason inventory for singles and doubles, then move family-by-family through targeting/immunity, Protect/guard, multi-effect moves, field durations, items/abilities, switching/replacement, spread/doubles resolution, singles resolution, and coaching-safe learning.'
    },
    {
      status: 'next',
      title: 'Public launch readiness guardrail',
      detail: 'Overall product note: the sim is strong as a domain-specific Pokemon Champions platform, but public launch readiness depends on tightening trust clarity before adding more surface area. Highest-priority readiness work is one canonical release manifest/build ID, agreement between visible version, service worker, bundle SHA, source-sync status, and GitHub Pages artifact, then UI/runtime modularization, structured logging, performance profiling, battle-log caps, accessibility, XSS/security review, Supabase RLS/privacy review, auth/payment entitlement boundaries, and conservative coaching claims until simulator truth can prove them.'
    },
    {
      status: 'next',
      title: 'Smooth the team editor, set editor, and upload edit flow',
      detail: 'The current edit-team, individual Pokemon, set-editor, and upload/import areas are functional but not smooth enough for public use. Next UX slice should make Showdown-style editing fluid: searchable legal move/item fields, clearer per-Pokemon edit state, upload-to-edit handoff, save/cancel protection, and legality-aware guardrails so players can customize teams without corrupting approved data.'
    },
    {
      status: 'next',
      title: 'Make replay and QA transparency strong enough for coaching trust',
      detail: 'Before heavier coaching expansion, the replay/export layer should make field state, volatile/action-denial reasons, HP-loss causes, and move-failure causes obvious enough that a player or reviewer can challenge the sim without reading raw engine code.'
    },
    {
      status: 'next',
      title: 'Rebuild editor into full Champion team builder',
      detail: 'After the current sim-truth gates, replace the clunky set editor with a fluid team builder that lets users customize complete Champion teams while preserving legality guardrails, source-truth validation, Supabase persistence, and clean rollback paths.'
    },
    {
      status: 'next',
      title: 'Keep Alfredo and Y fork synced through protected PRs',
      detail: 'Direct Alfredo main pushes are blocked by repository rules, so future parity slices should land in TheYfactora12, pass live-page checks, then sync to Alfredo through a reviewed PR with required checks before fast-forwarding the fork back to the same merge commit.'
    },
    {
      status: 'next',
      title: 'Add Showdown oracle release gates',
      detail: 'Use Pokemon Showdown / @smogon/calc / @pkmn-style smoke cases for behavior that cannot be proven from static rows alone, with Champions overrides documented separately.'
    },
    {
      status: 'next',
      title: 'Surface source drift as update needed in Overview',
      detail: 'Use Showdown sync run metadata, source file hashes, and reviewed Champion-source notes to mark data or mechanics as update-needed instead of silently trusting stale snapshots.'
    }
  ],
  decisions: [
    {
      status: 'decision',
      title: 'Runtime DB reads vs generated offline bundle',
      detail: 'Current architecture direction: Supabase stores approved source data, overrides, teams, and audit/history; generated assets and runtime_data.js feed deterministic engine code for offline GitHub Pages reproducibility. Only change this with an explicit reviewed decision.'
    },
    {
      status: 'decision',
      title: 'Issue mirroring policy between repos',
      detail: 'Decide whether JD/Josh issues should be duplicated in both repos or whether the Y fork should keep one tracker issue linking the Alfredo source tickets. Closed upstream items such as Alfredo #240 should be recorded as resolved, not mirrored as open work.'
    },
    {
      status: 'decision',
      title: 'Damage oracle source order',
      detail: 'Keep Pokemon Showdown and Smogon calc as baseline oracles, but require explicit source notes and tests for Champions-specific differences.'
    },
    {
      status: 'decision',
      title: 'Source challenge process',
      detail: 'Use docs/DATA_SOURCE_REGISTRY.md as the page to challenge stale or weak sources. Showdown proves baseline data and mechanics, Champion regulation sources prove active legality, usage/meta pages inform coaching, and QA artifacts prove what this app actually executed.'
    }
  ],
  flow: [
    { label: 'Showdown upstream', active: true },
    { label: 'Raw snapshots', active: true },
    { label: 'showdown_entities', active: false },
    { label: 'approved views', active: false },
    { label: 'champions_overrides', active: false },
    { label: 'generated JS', active: true },
    { label: 'runtime consumers', active: false },
    { label: 'release gates', active: true }
  ],
  docs: [
    { label: 'Recent Fix + Issue Snapshot', href: 'reports/recent-fixes-and-open-issues-2026-06-21.md' },
    { label: 'Architecture + Evidence Map', href: 'docs/CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md' },
    { label: 'Data Source Registry', href: 'docs/DATA_SOURCE_REGISTRY.md' },
    { label: 'Source Truth Document Audit', href: 'docs/SOURCE_TRUTH_DOCUMENT_AUDIT_2026-06-26.md' },
    { label: 'QA Baseline Snapshot', href: 'reports/champion_qa_baseline_snapshot.md' },
    { label: 'Approved Runtime Team Test Matrix', href: 'reports/approved_runtime_team_test_matrix.md' },
    { label: 'Mechanics Truth Beta Gate Checklist', href: 'reports/mechanics_truth_beta_gate_checklist.md' },
    { label: 'Champion Parity 100 Checklist', href: 'reports/champion_parity_100_checklist.md' },
    { label: 'Move Support Audit', href: 'reports/move_support_audit.md' },
    { label: 'Type Multiplier Audit', href: 'reports/type_multiplier_audit.md' },
    { label: 'Simulation First', href: '../docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md' },
    { label: 'Public Release Plan', href: '../docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md' },
    { label: 'Showdown DB Stress Test', href: '../docs/release/SHOWDOWN_DB_WIRING_STRESS_TEST_2026-06-06.md' },
    { label: 'Jdoutt38 Investigation', href: '../docs/release/JDOUTT38_INVESTIGATION_2026-06-06.md' },
    { label: 'Closure Confidence', href: '../docs/release/CLOSURE_CONFIDENCE_2026-06-06.md' },
    { label: 'Repo Parity Report', href: '../docs/release/REPO_PARITY_REPORT_2026-06-06.md' },
    { label: 'Closeout Note', href: '../docs/release/CLOSEOUT_2026-06-06.md' },
    { label: 'Showdown DB Plan', href: 'docs/SHOWDOWN_DB_SOURCE_OF_TRUTH_PLAN.md' },
    { label: 'Battle Sensei Simple Source Truth', href: 'docs/BATTLE_SENSEI_EXPLAINED_SIMPLY.md' },
    { label: 'Runtime Naming Cheat Sheet', href: 'docs/SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md' },
    { label: 'Showdown Sync Architecture', href: 'docs/SHOWDOWN_SYNC_ARCHITECTURE.md' },
    { label: 'Spec Index', href: 'docs/SPECS_INDEX.md' }
  ]
};

function csOverviewStatusLabel(status) {
  var labels = {
    done: 'Done',
    validated: 'Closed',
    next: 'Next',
    gap: 'Open',
    decision: 'Decision'
  };
  return labels[status] || status || 'Open';
}

function csRenderOverviewRows(rows) {
  return (rows || []).map(function(row) {
    var status = row.status || 'next';
    return '<div class="overview-item">' +
      '<span class="overview-status ' + _escapeHtml(status) + '">' + _escapeHtml(csOverviewStatusLabel(status)) + '</span>' +
      '<div><div class="overview-item-title">' + _escapeHtml(row.title) + '</div>' +
      '<div class="overview-item-detail">' + _escapeHtml(row.detail) + '</div></div>' +
    '</div>';
  }).join('');
}

function csRenderOverviewSection(title, kicker, rows) {
  return '<div class="overview-section">' +
    '<div class="overview-section-head"><h3>' + _escapeHtml(title) + '</h3><span class="overview-kicker">' + _escapeHtml(kicker) + '</span></div>' +
    '<div class="overview-list">' + csRenderOverviewRows(rows) + '</div>' +
  '</div>';
}

function csFormatOverviewDate(value) {
  if (!value) return 'not recorded';
  try {
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch (_e) {
    return String(value);
  }
}

function csShortHash(value) {
  var s = String(value || '');
  return s.length > 12 ? s.slice(0, 12) : (s || 'none');
}

function csRenderShowdownDbInspectorState(kind, payload) {
  if (kind === 'loading') {
    return '<div class="overview-db-empty">Checking approved Showdown rows...</div>';
  }
  if (kind === 'error' || !payload || !payload.available) {
    return '<div class="overview-db-empty">' + _escapeHtml(payload && payload.message ? payload.message : 'Showdown DB unavailable') + '</div>';
  }
  var run = payload.latestRun || {};
  var counts = (payload.approvedCounts || []).map(function(row) {
    var count = row.count == null ? 'n/a' : String(row.count);
    return '<div class="overview-db-count"><strong>' + _escapeHtml(row.kind) + '</strong><span>' + _escapeHtml(count) + '</span></div>';
  }).join('');
  var files = (payload.sourceFiles || []).map(function(file) {
    return '<tr><td>' + _escapeHtml(file.source_name || 'unknown') + '</td>' +
      '<td>' + _escapeHtml(file.parse_status || 'unknown') + '</td>' +
      '<td>' + _escapeHtml(csShortHash(file.source_hash)) + '</td>' +
      '<td>' + _escapeHtml(String(file.byte_size || 0)) + '</td></tr>';
  }).join('');
  var sample = (payload.approvedSample || []).map(function(row) {
    return '<tr><td>' + _escapeHtml(row.entity_kind || '') + '</td>' +
      '<td>' + _escapeHtml(row.display_name || row.entity_key || '') + '</td>' +
      '<td>' + _escapeHtml(csShortHash(row.source_hash)) + '</td>' +
      '<td>' + _escapeHtml(csFormatOverviewDate(row.approved_at || row.created_at)) + '</td></tr>';
  }).join('');
  return '<div class="overview-db-summary">' +
      '<div><strong>Latest run</strong><span>' + _escapeHtml(run.sync_run_id || 'none found') + '</span></div>' +
      '<div><strong>Status</strong><span>' + _escapeHtml(run.status || payload.mode || 'unknown') + '</span></div>' +
      '<div><strong>Finished</strong><span>' + _escapeHtml(csFormatOverviewDate(run.finished_at)) + '</span></div>' +
    '</div>' +
    '<div class="overview-db-counts">' + counts + '</div>' +
    '<div class="overview-db-table-wrap"><table class="overview-db-table"><thead><tr><th>Source</th><th>Parse</th><th>Hash</th><th>Bytes</th></tr></thead><tbody>' +
      (files || '<tr><td colspan="4">No source-file rows readable yet</td></tr>') +
    '</tbody></table></div>' +
    '<div class="overview-db-table-wrap"><table class="overview-db-table"><thead><tr><th>Kind</th><th>Approved row</th><th>Hash</th><th>Approved</th></tr></thead><tbody>' +
      (sample || '<tr><td colspan="4">No approved rows readable yet</td></tr>') +
    '</tbody></table></div>';
}

function csToggleShowdownDbInspector() {
  var body = document.getElementById('overview-showdown-db-inspector-body');
  var button = document.getElementById('overview-showdown-db-inspect');
  if (!body || !button) return;
  var opening = body.hidden;
  body.hidden = !opening;
  button.setAttribute('aria-expanded', opening ? 'true' : 'false');
  if (!opening) return;
  body.innerHTML = csRenderShowdownDbInspectorState('loading');
  var adapter = (typeof window !== 'undefined') ? window.SupabaseAdapter : null;
  if (!adapter || !adapter.enabled || typeof adapter.loadShowdownDbSnapshot !== 'function') {
    body.innerHTML = csRenderShowdownDbInspectorState('error', { available: false, message: 'Static bundle' });
    return;
  }
  adapter.loadShowdownDbSnapshot().then(function(snapshot) {
    body.innerHTML = csRenderShowdownDbInspectorState('ready', snapshot);
  }).catch(function() {
    body.innerHTML = csRenderShowdownDbInspectorState('error', { available: false, message: 'Showdown DB unavailable' });
  });
}

function renderOverviewTab() {
  var host = document.getElementById('overview-content');
  if (!host) return false;
  var data = CS_OVERVIEW_DATA;
  var metrics = data.metrics.map(function(metric) {
    var idAttr = metric.label === 'Showdown DB' ? ' id="overview-showdown-db-status"' : '';
    var action = metric.label === 'Showdown DB'
      ? '<button type="button" class="overview-metric-action" id="overview-showdown-db-inspect" aria-controls="overview-showdown-db-inspector-body" aria-expanded="false">Inspect</button>'
      : '';
    return '<div class="overview-metric"' + idAttr + '><strong>' + _escapeHtml(metric.label) + '</strong><span>' + _escapeHtml(metric.value) + '</span>' + action + '</div>';
  }).join('');
  var flow = data.flow.map(function(step) {
    return '<span class="overview-flow-step' + (step.active ? ' active' : '') + '">' + _escapeHtml(step.label) + '</span>';
  }).join('');
  var docs = data.docs.map(function(doc) {
    return '<a href="' + _escapeHtml(doc.href) + '" target="_blank" rel="noopener">' + _escapeHtml(doc.label) + '</a>';
  }).join('');
  host.innerHTML =
    '<div class="overview-metrics">' + metrics + '</div>' +
    '<div class="overview-grid">' +
      '<div class="overview-list">' +
        csRenderOverviewSection('Completed Work', 'shipped', data.shipped) +
        csRenderOverviewSection('Closed Proof', 'closed', data.validation) +
      '</div>' +
      '<div class="overview-list">' +
        csRenderOverviewSection('Open Issues', 'not done yet', data.gaps) +
        csRenderOverviewSection('Milestones', 'roadmap', data.next) +
        csRenderOverviewSection('Open Decisions', 'team review', data.decisions) +
        '<div class="overview-section">' +
          '<div class="overview-section-head"><h3>Source Of Truth Flow</h3><span class="overview-kicker">target</span></div>' +
          '<div class="overview-flow">' + flow + '</div>' +
          '<div class="overview-db-inspector" id="overview-showdown-db-inspector-body" hidden></div>' +
          '<div class="overview-doc-links">' + docs + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  var inspectButton = document.getElementById('overview-showdown-db-inspect');
  if (inspectButton) inspectButton.addEventListener('click', csToggleShowdownDbInspector);
  csUpdateShowdownDbStatus();
  return true;
}

function csUpdateShowdownDbStatus() {
  var node = document.getElementById('overview-showdown-db-status');
  if (!node) return;
  var span = node.querySelector('span');
  if (!span) return;
  var adapter = (typeof window !== 'undefined') ? window.SupabaseAdapter : null;
  if (!adapter || !adapter.enabled || typeof adapter.loadShowdownDbStatus !== 'function') {
    span.textContent = 'Static bundle';
    return;
  }
  adapter.loadShowdownDbStatus().then(function(status) {
    if (!status || !status.available) {
      span.textContent = status && status.message ? status.message : 'Static bundle';
    } else if (status.mode === 'approved-db') {
      span.textContent = 'Approved DB active';
    } else if (status.mode === 'empty-db') {
      span.textContent = 'DB views empty';
    } else {
      span.textContent = status.message || 'DB reachable';
    }
  }).catch(function() {
    span.textContent = 'Static bundle';
  });
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.overview = {
    data: CS_OVERVIEW_DATA,
    renderOverviewTab: renderOverviewTab
  };
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderOverviewTab', renderOverviewTab);

function csGetGeneratedSourceSyncStatus() {
  if (typeof window === 'undefined' || !window.ChampionsSim) return null;
  return window.ChampionsSim.sourceSyncStatus || null;
}

function csFormatSourceStamp(value) {
  if (!value) return 'Unknown';
  if (typeof value === 'string' && /T\d{2}:\d{2}:\d{2}/.test(value)) return csFormatOverviewDate(value);
  return String(value);
}

function csRenderSourceSyncRows(status, dbSnapshot) {
  var generated = status && status.generatedShowdown ? status.generatedShowdown : {};
  var review = status && status.reviewTracks ? status.reviewTracks : {};
  var db = status && status.approvedDb ? status.approvedDb : {};
  var dbLiveRun = dbSnapshot && dbSnapshot.latestRun ? dbSnapshot.latestRun : null;
  var dbApprovedCounts = dbSnapshot && Array.isArray(dbSnapshot.approvedCounts) ? dbSnapshot.approvedCounts : [];
  var dbApprovedTotal = dbApprovedCounts.reduce(function(sum, row) {
    return sum + (Number(row && row.count) || 0);
  }, 0);
  return [
    {
      track: 'Generated Showdown runtime snapshot',
      stamp: csFormatSourceStamp(generated.generatedAt),
      marker: generated.sourceCommitOrVersion || generated.source || 'Unknown',
      why: 'Offline-safe baseline for runtime species, moves, learnsets, target categories, and legality metadata.'
    },
    {
      track: 'Approved Showdown DB generation',
      stamp: dbLiveRun && dbLiveRun.finished_at ? csFormatSourceStamp(dbLiveRun.finished_at) : csFormatSourceStamp(db.generatedAt),
      marker: dbLiveRun && dbLiveRun.sync_run_id
        ? dbLiveRun.sync_run_id + ' · ' + (dbApprovedTotal || db.approvedEntityCount || 0) + ' approved'
        : (db.approvedEntityCount || 0) + ' approved · ' + (db.activeOverrideCount || 0) + ' active overrides',
      why: 'Read-only approved DB snapshot used to inspect live source freshness and promotion state when Supabase is reachable.'
    },
    {
      track: 'Champion regulation review lane',
      stamp: csFormatSourceStamp(review.regulationReviewAt),
      marker: review.regulationLabel || 'Review lane',
      why: 'Human-reviewed regulation and Champion-only source notes that stay blocked until the team approves promotion.'
    },
    {
      track: 'Sources page release snapshot',
      stamp: csFormatSourceStamp(status && status.sourcesPageReviewedAt),
      marker: (status && status.buildId) || ((typeof csGetBuildId === 'function') ? csGetBuildId() : 'Unknown build'),
      why: 'Shows which source assumptions this exact browser build is presenting to users.'
    }
  ].map(function(row) {
    return '<tr><td><strong>' + _escapeHtml(row.track) + '</strong></td>' +
      '<td style="font-size:12px">' + _escapeHtml(row.stamp) + '</td>' +
      '<td style="font-size:12px">' + _escapeHtml(row.marker) + '</td>' +
      '<td style="font-size:12px">' + _escapeHtml(row.why) + '</td></tr>';
  }).join('');
}

function csRenderSourceSyncCards(status, dbSnapshot) {
  var generated = status && status.generatedShowdown ? status.generatedShowdown : {};
  var db = status && status.approvedDb ? status.approvedDb : {};
  var dbRun = dbSnapshot && dbSnapshot.latestRun ? dbSnapshot.latestRun : null;
  var dbStatus = dbSnapshot && dbSnapshot.available ? (dbSnapshot.message || dbSnapshot.mode || 'DB reachable') : 'Static bundle / DB unavailable';
  return '<div class="sources-summary-grid">' +
    '<div class="sources-summary-card"><strong>Generated source</strong><span>' + _escapeHtml(generated.source || 'Unknown') + '</span></div>' +
    '<div class="sources-summary-card"><strong>Generated at</strong><span>' + _escapeHtml(csFormatSourceStamp(generated.generatedAt)) + '</span></div>' +
    '<div class="sources-summary-card"><strong>Approved DB</strong><span>' + _escapeHtml(dbStatus) + '</span></div>' +
    '<div class="sources-summary-card"><strong>Latest DB run</strong><span>' + _escapeHtml(dbRun && dbRun.sync_run_id ? dbRun.sync_run_id : (db.syncRunId || 'None visible')) + '</span></div>' +
  '</div>';
}

function csRenderSourceSyncTables(status, dbSnapshot) {
  var rows = csRenderSourceSyncRows(status, dbSnapshot);
  var files = (dbSnapshot && dbSnapshot.sourceFiles || []).map(function(file) {
    return '<tr><td>' + _escapeHtml(file.source_name || 'unknown') + '</td>' +
      '<td>' + _escapeHtml(file.parse_status || 'unknown') + '</td>' +
      '<td>' + _escapeHtml(csShortHash(file.source_hash || file.normalized_hash || '')) + '</td>' +
      '<td>' + _escapeHtml(csFormatSourceStamp(file.fetched_at)) + '</td></tr>';
  }).join('');
  return '<div class="sources-table-card">' +
      '<div class="sources-table-head"><div><span class="badge badge-blue">SOURCE TRACKS</span><h3>Current sync and review state</h3></div><p>Automated source stamps and human review checkpoints shown for this build.</p></div>' +
      '<div class="sources-table-wrap"><table class="series-summary-table sources-table"><thead><tr><th>Source track</th><th>Last synced or reviewed</th><th>Current visible marker</th><th>Why it matters</th></tr></thead><tbody>' +
      rows +
      '</tbody></table></div></div>' +
      '<div class="sources-table-card">' +
      '<div class="sources-table-head"><div><span class="badge badge-blue">LIVE DB FILES</span><h3>Readable upstream file snapshot</h3></div><p>Shown when the approved Supabase views are reachable from the browser.</p></div>' +
      '<div class="overview-db-table-wrap"><table class="overview-db-table"><thead><tr><th>Live source file</th><th>Parse</th><th>Hash</th><th>Fetched</th></tr></thead><tbody>' +
      (files || '<tr><td colspan="4">No live source-file rows readable yet</td></tr>') +
      '</tbody></table></div></div>';
}

function renderSourcesTab() {
  var host = document.getElementById('sources-list');
  if (!host) return false;
  var status = csGetGeneratedSourceSyncStatus() || {};
  host.innerHTML = '<div class="sources-dashboard">' +
    '<div class="sources-dashboard-head">' +
      '<div><span class="badge badge-blue">SOURCE DASHBOARD</span><h3>Freshness, release watch, and trust boundaries</h3></div>' +
      '<p>Readable source-of-truth view for players, QA, and release review.</p>' +
    '</div>' +
    csRenderSourceSyncCards(status, null) +
    csRenderSourceSyncTables(status, null) +
  '</div>';
  var adapter = (typeof window !== 'undefined') ? window.SupabaseAdapter : null;
  if (!adapter || !adapter.enabled || typeof adapter.loadShowdownDbSnapshot !== 'function') return true;
  adapter.loadShowdownDbSnapshot().then(function(snapshot) {
    host.innerHTML = '<div class="sources-dashboard">' +
      '<div class="sources-dashboard-head">' +
        '<div><span class="badge badge-blue">SOURCE DASHBOARD</span><h3>Freshness, release watch, and trust boundaries</h3></div>' +
        '<p>Readable source-of-truth view for players, QA, and release review.</p>' +
      '</div>' +
      csRenderSourceSyncCards(status, snapshot) +
      csRenderSourceSyncTables(status, snapshot) +
    '</div>';
  }).catch(function() {
    host.innerHTML = '<div class="sources-dashboard">' +
      '<div class="sources-dashboard-head">' +
        '<div><span class="badge badge-blue">SOURCE DASHBOARD</span><h3>Freshness, release watch, and trust boundaries</h3></div>' +
        '<p>Readable source-of-truth view for players, QA, and release review.</p>' +
      '</div>' +
      csRenderSourceSyncCards(status, null) +
      csRenderSourceSyncTables(status, null) +
    '</div>';
  });
  return true;
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.sources = {
    renderSourcesTab: renderSourcesTab
  };
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderSourcesTab', renderSourcesTab);
renderSourcesTab();

function generatePDFReport() {
  var container = document.getElementById('pdf-report-container');
  if (!container) return;

  var results = ChampionsSim.state.lastResults || {};
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

    // T9j.16 (Refs #65) — Champions Coaching Engine sections
    (function(){
      try {
        var report = (typeof buildStrategyReport === 'function')
          ? buildStrategyReport(playerKey, results, pdfFormat) : null;
        if (!report) return '';
        return _renderT9j16PdfSections(report);
      } catch(e) { UILog.warn('PDF sections skipped', e); return ''; }
    })(),

    '<div class="pdf-footer">Generated by Poke-e-Sim Champion 2026 Preview — ' + _escapeHtml(date) + '</div>'
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

  const results = ChampionsSim.state.lastResults;
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
    <button class="speed-tier-toggle" type="button">
      ▸ Speed Tiers
    </button>
    <div class="speed-tier-list">
      ${sorted.map((s,i) => `<div class="speed-tier-row">
        <span class="speed-rank">${i+1}</span>
        <span class="speed-name">${_escapeHtml(s.name)}</span>
        <span class="speed-val">${s.spe}${s.note ? ` <em style="color:var(--text-m);font-size:9px">${s.note}</em>` : ''}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

function renderSpeedTiersForGrid() {
  const grid = document.getElementById('teams-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.team-full-card');
  cards.forEach((card) => {
    const key = (card.dataset && card.dataset.teamKey) || card._teamKey;
    const team = TEAMS[key];
    if (!team || !team.members) return;
    const existing = card.querySelector('.speed-tier-section');
    safeRemoveNode(existing);
    card.insertAdjacentHTML('beforeend', buildSpeedTierHTML(team.members));
  });
}

// ============================================================
// PART 5B: ROLE COVERAGE CHECKER
// ============================================================
// ---- T9j.3b: Champions-legal move/ability lists for coverage detection ----
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

var _coverageChecks = null;

// Lazy-init the coverage registry so startup and future module splits never
// depend on declaration order. Issue #80 replaces the old hoisted var pattern.
function buildCoverageChecks() {
  return [
    { label: 'Fake Out',       check: function(m) { return m && m.moves && m.moves.includes('Fake Out'); } },
    { label: 'Trick Room',     check: function(m) { return m && m.moves && TR_PRESSURE_MOVES.some(function(x){ return m.moves.includes(x); }); } },
    { label: 'Redirection',    check: function(m) { return m && m.moves && REDIRECTION_MOVES.some(function(x){ return m.moves.includes(x); }); } },
    { label: 'Priority',       check: function(m) { return m && m.moves && PRIORITY_MOVES.some(function(x){ return m.moves.includes(x); }); } },
    { label: 'Weather Setter', check: function(m) { return (m && m.ability && WEATHER_ABILITIES.includes(m.ability))
                                               || (m && m.moves && WEATHER_MOVES.some(function(x){ return m.moves.includes(x); })); } },
    { label: 'Speed Control',  check: function(m) { return _memberHasSpeedControl(m); } }
  ];
}

function getCoverageChecks() {
  if (!_coverageChecks) _coverageChecks = buildCoverageChecks();
  return _coverageChecks;
}

if (typeof globalThis !== 'undefined') {
  globalThis.buildCoverageChecks = buildCoverageChecks;
  globalThis.getCoverageChecks = getCoverageChecks;
}

function renderCoverageWidget() {
  var el = document.getElementById('coverage-items');
  if (!el) return;
  var key = getActivePlayerTeamKey();
  var members = (TEAMS[key] && TEAMS[key].members) || [];
  el.innerHTML = getCoverageChecks().map(chk => {
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
  const playerTeam = getActivePlayerTeam();
  const playerMembers = (playerTeam && Array.isArray(playerTeam.members)) ? playerTeam.members : [];
  const playerMoves = playerMembers.flatMap(m => m.moves || []);
  const playerSpeeds = playerMembers.map(m => getEffectiveSpe(m));
  const maxPlayerSpe = playerSpeeds.length ? Math.max(...playerSpeeds) : 0;

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
// ============================================================
// T9j.16 (Refs #65) - Champions Coaching Engine PDF renderer
// ============================================================
// Renders the Strategy Report into the existing pdf-section / pdf-table
// styles. No new CSS classes - reuses pdf-coach-item / pdf-coach-badge
// shipped with T9j.14. Output is concatenated into the PDF body so
// generatePDFReport stays a single innerHTML assignment.
function _renderT9j16PdfSections(report) {
  if (!report) return '';
  var esc = (typeof _escapeHtml === 'function') ? _escapeHtml : function(s){ return String(s||''); };

  var id = report.team_identity || {};
  var ls = report.lead_system || {};
  var pp = report.pilot_plan || {};
  var elite = report.elite_decision_analysis || {};
  var warnings = report.matchup_warnings || [];
  var rules = report.coaching_rules || [];
  var trend = report.trend_analysis || {};

  var sevColor = function(s){ return s==='critical' ? '#ef4444' : s==='high' ? '#f59e0b' : s==='medium' ? '#3b82f6' : '#6b7280'; };
  var stateColor = function(v){
    if (v === 'losing' || v === 'too aggressive' || v === 'too passive' || v === 'too long' || v === 'weak') return '#ef4444';
    if (v === 'optimal' || v === 'strong' || v === 'winning' || v === 'balanced') return '#22c55e';
    return '#6b7280';
  };

  // ---- Team Identity ----
  var identityHtml = '<div class="pdf-section">' +
    '<div class="pdf-h2">TEAM IDENTITY</div>' +
    '<table class="pdf-table"><tbody>' +
      '<tr><td><strong>Playstyle</strong></td><td>' + esc(id.playstyle || '—') + '</td></tr>' +
      '<tr><td><strong>Primary Win Condition</strong></td><td>' + esc(id.primary_win_condition || '—') + ' (' + (id.primary_win_path_pct||0) + '% of wins)</td></tr>' +
      '<tr><td><strong>Secondary Win Condition</strong></td><td>' + esc(id.secondary_win_condition || '—') + '</td></tr>' +
      '<tr><td><strong>Synergy Core</strong></td><td>' + esc((id.synergy_core||[]).join(', ')) + '</td></tr>' +
      '<tr><td><strong>Format Viability</strong></td><td>' + esc(id.format_viability || '—') + '</td></tr>' +
      '<tr><td><strong>Confidence Tier</strong></td><td><strong>' + esc((report.confidence_tier||'').toUpperCase()) + '</strong> (' + (report.sample_size||0) + ' games sampled)</td></tr>' +
    '</tbody></table>' +
  '</div>';

  // ---- Coaching Summary (top of new sections) ----
  var summaryHtml = '<div class="pdf-section">' +
    '<div class="pdf-h2">COACH’S TAKE</div>' +
    '<p class="pdf-p" style="font-style:italic;border-left:3px solid #f59e0b;padding-left:10px">' + esc(report.coaching_summary || '') + '</p>' +
  '</div>';

  // ---- Pilot Plan ----
  var planHtml = '<div class="pdf-section">' +
    '<div class="pdf-h2">PILOT PLAN</div>' +
    '<table class="pdf-table"><tbody>' +
      '<tr><td style="width:32%"><strong>Turn 1</strong></td><td>' + esc(pp.turn_1 || '') + '</td></tr>' +
      '<tr><td><strong>Turn 2</strong></td><td>' + esc(pp.turn_2 || '') + '</td></tr>' +
      '<tr><td><strong>When to Protect</strong></td><td>' + esc(pp.when_to_protect || '') + '</td></tr>' +
      '<tr><td><strong>When to Switch</strong></td><td>' + esc(pp.when_to_switch || '') + '</td></tr>' +
      '<tr><td><strong>When to Sacrifice</strong></td><td>' + esc(pp.when_to_sacrifice || '') + '</td></tr>' +
      '<tr><td><strong>Preserve Win Condition</strong></td><td>' + esc(pp.when_to_preserve_win_condition || '') + '</td></tr>' +
      '<tr><td><strong>Bad Lead Recovery</strong></td><td>' + esc(ls.recovery_plan || '') + '</td></tr>' +
    '</tbody></table>' +
  '</div>';

  // ---- Elite Decision Analysis ----
  var eliteRow = function(label, value) {
    var color = stateColor(value);
    return '<tr><td style="width:32%"><strong>' + esc(label) + '</strong></td>' +
      '<td><span style="display:inline-block;padding:2px 10px;border-radius:4px;background:' + color + '20;color:' + color + ';font-weight:700;text-transform:uppercase;font-size:11px">' + esc(value || 'unknown') + '</span></td></tr>';
  };
  var eliteHtml = '<div class="pdf-section">' +
    '<div class="pdf-h2">ELITE DECISION ANALYSIS</div>' +
    '<table class="pdf-table"><tbody>' +
      eliteRow('Tempo Control', elite.tempo_control) +
      eliteRow('Risk Profile', elite.risk_profile) +
      eliteRow('Win Path Length', elite.win_path_length) +
      eliteRow('Information Usage', elite.information_usage) +
      eliteRow('Endgame Setup', elite.endgame_setup) +
    '</tbody></table>' +
    '<p class="pdf-p" style="font-size:11px;color:#666">Switch rate: ' + (elite.switch_rate||0) + ' (vs opp ' + (elite.opp_switch_rate||0) + ') · Lead concentration: ' + Math.round((elite.lead_concentration||0)*100) + '% · Avg win turns: ' + (elite.avg_win_turns||0) + ' · Avg loss turns: ' + (elite.avg_loss_turns||0) + '</p>' +
  '</div>';

  // ---- Matchup Warnings ----
  var warningsHtml = warnings.length
    ? '<div class="pdf-section">' +
        '<div class="pdf-h2">MATCHUP WARNINGS</div>' +
        '<table class="pdf-table"><thead><tr><th style="width:25%">Category</th><th>Risk</th></tr></thead><tbody>' +
        warnings.map(function(w){ return '<tr><td><strong>' + esc(w.category) + '</strong></td><td>' + esc(w.note) + '</td></tr>'; }).join('') +
        '</tbody></table>' +
      '</div>'
    : '';

  // ---- Coaching Rules (severity-sorted, full explain + correction) ----
  var rulesHtml = rules.length
    ? '<div class="pdf-section pdf-coach-section">' +
        '<div class="pdf-h2">COACHING RULES TRIGGERED</div>' +
        rules.map(function(r){
          var c = sevColor(r.severity);
          return '<div class="pdf-coach-item" style="border-left:4px solid ' + c + ';padding:8px 12px;margin-bottom:8px">' +
            '<div><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:' + c + '20;color:' + c + ';font-weight:700;text-transform:uppercase;font-size:10px;margin-right:6px">' + esc(r.severity) + '</span><strong>' + esc(r.id) + '</strong></div>' +
            '<div style="margin-top:4px;font-size:12px">' + esc(r.explanation) + '</div>' +
            '<div style="margin-top:4px;font-size:12px;color:#444"><strong>Fix:</strong> ' + esc(r.correction) + '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    : '';

  // ---- Trend Analysis (compact) ----
  var trendHtml = '<div class="pdf-section">' +
    '<div class="pdf-h2">TREND ANALYSIS</div>' +
    '<table class="pdf-table"><tbody>' +
      '<tr><td><strong>Best Win Path</strong></td><td>' + esc(trend.best_win_path || '—') + '</td></tr>' +
      '<tr><td><strong>Most Common Loss</strong></td><td>' + esc(trend.most_common_loss_condition || '—') + '</td></tr>' +
      '<tr><td><strong>Most Lost Pokemon</strong></td><td>' + esc((trend.most_lost_mons||[]).join(', ') || '—') + '</td></tr>' +
      '<tr><td><strong>Trick Room in Losses</strong></td><td>' + (trend.tr_pct_in_losses||0) + '%</td></tr>' +
      '<tr><td><strong>Opponent Tailwind in Losses</strong></td><td>' + (trend.tw_opp_pct_in_losses||0) + '%</td></tr>' +
    '</tbody></table>' +
  '</div>';

  return summaryHtml + identityHtml + planHtml + eliteHtml + warningsHtml + rulesHtml + trendHtml;
}

// ============================================================
// T9j.16 (Refs #65) - Champions Coaching Engine
// ============================================================
// Pure analysis layer over shipped sim outputs. NO ENGINE CHANGES.
//
// Inputs: TEAMS[teamKey].members, ChampionsSim.state.lastResults, currentFormat
// Outputs: structured Strategy Report (Sections 1-6 + Elite Decision
// Analysis + human coaching summary), persisted via localStorage and
// keyed on a stable team signature so any imported/custom team gets
// continuous coaching history across sessions.
//
// Wiring points (no renderer churn):
//   - PDF coaching section consumes coaching_rules + coaching_summary
//   - Pilot Guide tab can render the full report behind a toggle
//   - Inline pilot card shows top-2 critical rules + 1-line summary
//
// 17 coaching rules total:
//   Base 6:    protect-pp-burn, fake-out-illegal-timing,
//              redirection-vs-spread, double-switch-over-read,
//              hazard-in-doubles-noise, single-mode-safe-lead
//   Human 3:   win-condition-clarity, overprediction-risk,
//              role-overlap-warning
//   Elite 8:   tempo-control-loss, unnecessary-risk,
//              passive-play-when-behind, win-path-overextension,
//              information-neglect, positioning-over-damage,
//              endgame-misalignment, predictable-pattern
//
// Primary-source citations (Bulbapedia, verified 2026-04-24):
//   - Fake Out fails outside first turn out, +3 priority
//   - Protect priority +4, success drops on consecutive use
//   - Unseen Fist bypasses Protect on contact moves only
// All rules below stay within these established mechanics.

var T9J16_STORAGE_KEY = 'champions_strategy_v1';
var T9J16_HISTORY_BUFFER = 5; // rolling buffer of last N runs per team

// ---------- helpers ---------------------------------------------------

function _t9j16_hash(s) {
  // Simple stable string hash (djb2). Not cryptographic; collision-safe
  // enough for localStorage keying across any reasonable team count.
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function teamSignature(team) {
  if (!team || !Array.isArray(team.members) || !team.members.length) return 'empty';
  var parts = team.members.map(function(m){
    var moves = (m.moves || []).slice().sort().join(',');
    return [m.name||'', m.item||'', m.ability||'', moves].join('|');
  }).sort();
  return _t9j16_hash(parts.join('||'));
}

function _stableResultsStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) {
    return '[' + value.map(function(v){ return _stableResultsStringify(v); }).join(',') + ']';
  }
  if (typeof value === 'object') {
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function(k){
      return JSON.stringify(k) + ':' + _stableResultsStringify(value[k]);
    }).join(',') + '}';
  }
  return JSON.stringify(value);
}

function strategyResultsHash(results) {
  return _t9j16_hash(_stableResultsStringify(results || {}));
}

var _strategyReportCache = new Map();
var _strategyReportCacheLimit = 32;

function _strategyReportCacheKey(teamKey, results, fmt) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  return [teamSignature(team), strategyResultsHash(results), fmt || 'doubles'].join('::');
}

function csClearStrategyReportCache() {
  _strategyReportCache.clear();
}

function csStrategyReportCacheSize() {
  return _strategyReportCache.size;
}

function _strategyReportCacheGet(key) {
  if (!_strategyReportCache.has(key)) return null;
  var cached = _strategyReportCache.get(key);
  _strategyReportCache.delete(key);
  _strategyReportCache.set(key, cached);
  return cached;
}

function _strategyReportCacheSet(key, report) {
  _strategyReportCache.set(key, report);
  while (_strategyReportCache.size > _strategyReportCacheLimit) {
    var oldestKey = _strategyReportCache.keys().next().value;
    _strategyReportCache.delete(oldestKey);
  }
}

function _t9j16_lsGet(sig) {
  try {
    var raw = (typeof Storage !== 'undefined') ? Storage.get(T9J16_STORAGE_KEY + '::' + sig) : null;
    return raw;
  } catch(e){ return null; }
}

function _t9j16_lsSet(sig, payload) {
  try { if (typeof Storage !== 'undefined') Storage.set(T9J16_STORAGE_KEY + '::' + sig, payload); }
  catch(e){ /* quota exceeded — silent skip */ }
}

// ---------- STEP 1: TEAM IDENTITY -------------------------------------

function inferTeamIdentity(team, results, fmt) {
  var members = (team && team.members) || [];
  var playstyle = inferPlaystyle(members);
  var format = fmt || 'doubles';
  var memberRoles = members.map(function(m){
    var classified = (typeof classifyPokemon === 'function') ? classifyPokemon(m) : null;
    return {
      name: m && m.name ? m.name : '',
      roles: classified && Array.isArray(classified.roles) ? classified.roles.slice() : []
    };
  });
  var speedControlMons = memberRoles.filter(function(row){
    return row.roles.indexOf('Speed Control') >= 0;
  }).map(function(row){ return row.name; });
  var pivotMons = memberRoles.filter(function(row){
    return row.roles.indexOf('Pivot') >= 0;
  }).map(function(row){ return row.name; });
  var supportMons = memberRoles.filter(function(row){
    return row.roles.indexOf('Support') >= 0;
  }).map(function(row){ return row.name; });

  // Aggregate win paths across all matchups
  var totalWins = 0, pathCounts = {};
  Object.values(results || {}).forEach(function(r){
    totalWins += r.wins || 0;
    Object.entries(r.winConditions || {}).forEach(function(p){
      pathCounts[p[0]] = (pathCounts[p[0]] || 0) + p[1];
    });
  });
  var sorted = Object.entries(pathCounts).sort(function(a,b){ return b[1]-a[1]; });
  var primary = sorted[0] ? sorted[0][0] : null;
  var secondary = sorted[1] ? sorted[1][0] : null;
  var primaryPct = (primary && totalWins) ? (sorted[0][1] / totalWins) : 0;

  // Synergy: pivot + speed control + finisher
  var hasFO = members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
  var hasSpeed = members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); });
  var hasFinisher = members.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY) || (m.item||'').indexOf('Scarf') >= 0; });
  var synergy = [];
  if (hasFO && hasSpeed) synergy.push('Fake Out + speed control combo');
  if (hasSpeed && hasFinisher) synergy.push('speed control into priority finisher');
  if (members.some(function(m){ return PDF_TRAP_ABILITIES.indexOf(m.ability||'') >= 0; })) synergy.push('trap-ability removal');
  if (!synergy.length) synergy.push('no clear synergy core');

  // Format viability heuristic
  var viability = 'both';
  if (members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); })) viability = 'doubles-favored';
  else if (members.length === 6 && format === 'singles' && !hasFO) viability = 'singles-favored';

  return {
    playstyle: playstyle,
    primary_win_condition: primary || 'unclear',
    secondary_win_condition: secondary || 'none observed',
    synergy_core: synergy,
    format_viability: viability,
    primary_win_path_pct: Math.round(primaryPct * 100),
    member_roles: memberRoles,
    speed_control_mons: speedControlMons,
    pivot_mons: pivotMons,
    support_mons: supportMons
  };
}

// ---------- STEP 2: LEAD SYSTEM (reuses buildLeadSystem) --------------
// buildLeadSystem already returns { safe, speed, pressure, punish }.
// We add a Bad Lead Recovery Plan derived from team composition.

function buildLeadRecoveryPlan(members) {
  var pivots = members.filter(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT) || /U-turn|Volt Switch|Flip Turn|Parting Shot|Teleport/.test((m.moves||[]).join(',')); });
  var redirectors = members.filter(function(m){ return _pdfHasAny(m, PDF_REDIRECT); });
  if (pivots.length) return 'Pivot out with ' + pivots[0].name + ' to reset board state, then reassess matchup before committing your win condition.';
  if (redirectors.length) return 'Bring in ' + redirectors[0].name + ' to absorb pressure with redirection while you stabilize.';
  return 'No natural pivot — sacrifice the weakest mon to bring in a fresh pair, then play one turn of Protect to read intent.';
}

// ---------- STEP 3: COACHING RULES (17 total) -------------------------

var T9J16_RULES = [
  // ---- Base 6 ----
  {
    id: 'protect-pp-burn',
    when: function(c){
      var protectUsers = (c.members||[]).filter(function(m){ return (m.moves||[]).indexOf('Protect') >= 0 || (m.moves||[]).indexOf('Detect') >= 0; });
      return protectUsers.length >= 2;
    },
    severity: function(){ return 'medium'; },
    explain: function(c){ var n = (c.members||[]).filter(function(m){ return (m.moves||[]).indexOf('Protect') >= 0; }).length; return 'You have ' + n + ' Protect users. Strong players track Protect and punish predictable usage.'; },
    correct: function(){ return 'Use Protect to secure positioning, not stall every turn. Save it for when you need to bait a commitment.'; }
  },
  {
    id: 'fake-out-illegal-timing',
    when: function(c){
      var foUsers = (c.members||[]).filter(function(m){ return (m.moves||[]).indexOf('Fake Out') >= 0; });
      if (!foUsers.length) return false;
      // Leads aggregated; if no FO user appears in top leads, FO is unused
      var leadNames = (c.lead_top || []);
      return !foUsers.some(function(m){ return leadNames.indexOf(m.name) >= 0; });
    },
    severity: function(){ return 'high'; },
    explain: function(){ return 'Fake Out only works the first turn a Pokemon is out. Your sim shows it never triggering because the user is not leading.'; },
    correct: function(){ return 'Lead with your Fake Out user, or click it the turn they switch in. Otherwise drop it for coverage.'; }
  },
  {
    id: 'redirection-vs-spread',
    when: function(c){
      var hasSpread = (c.members||[]).some(function(m){ return _pdfHasAny(m, PDF_SPREAD); });
      var hasRedirect = (c.members||[]).some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); });
      return hasSpread && !hasRedirect && c.format === 'doubles';
    },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'Your spread damage gets canceled into Follow Me / Rage Powder teams. You have no redirector to mirror it.'; },
    correct: function(){ return 'Click target-pressure single-target moves into redirection. Save spread for when redirect is gone or off-target.'; }
  },
  {
    id: 'double-switch-over-read',
    when: function(c){
      var pivots = (c.members||[]).filter(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT) || /U-turn|Volt Switch|Flip Turn|Parting Shot/.test((m.moves||[]).join(',')); });
      return c.trends && c.trends.avgFirstKoTurn && c.trends.avgFirstKoTurn <= 2 && !pivots.length;
    },
    severity: function(){ return 'high'; },
    explain: function(c){ return 'Your first Pokemon dies on average turn ' + (c.trends ? c.trends.avgFirstKoTurn : '?') + ' and you have no pivot tools. You are getting outplayed on the lead exchange.'; },
    correct: function(){ return 'Stabilize first. Add U-turn / Volt Switch / Parting Shot or a redirector before chasing aggressive double-switches.'; }
  },
  {
    id: 'hazard-in-doubles-noise',
    when: function(c){
      if (c.format !== 'doubles') return false;
      return (c.members||[]).some(function(m){ return /Stealth Rock|Spikes|Toxic Spikes|Sticky Web/.test((m.moves||[]).join(',')); });
    },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'Hazards rarely pay off in doubles - games end before chip damage matters and you spend a turn not pressuring the opposing pair.'; },
    correct: function(){ return 'Drop hazards for a Fake Out / redirector / spread move. Doubles rewards immediate impact, not long-term setup.'; }
  },
  {
    id: 'single-mode-safe-lead',
    when: function(c){
      if (c.format !== 'singles') return false;
      var leads = c.lead_top || [];
      if (!leads.length) return false;
      var leadMons = leads.map(function(n){ return (c.members||[]).find(function(m){ return m.name === n; }); }).filter(Boolean);
      return leadMons.every(function(m){
        var item = m.item || '';
        var ab = m.ability || '';
        return !/Sash|Sturdy|Eviolite|Berry/i.test(item) && ab !== 'Sturdy';
      });
    },
    severity: function(){ return 'high'; },
    explain: function(){ return 'Your singles lead has no safety net (no Focus Sash / Sturdy / Eviolite). One crit or super-effective hit and you are down a mon turn 1.'; },
    correct: function(){ return 'Add Focus Sash to the lead, swap to a Sturdy user, or change your opener to a bulkier piece.'; }
  },

  // ---- Human 3 ----
  {
    id: 'win-condition-clarity',
    when: function(c){ return c.identity && c.identity.primary_win_path_pct < 30; },
    severity: function(){ return 'critical'; },
    explain: function(c){ return 'No win path appears in more than ' + (c.identity ? c.identity.primary_win_path_pct : 0) + '% of wins. Your team has tools but no clear closer.'; },
    correct: function(){ return 'Pick the matchup you win most and reverse-engineer why. Build the rest of the team to enable that win condition every game.'; }
  },
  {
    id: 'overprediction-risk',
    when: function(c){
      // Early losses + high switch rate signal over-reading
      var earlyLoss = c.trends && c.trends.avgFirstKoTurn && c.trends.avgFirstKoTurn <= 2.5;
      return earlyLoss && c.elite && c.elite.switch_rate > 0.3;
    },
    severity: function(){ return 'high'; },
    explain: function(){ return 'You are losing your first mon early and switching often. That is the read-heavy pattern of a player trying to outguess instead of outplay.'; },
    correct: function(){ return 'Simplify your first two turns. Click your strongest damage move and force the opponent to respond. Switch only when shape demands it.'; }
  },
  {
    id: 'role-overlap-warning',
    when: function(c){
      var roles = {};
      (c.members||[]).forEach(function(m){ var r = inferRole(m); roles[r] = (roles[r]||0)+1; });
      var maxOverlap = Math.max.apply(null, Object.values(roles).concat([0]));
      var hasSpeedCtrl = (c.members||[]).some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); });
      var hasFinisher = (c.members||[]).some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
      return maxOverlap >= 3 && (!hasSpeedCtrl || !hasFinisher);
    },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'You have 3+ Pokemon in the same role and a key role missing (speed control or finisher). That is redundancy without coverage.'; },
    correct: function(){ return 'Replace the third overlap slot with a pivot, speed setter, or priority cleaner.'; }
  },

  // ---- Elite 8 ----
  {
    id: 'tempo-control-loss',
    when: function(c){ return c.elite && c.elite.tempo_control === 'losing'; },
    severity: function(){ return 'high'; },
    explain: function(){ return 'You are reacting more than acting. Your switch rate in losses outpaces the opponent by 1.5x or more.'; },
    correct: function(){ return 'Stop reacting. Force your opponent to respond to your speed control or threat first.'; }
  },
  {
    id: 'unnecessary-risk',
    when: function(c){ return c.elite && c.elite.risk_profile === 'too aggressive'; },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'You are taking risky shots (low-acc, recoil, locked-in moves) while ahead. Variance is throwing winnable games.'; },
    correct: function(){ return 'Lock the game down when ahead. Click safe damage and conservative positioning, not 80%-acc gambles.'; }
  },
  {
    id: 'passive-play-when-behind',
    when: function(c){ return c.elite && c.elite.risk_profile === 'too passive'; },
    severity: function(){ return 'high'; },
    explain: function(){ return 'You are clicking Protect or switching when behind on HP. Safe play loses slowly.'; },
    correct: function(){ return 'When behind, force a swing. Click your highest-damage line and create an immediate KO threat.'; }
  },
  {
    id: 'win-path-overextension',
    when: function(c){ return c.elite && c.elite.win_path_length === 'too long'; },
    severity: function(){ return 'low'; },
    explain: function(){ return 'Your wins drag past turn 6+ with HP advantage from turn 3. You are not closing efficiently.'; },
    correct: function(){ return 'When you have HP lead by turn 3, click the KO line, do not stall it out. Long games invite mistakes.'; }
  },
  {
    id: 'information-neglect',
    when: function(c){ return c.elite && c.elite.information_usage === 'weak'; },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'You repeated the same lead pair after losing 3+ times to the same opponent. You ignored revealed info.'; },
    correct: function(){ return 'After every loss, change leads or your opening move. Information-driven adjustment is what separates top players.'; }
  },
  {
    id: 'positioning-over-damage',
    when: function(c){
      // Triggered when team has spread + opponent likely has redirect
      // (we approximate by: spread used in losses where opp has redirect-eligible mon)
      var hasSpread = (c.members||[]).some(function(m){ return _pdfHasAny(m, PDF_SPREAD); });
      return hasSpread && c.elite && c.elite.redirect_collisions > 0;
    },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'You clicked spread damage while the opponent had Follow Me / Rage Powder up. Damage was wasted on the redirector.'; },
    correct: function(){ return 'Read the board: kill the redirector first with a single-target move, THEN spread.'; }
  },
  {
    id: 'endgame-misalignment',
    when: function(c){
      if (!c.identity || !c.identity.primary_win_condition) return false;
      // primary win condition usually maps to a mon name fragment in winConditions string
      var trends = c.trends || {};
      return trends.mostLostMons && trends.mostLostMons.some(function(n){
        return c.identity.primary_win_condition.indexOf(n) >= 0;
      });
    },
    severity: function(){ return 'critical'; },
    explain: function(){ return 'Your primary win condition Pokemon is the one fainting most in losses. You are not protecting your closer.'; },
    correct: function(){ return 'Save your win-condition mon. Sacrifice support pieces first, bring it in clean for the endgame, do not lead with it.'; }
  },
  {
    id: 'predictable-pattern',
    when: function(c){ return c.elite && c.elite.lead_concentration > 0.8; },
    severity: function(){ return 'medium'; },
    explain: function(){ return 'You used the same lead pair in over 80% of games. Top players will have your opening solved by game 2.'; },
    correct: function(){ return 'Build 2-3 viable lead pairs and rotate. Even rotating 30% of the time forces opponents to play honest.'; }
  }
];

function evaluateT9j16Rules(ctx) {
  var SEVERITY = { critical: 0, high: 1, medium: 2, low: 3 };
  return T9J16_RULES.map(function(r){
    var triggered = false;
    try { triggered = !!r.when(ctx); } catch(e) { triggered = false; }
    return {
      id: r.id,
      triggered: triggered,
      severity: triggered ? r.severity(ctx) : null,
      explanation: triggered ? r.explain(ctx) : null,
      correction: triggered ? r.correct(ctx) : null
    };
  }).filter(function(r){ return r.triggered; })
    .sort(function(a,b){ return SEVERITY[a.severity] - SEVERITY[b.severity]; });
}

// ---------- STEP 4: ELITE DECISION ANALYSIS ---------------------------

function analyzeEliteDecisions(results, members) {
  var allLogs = [];
  Object.values(results || {}).forEach(function(r){
    (r.allLogs || []).forEach(function(g){ allLogs.push(g); });
  });
  if (!allLogs.length) {
    return {
      tempo_control: 'unknown', risk_profile: 'unknown',
      win_path_length: 'unknown', information_usage: 'unknown',
      endgame_setup: 'unknown',
      switch_rate: 0, lead_concentration: 0, redirect_collisions: 0
    };
  }

  var playerNames = (members || []).map(function(m){ return m.name; });

  // Switch rate: fraction of player turns that are switches
  var totalSwitches = 0, totalTurns = 0, oppSwitches = 0;
  // Lead concentration: most common lead pair % of all games
  var leadCounts = {};
  // Redirect collisions: spread move clicked while redirector active
  var redirectCollisions = 0;
  // Win path length: avg turn-count of wins
  var winTurns = [], lossTurns = [];

  allLogs.forEach(function(g){
    if (g.result === 'win') winTurns.push(g.turns || 0);
    else if (g.result === 'loss') lossTurns.push(g.turns || 0);
    totalTurns += (g.turns || 0);

    var leads = (g.leads && g.leads.player) || [];
    if (leads.length) {
      var key = leads.slice().sort().join('+');
      leadCounts[key] = (leadCounts[key] || 0) + 1;
    }

    (g.log || []).forEach(function(line){
      if (typeof line !== 'string') return;
      // Crude switch detection: "switched in" or "withdrew"
      if (/switched in|withdrew/.test(line)) {
        if (playerNames.some(function(n){ return line.indexOf(n) >= 0; })) totalSwitches++;
        else oppSwitches++;
      }
    });

    // Redirect collision approximation: lines mentioning Follow Me / Rage Powder + spread move name same turn
    var redirectActive = false;
    (g.log || []).forEach(function(line){
      if (typeof line !== 'string') return;
      if (/Follow Me|Rage Powder/.test(line)) redirectActive = true;
      if (/\[TURN/.test(line)) redirectActive = false;
      if (redirectActive && PDF_SPREAD.some(function(s){ return line.indexOf(s) >= 0 && playerNames.some(function(n){ return line.indexOf(n) >= 0; }); })) {
        redirectCollisions++;
      }
    });
  });

  var nGames = allLogs.length;
  var switchRate = totalTurns ? (totalSwitches / totalTurns) : 0;
  var oppSwitchRate = totalTurns ? (oppSwitches / totalTurns) : 0;
  var leadEntries = Object.entries(leadCounts).sort(function(a,b){return b[1]-a[1];});
  var leadConcentration = leadEntries.length ? (leadEntries[0][1] / nGames) : 0;

  // Tempo: losing if player switches >= 1.5x opponent switches
  var tempo = 'balanced';
  if (oppSwitchRate > 0 && switchRate / oppSwitchRate >= 1.5) tempo = 'losing';
  else if (switchRate < oppSwitchRate * 0.7) tempo = 'winning';

  // Risk profile (heuristic):
  //   - too aggressive: many low-HP wins (turns < 4 avg)
  //   - too passive: high loss-turn count (> 7) with low win rate
  var avgWinTurns = winTurns.length ? (winTurns.reduce(function(s,x){return s+x;},0)/winTurns.length) : 0;
  var avgLossTurns = lossTurns.length ? (lossTurns.reduce(function(s,x){return s+x;},0)/lossTurns.length) : 0;
  var winRate = nGames ? (winTurns.length / nGames) : 0;
  var risk = 'optimal';
  if (winRate < 0.4 && avgLossTurns > 7) risk = 'too passive';
  else if (winRate < 0.4 && avgWinTurns < 4 && avgLossTurns < 4) risk = 'too aggressive';

  // Win path length: too long if avg win turns > 6 and avg loss turns < avg win turns
  var winLen = (avgWinTurns > 6 && avgWinTurns > avgLossTurns) ? 'too long' : 'optimal';

  // Information usage: weak if same lead pair > 80% AND win rate < 50%
  var infoUse = (leadConcentration > 0.8 && winRate < 0.5) ? 'weak' : 'strong';

  // Endgame setup: weak if losses end with primary mon fainted late
  var endgame = (avgLossTurns > 5 && lossTurns.length > winTurns.length) ? 'weak' : 'strong';

  return {
    tempo_control: tempo,
    risk_profile: risk,
    win_path_length: winLen,
    information_usage: infoUse,
    endgame_setup: endgame,
    switch_rate: +switchRate.toFixed(3),
    opp_switch_rate: +oppSwitchRate.toFixed(3),
    lead_concentration: +leadConcentration.toFixed(2),
    redirect_collisions: redirectCollisions,
    avg_win_turns: +avgWinTurns.toFixed(1),
    avg_loss_turns: +avgLossTurns.toFixed(1)
  };
}

// ---------- STEP 5: PILOT PLAN ----------------------------------------

function buildPilotPlan(team, leadSystem, trends, fmt) {
  var members = (team && team.members) || [];
  var hasFO = members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
  var hasTW = members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
  var hasTR = members.some(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var hasProtect = members.some(function(m){ return (m.moves||[]).indexOf('Protect') >= 0; });

  var turn1 = leadSystem.safe
    ? 'Lead ' + leadSystem.safe + (hasFO ? ', click Fake Out + speed control' : ', stabilize before committing')
    : 'Read the matchup before committing - no clear safe lead has emerged from sims.';

  var turn2 = hasTW
    ? 'If Tailwind is up, force a KO. If not, set Tailwind on Turn 2 before opponent stabilizes.'
    : hasTR
      ? 'If Trick Room is up, hard commit your slow attackers. If denied, switch to Plan B.'
      : 'Adapt to revealed information - punish the opponent\'s exposed piece.';

  var whenProtect = hasProtect
    ? 'Protect when: opponent has obvious KO threat AND you can stack passive damage, OR you need one more turn to set speed control.'
    : 'Your team has no Protect - you must outpace or out-bulk threats directly.';

  var whenSwitch = 'Switch when: lead is bad-matched (>30% incoming KO chance), opponent reveals locked-in attacker, or you need to bring in your win condition fresh.';

  var whenSacrifice = 'Sacrifice a support piece to bring in your closer. Never sac the win-condition holder - they must enter clean.';

  var preserveWC = 'Keep your primary win-condition Pokemon at >50% HP through Turn 4. If they take chip, switch out immediately to preserve them.';

  return {
    turn_1: turn1,
    turn_2: turn2,
    when_to_protect: whenProtect,
    when_to_switch: whenSwitch,
    when_to_sacrifice: whenSacrifice,
    when_to_preserve_win_condition: preserveWC
  };
}

// ---------- STEP 6: MATCHUP WARNINGS ----------------------------------

function buildMatchupWarnings(team, results, fmt) {
  var members = (team && team.members) || [];
  var warnings = [];

  if (!members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); })) {
    warnings.push({ category: 'Spread damage', note: 'No redirector - vulnerable to teams that mirror spread.' });
  }
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); })) {
    warnings.push({ category: 'Fake Out pressure', note: 'No Fake Out user - tempo lost on Turn 1 to opposing FO leads.' });
  }
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); })) {
    warnings.push({ category: 'Speed control', note: 'No Tailwind or Trick Room - faster meta teams will outpace you.' });
  }
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); })) {
    warnings.push({ category: 'Endgame priority', note: 'No priority moves - cannot revenge-kill setup sweepers cleanly.' });
  }
  // Trick Room vulnerability: fast team with no TR counter
  var avgSpe = members.reduce(function(s,m){
    var b = (typeof BASE_STATS !== 'undefined' && BASE_STATS[m.name]) ? BASE_STATS[m.name].spe : 100;
    return s + b;
  }, 0) / Math.max(1, members.length);
  if (avgSpe > 90 && !members.some(function(m){ return (m.moves||[]).indexOf('Taunt') >= 0; })) {
    warnings.push({ category: 'Trick Room', note: 'Fast team with no Taunt - Trick Room teams flip your speed advantage.' });
  }
  // Hazards relevance only in singles
  if (fmt === 'singles' && !members.some(function(m){ return /Defog|Rapid Spin|Court Change/.test((m.moves||[]).join(',')); })) {
    warnings.push({ category: 'Hazards', note: 'No hazard removal - chip damage will accumulate over a long singles series.' });
  }
  return warnings;
}

// ---------- STEP 7: COACHING SUMMARY (real coach voice) ---------------

function buildCoachingSummary(rules, identity, elite) {
  var top = rules.slice(0, 2);
  if (!top.length) return 'No critical issues. Team executes its win condition cleanly. Keep refining lead reads to stay ahead of the meta.';

  var lines = [];
  if (top[0]) lines.push('You lost because: ' + top[0].explanation);
  if (top[0]) lines.push('Fix it: ' + top[0].correction);
  if (top[1]) lines.push('Also: ' + top[1].correction);

  if (identity) {
    if (identity.primary_win_condition && identity.primary_win_condition !== 'unclear') {
      lines.push('Your win condition is ' + identity.primary_win_condition + '. Preserve that line before you overtrade resources.');
    }
    if (Array.isArray(identity.speed_control_mons) && identity.speed_control_mons.length) {
      lines.push('Your speed control anchor is ' + identity.speed_control_mons[0] + '. Protect it when the opponent can still contest tempo.');
    }
    if (Array.isArray(identity.pivot_mons) && identity.pivot_mons.length) {
      lines.push('Your pivot piece is ' + identity.pivot_mons[0] + '. Use it to reset bad board states instead of forcing damage.');
    }
  }

  // Add tempo / risk one-liner
  if (elite && elite.tempo_control === 'losing') {
    lines.push('You are reacting too much. Take initiative on Turn 1.');
  } else if (elite && elite.risk_profile === 'too aggressive') {
    lines.push('Stop gambling. Lock in safer lines when ahead.');
  } else if (elite && elite.risk_profile === 'too passive') {
    lines.push('Stop hiding. When behind, force a swing.');
  }

  return lines.join(' ');
}

function _flattenBattleGames(results) {
  var games = [];
  Object.values(results || {}).forEach(function(r){
    if (r && Array.isArray(r.allLogs)) games = games.concat(r.allLogs);
  });
  return games;
}

function _leadPairSummary(row) {
  if (!row) return '';
  return (row.lead_label || (row.lead || []).join(' + ') || '-') + ' vs ' + (row.matchup_name || row.matchup_key || 'unknown');
}

function buildMatchupIntelligence(team, results, format, identity, leadSystem, trends, matchupGaps, matchupWarnings) {
  var games = _flattenBattleGames(results);
  var leadPairs = [];
  try { leadPairs = csBuildLeadPairTable(games, team && team.key ? team.key : null); } catch (_e) { leadPairs = []; }
  var sortedSafe = leadPairs.slice().sort(function(a, b){
    if ((b.win_rate || 0) !== (a.win_rate || 0)) return (b.win_rate || 0) - (a.win_rate || 0);
    if ((b.n || 0) !== (a.n || 0)) return (b.n || 0) - (a.n || 0);
    return (a.matchup_name || '').localeCompare(b.matchup_name || '');
  });
  var sortedRisky = leadPairs.slice().sort(function(a, b){
    if ((a.win_rate || 0) !== (b.win_rate || 0)) return (a.win_rate || 0) - (b.win_rate || 0);
    if ((b.n || 0) !== (a.n || 0)) return (b.n || 0) - (a.n || 0);
    return (a.matchup_name || '').localeCompare(b.matchup_name || '');
  });
  var topSafe = [];
  ['safe', 'speed', 'pressure', 'punish'].forEach(function(k){
    if (leadSystem && leadSystem[k] && topSafe.indexOf(leadSystem[k]) < 0) topSafe.push(leadSystem[k]);
  });
  if (!topSafe.length && sortedSafe.length) topSafe.push(sortedSafe[0].lead_label);

  var totalWins = 0, totalLosses = 0, totalDraws = 0;
  Object.values(results || {}).forEach(function(r){
    totalWins += r && r.wins ? r.wins : 0;
    totalLosses += r && r.losses ? r.losses : 0;
    totalDraws += r && r.draws ? r.draws : 0;
  });
  var totalGames = totalWins + totalLosses + totalDraws;
  var overallWR = totalGames ? totalWins / totalGames : 0;
  var confidence = csConfidence(totalGames);
  var grade = overallWR >= 0.65 ? 'strongly favored'
    : overallWR >= 0.55 ? 'favored'
    : overallWR >= 0.45 ? 'even'
    : overallWR >= 0.35 ? 'unfavored'
    : 'critical weakness';

  var matchupList = Array.isArray(matchupGaps) ? matchupGaps.slice() : [];
  var worstMatchup = matchupList.length ? matchupList[0] : null;
  var commonLoss = (trends && Array.isArray(trends.topOppFinishers) && trends.topOppFinishers.length)
    ? trends.topOppFinishers[0]
    : (trends && Array.isArray(trends.mostLostMons) && trends.mostLostMons.length ? trends.mostLostMons[0] : 'the opponent’s win condition');
  var preserve = identity && identity.primary_win_condition && identity.primary_win_condition !== 'unclear'
    ? identity.primary_win_condition
    : (topSafe[0] || 'your support core');
  var adjustment = worstMatchup
    ? 'Patch ' + worstMatchup.name + ' first. Start with ' + (topSafe[0] || 'your safest lead') + ' and keep ' + preserve + ' healthy.'
    : 'Keep the win condition protected and rotate into your best tempo lead when the board is open.';
  var speedTruth = (matchupWarnings || []).find(function(v){ return v && v.category === 'Speed control'; });
  var speedLine = speedTruth ? speedTruth.note : 'This team has enough speed access to play honest lines when your lead is correct.';
  var risky = sortedRisky.length ? sortedRisky.slice(0, 3) : [];
  var safeRows = sortedSafe.length ? sortedSafe.slice(0, 3) : [];

  return {
    grade: grade,
    confidence: confidence,
    overall_win_rate: overallWR,
    summary: worstMatchup
      ? 'You are ' + grade + ' overall. The clearest problem is ' + worstMatchup.name + ' at ' + Math.round(worstMatchup.win_rate * 100) + '%.'
      : 'You are ' + grade + ' overall. The sample is too thin for a sharp matchup read.',
    headline: topSafe.length
      ? 'Top player read: lead with ' + topSafe[0] + ' when you need safe tempo; do not auto-pilot into the worst matchup.'
      : 'Top player read: you need more games before the opening plan is stable.',
    fix: adjustment,
    safe_leads: topSafe.slice(0, 3),
    risky_leads: risky.map(function(row){ return _leadPairSummary(row); }),
    best_win_path: identity && identity.primary_win_condition ? identity.primary_win_condition : 'unclear',
    common_loss_path: commonLoss,
    speed_truth: speedLine,
    matchup_rows: safeRows.map(function(row){
      return {
        label: _leadPairSummary(row),
        value: Math.round((row.win_rate || 0) * 100) + '% over ' + row.n + ' games'
      };
    }),
    preserve_piece: preserve,
    recommended_adjustment: adjustment
  };
}

function buildReportProvenance(totalGames, confidenceTier, format) {
  var freshnessLabel = 'no sample yet';
  if (totalGames >= 100) freshnessLabel = 'well-sampled';
  else if (totalGames >= 20) freshnessLabel = 'moderately sampled';
  else if (totalGames > 0) freshnessLabel = 'thin sample';
  return {
    source_label: csLabelSim(),
    generated_at: new Date().toISOString(),
    sample_size: totalGames || 0,
    confidence_tier: confidenceTier || 'low',
    freshness_label: freshnessLabel,
    freshness_note: totalGames > 0
      ? 'Simulation-driven recommendations with ' + freshnessLabel + ' confidence.'
      : 'No battle sample yet; recommendations are mostly inference.',
    format: format || 'doubles',
    decision_rule: 'Never show a statistic without explaining the decision it should change.'
  };
}

function buildBo3Adaptation(identity, leadSystem, elite, matchupIntelligence, trends) {
  var safeLead = (matchupIntelligence && Array.isArray(matchupIntelligence.safe_leads) && matchupIntelligence.safe_leads[0]) || leadSystem.safe || 'your safest opener';
  var scoutLead = (matchupIntelligence && Array.isArray(matchupIntelligence.risky_leads) && matchupIntelligence.risky_leads[0]) || leadSystem.speed || safeLead;
  var concentration = elite && typeof elite.lead_concentration === 'number' ? elite.lead_concentration : 0;
  var revealed = concentration > 0.8
    ? 'You are revealing the same opener repeatedly; game 2 is likely to be targeted.'
    : 'Lead data is varied enough that the opponent still has to respect multiple openers.';
  var opponentAdjustment = concentration > 0.8
    ? 'Expect the opponent to lead specifically to punish your default opener.'
    : 'Expect a lighter adaptation, usually only a small lead or move tweak.';
  var counterAdjustment = concentration > 0.8
    ? 'Rotate to ' + scoutLead + ' or shift one support slot to hide the default line.'
    : 'Keep the game 1 plan, but preserve the pivot piece that lets you pivot into ' + safeLead + '.';
  var game2Lead = concentration > 0.8 ? scoutLead : safeLead;
  var primaryWin = identity && identity.primary_win_condition ? identity.primary_win_condition : 'your primary win condition';
  var commonLoss = matchupIntelligence && matchupIntelligence.common_loss_path
    ? matchupIntelligence.common_loss_path
    : (trends && Array.isArray(trends.topOppFinishers) && trends.topOppFinishers.length ? trends.topOppFinishers[0] : 'the opponent’s win condition');
  return {
    source_label: csLabelSim(),
    adaptation_risk: concentration > 0.8 ? 'high' : concentration > 0.5 ? 'medium' : 'low',
    game1_lead: safeLead,
    game2_plan: game2Lead,
    revealed_info: revealed,
    opponent_adjustment_prediction: opponentAdjustment,
    counter_adjustment: counterAdjustment,
    what_to_preserve: primaryWin,
    common_loss_path: commonLoss,
    decision_rule: 'If you reveal the same lead twice, assume the opponent can target it in game 2.'
  };
}

function buildWeaknessDashboard(team, results, format, identity, leadSystem, trends, deadMoves, matchupWarnings) {
  var members = (team && team.members) || [];
  var bestLead = (leadSystem && leadSystem.safe) ? leadSystem.safe : '';
  var altLead = (leadSystem && leadSystem.speed) ? leadSystem.speed : (leadSystem && leadSystem.pressure) ? leadSystem.pressure : '';

  function _oppName(oppKey) {
    var opp = (typeof TEAMS !== 'undefined' && TEAMS[oppKey]) ? TEAMS[oppKey] : null;
    var name = opp && opp.name ? opp.name : oppKey;
    var arch = '';
    try { arch = opp && typeof inferPlaystyle === 'function' ? (inferPlaystyle(opp.members || []) || '') : ''; } catch (_e) { arch = ''; }
    return arch ? (name + ' (' + arch + ')') : name;
  }
  function _fmtWR(v) { return Math.round((v || 0) * 100) + '%'; }
  function _itemRows(items, formatter) {
    return (items || []).slice(0, 3).map(function(item){ return formatter(item); });
  }

  var matchupRows = Object.entries(results || {}).map(function(pair){
    var r = pair[1] || {};
    var n = (r.wins || 0) + (r.losses || 0) + (r.draws || 0);
    var wr = n > 0 ? (r.wins || 0) / n : 0;
    return {
      oppKey: pair[0],
      name: _oppName(pair[0]),
      n: n,
      win_rate: wr,
      status: wr < 0.35 ? 'gap' : 'watch'
    };
  }).filter(function(row){ return row.n >= 3; })
    .sort(function(a, b){ return a.win_rate - b.win_rate; });

  var lowMatchups = matchupRows.filter(function(row){ return row.status === 'gap'; });
  var matchupFocus = lowMatchups.length ? lowMatchups : matchupRows.slice(0, 3);
  var matchupIntel = buildMatchupIntelligence(team, results, format, identity, leadSystem, trends, matchupFocus, matchupWarnings);
  var worstMatchup = matchupFocus[0] || null;
  var worstLead = (trends && trends.worst_lead) ? trends.worst_lead : null;
  var deadList = Array.isArray(deadMoves) ? deadMoves.slice(0, 3) : [];
  var ruleViolations = (matchupWarnings || []).slice(0, 2);

  var sections = [];

  sections.push({
    key: 'matchup_intelligence',
    title: 'Matchup Intelligence',
    headline: matchupIntel.summary,
    fix: matchupIntel.fix,
    rows: [
      { label: 'Grade', value: matchupIntel.grade + ' · ' + matchupIntel.confidence + ' confidence' },
      { label: 'Safe leads', value: (matchupIntel.safe_leads || []).join(' | ') || 'No safe lead logged yet' },
      { label: 'Risky leads', value: (matchupIntel.risky_leads || []).join(' | ') || 'No risky lead logged yet' },
      { label: 'Speed truth', value: matchupIntel.speed_truth || 'No speed note yet' },
      { label: 'Best win path', value: matchupIntel.best_win_path || 'unclear' },
      { label: 'Common loss path', value: matchupIntel.common_loss_path || 'unclear' }
    ],
    empty: 'Run more sims to populate matchup intelligence.'
  });

  sections.push({
    key: 'matchup_gaps',
    title: 'Matchup win-rate gaps',
    headline: worstMatchup
      ? ('Worst current matchup: ' + worstMatchup.name + ' at ' + _fmtWR(worstMatchup.win_rate) + ' over ' + worstMatchup.n + ' games.')
      : 'No matchup gap has enough sample to rank yet.',
    fix: bestLead
      ? ('Try leading ' + bestLead + ' into this archetype and keep ' + (altLead || bestLead) + ' as the fallback line.')
      : 'Keep simming until a stable lead answer shows up.',
    rows: _itemRows(matchupFocus, function(row){
      return {
        label: row.name,
        value: _fmtWR(row.win_rate) + ' over ' + row.n + ' games'
      };
    }),
    empty: 'No matchup has reached the 3-game threshold yet.'
  });

  sections.push({
    key: 'lead_pairs',
    title: 'Lead-pair issues',
    headline: worstLead
      ? ('Weakest lead pair: ' + (worstLead.lead || []).join(' + ') + ' at ' + _fmtWR(worstLead.win_rate) + ' over ' + worstLead.n + ' games.')
      : 'No lead pair has enough sample to rank yet.',
    fix: bestLead
      ? ('Shift your default into ' + bestLead + ' and keep the weak lead as a matchup-specific exception.')
      : 'Keep the most reliable lead on the field and re-test the rest of the opening pairs.',
    rows: worstLead ? [{
      label: (worstLead.lead || []).join(' + '),
      value: _fmtWR(worstLead.win_rate) + ' over ' + worstLead.n + ' games'
    }] : [],
    empty: 'Run at least 5 games with a lead pair before ranking it.'
  });

  sections.push({
    key: 'dead_moves',
    title: 'Dead moves',
    headline: deadList.length
      ? (deadList[0].owner + ' - ' + deadList[0].move + ' has 0 calls in the sample.')
      : 'No dead moves are flagged yet.',
    fix: deadList.length
      ? 'Open these slots on turn 1 when they are support tools, or replace them with coverage that patches your worst matchup.'
      : 'Keep simming until a move crosses the 0-call threshold.',
    rows: _itemRows(deadList, function(row){
      return {
        label: row.owner + ' - ' + row.move,
        value: row.times_used + ' calls over ' + row.games_sampled + ' games'
      };
    }),
    empty: 'No move has crossed the dead-move threshold yet.'
  });

  return {
    summary: matchupIntel.summary || (worstMatchup
      ? ('Start with the matchup gap, then clean up the weakest opening pair, then prune dead moves.')
      : 'Keep simming; the dashboard will populate once the sample is large enough.'),
    sections: sections,
    rule_violations: ruleViolations.map(function(v){
      return v.category + ': ' + v.note;
    }),
    matchup_intelligence: matchupIntel
  };
}

// ---------- STRATEGY REPORT (full assembly) ---------------------------

function _buildStrategyReportUncached(teamKey, results, fmt) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return null;
  var members = team.members || [];
  var format = fmt || (typeof currentFormat !== 'undefined' ? currentFormat : 'doubles');

  var identity = inferTeamIdentity(team, results, format);
  var leadSystem = buildLeadSystem(results || {}, members);
  leadSystem.recovery_plan = buildLeadRecoveryPlan(members);

  var trends = analyzeLossTrends(results || {}, members);
  var deadMoves = findDeadMoves(results || {}, members);
  var gaps = findCoverageGaps(members);
  var elite = analyzeEliteDecisions(results || {}, members);

  // Top leads (names) for fake-out-illegal and other rules
  var leadNamesUnion = [];
  ['safe','speed','pressure','punish'].forEach(function(k){
    if (leadSystem[k]) leadSystem[k].split(' + ').forEach(function(n){ if (leadNamesUnion.indexOf(n) < 0) leadNamesUnion.push(n); });
  });

  var ruleCtx = {
    members: members,
    format: format,
    trends: trends,
    deadMoves: deadMoves,
    gaps: gaps,
    elite: elite,
    identity: identity,
    lead_top: leadNamesUnion
  };
  var coachingRules = evaluateT9j16Rules(ruleCtx);

  var pilotPlan = buildPilotPlan(team, leadSystem, trends, format);
  var matchupWarnings = buildMatchupWarnings(team, results, format);
  var matchupGaps = Object.entries(results || {}).map(function(pair){
    var res = pair[1] || {};
    var n = (res.wins || 0) + (res.losses || 0) + (res.draws || 0);
    var wr = n > 0 ? (res.wins || 0) / n : 0;
    var opp = (typeof TEAMS !== 'undefined' && TEAMS[pair[0]]) ? TEAMS[pair[0]] : null;
    return {
      oppKey: pair[0],
      name: opp && opp.name ? opp.name : pair[0],
      archetype: (opp && typeof inferPlaystyle === 'function') ? (inferPlaystyle(opp.members || []) || '') : '',
      n: n,
      wins: res.wins || 0,
      losses: res.losses || 0,
      draws: res.draws || 0,
      win_rate: wr
    };
  }).filter(function(row){ return row.n >= 3; })
    .sort(function(a, b){ return a.win_rate - b.win_rate; });

  // Confidence tier — total games sampled
  var totalGames = 0;
  Object.values(results || {}).forEach(function(r){ totalGames += (r.wins||0) + (r.losses||0) + (r.draws||0); });
  var confidenceTier = totalGames < 20 ? 'low' : totalGames < 100 ? 'moderate' : totalGames < 500 ? 'high' : 'elite';

  var summary = buildCoachingSummary(coachingRules, identity, elite);
  var provenance = buildReportProvenance(totalGames, confidenceTier, format);
  var weaknessDashboard = buildWeaknessDashboard(
    team,
    results || {},
    format,
    identity,
    leadSystem,
    trends,
    deadMoves,
    matchupWarnings
  );
  weaknessDashboard.matchup_gaps = matchupGaps;
  var matchupIntelligence = weaknessDashboard.matchup_intelligence || null;
  var bo3Adaptation = buildBo3Adaptation(identity, leadSystem, elite, matchupIntelligence, trends);

  return {
    schema_version: 1,
    team_key: teamKey,
    team_signature: teamSignature(team),
    format: format,
    generated_at: new Date().toISOString(),
    sample_size: totalGames,
    confidence_tier: confidenceTier,
    provenance: provenance,
    team_identity: identity,
    lead_system: leadSystem,
    coaching_rules: coachingRules,
    elite_decision_analysis: elite,
    pilot_plan: pilotPlan,
    matchup_warnings: matchupWarnings,
    weakness_dashboard: weaknessDashboard,
    matchup_intelligence: matchupIntelligence,
    bo3_adaptation: bo3Adaptation,
    coaching_notes: {
      how_team_wants_to_win: identity.primary_win_condition,
      common_mistakes: coachingRules.slice(0,3).map(function(r){ return r.id; }),
      key_habits_to_improve: coachingRules.filter(function(r){ return r.severity === 'high' || r.severity === 'critical'; }).slice(0,3).map(function(r){ return r.correction; }),
      top_critical_rules: coachingRules.filter(function(r){ return r.severity === 'critical' || r.severity === 'high'; }).slice(0,2),
      speed_control_mons: identity.speed_control_mons || [],
      pivot_mons: identity.pivot_mons || [],
      safe_leads: matchupIntelligence ? matchupIntelligence.safe_leads : [],
      risky_leads: matchupIntelligence ? matchupIntelligence.risky_leads : [],
      best_win_path: matchupIntelligence ? matchupIntelligence.best_win_path : identity.primary_win_condition,
      common_loss_path: matchupIntelligence ? matchupIntelligence.common_loss_path : (trends.topOppFinishers && trends.topOppFinishers[0] ? trends.topOppFinishers[0] : ''),
      provenance: provenance,
      bo3_adaptation: bo3Adaptation
    },
    trend_analysis: {
      most_common_loss_condition: trends.topOppFinishers && trends.topOppFinishers.length ? trends.topOppFinishers[0] : null,
      dead_moves: deadMoves,
      most_lost_mons: trends.mostLostMons || [],
      best_win_path: identity.primary_win_condition,
      tr_pct_in_losses: trends.trPctInLosses,
      tw_opp_pct_in_losses: trends.twPctInLosses,
      coverage_gaps: gaps,
      confidence_tier: confidenceTier,
      sample_size: totalGames
    },
    coaching_summary: summary
  };
}

function buildStrategyReport(teamKey, results, fmt) {
  var cacheKey = _strategyReportCacheKey(teamKey, results, fmt);
  var cached = _strategyReportCacheGet(cacheKey);
  if (cached) return cached;
  var report = _buildStrategyReportUncached(teamKey, results, fmt);
  if (report) _strategyReportCacheSet(cacheKey, report);
  return report;
}

// ---------- PERSISTENCE + EVOLUTION -----------------------------------

function saveStrategyReport(teamKey, report) {
  if (!report || !report.team_signature) return;
  var prev = _t9j16_lsGet(report.team_signature) || { history: [] };
  // Rolling buffer of last N runs
  var hist = (prev.history || []).slice(-1 * (T9J16_HISTORY_BUFFER - 1));
  hist.push({
    generated_at: report.generated_at,
    sample_size: report.sample_size,
    confidence_tier: report.confidence_tier,
    primary_win_condition: report.team_identity.primary_win_condition,
    triggered_rule_ids: report.coaching_rules.map(function(r){ return r.id; })
  });
  var payload = {
    latest: report,
    history: hist,
    last_saved: new Date().toISOString()
  };
  _t9j16_lsSet(report.team_signature, payload);
}

function loadStrategyReport(teamKey) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return null;
  var sig = teamSignature(team);
  var stored = _t9j16_lsGet(sig);
  return stored ? stored.latest : null;
}

function evolveReport(teamKey, newResults, fmt) {
  var fresh = buildStrategyReport(teamKey, newResults, fmt);
  if (!fresh) return null;
  saveStrategyReport(teamKey, fresh);
  return fresh;
}

// ---------- AUTO-SAVE HOOK --------------------------------------------
// Called from runAllMatchupsUI completion path (see ui.js wiring).
function t9j16AutoSave() {
  try {
    if (typeof currentPlayerKey === 'undefined') return;
    if (!ChampionsSim.state.lastResults || !Object.keys(ChampionsSim.state.lastResults).length) return;
    var fmt = (typeof currentFormat !== 'undefined') ? currentFormat : 'doubles';
    evolveReport(currentPlayerKey, ChampionsSim.state.lastResults, fmt);
  } catch(e) { UILog.warn('autosave skipped', e); }
}


// =====================================================================
// PHASE 2 - COACHING LAYER ADAPTER
// =====================================================================
// Wraps existing T9j.16 buildStrategyReport with spec-compliant generators.
// See COACHING_LAYER_SPEC.md sections 3-12.
//
// Public surface:
//   csBuildStrategyReportV2(teamKey, results, fmt) -> StrategyReport (Section 3)
//   renderStrategyTab(teamKey)                     -> paints #strategy-content
//   csScheduleStrategyRebuild()                    -> debounced 500ms rebuild
//
// All cs* helpers are pure and side-effect free. Only renderStrategyTab
// touches the DOM.
//
// NO em-dashes in this file (commit-message rule applies to comments too
// for consistency).
// ---------------------------------------------------------------------

// ---- Source labels (Section 3.13) -----------------------------------
// Every claim must declare its provenance so the Evidence toggle has
// something to show. Citations point to the spec's primary sources.
var CS_SOURCES = {
  smogon_vgc:    { name: 'Smogon VGC 2026',     url: 'https://www.smogon.com/dex/sv/formats/vgc2026/' },
  serebii_dex:   { name: 'Serebii Pokedex',      url: 'https://www.serebii.net/pokedex-sv/' },
  bulbapedia:    { name: 'Bulbapedia',           url: 'https://bulbapedia.bulbagarden.net/wiki/Main_Page' },
  game8_vgc:     { name: 'Game8 VGC',            url: 'https://game8.co/games/Pokemon-Scarlet-Violet/archives/410708' },
  victory_road:  { name: 'Victory Road',         url: 'https://victoryroadvgc.com/' },
  pokepaste:     { name: 'pokepast.es',          url: 'https://pokepast.es' }
};
function csLabel(kind, citationKeys) {
  var cites = (citationKeys || []).map(function(k){ return CS_SOURCES[k]; }).filter(Boolean);
  return { kind: kind, citations: cites };
}
function csLabelInferred(citationKeys)   { return csLabel('inferred_strategy', citationKeys || ['smogon_vgc','serebii_dex']); }
function csLabelVerified(citationKeys)   { return csLabel('verified_champions_source', citationKeys || ['victory_road','pokepaste']); }
function csLabelSim()                    { return csLabel('simulation_data', []); }
function csLabelUnknown()                { return csLabel('unknown', []); }

// ---- Tier mapping (Section 4.1) -------------------------------------
function csScoreToTier(s) {
  if (s >= 90) return 'S';
  if (s >= 75) return 'A';
  if (s >= 55) return 'B';
  if (s >= 35) return 'C';
  return 'D';
}

// ---- Scoring rubric (Section 4.2) -----------------------------------
// 14 categories. Each scored 0-10. Weights sum to 100.
var CS_WEIGHTS = {
  legality_confidence:          12,
  win_condition_clarity:        12,
  role_balance:                  9,
  lead_flexibility:              7,
  speed_control:                 7,
  damage_coverage:               7,
  defensive_coverage:            7,
  pivot_switch_options:          5,
  format_fit:                    5,
  move_quality:                  6,
  item_quality:                  5,
  ability_synergy:               6,
  matchup_coverage:              6,
  simulation_trend_performance:  6
};

// Score one team across all 14 categories. Returns { scores, hardCaps[] }.
function csScoreCategories(team, identity, leadSystem, gaps, results, sample) {
  var members = (team && team.members) || [];
  var scores = {};
  var hardCaps = []; // strings tagging which Section 4.3 cap fires

  // 1. legality_confidence - pulled from team.legality_status or provenance
  var lc = 8;
  if (team && team.legality_status === 'illegal') lc = 0;
  else if (team && team.legality_status === 'unknown') { lc = 4; hardCaps.push('legality_uncertainty'); }
  else if (team && team.legality_status === 'legal')   lc = 10;
  scores.legality_confidence = lc;

  // 2. win_condition_clarity - identity.primary_win_condition + synergy
  var winClarity = 5;
  if (identity && identity.primary_win_condition && identity.primary_win_condition !== 'unclear') winClarity += 3;
  if (identity && identity.synergy_core && identity.synergy_core[0] !== 'no clear synergy core') winClarity += 2;
  if (winClarity >= 10) winClarity = 10;
  if (!identity || identity.primary_win_condition === 'unclear') hardCaps.push('no_win_condition');
  scores.win_condition_clarity = winClarity;

  // 3. role_balance - count distinct roles
  var roles = {};
  members.forEach(function(m){ roles[inferRole(m)] = true; });
  var roleCount = Object.keys(roles).length;
  scores.role_balance = Math.min(10, Math.round(roleCount * 1.8));

  // 4. lead_flexibility - count of populated lead categories
  var leadCats = ['safe','speed','pressure','punish'].filter(function(k){ return leadSystem && leadSystem[k]; }).length;
  scores.lead_flexibility = leadCats >= 3 ? 10 : leadCats >= 2 ? 7 : leadCats >= 1 ? 5 : 2;

  // 5. speed_control - Tailwind / TR / Scarf / priority
  var hasTW = members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
  var hasTR = members.some(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var hasScarf = members.some(function(m){ return /Scarf/i.test(m.item || ''); });
  var hasPrio = members.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
  var sc = (hasTW?3:0) + (hasTR?3:0) + (hasScarf?2:0) + (hasPrio?2:0);
  scores.speed_control = Math.min(10, sc);

  // 6. damage_coverage - distinct attacking types across members' offensive moves
  var attackTypes = {};
  members.forEach(function(m){
    (m.moves || []).forEach(function(mv){
      var t = (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[mv]) ? MOVE_TYPES[mv] : null;
      if (t) attackTypes[t] = true;
    });
  });
  var atkCount = Object.keys(attackTypes).length;
  scores.damage_coverage = Math.min(10, Math.round(atkCount * 1.0));

  // 7. defensive_coverage - inverse of coverage gaps count
  var gapPenalty = (gaps || []).length;
  scores.defensive_coverage = Math.max(0, 10 - gapPenalty * 2);

  // 8. pivot_switch_options
  var pivots = members.filter(function(m){
    return _pdfHasAny(m, PDF_FAKE_OUT) ||
      /U-turn|Volt Switch|Flip Turn|Parting Shot|Teleport/.test((m.moves||[]).join(','));
  }).length;
  scores.pivot_switch_options = Math.min(10, pivots * 3);

  // 9. format_fit - identity.format_viability vs current format
  var ff = 7;
  if (identity && identity.format_viability) {
    if (identity.format_viability === 'both') ff = 9;
    else if (identity.format_viability === 'doubles-favored') ff = 9;
    else if (identity.format_viability === 'singles-favored') ff = 6;
  }
  scores.format_fit = ff;

  // 10. move_quality - penalize missing or empty move slots
  var movesOk = 0, movesTot = 0;
  members.forEach(function(m){
    (m.moves || []).forEach(function(mv){ movesTot++; if (mv && mv.length) movesOk++; });
  });
  scores.move_quality = movesTot ? Math.round((movesOk / movesTot) * 10) : 5;
  if (movesTot < 4 * members.length) hardCaps.push('missing_move_metadata');

  // 11. item_quality - count members with non-empty items
  var itemsOk = members.filter(function(m){ return m.item && m.item.length; }).length;
  scores.item_quality = members.length ? Math.round((itemsOk / members.length) * 10) : 5;

  // 12. ability_synergy - bonus per recognised synergy ability
  var synergyAbs = ['Intimidate','Drought','Drizzle','Sand Stream','Snow Warning',
    'Orichalcum Pulse','Hadron Engine','Friend Guard','Sweet Veil','Telepathy',
    'Inner Focus','Own Tempo','Aroma Veil','Defiant','Competitive'];
  var synAb = members.filter(function(m){ return synergyAbs.indexOf(m.ability||'') >= 0; }).length;
  scores.ability_synergy = Math.min(10, 4 + synAb * 2);

  // 13. matchup_coverage - based on sim WR variance and median if available
  if (sample > 0) {
    var wrs = Object.values(results || {}).map(function(r){
      var t = (r.wins||0) + (r.losses||0) + (r.draws||0);
      return t ? r.wins / t : 0;
    });
    if (wrs.length) {
      var mean = wrs.reduce(function(a,b){ return a+b; }, 0) / wrs.length;
      var goodMatchups = wrs.filter(function(w){ return w >= 0.5; }).length;
      scores.matchup_coverage = Math.min(10, Math.round(mean * 8) + Math.min(2, goodMatchups));
    } else {
      scores.matchup_coverage = 5;
    }
  } else {
    scores.matchup_coverage = 5;
  }

  // 14. simulation_trend_performance - null if no sims
  if (sample === 0) {
    scores.simulation_trend_performance = null;
  } else if (sample < 30) {
    scores.simulation_trend_performance = 5;
  } else {
    var totalW = 0, totalG = 0;
    Object.values(results || {}).forEach(function(r){
      totalW += r.wins || 0;
      totalG += (r.wins||0) + (r.losses||0) + (r.draws||0);
    });
    var winrate = totalG ? totalW / totalG : 0;
    scores.simulation_trend_performance = Math.round(winrate * 10);
  }

  return { scores: scores, hardCaps: hardCaps };
}

// Confidence ladder (Section 4.4)
function csConfidence(sample) {
  if (sample >= 100) return 'high';
  if (sample >= 30)  return 'medium';
  return 'low';
}

// Risk level derived from hard caps + score
function csRiskLevel(score, hardCaps) {
  if (hardCaps.indexOf('legality_uncertainty') >= 0) return 'extreme';
  if (hardCaps.indexOf('no_win_condition') >= 0) return 'high';
  if (score < 35) return 'high';
  if (score < 55) return 'moderate';
  return 'low';
}

// ---- Generator: csTierAndScore (Section 5.1) ------------------------
// Returns full TeamReportCard. Applies all hard caps from Section 4.3.
function csTierAndScore(team, identity, leadSystem, gaps, results, sample) {
  var graded = csScoreCategories(team, identity, leadSystem, gaps, results, sample);
  var scores = graded.scores;
  var hardCaps = graded.hardCaps;

  // Weighted total - exclude null categories from both numerator and weight base
  var total = 0, weightBase = 0;
  Object.keys(CS_WEIGHTS).forEach(function(k){
    var v = scores[k];
    if (v === null || v === undefined) return;
    total += v * CS_WEIGHTS[k];
    weightBase += CS_WEIGHTS[k];
  });
  // Normalise to 0..100 against the weights actually used
  var normScore = weightBase ? Math.round(total / weightBase * 10) : 0;
  var score = normScore;

  // Apply hard caps
  if (hardCaps.indexOf('no_win_condition') >= 0)        score = Math.min(score, 74);
  if (hardCaps.indexOf('legality_uncertainty') >= 0)    score = Math.min(score, 54);
  if (hardCaps.indexOf('missing_move_metadata') >= 0)   score = Math.min(score, 54);

  var risk = csRiskLevel(score, hardCaps);
  if (risk === 'high' && sample === 0) score = Math.min(score, 89);

  var confidence = csConfidence(sample);

  // Battle Ready badge (Section 14, decision 2)
  var battle_ready = (csScoreToTier(score) === 'S')
    && sample >= 100
    && scores.legality_confidence === 10
    && risk !== 'extreme';

  // Short explanation - top-2 strengths and top risk
  var sortedCats = Object.entries(scores)
    .filter(function(p){ return p[1] !== null && p[1] !== undefined; })
    .sort(function(a,b){ return b[1] - a[1]; });
  var top1 = sortedCats[0] ? sortedCats[0][0].replace(/_/g,' ') : 'unclear';
  var top2 = sortedCats[1] ? sortedCats[1][0].replace(/_/g,' ') : 'unclear';
  var bottom = sortedCats[sortedCats.length - 1] ? sortedCats[sortedCats.length - 1][0].replace(/_/g,' ') : 'unclear';
  var shortExp = 'Strong on ' + top1 + ' and ' + top2 + '. Weakest area: ' + bottom + '.';
  if (hardCaps.length) shortExp += ' Cap applied: ' + hardCaps.join(', ') + '.';

  return {
    tier: csScoreToTier(score),
    battle_ready: battle_ready,
    score: score,
    confidence: confidence,
    risk_level: risk,
    short_explanation: shortExp,
    category_scores: scores
  };
}

// ---- Generator: csTeamIdentityV2 (Section 5.2) ----------------------
// Wraps existing inferTeamIdentity, adds closer / support_core / format_fit
// shape fields the spec requires. When sim data is missing, derives a
// primary_win_condition from team composition so the report is useful
// in theory mode (no sims yet).
function csTeamIdentityV2(team, results, fmt) {
  var members = (team && team.members) || [];
  var inner = inferTeamIdentity(team, results, fmt);

  // Closer = highest base attack stat with a damaging move
  var closer = members.slice().sort(function(a,b){
    var ba = (typeof BASE_STATS !== 'undefined' && BASE_STATS[a.name]) ? Math.max(BASE_STATS[a.name].atk||0, BASE_STATS[a.name].spa||0) : 0;
    var bb = (typeof BASE_STATS !== 'undefined' && BASE_STATS[b.name]) ? Math.max(BASE_STATS[b.name].atk||0, BASE_STATS[b.name].spa||0) : 0;
    return bb - ba;
  })[0];

  // Support core = Fake Out / Redirect / Intimidate users
  var supportCore = members.filter(function(m){
    return _pdfHasAny(m, PDF_FAKE_OUT)
        || _pdfHasAny(m, PDF_REDIRECT)
        || (m.ability || '') === 'Intimidate';
  }).map(function(m){ return m.name; }).slice(0, 3);

  // Format fit
  var formatFit = 'both';
  if (inner.format_viability === 'doubles-favored') formatFit = 'doubles';
  else if (inner.format_viability === 'singles-favored') formatFit = 'singles';

  // Theory-mode win condition (Section 5.2 fallback when sims absent).
  // Derived from team composition: weather > TR > Tailwind > Trap > Closer.
  var primary = inner.primary_win_condition;
  var secondary = inner.secondary_win_condition;
  if (!primary || primary === 'unclear') {
    var weatherSetter = members.find(function(m){ return PDF_WEATHER_ABILITIES.indexOf(m.ability||'') >= 0; });
    var trUser = members.find(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
    var twUser = members.find(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
    var trapper = members.find(function(m){ return PDF_TRAP_ABILITIES.indexOf(m.ability||'') >= 0; });
    var prio = members.find(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
    if (weatherSetter)      primary = weatherSetter.ability + ' boost into ' + (closer ? closer.name : 'closer');
    else if (trUser)        primary = 'Trick Room into slow attackers';
    else if (twUser)        primary = 'Tailwind into ' + (closer ? closer.name : 'fast closer');
    else if (trapper)        primary = 'Trap and remove key threat with ' + trapper.name;
    else if (prio)           primary = 'Priority cleanup with ' + prio.name;
    else if (closer)         primary = 'Damage trade into ' + closer.name + ' closer';
    else                     primary = 'Damage output via active core';
  }
  if (!secondary || secondary === 'none observed') {
    if (members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); })) secondary = 'Redirection + bulky pivot';
    else if (members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); })) secondary = 'Fake Out tempo into pivot';
    else if (members.some(function(m){ return /Setup|Swords Dance|Nasty Plot|Calm Mind|Dragon Dance|Bulk Up|Iron Defense/i.test((m.moves||[]).join(',')); })) secondary = 'Setup sweep';
    else                                                                       secondary = 'Trade for board control';
  }

  return {
    playstyle: inner.playstyle,
    primary_win_condition: primary,
    secondary_win_condition: secondary,
    closer: closer ? closer.name : '-',
    support_core: supportCore,
    format_fit: formatFit,
    source_label: csLabelInferred(['smogon_vgc','serebii_dex'])
  };
}

// ---- Generator: csTop3Leads (Section 5.3) ---------------------------
// Returns LeadGuide with exactly 3 ranked recommendations.
// Closes #46 - top-3 lead pairs with purpose / T1 / T2 / risk.
function csTop3Leads(team, identity, results, fmt) {
  var members = (team && team.members) || [];
  var format = fmt || 'doubles';
  var n = members.length;
  if (n === 0) return { format: format, recommendations: [] };

  // Generate candidate pairs (doubles) or singles
  var candidates = [];
  if (format === 'singles' || n < 2) {
    members.forEach(function(m){ candidates.push({ lead: [m.name], mons: [m] }); });
  } else {
    for (var i = 0; i < n; i++) {
      for (var j = i+1; j < n; j++) {
        candidates.push({ lead: [members[i].name, members[j].name], mons: [members[i], members[j]] });
      }
    }
  }

  // Score each candidate
  candidates.forEach(function(c){
    var s = 0;
    var hasFO = c.mons.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
    var hasSpeed = c.mons.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); });
    var hasRedirect = c.mons.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); });
    var hasPrio = c.mons.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
    var hasIntim = c.mons.some(function(m){ return (m.ability||'') === 'Intimidate'; });
    var hasSpread = c.mons.some(function(m){ return _pdfHasAny(m, PDF_SPREAD); });
    if (hasFO) s += 4;
    if (hasSpeed) s += 5;
    if (hasRedirect) s += 4;
    if (hasPrio) s += 2;
    if (hasIntim) s += 3;
    if (hasSpread && hasFO) s += 2; // FO + spread combo
    if (hasFO && hasSpeed) s += 2;  // safe + tempo combo

    // Sim WR blend (40% weight if available)
    var pairKey = c.lead.slice().sort().join(' + ');
    var pairWins = 0, pairTotal = 0;
    Object.values(results || {}).forEach(function(r){
      (r.allLogs || []).forEach(function(g){
        var pl = (g.leads && g.leads.player) ? g.leads.player.slice().sort().join(' + ') : '';
        if (pl === pairKey) {
          pairTotal++;
          if (g.result === 'win') pairWins++;
        }
      });
    });
    if (pairTotal >= 3) {
      var wr = pairWins / pairTotal;
      s = s * 0.6 + (wr * 10) * 0.4;
      c.win_rate = Math.round(wr * 100) / 100;
      c.sample_size = pairTotal;
    } else {
      c.win_rate = null;
      c.sample_size = pairTotal;
    }
    c.score = s;

    // Tags for purpose synthesis
    c.tags = { hasFO: hasFO, hasSpeed: hasSpeed, hasRedirect: hasRedirect, hasPrio: hasPrio, hasIntim: hasIntim, hasSpread: hasSpread };
  });

  // Top 3
  var top3 = candidates.sort(function(a,b){ return b.score - a.score; }).slice(0, 3);

  // If we have fewer than 3 candidates (small teams), pad with the best available
  while (top3.length < 3 && candidates.length > top3.length) {
    top3.push(candidates[top3.length]);
  }

  // Build recommendations
  return {
    format: format,
    recommendations: top3.map(function(c, idx){
      // Purpose
      var purpose = [];
      if (c.tags.hasFO) purpose.push('Fake Out tempo');
      if (c.tags.hasSpeed) purpose.push('speed control');
      if (c.tags.hasRedirect) purpose.push('redirection');
      if (c.tags.hasIntim) purpose.push('Intimidate pressure');
      if (c.tags.hasSpread) purpose.push('spread damage');
      if (c.tags.hasPrio) purpose.push('priority threat');
      if (!purpose.length) purpose.push('general offensive lead');

      // Turn 1 line
      var t1 = '';
      if (c.tags.hasFO && c.tags.hasSpeed) t1 = 'Fake Out the bigger threat. Set ' + (c.mons.find(function(m){ return _pdfHasAny(m, PDF_TAILWIND); }) ? 'Tailwind' : 'Trick Room') + ' with the partner.';
      else if (c.tags.hasFO) t1 = 'Fake Out the priority threat, click damage with the partner if range is clean.';
      else if (c.tags.hasSpeed) t1 = 'Set speed control immediately. Partner clicks the strongest damage move.';
      else if (c.tags.hasRedirect) t1 = 'Click redirection. Partner sets up or fires the strongest spread.';
      else if (c.tags.hasIntim) t1 = 'Drop Intimidate, then click coverage on the bulkier opposing slot.';
      else t1 = 'Open with strongest spread or coverage move that can KO into the most likely lead.';

      // Turn 2 line
      var t2 = '';
      if (c.tags.hasSpeed) t2 = 'Trade with speed advantage. Threaten KOs to force Protect, then bring the closer.';
      else if (c.tags.hasFO) t2 = 'Pivot to your damage core. Fake Out user goes back in only to disrupt setup.';
      else if (c.tags.hasRedirect) t2 = 'Sustain redirector with bulky berry. Stack damage from behind it.';
      else t2 = 'Reassess. If lead pair is exhausted, double-switch to your closer + support to pivot.';

      // Risk warning
      var risk = '';
      if (c.tags.hasSpeed && !c.tags.hasFO) risk = 'No Fake Out means setup turn is exposed. A faster Taunt or Encore breaks the line.';
      else if (c.tags.hasFO && !c.tags.hasSpeed) risk = 'No speed control on this pair. Versus Tailwind teams you fall behind by turn 2.';
      else if (c.tags.hasRedirect) risk = 'Redirector folds to spread + status. Avoid leading into Will-O-Wisp users.';
      else risk = 'Lead pair is offensive only. Versus disrupt or Trick Room, swap to a safer recovery lead.';

      return {
        rank: idx + 1,
        lead: c.lead,
        purpose: purpose.join(' + '),
        best_matchups: [],
        bad_matchups: [],
        turn_1_line: t1,
        turn_2_line: t2,
        risk_warning: risk,
        win_rate: c.win_rate,
        sample_size: c.sample_size,
        source_label: c.win_rate !== null ? csLabelSim() : csLabelInferred(['smogon_vgc'])
      };
    })
  };
}

// ---- Generator: csMistakes (Section 5.5) ----------------------------
// Returns 3-7 entries (Section 14, decision 4: cap min 3, max 7).
// Each: { mistake, why_it_loses, correction }. Severity-sorted.
// Closes #49 - mistakes-to-avoid generator.
function csMistakes(team, identity, format) {
  var members = (team && team.members) || [];
  var rules = [];

  // Lead-trap rules (highest severity)
  // Fake Out is a Normal-type move. Ghost types are 0x immune, and Inner Focus
  // / Own Tempo / Oblivious ignore the flinch. So a Ghost lead or an
  // Inner-Focus lead is NOT vulnerable to Fake Out pressure and this rule
  // should not fire for them. Bug caught in Froslass's Team build v2.1.1:
  // coach was warning "do not lead Froslass-Mega into Fake Out pressure" even
  // though Froslass is Ice/Ghost and cannot be touched by Fake Out at all.
  // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move) (Normal-type)
  // Cite: https://www.serebii.net/abilitydex/innerfocus.shtml (flinch immune)
  var FAKE_OUT_IMMUNE_ABILITIES = ['Inner Focus', 'Own Tempo', 'Oblivious'];
  function _fakeOutVulnerable(m) {
    // Ghost types: Normal move does 0 damage -> no flinch roll either.
    var types = (typeof getPokemonTypes === 'function') ? getPokemonTypes(m.name) : [];
    if (types.indexOf('Ghost') >= 0) return false;
    // Inner Focus / Own Tempo / Oblivious mons: take the chip damage but no
    // flinch, so Fake Out "pressure" loses its tempo value on them.
    if (FAKE_OUT_IMMUNE_ABILITIES.indexOf(m.ability || '') >= 0) return false;
    return true;
  }
  var fragileLeaders = members.filter(function(m){
    var stats = (typeof BASE_STATS !== 'undefined' && BASE_STATS[m.name]) ? BASE_STATS[m.name] : null;
    if (!stats) return false;
    var bulk = (stats.hp||0) * Math.max(stats.def||0, stats.spd||0);
    if (bulk >= 12000) return false;
    return _fakeOutVulnerable(m);
  });
  if (fragileLeaders.length && members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); })) {
    rules.push({
      severity: 100,
      mistake: 'Do not lead ' + fragileLeaders[0].name + ' into Fake Out pressure',
      why_it_loses: fragileLeaders[0].name + ' is fragile (bulk product < 12k). A Fake Out + spread combo on turn 1 removes your damage core before you set up.',
      correction: 'Lead a Fake Out user or bulky pivot first. Bring ' + fragileLeaders[0].name + ' in after the support core has eaten the priority pressure.'
    });
  }

  // Single wincon
  var damagers = members.filter(function(m){
    return _csHasTrueDamageWincon(m);
  });
  if (damagers.length <= 2) {
    rules.push({
      severity: 95,
      mistake: 'Burning Protect on your closer ends games',
      why_it_loses: 'You only have ' + damagers.length + ' true damage wincon(s). Once ' + (identity && identity.closer) + ' is gone, you cannot close.',
      correction: 'Save Protect for the turn after speed control runs out. Do not click it on the same turn the opponent already committed to a non-damaging move.'
    });
  }

  // TR setter on a fast team
  var hasTR = members.some(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var avgSpeed = members.reduce(function(s,m){
    var bs = (typeof BASE_STATS !== 'undefined' && BASE_STATS[m.name]) ? BASE_STATS[m.name].spe || 0 : 0;
    return s + bs;
  }, 0) / Math.max(1, members.length);
  if (hasTR && avgSpeed > 80) {
    rules.push({
      severity: 90,
      mistake: 'Setting Trick Room flips your own speed advantage',
      why_it_loses: 'Average team Speed is ' + Math.round(avgSpeed) + '. Under TR your fast attackers move last and your TR setter eats a setup-punish move.',
      correction: 'Only set TR when 3+ of your active mons are slower than 60 base, or skip TR entirely and lean on Tailwind / priority.'
    });
  }

  // Choice Scarf with overlapping coverage
  var scarfers = members.filter(function(m){ return /Scarf/i.test(m.item || ''); });
  scarfers.forEach(function(s){
    var types = (s.moves || []).map(function(mv){
      return (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[mv]) ? MOVE_TYPES[mv] : null;
    }).filter(Boolean);
    var unique = {};
    types.forEach(function(t){ unique[t] = (unique[t]||0) + 1; });
    var dupes = Object.keys(unique).filter(function(k){ return unique[k] > 1; });
    if (dupes.length) {
      rules.push({
        severity: 85,
        mistake: 'Locking ' + s.name + ' into the wrong type',
        why_it_loses: s.name + ' has multiple ' + dupes.join(', ') + ' moves. Lock-in early and you have no answer to a switch-in that resists that type.',
        correction: 'Click the lower-priority coverage move first to scout, or save Scarf reveal until you can KO without locking yourself out.'
      });
    }
  });

  // Spread move + low-HP ally
  var hasSpread = members.some(function(m){ return _pdfHasAny(m, PDF_SPREAD); });
  if (hasSpread && format === 'doubles') {
    rules.push({
      severity: 70,
      mistake: 'Do not click spread when ally is below 50%',
      why_it_loses: 'Spread chip into a fragile ally folds your own pivot. The opponent can Protect + KO your weak side on the same turn.',
      correction: 'Use single-target damage or Protect the low-HP ally. Save spread for after the wounded slot has rotated out.'
    });
  }

  // No pivot moves
  var pivotMoves = members.filter(function(m){
    return _pdfHasAny(m, PDF_FAKE_OUT) ||
      /U-turn|Volt Switch|Flip Turn|Parting Shot|Teleport/.test((m.moves||[]).join(','));
  });
  if (pivotMoves.length === 0) {
    rules.push({
      severity: 60,
      mistake: 'Switching aggressively without a safe pivot leaks tempo',
      why_it_loses: 'No pivot moves on the team. Every switch eats a free turn for the opponent.',
      correction: 'Add U-turn, Volt Switch, Flip Turn, or Parting Shot somewhere on the team. Until then, only switch on a guaranteed free turn (Protect or KO).'
    });
  }

  // Redirector with no spread
  var hasRedirect = members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); });
  if (hasRedirect && !hasSpread) {
    rules.push({
      severity: 55,
      mistake: 'Redirector wasted without spread damage',
      why_it_loses: 'Follow Me / Rage Powder shines when your partner clicks spread. Without it, you are paying a slot for marginal value.',
      correction: 'Add a spread move (Earthquake, Heat Wave, Hyper Voice, Make It Rain) to a partner or rotate the redirector for a Fake Out user.'
    });
  }

  // Sort by severity (descending), keep 3 minimum, 7 maximum
  rules.sort(function(a,b){ return b.severity - a.severity; });
  if (rules.length === 0) {
    rules.push({
      severity: 0,
      mistake: 'Auto-piloting turn 1 without a read',
      why_it_loses: 'Even a clean team loses to a strong opening read. Most losses come from clicking the same lead pair every game.',
      correction: 'Cycle through your top-3 leads matchup-by-matchup. Predict at least one line ahead.'
    });
  }
  while (rules.length < 3) {
    rules.push({
      severity: 0,
      mistake: 'Underusing Protect',
      why_it_loses: 'Protect on the wrong turn wastes a slot. Skipping it on the right turn loses a mon.',
      correction: 'Click Protect when you have a 50/50 read on a KO move and a free pivot is set up the next turn.'
    });
  }
  return rules.slice(0, 7).map(function(r){
    return { mistake: r.mistake, why_it_loses: r.why_it_loses, correction: r.correction };
  });
}

// ---- Generator: csMoveLines (Section 5.4) ---------------------------
// Minimum 6 scenarios. Each: scenario, lead_recommendation, t1, t2, avoid, fallback.
function csMoveLines(team, identity, leadGuide) {
  var members = (team && team.members) || [];
  var topLead = (leadGuide && leadGuide.recommendations[0]) ? leadGuide.recommendations[0].lead : (members.slice(0,2).map(function(m){ return m.name; }));

  // Pick best lead per scenario type
  var foUser = members.find(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
  var twUser = members.find(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
  var trUser = members.find(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var redirUser = members.find(function(m){ return _pdfHasAny(m, PDF_REDIRECT); });
  var prioUser = members.find(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
  var spreadUser = members.find(function(m){ return _pdfHasAny(m, PDF_SPREAD); });
  var intimUser = members.find(function(m){ return (m.ability||'') === 'Intimidate'; });

  // Deduplicate picks: if a and b resolve to the same mon (e.g. Incineroar has
  // both Fake Out and Intimidate, so foUser and intimUser can be the same),
  // drop the duplicate and backfill from the remaining team so we never show
  // a lead pair like "Incineroar + Incineroar". Refs #116.
  function pick2(a, b) {
    var picks = [];
    [a, b].forEach(function(m){
      if (m && m.name && picks.indexOf(m.name) < 0) picks.push(m.name);
    });
    if (picks.length < 2) {
      members.forEach(function(m){ if (picks.length < 2 && picks.indexOf(m.name) < 0) picks.push(m.name); });
    }
    return picks.slice(0, 2);
  }

  var lines = [];

  lines.push({
    scenario: 'Into fast Tailwind offense',
    lead_recommendation: pick2(foUser, twUser || prioUser),
    turn_1: foUser ? ('Fake Out the offensive threat with ' + foUser.name + '. Set Tailwind or click priority with the partner.') : 'Set your own Tailwind immediately or click priority to deny their setup.',
    turn_2: 'Pivot under Tailwind. Trade KOs while you are faster. Save Protect for when their Tailwind ends.',
    what_to_avoid: 'Do not lead two slow attackers. They will be outsped on turn 1 and you lose tempo.',
    fallback_plan: 'If Tailwind is denied, switch to a redirector + bulky pivot to grind the game past their Tailwind window.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  lines.push({
    scenario: 'Into Trick Room setters',
    lead_recommendation: pick2(foUser || prioUser, intimUser),
    turn_1: foUser ? ('Fake Out the TR setter with ' + foUser.name + '. Partner clicks Taunt or hardest-hitting move.') : 'Click Taunt or fastest damage move on the TR setter to prevent setup.',
    turn_2: 'If TR is up, switch to slower attackers. If TR is denied, press the offensive advantage immediately.',
    what_to_avoid: 'Do not click setup or pivot moves while TR is being set. Pressure the setter directly.',
    fallback_plan: 'Stall TR turns with Protect + redirection. After TR ends, swap to your fast core.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  lines.push({
    scenario: 'Into Redirection (Follow Me / Rage Powder)',
    lead_recommendation: pick2(spreadUser, foUser),
    turn_1: 'Click spread damage to bypass redirection. Fake Out the partner if available to deny tempo.',
    turn_2: 'Continue spread pressure. The redirector is the priority KO target.',
    what_to_avoid: 'Single-target damage into the redirector wastes a turn. Do not click status either.',
    fallback_plan: 'If you cannot KO the redirector quickly, switch to your TR setter or Choice Scarf user to apply different pressure.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  lines.push({
    scenario: 'Into Fake Out pressure',
    lead_recommendation: pick2(intimUser || foUser, redirUser),
    turn_1: 'Lead a bulkier Fake Out user yourself or an Inner Focus / Own Tempo mon. Click damage on their squishier slot.',
    turn_2: 'Their Fake Out is gone. Press damage and force a switch.',
    what_to_avoid: 'Do not lead your closer or setup mon. They eat the Fake Out and your turn 1 is wasted.',
    fallback_plan: 'Bring out a Protect user to bait their second Fake Out, then pivot to closer.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  lines.push({
    scenario: 'Into Sun or Rain weather core',
    lead_recommendation: pick2(twUser || prioUser, foUser),
    turn_1: 'Click your own weather move if available, or use your strongest damage move on the weather setter.',
    turn_2: 'Remove the weather setter. Their boost is gone.',
    what_to_avoid: 'Do not click moves boosted by their weather (e.g. fire moves into their sun).',
    fallback_plan: 'If you cannot remove weather, swap to a Choice Scarf or priority attacker that ignores weather.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  lines.push({
    scenario: 'Into Setup Sweepers',
    lead_recommendation: pick2(foUser, prioUser),
    turn_1: 'Fake Out the setup mon. Partner clicks priority or strongest damage to break the boost.',
    turn_2: 'If they boosted, click Haze, Clear Smog, or trade with your priority finisher.',
    what_to_avoid: 'Do not let setup mon get +2 with no answer. Always click first turn.',
    fallback_plan: 'Save your Choice Scarf revenge killer if you have one. Sacrifice if needed to stop the sweep.',
    source_label: csLabelInferred(['smogon_vgc'])
  });

  if (intimUser) {
    lines.push({
      scenario: 'Into Intimidate stack',
      lead_recommendation: pick2(members.find(function(m){ return /Defiant|Competitive/.test(m.ability||''); }) || foUser, twUser),
      turn_1: 'Lead a Defiant or Competitive ability if you have one. Otherwise, click special attacks to bypass Atk drops.',
      turn_2: 'Force them to swap. Punish predictable Intimidate cycle with Taunt or status.',
      what_to_avoid: 'Do not stack physical attackers. Their Intimidate cycle eats your damage.',
      fallback_plan: 'Pivot to bulkier special attackers or a Defiant/Competitive response to ignore Intimidate.',
      source_label: csLabelInferred(['smogon_vgc'])
    });
  }

  return lines;
}

// ---- Generator: csSkillCoaching (Section 5.9) -----------------------
function csSkillCoaching(team, identity, leadGuide) {
  var members = (team && team.members) || [];
  var closer = identity && identity.closer ? identity.closer : ((members[0] && members[0].name) || 'your closer');
  var support = (identity && identity.support_core && identity.support_core[0]) || 'your pivot';
  var topLead = (leadGuide && leadGuide.recommendations[0]) ? leadGuide.recommendations[0].lead : [support, closer];

  var safeMove = (function(){
    var foUser = members.find(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });
    if (foUser) return 'Fake Out';
    var twUser = members.find(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
    if (twUser) return 'Tailwind';
    return 'your strongest single-target damage move';
  })();

  return {
    beginner: {
      how_team_wins: closer + ' closes after ' + support + ' sets the tempo with ' + safeMove + '.',
      safest_lead: topLead,
      safest_first_turn: 'Click ' + safeMove + ' to control the turn. Do not click setup or pivot moves yet.',
      do_not_click: ['setup moves on turn 1', 'risky 80%-accuracy moves', 'damage into a redirector']
    },
    intermediate: {
      when_to_switch: 'Switch ' + closer + ' out only when its KO range is gone. Otherwise keep pressure on.',
      when_to_protect: 'Protect when speed control is about to run out, or when the opponent has a guaranteed KO move on your active mon.',
      tempo_management: 'Each Fake Out is one free turn. Spend that turn on speed control, not damage.',
      preserve_wincon: 'Do not lead ' + closer + ' into priority threats. Bring it after support has eaten Fake Out and Intimidate.'
    },
    advanced: {
      bait_and_punish: [
        'Bait Protect by clicking spread damage, then double-switch to ' + closer + '.',
        'Bait Trick Room by leading slow, then reveal Tailwind or Taunt.',
        'Bait their priority by leading a bulky pivot, then bring ' + closer + ' on a Protect turn.'
      ],
      double_switch_logic: 'Double-switch when you can predict their pivot move. Bring a Pokemon that resists their next likely lead.',
      win_path_compression: 'Force the game to end by turn 6. Long games favor the bulkier team. Pressure spread + speed control.',
      risk_reward_adjustments: 'Lock-in moves are worth 90% confidence trades. Status moves are worth 70%. Adjust your line based on the opponent\'s remaining team.',
      opponent_prediction: 'If they have not revealed their item by turn 3, assume Choice Scarf. If they Protected turn 1, expect setup turn 2.'
    }
  };
}

// ---- Generator: csStressTest (Section 5.7) --------------------------
function csStressTest(team, identity, results, scoreCard) {
  var members = (team && team.members) || [];
  var hasTW = members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND); });
  var hasTR = members.some(function(m){ return _pdfHasAny(m, PDF_TRICK_ROOM); });
  var hasScarf = members.some(function(m){ return /Scarf/i.test(m.item || ''); });
  var hasPrio = members.some(function(m){ return _pdfHasAny(m, PDF_PRIORITY); });
  var hasSpeed = hasTW || hasTR || hasScarf || hasPrio;
  var hasFO = members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); });

  var breakPoints = [];
  if (!hasSpeed) breakPoints.push('Speed control denied -> slow exposed team');
  if (!hasFO) breakPoints.push('No Fake Out -> turn 1 setup vulnerable to faster pressure');
  var damagers = members.filter(function(m){
    return _csHasTrueDamageWincon(m);
  });
  if (damagers.length <= 2) breakPoints.push('Closer removed early -> late game collapses');
  if (members.length < 6) breakPoints.push('Roster slots short -> matchup volatility increases');

  var punishWindows = [];
  if (hasTW && hasFO) punishWindows.push('Trick Room counter teams break Tailwind tempo on turn 2');
  if (members.some(function(m){ return /Reflect|Light Screen|Aurora Veil/.test((m.moves||[]).join(',')); })) {
    punishWindows.push('Brick Break or Defog removes screens and exposes setup turn');
  }
  if (!punishWindows.length) punishWindows.push('Predictable lead choices give opponent free read on turn 1');

  // Worst matchups from sim data
  var worstMatchups = [];
  var failureScenarios = [];
  Object.entries(results || {}).forEach(function(p){
    var k = p[0], r = p[1];
    var t = (r.wins||0) + (r.losses||0) + (r.draws||0);
    if (t >= 3 && r.wins / t < 0.30) worstMatchups.push(k);
  });
  worstMatchups = worstMatchups.slice(0, 3);

  if (hasTR) failureScenarios.push('Trick Room blocked by Taunt before T2');
  if (members.some(function(m){ return /Mega/i.test(m.item||''); })) failureScenarios.push('Mega blocked from evolving on critical turn');
  if (members.some(function(m){ return (m.ability||'') === 'Intimidate'; })) failureScenarios.push('Intimidate stacked into your physical attackers');
  if (!failureScenarios.length) failureScenarios.push('Lead read trivially predicted, punish window opens turn 1');

  var consistency = 'moderate';
  if (scoreCard && scoreCard.confidence === 'high' && scoreCard.tier === 'S') consistency = 'high';
  else if (!scoreCard || scoreCard.tier === 'C' || scoreCard.tier === 'D') consistency = 'low';

  var champPov = 'A top player would respect ' + (identity && identity.playstyle || 'this team') + ' for ' +
    (hasFO ? 'Fake Out tempo' : 'its core damage') +
    ' but would attack the ' + (breakPoints[0] || 'predictable lead') +
    ' on turn 1. ' + (worstMatchups.length ? 'They would target the ' + worstMatchups[0] + ' archetype to maximise expected value.' : 'Without sim data, the safe call is to scout the lead before committing setup.');

  return {
    break_points: breakPoints,
    punish_windows: punishWindows,
    worst_matchups: worstMatchups,
    failure_scenarios: failureScenarios,
    consistency_rating: consistency,
    champion_perspective: champPov
  };
}

// ---- Generator: csWhatWorks / csWhatIsWeak / csTopThreats ----------
function csWhatWorks(team, identity, leadGuide) {
  var members = (team && team.members) || [];
  var top = leadGuide && leadGuide.recommendations[0];
  return {
    best_synergy: {
      description: identity.synergy_core && identity.synergy_core[0] !== 'no clear synergy core'
        ? identity.synergy_core.join(' + ')
        : 'No dominant synergy core, plays as flexible balance',
      members: (identity.support_core || []).concat(identity.closer ? [identity.closer] : []),
      source_label: csLabelInferred(['smogon_vgc'])
    },
    strongest_leads: (leadGuide.recommendations || []).slice(0, 2).map(function(rec){
      return { lead_pair: rec.lead, reason: rec.purpose, source_label: rec.source_label };
    }),
    best_damage_plan: {
      description: 'Lead with ' + (top ? top.lead.join(' + ') : 'support core') + ', stack spread + priority on turn 2 to compress the game.',
      source_label: csLabelInferred(['smogon_vgc'])
    },
    best_defensive_plan: {
      description: members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); })
        ? 'Use redirection to soak status and spread, then pivot the wincon in safely.'
        : 'Use Protect + double-switch to preserve the closer until cleanup turn.',
      source_label: csLabelInferred(['smogon_vgc'])
    },
    strongest_win_path: {
      description: identity.primary_win_condition || 'Damage output via closer',
      source_label: csLabelInferred(['smogon_vgc'])
    }
  };
}

function csWhatIsWeak(team, identity, gaps, results) {
  var members = (team && team.members) || [];
  var missing = [];
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_FAKE_OUT); })) missing.push('no Fake Out user');
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); })) missing.push('no speed control');
  if (!members.some(function(m){ return _pdfHasAny(m, PDF_REDIRECT); })) missing.push('no redirection');

  var bad = [];
  Object.entries(results || {}).forEach(function(p){
    var t = (p[1].wins||0) + (p[1].losses||0) + (p[1].draws||0);
    if (t >= 3 && (p[1].wins / t) < 0.40) bad.push(p[0]);
  });

  var fragile = members.filter(function(m){
    var s = (typeof BASE_STATS !== 'undefined' && BASE_STATS[m.name]) ? BASE_STATS[m.name] : null;
    if (!s) return false;
    return (s.hp||0) * Math.max(s.def||0, s.spd||0) < 12000;
  }).map(function(m){ return m.name; });

  var damagers = members.filter(function(m){
    return (m.moves || []).some(function(mv){ return PDF_SPREAD.indexOf(mv) >= 0; }) ||
           _pdfHasAny(m, PDF_PRIORITY);
  });
  var overreliance = damagers.length === 1 ? damagers[0].name : null;

  return {
    missing_roles: missing,
    bad_matchups: bad.slice(0, 5),
    coverage_gaps: gaps || [],
    speed_issues: !members.some(function(m){ return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM); })
      ? 'No active speed control - reliant on natural Speed and Choice Scarf'
      : 'Speed control present',
    fragile_leads: fragile,
    overreliance: overreliance,
    poor_choices: []
  };
}

function csTopThreats(team) {
  // Reuse existing META_THREATS list from ui.js. Cap at 5 most relevant.
  if (typeof META_THREATS === 'undefined') return [];
  return META_THREATS.slice(0, 5).map(function(t){
    return {
      pokemon: t.name || t.pokemon || '-',
      why_dangerous: t.why || t.why_dangerous || 'High meta usage and damage ceiling',
      threatens: t.threatens || [],
      problem_kit: t.problem_kit || { moves: [], items: [], abilities: [] },
      play_around: t.play_around || 'Lead a Fake Out user or priority attacker to neutralise turn 1.',
      team_fixes: t.team_fixes || [],
      source_label: csLabelInferred(['smogon_vgc','victory_road'])
    };
  });
}

function csRiskProfile(team, scoreCard) {
  var members = (team && team.members) || [];
  var risks = [];

  var lowAccMoves = members.reduce(function(c, m){
    return c + (m.moves || []).filter(function(mv){
      return /Hypnosis|Focus Blast|Stone Edge|Thunder|Fire Blast|Hurricane/.test(mv);
    }).length;
  }, 0);
  if (lowAccMoves >= 2) risks.push({
    category: 'RNG', severity: lowAccMoves >= 4 ? 'high' : 'moderate',
    why_it_matters: lowAccMoves + ' moves with sub-90 accuracy or status hit chance. Misses lose games.',
    how_to_reduce: 'Replace lowest-accuracy filler with consistent 100% coverage where possible.'
  });

  var fragile = members.filter(function(m){
    var s = (typeof BASE_STATS !== 'undefined' && BASE_STATS[m.name]) ? BASE_STATS[m.name] : null;
    if (!s) return false;
    return (s.hp||0) * Math.max(s.def||0, s.spd||0) < 12000;
  }).length;
  if (fragile >= 2) risks.push({
    category: 'lead_fragility', severity: fragile >= 3 ? 'high' : 'moderate',
    why_it_matters: fragile + ' lead candidates have low bulk product and die to Fake Out + spread.',
    how_to_reduce: 'Invest more SPs in HP/Def or Sp.Def on at least one lead, or add a bulky pivot.'
  });

  var damagers = members.filter(function(m){
    return _csHasTrueDamageWincon(m);
  }).length;
  if (damagers <= 1) risks.push({
    category: 'single_wincon', severity: damagers === 0 ? 'extreme' : 'high',
    why_it_matters: 'Only ' + damagers + ' true wincon. Once removed, the team cannot close.',
    how_to_reduce: 'Add a secondary closer or a setup sweeper as redundancy.'
  });

  var hasSpeed = members.some(function(m){
    return _pdfHasAny(m, PDF_TAILWIND) || _pdfHasAny(m, PDF_TRICK_ROOM) || /Scarf/i.test(m.item||'') || _pdfHasAny(m, PDF_PRIORITY);
  });
  if (!hasSpeed) risks.push({
    category: 'speed_control', severity: 'high',
    why_it_matters: 'No Tailwind, Trick Room, Choice Scarf, or priority. You are at the mercy of natural Speed.',
    how_to_reduce: 'Add at least one of: Tailwind setter, Choice Scarf user, or strong priority attacker.'
  });

  var pivots = members.filter(function(m){
    return _pdfHasAny(m, PDF_FAKE_OUT) || /U-turn|Volt Switch|Flip Turn|Parting Shot|Teleport/.test((m.moves||[]).join(','));
  }).length;
  if (pivots === 0) risks.push({
    category: 'positioning', severity: 'moderate',
    why_it_matters: 'No pivot moves. Every switch costs you a free turn.',
    how_to_reduce: 'Add U-turn, Volt Switch, or Parting Shot to a flexible slot.'
  });

  return risks;
}

function csTrendAnalysisV2(team, results) {
  var members = (team && team.members) || [];
  var totalGames = 0;
  Object.values(results || {}).forEach(function(r){ totalGames += (r.wins||0) + (r.losses||0) + (r.draws||0); });

  if (totalGames === 0) {
    return {
      has_data: false,
      sample_size: 0,
      best_lead: null,
      worst_lead: null,
      most_common_loss_cause: null,
      avg_first_ko_turn: null,
      dead_moves: [],
      failed_matchups: [],
      best_win_path: null,
      trend_direction: null,
      message_if_no_data: 'insufficient trend data - keep simulating'
    };
  }

  // Best/worst lead by aggregated WR
  var leadStats = {};
  Object.values(results).forEach(function(r){
    (r.allLogs || []).forEach(function(g){
      if (!g.leads || !g.leads.player) return;
      var k = g.leads.player.slice().sort().join(' + ');
      leadStats[k] = leadStats[k] || { w: 0, t: 0, lead: g.leads.player };
      leadStats[k].t++;
      if (g.result === 'win') leadStats[k].w++;
    });
  });
  var leadEntries = Object.values(leadStats).filter(function(s){ return s.t >= 3; });
  leadEntries.sort(function(a,b){ return (b.w/b.t) - (a.w/a.t); });
  var best = leadEntries[0];
  var worst = leadEntries[leadEntries.length - 1];

  var dead = findDeadMoves(results, members).map(function(d){ return d.pokemon + ' - ' + d.move; });

  var failed = [];
  Object.entries(results).forEach(function(p){
    var t = (p[1].wins||0) + (p[1].losses||0) + (p[1].draws||0);
    if (t >= 3 && (p[1].wins / t) < 0.30) failed.push(p[0]);
  });

  var trends = analyzeLossTrends(results, members);

  return {
    has_data: true,
    sample_size: totalGames,
    best_lead: best ? { lead: best.lead, win_rate: Math.round(best.w/best.t*100)/100, sample: best.t } : null,
    worst_lead: worst && worst !== best ? { lead: worst.lead, win_rate: Math.round(worst.w/worst.t*100)/100, sample: worst.t } : null,
    most_common_loss_cause: (trends.topOppFinishers && trends.topOppFinishers[0]) || null,
    avg_first_ko_turn: trends.avgFirstKoTurn || null,
    dead_moves: dead,
    failed_matchups: failed,
    best_win_path: null,
    trend_direction: 'stable',
    message_if_no_data: ''
  };
}

// ---- Top-level adapter ----------------------------------------------
// Builds the spec-shaped StrategyReport from the existing T9j.16 engine
// plus the Phase 2 generators above.
function csBuildStrategyReportV2(teamKey, results, fmt) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return null;
  var format = fmt || (typeof currentFormat !== 'undefined' ? currentFormat : 'doubles');
  results = results || {};

  var members = team.members || [];
  var sample = 0;
  Object.values(results).forEach(function(r){ sample += (r.wins||0) + (r.losses||0) + (r.draws||0); });

  var identity = csTeamIdentityV2(team, results, format);
  var leadSystem = buildLeadSystem(results, members);
  var gaps = findCoverageGaps(members);
  var deadMoves = findDeadMoves(results, members);
  var matchupWarnings = buildMatchupWarnings(team, results, format);
  var leadGuide = csTop3Leads(team, identity, results, format);
  var report_card = csTierAndScore(team, identity, leadSystem, gaps, results, sample);
  var moveLines = csMoveLines(team, identity, leadGuide);
  var mistakes = csMistakes(team, identity, format);
  var skill = csSkillCoaching(team, identity, leadGuide);
  var stress = csStressTest(team, identity, results, report_card);
  var whatWorks = csWhatWorks(team, identity, leadGuide);
  var whatWeak = csWhatIsWeak(team, identity, gaps, results);
  var threats = csTopThreats(team);
  var risk = csRiskProfile(team, report_card);
  var trend = csTrendAnalysisV2(team, results);
  var weaknessDashboard = buildWeaknessDashboard(team, results, format, identity, leadSystem, trend, deadMoves, matchupWarnings);

  var summary = report_card.tier + '-tier ' + identity.playstyle + '. ' +
    'Win path: ' + identity.primary_win_condition + '. ' +
    (mistakes[0] ? 'Top mistake to fix: ' + mistakes[0].mistake + '.' : '');

  return {
    schema_version: 1,
    team_signature: teamSignature(team),
    team_key: teamKey,
    format: format,
    generated_at: new Date().toISOString(),
    sim_data_version: sample,

    team_report_card: report_card,
    team_identity: identity,
    what_works: whatWorks,
    what_is_weak: whatWeak,
    top_threats: threats,
    lead_guide: leadGuide,
    move_lines: moveLines,
    mistakes_to_avoid: mistakes,
    risk_profile: risk,
    matchup_warnings: matchupWarnings,
    trend_analysis: trend,
    skill_coaching: skill,
    stress_test: stress,
    weakness_dashboard: weaknessDashboard,
    coaching_summary: summary
  };
}

// ---- Renderer --------------------------------------------------------
// Paints #strategy-content with all 12 sections from the spec report.
function _csEsc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
  });
}
function _csChip(label, opts) {
  opts = opts || {};
  return '<span class="cs-chip cs-chip-' + (opts.kind || 'default') + '">' + _csEsc(label) + '</span>';
}
function _csSourceChip(sourceLabel) {
  if (!sourceLabel) return '';
  var k = sourceLabel.kind || 'unknown';
  var labelMap = {
    verified_champions_source: 'verified source',
    simulation_data: 'sim sample',
    inferred_strategy: 'inferred',
    unknown: 'unknown'
  };
  var citationsHtml = (sourceLabel.citations || []).map(function(c){
    return '<a class="cs-cite" href="' + _csEsc(c.url) + '" target="_blank" rel="noopener">' + _csEsc(c.name) + '</a>';
  }).join(' ');
  return '<span class="cs-source cs-source-' + k + '" data-evidence>' +
    '<span class="cs-source-label">' + labelMap[k] + '</span>' +
    citationsHtml +
    '</span>';
}

function csPctLabel(value) {
  var n = Number(value || 0);
  return Math.round(n * 1000) / 10 + '%';
}

function csBuildTeamEvidenceDashboard(teamKey, history, branchAnalysis, report) {
  history = history || {};
  branchAnalysis = branchAnalysis || null;
  report = report || null;
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  var record = history.record_total || { n: 0, w: 0, l: 0, win_rate: 0 };
  var tacticalTotals = branchAnalysis && branchAnalysis.totals ? branchAnalysis.totals : {};
  var tacticalSamples = Number(tacticalTotals.weighted_samples || tacticalTotals.unique_rows_analyzed || tacticalTotals.rows_read || 0);
  var normalSamples = Number(record.n || history.total_battles || 0);
  var confidenceScore = 0;
  if (normalSamples >= 1000) confidenceScore += 2;
  else if (normalSamples >= 100) confidenceScore += 1;
  if (tacticalSamples >= 1000) confidenceScore += 2;
  else if (tacticalSamples >= 100) confidenceScore += 1;
  var confidence = confidenceScore >= 3 ? 'high' : confidenceScore >= 1 ? 'medium' : 'low';

  var archetypes = (history.record_by_archetype || []).slice().filter(function(row) { return row && row.n; });
  var bestCase = archetypes.length ? archetypes.slice().sort(function(a, b) { return b.win_rate - a.win_rate; })[0] : null;
  var worstCase = null;
  if (history.matchup_failures && history.matchup_failures.length) {
    worstCase = history.matchup_failures[0];
  } else if (archetypes.length) {
    worstCase = archetypes.slice().sort(function(a, b) { return a.win_rate - b.win_rate; })[0];
  }
  var likely = record.n
    ? ((record.win_rate >= 0.55 ? 'Winning baseline' : record.win_rate >= 0.45 ? 'Even baseline' : 'Losing baseline') + ' at ' + csPctLabel(record.win_rate))
    : 'No normal sim sample yet';

  var nextTest = 'Run All + QA Artifact for this team, then run Tactical Sweep on its worst selected matchup.';
  if (!normalSamples) {
    nextTest = 'Run Sim or Run All first so this team gets outcome evidence.';
  } else if (!tacticalSamples) {
    nextTest = 'Run Tactical Sweep + QA so this team gets branch and move-choice evidence.';
  } else if (confidence !== 'high') {
    nextTest = 'Increase Tactical Depth or run another 10,000 QA Artifact before treating recommendations as high confidence.';
  } else if (worstCase) {
    nextTest = 'Focus selected Tactical Sweep on the worst-case matchup until avoid lines stabilize.';
  }

  var changeNote = 'No prior set version saved for this team ID.';
  try {
    var currentSig = team && typeof teamSignature === 'function' ? teamSignature(team) : null;
    var store = (typeof _csPersistRead === 'function') ? _csPersistRead() : null;
    var reports = store && store.reports ? store.reports : {};
    var prior = Object.keys(reports).map(function(sig) {
      var entry = reports[sig] || {};
      return {
        sig: sig,
        entry: entry,
        built: entry.last_built_at || '',
        score: entry.theory_report && entry.theory_report.team_report_card ? Number(entry.theory_report.team_report_card.score || 0) : null,
        sample: entry.simulation_overlay ? Number(entry.simulation_overlay.sample_size || 0) : Number(entry.theory_report && entry.theory_report.sim_data_version || 0)
      };
    }).filter(function(row) {
      return row.entry && row.entry.team_key === teamKey && row.sig !== currentSig;
    }).sort(function(a, b) {
      return String(b.built).localeCompare(String(a.built));
    })[0];
    var currentScore = report && report.team_report_card ? Number(report.team_report_card.score || 0) : null;
    if (prior && currentScore !== null && prior.score !== null) {
      var delta = currentScore - prior.score;
      var label = delta > 2 ? 'Improved' : delta < -2 ? 'Regressed' : 'Changed';
      changeNote = label + ' vs prior saved set version: ' + (delta >= 0 ? '+' : '') + delta + ' score points. Prior sample ' + prior.sample + '; current sample ' + normalSamples + '.';
    } else if (prior) {
      changeNote = 'Team set changed from a prior saved version. Run the same matchup suite before calling improvement or regression.';
    }
  } catch (_e) {}

  return {
    team_name: team && team.name ? team.name : (teamKey || 'selected team'),
    team_key: teamKey || null,
    custom_team: !!(team && team.source === 'custom'),
    normal_samples: normalSamples,
    tactical_samples: tacticalSamples,
    confidence: confidence,
    best_case: bestCase ? ((bestCase.archetype || bestCase.oppKey || 'best matchup') + ' · ' + csPctLabel(bestCase.win_rate) + ' over ' + bestCase.n) : 'Needs matchup sample',
    worst_case: worstCase ? ((worstCase.archetype || worstCase.oppKey || 'worst matchup') + ' · ' + csPctLabel(worstCase.win_rate) + ' over ' + worstCase.n) : 'Needs matchup sample',
    likely_case: likely,
    change_note: changeNote,
    next_test: nextTest
  };
}

function csRenderTeamEvidenceDashboard(teamKey, history, branchAnalysis, report) {
  var dash = csBuildTeamEvidenceDashboard(teamKey, history, branchAnalysis, report);
  var html = '';
  html += '<div class="cs-team-evidence-dashboard">';
  html += '<div class="cs-detector-row cs-detector-head"><span>Team evidence</span><span>Sample</span><span>Battle outlook</span><span>Trust</span></div>';
  html += '<div class="cs-detector-row">';
  html += '<span>' + _csEsc(dash.team_name) + (dash.custom_team ? ' · custom' : '') + '</span>';
  html += '<span>' + _csEsc(String(dash.normal_samples)) + ' sim · ' + _csEsc(String(dash.tactical_samples)) + ' tactical</span>';
  html += '<span>' + _csEsc(dash.likely_case) + '</span>';
  html += '<span>' + _csEsc(dash.confidence) + '</span>';
  html += '</div>';
  html += '<div class="cs-detector-row">';
  html += '<span>Best case</span><span>' + _csEsc(dash.best_case) + '</span><span>Use this to learn what the team wants to repeat.</span><span>evidence</span>';
  html += '</div>';
  html += '<div class="cs-detector-row">';
  html += '<span>Worst case</span><span>' + _csEsc(dash.worst_case) + '</span><span>Use this to decide the next selected Tactical Sweep.</span><span>evidence</span>';
  html += '</div>';
  html += '<div class="cs-detector-row">';
  html += '<span>Set changes</span><span>' + _csEsc(dash.change_note) + '</span><span>Same team ID keeps history, but changed sets are version-compared by signature.</span><span>versioned</span>';
  html += '</div>';
  html += '<div class="cs-detector-row">';
  html += '<span>Next test</span><span>' + _csEsc(dash.next_test) + '</span><span>Normal sim proves outcomes; Tactical Sweep proves decision branches.</span><span>action</span>';
  html += '</div>';
  html += '</div>';
  return html;
}

function csCoachSequenceWhyFromBranch(branchAnalysis) {
  var tactic = branchAnalysis && Array.isArray(branchAnalysis.tactical_signals) ? branchAnalysis.tactical_signals[0] : null;
  if (!tactic) return null;
  var tag = tactic.tactic_tag || 'tactical timing';
  var delta = Number(tactic.avg_position_delta || 0);
  var positive = delta >= 0.2 || Number(tactic.win_rate_pct || 0) >= 60;
  var negative = delta <= -0.2 || Number(tactic.win_rate_pct || 0) <= 35;
  return {
    schema_version: 'champions-coach-tactical-interpretation-v1',
    primary_category: 'branch_tactical_timing',
    strength_category: positive ? 'branch_tactical_timing' : null,
    player_question: 'What changed after this timing choice in the branch matrix?',
    why_good_windows_worked: positive
      ? tag + ' tended to create pressure or position gain in this matchup branch.'
      : 'No strong positive timing window is proven from the top branch signal yet.',
    why_bad_windows_failed: negative
      ? tag + ' tended to lose position or fail to convert in this matchup branch.'
      : 'No strong negative timing window is proven from the top branch signal yet.',
    turn_sequence_rule: 'Use the branch timing signal as a test target: repeat the same lead and opposing lead, then compare attacking, protecting, switching, or delaying the timing move.',
    coach_checklist: [
      'Keep the same lead pair and opposing lead when retesting this timing read.',
      'Compare the branch against an attack, Protect, switch, or delayed setup option.',
      'Promote the advice only when repeat samples keep the same direction.'
    ],
    data_to_watch_next: [tag, 'win_rate_pct', 'avg_position_delta', 'confidence'],
    evidence_boundary: 'Derived from branch_move_analysis.tactical_signals, not a full coach brain ledger.'
  };
}

function csRenderCoachSequenceWhy(report, branchAnalysis, teamKey) {
  var brain = report && report.coach_brain_summary ? report.coach_brain_summary : null;
  if (!brain && typeof csLatestCoachBrainForTeam === 'function') brain = csLatestCoachBrainForTeam(teamKey);
  var interp = brain && brain.tactical_interpretation ? brain.tactical_interpretation : csCoachSequenceWhyFromBranch(branchAnalysis);
  if (!interp) return '';
  var checklist = Array.isArray(interp.coach_checklist) ? interp.coach_checklist : [];
  var watch = Array.isArray(interp.data_to_watch_next) ? interp.data_to_watch_next : [];
  var html = '';
  html += '<div class="cs-coach-sequence-why">';
  html += '<h4 class="cs-h4">Coach sequence why</h4>';
  html += '<p><strong>Player question:</strong> ' + _csEsc(interp.player_question || 'What changed because of this decision?') + '</p>';
  html += '<p><strong>Why good windows worked:</strong> ' + _csEsc(interp.why_good_windows_worked || '-') + '</p>';
  html += '<p><strong>Why bad windows failed:</strong> ' + _csEsc(interp.why_bad_windows_failed || '-') + '</p>';
  html += '<p><strong>Turn rule:</strong> ' + _csEsc(interp.turn_sequence_rule || '-') + '</p>';
  if (checklist.length) {
    html += '<ul class="cs-list cs-coach-checklist">';
    checklist.slice(0, 4).forEach(function(item) { html += '<li>' + _csEsc(item) + '</li>'; });
    html += '</ul>';
  }
  if (watch.length) {
    html += '<p class="cs-explain"><strong>Watch next:</strong> ' + _csEsc(watch.slice(0, 6).join(', ')) + '</p>';
  }
  html += '</div>';
  return html;
}

function csRenderStrategyPriorityBoard(teamKey, history, branchAnalysis, report) {
  history = history || null;
  branchAnalysis = branchAnalysis || null;
  var record = history && history.record_total ? history.record_total : null;
  var lead = history && history.lead_performance_v2 && history.lead_performance_v2[0] ? history.lead_performance_v2[0] : null;
  var swap = branchAnalysis && branchAnalysis.move_replacement_candidates && branchAnalysis.move_replacement_candidates[0] ? branchAnalysis.move_replacement_candidates[0] : null;
  var avoid = branchAnalysis && branchAnalysis.avoid_moves && branchAnalysis.avoid_moves[0] ? branchAnalysis.avoid_moves[0] : null;
  var line = branchAnalysis && branchAnalysis.suggested_lines && branchAnalysis.suggested_lines[0] ? branchAnalysis.suggested_lines[0] : null;
  var tactic = branchAnalysis && branchAnalysis.tactical_signals && branchAnalysis.tactical_signals[0] ? branchAnalysis.tactical_signals[0] : null;
  var trainer = branchAnalysis && Array.isArray(branchAnalysis.trainer_report) ? branchAnalysis.trainer_report : [];

  var primaryCall = 'Run a sim set, then export QA Artifact to unlock matchup-specific click advice.';
  if (line) {
    primaryCall = 'Primary line to test: ' + (line.suggested_line || 'current best line') + '.';
  } else if (swap) {
    primaryCall = 'Primary adjustment: use ' + (swap.better_legal_move_seen || 'the better observed move') + ' over ' + (swap.avoid_move || 'the weak click') + ' in the listed context.';
  } else if (lead) {
    primaryCall = 'Primary lead mode: ' + (lead.lead || []).join(' + ') + '.';
  }

  var nextTest = 'Run a QA Artifact branch matrix after your next sim set so move-line advice can update.';
  if (line && line.confidence !== 'strong') {
    nextTest = 'Repeat this branch context until the suggested line reaches strong confidence: ' + (line.suggested_line || 'current best line') + '.';
  } else if (tactic && tactic.confidence !== 'strong') {
    nextTest = 'Repeat the tactical timing branch until ' + (tactic.tactic_tag || 'the timing pattern') + ' is either strong or disappears.';
  } else if (swap && swap.confidence === 'strong') {
    nextTest = 'Stress-test the strong swap into a different opposing lead before making it a permanent meta rule.';
  } else if (record && record.n >= 500 && (!branchAnalysis || !(branchAnalysis.totals && branchAnalysis.totals.weighted_samples))) {
    nextTest = 'You have a strong matchup sample. Next run the QA branch matrix so the guide learns the move clicks behind it.';
  }

  var html = '';
  html += '<section class="cs-section cs-strategy-priority-board">';
  html += '<h3 class="cs-h3">Strategy Priority Board</h3>';
  html += csRenderTeamEvidenceDashboard(teamKey, history, branchAnalysis, report);
  html += '<p class="cs-summary-line"><strong>Coach call:</strong> ' + _csEsc(primaryCall) + '</p>';
  html += csRenderCoachSequenceWhy(report, branchAnalysis, teamKey);
  html += '<div class="cs-detector-table">';
  html += '<div class="cs-detector-row cs-detector-head"><span>Priority</span><span>Evidence</span><span>Player action</span><span>Trust</span></div>';

  if (line) {
    html += '<div class="cs-detector-row">';
    html += '<span>1. Click plan</span>';
    html += '<span class="cs-detector-cell-desc">' + _csEsc(line.suggested_line || '-') + '</span>';
    html += '<span>Test this line first; early reads need repeat samples before becoming rules.</span>';
    html += '<span>' + _csEsc(line.confidence || 'early') + '</span>';
    html += '</div>';
  }

  if (swap) {
    html += '<div class="cs-detector-row">';
    html += '<span>2. Move swap</span>';
    html += '<span><strong>' + _csEsc(swap.actor || '-') + '</strong>: ' + _csEsc(swap.avoid_move || '-') + ' -> ' + _csEsc(swap.better_legal_move_seen || '-') + ' · +' + _csEsc(String(swap.lift_pct)) + '%</span>';
    html += '<span>Prefer the better move when the same lead pair and opposing lead show up.</span>';
    html += '<span>' + _csEsc(swap.confidence || 'early') + '</span>';
    html += '</div>';
  }

  if (avoid) {
    html += '<div class="cs-detector-row">';
    html += '<span>3. Avoid trap</span>';
    html += '<span><strong>' + _csEsc(avoid.actor || '-') + '</strong> - ' + _csEsc(avoid.move || '-') + ' · ' + _csEsc(String(avoid.win_rate_pct)) + '% over ' + _csEsc(String(avoid.samples)) + '</span>';
    html += '<span>Do not autopilot this move in the listed lead and matchup context.</span>';
    html += '<span>' + _csEsc(avoid.confidence || 'early') + '</span>';
    html += '</div>';
  }

  if (lead) {
    html += '<div class="cs-detector-row">';
    html += '<span>' + (tactic ? '5. Lead mode' : '4. Lead mode') + '</span>';
    html += '<span>' + _csEsc((lead.lead || []).join(' + ')) + ' · ' + lead.w + '-' + lead.l + ' · ' + csPctLabel(lead.win_rate) + '</span>';
    html += '<span>Use this as the default preview mode until a matchup-specific branch read beats it.</span>';
    html += '<span>' + _csEsc(lead.confidence || 'sample') + '</span>';
    html += '</div>';
  }

  if (tactic) {
    html += '<div class="cs-detector-row">';
    html += '<span>4. Tactical timing</span>';
    html += '<span>' + _csEsc(tactic.tactic_tag || '-') + ' · ' + _csEsc(String(tactic.win_rate_pct)) + '% / position ' + _csEsc(String(tactic.avg_position_delta || 0)) + '</span>';
    html += '<span>Review Protect, pivot, speed-control, first-KO, and board-position timing before locking the line.</span>';
    html += '<span>' + _csEsc(tactic.confidence || 'early') + '</span>';
    html += '</div>';
  }

  if (record) {
    html += '<div class="cs-detector-row">';
    html += '<span>' + (tactic ? '6. Matchup health' : '5. Matchup health') + '</span>';
    html += '<span>' + record.w + '-' + record.l + ' over ' + record.n + ' games</span>';
    html += '<span>' + _csEsc(record.win_rate >= 0.55 ? 'The plan is winning; optimize clicks and avoid leaks.' : 'The plan is shaky; fix preview/lead before polishing clicks.') + '</span>';
    html += '<span>' + _csEsc(history.team_confidence_v2 ? history.team_confidence_v2.tier : 'sample') + '</span>';
    html += '</div>';
  }

  if (!record && !lead && !avoid && !swap && !line) {
    html += '<div class="cs-detector-row"><span>No strategy memory yet</span><span>-</span><span>Run one matchup sim, then export QA Artifact.</span><span>none</span></div>';
  }
  html += '</div>';

  if (trainer.length) {
    html += '<ul class="cs-list cs-detector-roles">';
    trainer.slice(0, 3).forEach(function(row) { html += '<li>' + _csEsc(row) + '</li>'; });
    html += '</ul>';
  }
  html += '<p class="cs-explain"><strong>Next test:</strong> ' + _csEsc(nextTest) + '</p>';
  html += '</section>';
  return html;
}

function getStrategyContentHost() {
  return document.getElementById('strategy-content') ||
    document.getElementById('strategy-panel') ||
    document.getElementById('tab-strategy');
}

function renderStrategyTab(teamKey) {
  var host = getStrategyContentHost();
  if (!host) return;
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) {
    host.innerHTML = '<div class="strategy-empty">Select a team to generate the coaching report.</div>';
    return;
  }
  // Phase 3 (Refs #51): cached fast-path. If renderStrategyTabFromCache has
  // stashed a saved report on window._csCachedOverride, paint that instead
  // of rebuilding from scratch. Skips the (cheap) build but more importantly
  // gives us instant paint on team switches and after page reload.
  var report;
  var fromCache = false;
  if (ChampionsSim.state.cachedStrategyOverride) {
    report = ChampionsSim.state.cachedStrategyOverride;
    fromCache = true;
  } else {
    var results = (typeof window !== 'undefined' && ChampionsSim.state.lastResults) ? ChampionsSim.state.lastResults : {};
    report = csBuildStrategyReportV2(teamKey, results, (typeof currentFormat !== 'undefined' ? currentFormat : 'doubles'));
  }
  if (!report) {
    host.innerHTML = '<div class="strategy-empty">Could not generate report for this team.</div>';
    return;
  }
  // Phase 3: persist freshly-built reports so the next page load paints instantly.
  if (!fromCache) {
    try { csSaveReport(teamKey, report); } catch(e) { UILog.warn('strategy report save failed', e); }
  }
  // Stash for tests / inspection
  ChampionsSim.state.lastStrategyReport = report;
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('_lastStrategyReport', report);

  var rc = report.team_report_card;
  var id = report.team_identity;
  var lg = report.lead_guide;

  var html = '';
  html += '<div class="cs-summary-bar">';
  html +=   '<div class="cs-tier-badge cs-tier-' + rc.tier + '">' + rc.tier + '</div>';
  html +=   '<div class="cs-score">' + rc.score + '<span class="cs-score-suffix">/100</span></div>';
  html +=   '<div class="cs-meta">';
  html +=     '<div><strong>' + _csEsc(team.name || teamKey) + '</strong> ' + _csChip(id.playstyle, {kind:'playstyle'}) + '</div>';
  html +=     '<div class="cs-meta-line">Confidence: ' + rc.confidence + ' &middot; Risk: ' + rc.risk_level + ' &middot; Sample: ' + report.sim_data_version + ' games</div>';
  html +=     (rc.battle_ready ? '<div class="cs-battle-ready">BATTLE READY</div>' : '');
  html +=   '</div>';
  html += '</div>';

  html += '<p class="cs-summary-line">' + _csEsc(report.coaching_summary) + '</p>';

  // Phase 4b (Refs #52) — Adaptive state banner + consistency pill.
  // Inserted above Section 1 so the user sees the state before reading anything.
  try {
    var _history = (typeof computeTeamHistory === 'function') ? computeTeamHistory(teamKey) : null;
    var _branchAnalysis = (typeof csLatestBranchMoveAnalysisForTeam === 'function') ? csLatestBranchMoveAnalysisForTeam(teamKey) : null;
    if (typeof csRenderStrategyPriorityBoard === 'function') {
      html += csRenderStrategyPriorityBoard(teamKey, _history, _branchAnalysis, report);
    }
    if (_history) html += csRenderAdaptiveBanner(_history);
    if (_history) html += csRenderRecordBar(_history);
    // Phase 4c (Refs PHASE4C_DETECTORS_SPEC.md): 5 collapsible detector
    // sections under the Record bar. Renders inline/section confidence
    // badges and 'insufficient data' placeholders when n < 5.
    if (_history && typeof csRenderPhase4cSections === 'function') {
      html += csRenderPhase4cSections(_history, teamKey, team);
    }
    if (_history && typeof csRenderPolicyAuditSection === 'function') {
      html += csRenderPolicyAuditSection(_history);
    }
    // Phase 4d: surface best candidate + alternatives for the currently
    // selected opponent. Kept low-budget in the tab render; deeper sweeps can
    // request a larger simsPerBranch explicitly.
    if (typeof solveThreatResponse === 'function' && typeof renderThreatResponseCard === 'function') {
      var _oppSel = (typeof document !== 'undefined') ? document.getElementById('opponent-select') : null;
      var _oppKey = (_oppSel && _oppSel.value && TEAMS[_oppSel.value]) ? _oppSel.value : Object.keys(TEAMS).filter(function(k){ return k !== teamKey; })[0];
      if (_oppKey) html += renderThreatResponseCard(solveThreatResponse(teamKey, _oppKey, { simsPerBranch: 30, rngSeed: 'strategy-tab' }));
    }
    if (report && typeof csRenderWeaknessDashboard === 'function') {
      html += csRenderWeaknessDashboard(report);
    }
  } catch (e) { UILog.warn('banner render failed', e); }

  // Section 1: Team report card
  html += '<section class="cs-section"><h3 class="cs-h3">Team Report Card ' + _csSourceChip(csLabelSim()) + '</h3>';
  html += '<p class="cs-explain">' + _csEsc(rc.short_explanation) + '</p>';
  html += '<div class="cs-cat-grid">';
  Object.keys(CS_WEIGHTS).forEach(function(k){
    var v = rc.category_scores[k];
    html += '<div class="cs-cat"><div class="cs-cat-label">' + k.replace(/_/g,' ') + '</div>';
    html += '<div class="cs-cat-score">' + (v === null ? 'n/a' : v + '/10') + '</div></div>';
  });
  html += '</div></section>';

  // Section 2: Team identity
  html += '<section class="cs-section"><h3 class="cs-h3">Team Identity ' + _csSourceChip(id.source_label) + '</h3>';
  html += '<ul class="cs-list">';
  html += '<li><strong>Playstyle:</strong> ' + _csEsc(id.playstyle) + '</li>';
  html += '<li><strong>Win condition:</strong> ' + _csEsc(id.primary_win_condition) + '</li>';
  html += '<li><strong>Closer:</strong> ' + _csEsc(id.closer) + '</li>';
  html += '<li><strong>Support core:</strong> ' + _csEsc((id.support_core||[]).join(', ') || '-') + '</li>';
  if (Array.isArray(id.speed_control_mons) && id.speed_control_mons.length) {
    html += '<li><strong>Speed control anchor:</strong> ' + _csEsc(id.speed_control_mons.join(', ')) + '</li>';
  }
  if (Array.isArray(id.pivot_mons) && id.pivot_mons.length) {
    html += '<li><strong>Pivot core:</strong> ' + _csEsc(id.pivot_mons.join(', ')) + '</li>';
  }
  if (report.provenance) {
    html += '<li><strong>Provenance:</strong> ' + _csEsc(report.provenance.source_label || 'simulation_data') + ' · ' + _csEsc(report.provenance.freshness_label || 'no sample yet') + ' · ' + _csEsc(report.provenance.freshness_note || '') + '</li>';
  }
  html += '<li><strong>Format fit:</strong> ' + _csEsc(id.format_fit) + '</li>';
  html += '</ul></section>';

  // Section 3: Matchup intelligence
  var mi = report.matchup_intelligence;
  if (mi) {
    html += '<section class="cs-section"><h3 class="cs-h3">Matchup Intelligence</h3>';
    html += '<p><strong>Grade:</strong> ' + _csEsc(mi.grade + ' · ' + mi.confidence + ' confidence') + '</p>';
    html += '<p><strong>Safe leads:</strong> ' + _csEsc((mi.safe_leads || []).join(' | ') || 'No safe lead logged yet') + '</p>';
    html += '<p><strong>Risky leads:</strong> ' + _csEsc((mi.risky_leads || []).join(' | ') || 'No risky lead logged yet') + '</p>';
    html += '<p><strong>Speed truth:</strong> ' + _csEsc(mi.speed_truth || 'No speed note yet') + '</p>';
    html += '<p><strong>Best win path:</strong> ' + _csEsc(mi.best_win_path || 'unclear') + '</p>';
    html += '<p><strong>Common loss path:</strong> ' + _csEsc(mi.common_loss_path || 'unclear') + '</p>';
    html += '</section>';
  }

  // Section 4: BO3 adaptation
  var bo3 = report.bo3_adaptation;
  if (bo3) {
    html += '<section class="cs-section"><h3 class="cs-h3">BO3 Adaptation</h3>';
    html += '<p><strong>Game 1 lead:</strong> ' + _csEsc(bo3.game1_lead || 'unclear') + ' ' + _csSourceChip(bo3.source_label) + '</p>';
    html += '<p><strong>Game 2 plan:</strong> ' + _csEsc(bo3.game2_plan || 'unclear') + '</p>';
    html += '<p><strong>Revealed info:</strong> ' + _csEsc(bo3.revealed_info || 'unclear') + '</p>';
    html += '<p><strong>Opponent adjustment:</strong> ' + _csEsc(bo3.opponent_adjustment_prediction || 'unclear') + '</p>';
    html += '<p><strong>Counter-adjustment:</strong> ' + _csEsc(bo3.counter_adjustment || 'unclear') + '</p>';
    html += '<p><strong>Preserve:</strong> ' + _csEsc(bo3.what_to_preserve || 'unclear') + '</p>';
    html += '<p><strong>Common loss path:</strong> ' + _csEsc(bo3.common_loss_path || 'unclear') + '</p>';
    html += '</section>';
  }

  // Section 5: What works
  var ww = report.what_works;
  html += '<section class="cs-section"><h3 class="cs-h3">What Works</h3>';
  html += '<p><strong>Best synergy:</strong> ' + _csEsc(ww.best_synergy.description) + ' ' + _csSourceChip(ww.best_synergy.source_label) + '</p>';
  html += '<p><strong>Damage plan:</strong> ' + _csEsc(ww.best_damage_plan.description) + ' ' + _csSourceChip(ww.best_damage_plan.source_label) + '</p>';
  html += '<p><strong>Defensive plan:</strong> ' + _csEsc(ww.best_defensive_plan.description) + ' ' + _csSourceChip(ww.best_defensive_plan.source_label) + '</p>';
  html += '<p><strong>Strongest win path:</strong> ' + _csEsc(ww.strongest_win_path.description) + ' ' + _csSourceChip(ww.strongest_win_path.source_label) + '</p>';
  html += '</section>';

  // Section 6: What is weak
  var wk = report.what_is_weak;
  html += '<section class="cs-section"><h3 class="cs-h3">What Is Weak</h3>';
  if (wk.missing_roles.length) html += '<p><strong>Missing:</strong> ' + _csEsc(wk.missing_roles.join(', ')) + '</p>';
  if (wk.bad_matchups.length)  html += '<p><strong>Bad matchups:</strong> ' + _csEsc(wk.bad_matchups.join(', ')) + '</p>';
  if (wk.coverage_gaps.length) html += '<p><strong>Coverage gaps:</strong> ' + _csEsc(wk.coverage_gaps.join(', ')) + '</p>';
  if (wk.fragile_leads.length) html += '<p><strong>Fragile lead candidates:</strong> ' + _csEsc(wk.fragile_leads.join(', ')) + '</p>';
  if (wk.overreliance)         html += '<p><strong>Overreliance on:</strong> ' + _csEsc(wk.overreliance) + '</p>';
  html += '<p><strong>Speed control:</strong> ' + _csEsc(wk.speed_issues) + '</p>';
  html += '</section>';

  // Section 7: Top threats
  if (report.top_threats.length) {
    html += '<section class="cs-section"><h3 class="cs-h3">Top Threats</h3><div class="cs-threat-grid">';
    report.top_threats.forEach(function(t){
      html += '<div class="cs-threat-card"><div class="cs-threat-name">' + _csEsc(t.pokemon) + ' ' + _csSourceChip(t.source_label) + '</div>';
      html += '<div class="cs-threat-why">' + _csEsc(t.why_dangerous) + '</div>';
      html += '<div class="cs-threat-play"><strong>Play around:</strong> ' + _csEsc(t.play_around) + '</div></div>';
    });
    html += '</div></section>';
  }

  // Section 8: Lead guide (top 3)
  html += '<section class="cs-section"><h3 class="cs-h3">Top 3 Leads (' + lg.format + ')</h3>';
  html += '<div class="cs-lead-grid">';
  (lg.recommendations || []).forEach(function(rec){
    html += '<div class="cs-lead-card">';
    html += '<div class="cs-lead-rank">#' + rec.rank + '</div>';
    html += '<div class="cs-lead-pair">' + _csEsc((rec.lead || []).join(' + ')) + '</div>';
    html += '<div class="cs-lead-purpose">' + _csEsc(rec.purpose) + ' ' + _csSourceChip(rec.source_label) + '</div>';
    html += '<div class="cs-lead-line"><strong>T1:</strong> ' + _csEsc(rec.turn_1_line) + '</div>';
    html += '<div class="cs-lead-line"><strong>T2:</strong> ' + _csEsc(rec.turn_2_line) + '</div>';
    html += '<div class="cs-lead-risk"><strong>Risk:</strong> ' + _csEsc(rec.risk_warning) + '</div>';
    if (rec.win_rate !== null) {
      html += '<div class="cs-lead-wr">Sim WR: ' + Math.round(rec.win_rate * 100) + '% (' + rec.sample_size + ' games)</div>';
    }
    html += '</div>';
  });
  html += '</div></section>';

  // Section 9: Move lines
  html += '<section class="cs-section"><h3 class="cs-h3">Move Lines (' + report.move_lines.length + ' scenarios)</h3>';
  html += '<div class="cs-moveline-grid">';
  report.move_lines.forEach(function(ml){
    html += '<div class="cs-moveline-card">';
    html += '<div class="cs-moveline-scenario">' + _csEsc(ml.scenario) + ' ' + _csSourceChip(ml.source_label) + '</div>';
    html += '<div class="cs-moveline-lead">Lead: ' + _csEsc((ml.lead_recommendation||[]).join(' + ')) + '</div>';
    html += '<div><strong>T1:</strong> ' + _csEsc(ml.turn_1) + '</div>';
    html += '<div><strong>T2:</strong> ' + _csEsc(ml.turn_2) + '</div>';
    html += '<div class="cs-avoid"><strong>Avoid:</strong> ' + _csEsc(ml.what_to_avoid) + '</div>';
    html += '<div class="cs-fallback"><strong>Fallback:</strong> ' + _csEsc(ml.fallback_plan) + '</div>';
    html += '</div>';
  });
  html += '</div></section>';

  // Section 10: Mistakes
  html += '<section class="cs-section"><h3 class="cs-h3">Mistakes to Avoid (' + report.mistakes_to_avoid.length + ')</h3>';
  html += '<div class="cs-mistake-list">';
  report.mistakes_to_avoid.forEach(function(m, i){
    html += '<div class="cs-mistake">';
    html += '<div class="cs-mistake-head"><span class="cs-mistake-num">' + (i+1) + '</span> ' + _csEsc(m.mistake) + '</div>';
    html += '<div class="cs-mistake-why"><strong>Why:</strong> ' + _csEsc(m.why_it_loses) + '</div>';
    html += '<div class="cs-mistake-fix"><strong>Fix:</strong> ' + _csEsc(m.correction) + '</div>';
    html += '</div>';
  });
  html += '</div></section>';

  // Section 11: Risk profile
  if (report.risk_profile.length) {
    html += '<section class="cs-section"><h3 class="cs-h3">Risk Profile</h3><div class="cs-risk-grid">';
    report.risk_profile.forEach(function(r){
      html += '<div class="cs-risk-card cs-risk-' + r.severity + '">';
      html += '<div class="cs-risk-cat">' + _csEsc(r.category.replace(/_/g,' ')) + ' &middot; ' + r.severity + '</div>';
      html += '<div>' + _csEsc(r.why_it_matters) + '</div>';
      html += '<div class="cs-risk-fix"><strong>Reduce by:</strong> ' + _csEsc(r.how_to_reduce) + '</div>';
      html += '</div>';
    });
    html += '</div></section>';
  }

  // Section 12: Trend analysis
  var ta = report.trend_analysis;
  html += '<section class="cs-section"><h3 class="cs-h3">Trend Analysis</h3>';
  if (!ta.has_data) {
    html += '<p class="cs-no-data">' + _csEsc(ta.message_if_no_data) + '</p>';
  } else {
    html += '<ul class="cs-list">';
    if (ta.best_lead)  html += '<li><strong>Best lead:</strong> ' + _csEsc(ta.best_lead.lead.join(' + ')) + ' (' + Math.round(ta.best_lead.win_rate*100) + '% over ' + ta.best_lead.sample + ')</li>';
    if (ta.worst_lead) html += '<li><strong>Worst lead:</strong> ' + _csEsc(ta.worst_lead.lead.join(' + ')) + ' (' + Math.round(ta.worst_lead.win_rate*100) + '% over ' + ta.worst_lead.sample + ')</li>';
    if (ta.most_common_loss_cause) html += '<li><strong>Most common loss cause:</strong> ' + _csEsc(ta.most_common_loss_cause) + '</li>';
    if (ta.avg_first_ko_turn) html += '<li><strong>Avg first KO turn:</strong> ' + ta.avg_first_ko_turn + '</li>';
    if (ta.dead_moves.length) html += '<li><strong>Dead moves:</strong> ' + _csEsc(ta.dead_moves.join(', ')) + '</li>';
    if (ta.failed_matchups.length) html += '<li><strong>Failed matchups:</strong> ' + _csEsc(ta.failed_matchups.join(', ')) + '</li>';
    html += '</ul>';
  }
  html += '</section>';

  // Section 13: Skill coaching
  var sk = report.skill_coaching;
  html += '<section class="cs-section"><h3 class="cs-h3">Skill Coaching</h3><div class="cs-skill-grid">';
  html += '<div class="cs-skill-card"><h4>Beginner</h4>';
  html += '<p><strong>How team wins:</strong> ' + _csEsc(sk.beginner.how_team_wins) + '</p>';
  html += '<p><strong>Safest lead:</strong> ' + _csEsc(sk.beginner.safest_lead.join(' + ')) + '</p>';
  html += '<p><strong>Safe T1:</strong> ' + _csEsc(sk.beginner.safest_first_turn) + '</p>';
  html += '<p><strong>Do not click:</strong> ' + _csEsc(sk.beginner.do_not_click.join(', ')) + '</p></div>';
  html += '<div class="cs-skill-card"><h4>Intermediate</h4>';
  html += '<p><strong>When to switch:</strong> ' + _csEsc(sk.intermediate.when_to_switch) + '</p>';
  html += '<p><strong>When to Protect:</strong> ' + _csEsc(sk.intermediate.when_to_protect) + '</p>';
  html += '<p><strong>Tempo:</strong> ' + _csEsc(sk.intermediate.tempo_management) + '</p>';
  html += '<p><strong>Preserve wincon:</strong> ' + _csEsc(sk.intermediate.preserve_wincon) + '</p></div>';
  html += '<div class="cs-skill-card"><h4>Advanced</h4>';
  html += '<p><strong>Bait & punish:</strong></p><ul class="cs-list">';
  sk.advanced.bait_and_punish.forEach(function(x){ html += '<li>' + _csEsc(x) + '</li>'; });
  html += '</ul>';
  html += '<p><strong>Double-switch logic:</strong> ' + _csEsc(sk.advanced.double_switch_logic) + '</p>';
  html += '<p><strong>Win path compression:</strong> ' + _csEsc(sk.advanced.win_path_compression) + '</p>';
  html += '<p><strong>Risk vs reward:</strong> ' + _csEsc(sk.advanced.risk_reward_adjustments) + '</p>';
  html += '<p><strong>Opponent prediction:</strong> ' + _csEsc(sk.advanced.opponent_prediction) + '</p></div>';
  html += '</div></section>';

  // Section 14: Stress test
  var st = report.stress_test;
  html += '<section class="cs-section"><h3 class="cs-h3">Stress Test &middot; Consistency: ' + st.consistency_rating + '</h3>';
  if (st.break_points.length) {
    html += '<p><strong>Break points:</strong></p><ul class="cs-list">';
    st.break_points.forEach(function(x){ html += '<li>' + _csEsc(x) + '</li>'; });
    html += '</ul>';
  }
  if (st.punish_windows.length) {
    html += '<p><strong>Punish windows:</strong></p><ul class="cs-list">';
    st.punish_windows.forEach(function(x){ html += '<li>' + _csEsc(x) + '</li>'; });
    html += '</ul>';
  }
  if (st.worst_matchups.length) html += '<p><strong>Worst matchups:</strong> ' + _csEsc(st.worst_matchups.join(', ')) + '</p>';
  if (st.failure_scenarios.length) {
    html += '<p><strong>Failure scenarios:</strong></p><ul class="cs-list">';
    st.failure_scenarios.forEach(function(x){ html += '<li>' + _csEsc(x) + '</li>'; });
    html += '</ul>';
  }
  html += '<p class="cs-champ-pov"><strong>Champion POV:</strong> ' + _csEsc(st.champion_perspective) + '</p>';
  html += '</section>';

  host.innerHTML = html;
  if (_history && typeof csWireLeadPairTableSort === 'function') {
    csWireLeadPairTableSort(host, teamKey);
  }

  // Apply Evidence toggle state on initial paint
  _csApplyEvidenceVisibility();
}

// ---- Evidence toggle (Section 14, decision 3) -----------------------
var CS_EVIDENCE_KEY = 'champions_evidence_chips_visible';
function _csApplyEvidenceVisibility() {
  try {
    var on = (typeof Storage !== 'undefined') ? Storage.get(CS_EVIDENCE_KEY) === '1' : false;
    var t = document.getElementById('strategy-evidence-toggle');
    if (t) t.checked = on;
    document.querySelectorAll('[data-evidence]').forEach(function(el){
      el.style.display = on ? '' : 'none';
    });
  } catch(e) { /* no-op if storage blocked */ }
}
function _csInitEvidenceToggle() {
  var t = document.getElementById('strategy-evidence-toggle');
  if (!t) return;
  t.addEventListener('change', function(){
    try { if (typeof Storage !== 'undefined') Storage.set(CS_EVIDENCE_KEY, t.checked ? '1' : '0'); } catch(e) {}
    _csApplyEvidenceVisibility();
  });
  _csApplyEvidenceVisibility();
}

// =====================================================================
// PHASE 3 - PER-TEAM REPORT PERSISTENCE (Section 7)
// =====================================================================
// Stores StrategyReport snapshots in localStorage keyed by team_signature
// so the Strategy tab paints instantly on team switch, with no flash.
// Implements Section 7 schema: { schema_version, reports: { <sig>: ... } }
// Section 11 explicitly defers IndexedDB to a later effort, so we use
// localStorage only for v1 - simpler and synchronous.
//
// Lifecycle (per Section 13.1 lifecycle 1 + 4):
//   page load: paint cached snapshot synchronously, then schedule rebuild
//   rebuild fires: compute new report, write snapshot, repaint
// ---------------------------------------------------------------------
var CS_PERSIST_KEY = 'champions_strategy_report_v1';
var CS_PERSIST_SCHEMA = 1;

// Read entire persistence store. Returns empty shape on first run or parse error.
function _csPersistRead() {
  try {
    var parsed = (typeof Storage !== 'undefined') ? Storage.get(CS_PERSIST_KEY) : null;
    if (!parsed) return { schema_version: CS_PERSIST_SCHEMA, reports: {} };
    if (!parsed || parsed.schema_version !== CS_PERSIST_SCHEMA) {
      // Future: migrate. For v1 just reset on schema mismatch.
      return { schema_version: CS_PERSIST_SCHEMA, reports: {} };
    }
    if (!parsed.reports) parsed.reports = {};
    return parsed;
  } catch (e) {
    UILog.warn('persistence read failed', e);
    return { schema_version: CS_PERSIST_SCHEMA, reports: {} };
  }
}

// Write store. Catches QuotaExceededError - if hit, drops oldest reports first.
function _csPersistWrite(store) {
  try {
    if (typeof Storage !== 'undefined') Storage.set(CS_PERSIST_KEY, store);
    return true;
  } catch (e) {
    if (e && /Quota/i.test(e.name || e.message || '')) {
      var sigs = Object.keys(store.reports || {});
      // Sort by last_built_at ascending and drop oldest 25 percent
      sigs.sort(function(a, b){
        return (store.reports[a].last_built_at || '').localeCompare(store.reports[b].last_built_at || '');
      });
      var drop = Math.max(1, Math.floor(sigs.length * 0.25));
      sigs.slice(0, drop).forEach(function(s){ delete store.reports[s]; });
      try {
        if (typeof Storage !== 'undefined') Storage.set(CS_PERSIST_KEY, store);
        return true;
      } catch (e2) { UILog.warn('still over quota after purge', e2); }
    } else {
      UILog.warn('persistence write failed', e);
    }
    return false;
  }
}

// Save a StrategyReport. Splits into theory_report + simulation_overlay
// per Section 7 so we never overwrite theory notes with sim notes.
function csSaveReport(teamKey, report) {
  if (!report || !report.team_signature) return false;
  var store = _csPersistRead();
  var sig = report.team_signature;
  var existing = store.reports[sig] || {};
  var sample = report.sim_data_version || 0;

  // Theory part - everything except trend_analysis (which is sim-derived)
  var theory = {};
  Object.keys(report).forEach(function(k){
    if (k !== 'trend_analysis') theory[k] = report[k];
  });

  // Simulation overlay - only populated if we actually have sim data
  var overlay = existing.simulation_overlay || null;
  if (sample > 0) {
    overlay = {
      sample_size: sample,
      trend_analysis: report.trend_analysis,
      lead_win_rates: {},
      matchup_win_rates: {},
      loss_causes: [],
      first_ko_turns: []
    };
    // Pull lead WRs out of the report's lead_guide if available
    (report.lead_guide && report.lead_guide.recommendations || []).forEach(function(r){
      if (r.win_rate !== null && r.lead && r.lead.length) {
        var k = r.lead.slice().sort().join('+');
        overlay.lead_win_rates[k] = r.win_rate;
      }
    });
  }

  store.reports[sig] = {
    team_key: teamKey,
    theory_report: theory,
    simulation_overlay: overlay,
    last_built_at: new Date().toISOString(),
    last_simmed_at: sample > 0 ? new Date().toISOString() : (existing.last_simmed_at || null)
  };
  return _csPersistWrite(store);
}

// Load a saved report by team_signature. Merges theory_report + overlay
// per Section 7 (overlay overrides trend_analysis, never theory fields).
// Returns null if not found.
function csLoadReport(teamKey) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return null;
  var sig = teamSignature(team);
  var store = _csPersistRead();
  var entry = store.reports[sig];
  if (!entry || !entry.theory_report) return null;
  var merged = {};
  Object.keys(entry.theory_report).forEach(function(k){ merged[k] = entry.theory_report[k]; });
  if (entry.simulation_overlay && entry.simulation_overlay.trend_analysis) {
    merged.trend_analysis = entry.simulation_overlay.trend_analysis;
    merged.sim_data_version = entry.simulation_overlay.sample_size;
  } else {
    // No saved sim data - provide the same no-data placeholder the builder
    // emits, so renderStrategyTab's `ta.has_data` access never trips on null.
    merged.trend_analysis = entry.theory_report.trend_analysis || {
      has_data: false,
      message_if_no_data: 'No simulations recorded yet for this team. Run All Matchups to populate trend data.',
      best_lead: null,
      worst_lead: null,
      most_common_loss_cause: null,
      avg_first_ko_turn: null,
      dead_moves: [],
      failed_matchups: []
    };
  }
  merged._cached = true;
  merged._cached_at = entry.last_built_at;
  return merged;
}

// Load every saved report - useful for cross-team rollups (Phase 4 / #55).
function csLoadAllReports() {
  return _csPersistRead().reports || {};
}

// Drop a single team's cached report. No-op if absent.
function csClearReport(teamKey) {
  var team = (typeof TEAMS !== 'undefined' && TEAMS[teamKey]) ? TEAMS[teamKey] : null;
  if (!team) return false;
  var sig = teamSignature(team);
  var store = _csPersistRead();
  if (!store.reports[sig]) return false;
  delete store.reports[sig];
  return _csPersistWrite(store);
}

// Drop everything. Used by tests + a possible debug button later.
function csClearAllReports() {
  return _csPersistWrite({ schema_version: CS_PERSIST_SCHEMA, reports: {} });
}

// =========================================================================
// Phase 4a (Refs #52) — Sim Log: raw append-only history of series results.
// Lives in its own storage key (champions_sim_log_v1) so it can evolve
// independently from the Phase 3 strategy snapshot store.
//
// Why separate key:
//  - Strategy reports are COMPUTED / snapshot data (re-derivable)
//  - Sim log is RAW event history (source of truth for Phase 4 analytics)
//
// Caps:
//  - 500 entries total (LRU evict oldest)
//  - 100 entries per (playerKey, oppKey) pair (prevents one heavy matchup
//    from crowding others out)
//
// QuotaExceededError fallback: purge oldest 25%, retry once. Mirrors
// Phase 3's recovery pattern.
// =========================================================================
var CS_SIMLOG_KEY = 'champions_sim_log_v1';
var CS_SIMLOG_SCHEMA = 1;
var CS_SIMLOG_MAX_TOTAL = 500;
var CS_SIMLOG_MAX_PER_PAIR = 100;

function _csSimLogRead() {
  try {
    var parsed = (typeof Storage !== 'undefined') ? Storage.get(CS_SIMLOG_KEY) : null;
    if (!parsed) return { schema_version: CS_SIMLOG_SCHEMA, entries: [] };
    if (!parsed || parsed.schema_version !== CS_SIMLOG_SCHEMA) {
      return { schema_version: CS_SIMLOG_SCHEMA, entries: [] };
    }
    if (!Array.isArray(parsed.entries)) parsed.entries = [];
    return parsed;
  } catch (e) {
    UILog.warn('simlog read failed; resetting', e);
    return { schema_version: CS_SIMLOG_SCHEMA, entries: [] };
  }
}

function _csSimLogWrite(store) {
  try {
    if (typeof Storage !== 'undefined') Storage.set(CS_SIMLOG_KEY, store);
    return true;
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      // Purge oldest 25% and retry once.
      try {
        var cut = Math.floor(store.entries.length * 0.25);
        if (cut > 0) store.entries = store.entries.slice(cut);
        if (typeof Storage !== 'undefined') Storage.set(CS_SIMLOG_KEY, store);
        UILog.warn('simlog purged oldest entries after quota error', { percent: 25 });
        return true;
      } catch (e2) {
        UILog.error('simlog write failed even after purge', e2);
        return false;
      }
    }
    UILog.warn('simlog write failed', e);
    return false;
  }
}

function csShouldBootstrapSimulatorBoard() {
  try {
    var resultsSection = document.getElementById('results-section');
    if (resultsSection && resultsSection.style.display !== 'none') return false;
    if (typeof Storage === 'undefined') return true;
    var simlog = Storage.get(CS_SIMLOG_KEY);
    if (simlog && Array.isArray(simlog.entries) && simlog.entries.length) return false;
    return true;
  } catch (e) {
    UILog.warn('bootstrap sim-board check failed', e);
    return false;
  }
}

async function csBootstrapSimulatorBoard() {
  if (simRunning) return false;
  if (!csShouldBootstrapSimulatorBoard()) return false;
  var simCtx = null;
  try { simCtx = resolveSimContext({ bo: currentBo }); } catch (_ctxErr) { return false; }
  var oppKey = simCtx.oppKey;
  var playerKey = simCtx.playerKey;
  simRunning = true;
  try {
    var res = await runBoSeries(1, playerKey, oppKey, currentBo, function(){});
    displayResults(res, oppKey, simCtx);
    return true;
  } catch (e) {
    UILog.warn('sim-board bootstrap skipped', e);
    return false;
  } finally {
    simRunning = false;
  }
}

// Shape a single simulateBattle result into the compact sim-log game form.
// Keeps the essentials (result/turns/leads/bring/survivors/winCondition
// /TR+TW turns/koEvents). Drops the big "log" string array — not needed
// for analytics and blows up storage.
function _csGameFromBattle(battle) {
  if (!battle) return null;
  // Phase 4b: extract only the player-side movesUsed (we don't audit opp policy)
  // and only the player-side Protect streak peaks. Keeps simlog small.
  var playerMovesUsed = (battle.movesUsed && battle.movesUsed.player) ? battle.movesUsed.player : {};
  var playerProtectStreakMax = {};
  if (battle.protectStreakMax && typeof battle.protectStreakMax === 'object') {
    Object.keys(battle.protectStreakMax).forEach(function(k){
      if (k.indexOf('player:') === 0) {
        playerProtectStreakMax[k.slice(7)] = battle.protectStreakMax[k];
      }
    });
  }
  return {
    result: battle.result || null,
    turns: battle.turns || 0,
    leads: battle.leads || { player: [], opponent: [] },
    bring: battle.bring || { player: [], opponent: [] },
    playerSurvivors: (typeof battle.playerSurvivors === 'number') ? battle.playerSurvivors : null,
    oppSurvivors:    (typeof battle.oppSurvivors === 'number')    ? battle.oppSurvivors    : null,
    winCondition: battle.winCondition || null,
    trTurns: battle.trTurns || 0,
    twTurns: battle.twTurns || 0,
    koEvents: Array.isArray(battle.koEvents) ? battle.koEvents : [],
    // Phase 4b additions (player-side only).
    movesUsed: playerMovesUsed,
    protectStreakMax: playerProtectStreakMax
  };
}

// Apply the 100-per-pair cap to `entries` (newest kept).
function _csSimLogCapPerPair(entries) {
  var buckets = {};
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var key = (e.playerKey || '?') + '::' + (e.oppKey || '?');
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(i);
  }
  var drop = {};
  Object.keys(buckets).forEach(function(k){
    var idxs = buckets[k];
    if (idxs.length > CS_SIMLOG_MAX_PER_PAIR) {
      // entries are append-ordered so lowest indices = oldest. Drop oldest.
      var overflow = idxs.length - CS_SIMLOG_MAX_PER_PAIR;
      for (var j = 0; j < overflow; j++) drop[idxs[j]] = true;
    }
  });
  return entries.filter(function(_, i){ return !drop[i]; });
}

// Append a series entry.
//   playerKey, oppKey: TEAMS keys
//   format: 'doubles' | 'singles'
//   bo: 1/3/5
//   battleResults: array of simulateBattle return objects from the series
//   seriesResult: 'win' | 'loss' | 'draw' (series-level outcome)
function csSimLogAppendSeries(opts) {
  try {
    if (!opts || !opts.playerKey || !opts.oppKey) return false;
    var battles = Array.isArray(opts.battleResults) ? opts.battleResults : [];
    var entry = {
      id: 'sim_' + Date.now() + '_' + Math.floor(Math.random() * 1e6).toString(36),
      ts: Date.now(),
      playerKey: opts.playerKey,
      oppKey:    opts.oppKey,
      format:    opts.format || 'doubles',
      bo:        opts.bo || 1,
      games:     battles.map(_csGameFromBattle).filter(Boolean),
      seriesResult: opts.seriesResult || null
    };
    var store = _csSimLogRead();
    store.entries.push(entry);
    // Apply per-pair cap first (usually the tighter of the two).
    store.entries = _csSimLogCapPerPair(store.entries);
    // Then the total cap.
    if (store.entries.length > CS_SIMLOG_MAX_TOTAL) {
      store.entries = store.entries.slice(store.entries.length - CS_SIMLOG_MAX_TOTAL);
    }
    var ok = _csSimLogWrite(store);
    // Phase 4b: bust the team_history cache for this team so the next
    // Strategy tab render reflects the fresh data.
    try { if (typeof csInvalidateTeamHistory === 'function') csInvalidateTeamHistory(opts.playerKey); } catch (_e) {}
    return ok;
  } catch (e) {
    UILog.warn('simlog append failed', e);
    return false;
  }
}

// Read helpers for Phase 4b/c/d.
function csSimLogGetAll() { return _csSimLogRead().entries.slice(); }
function csSimLogForTeam(teamKey) {
  return _csSimLogRead().entries.filter(function(e){ return e.playerKey === teamKey; });
}
// Refs #95 - return every entry that involves teamKey on EITHER side, normalized
// to teamKey's point-of-view. Entries where teamKey was the opponent are returned
// with seriesResult + per-game result fields flipped (win<->loss, draw unchanged)
// and playerKey/oppKey swapped so downstream code can treat them uniformly. This
// is what the Record bar and team_history consume so a team that was only simmed
// as an opponent still populates its Strategy view (user request: "data should
// pull in showing win loss against each category of teams").
function _flipResult(r) {
  return r === 'win' ? 'loss' : r === 'loss' ? 'win' : r;
}
function csSimLogForTeamBothSides(teamKey) {
  var all = _csSimLogRead().entries;
  var out = [];
  for (var i = 0; i < all.length; i++) {
    var e = all[i];
    if (e.playerKey === teamKey) {
      // Shallow copy - downstream iterates games, so keep games refs.
      out.push(e);
    } else if (e.oppKey === teamKey) {
      var flippedGames = (e.games || []).map(function(g){
        var ng = {};
        for (var k in g) if (Object.prototype.hasOwnProperty.call(g, k)) ng[k] = g[k];
        ng.result = _flipResult(g.result);
        return ng;
      });
      out.push({
        ts: e.ts,
        playerKey: teamKey,       // normalize to viewer POV
        oppKey:    e.playerKey,   // the ORIGINAL player is the opponent we faced
        format:    e.format,
        bo:        e.bo,
        games:     flippedGames,
        seriesResult: _flipResult(e.seriesResult),
        _mirrored: true
      });
    }
  }
  return out;
}
function csSimLogForMatchup(playerKey, oppKey) {
  return _csSimLogRead().entries.filter(function(e){
    return e.playerKey === playerKey && e.oppKey === oppKey;
  });
}
function csSimLogClearTeam(teamKey) {
  var store = _csSimLogRead();
  store.entries = store.entries.filter(function(e){ return e.playerKey !== teamKey; });
  return _csSimLogWrite(store);
}
function csSimLogClearAll() {
  return _csSimLogWrite({ schema_version: CS_SIMLOG_SCHEMA, entries: [] });
}

// Expose through ChampionsSim; legacy aliases are retained for console/debug.
if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.simLog.appendSeries = csSimLogAppendSeries;
  ChampionsSim.simLog.getAll = csSimLogGetAll;
  ChampionsSim.simLog.forTeam = csSimLogForTeam;
  ChampionsSim.simLog.forTeamBothSides = csSimLogForTeamBothSides;
  ChampionsSim.simLog.forMatchup = csSimLogForMatchup;
  ChampionsSim.simLog.clearTeam = csSimLogClearTeam;
  ChampionsSim.simLog.clearAll = csSimLogClearAll;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogAppendSeries', csSimLogAppendSeries);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogGetAll', csSimLogGetAll);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogForTeam', csSimLogForTeam);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogForTeamBothSides', csSimLogForTeamBothSides);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogForMatchup', csSimLogForMatchup);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogClearTeam', csSimLogClearTeam);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSimLogClearAll', csSimLogClearAll);

// =========================================================================
// Phase 4b (Refs #52) — team_history: adaptive state machine driver.
//
// Computes per-team stats on demand from the sim log. Drives the State 1/2/3
// banner at the top of the Strategy tab and feeds detectors in Phase 4c/d/e.
//
// State thresholds (per spec):
//   State 1 (No Data)    : total_battles === 0
//   State 2 (Early Sims) : 1..14
//   State 3 (Mature)     : >=15
//
// Cached per team with 500 ms TTL so the Strategy tab doesn't recompute on
// every re-render (rebuilds happen on team switch + after every series).
// =========================================================================
var _csHistoryCache = {};  // teamKey -> { ts, history }
var CS_HISTORY_TTL_MS = 500;
var CS_STATE_MATURE_THRESHOLD = 15;

// =========================================================================
// Phase 4c (Refs PHASE4C_DETECTORS_SPEC.md) - Detectors + confidence badges.
//
// Four pure functions that read flat sim-log games and emit structured
// findings. Plus a single confidence-tier assigner used everywhere a rate
// gets surfaced. All thresholds are constants below; do not inline magic
// numbers downstream.
//
// Hard invariants enforced here (see MASTER_PROMPT.md):
//   - 'no draws' on the Pokemon side: draws are excluded from win/loss math.
//   - 'same advice after 100 battles = failing': covered by Fixture C in
//     tests/phase4c_detectors.js.
//   - 'no fake-confident claims': effect-size guard in csConfidenceBadge.
// =========================================================================
var CS_PHASE4C = {
  DEAD_MOVE_THRESHOLD:   0.15,  // avg calls per game (less than ~1 in ~7)
  DEAD_MOVE_MIN_GAMES:   10,
  DEAD_MOVE_HIGH_AVG:    0.05,
  DEAD_MOVE_HIGH_GAMES:  25,
  DEAD_MOVE_MED_AVG:     0.10,
  DEAD_MOVE_MED_GAMES:   15,
  LEAD_MIN_GAMES:        5,
  LEAD_DISPLAY_TOP:      6,
  LOSS_LIFT_THRESHOLD:   0.20,
  LOSS_FREQ_THRESHOLD:   0.30,
  LOSS_MIN_GAMES:        15,
  CONF_LOW_MIN:          5,    // n >= 5 -> at least 'low'
  CONF_MED_MIN:          15,   // n >= 15 -> 'med' (matches CS_STATE_MATURE_THRESHOLD)
  CONF_HIGH_MIN:         50,   // n >= 50 -> 'high'
  EFFECT_SIZE_Z:         1.96  // two-sided 95% CI
};

var CS_LEAD_PAIR_TABLE_SORT = 'wr_desc';

// csConfidenceBadge(n, winRate?) -> { tier, reason }
//
// tier in {'none','low','med','high','inconclusive'}.
// 'inconclusive' fires only when winRate is supplied AND n is large enough
// for the effect-size guard to apply (n >= CONF_HIGH_MIN). A 200-game lead
// at 51% win rate is statistically a coin flip, so we surface that fact
// instead of pretending it's high-confidence.
function csConfidenceBadge(n, winRate) {
  n = Math.max(0, n | 0);
  var tier, reason;
  if (n < CS_PHASE4C.CONF_LOW_MIN)        tier = 'none';
  else if (n < CS_PHASE4C.CONF_MED_MIN)   tier = 'low';
  else if (n < CS_PHASE4C.CONF_HIGH_MIN)  tier = 'med';
  else                                    tier = 'high';

  // Effect-size guard: only meaningful at high-n with a rate to test.
  if (typeof winRate === 'number' && isFinite(winRate) && n >= CS_PHASE4C.CONF_HIGH_MIN) {
    // z = (p - 0.5) / sqrt(0.25 / n)
    var se = Math.sqrt(0.25 / n);
    var z  = (winRate - 0.5) / se;
    var az = Math.abs(z);
    if (az < CS_PHASE4C.EFFECT_SIZE_Z) {
      tier   = 'inconclusive';
      reason = 'large sample, no detectable edge (|z|=' + az.toFixed(2) + ')';
      return { tier: tier, reason: reason, z: z };
    }
    reason = 'n=' + n + ', winRate=' + Math.round(winRate * 100) + '% (|z|=' + az.toFixed(2) + ')';
    return { tier: tier, reason: reason, z: z };
  }
  reason = (typeof winRate === 'number' && isFinite(winRate))
    ? 'n=' + n + ', winRate=' + Math.round(winRate * 100) + '%'
    : 'n=' + n;
  return { tier: tier, reason: reason };
}

// csDetectDeadMoves(games, teamKey) -> array
//
// games is the flat array of per-game objects extracted from the sim log
// (same shape consumed elsewhere in computeTeamHistory). Walks each owner's
// declared movepool from TEAMS[teamKey] and flags moves whose average call
// rate per game is below threshold. Count=0 moves are flagged at 'low'
// severity once n >= DEAD_MOVE_HIGH_GAMES so users see them but don't get
// flooded by stub data.
function csDetectDeadMoves(games, teamKey) {
  var out = [];
  if (!Array.isArray(games) || !games.length) return out;
  if (typeof TEAMS === 'undefined' || !TEAMS[teamKey]) return out;
  var totalGames = games.length;
  if (totalGames < CS_PHASE4C.DEAD_MOVE_MIN_GAMES) return out;

  var members = TEAMS[teamKey].members || [];
  // Aggregate calls per (mon, move).
  var usage = {};
  games.forEach(function(g){
    var mu = g.movesUsed || {};
    Object.keys(mu).forEach(function(mon){
      if (!usage[mon]) usage[mon] = {};
      var moves = mu[mon] || {};
      Object.keys(moves).forEach(function(mv){
        usage[mon][mv] = (usage[mon][mv] || 0) + (moves[mv] | 0);
      });
    });
  });

  members.forEach(function(m){
    var owner = m && m.name;
    if (!owner) return;
    var pool = (m.moves || []).slice();
    pool.forEach(function(mv){
      var calls = (usage[owner] && usage[owner][mv]) || 0;
      var avg = calls / totalGames;
      // count=0 special case (Q2 locked decision): always flag if n >= HIGH_GAMES.
      if (calls === 0) {
        if (totalGames >= CS_PHASE4C.DEAD_MOVE_HIGH_GAMES) {
          out.push({
            pokemon: owner, move: mv,
            avg_calls_per_game: 0, total_games: totalGames, calls: 0,
            severity: 'low',
            reason: 'AI never selected this move - check synergy or replace',
            confidence: csConfidenceBadge(totalGames).tier
          });
        }
        return;
      }
      if (avg >= CS_PHASE4C.DEAD_MOVE_THRESHOLD) return;
      var sev = 'low';
      if (avg < CS_PHASE4C.DEAD_MOVE_HIGH_AVG && totalGames >= CS_PHASE4C.DEAD_MOVE_HIGH_GAMES)      sev = 'high';
      else if (avg < CS_PHASE4C.DEAD_MOVE_MED_AVG  && totalGames >= CS_PHASE4C.DEAD_MOVE_MED_GAMES)  sev = 'medium';
      out.push({
        pokemon: owner, move: mv,
        avg_calls_per_game: avg, total_games: totalGames, calls: calls,
        severity: sev,
        reason: 'Below dead-move threshold across sampled games',
        confidence: csConfidenceBadge(totalGames).tier
      });
    });
  });
  // Highest severity first, then lowest avg.
  var sevRank = { high: 3, medium: 2, low: 1 };
  out.sort(function(a, b){
    var sa = sevRank[a.severity] || 0;
    var sb = sevRank[b.severity] || 0;
    if (sa !== sb) return sb - sa;
    return a.avg_calls_per_game - b.avg_calls_per_game;
  });
  return out;
}

// csComputeLeadPerformance(games) -> array
//
// Per-lead-pair W/L from the player POV. Draws are excluded entirely (not
// surfaced anywhere - hard invariant). Filters n < LEAD_MIN_GAMES, sorts
// by n desc then win_rate desc, caps at LEAD_DISPLAY_TOP.
function csComputeLeadPerformance(games) {
  if (!Array.isArray(games) || !games.length) return [];
  var byLead = {};
  games.forEach(function(g){
    var lp = (g.leads && Array.isArray(g.leads.player)) ? g.leads.player.slice() : null;
    if (!lp || !lp.length) return;
    lp.sort();
    var key = lp.join('|');
    if (!byLead[key]) byLead[key] = { lead: lp.slice(), n: 0, w: 0, l: 0 };
    if (g.result === 'win')       { byLead[key].n++; byLead[key].w++; }
    else if (g.result === 'loss') { byLead[key].n++; byLead[key].l++; }
    // draws excluded
  });
  var rows = Object.keys(byLead).map(function(k){
    var b = byLead[k];
    var wr = b.n > 0 ? b.w / b.n : 0;
    var conf = csConfidenceBadge(b.n, wr);
    return {
      lead: b.lead, n: b.n, w: b.w, l: b.l,
      win_rate: wr,
      confidence: conf.tier,
      confidence_reason: conf.reason
    };
  }).filter(function(r){ return r.n >= CS_PHASE4C.LEAD_MIN_GAMES; });
  rows.sort(function(a, b){
    if (b.n !== a.n) return b.n - a.n;
    return b.win_rate - a.win_rate;
  });
  return rows.slice(0, CS_PHASE4C.LEAD_DISPLAY_TOP);
}

function csBuildLeadPairTable(games, teamKey) {
  var out = [];
  if (!Array.isArray(games) || !games.length) return out;

  var byPair = {};
  games.forEach(function(g){
    var lead = (g.leads && Array.isArray(g.leads.player)) ? g.leads.player.slice().sort() : [];
    if (!lead.length) return;
    var oppKey = g.oppKey || 'unknown';
    var key = oppKey + '::' + lead.join(' + ');
    if (!byPair[key]) {
      byPair[key] = {
        matchup_key: oppKey,
        matchup_name: (typeof TEAMS !== 'undefined' && TEAMS[oppKey] && TEAMS[oppKey].name) ? TEAMS[oppKey].name : oppKey,
        lead: lead.slice(),
        n: 0, w: 0, l: 0
      };
    }
    if (g.result === 'win') {
      byPair[key].n++; byPair[key].w++;
    } else if (g.result === 'loss') {
      byPair[key].n++; byPair[key].l++;
    }
  });

  out = Object.keys(byPair).map(function(k) {
    var row = byPair[k];
    var wr = row.n > 0 ? row.w / row.n : 0;
    var conf = csConfidenceBadge(row.n, wr);
    return {
      matchup_key: row.matchup_key,
      matchup_name: row.matchup_name,
      lead: row.lead,
      lead_label: row.lead.join(' + '),
      n: row.n,
      w: row.w,
      l: row.l,
      win_rate: wr,
      confidence: conf.tier,
      confidence_reason: conf.reason
    };
  }).filter(function(r){ return r.n >= CS_PHASE4C.LEAD_MIN_GAMES; });

  return out;
}

function csSortLeadPairTable(rows, sortKey) {
  var arr = Array.isArray(rows) ? rows.slice() : [];
  var mode = sortKey || CS_LEAD_PAIR_TABLE_SORT;
  arr.sort(function(a, b) {
    if (mode === 'sample_desc') {
      if ((b.n || 0) !== (a.n || 0)) return (b.n || 0) - (a.n || 0);
      if ((b.win_rate || 0) !== (a.win_rate || 0)) return (b.win_rate || 0) - (a.win_rate || 0);
      return (a.matchup_name || '').localeCompare(b.matchup_name || '');
    }
    if (mode === 'matchup_asc') {
      var mm = (a.matchup_name || '').localeCompare(b.matchup_name || '');
      if (mm !== 0) return mm;
      if ((b.win_rate || 0) !== (a.win_rate || 0)) return (b.win_rate || 0) - (a.win_rate || 0);
      return (b.n || 0) - (a.n || 0);
    }
    if (mode === 'lead_asc') {
      var ll = (a.lead_label || '').localeCompare(b.lead_label || '');
      if (ll !== 0) return ll;
      if ((b.win_rate || 0) !== (a.win_rate || 0)) return (b.win_rate || 0) - (a.win_rate || 0);
      return (b.n || 0) - (a.n || 0);
    }
    if ((b.win_rate || 0) !== (a.win_rate || 0)) return (b.win_rate || 0) - (a.win_rate || 0);
    if ((b.n || 0) !== (a.n || 0)) return (b.n || 0) - (a.n || 0);
    return (a.matchup_name || '').localeCompare(b.matchup_name || '');
  });
  return arr;
}

function csSetLeadPairTableSort(sortKey, teamKey) {
  CS_LEAD_PAIR_TABLE_SORT = sortKey || 'wr_desc';
  if (typeof renderStrategyTab === 'function') {
    renderStrategyTab(teamKey || (typeof currentPlayerKey !== 'undefined' ? currentPlayerKey : 'player'));
  }
}

function csWireLeadPairTableSort(host, teamKey) {
  if (!host) return;
  var buttons = host.querySelectorAll('[data-cs-lead-sort]');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function(ev) {
      ev.preventDefault();
      csSetLeadPairTableSort(this.getAttribute('data-cs-lead-sort'), teamKey);
    });
  }
}

// csDetectLossConditions(games, teamKey) -> array
//
// Surfaces conditions that show up disproportionately in losses. Lift =
// loss_freq - win_freq. Hides flags below LIFT/FREQ thresholds; surfaces
// inconclusive when the sample is large but signal is weak (epistemic
// honesty rule from spec section 3.4.1).
function csDetectLossConditions(games, teamKey) {
  var out = [];
  if (!Array.isArray(games) || !games.length) return out;
  // Partition once.
  var wins = [], losses = [];
  games.forEach(function(g){
    if (g.result === 'win')       wins.push(g);
    else if (g.result === 'loss') losses.push(g);
  });
  var nW = wins.length, nL = losses.length, nTotal = nW + nL;
  if (nTotal < CS_PHASE4C.LOSS_MIN_GAMES) return out;

  // Pull archetype label so we can fire the 'slow_no_tr' check.
  var archetype = null;
  try {
    if (typeof TEAMS !== 'undefined' && TEAMS[teamKey] && typeof inferPlaystyle === 'function') {
      archetype = inferPlaystyle(TEAMS[teamKey].members || []) || null;
    }
  } catch (_e) { archetype = null; }

  // Pull TEAM_META win-condition mon if present.
  var winConMon = null;
  try {
    if (typeof TEAM_META !== 'undefined' && TEAM_META[teamKey] && typeof TEAM_META[teamKey].guide === 'string') {
      var m = TEAM_META[teamKey].guide.match(/WIN CONDITIONS?:[^\n]*?([A-Z][a-z]+(?:-[A-Za-z]+)?)/);
      if (m) winConMon = m[1];
    }
  } catch (_e) { winConMon = null; }

  function teamUsedTrickRoom(g) {
    var mu = g.movesUsed || {};
    var owners = Object.keys(mu);
    for (var i = 0; i < owners.length; i++) {
      if ((mu[owners[i]] || {})['Trick Room']) return true;
    }
    return false;
  }
  function maxProtectStreak(g) {
    var ps = g.protectStreakMax || {};
    var keys = Object.keys(ps);
    var max = 0;
    for (var i = 0; i < keys.length; i++) if (ps[keys[i]] > max) max = ps[keys[i]];
    return max;
  }
  function earlyDoubleKO(g) {
    var kos = (g.koEvents || []).filter(function(k){ return k.side === 'player' && (k.turn || 0) < 4; });
    return kos.length >= 2;
  }
  function winConLostEarly(g) {
    if (!winConMon) return false;
    var kos = (g.koEvents || []).filter(function(k){
      return k.side === 'player' && k.victim === winConMon && (k.turn || 0) < 5;
    });
    return kos.length >= 1;
  }
  function twExpiredLoss(g) {
    if (!g || (g.twTurns || 0) <= 0) return false;
    // Heuristic: TW was active and the game ended within a couple of turns.
    // Sim log keeps cumulative TW turns + total turns; if they nearly match
    // (within 2), treat as 'collapsed when TW dropped'.
    return (g.turns || 0) - (g.twTurns || 0) <= 2;
  }

  var defs = [
    { id: 'tr_unanswered',
      desc: 'Opponent set Trick Room and we never answered with our own',
      test: function(g){ return (g.trTurns || 0) >= 4 && !teamUsedTrickRoom(g); } },
    { id: 'tw_expired_loss',
      desc: 'We collapsed the turn opponent\'s Tailwind expired',
      test: twExpiredLoss },
    { id: 'early_double_ko',
      desc: 'Two of our mons KO\'d before turn 4',
      test: earlyDoubleKO },
    { id: 'protect_overuse_loss',
      desc: 'One of our mons used Protect 3+ turns in a row',
      test: function(g){ return maxProtectStreak(g) >= 3; } },
    { id: 'wincon_lost_early',
      desc: 'Win-condition mon KO\'d before turn 5',
      test: winConLostEarly },
    { id: 'slow_no_tr',
      desc: 'Trick Room team never set Trick Room',
      test: function(g){ return archetype === 'Trick Room Offense' && !teamUsedTrickRoom(g); } }
  ];

  defs.forEach(function(d){
    var lossHit = 0, winHit = 0;
    losses.forEach(function(g){ if (d.test(g)) lossHit++; });
    wins.forEach(function(g){   if (d.test(g)) winHit++; });
    var lossFreq = nL > 0 ? lossHit / nL : 0;
    var winFreq  = nW > 0 ? winHit  / nW : 0;
    var lift = lossFreq - winFreq;
    var sev = (lift >= 0.30) ? 'high' : (lift >= 0.20) ? 'medium' : 'low';
    var hits = lossHit + winHit;
    var conf = csConfidenceBadge(hits);
    var passes = (lift >= CS_PHASE4C.LOSS_LIFT_THRESHOLD) && (lossFreq >= CS_PHASE4C.LOSS_FREQ_THRESHOLD);
    if (passes) {
      out.push({
        condition: d.id, description: d.desc,
        loss_freq: lossFreq, win_freq: winFreq, lift: lift,
        severity: sev, sample_size: hits, total_losses: nL,
        confidence: conf.tier, confidence_reason: conf.reason
      });
      return;
    }
    // Epistemic honesty: large sample with no detectable signal -> surface
    // as inconclusive rather than silently dropping. Only when the team
    // sample is mature AND this condition occurred at least once.
    if (nTotal >= CS_PHASE4C.CONF_HIGH_MIN && hits >= 5 && lossHit >= 1) {
      out.push({
        condition: d.id, description: d.desc,
        loss_freq: lossFreq, win_freq: winFreq, lift: lift,
        severity: 'low', sample_size: hits, total_losses: nL,
        confidence: 'inconclusive',
        confidence_reason: 'no detectable lift over win baseline (lift=' + lift.toFixed(2) + ')'
      });
    }
  });
  // Sort: severity high -> low, then lift desc.
  var sevRank = { high: 3, medium: 2, low: 1 };
  out.sort(function(a, b){
    var sa = sevRank[a.severity] || 0;
    var sb = sevRank[b.severity] || 0;
    if (sa !== sb) return sb - sa;
    return b.lift - a.lift;
  });
  return out;
}

// Expose for tests + debug console.
if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.phase4c.csConfidenceBadge = csConfidenceBadge;
  ChampionsSim.phase4c.csDetectDeadMoves = csDetectDeadMoves;
  ChampionsSim.phase4c.csComputeLeadPerformance = csComputeLeadPerformance;
  ChampionsSim.phase4c.csBuildLeadPairTable = csBuildLeadPairTable;
  ChampionsSim.phase4c.csSortLeadPairTable = csSortLeadPairTable;
  ChampionsSim.phase4c.csSetLeadPairTableSort = csSetLeadPairTableSort;
  ChampionsSim.phase4c.csWireLeadPairTableSort = csWireLeadPairTableSort;
  ChampionsSim.phase4c.csDetectLossConditions = csDetectLossConditions;
  ChampionsSim.phase4c.CS_PHASE4C = CS_PHASE4C;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csConfidenceBadge', csConfidenceBadge);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csDetectDeadMoves', csDetectDeadMoves);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csComputeLeadPerformance', csComputeLeadPerformance);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildLeadPairTable', csBuildLeadPairTable);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSortLeadPairTable', csSortLeadPairTable);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csSetLeadPairTableSort', csSetLeadPairTableSort);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csWireLeadPairTableSort', csWireLeadPairTableSort);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csDetectLossConditions', csDetectLossConditions);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('CS_PHASE4C', CS_PHASE4C);

function computeTeamHistory(teamKey) {
  if (!teamKey) return null;
  // Cache hit?
  var cached = _csHistoryCache[teamKey];
  if (cached && (Date.now() - cached.ts) < CS_HISTORY_TTL_MS) {
    return cached.history;
  }
  // Refs #95 - Use both-sides view so teams that were only simmed as the
  // opponent still get a populated Record bar and state machine (results are
  // mirrored to teamKey's POV). Previously this used csSimLogForTeam which
  // only returned entries where teamKey was the pilot, which is why a team
  // you'd simmed against but never piloted showed "no games yet".
  var entries = (typeof csSimLogForTeamBothSides === 'function')
    ? csSimLogForTeamBothSides(teamKey)
    : ((typeof csSimLogForTeam === 'function') ? csSimLogForTeam(teamKey) : []);
  var games = [];
  entries.forEach(function(e){ if (e.games) games = games.concat(e.games); });

  var total_battles = games.length;
  var total_series  = entries.length;

  // State
  var state = 1;
  if (total_battles >= CS_STATE_MATURE_THRESHOLD) state = 3;
  else if (total_battles >= 1) state = 2;

  // Win rates
  var wins = 0, losses = 0, draws = 0;
  games.forEach(function(g){
    if (g.result === 'win') wins++;
    else if (g.result === 'loss') losses++;
    else draws++;
  });
  var win_rate = total_battles > 0 ? wins / total_battles : 0;

  var seriesW = 0, seriesL = 0, seriesD = 0;
  entries.forEach(function(e){
    if (e.seriesResult === 'win') seriesW++;
    else if (e.seriesResult === 'loss') seriesL++;
    else seriesD++;
  });
  var series_win_rate = total_series > 0 ? seriesW / total_series : 0;

  // Consistency: variance of game outcomes (Bernoulli), spread across matchups,
  // and RNG dependency proxied by turn-count coefficient of variation.
  var outcomes = games.map(function(g){ return g.result === 'win' ? 1 : 0; });
  var variance = 0;
  if (outcomes.length > 1) {
    var mean = outcomes.reduce(function(a,b){return a+b;},0) / outcomes.length;
    variance = outcomes.reduce(function(a,b){return a+(b-mean)*(b-mean);},0) / outcomes.length;
  }
  // Matchup spread (need >=2 distinct opps with >=3 games each)
  var byOpp = {};
  entries.forEach(function(e){
    if (!byOpp[e.oppKey]) byOpp[e.oppKey] = { n: 0, w: 0 };
    (e.games || []).forEach(function(g){
      byOpp[e.oppKey].n++;
      if (g.result === 'win') byOpp[e.oppKey].w++;
    });
  });
  var wrs = Object.keys(byOpp).filter(function(k){ return byOpp[k].n >= 3; })
                              .map(function(k){ return byOpp[k].w / byOpp[k].n; });
  var spread_gap = wrs.length >= 2 ? (Math.max.apply(null, wrs) - Math.min.apply(null, wrs)) : 0;
  // RNG dependency: coefficient of variation of turn counts (higher = more swingy).
  var turns = games.map(function(g){ return g.turns || 0; }).filter(function(t){ return t > 0; });
  var rng_dependency = 0;
  if (turns.length >= 3) {
    var tMean = turns.reduce(function(a,b){return a+b;},0) / turns.length;
    var tVar  = turns.reduce(function(a,b){return a+(b-tMean)*(b-tMean);},0) / turns.length;
    rng_dependency = tMean > 0 ? Math.sqrt(tVar) / tMean : 0;
  }
  var consistency_label = 'consistent';
  if (total_battles < 5) {
    consistency_label = 'insufficient_data';
  } else if (variance >= 0.25 || spread_gap >= 0.40) {
    consistency_label = 'volatile';
  } else if (variance >= 0.15 || spread_gap >= 0.25 || rng_dependency >= 0.30) {
    consistency_label = 'inconsistent';
  }

  // Lead performance (Phase 4c will consume this; compute now so it's cached).
  var byLead = {};
  games.forEach(function(g){
    var lp = (g.leads && g.leads.player) ? g.leads.player.slice().sort().join(' / ') : '';
    if (!lp) return;
    if (!byLead[lp]) byLead[lp] = { n: 0, w: 0, turnsSum: 0 };
    byLead[lp].n++;
    byLead[lp].turnsSum += (g.turns || 0);
    if (g.result === 'win') byLead[lp].w++;
  });
  var lead_performance = Object.keys(byLead).map(function(pair){
    var b = byLead[pair];
    var wr = b.n > 0 ? b.w / b.n : 0;
    var verdict = 'ok';
    if (b.n >= 5) {
      if (wr >= (win_rate + 0.10)) verdict = 'strong';
      else if (wr <= (win_rate - 0.15)) verdict = 'weak';
    } else {
      verdict = 'insufficient';
    }
    return { leadPair: pair.split(' / '), n: b.n, wins: b.w, win_rate: wr,
             avg_turns: b.n > 0 ? b.turnsSum / b.n : 0, verdict: verdict };
  }).sort(function(a,b){ return b.n - a.n; });

  var lead_pair_table_v2 = [];
  try { lead_pair_table_v2 = csBuildLeadPairTable(games, teamKey); } catch (_e) { lead_pair_table_v2 = []; }

  // Matchup failures (win_rate < 0.35 at n>=3)
  var matchup_failures = Object.keys(byOpp).map(function(k){
    var b = byOpp[k];
    return { oppKey: k, n: b.n, win_rate: b.n > 0 ? b.w / b.n : 0 };
  }).filter(function(m){ return m.n >= 3 && m.win_rate < 0.35; })
    .sort(function(a,b){ return a.win_rate - b.win_rate; });

  // Common loss conditions (victim + by_turn buckets across losses).
  // Phase 4c consumes this; compute minimal shape now.
  var lossBuckets = {};
  var lossCount = 0;
  games.forEach(function(g){
    if (g.result !== 'loss') return;
    lossCount++;
    (g.koEvents || []).forEach(function(ko){
      if (ko.side !== 'player') return;
      var bucket = (ko.turn <= 2) ? 'T1-2' : (ko.turn <= 5) ? 'T3-5' : 'T6+';
      var key = ko.victim + '::' + bucket;
      lossBuckets[key] = (lossBuckets[key] || 0) + 1;
    });
  });
  var common_loss_conditions = Object.keys(lossBuckets).map(function(k){
    var parts = k.split('::');
    return { victim: parts[0], bucket: parts[1],
             seen_in_losses: lossBuckets[k], total_losses: lossCount,
             pct: lossCount > 0 ? lossBuckets[k] / lossCount : 0 };
  }).filter(function(p){ return p.pct >= 0.30 && p.seen_in_losses >= 2; })
    .sort(function(a,b){ return b.pct - a.pct; });

  // Dead moves: per owner, list moves that never fired across >=10 games.
  // Walk TEAMS to know what each mon's movepool is, cross-reference movesUsed.
  var dead_moves = [];
  if (total_battles >= 10 && typeof TEAMS !== 'undefined' && TEAMS[teamKey]) {
    var team = TEAMS[teamKey];
    var members = team.members || [];
    var usageByMon = {};
    games.forEach(function(g){
      Object.keys(g.movesUsed || {}).forEach(function(mon){
        if (!usageByMon[mon]) usageByMon[mon] = {};
        Object.keys(g.movesUsed[mon]).forEach(function(mv){
          usageByMon[mon][mv] = (usageByMon[mon][mv] || 0) + g.movesUsed[mon][mv];
        });
      });
    });
    members.forEach(function(m){
      var owner = m.name;
      var pool = m.moves || [];
      pool.forEach(function(mv){
        var used = (usageByMon[owner] && usageByMon[owner][mv]) || 0;
        if (used === 0) {
          dead_moves.push({ owner: owner, move: mv, games_sampled: total_battles, times_used: 0 });
        }
      });
    });
  }

  // Protect streak peaks (Phase 4e policy audit). Keep top 3.
  var protectPeaks = {};
  games.forEach(function(g){
    Object.keys(g.protectStreakMax || {}).forEach(function(mon){
      protectPeaks[mon] = Math.max(protectPeaks[mon] || 0, g.protectStreakMax[mon]);
    });
  });

  // Record by opponent archetype. Classifies each opponent team via the same
  // inferPlaystyle() heuristic used on the player side, then tallies W/L at
  // the game level. Pokemon has no real "draw" in the user's view, so draws
  // are omitted from the record bar entirely (they still live in total_battles
  // elsewhere for sample-size math). Gives the user a bar like
  // "vs Trick Room: 12-4" at a glance.
  var record_total = { n: wins + losses, w: wins, l: losses,
                       win_rate: (wins + losses) > 0 ? wins / (wins + losses) : 0 };
  var record_by_archetype = {};
  var _archetypeCache = {};
  function _classifyOpp(oppKey) {
    if (_archetypeCache[oppKey]) return _archetypeCache[oppKey];
    var label = 'Unknown';
    try {
      if (typeof TEAMS !== 'undefined' && TEAMS[oppKey] && typeof inferPlaystyle === 'function') {
        label = inferPlaystyle(TEAMS[oppKey].members || []) || 'Balanced';
      }
    } catch (e) { /* leave as Unknown */ }
    _archetypeCache[oppKey] = label;
    return label;
  }
  entries.forEach(function(e){
    var arch = _classifyOpp(e.oppKey);
    if (!record_by_archetype[arch]) record_by_archetype[arch] = { n: 0, w: 0, l: 0 };
    (e.games || []).forEach(function(g){
      if (g.result === 'win')       { record_by_archetype[arch].n++; record_by_archetype[arch].w++; }
      else if (g.result === 'loss') { record_by_archetype[arch].n++; record_by_archetype[arch].l++; }
      // draws intentionally skipped in the surfaced record
    });
  });
  var record_by_archetype_arr = Object.keys(record_by_archetype).map(function(k){
    var r = record_by_archetype[k];
    return { archetype: k, n: r.n, w: r.w, l: r.l,
             win_rate: r.n > 0 ? r.w / r.n : 0 };
  }).filter(function(r){ return r.n > 0; })
    .sort(function(a,b){ return b.n - a.n; });

  // Phase 4c (Refs PHASE4C_DETECTORS_SPEC.md): structured detector outputs.
  // Kept side-by-side with the legacy Phase 4b fields above so existing
  // consumers (renderStrategyTab snippets, PDF builders) keep working while
  // the new UI sections read the v2 fields.
  var lead_performance_v2 = [];
  var dead_moves_v2       = [];
  var loss_conditions_v2  = [];
  try { lead_performance_v2 = csComputeLeadPerformance(games); }       catch (_e) { lead_performance_v2 = []; }
  try { dead_moves_v2       = csDetectDeadMoves(games, teamKey); }     catch (_e) { dead_moves_v2 = []; }
  try { loss_conditions_v2  = csDetectLossConditions(games, teamKey); } catch (_e) { loss_conditions_v2 = []; }
  var team_confidence_v2 = csConfidenceBadge(total_battles, win_rate);
  var fake_good_plays = [];
  var player_behavior_patterns_v2 = [];
  var policy_output_audit = { fakeGoodCount: 0, flagged: [] };
  var coaching_delta = null;
  try { fake_good_plays = detectFakeGoodPlays(games, teamKey); } catch (_e) { fake_good_plays = []; }
  try { player_behavior_patterns_v2 = detectPlayerBehaviorPatterns(games, teamKey); } catch (_e) { player_behavior_patterns_v2 = []; }
  try {
    var firstCut = Math.max(0, total_battles - 100);
    var priorGames = games.slice(0, firstCut || Math.floor(games.length / 2));
    var priorHistory = {
      lead_performance_v2: (typeof csComputeLeadPerformance === 'function') ? csComputeLeadPerformance(priorGames) : [],
      dead_moves_v2: (typeof csDetectDeadMoves === 'function') ? csDetectDeadMoves(priorGames, teamKey) : [],
      loss_conditions_v2: (typeof csDetectLossConditions === 'function') ? csDetectLossConditions(priorGames, teamKey) : [],
      total_battles: priorGames.length
    };
    var currentAdvice = {
      recommended_line: (lead_performance_v2[0] && lead_performance_v2[0].lead) ? lead_performance_v2[0].lead.join(' + ') : '',
      dominant_loss_condition: loss_conditions_v2[0] ? loss_conditions_v2[0].pattern : null,
      dead_moves: dead_moves_v2
    };
    coaching_delta = auditCoachingDelta(_csPolicyAdviceFromHistory(priorHistory), currentAdvice, priorGames.length, total_battles);
    var adviceStrings = [];
    if (currentAdvice.recommended_line) adviceStrings.push('Lead ' + currentAdvice.recommended_line + ' as the current top sim candidate.');
    if (loss_conditions_v2[0]) adviceStrings.push('Address ' + loss_conditions_v2[0].pattern + ' before forcing damage.');
    policy_output_audit = auditPolicyOutput(adviceStrings);
  } catch (_e) {
    coaching_delta = auditCoachingDelta({}, {}, 0, total_battles);
  }

  var history = {
    total_battles: total_battles,
    total_series: total_series,
    state: state,
    win_rate: win_rate,
    series_win_rate: series_win_rate,
    consistency_score: {
      label: consistency_label,
      variance: variance,
      spread_gap: spread_gap,
      rng_dependency: rng_dependency
    },
    lead_performance: lead_performance,
    lead_pair_table_v2: lead_pair_table_v2,
    matchup_failures: matchup_failures,
    common_loss_conditions: common_loss_conditions,
    dead_moves: dead_moves,
    protect_peaks: protectPeaks,
    record_total: record_total,
    record_by_archetype: record_by_archetype_arr,
    player_behavior_patterns: player_behavior_patterns_v2,
    // Phase 4c additions (additive, no replace).
    lead_performance_v2: lead_performance_v2,
    dead_moves_v2:       dead_moves_v2,
    loss_conditions_v2:  loss_conditions_v2,
    team_confidence_v2:  team_confidence_v2,
    // Phase 4e additions.
    policy_audit: {
      fake_good_plays: fake_good_plays,
      player_behavior_patterns: player_behavior_patterns_v2,
      policy_output_audit: policy_output_audit,
      coaching_delta: coaching_delta,
      fakeGoodCount: (policy_output_audit.fakeGoodCount || 0) + fake_good_plays.length
    }
  };

  _csHistoryCache[teamKey] = { ts: Date.now(), history: history };
  return history;
}

function csInvalidateTeamHistory(teamKey) {
  if (teamKey) delete _csHistoryCache[teamKey];
  else _csHistoryCache = {};
}

// Render the adaptive-state banner + consistency pill. Returns HTML string.
function csRenderAdaptiveBanner(history) {
  if (!history) return '';
  var html = '';
  var state = history.state;
  var total = history.total_battles;
  var remaining = Math.max(0, CS_STATE_MATURE_THRESHOLD - total);
  var bannerClass = 'cs-adaptive-banner cs-adaptive-state-' + state;
  var bannerTitle, bannerBody;
  if (state === 1) {
    bannerTitle = 'Theory-backed preview';
    bannerBody  = 'Run sims to unlock team-specific coaching. Until then, guidance below comes from roster and archetype heuristics, not your logged sim history.';
  } else if (state === 2) {
    bannerTitle = 'Early data';
    bannerBody  = total + ' battle' + (total === 1 ? '' : 's') + ' logged. ' + remaining + ' more to reach mature confidence.';
  } else {
    bannerTitle = 'Established sim sample';
    bannerBody  = total + ' battles logged. Coaching reflects repeated sim patterns, not guaranteed tournament truth.';
  }
  html += '<div class="' + bannerClass + '">';
  html +=   '<div class="cs-adaptive-row">';
  html +=     '<span class="cs-adaptive-state-label">State ' + state + '/3</span>';
  html +=     '<span class="cs-adaptive-title">' + _csEsc(bannerTitle) + '</span>';
  // Consistency pill
  var cs = history.consistency_score || {};
  var pillClass = 'cs-consistency-pill cs-consistency-' + (cs.label || 'unknown');
  var pillLabel = cs.label === 'insufficient_data' ? 'gathering data'
                : cs.label === 'consistent'       ? 'consistent'
                : cs.label === 'inconsistent'     ? 'inconsistent'
                : cs.label === 'volatile'         ? 'volatile'
                : 'unknown';
  var pillTooltip = 'variance ' + (cs.variance||0).toFixed(2)
                  + ' · spread ' + (cs.spread_gap||0).toFixed(2)
                  + ' · rng ' + (cs.rng_dependency||0).toFixed(2);
  html +=     '<span class="' + pillClass + '" title="' + _csEsc(pillTooltip) + '">' + _csEsc(pillLabel) + '</span>';
  html +=   '</div>';
  html +=   '<div class="cs-adaptive-body">' + _csEsc(bannerBody) + '</div>';
  html += '</div>';
  return html;
}

// Detect whether pre-Phase-4 sim data exists in the Phase 3 persistence store
// but the Phase 4 raw sim log is empty. Used to show a clearer empty-state
// hint in the Record bar so users who simmed before v2.1.6 know why their
// prior games don't appear (the per-series log did not exist yet).
//   Returns 'legacy'  - Phase 3 overlays with sample_size > 0 exist, log empty
//           'new'     - no data anywhere
//           'has_log' - Phase 4 sim log has at least one entry
function _csRecordEmptyStateKind() {
  try {
    var logEntries = (typeof csSimLogGetAll === 'function') ? csSimLogGetAll() : [];
    if (logEntries && logEntries.length > 0) return 'has_log';
    var store = (typeof _csPersistRead === 'function') ? _csPersistRead() : null;
    var reports = (store && store.reports) || {};
    var sigs = Object.keys(reports);
    for (var i = 0; i < sigs.length; i++) {
      var overlay = reports[sigs[i]] && reports[sigs[i]].simulation_overlay;
      if (overlay && overlay.sample_size && overlay.sample_size > 0) return 'legacy';
    }
    return 'new';
  } catch (_e) {
    return 'new';
  }
}

// Phase 4c (Refs PHASE4C_DETECTORS_SPEC.md) - render 5 collapsible sections.
// Empty-state when history.total_battles < CONF_LOW_MIN (5) for a section,
// individual rows show inline confidence badges, section headers show the
// dominant tier across rows.
function csRenderPhase4cSections(history, teamKey, team) {
  if (!history) return '';
  var n = history.total_battles | 0;
  var leadRows = history.lead_performance_v2 || [];
  var deadRows = history.dead_moves_v2 || [];
  var lossRows = history.loss_conditions_v2 || [];
  var teamConf = history.team_confidence_v2 || { tier: 'none', reason: 'n=0' };
  var members = (team && team.members) || [];

  function _badgeHtml(tier, label) {
    var t = tier || 'none';
    var txtMap = {
      none: 'insufficient data',
      low:  'low confidence',
      med:  'moderate',
      high: 'high confidence',
      inconclusive: 'inconclusive'
    };
    var text = label || txtMap[t] || t;
    return '<span class="cs-confidence-badge cs-confidence-' + t + '">' + _csEsc(text) + '</span>';
  }
  function _dominantTier(rows) {
    if (!rows || !rows.length) return 'none';
    var rank = { high: 4, med: 3, low: 2, inconclusive: 1, none: 0 };
    var best = 'none';
    rows.forEach(function(r){
      var t = r.confidence || 'none';
      if ((rank[t] || 0) > (rank[best] || 0)) best = t;
    });
    return best;
  }
  function _emptyHtml(label) {
    return '<div class="cs-detector-empty">' + _csEsc(label) + '</div>';
  }
  function _branchConfidenceTier(conf) {
    return conf === 'strong' ? 'high' : conf === 'early_signal' ? 'low' : 'none';
  }
  function _section(title, headerExtra, bodyHtml) {
    var h = '';
    h += '<details class="cs-detector-section" open>';
    h +=   '<summary class="cs-detector-summary">';
    h +=     '<span class="cs-detector-title">' + _csEsc(title) + '</span>';
    h +=     headerExtra;
    h +=   '</summary>';
    h +=   '<div class="cs-detector-body">' + bodyHtml + '</div>';
    h += '</details>';
    return h;
  }

  var html = '';
  html += '<div class="cs-phase4c-block">';

  // ---- Section 1: Lead Performance --------------------------------------
  var leadHeader = '';
  var leadBody = '';
  if (n < CS_PHASE4C.CONF_LOW_MIN) {
    leadHeader = _badgeHtml('none');
    leadBody = _emptyHtml('insufficient data - run 5+ sims');
  } else if (!leadRows.length) {
    leadHeader = _badgeHtml('none', 'no lead pairs with 5+ games');
    leadBody = _emptyHtml('No lead pair has reached 5 games yet.');
  } else {
    leadHeader = '<span class="cs-detector-count">' + leadRows.length + ' tracked</span>' + _badgeHtml(_dominantTier(leadRows));
    leadBody += '<div class="cs-detector-table">';
    leadBody +=   '<div class="cs-detector-row cs-detector-head">';
    leadBody +=     '<span>Lead</span><span>W-L</span><span>WR</span><span>Confidence</span>';
    leadBody +=   '</div>';
    leadRows.forEach(function(r){
      leadBody += '<div class="cs-detector-row">';
      leadBody +=   '<span class="cs-detector-cell-lead">' + _csEsc((r.lead || []).join(' + ')) + '</span>';
      leadBody +=   '<span>' + r.w + '-' + r.l + '</span>';
      leadBody +=   '<span>' + Math.round((r.win_rate || 0) * 100) + '%</span>';
      leadBody +=   '<span title="' + _csEsc(r.confidence_reason || '') + '">' + _badgeHtml(r.confidence) + '</span>';
      leadBody += '</div>';
    });
    leadBody += '</div>';
  }
  html += _section('Lead Performance', leadHeader, leadBody);

  // ---- Section 1b: Lead Pair Table by Matchup ---------------------------
  var leadPairRows = history.lead_pair_table_v2 || [];
  var leadPairHeader = '';
  var leadPairBody = '';
  if (n < CS_PHASE4C.LEAD_MIN_GAMES) {
    leadPairHeader = _badgeHtml('none', 'need ' + CS_PHASE4C.LEAD_MIN_GAMES + '+ games');
    leadPairBody = _emptyHtml('Run ' + CS_PHASE4C.LEAD_MIN_GAMES + '+ sims to surface matchup-specific lead pairs.');
  } else if (!leadPairRows.length) {
    leadPairHeader = _badgeHtml('none', 'no matchup lead pairs yet');
    leadPairBody = _emptyHtml('No matchup/lead pair has reached the threshold yet.');
  } else {
    var sortKey = CS_LEAD_PAIR_TABLE_SORT || 'wr_desc';
    var sortedPairs = csSortLeadPairTable(leadPairRows, sortKey);
    leadPairHeader = '<span class="cs-detector-count">' + sortedPairs.length + ' tracked</span>' + _badgeHtml(_dominantTier(sortedPairs));
    leadPairBody += '<div class="cs-detector-toolbar cs-leadpair-toolbar">';
    leadPairBody +=   '<button class="btn-secondary cs-leadpair-sort' + (sortKey === 'wr_desc' ? ' active' : '') + '" type="button" data-cs-lead-sort="wr_desc">Sort by WR</button>';
    leadPairBody +=   '<button class="btn-secondary cs-leadpair-sort' + (sortKey === 'sample_desc' ? ' active' : '') + '" type="button" data-cs-lead-sort="sample_desc">Sort by sample</button>';
    leadPairBody +=   '<button class="btn-secondary cs-leadpair-sort' + (sortKey === 'matchup_asc' ? ' active' : '') + '" type="button" data-cs-lead-sort="matchup_asc">Sort by matchup</button>';
    leadPairBody +=   '<button class="btn-secondary cs-leadpair-sort' + (sortKey === 'lead_asc' ? ' active' : '') + '" type="button" data-cs-lead-sort="lead_asc">Sort by lead</button>';
    leadPairBody += '</div>';
    leadPairBody += '<div class="cs-detector-table">';
    leadPairBody +=   '<div class="cs-detector-row cs-detector-head">';
    leadPairBody +=     '<span>Matchup</span><span>Lead pair</span><span>W-L</span><span>WR</span><span>Sample</span>';
    leadPairBody +=   '</div>';
    sortedPairs.forEach(function(r){
      leadPairBody += '<div class="cs-detector-row">';
      leadPairBody +=   '<span class="cs-detector-cell-desc">' + _csEsc(r.matchup_name || r.matchup_key || '-') + '</span>';
      leadPairBody +=   '<span class="cs-detector-cell-lead">' + _csEsc(r.lead_label || '-') + '</span>';
      leadPairBody +=   '<span>' + r.w + '-' + r.l + '</span>';
      leadPairBody +=   '<span>' + Math.round((r.win_rate || 0) * 100) + '%</span>';
      leadPairBody +=   '<span title="' + _csEsc(r.confidence_reason || '') + '">' + r.n + '</span>';
      leadPairBody += '</div>';
    });
    leadPairBody += '</div>';
  }
  html += _section('Lead Pair Win-Rate Table', leadPairHeader, leadPairBody);

  // ---- Section 2: Likely Loss Patterns ----------------------------------
  var lossHeader = '';
  var lossBody = '';
  if (n < CS_PHASE4C.LOSS_MIN_GAMES) {
    lossHeader = _badgeHtml('none', 'need ' + CS_PHASE4C.LOSS_MIN_GAMES + '+ games');
    lossBody = _emptyHtml('Run ' + CS_PHASE4C.LOSS_MIN_GAMES + '+ sims to surface loss patterns.');
  } else if (!lossRows.length) {
    lossHeader = _badgeHtml('high', 'no patterns flagged');
    lossBody = _emptyHtml('No loss pattern crossed the lift threshold. That is a good sign.');
  } else {
    lossHeader = '<span class="cs-detector-count">' + lossRows.length + ' detected</span>' + _badgeHtml(_dominantTier(lossRows));
    lossBody += '<div class="cs-detector-table">';
    lossRows.forEach(function(r){
      lossBody += '<div class="cs-detector-row cs-detector-row-loss cs-severity-' + r.severity + '">';
      lossBody +=   '<span class="cs-detector-cell-desc">' + _csEsc(r.description) + '</span>';
      lossBody +=   '<span>' + Math.round((r.loss_freq || 0) * 100) + '% of losses</span>';
      lossBody +=   '<span class="cs-severity-tag">' + _csEsc(r.severity) + ' severity</span>';
      lossBody +=   '<span title="' + _csEsc(r.confidence_reason || '') + '">' + _badgeHtml(r.confidence) + '</span>';
      lossBody += '</div>';
    });
    lossBody += '</div>';
  }
  html += _section('Likely Loss Patterns', lossHeader, lossBody);

  // ---- Section 3: Dead Moves -------------------------------------------
  var deadHeader = '';
  var deadBody = '';
  if (n < CS_PHASE4C.DEAD_MOVE_MIN_GAMES) {
    deadHeader = _badgeHtml('none', 'need ' + CS_PHASE4C.DEAD_MOVE_MIN_GAMES + '+ games');
    deadBody = _emptyHtml('Run ' + CS_PHASE4C.DEAD_MOVE_MIN_GAMES + '+ sims before flagging dead moves.');
  } else if (!deadRows.length) {
    deadHeader = _badgeHtml('high', 'no dead moves');
    deadBody = _emptyHtml('Every move has been used at expected rates.');
  } else {
    deadHeader = '<span class="cs-detector-count">' + deadRows.length + ' flagged</span>' + _badgeHtml(_dominantTier(deadRows));
    deadBody += '<div class="cs-detector-table">';
    deadRows.forEach(function(r){
      var avgLabel = (r.calls === 0)
        ? '0 calls (count=0) over ' + r.total_games + ' games'
        : (Math.round((r.avg_calls_per_game || 0) * 100) / 100) + ' avg/game over ' + r.total_games + ' games';
      deadBody += '<div class="cs-detector-row cs-detector-row-dead cs-severity-' + r.severity + '">';
      deadBody +=   '<span class="cs-detector-cell-desc"><strong>' + _csEsc(r.pokemon) + '</strong> - ' + _csEsc(r.move) + '</span>';
      deadBody +=   '<span>' + _csEsc(avgLabel) + '</span>';
      deadBody +=   '<span class="cs-severity-tag">' + _csEsc(r.severity) + ' severity</span>';
      deadBody +=   '<span>' + _badgeHtml(r.confidence) + '</span>';
      deadBody += '</div>';
    });
    deadBody += '</div>';
  }
  html += _section('Dead Moves', deadHeader, deadBody);

  // ---- Section 3b: Branch Move Coach ------------------------------------
  var branchAnalysis = (typeof csLatestBranchMoveAnalysisForTeam === 'function') ? csLatestBranchMoveAnalysisForTeam(teamKey) : null;
  var branchHeader = '';
  var branchBody = '';
  if (!branchAnalysis || !branchAnalysis.totals || !branchAnalysis.totals.weighted_samples) {
    branchHeader = _badgeHtml('none', 'run QA artifact');
    branchBody = _emptyHtml('Run QA Artifact after branch matrix sims to unlock avoid moves, legal swaps, and suggested lines.');
  } else {
    var strongCount = (branchAnalysis.totals.strong_avoid_moves || 0);
    branchHeader = '<span class="cs-detector-count">' + (branchAnalysis.totals.weighted_samples || 0) + ' branch samples</span>' +
      _badgeHtml(strongCount ? 'high' : 'low', strongCount ? 'strong reads ready' : 'early reads only');
    branchBody += '<ul class="cs-list cs-detector-roles">';
    (branchAnalysis.trainer_report || []).forEach(function(line) {
      branchBody += '<li>' + _csEsc(line) + '</li>';
    });
    branchBody += '</ul>';
    var avoidRows = (branchAnalysis.avoid_moves || []).slice(0, 4);
    var swapRows = (branchAnalysis.move_replacement_candidates || []).slice(0, 4);
    var lineRows = (branchAnalysis.suggested_lines || []).slice(0, 3);
    var tacticRows = (branchAnalysis.tactical_signals || []).slice(0, 4);
    if (avoidRows.length) {
      branchBody += '<div class="cs-detector-table">';
      branchBody += '<div class="cs-detector-row cs-detector-head"><span>Avoid click</span><span>Matchup</span><span>WR</span><span>Confidence</span></div>';
      avoidRows.forEach(function(r) {
        branchBody += '<div class="cs-detector-row">';
        branchBody += '<span><strong>' + _csEsc(r.actor || '-') + '</strong> - ' + _csEsc(r.move || '-') + '</span>';
        branchBody += '<span>' + _csEsc(r.opponent_team_id || '-') + '</span>';
        branchBody += '<span>' + _csEsc(String(r.win_rate_pct)) + '% over ' + _csEsc(String(r.samples)) + '</span>';
        branchBody += '<span>' + _badgeHtml(_branchConfidenceTier(r.confidence), r.confidence === 'strong' ? 'strong' : 'early') + '</span>';
        branchBody += '</div>';
      });
      branchBody += '</div>';
    }
    if (swapRows.length) {
      branchBody += '<div class="cs-detector-table">';
      branchBody += '<div class="cs-detector-row cs-detector-head"><span>Legal swap</span><span>Lead context</span><span>Lift</span><span>Confidence</span></div>';
      swapRows.forEach(function(r) {
        branchBody += '<div class="cs-detector-row">';
        branchBody += '<span><strong>' + _csEsc(r.actor || '-') + '</strong>: ' + _csEsc(r.avoid_move || '-') + ' -> ' + _csEsc(r.better_legal_move_seen || '-') + '</span>';
        branchBody += '<span>' + _csEsc((r.player_leads || []).join(' + ')) + ' vs ' + _csEsc((r.opponent_leads || []).join(' + ')) + '</span>';
        branchBody += '<span>+' + _csEsc(String(r.lift_pct)) + '%</span>';
        branchBody += '<span>' + _badgeHtml(_branchConfidenceTier(r.confidence), r.confidence === 'strong' ? 'strong' : 'early') + '</span>';
        branchBody += '</div>';
      });
      branchBody += '</div>';
    }
    if (lineRows.length) {
      branchBody += '<div class="cs-detector-table">';
      branchBody += '<div class="cs-detector-row cs-detector-head"><span>Suggested line</span><span>Into</span><span>Lift</span><span>Confidence</span></div>';
      lineRows.forEach(function(r) {
        branchBody += '<div class="cs-detector-row">';
        branchBody += '<span class="cs-detector-cell-desc">' + _csEsc(r.suggested_line || '-') + '</span>';
        branchBody += '<span>' + _csEsc(r.opponent_team_id || '-') + '</span>';
        branchBody += '<span>+' + _csEsc(String(r.lift_pct)) + '%</span>';
        branchBody += '<span>' + _badgeHtml(_branchConfidenceTier(r.confidence), r.confidence === 'strong' ? 'strong' : 'early') + '</span>';
        branchBody += '</div>';
      });
      branchBody += '</div>';
    }
    if (tacticRows.length) {
      branchBody += '<div class="cs-detector-table">';
      branchBody += '<div class="cs-detector-row cs-detector-head"><span>Tactical timing</span><span>Lead context</span><span>WR / position</span><span>Confidence</span></div>';
      tacticRows.forEach(function(r) {
        branchBody += '<div class="cs-detector-row">';
        branchBody += '<span class="cs-detector-cell-desc">' + _csEsc(r.tactic_tag || '-') + '</span>';
        branchBody += '<span>' + _csEsc((r.player_leads || []).join(' + ')) + ' vs ' + _csEsc((r.opponent_leads || []).join(' + ')) + '</span>';
        branchBody += '<span>' + _csEsc(String(r.win_rate_pct)) + '% / ' + _csEsc(String(r.avg_position_delta || 0)) + '</span>';
        branchBody += '<span>' + _badgeHtml(_branchConfidenceTier(r.confidence), r.confidence === 'strong' ? 'strong' : 'early') + '</span>';
        branchBody += '</div>';
      });
      branchBody += '</div>';
    }
  }
  html += _section('Branch Move Coach', branchHeader, branchBody);

  // ---- Section 4: Coverage and Roles (read-only TEAM_META summary) ------
  var covHeader = _badgeHtml('high', 'team composition');
  var covBody = '';
  if (!members.length) {
    covBody = _emptyHtml('No team members loaded.');
  } else {
    var archetype = '';
    try { archetype = (typeof inferPlaystyle === 'function') ? (inferPlaystyle(members) || '') : ''; } catch (_e) { archetype = ''; }
    covBody += '<ul class="cs-list cs-detector-roles">';
    if (archetype) covBody += '<li><strong>Archetype:</strong> ' + _csEsc(archetype) + '</li>';
    var roleLines = members.map(function(m){
      var classified = (typeof classifyPokemon === 'function') ? classifyPokemon(m) : null;
      var roles = classified && Array.isArray(classified.roles) && classified.roles.length ? classified.roles.join(' / ') : 'Support';
      var extras = [];
      if (m.item) extras.push('@ ' + m.item);
      if (m.ability) extras.push('(' + m.ability + ')');
      return _csEsc(m.name + ' [' + roles + ']' + (extras.length ? ' ' + extras.join(' ') : ''));
    });
    covBody += '<li><strong>Roster:</strong> ' + roleLines.join(', ') + '</li>';
    covBody += '</ul>';
  }
  html += _section('Coverage and Roles', covHeader, covBody);

  // ---- Section 5: Sample Confidence (team-level) ------------------------
  var teamHeader = _badgeHtml(teamConf.tier);
  var teamBody = '';
  teamBody += '<div class="cs-detector-team-conf">';
  teamBody +=   '<div><strong>Total games:</strong> ' + n + '</div>';
  teamBody +=   '<div><strong>Win rate:</strong> ' + Math.round((history.win_rate || 0) * 100) + '%</div>';
  teamBody +=   '<div><strong>Reason:</strong> ' + _csEsc(teamConf.reason || '') + '</div>';
  teamBody += '</div>';
  if (n < CS_PHASE4C.CONF_LOW_MIN) {
    teamBody += _emptyHtml('Not enough data to draw conclusions yet.');
  }
  html += _section('Sample Confidence', teamHeader, teamBody);

  html += '</div>';
  return html;
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.phase4c.csRenderPhase4cSections = csRenderPhase4cSections;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderPhase4cSections', csRenderPhase4cSections);

// Phase 4d (Refs PHASE4D_THREAT_RESPONSE_SPEC.md) - threat response solver.
// Engine-light: explores four lead/bring branches by calling simulateBattle()
// with constrained bring lists, then classifies the resulting candidate lines.
var CS_PHASE4D_BRANCHES = ['safe', 'aggressive', 'counter', 'defensive'];
var CS_PHASE4D_CACHE = {};

function _cs4dHashSeed(seed, branchId, idx) {
  var s = String(seed === null || seed === undefined ? 'phase4d' : seed) + ':' + branchId + ':' + idx;
  var h = 2166136261 >>> 0;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return [h, (h ^ 0x9e3779b9) >>> 0, Math.imul(h || 1, 2246822519) >>> 0, (h + 0x85ebca6b) >>> 0];
}

function _cs4dMembers(teamKey) {
  var team = (typeof TEAMS !== 'undefined') ? TEAMS[teamKey] : null;
  return team && Array.isArray(team.members) ? team.members.slice() : [];
}

function _cs4dTypes(mon) {
  if (!mon) return [];
  if (Array.isArray(mon.types) && mon.types.length) return mon.types;
  if (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[mon.name]) return POKEMON_TYPES_DB[mon.name];
  if (typeof BASE_STATS !== 'undefined' && BASE_STATS[mon.name] && BASE_STATS[mon.name].types) return BASE_STATS[mon.name].types;
  return [];
}

function _cs4dBase(mon) {
  return (typeof BASE_STATS !== 'undefined' && mon && BASE_STATS[mon.name]) ? BASE_STATS[mon.name] : {};
}

function _cs4dOffenseScore(mon) {
  var b = _cs4dBase(mon);
  return Math.max(b.atk || 0, b.spa || 0) + (b.spe || 0) * 0.55;
}

function _cs4dBulkScore(mon) {
  var b = _cs4dBase(mon);
  var moves = (mon && mon.moves || []).join(',');
  var support = /Protect|Follow Me|Rage Powder|Reflect|Light Screen|Aurora Veil|Recover|Roost|Life Dew|Will-O-Wisp|Parting Shot|Fake Out/i.test(moves) ? 45 : 0;
  return (b.hp || 0) + (b.def || 0) + (b.spd || 0) + support;
}

function _cs4dSpeedScore(mon) {
  var b = _cs4dBase(mon);
  var moves = (mon && mon.moves || []).join(',');
  var speed = /Tailwind|Trick Room|Icy Wind|Thunder Wave|Electroweb|Fake Out/i.test(moves) ? 80 : 0;
  return (b.spe || 0) + speed;
}

function _cs4dTypeCounterScore(mon, oppMons) {
  var score = _cs4dOffenseScore(mon) * 0.1;
  var moves = mon && mon.moves || [];
  var oppTypes = [];
  oppMons.forEach(function(o){ oppTypes = oppTypes.concat(_cs4dTypes(o)); });
  moves.forEach(function(move){
    var mt = (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[move]) ? MOVE_TYPES[move] : null;
    if (!mt || typeof TYPE_CHART === 'undefined' || !TYPE_CHART[mt]) return;
    oppTypes.forEach(function(t){
      var mult = TYPE_CHART[mt][t];
      if (mult >= 2) score += 35;
      else if (mult === 0) score -= 20;
      else if (mult < 1) score -= 6;
    });
  });
  return score;
}

function _cs4dPickPair(members, scorer) {
  var best = null;
  for (var i = 0; i < members.length; i++) {
    for (var j = i + 1; j < members.length; j++) {
      var pair = [members[i], members[j]];
      var score = scorer(pair);
      if (!best || score > best.score) best = { pair: pair, score: score };
    }
  }
  return best ? best.pair : members.slice(0, 2);
}

function _cs4dBringForLead(members, lead, scorer, bringCount) {
  var names = {};
  lead.forEach(function(m){ names[m.name] = true; });
  var rest = members.filter(function(m){ return !names[m.name]; });
  rest.sort(function(a,b){ return scorer(b) - scorer(a); });
  return lead.concat(rest).slice(0, bringCount || 4).map(function(m){ return m.name; });
}

function _cs4dResolveBranch(teamKey, oppKey, branchId) {
  var members = _cs4dMembers(teamKey);
  var oppMembers = _cs4dMembers(oppKey);
  var bringCount = (typeof currentFormat !== 'undefined' && currentFormat === 'singles') ? 3 : 4;
  var history = null;
  try { history = (typeof computeTeamHistory === 'function') ? computeTeamHistory(teamKey) : null; } catch (_e) {}
  var data = 'meta-only';
  var lead;
  if (branchId === 'safe' && history && Array.isArray(history.lead_performance) && history.lead_performance[0]) {
    var hLead = history.lead_performance[0].lead || [];
    lead = hLead.map(function(n){ return members.find(function(m){ return m.name === n; }); }).filter(Boolean);
    if (lead.length === 2) data = 'phase4c';
  }
  if (!lead || lead.length !== 2) {
    if (branchId === 'aggressive') {
      lead = _cs4dPickPair(members, function(pair){ return _cs4dOffenseScore(pair[0]) + _cs4dOffenseScore(pair[1]); });
    } else if (branchId === 'counter') {
      var likelyOpp = oppMembers.slice(0, 2);
      lead = _cs4dPickPair(members, function(pair){ return _cs4dTypeCounterScore(pair[0], likelyOpp) + _cs4dTypeCounterScore(pair[1], likelyOpp); });
    } else if (branchId === 'defensive') {
      lead = _cs4dPickPair(members, function(pair){ return _cs4dBulkScore(pair[0]) + _cs4dBulkScore(pair[1]); });
    } else {
      lead = _cs4dPickPair(members, function(pair){ return _cs4dSpeedScore(pair[0]) + _cs4dBulkScore(pair[1]); });
    }
  }
  var fillScore = branchId === 'aggressive' ? _cs4dOffenseScore :
    branchId === 'defensive' ? _cs4dBulkScore :
    branchId === 'counter' ? function(m){ return _cs4dTypeCounterScore(m, oppMembers.slice(0, 2)); } :
    _cs4dSpeedScore;
  return {
    id: branchId,
    lead: lead.map(function(m){ return m.name; }),
    bring: _cs4dBringForLead(members, lead, fillScore, bringCount),
    data: data
  };
}

function classifyLine(line) {
  var names = Array.isArray(line) ? line : (line && (line.lead || line.members)) || [];
  var members = names.map(function(n){
    if (typeof n === 'object') return n;
    if (typeof TEAMS === 'undefined') return null;
    for (var k in TEAMS) {
      var found = (TEAMS[k].members || []).find(function(m){ return m.name === n; });
      if (found) return found;
    }
    return null;
  }).filter(Boolean);
  var moves = members.map(function(m){ return (m.moves || []).join(','); }).join(',');
  var abilities = members.map(function(m){ return m.ability || ''; }).join(',');
  if (/Tailwind|Icy Wind|Thunder Wave|Electroweb/i.test(moves)) return 'SPEED_CONTROL';
  if (/Trick Room/i.test(moves)) return 'TRICK_ROOM';
  if (/Drought|Drizzle|Sand Stream|Snow Warning|Sunny Day|Rain Dance|Sandstorm|Snowscape/i.test(moves + ',' + abilities)) return 'WEATHER_SETTER';
  if (/Fake Out|Parting Shot|U-turn|Volt Switch|Flip Turn|Follow Me|Rage Powder/i.test(moves)) return 'UTILITY_PIVOT';
  return 'ATTACKER_CORE';
}

function classifyThreatBranch(branch) {
  var wr = branch && typeof branch.win_rate === 'number' ? branch.win_rate : 0;
  var n = branch && branch.n || 0;
  var cs = branch && branch.consistency_score || {};
  var variance = typeof cs.variance === 'number' ? cs.variance : 1;
  var rngDep = typeof cs.rng_dependency === 'number' ? cs.rng_dependency : 0;
  var z = n > 0 ? Math.abs((wr - 0.5) / Math.sqrt(0.25 / n)) : 0;
  if (wr >= 0.65 && n >= 200 && z >= 1.96 && variance <= 0.20) return 'strong';
  if (wr >= 0.55 && variance <= 0.30) return 'stable';
  if (wr >= 0.50 || variance > 0.30 || rngDep > 0.60) return 'volatile';
  return 'losing';
}

function _cs4dConsistency(logs) {
  var turns = logs.map(function(g){ return g.turns || 0; });
  var n = turns.length || 1;
  var mean = turns.reduce(function(a,b){ return a + b; }, 0) / n || 1;
  var variance = turns.reduce(function(a,b){ return a + Math.pow(b - mean, 2); }, 0) / n;
  var cv = Math.min(1, Math.sqrt(variance) / mean);
  var rngHits = logs.filter(function(g){
    var text = Array.isArray(g.log) ? g.log.join(' ') : '';
    return /critical|missed|flinch|paralysed|frozen|thaw|burned|poisoned/i.test(text);
  }).length;
  return {
    rng_dependency: logs.length ? Math.round((rngHits / logs.length) * 100) / 100 : 0,
    variance: Math.round(cv * 100) / 100
  };
}

function _cs4dCompareBranches(a, b) {
  var rank = { strong: 4, stable: 3, volatile: 2, losing: 1 };
  var ar = rank[a.classification] || 0;
  var br = rank[b.classification] || 0;
  if (ar !== br) return br - ar;
  if (a.low_sample !== b.low_sample) return a.low_sample ? 1 : -1;
  if (a.win_rate !== b.win_rate) return b.win_rate - a.win_rate;
  var av = a.consistency_score ? a.consistency_score.variance : 1;
  var bv = b.consistency_score ? b.consistency_score.variance : 1;
  if (av !== bv) return av - bv;
  return String(a.id).localeCompare(String(b.id));
}

function solveThreatResponse(teamKey, oppKey, opts) {
  opts = opts || {};
  var branches = opts.branches || CS_PHASE4D_BRANCHES;
  var simsPerBranch = Math.max(1, opts.simsPerBranch || 30);
  var cacheKey = [teamKey, oppKey, simsPerBranch, opts.rngSeed || '', (typeof currentFormat !== 'undefined' ? currentFormat : 'doubles')].join('|');
  if (!opts.noCache && CS_PHASE4D_CACHE[cacheKey]) return CS_PHASE4D_CACHE[cacheKey];
  if (typeof TEAMS === 'undefined' || !TEAMS[teamKey] || !TEAMS[oppKey] || typeof simulateBattle !== 'function') return null;

  var start = Date.now();
  var budget = opts.budgetMsTotal || 30000;
  var out = [];
  branches.forEach(function(branchId){
    var branch = _cs4dResolveBranch(teamKey, oppKey, branchId);
    var w = 0, l = 0, d = 0, logs = [];
    for (var i = 0; i < simsPerBranch; i++) {
      if (Date.now() - start > budget && i > 0) break;
      var battle = simulateBattle(TEAMS[teamKey], TEAMS[oppKey], {
        format: (typeof currentFormat !== 'undefined' ? currentFormat : 'doubles'),
        seed: _cs4dHashSeed(opts.rngSeed, branchId, i),
        playerBring: branch.bring,
        playerLeads: branch.lead
      });
      if (battle.result === 'win') w++;
      else if (battle.result === 'loss') l++;
      else d++;
      if (logs.length < 20) logs.push(battle);
    }
    var n = w + l + d;
    var wr = n ? w / n : 0;
    branch.n = n;
    branch.w = w;
    branch.l = l;
    branch.d = d;
    branch.win_rate = Math.round(wr * 1000) / 1000;
    branch.consistency_score = _cs4dConsistency(logs);
    branch.classification = classifyThreatBranch(branch);
    branch.line_label = classifyLine(branch.lead);
    branch.low_sample = n < 30;
    branch.confidence = (typeof csConfidenceBadge === 'function') ? csConfidenceBadge(n, wr) : { tier: n < 20 ? 'low' : 'med', reason: 'n=' + n };
    out.push(branch);
  });

  var eligible = out.filter(function(b){ return !b.low_sample; });
  var sorted = (eligible.length ? eligible : out.slice()).sort(_cs4dCompareBranches);
  var best = sorted[0] ? sorted[0].id : null;
  var result = {
    teamKey: teamKey,
    oppKey: oppKey,
    population: 'ai_vs_ai_greedy',
    branches: out,
    best_candidate: best,
    recommended: best,
    alts: out.filter(function(b){ return b.id !== best; }).slice(0, 3),
    confidence: sorted[0] ? sorted[0].win_rate : 0,
    generatedAt: Date.now()
  };
  if (!opts.noCache) CS_PHASE4D_CACHE[cacheKey] = result;
  return result;
}

function queueThreatResponseSolve(fn) {
  if (typeof requestIdleCallback === 'function') return requestIdleCallback(fn);
  return setTimeout(fn, 0);
}

function invalidateThreatResponseCache() {
  CS_PHASE4D_CACHE = {};
}

function renderThreatResponseCard(result) {
  if (!result || !Array.isArray(result.branches) || !result.branches.length) {
    return '<section class="cs-section cs-phase4d-block"><h3 class="cs-h3">Threat Response</h3><p class="cs-no-data">Run sims to generate threat-response candidates.</p></section>';
  }
  var sorted = result.branches.slice().sort(_cs4dCompareBranches);
  var best = sorted[0];
  function pct(v) { return Math.round((v || 0) * 100) + '%'; }
  function card(b, cls) {
    var conf = b.confidence && b.confidence.tier ? b.confidence.tier : 'low';
    return '<div class="cs-line-card ' + cls + '">' +
      '<div class="cs-line-head"><strong>' + _csEsc(b.id) + '</strong> ' + _csChip(b.line_label, {kind:'playstyle'}) + ' ' + _csChip(b.classification, {kind: b.classification}) + '</div>' +
      '<div><strong>Lead:</strong> ' + _csEsc((b.lead || []).join(' + ')) + '</div>' +
      '<div><strong>Bring:</strong> ' + _csEsc((b.bring || []).join(', ')) + '</div>' +
      '<div class="cs-line-meta">' + pct(b.win_rate) + ' over ' + b.n + ' sims &middot; confidence ' + _csEsc(conf) + ' &middot; ' + _csEsc(b.data) + '</div>' +
      '</div>';
  }
  var html = '<section class="cs-section cs-phase4d-block"><h3 class="cs-h3">Threat Response <span class="cs-source cs-source-simulation_data"><span class="cs-source-label">sim sample</span></span></h3>';
  html += '<p class="cs-explain">Top sim candidate is measured against greedy AI simulation. Treat it as a starting point, not a directive or approval.</p>';
  html += card(best, 'cs-line-recommended');
  html += '<details class="cs-line-alt-wrap"><summary>Alternatives</summary>';
  sorted.filter(function(b){ return b.id !== best.id; }).forEach(function(b){ html += card(b, 'cs-line-alt'); });
  html += '</details></section>';
  return html;
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.phase4d.solveThreatResponse = solveThreatResponse;
  ChampionsSim.phase4d.classifyLine = classifyLine;
  ChampionsSim.phase4d.classifyThreatBranch = classifyThreatBranch;
  ChampionsSim.phase4d.queueThreatResponseSolve = queueThreatResponseSolve;
  ChampionsSim.phase4d.invalidateThreatResponseCache = invalidateThreatResponseCache;
  ChampionsSim.phase4d.renderThreatResponseCard = renderThreatResponseCard;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('solveThreatResponse', solveThreatResponse);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('classifyLine', classifyLine);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('classifyThreatBranch', classifyThreatBranch);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('queueThreatResponseSolve', queueThreatResponseSolve);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('invalidateThreatResponseCache', invalidateThreatResponseCache);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderThreatResponseCard', renderThreatResponseCard);

// Phase 4e (Refs PHASE4E_POLICY_AUDIT_SPEC.md) - policy audit and T5 gate.
var CS_PHASE4E_WARNING_TEXT = '⚠️ Some advice is based on static patterns — verify against your read of the opponent';
var CS_PHASE4E_DISMISSED = false;

function auditPolicyOutput(adviceArray) {
  var flagged = [];
  (adviceArray || []).forEach(function(advice){
    var text = typeof advice === 'string' ? advice : (advice && (advice.text || advice.advice || advice.message)) || '';
    var lower = text.toLowerCase();
    var reason = null;
    if (/speed[- ]?tie|coin ?flip|50\/50/.test(lower) && /strategy|plan|guarantee|safe|reliable|always/.test(lower)) {
      reason = 'speed-tie coinflip presented as strategy';
    } else if (/(trick room|tr\b).*(setter|hatterene|cresselia|dusclops|cofagrigus).*(ko|faint|down|gone|dead)|(?:ko|faint|down|gone|dead).*(trick room|tr\b).*(setter|hatterene|cresselia|dusclops|cofagrigus)/.test(lower)) {
      reason = 'Trick Room advice issued when setter is already KO’d';
    } else if (/(add|need|run|bring).*(coverage|answer|check).*(already covered|already have|redundant|covered slot)/.test(lower)) {
      reason = 'type-coverage recommendation targets an already-covered slot';
    } else if (/^(be aggressive|play aggressive|be more aggressive|pressure them|just attack)\.?$/.test(lower.trim()) ||
               (/be aggressive|play aggressive/.test(lower) && !/with|by|because|into|against|lead|target|protect|switch/.test(lower))) {
      reason = 'generic aggression advice has no actionable detail';
    }
    if (reason) flagged.push({ advice: text, reason: reason });
  });
  return { fakeGoodCount: flagged.length, flagged: flagged };
}

function detectFakeGoodPlays(simLog, teamKey) {
  var games = simLog || [];
  if (!Array.isArray(games) || games.length === 0) return [];
  var counts = {};
  function hit(pattern, idx) {
    counts[pattern] = counts[pattern] || { pattern: pattern, occurrences: 0, example_games: [] };
    counts[pattern].occurrences++;
    if (counts[pattern].example_games.length < 3) counts[pattern].example_games.push(idx);
  }
  var wincon = null;
  try {
    var team = typeof TEAMS !== 'undefined' ? TEAMS[teamKey] : null;
    var roles = team && (team.members || []).filter(function(m){ return /win|sweep|clean|closer/i.test((m.role || '') + ' ' + (m.item || '')); });
    wincon = roles && roles[0] ? roles[0].name : null;
  } catch (_e) {}
  games.forEach(function(g, idx){
    var text = Array.isArray(g.log) ? g.log.join(' ') : '';
    var koEvents = g.koEvents || [];
    var playerKOs = koEvents.filter(function(k){ return k.side === 'opponent' || k.bySide === 'player'; });
    var playerLost = koEvents.some(function(k){ return k.side === 'player'; });
    var trDropped = /trick room/i.test(text) || g.trTurns > 0 || g.lossPattern === 'tr_unanswered';
    var twExpired = /tailwind (?:expired|petered|ended)/i.test(text) || g.twExpired;
    var oppSetup = /dragon dance|calm mind|swords dance|nasty plot|trick room|tailwind/i.test(text) || g.lossPattern === 'setup_free';
    var highDamageNoKo = g.damageDealtPct >= 0.30 && playerKOs.length === 0 && oppSetup;
    if (playerKOs.length && trDropped) hit('ko_but_tr_dropped', idx);
    if (playerKOs.length && twExpired) hit('ko_but_tw_expired', idx);
    if (playerKOs.length && playerLost) hit('ko_but_position_lost', idx);
    if (highDamageNoKo) hit('damage_no_progress', idx);
    if (wincon && playerLost && text.indexOf(wincon) >= 0) hit('wincon_traded', idx);
  });
  return Object.keys(counts).map(function(k){
    var row = counts[k];
    var share = row.occurrences / games.length;
    row.share_of_games = share;
    row.sample_size = games.length;
    row.severity = (share >= 0.30 && games.length >= 25) ? 'high' : (share >= 0.15 ? 'medium' : 'low');
    row.confidence = (typeof csConfidenceBadge === 'function') ? csConfidenceBadge(games.length, share) : { tier: games.length >= 25 ? 'med' : 'low' };
    row.validation_status = 'unvalidated_simulation';
    row.population = 'ai_vs_ai_greedy';
    return row;
  }).sort(function(a,b){ return b.occurrences - a.occurrences; });
}

function detectPlayerBehaviorPatterns(simLog, teamKey) {
  var games = simLog || [];
  if (!Array.isArray(games) || games.length === 0) return [];
  var out = [];
  function push(pattern, occurrences, desc) {
    if (!occurrences) return;
    var share = occurrences / games.length;
    if (share < 0.25 && pattern !== 'lead_inconsistency') return;
    out.push({
      pattern: pattern,
      occurrences: occurrences,
      share_of_games: share,
      severity: share >= 0.35 ? 'high' : share >= 0.25 ? 'medium' : 'low',
      confidence: (typeof csConfidenceBadge === 'function') ? csConfidenceBadge(games.length, share) : { tier: 'low' },
      sample_size: games.length,
      description: desc
    });
  }
  var overprotect = games.filter(function(g){
    var peaks = g.protectStreakMax || {};
    return Object.keys(peaks).some(function(k){ return peaks[k] >= 3; });
  }).length;
  push('overprotect', overprotect, 'Protect was chained 3+ times in a game');

  var setupFree = games.filter(function(g){
    var text = Array.isArray(g.log) ? g.log.join(' ') : '';
    return /dragon dance|calm mind|swords dance|nasty plot/i.test(text) && !(g.movesUsed && Object.keys(g.movesUsed).length);
  }).length;
  push('passive_against_setup', setupFree, 'Opponent setup went unchallenged');

  var leadCounts = {};
  games.forEach(function(g){
    var lead = g.leads && g.leads.player ? g.leads.player.slice().sort().join(' + ') : '';
    if (lead) leadCounts[lead] = (leadCounts[lead] || 0) + 1;
  });
  var leadVals = Object.keys(leadCounts).map(function(k){ return leadCounts[k]; });
  if (games.length >= 30 && leadVals.length > 5 && Math.max.apply(Math, leadVals) < 8) {
    out.push({
      pattern: 'lead_inconsistency',
      occurrences: leadVals.length,
      share_of_games: leadVals.length / games.length,
      severity: 'low',
      confidence: (typeof csConfidenceBadge === 'function') ? csConfidenceBadge(games.length) : { tier: 'med' },
      sample_size: games.length,
      description: 'No lead pair is becoming the default line'
    });
  }

  var trTeam = false;
  try {
    var team = typeof TEAMS !== 'undefined' ? TEAMS[teamKey] : null;
    trTeam = !!(team && (team.members || []).some(function(m){ return (m.moves || []).indexOf('Trick Room') >= 0; }));
  } catch (_e) {}
  if (trTeam) {
    var trGames = games.filter(function(g){
      var text = Array.isArray(g.log) ? g.log.join(' ') : '';
      return /trick room/i.test(text) || g.trTurns > 0;
    }).length;
    if (games.length >= 10 && trGames / games.length < 0.60) {
      out.push({
        pattern: 'tr_setup_avoidance',
        occurrences: games.length - trGames,
        share_of_games: (games.length - trGames) / games.length,
        severity: 'medium',
        confidence: (typeof csConfidenceBadge === 'function') ? csConfidenceBadge(games.length) : { tier: 'med' },
        sample_size: games.length,
        description: 'Trick Room roster rarely sets Trick Room'
      });
    }
  }
  return out.sort(function(a,b){ return b.share_of_games - a.share_of_games; });
}

function auditCoachingDelta(adviceA, adviceB, sampleA, sampleB) {
  adviceA = adviceA || {};
  adviceB = adviceB || {};
  var aDead = adviceA.dead_moves || [];
  var bDead = adviceB.dead_moves || [];
  function key(x) { return typeof x === 'string' ? x : ((x.owner || x.pokemon || '') + ':' + (x.move || x.name || '')); }
  var aSet = {}, bSet = {};
  aDead.map(key).forEach(function(k){ aSet[k] = true; });
  bDead.map(key).forEach(function(k){ bSet[k] = true; });
  var added = Object.keys(bSet).filter(function(k){ return !aSet[k]; });
  var removed = Object.keys(aSet).filter(function(k){ return !bSet[k]; });
  var diffs = {
    recommended_line: {
      from: adviceA.recommended_line || adviceA.best_candidate || null,
      to: adviceB.recommended_line || adviceB.best_candidate || null
    },
    dominant_loss_condition: {
      from: adviceA.dominant_loss_condition || null,
      to: adviceB.dominant_loss_condition || null
    },
    dead_moves_added: added,
    dead_moves_removed: removed
  };
  var changed = 0;
  if (diffs.recommended_line.from !== diffs.recommended_line.to) changed++;
  if (diffs.dominant_loss_condition.from !== diffs.dominant_loss_condition.to) changed++;
  if (added.length || removed.length) changed++;
  var delta = Math.max(0, (sampleB || 0) - (sampleA || 0));
  return {
    surfaces_changed: changed,
    diffs: diffs,
    verdict: (changed === 0 && delta >= 50) ? 'static' : 'adaptive',
    delta_sample_size: delta
  };
}

function _csPolicyAdviceFromHistory(history) {
  history = history || {};
  var lead = (history.lead_performance_v2 && history.lead_performance_v2[0] && history.lead_performance_v2[0].lead) ||
             (history.lead_performance && history.lead_performance[0] && history.lead_performance[0].leadPair) || [];
  var loss = (history.loss_conditions_v2 && history.loss_conditions_v2[0] && history.loss_conditions_v2[0].pattern) ||
             (history.common_loss_conditions && history.common_loss_conditions[0] &&
              (history.common_loss_conditions[0].victim + ' ' + history.common_loss_conditions[0].bucket)) || null;
  return {
    recommended_line: Array.isArray(lead) ? lead.join(' + ') : String(lead || ''),
    dominant_loss_condition: loss,
    dead_moves: history.dead_moves_v2 || history.dead_moves || []
  };
}

function renderStaticAdviceWarning(audit, location) {
  audit = audit || {};
  if (CS_PHASE4E_DISMISSED && location === 'pilot') return '';
  var count = audit.fakeGoodCount || (audit.flagged ? audit.flagged.length : 0);
  if (!count) return '';
  return '<div class="cs-static-advice-warning" data-phase4e-warning>' +
    '<button class="cs-static-advice-dismiss" data-phase4e-dismiss title="Dismiss warning">×</button>' +
    '<strong>' + _csEsc(CS_PHASE4E_WARNING_TEXT) + '</strong>' +
    '<div class="cs-static-advice-detail">' + count + ' policy warning' + (count === 1 ? '' : 's') + ' flagged.</div>' +
    '</div>';
}

function csRenderPolicyAuditSection(history) {
  history = history || {};
  var audit = history.policy_audit || {};
  var delta = audit.coaching_delta || {};
  var fake = audit.fake_good_plays || [];
  var behavior = audit.player_behavior_patterns || [];
  var stringAudit = audit.policy_output_audit || { fakeGoodCount: 0, flagged: [] };
  var isStatic = delta.verdict === 'static';
  var bannerClass = isStatic ? 'cs-audit-warning' : 'cs-audit-stabilized';
  var bannerText = isStatic
    ? 'STATIC ADVICE WARNING: advice did not change over ' + (delta.delta_sample_size || 0) + ' new games.'
    : 'Adaptive: advice surfaces changed as new sim evidence arrived.';
  var html = '<details class="cs-detector-section cs-policy-audit-section" open>';
  html += '<summary class="cs-detector-summary"><span class="cs-detector-title">Policy Audit</span>';
  html += '<span class="cs-detector-count">' + (history.total_battles || 0) + ' games</span></summary>';
  html += '<div class="cs-detector-body">';
  html += '<div class="' + bannerClass + '">' + _csEsc(bannerText) + '</div>';
  if (stringAudit.fakeGoodCount > 0) {
    html += renderStaticAdviceWarning(stringAudit, 'strategy');
  }
  html += '<div class="cs-detector-table">';
  html += '<div class="cs-detector-row cs-detector-head"><span>Surface</span><span>From</span><span>To</span><span>Status</span></div>';
  var d = delta.diffs || {};
  var rl = d.recommended_line || {};
  var dl = d.dominant_loss_condition || {};
  html += '<div class="cs-detector-row"><span>Recommended line</span><span>' + _csEsc(rl.from || '-') + '</span><span>' + _csEsc(rl.to || '-') + '</span><span>' + (rl.from !== rl.to ? 'changed' : 'same') + '</span></div>';
  html += '<div class="cs-detector-row"><span>Dominant loss</span><span>' + _csEsc(dl.from || '-') + '</span><span>' + _csEsc(dl.to || '-') + '</span><span>' + (dl.from !== dl.to ? 'changed' : 'same') + '</span></div>';
  html += '<div class="cs-detector-row"><span>Dead moves</span><span>' + _csEsc((d.dead_moves_removed || []).join(', ') || '-') + '</span><span>' + _csEsc((d.dead_moves_added || []).join(', ') || '-') + '</span><span>' + (((d.dead_moves_added || []).length || (d.dead_moves_removed || []).length) ? 'changed' : 'same') + '</span></div>';
  html += '</div>';
  if (fake.length) {
    html += '<h4 class="cs-audit-h4">Fake-good plays</h4>';
    fake.slice(0, 4).forEach(function(f){
      html += '<div class="cs-audit-row"><strong>' + _csEsc(f.pattern) + '</strong> ' + f.occurrences + ' occurrence' + (f.occurrences === 1 ? '' : 's') + ' · ' + _csEsc(f.severity) + '</div>';
    });
  }
  if (behavior.length) {
    html += '<h4 class="cs-audit-h4">Player behavior</h4>';
    behavior.slice(0, 4).forEach(function(p){
      html += '<div class="cs-audit-row"><strong>' + _csEsc(p.pattern) + '</strong> ' + p.occurrences + ' occurrence' + (p.occurrences === 1 ? '' : 's') + ' · ' + _csEsc(p.severity) + '</div>';
    });
  }
  html += '</div></details>';
  return html;
}

function csRenderWeaknessDashboard(report) {
  report = report || {};
  var dash = report.weakness_dashboard || null;
  var html = '<section class="cs-section cs-weakness-dashboard"><h3 class="cs-h3">Personal Weakness Dashboard</h3>';
  if (!dash) {
    html += '<p class="cs-no-data">No weakness dashboard available yet.</p></section>';
    return html;
  }
  if (dash.summary) {
    html += '<p class="cs-explain">' + _csEsc(dash.summary) + '</p>';
  }
  if (Array.isArray(dash.rule_violations) && dash.rule_violations.length) {
    html += '<p class="cs-explain">Rule violations tracked separately in Policy Audit: ' + _csEsc(dash.rule_violations.join(', ')) + '</p>';
  }
  html += '<div class="cs-skill-grid cs-weakness-grid">';
  (dash.sections || []).forEach(function(section){
    html += '<div class="cs-skill-card cs-weakness-card">';
    html +=   '<h4>' + _csEsc(section.title || '') + '</h4>';
    html +=   '<p><strong>' + _csEsc(section.headline || 'No data yet.') + '</strong></p>';
    if (Array.isArray(section.rows) && section.rows.length) {
      html += '<ul class="cs-list">';
      section.rows.forEach(function(row){
        html += '<li><strong>' + _csEsc(row.label || '') + ':</strong> ' + _csEsc(row.value || '') + '</li>';
      });
      html += '</ul>';
    } else if (section.empty) {
      html += '<p class="cs-no-data">' + _csEsc(section.empty) + '</p>';
    }
    if (section.fix) {
      html += '<p><strong>Fix:</strong> ' + _csEsc(section.fix) + '</p>';
    }
    html += '</div>';
  });
  html += '</div></section>';
  return html;
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.phase4e = ChampionsSim.phase4e || {};
  ChampionsSim.phase4e.auditPolicyOutput = auditPolicyOutput;
  ChampionsSim.phase4e.detectFakeGoodPlays = detectFakeGoodPlays;
  ChampionsSim.phase4e.detectPlayerBehaviorPatterns = detectPlayerBehaviorPatterns;
  ChampionsSim.phase4e.auditCoachingDelta = auditCoachingDelta;
  ChampionsSim.phase4e.renderStaticAdviceWarning = renderStaticAdviceWarning;
  ChampionsSim.phase4e.csRenderPolicyAuditSection = csRenderPolicyAuditSection;
  ChampionsSim.phase4e.csRenderWeaknessDashboard = csRenderWeaknessDashboard;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('auditPolicyOutput', auditPolicyOutput);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('detectFakeGoodPlays', detectFakeGoodPlays);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('detectPlayerBehaviorPatterns', detectPlayerBehaviorPatterns);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('auditCoachingDelta', auditCoachingDelta);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderStaticAdviceWarning', renderStaticAdviceWarning);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderPolicyAuditSection', csRenderPolicyAuditSection);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderWeaknessDashboard', csRenderWeaknessDashboard);

// Render the Record bar: overall W-L pill + per-archetype chips. Shown right
// under the adaptive banner on the Strategy tab. No draws surfaced (per user:
// "there no draw in pokemon"). Sorted by sample size so the most-battled
// archetypes lead the bar.
function csRenderRecordBar(history) {
  if (!history) return '';
  var total = history.record_total || { n: 0, w: 0, l: 0, win_rate: 0 };
  var splits = history.record_by_archetype || [];
  function _wrClass(wr, n) {
    if (!n) return 'cs-record-wr-na';
    if (wr >= 0.60) return 'cs-record-wr-good';
    if (wr >= 0.45) return 'cs-record-wr-mid';
    return 'cs-record-wr-bad';
  }
  function _pct(wr) { return Math.round((wr || 0) * 100) + '%'; }
  var html = '';
  html += '<div class="cs-record-bar">';
  html +=   '<div class="cs-record-total ' + _wrClass(total.win_rate, total.n) + '">';
  html +=     '<span class="cs-record-total-label">Record</span>';
  if (total.n > 0) {
    html +=   '<span class="cs-record-total-score">' + total.w + '-' + total.l + '</span>';
    html +=   '<span class="cs-record-total-wr">' + _pct(total.win_rate) + '</span>';
  } else {
    html +=   '<span class="cs-record-total-score">no games yet</span>';
  }
  html +=   '</div>';
  if (splits.length > 0) {
    html += '<div class="cs-record-splits">';
    splits.forEach(function(r){
      html += '<span class="cs-record-chip ' + _wrClass(r.win_rate, r.n) + '" '
           +  'title="' + _csEsc(r.archetype) + ': ' + r.w + '-' + r.l + ' (' + _pct(r.win_rate) + ')">'
           +    '<span class="cs-record-chip-arch">vs ' + _csEsc(r.archetype) + '</span>'
           +    '<span class="cs-record-chip-score">' + r.w + '-' + r.l + '</span>'
           +  '</span>';
    });
    html += '</div>';
  }
  // Empty-state hint: only when there is no per-series data yet. Distinguishes
  // between "you have legacy aggregate sims from before v2.1.6" and "brand
  // new install" so the message is actionable. Refs #53, #55.
  if (total.n === 0) {
    var kind = _csRecordEmptyStateKind();
    var hint;
    if (kind === 'legacy') {
      hint = 'Previous sim data was recorded before per-series tracking (added in v2.1.6). Run a fresh sim to start your record.';
    } else {
      hint = 'Run a sim to start tracking your W-L by matchup.';
    }
    html += '<div class="cs-record-empty-hint">' + _csEsc(hint) + '</div>';
  }
  html += '</div>';
  return html;
}

if (typeof ChampionsSim !== 'undefined') {
  ChampionsSim.strategy.computeTeamHistory = computeTeamHistory;
  ChampionsSim.strategy.csInvalidateTeamHistory = csInvalidateTeamHistory;
  ChampionsSim.strategy.csRenderAdaptiveBanner = csRenderAdaptiveBanner;
  ChampionsSim.strategy.csRenderRecordBar = csRenderRecordBar;
  ChampionsSim.strategy.strategyResultsHash = strategyResultsHash;
  ChampionsSim.strategy.csStrategyReportCacheSize = csStrategyReportCacheSize;
  ChampionsSim.strategy.csClearStrategyReportCache = csClearStrategyReportCache;
}
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('computeTeamHistory', computeTeamHistory);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csInvalidateTeamHistory', csInvalidateTeamHistory);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderAdaptiveBanner', csRenderAdaptiveBanner);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csRenderRecordBar', csRenderRecordBar);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('strategyResultsHash', strategyResultsHash);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csStrategyReportCacheSize', csStrategyReportCacheSize);
if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csClearStrategyReportCache', csClearStrategyReportCache);

// Paint cached report immediately if available. Used as the fast-path on
// team-select change so the user never sees a blank tab between switches.
// Returns true if a cached report was painted, false otherwise.
function renderStrategyTabFromCache(teamKey) {
  var host = getStrategyContentHost();
  if (!host) return false;
  var cached = csLoadReport(teamKey);
  if (!cached) return false;
  // Re-use the same painter - feed it a fake builder by swapping the
  // global lastSimResults? No - cleaner to rerender from the cached
  // object directly. Reuse renderStrategyTab's HTML builder by calling
  // it with a sentinel that short-circuits. Simpler: just call
  // renderStrategyTab(teamKey) which will rebuild from current state.
  // BUT we want the cached paint to be instant. So we paint with an
  // override: temporarily stash the cached report on window and read
  // it inside renderStrategyTab.
  ChampionsSim.state.cachedStrategyOverride = cached;
  try { renderStrategyTab(teamKey); } finally { delete ChampionsSim.state.cachedStrategyOverride; }
  return true;
}

// ---- Auto-rebuild (Section 14, decision 1) --------------------------
// Debounced 500ms. Triggered by team select / import / sim complete.
var _csRebuildTimer = null;
function csScheduleStrategyRebuild() {
  if (_csRebuildTimer) clearTimeout(_csRebuildTimer);
  _csRebuildTimer = setTimeout(function(){
    _csRebuildTimer = null;
    try {
      var key = (typeof currentPlayerKey !== 'undefined') ? currentPlayerKey : null;
      if (key) renderStrategyTab(key);
    } catch(e) { UILog.warn('strategy rebuild failed', e); }
  }, 500);
}

// ---- Wire-up on DOMContentLoaded ------------------------------------
if (typeof window !== 'undefined') {
  function setDbChip(state, detail) {
    var chip = document.getElementById('db-offline-chip');
    if (!chip) return;
    var states = {
      connected: { text: '[DB connected]', bg: '#064e3b', fg: '#bbf7d0', border: '#10b981', title: 'Live team database connected' },
      retrying: { text: '[DB retrying]', bg: '#713f12', fg: '#fef3c7', border: '#f59e0b', title: 'Retrying live team database before falling back' },
      fallback: { text: '[Bundled roster]', bg: '#334155', fg: '#e2e8f0', border: '#94a3b8', title: 'Using bundled roster after live database was unavailable' },
      disabled: { text: '[Local roster]', bg: '#334155', fg: '#e2e8f0', border: '#94a3b8', title: 'Live database disabled or not configured; using bundled roster' },
      offline: { text: '[DB offline]', bg: '#7c2d12', fg: '#fed7aa', border: '#ea580c', title: 'Live database unavailable - using bundled team data' }
    };
    var cfg = states[state] || states.offline;
    chip.style.display = 'inline-block';
    chip.textContent = cfg.text;
    chip.title = detail || cfg.title;
    chip.setAttribute('data-db-state', state || 'offline');
    chip.style.background = cfg.bg;
    chip.style.color = cfg.fg;
    chip.style.borderColor = cfg.border;
  }

  function csDbRetryDelay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function csLoadTeamsFromDbWithRetry(adapter, options) {
    var _adapter = adapter;
    var opts = options || {};
    var attempts = Math.max(1, opts.attempts || 2);
    var delayMs = opts.delayMs == null ? 700 : opts.delayMs;
    var lastStatus = null;
    for (var attempt = 1; attempt <= attempts; attempt++) {
      if (attempt > 1) setDbChip('retrying', 'Live team database retry ' + attempt + ' of ' + attempts + ' before using bundled roster.');
      var dbTeams = await _adapter.loadTeamsFromDB();
      if (dbTeams && Object.keys(dbTeams).length) {
        return { teams: dbTeams, attempts: attempt, status: (_adapter.getLastTeamLoadStatus ? _adapter.getLastTeamLoadStatus() : null) };
      }
      lastStatus = _adapter.getLastTeamLoadStatus ? _adapter.getLastTeamLoadStatus() : null;
      if (attempt < attempts) await csDbRetryDelay(delayMs);
    }
    return { teams: null, attempts: attempts, status: lastStatus };
  }

  if (typeof ChampionsSim !== 'undefined') {
    ChampionsSim.strategy.csBuildStrategyReportV2 = csBuildStrategyReportV2;
    ChampionsSim.strategy.renderStrategyTab = renderStrategyTab;
    ChampionsSim.strategy.csScheduleStrategyRebuild = csScheduleStrategyRebuild;
  }
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csBuildStrategyReportV2', csBuildStrategyReportV2);
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('renderStrategyTab', renderStrategyTab);
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('csScheduleStrategyRebuild', csScheduleStrategyRebuild);

  // Hook the existing tab-nav click and player-select change after DOM is ready
  document.addEventListener('DOMContentLoaded', async function(){
    csApplyReleaseManifestToHeader();
    csInitPublicSecurityDelegates();
    var didHardenClientState = await csHardenClientState();
    if (didHardenClientState && csReloadAfterBuildCacheReset(csGetBuildId())) return;
    _csInitEvidenceToggle();
    csInitReplayCoachUi();
    renderOverviewTab();

    // ── M3 — DB init: source-of-truth merge ────────────────────────────────
    // Await loadTeamsFromDB BEFORE the first authoritative rebuildTeamSelects()
    // so that there's no flash of static-only teams. DB rows win on collision.
    // On failure / empty / disabled adapter, surface the [DB offline] chip and
    // keep the bundled TEAMS fallback intact.
    try {
      var _adapter = getWindowValue('SupabaseAdapter', null);
      if (_adapter && _adapter.enabled && typeof _adapter.loadTeamsFromDB === 'function') {
        var dbLoad = await csLoadTeamsFromDbWithRetry(_adapter, { attempts: 2, delayMs: 700 });
        var dbTeams = dbLoad.teams;
        if (dbTeams && Object.keys(dbTeams).length && typeof TEAMS !== 'undefined') {
          var dbMerge = (typeof mergeDbTeamsIntoCatalog === 'function')
            ? mergeDbTeamsIntoCatalog(dbTeams)
            : { added: 0, replaced: Object.keys(dbTeams).length, skipped: 0, blocked: [] };
          if (typeof mergeDbTeamsIntoCatalog !== 'function') Object.assign(TEAMS, dbTeams);
          if (typeof normalizeTeamCatalogForSim === 'function') normalizeTeamCatalogForSim();
          UILog.info('TEAMS patched with DB teams', { count: Object.keys(dbTeams).length, merge: dbMerge, attempts: dbLoad.attempts, status: dbLoad.status });
          setDbChip('connected', 'Live team database connected after ' + dbLoad.attempts + ' attempt(s) - accepted ' + (dbMerge.added + dbMerge.replaced) + ' teams, blocked ' + dbMerge.skipped + ' stale/illegal rows');
        } else {
          var status = dbLoad && dbLoad.status ? dbLoad.status : null;
          var reason = status && status.detail ? ' Last DB status: ' + status.detail : '';
          setDbChip('fallback', 'Live team database did not return teams after ' + (dbLoad ? dbLoad.attempts : 1) + ' attempt(s); using bundled roster.' + reason);
          UILog.info('DB returned no teams after retry; using bundled roster data', { attempts: dbLoad && dbLoad.attempts, status: status });
        }
      } else {
        // Adapter disabled (no creds / __DISABLE_SUPABASE__) → surface chip
        setDbChip('disabled', 'Live team database is not configured in this build - using bundled roster data');
        UILog.info('SupabaseAdapter disabled; using bundled roster data');
      }
    } catch (_dbErr) {
      setDbChip('offline', 'Supabase load failed: ' + ((_dbErr && _dbErr.message) || 'unknown error'));
      UILog.warn('loadTeamsFromDB threw; using bundled roster data', _dbErr);
    }

    // Authoritative rebuild AFTER DB merge (or fallback) is settled.
    if (typeof rebuildTeamSelects === 'function') {
      try { rebuildTeamSelects(); } catch (_e) { /* fail-soft */ }
    }

    // On fresh origins with no prior local sim history, paint one seeded board
    // so the first-load website experience matches the local board-first view.
    try { setTimeout(function(){ csBootstrapSimulatorBoard(); }, 50); } catch (_e) {}

    // Render when Strategy tab is opened
    document.querySelectorAll('.tab-btn[data-tab="strategy"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        try { renderStrategyTab(currentPlayerKey); } catch(e) {}
      });
    });

    document.querySelectorAll('.tab-btn[data-tab="overview"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        try { renderOverviewTab(); } catch(e) {}
      });
    });

    // Auto-rebuild on player-select change
    var sel = document.getElementById('player-select');
    if (sel) sel.addEventListener('change', function(){ csScheduleStrategyRebuild(); });
  });
}

// Expose for tests
if (typeof window !== 'undefined') {
  var t9j16Exports = {
    teamSignature: teamSignature,
    inferTeamIdentity: inferTeamIdentity,
    buildLeadRecoveryPlan: buildLeadRecoveryPlan,
    evaluateT9j16Rules: evaluateT9j16Rules,
    analyzeEliteDecisions: analyzeEliteDecisions,
    buildPilotPlan: buildPilotPlan,
    buildMatchupWarnings: buildMatchupWarnings,
    buildCoachingSummary: buildCoachingSummary,
    buildStrategyReport: buildStrategyReport,
    saveStrategyReport: saveStrategyReport,
    loadStrategyReport: loadStrategyReport,
    evolveReport: evolveReport,
    autoSave: t9j16AutoSave,
    rules: T9J16_RULES
  };
  if (typeof ChampionsSim !== 'undefined') ChampionsSim.tests.T9J16 = t9j16Exports;
  if (typeof exposeLegacyWindowAlias === 'function') exposeLegacyWindowAlias('T9J16', t9j16Exports);
}
