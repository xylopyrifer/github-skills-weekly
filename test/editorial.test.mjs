import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from '../scripts/build.mjs';
import { publicCommunityTags } from '../scripts/lib/custom-tags.mjs';
import { classifyTags, applyTagOverrides, validateTagOverrides } from '../scripts/lib/tags.mjs';
const json=async file=>JSON.parse(await readFile(new URL('../'+file,import.meta.url),'utf8'));
const taxonomy=(await json('config/tags.json')).tags;
const overrides=await json('config/tag-overrides.json');
const editorial=await json('config/editorial.json');
test('reviewed classifications correct artiboard and fill image and financial capabilities',()=>{
 validateTagOverrides(overrides,taxonomy);
 const scraped=classifyTags({description:'A shared board for coding agents'},'Example task: bookkeeping',[],taxonomy);
 assert.ok(scraped.some(t=>t.id==='accounting'));
 const fixed=applyTagOverrides(scraped,'YulmuCoffee/ArtiBoard',overrides);
 assert.ok(fixed.some(t=>t.id==='tasks'));
 assert.ok(!fixed.some(t=>t.id==='accounting'));
 assert.ok(scraped.some(t=>t.id==='accounting'),'raw evidence stays unchanged');
 assert.deepEqual(applyTagOverrides(fixed,'yulmucoffee/artiboard',overrides),fixed);
 for(const [name,id] of [['Syh1906/openai-compatible-imagegen','design'],['xbtlin/ai-berkshire','finance']])assert.deepEqual(applyTagOverrides([],name,overrides),[{id,evidence:['editorial-review']}]);
 assert.deepEqual(applyTagOverrides(scraped,'other/repository',overrides),scraped);
});
test('classification corrections reject unknown, conflicting and unaudited rules',()=>{
 const valid=overrides['yulmucoffee/artiboard'];
 for(const rule of [{...valid,add:['unknown']},{...valid,add:['tasks','tasks']},{...valid,remove:['tasks']},{...valid,sources:[]},{...valid,reason:''}])assert.throws(()=>validateTagOverrides({'a/b':rule},taxonomy));
 assert.throws(()=>validateTagOverrides({'A/B':valid},taxonomy));
});
test('deprecated skills point to plugins without merging repository identities',()=>{
 const item=editorial['openai/skills'];
 assert.equal(item.status,'deprecated');assert.equal(item.replacement_repository,'openai/plugins');
 assert.match(item.description.zh,/弃用/);assert.match(item.description.en,/deprecated/);
 assert.match(item.highlights.zh.join(' '),/不与后继仓库合并/);
 assert.ok(!editorial['openai/plugins']);
});
test('build applies reviewed tags to current data without rewriting observations or rankings',async()=>{
 const before={};
 for(const file of ['data/catalog.json','data/newcomers.json','data/all-time.json','data/current-week.json'])before[file]=await readFile(new URL('../'+file,import.meta.url),'utf8');
 const published=await build();
 for(const [file,content] of Object.entries(before))assert.equal(await readFile(new URL('../'+file,import.meta.url),'utf8'),content);
 const all=JSON.parse(before['data/all-time.json']);
 const excluded=new Set((await json('config/repositories.json')).exclude.map(name=>name.toLowerCase()));
 assert.deepEqual(published.all_time,all.repositories.filter(r=>!excluded.has(r.full_name.toLowerCase())).map(({weekly_scores,...r})=>r));
 for(const repository of published.repositories){
  const rule=overrides[repository.full_name.toLowerCase()];if(!rule)continue;
  for(const id of rule.add)assert.ok(repository.tags.some(t=>t.id===id));
  assert.equal(repository.system_tags,undefined);
 }
 const legacy=published.repositories.find(r=>r.full_name==='openai/skills');
 if(!excluded.has('openai/skills')){assert.equal(legacy.editorial.replacement_repository,'openai/plugins');assert.equal(legacy.full_name,'openai/skills');}
});

test('editorial system corrections preserve independent community counts',()=>{
 const system=applyTagOverrides([{id:'accounting'}],'yulmucoffee/artiboard',overrides);
 const votes=[{repository:'yulmucoffee/artiboard',user_id:7,issue:1,active:true,tags:['tasks','design']}];
 assert.deepEqual(publicCommunityTags(system,votes,'yulmucoffee/artiboard',taxonomy),[{id:'tasks',count:2},{id:'design',count:1}]);
});
