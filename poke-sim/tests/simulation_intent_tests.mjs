import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ui = readFileSync(new URL('../ui.js', import.meta.url), 'utf8');
test('fresh-page initialization has no synthetic starter-series writer', () => {
  assert(!ui.includes('csBootstrapSimulatorBoard'), 'Page initialization must not run and persist a hidden series');
  assert(!ui.includes('csShouldBootstrapSimulatorBoard'), 'Remove the unused automatic-run eligibility path');
});
test('explicit simulation controls retain their user-triggered execution path', () => {
  assert(ui.includes("document.getElementById('run-sim-btn')?.addEventListener('click', async function()"));
  assert(ui.includes('const res = await runBoSeries(n,playerKey,oppKey,bo,'));
});
