// Pass this function to the supported browser's DOM-only evaluate method.
export function captureVisibleReplay() {
  const cards = Array.from(document.querySelectorAll('.replay-card.open'))
    .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  if (cards.length !== 1) throw new Error('Open exactly one visible replay before capture');
  const card = cards[0];
  const text = el => el ? el.innerText.trim() : '';
  const mons = root => Array.from(root?.querySelectorAll('.replay-stadium-mon') || []).map(mon => ({
    name: text(mon.querySelector('.replay-roster-mon-head strong')),
    status: text(mon.querySelector('.replay-roster-status')),
    hp: text(Array.from(mon.querySelectorAll('.replay-roster-meta')).find(el => text(el).startsWith('HP:'))),
    hp_bar: mon.querySelector('.replay-hp-track span')?.style.width || '',
    metadata: Array.from(mon.querySelectorAll('.replay-roster-meta')).map(text),
    sprite_loaded: !!mon.querySelector('img')?.naturalWidth
  }));
  return {
    schema_version: 'champions-visible-replay-v1', captured_at: new Date().toISOString(),
    url: location.href, banner: text(document.querySelector('h1')),
    renderer_build_id: text(document.querySelector('#build-version')),
    title: text(card.querySelector('.replay-title')), meta: text(card.querySelector('.replay-meta')),
    boards: Array.from(card.querySelectorAll('.replay-stadium')).map(board => {
      const reserves = Array.from(board.querySelectorAll('.replay-stadium-zone.off-field'));
      return {
        label: text(board.querySelector('.replay-stadium-title')),
        player: mons(board.querySelector('.replay-stadium-player')).concat(mons(reserves.find(el => text(el.querySelector('span')).toLowerCase().startsWith('your team')))),
        opponent: mons(board.querySelector('.replay-stadium-opponent')).concat(mons(reserves.find(el => text(el.querySelector('span')).toLowerCase().startsWith('their team')))),
        field: Array.from(board.querySelectorAll('.replay-field-tags .replay-effect-tag')).map(text)
      };
    }),
    turns: Array.from(card.querySelectorAll('.replay-turn-row')).map(row => ({
      label: text(row.querySelector('.replay-turn-main strong')),
      lines: Array.from(row.querySelectorAll('.replay-play-row b')).map(text)
    }))
  };
}
