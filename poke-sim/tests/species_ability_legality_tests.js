const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { window: {} };
ctx.self = ctx.window;
ctx.globalThis = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'generated', 'pokemon_showdown_legal_data.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'move_legality.js'), 'utf8'), ctx);

const api = ctx.window.ChampionsSim.moveLegality;
let pass = 0;
function check(name, condition) {
  if (!condition) throw new Error(name);
  pass += 1;
}

check('base species accepts a source-listed Ability', api.isAbilityLegalForSpecies('Charizard', 'Blaze').legal === true);
const mismatch = api.isAbilityLegalForSpecies('Charizard', 'Intimidate');
check('real Ability on the wrong species is rejected', mismatch.legal === false && mismatch.reason === 'not_in_species_form_abilities');
check('unknown Ability is rejected', api.isAbilityLegalForSpecies('Charizard', 'Invented Power').reason === 'unknown_ability');
check('exact form Ability is enforced', api.isAbilityLegalForSpecies('Charizard-Mega-Y', 'Drought').legal === true);
check('Champion-specific generated Mega Ability is accepted', api.isAbilityLegalForSpecies('Feraligatr-Mega', 'Dragonize').legal === true);
check('set helper validates the member Ability', api.validateAbilityForSet({ name: 'Pikachu', ability: 'Blaze' }).legal === false);

const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
check('shared import/editor gate invokes registration-aware Ability validation', ui.includes('api.validateAbilityForSet(abilityMember || {})'));
check('species Ability mismatch is a hard import error', ui.includes("abilityCheck.reason === 'not_in_species_form_abilities'"));

console.log(`species Ability legality: ${pass} pass, 0 fail`);
