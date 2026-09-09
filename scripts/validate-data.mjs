import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readJson,readWeeks} from './lib/storage.mjs';
import {weeklyRanking,aggregateAllTime} from './lib/scoring.mjs';
export function validateRecords(catalog,weeks,all,report,{fresh=false,now=new Date()}={}){
 const unique=rows=>{const names=rows.map(r=>r.full_name.toLowerCase());assert.equal(new Set(names).size,names.length,'Duplicate repository records');};
 assert.ok(Array.isArray(catalog.repositories)&&catalog.repositories.length,'Empty catalog');unique(catalog.repositories);assert.ok(Number.isFinite(Date.parse(catalog.updated_at)),'Invalid collection timestamp');
 assert.equal(report.tracked_repositories,catalog.repositories.length,'Report/catalog count mismatch');assert.equal(report.updated_at,catalog.updated_at,'Report/catalog timestamp mismatch');assert.ok(report.successful_repositories>0&&report.successful_repositories<=catalog.repositories.length,'Invalid successful count');assert.ok(Array.isArray(report.warnings),'Invalid warnings');
 if(fresh){const age=+now-Date.parse(catalog.updated_at);assert.ok(age>=-300000&&age<18*3600000,'Collection is not fresh');}
 for(const r of catalog.repositories){assert.match(r.full_name,/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);for(const k of ['stars','forks'])assert.ok(Number.isSafeInteger(r[k])&&r[k]>=0,'Invalid '+k+' for '+r.full_name);assert.ok(Number.isFinite(Date.parse(r.last_updated)),'Missing observation time');assert.equal(new Set((r.system_tags||[]).map(t=>t.id)).size,(r.system_tags||[]).length,'Duplicate system tag');}
 for(const w of weeks){unique(w.rows);assert.equal(Date.parse(w.end)-Date.parse(w.start),7*86400000,'Invalid week length');assert.equal(new Date(w.start).getUTCDay(),1,'Week must begin Monday');const previous=weeks.find(p=>p.end===w.start&&((p.source_kind==='backfill')===(w.source_kind==='backfill')));const calculated=weeklyRanking(w.rows,previous?.rows||[]);assert.deepEqual(w.anchors,calculated.anchors,'Scoring anchors mismatch');for(let i=0;i<w.rows.length;i++){const row=w.rows[i],expected=calculated.rows[i];assert.equal(row.full_name,expected.full_name,'Incorrect ranking order');for(const k of ['rank','rank_change','heat_score','components'])assert.deepEqual(row[k],expected[k],'Incorrect '+k+' in '+w.start);if(w.source_kind!=='backfill'){const hours=(Date.parse(row.observed_to)-Date.parse(row.observed_from))/3600000;assert.ok(hours>=162&&hours<=174,'Invalid snapshot comparison window');}else{assert.equal(row.source_kind,'backfill');assert.ok(row.totals_as_of,'Backfill missing provenance');}}}
 assert.deepEqual(all.repositories,aggregateAllTime(weeks.filter(w=>w.source_kind!=='backfill')),'Cumulative totals mismatch or contaminated by backfill');return {repositories:catalog.repositories.length,weeks:weeks.length,warnings:report.warnings.length};
}
export async function validateData(root,{fresh=false}={}){
 async function files(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isDirectory())result.push(...await files(f));else result.push(f);}return result;}
 for(const file of await files(path.join(root,'data'))){assert.ok(!file.endsWith('.tmp'),'Unfinished data write: '+file);if(file.endsWith('.json'))JSON.parse(await readFile(file,'utf8'));}
 const summary=validateRecords(await readJson(path.join(root,'data/catalog.json')),await readWeeks(root),await readJson(path.join(root,'data/all-time.json')),await readJson(path.join(root,'data/update-report.json')),{fresh});console.log('Stored data verified: '+JSON.stringify(summary));return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await validateData(fileURLToPath(new URL('../',import.meta.url)),{fresh:process.argv.includes('--fresh')});
