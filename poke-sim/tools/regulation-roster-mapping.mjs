// Review-only identity mapping. It neither approves eligibility nor mutates teams.
const FORM_ALIASES = Object.freeze({
  '0026-001': ['Raichu (Alolan Form)', 'Raichu-Alola'],
  '0038-001': ['Ninetales (Alolan Form)', 'Ninetales-Alola'],
  '0053-001': ['Persian (Alolan Form)', 'Persian-Alola'],
  '0059-001': ['Arcanine (Hisuian Form)', 'Arcanine-Hisui'],
  '0080-002': ['Slowbro (Galarian Form)', 'Slowbro-Galar'],
  '0128-001': ['Tauros (Paldean Form (Combat Breed))', 'Tauros-Paldea-Combat'],
  '0128-002': ['Tauros (Paldean Form (Blaze Breed))', 'Tauros-Paldea-Blaze'],
  '0128-003': ['Tauros (Paldean Form (Aqua Breed))', 'Tauros-Paldea-Aqua'],
  '0157-001': ['Typhlosion (Hisuian Form)', 'Typhlosion-Hisui'],
  '0199-001': ['Slowking (Galarian Form)', 'Slowking-Galar'],
  '0479-000': ['Rotom (Rotom)', 'Rotom'],
  '0479-001': ['Rotom (Heat Rotom)', 'Rotom-Heat'],
  '0479-002': ['Rotom (Wash Rotom)', 'Rotom-Wash'],
  '0479-003': ['Rotom (Frost Rotom)', 'Rotom-Frost'],
  '0479-004': ['Rotom (Fan Rotom)', 'Rotom-Fan'],
  '0479-005': ['Rotom (Mow Rotom)', 'Rotom-Mow'],
  '0503-001': ['Samurott (Hisuian Form)', 'Samurott-Hisui'],
  '0571-001': ['Zoroark (Hisuian Form)', 'Zoroark-Hisui'],
  '0618-001': ['Stunfisk (Galarian Form)', 'Stunfisk-Galar'],
  // Exact official sprite/label reconciliation: source/reg-m-b-form-identity-evidence.json.
  '0666-018': ['Vivillon', 'Vivillon-Fancy'],
  '0670-005': ['Floette', 'Floette-Eternal'],
  '0678-000': ['Meowstic (Male)', 'Meowstic'],
  '0678-001': ['Meowstic (Female)', 'Meowstic-F'],
  '0706-001': ['Goodra (Hisuian Form)', 'Goodra-Hisui'],
  '0711-000': ['Gourgeist (Medium Variety)', 'Gourgeist'],
  '0711-001': ['Gourgeist (Small Variety)', 'Gourgeist-Small'],
  '0711-002': ['Gourgeist (Large Variety)', 'Gourgeist-Large'],
  '0711-003': ['Gourgeist (Jumbo Variety)', 'Gourgeist-Super'],
  '0713-001': ['Avalugg (Hisuian Form)', 'Avalugg-Hisui'],
  '0724-001': ['Decidueye (Hisuian Form)', 'Decidueye-Hisui'],
  '0745-000': ['Lycanroc (Midday Form)', 'Lycanroc'],
  '0745-001': ['Lycanroc (Midnight Form)', 'Lycanroc-Midnight'],
  '0745-002': ['Lycanroc (Dusk Form)', 'Lycanroc-Dusk'],
  // Explicit form labels in the September 9 official M-C roster capture.
  '0849-000': ['Toxtricity (Amped Form)', 'Toxtricity'],
  '0849-001': ['Toxtricity (Low Key Form)', 'Toxtricity-Low-Key'],
  '0876-000': ['Indeedee (Male)', 'Indeedee'],
  '0876-001': ['Indeedee (Female)', 'Indeedee-F'],
  '0902-000': ['Basculegion (Male)', 'Basculegion'],
  '0902-001': ['Basculegion (Female)', 'Basculegion-F']
});

export function mapOfficialRoster(capture, species) {
  if (capture?.schema_version !== 'champions-official-roster-capture-v1' || !Array.isArray(capture.rows) || !capture.rows.length || !species) throw new Error('Invalid source capture or baseline');
  const ids = new Set();
  const targets = new Set();
  return capture.rows.map(row => {
    if (!/^\d{4}-\d{3}$/.test(row?.official_id) || typeof row.label !== 'string' || !row.label || typeof row.eligible !== 'boolean' || ids.has(row.official_id)) throw new Error('Invalid or duplicate official identity');
    ids.add(row.official_id);
    const result = { official_id: row.official_id, official_label: row.label, eligible_in_capture: row.eligible, runtime_species_key: null, status: 'needs_identity_review', competitive_use: false };
    if (!row.eligible) return { ...result, status: 'excluded_by_source' };
    const alias = FORM_ALIASES[row.official_id];
    if (alias && alias[0] !== row.label) return { ...result, reason: 'official_label_changed' };
    if (!alias && !row.official_id.endsWith('-000')) return { ...result, reason: 'nondefault_form_requires_explicit_mapping' };
    const key = alias ? alias[1] : row.label;
    const candidate = Object.hasOwn(species, key) ? species[key] : null;
    if (!candidate || candidate.num !== Number(row.official_id.slice(0, 4))) return { ...result, reason: 'baseline_missing_or_dex_number_mismatch' };
    if (!alias && candidate.baseSpecies !== key) return { ...result, reason: 'default_id_cannot_resolve_to_alternate_form' };
    if (candidate.battleOnly) return { ...result, reason: 'battle_only_form_cannot_be_registered' };
    if (targets.has(key)) throw new Error('Two official identities collapse into one runtime form');
    targets.add(key);
    return {
      ...result, runtime_species_key: key, status: 'baseline_identity_candidate',
      mapping_basis: alias ? 'explicit_id_and_label_alias' : 'exact_label_and_dex_number',
      baseline_metadata: { id: candidate.id, base_species: candidate.baseSpecies, forme: candidate.forme || '', is_nonstandard: candidate.isNonstandard || '' },
      baseline_metadata_scope: 'Mirrored baseline metadata, not Champions regulation legality'
    };
  });
}
