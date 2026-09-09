import test from 'node:test';
import assert from 'node:assert/strict';
import { starDays,countWeek,makeBackfillWeeks } from '../scripts/lib/backfill.mjs';
const bucket=(date,days)=>({week:Date.parse(date+'T00:00:00Z')/1000,days,total:days.reduce((a,b)=>a+b,0)});
test('Sunday-based source days are regrouped into Monday through Sunday without interpolation',()=>{
 const days=starDays([bucket('2026-08-30',[100,1,2,3,4,5,6]),bucket('2026-09-06',[7,200,0,0,0,0,0])]);
 assert.equal(countWeek(days,'2026-08-31'),28);
});
test('missing history, inconsistent sums, duplicate and offset buckets are rejected',()=>{
 assert.throws(()=>starDays([]),/Missing/);
 assert.throws(()=>starDays([{...bucket('2026-08-30',[1,0,0,0,0,0,0]),total:2}]),/mismatch/);
 const b=bucket('2026-08-30',[1,0,0,0,0,0,0]);assert.throws(()=>starDays([b,b]),/Overlapping/);
 assert.throws(()=>starDays([{...b,week:b.week+3600}]),/Non-midnight/);
 assert.throws(()=>countWeek(starDays([b]),'2026-08-31'),/Missing daily/);
});
test('pre-creation days can be zero, but absent post-creation days cannot',()=>{
 const days=starDays([bucket('2026-09-06',[5,0,0,0,0,0,0])]);
 assert.equal(countWeek(days,'2026-08-31','2026-09-06T08:00:00Z'),5);
 assert.throws(()=>countWeek(days,'2026-08-31','2026-09-05T08:00:00Z'),/Missing/);
});
test('backfill records disclose uncertainty and collection-time totals, never fake observation endpoints',()=>{
 const r={full_name:'test/a',created_at:'2026-01-01T00:00:00Z',observed_at:'2026-09-09T00:00:00Z',stars:3000,forks:100,star_buckets:[bucket('2026-08-30',[0,1,2,3,4,5,6]),bucket('2026-09-06',[7,0,0,0,0,0,0])],forks_by_week:{'2026-08-31':9},activity:{'2026-08-31':{commits:3,days:2,capped:false}}};
 const w=makeBackfillWeeks([r],['2026-08-31'],'2026-09-09T00:00:00Z')[0];
 assert.equal(w.source_kind,'backfill');assert.equal(w.period_precision,'github-calendar-days');assert.equal(w.rows[0].stars_delta,28);assert.equal(w.rows[0].totals_as_of,r.observed_at);assert.equal(w.rows[0].observed_from,undefined);assert.equal(w.rows[0].observed_to,undefined);
 assert.equal(makeBackfillWeeks([{...r,created_at:'2026-09-07T00:00:00Z'}],['2026-08-31'],r.observed_at)[0].rows.length,0);
});
