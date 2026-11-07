import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {updateNewcomers} from '../scripts/lib/newcomers.mjs';
import {writeJson} from '../scripts/lib/storage.mjs';
const oldName='old/skill',newName='new/skill',first='2026-11-02T01:00:00Z';
async function fixture(t,{canonicalFirst,contentFailure=false}={}){
 const root=await mkdtemp(path.join(os.tmpdir(),'newcomer-rename-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await writeJson(path.join(root,'config/repositories.json'),{exclude:[],discovery:{threshold:65,queries:['topic:agent-skills']},newcomers:{enabled:true,maxCandidatesPerRun:2,maxPerWeek:canonicalFirst?2:1,minStars:3,retainedWeeks:5}});
 await writeJson(path.join(root,'config/tags.json'),{tags:[]});await writeJson(path.join(root,'data/catalog.json'),{repositories:[]});
 const record=(name,date)=>({full_name:name,name:'skill',stars:10,forks:1,discovered_at:date,last_updated:date});
 const seen={[oldName]:first};if(canonicalFirst)seen[newName]=canonicalFirst;
 const current=[record(oldName,first)];if(canonicalFirst&&canonicalFirst>=first)current.push(record(newName,canonicalFirst));
 const weeks=[{start:'2026-11-02',end:'2026-11-09',repositories:current}];
 if(canonicalFirst&&canonicalFirst<first)weeks.push({start:'2026-10-26',end:'2026-11-02',repositories:[record(newName,canonicalFirst)]});
 await writeJson(path.join(root,'data/newcomers.json'),{schema_version:1,seen,weeks});
 const get=async p=>{
  if(p.startsWith('/search/'))return{items:[]};
  if(p.endsWith('/readme')){if(contentFailure)throw new Error('temporary README failure');return{content:Buffer.from('Install SKILL.md for Claude Code agent skills').toString('base64')};}
  if(p.includes('/git/trees/'))return{tree:[{type:'blob',path:'SKILL.md'}]};
  return{full_name:newName,name:'skill',default_branch:'main',description:'Agent skills',topics:['agent-skills'],stargazers_count:12,forks_count:2};
 };
 return{root,run:()=>updateNewcomers({root,get,now:new Date('2026-11-07T10:00:00Z'),log:()=>{}})};
}
test('refreshing a renamed repository at capacity replaces its key without growing the pool',async t=>{
 const {run}=await fixture(t);let result=await run();
 assert.equal(result.weeks[0].repositories.length,1);assert.equal(result.weeks[0].repositories[0].full_name,newName);
 assert.equal(result.weeks[0].repositories[0].discovered_at,first);assert.equal(result.seen[newName],first);assert.equal(result.seen[oldName],first);
 assert.equal(result.report.accepted,0);assert.deepEqual(result.report.warnings,[]);
 result=await run();assert.equal(result.weeks[0].repositories.length,1);assert.equal(result.weeks[0].repositories[0].discovered_at,first);
});
test('renamed aliases collapse into one current row with the earliest discovery',async t=>{
 const {run}=await fixture(t,{canonicalFirst:'2026-11-03T02:00:00Z'});const result=await run();
 assert.equal(result.weeks[0].repositories.length,1);assert.equal(result.weeks[0].repositories[0].discovered_at,first);assert.equal(result.seen[newName],first);
});
test('a rename to an older known repository does not reintroduce it as a newcomer',async t=>{
 const canonicalFirst='2026-10-27T02:00:00Z';const {run}=await fixture(t,{canonicalFirst});const result=await run();
 assert.equal(result.weeks[0].repositories.length,0);assert.equal(result.weeks[1].repositories.length,1);assert.equal(result.seen[newName],canonicalFirst);
});
test('failed inspection during a rename preserves the last successful row',async t=>{
 const {run}=await fixture(t,{contentFailure:true});const result=await run();
 assert.equal(result.weeks[0].repositories.length,1);assert.equal(result.weeks[0].repositories[0].full_name,oldName);assert.equal(result.seen[newName],undefined);assert.equal(result.report.warnings.length,1);
});
