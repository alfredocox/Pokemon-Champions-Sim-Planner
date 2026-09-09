import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mapOfficialRoster } from './regulation-roster-mapping.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function diffRows(before, after) {
  const index = rows => {
    const map = new Map();
    for (const row of rows) {
      if (!row.id || map.has(row.id)) throw new Error('Missing or duplicate canonical identity');
      map.set(row.id, row);
    }
    return map;
  };
  const a = index(before), b = index(after);
  return {
    added: [...b.keys()].filter(id => !a.has(id)).sort(cmp).map(id => b.get(id)),
    removed: [...a.keys()].filter(id => !b.has(id)).sort(cmp).map(id => a.get(id)),
    changed: [...a.keys()].filter(id => b.has(id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
      .sort(cmp).map(id => ({ id, before: a.get(id), after: b.get(id) }))
  };
}

export function capture(upstream, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit || '')) throw new Error('Exact upstream commit required');
  const git = args => execFileSync('git', ['-C', upstream, ...args], { encoding: 'utf8' }).trim();
  if (git(['rev-parse', 'HEAD']) !== commit) throw new Error('Upstream revision mismatch');
  if (git(['status', '--porcelain', '--untracked-files=no'])) throw new Error('Modified upstream source');
  const require = createRequire(pathToFileURL(path.join(upstream, 'package.json')));
  const { Dex, TeamValidator } = require('./dist/sim/index.js');
  const formats = ['gen9championsbssregmc', 'gen9championsvgc2026regmc', 'gen9championsvgc2026regmcbo3',
    'gen9championsbssregmb', 'gen9championsvgc2026regmb', 'gen9championsvgc2026regmbbo3'];
  const formatRows = formats.map(id => {
    const row = Dex.formats.get(id);
    const expected = id.includes('regmc') ? 'champions' : 'championsregmb';
    if (!row.exists || row.mod !== expected) throw new Error('Missing or mismapped reference format: ' + id);
    return { id: row.id, name: row.name, mod: row.mod, game_type: row.gameType || 'singles', ruleset: row.ruleset };
  });
  const rows = mod => {
    const dex = Dex.mod(mod);
    return {
      // Availability markers are not a full team-legality verdict.
      species: dex.species.all().filter(s => s.exists && !s.isNonstandard).map(s => ({
        id: s.id, name: s.name, base_species: s.baseSpecies, types: s.types, stats: s.baseStats,
        abilities: s.abilities, required_item: s.requiredItem || null,
        moves: [...dex.species.getMovePool(s.id)].sort(cmp)
      })).sort((a, b) => cmp(a.id, b.id)),
      items: dex.items.all().filter(i => i.exists && !i.isNonstandard).map(i => ({
        id: i.id, name: i.name, mega_stone: i.megaStone || null, mega_evolves: i.megaEvolves || null
      })).sort((a, b) => cmp(a.id, b.id))
    };
  };
  const mb = rows('championsregmb'), mc = rows('champions');
  const officialBytes = fs.readFileSync(new URL('../source/reg-m-c-official-roster.json', import.meta.url));
  const official = JSON.parse(officialBytes);
  const mappings = mapOfficialRoster(official, Object.fromEntries(Dex.mod('champions').species.all().map(s => [s.name, s])));
  const probeSets = [
    { species: 'Rillaboom', ability: 'Grassy Surge', item: '', moves: ['Fake Out'] },
    { species: 'Salamence', ability: 'Intimidate', item: 'Salamencite', moves: ['Protect'] },
    { species: 'Golisopod', ability: 'Emergency Exit', item: 'Golisopite', moves: ['Protect'] },
    { species: 'Baxcalibur', ability: 'Thermal Exchange', item: 'Baxcalibrite', moves: ['Protect'] },
    { species: 'Absol', ability: 'Super Luck', item: 'Absolite Z', moves: ['Protect'] },
    { species: 'Garchomp', ability: 'Rough Skin', item: 'Garchompite Z', moves: ['Protect'] },
    { species: 'Lucario', ability: 'Inner Focus', item: 'Lucarionite Z', moves: ['Protect'] }
  ];
  const probes = formats.map(format => {
    const validator = new TeamValidator(format);
    return { format, sets: probeSets.map(input => {
      const set = { ...input, level: 50, nature: 'Serious', evs: { hp: 32, atk: 32, def: 0, spa: 0, spd: 0, spe: 2 },
        moves: [...input.moves] };
      const registeredInput = structuredClone(set);
      const errors = validator.validateSet(set) || [];
      if ((errors.length === 0) !== format.includes('regmc')) throw new Error('Unexpected validator probe outcome: ' + format + ' ' + input.species + ': ' + errors.join('; '));
      const replayErrors = validator.validateSet(structuredClone(registeredInput)) || [];
      if (JSON.stringify(replayErrors) !== JSON.stringify(errors)) throw new Error('Saved probe input does not reproduce: ' + format);
      return { input: registeredInput, errors, accepted: errors.length === 0 };
    }) };
  });
  const files = git(['ls-files']).split('\n').filter(f => /^(sim|data|config)\//.test(f) || ['package-lock.json', 'tools/build-utils.js'].includes(f));
  const sourceHashes = Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(path.join(upstream, f)).toString('utf8').replace(/\r\n/g, '\n'))]));
  const compiledFiles = fs.readdirSync(path.join(upstream, 'dist'), { recursive: true })
    .filter(f => f.endsWith('.js')).sort(cmp);
  const compiledHashes = Object.fromEntries(compiledFiles.map(f => [f.replaceAll('\\', '/'), sha(fs.readFileSync(path.join(upstream, 'dist', f)))]));
  return {
    schema_version: 'champions-mc-reference-intake-v1', upstream_commit: commit,
    source_fingerprint: sha(JSON.stringify(sourceHashes)), compiled_fingerprint: sha(JSON.stringify(compiledHashes)),
    mapping_tool_sha256: sha(fs.readFileSync(new URL('./regulation-roster-mapping.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n')),
    official_capture_sha256: sha(officialBytes), official_identity_candidates: mappings,
    competitive_use: false, learning_eligible: false, official_roster_verified: false,
    scope: 'Pinned upstream availability markers and individual-set validator probes; not official roster or complete team approval',
    formats: formatRows,
    counts: { mb_species: mb.species.length, mc_species: mc.species.length, mb_items: mb.items.length, mc_items: mc.items.length },
    species: diffRows(mb.species, mc.species), items: diffRows(mb.items, mc.items), probes
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [upstream, commit, output] = process.argv.slice(2);
  if (!upstream || !commit || !output || process.argv.length !== 5) throw new Error('Usage: node audit-mc-reference.mjs <compiled-upstream> <commit> <output-json>');
  const report = capture(path.resolve(upstream), commit);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ counts: report.counts, added_species: report.species.added.map(x => x.name), added_items: report.items.added.map(x => x.name) }, null, 2));
}
