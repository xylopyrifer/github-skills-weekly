import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {previousWeek} from './calendar.mjs';
export const voteThreshold=estimate=>Number.isSafeInteger(estimate)&&estimate>=0?Math.max(5,Math.floor(estimate/3)+1):null;
export function trafficEstimate(payload,now=new Date()){
 const period=previousWeek(now),start=Date.parse(period.start+'T00:00:00Z'),end=Date.parse(period.end+'T00:00:00Z');
 const days=new Map();if(!Array.isArray(payload?.views))throw new Error('Missing daily traffic');
 for(const row of payload.views){const date=Date.parse(row.timestamp);if(date<start||date>=end)continue;if(!Number.isFinite(date)||date%86400000||days.has(date)||!Number.isSafeInteger(row.uniques)||row.uniques<0||!Number.isSafeInteger(row.count)||row.count<row.uniques)throw new Error('Invalid daily traffic');days.set(date,row.uniques);}
 if(days.size!==7)throw new Error('Incomplete previous-week traffic');
 const estimate=[...days.values()].reduce((a,b)=>a+b,0);return {schema_version:1,repository:'xylopyrifer/github-skills-weekly',...period,available:true,estimate,required_supporters:voteThreshold(estimate),method:'sum-of-daily-repository-uniques',collected_at:now.toISOString()};
}
export function collectTraffic(now=new Date()){
 try{const gh=process.env.GH_PATH||(existsSync('.codex/gh/bin/gh.exe')?'.codex/gh/bin/gh.exe':'gh');const result=execFileSync(gh,['api','repos/xylopyrifer/github-skills-weekly/traffic/views?per=day'],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});return trafficEstimate(JSON.parse(result),now);}catch{return {schema_version:1,repository:'xylopyrifer/github-skills-weekly',...previousWeek(now),available:false,estimate:null,required_supporters:null,method:'sum-of-daily-repository-uniques',collected_at:now.toISOString(),reason:'Traffic unavailable or incomplete; use repository content review only.'};}
}
export function withTraffic(candidates,submissions,traffic,now=new Date()){
 const period=previousWeek(now),start=period.start+'T00:00:00Z',end=period.end+'T00:00:00Z';
 const threshold=traffic?.available&&traffic.start===period.start&&traffic.end===period.end?voteThreshold(traffic.estimate):null;
 return candidates.map(c=>{const latest=new Map();for(const s of submissions)if(s.repository.toLowerCase()===c.repository.toLowerCase()){const old=latest.get(s.user_id);if(!old||s.issue>old.issue)latest.set(s.user_id,s);}const weekly=[...latest.values()].filter(s=>s.active&&s.updated_at>=start&&s.updated_at<end&&(s.custom_tags||[]).some(t=>t.id===c.tag.id)).length;
 return {...c,weekly_supporters:weekly,required_supporters:threshold,traffic_period:period,traffic_estimate:threshold===null?null:traffic.estimate};});
}
