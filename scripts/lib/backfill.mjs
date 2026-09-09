import { DAY, isoWeek } from './calendar.mjs';
import { activityScore, weeklyRanking } from './scoring.mjs';

// Dates label GitHub's daily buckets; the API does not promise exact UTC boundaries.
export function starDays(buckets) {
  if (!Array.isArray(buckets) || !buckets.length) throw new Error('Missing star history');
  const days = new Map();
  for (const bucket of buckets) {
    if (!Number.isInteger(bucket.week) || !Array.isArray(bucket.days) || bucket.days.length !== 7 || bucket.days.some(n=>!Number.isInteger(n)||n<0)) throw new Error('Invalid star-history bucket');
    if (bucket.days.reduce((a,b)=>a+b,0)!==bucket.total) throw new Error('Star-history total mismatch');
    const date = new Date(bucket.week*1000);
    // Do not silently reassign offset buckets to UTC dates.
    if (date.getUTCDay()!==0 || date.getUTCHours() || date.getUTCMinutes() || date.getUTCSeconds()) throw new Error('Non-midnight source bucket; requires explicit timezone handling');
    bucket.days.forEach((count,i)=>{
      const key=new Date(+date+i*DAY).toISOString().slice(0,10);
      if(days.has(key))throw new Error('Overlapping star-history buckets');
      days.set(key,count);
    });
  }
  return days;
}
export function countWeek(days,start,createdAt) {
  let count=0;
  for(let i=0;i<7;i++){
    const key=new Date(Date.parse(start+'T00:00:00Z')+i*DAY).toISOString().slice(0,10);
    if(!days.has(key)) {
      if(createdAt && key < createdAt.slice(0,10)) continue;
      throw new Error('Missing daily Star sample: '+key);
    }
    count+=days.get(key);
  }
  return count;
}
export function makeBackfillWeeks(records,starts,observedAt) {
  const weeks=[];
  for(const start of starts.slice().sort()){
    const end=new Date(Date.parse(start+'T00:00:00Z')+7*DAY).toISOString().slice(0,10);
    const rows=[];
    for(const r of records){
      if(r.created_at>=end+'T00:00:00Z')continue;
      const activity=r.activity[start];
      if(!activity)continue;
      try {
        rows.push({full_name:r.full_name,stars:r.stars,forks:r.forks,stars_delta:countWeek(starDays(r.star_buckets),start,r.created_at),forks_delta:r.forks_by_week[start]||0,activity:activityScore(activity.commits,activity.days),commits_sampled:activity.commits,activity_capped:activity.capped,observed_at:r.observed_at,source_kind:'backfill',totals_as_of:r.observed_at});
      } catch(e) { throw new Error(r.full_name+': '+e.message); }
    }
    const ranked=weeklyRanking(rows,weeks.at(-1)?.rows||[]);
    weeks.push({schema_version:1,week:isoWeek(start),start,end,timezone:'GitHub calendar labels; UTC precision not guaranteed',generated_at:observedAt,algorithm:'backfill-v1',source_kind:'backfill',growth_kind:'new-star-buckets-and-surviving-fork-creations',period_precision:'github-calendar-days',totals_kind:'collection-time-snapshot',anchors:ranked.anchors,rows:ranked.rows});
  }
  return weeks;
}
