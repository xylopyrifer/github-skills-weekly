import path from 'node:path';
import {readJson,writeJson} from './storage.mjs';
import {monday,dateKey,DAY} from './calendar.mjs';
import {relevance} from './discovery.mjs';
import {classifyTags} from './tags.mjs';
export const rankNewcomers=rows=>rows.slice().sort((a,b)=>b.stars-a.stars||b.forks-a.forks||a.full_name.localeCompare(b.full_name));
export async function updateNewcomers({root,get,now=new Date(),log=console.log}){
 const config=await readJson(path.join(root,'config/repositories.json'));
 const settings=config.newcomers;if(!settings?.enabled)return;
 const catalog=await readJson(path.join(root,'data/catalog.json'));
 const taxonomy=(await readJson(path.join(root,'config/tags.json'))).tags;
 const file=path.join(root,'data/newcomers.json');
 const old=await readJson(file,{schema_version:1,seen:{},weeks:[]});
 const start=dateKey(monday(now)),end=dateKey(+monday(now)+7*DAY);
 const excluded=new Set(config.exclude.map(n=>n.toLowerCase()));
 const seen={...old.seen};for(const r of catalog.repositories)seen[r.full_name.toLowerCase()]??=r.discovered_at;
 const current=old.weeks.find(w=>w.start===start);
 const seeded=[...(current?.repositories||[]),...catalog.repositories.filter(r=>r.discovered_at>=start&&r.discovered_at<end)];
 const rows=new Map([...new Map(seeded.filter(r=>!excluded.has(r.full_name.toLowerCase())).map(r=>[r.full_name.toLowerCase(),r]))].slice(0,settings.maxPerWeek));
 const warnings=[],skipped=[];let accepted=0,attempted=0;
 async function inspect(meta,prior){
  const key=meta.full_name.toLowerCase();if(excluded.has(key)||meta.archived||meta.disabled||meta.fork||meta.private)return;
  const readme=await get('/repos/'+meta.full_name+'/readme');
  const tree=await get('/repos/'+meta.full_name+'/git/trees/'+encodeURIComponent(meta.default_branch)+'?recursive=1');
  if(tree.truncated){skipped.push(meta.full_name+': truncated skill tree');return;}
  const body=Buffer.from(readme.content||'','base64').toString('utf8').slice(0,150000),paths=tree.tree.filter(f=>f.type==='blob').map(f=>f.path);
  const assessment=relevance({description:meta.description||'',topics:meta.topics||[],readme:body,paths});
  if(!assessment.structural||assessment.score<config.discovery.threshold){rows.delete(key);return;}
  const observed=new Date().toISOString(),first=seen[key]||now.toISOString();seen[key]=first;
  if(first<start||first>=end)return;
  const record={full_name:meta.full_name,name:meta.name,description:(meta.description||'').slice(0,500),language:meta.language,stars:meta.stargazers_count,forks:meta.forks_count,created_at:meta.created_at,discovered_at:first,last_updated:observed,pushed_at:meta.pushed_at,relevance:assessment,system_tags:classifyTags(meta,body,paths.filter(p=>/(^|\/)SKILL.md$/i.test(p)),taxonomy)};
  rows.set(key,record);if(!prior)accepted++;
 }
 for(const r of [...rows.values()])try{await inspect(await get('/repos/'+r.full_name),r);}catch(e){warnings.push(r.full_name+': '+e.message);}
 // The main pool's capacity never disables newcomer search.
 const queries=config.discovery.queries;
 const offset=Math.floor(+now/DAY)%queries.length;
 for(let i=0;i<queries.length&&attempted<settings.maxCandidatesPerRun&&rows.size<settings.maxPerWeek;i++){
  const query=queries[(offset+i)%queries.length]+` stars:>=${settings.minStars} archived:false fork:false`;
  try{
   const results=await get('/search/repositories?q='+encodeURIComponent(query)+'&sort=updated&order=desc&per_page=30');
   for(const meta of results.items){
    const key=meta.full_name.toLowerCase();if(seen[key]||excluded.has(key))continue;
    if(attempted>=settings.maxCandidatesPerRun||rows.size>=settings.maxPerWeek)break;
    attempted++;
    try{await inspect(meta);}catch(e){warnings.push(meta.full_name+': '+e.message);}
   }
  }catch(e){warnings.push('Discovery: '+e.message);if(e.rateLimited)break;}
 }
 const week={start,end,updated_at:now.toISOString(),repositories:rankNewcomers([...rows.values()])};
 const weeks=[...old.weeks.filter(w=>w.start!==start).map(w=>({...w,repositories:rankNewcomers(w.repositories).slice(0,10)})),week].sort((a,b)=>b.start.localeCompare(a.start)).slice(0,settings.retainedWeeks);
 const result={schema_version:1,seen,weeks,report:{updated_at:now.toISOString(),accepted,attempted,skipped,warnings}};
 await writeJson(file,result);log('Newcomers: '+JSON.stringify(result.report));return result;
}
