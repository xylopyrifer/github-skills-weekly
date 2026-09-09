import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { githubClient } from './lib/github.mjs';
import { readJson,writeJson,readWeeks } from './lib/storage.mjs';
import { monday,DAY } from './lib/calendar.mjs';
import { makeBackfillWeeks,starDays } from './lib/backfill.mjs';
import { aggregateAllTime } from './lib/scoring.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const token=process.env.GITHUB_TOKEN||(process.env.GH_PATH?execFileSync(process.env.GH_PATH,['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim():undefined);
if(!token)throw new Error('Set GITHUB_TOKEN (or GH_PATH to an already authenticated GitHub CLI).');
const get=githubClient({token,maxRequests:1500,apiVersion:'2026-03-10'});
const now=new Date(),end=monday(now),starts=Array.from({length:5},(_,i)=>new Date(+end-(5-i)*7*DAY).toISOString().slice(0,10));
const oldest=starts[0]+'T00:00:00Z';
const reportFile=path.join(root,'data/backfill',end.toISOString().slice(0,10)+'.json');
const audit=await readJson(reportFile,{schema_version:1,source:'GitHub REST API',periods:starts,records:[],warnings:[]});
const catalog=await readJson(path.join(root,'data/catalog.json'));
const config=await readJson(path.join(root,'config/repositories.json'));
const excluded=new Set(config.exclude.map(n=>n.toLowerCase()));
const records=audit.records.filter(r=>!excluded.has(r.full_name.toLowerCase()));
for(const repo of catalog.repositories){
 if(excluded.has(repo.full_name.toLowerCase())||records.some(r=>r.full_name.toLowerCase()===repo.full_name.toLowerCase()))continue;
 const endpoint='/repos/'+repo.full_name;
 try{
  const meta=await get(endpoint);
  if(meta.created_at>=end.toISOString())continue;
  const buckets=await get(endpoint+'/stargazers/history?per_page=30&page=1');starDays(buckets);
  const record={full_name:meta.full_name,created_at:meta.created_at,stars:meta.stargazers_count,forks:meta.forks_count,observed_at:new Date().toISOString(),star_buckets:buckets,star_source:'https://api.github.com'+endpoint+'/stargazers/history?per_page=30&page=1',forks_by_week:Object.fromEntries(starts.map(s=>[s,0])),fork_pages:0,activity:{}};
  const seen=new Set();let covered=false;
  for(let page=1;page<=200;page++){
    const forks=await get(endpoint+'/forks?sort=newest&per_page=100&page='+page);
    if(!Array.isArray(forks))throw new Error('Invalid forks response');
    record.fork_pages=page;
    for(const fork of forks){
      if(!fork.created_at||!Number.isInteger(fork.id))throw new Error('Missing fork timestamp/id');
      if(seen.has(fork.id))continue;seen.add(fork.id);
      const key=monday(fork.created_at).toISOString().slice(0,10);
      if(Object.hasOwn(record.forks_by_week,key))record.forks_by_week[key]++;
    }
    if(forks.length<100||forks.at(-1).created_at<oldest){covered=true;break;}
  }
  if(!covered)throw new Error('Fork pagination cap reached; refusing partial history');
  for(const start of starts){
    const until=new Date(Date.parse(start+'T00:00:00Z')+7*DAY).toISOString();
    if(meta.created_at>=until)continue;
    try{
      const commits=await get(endpoint+'/commits?since='+start+'T00:00:00Z&until='+until+'&per_page=100');
      const selected=commits.filter(c=>c.commit?.committer?.date>=start+'T00:00:00Z'&&c.commit.committer.date<until);
      record.activity[start]={commits:selected.length,days:new Set(selected.map(c=>c.commit.committer.date.slice(0,10))).size,capped:commits.length===100};
    }catch(e){audit.warnings.push(meta.full_name+' '+start+': '+e.message);}
  }
  records.push(record);audit.records=records;audit.collected_at=new Date().toISOString();await writeJson(reportFile,audit);
  console.log('BACKFILL '+meta.full_name+' ('+record.fork_pages+' fork pages)');
 }catch(e){audit.warnings.push(repo.full_name+': '+e.message);console.warn('WARN '+repo.full_name+': '+e.message);}
}
const weeks=makeBackfillWeeks(records,starts,new Date().toISOString());
if(weeks.some(w=>w.rows.length<10))throw new Error('Not enough verified repositories for five TOP 10 rankings; audit retained, rankings not published.');
for(const week of weeks){
 const file=path.join(root,'data/weeks',week.start+'.json');const existing=await readJson(file,null);
 if(existing&&existing.source_kind!=='backfill')throw new Error('Refusing to replace a genuine snapshot week');
 await writeJson(file,week);
}
// Never mix retrospective scores with genuine boundary-snapshot scores.
const allWeeks=await readWeeks(root);
await writeJson(path.join(root,'data/all-time.json'),{schema_version:1,repositories:aggregateAllTime(allWeeks.filter(w=>w.source_kind!=='backfill'))});
await writeJson(reportFile,audit);
console.log(JSON.stringify(weeks.map(w=>({week:w.week,rows:w.rows.length,first:w.rows[0].full_name,starGrowth:w.rows[0].stars_delta})),null,2));
