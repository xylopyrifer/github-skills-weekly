import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readJson, readWeeks } from './lib/storage.mjs';
import { demoData } from './lib/demo.mjs';
import { aggregateAllTime } from './lib/scoring.mjs';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function build(){
  const out=path.join(root,'dist');
  await mkdir(path.join(out,'assets'),{recursive:true});
  const catalog=await readJson(path.join(root,'data/catalog.json'));
  const editorial=await readJson(path.join(root,'config/editorial.json'));
  const config=await readJson(path.join(root,'config/repositories.json'));
  const excluded=new Set(config.exclude.map(n=>n.toLowerCase()));
  const history=(await readWeeks(root)).sort((a,b)=>b.start.localeCompare(a.start));
  const cutoff=history.length?+new Date(history[0].start+'T00:00:00Z')-28*86400000:0;
  const weeks=history.filter(w=>+new Date(w.start+'T00:00:00Z')>=cutoff).map(w=>({...w,rows:w.rows.filter(r=>!excluded.has(r.full_name.toLowerCase()))}));
  const all=await readJson(path.join(root,'data/all-time.json'));
  const report=await readJson(path.join(root,'data/update-report.json'),{warnings:[]});
  const repositories=catalog.repositories.filter(r=>!excluded.has(r.full_name.toLowerCase())).map(r=>({...r,editorial:editorial[r.full_name]||editorial[r.full_name.toLowerCase()]||null}));
  // Historical entries remain navigable even if a repository later disappears.
  for(const row of [...weeks.flatMap(w=>w.rows),...all.repositories]){
    if(excluded.has(row.full_name.toLowerCase())||repositories.some(r=>r.full_name.toLowerCase()===row.full_name.toLowerCase()))continue;
    repositories.push({full_name:row.full_name,name:row.full_name.split('/')[1],description:'',stars:row.stars??null,forks:row.forks??null,language:null,last_updated:row.observed_at||null,editorial:editorial[row.full_name]||null});
  }
  repositories.sort((a,b)=>a.full_name.localeCompare(b.full_name));
  const retrospective=aggregateAllTime(history.filter(w=>w.source_kind==='backfill'));
  const official=all.repositories;
  const chosenAll=official.length?official:retrospective;
  const publicData={schema_version:1,demo:false,updated_at:[catalog.updated_at,...history.map(w=>w.generated_at)].filter(Boolean).sort().at(-1)||null,total_weeks:history.length,repositories,weeks,all_time_kind:official.length?'snapshot':retrospective.length?'backfill':'snapshot',all_time:chosenAll.filter(r=>!excluded.has(r.full_name.toLowerCase())).map(({weekly_scores,...r})=>r),warning_count:report.warnings.length};
  await writeFile(path.join(out,'assets/data.json'),JSON.stringify(publicData));
  await writeFile(path.join(out,'assets/demo.json'),JSON.stringify(demoData()));
  for(const file of ['app.js','i18n.js','style.css','favicon.svg'])await copyFile(path.join(root,'src',file),path.join(out,'assets',file));
  await copyFile(path.join(root,'index.html'),path.join(out,'index.html'));
  await copyFile(path.join(root,'LICENSE'),path.join(out,'LICENSE'));
  await writeFile(path.join(out,'.nojekyll'),'');
  const html=await readFile(path.join(out,'index.html'),'utf8');
  if(!html.includes('type="module"')||!html.includes('viewport'))throw new Error('Invalid HTML entry');
  const size=Buffer.byteLength(JSON.stringify(publicData));
  console.log(`Built dist/: ${repositories.length} repositories, ${weeks.length} recent weeks, ${size} bytes of public data.`);
  return publicData;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
