import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {updateNewcomers,rankNewcomers} from '../scripts/lib/newcomers.mjs';import {readJson,writeJson} from '../scripts/lib/storage.mjs';
test('newcomer discovery works with a full main pool; refreshes once and never relabels old discoveries',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'newcomers-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeJson(path.join(root,'config/repositories.json'),{exclude:[],discovery:{maxTracked:1,threshold:65,queries:['topic:agent-skills']},newcomers:{enabled:true,maxCandidatesPerRun:3,maxPerWeek:2,minStars:3,retainedWeeks:5}});
 await writeJson(path.join(root,'config/tags.json'),{tags:[]});await writeJson(path.join(root,'data/catalog.json'),{repositories:[{full_name:'old/leader',discovered_at:'2026-09-01T00:00:00Z'}]});
 let stars=9;const meta=n=>({full_name:n,name:n.split('/')[1],default_branch:'main',description:'Agent skills',topics:['agent-skills'],stargazers_count:stars,forks_count:1,created_at:'2026-09-20T00:00:00Z'});
 const get=async p=>p.startsWith('/search/')?{items:[meta('old/leader'),meta('new/skill')]}:p.endsWith('/readme')?{content:Buffer.from('Install SKILL.md for Claude Code agent skills').toString('base64')}:p.includes('/git/trees/')?{tree:[{type:'blob',path:'SKILL.md'}]}:meta('new/skill');
 const run=at=>updateNewcomers({root,get,now:new Date(at),log:()=>{}});
 let data=await run('2026-09-21T01:00:00Z');assert.equal(data.weeks[0].repositories.length,1);assert.equal(data.weeks[0].repositories[0].full_name,'new/skill');
 stars=14;data=await run('2026-09-22T01:00:00Z');assert.equal(data.weeks[0].repositories[0].stars,14);assert.equal(data.weeks[0].repositories[0].discovered_at,'2026-09-21T01:00:00.000Z');
 data=await run('2026-09-28T01:00:00Z');assert.equal(data.weeks[0].repositories.length,0);assert.equal(data.weeks[1].repositories.length,1);
 for(const date of ['2026-10-05','2026-10-12','2026-10-19','2026-10-26'])data=await run(date+'T01:00:00Z');assert.equal(data.weeks.length,5);assert.equal(data.seen['new/skill'],'2026-09-21T01:00:00.000Z');
});
test('newcomer sorting is deterministic and separate from lifetime leaders',()=>{assert.deepEqual(rankNewcomers([{full_name:'b/x',stars:4,forks:2},{full_name:'a/x',stars:4,forks:2},{full_name:'c/x',stars:9,forks:0}]).map(r=>r.full_name),['c/x','a/x','b/x']);});
