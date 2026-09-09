// Isolated reference-only drafts. Does not publish teams or approve regulations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const upstream = path.join(root, 'artifacts/showdown-mc-reference');
const pin = 'efe4948570d5e8189751792136d26e71710c6c66';
assert.equal(execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin);
assert.equal(execFileSync('git', ['-C', upstream, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(), '');
const { Dex, TeamValidator, Battle, BattleStream, getPlayerStreams, Teams } = require(path.join(upstream, 'dist/sim'));
const { RandomPlayerAI } = require(path.join(upstream, 'dist/sim/tools/random-player-ai'));
const format = 'gen9championsvgc2026regmc';
const dex = Dex.mod('champions');
assert.equal(Dex.formats.get(format).mod, 'champions');
const compiledFiles = fs.readdirSync(path.join(upstream, 'dist'), {recursive:true}).filter(f=>f.endsWith('.js')).sort((a,b)=>a<b?-1:a>b?1:0);
const compiledHashes = Object.fromEntries(compiledFiles.map(f=>[f.replaceAll('\\','/'),createHash('sha256').update(fs.readFileSync(path.join(upstream,'dist',f))).digest('hex')]));
const compiledFingerprint = createHash('sha256').update(JSON.stringify(compiledHashes)).digest('hex');
// Upstream copies this tracked JS file verbatim; Git's CRLF checkout is not a mechanics change.
// Every transpiled JS byte remains exact. Preserve the raw fingerprint as well.
const canonicalHashes = {...compiledHashes};
canonicalHashes['config/config-example.js'] = createHash('sha256').update(fs.readFileSync(path.join(upstream,'dist/config/config-example.js'),'utf8').replace(/\r\n/g,'\n')).digest('hex');
const canonicalFingerprint = createHash('sha256').update(JSON.stringify(canonicalHashes)).digest('hex');
assert.equal(canonicalFingerprint,'2ac4f2a3fd74a17a1509ebb5e1b191c55a7bf9292dfe76c2a0da468a411c59ad');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'source/reg-m-c-reference-intake.json'))).upstream_commit,pin);
const set = (species, item, ability, nature, moves, points) => ({ species, name: species, item, ability, nature,
  level: 50, moves: moves.split('/'), evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...points } });
const rilla = () => set('Rillaboom', 'Miracle Seed', 'Grassy Surge', 'Adamant', 'Fake Out/Grassy Glide/Wood Hammer/U-turn', {hp:32,atk:32,spe:2});
const incin = () => set('Incineroar', 'Sitrus Berry', 'Intimidate', 'Careful', 'Fake Out/Flare Blitz/Parting Shot/Throat Chop', {hp:32,def:16,spd:18});
const gold = () => set('Gholdengo', 'Spell Tag', 'Good as Gold', 'Modest', 'Make It Rain/Shadow Ball/Nasty Plot/Protect', {hp:2,spa:32,spe:32});
const drafts = [
  {id:'mc-draft-salamence-balance', name:'M-C DRAFT - Salamence Balance', team:[
    set('Salamence','Salamencite','Intimidate','Jolly','Double-Edge/Dragon Dance/Tailwind/Protect',{hp:2,atk:32,spe:32}),
    rilla(), incin(),
    set('Rotom-Wash','Leftovers','Levitate','Modest','Hydro Pump/Thunderbolt/Will-O-Wisp/Protect',{hp:32,spa:32,spe:2}),
    gold(), set('Whimsicott','Focus Sash','Prankster','Timid','Tailwind/Moonblast/Encore/Protect',{hp:2,spa:32,spe:32})]},
  {id:'mc-draft-golisopod-rain', name:'M-C DRAFT - Golisopod Rain', team:[
    set('Golisopod','Golisopite','Emergency Exit','Adamant','First Impression/Liquidation/Leech Life/Protect',{hp:32,atk:32,spd:2}),
    set('Pelipper','Focus Sash','Drizzle','Modest','Weather Ball/Hurricane/Tailwind/Protect',{hp:2,spa:32,spe:32}),
    set('Archaludon','Metal Coat','Stamina','Modest','Electro Shot/Flash Cannon/Dragon Pulse/Protect',{hp:32,spa:32,spd:2}),
    rilla(), gold(), incin()]},
  {id:'mc-draft-baxcalibur-snow', name:'M-C DRAFT - Baxcalibur Snow', team:[
    set('Baxcalibur','Baxcalibrite','Thermal Exchange','Jolly','Icicle Crash/Glaive Rush/Dragon Dance/Protect',{hp:2,atk:32,spe:32}),
    set('Ninetales-Alola','Light Clay','Snow Warning','Timid','Aurora Veil/Blizzard/Moonblast/Protect',{hp:2,spa:32,spe:32}),
    incin(), gold(), rilla(),
    set('Rotom-Wash','Leftovers','Levitate','Modest','Hydro Pump/Thunderbolt/Will-O-Wisp/Protect',{hp:32,spa:32,spe:2})]}
];
const output = path.join(root, 'artifacts/mc-draft-teams');
fs.mkdirSync(output, {recursive:true});
const report = {schema_version:1, upstream_commit:pin, compiled_fingerprint:compiledFingerprint, canonical_compiled_fingerprint:canonicalFingerprint,
  fingerprint_normalization:'Only config/config-example.js CRLF -> LF; all other compiled JS bytes unchanged', format, competitive_use:false, learning_eligible:false,
  scope:'Authored experimental doubles drafts; pinned Showdown validation/stat checks and random-policy reference battles, NOT app parity or game verification',
  point_encoding:'evs fields below contain Champions SP, NOT main-series EVs; do not import into the old live site',
  sources:['https://champions-news.pokemon-home.com/en/page/816.html', 'https://www.pokemon.com/us/news/get-ready-for-regulation-set-m-c-in-pokemon-champions'],
  teams:[], games:[]};
