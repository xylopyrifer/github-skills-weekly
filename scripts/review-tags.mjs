import {collectTraffic,withTraffic} from './lib/tag-traffic.mjs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readJson,writeJson} from './lib/storage.mjs';
import {reviewCandidates,reviewKey} from './lib/custom-tags.mjs';
export function fingerprint(candidates){return createHash('sha256').update(JSON.stringify(candidates)).digest('hex');}
export function validateDecisions(candidates,document){
 if(document.fingerprint!==fingerprint(candidates))throw new Error('Review queue changed; prepare again before reviewing');
 if(!Array.isArray(document.decisions)||document.decisions.length!==candidates.length)throw new Error('Review every candidate exactly once');
 const seen=new Set();return document.decisions.map(d=>{const key=reviewKey(d.repository||'',d.tag_id||''),candidate=candidates.find(c=>reviewKey(c.repository,c.tag.id)===key);if(!candidate||seen.has(key))throw new Error('Unknown or duplicate review');seen.add(key);
 if(!['accepted','rejected','deferred'].includes(d.status)||typeof d.reason!=='string'||d.reason.trim().length<8||d.reason.length>1200)throw new Error('A status and substantive reason are required');
 const qualifies=Number.isSafeInteger(candidate.required_supporters)&&candidate.required_supporters>=5&&candidate.weekly_supporters>=candidate.required_supporters;
 if(qualifies&&d.status!=='accepted')throw new Error('Weekly support exceeds one third of estimated traffic (minimum five); accept this tag');
 if(!qualifies&&d.status!=='deferred'&&(!Array.isArray(d.sources)||!d.sources.length||!d.sources.every(s=>typeof s==='string'&&s.startsWith('https://github.com/'+candidate.repository+'/')&&s.length<600)))throw new Error('Content reviews require repository source URLs');
 return {repository:candidate.repository,tag:candidate.tag,status:d.status,reason:d.reason,sources:d.sources||[],supporters:candidate.supporters,weekly_supporters:candidate.weekly_supporters,required_supporters:candidate.required_supporters,traffic_period:candidate.traffic_period,traffic_estimate:candidate.traffic_estimate};});
}
export async function run(args=process.argv.slice(2)){
 const community=await readJson('data/community-tags.json',{submissions:[]}),taxonomy=await readJson('config/tags.json'),reviews=await readJson('data/tag-reviews.json',{schema_version:1,decisions:[]});const nowForQueue=new Date();
 let traffic=await readJson('data/tag-traffic.json',null);
 if(args[0]==='prepare'){traffic=collectTraffic(nowForQueue);await writeJson('data/tag-traffic.json',traffic);}
 const candidates=withTraffic(reviewCandidates(community.submissions,taxonomy.tags,reviews),community.submissions,traffic,nowForQueue);
 if(args[0]==='prepare'){const output=args[1]||'.codex/tag-review-queue.json';await writeJson(output,{fingerprint:fingerprint(candidates),traffic,candidates});console.log('Review queue: '+output+' ('+candidates.length+' candidates)');return;}
 if(args[0]!=='apply'||!args[1])throw new Error('Usage: node scripts/review-tags.mjs prepare [output] | apply decisions.json');
 const decisions=validateDecisions(candidates,await readJson(args[1])),now=new Date().toISOString(),week=new Date();week.setUTCHours(0,0,0,0);week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);
 const map=new Map(reviews.decisions.map(d=>[reviewKey(d.repository,d.tag.id),d]));for(const d of decisions)if(d.status!=='deferred')map.set(reviewKey(d.repository,d.tag.id),{...d,reviewed_at:now});
 await writeJson('data/tag-reviews.json',{schema_version:1,last_review_week:week.toISOString().slice(0,10),decisions:[...map.values()].sort((a,b)=>reviewKey(a.repository,a.tag.id).localeCompare(reviewKey(b.repository,b.tag.id)))});
 await writeJson('data/tag-review-report.json',{reviewed_at:now,total:decisions.length,accepted:decisions.filter(d=>d.status==='accepted').length,rejected:decisions.filter(d=>d.status==='rejected').length,deferred:decisions.filter(d=>d.status==='deferred').map(d=>({repository:d.repository,tag:d.tag.label,reason:d.reason}))});console.log('Review saved. Build and publish to apply website changes.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
