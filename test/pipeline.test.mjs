import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { updateData } from '../scripts/lib/pipeline.mjs';
import { readJson, writeJson, readWeeks } from '../scripts/lib/storage.mjs';
async function fixture(t){const root=await mkdtemp(path.join(os.tmpdir(),'skills-weekly-test-'));t.after(()=>rm(root,{recursive:true,force:true}));await writeJson(path.join(root,'config/repositories.json'),{include:['test/alpha','test/beta'],exclude:[],discovery:{enabled:false,threshold:65,maxNewPerRun:2,maxTracked:100,queries:[]}});return root;}
function fakeGet({stars=100,fail='',activityFail=false}={}){return async p=>{
 const name=p.split('/').slice(2,4).join('/');if(name===fail)throw new Error('simulated repository failure');
 if(p.endsWith('/readme'))return{content:Buffer.from('Install SKILL.md for Claude Code Agent Skills').toString('base64')};
 if(p.includes('/git/trees/'))return{tree:[{type:'blob',path:'skills/test/SKILL.md'}]};
 if(p.includes('/commits?')){if(activityFail)throw new Error('simulated activity failure');return[{commit:{committer:{date:'2026-02-04T12:00:00Z'}}}];}
 return{full_name:name,owner:{login:'test'},name:name.split('/')[1],description:'Agent Skills',topics:['agent-skills'],language:'JavaScript',stargazers_count:stars,forks_count:10,default_branch:'main',pushed_at:'2026-02-04T12:00:00Z'};
};}
const run=(root,at,get)=>updateData({root,now:new Date(at),clock:()=>new Date(at),get,discover:false,log:()=>{}});
test('midweek bootstrap makes a catalog but never invents historical growth',async t=>{const root=await fixture(t);await run(root,'2026-02-04T12:00:00Z',fakeGet());assert.equal((await readWeeks(root)).length,0);assert.equal((await readJson(path.join(root,'data/catalog.json'))).repositories.length,2);await assert.rejects(readdir(path.join(root,'data/boundaries')),{code:'ENOENT'});});
test('two complete Monday boundaries produce a real ranking; retries are idempotent',async t=>{
 const root=await fixture(t);await run(root,'2026-02-02T00:17:00Z',fakeGet());assert.equal((await readWeeks(root)).length,0);
 await run(root,'2026-02-09T00:17:00Z',fakeGet({stars:160}));const first=await readWeeks(root);assert.equal(first.length,1);assert.equal(first[0].rows[0].stars_delta,60);assert.equal(first[0].start,'2026-02-02');
 const all=await readJson(path.join(root,'data/all-time.json'));await run(root,'2026-02-09T01:00:00Z',fakeGet({stars:200}));assert.deepEqual(await readWeeks(root),first);assert.deepEqual(await readJson(path.join(root,'data/all-time.json')),all);
});
test('failed repository is skipped, no fabricated zero, and can recover on boundary rerun',async t=>{
 const root=await fixture(t);await run(root,'2026-02-02T00:17:00Z',fakeGet());const report=await run(root,'2026-02-09T00:17:00Z',fakeGet({stars:170,fail:'test/beta'}));assert.equal(report.warnings.length,1);assert.equal((await readWeeks(root))[0].rows.length,1);
 await run(root,'2026-02-09T01:17:00Z',fakeGet({stars:175}));const rows=(await readWeeks(root))[0].rows;assert.equal(rows.length,2);assert.equal(rows.find(r=>r.full_name==='test/alpha').stars_delta,70);assert.equal(rows.find(r=>r.full_name==='test/beta').stars_delta,75);
});
test('missing full week, late run and activity failures cannot produce fake rankings',async t=>{
 const root=await fixture(t);await run(root,'2026-02-02T00:17:00Z',fakeGet());await run(root,'2026-02-09T07:00:00Z',fakeGet({stars:160}));assert.equal((await readWeeks(root)).length,0);
 await run(root,'2026-02-16T00:17:00Z',fakeGet({stars:200}));assert.equal((await readWeeks(root)).length,0);
 await run(root,'2026-02-23T00:17:00Z',fakeGet({stars:240,activityFail:true}));assert.equal((await readWeeks(root)).length,0);
});
test('all API failures preserve existing files and signal job failure',async t=>{
 const root=await fixture(t);await run(root,'2026-02-02T00:17:00Z',fakeGet());const catalog=await readJson(path.join(root,'data/catalog.json'));await assert.rejects(run(root,'2026-02-09T00:17:00Z',async()=>{throw new Error('outage');}),/No repositories/);assert.deepEqual(await readJson(path.join(root,'data/catalog.json')),catalog);
});
test('manual exclude wins over include and persisted pool',async t=>{
 const root=await fixture(t);await run(root,'2026-02-02T00:17:00Z',fakeGet());const config=await readJson(path.join(root,'config/repositories.json'));config.exclude=['TEST/BETA'];await writeJson(path.join(root,'config/repositories.json'),config);await run(root,'2026-02-09T00:17:00Z',fakeGet({stars:160}));assert.equal((await readJson(path.join(root,'data/catalog.json'))).repositories.length,1);assert.equal((await readWeeks(root))[0].rows.length,1);
});