function expectedStats(s, species) {
  const nature = dex.natures.get(s.nature);
  return Object.fromEntries(Object.entries(species.baseStats).map(([stat,base]) => {
    const n = base + s.evs[stat] + (stat === 'hp' ? 75 : 20);
    return [stat, stat === 'hp' ? n : Math.floor(n * (nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1))];
  }));
}
for (const draft of drafts) {
  const errors = new TeamValidator(format).validateTeam(structuredClone(draft.team)) || [];
  assert.deepEqual(errors, [], draft.name + ': ' + errors.join('; '));
  const battle = new Battle({formatid:format, seed:[1,2,3,4]});
  battle.setPlayer('p1',{name:'stat-check',team:structuredClone(draft.team)});
  battle.setPlayer('p2',{name:'stat-check-opponent',team:structuredClone(draft.team)});
  const rows = draft.team.map((s,i) => {
    assert.equal(Object.values(s.evs).reduce((a,b)=>a+b,0),66);
    const pokemon = battle.p1.pokemon[i];
    const actual = {hp:pokemon.maxhp,...pokemon.storedStats};
    assert.deepEqual(actual,expectedStats(s,dex.species.get(s.species)),s.species+' base stats');
    const stone = dex.items.get(s.item);
    const mega = stone.megaStone && (typeof stone.megaStone === 'string' ? stone.megaStone : stone.megaStone[s.species]);
    let transformed = null;
    if (mega) {
      pokemon.formeChange(mega,stone,true);
      transformed = {species:mega,stats:{hp:pokemon.maxhp,...pokemon.storedStats},ability:pokemon.getAbility().name,types:pokemon.getTypes()};
      assert.deepEqual(transformed.stats,expectedStats(s,dex.species.get(mega)),s.species+' Mega stats');
      assert.equal(transformed.ability,dex.species.get(mega).abilities['0']);
      assert.deepEqual(transformed.types,dex.species.get(mega).types);
    }
    return {input:s,stats:actual,mega:transformed,moves:s.moves.map(m=>{
      const move=dex.moves.get(m);
      return {name:move.name,power:move.basePower,accuracy:move.accuracy,priority:move.priority,target:move.target,category:move.category};
    })};
  });
  battle.destroy();
  report.teams.push({...draft,validator_errors:errors,stat_checks:rows});
}
report.negative_controls = [];
for (const [name, mutate] of [
  ['duplicate-item',t=>{t[1].item=t[0].item;}],
  ['main-series-EVs',t=>{t[0].evs={hp:4,atk:252,def:0,spa:0,spd:0,spe:252};}],
  ['Incineroar-Knock-Off',t=>{t[2].moves[3]='Knock Off';}],
]) {
  const input=structuredClone(drafts[0].team); mutate(input);
  const errors=new TeamValidator(format).validateTeam(structuredClone(input))||[];
  assert.ok(errors.length,name+' should reject');
  report.negative_controls.push({name,input,errors});
}
class DraftAI extends RandomPlayerAI {
  chooseTeamPreview() { return 'team 1234'; }
}
const eventLog = log => log.replace(/^\|t:\|\d+$/gm, '|t:|[wall-clock]');
assert.equal(eventLog('|t:|1\n|turn|1'),eventLog('|t:|2\n|turn|1'));
assert.notEqual(eventLog('|t:|1\n|turn|1'),eventLog('|t:|2\n|turn|2'));
async function game(a,b,seed,rotation,run) {
  const streams = getPlayerStreams(new BattleStream());
  const pa = new DraftAI(streams.p1,{seed:[seed,2,3,4],mega:1});
  const pb = new DraftAI(streams.p2,{seed:[seed,4,3,2],mega:1});
  const tasks = [pa.start(),pb.start()];
  const chunks=[];
  const read = (async()=>{for await(const chunk of streams.omniscient) chunks.push(chunk);})();
  const rotate = team => [team[0],...team.slice(1+rotation),...team.slice(1,1+rotation)];
  const ta=rotate(a.team),tb=rotate(b.team);
  await streams.omniscient.write(`>start ${JSON.stringify({formatid:format,seed:[seed,6,7,8]})}\n>player p1 ${JSON.stringify({name:a.id,team:Teams.pack(ta)})}\n>player p2 ${JSON.stringify({name:b.id,team:Teams.pack(tb)})}`);
  await read;
  for (const task of tasks) await task;
  const log=chunks.join('\n');
  assert.match(log,/\|(win|tie)\|/,'Incomplete reference game');
  assert.doesNotMatch(log,/\|error\||TypeError|ReferenceError/,'Reference engine error');
  assert.equal(log.split('\n').filter(l=>l.startsWith('|-mega|')).length,2,'Both sides must exercise Mega Evolution');
  const filename=`${a.id}--${b.id}--${seed}--${run}.log`;
  fs.writeFileSync(path.join(output,filename),log);
  return {p1:a.id,p2:b.id,seed:[seed,6,7,8],policy_seeds:[[seed,2,3,4],[seed,4,3,2]],policy:'upstream RandomPlayerAI, mega probability 1, rotated four-member bring',
    bring:[ta.slice(0,4).map(s=>s.species),tb.slice(0,4).map(s=>s.species)],log:filename,
    sha256:createHash('sha256').update(log).digest('hex'),turns:(log.match(/\|turn\|/g)||[]).length,
    event_sha256:createHash('sha256').update(eventLog(log)).digest('hex'),
    mega_events:log.split('\n').filter(l=>l.startsWith('|-mega|')),ending:log.split('\n').filter(l=>/^\|(win|tie)\|/.test(l))};
}
(async()=>{
  for(let a=0;a<drafts.length;a++) for(let b=0;b<drafts.length;b++) if(a!==b) {
    const rotation=b===(a===0?1:0)?0:2;
    const result=await game(drafts[a],drafts[b],9100+a*10+b,rotation,'original');
    await new Promise(resolve=>setTimeout(resolve,1100));
    const repeat=await game(drafts[a],drafts[b],9100+a*10+b,rotation,'repeat');
    assert.notEqual(result.sha256,repeat.sha256,'Delayed repeat must exercise changed wall-clock timestamps');
    assert.equal(result.event_sha256,repeat.event_sha256,'Same inputs and seeds must reproduce battle events');
    report.games.push({...result,event_repeat_verified:true,repeat});
  }
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  const lines=['# M-C Experimental Doubles Drafts','','Reference-only. Not approved for competitive use or validated in the live app.','',`Showdown: ${pin}`, '', 'All spreads below are Champions SP (66 total), not main-series EVs.',''];
  for(const team of report.teams) {
    lines.push('## '+team.name,'','| Pokemon / Item | Nature / Ability | SP | Stats: HP/Atk/Def/SpA/SpD/Spe | Moves |','|---|---|---|---|---|');
    for(const r of team.stat_checks) lines.push(`| ${r.input.species} / ${r.input.item} | ${r.input.nature} / ${r.input.ability} | ${Object.entries(r.input.evs).filter(([,v])=>v).map(([k,v])=>k+' '+v).join(', ')} | ${Object.values(r.stats).join('/')} | ${r.input.moves.join(', ')} |`);
    for(const r of team.stat_checks.filter(r=>r.mega)) lines.push('',`${r.mega.species}: ${Object.values(r.mega.stats).join('/')} (${r.mega.ability}; ${r.mega.types.join('/')}).`);
    lines.push('');
  }
  lines.push('## Test Limits','','Six completed random-policy reference games are execution smoke tests, not team rankings, app-engine comparisons or in-game confirmation. No live browser battles were run because deployed v142 has no M-C selector. Raw logs and exact inputs are in report.json and companion .log files.');
  fs.writeFileSync(path.join(output,'TEAMS.md'),lines.join('\n')+'\n');
  console.log(JSON.stringify({teams:report.teams.length,sets:report.teams.reduce((n,t)=>n+t.team.length,0),games:report.games.map(g=>({turns:g.turns,mega:g.mega_events.length,ending:g.ending})),output},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
