import {monday,dateKey,DAY,isoWeek} from './calendar.mjs';
import {weeklyRanking} from './scoring.mjs';
export function currentWeekRanking(boundary,observations,previous,now){
 const start=dateKey(monday(now)),end=dateKey(+monday(now)+7*DAY);
 const rows=Object.entries(observations).flatMap(([key,r])=>{
  const base=boundary.repositories[key];
  if(!base||!Number.isFinite(r.activity)||Date.parse(r.observed_at)<Date.parse(base.observed_at))return [];
  return [{...r,stars_delta:r.stars-base.stars,forks_delta:r.forks-base.forks,observed_from:base.observed_at,observed_to:r.observed_at}];
 });
 const ranked=weeklyRanking(rows,previous?.rows||[]);
 return {schema_version:1,week:isoWeek(start),start,end,timezone:'UTC',status:'in_progress',source_kind:'snapshot',generated_at:now.toISOString(),as_of:Object.values(observations).map(r=>r.observed_at).sort().at(-1)||now.toISOString(),algorithm:'weekly-v1',anchors:ranked.anchors,rows:ranked.rows};
}
