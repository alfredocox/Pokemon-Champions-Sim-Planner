// Species/form learnset legality checks from generated Pokemon Showdown data.

require('../generated/pokemon_showdown_legal_data.js');
const moveLegality = require('../move_legality.js');
const auditData = require('../generated/pokemon_showdown_legal_data.js');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== move legality tests ===\n');

T('1. Arcanine and Arcanine-Hisui have distinct learnset data', () => {
  const regular = Object.keys(auditData.species.Arcanine.moves || {}).sort().join(',');
  const hisui = Object.keys(auditData.species['Arcanine-Hisui'].moves || {}).sort().join(',');
  truthy(regular.length > 0, 'Arcanine moves missing');
  truthy(hisui.length > 0, 'Arcanine-Hisui moves missing');
  truthy(regular !== hisui, 'Arcanine forms should not share identical generated move lists');
});

T('2. Hisuian Arcanine alias resolves to Arcanine-Hisui', () => {
  eq(moveLegality.canonicalSpeciesKey('Hisuian Arcanine'), 'Arcanine-Hisui', 'Hisuian alias');
  eq(moveLegality.canonicalSpeciesKey('Arcanine Hisui'), 'Arcanine-Hisui', 'space suffix alias');
  eq(moveLegality.canonicalSpeciesKey('Arcanine-Hisui'), 'Arcanine-Hisui', 'dash alias');
});

T('3. Hisuian-only move is not borrowed by plain Arcanine', () => {
  eq(moveLegality.isMoveLegalForSpecies('Arcanine-Hisui', 'Raging Fury').legal, true, 'Raging Fury should be legal for Hisui');
  eq(moveLegality.isMoveLegalForSpecies('Arcanine', 'Raging Fury').legal, false, 'Raging Fury should not be legal for plain Arcanine');
});

T('4. Illegal known move returns legal=false with reason', () => {
  const out = moveLegality.isMoveLegalForSpecies('Arcanine-Hisui', 'Surf');
  eq(out.legal, false, 'Surf legal flag');
  eq(out.reason, 'not_in_species_form_learnset', 'Surf reason');
});

T('5. Unknown move returns legal=false with reason', () => {
  const out = moveLegality.isMoveLegalForSpecies('Arcanine', 'Definitely Not A Move');
  eq(out.legal, false, 'unknown legal flag');
  eq(out.reason, 'unknown_move', 'unknown reason');
});

T('6. Mega Kangaskhan uses Kangaskhan learnset', () => {
  const out = moveLegality.isMoveLegalForSpecies('Kangaskhan-Mega', 'Fake Out');
  eq(out.legal, true, 'Fake Out legal');
  eq(out.inheritedFrom, 'Kangaskhan', 'Mega learnset inheritance');
});

T('7. gendered forms remain distinct', () => {
  eq(moveLegality.canonicalSpeciesKey('Nidoran-F'), 'Nidoran-F', 'Nidoran-F');
  eq(moveLegality.canonicalSpeciesKey('Nidoran-M'), 'Nidoran-M', 'Nidoran-M');
  eq(moveLegality.canonicalSpeciesKey('Indeedee-F'), 'Indeedee-F', 'Indeedee-F');
  eq(moveLegality.canonicalSpeciesKey('Indeedee-M'), 'Indeedee-M', 'Indeedee-M');
  eq(moveLegality.canonicalSpeciesKey('Meowstic-F'), 'Meowstic-F', 'Meowstic-F');
  eq(moveLegality.canonicalSpeciesKey('Meowstic-M'), 'Meowstic-M', 'Meowstic-M');
});

T('8. Rotom appliance forms keep form identity while accepting explicit shared Rotom learnset moves', () => {
  const exact = moveLegality.isMoveLegalForSpecies('Rotom-Wash', 'Hydro Pump');
  eq(exact.legal, true, 'Hydro Pump should be legal for exact Rotom-Wash form');
  eq(exact.canonicalSpeciesKey, 'Rotom-Wash', 'Rotom-Wash identity');
  eq(exact.inheritedFrom, '', 'form-exclusive move should not be marked inherited');

  const shared = moveLegality.isMoveLegalForSpecies('Rotom-Wash', 'Protect');
  eq(shared.legal, true, 'Protect should be legal through shared Rotom learnset');
  eq(shared.canonicalSpeciesKey, 'Rotom-Wash', 'Rotom-Wash should not collapse to Rotom');
  eq(shared.inheritedFrom, 'Rotom', 'shared move should name base learnset supplement');

  const hisui = moveLegality.isMoveLegalForSpecies('Arcanine', 'Raging Fury');
  eq(hisui.legal, false, 'regional-form moves must not be globally shared');
});

T('9. Champion Eternal Flower Mega keeps app form identity for move legality aliases', () => {
  const out = moveLegality.isMoveLegalForSpecies('Floette (Eternal Flower)-Mega', 'Light of Ruin');
  eq(out.legal, true, 'Light of Ruin should validate for Champion Eternal Flower Mega');
  eq(out.canonicalSpeciesKey, 'Floette (Eternal Flower)-Mega', 'Champion Mega form identity should be preserved');
  eq(out.inheritedFrom, 'Floette-Eternal', 'Light of Ruin should come from Eternal Flower learnset');
});

T('10. legal move display list is species-specific for editor suggestions', () => {
  const moves = moveLegality.legalMoveDisplayNamesForSpecies('Arcanine');
  truthy(moves.includes('Protect'), 'Arcanine legal suggestions should include Protect');
  truthy(!moves.includes('Surf'), 'Arcanine legal suggestions should not include Surf');
});

console.log(`\nmove legality: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
