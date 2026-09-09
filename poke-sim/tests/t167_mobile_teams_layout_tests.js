// Issue #96 - mobile teams page layout must stay readable and contained.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== mobile teams layout tests ===\n');

T('1. teams page uses a dedicated actions row', () => {
  inc(html, '<div class="teams-actions">');
  inc(css, '.teams-tab-header{display:flex;flex-direction:column;gap:var(--sp3);margin-bottom:var(--sp4)}');
  inc(css, '.teams-actions{margin-bottom:var(--sp4);display:flex;gap:var(--sp3)}');
});

T('2. team cards collapse cleanly on mobile', () => {
  inc(css, '@media(max-width:620px){');
  inc(css, '.teams-actions{width:100%;flex-direction:column;margin-bottom:0}');
  inc(css, '.teams-actions .btn-secondary{width:100%;justify-content:center}');
  inc(css, '.teams-grid{grid-template-columns:1fr;gap:var(--sp4)}');
  inc(css, '.team-full-card{padding:var(--sp4)}');
  inc(css, '.tfcard-header{flex-direction:column;align-items:flex-start;gap:6px}');
  inc(css, '.tfcard-badges{width:100%;align-items:flex-start}');
});

T('2b. compact desktop keeps a multi-column Teams grid', () => {
  inc(css, '@media(max-width:900px) and (hover:hover) and (pointer:fine){');
  inc(css, '.teams-tab-header{');
  inc(css, 'flex-direction:row;');
  inc(css, '.teams-actions{');
  inc(css, 'width:auto;');
  inc(css, '.teams-grid{');
  inc(css, 'grid-template-columns:repeat(auto-fill,minmax(320px,1fr));');
  inc(css, '.tfcard-header{');
  inc(css, 'flex-direction:row;');
});

T('3. move rows and export buttons can wrap on small screens', () => {
  inc(css, '.poke-full-row,.bring-pool-row{flex-wrap:wrap;align-items:flex-start}');
  inc(css, '.poke-full-sprite{width:40px;height:40px}');
  inc(css, '.move-tags{width:100%}');
  inc(css, '.export-card-btn{width:100%;justify-content:center}');
});

T('4. modal shells keep mobile-safe focus and spacing rules', () => {
  inc(css, '.modal-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-xl);padding:var(--sp5);max-width:580px;width:100%;max-height:92vh;max-height:92dvh;overflow-y:auto;box-shadow:var(--sh-lg);padding-bottom:max(var(--sp5),env(safe-area-inset-bottom))}');
  inc(css, '.modal-box:focus{outline:none}');
  inc(css, '.sources-content #sources-list{overflow-x:auto;-webkit-overflow-scrolling:touch}');
});

console.log(`\nmobile teams layout: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
